/**
 * FMEA renderer — LayoutResult → semantic SVG worksheet.
 * Per docs/reference/40-FMEA-STANDARD.md §"Reference images / Visual conventions".
 *
 * Pure SVG `<rect>`/`<text>` table (no HTML <table>): header band, one row per
 * (item, mode, cause) triple, merged left cells, narrow centred S/O/D/RPN/AP
 * block, and — the differentiator from reference image #1 — the RPN/AP cell
 * itself COLOUR-FILLED by risk threshold (red high → green low), with the
 * threshold legend shown in the header.
 *
 * Hard rules honoured: no inline styles (all fills via CSS classes in a single
 * <style> block), <title>/<desc>, data-* attributes, svg.ts builder only.
 *
 * Risk-fill palette is folder-local (theme.ts is off-limits for this module);
 * it reuses the ReliabilityTokens red→neutral cluster convention.
 */

import type { RenderConfig } from "../../core/types";
import {
  el,
  group,
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
} from "../../core/theme";
import { parseFmea } from "./parser";
import { analyseFmea, apObligation } from "./analysis";
import { layoutFmea, FMEA_CONST as C } from "./layout";
import type { FmeaLayoutResult } from "./types";

// ─── Folder-local risk-band palette (red → amber → green) ──────
// Mirrors the ReliabilityTokens stance: red reserved for "this is the risk".
interface FmeaPalette {
  bg: string;
  grid: string;
  border: string;
  headerFill: string;
  headerText: string;
  bandFill: string;
  bandText: string;
  cellText: string;
  cellAltFill: string;
  metaText: string;
  rpnHigh: string; rpnMid: string; rpnLow: string;
  apHigh: string; apMid: string; apLow: string;
  riskText: string;
  flagStroke: string;
}

const PALETTE_DEFAULT: FmeaPalette = {
  bg: "#ffffff",
  grid: "#cbd5e1",
  border: "#334155",
  headerFill: "#1d4e89",
  headerText: "#ffffff",
  bandFill: "#e2e8f0",
  bandText: "#1e293b",
  cellText: "#0f172a",
  cellAltFill: "#f8fafc",
  metaText: "#334155",
  rpnHigh: "#dc2626", rpnMid: "#f59e0b", rpnLow: "#16a34a",
  apHigh: "#dc2626", apMid: "#f59e0b", apLow: "#16a34a",
  riskText: "#ffffff",
  flagStroke: "#b91c1c",
};

const PALETTE_MONO: FmeaPalette = {
  bg: "#ffffff",
  grid: "#000000",
  border: "#000000",
  headerFill: "#ffffff",
  headerText: "#000000",
  bandFill: "#ffffff",
  bandText: "#000000",
  cellText: "#000000",
  cellAltFill: "#ffffff",
  metaText: "#000000",
  // monochrome: risk by hatched border weight instead of colour (kept neutral).
  rpnHigh: "#000000", rpnMid: "#ffffff", rpnLow: "#ffffff",
  apHigh: "#000000", apMid: "#ffffff", apLow: "#ffffff",
  riskText: "#000000",
  flagStroke: "#000000",
};

const PALETTE_DARK: FmeaPalette = {
  bg: "#1e1e2e",
  grid: "#45475a",
  border: "#cdd6f4",
  headerFill: "#313244",
  headerText: "#cdd6f4",
  bandFill: "#313244",
  bandText: "#cdd6f4",
  cellText: "#cdd6f4",
  cellAltFill: "#26273a",
  metaText: "#bac2de",
  rpnHigh: "#f38ba8", rpnMid: "#f9e2af", rpnLow: "#a6e3a1",
  apHigh: "#f38ba8", apMid: "#f9e2af", apLow: "#a6e3a1",
  riskText: "#11111b",
  flagStroke: "#eba0ac",
};

function resolvePalette(theme: string): FmeaPalette {
  if (theme === "monochrome") return PALETTE_MONO;
  if (theme === "dark") return PALETTE_DARK;
  return PALETTE_DEFAULT;
}

export function renderFmea(text: string, config?: RenderConfig): string {
  const ast = parseFmea(text);
  const analysis = analyseFmea(ast);
  const layout = layoutFmea(ast, analysis);
  return renderFmeaLayout(layout, config);
}

