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

// ─── Column assignment (poor-man's layered) ───────────────────

interface RefPair {
  from: string;
  to: string;
}

function buildColumnAssignment(ast: ErdAst): Map<string, number> {
  // Topological-ish layering: child (FK source) sits to the right of parent (FK target) in LR.
  // For TB we use the same numeric column → row layer.
  const ids = ast.entities.map((e) => e.id);
  const idToIdx = new Map(ids.map((id, i) => [id, i] as const));

  const pairs: RefPair[] = [];
  for (const r of ast.refs) {
    const f = parseRefSide(r.from);
    const t = parseRefSide(r.to);
    if (idToIdx.has(f.table) && idToIdx.has(t.table)) {
      // The "many" side conventionally points to the "one" side; treat the "one" side as parent.
      const oneIsTo = isOne(r.toCard) && !isOne(r.fromCard);
      const oneIsFrom = isOne(r.fromCard) && !isOne(r.toCard);
      if (oneIsTo) pairs.push({ from: t.table, to: f.table });
      else if (oneIsFrom) pairs.push({ from: f.table, to: t.table });
      else pairs.push({ from: f.table, to: t.table }); // arbitrary tie-break
    }
  }

  // Compute longest-path-from-source layer for each node (Kahn-style with relaxation; safe on cycles).
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

// ─── Main layout ──────────────────────────────────────────────

export function layoutErd(ast: ErdAst): ErdLayoutResult {
  const C = ERD_CONST;
  const isLR = ast.direction === "LR";

  // Measure all entities first.
  const measured = new Map<
    string,
    { ent: ErdEntity; width: number; height: number; rows: ErdLayoutRow[] }
  >();
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

  // v0.1 NOTE: within-layer ordering uses declaration order. A barycenter
  // sweep alone is not enough because the cursor packs vertically and ignores
  // each entity's barycenter target Y; a proper fix requires Brandes-Köpf
  // y-coordinate assignment. Tracked for v0.2.

  // Compute per-layer width (max entity width in that layer).
  const layerSizes = layers.map((l) => {
    const ids = layerToEnts.get(l)!;
    const widths = ids.map((id) => measured.get(id)!.width);
    return { layer: l, ids, maxDim: Math.max(...widths) };
  });

  const placed: ErdLayoutEntity[] = [];

  if (isLR) {
    // Columns by layer, rows stacked top-down.
    let cursorX = C.PADDING;
    for (const ls of layerSizes) {
      // Stack vertically.
      let cursorY = C.PADDING;
      for (const id of ls.ids) {
        const m = measured.get(id)!;
        const x = cursorX + (ls.maxDim - m.width) / 2;
        placed.push({
          entity: m.ent,
          x,
          y: cursorY,
          width: m.width,
          height: m.height,
          headerHeight: C.HEADER_HEIGHT,
          rows: m.rows,
        });
        cursorY += m.height + C.ROW_GAP;
      }
      cursorX += ls.maxDim + C.COL_GAP;
    }
  } else {
    // TB: rows by layer, columns stacked left-to-right.
    let cursorY = C.PADDING;
    for (const ls of layerSizes) {
      // Compute row max height instead.
      const heights = ls.ids.map((id) => measured.get(id)!.height);
      const rowMax = Math.max(...heights);
      let cursorX = C.PADDING;
      for (const id of ls.ids) {
        const m = measured.get(id)!;
        const y = cursorY + (rowMax - m.height) / 2;
        placed.push({
          entity: m.ent,
          x: cursorX,
          y,
          width: m.width,
          height: m.height,
          headerHeight: C.HEADER_HEIGHT,
          rows: m.rows,
        });
        cursorX += m.width + C.COL_GAP;
      }
      cursorY += rowMax + C.ROW_GAP;
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

  // Edges: orthogonal Manhattan.
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
    const route = routeOrthogonal(a, b, fromCol, toCol);
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

// ─── Orthogonal routing (single-bend Manhattan) ───────────────

function rowYByColumn(
  e: ErdLayoutEntity,
  col: string | undefined
): number {
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
  toCol: string | undefined
): {
  path: string;
  fromAnchor: ErdLayoutEdge["fromAnchor"];
  toAnchor: ErdLayoutEdge["toAnchor"];
  labelAt: { x: number; y: number };
} {
  const C = ERD_CONST;

  // Pick sides: prefer horizontal alignment when entities are roughly in different x-bands.
  const aCenterX = a.x + a.width / 2;
  const bCenterX = b.x + b.width / 2;
  const aCenterY = a.y + a.height / 2;
  const bCenterY = b.y + b.height / 2;

  const dx = bCenterX - aCenterX;
  const dy = bCenterY - aCenterY;

  // Default: horizontal exit.
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
    // horizontal exit, vertical entry.
    const midX = (aAnchor.x + bAnchor.x) / 2;
    // Vertical from (midX, aAnchor.y) to (midX, bAnchor.y), then horizontal to bAnchor.
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
    // vertical exit, horizontal entry.
    const midY = (aAnchor.y + bAnchor.y) / 2;
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
