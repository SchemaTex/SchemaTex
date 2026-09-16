import { describe, expect, it } from "vitest";
import { edgeLabelObstacles, labelEdgeAnchor, labelLeader, labelOverlap, labelPathPoints, placeLabel, type LabelBox } from "../../src/core/label-placement";

const anchor = { x: 0, y: 0 };
const size = { width: 10, height: 10 };
const horizontal = { x: 1, y: 0 };
const preferred = { x: -5, y: -5, ...size };

describe("shared label placement", () => {
  it("keeps a free preferred anchor and does not mutate inputs", () => {
    const occupied = Object.freeze<LabelBox[]>([]);
    expect(placeLabel(anchor, size, occupied, horizontal)).toEqual(preferred);
    expect(anchor).toEqual({ x: 0, y: 0 });
  });

  it("tries forward, backward, then perpendicular to the edge", () => {
    const forward = { x: 9, y: -5, ...size };
    const backward = { x: -19, y: -5, ...size };
    expect(placeLabel(anchor, size, [preferred], horizontal)).toEqual(forward);
    expect(placeLabel(anchor, size, [preferred, forward], horizontal)).toEqual(backward);
    expect(placeLabel(anchor, size, [preferred, forward, backward], horizontal)).toEqual({ x: -5, y: -19, ...size });
    expect(placeLabel(anchor, size, [preferred], { x: 0, y: 7 })).toEqual({ x: -5, y: 9, ...size });
  });

  it("takes the least total overlap when no candidate fits, with stable ties", () => {
    const everywhere = { x: -100, y: -100, width: 200, height: 200 };
    const left = { x: -100, y: -100, width: 100, height: 200 };
    expect(placeLabel(anchor, size, [everywhere], horizontal)).toEqual(preferred);
    expect(placeLabel(anchor, size, [everywhere, left], horizontal)).toEqual({ x: 9, y: -5, ...size });
  });

  it("never intersects a supplied occupied box while a candidate remains free", () => {
    const occupied: LabelBox[] = [];
    for (let i = 0; i < 9; i++) {
      const placed = placeLabel(anchor, size, occupied, horizontal);
      for (const box of occupied) expect(labelOverlap(placed, box)).toBe(0);
      occupied.push(placed);
    }
    expect(new Set(occupied.map((box) => `${box.x},${box.y}`)).size).toBe(9);
  });

  it("moves clear of edge strokes and does not block an entire diagonal bounding box", () => {
    const points = [{ x: -100, y: 0 }, { x: 100, y: 0 }];
    const occupied = edgeLabelObstacles(points);
    const placed = placeLabel(anchor, size, occupied, horizontal);
    expect(occupied.every((box) => labelOverlap(placed, box) === 0)).toBe(true);
    const diagonal = edgeLabelObstacles([{ x: 0, y: 0 }, { x: 100, y: 100 }]);
    expect(diagonal.every((box) => labelOverlap({ x: 0, y: 80, ...size }, box) === 0)).toBe(true);
  });

  it("keeps both free and fallback placements inside container bounds", () => {
    const bounds = { x: 20, y: 30, width: 40, height: 40 };
    const blocked = { x: -100, y: -100, width: 300, height: 300 };
    for (const occupied of [[], [blocked]]) {
      const box = placeLabel(anchor, size, occupied, horizontal, bounds);
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);
      expect(box.y).toBeGreaterThanOrEqual(bounds.y);
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    }
  });

  it("accounts for already placed labels when all candidates overlap obstacles", () => {
    const occupied = [{ x: -100, y: -100, width: 200, height: 200 }];
    const first = placeLabel(anchor, size, occupied, horizontal);
    occupied.push(first);
    const second = placeLabel(anchor, size, occupied, horizontal);
    expect(labelOverlap(first, second)).toBe(0);
  });

  it("follows a local segment and ends a leader at the text box boundary", () => {
    const points = labelPathPoints("M 0 0 L 100 0 L 100 100");
    expect(labelEdgeAnchor({ x: 110, y: 50 }, points)).toEqual({ point: { x: 100, y: 50 }, direction: { x: 0, y: 100 } });
    expect(labelLeader({ x: 110, y: 40, ...size }, points)).toEqual({ from: { x: 100, y: 45 }, to: { x: 110, y: 45 } });
    expect(labelLeader({ x: 95, y: 40, ...size }, points)).toBeUndefined();
  });

  it("includes cubic loop geometry and handles degenerate segments", () => {
    const points = labelPathPoints("M 0 0 C 0 -40, 40 -40, 40 0");
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)).toEqual({ x: 40, y: 0 });
    expect(Math.min(...points.map((point) => point.y))).toBe(-30);
    expect(labelEdgeAnchor({ x: 2, y: 3 }, [{ x: 0, y: 0 }, { x: 0, y: 0 }]).point).toEqual({ x: 0, y: 0 });
    expect(placeLabel(anchor, size, [], { x: 0, y: 0 })).toEqual(preferred);
  });
});
