/**
 * Event Tree layout — deterministic left→right stepped tree.
 * Per docs/reference/39-EVENT-TREE-STANDARD.md §"Reference images / Visual
 * conventions our renderer must match".
 *
 * Geometry, exactly per the canonical Wikimedia reference image:
 *   - Initiating event on the far LEFT as a short bold horizontal stub.
 *   - A header BAND across the top: Initiating | <function columns…> | Outcome
 *     | Frequency, each function column anchored on a vertical dashed gridline.
 *   - At each function column a path forks: SUCCESS steps UP, FAILURE steps
 *     DOWN (load-bearing convention — never inverted).
 *   - PRUNED paths (pattern `*`) do not keep forking — they run flat to their
 *     leaf. The tree is NOT a balanced 2ⁿ tree.
 *   - Edges are orthogonal step lines (horizontal runs + vertical risers).
 *   - Each leaf, on the right, carries its Outcome name + computed Frequency.
 *   - Leaves are ordered top (all-success) → bottom, following the up=success
 *     geometry: shared prefixes share one horizontal line; a fork's y is the
 *     midpoint of the leaves beneath it.
 *
 * Deterministic, grid-aligned, O(leaves · columns). No randomness.
 */

import { analyseEventTree } from "./analysis";
import type {
  EventTreeAst,
  EventTreeBranchLeg,
  EventTreeLayoutFork,
  EventTreeLayoutHeader,
  EventTreeLayoutLeaf,
  EventTreeLayoutResult,
} from "./types";

export const EVENTTREE_CONST = {
  CANVAS_PAD: 28,
  TITLE_H: 30,
  HEADER_H: 30,
  /** Vertical pitch between adjacent leaf rows. */
  ROW_H: 56,
  /** Horizontal width of one function column (gridline to gridline). */
  COL_W: 150,
  /** IE stub length on the far left. */
  IE_STUB: 64,
  /** Left margin before the IE stub starts. */
  IE_LEFT: 28,
  /** Gap from the last fork gridline to the Outcome text column. */
  OUTCOME_GAP: 40,
  /** Width reserved for the Outcome + Frequency text column. */
  OUTCOME_W: 240,
  CHAR_W: 6.6,
  FORK_LABEL_DY: -7,
  LEAF_LINE_H: 14,
} as const;

interface ForkNode {
  /** Column index this node sits *after* (the fork at function[col] produced it). -1 = IE root. */
  col: number;
  leg: EventTreeBranchLeg | "root";
  children: ForkNode[];
  /** Leaf index when this node is terminal. */
  leafIndex?: number;
  /** Assigned y (center). */
  y: number;
  /** First/last leaf row spanned (for midpoint placement). */
  rowLo: number;
  rowHi: number;
}

