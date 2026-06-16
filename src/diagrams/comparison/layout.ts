/**
 * Comparison layout — five modes → one generic cell/ellipse scene.
 * Per docs/reference/51-COMPARISON-STANDARD.md §5.
 *
 * Each mode fills the same `ComparisonLayout` (cells + ellipses + connectors),
 * so the renderer stays mode-agnostic. Column widths and row heights are
 * content-sized via a cheap text-metric estimate (no DOM, no deps). All
 * geometry is prescribed and deterministic.
 */

import type {
  ComparisonAst,
  ComparisonLayout,
  SceneCell,
  SceneEllipse,
  SceneConnector,
  SceneFrame,
} from "./types";
import { computeDecision, decisionCaption, fmt } from "./compute";

export const COMPARISON_CONST = {
  PAGE_PAD: 24,
  TITLE_H: 40,
  CAPTION_H: 30,
  HEADER_MIN_H: 36,
  ROW_MIN_H: 34,
  CELL_PAD_X: 12,
  CELL_PAD_Y: 8,
  LINE_H: 16,
  COL_MIN_W: 140,
  COL_MAX_W: 264,
  MARK_COL_MIN_W: 92,
  MARK_COL_MAX_W: 190,
  ROWHEAD_MIN_W: 120,
  ROWHEAD_MAX_W: 230,
  COL_GAP: 0,
  FONT: 12,
  HEADER_FONT: 13,
  // double-bubble — larger, rounder bubbles with generous spacing
  CENTER_RX: 70,
  CENTER_RY: 58,
  SHARED_RX: 60,
  SHARED_RY: 46,
  UNIQUE_RX: 70,
  UNIQUE_RY: 46,
  BUBBLE_VGAP: 22,
  BUBBLE_HGAP: 74,
  // tchart
  TCHART_COL_GAP: 22,
  // pros-cons
  PC_COL_W: 322,
  PC_COL_GAP: 30,
  PC_PILL_H: 40,
  PC_ROW_MIN_H: 40,
  PC_BADGE_R: 11,
} as const;

// ─── Text metrics (estimate; no DOM) ──────────────────────────

