/**
 * Pure geometry helpers for Venn / Euler diagrams.
 *
 * Zero dependencies; analytic formulas where possible plus Monte Carlo
 * integration used as a fallback for 3-circle region areas.
 *
 * All functions here are side-effect-free and tested in geometry.test.ts.
 */

import type { VennCircle, VennEllipse } from "../../core/types";

// ─── Two-circle helpers ──────────────────────────────────────

/**
 * Lens area (intersection) of two circles separated by distance d.
 * Returns:
 *   - 0 if circles are disjoint (d >= rA + rB)
 *   - π·min(rA,rB)² if one circle contains the other (d <= |rA-rB|)
 *   - otherwise the analytic two-circle lens area.
 */
export function twoCircleIntersectionArea(rA: number, rB: number, d: number): number {
  if (rA <= 0 || rB <= 0) return 0;
  if (d >= rA + rB) return 0;
  const rMin = Math.min(rA, rB);
  if (d <= Math.abs(rA - rB)) return Math.PI * rMin * rMin;

  const aTerm = (d * d + rA * rA - rB * rB) / (2 * d * rA);
  const bTerm = (d * d + rB * rB - rA * rA) / (2 * d * rB);
  // Clamp to avoid NaN from float slop.
  const a = Math.max(-1, Math.min(1, aTerm));
  const b = Math.max(-1, Math.min(1, bTerm));

  const kSq =
    (-d + rA + rB) * (d + rA - rB) * (d - rA + rB) * (d + rA + rB);
  const k = kSq > 0 ? Math.sqrt(kSq) : 0;

  return rA * rA * Math.acos(a) + rB * rB * Math.acos(b) - 0.5 * k;
}

/**
 * Newton-Raphson invert: find the distance d such that
 * `twoCircleIntersectionArea(rA, rB, d) == target`.
 * Returns a d in [|rA-rB|, rA+rB]. If target >= min-disc area, returns |rA-rB|.
 * If target <= 0, returns rA+rB.
 */
