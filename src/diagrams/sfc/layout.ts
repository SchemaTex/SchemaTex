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

import { estimateTextWidth } from "../../core/text-metrics";

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
  centerOffsetX?: number;
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

function stepWidth(step: SfcStep): number {
  return Math.max(SFC_CONST.step_width, estimateTextWidth(step.label ?? step.id, 12, { monospace: true, fontWeight: 600 }) + 24);
}

function actionWidth(step: SfcStep): number {
  return Math.max(SFC_CONST.action_block_w, ...step.actions.map(a =>
    estimateTextWidth(a.body, 11, { monospace: true }) + SFC_CONST.action_qualifier_w + 16));
}

function sizeStepWithActions(step: SfcStep): SizeInfo {
  const w = stepWidth(step);
  const actionH = step.actions.reduce((n, a) => n + actionBlockFullHeight() + (a.time ? SFC_CONST.action_time_h : 0), 0);
  return {
    width: w + (step.actions.length ? SFC_CONST.action_gap_x + actionWidth(step) : 0),
    height: Math.max(SFC_CONST.step_height, actionH),
    centerOffsetX: w / 2,
  };
}

function sizeBody(ast: SfcAst, body: SfcNode[]): SizeInfo {
  let left = SFC_CONST.step_width / 2;
  let right = left;
  let height = 0;
  body.forEach((node, index) => {
    const sz = sizeNode(ast, node);
    const anchor = sz.centerOffsetX ?? sz.width / 2;
    left = Math.max(left, anchor);
    right = Math.max(right, sz.width - anchor);
    height += sz.height + (index ? SFC_CONST.vertical_pitch : 0);
  });
  return { width: left + right, height, centerOffsetX: left };
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
  const body = sizeBody(ast, br.body);
  const conditionWidth = Math.max(
    estimateTextWidth(br.entryCondition, 11, { monospace: true }),
    estimateTextWidth(br.exitCondition ?? "", 11, { monospace: true })
  );
  return {
    ...body,
    width: Math.max(body.width, (body.centerOffsetX ?? body.width / 2) + SFC_CONST.transition_bar_w + 6 + conditionWidth),
    height: body.height + SFC_CONST.vertical_pitch * 2,
  };
}

/** Connect adjacent node ports without flattening a branch region into a step. */
function placeBody(
  ctx: LayoutContext,
  ast: SfcAst,
  body: SfcNode[],
  cx: number,
  startY: number
): PlaceResult {
  let y = startY;
  let first: PlaceResult | undefined;
  let previous: PlaceResult | undefined;
  for (const node of body) {
    if (previous) y += SFC_CONST.vertical_pitch;
    const placed = placeNode(ctx, ast, node, cx, y);
    if (previous) {
      ctx.wires.push({ path: `M ${cx} ${previous.exitY} L ${cx} ${placed.entryY}`, cls: "wire" });
      const fromId = previous.lastStepId;
      const transition = ast.transitions.find(t => t.from === fromId && t.to === placed.firstStepId);
      if (transition) {
        ctx.transitions.push({ transition, cx, cy: (previous.endY + placed.entryY) / 2,
          w: SFC_CONST.transition_bar_w, ...(transition.id ? { id: transition.id } : {}) });
      }
    }
    first ??= placed;
    previous = placed;
    y = placed.endY;
  }
  return { endY: y, entryY: first?.entryY ?? startY, exitY: previous?.exitY ?? startY,
    firstStepId: first?.firstStepId, lastStepId: previous?.lastStepId };
}

interface PlaceResult {
  endY: number;
  entryY: number;
  exitY: number;
  firstStepId?: string;
  lastStepId?: string;
}

function placeNode(ctx: LayoutContext, ast: SfcAst, node: SfcNode, cx: number, startY: number): PlaceResult {
  if (node.kind === "step") {
    const step = ast.steps.get(node.stepId);
    if (!step) {
      return { endY: startY + SFC_CONST.step_height, entryY: startY, exitY: startY + SFC_CONST.step_height };
    }
    return placeStep(ctx, step, cx, startY);
  }
  if (node.kind === "alt") {
    return placeAlt(ctx, ast, node, cx, startY);
  }
  return placeSim(ctx, ast, node, cx, startY);
}

