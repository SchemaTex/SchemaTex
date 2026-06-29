import { describe, expect, it } from "vitest";
import { renderFloorplan } from "../../src/diagrams/floorplan/renderer";

const count = (svg: string, needle: string | RegExp): number => {
  const re = typeof needle === "string" ? new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g") : new RegExp(needle.source, "g");
  return (svg.match(re) ?? []).length;
};

const APARTMENT = `floorplan "Two-Bedroom Apartment — 68 m²" unit m
room living  "Living Room"  at 0,0       size 5.2x4.2
room kitchen "Kitchen"      right-of living size 3.0x4.2
room hall    "Hallway"      below living  size 2.0x2.6
room bed1    "Bedroom 1"    right-of hall size 3.2x2.6
room bath    "Bathroom"     right-of bed1 size 2.0x2.6
room bed2    "Bedroom 2"    below hall    size 3.4x3.0
room closet  "WIC"          right-of bed2 size 1.8x3.0
door hall west at 50% width 1.0 swing in
opening between living hall at 50% width 1.4
opening between living kitchen at 35% width 1.2
door between hall bed1 at 50% hinge right
door between bed1 bath at 30%
door between hall bed2 at 25%
door between bed2 closet at 50%
window living north at 30% width 1.8
window kitchen north at 50% width 1.5
window bed2 south at 50% width 1.6
furniture sofa in living at 0.25,2.9
furniture coffee-table in living at 1.0,1.9
furniture rug in living at 0.9,1.5
furniture bed-double in bed1 at 0.9,0.35 size 1.5x2.0
furniture toilet in bath at 0.2,0.15
furniture sink in bath at 1.3,0.15`;

describe("floorplan e2e — semantic SVG", () => {
  it("renders the apartment with title, desc, room data attributes", () => {
    const svg = renderFloorplan(APARTMENT);
    expect(svg).toContain("<title>");
    expect(svg).toContain("Two-Bedroom Apartment");
    expect(svg).toContain("<desc>");
    expect(svg).toMatch(/7 rooms/);
    expect(svg).toMatch(/68\.8/); // total area in desc
    expect(count(svg, 'data-room="')).toBe(7);
    expect(count(svg, 'data-furniture="')).toBe(6);
    expect(svg).not.toContain("style=");
  });

  it("renders door arcs, window glazing, and dimension lines", () => {
    const svg = renderFloorplan(APARTMENT);
    expect(count(svg, 'class="sx-fp-door-arc"')).toBe(5); // 5 doors
    expect(count(svg, 'class="sx-fp-window"')).toBeGreaterThanOrEqual(3);
    expect(svg).toContain("sx-fp-dim");
    expect(svg).toContain("8.2 m");
    expect(svg).toContain("9.8 m");
    expect(svg).toContain("Living Room");
    expect(svg).toContain("21.8 m²");
  });

  it("renders the classroom: 27 desk-chair units, ft dims (spec §7 case 2)", () => {
    const svg = renderFloorplan(`floorplan "5th Grade Classroom — 27 Desks" unit ft
room class "Classroom" at 0,0 size 32x26 nolabel
door class east at 12% width 3 hinge right
window class west at 15% width 5
furniture whiteboard in class at 10,0.4 size 14x0.4
furniture desk "Teacher" in class at 2,1.5 size 5x2.5
grid desk-chair in class rows 5 cols 6 count 27 area 5,7 25,23 itemsize 2x2.5`);
    expect(count(svg, 'data-furniture="desk-chair"')).toBe(27);
    expect(svg).toContain("32&apos;");
    expect(svg).toContain("26&apos;");
    expect(svg).not.toContain('class="sx-fp-warn-item"');
  });

  it("renders the wedding: 15 tables × 8 = 120 chairs, no warnings (spec §7 case 3)", () => {
    const svg = renderFloorplan(`floorplan "Wedding Reception — 120 Guests" unit m
room hall "Grand Ballroom" at 0,0 size 24x16 nolabel
door hall south at 15% width 1.8
door hall south at 85% width 1.8
furniture head-table "Head Table" in hall at 9,0.5 size 6x1.8
furniture dance-floor "Dance Floor" in hall at 9.5,3 size 5x5
grid round-table-8 in hall rows 3 cols 2 count 6 area 2.8,4.2 7,10.9 itemsize 2.3x2.3
grid round-table-8 in hall rows 3 cols 2 count 6 area 17,4.2 21.2,10.9 itemsize 2.3x2.3
row round-table-8 in hall cols 3 area 8.8,13.4 15.2,13.4 itemsize 2.3x2.3`);
    expect(count(svg, 'data-furniture="round-table-8"')).toBe(15);
    // 15×8 chairs from the rounds + head-table's own row (one side only)
    expect(count(svg, 'class="sx-fp-chair"')).toBeGreaterThanOrEqual(120);
    expect(svg).not.toContain('class="sx-fp-warn-item"');
  });

  it("renders an error panel for the error plan (spec §7 case 4)", () => {
    const svg = renderFloorplan(`floorplan "Errors"
room a "A" at 0,0 size 4x3
room b "B" at 2,1 size 3x3
room c "C" at 10,0 size 3x3
door between a c at 50%
furniture sofa in c at 2.5,0.5`);
    expect(svg).toContain("sx-fp-error");
    expect(count(svg, 'class="sx-fp-error-line"')).toBe(3);
    expect(svg).toContain("overlap");
  });

  it("minimal smoke: 1 room + door + window (spec §7 case 5)", () => {
    const svg = renderFloorplan(`floorplan "Studio"
room main "Studio" at 0,0 size 4x3
door main south at 20%
window main north at 50%`);
    expect(svg).toMatch(/1 room, 12\.0 m²/);
    expect(count(svg, 'class="sx-fp-door-arc"')).toBe(1);
  });

  it("renders an electrical fittings overlay without collision warnings", () => {
    const svg = renderFloorplan(`floorplan "Kitchen Electrical Plan" unit m
room kitchen "Kitchen" at 0,0 size 4x3
furniture counter in kitchen at 0.2,0.2 size 3.4x0.6
furniture duplex-outlet in kitchen at 0.4,0.1
furniture switch in kitchen at 3.5,1.2
furniture ceiling-light in kitchen at 2,1.5
furniture distribution-board in kitchen at 3.2,0.1`);
    expect(svg).toContain('data-furniture="duplex-outlet"');
    expect(svg).toContain('data-furniture="switch"');
    expect(svg).toContain('data-furniture="distribution-board"');
    expect(svg).not.toContain('class="sx-fp-warn-item"');
  });

  it("themes: monochrome and dark resolve without inline styles", () => {
    for (const theme of ["default", "monochrome", "dark"]) {
      const svg = renderFloorplan(APARTMENT, {
        fontFamily: "sans-serif",
        fontSize: 12,
        theme,
        padding: 0,
      });
      expect(svg).toContain("<svg");
      expect(svg).not.toContain("style=");
    }
  });
});