export function solveTwoCircleDistance(
  rA: number,
  rB: number,
  target: number
): number {
  const rMin = Math.min(rA, rB);
  const maxArea = Math.PI * rMin * rMin;
  if (target >= maxArea) return Math.abs(rA - rB);
  if (target <= 0) return rA + rB;

  let lo = Math.abs(rA - rB);
  let hi = rA + rB;
  // Bisection — robust, ~40 iterations gets 1e-12 precision.
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const a = twoCircleIntersectionArea(rA, rB, mid);
    // area is monotone decreasing in d
    if (a > target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return 0.5 * (lo + hi);
}

// ─── Three-circle classic coordinates ───────────────────────

/**
 * Three circle canonical layout — circles of radius r, centers on an equilateral
 * triangle whose edge length equals the center offset `o`. With o = r·0.6 the
 * central triple region is ~r·0.15 wide (VennDiagram R convention).
 */
export function threeCircleClassic(
  cx: number,
  cy: number,
  r: number,
  offsetScale: number = 0.6
): [VennCircle, VennCircle, VennCircle] {
  const o = r * offsetScale;
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  return [
    { id: "0", cx: cx - o * cos30, cy: cy + o * sin30, r },
    { id: "1", cx: cx + o * cos30, cy: cy + o * sin30, r },
    { id: "2", cx, cy: cy - o, r },
  ];
}

// ─── Four-ellipse standard arrangement ──────────────────────

/**
 * Classic Venn 4-ellipse arrangement following Ruskey & Weston 2005.
 * Returns 4 congruent ellipses arranged symmetrically so all 15 non-empty
 * intersection regions exist.
 *
 * Layout uses rotation angles at -65°, -35°, 35°, 65° from the horizontal,
 * with a modest vertical bias to spread overlaps readably.
 */
export function fourEllipseStandard(
  cx: number,
  cy: number,
  a: number,
  b: number
): [VennEllipse, VennEllipse, VennEllipse, VennEllipse] {
  // Based on Venn's original 1881 construction; coords ported from venn.js Venn4.
  // Offsets are a fraction of the semi-major axis. These constants produce all
  // 15 regions for the standard a:b ≈ 2:1 aspect.
  const dx = 0.18 * a;
  const dy = 0.1 * b;

  return [
    { id: "0", cx: cx - dx, cy: cy - dy, rx: a, ry: b, rotation: -65 },
    { id: "1", cx: cx - 0.6 * dx, cy: cy - dy, rx: a, ry: b, rotation: -35 },
    { id: "2", cx: cx + 0.6 * dx, cy: cy - dy, rx: a, ry: b, rotation: 35 },
    { id: "3", cx: cx + dx, cy: cy - dy, rx: a, ry: b, rotation: 65 },
  ];
}

// ─── Point-in-shape tests ────────────────────────────────────

export function pointInCircle(c: VennCircle, x: number, y: number): boolean {
  const dx = x - c.cx;
  const dy = y - c.cy;
  return dx * dx + dy * dy <= c.r * c.r;
}

export function pointInEllipse(e: VennEllipse, x: number, y: number): boolean {
  const dx = x - e.cx;
  const dy = y - e.cy;
  const rad = (e.rotation * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  // Rotate (dx, dy) back into the unrotated frame.
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return (rx * rx) / (e.rx * e.rx) + (ry * ry) / (e.ry * e.ry) <= 1;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Axis-aligned bounding box of a circle. */
export function circleBBox(c: VennCircle): Box {
  return { x: c.cx - c.r, y: c.cy - c.r, w: 2 * c.r, h: 2 * c.r };
}

/** Axis-aligned bounding box of an (optionally rotated) ellipse. */
export function ellipseBBox(e: VennEllipse): Box {
  const rad = (e.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ux = e.rx * cos;
  const uy = e.rx * sin;
  const vx = e.ry * -sin;
  const vy = e.ry * cos;
  const hx = Math.sqrt(ux * ux + vx * vx);
  const hy = Math.sqrt(uy * uy + vy * vy);
  return { x: e.cx - hx, y: e.cy - hy, w: 2 * hx, h: 2 * hy };
}

export function unionBBox(boxes: Box[]): Box {
  if (boxes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ─── Deterministic sampling-based region centroid / area ─────

/**
 * Rough pseudorandom generator seeded for deterministic tests. Mulberry32.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CentroidResult {
  /** Centroid x. NaN when area = 0. */
  cx: number;
  /** Centroid y. NaN when area = 0. */
  cy: number;
  /** Approximate area (square pixels). */
  area: number;
  /** Samples that landed inside the region (for leader fallback). */
  interior: Array<{ x: number; y: number }>;
}

/**
 * Monte Carlo centroid + area over a region defined by "must be inside these
 * shapes AND not inside those shapes". Uniform sampling inside `bounds`.
 *
 * @param bounds Axis-aligned sampling rectangle (must cover the region).
 * @param include Shapes the sample must be inside.
 * @param exclude Shapes the sample must be outside.
 * @param nSamples Sample count (default 2000 is plenty for label placement).
 */
export function regionCentroid(
  bounds: Box,
  include: Array<{ inside: (x: number, y: number) => boolean }>,
  exclude: Array<{ inside: (x: number, y: number) => boolean }>,
  nSamples: number = 2000,
  seed: number = 0xc0ffee
): CentroidResult {
  const rand = mulberry32(seed);
  let hits = 0;
  let sumX = 0;
  let sumY = 0;
  const interior: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nSamples; i++) {
    const x = bounds.x + rand() * bounds.w;
    const y = bounds.y + rand() * bounds.h;
    let ok = true;
    for (const s of include) {
      if (!s.inside(x, y)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const s of exclude) {
      if (s.inside(x, y)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    hits++;
    sumX += x;
    sumY += y;
    if (interior.length < 256) interior.push({ x, y });
  }
  const area = (hits / nSamples) * bounds.w * bounds.h;
  if (hits === 0) return { cx: NaN, cy: NaN, area: 0, interior };
  return { cx: sumX / hits, cy: sumY / hits, area, interior };
}
