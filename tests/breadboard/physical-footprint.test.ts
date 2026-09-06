import { describe, expect, it } from "vitest";
import { parseBreadboard } from "../../src/diagrams/breadboard/parser";
import { breadboardCoordXY, layoutBreadboard } from "../../src/diagrams/breadboard/layout";
import { partSpec } from "../../src/diagrams/breadboard/parts";

describe("DIP physical footprint", () => {
  it.each(["@5e..9e", "@9e..5e", "@10e..10f", "@5b..8d"])("honors both endpoints of a two-terminal span %s", span => {
    const ast = parseBreadboard(`breadboard\nparts\n  r: resistor 220 ${span}`);
    const layout = layoutBreadboard(ast), placement = ast.parts[0]!.placement;
    if (placement.kind !== "span") throw Error("Expected span");
    expect(layout.parts[0]!.pins["1"]).toEqual(breadboardCoordXY(layout.substrate, placement.from));
    expect(layout.parts[0]!.pins["2"]).toEqual(breadboardCoordXY(layout.substrate, placement.to));
  });
  it("keeps title, pin aliases and wires aligned after canvas translation", () => {
    const layout = layoutBreadboard(parseBreadboard(`breadboard\ntitle: "Physical pins"\nparts\n  u: dip pins=8 @15e\nwires\n  u:8 --red-- @+t15\n  u:1 --yellow-- @15j`));
    const expected = breadboardCoordXY(layout.substrate, { kind: "hole", col: 15, row: "f" });
    expect(layout.parts[0]!.pins["1"]).toEqual(expected);
    expect(layout.wires[1]!.fromXY).toEqual(expected);
    expect(layout.substrate.y).toBeGreaterThan(30);
  });
  it.each([8, 14, 16, 28])("lands all %i pins on e/f holes, counterclockwise from the left notch", pins => {
    const layout = layoutBreadboard(parseBreadboard(`breadboard\nboard: half\nparts\n  u: dip pins=${pins} @5e`));
    const part = layout.parts[0]!;
    const hole = (col: number, row: "e" | "f") => breadboardCoordXY(layout.substrate, { kind: "hole", col, row });
    expect(hole(5, "f").y - hole(5, "e").y).toBe(3 * layout.substrate.pitch);
    expect(layout.substrate.troughY).toBe((hole(5, "e").y + hole(5, "f").y) / 2);
    for (let i = 0; i < pins / 2; i++) {
      expect(part.pins[String(i + 1)]).toEqual(hole(5 + i, "f"));
      expect(part.pins[String(pins - i)]).toEqual(hole(5 + i, "e"));
    }
  });
  it.each([3, 7, 8.5, Infinity, NaN])("rejects invalid pin count %s", pins => {
    expect(() => partSpec("dip", { pins })).toThrow(/even/);
  });
});
