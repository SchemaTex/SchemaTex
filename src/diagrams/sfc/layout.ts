/**
 * SFC layout — strict top-to-bottom.
 *
 * The body is a tree of nodes (steps, alt-blocks, sim-blocks). We compute
 * each node's bounding box by recursive sizing then assign coordinates in a
 * second pass. Branch regions divide horizontally; linear chains stack
 * vertically with `vertical_pitch` between step centers.
 *
 * Free-floating transitions declared via `transition from: A to: B: cond` are
 * placed as bars between linearly-adjacent steps in `body` order; transitions
 * that don't match a body adjacency are rendered as margin jump arrows.
 */

import type {
  SfcAltBranch,
  SfcAst,
  SfcLayoutAction,
  SfcLayoutBar,
  SfcLayoutJump,
  SfcLayoutResult,
  SfcLayoutStep,
  SfcLayoutTransition,
  SfcLayoutWire,
  SfcNode,
  SfcStep,
  SfcTransition,
} from "../../core/types";

export const SFC_CONST = {
  step_width: 160,
  step_height: 36,
  step_initial_offset: 4,
  transition_bar_w: 24,
  transition_bar_h: 3,
  simultaneous_bar_gap: 4,
  vertical_pitch: 56,
  branch_x_spacing: 40,
  action_block_w: 200,
  action_block_h: 24,
  action_qualifier_w: 26,
  action_time_h: 14,
  action_gap_x: 8,
  wire_thickness: 1.5,
  branch_wire_clearance: 16,
  margin_x: 60,
  margin_y: 40,
  jump_margin_x: 36,
};

interface SizeInfo {
  width: number;
  height: number;
  /** y-distance from top to step center (used to align convergence wire). */
  centerOffsetTop?: number;
}

interface PlacedStep {
  step: SfcStep;
  cx: number;  // center x
  cy: number;  // center y of step rectangle
}

interface LayoutContext {
  steps: Map<string, SfcLayoutStep>;
  actions: SfcLayoutAction[];
  transitions: SfcLayoutTransition[];
  bars: SfcLayoutBar[];
  wires: SfcLayoutWire[];
  jumps: SfcLayoutJump[];
  /** Map from step id → placed center coords (for jump routing). */
  placedById: Map<string, PlacedStep>;
}

function actionBlockFullHeight(): number {
  return SFC_CONST.action_block_h;  // base; +action_time_h added when time present
}

function sizeStepWithActions(step: SfcStep): SizeInfo {
  const width = SFC_CONST.step_width;
  const height = SFC_CONST.step_height;
  void step;
  return { width, height };
}

function sizeBody(ast: SfcAst, body: SfcNode[]): SizeInfo {
  // Linear stack: take max width, sum heights with vertical_pitch gaps between nodes (transition bars).
  let maxW = SFC_CONST.step_width;
  let totalH = 0;
  for (let i = 0; i < body.length; i++) {
    const node = body[i];
    const sz = sizeNode(ast, node);
    if (sz.width > maxW) maxW = sz.width;
    totalH += sz.height;
    if (i < body.length - 1) {
      totalH += SFC_CONST.vertical_pitch;
    }
  }
  return { width: maxW, height: totalH };
}

function sizeNode(ast: SfcAst, node: SfcNode): SizeInfo {
  if (node.kind === "step") {
    const step = ast.steps.get(node.stepId);
    if (!step) return { width: SFC_CONST.step_width, height: SFC_CONST.step_height };
    return sizeStepWithActions(step);
  }
  if (node.kind === "alt") {
    let totalW = 0;
    let maxH = 0;
    for (const br of node.branches) {
      const sz = sizeAltBranch(ast, br);
      totalW += sz.width;
      if (sz.height > maxH) maxH = sz.height;
    }
    totalW += (node.branches.length - 1) * SFC_CONST.branch_x_spacing;
    // Plus divergence + convergence overhead: ~2 transition gaps
    const totalH = maxH + SFC_CONST.vertical_pitch * 2;
    return { width: Math.max(totalW, SFC_CONST.step_width), height: totalH };
  }
  // sim
  let totalW = 0;
  let maxH = 0;
  for (const br of node.branches) {
    const sz = sizeBody(ast, br.body);
    totalW += sz.width;
    if (sz.height > maxH) maxH = sz.height;
  }
  totalW += (node.branches.length - 1) * SFC_CONST.branch_x_spacing;
  // shared transition above + double bar + body + double bar + shared transition below
  const totalH = SFC_CONST.vertical_pitch * 3 + maxH;
  return { width: Math.max(totalW, SFC_CONST.step_width), height: totalH };
}

