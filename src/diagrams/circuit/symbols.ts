/**
 * Circuit schematic symbol library.
 *
 * Each symbol is defined in RIGHTWARD orientation (direction="right"):
 *   - `start` anchor at (0, 0) — where the previous component's end connects in
 *   - `end` anchor at (length, 0) — where the next component's start attaches
 *   - Other named anchors (plus/minus/out/base/collector/emitter/wiper/gate/…)
 *
 * When the component is placed with a different direction, the renderer applies
 * an SVG rotation transform around (0,0) and the layout rotates the anchor
 * coordinates accordingly.
 */
import type { CircuitComponentType } from "../../core/types";
import { estimateTextWidth } from "../../core/text-metrics";

export interface PinAnchor {
  x: number;
  y: number;
}

export interface SymbolDef {
  /** Length along the direction axis, used to compute next cursor position. */
  length: number;
  /** Anchor map in rightward orientation. MUST include start + end. */
  anchors: Record<string, PinAnchor>;
  /** Canonical netlist pin order; falls back to start/end for two-terminal symbols. */
  netlistPins?: string[];
  /** Pins that are valid when intentionally left open (for example a flasher's pilot output). */
  optionalNetlistPins?: string[];
  /** Per-symbol adjustment for the renderer-owned component label. */
  labelOffset?: { dx?: number; dy?: number };
  /** SVG fragment drawn from (0,0); caller wraps in <g transform="translate()+rotate()">. */
  svg: (label?: string, value?: string, attrs?: Record<string, string>) => string;
}

// ─── Drawing helpers ────────────────────────────────────────────

const BODY = 'class="schematex-circuit-body"';
const FILL = 'class="schematex-circuit-fill"';
const WIRE = 'class="schematex-circuit-wire"';

function lineWire(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${WIRE}/>`;
}

// ─── Passive ──────────────────────────────────────────────────

const resistor: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    `<path d="M 0,0 L 5,0 L 8,-8 L 12,8 L 16,-8 L 20,8 L 24,-8 L 28,8 L 32,-8 L 35,0 L 40,0" ${BODY}/>`,
};

const capacitor: SymbolDef = {
  length: 20,
  anchors: { start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<line x1="8" y1="-10" x2="8" y2="10" ${BODY}/>`,
      `<line x1="12" y1="-10" x2="12" y2="10" ${BODY}/>`,
      lineWire(12, 0, 20, 0),
    ].join(""),
};

const electrolytic_cap: SymbolDef = {
  length: 20,
  anchors: { start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<line x1="8" y1="-10" x2="8" y2="10" ${BODY}/>`,
      `<path d="M 12,-10 Q 16,0 12,10" fill="none" class="schematex-circuit-body"/>`,
      lineWire(12, 0, 20, 0),
      `<text x="5" y="-12" class="schematex-circuit-pol">−</text>`,
      `<text x="15" y="-12" class="schematex-circuit-pol">+</text>`,
    ].join(""),
};

const inductor: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    `<path d="M 0,0 L 5,0 A 5,5 0 0 1 15,0 A 5,5 0 0 1 25,0 A 5,5 0 0 1 35,0 L 40,0" fill="none" ${BODY}/>`,
};

const fuse: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 5, 0),
      `<rect x="5" y="-5" width="20" height="10" rx="5" fill="none" ${BODY}/>`,
      `<line x1="5" y1="0" x2="25" y2="0" ${BODY}/>`,
      lineWire(25, 0, 30, 0),
    ].join(""),
};

const crystal: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<line x1="10" y1="-9" x2="10" y2="9" ${BODY}/>`,
      `<rect x="14" y="-7" width="12" height="14" fill="none" ${BODY}/>`,
      `<line x1="30" y1="-9" x2="30" y2="9" ${BODY}/>`,
      lineWire(30, 0, 40, 0),
    ].join(""),
};

const transformer: SymbolDef = {
  length: 60,
  netlistPins: ["p1", "p2", "s1", "s2"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 60, y: 0 },
    p1: { x: 0, y: 0 },
    p2: { x: 0, y: 0 },
    s1: { x: 60, y: 0 },
    s2: { x: 60, y: 0 },
  },
  svg: () =>
    [
      // Primary coils (left)
      `<path d="M 5,-18 A 5,5 0 0 1 5,-8 A 5,5 0 0 1 5,2 A 5,5 0 0 1 5,12 A 5,5 0 0 1 5,22" fill="none" ${BODY}/>`,
      lineWire(0, 0, 5, 0),
      // Core lines
      `<line x1="28" y1="-20" x2="28" y2="22" ${BODY}/>`,
      `<line x1="32" y1="-20" x2="32" y2="22" ${BODY}/>`,
      // Secondary coils (right)
      `<path d="M 55,-18 A 5,5 0 0 0 55,-8 A 5,5 0 0 0 55,2 A 5,5 0 0 0 55,12 A 5,5 0 0 0 55,22" fill="none" ${BODY}/>`,
      lineWire(55, 0, 60, 0),
    ].join(""),
};

// ─── Sources ──────────────────────────────────────────────────

const voltage_source: SymbolDef = {
  length: 40,
  netlistPins: ["plus", "minus"],
  // plus/minus aliases: end = +, start = − (matches on-symbol label)
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: 0 },
    minus: { x: 0, y: 0 },
    plus: { x: 40, y: 0 },
  },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<circle cx="20" cy="0" r="12" fill="white" ${BODY}/>`,
      `<text x="16" y="-2" class="schematex-circuit-pol">+</text>`,
      `<text x="23" y="8" class="schematex-circuit-pol">−</text>`,
      lineWire(32, 0, 40, 0),
    ].join(""),
};

const current_source: SymbolDef = {
  length: 40,
  netlistPins: ["plus", "minus"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: 0 },
    minus: { x: 0, y: 0 },
    plus: { x: 40, y: 0 },
  },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<circle cx="20" cy="0" r="12" fill="white" ${BODY}/>`,
      `<line x1="14" y1="0" x2="24" y2="0" ${BODY}/>`,
      `<polygon points="26,0 20,-4 20,4" ${FILL}/>`,
      lineWire(32, 0, 40, 0),
    ].join(""),
};

const ac_source: SymbolDef = {
  length: 40,
  netlistPins: ["plus", "minus"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: 0 },
    minus: { x: 0, y: 0 },
    plus: { x: 40, y: 0 },
  },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<circle cx="20" cy="0" r="12" fill="white" ${BODY}/>`,
      `<path d="M 14,0 Q 17,-6 20,0 Q 23,6 26,0" fill="none" ${BODY}/>`,
      lineWire(32, 0, 40, 0),
    ].join(""),
};

const battery: SymbolDef = {
  length: 24,
  netlistPins: ["plus", "minus"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 24, y: 0 },
    minus: { x: 0, y: 0 },
    plus: { x: 24, y: 0 },
  },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<line x1="8" y1="-8" x2="8" y2="8" ${BODY}/>`,
      `<line x1="12" y1="-4" x2="12" y2="4" ${BODY}/>`,
      `<line x1="14" y1="-8" x2="14" y2="8" ${BODY}/>`,
      `<line x1="18" y1="-4" x2="18" y2="4" ${BODY}/>`,
      lineWire(18, 0, 24, 0),
    ].join(""),
};

// IEC 60617 photovoltaic cell: cell plates with incident-light arrows.
const solar_cell: SymbolDef = {
  length: 36,
  netlistPins: ["plus", "minus"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 36, y: 0 },
    minus: { x: 0, y: 0 },
    plus: { x: 36, y: 0 },
  },
  svg: () => [
    lineWire(0, 0, 10, 0),
    `<line x1="10" y1="-10" x2="10" y2="10" ${BODY}/>` ,
    `<line x1="15" y1="-7" x2="15" y2="7" ${BODY}/>` ,
    lineWire(15, 0, 36, 0),
    `<path d="M 25,-20 L 18,-13 M 18,-17 L 18,-13 L 22,-13" fill="none" ${BODY}/>` ,
    `<path d="M 34,-20 L 27,-13 M 27,-17 L 27,-13 L 31,-13" fill="none" ${BODY}/>` ,
  ].join(""),
};

const ground: SymbolDef = {
  length: 20,
  anchors: { start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
  // Drawn as a "terminal" — vertical connection at start, earth lines below
  svg: () =>
    [
      `<line x1="0" y1="0" x2="10" y2="0" ${WIRE}/>`,
      `<line x1="10" y1="-8" x2="10" y2="8" ${BODY}/>`,
      `<line x1="6" y1="4" x2="14" y2="4" ${BODY}/>`,
      `<line x1="8" y1="8" x2="12" y2="8" ${BODY}/>`,
    ].join(""),
};

const gnd_signal: SymbolDef = {
  length: 20,
  anchors: { start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
  svg: () =>
    [
      `<line x1="0" y1="0" x2="8" y2="0" ${WIRE}/>`,
      `<polygon points="8,-6 8,6 16,0" ${FILL}/>`,
    ].join(""),
};

const vcc: SymbolDef = {
  length: 20,
  anchors: { start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
  svg: () =>
    [
      `<line x1="0" y1="0" x2="10" y2="0" ${WIRE}/>`,
      `<line x1="4" y1="-6" x2="16" y2="-6" ${BODY}/>`,
    ].join(""),
};

// ─── Diodes ───────────────────────────────────────────────────

const diode: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<polygon points="8,-8 8,8 22,0" ${FILL}/>`,
      `<line x1="22" y1="-8" x2="22" y2="8" ${BODY}/>`,
      lineWire(22, 0, 30, 0),
    ].join(""),
};

const zener: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<polygon points="8,-8 8,8 22,0" ${FILL}/>`,
      `<path d="M 18,-10 L 22,-8 L 22,8 L 26,10" fill="none" ${BODY}/>`,
      lineWire(22, 0, 30, 0),
    ].join(""),
};

const schottky: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<polygon points="8,-8 8,8 22,0" ${FILL}/>`,
      `<path d="M 18,-4 L 18,-8 L 22,-8 L 22,8 L 26,8 L 26,4" fill="none" ${BODY}/>`,
      lineWire(22, 0, 30, 0),
    ].join(""),
};

const led: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<polygon points="8,-8 8,8 22,0" ${FILL}/>`,
      `<line x1="22" y1="-8" x2="22" y2="8" ${BODY}/>`,
      lineWire(22, 0, 30, 0),
      // outward light arrows
      `<path d="M 12,-10 L 20,-18 M 18,-18 L 20,-18 L 20,-16" fill="none" ${BODY}/>`,
      `<path d="M 16,-10 L 24,-18 M 22,-18 L 24,-18 L 24,-16" fill="none" ${BODY}/>`,
    ].join(""),
};

