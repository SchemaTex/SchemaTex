/**
 * Auto-derive a LegendSpec from a genogram AST.
 *
 * Walks the AST and emits one LegendItem per encoding axis actually present:
 *
 *   1. Symbols       — sex shapes + status overlays
 *   2. Structural    — couple / parent-child / twin relationships
 *   3. Relationships — emotional relationships (color + line-style + width)
 *   4. Conditions    — one per unique condition.label (color from condition.color)
 *   5. Heritage      — one per heritage id (palette-cycled)
 *   6. Markers       — proband / index-person / etc.
 *
 * Items are emitted only for encodings actually used in the diagram.
 */

import type {
  DiagramAST,
  Individual,
  IndividualMarker,
  IndividualStatus,
  LegendItem,
  LegendSection,
  LegendSpec,
  RelationshipType,
  Sex,
} from "../../core/types";
import type { PersonTokens } from "../../core/theme";

type GenogramThemeLike = {
  stroke: string;
  fill: string;
  deceasedMark: string;
} & Pick<PersonTokens, "maleFill" | "femaleFill" | "unknownFill">;

const EMOTIONAL_TYPES: ReadonlySet<string> = new Set([
  "harmony", "close", "bestfriends", "love", "inlove", "friendship",
  "hostile", "conflict", "enmity", "distant-hostile", "cutoff",
  "close-hostile", "fused", "fused-hostile",
  "distant", "normal", "nevermet",
  "abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect",
  "manipulative", "controlling", "jealous",
  "focused", "focused-neg", "distrust", "admirer", "limerence",
]);

const STRUCTURAL_TYPES: ReadonlySet<string> = new Set([
  "married", "divorced", "separated", "engaged", "cohabiting",
  "domestic-partnership", "consanguineous",
  "parent-child", "adopted", "foster",
  "twin-identical", "twin-fraternal",
]);

// Heritage palette — cycles through the unified 8-color category palette
// (see src/core/theme.ts DEFAULT_PALETTE). Kept local so heritage colors are
// stable independent of theme switches.
const HERITAGE_PALETTE = [
  "#2563eb", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2", "#ca8a04", "#db2777",
];

const SECTIONS: LegendSection[] = [
  { id: "symbols", title: "Symbols" },
  { id: "structural", title: "Structural" },
  { id: "relationships", title: "Relationships" },
  { id: "conditions", title: "Conditions" },
  { id: "heritage", title: "Heritage" },
  { id: "markers", title: "Markers" },
];

export function buildGenogramLegend(
  ast: DiagramAST,
  theme?: GenogramThemeLike
): LegendSpec {
  const items: LegendItem[] = [];

  items.push(...buildSymbolItems(ast.individuals, theme));
  items.push(...buildStructuralItems(ast.relationships, theme));
  items.push(...buildRelationshipItems(ast.relationships));
  items.push(...buildConditionItems(ast.individuals));
  items.push(...buildHeritageItems(ast.individuals));
  items.push(...buildMarkerItems(ast.individuals, theme));

  return {
    mode: "auto",
    title: "Legend",
    position: "bottom-inline",
    columns: 1,
    sections: SECTIONS,
    items,
  };
}

// ─── Symbols ─────────────────────────────────────────────────

// Universal genogram conventions (McGoldrick standard) — square = male and
// circle = female are read at a glance by anyone literate in the format. We
// only emit the *less obvious* sex shapes (unknown, nonbinary, etc.) and the
// status overlays (deceased X, stillborn, miscarriage…) into the auto-derived
// legend.
const OBVIOUS_SEX: ReadonlySet<Sex> = new Set<Sex>(["male", "female"]);

function buildSymbolItems(
  individuals: Individual[],
  theme?: GenogramThemeLike
): LegendItem[] {
  const items: LegendItem[] = [];
  const sexUsed = new Set<Sex>();
  const statusUsed = new Set<IndividualStatus>();

  for (const ind of individuals) {
    sexUsed.add(ind.sex);
    if (ind.status && ind.status !== "alive") statusUsed.add(ind.status);
  }

  // Only emit non-obvious sex variants. Male/female are universally known.
  const sexOrder: Sex[] = [
    "unknown", "other", "nonbinary", "intersex",
  ];
  for (const s of sexOrder) {
    if (!sexUsed.has(s)) continue;
    if (OBVIOUS_SEX.has(s)) continue;
    items.push({
      key: `sex.${s}`,
      label: sexLabel(s),
      kind: "shape",
      shape: sexShape(s),
      fill: theme ? sexFill(s, theme) : undefined,
      color: theme?.stroke,
      section: "symbols",
    });
  }

  const statusOrder: IndividualStatus[] = [
    "deceased", "stillborn", "miscarriage", "abortion",
    "pregnancy", "sab", "tab", "ectopic",
  ];
  for (const st of statusOrder) {
    if (!statusUsed.has(st)) continue;
    items.push({
      key: `status.${st}`,
      label: statusLabel(st),
      kind: "marker",
      marker: statusMarker(st),
      color: theme?.deceasedMark,
      section: "symbols",
    });
  }

  return items;
}

