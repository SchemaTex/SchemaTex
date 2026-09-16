import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseBpmn } from "../../src/diagrams/bpmn/parser";
import type { BpmnAst, BpmnLayoutObject } from "../../src/core/types";
import { rankBpmnSequences, layoutBpmn } from "../../src/diagrams/bpmn/layout";

const fixture = (name: string): string =>
  readFileSync(resolve(__dirname, "../fixtures/bpmn", name), "utf-8");

describe("bpmn layout", () => {
  it("places loan-approval objects inside their lane bands", () => {
    const ast = parseBpmn(fixture("loan-approval.bpmn"));
    const layout = layoutBpmn(ast);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.objects.length).toBe(8);

    // Every object's center sits inside its lane band y-range.
    for (const ol of layout.objects) {
      const lane = layout.lanes.find((l) => l.lane.id === ol.obj.laneId)!;
      const cy = ol.y + ol.height / 2;
      expect(cy).toBeGreaterThanOrEqual(lane.y);
      expect(cy).toBeLessThanOrEqual(lane.y + lane.height);
    }
  });

  it("layers objects by sequence flow (A < B < G1 < C)", () => {
    const ast = parseBpmn(fixture("loan-approval.bpmn"));
    const layout = layoutBpmn(ast);
    const xOf = (id: string): number => {
      const ol = layout.objects.find((o) => o.obj.id === id)!;
      return ol.x + ol.width / 2;
    };
    expect(xOf("A")).toBeLessThan(xOf("B"));
    expect(xOf("B")).toBeLessThan(xOf("G1"));
    expect(xOf("G1")).toBeLessThan(xOf("C"));
    expect(xOf("C")).toBeLessThan(xOf("D"));
  });

  it("renders parallel branches at distinct columns (and-gateway fan-out)", () => {
    const ast = parseBpmn(fixture("simple-service.bpmn"));
    const layout = layoutBpmn(ast);
    const xOf = (id: string) => {
      const ol = layout.objects.find((o) => o.obj.id === id)!;
      return ol.x;
    };
    // D and E both follow G; layout assigns them the same column.
    expect(Math.round(xOf("D"))).toBe(Math.round(xOf("E")));
  });

  it("stacks pools vertically (Customer above Pizzeria in pizza-order)", () => {
    const ast = parseBpmn(fixture("pizza-order.bpmn"));
    const layout = layoutBpmn(ast);
    const customer = layout.pools.find((p) => p.pool.label === "Customer")!;
    const pizzeria = layout.pools.find((p) => p.pool.label === "Pizzeria")!;
    expect(customer.y).toBeLessThan(pizzeria.y);
  });

  it("produces flow paths for every flow", () => {
    const ast = parseBpmn(fixture("loan-approval.bpmn"));
    const layout = layoutBpmn(ast);
    expect(layout.flows.length).toBe(ast.flows.length);
    for (const fl of layout.flows) {
      expect(fl.path.startsWith("M ")).toBe(true);
    }
  });
});

// Declarations deliberately oppose the process order, including across lanes.
const rankedProcess = `bpmn
pool "Process" {
  lane "First" {
    finish: end "Complete"
    join: gateway and
    second: task "Second"
    start: start
  }
  lane "Second" {
    short: task "Short branch"
    first: task "First"
    split: gateway and
  }
}
pool "Peer" {
  peerEnd: end
  peerStart: start
}
pool "External" blackbox
flows
start --> first --> split
split --> second --> join
split --> short --> join
join --> finish
peerStart --> peerEnd
`;

function centerAlong(object: BpmnLayoutObject, ast: BpmnAst): number {
  return ast.direction === "LR" ? object.x + object.width / 2 : object.y + object.height / 2;
}

