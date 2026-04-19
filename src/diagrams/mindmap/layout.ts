import type {
  MindmapAST,
  MindmapLayoutEdge,
  MindmapLayoutNode,
  MindmapLayoutResult,
  MindmapNode,
  MindmapStyle,
} from "../../core/types";

/**
 * Mindmap layout — two XMind-inspired styles:
 *   map          — center + branches split left/right, each side vertically stacked
 *   logic-right  — root on left, tidy tree extending right (markmap-compatible)
 *
 * Layout invariants:
 *   • Each node's n.x is its label's horizontal CENTER. Text renders
 *     anchor-middle at n.x, so labels are centered in their depth's column.
 *   • Per-depth columns are globally aligned: before laying out, we scan
 *     the tree for the max label width at each depth, then every depth-d
 *     node shares the same slot-center x. Prevents ragged columns where a
 *     long-label parent pushes its child further out than a sibling's.
 *   • Bezier edges travel from the parent label's OUTER edge (right edge
 *     for right-side, left edge for left-side) to the child label's
 *     INNER edge. For main branches, the colored underline sits beneath
 *     the label and visually merges with the incoming bezier — reading
 *     as one continuous colored stroke.
 */

const PADDING = 40;
const SIBLING_GAP = 20;     // vertical gap between sibling subtree rects
const MAIN_GAP = 44;        // vertical gap between main branches on same side
const ROOT_CAPSULE_PAD_X = 10;
const ROOT_CAPSULE_PAD_Y = 10;

// Horizontal span of the Bezier curve between consecutive slot columns.
// Deeper levels use a tighter gap — at depth ≥2 there's usually only one
// child, and a wide constant span reads as awkward empty space.
function bezierGapFor(childDepth: number): number {
  if (childDepth <= 1) return 90;
  if (childDepth === 2) return 60;
  return 45;
}

const FONT_CENTRAL = 20;
const FONT_MAIN = 15;
const FONT_SUB = 13;

function fontSizeOf(depth: number): number {
  if (depth === 0) return FONT_CENTRAL;
  if (depth === 1) return FONT_MAIN;
  return FONT_SUB;
}

function estimateLabelWidth(label: string, depth: number): number {
  return Math.max(32, label.length * fontSizeOf(depth) * 0.58);
}

function rowHeightOf(depth: number): number {
  return fontSizeOf(depth) + 14;
}

// ─── Column bookkeeping ──────────────────────────────────────────────────

interface Columns {
  /** Center x of the slot at depth d. All depth-d nodes share this x. */
  center: number[];
}

function computeColumns(subtreeRoots: MindmapNode[], firstColStartX: number): Columns {
  const maxLW: number[] = [];
  const walk = (n: MindmapNode) => {
    const lw = estimateLabelWidth(n.label, n.depth);
    if (maxLW[n.depth] === undefined || lw > maxLW[n.depth]) maxLW[n.depth] = lw;
    for (const c of n.children) walk(c);
  };
  for (const r of subtreeRoots) walk(r);

  const center: number[] = [];
  if (subtreeRoots.length === 0) return { center };
  const rootDepth = subtreeRoots[0].depth;
  // Slot-left of first column is firstColStartX; center = left + lw/2.
  let slotLeft = firstColStartX;
  center[rootDepth] = slotLeft + maxLW[rootDepth] / 2;
  for (let d = rootDepth + 1; d < maxLW.length; d++) {
    slotLeft = slotLeft + maxLW[d - 1] + bezierGapFor(d);
    center[d] = slotLeft + maxLW[d] / 2;
  }
  return { center };
}

// ─── Core primitive: tidy tree extending rightward ───────────────────────

