/**
 * Threat Model layout — deterministic node placement + trust-boundary
 * containment boxes.
 *
 * Layering (left→right, DFD convention §7 of 31-DFD-STANDARD):
 *  - Build a longest-path layer index over the flow DAG (cycles broken by
 *    declaration order). Source-only externals drift left, sink-only externals
 *    right, processes/stores in the middle.
 *  - Within a layer, order by declaration to stay deterministic.
 *  - Data stores are nudged into a band slightly below their layer row so they
 *    read as "beneath the process they serve".
 *
 * Trust boundaries reuse the network engine's C4-style approach (read, not
 * shared): each boundary box is the union of its members' geometry inflated by
 * a fixed padding, with a header strip for the label (§5.5/§7.8 of 31).
 *
 * Fully deterministic — no randomness, stable given identical input.
 */

import type {
  LaidOutBoundary,
  LaidOutFlow,
  LaidOutNode,
  NodeStride,
  ThreatModelAst,
  ThreatModelLayout,
} from "./types";
import { analyseThreatModel } from "./analysis";

export const TM_CONST = {
  PAD: 24,
  /** Column (layer) pitch, left→right. */
  COL_GAP: 200,
  /** Row pitch within a column. */
  ROW_GAP: 110,
  EXTERNAL_W: 120,
  EXTERNAL_H: 60,
  PROCESS_R: 40,
  STORE_W: 150,
  STORE_H: 44,
  /** Extra downward nudge for data stores (the "store band" feel). */
  STORE_DROP: 36,
  /** Trust-boundary inflation around member geometry. */
  BOUNDARY_PAD: 18,
  /** Header strip height above a boundary box for its name tab. */
  BOUNDARY_HEADER: 22,
  /** Reserve at top for the title. */
  TITLE_H: 34,
  /** Clear gap between the title band and the top of the highest trust boundary. */
  TITLE_GAP: 10,
} as const;

interface Sized {
  w: number;
  h: number;
}

function sizeOf(kind: LaidOutNode["kind"]): Sized {
  switch (kind) {
    case "external":
      return { w: TM_CONST.EXTERNAL_W, h: TM_CONST.EXTERNAL_H };
    case "process":
      return { w: TM_CONST.PROCESS_R * 2, h: TM_CONST.PROCESS_R * 2 };
    case "store":
      return { w: TM_CONST.STORE_W, h: TM_CONST.STORE_H };
  }
}

