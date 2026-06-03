/**
 * Threat Model (DFD + STRIDE) AST + LayoutResult types.
 *
 * Self-contained engine. The base notation is the Data Flow Diagram
 * (docs/reference/31-DFD-STANDARD.md): external entities, processes, data
 * stores, labelled data flows, and trust-boundary groupings. The STRIDE
 * overlay (docs/reference/46-THREAT-MODEL-STRIDE-STANDARD.md) maps each DFD
 * element type to its applicable threat categories and flags data flows that
 * cross a trust boundary.
 *
 * Types are the spec — see the standard docs for vocabulary provenance.
 */

// ─── STRIDE ───────────────────────────────────────────────────

/** The six STRIDE threat categories (Kohnfelder & Garg 1999; Shostack 2014). */
export type StrideCategory = "S" | "T" | "R" | "I" | "D" | "E";

/** Long names, for `<desc>` and the threat checklist. */
export const STRIDE_NAMES: Record<StrideCategory, string> = {
  S: "Spoofing",
  T: "Tampering",
  R: "Repudiation",
  I: "Information disclosure",
  D: "Denial of service",
  E: "Elevation of privilege",
};

// ─── DFD element kinds ────────────────────────────────────────

export type DfdNodeKind = "external" | "process" | "store";

/** A DFD node: external entity (rectangle), process (circle), data store (open rect). */
export interface DfdNode {
  /** Stable id used in flows / boundaries (process id `1.1`, store id `D1`, or external slug). */
  id: string;
  kind: DfdNodeKind;
  /** Display label. */
  label: string;
  /**
   * For data stores only: explicit Repudiation opt-in. When true, the store is
   * treated as a log/audit/journal store (STRIDE-per-element conditional `R`).
   * Auto-set by name/id heuristic, or by an explicit `log`/`audit` hint.
   */
  logStore?: boolean;
  /** 1-based source line, for diagnostics. */
  line: number;
}

/** A labelled data flow (arrow) between two DFD nodes. */
export interface DfdFlow {
  source: string;
  target: string;
  label: string;
  line: number;
}

/** A trust boundary — a named group of node ids (reused C4-style union+padding box). */
export interface TrustBoundary {
  name: string;
  members: string[];
  line: number;
}

// ─── AST ──────────────────────────────────────────────────────

export interface ThreatModelAst {
  type: "threatmodel";
  title?: string;
  nodes: DfdNode[];
  flows: DfdFlow[];
  boundaries: TrustBoundary[];
}

// ─── Analysis (the differentiator) ────────────────────────────

/** STRIDE-per-element result for one node. */
export interface NodeStride {
  id: string;
  kind: DfdNodeKind;
  /** Applicable STRIDE categories for this element type (in S,T,R,I,D,E order). */
  categories: StrideCategory[];
  /**
   * True when this node is a data store whose `R` was added by the conditional
   * log/audit rule (so renderers can mark it distinctly if desired).
   */
  conditionalR: boolean;
}

/** A data flow tagged with its computed trust-zone crossing state. */
export interface FlowStride {
  source: string;
  target: string;
  label: string;
  /** STRIDE categories applicable to the flow itself (T, I, D). */
  categories: StrideCategory[];
  /** Trust zone (boundary name) of the source endpoint, or null if outside all boundaries. */
  sourceZone: string | null;
  /** Trust zone of the target endpoint, or null. */
  targetZone: string | null;
  /** True when source and target sit in different trust zones — the risk locus. */
  crossesBoundary: boolean;
}

/** An enumerated (element, category) threat candidate — the "walk the diagram" output. */
export interface ThreatCandidate {
  /** Node id, or `"src -> tgt"` for a flow. */
  elementId: string;
  elementKind: DfdNodeKind | "flow";
  category: StrideCategory;
  /** Human-readable line, e.g. `Process "Web Server": Spoofing`. */
  text: string;
  /** True when this candidate belongs to a boundary-crossing flow (higher priority). */
  onCrossing: boolean;
}

export interface ThreatModelAnalysis {
  nodes: NodeStride[];
  flows: FlowStride[];
  /** Data flows that cross a trust boundary (subset of `flows`, crossing first). */
  crossings: FlowStride[];
  /** Full enumerated (element, category) checklist — crossings first. */
  candidates: ThreatCandidate[];
  /** Non-fatal modelling notes. */
  notes: string[];
}

// ─── Layout ───────────────────────────────────────────────────

export interface LaidOutNode extends DfdNode {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Center, convenient for flow routing. */
  cx: number;
  cy: number;
  stride: NodeStride;
}

export interface LaidOutFlow extends FlowStride {
  /** Polyline points (orthogonal-ish), absolute coordinates. */
  points: Array<{ x: number; y: number }>;
  /** Midpoint for the label. */
  labelX: number;
  labelY: number;
}

export interface LaidOutBoundary {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ThreatModelLayout {
  ast: ThreatModelAst;
  analysis: ThreatModelAnalysis;
  nodes: LaidOutNode[];
  flows: LaidOutFlow[];
  boundaries: LaidOutBoundary[];
  width: number;
  height: number;
}
