/**
 * Build a LegendSpec from encodings emitted by the pedigree renderer.
 *
 * Pedigree-specific encodings:
 *   1. Trait fills (the legacy `legend: trait_id = "Label" (fill: ...)`
 *      directive) — merged into the unified system as a TRAITS section.
 *   2. Symbols (carriers, deceased, proband, etc.) — only when used.
 *
 * The standard square=Male / circle=Female convention is universal McGoldrick
 * and is excluded by default (matches genogram behavior).
 */

import type {
  LegendEntry,
  GeneticStatus,
  LegendItem,
  LegendSection,
  LegendSpec,
  Sex,
} from "../../core/types";
import type { ResolvedTheme, PersonTokens } from "../../core/theme";

const SECTIONS: LegendSection[] = [
  { id: "status", title: "Genetic status" },
  { id: "traits", title: "Traits" },
  { id: "symbols", title: "Symbols" },
];

// Explicit order, independent of node order or object property insertion order.
const ITEM_ORDER = [
  "status.affected", "status.carrier", "status.carrier-x",
  "status.obligate-carrier", "status.presymptomatic",
  "sex.unknown", "sex.other", "sex.nonbinary", "sex.intersex",
  "status.deceased", "status.stillborn",
  "status.sab", "status.sab.affected", "status.tab", "status.tab.affected",
  "status.ectopic", "status.ectopic.affected",
  "relationship.consanguineous", "relationship.separated",
  "marker.proband", "marker.consultand", "marker.evaluated",
];

export function buildPedigreeLegend(
  drawnItems: LegendItem[],
  traits: LegendEntry[] | undefined,
  theme: ResolvedTheme<PersonTokens>
): LegendSpec {
  const byKey = new Map(drawnItems.map((item) => [item.key, item]));
  const items = ITEM_ORDER.flatMap((key) => {
    const item = byKey.get(key);
    return item ? [item] : [];
  });

  // Legacy trait legend entries (when DSL uses `legend: cf = "Cystic Fibrosis"`).
  if (traits) {
    for (const entry of traits) {
      const isFull = !entry.fill || entry.fill === "full";
      items.push({
        key: entry.id,
        label: entry.label,
        kind: isFull ? "fill" : "fill-pattern",
        color: entry.color ?? theme.conditionFill,
        shape: isFull ? undefined : entry.fill,
        section: "traits",
      });
    }
  }

  return {
    mode: "auto",
    title: "Legend",
    position: "bottom-inline",
    columns: 1,
    sections: SECTIONS,
    items,
  };
}

export function geneticStatusItem(
  s: GeneticStatus,
  theme: ResolvedTheme<PersonTokens>
): LegendItem {
  switch (s) {
    case "affected":
      return {
        key: `status.${s}`,
        label: "Affected",
        kind: "fill",
        color: theme.conditionFill,
        section: "status",
      };
    case "carrier":
      return {
        key: `status.${s}`,
        label: "Carrier",
        kind: "shape",
        color: theme.stroke,
        fill: "url(#schematex-pedigree-carrier-pattern)",
        shape: "square",
        section: "status",
      };
    case "carrier-x":
      return {
        key: `status.${s}`,
        label: "X-linked carrier",
        kind: "shape",
        color: theme.stroke,
        fill: "url(#schematex-pedigree-carrier-pattern)",
        shape: "square",
        section: "status",
      };
    case "obligate-carrier":
      return {
        key: `status.${s}`,
        label: "Obligate carrier",
        kind: "shape",
        color: theme.stroke,
        fill: "url(#schematex-pedigree-carrier-pattern)",
        shape: "square",
        section: "status",
      };
    case "presymptomatic":
      return {
        key: `status.${s}`,
        label: "Presymptomatic",
        kind: "line",
        color: theme.conditionFill,
        pattern: "solid",
        strokeWidth: 2,
        section: "status",
      };
    default:
      return {
        key: `status.${s}`,
        label: humanize(s),
        kind: "fill",
        color: theme.conditionFill,
        section: "status",
      };
  }
}

export function sexShapeItem(s: Sex, theme: ResolvedTheme<PersonTokens>): LegendItem {
  return {
    key: `sex.${s}`,
    label: sexLabel(s),
    kind: "shape",
    shape: "diamond",
    fill: theme.fill,
    color: theme.stroke,
    section: "symbols",
  };
}

function sexLabel(s: Sex): string {
  switch (s) {
    case "unknown": return "Unknown sex";
    case "other": return "Other";
    case "nonbinary": return "Non-binary";
    case "intersex": return "Intersex";
    default: return s;
  }
}

function humanize(s: string): string {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
