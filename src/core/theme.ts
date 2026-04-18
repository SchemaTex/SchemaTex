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

// ─── Theme Name ──────────────��─────────────────────────────

export type ThemeName = "default" | "monochrome" | "dark";

// ─── Base Theme ─────────────��──────────────────────────────

export interface BaseTheme {
  bg: string;
  text: string;
  textMuted: string;
  stroke: string;
  strokeMuted: string;
  fill: string;
  fillMuted: string;
  accent: string;
  positive: string;
  negative: string;
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
 * Tokens for causality / analysis diagrams (fishbone, future fault-tree, 5-whys).
 * Category color is applied to top-level bones + their labels; deeper levels stay
 * neutral so color doesn't overload hierarchy.
 */
export interface CausalityTokens {
  /** Effect / outcome box fill */
  headFill: string;
  /** Effect / outcome box stroke */
  headStroke: string;
  /** Effect / outcome box text color */
  headText: string;
  /** Spine / trunk line color */
  spineStroke: string;
  /** 8-color category palette; cycles when DSL omits explicit color */
  boneColors: readonly string[];
}

/**
 * Tokens for set-theory diagrams (Venn / Euler). Paletteof set fills is
 * tuned slightly softer than BaseTheme to blend nicely under
 * `mix-blend-mode: multiply`.
 */
export interface VennTokens {
  /** Per-set fill palette (cycles if more sets than entries). */
  vennSetColors: readonly string[];
  /** Default blend mode for overlap areas. */
  vennBlendMode: "multiply" | "screen" | "none";
  /** Fill opacity per set (pre-blend). */
  vennSetOpacity: number;
  /** Outline stroke for every set. */
  vennSetStroke: string;
  /** Primary region-label fill. */
  vennLabelColor: string;
  /** Count chip fill (integers inside regions). */
  vennCountColor: string;
  /** Leader-line stroke for externalized labels. */
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
  /** Zebra-band fills for grouped rows. */
  bandOdd: string;
  bandEven: string;
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
  /** Baseline fills applied by node shape when no class is set. */
  stadiumFill: string;
  diamondFill: string;
  roundFill: string;
  /** Semantic class presets (applied via `class A start` etc.). */
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
 */
export interface MindmapTokens {
  centralFill: string;
  centralText: string;
  branchPalette: readonly string[];
  edgeMain: number;
  edgeSub: number;
  underlineMain: number;
  underlineSub: number;
}

// ─── Resolved Theme ────────────────────────────────────────

export type ResolvedTheme<T = object> = BaseTheme & T;

// ─── Built-in Presets ────────��─────────────────────────────

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
  strokeMuted: "#94a3b8",
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
  strokeMuted: "#888888",
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
  strokeMuted: "#585b70",
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

// ─── Biology Tokens Per Theme ──────���───────────────────────

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

// ─── Causality Tokens Per Theme ────────────────────────────

const DEFAULT_CAUSALITY: CausalityTokens = {
  headFill: "#1e293b",
  headStroke: "#0f172a",
  headText: "#ffffff",
  spineStroke: "#1f2937",
  boneColors: DEFAULT_PALETTE,
};

const MONOCHROME_CAUSALITY: CausalityTokens = {
  headFill: "#ffffff",
  headStroke: "#000000",
  headText: "#000000",
  spineStroke: "#000000",
  boneColors: MONOCHROME_PALETTE,
};

const DARK_CAUSALITY: CausalityTokens = {
  headFill: "#3a3a2a",
  headStroke: "#cdd6f4",
  headText: "#f9e2af",
  spineStroke: "#cdd6f4",
  boneColors: DARK_PALETTE,
};

export const CAUSALITY_TOKENS: Record<ThemeName, CausalityTokens> = {
  default: DEFAULT_CAUSALITY,
  monochrome: MONOCHROME_CAUSALITY,
  dark: DARK_CAUSALITY,
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

// XMind-inspired 8-color palette.
const MINDMAP_PALETTE = [
  "#2D7FF9", // blue
  "#F59E0B", // amber
  "#10B981", // green
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
] as const;

const DEFAULT_MINDMAP: MindmapTokens = {
  centralFill: "#1E293B",
  centralText: "#ffffff",
  branchPalette: MINDMAP_PALETTE,
  edgeMain: 3.5,
  edgeSub: 1.8,
  underlineMain: 3.5,
  underlineSub: 1.8,
};

const MONOCHROME_MINDMAP: MindmapTokens = {
  centralFill: "#000000",
  centralText: "#ffffff",
  branchPalette: ["#000000"],
  edgeMain: 1.8,
  edgeSub: 1.2,
  underlineMain: 1.8,
  underlineSub: 1.2,
};

const DARK_MINDMAP: MindmapTokens = {
  centralFill: "#89b4fa",
  centralText: "#1e1e2e",
  branchPalette: [
    "#89b4fa", "#f9e2af", "#a6e3a1", "#f38ba8",
    "#cba6f7", "#f5c2e7", "#94e2d5", "#fab387",
  ],
  edgeMain: 3.5,
  edgeSub: 1.8,
  underlineMain: 3.5,
  underlineSub: 1.8,
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
  bandOdd: "#f7f7f7",
  bandEven: "#fbfbfb",
  error: "#cc0000",
};

const MONOCHROME_INDUSTRIAL: IndustrialTokens = {
  bg: "#ffffff",
  stroke: "#000000",
  strokeHeavy: "#000000",
  text: "#000000",
  textMuted: "#333333",
  accent: "#000000",
  bandOdd: "#f4f4f4",
  bandEven: "#fbfbfb",
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
  bandOdd: "#2a2b3c",
  bandEven: "#313244",
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

// ─── Theme Resolution ─��────────────────────────────────────

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

export function resolveFishboneTheme(name: string): ResolvedTheme<CausalityTokens> {
  const themeName = (name in BASE_THEMES ? name : "default") as ThemeName;
  return { ...BASE_THEMES[themeName], ...CAUSALITY_TOKENS[themeName] };
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

// ─── Font Sizes ──────���─────────────────────────────────────

export const FONT_SIZE = {
  title: 16,
  label: 12,
  secondary: 11,
  small: 9,
  genLabel: 14,
  titleLarge: 20,
} as const;

// ─── Stroke Widths ─────────────────────────────────────────

export const STROKE_WIDTH = {
  thin: 1,
  normal: 1.5,
  medium: 2,
  thick: 2.5,
  heavy: 3.5,
} as const;

// ─── Spacing ────────────���────────────────────────��─────────

export const SPACING = {
  labelGap: 4,
  tipLabelGap: 6,
  titleOffset: 30,
} as const;

// ─── Font Family ──────────��────────────────────────────────

export const DEFAULT_FONT_FAMILY = "system-ui, -apple-system, sans-serif";

// ─── CSS Custom Properties ─────────────────────────────────

export function cssCustomProperties(theme?: BaseTheme): string {
  const t = theme ?? BASE_THEMES["default"];
  return `
  --schematex-bg: ${t.bg};
  --schematex-text: ${t.text};
  --schematex-text-muted: ${t.textMuted};
  --schematex-stroke: ${t.stroke};
  --schematex-stroke-muted: ${t.strokeMuted};
  --schematex-fill: ${t.fill};
  --schematex-fill-muted: ${t.fillMuted};
  --schematex-accent: ${t.accent};
  --schematex-positive: ${t.positive};
  --schematex-negative: ${t.negative};
  --schematex-neutral: ${t.neutral};
  --schematex-warn: ${t.warn};
  --schematex-font-title: ${FONT_SIZE.title}px;
  --schematex-font-label: ${FONT_SIZE.label}px;
  --schematex-font-secondary: ${FONT_SIZE.secondary}px;
  --schematex-font-small: ${FONT_SIZE.small}px;
  --schematex-stroke-normal: ${STROKE_WIDTH.normal};
  --schematex-stroke-medium: ${STROKE_WIDTH.medium};
  --schematex-stroke-thick: ${STROKE_WIDTH.thick};`;
}