function sexFill(s: Sex, theme: GenogramThemeLike): string {
  switch (s) {
    case "male":
      return theme.maleFill;
    case "female":
      return theme.femaleFill;
    default:
      return theme.unknownFill;
  }
}

function sexShape(s: Sex): string {
  switch (s) {
    case "male":
      return "square";
    case "female":
      return "circle";
    case "unknown":
      return "diamond";
    case "other":
    case "nonbinary":
      return "diamond";
    case "intersex":
      return "diamond";
    default:
      return "square";
  }
}

function sexLabel(s: Sex): string {
  switch (s) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    case "unknown":
      return "Unknown";
    case "other":
      return "Other";
    case "nonbinary":
      return "Non-binary";
    case "intersex":
      return "Intersex";
    default:
      return s;
  }
}

function statusMarker(s: IndividualStatus): string {
  switch (s) {
    case "deceased":
    case "stillborn":
      return "X";
    case "miscarriage":
    case "sab":
    case "tab":
    case "abortion":
    case "ectopic":
      return "slash";
    default:
      return "dot";
  }
}

function statusLabel(s: IndividualStatus): string {
  switch (s) {
    case "deceased":
      return "Deceased";
    case "stillborn":
      return "Stillborn";
    case "miscarriage":
      return "Miscarriage";
    case "abortion":
      return "Abortion";
    case "pregnancy":
      return "Pregnancy";
    case "sab":
      return "Spontaneous abortion";
    case "tab":
      return "Therapeutic abortion";
    case "ectopic":
      return "Ectopic pregnancy";
    default:
      return s;
  }
}

// ─── Structural ──────────────────────────────────────────────

// Universal genogram conventions everyone in the field reads at a glance —
// these are excluded from auto-derived legends to keep the legend signal-rich
// (only encodings that vary by chart get listed).
const OBVIOUS_STRUCTURAL: ReadonlySet<RelationshipType> = new Set<RelationshipType>([
  "married",       // single horizontal line — universal McGoldrick
  "parent-child",  // single vertical line — universal
]);

function buildStructuralItems(
  rels: { type: RelationshipType }[],
  theme?: GenogramThemeLike
): LegendItem[] {
  const used = new Set<string>();
  for (const r of rels) {
    if (STRUCTURAL_TYPES.has(r.type)) used.add(r.type);
  }
  // Order matters for legend display.
  const order: RelationshipType[] = [
    "divorced", "separated", "engaged", "cohabiting",
    "domestic-partnership", "consanguineous",
    "adopted", "foster",
    "twin-identical", "twin-fraternal",
  ];
  const items: LegendItem[] = [];
  for (const t of order) {
    if (!used.has(t)) continue;
    if (OBVIOUS_STRUCTURAL.has(t)) continue;
    items.push(structuralItem(t, theme));
  }
  return items;
}

function structuralItem(t: RelationshipType, theme?: GenogramThemeLike): LegendItem {
  const base: LegendItem = {
    key: t,
    label: humanize(t),
    kind: "line",
    color: theme?.stroke,
    section: "structural",
    pattern: "solid",
  };
  switch (t) {
    case "divorced":
      return { ...base, kind: "edge", marker: "X", pattern: "solid" };
    case "separated":
      return { ...base, kind: "edge", marker: "slash", pattern: "solid" };
    case "engaged":
    case "cohabiting":
    case "adopted":
    case "foster":
      return { ...base, pattern: "dashed" };
    case "consanguineous":
      return { ...base, pattern: "double" };
    case "twin-identical":
    case "twin-fraternal":
      return { ...base, pattern: "solid" };
    default:
      return base;
  }
}

// ─── Emotional relationships ────────────────────────────────
//
// Mirrors the encoding in renderer.ts (getEmotionalColor / Style / StrokeWidth).

function buildRelationshipItems(rels: { type: RelationshipType }[]): LegendItem[] {
  const used = new Set<string>();
  for (const r of rels) {
    if (EMOTIONAL_TYPES.has(r.type)) used.add(r.type);
  }
  const order: RelationshipType[] = [
    "harmony", "close", "bestfriends", "love", "inlove", "friendship",
    "hostile", "conflict", "enmity", "distant-hostile", "cutoff",
    "close-hostile", "fused", "fused-hostile",
    "distant", "normal", "nevermet",
    "abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect",
    "manipulative", "controlling", "jealous",
    "focused", "focused-neg", "distrust", "admirer", "limerence",
  ];
  const items: LegendItem[] = [];
  for (const t of order) {
    if (!used.has(t)) continue;
    items.push({
      key: t,
      label: humanize(t),
      kind: "line",
      color: emotionalColor(t),
      pattern: emotionalPattern(t),
      strokeWidth: emotionalStrokeWidth(t),
      section: "relationships",
    });
  }
  return items;
}

function emotionalColor(t: RelationshipType): string {
  if (["harmony", "close", "bestfriends", "love", "inlove", "friendship"].includes(t)) return "#4caf50";
  if (["hostile", "conflict", "enmity", "distant-hostile", "cutoff"].includes(t)) return "#e53935";
  if (["close-hostile", "fused", "fused-hostile"].includes(t)) return "#9c27b0";
  if (["distant", "normal", "nevermet"].includes(t)) return "#9e9e9e";
  if (["abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect"].includes(t)) return "#b71c1c";
  if (["manipulative", "controlling", "jealous"].includes(t)) return "#e65100";
  return "#1565c0";
}

