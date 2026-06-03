import type {
  MindmapAST,
  MindmapLayoutEdge,
  MindmapLayoutNode,
  MindmapLayoutResult,
  MindmapNode,
} from "../../core/types";
import {
  measureLabel,
  widthBudget,
  normalize,
  fontSizeOf,
} from "./layout";

/**
 * Futures Wheel layout — Jerome Glenn (1972), structured-foresight brainstorming.
 *
 * A depth-banded radial tree: the central trend/event sits at the origin, its
 * 1st-order consequences form a ring around it, each 1st-order node's own
 * consequences form a 2nd-order ring further out, and so on (typically 2–3
 * rings). Concretely:
 *
 *   • A node at tree-depth `d` sits at radius `d × RING_GAP` from the center.
 *     (`tests/mindmap/futureswheel.test.ts` pins this invariant.)
 *   • The full 360° is partitioned among the root's children, each weighted by
 *     its subtree's *leaf count* so visually heavy branches get more arc.
 *   • Every child is then placed at the angular CENTER of a sub-slice carved
 *     out of its parent's own angular sector — so 2nd-order nodes cluster near
 *     the 1st-order parent they descend from (the defining Futures-Wheel read).
 *
 * Nodes carry `branchIndex` = the index of the 1st-order ancestor they belong
 * to (root = -1), which the renderer maps to palette colour. The node's tree
 * depth (its "order") drives the `mm-order-N` semantic CSS class.
 *
 * Output reuses the shared `MindmapLayoutNode` / `MindmapLayoutEdge` shapes and
 * the standard `normalize()` padding pass, so the existing renderer can consume
 * it unchanged (modulo the ring-specific decorations the renderer adds).
 */

/** Radial distance between consecutive rings (depth → radius scale). */
export const RING_GAP = 150;

// Straight radial spokes connect parent→child. A Futures Wheel is read by
// "follow the spoke outward", so curves would only obscure the order banding.
function spokePath(x1: number, y1: number, x2: number, y2: number): string {
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function edgeWidthForOrder(order: number): number {
  if (order <= 1) return 2.2;
  if (order === 2) return 1.6;
  return 1.2;
}

/** Leaf count of a subtree — used as the angular weight for arc allocation. */
function leafCount(node: MindmapNode): number {
  if (node.children.length === 0) return 1;
  let sum = 0;
  for (const c of node.children) sum += leafCount(c);
  return sum;
}

interface PlacedNode {
  layout: MindmapLayoutNode;
  /** Angle (radians) of this node's center, measured from +x, clockwise+. */
  angle: number;
}

export function layoutFuturesWheel(ast: MindmapAST): MindmapLayoutResult {
  const root = ast.root;
  const mw = ast.maxLabelWidth;
  const nodes: MindmapLayoutNode[] = [];
  const placed = new Map<string, PlacedNode>();

  // ── Root at origin ──────────────────────────────────────────────────────
  const rootM = measureLabel(root, widthBudget(0, mw));
  const rootLayout: MindmapLayoutNode = {
    node: root,
    x: 0,
    y: 0,
    side: "center",
    branchIndex: -1,
    labelWidth: rootM.width,
    labelHeight: rootM.height,
    fontSize: fontSizeOf(0),
    lines: rootM.lines,
  };
  nodes.push(rootLayout);
  placed.set(root.id, { layout: rootLayout, angle: 0 });

  /**
   * Recursively place `node`'s children inside the angular sector
   * [`a0`, `a1`] (radians). Each child owns a sub-slice proportional to its
   * leaf weight and is positioned at that slice's angular center.
   */
  const placeChildren = (
    node: MindmapNode,
    a0: number,
    a1: number,
    branchIndex: number
  ): void => {
    const kids = node.children;
    if (kids.length === 0) return;

    const weights = kids.map(leafCount);
    const totalW = weights.reduce((s, w) => s + w, 0);
    const span = a1 - a0;

    let cursor = a0;
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      const slice = (weights[i] / totalW) * span;
      const sliceStart = cursor;
      const sliceEnd = cursor + slice;
      const mid = (sliceStart + sliceEnd) / 2;
      cursor = sliceEnd;

      const order = child.depth; // tree depth == consequence order (1, 2, …)
      const radius = order * RING_GAP;
      const m = measureLabel(child, widthBudget(child.depth, mw));
      // Root's direct children seed the branch palette index; deeper nodes
      // inherit their 1st-order ancestor's index.
      const childBranch = node.depth === 0 ? i : branchIndex;

      const layout: MindmapLayoutNode = {
        node: child,
        x: radius * Math.cos(mid),
        y: radius * Math.sin(mid),
        // Right half-plane → label extends right; left half-plane → left.
        side: Math.cos(mid) >= 0 ? "right" : "left",
        branchIndex: childBranch,
        labelWidth: m.width,
        labelHeight: m.height,
        fontSize: fontSizeOf(child.depth),
        lines: m.lines,
      };
      nodes.push(layout);
      placed.set(child.id, { layout, angle: mid });

      // Descend: children stay strictly within this child's own slice, so
      // grandchildren cluster around their parent.
      placeChildren(child, sliceStart, sliceEnd, childBranch);
    }
  };

  // 1st-order ring spans the full circle. Start slightly above +x so the
  // first branch reads at roughly the top-right (a conventional wheel start).
  const START = -Math.PI / 2;
  placeChildren(root, START, START + Math.PI * 2, -1);

  // ── Edges: straight radial spokes, center→outward ─────────────────────────
  const edges: MindmapLayoutEdge[] = [];
  const walkEdges = (parent: MindmapNode): void => {
    const p = placed.get(parent.id);
    if (!p) return;
    for (const c of parent.children) {
      const cp = placed.get(c.id);
      if (!cp) continue;
      edges.push({
        from: parent.id,
        to: c.id,
        path: spokePath(p.layout.x, p.layout.y, cp.layout.x, cp.layout.y),
        color: "",
        width: edgeWidthForOrder(c.depth),
      });
      walkEdges(c);
    }
  };
  walkEdges(root);

  const { width, height } = normalize(nodes);

  // Edges were built against pre-normalize coordinates; normalize() shifts all
  // node positions by a constant delta, so rebuild spoke paths from the final
  // node coordinates to keep them aligned.
  const byId = new Map(nodes.map((n) => [n.node.id, n]));
  for (const e of edges) {
    const f = byId.get(e.from);
    const t = byId.get(e.to);
    if (f && t) e.path = spokePath(f.x, f.y, t.x, t.y);
  }

  return {
    width,
    height,
    // `style` is constrained to the base union; futureswheel renders on `map`.
    style: "map",
    nodes,
    edges,
    title: ast.title,
  };
}

/**
 * Center of the wheel in final (post-normalize) canvas coordinates — the root
 * node's position. The renderer needs this to draw the faint ring guide
 * circles, and tests use it to assert the radius invariant.
 */
export function wheelCenter(result: MindmapLayoutResult): { cx: number; cy: number } {
  for (const n of result.nodes) {
    if (n.node.depth === 0) return { cx: n.x, cy: n.y };
  }
  return { cx: result.width / 2, cy: result.height / 2 };
}

/** Max consequence order (ring count) present in a laid-out wheel. */
export function maxOrder(result: MindmapLayoutResult): number {
  let max = 0;
  for (const n of result.nodes) if (n.node.depth > max) max = n.node.depth;
  return max;
}
