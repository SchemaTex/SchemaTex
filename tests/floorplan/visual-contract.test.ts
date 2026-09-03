import { describe, expect, it } from "vitest";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import { parseFloorplan } from "../../src/diagrams/floorplan/parser";
import { renderFloorplan } from "../../src/diagrams/floorplan/renderer";

describe("floorplan visual contract — agent-readable placement", () => {
  it("parses mirror and fit as orthogonal placement modifiers", () => {
    const ast = parseFloorplan(`floorplan
room stairwell at 0,0 size 2.4x2
furniture stairs-l S1 in stairwell fit margin 0.1 size 4x3 rotate 90 mirror x`);
    expect(ast.furniture[0]).toMatchObject({
      instanceId: "S1",
      mirror: "x",
      fit: { margin: 0.1 },
      size: { w: 4, h: 3 },
      rotate: 90,
    });
  });

  it("rejects competing at and fit placement forms instead of silently overriding one", () => {
    expect(() => parseFloorplan(`floorplan
room stairwell at 0,0 size 3x3
furniture stairs-l in stairwell at 0.2,0.2 fit`)).toThrow(/exactly one placement form/);
    expect(() => parseFloorplan(`floorplan
room hall at 0,0 size 3x3
fixture outlet in hall on south fit`)).toThrow(/only valid for room-contained furniture/);
  });

  it("centers and scales a rotated item into the room interior", () => {
    const layout = layoutFloorplan(parseFloorplan(`floorplan
room stairwell at 0,0 size 2.4x2
furniture stairs-l S1 in stairwell fit margin 0.1 size 4x3 rotate 90 mirror x`));
    const item = layout.items[0]!;
    const room = layout.rooms[0]!;
    const envelopeW = item.h;
    const envelopeH = item.w;
    expect(item.x + item.w / 2).toBeCloseTo(room.x + room.w / 2, 6);
    expect(item.y + item.h / 2).toBeCloseTo(room.y + room.h / 2, 6);
    expect(envelopeW).toBeLessThanOrEqual(room.w - 0.2 + 1e-9);
    expect(envelopeH).toBeLessThanOrEqual(room.h - 0.2 + 1e-9);
    expect(layout.warnings).toHaveLength(0);
  });

  it("mirrors symbol geometry while keeping stair text readable", () => {
    const svg = renderFloorplan(`floorplan
room stairwell at 0,0 size 3x3
furniture stairs-l S1 "UP" in stairwell fit margin 0.1 mirror x`);
    expect(svg).toContain("scale(-1 1)");
    expect(svg).toMatch(/class="sx-fp-furn-label"[^>]*>UP<\/text>/);
  });

  it("keeps the default UP stair direction readable when a mirrored stair has no explicit label", () => {
    const svg = renderFloorplan(`floorplan
room stairwell at 0,0 size 3x3
furniture stairs-l in stairwell fit margin 0.1 mirror x`);
    expect(svg).toContain("scale(-1 1)");
    const mirroredGlyph = svg.match(/<g class="sx-fp-item" data-furniture="stairs-l"[\s\S]*?<\/g>/)?.[0];
    expect(mirroredGlyph).not.toContain(">UP<");
    expect(svg).toMatch(/class="sx-fp-furn-label"[^>]*>UP<\/text>/);
  });
});

describe("floorplan visual contract — deterministic openings", () => {
  it("places openings by an absolute start offset and relative gap", () => {
    const ast = parseFloorplan(`floorplan
room hall at 0,0 size 6x4
door hall south from start 0.3 width 0.9 id front
window hall south after front gap 0.1 width 1.2 id display`);
    expect(ast.openings[0]).toMatchObject({ id: "front", from: { edge: "start", offset: 0.3 } });
    expect(ast.openings[1]).toMatchObject({ id: "display", relative: { how: "after", ref: "front", gap: 0.1 } });

    const layout = layoutFloorplan(ast);
    expect(layout.openings[0]!.lo).toBeCloseTo(0.3, 6);
    expect(layout.openings[0]!.hi).toBeCloseTo(1.2, 6);
    expect(layout.openings[1]!.lo).toBeCloseTo(1.3, 6);
    expect(layout.openings[1]!.hi).toBeCloseTo(2.5, 6);
    expect(layout.errors).toHaveLength(0);
    expect(layout.warnings).toHaveLength(0);
  });

  it("does not silently resolve an opening id from the future", () => {
    const layout = layoutFloorplan(parseFloorplan(`floorplan
room hall at 0,0 size 6x4
window hall south after front gap 0.1 width 1.2
door hall south from start 0.3 width 0.9 id front`));
    expect(layout.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "floorplan/unknown-opening", severity: "error" }),
    ]));
  });

  it("reports furniture inside a door's real swing sector", () => {
    const layout = layoutFloorplan(parseFloorplan(`floorplan
room dining at 0,0 size 5x4
door dining south from start 0.5 width 1 id front hinge left swing in
furniture side-table in dining at 0.7,3.1 size 0.5x0.5`));
    expect(layout.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "floorplan/door-swing-obstructed", severity: "warning" }),
    ]));
  });

  it("measures start/end offsets across concatenated L-room wall segments", () => {
    const layout = layoutFloorplan(parseFloorplan(`floorplan
room hall at 0,0 size 4x2
extend hall at 4,1 size 2x1
window hall south from start 4.5 width 0.5
window hall south from end 0.5 width 0.5`));
    expect(layout.openings[0]!.lo).toBeCloseTo(4.5, 6);
    expect(layout.openings[0]!.hi).toBeCloseTo(5, 6);
    expect(layout.openings[1]!.lo).toBeCloseTo(5, 6);
    expect(layout.openings[1]!.hi).toBeCloseTo(5.5, 6);
  });
});

