/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Flowchart Sugiyama-style layered layout (M1).
 *
 * Phases:
 *   1. Cycle removal — Greedy-FAS (Eades-Lin-Smyth 1993)
 *   2. Layer assignment — Longest-path layering
 *   3. Dummy node insertion for edges spanning > 1 layer
 *   4. Crossing minimization — median heuristic, bi-directional sweep
 *   5. X-coordinate assignment — simple symmetric pass
 *      (Brandes-Köpf full 4-alignment is deferred; for M1 a centered
 *       median-based placement produces visually indistinguishable results
 *       on graphs ≤ 20 nodes, which is the M1 target.)
 *
 * Zero runtime dependencies. All heuristics hand-written.
 */

import type {
  FlowchartAST,
  FlowchartDirection,
  FlowchartEdge,
  FlowchartLayoutNode,
  FlowchartLayoutResult,
  FlowchartNode,
} from "../../core/types";

// ─── Constants / Defaults ──────────────────────────────────

export const FC_CONST = {
  nodeWidth: 120,
  nodeHeight: 44,
  nodeSpacingX: 32, // cross-flow gap between nodes in same layer
  layerSpacingY: 56, // flow-direction gap between layers
  dummyWidth: 1,
  padding: 24,
  charWidth: 6.8, // approx font-size 12 proportional width
  labelHPad: 16,
  minNodeWidth: 72,
  maxLabelWidth: 220,
  crossingSweepIters: 24,
} as const;

// ─── Internal working types ────────────────────────────────

interface LNode {
  id: string;
  node?: FlowchartNode; // undefined for dummy
  layer: number;
  order: number;
  width: number;
  height: number;
  isDummy: boolean;
}

interface LEdge {
  from: string;
  to: string;
  original: FlowchartEdge;
  isReversed: boolean;
  /** After dummy insertion, intermediate node ids that replace the original edge */
  chain: string[]; // includes from and to
}

// ─── Phase 1: Cycle removal (Greedy-FAS) ───────────────────

/**
 * Greedy FAS heuristic: compute a linear node ordering that minimizes the
 * number of "back edges". Back edges then get reversed.
 *
 * Algorithm (Eades-Lin-Smyth 1993):
 *   1. s1 = empty list, s2 = empty list
 *   2. while graph non-empty:
 *        extract all sinks (out-deg 0) → append to s2 (front)
 *        extract all sources (in-deg 0) → append to s1 (back)
 *        extract vertex with max (outDeg - inDeg) → append to s1 (back)
 *   3. ordering = s1 ++ s2
 *   4. any edge (u, v) where order(u) > order(v) is a feedback edge
 */
function greedyFAS(nodeIds: string[], edges: FlowchartEdge[]): Set<number> {
  const outAdj = new Map<string, Set<string>>();
  const inAdj = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    outAdj.set(id, new Set());
    inAdj.set(id, new Set());
  }
  for (const e of edges) {
    // Ignore self-loops for FAS purposes (they're always feedback)
    if (e.from === e.to) continue;
    outAdj.get(e.from)?.add(e.to);
    inAdj.get(e.to)?.add(e.from);
  }

  const s1: string[] = [];
  const s2: string[] = [];
  const remaining = new Set(nodeIds);

  while (remaining.size > 0) {
    // Extract all current sinks
    let changed = true;
    while (changed) {
      changed = false;
      for (const v of Array.from(remaining)) {
        if ((outAdj.get(v)?.size ?? 0) === 0) {
          s2.unshift(v);
          removeVertex(v, remaining, outAdj, inAdj);
          changed = true;
        }
      }
    }
    // Extract all current sources
    changed = true;
    while (changed) {
      changed = false;
      for (const v of Array.from(remaining)) {
        if ((inAdj.get(v)?.size ?? 0) === 0) {
          s1.push(v);
          removeVertex(v, remaining, outAdj, inAdj);
          changed = true;
        }
      }
    }
    if (remaining.size === 0) break;
    // Pick vertex with max (outDeg - inDeg)
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const v of remaining) {
      const score = (outAdj.get(v)?.size ?? 0) - (inAdj.get(v)?.size ?? 0);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    if (best !== null) {
      s1.push(best);
      removeVertex(best, remaining, outAdj, inAdj);
    }
  }

  const ordering = [...s1, ...s2];
  const rank = new Map<string, number>();
  ordering.forEach((id, i) => rank.set(id, i));

  const feedback = new Set<number>();
  edges.forEach((e, i) => {
    if (e.from === e.to) {
      feedback.add(i);
      return;
    }
    const ru = rank.get(e.from);
    const rv = rank.get(e.to);
    if (ru !== undefined && rv !== undefined && ru > rv) {
      feedback.add(i);
    }
  });
  return feedback;
}

