/**
 * Shared design tokens for all Lineage diagram renderers.
 *
 * Each renderer imports these tokens instead of hardcoding values.
 * All tokens are also exposed as CSS custom properties (--lineage-*)
 * so consumers can override them.
 */

// ─── Font Sizes ─────────────────────────────────────────────

export const FONT_SIZE = {
  title: 16,
  label: 12,
  secondary: 11,
  small: 9,
  genLabel: 14,
  titleLarge: 20,
} as const;

// ─── Colors ─────────────────────────────────────────────────

export const COLOR = {
  text: "#333",
  textSecondary: "#666",
  stroke: "#333",
  fill: "white",
  fillMuted: "#f5f5f5",
  accent: "#1976D2",
  positive: "#388E3C",
  negative: "#D32F2F",
  neutral: "#9E9E9E",
  deceased: "#b71c1c",
} as const;

// ─── Stroke Widths ──────────────────────────────────────────

export const STROKE_WIDTH = {
  thin: 1,
  normal: 1.5,
  medium: 2,
  thick: 2.5,
  heavy: 3.5,
} as const;

// ─── Spacing ────────────────────────────────────────────────

export const SPACING = {
  labelGap: 4,
  tipLabelGap: 6,
  titleOffset: 30,
} as const;

// ─── Font Family ────────────────────────────────────────────

export const DEFAULT_FONT_FAMILY = "system-ui, -apple-system, sans-serif";

// ─── CSS Custom Properties ──────────────────────────────────

/**
 * Generates CSS custom property declarations for all design tokens.
 * Embed this in a <style> block so consumers can override via:
 *   .lineage-diagram { --lineage-text: #000; }
 */
export function cssCustomProperties(): string {
  return `
  --lineage-text: ${COLOR.text};
  --lineage-text-secondary: ${COLOR.textSecondary};
  --lineage-stroke: ${COLOR.stroke};
  --lineage-fill: ${COLOR.fill};
  --lineage-fill-muted: ${COLOR.fillMuted};
  --lineage-accent: ${COLOR.accent};
  --lineage-positive: ${COLOR.positive};
  --lineage-negative: ${COLOR.negative};
  --lineage-neutral: ${COLOR.neutral};
  --lineage-deceased: ${COLOR.deceased};
  --lineage-font-title: ${FONT_SIZE.title}px;
  --lineage-font-label: ${FONT_SIZE.label}px;
  --lineage-font-secondary: ${FONT_SIZE.secondary}px;
  --lineage-font-small: ${FONT_SIZE.small}px;
  --lineage-stroke-normal: ${STROKE_WIDTH.normal};
  --lineage-stroke-medium: ${STROKE_WIDTH.medium};
  --lineage-stroke-thick: ${STROKE_WIDTH.thick};`;
}
