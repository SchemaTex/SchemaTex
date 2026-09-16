import type { FishboneAST, FishboneNode } from "../../core/types";
import { resolveFishboneTheme, TITLE } from "../../core/theme";
import { estimateTextWidth, estimateMaxLineWidth, wrapTextToWidth } from "../../core/text-metrics";
import { edgeLabelObstacles, placeLabel, type LabelBox } from "../../core/label-placement";

export interface FishboneLayoutCause {
  label: string;
  sourceRange?: import("../../core/types").SourceRange;
  /** Rib index (0 = first category) */
  ribIndex: number;
  /** Cause order from top to bottom on the page. */
  slotIndex: number;
  /** Horizontal rib start and end (the segment crosses the category bone). */
  ribX: number;
  ribY: number;
  /** Horizontal rib end point. */
  branchX: number;
  branchY: number;
  /** Label anchor (x where text starts, y at the text centre). */
  labelX: number;
  labelY: number;
  labelLines: string[];
  labelAnchor: "start";
  /** Direction this cause branch sticks out: "head" = toward head, "tail" = toward tail. */
  causeSide: "head" | "tail";
  /** Sub-causes extend outward from the parent branch. */
  subCauses: FishboneLayoutSubCause[];
}

export interface FishboneLayoutSubCause {
  label: string;
  sourceRange?: import("../../core/types").SourceRange;
  x: number;
  y: number;
  tickX1: number;
  tickX2: number;
  tickY: number;
  stemY: number;
  lines: string[];
  anchor: "start";
}

export interface FishboneLayoutRib {
  index: number;
  half: "top" | "bottom";
  label: string;
  sourceRange?: import("../../core/types").SourceRange;
  color: string;
  /** Where rib meets spine */
  spineX: number;
  spineY: number;
  /** Far end of category bone. */
  endX: number;
  endY: number;
  /** Plain bold category text bounds. */
  headerX: number;
  headerY: number;
  headerW: number;
  headerH: number;
  causes: FishboneLayoutCause[];
}

export interface FishboneLayoutResult {
  width: number;
  height: number;
  orientation: "ltr" | "rtl";
  spineY: number;
  spineStartX: number;
  spineEndX: number;
  tail: { x: number; y: number; w: number; h: number };
  head: {
    x: number;          // spine-attached x
    y: number;          // spine-attached y (= spineY)
    w: number;
    h: number;
    label: string;
    lines: string[];
  };
  ribs: FishboneLayoutRib[];
  title?: string;
}

// Geometry is measured in SVG pixels at the existing 12px cause typography.
export const FB_CONST = {
  PADDING: 40, // Outer whitespace, including the tail and category labels.
  HEAD_W: 274, // Width of the reusable effect symbol.
  HEAD_H: 232,
  EFFECT_TEXT_WIDTH: 144, // Interior clear of the gill and tapered nose.
  EFFECT_LINE_HEIGHT: 22,
  TAIL_LEN: 120, // Caudal fin extends left of the spine attachment.
  TAIL_HALF_H: 58,
  BONE_ANGLE_DEG: 45, // Equal horizontal and vertical reach.
  BONE_MARGIN: 40, // Clear the spine and leave bone visible beyond the outer cause row.
  ROW_GAP: 16, // Separate successive cause/sub-cause text rows and their ribs.
  LINE_HEIGHT: 16, // Four pixels of leading for the existing 12px cause font.
  SUB_LINE_HEIGHT: 14, // Three pixels of leading for the smaller 11px sub-cause font.
  LABEL_WIDTH: 132, // About twenty Latin characters per cause line.
  SUB_LABEL_WIDTH: 108, // Shorter wrapped text keeps sub-ribs shorter than their parent.
  SUB_INDENT: 18, // A visible step inward from the parent rib's left end.
  LABEL_GAP: 12, // Clears 4px shared padding plus the 8px sampled edge envelope.
  RIB_CROSS: 8, // Extend beyond the category bone so contact is visibly unambiguous.
  COLUMN_GAP: 24, // Whitespace between neighbouring parallel bone/text envelopes.
  EFFECT_GAP: 48, // A short visible arrow run after the last V-junction.
  HEADER_GAP: 12, // Separate plain category text from its bone tip.
  LABEL_FONT: 12, // Preserve cause typography.
  HEADER_FONT: 14, // Larger bold category names establish hierarchy.
  SUB_FONT: 11, // Smaller text marks the subordinate level.
  EFFECT_FONT: 15.5, // Semibold effect typography.
  TITLE_BASELINE: 28, // Preserve the title position in the top margin.
  TITLE_CLEARANCE: 44, // Reserve the title baseline above the category names.
};

