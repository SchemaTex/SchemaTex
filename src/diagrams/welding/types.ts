/**
 * Welding-symbol AST (47-WELDING-SYMBOL-STANDARD).
 *
 * A welding callout is a fixed-skeleton glyph system, not a graph: a horizontal
 * reference line + a leader arrow to the joint + weld-symbol glyphs snapped
 * above/below the line, with dimension text in fixed slots. Two standards differ
 * only in the reference-line convention (AWS single line vs ISO dual solid+dashed).
 *
 * Kept local to the welding plugin — it shares no shapes with core/types.ts.
 */

export type WeldStandard = "aws" | "iso-a" | "iso-b";

export type WeldType =
  | "fillet"
  | "square"
  | "vgroove"
  | "bevel"
  | "ugroove"
  | "jgroove"
  | "flarev"
  | "flarebevel"
  | "plug"
  | "slot"
  | "spot"
  | "seam"
  | "back"
  | "backing"
  | "surfacing"
  | "edge";

export type WeldContour = "flush" | "convex" | "concave";
export type WeldFinish = "G" | "M" | "C" | "R" | "H" | "U";

/** Groove-family types carry angle / root; others reject them (validated). */
export const GROOVE_TYPES: ReadonlySet<WeldType> = new Set<WeldType>([
  "square",
  "vgroove",
  "bevel",
  "ugroove",
  "jgroove",
  "flarev",
  "flarebevel",
]);

/** Types that may sit on one side only (never `both:`). */
export const SINGLE_SIDE_TYPES: ReadonlySet<WeldType> = new Set<WeldType>([
  "plug",
  "slot",
  "surfacing",
]);

export interface WeldSpec {
  type: WeldType;
  /** Leg size (fillet) / depth (groove) / diameter (plug-slot), left of symbol. */
  size?: number;
  /** Weld length, right of symbol. */
  length?: number;
  /** Centre-to-centre pitch of an intermittent weld (implies length). */
  pitch?: number;
  /** Count of intermittent weld increments (ISO n×l(e) triple). */
  count?: number;
  /** Groove included angle in degrees, at the symbol opening. */
  angle?: number;
  /** Root opening / gap, between symbol and reference line. */
  root?: number;
  /** Effective throat, rendered in parentheses left of the symbol. */
  throat?: number;
  contour?: WeldContour;
  finish?: WeldFinish;
}

export interface Joint {
  label?: string;
  /** Weld on the arrow side of the joint. */
  arrow?: WeldSpec;
  /** Weld on the other side of the joint. */
  other?: WeldSpec;
  /** Weld-all-around: open circle at the arrow/reference junction. */
  around: boolean;
  /** Field (site) weld: filled flag at the junction. */
  field: boolean;
  /** Tail content — process / spec / NDE, e.g. "GTAW; WPS-12". */
  tail?: string;
}

export interface WeldingAST {
  type: "welding";
  standard: WeldStandard;
  title?: string;
  joints: Joint[];
  /** AI-readable, non-fatal validation messages. */
  warnings: string[];
}

/** Human-readable weld-type names for `<title>`/`<desc>` and tooltips. */
export const WELD_TYPE_NAMES: Record<WeldType, string> = {
  fillet: "fillet weld",
  square: "square-groove weld",
  vgroove: "V-groove weld",
  bevel: "bevel-groove weld",
  ugroove: "U-groove weld",
  jgroove: "J-groove weld",
  flarev: "flare-V-groove weld",
  flarebevel: "flare-bevel-groove weld",
  plug: "plug weld",
  slot: "slot weld",
  spot: "spot weld",
  seam: "seam weld",
  back: "back weld",
  backing: "backing weld",
  surfacing: "surfacing weld",
  edge: "edge weld",
};

/**
 * Validate a parsed welding AST against the AWS/ISO rule set, returning
 * AI-readable warnings (non-fatal — the diagram still renders). This is the
 * structural differentiator: illegal type/side/dimension combinations are
 * flagged rather than silently drawn.
 */
export function validateWelding(ast: WeldingAST): string[] {
  const warnings: string[] = [];
  ast.joints.forEach((j, i) => {
    const id = j.label ? `joint "${j.label}"` : `joint ${i + 1}`;
    if (!j.arrow && !j.other) {
      warnings.push(`${id}: no weld declared (add arrow:, other:, or both:).`);
    }
    for (const [side, spec] of [
      ["arrow", j.arrow],
      ["other", j.other],
    ] as const) {
      if (!spec) continue;
      if (spec.type === "fillet" && spec.size === undefined) {
        warnings.push(`${id} ${side}: a fillet weld needs a leg size (size=…).`);
      }
      if ((spec.type === "plug" || spec.type === "slot") && spec.size === undefined) {
        warnings.push(`${id} ${side}: a ${spec.type} weld needs a diameter (size=…).`);
      }
      if (spec.type === "surfacing" && spec.throat === undefined) {
        warnings.push(`${id} ${side}: a surfacing weld needs a build-up height (throat=…).`);
      }
      if (spec.angle !== undefined && !GROOVE_TYPES.has(spec.type)) {
        warnings.push(`${id} ${side}: angle= only applies to groove welds, not a ${spec.type}.`);
      }
      if (spec.pitch !== undefined && spec.length === undefined) {
        warnings.push(`${id} ${side}: pitch= needs a length= (an intermittent weld is length-pitch).`);
      }
      if (spec.angle !== undefined && (spec.angle <= 0 || spec.angle >= 180)) {
        warnings.push(`${id} ${side}: groove angle ${spec.angle}° is out of range (0–180).`);
      }
    }
    // surfacing is arrow-side only
    if (j.other?.type === "surfacing") {
      warnings.push(`${id}: a surfacing weld is arrow-side only.`);
    }
  });
  return warnings;
}
