import { describe, expect, it } from "vitest";
import { parseFloorplan, FloorplanParseError } from "../../src/diagrams/floorplan/parser";
import { floorplan } from "../../src/diagrams/floorplan";

describe("floorplan parser — header & detect", () => {
  it("parses title and unit", () => {
    const ast = parseFloorplan(`floorplan "Two-Bedroom Apartment" unit m\nroom a "A" at 0,0 size 4x3`);
    expect(ast.title).toBe("Two-Bedroom Apartment");
    expect(ast.unit).toBe("m");
  });

  it("defaults: unit m, title fallback", () => {
    const ast = parseFloorplan(`floorplan\nroom a at 0,0 size 4x3`);
    expect(ast.unit).toBe("m");
    expect(ast.title.length).toBeGreaterThan(0);
  });

  it("accepts unit ft", () => {
    const ast = parseFloorplan(`floorplan "Class" unit ft\nroom c at 0,0 size 32x26`);
    expect(ast.unit).toBe("ft");
  });

  it("detect() matches the floorplan keyword, skipping comments", () => {
    expect(floorplan.detect(`# comment\nfloorplan "X"\nroom a at 0,0 size 2x2`)).toBe(true);
    expect(floorplan.detect(`network "X"`)).toBe(false);
  });

  it("accepts CJK quotes (house rule)", () => {
    const ast = parseFloorplan(`floorplan “两室一厅” unit m\nroom a “客厅” at 0,0 size 5x4`);
    expect(ast.title).toBe("两室一厅");
    expect(ast.rooms[0]!.label).toBe("客厅");
  });

  it("strips # comments", () => {
    const ast = parseFloorplan(`floorplan "T" # trailing\n# full line\nroom a at 0,0 size 4x3 # tail`);
    expect(ast.rooms).toHaveLength(1);
  });
});

describe("floorplan parser — rooms", () => {
  it("parses absolute placement, size, fill, nolabel", () => {
    const ast = parseFloorplan(`floorplan
room hall "Grand Ballroom" at 0,0 size 24x16 fill #f8fafc nolabel`);
    const r = ast.rooms[0]!;
    expect(r.id).toBe("hall");
    expect(r.label).toBe("Grand Ballroom");
    expect(r.at).toEqual({ x: 0, y: 0 });
    expect(r.w).toBe(24);
    expect(r.h).toBe(16);
    expect(r.fill).toBe("#f8fafc");
    expect(r.nolabel).toBe(true);
  });

  it("parses relative placement with offset and align", () => {
    const ast = parseFloorplan(`floorplan
room a at 0,0 size 4x3
room b right-of a size 3x3
room c below a offset 1 size 2x2
room d right-of a align end size 2x2`);
    expect(ast.rooms[1]!.rel).toEqual({ how: "right-of", ref: "a", offset: undefined, align: undefined });
    expect(ast.rooms[2]!.rel?.offset).toBe(1);
    expect(ast.rooms[3]!.rel?.align).toBe("end");
  });

  it("rejects duplicate room ids", () => {
    expect(() =>
      parseFloorplan(`floorplan\nroom a at 0,0 size 2x2\nroom a at 4,0 size 2x2`)
    ).toThrow(FloorplanParseError);
  });

  it("label defaults to id", () => {
    const ast = parseFloorplan(`floorplan\nroom kitchen at 0,0 size 3x3`);
    expect(ast.rooms[0]!.label).toBe("kitchen");
  });
});

describe("floorplan parser — openings", () => {
  it("parses wall-side door with all options", () => {
    const ast = parseFloorplan(`floorplan
room a at 0,0 size 4x3
door a west at 50% width 1.0 hinge right swing out type double`);
    const d = ast.openings[0]!;
    expect(d.kind).toBe("door");
    expect(d.room).toBe("a");
    expect(d.side).toBe("west");
    expect(d.pct).toBe(50);
    expect(d.width).toBe(1.0);
    expect(d.hinge).toBe("right");
    expect(d.swing).toBe("out");
    expect(d.doorType).toBe("double");
  });

  it("parses door between two rooms; pct works with or without %", () => {
    const ast = parseFloorplan(`floorplan
room a at 0,0 size 4x3
room b right-of a size 3x3
door between a b at 30
opening between a b at 70%`);
    expect(ast.openings[0]!.between).toEqual(["a", "b"]);
    expect(ast.openings[0]!.pct).toBe(30);
    expect(ast.openings[1]!.kind).toBe("opening");
    expect(ast.openings[1]!.pct).toBe(70);
  });

  it("defaults: interior (between) door 0.8, exterior (side) door 0.9, window 1.2", () => {
    const ast = parseFloorplan(`floorplan
room a at 0,0 size 4x3
room b right-of a size 3x3
door a west at 50%
door between a b at 50%
window a north at 50%`);
    expect(ast.openings[0]!.width).toBe(0.9);
    expect(ast.openings[1]!.width).toBe(0.8);
    expect(ast.openings[2]!.width).toBe(1.2);
  });

  it("rejects a bad wall side", () => {
    expect(() =>
      parseFloorplan(`floorplan\nroom a at 0,0 size 4x3\ndoor a up at 50%`)
    ).toThrow(/north|south|east|west/);
  });
});

