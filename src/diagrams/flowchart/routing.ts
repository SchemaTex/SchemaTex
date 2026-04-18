/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Edge routing utilities for flowchart (M1: straight Manhattan).
 *
 * For M1 the bulk of routing is folded into `layout.ts` — this module exposes
 * the primitives so future milestones can swap in A* / orthogonal routing
 * without touching the layout entry point.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Compute a simple Manhattan polyline between two points.
 * `axis` dictates which axis to travel on first:
 *   "v" — vertical then horizontal (good for TB flow)
 *   "h" — horizontal then vertical (good for LR flow)
 */
export function manhattanBetween(a: Point, b: Point, axis: "v" | "h"): Point[] {
  if (axis === "v") {
    const midY = (a.y + b.y) / 2;
    return [
      a,
      { x: a.x, y: midY },
      { x: b.x, y: midY },
      b,
    ];
  }
  const midX = (a.x + b.x) / 2;
  return [
    a,
    { x: midX, y: a.y },
    { x: midX, y: b.y },
    b,
  ];
}

/** Render a polyline as an SVG path `d` attribute. */
export function polylineToPath(pts: Point[]): string {
  if (pts.length === 0) return "";
  const f = (n: number): string => (Math.round(n * 100) / 100).toString();
  const parts: string[] = [`M ${f(pts[0]!.x)} ${f(pts[0]!.y)}`];
  for (let i = 1; i < pts.length; i++) {
    parts.push(`L ${f(pts[i]!.x)} ${f(pts[i]!.y)}`);
  }
  return parts.join(" ");
}

/** Arc-length midpoint of a polyline (for edge-label placement). */
export function polylineMidpoint(pts: Point[]): Point {
  if (pts.length === 0) return { x: 0, y: 0 };
  let total = 0;
  const segs: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    segs.push(d);
    total += d;
  }
  if (total === 0) return pts[0]!;
  const half = total / 2;
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i]! >= half) {
      const t = (half - acc) / (segs[i]! || 1);
      return {
        x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * t,
        y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * t,
      };
    }
    acc += segs[i]!;
  }
  return pts[Math.floor(pts.length / 2)]!;
}
