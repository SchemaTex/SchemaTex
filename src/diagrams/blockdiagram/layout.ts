import type { BlockAST, BlockEdge, BlockNode, SummingJunction } from "../../core/types";

export interface LaidBlock {
  kind: "block";
  id: string;
  label: string;
  role: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasBranch?: boolean;
}

export interface LaidSum {
  kind: "sum";
  id: string;
  cx: number;
  cy: number;
  r: number;
  hasBranch?: boolean;
}

export interface LaidPort {
  kind: "port";
  id: string;
  label: string;
  x: number;
  y: number;
  isInput: boolean;
  hasBranch?: boolean;
}

export type LaidNode = LaidBlock | LaidSum | LaidPort;

export interface LaidEdgePolarity {
  sign: "+" | "-";
  pin: "left" | "top" | "right" | "bottom";
  x: number;
  y: number;
}

export interface LaidEdge {
  from: string;
  to: string;
  label?: string;
  discrete: boolean;
  path: string;
  midX: number;
  midY: number;
  isFeedback: boolean;
  /** Polarity sign to draw near the target if target is a sum */
  polarity?: LaidEdgePolarity;
}

export interface BlockDiagramLayout {
  width: number;
  height: number;
  nodes: LaidNode[];
  edges: LaidEdge[];
  title?: string;
  /** Offset applied to all y coords (>0 when feedforward rows exist above FWD_Y) */
  topOffset: number;
}

const BLOCK_W = 100;
const BLOCK_H = 54;
const SUM_R = 12;
const FWD_Y = 110;
const ROW_GAP = 80;
const FIRST_ROW_OFFSET = 110;
const COL_GAP = 60;
const LEFT_PAD = 30;
const RIGHT_PAD = 30;

interface Track {
  /** row index (1, 2, ...); 0 means forward path */
  row: number;
  /** above = y < FWD_Y; below = y > FWD_Y */
  side: "above" | "below";
  /** Occupied col ranges [minCol, maxCol] for collision detection */
  ranges: Array<[number, number]>;
}