function sizeAltBranch(ast: SfcAst, br: SfcAltBranch): SizeInfo {
  // entry transition + body + exit transition
  let bodyW = SFC_CONST.step_width;
  let bodyH = 0;
  for (let i = 0; i < br.body.length; i++) {
    const sz = sizeNode(ast, br.body[i]);
    if (sz.width > bodyW) bodyW = sz.width;
    bodyH += sz.height;
    if (i < br.body.length - 1) bodyH += SFC_CONST.vertical_pitch;
  }
  return {
    width: bodyW,
    height: bodyH + SFC_CONST.vertical_pitch * 2,  // entry + exit transitions
  };
}

/** Place a linear body returning the y-coordinate at the bottom (for chaining). */
function placeBody(
  ctx: LayoutContext,
  ast: SfcAst,
  body: SfcNode[],
  cx: number,
  startY: number
): { endY: number; firstStepCy?: number; lastStepCy?: number; firstStepId?: string; lastStepId?: string } {
  let y = startY;
  let firstCy: number | undefined;
  let firstId: string | undefined;
  let lastCy: number | undefined;
  let lastId: string | undefined;
  for (let i = 0; i < body.length; i++) {
    const node = body[i];
    if (i > 0) y += SFC_CONST.vertical_pitch;  // gap with transition between
    const placed = placeNode(ctx, ast, node, cx, y);
    if (i === 0) {
      firstCy = placed.firstCy;
      if (placed.firstStepId) firstId = placed.firstStepId;
    }
    lastCy = placed.lastCy;
    if (placed.lastStepId) lastId = placed.lastStepId;
    y = placed.endY;
  }
  return { endY: y, firstStepCy: firstCy, lastStepCy: lastCy, firstStepId: firstId, lastStepId: lastId };
}

interface PlaceResult {
  endY: number;
  firstCy: number;
  lastCy: number;
  firstStepId?: string;
  lastStepId?: string;
}

function placeNode(ctx: LayoutContext, ast: SfcAst, node: SfcNode, cx: number, startY: number): PlaceResult {
  if (node.kind === "step") {
    const step = ast.steps.get(node.stepId);
    if (!step) {
      return { endY: startY + SFC_CONST.step_height, firstCy: startY + SFC_CONST.step_height / 2, lastCy: startY + SFC_CONST.step_height / 2 };
    }
    return placeStep(ctx, step, cx, startY);
  }
  if (node.kind === "alt") {
    return placeAlt(ctx, ast, node, cx, startY);
  }
  return placeSim(ctx, ast, node, cx, startY);
}

function placeStep(ctx: LayoutContext, step: SfcStep, cx: number, y: number): PlaceResult {
  const w = SFC_CONST.step_width;
  const h = SFC_CONST.step_height;
  const x = cx - w / 2;
  const layoutStep: SfcLayoutStep = { step, x, y, width: w, height: h };
  ctx.steps.set(step.id, layoutStep);
  ctx.placedById.set(step.id, { step, cx, cy: y + h / 2 });

  // Action blocks to the right
  let ay = y;
  step.actions.forEach((a, idx) => {
    const ax = x + w + SFC_CONST.action_gap_x;
    const ah = a.time ? actionBlockFullHeight() + SFC_CONST.action_time_h : actionBlockFullHeight();
    ctx.actions.push({
      action: a,
      stepId: step.id,
      index: idx,
      x: ax,
      y: ay,
      width: SFC_CONST.action_block_w,
      height: ah,
      qualifierWidth: SFC_CONST.action_qualifier_w,
    });
    ay += ah;
  });

  return {
    endY: y + h,
    firstCy: y + h / 2,
    lastCy: y + h / 2,
    firstStepId: step.id,
    lastStepId: step.id,
  };
}

