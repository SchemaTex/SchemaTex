import { describe, expect, it } from "vitest";
import { parseFloorplan } from "../../src/diagrams/floorplan/parser";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import type { FloorplanLayoutResult } from "../../src/diagrams/floorplan/types";

function lay(src: string): FloorplanLayoutResult {
  return layoutFloorplan(parseFloorplan(src));
}

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
window bed2 south at 50% width 1.6`;

describe("floorplan layout — room placement", () => {
  it("resolves relative placement chains to absolute meters", () => {
    const r = lay(APARTMENT);
    const at = (id: string) => {
      const room = r.rooms.find((x) => x.id === id)!;
      return [room.x, room.y, room.w, room.h];
    };
    expect(at("living")).toEqual([0, 0, 5.2, 4.2]);
    expect(at("kitchen")).toEqual([5.2, 0, 3.0, 4.2]);
    expect(at("hall")).toEqual([0, 4.2, 2.0, 2.6]);
    expect(at("bed1")).toEqual([2.0, 4.2, 3.2, 2.6]);
    expect(at("bath")).toEqual([5.2, 4.2, 2.0, 2.6]);
    expect(at("bed2")).toEqual([0, 6.8, 3.4, 3.0]);
    expect(at("closet")).toEqual([3.4, 6.8, 1.8, 3.0]);
    expect(r.bounds).toEqual({ minX: 0, minY: 0, maxX: 8.2, maxY: 9.8 });
  });

  it("aligns relative rooms: start (default) / center / end", () => {
    const r = lay(`floorplan
room a at 0,0 size 4x4
room b right-of a size 2x2
room c right-of b align center size 2x4
room d below a align end size 2x2`);
    expect(r.rooms[1]!.y).toBe(0); // start
    expect(r.rooms[2]!.y).toBe(-1); // center of b (h=2) vs c (h=4)
    expect(r.rooms[3]!.x).toBe(2); // end: right edges flush
  });

  it("computes areas and total (m²: 1 decimal)", () => {
    const r = lay(APARTMENT);
    expect(r.totalAreaM2).toBeCloseTo(68.76, 2);
    const living = r.rooms.find((x) => x.id === "living")!;
    expect(living.areaText).toBe("21.8 m²");
  });

  it("converts ft plans to meters and formats areas in sq ft", () => {
    const r = lay(`floorplan "Class" unit ft\nroom c "Classroom" at 0,0 size 32x26`);
    const c = r.rooms[0]!;
    expect(c.w).toBeCloseTo(32 * 0.3048, 4);
    expect(c.h).toBeCloseTo(26 * 0.3048, 4);
    expect(c.areaText).toBe("832 sq ft");
  });

  it("reports an error for unknown relative reference", () => {
    const r = lay(`floorplan\nroom b right-of nope size 2x2`);
    expect(r.errors.some((e) => e.includes("nope"))).toBe(true);
  });
});

describe("floorplan layout — extend (L/T/U rooms)", () => {
  const L_ROOM = `floorplan "L-Shape"
