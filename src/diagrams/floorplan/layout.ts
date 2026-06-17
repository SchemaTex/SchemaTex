/**
 * Floor plan — layout pass (AST → absolute geometry, meters).
 *
 * Spec: docs/reference/48-FLOORPLAN-STANDARD.md §4 (layout rules),
 * §5 (defaults), §6 (validation severities).
 *
 * Converts input units to meters (1 ft = 0.3048 m), resolves relative room
 * placement and `extend` parts (L/T/U rooms as disjoint rect unions), maps
 * openings onto wall segments (`between` → the shared-wall overlap), expands
 * furniture arrays, and runs the validation pass. Errors (room overlap,
 * non-adjacent door, out-of-room furniture) block rendering; warnings
 * (furniture collision, clamped opening) do not.
 */

import type {
  DimLineGeom,
  FloorplanAst,
  FloorplanLayoutResult,
  FloorplanOpening,
  FloorplanRoom,
  FloorplanExtend,
  FloorplanUnit,
  ItemGeom,
  OpeningGeom,
  RectM,
  RoomBox,
  SeamGeom,
  WallSide,
} from "./types";
import { FLOORPLAN_SYMBOLS } from "./catalog";

const FT = 0.3048;

export const FLOORPLAN_CONST = {
  /** Wall band thickness, meters (§5). */
  wallT: 0.2,
  /** Default render scale, px per meter (§4.1). */
  scale: 55,
  /** Jamb margin an opening keeps from the segment ends, meters (§4.3). */
  jamb: 0.05,
  /** Dimension band depth outside the plan, meters. */
  dimBand: 1.0,
  /** Outer padding, meters. */
  pad: 0.45,
  /** Offsets of the major / minor dimension rows from the plan edge, meters. */
  dimMajorOff: 0.62,
  dimMinorOff: 0.3,
};

// ─── Formatting ──────────────────────────────────────────────────

/** Format a length (meters) in the plan's display unit: "5.2 m" / "15'1\"". */
export function formatLength(m: number, unit: FloorplanUnit): string {
  if (unit === "m") {
    const v = Math.round(m * 100) / 100;
    return `${v} m`;
  }
  const ftv = m / FT;
  let f = Math.floor(ftv + 1e-6);
  let inches = Math.round((ftv - f) * 12);
  if (inches >= 12) {
    f += 1;
    inches = 0;
  }
  return inches ? `${f}'${inches}"` : `${f}'`;
}

/** Format an area (m²) in the display unit: "21.8 m²" / "832 sq ft". */
export function formatArea(areaM2: number, unit: FloorplanUnit): string {
  if (unit === "m") return `${areaM2.toFixed(1)} m²`;
  return `${Math.round(areaM2 / (FT * FT))} sq ft`;
}

const fmtNum = (v: number): string => String(Math.round(v * 100) / 100);
const snap = (v: number): number => Math.round(v * 1e6) / 1e6;

// ─── Geometry helpers ────────────────────────────────────────────

interface SharedEdge {
  vertical: boolean;
  along: number;
  lo: number;
  hi: number;
}

const ADJ_EPS = 0.051; // adjacency tolerance, m
const MIN_OVERLAP = 0.3; // minimum usable shared-wall overlap, m

function rectSharedEdge(a: RectM, b: RectM): SharedEdge | null {
  if (Math.abs(a.x + a.w - b.x) < ADJ_EPS || Math.abs(b.x + b.w - a.x) < ADJ_EPS) {
    const along = Math.abs(a.x + a.w - b.x) < ADJ_EPS ? a.x + a.w : b.x + b.w;
    const lo = Math.max(a.y, b.y);
    const hi = Math.min(a.y + a.h, b.y + b.h);
    if (hi - lo >= MIN_OVERLAP) return { vertical: true, along, lo, hi };
  }
  if (Math.abs(a.y + a.h - b.y) < ADJ_EPS || Math.abs(b.y + b.h - a.y) < ADJ_EPS) {
    const along = Math.abs(a.y + a.h - b.y) < ADJ_EPS ? a.y + a.h : b.y + b.h;
    const lo = Math.max(a.x, b.x);
    const hi = Math.min(a.x + a.w, b.x + b.w);
    if (hi - lo >= MIN_OVERLAP) return { vertical: false, along, lo, hi };
  }
  return null;
}

