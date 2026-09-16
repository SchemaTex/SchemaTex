/** Draw the sld (ANSI) symbol library into visual-eval/symbols/sld/.
 *
 *   node scripts/visual-eval/symbols/draw-sld.mjs
 *
 * Constants, weights and the symbols that appear in the exemplar are lifted from
 * scripts/visual-eval/draw-sld-ansi-exemplar.mjs, so each symbol is drawn at the
 * exemplar's own scale (1 viewBox unit = 1 exemplar px). Symbols the exemplar does
 * not contain are built from the same parts: 1.5 outlines, 2.2 contact arms, 1.3
 * glyphs, r = 2.8 terminal dots, white bodies and bold #0f172a lettering.
 *
 * Library-wide rules (each recorded in inventory.md as a decision):
 * - Moving contacts are drawn in the IEEE 315 §4.6 standard position, the one with
 *   no operating force applied: single-throw devices open, the transfer switch on
 *   its normal throw. Every single-throw arm is the same 2.2 arm, hinged on the
 *   lower terminal, and no part of it rises above the upper terminal.
 * - Connection glyphs (delta, wye, ground) sit beside the winding they describe,
 *   GLYPH_GAP clear of the body's ink.
 * - Letters inside or on a symbol are symbol lettering (#0f172a, bold); the grey
 *   #64748b belongs only to annotation outside symbols.
 * - 12 px conductor stubs on every power connection; control connections (CT
 *   secondary, relay trip) are 12 px stubs at the exemplar's 1.2 control weight.
 *
 * Each file is drawn about its centre at the origin and cropped to its inked
 * extent (measured by resvg) plus 8 units of padding.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const LINE = "#1e293b";       // conductors and symbol outlines
const INK = "#0f172a";        // symbol lettering
const W_LINE = 1.5, W_SYM = 1.5, W_BUS = 3, W_CTRL = 1.2, W_ARM = 2.2, W_GLYPH = 1.3;
const STUB = 12;
const PAD = 8;
const DOT = 2.8;              // terminal dot on a moving contact
const GLYPH_GAP = 4;          // clear space between a connection glyph and its body

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 100) / 100;

/** Conductor exactly as the exemplar's run(): 1.5, square caps. */
const wire = (x1, y1, x2, y2, width = W_LINE) =>
  `<path d="M ${n2(x1)} ${n2(y1)} L ${n2(x2)} ${n2(y2)}" fill="none" stroke="${LINE}" stroke-width="${width}" stroke-linecap="square"/>`;
/** Control connection (CT secondary solid, trip dashed 5/4), as the exemplar draws them. */
const control = (x1, y1, x2, y2, dash = "") =>
  `<path d="M ${n2(x1)} ${n2(y1)} L ${n2(x2)} ${n2(y2)}" fill="none" stroke="${LINE}" stroke-width="${W_CTRL}" stroke-linecap="${dash ? "butt" : "square"}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
const dot = (x, y, r = DOT) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="${LINE}"/>`;

const letter = (tx, ty, s, size, weight = 700) =>
  `<text x="${n2(tx)}" y="${n2(ty)}" font-family="${FONT_SVG}" font-size="${size}" font-weight="${weight}" fill="${INK}" text-anchor="middle">${esc(s)}</text>`;
const stroke = `stroke="${LINE}" stroke-width="${W_SYM}"`;
const thin = `stroke="${LINE}" stroke-width="${W_GLYPH}" fill="none" stroke-linecap="round"`;

/** Three-bar ground (IEEE 315 §3.9.1) whose top bar is at `top`. */
const groundBars = (gx, top) =>
  `<path d="M ${gx - 8} ${top} L ${gx + 8} ${top} M ${gx - 5} ${top + 4} L ${gx + 5} ${top + 4} M ${gx - 2} ${top + 8} L ${gx + 2} ${top + 8}" ${thin}/>`;

/** Wye connection glyph whose neutral runs down to a ground; top of the arms at `top`. */
const wyeGround = (gx, top) => [
  `<path d="M ${gx - 6} ${top} L ${gx} ${top + 6} L ${gx + 6} ${top} M ${gx} ${top + 6} L ${gx} ${top + 21}" ${thin}/>`,
  groundBars(gx, top + 21),
];

/** Single-throw contact arm, hinged on the lower terminal, 38 px between terminals. */
const arm = (x, y) => [
  `<path d="M ${x} ${y + 19} L ${x + 11} ${y - 11}" fill="none" stroke="${LINE}" stroke-width="${W_ARM}" stroke-linecap="round"/>`,
  dot(x, y + 19),
  dot(x, y - 19),
];
const armStubs = (x, y) => [wire(x, y - 19 - STUB, x, y - 19), wire(x, y + 19, x, y + 19 + STUB)];

