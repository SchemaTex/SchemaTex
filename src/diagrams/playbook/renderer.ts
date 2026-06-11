/**
 * Sports playbook — SVG renderer (multi-sport, sport-agnostic).
 *
 * Picks the per-sport geometry module, builds the px transform (football flips
 * y so downfield is up; basketball/soccer keep the baseline/own-goal at the
 * top/left), then draws: field (module) → zones → moves → players → legend.
 * Movement reads off line *style* (solid/dashed/wavy/double + arrow/T-bar).
 * Spec: 49-SPORTS-PLAYBOOK-STANDARD §7.
 */

import type { RenderConfig } from "../../core/types";
import {
  circle,
  desc as descEl,
  el,
  group,
  line,
  path,
  polygon,
  rect,
  svgRoot,
  text as textEl,
  title as titleEl,
} from "../../core/svg";
import {
  DEFAULT_FONT_FAMILY,
  TITLE,
  resolvePlaybookTheme,
  type PlaybookTokens,
  type ResolvedTheme,
} from "../../core/theme";
import { parsePlaybook } from "./parser";
import { layoutPlaybook, sportModule } from "./layout";
import type { MoveGeom, PlaybookLayoutResult, PlayerGeom } from "./types";
import type { LegendItem, RenderCtx } from "./geometry/spec";

type Theme = ResolvedTheme<PlaybookTokens>;
const r2 = (n: number): number => Math.round(n * 100) / 100;

function buildCss(t: Theme): string {
  return `
.sx-pb { font-family: ${DEFAULT_FONT_FAMILY}; }
.sx-pb-title { font: ${TITLE.weight} ${TITLE.size}px sans-serif; fill: ${t.text}; }
.sx-pb-field, .sx-pb-turf { fill: ${t.surface}; }
.sx-pb-court { fill: ${t.courtSurface}; }
.sx-pb-surround { fill: ${t.surround}; }
.sx-pb-surround-court { fill: ${t.courtSurround}; }
.sx-pb-boundary { fill: none; stroke: ${t.lineBold}; stroke-width: 2.6; }
.sx-pb-boundary-court { fill: none; stroke: ${t.courtLine}; stroke-width: 2.6; }
.sx-pb-stripe { fill: ${t.surfaceAlt}; }
.sx-pb-yard, .sx-pb-pitch-line, .sx-pb-goalbox { fill: none; stroke: ${t.lineSoft}; stroke-width: 1.4; }
.sx-pb-court-line { fill: none; stroke: ${t.courtLine}; stroke-width: 1.5; }
.sx-pb-hash { fill: none; stroke: ${t.lineSoft}; stroke-width: 1.2; }
.sx-pb-los, .sx-pb-goalline { fill: none; stroke: ${t.lineBold}; stroke-width: 2.4; }
.sx-pb-goalline { stroke: ${t.goalAccent}; }
.sx-pb-goalpost { fill: none; stroke: ${t.goalAccent}; stroke-width: 2.4; stroke-linecap: round; }
.sx-pb-endzone { fill: ${t.endzoneFill}; }
.sx-pb-yardnum { font: 600 11px sans-serif; fill: ${t.surfaceText}; }
.sx-pb-rim { stroke: ${t.rim}; stroke-width: 2.4; }
.sx-pb-pitch-dot { fill: ${t.lineBold}; }
.sx-pb-zone { fill: ${t.zoneFill}; stroke: ${t.zoneStroke}; stroke-width: 1.3; stroke-dasharray: 5 4; }
.sx-pb-zone-text { font: 9px sans-serif; fill: ${t.zoneStroke}; }
.sx-pb-move { fill: none; stroke: ${t.moveStroke}; stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; }
.sx-pb-move-dash { fill: none; stroke: ${t.moveStroke}; stroke-width: 2.2; stroke-dasharray: 6 4; stroke-linejoin: round; stroke-linecap: round; }
.sx-pb-shot { fill: none; stroke: ${t.shotStroke}; stroke-width: 3.4; stroke-linecap: round; }
.sx-pb-motion { fill: none; stroke: ${t.motionStroke}; stroke-width: 1.9; stroke-dasharray: 4 3; }
.sx-pb-move-fill { fill: ${t.moveStroke}; stroke: none; }
.sx-pb-shot-fill { fill: ${t.shotStroke}; stroke: none; }
.sx-pb-motion-fill { fill: ${t.motionStroke}; stroke: none; }
.sx-pb-o { fill: ${t.offenseFill}; stroke: ${t.offenseStroke}; stroke-width: 2; }
.sx-pb-gk { fill: ${t.gkFill}; stroke: ${t.offenseStroke}; stroke-width: 2; }
.sx-pb-o-text { font: 700 10.5px sans-serif; fill: ${t.offenseLabel}; }
.sx-pb-x { fill: none; stroke: ${t.defenseStroke}; stroke-width: 2.6; stroke-linecap: round; }
.sx-pb-x-text { font: 700 9px sans-serif; fill: ${t.defenseStroke}; }
.sx-pb-ball { fill: ${t.ballFill}; stroke: ${t.lineBold}; stroke-width: 0.8; }
.sx-pb-anno { font: 600 12px sans-serif; fill: ${t.annotation}; }
.sx-pb-legend { font: 11px sans-serif; fill: ${t.annotation}; }
.sx-pb-error-box { fill: ${t.bg}; stroke: ${t.negative}; stroke-width: 1.5; }
.sx-pb-error-title { font: 700 13px ui-monospace, Menlo, monospace; fill: ${t.negative}; }
.sx-pb-error-line { font: 12px ui-monospace, Menlo, monospace; fill: ${t.negative}; }
`.trim();
}

