import type {
  MindmapAST,
  MindmapLabelLine,
  MindmapLayoutEdge,
  MindmapLayoutNode,
  MindmapLayoutResult,
  MindmapNode,
  MindmapStyle,
} from "../../core/types";
import { measureTokens, wrapTokens } from "./inline";

/**
 * Mindmap layout — two XMind-inspired styles:
 *   map          — center + branches split left/right, each side vertically stacked
 *   logic-right  — root on left, tidy tree extending right (markmap-compatible)
 *
 * Layout invariants:
 *   • Each node's n.x is its label's horizontal CENTER. Text renders
 *     anchor-middle at n.x.
 *   • Labels can be multi-line (inline markdown wrapped at maxLabelWidth).
 *     labelHeight = lines × lineHeight + padding; labelWidth = max line width.
 *   • Per-depth columns are globally aligned to the max label width at that
 *     depth (incl. post-wrap width), so sibling branches stay flush.
 *   • Tidy-tree packing uses each node's true labelHeight, so rich labels
 *     automatically push neighbors apart without overlap.
 *   • Bezier edges travel from parent's outer label edge to child's inner
 *     label edge. Main-branch underlines merge visually with the curve.
 */

const PADDING = 40;
const SIBLING_GAP = 18;     // vertical gap between sibling subtree rects
const MAIN_GAP = 44;        // vertical gap between main branches on same side
const UNDERLINE_GAP = 4;    // px between text bottom and underline stroke
const LINE_GAP = 4;         // extra px between wrapped lines

// Horizontal span of the Bezier curve between consecutive slot columns.
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

function lineHeightOf(fs: number): number {
  return fs + LINE_GAP;
}

// Root font (20pt) is ~1.5× sub font (13pt), so a single maxLabelWidth budget
// would wrap root text far sooner than body text. Scale the budget by depth
// so root gets room to breathe before wrapping.
function widthBudget(depth: number, maxLabelWidth: number): number {
  if (depth === 0) return maxLabelWidth * 1.5;
  return maxLabelWidth;
}

// ─── Label measurement ──────────────────────────────────────────────────

interface LabelMetrics {
  lines: MindmapLabelLine[];
  width: number;   // max line width
  height: number;  // lines × lineHeight + padding (for leaves)
}

function measureLabel(node: MindmapNode, maxWidth: number): LabelMetrics {
  const fs = fontSizeOf(node.depth);
  // Unwrapped width first — if it fits, skip wrapping.
  const raw = measureTokens(node.tokens, fs);
  let lines: MindmapLabelLine[];
  if (raw <= maxWidth) {
    lines = [{ tokens: node.tokens.slice(), width: raw }];
  } else {
    lines = wrapTokens(node.tokens, maxWidth, fs);
  }
  let maxW = 0;
  for (const ln of lines) if (ln.width > maxW) maxW = ln.width;
  const lh = lineHeightOf(fs);
  // Label block = text lines + underline gap. No surrounding box/padding —
  // underline sits at the bottom edge, edges enter/leave at that y.
  const height = lines.length * lh + UNDERLINE_GAP;
  return { lines, width: Math.max(32, maxW), height };
}

// ─── Column bookkeeping ──────────────────────────────────────────────────

interface Columns {
  center: number[];
}

// Scan subtree(s) and return the max measured label width at each depth.
// Used both for column positioning AND for equalizing every node's rendered
// underline width at its depth (so sibling bezier curves span identical gaps).
function computeMaxLW(
  subtreeRoots: MindmapNode[],
  maxLabelWidth: number
): number[] {
  const maxLW: number[] = [];
  const walk = (n: MindmapNode) => {
    const m = measureLabel(n, widthBudget(n.depth, maxLabelWidth));
    if (maxLW[n.depth] === undefined || m.width > maxLW[n.depth]) maxLW[n.depth] = m.width;
    for (const c of n.children) walk(c);
  };
  for (const r of subtreeRoots) walk(r);
  return maxLW;
}

function buildColumns(
  maxLW: number[],
  firstColStartX: number,
  rootDepth: number
): Columns {
  const center: number[] = [];
  if (maxLW[rootDepth] === undefined) return { center };
  let slotLeft = firstColStartX;
  center[rootDepth] = slotLeft + maxLW[rootDepth] / 2;
  for (let d = rootDepth + 1; d < maxLW.length; d++) {
    slotLeft = slotLeft + maxLW[d - 1] + bezierGapFor(d);
    center[d] = slotLeft + (maxLW[d] ?? 0) / 2;
  }
  return { center };
}

// ─── Tidy tree extending rightward ──────────────────────────────────────

function tidyRight(
  node: MindmapNode,
  yTop: number,
  branchIdx: number,
  columns: Columns,
  maxLabelWidth: number,
  maxLW: number[],
  out: MindmapLayoutNode[]
): { layoutNode: MindmapLayoutNode; height: number } {
  const m = measureLabel(node, widthBudget(node.depth, maxLabelWidth));
  const x = columns.center[node.depth];
  const fs = fontSizeOf(node.depth);
  // Expand to the max width at this depth so all same-depth nodes share
  // the same underline length and bezier endpoints stay consistent.
  const labelWidth = Math.max(m.width, maxLW[node.depth] ?? m.width);

  if (node.children.length === 0) {
    const ln: MindmapLayoutNode = {
      node,
      x,
      y: yTop + m.height / 2,
      side: "right",
      branchIndex: branchIdx,
      labelWidth,
      labelHeight: m.height,
      fontSize: fs,
      lines: m.lines,
    };
    out.push(ln);
    return { layoutNode: ln, height: m.height };
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
      maxLabelWidth,
      maxLW,
      out
    );
    childLayouts.push(cln);
    cursor += height;
  }
  const totalH = Math.max(m.height, cursor - yTop);

  const firstY = childLayouts[0].y;
  const lastY = childLayouts[childLayouts.length - 1].y;
  const parentY = (firstY + lastY) / 2;

  const ln: MindmapLayoutNode = {
    node,
    x,
    y: parentY,
    side: "right",
    branchIndex: branchIdx,
    labelWidth,
    labelHeight: m.height,
    fontSize: fs,
    lines: m.lines,
  };
  out.push(ln);
  return { layoutNode: ln, height: totalH };
}

