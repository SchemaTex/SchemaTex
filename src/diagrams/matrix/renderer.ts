import type { MatrixAST, MatrixPoint, QfdData, QfdCorrelation, PunnettGene } from "./types";
import { computeQfdImportance, computePunnett, punnettFooter } from "./types";
import { parseMatrix } from "./parser";
import {
  layoutMatrix,
  layoutSipoc,
  layoutQfd,
  layoutPunnett,
  type MatrixLayoutResult,
  type PointLayout,
} from "./layout";
import {
  svgRoot,
  group,
  rect,
  circle,
  line as lineEl,
  text as textEl,
  title as titleEl,
  desc as descEl,
  polygon,
  defs,
  el,
  escapeXml,
} from "../../core/svg";
import type { RenderConfig } from "../../core/types";
import { resolveMatrixTheme, type MatrixTokens, type ResolvedTheme } from "../../core/theme";

type MatrixTheme = ResolvedTheme<MatrixTokens>;

// Category palette (colorblind-friendly set)
const CATEGORY_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#9333ea",
  "#ea580c", "#0891b2", "#ca8a04", "#db2777",
];

const QUADRANT_TINTS: [string, string, string, string] = [
  // Q1 TR, Q2 TL, Q3 BL, Q4 BR
  "#dbeafe", "#dcfce7", "#f3f4f6", "#fed7aa",
];

const HEAT_RAMP = [
  "#f0fdf4", "#bbf7d0", "#fde68a", "#fdba74", "#f87171", "#ef4444", "#b91c1c",
];

function buildMatrixCss(t: MatrixTheme): string {
  return `
.sx-matrix { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-matrix-title { font: 700 16px sans-serif; fill: ${t.inkStrong}; }
.sx-matrix-grid { stroke: ${t.gridFaint}; stroke-width: 1; fill: none; }
.sx-matrix-mid { stroke: ${t.gridStrong}; stroke-width: 1.2; stroke-dasharray: 4 3; fill: none; }
.sx-matrix-plot-border { stroke: ${t.inkMuted}; stroke-width: 1.2; fill: none; }
.sx-matrix-axis-label { font: 500 12px sans-serif; fill: ${t.inkMuted}; }
.sx-matrix-axis-end { font: 500 11px sans-serif; fill: ${t.inkFaint}; }
.sx-matrix-quad-annot { font: 600 13px sans-serif; fill: ${t.inkMuted}; opacity: 0.75; }
.sx-matrix-quad-desc { font: 400 10.5px sans-serif; fill: ${t.inkFaint}; opacity: 0.85; }
.sx-matrix-corr-header { font: 600 11.5px sans-serif; fill: ${t.ink}; text-anchor: middle; }
.sx-matrix-corr-rowlabel { font: 500 11.5px sans-serif; fill: ${t.ink}; text-anchor: end; dominant-baseline: central; }
.sx-matrix-corr-margin { font: 500 11px sans-serif; fill: ${t.inkMuted}; text-anchor: middle; dominant-baseline: central; }
.sx-matrix-corr-margin-best { font: 700 11.5px sans-serif; fill: ${t.inkStrong}; text-anchor: middle; dominant-baseline: central; }
.sx-matrix-corr-grid { stroke: ${t.grid}; stroke-width: 0.8; fill: none; }
.sx-matrix-corr-rowbg-a { fill: ${t.surfaceTint}; }
.sx-matrix-corr-rowbg-b { fill: ${t.surface}; }
.sx-matrix-cell-label { font: 500 12px sans-serif; fill: ${t.ink}; text-anchor: middle; }
.sx-matrix-cell-title { font: 600 13px sans-serif; fill: ${t.inkStrong}; }
.sx-matrix-cell-subtitle { font: 400 11px sans-serif; fill: ${t.inkFaint}; }
.sx-matrix-cell-item { font: 500 12px sans-serif; fill: ${t.ink}; }
.sx-matrix-cell-value { font: 600 18px sans-serif; fill: ${t.inkStrong}; text-anchor: middle; }
.sx-matrix-bubble { stroke-width: 1.5; }
.sx-matrix-label { font: 500 11px sans-serif; fill: ${t.inkStrong}; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
.sx-matrix-leader { stroke: ${t.gridStrong}; stroke-width: 0.6; opacity: 0.7; fill: none; }
.sx-matrix-legend-text { font: 500 11px sans-serif; fill: ${t.inkMuted}; }
.sx-matrix-offchart { fill: ${t.warnDeep}; }
.sx-sipoc-header { font: 700 13px sans-serif; fill: ${t.onHeader}; text-anchor: middle; dominant-baseline: central; }
.sx-sipoc-headbox { stroke: ${t.surface}; stroke-width: 1; }
.sx-sipoc-cell { fill: ${t.surface}; stroke: ${t.gridMid}; stroke-width: 1; }
.sx-sipoc-cell-alt { fill: ${t.surfaceAlt}; stroke: ${t.gridMid}; stroke-width: 1; }
.sx-sipoc-process { fill: ${t.accentTint}; stroke: ${t.gridMid}; stroke-width: 1; }
.sx-sipoc-item { font: 500 12px sans-serif; fill: ${t.ink}; text-anchor: middle; dominant-baseline: central; }
.sx-sipoc-step { font: 600 12px sans-serif; fill: ${t.accentDeep}; text-anchor: middle; dominant-baseline: central; }
.sx-qfd-grid { stroke: ${t.gridMid}; stroke-width: 1; fill: none; }
.sx-qfd-cellbg { fill: ${t.surface}; }
.sx-qfd-cellbg-alt { fill: ${t.surfaceAlt}; }
.sx-qfd-what { font: 500 12px sans-serif; fill: ${t.ink}; text-anchor: end; dominant-baseline: central; }
.sx-qfd-how { font: 500 11.5px sans-serif; fill: ${t.ink}; }
.sx-qfd-weight { font: 600 12px sans-serif; fill: ${t.inkStrong}; text-anchor: middle; dominant-baseline: central; }
.sx-qfd-weight-head { font: 600 10px sans-serif; fill: ${t.inkMuted}; text-anchor: middle; dominant-baseline: central; }
.sx-qfd-rel-strong { fill: ${t.accent}; }
.sx-qfd-rel-medium { fill: ${t.accentSoft}; stroke: ${t.accent}; stroke-width: 1.4; }
.sx-qfd-rel-weak { fill: none; stroke: ${t.accent}; stroke-width: 1.4; }
.sx-qfd-roof-cell { fill: ${t.surfaceAlt}; stroke: ${t.gridStrong}; stroke-width: 0.8; }
.sx-qfd-roof-cell-filled { fill: ${t.roofFilled}; stroke: ${t.inkFaint}; stroke-width: 0.9; }
.sx-qfd-corr { font: 700 13px sans-serif; text-anchor: middle; dominant-baseline: central; }
.sx-qfd-corr-strong-pos { fill: ${t.positiveDeep}; }
.sx-qfd-corr-pos { fill: ${t.positive}; }
.sx-qfd-corr-neg { fill: ${t.negative}; }
.sx-qfd-corr-strong-neg { fill: ${t.negativeDeep}; }
.sx-qfd-imp-band { fill: ${t.accentTint}; stroke: ${t.gridMid}; stroke-width: 1; }
.sx-qfd-imp-head { font: 600 11px sans-serif; fill: ${t.accentDeep}; text-anchor: end; dominant-baseline: central; }
.sx-qfd-imp-value { font: 700 13px sans-serif; fill: ${t.accentDeep}; text-anchor: middle; dominant-baseline: central; }
.sx-qfd-imp-value-top { font: 800 14px sans-serif; fill: ${t.negative}; text-anchor: middle; dominant-baseline: central; }
.sx-qfd-dir { font: 700 13px sans-serif; fill: ${t.inkMuted}; text-anchor: middle; dominant-baseline: central; }
.sx-punnett-corner { fill: ${t.cornerFill}; stroke: ${t.gridStrong}; stroke-width: 1; }
.sx-punnett-cornerline { stroke: ${t.gridMid}; stroke-width: 1; }
.sx-punnett-corner-p1 { font: 600 11px sans-serif; fill: ${t.accentDeep}; dominant-baseline: hanging; }
.sx-punnett-corner-p2 { font: 600 11px sans-serif; fill: ${t.accentDeep}; }
.sx-punnett-header { fill: ${t.headerFill}; stroke: ${t.gridStrong}; stroke-width: 1; }
.sx-punnett-gamete { font: 700 14px ui-monospace, "SF Mono", Menlo, monospace; fill: ${t.inkStrong}; text-anchor: middle; dominant-baseline: central; }
.sx-punnett-cell { stroke: ${t.gridStrong}; stroke-width: 1; }
.sx-punnett-genotype { font: 700 15px ui-monospace, "SF Mono", Menlo, monospace; fill: ${t.inkStrong}; text-anchor: middle; dominant-baseline: central; }
.sx-punnett-footer-head { font: 700 13px sans-serif; fill: ${t.inkStrong}; }
.sx-punnett-legend { font: 500 12.5px sans-serif; fill: ${t.ink}; dominant-baseline: central; }
.sx-punnett-geno-ratio { font: 500 12px sans-serif; fill: ${t.inkMuted}; }
.sx-punnett-hint { font: 500 13px sans-serif; fill: ${t.inkFaint}; text-anchor: middle; }
`.trim();
}

