import type { SLDNodeType, SLDStandard } from "../../core/types";
import { isIecFamily } from "../../core/types";
import { el, group, line, path as pathEl, text as textEl } from "../../core/svg";

/**
 * Symbol renderers — each returns SVG markup centered at (0,0)
 * Used by the renderer after applying transform="translate(cx,cy)".
 *
 * Every symbol exposes a conceptual top/bottom terminal on the vertical axis,
 * so the layout only needs to draw vertical wires between them.
 */

export interface SymbolGeometry {
  /** Bounding half-width for layout */
  halfWidth: number;
  /** Y-offset of the top terminal (negative = above center) */
  topY: number;
  /** Y-offset of the bottom terminal (positive = below center) */
  bottomY: number;
}

export const DEFAULT_GEOMETRY: SymbolGeometry = {
  halfWidth: 20,
  topY: -20,
  bottomY: 20,
};

export function geometryFor(type: SLDNodeType): SymbolGeometry {
  switch (type) {
    case "utility":
    case "generator":
    case "solar":
    case "wind":
      return { halfWidth: 18, topY: -24, bottomY: 18 };
    case "transformer":
    case "transformer_dy":
    case "transformer_yd":
    case "transformer_yy":
    case "transformer_dd":
    case "autotransformer":
    case "transformer_3winding":
      return { halfWidth: 22, topY: -24, bottomY: 24 };
    case "breaker":
    case "breaker_vacuum":
    case "recloser":
    case "switch":
    case "switch_load":
    case "ground_switch":
    case "sectionalizer":
      return { halfWidth: 18, topY: -18, bottomY: 18 };
    case "fuse":
    case "fuse_cl":
      return { halfWidth: 14, topY: -18, bottomY: 18 };
    case "motor":
      return { halfWidth: 16, topY: -16, bottomY: 22 };
    case "load":
    case "capacitor_bank":
    case "harmonic_filter":
      return { halfWidth: 20, topY: -14, bottomY: 14 };
    case "vfd":
    case "ups":
      return { halfWidth: 24, topY: -18, bottomY: 18 };
    case "ats":
      return { halfWidth: 22, topY: -18, bottomY: 18 };
    case "ct":
    case "pt":
      return { halfWidth: 10, topY: -16, bottomY: 16 };
    case "relay":
      return { halfWidth: 12, topY: -12, bottomY: 12 };
    case "surge_arrester":
      return { halfWidth: 12, topY: -16, bottomY: 26 };
    case "watthour_meter":
    case "demand_meter":
    case "ground_fault":
      return { halfWidth: 14, topY: -14, bottomY: 14 };
    case "bus":
      return DEFAULT_GEOMETRY;
    case "hub":
      return { halfWidth: 52, topY: -20, bottomY: 20 };
    case "bus_tie":
      return { halfWidth: 16, topY: -10, bottomY: 10 };
    default:
      return DEFAULT_GEOMETRY;
  }
}

function lineEl(x1: number, y1: number, x2: number, y2: number, cls = "lt-sld-stroke"): string {
  return line({ x1, y1, x2, y2, class: cls });
}

function utilitySymbol(): string {
  return group({}, [
    el("circle", { cx: 0, cy: 0, r: 16, class: "lt-sld-fill" }),
    pathEl({ d: "M -8 0 Q -4 -8 0 0 Q 4 8 8 0", class: "lt-sld-stroke", fill: "none" }),
    // lead wires in/out
    lineEl(0, -24, 0, -16),
    lineEl(0, 16, 0, 18),
  ]);
}

function generatorSymbol(): string {
  return group({}, [
    el("circle", { cx: 0, cy: 0, r: 16, class: "lt-sld-fill" }),
    textEl({ x: 0, y: -2, class: "lt-sld-symbol-text", "text-anchor": "middle", "font-weight": "bold", "font-size": "14" }, "G"),
    pathEl({ d: "M -6 6 Q -3 1 0 6 Q 3 11 6 6", class: "lt-sld-stroke", fill: "none" }),
    lineEl(0, -24, 0, -16),
    lineEl(0, 16, 0, 18),
  ]);
}

function solarSymbol(): string {
  return group({}, [
    el("rect", { x: -18, y: -12, width: 36, height: 24, class: "lt-sld-fill" }),
    lineEl(-18, -4, 18, -4),
    lineEl(-18, 4, 18, 4),
    lineEl(-6, -12, -6, 12),
    lineEl(6, -12, 6, 12),
    lineEl(0, 12, 0, 18),
  ]);
}

