/**
 * Reliability Block Diagram layout — left-to-right success-path drawing.
 * Per docs/reference/50-RBD-STANDARD.md §5.
 *
 * Recursive bounding-box packing: a `series` lays its children in a horizontal
 * chain wired end-to-end; a `parallel`/`kofn` group stacks its children on
 * vertical rails fanning out of a split node and back into a join node. Every
 * structure exposes a single entry/exit point on a common centre line so groups
 * nest cleanly. The whole network is bracketed by input/output terminal nodes.
 */

import { analyseRbd } from "./analysis";
import type {
  RbdAst,
  RbdBlock,
  RbdLayoutBlock,
  RbdLayoutMark,
  RbdLayoutNode,
  RbdLayoutResult,
  RbdLayoutWire,
  RbdStructure,
} from "./types";

export const RBD_CONST = {
  BLOCK_H: 46,
  BLOCK_MIN_W: 96,
  BLOCK_MAX_W: 200,
  BLOCK_RX: 5,
  CHAR_W: 6.9,
  PAD_X: 14,
  /** Horizontal wire length between series members. */
  H_GAP: 44,
  /** Vertical gap between parallel rails. */
  V_GAP: 26,
  /** Fan-out / merge horizontal stub flanking a parallel group. */
  SPLIT_STUB: 30,
  NODE_R: 3.5,
  /** Input/output terminal stub at the network ends. */
  TERM_STUB: 30,
  CAP_GAP: 15,
  CAP_LINE_H: 13,
  CANVAS_PAD: 28,
  TITLE_H: 32,
  HEADER_H: 26,
} as const;

interface Measured {
  s: RbdStructure;
  w: number;
  h: number;
  children: Measured[];
}

export function blockWidth(label: string): number {
  const C = RBD_CONST;
  return Math.min(C.BLOCK_MAX_W, Math.max(C.BLOCK_MIN_W, Math.ceil(label.length * C.CHAR_W) + 2 * C.PAD_X));
}

