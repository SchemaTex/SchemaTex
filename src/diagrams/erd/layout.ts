import type {
  ErdAst,
  ErdEntity,
  ErdLayoutEdge,
  ErdLayoutEntity,
  ErdLayoutResult,
  ErdLayoutRow,
  ErdRef,
} from "../../core/types";
import { labelOverlap, edgeLabelObstacles, labelPathPoints, type LabelBox } from "../../core/label-placement";
import { estimateTextWidth } from "../../core/text-metrics";
import { compactRoute, intersectsBox, orthogonalRoute, type RoutePoint } from "../logic/orthogonal-router";
import { applyPins } from "../../core/editing";

// ─── Layout constants ─────────────────────────────────────────

export const ERD_CONST = {
  ENTITY_MIN_WIDTH: 180,
  ENTITY_PADDING_X: 14,
  HEADER_HEIGHT: 28,
  ROW_HEIGHT: 22,
  ROW_PAD_Y: 4,
  COL_GAP: 90,
  ROW_GAP: 56,
  PADDING: 32,

  HEADER_FONT_PX: 13,
  ROW_FONT_PX: 12,
  MARKER_FONT_PX: 10,
  CHAR_W_HEADER: 7.6,
  CHAR_W_ROW: 6.7,
  CHAR_W_MARKER: 6,
  TYPE_GAP: 16,

  GLYPH_OFFSET: 18,           // distance from entity edge to glyph anchor
  GLYPH_FOOT_LEN: 10,         // crow's-foot fan length
  GLYPH_BAR_HALF: 6,          // bar half-length perpendicular to line
  GLYPH_CIRCLE_R: 4,          // open-circle radius
  LABEL_OFFSET: 6,
  WIRE_CLEARANCE: 20,


};

// ─── Entity sizing ────────────────────────────────────────────

function measureEntity(ent: ErdEntity): { width: number; height: number; rows: ErdLayoutRow[] } {
  const C = ERD_CONST;

  const headerWidth = C.ENTITY_PADDING_X * 2 + ent.name.length * C.CHAR_W_HEADER;

  let widest = headerWidth;
  const rows: ErdLayoutRow[] = [];
  for (let i = 0; i < ent.attributes.length; i++) {
    const a = ent.attributes[i]!;
    const namePart = a.name;
    const typePart = a.type ?? "";
    const markerCount =
      (a.pk ? 1 : 0) + (a.fk ? 1 : 0) + (a.uk ? 1 : 0) + (a.notNull && !a.pk ? 1 : 0);
    const markerWidth = markerCount * (C.CHAR_W_MARKER * 2.4 + 4);
    const w =
      C.ENTITY_PADDING_X * 2 +
      namePart.length * C.CHAR_W_ROW +
      (typePart ? C.TYPE_GAP + typePart.length * C.CHAR_W_ROW : 0) +
      markerWidth;
    if (w > widest) widest = w;

    const yCenter = C.HEADER_HEIGHT + i * C.ROW_HEIGHT + C.ROW_HEIGHT / 2;
    rows.push({ attribute: a, yCenter });
  }

  const width = Math.max(widest, C.ENTITY_MIN_WIDTH);
  const height = C.HEADER_HEIGHT + ent.attributes.length * C.ROW_HEIGHT + C.ROW_PAD_Y;
  return { width, height, rows };
}

// ─── Layer assignment ─────────────────────────────────────────

interface RefPair {
  from: string;
  to: string;
}

