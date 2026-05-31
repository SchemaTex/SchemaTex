/**
 * Fault Tree analysis — MOCUS minimal cut sets + top-event probability.
 * Per docs/reference/37-FAULT-TREE-STANDARD.md §2.4.
 *
 * MOCUS (Method of Obtaining Cut Sets, Fussell-Vesely 1972): a top-down Boolean
 * expansion of the tree into a sum-of-products.
 *   - OR  gates multiply the *number* of cut sets (one branch per input).
 *   - AND gates grow the *order* of a cut set (all inputs join the row).
 * Then minimise by idempotence (A∧A=A) and absorption (X ⊆ Y ⇒ drop Y).
 *
 * House events resolve as Boolean constants (1 ⇒ absorbed, 0 ⇒ branch killed).
 * XOR is treated as OR and PAND as AND in the coherent approximation (§10).
 */

import type {
  FaultTreeAnalysis,
  FaultTreeAst,
  FaultTreeCutSet,
  FaultTreeEvent,
  FaultTreeGate,
} from "./types";

/** Hard cap on intermediate terms — MCS enumeration is NP-hard (§10). */
const EXPANSION_CAP = 50_000;
/** Inclusion-exclusion is 2^m; cap m for `prob: exact` before falling back to MCUB. */
const EXACT_CUTSET_CAP = 20;

export function analyseFaultTree(ast: FaultTreeAst): FaultTreeAnalysis {
  const notes: string[] = [];
  const warnings: string[] = [];
  const byId = new Map(ast.events.map((e) => [e.id, e] as const));

  if (!ast.topId) {
    return { cutSets: [], method: ast.probMethod, missingProb: [], unsatisfiable: true, warnings, notes };
  }

  // ── Modelling notes ──
  let hasXor = false;
  let hasPand = false;
  for (const e of ast.events) {
    if (e.gate?.kind === "xor") hasXor = true;
    if (e.gate?.kind === "pand") hasPand = true;
  }
  if (hasXor) notes.push("XOR treated as OR for coherent cut-set generation; the exact (A∧¬B)∨(¬A∧B) form is deferred.");
  if (hasPand) notes.push("PRIORITY-AND order is rendered but treated as a plain AND for cut sets (sequence requires dynamic-fault-tree analysis).");

  // Unconnected events (declared but unreachable from the top).
  const reachable = new Set<string>();
  const walk = (id: string): void => {
    if (reachable.has(id)) return;
    reachable.add(id);
    const ev = byId.get(id);
    if (ev?.gate) {
      for (const c of ev.gate.inputs) walk(c);
      if (ev.gate.condition && byId.has(ev.gate.condition)) walk(ev.gate.condition);
    }
  };
  walk(ast.topId);
  for (const e of ast.events) {
    if (!reachable.has(e.id)) notes.push(`Event "${e.id}" is declared but referenced by no gate (unconnected).`);
  }

  // ── MOCUS top-down expansion ──
  const terms: Array<Set<string>> = [new Set([ast.topId])];
  let capped = false;

  const isGate = (id: string): boolean => !!byId.get(id)?.gate;

  /** Add an input literal to a term; returns false when the term is killed (house=0). */
  const addLiteral = (term: Set<string>, id: string): boolean => {
    const ev = byId.get(id);
    if (ev?.kind === "house") {
      if (ev.state === 0) return false; // constant FALSE — kill this row
      return true;                       // constant TRUE — absorbed (not added)
    }
    term.add(id);
    return true;
  };

  let iterations = 0;
  while (true) {
    let idx = -1;
    let gateId = "";
    for (let t = 0; t < terms.length && idx < 0; t++) {
      for (const m of terms[t]!) {
        if (isGate(m)) { idx = t; gateId = m; break; }
      }
    }
    if (idx < 0) break; // every term is a pure conjunction of leaves

    const term = terms[idx]!;
    terms.splice(idx, 1);
    const base = new Set(term);
    base.delete(gateId);

    const gate = byId.get(gateId)!.gate!;
    const combos = gateCombos(gate);
    const isOr = gate.kind === "or" || gate.kind === "xor" || gate.kind === "voting";

    for (const combo of combos) {
      const next = new Set(base);
      let dead = false;
      for (const lit of combo) {
        if (!addLiteral(next, lit)) { dead = true; break; }
      }
      if (dead) {
        // AND-combo killed by a house=0 ⇒ drop this row. (For OR, each combo is a
        // separate branch, so only that branch is dropped — same effect.)
        continue;
      }
      terms.push(next);
    }
    void isOr;

    if (terms.length > EXPANSION_CAP || ++iterations > EXPANSION_CAP) {
      capped = true;
      warnings.push(`Cut-set expansion exceeded ${EXPANSION_CAP} intermediate terms — result truncated (BDD-based exact enumeration is deferred).`);
      break;
    }
  }

  // ── Minimise ──
  const unsatisfiable = !capped && terms.length === 0;
  const minimal = minimise(terms);

  // ── Build cut sets + probabilities ──
  const missingProb = new Set<string>();
  const cutSets: FaultTreeCutSet[] = minimal.map((set) => {
    const events = [...set].sort();
    let prob: number | undefined = 1;
    for (const id of events) {
      const p = byId.get(id)?.prob;
      if (p === undefined) { missingProb.add(id); prob = undefined; }
      else if (prob !== undefined) prob *= p;
    }
    return { events, order: events.length, isSpof: events.length === 1, ...(prob !== undefined ? { prob } : {}) };
  });

  cutSets.sort((a, b) => a.order - b.order || a.events.join(",").localeCompare(b.events.join(",")));

  // ── Top-event probability ──
  let topProb: number | undefined;
  if (!unsatisfiable && missingProb.size === 0 && cutSets.length > 0) {
    if (cutSets.some((c) => c.order === 0)) {
      topProb = 1; // an OR branch is forced TRUE by a house event
    } else {
      topProb = computeTopProb(cutSets, byId, ast.probMethod, notes);
    }
  }

  return {
    cutSets,
    method: ast.probMethod,
    ...(topProb !== undefined ? { topProb } : {}),
    missingProb: [...missingProb].sort(),
    unsatisfiable,
    warnings,
    notes,
  };
}

