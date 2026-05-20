/**
 * PERT / CPM (Activity-on-Node) — AST, schedule, and layout types.
 *
 * Spec: docs/reference/32-PERT-STANDARD.md
 *
 * Unlike most Schematex engines, the PERT engine *computes* the schedule
 * (forward pass, backward pass, slack, critical path) from durations and
 * dependencies — the render is downstream of that computation.
 */

export type PertUnit = "days" | "weeks" | "hours" | "abstract";
export type PertDirection = "LR" | "TB";
export type PertLayoutMode = "network" | "timescaled" | "aoa";

/** Precedence Diagramming Method dependency types. */
export type PertDepType = "FS" | "SS" | "FF" | "SF";

/** Three-point (PERT) estimate: optimistic / most-likely / pessimistic. */
export interface PertThreePoint {
  o: number;
  m: number;
  p: number;
}

export interface PertDependency {
  /** Predecessor task id. */
  pred: string;
  type: PertDepType;
  /** Lag in the diagram's base unit. Positive = lag, negative = lead. */
  lag: number;
}

export interface PertTask {
  id: string;
  label: string;
  /** Effective (expected) duration used by the scheduler — `te` for three-point. */
  duration: number;
  /** Raw three-point estimate, if the duration was declared as `O/M/P`. */
  threePoint?: PertThreePoint;
  /** Activity variance σ² = ((P − O)/6)², present only for three-point tasks. */
  variance?: number;
  milestone: boolean;
  deps: PertDependency[];
  tags: string[];
  className?: string;
  /** Swimlane / grouping band (responsible party, phase, …). */
  lane?: string;
  /** Source line — used in error messages. */
  line?: number;
}

export interface PertAst {
  type: "pert";
  title?: string;
  unit: PertUnit;
  direction: PertDirection;
  layout: PertLayoutMode;
  /** Slack ≤ this value counts as critical. Default 0. */
  criticalTolerance: number;
  showSentinels: boolean;
  tasks: PertTask[];
  warnings: string[];
}

// ─── Schedule (scheduler output) ─────────────────────────────────

export interface PertComputed {
  es: number;
  ef: number;
  ls: number;
  lf: number;
  /** Total slack = LS − ES = LF − EF. */
  slack: number;
  critical: boolean;
}

export interface PertScheduleResult {
  /** Computed schedule fields keyed by task id. */
  computed: Map<string, PertComputed>;
  /** Topological order of real task ids (sentinels excluded). */
  order: string[];
  projectDuration: number;
  /** One representative critical chain of task ids, source → sink. */
  criticalPath: string[];
  criticalCount: number;
  depCount: number;
  /** Σ σ² over critical activities (three-point only). undefined if no variance. */
  projectVariance?: number;
  projectStdDev?: number;
}

// ─── Layout types ────────────────────────────────────────────────

export interface PertBox {
  id: string;
  task: PertTask;
  computed: PertComputed;
  /** Top-left corner of the bounding box. */
  x: number;
  y: number;
  width: number;
  height: number;
  milestone: boolean;
  /** Column / rank index (network mode). */
  rank: number;
}

export interface PertEdgeLabel {
  text: string;
  x: number;
  y: number;
}

export interface PertEdge {
  from: string;
  to: string;
  type: PertDepType;
  lag: number;
  /** SVG path 'd'. */
  d: string;
  critical: boolean;
  label?: PertEdgeLabel;
}

export interface PertSentinel {
  id: "__start__" | "__finish__";
  label: string;
  cx: number;
  cy: number;
  r: number;
}

export interface PertLane {
  name: string;
  /** Top of the lane band (LR). */
  y: number;
  height: number;
  /** Alternating stripe flag for subtle banding. */
  alt: boolean;
}

export interface PertAxisTick {
  /** Pixel position along the axis. */
  pos: number;
  /** Time value at this tick. */
  value: number;
  major: boolean;
}

export interface PertAxis {
  ticks: PertAxisTick[];
  /** y of the axis baseline (LR) or x (TB). */
  baseline: number;
  /** Pixel start of the time region. */
  start: number;
  /** Pixel end of the time region. */
  end: number;
}

export interface PertSummary {
  projectDuration: number;
  taskCount: number;
  depCount: number;
  criticalCount: number;
  unit: PertUnit;
  criticalPath: string[];
  projectStdDev?: number;
}

// ─── Activity-on-Arrow (AOA / ADM) types ─────────────────────────

export interface AoaEvent {
  /** 1-based display number (classic i-j event numbering, tail < head). */
  id: number;
  x: number;
  y: number;
  r: number;
  /** Earliest / latest event time. */
  te: number;
  tl: number;
  critical: boolean;
}

export interface AoaArc {
  /** Tail / head event display ids. */
  from: number;
  to: number;
  /** Real-activity task id (absent for dummy activities). */
  taskId?: string;
  label?: string;
  duration?: number;
  dummy: boolean;
  critical: boolean;
  /** SVG path 'd'. */
  d: string;
  labelX: number;
  labelY: number;
}

export interface PertAoa {
  events: AoaEvent[];
  arcs: AoaArc[];
}

export interface PertLayoutResult {
  width: number;
  height: number;
  title?: string;
  direction: PertDirection;
  mode: PertLayoutMode;
  unit: PertUnit;
  boxes: PertBox[];
  edges: PertEdge[];
  sentinels: PertSentinel[];
  /** Swimlane bands (LR), present only when tasks declare a `lane:`. */
  lanes?: PertLane[];
  /** Activity-on-arrow event graph, present only when `layout: aoa`. */
  aoa?: PertAoa;
  axis?: PertAxis;
  summary: PertSummary;
  warnings: string[];
  ast: PertAst;
}
