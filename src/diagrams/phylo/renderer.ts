import type { PhyloTreeAST } from "../../core/types";
import type { PhyloLayoutResult } from "./layout";
import {
  svgRoot,
  group,
  path,
  line,
  circle,
  text,
  title,
  desc,
  rect,
  el,
} from "../../core/svg";
import { cssCustomProperties, resolveBiologyTheme, FONT_SIZE, STROKE_WIDTH, type ResolvedTheme, type BiologyTokens } from "../../core/theme";

// ─── Constants ──────────────────────────────────────────────

const TIP_LABEL_GAP = 6;
const SUPPORT_THRESHOLD = 50;

function getSupportColor(value: number, t: ResolvedTheme<BiologyTokens>): string {
  if (value >= 95) return t.supportGood;
  if (value >= 75) return t.supportMedium;
  if (value >= 50) return t.supportWarn;
  return t.supportBad;
}

function isSpeciesBinomial(label: string): boolean {
  const parts = label.trim().split(/\s+/);
  if (parts.length !== 2) return false;
  return /^[A-Z][a-z]+$/.test(parts[0]) && /^[a-z]+$/.test(parts[1]);
}

// ─── CSS ────────────────────────────────────────────────────

function buildCSS(ast: PhyloTreeAST, t: ResolvedTheme<BiologyTokens>): string {
  const cladeColors = ast.clades.map((c, i) => {
    const color = c.color ?? t.cladeColors[i % t.cladeColors.length];
    return `.schematex-phylo-clade-${c.id} { stroke: ${color}; }
.schematex-phylo-clade-bg-${c.id} { fill: ${color}; fill-opacity: 0.12; }
.schematex-phylo-clade-label-${c.id} { fill: ${color}; }`;
  });

  // Dendrogram cut-cluster colours. The cluster count is layout-dependent, so
  // emit one class per palette entry keyed off the biology clade palette; the
  // layout assigns each cluster an index `cut{i}` that maps to these.
  const cutColors: string[] = [];
  if (ast.metadata?.dendrogram === "true" && ast.metadata?.cut !== undefined) {
    for (let i = 0; i < t.cladeColors.length; i++) {
      cutColors.push(
        `.schematex-phylo-clade-cut${i} { stroke: ${t.cladeColors[i % t.cladeColors.length]}; }`
      );
    }
  }

  return `
.schematex-phylo {${cssCustomProperties(t)}
  font-family: system-ui, -apple-system, sans-serif;
}
.schematex-phylo-branch { fill: none; stroke: ${t.text}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linecap: round; }
.schematex-phylo-branch-connector { fill: none; stroke: ${t.text}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-phylo-dendro-axis line { stroke: ${t.text}; stroke-width: ${STROKE_WIDTH.thin}; }
.schematex-phylo-dendro-axis text { font-size: 10px; fill: ${t.textMuted}; text-anchor: middle; }
.schematex-phylo-dendro-cut { stroke: ${t.supportBad}; stroke-width: ${STROKE_WIDTH.normal}; stroke-dasharray: 5 4; fill: none; }
.schematex-phylo-dendro-cut-label { font-size: 10px; fill: ${t.supportBad}; text-anchor: start; }
${cutColors.join("\n")}
.schematex-phylo-tip-label { font-size: ${FONT_SIZE.label}px; fill: ${t.text}; dominant-baseline: central; }
.schematex-phylo-tip-label-italic { font-style: italic; }
.schematex-phylo-support-label { font-size: ${FONT_SIZE.small}px; fill: ${t.textMuted}; text-anchor: middle; dominant-baseline: auto; }
.schematex-phylo-support-dot { stroke: none; }
.schematex-phylo-scale-bar line { stroke: ${t.text}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-phylo-scale-bar text { font-size: 10px; fill: ${t.text}; text-anchor: middle; }
.schematex-phylo-scale-tick { stroke: ${t.text}; stroke-width: ${STROKE_WIDTH.thin}; }
.schematex-phylo-title { font-size: ${FONT_SIZE.title}px; font-weight: bold; fill: ${t.text}; text-anchor: middle; }
.schematex-phylo-clade-label { font-size: 13px; font-weight: bold; }
.schematex-phylo-root-marker { fill: none; stroke: ${t.text}; stroke-width: ${STROKE_WIDTH.normal}; }
${cladeColors.join("\n")}
`.trim();
}

