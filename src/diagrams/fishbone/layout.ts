import type { FishboneAST, FishboneNode } from "../../core/types";

/**
 * Fishbone layout engine.
 *
 * Geometric contract (see 13-FISHBONE-STANDARD §5, §9):
 *  - Horizontal spine at `spineY`
 *  - Effect polygon at right (ltr) or left (rtl) end
 *  - Category ribs slant AWAY from the fish head (signature of Ishikawa form)
 *  - Ribs are paired top/bottom on the same X column for visual rhythm
 *  - Each rib hosts Level-1 causes as short horizontal branches toward the head
 *  - Rib length adapts to (max) cause count in its half so headers align
 *
 * This is an optimized v2 layout that improves on the naive fixed-slope design:
 *  1. Dynamic row heights — a Level-1 cause with N sub-causes reserves
 *     (baseRow + N·subRow) of vertical space so nothing overlaps.
 *  2. Per-half aligned headers — ribs in the same half share the same outer Y
 *     so category pills form a clean visual row.
 *  3. Column-pairing — top and bottom ribs share the same spine X.
 *  4. Smart canvas sizing — derives width/height from content, respecting
 *     optional user overrides from `config width = …` / `config height = …`.
 *  5. Label-aware extents — long cause labels extend the canvas rather than
 *     clipping, so multi-lingual / verbose content is first-class.
 *  6. Label bboxes exposed for the renderer to build a text-gap mask.
 */

// ─── Public Types ─────────────────────────────────────────────

export interface FishboneLayoutCause {
  label: string;
  /** Rib index (0 = first category) */
  ribIndex: number;
  /** Slot index on the rib (0 = closest to spine) */
  slotIndex: number;
  /** Cause start point on the rib */
  ribX: number;
  ribY: number;
  /** Horizontal branch end point (label starts just beyond) */
  branchX: number;
  branchY: number;
  /** Label anchor (x where text starts, y baseline) */
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "end";
  /** Sub-causes (Level 2) stacked below the main label */
  subCauses: FishboneLayoutSubCause[];
}

export interface FishboneLayoutSubCause {
  label: string;
  x: number;
  y: number;
  tickX1: number;
  tickX2: number;
  tickY: number;
  anchor: "start" | "end";
}

export interface FishboneLayoutRib {
  index: number;
  half: "top" | "bottom";
  label: string;
  color: string;
  /** Where rib meets spine */
  spineX: number;
  spineY: number;
  /** Far end of rib (where header pill sits) */
  endX: number;
  endY: number;
  /** Header pill geometry */
  headerX: number;
  headerY: number;
  headerW: number;
  headerH: number;
  causes: FishboneLayoutCause[];
}

export interface FishboneBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FishboneLayoutResult {
  width: number;
  height: number;
  orientation: "ltr" | "rtl";
  spineY: number;
  spineStartX: number;
  spineEndX: number;
  tailForkTipTop: { x: number; y: number };
  tailForkTipBot: { x: number; y: number };
  head: {
    x: number;          // spine-attached x
    y: number;          // spine-attached y (= spineY)
    tipX: number;       // pointy tip
    tipY: number;
    w: number;
    h: number;
    label: string;
  };
  ribs: FishboneLayoutRib[];
  /** Label bounding boxes (for text-gap mask) */
  textBBoxes: FishboneBBox[];
  title?: string;
}

// ─── Geometry constants (tunable, exported for renderer parity) ──

export const FB_CONST = {
  PADDING: 40,
  HEAD_W: 90,
  HEAD_H: 80,
  TAIL_LEN: 40,
  SPINE_OFFSET_FROM_TAIL: 40, // distance from canvas left to spine start
  RIB_SLOPE: 0.6,             // dx/dy — consistent across all ribs
  RIB_BASE_EXTENT_Y: 30,      // vertical distance of first slot from spine
  ROW_HEIGHT: 30,             // vertical gap between Level-1 slots
  SUB_ROW_HEIGHT: 17,
  BRANCH_LEN: 30,             // horizontal Level-1 branch length
  SUB_TICK_LEN: 10,
  HEADER_W: 132,
  HEADER_H: 34,
  HEADER_GAP: 12,             // gap between rib endpoint and header pill
  COL_STEP: 130,              // spine x gap between adjacent ribs
  COL_FIRST_OFFSET: 170,      // first rib's distance from spine start
  LABEL_FONT: 12,
  HEADER_FONT: 14,
  SUB_FONT: 11,
  EFFECT_FONT: 14,
  LABEL_GAP: 6,               // gap from branch end to label
  MIN_ROWS_PER_HALF: 4,       // aesthetic minimum rib length
  COL_GAP_BETWEEN_LABELS: 18, // min horizontal breathing between adjacent ribs' label columns
  HEAD_PAD_X: 44,             // total horizontal padding around effect text inside head
  HEAD_PAD_Y: 20,              // min vertical padding around effect text inside head
  TITLE_CLEARANCE: 24,        // extra gap between title baseline and top header pill
} as const;