function axisArrow(t: MatrixTheme): string {
  return el(
    "marker",
    {
      id: "sx-matrix-arrow",
      viewBox: "0 0 10 10",
      refX: 8,
      refY: 5,
      markerWidth: 8,
      markerHeight: 8,
      orient: "auto-start-reverse",
    },
    [el("path", { d: "M0,0 L10,5 L0,10 z", fill: t.border })]
  );
}

function bubbleFill(p: MatrixPoint, categories: string[]): string {
  if (p.color) return p.color;
  if (p.category) {
    const idx = categories.indexOf(p.category);
    if (idx >= 0) return CATEGORY_COLORS[idx % CATEGORY_COLORS.length]!;
  }
  return "#2563eb";
}

function renderQuadrantBackground(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (!ast.config.quadrantBg) return "";
  const { plot } = lay;

  if (ast.grid === "2x2") {
    const halfW = plot.w / 2;
    const halfH = plot.h / 2;
    // Q1 TR, Q2 TL, Q3 BL, Q4 BR
    const rects = [
      { x: plot.x0 + halfW, y: plot.y0, w: halfW, h: halfH, fill: QUADRANT_TINTS[0] },
      { x: plot.x0, y: plot.y0, w: halfW, h: halfH, fill: QUADRANT_TINTS[1] },
      { x: plot.x0, y: plot.y0 + halfH, w: halfW, h: halfH, fill: QUADRANT_TINTS[2] },
      { x: plot.x0 + halfW, y: plot.y0 + halfH, w: halfW, h: halfH, fill: QUADRANT_TINTS[3] },
    ];
    return group(
      { id: "sx-matrix-quad-bg" },
      rects.map((r) =>
        rect({ x: r.x, y: r.y, width: r.w, height: r.h, fill: r.fill, "fill-opacity": 0.55 })
      )
    );
  }

  // 3×3 table mode: subtle diagonal heatmap (top-right green, mid yellow, bottom-left red).
  // Convention used in GE/McKinsey 9-box: anti-diagonal severity from "stars" → "PIP".
  if (ast.grid === "3x3" && ast.style === "table") {
    const cellW = plot.w / 3;
    const cellH = plot.h / 3;
    // score = col + row (0..4). 4 = top-right (best), 0 = bottom-left (worst).
    const TINT_3x3 = [
      "#fee2e2", // 0: red-100
      "#fef3c7", // 1: amber-100
      "#fef3c7", // 2: amber-100
      "#dcfce7", // 3: green-100
      "#dcfce7", // 4: green-100
    ];
    const cells: string[] = [];
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        const score = col + row;
        const fill = TINT_3x3[score]!;
        const x = plot.x0 + col * cellW;
        const y = plot.y0 + (2 - row) * cellH;
        cells.push(
          rect({ x, y, width: cellW, height: cellH, fill, "fill-opacity": 0.6 })
        );
      }
    }
    return group({ id: "sx-matrix-quad-bg" }, cells);
  }

  return "";
}

function renderTableChrome(ast: MatrixAST, lay: MatrixLayoutResult): string {
  // Always draw grid lines + outer border in table mode (overrides gridLines:false
  // that style:table sets). Without this, cells are invisible — text floats.
  if (ast.style !== "table") return "";
  if (ast.mode !== "quadrant") return "";
  const { plot } = lay;
  const lines: string[] = [];
  for (let i = 1; i < ast.cols; i++) {
    const x = plot.x0 + (plot.w * i) / ast.cols;
    lines.push(lineEl({ x1: x, y1: plot.y0, x2: x, y2: plot.y0 + plot.h, class: "sx-matrix-grid" }));
  }
  for (let j = 1; j < ast.rows; j++) {
    const y = plot.y0 + (plot.h * j) / ast.rows;
    lines.push(lineEl({ x1: plot.x0, y1: y, x2: plot.x0 + plot.w, y2: y, class: "sx-matrix-grid" }));
  }
  lines.push(
    rect({
      x: plot.x0,
      y: plot.y0,
      width: plot.w,
      height: plot.h,
      class: "sx-matrix-plot-border",
      fill: "none",
    })
  );
  return group({ id: "sx-matrix-table-chrome" }, lines);
}

function renderGrid(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (!ast.config.gridLines) return "";
  if (ast.mode === "correlation") return ""; // correlation draws its own grid
  const { plot } = lay;
  const lines: string[] = [];
  const cols = ast.cols;
  const rows = ast.rows;
  for (let i = 1; i < cols; i++) {
    const x = plot.x0 + (plot.w * i) / cols;
    const cls = cols === 2 && i === 1 ? "sx-matrix-mid" : "sx-matrix-grid";
    lines.push(lineEl({ x1: x, y1: plot.y0, x2: x, y2: plot.y0 + plot.h, class: cls }));
  }
  for (let j = 1; j < rows; j++) {
    const y = plot.y0 + (plot.h * j) / rows;
    const cls = rows === 2 && j === 1 ? "sx-matrix-mid" : "sx-matrix-grid";
    lines.push(lineEl({ x1: plot.x0, y1: y, x2: plot.x0 + plot.w, y2: y, class: cls }));
  }
  // plot border
  lines.push(
    rect({
      x: plot.x0,
      y: plot.y0,
      width: plot.w,
      height: plot.h,
      class: "sx-matrix-plot-border",
      fill: "none",
    })
  );
  return group({ id: "sx-matrix-grid" }, lines);
}

function shouldShowAxis(ast: MatrixAST): boolean {
  if (ast.config.showAxis === "on") return true;
  if (ast.config.showAxis === "off") return false;
  return ast.mode === "quadrant";
}

function renderAxes(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (!shouldShowAxis(ast)) return "";
  const { plot } = lay;
  const els: string[] = [];
  const marker = ast.config.axisArrows ? { "marker-end": "url(#sx-matrix-arrow)" } : {};

  // x-axis line at bottom of plot
  const xy = plot.y0 + plot.h + 14;
  const yx = plot.x0 - 14;
  els.push(
    lineEl({
      x1: plot.x0,
      y1: xy,
      x2: plot.x0 + plot.w,
      y2: xy,
      stroke: "#374151",
      "stroke-width": 1.2,
      ...marker,
    })
  );
  els.push(
    lineEl({
      x1: yx,
      y1: plot.y0 + plot.h,
      x2: yx,
      y2: plot.y0,
      stroke: "#374151",
      "stroke-width": 1.2,
      ...marker,
    })
  );

  // x-axis end labels
  if (ast.xAxis.low) {
    els.push(
      textEl(
        { x: plot.x0, y: xy + 20, class: "sx-matrix-axis-end", "text-anchor": "start" },
        ast.xAxis.low
      )
    );
  }
  if (ast.xAxis.high) {
    els.push(
      textEl(
        { x: plot.x0 + plot.w, y: xy + 20, class: "sx-matrix-axis-end", "text-anchor": "end" },
        ast.xAxis.high
      )
    );
  }
  // y-axis end labels (rotated)
  if (ast.yAxis.low) {
    els.push(
      textEl(
        {
          x: yx - 24,
          y: plot.y0 + plot.h,
          class: "sx-matrix-axis-end",
          "text-anchor": "end",
          transform: `rotate(-90 ${yx - 24} ${plot.y0 + plot.h})`,
        },
        ast.yAxis.low
      )
    );
  }
  if (ast.yAxis.high) {
    els.push(
      textEl(
        {
          x: yx - 24,
          y: plot.y0,
          class: "sx-matrix-axis-end",
          "text-anchor": "start",
          transform: `rotate(-90 ${yx - 24} ${plot.y0})`,
        },
        ast.yAxis.high
      )
    );
  }
  return group({ id: "sx-matrix-axes" }, els);
}

