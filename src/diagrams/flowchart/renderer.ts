/**
 * Flowchart renderer — LayoutResult → SVG string.
 *
 * Produces semantic, themeable SVG per spec §12:
 *   - <title>/<desc> for a11y
 *   - data-* attributes for interaction hooks
 *   - CSS custom properties from resolveBaseTheme
 *   - Arrowhead markers in <defs>
 */

import type {
  FlowchartAST,
  FlowchartLayoutEdge,
  FlowchartLayoutNode,
  FlowchartLayoutResult,
  FlowchartEdge,
  FlowchartNode,
} from "../../core/types";
import {
  svgRoot,
  group,
  el,
  text as textEl,
  path as pathEl,
  title as titleEl,
  desc as descEl,
  defs,
} from "../../core/svg";
import { parseFlowchart } from "./parser";
import { layoutFlowchart, FC_CONST } from "./layout";
import { shapeSVG } from "./shapes";
import { resolveBaseTheme, type ThemeName } from "../../core/theme";

function stadiumFill(themeName: ThemeName): string {
  return themeName === "dark" ? "#1e3a5f" : themeName === "monochrome" ? "#ffffff" : "#dbeafe";
}
function diamondFill(themeName: ThemeName): string {
  return themeName === "dark" ? "#3a3a2a" : themeName === "monochrome" ? "#ffffff" : "#fef3c7";
}
function roundFill(themeName: ThemeName): string {
  return themeName === "dark" ? "#1f3a2a" : themeName === "monochrome" ? "#ffffff" : "#dcfce7";
}

const CSS_TEMPLATE = (themeName: ThemeName): string => {
  const t = resolveBaseTheme(themeName);
  return `
.sx-fc { background: ${t.bg}; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-fc-node { fill: ${t.fillMuted}; stroke: ${t.stroke}; stroke-width: 1.5; stroke-linejoin: round; }
.sx-fc-node-stadium { fill: ${stadiumFill(themeName)}; stroke: ${t.stroke}; }
.sx-fc-node-diamond { fill: ${diamondFill(themeName)}; stroke: ${t.stroke}; }
.sx-fc-node-round { fill: ${roundFill(themeName)}; stroke: ${t.stroke}; }
.sx-fc-node-text { fill: ${t.text}; font: 12px system-ui, -apple-system, "Segoe UI", sans-serif; }
/* Semantic class presets (applied via 'class A start') — override shape fills */
.sx-fc-class-start    > .sx-fc-node { fill: #f0ece0; stroke: #9a8b6a; }
.sx-fc-class-start    > .sx-fc-node-text { fill: #5c4e2e; font-weight: 600; }
.sx-fc-class-process  > .sx-fc-node { fill: #e8e4ff; stroke: #8b7dd8; }
.sx-fc-class-process  > .sx-fc-node-text { fill: #4c3a8f; font-weight: 600; }
.sx-fc-class-decision > .sx-fc-node { fill: #fde8c8; stroke: #d4985c; }
.sx-fc-class-decision > .sx-fc-node-text { fill: #8a5a1f; font-weight: 600; }
.sx-fc-class-success  > .sx-fc-node { fill: #d4f0e0; stroke: #7bc19a; }
.sx-fc-class-success  > .sx-fc-node-text { fill: #1e5a3a; font-weight: 600; }
.sx-fc-class-danger   > .sx-fc-node { fill: #fbe0dc; stroke: #d89181; }
.sx-fc-class-danger   > .sx-fc-node-text { fill: #8a3525; font-weight: 600; }
.sx-fc-class-neutral  > .sx-fc-node { fill: #ececec; stroke: #a0a0a0; }
.sx-fc-class-neutral  > .sx-fc-node-text { fill: #555555; font-weight: 600; }
.sx-fc-edge { fill: none; stroke: ${t.strokeMuted}; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.sx-fc-edge-thick { stroke: ${t.stroke}; stroke-width: 2.4; }
.sx-fc-edge-dashed { stroke-dasharray: 5 3; }
.sx-fc-edge-dotted { stroke-dasharray: 1.5 3; }
.sx-fc-edge-label { fill: ${t.textMuted}; font: 11px system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-fc-edge-label-bg { fill: ${t.bg}; fill-opacity: 0.96; stroke: ${t.strokeMuted}; stroke-width: 0.5; }
.sx-fc-title { fill: ${t.text}; font: 600 14px system-ui, -apple-system, "Segoe UI", sans-serif; }
`.trim();
};

const ARROW_MARKER = `
<marker id="sx-fc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
  <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="context-stroke"/>
</marker>
<marker id="sx-fc-arrow-o" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
  <circle cx="4" cy="4" r="3" fill="none" stroke="context-stroke" stroke-width="1"/>
</marker>
<marker id="sx-fc-arrow-x" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M1,1 L7,7 M1,7 L7,1" stroke="context-stroke" stroke-width="1.2"/>
</marker>
`.trim();

function edgeCssClass(edge: FlowchartEdge): string {
  const classes = ["sx-fc-edge"];
  if (edge.kind === "thick") classes.push("sx-fc-edge-thick");
  if (edge.kind === "dotted") classes.push("sx-fc-edge-dotted");
  return classes.join(" ");
}