function charW(ch: string, fontSize: number): number {
  const cp = ch.codePointAt(0) ?? 0;
  // CJK / full-width ranges → roughly square glyphs.
  if (cp >= 0x2e80 && cp <= 0x9fff) return fontSize;
  if (cp >= 0xac00 && cp <= 0xd7a3) return fontSize; // Hangul
  if (cp >= 0xff00 && cp <= 0xffef) return fontSize; // full-width forms
  if (ch === " ") return fontSize * 0.3;
  if (/[ilj.,:'!|]/.test(ch)) return fontSize * 0.3;
  if (/[mwMW]/.test(ch)) return fontSize * 0.85;
  return fontSize * 0.56;
}

export function measureText(s: string, fontSize: number): number {
  let w = 0;
  for (const ch of s) w += charW(ch, fontSize);
  return w;
}

export function wrapToWidth(s: string, maxW: number, fontSize: number): string[] {
  if (!s) return [""];
  const hasSpaces = /\s/.test(s.trim());
  const tokens = hasSpaces ? s.split(/\s+/).filter(Boolean) : [...s];
  const sep = hasSpaces ? " " : "";
  const lines: string[] = [];
  let cur = "";
  for (const tok of tokens) {
    const trial = cur ? cur + sep + tok : tok;
    if (cur && measureText(trial, fontSize) > maxW) {
      lines.push(cur);
      cur = tok;
    } else {
      cur = trial;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

const C = COMPARISON_CONST;

// ─── Entry ────────────────────────────────────────────────────

export function layoutComparison(ast: ComparisonAst): ComparisonLayout {
  switch (ast.mode) {
    case "tchart":
      return layoutColumns(ast);
    case "pros-cons":
      return layoutProsCons(ast);
    case "matrix":
    case "decision":
      return layoutGrid(ast);
    case "double-bubble":
      return layoutDoubleBubble(ast);
  }
}

function frame(ast: ComparisonAst): { top: number; pad: number } {
  const pad = C.PAGE_PAD;
  const top = pad + (ast.title ? C.TITLE_H : 0);
  return { top, pad };
}

// ─── tchart: N labelled columns of bullet items ───────────────

function layoutColumns(ast: ComparisonAst): ComparisonLayout {
  const { top, pad } = frame(ast);
  const cells: SceneCell[] = [];
  const connectors: SceneConnector[] = [];
  const frames: SceneFrame[] = [];
  const gap = C.TCHART_COL_GAP;
  const headGap = 10;
  const cardPadBottom = 12;
  const textLeft = 16;

  // Column widths from content.
  const colWidths = ast.columns.map((col) => {
    const headW = measureText(col.label, C.HEADER_FONT) + 2 * C.CELL_PAD_X;
    const itemW = Math.max(
      0,
      ...col.items.map((it) => measureText(it, C.FONT) + textLeft + 16)
    );
    return clamp(Math.max(headW, itemW, C.COL_MIN_W), C.COL_MIN_W, C.COL_MAX_W);
  });

  const headerLines = ast.columns.map((col, i) =>
    wrapToWidth(col.label, colWidths[i]! - 2 * C.CELL_PAD_X, C.HEADER_FONT)
  );
  const headerH = Math.max(
    C.HEADER_MIN_H as number,
    ...headerLines.map((l) => l.length * C.LINE_H + 2 * C.CELL_PAD_Y)
  );

  // Pre-wrap items + measure row heights; cards share one (tallest) height.
  const colRows = ast.columns.map((col, i) =>
    col.items.map((it) => {
      const lines = wrapToWidth(it, colWidths[i]! - textLeft - 14, C.FONT);
      return { lines, h: Math.max(C.ROW_MIN_H, lines.length * C.LINE_H + 2 * C.CELL_PAD_Y) };
    })
  );
  const itemsTop = top + headerH + headGap;
  const naturalH = colRows.map(
    (rows) => headerH + headGap + rows.reduce((s, r) => s + r.h, 0) + cardPadBottom
  );
  const cardH = Math.max(headerH + 44, ...naturalH);

  let x = pad;
  ast.columns.forEach((_col, i) => {
    const w = colWidths[i]!;
    // Column card (rounded), with a rounded-top coloured header band.
    frames.push({ x, y: top, w, h: cardH, rx: 12, variant: "card" });
    cells.push({
      x, y: top, w, h: headerH, lines: headerLines[i]!,
      variant: "colHeader", align: "middle", bold: true, paletteIndex: i, roundedTop: true,
    });
    // Item rows — clean text, faint divider between rows (no bullets).
    let cy = itemsTop;
    colRows[i]!.forEach((r, k) => {
      cells.push({ x, y: cy, w, h: r.h, lines: r.lines, variant: "body", align: "start", bare: true });
      if (k < colRows[i]!.length - 1) {
        connectors.push({ x1: x + 14, y1: cy + r.h, x2: x + w - 14, y2: cy + r.h, light: true });
      }
      cy += r.h;
    });
    x += w + gap;
  });
  const totalW = x - pad - gap;

  return {
    ast,
    mode: ast.mode,
    cells,
    ellipses: [],
    connectors,
    frames,
    width: Math.ceil(totalW + 2 * pad),
    height: Math.ceil(top + cardH + pad),
  };
}

// ─── pros-cons: two valence columns ───────────────────────────

function layoutProsCons(ast: ComparisonAst): ComparisonLayout {
  const { top, pad } = frame(ast);
  const cells: SceneCell[] = [];
  const connectors: SceneConnector[] = [];
  const colW = C.PC_COL_W;
  const leftX = pad;
  const rightX = pad + colW + C.PC_COL_GAP;
  const badgeRoom = 2 * C.PC_BADGE_R + 14;

  // Rounded "PROS" / "CONS" pills, centred over each column.
  const pillH = C.PC_PILL_H;
  const pill = (label: string, colX: number, kind: "pro" | "con"): void => {
    const pw = clamp(measureText(label, C.HEADER_FONT) + badgeRoom + 30, 130, colW);
    cells.push({
      x: colX + (colW - pw) / 2,
      y: top,
      w: pw,
      h: pillH,
      lines: [label],
      variant: kind === "pro" ? "pillPos" : "pillNeg",
      align: "middle",
      bold: true,
      rx: pillH / 2,
      badge: { glyph: kind === "pro" ? "yes" : "no", tone: kind === "pro" ? "pos" : "neg" },
    });
  };
  pill("PROS", leftX, "pro");
  pill("CONS", rightX, "con");

  const itemsTop = top + pillH + 14;
  const itemCell = (txt: string, x: number, y: number, kind: "pro" | "con"): SceneCell => {
    const lines = wrapToWidth(txt, colW - badgeRoom - 14, C.FONT);
    const h = Math.max(C.PC_ROW_MIN_H, lines.length * C.LINE_H + 2 * C.CELL_PAD_Y);
    return {
      x, y, w: colW, h, lines, variant: kind, align: "start", bare: true,
      badge: { glyph: kind === "pro" ? "yes" : "no", tone: kind === "pro" ? "pos" : "neg" },
    };
  };

  let ly = itemsTop;
  for (const p of ast.pros) {
    const cell = itemCell(p, leftX, ly, "pro");
    cells.push(cell);
    ly += cell.h;
  }
  let ry = itemsTop;
  for (const c of ast.cons) {
    const cell = itemCell(c, rightX, ry, "con");
    cells.push(cell);
    ry += cell.h;
  }

  const bottom = Math.max(ly, ry);
  // Soft vertical divider down the gutter.
  const dx = leftX + colW + C.PC_COL_GAP / 2;
  connectors.push({ x1: dx, y1: itemsTop, x2: dx, y2: bottom - 6 });

  return {
    ast, mode: ast.mode, cells, ellipses: [], connectors,
    width: colW * 2 + C.PC_COL_GAP + 2 * pad,
    height: Math.ceil(bottom + pad),
  };
}

// ─── matrix / decision: options × criteria grid ───────────────

function layoutGrid(ast: ComparisonAst): ComparisonLayout {
  const { top, pad } = frame(ast);
  const cells: SceneCell[] = [];
  const isDecision = ast.mode === "decision";
  const decision = isDecision ? computeDecision(ast) : undefined;

  const cellText = (oid: string, cid: string): { lines: string[]; glyph?: SceneCell["glyph"]; variant: SceneCell["variant"] } => {
    const v = ast.criteria.find((c) => c.id === cid)!.cells[oid];
    if (!v) return { lines: [], variant: "body" };
    if (v.glyph) {
      const variant = v.glyph === "yes" ? "pos" : v.glyph === "no" ? "neg" : v.glyph === "partial" ? "warn" : "body";
      return { lines: v.glyph === "na" ? ["—"] : [], glyph: v.glyph === "na" ? undefined : v.glyph, variant };
    }
    if (typeof v.score === "number") return { lines: [fmt(v.score)], variant: "body" };
    return { lines: v.text ? [v.text] : [], variant: "body" };
  };

  // Row-header column width.
  const rowHeadW = clamp(
    Math.max(
      C.ROWHEAD_MIN_W,
      ...ast.criteria.map((c) => measureText(c.label, C.FONT) + 2 * C.CELL_PAD_X + (isDecision ? 30 : 0)),
      measureText(isDecision ? "Weighted total" : "", C.FONT) + 2 * C.CELL_PAD_X
    ),
    C.ROWHEAD_MIN_W,
    C.ROWHEAD_MAX_W
  );

  // Option column widths.
  const optW = ast.options.map((o) => {
    const headW = measureText(o.label, C.HEADER_FONT) + 2 * C.CELL_PAD_X;
    const bodyW = Math.max(
      0,
      ...ast.criteria.map((c) => {
        const ct = cellText(o.id, c.id);
        return Math.max(0, ...ct.lines.map((l) => measureText(l, C.FONT))) + 2 * C.CELL_PAD_X;
      })
    );
    return clamp(Math.max(headW, bodyW, C.MARK_COL_MIN_W), C.MARK_COL_MIN_W, C.MARK_COL_MAX_W);
  });

  // Header row geometry.
  const headLines = ast.options.map((o, i) =>
    wrapToWidth(o.label, optW[i]! - 2 * C.CELL_PAD_X, C.HEADER_FONT)
  );
  const headerH = Math.max(C.HEADER_MIN_H, ...headLines.map((l) => l.length * C.LINE_H + 2 * C.CELL_PAD_Y));

  // Corner.
  cells.push({
    x: pad, y: top, w: rowHeadW, h: headerH, lines: ast.title ? [] : [],
    variant: "corner", align: "start",
  });

  // Option headers.
  let hx = pad + rowHeadW;
  const colX: number[] = [];
  ast.options.forEach((o, i) => {
    colX.push(hx);
    const isBase = isDecision && ast.baseline && (o.label === ast.baseline || o.id === ast.baseline);
    cells.push({
      x: hx, y: top, w: optW[i]!, h: headerH,
      lines: headLines[i]!, variant: isBase ? "baseline" : "colHeader", align: "middle", bold: true,
      tag: isBase ? "datum" : undefined,
    });
    hx += optW[i]!;
  });
  const gridW = rowHeadW + optW.reduce((a, b) => a + b, 0);

  // Criterion rows.
  let ry = top + headerH;
  for (const crit of ast.criteria) {
    const labelLines = wrapToWidth(crit.label, rowHeadW - 2 * C.CELL_PAD_X - (isDecision ? 26 : 0), C.FONT);
    const bodyLineCounts = ast.options.map((o) => {
      const ct = cellText(o.id, crit.id);
      const wrapped = ct.lines.flatMap((l, idx) =>
        idx === 0 ? wrapToWidth(l, optW[ast.options.indexOf(o)]! - 2 * C.CELL_PAD_X, C.FONT) : [l]
      );
      return wrapped.length;
    });
    const rowH = Math.max(
      C.ROW_MIN_H,
      labelLines.length * C.LINE_H + 2 * C.CELL_PAD_Y,
      ...bodyLineCounts.map((n) => n * C.LINE_H + 2 * C.CELL_PAD_Y)
    );

    cells.push({
      x: pad, y: ry, w: rowHeadW, h: rowH, lines: labelLines,
      variant: "rowHeader", align: "start",
      tag: isDecision ? `×${fmt(crit.weight ?? 1)}` : undefined,
    });

    ast.options.forEach((o, i) => {
      const ct = cellText(o.id, crit.id);
      const wrapped = ct.lines.length
        ? wrapToWidth(ct.lines[0]!, optW[i]! - 2 * C.CELL_PAD_X, C.FONT)
        : [];
      cells.push({
        x: colX[i]!, y: ry, w: optW[i]!, h: rowH, lines: wrapped,
        variant: ct.variant, glyph: ct.glyph, align: "middle",
      });
    });
    ry += rowH;
  }

  let caption: string | undefined;
  if (isDecision && decision) {
    // Totals row.
    const totalH = C.ROW_MIN_H;
    cells.push({
      x: pad, y: ry, w: rowHeadW, h: totalH, lines: ["Weighted total"],
      variant: "rowHeader", align: "start", bold: true,
    });
    ast.options.forEach((o, i) => {
      const isWin = decision.ranks[o.id] === 1;
      cells.push({
        x: colX[i]!, y: ry, w: optW[i]!, h: totalH,
        lines: [fmt(decision.totals[o.id]!)],
        variant: isWin ? "winner" : "total", align: "middle", bold: true,
        tag: `#${decision.ranks[o.id]}`,
      });
    });
    ry += totalH;

    // Optional delta-vs-datum row.
    if (decision.deltas) {
      const dH = C.ROW_MIN_H;
      cells.push({
        x: pad, y: ry, w: rowHeadW, h: dH, lines: ["vs datum"],
        variant: "rowHeader", align: "start",
      });
      ast.options.forEach((o, i) => {
        const d = decision.deltas![o.id]!;
        const s = d > 0 ? `+${fmt(d)}` : fmt(d);
        cells.push({
          x: colX[i]!, y: ry, w: optW[i]!, h: dH, lines: [s],
          variant: d > 0 ? "pos" : d < 0 ? "neg" : "body", align: "middle",
        });
      });
      ry += dH;
    }
    caption = decisionCaption(ast, decision);
  }

  const captionH = caption ? C.CAPTION_H : 0;
  const result: ComparisonLayout = {
    ast, mode: ast.mode, cells, ellipses: [], connectors: [],
    width: gridW + 2 * pad,
    height: ry + captionH + pad,
  };
  if (decision) result.decision = decision;
  if (caption) result.caption = caption;
  return result;
}

// ─── double-bubble: Thinking Maps compare/contrast ────────────

interface RawEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  lines: string[];
  variant: SceneEllipse["variant"];
  side?: "left" | "right";
}

/**
 * Thinking-Maps double-bubble. The two subjects are centres; shared traits
 * stack in the middle column tied to BOTH centres; each subject's unique traits
 * are *fanned radially* around the outer side of its centre (a circular orbit,
 * not a flat vertical stack). Connectors run centre→bubble; opaque bubbles drawn
 * over them give clean radial spokes. Positions are computed about the origin
 * then translated so the bounding box sits at the page padding.
 */
function layoutDoubleBubble(ast: ComparisonAst): ComparisonLayout {
  const { top, pad } = frame(ast);
  const b = ast.bubble!;
  const rawE: RawEllipse[] = [];
  const rawC: SceneConnector[] = [];

  // Horizontal placement about x = 0 (translated to the page later).
  const dxCS = C.CENTER_RX + 72 + C.SHARED_RX; // centre ↔ shared-column distance
  const lcx = -dxCS;
  const rcx = dxCS;

  // Centres.
  rawE.push({ cx: lcx, cy: 0, rx: C.CENTER_RX, ry: C.CENTER_RY, lines: wrapToWidth(b.left, C.CENTER_RX * 1.4, C.HEADER_FONT), variant: "center", side: "left" });
  rawE.push({ cx: rcx, cy: 0, rx: C.CENTER_RX, ry: C.CENTER_RY, lines: wrapToWidth(b.right, C.CENTER_RX * 1.4, C.HEADER_FONT), variant: "center", side: "right" });

  // Shared bubbles — vertical middle column, tied to both centres.
  const sN = b.shared.length;
  const sStep = 2 * C.SHARED_RY + C.BUBBLE_VGAP;
  const sTotal = sN > 0 ? (sN - 1) * sStep : 0;
  b.shared.forEach((s, i) => {
    const sy = -sTotal / 2 + i * sStep;
    rawE.push({ cx: 0, cy: sy, rx: C.SHARED_RX, ry: C.SHARED_RY, lines: wrapToWidth(s, C.SHARED_RX * 1.6, C.FONT), variant: "shared" });
    rawC.push({ x1: lcx, y1: 0, x2: 0, y2: sy });
    rawC.push({ x1: rcx, y1: 0, x2: 0, y2: sy });
  });

  // Unique bubbles — fanned radially around their centre's outer side.
  const placeFan = (items: string[], cx: number, centreDeg: number, side: "left" | "right"): void => {
    const n = items.length;
    if (n === 0) return;
    const half = Math.min(82, 30 + 17 * (n - 1)); // total fan widens with count
    const stepDeg = n > 1 ? (2 * half) / (n - 1) : 0;
    const stepRad = (stepDeg * Math.PI) / 180;
    const needChord = 2 * C.UNIQUE_RY + 18;
    const rOrbit = Math.max(
      C.CENTER_RX + 104,
      n > 1 ? needChord / (2 * Math.sin(stepRad / 2)) : C.CENTER_RX + 104
    );
    items.forEach((it, i) => {
      const aDeg = n > 1 ? centreDeg - half + stepDeg * i : centreDeg;
      const a = (aDeg * Math.PI) / 180;
      const bx = cx + rOrbit * Math.cos(a);
      const by = rOrbit * Math.sin(a);
      rawE.push({ cx: bx, cy: by, rx: C.UNIQUE_RX, ry: C.UNIQUE_RY, lines: wrapToWidth(it, C.UNIQUE_RX * 1.5, C.FONT), variant: "unique", side });
      rawC.push({ x1: cx, y1: 0, x2: bx, y2: by });
    });
  };
  placeFan(b.leftOnly, lcx, 180, "left");
  placeFan(b.rightOnly, rcx, 0, "right");

  // Bounding box → translate so the top-left sits at (pad, top).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of rawE) {
    minX = Math.min(minX, e.cx - e.rx);
    maxX = Math.max(maxX, e.cx + e.rx);
    minY = Math.min(minY, e.cy - e.ry);
    maxY = Math.max(maxY, e.cy + e.ry);
  }
  const offX = pad - minX;
  const offY = top - minY;

  const ellipses: SceneEllipse[] = rawE.map((e) => ({
    cx: round(e.cx + offX), cy: round(e.cy + offY), rx: e.rx, ry: e.ry,
    lines: e.lines, variant: e.variant, ...(e.side ? { side: e.side } : {}),
  }));
  const connectors: SceneConnector[] = rawC.map((c) => ({
    x1: round(c.x1 + offX), y1: round(c.y1 + offY), x2: round(c.x2 + offX), y2: round(c.y2 + offY),
  }));

  return {
    ast, mode: ast.mode, cells: [], ellipses, connectors,
    width: Math.ceil(maxX - minX + 2 * pad),
    height: Math.ceil(maxY - minY + top + pad),
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
