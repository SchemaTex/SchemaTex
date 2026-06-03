/**
 * Event Tree analysis — per-path frequency, outcome roll-up, dominant sequence.
 * Per docs/reference/39-EVENT-TREE-STANDARD.md §"Engine computation".
 *
 * This is the differentiator. draw.io / Lucidchart draw a forking ladder and
 * stop — that's a picture. A real ETA engine knows:
 *   1. each function's success leg is the complement 1 − p of the declared
 *      failure probability (the author never states both);
 *   2. each leaf's frequency is f₀ · ∏ branch-probabilities along its path;
 *   3. outcome states aggregate across paths (Σ over every "Core damage" leaf);
 *   4. the dominant (largest-frequency) sequence is the reserved-red accent,
 *      the ETA analogue of the fault tree's single-points-of-failure.
 *
 * Pure, deterministic, zero deps.
 */

import type {
  EventTreeAnalysis,
  EventTreeAst,
  EventTreeBranchLeg,
  EventTreeSequence,
} from "./types";

export function analyseEventTree(ast: EventTreeAst): EventTreeAnalysis {
  const notes: string[] = [];
  const f0 = ast.initiating.freq;

  const sequences: EventTreeSequence[] = ast.outcomes.map((o, index) => {
    const legs: EventTreeBranchLeg[] = [];
    const branchProbs: number[] = [];
    const tags: string[] = [];

    let freq = f0;
    for (let col = 0; col < o.pattern.length; col++) {
      const tk = o.pattern[col]!;
      if (tk === "*") break; // pruned from here on — path runs flat to its leaf
      const fn = ast.functions[col]!;
      // Failure leg → p; success leg → complement 1 − p.
      const prob = tk === "f" ? fn.p : 1 - fn.p;
      legs.push(tk);
      branchProbs.push(prob);
      tags.push(`${col + 1}${tk}`);
      freq *= prob;
    }

    return {
      index,
      designator: tags.join(" "),
      legs,
      branchProbs,
      outcome: o.label,
      frequency: freq,
      dominant: false, // set below
    };
  });

  // ── Dominant sequence(s): the largest-frequency leaf (reserved-red accent). ──
  let dominantFrequency = 0;
  for (const s of sequences) dominantFrequency = Math.max(dominantFrequency, s.frequency);
  // Flag with a tiny relative tolerance so floating products that tie still tie.
  const tol = dominantFrequency * 1e-12;
  if (dominantFrequency > 0) {
    for (const s of sequences) s.dominant = s.frequency >= dominantFrequency - tol;
  }

  // ── Outcome roll-up: Σ frequency per end-state, descending. ──
  const totalsMap = new Map<string, { total: number; count: number }>();
  for (const s of sequences) {
    const cur = totalsMap.get(s.outcome) ?? { total: 0, count: 0 };
    cur.total += s.frequency;
    cur.count += 1;
    totalsMap.set(s.outcome, cur);
  }
  const outcomeTotals = [...totalsMap.entries()]
    .map(([outcome, v]) => ({ outcome, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total || a.outcome.localeCompare(b.outcome));

  const totalFrequency = sequences.reduce((sum, s) => sum + s.frequency, 0);

  // ── Modelling note: do the leaves partition the initiating event? ──
  // If Σ leaf-frequency deviates materially from f₀, some branch combination is
  // unaccounted for (or double-counted) — surface it, don't silently swallow it.
  if (f0 > 0) {
    const rel = Math.abs(totalFrequency - f0) / f0;
    if (rel > 1e-6) {
      notes.push(
        `Leaf frequencies sum to ${fmt(totalFrequency)} vs initiating frequency ${fmt(f0)} ` +
        `(${(rel * 100).toFixed(1)}% off) — the declared outcomes don't fully partition the tree; ` +
        `some branch combinations are unlabelled.`
      );
    }
  }

  return { sequences, outcomeTotals, totalFrequency, dominantFrequency, notes };
}

function fmt(n: number): string {
  if (n === 0) return "0";
  if (n >= 0.001 && n < 1e7) return String(parseFloat(n.toPrecision(4)));
  return n.toExponential(3);
}
