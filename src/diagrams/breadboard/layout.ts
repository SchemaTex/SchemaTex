/**
 * Breadboard layout. Resolves DSL coordinates to canvas pixels:
 *   1. Determine substrate geometry (cols, rails, trough).
 *   2. Place grid parts at hole-snapped coordinates.
 *   3. Place side-placed MCUs to left/right/above/below the substrate
 *      with padding so pin labels are readable.
 *   4. Resolve wire endpoints to canvas px and compute Bézier paths.
 */

import type {
  BreadboardAst,
  BreadboardCoord,
  BreadboardEndpoint,
  BreadboardLayoutPart,
  BreadboardLayoutResult,
  BreadboardLayoutSubstrate,
  BreadboardLayoutWire,
  BreadboardPart,
} from "../../core/types";
import { partSpec, HOLE_PITCH } from "./parts";
import { PIN_ALIASES } from "./pin-aliases";
import { compactRoute, orthogonalRoute, type RoutePoint } from "../../core/orthogonal-router";

export const BB_CONST = {
  PITCH: HOLE_PITCH,
  RAIL_HEIGHT: 18,
  // Extra space beyond the regular row pitch: opposing e/f holes are 0.3" apart.
  TROUGH: 2 * HOLE_PITCH,
  BOARD_PAD_X: 24,
  BOARD_PAD_Y: 16,
  ROW_LABEL_W: 14,
  COL_LABEL_H: 12,
  MCU_GAP: 28,
  MARGIN: 24,
} as const;

const ROW_INDEX: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9 };

// ─── Substrate sizing ────────────────────────────────────────

function substrateGeom(form: BreadboardAst["board"]): {
  cols: number;
  hasRails: boolean;
  railsBreak: boolean;
} {
  if (form === "mini") return { cols: 17, hasRails: false, railsBreak: false };
  if (form === "half") return { cols: 30, hasRails: true, railsBreak: false };
  return { cols: 63, hasRails: true, railsBreak: true };
}

function buildSubstrate(form: BreadboardAst["board"], originX: number, originY: number): BreadboardLayoutSubstrate {
  const { cols, hasRails, railsBreak } = substrateGeom(form);
  const PITCH = BB_CONST.PITCH;
  // Inner grid: 10 rows (a..j). Plus 2 rails on top, 2 rails on bottom (if hasRails).
  const innerW = (cols + 1) * PITCH + BB_CONST.ROW_LABEL_W * 2;
  const railH = hasRails ? BB_CONST.RAIL_HEIGHT * 2 : 0;
  const gridH = 10 * PITCH + BB_CONST.TROUGH;
  const innerH = railH + gridH + BB_CONST.COL_LABEL_H * 2;
  const x = originX;
  const y = originY;
  const width = innerW + BB_CONST.BOARD_PAD_X * 2;
  const height = innerH + BB_CONST.BOARD_PAD_Y * 2;
  // Trough sits between row e and row f. Top rails (if any) → col labels → rows a..e → trough → rows f..j → col labels → bottom rails.
  const topRailsH = hasRails ? BB_CONST.RAIL_HEIGHT : 0;
  const troughY = y + BB_CONST.BOARD_PAD_Y + topRailsH + BB_CONST.COL_LABEL_H + 5 * PITCH + BB_CONST.TROUGH / 2;
  return {
    x, y, width, height, pitch: PITCH, cols, hasRails, railsBreak,
    troughY, troughHeight: BB_CONST.TROUGH,
  };
}

// ─── Coord → canvas px ───────────────────────────────────────

