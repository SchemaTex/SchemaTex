import { circle, defs, el, escapeXml, group, line, multilineText, path, polygon, rect, svgRoot, text } from "../../core/svg";
import type { RenderConfig, SceneItem } from "../../core/types";
import { resolveStateTheme, type StateTokens, type ResolvedTheme } from "../../core/theme";
import { estimateMaxLineWidth } from "../../core/text-metrics";
import { layoutStateDiagram } from "./layout";
import { parseStateDiagram } from "./parser";
import { resolveSceneTitle } from "../../core/title-scene";
import type {
  StateActivity,
  StateDiagramAST,
  StateLayoutCluster,
  StateLayoutEdge,
  StateLayoutNode,
  StateLayoutNote,
  StateLayoutResult,
} from "./types";

const ARROW_MARKER_ID = "lt-state-arrow";

type StateTheme = ResolvedTheme<StateTokens>;

function buildStyle(t: StateTheme): string {
  return `
.lt-state-body { fill: ${t.stateFill}; stroke: ${t.stateStroke}; stroke-width: 1.6; }
.lt-state-name { font: 600 12px system-ui, sans-serif; fill: ${t.stateText}; }
.lt-state-div  { stroke: ${t.stateStroke}; stroke-width: 1; }
.lt-state-activity { font: 11px ui-monospace, monospace; fill: ${t.activityText}; }

.lt-composite-body { fill: ${t.compositeFill}; stroke: ${t.stateStroke}; stroke-width: 1.6; }
.lt-composite-title { font: 600 12px system-ui, sans-serif; fill: ${t.stateText}; }
.lt-composite-titlebar { fill: ${t.compositeTitlebar}; stroke: ${t.stateStroke}; stroke-width: 1; }
.lt-region-div { stroke: ${t.regionDiv}; stroke-width: 1; stroke-dasharray: 6 4; }

.lt-ps-initial { fill: ${t.psInk}; }
.lt-ps-final-outer { fill: ${t.stateFill}; stroke: ${t.psInk}; stroke-width: 1.6; }
.lt-ps-final-inner { fill: ${t.psInk}; }
.lt-ps-choice { fill: ${t.stateFill}; stroke: ${t.psInk}; stroke-width: 1.6; }
.lt-ps-junction { fill: ${t.psInk}; }
.lt-ps-bar { fill: ${t.psInk}; }
.lt-ps-history-body { fill: ${t.stateFill}; stroke: ${t.psInk}; stroke-width: 1.6; }
.lt-ps-history-text { font: 600 11px serif; fill: ${t.psInk}; }
.lt-ps-terminate { stroke: ${t.psInk}; stroke-width: 2; }
.lt-ps-entrypoint { fill: ${t.stateFill}; stroke: ${t.psInk}; stroke-width: 1.6; }
.lt-ps-exitpoint  { fill: ${t.stateFill}; stroke: ${t.psInk}; stroke-width: 1.6; }

.lt-transition { stroke: ${t.transitionStroke}; stroke-width: 1.4; fill: none; }
.lt-transition-label { font: 11px system-ui, sans-serif; fill: ${t.transitionLabel}; }
.lt-transition-label-bg { fill: ${t.labelBg}; opacity: 0.92; }

.lt-note-body { fill: ${t.noteFill}; stroke: ${t.noteStroke}; stroke-width: 1; }
.lt-note-text { font: 11px system-ui, sans-serif; fill: ${t.noteText}; }
.lt-note-leader { stroke: ${t.noteStroke}; stroke-width: 1; stroke-dasharray: 3 3; fill: none; }

.lt-title { font: 700 16px system-ui, sans-serif; fill: ${t.stateText}; }
`;
}

function renderArrowMarker(t: StateTheme): string {
  return el(
    "marker",
    {
      id: ARROW_MARKER_ID,
      markerWidth: 10,
      markerHeight: 10,
      refX: 9,
      refY: 3,
      orient: "auto",
      markerUnits: "strokeWidth",
    },
    [polygon({ points: "0,0 10,3 0,6", fill: t.transitionStroke })]
  );
}

// ── Activity rendering helper ───────────────────────────────

function activityText(a: StateActivity): string {
  if (a.kind === "entry" || a.kind === "exit" || a.kind === "do") {
    return `${a.kind} / ${a.action ?? ""}`;
  }
  const parts: string[] = [];
  if (a.trigger) parts.push(a.trigger);
  if (a.guard) parts.push(`[${a.guard}]`);
  let s = parts.join(" ");
  if (a.action) s = s ? `${s} / ${a.action}` : `/ ${a.action}`;
  return s;
}

