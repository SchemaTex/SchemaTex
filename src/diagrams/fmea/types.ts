/**
 * FMEA (Failure Mode and Effects Analysis) — AST + analysis + LayoutResult types.
 *
 * See docs/reference/40-FMEA-STANDARD.md.
 *
 * Schematex's first deliberately *table-shaped* diagram, in the 🛡 Risk &
 * Reliability cluster (sibling of `faulttree` §37 and `bowtie` §38). The
 * differentiator is computation: the engine multiplies S × O × D → RPN per row,
 * runs the AIAG-VDA severity-primary S/O/D → Action Priority (High/Medium/Low)
 * lookup, sorts the worksheet by the chosen key, and colour-fills the RPN/AP
 * cell by risk threshold — like `faulttree` computing cut sets and `pert`
 * computing the schedule, the deliverable is a *scored, ranked* table, not a
 * blank form.
 *
 * Types are the spec. These live HERE (folder-local), not in src/core/types.ts.
 */

// ─── Vocabulary primitives ────────────────────────────────────

/** FMEA variant. v0.1 carries the marker; MSR (S·F·M) scoring deferred. */
export type FmeaType = "design" | "process" | "msr";

/** Ranking key. AIAG-VDA Action Priority (default) or legacy RPN = S×O×D. */
export type FmeaRankKey = "ap" | "rpn";

/** AIAG-VDA Action Priority level. */
export type FmeaActionPriority = "High" | "Medium" | "Low";

/** A 1–10 rating (Severity / Occurrence / Detection). */
export type FmeaRating = number;

// ─── Source AST (parser output — the nested authoring form) ────

/** Current prevention + detection controls attached to a cause. */
export interface FmeaControls {
  /** Prevention control acting on the cause → drives Occurrence. */
  prevention?: string;
  /** Detection control catching the mode/cause before escape → drives Detection. */
  detection?: string;
}

/** A failure cause (with its Occurrence, controls and Detection). */
export interface FmeaCause {
  text: string;
  /** Occurrence 1–10 (likelihood of the cause). */
  occ: FmeaRating;
  /** Detection 1–10 (1 = caught, 10 = escapes — the inversion trap). */
  det: FmeaRating;
  controls?: FmeaControls;
}

/** A failure effect (carries its own severity; the worst governs the row). */
export interface FmeaEffect {
  text: string;
  /** Severity 1–10 of this effect. */
  sev: FmeaRating;
}

/** A failure mode — bracketed by effect(s) above and cause(s) below. */
export interface FmeaMode {
  text: string;
  effects: FmeaEffect[];
  causes: FmeaCause[];
}

/** An item / function under analysis (a structure element). */
export interface FmeaItem {
  item: string;
  fn?: string;
  modes: FmeaMode[];
}

/**
 * A recommended optimisation action (step 6) keyed to a mode + cause, carrying
 * the re-rated S/O/D used to recompute the "after action" RPN/AP.
 */
export interface FmeaAction {
  /** Mode text this action addresses. */
  mode: string;
  /** Cause text this action addresses (optional — defaults to the mode's first cause). */
  cause?: string;
  /** Recommended action description. */
  recommendation?: string;
  owner?: string;
  target?: string;
  status?: string;
  /** Revised ratings (any subset; missing inherits the current value). */
  revisedSev?: FmeaRating;
  revisedOcc?: FmeaRating;
  revisedDet?: FmeaRating;
}

/** Risk threshold for cell highlighting / flagging. */
export interface FmeaThreshold {
  /** `rpn` (numeric cap) or `ap` (level cut). */
  key: FmeaRankKey;
  /** Comparison operator. */
  op: ">=" | ">" | "<=" | "<" | "==";
  /** RPN numeric value, or an AP level for `ap`. */
  value: number | FmeaActionPriority;
  /** Original expression text (for the header legend). */
  text: string;
}

