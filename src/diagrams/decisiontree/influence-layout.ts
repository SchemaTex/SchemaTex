import type {
  InfluenceArc,
  InfluenceAST,
  InfluenceLayoutArc,
  InfluenceLayoutNode,
  InfluenceLayoutResult,
  InfluenceNode,
} from "./types";

// ─── Influence-diagram layout ────────────────────────────────
//
// A small, zero-dependency longest-path layered DAG layout. Nodes are assigned
// to layers by longest path from any source; within a layer they are stacked
// along the cross axis. Arcs are routed as straight open-arrow connectors
// trimmed to node boundaries. Default flow is left-to-right (Howard & Matheson
// convention), with the value node naturally landing on the right.

interface NodeSize {
  w: number;
  h: number;
}

function sizeOf(node: InfluenceNode): NodeSize {
  // Width scales mildly with label length so text fits; height fixed per kind.
  const labelW = Math.min(180, Math.max(72, node.label.length * 8 + 28));
  if (node.kind === "decision") return { w: labelW, h: 48 };
  if (node.kind === "value") return { w: labelW + 12, h: 54 };
  return { w: labelW, h: 52 }; // chance oval
}

const LAYER_GAP = 80; // gap between layers along the flow axis
const CROSS_GAP = 36; // gap between nodes within a layer (cross axis)
const PADDING = 36;

/** Longest-path layering: layer(v) = max over predecessors (layer(u) + 1). */
function assignLayers(nodes: InfluenceNode[], arcs: InfluenceArc[]): Map<string, number> {
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n.id, []);
    indeg.set(n.id, 0);
  }
  for (const a of arcs) {
    adj.get(a.from)!.push(a.to);
    indeg.set(a.to, (indeg.get(a.to) ?? 0) + 1);
  }

  // Topological order via Kahn (graph is guaranteed acyclic by the parser).
  const queue: string[] = [];
  for (const n of nodes) if ((indeg.get(n.id) ?? 0) === 0) queue.push(n.id);
  const layer = new Map<string, number>();
  for (const n of nodes) layer.set(n.id, 0);

  const order: string[] = [];
  const indegWork = new Map(indeg);
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const cand = (layer.get(id) ?? 0) + 1;
      if (cand > (layer.get(next) ?? 0)) layer.set(next, cand);
      indegWork.set(next, (indegWork.get(next) ?? 0) - 1);
      if ((indegWork.get(next) ?? 0) === 0) queue.push(next);
    }
  }

  // Pull the value node to the rightmost layer so it always anchors the right
  // edge (functional dependence flows into it).
  const maxLayer = Math.max(0, ...nodes.map((n) => layer.get(n.id) ?? 0));
  for (const n of nodes) {
    if (n.kind === "value") layer.set(n.id, maxLayer);
  }

  return layer;
}

export function layoutInfluence(ast: InfluenceAST): InfluenceLayoutResult {
  const flowVertical = ast.direction === "top-down";
  const layerOf = assignLayers(ast.nodes, ast.arcs);
  const sizes = new Map<string, NodeSize>(ast.nodes.map((n) => [n.id, sizeOf(n)]));

  // Group nodes by layer, preserving declaration order within each layer.
  const layers = new Map<number, InfluenceNode[]>();
  for (const n of ast.nodes) {
    const l = layerOf.get(n.id) ?? 0;
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(n);
  }
  const layerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

  // ── Position along the flow axis: centre of each layer band. ──
  const flowExtent = (s: NodeSize): number => (flowVertical ? s.h : s.w);
  const crossExtent = (s: NodeSize): number => (flowVertical ? s.w : s.h);

  const layerFlowSize = new Map<number, number>();
  for (const l of layerIndices) {
    let maxF = 0;
    for (const n of layers.get(l)!) maxF = Math.max(maxF, flowExtent(sizes.get(n.id)!));
    layerFlowSize.set(l, maxF);
  }

  const layerFlowCentre = new Map<number, number>();
  let acc = PADDING;
  for (const l of layerIndices) {
    const half = layerFlowSize.get(l)! / 2;
    acc += half;
    layerFlowCentre.set(l, acc);
    acc += half + LAYER_GAP;
  }
  const flowTotal = acc - LAYER_GAP + PADDING;

  // ── Position along the cross axis: stack nodes, centre each layer band. ──
  const layerCrossExtent = new Map<number, number>();
  for (const l of layerIndices) {
    const ns = layers.get(l)!;
    let total = 0;
    for (let i = 0; i < ns.length; i++) {
      total += crossExtent(sizes.get(ns[i]!.id)!);
      if (i < ns.length - 1) total += CROSS_GAP;
    }
    layerCrossExtent.set(l, total);
  }
  const maxCross = Math.max(PADDING, ...Array.from(layerCrossExtent.values()));
  const crossTotal = maxCross + PADDING * 2;
  const crossCentre = PADDING + maxCross / 2;

  const placed = new Map<string, InfluenceLayoutNode>();
  for (const l of layerIndices) {
    const ns = layers.get(l)!;
    const bandLen = layerCrossExtent.get(l)!;
    let cursor = crossCentre - bandLen / 2;
    const flowPos = layerFlowCentre.get(l)!;
    for (const n of ns) {
      const s = sizes.get(n.id)!;
      const crossCentrePos = cursor + crossExtent(s) / 2;
      cursor += crossExtent(s) + CROSS_GAP;
      const x = flowVertical ? crossCentrePos : flowPos;
      const y = flowVertical ? flowPos : crossCentrePos;
      placed.set(n.id, {
        node: n,
        x,
        y,
        width: s.w,
        height: s.h,
        layer: l,
      });
    }
  }

  const width = Math.ceil(flowVertical ? crossTotal : flowTotal);
  const height = Math.ceil(flowVertical ? flowTotal : crossTotal);

  // ── Route arcs as straight connectors trimmed to node boundaries. ──
  const arcs: InfluenceLayoutArc[] = [];
  for (const a of ast.arcs) {
    const from = placed.get(a.from);
    const to = placed.get(a.to);
    if (!from || !to) continue;
    const start = boundaryPoint(from, to.x, to.y);
    const end = boundaryPoint(to, from.x, from.y);
    const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
    const arc: InfluenceLayoutArc = {
      from: a.from,
      to: a.to,
      kind: a.kind,
      path: `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`,
      tip: { x: end.x, y: end.y, angle },
      labelAt: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    };
    if (a.label !== undefined) arc.label = a.label;
    arcs.push(arc);
  }

  return {
    width,
    height,
    nodes: Array.from(placed.values()),
    arcs,
    title: ast.title,
    direction: ast.direction,
  };
}

/**
 * Intersection of the segment from the node centre toward (tx, ty) with the
 * node's bounding box (ellipse approximated by its box for chance nodes — good
 * enough at these aspect ratios, keeps the math zero-dep and robust).
 */
function boundaryPoint(n: InfluenceLayoutNode, tx: number, ty: number): { x: number; y: number } {
  const dx = tx - n.x;
  const dy = ty - n.y;
  if (dx === 0 && dy === 0) return { x: n.x, y: n.y };
  const hw = n.width / 2;
  const hh = n.height / 2;

  if (n.node.kind === "chance") {
    // Ellipse boundary: scale the direction to the ellipse surface.
    const denom = Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
    return { x: n.x + dx / denom, y: n.y + dy / denom };
  }

  // Rectangle boundary.
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: n.x + dx * scale, y: n.y + dy * scale };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
