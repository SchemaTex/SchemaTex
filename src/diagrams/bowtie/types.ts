/**
 * Bowtie risk diagram (bowtie) — AST + LayoutResult types.
 *
 * See docs/reference/38-BOWTIE-STANDARD.md.
 * CCPS/EI 2018 element vocabulary + barrier rule set (semantic spec);
 * BowTieXP / bowtiemaster.com colour scheme + escalation-factor placement
 * (visual baseline). Sibling of `faulttree` (§37) in the Risk & Reliability
 * cluster.
 *
 * Unlike `faulttree`, the bowtie does NOT compute probabilities — its value is
 * the barrier inventory and the symmetric, correct-by-construction layout. The
 * engine's edge is the rigid mirror-wing geometry plus structural validation of
 * the barrier rule set (every threat/consequence reaches the knot through ≥ 1
 * barrier; every escalation factor attaches to a named barrier).
 */

// ─── Vocabulary primitives ────────────────────────────────────

export type BowtieLayoutMode = "symmetric" | "compact";

/** Which side of the knot a barrier sits on. */
export type BowtieSide = "prevent" | "mitigate";

// ─── Elements ─────────────────────────────────────────────────

/**
 * An escalation factor (degradation factor) that degrades ONE barrier's
 * effectiveness, optionally itself controlled by an escalation-factor barrier.
 */
export interface BowtieEscalation {
  id: string;
  label: string;
  /** Escalation-factor barriers that protect the degraded barrier, in order. */
  barriers: BowtieEfBarrier[];
}

export interface BowtieEfBarrier {
  id: string;
  label: string;
}

/** A preventative or mitigative barrier on a threat / consequence line. */
export interface BowtieBarrier {
  id: string;
  label: string;
  side: BowtieSide;
  /** Escalation factors hanging off this barrier (drops downward). */
  escalations: BowtieEscalation[];
}

/** A threat: the start of one left-wing line; its barrier chain stops it. */
export interface BowtieThreat {
  id: string;
  label: string;
  /** Preventative barrier chain, declaration order = outermost → innermost. */
  barriers: BowtieBarrier[];
}

/** A consequence: the end of one right-wing line; its barrier chain limits it. */
export interface BowtieConsequence {
  id: string;
  label: string;
  /** Mitigative barrier chain, declaration order = innermost → outermost. */
  barriers: BowtieBarrier[];
}

// ─── AST root ─────────────────────────────────────────────────

export interface BowtieAst {
  type: "bowtie";
  title?: string;
  layout: BowtieLayoutMode;
  /** Optional hazard context header (rendered above the knot). */
  hazard?: string;
  /** The single top event (the knot). Validated to be present. */
  topEvent: string;
  threats: BowtieThreat[];
  consequences: BowtieConsequence[];
  legend?: "on" | "off" | "bottom" | "bottom-right" | "top";
  warnings: string[];
}

// ─── Layout output ────────────────────────────────────────────

export type BowtieNodeRole =
  | "hazard"
  | "topevent"
  | "threat"
  | "consequence"
  | "barrier"
  | "escalation"
  | "ef-barrier";

export interface BowtieLayoutBox {
  id: string;
  role: BowtieNodeRole;
  label: string;
  /** Center x, center y. */
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** For barriers: which wing. */
  side?: BowtieSide;
  /** For barriers / escalations: the line (threat/consequence id) they belong to. */
  lineId?: string;
  /** Chain position for a barrier (0 = outermost). */
  order?: number;
  /** For an escalation: the barrier id it degrades. */
  barrierId?: string;
  /** For an ef-barrier: the escalation id it protects. */
  escalationId?: string;
}

export interface BowtieLayoutTopEvent {
  cx: number;
  cy: number;
  r: number;
  label: string;
}

/** The threat→…→knot→…→consequence flow polyline + its arrowhead anchor. */
export interface BowtieLayoutLine {
  lineId: string;
  side: BowtieSide;
  path: string;
  /** Where the filled arrowhead sits (on the knot boundary). */
  arrow: { x: number; y: number; angle: number };
}

/** A muted vertical "degrades" connector from a barrier down to escalation / ef-barrier. */
export interface BowtieLayoutEscalationLine {
  x: number;
  y1: number;
  y2: number;
}

export interface BowtieLayoutResult {
  ast: BowtieAst;
  topEvent: BowtieLayoutTopEvent;
  boxes: BowtieLayoutBox[];
  lines: BowtieLayoutLine[];
  escalationLines: BowtieLayoutEscalationLine[];
  /** Tie-line from hazard header down to the knot, if a hazard is declared. */
  hazardTie?: { x: number; y1: number; y2: number };
  width: number;
  height: number;
}