function buildColumnAssignment(ast: ErdAst): Map<string, number> {
  const ids = ast.entities.map((e) => e.id);
  const idToIdx = new Map(ids.map((id, i) => [id, i] as const));

  const pairs: RefPair[] = [];
  for (const r of ast.refs) {
    const f = parseRefSide(r.from);
    const t = parseRefSide(r.to);
    if (idToIdx.has(f.table) && idToIdx.has(t.table)) {
      const oneIsTo = isOne(r.toCard) && !isOne(r.fromCard);
      const oneIsFrom = isOne(r.fromCard) && !isOne(r.toCard);
      if (oneIsTo) pairs.push({ from: t.table, to: f.table });
      else if (oneIsFrom) pairs.push({ from: f.table, to: t.table });
      else pairs.push({ from: f.table, to: t.table });
    }
  }

  const layer = new Map<string, number>();
  for (const id of ids) layer.set(id, 0);
  let changed = true;
  let guard = 0;
  while (changed && guard < ids.length + 4) {
    changed = false;
    for (const p of pairs) {
      const lf = layer.get(p.from) ?? 0;
      const lt = layer.get(p.to) ?? 0;
      if (lt < lf + 1) {
        layer.set(p.to, lf + 1);
        changed = true;
      }
    }
    guard++;
  }
  return layer;
}

function parseRefSide(s: string): { table: string; column?: string } {
  const dot = s.indexOf(".");
  if (dot < 0) return { table: s };
  return { table: s.slice(0, dot), column: s.slice(dot + 1) };
}

function isOne(c: ErdRef["fromCard"]): boolean {
  return c === "one-mandatory" || c === "one-optional";
}

// ─── Within-layer barycenter ordering ─────────────────────────

/**
 * Reorder entities within each layer to reduce expected edge crossings,
 * using a multi-pass barycenter heuristic (Sugiyama phase 3). Each entity
 * is sorted by the median index of its neighbors in the adjacent layer.
 */
function reorderByBarycenter(
  layerToEnts: Map<number, string[]>,
  layers: number[],
  refs: ErdRef[]
): void {
  if (layers.length < 2) return;

  const neighbors = new Map<string, Set<string>>();
  for (const r of refs) {
    const a = parseRefSide(r.from).table;
    const b = parseRefSide(r.to).table;
    if (!neighbors.has(a)) neighbors.set(a, new Set());
    if (!neighbors.has(b)) neighbors.set(b, new Set());
    neighbors.get(a)!.add(b);
    neighbors.get(b)!.add(a);
  }

  function sweep(direction: "down" | "up"): void {
    const ordered = direction === "down" ? layers : [...layers].reverse();
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1]!;
      const cur = ordered[i]!;
      const prevList = layerToEnts.get(prev)!;
      const curList = layerToEnts.get(cur)!;
      const prevIdx = new Map(prevList.map((id, idx) => [id, idx] as const));
      const baryByEnt = new Map<string, number>();
      for (let j = 0; j < curList.length; j++) {
        const id = curList[j]!;
        const ns = neighbors.get(id);
        if (!ns) {
          baryByEnt.set(id, j);
          continue;
        }
        const indices: number[] = [];
        for (const n of ns) {
          if (prevIdx.has(n)) indices.push(prevIdx.get(n)!);
        }
        if (indices.length === 0) {
          baryByEnt.set(id, j);
        } else {
          // Median is more robust than mean for graphs with hubs.
          indices.sort((x, y) => x - y);
          const m = indices.length;
          const med = m % 2 === 1
            ? indices[(m - 1) / 2]!
            : (indices[m / 2 - 1]! + indices[m / 2]!) / 2;
          baryByEnt.set(id, med);
        }
      }
      curList.sort((a, b) => {
        const da = baryByEnt.get(a) ?? 0;
        const db = baryByEnt.get(b) ?? 0;
        if (da === db) return 0;
        return da - db;
      });
    }
  }

  // Down-up-down typically converges for ERD-shaped graphs.
  sweep("down");
  sweep("up");
  sweep("down");
}

// ─── Brandes-Köpf-lite y-coordinate assignment ────────────────

interface PlacedSlot {
  id: string;
  /** Top-edge y of the entity. */
  y: number;
  height: number;
  width: number;
  /** Order of the entity inside its layer. */
  layerOrder: number;
}