function renderQuadAnnotations(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (!ast.config.quadrantAnnotations || ast.grid !== "2x2" || ast.annotations.length === 0) return "";
  // table style renders annotations as cell-titles inside renderCellTable
  if (ast.style === "table") return "";
  const { plot } = lay;
  const halfW = plot.w / 2;
  const halfH = plot.h / 2;
  const padding = 14;
  const positions: Record<1 | 2 | 3 | 4, { x: number; y: number; anchor: string }> = {
    1: { x: plot.x0 + plot.w - padding, y: plot.y0 + padding + 14, anchor: "end" }, // TR
    2: { x: plot.x0 + padding, y: plot.y0 + padding + 14, anchor: "start" }, // TL
    3: { x: plot.x0 + padding, y: plot.y0 + plot.h - padding, anchor: "start" }, // BL
    4: { x: plot.x0 + plot.w - padding, y: plot.y0 + plot.h - padding, anchor: "end" }, // BR
  };
  // suppress unused warnings
  void halfW;
  void halfH;

  const nodes: string[] = [];
  for (const a of ast.annotations) {
    const pos = positions[a.q];
    const growsUp = a.q === 3 || a.q === 4;
    const descLines = a.description ? wrapLabel(a.description, 28) : [];
    // For bottom quadrants, stack label + desc so description goes ABOVE label.
    const labelY = growsUp && descLines.length > 0 ? pos.y - descLines.length * 12 : pos.y;
    nodes.push(
      textEl(
        { x: pos.x, y: labelY, class: "sx-matrix-quad-annot", "text-anchor": pos.anchor },
        a.label
      )
    );
    for (let i = 0; i < descLines.length; i++) {
      nodes.push(
        textEl(
          {
            x: pos.x,
            y: labelY + 14 + i * 12,
            class: "sx-matrix-quad-desc",
            "text-anchor": pos.anchor,
          },
          descLines[i]!
        )
      );
    }
  }
  return group({ id: "sx-matrix-quad-annot" }, nodes);
}

function wrapLabel(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) out.push(cur);
      cur = w;
    } else {
      cur = (cur ? cur + " " : "") + w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function quadrantOf(col: number, row: number, cols: number, rows: number): 1 | 2 | 3 | 4 | undefined {
  if (cols !== 2 || rows !== 2) return undefined;
  if (col === 1 && row === 1) return 1; // TR
  if (col === 0 && row === 1) return 2; // TL
  if (col === 0 && row === 0) return 3; // BL
  if (col === 1 && row === 0) return 4; // BR
  return undefined;
}

function renderCellLabels(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (ast.mode !== "quadrant" || ast.cellLabels.length === 0) return "";
  if (ast.grid !== "2x2" && ast.grid !== "3x3") return "";

  const { plot } = lay;
  const cellW = plot.w / ast.cols;
  const cellH = plot.h / ast.rows;
  // Group cellLabels by (col,row) so multiple `cell (..)` lines stack as a list
  const buckets = new Map<string, string[]>();
  for (const cl of ast.cellLabels) {
    const k = `${cl.col},${cl.row}`;
    const arr = buckets.get(k) ?? [];
    arr.push(cl.label);
    buckets.set(k, arr);
  }

  const nodes: string[] = [];
  const maxCharsPerLine = Math.max(8, Math.floor((cellW - 24) / 6.6));
  const tableMode = ast.style === "table";

  // In table mode, also render cell titles for annotated quadrants that have NO items —
  // gives the canonical "Eisenhower 4-quadrant grid" feel even with sparse data.
  if (tableMode && ast.grid === "2x2") {
    for (const a of ast.annotations) {
      const cell = (() => {
        switch (a.q) {
          case 1: return { col: 1, row: 1 };
          case 2: return { col: 0, row: 1 };
          case 3: return { col: 0, row: 0 };
          case 4: return { col: 1, row: 0 };
        }
      })();
      const k = `${cell.col},${cell.row}`;
      if (!buckets.has(k)) buckets.set(k, []);
    }
  }

  for (const [k, items] of buckets) {
    const [col, row] = k.split(",").map(Number) as [number, number];
    const cellX = plot.x0 + cellW * col;
    const cellY = plot.y0 + cellH * (ast.rows - 1 - row);

    // Single label, no quadrant title → keep classic centered placement (3x3 9-box look)
    if (items.length === 1 && !tableMode) {
      const cx = cellX + cellW / 2;
      const cy = cellY + cellH / 2;
      nodes.push(textEl({ x: cx, y: cy, class: "sx-matrix-cell-label" }, items[0]!));
      continue;
    }

    // Table-style: optional cell-title (quadrant annotation) + bullet list, top-anchored
    const padX = 14;
    const padY = 14;
    let cursorY = cellY + padY + 12;

    if (tableMode) {
      const q = quadrantOf(col, row, ast.cols, ast.rows);
      const annot = q ? ast.annotations.find((a) => a.q === q) : undefined;
      if (annot) {
        nodes.push(
          textEl(
            { x: cellX + cellW / 2, y: cursorY, class: "sx-matrix-cell-title", "text-anchor": "middle" },
            annot.label,
          ),
        );
        cursorY += 22;
        if (annot.description) {
          const descLines = wrapLabel(annot.description, Math.max(12, maxCharsPerLine));
          for (const dl of descLines) {
            nodes.push(
              textEl(
                { x: cellX + cellW / 2, y: cursorY, class: "sx-matrix-cell-subtitle", "text-anchor": "middle" },
                dl,
              ),
            );
            cursorY += 13;
          }
          cursorY += 4;
        }
      }
    }

    for (const item of items) {
      const lines = wrapLabel(item, maxCharsPerLine);
      for (let i = 0; i < lines.length; i++) {
        const prefix = tableMode ? (i === 0 ? "•  " : "    ") : "";
        nodes.push(
          textEl(
            { x: cellX + padX, y: cursorY, class: "sx-matrix-cell-item", "text-anchor": "start" },
            prefix + lines[i]!,
          ),
        );
        cursorY += 16;
      }
    }
  }

  return group({ id: "sx-matrix-cell-labels" }, nodes);
}

function renderHeatmap(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (ast.mode !== "heatmap") return "";
  const { plot } = lay;
  const cellW = plot.w / ast.cols;
  const cellH = plot.h / ast.rows;
  const maxVal = Math.max(
    1,
    ...ast.cells.map((c) => c.value ?? (c.col + 1) * (c.row + 1))
  );

  const cells: string[] = [];

  // Color every cell in the grid (use cell.value if set, else derived product)
  for (let col = 0; col < ast.cols; col++) {
    for (let row = 0; row < ast.rows; row++) {
      const found = ast.cells.find((c) => c.col === col && c.row === row);
      const value = found?.value ?? (col + 1) * (row + 1);
      const ratio = Math.min(1, value / maxVal);
      const idx = Math.min(HEAT_RAMP.length - 1, Math.floor(ratio * HEAT_RAMP.length));
      const color = HEAT_RAMP[idx]!;
      const x = plot.x0 + col * cellW;
      const y = plot.y0 + (ast.rows - 1 - row) * cellH;
      cells.push(
        rect({
          x,
          y,
          width: cellW,
          height: cellH,
          fill: color,
          stroke: "#fff",
          "stroke-width": 2,
        })
      );
    }
  }

  // Row labels (outside plot, left side)
  if (ast.rowLabels) {
    for (let row = 0; row < ast.rows; row++) {
      const lbl = ast.rowLabels[row];
      if (!lbl) continue;
      const y = plot.y0 + (ast.rows - 1 - row + 0.5) * cellH;
      cells.push(
        textEl(
          {
            x: plot.x0 - 8,
            y,
            class: "sx-matrix-axis-end",
            "text-anchor": "end",
            "dominant-baseline": "central",
          },
          lbl
        )
      );
    }
  }
  // Col labels (bottom)
  if (ast.colLabels) {
    for (let col = 0; col < ast.cols; col++) {
      const lbl = ast.colLabels[col];
      if (!lbl) continue;
      const x = plot.x0 + (col + 0.5) * cellW;
      cells.push(
        textEl(
          {
            x,
            y: plot.y0 + plot.h + 16,
            class: "sx-matrix-axis-end",
            "text-anchor": "middle",
          },
          lbl
        )
      );
    }
  }

  // Cell labels
  for (const cl of ast.cellLabels) {
    const cx = plot.x0 + cellW * (cl.col + 0.5);
    const cy = plot.y0 + cellH * (ast.rows - 1 - cl.row + 0.5);
    // wrap labels
    const words = cl.label.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > 14) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = (cur ? cur + " " : "") + w;
      }
    }
    if (cur) lines.push(cur);
    const lineH = 13;
    const startY = cy - ((lines.length - 1) * lineH) / 2;
    for (let i = 0; i < lines.length; i++) {
      cells.push(
        textEl(
          {
            x: cx,
            y: startY + i * lineH,
            class: "sx-matrix-cell-label",
            "dominant-baseline": "central",
          },
          lines[i]!
        )
      );
    }
  }

  return group({ id: "sx-matrix-heatmap" }, cells);
}

