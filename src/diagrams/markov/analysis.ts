/**
 * Markov chain analysis — the differentiator.
 *
 * Spec: docs/reference/42-MARKOV-CHAIN-STANDARD.md §"Engine computation"
 *
 * Three hand-written, dependency-free linear-algebra passes over small dense
 * matrices:
 *
 *   1. Assemble + validate the row-stochastic transition matrix P (row-sum
 *      policy: hard-error vs `normalize`).
 *   2. State classification via Tarjan SCC → communicating classes; a class is
 *      recurrent iff it is closed (no outgoing edge in the condensation); a
 *      singleton closed class with a self-loop of probability 1 is absorbing.
 *   3. Stationary distribution π (πP = π, Σπ = 1) by power iteration with an
 *      exact Gaussian-elimination linear solve fallback for periodic / slow
 *      chains, plus the absorbing-chain fundamental matrix N = (I−Q)⁻¹, the
 *      absorption probabilities B = N·R, and expected steps to absorption t = N·1.
 */

import { MarkovParseError } from "./parser";
import type {
  MarkovAbsorbing,
  MarkovAnalysis,
  MarkovAst,
  MarkovClassInfo,
  MarkovStateClass,
  MarkovStationary,
} from "./types";

/** Row-sum tolerance: rows must sum to 1 within this band (default ±1e-9). */
const ROW_SUM_TOL = 1e-9;
/** Power-iteration convergence tolerance (L1). */
const POWER_TOL = 1e-12;
/** Power-iteration cap before falling back to the exact linear solve. */
const POWER_CAP = 10_000;

export function analyseMarkov(ast: MarkovAst): MarkovAnalysis {
  const notes: string[] = [];
  const warnings: string[] = [];

  // ── 1. Assemble P ──
  const order = ast.states.map((s) => s.id);
  const idx = new Map(order.map((id, i) => [id, i] as const));
  const n = order.length;
  const P = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (const tr of ast.transitions) {
    const i = idx.get(tr.from)!;
    const j = idx.get(tr.to)!;
    // Multiple arcs between the same pair accumulate (and are caught by row-sum).
    P[i]![j]! += tr.probability;
  }

  // ── Row-sum validation / normalisation ──
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += P[i]![j]!;
    if (sum === 0) {
      // A state with no out-edges is not row-stochastic; treat as an implicit
      // absorbing self-loop so the math stays well-defined, and note it.
      P[i]![i] = 1;
      notes.push(`State "${order[i]}" has no outgoing transitions; treated as absorbing (self-loop 1.0).`);
      continue;
    }
    if (Math.abs(sum - 1) > ROW_SUM_TOL) {
      if (ast.normalize) {
        for (let j = 0; j < n; j++) P[i]![j]! /= sum;
        notes.push(`State "${order[i]}" out-edges summed to ${round(sum)}; normalised to 1 (normalize: true).`);
      } else {
        const st = ast.states[i]!;
        throw new MarkovParseError(
          `state "${order[i]}": outgoing probabilities sum to ${round(sum)}, must be 1.0 — fix the values or set "normalize: true"`,
          st.line,
        );
      }
    }
  }

  const analysis: MarkovAnalysis = { P, order, notes, warnings };

  // ── 2. Classification (Tarjan SCC) ──
  let classification: MarkovClassInfo | undefined;
  if (ast.analysis.classify || ast.analysis.absorbing || ast.analysis.stationary) {
    classification = classifyStates(P, order, ast);
    if (ast.analysis.classify || ast.analysis.absorbing) {
      analysis.classification = classification;
    }
  }

  // ── 3. Stationary distribution ──
  if (ast.analysis.stationary) {
    analysis.stationary = computeStationary(P, order, classification, notes);
  }

  // ── 4. Absorbing-chain analysis ──
  if (ast.analysis.absorbing && classification && classification.absorbingStates.length > 0) {
    analysis.absorbing = computeAbsorbing(P, order, classification);
  }

  // ── 5. Periodicity ──
  if (ast.analysis.period && classification) {
    analysis.periods = computePeriods(P, order, classification);
  }

  return analysis;
}

// ─── Tarjan SCC + closed-class classification ─────────────────────

