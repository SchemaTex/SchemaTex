/**
 * Floor plan / space layout — AST and layout types.
 *
 * Spec: docs/reference/48-FLOORPLAN-STANDARD.md
 *
 * Coordinate model: the AST keeps raw numbers in the plan's input unit
 * (`m` or `ft`, §3 note); the layout pass converts everything to meters
 * (1 ft = 0.3048 m) and resolves relative room placement. All
 * `FloorplanLayoutResult` geometry is absolute meters, y-down; the
 * renderer multiplies by a px/m scale.
 */

// ─── Enums ───────────────────────────────────────────────────────

export type FloorplanUnit = "m" | "ft";

export type WallSide = "north" | "south" | "east" | "west";

export type OpeningKind = "door" | "window" | "opening";

export type DoorType = "single" | "double" | "sliding" | "pocket" | "bifold";

/** Window variants (§2.1): fixed = 3 glazing lines; sliding = two offset
 * panels; casement = fixed + outward swing arc; bay = trapezoid projection. */
export type WindowType = "fixed" | "sliding" | "casement" | "bay";

export type DoorHinge = "left" | "right";

export type DoorSwing = "in" | "out";

export type RelativeHow = "right-of" | "left-of" | "above" | "below";

export type RelativeAlign = "start" | "center" | "end";

export type ArrayMode = "grid" | "row" | "arc";

/**
 * Furniture / fixture catalog (§2.2). Full v0.1 vocabulary across the four
 * demand clusters: residential, kitchen/bath, classroom/office, event/banquet.
 */
export type FurnitureType =
  // residential / living
  | "bed-double"
  | "bed-single"
  | "bed-queen"
  | "bed-king"
  | "sofa"
  | "loveseat"
  | "armchair"
  | "coffee-table"
  | "tv"
  | "rug"
  | "wardrobe"
  | "dresser"
  | "nightstand"
  | "bookshelf"
  | "plant"
  | "dining-table"
  // kitchen / bath
  | "counter"
  | "kitchen-sink"
  | "stove"
  | "fridge"
  | "dishwasher"
  | "island"
  | "toilet"
  | "sink"
  | "bathtub"
  | "shower"
  | "washer"
  | "dryer"
  // classroom / office
  | "sectional"
  | "side-table"
  | "tv-stand"
  | "fireplace"
  | "floor-lamp"
  | "ottoman"
  | "piano"
  | "piano-upright"
  | "pool-table"
  | "crib"
  | "bunk-bed"
  | "ceiling-fan"
  // kitchen extras
  | "wall-cabinet"
  | "range-hood"
  | "bar-stool"
  // bath extras
  | "vanity"
  | "bidet"
  | "urinal"
  // stairs & vertical circulation
  | "stairs"
  | "stairs-l"
  | "stairs-u"
  | "spiral-stairs"
  | "elevator"
  // structural
  | "column"
  // classroom / office
  | "desk-chair"
  | "desk"
  | "desk-l"
  | "chair"
  | "whiteboard"
  | "smartboard"
  | "bookcase"
  | "cubbies"
  | "filing-cabinet"
  | "lockers"
  | "kidney-table"
  | "round-table-4"
  | "round-table-6"
  | "round-table-8"
  | "round-table-10"
  | "conference-table"
  // event / banquet
  | "banquet-table"
  | "head-table"
  | "stage"
  | "dance-floor"
  | "bar"
  | "dj-booth"
  | "cocktail-table"
  | "podium"
  | "row-chairs"
  // retail
  | "shelving"
  | "checkout"
  | "clothing-rack"
  | "fitting-room"
  // warehouse / industrial
  | "pallet-rack"
  | "loading-dock"
  | "forklift"
  // salon / spa
  | "salon-chair"
  | "shampoo-bowl"
  | "manicure-table"
  // gym / fitness
  | "treadmill"
  | "weight-bench"
  | "power-rack"
  | "yoga-mat"
  // restaurant / commercial kitchen
  | "booth"
  | "prep-table"
  | "range"
  | "walk-in"
  | "commercial-sink"
  | "fryer"
  // electrical overlay fixtures
  | "outlet"
  | "duplex-outlet"
  | "switch"
  | "light"
  | "ceiling-light"
  | "data-outlet"
  | "electrical-panel"
  | "distribution-board"
  // site / outdoor
  | "tree"
  | "car";

