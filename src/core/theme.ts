/**
 * Shared design-token system for all Schematex diagram renderers.
 *
 * Two-layer architecture:
 *   1. BaseTheme — universal tokens every diagram uses
 *   2. Semantic extensions — diagram-family tokens (PersonTokens, BiologyTokens, …)
 *
 * Three built-in presets: default, monochrome, dark.
 * All tokens are also exposed as CSS custom properties (--schematex-*)
 * so consumers can override them.
 */

// ─── Theme Name ────────────────────────────────────────────

export type ThemeName = "default" | "monochrome" | "dark";

// ─── Base Theme ────────────────────────────────────────────

export interface BaseTheme {
  bg: string;
  text: string;
  textMuted: string;
  stroke: string;
  fill: string;
  fillMuted: string;
  /** Emphasis / interactive / link color. Use for net labels, focus, selected. */
  accent: string;
  positive: string;
  negative: string;
  /** Mid-gray. Use for muted strokes, neutral-valence edges, dashed separators. */
  neutral: string;
  warn: string;
  /** Category palette — 8 distinguishable colors for ecomap systems, sociogram groups, etc. */
  palette: readonly string[];
}

// ─── Diagram-Family Semantic Extensions ────────────────────

export interface PersonTokens {
  maleFill: string;
  femaleFill: string;
  unknownFill: string;
  deceasedMark: string;
  conditionFill: string;
}

export interface BiologyTokens {
  cladeColors: readonly string[];
  supportGood: string;
  supportMedium: string;
  supportWarn: string;
  supportBad: string;
}

/**
 * Tokens for set-theory diagrams (Venn / Euler). Paletteof set fills is
 * tuned slightly softer than BaseTheme to blend nicely under
 * `mix-blend-mode: multiply`.
 */
export interface VennTokens {
  vennSetColors: readonly string[];
  vennBlendMode: "multiply" | "screen" | "none";
  vennSetOpacity: number;
  vennSetStroke: string;
  vennLabelColor: string;
  vennCountColor: string;
  vennLeaderColor: string;
}

/**
 * Tokens for industrial / compliance diagrams (circuit, ladder, SLD, logic gate).
 * These diagrams must stay monochrome under IEEE 315 / IEC 61131-3 standards, so
 * `default` and `monochrome` resolve to pure black-on-white. `dark` is the only
 * variant that shifts — it inverts luminance (light-on-dark) for dark-mode UI.
 * No colorful variant is exposed by design.
 */
export interface IndustrialTokens {
  bg: string;
  stroke: string;
  strokeHeavy: string;
  text: string;
  textMuted: string;
  /** Reserved accent for net/bus labels (not for body lines). */
  accent: string;
  /** Fault/missing-symbol indicator. */
  error: string;
}

/**
 * Tokens for flowchart semantic node classes. Kept separate from BaseTheme so
 * the class-fill palette can be themed without touching structural tokens.
 */
export interface FlowchartClassPair {
  fill: string;
  stroke: string;
  text: string;
}

export interface FlowchartTokens {
  stadiumFill: string;
  diamondFill: string;
  roundFill: string;
  classes: {
    start: FlowchartClassPair;
    process: FlowchartClassPair;
    decision: FlowchartClassPair;
    success: FlowchartClassPair;
    danger: FlowchartClassPair;
    neutral: FlowchartClassPair;
  };
}

/**
 * Tokens for knowledge / brainstorming diagrams (mindmap).
 * Pure color tokens — stroke widths live in mindmap-internal constants.
 */
export interface MindmapTokens {
  centralFill: string;
  branchPalette: readonly string[];
  /** Inline `code` foreground/background. */
  codeFg: string;
  codeBg: string;
  /** Link color (with underline). */
  linkColor: string;
  /** Checkbox stroke color (unchecked state). */
  checkboxStroke: string;
  /** Checkbox fill when checked. */
  checkboxFill: string;
}

/**
 * Tokens for timeline diagrams. Palette-driven so categories/tracks share
 * colors with the rest of the diagram family (ecomap/sociogram/phylo).
 * Era bands and card surfaces use theme-neutral tints so no magic hex codes
 * leak into the renderer.
 */
export interface TimelineTokens {
  axis: string;
  axisLabel: string;
  eraLabel: string;
  eraOpacity: number;
  eraPlotOpacity: number;
  /** Alternating lane stripe fill. */
  laneStripe: string;
  laneStripeOpacity: number;
  /** Category / task bar palette. Cycled by `category` (fallback to trackIdx). */
  categoryPalette: readonly string[];
  /** Point/milestone ring — defaults to accent but configurable. */
  markerRing: string;
  markerFill: string;
  milestoneFill: string;
  /** Gantt vertical pin shaft. */
  pinShaft: string;
  /** Lollipop card. */
  cardBg: string;
  cardStroke: string;
  cardText: string;
  cardShadow: string;
  /** Gantt legend chip background. */
  legendBg: string;
  legendStroke: string;
}

// ─── Resolved Theme ────────────────────────────────────────

export type ResolvedTheme<T = object> = BaseTheme & T;

// ─── Built-in Presets ──────────────────────────────────────

/**
 * Unified 8-color category palettes. Single source of truth for every
 * diagram family — ecomap systems, sociogram groups, phylo clades, fishbone
 * bones, Venn sets all cycle through the same colors per theme.
 * Default uses Tailwind 600; dark uses Catppuccin Mocha; mono uses greys.
 */
const DEFAULT_PALETTE = [
  "#2563eb", // blue-600
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#7c3aed", // violet-600
  "#dc2626", // red-600
  "#0891b2", // cyan-600
  "#db2777", // pink-600
  "#475569", // slate-600
] as const;

const MONOCHROME_PALETTE = [
  "#1f2937",
  "#374151",
  "#4b5563",
  "#6b7280",
  "#9ca3af",
  "#7a7a7a",
  "#525252",
  "#262626",
] as const;

const DARK_PALETTE = [
  "#89b4fa", // blue
  "#a6e3a1", // green
  "#fab387", // peach
  "#cba6f7", // mauve
  "#f38ba8", // red
  "#94e2d5", // teal
  "#f5c2e7", // pink
  "#89dceb", // sky
] as const;

const DEFAULT_THEME: BaseTheme = {
  bg: "#ffffff",
  text: "#0f172a",
  textMuted: "#475569",
  stroke: "#334155",
  fill: "#ffffff",
  fillMuted: "#f1f5f9",
  accent: "#2563eb",
  positive: "#059669",
  negative: "#dc2626",
  neutral: "#94a3b8",
  warn: "#d97706",
  palette: DEFAULT_PALETTE,
};

const MONOCHROME_THEME: BaseTheme = {
  bg: "#ffffff",
  text: "#000000",
  textMuted: "#555555",
  stroke: "#000000",
  fill: "#ffffff",
  fillMuted: "#f0f0f0",
  accent: "#000000",
  positive: "#000000",
  negative: "#000000",
  neutral: "#888888",
  warn: "#000000",
  palette: MONOCHROME_PALETTE,
};

const DARK_THEME: BaseTheme = {
  bg: "#1e1e2e",
  text: "#cdd6f4",
  textMuted: "#7f849c",
  stroke: "#cdd6f4",
  fill: "#313244",
  fillMuted: "#45475a",
  accent: "#89b4fa",
  positive: "#a6e3a1",
  negative: "#f38ba8",
  neutral: "#6c7086",
  warn: "#fab387",
  palette: DARK_PALETTE,
};

export const BASE_THEMES: Record<ThemeName, BaseTheme> = {
  default: DEFAULT_THEME,
  monochrome: MONOCHROME_THEME,
  dark: DARK_THEME,
};

// ─── Person Tokens Per Theme ───────────────────────────────

const DEFAULT_PERSON: PersonTokens = {
  maleFill: "#dbeafe",
  femaleFill: "#fce7f3",
  unknownFill: "#f5f5f5",
  deceasedMark: "#b71c1c",
  conditionFill: "#1565c0",
};

const MONOCHROME_PERSON: PersonTokens = {
  maleFill: "#ffffff",
  femaleFill: "#ffffff",
  unknownFill: "#ffffff",
  deceasedMark: "#000000",
  conditionFill: "#000000",
};

const DARK_PERSON: PersonTokens = {
  maleFill: "#1e3a5f",
  femaleFill: "#3e1f3e",
  unknownFill: "#45475a",
  deceasedMark: "#f38ba8",
  conditionFill: "#89b4fa",
};

export const PERSON_TOKENS: Record<ThemeName, PersonTokens> = {
  default: DEFAULT_PERSON,
  monochrome: MONOCHROME_PERSON,
  dark: DARK_PERSON,
};

// ─── Biology Tokens Per Theme ──────────────────────────────

const DEFAULT_BIOLOGY: BiologyTokens = {
  cladeColors: DEFAULT_PALETTE,
  supportGood: "#059669",
  supportMedium: "#ca8a04",
  supportWarn: "#d97706",
  supportBad: "#dc2626",
};

const MONOCHROME_BIOLOGY: BiologyTokens = {
  cladeColors: MONOCHROME_PALETTE,
  supportGood: "#000000",
  supportMedium: "#555555",
  supportWarn: "#888888",
  supportBad: "#aaaaaa",
};

