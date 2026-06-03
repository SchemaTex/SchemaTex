/**
 * FMEA layout — deterministic pure-SVG worksheet table.
 * Per docs/reference/40-FMEA-STANDARD.md §"Reference images / Visual conventions".
 *
 * Schematex's first table-shaped diagram. We use pure SVG `<rect>`/`<text>`
 * (NOT an HTML `<table>`) to keep the single-SVG-artifact model and the svg.ts
 * builder, and to colour-fill the RPN/AP cell exactly like reference image #1.
 *
 * Layout pass:
 *   - Fixed column model (classic seven-column worksheet + narrow S/O/D/RPN|AP
 *     block, then the optional after-action mirror block).
 *   - Wide prose columns wrap to a max char count; the numeric block stays tight.
 *   - Each row's height = max wrapped-line count across its cells.
 *   - Left item/mode cells vertically merge over contiguous same-item/mode runs.
 *   - "BEFORE ACTION" / "AFTER ACTION" spanning band headers over the score blocks.
 *
 * Deterministic: identical input → identical geometry. No randomness.
 */

import type {
  FmeaAnalysis,
  FmeaAst,
  FmeaCell,
  FmeaColumn,
  FmeaLayoutResult,
  FmeaRow,
} from "./types";
import { analyseFmea } from "./analysis";

export const FMEA_CONST = {
  CANVAS_PAD: 16,
  TITLE_H: 26,
  META_LINE_H: 16,
  BAND_H: 20,
  HEADER_H: 40,
  ROW_MIN_H: 26,
  LINE_H: 13,
  CELL_PAD_X: 6,
  CELL_PAD_Y: 6,
  CHAR_W: 6.0,
  CJK_W: 12,
  NUM_COL_W: 26,
  RPN_COL_W: 38,
  AP_COL_W: 46,
} as const;

interface ColSpec {
  key: string;
  label: string;
  width: number;
  align: "start" | "middle";
  band?: "before" | "after";
  numeric: boolean;
  /** Which row field this column shows (for wrapping). */
  field: (r: FmeaRow) => string;
  /** Suppress in render when the sheet has no after-action data. */
  afterOnly?: boolean;
}

function buildColumnSpecs(hasActions: boolean, rank: FmeaAst["rank"]): ColSpec[] {
  const C = FMEA_CONST;
  const specs: ColSpec[] = [
    { key: "no", label: "#", width: 28, align: "middle", numeric: true, field: (r) => String(r.index) },
    { key: "item", label: "Item / Function", width: 130, align: "start", numeric: false,
      field: (r) => (r.fn ? `${r.item}\n— ${r.fn}` : r.item) },
    { key: "mode", label: "Failure Mode", width: 120, align: "start", numeric: false, field: (r) => r.mode },
    { key: "effect", label: "Effect(s)", width: 120, align: "start", numeric: false,
      field: (r) => (r.effects.length > 1 ? r.effects.join("; ") : r.effect) },
    { key: "sev", label: "S", width: C.NUM_COL_W, align: "middle", band: "before", numeric: true, field: (r) => String(r.sev) },
    { key: "cause", label: "Cause(s)", width: 120, align: "start", numeric: false, field: (r) => r.cause },
    { key: "occ", label: "O", width: C.NUM_COL_W, align: "middle", band: "before", numeric: true, field: (r) => String(r.occ) },
    { key: "controls", label: "Current Controls", width: 120, align: "start", numeric: false,
      field: (r) => controlsText(r) },
    { key: "det", label: "D", width: C.NUM_COL_W, align: "middle", band: "before", numeric: true, field: (r) => String(r.det) },
    { key: "rpn", label: "RPN", width: C.RPN_COL_W, align: "middle", band: "before", numeric: true, field: (r) => String(r.rpn) },
    { key: "ap", label: "AP", width: C.AP_COL_W, align: "middle", band: "before", numeric: true, field: (r) => r.ap },
  ];

  if (hasActions) {
    specs.push(
      { key: "action", label: "Recommended Action", width: 140, align: "start", numeric: false, afterOnly: true,
        field: (r) => actionText(r) },
      { key: "rsev", label: "S", width: C.NUM_COL_W, align: "middle", band: "after", numeric: true, afterOnly: true,
        field: (r) => (r.action ? String(r.action.sev) : "") },
      { key: "rocc", label: "O", width: C.NUM_COL_W, align: "middle", band: "after", numeric: true, afterOnly: true,
        field: (r) => (r.action ? String(r.action.occ) : "") },
      { key: "rdet", label: "D", width: C.NUM_COL_W, align: "middle", band: "after", numeric: true, afterOnly: true,
        field: (r) => (r.action ? String(r.action.det) : "") },
      { key: "rrpn", label: "RPN", width: C.RPN_COL_W, align: "middle", band: "after", numeric: true, afterOnly: true,
        field: (r) => (r.action ? String(r.action.rpn) : "") },
      { key: "rap", label: "AP", width: C.AP_COL_W, align: "middle", band: "after", numeric: true, afterOnly: true,
        field: (r) => (r.action ? r.action.ap : "") },
    );
  }
  // rank only changes which cell carries the primary risk-fill (handled in
  // riskClass()); both RPN and AP columns always render.
  void rank;
  return specs;
}

