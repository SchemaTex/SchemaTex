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
 *   4. Pools stacked vertically with a gap; black-box pools render as a
 *      thin label band.
 *   5. Routing: Manhattan / orthogonal. Sequence flows bend at the channel
 *      midpoint between adjacent columns. Message flows escape upward
 *      from the source pool to a routing channel, traverse horizontally,
 *      and descend into the target pool.
 */
import type {
  BpmnAst,
  BpmnFlowObject,
  BpmnLayoutFlow,
  BpmnLayoutLane,
  BpmnLayoutObject,
  BpmnLayoutPool,
  BpmnLayoutResult,
  BpmnPool,
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

  // ── 1. Per-pool layering (longest path from sources via sequence-type flows)
  const colByObj = new Map<string, number>();
  for (const pool of ast.pools) {
    if (pool.blackbox) continue;
    layerPool(ast, pool, colByObj);
  }

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
  const colPitch = BPMN_CONST.colPitch;
  const rowPitch = BPMN_CONST.rowPitch;
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
        const { w, h } = objBox(obj);
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
      flowLayouts.push(routeMessageFlow(f, objCenter, poolCenter));
    } else {
      const path = routeSequenceFlow(f, objCenter, objById);
      flowLayouts.push(path);
    }
  }

  return {
    ast,
    pools: poolLayouts,
    lanes: laneLayouts,
    objects: objectLayouts,
    flows: flowLayouts,
    width: totalWidth,
    height: totalHeight,
  };
}

// ─── Per-pool layering ────────────────────────────────────────

