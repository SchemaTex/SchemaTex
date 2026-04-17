import type {
  LadderAST,
  LadderRung,
  LadderElement,
  LadderBranch,
} from "../../core/types";

export const LEFT_RAIL_X = 60;
export const RIGHT_RAIL_MARGIN = 30;
export const BASE_RUNG_HEIGHT = 100;
export const ELEMENT_WIDTH = 32;
export const ELEMENT_HEIGHT = 24;
export const FB_WIDTH = 80;
export const FB_HEIGHT = 56;
export const CMP_WIDTH = 56;
export const CMP_HEIGHT = 34;
export const RUNG_Y_OFFSET = 70;
export const H_SPACING = 16;
export const PARALLEL_GAP = 14;
export const CANVAS_PADDING = 30;

/** Rough chars → pixels for 9px font */
const CHAR_W = 6.1;
const LINE_H = 11;

export type LadderElementKind =
  | "contact"
  | "coil"
  | "function_block"
  | "compare";

export interface LadderLayoutNode {
  id: string;
  rungIndex: number;
  element: LadderElement;
  kind: LadderElementKind;
  /** x of the element body (left edge) */
  x: number;
  /** y of the element body (top edge) */
  y: number;
  width: number;
  height: number;
  /** rung centerline Y (where wires attach) */
  rungY: number;
}

export interface LadderLayoutWire {
  path: string;
}

export interface LadderLayoutRung {
  rung: LadderRung;
  index: number;
  y: number;
  /** Rightmost x reached by elements on this rung. */
  endX: number;
  /** Rung slot total height (used for spacing). */
  height: number;
  /** Total pixel height reserved above rungY for name/tag labels. */
  headerHeight: number;
}

export interface LadderLayoutResult {
  width: number;
  height: number;
  leftRailX: number;
  rightRailX: number;
  rungs: LadderLayoutRung[];
  nodes: LadderLayoutNode[];
  wires: LadderLayoutWire[];
}

const COMPARE_TYPES = new Set(["EQU", "NEQ", "GRT", "LES", "GEQ", "LEQ"]);

function bodyWidth(el: LadderElement): number {
  if (el.elementType === "function_block") {
    if (COMPARE_TYPES.has(el.fbType)) return CMP_WIDTH;
    return FB_WIDTH;
  }
  return ELEMENT_WIDTH;
}

function bodyHeight(el: LadderElement): number {
  if (el.elementType === "function_block") {
    if (COMPARE_TYPES.has(el.fbType)) return CMP_HEIGHT;
    return FB_HEIGHT;
  }
  return ELEMENT_HEIGHT;
}

function elementKind(el: LadderElement): LadderElementKind {
  if (el.elementType === "contact") return "contact";
  if (el.elementType === "coil") return "coil";
  if (COMPARE_TYPES.has(el.fbType)) return "compare";
  return "function_block";
}

