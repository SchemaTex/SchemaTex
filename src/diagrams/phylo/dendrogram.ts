import type {
  PhyloTreeAST,
  PhyloNode,
  PhyloLayoutNode,
} from "../../core/types";
import type { PhyloLayoutResult, PhyloBranch } from "./layout";

// ─── Dendrogram (hierarchical-clustering tree) ───────────────
//
// A dendrogram differs from a cladogram in that internal nodes are positioned
// at their *merge height* (the cluster distance at which two sub-clusters
// join). Leaves all align at the baseline (height 0). Connectors are
// rectangular "elbow" U-shapes. An optional `cut` threshold slices the tree
// into flat clusters, each drawn in a distinct colour.
//
// Convention (matching the rest of the phylo engine — root on the left,
// tips on the right):
//   - height 0  → rightmost  (leaves)
//   - maxHeight → leftmost   (root)
//   - x = PADDING_LEFT + (maxHeight - height) * scale
//
// This module is phylo-local: dendrogram mode is flagged via
// `ast.metadata.dendrogram === "true"` rather than the shared PhyloMode union.

const TIP_SPACING = 24;
const PADDING_LEFT = 20;
const PADDING_RIGHT = 20;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 52;

/** Is this AST a dendrogram (phylo-local mode carried in metadata)? */
export function isDendrogram(ast: PhyloTreeAST): boolean {
  return ast.metadata?.dendrogram === "true";
}

/** Parsed cut threshold, or undefined when no `cut` directive was given. */
export function getCut(ast: PhyloTreeAST): number | undefined {
  const raw = ast.metadata?.cut;
  if (raw === undefined) return undefined;
  const val = Number(raw);
  return Number.isNaN(val) ? undefined : val;
}

function collectLeaves(node: PhyloNode): PhyloNode[] {
  if (node.isLeaf) return [node];
  const leaves: PhyloNode[] = [];
  for (const child of node.children) {
    leaves.push(...collectLeaves(child));
  }
  return leaves;
}

function estimateLabelWidth(node: PhyloNode): number {
  const label = node.label ?? node.id;
  return label.length * 7.2 + 6;
}

/**
 * Merge height of a node = the cophenetic height at which its sub-clusters
 * join, computed as the maximum branch-length distance from this node down to
 * any descendant tip. Leaves have height 0. This is the standard
 * hierarchical-clustering interpretation and is stable for arbitrary
 * branch-length inputs.
 */
function computeHeights(node: PhyloNode, out: Map<string, number>): number {
  if (node.isLeaf) {
    out.set(node.id, 0);
    return 0;
  }
  let max = 0;
  for (const child of node.children) {
    const childHeight = computeHeights(child, out);
    const branch = child.branchLength ?? 0;
    const reach = childHeight + branch;
    if (reach > max) max = reach;
  }
  out.set(node.id, max);
  return max;
}

/**
 * Compute flat clusters produced by a horizontal/vertical cut at `cutValue`.
 * A cluster is the maximal subtree rooted at a node whose merge height is
 * <= cutValue but whose parent's merge height is > cutValue (i.e. the cut line
 * severs the edge above it). Returns one entry per cluster: the cluster's root
 * node and the set of leaf ids it contains.
 */
export interface DendrogramCluster {
  rootId: string;
  leafIds: string[];
}

export function computeClusters(
  ast: PhyloTreeAST,
  heights: Map<string, number>,
  cutValue: number
): DendrogramCluster[] {
  const clusters: DendrogramCluster[] = [];

  function visit(node: PhyloNode, parentHeight: number): void {
    const h = heights.get(node.id) ?? 0;
    // The edge entering `node` crosses the cut line when the parent merges
    // above the cut but this node merges at/below it. The root is treated as
    // having an infinite parent height.
    if (h <= cutValue && parentHeight > cutValue) {
      clusters.push({ rootId: node.id, leafIds: collectLeaves(node).map((l) => l.id) });
      return;
    }
    // Node merges above the cut — descend; its children may form clusters.
    if (h > cutValue) {
      for (const child of node.children) visit(child, h);
    } else {
      // h <= cut and parent <= cut: already inside a containing cluster — this
      // branch is unreachable for the root call but kept for completeness.
      clusters.push({ rootId: node.id, leafIds: collectLeaves(node).map((l) => l.id) });
    }
  }

  visit(ast.root, Number.POSITIVE_INFINITY);
  return clusters;
}

