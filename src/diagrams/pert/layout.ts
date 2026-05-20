/**
 * PERT layout — network (layered AON) and timescaled modes.
 *
 * Rules: docs/reference/32-PERT-STANDARD.md §9
 *
 * Network mode: layered DAG. Layer = longest-path rank (each dependency edge
 * advances at least one column), barycenter ordering within a layer, critical
 * activities biased toward the top so the critical path reads as an unbroken
 * line. Edges are orthogonal with a single mid-axis bend.
 *
 * Timescaled mode: x ∝ ES, width ∝ duration; activities are greedily packed
 * into lanes; a unit time axis is drawn beneath the chart.
 */

import type {
  PertAst,
  PertAxisTick,
  PertBox,
  PertComputed,
  PertDepType,
  PertEdge,
  PertLane,
  PertLayoutResult,
  PertScheduleResult,
  PertSentinel,
  PertTask,
  PertUnit,
} from "./types";
import { schedulePert } from "./scheduler";
import { layoutAoa } from "./aoa";

export const PERT_CONST = {
  BOX_W: 180,
  BOX_H: 90,
  MS_W: 90,
  H_GAP: 66,
  V_GAP: 34,
  PAD: 24,
  TITLE_H: 40,
  FOOTER_H: 34,
  SENT_R: 14,
  // timescaled
  TS_BOX_H: 54,
  TS_LANE_GAP: 42,
  TS_MIN_W: 88,
  TS_MS_W: 30,
  TS_GAP: 26,
  AXIS_H: 46,
  // swimlane
  LANE_LABEL_W: 132,
  LANE_PAD: 18,
} as const;

function unitSuffix(unit: PertUnit): string {
  switch (unit) {
    case "days":
      return "d";
    case "weeks":
      return "w";
    case "hours":
      return "h";
    default:
      return "";
  }
}

function fmt(n: number): string {
  return String(parseFloat(n.toFixed(2)));
}

function edgeLabel(type: PertDepType, lag: number, unit: PertUnit): string | null {
  const suf = unitSuffix(unit);
  const lagPart = lag === 0 ? "" : `${lag > 0 ? "+" : ""}${fmt(lag)}${suf}`;
  if (type === "FS") return lag === 0 ? null : `FS${lagPart}`;
  return `${type}${lagPart}`;
}

// ─── Network rank assignment (longest path by edges) ─────────────

function assignRanks(ast: PertAst): { rank: Map<string, number>; maxRank: number } {
  const byId = new Map<string, PertTask>();
  for (const t of ast.tasks) byId.set(t.id, t);
  const rank = new Map<string, number>();
  const visiting = new Set<string>();
  const compute = (id: string): number => {
    const cached = rank.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0; // cycle guard (scheduler already validated)
    visiting.add(id);
    const t = byId.get(id)!;
    let r = 0;
    for (const dep of t.deps) r = Math.max(r, compute(dep.pred) + 1);
    visiting.delete(id);
    rank.set(id, r);
    return r;
  };
  let maxRank = 0;
  for (const t of ast.tasks) maxRank = Math.max(maxRank, compute(t.id));
  return { rank, maxRank };
}

// ─── Within-layer ordering (barycenter + critical-first) ─────────

