/**
 * Floor plan — layout pass (AST → absolute geometry, meters).
 *
 * Spec: docs/reference/48-FLOORPLAN-STANDARD.md §4 (layout rules),
 * §5 (defaults), §6 (validation severities).
 *
 * Converts input units to meters (1 ft = 0.3048 m), resolves relative room
 * placement and `extend` parts (L/T/U rooms as disjoint rect unions), maps
 * openings onto wall segments (`between` → the shared-wall overlap), expands
 * furniture arrays, and runs the validation pass. Structural errors (room
 * overlap, non-adjacent door) block rendering; authored furniture overshoot,
 * furniture collision, and clamped openings warn without changing geometry.
 */

import type {
  DimLineGeom,
  FloorplanAst,
  FloorplanLayoutResult,
  FloorplanOpening,
  FloorplanRoom,
  FloorplanExtend,
  FloorplanGeometryDiagnostic,
  FloorplanUnit,
  FloorPlate,
  ItemGeom,
  OpeningGeom,
  RectM,
  RoomBox,
  SeamGeom,
  WallGeom,
  WallSide,
  ZoneGeom,
} from "./types";
import { FLOORPLAN_SYMBOLS } from "./catalog";
import { finalizeEvacuationLayout } from "./evacuation";
import { finalizeStageplotLayout } from "./stageplot";

const FT = 0.3048;

/** Directional fixture glyphs are authored with their wall edge facing north. */
const WALL_FIXTURE_ROTATION: Record<WallSide, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

/** Floor-covering surfaces may sit behind a label; overhead/MEP symbols may not. */
const LABEL_SURFACE_TYPES: ReadonlySet<ItemGeom["type"]> = new Set([
  "rug",
  "dance-floor",
  "yoga-mat",
]);

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
  /** Gap between floor plates, meters (§48.4.9). */
  floorGutter: 1.5,
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
const snap = (v: number): number => {
  const rounded = Math.round(v * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
};

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
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
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

/** Convex polygon approximating the area swept by one hinged door leaf. */
function doorSwingSector(
  opening: OpeningGeom,
  hingeAtLo: boolean,
  width: number
): Array<[number, number]> {
  const hinge: [number, number] = opening.vertical
    ? [opening.along, hingeAtLo ? opening.lo : opening.hi]
    : [hingeAtLo ? opening.lo : opening.hi, opening.along];
  const openAngle = opening.vertical
    ? (opening.inward === 1 ? 0 : Math.PI)
    : (opening.inward === 1 ? Math.PI / 2 : -Math.PI / 2);
  const closedAngle = opening.vertical
    ? (hingeAtLo ? Math.PI / 2 : -Math.PI / 2)
    : (hingeAtLo ? 0 : Math.PI);
  let delta = closedAngle - openAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const points: Array<[number, number]> = [hinge];
  const steps = 8;
  for (let step = 0; step <= steps; step++) {
    const angle = openAngle + delta * (step / steps);
    points.push([
      hinge[0] + Math.cos(angle) * width,
      hinge[1] + Math.sin(angle) * width,
    ]);
  }
  return points;
}

function doorSwingSectors(opening: OpeningGeom): Array<Array<[number, number]>> {
  if (opening.kind !== "door" || opening.doorType === "sliding" || opening.doorType === "pocket") {
    return [];
  }
  const width = opening.hi - opening.lo;
  if (opening.doorType === "double") {
    const half = width / 2;
    return [
      doorSwingSector({ ...opening, hi: opening.lo + half }, true, half),
      doorSwingSector({ ...opening, lo: opening.hi - half }, false, half),
    ];
  }
  if (opening.doorType === "bifold") return [];
  return [doorSwingSector(opening, opening.hinge !== "right", width)];
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
  reportError: (code: string, message: string) => void
): { x: number; y: number } | null {
  if (p.at) return { x: snap(p.at.x * u), y: snap(p.at.y * u) };
  if (p.rel) {
    const refIdx = byId.get(p.rel.ref);
    if (refIdx === undefined) {
      reportError(
        "floorplan/unknown-room",
        `${who}: unknown reference room "${p.rel.ref}" — declare it first`
      );
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
  const sorted = segs.sort((a, b) => a.along - b.along || a.lo - b.lo);
  const merged: SideSeg[] = [];
  for (const segment of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && Math.abs(previous.along - segment.along) < ADJ_EPS && segment.lo <= previous.hi + ADJ_EPS) {
      previous.hi = Math.max(previous.hi, segment.hi);
    } else {
      merged.push({ ...segment });
    }
  }
  return merged.sort((a, b) => a.lo - b.lo || a.along - b.along);
}

function resolveWalls(ast: FloorplanAst, rooms: RoomBox[], u: number): WallGeom[] {
  type RawWall = Pick<WallGeom, "vertical" | "along" | "lo" | "hi"> & { room: number };
  const raw: RawWall[] = [];
  for (let room = 0; room < rooms.length; room++) {
    for (const side of ["north", "south", "west", "east"] as const) {
      const vertical = side === "west" || side === "east";
      for (const segment of sideSegments(rooms[room]!, side)) {
        raw.push({ vertical, ...segment, room });
      }
    }
  }

  const groups = new Map<string, RawWall[]>();
  for (const wall of raw) {
    const key = `${wall.vertical ? "v" : "h"}:${snap(wall.along)}`;
    const group = groups.get(key) ?? [];
    group.push(wall);
    groups.set(key, group);
  }

  let exterior = FLOORPLAN_CONST.wallT;
  let interior = FLOORPLAN_CONST.wallT;
  for (const rule of ast.wallRules) {
    if (rule.scope === "exterior") exterior = rule.thickness * u;
    if (rule.scope === "interior") interior = rule.thickness * u;
  }

  const walls: WallGeom[] = [];
  for (const group of groups.values()) {
    const points = [...new Set(group.flatMap((wall) => [snap(wall.lo), snap(wall.hi)]))].sort((a, b) => a - b);
    for (let index = 0; index < points.length - 1; index++) {
      const lo = points[index]!;
      const hi = points[index + 1]!;
      if (hi - lo <= 1e-9) continue;
      const mid = (lo + hi) / 2;
      const owners = [...new Set(group.filter((wall) => wall.lo < mid && wall.hi > mid).map((wall) => wall.room))];
      if (owners.length === 0) continue;
      let thickness = owners.length > 1 ? interior : exterior;
      if (owners.length > 1) {
        const ownerIds = new Set(owners.map((owner) => rooms[owner]!.id));
        for (const rule of ast.wallRules) {
          if (rule.scope === "between" && rule.between?.every((id) => ownerIds.has(id))) {
            thickness = rule.thickness * u;
          }
        }
      }
      walls.push({
        vertical: group[0]!.vertical,
        along: group[0]!.along,
        lo,
        hi,
        thickness,
        rooms: owners,
      });
    }
  }
  return walls;
}

function rectIntersectionArea(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number }
): number {
  return Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)) *
    Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
}