const photodiode: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<polygon points="8,-8 8,8 22,0" ${FILL}/>`,
      `<line x1="22" y1="-8" x2="22" y2="8" ${BODY}/>`,
      lineWire(22, 0, 30, 0),
      // inward light arrows
      `<path d="M 20,-18 L 12,-10 M 12,-12 L 12,-10 L 14,-10" fill="none" ${BODY}/>`,
      `<path d="M 24,-18 L 16,-10 M 16,-12 L 16,-10 L 18,-10" fill="none" ${BODY}/>`,
    ].join(""),
};

// ─── BJT ──────────────────────────────────────────────────────

const npn: SymbolDef = {
  length: 40,
  netlistPins: ["c", "b", "e"],
  // base at left, collector up-right, emitter down-right
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    base: { x: 0, y: 0 },
    collector: { x: 40, y: -16 },
    emitter: { x: 40, y: 16 },
    b: { x: 0, y: 0 },
    c: { x: 40, y: -16 },
    e: { x: 40, y: 16 },
  },
  svg: () =>
    [
      `<circle cx="20" cy="0" r="16" fill="white" ${BODY}/>`,
      `<line x1="14" y1="-10" x2="14" y2="10" ${BODY}/>`,
      lineWire(0, 0, 14, 0),
      `<line x1="14" y1="-6" x2="30" y2="-12" ${BODY}/>`,
      lineWire(30, -12, 40, -16),
      `<line x1="14" y1="6" x2="30" y2="12" ${BODY}/>`,
      lineWire(30, 12, 40, 16),
      // NPN arrow (outward on emitter)
      `<polygon points="30,12 24,10 26,16" ${FILL}/>`,
    ].join(""),
};

const pnp: SymbolDef = {
  length: 40,
  netlistPins: ["c", "b", "e"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    base: { x: 0, y: 0 },
    collector: { x: 40, y: 16 },
    emitter: { x: 40, y: -16 },
    b: { x: 0, y: 0 },
    c: { x: 40, y: 16 },
    e: { x: 40, y: -16 },
  },
  svg: () =>
    [
      `<circle cx="20" cy="0" r="16" fill="white" ${BODY}/>`,
      `<line x1="14" y1="-10" x2="14" y2="10" ${BODY}/>`,
      lineWire(0, 0, 14, 0),
      `<line x1="14" y1="-6" x2="30" y2="-12" ${BODY}/>`,
      lineWire(30, -12, 40, -16),
      `<line x1="14" y1="6" x2="30" y2="12" ${BODY}/>`,
      lineWire(30, 12, 40, 16),
      // PNP arrow (inward on emitter → toward base line)
      `<polygon points="14,-6 20,-4 18,-10" ${FILL}/>`,
    ].join(""),
};

// IEEE 315 thermionic triode: plate, control grid, and cathode in an envelope.
const triode: SymbolDef = {
  length: 48,
  netlistPins: ["plate", "grid", "cathode"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 48, y: -15 },
    plate: { x: 48, y: -15 },
    p: { x: 48, y: -15 },
    grid: { x: 0, y: 0 },
    g: { x: 0, y: 0 },
    cathode: { x: 48, y: 15 },
    k: { x: 48, y: 15 },
  },
  svg: () => [
    `<circle cx="24" cy="0" r="18" fill="white" ${BODY}/>` ,
    lineWire(0, 0, 13, 0),
    `<line x1="18" y1="-11" x2="18" y2="11" stroke-dasharray="2,3" ${BODY}/>` ,
    `<line x1="27" y1="-10" x2="27" y2="10" ${BODY}/>` ,
    `<line x1="34" y1="-9" x2="34" y2="9" ${BODY}/>` ,
    lineWire(34, -9, 48, -15),
    lineWire(27, 10, 48, 15),
  ].join(""),
};

// ─── MOSFET ───────────────────────────────────────────────────

const nmos: SymbolDef = {
  length: 40,
  netlistPins: ["d", "g", "s"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    gate: { x: 0, y: 0 },
    drain: { x: 40, y: -16 },
    source: { x: 40, y: 16 },
    g: { x: 0, y: 0 },
    d: { x: 40, y: -16 },
    s: { x: 40, y: 16 },
  },
  svg: () =>
    [
      lineWire(0, 0, 14, 0),
      `<line x1="14" y1="-12" x2="14" y2="12" ${BODY}/>`,
      `<line x1="18" y1="-10" x2="18" y2="-4" ${BODY}/>`,
      `<line x1="18" y1="-2" x2="18" y2="2" ${BODY}/>`,
      `<line x1="18" y1="4" x2="18" y2="10" ${BODY}/>`,
      `<line x1="18" y1="-8" x2="32" y2="-8" ${BODY}/>`,
      lineWire(32, -8, 40, -16),
      `<line x1="18" y1="8" x2="32" y2="8" ${BODY}/>`,
      lineWire(32, 8, 40, 16),
      `<polygon points="22,0 18,-4 18,4" ${FILL}/>`,
    ].join(""),
};

const pmos: SymbolDef = {
  length: 40,
  netlistPins: ["d", "g", "s"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    gate: { x: 0, y: 0 },
    source: { x: 40, y: -16 },
    drain: { x: 40, y: 16 },
    g: { x: 0, y: 0 },
    s: { x: 40, y: -16 },
    d: { x: 40, y: 16 },
  },
  svg: () =>
    [
      lineWire(0, 0, 14, 0),
      `<line x1="14" y1="-12" x2="14" y2="12" ${BODY}/>`,
      `<line x1="18" y1="-10" x2="18" y2="-4" ${BODY}/>`,
      `<line x1="18" y1="-2" x2="18" y2="2" ${BODY}/>`,
      `<line x1="18" y1="4" x2="18" y2="10" ${BODY}/>`,
      `<line x1="18" y1="-8" x2="32" y2="-8" ${BODY}/>`,
      lineWire(32, -8, 40, -16),
      `<line x1="18" y1="8" x2="32" y2="8" ${BODY}/>`,
      lineWire(32, 8, 40, 16),
      `<polygon points="14,0 18,-4 18,4" ${FILL}/>`,
    ].join(""),
};

const jfet_n: SymbolDef = {
  length: 40,
  netlistPins: ["d", "g", "s"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    gate: { x: 0, y: 0 },
    drain: { x: 40, y: -16 },
    source: { x: 40, y: 16 },
    g: { x: 0, y: 0 },
    d: { x: 40, y: -16 },
    s: { x: 40, y: 16 },
  },
  svg: () =>
    [
      lineWire(0, 0, 14, 0),
      `<line x1="14" y1="-12" x2="14" y2="12" ${BODY}/>`,
      `<line x1="14" y1="-8" x2="32" y2="-8" ${BODY}/>`,
      lineWire(32, -8, 40, -16),
      `<line x1="14" y1="8" x2="32" y2="8" ${BODY}/>`,
      lineWire(32, 8, 40, 16),
      `<polygon points="14,0 10,-4 10,4" ${FILL}/>`,
    ].join(""),
};

const jfet_p: SymbolDef = {
  length: 40,
  netlistPins: ["d", "g", "s"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    gate: { x: 0, y: 0 },
    drain: { x: 40, y: -16 },
    source: { x: 40, y: 16 },
    g: { x: 0, y: 0 },
    d: { x: 40, y: -16 },
    s: { x: 40, y: 16 },
  },
  svg: () =>
    [
      lineWire(0, 0, 14, 0),
      `<line x1="14" y1="-12" x2="14" y2="12" ${BODY}/>`,
      `<line x1="14" y1="-8" x2="32" y2="-8" ${BODY}/>`,
      lineWire(32, -8, 40, -16),
      `<line x1="14" y1="8" x2="32" y2="8" ${BODY}/>`,
      lineWire(32, 8, 40, 16),
      `<polygon points="10,0 14,-4 14,4" ${FILL}/>`,
    ].join(""),
};

// ─── Opamp / Comparator ───────────────────────────────────────

const opamp: SymbolDef = {
  length: 50,
  netlistPins: ["plus", "minus", "out"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 50, y: 0 },
    plus: { x: 0, y: -10 },
    minus: { x: 0, y: 10 },
    out: { x: 50, y: 0 },
    "supply+": { x: 25, y: -20 },
    "supply-": { x: 25, y: 20 },
  },
  svg: () =>
    [
      `<polygon points="0,-20 0,20 50,0" fill="white" ${BODY}/>`,
      `<text x="5" y="-6" class="schematex-circuit-pol">+</text>`,
      `<text x="5" y="14" class="schematex-circuit-pol">−</text>`,
    ].join(""),
};

const comparator: SymbolDef = {
  length: 50,
  netlistPins: ["plus", "minus", "out"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 50, y: 0 },
    plus: { x: 0, y: -10 },
    minus: { x: 0, y: 10 },
    out: { x: 50, y: 0 },
  },
  svg: () =>
    [
      `<polygon points="0,-20 0,20 50,0" fill="white" ${BODY}/>`,
      `<text x="5" y="-6" class="schematex-circuit-pol">+</text>`,
      `<text x="5" y="14" class="schematex-circuit-pol">−</text>`,
      `<circle cx="48" cy="0" r="3" fill="white" ${BODY}/>`,
    ].join(""),
};

// ─── Switches ─────────────────────────────────────────────────

const switch_spst: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<line x1="10" y1="0" x2="30" y2="-10" ${BODY}/>`,
      `<circle cx="10" cy="0" r="2" ${FILL}/>`,
      `<circle cx="30" cy="0" r="2" ${FILL}/>`,
      lineWire(30, 0, 40, 0),
    ].join(""),
};