// ─── Error panel ─────────────────────────────────────────────────

function renderErrorPanel(lay: PlaybookLayoutResult, t: Theme): string {
  const lines = lay.errors;
  const w = Math.max(520, ...lines.map((l) => l.length * 6.6 + 48));
  const h = 56 + lines.length * 19;
  return svgRoot(
    { viewBox: `0 0 ${r2(w)} ${h}`, width: r2(w), height: h, class: "sx-pb", role: "img" },
    [
      titleEl(lay.title),
      descEl(`Playbook validation failed with ${lines.length} error${lines.length === 1 ? "" : "s"}.`),
      el("style", {}, buildCss(t)),
      rect({ class: "sx-pb-error-box", x: 1, y: 1, width: r2(w - 2), height: h - 2, rx: 6 }),
      textEl({ class: "sx-pb-error-title", x: 16, y: 26 }, `playbook: ${lines.length} validation error${lines.length === 1 ? "" : "s"}`),
      ...lines.map((e, i) => textEl({ class: "sx-pb-error-line", x: 16, y: 50 + i * 19 }, `⚠ ${e}`)),
    ]
  );
}

// ─── Move rendering ──────────────────────────────────────────────

/** Sine-wave path along a px polyline (dribble). Keeps the tail straight for the arrowhead. */
function wavyPath(pts: Array<{ x: number; y: number }>, amp = 3.4, wl = 11): string {
  const flat: Array<{ x: number; y: number }> = [];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy) || 1;
    const ux = dx / segLen, uy = dy / segLen;
    const nx = -uy, ny = ux;
    const lastSeg = i === pts.length - 1;
    const straightTail = lastSeg ? 9 : 0; // leave the tip straight for the head
    const usable = Math.max(0, segLen - straightTail);
    const steps = Math.max(2, Math.round(usable / 2));
    for (let s = 0; s <= steps; s++) {
      const d = (usable * s) / steps;
      const off = amp * Math.sin((2 * Math.PI * (acc + d)) / wl);
      flat.push({ x: a.x + ux * d + nx * off, y: a.y + uy * d + ny * off });
    }
    acc += usable;
    if (lastSeg) flat.push({ x: b.x, y: b.y });
  }
  return flat.map((p, i) => `${i === 0 ? "M" : "L"} ${r2(p.x)} ${r2(p.y)}`).join(" ");
}

function arrowHead(pts: Array<{ x: number; y: number }>, cls: string): string {
  if (pts.length < 2) return "";
  const a = pts[pts.length - 2]!, b = pts[pts.length - 1]!;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const size = 8, wing = 0.42;
  const p2 = `${r2(b.x - size * Math.cos(ang - wing))},${r2(b.y - size * Math.sin(ang - wing))}`;
  const p3 = `${r2(b.x - size * Math.cos(ang + wing))},${r2(b.y - size * Math.sin(ang + wing))}`;
  return polygon({ class: cls, points: `${r2(b.x)},${r2(b.y)} ${p2} ${p3}` });
}

