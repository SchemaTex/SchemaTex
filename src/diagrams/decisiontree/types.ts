export type DTreeMode = "decision" | "ml" | "taxonomy";

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
