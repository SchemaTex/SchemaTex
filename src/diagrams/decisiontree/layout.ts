import type {
  DTreeAST,
  DTreeEdgeStyle,
  DTreeLayoutEdge,
  DTreeLayoutNode,
  DTreeLayoutResult,
  DTreeNode,
} from "./types";

interface NodeSize { w: number; h: number; }

function sizeOf(node: DTreeNode, mode: DTreeAST["mode"]): NodeSize {
  if (mode === "decision") {
    if (node.kind === "decision") return { w: 58, h: 36 };
    if (node.kind === "chance") return { w: 34, h: 34 };
    return { w: 22, h: 22 }; // end triangle
  }
  if (mode === "ml") {
    if (node.kind === "split") return { w: 200, h: 100 };
    return { w: 200, h: 82 };
  }
  return { w: 150, h: 50 };
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

function wrap(node: DTreeNode, mode: DTreeAST["mode"], depth: number, parent?: WN): WN {
  const w: WN = {
    node, size: sizeOf(node, mode), depth, parent,
    children: [], prelim: 0, mod: 0, xFinal: 0, yFinal: 0,
  };
  w.children = node.children.map((c) => wrap(c, mode, depth + 1, w));
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
  rail?: number,
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

  // orthogonal L-shape — use per-level rail if provided so siblings align
  if (sibH) {
    const railY = rail ?? (startY + endY) / 2;
    return {
      path: `M ${startX} ${startY} L ${startX} ${railY} L ${endX} ${railY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: railY,
      angle: 0,
    };
  }
  const railX = rail ?? (startX + endX) / 2;
  return {
    path: `M ${startX} ${startY} L ${railX} ${startY} L ${railX} ${endY} L ${endX} ${endY}`,
    labelX: railX,
    labelY: (startY + endY) / 2,
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
  const root = wrap(ast.root, ast.mode, 0);

  // Mode-tuned spacing.
  const all: WN[] = []; collect(root, all);

  // Pad all nodes at the same depth to the same DEPTH-axis size (height in TD,
  // width in LR). This makes orthogonal rails align cleanly.
  const perDepthDepthSize: number[] = [];
  for (const w of all) {
    const d = sibH ? w.size.h : w.size.w;
    perDepthDepthSize[w.depth] = Math.max(perDepthDepthSize[w.depth] ?? 0, d);
  }
  for (const w of all) {
    const target = perDepthDepthSize[w.depth]!;
    if (sibH) w.size.h = target;
    else w.size.w = target;
  }

  const maxSibExtent = Math.max(...all.map((w) => sibExtent(w, sibH)));

  let leafGap: number, levelGap: number, sibGap: number;
  if (ast.mode === "ml") { leafGap = 40; levelGap = 80; sibGap = 40; }
  else if (ast.mode === "decision") { leafGap = sibH ? 40 : 36; levelGap = sibH ? 90 : 110; sibGap = 30; }
  else { leafGap = sibH ? 30 : 22; levelGap = sibH ? 80 : 90; sibGap = 26; }

  const unit = Math.max(maxSibExtent, sibH ? 120 : 50);
  const cursor = { v: 0 };
  assignLeafPositions(root, sibH, unit, leafGap, cursor);
  enforceSibGap(root, sibH, sibGap);

  const levelOffsets = computeLevelOffsets(root, sibH, levelGap);
  setFinal(root, sibH, levelOffsets);

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
  const payoffColGap = needsPayoffCol ? 110 : 0;
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
    ast.edgeStyle ?? (ast.mode === "decision" ? "diagonal" : "orthogonal");

  // Level rails — for orthogonal, precompute the elbow position per child-depth so
  // all siblings at the same depth share the same rail (keeps True/False aligned).
  const levelRails: number[] = [];
  if (edgeStyle === "orthogonal") {
    // For each child depth d>=1, rail = midpoint between parent-level bottom and child-level top.
    for (let d = 1; d < perDepthDepthSize.length; d++) {
      const parentBotY = (levelOffsets[d - 1] ?? 0) + (perDepthDepthSize[d - 1]! / 2);
      const childTopY = (levelOffsets[d] ?? 0) - (perDepthDepthSize[d]! / 2);
      levelRails[d] = (parentBotY + childTopY) / 2 + (sibH ? offsetY : offsetX);
    }
  }

  const labelAnchors: Record<string, { x: number; y: number; angle: number }> = {};
  const edges: DTreeLayoutEdge[] = [];
  for (const w of all) {
    for (const c of w.children) {
      const pn = nodeById.get(w.node.id)!;
      const cn = nodeById.get(c.node.id)!;
      // Special route: end node snapped from its natural x to the payoff column.
      // Route as diagonal (parent → naturalX, childY) then horizontal to (snappedX, childY).
      const wasSnapped = needsPayoffCol && c.node.kind === "end" && cn.naturalX !== undefined && Math.abs(cn.naturalX - cn.x) > 1;
      const geom = wasSnapped
        ? routeSnappedEnd(sibH, pn, cn)
        : routeEdge(edgeStyle, sibH, pn, cn, levelRails[c.depth]);

      const isOptimal = c.node.optimal === true;
      let strokeWidth = 1.6;
      if (isOptimal) strokeWidth = 3;
      if (ast.branchLengthProb && c.node.incomingProb !== undefined) {
        strokeWidth = 1 + c.node.incomingProb * 2.5;
      }

      let label: string | undefined;
      if (ast.mode === "decision") {
        if (c.node.incomingChoice !== undefined) label = c.node.incomingChoice;
        else if (c.node.incomingProb !== undefined) label = formatProb(c.node.incomingProb);
      } else if (ast.mode === "ml") {
        if (c.node.mlBranch) {
          if (ast.branchLabels === "relation" && w.node.op && w.node.threshold !== undefined) {
            const op = c.node.mlBranch === "true" ? w.node.op : flipOp(w.node.op);
            label = `${op} ${w.node.threshold}`;
          } else {
            label = c.node.mlBranch === "true" ? "True" : "False";
          }
        }
      } else {
        if (c.node.branchLabel) label = c.node.branchLabel;
      }

      labelAnchors[c.node.id] = { x: geom.labelX, y: geom.labelY, angle: geom.angle };

      edges.push({ from: w.node.id, to: c.node.id, path: geom.path, label, isOptimal, strokeWidth });
    }
  }

  // Payoff column X (in final coordinates)
  let payoffColumnX: number | undefined;
  if (needsPayoffCol) {
    let endX = 0;
    for (const n of layoutNodes) if (n.node.kind === "end") endX = Math.max(endX, n.x + n.width / 2);
    payoffColumnX = endX + payoffColGap;
  }

  const width = Math.ceil(maxX - minX + PADDING * 2 + extraRight + extraLeft);
  const height = Math.ceil(maxY - minY + PADDING * 2);

  return {
    width,
    height,
    nodes: layoutNodes,
    edges,
    levelRails: edgeStyle === "orthogonal" ? levelRails : undefined,
    title: ast.title,
    mode: ast.mode,
    direction: ast.direction,
    edgeStyle,
    labelAnchors,
    payoffColumnX,
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
