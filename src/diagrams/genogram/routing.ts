import type { LayoutEdge, LayoutNode, LayoutResult, Relationship } from "../../core/types";
import { edgeLabelObstacles, labelLeader, labelOverlap, placeLabel, type LabelBox, type LabelPoint } from "../../core/label-placement";
import { estimateTextWidth } from "../../core/text-metrics";
import { captionGeometry, structuralCaptions, type RelationshipCaption } from "./captions";
import { emotionalForm, emotionalPaths, relationshipPoints } from "./line-forms";
import { individualPerimeter } from "./symbols";

export const EMOTIONAL_REL_TYPES = new Set([
  "harmony", "close", "bestfriends", "love", "inlove", "friendship",
  "hostile", "conflict", "enmity", "distant-hostile", "cutoff",
  "close-hostile", "fused", "fused-hostile", "distant", "normal", "nevermet",
  "abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect",
  "manipulative", "controlling", "jealous", "focused", "focused-neg",
  "distrust", "admirer", "limerence",
]);
const GAP = 4;
const expand = (b: LabelBox, amount: number): LabelBox => ({
  x: b.x - amount, y: b.y - amount, width: b.width + amount * 2, height: b.height + amount * 2,
});
const segmentBox = (a: LabelPoint, b: LabelPoint): LabelBox => ({
  x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y),
});

/** Slab intersection tests the segment, including horizontal/vertical segments. */
function intersects(a: LabelPoint, b: LabelPoint, box: LabelBox): boolean {
  let lo = 0, hi = 1;
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, box.x, box.x + box.width],
    [a.y, b.y - a.y, box.y, box.y + box.height],
  ]) {
    if (Math.abs(delta) < 1e-9) { if (start <= min || start >= max) return false; }
    else {
      const t0 = (min - start) / delta, t1 = (max - start) / delta;
      lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
      if (lo >= hi) return false;
    }
  }
  return true;
}

function sharesRun(a: LabelPoint, b: LabelPoint, c: LabelPoint, d: LabelPoint, clearance: number): boolean {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (!length) return false;
  const ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
  const perpendicular = (p: LabelPoint) => Math.abs((p.x - a.x) * uy - (p.y - a.y) * ux);
  if (perpendicular(c) > clearance || perpendicular(d) > clearance) return false;
  const pc = (c.x - a.x) * ux + (c.y - a.y) * uy;
  const pd = (d.x - a.x) * ux + (d.y - a.y) * uy;
  return Math.min(length, Math.max(pc, pd)) - Math.max(0, Math.min(pc, pd)) > GAP;
}

function segments(path: string): Array<[LabelPoint, LabelPoint]> {
  return path.split(/(?=M)/).flatMap(part => {
    const p = relationshipPoints(part);
    return p.slice(1).map((b, i): [LabelPoint, LabelPoint] => [p[i], b]);
  });
}

function symbolBox(node: LayoutNode): LabelBox {
  const { half } = individualPerimeter(node.individual, node.width);
  return { x: node.x + node.width / 2 - half, y: node.y + node.height / 2 - half,
    width: half * 2, height: half * 2 };
}

function reservations(nodes: LayoutNode[], edges: LayoutEdge[], fontSize: number): LabelBox[] {
  const symbols = nodes.map(symbolBox);
  return [
    ...nodes.flatMap(n => [symbolBox(n), ...captionGeometry(n, fontSize).map(c => c.box),
      ...(n.individual.status === "stillborn" ? [{ x: n.x + n.width / 2 - 8,
        y: n.y + n.height / 2 + n.width / 4 + 2, width: 16, height: 13 }] : [])]),
    ...structuralCaptions(edges, nodes, fontSize).flatMap(c => [c.box,
      ...(c.leader ? edgeLabelObstacles([c.leader.from, c.leader.to]) : [])]),
    // Crossings may pass through a span, but must stay away from its attachments and bends.
    ...edges.flatMap(e => segments(e.path).flat()).filter(p => !symbols.some(b =>
      p.x >= b.x - 0.01 && p.x <= b.x + b.width + 0.01 &&
      p.y >= b.y - 0.01 && p.y <= b.y + b.height + 0.01))
      .map(p => ({ x: p.x - 2, y: p.y - 2, width: 4, height: 4 })),
  ];
}

