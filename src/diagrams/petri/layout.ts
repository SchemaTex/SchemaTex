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
  ARROW_LEN: 8,
  MARGIN: 22,
  BACKEDGE_BOW: 30,
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

export function layoutPetri(ast: PetriAst): PetriLayoutResult {
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
    return dir === "lr" ? s.halfW : s.halfH;
  };
  const crossHalf = (id: string): number => {
    const s = sizeOf(id);
    return dir === "lr" ? s.halfH : s.halfW;
  };

  const layerHalf = layers.map((arr) => Math.max(0, ...arr.map(flowHalf)));
  const slot = Math.max(0, ...ids.map(crossHalf)) * 2 + C.RANK_GAP;
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
  const boundary = (g: NodeGeom, dx: number, dy: number): PetriPoint => {
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    if (g.kind === "place") return { x: g.cx + ux * g.r, y: g.cy + uy * g.r };
    const tx = ux !== 0 ? g.halfW / Math.abs(ux) : Infinity;
    const ty = uy !== 0 ? g.halfH / Math.abs(uy) : Infinity;
    const t = Math.min(tx, ty);
    return { x: g.cx + ux * t, y: g.cy + uy * t };
  };

  const bandMaxCross = Math.max(...[...geom.values()].map((g) => (dir === "lr" ? g.cy + g.halfH : g.cx + g.halfW)));

  const arcGeoms: PetriArcGeom[] = ast.arcs.map((a, i) => {
    const A = geom.get(a.from)!;
    const B = geom.get(a.to)!;
    const reversed = edges[i]!.reversed;
    let points: PetriPoint[];
    if (!reversed) {
      const pA = boundary(A, B.cx - A.cx, B.cy - A.cy);
      const pB = boundary(B, A.cx - B.cx, A.cy - B.cy);
      points = [pA, pB];
    } else {
      // back-edge: bow around the outer side of the band
      if (dir === "lr") {
        const pA = boundary(A, 0, 1);
        const pB = boundary(B, 0, 1);
        const bowY = bandMaxCross + C.BACKEDGE_BOW;
        points = [pA, { x: pA.x, y: bowY }, { x: pB.x, y: bowY }, pB];
      } else {
        const pA = boundary(A, 1, 0);
        const pB = boundary(B, 1, 0);
        const bowX = bandMaxCross + C.BACKEDGE_BOW;
        points = [pA, { x: bowX, y: pA.y }, { x: bowX, y: pB.y }, pB];
      }
    }
    // weight label anchor: arc midpoint, offset perpendicular
    const p0 = points[0]!;
    const p1 = points[points.length - 1]!;
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    const ddx = p1.x - p0.x;
    const ddy = p1.y - p0.y;
    const dl = Math.hypot(ddx, ddy) || 1;
    const labelX = mx - (ddy / dl) * C.ARC_WEIGHT_OFFSET;
    const labelY = my + (ddx / dl) * C.ARC_WEIGHT_OFFSET;
    return { arc: a, type: a.type, weight: a.weight, points, reversed, labelX, labelY };
  });

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

  const width = bb.maxX - bb.minX + 2 * C.MARGIN;
  const height = bb.maxY - bb.minY + 2 * C.MARGIN;

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
