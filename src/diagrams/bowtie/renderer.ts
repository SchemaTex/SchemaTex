/**
 * Bowtie renderer — LayoutResult → semantic SVG.
 * Per docs/reference/38-BOWTIE-STANDARD.md §3, §6, §8.
 *
 * Threat (orange, left) → preventative barriers (grey) → top-event knot
 * (green circle, centre) → mitigative barriers (grey) → consequence (red,
 * right); escalation factors (amber) drop below the barrier they degrade with
 * a muted "degrades" connector. The flow line carries a single filled
 * arrowhead at each knot boundary (flow runs left→right throughout).
 *
 * Hard rules: no inline styles (classes from tokens), <title>/<desc>, data-*.
 */

import type { RenderConfig } from "../../core/types";
import {
  circle,
  el,
  group,
  line as svgLine,
  multilineText,
  path as svgPath,
  rect,
  svgRoot,
  text as svgText,
  title as svgTitle,
  desc as svgDesc,
} from "../../core/svg";
import {
  DEFAULT_FONT_FAMILY,
  FONT_SIZE,
  STROKE_WIDTH,
  resolveBowtieTheme,
} from "../../core/theme";
import { parseBowtie } from "./parser";
import { layoutBowtie, BOWTIE_CONST as C } from "./layout";
import type { BowtieLayoutBox, BowtieLayoutResult } from "./types";

export function renderBowtie(text: string, config?: RenderConfig): string {
  const layout = layoutBowtie(parseBowtie(text));
  return renderBowtieLayout(layout, config);
}

export function renderBowtieLayout(layout: BowtieLayoutResult, config?: RenderConfig): string {
  const themeName = config?.theme ?? "default";
  const theme = resolveBowtieTheme(themeName);
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast, topEvent } = layout;
  const mono = themeName === "monochrome";

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? "Bowtie risk diagram";

  const styleBlock = el(
    "style",
    {},
    `
.sx-bowtie-bg { fill: ${theme.bg}; }
.sx-bowtie-line { fill: none; stroke: ${theme.lineStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-bowtie-arrow { fill: ${theme.lineStroke}; stroke: none; }
.sx-bowtie-escalation-line { fill: none; stroke: ${theme.escalationLineStroke}; stroke-width: ${STROKE_WIDTH.thin};${mono ? " stroke-dasharray: 4 3;" : ""} }
.sx-bowtie-hazard { fill: ${theme.hazardFill}; stroke: ${theme.hazardStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-bowtie-topevent { fill: ${theme.topEventFill}; stroke: ${theme.topEventStroke}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-bowtie-topevent-ring { fill: none; stroke: ${theme.topEventStroke}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-bowtie-threat { fill: ${theme.threatFill}; stroke: ${theme.threatStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-bowtie-barrier { fill: ${theme.barrierFill}; stroke: ${theme.barrierStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-bowtie-consequence { fill: ${theme.consequenceFill}; stroke: ${theme.consequenceStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-bowtie-escalation { fill: ${theme.escalationFill}; stroke: ${theme.escalationStroke}; stroke-width: ${STROKE_WIDTH.normal};${mono ? " stroke-dasharray: 5 3;" : ""} }
.sx-bowtie-ef-barrier { fill: ${theme.efBarrierFill}; stroke: ${theme.barrierStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-bowtie-label { fill: ${theme.labelText}; stroke: none; font-size: ${FONT_SIZE.label}px; }
.sx-bowtie-elabel { fill: ${theme.labelText}; stroke: none; font-size: ${FONT_SIZE.small}px; }
.sx-bowtie-topevent-label { fill: ${theme.labelText}; stroke: none; font-size: 11px; font-weight: 700; }
.sx-bowtie-title { fill: ${theme.labelText}; stroke: none; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
.sx-bowtie-legend-label { fill: ${theme.labelText}; stroke: none; font-size: ${FONT_SIZE.small}px; }
`.trim()
  );

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    rect({ x: 0, y: 0, width, height, class: "sx-bowtie-bg" }),
  ];

  const inner: string[] = [];

  if (ast.title) {
    inner.push(svgText({ x: width / 2, y: C.PAGE_PAD + 6, class: "sx-bowtie-title", "font-family": fontFamily, "text-anchor": "middle" }, ast.title));
  }

  // 1. Hazard tie-line (behind everything).
  if (layout.hazardTie) {
    inner.push(svgLine({ x1: layout.hazardTie.x, y1: layout.hazardTie.y1, x2: layout.hazardTie.x, y2: layout.hazardTie.y2, class: "sx-bowtie-line" }));
  }

  // 2. Flow lines + arrowheads.
  for (const ln of layout.lines) {
    inner.push(
      group({ class: "sx-bowtie-line-g", "data-line": ln.lineId, "data-side": ln.side }, [
        svgPath({ d: ln.path, class: "sx-bowtie-line" }),
        rightArrow(ln.arrow.x, ln.arrow.y),
      ])
    );
  }

  // 3. Escalation "degrades" connectors.
  for (const e of layout.escalationLines) {
    inner.push(svgLine({ x1: e.x, y1: e.y1, x2: e.x, y2: e.y2, class: "sx-bowtie-escalation-line" }));
  }

  // 4. The knot (top-event circle), with a doubled inner ring in monochrome.
  inner.push(
    group({ class: "sx-bowtie-topevent-g", "data-role": "topevent" }, [
      circle({ cx: topEvent.cx, cy: topEvent.cy, r: topEvent.r, class: "sx-bowtie-topevent" }),
      ...(mono ? [circle({ cx: topEvent.cx, cy: topEvent.cy, r: topEvent.r - 4, class: "sx-bowtie-topevent-ring" })] : []),
      multilineText(
        { x: topEvent.cx, y: topEvent.cy, class: "sx-bowtie-topevent-label", "text-anchor": "middle", "dominant-baseline": "middle" },
        wrap(topEvent.label, 11, 4).join("<br/>"),
        12
      ),
    ])
  );

  // 5. Boxes (hazard / threats / barriers / consequences / escalations).
  for (const b of layout.boxes) {
    inner.push(renderBox(b));
  }

  // 6. Legend (auto-derived; off only when explicitly disabled).
  if (ast.legend !== "off") {
    inner.push(renderLegend(layout, fontFamily));
  }

  children.push(group({ transform: pad ? `translate(${pad}, ${pad})` : undefined, "font-family": fontFamily }, inner));

  return svgRoot(
    { width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": a11y, "data-diagram-type": "bowtie" },
    children
  );
}

