/**
 * Decision-matrix computation (Pugh / weighted-scoring concept selection).
 * Per docs/reference/51-COMPARISON-STANDARD.md §6.
 *
 * Stuart Pugh's controlled-convergence method (1980s; ASQ / Six-Sigma concept
 * selection): score every option against every weighted criterion, then the
 * engine — not the author — computes each option's weighted total Σ(wᵢ·sᵢ),
 * ranks them, and names the winner. This is the comparison family's
 * computational moat: the same "engine computes the answer" stance as `pert`
 * (schedule) and `faulttree` (cut sets).
 */

import type { ComparisonAst, CellValue, DecisionResult } from "./types";

/** Coerce any cell value to a numeric score for the weighted sum. */
function scoreOf(v: CellValue | undefined): number {
  if (!v) return 0;
  if (typeof v.score === "number") return v.score;
  // Convenience: glyphs map to a 0/0.5/1 score so a `matrix`-style grid still
  // ranks if the author flips it to decision mode.
  if (v.glyph === "yes") return 1;
  if (v.glyph === "partial") return 0.5;
  if (v.glyph === "no" || v.glyph === "na") return 0;
  return 0;
}

export function computeDecision(ast: ComparisonAst): DecisionResult {
  const totals: Record<string, number> = {};
  const totalWeight = ast.criteria.reduce((s, c) => s + (c.weight ?? 1), 0);

  for (const opt of ast.options) {
    let sum = 0;
    for (const crit of ast.criteria) {
      const w = crit.weight ?? 1;
      sum += w * scoreOf(crit.cells[opt.id]);
    }
    totals[opt.id] = round(sum);
  }

  // Rank: highest total = rank 1; equal totals share a rank (standard
  // competition ranking, so the next rank skips).
  const sorted = [...ast.options].sort((a, b) => totals[b.id]! - totals[a.id]!);
  const ranks: Record<string, number> = {};
  let lastTotal = Number.POSITIVE_INFINITY;
  let lastRank = 0;
  sorted.forEach((opt, i) => {
    const t = totals[opt.id]!;
    if (t < lastTotal) {
      lastRank = i + 1;
      lastTotal = t;
    }
    ranks[opt.id] = lastRank;
  });

  const winnerId = sorted.length ? sorted[0]!.id : "";
  const maxTotal = sorted.length ? totals[winnerId]! : 0;

  const result: DecisionResult = { totals, ranks, winnerId, maxTotal, totalWeight };

  // Pugh datum: deltas relative to the declared baseline option.
  if (ast.baseline) {
    const base = ast.options.find(
      (o) => o.id === ast.baseline || o.label === ast.baseline
    );
    if (base) {
      const baseTotal = totals[base.id]!;
      const deltas: Record<string, number> = {};
      for (const opt of ast.options) deltas[opt.id] = round(totals[opt.id]! - baseTotal);
      result.deltas = deltas;
    }
  }

  return result;
}

/** Human-readable winner sentence for the <desc> + on-canvas caption. */
export function decisionCaption(ast: ComparisonAst, r: DecisionResult): string {
  if (!ast.options.length) return "Decision matrix: no options.";
  const winner = ast.options.find((o) => o.id === r.winnerId);
  const tiedIds = ast.options.filter((o) => r.ranks[o.id] === 1).map((o) => o.id);
  if (tiedIds.length > 1) {
    const names = tiedIds
      .map((id) => ast.options.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .map((n) => `"${n}"`)
      .join(" / ");
    return `Tie at the top: ${names} (weighted score ${fmt(r.maxTotal)} of ${ast.options.length} options).`;
  }
  return `Winner: "${winner?.label ?? r.winnerId}" — weighted score ${fmt(
    r.maxTotal
  )}, highest of ${ast.options.length} option${ast.options.length === 1 ? "" : "s"}.`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Trim a trailing ".0" so integer totals read cleanly. */
export function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}
