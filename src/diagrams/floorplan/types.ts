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

import type { LegendOverrides, LegendSpec } from "../../core/types";

// ─── Enums ───────────────────────────────────────────────────────

export type FloorplanUnit = "m" | "ft";

/** Document-wide electrical overlay convention. */
export type ElectricalSymbolStandard = "nec" | "iec";

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
export type ArrayPlacement = "centers" | "within";
export type FloorplanLabelRole = "normal" | "primary" | "secondary" | "hidden";

export type CompliancePolicy = "iso" | "nfpa" | "uae";

export type EvacuationSheetSize =
  | "a4"
  | "a3"
  | "a2"
  | "letter"
  | "tabloid";

export type EvacuationSheetOrientation = "landscape" | "portrait";

/** Coordinate-based safety signs. Door ratings are separate structural marks. */
export const SAFETY_KINDS = [
  "here",
  "exit",
  "exit-direction",
  "exit-final",
  "assembly",
  "refuge",
  "shelter",
  "first-aid",
  "aed",
  "stretcher",
  "doctor",
  "eyewash",
  "safety-shower",
  "emergency-phone",
  "break-glass",
  "escape-ladder",
  "rescue-window",
  "emergency-door-push",
  "emergency-door-slide",
  "extinguisher",
  "hose-reel",
  "fire-ladder",
  "fire-equipment",
  "call-point",
  "fire-phone",
  "riser",
  "not-an-exit",
  "no-elevator",
  "alarm-sounder",
] as const;

export type SafetyKind = (typeof SAFETY_KINDS)[number];

/** Common author vocabulary normalized to the standards-oriented DSL keys. */
export const SAFETY_ALIASES = {
  "you-are-here": "here",
  "location-marker": "here",
  "emergency-exit": "exit",
  "fire-exit": "exit",
  "exit-arrow": "exit-direction",
  "direction-arrow": "exit-direction",
  "escape-direction": "exit-direction",
  "assembly-point": "assembly",
  "muster-point": "assembly",
  muster: "assembly",
  firstaid: "first-aid",
  "first-aid-kit": "first-aid",
  defibrillator: "aed",
  "automated-external-defibrillator": "aed",
  "fire-extinguisher": "extinguisher",
  "fire-alarm": "call-point",
  "fire-alarm-call-point": "call-point",
  "alarm-call-point": "call-point",
  "fire-hose-reel": "hose-reel",
} as const satisfies Readonly<Record<string, SafetyKind>>;

export type SafetyAlias = keyof typeof SAFETY_ALIASES;
export type SafetyName = SafetyKind | SafetyAlias;

export const SAFETY_NAMES = [
  ...SAFETY_KINDS,
  ...Object.keys(SAFETY_ALIASES),
] as const;

export function resolveSafetyKind(value: string): SafetyKind | undefined {
  if ((SAFETY_KINDS as readonly string[]).includes(value)) {
    return value as SafetyKind;
  }
  return SAFETY_ALIASES[value as SafetyAlias];
}

export type SafetyColour =
  | "safe"
  | "fire"
  | "mandatory"
  | "warning"
  | "neutral";

export type EscapeRouteKind =
  | "primary"
  | "secondary"
  | "accessible"
  | "rescue";

/**
 * Live-sound stage equipment. `stage-riser` is deliberately namespaced:
 * evacuation mode already uses bare `riser` for a fire-service riser sign.
 * Stage mode accepts `riser` as a parser alias but stores this canonical key.
 */
export const STAGE_EQUIPMENT_KINDS = [
  "drum-kit",
  "guitar-amp",
  "bass-amp",
  "keyboard",
  "bass-cabinet",
  "boom-stand",
  "straight-stand",
  "drum-mic",
  "overhead",
  "di-box",
  "mixer",
  "foh-console",
  "snake",
  "monitor-wedge",
  "side-fill",
  "iem",
  "power-drop",
  "stage-riser",
  "music-stand",
  "set-list",
  // Reused from the floorplan catalog; no duplicate line art.
  "stage",
  "dance-floor",
  "dj-booth",
  "podium",
  "row-chairs",
  "piano",
] as const;

export type StageEquipmentKind = (typeof STAGE_EQUIPMENT_KINDS)[number];

export type StageStandType =
  | "boom"
  | "straight"
  | "short-boom"
  | "clip"
  | "none";

