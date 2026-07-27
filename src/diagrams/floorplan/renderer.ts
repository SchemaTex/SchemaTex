/**
 * Floor plan — SVG renderer.
 *
 * Spec: docs/reference/48-FLOORPLAN-STANDARD.md §4 (z-order, walls, openings,
 * labels, dimension lines), §6 (error panel / warning list).
 *
 * Z-order (§4.4): room fills → furniture → walls → opening symbols → labels
 * → dimension lines. Walls render above furniture so the poché stays crisp
 * when furniture abuts a wall; openings punch the wall band with the floor
 * fill of the room(s) on each side.
 */

import type { RenderConfig } from "../../core/types";
import { renderLegend } from "../../core/legend";
import {
  desc as descEl,
  el,
  group,
  line,
  path,
  rect,
  svgRoot,
  text as textEl,
  title as titleEl,
} from "../../core/svg";
import {
  DEFAULT_FONT_FAMILY,
  TITLE,
  resolveEvacuationTheme,
  resolveFloorplanTheme,
  type EvacuationTokens,
  type FloorplanTokens,
  type ResolvedTheme,
} from "../../core/theme";
import { parseFloorplan } from "./parser";
import { FLOORPLAN_CONST as C, formatArea, layoutFloorplan } from "./layout";
import { FLOORPLAN_SYMBOLS } from "./catalog";
import type { DimLineGeom, FloorplanLayoutResult, OpeningGeom } from "./types";
import { resolveSceneTitle } from "../../core/title-scene";
import { resolveSafetySymbol } from "./safety-symbols";
import type {
  RoutePoint,
} from "./types";

type Theme = ResolvedTheme<FloorplanTokens>;
type EvacuationTheme = ResolvedTheme<EvacuationTokens>;

const r2 = (n: number): number => Math.round(n * 100) / 100;
const EVAC_BODY_FONT = '"Noto Sans", "Noto Sans Arabic", sans-serif';
const EVAC_DISPLAY_FONT = '"IBM Plex Sans", "Noto Sans", sans-serif';
const EVAC_KEEP = new Set([
  "stairs",
  "stairs-l",
  "stairs-u",
  "spiral-stairs",
  "elevator",
  "column",
]);

function buildCss(
  t: Theme,
  floorLabels = false,
  evacuationTheme?: EvacuationTheme
): string {
  const css = `
.sx-fp { font-family: ${DEFAULT_FONT_FAMILY}; }
.sx-fp-title { font: ${TITLE.weight} ${TITLE.size}px sans-serif; fill: ${t.text}; }
.sx-fp-wall { fill: ${t.wallFill}; stroke: none; }
.sx-fp-furn { fill: ${t.furnFill}; stroke: ${t.furnStroke}; stroke-width: 1.2; }
.sx-fp-furn-nofill { fill: none; stroke: ${t.furnStroke}; stroke-width: 1.2; }
.sx-fp-furn-line { fill: none; stroke: ${t.furnStroke}; stroke-width: 1; }
.sx-fp-furn-dash { fill: none; stroke: ${t.furnStroke}; stroke-width: 1; stroke-dasharray: 4 3; }
.sx-fp-furn-dot { fill: ${t.furnStroke}; stroke: none; }
.sx-fp-furn-solid { fill: ${t.furnSolid}; stroke: none; }
.sx-fp-board-inner { fill: ${t.boardInner}; stroke: none; }
.sx-fp-chair { fill: ${t.chairFill}; stroke: ${t.furnStroke}; stroke-width: 1; }
.sx-fp-rug { fill: none; stroke: ${t.rugStroke}; stroke-width: 1.2; stroke-dasharray: 5 4; }
.sx-fp-hatch { fill: none; stroke: ${t.hatchStroke}; stroke-width: 1; }
.sx-fp-furn-text { font-weight: 600; font-family: sans-serif; fill: ${t.furnLabel}; paint-order: stroke; stroke: ${t.floorFill}; stroke-width: 2.5px; stroke-linejoin: round; }
.sx-fp-furn-label { font: 11px sans-serif; fill: ${t.furnLabel}; paint-order: stroke; stroke: ${t.floorFill}; stroke-width: 3px; stroke-linejoin: round; }
.sx-fp-seat-name { font-family: sans-serif; fill: ${t.furnLabel}; paint-order: stroke; stroke: ${t.floorFill}; stroke-width: 2px; stroke-linejoin: round; }
.sx-fp-door-leaf { fill: none; stroke: ${t.doorLeaf}; stroke-width: 1.6; }
.sx-fp-door-arc { fill: none; stroke: ${t.doorArc}; stroke-width: 1; }
.sx-fp-window { fill: none; stroke: ${t.windowStroke}; stroke-width: 1.3; }
.sx-fp-jamb { fill: none; stroke: ${t.furnStroke}; stroke-width: 1.2; }
.sx-fp-room-name { font: 600 13.5px sans-serif; fill: ${t.roomName}; paint-order: stroke; stroke: ${t.floorFill}; stroke-width: 3px; stroke-linejoin: round; }
.sx-fp-room-area { font: 11px sans-serif; fill: ${t.roomArea}; paint-order: stroke; stroke: ${t.floorFill}; stroke-width: 3px; stroke-linejoin: round; }
.sx-fp-stair-break { fill: none; stroke: ${t.furnStroke}; stroke-width: 1.6; }
.sx-fp-compass { fill: none; stroke: ${t.dimStroke}; stroke-width: 1.2; }
.sx-fp-compass-n { font: 700 11px sans-serif; fill: ${t.dimText}; }
.sx-fp-dim { fill: none; stroke: ${t.dimStroke}; stroke-width: 1; }
.sx-fp-dim-text { font: 10.5px sans-serif; fill: ${t.dimText}; }
.sx-fp-dim-text-minor { font: 9px sans-serif; fill: ${t.dimText}; }
.sx-fp-warn-item { fill: none; stroke: ${t.negative}; stroke-width: 1.5; stroke-dasharray: 4 3; }
.sx-fp-warn { font: 11px ui-monospace, Menlo, monospace; fill: ${t.warn}; }
.sx-fp-error-box { fill: ${t.bg}; stroke: ${t.negative}; stroke-width: 1.5; }
.sx-fp-error-title { font: 700 13px ui-monospace, Menlo, monospace; fill: ${t.negative}; }
.sx-fp-error-line { font: 12px ui-monospace, Menlo, monospace; fill: ${t.negative}; }
.sx-native-handle { fill: #fff; stroke: #2563eb; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.sx-native-handle[data-axis='x'] { cursor: ew-resize; }
.sx-native-handle[data-axis='y'] { cursor: ns-resize; }
.sx-native-handle[data-axis='xy'] { cursor: nwse-resize; }
.sx-native-handle:hover { fill: #dbeafe; stroke-width: 2; }
`.trim();
  const base = floorLabels
    ? `${css}\n.sx-fp-floor-label { font: 600 12.5px "IBM Plex Sans", "Noto Sans", sans-serif; fill: ${t.roomName}; }`
    : css;
  if (!evacuationTheme) return base;
  const e = evacuationTheme;
  return `${base}
.sx-fp-evac { font-family: ${EVAC_BODY_FONT}; }
.sx-fp-evac .sx-fp-title { font: 600 20px ${EVAC_DISPLAY_FONT}; letter-spacing: -0.01em; }
.sx-fp-evac .sx-fp-room-name { font: 600 12.5px ${EVAC_DISPLAY_FONT}; }
.sx-fp-route-primary { fill: none; stroke: ${e.routeGreen}; stroke-width: ${r2(C.scale * 0.25)}; stroke-linecap: round; stroke-linejoin: round; opacity: .85; }
.sx-fp-route-secondary { fill: none; stroke: ${e.routeGreen}; stroke-width: ${r2(C.scale * 0.25)}; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 10 7; opacity: .85; }
.sx-fp-route-accessible { fill: none; stroke: ${e.routeGreen}; stroke-width: ${r2(C.scale * 0.25)}; stroke-linecap: round; stroke-linejoin: round; opacity: .85; }
.sx-fp-route-rescue { fill: none; stroke: ${e.rescueBlue}; stroke-width: ${r2(C.scale * 0.25)}; stroke-linecap: round; stroke-linejoin: round; opacity: .85; }
.sx-fp-chevron { fill: ${e.symbolKnockout}; stroke: none; }
.sx-fp-access-glyph { fill: none; stroke: ${e.safeGreen}; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.sx-fp-access-glyph-fill { fill: ${e.safeGreen}; stroke: none; }
.sx-fp-safety-plate-safe { fill: ${e.safeGreen}; stroke: none; }
.sx-fp-safety-plate-fire { fill: ${e.fireRed}; stroke: none; }
.sx-fp-safety-plate-mand { fill: ${e.mandBlue}; stroke: none; }
.sx-fp-safety-plate-warn { fill: ${e.warnYellow}; stroke: none; }
.sx-fp-safety-plate-neutral { fill: ${e.floorFill}; stroke: ${e.wallFill}; stroke-width: 1.1; }
.sx-fp-safety-knockout { fill: ${e.symbolKnockout}; stroke: none; }
.sx-fp-safety-knockout-stroke { fill: none; stroke: ${e.symbolKnockout}; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.sx-fp-safety-dark { fill: ${e.wallFill}; stroke: none; }
.sx-fp-safety-dark-stroke { fill: none; stroke: ${e.wallFill}; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.sx-fp-safety-label { font: 600 10px ${EVAC_BODY_FONT}; fill: ${e.roomName}; paint-order: stroke; stroke: ${e.floorFill}; stroke-width: 3px; stroke-linejoin: round; }
.sx-fp-safety-class { font: 700 8.5px ${EVAC_DISPLAY_FONT}; fill: ${e.fireRed}; paint-order: stroke; stroke: ${e.floorFill}; stroke-width: 2px; }
.sx-fp-fire-door { stroke: ${e.fireRed}; stroke-width: 5; stroke-dasharray: 4 2; }
.sx-fp-smoke-door { stroke: ${e.wallFill}; stroke-width: 4; stroke-dasharray: 2 3; }
.sx-fp-door-rating { font: 700 8.5px ${EVAC_DISPLAY_FONT}; fill: ${e.fireRed}; paint-order: stroke; stroke: ${e.floorFill}; stroke-width: 2px; }
.sx-fp-scale-note { font: 10px ${EVAC_BODY_FONT}; fill: ${e.complianceText}; }
.sx-fp-compliance-error { font: 700 10.5px ${EVAC_BODY_FONT}; fill: ${e.fireRed}; }
`;
}