// ─── Edge geometry helpers ───────────────────────────────────────────────

function labelEdgeX(n: MindmapLayoutNode, outward: boolean): number {
  if (n.side === "center") return n.x;
  const dir = n.side === "left" ? -1 : 1;
  return n.x + (outward ? dir : -dir) * n.labelWidth / 2;
}

function bezierH(x1: number, y1: number, x2: number, y2: number): string {
  const k = (x2 - x1) * 0.55;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + k).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - k).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function edgeWidthFor(depth: number): number {
  if (depth <= 1) return 2.2;
  if (depth === 2) return 1.6;
  return 1.2;
}

/** Underline stroke width for a node at this depth. */
function underlineWidthFor(depth: number): number {
  if (depth === 0) return 2.4;
  if (depth === 1) return 2.2;
  if (depth === 2) return 1.6;
  return 1.2;
}

// ─── Canvas normalization ────────────────────────────────────────────────

function normalize(nodes: MindmapLayoutNode[]): { width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const lw = n.labelWidth;
    const lh = n.labelHeight;
    const leftX = n.x - lw / 2;
    const rightX = n.x + lw / 2;
    minX = Math.min(minX, leftX);
    maxX = Math.max(maxX, rightX);
    minY = Math.min(minY, n.y - lh / 2);
    maxY = Math.max(maxY, n.y + lh / 2);
  }
  const dx = PADDING - minX;
  const dy = PADDING - minY;
  for (const n of nodes) {
    n.x += dx;
    n.y += dy;
  }
  return { width: (maxX - minX) + PADDING * 2, height: (maxY - minY) + PADDING * 2 };
}

/** y of a node's bottom underline — where edges enter/leave.
 * Matches renderer: stroke sits mid-UNDERLINE_GAP, not at the raw bottom. */
function underlineY(n: MindmapLayoutNode): number {
  return n.y + n.labelHeight / 2 - UNDERLINE_GAP / 2;
}

function buildEdges(root: MindmapNode, byId: Map<string, MindmapLayoutNode>): MindmapLayoutEdge[] {
  const edges: MindmapLayoutEdge[] = [];
  const walk = (parent: MindmapNode) => {
    const pln = byId.get(parent.id)!;
    const pUY = underlineY(pln);
    for (const c of parent.children) {
      const cln = byId.get(c.id)!;
      let fromX: number;
      if (pln.side === "center") {
        const halfW = pln.labelWidth / 2;
        fromX = cln.side === "left" ? pln.x - halfW : pln.x + halfW;
      } else {
        fromX = labelEdgeX(pln, true);
      }
      const toX = labelEdgeX(cln, false);
      edges.push({
        from: parent.id,
        to: c.id,
        path: bezierH(fromX, pUY, toX, underlineY(cln)),
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
  const mw = ast.maxLabelWidth;

  const rootM = measureLabel(root, widthBudget(0, mw));
  const firstColLeft = rootM.width / 2 + bezierGapFor(1);

  // Single global maxLW scan over both sides so L/R siblings share width.
  const maxLW = computeMaxLW([...rightMains, ...leftMains], mw);
  const cols = buildColumns(maxLW, firstColLeft, 1);

  let rightCursor = 0;
  for (let i = 0; i < rightMains.length; i++) {
    if (i > 0) rightCursor += MAIN_GAP;
    const { height } = tidyRight(rightMains[i], rightCursor, i, cols, mw, maxLW, nodes);
    rightCursor += height;
  }
  const rightHeight = rightCursor;

  const leftStart = nodes.length;
  let leftCursor = 0;
  for (let i = 0; i < leftMains.length; i++) {
    if (i > 0) leftCursor += MAIN_GAP;
    const { height } = tidyRight(leftMains[i], leftCursor, rightCount + i, cols, mw, maxLW, nodes);
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
    labelWidth: rootM.width,
    labelHeight: rootM.height,
    fontSize: fontSizeOf(0),
    lines: rootM.lines,
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
  const mw = ast.maxLabelWidth;

  const rootM = measureLabel(root, widthBudget(0, mw));
  const firstColLeft = rootM.width / 2 + bezierGapFor(1);

  const maxLW = computeMaxLW(root.children, mw);
  const cols = buildColumns(maxLW, firstColLeft, 1);
  let cursor = 0;
  for (let i = 0; i < root.children.length; i++) {
    if (i > 0) cursor += MAIN_GAP;
    const { height } = tidyRight(root.children[i], cursor, i, cols, mw, maxLW, nodes);
    cursor += height;
  }
  const totalHeight = cursor;

  const rootNode: MindmapLayoutNode = {
    node: root,
    x: 0,
    y: totalHeight / 2,
    side: "center",
    branchIndex: -1,
    labelWidth: rootM.width,
    labelHeight: rootM.height,
    fontSize: fontSizeOf(0),
    lines: rootM.lines,
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

export { fontSizeOf, lineHeightOf, LINE_GAP, UNDERLINE_GAP, underlineWidthFor };