/** One level in a multi-floor plan set (§48.2.5). */
export interface FloorplanFloor {
  level: number;
  label: string;
  line?: number;
}

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
  | "bench"
  | "beanbag"
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
  | "teacher-desk"
  | "desk-l"
  | "chair"
  | "easel"
  | "whiteboard"
  | "smartboard"
  | "bookcase"
  | "cubbies"
  | "filing-cabinet"
  | "lockers"
  | "toy-box"
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
  | "grill"
  // electrical overlay fixtures
  | "outlet"
  | "duplex-outlet"
  | "switch"
  | "switch-3way"
  | "switch-4way"
  | "switch-dimmer"
  | "gfci-outlet"
  | "outlet-240v"
  | "floor-outlet"
  | "weatherproof-outlet"
  | "light"
  | "ceiling-light"
  | "recessed-light"
  | "wall-light"
  | "pendant-light"
  | "fluorescent-light"
  | "emergency-light"
  | "smoke-detector"
  | "thermostat"
  | "motion-sensor"
  | "data-outlet"
  | "tv-outlet"
  | "phone-outlet"
  | "junction-box"
  | "electrical-panel"
  | "distribution-board"
  // site / outdoor
  | "fountain"
  | "tree"
  | "car";

// ─── AST ─────────────────────────────────────────────────────────

export interface FloorplanRoom {
  id: string;
  /** Display label; falls back to id. */
  label: string;
  labelSourceRange?: import("../../core/types").SourceRange;
  /** Absolute placement in input units (mutually exclusive with `rel`). */
  at?: { x: number; y: number };
  positionSourceRange?: import("../../core/types").SourceRange;
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
  sizeSourceRange?: import("../../core/types").SourceRange;
  /** Optional floor fill (CSS color); rendered as a presentational attribute. */
  fill?: string;
  /** Suppress the centered name + area label (single-space plans). */
  nolabel?: boolean;
  /** Semantic typographic hierarchy; avoids authoring renderer-specific font sizes. */
  labelRole?: FloorplanLabelRole;
  /** Owning floor level; statements outside a floor section use level 0. */
  floor: number;
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
  floor: number;
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
  floor: number;
  line?: number;
}

export interface FloorplanFurniture {
  type: FurnitureType;
  /** Shared stairs id across floors; absent for anonymous furniture. */
  instanceId?: string;
  /** Containing room id (required for placement). */
  room?: string;
  /** Position relative to the room's interior origin (top-left), input units. */
  x: number;
  y: number;
  /** Wall-mounted fixtures resolve from an exterior wall segment, not a guessed x/y. */
  anchor?: { side: WallSide; pct: number };
  /** Explicit size in input units; omitted → catalog default (meters). */
  size?: { w: number; h: number };
  /** Rotation in degrees, clockwise, around the symbol center. */
  rotate: number;
  label?: string;
  labelSourceRange?: import("../../core/types").SourceRange;
  /** Exact source range of the coordinate token following `at`. */
  positionSourceRange?: import("../../core/types").SourceRange;
  /**
   * Per-seat occupant names (`seats "Alice" "Bob" …`) for tables that
   * auto-seat chairs (round/banquet/conference/dining/head tables). Names map
   * to chairs in placement order; extra chairs render empty, extra names are
   * ignored. Turns a venue plan into an actual seating chart (§2.5).
   */
  seats?: string[];
  floor: number;
  line?: number;
}

/** A switch/sensor-to-luminaire control annotation, resolved by instance id. */
export interface FloorplanControl {
  source: string;
  targets: string[];
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
  /** `centers` preserves explicit first/last centers; `within` treats p1/p2 as hard bounds. */
  placement: ArrayPlacement;
  /** Minimum clear gap between nominal item footprints, in input units. */
  gap: number;
  itemsize?: { w: number; h: number };
  rotate: number;
  /** Arc mode only. */
  center?: { x: number; y: number };
  radius?: number;
  fromDeg?: number;
  toDeg?: number;
  floor: number;
  line?: number;
}

export interface FloorplanZone {
  id: string;
  label: string;
  room: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Protected zones are validation geometry, not collision-ignored underlays. */
  keepClear: boolean;
  floor: number;
  line?: number;
}

export interface SafetySymbolAst {
  kind: SafetyKind;
  id: string;
  /** Containing room for room-relative coordinates. */
  room?: string;
  /** Exterior positions use plan-absolute input coordinates. */
  outside: boolean;
  x: number;
  y: number;
  side?: WallSide;
  hand?: "left" | "right";
  rotate: number;
  fireClass?: string;
  label?: string;
  floor: number;
  line?: number;
}

export interface EscapeRouteAst {
  id: string;
  kind: EscapeRouteKind;
  anchors: string[];
  label?: string;
  floor: number;
  line?: number;
}

export interface FireDoorMarkAst {
  kind: "fire-door" | "smoke-door";
  room?: string;
  side?: WallSide;
  pct?: number;
  between?: [string, string];
  rating?: string;
  floor: number;
  line?: number;
}

