/**
 * Event-driven Process Chain (EPC) — AST + LayoutResult types.
 *
 * See docs/reference/44-EPC-STANDARD.md.
 *
 * EPC (ARIS; Keller, Nüttgens & Scheer 1992) is a bipartite control-flow
 * notation: **events** (passive states, red/salmon hexagons) and **functions**
 * (active tasks, green rounded rectangles) strictly alternate along the flow,
 * with **logical connectors** AND (∧) / OR (∨) / XOR (×) — small circles —
 * interposed wherever the chain splits or joins.
 *
 * In the validation-first tradition of `dfd` / `usecase`, the differentiator is
 * **structural validation**, not numeric computation: the engine enforces the
 * event↔function alternation (through connectors), start/end-must-be-events, and
 * the signature rule that an *event must never be the source of an OR/XOR split*
 * — a passive event cannot decide. v0.1 ships plain EPC control flow; eEPC
 * side-attachments (org units / data / systems) are deferred (see doc TODO).
 *
 * Pattern mirrors sibling process engines (bpmn §25, flowchart) for the
 * layered top-down layout, and the flat-declaration + wire-by-id parser shape
 * of `faulttree` §37.
 */

// ─── Vocabulary primitives ────────────────────────────────────

export type EpcDirection = "tb" | "lr";

/** The three ARIS logical connectors. */
export type EpcConnectorKind = "and" | "or" | "xor";

/** Node role in the bipartite control-flow graph. */
export type EpcNodeKind = "event" | "function" | "connector";

// ─── Nodes ────────────────────────────────────────────────────

export interface EpcEvent {
  id: string;
  kind: "event";
  /** Display label (defaults to id). */
  label?: string;
  /** True when only referenced by an arc, never explicitly declared. */
  autoCreated?: boolean;
}

export interface EpcFunction {
  id: string;
  kind: "function";
  label?: string;
  autoCreated?: boolean;
}

export interface EpcConnector {
  id: string;
  kind: "connector";
  operator: EpcConnectorKind;
  autoCreated?: boolean;
}

export type EpcNode = EpcEvent | EpcFunction | EpcConnector;

// ─── Control-flow edges ───────────────────────────────────────

export interface EpcEdge {
  from: string;
  to: string;
  /** Optional edge label (e.g. a guard note); rendered along the arc. */
  label?: string;
  /** Source declaration line (for error messages / determinism of order). */
  line?: number;
}

// ─── AST root ─────────────────────────────────────────────────

export interface EpcAst {
  type: "epc";
  title?: string;
  direction: EpcDirection;
  /** Declaration-ordered nodes (events, functions, connectors). */
  nodes: EpcNode[];
  /** Declaration-ordered control-flow edges. */
  edges: EpcEdge[];
  /** Non-fatal parse-time notes (redeclarations, unrecognised lines). */
  warnings: string[];
  metadata?: Record<string, string>;
}

// ─── Validation output (the differentiator) ───────────────────

export type EpcViolationKind =
  | "alternation"        // event→event / function→function through connectors
  | "event-or-xor-split" // signature rule: an event sources an OR/XOR split
  | "start-end"          // a start or end node is not an event
  | "node-fan-out"       // an event/function has >1 outgoing control-flow arc
  | "node-fan-in"        // an event/function has >1 incoming control-flow arc
  | "undefined-ref"      // an edge references an undeclared id (auto-created)
  | "unreachable"        // node not reachable from any start event
  | "dead-end"           // non-end node with no path to an end event
  | "split-join-balance" // a split of type T not closed by a join of type T (warn)
  | "empty";             // no events at all

export type EpcSeverity = "error" | "warning";

export interface EpcViolation {
  kind: EpcViolationKind;
  severity: EpcSeverity;
  /** AI-readable message. */
  message: string;
  /** The node id(s) the violation concerns. */
  nodes: string[];
  line?: number;
}

export interface EpcAnalysis {
  violations: EpcViolation[];
  /** Start events (no incoming control flow). */
  startIds: string[];
  /** End events (no outgoing control flow). */
  endIds: string[];
  /** True when there are zero `severity:"error"` violations. */
  wellFormed: boolean;
}

// ─── Layout output ────────────────────────────────────────────

export interface EpcLayoutNode {
  node: EpcNode;
  /** Center x. */
  cx: number;
  /** Center y. */
  cy: number;
  width: number;
  height: number;
  /** Layer index (0 = topmost rank). */
  layer: number;
  /** Whether this layout node carries a flagged error (for render emphasis). */
  flagged: boolean;
}

export interface EpcLayoutEdge {
  edge: EpcEdge;
  /** SVG path `d` from source border to target border. */
  path: string;
  /** Arrowhead anchor (target end). */
  tip: { x: number; y: number };
  /** Midpoint (for an optional edge label). */
  mid: { x: number; y: number };
  /** True when this arc routes against the main flow (a loop-back). */
  backEdge: boolean;
}

export interface EpcLayoutResult {
  ast: EpcAst;
  analysis: EpcAnalysis;
  nodes: EpcLayoutNode[];
  edges: EpcLayoutEdge[];
  width: number;
  height: number;
}