function classifyStates(P: number[][], order: string[], ast: MarkovAst): MarkovClassInfo {
  const n = order.length;
  // Adjacency: edge i→j iff P[i][j] > 0.
  const adj: number[][] = Array.from({ length: n }, () => [] as number[]);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (P[i]![j]! > 0) adj[i]!.push(j);
    }
  }

  // ── Tarjan's strongly-connected-components (iterative, stack-safe) ──
  const indexOf = new Array<number>(n).fill(-1);
  const lowlink = new Array<number>(n).fill(0);
  const onStack = new Array<boolean>(n).fill(false);
  const stack: number[] = [];
  const sccOf = new Array<number>(n).fill(-1);
  const sccs: number[][] = [];
  let counter = 0;

  for (let s = 0; s < n; s++) {
    if (indexOf[s] !== -1) continue;
    // Explicit DFS stack: frames carry the node and the next neighbour to visit.
    const work: Array<{ v: number; pi: number }> = [{ v: s, pi: 0 }];
    while (work.length > 0) {
      const frame = work[work.length - 1]!;
      const v = frame.v;
      if (frame.pi === 0) {
        indexOf[v] = lowlink[v] = counter++;
        stack.push(v);
        onStack[v] = true;
      }
      let recursed = false;
      while (frame.pi < adj[v]!.length) {
        const w = adj[v]![frame.pi]!;
        frame.pi++;
        if (indexOf[w] === -1) {
          work.push({ v: w, pi: 0 });
          recursed = true;
          break;
        } else if (onStack[w]) {
          lowlink[v] = Math.min(lowlink[v]!, indexOf[w]!);
        }
      }
      if (recursed) continue;
      if (lowlink[v] === indexOf[v]) {
        const comp: number[] = [];
        while (true) {
          const w = stack.pop()!;
          onStack[w] = false;
          comp.push(w);
          sccOf[w] = sccs.length;
          if (w === v) break;
        }
        sccs.push(comp);
      }
      work.pop();
      const parent = work[work.length - 1];
      if (parent) lowlink[parent.v] = Math.min(lowlink[parent.v]!, lowlink[v]!);
    }
  }

  // ── Condensation: a class is closed (recurrent) iff no edge leaves it. ──
  const sccClosed = new Array<boolean>(sccs.length).fill(true);
  for (let i = 0; i < n; i++) {
    for (const j of adj[i]!) {
      if (sccOf[i] !== sccOf[j]) sccClosed[sccOf[i]!] = false;
    }
  }

  const byState: Record<string, MarkovStateClass> = {};
  const absorbingStates: string[] = [];
  const recurrentClassIndices: number[] = [];

  const communicatingClasses: string[][] = sccs.map((comp) =>
    comp.map((v) => order[v]!).sort(),
  );

  for (let c = 0; c < sccs.length; c++) {
    const closed = sccClosed[c]!;
    if (closed) recurrentClassIndices.push(c);
    const comp = sccs[c]!;
    const isSingleton = comp.length === 1;
    const v = comp[0]!;
    const isAbsorbing = closed && isSingleton && P[v]![v]! >= 1 - ROW_SUM_TOL;
    for (const node of comp) {
      const id = order[node]!;
      if (isAbsorbing) {
        byState[id] = "absorbing";
      } else if (closed) {
        byState[id] = "recurrent";
      } else {
        byState[id] = "transient";
      }
    }
    if (isAbsorbing) absorbingStates.push(order[v]!);
  }

  // Validate any declared `absorbing` assertions against the computed truth.
  for (const st of ast.states) {
    if (st.declaredAbsorbing && byState[st.id] !== "absorbing") {
      throw new MarkovParseError(
        `state "${st.id}" is declared absorbing but is ${byState[st.id]} (an absorbing state needs a self-loop of probability 1 and no other out-edges)`,
        st.line,
      );
    }
  }

  absorbingStates.sort();
  return {
    byState,
    communicatingClasses,
    recurrentClassIndices,
    absorbingStates,
  };
}

// ─── Stationary distribution ──────────────────────────────────────