// ─── AST ─────────────────────────────────────────────────────────

export interface FloorplanRoom {
  id: string;
  /** Display label; falls back to id. */
  label: string;
  /** Absolute placement in input units (mutually exclusive with `rel`). */
  at?: { x: number; y: number };
  /** Relative placement against a previously declared room. */
  rel?: {
    how: RelativeHow;
    ref: string;
    /** Cross-axis offset in input units (applied after `align`). */
    offset?: number;
    align?: RelativeAlign;
  };
  /** Interior size in input units. */
  w: number;
  h: number;
  /** Optional floor fill (CSS color); rendered as a presentational attribute. */
  fill?: string;
  /** Suppress the centered name + area label (single-space plans). */
  nolabel?: boolean;
  line?: number;
}

/**
 * `extend <room> <placement> size WxH` — grows a room into a rectilinear
 * polygon (L/T/U shapes) as a union of axis-aligned rectangles. The
 * extension must share an edge with the room's existing parts; walls merge
 * along the shared edge automatically.
 */
export interface FloorplanExtend {
  room: string;
  at?: { x: number; y: number };
  rel?: {
    how: RelativeHow;
    ref: string;
    offset?: number;
    align?: RelativeAlign;
  };
  w: number;
  h: number;
  line?: number;
}

export interface FloorplanOpening {
  kind: OpeningKind;
  /** Wall reference form: room id + side. */
  room?: string;
  side?: WallSide;
  /** `between A B` form — resolved to the shared wall segment at layout. */
  between?: [string, string];
  /** Position along the wall segment (or shared overlap), 0–100. */
  pct: number;
  /** Opening width in input units. */
  width: number;
  hinge: DoorHinge;
  swing: DoorSwing;
  doorType: DoorType;
  windowType: WindowType;
  line?: number;
}

export interface FloorplanFurniture {
  type: FurnitureType;
  /** Containing room id (required for placement). */
  room?: string;
  /** Position relative to the room's interior origin (top-left), input units. */
  x: number;
  y: number;
  /** Explicit size in input units; omitted → catalog default (meters). */
  size?: { w: number; h: number };
  /** Rotation in degrees, clockwise, around the symbol center. */
  rotate: number;
  label?: string;
  /**
   * Per-seat occupant names (`seats "Alice" "Bob" …`) for tables that
   * auto-seat chairs (round/banquet/conference/dining/head tables). Names map
   * to chairs in placement order; extra chairs render empty, extra names are
   * ignored. Turns a venue plan into an actual seating chart (§2.5).
   */
  seats?: string[];
  line?: number;
}

export interface FloorplanArray {
  mode: ArrayMode;
  type: FurnitureType;
  room?: string;
  rows: number;
  cols: number;
  /** Truncation cap, row-major (§3 note); Infinity = fill rows×cols. */
  count: number;
  /** Placement area corners, room-relative input units. */
  p1?: { x: number; y: number };
  p2?: { x: number; y: number };
  itemsize?: { w: number; h: number };
  rotate: number;
  /** Arc mode only. */
  center?: { x: number; y: number };
  radius?: number;
  fromDeg?: number;
  toDeg?: number;
  line?: number;
}

export interface FloorplanAst {
  type: "floorplan";
  title: string;
  unit: FloorplanUnit;
  /** `north` statement: draw a compass; value = clockwise rotation in degrees (0 = up). */
  north?: number;
  rooms: FloorplanRoom[];
  extensions: FloorplanExtend[];
  openings: FloorplanOpening[];
  furniture: FloorplanFurniture[];
  arrays: FloorplanArray[];
}

// ─── Layout result (absolute meters, y-down) ─────────────────────

