import { describe, it, expect } from "vitest";
import { parseBreadboard } from "../../src/diagrams/breadboard/parser";
import { layoutBreadboard } from "../../src/diagrams/breadboard/layout";

describe("breadboard layout", () => {
  it("places MCU to the left of substrate", () => {
    const ast = parseBreadboard(`breadboard
parts
  uno: mcu uno @beside-left
  r1: resistor 220 @5e..9e
`);
    const layout = layoutBreadboard(ast);
    const uno = layout.parts.find((p) => p.part.id === "uno")!;
    const r1 = layout.parts.find((p) => p.part.id === "r1")!;
    expect(uno.x).toBeLessThan(layout.substrate.x);
    expect(r1.x).toBeGreaterThan(layout.substrate.x);
  });

  it("resolves pin coordinates to canvas pixels", () => {
    const ast = parseBreadboard(`breadboard
parts
  uno: mcu uno @beside-left
`);
    const layout = layoutBreadboard(ast);
    const uno = layout.parts.find((p) => p.part.id === "uno")!;
    expect(uno.pins["5V"]).toBeDefined();
    expect(uno.pins["GND"]).toBeDefined();
    expect(typeof uno.pins["5V"]!.x).toBe("number");
  });

  it("normalizes ESP32 and module pin aliases", () => {
    const ast = parseBreadboard(`breadboard
parts
  esp: mcu esp32 @beside-left
  pot: pot @8a
wires
  esp:D22 --green-- @8a
  esp:5V --red-- @+t1
  pot:3 --yellow-- @9a
`);
    const layout = layoutBreadboard(ast);
    const esp = layout.parts.find((p) => p.part.id === "esp")!;
    expect(esp.pins["D22"]).toEqual(esp.pins["GPIO22"]);
    expect(esp.pins["5V"]).toEqual(esp.pins["VIN"]);
    expect(layout.wires).toHaveLength(3);
  });

  it("emits a wire path that's a Bézier (contains C)", () => {
    const ast = parseBreadboard(`breadboard
parts
  uno: mcu uno @beside-left
wires
  uno:5V --red-- @+t1
`);
    const layout = layoutBreadboard(ast);
    expect(layout.wires).toHaveLength(1);
    expect(layout.wires[0]!.path).toMatch(/M [\d.]+ [\d.]+ C/);
  });

  it("returns positive width and height", () => {
    const ast = parseBreadboard(`breadboard
parts
  uno: mcu uno @beside-left
  r1: resistor 220 @5e..9e
  d1: led red @10e..10f
`);
    const layout = layoutBreadboard(ast);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });
});