export function layoutBlockDiagram(ast: BlockAST): BlockDiagramLayout {
  const nodeIds = new Set<string>();
  for (const b of ast.blocks) nodeIds.add(b.id);
  for (const s of ast.sums) nodeIds.add(s.id);
  for (const e of ast.connections) {
    nodeIds.add(e.from);
    nodeIds.add(e.to);
  }

  const outgoing = new Map<string, BlockEdge[]>();
  const incoming = new Map<string, BlockEdge[]>();
  for (const id of nodeIds) {
    outgoing.set(id, []);
    incoming.set(id, []);
  }
  for (const e of ast.connections) {
    outgoing.get(e.from)!.push(e);
    incoming.get(e.to)!.push(e);
  }

  // Entry points
  const hasIn = nodeIds.has("in");
  const entries: string[] = [];
  if (hasIn) entries.push("in");
  for (const id of nodeIds) {
    if (id === "in" || id === "out") continue;
    if ((incoming.get(id) ?? []).length === 0 && !entries.includes(id)) {
      entries.push(id);
    }
  }

  // BFS forward (first-visit col assignment — back-edges become feedback)
  const col = new Map<string, number>();
  const queue: string[] = [];
  for (const e of entries) {
    col.set(e, 0);
    queue.push(e);
  }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const c = col.get(cur)!;
    for (const edge of outgoing.get(cur) ?? []) {
      if (!col.has(edge.to)) {
        col.set(edge.to, c + 1);
        queue.push(edge.to);
      }
    }
  }
  // Any unreached node
  for (const id of nodeIds) {
    if (!col.has(id)) col.set(id, 1);
  }

  // Feedback detection: outgoing edges are ALL going backward
  const isFeedback = new Set<string>();
  for (const id of nodeIds) {
    if (id === "in" || id === "out") continue;
    const myCol = col.get(id)!;
    const outs = outgoing.get(id) ?? [];
    if (outs.length === 0) continue;
    const allBack = outs.every((e) => (col.get(e.to) ?? myCol) < myCol);
    if (allBack) isFeedback.add(id);
  }

  // For each feedback node, compute loop range [minCol, maxCol]
  const blockById = new Map<string, BlockNode>();
  for (const b of ast.blocks) blockById.set(b.id, b);

  interface FbInfo {
    id: string;
    range: [number, number];
    side: "above" | "below";
    row: number; // depth
  }
  const fbInfos: FbInfo[] = [];
  for (const id of isFeedback) {
    const outs = outgoing.get(id) ?? [];
    const ins = incoming.get(id) ?? [];
    // targets (forward nodes it feeds back into)
    const targetCols = outs.map((e) => col.get(e.to) ?? 0);
    const sourceCols = ins.map((e) => col.get(e.from) ?? 0);
    const minC = Math.min(...targetCols, ...sourceCols);
    const maxC = Math.max(...targetCols, ...sourceCols);
    const bn = blockById.get(id);
    const side: "above" | "below" = bn?.route === "above" ? "above" : "below";
    fbInfos.push({ id, range: [minC, maxC], side, row: 0 });
  }

  // Sort by range width desc (outermost first), break ties by min col
  fbInfos.sort((a, b) => {
    const wa = a.range[1] - a.range[0];
    const wb = b.range[1] - b.range[0];
    if (wa !== wb) return wb - wa;
    return a.range[0] - b.range[0];
  });

  // Assign tracks per side, greedy interval-overlap depth
  const tracks: Record<"above" | "below", Track[]> = { above: [], below: [] };
  for (const fb of fbInfos) {
    let row = 1;
    while (true) {
      // check if any existing block on this (side, row) has overlapping range
      const occupied = tracks[fb.side].find((t) => t.row === row);
      const conflict =
        occupied?.ranges.some(
          ([a, b]) => !(fb.range[1] < a || fb.range[0] > b)
        ) ?? false;
      if (!conflict) {
        if (occupied) occupied.ranges.push(fb.range);
        else
          tracks[fb.side].push({ row, side: fb.side, ranges: [fb.range] });
        fb.row = row;
        break;
      }
      row++;
    }
  }

  const maxBelowRow = tracks.below.reduce((m, t) => Math.max(m, t.row), 0);
  const maxAboveRow = tracks.above.reduce((m, t) => Math.max(m, t.row), 0);

  // Compute y per (side, row)
  const yFor = (side: "above" | "below", row: number): number => {
    const step = FIRST_ROW_OFFSET + (row - 1) * ROW_GAP;
    return side === "above" ? FWD_Y - step : FWD_Y + step;
  };

  // For the feedforward row(s) to have room, shift all y by topOffset
  const topOffset = maxAboveRow > 0 ? (FIRST_ROW_OFFSET + (maxAboveRow - 1) * ROW_GAP) + 30 : 30;
  const forwardY = FWD_Y + (topOffset - 30);

  // Remap y helper
  const rowY = (side: "above" | "below", row: number): number =>
    yFor(side, row) + (topOffset - 30);

  // Normalize columns
  let maxFwdCol = 0;
  for (const id of nodeIds) {
    if (!isFeedback.has(id)) maxFwdCol = Math.max(maxFwdCol, col.get(id) ?? 0);
  }
  const colCount = maxFwdCol + 1;
  const colContent = new Array(colCount).fill(BLOCK_W);

  const colX: number[] = [];
  {
    let x = LEFT_PAD;
    for (let i = 0; i < colCount; i++) {
      const w = i === 0 && hasIn ? 30 : colContent[i];
      colX.push(x + w / 2);
      x += w + COL_GAP;
    }
  }
  const totalWidth = colX.length
    ? colX[colX.length - 1] + BLOCK_W / 2 + RIGHT_PAD
    : 400;

  // Lookup for feedback row info
  const fbById = new Map<string, FbInfo>();
  for (const f of fbInfos) fbById.set(f.id, f);

  const nodes: LaidNode[] = [];
  const branchCount = new Map<string, number>();
  for (const e of ast.connections) {
    branchCount.set(e.from, (branchCount.get(e.from) ?? 0) + 1);
  }
  const hasBranchOf = (id: string) => (branchCount.get(id) ?? 0) > 1;

  for (const b of ast.blocks) {
    const c = col.get(b.id) ?? 0;
    const cx = colX[Math.min(c, colX.length - 1)];
    let cy = forwardY;
    const fb = fbById.get(b.id);
    if (fb) cy = rowY(fb.side, fb.row);
    nodes.push({
      kind: "block",
      id: b.id,
      label: b.label,
      role: b.role ?? "generic",
      x: cx - BLOCK_W / 2,
      y: cy - BLOCK_H / 2,
      width: BLOCK_W,
      height: BLOCK_H,
      hasBranch: hasBranchOf(b.id),
    });
  }

  for (const s of ast.sums) {
    const c = col.get(s.id) ?? 0;
    const cx = colX[Math.min(c, colX.length - 1)];
    let cy = forwardY;
    const fb = fbById.get(s.id);
    if (fb) cy = rowY(fb.side, fb.row);
    nodes.push({
      kind: "sum",
      id: s.id,
      cx,
      cy,
      r: SUM_R,
      hasBranch: hasBranchOf(s.id),
    });
  }

  if (hasIn) {
    nodes.push({
      kind: "port",
      id: "in",
      label: "in",
      x: LEFT_PAD,
      y: forwardY,
      isInput: true,
      hasBranch: hasBranchOf("in"),
    });
  }
  if (nodeIds.has("out")) {
    const outCol = col.get("out") ?? maxFwdCol;
    const cx = colX[Math.min(outCol, colX.length - 1)];
    nodes.push({
      kind: "port",
      id: "out",
      label: "out",
      x: cx,
      y: forwardY,
      isInput: false,
    });
  }

  // Anchor lookup
  interface Anchor {
    left: { x: number; y: number };
    right: { x: number; y: number };
    top: { x: number; y: number };
    bottom: { x: number; y: number };
    cx: number;
    cy: number;
  }
  const anchors = new Map<string, Anchor>();
  for (const n of nodes) {
    if (n.kind === "block") {
      anchors.set(n.id, {
        left: { x: n.x, y: n.y + n.height / 2 },
        right: { x: n.x + n.width, y: n.y + n.height / 2 },
        top: { x: n.x + n.width / 2, y: n.y },
        bottom: { x: n.x + n.width / 2, y: n.y + n.height },
        cx: n.x + n.width / 2,
        cy: n.y + n.height / 2,
      });
    } else if (n.kind === "sum") {
      anchors.set(n.id, {
        left: { x: n.cx - n.r, y: n.cy },
        right: { x: n.cx + n.r, y: n.cy },
        top: { x: n.cx, y: n.cy - n.r },
        bottom: { x: n.cx, y: n.cy + n.r },
        cx: n.cx,
        cy: n.cy,
      });
    } else {
      anchors.set(n.id, {
        left: { x: n.x - 10, y: n.y },
        right: { x: n.x + (n.isInput ? 20 : 0), y: n.y },
        top: { x: n.x, y: n.y - 10 },
        bottom: { x: n.x, y: n.y + 10 },
        cx: n.x,
        cy: n.y,
      });
    }
  }

  // Build sum-input-polarity lookup
  const sumPolarity = new Map<string, Map<string, "+" | "-">>();
  for (const s of ast.sums) {
    const m = new Map<string, "+" | "-">();
    for (const tok of s.inputs) {
      const sign = tok.startsWith("-") ? "-" : "+";
      const srcId = tok.replace(/^[+-]/, "");
      m.set(srcId, sign);
    }
    sumPolarity.set(s.id, m);
  }

  // Build edges
  const edges: LaidEdge[] = [];
  // Track horizontal-track offsets for feedback paths to avoid overlap
  const sumById = new Map<string, SummingJunction>();
  for (const s of ast.sums) sumById.set(s.id, s);

  for (const e of ast.connections) {
    const fromA = anchors.get(e.from);
    const toA = anchors.get(e.to);
    if (!fromA || !toA) continue;

    const fromFb = fbById.get(e.from);
    const toFb = fbById.get(e.to);
    const fromCol = col.get(e.from) ?? 0;
    const toCol = col.get(e.to) ?? 0;

    // Determine pin on target when target is a sum: left (from forward earlier),
    // bottom (from below feedback), top (from above feedforward), or right (rare, output)
    let polarity: LaidEdgePolarity | undefined;
    if (sumById.has(e.to)) {
      const pm = sumPolarity.get(e.to);
      const sign = pm?.get(e.from) ?? "+";
      let pin: "left" | "top" | "bottom" | "right" = "left";
      if (fromFb?.side === "below") pin = "bottom";
      else if (fromFb?.side === "above") pin = "top";
      else if (fromCol < toCol) pin = "left";
      else pin = "bottom";
      const sumNode = nodes.find(
        (n) => n.kind === "sum" && n.id === e.to
      ) as LaidSum | undefined;
      if (sumNode) {
        let px = sumNode.cx, py = sumNode.cy;
        if (pin === "left") {
          px = sumNode.cx - sumNode.r - 8;
          py = sumNode.cy + 6;
        } else if (pin === "bottom") {
          px = sumNode.cx - sumNode.r - 2;
          py = sumNode.cy + sumNode.r + 10;
        } else if (pin === "top") {
          px = sumNode.cx - sumNode.r - 2;
          py = sumNode.cy - sumNode.r - 2;
        }
        polarity = { sign, pin, x: px, y: py };
      }
    }

    // Route
    let path: string;
    let midX: number, midY: number;
    let isFb = false;

    const fromIsFbSide = fromFb?.side;
    const toIsFbSide = toFb?.side;

    if (fromIsFbSide && toIsFbSide === fromIsFbSide) {
      // within same feedback row
      const sx = fromA.left.x;
      const sy = fromA.left.y;
      const tx = toA.right.x;
      const ty = toA.right.y;
      path = `M ${sx} ${sy} L ${tx} ${ty}`;
      midX = (sx + tx) / 2;
      midY = sy - 6;
      isFb = true;
    } else if (!fromIsFbSide && toIsFbSide === "below") {
      // forward → below feedback: branch down from source.bottom
      const sx = fromA.bottom.x;
      const sy = fromA.bottom.y;
      const tx = toA.right.x;
      const ty = toA.right.y;
      path = `M ${sx} ${sy} L ${sx} ${ty} L ${tx} ${ty}`;
      midX = sx;
      midY = (sy + ty) / 2;
      isFb = true;
    } else if (!fromIsFbSide && toIsFbSide === "above") {
      // forward → above feedforward: branch up from source.top
      const sx = fromA.top.x;
      const sy = fromA.top.y;
      const tx = toA.right.x;
      const ty = toA.right.y;
      path = `M ${sx} ${sy} L ${sx} ${ty} L ${tx} ${ty}`;
      midX = sx;
      midY = (sy + ty) / 2;
      isFb = true;
    } else if (fromIsFbSide === "below" && !toIsFbSide) {
      // below feedback → forward target (bottom pin if sum)
      const sx = fromA.left.x;
      const sy = fromA.left.y;
      const tx = toA.bottom.x;
      const ty = toA.bottom.y;
      path = `M ${sx} ${sy} L ${tx} ${sy} L ${tx} ${ty}`;
      midX = (sx + tx) / 2;
      midY = sy - 6;
      isFb = true;
    } else if (fromIsFbSide === "above" && !toIsFbSide) {
      // above feedforward → forward target (top pin if sum)
      const sx = fromA.left.x;
      const sy = fromA.left.y;
      const tx = toA.top.x;
      const ty = toA.top.y;
      path = `M ${sx} ${sy} L ${tx} ${sy} L ${tx} ${ty}`;
      midX = (sx + tx) / 2;
      midY = sy - 6;
      isFb = true;
    } else if (toCol < fromCol) {
      // generic back-edge fallback (below)
      const sx = fromA.right.x;
      const sy = fromA.right.y;
      const tx = toA.bottom.x;
      const ty = toA.bottom.y;
      const dipY = Math.max(sy, ty) + 60;
      path = `M ${sx} ${sy} L ${sx} ${dipY} L ${tx} ${dipY} L ${tx} ${ty}`;
      midX = (sx + tx) / 2;
      midY = dipY + 10;
      isFb = true;
    } else {
      // forward edge
      const sx = fromA.right.x;
      const sy = fromA.right.y;
      const tx = toA.left.x;
      const ty = toA.left.y;
      if (Math.abs(sy - ty) < 0.5) {
        path = `M ${sx} ${sy} L ${tx} ${ty}`;
      } else {
        const midXH = (sx + tx) / 2;
        path = `M ${sx} ${sy} L ${midXH} ${sy} L ${midXH} ${ty} L ${tx} ${ty}`;
      }
      midX = (sx + tx) / 2;
      midY = sy - 8;
    }

    edges.push({
      from: e.from,
      to: e.to,
      label: e.label,
      discrete: !!e.discrete,
      path,
      midX,
      midY,
      isFeedback: isFb,
      polarity,
    });
  }

  // Total canvas height: enough for top rows + forward + bottom rows
  const totalTopSpace =
    maxAboveRow > 0
      ? FIRST_ROW_OFFSET + (maxAboveRow - 1) * ROW_GAP + 60
      : 30;
  const totalBottomSpace =
    maxBelowRow > 0
      ? FIRST_ROW_OFFSET + (maxBelowRow - 1) * ROW_GAP + 60
      : 100;
  const height = Math.max(
    forwardY + totalBottomSpace,
    FWD_Y + 170,
    totalTopSpace + totalBottomSpace
  );

  return {
    width: totalWidth,
    height,
    nodes,
    edges,
    title: ast.title,
    topOffset,
  };
}
