/**
 * Markov chain (discrete-time, finite, time-homogeneous) — AST, analysis, and
 * layout types.
 *
 * Spec: docs/reference/42-MARKOV-CHAIN-STANDARD.md
 *
 * The AST is the spec for the data structures: states (circles), transitions
 * (directed probability-labelled arcs, including self-loops), plus the optional
 * `analysis:` selection and the row-sum `normalize` policy. Everything the
 * engine *computes* (stationary distribution, SCC classification, absorbing
 * fundamental matrix) lives in the analysis types, not the AST.
 */

// ─── AST ─────────────────────────────────────────────────────────

/** Layout strategy. `ring` (default) places states on a circle; `layered` flows
 * transient → absorbing for absorbing chains. No force simulation either way. */
export type MarkovLayoutMode = "ring" | "layered";

/** Which computed blocks the engine runs (mirrors faulttree's `analysis:`). */
export interface MarkovAnalysisSelection {
  stationary: boolean;
  classify: boolean;
  absorbing: boolean;
  period: boolean;
}

export interface MarkovState {
  id: string;
  label?: string;
  /** Author asserted `absorbing` on the declaration; the engine validates it. */
  declaredAbsorbing: boolean;
  line?: number;
}

export interface MarkovTransition {
  from: string;
  to: string;
  /** Transition probability p(from → to), in [0, 1]. */
  probability: number;
  /** True when from === to (a self-loop). */
  self: boolean;
  line?: number;
}

export interface MarkovAst {
  type: "markov";
  title?: string;
  layout: MarkovLayoutMode;
  /** Per-the-doc default: hard-error on row-sum ≠ 1. `normalize: true` opts in. */
  normalize: boolean;
  analysis: MarkovAnalysisSelection;
  states: MarkovState[];
  transitions: MarkovTransition[];
  warnings: string[];
}

// ─── Analysis (the differentiator) ───────────────────────────────

export type MarkovStateClass = "recurrent" | "transient" | "absorbing";

export interface MarkovClassInfo {
  /** State id → its class tag. */
  byState: Record<string, MarkovStateClass>;
  /** Communicating classes (SCCs), each a sorted list of state ids. */
  communicatingClasses: string[][];
  /** Ids of the recurrent (closed) classes, by index into communicatingClasses. */
  recurrentClassIndices: number[];
  absorbingStates: string[];
}

export interface MarkovStationary {
  /** State id → long-run probability. Empty when not unique (see `unique`). */
  pi: Record<string, number>;
  /** True iff the chain has exactly one recurrent class (π is unique). */
  unique: boolean;
  /** Per-recurrent-class stationary vectors when the chain is reducible. */
  perClass: Array<{ states: string[]; pi: Record<string, number> }>;
  /** Power iteration hit the cap without converging (linear solve fallback used). */
  converged: boolean;
  method: "power" | "linear-solve";
}

export interface MarkovAbsorbing {
  /** Transient state ids, in canonical order (rows/cols of Q, N, t). */
  transient: string[];
  /** Absorbing state ids, in canonical order (cols of R, B). */
  absorbing: string[];
  /** Fundamental matrix N = (I−Q)⁻¹, indexed [transient][transient]. */
  N: number[][];
  /** Absorption probabilities B = N·R, indexed [transient][absorbing]. */
  B: number[][];
  /** Expected steps to absorption t = N·1, indexed [transient]. */
  t: number[];
}

export interface MarkovAnalysis {
  /** n × n row-stochastic matrix in `order` row/column order. */
  P: number[][];
  /** State id order used by P (and all matrix indices). */
  order: string[];
  classification?: MarkovClassInfo;
  stationary?: MarkovStationary;
  absorbing?: MarkovAbsorbing;
  /** Per-recurrent-class period (1 = aperiodic); keyed by class index. */
  periods?: Record<number, number>;
  notes: string[];
  warnings: string[];
}

// ─── Layout result ───────────────────────────────────────────────

export interface MarkovStateBox {
  state: MarkovState;
  cx: number;
  cy: number;
  r: number;
  classTag?: MarkovStateClass;
  /** Stationary probability annotation, when computed & unique-or-per-class. */
  pi?: number;
  isAbsorbing: boolean;
}

export interface MarkovPoint {
  x: number;
  y: number;
}

export interface MarkovArcGeom {
  transition: MarkovTransition;
  /** Cubic Bézier control points [start, c1, c2, end] for arcs; self-loops carry a
   * 4-point loop path. */
  points: MarkovPoint[];
  self: boolean;
  /** Probability-label anchor. */
  labelX: number;
  labelY: number;
}

export interface MarkovLayoutResult {
  width: number;
  height: number;
  title?: string;
  states: MarkovStateBox[];
  arcs: MarkovArcGeom[];
  analysis: MarkovAnalysis;
  ast: MarkovAst;
}
