import type {
  PhyloTreeAST,
  PhyloNode,
  PhyloLayoutNode,
} from "../../core/types";

export interface PhyloLayoutResult {
  width: number;
  height: number;
  nodes: PhyloLayoutNode[];
  /** Branch paths: { path, cladeId?, isConnector } */
  branches: PhyloBranch[];
  ast: PhyloTreeAST;
  scale: number;
}

export interface PhyloBranch {
  path: string;
  fromId: string;
  toId: string;
  /** Clade id if this branch belongs to a highlighted clade */
  cladeId?: string;
  /** Is this a vertical/arc connector (no length meaning) vs horizontal branch */
  isConnector: boolean;
}

// ─── Tree Utilities ─────────────────────────────────────────

function collectLeaves(node: PhyloNode): PhyloNode[] {
  if (node.isLeaf) return [node];
  const leaves: PhyloNode[] = [];
  for (const child of node.children) {
    leaves.push(...collectLeaves(child));
  }
  return leaves;
}

function maxRootToTip(node: PhyloNode, distSoFar: number): number {
  if (node.isLeaf) return distSoFar;
  let maxDist = distSoFar;
  for (const child of node.children) {
    const childDist = maxRootToTip(child, distSoFar + (child.branchLength ?? 0));
    if (childDist > maxDist) maxDist = childDist;
  }
  return maxDist;
}

function maxDepth(node: PhyloNode): number {
  if (node.isLeaf) return 0;
  let max = 0;
  for (const child of node.children) {
    const d = maxDepth(child) + 1;
    if (d > max) max = d;
  }
  return max;
}

function estimateLabelWidth(node: PhyloNode): number {
  const label = node.label ?? node.id;
  return label.length * 7.2 + 6;
}

// ─── Clade Membership ───────────────────────────────────────

function buildCladeMap(
  ast: PhyloTreeAST
): Map<string, string> {
  const branchToCladeMap = new Map<string, string>();

  for (const clade of ast.clades) {
    const memberSet = new Set(clade.members);
    markCladeBranches(ast.root, memberSet, clade.id, branchToCladeMap);
  }

  return branchToCladeMap;
}

function markCladeBranches(
  node: PhyloNode,
  memberSet: Set<string>,
  cladeId: string,
  result: Map<string, string>
): boolean {
  if (node.isLeaf) {
    return memberSet.has(node.id);
  }

  const childResults: boolean[] = [];
  for (const child of node.children) {
    childResults.push(markCladeBranches(child, memberSet, cladeId, result));
  }

  const allIn = childResults.every(Boolean);
  const anyIn = childResults.some(Boolean);

  if (allIn && anyIn) {
    for (const child of node.children) {
      result.set(child.id, cladeId);
    }
    return true;
  }

  // Partial — mark only children that are fully within
  for (let i = 0; i < node.children.length; i++) {
    if (childResults[i]) {
      result.set(node.children[i].id, cladeId);
    }
  }

  return false;
}

// ─── Rectangular Phylogram Layout ───────────────────────────

const TIP_SPACING = 20;
const PADDING_LEFT = 20;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 40;

