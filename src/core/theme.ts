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