/**
 * For each layer (left-to-right), place entities at a y-coordinate that
 * approximates the average of their already-placed neighbors' y-centers.
 * Falls back to top-down packing with collision avoidance.
 *
 * After the forward pass we run a backward refinement pass — entities with
 * slack above (no forward-pass neighbor pulled them down) get nudged toward
 * their backward-pass barycenter target, which evens out chains where the
 * primary "anchor" is in a later layer.
 */
function assignYCoordinates(
  orderedLayers: { layer: number; ids: string[] }[],
  measured: Map<string, { width: number; height: number }>,
  neighbors: Map<string, Set<string>>
): Map<string, number> {
  const C = ERD_CONST;
  const placed = new Map<string, PlacedSlot>();

  // Forward pass.
  for (const ls of orderedLayers) {
    let prevBottom = C.PADDING - C.ROW_GAP;
    for (let i = 0; i < ls.ids.length; i++) {
      const id = ls.ids[i]!;
      const m = measured.get(id)!;
      const ns = neighbors.get(id);
      let target = C.PADDING;
      if (ns) {
        const placedNeighborCenters: number[] = [];
        for (const n of ns) {
          const p = placed.get(n);
          if (p) placedNeighborCenters.push(p.y + p.height / 2);
        }
        if (placedNeighborCenters.length > 0) {
          placedNeighborCenters.sort((a, b) => a - b);
          const k = placedNeighborCenters.length;
          const med = k % 2 === 1
            ? placedNeighborCenters[(k - 1) / 2]!
            : (placedNeighborCenters[k / 2 - 1]! + placedNeighborCenters[k / 2]!) / 2;
          target = med - m.height / 2;
        }
      }
      const y = Math.max(target, prevBottom + C.ROW_GAP);
      placed.set(id, {
        id,
        y,
        height: m.height,
        width: m.width,
        layerOrder: i,
      });
      prevBottom = y + m.height;
    }
  }

  // Backward refinement pass: for each layer right-to-left, try to pull
  // entities upward toward their full-graph barycenter while preserving
  // ordering and minimum spacing.
  for (let li = orderedLayers.length - 1; li >= 0; li--) {
    const ls = orderedLayers[li]!;
    let prevBottom = C.PADDING - C.ROW_GAP;
    for (let i = 0; i < ls.ids.length; i++) {
      const id = ls.ids[i]!;
      const slot = placed.get(id)!;
      const ns = neighbors.get(id);
      let target = slot.y;
      if (ns && ns.size > 0) {
        const centers: number[] = [];
        for (const n of ns) {
          const p = placed.get(n);
          if (p) centers.push(p.y + p.height / 2);
        }
        if (centers.length > 0) {
          centers.sort((a, b) => a - b);
          const k = centers.length;
          const med = k % 2 === 1
            ? centers[(k - 1) / 2]!
            : (centers[k / 2 - 1]! + centers[k / 2]!) / 2;
          target = med - slot.height / 2;
        }
      }
      // Maintain monotone non-overlap with the previous entity in this layer.
      const lower = prevBottom + C.ROW_GAP;
      // Don't move BELOW current y (forward pass already enforced that path);
      // we only relax UPWARD here so chains can pull together.
      const newY = Math.max(lower, Math.min(slot.y, target));
      slot.y = newY;
      prevBottom = newY + slot.height;
    }
  }

  const out = new Map<string, number>();
  for (const [id, p] of placed) out.set(id, p.y);
  return out;
}

// ─── Main layout ──────────────────────────────────────────────

