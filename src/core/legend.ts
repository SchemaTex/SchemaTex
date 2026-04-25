/**
 * Shared legend renderer.
 *
 * Pipeline:
 *   buildXxxLegend(ast, theme)    → auto LegendSpec
 *   applyLegendOverrides(spec, o) → final LegendSpec
 *   renderLegend(spec, ...)        → { svg, bbox }
 *
 * Standard positions (others are silently aliased):
 *   - "bottom-inline" (default)  horizontal strip below the diagram, no box.
 *   - "bottom-right"             compact overlay anchored at bottom-right corner.
 *   - "none"                     not rendered.
 */

import type { BaseTheme } from "./theme";
import type {
  LegendItem,
  LegendLinePattern,
  LegendOverrides,
  LegendPosition,
  LegendSection,
  LegendSpec,
} from "./types";
import {
  el,
  group,
  rect,
  circle,
  line as lineEl,
  path as pathEl,
  polygon,
  text as textEl,
} from "./svg";

// ─── Public API ──────────────────────────────────────────────

export function applyLegendOverrides(
  auto: LegendSpec,
  overrides: LegendOverrides | undefined
): LegendSpec {
  if (!overrides) return resolveAuto(auto);

  const sections = auto.sections.map((s) => {
    const o = overrides.sections?.[s.id];
    if (!o) return s;
    return { ...s, title: o.title ?? s.title, hidden: o.hidden ?? s.hidden };
  });

  const hideSet = new Set<string>(overrides.hide ?? []);
  const hiddenSectionIds = new Set<string>(
    sections.filter((s) => s.hidden).map((s) => s.id)
  );

  const baseItems = auto.items.filter((it) => {
    if (hideSet.has(it.key)) return false;
    if (it.section && hiddenSectionIds.has(it.section)) return false;
    return true;
  });

  const renamedBase = baseItems.map((it) => {
    const newLabel = overrides.labels?.[it.key];
    return newLabel === undefined ? it : { ...it, label: newLabel };
  });

  const added = (overrides.added ?? []).map((it) => ({
    ...it,
    section: it.section ?? "custom",
  }));

  let finalSections = sections;
  if (added.some((it) => it.section === "custom") &&
      !finalSections.some((s) => s.id === "custom")) {
    finalSections = [...finalSections, { id: "custom", title: "Custom" }];
  }

  const items = [...renamedBase, ...added];

  let mode = overrides.mode ?? auto.mode;
  if (mode === "auto") mode = items.length > 0 ? "on" : "off";

  return {
    mode,
    title: overrides.title ?? auto.title,
    position: overrides.position ?? auto.position,
    columns: overrides.columns ?? auto.columns,
    sections: finalSections,
    items,
  };
}

function resolveAuto(spec: LegendSpec): LegendSpec {
  if (spec.mode !== "auto") return spec;
  return { ...spec, mode: spec.items.length > 0 ? "on" : "off" };
}

export interface LegendRenderResult {
  svg: string;
  bbox: { x: number; y: number; w: number; h: number };
}

export interface LegendAnchor {
  canvasWidth: number;
  canvasHeight: number;
  /** Side margin from the canvas edge. Default 16. */
  padding?: number;
  /** Top offset reserved for diagram title (used by bottom-right anchoring). */
  titleHeight?: number;
}

export interface LegendRenderConfig {
  fontFamily: string;
  fontSize: number;
}

const ZERO_BBOX = { x: 0, y: 0, w: 0, h: 0 } as const;

// Standardize legacy positions onto one of the 3 supported placements.
function normalizePosition(p: LegendPosition): "bottom-inline" | "bottom-right" | "none" {
  switch (p) {
    case "bottom-inline":
    case "outside-bottom":
    case "bottom-left":
    case "bottom-center":
      return "bottom-inline";
    case "bottom-right":
    case "outside-right":
    case "right":
    case "top-right":
    case "top-left":
      return "bottom-right";
    case "none":
    default:
      return p === "none" ? "none" : "bottom-inline";
  }
}