export interface StageEquipmentAst {
  kind: StageEquipmentKind;
  /** Stable id used by signal paths. */
  id: string;
  /** Containing stage/room for room-relative coordinates. */
  room?: string;
  /** Absolute plan coordinates rather than room-relative coordinates. */
  outside: boolean;
  x: number;
  y: number;
  size?: { w: number; h: number };
  rotate: number;
  label?: string;
  /** Mixer input channel. Presence derives one input-list row. */
  channel?: number;
  /** Instrument/person/source shown in the input list. */
  source?: string;
  /** Suggested microphone or DI model. */
  model?: string;
  stand?: StageStandType;
  phantom: boolean;
  notes?: string;
  /** Monitor mix/send number; required for wedges. */
  mix?: number;
  floor: number;
  line?: number;
}

export interface StageSignalPathAst {
  id: string;
  anchors: string[];
  label?: string;
  floor: number;
  line?: number;
}

export interface StageplotDocumentMeta {
  venue?: string;
  showDate?: string;
  revision?: string;
  technicalContact?: string;
}

export interface StageplotAstData {
  equipment: StageEquipmentAst[];
  signals: StageSignalPathAst[];
  document: StageplotDocumentMeta;
  /** The derived table is visible by default. */
  showInputList: boolean;
  /** The derived monitor/output schedule is visible by default. */
  showOutputList: boolean;
  /** Patch routes are opt-in so placement remains dominant. */
  showSignalPaths: boolean;
}

export interface FloorplanAst {
  type: "floorplan";
  mode: "floorplan" | "evacuation" | "stageplot";
  title: string;
  titleSourceRange?: import("../../core/types").SourceRange;
  unit: FloorplanUnit;
  symbols: ElectricalSymbolStandard;
  floors: FloorplanFloor[];
  stack: "horizontal" | "vertical";
  /** `north` statement: draw a compass; value = clockwise rotation in degrees (0 = up). */
  north?: number;
  rooms: FloorplanRoom[];
  extensions: FloorplanExtend[];
  openings: FloorplanOpening[];
  furniture: FloorplanFurniture[];
  controls: FloorplanControl[];
  arrays: FloorplanArray[];
  zones: FloorplanZone[];
  compliance: CompliancePolicy;
  sheet: {
    size: EvacuationSheetSize;
    orientation: EvacuationSheetOrientation;
  };
  safety: SafetySymbolAst[];
  routes: EscapeRouteAst[];
  fireDoors: FireDoorMarkAst[];
  /** Furniture remains in the AST; evacuation rendering hides it by default. */
  showFurniture: boolean;
  legendOverrides: LegendOverrides;
  stageplot: StageplotAstData;
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
  labelSourceRange?: import("../../core/types").SourceRange;
  sizeSourceRange?: import("../../core/types").SourceRange;
  sourceW?: number;
  sourceH?: number;
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
  labelRole: FloorplanLabelRole;
  positionMode: "free" | "move-x" | "move-y";
  floor: number;
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
  labelSourceRange?: import("../../core/types").SourceRange;
  positionSourceRange?: import("../../core/types").SourceRange;
  /** Authored room-local coordinates in the plan's input unit. */
  sourceX?: number;
  sourceY?: number;
  sourceLine?: number;
  instanceId?: string;
  /** Source array line groups collision diagnostics without N² pair noise. */
  arrayGroup?: number;
  /** Wall-mounted fixtures remain distinguishable in the scene model. */
  anchored?: boolean;
  /** Per-seat occupant names, mapped to auto-seated chairs in placement order. */
  seats?: string[];
  roomId: string;
  floor: number;
  /** Sequence number within its type (for warning messages: "round-table-8 #4"). */
  seq: number;
}

/** Resolved item indices for one switch/sensor-to-luminaire control curve. */
export interface ControlGeom {
  source: number;
  target: number;
  sourceId: string;
  targetId: string;
}

export interface ZoneGeom {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  keepClear: boolean;
  roomId: string;
  floor: number;
  sourceLine?: number;
}

export type FloorplanDiagnosticPhase =
  | "document"
  | "placement"
  | "topology"
  | "geometry"
  | "capability";

export interface FloorplanGeometryDiagnostic {
  severity: "error" | "warning";
  code: string;
  phase: FloorplanDiagnosticPhase;
  message: string;
  line?: number;
  floor?: number;
  entityIds?: string[];
  hint?: string;
}

export interface SafetySymbolGeom {
  kind: SafetyKind;
  id: string;
  x: number;
  y: number;
  /** Real-world footprint derived from fixed printed millimetres × scale. */
  sizeM: number;
  sheetMm: number;
  code: string;
  colour: SafetyColour;
  hand: "left" | "right";
  rotate: number;
  label?: string;
  fireClass?: string;
  roomId?: string;
  floor: number;
  auto?: boolean;
}

export interface RoutePoint {
  x: number;
  y: number;
}

export interface RouteGeom {
  id: string;
  kind: EscapeRouteKind;
  points: RoutePoint[];
  chevrons: Array<RoutePoint & { deg: number }>;
  roomSequence: string[];
  startAnchor: string;
  endAnchor: string;
  label?: string;
  floor: number;
}