/** Choose a stable, readable room-label anchor that avoids placed furniture. */
function placeRoomLabels(rooms: RoomBox[], items: ItemGeom[], openings: OpeningGeom[], zones: ZoneGeom[]): void {
  const itemBoxes = items.map((item) => {
    const envelope = FLOORPLAN_SYMBOLS[item.type].envelope ?? [0, 0, 0, 0];
    const labelClearance: [number, number, number, number] = [
      envelope[0] + 0.12,
      envelope[1] + 0.12,
      envelope[2] + 0.12,
      envelope[3] + 0.12,
    ];
    return {
      item,
      // Catalog envelopes include visible geometry outside the nominal box —
      // notably the auto-generated chair ring around dining tables.
      box: rotatedAabb(item.x, item.y, item.w, item.h, item.rotate, labelClearance),
    };
  });
  const openingBoxes = openings.flatMap((opening) => doorSwingSectors(opening).map((sector) => {
    const xs = sector.map(([x]) => x);
    const ys = sector.map(([, y]) => y);
    return {
      floor: rooms[opening.owner]?.floor,
      box: {
        minX: Math.min(...xs) - 0.04,
        maxX: Math.max(...xs) + 0.04,
        minY: Math.min(...ys) - 0.04,
        maxY: Math.max(...ys) + 0.04,
      },
    };
  }));
  const zoneLabelBoxes = zones.map((zone) => {
    const labelW = Math.min(zone.w - 0.1, Math.max(0.55, zone.label.length * 0.09));
    return {
      roomId: zone.roomId,
      box: {
        minX: zone.x + zone.w / 2 - labelW / 2,
        maxX: zone.x + zone.w / 2 + labelW / 2,
        minY: zone.y + zone.h / 2 - 0.18,
        maxY: zone.y + zone.h / 2 + 0.18,
      },
    };
  });
  for (const room of rooms) {
    if (room.nolabel || room.labelRole === "hidden") continue;
    const part = room.parts.reduce((largest, candidate) =>
      candidate.w * candidate.h > largest.w * largest.h ? candidate : largest
    );
    const widthPerCharacter = room.labelRole === "primary" ? 0.15 : room.labelRole === "secondary" ? 0.1 : 0.12;
    room.compactLabel = part.w < 1.8 || part.h < 1.6;
    const labelW = Math.min(Math.max(0.2, part.w - 0.36), Math.max(0.6, room.label.length * widthPerCharacter));
    const labelH = room.compactLabel ? 0.34 : room.labelRole === "primary" ? 0.74 : 0.65;
    const fractions = [0.5, 0.4, 0.6, 0.25, 0.75, 0.15, 0.85];
    const candidates = fractions.flatMap((fy) => fractions.map((fx) => [fx, fy] as const))
      .sort((a, b) => Math.hypot(a[0] - 0.5, a[1] - 0.5) - Math.hypot(b[0] - 0.5, b[1] - 0.5));
    let best: { x: number; y: number; score: number } | undefined;
    for (const [fx, fy] of candidates) {
      const x = part.x + part.w * fx;
      const y = part.y + part.h * fy;
      const box = { minX: x - labelW / 2, maxX: x + labelW / 2, minY: y - labelH / 2, maxY: y + labelH / 2 };
      const outside = Math.max(
        part.x + 0.18 - box.minX,
        box.maxX - (part.x + part.w - 0.18),
        part.y + 0.18 - box.minY,
        box.maxY - (part.y + part.h - 0.18),
        0
      );
      let score = outside * 1_000;
      for (const { item, box: itemBox } of itemBoxes) {
        if (item.roomId !== room.id || LABEL_SURFACE_TYPES.has(item.type)) continue;
        score += rectIntersectionArea(box, itemBox) * 100;
      }
      for (const opening of openingBoxes) {
        if (opening.floor !== room.floor) continue;
        score += rectIntersectionArea(box, opening.box) * 120;
      }
      for (const zoneLabel of zoneLabelBoxes) {
        if (zoneLabel.roomId !== room.id) continue;
        score += rectIntersectionArea(box, zoneLabel.box) * 120;
      }
      // Prefer the conventional center whenever readability is equivalent.
      score += Math.hypot(x - (part.x + part.w / 2), y - (part.y + part.h / 2)) * 0.01;
      if (!best || score < best.score) best = { x, y, score };
    }
    room.labelX = best?.x ?? part.x + part.w / 2;
    room.labelY = best?.y ?? part.y + part.h / 2;
  }
}

// ─── Layout ──────────────────────────────────────────────────────

type OneFloorResult = Omit<FloorplanLayoutResult, "plates">;

