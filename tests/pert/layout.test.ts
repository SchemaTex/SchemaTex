import { readFileSync } from "node:fs";
import { segmentEntersBox } from "../../src/diagrams/logic/orthogonal-router";
import { renderPert } from "../../src/diagrams/pert/renderer";
import { describe, expect, it } from "vitest";
import { parsePert } from "../../src/diagrams/pert/parser";
import { layoutPert } from "../../src/diagrams/pert/layout";

const DIAMOND = `pert
task A "Start" duration: 2
task B "Upper" duration: 6 after: A
task C "Lower" duration: 3 after: A
task D "Finish" duration: 4 after: B, C`;

describe("pert layout — network mode", () => {
  it("lays out a box per task and advances columns along dependencies", () => {
    const l = layoutPert(parsePert(DIAMOND));
    expect(l.mode).toBe("network");
    expect(l.boxes).toHaveLength(4);
    const byId = new Map(l.boxes.map((b) => [b.id, b]));
    // ranks increase along edges
    expect(byId.get("A")!.rank).toBe(0);
    expect(byId.get("B")!.rank).toBe(1);
    expect(byId.get("C")!.rank).toBe(1);
    expect(byId.get("D")!.rank).toBe(2);
    // columns advance left-to-right (LR)
    expect(byId.get("A")!.x).toBeLessThan(byId.get("B")!.x);
    expect(byId.get("B")!.x).toBeLessThan(byId.get("D")!.x);
  });

  it("flags critical boxes and edges", () => {
    const l = layoutPert(parsePert(DIAMOND));
    const byId = new Map(l.boxes.map((b) => [b.id, b]));
    expect(byId.get("A")!.computed.critical).toBe(true);
    expect(byId.get("B")!.computed.critical).toBe(true);
    expect(byId.get("C")!.computed.critical).toBe(false);
    const ab = l.edges.find((e) => e.from === "A" && e.to === "B")!;
    const ac = l.edges.find((e) => e.from === "A" && e.to === "C")!;
    expect(ab.critical).toBe(true);
    expect(ac.critical).toBe(false);
  });

  it("renders milestones as a 90-wide diamond box", () => {
    const l = layoutPert(parsePert(`pert
task A "A" duration: 5
task M "Go-live" milestone after: A`));
    const m = l.boxes.find((b) => b.id === "M")!;
    expect(m.milestone).toBe(true);
    expect(m.width).toBe(90);
  });

  it("adds sentinel nodes when show-sentinels is on", () => {
    const l = layoutPert(parsePert(`pert
show-sentinels: true
task A "A" duration: 2
task B "B" duration: 3 after: A`));
    expect(l.sentinels.map((s) => s.id).sort()).toEqual(["__finish__", "__start__"]);
  });
});

describe("pert layout — swimlanes", () => {
  it("groups tasks into lane bands when a lane is declared", () => {
    const l = layoutPert(parsePert(`pert
task A "A" duration: 3 lane: "Design"
task B "B" duration: 4 after: A lane: "Build"
task C "C" duration: 2 after: B lane: "Build"`));
    expect(l.lanes).toBeTruthy();
    expect(l.lanes!.map((x) => x.name)).toEqual(["Design", "Build"]);
    // a task sits within its lane's vertical band
    const byId = new Map(l.boxes.map((b) => [b.id, b]));
    const designLane = l.lanes!.find((x) => x.name === "Design")!;
    const a = byId.get("A")!;
    expect(a.y).toBeGreaterThanOrEqual(designLane.y);
    expect(a.y + a.height).toBeLessThanOrEqual(designLane.y + designLane.height);
  });

  it("does not produce lanes when none are declared", () => {
    const l = layoutPert(parsePert(`pert\ntask A "A" duration: 3`));
    expect(l.lanes).toBeUndefined();
  });
});

