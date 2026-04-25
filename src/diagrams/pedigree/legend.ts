/**
 * Auto-derive a LegendSpec from a pedigree AST.
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
  DiagramAST,
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

const OBVIOUS_SEX: ReadonlySet<Sex> = new Set<Sex>(["male", "female"]);

export function buildPedigreeLegend(
  ast: DiagramAST,
  theme: ResolvedTheme<PersonTokens>
): LegendSpec {
  const items: LegendItem[] = [];

  // Genetic status: standard pedigree-chart encoding (unaffected omitted —
  // it's the universal default).
  const statusUsed = new Set<GeneticStatus>();
  for (const ind of ast.individuals) {
    if (ind.geneticStatus && ind.geneticStatus !== "unaffected") {
      statusUsed.add(ind.geneticStatus);
    }
  }
  const statusOrder: GeneticStatus[] = [
    "affected",
    "carrier",
    "carrier-x",
    "obligate-carrier",
    "presymptomatic",
  ];
  for (const s of statusOrder) {
    if (!statusUsed.has(s)) continue;
    items.push(geneticStatusItem(s, theme));
  }

  // Legacy trait legend entries (when DSL uses `legend: cf = "Cystic Fibrosis"`).
  if (ast.legend && ast.legend.length > 0) {
    for (const entry of ast.legend) {
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

  // Non-obvious sex shapes (unknown / nonbinary / intersex).
  const sexUsed = new Set<Sex>();
  for (const ind of ast.individuals) sexUsed.add(ind.sex);
  const sexOrder: Sex[] = ["unknown", "other", "nonbinary", "intersex"];
  for (const s of sexOrder) {
    if (!sexUsed.has(s) || OBVIOUS_SEX.has(s)) continue;
    items.push({
      key: `sex.${s}`,
      label: sexLabel(s),
      kind: "shape",
      shape: "diamond",
      fill: theme.unknownFill,
      color: theme.stroke,
      section: "symbols",
    });
  }

  // Deceased
  const hasDeceased = ast.individuals.some((i) => i.status === "deceased");
  if (hasDeceased) {
    items.push({
      key: "status.deceased",
      label: "Deceased",
      kind: "marker",
      marker: "slash",
      color: theme.deceasedMark,
      section: "symbols",
    });
  }

  // Proband / consultand markers
  const hasProband = ast.individuals.some((i) => i.markers?.includes("proband"));
  if (hasProband) {
    items.push({
      key: "marker.proband",
      label: "Proband (P) — first affected case identified",
      kind: "marker",
      marker: "P",
      section: "symbols",
    });
  }
  const hasConsultand = ast.individuals.some((i) => i.markers?.includes("consultand"));
  if (hasConsultand) {
    items.push({
      key: "marker.consultand",
      label: "Consultand (C)",
      kind: "marker",
      marker: "C",
      section: "symbols",
    });
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

function geneticStatusItem(
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
        kind: "fill-pattern",
        color: theme.conditionFill,
        shape: "half-left",
        section: "status",
      };
    case "carrier-x":
      return {
        key: `status.${s}`,
        label: "X-linked carrier",
        kind: "marker",
        marker: "dot",
        color: theme.conditionFill,
        section: "status",
      };
    case "obligate-carrier":
      return {
        key: `status.${s}`,
        label: "Obligate carrier",
        kind: "marker",
        marker: "dot",
        color: theme.conditionFill,
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