// Density changes whitespace by 20%; text dimensions remain legible.
const DENSITY = { compact: 0.8, normal: 1, spacious: 1.2 };

/** Paired category bones share evenly spaced junctions and content-sized heights. */
export function layoutFishbone(ast: FishboneAST, opts?: { palette?: readonly string[] }): FishboneLayoutResult {
  const scale = DENSITY[ast.density ?? "normal"];
  const rowGap = FB_CONST.ROW_GAP * scale;
  const margin = FB_CONST.BONE_MARGIN * scale;
  const slope = ast.ribSlope ?? 1 / Math.tan(FB_CONST.BONE_ANGLE_DEG * Math.PI / 180);
  const palette = opts?.palette ?? resolveFishboneTheme("default").palette;
  const halves: Record<"top" | "bottom", { node: FishboneNode; index: number }[]> = { top: [], bottom: [] };
  ast.majors.forEach((node, index) => {
    const automatic = halves.top.length <= halves.bottom.length ? "top" : "bottom";
    const half = node.side ?? (ast.sides === "top" || ast.sides === "bottom" ? ast.sides : automatic);
    halves[half].push({ node, index });
  });
  for (const half of [halves.top, halves.bottom]) {
    half.sort((a, b) => (a.node.order ?? Infinity) - (b.node.order ?? Infinity));
  }
  const measure = ({ node, index }: { node: FishboneNode; index: number }) => {
    const causes = node.children.map(child => {
      const lines = wrapTextToWidth(child.label, FB_CONST.LABEL_FONT, FB_CONST.LABEL_WIDTH);
      const subs = child.children.map(sub => ({ node: sub,
        lines: wrapTextToWidth(sub.label, FB_CONST.SUB_FONT, FB_CONST.SUB_LABEL_WIDTH) }));
      const height = lines.length * FB_CONST.LINE_HEIGHT + FB_CONST.LABEL_GAP + rowGap +
        subs.reduce((sum, sub) => sum + sub.lines.length * FB_CONST.SUB_LINE_HEIGHT + FB_CONST.LABEL_GAP + rowGap, 0);
      return { node: child, lines, subs, height };
    });
    return { node, index, causes, height: causes.reduce((sum, cause) => sum + cause.height, 0) };
  };
  const top = halves.top.map(measure);
  const bottom = halves.bottom.map(measure);
  const extentOf = (half: typeof top) => margin * 2 + Math.max(0, ...half.map(m => m.height));
  const topBoneExtent = extentOf(top), bottomBoneExtent = extentOf(bottom);
  const titleReserve = ast.title ? FB_CONST.TITLE_CLEARANCE : 0;
  const headerReserve = FB_CONST.HEADER_GAP + FB_CONST.HEADER_FONT;
  const headW = FB_CONST.HEAD_W;
  const headLines = wrapTextToWidth(ast.effect, FB_CONST.EFFECT_FONT, FB_CONST.EFFECT_TEXT_WIDTH, { fontWeight: 600 });
  // Keep the text and eyebrow in the middle half of the curved outline.
  const headH = Math.max(FB_CONST.HEAD_H, (headLines.length * FB_CONST.EFFECT_LINE_HEIGHT + 42) * 2);
  const topExtent = Math.max(headH / 2, top.length ? topBoneExtent + headerReserve : 0);
  const bottomExtent = Math.max(headH / 2, bottom.length ? bottomBoneExtent + headerReserve : 0);
  const height = Math.max(ast.height ?? 0, FB_CONST.PADDING * 2 + titleReserve + topExtent + bottomExtent);
  const spineY = FB_CONST.PADDING + titleReserve + topExtent +
    (height - (FB_CONST.PADDING * 2 + titleReserve + topExtent + bottomExtent)) / 2;
  const ribs: FishboneLayoutRib[] = [];
  let headerWidth = 0;
  let leftReach = 0;
  let rightReach = 0;
  // Keep the first bone outside the fin, including its curved attachment.
  let firstReach = FB_CONST.TAIL_LEN + 5 + FB_CONST.LABEL_GAP + FB_CONST.TAIL_HALF_H * slope;
  let lastReach = FB_CONST.EFFECT_GAP;
  const columns = Math.max(top.length, bottom.length);
  for (let column = 0; column < columns; column++) {
    [top[column], bottom[column]].forEach((m, side) => {
      if (!m) return;
      const half = side === 0 ? "top" : "bottom";
      const sign = side === 0 ? -1 : 1;
      const extent = side === 0 ? topBoneExtent : bottomBoneExtent;
      const endX = -extent * slope;
      const endY = spineY + sign * extent;
      const boneX = (y: number) => -Math.abs(y - spineY) * slope;
      // Centre shorter stacks within the common bone length of their half.
      let rowY = spineY + (side === 0 ? -extent : 0) + (extent - m.height) / 2;
      const causes: FishboneLayoutCause[] = m.causes.map((child, slotIndex) => {
        const labelHeight = child.lines.length * FB_CONST.LINE_HEIGHT;
        const ribY = rowY + labelHeight + FB_CONST.LABEL_GAP;
        const tail = ast.causeSide !== "head" && (ast.causeSide !== "both" || slotIndex % 2 === 1);
        const groupBottom = rowY + child.height - rowGap;
        const minBoneX = Math.min(boneX(rowY - FB_CONST.LABEL_GAP), boneX(groupBottom + FB_CONST.LABEL_GAP));
        const maxBoneX = Math.max(boneX(rowY - FB_CONST.LABEL_GAP), boneX(groupBottom + FB_CONST.LABEL_GAP));
        const labelWidth = estimateMaxLineWidth(child.lines.join("\n"), FB_CONST.LABEL_FONT);
        const subWidth = Math.max(0, ...child.subs.map(sub =>
          estimateMaxLineWidth(sub.lines.join("\n"), FB_CONST.SUB_FONT)));
        const reach = Math.max(labelWidth, FB_CONST.SUB_INDENT + FB_CONST.LABEL_GAP + subWidth) + FB_CONST.LABEL_GAP;
        const startX = tail ? minBoneX - reach : boneX(ribY) - FB_CONST.RIB_CROSS;
        const labelX = tail ? startX : maxBoneX + FB_CONST.LABEL_GAP;
        const end = tail ? boneX(ribY) + FB_CONST.RIB_CROSS : labelX + reach;
        let subY = ribY + rowGap;
        const subCauses = child.subs.map((sub): FishboneLayoutSubCause => {
          const textY = subY;
          const tickY = textY + sub.lines.length * FB_CONST.SUB_LINE_HEIGHT + FB_CONST.LABEL_GAP;
          const tickX1 = labelX + FB_CONST.SUB_INDENT;
          subY = tickY + rowGap;
          return { label: sub.node.label, sourceRange: sub.node.sourceRange, lines: sub.lines,
            x: tickX1 + FB_CONST.LABEL_GAP, y: textY + FB_CONST.SUB_LINE_HEIGHT / 2,
            tickX1, tickX2: tickX1 + FB_CONST.LABEL_GAP + subWidth,
            tickY, stemY: ribY, anchor: "start" };
        });
        // Measure an envelope relative to the slant, so lanes interlock instead of
        // reserving a full rectangular bounding box for each diagonal bone.
        leftReach = Math.max(leftReach, tail ? maxBoneX - startX : FB_CONST.RIB_CROSS);
        rightReach = Math.max(rightReach, tail ? FB_CONST.RIB_CROSS : end - minBoneX);
        firstReach = Math.max(firstReach, -startX);
        if (column === 0 && rowY <= spineY + FB_CONST.TAIL_HALF_H + FB_CONST.LABEL_GAP &&
            groupBottom >= spineY - FB_CONST.TAIL_HALF_H - FB_CONST.LABEL_GAP) {
          firstReach = Math.max(firstReach, FB_CONST.TAIL_LEN + 5 + FB_CONST.LABEL_GAP - startX);
        }
        lastReach = Math.max(lastReach, end);
        rowY += child.height;
        return { label: child.node.label, sourceRange: child.node.sourceRange, ribIndex: m.index, slotIndex,
          ribX: startX, ribY, branchX: end, branchY: ribY,
          labelX, labelY: ribY - FB_CONST.LABEL_GAP - labelHeight + FB_CONST.LINE_HEIGHT / 2,
          labelLines: child.lines, labelAnchor: "start", causeSide: tail ? "tail" : "head", subCauses };
      });
      const headerW = estimateTextWidth(m.node.label, FB_CONST.HEADER_FONT, { fontWeight: 700 });
      headerWidth = Math.max(headerWidth, headerW);
      firstReach = Math.max(firstReach, -endX + headerW / 2);
      lastReach = Math.max(lastReach, endX + headerW / 2);
      ribs.push({ index: m.index, half, label: m.node.label, sourceRange: m.node.sourceRange,
        color: m.node.color ?? palette[m.index % palette.length]!, spineX: column, spineY, endX, endY,
        headerX: endX - headerW / 2,
        headerY: endY + (side === 0 ? -headerReserve : FB_CONST.HEADER_GAP),
        headerW, headerH: FB_CONST.HEADER_FONT, causes });
    });
  }
  const pitch = Math.max(leftReach + rightReach, headerWidth) + FB_CONST.COLUMN_GAP * scale;
  const naturalWidth = FB_CONST.PADDING * 2 + firstReach + (columns - 1) * pitch + lastReach + headW;
  const width = Math.max(ast.width ?? 0, naturalWidth,
    estimateTextWidth(ast.title ?? "", TITLE.size, { fontWeight: TITLE.weight }) + FB_CONST.PADDING * 2);
  const extraPitch = (width - naturalWidth) / columns;
  for (const rib of ribs) {
    const x = FB_CONST.PADDING + firstReach + extraPitch + rib.spineX * (pitch + extraPitch);
    rib.spineX = x;
    rib.endX += x;
    rib.headerX += x;
    for (const cause of rib.causes) {
      cause.ribX += x;
      cause.branchX += x;
      cause.labelX += x;
      for (const sub of cause.subCauses) {
        sub.x += x;
        sub.tickX1 += x;
        sub.tickX2 += x;
      }
    }
  }
  ribs.sort((a, b) => a.index - b.index);
  const spineStartX = FB_CONST.PADDING + FB_CONST.TAIL_LEN;
  const spineEndX = width - FB_CONST.PADDING - headW - 2;
  const head = { x: spineEndX + 2, y: spineY, w: headW, h: headH, label: ast.effect, lines: headLines };
  const tail = { x: FB_CONST.PADDING, y: spineY - FB_CONST.TAIL_HALF_H,
    w: FB_CONST.TAIL_LEN + 5, h: FB_CONST.TAIL_HALF_H * 2 };
  const occupied: LabelBox[] = [
    { x: tail.x, y: tail.y, width: tail.w, height: tail.h },
    { x: head.x, y: head.y - head.h / 2, width: head.w, height: head.h },
    ...edgeLabelObstacles([{ x: spineStartX, y: spineY }, { x: spineEndX, y: spineY }]),
  ];
  for (const rib of ribs) {
    occupied.push({ x: rib.headerX, y: rib.headerY, width: rib.headerW, height: rib.headerH },
      ...edgeLabelObstacles([{ x: rib.spineX, y: spineY }, { x: rib.endX, y: rib.endY }]));
    for (const cause of rib.causes) {
      occupied.push(...edgeLabelObstacles([
        { x: cause.ribX, y: cause.ribY }, { x: cause.branchX, y: cause.branchY }]));
      for (const sub of cause.subCauses) {
        occupied.push(...edgeLabelObstacles([{ x: sub.tickX1, y: sub.stemY },
          { x: sub.tickX1, y: sub.tickY }, { x: sub.tickX2, y: sub.tickY }]));
      }
    }
  }
  const place = (lines: string[], x: number, y: number, font: number, lineHeight: number) => {
    const width = estimateMaxLineWidth(lines.join("\n"), font);
    const height = lines.length * lineHeight;
    const box = placeLabel({ x: x + width / 2, y: y - lineHeight / 2 + height / 2 },
      { width, height }, occupied, { x: 1, y: 0 });
    occupied.push(box);
    return { x: box.x, y: box.y + lineHeight / 2 };
  };
  for (const rib of ribs) {
    for (const cause of rib.causes) {
      const label = place(cause.labelLines, cause.labelX, cause.labelY, FB_CONST.LABEL_FONT, FB_CONST.LINE_HEIGHT);
      cause.labelX = label.x;
      cause.labelY = label.y;
      for (const sub of cause.subCauses) {
        const label = place(sub.lines, sub.x, sub.y, FB_CONST.SUB_FONT, FB_CONST.SUB_LINE_HEIGHT);
        sub.x = label.x;
        sub.y = label.y;
      }
    }
  }
  return { width, height, orientation: ast.orientation, spineY, spineStartX, spineEndX, head, ribs,
    tail,
    title: ast.title };
}
