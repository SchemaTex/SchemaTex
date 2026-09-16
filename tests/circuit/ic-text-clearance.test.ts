import { expect, test } from "vitest";
import { parseCircuit } from "../../src/diagrams/circuit/parser";
import { renderCircuit } from "../../src/diagrams/circuit/renderer";
import { effectiveSymbolDef } from "../../src/diagrams/circuit/symbols";
import { estimateTextWidth } from "../../src/core/text-metrics";

test.each(["Sensor module", "Peripheral interface", "Control assembly"])("generic device caption %s is painted once", label => {
  const svg = renderCircuit(parseCircuit(`circuit netlist\nV1 supply GND 24V\nU1 supply output type=ic pins="INPUT,OUTPUT" label="${label}"\nR1 output GND 1k`));
  expect(svg.split(label).length - 1).toBe(1);
});

test.each(["INPUT,OUTPUT", "REFERENCE_INPUT,BUFFERED_OUTPUT", "端口输入,端口输出"])("generic pin columns reserve measured text width: %s", pins => {
  const [left, right] = pins.split(",");
  const attrs = { pins_left: left!, pins_right: right!, ic_label: "" };
  const symbol = effectiveSymbolDef("generic_ic", attrs);
  expect(symbol.length).toBeGreaterThanOrEqual(estimateTextWidth(left!, 9) + estimateTextWidth(right!, 9) + 16);
  expect(symbol.anchors[right!.toLowerCase()]?.x ?? symbol.anchors.pin_2?.x).toBe(symbol.length + 8);
});
