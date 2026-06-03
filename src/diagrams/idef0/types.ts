/**
 * IDEF0 Function Modeling (idef0) — AST + LayoutResult types.
 *
 * See docs/reference/45-IDEF0-STANDARD.md (FIPS PUB 183).
 *
 * IDEF0 is the federal function-modeling notation: **boxes are functions**, and
 * the arrows around each box are *positional by meaning* — the "ICOM" rule:
 *   I — Inputs    enter the LEFT   edge   (transformed into outputs)
 *   C — Controls  enter the TOP    edge   (rules / constraints)
 *   O — Outputs   exit  the RIGHT  edge   (what the function produces)
 *   M — Mechanisms enter the BOTTOM edge  (the resource/agent performing it)
 *   (Call — a special mechanism pointing DOWN out of the bottom; referenced
 *    here for forward-compat, drawn like M with a downward head.)
 *
 * The engine's differentiator is **structural enforcement**: an arrow's ICOM
 * role *determines* the box edge it must attach to — an output drawn into the
 * top is a validation error, never silently drawn. The analysis pass also
 * assigns/validates decomposition node numbering.
 *
 * v0.1 scope: single-level decomposition (one A0 diagram). The types carry
 * `nodeNumber` and a `tunneled` flag so multi-level node-number propagation and
 * tunnel notation can land later without a breaking change (see standard doc
 * TODO — multi-level + cross-level ICOM balancing deferred to v0.2).
 */

// ─── ICOM roles ───────────────────────────────────────────────

/**
 * The four ICOM roles + Call. The role *is* the side:
 *   input → left, control → top, output → right, mechanism → bottom,
 *   call → bottom (drawn pointing down out of the box).
 */
export type IcomRole = "input" | "control" | "output" | "mechanism" | "call";

/** The box edge an ICOM role attaches to. Derived from the role. */
export type BoxSide = "left" | "top" | "right" | "bottom";

/** Maps an ICOM role to its mandated box side (FIPS 183 §3 ICOM rule). */
export const ICOM_SIDE: Record<IcomRole, BoxSide> = {
  input: "left",
  control: "top",
  output: "right",
  mechanism: "bottom",
  call: "bottom",
};

/** Single-letter ICOM code used for boundary-arrow labels (I1, C2, …). */
export const ICOM_LETTER: Record<IcomRole, "I" | "C" | "O" | "M"> = {
  input: "I",
  control: "C",
  output: "O",
  mechanism: "M",
  call: "M", // a call is a kind of mechanism
};

// ─── Activity (function) box ──────────────────────────────────

export interface Idef0Box {
  /** Author-facing id (referenced by arrows). e.g. "A1". */
  id: string;
  /** Function name — verb phrase, centred in the box. */
  name: string;
  /**
   * Box number 0–6 shown in the lower-right corner. Assigned by the analysis
   * pass from declaration order when not given explicitly.
   */
  number: number;
  /**
   * Hierarchical node number (e.g. "A1", "A21"). v0.1 single-level: the A0
   * diagram's boxes get "A1".."An". Reserved for multi-level propagation.
   */
  nodeNumber?: string;
}

// ─── ICOM arrow ───────────────────────────────────────────────

/**
 * One endpoint of an arrow: either a box (attaching on the ICOM-mandated side)
 * or the diagram boundary (the page frame edge).
 */
export type Idef0Endpoint =
  | { kind: "box"; boxId: string }
  | { kind: "boundary" };

/**
 * An ICOM arrow. Its `role` dictates the *target* side it lands on (Input→left,
 * Control→top, Output→right, Mechanism→bottom). When `from`/`to` reference
 * boxes, the source always leaves a box's RIGHT (its output) and the target is
 * entered on the role-mandated side. A boundary endpoint means the arrow comes
 * from / goes to the page frame (an external interface).
 */
export interface Idef0Arrow {
  /** Source endpoint (box or boundary). */
  from: Idef0Endpoint;
  /** Target endpoint (box or boundary). */
  to: Idef0Endpoint;
  /**
   * ICOM role — *defines the side the arrow attaches to on the box endpoint(s)*.
   * For a box→box arrow this is the role on the *target* box (e.g. an output of
   * A1 that lands on A2's control has role "control").
   */
  role: IcomRole;
  /** Noun-phrase arrow label, placed at the arrow's open end. */
  label: string;
  /**
   * ICOM boundary code (I1/C2/O1/M1…) — assigned by analysis for arrows that
   * touch the diagram boundary. Undefined for purely internal box→box arrows.
   */
  icomCode?: string;
  /**
   * Tunnel flag (FIPS 183 tunneled arrow). Reserved for multi-level balancing;
   * parsed + carried, drawn with parentheses notation when set.
   */
  tunneled?: boolean;
  /** Source line (diagnostics). */
  line?: number;
}

// ─── AST root ─────────────────────────────────────────────────

export interface Idef0Ast {
  type: "idef0";
  /** Model title (the A0 diagram title). */
  title?: string;
  /** Node number of this diagram (default "A0"). */
  node: string;
  /** Optional A-0 context metadata. */
  purpose?: string;
  viewpoint?: string;
  boxes: Idef0Box[];
  arrows: Idef0Arrow[];
  /** Non-fatal notes (box-count guideline, etc.). */
  warnings: string[];
}

// ─── Layout output ────────────────────────────────────────────

export interface Idef0LayoutBox {
  box: Idef0Box;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One drawn arrow with a resolved SVG path + label/head placement. */
export interface Idef0LayoutArrow {
  arrow: Idef0Arrow;
  /** SVG path data (orthogonal routing). */
  path: string;
  /** Arrowhead tip + the direction it points (for the triangle). */
  head: { x: number; y: number; dir: BoxSide };
  /** Label anchor (at the open end). */
  label: { x: number; y: number; anchor: "start" | "middle" | "end" };
  /** True when this arrow routes through the margin (feedback / external). */
  margin: boolean;
}

export interface Idef0LayoutResult {
  ast: Idef0Ast;
  boxes: Idef0LayoutBox[];
  arrows: Idef0LayoutArrow[];
  width: number;
  height: number;
}