function placeStep(ctx: LayoutContext, step: SfcStep, cx: number, y: number): PlaceResult {
  const w = stepWidth(step);
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
      width: actionWidth(step),
      height: ah,
      qualifierWidth: SFC_CONST.action_qualifier_w,
    });
    ay += ah;
  });

  return {
    endY: y + sizeStepWithActions(step).height,
    entryY: y,
    exitY: y + h,
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
  const branchEnds: { cx: number; y: number }[] = [];
  for (let bi = 0; bi < node.branches.length; bi++) {
    const br = node.branches[bi];
    const sz = branchSizes[bi];
    const branchCx = bx + (sz.centerOffsetX ?? sz.width / 2);

    // Entry transition (between div bar and first step)
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
    ctx.wires.push({ path: `M ${branchCx} ${divY} L ${branchCx} ${placed.entryY}`, cls: "wire" });
    branchEnds.push({ cx: branchCx, y: placed.exitY });
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

  for (const end of branchEnds) {
    ctx.wires.push({ path: `M ${end.cx} ${end.y} L ${end.cx} ${convY}`, cls: "wire" });
  }
  return { endY: convY, entryY: divY, exitY: convY };
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
  const branchEnds: { cx: number; y: number }[] = [];
  for (let bi = 0; bi < node.branches.length; bi++) {
    const br = node.branches[bi];
    const sz = branchSizes[bi];
    const branchCx = bx + (sz.centerOffsetX ?? sz.width / 2);
    const placed = placeBody(ctx, ast, br.body, branchCx, divY2 + SFC_CONST.vertical_pitch);
    ctx.wires.push({ path: `M ${branchCx} ${divY2} L ${branchCx} ${placed.entryY}`, cls: "wire" });
    branchEnds.push({ cx: branchCx, y: placed.exitY });
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

  ctx.wires.push({ path: `M ${cx} ${startY} L ${cx} ${divY1}`, cls: "wire" });
  for (const end of branchEnds) {
    ctx.wires.push({ path: `M ${end.cx} ${end.y} L ${end.cx} ${convY1}`, cls: "wire" });
  }
  const endY = convY2 + SFC_CONST.vertical_pitch;
  ctx.wires.push({ path: `M ${cx} ${convY2} L ${cx} ${endY}`, cls: "wire" });
  return { endY, entryY: startY, exitY: endY };
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
  const adjacentPairs = new Set<string>();
  const visit = (body: SfcNode[]): void => {
    body.forEach((node, index) => {
      const previous = body[index - 1];
      if (node.kind === "step" && previous?.kind === "step") adjacentPairs.add(`${previous.stepId}\0${node.stepId}`);
      if (node.kind !== "step") node.branches.forEach(branch => visit(branch.body));
    });
  };
  visit(ast.body);
  const marginTransitions = ast.transitions.filter(t => !adjacentPairs.has(`${t.from}\0${t.to}`));
  const jumpIdWidth = (t: SfcTransition) => estimateTextWidth(t.id ?? "", 10, { monospace: true });
  const jumpWidth = (t: SfcTransition) => jumpIdWidth(t) + SFC_CONST.transition_bar_w * 2 +
    estimateTextWidth(t.condition, 11, { monospace: true }) + 38;
  const marginLeft = Math.max(SFC_CONST.margin_x, marginTransitions.reduce((width, t) => width + jumpWidth(t), 20));
  const cx = marginLeft + (totalSize.centerOffsetX ?? totalSize.width / 2);

  // Place body
  const startY = SFC_CONST.margin_y;
  const placed = placeBody(ctx, ast, ast.body, cx, startY);

  // Remaining transitions are jumps — draw as margin arrows.
  let jumpX = 12;
  // Longer returns use outer lanes so shorter nested returns do not cross
  // their source connectors before reaching their own transition.
  const jumps = marginTransitions.slice().sort((a, b) => {
    const span = (t: SfcTransition) => Math.abs((ctx.placedById.get(t.from)?.cy ?? 0) - (ctx.placedById.get(t.to)?.cy ?? 0));
    return span(b) - span(a);
  });
  for (const t of jumps) {
    const fromS = ctx.placedById.get(t.from);
    const toS = ctx.placedById.get(t.to);
    if (!fromS || !toS) continue;
    const marginX = jumpX + jumpIdWidth(t) + SFC_CONST.transition_bar_w;
    jumpX += jumpWidth(t);
    const fromX = fromS.cx - stepWidth(fromS.step) / 2;
    const toX = toS.cx - stepWidth(toS.step) / 2;
    const fromY = fromS.cy;
    const toY = toS.cy;
    const path = `M ${fromX} ${fromY} L ${marginX} ${fromY} L ${marginX} ${toY} L ${toX} ${toY}`;
    ctx.transitions.push({ transition: t, cx: marginX, cy: (fromY + toY) / 2,
      w: SFC_CONST.transition_bar_w, ...(t.id ? { id: t.id } : {}) });
    ctx.jumps.push({
      fromStepId: t.from,
      toStepId: t.to,
      path,
      labelX: (marginX + toX) / 2,
      labelY: toY - 10,
      labelText: t.to,
    });
  }

  // Compute final width/height
  const width = totalSize.width + marginLeft * 2 + SFC_CONST.jump_margin_x * 2;
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