// IEC 60617 installation-style socket: the open semicircle distinguishes a
// receptacle from a source while retaining explicit line/neutral terminals.
const mains_socket: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<path d="M 10,-10 A 10,10 0 0 1 10,10" fill="white" ${BODY}/>` ,
      `<line x1="10" y1="0" x2="30" y2="0" ${BODY}/>` ,
      `<line x1="30" y1="-8" x2="30" y2="8" ${BODY}/>` ,
      lineWire(30, 0, 40, 0),
    ].join(""),
};

// IEC-style proximity detector: a labeled sensing block with the conventional
// non-contact field arcs. It remains electrically honest as a two-terminal
// catalogue symbol; multi-wire devices should use the generic labeled box.
const proximity_sensor: SymbolDef = {
  length: 54,
  anchors: { start: { x: 0, y: 0 }, end: { x: 54, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<rect x="8" y="-14" width="32" height="28" rx="2" fill="white" ${BODY}/>` ,
      `<path d="M 30,-7 Q 36,0 30,7 M 34,-10 Q 43,0 34,10" fill="none" ${BODY}/>` ,
      `<text x="18" y="4" text-anchor="middle" class="schematex-circuit-pol">PROX</text>`,
      lineWire(40, 0, 54, 0),
    ].join(""),
};

const push_no: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 12, 0),
      lineWire(28, 0, 40, 0),
      `<circle cx="12" cy="0" r="2" ${FILL}/>`,
      `<circle cx="28" cy="0" r="2" ${FILL}/>`,
      `<line x1="12" y1="-4" x2="28" y2="-4" ${BODY}/>`,
      `<line x1="20" y1="-4" x2="20" y2="-12" ${BODY}/>`,
      `<line x1="14" y1="-12" x2="26" y2="-12" ${BODY}/>`,
    ].join(""),
};

// ─── Measurement ──────────────────────────────────────────────

const meterSvg = (letter: string): SymbolDef["svg"] => () =>
  [
    lineWire(0, 0, 8, 0),
    `<circle cx="20" cy="0" r="12" fill="white" ${BODY}/>`,
    `<text x="20" y="4" text-anchor="middle" class="schematex-circuit-meter">${letter}</text>`,
    lineWire(32, 0, 40, 0),
  ].join("");

const ammeter: SymbolDef = { length: 40, anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } }, svg: meterSvg("A") };
const voltmeter: SymbolDef = { length: 40, anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } }, svg: meterSvg("V") };
const wattmeter: SymbolDef = { length: 40, anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } }, svg: meterSvg("W") };
const motor: SymbolDef = { length: 40, anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } }, svg: meterSvg("M") };

// IEC 60617 rotating-machine fan: circle with a three-blade impeller.
const fan: SymbolDef = {
  length: 44,
  anchors: { start: { x: 0, y: 0 }, end: { x: 44, y: 0 } },
  svg: () => [
    lineWire(0, 0, 7, 0),
    `<circle cx="22" cy="0" r="15" fill="white" ${BODY}/>` ,
    `<path d="M 22,0 C 18,-3 16,-10 20,-13 C 24,-10 25,-4 22,0 Z" ${FILL}/>` ,
    `<path d="M 22,0 C 27,-1 33,2 33,7 C 28,9 23,6 22,0 Z" ${FILL}/>` ,
    `<path d="M 22,0 C 21,5 16,10 12,7 C 12,2 16,-1 22,0 Z" ${FILL}/>` ,
    `<circle cx="22" cy="0" r="2" ${FILL}/>` ,
    lineWire(37, 0, 44, 0),
  ].join(""),
};

// ─── Electromechanical / Output devices ───────────────────────

// Lamp / bulb — circle with X through it
const lamp: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<circle cx="20" cy="0" r="12" fill="white" ${BODY}/>`,
      `<line x1="12" y1="-8" x2="28" y2="8" ${BODY}/>`,
      `<line x1="12" y1="8" x2="28" y2="-8" ${BODY}/>`,
      lineWire(32, 0, 40, 0),
    ].join(""),
};

// Buzzer — semicircle (dome)
const buzzer: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<path d="M 8,0 A 12,12 0 0 1 32,0 L 8,0 Z" fill="white" ${BODY}/>`,
      lineWire(32, 0, 40, 0),
    ].join(""),
};

// Speaker — trapezoid/box with cone flare
const speaker: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 6, 0),
      `<rect x="6" y="-8" width="10" height="16" fill="white" ${BODY}/>`,
      `<path d="M 16,-8 L 28,-16 L 28,16 L 16,8 Z" fill="white" ${BODY}/>`,
      lineWire(0, 8, 6, 8),
    ].join(""),
};

// Microphone — circle + vertical bar
const microphone: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<circle cx="20" cy="0" r="12" fill="white" ${BODY}/>`,
      `<line x1="20" y1="-10" x2="20" y2="10" ${BODY}/>`,
      lineWire(32, 0, 40, 0),
    ].join(""),
};

// ─── Variable passives ────────────────────────────────────────

// Rheostat — resistor with a diagonal arrow across it
const rheostat: SymbolDef = {
  length: 50,
  anchors: { start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
  svg: () =>
    [
      `<path d="M 0,0 L 10,0 L 13,-8 L 18,8 L 23,-8 L 28,8 L 33,-8 L 38,8 L 40,0 L 50,0" ${BODY}/>`,
      `<line x1="5" y1="12" x2="45" y2="-12" ${BODY}/>`,
      `<polygon points="45,-12 40,-9 44,-5" ${FILL}/>`,
    ].join(""),
};

// Thermistor — resistor with diagonal line (no arrow) + t° label
const thermistor_ntc: SymbolDef = {
  length: 50,
  anchors: { start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
  svg: () =>
    [
      `<path d="M 0,0 L 10,0 L 13,-8 L 18,8 L 23,-8 L 28,8 L 33,-8 L 38,8 L 40,0 L 50,0" ${BODY}/>`,
      `<line x1="5" y1="10" x2="45" y2="-10" ${BODY}/>`,
      `<text x="40" y="-14" class="schematex-circuit-pol">-t°</text>`,
    ].join(""),
};

const thermistor_ptc: SymbolDef = {
  length: 50,
  anchors: { start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
  svg: () =>
    [
      `<path d="M 0,0 L 10,0 L 13,-8 L 18,8 L 23,-8 L 28,8 L 33,-8 L 38,8 L 40,0 L 50,0" ${BODY}/>`,
      `<line x1="5" y1="10" x2="45" y2="-10" ${BODY}/>`,
      `<text x="40" y="-14" class="schematex-circuit-pol">+t°</text>`,
    ].join(""),
};

// LDR — resistor + two inward light arrows
const ldr: SymbolDef = {
  length: 50,
  anchors: { start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
  svg: () =>
    [
      `<path d="M 0,0 L 10,0 L 13,-8 L 18,8 L 23,-8 L 28,8 L 33,-8 L 38,8 L 40,0 L 50,0" ${BODY}/>`,
      `<circle cx="25" cy="-2" r="14" fill="none" ${BODY}/>`,
      `<path d="M 10,-24 L 18,-16 M 14,-16 L 18,-16 L 18,-20" fill="none" ${BODY}/>`,
      `<path d="M 20,-24 L 28,-16 M 24,-16 L 28,-16 L 28,-20" fill="none" ${BODY}/>`,
    ].join(""),
};

// Variable capacitor
const variable_cap: SymbolDef = {
  length: 24,
  anchors: { start: { x: 0, y: 0 }, end: { x: 24, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<line x1="10" y1="-10" x2="10" y2="10" ${BODY}/>`,
      `<line x1="14" y1="-10" x2="14" y2="10" ${BODY}/>`,
      lineWire(14, 0, 24, 0),
      `<line x1="3" y1="10" x2="21" y2="-12" ${BODY}/>`,
      `<polygon points="21,-12 15,-10 19,-6" ${FILL}/>`,
    ].join(""),
};

// Variable inductor
const variable_inductor: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      `<path d="M 0,0 L 5,0 A 5,5 0 0 1 15,0 A 5,5 0 0 1 25,0 A 5,5 0 0 1 35,0 L 40,0" fill="none" ${BODY}/>`,
      `<line x1="0" y1="10" x2="38" y2="-14" ${BODY}/>`,
      `<polygon points="38,-14 32,-12 36,-8" ${FILL}/>`,
    ].join(""),
};

// ─── Switches (extra) ────────────────────────────────────────

const switch_spdt: SymbolDef = {
  length: 50,
  netlistPins: ["common", "nc", "no"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 50, y: 0 },
    common: { x: 0, y: 0 },
    nc: { x: 50, y: -12 },
    no: { x: 50, y: 12 },
  },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<circle cx="10" cy="0" r="2" ${FILL}/>`,
      `<line x1="10" y1="0" x2="40" y2="-12" ${BODY}/>`,
      `<circle cx="42" cy="-12" r="2" ${FILL}/>`,
      lineWire(42, -12, 50, -12),
      `<circle cx="42" cy="12" r="2" ${FILL}/>`,
      lineWire(42, 12, 50, 12),
    ].join(""),
};

// Maintained SPST contact shown in its normal, closed state (IEC 60617/IEEE 315).
const switch_nc: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () => [
    lineWire(0, 0, 10, 0),
    `<circle cx="10" cy="0" r="2" ${FILL}/>` ,
    `<line x1="10" y1="0" x2="30" y2="0" ${BODY}/>` ,
    `<circle cx="30" cy="0" r="2" ${FILL}/>` ,
    `<line x1="20" y1="-12" x2="20" y2="-3" ${BODY}/>` ,
    `<line x1="14" y1="-12" x2="26" y2="-12" ${BODY}/>` ,
    lineWire(30, 0, 40, 0),
  ].join(""),
};

const switch_spdt_center_off: SymbolDef = {
  length: 54,
  netlistPins: ["common", "left", "right"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 54, y: 0 },
    common: { x: 0, y: 0 },
    left: { x: 54, y: -13 },
    right: { x: 54, y: 13 },
  },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<circle cx="10" cy="0" r="2" ${FILL}/>`,
      `<line x1="10" y1="0" x2="35" y2="0" ${BODY}/>`,
      `<circle cx="44" cy="-13" r="2" ${FILL}/>`,
      lineWire(44, -13, 54, -13),
      `<circle cx="44" cy="13" r="2" ${FILL}/>`,
      lineWire(44, 13, 54, 13),
      `<text x="31" y="-7" class="schematex-circuit-pol">OFF</text>`,
    ].join(""),
};