function layoutOneFloor(
  ast: FloorplanAst,
  pins?: Map<string, { x: number; y: number }>
): OneFloorResult {
  const u = ast.unit === "ft" ? FT : 1;
  const diagnostics: FloorplanGeometryDiagnostic[] = [];
  const report = (
    severity: FloorplanGeometryDiagnostic["severity"],
    code: string,
    phase: FloorplanGeometryDiagnostic["phase"],
    message: string,
    meta: Partial<Omit<FloorplanGeometryDiagnostic, "severity" | "code" | "phase" | "message">> = {}
  ): void => {
    diagnostics.push({ severity, code, phase, message, ...meta });
  };
  const error = (
    code: string,
    phase: FloorplanGeometryDiagnostic["phase"],
    message: string,
    meta?: Partial<Omit<FloorplanGeometryDiagnostic, "severity" | "code" | "phase" | "message">>
  ): void => report("error", code, phase, message, meta);
  const warning = (
    code: string,
    phase: FloorplanGeometryDiagnostic["phase"],
    message: string,
    meta?: Partial<Omit<FloorplanGeometryDiagnostic, "severity" | "code" | "phase" | "message">>
  ): void => report("warning", code, phase, message, meta);

  // Which of the checks below are fatal, and why the line sits where it does.
  //
  // Two rectangles touching is not a reason to refuse to draw a building. When
  // a stairwell lands inside a warehouse, or a door is hung between two rooms
  // that turn out not to share a wall, every other room, opening and fixture in
  // the document is still correct and still worth showing — and someone who
  // asked for a floor plan would rather have one with a visible overlap than a
  // validation panel and nothing else. Each of those sites already skips the
  // offending element and carries on; the severity alone was keeping the
  // drawing off the page. 1.0.10 made this call for furniture overshoot, and
  // the rest of the position conflicts belong on the same side of the line.
  //
  // Fatal is reserved for documents that cannot be drawn at all: a reference to
  // a room that was never declared, an extension of something that is not a
  // room, no rooms. Those are structural rather than positional — there is
  // nothing left to render, so a diagnostic is the only honest output.
  //
  // Hosts that need the old behaviour still have it: the diagnostics carry
  // `severity`, so a publication gate can refuse a drawing that warns while a
  // person asking for a plan still receives one.

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
      const pos = resolvePlacement(
        r,
        w,
        h,
        byId,
        rooms,
        u,
        `room "${r.id}"`,
        (code, message) => error(code, "placement", message, { line: r.line, floor: r.floor, entityIds: [r.id] })
      ) ?? { x: 0, y: 0 };
      const part: RectM = { x: pos.x, y: pos.y, w, h };
      const room: RoomBox = {
        id: r.id,
        label: r.label,
        labelSourceRange: r.labelSourceRange,
        sizeSourceRange: r.sizeSourceRange,
        sourceW: r.w,
        sourceH: r.h,
        x: part.x,
        y: part.y,
        w,
        h,
        parts: [part],
        areaM2: 0,
        areaText: "",
        fill: r.fill,
        nolabel: r.nolabel ?? false,
        labelRole: r.labelRole ?? "normal",
        positionMode: r.rel
          ? (r.rel.how === "right-of" || r.rel.how === "left-of" ? "move-y" : "move-x")
          : "free",
        floor: r.floor,
      };
      refreshRoomBounds(room, ast.unit);
      byId.set(r.id, rooms.length);
      rooms.push(room);
    } else if (stmt.ext) {
      const e = stmt.ext;
      const idx = byId.get(e.room);
      if (idx === undefined) {
        error("floorplan/unknown-room", "placement", `extend: unknown room "${e.room}" — declare it first`, {
          line: e.line,
          floor: e.floor,
          entityIds: [e.room],
        });
        continue;
      }
      const room = rooms[idx]!;
      const w = e.w * u;
      const h = e.h * u;
      const pos = resolvePlacement(
        e,
        w,
        h,
        byId,
        rooms,
        u,
        `extend "${e.room}"`,
        (code, message) => error(code, "placement", message, { line: e.line, floor: e.floor, entityIds: [e.room] })
      );
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
        error(
          "floorplan/invalid-extension",
          "geometry",
          `extend "${e.room}": extension overlaps the room's existing area — place it edge-to-edge`,
          { line: e.line, floor: e.floor, entityIds: [e.room] }
        );
        continue;
      }
      if (!touches) {
        error(
          "floorplan/invalid-extension",
          "topology",
          `extend "${e.room}": extension does not touch the room — extensions must share an edge`,
          { line: e.line, floor: e.floor, entityIds: [e.room] }
        );
        continue;
      }
      room.parts.push(part);
      refreshRoomBounds(room, ast.unit);
    }
  }

  // Room pins use rendered bbox top-left coordinates. Convert them back to
  // world meters using the same fixed scale/bands as the renderer, then shift
  // every room part before openings, furniture, validation, and dimensions are
  // derived so the whole plan remains internally consistent after a drop.
  if (pins?.size && rooms.length) {
    const initialMinX = Math.min(...rooms.map((room) => room.x));
    const initialMinY = Math.min(...rooms.map((room) => room.y));
    const ox = -initialMinX + FLOORPLAN_CONST.dimBand + FLOORPLAN_CONST.pad;
    const oy = -initialMinY + FLOORPLAN_CONST.dimBand + FLOORPLAN_CONST.pad;
    for (const room of rooms) {
      const pin = pins.get(room.id);
      if (!pin) continue;
      const nextX = pin.x / FLOORPLAN_CONST.scale - ox;
      const nextY = (pin.y - 40) / FLOORPLAN_CONST.scale - oy;
      const dx = room.positionMode === "move-y" ? 0 : nextX - room.x;
      const dy = room.positionMode === "move-x" ? 0 : nextY - room.y;
      room.x += dx;
      room.y += dy;
      for (const part of room.parts) {
        part.x += dx;
        part.y += dy;
      }
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
        warning(
          "floorplan/room-overlap",
          "geometry",
          `rooms "${a.id}" and "${b.id}" overlap by ${worst.ox.toFixed(2)}×${worst.oy.toFixed(2)} m — ` +
            `move "${b.id}" right-of "${a.id}" or shrink size`,
          { floor: a.floor, entityIds: [a.id, b.id] }
        );
      }
    }
  }

  // 3. Interior seams between parts of the same room (walls get punched).
  for (const rule of ast.wallRules) {
    if (rule.scope !== "between" || !rule.between) continue;
    const first = byId.get(rule.between[0]);
    const second = byId.get(rule.between[1]);
    if (first === undefined || second === undefined) {
      const missing = first === undefined ? rule.between[0] : rule.between[1];
      error("floorplan/unknown-room", "topology", `wall between: unknown room "${missing}"`, {
        line: rule.line,
        entityIds: [...rule.between],
      });
      continue;
    }
    if (!roomSharedEdge(rooms[first]!, rooms[second]!)) {
      warning(
        "floorplan/wall-no-shared-boundary",
        "topology",
        `wall between "${rule.between[0]}" and "${rule.between[1]}": rooms share no wall`,
        { line: rule.line, entityIds: [...rule.between] }
      );
    }
  }

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

  const walls = resolveWalls(ast, rooms, u);

  // 4. Openings.
  const openings: OpeningGeom[] = [];
  const openingById = new Map<string, OpeningGeom>();
  for (const op of ast.openings) {
    if (op.id && openingById.has(op.id)) {
      error("floorplan/duplicate-opening-id", "document", `opening id "${op.id}" is already in use`, {
        line: op.line,
        floor: op.floor,
        entityIds: [op.id],
      });
      continue;
    }
    const geom = resolveOpening(
      op,
      rooms,
      byId,
      openingById,
      u,
      ast.unit,
      (severity, code, phase, message) =>
        report(severity, code, phase, message, {
          line: op.line,
          floor: op.floor,
          entityIds: op.between ?? (op.room ? [op.room] : undefined),
        })
    );
    if (geom) {
      const hostWall = walls.find((wall) =>
        wall.vertical === geom.vertical &&
        Math.abs(wall.along - geom.along) < ADJ_EPS &&
        wall.lo <= geom.lo + ADJ_EPS &&
        wall.hi >= geom.hi - ADJ_EPS
      );
      if (hostWall) geom.thickness = hostWall.thickness;
      openings.push(geom);
      if (geom.id) openingById.set(geom.id, geom);
    }
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
    seats?: string[],
    labelSourceRange?: import("../../core/types").SourceRange,
    positionSourceRange?: import("../../core/types").SourceRange,
    sourceX?: number,
    sourceY?: number,
    sourceLine?: number,
    instanceId?: string,
    arrayGroup?: number,
    anchored?: boolean,
    mirror?: ItemGeom["mirror"]
  ): void => {
    const room = rooms[roomIdx]!;
    const seq = (seqByType.get(type) ?? 0) + 1;
    seqByType.set(type, seq);
    items.push({
      type,
      x: room.x + localX,
      y: room.y + localY,
      w,
      h,
      rotate,
      mirror,
      label,
      labelSourceRange,
      positionSourceRange,
      sourceX,
      sourceY,
      sourceLine,
      instanceId,
      arrayGroup,
      anchored,
      seats,
      roomId: room.id,
      floor: room.floor,
      seq,
    });
  };
  const roomIdxOf = (stmt: string, roomId: string | undefined, line: number | undefined): number | undefined => {
    if (!roomId) {
      error(
        "floorplan/missing-room",
        "placement",
        `${stmt}${line ? ` (line ${line})` : ""}: missing "in <room>"`,
        { line }
      );
      return undefined;
    }
    const idx = byId.get(roomId);
    if (idx === undefined) {
      error("floorplan/unknown-room", "placement", `${stmt}: unknown room "${roomId}"`, {
        line,
        entityIds: [roomId],
      });
      return undefined;
    }
    return idx;
  };

  for (const f of ast.furniture) {
    const def = FLOORPLAN_SYMBOLS[f.type];
    const idx = roomIdxOf(`furniture ${f.type}`, f.room, f.line);
    if (idx === undefined) continue;
    let w = f.size ? f.size.w * u : def.w;
    let h = f.size ? f.size.h * u : def.h;
    let localX = f.x * u;
    let localY = f.y * u;
    if (f.fit) {
      const room = rooms[idx]!;
      const target = room.parts.reduce((largest, part) =>
        part.w * part.h > largest.w * largest.h ? part : largest
      );
      const margin = f.fit.margin * u;
      const availableW = Math.max(0, target.w - 2 * margin);
      const availableH = Math.max(0, target.h - 2 * margin);
      const rad = (f.rotate * Math.PI) / 180;
      const envelopeW = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
      const envelopeH = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
      const fitScale = Math.min(1, availableW / envelopeW, availableH / envelopeH);
      if (!Number.isFinite(fitScale) || fitScale <= 0) {
        warning(
          "floorplan/item-cannot-fit",
          "geometry",
          `furniture ${f.type} cannot fit in "${room.id}" with ${fmtNum(margin)} m margin`,
          { line: f.line, floor: f.floor, entityIds: [room.id] }
        );
        continue;
      }
      w *= fitScale;
      h *= fitScale;
      localX = target.x + target.w / 2 - room.x - w / 2;
      localY = target.y + target.h / 2 - room.y - h / 2;
    } else if (f.anchor) {
      const room = rooms[idx]!;
      const segments = sideSegments(room, f.anchor.side);
      if (segments.length === 0) {
        warning(
          "floorplan/fixture-no-wall",
          "topology",
          `fixture ${f.type} on "${room.id}" ${f.anchor.side}: that side has no exterior wall segment`,
          { line: f.line, floor: f.floor, entityIds: [room.id] }
        );
        continue;
      }
      const total = segments.reduce((sum, segment) => sum + segment.hi - segment.lo, 0);
      let target = total * Math.min(100, Math.max(0, f.anchor.pct)) / 100;
      let chosen = segments[segments.length - 1]!;
      for (const segment of segments) {
        const length = segment.hi - segment.lo;
        if (target <= length) {
          chosen = segment;
          break;
        }
        target -= length;
      }
      const center = chosen.lo + Math.min(chosen.hi - chosen.lo, Math.max(0, target));
      if (f.anchor.side === "north" || f.anchor.side === "south") {
        localX = center - room.x - w / 2;
        localY = f.anchor.side === "north" ? chosen.along - room.y : chosen.along - room.y - h;
      } else {
        localX = f.anchor.side === "west" ? chosen.along - room.x : chosen.along - room.x - w;
        localY = center - room.y - h / 2;
      }
    }
    place(
      f.type,
      idx,
      localX,
      localY,
      w,
      h,
      f.rotate + (f.anchor && def.directional
        ? WALL_FIXTURE_ROTATION[f.anchor.side]
        : 0),
      f.label,
      f.seats,
      f.labelSourceRange,
      f.positionSourceRange,
      f.x,
      f.y,
      f.line,
      f.instanceId,
      undefined,
      f.anchor !== undefined,
      f.mirror
    );
  }

  for (let arrayIndex = 0; arrayIndex < ast.arrays.length; arrayIndex++) {
    const a = ast.arrays[arrayIndex]!;
    const def = FLOORPLAN_SYMBOLS[a.type];
    const idx = roomIdxOf(`${a.mode} ${a.type}`, a.room, a.line);
    if (idx === undefined) continue;
    const room = rooms[idx]!;
    const iw = a.itemsize ? a.itemsize.w * u : def.w;
    const ih = a.itemsize ? a.itemsize.h * u : def.h;
    const p1 = a.p1 ? { x: a.p1.x * u, y: a.p1.y * u } : { x: 0.5 * u, y: 0.5 * u };
    const p2 = a.p2 ? { x: a.p2.x * u, y: a.p2.y * u } : { x: room.w - 0.5 * u, y: room.h - 0.5 * u };
    const arrayGroup = a.line ?? -(arrayIndex + 1);
    if (a.mode === "grid" || a.mode === "row") {
      const nRows = a.mode === "row" ? 1 : a.rows;
      const nCols = a.cols;
      const cap = Number.isFinite(a.count) ? a.count : nRows * nCols;
      const gap = a.gap * u;
      let firstCenterX = p1.x;
      let firstCenterY = p1.y;
      let lastCenterX = p2.x;
      let lastCenterY = p2.y;
      if (a.placement === "within") {
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const availableW = maxX - minX;
        const availableH = maxY - minY;
        const requiredW = nCols * iw + Math.max(0, nCols - 1) * gap;
        const requiredH = nRows * ih + Math.max(0, nRows - 1) * gap;
        if (requiredW > availableW + 1e-9 || requiredH > availableH + 1e-9) {
          warning(
            "floorplan/array-does-not-fit",
            "geometry",
            `${a.mode} ${a.type} needs ${fmtNum(requiredW)}×${fmtNum(requiredH)} m for ${nRows}×${nCols} items ` +
              `with ${fmtNum(gap)} m gap, but "within" provides ${fmtNum(availableW)}×${fmtNum(availableH)} m`,
            {
              line: a.line,
              floor: a.floor,
              entityIds: [a.room ?? ""].filter(Boolean),
              hint: `Increase the within bounds, reduce rows/cols, shrink itemsize, or reduce gap.`,
            }
          );
          continue;
        }
        firstCenterX = minX + iw / 2;
        lastCenterX = maxX - iw / 2;
        firstCenterY = minY + ih / 2;
        lastCenterY = maxY - ih / 2;
      }
      const spanW = lastCenterX - firstCenterX;
      const spanH = lastCenterY - firstCenterY;
      let placed = 0;
      for (let r = 0; r < nRows && placed < cap; r++) {
        for (let col = 0; col < nCols && placed < cap; col++) {
          const cx = firstCenterX + (nCols === 1 ? spanW / 2 : (col * spanW) / (nCols - 1));
          const cy = firstCenterY + (nRows === 1 ? spanH / 2 : (r * spanH) / (nRows - 1));
          place(
            a.type,
            idx,
            cx - iw / 2,
            cy - ih / 2,
            iw,
            ih,
            a.rotate,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            a.line,
            undefined,
            arrayGroup
          );
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
        place(
          a.type,
          idx,
          cx - iw / 2,
          cy - ih / 2,
          iw,
          ih,
          facing + a.rotate,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          a.line,
          undefined,
          arrayGroup
        );
      }
    }
  }

  const zones: ZoneGeom[] = [];
  for (const authored of ast.zones) {
    const idx = roomIdxOf(`zone ${authored.id}`, authored.room, authored.line);
    if (idx === undefined) continue;
    const room = rooms[idx]!;
    const zone: ZoneGeom = {
      id: authored.id,
      label: authored.label,
      x: room.x + authored.x * u,
      y: room.y + authored.y * u,
      w: authored.w * u,
      h: authored.h * u,
      keepClear: authored.keepClear,
      roomId: room.id,
      floor: room.floor,
      sourceLine: authored.line,
    };
    const overshoot = Math.max(
      room.x - zone.x,
      zone.x + zone.w - (room.x + room.w),
      room.y - zone.y,
      zone.y + zone.h - (room.y + room.h)
    );
    if (overshoot > 0.011) {
      warning(
        "floorplan/zone-outside-room",
        "geometry",
        `zone "${zone.id}" extends ${fmtNum(overshoot)} m outside room "${room.id}"`,
        { line: authored.line, floor: authored.floor, entityIds: [zone.id, room.id] }
      );
      continue;
    }
    zones.push(zone);
  }

  placeRoomLabels(rooms, items, openings, zones);

  // 6. Furniture and protected-zone validation (§6.3–6.4).
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
      warning(
        "floorplan/item-outside-room",
        "geometry",
        `furniture ${it.type} #${it.seq} extends ${fmtNum(over)} m outside room "${it.roomId}" — move it or shrink size`
        ,
        { line: it.sourceLine, floor: it.floor, entityIds: [it.roomId] }
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
        warning(
          "floorplan/item-outside-room",
          "geometry",
          `furniture ${it.type} #${it.seq} sits outside room "${it.roomId}"'s L-shape ` +
            `(${fmtNum(uncovered)} m² past the notch) — move it onto a room part`,
          { line: it.sourceLine, floor: it.floor, entityIds: [it.roomId] }
        );
      }
    }
  }

  const envelopes = items.map((it) => {
    const def = FLOORPLAN_SYMBOLS[it.type];
    return obbCorners(it.x, it.y, it.w, it.h, it.rotate, def.envelope ?? [0, 0, 0, 0]);
  });
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = items[itemIndex]!;
    for (const zone of zones) {
      if (!zone.keepClear || zone.roomId !== item.roomId) continue;
      const zoneCorners: Array<[number, number]> = [
        [zone.x, zone.y],
        [zone.x + zone.w, zone.y],
        [zone.x + zone.w, zone.y + zone.h],
        [zone.x, zone.y + zone.h],
      ];
      const penetration = obbPenetration(envelopes[itemIndex]!, zoneCorners);
      if (penetration > 0.011) {
        warning(
          "floorplan/protected-zone-obstructed",
          "geometry",
          `furniture ${item.type} #${item.seq} obstructs keep-clear zone "${zone.label}" by ${fmtNum(penetration)} m`,
          {
            line: item.sourceLine,
            floor: item.floor,
            entityIds: [zone.id, item.roomId],
            hint: `Move the furniture outside the protected zone or resize the zone.`,
          }
        );
      }
    }
  }

  // A door arc represents reserved usable space. Validate its swept sector,
  // rather than treating the arc as decoration that furniture may cover.
  for (const opening of openings) {
    const sectors = doorSwingSectors(opening);
    if (sectors.length === 0) continue;
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex]!;
      if (item.floor !== rooms[opening.owner]?.floor || FLOORPLAN_SYMBOLS[item.type].underlay) continue;
      const penetration = Math.max(...sectors.map((sector) => obbPenetration(envelopes[itemIndex]!, sector)));
      if (penetration <= 0.011) continue;
      warning(
        "floorplan/door-swing-obstructed",
        "geometry",
        `door${opening.id ? ` "${opening.id}"` : ""} swing is obstructed by ${item.type} #${item.seq} by ${fmtNum(penetration)} m`,
        {
          line: opening.sourceLine,
          floor: item.floor,
          entityIds: [opening.id, item.roomId].filter((value): value is string => Boolean(value)),
          hint: `Move the furniture clear of the door arc, reduce its size, or change the door hinge/swing.`,
        }
      );
      warnItems.add(itemIndex);
    }
  }

  const arrayCollisions = new Map<number, { penetration: number; first: ItemGeom; second: ItemGeom }>();
  for (let i = 0; i < items.length; i++) {
    const a = items[i]!;
    if (FLOORPLAN_SYMBOLS[a.type].underlay) continue;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j]!;
      if (FLOORPLAN_SYMBOLS[b.type].underlay) continue;
      const pen = obbPenetration(envelopes[i]!, envelopes[j]!);
      if (pen > 0.011) {
        if (a.arrayGroup !== undefined && a.arrayGroup === b.arrayGroup) {
          const existing = arrayCollisions.get(a.arrayGroup);
          if (!existing || pen > existing.penetration) {
            arrayCollisions.set(a.arrayGroup, { penetration: pen, first: a, second: b });
          }
          warnItems.add(i);
          warnItems.add(j);
          continue;
        }
        warning(
          "floorplan/item-collision",
          "geometry",
          `${a.type} #${a.seq} overlaps ${b.type} #${b.seq} by ${fmtNum(pen)} m — increase spacing or reduce cols`
          ,
          { floor: a.floor, entityIds: [a.roomId] }
        );
        warnItems.add(i);
        warnItems.add(j);
      }
    }
  }
  for (const [line, collision] of arrayCollisions) {
    warning(
      "floorplan/array-pitch-too-small",
      "geometry",
      `${collision.first.type} array overlaps internally by up to ${fmtNum(collision.penetration)} m — ` +
        `increase the array bounds, add fewer rows/cols, or reduce itemsize`,
      {
        line: line > 0 ? line : undefined,
        floor: collision.first.floor,
        entityIds: [collision.first.roomId],
      }
    );
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
    error(
      "floorplan/no-rooms",
      "document",
      'no rooms defined — declare at least one: room id "Label" at 0,0 size 4x3'
    );
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
    titleSourceRange: ast.titleSourceRange,
    unit: ast.unit,
    symbols: ast.symbols,
    mode: ast.mode,
    north: ast.north,
    rooms,
    seams,
    walls,
    openings,
    items,
    controls: [],
    zones,
    dims,
    bounds: { minX, minY, maxX, maxY },
    wallT: Math.max(FLOORPLAN_CONST.wallT, ...walls.map((wall) => wall.thickness)),
    totalAreaM2: rooms.reduce((s, r) => s + r.areaM2, 0),
    errors: diagnostics.filter((entry) => entry.severity === "error").map((entry) => entry.message),
    warnings: diagnostics.filter((entry) => entry.severity === "warning").map((entry) => entry.message),
    diagnostics,
    warnItems: [...warnItems],
  };
}