function orderLayers(
  ast: PertAst,
  schedule: PertScheduleResult,
  rank: Map<string, number>,
  maxRank: number,
): string[][] {
  const declIndex = new Map<string, number>();
  ast.tasks.forEach((t, i) => declIndex.set(t.id, i));
  const succ = new Map<string, string[]>();
  const pred = new Map<string, string[]>();
  for (const t of ast.tasks) {
    succ.set(t.id, []);
    pred.set(t.id, []);
  }
  for (const t of ast.tasks) {
    for (const dep of t.deps) {
      succ.get(dep.pred)!.push(t.id);
      pred.get(t.id)!.push(dep.pred);
    }
  }

  const layers: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const t of ast.tasks) layers[rank.get(t.id)!].push(t.id);

  const crit = (id: string): boolean => schedule.computed.get(id)!.critical;
  const es = (id: string): number => schedule.computed.get(id)!.es;
  // Initial order: critical first (by ES), then the rest by declaration order.
  for (const layer of layers) {
    layer.sort((a, b) => {
      const ca = crit(a) ? 0 : 1;
      const cb = crit(b) ? 0 : 1;
      if (ca !== cb) return ca - cb;
      if (ca === 0 && es(a) !== es(b)) return es(a) - es(b);
      return declIndex.get(a)! - declIndex.get(b)!;
    });
  }

  const pos = new Map<string, number>();
  const refreshPos = (): void => {
    for (const layer of layers) layer.forEach((id, i) => pos.set(id, i));
  };
  refreshPos();

  const barycenter = (id: string, neighbors: string[]): number => {
    if (neighbors.length === 0) return pos.get(id)!;
    let s = 0;
    for (const n of neighbors) s += pos.get(n)!;
    return s / neighbors.length;
  };

  for (let iter = 0; iter < 4; iter++) {
    // forward (use predecessors)
    for (let r = 1; r <= maxRank; r++) {
      layers[r] = stableSortByKey(layers[r], (id) => {
        const bc = barycenter(id, pred.get(id)!);
        return crit(id) ? bc - 0.4 : bc;
      });
      refreshPos();
    }
    // backward (use successors)
    for (let r = maxRank - 1; r >= 0; r--) {
      layers[r] = stableSortByKey(layers[r], (id) => {
        const bc = barycenter(id, succ.get(id)!);
        return crit(id) ? bc - 0.4 : bc;
      });
      refreshPos();
    }
  }

  return layers;
}

function stableSortByKey(arr: string[], key: (id: string) => number): string[] {
  return arr
    .map((id, i) => ({ id, i, k: key(id) }))
    .sort((a, b) => (a.k !== b.k ? a.k - b.k : a.i - b.i))
    .map((x) => x.id);
}

// ─── Edge routing helpers ────────────────────────────────────────

function routeEdge(
  s: PertBox,
  t: PertBox,
  direction: "LR" | "TB",
): { d: string; labelX: number; labelY: number } {
  if (direction === "TB") {
    const sx = s.x + s.width / 2;
    const sy = s.y + s.height;
    const tx = t.x + t.width / 2;
    const ty = t.y;
    const mid = (sy + ty) / 2;
    const d = `M ${sx} ${sy} L ${sx} ${mid} L ${tx} ${mid} L ${tx} ${ty}`;
    return { d, labelX: (sx + tx) / 2, labelY: mid };
  }
  const sx = s.x + s.width;
  const sy = s.y + s.height / 2;
  const tx = t.x;
  const ty = t.y + t.height / 2;
  const mid = (sx + tx) / 2;
  const d = `M ${sx} ${sy} L ${mid} ${sy} L ${mid} ${ty} L ${tx} ${ty}`;
  return { d, labelX: mid, labelY: (sy + ty) / 2 };
}

// ─── Network layout ──────────────────────────────────────────────