// ─── Scale Bar ──────────────────────────────────────────────

function computeScaleBar(
  scale: number,
  plotWidth: number
): { length: number; label: string; pxLength: number } {
  if (scale <= 0) return { length: 0.1, label: "0.1", pxLength: 50 };

  const targetPx = plotWidth * 0.2;

  const magnitudes = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  let best = magnitudes[0];
  let bestDiff = Infinity;

  for (const m of magnitudes) {
    const diff = Math.abs(m * scale - targetPx);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = m;
    }
  }

  return {
    length: best,
    label: best < 0.01 ? best.toExponential() : String(best),
    pxLength: best * scale,
  };
}

function renderScaleBar(
  layout: PhyloLayoutResult,
  t: ResolvedTheme<BiologyTokens>,
  scaleLabel?: string
): string {
  if (layout.ast.mode === "cladogram") return "";

  const plotWidth = layout.width - 40;
  const bar = computeScaleBar(layout.scale, plotWidth);
  if (bar.pxLength < 5) return "";

  const x = 20;
  const y = layout.height - 20;

  const elements = [
    line({ x1: x, y1: y, x2: x + bar.pxLength, y2: y, class: "schematex-phylo-scale-bar" }),
    line({ x1: x, y1: y - 4, x2: x, y2: y + 4, class: "schematex-phylo-scale-tick" }),
    line({ x1: x + bar.pxLength, y1: y - 4, x2: x + bar.pxLength, y2: y + 4, class: "schematex-phylo-scale-tick" }),
    text({ x: x + bar.pxLength / 2, y: y + 16, "text-anchor": "middle", class: "schematex-phylo-scale-bar" }, bar.label),
  ];

  if (scaleLabel) {
    elements.push(
      text(
        { x: x + bar.pxLength / 2, y: y + 28, "text-anchor": "middle", "font-size": "9", fill: t.textMuted },
        scaleLabel
      )
    );
  }

  return group({ class: "schematex-phylo-scale-bar" }, elements);
}

// ─── Clade Backgrounds ──────────────────────────────────────

function renderCladeBackgrounds(layout: PhyloLayoutResult, t: ResolvedTheme<BiologyTokens>): string[] {
  const elements: string[] = [];

  for (let ci = 0; ci < layout.ast.clades.length; ci++) {
    const clade = layout.ast.clades[ci];
    const hl = clade.highlight ?? "branch";
    if (hl === "branch") continue;

    const memberNodes = layout.nodes.filter(
      (n) => n.node.isLeaf && clade.members.includes(n.node.id)
    );
    if (memberNodes.length === 0) continue;

    const minY = Math.min(...memberNodes.map((n) => n.y)) - 10;
    const maxY = Math.max(...memberNodes.map((n) => n.y)) + 10;
    const minX = Math.min(...memberNodes.map((n) => n.x)) - 20;
    const maxX = Math.max(...memberNodes.map((n) => {
      const labelW = ((n.node.label ?? n.node.id).length * 7.2) + TIP_LABEL_GAP + 8;
      return n.x + labelW;
    }));

    const color = clade.color ?? t.cladeColors[ci % t.cladeColors.length];

    elements.push(
      rect({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        rx: 4,
        class: `schematex-phylo-clade-bg schematex-phylo-clade-bg-${clade.id}`,
        fill: color,
        "fill-opacity": 0.12,
      })
    );

    if (clade.label) {
      elements.push(
        text(
          {
            x: maxX + 4,
            y: (minY + maxY) / 2,
            class: `schematex-phylo-clade-label schematex-phylo-clade-label-${clade.id}`,
            fill: color,
            "font-weight": "bold",
            "font-size": "13",
            "dominant-baseline": "central",
          },
          clade.label
        )
      );
    }
  }

  return elements;
}

// ─── Dendrogram Height Axis + Cut Line ──────────────────────

/** "Nice" step for the height axis so ticks land on round numbers. */
function niceStep(maxHeight: number, targetTicks: number): number {
  if (maxHeight <= 0) return 1;
  const rough = maxHeight / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let step: number;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
}