room living "Living Room" at 0,0 size 5x4
extend living at 5,2 size 2x2
room kitchen "Kitchen" at 5,4 size 2x2`;

  it("unions extension parts: bbox, single summed area, interior seam", () => {
    const r = lay(L_ROOM);
    const living = r.rooms.find((x) => x.id === "living")!;
    expect(living.parts).toHaveLength(2);
    expect([living.x, living.y, living.w, living.h]).toEqual([0, 0, 7, 4]);
    expect(living.areaM2).toBeCloseTo(5 * 4 + 2 * 2, 6);
    expect(living.areaText).toBe("24.0 m²");
    // one interior seam on the shared edge x=5, y 2..4
    expect(r.seams).toHaveLength(1);
    expect(r.seams[0]).toMatchObject({ vertical: true, along: 5, lo: 2, hi: 4 });
    expect(r.errors).toHaveLength(0);
  });

  it("rejects a detached extension and an overlapping extension", () => {
    const detached = lay(`floorplan\nroom a at 0,0 size 4x3\nextend a at 6,0 size 2x2`);
    expect(detached.errors.some((e) => e.includes("does not touch"))).toBe(true);
    const overlapping = lay(`floorplan\nroom a at 0,0 size 4x3\nextend a at 2,1 size 2x2`);
    expect(overlapping.errors.some((e) => e.includes("overlaps"))).toBe(true);
  });

  it("doors between an extension part and a neighbor resolve on the part's wall", () => {
    const r = lay(`${L_ROOM}\ndoor between living kitchen at 50%`);
    // kitchen at 5,4 only touches the extension part: edge y=4, x 5..7
    const d = r.openings[0]!;
    expect(d.vertical).toBe(false);
    expect(d.along).toBe(4);
    expect(d.lo).toBeGreaterThanOrEqual(5);
    expect(d.hi).toBeLessThanOrEqual(7);
    expect(r.errors).toHaveLength(0);
  });

  it("side openings on an L-room land on real exterior segments only", () => {
    // living's east side: main part edge at x=5 is covered y 2..4 by the
    // extension → exterior segments are x=5 (y 0..2) and x=7 (y 2..4)
    const r = lay(`${L_ROOM.replace('room kitchen "Kitchen" at 5,0 size 2x2', "")}\nwindow living east at 20% width 1`);
    const w = r.openings[0]!;
    expect(w.vertical).toBe(true);
    expect(w.along).toBe(5);
    expect(w.hi).toBeLessThanOrEqual(2);
  });

  it("furniture in the notch warns; furniture on a part is fine", () => {
    const bad = lay(`${L_ROOM}\nfurniture sofa in living at 4.6,0.2`); // sofa 2.2 wide → straddles into the notch (x 4.6..6.8, y<2)
    expect(bad.errors).toHaveLength(0);
    expect(bad.warnings.some((warning) => warning.includes("L-shape"))).toBe(true);
    const ok = lay(`${L_ROOM}\nfurniture sofa in living at 0.2,0.2`);
    expect(ok.errors).toHaveLength(0);
    expect(ok.warnings).toHaveLength(0);
  });
});

describe("floorplan layout — stairs & north", () => {
  it("places stairs symbols and passes north through", () => {
    const r = lay(`floorplan
north 15
room hall at 0,0 size 6x5
furniture stairs in hall at 0.3,0.5
furniture spiral-stairs in hall at 4,3`);
    expect(r.north).toBe(15);
    expect(r.items.map((i) => i.type)).toEqual(["stairs", "spiral-stairs"]);
    expect(r.errors).toHaveLength(0);
  });
});

describe("floorplan layout — openings", () => {
  it("resolves `between` doors onto the shared wall overlap", () => {
    const r = lay(APARTMENT);
    // door between bed1 and bath: vertical wall at x=5.2, overlap y 4.2..6.8
    const d = r.openings.filter((o) => o.kind === "door").find((o) => o.vertical && Math.abs(o.along - 5.2) < 1e-9)!;
    expect(d).toBeDefined();
    // pct 30 along overlap, default interior width 0.8
    const c = 4.2 + 0.3 * 2.6;
    expect(d.lo).toBeCloseTo(c - 0.4, 6);
    expect(d.hi).toBeCloseTo(c + 0.4, 6);
  });

  it("positions side-wall openings along the full wall", () => {
    const r = lay(APARTMENT);
    // window living north at 30% width 1.8 → x 0.66..2.46 on y=0
    const w = r.openings.find((o) => o.kind === "window" && !o.vertical && o.along === 0 && o.lo < 2)!;
    expect(w.lo).toBeCloseTo(0.66, 6);
    expect(w.hi).toBeCloseTo(2.46, 6);
  });

  it("door swing arcs stay inside the owning room (spec §7 case 1)", () => {
    const r = lay(APARTMENT);
    for (const o of r.openings) {
      if (o.kind !== "door") continue;
      const room = r.rooms[o.owner]!;
      const wd = o.hi - o.lo;
      // quarter-arc bounding square: from the gap, extending `wd` toward `inward`
      if (o.vertical) {
        const x0 = o.inward === 1 ? o.along : o.along - wd;
        expect(x0).toBeGreaterThanOrEqual(room.x - 1e-6);
        expect(x0 + wd).toBeLessThanOrEqual(room.x + room.w + 1e-6);
        expect(o.lo).toBeGreaterThanOrEqual(room.y - 1e-6);
        expect(o.hi).toBeLessThanOrEqual(room.y + room.h + 1e-6);
      } else {
        const y0 = o.inward === 1 ? o.along : o.along - wd;
        expect(y0).toBeGreaterThanOrEqual(room.y - 1e-6);
        expect(y0 + wd).toBeLessThanOrEqual(room.y + room.h + 1e-6);
        expect(o.lo).toBeGreaterThanOrEqual(room.x - 1e-6);
        expect(o.hi).toBeLessThanOrEqual(room.x + room.w + 1e-6);
      }
    }
  });

  it("clamps an opening wider than its wall segment and warns", () => {
    const r = lay(`floorplan