export function layoutEventTree(ast: EventTreeAst): EventTreeLayoutResult {
  const C = EVENTTREE_CONST;
  const analysis = analyseEventTree(ast);
  const seqs = analysis.sequences;

  // ── Build the shared-prefix fork tree ──
  // Each sequence is a list of legs (queried columns only; pruned tail omitted).
  // Sequences sharing a prefix share fork nodes, so the common upstream line is
  // drawn once. Insertion order = declaration order, which the author writes
  // top(all-success)→bottom; success-up ordering is therefore the natural read.
  const root: ForkNode = { col: -1, leg: "root", children: [], y: 0, rowLo: 0, rowHi: 0 };

  seqs.forEach((seq) => {
    let node = root;
    for (let col = 0; col < seq.legs.length; col++) {
      const leg = seq.legs[col]!;
      let child = node.children.find((c) => c.col === col && c.leg === leg);
      if (!child) {
        child = { col, leg, children: [], y: 0, rowLo: 0, rowHi: 0 };
        node.children.push(child);
      }
      node = child;
    }
    // `node` is now this sequence's leaf.
    node.leafIndex = seq.index;
  });

  // ── Assign leaf rows (depth-first, declaration order) ──
  let nextRow = 0;
  const leafRow = new Map<number, number>(); // seq.index → row
  const assignRows = (n: ForkNode): void => {
    if (n.leafIndex !== undefined && n.children.length === 0) {
      n.rowLo = n.rowHi = nextRow;
      leafRow.set(n.leafIndex, nextRow);
      nextRow++;
      return;
    }
    n.rowLo = nextRow;
    for (const c of n.children) assignRows(c);
    n.rowHi = nextRow - 1;
  };
  assignRows(root);
  const rowCount = Math.max(nextRow, 1);

  // ── Geometry frame ──
  const titleH = ast.title ? C.TITLE_H : 0;
  const headerY = C.CANVAS_PAD + titleH + C.HEADER_H * 0.6;
  const bodyTopY = C.CANVAS_PAD + titleH + C.HEADER_H;
  const rowY = (row: number): number => bodyTopY + C.ROW_H / 2 + row * C.ROW_H;

  // x of each fork gridline. Column `col`'s fork sits at gridX(col).
  const ieX2 = C.IE_LEFT + C.IE_STUB;            // right end of the IE stub
  const gridX = (col: number): number => ieX2 + (col + 1) * C.COL_W;
  const nFns = ast.functions.length;
  const lastGridX = nFns > 0 ? gridX(nFns - 1) : ieX2;
  const outcomeX = lastGridX + C.OUTCOME_GAP;

  // ── Assign fork-node y as the midpoint of the leaf rows beneath it ──
  const assignY = (n: ForkNode): void => {
    for (const c of n.children) assignY(c);
    n.y = (rowY(n.rowLo) + rowY(n.rowHi)) / 2;
  };
  assignY(root);
  root.y = (rowY(0) + rowY(rowCount - 1)) / 2;

  // ── Emit forks (orthogonal step edges + branch labels) ──
  const forks: EventTreeLayoutFork[] = [];
  const walk = (n: ForkNode, parentX: number, parentY: number): void => {
    for (const c of n.children) {
      const x = gridX(c.col);
      const fn = ast.functions[c.col]!;
      const prob = c.leg === "f" ? fn.p : 1 - fn.p;
      // Orthogonal step: horizontal run from parent at parentY to the column
      // gridline, then a vertical riser up (success) / down (failure) to the
      // child's y, then the child sits on the gridline. Reference draws the
      // riser at the column line so all forks for a column align on the grid.
      const riserX = x;
      const path =
        `M ${r(parentX)} ${r(parentY)} ` +
        `L ${r(riserX)} ${r(parentY)} ` +
        `L ${r(riserX)} ${r(c.y)}`;
      forks.push({
        functionId: fn.id,
        leg: c.leg === "root" ? "s" : c.leg,
        prob,
        tag: `${c.col + 1}${c.leg}`,
        path,
        // Label sits above the horizontal run leading into this node.
        labelX: (riserX + parentX) / 2,
        labelY: c.y + C.FORK_LABEL_DY,
      });
      walk(c, x, c.y);
    }
  };
  // The root's outgoing line starts at the right end of the IE stub.
  walk(root, ieX2, root.y);

  // ── Leaves (outcome name + path frequency on the right) ──
  const leaves: EventTreeLayoutLeaf[] = seqs.map((seq) => {
    const row = leafRow.get(seq.index) ?? 0;
    // The leaf's last drawn node is at the gridline of its last queried column
    // (or the IE stub end if every column is pruned). A flat run extends from
    // there to the outcome column.
    return {
      sequence: seq,
      x: outcomeX,
      y: rowY(row),
      dominant: seq.dominant,
    };
  });

  // Flat run-out segment from each leaf's terminal node to the outcome column.
  for (const leaf of leaves) {
    const lastCol = leaf.sequence.legs.length - 1;
    const fromX = lastCol >= 0 ? gridX(lastCol) : ieX2;
    if (fromX < outcomeX) {
      forks.push({
        functionId: "__leaf__",
        leg: leaf.sequence.legs[leaf.sequence.legs.length - 1] ?? "s",
        prob: 1,
        tag: "",
        path: `M ${r(fromX)} ${r(leaf.y)} L ${r(outcomeX)} ${r(leaf.y)}`,
        labelX: fromX,
        labelY: leaf.y,
      });
    }
  }

  // ── Header band ──
  const headers: EventTreeLayoutHeader[] = [];
  headers.push({
    kind: "initiating",
    label: "Initiating Event",
    cx: C.IE_LEFT + C.IE_STUB / 2,
  });
  ast.functions.forEach((fn, col) => {
    headers.push({
      kind: "function",
      label: fn.label ?? fn.id,
      cx: gridX(col),
      gridX: gridX(col),
    });
  });
  headers.push({ kind: "outcome", label: "Outcome", cx: outcomeX + C.OUTCOME_W * 0.32 });
  headers.push({ kind: "frequency", label: "Frequency", cx: outcomeX + C.OUTCOME_W * 0.82 });

  // ── Dashed vertical gridlines (one per function column) ──
  const gridBottom = rowY(rowCount - 1) + C.ROW_H / 2;
  const gridLines = ast.functions.map((_, col) => ({
    x: gridX(col),
    y1: bodyTopY,
    y2: gridBottom,
  }));

  const width = outcomeX + C.OUTCOME_W + C.CANVAS_PAD;
  const height = gridBottom + C.CANVAS_PAD;

  return {
    ast,
    analysis,
    headers,
    forks,
    leaves,
    initiating: {
      x1: C.IE_LEFT,
      x2: ieX2,
      y: root.y,
      labelX: C.IE_LEFT,
      labelY: root.y - 10,
      freqY: root.y + 16,
    },
    gridLines,
    headerY,
    bodyTopY,
    width: Math.ceil(width),
    height: Math.ceil(height),
  };
}

function r(n: number): number {
  return Math.round(n * 10) / 10;
}