const DOT_COLORS: Record<"strong" | "medium" | "weak", string> = {
  strong: "#16a34a",
  medium: "#86efac",
  weak: "#9ca3af",
};

function levelFromValue(v: number): "strong" | "medium" | "weak" {
  if (v >= 3) return "strong";
  if (v >= 2) return "medium";
  return "weak";
}

function renderCorrelation(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (ast.mode !== "correlation") return "";
  const { plot } = lay;
  const marginCols = ast.config.margins ? 2 : 0; // Score, Rank
  const marginRows = ast.config.margins ? 2 : 0;
  const cellW = plot.w / (ast.cols + marginCols);
  const cellH = plot.h / (ast.rows + marginRows);
  const gridW = cellW * ast.cols;
  const gridH = cellH * ast.rows;
  const nodes: string[] = [];

  // alternating row-band backgrounds for readability (image-1 style)
  for (let row = 0; row < ast.rows; row++) {
    const y = plot.y0 + (ast.rows - 1 - row) * cellH;
    nodes.push(
      rect({
        x: plot.x0,
        y,
        width: gridW,
        height: cellH,
        class: row % 2 === 0 ? "sx-matrix-corr-rowbg-a" : "sx-matrix-corr-rowbg-b",
      })
    );
  }

  // grid lines
  for (let i = 0; i <= ast.cols; i++) {
    const x = plot.x0 + i * cellW;
    nodes.push(lineEl({ x1: x, y1: plot.y0, x2: x, y2: plot.y0 + gridH, class: "sx-matrix-corr-grid" }));
  }
  for (let j = 0; j <= ast.rows; j++) {
    const y = plot.y0 + j * cellH;
    nodes.push(lineEl({ x1: plot.x0, y1: y, x2: plot.x0 + gridW, y2: y, class: "sx-matrix-corr-grid" }));
  }

  // dots
  const dotR = Math.max(4, Math.min(cellW, cellH) * 0.28);
  const rowSums = new Array(ast.rows).fill(0);
  const colSums = new Array(ast.cols).fill(0);
  for (const c of ast.cells) {
    if (c.col < 0 || c.col >= ast.cols || c.row < 0 || c.row >= ast.rows) continue;
    const v = c.value ?? (c.level ? (c.level === "strong" ? 3 : c.level === "medium" ? 2 : 1) : 0);
    if (v <= 0) continue;
    rowSums[c.row] += v;
    colSums[c.col] += v;
    const lvl = c.level ?? levelFromValue(v);
    const cx = plot.x0 + (c.col + 0.5) * cellW;
    const cy = plot.y0 + (ast.rows - 1 - c.row + 0.5) * cellH;
    nodes.push(
      circle({
        cx,
        cy,
        r: dotR,
        fill: DOT_COLORS[lvl],
        stroke: DOT_COLORS[lvl],
        "stroke-width": 1,
      })
    );
  }

  // col headers (top)
  if (ast.colLabels) {
    for (let col = 0; col < ast.cols; col++) {
      const label = ast.colLabels[col];
      if (!label) continue;
      const cx = plot.x0 + (col + 0.5) * cellW;
      const lines = wrapLabel(label, 10);
      const startY = plot.y0 - 8 - (lines.length - 1) * 12;
      for (let i = 0; i < lines.length; i++) {
        nodes.push(
          textEl(
            { x: cx, y: startY + i * 12, class: "sx-matrix-corr-header" },
            lines[i]!
          )
        );
      }
    }
  }

  // row labels (left)
  if (ast.rowLabels) {
    for (let row = 0; row < ast.rows; row++) {
      const label = ast.rowLabels[row];
      if (!label) continue;
      const y = plot.y0 + (ast.rows - 1 - row + 0.5) * cellH;
      nodes.push(
        textEl({ x: plot.x0 - 8, y, class: "sx-matrix-corr-rowlabel" }, label)
      );
    }
  }

  if (ast.config.margins) {
    // compute ranks (1 = highest)
    const rowRanks = rankOf(rowSums);
    const colRanks = rankOf(colSums);
    const bestRow = rowSums.length > 0 ? Math.max(...rowSums) : 0;
    const bestCol = colSums.length > 0 ? Math.max(...colSums) : 0;

    // right: Score col + Rank col
    const scoreColX = plot.x0 + gridW + cellW * 0.5;
    const rankColX = plot.x0 + gridW + cellW * 1.5;
    nodes.push(textEl({ x: scoreColX, y: plot.y0 - 8, class: "sx-matrix-corr-header" }, "Score"));
    nodes.push(textEl({ x: rankColX, y: plot.y0 - 8, class: "sx-matrix-corr-header" }, "Rank"));
    for (let row = 0; row < ast.rows; row++) {
      const y = plot.y0 + (ast.rows - 1 - row + 0.5) * cellH;
      const sum = rowSums[row];
      const rank = rowRanks[row];
      const cls = sum === bestRow && sum > 0
        ? "sx-matrix-corr-margin-best"
        : "sx-matrix-corr-margin";
      nodes.push(textEl({ x: scoreColX, y, class: cls }, String(sum)));
      nodes.push(
        textEl({ x: rankColX, y, class: rank === 1 ? "sx-matrix-corr-margin-best" : "sx-matrix-corr-margin" }, String(rank))
      );
    }
    // bottom: Score row + Rank row
    const scoreRowY = plot.y0 + gridH + cellH * 0.5;
    const rankRowY = plot.y0 + gridH + cellH * 1.5;
    nodes.push(
      textEl(
        { x: plot.x0 - 8, y: scoreRowY, class: "sx-matrix-corr-rowlabel" },
        "Score"
      )
    );
    nodes.push(
      textEl(
        { x: plot.x0 - 8, y: rankRowY, class: "sx-matrix-corr-rowlabel" },
        "Rank"
      )
    );
    for (let col = 0; col < ast.cols; col++) {
      const cx = plot.x0 + (col + 0.5) * cellW;
      const sum = colSums[col];
      const rank = colRanks[col];
      nodes.push(
        textEl(
          {
            x: cx,
            y: scoreRowY,
            class: sum === bestCol && sum > 0 ? "sx-matrix-corr-margin-best" : "sx-matrix-corr-margin",
          },
          String(sum)
        )
      );
      nodes.push(
        textEl(
          {
            x: cx,
            y: rankRowY,
            class: rank === 1 ? "sx-matrix-corr-margin-best" : "sx-matrix-corr-margin",
          },
          String(rank)
        )
      );
    }
  }

  return group({ id: "sx-matrix-correlation" }, nodes);
}