function teeBar(pts: Array<{ x: number; y: number }>, cls: string): string {
  if (pts.length < 2) return "";
  const a = pts[pts.length - 2]!, b = pts[pts.length - 1]!;
  const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
  const half = 7;
  return line({ class: cls, x1: r2(b.x - half * Math.cos(ang)), y1: r2(b.y - half * Math.sin(ang)), x2: r2(b.x + half * Math.cos(ang)), y2: r2(b.y + half * Math.sin(ang)) });
}

function renderMove(mv: MoveGeom, ctx: RenderCtx): string {
  const pts = mv.points.map((p) => ({ x: ctx.X(p.x), y: ctx.Y(p.y) }));
  const strokeCls = mv.kind === "motion" ? "sx-pb-motion" : mv.kind === "shot" ? "sx-pb-shot" : mv.style === "dashed" ? "sx-pb-move-dash" : "sx-pb-move";
  const headCls = mv.kind === "motion" ? "sx-pb-motion-fill" : mv.kind === "shot" ? "sx-pb-shot-fill" : "sx-pb-move-fill";
  const parts: string[] = [];
  if (mv.style === "wavy") {
    parts.push(path({ class: strokeCls, d: wavyPath(pts) }));
  } else {
    parts.push(path({ class: strokeCls, d: pts.map((p, i) => `${i === 0 ? "M" : "L"} ${r2(p.x)} ${r2(p.y)}`).join(" ") }));
  }
  if (mv.end === "arrow") parts.push(arrowHead(pts, headCls));
  else if (mv.end === "tee") parts.push(teeBar(pts, strokeCls));
  return group({ class: "sx-pb-move-g", "data-kind": mv.kind, "data-player": mv.player }, parts);
}

// ─── Players ─────────────────────────────────────────────────────

function playerSymbol(p: PlayerGeom, ctx: RenderCtx): string {
  const cx = ctx.X(p.x), cy = ctx.Y(p.y), r = 10;
  const parts: string[] = [];
  if (p.side === "defense" || p.pos === "x") {
    const k = r * 0.78;
    parts.push(line({ class: "sx-pb-x", x1: r2(cx - k), y1: r2(cy - k), x2: r2(cx + k), y2: r2(cy + k) }));
    parts.push(line({ class: "sx-pb-x", x1: r2(cx - k), y1: r2(cy + k), x2: r2(cx + k), y2: r2(cy - k) }));
    if (p.label) parts.push(textEl({ class: "sx-pb-x-text", x: r2(cx + k + 5), y: r2(cy - k + 2), "text-anchor": "middle" }, p.label));
  } else if (p.pos === "gk") {
    const h = r * 1.15;
    parts.push(polygon({ class: "sx-pb-gk", points: `${r2(cx)},${r2(cy - h)} ${r2(cx + h)},${r2(cy + h * 0.8)} ${r2(cx - h)},${r2(cy + h * 0.8)}` }));
    parts.push(textEl({ class: "sx-pb-o-text", x: r2(cx), y: r2(cy + 6), "text-anchor": "middle" }, p.label));
  } else if (p.pos === "c") {
    parts.push(rect({ class: "sx-pb-o", x: r2(cx - r * 0.82), y: r2(cy - r * 0.82), width: r2(r * 1.64), height: r2(r * 1.64) }));
    parts.push(textEl({ class: "sx-pb-o-text", x: r2(cx), y: r2(cy + 3.6), "text-anchor": "middle" }, p.label));
  } else {
    parts.push(circle({ class: "sx-pb-o", cx: r2(cx), cy: r2(cy), r }));
    parts.push(textEl({ class: "sx-pb-o-text", x: r2(cx), y: r2(cy + 3.6), "text-anchor": "middle" }, p.label));
  }
  return group({ class: "sx-pb-player", "data-side": p.side, "data-id": p.id }, parts);
}

// ─── Legend ──────────────────────────────────────────────────────

