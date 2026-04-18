import { describe, test, expect } from "vitest";
import { parseFlowchart } from "../../src/diagrams/flowchart/parser";
import { layoutFlowchart } from "../../src/diagrams/flowchart/layout";

describe("flowchart layout", () => {
  test("linear chain yields one node per layer (TB)", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B --> C");
    const r = layoutFlowchart(ast);
    expect(r.nodes).toHaveLength(3);
    const a = r.nodes.find((n) => n.node.id === "A")!;
    const b = r.nodes.find((n) => n.node.id === "B")!;
    const c = r.nodes.find((n) => n.node.id === "C")!;
    expect(a.layer).toBe(0);
    expect(b.layer).toBe(1);
    expect(c.layer).toBe(2);
    // y grows with layer
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
  });

  test("branching decision — merge point on deeper layer", () => {
    const ast = parseFlowchart(`flowchart TD
A --> B
A --> C
B --> D
C --> D`);
    const r = layoutFlowchart(ast);
    const d = r.nodes.find((n) => n.node.id === "D")!;
    const b = r.nodes.find((n) => n.node.id === "B")!;
    const c = r.nodes.find((n) => n.node.id === "C")!;
    expect(b.layer).toBe(1);
    expect(c.layer).toBe(1);
    expect(d.layer).toBe(2);
  });

  test("long edge: layer difference > 1 routes through dummies", () => {
    const ast = parseFlowchart(`flowchart TD
A --> B --> C --> D
A --> D`);
    const r = layoutFlowchart(ast);
    // A at 0, D at 3
    const a = r.nodes.find((n) => n.node.id === "A")!;
    const d = r.nodes.find((n) => n.node.id === "D")!;
    expect(a.layer).toBe(0);
    expect(d.layer).toBe(3);
    // The A→D edge should have a path with more than 4 points → > 1 L-bend,
    // since routing dummies introduce intermediate waypoints.
    const ad = r.edges.find(
      (e) => e.edge.from === "A" && e.edge.to === "D"
    );
    expect(ad).toBeDefined();
    // Path uses M ... L ... L ... L ... — count L commands
    const lcount = (ad!.path.match(/L /g) ?? []).length;
    expect(lcount).toBeGreaterThanOrEqual(3);
  });

  test("cycle handling: greedy-FAS produces valid layering", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B --> C --> A");
    const r = layoutFlowchart(ast);
    // All 3 nodes placed; exactly one edge marked reversed
    expect(r.nodes).toHaveLength(3);
    const reversed = r.edges.filter((e) => e.edge.isReversed);
    expect(reversed.length).toBe(1);
    // Layers must be valid non-negative integers
    for (const n of r.nodes) {
      expect(Number.isInteger(n.layer)).toBe(true);
      expect(n.layer).toBeGreaterThanOrEqual(0);
    }
  });

  test("LR direction: nodes arranged left-to-right", () => {
    const ast = parseFlowchart("flowchart LR\nA --> B --> C --> D");
    const r = layoutFlowchart(ast);
    const a = r.nodes.find((n) => n.node.id === "A")!;
    const b = r.nodes.find((n) => n.node.id === "B")!;
    const c = r.nodes.find((n) => n.node.id === "C")!;
    const d = r.nodes.find((n) => n.node.id === "D")!;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
    expect(c.x).toBeLessThan(d.x);
    expect(r.direction).toBe("LR");
  });

  test("canvas dimensions are positive", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B");
    const r = layoutFlowchart(ast);
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  });

  test("edge path is non-empty for each edge", () => {
    const ast = parseFlowchart(`flowchart TD
A{Valid?} -->|yes| B[Save]
A -->|no| C[Reject]`);
    const r = layoutFlowchart(ast);
    expect(r.edges).toHaveLength(2);
    for (const e of r.edges) {
      expect(e.path.length).toBeGreaterThan(0);
      expect(e.path.startsWith("M ")).toBe(true);
    }
  });

  test("edge label anchor is present for labeled edges", () => {
    const ast = parseFlowchart("flowchart TD\nA -->|yes| B");
    const r = layoutFlowchart(ast);
    expect(r.edges[0]?.labelAnchor).toBeDefined();
  });

  test("implicit nodes (used only in edges) are created", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B\nB --> C");
    const r = layoutFlowchart(ast);
    expect(r.nodes.map((n) => n.node.id).sort()).toEqual(["A", "B", "C"]);
  });
});