function layoutNetwork(ast: PertAst, schedule: PertScheduleResult): PertLayoutResult {
  const C = PERT_CONST;
  const { rank, maxRank } = assignRanks(ast);
  const layers = orderLayers(ast, schedule, rank, maxRank);
  const dir = ast.direction;

  const byId = new Map<string, PertTask>();
  for (const t of ast.tasks) byId.set(t.id, t);

  // Column heights (cross-axis extent of each layer).
  const colExtent = layers.map((layer) => {
    const n = layer.length;
    if (n === 0) return 0;
    const unit = dir === "TB" ? C.BOX_W : C.BOX_H;
    const gap = dir === "TB" ? C.H_GAP : C.V_GAP;
    return n * unit + (n - 1) * gap;
  });
  const maxExtent = Math.max(0, ...colExtent);

  const hasSentinels = ast.showSentinels;
  const sentLead = hasSentinels ? C.SENT_R * 2 + C.H_GAP : 0;

  const titleH = ast.title ? C.TITLE_H : 0;
  // Title sits at the top (y). For LR the cross axis is y; for TB the primary
  // (rank) axis is y — so the title offset lands on a different axis each way.
  const originPrimary = dir === "TB" ? C.PAD + titleH + sentLead : C.PAD + sentLead;
  const originCross = dir === "TB" ? C.PAD : C.PAD + titleH;

  const boxes: PertBox[] = [];
  const boxById = new Map<string, PertBox>();

  for (let r = 0; r <= maxRank; r++) {
    const layer = layers[r];
    const extent = colExtent[r];
    const crossStart = originCross + (maxExtent - extent) / 2;
    let cursor = crossStart;
    for (const id of layer) {
      const t = byId.get(id)!;
      const computed = schedule.computed.get(id)!;
      const w = t.milestone ? C.MS_W : C.BOX_W;
      const h = C.BOX_H;
      let x: number;
      let y: number;
      if (dir === "TB") {
        // rank axis = y, cross axis = x
        const rankPos = originPrimary + r * (C.BOX_H + C.H_GAP);
        x = cursor + (C.BOX_W - w) / 2;
        y = rankPos;
        cursor += C.BOX_W + C.H_GAP;
      } else {
        const rankPos = originPrimary + r * (C.BOX_W + C.H_GAP);
        x = rankPos + (C.BOX_W - w) / 2;
        y = cursor;
        cursor += C.BOX_H + C.V_GAP;
      }
      const box: PertBox = {
        id,
        task: t,
        computed,
        x,
        y,
        width: w,
        height: h,
        milestone: t.milestone,
        rank: r,
      };
      boxes.push(box);
      boxById.set(id, box);
    }
  }

  // Edges (real dependencies).
  const edges: PertEdge[] = [];
  for (const t of ast.tasks) {
    for (const dep of t.deps) {
      const s = boxById.get(dep.pred);
      const tg = boxById.get(t.id);
      if (!s || !tg) continue;
      const critical =
        schedule.computed.get(dep.pred)!.critical && schedule.computed.get(t.id)!.critical;
      const { d, labelX, labelY } = routeEdge(s, tg, dir);
      const edge: PertEdge = {
        from: dep.pred,
        to: t.id,
        type: dep.type,
        lag: dep.lag,
        d,
        critical,
      };
      const lbl = edgeLabel(dep.type, dep.lag, ast.unit);
      if (lbl) edge.label = { text: lbl, x: labelX, y: labelY };
      edges.push(edge);
    }
  }

  // Bounds.
  let maxPrimary = 0;
  let maxCross = 0;
  for (const b of boxes) {
    maxPrimary = Math.max(maxPrimary, dir === "TB" ? b.y + b.height : b.x + b.width);
    maxCross = Math.max(maxCross, dir === "TB" ? b.x + b.width : b.y + b.height);
  }

  // Sentinels.
  const sentinels: PertSentinel[] = [];
  if (hasSentinels) {
    const contentMidCross = originCross + maxExtent / 2;
    const startPrimary = C.PAD + C.SENT_R;
    const finishPrimary = maxPrimary + C.H_GAP + C.SENT_R;
    const place = (primary: number): { cx: number; cy: number } =>
      dir === "TB" ? { cx: contentMidCross, cy: primary } : { cx: primary, cy: contentMidCross };
    sentinels.push({ id: "__start__", label: "Start", r: C.SENT_R, ...place(startPrimary) });
    sentinels.push({ id: "__finish__", label: "Finish", r: C.SENT_R, ...place(finishPrimary) });

    // sentinel edges
    const usedAsPred = new Set<string>();
    for (const t of ast.tasks) for (const dep of t.deps) usedAsPred.add(dep.pred);
    const startSent = sentinels[0];
    const finishSent = sentinels[1];
    for (const t of ast.tasks) {
      const b = boxById.get(t.id)!;
      if (t.deps.length === 0) {
        edges.push(sentinelEdge(startSent, b, dir, true, schedule.computed.get(t.id)!));
      }
      if (!usedAsPred.has(t.id)) {
        edges.push(sentinelEdge(finishSent, b, dir, false, schedule.computed.get(t.id)!));
      }
    }
    maxPrimary = finishPrimary + C.SENT_R;
  }

  const crossEnd = Math.max(maxCross, originCross + maxExtent);
  let width: number;
  let footerY: number;
  if (dir === "TB") {
    width = crossEnd + C.PAD;
    footerY = maxPrimary + 14;
  } else {
    width = maxPrimary + C.PAD;
    footerY = crossEnd + 14;
  }
  const height = footerY + C.FOOTER_H;

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
    title: ast.title,
    direction: dir,
    mode: "network",
    unit: ast.unit,
    boxes,
    edges,
    sentinels,
    summary: buildSummary(ast, schedule),
    warnings: ast.warnings,
    ast,
  };
}