const DARK_BIOLOGY: BiologyTokens = {
  cladeColors: DARK_PALETTE,
  supportGood: "#a6e3a1",
  supportMedium: "#f9e2af",
  supportWarn: "#fab387",
  supportBad: "#f38ba8",
};

export const BIOLOGY_TOKENS: Record<ThemeName, BiologyTokens> = {
  default: DEFAULT_BIOLOGY,
  monochrome: MONOCHROME_BIOLOGY,
  dark: DARK_BIOLOGY,
};

// ─── Venn Tokens Per Theme ─────────────────────────────────

const DEFAULT_VENN: VennTokens = {
  vennSetColors: DEFAULT_PALETTE,
  vennBlendMode: "multiply",
  vennSetOpacity: 0.38,
  vennSetStroke: "#94a3b8",
  vennLabelColor: "#0f172a",
  vennCountColor: "#0f172a",
  vennLeaderColor: "#64748b",
};

const MONOCHROME_VENN: VennTokens = {
  vennSetColors: ["#999999", "#999999", "#999999", "#999999", "#999999", "#999999", "#999999", "#999999"],
  vennBlendMode: "none",
  vennSetOpacity: 0.22,
  vennSetStroke: "#000000",
  vennLabelColor: "#000000",
  vennCountColor: "#000000",
  vennLeaderColor: "#444444",
};

const DARK_VENN: VennTokens = {
  vennSetColors: DARK_PALETTE,
  vennBlendMode: "screen",
  vennSetOpacity: 0.55,
  vennSetStroke: "#585b70",
  vennLabelColor: "#cdd6f4",
  vennCountColor: "#f9e2af",
  vennLeaderColor: "#7f849c",
};

export const VENN_TOKENS: Record<ThemeName, VennTokens> = {
  default: DEFAULT_VENN,
  monochrome: MONOCHROME_VENN,
  dark: DARK_VENN,
};

// ─── Mindmap Tokens Per Theme ──────────────────────────────

// Kept as its own struct so the mindmap palette can diverge from BaseTheme
// later if we want (e.g., a softer / more organic set of branch colors).
// Today the values mirror BaseTheme.palette so mindmap visually belongs with
// the rest of the diagram family.

const DEFAULT_MINDMAP: MindmapTokens = {
  centralFill: "#0f172a",
  branchPalette: DEFAULT_PALETTE,
  codeFg: "#be185d",
  codeBg: "#fdf2f8",
  linkColor: "#2563eb",
  checkboxStroke: "#64748b",
  checkboxFill: "#10b981",
};

const MONOCHROME_MINDMAP: MindmapTokens = {
  centralFill: "#000000",
  branchPalette: ["#000000"],
  codeFg: "#000000",
  codeBg: "#e5e5e5",
  linkColor: "#000000",
  checkboxStroke: "#000000",
  checkboxFill: "#000000",
};

const DARK_MINDMAP: MindmapTokens = {
  centralFill: "#cdd6f4",
  branchPalette: DARK_PALETTE,
  codeFg: "#f5c2e7",
  codeBg: "#313244",
  linkColor: "#89b4fa",
  checkboxStroke: "#a6adc8",
  checkboxFill: "#a6e3a1",
};

export const MINDMAP_TOKENS: Record<ThemeName, MindmapTokens> = {
  default: DEFAULT_MINDMAP,
  monochrome: MONOCHROME_MINDMAP,
  dark: DARK_MINDMAP,
};

// ─── Industrial Tokens Per Theme ───────────────────────────

const DEFAULT_INDUSTRIAL: IndustrialTokens = {
  bg: "#ffffff",
  stroke: "#222222",
  strokeHeavy: "#111111",
  text: "#111111",
  textMuted: "#555555",
  accent: "#1d4e89",
  error: "#cc0000",
};

const MONOCHROME_INDUSTRIAL: IndustrialTokens = {
  bg: "#ffffff",
  stroke: "#000000",
  strokeHeavy: "#000000",
  text: "#000000",
  textMuted: "#333333",
  accent: "#000000",
  error: "#000000",
};

// Dark = inverted luminance only. No colorful semantics — still compliance-grade.
const DARK_INDUSTRIAL: IndustrialTokens = {
  bg: "#1e1e2e",
  stroke: "#cdd6f4",
  strokeHeavy: "#ffffff",
  text: "#cdd6f4",
  textMuted: "#9399b2",
  accent: "#89b4fa",
  error: "#f38ba8",
};

export const INDUSTRIAL_TOKENS: Record<ThemeName, IndustrialTokens> = {
  default: DEFAULT_INDUSTRIAL,
  monochrome: MONOCHROME_INDUSTRIAL,
  dark: DARK_INDUSTRIAL,
};

export function resolveIndustrialTheme(name: string): ResolvedTheme<IndustrialTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...INDUSTRIAL_TOKENS[themeName] };
}

// ─── Flowchart Tokens Per Theme ────────────────────────────

const DEFAULT_FLOWCHART: FlowchartTokens = {
  stadiumFill: "#dbeafe",
  diamondFill: "#fef3c7",
  roundFill: "#dcfce7",
  classes: {
    start:    { fill: "#f0ece0", stroke: "#9a8b6a", text: "#5c4e2e" },
    process:  { fill: "#e8e4ff", stroke: "#8b7dd8", text: "#4c3a8f" },
    decision: { fill: "#fde8c8", stroke: "#d4985c", text: "#8a5a1f" },
    success:  { fill: "#d4f0e0", stroke: "#7bc19a", text: "#1e5a3a" },
    danger:   { fill: "#fbe0dc", stroke: "#d89181", text: "#8a3525" },
    neutral:  { fill: "#ececec", stroke: "#a0a0a0", text: "#555555" },
  },
};

const MONOCHROME_FLOWCHART: FlowchartTokens = {
  stadiumFill: "#ffffff",
  diamondFill: "#ffffff",
  roundFill: "#ffffff",
  classes: {
    start:    { fill: "#ffffff", stroke: "#000000", text: "#000000" },
    process:  { fill: "#ffffff", stroke: "#000000", text: "#000000" },
    decision: { fill: "#ffffff", stroke: "#000000", text: "#000000" },
    success:  { fill: "#ffffff", stroke: "#000000", text: "#000000" },
    danger:   { fill: "#ffffff", stroke: "#000000", text: "#000000" },
    neutral:  { fill: "#ffffff", stroke: "#000000", text: "#000000" },
  },
};

const DARK_FLOWCHART: FlowchartTokens = {
  stadiumFill: "#1e3a5f",
  diamondFill: "#3a3a2a",
  roundFill: "#1f3a2a",
  classes: {
    start:    { fill: "#3a3326", stroke: "#c9b88a", text: "#f5e7c7" },
    process:  { fill: "#2e2a52", stroke: "#a89ee0", text: "#d9d2ff" },
    decision: { fill: "#3a2d1a", stroke: "#d4985c", text: "#f2d5a8" },
    success:  { fill: "#1e3a2a", stroke: "#7bc19a", text: "#cdefd8" },
    danger:   { fill: "#3a231f", stroke: "#d89181", text: "#f2d0c8" },
    neutral:  { fill: "#313244", stroke: "#7f849c", text: "#cdd6f4" },
  },
};

export const FLOWCHART_TOKENS: Record<ThemeName, FlowchartTokens> = {
  default: DEFAULT_FLOWCHART,
  monochrome: MONOCHROME_FLOWCHART,
  dark: DARK_FLOWCHART,
};

export function resolveFlowchartTheme(name: string): ResolvedTheme<FlowchartTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...FLOWCHART_TOKENS[themeName] };
}

export function resolveMindmapTheme(name: string): ResolvedTheme<MindmapTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...MINDMAP_TOKENS[themeName] };
}

// ─── Timeline Tokens Per Theme ─────────────────────────────

const DEFAULT_TIMELINE: TimelineTokens = {
  axis: "#334155",
  axisLabel: "#475569",
  eraLabel: "#0f172a",
  eraOpacity: 0.55,
  eraPlotOpacity: 0.14,
  laneStripe: "#f1f5f9",
  laneStripeOpacity: 0.6,
  categoryPalette: DEFAULT_PALETTE,
  markerRing: "#2563eb",
  markerFill: "#ffffff",
  milestoneFill: "#d97706",
  pinShaft: "#94a3b8",
  cardBg: "#ffffff",
  cardStroke: "#cbd5e1",
  cardText: "#0f172a",
  cardShadow: "rgba(15,23,42,0.08)",
  legendBg: "#f8fafc",
  legendStroke: "#e2e8f0",
};

const MONOCHROME_TIMELINE: TimelineTokens = {
  axis: "#000000",
  axisLabel: "#333333",
  eraLabel: "#000000",
  eraOpacity: 0.2,
  eraPlotOpacity: 0.08,
  laneStripe: "#f0f0f0",
  laneStripeOpacity: 0.6,
  categoryPalette: MONOCHROME_PALETTE,
  markerRing: "#000000",
  markerFill: "#ffffff",
  milestoneFill: "#000000",
  pinShaft: "#888888",
  cardBg: "#ffffff",
  cardStroke: "#000000",
  cardText: "#000000",
  cardShadow: "rgba(0,0,0,0.06)",
  legendBg: "#ffffff",
  legendStroke: "#000000",
};

