import type { SociogramAST, NodeRole } from "./parser";
import type { SociogramLayoutResult, SociogramLayoutNode } from "./layout";
import {
  svgRoot,
  el,
  group,
  circle,
  line,
  text,
  title,
  desc,
  polygon,
} from "../../core/svg";

// ─── Constants ──────────────────────────────────────────────

const GROUP_PALETTE = [
  "#42A5F5", // blue
  "#66BB6A", // green
  "#FFA726", // orange
  "#AB47BC", // purple
  "#EF5350", // red
  "#26C6DA", // cyan
  "#FFEE58", // yellow
  "#8D6E63", // brown
];

const VALENCE_COLORS = {
  positive: "#388E3C",
  negative: "#D32F2F",
  neutral: "#9E9E9E",
};

const ROLE_FILL: Record<string, string> = {
  star: "#FFD54F",
  isolate: "#E0E0E0",
  rejected: "#FFCDD2",
};

const LABEL_GAP = 4;
const LABEL_FONT_SIZE = 11;

// ─── CSS ────────────────────────────────────────────────────

function buildCSS(ast: SociogramAST): string {
  const groupColors = ast.groups.map((g, i) => {
    const color = g.color ?? GROUP_PALETTE[i % GROUP_PALETTE.length];
    return `.lineage-sociogram-group-${g.id} { fill: ${color}; stroke: ${color}; }`;
  });

  return `
.lineage-sociogram { font-family: system-ui, -apple-system, sans-serif; }
.lineage-sociogram-node { fill: #42A5F5; stroke: #1976D2; stroke-width: 2; }
.lineage-sociogram-node-star { fill: #FFD54F; stroke: #F9A825; stroke-width: 2.5; }
.lineage-sociogram-node-isolate { fill: #E0E0E0; stroke: #9E9E9E; stroke-width: 2; stroke-dasharray: 4 3; }
.lineage-sociogram-node-neglectee { fill: #BBDEFB; stroke: #1976D2; stroke-width: 2; stroke-dasharray: 4 3; }
.lineage-sociogram-node-rejected { fill: #FFCDD2; stroke: #D32F2F; stroke-width: 2; stroke-dasharray: 4 3; }
.lineage-sociogram-edge { stroke-linecap: round; }
.lineage-sociogram-edge-positive { stroke: ${VALENCE_COLORS.positive}; }
.lineage-sociogram-edge-negative { stroke: ${VALENCE_COLORS.negative}; stroke-dasharray: 6 3; }
.lineage-sociogram-edge-neutral { stroke: ${VALENCE_COLORS.neutral}; stroke-dasharray: 2 3; }
.lineage-sociogram-label { font-size: ${LABEL_FONT_SIZE}px; fill: #333; text-anchor: middle; }
.lineage-sociogram-edge-label { font-size: 9px; fill: #666; text-anchor: middle; }
.lineage-sociogram-title { font-size: 16px; font-weight: bold; fill: #333; text-anchor: middle; }
.lineage-sociogram-star-badge { font-size: 10px; fill: #F9A825; }
.lineage-sociogram-group-label { font-size: 13px; font-weight: bold; fill-opacity: 0.7; text-anchor: middle; }
${groupColors.join("\n")}
`.trim();
}

// ─── Defs (Arrow Markers) ───────────────────────────────────

function buildDefs(): string {
  const markers = [
    { id: "sociogram-arrow", fill: "#388E3C" },
    { id: "sociogram-arrow-negative", fill: "#D32F2F" },
    { id: "sociogram-arrow-neutral", fill: "#9E9E9E" },
  ];

  const markerEls = markers.map((m) =>
    el(
      "marker",
      {
        id: m.id,
        viewBox: "0 0 10 10",
        refX: "9",
        refY: "5",
        markerWidth: "8",
        markerHeight: "8",
        orient: "auto",
      },
      el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: m.fill })
    )
  );

  return el("defs", {}, markerEls);
}

// ─── Edge Weight → Stroke Width ─────────────────────────────

function edgeStrokeWidth(weight: number): number {
  if (weight <= 1) return 1;
  if (weight === 2) return 2;
  if (weight === 3) return 3.5;
  return 5;
}

// ─── Node Rendering ─────────────────────────────────────────

function getNodeClass(role?: NodeRole): string {
  if (!role) return "lineage-sociogram-node";
  switch (role) {
    case "star": return "lineage-sociogram-node lineage-sociogram-node-star";
    case "isolate": return "lineage-sociogram-node lineage-sociogram-node-isolate";
    case "neglectee": return "lineage-sociogram-node lineage-sociogram-node-neglectee";
    case "rejected": return "lineage-sociogram-node lineage-sociogram-node-rejected";
    case "bridge": return "lineage-sociogram-node";
    default: return "lineage-sociogram-node";
  }
}

function getNodeFill(
  node: SociogramLayoutNode,
  ast: SociogramAST
): string | undefined {
  const role = node.computedRole ?? node.node.role;

  if (ast.config.coloring === "role" && role) {
    return ROLE_FILL[role];
  }

  if (ast.config.coloring === "group" && node.node.group) {
    const gIdx = ast.groups.findIndex((g) => g.id === node.node.group);
    if (gIdx >= 0) {
      return ast.groups[gIdx].color ?? GROUP_PALETTE[gIdx % GROUP_PALETTE.length];
    }
  }

  return undefined;
}

