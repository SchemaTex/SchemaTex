/** Opt-in benchmark: node_modules/.bin/vite-node scripts/benchmark-circuit.mts.
 * Keep machine-dependent timing out of the functional regression suite.
 */
import assert from "node:assert/strict";
import { parseNetlist } from "../src/diagrams/circuit/netlist";
import { layoutCircuitNetlist } from "../src/diagrams/circuit/autolayout";

for (const depth of [4, 8, 18]) {
  const lines = ["V1 live 0 12V", "S1 live left right type=switch_spdt_center_off"];
  for (const side of ["left", "right"]) for (let layer = 0; layer < depth; layer++) {
    const from = layer === 0 ? side : `${side}${layer}`;
    const to = layer === depth - 1 ? "0" : `${side}${layer + 1}`;
    const prefix = side[0]!.toUpperCase();
    lines.push(`R${prefix}${layer}a ${from} ${to} 1k`, `R${prefix}${layer}b ${from} ${to} 1k`);
  }
  const ast = parseNetlist(lines.join("\n"));
  const started = performance.now();
  const layout = layoutCircuitNetlist(ast);
  assert.deepEqual(new Set(layout.items.map(item => item.component.id)), new Set(ast.components.map(c => c.id)));
  console.log(JSON.stringify({ depth, components: ast.components.length, milliseconds: Math.round(performance.now() - started) }));
}
