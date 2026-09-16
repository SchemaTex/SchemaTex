import { estimateTextWidth } from "../../core/text-metrics";
import { cardSize } from "./presentation";
import type {
  DTreeAST,
  DTreeEdgeStyle,
  DTreeLayoutEdge,
  DTreeLayoutNode,
  DTreeLayoutResult,
  DTreeNode,
} from "./types";

interface NodeSize { w: number; h: number; }

function sizeOf(node: DTreeNode, ast: DTreeAST): NodeSize {
  const mode = ast.mode;
  if (mode === "decision") {
    if (node.kind === "decision") return { w: 24, h: 24 };
    if (node.kind === "chance") return { w: 24, h: 24 };
    return { w: 14, h: 16 }; // end triangle
  }
  return cardSize(node, ast);
}

interface WN {
  node: DTreeNode;
  size: NodeSize;
  depth: number;
  parent?: WN;
  children: WN[];
  prelim: number;
  mod: number;
  xFinal: number;
  yFinal: number;
}

function wrap(node: DTreeNode, ast: DTreeAST, depth: number, parent?: WN): WN {
  const w: WN = {
    node, size: sizeOf(node, ast), depth, parent,
    children: [], prelim: 0, mod: 0, xFinal: 0, yFinal: 0,
  };
  w.children = node.children.map((c) => wrap(c, ast, depth + 1, w));
  return w;
}

function collect(w: WN, out: WN[]): void { out.push(w); for (const c of w.children) collect(c, out); }

/** Sibling-axis extent (perpendicular to depth growth). */
function sibExtent(w: WN, sibH: boolean): number {
  return sibH ? w.size.w : w.size.h;
}

/**
 * Balanced layout. Each leaf gets 1 unit; a direct-leaf sibling of a tall subtree
 * still gets 1 unit but is PLACED with extra padding so the diagonal from the
 * parent doesn't cross the sibling subtree. The padding equals the sibling
 * subtree's half-extent.
 */
function assignLeafPositions(w: WN, sibH: boolean, unit: number, leafGap: number, cursor: { v: number }): void {
  if (w.children.length === 0) {
    w.prelim = cursor.v;
    const extent = sibExtent(w, sibH);
    cursor.v += Math.max(extent, unit) + leafGap;
    return;
  }
  for (const c of w.children) assignLeafPositions(c, sibH, unit, leafGap, cursor);
  const first = w.children[0]!.prelim;
  const last = w.children[w.children.length - 1]!.prelim;
  w.prelim = (first + last) / 2;
}

/** Subtree min/max along sibling axis (uses current prelim values). */
function subtreeSibRange(w: WN, sibH: boolean): { lo: number; hi: number } {
  const e = sibExtent(w, sibH);
  let lo = w.prelim - e / 2;
  let hi = w.prelim + e / 2;
  for (const c of w.children) {
    const cr = subtreeSibRange(c, sibH);
    if (cr.lo < lo) lo = cr.lo;
    if (cr.hi > hi) hi = cr.hi;
  }
  return { lo, hi };
}

/**
 * Ensure min sibling gap between adjacent SUBTREES, shifting right-subtree if too close.
 * This is what keeps a direct-leaf sibling visually separated from a tall subtree.
 */
function enforceSibGap(w: WN, sibH: boolean, sibGap: number): void {
  for (const c of w.children) enforceSibGap(c, sibH, sibGap);
  for (let i = 1; i < w.children.length; i++) {
    const prev = w.children[i - 1]!;
    const cur = w.children[i]!;
    const prevR = subtreeSibRange(prev, sibH);
    const curR = subtreeSibRange(cur, sibH);
    const gap = curR.lo - prevR.hi;
    if (gap < sibGap) {
      shiftSubtree(cur, sibGap - gap);
    }
  }
  if (w.children.length > 0) {
    const first = w.children[0]!.prelim;
    const last = w.children[w.children.length - 1]!.prelim;
    w.prelim = (first + last) / 2;
  }
}

function shiftSubtree(w: WN, dx: number): void {
  w.prelim += dx;
  for (const c of w.children) shiftSubtree(c, dx);
}

function computeLevelOffsets(root: WN, sibH: boolean, levelGap: number): number[] {
  const depthSizes: number[] = [];
  const all: WN[] = [];
  collect(root, all);
  for (const n of all) {
    const dSize = sibH ? n.size.h : n.size.w;
    depthSizes[n.depth] = Math.max(depthSizes[n.depth] ?? 0, dSize);
  }
  const offsets: number[] = [];
  let acc = 0;
  for (let i = 0; i < depthSizes.length; i++) {
    if (i === 0) acc = 0;
    else acc += (depthSizes[i - 1]! / 2) + levelGap + (depthSizes[i]! / 2);
    offsets.push(acc);
  }
  return offsets;
}