function paintedBoxes(edge: LayoutEdge): LabelBox[] {
  const form = emotionalForm(edge.relationship.type);
  const paths = emotionalPaths(edge.path, edge.relationship.type);
  const boxes = paths.flatMap(path => {
    const p = relationshipPoints(path);
    return p.slice(1).map((b, i) => expand(segmentBox(p[i], b), form.width / 2));
  });
  if (edge.relationship.directional) {
    // The marker is 6 stroke widths long and wide, with its tip at the endpoint.
    const p = relationshipPoints(paths[form.pattern === "broken" ? 1 : 0]), end = p[p.length - 1], prev = p[p.length - 2];
    const length = Math.hypot(end.x - prev.x, end.y - prev.y);
    const ux = (end.x - prev.x) / length, uy = (end.y - prev.y) / length;
    const back = { x: end.x - ux * form.width * 6, y: end.y - uy * form.width * 6 };
    const corners = [end, { x: back.x - uy * form.width * 3, y: back.y + ux * form.width * 3 },
      { x: back.x + uy * form.width * 3, y: back.y - ux * form.width * 3 }];
    boxes.push({ x: Math.min(...corners.map(p => p.x)), y: Math.min(...corners.map(p => p.y)),
      width: Math.max(...corners.map(p => p.x)) - Math.min(...corners.map(p => p.x)),
      height: Math.max(...corners.map(p => p.y)) - Math.min(...corners.map(p => p.y)) });
  }
  return boxes;
}

function emotionalCaption(edge: LayoutEdge, occupied: LabelBox[], routes: LabelBox[]): RelationshipCaption | undefined {
  if (!edge.relationship.label) return undefined;
  const pathPoints = relationshipPoints(edge.path);
  const size = { width: estimateTextWidth(edge.relationship.label, 10) + 8, height: 16 };
  // A straight SVG segment has only two vertices. Sample its interior too,
  // so label placement does not depend on whether the route uses L or C.
  const points = [pathPoints[0], ...pathPoints.slice(1).flatMap((end, i) => {
    const start = pathPoints[i];
    const count = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / size.height));
    return Array.from({ length: count }, (_, j) => ({
      x: start.x + (end.x - start.x) * (j + 1) / count,
      y: start.y + (end.y - start.y) * (j + 1) / count,
    }));
  })];
  const obstacles = [...occupied, ...routes, ...paintedBoxes(edge)];
  const paddedObstacles = obstacles.map(box => expand(box, GAP));
  // Search along the actual route, centre first, with deterministic ties.
  const indices = points.map((_, i) => i).sort((a, b) =>
    Math.abs(a - (points.length - 1) / 2) - Math.abs(b - (points.length - 1) / 2) || a - b);
  for (const i of indices) for (const side of [-1, 1]) {
    const p = points[i], previous = points[Math.max(0, i - 1)];
    const box = placeLabel({ x: p.x, y: p.y + side * (size.height / 2 + GAP + 6 + emotionalForm(edge.relationship.type).width / 2) }, size, paddedObstacles,
      { x: p.x - previous.x, y: p.y - previous.y });
    if (obstacles.some(other => labelOverlap(expand(box, GAP), other) > 0)) continue;
    const leader = labelLeader(box, points);
    if (leader && occupied.some(other => intersects(leader.from, leader.to, expand(other, 1)))) continue;
    return { edge, box, leader };
  }
  return undefined;
}

function captionReservations(label: RelationshipCaption): LabelBox[] {
  return [label.box, ...(label.leader ? edgeLabelObstacles([label.leader.from, label.leader.to]) : [])];
}

export function relationshipCaptions(layout: LayoutResult, fontSize: number): RelationshipCaption[] {
  const structural = layout.edges.filter(e => !EMOTIONAL_REL_TYPES.has(e.relationship.type));
  const labels = structuralCaptions(structural, layout.nodes, fontSize);
  const occupied = reservations(layout.nodes, structural, fontSize);
  const routes = [...structuralRouteBoxes(layout, structural),
    ...layout.edges.filter(e => EMOTIONAL_REL_TYPES.has(e.relationship.type)).flatMap(paintedBoxes)];
  for (const edge of layout.edges.filter(e => EMOTIONAL_REL_TYPES.has(e.relationship.type))) {
    const label = emotionalCaption(edge, occupied, routes);
    if (label) { labels.push(label); occupied.push(...captionReservations(label)); }
  }
  return labels;
}