export function layoutRbd(ast: RbdAst): RbdLayoutResult {
  const C = RBD_CONST;
  const analysis = analyseRbd(ast);
  const spof = new Set(analysis.blocks.filter((b) => b.isSpof).map((b) => b.id));
  const rById = new Map(analysis.blocks.map((b) => [b.id, b.R] as const));

  const blocks: RbdLayoutBlock[] = [];
  const nodes: RbdLayoutNode[] = [];
  const wires: RbdLayoutWire[] = [];
  const marks: RbdLayoutMark[] = [];

  // ── Measure ──
  const measure = (s: RbdStructure): Measured => {
    if (s.kind === "block") {
      return { s, w: blockWidth(s.label ?? s.id), h: C.BLOCK_H, children: [] };
    }
    const children = s.children.map(measure);
    if (children.length === 0) return { s, w: C.BLOCK_MIN_W, h: C.BLOCK_H, children };
    if (s.kind === "series") {
      const w = children.reduce((acc, c) => acc + c.w, 0) + C.H_GAP * (children.length - 1);
      const h = Math.max(...children.map((c) => c.h));
      return { s, w, h, children };
    }
    // parallel / kofn
    const innerW = Math.max(...children.map((c) => c.w));
    const w = innerW + 2 * C.SPLIT_STUB;
    const h = children.reduce((acc, c) => acc + c.h, 0) + C.V_GAP * (children.length - 1);
    return { s, w, h, children };
  };

  // ── Place ── returns the entry/exit x (both on the centre line yc).
  const place = (m: Measured, x: number, yc: number): { entryX: number; exitX: number } => {
    const s = m.s;
    if (s.kind === "block") {
      const r = rById.get(s.id);
      blocks.push({
        block: s,
        x,
        y: yc - C.BLOCK_H / 2,
        width: m.w,
        height: C.BLOCK_H,
        ...(r !== undefined ? { R: r } : {}),
        isSpof: spof.has(s.id),
        critical: analysis.criticalBlock === s.id,
      });
      return { entryX: x, exitX: x + m.w };
    }

    if (s.kind === "series") {
      let cursor = x;
      let prevExit: number | null = null;
      let firstEntry = x;
      let lastExit = x;
      m.children.forEach((cm, i) => {
        const ep = place(cm, cursor, yc);
        if (i === 0) firstEntry = ep.entryX;
        if (prevExit !== null) wires.push({ path: `M ${r(prevExit)} ${r(yc)} L ${r(ep.entryX)} ${r(yc)}` });
        prevExit = ep.exitX;
        lastExit = ep.exitX;
        cursor = ep.exitX + C.H_GAP;
      });
      return { entryX: firstEntry, exitX: lastExit };
    }

    // parallel / kofn
    const innerW = Math.max(...m.children.map((c) => c.w));
    const splitX = x + C.NODE_R;
    const mergeX = x + m.w - C.NODE_R;
    const childBandX = x + C.SPLIT_STUB;
    nodes.push({ kind: "split", x: splitX, y: yc });
    nodes.push({ kind: "join", x: mergeX, y: yc });

    let runY = yc - m.h / 2;
    for (const cm of m.children) {
      const childYc = runY + cm.h / 2;
      const childStartX = childBandX + (innerW - cm.w) / 2;
      const ep = place(cm, childStartX, childYc);
      // split → child entry
      wires.push({ path: `M ${r(splitX)} ${r(yc)} L ${r(splitX)} ${r(childYc)} L ${r(ep.entryX)} ${r(childYc)}` });
      // child exit → merge
      wires.push({ path: `M ${r(ep.exitX)} ${r(childYc)} L ${r(mergeX)} ${r(childYc)} L ${r(mergeX)} ${r(yc)}` });
      runY += cm.h + C.V_GAP;
    }

    if (s.kind === "kofn") {
      marks.push({ x: mergeX + 6, y: yc - m.h / 2 - 6, text: `${s.k}/${s.n ?? m.children.length}` });
    }
    return { entryX: splitX, exitX: mergeX };
  };

  const rootM = measure(ast.root);
  const headerH = (ast.title ? C.TITLE_H : 0) + C.HEADER_H;
  const yc = C.CANVAS_PAD + headerH + rootM.h / 2;
  const originX = C.CANVAS_PAD + C.TERM_STUB;

  const ep = place(rootM, originX, yc);

  // Input/output terminals + leads.
  const inX = C.CANVAS_PAD;
  const outX = ep.exitX + C.TERM_STUB;
  nodes.push({ kind: "in", x: inX, y: yc });
  nodes.push({ kind: "out", x: outX, y: yc });
  wires.push({ path: `M ${r(inX)} ${r(yc)} L ${r(ep.entryX)} ${r(yc)}` });
  wires.push({ path: `M ${r(ep.exitX)} ${r(yc)} L ${r(outX)} ${r(yc)}` });

  // ── Canvas extent ──
  let maxX = outX;
  let maxY = yc + rootM.h / 2;
  for (const b of blocks) {
    maxX = Math.max(maxX, b.x + b.width);
    const capLines = (b.R !== undefined ? 1 : 0) + ((b.block.label && b.block.label !== b.block.id) ? 1 : 0);
    maxY = Math.max(maxY, b.y + b.height + (capLines > 0 ? C.CAP_GAP + capLines * C.CAP_LINE_H : 0));
  }
  for (const mk of marks) maxX = Math.max(maxX, mk.x + 24);

  return {
    ast,
    analysis,
    blocks,
    nodes,
    wires,
    marks,
    width: Math.ceil(maxX + C.CANVAS_PAD),
    height: Math.ceil(maxY + C.CANVAS_PAD),
  };
}

function r(n: number): number {
  return Math.round(n * 10) / 10;
}

// Re-export so the renderer can pull a block's effective display label.
export function blockLabel(b: RbdBlock): string {
  return b.label ?? b.id;
}