function holeXY(sub: BreadboardLayoutSubstrate, c: BreadboardCoord): { x: number; y: number } {
  const PITCH = sub.pitch;
  const gridX0 = sub.x + BB_CONST.BOARD_PAD_X + BB_CONST.ROW_LABEL_W + PITCH / 2;
  const topRailsH = sub.hasRails ? BB_CONST.RAIL_HEIGHT : 0;
  const gridY0 = sub.y + BB_CONST.BOARD_PAD_Y + topRailsH + BB_CONST.COL_LABEL_H + PITCH / 2;
  if (c.kind === "hole") {
    const colX = gridX0 + (c.col - 1) * PITCH;
    const rowI = ROW_INDEX[c.row]!;
    let rowY = gridY0 + rowI * PITCH;
    if (rowI >= 5) rowY += BB_CONST.TROUGH; // gap between e and f
    return { x: colX, y: rowY };
  }
  // Rail: top or bottom edge, positive or negative stripe.
  const railColX = gridX0 + (c.col - 1) * PITCH;
  const isTop = c.rail.endsWith("t");
  const isPositive = c.rail.startsWith("+");
  if (isTop) {
    const railsTopY = sub.y + BB_CONST.BOARD_PAD_Y;
    const stripY = isPositive ? railsTopY + 4 : railsTopY + BB_CONST.RAIL_HEIGHT - 4;
    return { x: railColX, y: stripY };
  }
  const railsBottomY = sub.y + sub.height - BB_CONST.BOARD_PAD_Y - BB_CONST.RAIL_HEIGHT;
  const stripY = isPositive ? railsBottomY + 4 : railsBottomY + BB_CONST.RAIL_HEIGHT - 4;
  return { x: railColX, y: stripY };
}

/** Public coordinate projection used by native hole-snapping interaction. */
export function breadboardCoordXY(
  sub: BreadboardLayoutSubstrate,
  coord: BreadboardCoord,
): { x: number; y: number } {
  return holeXY(sub, coord);
}

// ─── Part placement ─────────────────────────────────────────

function placePart(
  sub: BreadboardLayoutSubstrate,
  part: BreadboardPart,
  reservedSides: { left: number; right: number; above: number; below: number }
): BreadboardLayoutPart {
  const spec = partSpec(part.kind, part.args);
  if (spec.category === "side") {
    const placement = part.placement.kind === "side" ? part.placement.side : "beside-left";
    let x = 0, y = 0;
    if (placement === "beside-left") {
      x = sub.x - BB_CONST.MCU_GAP - spec.width;
      y = sub.y + (sub.height - spec.height) / 2;
    } else if (placement === "beside-right") {
      x = sub.x + sub.width + BB_CONST.MCU_GAP;
      y = sub.y + (sub.height - spec.height) / 2;
    } else if (placement === "above") {
      x = sub.x + (sub.width - spec.width) / 2;
      y = sub.y - BB_CONST.MCU_GAP - spec.height;
    } else {
      x = sub.x + (sub.width - spec.width) / 2;
      y = sub.y + sub.height + BB_CONST.MCU_GAP;
    }
    const pins: Record<string, { x: number; y: number }> = {};
    for (const p of spec.pins) pins[p.name] = { x: x + p.x, y: y + p.y };
    addPinAliases(part.kind, pins);
    // track reservations
    if (placement === "beside-left") reservedSides.left = Math.max(reservedSides.left, spec.width + BB_CONST.MCU_GAP);
    if (placement === "beside-right") reservedSides.right = Math.max(reservedSides.right, spec.width + BB_CONST.MCU_GAP);
    if (placement === "above") reservedSides.above = Math.max(reservedSides.above, spec.height + BB_CONST.MCU_GAP);
    if (placement === "below") reservedSides.below = Math.max(reservedSides.below, spec.height + BB_CONST.MCU_GAP);
    return {
      part, x, y, width: spec.width, height: spec.height, rotation: 0, pins,
    };
  }

  // Grid / module: anchor on first pin coordinate.
  let anchor: BreadboardCoord;
  if (part.placement.kind === "point") anchor = part.placement.at;
  else if (part.placement.kind === "span") anchor = part.placement.from;
  else if (spec.category === "module") {
    const centeredCol = Math.max(1, Math.round(sub.cols / 2));
    if (part.placement.side === "beside-left") {
      anchor = { kind: "hole", col: 2, row: "a" };
    } else if (part.placement.side === "beside-right") {
      anchor = { kind: "hole", col: Math.max(1, sub.cols - 1), row: "a" };
    } else if (part.placement.side === "below") {
      anchor = { kind: "hole", col: centeredCol, row: "j" };
    } else {
      anchor = { kind: "hole", col: centeredCol, row: "a" };
    }
  } else {
    throw new Error(`Grid part '${part.id}' must use @coord placement`);
  }
  const anchorXY = holeXY(sub, anchor);

  if (part.placement.kind === "span" && spec.pins.length === 2) {
    const end = holeXY(sub, part.placement.to);
    const dx = end.x - anchorXY.x, dy = end.y - anchorXY.y;
    const pins = { [spec.pins[0]!.name]: anchorXY, [spec.pins[1]!.name]: end };
    addPinAliases(part.kind, pins);
    return { part, x: anchorXY.x, y: anchorXY.y - spec.height / 2,
      width: Math.hypot(dx, dy), height: spec.height,
      rotation: Math.atan2(dy, dx) * 180 / Math.PI, pins };
  }

  // For module parts (sensors / displays): anchor is the first pin (lower-left of module),
  // so module sits *above* the anchor with pin row at its bottom edge.
  if (spec.category === "module") {
    // Compute total pin span:
    const lastPin = spec.pins[spec.pins.length - 1]!;
    const pinSpanX = lastPin.x - spec.pins[0]!.x;
    // Position module so first pin lands on anchor.
    const x = anchorXY.x - spec.pins[0]!.x;
    const y = anchorXY.y - spec.pins[0]!.y; // pin y is near bottom of module body
    void pinSpanX;
    const pins: Record<string, { x: number; y: number }> = {};
    for (const p of spec.pins) pins[p.name] = { x: x + p.x, y: y + p.y };
    addPinAliases(part.kind, pins);
    return { part, x, y, width: spec.width, height: spec.height, rotation: 0, pins };
  }

  // Grid part: pins[0] sits at anchor.
  const x = anchorXY.x;
  let y = anchorXY.y;
  // For DIPs / button which straddle trough: anchor is row e, top edge — body extends across trough.
  if (spec.straddlesTrough) {
    // Center body so pin row 1 (y=0) stays at anchor row, pin row 2 (y=h) reaches the matching row across trough.
    // anchor y is the *top* pin row; the layout coord anchor must be on row e (or symmetrical).
  }
  // Adjust y so pin centerline aligns with anchor when part is one-row tall.
  if (spec.height === BB_CONST.PITCH) {
    y = anchorXY.y - spec.height / 2;
  }
  const pins: Record<string, { x: number; y: number }> = {};
  for (const p of spec.pins) pins[p.name] = { x: x + p.x, y: y + p.y + (spec.height === BB_CONST.PITCH ? spec.height / 2 : 0) };
  addPinAliases(part.kind, pins);
  return { part, x, y, width: spec.width, height: spec.height, rotation: 0, pins };
}

