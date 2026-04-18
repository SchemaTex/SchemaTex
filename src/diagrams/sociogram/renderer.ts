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
import { cssCustomProperties, resolveBaseTheme, FONT_SIZE, STROKE_WIDTH, type BaseTheme } from "../../core/theme";

// ─── Constants ──────────────────────────────────────────────

const LABEL_GAP = 4;
const LABEL_FONT_SIZE = 11;

function valenceColors(t: BaseTheme) {
  return { positive: t.positive, negative: t.negative, neutral: t.neutral };
}

function roleFills(t: BaseTheme) {
  return { star: t.warn, isolate: t.fillMuted, rejected: t.negative };
}

// ─── CSS ────────────────────────────────────────────────────

function buildCSS(ast: SociogramAST, t: BaseTheme): string {
  const vc = valenceColors(t);
  const rf = roleFills(t);
  const groupColors = ast.groups.map((g, i) => {
    const color = g.color ?? t.palette[i % t.palette.length];
    return `.schematex-sociogram-group-${g.id} { fill: ${color}; stroke: ${color}; }`;
  });

  return `
.schematex-sociogram {${cssCustomProperties(t)}
  font-family: system-ui, -apple-system, sans-serif;
  background: ${t.bg};
}
.schematex-sociogram-node { fill: ${t.accent}; stroke: ${t.accent}; stroke-width: ${STROKE_WIDTH.medium}; }
.schematex-sociogram-node-star { fill: ${rf.star}; stroke: ${t.warn}; stroke-width: ${STROKE_WIDTH.thick}; }
.schematex-sociogram-node-isolate { fill: ${rf.isolate}; stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.medium}; stroke-dasharray: 4 3; }
.schematex-sociogram-node-neglectee { fill: ${t.fillMuted}; stroke: ${t.accent}; stroke-width: ${STROKE_WIDTH.medium}; stroke-dasharray: 4 3; }
.schematex-sociogram-node-rejected { fill: ${rf.rejected}; stroke: ${t.negative}; stroke-width: ${STROKE_WIDTH.medium}; stroke-dasharray: 4 3; }
.schematex-sociogram-edge { stroke-linecap: round; }
.schematex-sociogram-edge-positive { stroke: ${vc.positive}; }
.schematex-sociogram-edge-negative { stroke: ${vc.negative}; stroke-dasharray: 6 3; }
.schematex-sociogram-edge-neutral { stroke: ${vc.neutral}; stroke-dasharray: 2 3; }
.schematex-sociogram-label { font-size: ${LABEL_FONT_SIZE}px; fill: ${t.text}; text-anchor: middle; }
.schematex-sociogram-edge-label { font-size: ${FONT_SIZE.small}px; fill: ${t.textMuted}; text-anchor: middle; }
.schematex-sociogram-title { font-size: ${FONT_SIZE.title}px; font-weight: bold; fill: ${t.text}; text-anchor: middle; }
.schematex-sociogram-star-badge { font-size: 10px; fill: ${t.warn}; }
.schematex-sociogram-group-label { font-size: 13px; font-weight: bold; fill-opacity: 0.7; text-anchor: middle; }
${groupColors.join("\n")}
`.trim();
}

// ─── Defs (Arrow Markers) ───────────────────────────────────

