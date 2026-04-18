import type { FishboneAST, FishboneCauseSide, FishboneNode } from "../../core/types";

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
  /** Direction this cause branch sticks out: "head" = toward head, "tail" = toward tail. */
  causeSide: "head" | "tail";
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

// ─── Density presets ──────────────────────────────────────────

interface DensityTunables {
  rowHeight: number;
  subRowHeight: number;
  colStep: number;
  headerW: number;
  headerH: number;
  headerGap: number;
  minRowsPerHalf: number;
  colFirstOffset: number;
}

const DENSITY: Record<"compact" | "normal" | "spacious", DensityTunables> = {
  compact: {
    rowHeight: 24,
    subRowHeight: 15,
    colStep: 110,
    headerW: 118,
    headerH: 30,
    headerGap: 8,
    minRowsPerHalf: 3,
    colFirstOffset: 140,
  },
  normal: {
    rowHeight: 30,
    subRowHeight: 17,
    colStep: 130,
    headerW: 132,
    headerH: 34,
    headerGap: 12,
    minRowsPerHalf: 4,
    colFirstOffset: 170,
  },
  spacious: {
    rowHeight: 36,
    subRowHeight: 19,
    colStep: 150,
    headerW: 148,
    headerH: 38,
    headerGap: 16,
    minRowsPerHalf: 5,
    colFirstOffset: 200,
  },
};

// ─── Public API ───────────────────────────────────────────────

