/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Brandes-Köpf horizontal coordinate assignment for layered graphs.
 *
 * Reference: Brandes & Köpf (2001) "Fast and Simple Horizontal
 * Coordinate Assignment". Adapted from the dagre-d3-es port of
 * `dagre/position/bk.js`, rewritten in TypeScript against our
 * generic BKNode interface so the module is reusable across
 * diagrams (flowchart, entity-structure, ER, block).
 *
 * High-level pipeline per call:
 *   1. findType1Conflicts  — mark crossings of inner (dummy→dummy)
 *                             segments so later alignments avoid them.
 *   2. verticalAlignment   — for each of 4 orientations, greedily pair
 *                             each node with its median neighbor in the
 *                             fixed layer, building blocks (chains of
 *                             aligned nodes that share x).
 *   3. horizontalCompaction — sweep left-to-right assigning each block
 *                             its minimum x respecting `nodeSep`.
 *   4. alignCoordinates    — shift the 4 candidate layouts to a common
 *                             reference (smallest-width alignment).
 *   5. balance             — per-node median of the 4 candidates.
 *
 * Zero external dependencies.
 */

export interface BKNode {
  id: string;
  width: number;
  isDummy: boolean;
}

/**
 * Compute x coordinates for every node across `layers`.
 *
 * @param layers   Layers of nodes in their sorted intra-layer order
 *                 (output of crossing minimization).
 * @param segments Edge endpoints as [from, to] pairs between adjacent
 *                 layers. The module only cares about adjacency.
 * @param nodeSep  Minimum cross-flow gap between two node borders in
 *                 the same layer.
 */
export function bkXCoords(
  layers: BKNode[][],
  segments: Array<[string, string]>,
  nodeSep: number
): Map<string, number> {
  if (layers.length === 0) return new Map();

  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();
  const indexInLayer = new Map<string, number>();
  const nodeById = new Map<string, BKNode>();

  for (const layer of layers) {
    for (let i = 0; i < layer.length; i++) {
      const n = layer[i]!;
      indexInLayer.set(n.id, i);
      nodeById.set(n.id, n);
      preds.set(n.id, []);
      succs.set(n.id, []);
    }
  }
  for (const [u, v] of segments) {
    if (!nodeById.has(u) || !nodeById.has(v)) continue;
    succs.get(u)!.push(v);
    preds.get(v)!.push(u);
  }

  // Compute type-1 conflicts on the original (vdir=up, hdir=left) orientation.
  // Conflicts are symmetric w.r.t. direction flips, so we can reuse them.
  const conflicts = findType1Conflicts(layers, preds, nodeById);

  const xss: Record<string, Map<string, number>> = {};
  for (const vertDir of ["u", "d"] as const) {
    const adjNeighbors =
      vertDir === "u"
        ? (v: string) => preds.get(v) ?? []
        : (v: string) => succs.get(v) ?? [];
    // For the "down" sweep, reverse the layer order so the algorithm's
    // "previous layer" becomes the original "next layer".
    const flippedV = vertDir === "u" ? layers : layers.slice().reverse();

    for (const horizDir of ["l", "r"] as const) {
      // For "right" sweep, reverse each layer; negate the result at end.
      const flippedH =
        horizDir === "l" ? flippedV : flippedV.map((l) => l.slice().reverse());

      const { root, align } = verticalAlignment(
        flippedH,
        conflicts,
        adjNeighbors
      );
      let xs = horizontalCompaction(flippedH, root, align, nodeById, nodeSep);
      if (horizDir === "r") {
        // Mirror x to undo the layer reversal.
        const neg = new Map<string, number>();
        for (const [k, v] of xs) neg.set(k, -v);
        xs = neg;
      }
      xss[vertDir + horizDir] = xs;
    }
  }

  alignCoordinates(xss, findSmallestWidthAlignment(xss, nodeById, nodeSep));
  return balance(xss);
}

// ─── Type-1 conflicts ─────────────────────────────────────────

