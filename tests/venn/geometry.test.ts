import { describe, test, expect } from "vitest";
import {
  twoCircleIntersectionArea,
  solveTwoCircleDistance,
  threeCircleClassic,
  fourEllipseStandard,
  pointInCircle,
  pointInEllipse,
  circleBBox,
  ellipseBBox,
  regionCentroid,
  mulberry32,
} from "../../src/diagrams/venn/geometry";

describe("twoCircleIntersectionArea", () => {
  test("disjoint circles return 0", () => {
    expect(twoCircleIntersectionArea(10, 10, 30)).toBe(0);
    expect(twoCircleIntersectionArea(10, 10, 20)).toBe(0);
  });

  test("one contains the other returns π·rMin²", () => {
    expect(twoCircleIntersectionArea(10, 5, 0)).toBeCloseTo(Math.PI * 25, 5);
    expect(twoCircleIntersectionArea(10, 5, 4)).toBeCloseTo(Math.PI * 25, 5);
  });

  test("equal radii, d = r — classic analytic ground truth", () => {
    // For r1=r2=r, d=r: area = 2·r²·(π/3 - √3/4) ≈ 1.2284·r²
    const r = 100;
    const expected = 2 * r * r * (Math.PI / 3 - Math.sqrt(3) / 4);
    const actual = twoCircleIntersectionArea(r, r, r);
    expect(actual).toBeCloseTo(expected, 2);
  });

  test("equal radii, d = 2r (tangent) returns 0", () => {
    expect(twoCircleIntersectionArea(50, 50, 100)).toBeCloseTo(0, 5);
  });
});

describe("solveTwoCircleDistance", () => {
  test("round-trip: area → distance → area", () => {
    const rA = 80;
    const rB = 60;
    const targets = [50, 500, 2000, 5000];
    for (const t of targets) {
      const d = solveTwoCircleDistance(rA, rB, t);
      const recovered = twoCircleIntersectionArea(rA, rB, d);
      expect(recovered).toBeCloseTo(t, 1);
    }
  });

  test("target area >= smaller disc snaps to containment distance", () => {
    const d = solveTwoCircleDistance(80, 60, Math.PI * 60 * 60 + 100);
    expect(d).toBeCloseTo(20, 5); // |80-60|
  });
});

describe("threeCircleClassic", () => {
  test("returns 3 circles of the same radius", () => {
    const [a, b, c] = threeCircleClassic(100, 100, 50);
    expect(a.r).toBe(50);
    expect(b.r).toBe(50);
    expect(c.r).toBe(50);
  });

  test("centers form equilateral triangle", () => {
    const [a, b, c] = threeCircleClassic(0, 0, 100);
    const d1 = Math.hypot(a.cx - b.cx, a.cy - b.cy);
    const d2 = Math.hypot(a.cx - c.cx, a.cy - c.cy);
    const d3 = Math.hypot(b.cx - c.cx, b.cy - c.cy);
    expect(d1).toBeCloseTo(d2, 5);
    expect(d2).toBeCloseTo(d3, 5);
  });
});

describe("fourEllipseStandard", () => {
  test("returns 4 congruent ellipses", () => {
    const ells = fourEllipseStandard(300, 200, 200, 100);
    expect(ells).toHaveLength(4);
    for (const e of ells) {
      expect(e.rx).toBe(200);
      expect(e.ry).toBe(100);
    }
  });
  test("all four ellipse centers are distinct", () => {
    const ells = fourEllipseStandard(0, 0, 100, 50);
    const keys = ells.map((e) => `${e.cx},${e.cy},${e.rotation}`);
    expect(new Set(keys).size).toBe(4);
  });
});

describe("point-in-shape", () => {
  test("pointInCircle", () => {
    const c = { id: "x", cx: 0, cy: 0, r: 10 };
    expect(pointInCircle(c, 0, 0)).toBe(true);
    expect(pointInCircle(c, 9, 0)).toBe(true);
    expect(pointInCircle(c, 11, 0)).toBe(false);
  });
  test("pointInEllipse rotated", () => {
    const e = { id: "x", cx: 0, cy: 0, rx: 20, ry: 5, rotation: 90 };
    // rotated 90°: major axis is vertical, so (0, 19) inside, (19, 0) outside
    expect(pointInEllipse(e, 0, 19)).toBe(true);
    expect(pointInEllipse(e, 19, 0)).toBe(false);
  });
});

describe("bbox helpers", () => {
  test("circleBBox", () => {
    const b = circleBBox({ id: "a", cx: 50, cy: 40, r: 10 });
    expect(b).toEqual({ x: 40, y: 30, w: 20, h: 20 });
  });
  test("ellipseBBox unrotated", () => {
    const b = ellipseBBox({ id: "a", cx: 100, cy: 50, rx: 30, ry: 10, rotation: 0 });
    expect(b.x).toBeCloseTo(70);
    expect(b.y).toBeCloseTo(40);
    expect(b.w).toBeCloseTo(60);
    expect(b.h).toBeCloseTo(20);
  });
});

describe("mulberry32", () => {
  test("deterministic for same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
});

describe("regionCentroid", () => {
  test("centroid of a circle ~ its center; area ~ π·r²", () => {
    const c = { id: "x", cx: 50, cy: 50, r: 30 };
    const result = regionCentroid(
      { x: 0, y: 0, w: 100, h: 100 },
      [{ inside: (x, y) => pointInCircle(c, x, y) }],
      [],
      5000
    );
    expect(result.cx).toBeCloseTo(50, 0);
    expect(result.cy).toBeCloseTo(50, 0);
    // Area should be near π·30² ≈ 2827. Monte Carlo at n=5000 → ~5% tolerance.
    expect(result.area).toBeGreaterThan(2600);
    expect(result.area).toBeLessThan(3050);
  });
});
