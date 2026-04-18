/**
 * Matrix / quadrant / heatmap AST types (18-MATRIX-STANDARD).
 *
 * Kept local to the matrix plugin to avoid polluting core/types.ts —
 * matrix doesn't reuse Individual / Relationship / LayoutNode shapes.
 */

export type MatrixMode = "quadrant" | "heatmap" | "correlation";

/** Dot-level for correlation matrix. "strong"=3, "medium"=2, "weak"=1. */
export type MatrixDotLevel = "strong" | "medium" | "weak";

export type MatrixTemplate =
  | "eisenhower"
  | "impact-effort"
  | "rice"
  | "bcg"
  | "ansoff"
  | "johari"
  | "9-box"
  | "risk-matrix";

export type MatrixGrid = "2x2" | "3x3" | "NxM";

export type LabelCollisionMode = "auto" | "offset-only" | "leader-only" | "off";

export interface MatrixPoint {
  id: string;
  label: string;
  /** Normalized [0,1] x coordinate */
  x: number;
  /** Normalized [0,1] y coordinate */
  y: number;
  /** Third-dim bubble magnitude (any positive scalar) */
  size?: number;
  category?: string;
  color?: string;
  note?: string;
  shape?: "circle" | "square" | "triangle" | "diamond";
  highlight?: boolean;
  /** Was the original coordinate out of [0,1] range? */
  offChart?: boolean;
  /** Original (pre-clamp) coordinates, for tooltip. */
  origX?: number;
  origY?: number;
}

export interface MatrixCell {
  /** 0-based column index */
  col: number;
  /** 0-based row index (0 = bottom) */
  row: number;
  value?: number;
  label?: string;
  /** Correlation dot level (correlation mode). Resolved to numeric value if not set. */
  level?: MatrixDotLevel;
}

export interface MatrixAxis {
  /** Left/bottom endpoint label */
  low: string;
  /** Right/top endpoint label */
  high: string;
  /** If true, the semantic direction is reversed (arrow points from high → low) */
  reversed?: boolean;
}

export interface MatrixQuadrantAnnotation {
  /** Q1=top-right, Q2=top-left, Q3=bottom-left, Q4=bottom-right */
  q: 1 | 2 | 3 | 4;
  label: string;
  /** Optional subtitle under the label */
  description?: string;
}

export interface MatrixCellLabel {
  col: number;
  row: number;
  label: string;
}

export interface MatrixConfig {
  quadrantBg: boolean;
  gridLines: boolean;
  axisArrows: boolean;
  labelCollision: LabelCollisionMode;
  bubbleScale: "area" | "radius";
  quadrantAnnotations: boolean;
  legendPosition: "bottom-right" | "right" | "bottom-center" | "none";
  offChartPolicy: "clamp-badge" | "drop";
  /** "auto" shows axis only in quadrant mode; "on"/"off" force it. */
  showAxis: "auto" | "on" | "off";
  /** Render Score + Rank margins (correlation mode). */
  margins: boolean;
}

export interface MatrixAST {
  type: "matrix";
  title?: string;
  mode: MatrixMode;
  grid: MatrixGrid;
  /** For NxM heatmap: column count */
  cols: number;
  /** For NxM heatmap: row count */
  rows: number;
  template?: MatrixTemplate;
  xAxis: MatrixAxis;
  yAxis: MatrixAxis;
  /** Point data (quadrant/bubble mode) */
  points: MatrixPoint[];
  /** Cell data (heatmap mode) */
  cells: MatrixCell[];
  /** Per-cell labels (3x3 template + heatmap) */
  cellLabels: MatrixCellLabel[];
  /** Optional row axis labels (heatmap mode) */
  rowLabels?: string[];
  /** Optional col axis labels (heatmap mode) */
  colLabels?: string[];
  /** Quadrant annotations (Q1..Q4) */
  annotations: MatrixQuadrantAnnotation[];
  config: MatrixConfig;
}