function layerPool(
  ast: BpmnAst,
  pool: BpmnPool,
  colByObj: Map<string, number>
): void {
  // Collect objects in this pool.
  const inPool = (id: string): boolean => {
    const ev = ast.events.find((e) => e.id === id);
    if (ev) return ev.poolId === pool.id;
    const a = ast.activities.find((x) => x.id === id);
    if (a) return a.poolId === pool.id;
    const g = ast.gateways.find((x) => x.id === id);
    if (g) return g.poolId === pool.id;
    return false;
  };
  const ids = [
    ...ast.events.filter((e) => e.poolId === pool.id).map((e) => e.id),
    ...ast.activities.filter((a) => a.poolId === pool.id).map((a) => a.id),
    ...ast.gateways.filter((g) => g.poolId === pool.id).map((g) => g.id),
  ];

  // Adjacency from sequence-type flows.
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const id of ids) {
    adj.set(id, []);
    inDeg.set(id, 0);
  }
  const allEdges: Array<[string, string]> = [];
  for (const f of ast.flows) {
    if (f.kind === "message") continue;
    if (!inPool(f.from) || !inPool(f.to)) continue;
    if (f.from === f.to) continue;
    adj.get(f.from)!.push(f.to);
    inDeg.set(f.to, (inDeg.get(f.to) ?? 0) + 1);
    allEdges.push([f.from, f.to]);
  }

  // Cycle break via DFS — back edges (u→v where v is ancestor of u in the
  // DFS tree) get tagged and excluded from longest-path layering. BPMN
  // rework loops (D → C → G → D) are common, so we must handle them.
  const backEdges = new Set<string>();
  const color = new Map<string, number>(); // 0=white, 1=gray, 2=black
  for (const id of ids) color.set(id, 0);
  const dfs = (v: string): void => {
    color.set(v, 1);
    for (const w of adj.get(v) ?? []) {
      const c = color.get(w) ?? 0;
      if (c === 1) {
        // back edge
        backEdges.add(`${v}\0${w}`);
      } else if (c === 0) {
        dfs(w);
      }
    }
    color.set(v, 2);
  };
  // Start DFS from start events first, then any remaining whites.
  const starts = ast.events.filter((e) => e.poolId === pool.id && e.kind === "start").map((e) => e.id);
  for (const s of starts) if ((color.get(s) ?? 0) === 0) dfs(s);
  for (const id of ids) if ((color.get(id) ?? 0) === 0) dfs(id);

  // Forward-edge longest path (back edges excluded).
  const fwdAdj = new Map<string, string[]>();
  for (const id of ids) fwdAdj.set(id, []);
  for (const [u, v] of allEdges) {
    if (backEdges.has(`${u}\0${v}`)) continue;
    fwdAdj.get(u)!.push(v);
  }
  // Topo sort over forward DAG.
  const fwdInDeg = new Map<string, number>();
  for (const id of ids) fwdInDeg.set(id, 0);
  for (const [u, v] of allEdges) {
    if (backEdges.has(`${u}\0${v}`)) continue;
    fwdInDeg.set(v, (fwdInDeg.get(v) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const id of ids) if ((fwdInDeg.get(id) ?? 0) === 0) queue.push(id);
  const order: string[] = [];
  const remIn = new Map(fwdInDeg);
  while (queue.length > 0) {
    const v = queue.shift()!;
    order.push(v);
    for (const w of fwdAdj.get(v) ?? []) {
      const d = (remIn.get(w) ?? 0) - 1;
      remIn.set(w, d);
      if (d === 0) queue.push(w);
    }
  }
  for (const id of ids) if (!order.includes(id)) order.push(id);

  for (const id of ids) colByObj.set(id, 0);
  for (const v of order) {
    const lv = colByObj.get(v) ?? 0;
    for (const w of fwdAdj.get(v) ?? []) {
      const lw = colByObj.get(w) ?? 0;
      if (lw < lv + 1) colByObj.set(w, lv + 1);
    }
  }
}

// ─── Routing ──────────────────────────────────────────────────

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

function routeSequenceFlow(
  f: BpmnAst["flows"][number],
  objCenter: Map<string, { x: number; y: number; w: number; h: number }>,
  objById: Map<string, BpmnFlowObject>
): BpmnLayoutFlow {
  const a = objCenter.get(f.from)!;
  const b = objCenter.get(f.to)!;
  // Choose entry/exit sides based on relative position.
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  let from = { x: a.x, y: a.y };
  let to = { x: b.x, y: b.y };

  // Exit point on source.
  if (Math.abs(dx) >= Math.abs(dy)) {
    from = { x: a.x + (dx >= 0 ? a.w / 2 : -a.w / 2), y: a.y };
    to = { x: b.x + (dx >= 0 ? -b.w / 2 : b.w / 2), y: b.y };
  } else {
    from = { x: a.x, y: a.y + (dy >= 0 ? a.h / 2 : -a.h / 2) };
    to = { x: b.x, y: b.y + (dy >= 0 ? -b.h / 2 : b.h / 2) };
  }

  // Adjust for diamond/circle shapes (use square exit for simplicity in v0.1).
  void objById;

  // Manhattan: midpoint bend on the dominant axis.
  let path: string;
  let labelAnchor: { x: number; y: number } | undefined;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const midX = (from.x + to.x) / 2;
    path =
      `M ${fmt(from.x)} ${fmt(from.y)} ` +
      `L ${fmt(midX)} ${fmt(from.y)} ` +
      `L ${fmt(midX)} ${fmt(to.y)} ` +
      `L ${fmt(to.x)} ${fmt(to.y)}`;
    labelAnchor = { x: midX, y: (from.y + to.y) / 2 - 6 };
  } else {
    const midY = (from.y + to.y) / 2;
    path =
      `M ${fmt(from.x)} ${fmt(from.y)} ` +
      `L ${fmt(from.x)} ${fmt(midY)} ` +
      `L ${fmt(to.x)} ${fmt(midY)} ` +
      `L ${fmt(to.x)} ${fmt(to.y)}`;
    labelAnchor = { x: (from.x + to.x) / 2, y: midY - 6 };
  }

  return { flow: f, path, labelAnchor };
}

function routeMessageFlow(
  f: BpmnAst["flows"][number],
  objCenter: Map<string, { x: number; y: number; w: number; h: number }>,
  poolByLabel: Map<string, BpmnLayoutPool>
): BpmnLayoutFlow {
  // Endpoint = either pool label (use pool's edge midpoint) or object center.
  const endpoint = (
    ep: string
  ): { x: number; y: number; isPool: boolean; poolY?: number; poolH?: number } => {
    if (poolByLabel.has(ep)) {
      const p = poolByLabel.get(ep)!;
      return {
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        isPool: true,
        poolY: p.y,
        poolH: p.height,
      };
    }
    const c = objCenter.get(ep)!;
    return { x: c.x, y: c.y, isPool: false };
  };
  const A = endpoint(f.from);
  const B = endpoint(f.to);

  // Strategy: route via vertical channel between the two y's, with a
  // horizontal segment at the midpoint. Sufficient for v0.1.
  const midY = (A.y + B.y) / 2;
  const path =
    `M ${fmt(A.x)} ${fmt(A.y)} ` +
    `L ${fmt(A.x)} ${fmt(midY)} ` +
    `L ${fmt(B.x)} ${fmt(midY)} ` +
    `L ${fmt(B.x)} ${fmt(B.y)}`;
  return { flow: f, path, labelAnchor: { x: (A.x + B.x) / 2, y: midY - 6 } };
}