/** Axis-aligned rect, absolute meters. */
export interface RectM {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoomBox {
  id: string;
  label: string;
  /** Interior bounding box over all parts, absolute meters. */
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Disjoint axis-aligned rectangles whose union is the room interior.
   * Single-part rooms have exactly one entry equal to the bbox; `extend`
   * statements append parts (L/T/U-shaped rooms).
   */
  parts: RectM[];
  /** Pre-formatted area text ("21.8 m²" / "235 sq ft"). */
  areaText: string;
  /** Interior area in m². */
  areaM2: number;
  fill?: string;
  nolabel: boolean;
}

/**
 * A resolved opening on a wall line. `vertical` walls run along y (the gap
 * spans `lo..hi` in y at `x`); horizontal walls run along x at `y`.
 * `inward` is the final door-arc direction (+1/-1 along the perpendicular
 * axis): into the owning room, flipped when `swing out`.
 */
export interface OpeningGeom {
  kind: OpeningKind;
  doorType: DoorType;
  windowType: WindowType;
  vertical: boolean;
  /** Wall centerline coordinate (x if vertical, y if horizontal). */
  along: number;
  /** Gap extents along the wall axis. */
  lo: number;
  hi: number;
  inward: 1 | -1;
  hinge: DoorHinge;
  /** Room index on the negative side of the wall (toward -inward… see renderer). */
  negRoom?: number;
  /** Room index on the positive side. */
  posRoom?: number;
  /** Index of the owning room (swing target). */
  owner: number;
}

export interface ItemGeom {
  type: FurnitureType;
  /** Nominal box, absolute meters (pre-rotation). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Rotation degrees clockwise about the box center. */
  rotate: number;
  label?: string;
  /** Per-seat occupant names, mapped to auto-seated chairs in placement order. */
  seats?: string[];
  roomId: string;
  /** Sequence number within its type (for warning messages: "round-table-8 #4"). */
  seq: number;
}

export interface DimLineGeom {
  vertical: boolean;
  /** Line position: y for horizontal dims, x for vertical dims (meters). */
  at: number;
  lo: number;
  hi: number;
  label: string;
  /** Per-room segment dims render smaller than overall dims. */
  minor: boolean;
}

/** Interior seam between two parts of the same room — punched out of the wall bands. */
export interface SeamGeom {
  vertical: boolean;
  along: number;
  lo: number;
  hi: number;
  /** Index into `rooms`. */
  room: number;
}

export interface FloorplanLayoutResult {
  title: string;
  unit: FloorplanUnit;
  /** Compass rotation in degrees when the plan declares `north`. */
  north?: number;
  rooms: RoomBox[];
  seams: SeamGeom[];
  openings: OpeningGeom[];
  items: ItemGeom[];
  dims: DimLineGeom[];
  /** Plan bounding box over room exteriors (meters, before dim/padding bands). */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Wall band thickness (meters). */
  wallT: number;
  /** Total interior area, m². */
  totalAreaM2: number;
  /** Blocking problems (§6: room overlap, non-adjacent door, out-of-room furniture). */
  errors: string[];
  /** Non-blocking problems (§6: furniture collision, clamped opening). */
  warnings: string[];
  /** Indices into `items` flagged by collision warnings (renderer highlights them). */
  warnItems: number[];
}

// ─── Symbol catalog contract ─────────────────────────────────────

/** px converter: meters → px in the current render scale. */
export type PxFn = (m: number) => number;

export interface SymbolDrawCtx {
  /** Box size in meters (after explicit size / itemsize overrides). */
  w: number;
  h: number;
  px: PxFn;
  /** Item label, for symbols that render it themselves (stairs UP/DN). */
  label?: string;
  /** Per-seat occupant names for auto-seating tables (§2.5). */
  seats?: string[];
}

export interface SymbolDef {
  /** Default nominal box, meters. */
  w: number;
  h: number;
  /** Symbol renders the label itself (stairs UP/DN) — renderer skips the centered label. */
  consumesLabel?: boolean;
  /**
   * Extra collision envelope beyond the nominal box (meters) — e.g. the
   * chair overhang of a dining table (§6.3: chair-ring envelope, not just
   * the table disc). Order: top, right, bottom, left.
   */
  envelope?: [number, number, number, number];
  /** Floor coverings (rug, dance-floor) underlay other furniture — skip collision. */
  underlay?: boolean;
  /** Draw into a w×h meter box at origin; returns SVG fragment (theme classes only). */
  draw: (ctx: SymbolDrawCtx) => string;
}