function computeStationary(
  P: number[][],
  order: string[],
  classification: MarkovClassInfo | undefined,
  notes: string[],
): MarkovStationary {
  const n = order.length;
  const recurrentClasses = classification
    ? classification.recurrentClassIndices.map((c) => classification.communicatingClasses[c]!)
    : undefined;

  // Reducible chain (≠1 recurrent class) ⇒ no unique global π. Report per-class.
  if (recurrentClasses && recurrentClasses.length !== 1) {
    const perClass = recurrentClasses.map((states) => ({
      states,
      pi: solveClassStationary(P, order, states),
    }));
    if (recurrentClasses.length === 0) {
      notes.push("No recurrent class found; the stationary distribution is undefined.");
    } else {
      notes.push(
        `Chain is reducible (${recurrentClasses.length} recurrent classes); the global stationary π is not unique — reporting one π per recurrent class.`,
      );
    }
    return { pi: {}, unique: false, perClass, converged: true, method: "linear-solve" };
  }

  // ── Power iteration (unique stationary case) ──
  let pi = new Array<number>(n).fill(1 / n);
  let converged = false;
  for (let it = 0; it < POWER_CAP; it++) {
    const next = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      const pii = pi[i]!;
      if (pii === 0) continue;
      const row = P[i]!;
      for (let j = 0; j < n; j++) next[j]! += pii * row[j]!;
    }
    let diff = 0;
    for (let j = 0; j < n; j++) diff += Math.abs(next[j]! - pi[j]!);
    pi = next;
    if (diff < POWER_TOL) {
      converged = true;
      break;
    }
  }

  if (converged) {
    const piMap: Record<string, number> = {};
    const total = pi.reduce((s, v) => s + v, 0) || 1;
    order.forEach((id, i) => (piMap[id] = pi[i]! / total));
    return { pi: piMap, unique: true, perClass: [], converged: true, method: "power" };
  }

  // Power iteration stalled (periodic chain oscillates) → exact linear solve.
  notes.push("Power iteration did not converge (likely periodic); used the exact linear solve for π.");
  const solved = solveStationaryLinear(P, order, order);
  return { pi: solved, unique: true, perClass: [], converged: false, method: "linear-solve" };
}

/** Stationary vector for one recurrent class, restricted to that class's states. */
function solveClassStationary(P: number[][], order: string[], classStates: string[]): Record<string, number> {
  return solveStationaryLinear(P, order, classStates);
}

/**
 * Solve πP = π, Σπ = 1 restricted to `sub` (a closed set of states), by Gaussian
 * elimination on the augmented system. Replaces one redundant equation of
 * π(Pᵀ − I) = 0 with the normalisation Σπ = 1.
 */
function solveStationaryLinear(P: number[][], order: string[], sub: string[]): Record<string, number> {
  const pos = new Map(order.map((id, i) => [id, i] as const));
  const m = sub.length;
  const localIdx = new Map(sub.map((id, i) => [id, i] as const));

  // A = (Pᵀ − I) over the sub-states; we solve A x = 0, x≥0, Σx=1.
  // Build A as m×m: A[k][l] = P[sub[l]→sub[k]] − (k==l ? 1 : 0).
  const A: number[][] = Array.from({ length: m }, () => new Array<number>(m + 1).fill(0));
  for (let k = 0; k < m; k++) {
    for (let l = 0; l < m; l++) {
      const from = pos.get(sub[l]!)!;
      const to = pos.get(sub[k]!)!;
      A[k]![l] = P[from]![to]! - (k === l ? 1 : 0);
    }
    A[k]![m] = 0;
  }
  // Replace the last row with the normalisation Σx = 1.
  for (let l = 0; l < m; l++) A[m - 1]![l] = 1;
  A[m - 1]![m] = 1;

  const x = gaussianSolve(A, m);
  const out: Record<string, number> = {};
  // Guard against tiny negatives from rounding; renormalise to a probability vector.
  let total = 0;
  const clamped = x.map((v) => {
    const c = v < 0 && v > -1e-9 ? 0 : v;
    total += c;
    return c;
  });
  if (total === 0) total = 1;
  for (const id of sub) out[id] = clamped[localIdx.get(id)!]! / total;
  return out;
}

// ─── Absorbing-chain analysis (Kemeny-Snell) ──────────────────────

function computeAbsorbing(P: number[][], order: string[], classification: MarkovClassInfo): MarkovAbsorbing {
  const absorbingSet = new Set(classification.absorbingStates);
  const transient = order.filter((id) => classification.byState[id] === "transient");
  const absorbing = order.filter((id) => absorbingSet.has(id));
  const pos = new Map(order.map((id, i) => [id, i] as const));

  const t = transient.length;
  const r = absorbing.length;

  // Q = transient→transient, R = transient→absorbing.
  const Q: number[][] = Array.from({ length: t }, () => new Array<number>(t).fill(0));
  const R: number[][] = Array.from({ length: t }, () => new Array<number>(r).fill(0));
  for (let a = 0; a < t; a++) {
    const fi = pos.get(transient[a]!)!;
    for (let b = 0; b < t; b++) Q[a]![b] = P[fi]![pos.get(transient[b]!)!]!;
    for (let b = 0; b < r; b++) R[a]![b] = P[fi]![pos.get(absorbing[b]!)!]!;
  }

  // N = (I − Q)⁻¹ via Gauss-Jordan inversion of the t×t matrix (I − Q).
  const ImQ: number[][] = Array.from({ length: t }, (_, a) =>
    Array.from({ length: t }, (_, b) => (a === b ? 1 : 0) - Q[a]![b]!),
  );
  const N = invert(ImQ);

  // B = N·R ; t = N·1 (row sums of N).
  const B: number[][] = Array.from({ length: t }, () => new Array<number>(r).fill(0));
  for (let a = 0; a < t; a++) {
    for (let b = 0; b < r; b++) {
      let s = 0;
      for (let c = 0; c < t; c++) s += N[a]![c]! * R[c]![b]!;
      B[a]![b] = s;
    }
  }
  const tSteps: number[] = N.map((row) => row.reduce((s, v) => s + v, 0));

  return { transient, absorbing, N, B, t: tSteps };
}