function placeAlt(ctx: LayoutContext, ast: SfcAst, node: Extract<SfcNode, { kind: "alt" }>, cx: number, startY: number): PlaceResult {
  // Compute total width
  const branchSizes = node.branches.map((br) => sizeAltBranch(ast, br));
  const totalW = branchSizes.reduce((s, b) => s + b.width, 0)
                + (node.branches.length - 1) * SFC_CONST.branch_x_spacing;
  const leftX = cx - totalW / 2;

  // Divergence bar
  const divY = startY + SFC_CONST.vertical_pitch / 2;
  ctx.bars.push({
    kind: "alt-div",
    x1: leftX - 12,
    x2: leftX + totalW + 12,
    y: divY,
  });

  // Place each branch
  let bx = leftX;
  let maxBranchEnd = 0;
  const branchEndIds: { id: string; cx: number }[] = [];
  for (let bi = 0; bi < node.branches.length; bi++) {
    const br = node.branches[bi];
    const sz = branchSizes[bi];
    const branchCx = bx + sz.width / 2;

    // Entry transition (between div bar and first step)
    const entryY = divY + (SFC_CONST.vertical_pitch - SFC_CONST.transition_bar_h) / 2 + SFC_CONST.transition_bar_h;
    const entryT: SfcTransition = {
      id: `_alt${bi}_entry`,
      from: "_div", to: "_div",
      condition: br.entryCondition,
    };
    ctx.transitions.push({
      transition: entryT,
      cx: branchCx,
      cy: divY + SFC_CONST.vertical_pitch * 0.5,
      w: SFC_CONST.transition_bar_w,
    });
    void entryY;

    // Place body inside branch
    const bodyStartY = divY + SFC_CONST.vertical_pitch;
    const placed = placeBody(ctx, ast, br.body, branchCx, bodyStartY);
    const branchEndY = placed.endY;
    // Exit transition
    ctx.transitions.push({
      transition: { id: `_alt${bi}_exit`, from: "_div", to: "_conv", condition: br.exitCondition },
      cx: branchCx,
      cy: branchEndY + SFC_CONST.vertical_pitch * 0.5,
      w: SFC_CONST.transition_bar_w,
    });
    if (placed.lastStepId) branchEndIds.push({ id: placed.lastStepId, cx: branchCx });
    if (placed.firstStepCy !== undefined) {
      // wire from div bar to entry transition to first step
      ctx.wires.push({ path: `M ${branchCx} ${divY} L ${branchCx} ${placed.firstStepCy - SFC_CONST.step_height / 2}`, cls: "wire" });
    }
    if (placed.lastStepCy !== undefined) {
      // wire from last step to exit transition then to conv
      ctx.wires.push({
        path: `M ${branchCx} ${placed.lastStepCy + SFC_CONST.step_height / 2} L ${branchCx} ${branchEndY + SFC_CONST.vertical_pitch}`,
        cls: "wire",
      });
    }
    bx += sz.width + SFC_CONST.branch_x_spacing;
    if (branchEndY + SFC_CONST.vertical_pitch > maxBranchEnd) maxBranchEnd = branchEndY + SFC_CONST.vertical_pitch;
  }

  // Convergence bar
  const convY = maxBranchEnd;
  ctx.bars.push({
    kind: "alt-conv",
    x1: leftX - 12,
    x2: leftX + totalW + 12,
    y: convY,
  });

  // Wire from main upstream into div bar (handled by parent body chain).
  // Wire from conv bar onward (handled by body chain).
  return {
    endY: convY,
    firstCy: divY,
    lastCy: convY,
  };
}