// Round 2 reuses the reviewed bodies without changing their original SVGs.
const accepted = (id, x, y) => SYMBOLS.find((s) => s.id === id).draw(x, y);
const delta = (gx, top) => `<path d="M ${gx} ${top} L ${gx + 6.5} ${top + 11} L ${gx - 6.5} ${top + 11} Z" ${thin} stroke-linejoin="round"/>`;
const wye = (gx, top) => `<path d="M ${gx - 6} ${top} L ${gx} ${top + 6} L ${gx + 6} ${top} M ${gx} ${top + 6} L ${gx} ${top + 13}" ${thin}/>`;
const winding = (x, yy, sweep) => `<path d="M ${x - 18} ${yy} A 6 6 0 0 ${sweep} ${x - 6} ${yy} A 6 6 0 0 ${sweep} ${x + 6} ${yy} A 6 6 0 0 ${sweep} ${x + 18} ${yy}" fill="none" ${stroke} stroke-linecap="round"/>`;

// Each symbol: wires first, then the body, as the exemplar layers them. Order: by usage.
const SYMBOLS = [
  {
    id: "breaker-lv",
    title: "Low-voltage air circuit breaker",
    draw: (x = 0, y = 0) => [
      ...armStubs(x, y),
      ...arm(x, y),
      // arc hook: stays below the upper terminal and clear of its dot
      `<path d="M ${x + 11} ${y - 11} A 6 6 0 0 0 ${x + 8} ${y - 17.5}" fill="none" stroke="${LINE}" stroke-width="1.6" stroke-linecap="round"/>`,
    ],
  },
  {
    id: "utility",
    title: "Utility source",
    draw: (x = 0, y = 0) => [
      wire(x, y + 17, x, y + 17 + STUB),
      `<circle cx="${x}" cy="${y}" r="17" fill="white" ${stroke}/>`,
      `<path d="M ${x - 9} ${y} Q ${x - 4.5} ${y - 9} ${x} ${y} T ${x + 9} ${y}" ${thin}/>`,
    ],
  },
  {
    id: "bus",
    title: "Bus with an incoming connection and two feeder taps",
    draw: (x = 0, y = 0) => [
      wire(x, y - STUB, x, y),
      wire(x - 36, y, x - 36, y + STUB),
      wire(x + 36, y, x + 36, y + STUB),
      wire(x - 60, y, x + 60, y, W_BUS),
      dot(x, y, 3), dot(x - 36, y, 3), dot(x + 36, y, 3),
    ],
  },
  {
    id: "load",
    title: "Load",
    draw: (x = 0, y = 0) => [
      wire(x, y - 13 - STUB, x, y - 13),
      `<path d="M ${x - 14} ${y - 13} L ${x + 14} ${y - 13} L ${x} ${y + 13} Z" fill="white" ${stroke} stroke-linejoin="miter"/>`,
    ],
  },
  {
    id: "generator",
    title: "Generator, grounded-wye stator",
    draw: (x = 0, y = 0) => [
      wire(x, y + 17, x, y + 17 + STUB),
      `<circle cx="${x}" cy="${y}" r="17" fill="white" ${stroke}/>`,
      letter(x, y - 1, "G", 13),
      `<path d="M ${x - 7} ${y + 8} Q ${x - 3.5} ${y + 2} ${x} ${y + 8} T ${x + 7} ${y + 8}" ${thin}/>`,
      ...wyeGround(x - 26.5, y - 8),
    ],
  },
  {
    id: "ats",
    title: "Automatic transfer switch, resting on its normal source",
    draw: (x = 0, y = 0) => {
      const py = y + 20;
      return [
        wire(x - 22, y - 24 - STUB, x - 22, y - 24),
        wire(x + 22, y - 24 - STUB, x + 22, y - 24),
        wire(x, y + 24, x, y + 24 + STUB),
        `<path d="M ${x - 22} ${y - 24} L ${x - 22} ${y - 8} M ${x + 22} ${y - 24} L ${x + 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="${W_LINE}"/>`,
        `<circle cx="${x - 22}" cy="${y - 8}" r="2.6" fill="${LINE}"/><circle cx="${x + 22}" cy="${y - 8}" r="2.6" fill="${LINE}"/>`,
        `<path d="M ${x} ${py} L ${x - 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="${W_ARM}" stroke-linecap="round"/>`,
        `<path d="M ${x} ${py} L ${x + 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="1.3" stroke-dasharray="3 3"/>`,
        `<path d="M ${x} ${py} L ${x} ${y + 24}" fill="none" stroke="${LINE}" stroke-width="${W_LINE}"/>`,
        `<circle cx="${x}" cy="${py}" r="3" fill="${LINE}"/>`,
        `<text x="${x - 28}" y="${y - 12}" font-family="${FONT_SVG}" font-size="9" font-weight="700" fill="${INK}" text-anchor="end">N</text>`,
        `<text x="${x + 28}" y="${y - 12}" font-family="${FONT_SVG}" font-size="9" font-weight="700" fill="${INK}">E</text>`,
      ];
    },
  },
  {
    id: "watthour-meter",
    title: "Watthour meter",
    draw: (x = 0, y = 0) => [
      wire(x, y - 13 - STUB, x, y - 13),
      wire(x, y + 13, x, y + 13 + STUB),
      `<circle cx="${x}" cy="${y}" r="13" fill="white" ${stroke}/>`,
      letter(x, y + 4, "Wh", 10, 600),
    ],
  },
  {
    id: "switch",
    title: "Disconnect switch, device 89",
    draw: (x = 0, y = 0) => [...armStubs(x, y), ...arm(x, y)],
  },
  {
    id: "switch-load",
    title: "Load-interrupter switch",
    draw: (x = 0, y = 0) => [
      ...armStubs(x, y),
      ...arm(x, y),
      // interrupter around the fixed contact: the chamber that breaks load current (a buildup, IEEE 315 A3.1)
      `<rect x="${x - 4.5}" y="${y - 25}" width="9" height="12" fill="white" stroke="${LINE}" stroke-width="${W_GLYPH}"/>`,
      dot(x, y - 19),
    ],
  },
  {
    id: "vfd",
    title: "Variable-frequency drive",
    draw: (x = 0, y = 0) => [
      wire(x, y - 16 - STUB, x, y - 16),
      wire(x, y + 16, x, y + 16 + STUB),
      `<rect x="${x - 30}" y="${y - 16}" width="60" height="32" fill="white" ${stroke}/>`,
      letter(x, y + 4, "VFD", 11),
    ],
  },
  {
    id: "surge-arrester",
    title: "Surge arrester, connected from the conductor to ground",
    draw: (x = 0, y = 0) => [
      wire(x, y - 14 - STUB, x, y - 14),
      wire(x, y + 14, x, y + 22),
      `<rect x="${x - 10}" y="${y - 14}" width="20" height="28" fill="white" ${stroke}/>`,
      `<path d="M ${x} ${y - 14} L ${x} ${y - 9} M ${x - 5} ${y - 9} L ${x + 5} ${y - 9} L ${x} ${y - 2} Z M ${x - 5} ${y + 9} L ${x + 5} ${y + 9} L ${x} ${y + 2} Z M ${x} ${y + 9} L ${x} ${y + 14}" ${thin} stroke-linejoin="round"/>`,
      groundBars(x, y + 22),
    ],
  },
  {
    id: "transformer",
    title: "Two-winding transformer",
    draw: (x = 0, y = 0) => {
      const hump = (yy, sweep) => `M ${x - 18} ${yy} A 6 6 0 0 ${sweep} ${x - 6} ${yy} A 6 6 0 0 ${sweep} ${x + 6} ${yy} A 6 6 0 0 ${sweep} ${x + 18} ${yy}`;
      return [
        wire(x, y - 16 - STUB, x, y - 16),
        wire(x, y + 16, x, y + 16 + STUB),
        `<path d="${hump(y - 10, 1)}" fill="none" ${stroke} stroke-linecap="round"/>`,
        `<path d="${hump(y + 10, 0)}" fill="none" ${stroke} stroke-linecap="round"/>`,
        `<path d="M ${x - 22} ${y - 3} L ${x + 22} ${y - 3} M ${x - 22} ${y + 3} L ${x + 22} ${y + 3}" fill="none" stroke="${LINE}" stroke-width="1.2"/>`,
      ];
    },
  },
  {
    id: "solar",
    title: "Photovoltaic array",
    draw: (x = 0, y = 0) => [
      wire(x, y + 12, x, y + 12 + STUB),
      `<rect x="${x - 19}" y="${y - 12}" width="38" height="24" fill="white" ${stroke}/>`,
      `<path d="M ${x - 19} ${y} L ${x + 19} ${y} M ${x - 6.33} ${y - 12} L ${x - 6.33} ${y + 12} M ${x + 6.33} ${y - 12} L ${x + 6.33} ${y + 12}" fill="none" stroke="${LINE}" stroke-width="1"/>`,
      // incident light (IEEE 315 §8.7.3): two arrows into the array's upper left corner
      `<path d="M ${x - 33} ${y - 25} L ${x - 24} ${y - 16} M ${x - 26} ${y - 29} L ${x - 17} ${y - 20}" ${thin}/>`,
      `<path d="M ${x - 22} ${y - 14} L ${x - 23.4} ${y - 19.7} L ${x - 27.7} ${y - 15.4} Z M ${x - 15} ${y - 18} L ${x - 16.4} ${y - 23.7} L ${x - 20.7} ${y - 19.4} Z" fill="${LINE}"/>`,
    ],
  },
  {
    id: "motor",
    title: "Motor",
    draw: (x = 0, y = 0) => [
      wire(x, y - 15 - STUB, x, y - 15),
      `<circle cx="${x}" cy="${y}" r="15" fill="white" ${stroke}/>`,
      letter(x, y + 5, "M", 13),
    ],
  },
  {
    id: "ct",
    title: "Current transformer, with its secondary lead",
    draw: (x = 0, y = 0) => [
      wire(x, y - 9 - STUB, x, y - 9),
      wire(x, y + 9, x, y + 9 + STUB),
      control(x - 9, y, x - 9 - STUB, y),
      `<circle cx="${x}" cy="${y}" r="9" fill="white" ${stroke}/>`,
      letter(x, y + 3, "CT", 8),
    ],
  },
  {
    id: "fuse",
    title: "Fuse",
    draw: (x = 0, y = 0) => [
      wire(x, y - 15 - STUB, x, y - 15),
      wire(x, y + 15, x, y + 15 + STUB),
      `<rect x="${x - 6}" y="${y - 15}" width="12" height="30" fill="white" ${stroke}/>`,
    ],
  },
  {
    id: "relay",
    title: "Protective relay 50/51, with CT input and trip output",
    draw: (x = 0, y = 0) => [
      control(x + 19, y, x + 19 + STUB, y),
      control(x, y - 19, x, y - 19 - STUB, "5 4"),
      `<circle cx="${x}" cy="${y}" r="19" fill="white" stroke="${LINE}" stroke-width="1.3"/>`,
      letter(x, y + 3.5, "50/51", 9.5),
    ],
  },
  {
    id: "transformer-dy",
    title: "Two-winding transformer, delta primary, grounded-wye secondary",
    draw: (x = 0, y = 0) => {
      const hump = (yy, sweep) => `M ${x - 18} ${yy} A 6 6 0 0 ${sweep} ${x - 6} ${yy} A 6 6 0 0 ${sweep} ${x + 6} ${yy} A 6 6 0 0 ${sweep} ${x + 18} ${yy}`;
      const gx = x - 33;
      return [
        wire(x, y - 16 - STUB, x, y - 16),
        wire(x, y + 16, x, y + 16 + STUB),
        `<path d="${hump(y - 10, 1)}" fill="none" ${stroke} stroke-linecap="round"/>`,
        `<path d="${hump(y + 10, 0)}" fill="none" ${stroke} stroke-linecap="round"/>`,
        `<path d="M ${x - 22} ${y - 3} L ${x + 22} ${y - 3} M ${x - 22} ${y + 3} L ${x + 22} ${y + 3}" fill="none" stroke="${LINE}" stroke-width="1.2"/>`,
        `<path d="M ${gx} ${y - 17} L ${gx + 6.5} ${y - 6} L ${gx - 6.5} ${y - 6} Z" fill="none" stroke="${LINE}" stroke-width="${W_GLYPH}" stroke-linejoin="round"/>`,
        ...wyeGround(gx, y + 5),
      ];
    },
  },
  {
    id: "panel",
    title: "Panelboard",
    draw: (x = 0, y = 0) => [
      wire(x, y - 16 - STUB, x, y - 16),
      `<rect x="${x - 40}" y="${y - 16}" width="80" height="32" fill="white" ${stroke}/>`,
      `<path d="M ${x - 40} ${y - 6} L ${x + 40} ${y - 6}" fill="none" stroke="${LINE}" stroke-width="1"/>`,
    ],
  },
  {
    id: "breaker-mv",
    title: "Medium-voltage circuit breaker, device 52",
    draw: (x = 0, y = 0) => [
      wire(x, y - 15 - STUB, x, y - 15),
      wire(x, y + 15, x, y + 15 + STUB),
      `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" fill="white" ${stroke}/>`,
      letter(x, y + 4, "52", 11),
    ],
  },
  {
    id: "ground-fault", title: "Ground-fault relay, devices 50G / 51G",
    engine: "ground_fault", dsl: ['ground_fault [device: "50G/51G"]'],
    standard: "IEEE 315-1975 §9.5.10 relay with attached ground; IEEE C37.2 50G / 51G",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 379,
    notes: "The accepted r = 19 relay circle and its solid CT input / dashed trip stubs, with an attached three-bar ground 4 px below the circle ink. The 50/51 lettering plus attached ground identifies ground overcurrent; the engine instead draws a power-path GFI meter-like circle without a ground.",
    draw: (x = 0, y = 0) => [
      ...accepted("relay", x, y),
      control(x, y + 19, x, y + 24.3), groundBars(x, y + 24.3),
    ],
  },
  {
    id: "ups", title: "Uninterruptible power supply",
    engine: "ups", dsl: ["ups"], standard: "IEEE 315-1975 §16.1 lettered circuit-element rectangle",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 318,
    notes: "The accepted 60 x 32 VFD equipment rectangle, lettered UPS, with 12 px input and output stubs. The engine has a narrower box and no stubs. Usage is inflated by matches in ordinary label text.",
    draw: (x = 0, y = 0) => accepted("vfd", x, y).map((s) => s.replace(">VFD<", ">UPS<")),
  },
  {
    id: "pt", title: "Potential (voltage) transformer",
    engine: "pt", dsl: ["pt"], standard: "One-line PT bubble; IEEE 315-1975 §6.4.20 gives the voltage-transformer coil form",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 126,
    notes: "Uses the accepted r = 9 instrument-transformer bubble, PT lettering and 12 px control secondary stub. Connect the primary as a voltage-sensing shunt in a complete diagram. The engine bubble is smaller and omits the secondary lead.",
    draw: (x = 0, y = 0) => accepted("ct", x, y).map((s) => s.replace(">CT<", ">PT<")),
  },
  {
    id: "capacitor-bank", title: "Capacitor bank",
    engine: "capacitor_bank", dsl: ["capacitor_bank"], standard: "IEEE 315-1975 §2.2 capacitor, nonpolarized",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 93,
    notes: "One pair of equal parallel plates represents the bank in a one-line; voltage and kvar belong in the rating. Both leads are 12 px. The engine draws four unconnected plates with heavier strokes.",
    draw: (x = 0, y = 0) => [
      wire(x, y - 4 - STUB, x, y - 4), wire(x, y + 4, x, y + 4 + STUB),
      wire(x - 12, y - 4, x + 12, y - 4), wire(x - 12, y + 4, x + 12, y + 4),
    ],
  },
  {
    id: "ground-switch", title: "Grounding switch, device 89",
    engine: "ground_switch", dsl: ["ground_switch"], standard: "IEEE 315-1975 §4.6.1 switch to §3.9.1 ground; IEEE C37.2 device 89",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 85,
    notes: "The accepted open disconnect, with the lower hinged terminal connected through its 12 px stub to the accepted ground bars. No outgoing power terminal. The engine shortens the arm and lower lead.",
    draw: (x = 0, y = 0) => [...accepted("switch", x, y), groundBars(x, y + 19 + STUB)],
  },
  {
    id: "bus-tie", title: "Bus-tie circuit breaker, device 52",
    engine: "bus_tie", dsl: ["bus_tie"], standard: "IEEE 315-1975 §9.4.2 air circuit breaker; IEEE C37.2 device 52",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 47,
    notes: "The accepted LV breaker rotated minus 90 degrees for a lateral bus tie, including its corrected hook, two dots and 12 px stubs. This is the intentional horizontal-run exception to vertical feeder power flow. The engine rotates its shorter breaker and floating hook.",
    draw: (x = 0, y = 0) => [`<g transform="translate(${x} ${y}) rotate(-90)">`, ...accepted("breaker-lv", 0, 0), "</g>"],
  },
  {
    id: "fuse-cl", title: "Current-limiting fuse",
    engine: "fuse_cl", dsl: ["fuse_cl"], standard: "IEEE 315-1975 §9.1.1 fuse; CL is a rating qualifier",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 42,
    notes: "The accepted 12 x 30 fuse with bold CL beside it; current limitation is an equipment characteristic, not an invented extra plate. The engine adds a transverse line inside a shorter fuse body.",
    draw: (x = 0, y = 0) => [...accepted("fuse", x, y), letter(x + 22, y + 3.5, "CL", 9.5)],
  },
  {
    id: "transformer-yd", title: "Transformer, grounded-wye primary / delta secondary",
    engine: "transformer_yd", dsl: ['transformer_yd [grounding: "primary grounded wye"]'],
    standard: "IEEE 315-1975 §6.4.2.1 transformer; §6.4.15.1 winding connections; §3.9.1 ground",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 31,
    notes: "The accepted transformer coils and core with grounded-wye beside the upper winding and delta beside the lower winding, both stacked on the left at the accepted 33 px offset. The primary glyph moves up 12 px and the secondary down 1 px from the delta-wye layout, leaving 4.7 px of ink clearance between the ground mark and delta. The engine uses smaller coils, text Y / delta, and no attached ground.",
    draw: (x = 0, y = 0) => [...accepted("transformer", x, y), ...wyeGround(x - 33, y - 29), delta(x - 33, y + 6)],
  },
  {
    id: "demand-meter", title: "Demand meter",
    engine: "demand_meter", dsl: ["demand_meter"], standard: "IEEE 315-1975 §12.1 meter, letters DM",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 29,
    notes: "The accepted r = 13 meter circle and 12 px stubs, with bold DM at 10 px. The engine uses a smaller circle and only the letter D.",
    draw: (x = 0, y = 0) => accepted("watthour-meter", x, y).map((s) => s.replace(">Wh<", ">DM<").replace('font-weight="600"', 'font-weight="700"')),
  },
  {
    id: "recloser", title: "Circuit breaker with automatic reclosing, devices 52 / 79",
    engine: "recloser", dsl: ['recloser [device: "52/79"]'],
    standard: "IEEE 315-1975 §9.4.4 breaker and §9.5.1 relay; IEEE C37.2 52 breaker / 79 AC reclosing relay",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 5,
    notes: "Accepted 30 x 30 device-52 breaker plus an accepted device-79 relay circle, joined by a 12 px dashed control link. This explicitly distinguishes the interrupting device from its reclosing function; the engine uses an unnumbered curved arrow beside its contact.",
    draw: (x = 0, y = 0) => [
      ...accepted("breaker-mv", x, y),
      `<g transform="translate(${x + 46} ${y}) rotate(-90)">`,
      control(0, -19, 0, -19 - STUB, "5 4"), "</g>",
      `<circle cx="${x + 46}" cy="${y}" r="19" fill="white" stroke="${LINE}" stroke-width="1.3"/>`,
      letter(x + 46, y + 3.5, "79", 9.5),
    ],
  },
  {
    id: "contactor", title: "Electromagnetic contactor / motor starter",
    engine: null, dsl: ["contactor"], standard: "IEEE 315-1975 §4.29 contactor; §4.6 normal contact position",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "Accepted open switch contact with a dashed mechanical link to an electromagnetic actuator rectangle. Shown de-energized; overload protection is not implied. The parser and renderer accept contactor, but getSymbolCatalog omits it; the renderer uses a shorter blade and smaller actuator.",
    draw: (x = 0, y = 0) => [
      ...accepted("switch", x, y), control(x + 7, y, x + 23, y, "3 3"),
      `<rect x="${x + 23}" y="${y - 7}" width="10" height="14" fill="white" ${stroke}/>`,
    ],
  },
  {
    id: "transformer-yy", title: "Transformer, wye / wye",
    engine: "transformer_yy", dsl: ["transformer_yy"], standard: "IEEE 315-1975 §6.4.2.1 transformer; §6.4.15.2 winding connections",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 2,
    notes: "The accepted two-winding transformer with two ungrounded wye glyphs at the accepted 33 px offset; no grounding is assumed. The engine uses smaller coils and font characters instead of drawn connection glyphs.",
    draw: (x = 0, y = 0) => [...accepted("transformer", x, y), wye(x - 33, y - 17), wye(x - 33, y + 5)],
  },
  {
    id: "transformer-dd", title: "Transformer, delta / delta",
    engine: "transformer_dd", dsl: ["transformer_dd"], standard: "IEEE 315-1975 §6.4.2.1 transformer; §6.4.15.1 winding connections",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "The accepted two-winding transformer with two drawn delta glyphs at the accepted 33 px offset. The engine uses smaller coils and font characters instead of drawn connection glyphs.",
    draw: (x = 0, y = 0) => [...accepted("transformer", x, y), delta(x - 33, y - 17), delta(x - 33, y + 5)],
  },
  {
    id: "hub", title: "Synchronizing hub (functional block)",
    engine: "hub", dsl: ['hub [label: "Synchronizing hub"]'],
    standard: "No IEEE 315 apparatus symbol; §16.1 lettered circuit-element rectangle used as a functional block",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: 58,
    notes: "Uses the accepted equipment rectangle lettered HUB; it denotes an application-defined functional block, not standardized power apparatus or a device-25 relay. Vertical 12 px stubs. The engine uses a wider rounded box with additional lateral ports.",
    draw: (x = 0, y = 0) => accepted("vfd", x, y).map((s) => s.replace(">VFD<", ">HUB<")),
  },
  {
    id: "wind", title: "Wind-driven AC generator",
    engine: "wind", dsl: ['wind [label: "Wind generator"]'],
    standard: "No IEEE 315 wind-turbine apparatus symbol; §13.1.2 AC generator with prime-mover label (not §21.1 map symbol)",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: 19,
    notes: "Reuses the accepted generator circle, G and sine wave, with bold WIND identifying the prime mover and one downward 12 px output. Grounding is unspecified. The engine draws a turbine pictogram rather than an electrical generator.",
    draw: (x = 0, y = 0) => [...accepted("generator", x, y).slice(0, 4), letter(x, y - 25, "WIND", 9)],
  },
  {
    id: "harmonic-filter", title: "Harmonic filter, series LC branch",
    engine: "harmonic_filter", dsl: ["harmonic_filter"], standard: "IEEE 315-1975 §6.2 inductor with §2.2 capacitor",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: 16,
    notes: "A continuous series LC branch built from three r = 6 coil humps rotated into vertical flow, then two capacitor plates. External stubs are 12 px. Branch topology / tuning belong in the diagram and rating. The engine's horizontal coil and offset plates do not form a connected LC path.",
    draw: (x = 0, y = 0) => [
      wire(x, y - 24 - STUB, x, y - 24),
      `<g transform="translate(${x} ${y - 6}) rotate(90)">${winding(0, 0, 1)}</g>`,
      wire(x, y + 12, x, y + 20),
      wire(x - 12, y + 20, x + 12, y + 20), wire(x - 12, y + 28, x + 12, y + 28),
      wire(x, y + 28, x, y + 28 + STUB),
    ],
  },
  {
    id: "autotransformer", title: "Autotransformer, single tapped winding",
    engine: "autotransformer", dsl: ["autotransformer"], standard: "IEEE 315-1975 §6.4.8 autotransformer",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: 16,
    notes: "One electrically continuous winding with four r = 6 humps and a connected midpoint tap, not isolated primary and secondary coils. Input at top, common and tapped output below, each with 12 px terminal stub. The engine uses compressed humps and a short lateral tap without a junction dot.",
    draw: (x = 0, y = 0) => [
      wire(x, y - 24 - STUB, x, y - 24), wire(x, y + 24, x, y + 24 + STUB),
      `<path d="M ${x} ${y - 24} A 6 6 0 0 0 ${x} ${y - 12} A 6 6 0 0 0 ${x} ${y} A 6 6 0 0 0 ${x} ${y + 12} A 6 6 0 0 0 ${x} ${y + 24}" fill="none" ${stroke} stroke-linecap="round"/>`,
      wire(x, y, x + 18, y), wire(x + 18, y, x + 18, y + 24), wire(x + 18, y + 24, x + 18, y + 24 + STUB), dot(x, y),
    ],
  },
  {
    id: "transformer-3winding", title: "Three-winding transformer",
    engine: "transformer_3winding", dsl: ["transformer_3winding"], standard: "IEEE 315-1975 §6.4.17 three-winding transformer",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: 9,
    notes: "Three separate accepted three-hump windings at r = 6: primary above, two secondary windings below with independent 12 px output stubs. The shared core lines extend to span both secondaries at the accepted 1.2 weight. No electrical junction between windings. The engine shrinks the humps to r = 3 and uses only one core line.",
    draw: (x = 0, y = 0) => [
      wire(x, y - 16 - STUB, x, y - 16),
      wire(x - 24, y + 16, x - 24, y + 16 + STUB), wire(x + 24, y + 16, x + 24, y + 16 + STUB),
      winding(x, y - 10, 1), winding(x - 24, y + 10, 0), winding(x + 24, y + 10, 0),
      `<path d="M ${x - 46} ${y - 3} L ${x + 46} ${y - 3} M ${x - 46} ${y + 3} L ${x + 46} ${y + 3}" fill="none" stroke="${LINE}" stroke-width="1.2"/>`,
    ],
  },
  {
    id: "sectionalizer", title: "Automatic line sectionalizer",
    engine: "sectionalizer", dsl: ['sectionalizer [label: "Sectionalizer"]'],
    standard: "IEEE 315-1975 §4.6.1 switch in its normal contact position; S is a utility sectionalizer qualifier, not a dedicated IEEE 315 symbol",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: 5,
    notes: "The accepted open disconnect with bold S beside the contact, retaining the 2.2 px arm, r = 2.8 terminal dots and vertical 12 px stubs. A sectionalizer opens during the upstream recloser's dead interval; no breaker hook or device-79 reclosing relay is implied. The engine uses a shorter contact and smaller qualifier.",
    draw: (x = 0, y = 0) => [...accepted("switch", x, y), letter(x + 24, y + 3.5, "S", 9.5)],
  },
  {
    id: "rcd", title: "Residual-current protective device",
    engine: null, dsl: ['rcd [sensitivity: "30 mA"]', "rcbo", "rccb"],
    standard: "IEEE 315-1975 §9.4.2 air circuit breaker with residual-current qualifier IΔn; ANSI-style buildup, not a dedicated IEEE 315 RCD symbol",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "The accepted LV breaker, including its open arm and corrected arc hook, with bold IΔn identifying residual-current operation. Vertical 12 px stubs; sensitivity and any overcurrent function belong in the equipment rating. The parser accepts rcd / rcbo / rccb, but getSymbolCatalog omits rcd; the engine draws a rounded RCD box. This requested ANSI-style buildup does not claim a standalone ANSI RCD symbol.",
    draw: (x = 0, y = 0) => [...accepted("breaker-lv", x, y), letter(x + 34, y + 3.5, "IΔn", 9.5)],
  },
];

