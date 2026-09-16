import { TITLE } from "../../core/theme";
import { resolveSceneTitle } from "../../core/title-scene";
import type {
  LayoutResult,
  LayoutNode,
  LayoutEdge,
  RenderConfig,
  Individual,
  DiagramAST,
  LegendItem,
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
} from "../../core/svg";
import { estimateTextWidth } from "../../core/text-metrics";
import { cssCustomProperties, resolvePersonTheme, STROKE_WIDTH, type ResolvedTheme, type PersonTokens } from "../../core/theme";
import { applyLegendOverrides, renderLegend as renderLegendCore } from "../../core/legend";
import { buildPedigreeLegend, geneticStatusItem, sexShapeItem } from "./legend";

interface RenderedSymbols {
  svg: string;
  legendItems: LegendItem[];
}

const POINTER = { length: 24, headLength: 6, headWidth: 5, gap: 3, labelGap: 4, fontSize: 10, stroke: 1.5 };

/** A southwest pointer terminates outside the actual outline, not its bounding box. */
function pointerGeometry(ind: Individual, size: number) {
  const roles = (["proband", "consultand"] as const).filter(role => ind.markers?.includes(role));
  if (!roles.length || ["sab", "tab", "ectopic"].includes(ind.status ?? "")) return undefined;
  const half = size / 2;
  const edge = ind.sex === "male" ? half : ind.sex === "female" ? half / Math.SQRT2 : half / 2;
  const tip = edge + POINTER.gap / Math.SQRT2;
  return { roles, tip, base: tip + POINTER.headLength / Math.SQRT2,
    tail: tip + POINTER.length / Math.SQRT2 };
}

function captionOffset(ind: Individual, size: number, fontSize: number, normal: number): number {
  const pointer = pointerGeometry(ind, size);
  if (!pointer || ind.label === ind.id) return normal;
  const halfWidth = estimateTextWidth(ind.label, fontSize) / 2;
  // Short generation IDs can sit alongside the pointer; a wide caption needs
  // its own row below the shaft and role label.
  return halfWidth >= pointer.tip && normal - fontSize <= pointer.tail + POINTER.labelGap
    ? Math.max(normal, pointer.tail + POINTER.labelGap + fontSize + 6) : normal;
}

// ─── Public API ─────────────────────────────────────────────