function controlsText(r: FmeaRow): string {
  const parts: string[] = [];
  if (r.controls?.prevention) parts.push(`P: ${r.controls.prevention}`);
  if (r.controls?.detection) parts.push(`D: ${r.controls.detection}`);
  return parts.join("\n");
}

function actionText(r: FmeaRow): string {
  if (!r.action) return "";
  const parts: string[] = [];
  if (r.action.recommendation) parts.push(r.action.recommendation);
  const meta: string[] = [];
  if (r.action.owner) meta.push(r.action.owner);
  if (r.action.target) meta.push(r.action.target);
  if (r.action.status) meta.push(`[${r.action.status}]`);
  if (meta.length) parts.push(meta.join(" · "));
  return parts.join("\n");
}

/** Crude text width estimate (CJK counted wider). */
function estWidth(s: string): number {
  const cjk = (s.match(/[\u3000-\u9fff\uff00-\uffef]/g) ?? []).length;
  return (s.length - cjk) * FMEA_CONST.CHAR_W + cjk * FMEA_CONST.CJK_W;
}

/** Greedy word-wrap to fit `maxW` px; respects explicit \n. */
export function wrapText(s: string, maxW: number): string[] {
  if (s === "") return [""];
  const out: string[] = [];
  for (const para of s.split("\n")) {
    if (para === "") { out.push(""); continue; }
    const words = para.split(/\s+/).filter((w) => w !== "");
    let line = "";
    for (const w of words) {
      const probe = line ? `${line} ${w}` : w;
      if (line !== "" && estWidth(probe) > maxW) {
        out.push(line);
        line = w;
      } else {
        line = probe;
      }
      // hard-break a single over-long token
      while (estWidth(line) > maxW && line.length > 1) {
        let cut = line.length;
        while (cut > 1 && estWidth(line.slice(0, cut)) > maxW) cut--;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line !== "") out.push(line);
  }
  return out.length ? out : [""];
}

/**
 * Risk-fill class for the RPN cell, per the classic-worksheet thresholds
 * (reference image #1: T=125 shown RED, "Acceptabel <100"). RPN ≥ 100 → red,
 * a mid amber band below, green at the low end.
 */
function rpnRiskClass(rpn: number): string {
  if (rpn >= 100) return "rpn-high";
  if (rpn >= 40) return "rpn-mid";
  return "rpn-low";
}

function apRiskClass(ap: string): string {
  if (ap === "High") return "ap-high";
  if (ap === "Medium") return "ap-mid";
  return "ap-low";
}

export function layoutFmea(ast: FmeaAst, analysisIn?: FmeaAnalysis): FmeaLayoutResult {
  const C = FMEA_CONST;
  const analysis = analysisIn ?? analyseFmea(ast);
  const specs = buildColumnSpecs(analysis.hasActions, ast.rank);

  // Header metadata block height.
  const metaKeys = Object.keys(ast.metadata);
  const legendLines =
    (ast.target !== undefined || ast.acceptable !== undefined ? 1 : 0) +
    (ast.flag ? 1 : 0);
  const metaRows = Math.ceil(metaKeys.length / 2) + legendLines;
  const titleH = ast.title ? C.TITLE_H : 0;
  const metaH = metaRows > 0 ? metaRows * C.META_LINE_H + 6 : 0;

  // Column x positions.
  const startX = C.CANVAS_PAD;
  let x = startX;
  const columns: FmeaColumn[] = [];
  const colX: Record<string, number> = {};
  for (const s of specs) {
    colX[s.key] = x;
    columns.push({
      key: s.key,
      label: s.label,
      x,
      width: s.width,
      align: s.align,
      band: s.band,
      numeric: s.numeric,
    });
    x += s.width;
  }
  const tableW = x - startX;

  const hasBands = analysis.hasActions;
  const bandH = hasBands ? C.BAND_H : 0;

  const topY = C.CANVAS_PAD + titleH + metaH;
  const bandY = topY;
  const headerY = topY + bandH;
  const bodyY = headerY + C.HEADER_H;

  // Wrap every cell, compute per-row height.
  const cells: FmeaCell[] = [];
  const rowHeights: number[] = [];
  const rowY: number[] = [];
  const innerW = (s: ColSpec): number => s.width - C.CELL_PAD_X * 2;

  // pre-wrap
  const wrapped: { spec: ColSpec; row: FmeaRow; lines: string[] }[][] = analysis.rows.map((row) =>
    specs.map((s) => ({ spec: s, row, lines: wrapText(s.field(row), innerW(s)) })),
  );

  analysis.rows.forEach((row, ri) => {
    // A merged item/mode cell's lines are distributed across its span, so a
    // multi-line left cell only contributes ⌈lines / span⌉ to each spanned row.
    const lineCounts = wrapped[ri]!.map((w) => {
      if (cellSuppressed(row, w.spec)) return 0;
      if (w.spec.key === "item" && row.itemFirst && row.itemSpan > 1) {
        return Math.ceil(w.lines.length / row.itemSpan);
      }
      if (w.spec.key === "mode" && row.modeFirst && row.modeSpan > 1) {
        return Math.ceil(w.lines.length / row.modeSpan);
      }
      return w.lines.length;
    });
    const maxLines = Math.max(1, ...lineCounts);
    const h = Math.max(C.ROW_MIN_H, maxLines * C.LINE_H + C.CELL_PAD_Y * 2);
    rowHeights.push(h);
  });

  let yCursor = bodyY;
  analysis.rows.forEach((_row, ri) => {
    rowY.push(yCursor);
    yCursor += rowHeights[ri]!;
  });

  // Build cells (honour vertical merges for item/mode left cells).
  analysis.rows.forEach((row, ri) => {
    const yTop = rowY[ri]!;
    const h = rowHeights[ri]!;
    for (const s of specs) {
      const suppressed = cellSuppressed(row, s);
      if (suppressed) continue; // merged-away — top cell covers it
      let rowSpan = 1;
      let cellH = h;
      if (s.key === "item" && row.itemFirst && row.itemSpan > 1) {
        rowSpan = row.itemSpan;
        cellH = sumRange(rowHeights, ri, row.itemSpan);
      } else if (s.key === "mode" && row.modeFirst && row.modeSpan > 1) {
        rowSpan = row.modeSpan;
        cellH = sumRange(rowHeights, ri, row.modeSpan);
      }
      const lines = wrapped[ri]!.find((w) => w.spec.key === s.key)!.lines;
      const cell: FmeaCell = {
        rowIndex: ri,
        colKey: s.key,
        x: colX[s.key]!,
        y: yTop,
        width: s.width,
        height: cellH,
        lines,
        align: s.align,
        rendered: true,
        rowSpan,
      };
      // Primary risk fill: AP cell when rank=ap, RPN cell when rank=rpn; the
      // *other* gets a subtler band so both stay legible.
      if (s.key === "rpn") cell.riskClass = rpnRiskClass(row.rpn);
      if (s.key === "ap") cell.riskClass = apRiskClass(row.ap);
      if (s.key === "rrpn" && row.action) cell.riskClass = rpnRiskClass(row.action.rpn);
      if (s.key === "rap" && row.action) cell.riskClass = apRiskClass(row.action.ap);
      cells.push(cell);
    }
  });

  const bands: FmeaLayoutResult["bands"] = [];
  if (hasBands) {
    const before = bandSpan(specs, colX, "before");
    const after = bandSpan(specs, colX, "after");
    if (before) bands.push({ label: "BEFORE ACTION", x: before.x, width: before.w, y: bandY, height: bandH });
    if (after) bands.push({ label: "AFTER ACTION", x: after.x, width: after.w, y: bandY, height: bandH });
  }

  const totalH = (rowY.length ? rowY[rowY.length - 1]! + rowHeights[rowHeights.length - 1]! : bodyY) + C.CANVAS_PAD;
  const width = tableW + C.CANVAS_PAD * 2;

  return {
    ast,
    analysis,
    columns,
    headerY,
    headerH: C.HEADER_H,
    bodyY,
    rowHeights,
    rowY,
    cells,
    bands,
    width,
    height: totalH,
  };
}

/** A left cell is suppressed (covered by a merged top cell) when it's a non-first row of its run. */
function cellSuppressed(row: FmeaRow, s: ColSpec): boolean {
  if (s.key === "item") return !row.itemFirst;
  if (s.key === "mode") return !row.modeFirst;
  return false;
}

function sumRange(arr: number[], start: number, count: number): number {
  let s = 0;
  for (let i = start; i < start + count && i < arr.length; i++) s += arr[i]!;
  return s;
}

function bandSpan(
  specs: ColSpec[],
  colX: Record<string, number>,
  band: "before" | "after",
): { x: number; w: number } | undefined {
  const members = specs.filter((s) => s.band === band);
  if (members.length === 0) return undefined;
  const first = members[0]!;
  const last = members[members.length - 1]!;
  const x = colX[first.key]!;
  const right = colX[last.key]! + last.width;
  return { x, w: right - x };
}