// ─── Error panel (§6: errors block rendering) ────────────────────

function renderErrorPanel(lay: FloorplanLayoutResult, t: Theme): string {
  const lines = lay.errors;
  const w = Math.max(560, ...lines.map((l) => l.length * 6.6 + 48));
  const h = 56 + lines.length * 19;
  return svgRoot(
    { viewBox: `0 0 ${r2(w)} ${h}`, width: r2(w), height: h, class: "sx-fp", role: "img" },
    [
      titleEl(lay.title),
      descEl(`Floor plan validation failed with ${lines.length} error${lines.length === 1 ? "" : "s"}.`),
      el("style", {}, buildCss(t)),
      rect({ class: "sx-fp-error-box", x: 1, y: 1, width: r2(w - 2), height: h - 2, rx: 6 }),
      textEl({ class: "sx-fp-error-title", x: 16, y: 26 }, `floorplan: ${lines.length} validation error${lines.length === 1 ? "" : "s"}`),
      ...lines.map((e, i) => textEl({ class: "sx-fp-error-line", x: 16, y: 50 + i * 19 }, `⚠ ${e}`)),
    ]
  );
}

// ─── Opening symbols ─────────────────────────────────────────────

interface Ctx {
  X: (m: number) => number;
  Y: (m: number) => number;
  px: (m: number) => number;
  t: Theme;
  wallT: number;
}

interface RenderLayers {
  floors: string[];
  routes: string[];
  furniture: string[];
  walls: string[];
  openings: string[];
  fireDoors: string[];
  safety: string[];
  labels: string[];
  dims: string[];
}

function gapFill(lay: FloorplanLayoutResult, t: Theme, roomIdx: number | undefined): string {
  if (roomIdx === undefined) return t.bg;
  return lay.rooms[roomIdx]?.fill ?? t.floorFill;
}

/** Punch the wall band with the floor color of each side (half/half). */
function punchGap(o: OpeningGeom, lay: FloorplanLayoutResult, c: Ctx): string {
  const tpx = c.px(c.wallT);
  const negFill = gapFill(lay, c.t, o.negRoom);
  const posFill = gapFill(lay, c.t, o.posRoom);
  if (o.vertical) {
    const x = c.X(o.along);
    const y = c.Y(o.lo);
    const h = c.px(o.hi - o.lo);
    return (
      rect({ class: "sx-fp-gap", fill: negFill, x: r2(x - tpx / 2 - 0.5), y, width: r2(tpx / 2 + 0.5), height: h }) +
      rect({ class: "sx-fp-gap", fill: posFill, x, y, width: r2(tpx / 2 + 0.5), height: h })
    );
  }
  const y = c.Y(o.along);
  const x = c.X(o.lo);
  const w = c.px(o.hi - o.lo);
  return (
    rect({ class: "sx-fp-gap", fill: negFill, x, y: r2(y - tpx / 2 - 0.5), width: w, height: r2(tpx / 2 + 0.5) }) +
    rect({ class: "sx-fp-gap", fill: posFill, x, y, width: w, height: r2(tpx / 2 + 0.5) })
  );
}

