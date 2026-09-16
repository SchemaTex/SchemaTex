import { describe, expect, it } from "vitest";
import { renderResult } from "../../src/core/api";
import { parseCircuit } from "../../src/diagrams/circuit/parser";
import { schematicNetlistLayout } from "../../src/diagrams/circuit/schematic-layout";
import { effectiveSymbolDef } from "../../src/diagrams/circuit/symbols";

const parts = [
  'V1 VP GND 5V',
  'U1 VP GND IN MID type=ic pins="VCC:power,GND:return,IN:input,OUT:output" label="Sensor"',
  'U2 VP GND MID OUT type=ic pins="VCC:power,GND:return,IN:input,OUT:output" label="Processor"',
  'R1 IN GND 10k',
  'R2 OUT GND 1k',
];
const header = 'circuit "Signal chain" netlist';

describe("circuit functional structure", () => {
  it("keeps netlist binding independent of functional pin sides", () => {
    const ast = parseCircuit([header, ...parts].join("\n"));
    expect(ast.pinMap?.U1).toEqual({ vcc: "VP", gnd: "GND", in: "IN", out: "MID" });
    const component = ast.components.find(c => c.id === "U1")!;
    const symbol = effectiveSymbolDef(component.componentType, component.attrs);
    expect(symbol.anchors.in!.x).toBeLessThan(symbol.anchors.out!.x);
    expect(symbol.anchors.vcc!.y).toBeLessThan(symbol.anchors.gnd!.y);
    expect(symbol.svg(component.label, undefined, component.attrs)).not.toMatch(/:power|:return|:input|:output/);
  });

  it("connects symbolic pin labels on their derived functional side", () => {
    const ast = parseCircuit([header, 'V1 VP GND 5V', 'U1 VP GND type=ic pins="+:input,−:return"'].join("\n"));
    const layout = schematicNetlistLayout(ast)!;
    const device = layout.items.find(item => item.component.id === "U1")!;
    for (const pin of Object.keys(ast.pinMap!.U1)) {
      const anchor = device.anchors[pin];
      expect(anchor).toBeDefined();
      expect(layout.routes.some(route => route.points.some(point => point.x === anchor!.x && point.y === anchor!.y))).toBe(true);
    }
  });

  it.each([false, true])("places whole functional groups in flow order (reversed declarations: %s)", reverse => {
    const source = [header, ...(reverse ? [...parts].reverse() : parts),
      'group sense "Sensing": U1 R1', 'group compute "Processing": U2 R2',
      'flow sense -> compute'].join("\n");
    const result = renderResult(source, { type: "circuit" });
    expect(result.svg).toContain("Processing");
    expect(result.diagnostics.some(diagnostic => diagnostic.severity === "error")).toBe(false);
    const ast = parseCircuit(source);
    const original = structuredClone(ast.pinMap);
    expect(ast.groups?.map(group => group.components)).toEqual([["U1", "R1"], ["U2", "R2"]]);
    const layout = schematicNetlistLayout(ast)!;
    const x = (id: string) => layout.items.find(item => item.component.id === id)!.x;
    expect(Math.max(x("U1"), x("R1"))).toBeLessThan(Math.min(x("U2"), x("R2")));
    expect(ast.pinMap).toEqual(original);
    expect(new Set(layout.items.map(item => item.component.id)).size).toBe(ast.components.length);
  });

  it("honors physical bus order without changing its electrical net", () => {
    const ast = parseCircuit([header,
      'U1 A B type=ic pins="A:bidirectional,B:bidirectional"',
      'U2 A B type=ic pins="A:bidirectional,B:bidirectional"',
      'U3 A B type=ic pins="A:bidirectional,B:bidirectional"',
      'bus A,B: U3 -> U1 -> U2'].join("\n"));
    const original = structuredClone(ast.nets);
    const layout = schematicNetlistLayout(ast)!;
    const x = (id: string) => layout.items.find(item => item.component.id === id)!.x;
    expect(x("U3")).toBeLessThan(x("U1"));
    expect(x("U1")).toBeLessThan(x("U2"));
    expect(ast.nets).toEqual(original);
    for (const net of ["A", "B"]) {
      const trunk = layout.routes.find(route => route.netId === net)!;
      expect(new Set(trunk.points.map(point => point.y)).size).toBe(1);
    }
  });

  it.each([
    ['group a: U404', /unknown component/i],
    ['group a: U1\ngroup b: U1', /more than one group/i],
    ['group a: U1\nflow a -> missing', /unknown group/i],
    ['group a: U1\ngroup b: U2\nflow a -> b -> a', /cycle/i],
    ['bus MID: U1 -> R1', /not connected/i],
    ['U3 VP GND type=ic pins=\"VCC:power,GND:return\" pins_top=GND', /engine chooses pin sides/i],
  ])("rejects contradictory structure: %s", (structure, error) => {
    expect(() => parseCircuit([header, ...parts, structure].join("\n"))).toThrow(error);
  });
});