// ─── Gate expansion combos ────────────────────────────────────

/**
 * The list of input-combinations a gate expands to. Each combo is a conjunction
 * (its literals are ANDed into the row). The list itself is a disjunction.
 *   AND/INHIBIT/PAND → one combo (all inputs, + condition).
 *   OR/XOR           → one combo per input.
 *   VOTING k/n       → one combo per k-subset of inputs.
 */
function gateCombos(gate: FaultTreeGate): string[][] {
  switch (gate.kind) {
    case "and":
      return [[...gate.inputs]];
    case "inhibit":
    case "pand": {
      const lits = [...gate.inputs];
      if (gate.condition) lits.push(gate.condition);
      return [lits];
    }
    case "or":
    case "xor":
      return gate.inputs.map((i) => [i]);
    case "voting":
      return combinations(gate.inputs, gate.k ?? gate.inputs.length);
    default:
      return [[...gate.inputs]];
  }
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k <= 0) return [[]];
  if (k > items.length) return [];
  const out: T[][] = [];
  const pick = (start: number, acc: T[]): void => {
    if (acc.length === k) { out.push([...acc]); return; }
    for (let i = start; i < items.length; i++) {
      acc.push(items[i]!);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}

// ─── Minimisation (idempotence + absorption) ──────────────────

function minimise(terms: Array<Set<string>>): Array<Set<string>> {
  // Dedupe exact rows (idempotence within a row is already handled by Set).
  const uniq: Array<Set<string>> = [];
  const seen = new Set<string>();
  for (const t of terms) {
    const key = [...t].sort().join("");
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(t);
  }
  // Absorption: drop any row that is a (non-strict) superset of another row.
  const keep: Array<Set<string>> = [];
  for (let i = 0; i < uniq.length; i++) {
    const a = uniq[i]!;
    let absorbed = false;
    for (let j = 0; j < uniq.length; j++) {
      if (i === j) continue;
      const b = uniq[j]!;
      if (b.size < a.size && isSubset(b, a)) { absorbed = true; break; }
      // Equal-size duplicates already removed; for equal sets keep the first.
      if (b.size === a.size && j < i && isSubset(b, a) && isSubset(a, b)) { absorbed = true; break; }
    }
    if (!absorbed) keep.push(a);
  }
  return keep;
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

// ─── Probability ──────────────────────────────────────────────

function computeTopProb(
  cutSets: FaultTreeCutSet[],
  byId: Map<string, FaultTreeEvent>,
  method: FaultTreeAst["probMethod"],
  notes: string[]
): number {
  const probs = cutSets.map((c) => c.prob ?? 0);

  if (method === "rare") {
    return probs.reduce((s, p) => s + p, 0);
  }
  if (method === "mcub") {
    return 1 - probs.reduce((prod, p) => prod * (1 - p), 1);
  }
  // exact — inclusion-exclusion over the union of literals.
  const m = cutSets.length;
  if (m > EXACT_CUTSET_CAP) {
    notes.push(`prob: exact needs ≤ ${EXACT_CUTSET_CAP} cut sets (have ${m}); fell back to MCUB.`);
    return 1 - probs.reduce((prod, p) => prod * (1 - p), 1);
  }
  const literalSets = cutSets.map((c) => c.events);
  let sum = 0;
  for (let mask = 1; mask < 1 << m; mask++) {
    const union = new Set<string>();
    let bits = 0;
    for (let j = 0; j < m; j++) {
      if (mask & (1 << j)) { bits++; for (const e of literalSets[j]!) union.add(e); }
    }
    let prod = 1;
    for (const e of union) prod *= byId.get(e)?.prob ?? 0;
    sum += (bits % 2 === 1 ? 1 : -1) * prod;
  }
  return sum;
}
