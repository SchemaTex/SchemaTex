import { describe, it, expect } from "vitest";
import { labelPathPoints } from "../../src/core/label-placement";
import { parseBreadboard } from "../../src/diagrams/breadboard/parser";
import { breadboardCoordXY, breadboardPartBounds, layoutBreadboard } from "../../src/diagrams/breadboard/layout";

describe("breadboard layout", () => {
  it("keeps span terminals on their declared holes, including reversed and vertical spans", () => {
    const layout = layoutBreadboard(parseBreadboard(`breadboard
parts
  r1: resistor 220 @3c..10c
  d1: led red @12f..12e
  r2: resistor 1k @18d..14b
  pot: pot @1a
wires
  r1:2 --red-- d1:anode
`));
    const hole = (col: number, row: "b" | "c" | "d" | "e" | "f") => breadboardCoordXY(layout.substrate, { kind: "hole", col, row });
    expect(layout.parts[0]!.pins["1"]).toEqual(hole(3, "c"));
    expect(layout.parts[0]!.pins["2"]).toEqual(hole(10, "c"));
    expect(layout.parts[1]!.pins.anode).toEqual(hole(12, "f"));
    expect(layout.parts[1]!.pins.cathode).toEqual(hole(12, "e"));
    expect(layout.parts[2]!.pins["2"]).toEqual(hole(14, "b"));
    expect(layout.wires[0]!.fromXY).toEqual(hole(10, "c"));
    expect(layout.wires[0]!.toXY).toEqual(hole(12, "f"));
  });

  it("puts tactile switch legs across the trough and trimmer legs on consecutive holes", () => {
    const layout = layoutBreadboard(parseBreadboard(`breadboard
parts
  sw: button @9e
  pot: pot @18e
`));
    const hole = (col: number, row: "e" | "f") => breadboardCoordXY(layout.substrate, { kind: "hole", col, row });
    expect(layout.parts[0]!.pins["1"]).toEqual(hole(9, "e"));
    expect(layout.parts[0]!.pins["4"]).toEqual(hole(11, "f"));
    expect(layout.parts[1]!.pins["1"]).toEqual(hole(18, "e"));
    expect(layout.parts[1]!.pins["3"]).toEqual(hole(20, "e"));
  });

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

  it("keeps side modules outside the substrate and packs neighbors without overlap", () => {
    for (const side of ["beside-left", "beside-right", "above", "below"]) {
      const layout = layoutBreadboard(parseBreadboard(`breadboard
parts
  first: sensor hcsr04 @${side}
  second: display oled-ssd1306 @${side}
`));
      const boxes = [layout.substrate, ...layout.parts.map(breadboardPartBounds)];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!, b = boxes[j]!;
        expect(a.x + a.width <= b.x || b.x + b.width <= a.x ||
          a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
      }
    }
  });

  it("keeps routed wires on their pins and inside the canvas after translation", () => {
    const layout = layoutBreadboard(parseBreadboard(`breadboard "Header routing"
parts
  controller: mcu nano @above
  display: display oled-ssd1306 @beside-right
wires
  controller:5V --red-- display:VCC
  controller:GND --black-- display:GND
  controller:A4 --green-- display:SDA
  controller:A5 --white-- display:SCL
`));
    for (const wire of layout.wires) {
      const points = labelPathPoints(wire.path);
      expect(points[0]!.x).toBeCloseTo(wire.fromXY.x, 1);
      expect(points[0]!.y).toBeCloseTo(wire.fromXY.y, 1);
      expect(points.at(-1)!.x).toBeCloseTo(wire.toXY.x, 1);
      expect(points.at(-1)!.y).toBeCloseTo(wire.toXY.y, 1);
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(layout.width);
        expect(point.y).toBeLessThanOrEqual(layout.height);
        for (const part of layout.parts) {
          // Header pins are inset into a PCB; only that terminal band may be entered.
          expect(point.x > part.x + 6 && point.x < part.x + part.width - 6 &&
            point.y > part.y + 6 && point.y < part.y + part.height - 6).toBe(false);
        }
      }
    }
  });
});