/** Longest shared edge across two rooms' part rectangles, with the part pair. */
function roomSharedEdge(a: RoomBox, b: RoomBox): { edge: SharedEdge; aPart: RectM; bPart: RectM } | null {
  let best: { edge: SharedEdge; aPart: RectM; bPart: RectM } | null = null;
  for (const pa of a.parts) {
    for (const pb of b.parts) {
      const e = rectSharedEdge(pa, pb);
      if (e && (!best || e.hi - e.lo > best.edge.hi - best.edge.lo)) {
        best = { edge: e, aPart: pa, bPart: pb };
      }
    }
  }
  return best;
}

function rectOverlap(a: RectM, b: RectM): { ox: number; oy: number } {
  return {
    ox: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
    oy: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y),
  };
}

/**
 * Corners of a (possibly rotated) rect given as x/y/w/h + extra envelope
 * margins, rotated about the nominal box center.
 */
function obbCorners(
  x: number,
  y: number,
  w: number,
  h: number,
  rotDeg: number,
  margins: [number, number, number, number]
): Array<[number, number]> {
  const [mt, mr, mb, ml] = margins;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const corners: Array<[number, number]> = [
    [x - ml, y - mt],
    [x + w + mr, y - mt],
    [x + w + mr, y + h + mb],
    [x - ml, y + h + mb],
  ];
  if (!rotDeg) return corners;
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return corners.map(([px, py]): [number, number] => {
    const dx = px - cx;
    const dy = py - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  });
}

/** AABB of a (possibly rotated) rect given as x/y/w/h + extra margins. */
function rotatedAabb(
  x: number,
  y: number,
  w: number,
  h: number,
  rotDeg: number,
  margins: [number, number, number, number]
): { minX: number; minY: number; maxX: number; maxY: number } {
  const corners = obbCorners(x, y, w, h, rotDeg, margins);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of corners) {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Penetration depth between two oriented boxes via the separating-axis test
 * (§6.3). 0 = no collision; otherwise the minimum overlap across all edge
 * normals — exact for rotated furniture where plain AABBs false-positive
 * (e.g. adjacent chairs on a ceremony arc).
 */
function obbPenetration(a: Array<[number, number]>, b: Array<[number, number]>): number {
  let minPen = Infinity;
  for (const poly of [a, b]) {
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      let ax = poly[j]![1] - poly[i]![1];
      let ay = poly[i]![0] - poly[j]![0];
      const len = Math.hypot(ax, ay);
      if (len < 1e-12) continue;
      ax /= len;
      ay /= len;
      let aLo = Infinity;
      let aHi = -Infinity;
      for (const [px, py] of a) {
        const v = px * ax + py * ay;
        aLo = Math.min(aLo, v);
        aHi = Math.max(aHi, v);
      }
      let bLo = Infinity;
      let bHi = -Infinity;
      for (const [px, py] of b) {
        const v = px * ax + py * ay;
        bLo = Math.min(bLo, v);
        bHi = Math.max(bHi, v);
      }
      const pen = Math.min(aHi, bHi) - Math.max(aLo, bLo);
      if (pen <= 0) return 0;
      minPen = Math.min(minPen, pen);
    }
  }
  return minPen === Infinity ? 0 : minPen;
}

// ─── Room placement ──────────────────────────────────────────────

interface Placement {
  at?: { x: number; y: number };
  rel?: { how: string; ref: string; offset?: number; align?: string };
}

/** Resolve `at`/`right-of`/… placement to an absolute top-left, meters. */
function resolvePlacement(
  p: Placement,
  w: number,
  h: number,
  byId: Map<string, number>,
  rooms: RoomBox[],
  u: number,
  who: string,
  errors: string[]
): { x: number; y: number } | null {
  if (p.at) return { x: snap(p.at.x * u), y: snap(p.at.y * u) };
  if (p.rel) {
    const refIdx = byId.get(p.rel.ref);
    if (refIdx === undefined) {
      errors.push(`${who}: unknown reference room "${p.rel.ref}" — declare it first`);
      return null;
    }
    const ref = rooms[refIdx]!;
    const off = (p.rel.offset ?? 0) * u;
    const alignPos = (refStart: number, refLen: number, len: number): number => {
      if (p.rel!.align === "center") return refStart + (refLen - len) / 2 + off;
      if (p.rel!.align === "end") return refStart + refLen - len + off;
      return refStart + off;
    };
    let x = 0;
    let y = 0;
    switch (p.rel.how) {
      case "right-of":
        x = ref.x + ref.w;
        y = alignPos(ref.y, ref.h, h);
        break;
      case "left-of":
        x = ref.x - w;
        y = alignPos(ref.y, ref.h, h);
        break;
      case "below":
        y = ref.y + ref.h;
        x = alignPos(ref.x, ref.w, w);
        break;
      case "above":
        y = ref.y - h;
        x = alignPos(ref.x, ref.w, w);
        break;
    }
    return { x: snap(x), y: snap(y) };
  }
  return { x: 0, y: 0 };
}