function windowSymbol(o: OpeningGeom, c: Ctx): string {
  const tpx = c.px(c.wallT);
  const parts: string[] = [];
  const outward = (o.inward === 1 ? -1 : 1) as 1 | -1;
  // glazing offsets across the wall band: fixed/casement/bay = 3 lines,
  // sliding = two offset half-panels (§2.1)
  if (o.vertical) {
    const x = c.X(o.along);
    const mid = c.Y((o.lo + o.hi) / 2);
    if (o.windowType === "sliding") {
      parts.push(line({ class: "sx-fp-window", x1: r2(x - tpx * 0.22), y1: c.Y(o.lo), x2: r2(x - tpx * 0.22), y2: mid }));
      parts.push(line({ class: "sx-fp-window", x1: r2(x + tpx * 0.22), y1: mid, x2: r2(x + tpx * 0.22), y2: c.Y(o.hi) }));
    } else {
      for (const k of [-1, 0, 1]) {
        parts.push(line({ class: "sx-fp-window", x1: r2(x + k * tpx * 0.38), y1: c.Y(o.lo), x2: r2(x + k * tpx * 0.38), y2: c.Y(o.hi) }));
      }
    }
    for (const yy of [o.lo, o.hi]) {
      parts.push(line({ class: "sx-fp-window", x1: r2(x - tpx / 2), y1: c.Y(yy), x2: r2(x + tpx / 2), y2: c.Y(yy) }));
    }
    if (o.windowType === "casement") {
      // outward swing arc from the lo jamb
      const wd = c.px(o.hi - o.lo);
      const leafX = r2(x + outward * wd);
      const sweep = outward === 1 ? 1 : 0;
      parts.push(line({ class: "sx-fp-door-leaf", x1: x, y1: c.Y(o.lo), x2: leafX, y2: c.Y(o.lo) }));
      parts.push(path({ class: "sx-fp-door-arc", d: `M ${leafX} ${c.Y(o.lo)} A ${wd} ${wd} 0 0 ${sweep} ${x} ${r2(c.Y(o.lo) + wd)}` }));
    }
    if (o.windowType === "bay") {
      const proj = c.px(0.45) * outward;
      const splay = c.px(0.3);
      const x0 = r2(x + (outward * tpx) / 2);
      parts.push(
        path({
          class: "sx-fp-window",
          d:
            `M ${x0} ${c.Y(o.lo)} L ${r2(x0 + proj)} ${r2(c.Y(o.lo) + splay)} ` +
            `L ${r2(x0 + proj)} ${r2(c.Y(o.hi) - splay)} L ${x0} ${c.Y(o.hi)}`,
        })
      );
    }
  } else {
    const y = c.Y(o.along);
    const mid = c.X((o.lo + o.hi) / 2);
    if (o.windowType === "sliding") {
      parts.push(line({ class: "sx-fp-window", x1: c.X(o.lo), y1: r2(y - tpx * 0.22), x2: mid, y2: r2(y - tpx * 0.22) }));
      parts.push(line({ class: "sx-fp-window", x1: mid, y1: r2(y + tpx * 0.22), x2: c.X(o.hi), y2: r2(y + tpx * 0.22) }));
    } else {
      for (const k of [-1, 0, 1]) {
        parts.push(line({ class: "sx-fp-window", x1: c.X(o.lo), y1: r2(y + k * tpx * 0.38), x2: c.X(o.hi), y2: r2(y + k * tpx * 0.38) }));
      }
    }
    for (const xx of [o.lo, o.hi]) {
      parts.push(line({ class: "sx-fp-window", x1: c.X(xx), y1: r2(y - tpx / 2), x2: c.X(xx), y2: r2(y + tpx / 2) }));
    }
    if (o.windowType === "casement") {
      const wd = c.px(o.hi - o.lo);
      const leafY = r2(y + outward * wd);
      const sweep = outward === 1 ? 0 : 1;
      parts.push(line({ class: "sx-fp-door-leaf", x1: c.X(o.lo), y1: y, x2: c.X(o.lo), y2: leafY }));
      parts.push(path({ class: "sx-fp-door-arc", d: `M ${c.X(o.lo)} ${leafY} A ${wd} ${wd} 0 0 ${sweep} ${r2(c.X(o.lo) + wd)} ${y}` }));
    }
    if (o.windowType === "bay") {
      const proj = c.px(0.45) * outward;
      const splay = c.px(0.3);
      const y0 = r2(y + (outward * tpx) / 2);
      parts.push(
        path({
          class: "sx-fp-window",
          d:
            `M ${c.X(o.lo)} ${y0} L ${r2(c.X(o.lo) + splay)} ${r2(y0 + proj)} ` +
            `L ${r2(c.X(o.hi) - splay)} ${r2(y0 + proj)} L ${c.X(o.hi)} ${y0}`,
        })
      );
    }
  }
  return parts.join("");
}

function jambLines(o: OpeningGeom, c: Ctx): string {
  const tpx = c.px(c.wallT);
  if (o.vertical) {
    const x = c.X(o.along);
    return [o.lo, o.hi]
      .map((yy) => line({ class: "sx-fp-jamb", x1: r2(x - tpx / 2), y1: c.Y(yy), x2: r2(x + tpx / 2), y2: c.Y(yy) }))
      .join("");
  }
  const y = c.Y(o.along);
  return [o.lo, o.hi]
    .map((xx) => line({ class: "sx-fp-jamb", x1: c.X(xx), y1: r2(y - tpx / 2), x2: c.X(xx), y2: r2(y + tpx / 2) }))
    .join("");
}

/** Single swing leaf + quarter arc from one jamb. */
function swingLeaf(o: OpeningGeom, c: Ctx, hingeAtLo: boolean, widthM: number): string {
  const dir = o.inward;
  const rpx = c.px(widthM);
  if (o.vertical) {
    const x = c.X(o.along);
    const hy = hingeAtLo ? c.Y(o.lo) : c.Y(o.hi);
    const sy = hingeAtLo ? 1 : -1;
    const leafX = r2(x + dir * rpx);
    const sweep = (dir === 1) === hingeAtLo ? 1 : 0;
    return (
      line({ class: "sx-fp-door-leaf", x1: x, y1: hy, x2: leafX, y2: hy }) +
      path({ class: "sx-fp-door-arc", d: `M ${leafX} ${hy} A ${rpx} ${rpx} 0 0 ${sweep} ${x} ${r2(hy + sy * rpx)}` })
    );
  }
  const y = c.Y(o.along);
  const hx = hingeAtLo ? c.X(o.lo) : c.X(o.hi);
  const sx = hingeAtLo ? 1 : -1;
  const leafY = r2(y + dir * rpx);
  const sweep = (dir === 1) !== hingeAtLo ? 1 : 0;
  return (
    line({ class: "sx-fp-door-leaf", x1: hx, y1: y, x2: hx, y2: leafY }) +
    path({ class: "sx-fp-door-arc", d: `M ${hx} ${leafY} A ${rpx} ${rpx} 0 0 ${sweep} ${r2(hx + sx * rpx)} ${y}` })
  );
}

