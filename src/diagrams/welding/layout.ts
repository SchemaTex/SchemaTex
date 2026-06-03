/**
 * Welding layout — deterministic fixed-skeleton geometry (no graph layout).
 * Each joint is an independent horizontal band stacked vertically.
 */
import type { WeldingAST } from "./types";

export interface WeldingLayout {
  canvasWidth: number;
  canvasHeight: number;
  titleH: number;
  bandH: number;
  /** Left/right ends of the reference line (within a band). */
  refX0: number;
  refX1: number;
  /** X of the weld-symbol slot on the reference line. */
  symbolX: number;
  /** Reference-line Y offset from the top of each band. */
  refYOffset: number;
  /** Y where the warnings block begins (0 if none). */
  warningsY: number;
}

const PAD = 22;
const BAND_H = 132;
const REF_X0 = 150;
const REF_LEN = 168;
const SYMBOL_DX = 96;
const REF_Y_OFFSET = 60;
const CANVAS_W = 470;

export function layoutWelding(ast: WeldingAST): WeldingLayout {
  const titleH = ast.title ? 38 : 0;
  const nJoints = Math.max(1, ast.joints.length);
  const bandsBottom = titleH + nJoints * BAND_H;
  const warningsY = ast.warnings.length > 0 ? bandsBottom + 6 : 0;
  const warningsH = ast.warnings.length > 0 ? 20 + ast.warnings.length * 16 : 0;
  return {
    canvasWidth: CANVAS_W,
    canvasHeight: bandsBottom + warningsH + PAD,
    titleH,
    bandH: BAND_H,
    refX0: REF_X0,
    refX1: REF_X0 + REF_LEN,
    symbolX: REF_X0 + SYMBOL_DX,
    refYOffset: REF_Y_OFFSET,
    warningsY,
  };
}
