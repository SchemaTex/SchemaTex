/**
 * Comparison diagram (comparison) — AST + LayoutScene types.
 *
 * See docs/reference/51-COMPARISON-STANDARD.md.
 *
 * One engine for the whole "compare & organise" family, split across five
 * modes that share a parser, a generic cell-scene layout, and one renderer:
 *
 *   tchart        — 2–N labelled columns of bullet points (T-chart / Y-chart).
 *   pros-cons     — semantic two-column with ✓ (green) / ✗ (red) valence.
 *   matrix        — options (columns) × criteria (rows) qualitative grid,
 *                   cells carry text or yes/no/partial marks.
 *   decision      — the computational mode (Pugh / weighted-scoring matrix):
 *                   weighted numeric scores → the engine computes each option's
 *                   total, ranks them, and highlights the winner.
 *   double-bubble — Thinking Maps compare/contrast: two centres, shared bubbles
 *                   in the middle, unique bubbles fanning out.
 *
 * The differentiator versus `matrix` (the 2×2 / quadrant engine): that one
 * *positions* items on two continuous axes; this one lays out a *table* and,
 * in `decision` mode, *computes the answer* (Pugh, ASQ/Six-Sigma concept
 * selection). They are the two halves people conflate.
 */

// ─── Mode ─────────────────────────────────────────────────────

export type ComparisonMode =
  | "tchart"
  | "pros-cons"
  | "matrix"
  | "decision"
  | "double-bubble";

// ─── Cell values (matrix / decision) ──────────────────────────

/** A normalised mark for qualitative cells. */
export type CellGlyph = "yes" | "no" | "partial" | "na";

/** One option's value for one criterion. Exactly one of text/glyph/score is meaningful. */
export interface CellValue {
  /** Free text content, e.g. "12 months". */
  text?: string;
  /** A normalised yes/no/partial/na mark. */
  glyph?: CellGlyph;
  /** A numeric score (decision mode). */
  score?: number;
  /** The raw token as written (for diagnostics). */
  raw?: string;
}

// ─── tchart ───────────────────────────────────────────────────

export interface ComparisonColumn {
  id: string;
  label: string;
  items: string[];
}

// ─── matrix / decision ────────────────────────────────────────

export interface ComparisonOption {
  id: string;
  label: string;
}

export interface ComparisonCriterion {
  id: string;
  label: string;
  /** Decision mode: relative importance (default 1). */
  weight?: number;
  /** optionId → value. */
  cells: Record<string, CellValue>;
}

// ─── double-bubble ────────────────────────────────────────────

export interface BubbleSpec {
  left: string;
  right: string;
  shared: string[];
  leftOnly: string[];
  rightOnly: string[];
}

// ─── AST root ─────────────────────────────────────────────────

export interface ComparisonAst {
  type: "comparison";
  mode: ComparisonMode;
  title?: string;

  /** tchart */
  columns: ComparisonColumn[];

  /** pros-cons */
  subject?: string;
  pros: string[];
  cons: string[];

  /** matrix / decision */
  options: ComparisonOption[];
  criteria: ComparisonCriterion[];
  /** decision: the Pugh datum option (rendered as the reference column). */
  baseline?: string;

  /** double-bubble */
  bubble?: BubbleSpec;

  legend: "on" | "off";
  warnings: string[];
}

// ─── Computation (decision mode) ──────────────────────────────

export interface DecisionResult {
  /** optionId → weighted total Σ(weight × score). */
  totals: Record<string, number>;
  /** optionId → 1-based rank (1 = best; ties share a rank). */
  ranks: Record<string, number>;
  /** The highest-scoring option (first one on a tie). */
  winnerId: string;
  maxTotal: number;
  /** Sum of all criterion weights (the denominator for a normalised view). */
  totalWeight: number;
  /** decision + baseline: optionId → (total − baselineTotal). */
  deltas?: Record<string, number>;
}

// ─── Layout scene (generic primitives) ────────────────────────

export type CellVariant =
  | "corner" // top-left empty header cell
  | "colHeader" // column / option header
  | "rowHeader" // criterion / row label
  | "body" // normal text cell or list item
  | "pos" // green ✓ valence
  | "neg" // red ✗ valence
  | "warn" // amber ~ valence
  | "pro" // pros-cons positive item (bare row + badge)
  | "con" // pros-cons negative item (bare row + badge)
  | "pillPos" // pros-cons green "PROS" header pill
  | "pillNeg" // pros-cons red "CONS" header pill
  | "weightTag" // small weight chip in a header
  | "total" // totals cell
  | "winner" // winning option's total cell
  | "baseline"; // Pugh datum column header

export interface SceneCell {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Pre-wrapped text lines (layout owns wrapping; renderer just draws). */
  lines: string[];
  variant: CellVariant;
  glyph?: CellGlyph;
  align: "start" | "middle" | "end";
  bold?: boolean;
  /** Optional small superscript tag, e.g. a weight "×5" or rank "#1". */
  tag?: string;
  /** Corner radius (pills / rounded headers). */
  rx?: number;
  /** Draw content only — no background rect or border (pros-cons item rows). */
  bare?: boolean;
  /** Use the alternate (zebra) row fill. */
  zebra?: boolean;
  /** A filled circular badge with a ✓/✗ glyph, drawn at the cell's left. */
  badge?: { glyph: CellGlyph; tone: "pos" | "neg" };
  /** Column colour index (T-chart headers cycle the column palette). */
  paletteIndex?: number;
  /** Draw the fill but no border stroke (T-chart zebra rows). */
  noStroke?: boolean;
  /** Render only the top two corners rounded (T-chart card header band). */
  roundedTop?: boolean;
}

/** A background panel drawn behind cells (T-chart column cards). */
export interface SceneFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  variant: "card";
}

export type BubbleVariant = "center" | "shared" | "unique";

export interface SceneEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  lines: string[];
  variant: BubbleVariant;
  /** "left" / "right" for unique bubbles (theming hook). */
  side?: "left" | "right";
}

export interface SceneConnector {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** A faint divider (T-chart row separators) rather than a normal connector. */
  light?: boolean;
}

export interface ComparisonLayout {
  ast: ComparisonAst;
  mode: ComparisonMode;
  cells: SceneCell[];
  ellipses: SceneEllipse[];
  connectors: SceneConnector[];
  /** Background panels (T-chart column cards). */
  frames?: SceneFrame[];
  /** Computed decision result, when mode === "decision". */
  decision?: DecisionResult;
  /** One-line computed summary (winner), shown below a decision matrix. */
  caption?: string;
  width: number;
  height: number;
}