const FONT_SIZE = 11;
const SECTION_FONT_SIZE = 9;
const TITLE_FONT_SIZE = 12;
const SWATCH_W = 22;
const SWATCH_H = 12;
const SWATCH_LABEL_GAP = 8;
const ITEM_GAP = 18;
const SECTION_LABEL_GAP = 14;
const ROW_H = 18;
const INLINE_TOP_GAP = 14;
const INLINE_BOTTOM_PAD = 8;
const CARD_PAD = 4;
// Width estimates per character (account for measured rendering, not just font-size).
const CHAR_W = FONT_SIZE * 0.6;
// Section labels are uppercase with 0.6px letter-spacing → bigger glyph footprint.
const SECTION_CHAR_W = SECTION_FONT_SIZE * 0.85;
const TITLE_CHAR_W = TITLE_FONT_SIZE * 0.65;
// Minimum effective canvas width for bottom-inline layout. If the diagram is
// narrower, the legend (and the SVG viewBox) is widened to this value to avoid
// excessive wrapping into 5+ rows.
const MIN_INLINE_WIDTH = 480;

export function renderLegend(
  spec: LegendSpec,
  anchor: LegendAnchor,
  theme: BaseTheme,
  config: LegendRenderConfig
): LegendRenderResult {
  if (spec.mode === "off" || spec.position === "none" || spec.items.length === 0) {
    return { svg: "", bbox: { ...ZERO_BBOX } };
  }

  const padding = anchor.padding ?? 16;
  const layout = normalizePosition(spec.position);

  // Group items by section, preserving order.
  const itemsBySection = new Map<string, LegendItem[]>();
  for (const it of spec.items) {
    const sid = it.section ?? "_default";
    const arr = itemsBySection.get(sid) ?? [];
    arr.push(it);
    itemsBySection.set(sid, arr);
  }

  const declared = spec.sections.length
    ? spec.sections.filter(
        (s) => !s.hidden && (itemsBySection.get(s.id)?.length ?? 0) > 0
      )
    : [{ id: "_default", title: "" } as LegendSection];

  const declaredIds = new Set(declared.map((s) => s.id));
  const orderedSections: LegendSection[] = [...declared];
  for (const [sid] of itemsBySection) {
    if (!declaredIds.has(sid) && (itemsBySection.get(sid)?.length ?? 0) > 0) {
      orderedSections.push({ id: sid, title: capitalize(sid) });
    }
  }

  const showTitle = !!spec.title && spec.title !== "Legend";

  if (layout === "bottom-inline") {
    return renderBottomInline(
      spec,
      orderedSections,
      itemsBySection,
      anchor,
      theme,
      config,
      padding,
      showTitle
    );
  }
  return renderBottomRight(
    spec,
    orderedSections,
    itemsBySection,
    anchor,
    theme,
    config,
    padding,
    showTitle
  );
}

// ─── bottom-inline: horizontal flow strip below canvas ───────
//
// Layout rules:
//   - Each section gets its own row (or rows). Sections never share a row.
//   - All sections share a fixed left "label column" so swatches line up.
//   - Items wrap within a section if they don't fit in one row; the
//     continuation row is indented past the label column.
//   - Optional title (when explicitly set by user) is rendered as its own
//     leading row, also left-aligned in the label column.
//   - If canvas is narrower than MIN_INLINE_WIDTH, the legend is rendered
//     at MIN_INLINE_WIDTH and the bbox reflects this — caller grows viewBox.