function emotionalPattern(t: RelationshipType): "solid" | "dashed" | "zigzag" | "broken" {
  if (["hostile", "conflict", "enmity", "distant-hostile", "close-hostile", "fused-hostile"].includes(t)) return "zigzag";
  if (["distant", "nevermet"].includes(t)) return "dashed";
  if (t === "cutoff") return "broken";
  return "solid";
}

function emotionalStrokeWidth(t: RelationshipType): number {
  if (["fused", "fused-hostile", "bestfriends"].includes(t)) return 4;
  if (["close", "close-hostile", "love", "inlove"].includes(t)) return 3;
  return 2;
}

// ─── Conditions ──────────────────────────────────────────────

function buildConditionItems(individuals: Individual[]): LegendItem[] {
  const seen = new Map<string, LegendItem>();
  for (const ind of individuals) {
    if (!ind.conditions) continue;
    for (const c of ind.conditions) {
      if (seen.has(c.label)) continue;
      const color = c.color ?? defaultCategoryColor(c.category);
      const isFull = c.fill === "full";
      seen.set(c.label, {
        key: c.label,
        label: humanize(c.label),
        kind: isFull ? "fill" : "fill-pattern",
        color,
        shape: isFull ? undefined : c.fill,
        section: "conditions",
      });
    }
  }
  return Array.from(seen.values());
}

function defaultCategoryColor(cat: string | undefined): string {
  if (!cat) return "#9ca3af";
  const map: Record<string, string> = {
    cardiovascular: "#dc2626",
    cancer: "#a21caf",
    diabetes: "#d97706",
    "mental-health": "#2563eb",
    depression: "#1d4ed8",
    anxiety: "#0ea5e9",
    bipolar: "#6366f1",
    ptsd: "#475569",
    "substance-alcohol": "#92400e",
    "substance-drugs": "#7c2d12",
    "substance-tobacco": "#854d0e",
    neurological: "#7e22ce",
    respiratory: "#0891b2",
    autoimmune: "#be185d",
    genetic: "#0f766e",
    reproductive: "#db2777",
    "eating-disorder": "#9333ea",
    "learning-developmental": "#0369a1",
    kidney: "#b45309",
    "liver-gi": "#ca8a04",
    obesity: "#ea580c",
    other: "#9ca3af",
  };
  return map[cat] ?? "#9ca3af";
}

// ─── Heritage ────────────────────────────────────────────────

function buildHeritageItems(individuals: Individual[]): LegendItem[] {
  const all = new Set<string>();
  for (const ind of individuals) {
    if (!ind.heritage) continue;
    for (const h of ind.heritage) all.add(h);
  }
  const ordered = Array.from(all).sort();
  return ordered.map((id, i) => ({
    key: id,
    label: humanize(id),
    kind: "fill",
    color: HERITAGE_PALETTE[i % HERITAGE_PALETTE.length],
    section: "heritage",
  }));
}

// ─── Markers ─────────────────────────────────────────────────

function buildMarkerItems(
  individuals: Individual[],
  theme?: GenogramThemeLike
): LegendItem[] {
  const used = new Set<IndividualMarker>();
  for (const ind of individuals) {
    if (!ind.markers) continue;
    for (const m of ind.markers) used.add(m);
  }
  const order: IndividualMarker[] = [
    "proband", "consultand", "evaluated", "index-person",
    "transgender", "no-children", "infertile",
  ];
  const items: LegendItem[] = [];
  for (const m of order) {
    if (!used.has(m)) continue;
    items.push(markerItem(m, theme));
  }
  return items;
}

function markerItem(m: IndividualMarker, theme?: GenogramThemeLike): LegendItem {
  switch (m) {
    case "proband":
      return { key: `marker.${m}`, label: "Proband (P)", kind: "marker", marker: "P", section: "markers" };
    case "consultand":
      return { key: `marker.${m}`, label: "Consultand (C)", kind: "marker", marker: "C", section: "markers" };
    case "evaluated":
      return { key: `marker.${m}`, label: "Evaluated (E)", kind: "marker", marker: "E", section: "markers" };
    case "index-person":
      return {
        key: `marker.${m}`,
        label: "Index person (focal subject)",
        kind: "shape",
        shape: "concentric-square",
        fill: "#fef3c7",
        color: theme?.stroke,
        section: "markers",
      };
    case "transgender":
      return { key: `marker.${m}`, label: "Transgender", kind: "marker", marker: "star", section: "markers" };
    case "no-children":
      return { key: `marker.${m}`, label: "No children (by choice)", kind: "marker", marker: "slash", section: "markers" };
    case "infertile":
      return { key: `marker.${m}`, label: "Infertile", kind: "marker", marker: "X", section: "markers" };
    default:
      return { key: `marker.${m}`, label: humanize(m), kind: "marker", marker: "dot", section: "markers" };
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function humanize(s: string): string {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