const STAIR_TYPES = new Set<ItemGeom["type"]>(["stairs", "stairs-l", "stairs-u", "spiral-stairs"]);
const STAIR_ALIGN_TOLERANCE_M = 0.1;

function floorLabel(ast: FloorplanAst, level: number): string {
  const declared = ast.floors.find((floor) => floor.level === level);
  if (declared) return declared.label;
  if (level === 0) return "Ground Floor";
  if (level === 1) return "First Floor";
  return level > 1 ? `Floor ${level}` : `Basement ${-level}`;
}

function registerStairs(results: Array<{ level: number; layout: OneFloorResult }>, warnings: string[]): void {
  const byId = new Map<string, ItemGeom[]>();
  for (const { layout } of results) {
    for (const item of layout.items) {
      if (!item.instanceId || !STAIR_TYPES.has(item.type)) continue;
      const group = byId.get(item.instanceId) ?? [];
      group.push(item);
      byId.set(item.instanceId, group);
    }
  }
  for (const [id, items] of byId) {
    items.sort((a, b) => a.floor - b.floor);
    items.forEach((item, index) => {
      if (item.label === undefined) item.label = index === 0 ? "UP" : "DN";
    });
    for (let index = 1; index < items.length; index++) {
      const lower = items[index - 1];
      const upper = items[index];
      if (!lower || !upper) continue;
      if (lower.floor === upper.floor) continue;
      const offset = Math.hypot(upper.x - lower.x, upper.y - lower.y);
      if (offset <= STAIR_ALIGN_TOLERANCE_M + 1e-9) continue;
      warnings.push(
        `stairs "${id}" sits at ${lower.x.toFixed(2)},${lower.y.toFixed(2)} on floor ${lower.floor} but ` +
          `${upper.x.toFixed(2)},${upper.y.toFixed(2)} on floor ${upper.floor} (${offset.toFixed(2)} m offset) — ` +
          `a stairwell is vertically continuous; align the coordinates or use different ids for different stairs`
      );
    }
  }
}

