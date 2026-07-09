import { describe, test, expect } from "vitest";
import { parseCircuit, CircuitParseError } from "../../src/diagrams/circuit/parser";
import { validateDsl } from "../../src/ai";

// Regression: positional-mode circuit used to SILENTLY DROP any identifier-led
// line whose head was not a known component type. A model that wrote
// netlist-style connectivity without the `netlist` header (e.g. `breaker CB1
// (L L1) 16A`, `rcd RCD1 ...`, `switch SW1 ...`) got a misleadingly near-empty
// schematic that still reported `validate ok / render ok`. Those lines must now
// surface as a real error so downstream validation can catch it.
describe("circuit positional mode rejects unknown component types", () => {
  test("an unknown bare-form type throws instead of being dropped", () => {
    const dsl = `circuit "home switch"\nbreaker CB1 (L L1) 16A`;
    expect(() => parseCircuit(dsl)).toThrow(CircuitParseError);
    expect(() => parseCircuit(dsl)).toThrow(/Unknown component type: "breaker"/);
  });

  test("the error hints at the missing `netlist` header", () => {
    const dsl = `circuit "home switch"\nrcd RCD1 (L1 N L2 N2) 30mA`;
    expect(() => parseCircuit(dsl)).toThrow(/netlist/);
  });

  test("validateDsl reports the real failing DSL as invalid, not ok", () => {
    // The exact shape that slipped through in production: a header without
    // `netlist`, then several unknown-type lines.
    const dsl = [
      'circuit "家庭开关电路图"',
      "  vsource V1 (L N) 220V~",
      "  breaker CB1 (L L1) 16A",
      "  switch SW1 (L2 Lsw)",
      "  lamp LAMP1 (Lsw N2) 60W",
    ].join("\n");
    const result = validateDsl("circuit", dsl);
    expect(result.ok).toBe(false);
  });

  test("known bare-form types and the netlist path are unaffected", () => {
    // Positional bare form with a KNOWN type still parses.
    expect(() => parseCircuit(`circuit "t"\nground`)).not.toThrow();
    // The same circuit written correctly (netlist header + SPICE ids) is valid.
    const netlist = `circuit "home switch" netlist\nV1 L N 220VAC\nF1 L L1 16A\nS1 L1 Lout\nR_lamp Lout N 60W`;
    expect(validateDsl("circuit", netlist).ok).toBe(true);
  });
});
