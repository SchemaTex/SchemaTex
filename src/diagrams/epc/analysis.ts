/**
 * EPC well-formedness validation — the engine's differentiator.
 * Per docs/reference/44-EPC-STANDARD.md §"Engine computation".
 *
 * The engine does not compute a number (contrast `pert` schedule, `faulttree`
 * cut sets); it **validates structure**. The rules, from Wikipedia, van der
 * Aalst (1999) and Mendling (2008), confirmed by the reference images:
 *
 *   1. Bipartite alternation — events and functions strictly alternate along
 *      any control-flow path; connectors don't break it (traversing through any
 *      run of connectors, the next *typed* node must be the opposite kind).
 *   2. Start / end must be events — a function may not be a start or end node.
 *   3. Signature rule — an *event must not be the source of an OR/XOR split*
 *      (a passive event cannot decide). An AND-split after an event is allowed.
 *   4. Split/join balancing — a split of type T should be closed by a join of
 *      type T; mismatches are *warnings* (real EPCs are sometimes unbalanced).
 *   5. Single-in / single-out per event & function — connectors carry the
 *      multiplicity; an event/function with two outgoing arcs is malformed.
 *   6. Reachability — every node reachable from a start event, every node
 *      reaching an end event.
 *
 * Errors are *flagged*, not thrown — the diagram still renders with the
 * offending nodes highlighted, with AI-readable messages.
 */

import type {
  EpcAnalysis,
  EpcAst,
  EpcNode,
  EpcViolation,
} from "./types";

interface Adjacency {
  out: Map<string, string[]>;
  in: Map<string, string[]>;
}

export function analyseEpc(ast: EpcAst): EpcAnalysis {
  const violations: EpcViolation[] = [];
  const byId = new Map<string, EpcNode>(ast.nodes.map((n) => [n.id, n] as const));

  // Undefined references (auto-created placeholders).
  for (const n of ast.nodes) {
    if (n.autoCreated) {
      violations.push({
        kind: "undefined-ref",
        severity: "error",
        message: `Node "${n.id}" is used in an edge but never declared. Declare it with 'event ${n.id} "…"', 'function ${n.id} "…"', or a connector keyword (and/or/xor).`,
        nodes: [n.id],
      });
    }
  }

  if (ast.nodes.length === 0 || !ast.nodes.some((n) => n.kind === "event")) {
    violations.push({
      kind: "empty",
      severity: "error",
      message: `An EPC must contain at least one event — it starts and ends with events.`,
      nodes: [],
    });
    return finalize(violations, [], []);
  }

  const adj = buildAdjacency(ast);

  // ── Start / end sets (over typed control-flow nodes) ──
  const startIds: string[] = [];
  const endIds: string[] = [];
  for (const n of ast.nodes) {
    const indeg = (adj.in.get(n.id) ?? []).length;
    const outdeg = (adj.out.get(n.id) ?? []).length;
    if (indeg === 0) startIds.push(n.id);
    if (outdeg === 0) endIds.push(n.id);
  }

  // Rule 2 — start/end must be events.
  for (const id of startIds) {
    const n = byId.get(id)!;
    if (n.kind !== "event") {
      violations.push({
        kind: "start-end",
        severity: "error",
        message: `${cap(n.kind)} "${labelOf(n)}" has no incoming control flow, so it is a start node — but an EPC must start with an event. Precede it with a start event.`,
        nodes: [id],
      });
    }
  }
  for (const id of endIds) {
    const n = byId.get(id)!;
    if (n.kind !== "event") {
      violations.push({
        kind: "start-end",
        severity: "error",
        message: `${cap(n.kind)} "${labelOf(n)}" has no outgoing control flow, so it is an end node — but an EPC must end with an event. Follow it with an end event.`,
        nodes: [id],
      });
    }
  }

  // Rule 5 — single-in / single-out per event & function.
  for (const n of ast.nodes) {
    if (n.kind === "connector") continue;
    const outs = adj.out.get(n.id) ?? [];
    const ins = adj.in.get(n.id) ?? [];
    if (outs.length > 1) {
      violations.push({
        kind: "node-fan-out",
        severity: "error",
        message: `${cap(n.kind)} "${labelOf(n)}" has ${outs.length} outgoing arcs — an event or function must have a single output. The split belongs on a connector (and/or/xor) placed after it.`,
        nodes: [n.id],
      });
    }
    if (ins.length > 1) {
      violations.push({
        kind: "node-fan-in",
        severity: "error",
        message: `${cap(n.kind)} "${labelOf(n)}" has ${ins.length} incoming arcs — an event or function must have a single input. The join belongs on a connector (and/or/xor) placed before it.`,
        nodes: [n.id],
      });
    }
  }

  // Rule 3 — the signature rule: an event must not be the source of an OR/XOR split.
  for (const n of ast.nodes) {
    if (n.kind !== "event") continue;
    const outs = adj.out.get(n.id) ?? [];
    for (const succ of outs) {
      const c = byId.get(succ);
      if (c && c.kind === "connector" && (c.operator === "or" || c.operator === "xor")) {
        const fanOut = (adj.out.get(c.id) ?? []).length;
        if (fanOut >= 2) {
          violations.push({
            kind: "event-or-xor-split",
            severity: "error",
            message: `Event "${labelOf(n)}" is the source of a ${c.operator.toUpperCase()} split — events cannot decide; only a function may precede an OR/XOR-split. Insert a function between the event and the ${c.operator.toUpperCase()} connector.`,
            nodes: [n.id, c.id],
          });
        }
      }
    }
  }

  // Rule 1 — bipartite alternation through connectors.
  checkAlternation(ast, adj, byId, violations);

  // Rule 4 — split/join balancing (warnings).
  checkBalance(ast, adj, byId, violations);

  // Rule 6 — reachability from a start event / co-reachability to an end event.
  checkReachability(ast, adj, byId, startIds, endIds, violations);

  return finalize(violations, startIds, endIds);
}