function windSymbol(): string {
  return group({}, [
    el("circle", { cx: 0, cy: 0, r: 6, class: "lt-sld-fill" }),
    lineEl(0, -6, 0, -22),
    pathEl({ d: "M 0 -6 L 14 -2 L 0 0 Z", class: "lt-sld-fill-dark" }),
    pathEl({ d: "M 0 -6 L -10 8 L 0 2 Z", class: "lt-sld-fill-dark" }),
    pathEl({ d: "M 0 -6 L -6 -18 L 2 -6 Z", class: "lt-sld-fill-dark" }),
    lineEl(0, 6, 0, 18),
  ]);
}

function upsSymbol(): string {
  return group({}, [
    el("rect", { x: -22, y: -16, width: 44, height: 32, class: "lt-sld-fill" }),
    textEl({ x: 0, y: 4, class: "lt-sld-symbol-text", "text-anchor": "middle", "font-weight": "bold", "font-size": "11" }, "UPS"),
  ]);
}

/**
 * Transformer: two coil groups (three humps each) + polarity dots.
 * Optional winding labels (Δ or Y) are overlaid as compact glyphs.
 */
function transformerSymbol(type: SLDNodeType): string {
  const pieces: string[] = [];
  // primary coil (top)
  pieces.push(
    pathEl({
      d: "M -12 -18 A 4 4 0 0 1 -4 -18 A 4 4 0 0 1 4 -18 A 4 4 0 0 1 12 -18",
      class: "lt-sld-stroke",
      fill: "none",
    })
  );
  // core lines
  pieces.push(lineEl(-14, -8, 14, -8));
  pieces.push(lineEl(-14, -4, 14, -4));
  // secondary coil (bottom, mirrored)
  pieces.push(
    pathEl({
      d: "M -12 18 A 4 4 0 0 0 -4 18 A 4 4 0 0 0 4 18 A 4 4 0 0 0 12 18",
      class: "lt-sld-stroke",
      fill: "none",
    })
  );
  // polarity dots
  pieces.push(el("circle", { cx: -10, cy: -14, r: 2, class: "lt-sld-dot" }));
  pieces.push(el("circle", { cx: 10, cy: 14, r: 2, class: "lt-sld-dot" }));
  // leads
  pieces.push(lineEl(0, -24, 0, -22));
  pieces.push(lineEl(0, 22, 0, 24));

  // Winding designators (Δ / Y / Yg)
  const { primary, secondary } = windingGlyphs(type);
  if (primary) pieces.push(textEl({ x: 20, y: -14, class: "lt-sld-wdg", "text-anchor": "start" }, primary));
  if (secondary) pieces.push(textEl({ x: 20, y: 18, class: "lt-sld-wdg", "text-anchor": "start" }, secondary));
  return group({}, pieces);
}

function windingGlyphs(type: SLDNodeType): { primary?: string; secondary?: string } {
  switch (type) {
    case "transformer_dy": return { primary: "Δ", secondary: "Y" };
    case "transformer_yd": return { primary: "Y", secondary: "Δ" };
    case "transformer_yy": return { primary: "Y", secondary: "Y" };
    case "transformer_dd": return { primary: "Δ", secondary: "Δ" };
    default: return {};
  }
}

function autotransformerSymbol(): string {
  return group({}, [
    pathEl({
      d: "M 0 -20 A 6 6 0 0 1 0 -10 A 6 6 0 0 1 0 0 A 6 6 0 0 1 0 10 A 6 6 0 0 1 0 20",
      class: "lt-sld-stroke",
      fill: "none",
    }),
    lineEl(6, 0, 14, 0),
    lineEl(0, -24, 0, -20),
    lineEl(0, 20, 0, 24),
  ]);
}