const DARK_TIMELINE: TimelineTokens = {
  axis: "#cdd6f4",
  axisLabel: "#9399b2",
  eraLabel: "#cdd6f4",
  eraOpacity: 0.5,
  eraPlotOpacity: 0.18,
  laneStripe: "#313244",
  laneStripeOpacity: 0.5,
  categoryPalette: DARK_PALETTE,
  markerRing: "#89b4fa",
  markerFill: "#1e1e2e",
  milestoneFill: "#fab387",
  pinShaft: "#6c7086",
  cardBg: "#313244",
  cardStroke: "#45475a",
  cardText: "#cdd6f4",
  cardShadow: "rgba(0,0,0,0.35)",
  legendBg: "#181825",
  legendStroke: "#45475a",
};

export const TIMELINE_TOKENS: Record<ThemeName, TimelineTokens> = {
  default: DEFAULT_TIMELINE,
  monochrome: MONOCHROME_TIMELINE,
  dark: DARK_TIMELINE,
};

export function resolveTimelineTheme(name: string): ResolvedTheme<TimelineTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...TIMELINE_TOKENS[themeName] };
}

// ─── Petri-net Tokens Per Theme ────────────────────────────

/**
 * Tokens for Petri nets (place/transition nets). Petri net is a CS/maths
 * formalism, not an IEC/IEEE compliance drawing — so unlike IndustrialTokens it
 * gets a tasteful colour theme in `default`. The house rule (see
 * 34-PETRINET-STANDARD §6): body in neutral strokes; green (`positive`) reserved
 * for "enabled", red (`negative`) reserved for "inhibitor / dead", blue
 * (`accent`) only for weight/rate annotations. `monochrome` reproduces the
 * Murata-1989 textbook look faithfully — colour falls back to shape there.
 */
export interface PetriTokens {
  placeFill: string;
  placeStroke: string;
  /** Immediate transition: solid bar — the "ink" colour. */
  transitionBarFill: string;
  /** Timed transition: hollow box interior. */
  transitionBoxFill: string;
  transitionStroke: string;
  /** Marking dot colour. */
  tokenFill: string;
  /** Enabled (fireable) transition highlight. */
  enabledStroke: string;
  enabledFill: string;
  /** Dead / disabled transition. */
  deadStroke: string;
  /** Inhibitor + reset arcs. */
  inhibitorStroke: string;
  arcStroke: string;
  weightLabel: string;
  /** Coloured-token (CPN) palette. */
  tokenPalette: readonly string[];
}

const DEFAULT_PETRI: PetriTokens = {
  placeFill: "#ffffff",
  placeStroke: "#334155",
  transitionBarFill: "#334155",
  transitionBoxFill: "#ffffff",
  transitionStroke: "#334155",
  tokenFill: "#0f172a",
  enabledStroke: "#059669",
  enabledFill: "#ecfdf5",
  deadStroke: "#94a3b8",
  inhibitorStroke: "#dc2626",
  arcStroke: "#334155",
  weightLabel: "#2563eb",
  tokenPalette: DEFAULT_PALETTE,
};

// Faithful Murata-1989 textbook: pure black/white. Enabled is shown by a bold
// ring (not green); inhibitor by its hollow-circle head (not red).
const MONOCHROME_PETRI: PetriTokens = {
  placeFill: "#ffffff",
  placeStroke: "#000000",
  transitionBarFill: "#000000",
  transitionBoxFill: "#ffffff",
  transitionStroke: "#000000",
  tokenFill: "#000000",
  enabledStroke: "#000000",
  enabledFill: "none",
  deadStroke: "#888888",
  inhibitorStroke: "#000000",
  arcStroke: "#000000",
  weightLabel: "#000000",
  tokenPalette: MONOCHROME_PALETTE,
};

const DARK_PETRI: PetriTokens = {
  placeFill: "#313244",
  placeStroke: "#cdd6f4",
  transitionBarFill: "#cdd6f4",
  transitionBoxFill: "#313244",
  transitionStroke: "#cdd6f4",
  tokenFill: "#cdd6f4",
  enabledStroke: "#a6e3a1",
  enabledFill: "rgba(166,227,161,0.15)",
  deadStroke: "#6c7086",
  inhibitorStroke: "#f38ba8",
  arcStroke: "#cdd6f4",
  weightLabel: "#89b4fa",
  tokenPalette: DARK_PALETTE,
};

export const PETRI_TOKENS: Record<ThemeName, PetriTokens> = {
  default: DEFAULT_PETRI,
  monochrome: MONOCHROME_PETRI,
  dark: DARK_PETRI,
};

export function resolvePetriTheme(name: string): ResolvedTheme<PetriTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...PETRI_TOKENS[themeName] };
}

// ─── Reliability Tokens Per Theme ──────────────────────────
// 37-FAULT-TREE-STANDARD §6. Cluster-shared by fault tree + (sibling) bowtie.
// Coloured-house family like pert/petri: neutral body; green reserved for gate
// bodies ("logic proceeds"); red reserved for the computed minimal cut sets /
// single points of failure; blue only for probability numerals. In monochrome,
// semantics fall back to shape/weight (bold-dashed cut-set box, dome/shield).

export interface ReliabilityTokens {
  eventFill: string;
  eventStroke: string;
  topEventStroke: string;
  basicFill: string;
  basicStroke: string;
  undevelopedFill: string;
  houseFill: string;
  conditionFill: string;
  gateFill: string;
  gateStroke: string;
  edgeStroke: string;
  probText: string;
  /** Computed minimal cut sets — red = "this is the risk". Reserved accent. */
  cutsetStroke: string;
  cutsetFill: string;
  /** Single point of failure (order-1 cut set) — strongest red. */
  spofStroke: string;
}

const DEFAULT_RELIABILITY: ReliabilityTokens = {
  eventFill: "#eef2f7",      // soft slate-blue — gives event boxes presence (cool tones pair with the red cut-set accent)
  eventStroke: "#334155",
  topEventStroke: "#1e293b",
  basicFill: "#ffffff",      // white circles read clean inside a red cut-set frame
  basicStroke: "#334155",
  undevelopedFill: "#e2e8f0",
  houseFill: "#fef9c3",
  conditionFill: "#f1f5f9",
  gateFill: "#dcfce7",       // green gates ("logic proceeds")
  gateStroke: "#059669",
  edgeStroke: "#475569",
  probText: "#2563eb",
  cutsetStroke: "#dc2626",
  cutsetFill: "rgba(220,38,38,0.05)",
  spofStroke: "#b91c1c",
};

// Faithful NUREG-0492 textbook: pure black/white. Cut sets shown by a bold
// dashed box (not red); gate type by dome/shield shape (not fill).
const MONOCHROME_RELIABILITY: ReliabilityTokens = {
  eventFill: "#ffffff",
  eventStroke: "#000000",
  topEventStroke: "#000000",
  basicFill: "#ffffff",
  basicStroke: "#000000",
  undevelopedFill: "#ffffff",
  houseFill: "#ffffff",
  conditionFill: "#ffffff",
  gateFill: "#ffffff",
  gateStroke: "#000000",
  edgeStroke: "#000000",
  probText: "#000000",
  cutsetStroke: "#000000",
  cutsetFill: "none",
  spofStroke: "#000000",
};

const DARK_RELIABILITY: ReliabilityTokens = {
  eventFill: "#313244",
  eventStroke: "#cdd6f4",
  topEventStroke: "#cdd6f4",
  basicFill: "#313244",
  basicStroke: "#cdd6f4",
  undevelopedFill: "#45475a",
  houseFill: "#45413a",
  conditionFill: "#45475a",
  gateFill: "rgba(166,227,161,0.18)",
  gateStroke: "#a6e3a1",
  edgeStroke: "#cdd6f4",
  probText: "#89b4fa",
  cutsetStroke: "#f38ba8",
  cutsetFill: "rgba(243,139,168,0.12)",
  spofStroke: "#eba0ac",
};

export const RELIABILITY_TOKENS: Record<ThemeName, ReliabilityTokens> = {
  default: DEFAULT_RELIABILITY,
  monochrome: MONOCHROME_RELIABILITY,
  dark: DARK_RELIABILITY,
};

export function resolveReliabilityTheme(name: string): ResolvedTheme<ReliabilityTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...RELIABILITY_TOKENS[themeName] };
}

// ─── Bowtie Tokens Per Theme ───────────────────────────────
// 38-BOWTIE-STANDARD §6. Coloured-house family like prisma/pert/petri, but the
// field has a strongly-recognised palette (BowTieXP / bowtiemaster.com): orange
// threats (left), red consequences (right), green top-event disc (centre knot),
// grey barriers on the line, amber escalation factors dropping below. In
// monochrome the element distinction rides on shape/border + position (escalation
// dashed, knot doubled-ring) since regulator submissions are often black-and-white.

export interface BowtieTokens {
  hazardFill: string;
  hazardStroke: string;
  topEventFill: string;
  topEventStroke: string;
  threatFill: string;
  threatStroke: string;
  barrierFill: string;
  barrierStroke: string;
  consequenceFill: string;
  consequenceStroke: string;
  escalationFill: string;
  escalationStroke: string;
  efBarrierFill: string;
  lineStroke: string;
  escalationLineStroke: string;
  labelText: string;
}

