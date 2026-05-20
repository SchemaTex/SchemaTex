/**
 * Activity-on-Arrow (AOA / ADM) layout.
 *
 * Spec: docs/reference/32-PERT-STANDARD.md §4.2 (legacy notation, opt-in).
 *
 * AOA draws *events* (milestones) as numbered circles and *activities* as
 * arrows between them. Schematex builds the AOA graph from the same AON model
 * by event-merging: every activity gets its own head event; activities with
 * ≥2 predecessors converge through a merge event fed by dotted **dummy**
 * activities. This construction is correct (it never shares an activity head,
 * so no false dependencies) though not guaranteed minimal-dummy.
 *
 * AOA can only express finish-to-start logic — SS/FF/SF and lag/lead are
 * flattened to FS with a warning.
 */

import type {
  AoaArc,
  AoaEvent,
  PertAst,
  PertLayoutResult,
  PertScheduleResult,
} from "./types";
import { schedulePert } from "./scheduler";

const AOA = {
  R: 19,
  COL: 158,
  VGAP: 86,
  PAD: 30,
  TITLE_H: 40,
  FOOTER_H: 34,
} as const;

interface RawArc {
  from: number; // internal event index
  to: number;
  taskId?: string;
  label?: string;
  duration: number;
  dummy: boolean;
}

export function layoutAoa(ast: PertAst, schedule?: PertScheduleResult): PertLayoutResult {
  const sched = schedule ?? schedulePert(ast);

  // ── Build the event graph ──
  let nEvents = 0;
  const newEvent = (): number => nEvents++;
  const START = newEvent();
  const head = new Map<string, number>();
  for (const t of ast.tasks) head.set(t.id, newEvent());

  const arcs: RawArc[] = [];
  const mergeCache = new Map<string, number>();
  let nonFs = false;

  for (const t of ast.tasks) {
    const preds = t.deps.map((d) => d.pred);
    for (const d of t.deps) if (d.type !== "FS" || d.lag !== 0) nonFs = true;
    let tail: number;
    if (preds.length === 0) {
      tail = START;
    } else if (preds.length === 1) {
      tail = head.get(preds[0])!;
    } else {
      const key = [...preds].sort().join("");
      const cached = mergeCache.get(key);
      if (cached !== undefined) {
        tail = cached;
      } else {
        const m = newEvent();
        for (const p of preds) arcs.push({ from: head.get(p)!, to: m, duration: 0, dummy: true });
        mergeCache.set(key, m);
        tail = m;
      }
    }
    arcs.push({
      from: tail,
      to: head.get(t.id)!,
      taskId: t.id,
      label: t.label,
      duration: t.duration,
      dummy: false,
    });
  }

  if (nonFs) {
    ast.warnings.push(
      "Activity-on-arrow (AOA) expresses finish-to-start logic only; SS/FF/SF and lag/lead were flattened to FS.",
    );
  }

  // ── Single sink (END) ──
  const hasOut = new Set<number>();
  for (const a of arcs) hasOut.add(a.from);
  const sinks: number[] = [];
  for (let e = 0; e < nEvents; e++) if (!hasOut.has(e)) sinks.push(e);
  if (sinks.length > 1) {
    const END = newEvent();
    for (const s of sinks) arcs.push({ from: s, to: END, duration: 0, dummy: true });
  }

  // ── Rank events by longest path (edge count) ──
  const outAdj: number[][] = Array.from({ length: nEvents }, () => []);
  const inAdj: number[][] = Array.from({ length: nEvents }, () => []);
  arcs.forEach((a, i) => {
    outAdj[a.from].push(i);
    inAdj[a.to].push(i);
  });
  const indeg = new Array(nEvents).fill(0);
  for (const a of arcs) indeg[a.to]++;
  const queue: number[] = [];
  for (let e = 0; e < nEvents; e++) if (indeg[e] === 0) queue.push(e);
  const topo: number[] = [];
  const rank = new Array(nEvents).fill(0);
  const q = [...queue];
  while (q.length) {
    const e = q.shift()!;
    topo.push(e);
    for (const ai of outAdj[e]) {
      const to = arcs[ai].to;
      rank[to] = Math.max(rank[to], rank[e] + 1);
      if (--indeg[to] === 0) q.push(to);
    }
  }

  // ── Event times (forward / backward pass on the event graph) ──
  const te = new Array(nEvents).fill(0);
  for (const e of topo) {
    for (const ai of inAdj[e]) {
      const a = arcs[ai];
      te[e] = Math.max(te[e], te[a.from] + a.duration);
    }
  }
  const T = Math.max(0, ...te);
  const tl = new Array(nEvents).fill(T);
  for (let i = topo.length - 1; i >= 0; i--) {
    const e = topo[i];
    if (outAdj[e].length === 0) {
      tl[e] = te[e];
    } else {
      let m = Infinity;
      for (const ai of outAdj[e]) {
        const a = arcs[ai];
        m = Math.min(m, tl[a.to] - a.duration);
      }
      tl[e] = m;
    }
  }
  const tol = ast.criticalTolerance + 1e-9;
  const eventCritical = (e: number): boolean => Math.abs(tl[e] - te[e]) <= tol;

  // ── Order within rank (barycenter) + coordinates ──
  const maxRank = Math.max(0, ...rank);
  const layers: number[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (let e = 0; e < nEvents; e++) layers[rank[e]].push(e);
  const pos = new Array(nEvents).fill(0);
  layers.forEach((layer) => layer.forEach((e, i) => (pos[e] = i)));
  const predEvents = (e: number): number[] => inAdj[e].map((ai) => arcs[ai].from);
  const succEvents = (e: number): number[] => outAdj[e].map((ai) => arcs[ai].to);
  for (let iter = 0; iter < 4; iter++) {
    for (let r = 1; r <= maxRank; r++) {
      layers[r] = sortByBary(layers[r], predEvents, pos);
      refresh(layers, pos);
    }
    for (let r = maxRank - 1; r >= 0; r--) {
      layers[r] = sortByBary(layers[r], succEvents, pos);
      refresh(layers, pos);
    }
  }

  const titleH = ast.title ? AOA.TITLE_H : 0;
  const topY = AOA.PAD + titleH;
  const maxRows = Math.max(1, ...layers.map((l) => l.length));
  const contentH = (maxRows - 1) * AOA.VGAP + 2 * AOA.R;

  const cx = new Array(nEvents).fill(0);
  const cy = new Array(nEvents).fill(0);
  for (let r = 0; r <= maxRank; r++) {
    const layer = layers[r];
    const colH = (layer.length - 1) * AOA.VGAP;
    const y0 = topY + AOA.R + (contentH - 2 * AOA.R - colH) / 2;
    layer.forEach((e, i) => {
      cx[e] = AOA.PAD + AOA.R + r * AOA.COL;
      cy[e] = y0 + i * AOA.VGAP;
    });
  }

  // ── Display numbering: ascending by (rank, y) so tail id < head id ──
  const ordered = [...Array(nEvents).keys()].sort((a, b) => rank[a] - rank[b] || cy[a] - cy[b]);
  const displayId = new Array(nEvents).fill(0);
  ordered.forEach((e, i) => (displayId[e] = i + 1));

  const events: AoaEvent[] = ordered.map((e) => ({
    id: displayId[e],
    x: cx[e],
    y: cy[e],
    r: AOA.R,
    te: round(te[e]),
    tl: round(tl[e]),
    critical: eventCritical(e),
  }));

  const outArcs: AoaArc[] = arcs.map((a) => {
    const critical = a.dummy
      ? eventCritical(a.from) && eventCritical(a.to) && Math.abs(te[a.to] - te[a.from] - a.duration) <= tol
      : sched.computed.get(a.taskId!)!.critical;
    const geo = arcGeometry(cx[a.from], cy[a.from], cx[a.to], cy[a.to], AOA.R);
    const arc: AoaArc = {
      from: displayId[a.from],
      to: displayId[a.to],
      dummy: a.dummy,
      critical,
      d: geo.d,
      labelX: geo.mx,
      labelY: geo.my,
    };
    if (a.taskId !== undefined) arc.taskId = a.taskId;
    if (a.label !== undefined) arc.label = a.label;
    if (!a.dummy) arc.duration = a.duration;
    return arc;
  });

  const width = AOA.PAD + AOA.R + maxRank * AOA.COL + AOA.R + AOA.PAD;
  const footerY = topY + contentH + 14;
  const height = footerY + AOA.FOOTER_H;

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
    title: ast.title,
    direction: "LR",
    mode: "aoa",
    unit: ast.unit,
    boxes: [],
    edges: [],
    sentinels: [],
    aoa: { events, arcs: outArcs },
    summary: buildAoaSummary(ast, sched),
    warnings: ast.warnings,
    ast,
  };
}