function refreshRoomBounds(room: RoomBox, unit: FloorplanUnit): void {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let area = 0;
  for (const p of room.parts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
    area += p.w * p.h;
  }
  room.x = snap(minX);
  room.y = snap(minY);
  room.w = snap(maxX - minX);
  room.h = snap(maxY - minY);
  room.areaM2 = area;
  room.areaText = formatArea(area, unit);
}

// ─── Side wall segments (multi-part aware) ───────────────────────

interface SideSeg {
  along: number;
  lo: number;
  hi: number;
}

/** Subtract closed intervals from [lo, hi]; returns the remaining pieces. */
function subtractIntervals(lo: number, hi: number, cuts: Array<[number, number]>): Array<[number, number]> {
  let pieces: Array<[number, number]> = [[lo, hi]];
  for (const [cLo, cHi] of cuts) {
    const next: Array<[number, number]> = [];
    for (const [pLo, pHi] of pieces) {
      if (cHi <= pLo + 1e-9 || cLo >= pHi - 1e-9) {
        next.push([pLo, pHi]);
        continue;
      }
      if (cLo > pLo + 1e-9) next.push([pLo, Math.min(cLo, pHi)]);
      if (cHi < pHi - 1e-9) next.push([Math.max(cHi, pLo), pHi]);
    }
    pieces = next;
  }
  return pieces.filter(([a, b]) => b - a > 1e-9);
}

/**
 * Exterior wall segments of a room on the given side — for multi-part rooms,
 * each part contributes its edge minus the stretches where a sibling part
 * abuts (those are interior seams, not walls). Ordered along the wall axis.
 */
function sideSegments(room: RoomBox, side: WallSide): SideSeg[] {
  const segs: SideSeg[] = [];
  for (const p of room.parts) {
    const vertical = side === "west" || side === "east";
    const along = side === "north" ? p.y : side === "south" ? p.y + p.h : side === "west" ? p.x : p.x + p.w;
    const lo = vertical ? p.y : p.x;
    const hi = vertical ? p.y + p.h : p.x + p.w;
    const cuts: Array<[number, number]> = [];
    for (const q of room.parts) {
      if (q === p) continue;
      const qNear = side === "north" ? q.y + q.h : side === "south" ? q.y : side === "west" ? q.x + q.w : q.x;
      if (Math.abs(qNear - along) >= ADJ_EPS) continue;
      const cLo = vertical ? Math.max(lo, q.y) : Math.max(lo, q.x);
      const cHi = vertical ? Math.min(hi, q.y + q.h) : Math.min(hi, q.x + q.w);
      if (cHi > cLo) cuts.push([cLo, cHi]);
    }
    for (const [sLo, sHi] of subtractIntervals(lo, hi, cuts)) {
      if (sHi - sLo >= MIN_OVERLAP) segs.push({ along, lo: sLo, hi: sHi });
    }
  }
  return segs.sort((a, b) => a.lo - b.lo || a.along - b.along);
}

// ─── Layout ──────────────────────────────────────────────────────