function structuralRouteBoxes(layout: LayoutResult, structural: LayoutEdge[]): LabelBox[] {
  const routes = structural.flatMap(e => edgeLabelObstacles(relationshipPoints(e.path)));
  // Sibling brackets are drawn by the renderer, rather than stored as edges.
  for (const n of layout.nodes) {
    const sibling = layout.nodes.find(p => p.id === n.individual.siblingOf);
    if (!sibling || sibling.generation !== n.generation) continue;
    const x = n.x + n.width / 2, sx = sibling.x + sibling.width / 2, y = Math.min(n.y, sibling.y) - 12;
    routes.push(...edgeLabelObstacles([{ x, y: n.y }, { x, y }, { x: sx, y }, { x: sx, y: sibling.y }]));
  }
  return routes;
}

interface Port extends LabelPoint { dx: number; dy: number }
function ports(node: LayoutNode): Port[] {
  const b = symbolBox(node), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  const top = { x: cx, y: b.y, dx: 0, dy: -1 };
  const { shape } = individualPerimeter(node.individual, node.width);
  if (shape === "triangle" || shape === "triangle-down") return [top];
  return [top, { x: b.x, y: cy, dx: -1, dy: 0 }, { x: b.x + b.width, y: cy, dx: 1, dy: 0 }];
}

/** Round only the corners of a gutter route, keeping straight endpoint approaches. */
function roundedPath(input: LabelPoint[]): string | undefined {
  const p: LabelPoint[] = [];
  for (const point of input) {
    const last = p[p.length - 1];
    if (last && point.x === last.x && point.y === last.y) continue;
    while (p.length > 1) {
      const a = p[p.length - 2], b = p[p.length - 1];
      if ((b.x - a.x) * (point.y - b.y) !== (b.y - a.y) * (point.x - b.x)) break;
      if ((b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y) < 0) return undefined;
      p.pop();
    }
    p.push(point);
  }
  let path = `M ${p[0].x} ${p[0].y}`;
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1], b = p[i], c = p[i + 1];
    const ab = Math.hypot(b.x - a.x, b.y - a.y), bc = Math.hypot(c.x - b.x, c.y - b.y);
    const radius = Math.min(16, ab / 3, bc / 3);
    const start = { x: b.x + (a.x - b.x) * radius / ab, y: b.y + (a.y - b.y) * radius / ab };
    const end = { x: b.x + (c.x - b.x) * radius / bc, y: b.y + (c.y - b.y) * radius / bc };
    path += ` L ${start.x} ${start.y} C ${b.x} ${b.y} ${b.x} ${b.y} ${end.x} ${end.y}`;
  }
  return path + ` L ${p[p.length - 1].x} ${p[p.length - 1].y}`;
}