function renderBottomInline(
  spec: LegendSpec,
  sections: LegendSection[],
  bySection: Map<string, LegendItem[]>,
  anchor: LegendAnchor,
  theme: BaseTheme,
  config: LegendRenderConfig,
  padding: number,
  showTitle: boolean
): LegendRenderResult {
  const effectiveCanvasW = Math.max(anchor.canvasWidth, MIN_INLINE_WIDTH);
  const startX = padding;
  const endX = effectiveCanvasW - padding;
  const availW = Math.max(120, endX - startX);
  const startY = anchor.canvasHeight + INLINE_TOP_GAP;

  // Determine label-column width: max of all section label widths (uppercase).
  let labelColW = 0;
  for (const s of sections) {
    if (!s.title || s.id === "_default") continue;
    const items = bySection.get(s.id) ?? [];
    if (items.length === 0) continue;
    const lw = SECTION_CHAR_W * s.title.length;
    if (lw > labelColW) labelColW = lw;
  }
  if (showTitle) {
    const tw = TITLE_CHAR_W * spec.title.length;
    if (tw > labelColW) labelColW = tw;
  }
  // Add right-side gap between label column and items.
  const itemColX = labelColW > 0 ? labelColW + SECTION_LABEL_GAP : 0;
  const itemAvailW = Math.max(80, availW - itemColX);

  function itemWidth(it: LegendItem): number {
    return SWATCH_W + SWATCH_LABEL_GAP + Math.ceil(it.label.length * CHAR_W);
  }

  // For each section, pack its items into rows that fit in itemAvailW.
  type SectionRows = {
    label: string | null;
    rows: { item: LegendItem; x: number }[][];
  };
  const sectionRows: SectionRows[] = [];

  if (showTitle) {
    sectionRows.push({ label: spec.title, rows: [[]] }); // title-only row
    // Title is rendered without items; we'll treat the title text via labelCol.
  }

  for (const s of sections) {
    const items = bySection.get(s.id) ?? [];
    if (items.length === 0) continue;
    const rows: { item: LegendItem; x: number }[][] = [];
    let row: { item: LegendItem; x: number }[] = [];
    let cursor = 0;
    for (const it of items) {
      const w = itemWidth(it);
      const gap = row.length > 0 ? ITEM_GAP : 0;
      if (cursor > 0 && cursor + gap + w > itemAvailW) {
        rows.push(row);
        row = [];
        cursor = 0;
      }
      const x = cursor + (cursor > 0 ? gap : 0);
      row.push({ item: it, x });
      cursor = x + w;
    }
    if (row.length > 0) rows.push(row);
    const label = s.title && s.id !== "_default" ? s.title.toUpperCase() : null;
    sectionRows.push({ label, rows });
  }

  // Build SVG.
  const out: string[] = [];
  out.push(buildStyleBlock(theme, config.fontFamily));

  let cursorY = startY;
  let usedRight = 0;

  for (let si = 0; si < sectionRows.length; si++) {
    const sec = sectionRows[si];
    const isTitleRow = showTitle && si === 0;
    for (let ri = 0; ri < sec.rows.length; ri++) {
      const yMid = cursorY + ROW_H / 2;
      const labelBaseline = yMid + FONT_SIZE / 2 - 2;
      const sectionBaseline = yMid + SECTION_FONT_SIZE / 2 - 1;
      const titleBaseline = yMid + TITLE_FONT_SIZE / 2 - 2;

      // Section/title label only on the first row of the section.
      if (ri === 0) {
        if (isTitleRow && sec.label) {
          out.push(
            textEl(
              { x: startX, y: titleBaseline, class: "schematex-legend-title" },
              sec.label
            )
          );
          const w = TITLE_CHAR_W * sec.label.length;
          if (startX + w > usedRight) usedRight = startX + w;
        } else if (sec.label) {
          out.push(
            textEl(
              { x: startX, y: sectionBaseline, class: "schematex-legend-section" },
              sec.label
            )
          );
        }
      }

      for (const cell of sec.rows[ri]) {
        const cx = startX + itemColX + cell.x;
        const swatchY = yMid - SWATCH_H / 2;
        const swatch = renderSwatch(cell.item, cx, swatchY, SWATCH_W, SWATCH_H, theme);
        const label = textEl(
          {
            x: cx + SWATCH_W + SWATCH_LABEL_GAP,
            y: labelBaseline,
            class: "schematex-legend-label",
          },
          cell.item.label
        );
        out.push(
          group(
            {
              class: "schematex-legend-row",
              "data-legend-key": cell.item.key,
              "data-legend-section": cell.item.section ?? "",
            },
            [swatch, label]
          )
        );
        const right = cx + itemWidth(cell.item);
        if (right > usedRight) usedRight = right;
      }

      cursorY += ROW_H;
    }
  }

  const totalRows = sectionRows.reduce(
    (sum, sec) => sum + Math.max(1, sec.rows.length),
    0
  );

  // Force right edge to at least the effective canvas right padding so the
  // caller's viewBox grows to include any min-width expansion.
  const minRight = effectiveCanvasW - padding;
  if (minRight > usedRight) usedRight = minRight;

  const svg = group({ class: "schematex-legend" }, out);
  const bbox = {
    x: startX,
    y: startY,
    w: usedRight - startX,
    h: totalRows * ROW_H + INLINE_BOTTOM_PAD,
  };
  return { svg, bbox };
}

// ─── bottom-right: compact overlay card (no box) ─────────────