function doorSymbol(o: OpeningGeom, c: Ctx): string {
  const wd = o.hi - o.lo;
  if (o.doorType === "double") {
    // two mirrored quarter-arcs meeting at the gap center
    const half: OpeningGeom = { ...o };
    const mid = (o.lo + o.hi) / 2;
    const left = { ...half, hi: mid };
    const right = { ...half, lo: mid };
    return jambLines(o, c) + swingLeaf(left, c, true, wd / 2) + swingLeaf(right, c, false, wd / 2);
  }
  if (o.doorType === "bifold") {
    // two tent peaks — each panel folds at its quarter point (§2.1)
    const peak = c.px((o.hi - o.lo) * 0.22) * o.inward;
    const q1 = o.lo + (o.hi - o.lo) * 0.25;
    const mid = (o.lo + o.hi) / 2;
    const q3 = o.lo + (o.hi - o.lo) * 0.75;
    const parts: string[] = [jambLines(o, c)];
    if (o.vertical) {
      const x = c.X(o.along);
      parts.push(
        path({
          class: "sx-fp-door-leaf",
          d: `M ${x} ${c.Y(o.lo)} L ${r2(x + peak)} ${c.Y(q1)} L ${x} ${c.Y(mid)} L ${r2(x + peak)} ${c.Y(q3)} L ${x} ${c.Y(o.hi)}`,
        })
      );
    } else {
      const y = c.Y(o.along);
      parts.push(
        path({
          class: "sx-fp-door-leaf",
          d: `M ${c.X(o.lo)} ${y} L ${c.X(q1)} ${r2(y + peak)} L ${c.X(mid)} ${y} L ${c.X(q3)} ${r2(y + peak)} L ${c.X(o.hi)} ${y}`,
        })
      );
    }
    return parts.join("");
  }
  if (o.doorType === "sliding" || o.doorType === "pocket") {
    // §2.1: gap with offset parallel leaf line(s), no arc
    const off = c.px(c.wallT) * 0.28;
    const mid = (o.lo + o.hi) / 2;
    const parts: string[] = [jambLines(o, c)];
    if (o.vertical) {
      const x = c.X(o.along);
      parts.push(line({ class: "sx-fp-door-leaf", x1: r2(x - off), y1: c.Y(o.lo), x2: r2(x - off), y2: c.Y(mid) }));
      if (o.doorType === "sliding") {
        parts.push(line({ class: "sx-fp-door-leaf", x1: r2(x + off), y1: c.Y(mid), x2: r2(x + off), y2: c.Y(o.hi) }));
      }
    } else {
      const y = c.Y(o.along);
      parts.push(line({ class: "sx-fp-door-leaf", x1: c.X(o.lo), y1: r2(y - off), x2: c.X(mid), y2: r2(y - off) }));
      if (o.doorType === "sliding") {
        parts.push(line({ class: "sx-fp-door-leaf", x1: c.X(mid), y1: r2(y + off), x2: c.X(o.hi), y2: r2(y + off) }));
      }
    }
    return parts.join("");
  }
  return jambLines(o, c) + swingLeaf(o, c, o.hinge !== "right", wd);
}

// ─── Dimension lines (architectural slash ticks) ─────────────────

function renderDim(d: DimLineGeom, c: Ctx): string {
  const cls = d.minor ? "sx-fp-dim-text-minor" : "sx-fp-dim-text";
  const tick = 3.6;
  if (!d.vertical) {
    const y = c.Y(d.at);
    const x1 = c.X(d.lo);
    const x2 = c.X(d.hi);
    return (
      line({ class: "sx-fp-dim", x1, y1: y, x2, y2: y }) +
      line({ class: "sx-fp-dim", x1: r2(x1 - tick), y1: r2(y + tick), x2: r2(x1 + tick), y2: r2(y - tick) }) +
      line({ class: "sx-fp-dim", x1: r2(x2 - tick), y1: r2(y + tick), x2: r2(x2 + tick), y2: r2(y - tick) }) +
      textEl({ class: cls, x: r2((x1 + x2) / 2), y: r2(y - 4), "text-anchor": "middle" }, d.label)
    );
  }
  const x = c.X(d.at);
  const y1 = c.Y(d.lo);
  const y2 = c.Y(d.hi);
  const mid = r2((y1 + y2) / 2);
  return (
    line({ class: "sx-fp-dim", x1: x, y1, x2: x, y2 }) +
    line({ class: "sx-fp-dim", x1: r2(x - tick), y1: r2(y1 + tick), x2: r2(x + tick), y2: r2(y1 - tick) }) +
    line({ class: "sx-fp-dim", x1: r2(x - tick), y1: r2(y2 + tick), x2: r2(x + tick), y2: r2(y2 - tick) }) +
    textEl(
      { class: cls, x: r2(x - 5), y: mid, "text-anchor": "middle", transform: `rotate(-90 ${r2(x - 5)} ${mid})` },
      d.label
    )
  );
}

function roundedRoutePath(
  points: RoutePoint[],
  c: Pick<Ctx, "X" | "Y" | "px">
): string {
  if (points.length === 0) return "";
  const first = points[0];
  if (!first) return "";
  let d = `M ${c.X(first.x)} ${c.Y(first.y)}`;
  const radius = 0.3;
  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    if (!previous || !current || !next) continue;
    const inLength = Math.hypot(current.x - previous.x, current.y - previous.y);
    const outLength = Math.hypot(next.x - current.x, next.y - current.y);
    if (inLength < 1e-9 || outLength < 1e-9) continue;
    const r = Math.min(radius, inLength / 2, outLength / 2);
    const before = {
      x: current.x - ((current.x - previous.x) / inLength) * r,
      y: current.y - ((current.y - previous.y) / inLength) * r,
    };
    const after = {
      x: current.x + ((next.x - current.x) / outLength) * r,
      y: current.y + ((next.y - current.y) / outLength) * r,
    };
    d +=
      ` L ${c.X(before.x)} ${c.Y(before.y)}` +
      ` Q ${c.X(current.x)} ${c.Y(current.y)} ${c.X(after.x)} ${c.Y(after.y)}`;
  }
  const last = points[points.length - 1];
  if (last) d += ` L ${c.X(last.x)} ${c.Y(last.y)}`;
  return d;
}

function renderRoute(
  route: NonNullable<FloorplanLayoutResult["evacuation"]>["routes"][number],
  c: Pick<Ctx, "X" | "Y" | "px">
): string {
  const children = [
    path({
      class: `sx-fp-route-${route.kind}`,
      d: roundedRoutePath(route.points, c),
    }),
    ...route.chevrons.map((chevron) =>
      el("polygon", {
        class: "sx-fp-chevron",
        points: "0,-3.2 7,0 0,3.2",
        transform: `translate(${c.X(chevron.x)},${c.Y(chevron.y)}) rotate(${chevron.deg})`,
      })
    ),
  ];
  if (route.kind === "accessible" && route.points.length >= 2) {
    const midpoint = route.points[Math.floor(route.points.length / 2)];
    if (midpoint) {
      children.push(
        group(
          {
            class: "sx-fp-route-accessible-mark",
            transform: `translate(${c.X(midpoint.x)},${c.Y(midpoint.y)})`,
          },
          [
            el("circle", { class: "sx-fp-chevron", cx: 0, cy: 0, r: 6.5 }),
            el("circle", { class: "sx-fp-access-glyph-fill", cx: -1.5, cy: -2.5, r: 1.2 }),
            path({
              class: "sx-fp-access-glyph",
              d: "M -1 -1 L -1 2 L 2 2 M 1.5 2 A 3 3 0 1 1 -1.5 -1",
            }),
          ]
        )
      );
    }
  }
  return group(
    {
      class: "sx-fp-route",
      "data-route": route.kind,
      "data-route-id": route.id,
    },
    children
  );
}

function hasRtl(text: string): boolean {
  return /[\u0590-\u08ff]/.test(text);
}