room a at 0,0 size 2x2
door a north at 50% width 5`);
    const d = r.openings[0]!;
    expect(d.hi - d.lo).toBeCloseTo(2 - 0.1, 6);
    expect(r.warnings.some((w) => /clamp/i.test(w))).toBe(true);
  });

  it("errors on door between non-adjacent rooms, quantifying the gap", () => {
    const r = lay(`floorplan
room a "A" at 0,0 size 4x3
room c "C" at 10,0 size 3x3
door between a c at 50%`);
    const e = r.errors.find((x) => x.includes('"a"') && x.includes('"c"'))!;
    expect(e).toBeDefined();
    expect(e).toMatch(/6(\.0+)? ?m/);
  });
});

describe("floorplan layout — validation (spec §6)", () => {
  it("errors on overlapping rooms with quantified overlap", () => {
    const r = lay(`floorplan
room a "A" at 0,0 size 4x3
room b "B" at 2,1 size 3x3`);
    const e = r.errors.find((x) => x.includes('"a"') && x.includes('"b"'))!;
    expect(e).toBeDefined();
    expect(e).toMatch(/2\.00?\s*[×x]\s*2\.00?/);
  });

  it("warns on furniture outside the room interior with overshoot", () => {
    const r = lay(`floorplan
room c "C" at 0,0 size 3x3
furniture sofa in c at 2.5,0.5`);
    const warning = r.warnings.find((message) => message.includes("sofa"))!;
    expect(r.errors).toHaveLength(0);
    expect(warning).toBeDefined();
    expect(warning).toMatch(/1\.7/);
  });

  it("the error plan produces 2 structural errors and 1 furniture warning (spec §7 case 4)", () => {
    const r = lay(`floorplan "Errors"
room a "A" at 0,0 size 4x3
room b "B" at 2,1 size 3x3
room c "C" at 10,0 size 3x3
door between a c at 50%
furniture sofa in c at 2.5,0.5`);
    expect(r.errors).toHaveLength(2);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("sofa");
  });

  it("warns on furniture collision naming both items with seq numbers", () => {
    const r = lay(`floorplan
room hall at 0,0 size 10x10
furniture round-table-8 in hall at 1,1
furniture round-table-8 in hall at 2,1`);
    expect(r.errors).toHaveLength(0);
    const w = r.warnings.find((x) => x.includes("round-table-8"))!;
    expect(w).toBeDefined();
    expect(w).toMatch(/#1.*#2/);
  });

  it("floor coverings (rug, dance-floor) underlay furniture without collision", () => {
    const r = lay(`floorplan
room a at 0,0 size 6x6
furniture rug in a at 1,1 size 3x2
furniture coffee-table in a at 1.5,1.5`);
    expect(r.warnings).toHaveLength(0);
  });

  it("collision uses rotated envelope AABBs (chair ring swings with the desk)", () => {
    const base = `floorplan unit ft
room class at 0,0 size 32x26
furniture desk-chair in class at 4,5.9 size 2x2.5`;
    // rotated 20°, the teacher desk's chair envelope reaches y≈6.3 ft → collide
    const rot = lay(`${base}\nfurniture desk in class at 2,1.5 size 5x2.5 rotate 20`);
    expect(rot.warnings.length).toBeGreaterThan(0);
    // unrotated, the envelope stops at y≈5.6 ft → clear
    const straight = lay(`${base}\nfurniture desk in class at 2,1.5 size 5x2.5`);
    expect(straight.warnings).toHaveLength(0);
  });

  it("counters underlay embedded kitchen fixtures (sink in counter run)", () => {
    const r = lay(`floorplan