const DEFAULT_BOWTIE: BowtieTokens = {
  hazardFill: "#fef9c3",       // pale yellow hazard header (conventional)
  hazardStroke: "#ca8a04",
  topEventFill: "#dcfce7",     // green disc knot (bowtiemaster)
  topEventStroke: "#16a34a",
  threatFill: "#fed7aa",       // orange threats (de-facto)
  threatStroke: "#ea580c",
  barrierFill: "#e5e7eb",      // grey barriers (de-facto)
  barrierStroke: "#6b7280",
  consequenceFill: "#fecaca",  // red consequences (de-facto)
  consequenceStroke: "#dc2626",
  escalationFill: "#fde68a",   // amber escalation factors (de-facto)
  escalationStroke: "#d97706",
  efBarrierFill: "#e5e7eb",
  lineStroke: "#334155",
  escalationLineStroke: "#9ca3af",
  labelText: "#0f172a",
};

// Regulator-print: colour can't carry meaning, so element distinction rides on
// shape/border + position (escalation dashed border, knot doubled ring).
const MONOCHROME_BOWTIE: BowtieTokens = {
  hazardFill: "#ffffff",
  hazardStroke: "#000000",
  topEventFill: "#ffffff",
  topEventStroke: "#000000",
  threatFill: "#ffffff",
  threatStroke: "#000000",
  barrierFill: "#f2f2f2",
  barrierStroke: "#000000",
  consequenceFill: "#ffffff",
  consequenceStroke: "#000000",
  escalationFill: "#ffffff",
  escalationStroke: "#000000",
  efBarrierFill: "#f2f2f2",
  lineStroke: "#000000",
  escalationLineStroke: "#000000",
  labelText: "#000000",
};

// Catppuccin Mocha, mirroring DARK_THEME.
const DARK_BOWTIE: BowtieTokens = {
  hazardFill: "#45413a",
  hazardStroke: "#f9e2af",
  topEventFill: "#a6e3a1",
  topEventStroke: "#40a02b",
  threatFill: "#fab387",
  threatStroke: "#e8a06a",
  barrierFill: "#9399b2",      // light-grey surface so the single dark label reads
  barrierStroke: "#6c7086",
  consequenceFill: "#f38ba8",
  consequenceStroke: "#e06c85",
  escalationFill: "#f9e2af",
  escalationStroke: "#d8bd84",
  efBarrierFill: "#9399b2",
  lineStroke: "#cdd6f4",
  escalationLineStroke: "#7f849c",
  labelText: "#1e1e2e",
};

export const BOWTIE_TOKENS: Record<ThemeName, BowtieTokens> = {
  default: DEFAULT_BOWTIE,
  monochrome: MONOCHROME_BOWTIE,
  dark: DARK_BOWTIE,
};

export function resolveBowtieTheme(name: string): ResolvedTheme<BowtieTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...BOWTIE_TOKENS[themeName] };
}

// ─── Comparison (comparison) tokens ────────────────────────────

/**
 * Tokens for the comparison family (T-chart / pros-cons / comparison matrix /
 * decision matrix / double-bubble). House blue for headers; green/red/amber
 * carry the pros-cons and yes/no/partial valence; green also flags the computed
 * decision-matrix winner. Monochrome drops colour — valence rides on the glyph
 * (✓/✗/~) and the winner on a heavy border — so it prints on a B&W copier.
 */
export interface ComparisonTokens {
  headerFill: string;
  headerStroke: string;
  headerText: string;
  rowHeaderFill: string;
  cellFill: string;
  cellAltFill: string;
  cellStroke: string;
  cellText: string;
  gridStroke: string;
  /** T-chart column-header palette (cycled per column) + its text colour. */
  columnColors: readonly string[];
  columnText: string;
  /** T-chart column card surface + faint row divider. */
  cardFill: string;
  cardStroke: string;
  rowDivider: string;
  posFill: string;
  posText: string;
  negFill: string;
  negText: string;
  warnFill: string;
  warnText: string;
  winnerFill: string;
  winnerStroke: string;
  winnerText: string;
  totalFill: string;
  baselineFill: string;
  tagText: string;
  captionText: string;
  /** pros-cons strong header pills + circular badges. */
  pillPosFill: string;
  pillNegFill: string;
  pillText: string;
  badgeText: string;
  /** double-bubble palette — centres differ by side; uniques tie to their centre. */
  dbLeftCenterFill: string;
  dbLeftCenterText: string;
  dbRightCenterFill: string;
  dbRightCenterText: string;
  dbSharedFill: string;
  dbSharedText: string;
  dbLeftFill: string;
  dbLeftText: string;
  dbRightFill: string;
  dbRightText: string;
  dbStroke: string;
  connectorStroke: string;
}

const DEFAULT_COMPARISON: ComparisonTokens = {
  headerFill: "#1e3a8a",
  headerStroke: "#1e3a8a",
  headerText: "#ffffff",
  rowHeaderFill: "#eef2ff",
  cellFill: "#ffffff",
  cellAltFill: "#f8fafc",
  cellStroke: "#cbd5e1",
  cellText: "#0f172a",
  gridStroke: "#cbd5e1",
  columnColors: ["#1d4ed8", "#0e7490", "#7c3aed", "#c2410c", "#15803d", "#be185d"],
  columnText: "#ffffff",
  cardFill: "#ffffff",
  cardStroke: "#e2e8f0",
  rowDivider: "#eef2f6",
  posFill: "#dcfce7",
  posText: "#15803d",
  negFill: "#fee2e2",
  negText: "#b91c1c",
  warnFill: "#fef9c3",
  warnText: "#a16207",
  winnerFill: "#bbf7d0",
  winnerStroke: "#16a34a",
  winnerText: "#14532d",
  totalFill: "#e2e8f0",
  baselineFill: "#dbeafe",
  tagText: "#64748b",
  captionText: "#334155",
  pillPosFill: "#16a34a",
  pillNegFill: "#e11d48",
  pillText: "#ffffff",
  badgeText: "#ffffff",
  dbLeftCenterFill: "#1d4ed8",
  dbLeftCenterText: "#ffffff",
  dbRightCenterFill: "#0e7490",
  dbRightCenterText: "#ffffff",
  dbSharedFill: "#65a30d",
  dbSharedText: "#ffffff",
  dbLeftFill: "#dbeafe",
  dbLeftText: "#1e3a8a",
  dbRightFill: "#cffafe",
  dbRightText: "#155e75",
  dbStroke: "#ffffff",
  connectorStroke: "#94a3b8",
};

const MONOCHROME_COMPARISON: ComparisonTokens = {
  headerFill: "#000000",
  headerStroke: "#000000",
  headerText: "#ffffff",
  rowHeaderFill: "#f0f0f0",
  cellFill: "#ffffff",
  cellAltFill: "#f7f7f7",
  cellStroke: "#000000",
  cellText: "#000000",
  gridStroke: "#000000",
  columnColors: ["#000000"],
  columnText: "#ffffff",
  cardFill: "#ffffff",
  cardStroke: "#000000",
  rowDivider: "#cccccc",
  posFill: "#ffffff",
  posText: "#000000",
  negFill: "#ffffff",
  negText: "#000000",
  warnFill: "#ffffff",
  warnText: "#000000",
  winnerFill: "#e8e8e8",
  winnerStroke: "#000000",
  winnerText: "#000000",
  totalFill: "#e8e8e8",
  baselineFill: "#f0f0f0",
  tagText: "#555555",
  captionText: "#000000",
  pillPosFill: "#000000",
  pillNegFill: "#000000",
  pillText: "#ffffff",
  badgeText: "#ffffff",
  dbLeftCenterFill: "#000000",
  dbLeftCenterText: "#ffffff",
  dbRightCenterFill: "#000000",
  dbRightCenterText: "#ffffff",
  dbSharedFill: "#d9d9d9",
  dbSharedText: "#000000",
  dbLeftFill: "#ffffff",
  dbLeftText: "#000000",
  dbRightFill: "#ffffff",
  dbRightText: "#000000",
  dbStroke: "#000000",
  connectorStroke: "#000000",
};

const DARK_COMPARISON: ComparisonTokens = {
  headerFill: "#89b4fa",
  headerStroke: "#89b4fa",
  headerText: "#1e1e2e",
  rowHeaderFill: "#313244",
  cellFill: "#1e1e2e",
  cellAltFill: "#252537",
  cellStroke: "#45475a",
  cellText: "#cdd6f4",
  gridStroke: "#45475a",
  columnColors: ["#89b4fa", "#94e2d5", "#cba6f7", "#fab387", "#a6e3a1", "#f5c2e7"],
  columnText: "#1e1e2e",
  cardFill: "#181825",
  cardStroke: "#313244",
  rowDivider: "#313244",
  posFill: "#2d4a36",
  posText: "#a6e3a1",
  negFill: "#4a2d33",
  negText: "#f38ba8",
  warnFill: "#4a452d",
  warnText: "#f9e2af",
  winnerFill: "#3a5a44",
  winnerStroke: "#a6e3a1",
  winnerText: "#a6e3a1",
  totalFill: "#313244",
  baselineFill: "#2a3a55",
  tagText: "#7f849c",
  captionText: "#bac2de",
  pillPosFill: "#40a02b",
  pillNegFill: "#e06c85",
  pillText: "#ffffff",
  badgeText: "#1e1e2e",
  dbLeftCenterFill: "#89b4fa",
  dbLeftCenterText: "#1e1e2e",
  dbRightCenterFill: "#94e2d5",
  dbRightCenterText: "#1e1e2e",
  dbSharedFill: "#a6e3a1",
  dbSharedText: "#1e1e2e",
  dbLeftFill: "#313244",
  dbLeftText: "#cdd6f4",
  dbRightFill: "#3a3a4f",
  dbRightText: "#cdd6f4",
  dbStroke: "#45475a",
  connectorStroke: "#6c7086",
};