function renderSafetyLabel(
  label: string,
  x: number,
  y: number
): string[] {
  const halves = label.split(" / ");
  if (halves.length !== 2) {
    return [
      textEl(
        {
          class: "sx-fp-safety-label",
          x,
          y,
          "text-anchor": "middle",
          direction: hasRtl(label) ? "rtl" : undefined,
          "unicode-bidi": hasRtl(label) ? "plaintext" : undefined,
        },
        label
      ),
    ];
  }
  const first = halves[0] ?? "";
  const second = halves[1] ?? "";
  return [
    textEl(
      {
        class: "sx-fp-safety-label",
        x,
        y: y - 2,
        "text-anchor": "middle",
        direction: hasRtl(first) ? "rtl" : undefined,
        "unicode-bidi": hasRtl(first) ? "plaintext" : undefined,
      },
      first
    ),
    textEl(
      {
        class: "sx-fp-safety-label",
        x,
        y: y + 9,
        "text-anchor": "middle",
        direction: hasRtl(second) ? "rtl" : undefined,
        "unicode-bidi": hasRtl(second) ? "plaintext" : undefined,
      },
      second
    ),
  ];
}

function renderSafetySymbol(
  symbol: NonNullable<FloorplanLayoutResult["evacuation"]>["symbols"][number],
  profile: NonNullable<FloorplanLayoutResult["evacuation"]>["profile"],
  c: Pick<Ctx, "X" | "Y" | "px">
): string {
  const def = resolveSafetySymbol(symbol.kind, {
    hand: symbol.hand,
    profile,
  });
  const size = c.px(symbol.sizeM);
  const centerX = c.X(symbol.x);
  const centerY = c.Y(symbol.y);
  const children = [
    group(
      {
        transform:
          `translate(${centerX},${centerY})` +
          `${symbol.rotate ? ` rotate(${r2(symbol.rotate)})` : ""}` +
          ` scale(${r2(size / 24)}) translate(-12,-12)`,
      },
      [def.draw({ hand: symbol.hand, profile })]
    ),
  ];
  if (symbol.fireClass) {
    children.push(
      textEl(
        {
          class: "sx-fp-safety-class",
          x: centerX,
          y: r2(centerY + size / 2 + 10),
          "text-anchor": "middle",
        },
        symbol.fireClass
      )
    );
  }
  if (symbol.label) {
    children.push(
      ...renderSafetyLabel(
        symbol.label,
        centerX,
        r2(centerY + size / 2 + (symbol.fireClass ? 22 : 12))
      )
    );
  }
  return group(
    {
      class: "sx-fp-safety",
      "data-safety": symbol.kind,
      "data-code": symbol.code,
      "data-safety-id": symbol.id,
    },
    children
  );
}

function renderFireDoor(
  mark: NonNullable<FloorplanLayoutResult["evacuation"]>["fireDoors"][number],
  lay: FloorplanLayoutResult,
  c: Pick<Ctx, "X" | "Y">
): string {
  const opening = lay.openings[mark.opening];
  if (!opening) return "";
  const cls = mark.kind === "fire-door" ? "sx-fp-fire-door" : "sx-fp-smoke-door";
  const cx = opening.vertical
    ? c.X(opening.along)
    : (c.X(opening.lo) + c.X(opening.hi)) / 2;
  const cy = opening.vertical
    ? (c.Y(opening.lo) + c.Y(opening.hi)) / 2
    : c.Y(opening.along);
  const shape = opening.vertical
    ? line({
        class: cls,
        x1: c.X(opening.along),
        y1: c.Y(opening.lo),
        x2: c.X(opening.along),
        y2: c.Y(opening.hi),
      })
    : line({
        class: cls,
        x1: c.X(opening.lo),
        y1: c.Y(opening.along),
        x2: c.X(opening.hi),
        y2: c.Y(opening.along),
      });
  const rating = mark.rating
    ? textEl(
        {
          class: "sx-fp-door-rating",
          x: r2(cx + 5),
          y: r2(cy - 5),
          "text-anchor": "start",
        },
        mark.rating
      )
    : "";
  return group(
    { class: "sx-fp-rated-door", "data-door-mark": mark.kind },
    [shape, rating]
  );
}

// ─── Main ────────────────────────────────────────────────────────

