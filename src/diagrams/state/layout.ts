/**
 * State diagram layout — converts the StateDiagramAST into a synthetic
 * FlowchartAST and runs the existing Sugiyama-style flowchart layout
 * (cycle removal → layering → crossing-min → BK x-coords → Manhattan
 * routing). The state-specific renderer then draws state symbols at
 * the layout-computed positions.
 *
 * This gives us — for free — the same layout quality as the flowchart
 * diagram: cycle handling for state machines (idle ⇄ running),
 * orthogonal edge routing that detours around node bboxes, and
 * subgraph-aware composite-state rendering.
 */

import { layoutFlowchart } from "../flowchart/layout";
import type {
  FlowchartAST,
  FlowchartDirection,
  FlowchartEdge,
  FlowchartNode,
  FlowchartShape,
  FlowchartSubgraph,
} from "../../core/types";
import type {
  StateDiagramAST,
  StateLayoutCluster,
  StateLayoutEdge,
  StateLayoutNode,
  StateLayoutNote,
  StateLayoutResult,
  StateNode,
  StateTransition,
} from "./types";

// ── Pseudo-state symbol sizes (rendered geometry; layout reserves bbox) ──
const PSEUDO_BBOX = {
  initial: { w: 22, h: 22 },
  final: { w: 28, h: 28 },
  choice: { w: 32, h: 32 },
  junction: { w: 16, h: 16 },
  fork: { w: 100, h: 8 },     // horizontal bar — rotated for LR direction below
  join: { w: 100, h: 8 },
  history: { w: 26, h: 26 },
  dhistory: { w: 30, h: 30 },
  terminate: { w: 22, h: 22 },
  entry_point: { w: 18, h: 18 },
  exit_point: { w: 18, h: 18 },
} as const;

const NOTE_W = 180;
const NOTE_LINE_H = 14;

// ── State → Flowchart conversion ────────────────────────────

interface ConversionResult {
  ast: FlowchartAST;
  /** state-id → its size override (so we can later restore pseudo bboxes if needed) */
  pseudoSizes: Map<string, { w: number; h: number }>;
}

function shapeForState(node: StateNode): FlowchartShape {
  if (node.kind === "simple") return "round";
  if (node.kind === "composite") return "round"; // becomes a subgraph; not actually drawn as node
  // pseudo
  switch (node.pseudoKind) {
    case "initial":
    case "final":
    case "junction":
    case "history":
    case "dhistory":
    case "terminate":
    case "entry_point":
    case "exit_point":
      return "circle";
    case "choice":
      return "diamond";
    case "fork":
    case "join":
      return "rect";
    default:
      return "round";
  }
}

function buildLabel(t: StateTransition): string | undefined {
  const parts: string[] = [];
  if (t.trigger) parts.push(t.trigger);
  if (t.guard) parts.push(`[${t.guard}]`);
  let s = parts.join(" ");
  if (t.action) s = s ? `${s} / ${t.action}` : `/ ${t.action}`;
  return s.trim() || undefined;
}