function rankOf(vals: number[]): number[] {
  const sorted = [...vals].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const ranks = new Array(vals.length).fill(0);
  let prev = -Infinity;
  let rank = 0;
  let seen = 0;
  for (const e of sorted) {
    seen++;
    if (e.v !== prev) {
      rank = seen;
      prev = e.v;
    }
    ranks[e.i] = rank;
  }
  return ranks;
}

function renderCorrelationLegend(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (ast.mode !== "correlation") return "";
  const xBase = lay.plot.x0 + lay.plot.w + 20;
  const yBase = lay.plot.y0 + 8;
  const items: Array<["strong" | "medium" | "weak", string]> = [
    ["strong", "Strong (3)"],
    ["medium", "Medium (2)"],
    ["weak", "Weak (1)"],
  ];
  const rows = items.map((it, i) =>
    group({ transform: `translate(${xBase}, ${yBase + i * 18})` }, [
      circle({ cx: 6, cy: 6, r: 5, fill: DOT_COLORS[it[0]], stroke: DOT_COLORS[it[0]] }),
      textEl({ x: 18, y: 10, class: "sx-matrix-legend-text" }, it[1]),
    ])
  );
  return group({ id: "sx-matrix-corr-legend" }, rows);
}

function renderPoints(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (ast.mode !== "quadrant") return "";
  const nodes: string[] = [];
  for (const p of lay.points) {
    nodes.push(renderOnePoint(p, lay.categories));
  }
  return group({ id: "sx-matrix-points" }, nodes);
}

function renderOnePoint(pl: PointLayout, categories: string[]): string {
  const p = pl.point;
  const color = bubbleFill(p, categories);
  const shape = p.shape ?? "circle";
  let shapeEl: string;
  const stroke = p.highlight ? "#111" : color;
  const strokeWidth = p.highlight ? 2.2 : 1.5;
  const fillOpacity = p.size !== undefined ? 0.45 : 0.75;
  if (shape === "circle") {
    shapeEl = circle({
      cx: pl.px,
      cy: pl.py,
      r: pl.r,
      fill: color,
      "fill-opacity": fillOpacity,
      stroke,
      "stroke-width": strokeWidth,
      class: "sx-matrix-bubble",
    });
  } else if (shape === "square") {
    shapeEl = rect({
      x: pl.px - pl.r,
      y: pl.py - pl.r,
      width: pl.r * 2,
      height: pl.r * 2,
      fill: color,
      "fill-opacity": fillOpacity,
      stroke,
      "stroke-width": strokeWidth,
      class: "sx-matrix-bubble",
    });
  } else if (shape === "diamond") {
    const r = pl.r;
    shapeEl = polygon({
      points: `${pl.px},${pl.py - r} ${pl.px + r},${pl.py} ${pl.px},${pl.py + r} ${pl.px - r},${pl.py}`,
      fill: color,
      "fill-opacity": fillOpacity,
      stroke,
      "stroke-width": strokeWidth,
      class: "sx-matrix-bubble",
    });
  } else {
    // triangle
    const r = pl.r;
    shapeEl = polygon({
      points: `${pl.px},${pl.py - r} ${pl.px + r},${pl.py + r * 0.8} ${pl.px - r},${pl.py + r * 0.8}`,
      fill: color,
      "fill-opacity": fillOpacity,
      stroke,
      "stroke-width": strokeWidth,
      class: "sx-matrix-bubble",
    });
  }

  const leader = pl.label.external
    ? lineEl({
        x1: pl.px,
        y1: pl.py,
        x2: pl.label.lx,
        y2: pl.label.ly,
        class: "sx-matrix-leader",
      })
    : "";

  const label = textEl(
    { x: pl.label.lx, y: pl.label.ly, class: "sx-matrix-label" },
    pl.label.text
  );

  // off-chart badge
  let badge = "";
  if (p.offChart) {
    const bx = pl.px;
    const by = pl.py;
    badge = textEl(
      { x: bx + pl.r + 4, y: by - pl.r - 2, class: "sx-matrix-offchart", "font-size": 14, "font-weight": 700 },
      "↗"
    );
  }

  const titleStr = p.note
    ? `${p.label} · (${p.origX ?? p.x}, ${p.origY ?? p.y}) — ${p.note}`
    : `${p.label} · (${(p.origX ?? p.x).toFixed(2)}, ${(p.origY ?? p.y).toFixed(2)})${p.size !== undefined ? ` · size ${p.size}` : ""}`;

  return group(
    {
      class: "sx-matrix-point",
      "data-point-id": p.id,
      "data-label": p.label,
      ...(p.category ? { "data-category": p.category } : {}),
    },
    [titleEl(titleStr), shapeEl, leader, label, badge].filter((s) => s.length > 0)
  );
}

function renderLegend(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (ast.config.legendPosition === "none") return "";
  if (ast.mode === "heatmap") {
    // color ramp
    const x = lay.plot.x0 + lay.plot.w - 220;
    const y = lay.plot.y0 + lay.plot.h + 40;
    const w = 210;
    const h = 10;
    const stops = HEAT_RAMP.map((c, i) =>
      el("stop", { offset: `${(i / (HEAT_RAMP.length - 1)) * 100}%`, "stop-color": c })
    );
    const grad = el(
      "linearGradient",
      { id: "sx-matrix-heatgrad", x1: "0%", x2: "100%" },
      stops
    );
    return group({ id: "sx-matrix-legend" }, [
      el("defs", {}, [grad]),
      rect({ x, y, width: w, height: h, fill: "url(#sx-matrix-heatgrad)", stroke: "#d1d5db" }),
      textEl({ x, y: y - 4, class: "sx-matrix-legend-text", "text-anchor": "start" }, "Low"),
      textEl(
        { x: x + w, y: y - 4, class: "sx-matrix-legend-text", "text-anchor": "end" },
        "High"
      ),
    ]);
  }
  if (lay.categories.length === 0) return "";
  const xBase = lay.plot.x0 + lay.plot.w + 12;
  const yBase = lay.plot.y0 + 8;
  const rows: string[] = lay.categories.map((cat, i) => {
    const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length]!;
    return group({ transform: `translate(${xBase}, ${yBase + i * 18})` }, [
      circle({ cx: 6, cy: 6, r: 5, fill: color, "fill-opacity": 0.7, stroke: color }),
      textEl({ x: 18, y: 10, class: "sx-matrix-legend-text" }, cat),
    ]);
  });
  return group({ id: "sx-matrix-legend" }, rows);
}

function renderTitle(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (!ast.title) return "";
  return textEl(
    { x: lay.canvasWidth / 2, y: 28, class: "sx-matrix-title", "text-anchor": "middle" },
    ast.title
  );
}

// ─── SIPOC ───────────────────────────────────────────────────

const SIPOC_COLUMN_DEFS: ReadonlyArray<{ key: "suppliers" | "inputs" | "process" | "outputs" | "customers"; label: string; color: string }> = [
  { key: "suppliers", label: "Suppliers", color: "#2563eb" },
  { key: "inputs", label: "Inputs", color: "#0891b2" },
  { key: "process", label: "Process", color: "#1e3a8a" },
  { key: "outputs", label: "Outputs", color: "#0891b2" },
  { key: "customers", label: "Customers", color: "#2563eb" },
];

function wrapToLines(textStr: string, maxChars: number, maxLines: number): string[] {
  const lines = wrapLabel(textStr, maxChars);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = kept[maxLines - 1]!.replace(/\s+\S*$/, "") + "…";
  return kept;
}