function tidyRight(
  node: MindmapNode,
  yTop: number,
  branchIdx: number,
  columns: Columns,
  out: MindmapLayoutNode[]
): { layoutNode: MindmapLayoutNode; height: number } {
  const rowH = rowHeightOf(node.depth);
  const lw = estimateLabelWidth(node.label, node.depth);
  const x = columns.center[node.depth];

  if (node.children.length === 0) {
    const ln: MindmapLayoutNode = {
      node,
      x,
      y: yTop + rowH / 2,
      side: "right",
      branchIndex: branchIdx,
      labelWidth: lw,
      labelHeight: rowH,
    };
    out.push(ln);
    return { layoutNode: ln, height: rowH };
  }

  let cursor = yTop;
  const childLayouts: MindmapLayoutNode[] = [];
  for (let i = 0; i < node.children.length; i++) {
    if (i > 0) cursor += SIBLING_GAP;
    const { layoutNode: cln, height } = tidyRight(
      node.children[i],
      cursor,
      branchIdx,
      columns,
      out
    );
    childLayouts.push(cln);
    cursor += height;
  }
  const totalH = Math.max(rowH, cursor - yTop);

  const firstY = childLayouts[0].y;
  const lastY = childLayouts[childLayouts.length - 1].y;
  const parentY = (firstY + lastY) / 2;

  const ln: MindmapLayoutNode = {
    node,
    x,
    y: parentY,
    side: "right",
    branchIndex: branchIdx,
    labelWidth: lw,
    labelHeight: rowH,
  };
  out.push(ln);
  return { layoutNode: ln, height: totalH };
}

// ─── Edge geometry helpers ───────────────────────────────────────────────

/** Horizontal edge of a node's label on the side the edge travels toward. */
function labelEdgeX(n: MindmapLayoutNode, outward: boolean): number {
  // outward = from this node moving away from the root.
  // center: outward direction depends on child side — caller handles.
  if (n.side === "center") return n.x; // caller offsets by capsuleW/2
  const dir = n.side === "left" ? -1 : 1;
  return n.x + (outward ? dir : -dir) * n.labelWidth / 2;
}

function bezierH(x1: number, y1: number, x2: number, y2: number): string {
  const k = (x2 - x1) * 0.55;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + k).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - k).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function edgeWidthFor(depth: number): number {
  return depth <= 1 ? 2.2 : 1.4;
}

// ─── Canvas normalization ────────────────────────────────────────────────

function normalize(nodes: MindmapLayoutNode[]): { width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const lw = n.labelWidth;
    const lh = n.labelHeight;
    // All labels are now center-anchored on n.x.
    const leftX = n.x - lw / 2;
    const rightX = n.x + lw / 2;
    minX = Math.min(minX, leftX);
    maxX = Math.max(maxX, rightX);
    minY = Math.min(minY, n.y - lh);
    maxY = Math.max(maxY, n.y + lh);
  }
  const dx = PADDING - minX;
  const dy = PADDING - minY;
  for (const n of nodes) {
    n.x += dx;
    n.y += dy;
  }
  return { width: (maxX - minX) + PADDING * 2, height: (maxY - minY) + PADDING * 2 };
}

// ─── Shared edge construction ────────────────────────────────────────────

function buildEdges(root: MindmapNode, byId: Map<string, MindmapLayoutNode>): MindmapLayoutEdge[] {
  const edges: MindmapLayoutEdge[] = [];
  const walk = (parent: MindmapNode) => {
    const pln = byId.get(parent.id)!;
    for (const c of parent.children) {
      const cln = byId.get(c.id)!;
      let fromX: number;
      if (pln.side === "center") {
        // Root capsule — emit from left or right capsule edge based on child side.
        const halfW = pln.labelWidth / 2;
        fromX = cln.side === "left" ? pln.x - halfW : pln.x + halfW;
      } else {
        fromX = labelEdgeX(pln, true);
      }
      const toX = labelEdgeX(cln, false);
      edges.push({
        from: parent.id,
        to: c.id,
        path: bezierH(fromX, pln.y, toX, cln.y),
        color: "",
        width: edgeWidthFor(c.depth),
      });
      walk(c);
    }
  };
  walk(root);
  return edges;
}

// ─── Style: Map (balanced left/right) ────────────────────────────────────