export function layoutDendrogram(ast: PhyloTreeAST): PhyloLayoutResult {
  const leaves = collectLeaves(ast.root);
  const numLeaves = leaves.length;

  const heights = new Map<string, number>();
  const maxHeight = computeHeights(ast.root, heights);

  const maxLabelWidth = Math.max(...leaves.map(estimateLabelWidth), 60);
  const availableWidth = Math.max(320, numLeaves * 36 + maxLabelWidth + 120);
  const plotWidth = availableWidth - PADDING_LEFT - PADDING_RIGHT - maxLabelWidth;

  // Pixels per unit of merge height.
  const scale = maxHeight > 0 ? plotWidth / maxHeight : plotWidth;

  // Baseline (height 0) sits at the right edge of the plot; root at the left.
  const baselineX = PADDING_LEFT + plotWidth;
  const heightToX = (h: number): number => baselineX - h * scale;

  const nodeMap = new Map<string, PhyloLayoutNode>();

  // Step 1: leaf Y in-order, leaf X pinned to baseline.
  let leafIdx = 0;
  function assignLeaf(node: PhyloNode): void {
    if (node.isLeaf) {
      const y = PADDING_TOP + leafIdx * TIP_SPACING;
      nodeMap.set(node.id, { node, x: baselineX, y });
      leafIdx++;
      return;
    }
    for (const child of node.children) assignLeaf(child);
  }
  assignLeaf(ast.root);

  // Step 2: internal Y = midpoint of children; X from merge height.
  function assignInternal(node: PhyloNode): number {
    const existing = nodeMap.get(node.id);
    if (node.isLeaf && existing) return existing.y;
    const childYs = node.children.map(assignInternal);
    const y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
    const x = heightToX(heights.get(node.id) ?? 0);
    if (existing) {
      existing.y = y;
      existing.x = x;
    } else {
      nodeMap.set(node.id, { node, x, y });
    }
    return y;
  }
  assignInternal(ast.root);

  // Optional cut → assign each leaf a cluster index for colouring.
  const cut = getCut(ast);
  const leafCluster = new Map<string, number>();
  let clusterCount = 0;
  if (cut !== undefined) {
    const clusters = computeClusters(ast, heights, cut);
    clusterCount = clusters.length;
    clusters.forEach((cluster, idx) => {
      for (const leafId of cluster.leafIds) leafCluster.set(leafId, idx);
    });
  }

  /** Cluster index for an internal node's outgoing edge, when its whole
   * subtree lies in a single cut cluster; otherwise undefined (above the cut). */
  function subtreeCluster(node: PhyloNode): number | undefined {
    const ids = collectLeaves(node).map((l) => l.id);
    const first = leafCluster.get(ids[0]);
    if (first === undefined) return undefined;
    for (const id of ids) {
      if (leafCluster.get(id) !== first) return undefined;
    }
    return first;
  }

  // Step 3: rectangular elbow connectors.
  const branches: PhyloBranch[] = [];

  function generate(node: PhyloNode): void {
    if (node.children.length === 0) return;
    const parent = nodeMap.get(node.id);
    if (!parent) return;

    const childLayouts = node.children
      .map((c) => nodeMap.get(c.id))
      .filter((l): l is PhyloLayoutNode => l !== undefined);
    if (childLayouts.length === 0) return;

    const minY = Math.min(...childLayouts.map((c) => c.y));
    const maxY = Math.max(...childLayouts.map((c) => c.y));

    // Vertical bar of the U at the node's merge-height X, spanning children.
    branches.push({
      path: `M ${parent.x},${minY} V ${maxY}`,
      fromId: node.id,
      toId: node.id,
      isConnector: true,
    });

    // Horizontal arm of the U out to each child's X.
    for (const child of node.children) {
      const childLayout = nodeMap.get(child.id);
      if (!childLayout) continue;
      const cluster = subtreeCluster(child);
      branches.push({
        path: `M ${parent.x},${childLayout.y} H ${childLayout.x}`,
        fromId: node.id,
        toId: child.id,
        cladeId: cluster !== undefined ? `cut${cluster}` : undefined,
        isConnector: false,
      });
    }

    for (const child of node.children) generate(child);
  }
  generate(ast.root);

  const allNodes = Array.from(nodeMap.values());
  const maxX = Math.max(
    ...allNodes.map((n) => n.x + (n.node.isLeaf ? estimateLabelWidth(n.node) : 0))
  );
  const maxNodeY = Math.max(...allNodes.map((n) => n.y));

  const width = Math.max(maxX + PADDING_RIGHT, availableWidth);
  const height = maxNodeY + PADDING_TOP + PADDING_BOTTOM;

  return {
    width,
    height,
    nodes: allNodes,
    branches,
    ast,
    scale,
    // Dendrogram-specific extras stashed for the renderer (see types below).
    dendrogram: {
      maxHeight,
      baselineX,
      plotLeftX: PADDING_LEFT,
      scale,
      cut,
      clusterCount,
      leafCluster,
      heights,
    },
  };
}