export function renderFmeaLayout(layout: FmeaLayoutResult, config?: RenderConfig): string {
  const p = resolvePalette(config?.theme ?? "default");
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast, analysis } = layout;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? "FMEA worksheet";

  const style = el("style", {}, buildCss(p));

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    style,
    rect({ x: 0, y: 0, width, height, class: "sx-fmea-bg" }),
  ];

  const inner: string[] = [];

  // 1. Title + metadata + legend.
  inner.push(...renderHeaderBlock(layout));

  // 2. Spanning band headers ("BEFORE ACTION" / "AFTER ACTION").
  for (const band of layout.bands) {
    inner.push(
      rect({ x: band.x, y: band.y, width: band.width, height: band.height, class: "sx-fmea-band" }),
    );
    inner.push(
      svgText(
        { x: band.x + band.width / 2, y: band.y + band.height / 2 + 4, class: "sx-fmea-band-text", "text-anchor": "middle" },
        band.label,
      ),
    );
  }

  // 3. Column header row.
  for (const col of layout.columns) {
    inner.push(
      rect({ x: col.x, y: layout.headerY, width: col.width, height: layout.headerH, class: "sx-fmea-headcell" }),
    );
    const lines = col.label.split(" / ");
    const lh = 13;
    const startY = layout.headerY + layout.headerH / 2 - ((lines.length - 1) * lh) / 2 + 4;
    lines.forEach((ln, k) => {
      inner.push(
        svgText(
          { x: col.x + col.width / 2, y: startY + k * lh, class: "sx-fmea-headtext", "text-anchor": "middle" },
          ln,
        ),
      );
    });
  }

  // 4. Body cells. Draw single (1-row) cells first, then spanning cells on top
  //    so a merged cell's fill covers the internal row grid-lines beneath it.
  const ordered = [...layout.cells].sort((a, b) => a.rowSpan - b.rowSpan);
  const isMono = p === PALETTE_MONO;
  for (const cell of ordered) {
    const altFill = cell.rowIndex % 2 === 1;
    const cellClass = ["sx-fmea-cell"];
    if (altFill && !cell.riskClass) cellClass.push("sx-fmea-cell-alt");
    if (cell.riskClass) cellClass.push(`sx-fmea-${cell.riskClass}`);

    const cellAttrs: Record<string, string | number> = {
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
      class: cellClass.join(" "),
      "data-col": cell.colKey,
      "data-row": String(cell.rowIndex + 1),
    };
    if (cell.riskClass) cellAttrs["data-risk"] = cell.riskClass;
    inner.push(rect(cellAttrs));

    // text
    const isRisk = cell.riskClass !== undefined && !isMono;
    const textClass = isRisk ? "sx-fmea-risk-text" : "sx-fmea-text";
    const tx = cell.align === "middle" ? cell.x + cell.width / 2 : cell.x + C.CELL_PAD_X;
    const anchor = cell.align === "middle" ? "middle" : "start";
    const lh = C.LINE_H;
    // Merged left cells (item/mode spanning >1 row) top-align so long names read
    // as a tree label; everything else centres vertically in its cell.
    const merged = cell.rowSpan > 1;
    const startY = merged
      ? cell.y + C.CELL_PAD_Y + lh - 2
      : cell.y + cell.height / 2 - ((cell.lines.length - 1) * lh) / 2 + 4;
    cell.lines.forEach((ln, k) => {
      if (ln === "") return;
      inner.push(
        svgText(
          { x: tx, y: startY + k * lh, class: textClass, "text-anchor": anchor },
          ln,
        ),
      );
    });
  }

  // 5. Flag outline around flagged rows (the red accent on the whole row edge).
  analysis.rows.forEach((row, ri) => {
    if (!row.flagged) return;
    const y = layout.rowY[ri]!;
    const h = layout.rowHeights[ri]!;
    const first = layout.columns[0]!;
    const last = layout.columns[layout.columns.length - 1]!;
    const x = first.x;
    const w = last.x + last.width - x;
    inner.push(
      rect({
        x, y, width: w, height: h,
        class: "sx-fmea-flag",
        "data-flagged": "true",
        "data-rpn": String(row.rpn),
        "data-ap": row.ap,
      }),
    );
  });

  // 6. Outer table border.
  const first = layout.columns[0]!;
  const last = layout.columns[layout.columns.length - 1]!;
  const tableX = first.x;
  const tableW = last.x + last.width - tableX;
  const tableTop = layout.bands.length ? layout.bands[0]!.y : layout.headerY;
  const tableBottom = layout.rowY.length
    ? layout.rowY[layout.rowY.length - 1]! + layout.rowHeights[layout.rowHeights.length - 1]!
    : layout.bodyY;
  inner.push(
    rect({ x: tableX, y: tableTop, width: tableW, height: tableBottom - tableTop, class: "sx-fmea-border" }),
  );

  children.push(
    group({ transform: pad ? `translate(${pad}, ${pad})` : undefined, "font-family": fontFamily }, inner),
  );

  return svgRoot(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": a11y,
      "data-diagram-type": "fmea",
      "data-rank": ast.rank,
      "data-rows": String(analysis.rows.length),
      "data-flagged": String(analysis.flaggedCount),
    },
    children,
  );
}

