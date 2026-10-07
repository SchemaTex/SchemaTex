import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSLDDSL } from "../../src/diagrams/sld/parser";
import { layoutSLD } from "../../src/diagrams/sld/layout";

const source = readFileSync(new URL("../../visual-eval/cases/sld-weekly-2026-09-20-industrial-distribution/source.sx", import.meta.url), "utf8");

describe("bus ties with downstream feeder chains", () => {
  it.each([false, true])("ranks descendants and keeps equipment apart (permuted=%s)", (permuted) => {
    const ast = parseSLDDSL(source);
    if (permuted) {
      const names = new Map(ast.nodes.map((node, i) => [node.id, `Device_${i}`]));
      for (const node of ast.nodes) node.id = names.get(node.id)!;
      for (const edge of ast.connections) { edge.from = names.get(edge.from)!; edge.to = names.get(edge.to)!; }
      ast.nodes.reverse(); ast.connections.reverse();
    }
    const layout = layoutSLD(ast);
    expect(layout.edges).toHaveLength(ast.connections.length);
    for (const edge of ast.connections) {
      const from = layout.nodeById.get(edge.from)!, to = layout.nodeById.get(edge.to)!;
      if (from.nodeType !== "bus_tie" && to.nodeType !== "bus_tie") expect(to.level).toBeGreaterThan(from.level);
    }
    for (const a of layout.nodes) for (const b of layout.nodes) {
      if (a === b || a.nodeType === "bus" || b.nodeType === "bus") continue;
      const overlapX = Math.min(a.x + a.halfWidth, b.x + b.halfWidth) - Math.max(a.x - a.halfWidth, b.x - b.halfWidth);
      const overlapY = Math.min(a.bottomY, b.bottomY) - Math.max(a.topY, b.topY);
      expect(overlapX > 0 && overlapY > 0, `${a.node.id} overlaps ${b.node.id}`).toBe(false);
    }
  }, 30_000);

  it("continues through two lateral tie groups and an intermediate breaker", () => {
    const ast = parseSLDDSL(`sld
S = utility
A = bus
T = bus_tie
B = breaker
C = bus
U = bus_tie
D = bus
E = breaker
F = load
S -> A
A -> T
T -> B
B -> C
C -> U
U -> D
D -> E
E -> F`);
    const layout = layoutSLD(ast);
    expect(layout.edges).toHaveLength(ast.connections.length);
    expect(layout.nodeById.get("F")!.level).toBeGreaterThan(layout.nodeById.get("C")!.level);
  });
});
