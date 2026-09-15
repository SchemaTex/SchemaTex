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
import { routeJumper, jumperPath } from "./routing";
import { PIN_ALIASES } from "./pin-aliases";

export const BB_CONST = {
  PITCH: HOLE_PITCH,
  RAIL_HEIGHT: 18,
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
): BreadboardLayoutPart {
  const spec = partSpec(part.kind, part.args);
  if (part.placement.kind === "side" && spec.category !== "grid") {
    const placement = part.placement.side;
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
    return {
      part, x, y, width: spec.width, height: spec.height, rotation: 0, pins,
    };
  }

  // Grid / module: anchor on first pin coordinate.
  let anchor: BreadboardCoord;
  if (part.placement.kind === "point") anchor = part.placement.at;
  else if (part.placement.kind === "span") anchor = part.placement.from;
  else {
    throw new Error(`Grid part '${part.id}' must use @coord placement`);
  }
  const anchorXY = holeXY(sub, anchor);

  // For module parts (sensors / displays): anchor is the first pin (lower-left of module),
  // so module sits *above* the anchor with pin row at its bottom edge.
  if (spec.category === "module") {
    // Position module so first pin lands on anchor.
    const x = anchorXY.x - spec.pins[0]!.x;
    const y = anchorXY.y - spec.pins[0]!.y; // pin y is near bottom of module body
    const pins: Record<string, { x: number; y: number }> = {};
    for (const p of spec.pins) pins[p.name] = { x: x + p.x, y: y + p.y };
    addPinAliases(part.kind, pins);
    return { part, x, y, width: spec.width, height: spec.height, rotation: 0, pins };
  }

  // Two-terminal grid parts use the declared holes as their actual endpoints.
  // Their body is drawn horizontally and rotated with the terminal vector.
  if (spec.pins.length === 2) {
    const end = part.placement.kind === "span"
      ? holeXY(sub, part.placement.to)
      : { x: anchorXY.x + spec.width, y: anchorXY.y };
    const dx = end.x - anchorXY.x, dy = end.y - anchorXY.y;
    const pins = { [spec.pins[0]!.name]: anchorXY, [spec.pins[1]!.name]: end };
    addPinAliases(part.kind, pins);
    return { part, ...anchorXY, width: Math.hypot(dx, dy), height: spec.height,
      rotation: Math.atan2(dy, dx) * 180 / Math.PI, pins };
  }
  const x = anchorXY.x, y = anchorXY.y;
  const pins: Record<string, { x: number; y: number }> = {};
  for (const p of spec.pins) pins[p.name] = { x: x + p.x, y: y + p.y };
  addPinAliases(part.kind, pins);
  return { part, x, y, width: spec.width, height: spec.height, rotation: 0, pins };
}

/** Canvas bounds of a part, including the rotation around its first terminal. */
export function breadboardPartBounds(lp: BreadboardLayoutPart): { x: number; y: number; width: number; height: number } {
  const spec = partSpec(lp.part.kind, lp.part.args);
  if (spec.category !== "grid" || spec.pins.length !== 2) return { x: lp.x, y: lp.y, width: lp.width, height: lp.height };
  const angle = lp.rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  const corners = [[0, -lp.height / 2], [lp.width, -lp.height / 2], [lp.width, lp.height / 2], [0, lp.height / 2]];
  const xs = corners.map(([x, y]) => lp.x + x! * cos - y! * sin);
  const ys = corners.map(([x, y]) => lp.y + x! * sin + y! * cos);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
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

// ─── Public API ─────────────────────────────────────────────

export function layoutBreadboard(ast: BreadboardAst): BreadboardLayoutResult {
  const sub = buildSubstrate(ast.board, 0, 0);
  const parts = ast.parts.map(p => placePart(sub, p));
  // Stack boards/modules along their requested side. Hole-anchored footprints
  // remain fixed; only genuinely off-board parts participate in packing.
  for (const side of ["beside-left", "beside-right", "above", "below"]) {
    const group = parts.filter(p => p.part.placement.kind === "side" && p.part.placement.side === side);
    const vertical = side.startsWith("beside");
    const extent = group.reduce((sum, p) => sum + (vertical ? p.height : p.width), 0)
      + Math.max(0, group.length - 1) * BB_CONST.MCU_GAP;
    let cursor = (vertical ? sub.y + sub.height / 2 : sub.x + sub.width / 2) - extent / 2;
    for (const p of group) {
      const shift = cursor - (vertical ? p.y : p.x);
      if (vertical) p.y += shift; else p.x += shift;
      for (const pin of new Set(Object.values(p.pins))) {
        if (vertical) pin.y += shift; else pin.x += shift;
      }
      cursor += (vertical ? p.height : p.width) + BB_CONST.MCU_GAP;
    }
  }

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

  const obstacles = parts.map(breadboardPartBounds);
  const routes: { x: number; y: number }[][] = [];
  for (const lw of wires) routes.push(routeJumper(lw.fromXY, lw.toXY, obstacles,
    lw.wire.via ? holeXY(sub, lw.wire.via) : undefined, routes).map(p => ({ ...p })));

  // Canvas size — bounding box across substrate + side parts + wires.
  let minX = sub.x;
  let minY = sub.y;
  let maxX = sub.x + sub.width;
  let maxY = sub.y + sub.height;
  for (const lp of parts) {
    const bounds = breadboardPartBounds(lp);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y - 16);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }
  for (const route of routes) for (const p of route) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
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
      for (const point of new Set(Object.values(lp.pins))) {
        point.x += shiftX;
        point.y += shiftY;
      }
    }
    for (const lw of wires) {
      lw.fromXY.x += shiftX;
      lw.fromXY.y += shiftY;
      lw.toXY.x += shiftX;
      lw.toXY.y += shiftY;
    }
  }
  for (const [i, route] of routes.entries()) {
    wires[i]!.path = jumperPath(route.map(p => ({ x: p.x + shiftX, y: p.y + shiftY })));
  }
  const width = (maxX - minX) + BB_CONST.MARGIN * 2;
  const height = (maxY - minY) + BB_CONST.MARGIN * 2 + titleHeight;

  return { ast, substrate: sub, parts, wires, width, height };
}
