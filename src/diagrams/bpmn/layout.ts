/**
 * BPMN layout — BpmnAst → BpmnLayoutResult.
 *
 * Strategy (v0.1):
 *   1. Per pool, run longest-path layering using sequence/conditional/default
 *      flows to get each object's column index.
 *   2. Within each lane, place objects at their column's X. If multiple
 *      objects from the same lane share a column, stack them vertically
 *      inside the lane.
 *   3. Lane height = max stack count × row pitch + padding.
 *   4. Transpose geometry for TB. Pools stack across the flow axis;
 *      black-box pools render as a
 *      thin label band.
 *   5. Routing: Manhattan / orthogonal. Sequence flows bend at the channel
 *      midpoint between columns; feedback routes around the objects.
 *      Message flows connect the facing boundaries of their endpoints.
 */
import type {
  BpmnAst,
  BpmnFlow,
  BpmnDirection,
  BpmnFlowObject,
  BpmnLayoutFlow,
  BpmnLayoutLane,
  BpmnLayoutObject,
  BpmnLayoutPool,
  BpmnLayoutResult,
} from "../../core/types";

export const BPMN_CONST = {
  taskWidth: 110,
  taskHeight: 60,
  eventRadius: 18,
  gatewaySize: 44,
  /** Horizontal column pitch (center-to-center). */
  colPitch: 150,
  /** Vertical row pitch within a lane (center-to-center). */
  rowPitch: 92,
  /** Padding inside a lane around its content. */
  lanePadX: 28,
  lanePadY: 18,
  /** Lane label band width on left edge. */
  laneLabelWidth: 22,
  /** Pool label band width on left edge. */
  poolLabelWidth: 26,
  /** Minimum lane height. */
  minLaneHeight: 90,
  /** Vertical gap between pools. */
  poolGap: 36,
  /** Top/left page padding. */
  padding: 16,
  /** Black-box pool height. */
  blackboxHeight: 60,
  /** Loop channels stay 12px from the pool edge, inside the lane padding. */
  loopInset: 12,
  /** Keep flow labels 6px above their routing segment. */
  flowLabelGap: 6,
  /** Char width approximation at 12px. */
  charW: 6.4,
  cjkCharW: 12,
  charH: 16,
} as const;

function isCJK(code: number): boolean {
  return (
    (code >= 0x3000 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xff00 && code <= 0xffef)
  );
}

function measureWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    w += isCJK(c) ? BPMN_CONST.cjkCharW : BPMN_CONST.charW;
  }
  return w;
}

function objBox(o: BpmnFlowObject): { w: number; h: number } {
  if ("kind" in o && (o.kind === "task" || o.kind === "subprocess-collapsed")) {
    const lblW = measureWidth(o.label) + 26;
    return {
      w: Math.max(BPMN_CONST.taskWidth, Math.min(180, lblW)),
      h: BPMN_CONST.taskHeight,
    };
  }
  if ("gatewayKind" in o) {
    return { w: BPMN_CONST.gatewaySize, h: BPMN_CONST.gatewaySize };
  }
  // event
  const r = BPMN_CONST.eventRadius;
  return { w: r * 2, h: r * 2 };
}

