/**
 * Matrix / quadrant / heatmap AST types (18-MATRIX-STANDARD).
 *
 * Kept local to the matrix plugin to avoid polluting core/types.ts —
 * matrix doesn't reuse Individual / Relationship / LayoutNode shapes.
 */

export type MatrixMode = "quadrant" | "heatmap" | "correlation" | "sipoc" | "qfd" | "punnett";

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
  /** Punnett-square genetics data (punnett mode). */
  punnett?: PunnettData;
}

// ─── Punnett square (Mendelian genetics) ──────────────────────
//
// The differentiator is computation: from two parental genotypes the engine
// derives the gametes, the offspring grid, and the genotype + phenotype ratios
// (3:1, 9:3:3:1, …) — the user never types the grid.

/** One gene locus. Allele dominance follows the standard case convention. */
export interface PunnettGene {
  /** Uppercase dominant allele symbol, e.g. "A" — also identifies the locus. */
  dominant: string;
  /** Lowercase recessive allele symbol, e.g. "a". */
  recessive: string;
  /** Optional phenotype name expressed when ≥1 dominant allele is present. */
  dominantTrait?: string;
  /** Optional phenotype name for the homozygous-recessive genotype. */
  recessiveTrait?: string;
}

export interface PunnettData {
  /** Loci in declared order. */
  genes: PunnettGene[];
  /** Parent 1 (columns): per-locus allele pair, index-aligned with `genes`. */
  parent1: string[][];
  /** Parent 2 (rows): per-locus allele pair, index-aligned with `genes`. */
  parent2: string[][];
}

export interface PunnettCell {
  /** Canonical genotype, dominant-first per locus, e.g. "AaBb". */
  genotype: string;
  /** Phenotype class key — one char per locus (dominant=upper, recessive=lower). */
  phenotypeKey: string;
}

export interface PunnettRatioEntry {
  key: string;
  label: string;
  count: number;
}

export interface PunnettResult {
  /** Parent-1 gametes (column headers), with multiplicity. */
  gametes1: string[];
  /** Parent-2 gametes (row headers), with multiplicity. */
  gametes2: string[];
  /** grid[row][col] over parent2 × parent1 gametes. */
  grid: PunnettCell[][];
  genotypeRatio: PunnettRatioEntry[];
  phenotypeRatio: PunnettRatioEntry[];
}

/** Enumerate a parent's gametes (one allele copy per locus), multiplicity kept. */
function gametesOf(parent: string[][]): string[] {
  let acc: string[] = [""];
  for (const pair of parent) {
    const a0 = pair[0] ?? "";
    const a1 = pair[1] ?? a0;
    const next: string[] = [];
    for (const g of acc) {
      next.push(g + a0);
      next.push(g + a1);
    }
    acc = next;
  }
  return acc;
}

/** Cross two gametes into a canonical genotype + phenotype-class key. */
function combineGametes(g1: string, g2: string, genes: PunnettGene[]): PunnettCell {
  let genotype = "";
  let phenotypeKey = "";
  for (let i = 0; i < genes.length; i++) {
    const dom = genes[i]!.dominant;
    const rec = genes[i]!.recessive;
    const a = g1[i] ?? rec;
    const b = g2[i] ?? rec;
    const hasDom = a === dom || b === dom;
    // dominant allele written first
    const pair = a === dom ? [a, b] : b === dom ? [b, a] : [a, b];
    genotype += pair.join("");
    phenotypeKey += hasDom ? dom : rec;
  }
  return { genotype, phenotypeKey };
}

function phenotypeLabel(key: string, genes: PunnettGene[]): string {
  const parts: string[] = [];
  for (let i = 0; i < genes.length; i++) {
    const ch = key[i]!;
    const g = genes[i]!;
    if (ch === g.dominant) parts.push(g.dominantTrait ?? `${g.dominant}_`);
    else parts.push(g.recessiveTrait ?? `${g.recessive}${g.recessive}`);
  }
  return parts.join(", ");
}

/**
 * Compute the full Punnett cross: gametes, offspring grid, and the
 * genotype + phenotype ratios. Pure + deterministic so it unit-tests in
 * isolation — this is the Punnett differentiator (the engine computes the
 * Mendelian outcome rather than asking the user to fill the grid).
 */
export function computePunnett(data: PunnettData): PunnettResult {
  const genes = data.genes;
  const gametes1 = gametesOf(data.parent1);
  const gametes2 = gametesOf(data.parent2);
  const grid: PunnettCell[][] = [];
  const genoCount = new Map<string, number>();
  const phenoCount = new Map<string, number>();
  for (const g2 of gametes2) {
    const row: PunnettCell[] = [];
    for (const g1 of gametes1) {
      const cell = combineGametes(g1, g2, genes);
      row.push(cell);
      genoCount.set(cell.genotype, (genoCount.get(cell.genotype) ?? 0) + 1);
      phenoCount.set(cell.phenotypeKey, (phenoCount.get(cell.phenotypeKey) ?? 0) + 1);
    }
    grid.push(row);
  }
  const genotypeRatio = [...genoCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([genotype, count]) => ({ key: genotype, label: genotype, count }));
  const phenotypeRatio = [...phenoCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, label: phenotypeLabel(key, genes), count }));
  return { gametes1, gametes2, grid, genotypeRatio, phenotypeRatio };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Reduce a count vector to its lowest-terms colon ratio, e.g. [9,3,3,1] → "9:3:3:1". */
export function reduceRatio(counts: number[]): string {
  const divisor = counts.reduce((acc, c) => gcd(acc, c), 0) || 1;
  return counts.map((c) => c / divisor).join(":");
}

export interface PunnettFooter {
  phenotypeRatio: string;
  legend: PunnettRatioEntry[];
  genotypeRatio: string;
  /** Per-genotype breakdown, enumerated only when small enough to stay readable. */
  genotypeDetail: string;
}

/**
 * Footer summary lines shared by the renderer (to draw) and the layout (to
 * size the canvas), so the two never disagree. The genotype breakdown is
 * enumerated for the monohybrid case and collapsed to a count beyond that —
 * a dihybrid has 9 genotypes and a trihybrid 27, which would overflow.
 */
export function punnettFooter(result: PunnettResult): PunnettFooter {
  const enumerate = result.genotypeRatio.length <= 4;
  return {
    phenotypeRatio: reduceRatio(result.phenotypeRatio.map((p) => p.count)),
    legend: result.phenotypeRatio,
    genotypeRatio: reduceRatio(result.genotypeRatio.map((e) => e.count)),
    genotypeDetail: enumerate
      ? result.genotypeRatio.map((e) => `${e.count} ${e.label}`).join(", ")
      : `${result.genotypeRatio.length} distinct genotypes`,
  };
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