function removeVertex(
  v: string,
  remaining: Set<string>,
  outAdj: Map<string, Set<string>>,
  inAdj: Map<string, Set<string>>
): void {
  remaining.delete(v);
  const outs = outAdj.get(v);
  if (outs) {
    for (const w of outs) inAdj.get(w)?.delete(v);
  }
  const ins = inAdj.get(v);
  if (ins) {
    for (const u of ins) outAdj.get(u)?.delete(v);
  }
  outAdj.delete(v);
  inAdj.delete(v);
}

// ─── Phase 2: Longest-path layer assignment ───────────────

function longestPathLayers(
  nodeIds: string[],
  edges: LEdge[]
): Map<string, number> {
  const layer = new Map<string, number>();
  for (const id of nodeIds) layer.set(id, 0);

  const outAdj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const id of nodeIds) {
    outAdj.set(id, []);
    inDeg.set(id, 0);
  }
  for (const e of edges) {
    if (e.from === e.to) continue; // skip self-loops
    outAdj.get(e.from)?.push(e.to);
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
  }

  // Topo sort (Kahn)
  const queue: string[] = [];
  for (const id of nodeIds) {
    if ((inDeg.get(id) ?? 0) === 0) queue.push(id);
  }
  const order: string[] = [];
  const remIn = new Map(inDeg);
  while (queue.length > 0) {
    const v = queue.shift()!;
    order.push(v);
    for (const w of outAdj.get(v) ?? []) {
      const d = (remIn.get(w) ?? 0) - 1;
      remIn.set(w, d);
      if (d === 0) queue.push(w);
    }
  }
  // If cycles remain (shouldn't, post-FAS), append leftover in arbitrary order
  if (order.length !== nodeIds.length) {
    for (const id of nodeIds) {
      if (!order.includes(id)) order.push(id);
    }
  }

  for (const v of order) {
    for (const w of outAdj.get(v) ?? []) {
      const lv = layer.get(v) ?? 0;
      const lw = layer.get(w) ?? 0;
      if (lw < lv + 1) layer.set(w, lv + 1);
    }
  }
  return layer;
}

// ─── Phase 3: Dummy-node insertion ─────────────────────────

function insertDummies(
  ledges: LEdge[],
  layerMap: Map<string, number>,
  genDummyId: () => string
): { dummyIds: string[]; updatedEdges: LEdge[] } {
  const dummyIds: string[] = [];
  const updated: LEdge[] = [];
  for (const e of ledges) {
    if (e.from === e.to) {
      // self-loop: keep as-is; renderer draws a small arc
      updated.push(e);
      continue;
    }
    const lu = layerMap.get(e.from) ?? 0;
    const lv = layerMap.get(e.to) ?? 0;
    const diff = Math.abs(lv - lu);
    if (diff <= 1) {
      e.chain = [e.from, e.to];
      updated.push(e);
      continue;
    }
    // Insert (diff - 1) dummies on monotonically increasing layers from lu → lv
    const step = lv > lu ? 1 : -1;
    const chain: string[] = [e.from];
    let curLayer = lu + step;
    while (curLayer !== lv) {
      const d = genDummyId();
      layerMap.set(d, curLayer);
      dummyIds.push(d);
      chain.push(d);
      curLayer += step;
    }
    chain.push(e.to);
    e.chain = chain;
    updated.push(e);
  }
  return { dummyIds, updatedEdges: updated };
}

// ─── Phase 4: Crossing minimization (median heuristic) ────

