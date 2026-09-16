import { expect, test } from "vitest";
import { parseBlockDiagram } from "../../src/diagrams/blockdiagram/parser";
import { layoutBlockDiagram, findBlockDiagramCollisions } from "../../src/diagrams/blockdiagram/layout";

test("an auxiliary shortcut does not collapse successive processing stages", () => {
  const layout = layoutBlockDiagram(parseBlockDiagram(`blockdiagram
source = block("Source")
first = block("First stage")
second = block("Second stage")
source -> first ["first input"]
source -> second ["auxiliary control"]
first -> second ["processed result"]`));
  expect(layout.edges.every(e => (e.labelWidth ?? 0) > 0 && (e.labelHeight ?? 0) > 0)).toBe(true);
  expect(findBlockDiagramCollisions(layout).labelNode).toEqual([]);
  const byId = new Map(layout.nodes.map(n => [n.id, n]));
  expect(byId.get("second")!.kind).toBe("block");
  const first = byId.get("first")!, second = byId.get("second")!;
  if (first.kind === "block" && second.kind === "block") expect(second.x).toBeGreaterThan(first.x + first.width);
  expect(layout.edges.every(e => !e.isFeedback)).toBe(true);
});
