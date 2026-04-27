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
});