const automotive_flasher_3pin: SymbolDef = {
  length: 58,
  netlistPins: ["b", "l", "p"],
  optionalNetlistPins: ["p"],
  labelOffset: { dy: -16 },
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 58, y: -11 },
    b: { x: 0, y: 0 },
    l: { x: 58, y: -11 },
    p: { x: 58, y: 11 },
  },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<rect x="10" y="-18" width="38" height="36" rx="4" fill="white" ${BODY}/>`,
      `<path d="M 17,7 L 23,-7 L 29,7 L 35,-7 L 41,7" fill="none" ${BODY}/>`,
      lineWire(48, -11, 58, -11),
      lineWire(48, 11, 58, 11),
      `<text x="12" y="-22" class="schematex-circuit-pol">B</text>`,
      `<text x="43" y="-22" class="schematex-circuit-pol">L</text>`,
      `<text x="43" y="29" class="schematex-circuit-pol">P</text>`,
    ].join(""),
};

const push_nc: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 12, 0),
      lineWire(28, 0, 40, 0),
      `<circle cx="12" cy="0" r="2" ${FILL}/>`,
      `<circle cx="28" cy="0" r="2" ${FILL}/>`,
      `<line x1="10" y1="0" x2="30" y2="0" ${BODY}/>`,
      `<line x1="20" y1="0" x2="20" y2="-10" ${BODY}/>`,
      `<line x1="14" y1="-10" x2="26" y2="-10" ${BODY}/>`,
    ].join(""),
};

// ─── Ground variants ────────────────────────────────────────

const gnd_chassis: SymbolDef = {
  length: 20,
  anchors: { start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
  svg: () =>
    [
      `<line x1="0" y1="0" x2="10" y2="0" ${WIRE}/>`,
      `<line x1="10" y1="-6" x2="10" y2="6" ${BODY}/>`,
      `<line x1="10" y1="6" x2="14" y2="10" ${BODY}/>`,
      `<line x1="10" y1="2" x2="14" y2="6" ${BODY}/>`,
      `<line x1="10" y1="-2" x2="14" y2="2" ${BODY}/>`,
    ].join(""),
};

const gnd_digital: SymbolDef = {
  length: 20,
  anchors: { start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
  svg: () =>
    [
      `<line x1="0" y1="0" x2="10" y2="0" ${WIRE}/>`,
      `<polygon points="8,-6 8,6 16,0" fill="none" ${BODY}/>`,
    ].join(""),
};

// ─── Annotations ─────────────────────────────────────────────

const test_point: SymbolDef = {
  length: 16,
  anchors: { start: { x: 0, y: 0 }, end: { x: 16, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 6, 0),
      `<circle cx="10" cy="0" r="4" fill="white" ${BODY}/>`,
    ].join(""),
};

const no_connect: SymbolDef = {
  length: 0,
  anchors: { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
  svg: () =>
    [
      `<line x1="-5" y1="-5" x2="5" y2="5" ${BODY}/>`,
      `<line x1="5" y1="-5" x2="-5" y2="5" ${BODY}/>`,
    ].join(""),
};

const antenna: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 0, -10),
      `<line x1="0" y1="-10" x2="-10" y2="-24" ${BODY}/>`,
      `<line x1="0" y1="-10" x2="10" y2="-24" ${BODY}/>`,
    ].join(""),
};

// ─── ICs / Generic blocks ────────────────────────────────────

const IC_BODY_W = 80;

/**
 * How wide an IC body must be to hold its own part number, with room for the
 * pin numbers printed inside both edges. Widening is one-directional: a short
 * label keeps the standard body so ordinary schematics do not change shape.
 */
function icBodyWidth(label: string): number {
  if (!label) return IC_BODY_W;
  return Math.max(IC_BODY_W, Math.ceil(estimateTextWidth(label, 12) + 44));
}
const IC_PIN_PITCH = 16;
const GENERIC_IC_LEFT = ["1", "2", "3", "4"];
const GENERIC_IC_RIGHT = ["8", "7", "6", "5"];

interface IcPinSides {
  left: string[];
  right: string[];
}

function pinLabels(value: string | undefined, fallback: string[]): string[] {
  return value === undefined
    ? [...fallback]
    : value.split(",").map((label) => label.trim()).filter(Boolean);
}

function resolveIcPinSides(
  defaultLeft: string[],
  defaultRight: string[],
  attrs?: Record<string, string>
): IcPinSides {
  return {
    left: pinLabels(attrs?.pins_left, defaultLeft),
    right: pinLabels(attrs?.pins_right, defaultRight),
  };
}

export function normalizePinName(label: string, fallback: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || fallback;
}

export function getGenericIcPinSides(attrs?: Record<string, string>): IcPinSides {
  return resolveIcPinSides(GENERIC_IC_LEFT, GENERIC_IC_RIGHT, attrs);
}

function icPinAnchors(
  sides: IcPinSides,
  leftNames?: string[],
  rightNames?: string[],
  bodyW: number = IC_BODY_W
): Record<string, PinAnchor> {
  const rowCount = Math.max(sides.left.length, sides.right.length, 2);
  const bodyH = IC_PIN_PITCH * (rowCount + 1);
  const topY = -bodyH / 2;
  const anchors: Record<string, PinAnchor> = {
    start: { x: 0, y: 0 },
    end: { x: bodyW, y: 0 },
  };

  for (let i = 0; i < sides.left.length; i++) {
    const name = leftNames?.[i] ?? normalizePinName(sides.left[i], `pin_${i + 1}`);
    anchors[name] = { x: -8, y: topY + IC_PIN_PITCH * (i + 1) };
  }
  for (let i = 0; i < sides.right.length; i++) {
    const spicePosition = sides.left.length + sides.right.length - i;
    const name = rightNames?.[i] ?? normalizePinName(sides.right[i], `pin_${spicePosition}`);
    anchors[name] = { x: bodyW + 8, y: topY + IC_PIN_PITCH * (i + 1) };
  }
  return anchors;
}

/**
 * Dual-inline rectangular IC block with per-instance pin labels.
 * `attrs.pins_left` / `attrs.pins_right`: comma-separated pin labels.
 * Total pins determine body height. Left pins are input side (start anchor
 * attaches to pin 1 = top-left).
 */
function icSymbol(
  defaultLeft: string[],
  defaultRight: string[],
  bodyLabel?: string
): SymbolDef {
  return {
    length: IC_BODY_W,
    netlistPins: [],
    anchors: {
      start: { x: 0, y: 0 },
      end: { x: IC_BODY_W, y: 0 },
    },
    svg: (_label?: string, _value?: string, attrs?: Record<string, string>) => {
      const { left, right } = resolveIcPinSides(defaultLeft, defaultRight, attrs);
      const n = Math.max(left.length, right.length, 2);
      const bodyH = IC_PIN_PITCH * (n + 1);
      const topY = -bodyH / 2;
      const parts: string[] = [];
      const labelText = attrs?.ic_label ?? bodyLabel ?? "";
      // The body has to fit its own part number. A fixed width let a label
      // like MAX17048 run out past the pin numbers on both sides, which reads
      // as a broken symbol rather than a long name.
      const bodyW = icBodyWidth(labelText);
      parts.push(`<rect x="0" y="${topY}" width="${bodyW}" height="${bodyH}" fill="white" ${BODY}/>`);
      if (labelText) {
        parts.push(`<text x="${bodyW / 2}" y="3" text-anchor="middle" class="schematex-circuit-meter">${labelText}</text>`);
      }
      for (let i = 0; i < left.length; i++) {
        const y = topY + IC_PIN_PITCH * (i + 1);
        parts.push(`<line x1="-8" y1="${y}" x2="0" y2="${y}" ${WIRE}/>`);
        parts.push(`<text x="4" y="${y + 3}" class="schematex-circuit-pol">${left[i]}</text>`);
      }
      for (let i = 0; i < right.length; i++) {
        const y = topY + IC_PIN_PITCH * (i + 1);
        parts.push(`<line x1="${bodyW}" y1="${y}" x2="${bodyW + 8}" y2="${y}" ${WIRE}/>`);
        parts.push(`<text x="${bodyW - 4}" y="${y + 3}" text-anchor="end" class="schematex-circuit-pol">${right[i]}</text>`);
      }
      return parts.join("");
    },
  };
}

const generic_ic: SymbolDef = icSymbol(
  GENERIC_IC_LEFT,
  GENERIC_IC_RIGHT,
  "IC"
);

/** 555 timer — 8-pin standard pinout */
const timer_555: SymbolDef = (() => {
  const left = ["GND", "TRG", "OUT", "RST"];
  const right = ["VCC", "DIS", "THR", "CTL"];
  const sym = icSymbol(left, right, "555");
  const leftNames = ["gnd", "trg", "out", "rst"];
  const rightNames = ["vcc", "dis", "thr", "ctl"];
  return {
    ...sym,
    anchors: icPinAnchors({ left, right }, leftNames, rightNames),
    netlistPins: ["gnd", "trg", "out", "rst", "ctl", "thr", "dis", "vcc"],
  };
})();

const voltage_regulator: SymbolDef = {
  length: 60,
  netlistPins: ["in", "gnd", "out"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 60, y: 0 },
    in: { x: 0, y: 0 },
    out: { x: 60, y: 0 },
    gnd: { x: 30, y: 20 },
  },
  svg: (_l?: string, _v?: string, attrs?: Record<string, string>) =>
    [
      lineWire(0, 0, 10, 0),
      `<rect x="10" y="-15" width="40" height="30" fill="white" ${BODY}/>`,
      `<text x="30" y="4" text-anchor="middle" class="schematex-circuit-meter">${attrs?.model ?? "REG"}</text>`,
      lineWire(50, 0, 60, 0),
      lineWire(30, 15, 30, 20),
    ].join(""),
};

// ─── Potentiometer ────────────────────────────────────────────

const potentiometer: SymbolDef = {
  length: 50,
  netlistPins: ["start", "wiper", "end"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 50, y: 0 },
    wiper: { x: 25, y: -22 },
  },
  svg: () =>
    [
      `<path d="M 0,0 L 10,0 L 13,-8 L 18,8 L 23,-8 L 28,8 L 33,-8 L 38,8 L 40,0 L 50,0" ${BODY}/>`,
      `<line x1="25" y1="-22" x2="25" y2="-10" ${BODY}/>`,
      `<polygon points="25,-10 21,-16 29,-16" ${FILL}/>`,
    ].join(""),
};

const TERMINAL_BLOCK_BODY_W = 80;
const TERMINAL_BLOCK_PIN_PITCH = 18;
const TERMINAL_BLOCK_LABEL_BAND = 8;
const DEFAULT_TERMINAL_BLOCK_PINS = ["1", "2", "3", "4"];

interface TerminalBlockPinGeometry {
  label: string;
  anchorName: string;
  x: number;
  y: number;
}

interface TerminalBlockGeometry {
  bodyWidth: number;
  bodyHeight: number;
  topY: number;
  pins: TerminalBlockPinGeometry[];
}

export function getTerminalBlockPinLabels(attrs?: Record<string, string>): string[] {
  const labels = pinLabels(attrs?.pins ?? attrs?.terminals, DEFAULT_TERMINAL_BLOCK_PINS);
  return labels.length > 0 ? labels : ["T1"];
}

function terminalBlockGeometry(attrs?: Record<string, string>): TerminalBlockGeometry {
  const labels = getTerminalBlockPinLabels(attrs);
  const bodyHeight = TERMINAL_BLOCK_PIN_PITCH * (labels.length + 1);
  const topY = -bodyHeight / 2;
  return {
    bodyWidth: TERMINAL_BLOCK_BODY_W,
    bodyHeight,
    topY,
    pins: labels.map((label, index) => ({
      label,
      anchorName: normalizePinName(label, `t${index + 1}`),
      x: -8,
      // Reserve the label band for every instance so labels never move pins.
      y:
        topY +
        TERMINAL_BLOCK_PIN_PITCH * (index + 1) +
        TERMINAL_BLOCK_LABEL_BAND,
    })),
  };
}

function terminalBlockAnchors(
  geometry: TerminalBlockGeometry
): Record<string, PinAnchor> {
  const anchors: Record<string, PinAnchor> = {
    start: { x: 0, y: 0 },
    end: { x: geometry.bodyWidth, y: 0 },
  };
  for (const pin of geometry.pins) {
    anchors[pin.anchorName] = { x: pin.x, y: pin.y };
  }
  return anchors;
}

// Terminal block / junction box. Pin anchors are dynamic per-instance from
// `pins="..."` or `terminals="..."`; static start/end remain cursor anchors.
const terminal_block: SymbolDef = {
  length: TERMINAL_BLOCK_BODY_W,
  netlistPins: [],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: TERMINAL_BLOCK_BODY_W, y: 0 },
  },
  svg: (label?: string, _value?: string, attrs?: Record<string, string>) => {
    const geometry = terminalBlockGeometry(attrs);
    const parts: string[] = [];
    parts.push(
      `<rect x="0" y="${geometry.topY}" width="${geometry.bodyWidth}" height="${geometry.bodyHeight}" rx="3" fill="white" stroke-width="2" ${BODY}/>`
    );
    if (label) {
      parts.push(
        `<text x="${geometry.bodyWidth / 2}" y="${geometry.topY + 14}" text-anchor="middle" class="schematex-circuit-meter">${label}</text>`
      );
    }
    for (const pin of geometry.pins) {
      parts.push(`<line x1="${pin.x}" y1="${pin.y}" x2="0" y2="${pin.y}" ${WIRE}/>`);
      parts.push(`<circle cx="6" cy="${pin.y}" r="2" ${FILL}/>`);
      parts.push(
        `<text x="12" y="${pin.y + 3}" class="schematex-circuit-pol">${pin.label}</text>`
      );
    }
    return parts.join("");
  },
};

function numAttr(attrs: Record<string, string> | undefined, key: string, fallback: number): number {
  const v = Number(attrs?.[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function effectiveSymbolDef(type: string, attrs?: Record<string, string>): SymbolDef {
  const sym = getSymbol(type);
  if (!sym) {
    const fallbackAttrs = {
      ...attrs,
      ic_label: attrs?.ic_label ?? type,
    };
    // Body width follows the part number, and `length` plus the pin anchors
    // must follow it too — widening the drawn box while leaving the anchors at
    // the old width would hang every wire in the wrong place.
    const fallbackW = icBodyWidth(fallbackAttrs.ic_label ?? "");
    return {
      ...generic_ic,
      length: fallbackW,
      anchors: icPinAnchors(
        getGenericIcPinSides(fallbackAttrs),
        undefined,
        undefined,
        fallbackW
      ),
      svg: (label, value) => generic_ic.svg(label, value, fallbackAttrs),
    };
  }
  if (type === "generic_ic") {
    const w = icBodyWidth(attrs?.ic_label ?? "");
    return {
      ...sym,
      length: w,
      anchors: icPinAnchors(getGenericIcPinSides(attrs), undefined, undefined, w),
    };
  }
  if (type === "terminal_block") {
    const geometry = terminalBlockGeometry(attrs);
    return { ...sym, anchors: terminalBlockAnchors(geometry) };
  }
  if (type !== "enclosure" && type !== "din_rail" && type !== "wire_duct") return sym;

  if (type === "enclosure") {
    const w = numAttr(attrs, "width", numAttr(attrs, "w", 240));
    const h = numAttr(attrs, "height", numAttr(attrs, "h", 160));
    return {
      ...sym,
      length: w,
      anchors: {
        start: { x: 0, y: 0 },
        end: { x: w, y: 0 },
        center: { x: w / 2, y: h / 2 },
        bottom_left: { x: 0, y: h },
        bottom_right: { x: w, y: h },
      },
    };
  }

  const length = numAttr(attrs, "length", 180);
  const h = type === "wire_duct" ? 22 : 14;
  return {
    ...sym,
    length,
    anchors: {
      start: { x: 0, y: 0 },
      end: { x: length, y: 0 },
      center: { x: length / 2, y: 0 },
      bottom_right: { x: length, y: h },
    },
  };
}

const enclosure: SymbolDef = {
  length: 240,
  anchors: { start: { x: 0, y: 0 }, end: { x: 240, y: 0 }, bottom_right: { x: 240, y: 160 } },
  svg: (label?: string, _value?: string, attrs?: Record<string, string>) => {
    const w = numAttr(attrs, "width", numAttr(attrs, "w", 240));
    const h = numAttr(attrs, "height", numAttr(attrs, "h", 160));
    const title = label ?? attrs?.title ?? "Panel";
    return [
      `<rect x="0" y="0" width="${w}" height="${h}" rx="8" fill="none" class="schematex-circuit-enclosure"/>`,
      `<rect x="10" y="20" width="${Math.max(10, w - 20)}" height="${Math.max(10, h - 30)}" rx="3" fill="none" class="schematex-circuit-enclosure-inner"/>`,
      `<text x="${w / 2}" y="15" text-anchor="middle" class="schematex-circuit-panel-label">${title}</text>`,
    ].join("");
  },
};

const din_rail: SymbolDef = {
  length: 180,
  anchors: { start: { x: 0, y: 0 }, end: { x: 180, y: 0 } },
  svg: (_label?: string, _value?: string, attrs?: Record<string, string>) => {
    const l = numAttr(attrs, "length", 180);
    const slots: string[] = [];
    for (let x = 8; x < l - 4; x += 16) {
      slots.push(`<rect x="${x}" y="-3" width="8" height="6" rx="2" class="schematex-circuit-din-slot"/>`);
    }
    return [
      `<rect x="0" y="-7" width="${l}" height="14" rx="2" class="schematex-circuit-din"/>`,
      ...slots,
    ].join("");
  },
};

const wire_duct: SymbolDef = {
  length: 180,
  anchors: { start: { x: 0, y: 0 }, end: { x: 180, y: 0 }, bottom_right: { x: 180, y: 22 } },
  svg: (_label?: string, _value?: string, attrs?: Record<string, string>) => {
    const l = numAttr(attrs, "length", 180);
    const teeth: string[] = [];
    for (let x = 8; x < l - 4; x += 12) {
      teeth.push(`<line x1="${x}" y1="0" x2="${x}" y2="22" class="schematex-circuit-duct-tooth"/>`);
    }
    return [
      `<rect x="0" y="0" width="${l}" height="22" rx="2" class="schematex-circuit-duct"/>`,
      ...teeth,
    ].join("");
  },
};

const plc: SymbolDef = {
  length: 70,
  anchors: { start: { x: 0, y: 0 }, end: { x: 70, y: 0 }, pwr: { x: 0, y: 24 }, out: { x: 70, y: 24 } },
  svg: (label?: string, _value?: string, attrs?: Record<string, string>) => {
    const title = label ?? attrs?.model ?? "PLC";
    const leds = [12, 24, 36, 48, 60]
      .map((x) => `<circle cx="${x}" cy="28" r="2.2" class="schematex-circuit-panel-led"/>`)
      .join("");
    return [
      `<rect x="0" y="-20" width="70" height="56" rx="4" fill="white" ${BODY}/>`,
      `<text x="35" y="-2" text-anchor="middle" class="schematex-circuit-meter">${title}</text>`,
      leds,
    ].join("");
  },
};

const pilot_light: SymbolDef = {
  length: 22,
  anchors: { start: { x: 0, y: 0 }, end: { x: 22, y: 0 } },
  svg: (label?: string, _value?: string) =>
    [
      `<circle cx="11" cy="0" r="10" class="schematex-circuit-panel-light"/>`,
      `<circle cx="11" cy="0" r="4" class="schematex-circuit-panel-led"/>`,
      label ? `<text x="11" y="20" text-anchor="middle" class="schematex-circuit-pol">${label}</text>` : "",
    ].join(""),
};

const selector_switch: SymbolDef = {
  length: 26,
  anchors: { start: { x: 0, y: 0 }, end: { x: 26, y: 0 } },
  svg: (label?: string) =>
    [
      `<circle cx="13" cy="0" r="12" fill="white" ${BODY}/>`,
      `<line x1="7" y1="5" x2="19" y2="-5" ${BODY}/>`,
      label ? `<text x="13" y="22" text-anchor="middle" class="schematex-circuit-pol">${label}</text>` : "",
    ].join(""),
};

const emergency_stop: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: (label?: string) =>
    [
      `<circle cx="15" cy="0" r="14" class="schematex-circuit-estop"/>`,
      `<text x="15" y="4" text-anchor="middle" class="schematex-circuit-meter">E</text>`,
      label ? `<text x="15" y="25" text-anchor="middle" class="schematex-circuit-pol">${label}</text>` : "",
    ].join(""),
};

// ─── Industrial control / Power electrical (IEC 60617) ───────

// Relay coil — rectangle with diagonal line indicating coil winding.
// Mechanical-link convention: contacts elsewhere sharing the same label
// (e.g. K1) are conceptually driven by this coil; rendering of the link
// itself is deferred to a future enhancement.
const relay_coil: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<rect x="8" y="-10" width="24" height="20" fill="white" ${BODY}/>`,
      // Diagonal slash inside the box = coil winding indicator
      `<line x1="8" y1="-10" x2="32" y2="10" ${BODY}/>`,
      lineWire(32, 0, 40, 0),
    ].join(""),
};