export function layoutBpmn(ast: BpmnAst): BpmnLayoutResult {
  const allObjects: BpmnFlowObject[] = [
    ...ast.events,
    ...ast.activities,
    ...ast.gateways,
  ];
  const objById = new Map<string, BpmnFlowObject>();
  for (const o of allObjects) objById.set(o.id, o);

  const vertical = ast.direction === "TB";
  const { ranks: colByObj, backEdges } = rankBpmnSequences(ast);

  // ── 2. Per-lane stacking within columns (when multiple lane-objs share col)
  // Within each lane: assign a row index to each object based on column order.
  const rowByObj = new Map<string, number>();
  const laneStackHeight = new Map<string, number>(); // laneId → max rows

  for (const lane of ast.lanes) {
    // Group lane children by column.
    const byCol = new Map<number, string[]>();
    for (const childId of lane.children) {
      const col = colByObj.get(childId) ?? 0;
      if (!byCol.has(col)) byCol.set(col, []);
      byCol.get(col)!.push(childId);
    }
    // Stable row assignment: within each column the order in lane.children wins.
    let maxRows = 1;
    for (const [, ids] of byCol) {
      ids.forEach((id, ri) => rowByObj.set(id, ri));
      if (ids.length > maxRows) maxRows = ids.length;
    }
    laneStackHeight.set(lane.id, maxRows);
  }

  // ── 3. Compute number of columns globally (pools share x-grid for visual alignment).
  let maxCol = 0;
  for (const c of colByObj.values()) if (c > maxCol) maxCol = c;
  const numCols = maxCol + 1;

  // ── 4. Pool / lane geometry.
  const padding = BPMN_CONST.padding;
  // Keep a routing gutter even when a task label widens its box.
  const colPitch = Math.max(BPMN_CONST.colPitch, ...allObjects.map((o) =>
    (vertical ? objBox(o).h : objBox(o).w) + 2 * BPMN_CONST.lanePadX));
  // Work in LR coordinates, then transpose geometry (not text) for TB.
  // TB stacks task widths across each lane, so derive its pitch from the boxes.
  const rowPitch = vertical
    ? Math.max(BPMN_CONST.rowPitch, ...allObjects.map((o) => objBox(o).w + 2 * BPMN_CONST.lanePadY))
    : BPMN_CONST.rowPitch;
  const labelBand = BPMN_CONST.poolLabelWidth + BPMN_CONST.laneLabelWidth;

  const innerW = numCols * colPitch + 2 * BPMN_CONST.lanePadX;
  const poolWidth = labelBand + innerW;

  const poolLayouts: BpmnLayoutPool[] = [];
  const laneLayouts: BpmnLayoutLane[] = [];
  const objectLayouts: BpmnLayoutObject[] = [];

  let cursorY = padding;

  for (const pool of ast.pools) {
    const poolY = cursorY;

    if (pool.blackbox) {
      const h = BPMN_CONST.blackboxHeight;
      poolLayouts.push({
        pool,
        x: padding,
        y: poolY,
        width: poolWidth,
        height: h,
        labelX: padding,
        labelY: poolY,
        labelWidth: BPMN_CONST.poolLabelWidth,
      });
      cursorY += h + BPMN_CONST.poolGap;
      continue;
    }

    // Lanes: stack vertically inside the pool.
    let laneCursor = poolY;
    const poolLaneIds = pool.lanes;
    const poolLaneStartY = poolY;
    let poolH = 0;

    for (const laneId of poolLaneIds) {
      const lane = ast.lanes.find((l) => l.id === laneId)!;
      const rows = laneStackHeight.get(lane.id) ?? 1;
      const laneH = Math.max(
        BPMN_CONST.minLaneHeight,
        rows * rowPitch + 2 * BPMN_CONST.lanePadY
      );
      const laneX = padding + BPMN_CONST.poolLabelWidth;
      const laneW = poolWidth - BPMN_CONST.poolLabelWidth;
      laneLayouts.push({
        lane,
        x: laneX,
        y: laneCursor,
        width: laneW,
        height: laneH,
        labelX: laneX,
        labelY: laneCursor,
        labelHeight: BPMN_CONST.laneLabelWidth,
      });

      // Place lane children within this lane band.
      const laneInnerLeft = laneX + BPMN_CONST.laneLabelWidth + BPMN_CONST.lanePadX;
      const laneInnerTop = laneCursor + BPMN_CONST.lanePadY;

      for (const childId of lane.children) {
        const obj = objById.get(childId)!;
        const col = colByObj.get(childId) ?? 0;
        const row = rowByObj.get(childId) ?? 0;
        const cx = laneInnerLeft + col * colPitch + colPitch / 2;
        const cy = laneInnerTop + row * rowPitch + rowPitch / 2;
        const box = objBox(obj);
        const w = vertical ? box.h : box.w;
        const h = vertical ? box.w : box.h;
        objectLayouts.push({
          obj,
          x: cx - w / 2,
          y: cy - h / 2,
          width: w,
          height: h,
        });
      }

      laneCursor += laneH;
      poolH += laneH;
    }

    poolLayouts.push({
      pool,
      x: padding,
      y: poolLaneStartY,
      width: poolWidth,
      height: poolH,
      labelX: padding,
      labelY: poolLaneStartY,
      labelWidth: BPMN_CONST.poolLabelWidth,
    });

    cursorY = poolLaneStartY + poolH + BPMN_CONST.poolGap;
  }

  const totalHeight = cursorY - BPMN_CONST.poolGap + padding;
  const totalWidth = padding + poolWidth + padding;

  // ── 5. Flow routing (Manhattan).
  const objCenter = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const ol of objectLayouts) {
    objCenter.set(ol.obj.id, {
      x: ol.x + ol.width / 2,
      y: ol.y + ol.height / 2,
      w: ol.width,
      h: ol.height,
    });
  }
  const poolCenter = new Map<string, BpmnLayoutPool>();
  for (const p of poolLayouts) poolCenter.set(p.pool.label, p);

  const flowLayouts: BpmnLayoutFlow[] = [];
  for (const f of ast.flows) {
    if (f.kind === "message") {
      flowLayouts.push(routeMessageFlow(f, objCenter, poolCenter, ast.direction));
    } else {
      const pool = poolLayouts.find((p) => p.pool.id === objById.get(f.from)!.poolId)!;
      const path = routeSequenceFlow(f, objCenter, backEdges.has(f), pool, colPitch, ast.direction);
      flowLayouts.push(path);
    }
  }

  return {
    ast,
    pools: vertical ? poolLayouts.map((p) => ({
      ...transposeBox(p), labelX: p.labelY, labelY: p.labelX,
    })) : poolLayouts,
    lanes: vertical ? laneLayouts.map((l) => ({
      ...transposeBox(l), labelX: l.labelY, labelY: l.labelX,
    })) : laneLayouts,
    objects: vertical ? objectLayouts.map(transposeBox) : objectLayouts,
    flows: flowLayouts,
    width: vertical ? totalHeight : totalWidth,
    height: vertical ? totalWidth : totalHeight,
  };
}

