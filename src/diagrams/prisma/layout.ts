/**
 * PRISMA 2020 flow diagram layout.
 *
 * Rigid 4-row vertical layout (Identification → Screening → Eligibility → Included),
 * with optional "previous-studies" row on top and optional second Identification
 * column ("other methods") in 2020-dual mode. Layout is deterministic and
 * geometry-only — no font metrics; widths are estimated from an average char width.
 *
 * Spec: docs/reference/28-PRISMA-STANDARD.md §7
 */

import type {
  PrismaAST,
  PrismaBox,
  PrismaBoxRole,
  PrismaColumnHeader,
  PrismaEdge,
  PrismaIdentificationDatabases,
  PrismaIdentificationOther,
  PrismaIncluded,
  PrismaKind,
  PrismaLayoutResult,
  PrismaPreviousStudies,
  PrismaReason,
  PrismaStageBand,
  PrismaTextLine,
} from "./types";

// ─── Tunables ───────────────────────────────────────────────────

export const PRISMA_CONST = {
  ROW_GAP: 56,
  /** Extra gap below the dual-pipeline identification row so the Y-junction
   *  trunk has room to breathe before the screening box. */
  DUAL_MERGE_GAP: 84,
  COL_GAP: 80,           // gap between main pipeline and exclusion side-box
  DUAL_COL_GAP: 56,      // gap between left/right Identification boxes
  OUTER_PAD_X: 24,
  OUTER_PAD_TOP: 20,
  OUTER_PAD_BOTTOM: 20,
  TITLE_HEIGHT: 36,      // reserved when ast.title is set
  WARNING_LINE_HEIGHT: 14,

  BOX_PAD_X: 16,
  BOX_PAD_Y: 12,
  LINE_HEIGHT: 17,
  LABEL_LINE_HEIGHT: 19,
  COUNT_LINE_HEIGHT: 18,
  BOX_RADIUS: 8,
  GAP_AFTER_LABEL: 2,
  GAP_BEFORE_BREAKDOWN: 2,

  MIN_MAIN_WIDTH: 220,
  MAX_MAIN_WIDTH: 380,
  MIN_SIDE_WIDTH: 200,
  MAX_SIDE_WIDTH: 320,

  ARROWHEAD_LEN: 8,

  // Approx char widths (px) for default font stack at 12px.
  CHAR_W_LABEL: 7.0,     // bold 12px label / count
  CHAR_W_BODY: 6.4,      // regular 12px source / reason
  CHAR_W_SUBTITLE: 6.0,

  // Aggregation rule for long reason lists.
  MAX_REASON_LINES: 8,

  // Stage band on the left (rotated text: Identification / Screening / Included).
  LEFT_BAND_WIDTH: 34,
  LEFT_BAND_GAP: 10,
  // Top header bar above each identification column-group. Rendered as an
  // independent horizontal bar separated from the boxes by a gap (mirrors the
  // standalone left-side stage bands).
  TOP_HEADER_LINE_HEIGHT: 16,
  TOP_HEADER_PAD_Y: 6,
  TOP_HEADER_PAD_X: 10,
  TOP_HEADER_GAP: 12,
  CHAR_W_HEADER: 6.8, // bold 12px white-on-accent header text
} as const;

interface BoxSpec {
  role: PrismaBoxRole;
  variant: "main" | "exclusion" | "previous";
  lines: PrismaTextLine[];
  minWidth: number;
  maxWidth: number;
}

// ─── Vocabulary ────────────────────────────────────────────────

function vocab(kind: PrismaKind) {
  const scoping = kind === "scoping-review";
  return {
    identificationHeader: scoping ? "Identification of sources via databases and registers" : "Identification of studies via databases and registers",
    identificationOtherHeader: scoping ? "Identification of sources via other methods" : "Identification of studies via other methods",
    recordsIdentified: scoping ? "Sources identified from:" : "Records identified from:",
    recordsRemovedLabel: scoping ? "Sources removed before screening" : "Records removed before screening",
    duplicatesLabel: "Duplicate records removed",
    automationLabel: "Records marked as ineligible by automation tools",
    otherRemovedLabel: "Records removed for other reasons",
    recordsScreened: scoping ? "Sources screened" : "Records screened",
    recordsExcluded: scoping ? "Sources excluded" : "Records excluded",
    reportsSought: "Reports sought for retrieval",
    reportsNotRetrieved: "Reports not retrieved",
    fullTextAssessed: scoping ? "Sources assessed for eligibility" : "Reports assessed for eligibility",
    reportsExcluded: scoping ? "Sources excluded, with reasons:" : "Reports excluded, with reasons:",
    includedHeader: scoping ? "Sources of evidence included in review" : "Studies included in review",
    studiesLabel: scoping ? "Sources of evidence included" : "Studies included",
    reportsLabel: scoping ? "Reports of included sources" : "Reports of included studies",
    participantsLabel: "Participants in included studies",
    previousHeader: scoping ? "Previous sources" : "Previous studies",
  } as const;
}