function setFinal(w: WN, sibH: boolean, levelOffsets: number[]): void {
  const d = levelOffsets[w.depth] ?? 0;
  if (sibH) { w.xFinal = w.prelim; w.yFinal = d; }
  else { w.xFinal = d; w.yFinal = w.prelim; }
  for (const c of w.children) setFinal(c, sibH, levelOffsets);
}

// ─── Edge routing ────────────────────────────────────────────

interface EdgeGeom {
  path: string;
  labelX: number;
  labelY: number;
  angle: number; // degrees
}

function routeEdge(
  style: DTreeEdgeStyle,
  sibH: boolean,
  p: DTreeLayoutNode,
  c: DTreeLayoutNode,
): EdgeGeom {
  const px = p.x, py = p.y, cx = c.x, cy = c.y;
  let startX: number, startY: number, endX: number, endY: number;
  if (sibH) {
    startX = px; startY = py + p.height / 2;
    endX = cx; endY = cy - c.height / 2;
  } else {
    startX = px + p.width / 2; startY = py;
    endX = cx - c.width / 2; endY = cy;
  }

  if (style === "diagonal") {
    // Place label at 68% along edge (toward child) — separates labels sharing a parent.
    const tLabel = 0.68;
    const lx = startX + (endX - startX) * tLabel;
    const ly = startY + (endY - startY) * tLabel;
    const dx = endX - startX;
    const dy = endY - startY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    return {
      path: `M ${startX} ${startY} L ${endX} ${endY}`,
      labelX: lx,
      labelY: ly,
      angle,
    };
  }

  if (style === "bracket") {
    // Parent short stub, then diagonal to child
    if (sibH) {
      const stub = Math.min(18, Math.abs(endY - startY) * 0.25);
      const elbowY = startY + stub;
      const midX = (startX + endX) / 2;
      const midY = (elbowY + endY) / 2;
      const angle = (Math.atan2(endY - elbowY, endX - startX) * 180) / Math.PI;
      return {
        path: `M ${startX} ${startY} L ${startX} ${elbowY} L ${endX} ${endY}`,
        labelX: midX,
        labelY: midY,
        angle: angle > 90 ? angle - 180 : angle < -90 ? angle + 180 : angle,
      };
    }
    const stub = Math.min(18, Math.abs(endX - startX) * 0.25);
    const elbowX = startX + stub;
    return {
      path: `M ${startX} ${startY} L ${elbowX} ${startY} L ${endX} ${endY}`,
      labelX: (elbowX + endX) / 2,
      labelY: (startY + endY) / 2,
      angle: (Math.atan2(endY - startY, endX - elbowX) * 180) / Math.PI,
    };
  }

  const r = 6;
  if (sibH) {
    const railY = startY + Math.min(28, (endY - startY) / 2);
    const sign = Math.sign(endX - startX);
    const bend = Math.min(r, Math.abs(endX - startX) / 2);
    return {
      path: sign === 0 ? `M ${startX} ${startY} L ${endX} ${endY}` :
        `M ${startX} ${startY} L ${startX} ${railY-r} Q ${startX} ${railY} ${startX+sign*bend} ${railY} L ${endX-sign*bend} ${railY} Q ${endX} ${railY} ${endX} ${railY+r} L ${endX} ${endY}`,
      labelX: endX + (sign || 1) * 10,
      labelY: railY + 18,
      angle: 0,
    };
  }
  const railX = startX + Math.min(p.node.kind === "decision" || p.node.kind === "chance" ? 70 : 28, (endX-startX)/2);
  const sign = Math.sign(endY-startY);
  const bend = Math.min(r, Math.abs(endY-startY)/2);
  return {
    path: sign === 0 ? `M ${startX} ${startY} L ${endX} ${endY}` :
      `M ${startX} ${startY} L ${railX-r} ${startY} Q ${railX} ${startY} ${railX} ${startY+sign*bend} L ${railX} ${endY-sign*bend} Q ${railX} ${endY} ${railX+r} ${endY} L ${endX} ${endY}`,
    labelX: (railX + endX) / 2,
    labelY: endY - 12,
    angle: 0,
  };
}

/**
 * Route for an end-node that was snapped away from its natural column to align with
 * the payoff column. Diagonal from parent to the natural column at child's y, then
 * horizontal to the snapped triangle. Makes shallow end-nodes look like they "extend
 * out" to the rightmost column rather than a single ugly long diagonal.
 */
