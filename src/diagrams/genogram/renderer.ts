import type { LayoutResult, LayoutNode, LayoutEdge, RenderConfig, DiagramAST, RelationshipType } from "../../core/types";
import { svgRoot, el, group, text, title, desc } from "../../core/svg";
import { cssCustomProperties, resolveGenogramTheme, STROKE_WIDTH } from "../../core/theme";
import { renderIndividualSymbol, getRequiredDefs } from "./symbols";

// ─── Public API ─────────────────────────────────────────────

export function renderGenogram(
  layout: LayoutResult,
  config: RenderConfig,
  ast?: DiagramAST
): string {
  const hasDirectional = layout.edges.some(e => e.relationship.directional);
  const defsStr = getRequiredDefs(layout.nodes.map((n) => n.individual), hasDirectional);
  const styleStr = buildStyles(config);

  const genGroups = groupByGeneration(layout.nodes);

  // Separate structural and emotional edges
  const structuralEdges = layout.edges.filter(e => !EMOTIONAL_REL_TYPES.has(e.relationship.type));
  const emotionalEdges = layout.edges.filter(e => EMOTIONAL_REL_TYPES.has(e.relationship.type));

  const edgeLayers = renderEdges(structuralEdges);
  const emotionalLayer = renderEmotionalEdges(emotionalEdges);
  const nodeLayers = renderNodes(genGroups);
  const labelLayer = renderLabels(layout.nodes, config);
  const edgeLabelLayer = renderEdgeLabels(structuralEdges, config);

  const nodeCount = layout.nodes.length;
  const genCount = genGroups.size;

  const chartTitle = ast?.metadata?.title;

  // Adjust viewBox and add title offset if title exists
  const titleHeight = chartTitle ? 40 : 0;
  const totalHeight = layout.height + titleHeight;

  const layers: string[] = [
    title(chartTitle ? `Genogram: ${chartTitle}` : "Genogram"),
    desc(
      `Genogram diagram with ${nodeCount} individuals across ${genCount} generations`
    ),
    defsStr,
    styleStr,
  ];

  if (chartTitle) {
    layers.push(
      text(
        {
          x: layout.width / 2,
          y: 28,
          class: "schematex-genogram-title",
          "text-anchor": "middle",
          "font-size": "20",
          "font-weight": "bold",
          "font-family": config.fontFamily,
        },
        chartTitle
      )
    );
  }

  // Wrap content in a group with title offset
  const contentGroup = group(
    { transform: titleHeight > 0 ? `translate(0, ${titleHeight})` : undefined },
    [edgeLayers, emotionalLayer, ...nodeLayers, labelLayer, edgeLabelLayer]
  );
  layers.push(contentGroup);

  return svgRoot(
    {
      viewBox: `0 0 ${layout.width} ${totalHeight}`,
      class: "schematex-diagram schematex-genogram",
      width: layout.width,
      height: totalHeight,
    },
    layers
  );
}

// ─── Styles ─────────────────────────────────────────────────

// ─── Theme Resolution ──────────────────────────────────────

function buildStyles(config: RenderConfig): string {
  const t = resolveGenogramTheme(config.theme);
  const css = `
.schematex-genogram {${cssCustomProperties(t)}
  background: ${t.bg};
}
.schematex-genogram-shape { fill: ${t.fill}; stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linejoin: round; }
.schematex-genogram-male .schematex-genogram-shape { fill: ${t.maleFill}; }
.schematex-genogram-female .schematex-genogram-shape { fill: ${t.femaleFill}; }
.schematex-genogram-unknown .schematex-genogram-shape { fill: ${t.unknownFill}; }
.schematex-genogram-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize}px; text-anchor: middle; fill: ${t.text}; }
.schematex-genogram-edge { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.schematex-genogram-edge-cohabiting path { stroke-dasharray: 6,4; }
.schematex-genogram-edge-divorced .schematex-genogram-divorce-mark { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-genogram-edge-separated .schematex-genogram-separation-mark { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-genogram-deceased-mark { stroke: ${t.deceasedMark}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linecap: round; }
.schematex-genogram-condition-fill { fill: ${t.conditionFill}; }
.schematex-genogram-age { font-family: ${config.fontFamily}; fill: ${t.text}; pointer-events: none; }
.schematex-genogram-title { fill: ${t.text}; }
.schematex-genogram-edge-label { font-family: ${config.fontFamily}; fill: ${t.text}; }
.schematex-genogram-index-border { stroke: ${t.warn}; stroke-width: ${STROKE_WIDTH.thick}; fill: none; }
`;
  return el("style", {}, css);
}