// ─── Source / reason aggregation ────────────────────────────────

function aggregateReasons(reasons: PrismaReason[] | undefined): { lines: PrismaReason[]; truncated: number } {
  if (!reasons || reasons.length === 0) return { lines: [], truncated: 0 };
  if (reasons.length <= PRISMA_CONST.MAX_REASON_LINES) return { lines: reasons, truncated: 0 };
  const sorted = [...reasons].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, PRISMA_CONST.MAX_REASON_LINES - 1);
  const tail = sorted.slice(PRISMA_CONST.MAX_REASON_LINES - 1);
  const otherSum = tail.reduce((a, r) => a + r.count, 0);
  return {
    lines: [...head, { name: `Other (${tail.length} reasons)`, count: otherSum }],
    truncated: tail.length,
  };
}

// ─── Box content builders ──────────────────────────────────────

function nFmt(n: number): string {
  return n.toLocaleString("en-US");
}

function buildPreviousBox(prev: PrismaPreviousStudies, kind: PrismaKind): BoxSpec {
  const v = vocab(kind);
  const lines: PrismaTextLine[] = [
    { text: v.previousHeader, style: "label" },
    { text: `Studies (n = ${nFmt(prev.n)})`, style: "count" },
  ];
  if (prev.reports !== undefined) {
    lines.push({ text: `Reports (n = ${nFmt(prev.reports)})`, style: "count" });
  }
  if (prev.sources) {
    for (const s of prev.sources) {
      lines.push({ text: `${s.name} (n = ${nFmt(s.count)})`, style: "source", indent: 1 });
    }
  }
  return { role: "previous", variant: "previous", lines, minWidth: PRISMA_CONST.MIN_MAIN_WIDTH, maxWidth: PRISMA_CONST.MAX_MAIN_WIDTH };
}

function buildIdentificationDatabasesBox(
  id: PrismaIdentificationDatabases,
  kind: PrismaKind,
): BoxSpec {
  const v = vocab(kind);
  const lines: PrismaTextLine[] = [];
  lines.push({ text: v.recordsIdentified, style: "label" });
  if (id.sources && id.sources.length > 0) {
    for (const s of id.sources) {
      lines.push({ text: `${s.name} (n = ${nFmt(s.count)})`, style: "source", indent: 1 });
    }
  }
  lines.push({ text: `Total (n = ${nFmt(id.n)})`, style: "count" });
  return {
    role: "id-databases",
    variant: "main",
    lines,
    minWidth: PRISMA_CONST.MIN_MAIN_WIDTH,
    maxWidth: PRISMA_CONST.MAX_MAIN_WIDTH,
  };
}

/** "Records removed before screening" — its own box in the right column, covered
 *  by the same section header as the identified box. Returns null when there is
 *  nothing to remove. */
function buildIdentificationRemovedBox(
  id: PrismaIdentificationDatabases,
  kind: PrismaKind,
): BoxSpec | null {
  const v = vocab(kind);
  const removed: string[] = [];
  if (id.duplicatesRemoved !== undefined && id.duplicatesRemoved > 0) {
    removed.push(`Duplicate records removed (n = ${nFmt(id.duplicatesRemoved)})`);
  }
  if (id.ineligibleAutomation !== undefined && id.ineligibleAutomation > 0) {
    removed.push(`Marked ineligible by automation (n = ${nFmt(id.ineligibleAutomation)})`);
  }
  if (id.otherRemoved !== undefined && id.otherRemoved > 0) {
    removed.push(`Removed for other reasons (n = ${nFmt(id.otherRemoved)})`);
  }
  if (removed.length === 0) return null;
  const lines: PrismaTextLine[] = [{ text: v.recordsRemovedLabel, style: "label" }];
  for (const r of removed) {
    lines.push({ text: r, style: "reason", indent: 1 });
  }
  return {
    role: "id-removed",
    variant: "exclusion",
    lines,
    minWidth: PRISMA_CONST.MIN_SIDE_WIDTH,
    maxWidth: PRISMA_CONST.MAX_SIDE_WIDTH,
  };
}