function routeSnappedEnd(sibH: boolean, p: DTreeLayoutNode, c: DTreeLayoutNode): EdgeGeom {
  if (sibH) {
    // Top-down: rarely used for decision mode; fall back to plain diagonal.
    const startX = p.x, startY = p.y + p.height / 2;
    const endX = c.x, endY = c.y - c.height / 2;
    return {
      path: `M ${startX} ${startY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2, labelY: (startY + endY) / 2, angle: 0,
    };
  }
  // Left-right (the normal decision-mode direction).
  const startX = p.x + p.width / 2;
  const startY = p.y;
  const endX = c.x - c.width / 2;
  const endY = c.y;
  // Bend point: at natural child x, at child y. Clamp to be strictly right of parent.
  const naturalCx = c.naturalX ?? c.x;
  const bendX = Math.max(naturalCx, startX + 20);
  const dx = bendX - startX;
  const dy = endY - startY;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  // Label at 70% along the diagonal portion — stays on the diagonal, not the horizontal.
  const t = 0.7;
  const labelX = startX + (bendX - startX) * t;
  const labelY = startY + (endY - startY) * t;
  return {
    path: `M ${startX} ${startY} L ${bendX} ${endY} L ${endX} ${endY}`,
    labelX,
    labelY,
    angle,
  };
}

// ─── Main ────────────────────────────────────────────────────

export function layoutDecisionTree(ast: DTreeAST): DTreeLayoutResult {
  const sibH = ast.direction === "top-down";
  const root = wrap(ast.root, ast, 0);

  // Mode-tuned spacing.
  const all: WN[] = []; collect(root, all);

  if (ast.mode === "taxonomy" || ast.mode === "ml") {
    const leaves = all.filter(w => !w.children.length);
    const width = Math.max(...leaves.map(w => w.size.w));
    const height = Math.max(...leaves.map(w => w.size.h));
    for (const leaf of leaves) leaf.size = { w: width, h: height };
  }

  const maxSibExtent = Math.max(...all.filter(w => !w.children.length).map(w => sibExtent(w, sibH)));

  let leafGap: number, levelGap: number, sibGap: number;
  if (ast.mode === "ml") { leafGap = 40; levelGap = 80; sibGap = 40; }
  else if (ast.mode === "decision") { leafGap = sibH ? 40 : 36; levelGap = sibH ? 110 : Math.max(180, ...all.map(w => estimateTextWidth(w.node.incomingChoice ?? w.node.label, 11) + 140)); sibGap = 36; }
  else { leafGap = sibH ? 30 : 22; levelGap = sibH ? 80 : 90; sibGap = 26; }

  const unit = Math.max(maxSibExtent, sibH ? 120 : ast.mode === "decision" ? 62 : 50);
  const cursor = { v: 0 };
  assignLeafPositions(root, sibH, unit, leafGap, cursor);
  enforceSibGap(root, sibH, sibGap);

  const levelOffsets = computeLevelOffsets(root, sibH, levelGap);
  setFinal(root, sibH, levelOffsets);
  // Outcomes form a comparison shelf, irrespective of where a branch terminates.
  if (ast.mode === "taxonomy" || ast.mode === "ml") {
    const last = Math.max(...all.map(w => sibH ? w.yFinal : w.xFinal));
    for (const w of all) if (!w.children.length) {
      if (sibH) w.yFinal = last;
      else w.xFinal = last;
    }
  }

  // Bounding box — extra left padding for decision-mode left-right (root label sits outside the rect)
  const PADDING = 40;
  const extraLeft = ast.mode === "decision" && !sibH ? 110 : 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of all) {
    minX = Math.min(minX, n.xFinal - n.size.w / 2);
    minY = Math.min(minY, n.yFinal - n.size.h / 2);
    maxX = Math.max(maxX, n.xFinal + n.size.w / 2);
    maxY = Math.max(maxY, n.yFinal + n.size.h / 2);
  }

  // For decision mode (left-right), reserve a rightmost column for payoff text.
  const needsPayoffCol = ast.mode === "decision" && !sibH;
  const extraRight = needsPayoffCol ? 180 : ast.mode === "decision" ? 110 : 20;

  // Capture natural x BEFORE snapping — needed to route shallow end-node edges via
  // an L-shape (diagonal to natural column, then horizontal to snapped column).
  const naturalXMap = new Map<string, number>();
  for (const w of all) naturalXMap.set(w.node.id, w.xFinal);

  // If needed, snap all end nodes to the same rightmost x so payoffs align.
  if (needsPayoffCol) {
    let endMaxX = -Infinity;
    for (const w of all) if (w.node.kind === "end") endMaxX = Math.max(endMaxX, w.xFinal);
    for (const w of all) if (w.node.kind === "end") w.xFinal = endMaxX;
    // Recompute bounds after snap
    minX = Infinity; maxX = -Infinity;
    for (const n of all) {
      minX = Math.min(minX, n.xFinal - n.size.w / 2);
      maxX = Math.max(maxX, n.xFinal + n.size.w / 2);
    }
  }

  const offsetX = PADDING + extraLeft - minX;
  const offsetY = PADDING - minY;

  const layoutNodes: DTreeLayoutNode[] = all.map((w) => ({
    node: w.node,
    x: w.xFinal + offsetX,
    y: w.yFinal + offsetY,
    width: w.size.w,
    height: w.size.h,
    depth: w.depth,
    naturalX: (naturalXMap.get(w.node.id) ?? w.xFinal) + offsetX,
    naturalY: w.yFinal + offsetY,
  }));

  const nodeById = new Map(layoutNodes.map((n) => [n.node.id, n]));

  // Edge style resolution
  const edgeStyle: DTreeEdgeStyle =
    ast.edgeStyle ?? "orthogonal";

  const strategy = new Set<string>();
  const mark = (n: DTreeNode): void => {
    strategy.add(n.id);
    for (const child of n.children) if (n.kind !== "decision" || child.optimal) mark(child);
  };
  if (ast.mode === "decision") mark(ast.root);
  const labelAnchors: Record<string, { x: number; y: number; angle: number }> = {};
  const edges: DTreeLayoutEdge[] = [];
  for (const w of all) {
    for (const c of w.children) {
      const pn = nodeById.get(w.node.id)!;
      const cn = nodeById.get(c.node.id)!;
      // Special route: end node snapped from its natural x to the payoff column.
      // Route as diagonal (parent → naturalX, childY) then horizontal to (snappedX, childY).
      const wasSnapped = needsPayoffCol && c.node.kind === "end" && cn.naturalX !== undefined && Math.abs(cn.naturalX - cn.x) > 1;
      const geom = wasSnapped && edgeStyle !== "orthogonal"
        ? routeSnappedEnd(sibH, pn, cn)
        : routeEdge(edgeStyle, sibH, pn, cn);

      const isOptimal = strategy.has(c.node.id);
      let strokeWidth = 1.6;
      if (isOptimal) strokeWidth = 3;
      if (ast.branchLengthProb && c.node.incomingProb !== undefined) {
        strokeWidth = 1 + c.node.incomingProb * 2.5;
      }

      let label: string | undefined;
      if (ast.mode === "decision") {
        if (c.node.incomingChoice !== undefined) label = c.node.incomingChoice;
        else if (c.node.incomingProb !== undefined) label = [c.node.label, formatProb(c.node.incomingProb)].filter(Boolean).join(" · ");
      } else if (ast.mode === "ml") {
        if (c.node.mlBranch) {
          if (ast.branchLabels === "relation" && w.node.op && w.node.threshold !== undefined) {
            const op = c.node.mlBranch === "true" ? w.node.op : flipOp(w.node.op);
            label = `${op} ${w.node.threshold}`.replace(/<=/g, "≤").replace(/>=/g, "≥");
          } else {
            label = c.node.mlBranch === "true" ? "True" : "False";
          }
        }
      } else {
        if (c.node.branchLabel) label = /^(yes|no)$/.test(c.node.branchLabel) ? c.node.branchLabel[0]!.toUpperCase() + c.node.branchLabel.slice(1) : c.node.branchLabel;
      }

      labelAnchors[c.node.id] = { x: geom.labelX, y: geom.labelY, angle: geom.angle };

      edges.push({ from: w.node.id, to: c.node.id, path: geom.path, label, isOptimal, strokeWidth });
    }
  }

  const width = Math.ceil(maxX - minX + PADDING * 2 + extraRight + extraLeft);
  const height = Math.ceil(maxY - minY + PADDING * 2);

  return {
    width,
    height,
    nodes: layoutNodes,
    edges,
    title: ast.title,
    mode: ast.mode,
    direction: ast.direction,
    edgeStyle,
    labelAnchors,
  };
}

function flipOp(op: string): string {
  if (op === "<=") return ">";
  if (op === "<") return ">=";
  if (op === ">=") return "<";
  if (op === ">") return "<=";
  return op;
}

function formatProb(p: number): string {
  if (p >= 0.01 && p <= 0.99) {
    const pct = Math.round(p * 100);
    if (Math.abs(p * 100 - pct) < 0.01) return `p=${pct}%`;
  }
  return `p=${p}`;
}