function threeWindingSymbol(): string {
  return group({}, [
    // top coil
    pathEl({ d: "M -10 -18 A 3 3 0 0 1 -4 -18 A 3 3 0 0 1 2 -18 A 3 3 0 0 1 8 -18", class: "lt-sld-stroke", fill: "none" }),
    // left-bottom coil
    pathEl({ d: "M -18 6 A 3 3 0 0 1 -12 6 A 3 3 0 0 1 -6 6 A 3 3 0 0 1 0 6", class: "lt-sld-stroke", fill: "none" }),
    // right-bottom coil
    pathEl({ d: "M 0 6 A 3 3 0 0 1 6 6 A 3 3 0 0 1 12 6 A 3 3 0 0 1 18 6", class: "lt-sld-stroke", fill: "none" }),
    lineEl(-14, -8, 14, -8),
    lineEl(0, -24, 0, -18),
    lineEl(-9, 10, -9, 24),
    lineEl(9, 10, 9, 24),
  ]);
}

/** Circuit breaker: diagonal line + top arc. */
function breakerSymbol(): string {
  return group({}, [
    lineEl(0, -14, 0, -10, "lt-sld-stroke"),
    lineEl(0, 10, 0, 14, "lt-sld-stroke"),
    line({ x1: -6, y1: 10, x2: 8, y2: -10, class: "lt-sld-stroke-thick" }),
    pathEl({ d: "M 8 -10 Q 14 -12 12 -18", class: "lt-sld-stroke", fill: "none" }),
    lineEl(0, -18, 0, -14),
    lineEl(0, 14, 0, 18),
  ]);
}

function vacuumBreakerSymbol(): string {
  return group({}, [
    el("ellipse", { cx: 0, cy: 0, rx: 10, ry: 14, class: "lt-sld-fill" }),
    line({ x1: -6, y1: 10, x2: 8, y2: -10, class: "lt-sld-stroke-thick" }),
    textEl({ x: -2, y: -4, class: "lt-sld-symbol-text", "text-anchor": "middle", "font-size": "8" }, "V"),
    lineEl(0, -18, 0, -14),
    lineEl(0, 14, 0, 18),
  ]);
}

function recloserSymbol(): string {
  return group({}, [
    line({ x1: -6, y1: 10, x2: 8, y2: -10, class: "lt-sld-stroke-thick" }),
    pathEl({ d: "M 8 -10 Q 14 -12 12 -18", class: "lt-sld-stroke", fill: "none" }),
    pathEl({ d: "M 14 -6 A 5 5 0 1 1 18 -4", class: "lt-sld-stroke", fill: "none" }),
    el("polygon", { points: "18,-4 20,-8 15,-7", class: "lt-sld-dot" }),
    lineEl(0, -18, 0, -14),
    lineEl(0, 14, 0, 18),
  ]);
}

function switchSymbol(open = false): string {
  const pieces: string[] = [];
  if (open) {
    pieces.push(line({ x1: -6, y1: 10, x2: 10, y2: -8, class: "lt-sld-stroke-thick" }));
    pieces.push(el("circle", { cx: 10, cy: -8, r: 2, class: "lt-sld-fill" }));
  } else {
    pieces.push(line({ x1: -6, y1: 10, x2: 8, y2: -10, class: "lt-sld-stroke-thick" }));
  }
  pieces.push(lineEl(0, -18, 0, -10));
  pieces.push(lineEl(0, 10, 0, 18));
  return group({}, pieces);
}

function loadSwitchSymbol(): string {
  return group({}, [
    line({ x1: -6, y1: 10, x2: 8, y2: -10, class: "lt-sld-stroke-thick" }),
    el("rect", { x: 6, y: -14, width: 6, height: 6, class: "lt-sld-fill" }),
    lineEl(0, -18, 0, -10),
    lineEl(0, 10, 0, 18),
  ]);
}

function groundSwitchSymbol(): string {
  return group({}, [
    line({ x1: -6, y1: 0, x2: 8, y2: -14, class: "lt-sld-stroke-thick" }),
    lineEl(0, -18, 0, -4),
    // ground symbol
    lineEl(-8, 6, 8, 6),
    lineEl(-5, 10, 5, 10),
    lineEl(-2, 14, 2, 14),
    lineEl(0, 0, 0, 6),
  ]);
}

function sectionalizerSymbol(): string {
  return group({}, [
    line({ x1: -6, y1: 10, x2: 10, y2: -8, class: "lt-sld-stroke-thick" }),
    el("circle", { cx: 10, cy: -8, r: 2, class: "lt-sld-fill" }),
    textEl({ x: 14, y: -4, class: "lt-sld-wdg", "text-anchor": "start" }, "S"),
    lineEl(0, -18, 0, -10),
    lineEl(0, 10, 0, 18),
  ]);
}

