/**
 * Petri net layout — layered bipartite DAG + firing dynamics.
 *
 * Reuses the Sugiyama idea (cycle removal → longest-path layering → barycenter
 * ordering → coordinate assignment) in a compact, dependency-free form. The
 * bipartite structure means place/transition layers alternate naturally.
 *
 * The engine also computes the *dynamics*: it applies the `fire:` sequence to
 * the initial marking and reports which transitions are enabled in the result.
 *
 * Spec: docs/reference/34-PETRINET-STANDARD.md §5, §2.2
 */

import type {
  PetriArc,
  PetriArcGeom,
  PetriAst,
  PetriLayoutResult,
  PetriPlaceBox,
  PetriPoint,
  PetriTransitionBox,
} from "./types";
import { orthogonalRoute, compactRoute, segmentEntersBox, type RouteBox } from "../logic/orthogonal-router";
import { applyPins } from "../../core/editing";

export const PETRI_CONST = {
  PLACE_R: 18,
  TRANS_BAR_W: 8,
  TRANS_BAR_H: 44,
  TRANS_BOX_W: 26,
  TRANS_BOX_H: 40,
  LAYER_GAP: 70,
  RANK_GAP: 46,
  TOKEN_R: 3.5,
  TOKEN_GRID_GAP: 4,
  TOKEN_COUNT_MAX_DOTS: 4,
  ARC_WEIGHT_OFFSET: 9,
  LABEL_GAP: 6,
  MARGIN: 22,
  LABEL_LINE_H: 13,
  CHAR_W: 6.2,
} as const;

type Kind = "place" | "transition";