// ─── Emotional Relationship Types ───────────────────────────

const EMOTIONAL_REL_TYPES = new Set<string>([
  "harmony", "close", "bestfriends", "love", "inlove", "friendship",
  "hostile", "conflict", "enmity", "distant-hostile", "cutoff",
  "close-hostile", "fused", "fused-hostile",
  "distant", "normal", "nevermet",
  "abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect",
  "manipulative", "controlling", "jealous",
  "focused", "focused-neg", "distrust", "admirer", "limerence",
]);

function getEmotionalColor(type: RelationshipType): string {
  // Positive: green
  if (["harmony", "close", "bestfriends", "love", "inlove", "friendship"].includes(type)) return "#4caf50";
  // Negative: red
  if (["hostile", "conflict", "enmity", "distant-hostile", "cutoff"].includes(type)) return "#e53935";
  // Ambivalent: purple
  if (["close-hostile", "fused", "fused-hostile"].includes(type)) return "#9c27b0";
  // Distance: gray
  if (["distant", "normal", "nevermet"].includes(type)) return "#9e9e9e";
  // Abuse: dark red
  if (["abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect"].includes(type)) return "#b71c1c";
  // Control: orange
  if (["manipulative", "controlling", "jealous"].includes(type)) return "#e65100";
  // Special: blue
  return "#1565c0";
}

function getEmotionalLineStyle(type: RelationshipType): string {
  // Hostile types: zigzag rendered as stroke-dasharray
  if (["hostile", "conflict", "enmity", "distant-hostile", "close-hostile", "fused-hostile"].includes(type)) {
    return "stroke-dasharray: 8,3,2,3;";
  }
  // Distant types: dashed
  if (["distant", "distant-hostile", "nevermet"].includes(type)) {
    return "stroke-dasharray: 6,4;";
  }
  // Cutoff: gap
  if (type === "cutoff") {
    return "stroke-dasharray: 2,8;";
  }
  return "";
}

function getEmotionalStrokeWidth(type: RelationshipType): number {
  // Fused/best friends: thick (3 lines visually)
  if (["fused", "fused-hostile", "bestfriends"].includes(type)) return 4;
  // Close/love: medium (2 lines)
  if (["close", "close-hostile", "love", "inlove"].includes(type)) return 3;
  return 2;
}

function renderEmotionalEdges(edges: LayoutEdge[]): string {
  if (edges.length === 0) return group({ class: "schematex-genogram-emotional-edges" }, []);

  const children: string[] = [];
  for (const edge of edges) {
    const type = edge.relationship.type;
    const color = getEmotionalColor(type);
    const lineStyle = getEmotionalLineStyle(type);
    const strokeWidth = getEmotionalStrokeWidth(type);
    const directional = edge.relationship.directional;

    const elements: string[] = [
      el("path", {
        d: edge.path,
        fill: "none",
        stroke: color,
        "stroke-width": strokeWidth,
        style: lineStyle || undefined,
        "marker-end": directional ? "url(#schematex-genogram-arrow)" : undefined,
      }),
    ];

    // Render label on emotional edge
    if (edge.relationship.label) {
      const mid = pathMidpoint(edge.path);
      if (mid) {
        elements.push(
          text(
            {
              x: mid.x,
              y: mid.y - 6,
              class: "schematex-genogram-edge-label",
              "text-anchor": "middle",
              "font-size": "10",
              fill: color,
            },
            edge.relationship.label
          )
        );
      }
    }

    children.push(
      group(
        {
          class: `schematex-genogram-emotional schematex-genogram-emotional-${type}`,
          "data-from": edge.from,
          "data-to": edge.to,
          "data-relationship-type": type,
        },
        elements
      )
    );
  }

  return group({ class: "schematex-genogram-emotional-edges" }, children);
}

// ─── Edge Labels ────────────────────────────────────────────

function renderEdgeLabels(edges: LayoutEdge[], config: RenderConfig): string {
  const labels: string[] = [];

  for (const edge of edges) {
    if (!edge.relationship.label) continue;
    const mid = pathMidpoint(edge.path);
    if (!mid) continue;

    labels.push(
      text(
        {
          x: mid.x,
          y: mid.y - 6,
          class: "schematex-genogram-edge-label",
          "text-anchor": "middle",
          "font-size": "10",
          "font-family": config.fontFamily,
        },
        edge.relationship.label
      )
    );
  }

  return group({ class: "schematex-genogram-edge-labels" }, labels);
}