function fuseSymbol(): string {
  return group({}, [
    el("rect", { x: -5, y: -10, width: 10, height: 20, class: "lt-sld-fill" }),
    lineEl(0, -18, 0, -10),
    lineEl(0, 10, 0, 18),
  ]);
}

function fuseCLSymbol(): string {
  return group({}, [
    el("rect", { x: -6, y: -12, width: 12, height: 24, class: "lt-sld-fill" }),
    lineEl(-6, 0, 6, 0),
    lineEl(0, -18, 0, -12),
    lineEl(0, 12, 0, 18),
  ]);
}

function motorSymbol(): string {
  return group({}, [
    el("circle", { cx: 0, cy: 0, r: 14, class: "lt-sld-fill" }),
    textEl({ x: 0, y: 5, class: "lt-sld-symbol-text", "text-anchor": "middle", "font-weight": "bold", "font-size": "13" }, "M"),
    lineEl(0, -16, 0, -14),
    // 3-phase dots at bottom
    el("circle", { cx: -6, cy: 12, r: 1.5, class: "lt-sld-dot" }),
    el("circle", { cx: 0, cy: 14, r: 1.5, class: "lt-sld-dot" }),
    el("circle", { cx: 6, cy: 12, r: 1.5, class: "lt-sld-dot" }),
  ]);
}

function loadSymbol(): string {
  return group({}, [
    el("rect", { x: -16, y: -12, width: 32, height: 24, class: "lt-sld-fill" }),
  ]);
}

function capacitorBankSymbol(): string {
  return group({}, [
    lineEl(-10, -6, 10, -6, "lt-sld-stroke-thick"),
    lineEl(-10, -2, 10, -2, "lt-sld-stroke-thick"),
    lineEl(-10, 4, 10, 4, "lt-sld-stroke-thick"),
    lineEl(-10, 8, 10, 8, "lt-sld-stroke-thick"),
    lineEl(0, -14, 0, -6),
    lineEl(0, 8, 0, 14),
  ]);
}

function harmonicFilterSymbol(): string {
  return group({}, [
    // L + C chained
    pathEl({ d: "M -14 -4 A 3 3 0 0 1 -8 -4 A 3 3 0 0 1 -2 -4 A 3 3 0 0 1 4 -4", class: "lt-sld-stroke", fill: "none" }),
    lineEl(4, -8, 14, -8),
    lineEl(4, 0, 14, 0),
    lineEl(0, -14, 0, -4),
    lineEl(0, 4, 0, 14),
  ]);
}

function vfdSymbol(): string {
  return group({}, [
    el("rect", { x: -22, y: -16, width: 44, height: 32, class: "lt-sld-fill" }),
    textEl({ x: 0, y: -2, class: "lt-sld-symbol-text", "text-anchor": "middle", "font-weight": "bold", "font-size": "11" }, "VFD"),
    pathEl({ d: "M -10 8 Q -5 2 0 8 Q 5 14 10 8", class: "lt-sld-stroke", fill: "none" }),
    lineEl(0, -18, 0, -16),
    lineEl(0, 16, 0, 18),
  ]);
}

function atsSymbol(): string {
  return group({}, [
    el("rect", { x: -22, y: -16, width: 44, height: 32, class: "lt-sld-fill" }),
    line({ x1: -14, y1: -8, x2: -2, y2: 6, class: "lt-sld-stroke-thick" }),
    line({ x1: 14, y1: -8, x2: 2, y2: 6, class: "lt-sld-stroke-thick" }),
    textEl({ x: 0, y: 14, class: "lt-sld-symbol-text", "text-anchor": "middle", "font-weight": "bold", "font-size": "9" }, "ATS"),
    lineEl(-12, -18, -12, -16),
    lineEl(12, -18, 12, -16),
    lineEl(0, 16, 0, 18),
  ]);
}

function ctSymbol(): string {
  return group({}, [
    el("circle", { cx: 0, cy: 0, r: 7, class: "lt-sld-fill" }),
    textEl({ x: 0, y: 3, class: "lt-sld-wdg", "text-anchor": "middle", "font-size": "7" }, "CT"),
    lineEl(0, -16, 0, -7),
    lineEl(0, 7, 0, 16),
  ]);
}

