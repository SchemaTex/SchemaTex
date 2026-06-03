/**
 * Event Tree renderer — LayoutResult → semantic SVG.
 * Per docs/reference/39-EVENT-TREE-STANDARD.md §"Visual conventions".
 *
 * Matches the canonical Wikimedia textbook image: header band across the top,
 * IE stub on the far left, success-up / failure-down orthogonal step forks,
 * dashed column gridlines, pruned paths flat to their leaf, and each leaf's
 * Outcome name + computed path Frequency on the right. In `monochrome` this is
 * pure black-on-white (the textbook look); in `default` the body stays neutral
 * and the reserved-red accent marks ONLY the computed dominant (worst-case)
 * sequence — the ETA analogue of pert's critical path.
 *
 * Hard rules: no inline styles (classes from tokens), <title>/<desc>, data-*,
 * svg.ts builder only.
 */

import type { RenderConfig } from "../../core/types";
import {
  el,
  group,
  line as svgLine,
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
  resolveReliabilityTheme,
} from "../../core/theme";
import { parseEventTree } from "./parser";
import { layoutEventTree, EVENTTREE_CONST as C } from "./layout";
import type { EventTreeLayoutResult } from "./types";

export function renderEventTree(text: string, config?: RenderConfig): string {
  const ast = parseEventTree(text);
  const layout = layoutEventTree(ast);
  return renderEventTreeLayout(layout, config);
}

export function renderEventTreeLayout(layout: EventTreeLayoutResult, config?: RenderConfig): string {
  const theme = resolveReliabilityTheme(config?.theme ?? "default");
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast } = layout;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? "Event tree";

  const styleBlock = el(
    "style",
    {},
    `
.sx-et-bg { fill: ${theme.bg}; }
.sx-et-title { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
.sx-et-header { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.label}px; font-weight: 700; }
.sx-et-grid { fill: none; stroke: ${theme.edgeStroke}; stroke-width: ${STROKE_WIDTH.thin}; stroke-dasharray: 4 4; opacity: 0.5; }
.sx-et-headrule { fill: none; stroke: ${theme.eventStroke}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-et-ie { fill: none; stroke: ${theme.topEventStroke}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-et-ie-label { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 700; }
.sx-et-ie-freq { fill: ${theme.probText}; font-size: ${FONT_SIZE.small}px; font-weight: 600; }
.sx-et-edge { fill: none; stroke: ${theme.edgeStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-et-edge[data-leg="s"] {}
.sx-et-leg-label { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.small}px; }
.sx-et-leg-prob { fill: ${theme.probText}; font-size: ${FONT_SIZE.small}px; }
.sx-et-outcome { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.label}px; font-weight: 600; }
.sx-et-freq { fill: ${theme.probText}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 600; }
.sx-et-seqid { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.small}px; opacity: 0.7; }
.sx-et-dot { fill: ${theme.basicStroke}; stroke: none; }
.sx-et-edge[data-dominant="true"] { stroke: ${theme.cutsetStroke}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-et-outcome[data-dominant="true"] { fill: ${theme.spofStroke}; }
.sx-et-freq[data-dominant="true"] { fill: ${theme.spofStroke}; font-weight: 700; }
.sx-et-dot[data-dominant="true"] { fill: ${theme.spofStroke}; }
`.trim()
  );

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    rect({ x: 0, y: 0, width, height, class: "sx-et-bg" }),
  ];

  const inner: string[] = [];

  // ── Title ──
  if (ast.title) {
    inner.push(svgText({ x: C.CANVAS_PAD, y: C.CANVAS_PAD + 4, class: "sx-et-title", "font-family": fontFamily }, ast.title));
  }

  // ── Header band (text + a thin rule beneath) ──
  for (const h of layout.headers) {
    inner.push(
      svgText(
        { x: h.cx, y: layout.headerY, class: "sx-et-header", "text-anchor": "middle", "data-col": h.kind },
        h.label
      )
    );
  }
  inner.push(svgLine({ x1: C.IE_LEFT, y1: layout.bodyTopY - 6, x2: width - pad * 2 - C.CANVAS_PAD, y2: layout.bodyTopY - 6, class: "sx-et-headrule" }));

  // ── Dashed column gridlines ──
  for (const g of layout.gridLines) {
    inner.push(svgLine({ x1: g.x, y1: g.y1, x2: g.x, y2: g.y2, class: "sx-et-grid" }));
  }

  // ── Initiating-event stub (far left, bold horizontal) ──
  const ie = layout.initiating;
  inner.push(
    group({ class: "sx-et-ie-g", "data-id": ast.initiating.id }, [
      svgLine({ x1: ie.x1, y1: ie.y, x2: ie.x2, y2: ie.y, class: "sx-et-ie" }),
      svgText({ x: ie.labelX, y: ie.labelY, class: "sx-et-ie-label" }, ast.initiating.label ?? ast.initiating.id),
      svgText({ x: ie.labelX, y: ie.freqY, class: "sx-et-ie-freq" }, `f₀ = ${fmtFreq(ast.initiating.freq)}`),
    ])
  );

  // ── Fork edges + branch labels ──
  for (const f of layout.forks) {
    const isLeaf = f.functionId === "__leaf__";
    inner.push(
      svgPath({
        d: f.path,
        class: "sx-et-edge",
        "data-leg": f.leg,
        "data-fn": f.functionId,
        ...(f.tag ? { "data-tag": f.tag } : {}),
      })
    );
    if (!isLeaf && f.tag) {
      // Branch label: "Success (1s)" style is verbose; the reference also uses a
      // bare leg-tag + probability. Show the tag above, probability below.
      inner.push(
        svgText(
          { x: f.labelX, y: f.labelY, class: "sx-et-leg-label", "text-anchor": "middle" },
          `${f.leg === "s" ? "Success" : "Failure"} (${f.tag})`
        )
      );
      inner.push(
        svgText(
          { x: f.labelX, y: f.labelY + 11, class: "sx-et-leg-prob", "text-anchor": "middle" },
          fmtProb(f.prob)
        )
      );
    }
  }

  // ── Leaves: terminal dot + outcome name + frequency ──
  for (const leaf of layout.leaves) {
    const dom = leaf.dominant ? { "data-dominant": "true" } : {};
    const seq = leaf.sequence;
    inner.push(
      group(
        {
          class: "sx-et-leaf-g",
          "data-seq": String(seq.index + 1),
          "data-outcome": seq.outcome,
          "data-frequency": dataNum(seq.frequency),
          ...(seq.designator ? { "data-designator": seq.designator } : {}),
          ...(leaf.dominant ? { "data-dominant": "true" } : {}),
        },
        [
          el("circle", { cx: leaf.x, cy: leaf.y, r: 3, class: "sx-et-dot", ...dom }),
          svgText(
            { x: leaf.x + 10, y: leaf.y - 4, class: "sx-et-outcome", ...dom },
            clip(seq.outcome, 30)
          ),
          svgText(
            { x: leaf.x + 10, y: leaf.y + C.LEAF_LINE_H - 2, class: "sx-et-freq", ...dom },
            `${fmtFreq(seq.frequency)}${seq.designator ? `  ·  ${seq.designator}` : ""}`
          ),
        ]
      )
    );
  }

  children.push(
    group({ transform: pad ? `translate(${pad}, ${pad})` : undefined, "font-family": fontFamily }, inner)
  );

  return svgRoot(
    {
      width, height, viewBox: `0 0 ${width} ${height}`,
      role: "img", "aria-label": a11y, "data-diagram-type": "eventtree",
    },
    children
  );
}