export const COMPARISON_TOKENS: Record<ThemeName, ComparisonTokens> = {
  default: DEFAULT_COMPARISON,
  monochrome: MONOCHROME_COMPARISON,
  dark: DARK_COMPARISON,
};

export function resolveComparisonTheme(name: string): ResolvedTheme<ComparisonTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...COMPARISON_TOKENS[themeName] };
}

// ─── Network Tokens Per Theme ──────────────────────────────
// 35-NETWORK-STANDARD §6. Coloured-house family (not forced-mono industrial):
// device bodies in "network blue", link type by colour in default / line-style
// + tag in monochrome, logical overlays dashed-tinted.

export interface NetworkTokens {
  deviceFill: string;
  deviceStroke: string;
  deviceAccent: string;
  cloudFill: string;
  cloudStroke: string;
  label: string;
  subLabel: string;
  linkCopper: string;
  linkFiber: string;
  linkWireless: string;
  linkSerial: string;
  linkPoe: string;
  linkVpn: string;
  linkLag: string;
  linkLabel: string;
  siteStroke: string;
  subnetStroke: string;
  subnetFill: string;
  zoneStroke: string;
  vlanPalette: readonly string[];
  warn: string;
}

const DEFAULT_NETWORK: NetworkTokens = {
  deviceFill: "#1d6fb8",
  deviceStroke: "#0f3a5f",
  deviceAccent: "#bfe0f7",
  cloudFill: "#ffffff",
  cloudStroke: "#334155",
  label: "#0f172a",
  subLabel: "#64748b",
  linkCopper: "#334155",
  linkFiber: "#ea7a17",
  linkWireless: "#2563eb",
  linkSerial: "#7c3aed",
  linkPoe: "#059669",
  linkVpn: "#0891b2",
  linkLag: "#334155",
  linkLabel: "#475569",
  siteStroke: "#334155",
  subnetStroke: "#2563eb",
  subnetFill: "#eff6ff",
  zoneStroke: "#dc2626",
  vlanPalette: DEFAULT_PALETTE,
  warn: "#d97706",
};

// Clean line-art for print/audit: meaning rides on line-style + text tag, not colour.
const MONOCHROME_NETWORK: NetworkTokens = {
  deviceFill: "#ffffff",
  deviceStroke: "#000000",
  deviceAccent: "#000000",
  cloudFill: "#ffffff",
  cloudStroke: "#000000",
  label: "#000000",
  subLabel: "#444444",
  linkCopper: "#000000",
  linkFiber: "#000000",
  linkWireless: "#000000",
  linkSerial: "#000000",
  linkPoe: "#000000",
  linkVpn: "#000000",
  linkLag: "#000000",
  linkLabel: "#222222",
  siteStroke: "#000000",
  subnetStroke: "#000000",
  subnetFill: "none",
  zoneStroke: "#000000",
  vlanPalette: MONOCHROME_PALETTE,
  warn: "#000000",
};

const DARK_NETWORK: NetworkTokens = {
  deviceFill: "#89b4fa",
  deviceStroke: "#1e1e2e",
  deviceAccent: "#1e1e2e",
  cloudFill: "#313244",
  cloudStroke: "#cdd6f4",
  label: "#cdd6f4",
  subLabel: "#a6adc8",
  linkCopper: "#cdd6f4",
  linkFiber: "#fab387",
  linkWireless: "#89b4fa",
  linkSerial: "#cba6f7",
  linkPoe: "#a6e3a1",
  linkVpn: "#94e2d5",
  linkLag: "#cdd6f4",
  linkLabel: "#a6adc8",
  siteStroke: "#cdd6f4",
  subnetStroke: "#89b4fa",
  subnetFill: "rgba(137,180,250,0.12)",
  zoneStroke: "#f38ba8",
  vlanPalette: DARK_PALETTE,
  warn: "#fab387",
};

export const NETWORK_TOKENS: Record<ThemeName, NetworkTokens> = {
  default: DEFAULT_NETWORK,
  monochrome: MONOCHROME_NETWORK,
  dark: DARK_NETWORK,
};

export function resolveNetworkTheme(name: string): ResolvedTheme<NetworkTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...NETWORK_TOKENS[themeName] };
}

// ─── UML Class Diagram Tokens ──────────────────────────────
// 36-UMLCLASS-STANDARD §6. Coloured-house family (with `c4`, `flowchart`,
// `sequence`): blue/grey neutrals in default, true black/white in monochrome,
// Catppuccin in dark. Relationship semantics ride entirely on adornment SHAPE
// (diamond/triangle/arrow, filled/hollow, solid/dashed) so the diagram is
// identical in monochrome — see spec §6.5 house-style rule.

export interface UmlClassTokens {
  /** Classifier box body + borders. */
  classifierFill: string;
  classifierStroke: string;
  /** Name-compartment header band (slightly tinted to set off the name). */
  headerFill: string;
  /** Bold class name. */
  nameText: string;
  /** «interface» / «enumeration» keyword (muted). */
  stereotypeText: string;
  /** Attribute / operation rows. */
  memberText: string;
  /** Visibility glyphs (+ - # ~) — slightly muted so names read first. */
  visibilityText: string;
  /** Relationship lines + adornments. */
  relationStroke: string;
  /** Filled composition diamond + filled arrowheads. */
  adornmentFill: string;
  /** Hollow aggregation diamond + hollow triangle interior (= box bg). */
  adornmentHollowFill: string;
  /** Edge labels: association name, multiplicity, role. */
  edgeLabel: string;
  /** Interface / abstract accent — used sparingly for the «» keyword italic tint. */
  abstractAccent: string;
  /** Package/namespace frame fill (use a translucent tint so nested frames stack). */
  packageFill: string;
  /** Package/namespace frame border. */
  packageStroke: string;
  /** Package/namespace label text. */
  packageLabel: string;
}

const DEFAULT_UMLCLASS: UmlClassTokens = {
  classifierFill: "#ffffff",
  classifierStroke: "#334155",
  headerFill: "#eef2f7",
  nameText: "#0f172a",
  stereotypeText: "#64748b",
  memberText: "#0f172a",
  visibilityText: "#64748b",
  relationStroke: "#334155",
  adornmentFill: "#334155",
  adornmentHollowFill: "#ffffff",
  edgeLabel: "#475569",
  abstractAccent: "#2563eb",
  packageFill: "rgba(100,116,139,0.06)",
  packageStroke: "#94a3b8",
  packageLabel: "#475569",
};

// Faithful UML textbook (Fowler/Booch print stance) — pure black/white. Every
// distinction that rides on colour in default falls back to shape/weight here.
const MONOCHROME_UMLCLASS: UmlClassTokens = {
  classifierFill: "#ffffff",
  classifierStroke: "#000000",
  headerFill: "#ffffff",
  nameText: "#000000",
  stereotypeText: "#000000",
  memberText: "#000000",
  visibilityText: "#000000",
  relationStroke: "#000000",
  adornmentFill: "#000000",
  adornmentHollowFill: "#ffffff",
  edgeLabel: "#000000",
  abstractAccent: "#000000",
  packageFill: "none",
  packageStroke: "#000000",
  packageLabel: "#000000",
};

const DARK_UMLCLASS: UmlClassTokens = {
  classifierFill: "#313244",
  classifierStroke: "#cdd6f4",
  headerFill: "#45475a",
  nameText: "#cdd6f4",
  stereotypeText: "#a6adc8",
  memberText: "#cdd6f4",
  visibilityText: "#a6adc8",
  relationStroke: "#cdd6f4",
  adornmentFill: "#cdd6f4",
  adornmentHollowFill: "#313244",
  edgeLabel: "#bac2de",
  abstractAccent: "#89b4fa",
  packageFill: "rgba(205,214,244,0.05)",
  packageStroke: "#6c7086",
  packageLabel: "#a6adc8",
};

export const UMLCLASS_TOKENS: Record<ThemeName, UmlClassTokens> = {
  default: DEFAULT_UMLCLASS,
  monochrome: MONOCHROME_UMLCLASS,
  dark: DARK_UMLCLASS,
};

export function resolveUmlClassTheme(name: string): ResolvedTheme<UmlClassTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...UMLCLASS_TOKENS[themeName] };
}

