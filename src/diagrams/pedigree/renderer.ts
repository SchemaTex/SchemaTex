import type {
  LayoutResult,
  LayoutNode,
  LayoutEdge,
  RenderConfig,
  Individual,
  LegendEntry,
  DiagramAST,
} from "../../core/types";
import {
  svgRoot,
  el,
  group,
  rect,
  circle,
  polygon,
  line,
  text,
  title,
  desc,
  defs,
  path,
} from "../../core/svg";

// ─── Public API ─────────────────────────────────────────────

export function renderPedigree(
  layout: LayoutResult,
  config: RenderConfig,
  ast?: DiagramAST
): string {
  const defsStr = buildDefs(layout.nodes);
  const styleStr = buildStyles(config);

  const genGroups = groupByGeneration(layout.nodes);
  const edgeLayers = renderEdges(layout.edges);
  const nodeLayers = renderNodes(genGroups);
  const labelLayer = renderLabels(layout.nodes, genGroups, config);
  const genLabels = renderGenerationLabels(genGroups, config);

  const nodeCount = layout.nodes.length;
  const genCount = genGroups.size;

  const diagramTitle = ast?.metadata?.title ?? "Pedigree";

  const children = [
    title(diagramTitle),
    desc(`Pedigree chart with ${nodeCount} individuals across ${genCount} generations`),
    defsStr,
    styleStr,
    genLabels,
    edgeLayers,
    ...nodeLayers,
    labelLayer,
  ];

  if (ast?.legend && ast.legend.length > 0) {
    children.push(renderLegend(ast.legend, layout, config));
  }

  return svgRoot(
    {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "lineage-diagram lineage-pedigree",
      width: layout.width,
      height: layout.height,
    },
    children
  );
}

// ─── Defs ──────────────────────────────────────────────────

function buildDefs(nodes: LayoutNode[]): string {
  const children: string[] = [];
  const needs = new Set<string>();

  for (const n of nodes) {
    const gs = n.individual.geneticStatus;
    if (gs) needs.add(gs);
  }

  if (needs.has("carrier")) {
    children.push(
      el("clipPath", { id: "lineage-clip-carrier-rect" }, [
        rect({ x: "0", y: "0", width: "50%", height: "100%" }),
      ]),
      el("clipPath", { id: "lineage-clip-carrier-circle" }, [
        rect({ x: "-50", y: "-50", width: "50", height: "100" }),
      ])
    );
  }

  // Proband arrow marker
  children.push(
    el("marker", {
      id: "lineage-proband-arrow",
      viewBox: "0 0 10 10",
      refX: "0",
      refY: "5",
      markerWidth: "8",
      markerHeight: "8",
      orient: "auto-start-reverse",
    }, [
      path({ d: "M 0 0 L 10 5 L 0 10 z", fill: "#333" }),
    ])
  );

  return defs(children);
}

// ─── Styles ────────────────────────────────────────────────

function buildStyles(config: RenderConfig): string {
  const css = `
.lineage-shape { fill: white; stroke: #333; stroke-width: 2; }
.lineage-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize}px; text-anchor: middle; fill: #333; }
.lineage-gen-label { font-family: ${config.fontFamily}; font-size: 14px; font-weight: bold; fill: #333; text-anchor: middle; }
.lineage-edge { stroke: #333; stroke-width: 2; fill: none; }
.lineage-deceased-mark { stroke: #333; stroke-width: 2; }
.lineage-affected-fill { fill: #333; }
.lineage-carrier-fill { fill: #333; }
.lineage-carrier-x-dot { fill: #333; }
.lineage-presymptomatic-mark { stroke: #333; stroke-width: 2; }
.lineage-proband-arrow-line { stroke: #333; stroke-width: 2; fill: none; marker-end: url(#lineage-proband-arrow); }
.lineage-proband-label { font-family: ${config.fontFamily}; font-size: 10px; font-weight: bold; fill: #333; }
.lineage-legend { font-family: ${config.fontFamily}; font-size: 11px; fill: #333; }
.lineage-legend-box { fill: white; stroke: #999; stroke-width: 1; }
`;
  return el("style", {}, css);
}

// ─── Edges ─────────────────────────────────────────────────

function renderEdges(edges: LayoutEdge[]): string {
  const children: string[] = [];

  for (const edge of edges) {
    const relType = edge.relationship.type;
    const cssClass = `lineage-edge lineage-edge-${relType}`;

    const elements: string[] = [
      el("path", { d: edge.path, class: "lineage-edge-path" }),
    ];

    if (relType === "separated") {
      const mid = pathMidpoint(edge.path);
      if (mid) {
        elements.push(
          line({
            x1: mid.x - 4, y1: mid.y - 6,
            x2: mid.x + 4, y2: mid.y + 6,
            stroke: "#333", "stroke-width": "2",
          })
        );
      }
    }

    children.push(
      group({ class: cssClass, "data-from": edge.from, "data-to": edge.to }, elements)
    );
  }

  return group({ class: "lineage-edges" }, children);
}