export function renderFloorplanLayout(lay: FloorplanLayoutResult, config?: RenderConfig): string {
  const isEvacuation = lay.mode === "evacuation" && lay.evacuation !== undefined;
  const evacuationTheme = isEvacuation
    ? resolveEvacuationTheme(config?.theme ?? "default")
    : undefined;
  const t: Theme =
    evacuationTheme ?? resolveFloorplanTheme(config?.theme ?? "default");
  if (lay.errors.length > 0) return renderErrorPanel(lay, t);
  // Deliberate exception: monochrome is a compliance error but does not block
  // rendering. Keeping the colour SVG visible lets the author diagnose the
  // remaining plan instead of replacing it with the ordinary error panel.
  const renderErrors =
    isEvacuation && config?.theme === "monochrome"
      ? [
          "monochrome theme is not permitted for evacuation plans — ISO 3864 safety colours are semantic (green = escape, red = fire equipment); rendering in default colours instead",
        ]
      : [];

  const scale = C.scale;
  const px = (m: number): number => r2(m * scale);
  const band = C.dimBand + C.pad;
  // casement arcs and bay projections extend outside the walls — widen the
  // trailing band so they never clip
  let outward = 0;
  for (const o of lay.openings) {
    if (o.kind !== "window") continue;
    if (o.windowType === "casement") outward = Math.max(outward, o.hi - o.lo + 0.1);
    if (o.windowType === "bay") outward = Math.max(outward, 0.6);
  }
  const tail = C.pad + lay.wallT + outward;
  const ox = -lay.bounds.minX + band;
  const oy = -lay.bounds.minY + band;
  const X = (m: number): number => px(m + ox);
  const Y = (m: number): number => px(m + oy);
  const ctx: Ctx = { X, Y, px, t, wallT: lay.wallT };

  const titleH = TITLE.bandH;
  const diagnosticCount = lay.warnings.length + renderErrors.length;
  const warnH = diagnosticCount ? diagnosticCount * 17 + 10 : 0;
  let W = px(lay.bounds.maxX - lay.bounds.minX + band + tail);
  let H = px(lay.bounds.maxY - lay.bounds.minY + band + tail) + titleH + warnH;
  // house rule (PR #40): center the title on the content, not the canvas —
  // the leading dim band is wider than the trailing pad
  const titleX = r2(X((lay.bounds.minX + lay.bounds.maxX) / 2));
  const legacySingle = lay.plates.length === 1 && lay.plates[0]?.level === 0;
  const plateLayers: RenderLayers[] = lay.plates.map(() => ({
    floors: [],
    routes: [],
    furniture: [],
    walls: [],
    openings: [],
    fireDoors: [],
    safety: [],
    labels: [],
    dims: [],
  }));
  const roomPlate = new Map<number, number>();
  const itemPlate = new Map<number, number>();
  const openingPlate = new Map<number, number>();
  const dimPlate = new Map<number, number>();
  const seamPlate = new Map<number, number>();
  const floorPlate = new Map<number, number>();
  lay.plates.forEach((plate, plateIndex) => {
    floorPlate.set(plate.level, plateIndex);
    plate.roomIdx.forEach((index) => roomPlate.set(index, plateIndex));
    plate.itemIdx.forEach((index) => itemPlate.set(index, plateIndex));
    plate.openingIdx.forEach((index) => openingPlate.set(index, plateIndex));
    plate.dimIdx.forEach((index) => dimPlate.set(index, plateIndex));
    plate.seamIdx.forEach((index) => seamPlate.set(index, plateIndex));
  });
  const firstLayer = plateLayers[0];
  if (!firstLayer) throw new Error("floorplan layout must contain at least one plate");
  const layerFor = (map: Map<number, number>, index: number): RenderLayers =>
    plateLayers[map.get(index) ?? 0] ?? firstLayer;

  // z-order §4.4
  const floors: string[] = [];
  const routes: string[] = [];
  const furniture: string[] = [];
  const walls: string[] = [];
  const openings: string[] = [];
  const fireDoors: string[] = [];
  const safety: string[] = [];
  const labels: string[] = [];
  const dims: string[] = [];
  const nativeHandles: string[] = [];

  for (const room of lay.rooms) {
    const key = `node:${room.id}`;
    config?.__scene?.push({
      key,
      kind: "node",
      semanticId: room.id,
      label: room.label,
      sourceRange: room.labelSourceRange,
      bbox: {
        x: X(room.x),
        y: Y(room.y) + titleH,
        width: px(room.w),
        height: px(room.h),
      },
      editable: { label: room.labelSourceRange !== undefined, position: "none" },
    });
    if (
      config?.__scene &&
      room.parts.length === 1 &&
      room.sizeSourceRange &&
      room.sourceW !== undefined &&
      room.sourceH !== undefined
    ) {
      const unitScale = lay.unit === "ft" ? 0.3048 : 1;
      const addResizeHandle = (
        axis: "x" | "y" | "xy",
        x: number,
        y: number,
      ): void => {
        const handleKey = `handle:room:${room.id}:${axis}`;
        config.__scene!.push({
          key: handleKey,
          kind: "node",
          label: `${room.label} size`,
          bbox: { x: x - 5, y: y - 5 + titleH, width: 10, height: 10 },
          positionSource: {
            kind: "size",
            range: room.sizeSourceRange!,
            width: room.sourceW!,
            height: room.sourceH!,
            unitsPerSvgX: 1 / (scale * unitScale),
            unitsPerSvgY: 1 / (scale * unitScale),
            axis,
            minWidth: lay.unit === "ft" ? 2 : 0.6,
            minHeight: lay.unit === "ft" ? 2 : 0.6,
          },
          editable: { label: false, position: axis === "x" ? "move-x" : axis === "y" ? "move-y" : "free" },
        });
        nativeHandles.push(el("circle", {
          cx: x,
          cy: y,
          r: 5,
          class: "sx-native-handle",
          "data-axis": axis,
          "data-sx-key": handleKey,
          "data-sx-owner": handleKey,
        }));
      };
      addResizeHandle("x", X(room.x + room.w), Y(room.y + room.h / 2));
      addResizeHandle("y", X(room.x + room.w / 2), Y(room.y + room.h));
      addResizeHandle("xy", X(room.x + room.w), Y(room.y + room.h));
    }
  }

  lay.rooms.forEach((r, roomIndex) => {
    const floorShape = group(
      {
        class: "sx-fp-floor",
        "data-room": r.id,
        "data-sx-key": config?.__scene ? `node:${r.id}` : undefined,
        "data-sx-owner": config?.__scene ? `node:${r.id}` : undefined,
      },
      r.parts.map((p) =>
        rect({
          fill: r.fill ?? t.floorFill,
          x: X(p.x),
          y: Y(p.y),
          width: px(p.w),
          height: px(p.h),
        })
      )
    );
    floors.push(floorShape);
    layerFor(roomPlate, roomIndex).floors.push(floorShape);
    if (!r.nolabel) {
      // label centers on the largest part (research-backed convention for L-rooms)
      const main = r.parts.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
      const cx = X(main.x + main.w / 2);
      const cy = Y(main.y + main.h / 2);
      const name = textEl({
        class: "sx-fp-room-name",
        x: cx,
        y: r2(cy - 3),
        "text-anchor": "middle",
        "data-sx-owner": config?.__scene ? `node:${r.id}` : undefined,
        "data-sx-role": config?.__scene && r.labelSourceRange ? "label" : undefined,
      }, r.label);
      const area = textEl({
        class: "sx-fp-room-area",
        x: cx,
        y: r2(cy + 13),
        "text-anchor": "middle",
        "data-sx-owner": config?.__scene ? `node:${r.id}` : undefined,
      }, r.areaText);
      if (isEvacuation) {
        labels.push(name);
        layerFor(roomPlate, roomIndex).labels.push(name);
      } else {
        labels.push(name, area);
        layerFor(roomPlate, roomIndex).labels.push(name, area);
      }
    }
  });

  if (isEvacuation) {
    for (const route of lay.evacuation?.routes ?? []) {
      const shape = renderRoute(route, ctx);
      routes.push(shape);
      (plateLayers[floorPlate.get(route.floor) ?? 0] ?? firstLayer).routes.push(shape);
    }
  }

  const warnSet = new Set(lay.warnItems);
  lay.items.forEach((it, idx) => {
    if (
      isEvacuation &&
      !lay.evacuation?.showFurniture &&
      !EVAC_KEEP.has(it.type)
    ) {
      return;
    }
    const def = FLOORPLAN_SYMBOLS[it.type];
    const wpx = px(it.w);
    const hpx = px(it.h);
    const cx = r2(X(it.x) + wpx / 2);
    const cy = r2(Y(it.y) + hpx / 2);
    const rot = Math.round(it.rotate * 10) / 10;
    const itemKey = `item:furniture:${it.sourceLine ?? `${it.roomId}:${it.type}:${it.seq}`}`;
    const canMove = it.positionSourceRange !== undefined && it.sourceX !== undefined && it.sourceY !== undefined;
    config?.__scene?.push({
      key: itemKey,
      kind: "node",
      label: it.label ?? it.type,
      sourceRange: it.labelSourceRange,
      bbox: { x: X(it.x), y: Y(it.y) + titleH, width: wpx, height: hpx },
      positionSource: canMove
        ? {
            range: it.positionSourceRange!,
            x: it.sourceX!,
            y: it.sourceY!,
            unitsPerSvgX: 1 / (scale * (lay.unit === "ft" ? 0.3048 : 1)),
            unitsPerSvgY: 1 / (scale * (lay.unit === "ft" ? 0.3048 : 1)),
          }
        : undefined,
      editable: { label: it.labelSourceRange !== undefined, position: canMove ? "free" : "none" },
    });
    const children = [def.draw({ w: it.w, h: it.h, px, label: it.label, seats: it.seats })];
    if (warnSet.has(idx)) {
      children.push(rect({ class: "sx-fp-warn-item", x: -1, y: -1, width: r2(wpx + 2), height: r2(hpx + 2) }));
    }
    const itemShape = group(
      {
        class: "sx-fp-item",
        "data-furniture": it.type,
        "data-sx-key": config?.__scene ? itemKey : undefined,
        "data-sx-owner": config?.__scene ? itemKey : undefined,
        transform: `translate(${cx},${cy})${rot ? ` rotate(${rot})` : ""} translate(${r2(-wpx / 2)},${r2(-hpx / 2)})`,
      },
      children
    );
    furniture.push(itemShape);
    layerFor(itemPlate, idx).furniture.push(itemShape);
    if (it.label && !def.consumesLabel) {
      const labelKey = `label:furniture:${it.roomId}:${it.type}:${it.seq}`;
      config?.__scene?.push({
        key: labelKey,
        kind: "label",
        label: it.label,
        sourceRange: it.labelSourceRange,
        bbox: { x: cx - Math.max(24, it.label.length * 3.2), y: cy - 8 + titleH, width: Math.max(48, it.label.length * 6.4), height: 16 },
        editable: { label: it.labelSourceRange !== undefined, position: "none" },
      });
      const label = textEl({
        class: "sx-fp-furn-label",
        x: cx,
        y: r2(cy + 4),
        "text-anchor": "middle",
        "data-sx-key": config?.__scene && it.labelSourceRange ? labelKey : undefined,
        "data-sx-owner": config?.__scene ? itemKey : undefined,
        "data-sx-role": config?.__scene && it.labelSourceRange ? "label" : undefined,
      }, it.label);
      labels.push(label);
      layerFor(itemPlate, idx).labels.push(label);
    }
  });

  const tw = lay.wallT;
  lay.rooms.forEach((r, roomIndex) => {
    const roomWalls: string[] = [];
    for (const p of r.parts) {
      roomWalls.push(rect({ class: "sx-fp-wall", x: r2(X(p.x) - px(tw / 2)), y: r2(Y(p.y) - px(tw / 2)), width: r2(px(p.w + tw)), height: px(tw) }));
      roomWalls.push(rect({ class: "sx-fp-wall", x: r2(X(p.x) - px(tw / 2)), y: r2(Y(p.y + p.h) - px(tw / 2)), width: r2(px(p.w + tw)), height: px(tw) }));
      roomWalls.push(rect({ class: "sx-fp-wall", x: r2(X(p.x) - px(tw / 2)), y: r2(Y(p.y) - px(tw / 2)), width: px(tw), height: r2(px(p.h + tw)) }));
      roomWalls.push(rect({ class: "sx-fp-wall", x: r2(X(p.x + p.w) - px(tw / 2)), y: r2(Y(p.y) - px(tw / 2)), width: px(tw), height: r2(px(p.h + tw)) }));
    }
    const wallShape = config?.__scene
      ? group({ "data-sx-owner": `node:${r.id}` }, roomWalls)
      : roomWalls.join("");
    walls.push(wallShape);
    layerFor(roomPlate, roomIndex).walls.push(wallShape);
  });

  // interior seams between parts of the same room — open the wall fully
  lay.seams.forEach((s, seamIndex) => {
    const fill = lay.rooms[s.room]?.fill ?? t.floorFill;
    const tpx = px(tw);
    let rawSeam: string;
    if (s.vertical) {
      rawSeam = rect({ class: "sx-fp-gap", fill, x: r2(X(s.along) - tpx / 2 - 0.5), y: Y(s.lo), width: r2(tpx + 1), height: px(s.hi - s.lo) });
    } else {
      rawSeam = rect({ class: "sx-fp-gap", fill, x: X(s.lo), y: r2(Y(s.along) - tpx / 2 - 0.5), width: px(s.hi - s.lo), height: r2(tpx + 1) });
    }
    const seamShape = config?.__scene
      ? group({ "data-sx-owner": `node:${lay.rooms[s.room]!.id}` }, [rawSeam])
      : rawSeam;
    openings.push(seamShape);
    layerFor(seamPlate, seamIndex).openings.push(seamShape);
  });

  lay.openings.forEach((o, openingIndex) => {
    const shapes = [punchGap(o, lay, ctx)];
    if (o.kind === "window") shapes.push(windowSymbol(o, ctx));
    else if (o.kind === "door") shapes.push(doorSymbol(o, ctx));
    else shapes.push(jambLines(o, ctx));
    const openingShape = config?.__scene
      ? group({ "data-sx-owner": `node:${lay.rooms[o.owner]!.id}` }, shapes)
      : shapes.join("");
    openings.push(openingShape);
    layerFor(openingPlate, openingIndex).openings.push(openingShape);
  });

  if (isEvacuation) {
    for (const mark of lay.evacuation?.fireDoors ?? []) {
      const shape = renderFireDoor(mark, lay, ctx);
      fireDoors.push(shape);
      const plateIndex =
        openingPlate.get(mark.opening) ?? floorPlate.get(mark.floor) ?? 0;
      (plateLayers[plateIndex] ?? firstLayer).fireDoors.push(shape);
    }
    for (const symbol of lay.evacuation?.symbols ?? []) {
      const shape = renderSafetySymbol(
        symbol,
        lay.evacuation?.profile ?? "iso",
        ctx
      );
      safety.push(shape);
      (plateLayers[floorPlate.get(symbol.floor) ?? 0] ?? firstLayer).safety.push(
        shape
      );
    }
  } else {
    lay.dims.forEach((d, dimIndex) => {
      const dimension = renderDim(d, ctx);
      dims.push(dimension);
      layerFor(dimPlate, dimIndex).dims.push(dimension);
    });
  }

  // north compass — top-right corner of the dim band (§2.1)
  const north = lay.north;
  if (north !== undefined) {
    const compass = (maxX: number, minY: number): string => {
      // Evacuation sheets default the compass on, so keep it inside the plate's
      // right edge rather than relying on the optional floorplan dimension band.
      const ncx = r2(X(maxX) + px(isEvacuation ? -0.55 : 0.55));
      const ncy = r2(Y(minY) - px(0.62));
      const rr = px(0.32);
      const rot = Math.round(north * 10) / 10;
      return group({ class: "sx-fp-compass-g", transform: rot ? `rotate(${rot} ${ncx} ${ncy})` : "" }, [
          el("circle", { class: "sx-fp-compass", cx: ncx, cy: ncy, r: rr }),
          line({ class: "sx-fp-compass", x1: ncx, y1: r2(ncy + rr * 0.7), x2: ncx, y2: r2(ncy - rr * 0.55) }),
          el("polygon", {
            class: "sx-fp-compass",
            fill: t.dimText,
            points: `${ncx},${r2(ncy - rr * 0.85)} ${r2(ncx - rr * 0.22)},${r2(ncy - rr * 0.3)} ${r2(ncx + rr * 0.22)},${r2(ncy - rr * 0.3)}`,
          }),
          textEl({ class: "sx-fp-compass-n", x: r2(ncx + rr + 4), y: r2(ncy - rr * 0.45), "text-anchor": "start" }, "N"),
        ]);
    };
    if (legacySingle) {
      dims.push(compass(lay.bounds.maxX, lay.bounds.minY));
    } else {
      lay.plates.forEach((plate, plateIndex) => {
        (plateLayers[plateIndex] ?? firstLayer).dims.push(
          compass(plate.bounds.maxX + plate.offset.x, plate.bounds.minY + plate.offset.y)
        );
      });
    }
  }

  if (lay.plates.length > 1) {
    lay.plates.forEach((plate, plateIndex) => {
      const centerX = (plate.bounds.minX + plate.bounds.maxX) / 2 + plate.offset.x;
      const topY = plate.bounds.minY + plate.offset.y - C.dimBand - 0.12;
      (plateLayers[plateIndex] ?? firstLayer).dims.unshift(
        textEl(
          { class: "sx-fp-floor-label", x: X(centerX), y: Y(topY), "text-anchor": "middle" },
          plate.label
        )
      );
    });
  }

  if (isEvacuation && lay.evacuation) {
    const scaleNote = textEl(
      {
        class: "sx-fp-scale-note",
        x: X(lay.bounds.maxX),
        y: r2(Y(lay.bounds.maxY) + 22),
        "text-anchor": "end",
        "data-compliant": lay.evacuation.scale.compliant ? "true" : "false",
      },
      lay.evacuation.scale.note
    );
    dims.push(scaleNote);
    firstLayer.dims.push(scaleNote);
  }

  const nRooms = lay.rooms.length;
  const descText = isEvacuation && lay.evacuation
    ? `${nRooms} room${nRooms === 1 ? "" : "s"}, ${lay.evacuation.routes.length} escape route${lay.evacuation.routes.length === 1 ? "" : "s"}, ` +
      `${lay.evacuation.profile === "iso" ? "ISO 23601" : lay.evacuation.profile === "nfpa" ? "NFPA 170" : "UAE Civil Defence"} profile. ` +
      lay.evacuation.scale.note +
      (renderErrors.length ? ` Errors: ${renderErrors.join("; ")}.` : "") +
      (lay.warnings.length ? ` Warnings: ${lay.warnings.join("; ")}.` : "")
    : legacySingle
    ? `${nRooms} room${nRooms === 1 ? "" : "s"}, ${formatArea(lay.totalAreaM2, lay.unit)} total. ` +
      `${lay.items.length} furniture item${lay.items.length === 1 ? "" : "s"}.` +
      (lay.warnings.length ? ` Warnings: ${lay.warnings.join("; ")}.` : "")
    : `${lay.plates.length} floors, ${nRooms} rooms, ${formatArea(lay.totalAreaM2, lay.unit)} total (` +
      `${lay.plates.map((plate) => `${plate.label} ${plate.areaText}`).join(", ")}). ` +
      `${lay.items.length} furniture item${lay.items.length === 1 ? "" : "s"}.` +
      (lay.warnings.length ? ` Warnings: ${lay.warnings.join("; ")}.` : "");

  const groupedLayers = (layers: RenderLayers): string[] =>
    isEvacuation
      ? [
          group({ class: "sx-fp-floors" }, layers.floors),
          group({ class: "sx-fp-routes" }, layers.routes),
          group({ class: "sx-fp-furniture" }, layers.furniture),
          group({ class: "sx-fp-walls" }, layers.walls),
          group({ class: "sx-fp-openings" }, layers.openings),
          group({ class: "sx-fp-fire-doors" }, layers.fireDoors),
          group({ class: "sx-fp-safety-symbols" }, layers.safety),
          group({ class: "sx-fp-labels" }, layers.labels),
          group({ class: "sx-fp-dims" }, layers.dims),
        ]
      : [
          group({ class: "sx-fp-floors" }, layers.floors),
          group({ class: "sx-fp-furniture" }, layers.furniture),
          group({ class: "sx-fp-walls" }, layers.walls),
          group({ class: "sx-fp-openings" }, layers.openings),
          group({ class: "sx-fp-labels" }, layers.labels),
          group({ class: "sx-fp-dims" }, layers.dims),
        ];
  const content = legacySingle
    ? groupedLayers({
        floors,
        routes,
        furniture,
        walls,
        openings,
        fireDoors,
        safety,
        labels,
        dims,
      })
    : lay.plates.map((plate, plateIndex) =>
      group(
        { class: "sx-fp-plate", "data-floor": String(plate.level) },
        groupedLayers(plateLayers[plateIndex] ?? firstLayer)
      )
    );

  const naturalWidth = W;
  const chartHeight = H - warnH;
  let legendSvg = "";
  let legendBottom = chartHeight;
  if (isEvacuation && lay.evacuation && evacuationTheme) {
    const rendered = renderLegend(
      lay.evacuation.legend,
      {
        canvasWidth: W,
        canvasHeight: chartHeight,
        padding: 16,
        titleHeight: titleH,
      },
      evacuationTheme,
      { fontFamily: EVAC_BODY_FONT, fontSize: 11 }
    );
    legendSvg = rendered.svg;
    if (legendSvg) {
      W = Math.max(W, rendered.bbox.x + rendered.bbox.w + 8);
      legendBottom = Math.max(
        chartHeight,
        rendered.bbox.y + rendered.bbox.h + 8
      );
    }
  }
  H = legendBottom + warnH;
  const chartXOffset = Math.max(0, (W - naturalWidth) / 2);
  const warnBlock: string[] = [];
  if (diagnosticCount) {
    const y0 = H - warnH + 4;
    renderErrors.forEach((error, index) => {
      warnBlock.push(
        textEl(
          {
            class: "sx-fp-compliance-error",
            x: 10,
            y: r2(y0 + index * 17 + 10),
          },
          `✕ ${error}`
        )
      );
    });
    lay.warnings.forEach((warning, index) => {
      warnBlock.push(
        textEl(
          {
            class: "sx-fp-warn",
            x: 10,
            y: r2(y0 + (renderErrors.length + index) * 17 + 10),
          },
          `⚠ ${warning}`
        )
      );
    });
  }

  const titleScene = resolveSceneTitle(
    lay.title,
    lay.titleSourceRange,
    r2(titleX + chartXOffset),
    TITLE.y,
    config
  );
  const titleNode = textEl({ class: "sx-fp-title", x: titleScene.x, y: titleScene.y, "text-anchor": "middle", ...titleScene.attrs }, lay.title);

  return svgRoot(
    {
      viewBox: `0 0 ${W} ${H}`,
      width: W,
      height: H,
      class: isEvacuation ? "sx-fp sx-fp-evac" : "sx-fp",
      role: "img",
    },
    [
      titleEl(lay.title),
      descEl(descText),
      el(
        "style",
        {},
        buildCss(t, lay.plates.length > 1, evacuationTheme)
      ),
      rect({ fill: t.bg, x: 0, y: 0, width: W, height: H }),
      ...(config?.__scene
        ? [
            group({ transform: `translate(${r2(chartXOffset)},${titleH})` }, [
              ...content,
              group({ class: "sx-native-handles" }, nativeHandles),
            ]),
            titleNode,
          ]
        : [
            titleNode,
            group(
              { transform: `translate(${r2(chartXOffset)},${titleH})` },
              legacySingle && !isEvacuation
                ? [
                    ...content,
                    group({ class: "sx-native-handles" }, nativeHandles),
                  ]
                : content
            ),
          ]),
      ...(legendSvg ? [legendSvg] : []),
      ...warnBlock,
    ]
  );
}

export function renderFloorplan(text: string, config?: RenderConfig): string {
  return renderFloorplanLayout(layoutFloorplan(parseFloorplan(text), config?.__pins), config);
}