function buildIdentificationOtherBox(other: PrismaIdentificationOther, kind: PrismaKind): BoxSpec {
  const v = vocab(kind);
  const lines: PrismaTextLine[] = [];
  lines.push({ text: v.identificationOtherHeader, style: "label" });
  if (other.sources && other.sources.length > 0) {
    for (const s of other.sources) {
      lines.push({ text: `${s.name} (n = ${nFmt(s.count)})`, style: "source", indent: 1 });
    }
  }
  lines.push({ text: `Total (n = ${nFmt(other.n)})`, style: "count" });
  return {
    role: "id-other",
    variant: "main",
    lines,
    minWidth: PRISMA_CONST.MIN_MAIN_WIDTH,
    maxWidth: PRISMA_CONST.MAX_MAIN_WIDTH,
  };
}

function buildScreeningBox(
  recordsScreened: number,
  reportsSought: number | undefined,
  reportsNotRetrieved: number | undefined,
  kind: PrismaKind,
): BoxSpec {
  const v = vocab(kind);
  const lines: PrismaTextLine[] = [
    { text: v.recordsScreened, style: "label" },
    { text: `n = ${nFmt(recordsScreened)}`, style: "count" },
  ];
  if (reportsSought !== undefined) {
    lines.push({ text: v.reportsSought, style: "subtitle" });
    lines.push({ text: `n = ${nFmt(reportsSought)}`, style: "count" });
  }
  if (reportsNotRetrieved !== undefined) {
    lines.push({ text: `${v.reportsNotRetrieved} (n = ${nFmt(reportsNotRetrieved)})`, style: "source" });
  }
  return {
    role: "screening",
    variant: "main",
    lines,
    minWidth: PRISMA_CONST.MIN_MAIN_WIDTH,
    maxWidth: PRISMA_CONST.MAX_MAIN_WIDTH,
  };
}

function buildScreeningExcludedBox(n: number, reasons: PrismaReason[] | undefined, kind: PrismaKind): BoxSpec {
  const v = vocab(kind);
  const { lines: items } = aggregateReasons(reasons);
  const out: PrismaTextLine[] = [
    { text: v.recordsExcluded, style: "label" },
    { text: `n = ${nFmt(n)}`, style: "count" },
  ];
  for (const r of items) {
    out.push({ text: `${r.name} (n = ${nFmt(r.count)})`, style: "reason", indent: 1 });
  }
  return {
    role: "screening-excluded",
    variant: "exclusion",
    lines: out,
    minWidth: PRISMA_CONST.MIN_SIDE_WIDTH,
    maxWidth: PRISMA_CONST.MAX_SIDE_WIDTH,
  };
}

function buildEligibilityBox(fullTextAssessed: number, kind: PrismaKind): BoxSpec {
  const v = vocab(kind);
  return {
    role: "eligibility",
    variant: "main",
    lines: [
      { text: v.fullTextAssessed, style: "label" },
      { text: `n = ${nFmt(fullTextAssessed)}`, style: "count" },
    ],
    minWidth: PRISMA_CONST.MIN_MAIN_WIDTH,
    maxWidth: PRISMA_CONST.MAX_MAIN_WIDTH,
  };
}

function buildEligibilityExcludedBox(n: number, reasons: PrismaReason[] | undefined, kind: PrismaKind): BoxSpec {
  const v = vocab(kind);
  const { lines: items } = aggregateReasons(reasons);
  const out: PrismaTextLine[] = [
    { text: v.reportsExcluded, style: "label" },
    { text: `n = ${nFmt(n)}`, style: "count" },
  ];
  for (const r of items) {
    out.push({ text: `${r.name} (n = ${nFmt(r.count)})`, style: "reason", indent: 1 });
  }
  return {
    role: "eligibility-excluded",
    variant: "exclusion",
    lines: out,
    minWidth: PRISMA_CONST.MIN_SIDE_WIDTH,
    maxWidth: PRISMA_CONST.MAX_SIDE_WIDTH,
  };
}