// ─── Default palette (13-FISHBONE-STANDARD §5.4) ─────────────

const DEFAULT_PALETTE = [
  "#534AB7", // indigo
  "#0F6E56", // teal
  "#185FA5", // blue
  "#993C1D", // rust
  "#854F0B", // amber
  "#A32D2D", // red
  "#6D28D9", // violet
  "#0E7490", // cyan
];

// ─── Text measurement (CJK-aware approximation) ───────────────

export function estimateTextWidth(s: string, fontSize: number): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    // CJK unified ideographs + kana + Hangul + fullwidth
    const isWide =
      (cp >= 0x3000 && cp <= 0x30ff) ||
      (cp >= 0x3400 && cp <= 0x9fff) ||
      (cp >= 0xac00 && cp <= 0xd7af) ||
      (cp >= 0xff00 && cp <= 0xffef);
    w += fontSize * (isWide ? 1.0 : 0.56);
  }
  return w;
}

// ─── Public API ───────────────────────────────────────────────

export function layoutFishbone(ast: FishboneAST): FishboneLayoutResult {
  const majors = ast.majors.length > 0 ? ast.majors : [];
  const nRibs = majors.length;

  // Split top/bottom evenly; if odd, top gets the extra.
  const nTop = Math.ceil(nRibs / 2);
  const nBot = nRibs - nTop;
  const topMajors = majors.slice(0, nTop);
  const botMajors = majors.slice(nTop);

  // Row count per rib = max(subCauses) for that rib's Level-1 list.
  // Extent per rib = sum of rowHeights for slots 0..n-1.
  const ribRowHeights = (m: FishboneNode): number[] => {
    if (m.children.length === 0) return [];
    return m.children.map(
      (c) => FB_CONST.ROW_HEIGHT + c.children.length * FB_CONST.SUB_ROW_HEIGHT
    );
  };

  const topExtents = topMajors.map((m) =>
    sumOrMin(ribRowHeights(m), FB_CONST.MIN_ROWS_PER_HALF * FB_CONST.ROW_HEIGHT)
  );
  const botExtents = botMajors.map((m) =>
    sumOrMin(ribRowHeights(m), FB_CONST.MIN_ROWS_PER_HALF * FB_CONST.ROW_HEIGHT)
  );

  // ── Head sizing (computed early so it can influence half-extent padding) ──
  const effectTextW = estimateTextWidth(ast.effect, FB_CONST.EFFECT_FONT);
  // Grow H proportionally with W to maintain ≈2:1 W:H ratio (avoids flat sliver).
  const rawHeadW = effectTextW + FB_CONST.HEAD_PAD_X;
  const headEffectiveH = Math.max(FB_CONST.HEAD_H, Math.ceil(rawHeadW / 2));
  // At y ± font/2, available width = W * (1 − font/H) due to triangle taper.
  const taperAtText = 1 - FB_CONST.EFFECT_FONT / headEffectiveH;
  const headEffectiveW = Math.max(FB_CONST.HEAD_W, Math.ceil(rawHeadW / taperAtText));

  // Head extends ±headEffectiveH/2 from spine — guarantee half extents cover it.
  const minHalfFromHead = Math.ceil(headEffectiveH / 2) + 6;

  const topHalfExtent = Math.max(
    minHalfFromHead,
    FB_CONST.MIN_ROWS_PER_HALF * FB_CONST.ROW_HEIGHT,
    ...(topExtents.length ? topExtents : [0])
  );
  const botHalfExtent = Math.max(
    nBot > 0 ? minHalfFromHead : 0,
    nBot > 0 ? FB_CONST.MIN_ROWS_PER_HALF * FB_CONST.ROW_HEIGHT : 0,
    ...(botExtents.length ? botExtents : [0])
  );

  const nCols = Math.max(nTop, nBot, 1);

  // ── Adaptive column step: widest Level-1 label + branch + gap + breathing ──
  let maxCauseLabelW = 0;
  let maxSubLabelW = 0;
  for (const m of majors) {
    for (const c of m.children) {
      maxCauseLabelW = Math.max(
        maxCauseLabelW,
        estimateTextWidth(c.label, FB_CONST.LABEL_FONT)
      );
      for (const sc of c.children) {
        maxSubLabelW = Math.max(
          maxSubLabelW,
          estimateTextWidth(sc.label, FB_CONST.SUB_FONT)
        );
      }
    }
  }
  // Label column needs to fit the widest Level-1 label AND any Level-2 tick+label
  // that sits under it (sub causes are indented by SUB_TICK_LEN + 4 from labelX).
  const subExtent = maxSubLabelW > 0 ? FB_CONST.SUB_TICK_LEN + 4 + maxSubLabelW : 0;
  const labelColW = Math.max(maxCauseLabelW, subExtent);
  const minColStep =
    FB_CONST.BRANCH_LEN + FB_CONST.LABEL_GAP + labelColW + FB_CONST.COL_GAP_BETWEEN_LABELS;
  const colStep = Math.max(FB_CONST.COL_STEP, Math.ceil(minColStep));

  // ── Canvas sizing ───────────────────────────────────────────
  const spineStartX = FB_CONST.PADDING + FB_CONST.TAIL_LEN + FB_CONST.SPINE_OFFSET_FROM_TAIL;
  const firstRibX = spineStartX + FB_CONST.COL_FIRST_OFFSET;
  const lastRibX = firstRibX + (nCols - 1) * colStep;
  // Reserve room for the last rib's label column before the head begins.
  const spineEndX = lastRibX + Math.max(40, FB_CONST.BRANCH_LEN + FB_CONST.LABEL_GAP + labelColW + 12);

  const headX = spineEndX;
  const headTipXAdj = headX + headEffectiveW;

  const width =
    ast.width ?? Math.ceil(headTipXAdj + FB_CONST.PADDING);

  const title = ast.title;
  const titleReserve = title ? FB_CONST.TITLE_CLEARANCE + 20 : 0;

  const spineY =
    FB_CONST.PADDING + titleReserve + topHalfExtent + FB_CONST.HEADER_H / 2 + 12;

  const height =
    ast.height ??
    Math.ceil(
      spineY + botHalfExtent + FB_CONST.HEADER_H / 2 + 12 + FB_CONST.PADDING
    );

  // ── Ribs ────────────────────────────────────────────────────
  const ribs: FishboneLayoutRib[] = [];
  const palette = DEFAULT_PALETTE;
  const textBBoxes: FishboneBBox[] = [];

  const buildHalfRibs = (
    halfMajors: FishboneNode[],
    startIndex: number,
    half: "top" | "bottom",
    halfExtent: number
  ): void => {
    for (let i = 0; i < halfMajors.length; i++) {
      const major = halfMajors[i]!;
      const globalIdx = startIndex + i;
      const color = major.color ?? palette[globalIdx % palette.length]!;
      const spineX = firstRibX + i * colStep;

      // Aligned rib endpoint Y → same for all ribs in half.
      const endY = half === "top" ? spineY - halfExtent : spineY + halfExtent;
      const endX = spineX - halfExtent * FB_CONST.RIB_SLOPE;

      // Header pill positioned along the rib's slope extension.
      // The rib direction: for every 1 unit of Y away from spine, X moves -RIB_SLOPE.
      const extraDist = FB_CONST.HEADER_GAP + FB_CONST.HEADER_H / 2;
      const headerCenterY =
        half === "top" ? endY - extraDist : endY + extraDist;
      // Continue the slope: pill center X follows the same dx/dy as the rib.
      const headerCenterX = endX - extraDist * FB_CONST.RIB_SLOPE;
      const headerW = Math.max(
        FB_CONST.HEADER_W,
        estimateTextWidth(major.label, FB_CONST.HEADER_FONT) + 28
      );
      const headerX = headerCenterX - headerW / 2;
      const headerY = headerCenterY - FB_CONST.HEADER_H / 2;

      textBBoxes.push({
        x: headerX,
        y: headerY,
        w: headerW,
        h: FB_CONST.HEADER_H,
      });

      // Cause slots — cumulative along rib from spine outward.
      const causes: FishboneLayoutCause[] = [];
      let accum = FB_CONST.RIB_BASE_EXTENT_Y; // distance from spine to first slot center
      for (let s = 0; s < major.children.length; s++) {
        const child = major.children[s]!;
        const rowH =
          FB_CONST.ROW_HEIGHT + child.children.length * FB_CONST.SUB_ROW_HEIGHT;
        // vertical offset for this slot (center of row)
        const slotOffset = accum + rowH / 2 - FB_CONST.ROW_HEIGHT / 2;
        const ribY =
          half === "top" ? spineY - slotOffset : spineY + slotOffset;
        const ribX = spineX - slotOffset * FB_CONST.RIB_SLOPE;

        const branchY = ribY;
        const branchX = ribX + FB_CONST.BRANCH_LEN; // extend toward head side
        const labelX = branchX + FB_CONST.LABEL_GAP;
        const labelY = branchY;

        // Text bbox for mask
        const labelW = estimateTextWidth(child.label, FB_CONST.LABEL_FONT);
        textBBoxes.push({
          x: labelX - 2,
          y: labelY - FB_CONST.LABEL_FONT / 2 - 2,
          w: labelW + 4,
          h: FB_CONST.LABEL_FONT + 4,
        });

        // Sub-causes stack below the main label
        const subCauses: FishboneLayoutSubCause[] = [];
        for (let si = 0; si < child.children.length; si++) {
          const sub = child.children[si]!;
          const subY = labelY + (si + 1) * FB_CONST.SUB_ROW_HEIGHT;
          const tickX1 = labelX + 2;
          const tickX2 = tickX1 + FB_CONST.SUB_TICK_LEN;
          const subX = tickX2 + 4;
          subCauses.push({
            label: sub.label,
            x: subX,
            y: subY,
            tickX1,
            tickX2,
            tickY: subY,
            anchor: "start",
          });
          const subW = estimateTextWidth(sub.label, FB_CONST.SUB_FONT);
          textBBoxes.push({
            x: subX - 2,
            y: subY - FB_CONST.SUB_FONT / 2 - 2,
            w: subW + 4,
            h: FB_CONST.SUB_FONT + 4,
          });
        }

        causes.push({
          label: child.label,
          ribIndex: globalIdx,
          slotIndex: s,
          ribX,
          ribY,
          branchX,
          branchY,
          labelX,
          labelY,
          labelAnchor: "start",
          subCauses,
        });

        accum += rowH;
      }

      ribs.push({
        index: globalIdx,
        half,
        label: major.label,
        color,
        spineX,
        spineY,
        endX,
        endY,
        headerX,
        headerY,
        headerW,
        headerH: FB_CONST.HEADER_H,
        causes,
      });
    }
  };

  buildHalfRibs(topMajors, 0, "top", topHalfExtent);
  buildHalfRibs(botMajors, nTop, "bottom", botHalfExtent);

  // ── Head polygon (right-facing default) ─────────────────────
  const head = {
    x: headX,
    y: spineY,
    tipX: headTipXAdj,
    tipY: spineY,
    w: headEffectiveW,
    h: headEffectiveH,
    label: ast.effect,
  };

  // Effect label bbox (for mask around it — though usually effect sits in head
  // which has its own fill, we still add it so any crossing line punches out).
  textBBoxes.push({
    x: headX + 4,
    y: spineY - headEffectiveH / 2 + 4,
    w: headEffectiveW - 8,
    h: headEffectiveH - 8,
  });

  // Note: rtl (head-on-left) support: mirror transform applied in renderer
  // rather than recomputing coordinates — simpler and visually identical.

  return {
    width,
    height,
    orientation: ast.orientation,
    spineY,
    spineStartX,
    spineEndX,
    tailForkTipTop: { x: FB_CONST.PADDING, y: spineY - FB_CONST.TAIL_LEN },
    tailForkTipBot: { x: FB_CONST.PADDING, y: spineY + FB_CONST.TAIL_LEN },
    head,
    ribs,
    textBBoxes,
    title,
  };
}

function sumOrMin(arr: number[], min: number): number {
  if (arr.length === 0) return min;
  const s = arr.reduce((a, b) => a + b, 0);
  return Math.max(s, min);
}
