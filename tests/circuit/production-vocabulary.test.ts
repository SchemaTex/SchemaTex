import { describe, expect, it } from "vitest";
import { parseCircuit } from "../../src/diagrams/circuit/parser";
import { renderCircuit } from "../../src/diagrams/circuit/renderer";
import type { CircuitComponentType } from "../../src/core/types";

const FIXTURES: ReadonlyArray<{
  name: string;
  line: string;
  canonical: CircuitComponentType;
}> = [
  { name: "relay", line: "K1 Vin coil relay_com relay_no type=relay", canonical: "relay" },
  { name: "relay_spdt", line: "K2 Vin coil relay_com relay_nc relay_no type=relay_spdt", canonical: "relay_spdt" },
  { name: "mcu", line: "U1 3v3 gnd sda scl type=mcu label=MCU", canonical: "generic_ic" },
  { name: "pushbutton", line: "S1 3v3 reset type=pushbutton", canonical: "push_no" },
  { name: "ntc", line: "R1 sense gnd type=ntc value=10k", canonical: "thermistor_ntc" },
  { name: "regulator", line: "U2 vin gnd vout type=regulator label=REG", canonical: "voltage_regulator" },
  { name: "ldo_3v3", line: "U3 vin gnd 3v3 type=ldo_3v3 label=LDO_3V3", canonical: "voltage_regulator" },
  { name: "fan", line: "M1 switched gnd type=fan label=Cooling_Fan", canonical: "fan" },
  { name: "solar", line: "V1 gnd solar_bus type=solar label=PV1", canonical: "solar_cell" },
  { name: "dc_supply", line: "V2 gnd vin type=dc_supply value=12V", canonical: "voltage_source" },
  { name: "selector", line: "S2 common selected type=selector", canonical: "selector_switch" },
  { name: "triode", line: "Q1 plate grid cathode type=triode label=12AX7", canonical: "triode" },
  { name: "switch_nc", line: "S3 supply load type=switch_nc", canonical: "switch_nc" },
  { name: "switch_spst_nc", line: "S4 supply load type=switch_spst_nc", canonical: "switch_nc" },
  { name: "pullup", line: "R2 3v3 signal type=pullup value=4.7k", canonical: "resistor" },
  { name: "dc_motor", line: "M2 drive gnd type=dc_motor label=Pump_Motor", canonical: "motor" },
];

describe("circuit production vocabulary", () => {
  for (const fixture of FIXTURES) {
    it(`accepts ${fixture.name} in a realistic netlist line`, () => {
      const ast = parseCircuit(`circuit "Production vocabulary" netlist\n${fixture.line}`);
      const component = ast.components.find((candidate) => !candidate.id.startsWith("_GND"));
      expect(component?.componentType).toBe(fixture.canonical);
      expect(renderCircuit(ast)).toContain("<svg");
    });
  }

  it("binds the combined relay contacts and coils to distinct authored nets", () => {
    const ast = parseCircuit(`circuit "Relay controller" netlist
K1 Vin coil relay_com relay_no type=relay
K2 Vin coil relay_com relay_nc relay_no type=relay_spdt`);
    expect(ast.pinMap?.K1).toEqual({
      coil_a: "Vin",
      coil_b: "coil",
      common: "relay_com",
      no: "relay_no",
    });
    expect(ast.pinMap?.K2).toEqual({
      coil_a: "Vin",
      coil_b: "coil",
      common: "relay_com",
      nc: "relay_nc",
      no: "relay_no",
    });
  });
});