// ─── Boxes ────────────────────────────────────────────────────

function renderBox(b: BowtieLayoutBox): string {
  const cls =
    b.role === "hazard" ? "sx-bowtie-hazard"
    : b.role === "threat" ? "sx-bowtie-threat"
    : b.role === "consequence" ? "sx-bowtie-consequence"
    : b.role === "escalation" ? "sx-bowtie-escalation"
    : b.role === "ef-barrier" ? "sx-bowtie-ef-barrier"
    : "sx-bowtie-barrier";
  const labelCls = b.role === "escalation" || b.role === "ef-barrier" ? "sx-bowtie-elabel" : "sx-bowtie-label";
  const perLine = b.role === "escalation" ? 18 : b.role === "hazard" ? 30 : 17;
  const lh = b.role === "escalation" || b.role === "ef-barrier" ? 12 : 14;

  const attrs: Record<string, string> = { class: `${cls}-g`, "data-role": b.role, "data-id": b.id };
  if (b.side) attrs["data-side"] = b.side;
  if (b.lineId) attrs["data-line"] = b.lineId;
  if (b.order !== undefined) attrs["data-order"] = String(b.order);
  if (b.barrierId) attrs["data-barrier"] = b.barrierId;
  if (b.escalationId) attrs["data-escalation"] = b.escalationId;

  return group(attrs, [
    rect({ x: b.cx - b.width / 2, y: b.cy - b.height / 2, width: b.width, height: b.height, rx: 5, class: cls }),
    multilineText(
      { x: b.cx, y: b.cy, class: labelCls, "text-anchor": "middle", "dominant-baseline": "middle" },
      wrap(b.label, perLine, 3).join("<br/>"),
      lh
    ),
  ]);
}

// ─── Arrowhead ────────────────────────────────────────────────

/** A small filled triangle pointing +x, tip at (tx, ty). */
function rightArrow(tx: number, ty: number): string {
  const s = 9, h = 5;
  return svgPath({ d: `M ${r(tx)} ${r(ty)} L ${r(tx - s)} ${r(ty - h)} L ${r(tx - s)} ${r(ty + h)} Z`, class: "sx-bowtie-arrow" });
}

// ─── Legend ───────────────────────────────────────────────────

function renderLegend(layout: BowtieLayoutResult, fontFamily: string): string {
  const hasEscalation = layout.boxes.some((b) => b.role === "escalation");
  const entries: Array<{ cls: string; text: string }> = [
    { cls: "sx-bowtie-threat", text: "Threat" },
    { cls: "sx-bowtie-barrier", text: "Barrier (prevent / mitigate)" },
    { cls: "sx-bowtie-topevent", text: "Top event" },
    { cls: "sx-bowtie-consequence", text: "Consequence" },
  ];
  if (hasEscalation) entries.push({ cls: "sx-bowtie-escalation", text: "Escalation factor" });

  const sw = 14, gap = 6;
  let x = C.PAGE_PAD;
  const y = layout.height - 12; // inside the reserved legend band
  const parts: string[] = [];
  for (const e of entries) {
    parts.push(rect({ x, y: y - sw + 2, width: sw, height: sw, rx: 3, class: e.cls }));
    const tx = x + sw + gap;
    parts.push(svgText({ x: tx, y: y - 1, class: "sx-bowtie-legend-label", "font-family": fontFamily }, e.text));
    x = tx + e.text.length * 6.4 + 22;
  }
  return group({ class: "sx-bowtie-legend", "data-role": "legend" }, parts);
}

// ─── <desc> summary ───────────────────────────────────────────

function summarise(layout: BowtieLayoutResult): string {
  const { ast } = layout;
  const barrierCount = layout.boxes.filter((b) => b.role === "barrier").length;
  const escCount = layout.boxes.filter((b) => b.role === "escalation").length;
  const parts: string[] = [];
  parts.push(
    `Bowtie:${ast.hazard ? ` hazard "${ast.hazard}",` : ""} top event "${ast.topEvent}"; ` +
    `${ast.threats.length} threat${plural(ast.threats.length)}, ${ast.consequences.length} consequence${plural(ast.consequences.length)}, ` +
    `${barrierCount} barrier${plural(barrierCount)}${escCount ? `, ${escCount} escalation factor${plural(escCount)}` : ""}.`
  );
  for (const w of ast.warnings) parts.push(w);
  return parts.join(" ");
}

// ─── Helpers ──────────────────────────────────────────────────

function plural(n: number): string {
  return n === 1 ? "" : "s";
}

/** Greedy word-wrap into ≤ maxLines lines of ≈ perLine chars; clips the last. */
function wrap(s: string, perLine: number, maxLines: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > perLine) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  else if (cur && lines.length === maxLines) lines[maxLines - 1] = clip(`${lines[maxLines - 1]} ${cur}`, perLine);
  if (lines.length === 0) lines.push(s);
  return lines;
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function r(n: number): number {
  return Math.round(n * 10) / 10;
}
