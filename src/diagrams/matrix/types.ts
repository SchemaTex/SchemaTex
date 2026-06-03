/**
 * Matrix / quadrant / heatmap AST types (18-MATRIX-STANDARD).
 *
 * Kept local to the matrix plugin to avoid polluting core/types.ts —
 * matrix doesn't reuse Individual / Relationship / LayoutNode shapes.
 */

export type MatrixMode = "quadrant" | "heatmap" | "correlation" | "sipoc" | "qfd";

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

export type MatrixStyle = "default" | "table";

/**
 * SIPOC scoping table (Six Sigma). Five ordered fixed columns —
 * Suppliers · Inputs · Process · Outputs · Customers. Each holds an
 * ordered item list; the Process column carries the high-level steps.
 */
export interface SipocData {
  suppliers: string[];
  inputs: string[];
  process: string[];
  outputs: string[];
  customers: string[];
}

/** QFD relationship-matrix symbol set (Akao). 9=strong, 3=medium, 1=weak. */
export type QfdStrength = 9 | 3 | 1;

/**
 * QFD roof correlation between two engineering characteristics (HOWs).
 * "++"=strong positive, "+"=positive, "-"=negative, "--"=strong negative.
 */
export type QfdCorrelation = "++" | "+" | "-" | "--";

/** A "WHAT" — a customer requirement row with an importance weight. */
export interface QfdWhat {
  label: string;
  /** Importance weight (any positive scalar; commonly 1–5 or 1–10). */
  weight: number;
}

/** A "HOW" — an engineering characteristic column. */
export interface QfdHow {
  label: string;
  /** Optional improvement-direction marker (↑ maximise / ↓ minimise / ○ target). */
  direction?: "up" | "down" | "target";
}

/** A relationship cell in the QFD body: row=WHAT index, col=HOW index. */
export interface QfdRelationship {
  what: number;
  how: number;
  strength: QfdStrength;
}

/** A roof correlation between HOW i and HOW j (i < j). */
export interface QfdRoof {
  a: number;
  b: number;
  correlation: QfdCorrelation;
}

/** A column's computed technical importance (Σ weight×strength) + normalized %. */
export interface QfdColumnImportance {
  how: number;
  /** Σ over WHATs of (weight × relationship strength). */
  importance: number;
  /** Share of total importance across all columns, 0..100 (rounded). */
  percent: number;
}

export interface QfdData {
  whats: QfdWhat[];
  hows: QfdHow[];
  relationships: QfdRelationship[];
  roof: QfdRoof[];
  /** Render the technical-importance bottom row as % of total instead of raw Σ. */
  normalize: boolean;
}

export interface MatrixAST {
  type: "matrix";
  title?: string;
  mode: MatrixMode;
  grid: MatrixGrid;
  /** Optional render style preset. `table` = text-in-cell layout (no axes / arrows / annotations). */
  style?: MatrixStyle;
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
  /** SIPOC table data (sipoc mode). */
  sipoc?: SipocData;
  /** QFD House-of-Quality data (qfd mode). */
  qfd?: QfdData;
}

/**
 * Compute each HOW column's technical importance = Σ over WHATs of
 * (weight × relationship strength). The core QFD differentiator: the engine
 * *computes* the prioritised engineering targets rather than asking for them.
 *
 * Pure + deterministic so it can be unit-tested in isolation.
 */
export function computeQfdImportance(qfd: QfdData): QfdColumnImportance[] {
  const raw: number[] = qfd.hows.map(() => 0);
  for (const r of qfd.relationships) {
    if (r.how < 0 || r.how >= qfd.hows.length) continue;
    if (r.what < 0 || r.what >= qfd.whats.length) continue;
    const w = qfd.whats[r.what]!.weight;
    raw[r.how]! += w * r.strength;
  }
  const total = raw.reduce((acc, v) => acc + v, 0);
  return raw.map((importance, how) => ({
    how,
    importance,
    percent: total > 0 ? Math.round((importance / total) * 100) : 0,
  }));
}