// ─── BPMN Tokens Per Theme ─────────────────────────────────
// Coloured-house family (with flowchart/prisma): BPMN tools (Camunda, Bizagi,
// Signavio) established a de-facto colour language — green start events, red
// end events, yellow gateway diamonds, blue-tinted tasks — which `default`
// adopts in the house tint-fill + 600-stroke pairing. `monochrome` is the pure
// OMG-spec print look (the standard itself prescribes no colour); `dark` is
// Catppuccin like the rest of the family.

export interface BpmnTokens {
  /** Pool body + lane/pool borders + glyph strokes. */
  bpmnStroke: string;
  /** Element label text (task names, pool labels, edge labels). */
  bpmnText: string;
  poolFill: string;
  laneFill: string;
  /** Rotated pool/lane label band. */
  labelBandFill: string;
  taskFill: string;
  taskStroke: string;
  gatewayFill: string;
  gatewayStroke: string;
  /** X / + / O glyph inside the gateway diamond. */
  gatewayGlyph: string;
  startFill: string;
  startStroke: string;
  endFill: string;
  endStroke: string;
  intermediateFill: string;
  intermediateStroke: string;
  /** Sequence flows + arrowheads. */
  flowStroke: string;
  /** Message flows (dashed, lighter). */
  msgFlowStroke: string;
}

const DEFAULT_BPMN: BpmnTokens = {
  bpmnStroke: "#334155",
  bpmnText: "#0f172a",
  poolFill: "#ffffff",
  laneFill: "#fbfcfe",
  labelBandFill: "#eef2f7",
  taskFill: "#eff6ff",      // blue-50 — "work happens here"
  taskStroke: "#3b82f6",    // blue-500
  gatewayFill: "#fef3c7",   // amber-100 — de-facto gateway yellow
  gatewayStroke: "#d97706", // amber-600
  gatewayGlyph: "#92400e",  // amber-800
  startFill: "#dcfce7",     // green-100 — de-facto start green
  startStroke: "#059669",
  endFill: "#fee2e2",       // red-100 — de-facto end red
  endStroke: "#dc2626",
  intermediateFill: "#ffffff",
  intermediateStroke: "#334155",
  flowStroke: "#334155",
  msgFlowStroke: "#94a3b8",
};

// OMG BPMN 2.0.2 print stance: the spec prescribes shapes, not colours.
const MONOCHROME_BPMN: BpmnTokens = {
  bpmnStroke: "#000000",
  bpmnText: "#000000",
  poolFill: "#ffffff",
  laneFill: "#ffffff",
  labelBandFill: "#f0f0f0",
  taskFill: "#ffffff",
  taskStroke: "#000000",
  gatewayFill: "#ffffff",
  gatewayStroke: "#000000",
  gatewayGlyph: "#000000",
  startFill: "#ffffff",
  startStroke: "#000000",
  endFill: "#ffffff",
  endStroke: "#000000",
  intermediateFill: "#ffffff",
  intermediateStroke: "#000000",
  flowStroke: "#000000",
  msgFlowStroke: "#555555",
};

const DARK_BPMN: BpmnTokens = {
  bpmnStroke: "#cdd6f4",
  bpmnText: "#cdd6f4",
  poolFill: "#1e1e2e",
  laneFill: "#272736",
  labelBandFill: "#313244",
  taskFill: "#1e3a5f",
  taskStroke: "#89b4fa",
  gatewayFill: "#45413a",
  gatewayStroke: "#f9e2af",
  gatewayGlyph: "#f9e2af",
  startFill: "#1e3a2a",
  startStroke: "#a6e3a1",
  endFill: "#3a231f",
  endStroke: "#f38ba8",
  intermediateFill: "#313244",
  intermediateStroke: "#cdd6f4",
  flowStroke: "#cdd6f4",
  msgFlowStroke: "#7f849c",
};

export const BPMN_TOKENS: Record<ThemeName, BpmnTokens> = {
  default: DEFAULT_BPMN,
  monochrome: MONOCHROME_BPMN,
  dark: DARK_BPMN,
};

export function resolveBpmnTheme(name: string): ResolvedTheme<BpmnTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...BPMN_TOKENS[themeName] };
}

// ─── State Diagram Tokens Per Theme ────────────────────────
// UML 2.5 / Harel statechart. Neutral-house family like umlclass: slate body
// in default (it previously carried two hardcoded blacks, #1a1a1a and #2a2a2a),
// the conventional sticky-note yellow for UML notes, pure black/white in
// monochrome, Catppuccin in dark.

export interface StateTokens {
  stateFill: string;
  stateStroke: string;
  stateText: string;
  /** entry/do/exit activity rows (monospace, muted). */
  activityText: string;
  compositeFill: string;
  compositeTitlebar: string;
  /** Dashed divider between orthogonal regions. */
  regionDiv: string;
  /** Pseudo-state ink: initial/final/junction dots, fork/join bars, H glyph. */
  psInk: string;
  transitionStroke: string;
  transitionLabel: string;
  /** Backing rect behind transition labels. */
  labelBg: string;
  noteFill: string;
  noteStroke: string;
  noteText: string;
}

const DEFAULT_STATE: StateTokens = {
  stateFill: "#ffffff",
  stateStroke: "#334155",
  stateText: "#0f172a",
  activityText: "#475569",
  compositeFill: "#f8fafc",
  compositeTitlebar: "#eef2f7",
  regionDiv: "#94a3b8",
  psInk: "#0f172a",
  transitionStroke: "#334155",
  transitionLabel: "#0f172a",
  labelBg: "#ffffff",
  noteFill: "#fef9c3",
  noteStroke: "#ca8a04",
  noteText: "#374151",
};

const MONOCHROME_STATE: StateTokens = {
  stateFill: "#ffffff",
  stateStroke: "#000000",
  stateText: "#000000",
  activityText: "#333333",
  compositeFill: "#ffffff",
  compositeTitlebar: "#f0f0f0",
  regionDiv: "#888888",
  psInk: "#000000",
  transitionStroke: "#000000",
  transitionLabel: "#000000",
  labelBg: "#ffffff",
  noteFill: "#ffffff",
  noteStroke: "#000000",
  noteText: "#000000",
};

const DARK_STATE: StateTokens = {
  stateFill: "#313244",
  stateStroke: "#cdd6f4",
  stateText: "#cdd6f4",
  activityText: "#a6adc8",
  compositeFill: "#272736",
  compositeTitlebar: "#313244",
  regionDiv: "#6c7086",
  psInk: "#cdd6f4",
  transitionStroke: "#cdd6f4",
  transitionLabel: "#cdd6f4",
  labelBg: "#1e1e2e",
  noteFill: "#45413a",
  noteStroke: "#f9e2af",
  noteText: "#cdd6f4",
};

export const STATE_TOKENS: Record<ThemeName, StateTokens> = {
  default: DEFAULT_STATE,
  monochrome: MONOCHROME_STATE,
  dark: DARK_STATE,
};

export function resolveStateTheme(name: string): ResolvedTheme<StateTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...STATE_TOKENS[themeName] };
}

// ─── Matrix Tokens Per Theme ───────────────────────────────
// Quadrant / heatmap / correlation / SIPOC / QFD / Punnett share one renderer
// stylesheet; these tokens parameterise it. Data palettes (category colors,
// heat ramp, quadrant tints) stay renderer-local: they encode data semantics
// (green→red severity, per-category hue) that hold across themes.

export interface MatrixTokens {
  /** Strongest text: titles, values, best-margin highlights. */
  inkStrong: string;
  /** Body text: cell labels, items. */
  ink: string;
  /** Secondary text: axis labels, weight heads, direction glyphs. */
  inkMuted: string;
  /** Faintest text: subtitles, axis ends, hints. */
  inkFaint: string;
  gridFaint: string;
  grid: string;
  gridMid: string;
  gridStrong: string;
  /** Plot border + axis arrows. */
  border: string;
  surface: string;
  surfaceAlt: string;
  /** Correlation alternating row tint. */
  surfaceTint: string;
  /** Punnett corner cell. */
  cornerFill: string;
  /** Punnett gamete header band. */
  headerFill: string;
  accent: string;
  /** QFD medium-relationship dot fill. */
  accentSoft: string;
  /** QFD importance band / SIPOC process column fill. */
  accentTint: string;
  /** Deep accent text (importance values, punnett parents, sipoc steps). */
  accentDeep: string;
  /** QFD roof declared-cell fill. */
  roofFilled: string;
  positive: string;
  positiveDeep: string;
  negative: string;
  negativeDeep: string;
  /** Off-chart marker. */
  warnDeep: string;
  /** Text on saturated SIPOC header boxes. */
  onHeader: string;
}

const DEFAULT_MATRIX: MatrixTokens = {
  inkStrong: "#111827",
  ink: "#1f2937",
  inkMuted: "#374151",
  inkFaint: "#6b7280",
  gridFaint: "#e5e7eb",
  grid: "#d1d5db",
  gridMid: "#cbd5e1",
  gridStrong: "#94a3b8",
  border: "#374151",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  surfaceTint: "#f0fdf4",
  cornerFill: "#f1f5f9",
  headerFill: "#e2e8f0",
  accent: "#2563eb",
  accentSoft: "#93c5fd",
  accentTint: "#eff6ff",
  accentDeep: "#1e3a8a",
  roofFilled: "#eef2ff",
  positive: "#16a34a",
  positiveDeep: "#15803d",
  negative: "#dc2626",
  negativeDeep: "#b91c1c",
  warnDeep: "#ea580c",
  onHeader: "#ffffff",
};