// ─── Wire endpoint resolution ───────────────────────────────

function setAlias(
  pins: Record<string, { x: number; y: number }>,
  alias: string,
  xy: { x: number; y: number }
): void {
  if (!pins[alias]) pins[alias] = xy;
}

function addPinAliases(
  kind: BreadboardPart["kind"],
  pins: Record<string, { x: number; y: number }>
): void {
  const entries = Object.entries(pins);
  for (const [name, xy] of entries) {
    setAlias(pins, name.toUpperCase(), xy);
    setAlias(pins, name.toLowerCase(), xy);

    const gpio = /^GPIO(\d+)$/i.exec(name);
    if (gpio) {
      const n = gpio[1]!;
      setAlias(pins, `D${n}`, xy);
      setAlias(pins, `IO${n}`, xy);
      setAlias(pins, `GP${n}`, xy);
      setAlias(pins, n, xy);
    }

    const digital = /^D(\d+)$/i.exec(name);
    if (digital) {
      const n = digital[1]!;
      setAlias(pins, n, xy);
      setAlias(pins, `GPIO${n}`, xy);
      setAlias(pins, `IO${n}`, xy);
    }

    const picoGpio = /^GP(\d+)$/i.exec(name);
    if (picoGpio) {
      const n = picoGpio[1]!;
      setAlias(pins, `GPIO${n}`, xy);
      setAlias(pins, `IO${n}`, xy);
      setAlias(pins, `D${n}`, xy);
      setAlias(pins, n, xy);
    }
  }

  const alias = (canonical: string, ...aliases: string[]): void => {
    const xy = pins[canonical];
    if (!xy) return;
    for (const a of aliases) setAlias(pins, a, xy);
  };

  alias("3V3", "3.3V", "3V", "VCC3V3", "VDD");
  alias("5V", "+5V", "VCC", "VBUS", "USB");
  alias("VIN", "5V", "+5V", "VCC", "VBUS", "USB", "RAW");
  alias("GND", "0V", "GROUND", "VSS", "COM", "-");
  alias("RST", "RESET", "EN");
  alias("A4", "SDA");
  alias("A5", "SCL");
  alias("TX", "D1", "GPIO1", "IO1");
  alias("RX", "D0", "GPIO0", "IO0");
  alias("VCC", "5V", "+5V", "VIN");
  alias("DATA", "DAT", "OUT", "SIG", "SIGNAL");
  alias("DIO", "DATA", "DAT");
  alias("CLK", "SCK", "SCLK", "CLOCK");
  alias("TRIG", "TRIGGER");
  alias("SIG", "SIGNAL", "PWM", "DATA");
  alias("1", "A", "P1");
  alias("2", "W", "WIPER", "P2");
  alias("3", "B", "P3");

  if (kind === "mcu-esp32" || kind === "mcu-pico") {
    alias("VIN", "5V", "VBUS", "USB");
  }

  const catalogAliases = PIN_ALIASES[kind];
  if (catalogAliases) {
    for (const [canonical, aliases] of Object.entries(catalogAliases)) {
      alias(canonical, ...aliases);
    }
  }
}

