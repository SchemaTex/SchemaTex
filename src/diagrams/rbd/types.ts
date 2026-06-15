/**
 * Reliability Block Diagram (rbd) — AST + analysis + LayoutResult types.
 *
 * See docs/reference/50-RBD-STANDARD.md (IEC 61078:2016).
 * Pattern mirrors sibling computed-semantics engines in the risk-reliability
 * cluster (faulttree §37, eventtree §39): the engine does not just draw the
 * success-logic blocks — it *computes* the system reliability by series/parallel
 * /k-of-n reduction, plus the Birnbaum importance of every block, and surfaces
 * the single points of failure as a first-class render feature.
 */

// ─── Structure tree ───────────────────────────────────────────

export type RbdGroupKind = "series" | "parallel" | "kofn";

/** A leaf block — one component on a reliability success path. */
export interface RbdBlock {
  kind: "block";
  id: string;
  /** Display label (defaults to id). */
  label?: string;
  /** Reliability/availability 0..1 (given directly or derived from `p`). Undefined = symbolic. */
  R?: number;
}

/** A success-logic grouping of child structures. */
export interface RbdGroup {
  kind: RbdGroupKind;
  /** k-of-n voting threshold (the group succeeds when ≥ k children succeed). */
  k?: number;
  /** k-of-n total (defaults to children.length). */
  n?: number;
  children: RbdStructure[];
}

export type RbdStructure = RbdBlock | RbdGroup;

// ─── AST root ─────────────────────────────────────────────────

export interface RbdAst {
  type: "rbd";
  title?: string;
  /** Root structure — a bare top-level block list is wrapped in an implicit series. */
  root: RbdStructure;
  /** Non-fatal parser warnings (duplicate ids, k>n clamped, …). */
  warnings: string[];
  metadata?: Record<string, string>;
}

// ─── Computed analysis (the differentiator) ───────────────────

export interface RbdBlockResult {
  id: string;
  R?: number;
  /**
   * Birnbaum reliability importance Iᴮ(i) = R_sys(Rᵢ=1) − R_sys(Rᵢ=0):
   * how much system reliability moves per unit change in this block. Undefined
   * when the system reliability is symbolic (some block lacks an R).
   */
  importance?: number;
  /** True when R_sys(Rᵢ=0) = 0 — this block's failure alone fails the system. */
  isSpof: boolean;
}

export interface RbdAnalysis {
  /** P(system works); undefined when any reachable block lacks a reliability. */
  systemReliability?: number;
  blocks: RbdBlockResult[];
  /** Block ids that carry no reliability (block out of the numeric rollup). */
  missing: string[];
  /** Id of the highest-Birnbaum-importance block — the improvement target. */
  criticalBlock?: string;
  warnings: string[];
  /** Non-fatal modelling notes. */
  notes: string[];
}

// ─── Layout output ────────────────────────────────────────────

export interface RbdLayoutBlock {
  block: RbdBlock;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Per-block computed reliability (mirrors analysis, for caption rendering). */
  R?: number;
  isSpof: boolean;
  /** True when this is the highest-importance block. */
  critical: boolean;
}

export type RbdNodeKind = "in" | "out" | "split" | "join";

export interface RbdLayoutNode {
  kind: RbdNodeKind;
  x: number;
  y: number;
}

export interface RbdLayoutWire {
  path: string;
}

/** k-of-n annotation drawn beside a parallel-voting group's merge node. */
export interface RbdLayoutMark {
  x: number;
  y: number;
  text: string;
}

export interface RbdLayoutResult {
  ast: RbdAst;
  analysis: RbdAnalysis;
  blocks: RbdLayoutBlock[];
  nodes: RbdLayoutNode[];
  wires: RbdLayoutWire[];
  marks: RbdLayoutMark[];
  width: number;
  height: number;
}