// Print/clinical: QFD relationship strength falls back to fill-vs-hollow,
// correlation sign to its glyph — both already shape-encoded.
const MONOCHROME_MATRIX: MatrixTokens = {
  inkStrong: "#000000",
  ink: "#000000",
  inkMuted: "#333333",
  inkFaint: "#555555",
  gridFaint: "#dddddd",
  grid: "#bbbbbb",
  gridMid: "#aaaaaa",
  gridStrong: "#777777",
  border: "#000000",
  surface: "#ffffff",
  surfaceAlt: "#f7f7f7",
  surfaceTint: "#f0f0f0",
  cornerFill: "#f0f0f0",
  headerFill: "#e5e5e5",
  accent: "#000000",
  accentSoft: "#bbbbbb",
  accentTint: "#f0f0f0",
  accentDeep: "#000000",
  roofFilled: "#e5e5e5",
  positive: "#000000",
  positiveDeep: "#000000",
  negative: "#000000",
  negativeDeep: "#000000",
  warnDeep: "#000000",
  onHeader: "#ffffff",
};

const DARK_MATRIX: MatrixTokens = {
  inkStrong: "#cdd6f4",
  ink: "#cdd6f4",
  inkMuted: "#bac2de",
  inkFaint: "#a6adc8",
  gridFaint: "#313244",
  grid: "#45475a",
  gridMid: "#45475a",
  gridStrong: "#6c7086",
  border: "#cdd6f4",
  surface: "#1e1e2e",
  surfaceAlt: "#272736",
  surfaceTint: "rgba(166,227,161,0.08)",
  cornerFill: "#313244",
  headerFill: "#45475a",
  accent: "#89b4fa",
  accentSoft: "#45557a",
  accentTint: "#1e3a5f",
  accentDeep: "#89b4fa",
  roofFilled: "#2a2a45",
  positive: "#a6e3a1",
  positiveDeep: "#a6e3a1",
  negative: "#f38ba8",
  negativeDeep: "#f38ba8",
  warnDeep: "#fab387",
  onHeader: "#1e1e2e",
};

export const MATRIX_TOKENS: Record<ThemeName, MatrixTokens> = {
  default: DEFAULT_MATRIX,
  monochrome: MONOCHROME_MATRIX,
  dark: DARK_MATRIX,
};

export function resolveMatrixTheme(name: string): ResolvedTheme<MatrixTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...MATRIX_TOKENS[themeName] };
}

// ─── Block Diagram Tokens Per Theme ────────────────────────
// Control-engineering block diagrams. The default role fills move from the
// renderer's old Material-Design tints onto the house Tailwind-100 tints so
// blockdiagram sits in the same colour family as flowchart/bpmn.

export interface BlockTokens {
  blockStroke: string;
  /** Transfer-function text, port labels (strong ink). */
  blockText: string;
  /** Small role-name caption under the TF. */
  blockName: string;
  sumFill: string;
  /** Signal lines, arrowheads, sum signs, signal labels, branch dots. */
  signalStroke: string;
  roleFills: Readonly<Record<string, string>>;
}

const DEFAULT_BLOCK: BlockTokens = {
  blockStroke: "#334155",
  blockText: "#0f172a",
  blockName: "#64748b",
  sumFill: "#ffffff",
  signalStroke: "#334155",
  roleFills: {
    plant: "#ffffff",
    controller: "#dbeafe",
    sensor: "#f3e8ff",
    actuator: "#dcfce7",
    filter: "#fef9c3",
    reference: "#ffffff",
    disturbance: "#ffedd5",
    generic: "#ffffff",
  },
};

const MONOCHROME_BLOCK: BlockTokens = {
  blockStroke: "#000000",
  blockText: "#000000",
  blockName: "#333333",
  sumFill: "#ffffff",
  signalStroke: "#000000",
  roleFills: {
    plant: "#ffffff",
    controller: "#ffffff",
    sensor: "#ffffff",
    actuator: "#ffffff",
    filter: "#ffffff",
    reference: "#ffffff",
    disturbance: "#ffffff",
    generic: "#ffffff",
  },
};

const DARK_BLOCK: BlockTokens = {
  blockStroke: "#cdd6f4",
  blockText: "#cdd6f4",
  blockName: "#a6adc8",
  sumFill: "#313244",
  signalStroke: "#cdd6f4",
  roleFills: {
    plant: "#313244",
    controller: "#1e3a5f",
    sensor: "#2e2a52",
    actuator: "#1e3a2a",
    filter: "#3a3326",
    reference: "#313244",
    disturbance: "#3a2d1a",
    generic: "#313244",
  },
};

export const BLOCK_TOKENS: Record<ThemeName, BlockTokens> = {
  default: DEFAULT_BLOCK,
  monochrome: MONOCHROME_BLOCK,
  dark: DARK_BLOCK,
};

export function resolveBlockTheme(name: string): ResolvedTheme<BlockTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...BLOCK_TOKENS[themeName] };
}

// ─── Theme Resolution ──────────────────────────────────────

export function resolveBaseTheme(name: string): BaseTheme {
  return BASE_THEMES[name as ThemeName] ?? BASE_THEMES["default"];
}

export function resolvePersonTheme(name: string): ResolvedTheme<PersonTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...PERSON_TOKENS[themeName] };
}

export function resolveBiologyTheme(name: string): ResolvedTheme<BiologyTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...BIOLOGY_TOKENS[themeName] };
}

/**
 * Fishbone uses BaseTheme directly — its bone colors come from `theme.palette`.
 * Kept as a named resolver so callers don't have to know that.
 */
export function resolveFishboneTheme(name: string): BaseTheme {
  return resolveBaseTheme(name);
}

export function resolveVennTheme(name: string): ResolvedTheme<VennTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...VENN_TOKENS[themeName] };
}

// ─── Floor Plan Tokens ─────────────────────────────────────
// 48-FLOORPLAN-STANDARD §4/§8. Architectural plan-view language: near-black
// wall poché on a light floor, neutral line-art furniture — colour stays
// reserved for validation accents. Monochrome = pure black-and-white print
// plan. Floor plans are a print-first paper notation, so there is no dark
// variant — `dark` resolves to the default light theme (product decision,
// 2026-06-09).

export interface FloorplanTokens {
  /** Wall poché (solid fill bands). */
  wallFill: string;
  /** Room floor fill (also used to punch opening gaps). */
  floorFill: string;
  /** Furniture body stroke / fill. */
  furnStroke: string;
  furnFill: string;
  /** Solid-dark items (TV, board frames) + their light inner panel. */
  furnSolid: string;
  boardInner: string;
  chairFill: string;
  doorLeaf: string;
  doorArc: string;
  windowStroke: string;
  rugStroke: string;
  hatchStroke: string;
  roomName: string;
  roomArea: string;
  furnLabel: string;
  dimStroke: string;
  dimText: string;
}

const DEFAULT_FLOORPLAN: FloorplanTokens = {
  wallFill: "#1e293b",
  floorFill: "#ffffff",
  furnStroke: "#475569",
  furnFill: "#ffffff",
  furnSolid: "#334155",
  boardInner: "#ffffff",
  chairFill: "#f1f5f9",
  doorLeaf: "#334155",
  doorArc: "#94a3b8",
  windowStroke: "#334155",
  rugStroke: "#94a3b8",
  hatchStroke: "#cbd5e1",
  roomName: "#0f172a",
  roomArea: "#64748b",
  furnLabel: "#475569",
  dimStroke: "#94a3b8",
  dimText: "#64748b",
};

const MONOCHROME_FLOORPLAN: FloorplanTokens = {
  wallFill: "#000000",
  floorFill: "#ffffff",
  furnStroke: "#000000",
  furnFill: "#ffffff",
  furnSolid: "#000000",
  boardInner: "#ffffff",
  chairFill: "#ffffff",
  doorLeaf: "#000000",
  doorArc: "#555555",
  windowStroke: "#000000",
  rugStroke: "#777777",
  hatchStroke: "#bbbbbb",
  roomName: "#000000",
  roomArea: "#444444",
  furnLabel: "#222222",
  dimStroke: "#666666",
  dimText: "#333333",
};

export const FLOORPLAN_TOKENS: Record<ThemeName, FloorplanTokens> = {
  default: DEFAULT_FLOORPLAN,
  monochrome: MONOCHROME_FLOORPLAN,
  // No dark floor plans — paper notation stays light even in dark mode.
  dark: DEFAULT_FLOORPLAN,
};

export function resolveFloorplanTheme(name: string): ResolvedTheme<FloorplanTokens> {
  // `dark` maps fully to the light default — including the base bg/text —
  // so a floor plan embedded in a dark page renders as a light "paper" sheet.
  const themeName: ThemeName = name === "monochrome" ? "monochrome" : "default";
  return { ...BASE_THEMES[themeName], ...FLOORPLAN_TOKENS[themeName] };
}