// ─── Per-pool layering ────────────────────────────────────────

/** Sequence-only longest paths; DFS ancestor edges are genuine feedback loops. */
export function rankBpmnSequences(ast: BpmnAst): {
  ranks: Map<string, number>;
  backEdges: Set<BpmnFlow>;
} {
  const objects = [...ast.events, ...ast.activities, ...ast.gateways];
  const adj = new Map<string, BpmnFlow[]>(objects.map((o) => [o.id, []]));
  const inDegree = new Map(objects.map((o) => [o.id, 0]));
  for (const flow of ast.flows) {
    if (flow.kind === "message") continue;
    adj.get(flow.from)!.push(flow);
    inDegree.set(flow.to, inDegree.get(flow.to)! + 1);
  }

  // Like the layered state layout, remove feedback before assigning ranks,
  // retaining the original edges for routing. Prefer start events and sources.
  const backEdges = new Set<BpmnFlow>();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    visited.add(id);
    visiting.add(id);
    for (const flow of adj.get(id)!) {
      if (visiting.has(flow.to)) backEdges.add(flow);
      else if (!visited.has(flow.to)) visit(flow.to);
    }
    visiting.delete(id);
  };
  const starts = ast.events.filter((e) => e.kind === "start");
  const sources = objects.filter((o) => inDegree.get(o.id) === 0);
  for (const obj of [...starts, ...sources, ...objects]) {
    if (!visited.has(obj.id)) visit(obj.id);
  }

  for (const flow of backEdges) {
    inDegree.set(flow.to, inDegree.get(flow.to)! - 1);
  }
  const queue = objects.filter((o) => inDegree.get(o.id) === 0).map((o) => o.id);
  const ranks = new Map(objects.map((o) => [o.id, 0]));
  for (const id of queue) {
    for (const flow of adj.get(id)!) {
      if (backEdges.has(flow)) continue;
      ranks.set(flow.to, Math.max(ranks.get(flow.to)!, ranks.get(id)! + 1));
      const remaining = inDegree.get(flow.to)! - 1;
      inDegree.set(flow.to, remaining);
      if (remaining === 0) queue.push(flow.to);
    }
  }
  return { ranks, backEdges };
}