export function layoutErd(ast: ErdAst, pins?: Map<string, { x: number; y: number }>): ErdLayoutResult {
  const C = ERD_CONST;
  const isLR = ast.direction === "LR";
  // A relationship corridor accommodates both endpoint glyphs and its text.
  const columnGap = Math.max(C.COL_GAP, ...ast.refs.map(r =>
    estimateTextWidth(r.label ?? "", 10) + 2 * (C.WIRE_CLEARANCE + 8) + 2 * C.LABEL_OFFSET));

  // Measure all entities first.
  const measured = new Map<string, { ent: ErdEntity; width: number; height: number; rows: ErdLayoutRow[] }>();
  for (const e of ast.entities) {
    const m = measureEntity(e);
    measured.set(e.id, { ent: e, ...m });
  }

  const layer = buildColumnAssignment(ast);

  // Group entities by layer.
  const layerToEnts = new Map<number, string[]>();
  for (const e of ast.entities) {
    const l = layer.get(e.id) ?? 0;
    if (!layerToEnts.has(l)) layerToEnts.set(l, []);
    layerToEnts.get(l)!.push(e.id);
  }
  const layers = Array.from(layerToEnts.keys()).sort((a, b) => a - b);

  // Within-layer ordering: barycenter sort to minimize expected crossings.
  reorderByBarycenter(layerToEnts, layers, ast.refs);

  // Build undirected neighbor map (for y-coordinate assignment).
  const neighbors = new Map<string, Set<string>>();
  for (const r of ast.refs) {
    const a = parseRefSide(r.from).table;
    const b = parseRefSide(r.to).table;
    if (!neighbors.has(a)) neighbors.set(a, new Set());
    if (!neighbors.has(b)) neighbors.set(b, new Set());
    neighbors.get(a)!.add(b);
    neighbors.get(b)!.add(a);
  }

  // Per-layer max width / max height (the layer occupies one column or one row).
  const layerSizes = layers.map((l) => {
    const ids = layerToEnts.get(l)!;
    return {
      layer: l,
      ids,
      maxWidth: Math.max(...ids.map((id) => measured.get(id)!.width)),
      maxHeight: Math.max(...ids.map((id) => measured.get(id)!.height)),
    };
  });

  // For LR: sizing dim = max width per column, ordering dim = y.
  // For TB: sizing dim = max height per row,   ordering dim = x.
  // We assign the ordering coordinate using neighbor-aware barycenter targets.
  // The "measured" map for assignYCoordinates needs the right (ordering, sizing) pair.
  const orderedLayers = layerSizes.map((ls) => ({ layer: ls.layer, ids: ls.ids }));

  // For y-assignment in LR mode (and x-assignment in TB mode), we need
  // entity height when packing y, entity width when packing x.
  const measureForOrdering = new Map<string, { width: number; height: number }>();
  if (isLR) {
    for (const [id, m] of measured) {
      measureForOrdering.set(id, { width: m.width, height: m.height });
    }
  } else {
    // Swap so the algorithm's "height" is treated as the entity's width
    // (the dimension we pack along the x axis).
    for (const [id, m] of measured) {
      measureForOrdering.set(id, { width: m.height, height: m.width });
    }
  }
  const orderingCoord = assignYCoordinates(orderedLayers, measureForOrdering, neighbors);

  const placed: ErdLayoutEntity[] = [];

  if (isLR) {
    let cursorX = C.PADDING;
    for (const ls of layerSizes) {
      for (const id of ls.ids) {
        const m = measured.get(id)!;
        const x = cursorX + (ls.maxWidth - m.width) / 2;
        const y = orderingCoord.get(id) ?? C.PADDING;
        placed.push({
          entity: m.ent,
          x,
          y,
          width: m.width,
          height: m.height,
          headerHeight: C.HEADER_HEIGHT,
          rows: m.rows,
        });
      }
      cursorX += ls.maxWidth + columnGap;
    }
  } else {
    let cursorY = C.PADDING;
    for (const ls of layerSizes) {
      for (const id of ls.ids) {
        const m = measured.get(id)!;
        // In TB mode, the ordering coord IS x (we swapped width/height above).
        const x = orderingCoord.get(id) ?? C.PADDING;
        const y = cursorY + (ls.maxHeight - m.height) / 2;
        placed.push({
          entity: m.ent,
          x,
          y,
          width: m.width,
          height: m.height,
          headerHeight: C.HEADER_HEIGHT,
          rows: m.rows,
        });
      }
      cursorY += ls.maxHeight + Math.max(C.ROW_GAP, 2 * (C.WIRE_CLEARANCE + 8) + 16 + 2 * C.LABEL_OFFSET);
    }
  }

  applyPins(placed, pins, {
    id: (entity) => entity.entity.id,
    position: () => isLR ? "move-y" : "move-x",
  });

  // Compute overall bounds.
  let maxX = 0;
  let maxY = 0;
  for (const e of placed) {
    if (e.x + e.width > maxX) maxX = e.x + e.width;
    if (e.y + e.height > maxY) maxY = e.y + e.height;
  }
  let width = maxX + C.PADDING;
  let height = maxY + C.PADDING;

  // Route around measured tables; terminal escapes reserve space for cardinality glyphs.
  const placedById = new Map(placed.map((p) => [p.entity.id, p] as const));
  const edges: ErdLayoutEdge[] = [];


  for (const r of ast.refs) {
    const fromTable = parseRefSide(r.from).table;
    const toTable = parseRefSide(r.to).table;
    const a = placedById.get(fromTable);
    const b = placedById.get(toTable);
    if (!a || !b) continue;

    const fromCol = parseRefSide(r.from).column;
    const toCol = parseRefSide(r.to).column;
    const route = routeOrthogonal(a, b, fromCol, toCol, placed, edges);
    edges.push({
      ref: r,
      path: route.path,
      fromAnchor: route.fromAnchor,
      toAnchor: route.toAnchor,
    });
  }

  const occupied: LabelBox[] = placed.map(e => ({ x: e.x, y: e.y, width: e.width, height: e.height }));
  const wireObstacles = edges.flatMap(e => [...edgeLabelObstacles(labelPathPoints(e.path)),
    ...[e.fromAnchor, e.toAnchor].map(anchor => {
      const b = glyphBox(anchor);
      return { x: b.left, y: b.top, width: b.right - b.left, height: b.bottom - b.top };
    })]);
  for (const edge of edges) {
    if (!edge.ref.label) continue;
    const box = placeRelationshipLabel(edge, [...occupied, ...wireObstacles]);
    edge.labelAt = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    occupied.push(box);
  }

  // Detours and labels can extend beyond the original table bounds.
  const points = edges.flatMap(e => labelPathPoints(e.path));
  const minX = Math.min(C.PADDING, ...points.map(p => p.x), ...occupied.map(b => b.x));
  const minY = Math.min(C.PADDING, ...points.map(p => p.y), ...occupied.map(b => b.y));
  const shiftX = C.PADDING - minX, shiftY = C.PADDING - minY;
  width = Math.max(width, ...points.map(p => p.x + C.PADDING), ...occupied.map(b => b.x + b.width + C.PADDING)) + shiftX;
  height = Math.max(height, ...points.map(p => p.y + C.PADDING), ...occupied.map(b => b.y + b.height + C.PADDING)) + shiftY;
  for (const entity of placed) { entity.x += shiftX; entity.y += shiftY; }
  for (const edge of edges) {
    edge.path = pathString(labelPathPoints(edge.path).map(p => ({ x: p.x + shiftX, y: p.y + shiftY })));
    for (const point of [edge.fromAnchor, edge.toAnchor, edge.labelAt]) {
      if (point) { point.x += shiftX; point.y += shiftY; }
    }
  }

  return {
    ast,
    entities: placed,
    edges,
    width,
    height,
  };
}

