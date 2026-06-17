import { describe, expect, it } from "vitest";
import { parseFloorplan, FloorplanParseError } from "../../src/diagrams/floorplan/parser";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import { renderFloorplan } from "../../src/diagrams/floorplan/renderer";
import { FURNITURE_TYPES } from "../../src/diagrams/floorplan/catalog";

const head = `floorplan "Seating" unit m\nroom hall "Hall" at 0,0 size 12x10\n`;

describe("floorplan — per-seat names (§2.5)", () => {
  it("parses `seats` into an ordered name list", () => {
    const ast = parseFloorplan(`${head}furniture round-table-8 "T1" in hall at 2,2 seats "Alice" "Bob" "Carol"`);
    const f = ast.furniture[0]!;
    expect(f.label).toBe("T1");
    expect(f.seats).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("accepts CJK quotes around seat names (house rule)", () => {
    const ast = parseFloorplan(`${head}furniture round-table-8 in hall at 2,2 seats “张伟” “李娜”`);
    expect(ast.furniture[0]!.seats).toEqual(["张伟", "李娜"]);
  });

  it("rejects an empty `seats` clause with an AI-readable message", () => {
    expect(() => parseFloorplan(`${head}furniture round-table-8 in hall at 2,2 seats`)).toThrow(FloorplanParseError);
    expect(() => parseFloorplan(`${head}furniture round-table-8 in hall at 2,2 seats`)).toThrow(/one or more quoted names/);
  });

  it("carries seats through layout into ItemGeom", () => {
    const lay = layoutFloorplan(parseFloorplan(`${head}furniture round-table-8 in hall at 2,2 seats "Alice" "Bob"`));
    const t = lay.items.find((i) => i.type === "round-table-8")!;
    expect(t.seats).toEqual(["Alice", "Bob"]);
  });

  it("renders each name once, with the seat-name class", () => {
    const svg = renderFloorplan(`${head}furniture round-table-8 in hall at 2,2 seats "Alice" "Bob" "Carol"`);
    expect(svg).toContain("sx-fp-seat-name");
    for (const name of ["Alice", "Bob", "Carol"]) {
      expect(svg.split(name).length - 1).toBe(1);
    }
  });

  it("names rectangular (banquet) tables too — top row then bottom row", () => {
    const svg = renderFloorplan(`${head}furniture banquet-table in hall at 2,2 size 2.4x0.8 seats "A" "B" "C" "D" "E" "F"`);
    expect(svg).toContain("sx-fp-seat-name");
    expect(svg).toContain(">A</text>");
    expect(svg).toContain(">F</text>");
  });

  it("extra chairs without names render no stray text; tables without seats are unchanged", () => {
    const named = renderFloorplan(`${head}furniture round-table-8 in hall at 2,2 seats "Solo"`);
    // count the class *attribute* (the CSS rule mentions the class once too)
    expect(named.split('class="sx-fp-seat-name"').length - 1).toBe(1); // one named seat only
    const plain = renderFloorplan(`${head}furniture round-table-8 in hall at 2,2`);
    expect(plain).not.toContain('class="sx-fp-seat-name"');
  });

  it("a named seating chart renders with zero errors and zero collision warnings", () => {
    const lay = layoutFloorplan(
      parseFloorplan(
        `${head}furniture round-table-8 "Table 1" in hall at 2,2 seats "Alice" "Bob" "Carol" "Dan"\n` +
          `furniture round-table-8 "Table 2" in hall at 7,2 seats "Eve" "Frank"`
      )
    );
    expect(lay.errors).toEqual([]);
    expect(lay.warnings).toEqual([]);
  });
});

describe("floorplan — restaurant & commercial-kitchen catalog", () => {
  const NEW = ["booth", "prep-table", "range", "walk-in", "commercial-sink", "fryer"] as const;

  it("registers all new furniture types", () => {
    for (const t of NEW) expect(FURNITURE_TYPES).toContain(t);
  });

  it("each new type parses and renders into a tagged group", () => {
    for (const t of NEW) {
      const svg = renderFloorplan(`${head}furniture ${t} in hall at 1,1`);
      expect(svg).toContain(`data-furniture="${t}"`);
    }
  });

  it("walk-in renders its label glyph; range draws six burners", () => {
    expect(renderFloorplan(`${head}furniture walk-in in hall at 1,1`)).toContain("WALK-IN");
    const range = renderFloorplan(`${head}furniture range in hall at 1,1`);
    // 6 burner circles (cooktop) — count <circle in the range item group is ≥6
    expect((range.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });
});
