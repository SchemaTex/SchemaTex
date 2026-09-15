import { segmentEntersBox, type RoutePoint, type RouteBox } from "../logic/orthogonal-router";

type Box = { x: number; y: number; width: number; height: number };
const CLEARANCE = 10;
const inside = (p: RoutePoint, b: RouteBox) => p.x > b.left && p.x < b.right && p.y > b.top && p.y < b.bottom;
const distance = (a: RoutePoint, b: RoutePoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** Visibility graph around padded package corners. Jumper wires may run diagonally. */
function clearRoute(start: RoutePoint, end: RoutePoint, boxes: RouteBox[], previous: RoutePoint[][]): RoutePoint[] {
  const candidates = [start, end, ...boxes.flatMap(b => [
    { x: b.left, y: b.top }, { x: b.right, y: b.top },
    { x: b.left, y: b.bottom }, { x: b.right, y: b.bottom },
  ])];
  // Offer a neighboring lane beside existing bends rather than laying another
  // colored wire directly on top. The spacing follows the rendered wire width.
  for (const route of previous) for (const p of route.slice(1, -1)) {
    for (const [dx, dy] of [[-6, 0], [6, 0], [0, -6], [0, 6]]) {
      const q = { x: p.x + dx!, y: p.y + dy! };
      if (!boxes.some(b => inside(q, b))) candidates.push(q);
    }
  }
  const nodes = candidates.filter((p, i) => i < 2 || (!boxes.some(b => inside(p, b)) &&
    !candidates.slice(0, i).some(q => distance(p, q) < 0.01)));
  const costs = nodes.map(() => Infinity), parent = nodes.map(() => -1), visited = new Set<number>();
  costs[0] = 0;
  const overlapCost = (a: RoutePoint, b: RoutePoint) => {
    const len = distance(a, b);
    if (!len) return 0;
    let penalty = 0;
    for (const route of previous) for (let i = 1; i < route.length; i++) {
      const c = route[i - 1]!, d = route[i]!, other = distance(c, d);
      if (!other) continue;
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      const parallel = Math.abs(ux * (d.y - c.y) - uy * (d.x - c.x)) / other;
      const separation = Math.abs(ux * (c.y - a.y) - uy * (c.x - a.x));
      if (parallel > 0.12 || separation >= 5) continue;
      const p = (c.x - a.x) * ux + (c.y - a.y) * uy, q = (d.x - a.x) * ux + (d.y - a.y) * uy;
      penalty += Math.max(0, Math.min(len, Math.max(p, q)) - Math.max(0, Math.min(p, q))) * 3;
    }
    return penalty;
  };
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) &&
      (current < 0 || costs[i]! < costs[current]!)) current = i;
    if (current < 0 || !Number.isFinite(costs[current]!)) break;
    if (current === 1) {
      const route: RoutePoint[] = [];
      for (let i = current; i >= 0; i = parent[i]!) route.unshift(nodes[i]!);
      return route;
    }
    visited.add(current);
    const a = nodes[current]!;
    for (let i = 0; i < nodes.length; i++) {
      const b = nodes[i]!;
      if (visited.has(i) || boxes.some(box => segmentEntersBox(a, b, box))) continue;
      const cost = costs[current]! + distance(a, b) + 8 + overlapCost(a, b);
      if (cost < costs[i]!) { costs[i] = cost; parent[i] = current; }
    }
  }
  throw new Error("Breadboard jumper has no clear route between overlapping components");
}

/** Physical pins stay fixed. Escape their package before routing around bodies. */
export function routeJumper(from: RoutePoint, to: RoutePoint, bodies: Box[], via?: RoutePoint, previous: RoutePoint[][] = []): RoutePoint[] {
  const boxes = bodies.map(b => ({ left: b.x - CLEARANCE, right: b.x + b.width + CLEARANCE,
    top: b.y - CLEARANCE, bottom: b.y + b.height + CLEARANCE }));
  const escape = (p: RoutePoint): RoutePoint => {
    const owners = boxes.filter(b => inside(p, b));
    if (!owners.length) return p;
    const candidates = owners.flatMap(b => [
      { x: b.left, y: p.y }, { x: b.right, y: p.y },
      { x: p.x, y: b.top }, { x: p.x, y: b.bottom },
    ]).filter(q => !boxes.some(b => inside(q, b)));
    return candidates.sort((a, b) => distance(p, a) - distance(p, b))[0] ?? p;
  };
  const anchors = [escape(from), ...(via ? [escape(via)] : []), escape(to)];
  const points: RoutePoint[] = [from];
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1]!, b = anchors[i]!;
    points.push(...clearRoute(a, b, boxes, previous));
    points.push(b);
  }
  points.push(to);
  return points.filter((p, i) => !i || distance(p, points[i - 1]!) > 0.01);
}

/** Small rounded bends retain clearance; their control hull stays inside the route's bounds. */
export function jumperPath(points: RoutePoint[]): string {
  const coord = (p: RoutePoint) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  let d = `M ${coord(points[0]!)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!, b = points[i]!, c = points[i + 1]!;
    const radius = Math.min(CLEARANCE / 2, distance(a, b) / 3, distance(b, c) / 3);
    const approach = { x: b.x + (a.x - b.x) * radius / distance(a, b), y: b.y + (a.y - b.y) * radius / distance(a, b) };
    const depart = { x: b.x + (c.x - b.x) * radius / distance(b, c), y: b.y + (c.y - b.y) * radius / distance(b, c) };
    d += ` L ${coord(approach)} C ${coord(b)} ${coord(b)} ${coord(depart)}`;
  }
  if (points.length > 1) d += ` L ${coord(points[points.length - 1]!)}`;
  return d;
}
