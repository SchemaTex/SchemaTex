import type {
  MatrixAST,
  MatrixAxis,
  MatrixQuadrantAnnotation,
  MatrixTemplate,
  MatrixCellLabel,
} from "./types";

export interface TemplateSpec {
  title?: string;
  grid: "2x2" | "3x3" | "NxM";
  cols?: number;
  rows?: number;
  mode?: "quadrant" | "heatmap";
  xAxis: MatrixAxis;
  yAxis: MatrixAxis;
  annotations?: MatrixQuadrantAnnotation[];
  cellLabels?: MatrixCellLabel[];
  rowLabels?: string[];
  colLabels?: string[];
}

export const TEMPLATES: Record<MatrixTemplate, TemplateSpec> = {
  "eisenhower": {
    grid: "2x2",
    xAxis: { low: "Urgent", high: "Not Urgent" },
    yAxis: { low: "Not Important", high: "Important" },
    annotations: [
      { q: 1, label: "Schedule" },
      { q: 2, label: "Do First" },
      { q: 3, label: "Delete" },
      { q: 4, label: "Delegate" },
    ],
  },
  "impact-effort": {
    grid: "2x2",
    xAxis: { low: "Low Effort", high: "High Effort" },
    yAxis: { low: "Low Impact", high: "High Impact" },
    annotations: [
      { q: 1, label: "Major Projects" },
      { q: 2, label: "Quick Wins" },
      { q: 3, label: "Fill-ins" },
      { q: 4, label: "Thankless" },
    ],
  },
  "rice": {
    grid: "2x2",
    xAxis: { low: "Low Effort", high: "High Effort" },
    yAxis: { low: "Low Reach × Impact", high: "High Reach × Impact" },
    annotations: [
      { q: 1, label: "Strategic Bets" },
      { q: 2, label: "High RICE" },
      { q: 3, label: "Backlog" },
      { q: 4, label: "Reconsider" },
    ],
  },
  "bcg": {
    grid: "2x2",
    // BCG convention: high market share on left (x-axis reversed)
    xAxis: { low: "High Market Share", high: "Low Market Share" },
    yAxis: { low: "Low Growth", high: "High Growth" },
    annotations: [
      { q: 1, label: "Question Marks" },
      { q: 2, label: "Stars" },
      { q: 3, label: "Cash Cows" },
      { q: 4, label: "Dogs" },
    ],
  },
  "ansoff": {
    grid: "2x2",
    xAxis: { low: "Existing Products", high: "New Products" },
    yAxis: { low: "Existing Markets", high: "New Markets" },
    annotations: [
      { q: 1, label: "Diversification" },
      { q: 2, label: "Market Development" },
      { q: 3, label: "Market Penetration" },
      { q: 4, label: "Product Development" },
    ],
  },
  "johari": {
    grid: "2x2",
    xAxis: { low: "Known to Self", high: "Not Known to Self" },
    yAxis: { low: "Not Known to Others", high: "Known to Others" },
    annotations: [
      { q: 1, label: "Blind" },
      { q: 2, label: "Open / Arena" },
      { q: 3, label: "Hidden / Façade" },
      { q: 4, label: "Unknown" },
    ],
  },
  "9-box": {
    grid: "3x3",
    cols: 3,
    rows: 3,
    xAxis: { low: "Low Performance", high: "High Performance" },
    yAxis: { low: "Low Potential", high: "High Potential" },
    cellLabels: [
      { col: 0, row: 2, label: "Enigma" },
      { col: 1, row: 2, label: "Growth Employee" },
      { col: 2, row: 2, label: "Future Leader" },
      { col: 0, row: 1, label: "Dilemma" },
      { col: 1, row: 1, label: "Core Player" },
      { col: 2, row: 1, label: "High Impact" },
      { col: 0, row: 0, label: "Under-performer" },
      { col: 1, row: 0, label: "Effective" },
      { col: 2, row: 0, label: "Trusted Pro" },
    ],
  },
  "risk-matrix": {
    grid: "NxM",
    mode: "heatmap",
    cols: 5,
    rows: 5,
    xAxis: { low: "Negligible", high: "Severe" },
    yAxis: { low: "Rare", high: "Certain" },
    rowLabels: ["Rare", "Unlikely", "Possible", "Likely", "Certain"],
    colLabels: ["Negligible", "Minor", "Moderate", "Major", "Severe"],
  },
};

export function resolveTemplate(name: string): TemplateSpec | undefined {
  if (name in TEMPLATES) return TEMPLATES[name as MatrixTemplate];
  return undefined;
}

/**
 * Apply a template's defaults to an AST in-place (fills axes / annotations /
 * cell labels only when the DSL hasn't already set them).
 */
export function applyTemplateDefaults(ast: MatrixAST, spec: TemplateSpec): void {
  if (spec.grid === "3x3") {
    ast.grid = "3x3";
    ast.cols = 3;
    ast.rows = 3;
  } else if (spec.grid === "NxM") {
    ast.grid = "NxM";
    ast.cols = spec.cols ?? 5;
    ast.rows = spec.rows ?? 5;
  } else {
    ast.grid = "2x2";
    ast.cols = 2;
    ast.rows = 2;
  }
  if (spec.mode) ast.mode = spec.mode;
  if (!ast.xAxis.low && !ast.xAxis.high) ast.xAxis = { ...spec.xAxis };
  if (!ast.yAxis.low && !ast.yAxis.high) ast.yAxis = { ...spec.yAxis };
  if (spec.annotations && ast.annotations.length === 0) {
    ast.annotations = spec.annotations.map((a) => ({ ...a }));
  }
  if (spec.cellLabels && ast.cellLabels.length === 0) {
    ast.cellLabels = spec.cellLabels.map((c) => ({ ...c }));
  }
  if (spec.rowLabels && !ast.rowLabels) ast.rowLabels = [...spec.rowLabels];
  if (spec.colLabels && !ast.colLabels) ast.colLabels = [...spec.colLabels];
}