export function layoutFloorplan(ast: FloorplanAst): FloorplanLayoutResult {
  const u = ast.unit === "ft" ? FT : 1;
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Rooms + extensions — resolve in source order so a later room can be
  //    placed relative to an already-extended room's bounding box.
  const rooms: RoomBox[] = [];
  const byId = new Map<string, number>();
  type Stmt = { line: number; room?: FloorplanRoom; ext?: FloorplanExtend };
  const stmts: Stmt[] = [
    ...ast.rooms.map((room) => ({ line: room.line ?? 0, room })),
    ...ast.extensions.map((ext) => ({ line: ext.line ?? 0, ext })),
  ].sort((a, b) => a.line - b.line);

  for (const stmt of stmts) {
    if (stmt.room) {
      const r = stmt.room;
      const w = r.w * u;
      const h = r.h * u;
      const pos = resolvePlacement(r, w, h, byId, rooms, u, `room "${r.id}"`, errors) ?? { x: 0, y: 0 };
      const part: RectM = { x: pos.x, y: pos.y, w, h };
      const room: RoomBox = {
        id: r.id,
        label: r.label,
        x: part.x,
        y: part.y,
        w,
        h,
        parts: [part],
        areaM2: 0,
        areaText: "",
        fill: r.fill,
        nolabel: r.nolabel ?? false,
      };
      refreshRoomBounds(room, ast.unit);
      byId.set(r.id, rooms.length);
      rooms.push(room);
    } else if (stmt.ext) {
      const e = stmt.ext;
      const idx = byId.get(e.room);
      if (idx === undefined) {
        errors.push(`extend: unknown room "${e.room}" — declare it first`);
        continue;
      }
      const room = rooms[idx]!;
      const w = e.w * u;
      const h = e.h * u;
      const pos = resolvePlacement(e, w, h, byId, rooms, u, `extend "${e.room}"`, errors);
      if (!pos) continue;
      const part: RectM = { x: pos.x, y: pos.y, w, h };
      let touches = false;
      let overlaps = false;
      for (const p of room.parts) {
        const { ox, oy } = rectOverlap(p, part);
        if (ox > ADJ_EPS && oy > ADJ_EPS) overlaps = true;
        if (rectSharedEdge(p, part)) touches = true;
      }
      if (overlaps) {
        errors.push(`extend "${e.room}": extension overlaps the room's existing area — place it edge-to-edge`);
        continue;
      }
      if (!touches) {
        errors.push(`extend "${e.room}": extension does not touch the room — extensions must share an edge`);
        continue;
      }
      room.parts.push(part);
      refreshRoomBounds(room, ast.unit);
    }
  }

  // 2. Room overlap validation (§6.1) — part-vs-part across rooms.
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i]!;
      const b = rooms[j]!;
      let worst: { ox: number; oy: number } | null = null;
      for (const pa of a.parts) {
        for (const pb of b.parts) {
          const { ox, oy } = rectOverlap(pa, pb);
          if (ox > ADJ_EPS && oy > ADJ_EPS && (!worst || ox * oy > worst.ox * worst.oy)) {
            worst = { ox, oy };
          }
        }
      }
      if (worst) {
        errors.push(
          `rooms "${a.id}" and "${b.id}" overlap by ${worst.ox.toFixed(2)}×${worst.oy.toFixed(2)} m — ` +
            `move "${b.id}" right-of "${a.id}" or shrink size`
        );
      }
    }
  }

  // 3. Interior seams between parts of the same room (walls get punched).
  const seams: SeamGeom[] = [];
  for (let ri = 0; ri < rooms.length; ri++) {
    const parts = rooms[ri]!.parts;
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const e = rectSharedEdge(parts[i]!, parts[j]!);
        if (e) seams.push({ vertical: e.vertical, along: e.along, lo: e.lo, hi: e.hi, room: ri });
      }
    }
  }

  // 4. Openings.
  const openings: OpeningGeom[] = [];
  for (const op of ast.openings) {
    const geom = resolveOpening(op, rooms, byId, u, ast.unit, errors, warnings);
    if (geom) openings.push(geom);
  }

  // 5. Furniture — explicit items, then arrays (declaration order).
  const items: ItemGeom[] = [];
  const seqByType = new Map<string, number>();
  const place = (
    type: ItemGeom["type"],
    roomIdx: number,
    localX: number,
    localY: number,
    w: number,
    h: number,
    rotate: number,
    label?: string,
    seats?: string[]
  ): void => {
    const room = rooms[roomIdx]!;
    const seq = (seqByType.get(type) ?? 0) + 1;
    seqByType.set(type, seq);
    items.push({ type, x: room.x + localX, y: room.y + localY, w, h, rotate, label, seats, roomId: room.id, seq });
  };
  const roomIdxOf = (stmt: string, roomId: string | undefined, line: number | undefined): number | undefined => {
    if (!roomId) {
      errors.push(`${stmt}${line ? ` (line ${line})` : ""}: missing "in <room>"`);
      return undefined;
    }
    const idx = byId.get(roomId);
    if (idx === undefined) {
      errors.push(`${stmt}: unknown room "${roomId}"`);
      return undefined;
    }
    return idx;
  };

  for (const f of ast.furniture) {
    const def = FLOORPLAN_SYMBOLS[f.type];
    const idx = roomIdxOf(`furniture ${f.type}`, f.room, f.line);
    if (idx === undefined) continue;
    const w = f.size ? f.size.w * u : def.w;
    const h = f.size ? f.size.h * u : def.h;
    place(f.type, idx, f.x * u, f.y * u, w, h, f.rotate, f.label, f.seats);
  }

  for (const a of ast.arrays) {
    const def = FLOORPLAN_SYMBOLS[a.type];
    const idx = roomIdxOf(`${a.mode} ${a.type}`, a.room, a.line);
    if (idx === undefined) continue;
    const room = rooms[idx]!;
    const iw = a.itemsize ? a.itemsize.w * u : def.w;
    const ih = a.itemsize ? a.itemsize.h * u : def.h;
    const p1 = a.p1 ? { x: a.p1.x * u, y: a.p1.y * u } : { x: 0.5 * u, y: 0.5 * u };
    const p2 = a.p2 ? { x: a.p2.x * u, y: a.p2.y * u } : { x: room.w - 0.5 * u, y: room.h - 0.5 * u };
    if (a.mode === "grid" || a.mode === "row") {
      const nRows = a.mode === "row" ? 1 : Math.max(1, Math.round(a.rows));
      const nCols = Math.max(1, Math.round(a.cols));
      const cap = Number.isFinite(a.count) ? a.count : nRows * nCols;
      const spanW = p2.x - p1.x;
      const spanH = p2.y - p1.y;
      let placed = 0;
      for (let r = 0; r < nRows && placed < cap; r++) {
        for (let col = 0; col < nCols && placed < cap; col++) {
          const cx = p1.x + (nCols === 1 ? spanW / 2 : (col * spanW) / (nCols - 1));
          const cy = p1.y + (nRows === 1 ? spanH / 2 : (r * spanH) / (nRows - 1));
          place(a.type, idx, cx - iw / 2, cy - ih / 2, iw, ih, a.rotate);
          placed++;
        }
      }
    } else {
      // arc — items on a circular arc, rotated to face the center (§3 note).
      const n = Math.max(1, Number.isFinite(a.count) ? a.count : Math.max(1, Math.round(a.cols)));
      const cen = a.center ? { x: a.center.x * u, y: a.center.y * u } : { x: room.w / 2, y: room.h * 0.6 };
      const radius = a.radius !== undefined ? a.radius * u : Math.min(room.w, room.h) / 3;
      const a0 = ((a.fromDeg ?? 200) * Math.PI) / 180;
      const a1 = ((a.toDeg ?? 340) * Math.PI) / 180;
      for (let i = 0; i < n; i++) {
        const th = a0 + ((a1 - a0) * i) / Math.max(n - 1, 1);
        const cx = cen.x + radius * Math.cos(th);
        const cy = cen.y + radius * Math.sin(th);
        const facing = (th * 180) / Math.PI + 270; // face the arc center
        place(a.type, idx, cx - iw / 2, cy - ih / 2, iw, ih, facing + a.rotate);
      }
    }
  }

  // 6. Furniture validation (§6.3–6.4).
  const roomOf = new Map<string, RoomBox>();
  for (const r of rooms) roomOf.set(r.id, r);
  const warnItems = new Set<number>();

  for (const it of items) {
    const room = roomOf.get(it.roomId);
    if (!room) continue;
    const bb = rotatedAabb(it.x, it.y, it.w, it.h, it.rotate, [0, 0, 0, 0]);
    // bbox overshoot first (clear, quantified message)
    const over = Math.max(
      room.x - bb.minX,
      bb.maxX - (room.x + room.w),
      room.y - bb.minY,
      bb.maxY - (room.y + room.h)
    );
    if (over > 0.011) {
      errors.push(
        `furniture ${it.type} #${it.seq} extends ${fmtNum(over)} m outside room "${it.roomId}" — move it or shrink size`
      );
      continue;
    }
    // multi-part rooms: the box must also be covered by the part union
    if (room.parts.length > 1) {
      const bw = bb.maxX - bb.minX;
      const bh = bb.maxY - bb.minY;
      let covered = 0;
      for (const p of room.parts) {
        const ox = Math.min(p.x + p.w, bb.maxX) - Math.max(p.x, bb.minX);
        const oy = Math.min(p.y + p.h, bb.maxY) - Math.max(p.y, bb.minY);
        if (ox > 0 && oy > 0) covered += ox * oy;
      }
      const uncovered = bw * bh - covered;
      if (uncovered > 0.01) {
        errors.push(
          `furniture ${it.type} #${it.seq} sits outside room "${it.roomId}"'s L-shape ` +
            `(${fmtNum(uncovered)} m² past the notch) — move it onto a room part`
        );
      }
    }
  }

  const envelopes = items.map((it) => {
    const def = FLOORPLAN_SYMBOLS[it.type];
    return obbCorners(it.x, it.y, it.w, it.h, it.rotate, def.envelope ?? [0, 0, 0, 0]);
  });
  for (let i = 0; i < items.length; i++) {
    const a = items[i]!;
    if (FLOORPLAN_SYMBOLS[a.type].underlay) continue;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j]!;
      if (FLOORPLAN_SYMBOLS[b.type].underlay) continue;
      const pen = obbPenetration(envelopes[i]!, envelopes[j]!);
      if (pen > 0.011) {
        warnings.push(
          `${a.type} #${a.seq} overlaps ${b.type} #${b.seq} by ${fmtNum(pen)} m — increase spacing or reduce cols`
        );
        warnItems.add(i);
        warnItems.add(j);
      }
    }
  }

  // 7. Bounds, dims, totals.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rooms) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  if (rooms.length === 0) {
    minX = minY = 0;
    maxX = maxY = 1;
    errors.push('no rooms defined — declare at least one: room id "Label" at 0,0 size 4x3');
  }

  const dims: DimLineGeom[] = [];
  if (rooms.length > 0) {
    dims.push({
      vertical: false,
      at: minY - FLOORPLAN_CONST.dimMajorOff,
      lo: minX,
      hi: maxX,
      label: formatLength(maxX - minX, ast.unit),
      minor: false,
    });
    dims.push({
      vertical: true,
      at: minX - FLOORPLAN_CONST.dimMajorOff,
      lo: minY,
      hi: maxY,
      label: formatLength(maxY - minY, ast.unit),
      minor: false,
    });
    // Per-room dims along the top/left exteriors. Multi-part rooms contribute
    // their actual exterior wall segments on that side (an L-room's bbox
    // width would double-count its neighbor in the notch).
    const topSegs: Array<{ lo: number; hi: number }> = [];
    for (const r of rooms) {
      for (const sg of sideSegments(r, "north")) {
        if (Math.abs(sg.along - minY) < 0.01) topSegs.push({ lo: sg.lo, hi: sg.hi });
      }
    }
    if (topSegs.length > 1) {
      for (const sg of topSegs.sort((a, b) => a.lo - b.lo)) {
        dims.push({
          vertical: false,
          at: minY - FLOORPLAN_CONST.dimMinorOff,
          lo: sg.lo,
          hi: sg.hi,
          label: formatLength(sg.hi - sg.lo, ast.unit),
          minor: true,
        });
      }
    }
    const leftSegs: Array<{ lo: number; hi: number }> = [];
    for (const r of rooms) {
      for (const sg of sideSegments(r, "west")) {
        if (Math.abs(sg.along - minX) < 0.01) leftSegs.push({ lo: sg.lo, hi: sg.hi });
      }
    }
    if (leftSegs.length > 1) {
      for (const sg of leftSegs.sort((a, b) => a.lo - b.lo)) {
        dims.push({
          vertical: true,
          at: minX - FLOORPLAN_CONST.dimMinorOff,
          lo: sg.lo,
          hi: sg.hi,
          label: formatLength(sg.hi - sg.lo, ast.unit),
          minor: true,
        });
      }
    }
  }

  return {
    title: ast.title,
    unit: ast.unit,
    north: ast.north,
    rooms,
    seams,
    openings,
    items,
    dims,
    bounds: { minX, minY, maxX, maxY },
    wallT: FLOORPLAN_CONST.wallT,
    totalAreaM2: rooms.reduce((s, r) => s + r.areaM2, 0),
    errors,
    warnings,
    warnItems: [...warnItems],
  };
}