function legendSwatch(kind: LegendItem["kind"], sport: PlaybookLayoutResult["sport"]): string {
  // soccer inverts the pass/run convention (pass = solid, run = dashed); the
  // swatch must match what styleFor draws or the key misleads.
  const moveCls = (dashed: boolean): string => (dashed ? "sx-pb-move-dash" : "sx-pb-move");
  const arrow = polygon({ class: "sx-pb-move-fill", points: "20,0 13,-3.5 13,3.5" });
  switch (kind) {
    case "offense": return circle({ class: "sx-pb-o", cx: 8, cy: 0, r: 6 });
    case "gk": return polygon({ class: "sx-pb-gk", points: "8,-7 15,5 1,5" });
    case "defense": return `${line({ class: "sx-pb-x", x1: 3, y1: -5, x2: 13, y2: 5 })}${line({ class: "sx-pb-x", x1: 3, y1: 5, x2: 13, y2: -5 })}`;
    case "run": return `${line({ class: moveCls(sport === "soccer"), x1: 0, y1: 0, x2: 14, y2: 0 })}${arrow}`;
    case "pass": return `${line({ class: moveCls(sport !== "soccer"), x1: 0, y1: 0, x2: 14, y2: 0 })}${arrow}`;
    case "dribble": return `${path({ class: "sx-pb-move", d: "M0,0 Q3,-4 6,0 T12,0" })}${polygon({ class: "sx-pb-move-fill", points: "20,0 13,-3.5 13,3.5" })}`;
    case "screen": return `${line({ class: "sx-pb-move", x1: 0, y1: 0, x2: 16, y2: 0 })}${line({ class: "sx-pb-move", x1: 16, y1: -5, x2: 16, y2: 5 })}`;
    case "shot": return `${line({ class: "sx-pb-shot", x1: 0, y1: 0, x2: 14, y2: 0 })}${polygon({ class: "sx-pb-shot-fill", points: "20,0 13,-3.5 13,3.5" })}`;
    case "motion": return `${line({ class: "sx-pb-motion", x1: 0, y1: 0, x2: 14, y2: 0 })}${polygon({ class: "sx-pb-motion-fill", points: "20,0 13,-3.5 13,3.5" })}`;
    case "zone": return rect({ class: "sx-pb-zone", x: 0, y: -6, width: 18, height: 12, rx: 6 });
    default: return "";
  }
}

function renderLegend(items: LegendItem[], y: number, sport: PlaybookLayoutResult["sport"]): string {
  const parts: string[] = [];
  let cx = 12;
  for (const it of items) {
    parts.push(group({ transform: `translate(${r2(cx)},${r2(y)})` }, [legendSwatch(it.kind, sport)]));
    parts.push(textEl({ class: "sx-pb-legend", x: r2(cx + 26), y: r2(y + 4) }, it.label));
    cx += 26 + it.label.length * 6.5 + 20;
  }
  return group({ class: "sx-pb-legend-g" }, parts);
}

// ─── Main ────────────────────────────────────────────────────────

function ordinal(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : n === 4 ? "4th" : `${n}th`;
}

