/**
 * Auto-derive a LegendSpec from an ecomap AST.
 *
 * Two sections, each emitted only when the diagram uses something non-trivial:
 *   1. Systems       — color swatch per used `category` (Hartman palette)
 *   2. Ties          — line style per used relationship type (strong/moderate/
 *                      weak/stressful/conflictual/broken). The default plain
 *                      line tie is treated as "obvious" and not listed.
 */

import type {
  DiagramAST,
  LegendItem,
  LegendSection,
  LegendSpec,
  RelationshipType,
} from "../../core/types";

// Mirrors the palette in renderer.ts. Kept colocated so the legend swatch
// matches whatever the renderer paints.
const CATEGORY_COLORS: Record<string, string> = {
  family: "#8D6E63",
  friends: "#42A5F5",
  work: "#66BB6A",
  education: "#FFA726",
  health: "#EF5350",
  "mental-health": "#AB47BC",
  religion: "#CCBB33",
  recreation: "#26C6DA",
  legal: "#78909C",
  government: "#8D6E63",
  financial: "#66BB6A",
  community: "#29B6F6",
  cultural: "#FFA726",
  substance: "#EF5350",
  technology: "#42A5F5",
  pet: "#8D6E63",
};

const ECOMAP_TIE_TYPES: ReadonlySet<RelationshipType> = new Set<RelationshipType>([
  "strong",
  "moderate",
  "weak",
  "stressful",
  "stressful-strong",
  "conflictual",
  "broken",
]);

const SECTIONS: LegendSection[] = [
  { id: "systems", title: "Systems" },
  { id: "ties", title: "Ties" },
];

export function buildEcomapLegend(ast: DiagramAST): LegendSpec {
  const items: LegendItem[] = [];

  // Systems — only categories actually present (excluding the center node).
  const usedCats = new Set<string>();
  for (const ind of ast.individuals) {
    if (ind.properties?.center === "true") continue;
    const cat = ind.properties?.category;
    if (cat) usedCats.add(cat);
  }
  // Stable ordering: sort alphabetically.
  const orderedCats = Array.from(usedCats).sort();
  for (const cat of orderedCats) {
    items.push({
      key: `cat.${cat}`,
      label: humanize(cat),
      kind: "fill",
      color: CATEGORY_COLORS[cat] ?? "#9ca3af",
      section: "systems",
    });
  }

  // Ties — only types used.
  const usedTies = new Set<RelationshipType>();
  for (const r of ast.relationships) {
    if (ECOMAP_TIE_TYPES.has(r.type)) usedTies.add(r.type);
  }
  const tieOrder: RelationshipType[] = [
    "strong",
    "moderate",
    "weak",
    "stressful",
    "stressful-strong",
    "conflictual",
    "broken",
  ];
  for (const t of tieOrder) {
    if (!usedTies.has(t)) continue;
    items.push(tieItem(t));
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

function tieItem(t: RelationshipType): LegendItem {
  const base: LegendItem = {
    key: t,
    label: humanize(t),
    kind: "line",
    section: "ties",
    pattern: "solid",
  };
  switch (t) {
    case "strong":
      // Three parallel lines visualised — represented in legend as a thicker solid bar.
      return { ...base, strokeWidth: 4 };
    case "moderate":
      return { ...base, strokeWidth: 3 };
    case "weak":
      return { ...base, pattern: "dashed", strokeWidth: 1.5 };
    case "stressful":
      return { ...base, pattern: "wavy", strokeWidth: 2 };
    case "stressful-strong":
      return { ...base, pattern: "wavy", strokeWidth: 3 };
    case "conflictual":
      return { ...base, kind: "edge", pattern: "wavy", marker: "X", strokeWidth: 2 };
    case "broken":
      return { ...base, pattern: "broken" };
    default:
      return base;
  }
}

function humanize(s: string): string {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