describe("floorplan visual contract — structural wall hierarchy", () => {
  const source = `floorplan
wall exterior thickness 0.45
wall interior thickness 0.12
wall between living kitchen thickness 0.2
room living at 0,0 size 4x3
room kitchen right-of living size 3x3
door between living kitchen at 50% width 0.8`;

  it("resolves exterior, interior, and per-pair overrides onto wall segments", () => {
    const layout = layoutFloorplan(parseFloorplan(source));
    const shared = layout.walls.find((wall) =>
      wall.vertical && Math.abs(wall.along - 4) < 1e-9 && wall.rooms.length === 2
    );
    expect(shared?.thickness).toBeCloseTo(0.2, 6);
    expect(layout.walls.filter((wall) => wall.rooms.length === 1).every((wall) => wall.thickness === 0.45)).toBe(true);
    expect(layout.openings[0]!.thickness).toBeCloseTo(0.2, 6);
  });

  it("renders the resolved hierarchy instead of one global wall width", () => {
    const svg = renderFloorplan(source);
    expect(svg).toContain('data-wall-scope="exterior"');
    expect(svg).toContain('data-wall-thickness="0.45"');
    expect(svg).toContain('data-wall-scope="interior"');
    expect(svg).toContain('data-wall-thickness="0.2"');
  });

  it("does not silently ignore a wall override with a bad room id", () => {
    const layout = layoutFloorplan(parseFloorplan(`floorplan
wall between living typo thickness 0.2
room living at 0,0 size 4x3`));
    expect(layout.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "floorplan/unknown-room", severity: "error" }),
    ]));
  });

  it("keeps wall defaults and pair overrides scoped to their authored floor", () => {
    const layout = layoutFloorplan(parseFloorplan(`floorplan unit m
floor 1 "Ground"
wall exterior thickness 0.3
wall between living kitchen thickness 0.18
room living at 0,0 size 4x3
room kitchen right-of living size 3x3
floor 2 "Upper"
wall exterior thickness 0.5
room bedroom at 0,0 size 4x3`));
    const ground = layout.walls.filter((wall) =>
      wall.rooms.some((room) => layout.rooms[room]?.floor === 1)
    );
    const upper = layout.walls.filter((wall) =>
      wall.rooms.some((room) => layout.rooms[room]?.floor === 2)
    );
    expect(ground.some((wall) => wall.rooms.length === 1 && wall.thickness === 0.3)).toBe(true);
    expect(ground.some((wall) => wall.rooms.length === 2 && wall.thickness === 0.18)).toBe(true);
    expect(upper.every((wall) => wall.thickness === 0.5)).toBe(true);
    expect(layout.errors).toHaveLength(0);
  });

  it("does not emit legacy seam gaps after wall segments are deduplicated", () => {
    const source = `floorplan unit m
room living at 0,0 size 3x3
extend living at 3,1 size 2x2
furniture side-table in living at 2.8,1.4 size 0.4x0.4`;
    const layout = layoutFloorplan(parseFloorplan(source));
    expect(layout.seams).toHaveLength(1);
    expect(layout.walls.some((wall) =>
      wall.vertical && Math.abs(wall.along - 3) < 1e-9 && wall.lo < 2 && wall.hi > 1
    )).toBe(false);
    expect(renderFloorplan(source)).not.toContain('class="sx-fp-gap"');
  });
});

describe("floorplan visual contract — automatic labels", () => {
  it("keeps an empty room centered but moves a blocked room label", () => {
    const empty = layoutFloorplan(parseFloorplan(`floorplan
room living "Living Room" at 0,0 size 6x4`)).rooms[0]!;
    expect(empty.labelX).toBeCloseTo(3, 6);
    expect(empty.labelY).toBeCloseTo(2, 6);

    const occupied = layoutFloorplan(parseFloorplan(`floorplan
room living "Living Room" at 0,0 size 6x4
furniture dining-table in living at 2,1.5 size 2x1`)).rooms[0]!;
    expect([occupied.labelX, occupied.labelY]).not.toEqual([3, 2]);
  });

  it("treats overhead electrical symbols as label obstacles", () => {
    const room = layoutFloorplan(parseFloorplan(`floorplan
room living "Living Room" at 0,0 size 5x4
furniture ceiling-light L1 in living at 2.275,1.775`)).rooms[0]!;
    expect([room.labelX, room.labelY]).not.toEqual([2.5, 2]);
  });

  it("does not place a room label over a protected-zone caption", () => {
    const room = layoutFloorplan(parseFloorplan(`floorplan
room dining "Dining Area" at 0,0 size 4x4
zone aisle "Clear egress aisle" in dining at 1.5,1 size 1x2 keep-clear`)).rooms[0]!;
    expect([room.labelX, room.labelY]).not.toEqual([2, 2]);
  });

  it("marks layout-owned label placement in semantic SVG", () => {
    const svg = renderFloorplan(`floorplan
room living "Living Room" at 0,0 size 6x4
furniture dining-table in living at 2,1.5 size 2x1`);
    expect(svg).toContain('data-label-placement="auto"');
  });

  it("uses a one-line compact label in constrained service rooms", () => {
    const source = `floorplan\nroom wc "WC" at 0,0 size 1.5x1.4`;
    const layout = layoutFloorplan(parseFloorplan(source));
    expect(layout.rooms[0]!.compactLabel).toBe(true);
    expect(renderFloorplan(source)).not.toContain('class="sx-fp-room-area"');
  });
});
