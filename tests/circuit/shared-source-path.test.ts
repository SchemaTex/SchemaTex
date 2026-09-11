import { expect, test } from "vitest";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { schematicNetlistLayout } from "../../src/diagrams/circuit/schematic-layout";

test.each([2, 3, 5])("%i connected sources keep their transfer path continuous", count => {
  const lines = ["Source n0 GND type=voltage_source value=12V"];
  for (let i = 0; i < count; i++) {
    lines.push(`Link${i} n${i} n${i + 1} type=fuse`);
    lines.push(`Store${i} n${i + 1} GND type=battery value=12V`);
  }
  lines.push(`Load n${count} GND type=lamp`);
  const layout = schematicNetlistLayout(parseNetlist(lines.join("\n")))!;
  const links = Array.from({ length: count }, (_, i) => layout.items.find(it => it.component.id === `Link${i}`)!);
  expect(links.every(it => it.rotation === 0)).toBe(true);
  for (let i = 1; i < links.length; i++) expect(links[i]!.y > links[i - 1]!.y || links[i]!.x > links[i - 1]!.x).toBe(true);
  // Intermediate source taps must not turn into full-width overhead buses.
  expect(layout.flags?.filter(f => f.kind === "label" && /^n\d/.test(f.label ?? ""))).toHaveLength(0);
});

test("parallel batteries on one shared bus do not imply a transfer path", () => {
  const layout = schematicNetlistLayout(parseNetlist(`B1 power GND 12V
B2 power GND 12V
F1 power branch type=fuse
L1 branch GND type=lamp
R1 power GND 1k`))!;
  expect(layout.flags?.some(flag => flag.label === "power")).toBe(true);
});