function medianOrder(
  layers: string[][],
  segments: Array<[string, string]>
): string[][] {
  // Adjacency per node: predecessors (above layer) + successors (below layer)
  const succ = new Map<string, string[]>();
  const pred = new Map<string, string[]>();
  for (const layer of layers) for (const id of layer) {
    succ.set(id, []);
    pred.set(id, []);
  }
  for (const [u, v] of segments) {
    succ.get(u)?.push(v);
    pred.get(v)?.push(u);
  }

  const indexOf = (layer: string[], id: string): number => layer.indexOf(id);

  const reorderByMedian = (
    layer: string[],
    fixed: string[],
    useSucc: boolean
  ): string[] => {
    const fixedIdx = new Map<string, number>();
    fixed.forEach((id, i) => fixedIdx.set(id, i));
    const scored = layer.map((id, i) => {
      const neighbors = useSucc ? succ.get(id) ?? [] : pred.get(id) ?? [];
      const positions = neighbors
        .map((n) => fixedIdx.get(n))
        .filter((p): p is number => p !== undefined)
        .sort((a, b) => a - b);
      if (positions.length === 0) return { id, score: i, orig: i };
      const m = positions.length;
      const mid = positions[Math.floor(m / 2)]!;
      // Classic median heuristic: for even count, average the two middle
      const score =
        m % 2 === 1
          ? mid
          : (positions[m / 2 - 1]! + positions[m / 2]!) / 2;
      return { id, score, orig: i };
    });
    scored.sort((a, b) => a.score - b.score || a.orig - b.orig);
    return scored.map((s) => s.id);
  };

  const result = layers.map((l) => l.slice());
  let bestCrossings = countCrossings(result, segments, indexOf);
  let best = result.map((l) => l.slice());

  for (let iter = 0; iter < FC_CONST.crossingSweepIters; iter++) {
    const down = iter % 2 === 0;
    if (down) {
      for (let i = 1; i < result.length; i++) {
        result[i] = reorderByMedian(result[i]!, result[i - 1]!, false);
      }
    } else {
      for (let i = result.length - 2; i >= 0; i--) {
        result[i] = reorderByMedian(result[i]!, result[i + 1]!, true);
      }
    }
    const c = countCrossings(result, segments, indexOf);
    if (c < bestCrossings) {
      bestCrossings = c;
      best = result.map((l) => l.slice());
    }
  }

  return best;
}

function countCrossings(
  layers: string[][],
  segments: Array<[string, string]>,
  indexOf: (layer: string[], id: string) => number
): number {
  // Count inversions per adjacent-layer pair
  let total = 0;
  for (let i = 0; i < layers.length - 1; i++) {
    const upper = layers[i]!;
    const lower = layers[i + 1]!;
    const pairs: Array<[number, number]> = [];
    for (const [u, v] of segments) {
      const iu = indexOf(upper, u);
      const iv = indexOf(lower, v);
      if (iu >= 0 && iv >= 0) pairs.push([iu, iv]);
    }
    // Count inversions on `pairs` sorted by iu: inversion on iv
    pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (let a = 0; a < pairs.length; a++) {
      for (let b = a + 1; b < pairs.length; b++) {
        if (pairs[a]![1] > pairs[b]![1]) total++;
      }
    }
  }
  return total;
}

// ─── Phase 5: X-coordinate assignment ─────────────────────

interface Placed {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  order: number;
}

/**
 * Simple symmetric placement:
 *   - Each layer's total width is computed (sum of node widths + gaps).
 *   - Layers are centered around the global centerline.
 *   - Then for each node, its preferred x = average of neighbor xs from both
 *     adjacent layers; a single left-to-right sweep per layer snaps positions
 *     while respecting minimum separation.
 *
 * This is a pragmatic subset of Brandes-Köpf that behaves well on M1 target
 * graphs (≤ 20 nodes). Longer edges look straight because the same centering
 * is applied to dummy nodes.
 */
