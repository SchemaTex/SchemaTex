import { circle, defs, el, escapeXml, group, line, path, polygon, rect, svgRoot, text } from "../../core/svg";
import type { RenderConfig } from "../../core/types";
import { resolveStateTheme, type StateTokens, type ResolvedTheme } from "../../core/theme";
import { layoutStateDiagram } from "./layout";
import { parseStateDiagram } from "./parser";
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

function renderSimple(node: StateLayoutNode): string {
  const { x, y, width, height } = node;
  const children: string[] = [
    rect({ x, y, width, height, rx: 8, ry: 8, class: "lt-state-body" }),
  ];
  const label = node.node.label || node.id;

  if (node.node.activities.length === 0) {
    children.push(
      text(
        { x: x + width / 2, y: y + height / 2 + 4, "text-anchor": "middle", class: "lt-state-name" },
        label
      )
    );
  } else {
    children.push(
      text(
        { x: x + width / 2, y: y + 16, "text-anchor": "middle", class: "lt-state-name" },
        label
      )
    );
    children.push(
      line({ x1: x, y1: y + 22, x2: x + width, y2: y + 22, class: "lt-state-div" })
    );
    let cy = y + 36;
    for (const a of node.node.activities) {
      children.push(text({ x: x + 8, y: cy, class: "lt-state-activity" }, activityText(a)));
      cy += 14;
    }
  }
  return group({ class: "lt-state lt-simple", "data-id": node.id }, children);
}

// ── Composite cluster ───────────────────────────────────────

function renderComposite(c: StateLayoutCluster): string {
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

  return group(
    { class: "lt-state lt-composite", "data-id": c.id },
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

function renderNode(node: StateLayoutNode): string {
  if (node.node.kind === "pseudo") return renderPseudo(node);
  return renderSimple(node);
}

// ── Edges + notes ──────────────────────────────────────────

function renderEdge(edge: StateLayoutEdge): string {
  const parts: string[] = [
    path({
      d: edge.path,
      class: "lt-transition",
      "marker-end": `url(#${ARROW_MARKER_ID})`,
      "data-from": edge.from,
      "data-to": edge.to,
    }),
  ];
  if (edge.label) {
    const w = Math.max(20, edge.label.length * 6.4 + 8);
    const anchor = edge.labelAnchor ?? "middle";
    const dx = anchor === "start" ? 0 : anchor === "end" ? -w : -w / 2;
    parts.push(
      rect({
        x: edge.labelX + dx,
        y: edge.labelY - 10,
        width: w,
        height: 14,
        rx: 2,
        ry: 2,
        class: "lt-transition-label-bg",
      })
    );
    parts.push(
      text(
        {
          x: edge.labelX,
          y: edge.labelY,
          "text-anchor": anchor,
          class: "lt-transition-label",
        },
        edge.label
      )
    );
  }
  return group({ class: "lt-edge", "data-edge-id": edge.id }, parts);
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
  const layout = layoutStateDiagram(ast);
  return renderLayout(layout, resolveStateTheme(config?.theme ?? "default"));
}

export function renderState(text: string, config?: RenderConfig): string {
  const ast = parseStateDiagram(text);
  return renderStateDiagram(ast, config);
}

function renderLayout(layout: StateLayoutResult, t: StateTheme): string {
  const titleNode = layout.title
    ? text({ x: layout.width / 2, y: 22, class: "lt-title", "text-anchor": "middle" }, layout.title)
    : "";

  return svgRoot(
    {
      width: layout.width,
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "lt-state",
      "data-diagram-type": "state",
    },
    [
      el("title", {}, escapeXml(`State Diagram${layout.title ? " — " + layout.title : ""}`)),
      el("desc", {}, "UML 2.5 / Harel statechart rendered by Schematex"),
      defs([renderArrowMarker(t), el("style", {}, buildStyle(t))]),
      titleNode,
      // Composite clusters first so simple-state bodies sit on top.
      group({ class: "lt-clusters" }, layout.clusters.map(renderComposite)),
      group({ class: "lt-state-bodies" }, layout.nodes.map(renderNode)),
      group({ class: "lt-edges" }, layout.edges.map(renderEdge)),
      group({ class: "lt-notes" }, layout.notes.map(renderNote)),
    ]
  );
}
