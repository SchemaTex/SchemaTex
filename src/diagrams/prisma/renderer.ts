/**
 * PRISMA 2020 flow diagram renderer.
 *
 * Spec: docs/reference/28-PRISMA-STANDARD.md §9
 */

import type { RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  rect,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  defs,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { layoutPrisma, lineHeightForLine, PRISMA_CONST } from "./layout";
import type {
  PrismaAST,
  PrismaBox,
  PrismaColumnHeader,
  PrismaLayoutResult,
  PrismaStageBand,
} from "./types";
import { parsePrisma } from "./parser";

function buildCss(t: BaseTheme): string {
  // Stage palette (sampled from canonical PRISMA reference renderings):
  //   identification: blue family   — band #1565c0  / box fill #e3f2fd
  //   screening:      teal family   — band #00838f  / box fill #e0f7fa
  //   included:       green family  — band #2e7d32  / box fill #e8f5e9
  // Column headers use a warm orange (databases) and neutral slate (other),
  // matching the canonical Haddaway template.
  return `
.prisma { font-family: system-ui, -apple-system, sans-serif; }
.prisma-title { font: 700 16px sans-serif; fill: ${t.text}; }
.prisma-subtitle { font: 400 12px sans-serif; fill: ${t.textMuted}; }

.prisma-stage { stroke-width: 1.1; stroke: #90a4ae; }
.prisma-stage-identification { fill: #e8f1fb; }
.prisma-stage-screening { fill: #e3f5f7; }
.prisma-stage-included { fill: #e9f6ea; }
.prisma-exclusion { stroke-width: 1.1; stroke: #90a4ae; fill: #f4fafb; }
.prisma-stage-previous { stroke-width: 1.4; stroke-dasharray: 5 3; fill: #e8f1fb; stroke: #1976d2; }

.prisma-stage-label { font: 600 13px sans-serif; fill: ${t.text}; }
.prisma-stage-count { font: 700 13px sans-serif; fill: ${t.text}; }
.prisma-stage-source { font: 400 11.5px sans-serif; fill: ${t.textMuted}; }
.prisma-stage-subtitle { font: italic 500 11.5px sans-serif; fill: ${t.textMuted}; }
.prisma-exclusion-reason { font: 400 11.5px sans-serif; fill: ${t.textMuted}; }

.prisma-arrow-main { fill: none; stroke: #475569; stroke-width: 1.6; marker-end: url(#prisma-arrow); }
.prisma-arrow-exclusion { fill: none; stroke: #475569; stroke-width: 1.6; marker-end: url(#prisma-arrow); }
.prisma-arrow-merge-leg { fill: none; stroke: #475569; stroke-width: 1.6; }
.prisma-arrow-merge-trunk { fill: none; stroke: #475569; stroke-width: 1.6; marker-end: url(#prisma-arrow); }
.prisma-arrow-previous { fill: none; stroke: #1976d2; stroke-width: 1.5; stroke-dasharray: 5 3; marker-end: url(#prisma-arrow-accent); }
.prisma-warning { font: italic 400 11px sans-serif; fill: ${t.warn}; }

.prisma-band { stroke: none; }
.prisma-band-identification { fill: #1565c0; }
.prisma-band-screening { fill: #00838f; }
.prisma-band-included { fill: #2e7d32; }
.prisma-band-label { font: 700 12px sans-serif; fill: #ffffff; letter-spacing: 0.8px; text-transform: uppercase; }

.prisma-col-header { stroke: #90a4ae; stroke-width: 1.1; }
.prisma-col-header-databases { fill: #ef8a3c; }
.prisma-col-header-other { fill: #6b8694; }
.prisma-col-header-label { font: 600 12px sans-serif; fill: #ffffff; }
`.trim();
}

function arrowMarker(t: BaseTheme): string {
  return defs([
    el(
      "marker",
      {
        id: "prisma-arrow",
        viewBox: "0 0 10 10",
        refX: 9,
        refY: 5,
        markerWidth: 8,
        markerHeight: 8,
        orient: "auto-start-reverse",
      },
      [el("path", { d: "M0,0 L10,5 L0,10 z", fill: t.stroke })],
    ),
    el(
      "marker",
      {
        id: "prisma-arrow-accent",
        viewBox: "0 0 10 10",
        refX: 9,
        refY: 5,
        markerWidth: 8,
        markerHeight: 8,
        orient: "auto-start-reverse",
      },
      [el("path", { d: "M0,0 L10,5 L0,10 z", fill: t.accent })],
    ),
  ]);
}

function classForBox(box: PrismaBox): string {
  if (box.variant === "previous") return "prisma-stage-previous";
  const base = box.variant === "exclusion" ? "prisma-exclusion" : "prisma-stage";
  return `${base} prisma-stage-${box.stage}`;
}

function classForLine(style: string): string {
  switch (style) {
    case "label":
      return "prisma-stage-label";
    case "count":
      return "prisma-stage-count";
    case "subtitle":
      return "prisma-stage-subtitle";
    case "reason":
      return "prisma-exclusion-reason";
    default:
      return "prisma-stage-source";
  }
}

function classForEdge(kind: string): string {
  switch (kind) {
    case "exclusion":
      return "prisma-arrow-exclusion";
    case "merge-leg":
      return "prisma-arrow-merge-leg";
    case "merge-trunk":
      return "prisma-arrow-merge-trunk";
    case "previous":
      return "prisma-arrow-previous";
    default:
      return "prisma-arrow-main";
  }
}

function renderBand(band: PrismaStageBand): string {
  // Capsule shape: round ends with rx = width/2.
  const r = rect({
    x: band.x,
    y: band.y,
    width: band.width,
    height: band.height,
    rx: band.width / 2,
    ry: band.width / 2,
    class: `prisma-band prisma-band-${band.stage}`,
    "data-stage": band.stage,
  });
  // Vertical label: rotate -90deg about the band's center; reads bottom-to-top.
  const cx = band.x + band.width / 2;
  const cy = band.y + band.height / 2;
  const txt = textEl(
    {
      x: cx,
      y: cy,
      class: "prisma-band-label",
      "text-anchor": "middle",
      "dominant-baseline": "central",
      transform: `rotate(-90 ${cx} ${cy})`,
    },
    band.label,
  );
  return group({ "data-band": band.stage }, [r, txt]);
}

function renderHeader(h: PrismaColumnHeader): string {
  // Independent horizontal bar with capsule ends (mirrors the left stage bands).
  const r = rect({
    x: h.x,
    y: h.y,
    width: h.width,
    height: h.height,
    rx: h.height / 2,
    ry: h.height / 2,
    class: `prisma-col-header prisma-col-header-${h.column}`,
    "data-column": h.column,
  });
  const lineH = PRISMA_CONST.TOP_HEADER_LINE_HEIGHT;
  const total = h.labelLines.length * lineH;
  const startY = h.y + (h.height - total) / 2 + lineH * 0.75;
  const cx = h.x + h.width / 2;
  const lines = h.labelLines.map((ln, i) =>
    textEl(
      {
        x: cx,
        y: startY + i * lineH,
        class: "prisma-col-header-label",
        "text-anchor": "middle",
      },
      ln,
    ),
  );
  return group({ "data-header": h.column }, [r, ...lines]);
}

function renderBox(box: PrismaBox): string {
  const r = rect({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    rx: PRISMA_CONST.BOX_RADIUS,
    ry: PRISMA_CONST.BOX_RADIUS,
    class: classForBox(box),
    "data-role": box.role,
  });

  // Text layout: top-level lines (indent=0) are centered horizontally for the
  // canonical "headline" look. Indented breakdown lines (sources / reasons) are
  // grouped into a left-aligned block that, as a whole, is horizontally
  // centred within the box — this preserves a tidy list inside an otherwise
  // centered layout.
  const innerLeft = box.x + PRISMA_CONST.BOX_PAD_X;
  const innerRight = box.x + box.width - PRISMA_CONST.BOX_PAD_X;
  const centerX = box.x + box.width / 2;

  // Compute the widest indented line so we can left-align them as a block,
  // centred within the box.
  let widestIndented = 0;
  for (const line of box.lines) {
    if ((line.indent ?? 0) > 0) {
      const w = approxLineWidth(line);
      if (w > widestIndented) widestIndented = w;
    }
  }
  const indentedBlockLeft = Math.max(
    innerLeft,
    Math.min(centerX - widestIndented / 2, innerRight - widestIndented),
  );

  let textY = box.y + PRISMA_CONST.BOX_PAD_Y;
  const textEls: string[] = [];
  for (const line of box.lines) {
    const lh = lineHeightForLine(line.style);
    const baseline = textY + Math.round(lh * 0.75);
    const indented = (line.indent ?? 0) > 0;
    if (indented) {
      textEls.push(
        textEl(
          { x: indentedBlockLeft, y: baseline, class: classForLine(line.style) },
          line.text,
        ),
      );
    } else {
      textEls.push(
        textEl(
          {
            x: centerX,
            y: baseline,
            class: classForLine(line.style),
            "text-anchor": "middle",
          },
          line.text,
        ),
      );
    }
    textY += lh;
  }

  return group(
    {
      "data-prisma-role": box.role,
      "data-prisma-variant": box.variant,
      "data-prisma-stage": box.stage,
    },
    [r, ...textEls],
  );
}

/** Approximate the rendered width of a text line for centring decisions. */
function approxLineWidth(line: { text: string; style: string }): number {
  const charW =
    line.style === "label" || line.style === "count" ? 7.4 : 6.4;
  return line.text.length * charW;
}

export function renderPrismaLayout(layout: PrismaLayoutResult, config?: RenderConfig): string {
  const t = resolveBaseTheme(config?.theme ?? "default");

  const children: string[] = [];
  children.push(titleEl(layout.title ?? "PRISMA 2020 flow diagram"));
  children.push(
    desc(
      `PRISMA 2020 flow diagram (${layout.mode}, ${layout.kind}) — ${layout.boxes.length} boxes, ${layout.edges.length} arrows` +
        (layout.warnings.length > 0
          ? `. Warnings: ${layout.warnings.join("; ")}`
          : ""),
    ),
  );
  children.push(el("style", {}, buildCss(t)));
  children.push(arrowMarker(t));

  if (layout.title) {
    children.push(
      textEl(
        { x: layout.width / 2, y: PRISMA_CONST.OUTER_PAD_TOP + 20, class: "prisma-title", "text-anchor": "middle" },
        layout.title,
      ),
    );
  }

  // Stage bands (behind everything else).
  const bandEls: string[] = [];
  for (const b of layout.bands) bandEls.push(renderBand(b));
  children.push(group({ class: "prisma-bands" }, bandEls));

  // Top column headers (above identification row).
  const headerEls: string[] = [];
  for (const h of layout.headers) headerEls.push(renderHeader(h));
  children.push(group({ class: "prisma-col-headers" }, headerEls));

  // Edges (under boxes).
  const edgeEls: string[] = [];
  for (const e of layout.edges) {
    edgeEls.push(
      pathEl({
        d: e.d,
        class: classForEdge(e.kind),
        "data-edge": `${e.from}->${e.to}`,
      }),
    );
  }
  children.push(group({ class: "prisma-edges" }, edgeEls));

  // Boxes.
  const boxEls: string[] = [];
  for (const b of layout.boxes) boxEls.push(renderBox(b));
  children.push(group({ class: "prisma-boxes" }, boxEls));

  // Warnings (bottom of diagram, optional).
  if (layout.warnings.length > 0) {
    const startY = layout.height - layout.warnings.length * PRISMA_CONST.WARNING_LINE_HEIGHT - 4;
    const wEls: string[] = [];
    for (let i = 0; i < layout.warnings.length; i++) {
      wEls.push(
        textEl(
          {
            x: PRISMA_CONST.OUTER_PAD_X,
            y: startY + (i + 1) * PRISMA_CONST.WARNING_LINE_HEIGHT,
            class: "prisma-warning",
          },
          `⚠ ${layout.warnings[i]}`,
        ),
      );
    }
    children.push(group({ class: "prisma-warnings" }, wEls));
  }

  return svgRoot(
    {
      class: "prisma",
      role: "img",
      "aria-label": escapeXml(layout.title ?? "PRISMA 2020 flow diagram"),
      width: layout.width,
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
    },
    children,
  );
}

export function renderPrisma(textOrAst: string | PrismaAST, config?: RenderConfig): string {
  const ast = typeof textOrAst === "string" ? parsePrisma(textOrAst) : textOrAst;
  const layout = layoutPrisma(ast);
  return renderPrismaLayout(layout, config);
}
