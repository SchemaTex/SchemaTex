/**
 * Sports playbook — AST and layout types (multi-sport).
 *
 * Spec: docs/reference/49-SPORTS-PLAYBOOK-STANDARD.md
 *
 * Three sports share one DSL skeleton — a field/court, players placed by
 * preset or coordinate, and movement assignments whose **line style** carries
 * the meaning (solid-arrow run/cut, dashed-arrow pass, wavy-arrow dribble,
 * T-bar screen/block). Each sport owns its coordinate model:
 *   football   — yards;  x lateral from the ball (0 = center, + = offense right),
 *                y depth off the LOS (0 = LOS, + = downfield). y-up on render.
 *   basketball — feet;   half-court; x lateral from center (0; ±25 = sidelines),
 *                y from the baseline (0 = baseline under the hoop → 47 = half line).
 *   soccer     — meters; full pitch landscape; x along the length (0 = own goal
 *                line → 105 = opponent goal line), y across the width (0 → 68).
 */

// ─── Sport ───────────────────────────────────────────────────────

export type PlaybookSport = "football" | "basketball" | "soccer";

/** Team allegiance. offense = "your" team (circles); defense = opponents (X). */
export type Side = "offense" | "defense";

// ─── Player symbols ──────────────────────────────────────────────

/**
 * Symbol class drawn for a player. Football carries position-specific glyphs;
 * basketball / soccer use the generic numbered circle (`o`) + defender `x`.
 */
export type PlayerSymbol =
  // generic
  | "o" //  offense — open/labeled circle (basketball & soccer numbered)
  | "x" //  defender — X glyph
  // football offense
  | "c" //  center — square (LOS anchor)
  | "ol" // offensive lineman
  | "qb"
  | "rb"
  | "wr"
  | "te"
  // football defense
  | "dl"
  | "lb"
  | "db"
  | "s"
  // soccer / basketball
  | "gk"; // goalkeeper — circle with a keeper mark

// ─── Movement assignments ────────────────────────────────────────

/**
 * Movement kind → render style (§3). The kind picks the line style + end
 * marker; the renderer is sport-agnostic once a move is resolved.
 *   run / route / cut / move  — solid line, open arrowhead
 *   pass                      — dashed line, open arrowhead
 *   dribble                   — wavy line, open arrowhead
 *   screen / block            — solid line, perpendicular T-bar
 *   shot                      — solid line, double-stroke arrow toward goal/rim
 *   motion                    — dashed line, open arrowhead (football pre-snap)
 *   handoff                   — short solid line, no head (mesh)
 *   pull                      — football pulling lineman, solid line + arrow
 */
export type MoveKind =
  | "run" | "route" | "cut" | "move"
  | "pass"
  | "dribble"
  | "screen" | "block"
  | "shot"
  | "motion"
  | "handoff"
  | "pull";

export type LineStyle = "solid" | "dashed" | "wavy" | "double";
export type MoveEnd = "arrow" | "tee" | "none";

export type BreakDir = "left" | "right";

/** Football passing-tree route names + run concepts (§3.2). */
export type NamedRoute =
  | "go" | "fly" | "streak" | "vertical"
  | "slant" | "flat" | "hitch" | "out" | "in" | "dig"
  | "curl" | "comeback" | "corner" | "flag" | "post"
  | "wheel" | "cross" | "drag" | "seam" | "screen"
  | "dive" | "iso" | "power" | "counter" | "sweep" | "toss" | "draw" | "trap";

/** Football offensive formation preset (§4). */
export type Formation =
  | "i-form" | "shotgun" | "singleback" | "pistol"
  | "trips" | "spread" | "trips-right" | "trips-left"
  | "empty" | "goal-line" | "wishbone"
  // soccer formations
  | "4-4-2" | "4-3-3" | "4-2-3-1" | "3-5-2" | "4-4-1-1" | "4-5-1" | "3-4-3"
  // basketball sets
  | "horns" | "1-4-high" | "1-4-low" | "box" | "spread-pnr" | "5-out" | "4-out";

/** Football defensive scheme preset / basketball defense (§5). */
export type DefenseScheme =
  | "4-3" | "3-4" | "4-4" | "nickel" | "dime"
  | "cover-0" | "cover-1" | "cover-2" | "cover-3" | "cover-4" | "cover-6"
  // basketball
  | "man" | "zone-2-3" | "zone-3-2" | "zone-1-3-1"
  // soccer (opponent block)
  | "low-block" | "mid-block" | "high-press";

// ─── AST ─────────────────────────────────────────────────────────

export interface PlaybookPlayer {
  id: string;
  side: Side;
  pos: PlayerSymbol;
  label: string;
  /** Explicit position in the sport's native unit (overrides the preset slot). */
  at?: { x: number; y: number };
  line?: number;
}

export interface MovePoint {
  /** Absolute / relative coordinate (when `ref` is absent). */
  x?: number;
  y?: number;
  /** Delta from the previous point when true. */
  rel?: boolean;
  /** A player id or a court/pitch landmark name, resolved at layout. */
  ref?: string;
}

export interface PlaybookMove {
  player: string;
  kind: MoveKind;
  /** Football named route / run concept (mutually exclusive with `points`). */
  named?: NamedRoute;
  /** Stem depth in yards before the break (football named routes). */
  depth?: number;
  dir?: BreakDir;
  /** screen/block/handoff/pass target (player id, or a landmark name). */
  target?: string;
  /** Hand-authored polyline. */
  points?: MovePoint[];
  end?: MoveEnd;
  line?: number;
}

export interface PlaybookZone {
  x: number;
  y: number;
  rx: number;
  ry: number;
  label?: string;
  line?: number;
}

export interface PlaybookAst {
  type: "playbook";
  title: string;
  sport: PlaybookSport;
  // football down & distance
  down: number;
  distance: number;
  /** football: LOS yard label; also the snap spot for end-zone awareness. */
  losYard?: number;
  /** football: yards from the LOS to the attacking goal line (draws the end zone). */
  toGoal?: number;
  hash: "nfl" | "college" | "none";
  /** Half/attacking-half vs full view (basketball always half; soccer full/half). */
  view: "full" | "half" | "auto";
  formation?: Formation;
  formationSide: BreakDir;
  defense?: DefenseScheme;
  players: PlaybookPlayer[];
  moves: PlaybookMove[];
  zones: PlaybookZone[];
}

// ─── Layout result (native units) ────────────────────────────────

export interface PlayerGeom {
  id: string;
  side: Side;
  pos: PlayerSymbol;
  label: string;
  x: number;
  y: number;
}

export interface MoveGeom {
  player: string;
  kind: MoveKind;
  style: LineStyle;
  points: Array<{ x: number; y: number }>;
  end: MoveEnd;
}

export interface ZoneGeom {
  x: number;
  y: number;
  rx: number;
  ry: number;
  label?: string;
}

export interface PlaybookLayoutResult {
  title: string;
  sport: PlaybookSport;
  down: number;
  distance: number;
  losYard?: number;
  toGoal?: number;
  hash: "nfl" | "college" | "none";
  view: "full" | "half";
  players: PlayerGeom[];
  moves: MoveGeom[];
  zones: ZoneGeom[];
  /** Field window in native units. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  errors: string[];
  warnings: string[];
}

// ─── Render helpers ──────────────────────────────────────────────

export type PxFn = (u: number) => number;
