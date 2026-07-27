import { describe, expect, it } from "vitest";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import { parseFloorplan, FloorplanParseError } from "../../src/diagrams/floorplan/parser";
import { renderFloorplan } from "../../src/diagrams/floorplan/renderer";

const TWO_FLOORS = `floorplan "Two-storey villa" unit m
floor 1 "Ground Floor"
room living "Living" at 0,0 size 6x4
room stair "Stair" right-of living size 3x4
door between living stair at 50%
furniture stairs S1 in stair at 0.3,0.3 size 2.4x3.4
floor 2 "First Floor"
room family "Family" at 0,0 size 6x4
room stair "Stair" right-of family size 3x4
door between family stair at 50%
furniture stairs S1 in stair at 0.3,0.3 size 2.4x3.4`;

describe("floorplan multi-floor — parser", () => {
  it("parses floor sections and assigns every statement to its floor", () => {
    const ast = parseFloorplan(TWO_FLOORS);
    expect(ast.floors).toEqual([
      { level: 1, label: "Ground Floor", line: 2 },
      { level: 2, label: "First Floor", line: 7 },
    ]);
    expect(ast.rooms.filter((room) => room.floor === 1)).toHaveLength(2);
    expect(ast.rooms.filter((room) => room.floor === 2)).toHaveLength(2);
    expect(ast.furniture.map((item) => item.instanceId)).toEqual(["S1", "S1"]);
  });

  it("allows the same room id on different floors", () => {
    const ast = parseFloorplan(`floorplan
floor 1
room bath at 0,0 size 3x2
floor 2
room bath at 0,0 size 3x2`);
    expect(ast.rooms.map((room) => [room.id, room.floor])).toEqual([
      ["bath", 1],
      ["bath", 2],
    ]);
  });

  it("rejects duplicate floor numbers", () => {
    expect(() => parseFloorplan(`floorplan
floor 2
room a at 0,0 size 2x2
floor 2
room b at 0,0 size 2x2`)).toThrow(FloorplanParseError);
  });

  it("accepts negative floors and supplies the canonical label", () => {
    const ast = parseFloorplan(`floorplan
floor -1
room plant at 0,0 size 2x2
floor 1
room lobby at 0,0 size 2x2`);
    expect(ast.floors[0]!.label).toBe("Basement 1");
    const lay = layoutFloorplan(ast);
    expect(lay.plates.map((plate) => plate.level)).toEqual([-1, 1]);
  });
});

describe("floorplan multi-floor — layout", () => {
  it("packs horizontal plates with a 1.5 m gutter", () => {
    const lay = layoutFloorplan(parseFloorplan(TWO_FLOORS));
    expect(lay.errors).toEqual([]);
    expect(lay.plates.map((plate) => plate.level)).toEqual([1, 2]);
    const first = lay.plates[0]!;
    const second = lay.plates[1]!;
    expect(first.offset).toEqual({ x: 0, y: 0 });
    expect(second.offset.x).toBeCloseTo(first.bounds.maxX - first.bounds.minX + 1.5, 6);
    expect(second.offset.y).toBe(0);
  });

  it("packs vertical plates with the upper floor first", () => {
    const lay = layoutFloorplan(parseFloorplan(TWO_FLOORS.replace("unit m", "unit m stack vertical")));
    expect(lay.plates.map((plate) => plate.level)).toEqual([2, 1]);
    expect(lay.plates[0]!.offset).toEqual({ x: 0, y: 0 });
    expect(lay.plates[1]!.offset.y).toBeCloseTo(
      lay.plates[0]!.bounds.maxY - lay.plates[0]!.bounds.minY + 1.5,
      6
    );
  });

  it("registers a shared stair id and derives UP/DN without overriding an explicit label", () => {
    const lay = layoutFloorplan(parseFloorplan(TWO_FLOORS));
    const stairs = lay.items.filter((item) => item.instanceId === "S1");
    expect(stairs.map((item) => [item.floor, item.label])).toEqual([
      [1, "UP"],
      [2, "DN"],
    ]);

    const explicit = layoutFloorplan(parseFloorplan(TWO_FLOORS.replace(
      "furniture stairs S1 in stair at 0.3,0.3 size 2.4x3.4",
      'furniture stairs S1 in stair at 0.3,0.3 size 2.4x3.4 "KEEP"'
    )));
    expect(explicit.items.find((item) => item.floor === 1 && item.instanceId === "S1")!.label).toBe("KEEP");
  });

  it("warns once when registered stairs are misaligned by 0.50 m", () => {
    const shifted = TWO_FLOORS.replace(
      "furniture stairs S1 in stair at 0.3,0.3 size 2.4x3.4",
      "furniture stairs S1 in stair at 0.8,0.3 size 2.0x3.4"
    );
    const lay = layoutFloorplan(parseFloorplan(shifted));
    const stairWarnings = lay.warnings.filter((warning) => warning.startsWith('stairs "S1"'));
    expect(stairWarnings).toHaveLength(1);
    expect(stairWarnings[0]).toContain("floor 1");
    expect(stairWarnings[0]).toContain("floor 2");
    expect(stairWarnings[0]).toContain("0.50 m");
  });

  it("does not warn when registered stairs differ by only 0.05 m", () => {
    const shifted = TWO_FLOORS.replace(
      "furniture stairs S1 in stair at 0.3,0.3 size 2.4x3.4",
      "furniture stairs S1 in stair at 0.35,0.3 size 2.35x3.4"
    );
    const lay = layoutFloorplan(parseFloorplan(shifted));
    expect(lay.warnings.filter((warning) => warning.startsWith('stairs "S1"'))).toHaveLength(0);
  });

  it("reports a cross-floor door with both floor numbers", () => {
    const lay = layoutFloorplan(parseFloorplan(`floorplan
floor 1
room kitchen at 0,0 size 4x3
floor 2
room bed2 at 0,0 size 4x3
door between kitchen bed2 at 50%`));
    expect(lay.errors).toEqual([
      'door between "kitchen" (floor 1) and "bed2" (floor 2): rooms are on different floors',
    ]);
  });
});

describe("floorplan multi-floor — renderer compatibility", () => {
  it("uses one shared px-per-meter scale for equal-size rooms on both plates", () => {
    const svg = renderFloorplan(TWO_FLOORS);
    expect((svg.match(/data-floor="/g) ?? [])).toHaveLength(2);
    expect((svg.match(/width="330"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("renders floor labels and a multi-floor description", () => {
    const svg = renderFloorplan(TWO_FLOORS);
    expect(svg).toContain('class="sx-fp-floor-label"');
    expect(svg).toContain("Ground Floor");
    expect(svg).toContain("First Floor");
    expect(svg).toMatch(/2 floors, 4 rooms/);
  });

  it("keeps the legacy single-floor SVG free of plate wrappers", () => {
    const svg = renderFloorplan(`floorplan "Studio"
room main "Studio" at 0,0 size 4x3`);
    expect(svg).not.toContain("data-floor");
    expect(svg).not.toContain("sx-fp-plate");
  });
});