function buildDefs(t: BaseTheme): string {
  const vc = valenceColors(t);
  const markers = [
    { id: "sociogram-arrow", fill: vc.positive },
    { id: "sociogram-arrow-negative", fill: vc.negative },
    { id: "sociogram-arrow-neutral", fill: vc.neutral },
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
  if (!role) return "schematex-sociogram-node";
  switch (role) {
    case "star": return "schematex-sociogram-node schematex-sociogram-node-star";
    case "isolate": return "schematex-sociogram-node schematex-sociogram-node-isolate";
    case "neglectee": return "schematex-sociogram-node schematex-sociogram-node-neglectee";
    case "rejected": return "schematex-sociogram-node schematex-sociogram-node-rejected";
    case "bridge": return "schematex-sociogram-node";
    default: return "schematex-sociogram-node";
  }
}

function getNodeFill(
  node: SociogramLayoutNode,
  ast: SociogramAST,
  t: BaseTheme
): string | undefined {
  const role = node.computedRole ?? node.node.role;
  const rf = roleFills(t);

  if (ast.config.coloring === "role" && role) {
    return rf[role as keyof typeof rf];
  }

  if (ast.config.coloring === "group" && node.node.group) {
    const gIdx = ast.groups.findIndex((g) => g.id === node.node.group);
    if (gIdx >= 0) {
      return ast.groups[gIdx].color ?? t.palette[gIdx % t.palette.length];
    }
  }

  return undefined;
}

function renderNodes(
  layout: SociogramLayoutResult,
  t: BaseTheme
): { nodeEls: string[]; labelEls: string[] } {
  const nodeEls: string[] = [];
  const labelEls: string[] = [];
  const { ast } = layout;

  for (const layoutNode of layout.nodes) {
    const { node, x, y, radius, computedRole } = layoutNode;
    const role = computedRole ?? node.role;
    const cls = getNodeClass(role);
    const fill = getNodeFill(layoutNode, ast, t);

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
          fill: t.warn,
          class: "schematex-sociogram-star-badge",
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
          class: "schematex-sociogram-label",
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
    const valenceClass = `schematex-sociogram-edge-${edge.valence}`;
    const markers = getMarkerUrl(edge.valence, edge.direction);
    const sw = edgeStrokeWidth(edge.weight);

    const attrs: Record<string, string | number | undefined> = {
      x1,
      y1,
      x2,
      y2,
      class: `schematex-sociogram-edge ${valenceClass}`,
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
          { x: mx, y: my - 6, class: "schematex-sociogram-edge-label" },
          edge.label
        )
      );
    }
  }

  return { edgeEls, edgeLabelEls };
}

// ─── Group Background Labels ────────────────────────────────

function renderGroupLabels(layout: SociogramLayoutResult, t: BaseTheme): string[] {
  const elements: string[] = [];
  const { ast } = layout;

  for (let gi = 0; gi < ast.groups.length; gi++) {
    const grp = ast.groups[gi];
    const memberNodes = layout.nodes.filter(
      (n) => n.node.group === grp.id
    );
    if (memberNodes.length === 0) continue;

    const color = grp.color ?? t.palette[gi % t.palette.length];
    const cx = memberNodes.reduce((s, n) => s + n.x, 0) / memberNodes.length;
    const minY = Math.min(...memberNodes.map((n) => n.y - n.radius));

    elements.push(
      text(
        {
          x: cx,
          y: minY - 14,
          class: "schematex-sociogram-group-label",
          fill: color,
        },
        grp.label ?? grp.id
      )
    );
  }

  return elements;
}

// ─── Main Renderer ──────────────────────────────────────────

export function renderSociogram(
  layout: SociogramLayoutResult,
  options: { theme?: string } = {}
): string {
  const { ast } = layout;
  const t = resolveBaseTheme(options.theme ?? "default");

  const css = buildCSS(ast, t);
  const defsStr = buildDefs(t);

  const titleOffset = ast.title ? 30 : 0;
  const totalWidth = layout.width;
  const totalHeight = layout.height + titleOffset;

  const { edgeEls, edgeLabelEls } = renderEdges(layout);
  const { nodeEls, labelEls } = renderNodes(layout, t);
  const groupLabelEls = renderGroupLabels(layout, t);

  const titleEl = ast.title
    ? text(
        { x: totalWidth / 2, y: 20, class: "schematex-sociogram-title" },
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
      group({ class: "schematex-sociogram-groups", transform }, groupLabelEls)
    );
  }

  svgContent.push(
    group({ class: "schematex-sociogram-edges", transform }, [
      ...edgeEls,
      ...edgeLabelEls,
    ])
  );

  svgContent.push(
    group({ class: "schematex-sociogram-nodes", transform }, nodeEls)
  );

  svgContent.push(
    group({ class: "schematex-sociogram-labels", transform }, labelEls)
  );

  return svgRoot(
    {
      class: "schematex-diagram schematex-sociogram",
      viewBox: `0 0 ${totalWidth} ${totalHeight}`,
      width: totalWidth,
      height: totalHeight,
    },
    svgContent
  );
}