function sentinelEdge(
  sent: PertSentinel,
  b: PertBox,
  dir: "LR" | "TB",
  fromStart: boolean,
  computed: PertComputed,
): PertEdge {
  let sx: number;
  let sy: number;
  let tx: number;
  let ty: number;
  if (dir === "TB") {
    if (fromStart) {
      sx = sent.cx;
      sy = sent.cy + sent.r;
      tx = b.x + b.width / 2;
      ty = b.y;
    } else {
      sx = b.x + b.width / 2;
      sy = b.y + b.height;
      tx = sent.cx;
      ty = sent.cy - sent.r;
    }
    const mid = (sy + ty) / 2;
    return mkSentinelEdge(sent, b, fromStart, `M ${sx} ${sy} L ${sx} ${mid} L ${tx} ${mid} L ${tx} ${ty}`, computed);
  }
  if (fromStart) {
    sx = sent.cx + sent.r;
    sy = sent.cy;
    tx = b.x;
    ty = b.y + b.height / 2;
  } else {
    sx = b.x + b.width;
    sy = b.y + b.height / 2;
    tx = sent.cx - sent.r;
    ty = sent.cy;
  }
  const mid = (sx + tx) / 2;
  return mkSentinelEdge(sent, b, fromStart, `M ${sx} ${sy} L ${mid} ${sy} L ${mid} ${ty} L ${tx} ${ty}`, computed);
}

function mkSentinelEdge(
  sent: PertSentinel,
  b: PertBox,
  fromStart: boolean,
  d: string,
  computed: PertComputed,
): PertEdge {
  return {
    from: fromStart ? sent.id : b.id,
    to: fromStart ? b.id : sent.id,
    type: "FS",
    lag: 0,
    d,
    critical: computed.critical,
  };
}

// ─── Swimlane layout (AON grouped into lanes) ────────────────────

function buildDependencyEdges(
  ast: PertAst,
  schedule: PertScheduleResult,
  boxById: Map<string, PertBox>,
  dir: "LR" | "TB",
): PertEdge[] {
  const edges: PertEdge[] = [];
  for (const t of ast.tasks) {
    for (const dep of t.deps) {
      const s = boxById.get(dep.pred);
      const tg = boxById.get(t.id);
      if (!s || !tg) continue;
      const critical =
        schedule.computed.get(dep.pred)!.critical && schedule.computed.get(t.id)!.critical;
      const { d, labelX, labelY } = routeEdge(s, tg, dir);
      const edge: PertEdge = { from: dep.pred, to: t.id, type: dep.type, lag: dep.lag, d, critical };
      const lbl = edgeLabel(dep.type, dep.lag, ast.unit);
      if (lbl) edge.label = { text: lbl, x: labelX, y: labelY };
      edges.push(edge);
    }
  }
  return edges;
}

