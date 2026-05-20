/**
 * PERT / CPM scheduler — the unique value of this engine.
 *
 * Algorithm: docs/reference/32-PERT-STANDARD.md §5
 *   - topological sort (with cycle detection)
 *   - forward pass  → ES / EF
 *   - backward pass → LS / LF
 *   - total slack + critical path
 *   - three-point project variance
 *
 * Synthetic `__start__` / `__finish__` sentinels give the passes a unique
 * source and sink so terminal/initial activities need no special-casing.
 */

import type {
  PertAst,
  PertComputed,
  PertDepType,
  PertScheduleResult,
} from "./types";

export const START = "__start__";
export const FINISH = "__finish__";

export class PertScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PertScheduleError";
  }
}

interface Edge {
  from: string;
  to: string;
  type: PertDepType;
  lag: number;
}

interface Graph {
  nodes: string[];
  duration: Map<string, number>;
  incoming: Map<string, Edge[]>;
  outgoing: Map<string, Edge[]>;
  edges: Edge[];
}

function buildGraph(ast: PertAst): Graph {
  const duration = new Map<string, number>();
  const incoming = new Map<string, Edge[]>();
  const outgoing = new Map<string, Edge[]>();
  const nodes: string[] = [START, FINISH];
  duration.set(START, 0);
  duration.set(FINISH, 0);
  for (const id of [START, FINISH]) {
    incoming.set(id, []);
    outgoing.set(id, []);
  }
  for (const t of ast.tasks) {
    nodes.push(t.id);
    duration.set(t.id, t.duration);
    incoming.set(t.id, []);
    outgoing.set(t.id, []);
  }

  const edges: Edge[] = [];
  const addEdge = (e: Edge): void => {
    edges.push(e);
    outgoing.get(e.from)!.push(e);
    incoming.get(e.to)!.push(e);
  };

  // Real dependencies + synthetic start edges for source activities.
  const usedAsPred = new Set<string>();
  for (const t of ast.tasks) {
    if (t.deps.length === 0) {
      addEdge({ from: START, to: t.id, type: "FS", lag: 0 });
    } else {
      for (const dep of t.deps) {
        addEdge({ from: dep.pred, to: t.id, type: dep.type, lag: dep.lag });
        usedAsPred.add(dep.pred);
      }
    }
  }
  // Terminal activities (never used as a predecessor) feed the finish sentinel.
  for (const t of ast.tasks) {
    if (!usedAsPred.has(t.id)) {
      addEdge({ from: t.id, to: FINISH, type: "FS", lag: 0 });
    }
  }

  return { nodes, duration, incoming, outgoing, edges };
}

function topoSort(g: Graph): string[] {
  const indeg = new Map<string, number>();
  for (const n of g.nodes) indeg.set(n, 0);
  for (const e of g.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);

  const queue: string[] = [];
  for (const n of g.nodes) if ((indeg.get(n) ?? 0) === 0) queue.push(n);

  const order: string[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const e of g.outgoing.get(n)!) {
      const d = (indeg.get(e.to) ?? 0) - 1;
      indeg.set(e.to, d);
      if (d === 0) queue.push(e.to);
    }
  }

  if (order.length !== g.nodes.length) {
    const stuck = g.nodes.filter((n) => (indeg.get(n) ?? 0) > 0 && n !== START && n !== FINISH);
    throw new PertScheduleError(
      `dependency cycle detected involving: ${stuck.join(" → ")}. PERT networks must be acyclic.`,
    );
  }
  return order;
}