// ── Simple state ────────────────────────────────────────────

function renderSimple(
  node: StateLayoutNode,
  position: SceneItem["editable"]["position"],
  scene?: SceneItem[]
): string {
  const { x, y, width, height } = node;
  const children: string[] = [
    rect({ x, y, width, height, rx: 8, ry: 8, class: "lt-state-body" }),
  ];
  const label = node.node.label || node.id;
  const labelLines = node.labelLines?.length ? node.labelLines : [label];
  const labelText = labelLines.join("\n");

  if (node.node.activities.length === 0) {
    children.push(
      multilineText(
        { x: x + width / 2, y: y + height / 2 + 4, "text-anchor": "middle", class: "lt-state-name", "data-sx-role": scene && node.node.labelSourceRange ? "label" : undefined },
        labelText,
        15
      )
    );
  } else {
    const nameBandHeight = labelLines.length * 15 + 9;
    children.push(
      multilineText(
        { x: x + width / 2, y: y + nameBandHeight / 2 + 3, "text-anchor": "middle", class: "lt-state-name", "data-sx-role": scene && node.node.labelSourceRange ? "label" : undefined },
        labelText,
        15
      )
    );
    children.push(
      line({ x1: x, y1: y + nameBandHeight, x2: x + width, y2: y + nameBandHeight, class: "lt-state-div" })
    );
    let cy = y + nameBandHeight + 14;
    for (const a of node.node.activities) {
      children.push(text({ x: x + 8, y: cy, class: "lt-state-activity" }, activityText(a)));
      cy += 14;
    }
  }
  const key = `node:${node.id}`;
  scene?.push({
    key,
    kind: "node",
    semanticId: node.id,
    label,
    sourceRange: node.node.labelSourceRange,
    bbox: { x, y, width, height },
    editable: { label: node.node.labelSourceRange !== undefined, position },
  });
  return group({ class: "lt-state lt-simple", "data-id": node.id, "data-sx-key": scene ? key : undefined }, children);
}

// ── Composite cluster ───────────────────────────────────────

function renderComposite(c: StateLayoutCluster, scene?: SceneItem[]): string {
  const { x, y, width, height } = c;
  const titleBarH = 22;
  const acts = c.state.activities;
  const actsH = acts.length ? acts.length * 14 + 6 : 0;

  const parts: string[] = [
    rect({ x, y, width, height, rx: 10, ry: 10, class: "lt-composite-body" }),
    // Title bar background — only the top strip
    path({
      d: `M ${x + 1} ${y + titleBarH} L ${x + width - 1} ${y + titleBarH}`,
      class: "lt-state-div",
    }),
    text(
      { x: x + 12, y: y + 16, class: "lt-composite-title" },
      c.state.label || c.state.id
    ),
  ];

  // Activity compartment beneath title (entry/exit/do)
  if (acts.length) {
    let cy = y + titleBarH + 14;
    for (const a of acts) {
      parts.push(text({ x: x + 12, y: cy, class: "lt-state-activity" }, activityText(a)));
      cy += 14;
    }
    parts.push(
      path({
        d: `M ${x + 1} ${y + titleBarH + actsH} L ${x + width - 1} ${y + titleBarH + actsH}`,
        class: "lt-state-div",
      })
    );
  }

  // Region dividers if requested
  if (c.regionDividers) {
    for (const yy of c.regionDividers) {
      parts.push(
        line({ x1: x + 1, y1: yy, x2: x + width - 1, y2: yy, class: "lt-region-div" })
      );
    }
  }

  const key = `group:${c.id}`;
  scene?.push({
    key,
    kind: "group",
    semanticId: c.id,
    label: c.state.label || c.state.id,
    bbox: { x, y, width, height },
    editable: { label: false, position: "none" },
  });
  return group(
    { class: "lt-state lt-composite", "data-id": c.id, "data-sx-key": scene ? key : undefined },
    parts
  );
}

// ── Pseudo-states ───────────────────────────────────────────