// ─── Sports Playbook Tokens (multi-sport) ──────────────────
// 49-SPORTS-PLAYBOOK-STANDARD §7. Coaching diagrams have no ratified colour
// standard, so Schematex adopts a polished broadcast look: a **green playing
// surface** (the house default across all three sports), white markings, white
// offense discs with a navy number, red defenders. Movement reads off line
// *style* (solid / dashed / wavy / double + arrow / T-bar) so the diagram
// survives `monochrome` (chalkboard black-on-white). Soccer has no `dark`
// variant (resolves to default) — handled in the renderer.

export interface PlaybookTokens {
  /** Playing surface (football field / soccer pitch). */
  surface: string;
  /** Alternating mow-stripe tint. */
  surfaceAlt: string;
  /** Out-of-bounds band framing the grass surface. */
  surround: string;
  /** Basketball hardwood court surface + lines + surround + on-court text. */
  courtSurface: string;
  courtLine: string;
  courtSurround: string;
  courtText: string;
  /** Soft markings: yard lines, court lines, pitch lines, hash ticks. */
  lineSoft: string;
  /** Bold markings: line of scrimmage, key lines. */
  lineBold: string;
  /** Offense disc fill + stroke + interior number/label. */
  offenseFill: string;
  offenseStroke: string;
  offenseLabel: string;
  /** Goalkeeper accent (soccer). */
  gkFill: string;
  /** Defender X glyph + label. */
  defenseStroke: string;
  defenseLabel: string;
  /** Offensive movement ink (run / route / cut / dribble / pass / screen). */
  moveStroke: string;
  /** Pre-snap motion (dashed, lighter). */
  motionStroke: string;
  /** Shot emphasis. */
  shotStroke: string;
  /** Coverage / responsibility zone bubble. */
  zoneStroke: string;
  zoneFill: string;
  /** Ball marker (football brown / soccer ball / basketball). */
  ballFill: string;
  /** End-zone tint + goal-line / goalpost accent (football). */
  endzoneFill: string;
  goalAccent: string;
  /** Rim (basketball). */
  rim: string;
  /** Yard numbers / on-surface text. */
  surfaceText: string;
  /** Down-and-distance + legend text (on the page background). */
  annotation: string;
}

const DEFAULT_PLAYBOOK: PlaybookTokens = {
  surface: "#2f8f4e",         // broadcast grass green
  surfaceAlt: "#2b8549",      // darker mow stripe
  surround: "#21683a",        // out-of-bounds grass band
  courtSurface: "#f1ddba",    // light maple hardwood
  courtLine: "#b07c40",       // warm court-line brown
  courtSurround: "#6b4f2c",   // arena apron (mid wood)
  courtText: "#7a5526",
  lineSoft: "rgba(255,255,255,0.62)",
  lineBold: "#ffffff",
  offenseFill: "#ffffff",
  offenseStroke: "#13294b",   // navy
  offenseLabel: "#13294b",
  gkFill: "#facc15",          // keeper yellow
  defenseStroke: "#ef4444",   // red
  defenseLabel: "#fee2e2",
  moveStroke: "#0b1f3a",      // dark navy ink — reads on green
  motionStroke: "#e2e8f0",
  shotStroke: "#f59e0b",      // amber shot
  zoneStroke: "#fde047",
  zoneFill: "rgba(253,224,71,0.12)",
  ballFill: "#7c3a14",
  endzoneFill: "rgba(255,255,255,0.10)",
  goalAccent: "#fcd34d",      // goalpost gold
  rim: "#f97316",
  surfaceText: "rgba(255,255,255,0.85)",
  annotation: "#334155",
};

const MONOCHROME_PLAYBOOK: PlaybookTokens = {
  surface: "#ffffff",
  surfaceAlt: "#f6f6f6",
  surround: "#e6e6e6",
  courtSurface: "#ffffff",
  courtLine: "#000000",
  courtSurround: "#e6e6e6",
  courtText: "#333333",
  lineSoft: "#cbcbcb",
  lineBold: "#000000",
  offenseFill: "#ffffff",
  offenseStroke: "#000000",
  offenseLabel: "#000000",
  gkFill: "#ffffff",
  defenseStroke: "#000000",
  defenseLabel: "#000000",
  moveStroke: "#000000",
  motionStroke: "#666666",
  shotStroke: "#000000",
  zoneStroke: "#000000",
  zoneFill: "none",
  ballFill: "#000000",
  endzoneFill: "rgba(0,0,0,0.06)",
  goalAccent: "#000000",
  rim: "#000000",
  surfaceText: "#333333",
  annotation: "#000000",
};

const DARK_PLAYBOOK: PlaybookTokens = {
  surface: "#16331f",         // night-game turf
  surfaceAlt: "#143019",
  surround: "#0e2415",
  courtSurface: "#6f5232",    // dim hardwood
  courtLine: "#caa46a",
  courtSurround: "#1c140b",
  courtText: "#caa46a",
  lineSoft: "rgba(226,240,230,0.45)",
  lineBold: "#e8f3ec",
  offenseFill: "#e8f3ec",
  offenseStroke: "#0b1f3a",
  offenseLabel: "#0b1f3a",
  gkFill: "#facc15",
  defenseStroke: "#f87171",
  defenseLabel: "#fee2e2",
  moveStroke: "#0b1f3a",
  motionStroke: "#cbd5e1",
  shotStroke: "#fbbf24",
  zoneStroke: "#fde047",
  zoneFill: "rgba(253,224,71,0.14)",
  ballFill: "#cba37a",
  endzoneFill: "rgba(255,255,255,0.08)",
  goalAccent: "#fcd34d",
  rim: "#fb923c",
  surfaceText: "rgba(232,243,236,0.85)",
  annotation: "#cdd6f4",
};

export const PLAYBOOK_TOKENS: Record<ThemeName, PlaybookTokens> = {
  default: DEFAULT_PLAYBOOK,
  monochrome: MONOCHROME_PLAYBOOK,
  dark: DARK_PLAYBOOK,
};

export function resolvePlaybookTheme(name: string): ResolvedTheme<PlaybookTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...PLAYBOOK_TOKENS[themeName] };
}

// ─── Genogram Theme Aliases ────────────────────────────────

const GENOGRAM_ALIASES: Record<string, ThemeName> = {
  clinical: "monochrome",
  colorful: "default",
  mono: "monochrome",
  bw: "monochrome",
};

export function resolveGenogramTheme(name: string): ResolvedTheme<PersonTokens> {
  const resolved = GENOGRAM_ALIASES[name] ?? name;
  return resolvePersonTheme(resolved);
}

// ─── Font Sizes ────────────────────────────────────────────

/**
 * Three-tier typography scale. Diagram-specific font sizes (e.g., 14px section
 * labels, 20px hero titles) live as local constants inside their renderer.
 */
export const FONT_SIZE = {
  title: 16,
  label: 12,
  small: 9,
} as const;

// ─── Diagram Title ─────────────────────────────────────────

/**
 * House style for the optional diagram title — one look across every family:
 * 16px / 700, centered on the canvas (`text-anchor: middle` at width/2),
 * baseline `TITLE.y` from the top of the reserved title band. Layouts that
 * reserve vertical space for the title should reserve `TITLE.bandH`.
 */
export const TITLE = {
  size: FONT_SIZE.title,
  weight: 700,
  /** Baseline y within the title band. */
  y: 24,
  /** Total height a layout should reserve above content for the title. */
  bandH: 40,
} as const;

// ─── Stroke Widths ─────────────────────────────────────────

/**
 * Three-tier stroke scale. Anything in between is a local constant in the
 * diagram that needs it.
 *  thin   — hairlines, ticks, secondary gridlines
 *  normal — default body strokes (shapes, edges)
 *  thick  — emphasis (proband index, star node, center shape)
 */
export const STROKE_WIDTH = {
  thin: 1,
  normal: 2,
  thick: 3,
} as const;

// ─── Spacing ───────────────────────────────────────────────

export const SPACING = {
  labelGap: 4,
  tipLabelGap: 6,
  titleOffset: 30,
} as const;

// ─── Font Family ───────────────────────────────────────────

export const DEFAULT_FONT_FAMILY = "system-ui, -apple-system, sans-serif";

// ─── CSS Custom Properties ─────────────────────────────────

export function cssCustomProperties(theme?: BaseTheme): string {
  const t = theme ?? BASE_THEMES["default"];
  return `
  --schematex-bg: ${t.bg};
  --schematex-text: ${t.text};
  --schematex-text-muted: ${t.textMuted};
  --schematex-stroke: ${t.stroke};
  --schematex-fill: ${t.fill};
  --schematex-fill-muted: ${t.fillMuted};
  --schematex-accent: ${t.accent};
  --schematex-positive: ${t.positive};
  --schematex-negative: ${t.negative};
  --schematex-neutral: ${t.neutral};
  --schematex-warn: ${t.warn};
  --schematex-font-title: ${FONT_SIZE.title}px;
  --schematex-font-label: ${FONT_SIZE.label}px;
  --schematex-font-small: ${FONT_SIZE.small}px;
  --schematex-stroke-thin: ${STROKE_WIDTH.thin};
  --schematex-stroke-normal: ${STROKE_WIDTH.normal};
  --schematex-stroke-thick: ${STROKE_WIDTH.thick};`;
}