// IEEE 315 combined relay: coil and NO contact joined by a mechanical link.
const relay: SymbolDef = {
  length: 68,
  netlistPins: ["coil_a", "coil_b", "common", "no"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 68, y: 10 },
    coil_a: { x: 0, y: -14 },
    coil_b: { x: 0, y: 14 },
    common: { x: 68, y: -10 },
    no: { x: 68, y: 10 },
  },
  svg: () => [
    lineWire(0, -14, 8, -14),
    lineWire(0, 14, 8, 14),
    `<rect x="8" y="-20" width="22" height="40" fill="white" ${BODY}/>` ,
    `<path d="M 8,-20 L 30,20 M 8,0 L 20,20" fill="none" ${BODY}/>` ,
    `<line x1="34" y1="0" x2="48" y2="0" stroke-dasharray="3,3" ${BODY}/>` ,
    `<circle cx="50" cy="-10" r="2" ${FILL}/>` ,
    `<circle cx="50" cy="10" r="2" ${FILL}/>` ,
    `<line x1="50" y1="-10" x2="63" y2="5" ${BODY}/>` ,
    lineWire(50, -10, 68, -10),
    lineWire(50, 10, 68, 10),
  ].join(""),
};

// IEEE 315 combined SPDT relay: coil with mechanically linked changeover contact.
const relay_spdt: SymbolDef = {
  length: 72,
  netlistPins: ["coil_a", "coil_b", "common", "nc", "no"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 72, y: 0 },
    coil_a: { x: 0, y: -16 },
    coil_b: { x: 0, y: 16 },
    common: { x: 72, y: 0 },
    nc: { x: 72, y: -16 },
    no: { x: 72, y: 16 },
  },
  svg: () => [
    lineWire(0, -16, 8, -16),
    lineWire(0, 16, 8, 16),
    `<rect x="8" y="-22" width="22" height="44" fill="white" ${BODY}/>` ,
    `<path d="M 8,-22 L 30,22 M 8,0 L 19,22" fill="none" ${BODY}/>` ,
    `<line x1="34" y1="0" x2="46" y2="0" stroke-dasharray="3,3" ${BODY}/>` ,
    `<circle cx="50" cy="0" r="2" ${FILL}/>` ,
    `<circle cx="62" cy="-16" r="2" ${FILL}/>` ,
    `<circle cx="62" cy="16" r="2" ${FILL}/>` ,
    `<line x1="50" y1="0" x2="60" y2="-14" ${BODY}/>` ,
    lineWire(50, 0, 72, 0),
    lineWire(62, -16, 72, -16),
    lineWire(62, 16, 72, 16),
  ].join(""),
};