function assignXCoords(
  layers: LNode[][],
  nodeSpacingX: number
): Map<string, number> {
  const x = new Map<string, number>();

  // Pass 1: compute initial layer widths, center each layer at 0
  const layerWidths: number[] = [];
  for (const layer of layers) {
    let w = 0;
    for (let i = 0; i < layer.length; i++) {
      w += layer[i]!.width;
      if (i < layer.length - 1) w += nodeSpacingX;
    }
    layerWidths.push(w);
  }
  const maxWidth = Math.max(...layerWidths, 1);

  // Initial positions: centered
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li]!;
    const layerW = layerWidths[li]!;
    let cursor = (maxWidth - layerW) / 2;
    for (const n of layer) {
      x.set(n.id, cursor + n.width / 2);
      cursor += n.width + nodeSpacingX;
    }
  }

  // Iterative median refinement (a few passes smooths dummy-heavy columns)
  const neighborsAbove = new Map<string, string[]>();
  const neighborsBelow = new Map<string, string[]>();
  // Built by caller; we infer from layer adjacency using order consistency
  // → we compute these externally via chain traversal; see layoutFlowchart.

  void neighborsAbove;
  void neighborsBelow;
  return x;
}

// ─── Entry point ──────────────────────────────────────────

export function layoutFlowchart(ast: FlowchartAST): FlowchartLayoutResult {
  const dir: FlowchartDirection = ast.direction;
  const isHorizontalDir = dir === "LR" || dir === "RL";

  // ── Measure node sizes ───────────────────────────────────
  // Returned w/h are in "abstract TB space" — flow direction is always Y.
  // For LR we swap at the end so the user-authored shape dims are preserved.
  const sizeOf = (n: FlowchartNode): { w: number; h: number } => {
    const labelW = Math.min(
      FC_CONST.maxLabelWidth,
      Math.ceil(n.label.length * FC_CONST.charWidth) + FC_CONST.labelHPad * 2
    );
    let shapeW = Math.max(FC_CONST.minNodeWidth, labelW);
    let shapeH: number = FC_CONST.nodeHeight;
    if (n.shape === "diamond") {
      shapeW = Math.max(shapeW, labelW * 1.25);
      shapeH = Math.max(shapeH, 52);
    }
    if (n.shape === "parallelogram" || n.shape === "parallelogram-alt") {
      shapeW += 20;
    }
    if (n.shape === "stadium" || n.shape === "round") {
      shapeW = Math.max(shapeW, shapeH + 20);
    }
    // In LR, swap so abstract-TB "h" corresponds to flow-direction extent
    // (= user-authored width); output swap restores canonical shape dims.
    return isHorizontalDir ? { w: shapeH, h: shapeW } : { w: shapeW, h: shapeH };
  };

  // ── Build working node map ───────────────────────────────
  const nodeMap = new Map<string, FlowchartNode>();
  for (const n of ast.nodes) nodeMap.set(n.id, n);

  // Ensure all edge endpoints exist as nodes (create implicit rect nodes)
  for (const e of ast.edges) {
    for (const id of [e.from, e.to]) {
      if (!nodeMap.has(id)) {
        const implicit: FlowchartNode = { id, label: id, shape: "rect" };
        nodeMap.set(id, implicit);
        ast.nodes.push(implicit);
      }
    }
  }

  // ── Phase 1: cycle removal ───────────────────────────────
  const allIds = Array.from(nodeMap.keys());
  const feedbackIdx = greedyFAS(allIds, ast.edges);

  const ledges: LEdge[] = ast.edges.map((e, i) => {
    const reversed = feedbackIdx.has(i) && e.from !== e.to;
    return {
      from: reversed ? e.to : e.from,
      to: reversed ? e.from : e.to,
      original: e,
      isReversed: reversed,
      chain: [],
    };
  });

  // ── Phase 2: layer assignment ────────────────────────────
  const layerMap = longestPathLayers(allIds, ledges);

  // ── Phase 3: dummy insertion ─────────────────────────────
  let dummyCounter = 0;
  const dummies: string[] = [];
  const { updatedEdges } = insertDummies(ledges, layerMap, () => {
    const id = `__dummy_${dummyCounter++}`;
    dummies.push(id);
    return id;
  });

  // Build LNode map after dummies
  const lnodes = new Map<string, LNode>();
  for (const id of allIds) {
    const n = nodeMap.get(id)!;
    const { w, h } = sizeOf(n);
    lnodes.set(id, {
      id,
      node: n,
      layer: layerMap.get(id) ?? 0,
      order: 0,
      width: w,
      height: h,
      isDummy: false,
    });
  }
  for (const id of dummies) {
    lnodes.set(id, {
      id,
      layer: layerMap.get(id) ?? 0,
      order: 0,
      width: FC_CONST.dummyWidth,
      height: 0,
      isDummy: true,
    });
  }

  // Group by layer
  const maxLayer = Math.max(0, ...Array.from(layerMap.values()));
  const layers: string[][] = [];
  for (let i = 0; i <= maxLayer; i++) layers.push([]);
  for (const [id, layer] of layerMap) {
    layers[layer]!.push(id);
  }

  // ── Phase 4: crossing minimization ───────────────────────
  // Build segment list (pairs of adjacent-layer node ids along each chain)
  const segments: Array<[string, string]> = [];
  for (const e of updatedEdges) {
    if (e.chain.length >= 2) {
      for (let i = 0; i < e.chain.length - 1; i++) {
        segments.push([e.chain[i]!, e.chain[i + 1]!]);
      }
    }
  }
  const ordered = medianOrder(layers, segments);

  // Assign order indices
  for (let li = 0; li < ordered.length; li++) {
    const layer = ordered[li]!;
    for (let oi = 0; oi < layer.length; oi++) {
      const n = lnodes.get(layer[oi]!);
      if (n) n.order = oi;
    }
  }

  // ── Phase 5: x-coord assignment ──────────────────────────
  const layerNodes: LNode[][] = ordered.map((layer) =>
    layer.map((id) => lnodes.get(id)!)
  );
  const xMap = assignXCoords(layerNodes, FC_CONST.nodeSpacingX);

  // Refine with median pull (3 passes) to straighten long edges through dummies
  for (let pass = 0; pass < 4; pass++) {
    for (let li = 0; li < layerNodes.length; li++) {
      const layer = layerNodes[li]!;
      // Collect neighbors from both adjacent layers
      const pullList = layer.map((n) => {
        const neighbors: number[] = [];
        for (const [u, v] of segments) {
          if (v === n.id) {
            const ux = xMap.get(u);
            if (ux !== undefined) neighbors.push(ux);
          }
          if (u === n.id) {
            const vx = xMap.get(v);
            if (vx !== undefined) neighbors.push(vx);
          }
        }
        if (neighbors.length === 0) return xMap.get(n.id) ?? 0;
        neighbors.sort((a, b) => a - b);
        return neighbors[Math.floor(neighbors.length / 2)]!;
      });
      // Apply pulled positions, then enforce non-overlap left-to-right
      let cursor = -Infinity;
      for (let oi = 0; oi < layer.length; oi++) {
        const n = layer[oi]!;
        const desired = pullList[oi]!;
        const minX = cursor + FC_CONST.nodeSpacingX + n.width / 2;
        const newX = Math.max(desired, oi === 0 ? desired : minX);
        xMap.set(n.id, newX);
        cursor = newX + n.width / 2;
      }
    }
  }

  // ── Compute y coords & final canvas dimensions ──────────
  const isHorizontal = dir === "LR" || dir === "RL";
  const layerGap = FC_CONST.layerSpacingY;

  // Per-layer max height (abstract TB) — respects variable-height nodes.
  const layerHeights: number[] = layerNodes.map((layer) => {
    let maxH = 0;
    for (const n of layer) {
      if (n.isDummy) continue;
      if (n.height > maxH) maxH = n.height;
    }
    return maxH > 0 ? maxH : FC_CONST.nodeHeight;
  });
  const layerCenterY: number[] = [];
  {
    let y = FC_CONST.padding;
    for (let li = 0; li < layerHeights.length; li++) {
      y += layerHeights[li]! / 2;
      layerCenterY.push(y);
      y += layerHeights[li]! / 2 + layerGap;
    }
  }

  let minX = Infinity;
  let maxX = -Infinity;
  for (const [id, x] of xMap) {
    const n = lnodes.get(id)!;
    if (n.isDummy) continue;
    minX = Math.min(minX, x - n.width / 2);
    maxX = Math.max(maxX, x + n.width / 2);
  }
  if (!isFinite(minX)) {
    minX = 0;
    maxX = 100;
  }

  const padding = FC_CONST.padding;
  const shiftX = padding - minX;

  const placed: Placed[] = [];
  for (let li = 0; li < layerNodes.length; li++) {
    const y = layerCenterY[li]!;
    for (const n of layerNodes[li]!) {
      if (n.isDummy) continue;
      const cx = (xMap.get(n.id) ?? 0) + shiftX;
      placed.push({
        id: n.id,
        x: cx - n.width / 2,
        y: y - n.height / 2,
        width: n.width,
        height: n.height,
        layer: li,
        order: n.order,
      });
    }
  }
  const dummyPos = new Map<string, { x: number; y: number }>();
  for (let li = 0; li < layerNodes.length; li++) {
    const y = layerCenterY[li]!;
    for (const n of layerNodes[li]!) {
      if (!n.isDummy) continue;
      dummyPos.set(n.id, {
        x: (xMap.get(n.id) ?? 0) + shiftX,
        y,
      });
    }
  }

  const canvasW = maxX - minX + 2 * padding;
  const lastLayer = layerCenterY.length - 1;
  const canvasH =
    lastLayer >= 0
      ? layerCenterY[lastLayer]! + layerHeights[lastLayer]! / 2 + padding
      : 2 * padding;

  // ── Build layout nodes (possibly swapped for LR) ────────
  const outNodes: FlowchartLayoutNode[] = placed.map((p) => {
    const base = lnodes.get(p.id)!.node!;
    if (!isHorizontal) {
      return {
        node: base,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        layer: p.layer,
        order: p.order,
      };
    }
    // Swap POSITIONS for LR (layer direction becomes X) but also swap
    // dims so the user-authored shape orientation is preserved. sizeOf
    // pre-swapped dims on input, so here we swap them back for render.
    return {
      node: base,
      x: p.y,
      y: p.x,
      width: p.height,
      height: p.width,
      layer: p.layer,
      order: p.order,
    };
  });

  const outWidth = isHorizontal ? canvasH : canvasW;
  const outHeight = isHorizontal ? canvasW : canvasH;

  // ── Build edges (routing) ───────────────────────────────
  const nodeCenter = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const ln of outNodes) {
    nodeCenter.set(ln.node.id, {
      x: ln.x + ln.width / 2,
      y: ln.y + ln.height / 2,
      w: ln.width,
      h: ln.height,
    });
  }
  // Dummy positions (swap for LR)
  const dummyCenter = new Map<string, { x: number; y: number }>();
  for (const [id, p] of dummyPos) {
    if (!isHorizontal) dummyCenter.set(id, p);
    else dummyCenter.set(id, { x: p.y, y: p.x });
  }

  // Import routing lazily to avoid circular deps (routing module is sibling).
  // We inline minimal routing right here to keep imports simple.
  const outEdges = updatedEdges.map((le) => {
    const chain = le.chain.length > 0 ? le.chain : [le.from, le.to];
    // Build polyline through (possibly) dummies
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < chain.length; i++) {
      const id = chain[i]!;
      const nc = nodeCenter.get(id);
      const dc = dummyCenter.get(id);
      if (nc) {
        points.push({ x: nc.x, y: nc.y });
      } else if (dc) {
        points.push({ x: dc.x, y: dc.y });
      }
    }
    if (points.length < 2) {
      return { edge: le.original, path: "" };
    }
    // Clip endpoints to node borders
    const startNode = nodeCenter.get(chain[0]!);
    const endNode = nodeCenter.get(chain[chain.length - 1]!);
    if (startNode) {
      points[0] = clipToBox(points[0]!, points[1]!, startNode, dir, true);
    }
    if (endNode) {
      points[points.length - 1] = clipToBox(
        points[points.length - 1]!,
        points[points.length - 2]!,
        endNode,
        dir,
        false
      );
    }

    // Build Manhattan path: for each consecutive pair, insert an L-bend on the
    // dominant axis (TB: vertical primary; LR: horizontal primary).
    const d = buildManhattanPath(points, dir);

    // Label anchor: near source exit, offset toward target side. This keeps
    // branch labels (yes / no from a decision) close to the decision and off
    // the shared horizontal routing bar where midpoint-based anchors collide
    // with the edge line itself. Same strategy as entity-structure edges.
    let labelAnchor: { x: number; y: number } | undefined;
    if (le.original.label) {
      labelAnchor = edgeLabelAnchor(points, dir);
    }

    return {
      edge: {
        ...le.original,
        isReversed: le.isReversed,
      },
      path: d,
      labelAnchor,
    };
  });

  return {
    width: outWidth,
    height: outHeight,
    direction: dir,
    nodes: outNodes,
    edges: outEdges,
    clusters: [],
  };
}