function convertToFlowchart(ast: StateDiagramAST): ConversionResult {
  const fcNodes: FlowchartNode[] = [];
  const fcSubgraphs: FlowchartSubgraph[] = [];
  const pseudoSizes = new Map<string, { w: number; h: number }>();
  // composite-id → preferred entry/exit node id (for edges that target a composite)
  const compositeEntryFor = new Map<string, string>();
  const compositeExitFor = new Map<string, string>();

  const visit = (s: StateNode, parentId?: string): void => {
    if (s.kind === "composite") {
      // Composite → subgraph. Pick a representative entry/exit child:
      //   entry = a child `initial` pseudo-state, else first child
      //   exit  = a child `final`   pseudo-state, else last  child
      const childIds: string[] = [];
      const childSgIds: string[] = [];
      for (const child of s.children) {
        if (child.kind === "composite") childSgIds.push(child.id);
        else childIds.push(child.id);
      }
      let entryChild: string | undefined;
      let exitChild: string | undefined;
      for (const child of s.children) {
        if (child.kind === "pseudo" && child.pseudoKind === "initial" && !entryChild) {
          entryChild = child.id;
        }
        if (child.kind === "pseudo" && child.pseudoKind === "final") {
          exitChild = child.id;
        }
      }
      if (!entryChild) entryChild = s.children[0]?.id;
      if (!exitChild) exitChild = s.children[s.children.length - 1]?.id;
      if (entryChild) compositeEntryFor.set(s.id, entryChild);
      if (exitChild) compositeExitFor.set(s.id, exitChild);

      fcSubgraphs.push({
        id: s.id,
        label: s.label || s.id,
        direction: ast.direction,
        children: childIds,
        subgraphs: childSgIds,
      });
      for (const child of s.children) visit(child, s.id);
      return;
    }
    // Simple or pseudo
    const node: FlowchartNode = {
      id: s.id,
      label: labelForFlowchart(s),
      shape: shapeForState(s),
      parent: parentId,
    };
    fcNodes.push(node);
    if (s.kind === "pseudo" && s.pseudoKind) {
      pseudoSizes.set(s.id, { ...PSEUDO_BBOX[s.pseudoKind] });
    }
  };

  for (const s of ast.states) visit(s, undefined);

  // Redirect transitions whose endpoint is a composite to the composite's
  // representative entry/exit child. Without this, flowchart's
  // auto-implicit-node creation would render a phantom box for the composite
  // (since the composite became a subgraph, not a node).
  const fcEdges: FlowchartEdge[] = ast.transitions.map((t) => {
    let from = t.from;
    let to = t.to;
    const fromExit = compositeExitFor.get(t.from);
    if (fromExit) from = fromExit;
    const toEntry = compositeEntryFor.get(t.to);
    if (toEntry) to = toEntry;
    return {
      id: t.id,
      from,
      to,
      kind: "solid",
      label: buildLabel(t),
    };
  });

  const fc: FlowchartAST = {
    type: "flowchart",
    title: ast.title,
    direction: ast.direction === "LR" ? "LR" : ("TB" as FlowchartDirection),
    nodes: fcNodes,
    edges: fcEdges,
    subgraphs: fcSubgraphs,
    classDefs: [],
    linkStyles: new Map(),
  };
  return { ast: fc, pseudoSizes };
}

/**
 * Flowchart auto-derives node bbox from label. For pseudo-states we want a
 * fixed small symbol. Trick: pass a single-character placeholder label so
 * minNodeWidth (72) still applies to keep the layout's spacing reasonable;
 * the renderer ignores the bbox and draws the appropriate symbol centered.
 *
 * For simple states with no activities we use the actual label so the
 * rounded-rect width hugs the text.
 */
function labelForFlowchart(s: StateNode): string {
  if (s.kind === "pseudo") return ""; // becomes 0-width; flowchart clamps to minNodeWidth
  // simple state — use label, augmented with activity hint so the box is tall enough
  if (s.activities.length === 0) return s.label || s.id;
  // Reserve vertical space by appending newline-equivalent (flowchart layout
  // doesn't currently wrap, so just use the longest activity for sizing).
  const activityWidth = s.activities
    .map((a) => activityText(a).length)
    .reduce((m, n) => Math.max(m, n), 0);
  const label = s.label || s.id;
  return label.length >= activityWidth ? label : "x".repeat(activityWidth);
}