function layoutSwimlane(ast: PertAst, schedule: PertScheduleResult): PertLayoutResult {
  const C = PERT_CONST;
  const { rank, maxRank } = assignRanks(ast);
  const byId = new Map<string, PertTask>();
  for (const t of ast.tasks) byId.set(t.id, t);

  const laneOrder: string[] = [];
  const laneOf = new Map<string, string>();
  for (const t of ast.tasks) {
    const ln = t.lane ?? "";
    laneOf.set(t.id, ln);
    if (!laneOrder.includes(ln)) laneOrder.push(ln);
  }

  const declIndex = new Map<string, number>();
  ast.tasks.forEach((t, i) => declIndex.set(t.id, i));
  const crit = (id: string): boolean => schedule.computed.get(id)!.critical;
  const es = (id: string): number => schedule.computed.get(id)!.es;

  // Group tasks by (lane, rank) cell.
  const cell = new Map<string, string[]>();
  const key = (lane: string, r: number): string => `${lane} ${r}`;
  for (const t of ast.tasks) {
    const k = key(laneOf.get(t.id)!, rank.get(t.id)!);
    if (!cell.has(k)) cell.set(k, []);
    cell.get(k)!.push(t.id);
  }
  for (const arr of cell.values()) {
    arr.sort((a, b) => {
      const ca = crit(a) ? 0 : 1;
      const cb = crit(b) ? 0 : 1;
      if (ca !== cb) return ca - cb;
      if (es(a) !== es(b)) return es(a) - es(b);
      return declIndex.get(a)! - declIndex.get(b)!;
    });
  }

  const titleH = ast.title ? C.TITLE_H : 0;
  const topY = C.PAD + titleH;
  const colX = (r: number): number => C.LANE_LABEL_W + C.PAD + r * (C.BOX_W + C.H_GAP);

  // Lane bands.
  const lanes: PertLane[] = [];
  const laneY = new Map<string, number>();
  const laneH = new Map<string, number>();
  let cursor = topY;
  laneOrder.forEach((lane, i) => {
    let stack = 1;
    for (let r = 0; r <= maxRank; r++) {
      const arr = cell.get(key(lane, r));
      if (arr) stack = Math.max(stack, arr.length);
    }
    const bandH = stack * C.BOX_H + (stack - 1) * C.V_GAP + 2 * C.LANE_PAD;
    laneY.set(lane, cursor);
    laneH.set(lane, bandH);
    lanes.push({ name: lane, y: cursor, height: bandH, alt: i % 2 === 1 });
    cursor += bandH;
  });
  const contentBottom = cursor;

  // Place boxes — each column centred within its lane band.
  const boxes: PertBox[] = [];
  const boxById = new Map<string, PertBox>();
  for (const lane of laneOrder) {
    const bandTop = laneY.get(lane)!;
    const bandH = laneH.get(lane)!;
    for (let r = 0; r <= maxRank; r++) {
      const arr = cell.get(key(lane, r));
      if (!arr) continue;
      const colInnerH = arr.length * C.BOX_H + (arr.length - 1) * C.V_GAP;
      const y0 = bandTop + (bandH - colInnerH) / 2;
      arr.forEach((id, idx) => {
        const t = byId.get(id)!;
        const w = t.milestone ? C.MS_W : C.BOX_W;
        const x = colX(r) + (C.BOX_W - w) / 2;
        const y = y0 + idx * (C.BOX_H + C.V_GAP);
        const box: PertBox = {
          id,
          task: t,
          computed: schedule.computed.get(id)!,
          x,
          y,
          width: w,
          height: C.BOX_H,
          milestone: t.milestone,
          rank: r,
        };
        boxes.push(box);
        boxById.set(id, box);
      });
    }
  }

  const edges = buildDependencyEdges(ast, schedule, boxById, "LR");
  const width = colX(maxRank) + C.BOX_W + C.PAD;
  const footerY = contentBottom + 14;
  const height = footerY + C.FOOTER_H;

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
    title: ast.title,
    direction: "LR",
    mode: "network",
    unit: ast.unit,
    boxes,
    edges,
    sentinels: [],
    lanes,
    summary: buildSummary(ast, schedule),
    warnings: ast.warnings,
    ast,
  };
}

// ─── Timescaled layout ───────────────────────────────────────────

