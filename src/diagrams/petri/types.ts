/**
 * Petri net (place/transition net) — AST and layout types.
 *
 * Spec: docs/reference/34-PETRINET-STANDARD.md
 */

// ─── AST ─────────────────────────────────────────────────────────

export type PetriDirection = "lr" | "tb";
export type PetriTokenStyle = "dots" | "count" | "auto";

/** GSPN transition kinds (Marsan 1995): immediate = filled bar; timed = hollow box. */
export type PetriTransitionKind = "immediate" | "timed";

/**
 * Arc semantics (§2.3):
 *  - standard:  consume/produce per weight (filled arrowhead)
 *  - inhibitor: enabled only if place holds < weight (hollow-circle head); P→T only
 *  - read:      tests presence without consuming (no arrowhead)
 *  - reset:     empties the place on firing (double head); P→T only
 */
export type PetriArcType = "standard" | "inhibitor" | "read" | "reset";

export interface PetriPlace {
  id: string;
  label?: string;
  /** Initial-marking token count (M₀). */
  tokens: number;
  /** Max token capacity K(p); firing that would exceed it is disabled. */
  capacity?: number;
  line?: number;
}

export interface PetriTransition {
  id: string;
  label?: string;
  kind: PetriTransitionKind;
  /** Firing rate λ for timed transitions. */
  rate?: number;
  /** Priority among simultaneously-enabled immediate transitions. */
  priority?: number;
  /** CPN guard — rendered as a label only, not evaluated in v0.1. */
  guard?: string;
  line?: number;
}

export interface PetriArc {
  from: string;
  to: string;
  type: PetriArcType;
  /** Multiplicity (default 1). */
  weight: number;
  label?: string;
  line?: number;
}

export interface PetriAst {
  type: "petri";
  title?: string;
  titleSourceRange?: import("../../core/types").SourceRange;
  direction: PetriDirection;
  tokenStyle: PetriTokenStyle;
  places: PetriPlace[];
  transitions: PetriTransition[];
  arcs: PetriArc[];
  /** Transition ids to fire, in order; the rendered marking is the result. */
  fireSequence: string[];
  warnings: string[];
}

// ─── Layout result ───────────────────────────────────────────────

export interface PetriPlaceBox {
  place: PetriPlace;
  cx: number;
  cy: number;
  r: number;
  /** Token count in the *rendered* marking (after the fire sequence). */
  tokens: number;
  isSource: boolean;
  isSink: boolean;
}

export interface PetriTransitionBox {
  transition: PetriTransition;
  cx: number;
  cy: number;
  w: number;
  h: number;
  enabled: boolean;
  dead: boolean;
}

export interface PetriPoint {
  x: number;
  y: number;
}

export interface PetriArcGeom {
  arc: PetriArc;
  type: PetriArcType;
  weight: number;
  /** Polyline / curve points from source boundary to target boundary. */
  points: PetriPoint[];
  /** Reversed during cycle-removal → routed as a back-edge curve. */
  reversed: boolean;
  /** Weight-label anchor (only used when weight > 1). */
  labelX: number;
  labelY: number;
}

export interface PetriLayoutResult {
  width: number;
  height: number;
  title?: string;
  direction: PetriDirection;
  places: PetriPlaceBox[];
  transitions: PetriTransitionBox[];
  arcs: PetriArcGeom[];
  /** Detected structural subclass for <desc> (state-machine / marked-graph / workflow-net …). */
  subclass?: string;
  /** Enabled transition ids in the rendered marking. */
  enabledIds: string[];
  warnings: string[];
  ast: PetriAst;
}