// ─── <desc> summary ───────────────────────────────────────────

function summarise(layout: EventTreeLayoutResult): string {
  const { ast, analysis } = layout;
  const parts: string[] = [
    `Event tree for "${ast.initiating.label ?? ast.initiating.id}" ` +
      `(f₀ = ${fmtFreq(ast.initiating.freq)}): ${ast.functions.length} function${ast.functions.length === 1 ? "" : "s"}, ` +
      `${analysis.sequences.length} sequence${analysis.sequences.length === 1 ? "" : "s"}.`,
  ];
  for (const ot of analysis.outcomeTotals) {
    parts.push(`${ot.outcome}: ${fmtFreq(ot.total)}${ot.count > 1 ? ` (Σ of ${ot.count} sequences)` : ""}.`);
  }
  const dom = analysis.sequences.filter((s) => s.dominant);
  if (dom.length > 0 && analysis.dominantFrequency > 0) {
    parts.push(
      `Dominant sequence: ${dom.map((s) => `"${s.outcome}"${s.designator ? ` [${s.designator}]` : ""}`).join(", ")} ` +
        `at ${fmtFreq(analysis.dominantFrequency)}.`
    );
  }
  for (const n of analysis.notes) parts.push(n);
  for (const w of ast.warnings) parts.push(w);
  return parts.join(" ");
}

// ─── Helpers ──────────────────────────────────────────────────

/** Machine-readable value for data-* — strips binary-float noise (1.0000…1e-7 → 1e-7). */
function dataNum(n: number): string {
  if (n === 0) return "0";
  return String(parseFloat(n.toPrecision(12)));
}

function fmtFreq(n: number): string {
  if (n === 0) return "0";
  if (n >= 1e-3 && n < 1e6) return String(parseFloat(n.toPrecision(4)));
  return n.toExponential(3);
}

function fmtProb(n: number): string {
  if (n === 0) return "0";
  if (n === 1) return "1";
  if (n >= 0.001) return String(parseFloat(n.toPrecision(3)));
  return n.toExponential(2);
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
