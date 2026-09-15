/** Measured welding callouts. Labels describe joints; they do not imply workpiece geometry. */
import { estimateTextWidth, wrapTextToWidth } from "../../core/text-metrics";
import type { WeldingAST, WeldSpec, WeldStandard } from "./types";

export const WELD_STYLE = {
  font: '"Helvetica Neue", "Noto Sans", sans-serif',
  title: 18, body: 13, caption: 11, label: 14,
  ink: "#252c32", muted: "#626c77", rule: "#d7dde3", paper: "#ffffff", warning: "#995b18",
};
const PAD = 28;
const GAP = 12;
const textWidth = (text: string, size = WELD_STYLE.body) => estimateTextWidth(text, size);

export interface WeldSideLayout {
  size: string;
  length: string;
  count: string;
  width: number;
  height: number;
  angleY: number;
  contourY: number;
  finishY: number;
  countY: number;
  extent: number;
  left: number;
  right: number;
}

export interface WeldJointLayout {
  top: number;
  bottom: number;
  refY: number;
  refX0: number;
  refX1: number;
  symbolX: number;
  rightExtent: number;
  arrowX: number;
  arrowY: number;
  labelY: number;
  labelLines: string[];
  tailLines: string[];
  tailWidth: number;
  dashed: boolean;
  arrow?: WeldSideLayout;
  other?: WeldSideLayout;
}
export interface WeldingLayout {
  canvasWidth: number;
  canvasHeight: number;
  titleLines: string[];
  headerBottom: number;
  joints: WeldJointLayout[];
  warningLines: string[];
  warningsY: number;
}

function measureSide(spec: WeldSpec, standard: WeldStandard): WeldSideLayout {
  const size = [spec.size, spec.throat === undefined ? undefined : `(${spec.throat})`].filter(v => v !== undefined).join(" ");
  const length = spec.length === undefined ? "" : spec.pitch === undefined ? `${spec.length}`
    : standard === "iso-a" && spec.count !== undefined ? `${spec.count}×${spec.length} (${spec.pitch})`
      : `${spec.length}-${spec.pitch}`;
  const count = spec.count !== undefined && !(standard === "iso-a" && spec.pitch !== undefined && spec.length !== undefined) ? `(${spec.count})` : "";
  // The numeric root opening sits inside the groove, so its text determines the cell size.
  const width = Math.max(28, spec.root === undefined ? 0 : textWidth(String(spec.root)) * 2 + 12);
  const height = Math.max(24, width * 0.8);
  let extent = height;
  const angleY = spec.angle === undefined ? 0 : (extent += 14);
  if (angleY) extent += 7;
  const contourY = spec.contour ? extent + (spec.type === "fillet" ? 5 : 8) : 0;
  if (contourY) extent = contourY + 3;
  const finishY = spec.finish ? (extent += 15) : 0;
  if (finishY) extent += 7;
  const countY = count ? (extent += 14) : 0;
  if (countY) extent += 7;
  return { size, length, count, width, height, angleY, contourY, finishY, countY, extent,
    left: width / 2 + (size ? GAP + textWidth(size) : 0),
    right: width / 2 + Math.max(length ? GAP + textWidth(length) : 0, spec.finish && spec.type === "fillet" ? 18 : 0) };
}

/** ISO-A omits the dashed line only for genuinely symmetric specifications. Both glyphs remain. */
function identical(a?: WeldSpec, b?: WeldSpec): boolean {
  // Spreading the two typed specifications produces only WeldSpec keys.
  return !!a && !!b && (Object.keys({ ...a, ...b }) as (keyof WeldSpec)[]).every(key => a[key] === b[key]);
}

export function layoutWelding(ast: WeldingAST): WeldingLayout {
  const titleLines = ast.title ? wrapTextToWidth(ast.title, WELD_STYLE.title, 600, { fontWeight: 600 }) : [];
  const headerBottom = PAD + titleLines.length * 24 + 24;
  let cursor = headerBottom + 22;
  let canvasWidth = 560;
  const joints = ast.joints.map(joint => {
    const arrow = joint.arrow ? measureSide(joint.arrow, ast.standard) : undefined;
    const other = joint.other ? measureSide(joint.other, ast.standard) : undefined;
    const dashed = ast.standard === "iso-a" && !identical(joint.arrow, joint.other);
    const tailLines = joint.tail ? wrapTextToWidth(joint.tail, WELD_STYLE.body, 180) : [];
    const tailWidth = Math.max(0, ...tailLines.map(s => textWidth(s)));
    const tailH = tailLines.length * 18;
    const left = Math.max(arrow?.left ?? 0, other?.left ?? 0);
    const rightExtent = Math.max(arrow?.right ?? 0, other?.right ?? 0);
    const refX0 = PAD + 112;
    const symbolX = refX0 + Math.max(70, left + 24);
    const refX1 = symbolX + Math.max(74, rightExtent + 24);
    const above = Math.max((other?.extent ?? 0) + (dashed ? 10 : 0), joint.field ? 30 : 0, tailH / 2);
    const refY = cursor + above;
    const arrowX = PAD + 30;
    const labelWidth = Math.min(190, symbolX - (arrow?.width ?? 0) / 2 - (arrowX - 16) - GAP);
    const labelLines = joint.label ? wrapTextToWidth(joint.label, WELD_STYLE.label, labelWidth, { fontWeight: 600 }) : [];
    const arrowY = refY + 58;
    const labelY = arrowY + 23;
    const bottom = Math.max(labelY + Math.max(0, labelLines.length - 1) * 19 + 8,
      refY + (arrow?.extent ?? 0) + GAP, refY + tailH / 2 + GAP);
    const band = { top: cursor, bottom, refY, refX0, refX1, symbolX, rightExtent, arrowX, arrowY,
      labelY, labelLines, tailLines, tailWidth, dashed, arrow, other };
    canvasWidth = Math.max(canvasWidth, refX1 + (joint.tail ? 24 + tailWidth : 0) + PAD);
    cursor = bottom + 32;
    return band;
  });
  canvasWidth = Math.max(canvasWidth, ...titleLines.map(t => estimateTextWidth(t, WELD_STYLE.title, { fontWeight: 600 }) + 2 * PAD));
  const warningLines = ast.warnings.flatMap(w => wrapTextToWidth(w, WELD_STYLE.caption, canvasWidth - 2 * PAD));
  const warningsY = cursor;
  const canvasHeight = Math.max(headerBottom + 90, cursor + (warningLines.length ? 22 + warningLines.length * 16 : 0));
  return { canvasWidth, canvasHeight, titleLines, headerBottom, joints, warningLines, warningsY };
}