function placeSim(ctx: LayoutContext, ast: SfcAst, node: Extract<SfcNode, { kind: "sim" }>, cx: number, startY: number): PlaceResult {
  // Compute total width
  const branchSizes = node.branches.map((br) => sizeBody(ast, br.body));
  const totalW = branchSizes.reduce((s, b) => s + b.width, 0)
                + (node.branches.length - 1) * SFC_CONST.branch_x_spacing;
  const leftX = cx - totalW / 2;

  // Shared transition (above the double bar)
  const sharedTopY = startY + SFC_CONST.vertical_pitch * 0.5;
  ctx.transitions.push({
    transition: { id: "_sim_in", from: "_pre", to: "_div", condition: node.condition },
    cx,
    cy: sharedTopY,
    w: SFC_CONST.transition_bar_w,
  });

  // Double divergence bar
  const divY1 = startY + SFC_CONST.vertical_pitch;
  const divY2 = divY1 + SFC_CONST.simultaneous_bar_gap;
  ctx.bars.push({ kind: "sim-div", x1: leftX - 12, x2: leftX + totalW + 12, y: divY1 });
  ctx.bars.push({ kind: "sim-div", x1: leftX - 12, x2: leftX + totalW + 12, y: divY2 });

  // Place each branch
  let bx = leftX;
  let maxBranchEnd = 0;
  for (let bi = 0; bi < node.branches.length; bi++) {
    const br = node.branches[bi];
    const sz = branchSizes[bi];
    const branchCx = bx + sz.width / 2;
    const placed = placeBody(ctx, ast, br.body, branchCx, divY2 + SFC_CONST.vertical_pitch);
    if (placed.firstStepCy !== undefined) {
      ctx.wires.push({ path: `M ${branchCx} ${divY2} L ${branchCx} ${placed.firstStepCy - SFC_CONST.step_height / 2}`, cls: "wire" });
    }
    if (placed.lastStepCy !== undefined) {
      ctx.wires.push({ path: `M ${branchCx} ${placed.lastStepCy + SFC_CONST.step_height / 2} L ${branchCx} ${placed.endY + SFC_CONST.vertical_pitch}`, cls: "wire" });
    }
    bx += sz.width + SFC_CONST.branch_x_spacing;
    if (placed.endY + SFC_CONST.vertical_pitch > maxBranchEnd) maxBranchEnd = placed.endY + SFC_CONST.vertical_pitch;
  }

  // Double convergence bar
  const convY1 = maxBranchEnd;
  const convY2 = convY1 + SFC_CONST.simultaneous_bar_gap;
  ctx.bars.push({ kind: "sim-conv", x1: leftX - 12, x2: leftX + totalW + 12, y: convY1 });
  ctx.bars.push({ kind: "sim-conv", x1: leftX - 12, x2: leftX + totalW + 12, y: convY2 });

  // Shared transition (below the double bar)
  const sharedBottomY = convY2 + SFC_CONST.vertical_pitch * 0.5;
  ctx.transitions.push({
    transition: { id: "_sim_out", from: "_conv", to: "_post", condition: node.mergeCondition },
    cx,
    cy: sharedBottomY,
    w: SFC_CONST.transition_bar_w,
  });

  return {
    endY: convY2 + SFC_CONST.vertical_pitch,
    firstCy: sharedTopY,
    lastCy: convY2,
  };
}

