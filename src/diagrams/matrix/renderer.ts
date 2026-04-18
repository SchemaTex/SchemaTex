import type { MatrixAST, MatrixPoint } from "./types";
import { parseMatrix } from "./parser";
import { layoutMatrix, type MatrixLayoutResult, type PointLayout } from "./layout";
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

const CSS = `
.sx-matrix { background: #fff; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-matrix-title { font: 600 16px sans-serif; fill: #111; }
.sx-matrix-grid { stroke: #e5e7eb; stroke-width: 1; fill: none; }
.sx-matrix-mid { stroke: #9ca3af; stroke-width: 1.2; stroke-dasharray: 4 3; fill: none; }
.sx-matrix-plot-border { stroke: #374151; stroke-width: 1.2; fill: none; }
.sx-matrix-axis-label { font: 500 12px sans-serif; fill: #374151; }
.sx-matrix-axis-end { font: 500 11px sans-serif; fill: #6b7280; }
.sx-matrix-quad-annot { font: 600 13px sans-serif; fill: #475569; opacity: 0.75; }
.sx-matrix-quad-desc { font: 400 10.5px sans-serif; fill: #64748b; opacity: 0.85; }
.sx-matrix-corr-header { font: 600 11.5px sans-serif; fill: #1f2937; text-anchor: middle; }
.sx-matrix-corr-rowlabel { font: 500 11.5px sans-serif; fill: #1f2937; text-anchor: end; dominant-baseline: central; }
.sx-matrix-corr-margin { font: 500 11px sans-serif; fill: #374151; text-anchor: middle; dominant-baseline: central; }
.sx-matrix-corr-margin-best { font: 700 11.5px sans-serif; fill: #111; text-anchor: middle; dominant-baseline: central; }
.sx-matrix-corr-grid { stroke: #d1d5db; stroke-width: 0.8; fill: none; }
.sx-matrix-corr-rowbg-a { fill: #f0fdf4; }
.sx-matrix-corr-rowbg-b { fill: #fff; }
.sx-matrix-cell-label { font: 500 12px sans-serif; fill: #1f2937; text-anchor: middle; }
.sx-matrix-cell-value { font: 600 18px sans-serif; fill: #111; text-anchor: middle; }
.sx-matrix-bubble { stroke-width: 1.5; }
.sx-matrix-label { font: 500 11px sans-serif; fill: #111827; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
.sx-matrix-leader { stroke: #94a3b8; stroke-width: 0.6; opacity: 0.7; fill: none; }
.sx-matrix-legend-text { font: 500 11px sans-serif; fill: #374151; }
.sx-matrix-offchart { fill: #ea580c; }
`.trim();

function axisArrow(): string {
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
    [el("path", { d: "M0,0 L10,5 L0,10 z", fill: "#374151" })]
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
  if (!ast.config.quadrantBg || ast.grid !== "2x2") return "";
  const { plot } = lay;
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

function render3x3CellLabels(ast: MatrixAST, lay: MatrixLayoutResult): string {
  if (ast.grid !== "3x3" || ast.cellLabels.length === 0) return "";
  const { plot } = lay;
  const cellW = plot.w / ast.cols;
  const cellH = plot.h / ast.rows;
  const nodes = ast.cellLabels.map((cl) => {
    const cx = plot.x0 + cellW * (cl.col + 0.5);
    const cy = plot.y0 + cellH * (ast.rows - 1 - cl.row + 0.5);
    return textEl({ x: cx, y: cy, class: "sx-matrix-cell-label" }, cl.label);
  });
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

export function renderMatrixAST(ast: MatrixAST): string {
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
    renderQuadAnnotations(ast, lay),
    render3x3CellLabels(ast, lay),
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
      defs([el("style", {}, CSS), axisArrow()]),
      ...body,
    ]
  );
}

export function renderMatrix(text: string): string {
  const ast = parseMatrix(text);
  return renderMatrixAST(ast);
}