export function layoutFishbone(ast: FishboneAST): FishboneLayoutResult {
  const majors = ast.majors.length > 0 ? ast.majors : [];
  const nRibs = majors.length;

  const density = ast.density ?? "normal";
  const D = DENSITY[density];
  const ribSlope = ast.ribSlope ?? FB_CONST.RIB_SLOPE;
  const causeSideSetting: FishboneCauseSide = ast.causeSide ?? "head";
  const sides = ast.sides ?? "both";

  // Partition ribs into top/bottom halves honoring per-category `side` overrides
  // and the `sides` setting. If a category has an explicit side, use it;
  // otherwise fall back to the global `sides` default (single-sided layouts
  // pin everything to that half; "both" alternates declaration order across
  // the two halves as before).
  const topMajors: FishboneNode[] = [];
  const botMajors: FishboneNode[] = [];
  if (sides === "top" || sides === "bottom") {
    const bucket = sides === "top" ? topMajors : botMajors;
    for (const m of majors) {
      if (m.side === "top") topMajors.push(m);
      else if (m.side === "bottom") botMajors.push(m);
      else bucket.push(m);
    }
  } else {
    const autoPool: FishboneNode[] = [];
    for (const m of majors) {
      if (m.side === "top") topMajors.push(m);
      else if (m.side === "bottom") botMajors.push(m);
      else autoPool.push(m);
    }
    // Greedy balance — push into whichever half currently has fewer ribs,
    // ties → top (matches the prior "top gets the extra" rule).
    for (const m of autoPool) {
      if (topMajors.length <= botMajors.length) topMajors.push(m);
      else botMajors.push(m);
    }
  }

  // Respect per-rib `order` (lower = closer to tail). Stable sort within half.
  const byOrder = (a: FishboneNode, b: FishboneNode): number => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    return ao - bo;
  };
  topMajors.sort(byOrder);
  botMajors.sort(byOrder);

  const nTop = topMajors.length;
  const nBot = botMajors.length;
  // Keep legacy var names alive
  void nRibs;

  // Row count per rib = max(subCauses) for that rib's Level-1 list.
  // Extent per rib = sum of rowHeights for slots 0..n-1.
  const ribRowHeights = (m: FishboneNode): number[] => {
    if (m.children.length === 0) return [];
    return m.children.map(
      (c) => D.rowHeight + c.children.length * D.subRowHeight
    );
  };

  const topExtents = topMajors.map((m) =>
    sumOrMin(ribRowHeights(m), D.minRowsPerHalf * D.rowHeight)
  );
  const botExtents = botMajors.map((m) =>
    sumOrMin(ribRowHeights(m), D.minRowsPerHalf * D.rowHeight)
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

  const topHalfExtent =
    nTop > 0
      ? Math.max(
          minHalfFromHead,
          D.minRowsPerHalf * D.rowHeight,
          ...(topExtents.length ? topExtents : [0])
        )
      : sides === "bottom"
        ? Math.max(minHalfFromHead, 0)
        : 0;
  const botHalfExtent =
    nBot > 0
      ? Math.max(
          minHalfFromHead,
          D.minRowsPerHalf * D.rowHeight,
          ...(botExtents.length ? botExtents : [0])
        )
      : sides === "top"
        ? Math.max(minHalfFromHead, 0)
        : 0;

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
  // When causes can sit on both sides, each column must reserve label space on both sides.
  const labelExtentsPerCol = causeSideSetting === "both" ? 2 : 1;
  const minColStep =
    FB_CONST.BRANCH_LEN + FB_CONST.LABEL_GAP + labelColW + FB_CONST.COL_GAP_BETWEEN_LABELS;
  const colStep = Math.max(
    D.colStep,
    Math.ceil(minColStep * (labelExtentsPerCol === 2 ? 1.15 : 1))
  );

  // ── Canvas sizing ───────────────────────────────────────────
  const spineStartX = FB_CONST.PADDING + FB_CONST.TAIL_LEN + FB_CONST.SPINE_OFFSET_FROM_TAIL;
  const firstRibX = spineStartX + D.colFirstOffset;
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
    FB_CONST.PADDING + titleReserve + topHalfExtent + D.headerH / 2 + 12;

  const height =
    ast.height ??
    Math.ceil(
      spineY + botHalfExtent + D.headerH / 2 + 12 + FB_CONST.PADDING
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
      const endX = spineX - halfExtent * ribSlope;

      // Header pill positioned along the rib's slope extension.
      // The rib direction: for every 1 unit of Y away from spine, X moves -ribSlope.
      const extraDist = D.headerGap + D.headerH / 2;
      const headerCenterY =
        half === "top" ? endY - extraDist : endY + extraDist;
      // Continue the slope: pill center X follows the same dx/dy as the rib.
      const headerCenterX = endX - extraDist * ribSlope;
      const headerW = Math.max(
        D.headerW,
        estimateTextWidth(major.label, FB_CONST.HEADER_FONT) + 28
      );
      const headerX = headerCenterX - headerW / 2;
      const headerY = headerCenterY - D.headerH / 2;

      textBBoxes.push({
        x: headerX,
        y: headerY,
        w: headerW,
        h: D.headerH,
      });

      // Cause slots — cumulative along rib from spine outward.
      const causes: FishboneLayoutCause[] = [];
      let accum = FB_CONST.RIB_BASE_EXTENT_Y; // distance from spine to first slot center
      for (let s = 0; s < major.children.length; s++) {
        const child = major.children[s]!;
        const rowH =
          D.rowHeight + child.children.length * D.subRowHeight;
        // vertical offset for this slot (center of row)
        const slotOffset = accum + rowH / 2 - D.rowHeight / 2;
        const ribY =
          half === "top" ? spineY - slotOffset : spineY + slotOffset;
        const ribX = spineX - slotOffset * ribSlope;

        // Resolve cause direction for this slot.
        const causeDir: "head" | "tail" =
          causeSideSetting === "tail"
            ? "tail"
            : causeSideSetting === "both"
              ? s % 2 === 0
                ? "head"
                : "tail"
              : "head";

        const branchY = ribY;
        const branchX =
          causeDir === "head"
            ? ribX + FB_CONST.BRANCH_LEN
            : ribX - FB_CONST.BRANCH_LEN;
        const labelX =
          causeDir === "head"
            ? branchX + FB_CONST.LABEL_GAP
            : branchX - FB_CONST.LABEL_GAP;
        const labelY = branchY;
        const labelAnchor: "start" | "end" =
          causeDir === "head" ? "start" : "end";

        // Text bbox for mask
        const labelW = estimateTextWidth(child.label, FB_CONST.LABEL_FONT);
        textBBoxes.push({
          x: causeDir === "head" ? labelX - 2 : labelX - labelW - 2,
          y: labelY - FB_CONST.LABEL_FONT / 2 - 2,
          w: labelW + 4,
          h: FB_CONST.LABEL_FONT + 4,
        });

        // Sub-causes stack below the main label
        const subCauses: FishboneLayoutSubCause[] = [];
        for (let si = 0; si < child.children.length; si++) {
          const sub = child.children[si]!;
          const subY = labelY + (si + 1) * D.subRowHeight;
          const tickX1 =
            causeDir === "head" ? labelX + 2 : labelX - 2;
          const tickX2 =
            causeDir === "head"
              ? tickX1 + FB_CONST.SUB_TICK_LEN
              : tickX1 - FB_CONST.SUB_TICK_LEN;
          const subX =
            causeDir === "head" ? tickX2 + 4 : tickX2 - 4;
          subCauses.push({
            label: sub.label,
            x: subX,
            y: subY,
            tickX1,
            tickX2,
            tickY: subY,
            anchor: causeDir === "head" ? "start" : "end",
          });
          const subW = estimateTextWidth(sub.label, FB_CONST.SUB_FONT);
          textBBoxes.push({
            x: causeDir === "head" ? subX - 2 : subX - subW - 2,
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
          labelAnchor,
          causeSide: causeDir,
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
        headerH: D.headerH,
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
