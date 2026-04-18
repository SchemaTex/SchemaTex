import type {
  MindmapAST,
  MindmapLayoutEdge,
  MindmapLayoutNode,
  MindmapLayoutResult,
  MindmapNode,
  MindmapStyle,
} from "../../core/types";

/**
 * Mindmap layout — three XMind-inspired styles:
 *   map          — center + branches split left/right, each side vertically stacked
 *   logic-right  — root on left, tidy tree extending right (markmap-compatible)
 *   org-down     — root on top, tidy tree extending down
 *
 * Visual convention (map + logic-right):
 *   A node's (x, y) is the START of its label underline (left side: end of
 *   underline). Parent → child edges emit from the END of the parent's
 *   underline, so the Bezier curve flows seamlessly into the child's label
 *   underline — the "枝" reads as one continuous colored stroke.
 *
 * Sibling x spacing is ADAPTIVE: child.x = parent.x ± (parent.labelWidth + BEZIER_GAP),
 * so wider labels get proportionally more room for their curve.
 */

const PADDING = 40;
const BEZIER_GAP = 90;      // horizontal span of a Bezier segment (constant for consistent curve feel)
const SIBLING_GAP = 20;     // vertical gap between sibling subtree rects
const MAIN_GAP = 44;        // vertical gap between main branches on same side
const ROOT_CAPSULE_PAD_X = 10;
const ROOT_CAPSULE_PAD_Y = 10;

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

// ─── Core primitive: tidy tree extending rightward ───────────────────────