// Relay contact normally-open — same as a switch contact but visually
// paired (small rect indicator above) to mark "controlled by a coil".
const relay_no: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<line x1="10" y1="0" x2="30" y2="-10" ${BODY}/>`,
      `<circle cx="10" cy="0" r="2" ${FILL}/>`,
      `<circle cx="30" cy="0" r="2" ${FILL}/>`,
      // Small dashed bar above to denote actuator-driven (vs hand switch)
      `<line x1="14" y1="-14" x2="26" y2="-14" stroke-dasharray="2,2" ${BODY}/>`,
      lineWire(30, 0, 40, 0),
    ].join(""),
};

// Relay contact normally-closed — bar drawn across the contact gap.
const relay_nc: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<line x1="10" y1="-10" x2="30" y2="-10" ${BODY}/>`,
      // NC slash: line crosses both contact endpoints (closed by default)
      `<line x1="8" y1="2" x2="32" y2="-12" ${BODY}/>`,
      `<circle cx="10" cy="0" r="2" ${FILL}/>`,
      `<circle cx="30" cy="0" r="2" ${FILL}/>`,
      `<line x1="14" y1="-14" x2="26" y2="-14" stroke-dasharray="2,2" ${BODY}/>`,
      lineWire(30, 0, 40, 0),
    ].join(""),
};

// Contactor (KM*) — heavy-load switching, drawn with a bolder contact +
// horizontal dash row indicating the mechanical bridge.
const contactor: SymbolDef = {
  length: 44,
  anchors: { start: { x: 0, y: 0 }, end: { x: 44, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      // Two parallel diagonal contacts = double-break (typical of contactors)
      `<line x1="10" y1="0" x2="30" y2="-10" stroke-width="2.5" ${BODY}/>`,
      `<line x1="14" y1="2" x2="34" y2="-8" stroke-width="2.5" ${BODY}/>`,
      `<circle cx="10" cy="0" r="2" ${FILL}/>`,
      `<circle cx="34" cy="0" r="2" ${FILL}/>`,
      // Solid bar above = electromagnetic-driven actuator
      `<line x1="14" y1="-14" x2="30" y2="-14" stroke-width="2" ${BODY}/>`,
      lineWire(34, 0, 44, 0),
    ].join(""),
};

// Solenoid valve (EV*) — rectangle with coil winding indicator and a
// valve-body arrow pointing along the flow path. Simplified IEC 60617-14.
const solenoid_valve: SymbolDef = {
  length: 50,
  anchors: { start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      // Solenoid box on top
      `<rect x="8" y="-22" width="14" height="12" fill="white" ${BODY}/>`,
      `<line x1="8" y1="-22" x2="22" y2="-10" ${BODY}/>`,
      // Valve body (triangle pair = IEC valve symbol)
      `<polygon points="22,0 38,-8 38,8" fill="white" ${BODY}/>`,
      `<polygon points="22,0 8,-8 8,8" fill="white" ${BODY}/>`,
      // Connect solenoid to valve body (actuator line)
      `<line x1="15" y1="-10" x2="22" y2="0" ${BODY}/>`,
      lineWire(38, 0, 50, 0),
    ].join(""),
};

// Thermal overload relay (F2*) — hashed rectangle with heat-element
// indicators; the small bent line denotes the bimetal element.
const thermal_overload: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<rect x="8" y="-12" width="24" height="24" fill="white" ${BODY}/>`,
      // Bimetal element: bent line inside box
      `<path d="M 12,-6 L 16,4 L 20,-6 L 24,4 L 28,-6" fill="none" ${BODY}/>`,
      lineWire(32, 0, 40, 0),
    ].join(""),
};

// Disconnect switch / isolator (Q1*) — switch with a hollow square at
// the moving contact end to indicate visible-break disconnect device.
const disconnect_switch: SymbolDef = {
  length: 48,
  anchors: { start: { x: 0, y: 0 }, end: { x: 48, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<line x1="10" y1="0" x2="34" y2="-12" ${BODY}/>`,
      `<circle cx="10" cy="0" r="2" ${FILL}/>`,
      // Hollow square at top of arm = visible-isolation indicator
      `<rect x="30" y="-16" width="8" height="8" fill="white" ${BODY}/>`,
      `<circle cx="38" cy="0" r="2" ${FILL}/>`,
      lineWire(38, 0, 48, 0),
    ].join(""),
};

// ─── Previously-missing glyphs (v0.6.7) ──────────────────────
// These types were declared in CircuitComponentType and accepted by the parser
// but had no SymbolDef, so they rendered as a dashed `?type` placeholder. Each
// follows the rightward-orientation contract (start at origin, end at length).

const varistor: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 6, 0),
      `<rect x="6" y="-8" width="28" height="16" fill="white" ${BODY}/>`,
      // voltage-dependence diagonal through the body
      `<line x1="9" y1="9" x2="31" y2="-9" ${BODY}/>`,
      `<text x="12" y="-1" class="schematex-circuit-pol">U</text>`,
      lineWire(34, 0, 40, 0),
    ].join(""),
};

const fuse_slow: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 5, 0),
      `<rect x="5" y="-5" width="20" height="10" rx="5" fill="none" ${BODY}/>`,
      `<line x1="5" y1="0" x2="25" y2="0" ${BODY}/>`,
      `<text x="11" y="-8" class="schematex-circuit-pol">T</text>`,
      lineWire(25, 0, 30, 0),
    ].join(""),
};

const inductor_iron: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      `<path d="M 0,0 L 5,0 A 5,5 0 0 1 15,0 A 5,5 0 0 1 25,0 A 5,5 0 0 1 35,0 L 40,0" fill="none" ${BODY}/>`,
      // iron core: two parallel lines above the humps
      `<line x1="6" y1="-8" x2="34" y2="-8" ${BODY}/>`,
      `<line x1="6" y1="-11" x2="34" y2="-11" ${BODY}/>`,
    ].join(""),
};

const inductor_ferrite: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      `<path d="M 0,0 L 5,0 A 5,5 0 0 1 15,0 A 5,5 0 0 1 25,0 A 5,5 0 0 1 35,0 L 40,0" fill="none" ${BODY}/>`,
      // ferrite core: one heavy line above the humps
      `<line x1="6" y1="-9" x2="34" y2="-9" stroke-width="2.5" ${BODY}/>`,
    ].join(""),
};