export function renderPedigree(
  layout: LayoutResult,
  config: RenderConfig,
  ast?: DiagramAST
): string {
  const t = resolvePersonTheme(config.theme);
  const defsStr = buildDefs(layout.nodes);
  const styleStr = buildStyles(config, t);

  const genGroups = groupByGeneration(layout.nodes);
  const edges = renderEdges(layout.edges, t);
  const nodes = renderNodes(genGroups, config, t);
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
  const chartContent = [genLabels, edges.svg, nodes.svg, labelLayer];
  const chartHeight = Math.max(layout.height, nodes.bottom + 16) + (layout.nodes.some(n => n.individual.childType?.startsWith("donor-")) ? 16 : 0);

  const chartTitle = ast?.metadata?.title;
  const titleHeight = chartTitle ? TITLE.bandH : 0;
  let finalWidth = layout.width;
  let finalHeight = chartHeight;
  let legendSvg = "";

  if (ast) {
    const autoSpec = buildPedigreeLegend([...edges.legendItems, ...nodes.legendItems], ast.legend, t);
    const finalSpec = applyLegendOverrides(autoSpec, ast.legendOverrides);
    if (finalSpec.mode === "on" && finalSpec.items.length > 0) {
      const { svg, bbox: lb } = renderLegendCore(
        finalSpec,
        {
          canvasWidth: layout.width,
          canvasHeight: chartHeight,
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
      { transform: `translate(${chartXOffset}, ${titleHeight})` },
      chartContent
    )
  );
  if (legendSvg) layers.push(group({ transform: `translate(0, ${titleHeight})` }, [legendSvg]));
  finalHeight += titleHeight;
  if (chartTitle) {
    const resolved = resolveSceneTitle(chartTitle, ast?.titleSourceRange, finalWidth / 2, TITLE.y, config);
    layers.push(text({ x: resolved.x, y: resolved.y, ...resolved.attrs,
      "text-anchor": "middle", "font-family": config.fontFamily,
      "font-size": TITLE.size, "font-weight": TITLE.weight, fill: t.text }, chartTitle));
  }

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

// Bennett et al. 2022 §4.5 retired the centre dot: every carrier, X-linked and obligate included,
// is drawn with the key-defined fill pattern.
const CARRIER_STATUSES = new Set(["carrier", "carrier-x", "obligate-carrier"]);

function buildDefs(nodes: LayoutNode[]): string {
  const children: string[] = [];
  const needs = new Set<string>();

  for (const n of nodes) {
    const gs = n.individual.geneticStatus;
    if (gs) needs.add(gs);
  }

  if ([...needs].some((s) => CARRIER_STATUSES.has(s))) {
    children.push(
      el("pattern", {
        id: "schematex-pedigree-carrier-pattern", width: 6, height: 6,
        patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)",
      }, [
        line({ x1: 0, y1: 0, x2: 0, y2: 6, class: "schematex-pedigree-carrier-hatch" }),
      ])
    );
  }

  return defs(children);
}

// ─── Styles ────────────────────────────────────────────────

function buildStyles(config: RenderConfig, t: ResolvedTheme<PersonTokens>): string {
  const css = `
.schematex-pedigree {${cssCustomProperties(t)}
}
.schematex-pedigree-shape { fill: ${t.fill}; stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linejoin: round; }
.schematex-pedigree-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize}px; text-anchor: middle; fill: ${t.text}; }
.schematex-pedigree-gen-label { font-family: ${config.fontFamily}; font-size: 14px; font-weight: bold; fill: ${t.text}; text-anchor: middle; }
.schematex-pedigree-edge { stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.schematex-pedigree-deceased-mark { stroke: ${t.deceasedMark}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linecap: round; }
.schematex-pedigree-affected-fill { fill: ${t.conditionFill}; }
.schematex-pedigree-carrier-fill { fill: url(#schematex-pedigree-carrier-pattern); stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linejoin: round; }
.schematex-pedigree-carrier-hatch { stroke: ${t.conditionFill}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-pedigree-presymptomatic-mark { stroke: ${t.conditionFill}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-pedigree-proband-arrow-line { stroke: ${t.stroke}; stroke-width: ${POINTER.stroke}; fill: none; }
.schematex-pedigree-proband-arrow-head { fill: ${t.stroke}; stroke: none; }
.schematex-pedigree-proband-label { font-family: ${config.fontFamily}; font-size: ${POINTER.fontSize}px; font-weight: bold; fill: ${t.stroke}; }
.schematex-pedigree-loss-shape { stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linejoin: round; }
.schematex-pedigree-tab-slash { stroke: ${t.deceasedMark}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linecap: round; }
.schematex-pedigree-status-label { font-family: ${config.fontFamily}; font-size: 10px; font-weight: bold; fill: ${t.text}; }
.schematex-pedigree-pregnancy-mark { font-family: ${config.fontFamily}; font-size: ${config.fontSize}px; font-weight: bold; text-anchor: middle; dominant-baseline: central; fill: ${t.text}; }
.schematex-pedigree-legend { font-family: ${config.fontFamily}; font-size: 11px; fill: ${t.text}; }
.schematex-pedigree-legend-box { fill: ${t.fill}; stroke: ${t.neutral}; stroke-width: 1; }
`;
  return el("style", {}, css);
}

// ─── Edges ─────────────────────────────────────────────────

function renderEdges(edges: LayoutEdge[], t: ResolvedTheme<PersonTokens>): RenderedSymbols {
  const children: string[] = [];
  const legendItems: LegendItem[] = [];

  for (const edge of edges) {
    const relType = edge.relationship.type;
    const cssClass = `schematex-pedigree-edge schematex-pedigree-edge-${relType}`;

    const elements: string[] = [
      el("path", { d: edge.path, class: "schematex-pedigree-edge-path" }),
    ];

    if (relType === "separated") {
      const mid = pathMidpoint(edge.path);
      if (mid) {
        elements.push(...[-5, 5].map(offset =>
          line({
            x1: mid.x + offset - 4, y1: mid.y + 6,
            x2: mid.x + offset + 4, y2: mid.y - 6,
            class: "schematex-pedigree-edge",
          })
        ));
        legendItems.push({
          key: "relationship.separated", label: "No longer together",
          kind: "marker", marker: "slash", color: t.stroke, section: "symbols",
        });
      }
    }

    children.push(
      group({ class: cssClass, "data-from": edge.from, "data-to": edge.to }, elements)
    );
    if (relType === "consanguineous" && edge.relationship.label === "_double") {
      legendItems.push({
        key: "relationship.consanguineous", label: "Consanguineous union",
        kind: "line", pattern: "double", color: t.stroke, section: "symbols",
      });
    }
  }

  return { svg: group({ class: "schematex-pedigree-edges" }, children), legendItems };
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

function renderNodes(
  genGroups: Map<number, LayoutNode[]>,
  config: RenderConfig,
  t: ResolvedTheme<PersonTokens>
): RenderedSymbols & { bottom: number } {
  const layers: string[] = [];
  const legendItems: LegendItem[] = [];
  let bottom = 0;
  const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);

  for (const genIdx of sortedGens) {
    const nodes = genGroups.get(genIdx) ?? [];
    const nodeElements: string[] = [];

    for (const node of nodes) {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const rendered = renderPedigreeSymbol(
        node.individual, cx, cy, node.width, captionOffset(node.individual, node.width, config.fontSize, node.height / 2 + 6 + config.fontSize), t
      );
      nodeElements.push(rendered.svg);
      legendItems.push(...rendered.legendItems);
      bottom = Math.max(bottom, rendered.bottom);
    }

    layers.push(
      group(
        { class: `schematex-pedigree-generation schematex-pedigree-generation-${genIdx}`, "data-generation": genIdx },
        nodeElements
      )
    );
  }

  return { svg: layers.join("\n"), legendItems, bottom };
}

function renderPedigreeSymbol(
  ind: Individual,
  x: number,
  y: number,
  size: number,
  labelOffset: number,
  theme: ResolvedTheme<PersonTokens>
): RenderedSymbols & { bottom: number } {
  const half = size / 2;
  const legendItems: LegendItem[] = [];
  const classes = ["schematex-pedigree-node", `schematex-pedigree-${ind.sex === "other" ? "unknown" : ind.sex}`];
  if (ind.status === "deceased" || ind.status === "stillborn") classes.push("schematex-pedigree-deceased");
  if (ind.geneticStatus) classes.push(`schematex-pedigree-${ind.geneticStatus}`);

  const titleText = formatTitle(ind);
  const children: string[] = [title(titleText)];

  // Loss status replaces the sex shape; fill still records affected status.
  const pregLoss = ind.status === "sab" || ind.status === "tab" || ind.status === "ectopic";
  if (pregLoss) {
    classes.push(`schematex-pedigree-${ind.status}`);
    const t = half * 0.6;
    const affected = ind.geneticStatus === "affected";
    const fill = affected ? theme.conditionFill : theme.fill;
    children.push(
      polygon({
        points: `0,${-t} ${t},${t} ${-t},${t}`,
        fill,
        class: `schematex-pedigree-loss-shape schematex-pedigree-${ind.status}-shape`,
      })
    );
    const lossLabel = ind.status === "sab" ? "Spontaneous abortion (SAB)"
      : ind.status === "tab" ? "Induced abortion (TAB)" : "Ectopic pregnancy (ECT)";
    legendItems.push({
      key: `status.${ind.status}${affected ? ".affected" : ""}`,
      label: affected ? `Affected ${lossLabel.charAt(0).toLowerCase()}${lossLabel.slice(1)}` : lossLabel,
      kind: "shape", shape: "triangle", fill, color: theme.stroke, section: "symbols",
    });
    if (ind.status === "tab" || ind.status === "ectopic") {
      children.push(
        line({
          x1: -t * 1.1, y1: t * 1.1, x2: t * 1.1, y2: -t * 1.1,
          class: "schematex-pedigree-tab-slash",
        })
      );
    }
    if (ind.status === "ectopic") {
      children.push(
        text(
          { x: 0, y: labelOffset + 15, class: "schematex-pedigree-status-label", "text-anchor": "middle" },
          "ECT"
        )
      );
    }
    if (ind.status === "sab") {
      children.push(text(
        { x: 0, y: labelOffset + 15, class: "schematex-pedigree-status-label", "text-anchor": "middle" },
        "SAB"
      ));
    }
    // Record only the replacement glyph, not suppressed sex/fill/marker declarations.
    return { svg: group(
      {
        class: classes.join(" "),
        "data-individual-id": ind.id,
        transform: `translate(${x}, ${y})`,
      },
      children
    ), legendItems, bottom: y + (ind.status === "sab" ? labelOffset + 19 : half) };
  }

  // Base shape
  children.push(baseShape(ind.sex, half, legendItems, theme));

  // Stillborn keeps the sex shape and carries both SB and the deceased slash.
  if (ind.status === "stillborn") {
    classes.push("schematex-pedigree-stillborn");
    children.push(
      text(
        { x: 0, y: labelOffset + 15, class: "schematex-pedigree-status-label", "text-anchor": "middle" },
        "SB"
      )
    );
    legendItems.push({
      key: "status.stillborn", label: "Stillborn (SB)",
      kind: "marker", marker: "SB", section: "symbols",
    });
  }

  // Genetic status fills
  const gs = ind.geneticStatus;
  if (gs === "affected") {
    children.push(affectedFill(ind.sex, half));
    legendItems.push(geneticStatusItem(gs, theme));
  } else if (gs && CARRIER_STATUSES.has(gs)) {
    children.push(carrierFill(ind.sex, half));
    legendItems.push(geneticStatusItem(gs, theme));
  }

  // Presymptomatic vertical line
  if (gs === "presymptomatic") {
    children.push(
      line({ x1: 0, y1: -half, x2: 0, y2: half, class: "schematex-pedigree-presymptomatic-mark" })
    );
    legendItems.push(geneticStatusItem(gs, theme));
  }

  // Deceased: diagonal slash (pedigree uses / not X)
  if (ind.status === "deceased" || ind.status === "stillborn") {
    const ext = ind.sex === "female" ? half * 0.707 : half;
    children.push(
      line({ x1: ext, y1: -ext, x2: -ext, y2: ext, class: "schematex-pedigree-deceased-mark" })
    );
    // SB and its slash form one composite status, with one existing legend row.
    if (ind.status === "deceased") legendItems.push({
      key: "status.deceased", label: "Deceased", kind: "marker",
      marker: "slash", color: theme.deceasedMark, section: "symbols",
    });
  }

  if (ind.status === "pregnancy") {
    classes.push("schematex-pedigree-pregnancy");
    children.push(text({ x: 0, y: 0, class: "schematex-pedigree-pregnancy-mark" }, "P"));
  }

  // Render the shaft and head directly: their direction and size remain the
  // same in browsers and SVG rasterizers, independent of marker scaling.
  const pointer = pointerGeometry(ind, size);
  if (pointer) {
    const { tip, base, tail, roles } = pointer;
    const wing = POINTER.headWidth / 2 / Math.SQRT2;
    children.push(
      line({ x1: -tail, y1: tail, x2: -base, y2: base,
        class: "schematex-pedigree-proband-arrow-line" }),
      polygon({ points: `${-tip},${tip} ${-base + wing},${base + wing} ${-base - wing},${base - wing}`,
        class: "schematex-pedigree-proband-arrow-head" }),
      text({ x: -tail - POINTER.labelGap, y: tail + POINTER.labelGap,
        class: "schematex-pedigree-proband-label", "text-anchor": "end" },
      roles.map(role => role === "proband" ? "P" : "C").join("/"))
    );
    for (const role of roles) legendItems.push({
      key: `marker.${role}`, label: role === "proband" ? "Proband (P)" : "Consultand (C)",
      kind: "marker", marker: "diagonal-arrow", color: theme.stroke, section: "symbols",
    });
  }

  // Evaluated marker
  if (ind.markers?.includes("evaluated")) {
    children.push(
      text(
        { x: 0, y: -half - 4, class: "schematex-pedigree-proband-label", "text-anchor": "middle" },
        "E"
      )
    );
    legendItems.push({
      key: "marker.evaluated", label: "Evaluated (E)",
      kind: "marker", marker: "E", section: "symbols",
    });
  }

  return { svg: group(
    {
      class: classes.join(" "),
      "data-individual-id": ind.id,
      transform: `translate(${x}, ${y})`,
    },
    children
  ), legendItems, bottom: y + Math.max(half, labelOffset, pointer ? pointer.tail + POINTER.labelGap + 3 : 0) };
}

function baseShape(
  sex: Individual["sex"], half: number,
  legendItems: LegendItem[], theme: ResolvedTheme<PersonTokens>
): string {
  switch (sex) {
    case "male":
      return rect({ x: -half, y: -half, width: half * 2, height: half * 2, class: "schematex-pedigree-shape" });
    case "female":
      return circle({ cx: 0, cy: 0, r: half, class: "schematex-pedigree-shape" });
    default:
      legendItems.push(sexShapeItem(sex, theme));
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
  const attrs = { class: "schematex-pedigree-carrier-fill" };
  switch (sex) {
    case "male":
      return rect({ x: -half, y: -half, width: half * 2, height: half * 2, ...attrs });
    case "female":
      return circle({ cx: 0, cy: 0, r: half, ...attrs });
    default:
      return polygon({ points: `0,${-half} ${half},0 0,${half} ${-half},0`, ...attrs });
  }
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
    const labelY = node.y + node.height / 2 + captionOffset(ind, node.width, config.fontSize, node.height / 2 + 6 + config.fontSize);

    const pedigreeId = genNumbering.get(ind.id) ?? ind.id;
    const displayLabel = ind.label !== ind.id ? ind.label : pedigreeId;
    if (ind.childType?.startsWith("donor-")) {
      labels.push(text({ x: cx, y: labelY + 16, class: "schematex-pedigree-label", "font-size": 10 }, `${ind.childType.slice(6)} donation`));
    }

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