function renderPseudo(node: StateLayoutNode): string {
  const cx = node.cx;
  const cy = node.cy;
  const k = node.node.pseudoKind;
  switch (k) {
    case "initial":
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": "initial" },
        [circle({ cx, cy, r: 8, class: "lt-ps-initial" })]
      );
    case "final":
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": "final" },
        [
          circle({ cx, cy, r: 11, class: "lt-ps-final-outer" }),
          circle({ cx, cy, r: 6, class: "lt-ps-final-inner" }),
        ]
      );
    case "choice": {
      const r = 14;
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": "choice" },
        [
          polygon({
            points: `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`,
            class: "lt-ps-choice",
          }),
        ]
      );
    }
    case "junction":
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": "junction" },
        [circle({ cx, cy, r: 6, class: "lt-ps-junction" })]
      );
    case "fork":
    case "join":
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": k },
        [rect({ x: node.x, y: node.y, width: node.width, height: node.height, rx: 2, ry: 2, class: "lt-ps-bar" })]
      );
    case "history":
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": "history" },
        [
          circle({ cx, cy, r: 12, class: "lt-ps-history-body" }),
          text({ x: cx, y: cy + 4, "text-anchor": "middle", class: "lt-ps-history-text" }, "H"),
        ]
      );
    case "dhistory":
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": "dhistory" },
        [
          circle({ cx, cy, r: 13, class: "lt-ps-history-body" }),
          text({ x: cx, y: cy + 4, "text-anchor": "middle", class: "lt-ps-history-text" }, "H*"),
        ]
      );
    case "terminate":
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": "terminate" },
        [
          line({ x1: cx - 8, y1: cy - 8, x2: cx + 8, y2: cy + 8, class: "lt-ps-terminate" }),
          line({ x1: cx + 8, y1: cy - 8, x2: cx - 8, y2: cy + 8, class: "lt-ps-terminate" }),
        ]
      );
    case "entry_point":
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": "entry_point" },
        [circle({ cx, cy, r: 7, class: "lt-ps-entrypoint" })]
      );
    case "exit_point":
      return group(
        { class: "lt-state lt-pseudo", "data-id": node.id, "data-kind": "exit_point" },
        [
          circle({ cx, cy, r: 7, class: "lt-ps-exitpoint" }),
          line({ x1: cx - 4, y1: cy - 4, x2: cx + 4, y2: cy + 4, class: "lt-ps-terminate" }),
          line({ x1: cx + 4, y1: cy - 4, x2: cx - 4, y2: cy + 4, class: "lt-ps-terminate" }),
        ]
      );
    default:
      return "";
  }
}

function renderNode(
  node: StateLayoutNode,
  position: SceneItem["editable"]["position"],
  scene?: SceneItem[]
): string {
  if (node.node.kind === "pseudo") {
    const key = `node:${node.id}`;
    scene?.push({
      key,
      kind: "node",
      semanticId: node.id,
      bbox: { x: node.x, y: node.y, width: node.width, height: node.height },
      editable: { label: false, position: "none" },
    });
    const svg = renderPseudo(node);
    return scene ? svg.replace("<g ", `<g data-sx-key="${key}" `) : svg;
  }
  return renderSimple(node, position, scene);
}

// ── Edges + notes ──────────────────────────────────────────

