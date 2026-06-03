export type DTreeMode = "decision" | "ml" | "taxonomy" | "influence";

export type DTreeDirection = "top-down" | "left-right";

export type DTreeNodeKind =
  // decision-mode
  | "decision"
  | "chance"
  | "end"
  // ml-mode
  | "split"
  | "leaf"
  // taxonomy-mode
  | "question"
  | "answer";

export type DTreeImpurity = "gini" | "entropy" | "mse" | "gain" | "impurity";

export type DTreeBranchLabels = "boolean" | "relation";

/** Edge visual style: orthogonal L-shape, diagonal straight line, or bracket (parent stub + diagonal). */
export type DTreeEdgeStyle = "orthogonal" | "diagonal" | "bracket";

export interface DTreeNode {
  id: string;
  kind: DTreeNodeKind;
  label: string;
  children: DTreeNode[];

  // ── Decision-mode: edge annotations on incoming edge
  /** Choice name on incoming edge (from a decision parent). */
  incomingChoice?: string;
  /** Probability on incoming edge (from a chance parent). */
  incomingProb?: number;
  /** Payoff at an end node. */
  payoff?: number;
  /** Computed expected value. */
  ev?: number;
  /** True if this node's incoming edge is the EV-optimal decision branch. */
  optimal?: boolean;

  // ── ML-mode
  feature?: string;
  op?: string;
  threshold?: number | string;
  samples?: number;
  /** Classification: array of class counts; regression: single predicted value. */
  value?: number[] | number;
  impurity?: number;
  /** ML branch direction (true / false). */
  mlBranch?: "true" | "false";
  className?: string;

  // ── Taxonomy-mode
  /** Custom branch label (yes / no / other). */
  branchLabel?: string;
}

export interface DTreeAST {
  type: "decisiontree";
  mode: DTreeMode;
  title?: string;
  direction: DTreeDirection;
  /** Class names for ML classification. */
  classes?: string[];
  /** Impurity metric (ml-mode). */
  impurityName?: DTreeImpurity;
  /** Branch labels for ml-mode: boolean (True/False) or relation (≤ threshold / > threshold). */
  branchLabels?: DTreeBranchLabels;
  /** Probability-weighted branch length (decision-mode). */
  branchLengthProb?: boolean;
  /** Edge visual style. Default: decision→diagonal, ml/taxonomy→orthogonal. */
  edgeStyle?: DTreeEdgeStyle;
  /** Is this a regression tree (value=number)? */
  regression?: boolean;
  root: DTreeNode;
  metadata?: Record<string, string>;
}

export interface DTreeLayoutNode {
  node: DTreeNode;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  /** Natural (un-snapped) x — differs from x only when snapped to payoff column. */
  naturalX?: number;
  /** Natural (un-snapped) y — differs from y only when snapped. */
  naturalY?: number;
}

export interface DTreeLayoutEdge {
  from: string;
  to: string;
  path: string;
  label?: string;
  isOptimal?: boolean;
  /** Stroke-width multiplier (probability weighting). */
  strokeWidth?: number;
}

export interface DTreeLayoutResult {
  width: number;
  height: number;
  nodes: DTreeLayoutNode[];
  edges: DTreeLayoutEdge[];
  title?: string;
  mode: DTreeMode;
  direction: DTreeDirection;
  edgeStyle: DTreeEdgeStyle;
  /** Per-edge label anchor points (for diagonal edges, midpoint of segment). */
  labelAnchors?: Record<string, { x: number; y: number; angle: number }>;
  /** For decision mode: absolute x where payoff/EV column begins (right of all triangles). */
  payoffColumnX?: number;
  /** Per-depth rail position (for orthogonal edges — common elbow y/x so siblings align). */
  levelRails?: number[];
}

// ─── Influence Diagram (Howard & Matheson 1981/2005) ─────────
//
// The influence diagram is the compact DAG form of the same decision problem.
// Unlike a decision tree it is NOT a tree — it is a directed acyclic graph laid
// out left-to-right, with decision/chance nodes feeding a single value node.
//
//   decision node = rectangle
//   chance/uncertainty node = oval
//   value/utility node = hexagon
//   arc into a chance node  = relevance / conditioning
//   arc into a decision node = information / sequence  (drawn dashed)
//   arc into the value node  = functional dependence
//
// These types are an additive, self-contained sub-model inside the decisiontree
// folder; they reuse the decision/chance/value node taxonomy but model a graph
// (nodes + directed arcs) rather than a parent→children tree.

/** Node kind in an influence diagram. */
export type InfluenceNodeKind = "decision" | "chance" | "value";

export interface InfluenceNode {
  id: string;
  kind: InfluenceNodeKind;
  label: string;
  /** Optional utility/payoff annotation on a value node. */
  utility?: number;
}

export interface InfluenceArc {
  from: string;
  to: string;
  /**
   * Influence semantics, derived from the destination node kind:
   *  - "information" → arc into a decision (dashed): what is known when deciding
   *  - "relevance"   → arc into a chance node: conditioning / dependence
   *  - "functional"  → arc into the value node: functional dependence
   */
  kind: "information" | "relevance" | "functional";
  /** Optional label on the arc. */
  label?: string;
}

export interface InfluenceAST {
  type: "decisiontree";
  mode: "influence";
  title?: string;
  direction: DTreeDirection;
  nodes: InfluenceNode[];
  arcs: InfluenceArc[];
}

export interface InfluenceLayoutNode {
  node: InfluenceNode;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Longest-path layer index (0 = leftmost). */
  layer: number;
}

export interface InfluenceLayoutArc {
  from: string;
  to: string;
  kind: InfluenceArc["kind"];
  label?: string;
  path: string;
  /** Arrowhead tip + direction for marker rendering. */
  tip: { x: number; y: number; angle: number };
  /** Label anchor (midpoint of the arc). */
  labelAt?: { x: number; y: number };
}

export interface InfluenceLayoutResult {
  width: number;
  height: number;
  nodes: InfluenceLayoutNode[];
  arcs: InfluenceLayoutArc[];
  title?: string;
  direction: DTreeDirection;
}
