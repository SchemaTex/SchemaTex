import type { RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  rect,
  circle,
  polygon,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { layoutDecisionTree } from "./layout";
import type { DTreeAST, DTreeLayoutNode, DTreeLayoutResult, DTreeNode } from "./types";

const CLASS_PALETTE = [
  "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6",
  "#14b8a6", "#ec4899", "#84cc16", "#06b6d4", "#f97316",
];

function buildCss(t: BaseTheme): string {
  return `
.lt-dtree { background: ${t.bg}; font-family: system-ui, -apple-system, sans-serif; }
.lt-dtree-title { font: 500 16px sans-serif; fill: ${t.text}; }
.lt-dtree-edge { fill: none; stroke: ${t.stroke}; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.lt-dtree-edge-optimal { fill: none; stroke: ${t.positive}; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.lt-dtree-edge-leader { fill: none; stroke: ${t.stroke}; stroke-width: 1; stroke-dasharray: 2 2; opacity: 0.55; }
.lt-dtree-edge-label { font: 500 11px sans-serif; fill: ${t.text}; text-anchor: middle; dominant-baseline: middle; }
.lt-dtree-edge-prob { font: italic 400 10px sans-serif; fill: ${t.textMuted}; text-anchor: middle; dominant-baseline: middle; }
.lt-dtree-edge-label-bg { fill: ${t.bg}; stroke: none; }
.lt-dtree-decision { fill: #dbeafe; stroke: #1d4ed8; stroke-width: 1.6; }
.lt-dtree-chance { fill: #fef3c7; stroke: #b45309; stroke-width: 1.6; }
.lt-dtree-outcome { fill: #f1f5f9; stroke: ${t.stroke}; stroke-width: 1.4; }
.lt-dtree-node-label { font: 500 12px sans-serif; fill: ${t.text}; }
.lt-dtree-ev { font: 500 10px "SF Mono", monospace; fill: ${t.textMuted}; }
.lt-dtree-ev-optimal { font: 600 10px "SF Mono", monospace; fill: ${t.positive}; }
.lt-dtree-payoff { font: 600 12px "SF Mono", monospace; fill: ${t.text}; }
.lt-dtree-payoff-neg { font: 600 12px "SF Mono", monospace; fill: ${t.negative ?? "#dc2626"}; }
.lt-dtree-ml-rect { stroke: ${t.stroke}; stroke-width: 1; }
.lt-dtree-ml-line-1 { font: 500 12px sans-serif; fill: ${t.text}; }
.lt-dtree-ml-line-muted { font: 400 10px sans-serif; fill: ${t.textMuted}; }
.lt-dtree-ml-mono { font: 400 10px "SF Mono", monospace; fill: ${t.textMuted}; }
.lt-dtree-ml-class { font: 600 11px sans-serif; }
.lt-dtree-taxon { fill: #eef2ff; stroke: #4f46e5; stroke-width: 1.4; }
.lt-dtree-taxon-leaf { fill: #ecfdf5; stroke: #059669; stroke-width: 1.4; }
.lt-dtree-taxon-label { font: 500 12px sans-serif; fill: ${t.text}; text-anchor: middle; }
`.trim();
}

// ─── Decision-mode node rendering ────────────────────────────

function renderDecisionNode(ln: DTreeLayoutNode, layout: DTreeLayoutResult): string {
  const n = ln.node;
  const parts: string[] = [];
  const sibH = layout.direction === "top-down";

  if (n.kind === "decision") {
    parts.push(rect({
      x: ln.x - ln.width / 2,
      y: ln.y - ln.height / 2,
      width: ln.width,
      height: ln.height,
      rx: 2,
      ry: 2,
      class: "lt-dtree-decision",
    }));
    if (n.label) {
      // Place label above (top-down) or to the left (left-right)
      if (sibH) {
        parts.push(textEl({
          x: ln.x, y: ln.y - ln.height / 2 - 8,
          class: "lt-dtree-node-label", "text-anchor": "middle",
        }, n.label));
      } else {
        parts.push(textEl({
          x: ln.x - ln.width / 2 - 8, y: ln.y + 4,
          class: "lt-dtree-node-label", "text-anchor": "end",
        }, n.label));
      }
    }
    if (n.ev !== undefined) {
      parts.push(textEl({
        x: ln.x, y: ln.y + ln.height / 2 + 13,
        class: "lt-dtree-ev", "text-anchor": "middle",
      }, `EV=${formatNum(n.ev)}`));
    }
  } else if (n.kind === "chance") {
    parts.push(circle({
      cx: ln.x, cy: ln.y, r: ln.width / 2,
      class: "lt-dtree-chance",
    }));
    if (n.label) {
      if (sibH) {
        parts.push(textEl({
          x: ln.x, y: ln.y - ln.height / 2 - 8,
          class: "lt-dtree-node-label", "text-anchor": "middle",
        }, n.label));
      } else {
        parts.push(textEl({
          x: ln.x, y: ln.y - ln.height / 2 - 6,
          class: "lt-dtree-node-label", "text-anchor": "middle",
        }, n.label));
      }
    }
    if (n.ev !== undefined) {
      parts.push(textEl({
        x: ln.x, y: ln.y + ln.height / 2 + 13,
        class: n.optimal ? "lt-dtree-ev-optimal" : "lt-dtree-ev",
        "text-anchor": "middle",
      }, `EV=${formatNum(n.ev)}`));
    }
  } else if (n.kind === "end") {
    // Right-pointing triangle
    const halfW = ln.width / 2;
    const halfH = ln.height / 2;
    const pts = [
      `${ln.x - halfW},${ln.y - halfH}`,
      `${ln.x + halfW},${ln.y}`,
      `${ln.x - halfW},${ln.y + halfH}`,
    ].join(" ");
    parts.push(polygon({ points: pts, class: "lt-dtree-outcome" }));

    // Payoff column: if available, leader-line from triangle tip to column; else inline.
    const colX = layout.payoffColumnX;
    const tipX = ln.x + halfW;
    const textY = ln.y + 4;
    const payoffCls = n.payoff !== undefined && n.payoff < 0 ? "lt-dtree-payoff-neg" : "lt-dtree-payoff";
    const payoffStr = n.payoff !== undefined ? formatPayoff(n.payoff) : "";

    if (colX !== undefined && colX > tipX + 20) {
      // Leader line (dashed) to column
      parts.push(pathEl({
        d: `M ${tipX + 2} ${ln.y} L ${colX - 6} ${ln.y}`,
        class: "lt-dtree-edge-leader",
      }));
      // Outcome label above leader (midpoint)
      if (n.label) {
        parts.push(textEl({
          x: (tipX + colX) / 2, y: ln.y - 6,
          class: "lt-dtree-edge-label", "text-anchor": "middle",
        }, n.label));
      }
      if (payoffStr) {
        parts.push(textEl({
          x: colX, y: textY, class: payoffCls, "text-anchor": "start",
        }, payoffStr));
      }
    } else {
      const labelParts: string[] = [];
      if (payoffStr) labelParts.push(payoffStr);
      if (n.label) labelParts.push(n.label);
      if (labelParts.length > 0) {
        parts.push(textEl({
          x: tipX + 8, y: textY, class: payoffCls,
        }, labelParts.join(" · ")));
      }
    }
  }

  return group({
    "data-node-id": n.id,
    "data-node-kind": n.kind,
    "data-ev": n.ev !== undefined ? String(n.ev) : "",
  }, parts);
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 10000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function formatPayoff(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1)}M`;
  if (abs >= 1000) return `${sign}$${abs.toLocaleString()}`;
  return String(n);
}

// ─── ML-mode node rendering ──────────────────────────────────

function classColor(i: number): string { return CLASS_PALETTE[i % CLASS_PALETTE.length]!; }

function mlNodeFillColor(n: DTreeNode): { fill: string } {
  if (!Array.isArray(n.value)) return { fill: "#f1f5f9" };
  const arr = n.value as number[];
  const sum = arr.reduce((a, b) => a + b, 0);
  if (sum === 0) return { fill: "#f1f5f9" };
  let maxIdx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i]! > arr[maxIdx]!) maxIdx = i;
  const purity = arr[maxIdx]! / sum;
  const nClasses = arr.length;
  const minPurity = 1 / nClasses;
  const alpha = Math.max(0.12, 0.12 + 0.8 * ((purity - minPurity) / (1 - minPurity)));
  return { fill: hexWithAlpha(classColor(maxIdx), alpha) };
}

function hexWithAlpha(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

function renderMlNode(ln: DTreeLayoutNode, ast: DTreeAST): string {
  const n = ln.node;
  const { fill } = mlNodeFillColor(n);
  const parts: string[] = [];
  const x = ln.x - ln.width / 2;
  const y = ln.y - ln.height / 2;

  parts.push(rect({
    x, y, width: ln.width, height: ln.height, rx: 6, ry: 6,
    fill, class: "lt-dtree-ml-rect",
  }));

  const textX = ln.x;
  let textY = y + 16;
  const lineH = 14;

  if (n.kind === "split" && n.feature) {
    const thresh = typeof n.threshold === "number" ? formatNum(n.threshold) : n.threshold ?? "";
    parts.push(textEl({ x: textX, y: textY, class: "lt-dtree-ml-line-1", "text-anchor": "middle" },
      `${n.feature} ${n.op ?? ""} ${thresh}`));
    textY += lineH;
  } else if (n.label) {
    parts.push(textEl({ x: textX, y: textY, class: "lt-dtree-ml-line-1", "text-anchor": "middle" }, n.label));
    textY += lineH;
  }
  if (n.impurity !== undefined) {
    const impName = ast.impurityName ?? "gini";
    parts.push(textEl({ x: textX, y: textY, class: "lt-dtree-ml-line-muted", "text-anchor": "middle" },
      `${impName} = ${formatNum(n.impurity)}`));
    textY += lineH;
  }
  if (n.samples !== undefined) {
    parts.push(textEl({ x: textX, y: textY, class: "lt-dtree-ml-line-muted", "text-anchor": "middle" },
      `samples = ${n.samples}`));
    textY += lineH;
  }
  if (n.value !== undefined) {
    const vStr = Array.isArray(n.value)
      ? `value = [${n.value.join(", ")}]`
      : `value = ${formatNum(n.value)}`;
    parts.push(textEl({ x: textX, y: textY, class: "lt-dtree-ml-mono", "text-anchor": "middle" }, vStr));
    textY += lineH;
  }
  if (n.className) {
    let colorIdx = 0;
    if (ast.classes) {
      const idx = ast.classes.indexOf(n.className);
      if (idx >= 0) colorIdx = idx;
    }
    parts.push(textEl({ x: textX, y: textY, class: "lt-dtree-ml-class", "text-anchor": "middle", fill: classColor(colorIdx) },
      `class = ${n.className}`));
    textY += lineH;
  } else if (typeof n.value === "number") {
    parts.push(textEl({ x: textX, y: textY, class: "lt-dtree-ml-class", "text-anchor": "middle", fill: "#0f172a" },
      `predicted = ${formatNum(n.value)}`));
    textY += lineH;
  }

  if (Array.isArray(n.value) && ast.classes) {
    const arr = n.value as number[];
    const sum = arr.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      const barY = y + ln.height - 10;
      const barX = x + 10;
      const barW = ln.width - 20;
      let cursor = barX;
      for (let i = 0; i < arr.length; i++) {
        const seg = (arr[i]! / sum) * barW;
        if (seg > 0) {
          parts.push(rect({ x: cursor, y: barY, width: seg, height: 5, fill: classColor(i), stroke: "none" }));
        }
        cursor += seg;
      }
    }
  }

  return group({
    "data-node-id": n.id,
    "data-node-kind": n.kind,
    "data-samples": n.samples !== undefined ? String(n.samples) : "",
    "data-class": n.className ?? "",
  }, parts);
}

// ─── Taxonomy-mode node rendering ────────────────────────────

function renderTaxonomyNode(ln: DTreeLayoutNode): string {
  const n = ln.node;
  const isLeaf = n.kind === "answer" || n.children.length === 0;
  const cls = isLeaf ? "lt-dtree-taxon-leaf" : "lt-dtree-taxon";

  const parts: string[] = [];
  parts.push(rect({
    x: ln.x - ln.width / 2,
    y: ln.y - ln.height / 2,
    width: ln.width,
    height: ln.height,
    rx: 8,
    ry: 8,
    class: cls,
  }));

  const lines = wrapText(n.label, 22);
  const totalH = lines.length * 14;
  let ty = ln.y - totalH / 2 + 11;
  for (const line of lines) {
    parts.push(textEl({ x: ln.x, y: ty, class: "lt-dtree-taxon-label" }, line));
    ty += 14;
  }

  return group({
    "data-node-id": n.id,
    "data-node-kind": n.kind,
    "data-leaf": isLeaf ? "true" : "false",
  }, parts);
}

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length > maxChars) { lines.push(cur); cur = w; }
    else cur = cur + " " + w;
    if (lines.length >= 1 && cur.length >= maxChars) { lines.push(cur); cur = ""; break; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

// ─── Top-level renderer ──────────────────────────────────────

export function renderDecisionTree(ast: DTreeAST, config?: RenderConfig): string {
  const t = resolveBaseTheme(config?.theme ?? "default");
  const layout = layoutDecisionTree(ast);

  const titleOffset = ast.title ? 36 : 10;
  const width = Math.ceil(layout.width);
  const height = Math.ceil(layout.height + titleOffset);

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Decision Tree"));
  children.push(desc(`Decision tree (${ast.mode} mode) with ${layout.nodes.length} nodes and ${layout.edges.length} edges`));
  children.push(el("style", {}, buildCss(t)));

  if (ast.title) {
    children.push(textEl({ x: 20, y: 24, class: "lt-dtree-title" }, ast.title));
  }

  const inner: string[] = [];

  // Edges first (back layer)
  for (const e of layout.edges) {
    const cls = e.isOptimal ? "lt-dtree-edge-optimal" : "lt-dtree-edge";
    const attrs: Record<string, string | number> = { d: e.path, class: cls, "data-edge": `${e.from}->${e.to}` };
    if (e.strokeWidth !== undefined && !e.isOptimal) attrs["stroke-width"] = e.strokeWidth;
    inner.push(pathEl(attrs));
  }

  // Edge labels — use layout.labelAnchors for accurate placement (works for all edge styles).
  const anchors = layout.labelAnchors ?? {};
  for (const e of layout.edges) {
    if (!e.label) continue;
    const a = anchors[e.to];
    if (!a) continue;

    // Decision mode: probability vs choice styling
    const isProb = ast.mode === "decision" && /^p=/i.test(e.label);
    const labelClass = isProb ? "lt-dtree-edge-prob" : "lt-dtree-edge-label";

    // For diagonal/bracket, nudge label slightly perpendicular to edge to avoid covering the line
    let lx = a.x;
    let ly = a.y;
    const absAngle = Math.abs(a.angle);
    const perpOffset = layout.edgeStyle === "diagonal" || layout.edgeStyle === "bracket" ? 9 : 0;
    if (perpOffset > 0 && absAngle > 1 && absAngle < 89) {
      // Move perpendicular to edge direction
      const rad = (a.angle * Math.PI) / 180;
      const nx = -Math.sin(rad);
      const ny = Math.cos(rad);
      // Flip so label sits "above" the edge consistently
      const flip = ny < 0 ? -1 : 1;
      lx += nx * perpOffset * flip;
      ly += ny * perpOffset * flip;
    }

    const charW = isProb ? 5.5 : 6.2;
    const w = Math.max(e.label.length * charW + 10, 18);
    const h = 14;
    inner.push(rect({
      x: lx - w / 2, y: ly - h / 2, width: w, height: h,
      class: "lt-dtree-edge-label-bg", rx: 3, ry: 3,
    }));
    inner.push(textEl({ x: lx, y: ly, class: labelClass }, e.label));
  }

  // Nodes on top
  for (const ln of layout.nodes) {
    if (ast.mode === "decision") inner.push(renderDecisionNode(ln, layout));
    else if (ast.mode === "ml") inner.push(renderMlNode(ln, ast));
    else inner.push(renderTaxonomyNode(ln));
  }

  children.push(group({ transform: `translate(0, ${titleOffset})`, "data-mode": ast.mode }, inner));

  return svgRoot({
    class: "lt-dtree",
    role: "img",
    "aria-label": escapeXml(ast.title ?? `Decision tree (${ast.mode})`),
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
  }, children);
}
