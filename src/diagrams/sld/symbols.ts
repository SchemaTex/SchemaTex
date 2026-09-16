import type { SLDNodeType, SLDStandard } from "../../core/types";
import { isIecFamily } from "../../core/types";
import { el, group, line, path as pathEl, text as textEl } from "../../core/svg";
import { estimateTextWidth } from "../../core/text-metrics";

/**
 * Symbol renderers — each returns SVG markup centered at (0,0)
 * Used by the renderer after applying transform="translate(cx,cy)".
 *
 * Geometry declares terminal positions used by both symbols and routing.
 * Changeover devices have independent input terminals; ties are lateral.
 */

export interface SymbolGeometry {
  /** Bounding half-width for layout */
  halfWidth: number;
  /** Multiple independent top terminals, relative to the symbol centre. */
  inputXs?: readonly number[];
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
    case "switch":
    case "switch_load":
    case "ground_switch":
      return { halfWidth: 18, topY: -18, bottomY: 18 };
    case "contactor":
    case "sectionalizer":
    case "recloser":
      return { halfWidth: 26, topY: -18, bottomY: 18 };
    case "fuse":
    case "fuse_cl":
      return { halfWidth: 14, topY: -18, bottomY: 18 };
    case "motor":
      return { halfWidth: 16, topY: -16, bottomY: 22 };
    case "load":
      return { halfWidth: 20, topY: -12, bottomY: 12 };
    case "capacitor_bank":
    case "harmonic_filter":
      return { halfWidth: 20, topY: -14, bottomY: 14 };
    case "vfd":
    case "ups":
      return { halfWidth: 24, topY: -18, bottomY: 18 };
    case "ats":
      return { halfWidth: 28, topY: -28, bottomY: 24, inputXs: [-22, 22] };
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
    case "rcd":
      return { halfWidth: 14, topY: -18, bottomY: 18 };
    case "consumer_unit":
      return { halfWidth: 52, topY: -24, bottomY: 24 };
    case "bus":
      return DEFAULT_GEOMETRY;
    case "hub":
      return { halfWidth: 52, topY: -20, bottomY: 20 };
    case "bus_tie":
      return { halfWidth: 18, topY: -16, bottomY: 4 };
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

/** Shared open contact: a blade pivots on the lower conductor, not beside it.
 * The shown open position is diagram notation, not a live operating state. */
function contactBlade(x1 = 0, y1 = 8, x2 = 11, y2 = -7): string {
  return line({ x1, y1, x2, y2, class: "lt-sld-stroke-thick", "data-sld-role": "blade" });
}
function contactDot(x: number, y: number, r = 1.8): string {
  return el("circle", { cx: x, cy: y, r, class: "lt-sld-dot" });
}
function openContact(): string[] {
  return [lineEl(0, -18, 0, -10), lineEl(0, 8, 0, 18),
    contactBlade(), contactDot(0, 8)];
}
function breakerMark(iec: boolean): string[] {
  return iec
    ? [lineEl(-3, -13, 3, -7), lineEl(3, -13, -3, -7)]
    : [pathEl({ d: "M 0 -10 Q 7 -10 7 -16", class: "lt-sld-stroke" })];
}
function breakerSymbol(iec = false): string {
  return group({}, [...openContact(), ...breakerMark(iec)]);
}
function vacuumBreakerSymbol(iec = false): string {
  return group({}, [
    el("rect", {x:-7,y:-14,width:23,height:27,rx:8,class:"lt-sld-stroke"}),
    ...openContact(), ...breakerMark(iec),
  ]);
}
function recloserSymbol(): string {
  return group({}, [...openContact(), ...breakerMark(false),
    pathEl({d:"M 18 3 A 5 5 0 1 0 18 -7",class:"lt-sld-stroke"}),
    el("polygon",{points:"18,-7 22,-8 20,-4",class:"lt-sld-dot"}),
  ]);
}
function switchSymbol(): string {
  return group({}, [...openContact(), contactDot(0,-10)]);
}
function loadSwitchSymbol(): string {
  return group({}, [...openContact(),
    el("rect", {x:-2.5,y:-12.5,width:5,height:5,class:"lt-sld-fill"}),
  ]);
}
function contactorSymbol(): string {
  return group({}, [...openContact(), lineEl(-4,-10,4,-10),
    // Electromagnetic operation, separated from the conducting contact.
    line({x1:6,y1:1,x2:17,y2:1,class:"lt-sld-stroke","stroke-dasharray":"2 2"}),
    el("rect", {x:17,y:-4,width:7,height:10,class:"lt-sld-fill"}),
  ]);
}
function groundSwitchSymbol(): string {
  return group({}, [lineEl(0,-18,0,-10),contactDot(0,-10),
    contactBlade(0,3,11,-7), lineEl(0,3,0,9),contactDot(0,3),
    lineEl(-9,9,9,9),lineEl(-6,13,6,13),lineEl(-3,17,3,17),
  ]);
}
function sectionalizerSymbol(): string {
  return group({}, [...openContact(),contactDot(0,-10),
    textEl({x:18,y:2,class:"lt-sld-wdg","text-anchor":"middle","font-size":9},"S"),
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

/** Changeover contact with two separate fixed contacts and one common blade.
 * Both throws are shown clear of the blade. Do not invent a preferred source or
 * an operating state from a label such as "normal", "standby" or "open". */
function atsSymbol(): string {
  const g = geometryFor("ats");
  const pieces = g.inputXs!.flatMap(x => [lineEl(x,g.topY,x,-10),contactDot(x,-10)]);
  return group({}, [...pieces,
    lineEl(0,10,0,g.bottomY), contactBlade(0,10,-16,-4), contactDot(0,10),
    // Dashed sweep is mechanical travel, not another conducting branch.
    pathEl({d:"M -12 -10 Q 0 -21 12 -10",class:"lt-sld-stroke","stroke-dasharray":"2 3"}),
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

function rcdSymbol(): string {
  return group({}, [
    el("rect", { x: -14, y: -14, width: 28, height: 28, rx: 3, class: "lt-sld-fill" }),
    textEl({ x: 0, y: -5, class: "lt-sld-wdg", "text-anchor": "middle", "font-size": "8" }, "RCD"),
    textEl({ x: 0, y: 6, class: "lt-sld-wdg", "text-anchor": "middle", "font-size": "7" }, "IΔn"),
    lineEl(0, -14, 0, -18),
    lineEl(0, 14, 0, 18),
  ]);
}

function consumerUnitSymbol(label?: string): string {
  const txt = label && label.length <= 9 ? label : "DB";
  return group({}, [
    el("rect", {
      x: -50,
      y: -22,
      width: 100,
      height: 44,
      rx: 4,
      class: "lt-sld-fill",
      "stroke-width": 2,
    }),
    lineEl(-38, -8, 38, -8, "lt-sld-stroke-thick"),
    lineEl(-38, 8, 38, 8, "lt-sld-stroke-thick"),
    textEl({ x: 0, y: 0, class: "lt-sld-wdg", "text-anchor": "middle", "font-size": "10" }, txt),
    lineEl(0, -24, 0, -22),
    lineEl(0, 22, 0, 24),
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

function busTieSymbol(iec = false): string {
  // Rotate the same breaker artwork so its terminal and contact conventions
  // remain identical to those of a vertical feeder breaker.
  return group({transform:"rotate(-90)"}, [breakerSymbol(iec)]);
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

/** IEC fuse: rectangle with a conductor line through the long axis (vs ANSI plain box). */
function fuseSymbolIEC(): string {
  return group({}, [
    el("rect", { x: -5, y: -11, width: 10, height: 22, class: "lt-sld-fill" }),
    lineEl(0, -11, 0, 11),
    lineEl(0, -18, 0, -11),
    lineEl(0, 11, 0, 18),
  ]);
}

/** Reviewed IEEE 315 artwork, fitted to the existing routing terminals.
 * Keep these ANSI renderers separate: the original shared drawings below also
 * serve IEC, ABNT and AS/NZS, whose inventories have not been reviewed yet.
 */
function ansiArtwork(parts: string[]): string {
  return group({ class: "lt-sld-ansi" }, [el("style", {}, `.lt-sld-ansi .lt-sld-stroke, .lt-sld-ansi .lt-sld-fill { stroke-width: 1.4; }
.lt-sld-ansi .lt-sld-stroke-thick { stroke-width: 1.8; }
.lt-sld-ansi .lt-sld-ansi-fine { stroke-width: 1.4; }
.lt-sld-ansi .lt-sld-ansi-core { stroke-width: 1.4; }
.lt-sld-ansi .lt-sld-ansi-grid { stroke-width: 1.4; }
.lt-sld-ansi .lt-sld-ansi-hook { stroke-width: 1.4; }
.lt-sld-ansi text { dominant-baseline: auto; }
.lt-sld-ansi text[font-weight="600"] { font-weight: 600; }`), ...parts]);
}

function ansiBreakerSymbol(): string {
  return ansiArtwork([
    lineEl(0, -18, 0, -14.25),
    lineEl(0, 14.25, 0, 18),
    contactBlade(0, 14.25, 8.25, -8.25),
    contactDot(0, 14.25, 2.1),
    contactDot(0, -14.25, 2.1),
    pathEl({ d: "M 8.25 -8.25 A 4.5 4.5 0 0 0 6 -13.125", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-hook" })
  ]);
}

function ansiUtilitySymbol(): string {
  return ansiArtwork([group({}, [
    lineEl(0, -24, 0, -17),
    lineEl(0, 17, 0, 18),
    el("circle", { cx: "0", cy: "0", r: "17", class: "lt-sld-fill" }),
    pathEl({ d: "M -9 0 Q -4.5 -9 0 0 T 9 0", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" })
  ])]);
}

function ansiLoadSymbol(): string {
  return ansiArtwork([
    lineEl(0, -12, 0, -10.4),
    lineEl(0, 10.4, 0, 12),
    pathEl({ d: "M -11.2 -10.4 L 11.2 -10.4 L 0 10.4 Z", "stroke-linejoin": "miter", class: "lt-sld-fill" })
  ]);
}

function ansiGeneratorSymbol(): string {
  return ansiArtwork([
    lineEl(0, -24, 0, -8.5),
    lineEl(0, 8.5, 0, 18),
    el("circle", { cx: "0", cy: "0", r: "12", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "-0.5", "font-size": "14", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "G"),
    pathEl({ d: "M -3.5 4 Q -1.75 1 0 4 T 3.5 4", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -16.25 -4 L -13.25 -1 L -10.25 -4 M -13.25 -1 L -13.25 6.5", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -17.25 6.5 L -9.25 6.5 M -15.75 8.5 L -10.75 8.5 M -14.25 10.5 L -12.25 10.5", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" })
  ]);
}

function ansiWatthourMeterSymbol(): string {
  return ansiArtwork([group({}, [
    lineEl(0, -14, 0, -13),
    lineEl(0, 13, 0, 14),
    el("circle", { cx: "0", cy: "0", r: "13", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "4", "font-size": "9", "font-weight": "600", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "Wh")
  ])]);
}

function ansiSwitchSymbol(): string {
  return ansiArtwork([
    lineEl(0, -18, 0, -14.25),
    lineEl(0, 14.25, 0, 18),
    contactBlade(0, 14.25, 8.25, -8.25),
    contactDot(0, 14.25, 2.1),
    contactDot(0, -14.25, 2.1)
  ]);
}

function ansiSwitchLoadSymbol(): string {
  return ansiArtwork([
    lineEl(0, -18, 0, -16.25),
    lineEl(0, 12.35, 0, 18),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: 0, y1: -16.25, x2: 0, y2: -12.35 }),
    contactBlade(0, 12.35, 7.15, -7.15),
    contactDot(0, 12.35, 1.82),
    contactDot(0, -12.35, 1.82),
    el("rect", { x: "-2.925", y: "-16.25", width: "5.85", height: "7.8", class: "lt-sld-fill lt-sld-ansi-fine" }),
    contactDot(0, -12.35, 1.82)
  ]);
}

function ansiVfdSymbol(): string {
  return ansiArtwork([
    lineEl(0, -18, 0, -12),
    lineEl(0, 12, 0, 18),
    el("rect", { x: "-22.5", y: "-12", width: "45", height: "24", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "3", "font-size": "11", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "VFD")
  ]);
}

function ansiSurgeArresterSymbol(): string {
  return ansiArtwork([
    lineEl(0, -16, 0, -11.2),
    lineEl(0, 24, 0, 26),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: 0, y1: 11.2, x2: 0, y2: 17.6 }),
    el("rect", { x: "-8", y: "-11.2", width: "16", height: "22.4", class: "lt-sld-fill" }),
    pathEl({ d: "M 0 -11.2 L 0 -7.2 M -4 -7.2 L 4 -7.2 L 0 -1.6 Z M -4 7.2 L 4 7.2 L 0 1.6 Z M 0 7.2 L 0 11.2", "stroke-linecap": "round", "stroke-linejoin": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -6.4 17.6 L 6.4 17.6 M -4 20.8 L 4 20.8 M -1.6 24 L 1.6 24", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" })
  ]);
}

function ansiTransformerSymbol(): string {
  return ansiArtwork([
    lineEl(0, -24, 0, -15.2),
    lineEl(0, 15.2, 0, 24),
    pathEl({ d: "M -17.1 -9.5 A 5.7 5.7 0 0 1 -5.7 -9.5 A 5.7 5.7 0 0 1 5.7 -9.5 A 5.7 5.7 0 0 1 17.1 -9.5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -17.1 9.5 A 5.7 5.7 0 0 0 -5.7 9.5 A 5.7 5.7 0 0 0 5.7 9.5 A 5.7 5.7 0 0 0 17.1 9.5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -20.9 -2.85 L 20.9 -2.85 M -20.9 2.85 L 20.9 2.85", class: "lt-sld-stroke lt-sld-ansi-core" })
  ]);
}

function ansiSolarSymbol(): string {
  return ansiArtwork([
    lineEl(0, -24, 0, -6.24),
    lineEl(0, 6.24, 0, 18),
    el("rect", { x: "-9.88", y: "-6.24", width: "19.76", height: "12.48", class: "lt-sld-fill" }),
    pathEl({ d: "M -9.88 0 L 9.88 0 M -3.2916 -6.24 L -3.2916 6.24 M 3.2916 -6.24 L 3.2916 6.24", class: "lt-sld-stroke lt-sld-ansi-grid" }),
    pathEl({ d: "M -17.16 -13 L -12.48 -8.32 M -13.52 -15.08 L -8.84 -10.4", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -11.44 -7.28 L -12.168 -10.244 L -14.404 -8.008 Z M -7.8 -9.36 L -8.528 -12.324 L -10.764 -10.088 Z", class: "lt-sld-dot" })
  ]);
}

function ansiMotorSymbol(): string {
  return ansiArtwork([group({}, [
    lineEl(0, -16, 0, -15),
    lineEl(0, 15, 0, 22),
    el("circle", { cx: "0", cy: "0", r: "15", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "5", "font-size": "13", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "M")
  ])]);
}

function ansiCtSymbol(): string {
  return ansiArtwork([
    lineEl(0, -16, 0, -4.05),
    lineEl(0, 4.05, 0, 16),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke lt-sld-ansi-core", x1: -4.05, y1: 0, x2: -9.45, y2: 0 }),
    el("circle", { cx: "0", cy: "0", r: "9", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "1.35", "font-size": "9", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "CT")
  ]);
}

function ansiFuseSymbol(): string {
  return ansiArtwork([group({}, [
    lineEl(0, -18, 0, -15),
    lineEl(0, 15, 0, 18),
    el("rect", { x: "-6", y: "-15", width: "12", height: "30", class: "lt-sld-fill" })
  ])]);
}

function ansiRelaySymbol(detail?: string): string {
  // Full-size lettering can exceed the routing footprint; keep that footprint fixed.
  const radius = Math.max(16, estimateTextWidth(detail ?? "50/51", 10, { fontWeight: 700 }) / 2 + 2);
  return ansiArtwork([
    line({ x1: 0, y1: -12, x2: 0, y2: -6.84, class: "lt-sld-stroke lt-sld-ansi-core", "stroke-dasharray": "1.8 1.44" }),
    lineEl(0, 6.84, 0, 12),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke lt-sld-ansi-core", x1: 6.84, y1: 0, x2: 11.16, y2: 0 }),
    el("circle", { cx: "0", cy: "0", r: radius, class: "lt-sld-fill lt-sld-ansi-fine" }),
    textEl({ x: "0", y: "1.26", "font-size": "10", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, detail ?? "50/51")
  ]);
}

function ansiTransformerDySymbol(): string {
  return ansiArtwork([
    lineEl(0, -24, 0, -8),
    lineEl(0, 8, 0, 24),
    pathEl({ d: "M -9 -5 A 3 3 0 0 1 -3 -5 A 3 3 0 0 1 3 -5 A 3 3 0 0 1 9 -5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -9 5 A 3 3 0 0 0 -3 5 A 3 3 0 0 0 3 5 A 3 3 0 0 0 9 5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -11 -1.5 L 11 -1.5 M -11 1.5 L 11 1.5", class: "lt-sld-stroke lt-sld-ansi-core" }),
    pathEl({ d: "M -16.5 -8.5 L -13.25 -3 L -19.75 -3 Z", "stroke-linejoin": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -19.5 2.5 L -16.5 5.5 L -13.5 2.5 M -16.5 5.5 L -16.5 13", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -20.5 13 L -12.5 13 M -19 15 L -14 15 M -17.5 17 L -15.5 17", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" })
  ]);
}

function ansiBreakerVacuumSymbol(): string {
  return ansiArtwork([group({}, [
    lineEl(0, -18, 0, -15),
    lineEl(0, 15, 0, 18),
    // The opaque 52 enclosure covers its closed contact; retain the blade role.
    contactBlade(0, -15, 0, 15),
    el("rect", { x: "-15", y: "-15", width: "30", height: "30", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "4", "font-size": "9", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "52")
  ])]);
}

function ansiGroundFaultSymbol(detail?: string): string {
  const radius = Math.max(14, estimateTextWidth(detail ?? "50/51", 9, { fontWeight: 700 }) / 2 + 2);
  return ansiArtwork([
    line({ x1: 0, y1: -14, x2: 0, y2: -7.6, class: "lt-sld-stroke lt-sld-ansi-core", "stroke-dasharray": "2 1.6" }),
    lineEl(0, 12.92, 0, 14),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke lt-sld-ansi-core", x1: 7.6, y1: 0, x2: 12.4, y2: 0 }),
    el("circle", { cx: "0", cy: "0", r: radius, class: "lt-sld-fill lt-sld-ansi-fine" }),
    textEl({ x: "0", y: "1.4", "font-size": "9", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, detail ?? "50/51"),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke lt-sld-ansi-core", x1: 0, y1: 7.6, x2: 0, y2: 9.72 }),
    pathEl({ d: "M -3.2 9.72 L 3.2 9.72 M -2 11.32 L 2 11.32 M -0.8 12.92 L 0.8 12.92", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" })
  ]);
}

function ansiUpsSymbol(): string {
  return ansiArtwork([
    lineEl(0, -18, 0, -12),
    lineEl(0, 12, 0, 18),
    el("rect", { x: "-22.5", y: "-12", width: "45", height: "24", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "3", "font-size": "11", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "UPS")
  ]);
}

function ansiPtSymbol(): string {
  return ansiArtwork([
    lineEl(0, -16, 0, -4.05),
    lineEl(0, 4.05, 0, 16),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke lt-sld-ansi-core", x1: -4.05, y1: 0, x2: -9.45, y2: 0 }),
    el("circle", { cx: "0", cy: "0", r: "9", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "1.35", "font-size": "9", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "PT")
  ]);
}

function ansiCapacitorBankSymbol(): string {
  return ansiArtwork([group({}, [
    lineEl(0, -14, 0, -4),
    lineEl(0, 4, 0, 14),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: -12.0, y1: -4.0, x2: 12.0, y2: -4.0 }),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: -12.0, y1: 4.0, x2: 12.0, y2: 4.0 })
  ])]);
}

function ansiGroundSwitchSymbol(): string {
  return ansiArtwork([
    lineEl(0, -18, 0, -7.6),
    lineEl(0, 15.6, 0, 18),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: 0, y1: 7.6, x2: 0, y2: 12.4 }),
    contactBlade(0, 7.6, 4.4, -4.4),
    contactDot(0, 7.6, 1.12),
    contactDot(0, -7.6, 1.12),
    pathEl({ d: "M -3.2 12.4 L 3.2 12.4 M -2 14 L 2 14 M -0.8 15.6 L 0.8 15.6", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" })
  ]);
}

function ansiBusTieSymbol(): string {
  return ansiArtwork([group({ transform: "rotate(-90)" }, [
    lineEl(0, -18, 0, -14.25),
    lineEl(0, 14.25, 0, 18),
    contactBlade(0, 14.25, 8.25, -8.25),
    contactDot(0, 14.25, 2.1),
    contactDot(0, -14.25, 2.1),
    pathEl({ d: "M 8.25 -8.25 A 4.5 4.5 0 0 0 6 -13.125", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-hook" })
  ])]);
}

function ansiFuseClSymbol(): string {
  return ansiArtwork([
    lineEl(0, -18, 0, -7.2),
    lineEl(0, 7.2, 0, 18),
    el("rect", { x: "-2.88", y: "-7.2", width: "5.76", height: "14.4", class: "lt-sld-fill" }),
    textEl({ x: "10.56", y: "1.68", "font-size": "9", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "CL")
  ]);
}

function ansiTransformerYdSymbol(): string {
  return ansiArtwork([
    lineEl(0, -24, 0, -8),
    lineEl(0, 8, 0, 24),
    pathEl({ d: "M -9 -5 A 3 3 0 0 1 -3 -5 A 3 3 0 0 1 3 -5 A 3 3 0 0 1 9 -5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -9 5 A 3 3 0 0 0 -3 5 A 3 3 0 0 0 3 5 A 3 3 0 0 0 9 5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -11 -1.5 L 11 -1.5 M -11 1.5 L 11 1.5", class: "lt-sld-stroke lt-sld-ansi-core" }),
    pathEl({ d: "M -19.5 -14.5 L -16.5 -11.5 L -13.5 -14.5 M -16.5 -11.5 L -16.5 -4", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -20.5 -4 L -12.5 -4 M -19 -2 L -14 -2 M -17.5 0 L -15.5 0", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -16.5 3 L -13.25 8.5 L -19.75 8.5 Z", "stroke-linecap": "round", "stroke-linejoin": "round", class: "lt-sld-stroke lt-sld-ansi-fine" })
  ]);
}

function ansiDemandMeterSymbol(): string {
  return ansiArtwork([group({}, [
    lineEl(0, -14, 0, -13),
    lineEl(0, 13, 0, 14),
    el("circle", { cx: "0", cy: "0", r: "13", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "4", "font-size": "9", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "DM")
  ])]);
}

function ansiRecloserSymbol(): string {
  return ansiArtwork([
    lineEl(0, -18, 0, -5.7),
    lineEl(0, 5.7, 0, 18),
    // The opaque 52 enclosure covers its closed contact; retain the blade role.
    contactBlade(0, -5.7, 0, 5.7),
    el("rect", { x: "-5.7", y: "-5.7", width: "11.4", height: "11.4", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "1.52", "font-size": "9", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "52"),
    group({ transform: "translate(17.48 0) rotate(-90)" }, [line({ "stroke-linecap": "butt", "stroke-dasharray": "1.9 1.52", class: "lt-sld-stroke lt-sld-ansi-core", x1: 0, y1: -7.22, x2: 0, y2: -11.78 })]),
    el("circle", { cx: "17.48", cy: "0", r: "9", class: "lt-sld-fill lt-sld-ansi-fine" }),
    textEl({ x: "17.48", y: "1.33", "font-size": "9", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "79")
  ]);
}

function ansiTransformerYySymbol(): string {
  return ansiArtwork([
    lineEl(0, -24, 0, -8),
    lineEl(0, 8, 0, 24),
    pathEl({ d: "M -9 -5 A 3 3 0 0 1 -3 -5 A 3 3 0 0 1 3 -5 A 3 3 0 0 1 9 -5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -9 5 A 3 3 0 0 0 -3 5 A 3 3 0 0 0 3 5 A 3 3 0 0 0 9 5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -11 -1.5 L 11 -1.5 M -11 1.5 L 11 1.5", class: "lt-sld-stroke lt-sld-ansi-core" }),
    pathEl({ d: "M -19.5 -8.5 L -16.5 -5.5 L -13.5 -8.5 M -16.5 -5.5 L -16.5 -2", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -19.5 2.5 L -16.5 5.5 L -13.5 2.5 M -16.5 5.5 L -16.5 9", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" })
  ]);
}

function ansiTransformerDdSymbol(): string {
  return ansiArtwork([
    lineEl(0, -24, 0, -8),
    lineEl(0, 8, 0, 24),
    pathEl({ d: "M -9 -5 A 3 3 0 0 1 -3 -5 A 3 3 0 0 1 3 -5 A 3 3 0 0 1 9 -5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -9 5 A 3 3 0 0 0 -3 5 A 3 3 0 0 0 3 5 A 3 3 0 0 0 9 5", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    pathEl({ d: "M -11 -1.5 L 11 -1.5 M -11 1.5 L 11 1.5", class: "lt-sld-stroke lt-sld-ansi-core" }),
    pathEl({ d: "M -16.5 -8.5 L -13.25 -3 L -19.75 -3 Z", "stroke-linecap": "round", "stroke-linejoin": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    pathEl({ d: "M -16.5 2.5 L -13.25 8 L -19.75 8 Z", "stroke-linecap": "round", "stroke-linejoin": "round", class: "lt-sld-stroke lt-sld-ansi-fine" })
  ]);
}

function ansiHubSymbol(detail?: string): string {
  return ansiArtwork([group({}, [
    lineEl(0, -20, 0, -16),
    lineEl(0, 16, 0, 20),
    el("rect", { x: "-30", y: "-16", width: "60", height: "32", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "4", "font-size": "11", textLength: detail && detail.length > 8 ? 54 : undefined, lengthAdjust: "spacingAndGlyphs", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, detail ?? "HUB")
  ])]);
}

function ansiWindSymbol(): string {
  return ansiArtwork([
    lineEl(0, -24, 0, -11.9),
    lineEl(0, 11.9, 0, 18),
    el("circle", { cx: "0", cy: "0", r: "11.9", class: "lt-sld-fill" }),
    textEl({ x: "0", y: "-0.7", "font-size": "13", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "G"),
    pathEl({ d: "M -4.9 5.6 Q -2.45 1.4 0 5.6 T 4.9 5.6", "stroke-linecap": "round", class: "lt-sld-stroke lt-sld-ansi-fine" }),
    textEl({ x: "-2.1", y: "-17.5", "font-size": "9", "font-weight": "700", "text-anchor": "end", class: "lt-sld-symbol-text lt-sld-wdg" }, "WIND")
  ]);
}

function ansiHarmonicFilterSymbol(): string {
  return ansiArtwork([
    lineEl(0, -14, 0, -7.2),
    lineEl(0, 8.4, 0, 14),
    group({ transform: "translate(0 -1.8) rotate(90)" }, [pathEl({ d: "M -5.4 0 A 1.8 1.8 0 0 1 -1.8 0 A 1.8 1.8 0 0 1 1.8 0 A 1.8 1.8 0 0 1 5.4 0", "stroke-linecap": "round", class: "lt-sld-stroke" })]),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: 0, y1: 3.6, x2: 0, y2: 6 }),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: -3.6, y1: 6, x2: 3.6, y2: 6 }),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: -3.6, y1: 8.4, x2: 3.6, y2: 8.4 })
  ]);
}

function ansiAutotransformerSymbol(): string {
  return ansiArtwork([
    lineEl(0, -24, 0, -21.6),
    lineEl(0, 21.6, 0, 24),
    pathEl({ d: "M 0 -21.6 A 5.4 5.4 0 0 0 0 -10.8 A 5.4 5.4 0 0 0 0 0 A 5.4 5.4 0 0 0 0 10.8 A 5.4 5.4 0 0 0 0 21.6", "stroke-linecap": "round", class: "lt-sld-stroke" }),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: 0, y1: 0, x2: 16.2, y2: 0 }),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: 16.2, y1: 0, x2: 16.2, y2: 21.6 }),
    line({ "stroke-linecap": "square", class: "lt-sld-stroke", x1: 16.2, y1: 21.6, x2: 16.2, y2: 24 }),
    contactDot(0, 0, 2.52)
  ]);
}

function ansiSectionalizerSymbol(): string {
  return ansiArtwork([
    lineEl(0, -18, 0, -14.25),
    lineEl(0, 14.25, 0, 18),
    contactBlade(0, 14.25, 8.25, -8.25),
    contactDot(0, 14.25, 2.1),
    contactDot(0, -14.25, 2.1),
    textEl({ x: "18", y: "2.625", "font-size": "9", "font-weight": "700", "text-anchor": "middle", class: "lt-sld-symbol-text lt-sld-wdg" }, "S")
  ]);
}

function ansiAtsSymbol(): string {
  const g = geometryFor("ats");
  return ansiArtwork([
    ...g.inputXs!.flatMap(x => [lineEl(x, g.topY, x, -8), contactDot(x, -8, 2.6)]),
    lineEl(0, 20, 0, g.bottomY),
    contactBlade(0, 20, -22, -8),
    line({ x1: 0, y1: 20, x2: 22, y2: -8, class: "lt-sld-stroke lt-sld-ansi-fine", "stroke-dasharray": "3 3" }),
    contactDot(0, 20, 3),
    textEl({ x: -18, y: -12, class: "lt-sld-symbol-text", "font-size": 9, "font-weight": 700 }, "N"),
    textEl({ x: 18, y: -12, class: "lt-sld-symbol-text", "text-anchor": "end", "font-size": 9, "font-weight": 700 }, "E"),
  ]);
}

/** Main entry — render a node symbol at origin. */
export function renderSymbol(
  type: SLDNodeType,
  detail?: string,
  standard?: SLDStandard
): string {
  if (!isIecFamily(standard)) {
    switch (type) {
      case "breaker": return ansiBreakerSymbol();
      case "utility": return ansiUtilitySymbol();
      case "load": return ansiLoadSymbol();
      case "generator": return ansiGeneratorSymbol();
      case "watthour_meter": return ansiWatthourMeterSymbol();
      case "switch": return ansiSwitchSymbol();
      case "switch_load": return ansiSwitchLoadSymbol();
      case "vfd": return ansiVfdSymbol();
      case "surge_arrester": return ansiSurgeArresterSymbol();
      case "transformer": return ansiTransformerSymbol();
      case "solar": return ansiSolarSymbol();
      case "motor": return ansiMotorSymbol();
      case "ct": return ansiCtSymbol();
      case "fuse": return ansiFuseSymbol();
      case "relay": return ansiRelaySymbol(detail);
      case "transformer_dy": return ansiTransformerDySymbol();
      case "breaker_vacuum": return ansiBreakerVacuumSymbol();
      case "ground_fault": return ansiGroundFaultSymbol(detail);
      case "ups": return ansiUpsSymbol();
      case "pt": return ansiPtSymbol();
      case "capacitor_bank": return ansiCapacitorBankSymbol();
      case "ground_switch": return ansiGroundSwitchSymbol();
      case "bus_tie": return ansiBusTieSymbol();
      case "fuse_cl": return ansiFuseClSymbol();
      case "transformer_yd": return ansiTransformerYdSymbol();
      case "demand_meter": return ansiDemandMeterSymbol();
      case "recloser": return ansiRecloserSymbol();
      case "transformer_yy": return ansiTransformerYySymbol();
      case "transformer_dd": return ansiTransformerDdSymbol();
      case "hub": return ansiHubSymbol(detail);
      case "wind": return ansiWindSymbol();
      case "harmonic_filter": return ansiHarmonicFilterSymbol();
      case "autotransformer": return ansiAutotransformerSymbol();
      case "sectionalizer": return ansiSectionalizerSymbol();
      case "ats": return ansiAtsSymbol();
    }
  }
  if (isIecFamily(standard)) {
    switch (type) {
      case "transformer":
      case "transformer_dy":
      case "transformer_yd":
      case "transformer_yy":
      case "transformer_dd":
        return transformerSymbolIEC(type);
      case "breaker":
        return breakerSymbol(true);
      case "breaker_vacuum": return vacuumBreakerSymbol(true);
      case "bus_tie": return busTieSymbol(true);
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
    case "switch": return switchSymbol();
    case "switch_load": return loadSwitchSymbol();
    case "contactor": return contactorSymbol();
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
    case "rcd": return rcdSymbol();
    case "watthour_meter": return meterSymbol("Wh");
    case "demand_meter": return meterSymbol("D");
    case "consumer_unit": return consumerUnitSymbol(detail);
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