function ptSymbol(): string {
  return group({}, [
    el("circle", { cx: 0, cy: 0, r: 7, class: "lt-sld-fill" }),
    textEl({ x: 0, y: 3, class: "lt-sld-wdg", "text-anchor": "middle", "font-size": "7" }, "PT"),
    lineEl(0, -16, 0, -7),
    lineEl(0, 7, 0, 16),
  ]);
}

function relaySymbol(deviceNumber?: string): string {
  return group({}, [
    el("circle", { cx: 0, cy: 0, r: 11, class: "lt-sld-fill" }),
    textEl({ x: 0, y: 4, class: "lt-sld-wdg", "text-anchor": "middle", "font-size": "10" }, deviceNumber ?? "R"),
  ]);
}

function surgeArresterSymbol(): string {
  return group({}, [
    el("rect", { x: -7, y: -6, width: 14, height: 14, class: "lt-sld-fill" }),
    pathEl({ d: "M -4 2 Q 0 -4 4 2", class: "lt-sld-stroke", fill: "none" }),
    lineEl(0, -16, 0, -6),
    lineEl(0, 8, 0, 14),
    lineEl(-8, 14, 8, 14),
    lineEl(-5, 18, 5, 18),
    lineEl(-2, 22, 2, 22),
  ]);
}

function groundFaultSymbol(): string {
  return group({}, [
    el("circle", { cx: 0, cy: 0, r: 12, class: "lt-sld-fill" }),
    textEl({ x: 0, y: 4, class: "lt-sld-wdg", "text-anchor": "middle", "font-size": "9" }, "GFI"),
    lineEl(0, -14, 0, -12),
    lineEl(0, 12, 0, 14),
  ]);
}

function hubSymbol(label?: string): string {
  return group({}, [
    el("rect", {
      x: -50, y: -18, width: 100, height: 36,
      rx: 4, ry: 4,
      class: "lt-sld-fill",
      "stroke-width": 2,
    }),
    textEl(
      { x: 0, y: 4, class: "lt-sld-wdg", "text-anchor": "middle", "font-size": "11" },
      label ?? "HUB"
    ),
    lineEl(0, -20, 0, -18),
    lineEl(0, 18, 0, 20),
    // left/right lead stubs for lateral ports
    lineEl(-50, 0, -54, 0),
    lineEl(50, 0, 54, 0),
  ]);
}

function busTieSymbol(): string {
  // Horizontal breaker: two stubs + diagonal switch bar + arc above
  return group({}, [
    lineEl(-16, 0, -4, 0),
    lineEl(4, 0, 16, 0),
    pathEl({ d: "M -4 0 L 4 -6", class: "lt-sld-stroke-thick" }),
    pathEl({ d: "M -4 -6 Q 0 -10 4 -6", class: "lt-sld-stroke", fill: "none" }),
  ]);
}

function meterSymbol(label: string): string {
  return group({}, [
    el("circle", { cx: 0, cy: 0, r: 12, class: "lt-sld-fill" }),
    textEl({ x: 0, y: 4, class: "lt-sld-wdg", "text-anchor": "middle", "font-size": "9" }, label),
    lineEl(0, -14, 0, -12),
    lineEl(0, 12, 0, 14),
  ]);
}

// ─── IEC 60617 symbol variants ──────────────────────────────
// Only the devices whose IEC glyph differs recognisably from the IEEE-315
// (ANSI) form are overridden here. Earth, knife-switch disconnectors, motors,
// meters, etc. share the same primitive across both standards, so they fall
// through to the shared renderers below.

/** IEC two-winding transformer: two interlinked circles (vs ANSI coil humps). */
function transformerSymbolIEC(type: SLDNodeType): string {
  const pieces: string[] = [
    el("circle", { cx: 0, cy: -7, r: 11, class: "lt-sld-stroke" }),
    el("circle", { cx: 0, cy: 7, r: 11, class: "lt-sld-stroke" }),
    lineEl(0, -24, 0, -18),
    lineEl(0, 18, 0, 24),
  ];
  const { primary, secondary } = windingGlyphs(type);
  if (primary) pieces.push(textEl({ x: 20, y: -10, class: "lt-sld-wdg", "text-anchor": "start" }, primary));
  if (secondary) pieces.push(textEl({ x: 20, y: 14, class: "lt-sld-wdg", "text-anchor": "start" }, secondary));
  return group({}, pieces);
}

/**
 * IEC circuit breaker: a contact arm whose fixed contact carries the `×`
 * breaking-function mark (vs the ANSI contact + quarter-arc).
 */