function buildIncludedBox(inc: PrismaIncluded, kind: PrismaKind): BoxSpec {
  const v = vocab(kind);
  const lines: PrismaTextLine[] = [{ text: v.includedHeader, style: "label" }];
  lines.push({ text: `${v.studiesLabel} (n = ${nFmt(inc.studies)})`, style: "count" });
  if (inc.reports !== undefined) {
    lines.push({ text: `${v.reportsLabel} (n = ${nFmt(inc.reports)})`, style: "count" });
  }
  if (inc.participants !== undefined) {
    lines.push({ text: `${v.participantsLabel} (n = ${nFmt(inc.participants)})`, style: "count" });
  }
  return {
    role: "included",
    variant: "main",
    lines,
    minWidth: PRISMA_CONST.MIN_MAIN_WIDTH,
    maxWidth: PRISMA_CONST.MAX_MAIN_WIDTH,
  };
}

// ─── Sizing ─────────────────────────────────────────────────────

function charWidthFor(style: PrismaTextLine["style"]): number {
  switch (style) {
    case "label":
    case "count":
      return PRISMA_CONST.CHAR_W_LABEL;
    case "subtitle":
      return PRISMA_CONST.CHAR_W_SUBTITLE;
    default:
      return PRISMA_CONST.CHAR_W_BODY;
  }
}

function lineHeightFor(style: PrismaTextLine["style"]): number {
  switch (style) {
    case "label":
      return PRISMA_CONST.LABEL_LINE_HEIGHT;
    case "count":
      return PRISMA_CONST.COUNT_LINE_HEIGHT;
    default:
      return PRISMA_CONST.LINE_HEIGHT;
  }
}

function naturalWidthFor(line: PrismaTextLine): number {
  const indentPx = (line.indent ?? 0) * 10;
  return Math.ceil(line.text.length * charWidthFor(line.style) + indentPx);
}

function wrapLine(line: PrismaTextLine, contentWidth: number): PrismaTextLine[] {
  const indentPx = (line.indent ?? 0) * 10;
  const available = Math.max(40, contentWidth - indentPx);
  const cw = charWidthFor(line.style);
  const maxChars = Math.max(8, Math.floor(available / cw));
  if (line.text.length <= maxChars) return [line];
  // Greedy word wrap.
  const words = line.text.split(/\s+/);
  const out: PrismaTextLine[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if ((cur + " " + w).length > maxChars) {
      out.push({ ...line, text: cur });
      cur = w;
    } else {
      cur = cur + " " + w;
    }
  }
  if (cur) out.push({ ...line, text: cur });
  return out;
}

function sizeBox(spec: BoxSpec): { width: number; height: number; wrappedLines: PrismaTextLine[] } {
  const natural = spec.lines.reduce((m, l) => Math.max(m, naturalWidthFor(l)), 0);
  const contentWidth = Math.min(
    Math.max(natural, spec.minWidth - 2 * PRISMA_CONST.BOX_PAD_X),
    spec.maxWidth - 2 * PRISMA_CONST.BOX_PAD_X,
  );
  const wrappedLines: PrismaTextLine[] = [];
  for (const l of spec.lines) {
    wrappedLines.push(...wrapLine(l, contentWidth));
  }
  const innerHeight = wrappedLines.reduce((h, l) => h + lineHeightFor(l.style), 0);
  return {
    width: Math.ceil(contentWidth + 2 * PRISMA_CONST.BOX_PAD_X),
    height: Math.ceil(innerHeight + 2 * PRISMA_CONST.BOX_PAD_Y),
    wrappedLines,
  };
}

// ─── Layout ─────────────────────────────────────────────────────