function pathMidpoint(pathData: string): { x: number; y: number } | null {
  const coords = pathData.match(/[\d.-]+/g);
  if (!coords || coords.length < 4) return null;
  return {
    x: (parseFloat(coords[0]) + parseFloat(coords[2])) / 2,
    y: (parseFloat(coords[1]) + parseFloat(coords[3])) / 2,
  };
}

// ─── Nodes ─────────────────────────────────────────────────

function groupByGeneration(nodes: LayoutNode[]): Map<number, LayoutNode[]> {
  const groups = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const grp = groups.get(node.generation) ?? [];
    grp.push(node);
    groups.set(node.generation, grp);
  }
  return groups;
}

function renderNodes(genGroups: Map<number, LayoutNode[]>): string[] {
  const layers: string[] = [];
  const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);

  for (const genIdx of sortedGens) {
    const nodes = genGroups.get(genIdx) ?? [];
    const nodeElements: string[] = [];

    for (const node of nodes) {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      nodeElements.push(renderPedigreeSymbol(node.individual, cx, cy, node.width));
    }

    layers.push(
      group(
        { class: `lineage-generation lineage-generation-${genIdx}`, "data-generation": genIdx },
        nodeElements
      )
    );
  }

  return layers;
}

function renderPedigreeSymbol(
  ind: Individual,
  x: number,
  y: number,
  size: number
): string {
  const half = size / 2;
  const classes = ["lineage-node", `lineage-${ind.sex === "other" ? "unknown" : ind.sex}`];
  if (ind.status === "deceased") classes.push("lineage-deceased");
  if (ind.geneticStatus) classes.push(`lineage-${ind.geneticStatus}`);

  const titleText = formatTitle(ind);
  const children: string[] = [title(titleText)];

  // Base shape
  children.push(baseShape(ind.sex, half));

  // Genetic status fills
  const gs = ind.geneticStatus;
  if (gs === "affected") {
    children.push(affectedFill(ind.sex, half));
  } else if (gs === "carrier") {
    children.push(carrierFill(ind.sex, half));
  } else if (gs === "carrier-x" || gs === "obligate-carrier") {
    children.push(carrierDot(half));
  }

  // Presymptomatic vertical line
  if (gs === "presymptomatic") {
    children.push(
      line({ x1: 0, y1: -half, x2: 0, y2: half, class: "lineage-presymptomatic-mark" })
    );
  }

  // Deceased: diagonal slash (pedigree uses / not X)
  if (ind.status === "deceased") {
    const ext = ind.sex === "female" ? half * 0.707 : half;
    children.push(
      line({ x1: ext, y1: -ext, x2: -ext, y2: ext, class: "lineage-deceased-mark" })
    );
  }

  // Proband arrow
  if (ind.markers?.includes("proband")) {
    const arrowLen = 20;
    children.push(
      line({
        x1: -half - arrowLen, y1: half + arrowLen,
        x2: -half - 2, y2: half + 2,
        class: "lineage-proband-arrow-line",
      }),
      text(
        { x: -half - arrowLen - 4, y: half + arrowLen + 4, class: "lineage-proband-label", "text-anchor": "end" },
        "P"
      )
    );
  }

  // Consultand arrow
  if (ind.markers?.includes("consultand")) {
    const arrowLen = 20;
    children.push(
      line({
        x1: -half - arrowLen, y1: half + arrowLen,
        x2: -half - 2, y2: half + 2,
        class: "lineage-proband-arrow-line",
      }),
      text(
        { x: -half - arrowLen - 4, y: half + arrowLen + 4, class: "lineage-proband-label", "text-anchor": "end" },
        "C"
      )
    );
  }

  // Evaluated marker
  if (ind.markers?.includes("evaluated")) {
    children.push(
      text(
        { x: 0, y: -half - 4, class: "lineage-proband-label", "text-anchor": "middle" },
        "E"
      )
    );
  }

  return group(
    {
      class: classes.join(" "),
      "data-individual-id": ind.id,
      transform: `translate(${x}, ${y})`,
    },
    children
  );
}

function baseShape(sex: Individual["sex"], half: number): string {
  switch (sex) {
    case "male":
      return rect({ x: -half, y: -half, width: half * 2, height: half * 2, class: "lineage-shape" });
    case "female":
      return circle({ cx: 0, cy: 0, r: half, class: "lineage-shape" });
    default:
      return polygon({ points: `0,${-half} ${half},0 0,${half} ${-half},0`, class: "lineage-shape" });
  }
}