export function schedulePert(ast: PertAst): PertScheduleResult {
  const g = buildGraph(ast);
  const order = topoSort(g);

  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();

  // ─── Forward pass ───
  es.set(START, 0);
  ef.set(START, 0);
  for (const v of order) {
    if (v === START) continue;
    const d = g.duration.get(v)!;
    const inc = g.incoming.get(v)!;
    let start = 0;
    let hasConstraint = false;
    for (const e of inc) {
      let c: number;
      switch (e.type) {
        case "FS":
          c = ef.get(e.from)! + e.lag;
          break;
        case "SS":
          c = es.get(e.from)! + e.lag;
          break;
        case "FF":
          c = ef.get(e.from)! + e.lag - d;
          break;
        case "SF":
          c = es.get(e.from)! + e.lag - d;
          break;
      }
      if (!hasConstraint || c > start) {
        start = c;
        hasConstraint = true;
      }
    }
    const esv = Math.max(0, start);
    es.set(v, esv);
    ef.set(v, esv + d);
  }

  const projectDuration = ef.get(FINISH)!;

  // ─── Backward pass ───
  lf.set(FINISH, projectDuration);
  ls.set(FINISH, projectDuration);
  for (let i = order.length - 1; i >= 0; i--) {
    const v = order[i];
    if (v === FINISH) continue;
    const d = g.duration.get(v)!;
    const out = g.outgoing.get(v)!;
    let finish = projectDuration;
    let hasConstraint = false;
    for (const e of out) {
      let c: number;
      switch (e.type) {
        case "FS":
          c = ls.get(e.to)! - e.lag;
          break;
        case "SS":
          c = ls.get(e.to)! - e.lag + d;
          break;
        case "FF":
          c = lf.get(e.to)! - e.lag;
          break;
        case "SF":
          c = lf.get(e.to)! - e.lag + d;
          break;
      }
      if (!hasConstraint || c < finish) {
        finish = c;
        hasConstraint = true;
      }
    }
    lf.set(v, finish);
    ls.set(v, finish - d);
  }

  // ─── Slack + critical ───
  const tol = ast.criticalTolerance;
  const computed = new Map<string, PertComputed>();
  const realOrder = order.filter((n) => n !== START && n !== FINISH);
  let negativeSlack = false;
  for (const id of realOrder) {
    const slack = round(ls.get(id)! - es.get(id)!);
    if (slack < -1e-9) negativeSlack = true;
    computed.set(id, {
      es: round(es.get(id)!),
      ef: round(ef.get(id)!),
      ls: round(ls.get(id)!),
      lf: round(lf.get(id)!),
      slack,
      critical: slack <= tol + 1e-9,
    });
  }

  // ─── Critical-path extraction (representative chain) ───
  const criticalPath = extractCriticalPath(ast, g, computed);
  const criticalCount = realOrder.filter((id) => computed.get(id)!.critical).length;

  // ─── Three-point project variance (over critical activities) ───
  let projectVariance: number | undefined;
  let projectStdDev: number | undefined;
  const hasVariance = ast.tasks.some((t) => t.variance !== undefined);
  if (hasVariance) {
    let sum = 0;
    for (const t of ast.tasks) {
      if (t.variance !== undefined && computed.get(t.id)!.critical) sum += t.variance;
    }
    projectVariance = round(sum);
    projectStdDev = round(Math.sqrt(sum));
  }

  const depCount = ast.tasks.reduce((n, t) => n + t.deps.length, 0);

  if (negativeSlack) {
    ast.warnings.push(
      "schedule has negative slack — a lead (negative lag) pushed an activity before the project start; ES was clamped at 0.",
    );
  }

  const result: PertScheduleResult = {
    computed,
    order: realOrder,
    projectDuration: round(projectDuration),
    criticalPath,
    criticalCount,
    depCount,
  };
  if (projectVariance !== undefined) result.projectVariance = projectVariance;
  if (projectStdDev !== undefined) result.projectStdDev = projectStdDev;
  return result;
}

function extractCriticalPath(
  ast: PertAst,
  g: Graph,
  computed: Map<string, PertComputed>,
): string[] {
  const isCritical = (id: string): boolean => computed.get(id)?.critical ?? false;
  const realSucc = new Map<string, string[]>();
  const hasCriticalPred = new Map<string, boolean>();
  for (const t of ast.tasks) realSucc.set(t.id, []);
  for (const e of g.edges) {
    if (e.from === START || e.from === FINISH || e.to === START || e.to === FINISH) continue;
    realSucc.get(e.from)!.push(e.to);
    if (isCritical(e.from) && isCritical(e.to)) hasCriticalPred.set(e.to, true);
  }

  const order = ast.tasks.map((t) => t.id).filter(isCritical);
  order.sort((a, b) => computed.get(a)!.es - computed.get(b)!.es);
  const start = order.find((id) => !hasCriticalPred.get(id)) ?? order[0];
  if (!start) return [];

  const path: string[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = start;
  while (cur && !seen.has(cur)) {
    path.push(cur);
    seen.add(cur);
    const cands: string[] = (realSucc.get(cur) ?? []).filter(isCritical);
    if (cands.length === 0) break;
    // Prefer the binding successor (whose ES equals this activity's EF).
    const ef = computed.get(cur)!.ef;
    cands.sort((a: string, b: string) => {
      const da = Math.abs(computed.get(a)!.es - ef);
      const db = Math.abs(computed.get(b)!.es - ef);
      if (da !== db) return da - db;
      return computed.get(a)!.es - computed.get(b)!.es;
    });
    cur = cands[0];
  }
  return path;
}

/** Round to 4 dp to absorb IEEE-754 noise from three-point durations. */
function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