function layoutTimescaled(ast: PertAst, schedule: PertScheduleResult): PertLayoutResult {
  const C = PERT_CONST;
  const T = schedule.projectDuration || 1;
  // Spread the time axis out generously so boxes breathe.
  const pxPerUnit = Math.min(56, Math.max(16, 1300 / T));
  const titleH = ast.title ? C.TITLE_H : 0;
  const leftPad = C.PAD;
  const topPad = C.PAD + titleH + 14; // extra room for task labels above the bars

  // Build interval boxes ordered by ES.
  interface Interval {
    id: string;
    x: number;
    w: number;
  }
  const intervals: Interval[] = ast.tasks.map((t) => {
    const c = schedule.computed.get(t.id)!;
    if (t.milestone) {
      const cx = leftPad + c.es * pxPerUnit;
      return { id: t.id, x: cx - C.TS_MS_W / 2, w: C.TS_MS_W };
    }
    const x = leftPad + c.es * pxPerUnit;
    const w = Math.max(C.TS_MIN_W, t.duration * pxPerUnit);
    return { id: t.id, x, w };
  });
  intervals.sort((a, b) => a.x - b.x || a.w - b.w);

  // Greedy lane packing.
  const laneRight: number[] = [];
  const laneOf = new Map<string, number>();
  for (const iv of intervals) {
    let placed = -1;
    for (let l = 0; l < laneRight.length; l++) {
      if (iv.x >= laneRight[l] + C.TS_GAP) {
        placed = l;
        break;
      }
    }
    if (placed === -1) {
      placed = laneRight.length;
      laneRight.push(0);
    }
    laneRight[placed] = iv.x + iv.w;
    laneOf.set(iv.id, placed);
  }
  const laneCount = Math.max(1, laneRight.length);

  const byId = new Map<string, PertTask>();
  for (const t of ast.tasks) byId.set(t.id, t);
  const intervalById = new Map<string, Interval>();
  for (const iv of intervals) intervalById.set(iv.id, iv);

  const boxes: PertBox[] = [];
  const boxById = new Map<string, PertBox>();
  for (const t of ast.tasks) {
    const iv = intervalById.get(t.id)!;
    const lane = laneOf.get(t.id)!;
    const y = topPad + lane * (C.TS_BOX_H + C.TS_LANE_GAP);
    const box: PertBox = {
      id: t.id,
      task: t,
      computed: schedule.computed.get(t.id)!,
      x: iv.x,
      y,
      width: iv.w,
      height: C.TS_BOX_H,
      milestone: t.milestone,
      rank: 0,
    };
    boxes.push(box);
    boxById.set(t.id, box);
  }

  const edges: PertEdge[] = [];
  for (const t of ast.tasks) {
    for (const dep of t.deps) {
      const s = boxById.get(dep.pred);
      const tg = boxById.get(t.id);
      if (!s || !tg) continue;
      const critical =
        schedule.computed.get(dep.pred)!.critical && schedule.computed.get(t.id)!.critical;
      const { d, labelX, labelY } = routeEdge(s, tg, "LR");
      const edge: PertEdge = {
        from: dep.pred,
        to: t.id,
        type: dep.type,
        lag: dep.lag,
        d,
        critical,
      };
      const lbl = edgeLabel(dep.type, dep.lag, ast.unit);
      if (lbl) edge.label = { text: lbl, x: labelX, y: labelY };
      edges.push(edge);
    }
  }

  const contentBottom = topPad + laneCount * C.TS_BOX_H + (laneCount - 1) * C.TS_LANE_GAP;
  const axisBaseline = contentBottom + 22;
  const timeEnd = leftPad + T * pxPerUnit;
  let maxRight = timeEnd;
  for (const b of boxes) maxRight = Math.max(maxRight, b.x + b.width);

  // Axis ticks.
  const majorStep = chooseStep(T);
  const minorEvery = pxPerUnit >= 9 ? 1 : majorStep;
  const ticks: PertAxisTick[] = [];
  for (let v = 0; v <= T + 1e-9; v += minorEvery) {
    const rounded = Math.round(v * 1e4) / 1e4;
    ticks.push({
      pos: leftPad + rounded * pxPerUnit,
      value: rounded,
      major: Math.abs(rounded % majorStep) < 1e-9,
    });
  }

  const width = Math.ceil(Math.max(maxRight, timeEnd) + C.PAD);
  const height = Math.ceil(axisBaseline + C.AXIS_H + C.FOOTER_H);

  return {
    width,
    height,
    title: ast.title,
    direction: "LR",
    mode: "timescaled",
    unit: ast.unit,
    boxes,
    edges,
    sentinels: [],
    axis: { ticks, baseline: axisBaseline, start: leftPad, end: timeEnd },
    summary: buildSummary(ast, schedule),
    warnings: ast.warnings,
    ast,
  };
}

function chooseStep(T: number): number {
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
  for (const c of candidates) {
    if (T / c <= 16) return c;
  }
  return 1000;
}

function buildSummary(ast: PertAst, schedule: PertScheduleResult): PertLayoutResult["summary"] {
  const summary: PertLayoutResult["summary"] = {
    projectDuration: schedule.projectDuration,
    taskCount: ast.tasks.length,
    depCount: schedule.depCount,
    criticalCount: schedule.criticalCount,
    unit: ast.unit,
    criticalPath: schedule.criticalPath,
  };
  if (schedule.projectStdDev !== undefined) summary.projectStdDev = schedule.projectStdDev;
  return summary;
}

// ─── Entry point ─────────────────────────────────────────────────

export function layoutPert(ast: PertAst, schedule?: PertScheduleResult): PertLayoutResult {
  const sched = schedule ?? schedulePert(ast);
  if (ast.layout === "aoa") return layoutAoa(ast, sched);
  if (ast.layout === "timescaled") return layoutTimescaled(ast, sched);
  // Swimlanes kick in automatically when any task declares a `lane:`.
  if (ast.tasks.some((t) => t.lane)) return layoutSwimlane(ast, sched);
  return layoutNetwork(ast, sched);
}