function renderBottomRight(
  spec: LegendSpec,
  sections: LegendSection[],
  bySection: Map<string, LegendItem[]>,
  anchor: LegendAnchor,
  theme: BaseTheme,
  config: LegendRenderConfig,
  padding: number,
  showTitle: boolean
): LegendRenderResult {
  // Measure box width.
  let maxRowW = 0;
  if (showTitle) {
    maxRowW = Math.max(maxRowW, TITLE_CHAR_W * spec.title.length);
  }
  for (const s of sections) {
    const items = bySection.get(s.id) ?? [];
    if (items.length === 0) continue;
    if (s.title && s.id !== "_default") {
      maxRowW = Math.max(maxRowW, SECTION_CHAR_W * s.title.length);
    }
    for (const it of items) {
      const w = SWATCH_W + SWATCH_LABEL_GAP + Math.ceil(it.label.length * CHAR_W);
      if (w > maxRowW) maxRowW = w;
    }
  }
  const boxW = maxRowW + CARD_PAD * 2;

  // Measure rows.
  let rowCount = 0;
  if (showTitle) rowCount++;
  for (const s of sections) {
    const items = bySection.get(s.id) ?? [];
    if (items.length === 0) continue;
    if (s.title && s.id !== "_default") rowCount++;
    rowCount += items.length;
  }
  const boxH = rowCount * ROW_H + CARD_PAD * 2;

  const x = anchor.canvasWidth - boxW - padding;
  const y = anchor.canvasHeight - boxH - padding;

  const out: string[] = [];
  out.push(buildStyleBlock(theme, config.fontFamily));

  let cursorY = y + CARD_PAD;
  if (showTitle) {
    cursorY += ROW_H / 2;
    out.push(
      textEl(
        {
          x: x + CARD_PAD,
          y: cursorY + TITLE_FONT_SIZE / 2 - 2,
          class: "schematex-legend-title",
        },
        spec.title
      )
    );
    cursorY += ROW_H / 2;
  }
  for (const s of sections) {
    const items = bySection.get(s.id) ?? [];
    if (items.length === 0) continue;
    if (s.title && s.id !== "_default") {
      cursorY += ROW_H / 2;
      out.push(
        textEl(
          {
            x: x + CARD_PAD,
            y: cursorY + SECTION_FONT_SIZE / 2 - 1,
            class: "schematex-legend-section",
          },
          s.title.toUpperCase()
        )
      );
      cursorY += ROW_H / 2;
    }
    for (const it of items) {
      const yMid = cursorY + ROW_H / 2;
      const swatchY = yMid - SWATCH_H / 2;
      const swatch = renderSwatch(it, x + CARD_PAD, swatchY, SWATCH_W, SWATCH_H, theme);
      const label = textEl(
        {
          x: x + CARD_PAD + SWATCH_W + SWATCH_LABEL_GAP,
          y: yMid + FONT_SIZE / 2 - 2,
          class: "schematex-legend-label",
        },
        it.label
      );
      out.push(
        group(
          {
            class: "schematex-legend-row",
            "data-legend-key": it.key,
            "data-legend-section": it.section ?? "",
          },
          [swatch, label]
        )
      );
      cursorY += ROW_H;
    }
  }

  const svg = group({ class: "schematex-legend" }, out);
  return { svg, bbox: { x, y, w: boxW, h: boxH } };
}

// ─── Swatch primitives ───────────────────────────────────────

function renderSwatch(
  item: LegendItem,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: BaseTheme
): string {
  switch (item.kind) {
    case "shape":
      return renderShapeSwatch(item, x, y, w, h, theme);
    case "fill":
      return renderFillSwatch(item, x, y, w, h, theme);
    case "fill-pattern":
      return renderFillPatternSwatch(item, x, y, w, h, theme);
    case "line":
      return renderLineSwatch(item, x, y, w, h, theme);
    case "marker":
      return renderMarkerSwatch(item, x, y, w, h, theme);
    case "edge":
      return renderEdgeSwatch(item, x, y, w, h, theme);
    default:
      return renderFillSwatch(item, x, y, w, h, theme);
  }
}

