import type { RoutedWire } from "./autolayout";
import { compactRoute, intersectsBox, type RouteBox, type RoutedNet } from "../logic/orthogonal-router";

/** Clearance improvements take precedence over ink cost; none may regress. */
export function isBetterRouting(next: ReturnType<typeof measureRouting>, previous: ReturnType<typeof measureRouting>): boolean {
  const constraints = ["bodyHits", "overlap", "junctionConflicts", "captionHits"] as const;
  if (constraints.some(key => next[key] > previous[key])) return false;
  return constraints.some(key => next[key] < previous[key]) || next.cost < previous.cost;
}

/** Shared ink is measured as a union, not once per routed terminal. */
export function measureRouting(routes: RoutedWire[], nets: string[], obstacles: RouteBox[] = [], captions: RouteBox[] = [], terminals: RoutedNet[] = []) {
  const names = [...nets].sort((a, b) => b.length - a.length);
  const owner = (id: string) => names.find(net => id === net || id.startsWith(`${net}.`)) ?? id;
  const spans = new Map<string, { net: string; vertical: boolean; fixed: number; intervals: [number, number][] }>();
  let bends = 0;
  for (const route of routes) {
    const points = compactRoute(route.points);
    bends += Math.max(0, points.length - 2);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!, b = points[i]!;
      const vertical = a.x === b.x, net = owner(route.netId), fixed = vertical ? a.x : a.y;
      const key = JSON.stringify([net, vertical, fixed]);
      const span = spans.get(key) ?? { net, vertical, fixed, intervals: [] };
      span.intervals.push(vertical ? [Math.min(a.y, b.y), Math.max(a.y, b.y)] : [Math.min(a.x, b.x), Math.max(a.x, b.x)]);
      spans.set(key, span);
    }
  }
  const segments = [...spans.values()].flatMap(span => {
    const merged: [number, number][] = [];
    for (const interval of span.intervals.sort((a, b) => a[0] - b[0])) {
      const last = merged[merged.length - 1];
      if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
      else merged.push([...interval]);
    }
    return merged.map(([lo, hi]) => ({ net: span.net, vertical: span.vertical, fixed: span.fixed, lo, hi,
      a: span.vertical ? { x: span.fixed, y: lo } : { x: lo, y: span.fixed },
      b: span.vertical ? { x: span.fixed, y: hi } : { x: hi, y: span.fixed } }));
  });
  let overlap = 0, crossings = 0, bodyHits = 0, captionHits = 0;
  const length = segments.reduce((sum, s) => sum + s.hi - s.lo, 0);
  for (const [i, a] of segments.entries()) {
    bodyHits += obstacles.filter(box => intersectsBox(a.a, a.b, box)).length;
    captionHits += captions.filter(box => intersectsBox(a.a, a.b, box)).length;
    for (const b of segments.slice(i + 1)) {
      if (a.net === b.net) continue;
      if (a.vertical === b.vertical) {
        if (Math.abs(a.fixed - b.fixed) < 0.5) overlap += Math.max(0, Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo));
      } else {
        const v = a.vertical ? a : b, h = a.vertical ? b : a;
        if (v.fixed >= h.lo && v.fixed <= h.hi && h.fixed >= v.lo && h.fixed <= v.hi) crossings++;
      }
    }
  }
  const conflicts = new Set<string>();
  for (const route of routes) for (const dot of route.junctions ?? []) {
    const net = owner(route.netId);
    if (segments.some(s => s.net !== net && Math.hypot(
      dot.x - Math.max(Math.min(s.a.x, s.b.x), Math.min(Math.max(s.a.x, s.b.x), dot.x)),
      dot.y - Math.max(Math.min(s.a.y, s.b.y), Math.min(Math.max(s.a.y, s.b.y), dot.y))) <= 4)) {
      conflicts.add(JSON.stringify([net, dot.x, dot.y]));
    }
  }
  const terminalTurns = terminals.filter(lead => {
    const at = lead.points[0]!, end = lead.points[1]!;
    return !segments.some(s => s.net === lead.net && (s.vertical
      ? at.x === s.fixed && end.x === at.x && at.y >= s.lo && at.y <= s.hi &&
        (end.y > at.y ? s.hi > at.y : s.lo < at.y)
      : at.y === s.fixed && end.y === at.y && at.x >= s.lo && at.x <= s.hi &&
        (end.x > at.x ? s.hi > at.x : s.lo < at.x)));
  }).length;
  return { length, bends, crossings, overlap, bodyHits, captionHits, terminalTurns, junctionConflicts: conflicts.size,
    // Same bend/crossing costs as the orthogonal router. Hard violations are
    // compared separately and cannot be bought off with shorter wires.
    cost: length + 28 * bends + 40 * crossings };
}