function findType1Conflicts(
  layers: BKNode[][],
  preds: Map<string, string[]>,
  nodeById: Map<string, BKNode>
): Set<string> {
  const conflicts = new Set<string>();
  if (layers.length < 2) return conflicts;

  for (let li = 1; li < layers.length; li++) {
    const prev = layers[li - 1]!;
    const layer = layers[li]!;
    const prevIdx = new Map<string, number>();
    prev.forEach((n, i) => prevIdx.set(n.id, i));

    let k0 = 0;
    let scanPos = 0;
    const lastIdx = layer.length - 1;

    for (let i1 = 0; i1 < layer.length; i1++) {
      const v = layer[i1]!;
      // Upper endpoint of inner segment incident to v (if v is a dummy with
      // a dummy predecessor in the previous layer).
      let w: string | null = null;
      if (v.isDummy) {
        for (const p of preds.get(v.id) ?? []) {
          if (nodeById.get(p)?.isDummy && prevIdx.has(p)) {
            w = p;
            break;
          }
        }
      }
      if (w !== null || i1 === lastIdx) {
        const k1 = w !== null ? prevIdx.get(w)! : prev.length - 1;
        for (let i = scanPos; i <= i1; i++) {
          const vv = layer[i]!;
          for (const u of preds.get(vv.id) ?? []) {
            const uPos = prevIdx.get(u);
            if (uPos === undefined) continue;
            if (uPos < k0 || uPos > k1) {
              conflicts.add(conflictKey(u, vv.id));
            }
          }
        }
        scanPos = i1 + 1;
        k0 = k1;
      }
    }
  }
  return conflicts;
}

function conflictKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

function hasConflict(conflicts: Set<string>, a: string, b: string): boolean {
  return conflicts.has(conflictKey(a, b));
}

// ─── Vertical alignment ───────────────────────────────────────

function verticalAlignment(
  layers: BKNode[][],
  conflicts: Set<string>,
  neighborsOf: (id: string) => string[]
): { root: Map<string, string>; align: Map<string, string> } {
  const root = new Map<string, string>();
  const align = new Map<string, string>();
  const pos = new Map<string, number>();

  // Initial: each node is its own root / aligned to itself.
  for (const layer of layers) {
    for (let i = 0; i < layer.length; i++) {
      const v = layer[i]!.id;
      root.set(v, v);
      align.set(v, v);
      pos.set(v, i);
    }
  }

  // Sweep layers in order; within each layer, try to align each node with
  // its median neighbor(s) in the previous layer, rejecting alignments
  // that would (a) cross an earlier alignment, or (b) hit a type-1 conflict.
  for (const layer of layers) {
    let prevIdx = -1;
    for (const vn of layer) {
      const v = vn.id;
      const ws = neighborsOf(v).slice();
      if (ws.length === 0) continue;
      ws.sort((a, b) => (pos.get(a) ?? 0) - (pos.get(b) ?? 0));
      const mp = (ws.length - 1) / 2;
      const mids = [Math.floor(mp), Math.ceil(mp)];
      for (const mi of mids) {
        if (align.get(v) !== v) continue; // already aligned this step
        const w = ws[mi]!;
        if (hasConflict(conflicts, w, v)) continue;
        const wPos = pos.get(w) ?? 0;
        if (wPos <= prevIdx) continue;
        align.set(w, v);
        root.set(v, root.get(w)!);
        align.set(v, root.get(v)!);
        prevIdx = wPos;
      }
    }
  }
  return { root, align };
}

// ─── Horizontal compaction ────────────────────────────────────