function editDistance(a: string, b: string): number {
  const left = Array.from(a.toUpperCase());
  const right = Array.from(b.toUpperCase());
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 0; i < left.length; i++) {
    const current = [i + 1];
    for (let j = 0; j < right.length; j++) {
      current.push(
        Math.min(
          current[j]! + 1,
          previous[j + 1]! + 1,
          previous[j]! + (left[i] === right[j] ? 0 : 1)
        )
      );
    }
    previous = current;
  }
  return previous[right.length]!;
}

function nearestPinName(
  requested: string,
  pins: Record<string, { x: number; y: number }>
): string | undefined {
  const byFoldedName = new Map<string, string>();
  for (const name of Object.keys(pins)) {
    const folded = name.toUpperCase();
    const previous = byFoldedName.get(folded);
    if (!previous || name.length < previous.length) byFoldedName.set(folded, name);
  }
  return [...byFoldedName.values()].sort((a, b) => {
    const distance = editDistance(requested, a) - editDistance(requested, b);
    if (distance !== 0) return distance;
    const lengthDelta =
      Math.abs(requested.length - a.length) - Math.abs(requested.length - b.length);
    return lengthDelta || a.localeCompare(b);
  })[0];
}

function endpointXY(
  ep: BreadboardEndpoint,
  parts: BreadboardLayoutPart[],
  sub: BreadboardLayoutSubstrate
): { x: number; y: number } {
  if (ep.kind === "coord") return holeXY(sub, ep.at);
  const part = parts.find((p) => p.part.id === ep.partId);
  if (!part) throw new Error(`Wire references unknown part '${ep.partId}'`);
  const pin = part.pins[ep.pin] ?? part.pins[ep.pin.toUpperCase()] ?? part.pins[ep.pin.toLowerCase()];
  if (!pin) {
    const known = partSpec(part.part.kind, part.part.args).pins
      .map((candidate) => candidate.name)
      .filter((name, idx, all) => all.indexOf(name) === idx)
      .slice(0, 24)
      .join(", ");
    const suggestion = nearestPinName(ep.pin, part.pins);
    throw new Error(
      `Part '${ep.partId}' has no pin named '${ep.pin}'.` +
      (suggestion ? ` Did you mean '${suggestion}'?` : "") +
      ` (known pins: ${known})`
    );
  }
  // Return a copy so post-layout translation doesn't double-shift this point
  // through both part.pins[name] and lw.fromXY.
  return { x: pin.x, y: pin.y };
}

