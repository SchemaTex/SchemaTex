import { describe, test, expect } from "vitest";
import { parseCircuit } from "../../src/diagrams/circuit/parser";
import { renderCircuit } from "../../src/diagrams/circuit/renderer";
import { getSymbol } from "../../src/diagrams/circuit/symbols";

describe("circuit industrial primitives (Track A Unit 3)", () => {
  // Each new IEC 60617 symbol must (a) exist in the SYMBOLS registry,
  // (b) parse via the DSL with its canonical name or designator alias,
  // and (c) render to SVG without errors.
  const NEW_TYPES = [
    "relay_coil",
    "relay_no",
    "relay_nc",
    "contactor",
    "solenoid_valve",
    "thermal_overload",
    "disconnect_switch",
  ] as const;

  for (const type of NEW_TYPES) {
    test(`${type} symbol exists and has start+end anchors`, () => {
      const sym = getSymbol(type);
      expect(sym).toBeDefined();
      expect(sym!.anchors["start"]).toBeDefined();
      expect(sym!.anchors["end"]).toBeDefined();
      expect(sym!.length).toBeGreaterThan(0);
      // SVG fragment is non-empty and well-formed enough to contain at
      // least one element tag.
      const svg = sym!.svg();
      expect(svg.length).toBeGreaterThan(0);
      expect(svg).toMatch(/<(line|rect|circle|path|polygon)/);
    });
  }

  test("positional DSL accepts the new types via id:type form", () => {
    const dsl = `circuit "control"
Q1: disconnect_switch right
F1: fuse right
KM1: contactor right
F2: thermal_overload right
M1: motor right`;
    const ast = parseCircuit(dsl);
    expect(ast.components.find((c) => c.id === "Q1")?.componentType).toBe("disconnect_switch");
    expect(ast.components.find((c) => c.id === "KM1")?.componentType).toBe("contactor");
    expect(ast.components.find((c) => c.id === "F2")?.componentType).toBe("thermal_overload");
  });

  test("aliases route to canonical types in positional DSL", () => {
    // Short DSL aliases must resolve to the canonical IEC types.
    const dsl = `circuit "aliased"
K1: coil right
K2: relay right
KM1: km right
EV1: solenoid right
EV2: ev right
F2: thermal right
F3: overload right
Q1: disconnect right
Q2: isolator right`;
    const ast = parseCircuit(dsl);
    expect(ast.components.find((c) => c.id === "K1")?.componentType).toBe("relay_coil");
    expect(ast.components.find((c) => c.id === "K2")?.componentType).toBe("relay_coil");
    expect(ast.components.find((c) => c.id === "KM1")?.componentType).toBe("contactor");
    expect(ast.components.find((c) => c.id === "EV1")?.componentType).toBe("solenoid_valve");
    expect(ast.components.find((c) => c.id === "EV2")?.componentType).toBe("solenoid_valve");
    expect(ast.components.find((c) => c.id === "F2")?.componentType).toBe("thermal_overload");
    expect(ast.components.find((c) => c.id === "F3")?.componentType).toBe("thermal_overload");
    expect(ast.components.find((c) => c.id === "Q1")?.componentType).toBe("disconnect_switch");
    expect(ast.components.find((c) => c.id === "Q2")?.componentType).toBe("disconnect_switch");
  });

  test("motor-starter pattern renders end-to-end without error", () => {
    // Typical motor starter: disconnect → fuse → contactor → thermal → motor.
    const dsl = `circuit "motor starter"
Q1: disconnect_switch right
F1: fuse right
KM1: contactor right
F2: thermal_overload right
M1: motor right`;
    const ast = parseCircuit(dsl);
    const svg = renderCircuit(ast);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("schematex-circuit");
  });

  test("relay coil + NO contact + NC contact all coexist", () => {
    const dsl = `circuit "relay logic"
K1: relay_coil right
K1A: relay_no right
K1B: relay_nc right`;
    const ast = parseCircuit(dsl);
    expect(ast.components).toHaveLength(3);
    const svg = renderCircuit(ast);
    expect(svg).toContain("<svg");
  });
});