export interface FireDoorGeom {
  kind: FireDoorMarkAst["kind"];
  opening: number;
  rating?: string;
  floor: number;
}

export interface EvacuationScale {
  denominator: number;
  sheet: EvacuationSheetSize;
  orientation: EvacuationSheetOrientation;
  printableMm: { w: number; h: number };
  symbolMm: number;
  compliant: boolean;
  note: string;
}

export interface EvacuationLayoutData {
  profile: CompliancePolicy;
  scale: EvacuationScale;
  symbols: SafetySymbolGeom[];
  routes: RouteGeom[];
  fireDoors: FireDoorGeom[];
  legend: LegendSpec;
  showFurniture: boolean;
  notes: string[];
}

export interface StageInputRow {
  channel: number;
  source: string;
  model: string;
  position: string;
  stand: StageStandType;
  phantom: boolean;
  notes: string;
}

export type StageOutputType = "WEDGE" | "IEM" | "SIDE FILL";

export interface StageOutputRow {
  mix: number;
  destination: string;
  type: StageOutputType;
  quantity: number;
  position: string;
  notes: string;
}

export interface StageEquipmentGeom {
  kind: StageEquipmentKind;
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  label?: string;
  channel?: number;
  source?: string;
  model?: string;
  stand: StageStandType;
  phantom: boolean;
  notes?: string;
  mix?: number;
  roomId?: string;
  floor: number;
}

export interface StageSignalPathGeom {
  id: string;
  points: RoutePoint[];
  anchors: string[];
  label?: string;
  floor: number;
}

export interface StageplotLayoutData {
  equipment: StageEquipmentGeom[];
  signals: StageSignalPathGeom[];
  inputList: StageInputRow[];
  outputList: StageOutputRow[];
  document: StageplotDocumentMeta;
  showInputList: boolean;
  showOutputList: boolean;
  showSignalPaths: boolean;
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
  titleSourceRange?: import("../../core/types").SourceRange;
  unit: FloorplanUnit;
  symbols: ElectricalSymbolStandard;
  mode: FloorplanAst["mode"];
  /** Compass rotation in degrees when the plan declares `north`. */
  north?: number;
  rooms: RoomBox[];
  seams: SeamGeom[];
  openings: OpeningGeom[];
  items: ItemGeom[];
  controls: ControlGeom[];
  zones: ZoneGeom[];
  dims: DimLineGeom[];
  /** Per-floor grouping and local bounds. A legacy single plan has one level-0 plate. */
  plates: FloorPlate[];
  /** Plan bounding box over room exteriors (meters, before dim/padding bands). */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Wall band thickness (meters). */
  wallT: number;
  /** Total interior area, m². */
  totalAreaM2: number;
  /** Blocking structural problems (§6: room overlap, non-adjacent door). */
  errors: string[];
  /** Non-blocking problems (§6: furniture overshoot/collision, clamped opening). */
  warnings: string[];
  /** Authoritative structured diagnostics; errors/warnings are compatibility views. */
  diagnostics: FloorplanGeometryDiagnostic[];
  /** Indices into `items` flagged by collision warnings (renderer highlights them). */
  warnItems: number[];
  evacuation?: EvacuationLayoutData;
  stageplot?: StageplotLayoutData;
}

export interface FloorPlate {
  level: number;
  label: string;
  offset: { x: number; y: number };
  /** Local bounds before the plate offset is applied. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  areaM2: number;
  areaText: string;
  roomIdx: number[];
  itemIdx: number[];
  zoneIdx: number[];
  openingIdx: number[];
  dimIdx: number[];
  seamIdx: number[];
}

// ─── Symbol catalog contract ─────────────────────────────────────

/** px converter: meters → px in the current render scale. */
export type PxFn = (m: number) => number;

export interface SymbolDrawCtx {
  /** Box size in meters (after explicit size / itemsize overrides). */
  w: number;
  h: number;
  px: PxFn;
  /** Document-wide electrical symbol convention. */
  symbols: ElectricalSymbolStandard;
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
  /** Glyph is authored with its wall-facing edge toward north and rotates with an anchored wall side. */
  directional?: boolean;
  /** Draw into a w×h meter box at origin; returns SVG fragment (theme classes only). */
  draw: (ctx: SymbolDrawCtx) => string;
}

export interface SafetyDrawCtx {
  hand: "left" | "right";
  profile: CompliancePolicy;
}

export interface SafetySymbolDef {
  /** Printed size in millimetres, never a real-world metre box. */
  sheetMm: number;
  /** ISO/NFPA identity reference; empty when no registered code applies. */
  code: string;
  colour: SafetyColour;
  /** Draw original line art in a fixed 24×24 viewBox. */
  draw: (ctx: SafetyDrawCtx) => string;
}