function breakerSymbolIEC(): string {
  return group({}, [
    lineEl(0, -18, 0, -10),
    lineEl(0, 10, 0, 18),
    // open contact arm pivoting from the bottom terminal
    line({ x1: -6, y1: 10, x2: 6, y2: -8, class: "lt-sld-stroke-thick" }),
    // × at the fixed contact
    line({ x1: -4, y1: -13, x2: 4, y2: -7, class: "lt-sld-stroke" }),
    line({ x1: 4, y1: -13, x2: -4, y2: -7, class: "lt-sld-stroke" }),
  ]);
}

/** IEC fuse: rectangle with a conductor line through the long axis (vs ANSI plain box). */
function fuseSymbolIEC(): string {
  return group({}, [
    el("rect", { x: -5, y: -11, width: 10, height: 22, class: "lt-sld-fill" }),
    lineEl(0, -11, 0, 11),
    lineEl(0, -18, 0, -11),
    lineEl(0, 11, 0, 18),
  ]);
}

/** Main entry — render a node symbol at origin. */
export function renderSymbol(
  type: SLDNodeType,
  detail?: string,
  standard?: SLDStandard
): string {
  if (isIecFamily(standard)) {
    switch (type) {
      case "transformer":
      case "transformer_dy":
      case "transformer_yd":
      case "transformer_yy":
      case "transformer_dd":
        return transformerSymbolIEC(type);
      case "breaker":
        return breakerSymbolIEC();
      case "fuse":
        return fuseSymbolIEC();
    }
  }
  switch (type) {
    case "utility": return utilitySymbol();
    case "generator": return generatorSymbol();
    case "solar": return solarSymbol();
    case "wind": return windSymbol();
    case "ups": return upsSymbol();
    case "transformer":
    case "transformer_dy":
    case "transformer_yd":
    case "transformer_yy":
    case "transformer_dd":
      return transformerSymbol(type);
    case "autotransformer": return autotransformerSymbol();
    case "transformer_3winding": return threeWindingSymbol();
    case "breaker": return breakerSymbol();
    case "breaker_vacuum": return vacuumBreakerSymbol();
    case "recloser": return recloserSymbol();
    case "switch": return switchSymbol(true);
    case "switch_load": return loadSwitchSymbol();
    case "ground_switch": return groundSwitchSymbol();
    case "sectionalizer": return sectionalizerSymbol();
    case "fuse": return fuseSymbol();
    case "fuse_cl": return fuseCLSymbol();
    case "motor": return motorSymbol();
    case "load": return loadSymbol();
    case "capacitor_bank": return capacitorBankSymbol();
    case "harmonic_filter": return harmonicFilterSymbol();
    case "vfd": return vfdSymbol();
    case "ats": return atsSymbol();
    case "ct": return ctSymbol();
    case "pt": return ptSymbol();
    case "relay": return relaySymbol(detail);
    case "surge_arrester": return surgeArresterSymbol();
    case "ground_fault": return groundFaultSymbol();
    case "watthour_meter": return meterSymbol("Wh");
    case "demand_meter": return meterSymbol("D");
    case "bus": return "";
    case "hub": return hubSymbol(detail);
    case "bus_tie": return busTieSymbol();
    case "unknown": return placeholderSymbol(detail);
    default: return loadSymbol();
  }
}

/**
 * Visibly-flagged placeholder for an unrecognised device type. A dashed box
 * with a "?" mark — deliberately NOT a real symbol — so an engineer can never
 * mistake it for a recognised glyph. `detail` carries the raw type token.
 */
function placeholderSymbol(detail?: string): string {
  const w = 40;
  const h = 30;
  const parts = [
    el("rect", {
      x: -w / 2,
      y: -h / 2,
      width: w,
      height: h,
      rx: 3,
      class: "lt-sld-unknown-box",
    }),
    textEl({ x: 0, y: 6, "text-anchor": "middle", class: "lt-sld-unknown-mark" }, "?"),
  ];
  if (detail) {
    parts.push(
      textEl(
        { x: 0, y: h / 2 + 11, "text-anchor": "middle", class: "lt-sld-unknown-type" },
        detail.length > 14 ? detail.slice(0, 13) + "…" : detail
      )
    );
  }
  return group({ class: "lt-sld-unknown" }, parts);
}