function horizontalCompaction(
  layers: BKNode[][],
  root: Map<string, string>,
  align: Map<string, string>,
  nodeById: Map<string, BKNode>,
  nodeSep: number
): Map<string, number> {
  // BK class-based compaction:
  //   sink[v]   = sink of v's class (root whose leftmost block holds the class).
  //   shift[v]  = horizontal shift of the class.
  //   x[v]      = x of v *relative to its class sink*.
  const xs = new Map<string, number>();
  const sink = new Map<string, string>();
  const shift = new Map<string, number>();

  for (const layer of layers) {
    for (const v of layer) {
      sink.set(v.id, v.id);
      shift.set(v.id, Number.POSITIVE_INFINITY);
    }
  }

  // Map id → layer index and id → index-in-layer for pred lookup.
  const indexInLayer = new Map<string, number>();
  const layerOf = new Map<string, number>();
  for (let li = 0; li < layers.length; li++) {
    for (let i = 0; i < layers[li]!.length; i++) {
      const id = layers[li]![i]!.id;
      indexInLayer.set(id, i);
      layerOf.set(id, li);
    }
  }

  const sep = (uId: string, vId: string): number => {
    const u = nodeById.get(uId)!;
    const v = nodeById.get(vId)!;
    return u.width / 2 + nodeSep + v.width / 2;
  };

  const placeBlock = (v: string): void => {
    if (xs.has(v)) return;
    xs.set(v, 0);
    let w = v;
    // Walk around the block cycle (align chain).
    do {
      const wi = indexInLayer.get(w)!;
      const wLayer = layerOf.get(w)!;
      if (wi > 0) {
        const pred = layers[wLayer]![wi - 1]!.id;
        const u = root.get(pred)!;
        placeBlock(u);
        if (sink.get(v) === v) sink.set(v, sink.get(u)!);
        if (sink.get(v) !== sink.get(u)) {
          const candidate = xs.get(v)! - xs.get(u)! - sep(pred, w);
          const cur = shift.get(sink.get(u)!) ?? Number.POSITIVE_INFINITY;
          shift.set(sink.get(u)!, Math.min(cur, candidate));
        } else {
          const candidate = xs.get(u)! + sep(pred, w);
          if (candidate > xs.get(v)!) xs.set(v, candidate);
        }
      }
      w = align.get(w)!;
    } while (w !== v);
  };

  // Place all block roots.
  for (const layer of layers) {
    for (const v of layer) {
      if (root.get(v.id) === v.id) placeBlock(v.id);
    }
  }

  // Propagate class shifts; produce absolute coords.
  const result = new Map<string, number>();
  for (const layer of layers) {
    for (const v of layer) {
      const r = root.get(v.id)!;
      const rx = xs.get(r) ?? 0;
      const s = shift.get(sink.get(r)!);
      const sx = s !== undefined && s !== Number.POSITIVE_INFINITY ? s : 0;
      result.set(v.id, rx + sx);
    }
  }
  return result;
}

// ─── Alignment / balance ──────────────────────────────────────

function findSmallestWidthAlignment(
  xss: Record<string, Map<string, number>>,
  nodeById: Map<string, BKNode>,
  _nodeSep: number
): Map<string, number> {
  let best: Map<string, number> | null = null;
  let bestWidth = Number.POSITIVE_INFINITY;
  for (const key of Object.keys(xss)) {
    const xs = xss[key]!;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    for (const [id, x] of xs) {
      const n = nodeById.get(id);
      if (!n) continue;
      minX = Math.min(minX, x - n.width / 2);
      maxX = Math.max(maxX, x + n.width / 2);
    }
    const w = maxX - minX;
    if (w < bestWidth) {
      bestWidth = w;
      best = xs;
    }
  }
  return best ?? new Map();
}

/**
 * Align every candidate layout to the reference alignment by shifting
 * each so its leftmost (or rightmost for r-biased) node matches the
 * reference's. Mutates `xss` in place.
 */
function alignCoordinates(
  xss: Record<string, Map<string, number>>,
  ref: Map<string, number>
): void {
  let refMin = Number.POSITIVE_INFINITY;
  let refMax = Number.NEGATIVE_INFINITY;
  for (const [, v] of ref) {
    refMin = Math.min(refMin, v);
    refMax = Math.max(refMax, v);
  }
  for (const key of Object.keys(xss)) {
    const xs = xss[key]!;
    if (xs === ref) continue;
    let xMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    for (const [, v] of xs) {
      xMin = Math.min(xMin, v);
      xMax = Math.max(xMax, v);
    }
    const delta = key.endsWith("r") ? refMax - xMax : refMin - xMin;
    if (delta === 0) continue;
    for (const [k, v] of xs) xs.set(k, v + delta);
  }
}

function balance(
  xss: Record<string, Map<string, number>>
): Map<string, number> {
  const keys = Object.keys(xss);
  const result = new Map<string, number>();
  if (keys.length === 0) return result;
  const ids = new Set<string>();
  for (const k of keys) for (const id of xss[k]!.keys()) ids.add(id);
  for (const id of ids) {
    const vals: number[] = [];
    for (const k of keys) {
      const v = xss[k]!.get(id);
      if (v !== undefined) vals.push(v);
    }
    vals.sort((a, b) => a - b);
    // Average of the two middle values (balanced median).
    const n = vals.length;
    if (n === 0) continue;
    if (n % 2 === 0) {
      result.set(id, (vals[n / 2 - 1]! + vals[n / 2]!) / 2);
    } else {
      result.set(id, vals[(n - 1) / 2]!);
    }
  }
  return result;
}