function bezierPath(p1: { x: number; y: number }, p2: { x: number; y: number }, via?: { x: number; y: number }): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  // Perpendicular unit vector
  const nx = -dy / dist;
  const ny = dx / dist;
  // Magnitude: 0.4 × max(|dx|,|dy|), but at least 14 so short wires still arc visibly.
  const mag = Math.max(14, 0.4 * Math.max(Math.abs(dx), Math.abs(dy)));
  // For "natural" arc: bow upward (negative y) when chord runs left→right horizontally;
  // bow rightward when chord runs top→bottom.
  // We pick perpendicular sign so the wire arcs away from the substrate center for off-board MCUs,
  // but a single-sign default works fine: use +nx,+ny for left→right, flip for right→left.
  const sign = dx >= 0 ? 1 : -1;
  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
  if (via) {
    // Steer both control points toward 'via'.
    cp1x = (p1.x + via.x) / 2;
    cp1y = (p1.y + via.y) / 2;
    cp2x = (via.x + p2.x) / 2;
    cp2y = (via.y + p2.y) / 2;
  } else {
    const offX = nx * mag * sign;
    const offY = ny * mag * sign;
    cp1x = p1.x + dx * 0.25 + offX;
    cp1y = p1.y + dy * 0.25 + offY;
    cp2x = p1.x + dx * 0.75 + offX;
    cp2y = p1.y + dy * 0.75 + offY;
  }
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

// ─── Public API ─────────────────────────────────────────────

/** Bounds of the same rotated body frame used by SVG and scene hit testing. */
export function breadboardPartBounds(part: BreadboardLayoutPart): { x: number; y: number; width: number; height: number } {
  const angle = part.rotation * Math.PI / 180;
  const corners = [[0, 0], [part.width, 0], [part.width, part.height], [0, part.height]].map(([x, y]) => ({
    x: part.x + x! * Math.cos(angle) - (y! - part.height / 2) * Math.sin(angle),
    y: part.y + part.height / 2 + x! * Math.sin(angle) + (y! - part.height / 2) * Math.cos(angle),
  }));
  const x = Math.min(...corners.map(p => p.x)), y = Math.min(...corners.map(p => p.y));
  return { x, y, width: Math.max(...corners.map(p => p.x)) - x, height: Math.max(...corners.map(p => p.y)) - y };
}