room k at 0,0 size 4x4
furniture counter in k at 0.15,0.15 size 2.6x0.6
furniture kitchen-sink in k at 0.6,0.18`);
    expect(r.warnings).toHaveLength(0);
  });
});

describe("floorplan layout — arrays", () => {
  it("grid truncates row-major, dropping the last row's tail (spec §7 case 2)", () => {
    const r = lay(`floorplan "Class" unit ft
room class at 0,0 size 32x26 nolabel
grid desk-chair in class rows 5 cols 6 count 27 area 5,7 25,23 itemsize 2x2.5`);
    const desks = r.items.filter((i) => i.type === "desk-chair");
    expect(desks).toHaveLength(27);
    // centers: x = 5,9,13,17,21,25 ft; y = 7,11,15,19,23 ft. Last item = row 5, col 3 → (13, 23)
    const last = desks[26]!;
    const ft = 0.3048;
    expect(last.x + last.w / 2).toBeCloseTo(13 * ft, 4);
    expect(last.y + last.h / 2).toBeCloseTo(23 * ft, 4);
    // no desk at (17,23) or beyond — the tail of row 5 is dropped
    expect(
      desks.some((d) => Math.abs(d.x + d.w / 2 - 17 * ft) < 1e-4 && Math.abs(d.y + d.h / 2 - 23 * ft) < 1e-4)
    ).toBe(false);
  });

  it("15 × round-table-8 via two grids + one row (spec §7 case 3) with no collision warnings", () => {
    const r = lay(`floorplan "Wedding" unit m
room hall "Grand Ballroom" at 0,0 size 24x16 nolabel
grid round-table-8 in hall rows 3 cols 2 count 6 area 2.8,4.2 7,10.9 itemsize 2.3x2.3
grid round-table-8 in hall rows 3 cols 2 count 6 area 17,4.2 21.2,10.9 itemsize 2.3x2.3
row round-table-8 in hall cols 3 area 8.8,13.4 15.2,13.4 itemsize 2.3x2.3`);
    expect(r.items.filter((i) => i.type === "round-table-8")).toHaveLength(15);
    expect(r.warnings).toHaveLength(0);
  });

  it("collision warning fires when the grid area is squeezed (negative test)", () => {
    const r = lay(`floorplan "Wedding" unit m
room hall at 0,0 size 24x16 nolabel
grid round-table-8 in hall rows 3 cols 2 count 6 area 2.8,4.2 5,8.5 itemsize 2.3x2.3`);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("arc places count items on the arc facing center", () => {
    const r = lay(`floorplan
room hall at 0,0 size 24x16
arc chair in hall count 13 center 12,8 radius 5 from 200 to 340`);
    const chairs = r.items.filter((i) => i.type === "chair");
    expect(chairs).toHaveLength(13);
    // first item at 200°, last at 340°, radius 5 from center (12,8)
    const first = chairs[0]!;
    const cx = first.x + first.w / 2 - 12;
    const cy = first.y + first.h / 2 - 8;
    expect(Math.hypot(cx, cy)).toBeCloseTo(5, 4);
  });
});

describe("floorplan layout — dimension lines", () => {
  it("emits overall W/H dims plus per-room dims on top/left exteriors", () => {
    const r = lay(APARTMENT);
    const major = r.dims.filter((d) => !d.minor);
    expect(major).toHaveLength(2);
    expect(major.find((d) => !d.vertical)!.label).toBe("8.2 m");
    expect(major.find((d) => d.vertical)!.label).toBe("9.8 m");
    // top exterior: living (5.2) + kitchen (3.0); left exterior: living, hall, bed2
    const minor = r.dims.filter((d) => d.minor);
    expect(minor.filter((d) => !d.vertical).map((d) => d.label)).toEqual(["5.2 m", "3 m"]);
    expect(minor.filter((d) => d.vertical).map((d) => d.label)).toEqual(["4.2 m", "2.6 m", "3 m"]);
  });

  it("formats ft dims as feet-and-inches", () => {
    const r = lay(`floorplan unit ft\nroom c at 0,0 size 32x26`);
    const labels = r.dims.map((d) => d.label);
    expect(labels).toContain("32'");
    expect(labels).toContain("26'");
    const r2 = lay(`floorplan unit ft\nroom c at 0,0 size 15.083x10`);
    expect(r2.dims.map((d) => d.label)).toContain("15'1\"");
  });
});
