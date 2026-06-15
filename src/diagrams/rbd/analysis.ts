/**
 * Reliability Block Diagram analysis — system reliability + importance.
 * Per docs/reference/50-RBD-STANDARD.md §2 (IEC 61078:2016 §7).
 *
 * The engine *computes the answer* (the differentiator, like fault-tree MOCUS):
 *   - series   R = ∏ Rᵢ
 *   - parallel R = 1 − ∏ (1 − Rᵢ)
 *   - k-of-n   R = Σ over success states with ≥ k working children
 *                  ( ∏ working Rᵢ · ∏ failed (1−Rᵢ) )   [exact, subset enum]
 * Then for every block it derives the Birnbaum reliability importance
 *   Iᴮ(i) = R_sys(Rᵢ=1) − R_sys(Rᵢ=0)
 * and flags single points of failure (R_sys(Rᵢ=0) = 0).
 */

import type {
  RbdAnalysis,
  RbdAst,
  RbdBlockResult,
  RbdStructure,
} from "./types";

/** k-of-n with n above this is summarised by the parallel approximation note. */
const KOFN_ENUM_CAP = 18;

export function analyseRbd(ast: RbdAst): RbdAnalysis {
  const notes: string[] = [];
  const warnings: string[] = [...ast.warnings];

  // Collect blocks in declaration order, note missing reliabilities.
  const blocks: { id: string; R?: number }[] = [];
  collectBlocks(ast.root, blocks);
  const missing = blocks.filter((b) => b.R === undefined).map((b) => b.id);

  // Base system reliability with every block at its declared R.
  const baseEnv = new Map(blocks.map((b) => [b.id, b.R] as const));
  const systemReliability = evalStructure(ast.root, baseEnv, notes);

  // ── Per-block Birnbaum importance + SPOF (only when fully numeric) ──
  const results: RbdBlockResult[] = blocks.map((b) => {
    if (systemReliability === undefined) {
      return { id: b.id, ...(b.R !== undefined ? { R: b.R } : {}), isSpof: false };
    }
    const up = new Map(baseEnv);
    up.set(b.id, 1);
    const down = new Map(baseEnv);
    down.set(b.id, 0);
    const rUp = evalStructure(ast.root, up, notes);
    const rDown = evalStructure(ast.root, down, notes);
    const importance = rUp !== undefined && rDown !== undefined ? rUp - rDown : undefined;
    const isSpof = rDown === 0;
    return {
      id: b.id,
      ...(b.R !== undefined ? { R: b.R } : {}),
      ...(importance !== undefined ? { importance } : {}),
      isSpof,
    };
  });

  // Highest-importance block = the improvement target.
  let criticalBlock: string | undefined;
  let best = -Infinity;
  for (const r of results) {
    if (r.importance !== undefined && r.importance > best) {
      best = r.importance;
      criticalBlock = r.id;
    }
  }

  if (systemReliability !== undefined) {
    const spofs = results.filter((r) => r.isSpof).map((r) => r.id);
    if (spofs.length === 0) notes.push("No single point of failure — every block has redundancy in the success path.");
  }

  return {
    ...(systemReliability !== undefined ? { systemReliability } : {}),
    blocks: results,
    missing,
    ...(criticalBlock ? { criticalBlock } : {}),
    warnings,
    notes,
  };
}

// ─── Structure evaluation ─────────────────────────────────────

function collectBlocks(s: RbdStructure, out: { id: string; R?: number }[]): void {
  if (s.kind === "block") {
    out.push({ id: s.id, ...(s.R !== undefined ? { R: s.R } : {}) });
    return;
  }
  for (const c of s.children) collectBlocks(c, out);
}

/** Reliability of a structure under an environment id→R. Undefined when any leaf is symbolic. */
function evalStructure(
  s: RbdStructure,
  env: Map<string, number | undefined>,
  notes: string[]
): number | undefined {
  if (s.kind === "block") return env.get(s.id);

  const childR = s.children.map((c) => evalStructure(c, env, notes));
  if (childR.some((r) => r === undefined)) return undefined;
  const rs = childR as number[];
  if (rs.length === 0) return 1; // empty group is a pass-through

  if (s.kind === "series") {
    return rs.reduce((p, r) => p * r, 1);
  }
  if (s.kind === "parallel") {
    return 1 - rs.reduce((p, r) => p * (1 - r), 1);
  }
  // k-of-n
  const n = rs.length;
  const k = Math.min(Math.max(s.k ?? n, 1), n);
  if (n > KOFN_ENUM_CAP) {
    notes.push(`k-of-n group with n=${n} exceeds the exact-enumeration cap (${KOFN_ENUM_CAP}); reported as a parallel bound.`);
    return 1 - rs.reduce((p, r) => p * (1 - r), 1);
  }
  return kofnReliability(rs, k);
}

/** Exact P(≥ k of n independent components work) by 2ⁿ state enumeration. */
function kofnReliability(rs: number[], k: number): number {
  const n = rs.length;
  let total = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    let working = 0;
    let prob = 1;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) { working++; prob *= rs[i]!; }
      else prob *= 1 - rs[i]!;
    }
    if (working >= k) total += prob;
  }
  return total;
}
