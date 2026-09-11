import { expect, test } from "vitest";
import { isBetterRouting } from "../../src/diagrams/circuit/layout-quality";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { schematicNetlistLayout } from "../../src/diagrams/circuit/schematic-layout";

function cycle(count: number, prefix: string) {
  return [`Supply power GND 12V`, `${prefix}root power GND n0 n${count} type=ic pins="VCC,GND,OUT,RETURN"`,
    ...Array.from({ length: count }, (_, i) => `${prefix}${i} n${i} n${i + 1} type=ic pins="IN,OUT"`)].join("\n");
}

test.each([3, 6, 9])("routed candidate search preserves every connection in a %i-stage cycle", count => {
  const ast = parseNetlist(cycle(count, "Unit"));
  const original = JSON.stringify(ast);
  const layout = schematicNetlistLayout(ast, { collectStats: true })!;
  const search = layout.stats!.optimization!;
  expect(search.candidates).toBeLessThanOrEqual(8);
  expect(search.after).toSatisfy(after => JSON.stringify(after) === JSON.stringify(search.before) || isBetterRouting(after, search.before));
  for (const metric of ["bodyHits", "captionHits", "terminalTurns", "overlap", "junctionConflicts"] as const) {
    expect(search.after[metric]).toBeLessThanOrEqual(search.before[metric]);
  }
  for (const net of ast.nets.filter(net => net.anchors.length > 1)) for (const ref of net.anchors) {
    const [id, pin] = ref.split(".");
    const at = layout.items.find(item => item.component.id === id)!.anchors[pin!]!;
    expect(layout.routes.some(route => route.points.some(p => p.x === at.x && p.y === at.y))).toBe(true);
  }
  expect(JSON.stringify(ast)).toBe(original);
  expect(schematicNetlistLayout(ast, { collectStats: true })).toEqual(layout);
  const renamed = schematicNetlistLayout(parseNetlist(cycle(count, "Unit").replace(/\bn(\d+)\b/g, "renamed_net_$1")), { collectStats: true })!;
  expect(renamed.stats!.optimization!.after).toEqual(search.after);
});