export function layoutSfc(ast: SfcAst): SfcLayoutResult {
  const ctx: LayoutContext = {
    steps: new Map(),
    actions: [],
    transitions: [],
    bars: [],
    wires: [],
    jumps: [],
    placedById: new Map(),
  };

  // Estimate total width from sized body
  const totalSize = sizeBody(ast, ast.body);
  const cx = SFC_CONST.margin_x + totalSize.width / 2;

  // Place body
  const startY = SFC_CONST.margin_y;
  const placed = placeBody(ctx, ast, ast.body, cx, startY);

  // Connect adjacent body steps with vertical wires + transition bars from explicit transitions.
  // Build a quick adjacency table of explicit transitions.
  const trByPair = new Map<string, SfcTransition>();
  for (const t of ast.transitions) {
    trByPair.set(`${t.from}\0${t.to}`, t);
  }

  // Walk body to extract linear chain (step ids only at the top level).
  // Add transition bars between adjacent step nodes.
  const linearStepIds: string[] = collectLinearSteps(ast.body);
  for (let i = 0; i < linearStepIds.length - 1; i++) {
    const from = linearStepIds[i];
    const to = linearStepIds[i + 1];
    const t = trByPair.get(`${from}\0${to}`);
    const fromS = ctx.placedById.get(from);
    const toS = ctx.placedById.get(to);
    if (!fromS || !toS) continue;
    const midY = (fromS.cy + SFC_CONST.step_height / 2 + toS.cy - SFC_CONST.step_height / 2) / 2;
    if (t) {
      ctx.transitions.push({
        transition: t,
        cx: fromS.cx,
        cy: midY,
        w: SFC_CONST.transition_bar_w,
        ...(t.id ? { id: t.id } : {}),
      });
    }
    // Vertical wire (always)
    ctx.wires.push({
      path: `M ${fromS.cx} ${fromS.cy + SFC_CONST.step_height / 2} L ${toS.cx} ${toS.cy - SFC_CONST.step_height / 2}`,
      cls: "wire",
    });
    if (t) trByPair.delete(`${from}\0${to}`);
  }

  // Remaining transitions are jumps — draw as margin arrows.
  let jumpIdx = 0;
  for (const t of ast.transitions) {
    if (!trByPair.has(`${t.from}\0${t.to}`)) continue;
    const fromS = ctx.placedById.get(t.from);
    const toS = ctx.placedById.get(t.to);
    if (!fromS || !toS) continue;
    const onLeft = jumpIdx % 2 === 0;
    jumpIdx++;
    const marginX = onLeft
      ? SFC_CONST.margin_x - SFC_CONST.jump_margin_x
      : (placed.endY, totalSize.width + SFC_CONST.margin_x + SFC_CONST.jump_margin_x);
    const fromX = onLeft
      ? fromS.cx - SFC_CONST.step_width / 2
      : fromS.cx + SFC_CONST.step_width / 2;
    const toX = onLeft
      ? toS.cx - SFC_CONST.step_width / 2
      : toS.cx + SFC_CONST.step_width / 2;
    const fromY = fromS.cy;
    const toY = toS.cy;
    const path = `M ${fromX} ${fromY} L ${marginX} ${fromY} L ${marginX} ${toY} L ${toX} ${toY}`;
    ctx.jumps.push({
      fromStepId: t.from,
      toStepId: t.to,
      path,
      labelX: marginX + (onLeft ? -8 : 8),
      labelY: (fromY + toY) / 2,
      labelText: t.to,
      condition: t.condition,
    });
  }

  // Compute final width/height
  const width = totalSize.width + SFC_CONST.margin_x * 2 + SFC_CONST.jump_margin_x * 2 + 80;
  const height = placed.endY + SFC_CONST.margin_y;

  return {
    ast,
    steps: Array.from(ctx.steps.values()),
    actions: ctx.actions,
    transitions: ctx.transitions,
    bars: ctx.bars,
    wires: ctx.wires,
    jumps: ctx.jumps,
    width,
    height,
  };
}

function collectLinearSteps(body: SfcNode[]): string[] {
  const out: string[] = [];
  for (const node of body) {
    if (node.kind === "step") out.push(node.stepId);
    // alt/sim represent a single "logical step slot" but we don't include
    // their internal step ids as part of the linear chain — the chain
    // continues at the merge_to step which appears as a separate step node
    // later in body. Branch internals get wired by the placer.
  }
  return out;
}