function layoutMap(ast: MindmapAST): MindmapLayoutResult {
  const root = ast.root;
  const mains = root.children;
  const rightCount = Math.ceil(mains.length / 2);
  const rightMains = mains.slice(0, rightCount);
  const leftMains = mains.slice(rightCount);

  const nodes: MindmapLayoutNode[] = [];

  const rootLabelW = estimateLabelWidth(root.label, 0);
  const rootCapsuleW = rootLabelW + ROOT_CAPSULE_PAD_X * 2;
  const rootCapsuleH = rowHeightOf(0) + ROOT_CAPSULE_PAD_Y;
  const firstColLeft = rootCapsuleW / 2 + bezierGapFor(1);

  // Right side — stack mains vertically; all depth-d nodes share one column.
  const rightCols = computeColumns(rightMains, firstColLeft);
  let rightCursor = 0;
  for (let i = 0; i < rightMains.length; i++) {
    if (i > 0) rightCursor += MAIN_GAP;
    const { height } = tidyRight(rightMains[i], rightCursor, i, rightCols, nodes);
    rightCursor += height;
  }
  const rightHeight = rightCursor;

  // Left side — lay out as "right" then mirror x and re-tag side.
  const leftCols = computeColumns(leftMains, firstColLeft);
  const leftStart = nodes.length;
  let leftCursor = 0;
  for (let i = 0; i < leftMains.length; i++) {
    if (i > 0) leftCursor += MAIN_GAP;
    const { height } = tidyRight(leftMains[i], leftCursor, rightCount + i, leftCols, nodes);
    leftCursor += height;
  }
  const leftHeight = leftCursor;
  for (let k = leftStart; k < nodes.length; k++) {
    nodes[k].x = -nodes[k].x;
    nodes[k].side = "left";
  }

  const rootY = Math.max(rightHeight, leftHeight) / 2;
  const rootNode: MindmapLayoutNode = {
    node: root,
    x: 0,
    y: rootY,
    side: "center",
    branchIndex: -1,
    labelWidth: rootCapsuleW,
    labelHeight: rootCapsuleH,
  };
  nodes.push(rootNode);

  const { width, height } = normalize(nodes);
  const byId = new Map(nodes.map((n) => [n.node.id, n]));
  const edges = buildEdges(root, byId);

  return { width, height, style: "map", nodes, edges, title: ast.title };
}

// ─── Style: Logic-Right (horizontal tidy tree) ───────────────────────────

function layoutLogicRight(ast: MindmapAST): MindmapLayoutResult {
  const root = ast.root;
  const nodes: MindmapLayoutNode[] = [];

  const rootLabelW = estimateLabelWidth(root.label, 0);
  const rootCapsuleW = rootLabelW + ROOT_CAPSULE_PAD_X * 2;
  const rootCapsuleH = rowHeightOf(0) + ROOT_CAPSULE_PAD_Y;
  const firstColLeft = rootCapsuleW / 2 + bezierGapFor(1);

  const cols = computeColumns(root.children, firstColLeft);
  let cursor = 0;
  for (let i = 0; i < root.children.length; i++) {
    if (i > 0) cursor += MAIN_GAP;
    const { height } = tidyRight(root.children[i], cursor, i, cols, nodes);
    cursor += height;
  }
  const totalHeight = cursor;

  const rootNode: MindmapLayoutNode = {
    node: root,
    x: 0,
    y: totalHeight / 2,
    side: "center",
    branchIndex: -1,
    labelWidth: rootCapsuleW,
    labelHeight: rootCapsuleH,
  };
  nodes.push(rootNode);

  const { width, height } = normalize(nodes);
  const byId = new Map(nodes.map((n) => [n.node.id, n]));
  const edges = buildEdges(root, byId);

  return { width, height, style: "logic-right", nodes, edges, title: ast.title };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────

export function layoutMindmap(ast: MindmapAST): MindmapLayoutResult {
  const style: MindmapStyle = ast.style;
  if (style === "logic-right") return layoutLogicRight(ast);
  return layoutMap(ast);
}

export { estimateLabelWidth, rowHeightOf, fontSizeOf };
