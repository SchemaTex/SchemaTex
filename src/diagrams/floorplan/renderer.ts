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
  resolveFloorplanTheme,
  type FloorplanTokens,
  type ResolvedTheme,
} from "../../core/theme";
import { parseFloorplan } from "./parser";
import { FLOORPLAN_CONST as C, formatArea, layoutFloorplan } from "./layout";
import { FLOORPLAN_SYMBOLS } from "./catalog";
import type { DimLineGeom, FloorplanLayoutResult, OpeningGeom } from "./types";

type Theme = ResolvedTheme<FloorplanTokens>;

const r2 = (n: number): number => Math.round(n * 100) / 100;

function buildCss(t: Theme): string {
  return `
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
`.trim();
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

// ─── Main ────────────────────────────────────────────────────────

export function renderFloorplanLayout(lay: FloorplanLayoutResult, config?: RenderConfig): string {
  const t = resolveFloorplanTheme(config?.theme ?? "default");
  if (lay.errors.length > 0) return renderErrorPanel(lay, t);

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
  const warnH = lay.warnings.length ? lay.warnings.length * 17 + 10 : 0;
  const W = px(lay.bounds.maxX - lay.bounds.minX + band + tail);
  const H = px(lay.bounds.maxY - lay.bounds.minY + band + tail) + titleH + warnH;
  // house rule (PR #40): center the title on the content, not the canvas —
  // the leading dim band is wider than the trailing pad
  const titleX = r2(X((lay.bounds.minX + lay.bounds.maxX) / 2));

  // z-order §4.4
  const floors: string[] = [];
  const furniture: string[] = [];
  const walls: string[] = [];
  const openings: string[] = [];
  const labels: string[] = [];
  const dims: string[] = [];

  for (const r of lay.rooms) {
    floors.push(
      group(
        { class: "sx-fp-floor", "data-room": r.id },
        r.parts.map((p) =>
          rect({
            fill: r.fill ?? t.floorFill,
            x: X(p.x),
            y: Y(p.y),
            width: px(p.w),
            height: px(p.h),
          })
        )
      )
    );
    if (!r.nolabel) {
      // label centers on the largest part (research-backed convention for L-rooms)
      const main = r.parts.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
      const cx = X(main.x + main.w / 2);
      const cy = Y(main.y + main.h / 2);
      labels.push(textEl({ class: "sx-fp-room-name", x: cx, y: r2(cy - 3), "text-anchor": "middle" }, r.label));
      labels.push(textEl({ class: "sx-fp-room-area", x: cx, y: r2(cy + 13), "text-anchor": "middle" }, r.areaText));
    }
  }

  const warnSet = new Set(lay.warnItems);
  lay.items.forEach((it, idx) => {
    const def = FLOORPLAN_SYMBOLS[it.type];
    const wpx = px(it.w);
    const hpx = px(it.h);
    const cx = r2(X(it.x) + wpx / 2);
    const cy = r2(Y(it.y) + hpx / 2);
    const rot = Math.round(it.rotate * 10) / 10;
    const children = [def.draw({ w: it.w, h: it.h, px, label: it.label })];
    if (warnSet.has(idx)) {
      children.push(rect({ class: "sx-fp-warn-item", x: -1, y: -1, width: r2(wpx + 2), height: r2(hpx + 2) }));
    }
    furniture.push(
      group(
        {
          class: "sx-fp-item",
          "data-furniture": it.type,
          transform: `translate(${cx},${cy})${rot ? ` rotate(${rot})` : ""} translate(${r2(-wpx / 2)},${r2(-hpx / 2)})`,
        },
        children
      )
    );
    if (it.label && !def.consumesLabel) {
      labels.push(textEl({ class: "sx-fp-furn-label", x: cx, y: r2(cy + 4), "text-anchor": "middle" }, it.label));
    }
  });

  const tw = lay.wallT;
  for (const r of lay.rooms) {
    for (const p of r.parts) {
      walls.push(rect({ class: "sx-fp-wall", x: r2(X(p.x) - px(tw / 2)), y: r2(Y(p.y) - px(tw / 2)), width: r2(px(p.w + tw)), height: px(tw) }));
      walls.push(rect({ class: "sx-fp-wall", x: r2(X(p.x) - px(tw / 2)), y: r2(Y(p.y + p.h) - px(tw / 2)), width: r2(px(p.w + tw)), height: px(tw) }));
      walls.push(rect({ class: "sx-fp-wall", x: r2(X(p.x) - px(tw / 2)), y: r2(Y(p.y) - px(tw / 2)), width: px(tw), height: r2(px(p.h + tw)) }));
      walls.push(rect({ class: "sx-fp-wall", x: r2(X(p.x + p.w) - px(tw / 2)), y: r2(Y(p.y) - px(tw / 2)), width: px(tw), height: r2(px(p.h + tw)) }));
    }
  }

  // interior seams between parts of the same room — open the wall fully
  for (const s of lay.seams) {
    const fill = lay.rooms[s.room]?.fill ?? t.floorFill;
    const tpx = px(tw);
    if (s.vertical) {
      openings.push(
        rect({ class: "sx-fp-gap", fill, x: r2(X(s.along) - tpx / 2 - 0.5), y: Y(s.lo), width: r2(tpx + 1), height: px(s.hi - s.lo) })
      );
    } else {
      openings.push(
        rect({ class: "sx-fp-gap", fill, x: X(s.lo), y: r2(Y(s.along) - tpx / 2 - 0.5), width: px(s.hi - s.lo), height: r2(tpx + 1) })
      );
    }
  }

  for (const o of lay.openings) {
    openings.push(punchGap(o, lay, ctx));
    if (o.kind === "window") openings.push(windowSymbol(o, ctx));
    else if (o.kind === "door") openings.push(doorSymbol(o, ctx));
    else openings.push(jambLines(o, ctx));
  }

  for (const d of lay.dims) dims.push(renderDim(d, ctx));

  // north compass — top-right corner of the dim band (§2.1)
  if (lay.north !== undefined) {
    const ncx = r2(X(lay.bounds.maxX) + px(0.55));
    const ncy = r2(Y(lay.bounds.minY) - px(0.62));
    const rr = px(0.32);
    const rot = Math.round(lay.north * 10) / 10;
    dims.push(
      group({ class: "sx-fp-compass-g", transform: rot ? `rotate(${rot} ${ncx} ${ncy})` : "" }, [
        el("circle", { class: "sx-fp-compass", cx: ncx, cy: ncy, r: rr }),
        line({ class: "sx-fp-compass", x1: ncx, y1: r2(ncy + rr * 0.7), x2: ncx, y2: r2(ncy - rr * 0.55) }),
        el("polygon", {
          class: "sx-fp-compass",
          fill: t.dimText,
          points: `${ncx},${r2(ncy - rr * 0.85)} ${r2(ncx - rr * 0.22)},${r2(ncy - rr * 0.3)} ${r2(ncx + rr * 0.22)},${r2(ncy - rr * 0.3)}`,
        }),
        textEl({ class: "sx-fp-compass-n", x: r2(ncx + rr + 4), y: r2(ncy - rr * 0.45), "text-anchor": "start" }, "N"),
      ])
    );
  }

  const warnBlock: string[] = [];
  if (lay.warnings.length) {
    const y0 = H - warnH + 4;
    lay.warnings.forEach((w, i) => {
      warnBlock.push(textEl({ class: "sx-fp-warn", x: 10, y: r2(y0 + i * 17 + 10) }, `⚠ ${w}`));
    });
  }

  const nRooms = lay.rooms.length;
  const descText =
    `${nRooms} room${nRooms === 1 ? "" : "s"}, ${formatArea(lay.totalAreaM2, lay.unit)} total. ` +
    `${lay.items.length} furniture item${lay.items.length === 1 ? "" : "s"}.` +
    (lay.warnings.length ? ` Warnings: ${lay.warnings.join("; ")}.` : "");

  return svgRoot(
    { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "sx-fp", role: "img" },
    [
      titleEl(lay.title),
      descEl(descText),
      el("style", {}, buildCss(t)),
      rect({ fill: t.bg, x: 0, y: 0, width: W, height: H }),
      textEl({ class: "sx-fp-title", x: titleX, y: TITLE.y, "text-anchor": "middle" }, lay.title),
      group({ transform: `translate(0,${titleH})` }, [
        group({ class: "sx-fp-floors" }, floors),
        group({ class: "sx-fp-furniture" }, furniture),
        group({ class: "sx-fp-walls" }, walls),
        group({ class: "sx-fp-openings" }, openings),
        group({ class: "sx-fp-labels" }, labels),
        group({ class: "sx-fp-dims" }, dims),
      ]),
      ...warnBlock,
    ]
  );
}

export function renderFloorplan(text: string, config?: RenderConfig): string {
  return renderFloorplanLayout(layoutFloorplan(parseFloorplan(text)), config);
}