export function renderSipocAST(ast: MatrixAST, config?: RenderConfig): string {
  const t = resolveMatrixTheme(config?.theme ?? "default");
  const sipoc = ast.sipoc ?? { suppliers: [], inputs: [], process: [], outputs: [], customers: [] };
  const lay = layoutSipoc(ast);
  const nodes: string[] = [];

  if (ast.title) {
    nodes.push(
      textEl(
        { x: lay.canvasWidth / 2, y: 24, class: "sx-matrix-title", "text-anchor": "middle" },
        ast.title,
      ),
    );
  }

  const maxChars = Math.max(10, Math.floor((lay.colW - 16) / 6.4));

  SIPOC_COLUMN_DEFS.forEach((def, ci) => {
    const colX = lay.x0 + ci * lay.colW;
    // header band
    nodes.push(
      rect({
        x: colX,
        y: lay.y0,
        width: lay.colW,
        height: lay.headerH,
        fill: def.color,
        class: "sx-sipoc-headbox",
      }),
    );
    nodes.push(
      textEl(
        { x: colX + lay.colW / 2, y: lay.y0 + lay.headerH / 2, class: "sx-sipoc-header" },
        def.label,
      ),
    );

    const items = sipoc[def.key];
    const isProcess = def.key === "process";
    const cellNodes: string[] = [];
    for (let r = 0; r < lay.rows; r++) {
      const cellY = lay.y0 + lay.headerH + r * lay.rowH;
      const item = items[r];
      const cellClass = isProcess
        ? "sx-sipoc-process"
        : r % 2 === 0
          ? "sx-sipoc-cell"
          : "sx-sipoc-cell-alt";
      cellNodes.push(
        rect({ x: colX, y: cellY, width: lay.colW, height: lay.rowH, class: cellClass }),
      );
      if (item) {
        const label = isProcess ? `${r + 1}. ${item}` : item;
        const lines = wrapToLines(label, maxChars, 2);
        const lineH = 14;
        const startY = cellY + lay.rowH / 2 - ((lines.length - 1) * lineH) / 2;
        for (let i = 0; i < lines.length; i++) {
          cellNodes.push(
            textEl(
              {
                x: colX + lay.colW / 2,
                y: startY + i * lineH,
                class: isProcess ? "sx-sipoc-step" : "sx-sipoc-item",
              },
              lines[i]!,
            ),
          );
        }
      }
    }
    nodes.push(
      group({ class: "sx-sipoc-column", "data-column": def.key }, [
        titleEl(`${def.label}: ${items.join(", ")}`),
        ...cellNodes,
      ]),
    );
  });

  return svgRoot(
    {
      class: "sx-matrix sx-sipoc",
      "data-diagram-type": "matrix",
      "data-mode": "sipoc",
      width: lay.canvasWidth,
      height: lay.canvasHeight,
      viewBox: `0 0 ${lay.canvasWidth} ${lay.canvasHeight}`,
      role: "graphics-document",
    },
    [
      titleEl(ast.title ? `SIPOC — ${escapeXml(ast.title)}` : "SIPOC diagram"),
      descEl(
        `SIPOC scoping table — ${sipoc.suppliers.length} supplier(s), ${sipoc.inputs.length} input(s), ${sipoc.process.length} process step(s), ${sipoc.outputs.length} output(s), ${sipoc.customers.length} customer(s)`,
      ),
      defs([el("style", {}, buildMatrixCss(t))]),
      ...nodes,
    ],
  );
}

// ─── QFD — House of Quality ──────────────────────────────────

const CORR_GLYPH: Record<QfdCorrelation, string> = {
  "++": "●",
  "+": "○",
  "-": "−",
  "--": "✕",
};

const CORR_CLASS: Record<QfdCorrelation, string> = {
  "++": "sx-qfd-corr-strong-pos",
  "+": "sx-qfd-corr-pos",
  "-": "sx-qfd-corr-neg",
  "--": "sx-qfd-corr-strong-neg",
};

const CORR_LABEL: Record<QfdCorrelation, string> = {
  "++": "strong positive",
  "+": "positive",
  "-": "negative",
  "--": "strong negative",
};

function renderQfdRelationshipSymbol(strength: 9 | 3 | 1, cx: number, cy: number, r: number): string {
  if (strength === 9) {
    // strong: filled bullseye (filled circle inside ring)
    return group({}, [
      circle({ cx, cy, r, fill: "none", stroke: "#2563eb", "stroke-width": 1.4 }),
      circle({ cx, cy, r: r * 0.5, class: "sx-qfd-rel-strong" }),
    ]);
  }
  if (strength === 3) {
    // medium: open circle
    return circle({ cx, cy, r, class: "sx-qfd-rel-medium" });
  }
  // weak: small triangle
  const t = r * 0.95;
  return polygon({
    points: `${cx},${cy - t} ${cx + t},${cy + t * 0.85} ${cx - t},${cy + t * 0.85}`,
    class: "sx-qfd-rel-weak",
  });
}

