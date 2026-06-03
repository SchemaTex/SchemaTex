/**
 * Causal Loop Diagram (causalloop / cld) — AST + analysis + LayoutResult types.
 *
 * See docs/reference/41-CAUSAL-LOOP-STANDARD.md.
 *
 * CLD is the qualitative language of system dynamics: variables connected by
 * signed causal links (+ / −) that close into feedback loops. In the
 * "compute, don't just draw" tradition of `faulttree` (§37) and `pert` (§32),
 * this engine's differentiator is *analysis*: it enumerates the feedback loops
 * (simple directed cycles) in the signed digraph and classifies each as
 * **R (reinforcing)** — even number of negative links — or **B (balancing)** —
 * odd number — by Sterman's even/odd polarity rule (Business Dynamics, 2000,
 * ch. 5). The computed R/B verdict is rendered as a first-class glyph at each
 * loop centroid.
 *
 * Types here are the spec. Strict TS — no `any`.
 */

// ─── Vocabulary primitives ────────────────────────────────────

/** Link polarity. `+` = X,Y move the same direction; `−` = opposite. */
export type CausalPolarity = "+" | "-";

/** Loop classification verdict. */
export type LoopKind = "R" | "B";

/** Primary layout strategy. */
export type CausalLoopLayout = "auto" | "circle";

// ─── AST ──────────────────────────────────────────────────────

/** A variable: a neutral noun-phrase quantity that can rise or fall. */
export interface CausalVariable {
  /** Stable identifier (the label text itself; quoting allows spaces / CJK). */
  id: string;
  /** Display label (defaults to id). */
  label: string;
  /** True when only introduced by a link, never declared on its own line. */
  autoCreated?: boolean;
}

/** A causal link "a change in `from` causes a change in `to`", with polarity. */
export interface CausalLink {
  from: string;
  to: string;
  polarity: CausalPolarity;
  /** Significant transport lag — rendered with delay hash marks (‖). */
  delay?: boolean;
  /** Optional short link label. */
  label?: string;
}

/** Author-supplied descriptive phrase for a detected loop (R1 / B1 / …). */
export interface CausalLoopAnnotation {
  /** Loop identifier the author is naming, e.g. "R1" or "B1". */
  id: string;
  /** Descriptive phrase placed beside the loop glyph. */
  phrase: string;
}

export interface CausalLoopAst {
  type: "causalloop";
  title?: string;
  layout: CausalLoopLayout;
  variables: CausalVariable[];
  links: CausalLink[];
  /** Author overrides for loop phrases, keyed off detection-order id (R1/B1). */
  annotations: CausalLoopAnnotation[];
  /** Non-fatal parse notes. */
  warnings: string[];
  metadata?: Record<string, string>;
}

// ─── Computed analysis (the differentiator) ───────────────────

export interface FeedbackLoop {
  /** Detection-order identifier: R1, B1, R2, … */
  id: string;
  kind: LoopKind;
  /** Variable ids in circulation order (the cycle, not repeating the closer). */
  variables: string[];
  /** Link indices (into ast.links) traversed, in circulation order. */
  linkIndices: number[];
  /** Count of negative links around the loop. */
  negativeCount: number;
  /** Author phrase, if any. */
  phrase?: string;
}

export interface CausalLoopAnalysis {
  loops: FeedbackLoop[];
  reinforcing: number;
  balancing: number;
  /** Variable ids that participate in no loop (open causal chain endpoints). */
  variablesInNoLoop: string[];
  /** Link indices that participate in no loop. */
  linksInNoLoop: number[];
  /** Self-links (X → X) — flagged, not classified as loops. */
  selfLinks: number[];
  notes: string[];
}

// ─── Layout output ────────────────────────────────────────────

export interface CausalLoopLayoutNode {
  id: string;
  label: string;
  /** Center x. */
  cx: number;
  /** Center y. */
  cy: number;
  /** Half-width of the (boxless) label bounding box, for link trimming. */
  halfW: number;
  /** Half-height of the label bounding box. */
  halfH: number;
}

export interface CausalLoopLayoutLink {
  linkIndex: number;
  from: string;
  to: string;
  polarity: CausalPolarity;
  delay: boolean;
  label?: string;
  /** SVG path data for the curved arrow. */
  path: string;
  /** Arrowhead anchor (target end, on the target's boundary). */
  headX: number;
  headY: number;
  /** Unit tangent at the head, pointing into the target. */
  headTangentX: number;
  headTangentY: number;
  /** Polarity-glyph anchor (just outside the arrowhead). */
  polarityX: number;
  polarityY: number;
  /** Delay-mark anchor (mid-path) + perpendicular, when delay. */
  delayX?: number;
  delayY?: number;
  delayNormalX?: number;
  delayNormalY?: number;
}

export interface CausalLoopGlyph {
  loop: FeedbackLoop;
  /** Glyph centre (loop centroid). */
  cx: number;
  cy: number;
  /** Circular-arrow radius. */
  r: number;
  /** True when the loop circulates clockwise in screen coords. */
  clockwise: boolean;
  /** Phrase anchor (below the glyph). */
  phraseX: number;
  phraseY: number;
}

export interface CausalLoopLayoutResult {
  ast: CausalLoopAst;
  analysis: CausalLoopAnalysis;
  nodes: CausalLoopLayoutNode[];
  links: CausalLoopLayoutLink[];
  glyphs: CausalLoopGlyph[];
  width: number;
  height: number;
}