function offsetRoom(room: RoomBox, offset: { x: number; y: number }): RoomBox {
  return {
    ...room,
    x: room.x + offset.x,
    y: room.y + offset.y,
    labelX: room.labelX === undefined ? undefined : room.labelX + offset.x,
    labelY: room.labelY === undefined ? undefined : room.labelY + offset.y,
    parts: room.parts.map((part) => ({ ...part, x: part.x + offset.x, y: part.y + offset.y })),
  };
}

function offsetOpening(
  opening: OpeningGeom,
  offset: { x: number; y: number },
  roomBase: number
): OpeningGeom {
  return {
    ...opening,
    along: opening.along + (opening.vertical ? offset.x : offset.y),
    lo: opening.lo + (opening.vertical ? offset.y : offset.x),
    hi: opening.hi + (opening.vertical ? offset.y : offset.x),
    owner: opening.owner + roomBase,
    negRoom: opening.negRoom === undefined ? undefined : opening.negRoom + roomBase,
    posRoom: opening.posRoom === undefined ? undefined : opening.posRoom + roomBase,
  };
}

function offsetWall(
  wall: WallGeom,
  offset: { x: number; y: number },
  roomBase: number
): WallGeom {
  return {
    ...wall,
    along: wall.along + (wall.vertical ? offset.x : offset.y),
    lo: wall.lo + (wall.vertical ? offset.y : offset.x),
    hi: wall.hi + (wall.vertical ? offset.y : offset.x),
    rooms: wall.rooms.map((room) => room + roomBase),
  };
}