export function renderQfdAST(ast: MatrixAST, config?: RenderConfig): string {
  const t = resolveMatrixTheme(config?.theme ?? "default");
  const qfd: QfdData = ast.qfd ?? { whats: [], hows: [], relationships: [], roof: [], normalize: false };
  const lay = layoutQfd(ast);
  const importance = computeQfdImportance(qfd);
  const maxImp = importance.reduce((m, c) => Math.max(m, c.importance), 0);
  const nodes: string[] = [];

  if (ast.title) {
    nodes.push(
      textEl(
        { x: lay.canvasWidth / 2, y: 24, class: "sx-matrix-title", "text-anchor": "middle" },
        ast.title,
      ),
    );
  }

  const gridRight = lay.gridX0 + lay.cols * lay.cellW;
  const gridBottom = lay.gridY0 + lay.rows * lay.cellH;

  // ── Roof: HOW×HOW correlation half-matrix of diamond cells ──
  //
  // For N HOWs there are N(N-1)/2 pairwise correlation cells. The upper
  // triangle is rotated 45° so each cell becomes a diamond (a square turned
  // on its corner). The diamonds tessellate into a pyramid sitting directly
  // on top of the HOW column boundaries:
  //   • horizontal center of pair (i,j) is above the midpoint of columns i, j
  //   • vertical row = depth = j − i (depth 1 = adjacent pair = bottom row,
  //     depth N−1 = the i=0/j=N−1 pair = the single apex diamond)
  // Each diamond has the column pitch (cellW) as its full diagonal width and
  // height, so the lattice aligns exactly with the columns below.
  const roofNodes: string[] = [];
  const half = lay.cellW / 2; // half-diagonal = one diamond's vertical/horizontal half-extent
  const roofBaseY = lay.gridY0 - lay.howLabelH;
  // Lookup declared correlations by ordered pair key.
  const corrByPair = new Map<string, QfdCorrelation>();
  for (const rc of qfd.roof) {
    const a = Math.min(rc.a, rc.b);
    const b = Math.max(rc.a, rc.b);
    corrByPair.set(`${a},${b}`, rc.correlation);
  }
  // Build the full upper-triangular set of diamonds (declared or blank).
  for (let i = 0; i < lay.cols; i++) {
    for (let j = i + 1; j < lay.cols; j++) {
      const depth = j - i; // 1 = adjacent (bottom row)
      // horizontal center: above the midpoint between column i and column j
      const cx = lay.gridX0 + ((i + j) / 2 + 0.5) * lay.cellW;
      // vertical center: row `depth` stacks upward from the base
      const cy = roofBaseY - (depth - 0.5) * half;
      const corr = corrByPair.get(`${i},${j}`);
      const diamond = polygon({
        points: `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`,
        class: corr ? "sx-qfd-roof-cell-filled" : "sx-qfd-roof-cell",
      });
      const cellChildren: string[] = [
        titleEl(
          corr
            ? `${qfd.hows[i]?.label ?? `HOW ${i}`} ↔ ${qfd.hows[j]?.label ?? `HOW ${j}`}: ${CORR_LABEL[corr]}`
            : `${qfd.hows[i]?.label ?? `HOW ${i}`} ↔ ${qfd.hows[j]?.label ?? `HOW ${j}`}: no correlation`,
        ),
        diamond,
      ];
      if (corr) {
        cellChildren.push(
          textEl(
            { x: cx, y: cy, class: `sx-qfd-corr ${CORR_CLASS[corr]}` },
            CORR_GLYPH[corr],
          ),
        );
      }
      roofNodes.push(
        group(
          {
            class: "sx-qfd-roof-pair",
            "data-pair": `${i},${j}`,
            ...(corr ? { "data-corr": corr } : {}),
          },
          cellChildren,
        ),
      );
    }
  }
  nodes.push(group({ class: "sx-qfd-roof" }, [titleEl("Roof: engineering correlation matrix"), ...roofNodes]));

  // ── HOW labels (rotated, above grid) ──
  qfd.hows.forEach((how, ci) => {
    const cx = lay.gridX0 + (ci + 0.5) * lay.cellW;
    const baseY = lay.gridY0 - 8;
    nodes.push(
      textEl(
        {
          x: cx,
          y: baseY,
          class: "sx-qfd-how",
          "text-anchor": "start",
          transform: `rotate(-60 ${cx} ${baseY})`,
        },
        how.label,
      ),
    );
    if (how.direction) {
      const glyph = how.direction === "up" ? "▲" : how.direction === "down" ? "▼" : "◇";
      nodes.push(
        textEl({ x: cx, y: lay.gridY0 - 4, class: "sx-qfd-dir" }, glyph),
      );
    }
  });

  // ── Weight column header ──
  nodes.push(
    textEl(
      { x: lay.gridX0 - lay.weightW / 2, y: lay.gridY0 - 8, class: "sx-qfd-weight-head" },
      "Wt",
    ),
  );

  // ── Grid background bands + lines ──
  const gridNodes: string[] = [];
  for (let r = 0; r < lay.rows; r++) {
    const y = lay.gridY0 + r * lay.cellH;
    gridNodes.push(
      rect({
        x: lay.gridX0,
        y,
        width: lay.cols * lay.cellW,
        height: lay.cellH,
        class: r % 2 === 0 ? "sx-qfd-cellbg" : "sx-qfd-cellbg-alt",
      }),
    );
  }
  for (let i = 0; i <= lay.cols; i++) {
    const x = lay.gridX0 + i * lay.cellW;
    gridNodes.push(lineEl({ x1: x, y1: lay.gridY0, x2: x, y2: gridBottom, class: "sx-qfd-grid" }));
  }
  for (let j = 0; j <= lay.rows; j++) {
    const y = lay.gridY0 + j * lay.cellH;
    gridNodes.push(lineEl({ x1: lay.gridX0, y1: y, x2: gridRight, y2: y, class: "sx-qfd-grid" }));
  }
  nodes.push(group({ class: "sx-qfd-gridlines" }, gridNodes));

  // ── WHAT labels + weight values ──
  const whatMaxChars = Math.max(10, Math.floor((lay.whatLabelW - 12) / 6.4));
  qfd.whats.forEach((what, ri) => {
    const cy = lay.gridY0 + (ri + 0.5) * lay.cellH;
    const lines = wrapToLines(what.label, whatMaxChars, 2);
    const lineH = 13;
    const startY = cy - ((lines.length - 1) * lineH) / 2;
    const labelNodes: string[] = lines.map((ln, i) =>
      textEl({ x: lay.gridX0 - lay.weightW - 8, y: startY + i * lineH, class: "sx-qfd-what" }, ln),
    );
    labelNodes.push(
      textEl({ x: lay.gridX0 - lay.weightW / 2, y: cy, class: "sx-qfd-weight" }, String(what.weight)),
    );
    nodes.push(
      group({ class: "sx-qfd-what-row", "data-what": String(ri) }, [
        titleEl(`${what.label} (weight ${what.weight})`),
        ...labelNodes,
      ]),
    );
  });

  // ── Relationship symbols ──
  const relNodes: string[] = [];
  const symR = Math.min(lay.cellW, lay.cellH) * 0.3;
  for (const rel of qfd.relationships) {
    if (rel.how < 0 || rel.how >= lay.cols || rel.what < 0 || rel.what >= lay.rows) continue;
    const cx = lay.gridX0 + (rel.how + 0.5) * lay.cellW;
    const cy = lay.gridY0 + (rel.what + 0.5) * lay.cellH;
    relNodes.push(
      group(
        { class: "sx-qfd-rel", "data-strength": String(rel.strength) },
        [titleEl(`${qfd.whats[rel.what]?.label ?? ""} × ${qfd.hows[rel.how]?.label ?? ""} = ${rel.strength}`),
          renderQfdRelationshipSymbol(rel.strength, cx, cy, symR)],
      ),
    );
  }
  nodes.push(group({ class: "sx-qfd-relationships" }, relNodes));

  // ── Computed technical-importance footer ──
  const footerNodes: string[] = [];
  const impRowY = gridBottom;
  const impH = lay.footerH;
  footerNodes.push(
    rect({ x: lay.gridX0, y: impRowY, width: lay.cols * lay.cellW, height: impH, class: "sx-qfd-imp-band" }),
  );
  for (let i = 1; i < lay.cols; i++) {
    const x = lay.gridX0 + i * lay.cellW;
    footerNodes.push(lineEl({ x1: x, y1: impRowY, x2: x, y2: impRowY + impH, class: "sx-qfd-grid" }));
  }
  const footerLabel = qfd.normalize ? "Importance %" : "Technical importance Σ(wt×rel)";
  footerNodes.push(
    textEl({ x: lay.gridX0 - 8, y: impRowY + impH / 2, class: "sx-qfd-imp-head" }, footerLabel),
  );
  importance.forEach((col) => {
    const cx = lay.gridX0 + (col.how + 0.5) * lay.cellW;
    const cy = impRowY + impH / 2;
    const isTop = col.importance === maxImp && maxImp > 0;
    const display = qfd.normalize ? `${col.percent}%` : String(col.importance);
    footerNodes.push(
      textEl(
        { x: cx, y: cy, class: isTop ? "sx-qfd-imp-value-top" : "sx-qfd-imp-value" },
        display,
      ),
    );
  });
  nodes.push(group({ class: "sx-qfd-importance" }, [titleEl("Computed technical importance per engineering characteristic"), ...footerNodes]));

  return svgRoot(
    {
      class: "sx-matrix sx-qfd",
      "data-diagram-type": "matrix",
      "data-mode": "qfd",
      width: lay.canvasWidth,
      height: lay.canvasHeight,
      viewBox: `0 0 ${lay.canvasWidth} ${lay.canvasHeight}`,
      role: "graphics-document",
    },
    [
      titleEl(ast.title ? `QFD House of Quality — ${escapeXml(ast.title)}` : "QFD House of Quality"),
      descEl(
        `QFD House of Quality — ${qfd.whats.length} customer requirement(s), ${qfd.hows.length} engineering characteristic(s), ${qfd.relationships.length} relationship(s); technical importance computed per column`,
      ),
      defs([el("style", {}, buildMatrixCss(t))]),
      ...nodes,
    ],
  );
}

// ─── Punnett square — Mendelian cross ────────────────────────

// Phenotype-class palette (light cell tint + matching legend swatch).
const PUNNETT_TINTS = ["#dbeafe", "#dcfce7", "#fef9c3", "#fed7aa", "#fae8ff", "#cffafe", "#fee2e2", "#e0e7ff"];
const PUNNETT_STRONG = ["#2563eb", "#16a34a", "#ca8a04", "#ea580c", "#9333ea", "#0891b2", "#dc2626", "#4f46e5"];

/** Display a parent genotype, dominant allele first per locus, e.g. "RrYy". */
function genotypeText(parent: string[][], genes: PunnettGene[]): string {
  return parent
    .map((pair, i) => {
      const dom = genes[i]?.dominant;
      const [a, b] = [pair[0] ?? "", pair[1] ?? ""];
      return a === dom ? a + b : b === dom ? b + a : a + b;
    })
    .join("");
}