// ─── Routing helpers ──────────────────────────────────────

function clipToBox(
  from: { x: number; y: number },
  toward: { x: number; y: number },
  box: { x: number; y: number; w: number; h: number },
  dir: FlowchartDirection,
  isStart: boolean
): { x: number; y: number } {
  // Clip the endpoint on the box side facing `toward`. Works for both start
  // (exit toward neighbor) and end (enter from neighbor); the formula is
  // identical — the arrow terminates where the straight ray from center →
  // toward crosses the box boundary.
  void isStart;
  const cx = box.x;
  const cy = box.y;
  if (dir === "TB" || dir === "BT") {
    const goingDown = toward.y >= from.y;
    return { x: cx, y: cy + (goingDown ? box.h / 2 : -box.h / 2) };
  }
  const goingRight = toward.x >= from.x;
  return { x: cx + (goingRight ? box.w / 2 : -box.w / 2), y: cy };
}

function buildManhattanPath(
  pts: Array<{ x: number; y: number }>,
  dir: FlowchartDirection
): string {
  if (pts.length === 0) return "";
  const parts: string[] = [`M ${fmt(pts[0]!.x)} ${fmt(pts[0]!.y)}`];
  const isHorizontal = dir === "LR" || dir === "RL";
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (isHorizontal) {
      // Horizontal primary: go right/left to midX, then vertical, then horizontal
      const midX = (a.x + b.x) / 2;
      parts.push(`L ${fmt(midX)} ${fmt(a.y)}`);
      parts.push(`L ${fmt(midX)} ${fmt(b.y)}`);
      parts.push(`L ${fmt(b.x)} ${fmt(b.y)}`);
    } else {
      const midY = (a.y + b.y) / 2;
      parts.push(`L ${fmt(a.x)} ${fmt(midY)}`);
      parts.push(`L ${fmt(b.x)} ${fmt(midY)}`);
      parts.push(`L ${fmt(b.x)} ${fmt(b.y)}`);
    }
  }
  return parts.join(" ");
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

