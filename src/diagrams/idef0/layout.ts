/**
 * IDEF0 layout — deterministic diagonal box staircase + ICOM arrow routing.
 * Per docs/reference/45-IDEF0-STANDARD.md §"Layout (correct-by-construction)".
 *
 * Boxes step **upper-left → lower-right** on a diagonal staircase (FIPS
 * convention, confirmed in the reference images). The dominant flow runs along
 * the diagonal; ICOM arrows route to their mandated edges:
 *   Input  → left,  Control → top,  Output → right,  Mechanism → bottom.
 * Box→box outputs that feed a downstream box's input/control/mechanism route
 * forward along the diagonal; a back-reference (target earlier in the staircase)
 * routes through the left/bottom **margin** as a feedback arrow.
 *
 * Pure + deterministic: same AST → identical geometry.
 */

import { analyseIdef0 } from "./analysis";
import type {
  BoxSide,
  Idef0Arrow,
  Idef0Ast,
  Idef0LayoutArrow,
  Idef0LayoutBox,
  Idef0LayoutResult,
} from "./types";
import { ICOM_SIDE } from "./types";

export const IDEF0_CONST = {
  BOX_W: 150,
  BOX_H: 80,
  /** Horizontal step between successive boxes along the staircase. */
  STEP_X: 230,
  /** Vertical step between successive boxes along the staircase. */
  STEP_Y: 130,
  /** Outer margin reserved for boundary arrows + feedback routing. */
  MARGIN: 110,
  /** Length of a boundary stub arrow (from the frame to the box edge). */
  STUB: 70,
  ARROW_HEAD: 9,
  /** Horizontal lead-in so a feedback arrow enters the input (left) edge cleanly. */
  FEEDBACK_LEADIN: 28,
  TITLE_H: 30,
  /** Title-block strip height at the page bottom. */
  TITLEBLOCK_H: 34,
} as const;

export function layoutIdef0(astIn: Idef0Ast): Idef0LayoutResult {
  const ast = analyseIdef0(astIn);
  const C = IDEF0_CONST;

  // ── 1. Place boxes on the diagonal staircase ──
  const ox = C.MARGIN;
  const oy = C.MARGIN + C.TITLE_H;
  const boxes: Idef0LayoutBox[] = ast.boxes.map((box, idx) => ({
    box,
    x: ox + idx * C.STEP_X,
    y: oy + idx * C.STEP_Y,
    width: C.BOX_W,
    height: C.BOX_H,
  }));
  const boxIndex = new Map(boxes.map((b, i) => [b.box.id, i] as const));

  // Canvas bounds from the staircase extent + margins.
  const lastBox = boxes[boxes.length - 1]!;
  const contentRight = lastBox.x + C.BOX_W;
  const contentBottom = lastBox.y + C.BOX_H;
  const width = contentRight + C.MARGIN;
  const height = contentBottom + C.MARGIN + C.TITLEBLOCK_H;

  // ── 2. Route arrows ──
  const arrows: Idef0LayoutArrow[] = ast.arrows.map((arrow) =>
    routeArrow(arrow, boxes, boxIndex)
  );

  return { ast, boxes, arrows, width, height };
}

// ─── Arrow routing ────────────────────────────────────────────

/** Returns the point on a box edge for a given side (centred on that side). */
function sidePoint(b: Idef0LayoutBox, side: BoxSide): { x: number; y: number } {
  switch (side) {
    case "left":
      return { x: b.x, y: b.y + b.height / 2 };
    case "right":
      return { x: b.x + b.width, y: b.y + b.height / 2 };
    case "top":
      return { x: b.x + b.width / 2, y: b.y };
    case "bottom":
      return { x: b.x + b.width / 2, y: b.y + b.height };
  }
}

