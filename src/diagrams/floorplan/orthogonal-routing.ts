import type { RoutePoint } from "./types";

const EPS = 1e-9;
const round = (value: number): number => Math.round(value * 1e6) / 1e6;

function samePoint(a: RoutePoint, b: RoutePoint): boolean {
  return Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
}

/**
 * Connect authored anchor points with deterministic Manhattan segments.
 *
 * This is intentionally domain-neutral. Evacuation keeps its room/opening
 * continuity and chevron semantics; stageplot keeps its equipment-anchor
 * validation. Only the geometric bend rule is shared.
 */
export function orthogonalPolyline(anchors: readonly RoutePoint[]): RoutePoint[] {
  const first = anchors[0];
  if (!first) return [];
  const points: RoutePoint[] = [{ x: round(first.x), y: round(first.y) }];
  for (let index = 1; index < anchors.length; index++) {
    const target = anchors[index];
    const source = points[points.length - 1];
    if (!target || !source || samePoint(source, target)) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    if (Math.abs(dx) > EPS && Math.abs(dy) > EPS) {
      const bend =
        Math.abs(dx) >= Math.abs(dy)
          ? { x: target.x, y: source.y }
          : { x: source.x, y: target.y };
      if (!samePoint(source, bend)) {
        points.push({ x: round(bend.x), y: round(bend.y) });
      }
    }
    const current = points[points.length - 1] ?? source;
    if (!samePoint(current, target)) {
      points.push({ x: round(target.x), y: round(target.y) });
    }
  }
  return points;
}