export function layoutPrisma(ast: PrismaAST): PrismaLayoutResult {
  const boxes: PrismaBox[] = [];
  const edges: PrismaEdge[] = [];
  const warnings = [...ast.warnings];

  const dual = ast.mode === "2020-dual" && !!ast.identificationOther;

  // Build & size every box.
  const previousSpec = ast.previousStudies ? buildPreviousBox(ast.previousStudies, ast.kind) : null;
  const previousSized = previousSpec ? sizeBox(previousSpec) : null;

  const idLeftSpec = buildIdentificationDatabasesBox(ast.identification, ast.kind);
  const idLeftSized = sizeBox(idLeftSpec);

  const idRemovedSpec = buildIdentificationRemovedBox(ast.identification, ast.kind);
  const idRemovedSized = idRemovedSpec ? sizeBox(idRemovedSpec) : null;

  const idRightSpec = dual ? buildIdentificationOtherBox(ast.identificationOther!, ast.kind) : null;
  const idRightSized = idRightSpec ? sizeBox(idRightSpec) : null;

  const screeningSpec = buildScreeningBox(
    ast.screening.recordsScreened,
    ast.screening.reportsSought,
    ast.screening.reportsNotRetrieved,
    ast.kind,
  );
  const screeningSized = sizeBox(screeningSpec);

  const screeningExcSpec = buildScreeningExcludedBox(
    ast.screening.excluded.n,
    ast.screening.excluded.reasons,
    ast.kind,
  );
  const screeningExcSized = sizeBox(screeningExcSpec);

  const eligibilitySpec = buildEligibilityBox(ast.eligibility.fullTextAssessed, ast.kind);
  const eligibilitySized = sizeBox(eligibilitySpec);

  const eligibilityExcSpec = buildEligibilityExcludedBox(
    ast.eligibility.excluded.n,
    ast.eligibility.excluded.reasons,
    ast.kind,
  );
  const eligibilityExcSized = sizeBox(eligibilityExcSpec);

  const includedSpec = buildIncludedBox(ast.included, ast.kind);
  const includedSized = sizeBox(includedSpec);

  // ── Column widths ─────────────────────────────────────────────
  // Main pipeline column (identified / screened / assessed / included).
  const mainW = Math.max(
    idLeftSized.width,
    screeningSized.width,
    eligibilitySized.width,
    includedSized.width,
    previousSized ? previousSized.width : 0,
    PRISMA_CONST.MIN_MAIN_WIDTH,
  );
  // Right column — the "removed / excluded" column. id-removed and the two
  // excluded boxes share one width so they line up vertically.
  const rightColW = Math.max(
    screeningExcSized.width,
    eligibilityExcSized.width,
    idRemovedSized ? idRemovedSized.width : 0,
    PRISMA_CONST.MIN_SIDE_WIDTH,
  );
  // Other-methods column (dual only).
  const otherColW =
    dual && idRightSized
      ? Math.max(idRightSized.width, PRISMA_CONST.MIN_MAIN_WIDTH)
      : 0;

  // ── X geometry (canonical, left-aligned column layout) ────────
  //   [band] [main col] (gap) [right col: removed/excluded] (gap) [other col]
  const leftBandOffset = PRISMA_CONST.LEFT_BAND_WIDTH + PRISMA_CONST.LEFT_BAND_GAP;
  const mainColLeft = PRISMA_CONST.OUTER_PAD_X + leftBandOffset + PRISMA_CONST.OUTER_PAD_X;
  const mainColCenterX = mainColLeft + mainW / 2;
  const rightColLeft = mainColLeft + mainW + PRISMA_CONST.COL_GAP;
  const otherColLeft = rightColLeft + rightColW + PRISMA_CONST.COL_GAP;
  const otherColCenterX = otherColLeft + otherColW / 2;
  const rightmost = dual ? otherColLeft + otherColW : rightColLeft + rightColW;
  const pageWidth = Math.ceil(rightmost + PRISMA_CONST.OUTER_PAD_X);

  // ── Section headers (column-group banners) ────────────────────
  const v = vocab(ast.kind);
  const headers: PrismaColumnHeader[] = [];
  // The orange "databases & registers" banner spans the identification-row
  // columns it covers: id-databases, plus id-removed when present.
  const dbSectionLeft = mainColLeft;
  const dbSectionRight = idRemovedSpec ? rightColLeft + rightColW : mainColLeft + mainW;
  const dbHeaderW = dbSectionRight - dbSectionLeft;
  const otherHeaderW = otherColW;
  const dbHeaderLines = wrapHeaderLabel(v.identificationHeader, dbHeaderW);
  const otherHeaderLines = dual ? wrapHeaderLabel(v.identificationOtherHeader, otherHeaderW) : [];
  const headerLineCount = Math.max(dbHeaderLines.length, otherHeaderLines.length, 1);
  const headerHeight = headerHeightFor(headerLineCount);

  // ── Vertical positions ────────────────────────────────────────
  const titleH = ast.title ? PRISMA_CONST.TITLE_HEIGHT : 0;
  let cursorY = PRISMA_CONST.OUTER_PAD_TOP + titleH;

  // Previous studies row (optional) — main column, above the section header.
  let identificationBandTop = -1;
  let previousBoxBottom = -1;
  let previousBoxCenterX = mainColCenterX;
  if (previousSpec && previousSized) {
    identificationBandTop = cursorY;
    boxes.push({
      role: "previous",
      variant: "previous",
      stage: "identification",
      x: mainColLeft,
      y: cursorY,
      width: mainW,
      height: previousSized.height,
      lines: previousSized.wrappedLines,
    });
    previousBoxBottom = cursorY + previousSized.height;
    previousBoxCenterX = mainColCenterX;
    cursorY = previousBoxBottom + PRISMA_CONST.ROW_GAP;
  }

  // Section header row (independent column-group banner above the id boxes).
  const headerRowY = cursorY;
  cursorY += headerHeight + PRISMA_CONST.TOP_HEADER_GAP;

  // Identification row.
  const idRowY = cursorY;
  // The vertical stage band brackets the cards only — it starts at the id-box
  // top, not the header bar (which is its own standalone horizontal banner).
  if (identificationBandTop < 0) identificationBandTop = idRowY;
  const idDbBox = resizeBoxToWidth(idLeftSpec, mainW);
  boxes.push({
    role: "id-databases",
    variant: "main",
    stage: "identification",
    x: mainColLeft,
    y: idRowY,
    width: mainW,
    height: idDbBox.height,
    lines: idDbBox.wrappedLines,
  });
  headers.push({
    column: "databases",
    labelLines: dbHeaderLines,
    x: dbSectionLeft,
    y: headerRowY,
    width: dbHeaderW,
    height: headerHeight,
  });
  let idRowBottom = idRowY + idDbBox.height;

  // Records removed before screening (right column).
  let idRemovedHeight = 0;
  if (idRemovedSpec) {
    const removedBox = resizeBoxToWidth(idRemovedSpec, rightColW);
    idRemovedHeight = removedBox.height;
    boxes.push({
      role: "id-removed",
      variant: "exclusion",
      stage: "identification",
      x: rightColLeft,
      y: idRowY,
      width: rightColW,
      height: removedBox.height,
      lines: removedBox.wrappedLines,
    });
    idRowBottom = Math.max(idRowBottom, idRowY + removedBox.height);
  }

  // Identification via other methods (other column, dual).
  let idOtherHeight = 0;
  if (dual && idRightSpec) {
    const otherBox = resizeBoxToWidth(idRightSpec, otherColW);
    idOtherHeight = otherBox.height;
    boxes.push({
      role: "id-other",
      variant: "main",
      stage: "identification",
      x: otherColLeft,
      y: idRowY,
      width: otherColW,
      height: otherBox.height,
      lines: otherBox.wrappedLines,
    });
    headers.push({
      column: "other",
      labelLines: otherHeaderLines,
      x: otherColLeft,
      y: headerRowY,
      width: otherColW,
      height: headerHeight,
    });
    idRowBottom = Math.max(idRowBottom, idRowY + otherBox.height);
  }

  const identificationBandBottom = idRowBottom;
  const afterIdGap = dual ? PRISMA_CONST.DUAL_MERGE_GAP : PRISMA_CONST.ROW_GAP;
  cursorY = idRowBottom + afterIdGap;

  // Screening row.
  const screeningY = cursorY;
  const screeningResized = resizeBoxToWidth(screeningSpec, mainW);
  boxes.push({
    role: "screening",
    variant: "main",
    stage: "screening",
    x: mainColLeft,
    y: screeningY,
    width: mainW,
    height: screeningResized.height,
    lines: screeningResized.wrappedLines,
  });
  const screeningExcResized = resizeBoxToWidth(screeningExcSpec, rightColW);
  const screeningExcY = screeningY;
  boxes.push({
    role: "screening-excluded",
    variant: "exclusion",
    stage: "screening",
    x: rightColLeft,
    y: screeningExcY,
    width: rightColW,
    height: screeningExcResized.height,
    lines: screeningExcResized.wrappedLines,
  });
  const screeningRowBottom = Math.max(
    screeningY + screeningResized.height,
    screeningExcY + screeningExcResized.height,
  );
  cursorY = screeningRowBottom + PRISMA_CONST.ROW_GAP;

  // Eligibility row.
  const eligY = cursorY;
  const eligResized = resizeBoxToWidth(eligibilitySpec, mainW);
  boxes.push({
    role: "eligibility",
    variant: "main",
    stage: "screening",
    x: mainColLeft,
    y: eligY,
    width: mainW,
    height: eligResized.height,
    lines: eligResized.wrappedLines,
  });
  const eligExcResized = resizeBoxToWidth(eligibilityExcSpec, rightColW);
  const eligExcY = eligY;
  boxes.push({
    role: "eligibility-excluded",
    variant: "exclusion",
    stage: "screening",
    x: rightColLeft,
    y: eligExcY,
    width: rightColW,
    height: eligExcResized.height,
    lines: eligExcResized.wrappedLines,
  });
  const eligRowBottom = Math.max(
    eligY + eligResized.height,
    eligExcY + eligExcResized.height,
  );
  cursorY = eligRowBottom + PRISMA_CONST.ROW_GAP;

  // Included row.
  const incY = cursorY;
  const incResized = resizeBoxToWidth(includedSpec, mainW);
  boxes.push({
    role: "included",
    variant: "main",
    stage: "included",
    x: mainColLeft,
    y: incY,
    width: mainW,
    height: incResized.height,
    lines: incResized.wrappedLines,
  });
  cursorY = incY + incResized.height + PRISMA_CONST.OUTER_PAD_BOTTOM;

  // ── Edges ─────────────────────────────────────────────────────
  const arrow = (x1: number, y1: number, x2: number, y2: number): string =>
    `M ${x1} ${y1} L ${x2} ${y2}`;
  const mainColRight = mainColLeft + mainW;
  const rightColArrowEnd = rightColLeft - PRISMA_CONST.ARROWHEAD_LEN;

  // Horizontal: Records identified → Records removed before screening.
  if (idRemovedSpec) {
    const ay = idRowY + Math.min(idDbBox.height, idRemovedHeight) / 2;
    edges.push({
      kind: "exclusion",
      from: "id-databases",
      to: "id-removed",
      d: arrow(mainColRight, ay, rightColArrowEnd, ay),
    });
  }

  // Identification → screening (+ dual merge of the other-methods stream).
  if (dual && idRightSpec) {
    const midY = idRowBottom + afterIdGap / 2;
    // Databases stream is the trunk: straight down at the main column centre.
    edges.push({
      kind: "merge-trunk",
      from: "id-databases",
      to: "screening",
      d: arrow(mainColCenterX, idRowY + idDbBox.height, mainColCenterX, screeningY - PRISMA_CONST.ARROWHEAD_LEN),
    });
    // Other-methods stream drops, then runs left to join the trunk at the midline.
    edges.push({
      kind: "merge-leg",
      from: "id-other",
      to: "merge-junction",
      d: `M ${otherColCenterX} ${idRowY + idOtherHeight} L ${otherColCenterX} ${midY} L ${mainColCenterX} ${midY}`,
    });
  } else {
    edges.push({
      kind: "main",
      from: "id-databases",
      to: "screening",
      d: arrow(mainColCenterX, idRowY + idDbBox.height, mainColCenterX, screeningY - PRISMA_CONST.ARROWHEAD_LEN),
    });
  }

  // Previous studies → identification section (dashed arrow into the header cap).
  if (previousBoxBottom >= 0) {
    edges.push({
      kind: "previous",
      from: "previous",
      to: "id-databases",
      d: arrow(previousBoxCenterX, previousBoxBottom, mainColCenterX, headerRowY - PRISMA_CONST.ARROWHEAD_LEN),
    });
  }

  // Screening → Eligibility → Included (main pipeline).
  edges.push({
    kind: "main",
    from: "screening",
    to: "eligibility",
    d: arrow(mainColCenterX, screeningY + screeningResized.height, mainColCenterX, eligY - PRISMA_CONST.ARROWHEAD_LEN),
  });
  edges.push({
    kind: "main",
    from: "eligibility",
    to: "included",
    d: arrow(mainColCenterX, eligY + eligResized.height, mainColCenterX, incY - PRISMA_CONST.ARROWHEAD_LEN),
  });

  // Horizontal exclusion arrows (main → right-column excluded box).
  const screeningArrowY = screeningY + screeningResized.height / 2;
  edges.push({
    kind: "exclusion",
    from: "screening",
    to: "screening-excluded",
    d: arrow(mainColRight, screeningArrowY, rightColArrowEnd, screeningArrowY),
  });
  const eligArrowY = eligY + eligResized.height / 2;
  edges.push({
    kind: "exclusion",
    from: "eligibility",
    to: "eligibility-excluded",
    d: arrow(mainColRight, eligArrowY, rightColArrowEnd, eligArrowY),
  });

  // Warnings row — reserve space if there are any to print.
  let pageHeight = cursorY;
  if (warnings.length > 0) {
    pageHeight += warnings.length * PRISMA_CONST.WARNING_LINE_HEIGHT + 8;
  }

  // ── Stage bands (left) ────────────────────────────────────────
  // Three canonical bands (PRISMA 2020): Identification / Screening / Included.
  // Screening band covers the screening + eligibility rows; previous-studies, if
  // present, is conceptually part of Identification.
  const bandX = PRISMA_CONST.OUTER_PAD_X;
  const bandW = PRISMA_CONST.LEFT_BAND_WIDTH;

  // Identification band: from the top of the header bar (or prev row) down to the
  // bottom of the identification row.
  const idBandTop = identificationBandTop;
  const idBandBottom = identificationBandBottom;
  // Screening band: covers screening row + eligibility row.
  const scrBandTop = screeningY;
  const scrBandBottom = eligRowBottom;
  // Included band: just the included row.
  const incBandTop = incY;
  const incBandBottom = incY + incResized.height;

  const bands: PrismaStageBand[] = [
    {
      stage: "identification",
      label: "Identification",
      x: bandX,
      y: idBandTop,
      width: bandW,
      height: Math.max(40, idBandBottom - idBandTop),
    },
    {
      stage: "screening",
      label: "Screening",
      x: bandX,
      y: scrBandTop,
      width: bandW,
      height: Math.max(40, scrBandBottom - scrBandTop),
    },
    {
      stage: "included",
      label: "Included",
      x: bandX,
      y: incBandTop,
      width: bandW,
      height: Math.max(40, incBandBottom - incBandTop),
    },
  ];

  const result: PrismaLayoutResult = {
    width: pageWidth,
    height: Math.ceil(pageHeight),
    boxes,
    edges,
    bands,
    headers,
    warnings,
    mode: ast.mode,
    kind: ast.kind,
  };
  if (ast.title !== undefined) result.title = ast.title;
  return result;
}