// ─── Rule 1: alternation through connector runs ───────────────

/**
 * From every typed node (event/function), walk forward through any run of
 * connectors to the next typed nodes. Those must all be of the opposite kind.
 */
function checkAlternation(
  ast: EpcAst,
  adj: Adjacency,
  byId: Map<string, EpcNode>,
  violations: EpcViolation[]
): void {
  const reported = new Set<string>();
  for (const n of ast.nodes) {
    if (n.kind === "connector") continue;
    const wantKind = n.kind === "event" ? "function" : "event";
    const reached = typedSuccessors(n.id, adj, byId);
    for (const tid of reached) {
      const t = byId.get(tid)!;
      if (t.kind === "connector") continue; // already typed-filtered
      if (t.kind !== wantKind) {
        const key = `${n.id}->${tid}`;
        if (reported.has(key)) continue;
        reported.add(key);
        violations.push({
          kind: "alternation",
          severity: "error",
          message: `${cap(n.kind)} "${labelOf(n)}" is followed by ${article(t.kind)} ${t.kind} "${labelOf(t)}" — events and functions must strictly alternate. Insert ${article(wantKind)} ${wantKind} between them.`,
          nodes: [n.id, tid],
        });
      }
    }
  }
}

/** Typed (event/function) nodes reachable through a run of connectors. */
function typedSuccessors(
  startId: string,
  adj: Adjacency,
  byId: Map<string, EpcNode>
): string[] {
  const found = new Set<string>();
  const seenConn = new Set<string>();
  const stack = [...(adj.out.get(startId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    const node = byId.get(id);
    if (!node) continue;
    if (node.kind === "connector") {
      if (seenConn.has(id)) continue;
      seenConn.add(id);
      for (const s of adj.out.get(id) ?? []) stack.push(s);
    } else {
      found.add(id);
    }
  }
  return [...found];
}

// ─── Rule 4: split/join balancing (warn) ──────────────────────

function checkBalance(
  ast: EpcAst,
  adj: Adjacency,
  byId: Map<string, EpcNode>,
  violations: EpcViolation[]
): void {
  // For each split connector, see if the branches reconverge at a join of the
  // same type before reaching an end. A light structural heuristic: collect the
  // join connectors reachable from a split; if none share its type, warn.
  for (const n of ast.nodes) {
    if (n.kind !== "connector") continue;
    const outs = adj.out.get(n.id) ?? [];
    const ins = adj.in.get(n.id) ?? [];
    const isSplit = outs.length >= 2 && ins.length <= 1;
    if (!isSplit) continue;
    const joins = reachableJoins(n.id, adj, byId);
    if (joins.length === 0) continue; // open split (branches end separately) — fine
    const matching = joins.some((j) => byId.get(j)!.kind === "connector" && (byId.get(j) as EpcNode & { operator?: string }).operator === n.operator);
    if (!matching) {
      const jKinds = joins.map((j) => connOp(byId.get(j)!)).filter(Boolean);
      violations.push({
        kind: "split-join-balance",
        severity: "warning",
        message: `${n.operator.toUpperCase()}-split "${n.id}" reconverges at a ${jKinds.join("/")}-join, not a ${n.operator.toUpperCase()}-join. Mismatched split/join types can cause ${mismatchHint(n.operator)}; verify this is intended.`,
        nodes: [n.id, ...joins],
      });
    }
  }
}

function reachableJoins(splitId: string, adj: Adjacency, byId: Map<string, EpcNode>): string[] {
  const joins = new Set<string>();
  const seen = new Set<string>([splitId]);
  const stack = [...(adj.out.get(splitId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node) continue;
    if (node.kind === "connector") {
      const ins = (adj.in.get(id) ?? []).length;
      if (ins >= 2) { joins.add(id); continue; } // first join on this path
    }
    for (const s of adj.out.get(id) ?? []) stack.push(s);
  }
  return [...joins];
}

// ─── Rule 6: reachability ─────────────────────────────────────

function checkReachability(
  ast: EpcAst,
  adj: Adjacency,
  byId: Map<string, EpcNode>,
  startIds: string[],
  endIds: string[],
  violations: EpcViolation[]
): void {
  if (startIds.length === 0 || endIds.length === 0) return; // start/end issues already flagged

  const fromStart = bfs(startIds, adj.out);
  const toEnd = bfs(endIds, adj.in);

  for (const n of ast.nodes) {
    if (n.autoCreated) continue;
    if (!fromStart.has(n.id)) {
      violations.push({
        kind: "unreachable",
        severity: "warning",
        message: `${cap(n.kind)} "${labelOf(n)}" is not reachable from any start event.`,
        nodes: [n.id],
      });
    } else if (!toEnd.has(n.id) && !endIds.includes(n.id)) {
      violations.push({
        kind: "dead-end",
        severity: "warning",
        message: `${cap(n.kind)} "${labelOf(n)}" cannot reach an end event (dead end).`,
        nodes: [n.id],
      });
    }
  }
  void byId;
}

function bfs(seeds: string[], adj: Map<string, string[]>): Set<string> {
  const seen = new Set<string>(seeds);
  const stack = [...seeds];
  while (stack.length) {
    const id = stack.pop()!;
    for (const s of adj.get(id) ?? []) {
      if (!seen.has(s)) { seen.add(s); stack.push(s); }
    }
  }
  return seen;
}

// ─── Helpers ──────────────────────────────────────────────────

function buildAdjacency(ast: EpcAst): Adjacency {
  const out = new Map<string, string[]>();
  const inn = new Map<string, string[]>();
  for (const n of ast.nodes) { out.set(n.id, []); inn.set(n.id, []); }
  for (const e of ast.edges) {
    if (!out.has(e.from) || !inn.has(e.to)) continue;
    out.get(e.from)!.push(e.to);
    inn.get(e.to)!.push(e.from);
  }
  return { out, in: inn };
}

function finalize(violations: EpcViolation[], startIds: string[], endIds: string[]): EpcAnalysis {
  const wellFormed = !violations.some((v) => v.severity === "error");
  return { violations, startIds, endIds, wellFormed };
}

function labelOf(n: EpcNode): string {
  if (n.kind === "connector") return n.operator.toUpperCase();
  return n.label ?? n.id;
}

function connOp(n: EpcNode): string {
  return n.kind === "connector" ? n.operator.toUpperCase() : "";
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function article(kind: string): string {
  return /^[aeiou]/i.test(kind) ? "an" : "a";
}

function mismatchHint(op: string): string {
  if (op === "and") return "lack of synchronisation";
  if (op === "xor") return "a deadlock";
  return "non-local merge semantics";
}
