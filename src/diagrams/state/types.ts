/**
 * State Diagram (UML 2.5 / Harel statechart) types.
 *
 * See docs/reference/21-STATE-DIAGRAM-STANDARD.md for the full spec.
 *
 * MVP scope: simple states, composite states (one level of nesting),
 * pseudo-states (initial, final, choice, junction, fork, join, history,
 * deep history, terminate), transitions with trigger/guard/action,
 * notes, and Mermaid `[*]` alias.
 */

export type StateDirection = "LR" | "TB";

export type PseudoStateKind =
  | "initial"
  | "final"
  | "choice"
  | "junction"
  | "fork"
  | "join"
  | "history"
  | "dhistory"
  | "terminate"
  | "entry_point"
  | "exit_point";

export type StateNodeKind = "simple" | "composite" | "pseudo";

/** Activity entries that live inside a state body (entry/exit/do or internal trigger). */
export interface StateActivity {
  /** "entry" | "exit" | "do" | trigger name */
  kind: "entry" | "exit" | "do" | "internal";
  /** raw trigger spec (only for `kind === "internal"`) */
  trigger?: string;
  /** optional guard expression */
  guard?: string;
  /** action body (text after `/`) */
  action?: string;
}

export interface StateNode {
  id: string;
  /** Display label (defaults to id when empty) */
  label: string;
  kind: StateNodeKind;
  /** Only set when kind === "pseudo" */
  pseudoKind?: PseudoStateKind;
  /** Activities inside the state body (for simple + composite states). */
  activities: StateActivity[];
  /** Children — only populated for composite states. */
  children: StateNode[];
  /** When this composite uses orthogonal regions, children are split by region. */
  regions?: StateNode[][];
  /** Parent composite id (undefined = root). */
  parent?: string;
}

export interface StateTransition {
  /** Stable id for this transition (auto-assigned if not provided) */
  id: string;
  from: string;
  to: string;
  trigger?: string;
  guard?: string;
  action?: string;
}

export interface StateNote {
  id: string;
  /** Target state id */
  target: string;
  /** Side (left or right). For block notes, this is "right" by default. */
  side: "left" | "right";
  text: string;
}

export interface StateDiagramAST {
  type: "state";
  title?: string;
  direction: StateDirection;
  /** Top-level states (children of the implicit root). */
  states: StateNode[];
  transitions: StateTransition[];
  notes: StateNote[];
  metadata?: Record<string, string>;
}

// ─── Layout types ────────────────────────────────────────────

export interface StateLayoutNode {
  id: string;
  /** Absolute position of top-left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
  node: StateNode;
  /** Layer index in the local container (0 = leftmost / topmost). */
  layer: number;
  /** Absolute center coordinates of the symbol (used for routing). */
  cx: number;
  cy: number;
  /** Parent composite id (undefined = top level). */
  parent?: string;
}

export interface StateLayoutEdge {
  id: string;
  from: string;
  to: string;
  /** SVG path d= */
  path: string;
  label?: string;
  /** Mid-point used for label placement */
  labelX: number;
  labelY: number;
  /** Text-anchor hint for label */
  labelAnchor?: "start" | "middle" | "end";
  /** Self-loop flag — renderer draws a curved arc instead of using `path`. */
  selfLoop?: boolean;
}

export interface StateLayoutCluster {
  id: string;
  state: StateNode;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Region divider y-positions (absolute) for orthogonal regions. */
  regionDividers?: number[];
}

export interface StateLayoutNote {
  note: StateNote;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Leader line endpoints */
  leader: { x1: number; y1: number; x2: number; y2: number };
  /** Wrapped text lines */
  lines: string[];
}

export interface StateLayoutResult {
  width: number;
  height: number;
  nodes: StateLayoutNode[];
  edges: StateLayoutEdge[];
  notes: StateLayoutNote[];
  clusters: StateLayoutCluster[];
  title?: string;
  direction: StateDirection;
}