// ─── Edges ──────────────────────────────────────────────────

function renderEdges(edges: LayoutEdge[]): string {
  const children: string[] = [];

  for (const edge of edges) {
    const relType = edge.relationship.type;
    const cssClass = `schematex-genogram-edge schematex-genogram-edge-${relType}`;

    const elements: string[] = [
      el("path", { d: edge.path, class: "schematex-genogram-edge-path" }),
    ];

    // Divorce markers: two short slashes at midpoint
    if (relType === "divorced") {
      const mid = pathMidpoint(edge.path);
      if (mid) {
        elements.push(
          el("line", {
            x1: mid.x - 4,
            y1: mid.y - 6,
            x2: mid.x + 4,
            y2: mid.y + 6,
            class: "schematex-genogram-divorce-mark",
            stroke: "#333",
            "stroke-width": "2",
          }),
          el("line", {
            x1: mid.x - 4 + 6,
            y1: mid.y - 6,
            x2: mid.x + 4 + 6,
            y2: mid.y + 6,
            class: "schematex-genogram-divorce-mark",
            stroke: "#333",
            "stroke-width": "2",
          })
        );
      }
    }

    // Separation marker: single slash
    if (relType === "separated") {
      const mid = pathMidpoint(edge.path);
      if (mid) {
        elements.push(
          el("line", {
            x1: mid.x - 4,
            y1: mid.y - 6,
            x2: mid.x + 4,
            y2: mid.y + 6,
            class: "schematex-genogram-separation-mark",
            stroke: "#333",
            "stroke-width": "2",
          })
        );
      }
    }

    children.push(
      group(
        {
          class: cssClass,
          "data-from": edge.from,
          "data-to": edge.to,
        },
        elements
      )
    );
  }

  return group({ class: "schematex-genogram-edges" }, children);
}

function pathMidpoint(
  pathData: string
): { x: number; y: number } | null {
  const coords = pathData.match(/[\d.-]+/g);
  if (!coords || coords.length < 4) return null;
  const x1 = parseFloat(coords[0]);
  const y1 = parseFloat(coords[1]);
  const x2 = parseFloat(coords[2]);
  const y2 = parseFloat(coords[3]);
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

// ─── Nodes ──────────────────────────────────────────────────

function groupByGeneration(nodes: LayoutNode[]): Map<number, LayoutNode[]> {
  const groups = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const gen = node.generation;
    const group = groups.get(gen) ?? [];
    group.push(node);
    groups.set(gen, group);
  }
  return groups;
}

function renderNodes(
  genGroups: Map<number, LayoutNode[]>
): string[] {
  const layers: string[] = [];
  const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);

  for (const genIdx of sortedGens) {
    const nodes = genGroups.get(genIdx) ?? [];
    const nodeElements: string[] = [];

    for (const node of nodes) {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      nodeElements.push(
        renderIndividualSymbol(node.individual, cx, cy, node.width)
      );
    }

    layers.push(
      group(
        {
          class: `schematex-genogram-generation schematex-genogram-generation-${genIdx}`,
          "data-generation": genIdx,
        },
        nodeElements
      )
    );
  }

  return layers;
}

// ─── Labels ─────────────────────────────────────────────────

function renderLabels(
  nodes: LayoutNode[],
  config: RenderConfig
): string {
  const labels: string[] = [];

  for (const node of nodes) {
    const ind = node.individual;
    const label = ind.label || ind.id;
    const cx = node.x + node.width / 2;
    const labelY = node.y + node.height + 6 + config.fontSize;

    let labelText = label.charAt(0).toUpperCase() + label.slice(1);
    if (ind.birthYear && ind.deathYear) {
      labelText += ` (${ind.birthYear}–${ind.deathYear})`;
    } else if (ind.birthYear) {
      labelText += ` (b. ${ind.birthYear})`;
    }

    labels.push(
      text(
        {
          x: cx,
          y: labelY,
          class: "schematex-genogram-label",
          "data-individual-id": ind.id,
        },
        labelText
      )
    );
  }

  return group({ class: "schematex-genogram-labels" }, labels);
}