/** Re-flow the box content to fit a chosen final width (since the natural width may have been smaller than `mainW`). */
function resizeBoxToWidth(spec: BoxSpec, targetWidth: number): { width: number; height: number; wrappedLines: PrismaTextLine[] } {
  const contentWidth = Math.max(40, targetWidth - 2 * PRISMA_CONST.BOX_PAD_X);
  const wrappedLines: PrismaTextLine[] = [];
  for (const l of spec.lines) {
    wrappedLines.push(...wrapLine(l, contentWidth));
  }
  const innerHeight = wrappedLines.reduce((h, l) => h + lineHeightFor(l.style), 0);
  return {
    width: targetWidth,
    height: Math.ceil(innerHeight + 2 * PRISMA_CONST.BOX_PAD_Y),
    wrappedLines,
  };
}

export function lineHeightForLine(style: PrismaTextLine["style"]): number {
  return lineHeightFor(style);
}

/** Wrap a column-header label so it fits the column width. At most 2 lines; if
 *  even after wrapping the longest word is too wide, the line will simply overflow
 *  visually (we don't truncate, to preserve the canonical wording). */
function wrapHeaderLabel(label: string, columnWidth: number): string[] {
  const inner = Math.max(40, columnWidth - 2 * PRISMA_CONST.TOP_HEADER_PAD_X);
  const cw = PRISMA_CONST.CHAR_W_HEADER;
  const maxChars = Math.max(8, Math.floor(inner / cw));
  if (label.length <= maxChars) return [label];

  const words = label.split(/\s+/);
  // Two-line greedy balanced wrap: find the split index that minimises the
  // length difference between the two lines while still fitting maxChars.
  let best: [string, string] | null = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    if (a.length <= maxChars && b.length <= maxChars) {
      if (!best || Math.abs(a.length - b.length) < Math.abs(best[0].length - best[1].length)) {
        best = [a, b];
      }
    }
  }
  if (best) return best;
  // Fallback: simple greedy 2-line wrap.
  let cur = "";
  const lines: string[] = [];
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === 1) {
        // Second line keeps the rest as-is.
        const rest = words.slice(words.indexOf(w) + 1);
        if (rest.length > 0) cur = cur + " " + rest.join(" ");
        break;
      }
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function headerHeightFor(lineCount: number): number {
  return Math.max(1, lineCount) * PRISMA_CONST.TOP_HEADER_LINE_HEIGHT + 2 * PRISMA_CONST.TOP_HEADER_PAD_Y;
}
