/**
 * PRISMA 2020 flow diagram — AST and layout types.
 *
 * Spec: docs/reference/28-PRISMA-STANDARD.md
 */

export type PrismaMode = "2020-single" | "2020-dual" | "2009";

export type PrismaKind =
  | "systematic-review"
  | "scoping-review"
  | "ipd"
  | "nma";

export type PrismaValidateCounts = "strict" | "warn" | "off";

export interface PrismaSource {
  name: string;
  count: number;
}

export interface PrismaReason {
  name: string;
  count: number;
}

export interface PrismaIdentificationDatabases {
  n: number;
  sources?: PrismaSource[];
  duplicatesRemoved?: number;
  ineligibleAutomation?: number;
  otherRemoved?: number;
}

export interface PrismaIdentificationOther {
  n: number;
  sources?: PrismaSource[];
}

export interface PrismaExclusion {
  n: number;
  reasons?: PrismaReason[];
}

export interface PrismaScreening {
  recordsScreened: number;
  excluded: PrismaExclusion;
  reportsSought?: number;
  reportsNotRetrieved?: number;
}

export interface PrismaEligibility {
  fullTextAssessed: number;
  excluded: PrismaExclusion;
}

export interface PrismaIncluded {
  studies: number;
  reports?: number;
  participants?: number;
}

export interface PrismaPreviousStudies {
  n: number;
  reports?: number;
  sources?: PrismaSource[];
}

export interface PrismaAST {
  type: "prisma";
  mode: PrismaMode;
  kind: PrismaKind;
  title?: string;
  reviewId?: string;
  validateCounts: PrismaValidateCounts;

  previousStudies?: PrismaPreviousStudies;
  identification: PrismaIdentificationDatabases;
  identificationOther?: PrismaIdentificationOther;
  screening: PrismaScreening;
  eligibility: PrismaEligibility;
  included: PrismaIncluded;

  /** Non-fatal messages collected during parse and validation. */
  warnings: string[];
}

// ─── Layout types ───────────────────────────────────────────────

export type PrismaBoxRole =
  | "previous"
  | "id-databases"
  | "id-removed"
  | "id-other"
  | "screening"
  | "screening-excluded"
  | "eligibility"
  | "eligibility-excluded"
  | "included";

export type PrismaLineStyle =
  | "label"
  | "count"
  | "source"
  | "reason"
  | "subtitle";

export interface PrismaTextLine {
  text: string;
  style: PrismaLineStyle;
  /** Indent step inside the box (0 = flush left, 1 = one indent for breakdown lines). */
  indent?: number;
}

export interface PrismaBox {
  role: PrismaBoxRole;
  /** Top-left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
  lines: PrismaTextLine[];
  /** Distinguishes structural classes — main pipeline vs exclusion side-box vs previous-studies. */
  variant: "main" | "exclusion" | "previous";
  /** Which canonical PRISMA stage this box belongs to — controls fill tint. */
  stage: "identification" | "screening" | "included";
}

export type PrismaEdgeKind =
  | "main"
  | "exclusion"
  | "merge-leg"
  | "merge-trunk"
  | "previous";

export interface PrismaEdge {
  kind: PrismaEdgeKind;
  d: string; // SVG path "d"
  /** For data-* annotation. */
  from: PrismaBoxRole | "merge-junction";
  to: PrismaBoxRole | "merge-junction";
}

/** Vertical stage band on the left edge — Identification / Screening / Included. */
export interface PrismaStageBand {
  /** Stage key used for `data-stage` + CSS class. */
  stage: "identification" | "screening" | "included";
  /** Label rendered as rotated vertical text (-90deg). */
  label: string;
  /** Top-left corner of the band rectangle. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Top header bar above an identification column. */
export interface PrismaColumnHeader {
  /** Which identification column this header sits above. */
  column: "databases" | "other";
  /** Header label, already wrapped into one or two lines that fit the column width. */
  labelLines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrismaLayoutResult {
  width: number;
  height: number;
  title?: string;
  boxes: PrismaBox[];
  edges: PrismaEdge[];
  bands: PrismaStageBand[];
  headers: PrismaColumnHeader[];
  warnings: string[];
  mode: PrismaMode;
  kind: PrismaKind;
}