// ─── Header / metadata / legend ───────────────────────────────

function renderHeaderBlock(layout: FmeaLayoutResult): string[] {
  const { ast } = layout;
  const out: string[] = [];
  const x0 = C.CANVAS_PAD;
  let y = C.CANVAS_PAD + 14;

  if (ast.title) {
    out.push(svgText({ x: x0, y, class: "sx-fmea-title" }, ast.title));
    y += C.TITLE_H - 8;
  }

  // metadata two-up
  const metaEntries = Object.entries(ast.metadata);
  const colW = layout.width / 2;
  metaEntries.forEach(([k, v], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    out.push(
      svgText(
        { x: x0 + col * colW, y: y + row * C.META_LINE_H, class: "sx-fmea-meta" },
        `${capitalise(k)}: ${v}`,
      ),
    );
  });
  const metaRows = Math.ceil(metaEntries.length / 2);
  y += metaRows * C.META_LINE_H;

  // threshold legend
  const legend: string[] = [];
  if (ast.target !== undefined) legend.push(`Target ≤ ${ast.target}`);
  if (ast.acceptable !== undefined) legend.push(`Acceptable < ${ast.acceptable}`);
  if (ast.flag) legend.push(`Flag: ${ast.flag.text}`);
  legend.push(`Rank: ${ast.rank.toUpperCase()}`);
  if (legend.length) {
    out.push(svgText({ x: x0, y: y + 4, class: "sx-fmea-legend" }, legend.join("    ·    ")));
  }

  return out;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Summary <desc> ───────────────────────────────────────────

function summarise(layout: FmeaLayoutResult): string {
  const { ast, analysis } = layout;
  const top = analysis.rows[0];
  const parts = [
    `FMEA worksheet (${ast.fmeaType})`,
    `${analysis.rows.length} failure-mode row(s)`,
    `ranked by ${ast.rank.toUpperCase()}`,
  ];
  if (top) {
    parts.push(
      `highest risk: "${top.mode}" S${top.sev}·O${top.occ}·D${top.det} → RPN ${top.rpn}, AP ${top.ap} (${apObligation(top.ap)})`,
    );
  }
  parts.push(`${analysis.flaggedCount} flagged`);
  return parts.join("; ") + ".";
}

// ─── CSS (single style block — no inline style) ───────────────

function buildCss(p: FmeaPalette): string {
  const isMono = p === PALETTE_MONO;
  return `
.sx-fmea-bg { fill: ${p.bg}; }
.sx-fmea-border { fill: none; stroke: ${p.border}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-fmea-cell { fill: ${p.bg}; stroke: ${p.grid}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-fmea-cell-alt { fill: ${p.cellAltFill}; }
.sx-fmea-headcell { fill: ${p.headerFill}; stroke: ${p.grid}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-fmea-band { fill: ${p.bandFill}; stroke: ${p.grid}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-fmea-band-text { fill: ${p.bandText}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 700; letter-spacing: 0.06em; }
.sx-fmea-headtext { fill: ${p.headerText}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 700; }
.sx-fmea-text { fill: ${p.cellText}; font-size: ${FONT_SIZE.small + 1}px; }
.sx-fmea-risk-text { fill: ${p.riskText}; font-size: ${FONT_SIZE.label}px; font-weight: 700; }
.sx-fmea-title { fill: ${p.cellText}; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
.sx-fmea-meta { fill: ${p.metaText}; font-size: ${FONT_SIZE.small + 1}px; }
.sx-fmea-legend { fill: ${p.metaText}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 600; }
.sx-fmea-rpn-high { fill: ${p.rpnHigh}; stroke: ${p.grid}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-fmea-rpn-mid { fill: ${p.rpnMid}; stroke: ${p.grid}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-fmea-rpn-low { fill: ${p.rpnLow}; stroke: ${p.grid}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-fmea-ap-high { fill: ${p.apHigh}; stroke: ${p.grid}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-fmea-ap-mid { fill: ${p.apMid}; stroke: ${p.grid}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-fmea-ap-low { fill: ${p.apLow}; stroke: ${p.grid}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-fmea-flag { fill: none; stroke: ${p.flagStroke}; stroke-width: ${STROKE_WIDTH.thick}; ${isMono ? "stroke-dasharray: 4 2;" : ""} }
`.trim();
}