export function layoutPhylo(ast: PhyloTreeAST): PhyloLayoutResult {
  const leaves = collectLeaves(ast.root);
  const numLeaves = leaves.length;
  const tipSpacing = TIP_SPACING;

  // Compute scale
  const maxLabelWidth = Math.max(...leaves.map(estimateLabelWidth), 60);
  const maxDist = maxRootToTip(ast.root, 0);
  const isCladogram = ast.mode === "cladogram";

  const availableWidth = Math.max(300, numLeaves * 30 + maxLabelWidth + 100);
  const plotWidth = availableWidth - PADDING_LEFT - PADDING_RIGHT - maxLabelWidth;

  let scale: number;
  if (isCladogram || maxDist === 0) {
    const depth = maxDepth(ast.root);
    scale = depth > 0 ? plotWidth / depth : plotWidth;
  } else {
    scale = plotWidth / maxDist;
  }

  // Step 1: assign Y to leaves (in-order)
  const nodeMap = new Map<string, PhyloLayoutNode>();
  let leafIdx = 0;

  function assignLeafY(node: PhyloNode): void {
    if (node.isLeaf) {
      const y = PADDING_TOP + leafIdx * tipSpacing;
      nodeMap.set(node.id, { node, x: 0, y });
      leafIdx++;
      return;
    }
    for (const child of node.children) {
      assignLeafY(child);
    }
  }
  assignLeafY(ast.root);

  // Step 2: assign Y to internal nodes (mean of children)
  function assignInternalY(node: PhyloNode): number {
    const existing = nodeMap.get(node.id);
    if (node.isLeaf && existing) return existing.y;
    const childYs = node.children.map(assignInternalY);
    const y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
    if (!existing) {
      nodeMap.set(node.id, { node, x: 0, y });
    } else {
      existing.y = y;
    }
    return y;
  }
  assignInternalY(ast.root);

  // Step 3: assign X (distance from root)
  function assignX(node: PhyloNode, parentX: number, depth: number): void {
    let x: number;
    if (node === ast.root) {
      x = PADDING_LEFT;
    } else if (isCladogram) {
      if (node.isLeaf) {
        x = PADDING_LEFT + plotWidth;
      } else {
        x = PADDING_LEFT + depth * (plotWidth / maxDepth(ast.root));
      }
    } else {
      x = parentX + (node.branchLength ?? 0) * scale;
    }

    const layoutNode = nodeMap.get(node.id);
    if (layoutNode) layoutNode.x = x;

    for (const child of node.children) {
      assignX(child, x, depth + 1);
    }
  }
  assignX(ast.root, PADDING_LEFT, 0);

  // For cladogram: recalculate internal node X as parent of children
  if (isCladogram) {
    assignCladogramInternalX(ast.root, nodeMap);
  }

  // Build clade membership map
  const cladeMap = buildCladeMap(ast);

  // Step 4: generate branch paths
  const branches: PhyloBranch[] = [];

  function generateBranches(node: PhyloNode): void {
    const parentLayout = nodeMap.get(node.id);
    if (!parentLayout) return;

    if (node.children.length === 0) return;

    const childLayouts = node.children
      .map((c) => nodeMap.get(c.id))
      .filter((l): l is PhyloLayoutNode => l !== undefined);

    if (childLayouts.length === 0) return;

    // Vertical connector from min child Y to max child Y at parent X
    const minY = Math.min(...childLayouts.map((c) => c.y));
    const maxY = Math.max(...childLayouts.map((c) => c.y));

    if (ast.layout === "slanted") {
      // Slanted: diagonal lines from parent to each child
      for (const child of node.children) {
        const childLayout = nodeMap.get(child.id);
        if (!childLayout) continue;
        const pathStr = `M ${parentLayout.x},${parentLayout.y} L ${childLayout.x},${childLayout.y}`;
        branches.push({
          path: pathStr,
          fromId: node.id,
          toId: child.id,
          cladeId: cladeMap.get(child.id),
          isConnector: false,
        });
      }
    } else {
      // Rectangular: vertical connector + horizontal branches
      branches.push({
        path: `M ${parentLayout.x},${minY} V ${maxY}`,
        fromId: node.id,
        toId: node.id,
        isConnector: true,
      });

      for (const child of node.children) {
        const childLayout = nodeMap.get(child.id);
        if (!childLayout) continue;
        const pathStr = `M ${parentLayout.x},${childLayout.y} H ${childLayout.x}`;
        branches.push({
          path: pathStr,
          fromId: node.id,
          toId: child.id,
          cladeId: cladeMap.get(child.id),
          isConnector: false,
        });
      }
    }

    for (const child of node.children) {
      generateBranches(child);
    }
  }

  generateBranches(ast.root);

  // Compute final dimensions
  const allNodes = Array.from(nodeMap.values());
  let maxX = Math.max(...allNodes.map((n) => n.x + (n.node.isLeaf ? estimateLabelWidth(n.node) : 0)));

  // Add space for clade labels (background/both mode places labels to the right)
  let maxCladeLabelWidth = 0;
  for (const clade of ast.clades) {
    if (clade.label && clade.highlight && clade.highlight !== "branch") {
      const w = clade.label.length * 8 + 30;
      if (w > maxCladeLabelWidth) maxCladeLabelWidth = w;
    }
  }
  maxX += maxCladeLabelWidth;

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
  };
}

function assignCladogramInternalX(
  node: PhyloNode,
  nodeMap: Map<string, PhyloLayoutNode>
): number {
  if (node.isLeaf) {
    return nodeMap.get(node.id)?.x ?? 0;
  }

  let minChildX = Infinity;
  for (const child of node.children) {
    const childX = assignCladogramInternalX(child, nodeMap);
    if (childX < minChildX) minChildX = childX;
  }

  const layout = nodeMap.get(node.id);
  if (layout) {
    layout.x = minChildX - 40;
    if (layout.x < PADDING_LEFT) layout.x = PADDING_LEFT;
  }

  return layout?.x ?? PADDING_LEFT;
}
