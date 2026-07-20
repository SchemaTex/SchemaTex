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
  FlowchartLayoutCluster,
  FlowchartLayoutEdge,
  FlowchartLayoutNode,
  FlowchartLayoutResult,
  FlowchartEdge,
  FlowchartNode,
  RenderConfig,
  SceneItem,
} from "../../core/types";
import {
  svgRoot,
  group,
  el,
  text as textEl,
  multilineText,
  path as pathEl,
  rect,
  title as titleEl,
  desc as descEl,
  defs,
} from "../../core/svg";
import { parseFlowchart } from "./parser";
import { layoutFlowchart, FC_CONST } from "./layout";
import { resolveSceneTitle } from "../../core/title-scene";
import { shapeSVG } from "./shapes";
import { renderIcon, hasIcon, ICON_SIZE, ICON_GAP } from "./icons";
import { resolveFlowchartTheme, type ThemeName } from "../../core/theme";

const CSS_TEMPLATE = (themeName: ThemeName): string => {
  const t = resolveFlowchartTheme(themeName);
  const c = t.classes;
  return `
.sx-fc { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-fc-node { fill: ${t.fillMuted}; stroke: ${t.stroke}; stroke-width: 1.5; stroke-linejoin: round; }
.sx-fc-node-stadium { fill: ${t.stadiumFill}; stroke: ${t.stroke}; }
.sx-fc-node-diamond { fill: ${t.diamondFill}; stroke: ${t.stroke}; }
.sx-fc-node-round { fill: ${t.roundFill}; stroke: ${t.stroke}; }
.sx-fc-node-text { fill: ${t.text}; font: 12px system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-fc-icon { stroke: ${t.text}; fill: none; }
.sx-fc-icon-fill { fill: ${t.text}; stroke: none; }
/* Semantic class presets (applied via 'class A start') — override shape fills */
.sx-fc-class-start    > .sx-fc-node { fill: ${c.start.fill}; stroke: ${c.start.stroke}; }
.sx-fc-class-start    > .sx-fc-node-text { fill: ${c.start.text}; font-weight: 600; }
.sx-fc-class-process  > .sx-fc-node { fill: ${c.process.fill}; stroke: ${c.process.stroke}; }
.sx-fc-class-process  > .sx-fc-node-text { fill: ${c.process.text}; font-weight: 600; }
.sx-fc-class-decision > .sx-fc-node { fill: ${c.decision.fill}; stroke: ${c.decision.stroke}; }
.sx-fc-class-decision > .sx-fc-node-text { fill: ${c.decision.text}; font-weight: 600; }
.sx-fc-class-success  > .sx-fc-node { fill: ${c.success.fill}; stroke: ${c.success.stroke}; }
.sx-fc-class-success  > .sx-fc-node-text { fill: ${c.success.text}; font-weight: 600; }
.sx-fc-class-danger   > .sx-fc-node { fill: ${c.danger.fill}; stroke: ${c.danger.stroke}; }
.sx-fc-class-danger   > .sx-fc-node-text { fill: ${c.danger.text}; font-weight: 600; }
.sx-fc-class-neutral  > .sx-fc-node { fill: ${c.neutral.fill}; stroke: ${c.neutral.stroke}; }
.sx-fc-class-neutral  > .sx-fc-node-text { fill: ${c.neutral.text}; font-weight: 600; }
.sx-fc-edge { fill: none; stroke: ${t.neutral}; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.sx-fc-edge-thick { stroke: ${t.stroke}; stroke-width: 2.4; }
.sx-fc-edge-dashed { stroke-dasharray: 5 3; }
.sx-fc-edge-dotted { stroke-dasharray: 1.5 3; }
.sx-fc-edge-label { fill: ${t.textMuted}; font: 11px system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-fc-edge-label-bg { fill: ${t.bg}; fill-opacity: 0.96; stroke: ${t.neutral}; stroke-width: 0.5; }
.sx-fc-title { fill: ${t.text}; font: 700 16px system-ui, -apple-system, "Segoe UI", sans-serif; }
/* Shape sub-elements */
.sx-fc-node-subline { fill: none; stroke: ${t.stroke}; stroke-width: 1.5; }
.sx-fc-node-arc { fill: none; stroke: ${t.stroke}; stroke-width: 1.5; }
.sx-fc-node-ring { fill: none; stroke: ${t.stroke}; stroke-width: 1.8; }
/* Cluster (subgraph) */
.sx-fc-cluster { fill: ${t.fillMuted}; fill-opacity: 0.35; stroke: ${t.neutral}; stroke-width: 1.5; stroke-dasharray: 5,3; }
.sx-fc-cluster-title { fill: ${t.textMuted}; font: 500 11px system-ui, -apple-system, "Segoe UI", sans-serif; }
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

function renderCluster(lc: FlowchartLayoutCluster, scene?: SceneItem[]): string {
  const sg = lc.subgraph;
  const bg = rect({ x: lc.x, y: lc.y, width: lc.width, height: lc.height, rx: 8, class: "sx-fc-cluster" });
  const label = textEl(
    { x: lc.x + 12, y: lc.y + 15, class: "sx-fc-cluster-title" },
    sg.label
  );
  const key = `group:${sg.id}`;
  scene?.push({
    key,
    kind: "group",
    semanticId: sg.id,
    label: sg.label,
    bbox: { x: lc.x, y: lc.y, width: lc.width, height: lc.height },
    editable: { label: false, position: "none" },
  });
  return group(
    {
      "data-cluster-id": sg.id,
      "data-depth": lc.depth,
      "data-sx-key": scene ? key : undefined,
      class: "sx-fc-cluster-g",
    },
    [bg, label]
  );
}

function renderNode(
  ln: FlowchartLayoutNode,
  position: SceneItem["editable"]["position"],
  scene?: SceneItem[]
): string {
  const n: FlowchartNode = ln.node;
  const key = `node:${n.id}`;
  const shapeEl = shapeSVG(n.shape, ln.width, ln.height);

  // Icon nodes: glyph sits in a reserved band at the top, label centred in the
  // remaining area below. Icon-less nodes keep the label vertically centred.
  const iconBand = hasIcon(n.icon) ? ICON_SIZE + ICON_GAP : 0;
  let iconEl = "";
  if (iconBand > 0) {
    iconEl = group(
      { transform: `translate(${fmt(ln.width / 2)} ${fmt(8 + ICON_SIZE / 2)})` },
      [renderIcon(n.icon!)]
    );
  }
  const labelCy = iconBand > 0 ? iconBand + (ln.height - iconBand) / 2 : ln.height / 2;
  const label = multilineText(
    {
      x: ln.width / 2,
      y: labelCy,
      class: "sx-fc-node-text",
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "data-sx-role": scene && n.labelSourceRange ? "label" : undefined,
    },
    n.label
  );
  const plainLabel = n.label
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[bi]>/gi, "");
  const nodeTitle = titleEl(plainLabel);
  const classAttr = ["sx-fc-node-g", ...(n.classes ?? []).map((c) => `sx-fc-class-${c}`)].join(" ");
  scene?.push({
    key,
    kind: "node",
    semanticId: n.id,
    label: n.label,
    sourceRange: n.labelSourceRange,
    bbox: { x: ln.x, y: ln.y, width: ln.width, height: ln.height },
    editable: { label: n.labelSourceRange !== undefined, position },
  });
  return group(
    {
      "data-node-id": n.id,
      "data-shape": n.shape,
      "data-layer": ln.layer,
      "data-classes": n.classes?.join(" "),
      "data-sx-key": scene ? key : undefined,
      class: classAttr,
      transform: `translate(${fmt(ln.x)} ${fmt(ln.y)})`,
    },
    [shapeEl, iconEl, label, nodeTitle].filter((sEl) => sEl.length > 0)
  );
}

function renderEdge(le: FlowchartLayoutEdge, scene?: SceneItem[]): string {
  const e = le.edge;
  const index = le.index ?? 0;
  const key = `edge:${index}`;
  const labelKey = `${key}:label`;
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
          le.labelAnchor.textAnchor ?? "middle",
          scene ? labelKey : undefined
        )
      : "";

  const edgeTitle = titleEl(
    e.label ? `${e.from} → ${e.to}: ${e.label}` : `${e.from} → ${e.to}`
  );

  scene?.push({
    key,
    kind: "edge",
    semanticId: e.id,
    path: le.path,
    editable: { label: false, position: "none" },
  });
  if (scene && e.label && le.labelAnchor) {
    const labelWidth = Math.max(20, e.label.length * 6.5 + 10);
    const textAnchor = le.labelAnchor.textAnchor ?? "middle";
    const x = le.labelAnchor.x - (textAnchor === "start" ? 0 : textAnchor === "end" ? labelWidth : labelWidth / 2);
    scene.push({
      key: labelKey,
      kind: "label",
      label: e.label,
      sourceRange: e.labelSourceRange,
      bbox: { x, y: le.labelAnchor.y - 8, width: labelWidth, height: 16 },
      editable: { label: e.labelSourceRange !== undefined, position: "none" },
    });
  }
  return group(
    {
      "data-edge-id": e.id ?? `${e.from}->${e.to}`,
      "data-edge-index": le.index,
      "data-kind": e.kind,
      "data-from": e.from,
      "data-to": e.to,
      "data-sx-key": scene ? key : undefined,
    },
    [p, edgeTitle, labelEl].filter((s) => s.length > 0)
  );
}

function renderEdgeLabel(
  label: string,
  cx: number,
  cy: number,
  textAnchor: "start" | "middle" | "end",
  sceneKey?: string
): string {
  // Approximate pill size — matches entity diagram edge label style.
  const w = Math.max(20, label.length * 6.5 + 10);
  const h = 16;
  const rx = cx - (textAnchor === "start" ? 0 : textAnchor === "end" ? w : w / 2);
  const ry = cy - h / 2;
  const bg = rect({
    x: rx,
    y: ry,
    width: w,
    height: h,
    rx: 3,
    class: "sx-fc-edge-label-bg",
  });
  const t = textEl(
    {
      x: cx,
      y: cy,
      class: "sx-fc-edge-label",
      "text-anchor": textAnchor,
      "dominant-baseline": "central",
      "data-sx-key": sceneKey,
      "data-sx-role": sceneKey ? "label" : undefined,
    },
    label
  );
  return group({ class: "sx-fc-edge-label-g" }, [bg, t]);
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

export function renderFlowchartAST(
  ast: FlowchartAST,
  themeName: ThemeName = "default",
  config?: RenderConfig
): string {
  const layout: FlowchartLayoutResult = layoutFlowchart(ast, config?.__pins);
  const position = "free" as const;

  const clusterSvg = layout.clusters.map((cluster) => renderCluster(cluster, config?.__scene));
  const nodeSvg = layout.nodes.map((node) => renderNode(node, position, config?.__scene));
  const edgeSvg = layout.edges.map((edge) => renderEdge(edge, config?.__scene));

  // Per-node style overrides (from `style nodeId fill:#f9f,...` statements)
  const nodeStyleOverrides = ast.nodes
    .filter((n) => n.style && Object.keys(n.style).length > 0)
    .map((n) => {
      const props = Object.entries(n.style!)
        .map(([k, v]) => `${k}:${v}`)
        .join(";");
      return `g[data-node-id="${n.id}"] .sx-fc-node { ${props} }`;
    })
    .join("\n");

  // classDef overrides (from `classDef name fill:#xxx,...` statements)
  const classDefOverrides = ast.classDefs
    .map((cd) => {
      const props = Object.entries(cd.props)
        .map(([k, v]) => `${k}:${v}`)
        .join(";");
      return `.sx-fc-class-${cd.id} > .sx-fc-node { ${props} }`;
    })
    .join("\n");

  // linkStyle overrides (from `linkStyle 1,5,6 stroke:#ff0000,...` statements).
  // Edge index is the declaration order in `ast.edges`.
  const linkStyleOverrides = Array.from(ast.linkStyles.entries())
    .map(([idx, props]) => {
      const cssProps = Object.entries(props)
        .map(([k, v]) => `${k}:${v}`)
        .join(";");
      return `g[data-edge-index="${idx}"] path { ${cssProps} }`;
    })
    .join("\n");

  const titleScene = ast.title
    ? resolveSceneTitle(
        ast.title,
        ast.titleSourceRange,
        (layout.viewBox?.x ?? 0) + layout.width / 2,
        16,
        config
      )
    : undefined;
  const titleBlock = ast.title && titleScene
    ? textEl(
        {
          x: titleScene.x,
          y: titleScene.y,
          class: "sx-fc-title",
          "text-anchor": "middle",
          ...titleScene.attrs,
        },
        ast.title
      )
    : "";

  const cssOverrides = [nodeStyleOverrides, classDefOverrides, linkStyleOverrides]
    .filter((s) => s.length > 0)
    .join("\n");

  const headMeta: string[] = [
    titleEl(ast.title ? `${ast.title} — Flowchart` : "Flowchart"),
    descEl(
      `Flowchart with ${ast.nodes.length} node${ast.nodes.length === 1 ? "" : "s"} and ${ast.edges.length} edge${ast.edges.length === 1 ? "" : "s"}.`
    ),
    el("style", {}, CSS_TEMPLATE(themeName) + (cssOverrides ? "\n" + cssOverrides : "")),
    defs([ARROW_MARKER]),
  ];
  // Content that participates in the layout → gets translated down when a
  // title reserves top space.
  const content: string[] = [];
  // Render order: clusters (lowest z) → edges → nodes (highest z)
  if (clusterSvg.length > 0) content.push(group({ class: "sx-fc-clusters" }, clusterSvg));
  content.push(group({ class: "sx-fc-edges" }, edgeSvg));
  content.push(group({ class: "sx-fc-nodes" }, nodeSvg));

  // Extra top padding when a title is present. Clusters can extend above
  // layout origin by CLUSTER_PAD+CLUSTER_TITLE_H (~44px), so title needs
  // extra clearance to avoid overlapping subgraph borders/labels.
  const hasClusters = layout.clusters.length > 0;
  const topPad = ast.title ? (hasClusters ? 56 : 24) : 0;
  const totalH = layout.height + topPad;
  const viewBox = layout.viewBox ?? { x: 0, y: 0, width: layout.width, height: layout.height };

  // Retitled title sits in the un-translated band at top, centered.
  const titleSvg = titleBlock;

  return svgRoot(
    {
      viewBox: `${fmt(viewBox.x)} ${fmt(viewBox.y)} ${fmt(viewBox.width)} ${fmt(viewBox.height + topPad)}`,
      width: fmt(layout.width),
      height: fmt(totalH),
      class: "sx-fc",
      "data-diagram-type": "flowchart",
      "data-direction": layout.direction,
      role: "graphics-document",
    },
    topPad > 0
      ? config?.__scene
        ? [...headMeta, group({ transform: `translate(0 ${topPad})` }, content), titleSvg]
        : [...headMeta, titleSvg, group({ transform: `translate(0 ${topPad})` }, content)]
      : config?.__scene
        ? [...headMeta, ...content, titleSvg]
        : [...headMeta, titleSvg, ...content]
  );
}

export function renderFlowchart(
  text: string,
  themeName: ThemeName = "default",
  config?: RenderConfig
): string {
  const ast = parseFlowchart(text);
  return renderFlowchartAST(ast, themeName, config);
}

// Keep FC_CONST reachable via renderer for test convenience.
export { FC_CONST };
