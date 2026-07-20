import { describe, expect, test } from "vitest";
import { parse, renderResult, setPosition, type SceneItem } from "../../src";

function rendered(source: string) {
  const result = renderResult(source, { scene: true });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.diagnostics[0]?.message);
  return result;
}

function item(scene: SceneItem[] | undefined, key: string): SceneItem {
  const found = scene?.find((candidate) => candidate.key === key);
  expect(found, `missing ${key}`).toBeDefined();
  return found!;
}

describe("native geometry handles", () => {
  test("Timeline date handles rewrite authored dates instead of creating overrides", () => {
    const source = [
      'timeline "Release history"',
      '2024-01-01 : "Kickoff"',
      '2024-02-01 .. 2024-04-01 : "Build"',
    ].join("\n");
    const base = rendered(source);
    const start = item(base.scene, "handle:event:ev-1:start");
    expect(source.slice(start.positionSource!.range.start, start.positionSource!.range.end)).toBe("2024-01-01");

    const edited = setPosition(source, start, { x: start.bbox!.x + 30, y: start.bbox!.y });
    expect(edited.source).not.toContain("@overrides");
    const ast = parse(edited.source) as { events: Array<{ start: { raw: string } }> };
    expect(ast.events[0]?.start.raw).not.toBe("2024-01-01");
  });

  test("Timing transition handles resize adjacent wave runs", () => {
    const source = [
      'timing "Bus cycle"',
      'REQ: 00111100',
    ].join("\n");
    const base = rendered(source);
    const boundary = item(base.scene, "handle:timing:REQ:2");
    const edited = setPosition(source, boundary, { x: boundary.bbox!.x + 40, y: boundary.bbox!.y });
    expect(edited.source).toContain("REQ: 00011100");
  });

  test("Breadboard parts snap their authored placement to holes and keep spans", () => {
    const source = [
      "breadboard",
      "board: half",
      "parts",
      "  r1: resistor 220 @5e..9e",
      "wires",
      "  r1:1 --red-- @+t5",
    ].join("\n");
    const base = rendered(source);
    const resistor = item(base.scene, "node:r1");
    const edited = setPosition(source, resistor, { x: resistor.bbox!.x + 14, y: resistor.bbox!.y });
    expect(edited.source).toContain("@6e..10e");
    expect(edited.source).not.toContain("@overrides");
  });

  test("Siteplan vertex and marker edits write native coordinate pairs", () => {
    const source = [
      'siteplan "Studio lot" unit m',
      'parcel lot "Lot" points 0,0 20,0 20,12 0,12',
      'tree oak "Oak" at 5,5 size 2',
    ].join("\n");
    const base = rendered(source);
    const vertex = item(base.scene, "handle:polygon:lot:1");
    const editedVertex = setPosition(source, vertex, { x: vertex.bbox!.x + 25, y: vertex.bbox!.y + 10 });
    const vertexAst = parse(editedVertex.source) as { polygons: Array<{ points: Array<{ x: number; y: number }> }> };
    expect(vertexAst.polygons[0]?.points[1]?.x).toBeGreaterThan(20);
    expect(vertexAst.polygons[0]?.points[1]?.y).toBeGreaterThan(0);

    const marker = item(base.scene, "node:oak");
    const editedMarker = setPosition(source, marker, { x: marker.bbox!.x + 20, y: marker.bbox!.y });
    const markerAst = parse(editedMarker.source) as { markers: Array<{ at: { x: number } }> };
    expect(markerAst.markers[0]?.at.x).toBeGreaterThan(5);
  });

  test("Floorplan room edge and corner handles rewrite room dimensions", () => {
    const source = [
      'floorplan "Apartment" unit m',
      'room living "Living" at 0,0 size 4x3',
    ].join("\n");
    const base = rendered(source);
    const east = item(base.scene, "handle:room:living:x");
    const edited = setPosition(source, east, { x: east.bbox!.x + 36, y: east.bbox!.y });
    expect(edited.source).not.toContain("@overrides");
    const ast = parse(edited.source) as { rooms: Array<{ w: number; h: number }> };
    expect(ast.rooms[0]?.w).toBeGreaterThan(4);
    expect(ast.rooms[0]?.h).toBe(3);
  });
});
