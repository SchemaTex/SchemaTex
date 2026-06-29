import { describe, it, expect } from "vitest";
import { parseBreadboard, BreadboardParseError } from "../../src/diagrams/breadboard/parser";

describe("breadboard parser", () => {
  it("parses minimal header + parts + wires", () => {
    const ast = parseBreadboard(`breadboard
board: half
title: "T"

parts
  uno: mcu uno @beside-left
  r1: resistor 220 @5e..9e

wires
  uno:5V --red-- @+t1
`);
    expect(ast.type).toBe("breadboard");
    expect(ast.board).toBe("half");
    expect(ast.title).toBe("T");
    expect(ast.parts).toHaveLength(2);
    expect(ast.parts[0]!.kind).toBe("mcu-uno");
    expect(ast.parts[1]!.kind).toBe("resistor");
    expect(ast.parts[1]!.args.value).toBe(220);
    expect(ast.parts[1]!.args.cols).toBe(4);
    expect(ast.wires).toHaveLength(1);
    expect(ast.wires[0]!.color).toBe("red");
  });

  it("parses LED with bare color arg", () => {
    const ast = parseBreadboard(`breadboard
parts
  d1: led red @10e..10f
`);
    expect(ast.parts[0]!.args.color).toBe("red");
  });

  it("parses common maker modules from user prompts", () => {
    const ast = parseBreadboard(`breadboard
parts
  esp: mcu esp32-s3 @beside-left
  pot: potentiometer @5a
  tof: sensor vl53l0x @10a
  tm: display tm1637 @15a
  drv: module l298n @20a
`);
    expect(ast.parts.map((p) => p.kind)).toEqual([
      "mcu-esp32",
      "potentiometer",
      "sensor-vl53l0x",
      "display-tm1637",
      "module-l298n",
    ]);
  });

  it("rejects unknown part kind", () => {
    expect(() => parseBreadboard(`breadboard
parts
  x: bogus @5e
`)).toThrow(BreadboardParseError);
  });

  it("rejects unknown wire color", () => {
    expect(() => parseBreadboard(`breadboard
parts
  r1: resistor 220 @5e..9e
wires
  @5e --rainbow-- @9e
`)).toThrow(/Unknown wire color/);
  });

  it("rejects rail coords on mini board", () => {
    expect(() => parseBreadboard(`breadboard
board: mini
parts
  r1: resistor 220 @5e..9e
wires
  @5e --red-- @+t1
`)).toThrow(/Mini boards have no power rails/);
  });

  it("parses Mermaid-style hole + rail coords", () => {
    const ast = parseBreadboard(`breadboard
parts
  uno: mcu uno @beside-left
wires
  uno:5V --red-- @+t14
  uno:GND --black-- @-b14
  @5e --green-- @8j
`);
    expect(ast.wires).toHaveLength(3);
    const w1 = ast.wires[0]!;
    if (w1.to.kind === "coord" && w1.to.at.kind === "rail") {
      expect(w1.to.at.rail).toBe("+t");
      expect(w1.to.at.col).toBe(14);
    } else throw new Error("expected rail coord");
  });

  it("rejects wire to unknown part", () => {
    expect(() => parseBreadboard(`breadboard
parts
  uno: mcu uno @beside-left
wires
  ghost:5V --red-- @+t1
`)).toThrow(/unknown part 'ghost'/);
  });
});