interface Box { x: number; y: number; width: number; height: number }
interface Center { x: number; y: number; w: number; h: number }
interface Point { x: number; y: number }

function transposeBox<T extends Box>(box: T): T {
  return { ...box, x: box.y, y: box.x, width: box.height, height: box.width };
}

// ─── Routing ──────────────────────────────────────────────────

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

function routedFlow(
  flow: BpmnFlow,
  points: Point[],
  labelAnchor: Point,
  direction: BpmnDirection
): BpmnLayoutFlow {
  const orient = (p: Point): Point => direction === "TB" ? { x: p.y, y: p.x } : p;
  return {
    flow,
    path: points.map(orient).map((p, i) => `${i === 0 ? "M" : "L"} ${fmt(p.x)} ${fmt(p.y)}`).join(" "),
    labelAnchor: orient(labelAnchor),
  };
}

function routeSequenceFlow(
  f: BpmnFlow,
  objCenter: Map<string, Center>,
  backEdge: boolean,
  pool: BpmnLayoutPool,
  colPitch: number,
  direction: BpmnDirection
): BpmnLayoutFlow {
  const a = objCenter.get(f.from)!;
  const b = objCenter.get(f.to)!;
  const from = { x: a.x + a.w / 2, y: a.y };
  const to = { x: b.x - b.w / 2, y: b.y };
  if (backEdge) {
    // Leave on the forward side, return above the pool's objects, and re-enter
    // from the earlier side. This also gives self-loops a nonzero route.
    const channelY = pool.y + BPMN_CONST.loopInset;
    const exitX = a.x + colPitch / 2;
    const entryX = b.x - colPitch / 2;
    return routedFlow(f, [from, { x: exitX, y: a.y },
      { x: exitX, y: channelY }, { x: entryX, y: channelY },
      { x: entryX, y: b.y }, to],
    { x: (exitX + entryX) / 2, y: channelY - BPMN_CONST.flowLabelGap }, direction);
  }
  // Always exit and enter along the process axis, including cross-lane edges.
  const midX = (from.x + to.x) / 2;
  return routedFlow(f, [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to],
    { x: midX, y: (from.y + to.y) / 2 - BPMN_CONST.flowLabelGap }, direction);
}

function routeMessageFlow(
  f: BpmnFlow,
  objCenter: Map<string, Center>,
  poolByLabel: Map<string, BpmnLayoutPool>,
  direction: BpmnDirection
): BpmnLayoutFlow {
  const endpoint = (ep: string): Center => {
    const pool = poolByLabel.get(ep);
    if (pool) return {
      x: pool.x + pool.width / 2, y: pool.y + pool.height / 2,
      w: pool.width, h: pool.height,
    };
    return objCenter.get(ep)!;
  };
  const a = endpoint(f.from);
  const b = endpoint(f.to);
  // Pools are separated on the cross axis. Clip both endpoints to their
  // facing boundary, including blackboxes, before choosing the channel.
  const sign = b.y >= a.y ? 1 : -1;
  const from = { x: a.x, y: a.y + sign * a.h / 2 };
  const to = { x: b.x, y: b.y - sign * b.h / 2 };
  const midY = (from.y + to.y) / 2;
  return routedFlow(f, [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to],
    { x: (from.x + to.x) / 2, y: midY - BPMN_CONST.flowLabelGap }, direction);
}