interface NodeGeom {
  id: string;
  kind: Kind;
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
  /** circle radius (places only) */
  r: number;
  layer: number;
}

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function layoutPetri(ast: PetriAst, pins?: Map<string, { x: number; y: number }>): PetriLayoutResult {
  const C = PETRI_CONST;
  const dir = ast.direction;
  const warnings = [...ast.warnings];

  // ── node set ──
  const kindOf = new Map<string, Kind>();
  for (const p of ast.places) kindOf.set(p.id, "place");
  for (const t of ast.transitions) kindOf.set(t.id, "transition");
  const ids = [...ast.places.map((p) => p.id), ...ast.transitions.map((t) => t.id)];
  const declOrder = new Map<string, number>();
  ids.forEach((id, i) => declOrder.set(id, i));

  // ── layering edges (use arc.from→arc.to direction; read arcs too) ──
  interface Edge {
    from: string;
    to: string;
    reversed: boolean;
  }
  const edges: Edge[] = ast.arcs.map((a) => ({ from: a.from, to: a.to, reversed: false }));

  // cycle removal via DFS — edges to a node on the recursion stack are back-edges
  const adj = new Map<string, number[]>();
  ids.forEach((id) => adj.set(id, []));
  edges.forEach((e, i) => adj.get(e.from)!.push(i));
  const state = new Map<string, 0 | 1 | 2>(); // 0 unvisited,1 on-stack,2 done
  ids.forEach((id) => state.set(id, 0));
  const dfs = (u: string): void => {
    state.set(u, 1);
    for (const ei of adj.get(u)!) {
      const e = edges[ei]!;
      const s = state.get(e.to)!;
      if (s === 1) e.reversed = true; // back-edge
      else if (s === 0) dfs(e.to);
    }
    state.set(u, 2);
  };
  // start DFS from declaration order so the result is deterministic
  for (const id of ids) if (state.get(id) === 0) dfs(id);

  // layering adjacency with back-edges flipped
  const succ = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  ids.forEach((id) => {
    succ.set(id, []);
    indeg.set(id, 0);
  });
  for (const e of edges) {
    const [from, to] = e.reversed ? [e.to, e.from] : [e.from, e.to];
    succ.get(from)!.push(to);
    indeg.set(to, indeg.get(to)! + 1);
  }

  // longest-path layering (Kahn topological order)
  const layer = new Map<string, number>();
  ids.forEach((id) => layer.set(id, 0));
  const queue = ids.filter((id) => indeg.get(id) === 0);
  const indegWork = new Map(indeg);
  let qi = 0;
  const topo: string[] = [];
  const q = [...queue];
  while (qi < q.length) {
    const u = q[qi++]!;
    topo.push(u);
    for (const v of succ.get(u)!) {
      layer.set(v, Math.max(layer.get(v)!, layer.get(u)! + 1));
      indegWork.set(v, indegWork.get(v)! - 1);
      if (indegWork.get(v) === 0) q.push(v);
    }
  }

  // ── group by layer, initial order by declaration ──
  const maxLayer = Math.max(0, ...ids.map((id) => layer.get(id)!));
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const id of ids) layers[layer.get(id)!]!.push(id);
  layers.forEach((arr) => arr.sort((a, b) => declOrder.get(a)! - declOrder.get(b)!));

  // ── barycenter crossing reduction (a few sweeps) ──
  const pos = new Map<string, number>();
  const reindex = (): void => layers.forEach((arr) => arr.forEach((id, i) => pos.set(id, i)));
  reindex();
  const preds = new Map<string, string[]>();
  const sucs = new Map<string, string[]>();
  ids.forEach((id) => {
    preds.set(id, []);
    sucs.set(id, []);
  });
  for (const e of edges) {
    const [from, to] = e.reversed ? [e.to, e.from] : [e.from, e.to];
    sucs.get(from)!.push(to);
    preds.get(to)!.push(from);
  }
  const bary = (id: string, neigh: Map<string, string[]>): number => {
    const ns = neigh.get(id)!;
    if (!ns.length) return pos.get(id)!;
    return ns.reduce((s, n) => s + pos.get(n)!, 0) / ns.length;
  };
  for (let sweep = 0; sweep < 4; sweep++) {
    const downward = sweep % 2 === 0;
    const range = downward
      ? [...Array(layers.length).keys()].slice(1)
      : [...Array(layers.length).keys()].slice(0, -1).reverse();
    for (const L of range) {
      const neigh = downward ? preds : sucs;
      layers[L]!.sort((a, b) => bary(a, neigh) - bary(b, neigh) || declOrder.get(a)! - declOrder.get(b)!);
      reindex();
    }
  }

  // ── geometry sizing ──
  const sizeOf = (id: string): { halfW: number; halfH: number; r: number } => {
    if (kindOf.get(id) === "place") return { halfW: C.PLACE_R, halfH: C.PLACE_R, r: C.PLACE_R };
    const tr = ast.transitions.find((t) => t.id === id)!;
    const long = tr.kind === "timed" ? C.TRANS_BOX_H : C.TRANS_BAR_H;
    const thin = tr.kind === "timed" ? C.TRANS_BOX_W : C.TRANS_BAR_W;
    // long axis is perpendicular to the flow axis
    const halfW = dir === "lr" ? thin / 2 : long / 2;
    const halfH = dir === "lr" ? long / 2 : thin / 2;
    return { halfW, halfH, r: 0 };
  };

  // flow extent (along layer axis) half, per layer
  const flowHalf = (id: string): number => {
    const s = sizeOf(id);
    const item = [...ast.places, ...ast.transitions].find((n) => n.id === id)!;
    return dir === "lr" ? Math.max(s.halfW, Math.max(id.length, item.label?.length ?? 0) * C.CHAR_W / 2 - 20) : s.halfH + C.LABEL_LINE_H * 2;
  };
  const crossHalf = (id: string): number => {
    const s = sizeOf(id);
    return dir === "lr" ? s.halfH : s.halfW;
  };

  const layerHalf = layers.map((arr) => Math.max(0, ...arr.map(flowHalf)));
  const slot = Math.max(0, ...ids.map(crossHalf)) * 2 + C.RANK_GAP + C.LABEL_LINE_H * 2;
  const maxCount = Math.max(1, ...layers.map((a) => a.length));
  const crossCenter = C.MARGIN + C.LABEL_LINE_H * 2 + (maxCount * slot) / 2;

  // flow centers
  const flowCenter: number[] = [];
  let acc = C.MARGIN + C.LABEL_LINE_H * 2;
  for (let L = 0; L < layers.length; L++) {
    acc += layerHalf[L]!;
    flowCenter[L] = acc;
    acc += layerHalf[L]! + C.LAYER_GAP;
  }

  const geom = new Map<string, NodeGeom>();
  layers.forEach((arr, L) => {
    const n = arr.length;
    const total = (n - 1) * slot;
    arr.forEach((id, i) => {
      const cross = crossCenter - total / 2 + i * slot;
      const flow = flowCenter[L]!;
      const cx = dir === "lr" ? flow : cross;
      const cy = dir === "lr" ? cross : flow;
      const s = sizeOf(id);
      geom.set(id, { id, kind: kindOf.get(id)!, cx, cy, halfW: s.halfW, halfH: s.halfH, r: s.r, layer: L });
    });
  });

  // ── dynamics: apply fire sequence, compute marking + enabled set ──
  const marking = new Map<string, number>();
  for (const p of ast.places) marking.set(p.id, p.tokens);
  const inArcs = (tid: string): PetriArc[] => ast.arcs.filter((a) => a.to === tid);
  const outArcs = (tid: string): PetriArc[] => ast.arcs.filter((a) => a.from === tid);
  const capOf = (pid: string): number | undefined => ast.places.find((p) => p.id === pid)?.capacity;

  const isEnabled = (tid: string, M: Map<string, number>): boolean => {
    for (const a of inArcs(tid)) {
      const have = M.get(a.from) ?? 0;
      if (a.type === "standard" || a.type === "read") {
        if (have < a.weight) return false;
      } else if (a.type === "inhibitor") {
        if (have >= a.weight) return false;
      }
      // reset arcs impose no precondition
    }
    for (const a of outArcs(tid)) {
      const cap = capOf(a.to);
      if (cap !== undefined && (M.get(a.to) ?? 0) + a.weight > cap) return false;
    }
    return true;
  };
  const applyFire = (tid: string, M: Map<string, number>): void => {
    for (const a of inArcs(tid)) {
      if (a.type === "standard") M.set(a.from, (M.get(a.from) ?? 0) - a.weight);
      else if (a.type === "reset") M.set(a.from, 0);
    }
    for (const a of outArcs(tid)) M.set(a.to, (M.get(a.to) ?? 0) + a.weight);
  };
  ast.fireSequence.forEach((tid, i) => {
    if (isEnabled(tid, marking)) applyFire(tid, marking);
    else warnings.push(`fire step ${i + 1}: transition "${tid}" is not enabled in the current marking; skipped.`);
  });

  const producers = (pid: string): number =>
    ast.arcs.filter((a) => a.to === pid && a.type === "standard").length;
  const enabledIds: string[] = [];
  const deadIds = new Set<string>();
  for (const tr of ast.transitions) {
    if (isEnabled(tr.id, marking)) {
      enabledIds.push(tr.id);
      continue;
    }
    // dead heuristic: a required input from a producer-less place that can't satisfy the weight
    const dead = inArcs(tr.id).some(
      (a) =>
        (a.type === "standard" || a.type === "read") &&
        (marking.get(a.from) ?? 0) < a.weight &&
        producers(a.from) === 0,
    );
    if (dead) deadIds.add(tr.id);
  }

  // ── arc geometry ──
  // Routing is performed once, after node placement and interactive pins.
  const arcGeoms: PetriArcGeom[] = ast.arcs.map((arc, i) => ({
    arc, type: arc.type, weight: arc.weight, reversed: edges[i]!.reversed,
    points: [] as PetriPoint[], labelX: 0, labelY: 0,
  }));

  // ── place / transition boxes ──
  const hasIncoming = (pid: string): boolean => ast.arcs.some((a) => a.to === pid);
  const hasOutgoing = (pid: string): boolean => ast.arcs.some((a) => a.from === pid);

  const placeBoxes: PetriPlaceBox[] = ast.places.map((p) => {
    const g = geom.get(p.id)!;
    return {
      place: p,
      cx: g.cx,
      cy: g.cy,
      r: g.r,
      tokens: marking.get(p.id) ?? 0,
      isSource: !hasIncoming(p.id),
      isSink: !hasOutgoing(p.id),
    };
  });
  const transBoxes: PetriTransitionBox[] = ast.transitions.map((t) => {
    const g = geom.get(t.id)!;
    return {
      transition: t,
      cx: g.cx,
      cy: g.cy,
      w: g.halfW * 2,
      h: g.halfH * 2,
      enabled: enabledIds.includes(t.id),
      dead: deadIds.has(t.id),
    };
  });

  // ── bounding box (nodes + labels + arcs) ──
  const bb: BBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const addBox = (x0: number, y0: number, x1: number, y1: number): void => {
    bb.minX = Math.min(bb.minX, x0, x1);
    bb.minY = Math.min(bb.minY, y0, y1);
    bb.maxX = Math.max(bb.maxX, x0, x1);
    bb.maxY = Math.max(bb.maxY, y0, y1);
  };
  const addPt = (p: PetriPoint): void => addBox(p.x, p.y, p.x, p.y);
  const labelW = (s?: string): number => (s ? s.length * C.CHAR_W : 0);

  for (const pb of placeBoxes) {
    addBox(pb.cx - pb.r, pb.cy - pb.r, pb.cx + pb.r, pb.cy + pb.r);
    const lw = Math.max(labelW(pb.place.id), labelW(pb.place.label)) / 2;
    addBox(pb.cx - lw, pb.cy - pb.r - C.LABEL_LINE_H * 2, pb.cx + lw, pb.cy);
    if (pb.place.capacity !== undefined) addBox(pb.cx, pb.cy + pb.r, pb.cx + 24, pb.cy + pb.r + C.LABEL_LINE_H);
  }
  for (const tb of transBoxes) {
    addBox(tb.cx - tb.w / 2, tb.cy - tb.h / 2, tb.cx + tb.w / 2, tb.cy + tb.h / 2);
    const lw = Math.max(labelW(tb.transition.id), labelW(tb.transition.label)) / 2;
    addBox(tb.cx - lw, tb.cy - tb.h / 2 - C.LABEL_LINE_H * 2, tb.cx + lw, tb.cy);
  }
  for (const ag of arcGeoms) {
    ag.points.forEach(addPt);
    if (ag.weight > 1) addBox(ag.labelX - 6, ag.labelY - 8, ag.labelX + 6, ag.labelY + 4);
  }

  // normalize so top-left content sits at MARGIN
  const dx = C.MARGIN - bb.minX;
  const dy = C.MARGIN - bb.minY;
  const shift = (p: PetriPoint): PetriPoint => ({ x: p.x + dx, y: p.y + dy });
  placeBoxes.forEach((pb) => {
    pb.cx += dx;
    pb.cy += dy;
  });
  transBoxes.forEach((tb) => {
    tb.cx += dx;
    tb.cy += dy;
  });
  arcGeoms.forEach((ag) => {
    ag.points = ag.points.map(shift);
    ag.labelX += dx;
    ag.labelY += dy;
  });

  // Pins are absolute scene coordinates. Petri nets retain their automatic
  // layer axis and allow movement only on the cross axis.
  const mode = dir === "lr" ? "move-y" as const : "move-x" as const;
  const placePinBoxes = placeBoxes.map((pb) => ({
    id: pb.place.id,
    item: pb,
    x: pb.cx - pb.r,
    y: pb.cy - pb.r,
  }));
  const transitionPinBoxes = transBoxes.map((tb) => ({
    id: tb.transition.id,
    item: tb,
    x: tb.cx - tb.w / 2,
    y: tb.cy - tb.h / 2,
  }));
  applyPins(placePinBoxes, pins, { id: (entry) => entry.id, position: () => mode });
  applyPins(transitionPinBoxes, pins, { id: (entry) => entry.id, position: () => mode });
  for (const entry of placePinBoxes) {
    entry.item.cx = entry.x + entry.item.r;
    entry.item.cy = entry.y + entry.item.r;
  }
  for (const entry of transitionPinBoxes) {
    entry.item.cx = entry.x + entry.item.w / 2;
    entry.item.cy = entry.y + entry.item.h / 2;
  }

  // Recompute connection boundaries after pins rather than translating stale
  // paths. This keeps arrowheads attached during committed renders.
  const finalGeom = new Map<string, NodeGeom>();
  for (const pb of placeBoxes) {
    finalGeom.set(pb.place.id, {
      id: pb.place.id,
      kind: "place",
      cx: pb.cx,
      cy: pb.cy,
      halfW: pb.r,
      halfH: pb.r,
      r: pb.r,
      layer: 0,
    });
  }
  for (const tb of transBoxes) {
    finalGeom.set(tb.transition.id, {
      id: tb.transition.id,
      kind: "transition",
      cx: tb.cx,
      cy: tb.cy,
      halfW: tb.w / 2,
      halfH: tb.h / 2,
      r: 0,
      layer: 0,
    });
  }
  const clearance = 10;
  const nodes = [...finalGeom.values()];
  const obstacles: RouteBox[] = nodes.map((g) => ({
    left: g.cx - g.halfW - clearance, right: g.cx + g.halfW + clearance,
    top: g.cy - g.halfH - clearance, bottom: g.cy + g.halfH + clearance,
  }));
  for (const g of nodes) {
    const item = g.kind === "place" ? ast.places.find((p) => p.id === g.id)! : ast.transitions.find((t) => t.id === g.id)!;
    const w = Math.max(labelW(g.id), labelW(item.label)) / 2 + 5;
    obstacles.push({ left: g.cx - w, right: g.cx + w,
      top: g.cy - g.halfH - C.LABEL_GAP - (item.label ? 2 : 1) * C.LABEL_LINE_H,
      bottom: g.cy - g.halfH - 2 });
  }
  for (const ag of arcGeoms) {
    const a = finalGeom.get(ag.arc.from)!;
    const b = finalGeom.get(ag.arc.to)!;
    const sign = (dir === "lr" ? b.cx - a.cx : b.cy - a.cy) >= 0 ? 1 : -1;
    // Distinct input/output contacts keep opposite arcs distinguishable.
    const port = (g: NodeGeom, outgoing: boolean): PetriPoint => {
      const siblings = arcGeoms.filter((e) => outgoing ? e.arc.from === g.id : e.arc.to === g.id);
      const offset = (siblings.indexOf(ag) - (siblings.length - 1) / 2) * Math.min(8, 24 / Math.max(1, siblings.length));
      const side = sign * (outgoing ? 1 : -1);
      const extent = g.r ? Math.sqrt(g.r * g.r - offset * offset) : dir === "lr" ? g.halfW : g.halfH;
      return { x: g.cx + (dir === "lr" ? side * extent : offset),
        y: g.cy + (dir === "lr" ? offset : side * extent) };
    };
    const start = port(a, true), end = port(b, false);
    const escape = (p: PetriPoint, direction: number): PetriPoint => ({
      x: p.x + (dir === "lr" ? direction * 20 : 0),
      y: p.y + (dir === "tb" ? direction * 32 : 0),
    });
    const from = escape(start, sign), to = escape(end, -sign);
    const others = obstacles.filter((_, i) => i >= nodes.length || (nodes[i] !== a && nodes[i] !== b));
    const direct = !ag.reversed && !others.some((box) => segmentEntersBox(start, end, box));
    ag.points = direct ? [start, end] : compactRoute([start, ...orthogonalRoute(from, to, obstacles), end]);
    // A weight belongs beside an actual segment, including on feedback routes.
    let longest = -1;
    for (let i = 1; i < ag.points.length; i++) {
      const p = ag.points[i - 1]!, q = ag.points[i]!;
      const length = Math.hypot(q.x - p.x, q.y - p.y);
      if (length <= longest) continue;
      longest = length;
      ag.labelX = (p.x + q.x) / 2 + (Math.abs(q.x - p.x) < 1 ? C.ARC_WEIGHT_OFFSET : 0);
      ag.labelY = (p.y + q.y) / 2 - (Math.abs(q.x - p.x) < 1 ? 0 : C.ARC_WEIGHT_OFFSET);
    }
  }
  // Feedback routes may use space above or left of the placed graph.
  const routeDx = Math.max(0, C.MARGIN - Math.min(...arcGeoms.flatMap((a) => a.points.map((p) => p.x))));
  const routeDy = Math.max(0, C.MARGIN - Math.min(...arcGeoms.flatMap((a) => a.points.map((p) => p.y))));
  for (const node of [...placeBoxes, ...transBoxes]) { node.cx += routeDx; node.cy += routeDy; }
  for (const arc of arcGeoms) {
    arc.points = arc.points.map((p) => ({ x: p.x + routeDx, y: p.y + routeDy }));
    arc.labelX += routeDx; arc.labelY += routeDy;
  }

  let width = bb.maxX - bb.minX + 2 * C.MARGIN + routeDx;
  let height = bb.maxY - bb.minY + 2 * C.MARGIN + routeDy;
  width = Math.max(
    width,
    ...placeBoxes.map((pb) => pb.cx + pb.r + C.MARGIN),
    ...transBoxes.map((tb) => tb.cx + tb.w / 2 + C.MARGIN),
    ...arcGeoms.flatMap((ag) => ag.points.map((point) => point.x + C.MARGIN)),
  );
  height = Math.max(
    height,
    ...placeBoxes.map((pb) => pb.cy + pb.r + C.MARGIN),
    ...transBoxes.map((tb) => tb.cy + tb.h / 2 + C.MARGIN),
    ...arcGeoms.flatMap((ag) => ag.points.map((point) => point.y + C.MARGIN)),
  );

  // ── structural subclass detection ──
  const subclass = detectSubclass(ast);

  return {
    width: Math.round(width),
    height: Math.round(height),
    title: ast.title,
    direction: dir,
    places: placeBoxes,
    transitions: transBoxes,
    arcs: arcGeoms,
    subclass,
    enabledIds,
    warnings,
    ast,
  };
}

function detectSubclass(ast: PetriAst): string | undefined {
  if (!ast.transitions.length || !ast.places.length) return undefined;
  const inT = (tid: string) => ast.arcs.filter((a) => a.to === tid).length;
  const outT = (tid: string) => ast.arcs.filter((a) => a.from === tid).length;
  const inP = (pid: string) => ast.arcs.filter((a) => a.to === pid).length;
  const outP = (pid: string) => ast.arcs.filter((a) => a.from === pid).length;

  const stateMachine = ast.transitions.every((t) => inT(t.id) === 1 && outT(t.id) === 1);
  const markedGraph = ast.places.every((p) => inP(p.id) === 1 && outP(p.id) === 1);
  const sources = ast.places.filter((p) => inP(p.id) === 0);
  const sinks = ast.places.filter((p) => outP(p.id) === 0);
  const workflowNet = sources.length === 1 && sinks.length === 1;

  const tags: string[] = [];
  if (stateMachine) tags.push("state machine");
  if (markedGraph) tags.push("marked graph");
  if (workflowNet) tags.push("workflow net");
  return tags.length ? tags.join(", ") : undefined;
}
