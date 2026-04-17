import type { LayoutResult, LayoutNode, LayoutEdge, RenderConfig } from "../../core/types";
import { svgRoot, el, group, text, title, desc } from "../../core/svg";
import { renderIndividualSymbol, getRequiredDefs } from "./symbols";

// ─── Public API ─────────────────────────────────────────────

export function renderGenogram(
  layout: LayoutResult,
  config: RenderConfig
): string {
  const defsStr = getRequiredDefs(layout.nodes.map((n) => n.individual));
  const styleStr = buildStyles(config);

  const genGroups = groupByGeneration(layout.nodes);
  const edgeLayers = renderEdges(layout.edges);
  const nodeLayers = renderNodes(genGroups);
  const labelLayer = renderLabels(layout.nodes, config);

  const nodeCount = layout.nodes.length;
  const genCount = genGroups.size;

  return svgRoot(
    {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "lineage-diagram lineage-genogram",
      width: layout.width,
      height: layout.height,
    },
    [
      title("Genogram"),
      desc(
        `Genogram diagram with ${nodeCount} individuals across ${genCount} generations`
      ),
      defsStr,
      styleStr,
      edgeLayers,
      ...nodeLayers,
      labelLayer,
    ]
  );
}

// ─── Styles ─────────────────────────────────────────────────

function buildStyles(config: RenderConfig): string {
  const css = `
.lineage-shape { fill: white; stroke: #333; stroke-width: 2; }
.lineage-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize}px; text-anchor: middle; fill: #333; }
.lineage-edge { stroke: #333; stroke-width: 2; fill: none; }
.lineage-edge-cohabiting path { stroke-dasharray: 6,4; }
.lineage-edge-divorced .lineage-divorce-mark { stroke: #333; stroke-width: 2; }
.lineage-edge-separated .lineage-separation-mark { stroke: #333; stroke-width: 2; }
.lineage-deceased-mark { stroke: #333; stroke-width: 2; }
`;
  return el("style", {}, css);
}

// ─── Edges ──────────────────────────────────────────────────

function renderEdges(edges: LayoutEdge[]): string {
  const children: string[] = [];

  for (const edge of edges) {
    const relType = edge.relationship.type;
    const cssClass = `lineage-edge lineage-edge-${relType}`;

    const elements: string[] = [
      el("path", { d: edge.path, class: "lineage-edge-path" }),
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
            class: "lineage-divorce-mark",
            stroke: "#333",
            "stroke-width": "2",
          }),
          el("line", {
            x1: mid.x - 4 + 6,
            y1: mid.y - 6,
            x2: mid.x + 4 + 6,
            y2: mid.y + 6,
            class: "lineage-divorce-mark",
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
            class: "lineage-separation-mark",
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

  return group({ class: "lineage-edges" }, children);
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
          class: `lineage-generation lineage-generation-${genIdx}`,
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
      labelText += ` (${ind.birthYear}-${ind.deathYear})`;
    } else if (ind.birthYear) {
      labelText += ` (${ind.birthYear})`;
    }

    labels.push(
      text(
        {
          x: cx,
          y: labelY,
          class: "lineage-label",
          "data-individual-id": ind.id,
        },
        labelText
      )
    );
  }

  return group({ class: "lineage-labels" }, labels);
}
