import type {
  ErdAst,
  ErdEntity,
  ErdLayoutEdge,
  ErdLayoutEntity,
  ErdLayoutResult,
  ErdLayoutRow,
  ErdRef,
} from "../../core/types";

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

  /** Pixels between adjacent vertical-segment x-coordinates of nearby edges
   *  to keep their bend points from overlapping. */
  EDGE_BEND_STAGGER: 10,
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

export function layoutErd(ast: ErdAst): ErdLayoutResult {
  const C = ERD_CONST;
  const isLR = ast.direction === "LR";

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
      cursorX += ls.maxWidth + C.COL_GAP;
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
      cursorY += ls.maxHeight + C.ROW_GAP;
    }
  }

  // Compute overall bounds.
  let maxX = 0;
  let maxY = 0;
  for (const e of placed) {
    if (e.x + e.width > maxX) maxX = e.x + e.width;
    if (e.y + e.height > maxY) maxY = e.y + e.height;
  }
  const width = maxX + C.PADDING;
  const height = maxY + C.PADDING;

  // Edges: orthogonal Manhattan with bend-point staggering.
  const placedById = new Map(placed.map((p) => [p.entity.id, p] as const));
  const edges: ErdLayoutEdge[] = [];
  const bendBucketUses = new Map<string, number>();

  for (const r of ast.refs) {
    const fromTable = parseRefSide(r.from).table;
    const toTable = parseRefSide(r.to).table;
    const a = placedById.get(fromTable);
    const b = placedById.get(toTable);
    if (!a || !b) continue;

    const fromCol = parseRefSide(r.from).column;
    const toCol = parseRefSide(r.to).column;
    const route = routeOrthogonal(a, b, fromCol, toCol, bendBucketUses);
    edges.push({
      ref: r,
      path: route.path,
      fromAnchor: route.fromAnchor,
      toAnchor: route.toAnchor,
      labelAt: route.labelAt,
    });
  }

  return {
    ast,
    entities: placed,
    edges,
    width,
    height,
  };
}

// ─── Orthogonal routing (single-bend Manhattan w/ stagger) ────

function rowYByColumn(e: ErdLayoutEntity, col: string | undefined): number {
  if (col) {
    const idx = e.rows.findIndex((r) => r.attribute.name.toLowerCase() === col.toLowerCase());
    if (idx >= 0) return e.y + e.rows[idx]!.yCenter;
  }
  return e.y + e.height / 2;
}

function routeOrthogonal(
  a: ErdLayoutEntity,
  b: ErdLayoutEntity,
  fromCol: string | undefined,
  toCol: string | undefined,
  bendBucketUses: Map<string, number>
): {
  path: string;
  fromAnchor: ErdLayoutEdge["fromAnchor"];
  toAnchor: ErdLayoutEdge["toAnchor"];
  labelAt: { x: number; y: number };
} {
  const C = ERD_CONST;

  const aCenterX = a.x + a.width / 2;
  const bCenterX = b.x + b.width / 2;
  const aCenterY = a.y + a.height / 2;
  const bCenterY = b.y + b.height / 2;

  const dx = bCenterX - aCenterX;
  const dy = bCenterY - aCenterY;

  type Side = "left" | "right" | "top" | "bottom";
  let aSide: Side;
  let bSide: Side;
  if (Math.abs(dx) >= Math.abs(dy)) {
    aSide = dx >= 0 ? "right" : "left";
    bSide = dx >= 0 ? "left" : "right";
  } else {
    aSide = dy >= 0 ? "bottom" : "top";
    bSide = dy >= 0 ? "top" : "bottom";
  }

  const aAnchor = sideAnchor(a, aSide, fromCol);
  const bAnchor = sideAnchor(b, bSide, toCol);

  if (aSide === "right" || aSide === "left") {
    const baseMidX = (aAnchor.x + bAnchor.x) / 2;
    // Bucket by integer midX to detect collisions; stagger by use count.
    const bucketKey = `H:${Math.round(baseMidX / 4) * 4}`;
    const useIdx = bendBucketUses.get(bucketKey) ?? 0;
    bendBucketUses.set(bucketKey, useIdx + 1);
    // Alternate left / right of the base midpoint by stagger amount.
    const sign = useIdx % 2 === 0 ? 1 : -1;
    const stagger = Math.ceil(useIdx / 2) * C.EDGE_BEND_STAGGER * sign;
    const midX = baseMidX + stagger;

    const path =
      `M ${aAnchor.x} ${aAnchor.y} ` +
      `L ${midX} ${aAnchor.y} ` +
      `L ${midX} ${bAnchor.y} ` +
      `L ${bAnchor.x} ${bAnchor.y}`;
    return {
      path,
      fromAnchor: { x: aAnchor.x, y: aAnchor.y, side: aSide },
      toAnchor: { x: bAnchor.x, y: bAnchor.y, side: bSide },
      labelAt: { x: midX, y: (aAnchor.y + bAnchor.y) / 2 - C.LABEL_OFFSET },
    };
  } else {
    const baseMidY = (aAnchor.y + bAnchor.y) / 2;
    const bucketKey = `V:${Math.round(baseMidY / 4) * 4}`;
    const useIdx = bendBucketUses.get(bucketKey) ?? 0;
    bendBucketUses.set(bucketKey, useIdx + 1);
    const sign = useIdx % 2 === 0 ? 1 : -1;
    const stagger = Math.ceil(useIdx / 2) * C.EDGE_BEND_STAGGER * sign;
    const midY = baseMidY + stagger;

    const path =
      `M ${aAnchor.x} ${aAnchor.y} ` +
      `L ${aAnchor.x} ${midY} ` +
      `L ${bAnchor.x} ${midY} ` +
      `L ${bAnchor.x} ${bAnchor.y}`;
    return {
      path,
      fromAnchor: { x: aAnchor.x, y: aAnchor.y, side: aSide },
      toAnchor: { x: bAnchor.x, y: bAnchor.y, side: bSide },
      labelAt: { x: (aAnchor.x + bAnchor.x) / 2, y: midY - C.LABEL_OFFSET },
    };
  }
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