export interface FmeaAst {
  type: "fmea";
  title?: string;
  fmeaType: FmeaType;
  rank: FmeaRankKey;
  /** Optional flag threshold (rows above are highlighted). */
  flag?: FmeaThreshold;
  /** Optional "acceptable" RPN cap shown in the header legend (classic worksheet). */
  acceptable?: number;
  /** Optional "target value" RPN shown green in the header legend. */
  target?: number;
  items: FmeaItem[];
  actions: FmeaAction[];
  /** Header metadata (number / team / author / date / revision). */
  metadata: Record<string, string>;
  /** Non-fatal authoring warnings (e.g. the Detection-inversion trap). */
  warnings: string[];
}

// ─── Computed analysis (the differentiator) ───────────────────

/**
 * One flat worksheet row = one (item, mode, cause) triple. A mode with N causes
 * expands to N rows; the worst effect's severity governs every row of the mode.
 */
export interface FmeaRow {
  /** 1-based row number after sorting. */
  index: number;
  item: string;
  fn?: string;
  mode: string;
  /** The governing (worst) effect text. */
  effect: string;
  /** All effect texts (for the cell, joined). */
  effects: string[];
  /** Governing severity = max over the mode's effects. */
  sev: FmeaRating;
  cause: string;
  occ: FmeaRating;
  det: FmeaRating;
  controls?: FmeaControls;
  /** RPN = S × O × D (1–1000). */
  rpn: number;
  /** AIAG-VDA Action Priority from (S,O,D). */
  ap: FmeaActionPriority;
  /** True when this row is over the flag threshold. */
  flagged: boolean;

  // After-action (optional — present when a matching `action` exists).
  action?: {
    recommendation?: string;
    owner?: string;
    target?: string;
    status?: string;
    sev: FmeaRating;
    occ: FmeaRating;
    det: FmeaRating;
    rpn: number;
    ap: FmeaActionPriority;
    /** RPN delta (before − after); positive = risk reduced. */
    rpnDelta: number;
  };

  /** True for the first row of a multi-row item (drives left-cell merging). */
  itemFirst: boolean;
  /** Number of rows this item spans (for vertical cell merge). */
  itemSpan: number;
  /** True for the first row of a multi-row mode. */
  modeFirst: boolean;
  /** Number of rows this mode spans. */
  modeSpan: number;
}

export interface FmeaAnalysis {
  rank: FmeaRankKey;
  rows: FmeaRow[];
  /** Count of flagged (over-threshold) rows. */
  flaggedCount: number;
  /** Highest RPN in the sheet. */
  maxRpn: number;
  /** True when any after-action revision is present. */
  hasActions: boolean;
  notes: string[];
}

// ─── Layout output ────────────────────────────────────────────

/** A column in the rendered worksheet. */
export interface FmeaColumn {
  /** Stable key (for data-* + CSS). */
  key: string;
  /** Header label. */
  label: string;
  /** Left x of the column. */
  x: number;
  /** Column width. */
  width: number;
  /** Text alignment of the body cells. */
  align: "start" | "middle";
  /** Which spanning band this column belongs to ("before" | "after" | undefined). */
  band?: "before" | "after";
  /** True for the narrow numeric S/O/D/RPN/AP block. */
  numeric: boolean;
}

/** A single rendered cell (already wrapped + measured). */
export interface FmeaCell {
  rowIndex: number;
  colKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Wrapped text lines (centred vertically). */
  lines: string[];
  align: "start" | "middle";
  /** Merged top cell of a vertical span — suppress lower duplicates. */
  rendered: boolean;
  rowSpan: number;
  /** Risk-fill class for RPN/AP cells: "rpn-high"|"rpn-mid"|"rpn-low"|"ap-high"|… */
  riskClass?: string;
}

export interface FmeaLayoutResult {
  ast: FmeaAst;
  analysis: FmeaAnalysis;
  columns: FmeaColumn[];
  /** y of the top of the column-header row. */
  headerY: number;
  /** Height of the column-header row. */
  headerH: number;
  /** y of the first data row. */
  bodyY: number;
  /** Per-row height (uniform). */
  rowHeights: number[];
  /** y positions of each row top. */
  rowY: number[];
  cells: FmeaCell[];
  /** Spanning band headers ("BEFORE ACTION" / "AFTER ACTION"). */
  bands: { label: string; x: number; width: number; y: number; height: number }[];
  /** Header-metadata block lines (title / number / legend). */
  width: number;
  height: number;
}