/** Inked extent of a fragment (strokes included), rounded outward to whole units. */
function extent(body) {
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400" width="400" height="400">${body}</svg>`;
  const b = new Resvg(probe).innerBBox();
  if (!b) throw new Error("empty symbol");
  // innerBBox is reported in viewBox (user) units. Text is not reliably measured without the
  // exemplar's fonts installed, so each label also adds an estimated box: 0.62 em per character,
  // cap height above the baseline and a descender below, placed by its text-anchor.
  let x0 = b.x, y0 = b.y, x1 = b.x + b.width, y1 = b.y + b.height;
  for (const m of body.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const attr = (name) => new RegExp(`\\b${name}="([^"]*)"`).exec(m[1])?.[1];
    const size = Number(attr("font-size") ?? 11), w = m[2].length * size * 0.62;
    const tx = Number(attr("x") ?? 0), ty = Number(attr("y") ?? 0), anchor = attr("text-anchor") ?? "start";
    const left = anchor === "end" ? tx - w : anchor === "middle" ? tx - w / 2 : tx;
    x0 = Math.min(x0, left); x1 = Math.max(x1, left + w);
    y0 = Math.min(y0, ty - size * 0.8); y1 = Math.max(y1, ty + size * 0.25);
  }
  return { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) };
}

export function symbolSvg(s) {
  const body = s.draw().join("\n");
  const e = extent(body);
  const vx = e.x0 - PAD, vy = e.y0 - PAD, vw = e.x1 - e.x0 + 2 * PAD, vh = e.y1 - e.y0 + 2 * PAD;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}" role="img">\n<title>${esc(s.title)}</title>\n${body}\n</svg>\n`;
}

export { SYMBOLS, GLYPH_GAP };

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL("../../../visual-eval/symbols/sld/", import.meta.url);
  await mkdir(dir, { recursive: true });
  const manifestUrl = new URL("manifest.json", dir);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  for (const s of SYMBOLS) {
    const svg = symbolSvg(s);
    await writeFile(new URL(`${s.id}.svg`, dir), svg);
    console.log(`${s.id}: viewBox ${svg.match(/viewBox="([^"]+)"/)[1]}`);
    if (s.tier) {
      const { draw, title, ...metadata } = s;
      const entry = { id: s.id, label: title, file: `${s.id}.svg`, ...metadata };
      const index = manifest.symbols.findIndex((item) => item.id === s.id);
      if (index < 0) manifest.symbols.push(entry);
      else manifest.symbols[index] = entry;
    }
  }
  await writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + "\n");
}