const ferrite_bead: SymbolDef = {
  length: 30,
  anchors: { start: { x: 0, y: 0 }, end: { x: 30, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 7, 0),
      `<rect x="7" y="-6" width="16" height="12" rx="2" ${FILL}/>`,
      lineWire(23, 0, 30, 0),
    ].join(""),
};

const varactor: SymbolDef = {
  length: 32,
  anchors: { start: { x: 0, y: 0 }, end: { x: 32, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<polygon points="8,-8 8,8 20,0" ${FILL}/>`,
      // cathode bar + parallel capacitor plate (voltage-variable capacitance)
      `<line x1="20" y1="-8" x2="20" y2="8" ${BODY}/>`,
      `<line x1="24" y1="-8" x2="24" y2="8" ${BODY}/>`,
      lineWire(24, 0, 32, 0),
    ].join(""),
};

const tvs_diode: SymbolDef = {
  length: 36,
  anchors: { start: { x: 0, y: 0 }, end: { x: 36, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 6, 0),
      // two triangles back-to-back onto a shared bar (bidirectional clamp)
      `<polygon points="6,-8 6,8 16,0" ${FILL}/>`,
      `<polygon points="30,-8 30,8 20,0" ${FILL}/>`,
      `<line x1="18" y1="-9" x2="18" y2="9" ${BODY}/>`,
      lineWire(30, 0, 36, 0),
    ].join(""),
};

const bridge_rectifier: SymbolDef = {
  length: 48,
  netlistPins: ["ac1", "ac2", "dcp", "dcn"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 48, y: 0 },
    ac1: { x: 0, y: 0 }, // left corner
    ac2: { x: 48, y: 0 }, // right corner
    dcp: { x: 24, y: -24 }, // top corner (+)
    dcn: { x: 24, y: 24 }, // bottom corner (−)
  },
  svg: () =>
    [
      `<polygon points="0,0 24,-24 48,0 24,24" fill="white" ${BODY}/>`,
      // four diode triangles, all conducting toward DC+ (top)
      `<polygon points="8,-10 15,-10 11,-3" ${FILL}/>`,
      `<polygon points="33,-10 40,-10 36,-3" ${FILL}/>`,
      `<polygon points="8,10 15,10 11,3" ${FILL}/>`,
      `<polygon points="33,10 40,10 36,3" ${FILL}/>`,
      `<text x="24" y="-10" text-anchor="middle" class="schematex-circuit-pol">+</text>`,
      `<text x="24" y="20" text-anchor="middle" class="schematex-circuit-pol">−</text>`,
    ].join(""),
};

const darlington_npn: SymbolDef = {
  length: 40,
  netlistPins: ["c", "b", "e"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    base: { x: 0, y: 0 },
    collector: { x: 40, y: -16 },
    emitter: { x: 40, y: 16 },
    b: { x: 0, y: 0 },
    c: { x: 40, y: -16 },
    e: { x: 40, y: 16 },
  },
  svg: () =>
    [
      `<circle cx="20" cy="0" r="16" fill="white" ${BODY}/>`,
      lineWire(0, 0, 10, 0),
      `<line x1="10" y1="-9" x2="10" y2="9" ${BODY}/>`, // shared base plate
      // Q1: base → collector, base → Q2 base node
      `<line x1="10" y1="-5" x2="26" y2="-11" ${BODY}/>`,
      `<line x1="10" y1="4" x2="19" y2="7" ${BODY}/>`,
      // Q2: emitter out (NPN arrow outward)
      `<line x1="19" y1="7" x2="28" y2="11" ${BODY}/>`,
      `<polygon points="28,11 21,9 23,15" ${FILL}/>`,
      lineWire(26, -11, 40, -16),
      lineWire(28, 11, 40, 16),
    ].join(""),
};

const darlington_pnp: SymbolDef = {
  length: 40,
  netlistPins: ["c", "b", "e"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    base: { x: 0, y: 0 },
    collector: { x: 40, y: -16 },
    emitter: { x: 40, y: 16 },
    b: { x: 0, y: 0 },
    c: { x: 40, y: -16 },
    e: { x: 40, y: 16 },
  },
  svg: () =>
    [
      `<circle cx="20" cy="0" r="16" fill="white" ${BODY}/>`,
      lineWire(0, 0, 10, 0),
      `<line x1="10" y1="-9" x2="10" y2="9" ${BODY}/>`,
      `<line x1="10" y1="-5" x2="26" y2="-11" ${BODY}/>`,
      `<line x1="10" y1="4" x2="19" y2="7" ${BODY}/>`,
      `<line x1="19" y1="7" x2="28" y2="11" ${BODY}/>`,
      // PNP arrow pointing inward (toward base node)
      `<polygon points="12,5 19,7 14,11" ${FILL}/>`,
      lineWire(26, -11, 40, -16),
      lineWire(28, 11, 40, 16),
    ].join(""),
};

const nmos_depletion: SymbolDef = {
  length: 40,
  netlistPins: ["d", "g", "s"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    gate: { x: 0, y: 0 },
    drain: { x: 40, y: -16 },
    source: { x: 40, y: 16 },
    g: { x: 0, y: 0 },
    d: { x: 40, y: -16 },
    s: { x: 40, y: 16 },
  },
  svg: () =>
    [
      lineWire(0, 0, 14, 0),
      `<line x1="14" y1="-12" x2="14" y2="12" ${BODY}/>`, // gate plate
      // solid channel bar (depletion mode) vs the segmented enhancement bar
      `<line x1="18" y1="-10" x2="18" y2="10" ${BODY}/>`,
      `<line x1="18" y1="-8" x2="32" y2="-8" ${BODY}/>`,
      lineWire(32, -8, 40, -16),
      `<line x1="18" y1="8" x2="32" y2="8" ${BODY}/>`,
      lineWire(32, 8, 40, 16),
      `<polygon points="22,0 18,-4 18,4" ${FILL}/>`,
    ].join(""),
};

const igbt: SymbolDef = {
  length: 40,
  netlistPins: ["c", "g", "e"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    gate: { x: 0, y: 0 },
    collector: { x: 40, y: -16 },
    emitter: { x: 40, y: 16 },
    g: { x: 0, y: 0 },
    c: { x: 40, y: -16 },
    e: { x: 40, y: 16 },
  },
  svg: () =>
    [
      lineWire(0, 0, 10, 0),
      `<line x1="10" y1="-12" x2="10" y2="12" ${BODY}/>`, // insulated gate plate
      `<line x1="14" y1="-10" x2="14" y2="10" ${BODY}/>`, // channel
      `<line x1="14" y1="-8" x2="32" y2="-8" ${BODY}/>`,
      lineWire(32, -8, 40, -16),
      `<line x1="14" y1="8" x2="28" y2="8" ${BODY}/>`,
      // IGBT emitter arrow (BJT-like, pointing out)
      `<polygon points="28,8 22,5 23,11" ${FILL}/>`,
      lineWire(28, 8, 40, 16),
    ].join(""),
};

const scr: SymbolDef = {
  length: 36,
  netlistPins: ["a", "k", "g"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 36, y: 0 },
    a: { x: 0, y: 0 },
    k: { x: 36, y: 0 },
    g: { x: 30, y: 16 },
    gate: { x: 30, y: 16 },
  },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<polygon points="8,-8 8,8 22,0" ${FILL}/>`,
      `<line x1="22" y1="-8" x2="22" y2="8" ${BODY}/>`,
      lineWire(22, 0, 36, 0),
      // gate lead off the cathode side
      `<line x1="22" y1="4" x2="30" y2="12" ${BODY}/>`,
      lineWire(30, 12, 30, 16),
    ].join(""),
};

const triac: SymbolDef = {
  length: 40,
  netlistPins: ["mt1", "mt2", "g"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: 0 },
    mt1: { x: 0, y: 0 },
    mt2: { x: 40, y: 0 },
    g: { x: 6, y: 16 },
    gate: { x: 6, y: 16 },
  },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      // two triangles back-to-back, offset vertically (bidirectional)
      `<polygon points="8,-9 8,3 22,-3" ${FILL}/>`,
      `<polygon points="32,-3 32,9 18,3" ${FILL}/>`,
      `<line x1="8" y1="-9" x2="8" y2="3" ${BODY}/>`,
      `<line x1="32" y1="-3" x2="32" y2="9" ${BODY}/>`,
      lineWire(32, 0, 40, 0),
      // gate lead
      `<line x1="10" y1="6" x2="6" y2="12" ${BODY}/>`,
      lineWire(6, 12, 6, 16),
    ].join(""),
};

const diac: SymbolDef = {
  length: 36,
  anchors: { start: { x: 0, y: 0 }, end: { x: 36, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 6, 0),
      // two triangles back-to-back, no gate (bidirectional trigger)
      `<polygon points="6,-9 6,3 20,-3" ${FILL}/>`,
      `<polygon points="30,-3 30,9 16,3" ${FILL}/>`,
      `<line x1="6" y1="-9" x2="6" y2="3" ${BODY}/>`,
      `<line x1="30" y1="-3" x2="30" y2="9" ${BODY}/>`,
      lineWire(30, 0, 36, 0),
    ].join(""),
};

const phototransistor: SymbolDef = {
  length: 40,
  netlistPins: ["c", "b", "e"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    base: { x: 0, y: 0 },
    collector: { x: 40, y: -16 },
    emitter: { x: 40, y: 16 },
    b: { x: 0, y: 0 },
    c: { x: 40, y: -16 },
    e: { x: 40, y: 16 },
  },
  svg: () =>
    [
      `<circle cx="20" cy="0" r="16" fill="white" ${BODY}/>`,
      `<line x1="14" y1="-10" x2="14" y2="10" ${BODY}/>`,
      lineWire(0, 0, 14, 0),
      `<line x1="14" y1="-6" x2="30" y2="-12" ${BODY}/>`,
      lineWire(30, -12, 40, -16),
      `<line x1="14" y1="6" x2="30" y2="12" ${BODY}/>`,
      lineWire(30, 12, 40, 16),
      `<polygon points="30,12 24,10 26,16" ${FILL}/>`,
      // inward light arrows striking the base
      `<path d="M 2,-20 L 9,-13 M 9,-15 L 9,-13 L 7,-13" fill="none" ${BODY}/>`,
      `<path d="M 7,-22 L 14,-15 M 14,-17 L 14,-15 L 12,-15" fill="none" ${BODY}/>`,
    ].join(""),
};

