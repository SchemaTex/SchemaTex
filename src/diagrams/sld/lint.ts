import type { SchematexDiagnostic } from "../../core/diagnostics";
import type { SLDAST, SLDNodeType } from "../../core/types";
import { isIecFamily } from "../../core/types";
import { didYouMean } from "../../core/dsl-suggest";
import { parseSLDDSL } from "./parser";

// Canonical device vocabulary for the did-you-mean suggestion on an unknown
// type. Kept in sync with NODE_TYPES + TYPE_ALIASES in the parser.
const KNOWN_DEVICE_WORDS = [
  "utility", "generator", "solar", "wind", "ups",
  "transformer", "transformer_dy", "transformer_yd", "transformer_yy",
  "transformer_dd", "autotransformer", "transformer_3winding",
  "bus", "bus_tie", "hub",
  "breaker", "breaker_vacuum", "switch", "switch_load", "ground_switch",
  "ats", "recloser", "sectionalizer", "fuse", "fuse_cl",
  "ct", "pt", "relay", "surge_arrester", "ground_fault",
  "motor", "load", "capacitor_bank", "harmonic_filter", "vfd",
  "watthour_meter", "demand_meter",
  "mcb", "mccb", "rcd", "rcbo", "rccb", "isolator", "disconnector", "panel",
];

/**
 * SLD standard-compatibility lint.
 *
 * When an explicit `[standard: …]` is selected, flag devices that have no
 * symbol in that standard's published catalog so an engineer doesn't
 * unknowingly submit a glyph their jurisdiction won't accept. The engine does
 * not silently substitute a foreign symbol — it renders the closest available
 * form and warns.
 */
export function lintSLD(text: string): SchematexDiagnostic[] {
  let ast: SLDAST;
  try {
    ast = parseSLDDSL(text);
  } catch {
    return [];
  }
  return lintSLDAst(ast);
}

// North-American utility devices with no direct IEC 60617 glyph in our catalog.
// Under an IEC-family standard they fall back to the ANSI form, which may not be
// accepted in IEC submittals.
const ANSI_ONLY: Partial<Record<SLDNodeType, string>> = {
  recloser: "recloser",
  sectionalizer: "sectionalizer",
  watthour_meter: "watt-hour meter",
  demand_meter: "demand meter",
};

export function lintSLDAst(ast: SLDAST): SchematexDiagnostic[] {
  const out: SchematexDiagnostic[] = [];

  // Unrecognised device types are kept (rendered as a flagged placeholder) but
  // warned about here so the partial render is analyzable and the engineer gets
  // a did-you-mean nudge — independent of the chosen standard.
  for (const node of ast.nodes) {
    if (node.nodeType !== "unknown") continue;
    const raw = node.rawType ?? "";
    out.push({
      severity: "warning",
      code: "SLD_UNKNOWN_DEVICE",
      message: `device "${node.id}" has unrecognised type "${raw}"; drawn as a flagged placeholder`,
      hint: `"${raw}" is not a known SLD device.${didYouMean(raw.toLowerCase(), KNOWN_DEVICE_WORDS)} See docs/reference for the device catalog.`,
      fatal: false,
    });
  }

  if (!isIecFamily(ast.standard)) return out;

  const stdName = ast.standard === "abnt" ? "ABNT NBR 5410" : ast.standard === "as-nzs" ? "AS/NZS 3000" : "IEC 60617";
  const seen = new Set<SLDNodeType>();
  for (const node of ast.nodes) {
    const friendly = ANSI_ONLY[node.nodeType];
    if (!friendly || seen.has(node.nodeType)) continue;
    seen.add(node.nodeType);
    out.push({
      severity: "warning",
      code: "SLD_SYMBOL_NOT_IN_STANDARD",
      message: `device "${node.nodeType}" (${friendly}) has no symbol in ${stdName}; rendered with the ANSI/IEEE form`,
      hint: `${friendly} is a North-American utility convention. Confirm an equivalent device exists in ${stdName}, or model it with an IEC-native device.`,
      fatal: false,
    });
  }
  return out;
}
