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
    expect(ast.components.find((c) => c.id === "K2")?.componentType).toBe("relay");
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

  test("control cabinet layout primitives render with absolute panel coordinates", () => {
    const dsl = `circuit "control cabinet"
P1: enclosure at=0,0 width=260 height=170 label="MCC Panel"
D1: wire_duct at=20,28 length=220
R1: din_rail at=20,60 length=220
PLC1: plc at=32,60 label="PLC"
KM1: contactor at=118,60 label="KM1"
TB1: terminal_block at=190,55 label="TB1" pins="L,N,PE"
E1: emergency_stop at=40,125 label="E-STOP"
S1: selector_switch at=90,125 label="AUTO"
H1: pilot_light at=140,125 label="RUN"`;
    const ast = parseCircuit(dsl);
    expect(ast.components.find((c) => c.id === "P1")?.componentType).toBe("enclosure");
    expect(ast.components.find((c) => c.id === "R1")?.componentType).toBe("din_rail");
    const svg = renderCircuit(ast);
    expect(svg).toContain("schematex-circuit-enclosure");
    expect(svg).toContain("schematex-circuit-din");
    expect(svg).toContain("MCC Panel");
  });
});
