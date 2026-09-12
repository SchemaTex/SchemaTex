import { describe, expect, it } from "vitest";
import { parseCircuit } from "../../src/diagrams/circuit/parser";
import { schematicNetlistLayout } from "../../src/diagrams/circuit/schematic-layout";

const declarations = [
  'V1 VP GND value="5 V"',
  'U1 SENSE REF VP GND type=ic pins="sense,reference,vcc,gnd" label="Interface"',
  'R1 VP SENSE value="10 kOhm"',
  'D1 REF SENSE type=diode',
  'R2 REF GND value="20 kOhm"',
];

describe("passive networks around fixed device pins", () => {
  it.each([false, true])("preserves diode polarity when arranging a chain (reordered: %s)", (reordered) => {
    const rows = reordered ? [...declarations].reverse() : declarations;
    const ast = parseCircuit(['circuit "Bias network" netlist', ...rows].join("\n"));
    const pinMap = structuredClone(ast.pinMap);
    const layout = schematicNetlistLayout(ast)!;
    expect(ast.pinMap).toEqual(pinMap);
    const item = (id: string) => layout.items.find(i => i.component.id === id)!;
    const upper = item("R1"), diode = item("D1"), lower = item("R2");
    // The tapped path sits on the physical side of the device's input pins.
    // No fixed coordinates, lengths, fonts, or case names are prescribed.
    expect(diode.anchors.end!.x).toBeLessThan(item("U1").anchors.sense!.x);
    expect(upper.anchors.end!.x).toBeCloseTo(diode.anchors.end!.x);
    expect(lower.anchors.start!.x).toBeCloseTo(diode.anchors.start!.x);
    // The diode's second authored terminal is upstream. Rotation must not
    // quietly exchange anode/cathode to make the chain look convenient.
    expect(diode.anchors.end!.y).toBeLessThan(diode.anchors.start!.y);
    expect(upper.anchors.end!.y).toBeLessThan(diode.anchors.end!.y);
    expect(diode.anchors.start!.y).toBeLessThan(lower.anchors.start!.y);
  });
});