function refresh(layers: number[][], pos: number[]): void {
  layers.forEach((layer) => layer.forEach((e, i) => (pos[e] = i)));
}

function sortByBary(layer: number[], neighbors: (e: number) => number[], pos: number[]): number[] {
  return layer
    .map((e, i) => {
      const ns = neighbors(e);
      const bary = ns.length ? ns.reduce((s, n) => s + pos[n], 0) / ns.length : pos[e];
      return { e, i, bary };
    })
    .sort((a, b) => (a.bary !== b.bary ? a.bary - b.bary : a.i - b.i))
    .map((x) => x.e);
}

function arcGeometry(
  tx: number,
  ty: number,
  hx: number,
  hy: number,
  r: number,
): { d: string; mx: number; my: number } {
  const dx = hx - tx;
  const dy = hy - ty;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const sx = tx + ux * r;
  const sy = ty + uy * r;
  const ex = hx - ux * r;
  const ey = hy - uy * r;
  return { d: `M ${round(sx)} ${round(sy)} L ${round(ex)} ${round(ey)}`, mx: (sx + ex) / 2, my: (sy + ey) / 2 };
}

function buildAoaSummary(ast: PertAst, sched: PertScheduleResult): PertLayoutResult["summary"] {
  const summary: PertLayoutResult["summary"] = {
    projectDuration: sched.projectDuration,
    taskCount: ast.tasks.length,
    depCount: sched.depCount,
    criticalCount: sched.criticalCount,
    unit: ast.unit,
    criticalPath: sched.criticalPath,
  };
  if (sched.projectStdDev !== undefined) summary.projectStdDev = sched.projectStdDev;
  return summary;
}

function round(n: number): number {
  return Math.round(n * 1e3) / 1e3;
}