describe("pert layout — timescaled mode", () => {
  it("positions activities by ES and sizes them by duration", () => {
    const l = layoutPert(parsePert(`pert
layout: timescaled
task A "A" duration: 4
task B "B" duration: 8 after: A
task C "C" duration: 2 after: A`));
    expect(l.mode).toBe("timescaled");
    expect(l.axis).toBeTruthy();
    const byId = new Map(l.boxes.map((b) => [b.id, b]));
    // B and C start after A (later x); B is wider than C (longer duration)
    expect(byId.get("B")!.x).toBeGreaterThan(byId.get("A")!.x);
    expect(byId.get("B")!.width).toBeGreaterThan(byId.get("C")!.width);
    // axis spans from 0 to project duration
    expect(l.axis!.ticks[0].value).toBe(0);
    expect(l.axis!.ticks.some((t) => t.value === 12)).toBe(true);
  });
});

it.each(["LR", "TB"])("relaunch dependencies reach their real targets without crossing tasks (%s)", (direction) => {
  const dsl = readFileSync(new URL("../fixtures/regression/pert-website-relaunch.sx", import.meta.url), "utf8")
    .replace("pert\n", `pert\ndirection: ${direction}\n`);
  const l = layoutPert(parsePert(dsl));
  const svg = renderPert(dsl);
  expect(l.edges).toHaveLength(6);
  expect(svg).toMatch(/<marker[^>]*id="sx-pert-arrow"[^>]*orient="auto"/);
  for (const e of l.edges) {
    const coords = e.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const points = Array.from({ length: coords.length / 2 }, (_, i) => ({ x: coords[2 * i], y: coords[2 * i + 1] }));
    const target = l.boxes.find((b) => b.id === e.to)!;
    const inputFraction = (target.task.deps.findIndex((dep) => dep.pred === e.from) + 1) / (target.task.deps.length + 1);
    expect(points.at(-1)).toEqual(direction === "TB"
      ? { x: target.x + target.width * inputFraction, y: target.y }
      : { x: target.x, y: target.y + target.height * inputFraction });
    const before = points.at(-2)!;
    expect(direction === "TB" ? before.y < target.y : before.x < target.x).toBe(true);
    for (let i = 1; i < points.length; i++) {
      for (const box of l.boxes.filter((b) => b.id !== e.from && b.id !== e.to)) {
        expect(segmentEntersBox(points[i - 1], points[i], {
          left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height,
        }), `${e.from} -> ${e.to} crosses ${box.id}`).toBe(false);
      }
    }
    expect(svg).toContain(`d="${e.d}" marker-end="url(#sx-pert-arrow${e.critical ? "-crit" : ""})" data-from="${e.from}" data-to="${e.to}"`);
  }
});

it.each(["LR", "TB"])("long dependencies enter the milestone boundary without crossing intermediate tasks (%s)", direction => {
  const dsl = readFileSync(new URL("../fixtures/regression/pert-milestone-join.sx", import.meta.url), "utf8").replace("pert\n", `pert\ndirection: ${direction}\n`);
  const layout = layoutPert(parsePert(dsl));
  const incoming = layout.edges.filter(e => e.to === "E2");
  expect(incoming).toHaveLength(2);
  expect(new Set(incoming.map(e => e.d)).size).toBe(2);
  for (const edge of incoming) {
    const coords = edge.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const points = Array.from({ length: coords.length / 2 }, (_, i) => ({ x: coords[i * 2], y: coords[i * 2 + 1] }));
    const target = layout.boxes.find(b => b.id === edge.to)!;
    const end = points.at(-1)!;
    expect(Math.abs((end.x - target.x - target.width / 2) / (target.width / 2)) + Math.abs((end.y - target.y - target.height / 2) / (target.height / 2))).toBeCloseTo(1);
    for (let i = 1; i < points.length; i++) for (const box of layout.boxes.filter(b => b.id !== edge.from && b.id !== edge.to)) {
      expect(segmentEntersBox(points[i - 1], points[i], { left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height }), `${edge.from} -> ${edge.to} crosses ${box.id}`).toBe(false);
    }
  }
});