// ─── Opening resolution ──────────────────────────────────────────

function resolveOpening(
  op: FloorplanOpening,
  rooms: RoomBox[],
  byId: Map<string, number>,
  u: number,
  unit: FloorplanUnit,
  errors: string[],
  warnings: string[]
): OpeningGeom | null {
  let seg: SharedEdge | null = null;
  let owner = -1;
  let negRoom: number | undefined;
  let posRoom: number | undefined;
  let inward: 1 | -1 = 1;

  if (op.between) {
    const ia = byId.get(op.between[0]);
    const ib = byId.get(op.between[1]);
    if (ia === undefined || ib === undefined) {
      errors.push(`${op.kind}: unknown room "${ia === undefined ? op.between[0] : op.between[1]}"`);
      return null;
    }
    const a = rooms[ia]!;
    const b = rooms[ib]!;
    const found = roomSharedEdge(a, b);
    if (!found) {
      const gapX = Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w);
      const gapY = Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h);
      const axis = gapX >= gapY ? "x" : "y";
      const gap = Math.max(gapX, gapY);
      errors.push(
        gap > 0
          ? `${op.kind} between "${a.id}" and "${b.id}": rooms share no wall (gap ${fmtNum(gap)} m on ${axis}-axis)`
          : `${op.kind} between "${a.id}" and "${b.id}": rooms share no wall`
      );
      return null;
    }
    seg = found.edge;
    owner = ia;
    if (seg.vertical) {
      const aIsNeg = found.aPart.x + found.aPart.w / 2 < seg.along;
      negRoom = aIsNeg ? ia : ib;
      posRoom = aIsNeg ? ib : ia;
      inward = aIsNeg ? -1 : 1;
    } else {
      const aIsNeg = found.aPart.y + found.aPart.h / 2 < seg.along;
      negRoom = aIsNeg ? ia : ib;
      posRoom = aIsNeg ? ib : ia;
      inward = aIsNeg ? -1 : 1;
    }
  } else {
    const idx = byId.get(op.room!);
    if (idx === undefined) {
      errors.push(`${op.kind}: unknown room "${op.room}"`);
      return null;
    }
    owner = idx;
    const r = rooms[idx]!;
    const side = op.side!;
    const segs = sideSegments(r, side);
    if (segs.length === 0) {
      errors.push(`${op.kind} on "${r.id}" ${side}: that side has no exterior wall segment`);
      return null;
    }
    // pct maps along the concatenated exterior segments of that side
    const total = segs.reduce((s, sg) => s + (sg.hi - sg.lo), 0);
    const pct = Math.min(100, Math.max(0, op.pct));
    let target = (total * pct) / 100;
    let chosen = segs[segs.length - 1]!;
    for (const sg of segs) {
      const len = sg.hi - sg.lo;
      if (target <= len) {
        chosen = sg;
        break;
      }
      target -= len;
    }
    // re-express pct within the chosen segment
    const within = Math.min(1, Math.max(0, target / (chosen.hi - chosen.lo)));
    op = { ...op, pct: within * 100 };
    seg = { vertical: side === "west" || side === "east", along: chosen.along, lo: chosen.lo, hi: chosen.hi };
    switch (side) {
      case "north":
        inward = 1;
        posRoom = idx;
        break;
      case "south":
        inward = -1;
        negRoom = idx;
        break;
      case "west":
        inward = 1;
        posRoom = idx;
        break;
      case "east":
        inward = -1;
        negRoom = idx;
        break;
    }
  }

  // Position + clamp (§4.3): pct along the segment, jamb margins at the ends.
  const jamb = FLOORPLAN_CONST.jamb;
  const segLen = seg.hi - seg.lo;
  const avail = segLen - 2 * jamb;
  let wd = op.width * u;
  if (wd > avail) {
    warnings.push(
      `${op.kind}${op.room ? ` on "${op.room}" ${op.side}` : op.between ? ` between "${op.between[0]}" and "${op.between[1]}"` : ""}: ` +
        `width ${formatLength(wd, unit)} clamped to ${formatLength(avail, unit)} to fit the wall segment`
    );
    wd = avail;
  }
  const pct = Math.min(100, Math.max(0, op.pct));
  const c = seg.lo + (segLen * pct) / 100;
  const lo = Math.max(seg.lo + jamb, Math.min(c - wd / 2, seg.hi - jamb - wd));
  const hi = lo + wd;

  // Final arc direction: into the owner unless swing out.
  const arcDir: 1 | -1 = op.kind === "door" && op.swing === "out" ? (inward === 1 ? -1 : 1) : inward;

  return {
    kind: op.kind,
    doorType: op.doorType,
    windowType: op.windowType,
    vertical: seg.vertical,
    along: seg.along,
    lo,
    hi,
    inward: arcDir,
    hinge: op.hinge,
    negRoom,
    posRoom,
    owner,
  };
}