function renderNodes(
  layout: SociogramLayoutResult
): { nodeEls: string[]; labelEls: string[] } {
  const nodeEls: string[] = [];
  const labelEls: string[] = [];
  const { ast } = layout;

  for (const layoutNode of layout.nodes) {
    const { node, x, y, radius, computedRole } = layoutNode;
    const role = computedRole ?? node.role;
    const cls = getNodeClass(role);
    const fill = getNodeFill(layoutNode, ast);

    const attrs: Record<string, string | number | undefined> = {
      cx: x,
      cy: y,
      r: radius,
      class: cls,
      "data-node-id": node.id,
    };
    if (fill) attrs.fill = fill;

    nodeEls.push(circle(attrs));

    // Star badge
    if (role === "star") {
      const badgeX = x + radius * 0.6;
      const badgeY = y - radius * 0.6;
      const s = 6;
      const points = starPoints(badgeX, badgeY, s, s * 0.4, 5);
      nodeEls.push(
        polygon({
          points,
          fill: "#F9A825",
          class: "lineage-sociogram-star-badge",
        })
      );
    }

    // Label
    const label = node.label ?? node.id;
    labelEls.push(
      text(
        {
          x,
          y: y + radius + LABEL_GAP + LABEL_FONT_SIZE,
          class: "lineage-sociogram-label",
          "data-node-id": node.id,
        },
        label
      )
    );
  }

  return { nodeEls, labelEls };
}

function starPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number
): string {
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    coords.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return coords.join(" ");
}

// ─── Edge Rendering ─────────────────────────────────────────

function getMarkerUrl(valence: string, direction: string): {
  start?: string;
  end?: string;
} {
  if (direction === "undirected") return {};

  const markerId =
    valence === "negative"
      ? "sociogram-arrow-negative"
      : valence === "neutral"
        ? "sociogram-arrow-neutral"
        : "sociogram-arrow";

  if (direction === "mutual") {
    return {
      start: `url(#${markerId})`,
      end: `url(#${markerId})`,
    };
  }

  return { end: `url(#${markerId})` };
}

function renderEdges(layout: SociogramLayoutResult): {
  edgeEls: string[];
  edgeLabelEls: string[];
} {
  const edgeEls: string[] = [];
  const edgeLabelEls: string[] = [];

  for (const layoutEdge of layout.edges) {
    const { edge, x1, y1, x2, y2 } = layoutEdge;
    const valenceClass = `lineage-sociogram-edge-${edge.valence}`;
    const markers = getMarkerUrl(edge.valence, edge.direction);
    const sw = edgeStrokeWidth(edge.weight);

    const attrs: Record<string, string | number | undefined> = {
      x1,
      y1,
      x2,
      y2,
      class: `lineage-sociogram-edge ${valenceClass}`,
      "stroke-width": sw,
      "data-from": edge.from,
      "data-to": edge.to,
    };

    if (markers.end) attrs["marker-end"] = markers.end;
    if (markers.start) attrs["marker-start"] = markers.start;

    edgeEls.push(line(attrs));

    // Edge label
    if (edge.label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      edgeLabelEls.push(
        text(
          { x: mx, y: my - 6, class: "lineage-sociogram-edge-label" },
          edge.label
        )
      );
    }
  }

  return { edgeEls, edgeLabelEls };
}

// ─── Group Background Labels ────────────────────────────────

function renderGroupLabels(layout: SociogramLayoutResult): string[] {
  const elements: string[] = [];
  const { ast } = layout;

  for (let gi = 0; gi < ast.groups.length; gi++) {
    const grp = ast.groups[gi];
    const memberNodes = layout.nodes.filter(
      (n) => n.node.group === grp.id
    );
    if (memberNodes.length === 0) continue;

    const color = grp.color ?? GROUP_PALETTE[gi % GROUP_PALETTE.length];
    const cx = memberNodes.reduce((s, n) => s + n.x, 0) / memberNodes.length;
    const minY = Math.min(...memberNodes.map((n) => n.y - n.radius));

    elements.push(
      text(
        {
          x: cx,
          y: minY - 14,
          class: "lineage-sociogram-group-label",
          fill: color,
        },
        grp.label ?? grp.id
      )
    );
  }

  return elements;
}

// ─── Main Renderer ──────────────────────────────────────────

export function renderSociogram(layout: SociogramLayoutResult): string {
  const { ast } = layout;

  const css = buildCSS(ast);
  const defsStr = buildDefs();

  const titleOffset = ast.title ? 30 : 0;
  const totalWidth = layout.width;
  const totalHeight = layout.height + titleOffset;

  const { edgeEls, edgeLabelEls } = renderEdges(layout);
  const { nodeEls, labelEls } = renderNodes(layout);
  const groupLabelEls = renderGroupLabels(layout);

  const titleEl = ast.title
    ? text(
        { x: totalWidth / 2, y: 20, class: "lineage-sociogram-title" },
        ast.title
      )
    : "";

  const transformY = titleOffset;
  const transform = transformY ? `translate(0,${transformY})` : undefined;

  const svgContent: string[] = [
    title(`Sociogram${ast.title ? `: ${ast.title}` : ""}`),
    desc(
      `Sociogram with ${ast.nodes.length} members and ${ast.edges.length} connections`
    ),
    el("style", {}, css),
    defsStr,
  ];

  if (titleEl) svgContent.push(titleEl);

  if (groupLabelEls.length > 0) {
    svgContent.push(
      group({ class: "lineage-sociogram-groups", transform }, groupLabelEls)
    );
  }

  svgContent.push(
    group({ class: "lineage-sociogram-edges", transform }, [
      ...edgeEls,
      ...edgeLabelEls,
    ])
  );

  svgContent.push(
    group({ class: "lineage-sociogram-nodes", transform }, nodeEls)
  );

  svgContent.push(
    group({ class: "lineage-sociogram-labels", transform }, labelEls)
  );

  return svgRoot(
    {
      class: "lineage-diagram lineage-sociogram",
      viewBox: `0 0 ${totalWidth} ${totalHeight}`,
      width: totalWidth,
      height: totalHeight,
    },
    svgContent
  );
}
