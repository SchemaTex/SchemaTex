import { expect, test } from "vitest";
import { parseCircuit } from "../../src/diagrams/circuit/parser";
import { renderCircuit } from "../../src/diagrams/circuit/renderer";

test.each(["pilot_light", "selector_switch", "emergency_stop"])("%s has one upright authored caption", type => {
  const svg = renderCircuit(parseCircuit(`circuit netlist\nV1 supply GND 24V\nDevice supply GND type=${type} label="Unique caption"`));
  expect([...svg.matchAll(/>[^<]*Unique caption[^<]*<\/text>/g)]).toHaveLength(1);
});
