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
};

const MONOCHROME_MINDMAP: MindmapTokens = {
  centralFill: "#000000",
  branchPalette: ["#000000"],
};

const DARK_MINDMAP: MindmapTokens = {
  centralFill: "#cdd6f4",
  branchPalette: DARK_PALETTE,
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
