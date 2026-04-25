import type {
  LayoutResult,
  LayoutNode,
  LayoutEdge,
  RenderConfig,
  Individual,
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
import { cssCustomProperties, resolvePersonTheme, STROKE_WIDTH, type ResolvedTheme, type PersonTokens } from "../../core/theme";
import { applyLegendOverrides, renderLegend as renderLegendCore } from "../../core/legend";
import { buildPedigreeLegend } from "./legend";

// ─── Public API ─────────────────────────────────────────────

export function renderPedigree(
  layout: LayoutResult,
  config: RenderConfig,
  ast?: DiagramAST
): string {
  const t = resolvePersonTheme(config.theme);
  const defsStr = buildDefs(layout.nodes, t);
  const styleStr = buildStyles(config, t);

  const genGroups = groupByGeneration(layout.nodes);
  const edgeLayers = renderEdges(layout.edges);
  const nodeLayers = renderNodes(genGroups);
  const labelLayer = renderLabels(layout.nodes, genGroups, config);
  const genLabels = renderGenerationLabels(genGroups, config);

  const nodeCount = layout.nodes.length;
  const genCount = genGroups.size;

  const diagramTitle = ast?.metadata?.title ?? "Pedigree";

  const layers: string[] = [
    title(diagramTitle),
    desc(`Pedigree chart with ${nodeCount} individuals across ${genCount} generations`),
    defsStr,
    styleStr,
  ];

  // Defer chart-content push until legend bbox is known so we can center.
  const chartContent = [genLabels, edgeLayers, ...nodeLayers, labelLayer];

  let finalWidth = layout.width;
  let finalHeight = layout.height;
  let legendSvg = "";

  if (ast) {
    const autoSpec = buildPedigreeLegend(ast, t);
    const finalSpec = applyLegendOverrides(autoSpec, ast.legendOverrides);
    if (finalSpec.mode === "on" && finalSpec.items.length > 0) {
      const { svg, bbox: lb } = renderLegendCore(
        finalSpec,
        {
          canvasWidth: layout.width,
          canvasHeight: layout.height,
          padding: 16,
        },
        t,
        { fontFamily: config.fontFamily, fontSize: config.fontSize }
      );
      if (svg) {
        legendSvg = svg;
        const overflowX = lb.x + lb.w + 8;
        const overflowY = lb.y + lb.h + 8;
        if (overflowX > finalWidth) finalWidth = overflowX;
        if (overflowY > finalHeight) finalHeight = overflowY;
      }
    }
  }

  const chartXOffset = Math.max(0, (finalWidth - layout.width) / 2);
  layers.push(
    group(
      { transform: chartXOffset > 0 ? `translate(${chartXOffset}, 0)` : undefined },
      chartContent
    )
  );
  if (legendSvg) layers.push(legendSvg);

  return svgRoot(
    {
      viewBox: `0 0 ${finalWidth} ${finalHeight}`,
      class: "schematex-diagram schematex-pedigree",
      width: finalWidth,
      height: finalHeight,
    },
    layers
  );
}

// ─── Defs ──────────────────────────────────────────────────

function buildDefs(nodes: LayoutNode[], t: ResolvedTheme<PersonTokens>): string {
  const children: string[] = [];
  const needs = new Set<string>();

  for (const n of nodes) {
    const gs = n.individual.geneticStatus;
    if (gs) needs.add(gs);
  }

  if (needs.has("carrier")) {
    children.push(
      el("clipPath", { id: "schematex-pedigree-clip-carrier-rect" }, [
        rect({ x: "0", y: "0", width: "50%", height: "100%" }),
      ]),
      el("clipPath", { id: "schematex-pedigree-clip-carrier-circle" }, [
        rect({ x: "-50", y: "-50", width: "50", height: "100" }),
      ])
    );
  }

  // Proband arrow marker
  children.push(
    el("marker", {
      id: "schematex-pedigree-proband-arrow",
      viewBox: "0 0 10 10",
      refX: "0",
      refY: "5",
      markerWidth: "8",
      markerHeight: "8",
      orient: "auto-start-reverse",
    }, [
      path({ d: "M 0 0 L 10 5 L 0 10 z", fill: t.stroke }),
    ])
  );

  return defs(children);
}

// ─── Styles ────────────────────────────────────────────────

function buildStyles(config: RenderConfig, t: ResolvedTheme<PersonTokens>): string {
  const css = `
.schematex-pedigree {${cssCustomProperties(t)}
  background: ${t.bg};
}
.schematex-pedigree-shape { fill: ${t.fill}; stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linejoin: round; }
.schematex-pedigree-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize}px; text-anchor: middle; fill: ${t.text}; }
.schematex-pedigree-gen-label { font-family: ${config.fontFamily}; font-size: 14px; font-weight: bold; fill: ${t.text}; text-anchor: middle; }
.schematex-pedigree-edge { stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.schematex-pedigree-deceased-mark { stroke: ${t.deceasedMark}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linecap: round; }
.schematex-pedigree-affected-fill { fill: ${t.conditionFill}; }
.schematex-pedigree-carrier-fill { fill: ${t.conditionFill}; }
.schematex-pedigree-carrier-x-dot { fill: ${t.conditionFill}; }
.schematex-pedigree-presymptomatic-mark { stroke: ${t.conditionFill}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-pedigree-proband-arrow-line { stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; fill: none; marker-end: url(#schematex-pedigree-proband-arrow); }
.schematex-pedigree-proband-label { font-family: ${config.fontFamily}; font-size: 10px; font-weight: bold; fill: ${t.stroke}; }
.schematex-pedigree-legend { font-family: ${config.fontFamily}; font-size: 11px; fill: ${t.text}; }
.schematex-pedigree-legend-box { fill: ${t.fill}; stroke: ${t.neutral}; stroke-width: 1; }
`;
  return el("style", {}, css);
}

// ─── Edges ─────────────────────────────────────────────────

function renderEdges(edges: LayoutEdge[]): string {
  const children: string[] = [];

  for (const edge of edges) {
    const relType = edge.relationship.type;
    const cssClass = `schematex-pedigree-edge schematex-pedigree-edge-${relType}`;

    const elements: string[] = [
      el("path", { d: edge.path, class: "schematex-pedigree-edge-path" }),
    ];

    if (relType === "separated") {
      const mid = pathMidpoint(edge.path);
      if (mid) {
        elements.push(
          line({
            x1: mid.x - 4, y1: mid.y - 6,
            x2: mid.x + 4, y2: mid.y + 6,
            class: "schematex-pedigree-edge",
          })
        );
      }
    }

    children.push(
      group({ class: cssClass, "data-from": edge.from, "data-to": edge.to }, elements)
    );
  }

  return group({ class: "schematex-pedigree-edges" }, children);
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
        { class: `schematex-pedigree-generation schematex-pedigree-generation-${genIdx}`, "data-generation": genIdx },
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
  const classes = ["schematex-pedigree-node", `schematex-pedigree-${ind.sex === "other" ? "unknown" : ind.sex}`];
  if (ind.status === "deceased") classes.push("schematex-pedigree-deceased");
  if (ind.geneticStatus) classes.push(`schematex-pedigree-${ind.geneticStatus}`);

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
      line({ x1: 0, y1: -half, x2: 0, y2: half, class: "schematex-pedigree-presymptomatic-mark" })
    );
  }

  // Deceased: diagonal slash (pedigree uses / not X)
  if (ind.status === "deceased") {
    const ext = ind.sex === "female" ? half * 0.707 : half;
    children.push(
      line({ x1: ext, y1: -ext, x2: -ext, y2: ext, class: "schematex-pedigree-deceased-mark" })
    );
  }

  // Proband arrow
  if (ind.markers?.includes("proband")) {
    const arrowLen = 20;
    children.push(
      line({
        x1: -half - arrowLen, y1: half + arrowLen,
        x2: -half - 2, y2: half + 2,
        class: "schematex-pedigree-proband-arrow-line",
      }),
      text(
        { x: -half - arrowLen - 4, y: half + arrowLen + 4, class: "schematex-pedigree-proband-label", "text-anchor": "end" },
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
        class: "schematex-pedigree-proband-arrow-line",
      }),
      text(
        { x: -half - arrowLen - 4, y: half + arrowLen + 4, class: "schematex-pedigree-proband-label", "text-anchor": "end" },
        "C"
      )
    );
  }

  // Evaluated marker
  if (ind.markers?.includes("evaluated")) {
    children.push(
      text(
        { x: 0, y: -half - 4, class: "schematex-pedigree-proband-label", "text-anchor": "middle" },
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
      return rect({ x: -half, y: -half, width: half * 2, height: half * 2, class: "schematex-pedigree-shape" });
    case "female":
      return circle({ cx: 0, cy: 0, r: half, class: "schematex-pedigree-shape" });
    default:
      return polygon({ points: `0,${-half} ${half},0 0,${half} ${-half},0`, class: "schematex-pedigree-shape" });
  }
}

function affectedFill(sex: Individual["sex"], half: number): string {
  const attrs = { class: "schematex-pedigree-affected-fill" };
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
    class: "schematex-pedigree-carrier-fill",
    "clip-path": `url(#schematex-pedigree-clip-carrier-${clipSuffix})`,
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
  return circle({ cx: 0, cy: 0, r: half * 0.15, class: "schematex-pedigree-carrier-x-dot" });
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
        { x: cx, y: labelY, class: "schematex-pedigree-label", "data-individual-id": ind.id },
        displayLabel
      )
    );
  }

  return group({ class: "schematex-pedigree-labels" }, labels);
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
        { x: 25, y: midY + 5, class: "schematex-pedigree-gen-label" },
        roman
      )
    );
  }

  return group({ class: "schematex-pedigree-generation-labels" }, labels);
}

// ─── Legend ────────────────────────────────────────────────
// (moved to ./legend.ts; rendered via core/legend)

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
