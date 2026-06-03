/**
 * Event Tree Analysis (eventtree / eta) — AST + analysis + LayoutResult types.
 *
 * See docs/reference/39-EVENT-TREE-STANDARD.md.
 * Pattern mirrors the sibling computed-semantics engines (faulttree §37,
 * pert §32, petri §34): the engine does not just draw a forking ladder — it
 * *computes* every root-to-leaf path frequency (f₀ · ∏ branch probabilities),
 * rolls those up per outcome state, and flags the dominant (worst) sequence.
 * The render is downstream of that arithmetic.
 */

// ─── Vocabulary primitives ────────────────────────────────────

/** Layout flows strictly left→right per the IEC 62502 / NUREG convention. */
export type EventTreeDirection = "lr";

/** Each leg of a binary fork. Success is the UPPER leg, failure the LOWER. */
export type EventTreeBranchLeg = "s" | "f";

/** A single character of an outcome pattern: success / failure / pruned-or-wildcard. */
export type EventTreePatternToken = "s" | "f" | "*";

// ─── Declarations ─────────────────────────────────────────────

/** The single triggering event — the root on the far left. */
export interface EventTreeInitiating {
  id: string;
  label?: string;
  /** f₀ — initiating-event frequency (per-year or per-demand; carried through unchanged). */
  freq: number;
}

/** A safety function / barrier queried at one header column, in left→right order. */
export interface EventTreeFunction {
  id: string;
  label?: string;
  /**
   * Declared FAILURE probability p ∈ [0,1]. The success leg is the complement
   * 1 − p, computed by the engine (the author never states both).
   */
  p: number;
}

/**
 * One terminal sequence (leaf), declared as an outcome pattern read left→right
 * over the function columns. `s` = success leg, `f` = failure leg, `*` = the
 * function is not queried on this path (pruned / pass-through → the path
 * terminates and runs flat to its leaf).
 */
export interface EventTreeOutcome {
  /** Pattern tokens, one per function column up to the first `*` (inclusive of trailing `*`s). */
  pattern: EventTreePatternToken[];
  /** End-state label (e.g. "Core damage"). */
  label: string;
  /** Source line (diagnostics + deterministic leaf ordering tiebreak). */
  line: number;
}

// ─── AST root ─────────────────────────────────────────────────

export interface EventTreeAst {
  type: "eventtree";
  title?: string;
  direction: EventTreeDirection;
  initiating: EventTreeInitiating;
  /** Header function columns, in declared (chronological / response) order. */
  functions: EventTreeFunction[];
  /** One per realised leaf. */
  outcomes: EventTreeOutcome[];
  warnings: string[];
  metadata?: Record<string, string>;
}

// ─── Computed analysis (the differentiator) ───────────────────

/** A resolved root-to-leaf sequence with its computed frequency. */
export interface EventTreeSequence {
  /** Declaration index (stable id). */
  index: number;
  /** Short designator, e.g. "1s 2s 3f" (success/failure per queried column). */
  designator: string;
  /** The legs actually taken (one per *queried* column; pruned columns omitted). */
  legs: EventTreeBranchLeg[];
  /** Branch probabilities applied, aligned with `legs` (p on failure, 1−p on success). */
  branchProbs: number[];
  /** End-state label. */
  outcome: string;
  /** f₀ · ∏ branchProbs. */
  frequency: number;
  /** True for the largest-frequency sequence(s) — the reserved-red accent. */
  dominant: boolean;
}

export interface EventTreeAnalysis {
  sequences: EventTreeSequence[];
  /** Σ frequency grouped by outcome state, sorted by descending total. */
  outcomeTotals: Array<{ outcome: string; total: number; count: number }>;
  /** Σ of every leaf frequency (≈ f₀ when the tree partitions the IE completely). */
  totalFrequency: number;
  /** Largest single-leaf frequency (the dominant value). */
  dominantFrequency: number;
  /** Non-fatal modelling notes. */
  notes: string[];
}

// ─── Layout output ────────────────────────────────────────────

/** A header-band column: the IE stub column, each function, then Outcome + Frequency. */
export interface EventTreeLayoutHeader {
  kind: "initiating" | "function" | "outcome" | "frequency";
  label: string;
  /** Center x of the column. */
  cx: number;
  /** Gridline x (the fork column line) — function columns only. */
  gridX?: number;
}

/** A single drawn fork at one function column on one path. */
export interface EventTreeLayoutFork {
  functionId: string;
  leg: EventTreeBranchLeg;
  /** Branch probability shown on the leg. */
  prob: number;
  /** Designator fragment, e.g. "2f". */
  tag: string;
  /** Orthogonal step polyline from the upstream node to this leg's node. */
  path: string;
  /** Label anchor (above the horizontal run). */
  labelX: number;
  labelY: number;
}

/** A resolved leaf: outcome name + path frequency, on the far right. */
export interface EventTreeLayoutLeaf {
  sequence: EventTreeSequence;
  /** Anchor x for the outcome/frequency text column. */
  x: number;
  /** Vertical center of this leaf row. */
  y: number;
  dominant: boolean;
}

export interface EventTreeLayoutResult {
  ast: EventTreeAst;
  analysis: EventTreeAnalysis;
  headers: EventTreeLayoutHeader[];
  forks: EventTreeLayoutFork[];
  leaves: EventTreeLayoutLeaf[];
  /** The IE stub: a short bold horizontal line on the far left. */
  initiating: { x1: number; x2: number; y: number; labelX: number; labelY: number; freqY: number };
  /** Vertical dashed column gridlines (one per function header). */
  gridLines: Array<{ x: number; y1: number; y2: number }>;
  /** Header band baseline (text y) and the y the tree body starts at. */
  headerY: number;
  bodyTopY: number;
  width: number;
  height: number;
}