function pathPoints(path: string): { x: number; y: number }[] {
  return [...path.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
}

describe.each(["LR", "TB"])("bpmn sequence ranks in %s", (direction) => {
  const parse = (source: string): BpmnAst => parseBpmn(source.replace("bpmn\n", `bpmn\ndirection: ${direction}\n`));

  it("ranks all sequence edges forward and keeps author-assigned lanes", () => {
    const ast = parse(rankedProcess);
    const before = structuredClone(ast);
    const { ranks, backEdges } = rankBpmnSequences(ast);
    const layout = layoutBpmn(ast);
    expect(backEdges.size).toBe(0);
    expect(Object.fromEntries(ranks)).toMatchObject({
      start: 0, first: 1, split: 2, second: 3, short: 3, join: 4, finish: 5,
    });
    const byId = new Map(layout.objects.map((o) => [o.obj.id, o]));
    for (const flow of ast.flows) {
      expect(ranks.get(flow.to)!).toBeGreaterThan(ranks.get(flow.from)!);
      const source = byId.get(flow.from)!;
      const target = byId.get(flow.to)!;
      expect(centerAlong(target, ast)).toBeGreaterThan(centerAlong(source, ast));
      // In particular, the entire end event follows its predecessor.
      if ("kind" in target.obj && target.obj.kind === "end") {
        const targetStart = direction === "LR" ? target.x : target.y;
        const sourceEnd = direction === "LR" ? source.x + source.width : source.y + source.height;
        expect(targetStart).toBeGreaterThan(sourceEnd);
      }
    }
    for (const object of layout.objects) {
      const lane = layout.lanes.find((l) => l.lane.id === object.obj.laneId)!;
      expect(lane.lane.children).toContain(object.obj.id);
      expect(object.x).toBeGreaterThanOrEqual(lane.x);
      expect(object.y).toBeGreaterThanOrEqual(lane.y);
      expect(object.x + object.width).toBeLessThanOrEqual(lane.x + lane.width);
      expect(object.y + object.height).toBeLessThanOrEqual(lane.y + lane.height);
    }
    expect(ast).toEqual(before);
    // Permuting declarations never changes the DAG's ranks.
    ast.events.reverse();
    ast.activities.reverse();
    ast.gateways.reverse();
    for (const lane of ast.lanes) lane.children.reverse();
    expect(rankBpmnSequences(ast).ranks).toEqual(ranks);
  });

  it("uses the longest incoming path at joins, even with a shortcut", () => {
    const ast = parse(rankedProcess + "start --> join\n");
    expect(rankBpmnSequences(ast).ranks.get("join")).toBe(4);
  });

  it("does not let message flows affect ranks or object placement", () => {
    const ast = parse(rankedProcess);
    const withMessages = parse(rankedProcess + `finish ~~> peerStart
peerEnd ~~> start
finish ~~> "External"
"External" ~~> first
`);
    expect(rankBpmnSequences(withMessages).ranks).toEqual(rankBpmnSequences(ast).ranks);
    expect(rankBpmnSequences(withMessages).backEdges.size).toBe(0);
    expect(layoutBpmn(withMessages).objects).toEqual(layoutBpmn(ast).objects);
  });

  it("detects rework and self loops and routes them outside the objects", () => {
    const ast = parse(rankedProcess + 'join --? "retry" --> first\nsecond --> second\n');
    const { ranks, backEdges } = rankBpmnSequences(ast);
    expect([...backEdges].map((f) => [f.from, f.to])).toEqual([
      ["join", "first"], ["second", "second"],
    ]);
    for (const flow of ast.flows) {
      if (backEdges.has(flow)) continue;
      expect(ranks.get(flow.to)!).toBeGreaterThan(ranks.get(flow.from)!);
    }
    const layout = layoutBpmn(ast);
    const across = (point: { x: number; y: number }): number => direction === "LR" ? point.y : point.x;
    for (const flow of layout.flows.filter((f) => backEdges.has(f.flow))) {
      const points = pathPoints(flow.path);
      expect(points).toHaveLength(6);
      const source = layout.objects.find((o) => o.obj.id === flow.flow.from)!;
      const poolObjects = layout.objects.filter((o) => o.obj.poolId === source.obj.poolId);
      const firstObjectEdge = Math.min(...poolObjects.map(across));
      expect(across(points[2]!)).toBeLessThan(firstObjectEdge);
      expect(across(points[3]!)).toBeLessThan(firstObjectEdge);
      const along = (point: { x: number; y: number }): number => direction === "LR" ? point.x : point.y;
      expect(along(points[2]!)).toBeGreaterThan(along(points[3]!));
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(layout.width);
        expect(point.y).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("ranks disconnected components and a component with no start event", () => {
    const ast = parse(`bpmn
pool "Process" {
  z: end
  b: task "B"
  a: task "A"
  isolated: task "Isolated"
}
flows
a --> b --> z
b --> a
`);
    const { ranks, backEdges } = rankBpmnSequences(ast);
    expect(backEdges.size).toBe(1);
    for (const flow of ast.flows) {
      if (!backEdges.has(flow)) expect(ranks.get(flow.to)!).toBeGreaterThan(ranks.get(flow.from)!);
    }
    expect(ranks.get("z")).toBeGreaterThan(ranks.get("b")!);
    expect(ranks.get("isolated")).toBe(0);
  });

  it("terminates both ends of message flows on facing boundaries", () => {
    const ast = parse(`bpmn
pool "Before" blackbox
pool "Process" {
  task: task "Send and receive"
}
pool "After" blackbox
flows
"Before" ~~> task
task ~~> "Before"
"After" ~~> task
task ~~> "After"
"Before" ~~> "After"
`);
    const layout = layoutBpmn(ast);
    const endpointBox = (id: string) => layout.pools.find((p) => p.pool.label === id)
      ?? layout.objects.find((o) => o.obj.id === id)!;
    for (const flow of layout.flows) {
      const source = endpointBox(flow.flow.from);
      const target = endpointBox(flow.flow.to);
      const points = pathPoints(flow.path);
      const sourceCenter = direction === "LR" ? source.y + source.height / 2 : source.x + source.width / 2;
      const targetCenter = direction === "LR" ? target.y + target.height / 2 : target.x + target.width / 2;
      const sign = targetCenter > sourceCenter ? 1 : -1;
      const sourceExtent = direction === "LR" ? source.height : source.width;
      const targetExtent = direction === "LR" ? target.height : target.width;
      const start = points[0]!;
      const end = points[points.length - 1]!;
      expect(direction === "LR" ? start.y : start.x).toBeCloseTo(sourceCenter + sign * sourceExtent / 2);
      expect(direction === "LR" ? end.y : end.x).toBeCloseTo(targetCenter - sign * targetExtent / 2);
    }
  });
});