// ─── Table-aware routing and relationship labels ───────────────

function rowYByColumn(e: ErdLayoutEntity, col: string | undefined): number {
  if (col) {
    const idx = e.rows.findIndex((r) => r.attribute.name.toLowerCase() === col.toLowerCase());
    if (idx >= 0) return e.y + e.rows[idx]!.yCenter;
  }
  return e.y + e.height / 2;
}

function pathString(points: RoutePoint[]): string {
  return points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
}

type Side = ErdLayoutEdge["fromAnchor"]["side"];
const DIRECTIONS = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } };

function glyphBox(anchor: ErdLayoutEdge["fromAnchor"]) {
  const d = DIRECTIONS[anchor.side];
  const end = { x: anchor.x + d.x * (ERD_CONST.GLYPH_OFFSET + ERD_CONST.GLYPH_CIRCLE_R),
    y: anchor.y + d.y * (ERD_CONST.GLYPH_OFFSET + ERD_CONST.GLYPH_CIRCLE_R) };
  return { left: Math.min(anchor.x, end.x) - 8, right: Math.max(anchor.x, end.x) + 8,
    top: Math.min(anchor.y, end.y) - 8, bottom: Math.max(anchor.y, end.y) + 8 };
}

function routeOrthogonal(
  a: ErdLayoutEntity,
  b: ErdLayoutEntity,
  fromCol: string | undefined,
  toCol: string | undefined,
  entities: ErdLayoutEntity[],
  previous: ErdLayoutEdge[],
): Pick<ErdLayoutEdge, "path" | "fromAnchor" | "toAnchor"> {
  const clearance = ERD_CONST.WIRE_CLEARANCE;
  const boxes = entities.map(e => ({ left: e.x - clearance, right: e.x + e.width + clearance,
    top: e.y - clearance, bottom: e.y + e.height + clearance }));
  const ports = (e: ErdLayoutEntity, other: ErdLayoutEntity, col: string | undefined) => {
    // A field reference must terminate on its row, not on the table header.
    const sides: Side[] = col ? ["left", "right"] : ["right", "left", "bottom", "top"];
    return sides.map(side => {
      const anchor = { ...sideAnchor(e, side, col), side };
      if (!col) {
        const verticalSide = side === "left" || side === "right";
        const key = verticalSide ? "y" : "x";
        const min = verticalSide ? e.y + 12 : e.x + 12;
        const max = verticalSide ? e.y + e.height - 12 : e.x + e.width - 12;
        const used = previous.flatMap(edge => [edge.fromAnchor, edge.toAnchor])
          .filter(p => p.side === side && (verticalSide ? p.x === anchor.x : p.y === anchor.y));
        const toward = verticalSide
          ? Math.sign(other.y + other.height / 2 - anchor.y) || 1
          : Math.sign(other.x + other.width / 2 - anchor.x) || 1;
        const offsets = [0, ...Array.from({ length: Math.ceil((max - min) / 22) }, (_, i) => i + 1).flatMap(i => [toward * i * 22, -toward * i * 22])];
        const position = offsets.map(offset => anchor[key] + offset).find(value => value >= min && value <= max && used.every(p => Math.abs(p[key] - value) >= 14));
        if (position === undefined) return undefined;
        anchor[key] = position;
      }
      const d = DIRECTIONS[side];
      return { anchor, escape: { x: anchor.x + d.x * (clearance + 8), y: anchor.y + d.y * (clearance + 8) } };
    }).filter(p => p !== undefined).filter(p => !entities.some((other, i) => other !== e && intersectsBox(p.anchor, p.escape, boxes[i]!)));
  };
  let best: ReturnType<typeof routeOrthogonal> | undefined;
  let bestCost = Infinity;
  for (const source of ports(a, b, fromCol)) for (const target of ports(b, a, toCol)) {
    if (a === b && source.anchor.side === target.anchor.side) continue;
    const glyphs = previous.flatMap(edge => [edge.fromAnchor, edge.toAnchor])
      // An explicitly shared field may legitimately reuse its own endpoint.
      .filter(p => ![source.anchor, target.anchor].some(a => a.x === p.x && a.y === p.y && a.side === p.side))
      .map(glyphBox);
    if (glyphs.some(box => intersectsBox(source.anchor, source.escape, box) || intersectsBox(target.anchor, target.escape, box))) continue;
    let middle: RoutePoint[];
    try { middle = orthogonalRoute(source.escape, target.escape, [...boxes, ...glyphs],
      previous.map((edge, i) => ({ net: String(i), points: labelPathPoints(edge.path) })), "relationship"); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("No obstacle-free orthogonal route")) throw error;
      continue;
    }
    const points = compactRoute([source.anchor, ...middle, target.anchor]);
    let cost = (points.length - 2) * 28;
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1]!, q = points[i]!;
      cost += Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
      // Relationships may cross, but shared-looking strokes are ambiguous in an ERD.
      for (const edge of previous) {
        const other = labelPathPoints(edge.path);
        for (let j = 1; j < other.length; j++) {
          const r = other[j - 1]!, t = other[j]!;
          const vertical = p.x === q.x;
          if (vertical === (r.x === t.x)) {
            const separation = vertical ? Math.abs(p.x - r.x) : Math.abs(p.y - r.y);
            const overlap = vertical
              ? Math.min(Math.max(p.y, q.y), Math.max(r.y, t.y)) - Math.max(Math.min(p.y, q.y), Math.min(r.y, t.y))
              : Math.min(Math.max(p.x, q.x), Math.max(r.x, t.x)) - Math.max(Math.min(p.x, q.x), Math.min(r.x, t.x));
            if (separation < 8 && overlap > 0) cost += overlap * 2;
          } else {
            const v = vertical ? [p, q] : [r, t], h = vertical ? [r, t] : [p, q];
            if (v[0]!.x > Math.min(h[0]!.x, h[1]!.x) && v[0]!.x < Math.max(h[0]!.x, h[1]!.x) &&
                h[0]!.y > Math.min(v[0]!.y, v[1]!.y) && h[0]!.y < Math.max(v[0]!.y, v[1]!.y)) cost += 28;
          }
        }
      }
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = { path: pathString(points), fromAnchor: { ...source.anchor }, toAnchor: { ...target.anchor } };
    }
  }
  if (!best) throw new Error("ERD relationship has no clear terminal escape");
  return best;
}

