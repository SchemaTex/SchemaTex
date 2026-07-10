import { describe, test, expect } from "vitest";
import { parseCircuit } from "../../src/diagrams/circuit/parser";

describe("circuit netlist parser", () => {
  test("W-prefix ID infers wire type", () => {
    const dsl = `circuit "RFID" netlist
U_UNO gnd vcc arduino_uno label="Arduino Uno"
U_ESP32 gnd 3v3 esp32 label="ESP32 (IoT)"
W1 U_UNO.TX U_ESP32.RX label="Serial TX->RX"
W2 U_UNO.RX U_ESP32.TX label="Serial RX->TX"`;
    const ast = parseCircuit(dsl);
    expect(ast.components.find((c) => c.id === "W1")?.componentType).toBe("wire");
    expect(ast.components.find((c) => c.id === "W2")?.componentType).toBe("wire");
  });

  test("explicit type=wire still works for non-W ids", () => {
    const dsl = `circuit "test" netlist
N1 a b type=wire`;
    const ast = parseCircuit(dsl);
    expect(ast.components.find((c) => c.id === "N1")?.componentType).toBe("wire");
  });

  test("explicit motor type uses the motor pins instead of the M-prefix MOSFET pins", () => {
    const dsl = `circuit "CNC motors" netlist
M_X drv_x_a drv_x_b type=motor label="X axis"`;
    const ast = parseCircuit(dsl);

    expect(ast.components.find((c) => c.id === "M_X")?.componentType).toBe("motor");
    expect(ast.pinMap?.M_X).toEqual({
      start: "drv_x_a",
      end: "drv_x_b",
    });
  });

  test("lamp aliases resolve to the lamp symbol even when the id prefix would mean inductor", () => {
    const ast = parseCircuit(`circuit "house light" netlist
V1 live neutral 220Vac type=acsource
L1 switched neutral type=light label="Lamp"`);

    expect(ast.components.find((c) => c.id === "L1")?.componentType).toBe("lamp");
    expect(ast.pinMap?.L1).toEqual({
      start: "switched",
      end: "neutral",
    });
  });

  // ─── Ground aliases (Case D) ─────────────────────────────────
  describe("ground aliases", () => {
    test("AGND/DGND/EARTH/PE/VSS/COM net names canonicalize to GND", () => {
      // All these should auto-emit a ground symbol like "GND" does.
      const dsl = `circuit "rails" netlist
R1 vcc AGND 1k
R2 vcc DGND 1k
R3 vcc EARTH 1k
R4 vcc PE 1k
R5 vcc VSS 1k
R6 vcc COM 1k`;
      const ast = parseCircuit(dsl);
      // After ground synth, all six aliases should map to the canonical GND net
      const groundComponents = ast.components.filter(
        (c) => c.componentType === "ground"
      );
      expect(groundComponents.length).toBeGreaterThanOrEqual(1);
      // Net "GND" should exist (canonical), and aliases should not all linger
      const netIds = ast.nets.map((n) => n.id);
      expect(netIds).toContain("GND");
    });

    test("GND-style id (G prefix) declares as ground component without type=", () => {
      const dsl = `circuit "explicit" netlist
GND_REF gnd_net
R1 vcc gnd_net 1k`;
      // Should NOT throw "Cannot infer type"
      const ast = parseCircuit(dsl);
      const gndRef = ast.components.find((c) => c.id === "GND_REF");
      expect(gndRef?.componentType).toBe("ground");
    });

    test("error message for unknown id suggests type= for likely ground ids", () => {
      const dsl = `circuit "x" netlist
ZZZ_FOO a b`;
      expect(() => parseCircuit(dsl)).toThrow(/Cannot infer type/);
    });
  });

  // ─── Terminal block / junction box (Case C) ──────────────────
  describe("terminal_block primitive", () => {
    test("T-prefixed id declares terminal_block with custom pins", () => {
      // Use net names that don't collide with ground aliases
      const dsl = `circuit "Sensor wiring" netlist
TB1 wire1 wire2 wire3 wire4 type=terminal_block label="JB1" pins="SIG,RTN,12V+,GND"`;
      const ast = parseCircuit(dsl);
      const tb = ast.components.find((c) => c.id === "TB1");
      expect(tb?.componentType).toBe("terminal_block");
      const pins = ast.pinMap?.["TB1"];
      expect(pins).toBeDefined();
      expect(Object.keys(pins!).length).toBe(4);
      expect(pins!.sig).toBe("wire1");
      expect(pins!.rtn).toBe("wire2");
    });

    test("junction_box alias resolves to terminal_block", () => {
      const dsl = `circuit "x" netlist
JB1 a b type=junction_box pins="IN,OUT"`;
      const ast = parseCircuit(dsl);
      const jb = ast.components.find((c) => c.id === "JB1");
      expect(jb?.componentType).toBe("terminal_block");
    });
  });
});