/** Wrap a long description into lines of ~13 chars without splitting words. */
export function wrapName(name: string, maxChars = 14): string[] {
  const words = name.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (trial.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = trial;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function labelLinesForContactOrCoil(el: LadderElement): string[] {
  if (el.elementType === "function_block") return [el.tag];
  const lines: string[] = [];
  if (el.name) lines.push(...wrapName(el.name));
  lines.push(el.tag);
  if (el.address) lines.push(el.address);
  return lines;
}

/** Max label width in px across all label lines of the element. */
function labelWidth(el: LadderElement): number {
  const lines = labelLinesForContactOrCoil(el);
  let maxChars = 0;
  for (const l of lines) if (l.length > maxChars) maxChars = l.length;
  return maxChars * CHAR_W;
}

/** Slot width = max(bodyWidth, labelWidth) + padding on both sides. */
function slotWidth(el: LadderElement): number {
  return Math.max(bodyWidth(el), labelWidth(el)) + 6;
}

/** Total label rows above the element body (name lines + tag). */
function labelRowsAbove(el: LadderElement): number {
  if (el.elementType === "function_block") return 1;
  const name = el.name ? wrapName(el.name).length : 0;
  return name + 1; // + tag line
}

function labelRowsBelow(el: LadderElement): number {
  if (el.elementType === "function_block") return 0;
  if ((el as { address?: string }).address) return 1;
  return 0;
}

/** Required vertical pixels above rung centerline for tallest element label stack. */
function rungLabelHeaderHeight(rung: LadderRung): number {
  let maxAbovePx = 0;
  for (const item of rung.elements) {
    if ("parallel" in item) {
      const ph = parallelHeight(item.parallel);
      // Only the top-branch elements extend above the centerline.
      const topBranch = item.parallel[0];
      if (!topBranch) continue;
      const aboveRows = Math.max(
        1,
        ...topBranch.elements.map((e) => labelRowsAbove(e))
      );
      const px = ph / 2 + aboveRows * LINE_H + 4;
      if (px > maxAbovePx) maxAbovePx = px;
    } else {
      const rows = labelRowsAbove(item);
      const px = bodyHeight(item) / 2 + rows * LINE_H + 4;
      if (px > maxAbovePx) maxAbovePx = px;
    }
  }
  return maxAbovePx;
}

function rungLabelFooterHeight(rung: LadderRung): number {
  let maxBelowPx = 0;
  for (const item of rung.elements) {
    if ("parallel" in item) {
      const ph = parallelHeight(item.parallel);
      const bottomBranch = item.parallel[item.parallel.length - 1];
      if (!bottomBranch) continue;
      const belowRows = Math.max(
        0,
        ...bottomBranch.elements.map((e) => labelRowsBelow(e))
      );
      const px = ph / 2 + belowRows * LINE_H + 4;
      if (px > maxBelowPx) maxBelowPx = px;
    } else {
      const rows = labelRowsBelow(item);
      const px = bodyHeight(item) / 2 + rows * LINE_H + 4;
      if (px > maxBelowPx) maxBelowPx = px;
    }
  }
  return maxBelowPx;
}

function branchInlineWidth(branch: LadderBranch): number {
  if (branch.elements.length === 0) return ELEMENT_WIDTH;
  let w = 0;
  branch.elements.forEach((el, i) => {
    w += slotWidth(el);
    if (i < branch.elements.length - 1) w += H_SPACING;
  });
  return w;
}

function parallelWidth(branches: LadderBranch[]): number {
  const maxBranch = Math.max(
    ELEMENT_WIDTH,
    ...branches.map(branchInlineWidth)
  );
  return maxBranch + 2 * H_SPACING;
}

/** Per-branch row height including label stack above + below. */
function branchRowHeight(branch: LadderBranch): number {
  const bodyH = Math.max(
    ELEMENT_HEIGHT,
    ...branch.elements.map((e) => bodyHeight(e))
  );
  const above = Math.max(1, ...branch.elements.map((e) => labelRowsAbove(e)));
  const below = Math.max(0, ...branch.elements.map((e) => labelRowsBelow(e)));
  return bodyH + above * LINE_H + below * LINE_H + 6;
}

function parallelHeight(branches: LadderBranch[]): number {
  // Account for label space between branches so name/address rows don't collide.
  let total = 0;
  branches.forEach((br, i) => {
    total += branchRowHeight(br);
    if (i < branches.length - 1) total += PARALLEL_GAP;
  });
  return Math.max(total, ELEMENT_HEIGHT);
}

export function layoutLadder(ast: LadderAST): LadderLayoutResult {
  const nodes: LadderLayoutNode[] = [];
  const wires: LadderLayoutWire[] = [];
  const rungs: LadderLayoutRung[] = [];

  let maxEndX = LEFT_RAIL_X + 200;
  let cursorY = RUNG_Y_OFFSET;

  ast.rungs.forEach((rung, rungIndex) => {
    const headerH = rungLabelHeaderHeight(rung);
    const footerH = rungLabelFooterHeight(rung);
    // Per-rung height is comment (16) + header + footer + a little breathing room.
    const rungHeight = Math.max(BASE_RUNG_HEIGHT, 16 + headerH + footerH + 16);
    const rungY = cursorY + 16 + headerH;

    let x = LEFT_RAIL_X + H_SPACING;
    let prevRightX = LEFT_RAIL_X;
    let prevRightY = rungY;

    const addWire = (x1: number, y1: number, x2: number, y2: number) => {
      wires.push({ path: `M ${x1} ${y1} L ${x2} ${y2}` });
    };

    rung.elements.forEach((item, elIdx) => {
      if ("parallel" in item) {
        const branches = item.parallel;
        const pw = parallelWidth(branches);
        const ph = parallelHeight(branches);
        const bx = x;
        const ex = x + pw;

        addWire(prevRightX, prevRightY, bx, rungY);

        const busTop = rungY - ph / 2;
        const busBot = rungY + ph / 2;
        wires.push({ path: `M ${bx} ${busTop} L ${bx} ${busBot}` });
        wires.push({ path: `M ${ex} ${busTop} L ${ex} ${busBot}` });

        // Pre-compute row Y for each branch using actual row heights.
        let rowY = busTop;
        branches.forEach((branch, bIdx) => {
          const rowH = branchRowHeight(branch);
          const bodyMax = Math.max(
            ELEMENT_HEIGHT,
            ...branch.elements.map((e) => bodyHeight(e))
          );
          const above = Math.max(
            1,
            ...branch.elements.map((e) => labelRowsAbove(e))
          );
          // Position centerline so labels above fit within rowH.
          const branchY = rowY + above * LINE_H + bodyMax / 2;
          const bInline = branchInlineWidth(branch);
          const startX = bx + H_SPACING + ((ex - bx - 2 * H_SPACING) - bInline) / 2;
          let bx0 = startX;
          let prevBX = bx;
          branch.elements.forEach((bel, beIdx) => {
            const w = bodyWidth(bel);
            const h = bodyHeight(bel);
            const slot = slotWidth(bel);
            const nx = bx0 + (slot - w) / 2;
            const ny = branchY - h / 2;
            const id = `R${rung.number}_P${elIdx}_B${bIdx}_E${beIdx}`;
            nodes.push({
              id,
              rungIndex,
              element: bel,
              kind: elementKind(bel),
              x: nx,
              y: ny,
              width: w,
              height: h,
              rungY: branchY,
            });
            addWire(prevBX, branchY, nx, branchY);
            prevBX = nx + w;
            bx0 += slot + H_SPACING;
          });
          addWire(prevBX, branchY, ex, branchY);
          rowY += rowH + PARALLEL_GAP;
        });

        prevRightX = ex;
        prevRightY = rungY;
        x = ex + H_SPACING;
        return;
      }

      const el = item;
      const w = bodyWidth(el);
      const h = bodyHeight(el);
      const slot = slotWidth(el);
      const nx = x + (slot - w) / 2;
      const ny = rungY - h / 2;
      const id = `R${rung.number}_E${elIdx}`;
      nodes.push({
        id,
        rungIndex,
        element: el,
        kind: elementKind(el),
        x: nx,
        y: ny,
        width: w,
        height: h,
        rungY,
      });
      addWire(prevRightX, prevRightY, nx, rungY);
      prevRightX = nx + w;
      prevRightY = rungY;
      x += slot + H_SPACING;
    });

    rungs.push({
      rung,
      index: rungIndex,
      y: rungY,
      endX: prevRightX,
      height: rungHeight,
      headerHeight: headerH,
    });
    if (prevRightX > maxEndX) maxEndX = prevRightX;
    cursorY += rungHeight;
  });

  const rightRailX = maxEndX + H_SPACING * 2;
  const width = rightRailX + RIGHT_RAIL_MARGIN;
  const height = cursorY + CANVAS_PADDING;

  for (const r of rungs) {
    wires.push({ path: `M ${r.endX} ${r.y} L ${rightRailX} ${r.y}` });
  }

  return {
    width,
    height,
    leftRailX: LEFT_RAIL_X,
    rightRailX,
    rungs,
    nodes,
    wires,
  };
}

export { labelRowsAbove, labelRowsBelow };