function placeRelationshipLabel(edge: ErdLayoutEdge, occupied: LabelBox[]): LabelBox {
  const points = labelPathPoints(edge.path);
  const width = estimateTextWidth(edge.ref.label!, 10) + 8, height = 16;
  const candidates: { box: LabelBox; preference: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    const horizontal = a.y === b.y;
    const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    for (const fraction of [0.5, 0.25, 0.75]) {
      const x = a.x + (b.x - a.x) * fraction, y = a.y + (b.y - a.y) * fraction;
      for (const side of [-1, 1]) {
        const box = horizontal
          ? { x: x - width / 2, y: y + (side < 0 ? -height - ERD_CONST.LABEL_OFFSET : ERD_CONST.LABEL_OFFSET), width, height }
          : { x: x + (side < 0 ? -width - ERD_CONST.LABEL_OFFSET : ERD_CONST.LABEL_OFFSET), y: y - height / 2, width, height };
        candidates.push({ box, preference: (horizontal ? 0 : 20) + (side < 0 ? 0 : 4) +
          Math.max(0, (horizontal ? width : height) - length) + Math.abs(fraction - 0.5) * 8 });
      }
    }
  }
  const ranked = candidates.map(candidate => ({ ...candidate, overlap: occupied.reduce((sum, obstacle) =>
    sum + labelOverlap({ x: candidate.box.x - 3, y: candidate.box.y - 3,
      width: candidate.box.width + 6, height: candidate.box.height + 6 }, obstacle), 0) }));
  ranked.sort((a, b) => a.overlap - b.overlap || a.preference - b.preference);
  return ranked[0]!.box;
}

function sideAnchor(
  e: ErdLayoutEntity,
  side: "left" | "right" | "top" | "bottom",
  col: string | undefined
): { x: number; y: number } {
  switch (side) {
    case "right":
      return { x: e.x + e.width, y: rowYByColumn(e, col) };
    case "left":
      return { x: e.x, y: rowYByColumn(e, col) };
    case "top":
      return { x: e.x + e.width / 2, y: e.y };
    case "bottom":
      return { x: e.x + e.width / 2, y: e.y + e.height };
  }
}