function affectedFill(sex: Individual["sex"], half: number): string {
  const attrs = { class: "lineage-affected-fill" };
  switch (sex) {
    case "male":
      return rect({ x: -half, y: -half, width: half * 2, height: half * 2, ...attrs });
    case "female":
      return circle({ cx: 0, cy: 0, r: half, ...attrs });
    default:
      return polygon({ points: `0,${-half} ${half},0 0,${half} ${-half},0`, ...attrs });
  }
}

function carrierFill(sex: Individual["sex"], half: number): string {
  const clipSuffix = sex === "female" ? "circle" : "rect";
  const attrs = {
    class: "lineage-carrier-fill",
    "clip-path": `url(#lineage-clip-carrier-${clipSuffix})`,
  };
  switch (sex) {
    case "male":
      return rect({ x: -half, y: -half, width: half * 2, height: half * 2, ...attrs });
    case "female":
      return circle({ cx: 0, cy: 0, r: half, ...attrs });
    default:
      return polygon({ points: `0,${-half} ${half},0 0,${half} ${-half},0`, ...attrs });
  }
}

function carrierDot(half: number): string {
  return circle({ cx: 0, cy: 0, r: half * 0.15, class: "lineage-carrier-x-dot" });
}

function formatTitle(ind: Individual): string {
  const name = ind.label.charAt(0).toUpperCase() + ind.label.slice(1);
  if (ind.geneticStatus && ind.geneticStatus !== "unaffected") {
    return `${name} (${ind.geneticStatus})`;
  }
  return name;
}

// ─── Labels ────────────────────────────────────────────────

function renderLabels(
  nodes: LayoutNode[],
  genGroups: Map<number, LayoutNode[]>,
  config: RenderConfig
): string {
  const labels: string[] = [];

  // Build per-generation numbering
  const genNumbering = new Map<string, string>();
  const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);
  for (const genIdx of sortedGens) {
    const genNodes = genGroups.get(genIdx) ?? [];
    const sorted = [...genNodes].sort((a, b) => a.x - b.x);
    const romanNum = toRoman(genIdx + 1);
    for (let i = 0; i < sorted.length; i++) {
      genNumbering.set(sorted[i].id, `${romanNum}-${i + 1}`);
    }
  }

  for (const node of nodes) {
    const ind = node.individual;
    const cx = node.x + node.width / 2;
    const labelY = node.y + node.height + 6 + config.fontSize;

    const pedigreeId = genNumbering.get(ind.id) ?? ind.id;
    const displayLabel = ind.label !== ind.id ? ind.label : pedigreeId;

    labels.push(
      text(
        { x: cx, y: labelY, class: "lineage-label", "data-individual-id": ind.id },
        displayLabel
      )
    );
  }

  return group({ class: "lineage-labels" }, labels);
}

// ─── Generation Labels ─────────────────────────────────────

function renderGenerationLabels(
  genGroups: Map<number, LayoutNode[]>,
  _config: RenderConfig
): string {
  const labels: string[] = [];
  const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);

  for (const genIdx of sortedGens) {
    const nodes = genGroups.get(genIdx) ?? [];
    if (nodes.length === 0) continue;

    const midY = nodes[0].y + nodes[0].height / 2;
    const roman = toRoman(genIdx + 1);

    labels.push(
      text(
        { x: 25, y: midY + 5, class: "lineage-gen-label" },
        roman
      )
    );
  }

  return group({ class: "lineage-generation-labels" }, labels);
}

// ─── Legend ────────────────────────────────────────────────

function renderLegend(
  legendEntries: LegendEntry[],
  layout: LayoutResult,
  _config: RenderConfig
): string {
  const boxW = 160;
  const rowH = 22;
  const boxH = 30 + legendEntries.length * rowH;
  const x = layout.width - boxW - 20;
  const y = layout.height - boxH - 20;

  const children: string[] = [
    rect({ x, y, width: boxW, height: boxH, rx: 4, ry: 4, class: "lineage-legend-box" }),
    text({ x: x + boxW / 2, y: y + 18, class: "lineage-legend", "text-anchor": "middle", "font-weight": "bold" }, "Legend"),
  ];

  for (let i = 0; i < legendEntries.length; i++) {
    const entry = legendEntries[i];
    const ry = y + 30 + i * rowH;
    const swatchSize = 14;

    children.push(
      rect({
        x: x + 10,
        y: ry,
        width: swatchSize,
        height: swatchSize,
        fill: "#333",
        stroke: "#333",
        "stroke-width": "1",
      }),
      text({ x: x + 30, y: ry + 11, class: "lineage-legend" }, entry.label)
    );
  }

  return group({ class: "lineage-legend-group" }, children);
}

// ─── Helpers ───────────────────────────────────────────────

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      result += syms[i];
      n -= vals[i];
    }
  }
  return result;
}