function formatTick(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) < 0.01) return value.toExponential(0);
  return String(Math.round(value * 1000) / 1000);
}

function renderDendrogramAxis(
  layout: PhyloLayoutResult,
  t: ResolvedTheme<BiologyTokens>
): string {
  const d = layout.dendrogram;
  if (!d) return "";

  const axisY = layout.height - 28;
  const elements: string[] = [];

  // Axis baseline from root (left, max height) to tips (right, height 0).
  elements.push(
    line({ x1: d.plotLeftX, y1: axisY, x2: d.baselineX, y2: axisY })
  );

  const step = niceStep(d.maxHeight, 5);
  for (let h = 0; h <= d.maxHeight + step * 0.001; h += step) {
    const x = d.baselineX - h * d.scale;
    elements.push(line({ x1: x, y1: axisY, x2: x, y2: axisY + 4 }));
    elements.push(
      text({ x, y: axisY + 16, "text-anchor": "middle" }, formatTick(h))
    );
  }

  if (layout.ast.scaleLabel) {
    elements.push(
      text(
        {
          x: (d.plotLeftX + d.baselineX) / 2,
          y: axisY + 28,
          "text-anchor": "middle",
          "font-size": "9",
          fill: t.textMuted,
        },
        layout.ast.scaleLabel
      )
    );
  }

  return group({ class: "schematex-phylo-dendro-axis" }, elements);
}

function renderCutLine(layout: PhyloLayoutResult): string {
  const d = layout.dendrogram;
  if (!d || d.cut === undefined) return "";

  const x = d.baselineX - d.cut * d.scale;
  const topY = 8;
  const bottomY = layout.height - 32;

  return group({}, [
    line({
      x1: x,
      y1: topY,
      x2: x,
      y2: bottomY,
      class: "schematex-phylo-dendro-cut",
    }),
    text(
      { x: x + 4, y: topY + 4, class: "schematex-phylo-dendro-cut-label" },
      `cut = ${formatTick(d.cut)}`
    ),
  ]);
}

// ─── Main Renderer ──────────────────────────────────────────