function renderEdge(edge: StateLayoutEdge, scene?: SceneItem[]): string {
  const key = `edge:${edge.id}`;
  const parts: string[] = [
    path({
      d: edge.path,
      class: "lt-transition",
      "marker-end": `url(#${ARROW_MARKER_ID})`,
      "data-from": edge.from,
      "data-to": edge.to,
      "data-sx-live-edge": scene ? "true" : undefined,
    }),
  ];
  if (edge.label) {
    const labelLines = edge.label.split("\n");
    const w = Math.max(
      20,
      Math.ceil(estimateMaxLineWidth(edge.label, 11)) + 8
    );
    const h = labelLines.length * 14 + 2;
    const anchor = edge.labelAnchor ?? "middle";
    const dx = anchor === "start" ? 0 : anchor === "end" ? -w : -w / 2;
    parts.push(
      rect({
        x: edge.labelX + dx,
        y: edge.labelY - h / 2,
        width: w,
        height: h,
        rx: 2,
        ry: 2,
        class: "lt-transition-label-bg",
        "data-sx-live-midpoint": scene ? "true" : undefined,
      })
    );
    parts.push(
      multilineText(
        {
          x: edge.labelX,
          y: edge.labelY + 3,
          "text-anchor": anchor,
          class: "lt-transition-label",
          "data-sx-key": scene && edge.labelSourceRange ? `${key}:label` : undefined,
          "data-sx-role": scene && edge.labelSourceRange ? "label" : undefined,
          "data-sx-live-midpoint": scene ? "true" : undefined,
        },
        edge.label,
        14
      )
    );
  }
  scene?.push({
    key,
    kind: "edge",
    semanticId: edge.id,
    path: edge.path,
    editable: { label: false, position: "none" },
  });
  if (scene && edge.label && edge.labelSourceRange) {
    const lines = edge.label.split("\n");
    const width = Math.max(
      20,
      Math.ceil(estimateMaxLineWidth(edge.label, 11)) + 8
    );
    const height = lines.length * 14 + 2;
    const anchor = edge.labelAnchor ?? "middle";
    const x = edge.labelX - (anchor === "start" ? 0 : anchor === "end" ? width : width / 2);
    scene.push({
      key: `${key}:label`,
      kind: "label",
      label: edge.label,
      sourceRange: edge.labelSourceRange,
      bbox: { x, y: edge.labelY - height / 2, width, height },
      editable: { label: true, position: "none" },
    });
  }
  return group({
    class: "lt-edge",
    "data-edge-id": edge.id,
    "data-from": edge.from,
    "data-to": edge.to,
    "data-sx-key": scene ? key : undefined,
    "data-sx-live-explicit": scene ? "true" : undefined,
    "data-sx-live-start": scene ? edge.from : undefined,
    "data-sx-live-end": scene ? edge.to : undefined,
    "data-sx-live-mode": scene ? "orthogonal" : undefined,
  }, parts);
}

function renderNote(n: StateLayoutNote): string {
  const parts: string[] = [
    line({
      x1: n.leader.x1,
      y1: n.leader.y1,
      x2: n.leader.x2,
      y2: n.leader.y2,
      class: "lt-note-leader",
    }),
    rect({ x: n.x, y: n.y, width: n.width, height: n.height, rx: 4, ry: 4, class: "lt-note-body" }),
  ];
  let yy = n.y + 14;
  for (const ln of n.lines) {
    parts.push(text({ x: n.x + 8, y: yy, class: "lt-note-text" }, ln));
    yy += 14;
  }
  return group({ class: "lt-note", "data-target": n.note.target }, parts);
}

// ── Public API ──────────────────────────────────────────────

export function renderStateDiagram(
  ast: StateDiagramAST,
  config?: RenderConfig
): string {
  const layout = layoutStateDiagram(ast, config?.__pins);
  return renderLayout(layout, resolveStateTheme(config?.theme ?? "default"), config);
}

export function renderState(text: string, config?: RenderConfig): string {
  const ast = parseStateDiagram(text);
  return renderStateDiagram(ast, config);
}

function renderLayout(layout: StateLayoutResult, t: StateTheme, config?: RenderConfig): string {
  const titleScene = layout.title
    ? resolveSceneTitle(layout.title, layout.titleSourceRange, layout.width / 2, 22, config)
    : undefined;
  const titleNode = layout.title && titleScene
    ? text({ x: titleScene.x, y: titleScene.y, class: "lt-title", "text-anchor": "middle", ...titleScene.attrs }, layout.title)
    : "";

  const body = [
    // Composite clusters first so simple-state bodies sit on top.
    group({ class: "lt-clusters" }, layout.clusters.map((cluster) => renderComposite(cluster, config?.__scene))),
    group({ class: "lt-state-bodies" }, layout.nodes.map((node) => renderNode(node, layout.direction === "LR" ? "move-y" : "move-x", config?.__scene))),
    group({ class: "lt-edges" }, layout.edges.map((edge) => renderEdge(edge, config?.__scene))),
    group({ class: "lt-notes" }, layout.notes.map(renderNote)),
  ];

  return svgRoot(
    {
      width: layout.width,
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "lt-state",
      "data-diagram-type": "state",
      "data-manual-layout": layout.manualLayout ? "true" : undefined,
    },
    [
      el("title", {}, escapeXml(`State Diagram${layout.title ? " — " + layout.title : ""}`)),
      el("desc", {}, "UML 2.5 / Harel statechart rendered by Schematex"),
      defs([renderArrowMarker(t), el("style", {}, buildStyle(t))]),
      ...(config?.__scene ? [...body, titleNode] : [titleNode, ...body]),
    ]
  );
}