// ─── Periodicity ──────────────────────────────────────────────────

function computePeriods(P: number[][], order: string[], classification: MarkovClassInfo): Record<number, number> {
  const periods: Record<number, number> = {};
  const pos = new Map(order.map((id, i) => [id, i] as const));
  for (const c of classification.recurrentClassIndices) {
    const states = classification.communicatingClasses[c]!.map((id) => pos.get(id)!);
    periods[c] = classPeriod(P, states);
  }
  return periods;
}

/** Period of a recurrent class = gcd of BFS return-cycle lengths from any member. */
function classPeriod(P: number[][], states: number[]): number {
  const set = new Set(states);
  const start = states[0]!;
  // Level (distance) BFS within the class; period = gcd over back-edges of
  // (level[u] + 1 − level[v]).
  const level = new Map<number, number>();
  level.set(start, 0);
  const queue = [start];
  let g = 0;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  while (queue.length > 0) {
    const u = queue.shift()!;
    const lu = level.get(u)!;
    for (let j = 0; j < P.length; j++) {
      if (!set.has(j) || P[u]![j]! <= 0) continue;
      if (!level.has(j)) {
        level.set(j, lu + 1);
        queue.push(j);
      } else {
        const diff = lu + 1 - level.get(j)!;
        g = gcd(g, Math.abs(diff));
      }
    }
  }
  return g === 0 ? 1 : g;
}

// ─── Dense linear algebra helpers ─────────────────────────────────

/** Solve an m×(m+1) augmented system A x = b by Gaussian elimination w/ partial pivot. */
function gaussianSolve(aug: number[][], m: number): number[] {
  const A = aug.map((row) => row.slice());
  for (let col = 0; col < m; col++) {
    // Partial pivot.
    let pivot = col;
    let best = Math.abs(A[col]![col]!);
    for (let row = col + 1; row < m; row++) {
      const v = Math.abs(A[row]![col]!);
      if (v > best) {
        best = v;
        pivot = row;
      }
    }
    if (best < 1e-15) continue; // singular column; leave for free variable
    if (pivot !== col) {
      const tmp = A[col]!;
      A[col] = A[pivot]!;
      A[pivot] = tmp;
    }
    const pv = A[col]![col]!;
    for (let row = 0; row < m; row++) {
      if (row === col) continue;
      const factor = A[row]![col]! / pv;
      if (factor === 0) continue;
      for (let k = col; k <= m; k++) A[row]![k]! -= factor * A[col]![k]!;
    }
  }
  const x = new Array<number>(m).fill(0);
  for (let i = 0; i < m; i++) {
    const d = A[i]![i]!;
    x[i] = Math.abs(d) < 1e-15 ? 0 : A[i]![m]! / d;
  }
  return x;
}

/** Invert a square matrix by Gauss-Jordan elimination with partial pivoting. */
function invert(mat: number[][]): number[][] {
  const m = mat.length;
  // Augment [mat | I].
  const A = mat.map((row, i) => [
    ...row,
    ...Array.from({ length: m }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < m; col++) {
    let pivot = col;
    let best = Math.abs(A[col]![col]!);
    for (let row = col + 1; row < m; row++) {
      const v = Math.abs(A[row]![col]!);
      if (v > best) {
        best = v;
        pivot = row;
      }
    }
    if (best < 1e-15) {
      // Singular — should not happen for (I−Q) of an absorbing chain, but guard.
      throw new MarkovParseError("absorbing analysis failed: (I−Q) is singular (no path to absorption from some transient state?)");
    }
    if (pivot !== col) {
      const tmp = A[col]!;
      A[col] = A[pivot]!;
      A[pivot] = tmp;
    }
    const pv = A[col]![col]!;
    for (let k = 0; k < 2 * m; k++) A[col]![k]! /= pv;
    for (let row = 0; row < m; row++) {
      if (row === col) continue;
      const factor = A[row]![col]!;
      if (factor === 0) continue;
      for (let k = 0; k < 2 * m; k++) A[row]![k]! -= factor * A[col]![k]!;
    }
  }
  return A.map((row) => row.slice(m));
}

function round(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