describe("floorplan parser — furniture & arrays", () => {
  it("parses optional furniture instance ids without consuming keywords or quoted labels", () => {
    const ast = parseFloorplan(`floorplan
room living at 0,0 size 6x4
furniture sofa in living at 0,0
furniture stairs S1 in living at 2,0
furniture sofa "Couch" in living at 0,2`);
    expect(ast.furniture[0]!.instanceId).toBeUndefined();
    expect(ast.furniture[1]!.instanceId).toBe("S1");
    expect(ast.furniture[2]!.instanceId).toBeUndefined();
    expect(ast.furniture[2]!.label).toBe("Couch");
  });

  it("parses furniture with in/at/size/rotate/label", () => {
    const ast = parseFloorplan(`floorplan
room class at 0,0 size 32x26
furniture desk "Teacher" in class at 2,1.5 size 5x2.5 rotate 20`);
    const f = ast.furniture[0]!;
    expect(f.type).toBe("desk");
    expect(f.room).toBe("class");
    expect(f.x).toBe(2);
    expect(f.y).toBe(1.5);
    expect(f.size).toEqual({ w: 5, h: 2.5 });
    expect(f.rotate).toBe(20);
    expect(f.label).toBe("Teacher");
  });

  it("rejects unknown furniture types and lists valid ones", () => {
    expect(() =>
      parseFloorplan(`floorplan\nroom a at 0,0 size 4x3\nfurniture jacuzzi in a at 1,1`)
    ).toThrow(/jacuzzi.*(sofa|bed-double)/s);
  });

  it("normalizes seating and electrical overlay aliases", () => {
    const ast = parseFloorplan(`floorplan
room kitchen at 0,0 size 4x3
furniture section in kitchen at 0.5,0.5
furniture socket in kitchen at 0.2,0.2
furniture consumer-unit in kitchen at 3.2,0.1 size 0.5
`);
    expect(ast.furniture.map((f) => f.type)).toEqual([
      "sectional",
      "outlet",
      "distribution-board",
    ]);
    expect(ast.furniture[2]!.size).toEqual({ w: 0.5, h: 0.5 });
  });

  it("normalizes common everyday furniture synonyms", () => {
    const ast = parseFloorplan(`floorplan
room living at 0,0 size 6x4
furniture console-table "Console" in living at 0.2,0.2 size 1.2x0.4
furniture couch in living at 1,2
furniture refrigerator in living at 5,0.2
furniture tv-console in living at 0.2,3`);
    expect(ast.furniture.map((f) => f.type)).toEqual([
      "side-table",
      "sofa",
      "fridge",
      "tv-stand",
    ]);
  });

  it("parses grid array with rows/cols/count/area/itemsize", () => {
    const ast = parseFloorplan(`floorplan
room class at 0,0 size 32x26
grid desk-chair in class rows 5 cols 6 count 27 area 5,7 25,23 itemsize 2x2.5`);
    const a = ast.arrays[0]!;
    expect(a.mode).toBe("grid");
    expect(a.type).toBe("desk-chair");
    expect(a.rows).toBe(5);
    expect(a.cols).toBe(6);
    expect(a.count).toBe(27);
    expect(a.p1).toEqual({ x: 5, y: 7 });
    expect(a.p2).toEqual({ x: 25, y: 23 });
    expect(a.itemsize).toEqual({ w: 2, h: 2.5 });
  });

  it("parses row and arc arrays", () => {
    const ast = parseFloorplan(`floorplan
room hall at 0,0 size 24x16
row round-table-8 in hall cols 3 area 8.8,13.4 15.2,13.4
arc chair in hall count 13 center 12,8 radius 5 from 200 to 340`);
    expect(ast.arrays[0]!.mode).toBe("row");
    expect(ast.arrays[0]!.cols).toBe(3);
    const arc = ast.arrays[1]!;
    expect(arc.mode).toBe("arc");
    expect(arc.count).toBe(13);
    expect(arc.center).toEqual({ x: 12, y: 8 });
    expect(arc.radius).toBe(5);
    expect(arc.fromDeg).toBe(200);
    expect(arc.toDeg).toBe(340);
  });

  it("rejects unknown keywords with the expected-keyword list", () => {
    expect(() =>
      parseFloorplan(`floorplan\nroom a at 0,0 size 4x3\nwall a north`)
    ).toThrow(
      /room, stage, extend, door, window, opening, furniture, equipment, monitor, signal, input-list, grid, row, arc/
    );
  });

  it("parses window types, bifold doors, and the north statement", () => {
    const ast = parseFloorplan(`floorplan
north 30
room a at 0,0 size 6x4
room b right-of a size 4x4
window a north at 25% type sliding
window a north at 75% width 2 type bay
window a west at 50% type casement
door between a b at 50% type bifold width 1.2`);
    expect(ast.north).toBe(30);
    expect(ast.openings[0]!.windowType).toBe("sliding");
    expect(ast.openings[1]!.windowType).toBe("bay");
    expect(ast.openings[2]!.windowType).toBe("casement");
    expect(ast.openings[3]!.doorType).toBe("bifold");
  });

  it("parses extend with absolute and relative placement", () => {
    const ast = parseFloorplan(`floorplan
room living at 0,0 size 5x4
extend living at 5,2 size 2x2
extend living below living size 3x1.5`);
    expect(ast.extensions).toHaveLength(2);
    expect(ast.extensions[0]!.room).toBe("living");
    expect(ast.extensions[0]!.at).toEqual({ x: 5, y: 2 });
    expect(ast.extensions[1]!.rel?.how).toBe("below");
  });
});