export function renderPlaybookLayout(lay: PlaybookLayoutResult, config?: RenderConfig): string {
  // soccer has no dark variant — fall back to default
  let themeName = config?.theme ?? "default";
  if (lay.sport === "soccer" && themeName === "dark") themeName = "default";
  const t = resolvePlaybookTheme(themeName);
  if (lay.errors.length > 0) return renderErrorPanel(lay, t);

  const mod = sportModule(lay.sport);
  const scale = mod.scale;
  const b = lay.bounds;
  const titleH = TITLE.bandH;
  const annoH = lay.sport === "football" && (lay.down || lay.distance || lay.losYard !== undefined) ? 20 : 0;
  const topH = titleH + annoH;
  const legendH = 30;
  const EDGE = 16; // out-of-bounds band framing the surface

  const fieldW = (b.maxX - b.minX) * scale;
  const fieldH = (b.maxY - b.minY) * scale;
  const W = r2(fieldW + EDGE * 2);
  const fieldTop = topH + EDGE;
  const H = r2(fieldH + topH + EDGE * 2 + legendH);
  const X = (u: number): number => r2((u - b.minX) * scale + EDGE);
  const Y = (v: number): number => r2(mod.yUp ? (b.maxY - v) * scale + fieldTop : (v - b.minY) * scale + fieldTop);
  const px = (u: number): number => r2(u * scale);
  const ctx: RenderCtx = { X, Y, px };

  const isCourt = lay.sport === "basketball";
  const surfaceCls = isCourt ? "sx-pb-court" : lay.sport === "soccer" ? "sx-pb-turf" : "sx-pb-field";
  const surroundCls = isCourt ? "sx-pb-surround-court" : "sx-pb-surround";
  const boundaryCls = isCourt ? "sx-pb-boundary-court" : "sx-pb-boundary";
  const fieldRx = 7;
  const surround = rect({ class: surroundCls, x: 2, y: r2(topH), width: r2(W - 4), height: r2(fieldH + EDGE * 2), rx: 12 });
  const surfaceBase = rect({ class: surfaceCls, x: EDGE, y: r2(fieldTop), width: r2(fieldW), height: r2(fieldH), rx: fieldRx });
  const boundary = rect({ class: boundaryCls, x: EDGE, y: r2(fieldTop), width: r2(fieldW), height: r2(fieldH), rx: fieldRx });
  const clipId = "sx-pb-clip";
  const clip = el("clipPath", { id: clipId }, [rect({ x: EDGE, y: r2(fieldTop), width: r2(fieldW), height: r2(fieldH), rx: fieldRx })]);

  const field = group({ "clip-path": `url(#${clipId})` }, [mod.drawField(lay, ctx, t)]);
  const zones: string[] = [];
  for (const z of lay.zones) {
    zones.push(el("ellipse", { class: "sx-pb-zone", cx: X(z.x), cy: Y(z.y), rx: px(z.rx), ry: px(z.ry) }));
    if (z.label) zones.push(textEl({ class: "sx-pb-zone-text", x: X(z.x), y: r2(Y(z.y) - px(z.ry) + (mod.yUp ? 11 : -4)), "text-anchor": "middle" }, z.label));
  }
  const moves = lay.moves.map((m) => renderMove(m, ctx));
  const players = lay.players.map((p) => playerSymbol(p, ctx));

  // football ball on the LOS
  const ball = lay.sport === "football" ? el("ellipse", { class: "sx-pb-ball", cx: X(0), cy: Y(0), rx: 4.5, ry: 2.7 }) : "";

  const annoParts: string[] = [];
  if (annoH) {
    const bits: string[] = [];
    if (lay.down) bits.push(ordinal(lay.down) + (lay.distance ? ` & ${lay.distance}` : ""));
    else if (lay.distance) bits.push(`${lay.distance} to go`);
    if (lay.losYard !== undefined) bits.push(`ball on ${lay.losYard}`);
    annoParts.push(textEl({ class: "sx-pb-anno", x: 8, y: titleH + 14 }, bits.join("   ·   ")));
  }

  const nOff = lay.players.filter((p) => p.side === "offense").length;
  const nDef = lay.players.filter((p) => p.side === "defense").length;
  const descText =
    `${lay.sport} play. ${nOff} ${lay.sport === "football" ? "offensive players" : "players"}, ${nDef} ${lay.sport === "football" ? "defenders" : "opponents"}, ` +
    `${lay.moves.length} assignment${lay.moves.length === 1 ? "" : "s"}.` +
    (lay.warnings.length ? ` Warnings: ${lay.warnings.join("; ")}.` : "");

  return svgRoot(
    { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "sx-pb", role: "img" },
    [
      titleEl(lay.title),
      descEl(descText),
      el("style", {}, buildCss(t)),
      rect({ fill: t.bg, x: 0, y: 0, width: W, height: H }),
      el("defs", {}, [clip]),
      textEl({ class: "sx-pb-title", x: r2(W / 2), y: TITLE.y, "text-anchor": "middle" }, lay.title),
      ...annoParts,
      surround,
      surfaceBase,
      field,
      group({ class: "sx-pb-zones", "clip-path": `url(#${clipId})` }, zones),
      group({ class: "sx-pb-moves" }, moves),
      boundary,
      group({ class: "sx-pb-players" }, players),
      ball,
      renderLegend(mod.legend(lay), fieldH + topH + EDGE * 2 + 18, lay.sport),
    ]
  );
}

export function renderPlaybook(text: string, config?: RenderConfig): string {
  return renderPlaybookLayout(layoutPlaybook(parsePlaybook(text)), config);
}