function tidyRight(
  node: MindmapNode,
  x: number,
  yTop: number,
  branchIdx: number,
  out: MindmapLayoutNode[]
): { layoutNode: MindmapLayoutNode; height: number } {
  const rowH = rowHeightOf(node.depth);
  const lw = estimateLabelWidth(node.label, node.depth);

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

  const childX = x + lw + BEZIER_GAP;
  let cursor = yTop;
  const childLayouts: MindmapLayoutNode[] = [];
  for (let i = 0; i < node.children.length; i++) {
    if (i > 0) cursor += SIBLING_GAP;
    const { layoutNode: cln, height } = tidyRight(
      node.children[i],
      childX,
      cursor,
      branchIdx,
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

/** Origin of an outgoing edge — end of parent's underline (or capsule edge for root). */
function edgeOrigin(parent: MindmapLayoutNode): { x: number; y: number } {
  if (parent.side === "center") {
    // Root — emit from capsule edge. For org-down we override below.
    const halfW = parent.labelWidth / 2;
    return { x: parent.x + halfW, y: parent.y };
  }
  if (parent.side === "left") return { x: parent.x - parent.labelWidth, y: parent.y };
  // right / down: underline extends to the right of n.x
  return { x: parent.x + parent.labelWidth, y: parent.y };
}

function bezierH(x1: number, y1: number, x2: number, y2: number): string {
  const k = (x2 - x1) * 0.55;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + k).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - k).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function bezierV(x1: number, y1: number, x2: number, y2: number): string {
  const k = (y2 - y1) * 0.55;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${(y1 + k).toFixed(1)}, ${x2.toFixed(1)} ${(y2 - k).toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function edgeWidthFor(depth: number): number {
  return depth <= 1 ? 3.5 : 1.8;
}

// ─── Canvas normalization ────────────────────────────────────────────────

function normalize(nodes: MindmapLayoutNode[]): { width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const lw = n.labelWidth;
    const lh = n.labelHeight;
    let leftX: number, rightX: number;
    if (n.side === "center") {
      leftX = n.x - lw / 2;
      rightX = n.x + lw / 2;
    } else if (n.side === "left") {
      leftX = n.x - lw;
      rightX = n.x;
    } else if (n.side === "down") {
      leftX = n.x - lw / 2;
      rightX = n.x + lw / 2;
    } else {
      leftX = n.x;
      rightX = n.x + lw;
    }
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
  const mainStartX = rootCapsuleW / 2 + BEZIER_GAP;

  // Right side — stack mains vertically.
  let rightCursor = 0;
  for (let i = 0; i < rightMains.length; i++) {
    if (i > 0) rightCursor += MAIN_GAP;
    const { height } = tidyRight(rightMains[i], mainStartX, rightCursor, i, nodes);
    rightCursor += height;
  }
  const rightHeight = rightCursor;

  // Left side — lay out as "right" then mirror x and re-tag side.
  const leftStart = nodes.length;
  let leftCursor = 0;
  for (let i = 0; i < leftMains.length; i++) {
    if (i > 0) leftCursor += MAIN_GAP;
    const { height } = tidyRight(leftMains[i], mainStartX, leftCursor, rightCount + i, nodes);
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

  // Root → child edge: origin from capsule edge (left/right half depending on side).
  const edges: MindmapLayoutEdge[] = [];
  const walk = (parent: MindmapNode) => {
    const pln = byId.get(parent.id)!;
    for (const c of parent.children) {
      const cln = byId.get(c.id)!;
      let from: { x: number; y: number };
      if (pln.side === "center") {
        const halfW = pln.labelWidth / 2;
        from = cln.side === "left"
          ? { x: pln.x - halfW, y: pln.y }
          : { x: pln.x + halfW, y: pln.y };
      } else {
        from = edgeOrigin(pln);
      }
      edges.push({
        from: parent.id,
        to: c.id,
        path: bezierH(from.x, from.y, cln.x, cln.y),
        color: "",
        width: edgeWidthFor(c.depth),
      });
      walk(c);
    }
  };
  walk(root);

  return { width, height, style: "map", nodes, edges, title: ast.title };
}

// ─── Style: Logic-Right (horizontal tidy tree) ───────────────────────────

function layoutLogicRight(ast: MindmapAST): MindmapLayoutResult {
  const root = ast.root;
  const nodes: MindmapLayoutNode[] = [];

  const rootLabelW = estimateLabelWidth(root.label, 0);
  const rootCapsuleW = rootLabelW + ROOT_CAPSULE_PAD_X * 2;
  const rootCapsuleH = rowHeightOf(0) + ROOT_CAPSULE_PAD_Y;
  const mainStartX = rootCapsuleW / 2 + BEZIER_GAP;

  let cursor = 0;
  for (let i = 0; i < root.children.length; i++) {
    if (i > 0) cursor += MAIN_GAP;
    const { height } = tidyRight(root.children[i], mainStartX, cursor, i, nodes);
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

  // Root → first-level: emit from capsule right edge.
  const edges: MindmapLayoutEdge[] = [];
  const walk = (parent: MindmapNode) => {
    const pln = byId.get(parent.id)!;
    for (const c of parent.children) {
      const cln = byId.get(c.id)!;
      const from = pln.side === "center"
        ? { x: pln.x + pln.labelWidth / 2, y: pln.y }
        : edgeOrigin(pln);
      edges.push({
        from: parent.id,
        to: c.id,
        path: bezierH(from.x, from.y, cln.x, cln.y),
        color: "",
        width: edgeWidthFor(c.depth),
      });
      walk(c);
    }
  };
  walk(root);

  return { width, height, style: "logic-right", nodes, edges, title: ast.title };
}

// ─── Style: Org-Down (vertical tidy tree) ────────────────────────────────
//
// Reuse the horizontal layout, then swap axes. For org-down each node's
// label is centered with a horizontal underline BELOW it; edges emit from
// the bottom-center of the parent underline and terminate at the top-center
// of the child.

const LAYER_GAP_V = 70;     // vertical gap between depth layers
const SIBLING_GAP_H = 28;   // horizontal gap between sibling subtrees

function tidyDown(
  node: MindmapNode,
  xLeft: number,
  y: number,
  branchIdx: number,
  out: MindmapLayoutNode[]
): { layoutNode: MindmapLayoutNode; width: number } {
  const lw = estimateLabelWidth(node.label, node.depth);
  const rowH = rowHeightOf(node.depth);

  if (node.children.length === 0) {
    const ln: MindmapLayoutNode = {
      node,
      x: xLeft + lw / 2,
      y,
      side: "down",
      branchIndex: branchIdx,
      labelWidth: lw,
      labelHeight: rowH,
    };
    out.push(ln);
    return { layoutNode: ln, width: lw };
  }

  const childY = y + LAYER_GAP_V;
  let cursor = xLeft;
  const childLayouts: MindmapLayoutNode[] = [];
  for (let i = 0; i < node.children.length; i++) {
    if (i > 0) cursor += SIBLING_GAP_H;
    const { layoutNode: cln, width } = tidyDown(node.children[i], cursor, childY, branchIdx, out);
    childLayouts.push(cln);
    cursor += width;
  }
  const totalW = Math.max(lw, cursor - xLeft);

  const firstX = childLayouts[0].x;
  const lastX = childLayouts[childLayouts.length - 1].x;
  const parentX = (firstX + lastX) / 2;

  const ln: MindmapLayoutNode = {
    node,
    x: parentX,
    y,
    side: "down",
    branchIndex: branchIdx,
    labelWidth: lw,
    labelHeight: rowH,
  };
  out.push(ln);
  return { layoutNode: ln, width: totalW };
}

function layoutOrgDown(ast: MindmapAST): MindmapLayoutResult {
  const root = ast.root;
  const nodes: MindmapLayoutNode[] = [];

  const rootLabelW = estimateLabelWidth(root.label, 0);
  const rootY = 0;
  const mainY = rootY + LAYER_GAP_V;

  let cursor = 0;
  const mainLayouts: MindmapLayoutNode[] = [];
  for (let i = 0; i < root.children.length; i++) {
    if (i > 0) cursor += SIBLING_GAP_H;
    const { layoutNode: mln, width } = tidyDown(root.children[i], cursor, mainY, i, nodes);
    mainLayouts.push(mln);
    cursor += width;
  }

  const rootX = mainLayouts.length
    ? (mainLayouts[0].x + mainLayouts[mainLayouts.length - 1].x) / 2
    : cursor / 2;

  const rootNode: MindmapLayoutNode = {
    node: root,
    x: rootX,
    y: rootY,
    side: "center",
    branchIndex: -1,
    labelWidth: rootLabelW,
    labelHeight: rowHeightOf(0),
  };
  nodes.push(rootNode);

  const { width, height } = normalize(nodes);
  const byId = new Map(nodes.map((n) => [n.node.id, n]));

  const edges: MindmapLayoutEdge[] = [];
  const walk = (parent: MindmapNode) => {
    const pln = byId.get(parent.id)!;
    for (const c of parent.children) {
      const cln = byId.get(c.id)!;
      const isMainChild = c.depth === 1;
      const fromY =
        pln.side === "center"
          ? pln.y + pln.labelHeight / 2          // root text bottom
          : pln.y + pln.labelHeight / 2 + 4;     // below main underline
      // Child anchor: top of its text (since sub-levels have no underline,
      // center curve at text top so it reads as pointing to the label).
      const toY = isMainChild
        ? cln.y - cln.labelHeight / 2 + 2       // just above main underline
        : cln.y - cln.labelHeight / 2 + 4;      // just above sub text
      edges.push({
        from: parent.id,
        to: c.id,
        path: bezierV(pln.x, fromY, cln.x, toY),
        color: "",
        width: edgeWidthFor(c.depth),
      });
      walk(c);
    }
  };
  walk(root);

  return { width, height, style: "org-down", nodes, edges, title: ast.title };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────

export function layoutMindmap(ast: MindmapAST): MindmapLayoutResult {
  const style: MindmapStyle = ast.style;
  if (style === "logic-right") return layoutLogicRight(ast);
  if (style === "org-down") return layoutOrgDown(ast);
  return layoutMap(ast);
}

export { estimateLabelWidth, rowHeightOf, fontSizeOf };
