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

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_BRANCH_COLOR = "#333";
const DEFAULT_BRANCH_WIDTH = 1.5;
const TIP_LABEL_GAP = 6;
const SUPPORT_THRESHOLD = 50;

const SUPPORT_COLORS: { min: number; color: string }[] = [
  { min: 95, color: "#43A047" },
  { min: 75, color: "#FDD835" },
  { min: 50, color: "#FB8C00" },
  { min: 0, color: "#E53935" },
];

const CLADE_PALETTE = [
  "#1E88E5",
  "#E53935",
  "#43A047",
  "#8E24AA",
  "#FB8C00",
  "#00897B",
  "#D81B60",
  "#3949AB",
];

function getSupportColor(value: number): string {
  for (const entry of SUPPORT_COLORS) {
    if (value >= entry.min) return entry.color;
  }
  return "#E53935";
}

function isSpeciesBinomial(label: string): boolean {
  const parts = label.trim().split(/\s+/);
  if (parts.length !== 2) return false;
  return /^[A-Z][a-z]+$/.test(parts[0]) && /^[a-z]+$/.test(parts[1]);
}

// ─── CSS ────────────────────────────────────────────────────

function buildCSS(ast: PhyloTreeAST): string {
  const cladeColors = ast.clades.map((c, i) => {
    const color = c.color ?? CLADE_PALETTE[i % CLADE_PALETTE.length];
    return `.lineage-clade-${c.id} { stroke: ${color}; }
.lineage-clade-bg-${c.id} { fill: ${color}; fill-opacity: 0.12; }
.lineage-clade-label-${c.id} { fill: ${color}; }`;
  });

  return `
.lineage-phylo { font-family: system-ui, -apple-system, sans-serif; }
.lineage-branch { fill: none; stroke: ${DEFAULT_BRANCH_COLOR}; stroke-width: ${DEFAULT_BRANCH_WIDTH}; stroke-linecap: round; }
.lineage-branch-connector { fill: none; stroke: ${DEFAULT_BRANCH_COLOR}; stroke-width: ${DEFAULT_BRANCH_WIDTH}; }
.lineage-tip-label { font-size: 12px; fill: #333; dominant-baseline: central; }
.lineage-tip-label-italic { font-style: italic; }
.lineage-support-label { font-size: 9px; fill: #666; text-anchor: middle; dominant-baseline: auto; }
.lineage-support-dot { stroke: none; }
.lineage-scale-bar line { stroke: #333; stroke-width: 1.5; }
.lineage-scale-bar text { font-size: 10px; fill: #333; text-anchor: middle; }
.lineage-scale-tick { stroke: #333; stroke-width: 1; }
.lineage-title { font-size: 16px; font-weight: bold; fill: #333; text-anchor: middle; }
.lineage-clade-label { font-size: 13px; font-weight: bold; }
.lineage-root-marker { fill: none; stroke: #333; stroke-width: 1.5; }
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
  scaleLabel?: string
): string {
  if (layout.ast.mode === "cladogram") return "";

  const plotWidth = layout.width - 40;
  const bar = computeScaleBar(layout.scale, plotWidth);
  if (bar.pxLength < 5) return "";

  const x = 20;
  const y = layout.height - 20;

  const elements = [
    line({ x1: x, y1: y, x2: x + bar.pxLength, y2: y, class: "lineage-scale-bar" }),
    line({ x1: x, y1: y - 4, x2: x, y2: y + 4, class: "lineage-scale-tick" }),
    line({ x1: x + bar.pxLength, y1: y - 4, x2: x + bar.pxLength, y2: y + 4, class: "lineage-scale-tick" }),
    text({ x: x + bar.pxLength / 2, y: y + 16, "text-anchor": "middle", class: "lineage-scale-bar" }, bar.label),
  ];

  if (scaleLabel) {
    elements.push(
      text(
        { x: x + bar.pxLength / 2, y: y + 28, "text-anchor": "middle", "font-size": "9", fill: "#666" },
        scaleLabel
      )
    );
  }

  return group({ class: "lineage-scale-bar" }, elements);
}

// ─── Clade Backgrounds ──────────────────────────────────────

function renderCladeBackgrounds(layout: PhyloLayoutResult): string[] {
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

    const color = clade.color ?? CLADE_PALETTE[ci % CLADE_PALETTE.length];

    elements.push(
      rect({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        rx: 4,
        class: `lineage-clade-bg lineage-clade-bg-${clade.id}`,
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
            class: `lineage-clade-label lineage-clade-label-${clade.id}`,
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

// ─── Main Renderer ──────────────────────────────────────────

export function renderPhylo(layout: PhyloLayoutResult): string {
  const { ast, nodes, branches } = layout;

  const css = buildCSS(ast);

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
        ? ast.clades[cladeIdx].color ?? CLADE_PALETTE[cladeIdx % CLADE_PALETTE.length]
        : undefined;

    const cls = branch.isConnector
      ? "lineage-branch lineage-branch-connector"
      : `lineage-branch lineage-branch-internal${branch.cladeId ? ` lineage-clade-${branch.cladeId}` : ""}`;

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
        class: "lineage-root-marker",
      })
    );
  }

  for (const layoutNode of nodes) {
    const { node, x, y } = layoutNode;

    // Support dots / labels for internal nodes
    if (!node.isLeaf && node.support !== undefined) {
      const support = node.support > 1 ? node.support : node.support * 100;
      if (support >= SUPPORT_THRESHOLD) {
        const color = getSupportColor(support);
        nodeElements.push(
          circle({
            cx: x,
            cy: y,
            r: 4,
            class: "lineage-support-dot",
            fill: color,
          })
        );
        labelElements.push(
          text(
            { x, y: y - 8, class: "lineage-support-label" },
            String(Math.round(support))
          )
        );
      }
    }

    // Tip labels
    if (node.isLeaf) {
      const label = node.label ?? node.id;
      const italic = isSpeciesBinomial(label);
      const cls = `lineage-tip-label${italic ? " lineage-tip-label-italic" : ""}`;

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
  const cladeBgElements = renderCladeBackgrounds(layout);

  // Scale bar
  const scaleBarEl = renderScaleBar(layout, ast.scaleLabel);

  // Title
  const titleEl = ast.title
    ? text(
        { x: totalWidth / 2, y: 20, class: "lineage-title" },
        ast.title
      )
    : "";

  // Assemble
  const leafCount = nodes.filter((n) => n.node.isLeaf).length;
  const svgContent = [
    title(`Phylogenetic Tree${ast.title ? `: ${ast.title}` : ""}`),
    desc(`Phylogenetic tree with ${leafCount} taxa, ${ast.mode} mode, ${ast.layout} layout`),
    el("style", {}, css),
  ];

  if (titleEl) svgContent.push(titleEl);

  const transformY = titleOffset;

  if (cladeBgElements.length > 0) {
    svgContent.push(
      group(
        { class: "lineage-clade-highlights", transform: transformY ? `translate(0,${transformY})` : undefined },
        cladeBgElements
      )
    );
  }

  svgContent.push(
    group(
      { class: "lineage-branches", transform: transformY ? `translate(0,${transformY})` : undefined },
      branchElements
    )
  );

  svgContent.push(
    group(
      { class: "lineage-nodes", transform: transformY ? `translate(0,${transformY})` : undefined },
      nodeElements
    )
  );

  svgContent.push(
    group(
      { class: "lineage-labels", transform: transformY ? `translate(0,${transformY})` : undefined },
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

  return svgRoot(
    {
      class: "lineage-diagram lineage-phylo",
      viewBox: `0 0 ${totalWidth} ${totalHeight}`,
      width: totalWidth,
      height: totalHeight,
    },
    svgContent
  );
}