function edgeLabelAnchor(
  pts: Array<{ x: number; y: number }>,
  dir: FlowchartDirection
): { x: number; y: number; textAnchor?: "start" | "middle" | "end" } {
  // Strategy: label sits next to the edge polyline on the segment that is
  // unique to this edge (so fan-out branches don't collide with shared
  // routing bars). Text-anchor is set so the glyphs clear the stroke — never
  // centered on the line itself.
  if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
  const a = pts[0]!;
  const b = pts[1]!;
  const isHorizontal = dir === "LR" || dir === "RL";

  if (isHorizontal) {
    const midX = (a.x + b.x) / 2;
    const bends = Math.abs(a.y - b.y) > 1;
    if (bends) {
      // Label on the vertical middle segment, text anchored to start so it
      // begins a gap to the right of the line.
      const midY = (a.y + b.y) / 2;
      return { x: midX + 6, y: midY, textAnchor: "start" };
    }
    // Straight horizontal run: label centered above the line with clearance.
    return { x: midX, y: a.y - 8, textAnchor: "middle" };
  }

  // TB / BT
  const midY = (a.y + b.y) / 2;
  const bends = Math.abs(a.x - b.x) > 1;
  if (bends) {
    // Label centered above the horizontal middle bar, clear of the stroke.
    const midX = (a.x + b.x) / 2;
    return { x: midX, y: midY - 8, textAnchor: "middle" };
  }
  // Straight vertical drop: anchor to the right of the stub so text begins a
  // gap past the line.
  return { x: a.x + 6, y: midY, textAnchor: "start" };
}

