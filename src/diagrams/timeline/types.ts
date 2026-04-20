/**
 * Timeline diagram — local types.
 *
 * Pipeline: text → TimelineAST → TimelineLayout → SVG
 * Spec: docs/reference/19-TIMELINE-STANDARD.md
 */

export type TimelineOrientation = "horizontal" | "vertical";
export type TimelineScale = "proportional" | "equidistant" | "log";
export type TimelineAxisPosition = "bottom" | "center";
export type TimelineEventKind = "point" | "range" | "milestone";
export type TimelineEventShape =
  | "circle" | "square" | "diamond" | "star" | "flag";

/**
 * Visual style variants:
 * - swimlane: default multi-track stacked layout (biographies, roadmaps)
 * - gantt: project-plan style — event pins above axis, task bars grouped by
 *   category below, legend on the right
 * - lollipop: center axis with alternating above/below cards on stems
 *   (history retrospectives, brand stories)
 */
export type TimelineStyle = "swimlane" | "gantt" | "lollipop";
export type TimelineSide = "above" | "below";

/**
 * All dates are normalized to a single scalar: fractional year.
 * - AD date → 1905.0, 1905-07-20 → 1905.55, etc.
 * - BC year → negative (e.g. -753)
 * - Ma → -N*1e6 + 1970 (approx; only used for log/linear comparisons, not
 *   displayed as raw scalar)
 */
export interface TimelineDate {
  /** Fractional year scalar (used for layout). */
  value: number;
  /** Original raw string from DSL, for display. */
  raw: string;
  /** Precision — affects tick granularity + display formatter. */
  precision: "day" | "month" | "year" | "ma";
}

export interface TimelineEvent {
  id: string;
  label: string;
  kind: TimelineEventKind;
  start: TimelineDate;
  /** Defined only for kind === "range". */
  end?: TimelineDate;
  trackId?: string;
  icon?: string;
  shape?: TimelineEventShape;
  color?: string;
  note?: string;
  /** Category / team grouping — drives gantt swimlane + legend color. */
  category?: string;
  /** Lollipop card placement hint. Auto-alternates when absent. */
  side?: TimelineSide;
}

export interface TimelineEra {
  id: string;
  label: string;
  start: TimelineDate;
  end: TimelineDate;
  color?: string;
}

export interface TimelineTrack {
  id: string;
  label: string;
}

export interface TimelineAST {
  type: "timeline";
  title?: string;
  style: TimelineStyle;
  orientation: TimelineOrientation;
  scale: TimelineScale;
  axis: TimelineAxisPosition;
  events: TimelineEvent[];
  eras: TimelineEra[];
  /** Explicit (named) tracks. Auto-packed events get synthesized ids. */
  tracks: TimelineTrack[];
  metadata?: Record<string, string>;
}

// ─── Layout types ─────────────────────────────────────────

export interface TimelineTick {
  value: number;
  /** Pre-computed canvas x position. */
  x: number;
  label: string;
  major: boolean;
}

export interface TimelineLaneLayout {
  trackId: string;
  label: string;
  y: number;
  height: number;
}

export interface TimelineEventLayout {
  event: TimelineEvent;
  /** x-center for point/milestone, x-start for range. */
  x: number;
  /** Width (range only). */
  w?: number;
  y: number;
  h: number;
  /** Label position relative to marker. */
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
  /** Note callout anchor (if note present). */
  noteX?: number;
  noteY?: number;
}

export interface TimelineEraLayout {
  era: TimelineEra;
  x: number;
  width: number;
  /** Era bands can stack vertically at top of chart when they overlap. */
  bandRow: number;
}

export interface TimelineLegendItem {
  label: string;
  color: string;
}

export interface TimelinePinLayout {
  event: TimelineEvent;
  x: number;
  /** Top of pin stack (where label goes). */
  labelY: number;
  /** Where pin meets axis. */
  axisY: number;
  color: string;
}

export interface TimelineCardLayout {
  event: TimelineEvent;
  /** Axis intersection x (center of circle marker). */
  x: number;
  axisY: number;
  side: TimelineSide;
  cardX: number;
  cardY: number;
  cardW: number;
  cardH: number;
  stemY1: number;
  stemY2: number;
  color: string;
  index: number;
}

export interface TimelineLayoutResult {
  width: number;
  height: number;
  style: TimelineStyle;
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  lanes: TimelineLaneLayout[];
  events: TimelineEventLayout[];
  eras: TimelineEraLayout[];
  ticks: TimelineTick[];
  axisY: number;
  title?: string;
  /** Gantt-only. */
  pins?: TimelinePinLayout[];
  legend?: TimelineLegendItem[];
  /** Lollipop-only. */
  cards?: TimelineCardLayout[];
}