function activityText(a: { kind: string; trigger?: string; guard?: string; action?: string }): string {
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

// ── Note placement (post-layout) ────────────────────────────

function wrapNoteText(text: string, charsPerLine = 28): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    const words = para.split(/\s+/);
    let cur = "";
    for (const w of words) {
      if (!cur) cur = w;
      else if (cur.length + w.length + 1 <= charsPerLine) cur += ` ${w}`;
      else {
        out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
    if (para === "") out.push("");
  }
  return out.length ? out : [""];
}

// ── Self-loop arc generation ────────────────────────────────

function selfLoopPath(
  cx: number,
  cy: number,
  w: number,
  h: number
): { path: string; labelX: number; labelY: number } {
  // Loop on the right side of the node — from (right-edge, +0.25h) curving up
  // and back to (top-edge, +0.25w). Renderer handles the arrow marker.
  const startX = cx + w / 2;
  const startY = cy - h * 0.15;
  const endX = cx + w * 0.15;
  const endY = cy - h / 2;
  const c1x = startX + 28;
  const c1y = startY - 12;
  const c2x = endX + 28;
  const c2y = endY - 28;
  const path = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;
  return { path, labelX: startX + 28, labelY: startY - 18 };
}

// ── Public entry point ──────────────────────────────────────

export function layoutStateDiagram(ast: StateDiagramAST): StateLayoutResult {
  const { ast: fcAst, pseudoSizes } = convertToFlowchart(ast);

  // Self-loops would confuse Sugiyama's layering (re-visiting a node creates
  // back-edges that get reversed). Strip them before running flowchart layout
  // and re-add after as decorations on top of the placed node.
  const selfLoops: StateTransition[] = [];
  fcAst.edges = fcAst.edges.filter((e) => {
    if (e.from === e.to) {
      const t = ast.transitions.find((tr) => tr.id === e.id);
      if (t) selfLoops.push(t);
      return false;
    }
    return true;
  });

  const fcResult = layoutFlowchart(fcAst);

  // Build state-id → AST node map for quick lookup
  const stateById = new Map<string, StateNode>();
  const collectStates = (s: StateNode): void => {
    stateById.set(s.id, s);
    for (const c of s.children) collectStates(c);
  };
  for (const s of ast.states) collectStates(s);

  // Convert flowchart layout nodes → state layout nodes.
  // Pseudo-states get their bbox shrunk to PSEUDO_BBOX values, centered on the
  // flowchart placement (so spacing stays generous but the symbol is small).
  const stateNodes: StateLayoutNode[] = [];
  for (const fcNode of fcResult.nodes) {
    if (fcNode.isDummy) continue;
    const s = stateById.get(fcNode.node.id);
    if (!s) continue;
    if (s.kind === "composite") continue; // composite handled as cluster

    const cx = fcNode.x + fcNode.width / 2;
    const cy = fcNode.y + fcNode.height / 2;

    let w = fcNode.width;
    let h = fcNode.height;
    if (s.kind === "pseudo" && s.pseudoKind) {
      const ps = pseudoSizes.get(s.id);
      if (ps) {
        // For fork/join, orient bar perpendicular to flow direction.
        if ((s.pseudoKind === "fork" || s.pseudoKind === "join") && ast.direction === "LR") {
          w = 8;
          h = 100;
        } else {
          w = ps.w;
          h = ps.h;
        }
      }
    }

    stateNodes.push({
      id: s.id,
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      cx,
      cy,
      layer: fcNode.layer,
      node: s,
      parent: s.parent,
    });
  }

  // Composite clusters
  const clusters: StateLayoutCluster[] = fcResult.clusters.map((c) => {
    const s = stateById.get(c.subgraph.id);
    if (!s) {
      return {
        id: c.subgraph.id,
        state: { id: c.subgraph.id, label: c.subgraph.label, kind: "composite", activities: [], children: [] },
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
      };
    }
    return {
      id: c.subgraph.id,
      state: s,
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
    };
  });

  // Edges from the flowchart layout (already routed orthogonally + label anchored)
  const stateById2 = new Map(stateNodes.map((n) => [n.id, n] as const));
  const stateEdges: StateLayoutEdge[] = [];
  for (const fcEdge of fcResult.edges) {
    const t = ast.transitions.find((tr) => tr.id === fcEdge.edge.id);
    if (!t) continue;
    // The flowchart layout routed the edge to the bbox edge of each endpoint.
    // For pseudo-state nodes the bbox is much bigger than the visible symbol
    // (e.g. an initial dot is r=8 inside an 80×80 bbox), leaving a visible
    // gap between the arrow and the symbol. Extend the path endpoints inward
    // so they land on the actual symbol's perimeter.
    let path = fcEdge.path;
    const sourceNode = stateById2.get(fcEdge.edge.from);
    const targetNode = stateById2.get(fcEdge.edge.to);
    if (sourceNode && sourceNode.node.kind === "pseudo") {
      path = trimPathStart(path, sourceNode.cx, sourceNode.cy, symbolRadius(sourceNode));
    }
    if (targetNode && targetNode.node.kind === "pseudo") {
      path = trimPathEnd(path, targetNode.cx, targetNode.cy, symbolRadius(targetNode));
    }
    stateEdges.push({
      id: t.id,
      from: t.from,
      to: t.to,
      path,
      label: buildLabel(t),
      labelX: fcEdge.labelAnchor?.x ?? 0,
      labelY: fcEdge.labelAnchor?.y ?? 0,
      labelAnchor: fcEdge.labelAnchor?.textAnchor ?? "middle",
    });
  }

  // Re-add self-loops as arcs on top of their host node.
  for (const sl of selfLoops) {
    const host = stateById2.get(sl.from);
    if (!host) continue;
    const { path, labelX, labelY } = selfLoopPath(host.cx, host.cy, host.width, host.height);
    stateEdges.push({
      id: sl.id,
      from: sl.from,
      to: sl.to,
      path,
      label: buildLabel(sl),
      labelX,
      labelY,
      labelAnchor: "start",
      selfLoop: true,
    });
  }

  // Notes
  const notes: StateLayoutNote[] = [];
  for (const note of ast.notes) {
    const target = stateById2.get(note.target);
    if (!target) continue;
    const lines = wrapNoteText(note.text);
    const w = NOTE_W;
    const h = lines.length * NOTE_LINE_H + 14;
    let x: number;
    let y: number;
    let leaderX1: number;
    let leaderX2: number;
    if (note.side === "left") {
      x = target.x - w - 24;
      y = target.cy - h / 2;
      leaderX1 = target.x;
      leaderX2 = x + w;
    } else {
      x = target.x + target.width + 24;
      y = target.cy - h / 2;
      leaderX1 = target.x + target.width;
      leaderX2 = x;
    }
    notes.push({
      note,
      x,
      y,
      width: w,
      height: h,
      lines,
      leader: { x1: leaderX1, y1: target.cy, x2: leaderX2, y2: y + h / 2 },
    });
  }

  // Compute final bounds — flowchart layout already includes padding; expand
  // for notes and self-loop arcs. If left-side notes push content off the
  // left edge (negative x), shift everything right.
  let maxX = fcResult.width;
  let maxY = fcResult.height;
  let minX = 0;
  for (const n of notes) {
    maxX = Math.max(maxX, n.x + n.width + 8);
    maxY = Math.max(maxY, n.y + n.height + 8);
    minX = Math.min(minX, n.x - 8);
  }
  if (minX < 0) {
    const dx = -minX;
    for (const n of stateNodes) {
      n.x += dx;
      n.cx += dx;
    }
    for (const c of clusters) {
      c.x += dx;
    }
    for (const e of stateEdges) {
      e.path = shiftPathX(e.path, dx);
      e.labelX += dx;
    }
    for (const n of notes) {
      n.x += dx;
      n.leader.x1 += dx;
      n.leader.x2 += dx;
    }
    maxX += dx;
  }
  for (const e of stateEdges) {
    if (!e.selfLoop) continue;
    maxX = Math.max(maxX, e.labelX + 60);
    maxY = Math.max(maxY, e.labelY + 60);
  }

  // Title bar reserves vertical space.
  const titleOffset = ast.title ? 28 : 0;
  if (titleOffset) {
    for (const n of stateNodes) {
      n.y += titleOffset;
      n.cy += titleOffset;
    }
    for (const c of clusters) {
      c.y += titleOffset;
    }
    for (const e of stateEdges) {
      e.path = shiftPathY(e.path, titleOffset);
      e.labelY += titleOffset;
    }
    for (const n of notes) {
      n.y += titleOffset;
      n.leader.y1 += titleOffset;
      n.leader.y2 += titleOffset;
    }
    maxY += titleOffset;
  }

  return {
    width: maxX,
    height: maxY,
    nodes: stateNodes,
    edges: stateEdges,
    clusters,
    notes,
    title: ast.title,
    direction: ast.direction,
  };
}

/**
 * Visible-symbol radius for a pseudo-state. Used to extend Manhattan path
 * endpoints from the layout's bbox edge inward to land on the actual
 * symbol perimeter (the bbox is much larger than the rendered symbol).
 *
 * The values mirror the geometry the renderer draws (renderer.ts).
 */
function symbolRadius(node: StateLayoutNode): number {
  const k = node.node.pseudoKind;
  switch (k) {
    case "initial": return 8;
    case "final": return 11;
    case "choice": return 14;
    case "junction": return 6;
    case "history": return 12;
    case "dhistory": return 13;
    case "terminate": return 8;
    case "entry_point":
    case "exit_point": return 7;
    case "fork":
    case "join":
      // bar — handled separately (long axis is `width` for TB, `height` for LR)
      return Math.min(node.width, node.height) / 2;
    default: return Math.min(node.width, node.height) / 2;
  }
}

interface PathPoint { x: number; y: number; }

function parsePathPoints(d: string): PathPoint[] | null {
  // Only Manhattan paths with M / L commands are produced by the flowchart
  // routing; a single C-spline (self-loop) is handled separately.
  if (/[CSQTA]/.test(d)) return null;
  const tokens = d.match(/[ML]\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g) ?? [];
  const out: PathPoint[] = [];
  for (const tok of tokens) {
    const m = tok.match(/[ML]\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
    if (!m) continue;
    out.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
  }
  return out;
}

function pointsToPath(pts: PathPoint[]): string {
  if (pts.length === 0) return "";
  const head = `M ${pts[0]!.x} ${pts[0]!.y}`;
  const rest = pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
  return rest ? `${head} ${rest}` : head;
}

/**
 * Replace the FIRST point of the path with one that sits on the symbol's
 * perimeter (radius `r` from (cx,cy)). For a Manhattan path the first
 * segment is axis-aligned, so we move the start point along that axis.
 */
function trimPathStart(d: string, cx: number, cy: number, r: number): string {
  const pts = parsePathPoints(d);
  if (!pts || pts.length < 2) return d;
  const p0 = pts[0]!;
  const p1 = pts[1]!;
  const newP0 = projectOnPerimeter(p0, p1, cx, cy, r);
  pts[0] = newP0;
  return pointsToPath(pts);
}

function trimPathEnd(d: string, cx: number, cy: number, r: number): string {
  const pts = parsePathPoints(d);
  if (!pts || pts.length < 2) return d;
  const last = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2]!;
  const newLast = projectOnPerimeter(last, prev, cx, cy, r);
  pts[pts.length - 1] = newLast;
  return pointsToPath(pts);
}

/**
 * Given an axis-aligned segment (p_endpoint, p_neighbor) where p_endpoint sits
 * on the bbox edge of a node centered at (cx,cy), return a new endpoint that
 * sits at distance r from (cx,cy) along the same axis.
 */
function projectOnPerimeter(
  endpoint: PathPoint,
  neighbor: PathPoint,
  cx: number,
  cy: number,
  r: number
): PathPoint {
  const dx = endpoint.x - neighbor.x;
  const dy = endpoint.y - neighbor.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    // horizontal segment — adjust x
    const sign = dx >= 0 ? 1 : -1;
    return { x: cx - sign * r, y: cy };
  }
  // vertical segment — adjust y
  const sign = dy >= 0 ? 1 : -1;
  return { x: cx, y: cy - sign * r };
}

function shiftPathX(d: string, dx: number): string {
  return d.replace(/([MLCQ])\s*((?:-?\d+(?:\.\d+)?\s+){1,5}-?\d+(?:\.\d+)?)/g, (_, cmd, args) => {
    const nums = args.trim().split(/\s+/).map(Number);
    const out: number[] = [];
    for (let i = 0; i < nums.length; i++) {
      out.push(i % 2 === 0 ? nums[i] + dx : nums[i]);
    }
    return `${cmd} ${out.join(" ")}`;
  });
}

function shiftPathY(d: string, dy: number): string {
  // Shift every (x y) coordinate pair in the path. Path format is the
  // flowchart routing's "M x y L x y L ..." with simple commands.
  return d.replace(/([MLCQ])\s*((?:-?\d+(?:\.\d+)?\s+){1,5}-?\d+(?:\.\d+)?)/g, (_, cmd, args) => {
    const nums = args.trim().split(/\s+/).map(Number);
    const out: number[] = [];
    for (let i = 0; i < nums.length; i++) {
      // Every odd index is a Y coordinate (commands operate on x,y pairs).
      out.push(i % 2 === 1 ? nums[i] + dy : nums[i]);
    }
    return `${cmd} ${out.join(" ")}`;
  });
}