function markerEndFor(edge: FlowchartEdge): string | undefined {
  switch (edge.arrowEnd) {
    case "arrow":
      return "url(#sx-fc-arrow)";
    case "circle":
      return "url(#sx-fc-arrow-o)";
    case "cross":
      return "url(#sx-fc-arrow-x)";
    default:
      return undefined;
  }
}

function markerStartFor(edge: FlowchartEdge): string | undefined {
  return edge.arrowStart === "arrow" ? "url(#sx-fc-arrow)" : undefined;
}

function renderNode(ln: FlowchartLayoutNode): string {
  const n: FlowchartNode = ln.node;
  const shapeEl = shapeSVG(n.shape, ln.width, ln.height);
  const label = textEl(
    {
      x: ln.width / 2,
      y: ln.height / 2,
      class: "sx-fc-node-text",
      "text-anchor": "middle",
      "dominant-baseline": "central",
    },
    n.label
  );
  const nodeTitle = titleEl(n.label);
  const classAttr = ["sx-fc-node-g", ...(n.classes ?? []).map((c) => `sx-fc-class-${c}`)].join(" ");
  return group(
    {
      "data-node-id": n.id,
      "data-shape": n.shape,
      "data-layer": ln.layer,
      "data-classes": n.classes?.join(" "),
      class: classAttr,
      transform: `translate(${fmt(ln.x)} ${fmt(ln.y)})`,
    },
    [shapeEl, label, nodeTitle]
  );
}

function renderEdge(le: FlowchartLayoutEdge): string {
  const e = le.edge;
  const attrs: Record<string, string | number | undefined> = {
    d: le.path,
    class: edgeCssClass(e),
  };
  const me = markerEndFor(e);
  const ms = markerStartFor(e);
  if (me) attrs["marker-end"] = me;
  if (ms) attrs["marker-start"] = ms;
  const p = pathEl(attrs);

  const labelEl =
    e.label && le.labelAnchor
      ? renderEdgeLabel(
          e.label,
          le.labelAnchor.x,
          le.labelAnchor.y,
          le.labelAnchor.textAnchor ?? "middle"
        )
      : "";

  const edgeTitle = titleEl(
    e.label ? `${e.from} → ${e.to}: ${e.label}` : `${e.from} → ${e.to}`
  );

  return group(
    {
      "data-edge-id": e.id ?? `${e.from}->${e.to}`,
      "data-kind": e.kind,
      "data-from": e.from,
      "data-to": e.to,
    },
    [p, edgeTitle, labelEl].filter((s) => s.length > 0)
  );
}

function renderEdgeLabel(
  label: string,
  cx: number,
  cy: number,
  textAnchor: "start" | "middle" | "end"
): string {
  const t = textEl(
    {
      x: cx,
      y: cy,
      class: "sx-fc-edge-label",
      "text-anchor": textAnchor,
      "dominant-baseline": "central",
    },
    label
  );
  return group({ class: "sx-fc-edge-label-g" }, [t]);
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

export function renderFlowchartAST(
  ast: FlowchartAST,
  themeName: ThemeName = "default"
): string {
  const layout: FlowchartLayoutResult = layoutFlowchart(ast);

  const nodeSvg = layout.nodes.map(renderNode);
  const edgeSvg = layout.edges.map(renderEdge);

  const titleBlock = ast.title
    ? textEl(
        {
          x: layout.width / 2,
          y: 16,
          class: "sx-fc-title",
          "text-anchor": "middle",
        },
        ast.title
      )
    : "";

  const inner: string[] = [
    titleEl(ast.title ? `${ast.title} — Flowchart` : "Flowchart"),
    descEl(
      `Flowchart with ${ast.nodes.length} node${ast.nodes.length === 1 ? "" : "s"} and ${ast.edges.length} edge${ast.edges.length === 1 ? "" : "s"}.`
    ),
    el("style", {}, CSS_TEMPLATE(themeName)),
    defs([ARROW_MARKER]),
  ];
  if (titleBlock) inner.push(titleBlock);
  inner.push(group({ class: "sx-fc-edges" }, edgeSvg));
  inner.push(group({ class: "sx-fc-nodes" }, nodeSvg));

  // Extra top padding when a title is present
  const topPad = ast.title ? 24 : 0;
  const totalH = layout.height + topPad;

  return svgRoot(
    {
      viewBox: `0 0 ${fmt(layout.width)} ${fmt(totalH)}`,
      width: fmt(layout.width),
      height: fmt(totalH),
      class: "sx-fc",
      "data-diagram-type": "flowchart",
      "data-direction": layout.direction,
      role: "graphics-document",
    },
    [
      ...inner.slice(0, 4),
      ...(titleBlock ? [titleBlock] : []),
      group(
        { transform: topPad > 0 ? `translate(0 ${topPad})` : "translate(0 0)" },
        [
          group({ class: "sx-fc-edges" }, edgeSvg),
          group({ class: "sx-fc-nodes" }, nodeSvg),
        ]
      ),
    ]
  );
}

export function renderFlowchart(text: string, themeName: ThemeName = "default"): string {
  const ast = parseFlowchart(text);
  return renderFlowchartAST(ast, themeName);
}

// Keep FC_CONST reachable via renderer for test convenience.
export { FC_CONST };