export function renderPhylo(layout: PhyloLayoutResult): string {
  const { ast, nodes, branches } = layout;
  const t = resolveBiologyTheme(ast.metadata?.theme ?? "default");

  const css = buildCSS(ast, t);

  const titleOffset = ast.title ? 30 : 0;
  const totalHeight = layout.height + titleOffset;
  const totalWidth = layout.width;

  // Build layers
  const branchElements: string[] = [];
  const nodeElements: string[] = [];
  const labelElements: string[] = [];

  // Branches
  for (const branch of branches) {
    const cladeIdx = branch.cladeId
      ? ast.clades.findIndex((c) => c.id === branch.cladeId)
      : -1;
    const cladeColor =
      cladeIdx >= 0
        ? ast.clades[cladeIdx].color ?? t.cladeColors[cladeIdx % t.cladeColors.length]
        : undefined;

    const cls = branch.isConnector
      ? "schematex-phylo-branch schematex-phylo-branch-connector"
      : `schematex-phylo-branch schematex-phylo-branch-internal${branch.cladeId ? ` schematex-phylo-clade-${branch.cladeId}` : ""}`;

    const attrs: Record<string, string | number | undefined> = {
      d: branch.path,
      class: cls,
    };
    if (cladeColor && !branch.isConnector) {
      attrs.stroke = cladeColor;
    }

    branchElements.push(path(attrs));
  }

  // Nodes (support dots + root marker + tip labels)
  const rootLayout = nodes.find((n) => n.node === ast.root);

  // Root marker
  if (rootLayout && !ast.unrooted) {
    nodeElements.push(
      circle({
        cx: rootLayout.x,
        cy: rootLayout.y,
        r: 5,
        class: "schematex-phylo-root-marker",
      })
    );
  }

  for (const layoutNode of nodes) {
    const { node, x, y } = layoutNode;

    // Support dots / labels for internal nodes
    if (!node.isLeaf && node.support !== undefined) {
      const support = node.support > 1 ? node.support : node.support * 100;
      if (support >= SUPPORT_THRESHOLD) {
        const color = getSupportColor(support, t);
        nodeElements.push(
          circle({
            cx: x,
            cy: y,
            r: 4,
            class: "schematex-phylo-support-dot",
            fill: color,
          })
        );
        labelElements.push(
          text(
            { x, y: y - 8, class: "schematex-phylo-support-label" },
            String(Math.round(support))
          )
        );
      }
    }

    // Tip labels
    if (node.isLeaf) {
      const label = node.label ?? node.id;
      const italic = isSpeciesBinomial(label);
      const cls = `schematex-phylo-tip-label${italic ? " schematex-phylo-tip-label-italic" : ""}`;

      labelElements.push(
        text(
          {
            x: x + TIP_LABEL_GAP,
            y,
            class: cls,
            "font-style": italic ? "italic" : undefined,
            "data-taxon-id": node.id,
          },
          label
        )
      );
    }
  }

  // Clade backgrounds
  const cladeBgElements = renderCladeBackgrounds(layout, t);

  // Scale bar (phylogram/chronogram) OR dendrogram height axis + cut line.
  const isDendro = layout.dendrogram !== undefined;
  const scaleBarEl = isDendro ? "" : renderScaleBar(layout, t, ast.scaleLabel);
  const dendroAxisEl = isDendro ? renderDendrogramAxis(layout, t) : "";
  const cutLineEl = isDendro ? renderCutLine(layout) : "";

  // Title
  const titleEl = ast.title
    ? text(
        { x: totalWidth / 2, y: 20, class: "schematex-phylo-title" },
        ast.title
      )
    : "";

  // Assemble
  const leafCount = nodes.filter((n) => n.node.isLeaf).length;
  const isDendrogramMode = layout.dendrogram !== undefined;
  const descMode = isDendrogramMode ? "dendrogram" : ast.mode;
  const descTitle = isDendrogramMode ? "Dendrogram" : "Phylogenetic Tree";
  const cutSuffix =
    isDendrogramMode && layout.dendrogram?.cut !== undefined
      ? `, cut at ${layout.dendrogram.cut} into ${layout.dendrogram.clusterCount} clusters`
      : "";
  const svgContent = [
    title(`${descTitle}${ast.title ? `: ${ast.title}` : ""}`),
    desc(
      `${isDendrogramMode ? "Dendrogram" : "Phylogenetic tree"} with ${leafCount} taxa, ${descMode} mode, ${ast.layout} layout${cutSuffix}`
    ),
    el("style", {}, css),
  ];

  if (titleEl) svgContent.push(titleEl);

  const transformY = titleOffset;

  if (cladeBgElements.length > 0) {
    svgContent.push(
      group(
        { class: "schematex-phylo-clade-highlights", transform: transformY ? `translate(0,${transformY})` : undefined },
        cladeBgElements
      )
    );
  }

  svgContent.push(
    group(
      { class: "schematex-phylo-branches", transform: transformY ? `translate(0,${transformY})` : undefined },
      branchElements
    )
  );

  svgContent.push(
    group(
      { class: "schematex-phylo-nodes", transform: transformY ? `translate(0,${transformY})` : undefined },
      nodeElements
    )
  );

  svgContent.push(
    group(
      { class: "schematex-phylo-labels", transform: transformY ? `translate(0,${transformY})` : undefined },
      labelElements
    )
  );

  if (scaleBarEl) {
    svgContent.push(
      group(
        { transform: transformY ? `translate(0,${transformY})` : undefined },
        [scaleBarEl]
      )
    );
  }

  if (dendroAxisEl) {
    svgContent.push(
      group(
        { transform: transformY ? `translate(0,${transformY})` : undefined },
        [dendroAxisEl]
      )
    );
  }

  if (cutLineEl) {
    svgContent.push(
      group(
        { transform: transformY ? `translate(0,${transformY})` : undefined },
        [cutLineEl]
      )
    );
  }

  return svgRoot(
    {
      class: "schematex-diagram schematex-phylo",
      viewBox: `0 0 ${totalWidth} ${totalHeight}`,
      width: totalWidth,
      height: totalHeight,
    },
    svgContent
  );
}