function renderShapeSwatch(
  item: LegendItem,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: BaseTheme
): string {
  const shape = item.shape ?? "square";
  const cx = x + w / 2;
  const cy = y + h / 2;
  // Resolution rule:
  //   - if item.fill is set: it wins for fill, item.color (if any) is stroke, else theme.stroke.
  //   - else: item.color (if any) is fill, theme.stroke is stroke.
  const usedFill = item.fill ?? item.color ?? theme.fill;
  const usedStroke = item.fill !== undefined ? (item.color ?? theme.stroke) : theme.stroke;
  const innerR = Math.min(w, h) / 2 - 1;
  switch (shape) {
    case "circle":
      return circle({ cx, cy, r: innerR, fill: usedFill, stroke: usedStroke });
    case "diamond": {
      return polygon({
        points: `${cx},${cy - innerR} ${cx + innerR},${cy} ${cx},${cy + innerR} ${cx - innerR},${cy}`,
        fill: usedFill,
        stroke: usedStroke,
      });
    }
    case "triangle": {
      return polygon({
        points: `${cx},${cy - innerR} ${cx + innerR},${cy + innerR * 0.8} ${cx - innerR},${cy + innerR * 0.8}`,
        fill: usedFill,
        stroke: usedStroke,
      });
    }
    case "concentric-square": {
      const inner = rect({
        x: x + 3,
        y: y + 3,
        width: w - 6,
        height: h - 6,
        fill: usedFill,
        stroke: usedStroke,
      });
      const outer = rect({
        x: x + 1,
        y: y + 1,
        width: w - 2,
        height: h - 2,
        fill: "none",
        stroke: usedStroke,
        "stroke-width": 1.2,
      });
      return inner + outer;
    }
    case "concentric-circle": {
      const innerC = circle({
        cx,
        cy,
        r: innerR - 2,
        fill: usedFill,
        stroke: usedStroke,
      });
      const outerC = circle({
        cx,
        cy,
        r: innerR,
        fill: "none",
        stroke: usedStroke,
        "stroke-width": 1.2,
      });
      return innerC + outerC;
    }
    case "square":
    default:
      return rect({
        x: x + 1,
        y: y + 1,
        width: w - 2,
        height: h - 2,
        fill: usedFill,
        stroke: usedStroke,
      });
  }
}

function renderFillSwatch(
  item: LegendItem,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: BaseTheme
): string {
  return rect({
    x: x + 1,
    y: y + 1,
    width: w - 2,
    height: h - 2,
    fill: item.color ?? theme.fill,
    stroke: theme.stroke,
  });
}

function renderFillPatternSwatch(
  item: LegendItem,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: BaseTheme
): string {
  const pattern = item.shape ?? "full";
  const innerX = x + 1;
  const innerY = y + 1;
  const innerW = w - 2;
  const innerH = h - 2;
  const color = item.color ?? theme.fill;
  const color2 = item.color2 ?? "transparent";
  const stroke = theme.stroke;

  const baseRect = rect({
    x: innerX,
    y: innerY,
    width: innerW,
    height: innerH,
    fill: color2,
    stroke,
  });

  switch (pattern) {
    case "half-left":
      return baseRect + rect({ x: innerX, y: innerY, width: innerW / 2, height: innerH, fill: color });
    case "half-right":
      return baseRect + rect({ x: innerX + innerW / 2, y: innerY, width: innerW / 2, height: innerH, fill: color });
    case "half-top":
      return baseRect + rect({ x: innerX, y: innerY, width: innerW, height: innerH / 2, fill: color });
    case "half-bottom":
      return baseRect + rect({ x: innerX, y: innerY + innerH / 2, width: innerW, height: innerH / 2, fill: color });
    case "quad-tl":
      return baseRect + rect({ x: innerX, y: innerY, width: innerW / 2, height: innerH / 2, fill: color });
    case "quad-tr":
      return baseRect + rect({ x: innerX + innerW / 2, y: innerY, width: innerW / 2, height: innerH / 2, fill: color });
    case "quad-bl":
      return baseRect + rect({ x: innerX, y: innerY + innerH / 2, width: innerW / 2, height: innerH / 2, fill: color });
    case "quad-br":
      return baseRect + rect({ x: innerX + innerW / 2, y: innerY + innerH / 2, width: innerW / 2, height: innerH / 2, fill: color });
    case "striped":
    case "carrier": {
      const stripes: string[] = [baseRect];
      const stripeW = 2;
      for (let sx = innerX; sx < innerX + innerW; sx += stripeW * 2) {
        stripes.push(rect({
          x: sx,
          y: innerY,
          width: Math.min(stripeW, innerX + innerW - sx),
          height: innerH,
          fill: color,
        }));
      }
      return stripes.join("");
    }
    case "dotted": {
      const dots: string[] = [baseRect];
      const cy = innerY + innerH / 2;
      for (let dx = innerX + 3; dx < innerX + innerW - 1; dx += 4) {
        dots.push(circle({ cx: dx, cy, r: 1, fill: color }));
      }
      return dots.join("");
    }
    case "full":
    default:
      return rect({
        x: innerX,
        y: innerY,
        width: innerW,
        height: innerH,
        fill: color,
        stroke,
      });
  }
}