const CONTROL_SOURCE_TYPES: ReadonlySet<ItemGeom["type"]> = new Set([
  "switch",
  "switch-3way",
  "switch-4way",
  "switch-dimmer",
  "motion-sensor",
]);

const CONTROL_TARGET_TYPES: ReadonlySet<ItemGeom["type"]> = new Set([
  "light",
  "ceiling-light",
  "recessed-light",
  "wall-light",
  "pendant-light",
  "fluorescent-light",
  "emergency-light",
]);

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      previous = saved;
    }
  }
  return row[b.length] ?? Math.max(a.length, b.length);
}

function resolveControls(ast: FloorplanAst, layout: FloorplanLayoutResult): void {
  const byInstanceId = new Map<string, number>();
  for (let index = 0; index < layout.items.length; index++) {
    const instanceId = layout.items[index]?.instanceId;
    if (instanceId !== undefined && !byInstanceId.has(instanceId)) {
      byInstanceId.set(instanceId, index);
    }
  }
  const knownIds = [...byInstanceId.keys()];
  const report = (
    code: string,
    message: string,
    line: number | undefined,
    entityIds: string[]
  ): void => {
    layout.errors.push(message);
    layout.diagnostics.push({
      severity: "error",
      code,
      phase: "topology",
      message,
      line,
      entityIds,
    });
  };
  const unknownMessage = (id: string): string => {
    const suggestion = knownIds
      .filter((knownId) => knownId !== id)
      .sort((a, b) => levenshtein(id, a) - levenshtein(id, b) || a.localeCompare(b))[0];
    return `controls: unknown instance id "${id}".${suggestion ? ` Did you mean "${suggestion}"?` : ""}`;
  };

  for (const control of ast.controls) {
    const sourceIndex = byInstanceId.get(control.source);
    const source = sourceIndex === undefined ? undefined : layout.items[sourceIndex];
    if (!source) {
      report(
        "floorplan/control-unknown-instance",
        unknownMessage(control.source),
        control.line,
        [control.source]
      );
    } else if (!CONTROL_SOURCE_TYPES.has(source.type)) {
      report(
        "floorplan/control-invalid-source",
        `controls: source "${control.source}" is ${source.type}; sources must be a switch or motion-sensor`,
        control.line,
        [control.source]
      );
    }

    for (const targetId of control.targets) {
      if (targetId === control.source) {
        report(
          "floorplan/control-self-reference",
          `controls: item "${control.source}" cannot control itself`,
          control.line,
          [control.source]
        );
        continue;
      }
      const targetIndex = byInstanceId.get(targetId);
      const target = targetIndex === undefined ? undefined : layout.items[targetIndex];
      if (targetIndex === undefined || !target) {
        report(
          "floorplan/control-unknown-instance",
          unknownMessage(targetId),
          control.line,
          [targetId]
        );
        continue;
      }
      if (!CONTROL_TARGET_TYPES.has(target.type)) {
        report(
          "floorplan/control-invalid-target",
          `controls: target "${targetId}" is ${target.type}; targets must be luminaires`,
          control.line,
          [targetId]
        );
        continue;
      }
      if (source && sourceIndex !== undefined && CONTROL_SOURCE_TYPES.has(source.type)) {
        layout.controls.push({
          source: sourceIndex,
          target: targetIndex,
          sourceId: control.source,
          targetId,
        });
      }
    }
  }
}

function crossFloorReferences(ast: FloorplanAst): {
  errors: string[];
  diagnostics: FloorplanGeometryDiagnostic[];
  invalidRooms: Set<FloorplanRoom>;
  invalidExtensions: Set<FloorplanExtend>;
  invalidOpenings: Set<FloorplanOpening>;
  invalidFurniture: Set<FloorplanAst["furniture"][number]>;
  invalidArrays: Set<FloorplanAst["arrays"][number]>;
  invalidZones: Set<FloorplanAst["zones"][number]>;
} {
  const errors: string[] = [];
  const diagnostics: FloorplanGeometryDiagnostic[] = [];
  const crossFloorError = (
    message: string,
    line?: number,
    floor?: number,
    entityIds?: string[]
  ): void => {
    errors.push(message);
    diagnostics.push({
      severity: "error",
      code: "floorplan/cross-floor-reference",
      phase: "topology",
      message,
      line,
      floor,
      entityIds,
    });
  };
  const invalidRooms = new Set<FloorplanRoom>();
  const invalidExtensions = new Set<FloorplanExtend>();
  const invalidOpenings = new Set<FloorplanOpening>();
  const invalidFurniture = new Set<FloorplanAst["furniture"][number]>();
  const invalidArrays = new Set<FloorplanAst["arrays"][number]>();
  const invalidZones = new Set<FloorplanAst["zones"][number]>();
  const floorsByRoom = new Map<string, number[]>();
  for (const room of ast.rooms) {
    const floors = floorsByRoom.get(room.id) ?? [];
    floors.push(room.floor);
    floorsByRoom.set(room.id, floors);
  }
  const floorFor = (id: string, preferred: number): number | undefined => {
    const floors = floorsByRoom.get(id);
    if (!floors) return undefined;
    return floors.includes(preferred) ? preferred : floors[0];
  };

  for (const room of ast.rooms) {
    if (!room.rel) continue;
    const refFloor = floorFor(room.rel.ref, room.floor);
    if (refFloor !== undefined && refFloor !== room.floor) {
      crossFloorError(
        `room "${room.id}" (floor ${room.floor}) references "${room.rel.ref}" (floor ${refFloor}) — ` +
          `relative placement cannot cross floors`,
        room.line,
        room.floor,
        [room.id, room.rel.ref]
      );
      invalidRooms.add(room);
    }
  }
  for (const extension of ast.extensions) {
    const targetFloor = floorFor(extension.room, extension.floor);
    const refFloor = extension.rel ? floorFor(extension.rel.ref, extension.floor) : extension.floor;
    if (
      (targetFloor !== undefined && targetFloor !== extension.floor) ||
      (refFloor !== undefined && refFloor !== extension.floor)
    ) {
      crossFloorError(
        `extend "${extension.room}" on floor ${extension.floor} references a room on another floor`,
        extension.line,
        extension.floor,
        [extension.room]
      );
      invalidExtensions.add(extension);
    }
  }
  for (const opening of ast.openings) {
    const ids = opening.between ?? (opening.room ? [opening.room] : []);
    const roomFloors = ids.map((id) => floorFor(id, opening.floor));
    if (opening.between && roomFloors[0] !== undefined && roomFloors[1] !== undefined && roomFloors[0] !== roomFloors[1]) {
      crossFloorError(
        `${opening.kind} between "${opening.between[0]}" (floor ${roomFloors[0]}) and ` +
          `"${opening.between[1]}" (floor ${roomFloors[1]}): rooms are on different floors`,
        opening.line,
        opening.floor,
        [...opening.between]
      );
      invalidOpenings.add(opening);
    } else if (roomFloors.some((floor) => floor !== undefined && floor !== opening.floor)) {
      crossFloorError(
        `${opening.kind} on floor ${opening.floor} references a room on another floor`,
        opening.line,
        opening.floor,
        ids
      );
      invalidOpenings.add(opening);
    }
  }
  for (const furniture of ast.furniture) {
    if (!furniture.room) continue;
    const roomFloor = floorFor(furniture.room, furniture.floor);
    if (roomFloor !== undefined && roomFloor !== furniture.floor) {
      crossFloorError(
        `furniture ${furniture.type}${furniture.instanceId ? ` "${furniture.instanceId}"` : ""} on floor ` +
          `${furniture.floor} references "${furniture.room}" on floor ${roomFloor}`,
        furniture.line,
        furniture.floor,
        [furniture.room]
      );
      invalidFurniture.add(furniture);
    }
  }
  for (const array of ast.arrays) {
    if (!array.room) continue;
    const roomFloor = floorFor(array.room, array.floor);
    if (roomFloor !== undefined && roomFloor !== array.floor) {
      crossFloorError(
        `${array.mode} ${array.type} on floor ${array.floor} references "${array.room}" on floor ${roomFloor}`,
        array.line,
        array.floor,
        [array.room]
      );
      invalidArrays.add(array);
    }
  }
  for (const zone of ast.zones) {
    const roomFloor = floorFor(zone.room, zone.floor);
    if (roomFloor !== undefined && roomFloor !== zone.floor) {
      crossFloorError(
        `zone "${zone.id}" on floor ${zone.floor} references "${zone.room}" on floor ${roomFloor}`,
        zone.line,
        zone.floor,
        [zone.id, zone.room]
      );
      invalidZones.add(zone);
    }
  }
  return {
    errors,
    diagnostics,
    invalidRooms,
    invalidExtensions,
    invalidOpenings,
    invalidFurniture,
    invalidArrays,
    invalidZones,
  };
}

