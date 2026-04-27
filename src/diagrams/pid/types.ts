/**
 * P&ID (Piping & Instrumentation Diagram) types.
 * See docs/reference/22-PID-STANDARD.md for the full ISA-5.1 / ISO 10628 spec.
 *
 * MVP scope: ~10 process-equipment types, 5 valve types, 4 instrument-bubble
 * categories, 5 line types, manual left→right placement with Manhattan routing
 * for signal lines.
 */

export type PidDirection = "LR" | "TB";

// ── Equipment ────────────────────────────────────────────────

export type PidEquipType =
  // Process equipment
  | "tank_atm"
  | "tank_cone_roof"
  | "vessel_v"
  | "vessel_h"
  | "sphere"
  | "column_tray"
  | "column_packed"
  | "hx_shell_tube"
  | "hx_air_cooled"
  | "reboiler"
  | "condenser"
  | "pump_centrifugal"
  | "pump_pd"
  | "compressor"
  | "blower"
  | "reactor_cstr"
  | "reactor_pfr"
  | "filter"
  | "cyclone"
  | "flare"
  | "cooling_tower"
  // Valves (in-line)
  | "valve_gate"
  | "valve_ball"
  | "valve_globe"
  | "valve_butterfly"
  | "valve_check"
  | "valve_control"
  | "valve_psv";

export interface PidEquipment {
  id: string;
  equipType: PidEquipType;
  /** Display tag (e.g. "P-101" or "Feed Tank") */
  tag?: string;
  attrs: Record<string, string>;
}

// ── Lines ────────────────────────────────────────────────────

export type PidLineType =
  | "process"
  | "process_minor"
  | "pneumatic"
  | "electric"
  | "hydraulic"
  | "capillary"
  | "software"
  | "mechanical";

export interface PidLine {
  id: string;
  from: PidAnchor;
  to: PidAnchor;
  lineType: PidLineType;
  /** Tag like `4"-PG-101-A1B` */
  tag?: string;
  /** Pipe size like `4"` */
  size?: string;
  service?: string;
  attrs: Record<string, string>;
}

/** Anchor refers to either an equipment+port or an instrument tag (or a virtual external label). */
export interface PidAnchor {
  /** Equipment id, instrument tag, or special label like "feed" / "dest" */
  id: string;
  /** Optional port — "in", "out", "top", "bottom", "left", "right", "feed", "reflux", etc. */
  port?: string;
}

// ── Instruments ──────────────────────────────────────────────

export type PidInstrumentCategory =
  | "field_discrete"
  | "field_shared"
  | "field_computer"
  | "field_plc"
  | "cr_discrete"
  | "cr_shared"
  | "cr_computer"
  | "cr_plc"
  | "local_discrete"
  | "local_shared";

export interface PidInstrument {
  /** Tag like "FT-101", "FIC-201" */
  tag: string;
  category: PidInstrumentCategory;
  /** Equipment id or line id this instrument measures (optional). */
  measures?: string;
  /** Equipment id (a valve) this instrument controls. */
  controls?: string;
  attrs: Record<string, string>;
}

// ── AST root ─────────────────────────────────────────────────

export interface PidAST {
  type: "pid";
  title?: string;
  direction: PidDirection;
  equipment: PidEquipment[];
  lines: PidLine[];
  instruments: PidInstrument[];
  metadata?: Record<string, string>;
}

// ── Layout types ─────────────────────────────────────────────

export interface PidLayoutEquipment {
  equip: PidEquipment;
  /** Top-left of bounding box */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Center coords */
  cx: number;
  cy: number;
  /** Map of port-name → absolute coordinates */
  ports: Record<string, { x: number; y: number }>;
}

export interface PidLayoutInstrument {
  inst: PidInstrument;
  /** Center of the bubble */
  cx: number;
  cy: number;
  /** Bubble radius (for layout, all bubbles use the same radius) */
  r: number;
}

export interface PidLayoutLine {
  line: PidLine;
  /** SVG path d= */
  path: string;
  /** Mid-point for the line tag (if any) */
  midX: number;
  midY: number;
}

export interface PidLayoutResult {
  width: number;
  height: number;
  equipment: PidLayoutEquipment[];
  instruments: PidLayoutInstrument[];
  lines: PidLayoutLine[];
  title?: string;
}