export function renderPunnettAST(ast: MatrixAST, config?: RenderConfig): string {
  const t = resolveMatrixTheme(config?.theme ?? "default");
  const pd = ast.punnett;
  const lay = layoutPunnett(ast);

  const svgWrap = (body: string[], descText: string): string =>
    svgRoot(
      {
        class: "sx-matrix sx-punnett",
        "data-diagram-type": "matrix",
        "data-mode": "punnett",
        width: lay.canvasWidth,
        height: lay.canvasHeight,
        viewBox: `0 0 ${lay.canvasWidth} ${lay.canvasHeight}`,
        role: "graphics-document",
      },
      [
        titleEl(ast.title ? `Punnett square — ${escapeXml(ast.title)}` : "Punnett square"),
        descEl(descText),
        defs([el("style", {}, buildMatrixCss(t))]),
        ...body,
      ],
    );

  if (!pd || pd.genes.length === 0) {
    return svgWrap(
      [
        textEl(
          { x: lay.canvasWidth / 2, y: 44, class: "sx-matrix-title", "text-anchor": "middle" },
          ast.title ?? "Punnett square",
        ),
        textEl({ x: lay.canvasWidth / 2, y: 84, class: "sx-punnett-hint" }, "Add a cross, e.g.  cross: Bb x Bb"),
      ],
      "Empty Punnett square — no cross specified",
    );
  }

  const result = computePunnett(pd);
  const phenoColor = new Map<string, { tint: string; strong: string }>();
  result.phenotypeRatio.forEach((p, i) => {
    phenoColor.set(p.key, {
      tint: PUNNETT_TINTS[i % PUNNETT_TINTS.length]!,
      strong: PUNNETT_STRONG[i % PUNNETT_STRONG.length]!,
    });
  });

  const nodes: string[] = [];
  if (ast.title) {
    nodes.push(
      textEl(
        { x: lay.canvasWidth / 2, y: 24, class: "sx-matrix-title", "text-anchor": "middle" },
        ast.title,
      ),
    );
  }

  const gx0 = lay.x0 + lay.headerW; // first body-column x
  const gy0 = lay.y0 + lay.headerH; // first body-row y

  // corner cell: split, parent-1 genotype top-right (columns), parent-2 bottom-left (rows)
  nodes.push(rect({ x: lay.x0, y: lay.y0, width: lay.headerW, height: lay.headerH, class: "sx-punnett-corner" }));
  nodes.push(
    lineEl({ x1: lay.x0, y1: lay.y0, x2: lay.x0 + lay.headerW, y2: lay.y0 + lay.headerH, class: "sx-punnett-cornerline" }),
  );
  nodes.push(
    textEl(
      { x: lay.x0 + lay.headerW - 6, y: lay.y0 + 8, class: "sx-punnett-corner-p1", "text-anchor": "end" },
      genotypeText(pd.parent1, pd.genes),
    ),
  );
  nodes.push(
    textEl(
      { x: lay.x0 + 6, y: lay.y0 + lay.headerH - 8, class: "sx-punnett-corner-p2", "text-anchor": "start" },
      genotypeText(pd.parent2, pd.genes),
    ),
  );

  // column gamete headers (parent 1)
  result.gametes1.forEach((g, c) => {
    const cx = gx0 + c * lay.cellW;
    nodes.push(rect({ x: cx, y: lay.y0, width: lay.cellW, height: lay.headerH, class: "sx-punnett-header" }));
    nodes.push(textEl({ x: cx + lay.cellW / 2, y: lay.y0 + lay.headerH / 2, class: "sx-punnett-gamete" }, g));
  });
  // row gamete headers (parent 2)
  result.gametes2.forEach((g, r) => {
    const cy = gy0 + r * lay.cellH;
    nodes.push(rect({ x: lay.x0, y: cy, width: lay.headerW, height: lay.cellH, class: "sx-punnett-header" }));
    nodes.push(textEl({ x: lay.x0 + lay.headerW / 2, y: cy + lay.cellH / 2, class: "sx-punnett-gamete" }, g));
  });

  // body cells, tinted by phenotype class
  for (let r = 0; r < result.grid.length; r++) {
    const row = result.grid[r]!;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c]!;
      const color = phenoColor.get(cell.phenotypeKey)!;
      const cx = gx0 + c * lay.cellW;
      const cy = gy0 + r * lay.cellH;
      nodes.push(rect({ x: cx, y: cy, width: lay.cellW, height: lay.cellH, fill: color.tint, class: "sx-punnett-cell" }));
      nodes.push(textEl({ x: cx + lay.cellW / 2, y: cy + lay.cellH / 2, class: "sx-punnett-genotype" }, cell.genotype));
    }
  }

  // footer — the computed result: phenotype ratio + legend, then genotype ratio
  const footer = punnettFooter(result);
  let fy = lay.footerY + 18;
  nodes.push(
    textEl({ x: lay.x0, y: fy, class: "sx-punnett-footer-head" }, `Phenotype ratio  ${footer.phenotypeRatio}`),
  );
  fy += 22;
  for (const p of footer.legend) {
    const color = phenoColor.get(p.key)!;
    nodes.push(
      rect({ x: lay.x0, y: fy - 8, width: 14, height: 14, fill: color.tint, stroke: color.strong, "stroke-width": 1.4 }),
    );
    nodes.push(textEl({ x: lay.x0 + 22, y: fy, class: "sx-punnett-legend" }, `${p.count} × ${p.label}`));
    fy += 22;
  }
  nodes.push(
    textEl(
      { x: lay.x0, y: fy + 4, class: "sx-punnett-geno-ratio" },
      `Genotype ratio  ${footer.genotypeRatio}  —  ${footer.genotypeDetail}`,
    ),
  );

  const descText = `Punnett square — ${pd.genes.length === 1 ? "monohybrid" : pd.genes.length === 2 ? "dihybrid" : `${pd.genes.length}-gene`} cross ${genotypeText(pd.parent1, pd.genes)} × ${genotypeText(pd.parent2, pd.genes)}; phenotype ratio ${footer.phenotypeRatio}`;
  return svgWrap(nodes, descText);
}

export function renderMatrixAST(ast: MatrixAST, config?: RenderConfig): string {
  if (ast.mode === "sipoc") return renderSipocAST(ast, config);
  if (ast.mode === "qfd") return renderQfdAST(ast, config);
  if (ast.mode === "punnett") return renderPunnettAST(ast, config);
  const t = resolveMatrixTheme(config?.theme ?? "default");
  const lay = layoutMatrix(ast);
  const needsLegendSpace =
    lay.categories.length > 0 || ast.mode === "correlation";
  const extraWidth =
    needsLegendSpace && lay.plot.x0 + lay.plot.w + 140 > lay.canvasWidth ? 160 : 0;
  const canvasWidth = lay.canvasWidth + extraWidth;

  const body = [
    renderTitle(ast, lay),
    renderQuadrantBackground(ast, lay),
    renderGrid(ast, lay),
    renderTableChrome(ast, lay),
    renderQuadAnnotations(ast, lay),
    renderCellLabels(ast, lay),
    renderHeatmap(ast, lay),
    renderCorrelation(ast, lay),
    renderAxes(ast, lay),
    renderPoints(ast, lay),
    renderLegend(ast, lay),
    renderCorrelationLegend(ast, lay),
  ].filter((s) => s.length > 0);

  return svgRoot(
    {
      class: "sx-matrix",
      "data-diagram-type": "matrix",
      "data-mode": ast.mode,
      width: canvasWidth,
      height: lay.canvasHeight,
      viewBox: `0 0 ${canvasWidth} ${lay.canvasHeight}`,
      role: "graphics-document",
    },
    [
      titleEl(ast.title ? `Matrix — ${escapeXml(ast.title)}` : "Matrix diagram"),
      descEl(
        `Matrix diagram${ast.template ? ` (${ast.template} template)` : ""}, ${ast.mode} mode, ${ast.points.length} point(s)`
      ),
      defs([el("style", {}, buildMatrixCss(t)), axisArrow(t)]),
      ...body,
    ]
  );
}

export function renderMatrix(text: string, config?: RenderConfig): string {
  const ast = parseMatrix(text);
  return renderMatrixAST(ast, config);
}