export function layoutThreatModel(ast: ThreatModelAst): ThreatModelLayout {
  const analysis = analyseThreatModel(ast);
  const strideById = new Map<string, NodeStride>(
    analysis.nodes.map((n) => [n.id, n] as const)
  );

  const ids = ast.nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const indexOf = new Map(ids.map((id, idx) => [id, idx] as const));

  // ── Longest-path layer assignment over the flow DAG ──
  const outAdj = new Map<string, string[]>();
  for (const id of ids) outAdj.set(id, []);
  for (const f of ast.flows) {
    if (idSet.has(f.source) && idSet.has(f.target) && f.source !== f.target) {
      outAdj.get(f.source)!.push(f.target);
    }
  }

  const layer = new Map<string, number>();
  // Cycle-safe longest path via memoised DFS with an on-stack guard.
  const onStack = new Set<string>();
  const computeLayer = (id: string): number => {
    const cached = layer.get(id);
    if (cached !== undefined) return cached;
    if (onStack.has(id)) return 0; // back-edge: treat as layer 0 contribution
    onStack.add(id);
    // Layer = longest predecessor chain. We compute via successors → invert by
    // walking predecessors; simpler: layer(n) = 1 + max(layer(pred)).
    let best = 0;
    for (const f of ast.flows) {
      if (f.target === id && f.source !== id && idSet.has(f.source)) {
        best = Math.max(best, computeLayer(f.source) + 1);
      }
    }
    onStack.delete(id);
    layer.set(id, best);
    return best;
  };
  for (const id of ids) computeLayer(id);

  // Pin pure-source externals to layer 0, pure-sink externals to the last layer.
  let maxLayer = 0;
  for (const v of layer.values()) maxLayer = Math.max(maxLayer, v);
  for (const n of ast.nodes) {
    if (n.kind !== "external") continue;
    const hasIn = ast.flows.some((f) => f.target === n.id);
    const hasOut = ast.flows.some((f) => f.source === n.id);
    if (hasOut && !hasIn) layer.set(n.id, 0);
    else if (hasIn && !hasOut) layer.set(n.id, maxLayer);
  }
  maxLayer = 0;
  for (const v of layer.values()) maxLayer = Math.max(maxLayer, v);

  // ── Group ids by layer, stable order ──
  const byLayer = new Map<number, string[]>();
  for (let l = 0; l <= maxLayer; l++) byLayer.set(l, []);
  const sortedIds = [...ids].sort(
    (a, b) => (indexOf.get(a)! - indexOf.get(b)!)
  );
  for (const id of sortedIds) {
    const l = layer.get(id) ?? 0;
    byLayer.get(l)!.push(id);
  }

  // ── Assign coordinates ──
  const nodes: LaidOutNode[] = [];
  const nodeMap = new Map<string, LaidOutNode>();
  // When trust boundaries exist, each inflates BOUNDARY_PAD + BOUNDARY_HEADER
  // ABOVE / to the LEFT of its topmost / leftmost member. Reserve that room so a
  // boundary's red frame + label tab never rides up into the title band or clips
  // the left edge.
  const boundaryInset = ast.boundaries.length > 0
    ? TM_CONST.BOUNDARY_PAD + TM_CONST.BOUNDARY_HEADER
    : 0;
  const x0 = TM_CONST.PAD + (ast.boundaries.length > 0 ? TM_CONST.BOUNDARY_PAD : 0);
  const y0 = TM_CONST.PAD + TM_CONST.TITLE_H + (boundaryInset > 0 ? boundaryInset + TM_CONST.TITLE_GAP : 0);

  for (let l = 0; l <= maxLayer; l++) {
    const colIds = byLayer.get(l)!;
    const colX = x0 + l * TM_CONST.COL_GAP;
    colIds.forEach((id, row) => {
      const src = ast.nodes.find((n) => n.id === id)!;
      const sz = sizeOf(src.kind);
      const cx = colX + TM_CONST.EXTERNAL_W / 2;
      let cy = y0 + row * TM_CONST.ROW_GAP + sz.h / 2;
      if (src.kind === "store") cy += TM_CONST.STORE_DROP;
      const node: LaidOutNode = {
        ...src,
        x: cx - sz.w / 2,
        y: cy - sz.h / 2,
        w: sz.w,
        h: sz.h,
        cx,
        cy,
        stride: strideById.get(id)!,
      };
      nodes.push(node);
      nodeMap.set(id, node);
    });
  }

  // ── Flow routing (straight center-to-center polyline with a slight elbow) ──
  const flows: LaidOutFlow[] = [];
  for (const f of analysis.flows) {
    const s = nodeMap.get(f.source);
    const tg = nodeMap.get(f.target);
    if (!s || !tg) continue;
    const start = edgePoint(s, tg.cx, tg.cy);
    const end = edgePoint(tg, s.cx, s.cy);
    const points = [start, end];
    flows.push({
      ...f,
      points,
      labelX: (start.x + end.x) / 2,
      labelY: (start.y + end.y) / 2 - 6,
    });
  }

  // ── Trust boundaries: union of member geometry + padding (C4-style) ──
  const boundaries: LaidOutBoundary[] = [];
  for (const b of ast.boundaries) {
    let l = Infinity,
      t = Infinity,
      r = -Infinity,
      bm = -Infinity;
    for (const m of b.members) {
      const mn = nodeMap.get(m);
      if (!mn) continue;
      l = Math.min(l, mn.x);
      t = Math.min(t, mn.y);
      r = Math.max(r, mn.x + mn.w);
      bm = Math.max(bm, mn.y + mn.h);
    }
    if (!Number.isFinite(l)) continue;
    const p = TM_CONST.BOUNDARY_PAD;
    boundaries.push({
      name: b.name,
      x: l - p,
      y: t - p - TM_CONST.BOUNDARY_HEADER,
      w: r - l + p * 2,
      h: bm - t + p * 2 + TM_CONST.BOUNDARY_HEADER,
    });
  }

  // ── Canvas extent ──
  let maxX = 0,
    maxY = 0;
  for (const n of nodes) {
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  for (const b of boundaries) {
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  for (const f of flows) {
    for (const p of f.points) {
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  return {
    ast,
    analysis,
    nodes,
    flows,
    boundaries,
    width: maxX + TM_CONST.PAD,
    height: maxY + TM_CONST.PAD,
  };
}

/** Where a line from a node's center toward (tx,ty) exits the node's box/circle. */
function edgePoint(
  n: LaidOutNode,
  tx: number,
  ty: number
): { x: number; y: number } {
  const dx = tx - n.cx;
  const dy = ty - n.cy;
  if (dx === 0 && dy === 0) return { x: n.cx, y: n.cy };
  if (n.kind === "process") {
    const r = TM_CONST.PROCESS_R;
    const len = Math.hypot(dx, dy);
    return { x: n.cx + (dx / len) * r, y: n.cy + (dy / len) * r };
  }
  // Rectangle (external / store): clip to the box border.
  const hw = n.w / 2;
  const hh = n.h / 2;
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: n.cx + dx * scale, y: n.cy + dy * scale };
}

export { sizeOf };