const optocoupler: SymbolDef = {
  length: 56,
  netlistPins: ["a", "k", "c", "e"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 56, y: 0 },
    a: { x: 0, y: -12 },
    k: { x: 0, y: 12 },
    c: { x: 56, y: -12 },
    e: { x: 56, y: 12 },
  },
  svg: () =>
    [
      `<rect x="10" y="-22" width="36" height="44" fill="none" class="schematex-circuit-body" stroke-dasharray="4,3"/>`,
      // LED (left): anode top, cathode bottom — drawn pointing down
      lineWire(0, -12, 16, -12),
      lineWire(0, 12, 16, 12),
      `<polygon points="16,-6 24,-6 20,2" ${FILL}/>`,
      `<line x1="16" y1="2" x2="24" y2="2" ${BODY}/>`,
      // isolation light arrows
      `<path d="M 26,-4 L 32,-4 M 30,-6 L 32,-4 L 30,-2" fill="none" ${BODY}/>`,
      `<path d="M 26,2 L 32,2 M 30,0 L 32,2 L 30,4" fill="none" ${BODY}/>`,
      // phototransistor (right)
      `<line x1="36" y1="-8" x2="36" y2="8" ${BODY}/>`,
      `<line x1="36" y1="-4" x2="46" y2="-12" ${BODY}/>`,
      lineWire(46, -12, 56, -12),
      `<line x1="36" y1="4" x2="46" y2="12" ${BODY}/>`,
      lineWire(46, 12, 56, 12),
      `<polygon points="46,12 40,10 42,16" ${FILL}/>`,
    ].join(""),
};

const schmitt_buffer: SymbolDef = {
  length: 44,
  netlistPins: ["in", "out"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 44, y: 0 },
    in: { x: 0, y: 0 },
    out: { x: 44, y: 0 },
  },
  svg: () =>
    [
      lineWire(0, 0, 6, 0),
      `<polygon points="6,-14 6,14 38,0" fill="white" ${BODY}/>`,
      // hysteresis glyph inside
      `<path d="M 12,4 L 18,4 L 18,-4 L 24,-4 M 14,-2 L 20,-2 L 20,6 L 26,6" fill="none" ${BODY}/>`,
      lineWire(38, 0, 44, 0),
    ].join(""),
};

const tri_state_buffer: SymbolDef = {
  length: 44,
  netlistPins: ["in", "out", "en"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 44, y: 0 },
    in: { x: 0, y: 0 },
    out: { x: 44, y: 0 },
    en: { x: 19, y: -14 },
    enable: { x: 19, y: -14 },
  },
  svg: () =>
    [
      lineWire(0, 0, 6, 0),
      `<polygon points="6,-14 6,14 38,0" fill="white" ${BODY}/>`,
      // enable pin on top
      `<line x1="19" y1="-7" x2="19" y2="-14" ${BODY}/>`,
      lineWire(38, 0, 44, 0),
    ].join(""),
};

const instrumentation_amp: SymbolDef = {
  length: 50,
  netlistPins: ["inp", "inn", "out"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 50, y: 0 },
    inp: { x: 0, y: -12 },
    inn: { x: 0, y: 12 },
    out: { x: 50, y: 0 },
  },
  svg: () =>
    [
      lineWire(0, -12, 4, -12),
      lineWire(0, 12, 4, 12),
      `<polygon points="4,-22 4,22 50,0" fill="white" ${BODY}/>`,
      // double left edge marks the instrumentation (3-opamp) block
      `<line x1="8" y1="-20" x2="8" y2="20" ${BODY}/>`,
      `<text x="6" y="-7" class="schematex-circuit-pol">+</text>`,
      `<text x="6" y="15" class="schematex-circuit-pol">−</text>`,
      `<text x="18" y="4" class="schematex-circuit-pol">INA</text>`,
    ].join(""),
};

const dc_dc_converter: SymbolDef = {
  length: 50,
  netlistPins: ["vin", "gin", "vout", "gout"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 50, y: 0 },
    vin: { x: 0, y: -12 },
    gin: { x: 0, y: 12 },
    vout: { x: 50, y: -12 },
    gout: { x: 50, y: 12 },
  },
  svg: () =>
    [
      lineWire(0, -12, 8, -12),
      lineWire(0, 12, 8, 12),
      `<rect x="8" y="-20" width="34" height="40" fill="white" ${BODY}/>`,
      `<line x1="14" y1="14" x2="36" y2="-14" ${BODY}/>`,
      `<text x="12" y="-8" class="schematex-circuit-pol">DC</text>`,
      `<text x="24" y="17" class="schematex-circuit-pol">DC</text>`,
      lineWire(42, -12, 50, -12),
      lineWire(42, 12, 50, 12),
    ].join(""),
};

const switch_dpdt: SymbolDef = {
  length: 52,
  netlistPins: ["p1", "nc1", "no1", "p2", "nc2", "no2"],
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 52, y: 0 },
    p1: { x: 0, y: -16 },
    nc1: { x: 52, y: -28 },
    no1: { x: 52, y: -8 },
    p2: { x: 0, y: 16 },
    nc2: { x: 52, y: 4 },
    no2: { x: 52, y: 24 },
  },
  svg: () =>
    [
      // pole 1 (upper)
      lineWire(0, -16, 10, -16),
      `<circle cx="10" cy="-16" r="2" ${FILL}/>`,
      `<line x1="10" y1="-16" x2="40" y2="-26" ${BODY}/>`,
      `<circle cx="42" cy="-28" r="2" ${FILL}/>`,
      lineWire(42, -28, 52, -28),
      `<circle cx="42" cy="-8" r="2" ${FILL}/>`,
      lineWire(42, -8, 52, -8),
      // pole 2 (lower)
      lineWire(0, 16, 10, 16),
      `<circle cx="10" cy="16" r="2" ${FILL}/>`,
      `<line x1="10" y1="16" x2="40" y2="6" ${BODY}/>`,
      `<circle cx="42" cy="4" r="2" ${FILL}/>`,
      lineWire(42, 4, 52, 4),
      `<circle cx="42" cy="24" r="2" ${FILL}/>`,
      lineWire(42, 24, 52, 24),
      // ganged actuator (dashed link between the two arms)
      `<line x1="25" y1="-21" x2="25" y2="11" class="schematex-circuit-body" stroke-dasharray="3,3"/>`,
    ].join(""),
};

const oscilloscope: SymbolDef = {
  length: 40,
  anchors: { start: { x: 0, y: 0 }, end: { x: 40, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 8, 0),
      `<circle cx="20" cy="0" r="12" fill="white" ${BODY}/>`,
      // sine trace
      `<path d="M 12,2 Q 16,-9 20,0 Q 24,9 28,-2" fill="none" ${BODY}/>`,
      lineWire(32, 0, 40, 0),
    ].join(""),
};

const port: SymbolDef = {
  length: 16,
  anchors: { start: { x: 0, y: 0 }, end: { x: 16, y: 0 } },
  svg: () =>
    [
      lineWire(0, 0, 6, 0),
      `<circle cx="11" cy="0" r="5" fill="white" ${BODY}/>`,
    ].join(""),
};

// ─── Registry ─────────────────────────────────────────────────

export const SYMBOLS: Partial<Record<CircuitComponentType, SymbolDef>> = {
  resistor,
  capacitor,
  electrolytic_cap,
  inductor,
  fuse,
  crystal,
  transformer,
  voltage_source,
  current_source,
  ac_source,
  battery,
  solar_cell,
  ground,
  gnd_signal,
  vcc,
  diode,
  zener,
  schottky,
  led,
  photodiode,
  npn,
  pnp,
  triode,
  nmos,
  pmos,
  jfet_n,
  jfet_p,
  opamp,
  comparator,
  switch_spst,
  mains_socket,
  proximity_sensor,
  switch_nc,
  push_no,
  ammeter,
  voltmeter,
  wattmeter,
  motor,
  fan,
  lamp,
  speaker,
  microphone,
  buzzer,
  automotive_flasher_3pin,
  potentiometer,
  rheostat,
  thermistor_ntc,
  thermistor_ptc,
  ldr,
  variable_cap,
  variable_inductor,
  switch_spdt,
  switch_spdt_center_off,
  push_nc,
  gnd_chassis,
  gnd_digital,
  test_point,
  no_connect,
  antenna,
  generic_ic,
  terminal_block,
  enclosure,
  din_rail,
  wire_duct,
  plc,
  pilot_light,
  selector_switch,
  emergency_stop,
  "555_timer": timer_555,
  voltage_regulator,
  // Industrial control / power electrical (IEC 60617)
  relay_coil,
  relay,
  relay_spdt,
  relay_no,
  relay_nc,
  contactor,
  solenoid_valve,
  thermal_overload,
  disconnect_switch,
  // Previously-missing glyphs (v0.6.7) — passives / diodes / power semis / ICs
  varistor,
  fuse_slow,
  inductor_iron,
  inductor_ferrite,
  ferrite_bead,
  varactor,
  tvs_diode,
  bridge_rectifier,
  darlington_npn,
  darlington_pnp,
  nmos_depletion,
  igbt,
  scr,
  triac,
  diac,
  phototransistor,
  optocoupler,
  schmitt_buffer,
  tri_state_buffer,
  instrumentation_amp,
  dc_dc_converter,
  switch_dpdt,
  oscilloscope,
  port,
};

export function getSymbol(t: string): SymbolDef | undefined {
  return SYMBOLS[t as CircuitComponentType];
}

export function listCircuitSymbolTypes(): CircuitComponentType[] {
  return Object.keys(SYMBOLS).sort() as CircuitComponentType[];
}

export function getNetlistPinOrder(t: string): string[] | undefined {
  const sym = getSymbol(t);
  if (!sym) return undefined;
  if (sym.netlistPins?.length) return [...sym.netlistPins];
  if (sym.anchors.start && sym.anchors.end) return ["start", "end"];
  return Object.keys(sym.anchors);
}