export function routeEmotionalEdges(layout: LayoutResult, relationships: Relationship[], fontSize: number): void {
  const structural = [...layout.edges];
  const structuralSegments = structural.flatMap(e => segments(e.path));
  const occupied = reservations(layout.nodes, structural, fontSize);
  const routes = structuralRouteBoxes(layout, structural);
  const personCaptions = layout.nodes.flatMap(n => [
    ...captionGeometry(n, fontSize).map(c => c.box),
    ...(n.individual.status === "stillborn" ? [{ x: n.x + n.width / 2 - 8,
      y: n.y + n.height / 2 + n.width / 4 + 2, width: 16, height: 13 }] : []),
  ]);
  for (const rel of relationships.filter(r => EMOTIONAL_REL_TYPES.has(r.type))) {
    const a = layout.nodes.find(n => n.id === rel.from), b = layout.nodes.find(n => n.id === rel.to);
    if (!a || !b) continue;
    const form = emotionalForm(rel.type);
    const clearance = GAP + Math.max(6 + form.width / 2, rel.directional ? form.width * 6 : 0);
    const near = (from: number, to: number) => [(from + to) / 2, from, to]
      .flatMap(v => [v, v - clearance * 2, v + clearance * 2]);
    const xs = [...new Set(occupied.flatMap(o => [o.x - clearance - 16, o.x + o.width + clearance + 16]))].sort((a, b) => a - b);
    const ys = [...new Set(occupied.flatMap(o => [o.y - clearance - 16, o.y + o.height + clearance + 16]))].sort((a, b) => a - b);
    const symbolA = symbolBox(a), symbolB = symbolBox(b);
    const hard = occupied.filter(o => !(o.x === symbolA.x && o.y === symbolA.y && o.width === symbolA.width && o.height === symbolA.height) &&
      !(o.x === symbolB.x && o.y === symbolB.y && o.width === symbolB.width && o.height === symbolB.height));
    const unrelatedSymbols = layout.nodes.filter(n => n !== a && n !== b).map(symbolBox);
    const isCaption = (o: LabelBox) => personCaptions.some(c =>
      c.x === o.x && c.y === o.y && c.width === o.width && c.height === o.height);
    const hardNonCaption = hard.filter(o => !isCaption(o));
    let best: { edge: LayoutEdge; score: number[] } | undefined;
    let leastBad: typeof best;
    const consider = (input: LabelPoint[] | string) => {
      const path = typeof input === "string" ? input : roundedPath(input);
      if (!path) return;
      const points = relationshipPoints(path);
      let length = 0, turning = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x, dy = points[i].y - points[i - 1].y;
        length += Math.hypot(dx, dy);
        if (i > 1) {
          const px = points[i - 1].x - points[i - 2].x, py = points[i - 1].y - points[i - 2].y;
          turning += Math.abs(Math.atan2(px * dy - py * dx, px * dx + py * dy));
        }
      }
      // The cost of turning at the required clearance radius. It depends only
      // on the resulting geometry, never on the candidate's input representation.
      const cost = length + clearance * turning;
      if (best && best.score.slice(0, 3).every(n => n === 0) &&
        (cost > best.score[3] || (cost === best.score[3] && length >= best.score[4]))) return;
      if (points.slice(1).some((p, i) => intersects(points[i], p, expand(symbolA, -0.01)) || intersects(points[i], p, expand(symbolB, -0.01)))) return;
      const edge: LayoutEdge = { from: rel.from, to: rel.to, relationship: rel, path };
      const boxes = paintedBoxes(edge);
      const paint = emotionalPaths(path, rel.type).flatMap(segments);
      if (paint.some(([from, to]) => intersects(from, to, expand(symbolA, -0.01)) || intersects(from, to, expand(symbolB, -0.01)))) return;
      const captionHits = personCaptions.filter(o => boxes.some(box => labelOverlap(box, expand(o, GAP)) > 0)).length;
      const symbolHits = unrelatedSymbols.filter(o => boxes.some(box => labelOverlap(box, expand(o, GAP)) > 0)).length;
      const sharedRuns = paint.filter(([a, b]) => structuralSegments.some(([c, d]) => sharesRun(a, b, c, d, form.width / 2 + 1))).length;
      const score = [captionHits, symbolHits, sharedRuns, cost, length];
      // Retain the first candidate on an exact tie, for both clear and constrained routes.
      const degradedDifference = leastBad ? score.findIndex((value, i) => value !== leastBad!.score[i]) : -1;
      if (!leastBad || (degradedDifference >= 0 && score[degradedDifference] < leastBad.score[degradedDifference])) leastBad = { edge, score };
      // A person's name is inviolable; the four pixels of air around it are only a
      // preference. Enforcing the padding as hard as the text is what exiled every tie
      // to the canvas margin — a tie that passes a few pixels from a name still reads
      // as that person's tie, while a sheet-wide detour reads as more family structure.
      // Grazing the padding still costs, through captionHits above, so a route that
      // clears it entirely continues to win whenever one exists.
      const blocked = boxes.some(box =>
        hardNonCaption.some(o => labelOverlap(box, expand(o, GAP)) > 0) ||
        personCaptions.some(o => labelOverlap(box, o) > 0));
      if (sharedRuns || blocked) return;
      const difference = best ? score.findIndex((value, i) => value !== best!.score[i]) : -1;
      if (!best || (difference >= 0 && score[difference] < best.score[difference])) best = { edge, score };
    };
    // Search from symbol clearance to the drawing's extent by doubling the
    // handle length. Both perpendicular directions are considered equally;
    // there is no case-tuned scale list or privileged upward bend.
    const extent = Math.max(clearance * 2, Math.hypot(layout.width, layout.height));
    for (const start of ports(a)) for (const end of ports(b)) {
      const s = { x: start.x + start.dx * GAP, y: start.y + start.dy * GAP };
      const e = { x: end.x + end.dx * GAP, y: end.y + end.dy * GAP };
      for (let handle = clearance * 2; handle <= extent; handle *= 2) {
        const controls = (p: LabelPoint, port: Port) => {
          const span = port.dx ? Math.abs(e.y - s.y) : Math.abs(e.x - s.x);
          const offset = Math.min(handle, Math.max(clearance * 2, span / 2));
          return [-offset, 0, offset].map(shift => ({
            x: p.x + port.dx * handle + Math.abs(port.dy) * shift,
            y: p.y + port.dy * handle + Math.abs(port.dx) * shift,
          }));
        };
        for (const c of controls(s, start)) for (const d of controls(e, end)) {
          consider(`M ${start.x} ${start.y} L ${s.x} ${s.y} C ${c.x} ${c.y} ${d.x} ${d.y} ${e.x} ${e.y} L ${end.x} ${end.y}`);
        }
      }
    }

    for (const start of ports(a)) for (const end of ports(b)) {
      const s = { x: start.x + start.dx * clearance * 2, y: start.y + start.dy * clearance * 2 };
      const e = { x: end.x + end.dx * clearance * 2, y: end.y + end.dy * clearance * 2 };
      // Gutters derived from the obstacles reach every free channel on the sheet, but the
      // nearest ones are usually taken by this pair's own descent line, so an obstacle-only
      // search walks outward until it finds a free column — at the canvas margin. Offer the
      // channels beside the pair itself as well, so a short local detour is on the menu and
      // the length term can prefer it.
      for (const x of [...near(s.x, e.x), ...xs]) {
        consider([start, s, { x, y: s.y }, { x, y: e.y }, e, end]);
      }
      for (const y of [...near(s.y, e.y), ...ys]) {
        consider([start, s, { x: s.x, y }, { x: e.x, y }, e, end]);
      }
    }
    // A side gutter plus an inter-row gutter can bypass an obstructed endpoint approach.
    if (!best) {
      for (const start of ports(a)) for (const end of ports(b)) {
        const s = { x: start.x + start.dx * clearance * 2, y: start.y + start.dy * clearance * 2 };
        const e = { x: end.x + end.dx * clearance * 2, y: end.y + end.dy * clearance * 2 };
        for (const x of [xs[0], xs[xs.length - 1]]) for (const y of ys) {
          consider([start, s, { x, y: s.y }, { x, y }, { x: e.x, y }, e, end]);
          consider([start, s, { x: s.x, y }, { x, y }, { x, y: e.y }, e, end]);
        }
      }
    }
    // The same port/gutter search always emits its least-obstructed route when none is clear.
    const selected = best ?? leastBad!;
    layout.edges.push(selected.edge);
    routes.push(...paintedBoxes(selected.edge));
  }
  if (layout.edges.length === structural.length) return;
  const bounds = [...occupied, ...routes,
    ...relationshipCaptions(layout, fontSize).flatMap(captionReservations)];
  const dx = Math.max(0, GAP - Math.min(...bounds.map(b => b.x)));
  const dy = Math.max(0, GAP - Math.min(...bounds.map(b => b.y)));
  layout.width = Math.max(layout.width, Math.max(...bounds.map(b => b.x + b.width)) + GAP) + dx;
  layout.height = Math.max(layout.height, Math.max(...bounds.map(b => b.y + b.height)) + GAP) + dy;
  for (const node of layout.nodes) { node.x += dx; node.y += dy; }
  for (const edge of layout.edges) edge.path = edge.path.replace(/([\d.e+-]+)\s+([\d.e+-]+)/g,
    (_, x: string, y: string) => `${Number(x) + dx} ${Number(y) + dy}`);
}