function renderLineSwatch(
  item: LegendItem,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: BaseTheme
): string {
  const cy = y + h / 2;
  const x1 = x + 1;
  const x2 = x + w - 1;
  const stroke = item.color ?? theme.stroke;
  const sw = item.strokeWidth ?? 2;
  const dash = patternDasharray(item.pattern);

  if (item.pattern === "double") {
    const off = Math.max(2, sw);
    return (
      lineEl({ x1, y1: cy - off, x2, y2: cy - off, stroke, "stroke-width": sw }) +
      lineEl({ x1, y1: cy + off, x2, y2: cy + off, stroke, "stroke-width": sw })
    );
  }

  if (item.pattern === "wavy") {
    const amp = Math.min(h / 3, 3);
    const period = 6;
    const segs: string[] = [`M ${x1} ${cy}`];
    let sx = x1;
    let up = true;
    while (sx < x2) {
      const nx = Math.min(sx + period, x2);
      segs.push(`Q ${sx + period / 2} ${cy + (up ? -amp : amp)} ${nx} ${cy}`);
      sx = nx;
      up = !up;
    }
    return pathEl({ d: segs.join(" "), fill: "none", stroke, "stroke-width": sw });
  }

  const attrs: Record<string, string | number> = {
    x1,
    y1: cy,
    x2,
    y2: cy,
    stroke,
    "stroke-width": sw,
    "stroke-linecap": "round",
  };
  if (dash) attrs["stroke-dasharray"] = dash;
  return lineEl(attrs);
}

function renderMarkerSwatch(
  item: LegendItem,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: BaseTheme
): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const color = item.color ?? theme.text;
  const marker = item.marker ?? "dot";
  switch (marker) {
    case "X":
    case "x": {
      const r = Math.min(w, h) / 3;
      return (
        lineEl({ x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r, stroke: color, "stroke-width": 1.6, "stroke-linecap": "round" }) +
        lineEl({ x1: cx + r, y1: cy - r, x2: cx - r, y2: cy + r, stroke: color, "stroke-width": 1.6, "stroke-linecap": "round" })
      );
    }
    case "arrow": {
      const x1 = x + 2;
      const x2 = x + w - 4;
      return (
        lineEl({ x1, y1: cy, x2, y2: cy, stroke: color, "stroke-width": 1.6, "stroke-linecap": "round" }) +
        polygon({ points: `${x2},${cy - 3} ${x + w - 1},${cy} ${x2},${cy + 3}`, fill: color })
      );
    }
    case "star":
      return textEl(
        { x: cx, y: cy + 4, "text-anchor": "middle", "font-size": 14, fill: color },
        "★"
      );
    case "slash":
      return lineEl({
        x1: cx - 4, y1: cy + 5,
        x2: cx + 4, y2: cy - 5,
        stroke: color, "stroke-width": 1.6,
      });
    case "P":
    case "C":
    case "E":
      return textEl(
        { x: cx, y: cy + 4, "text-anchor": "middle", "font-size": 11, "font-weight": "bold", fill: color },
        marker
      );
    case "dot":
    default:
      return circle({ cx, cy, r: 3, fill: color });
  }
}

function renderEdgeSwatch(
  item: LegendItem,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: BaseTheme
): string {
  const linePart = renderLineSwatch(item, x, y, w, h, theme);
  if (!item.marker) return linePart;
  return linePart + renderMarkerSwatch(item, x + w - 8, y, 12, h, theme);
}

function patternDasharray(p: LegendLinePattern | undefined): string | null {
  switch (p) {
    case "dashed":
      return "5,3";
    case "dotted":
      return "1.5,3";
    case "broken":
      return "2,8";
    case "zigzag":
      return "8,3,2,3";
    case "solid":
    case undefined:
      return null;
    default:
      return null;
  }
}

// ─── Style block ─────────────────────────────────────────────

function buildStyleBlock(theme: BaseTheme, fontFamily: string): string {
  const css = `
.schematex-legend { font-family: ${fontFamily}; }
.schematex-legend-title { font-size: ${TITLE_FONT_SIZE}px; font-weight: 700; fill: ${theme.text}; }
.schematex-legend-section { font-size: ${SECTION_FONT_SIZE}px; font-weight: 600; fill: ${theme.textMuted}; letter-spacing: 0.6px; }
.schematex-legend-label { font-size: ${FONT_SIZE}px; fill: ${theme.text}; dominant-baseline: alphabetic; }
`;
  return el("style", {}, css);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
