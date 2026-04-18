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

export interface PinAnchor {
  x: number;
  y: number;
}

export interface SymbolDef {
  /** Length along the direction axis, used to compute next cursor position. */
  length: number;
  /** Anchor map in rightward orientation. MUST include start + end. */
  anchors: Record<string, PinAnchor>;
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

// ─── MOSFET ───────────────────────────────────────────────────

const nmos: SymbolDef = {
  length: 40,
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
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    gate: { x: 0, y: 0 },
    drain: { x: 40, y: -16 },
    source: { x: 40, y: 16 },
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
  anchors: {
    start: { x: 0, y: 0 },
    end: { x: 40, y: -16 },
    gate: { x: 0, y: 0 },
    drain: { x: 40, y: -16 },
    source: { x: 40, y: 16 },
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

/**
 * Generic IC — 8-pin dual-inline rectangular block.
 * `attrs.pins_left` / `attrs.pins_right`: comma-separated pin labels.
 * Total pins determine body height. Left pins are input side (start anchor
 * attaches to pin 1 = top-left).
 */
function icSymbol(
  defaultLeft: string[],
  defaultRight: string[],
  bodyLabel?: string
): SymbolDef {
  const BODY_W = 80;
  return {
    length: BODY_W,
    anchors: {
      start: { x: 0, y: 0 },
      end: { x: BODY_W, y: 0 },
    },
    svg: (_label?: string, _value?: string, attrs?: Record<string, string>) => {
      const left = (attrs?.pins_left ? attrs.pins_left.split(",").map((s) => s.trim()) : defaultLeft);
      const right = (attrs?.pins_right ? attrs.pins_right.split(",").map((s) => s.trim()) : defaultRight);
      const n = Math.max(left.length, right.length, 2);
      const pitch = 16;
      const bodyH = pitch * (n + 1);
      const topY = -bodyH / 2;
      const parts: string[] = [];
      parts.push(`<rect x="0" y="${topY}" width="${BODY_W}" height="${bodyH}" fill="white" ${BODY}/>`);
      const labelText = attrs?.ic_label ?? bodyLabel ?? "";
      if (labelText) {
        parts.push(`<text x="${BODY_W / 2}" y="3" text-anchor="middle" class="schematex-circuit-meter">${labelText}</text>`);
      }
      for (let i = 0; i < left.length; i++) {
        const y = topY + pitch * (i + 1);
        parts.push(`<line x1="-8" y1="${y}" x2="0" y2="${y}" ${WIRE}/>`);
        parts.push(`<text x="4" y="${y + 3}" class="schematex-circuit-pol">${left[i]}</text>`);
      }
      for (let i = 0; i < right.length; i++) {
        const y = topY + pitch * (i + 1);
        parts.push(`<line x1="${BODY_W}" y1="${y}" x2="${BODY_W + 8}" y2="${y}" ${WIRE}/>`);
        parts.push(`<text x="${BODY_W - 4}" y="${y + 3}" text-anchor="end" class="schematex-circuit-pol">${right[i]}</text>`);
      }
      return parts.join("");
    },
  };
}

const generic_ic: SymbolDef = icSymbol(
  ["1", "2", "3", "4"],
  ["8", "7", "6", "5"],
  "IC"
);

/** 555 timer — 8-pin standard pinout */
const timer_555: SymbolDef = (() => {
  const left = ["GND", "TRG", "OUT", "RST"];
  const right = ["VCC", "DIS", "THR", "CTL"];
  const sym = icSymbol(left, right, "555");
  // Add custom pin anchors so DSL can reference U1.trg, U1.out, etc.
  const BODY_W = 80;
  const pitch = 16;
  const n = 4;
  const bodyH = pitch * (n + 1);
  const topY = -bodyH / 2;
  const anchors: Record<string, PinAnchor> = {
    start: { x: 0, y: 0 },
    end: { x: BODY_W, y: 0 },
  };
  const leftNames = ["gnd", "trg", "out", "rst"];
  const rightNames = ["vcc", "dis", "thr", "ctl"];
  for (let i = 0; i < n; i++) {
    const y = topY + pitch * (i + 1);
    anchors[leftNames[i]] = { x: -8, y };
    anchors[rightNames[i]] = { x: BODY_W + 8, y };
  }
  return { ...sym, anchors };
})();

const voltage_regulator: SymbolDef = {
  length: 60,
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
  nmos,
  pmos,
  jfet_n,
  jfet_p,
  opamp,
  comparator,
  switch_spst,
  push_no,
  ammeter,
  voltmeter,
  wattmeter,
  motor,
  speaker,
  microphone,
  buzzer,
  potentiometer,
  rheostat,
  thermistor_ntc,
  thermistor_ptc,
  ldr,
  variable_cap,
  variable_inductor,
  switch_spdt,
  push_nc,
  gnd_chassis,
  gnd_digital,
  test_point,
  no_connect,
  antenna,
  generic_ic,
  "555_timer": timer_555,
  voltage_regulator,
  // Lamp reuses buzzer slot? No, needs its own entry but our CircuitComponentType
  // doesn't have "lamp". We map it via parser alias to "buzzer" or add specifically.
};

// Lamp is not in CircuitComponentType; expose via a side channel so parser can find it.
export const EXTRA_SYMBOLS: Record<string, SymbolDef> = {
  lamp,
};

export function getSymbol(t: string): SymbolDef | undefined {
  return SYMBOLS[t as CircuitComponentType] ?? EXTRA_SYMBOLS[t];
}
