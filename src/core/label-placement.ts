/** Local, deterministic label placement. All coordinates are SVG pixels. */
export interface LabelPoint { x: number; y: number }
export interface LabelBox extends LabelPoint { width: number; height: number }

// Four pixels separate painted text/backgrounds from neighbouring content.
export const LABEL_GAP = 4;
// Keep the search within one short leader of the preferred anchor.
const ALONG_LIMIT = 48;
const NORMAL_LIMIT = 40;
// Short envelopes follow diagonal/curved edges without blocking their whole bbox.
const EDGE_SAMPLE_LENGTH = 8;
const EDGE_HALF_WIDTH = 2;
// Sixteen subdivisions resolve the short cubic self-loops used by state diagrams.
const CURVE_STEPS = 16;

export function labelOverlap(a: LabelBox, b: LabelBox): number {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

/**
 * Anchor is the preferred box centre; direction is the local edge tangent.
 * Try the anchor, then forward/back along the edge, then either normal side
 * (including the same along-edge offsets). First free wins; otherwise minimise
 * total overlap area, breaking ties by this same order. Container bounds clamp
 * candidates into the interior and add its corners as fallback positions,
 * even when that requires a longer move.
 */
export function placeLabel(
  anchor: LabelPoint,
  size: Pick<LabelBox, "width" | "height">,
  occupied: readonly LabelBox[],
  direction: LabelPoint,
  bounds?: LabelBox,
): LabelBox {
  const length = Math.hypot(direction.x, direction.y);
  const tangent = length === 0 ? { x: 1, y: 0 } : { x: direction.x / length, y: direction.y / length };
  const along = Math.min(ALONG_LIMIT, Math.abs(tangent.x) * size.width + Math.abs(tangent.y) * size.height + LABEL_GAP);
  const normal = Math.min(NORMAL_LIMIT, (Math.abs(tangent.y) * size.width + Math.abs(tangent.x) * size.height) + LABEL_GAP);
  let best = { x: anchor.x - size.width / 2, y: anchor.y - size.height / 2, width: size.width, height: size.height };
  let bestOverlap = Infinity;
  const candidates: LabelBox[] = [];
  for (const perpendicular of [0, -normal, normal]) {
    for (const parallel of [0, along, -along]) {
      candidates.push({
        x: anchor.x + parallel * tangent.x - perpendicular * tangent.y - size.width / 2,
        y: anchor.y + parallel * tangent.y + perpendicular * tangent.x - size.height / 2,
        width: size.width, height: size.height,
      });
    }
  }
  if (bounds) {
    candidates.push(
      { x: bounds.x, y: bounds.y, ...size },
      { x: bounds.x + bounds.width - size.width, y: bounds.y, ...size },
      { x: bounds.x, y: bounds.y + bounds.height - size.height, ...size },
      { x: bounds.x + bounds.width - size.width, y: bounds.y + bounds.height - size.height, ...size },
    );
  }
  for (const box of candidates) {
    if (bounds) {
      box.x = Math.max(bounds.x, Math.min(bounds.x + bounds.width - box.width, box.x));
      box.y = Math.max(bounds.y, Math.min(bounds.y + bounds.height - box.height, box.y));
    }
    const padded = { x: box.x - LABEL_GAP, y: box.y - LABEL_GAP,
      width: box.width + LABEL_GAP * 2, height: box.height + LABEL_GAP * 2 };
    const overlap = occupied.reduce((sum, obstacle) => sum + labelOverlap(padded, obstacle), 0);
    if (overlap === 0) return box;
    if (overlap < bestOverlap) { best = box; bestOverlap = overlap; }
  }
  return best;
}

/** Absolute M/L/C paths emitted by the state and flowchart routers. */
export function labelPathPoints(path: string): LabelPoint[] {
  const points: LabelPoint[] = [];
  for (const command of path.matchAll(/([MLC])([^MLC]*)/g)) {
    const values = (command[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    if (command[1] === "C") {
      const start = points[points.length - 1];
      for (let step = 1; step <= CURVE_STEPS; step++) {
        const t = step / CURVE_STEPS, u = 1 - t;
        points.push({
          x: u ** 3 * start.x + 3 * u * u * t * values[0] + 3 * u * t * t * values[2] + t ** 3 * values[4],
          y: u ** 3 * start.y + 3 * u * u * t * values[1] + 3 * u * t * t * values[3] + t ** 3 * values[5],
        });
      }
    } else {
      for (let i = 0; i < values.length; i += 2) points.push({ x: values[i], y: values[i + 1] });
    }
  }
  return points;
}

export function edgeLabelObstacles(points: readonly LabelPoint[]): LabelBox[] {
  return points.slice(1).flatMap((end, index) => {
    const start = points[index];
    const count = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / EDGE_SAMPLE_LENGTH));
    return Array.from({ length: count }, (_, i) => {
      const x = start.x + (end.x - start.x) * i / count;
      const y = start.y + (end.y - start.y) * i / count;
      const dx = (end.x - start.x) / count, dy = (end.y - start.y) / count;
      return { x: Math.min(x, x + dx) - EDGE_HALF_WIDTH, y: Math.min(y, y + dy) - EDGE_HALF_WIDTH,
        width: Math.abs(dx) + EDGE_HALF_WIDTH * 2, height: Math.abs(dy) + EDGE_HALF_WIDTH * 2 };
    });
  });
}

/** Project onto the closest segment, preserving attachment to this edge. */
export function labelEdgeAnchor(anchor: LabelPoint, points: readonly LabelPoint[]): { point: LabelPoint; direction: LabelPoint } {
  let best = { point: points[0] ?? anchor, direction: { x: 1, y: 0 } };
  let distance = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const direction = { x: b.x - a.x, y: b.y - a.y };
    const squared = direction.x ** 2 + direction.y ** 2;
    if (squared === 0) continue;
    const t = Math.max(0, Math.min(1, ((anchor.x - a.x) * direction.x + (anchor.y - a.y) * direction.y) / squared));
    const point = { x: a.x + t * direction.x, y: a.y + t * direction.y };
    const d = Math.hypot(anchor.x - point.x, anchor.y - point.y);
    if (d < distance) { best = { point, direction }; distance = d; }
  }
  return best;
}

/** A short leader ends at the box boundary, never through its text. */
export function labelLeader(box: LabelBox, points: readonly LabelPoint[]): { from: LabelPoint; to: LabelPoint } | undefined {
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const from = labelEdgeAnchor(centre, points).point;
  const to = { x: Math.max(box.x, Math.min(box.x + box.width, from.x)),
    y: Math.max(box.y, Math.min(box.y + box.height, from.y)) };
  if (Math.hypot(from.x - to.x, from.y - to.y) <= LABEL_GAP) return undefined;
  return { from, to };
}