export function layoutFloorplan(
  ast: FloorplanAst,
  pins?: Map<string, { x: number; y: number }>
): FloorplanLayoutResult {
  if (ast.floors.length === 0) {
    const layout = layoutOneFloor(ast, pins);
    const result: FloorplanLayoutResult = {
      ...layout,
      plates: [{
        level: 0,
        label: "Ground Floor",
        offset: { x: 0, y: 0 },
        bounds: { ...layout.bounds },
        areaM2: layout.totalAreaM2,
        areaText: formatArea(layout.totalAreaM2, ast.unit),
        roomIdx: layout.rooms.map((_, index) => index),
        itemIdx: layout.items.map((_, index) => index),
        zoneIdx: layout.zones.map((_, index) => index),
        openingIdx: layout.openings.map((_, index) => index),
        dimIdx: layout.dims.map((_, index) => index),
        seamIdx: layout.seams.map((_, index) => index),
      }],
    };
    resolveControls(ast, result);
    if (ast.mode === "evacuation") return finalizeEvacuationLayout(ast, result);
    if (ast.mode === "stageplot") return finalizeStageplotLayout(ast, result);
    return result;
  }

  const refs = crossFloorReferences(ast);
  const levelSet = new Set<number>(ast.floors.map((floor) => floor.level));
  for (const statement of [
    ...ast.rooms,
    ...ast.extensions,
    ...ast.openings,
    ...ast.furniture,
    ...ast.arrays,
    ...ast.zones,
  ]) {
    levelSet.add(statement.floor);
  }
  const levels = [...levelSet].sort((a, b) => ast.stack === "vertical" ? b - a : a - b);
  const perFloor = levels.map((level) => {
    const rooms = ast.rooms
      .filter((room) => room.floor === level)
      .map((room) => refs.invalidRooms.has(room) ? { ...room, rel: undefined, at: { x: 0, y: 0 } } : room);
    const subAst: FloorplanAst = {
      ...ast,
      floors: [],
      rooms,
      extensions: ast.extensions.filter((extension) => extension.floor === level && !refs.invalidExtensions.has(extension)),
      openings: ast.openings.filter((opening) => opening.floor === level && !refs.invalidOpenings.has(opening)),
      furniture: ast.furniture.filter((item) => item.floor === level && !refs.invalidFurniture.has(item)),
      arrays: ast.arrays.filter((array) => array.floor === level && !refs.invalidArrays.has(array)),
      zones: ast.zones.filter((zone) => zone.floor === level && !refs.invalidZones.has(zone)),
      wallRules: ast.wallRules.filter((rule) => rule.floor === level),
    };
    return { level, layout: layoutOneFloor(subAst) };
  });

  const stairWarnings: string[] = [];
  registerStairs(perFloor, stairWarnings);

  const rooms: RoomBox[] = [];
  const seams: SeamGeom[] = [];
  const walls: WallGeom[] = [];
  const openings: OpeningGeom[] = [];
  const items: ItemGeom[] = [];
  const zones: ZoneGeom[] = [];
  const dims: DimLineGeom[] = [];
  const plates: FloorPlate[] = [];
  const errors = [...refs.errors];
  const warnings = [...stairWarnings];
  const diagnostics: FloorplanGeometryDiagnostic[] = [
    ...refs.diagnostics,
    ...stairWarnings.map(
      (message): FloorplanGeometryDiagnostic => ({
        severity: "warning",
        code: "floorplan/stair-misalignment",
        phase: "geometry",
        message,
      })
    ),
  ];
  const warnItems: number[] = [];
  let cursor = 0;

  for (const { level, layout } of perFloor) {
    const offset = ast.stack === "horizontal"
      ? { x: snap(cursor - layout.bounds.minX), y: snap(-layout.bounds.minY) }
      : { x: snap(-layout.bounds.minX), y: snap(cursor - layout.bounds.minY) };
    const roomBase = rooms.length;
    const itemBase = items.length;
    const zoneBase = zones.length;
    const openingBase = openings.length;
    const dimBase = dims.length;
    const seamBase = seams.length;

    rooms.push(...layout.rooms.map((room) => offsetRoom(room, offset)));
    items.push(...layout.items.map((item) => ({ ...item, x: item.x + offset.x, y: item.y + offset.y })));
    zones.push(...layout.zones.map((zone) => ({ ...zone, x: zone.x + offset.x, y: zone.y + offset.y })));
    openings.push(...layout.openings.map((opening) => offsetOpening(opening, offset, roomBase)));
    walls.push(...layout.walls.map((wall) => offsetWall(wall, offset, roomBase)));
    seams.push(...layout.seams.map((seam) => ({
      ...seam,
      along: seam.along + (seam.vertical ? offset.x : offset.y),
      lo: seam.lo + (seam.vertical ? offset.y : offset.x),
      hi: seam.hi + (seam.vertical ? offset.y : offset.x),
      room: seam.room + roomBase,
    })));
    dims.push(...layout.dims.map((dim) => ({
      ...dim,
      at: dim.at + (dim.vertical ? offset.x : offset.y),
      lo: dim.lo + (dim.vertical ? offset.y : offset.x),
      hi: dim.hi + (dim.vertical ? offset.y : offset.x),
    })));
    errors.push(...layout.errors);
    warnings.push(...layout.warnings);
    diagnostics.push(...layout.diagnostics);
    warnItems.push(...layout.warnItems.map((index) => index + itemBase));

    plates.push({
      level,
      label: floorLabel(ast, level),
      offset,
      bounds: { ...layout.bounds },
      areaM2: layout.totalAreaM2,
      areaText: formatArea(layout.totalAreaM2, ast.unit),
      roomIdx: layout.rooms.map((_, index) => roomBase + index),
      itemIdx: layout.items.map((_, index) => itemBase + index),
      zoneIdx: layout.zones.map((_, index) => zoneBase + index),
      openingIdx: layout.openings.map((_, index) => openingBase + index),
      dimIdx: layout.dims.map((_, index) => dimBase + index),
      seamIdx: layout.seams.map((_, index) => seamBase + index),
    });

    const extent = ast.stack === "horizontal"
      ? layout.bounds.maxX - layout.bounds.minX
      : layout.bounds.maxY - layout.bounds.minY;
    cursor += extent + FLOORPLAN_CONST.floorGutter;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const plate of plates) {
    minX = Math.min(minX, plate.bounds.minX + plate.offset.x);
    minY = Math.min(minY, plate.bounds.minY + plate.offset.y);
    maxX = Math.max(maxX, plate.bounds.maxX + plate.offset.x);
    maxY = Math.max(maxY, plate.bounds.maxY + plate.offset.y);
  }

  const result: FloorplanLayoutResult = {
    title: ast.title,
    unit: ast.unit,
    symbols: ast.symbols,
    mode: ast.mode,
    north: ast.north,
    rooms,
    seams,
    walls,
    openings,
    items,
    controls: [],
    zones,
    dims,
    plates,
    bounds: { minX, minY, maxX, maxY },
    wallT: Math.max(FLOORPLAN_CONST.wallT, ...walls.map((wall) => wall.thickness)),
    totalAreaM2: plates.reduce((sum, plate) => sum + plate.areaM2, 0),
    errors,
    warnings,
    diagnostics,
    warnItems,
  };
  resolveControls(ast, result);
  if (ast.mode === "evacuation") return finalizeEvacuationLayout(ast, result);
  if (ast.mode === "stageplot") return finalizeStageplotLayout(ast, result);
  return result;
}

