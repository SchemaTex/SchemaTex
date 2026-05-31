/**
 * Fault Tree Analysis (faulttree) — AST + analysis + LayoutResult types.
 *
 * See docs/reference/37-FAULT-TREE-STANDARD.md.
 * Pattern mirrors sibling computed-semantics engines (pert §32, petri §34):
 * the engine does not just draw gate shapes — it *computes* the minimal cut
 * sets (MOCUS, Fussell-Vesely 1972) and the top-event probability, and the
 * computed cut sets are highlighted as a first-class render feature.
 */

// ─── Vocabulary primitives ────────────────────────────────────

export type FaultTreeDirection = "tb" | "bt";

/** Probability quantification method (§2.4). */
export type FaultTreeProbMethod = "rare" | "mcub" | "exact";

/** Gate symbol style — NUREG/ANSI distinctive shapes (default) or IEC rectangular. */
export type FaultTreeGateStyle = "ansi" | "iec";

export type FaultTreeEventKind =
  | "top"          // the single undesired system failure — tree root (rectangle)
  | "intermediate" // a fault that is itself the output of a lower gate (rectangle)
  | "basic"        // primary component failure — a leaf carrying probability (circle)
  | "undeveloped"  // not developed further (diamond)
  | "house"        // external/normal event, forced boolean 0/1 (house glyph)
  | "condition";   // conditioning event for INHIBIT / PAND (ellipse)

export type FaultTreeGateKind =
  | "and"
  | "or"
  | "xor"
  | "voting"
  | "inhibit"
  | "pand";

// ─── Gates ────────────────────────────────────────────────────

/** A Boolean gate that produces a top/intermediate event from its inputs. */
export interface FaultTreeGate {
  kind: FaultTreeGateKind;
  /** Referenced child ids (events or gate-bearing events), in declaration order. */
  inputs: string[];
  /** VOTING k-of-n: threshold. */
  k?: number;
  /** VOTING k-of-n: total inputs. */
  n?: number;
  /** INHIBIT / PAND conditioning event — an id (declared event) or inline text. */
  condition?: string;
  /** PAND left-to-right order of inputs (parsed, rendered, noted; not time-evaluated in v0.1). */
  order?: string[];
}

// ─── Events ───────────────────────────────────────────────────

export interface FaultTreeEvent {
  id: string;
  kind: FaultTreeEventKind;
  /** Display label (defaults to id). */
  label?: string;
  /** For top/intermediate events: the gate that produces this event. */
  gate?: FaultTreeGate;
  /** Basic / undeveloped / conditioning probability (0..1). Undefined = symbolic. */
  prob?: number;
  /** House forced state. */
  state?: 0 | 1;
  /** True when only referenced by an arc (not explicitly declared). */
  autoCreated?: boolean;
}

/** Transfer-out: event `id`'s development lives under the named subtree `name`. */
export interface FaultTreeTransfer {
  id: string;
  name: string;
}

// ─── AST root ─────────────────────────────────────────────────

export interface FaultTreeAst {
  type: "faulttree";
  title?: string;
  direction: FaultTreeDirection;
  probMethod: FaultTreeProbMethod;
  gateStyle: FaultTreeGateStyle;
  analysis: { cutsets: boolean; probability: boolean; pathsets: boolean };
  /** The single top-event id (validated to be exactly one). */
  topId?: string;
  events: FaultTreeEvent[];
  transfers: FaultTreeTransfer[];
  /** Named transfer-in subtrees: name → gate expression. */
  namedSubtrees: Record<string, FaultTreeGate>;
  warnings: string[];
  metadata?: Record<string, string>;
}

// ─── Computed analysis (the differentiator) ───────────────────

export interface FaultTreeCutSet {
  /** Basic/undeveloped/condition event ids forming the cut set, sorted. */
  events: string[];
  /** Cardinality (order-1 = single point of failure). */
  order: number;
  /** P(Cⱼ) = ∏ p(eᵢ); undefined when a member lacks a probability. */
  prob?: number;
  /** True when order === 1. */
  isSpof: boolean;
}

export interface FaultTreeAnalysis {
  cutSets: FaultTreeCutSet[];
  method: FaultTreeProbMethod;
  /** P(top); undefined when probabilities are missing or top is unsatisfiable. */
  topProb?: number;
  /** Basic-event ids that appear in a cut set but carry no probability. */
  missingProb: string[];
  /** True when current house states make the top event impossible (no cut sets). */
  unsatisfiable: boolean;
  /** Cap-exceeded / method-fallback warnings. */
  warnings: string[];
  /** Non-fatal modelling notes (XOR-as-OR, PAND-as-AND, unconnected events, …). */
  notes: string[];
}

// ─── Layout output ────────────────────────────────────────────

export type FaultTreeNodeRole =
  | "top"
  | "intermediate"
  | "basic"
  | "undeveloped"
  | "house"
  | "condition";

export interface FaultTreeLayoutEvent {
  event: FaultTreeEvent;
  /** Unique per-instance id (a duplicated shared leaf gets a suffix). */
  instanceId: string;
  role: FaultTreeNodeRole;
  /** Center x. */
  cx: number;
  /** Top y of the node band. */
  topY: number;
  width: number;
  height: number;
  depth: number;
  /** True when this leaf id is referenced by >1 gate (shared / repeated event). */
  shared: boolean;
}

export interface FaultTreeLayoutGate {
  gate: FaultTreeGate;
  /** Instance id of the event this gate produces. */
  ownerInstanceId: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Conditioning ellipse (INHIBIT / PAND). */
  cond?: { x: number; y: number; w: number; h: number; text: string };
}

export interface FaultTreeLayoutEdge {
  /** Source: the gate owner instance (edge starts at the gate base). */
  fromGateOwner: string;
  /** Target child instance id. */
  to: string;
  path: string;
}

export interface FaultTreeLayoutCutSetBox {
  cutSet: FaultTreeCutSet;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaultTreeLayoutTransfer {
  ownerInstanceId: string;
  name: string;
  /** Triangle apex anchor (below the owner event). */
  x: number;
  y: number;
}

export interface FaultTreeLayoutResult {
  ast: FaultTreeAst;
  analysis: FaultTreeAnalysis;
  events: FaultTreeLayoutEvent[];
  gates: FaultTreeLayoutGate[];
  edges: FaultTreeLayoutEdge[];
  cutSetBoxes: FaultTreeLayoutCutSetBox[];
  transfers: FaultTreeLayoutTransfer[];
  width: number;
  height: number;
}