function routeArrow(
  arrow: Idef0Arrow,
  boxes: Idef0LayoutBox[],
  boxIndex: Map<string, number>
): Idef0LayoutArrow {
  const C = IDEF0_CONST;
  const targetSide = ICOM_SIDE[arrow.role]; // side on the *box* endpoint

  // Boundary arrow: connects the page frame to a single box edge.
  const fromBoundary = arrow.from.kind === "boundary";
  const toBoundary = arrow.to.kind === "boundary";

  if (fromBoundary || toBoundary) {
    return routeBoundary(arrow, boxes, boxIndex, targetSide, fromBoundary);
  }

  // Box → box flow.
  const srcIdx = boxIndex.get((arrow.from as { boxId: string }).boxId)!;
  const tgtIdx = boxIndex.get((arrow.to as { boxId: string }).boxId)!;
  const src = boxes[srcIdx]!;
  const tgt = boxes[tgtIdx]!;

  const start = sidePoint(src, "right"); // outputs always leave the right edge
  const end = sidePoint(tgt, targetSide);
  const head = { x: end.x, y: end.y, dir: targetSide };

  const forward = tgtIdx > srcIdx;
  if (forward) {
    // Diagonal forward flow: right of src → target's mandated side. An
    // orthogonal dog-leg keeps arrows off the boxes.
    const midX = (start.x + end.x) / 2;
    let d: string;
    if (targetSide === "left") {
      d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
    } else if (targetSide === "top") {
      d = `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
    } else {
      // bottom (mechanism): step across then up into the box bottom edge.
      d = `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
    }
    return {
      arrow,
      path: d,
      head,
      label: labelAt(start, end, targetSide, false),
      margin: false,
    };
  }

  // Feedback (target is earlier on the staircase): route through the LEFT/TOP
  // margin so the arrow never crosses a box. Out the right, up over the top
  // margin, back down into the target side.
  const marginY = C.MARGIN / 2 + C.TITLE_H;
  let d: string;
  if (targetSide === "left") {
    // Input edge: drop down in the margin to the LEFT of the target box, then run
    // horizontally into its left edge. The arrowhead enters the edge cleanly
    // instead of falling vertically across the box body.
    const approachX = end.x - C.FEEDBACK_LEADIN;
    d =
      `M ${start.x} ${start.y} ` +
      `L ${start.x + 20} ${start.y} ` +
      `L ${start.x + 20} ${marginY} ` +
      `L ${approachX} ${marginY} ` +
      `L ${approachX} ${end.y} ` +
      `L ${end.x} ${end.y}`;
  } else {
    // top / bottom: a vertical approach already enters the mandated edge correctly.
    d =
      `M ${start.x} ${start.y} ` +
      `L ${start.x + 20} ${start.y} ` +
      `L ${start.x + 20} ${marginY} ` +
      `L ${end.x} ${marginY} ` +
      `L ${end.x} ${end.y}`;
  }
  return {
    arrow,
    path: d,
    head,
    label: { x: (start.x + 20 + end.x) / 2, y: marginY - 6, anchor: "middle" },
    margin: true,
  };
}

function routeBoundary(
  arrow: Idef0Arrow,
  boxes: Idef0LayoutBox[],
  boxIndex: Map<string, number>,
  targetSide: BoxSide,
  fromBoundary: boolean
): Idef0LayoutArrow {
  const C = IDEF0_CONST;
  // The box endpoint.
  const boxEnd = fromBoundary ? arrow.to : arrow.from;
  const b = boxes[boxIndex.get((boxEnd as { boxId: string }).boxId)!]!;

  // For an output (box→boundary) the box-side is the right edge.
  const side: BoxSide = fromBoundary ? targetSide : "right";
  const edge = sidePoint(b, side);

  // Stub direction: arrows enter from outside on their side; output exits right.
  let stub: { x: number; y: number };
  switch (side) {
    case "left":
      stub = { x: edge.x - C.STUB, y: edge.y };
      break;
    case "top":
      stub = { x: edge.x, y: edge.y - C.STUB };
      break;
    case "right":
      stub = { x: edge.x + C.STUB, y: edge.y };
      break;
    case "bottom":
      stub = { x: edge.x, y: edge.y + C.STUB };
      break;
  }

  let path: string;
  let head: { x: number; y: number; dir: BoxSide };
  let label: { x: number; y: number; anchor: "start" | "middle" | "end" };

  if (fromBoundary) {
    // boundary → box: arrow points INTO the box on `side`.
    path = `M ${stub.x} ${stub.y} L ${edge.x} ${edge.y}`;
    head = { x: edge.x, y: edge.y, dir: side };
    label = labelAtStub(stub, side);
  } else {
    // box (right) → boundary: arrow points AWAY from the box (outward right).
    path = `M ${edge.x} ${edge.y} L ${stub.x} ${stub.y}`;
    head = { x: stub.x, y: stub.y, dir: "right" };
    label = { x: stub.x + 6, y: stub.y - 6, anchor: "start" };
  }

  return { arrow, path, head, label, margin: false };
}

// ─── Label placement ──────────────────────────────────────────

function labelAt(
  start: { x: number; y: number },
  end: { x: number; y: number },
  targetSide: BoxSide,
  _margin: boolean
): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  // Place near the midpoint of the run, slightly off the line.
  if (targetSide === "top") {
    return { x: end.x + 6, y: (start.y + end.y) / 2, anchor: "start" };
  }
  return { x: (start.x + end.x) / 2, y: start.y - 6, anchor: "middle" };
}

function labelAtStub(
  stub: { x: number; y: number },
  side: BoxSide
): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  switch (side) {
    case "left":
      return { x: stub.x - 6, y: stub.y - 6, anchor: "end" };
    case "top":
      return { x: stub.x, y: stub.y - 6, anchor: "middle" };
    case "right":
      return { x: stub.x + 6, y: stub.y - 6, anchor: "start" };
    case "bottom":
      return { x: stub.x, y: stub.y + 14, anchor: "middle" };
  }
}