export function layoutBreadboard(ast: BreadboardAst): BreadboardLayoutResult {
  // Place parts to discover side reservations.
  const reserved = { left: 0, right: 0, above: 0, below: 0 };
  // Pre-scan side-placed parts only to compute final substrate offset.
  for (const part of ast.parts) {
    if (part.placement.kind === "side") {
      const spec = partSpec(part.kind, part.args);
      const side = part.placement.side;
      if (side === "beside-left") reserved.left = Math.max(reserved.left, spec.width + BB_CONST.MCU_GAP);
      if (side === "beside-right") reserved.right = Math.max(reserved.right, spec.width + BB_CONST.MCU_GAP);
      if (side === "above") reserved.above = Math.max(reserved.above, spec.height + BB_CONST.MCU_GAP);
      if (side === "below") reserved.below = Math.max(reserved.below, spec.height + BB_CONST.MCU_GAP);
    }
  }

  // Final substrate origin: shift right by `reserved.left`, down by `reserved.above`.
  const sub = buildSubstrate(
    ast.board,
    BB_CONST.MARGIN + reserved.left,
    BB_CONST.MARGIN + reserved.above + (ast.title ? 30 : 0)
  );

  // Now place all parts against final substrate.
  const reservedFinal = { left: 0, right: 0, above: 0, below: 0 };
  const parts: BreadboardLayoutPart[] = ast.parts.map((p) => placePart(sub, p, reservedFinal));

  // Wires.
  const wires: BreadboardLayoutWire[] = ast.wires.map((wire) => {
    const fromXY = endpointXY(wire.from, parts, sub);
    const toXY = endpointXY(wire.to, parts, sub);
    return {
      wire,
      path: "", // computed after final shift below
      fromXY,
      toXY,
      color: wire.color,
    };
  });

  // Side-board pin labels live inside the body. Escape toward the nearest
  // edge before routing, rather than bowing a jumper across the pin legend.
  const routedPoints = new Map<BreadboardLayoutWire, RoutePoint[]>();
  for (const [wireIndex,wire] of wires.entries()) {
    if (wire.wire.via) continue; // authored bend intent stays authoritative
    const escape = (endpoint: BreadboardEndpoint, p: RoutePoint): RoutePoint => {
      if (endpoint.kind !== "pin") return p;
      const part = parts.find(part=>part.part.id===endpoint.partId)!;
      if (partSpec(part.part.kind,part.part.args).category !== "side") return p;
      const b = breadboardPartBounds(part);
      return [
        {x:b.x-14-wireIndex*8,y:p.y}, {x:b.x+b.width+14+wireIndex*8,y:p.y},
        {x:p.x,y:b.y-14-wireIndex*8}, {x:p.x,y:b.y+b.height+14+wireIndex*8},
      ].sort((a,b)=>Math.abs(a.x-p.x)+Math.abs(a.y-p.y)-Math.abs(b.x-p.x)-Math.abs(b.y-p.y))[0]!;
    };
    const start = escape(wire.wire.from,wire.fromXY), end = escape(wire.wire.to,wire.toXY);
    const contains = (p: RoutePoint,b: ReturnType<typeof breadboardPartBounds>) => p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;
    const boxes = parts.flatMap(part=>{
      const b = breadboardPartBounds(part);
      if (contains(start,b)||contains(end,b)) return [];
      const clearance = partSpec(part.part.kind,part.part.args).category === "side" ? 3+wireIndex*8 : 3;
      return [{left:b.x-clearance,right:b.x+b.width+clearance,top:b.y-clearance,bottom:b.y+b.height+clearance}];
    });
    routedPoints.set(wire,compactRoute([wire.fromXY,...orthogonalRoute(start,end,boxes),wire.toXY]).map(p=>({...p})));
  }

  // Canvas size — bounding box across substrate + side parts + wires.
  let minX = sub.x;
  let minY = sub.y;
  let maxX = sub.x + sub.width;
  let maxY = sub.y + sub.height;
  for (const lp of parts) {
    const bounds = breadboardPartBounds(lp);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
    for (const pin of Object.values(lp.pins)) {
      minX = Math.min(minX, pin.x - 8); minY = Math.min(minY, pin.y - 8);
      maxX = Math.max(maxX, pin.x + 8); maxY = Math.max(maxY, pin.y + 8);
    }
  }
  for (const lw of wires) {
    minX = Math.min(minX, lw.fromXY.x, lw.toXY.x);
    minY = Math.min(minY, lw.fromXY.y, lw.toXY.y);
    maxX = Math.max(maxX, lw.fromXY.x, lw.toXY.x);
    maxY = Math.max(maxY, lw.fromXY.y, lw.toXY.y);
    for (const p of routedPoints.get(lw) ?? []) {
      minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);
    }
  }
  // Translate everything so origin is at (MARGIN, MARGIN).
  const shiftX = BB_CONST.MARGIN - minX;
  const titleHeight = ast.title ? 30 : 0;
  const shiftY = BB_CONST.MARGIN + titleHeight - minY;
  if (shiftX !== 0 || shiftY !== 0) {
    sub.x += shiftX;
    sub.y += shiftY;
    sub.troughY += shiftY;
    for (const lp of parts) {
      lp.x += shiftX;
      lp.y += shiftY;
      // Aliases share coordinates; translate each physical point exactly once.
      for (const pin of new Set(Object.values(lp.pins))) {
        pin.x += shiftX;
        pin.y += shiftY;
      }
    }
    for (const lw of wires) {
      lw.fromXY.x += shiftX;
      lw.fromXY.y += shiftY;
      lw.toXY.x += shiftX;
      lw.toXY.y += shiftY;
    }
  }
  // Render wire paths AFTER the substrate-relative shift so via coords also align.
  for (let i = 0; i < wires.length; i++) {
    const lw = wires[i]!;
    const wire = ast.wires[i]!;
    const viaXY = wire.via ? holeXY(sub, wire.via) : undefined;
    const points = routedPoints.get(lw);
    lw.path = points ? points.map((p,i)=>`${i?"L":"M"} ${p.x+shiftX} ${p.y+shiftY}`).join(" ") : bezierPath(lw.fromXY, lw.toXY, viaXY);
  }
  const width = (maxX - minX) + BB_CONST.MARGIN * 2;
  const height = (maxY - minY) + BB_CONST.MARGIN * 2 + titleHeight;

  return { ast, substrate: sub, parts, wires, width, height };
}
