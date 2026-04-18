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

// ─── Resolved Theme ────────────────────────────────────────

export type ResolvedTheme<T = object> = BaseTheme & T;

// ─── Built-in Presets ────────��─────────────────────────────

const DEFAULT_THEME: BaseTheme = {
  bg: "#ffffff",
  text: "#2c3e50",
  textMuted: "#607d8b",
  stroke: "#37474f",
  strokeMuted: "#90a4ae",
  fill: "#ffffff",
  fillMuted: "#f5f7fa",
  accent: "#1565c0",
  positive: "#388e3c",
  negative: "#d32f2f",
  neutral: "#9e9e9e",
  warn: "#e65100",
  palette: [
    "#1e88e5", // blue
    "#43a047", // green
    "#fb8c00", // orange
    "#8e24aa", // purple
    "#e53935", // red
    "#00897b", // teal
    "#d81b60", // pink
    "#546e7a", // blue-grey
  ],
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
  palette: [
    "#000000",
    "#333333",
    "#555555",
    "#777777",
    "#999999",
    "#aaaaaa",
    "#cccccc",
    "#444444",
  ],
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
  palette: [
    "#89b4fa", // blue
    "#a6e3a1", // green
    "#fab387", // peach
    "#cba6f7", // mauve
    "#f38ba8", // red
    "#94e2d5", // teal
    "#f5c2e7", // pink
    "#89dceb", // sky
  ],
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
  cladeColors: ["#1e88e5", "#e53935", "#43a047", "#8e24aa", "#fb8c00", "#00897b", "#d81b60", "#3949ab"],
  supportGood: "#43a047",
  supportMedium: "#fdd835",
  supportWarn: "#fb8c00",
  supportBad: "#e53935",
};

const MONOCHROME_BIOLOGY: BiologyTokens = {
  cladeColors: ["#000000", "#333333", "#555555", "#777777", "#999999", "#aaaaaa", "#cccccc", "#444444"],
  supportGood: "#000000",
  supportMedium: "#555555",
  supportWarn: "#888888",
  supportBad: "#aaaaaa",
};

const DARK_BIOLOGY: BiologyTokens = {
  cladeColors: ["#89b4fa", "#f38ba8", "#a6e3a1", "#cba6f7", "#fab387", "#94e2d5", "#f5c2e7", "#89dceb"],
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
  boneColors: [
    "#dc2626", // red-600
    "#2563eb", // blue-600
    "#059669", // emerald-600
    "#d97706", // amber-600
    "#7c3aed", // violet-600
    "#0891b2", // cyan-600
    "#db2777", // pink-600
    "#475569", // slate-600
  ],
};

const MONOCHROME_CAUSALITY: CausalityTokens = {
  headFill: "#ffffff",
  headStroke: "#000000",
  headText: "#000000",
  spineStroke: "#000000",
  boneColors: [
    "#000000",
    "#222222",
    "#444444",
    "#555555",
    "#666666",
    "#777777",
    "#888888",
    "#999999",
  ],
};

const DARK_CAUSALITY: CausalityTokens = {
  headFill: "#3a3a2a",
  headStroke: "#cdd6f4",
  headText: "#f9e2af",
  spineStroke: "#cdd6f4",
  boneColors: [
    "#f38ba8", // red
    "#89b4fa", // blue
    "#a6e3a1", // green
    "#fab387", // peach
    "#cba6f7", // mauve
    "#94e2d5", // teal
    "#f5c2e7", // pink
    "#89dceb", // sky
  ],
};

export const CAUSALITY_TOKENS: Record<ThemeName, CausalityTokens> = {
  default: DEFAULT_CAUSALITY,
  monochrome: MONOCHROME_CAUSALITY,
  dark: DARK_CAUSALITY,
};

// ─── Venn Tokens Per Theme ─────────────────────────────────

const DEFAULT_VENN: VennTokens = {
  vennSetColors: [
    "#4E79A7", // blue
    "#F28E2B", // orange
    "#E15759", // red
    "#76B7B2", // teal
    "#59A14F", // green
    "#EDC948", // yellow
    "#B07AA1", // purple
    "#FF9DA7", // pink
  ],
  vennBlendMode: "multiply",
  vennSetOpacity: 0.45,
  vennSetStroke: "#37474f",
  vennLabelColor: "#1f2937",
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
  vennSetColors: [
    "#89b4fa",
    "#fab387",
    "#f38ba8",
    "#94e2d5",
    "#a6e3a1",
    "#f9e2af",
    "#cba6f7",
    "#f5c2e7",
  ],
  vennBlendMode: "screen",
  vennSetOpacity: 0.55,
  vennSetStroke: "#cdd6f4",
  vennLabelColor: "#cdd6f4",
  vennCountColor: "#f9e2af",
  vennLeaderColor: "#7f849c",
};

export const VENN_TOKENS: Record<ThemeName, VennTokens> = {
  default: DEFAULT_VENN,
  monochrome: MONOCHROME_VENN,
  dark: DARK_VENN,
};

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

// ─── Legacy Exports (deprecated, use resolveBaseTheme) ─��───

/** @deprecated Use resolveBaseTheme("default") instead */
export const COLOR = {
  text: DEFAULT_THEME.text,
  textSecondary: DEFAULT_THEME.textMuted,
  stroke: DEFAULT_THEME.stroke,
  fill: DEFAULT_THEME.fill,
  fillMuted: DEFAULT_THEME.fillMuted,
  accent: DEFAULT_THEME.accent,
  positive: DEFAULT_THEME.positive,
  negative: DEFAULT_THEME.negative,
  neutral: DEFAULT_THEME.neutral,
  deceased: DEFAULT_PERSON.deceasedMark,
} as const;