// ─── Opening resolution ──────────────────────────────────────────

function resolveOpening(
  op: FloorplanOpening,
  rooms: RoomBox[],
  byId: Map<string, number>,
  openingById: ReadonlyMap<string, OpeningGeom>,
  u: number,
  unit: FloorplanUnit,
  report: (
    severity: FloorplanGeometryDiagnostic["severity"],
    code: string,
    phase: FloorplanGeometryDiagnostic["phase"],
    message: string
  ) => void
): OpeningGeom | null {
  let seg: SharedEdge | null = null;
  let owner = -1;
  let negRoom: number | undefined;
  let posRoom: number | undefined;
  let inward: 1 | -1 = 1;
  let fromCoordinateWithin: number | undefined;

  if (op.between) {
    const ia = byId.get(op.between[0]);
    const ib = byId.get(op.between[1]);
    if (ia === undefined || ib === undefined) {
      report(
        "error",
        "floorplan/unknown-room",
        "topology",
        `${op.kind}: unknown room "${ia === undefined ? op.between[0] : op.between[1]}"`
      );
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
      report(
        "warning",
        "floorplan/opening-no-shared-wall",
        "topology",
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
      report("error", "floorplan/unknown-room", "topology", `${op.kind}: unknown room "${op.room}"`);
      return null;
    }
    owner = idx;
    const r = rooms[idx]!;
    const side = op.side!;
    const segs = sideSegments(r, side);
    if (segs.length === 0) {
      report(
        "warning",
        "floorplan/opening-no-wall",
        "topology",
        `${op.kind} on "${r.id}" ${side}: that side has no exterior wall segment`
      );
      return null;
    }
    // pct maps along the concatenated exterior segments of that side. Absolute
    // and relative forms select a concrete segment first, then resolve within it.
    const total = segs.reduce((s, sg) => s + (sg.hi - sg.lo), 0);
    let target = (total * Math.min(100, Math.max(0, op.pct))) / 100;
    if (op.from?.edge === "start") target = op.from.offset * u;
    if (op.from?.edge === "end") target = Math.max(0, total - op.from.offset * u);
    let chosen = segs[segs.length - 1]!;
    const relativeRef = op.relative ? openingById.get(op.relative.ref) : undefined;
    if (op.relative && !relativeRef) {
      report(
        "error",
        "floorplan/unknown-opening",
        "topology",
        `${op.kind}: opening "${op.relative.ref}" must be declared before it is referenced`
      );
      return null;
    }
    if (relativeRef) {
      const match = segs.find((candidate) =>
        (side === "west" || side === "east") === relativeRef.vertical &&
        Math.abs(candidate.along - relativeRef.along) < ADJ_EPS &&
        candidate.lo <= relativeRef.lo + ADJ_EPS &&
        candidate.hi >= relativeRef.hi - ADJ_EPS
      );
      if (!match) {
        report(
          "error",
          "floorplan/opening-reference-different-wall",
          "topology",
          `${op.kind}: opening "${op.relative!.ref}" is not on the same wall`
        );
        return null;
      }
      chosen = match;
      target = match.lo;
    }
    for (const sg of segs) {
      if (relativeRef) break;
      const len = sg.hi - sg.lo;
      if (target <= len) {
        chosen = sg;
        break;
      }
      target -= len;
    }
    if (op.from) fromCoordinateWithin = Math.min(chosen.hi - chosen.lo, Math.max(0, target));
    // Re-express the legacy percentage within the chosen segment. The absolute
    // and relative placement branches below use their authored values directly.
    if (!op.from && !op.relative) {
      const within = Math.min(1, Math.max(0, target / (chosen.hi - chosen.lo)));
      op = { ...op, pct: within * 100 };
    }
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
    report(
      "warning",
      "floorplan/opening-clamped",
      "geometry",
      `${op.kind}${op.room ? ` on "${op.room}" ${op.side}` : op.between ? ` between "${op.between[0]}" and "${op.between[1]}"` : ""}: ` +
        `width ${formatLength(wd, unit)} clamped to ${formatLength(avail, unit)} to fit the wall segment`
    );
    wd = avail;
  }
  let requestedLo: number;
  if (op.from?.edge === "start") {
    requestedLo = seg.lo + (fromCoordinateWithin ?? op.from.offset * u);
  } else if (op.from?.edge === "end") {
    requestedLo = seg.lo + (fromCoordinateWithin ?? segLen - op.from.offset * u) - wd;
  } else if (op.relative) {
    const ref = openingById.get(op.relative.ref);
    if (!ref || ref.vertical !== seg.vertical || Math.abs(ref.along - seg.along) >= ADJ_EPS) {
      report(
        "error",
        "floorplan/opening-reference-different-wall",
        "topology",
        `${op.kind}: opening "${op.relative.ref}" is not on the same wall`
      );
      return null;
    }
    requestedLo = op.relative.how === "after"
      ? ref.hi + op.relative.gap * u
      : ref.lo - op.relative.gap * u - wd;
  } else {
    const pct = Math.min(100, Math.max(0, op.pct));
    const c = seg.lo + (segLen * pct) / 100;
    requestedLo = c - wd / 2;
  }
  const lo = Math.max(seg.lo + jamb, Math.min(requestedLo, seg.hi - jamb - wd));
  const hi = lo + wd;

  // Final arc direction: into the owner unless swing out.
  const arcDir: 1 | -1 = op.kind === "door" && op.swing === "out" ? (inward === 1 ? -1 : 1) : inward;

  return {
    kind: op.kind,
    id: op.id,
    sourceLine: op.line,
    thickness: FLOORPLAN_CONST.wallT,
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
