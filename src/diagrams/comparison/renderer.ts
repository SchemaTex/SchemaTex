/**
 * Comparison renderer — scene → semantic SVG.
 * Per docs/reference/51-COMPARISON-STANDARD.md §7.
 *
 * One renderer for all five modes: it walks the generic cell/ellipse/connector
 * scene the layout produced. Hard rules: classes from tokens (no inline style),
 * <title>/<desc>, data-* hooks. The decision-matrix winner is the only element
 * that gets an emphasis border — it is the computed answer.
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
  TITLE,
  resolveComparisonTheme,
} from "../../core/theme";
import { parseComparison } from "./parser";
import { layoutComparison } from "./layout";
import type { ComparisonLayout, SceneCell } from "./types";

// The svg builder has no `ellipse` convenience wrapper — build it from `el`.
function ellipse(attrs: Record<string, string | number | undefined>): string {
  return el("ellipse", attrs);
}

export function renderComparison(text: string, config?: RenderConfig): string {
  return renderComparisonLayout(layoutComparison(parseComparison(text)), config);
}

export function renderComparisonLayout(layout: ComparisonLayout, config?: RenderConfig): string {
  const themeName = config?.theme ?? "default";
  const t = resolveComparisonTheme(themeName);
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast } = layout;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? `Comparison (${ast.mode})`;

  const style = el(
    "style",
    {},
    `
.sx-cmp-bg { fill: ${t.bg}; }
.sx-cmp-title { fill: ${t.text}; font-size: ${TITLE.size}px; font-weight: ${TITLE.weight}; }
.sx-cmp-caption { fill: ${t.captionText}; font-size: ${FONT_SIZE.label}px; font-style: italic; }
.sx-cmp-tag { fill: ${t.tagText}; font-size: ${FONT_SIZE.small}px; }
.sx-cmp-rect { stroke: ${t.gridStroke}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-cmp-txt { font-size: ${FONT_SIZE.label}px; }
.sx-cmp-rect-corner { fill: ${t.rowHeaderFill}; stroke: ${t.gridStroke}; }
.sx-cmp-rect-colHeader { fill: ${t.headerFill}; stroke: ${t.headerStroke}; }
.sx-cmp-txt-colHeader { fill: ${t.headerText}; font-size: ${FONT_SIZE.label}px; font-weight: 700; }
${t.columnColors.map((c, i) => `.sx-cmp-ch-${i} { fill: ${c}; stroke: none; }`).join("\n")}
.sx-cmp-cht { fill: ${t.columnText}; font-size: ${FONT_SIZE.label}px; font-weight: 700; }
.sx-cmp-nostroke { stroke: none; }
.sx-cmp-rect-baseline { fill: ${t.baselineFill}; stroke: ${t.gridStroke}; }
.sx-cmp-txt-baseline { fill: ${t.cellText}; font-weight: 700; }
.sx-cmp-rect-rowHeader { fill: ${t.rowHeaderFill}; stroke: ${t.gridStroke}; }
.sx-cmp-txt-rowHeader { fill: ${t.cellText}; font-weight: 600; }
.sx-cmp-rect-body { fill: ${t.cellFill}; stroke: ${t.gridStroke}; }
.sx-cmp-rect-body-z { fill: ${t.cellAltFill}; stroke: ${t.gridStroke}; }
.sx-cmp-txt-body { fill: ${t.cellText}; }
.sx-cmp-bullet { fill: ${t.headerFill}; }
.sx-cmp-rect-pos { fill: ${t.posFill}; stroke: ${t.gridStroke}; }
.sx-cmp-txt-pos { fill: ${t.posText}; font-weight: 600; }
.sx-cmp-rect-neg { fill: ${t.negFill}; stroke: ${t.gridStroke}; }
.sx-cmp-txt-neg { fill: ${t.negText}; font-weight: 600; }
.sx-cmp-rect-warn { fill: ${t.warnFill}; stroke: ${t.gridStroke}; }
.sx-cmp-txt-warn { fill: ${t.warnText}; font-weight: 600; }
.sx-cmp-txt-pro { fill: ${t.cellText}; }
.sx-cmp-txt-con { fill: ${t.cellText}; }
.sx-cmp-rect-pillPos { fill: ${t.pillPosFill}; stroke: none; }
.sx-cmp-rect-pillNeg { fill: ${t.pillNegFill}; stroke: none; }
.sx-cmp-txt-pillPos, .sx-cmp-txt-pillNeg { fill: ${t.pillText}; font-weight: 700; letter-spacing: 0.5px; }
.sx-cmp-badge-pos { fill: ${t.pillPosFill}; }
.sx-cmp-badge-neg { fill: ${t.pillNegFill}; }
.sx-cmp-badge-glyph { fill: ${t.badgeText}; font-size: 13px; font-weight: 700; }
.sx-cmp-rect-total { fill: ${t.totalFill}; stroke: ${t.gridStroke}; }
.sx-cmp-txt-total { fill: ${t.cellText}; font-weight: 700; }
.sx-cmp-rect-winner { fill: ${t.winnerFill}; stroke: ${t.winnerStroke}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-cmp-txt-winner { fill: ${t.winnerText}; font-weight: 700; }
.sx-cmp-glyph { font-size: 15px; font-weight: 700; }
.sx-cmp-card { fill: ${t.cardFill}; stroke: ${t.cardStroke}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-cmp-conn { fill: none; stroke: ${t.connectorStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-cmp-conn-light { fill: none; stroke: ${t.rowDivider}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-cmp-ell { stroke: ${t.dbStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-cmp-ell-center-left { fill: ${t.dbLeftCenterFill}; }
.sx-cmp-ell-center-right { fill: ${t.dbRightCenterFill}; }
.sx-cmp-ell-shared { fill: ${t.dbSharedFill}; }
.sx-cmp-ell-unique-left { fill: ${t.dbLeftFill}; }
.sx-cmp-ell-unique-right { fill: ${t.dbRightFill}; }
.sx-cmp-ltxt-center-left { fill: ${t.dbLeftCenterText}; font-size: ${FONT_SIZE.label}px; font-weight: 700; }
.sx-cmp-ltxt-center-right { fill: ${t.dbRightCenterText}; font-size: ${FONT_SIZE.label}px; font-weight: 700; }
.sx-cmp-ltxt-shared { fill: ${t.dbSharedText}; font-size: ${FONT_SIZE.label}px; font-weight: 600; }
.sx-cmp-ltxt-unique-left { fill: ${t.dbLeftText}; font-size: ${FONT_SIZE.small}px; }
.sx-cmp-ltxt-unique-right { fill: ${t.dbRightText}; font-size: ${FONT_SIZE.small}px; }
`.trim()
  );

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    style,
    rect({ x: 0, y: 0, width, height, class: "sx-cmp-bg" }),
  ];

  const inner: string[] = [];

  if (ast.title) {
    inner.push(
      svgText(
        { x: layout.width / 2, y: TITLE.y, class: "sx-cmp-title", "font-family": fontFamily, "text-anchor": "middle" },
        ast.title
      )
    );
  }

  // Column cards (T-chart) behind everything.
  for (const f of layout.frames ?? []) {
    inner.push(rect({ x: f.x, y: f.y, width: f.w, height: f.h, rx: f.rx, class: "sx-cmp-card" }));
  }

  // Connectors / dividers (behind bubbles and text).
  for (const c of layout.connectors) {
    inner.push(svgLine({ x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, class: c.light ? "sx-cmp-conn-light" : "sx-cmp-conn" }));
  }

  // Cells.
  const colN = t.columnColors.length;
  for (const cell of layout.cells) {
    inner.push(renderCell(cell, fontFamily, colN));
  }

  // Ellipses (double-bubble). Opaque fills drawn over the connectors give
  // clean radial spokes. Centres are side-coloured; uniques tie to their side.
  for (const e of layout.ellipses) {
    const key = e.variant === "center" || e.variant === "unique" ? `${e.variant}-${e.side ?? "left"}` : e.variant;
    const cls = `sx-cmp-ell sx-cmp-ell-${key}`;
    const txtCls = `sx-cmp-ltxt-${key}`;
    inner.push(
      group({ class: "sx-cmp-bubble", "data-role": e.variant, ...(e.side ? { "data-side": e.side } : {}) }, [
        ellipse({ cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry, class: cls }),
        multilineText(
          { x: e.cx, y: e.cy, class: txtCls, "font-family": fontFamily, "text-anchor": "middle", "dominant-baseline": "middle" },
          e.lines.join("<br/>"),
          C_LINE_H
        ),
      ])
    );
  }

  // Computed caption (decision mode).
  if (layout.caption) {
    inner.push(
      svgText(
        { x: layout.width / 2, y: layout.height - 12, class: "sx-cmp-caption", "font-family": fontFamily, "text-anchor": "middle" },
        layout.caption
      )
    );
  }

  children.push(
    group({ transform: pad ? `translate(${pad}, ${pad})` : undefined, "font-family": fontFamily }, inner)
  );

  return svgRoot(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": a11y,
      "data-diagram-type": "comparison",
      "data-mode": ast.mode,
    },
    children
  );
}

const C_LINE_H = 14;

// ─── Cell ─────────────────────────────────────────────────────

function renderCell(cell: SceneCell, fontFamily: string, colN: number): string {
  const parts: string[] = [];
  // T-chart headers cycle a distinct colour per column; everything else uses
  // its variant fill.
  const colHeaderClass =
    cell.variant === "colHeader" && cell.paletteIndex !== undefined
      ? `sx-cmp-ch-${cell.paletteIndex % Math.max(1, colN)}`
      : undefined;
  if (!cell.bare) {
    if (cell.roundedTop) {
      // T-chart card header band: top two corners rounded to match the card.
      parts.push(
        svgPath({
          d: roundedTopRectPath(cell.x, cell.y, cell.w, cell.h, cell.rx ?? 12),
          class: colHeaderClass ?? "sx-cmp-rect-colHeader",
        })
      );
    } else {
      const rectVariant = cell.zebra && cell.variant === "body" ? "body-z" : cell.variant;
      const rectClass = colHeaderClass
        ? `sx-cmp-rect ${colHeaderClass}`
        : `sx-cmp-rect sx-cmp-rect-${rectVariant}${cell.noStroke ? " sx-cmp-nostroke" : ""}`;
      parts.push(
        rect({ x: cell.x, y: cell.y, width: cell.w, height: cell.h, rx: cell.rx, class: rectClass })
      );
    }
  }

  const txtClass = colHeaderClass
    ? "sx-cmp-txt sx-cmp-cht"
    : `sx-cmp-txt sx-cmp-txt-${cell.variant}`;
  const cy = cell.y + cell.h / 2;
  const br = 11;

  const drawBadge = (bcx: number): void => {
    parts.push(circle({ cx: bcx, cy, r: br, class: `sx-cmp-badge-${cell.badge!.tone}` }));
    parts.push(
      svgText(
        { x: bcx, y: cy + 0.5, class: "sx-cmp-badge-glyph", "font-family": fontFamily, "text-anchor": "middle", "dominant-baseline": "middle" },
        cell.badge!.glyph === "yes" ? "✓" : "✗"
      )
    );
  };

  if (cell.align === "start") {
    let tx = cell.x + 12;
    if (cell.badge) {
      const bcx = cell.x + 12 + br;
      drawBadge(bcx);
      tx = bcx + br + 10;
    } else if (cell.tag === "•") {
      parts.push(circle({ cx: cell.x + 14, cy, r: 2.6, class: "sx-cmp-bullet" }));
      tx = cell.x + 24;
    }
    if (cell.lines.length) {
      parts.push(
        multilineText(
          { x: tx, y: cy, class: txtClass, "font-family": fontFamily, "dominant-baseline": "middle" },
          cell.lines.join("<br/>"),
          C_LINE_H
        )
      );
    }
  } else if (cell.badge) {
    // Pill: badge at the left, label centred in the remaining width.
    const bcx = cell.x + 18 + br;
    drawBadge(bcx);
    const labelCx = (bcx + br + 6 + (cell.x + cell.w - 12)) / 2;
    parts.push(
      multilineText(
        { x: labelCx, y: cy, class: txtClass, "font-family": fontFamily, "text-anchor": "middle", "dominant-baseline": "middle" },
        cell.lines.join("<br/>"),
        C_LINE_H
      )
    );
  } else if (cell.glyph && cell.lines.length === 0) {
    parts.push(
      svgText(
        { x: cell.x + cell.w / 2, y: cy, class: `sx-cmp-glyph ${glyphTextClass(cell.glyph)}`, "font-family": fontFamily, "text-anchor": "middle", "dominant-baseline": "middle" },
        glyphChar(cell.glyph)
      )
    );
  } else if (cell.lines.length) {
    parts.push(
      multilineText(
        { x: cell.x + cell.w / 2, y: cy, class: txtClass, "font-family": fontFamily, "text-anchor": "middle", "dominant-baseline": "middle" },
        cell.lines.join("<br/>"),
        C_LINE_H
      )
    );
  }

  // Small tag — weight ×5 / rank #1 sit top-right; the "datum" marker sits at
  // the bottom-centre of the baseline header so it never collides with the
  // centred column label.
  if (cell.tag && cell.tag !== "•") {
    if (cell.variant === "baseline") {
      parts.push(
        svgText(
          { x: cell.x + cell.w / 2, y: cell.y + cell.h - 5, class: "sx-cmp-tag", "font-family": fontFamily, "text-anchor": "middle" },
          cell.tag
        )
      );
    } else {
      parts.push(
        svgText(
          { x: cell.x + cell.w - 5, y: cell.y + 13, class: "sx-cmp-tag", "font-family": fontFamily, "text-anchor": "end" },
          cell.tag
        )
      );
    }
  }

  const attrs: Record<string, string> = { class: "sx-cmp-cell-g", "data-variant": cell.variant };
  if (cell.glyph) attrs["data-glyph"] = cell.glyph;
  return group(attrs, parts);
}

/** A rect path with only the top two corners rounded (radius r). */
function roundedTopRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M ${x} ${y + h} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h} Z`;
}

function glyphChar(g: SceneCell["glyph"]): string {
  return g === "yes" ? "✓" : g === "no" ? "✗" : g === "partial" ? "~" : "—";
}

function glyphTextClass(g: SceneCell["glyph"]): string {
  return g === "yes" ? "sx-cmp-txt-pos" : g === "no" ? "sx-cmp-txt-neg" : g === "partial" ? "sx-cmp-txt-warn" : "sx-cmp-txt-body";
}

// ─── <desc> summary ───────────────────────────────────────────

function summarise(layout: ComparisonLayout): string {
  const { ast } = layout;
  const parts: string[] = [];
  switch (ast.mode) {
    case "tchart":
      parts.push(`T-chart comparing ${ast.columns.length} column${plural(ast.columns.length)}: ${ast.columns.map((c) => `"${c.label}"`).join(", ")}.`);
      break;
    case "pros-cons":
      parts.push(`Pros/cons${ast.subject ? ` for "${ast.subject}"` : ""}: ${ast.pros.length} pro${plural(ast.pros.length)}, ${ast.cons.length} con${plural(ast.cons.length)}.`);
      break;
    case "matrix":
      parts.push(`Comparison matrix: ${ast.options.length} option${plural(ast.options.length)} × ${ast.criteria.length} criteria.`);
      break;
    case "decision":
      parts.push(`Decision matrix: ${ast.options.length} option${plural(ast.options.length)} × ${ast.criteria.length} weighted criteria.`);
      if (layout.caption) parts.push(layout.caption);
      break;
    case "double-bubble":
      parts.push(`Double-bubble comparing "${ast.bubble?.left}" and "${ast.bubble?.right}": ${ast.bubble?.shared.length ?? 0} shared, ${ast.bubble?.leftOnly.length ?? 0}/${ast.bubble?.rightOnly.length ?? 0} unique.`);
      break;
  }
  for (const w of ast.warnings) parts.push(w);
  return parts.join(" ");
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}
