/** Draw visual-eval/symbols/pid/ — the P&ID symbols in the pid exemplar's style.
 *
 *   node scripts/visual-eval/symbols/draw-pid.mjs
 *
 * Constants and drawing idioms are lifted from scripts/visual-eval/draw-pid-exemplar.mjs
 * so every symbol keeps the exemplar's ink, fills, stroke weights and scale. Each
 * symbol is drawn in its own coordinates at exemplar size (1 unit = 1 exemplar px),
 * with short line stubs where the exemplar connects to it. Stubs are painted first
 * and run a unit into the symbol, so the white symbol fill hides the joint.
 *
 * Where the exemplar departs from ANSI/ISA-5.1 or ISO 10628-2, the library follows the
 * standard and the symbol's notes say what changed: the shared control-room bubble, the
 * pump, the control-valve stem, vessel head depth, the pneumatic signal mark and the
 * relief valve body. Text advances are measured with Resvg, also used for verification, so every tag
 * fits inside its bubble and inside the viewBox.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const INK = "#1E293B", PAPER = "#FFFFFF";
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const SW = { process: 2.5, minor: 1.5, signal: 1.4, symbol: 1.6 };
const R_BUB = 18, PAD = 8, STUB = 24;
/** Cap height and descent of the font stack, as fractions of the font size. */
const ASC = 0.78, DESC = 0.24, CAP = 0.73;

const n2 = (v) => Number(v.toFixed(2));
const pts = (p) => p.map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ");

const cache = new Map();
const measure = async (s, fs, weight) => {
  // Shape once at 100 units; font advances scale linearly. The last path is a
  // trailing vertical-bar glyph, whose displacement gives the text advance.
  // Resvg getBBox also includes unpainted paths, so inspect the marker path.
  const markerX = (prefix) => {
    const key = `${weight}|${prefix}`;
    if (!cache.has(key)) {
      const svg = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="200"><text x="0" y="100" font-family="${FONT}" font-size="100" font-weight="${weight}" fill="none">${prefix}<tspan fill="${INK}">|</tspan></text></svg>`).toString();
      const paths = [...svg.matchAll(/<path[^>]* d="M ([\d.-]+)/g)];
      cache.set(key, Number(paths.at(-1)[1]));
    }
    return cache.get(key);
  };
  return (markerX(s) - markerX("")) * fs / 100;
};

const sheet = () => {
  const s = { g: [], x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  s.ext = (x0, y0, x1, y1, sw = 0) => {
    s.x0 = Math.min(s.x0, x0 - sw / 2); s.y0 = Math.min(s.y0, y0 - sw / 2);
    s.x1 = Math.max(s.x1, x1 + sw / 2); s.y1 = Math.max(s.y1, y1 + sw / 2);
  };
  s.extPts = (p, sw) => { for (const [x, y] of p) s.ext(x, y, x, y, sw); };
  return s;
};
const stroke = (sw) => `stroke="${INK}" stroke-width="${sw}"`;
const line = (s, x1, y1, x2, y2, sw = SW.symbol) => {
  s.ext(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2), sw);
  s.g.push(`<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" ${stroke(sw)}/>`);
};
const text = async (s, str, x, y, fs, weight = 400) => {
  const w = await measure(str, fs, weight);
  s.ext(x - w / 2, y - ASC * fs, x + w / 2, y + DESC * fs);
  s.g.push(`<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT}" font-size="${n2(fs)}"${weight === 400 ? "" : ` font-weight="${weight}"`} fill="${INK}" text-anchor="middle">${str}</text>`);
};

/* ---------- line types (exemplar, with the ISA-5.1 pneumatic mark) ---------- */
const walk = (p, step, fn) => {
  let carry = step / 2;
  for (let i = 0; i + 1 < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (!len) continue;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    for (let d = carry; d < len; d += step) fn(x1 + ux * d, y1 + uy * d, ux, uy);
    carry = ((carry - len) % step + step) % step;
  }
};
const pipe = (s, p, minor = false) => {
  const sw = minor ? SW.minor : SW.process;
  s.extPts(p, sw);
  s.g.push(`<polyline points="${pts(p)}" fill="none" ${stroke(sw)} stroke-linejoin="miter" stroke-linecap="butt"/>`);
};
/** ISA-5.1 Table 5.3.2 no. 6: dashed. Stub lengths are picked to end on a whole dash. */
const electric = (s, p) => {
  s.extPts(p, SW.signal);
  s.g.push(`<polyline points="${pts(p)}" fill="none" ${stroke(SW.signal)} stroke-dasharray="7 5"/>`);
};
/** ISA-5.1 Table 5.3.2 no. 5: a pair of short parallel slashes at intervals. A single
 *  slash (no. 4) means an undefined signal, which is what the exemplar draws. */
const pneumatic = (s, p) => {
  s.extPts(p, SW.signal);
  s.g.push(`<polyline points="${pts(p)}" fill="none" ${stroke(SW.signal)}/>`);
  walk(p, 34, (x, y, ux, uy) => {
    const dx = (ux + uy) / Math.SQRT2, dy = (uy - ux) / Math.SQRT2, k = 6;
    for (const o of [-2.5, 2.5]) line(s, x + ux * o - dx * k, y + uy * o - dy * k, x + ux * o + dx * k, y + uy * o + dy * k, SW.signal);
  });
};
/** ISA-5.1 Table 5.3.1 no. 1: instrument connection to process, a plain light line. */
const connection = (s, p) => {
  s.extPts(p, SW.signal);
  s.g.push(`<polyline points="${pts(p)}" fill="none" ${stroke(SW.signal)}/>`);
};

/* ---------- shared bodies ---------- */
/** Every valve is the same 44 x 28 bowtie; the type is whatever sits on or in it. */
const bowtie = (s, cx = 0, cy = 0, w = 44, h = 28) => {
  s.ext(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, SW.symbol);
  s.g.push(`<path d="M ${cx - w / 2} ${cy - h / 2} L ${cx - w / 2} ${cy + h / 2} L ${cx} ${cy} Z M ${cx + w / 2} ${cy - h / 2} L ${cx + w / 2} ${cy + h / 2} L ${cx} ${cy} Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
};
const inlineStubs = (s, half = 22) => {
  pipe(s, [[-half - STUB, 0], [-half + 1, 0]]);
  pipe(s, [[half - 1, 0], [half + STUB, 0]]);
};
/** ISO 10628-2 pump casing: circle plus the two lines converging on the discharge point. */
const pumpCasing = (s, r = 30) => {
  pipe(s, [[-r - STUB, 0], [-r + 1, 0]]);          // suction
  pipe(s, [[r - 1, 0], [r + STUB, 0]]);            // discharge, at the convergence point
  s.ext(-r, -r, r, r, SW.symbol);
  s.g.push(`<circle cx="0" cy="0" r="${r}" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  s.g.push(`<polyline points="0,${-r} ${r},0 0,${r}" fill="none" ${stroke(SW.symbol)} stroke-linejoin="miter"/>`);
};
/** Heads are 2:1 semi-ellipses: depth is a quarter of the shell diameter. */
const HEAD = (d) => d / 4;

/* ---------- equipment ---------- */
const drawPump = async () => {
  const s = sheet();
  pumpCasing(s);
  line(s, -30, 0, 30, 0);
  return s;
};

/** ISO 10628-2 reg. 8091 (gear type): the casing with two overlapping gear wheels. */
const drawPumpPD = async () => {
  const s = sheet();
  pumpCasing(s);
  for (const cy of [-8, 8]) s.g.push(`<circle cx="-6" cy="${cy}" r="9.5" fill="none" ${stroke(SW.symbol)}/>`);
  return s;
};

const drawVessel = async () => {
  const s = sheet(), w = 120, half = 140, ry = HEAD(w);
  const headAt = (dx) => ry * Math.sqrt(1 - (dx / (w / 2)) ** 2);
  const yNoz = -half - headAt(30);
  pipe(s, [[30, yNoz - STUB], [30, yNoz + 1.5]]);             // feed over the top
  pipe(s, [[-30, yNoz - STUB], [-30, yNoz + 1.5]], true);     // relief nozzle
  pipe(s, [[0, half + ry - 1.5], [0, half + ry + STUB]]);     // bottom drain
  s.ext(-w / 2, -half - ry, w / 2, half + ry, SW.symbol);
  s.g.push(`<path d="M ${-w / 2} ${-half} A ${w / 2} ${ry} 0 0 1 ${w / 2} ${-half} L ${w / 2} ${half} A ${w / 2} ${ry} 0 0 1 ${-w / 2} ${half} Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
  return s;
};

const drawVesselH = async () => {
  const s = sheet(), d = 120, half = 120, rx = HEAD(d);
  pipe(s, [[-80, -d / 2 - STUB], [-80, -d / 2 + 1]]);         // feed in over the top
  pipe(s, [[80, -d / 2 - STUB], [80, -d / 2 + 1]]);           // vapour out
  pipe(s, [[80, d / 2 - 1], [80, d / 2 + STUB]]);             // liquid out
  s.ext(-half - rx, -d / 2, half + rx, d / 2, SW.symbol);
  s.g.push(`<path d="M ${-half} ${-d / 2} L ${half} ${-d / 2} A ${rx} ${d / 2} 0 0 1 ${half} ${d / 2} L ${-half} ${d / 2} A ${rx} ${d / 2} 0 0 1 ${-half} ${-d / 2} Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
  return s;
};

/** Exemplar tank: flat bottom, straight shell, 26-deep dished roof (ISO 10628-2 X8200). */
const drawTank = async () => {
  const s = sheet(), w = 160, h = 140, dome = 26, top = -h / 2;
  pipe(s, [[0, top - dome - STUB], [0, top - dome + 1]]);     // inlet over the roof
  pipe(s, [[0, -top - 1], [0, -top + STUB]]);                 // bottom outlet
  s.ext(-w / 2, top - dome, w / 2, -top, SW.symbol);
  s.g.push(`<path d="M ${-w / 2} ${top} L ${-w / 2} ${-top} L ${w / 2} ${-top} L ${w / 2} ${top} A ${w / 2} ${dome} 0 0 0 ${-w / 2} ${top} Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
  return s;
};

/** ISO 10628-2 X8116: a closed housing with a dashed line for the filter medium. */
const drawFilter = async () => {
  const s = sheet(), w = 60, h = 100;
  pipe(s, [[0, -h / 2 - STUB], [0, -h / 2 + 1]]);
  pipe(s, [[0, h / 2 - 1], [0, h / 2 + STUB]]);
  s.ext(-w / 2, -h / 2, w / 2, h / 2, SW.symbol);
  s.g.push(`<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  for (const [a, b] of [[-25, -13], [-6, 6], [13, 25]]) line(s, a, 0, b, 0);
  return s;
};

/** ISO 10628-2 reg. 2511: shell with fixed tube sheets and straight tubes. Tube-side
 *  nozzles sit on the channels, shell-side nozzles between the tube sheets. */
const drawHX = async () => {
  const s = sheet(), w = 200, h = 60, sheetX = 76;
  pipe(s, [[-88, -h / 2 - STUB], [-88, -h / 2 + 1]]);         // tube side in
  pipe(s, [[88, h / 2 - 1], [88, h / 2 + STUB]]);             // tube side out
  pipe(s, [[56, -h / 2 - STUB], [56, -h / 2 + 1]]);           // shell side in
  pipe(s, [[-56, h / 2 - 1], [-56, h / 2 + STUB]]);           // shell side out
  s.ext(-w / 2, -h / 2, w / 2, h / 2, SW.symbol);
  s.g.push(`<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  for (const x of [-sheetX, sheetX]) line(s, x, -h / 2, x, h / 2);
  for (const y of [-18, -6, 6, 18]) line(s, -sheetX, y, sheetX, y);
  return s;
};

/* ---------- valves ---------- */
const drawGate = async () => { const s = sheet(); inlineStubs(s); bowtie(s); return s; };

/** ISA-5.1 Table 5.4.1 no. 1b / ISO X8068: the generic body with a solid dot at its centre. */
const drawGlobe = async () => {
  const s = sheet(); inlineStubs(s); bowtie(s);
  s.g.push(`<circle cx="0" cy="0" r="5" fill="${INK}"/>`);
  return s;
};

/** ISA-5.1 Table 5.4.1 no. 6 / ISO X8071: an open ball between the two triangles, which
 *  stop where they meet it. */
const drawBall = async () => {
  const s = sheet(), r = 10.5;
  inlineStubs(s);
  const t = r / Math.hypot(22, 14);                       // where the triangle edge meets the ball
  const bx = 22 * t, by = 14 * t;
  s.ext(-22, -14, 22, 14, SW.symbol);
  s.g.push(`<path d="M -22 -14 L -22 14 L ${n2(-bx)} ${n2(by)} L ${n2(-bx)} ${n2(-by)} Z M 22 -14 L 22 14 L ${n2(bx)} ${n2(by)} L ${n2(bx)} ${n2(-by)} Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
  s.g.push(`<circle cx="0" cy="0" r="${r}" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};

/** ISO 10628-2 X8077 (check valve, general): the body with a solid dot on the inlet
 *  corner. ANSI/ISA-5.1 draws no check valve. */
const drawCheck = async () => {
  const s = sheet(); inlineStubs(s); bowtie(s);
  s.ext(-26.5, -18.5, -17.5, -9.5);
  s.g.push(`<circle cx="-22" cy="-14" r="4.5" fill="${INK}"/>`);
  return s;
};

/** ISA-5.1 Table 5.4.3 no. 15: angle body, inlet from below, outlet to the side, with the
 *  exemplar's drawn spring (ISA Table 5.4.2 no. 20; ISO X2125 draws the same zigzag). */
const drawRelief = async () => {
  const s = sheet();
  pipe(s, [[0, 22 + STUB], [0, 21]], true);               // inlet from the protected vessel
  pipe(s, [[21, 0], [22 + STUB, 0]], true);               // discharge
  s.ext(-14, -14, 22, 22, SW.symbol);
  s.g.push(`<path d="M -14 22 L 14 22 L 0 0 Z M 22 -14 L 22 14 L 0 0 Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
  // a short stem clears the outlet triangle before the exemplar's zigzag starts
  const spring = [[0, 0], [0, -20], [-13, -32], [13, -40], [-13, -48], [13, -56], [0, -62]];
  s.extPts(spring, SW.symbol);
  s.g.push(`<polyline points="${pts(spring)}" fill="none" ${stroke(SW.symbol)} stroke-linejoin="miter"/>`);
  return s;
};

const drawControlValve = async () => {
  const s = sheet();
  inlineStubs(s);
  pneumatic(s, [[0, -49], [0, -80]]);                     // controller output arrives from above
  bowtie(s);
  line(s, 0, 0, 0, -36);                                  // stem from the plug at the body's centre
  s.ext(-20, -50, 20, -36, SW.symbol);
  s.g.push(`<path d="M -20 -36 A 20 14 0 0 1 20 -36 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};

/** ISA-5.1 Table 5.4.2 no. 10: the exemplar's 26 px square marked S, on the same stem. */
const drawSolenoidValve = async () => {
  const s = sheet();
  inlineStubs(s);
  electric(s, [[0, -48], [0, -80]]);                      // 32 long: dash, gap, dash, gap, dash
  bowtie(s);
  line(s, 0, 0, 0, -23);
  s.ext(-13, -49, 13, -23, SW.symbol);
  s.g.push(`<rect x="-13" y="-49" width="26" height="26" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  await text(s, "S", 0, -31, 13, 600);
  return s;
};

/* ---------- instruments (ANSI/ISA-5.1 Table 5.1.1) ---------- */
const HEX_R = R_BUB / (Math.sqrt(3) / 2);                // flat top and bottom, 36 tall like the circle
const SHAPES = {
  // half-width of the room for text at height y, and where the location line and stubs end
  discrete: { edge: R_BUB, room: (y) => Math.sqrt(Math.max(0, R_BUB ** 2 - y ** 2)) },
  shared: { edge: R_BUB, room: (y) => Math.sqrt(Math.max(0, R_BUB ** 2 - y ** 2)) },
  computer: { edge: HEX_R, room: (y) => HEX_R - Math.abs(y) * (HEX_R / 2) / R_BUB },
  plc: { edge: R_BUB, room: (y) => R_BUB - Math.abs(y) },
};

/** Largest size (from 11.5 down) at which a tag line clears its outline by 1.5. */
const fit = async (str, weight, room, span) => {
  for (let fs = 11.5; fs > 6; fs -= 0.25) {
    const w = await measure(str, fs, weight);
    const [yTop, yBase] = span(fs);
    if (w / 2 + 1.5 <= Math.min(room(yTop), room(yBase))) return fs;
  }
  return 6;
};

const bubble = (kind, controlRoom, letters, number, stubs) => async () => {
  const s = sheet(), r = R_BUB, shape = SHAPES[kind], e = shape.edge;
  stubs(s, e);
  s.ext(-e, -r, e, r, SW.symbol);
  if (kind === "discrete") {
    s.g.push(`<circle cx="0" cy="0" r="${r}" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  } else if (kind === "shared") {
    s.g.push(`<rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
    s.g.push(`<circle cx="0" cy="0" r="${r}" fill="none" ${stroke(SW.symbol)}/>`);
  } else if (kind === "computer") {
    const hex = [[-e, 0], [-e / 2, -r], [e / 2, -r], [e, 0], [e / 2, r], [-e / 2, r]];
    s.g.push(`<polygon points="${pts(hex)}" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="miter"/>`);
  } else {
    s.g.push(`<rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
    s.g.push(`<polygon points="0,${-r} ${r},0 0,${r} ${-r},0" fill="none" ${stroke(SW.symbol)} stroke-linejoin="miter"/>`);
  }
  if (controlRoom === "local") {
    for (const y of [-2.5, 2.5]) line(s, -shape.room(y), y, shape.room(y), y);
  } else if (controlRoom) line(s, -e, 0, e, 0);
  // Letters sit on y = -3 and the loop number on y = 12, as in the exemplar. A line that
  // would touch its outline moves in against the location line and shrinks; when both
  // lines have to shrink they share one size, so the tag still reads as one label.
  let fl = await fit(letters, 600, shape.room, (fs) => [-3 - CAP * fs, -3]), yl = -3;
  let fn = await fit(number, 400, shape.room, (fs) => [12 - CAP * fs, 12]), numTop = null;
  if (fl < 11.5) { fl = await fit(letters, 600, shape.room, (fs) => [-2.5 - CAP * fs, -2.5]); yl = -2.5; }
  if (fn < 11.5) { fn = await fit(number, 400, shape.room, (fs) => [2.5, 2.5 + CAP * fs]); numTop = 2.5; }
  if (fl < 11.5 && fn < 11.5) fl = fn = Math.min(fl, fn);
  if (controlRoom === "local") {
    yl = -5;
    fl = await fit(letters, 600, shape.room, (fs) => [yl - CAP * fs, yl]);
  }
  await text(s, letters, 0, yl, fl, 600);
  await text(s, number, 0, numTop === null ? 12 : numTop + CAP * fn, fn);
  return s;
};
const inElectric = (s, e) => electric(s, [[-e + 1, 0], [-e - 18, 0]]);   // 19 long, ends on a whole dash
const outElectric = (s, e) => electric(s, [[e - 1, 0], [e + 30, 0]]);   // 31 long
const outPneumatic = (s, e) => pneumatic(s, [[e - 1, 0], [e + 30, 0]]);
const inProcess = (s, e) => connection(s, [[-e + 1, 0], [-e - 18, 0]]);


/* ---------- round 2: equipment and operators ---------- */
const drawReactor = async () => {
  const s = await drawVessel();
  // Jacket follows the accepted shell and lower 2:1 head, leaving a drain opening.
  s.ext(-72, -95, 72, 182, SW.symbol);
  s.g.push(`<path d="M -60 -95 H -72 V 140 A 72 42 0 0 0 -14 181 M 14 181 A 72 42 0 0 0 72 140 V -95 H 60" fill="none" ${stroke(SW.symbol)}/>`);
  pipe(s, [[-96, -65], [-72, -65]], true);
  pipe(s, [[72, 105], [96, 105]], true);
  line(s, 0, -194, 0, 78);
  line(s, -20, -194, 20, -194);
  s.g.push(`<path d="M -34 70 L 0 78 L 34 70 L 34 86 L 0 78 L -34 86 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};

const drawCompressor = async () => {
  const s = sheet(); inlineStubs(s, 30);
  s.ext(-30, -30, 30, 30, SW.symbol);
  s.g.push(`<circle cx="0" cy="0" r="30" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  // Gas compressor: converging passage, distinct from the pump's pointed discharge.
  line(s, -18, -24, 27, -Math.sqrt(171));
  line(s, -18, 24, 27, Math.sqrt(171));
  return s;
};

const fanRotor = (s, cy = 0, r = 30) => {
  s.ext(-r, cy - r, r, cy + r, SW.symbol);
  s.g.push(`<circle cx="0" cy="${cy}" r="${r}" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  // Opposed curved blades around a small hub, all outlined in the exemplar ink.
  s.g.push(`<path d="M 0 ${cy} C ${-r} ${cy-r} ${r} ${cy-r} 0 ${cy} C ${r} ${cy+r} ${-r} ${cy+r} 0 ${cy}" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  s.g.push(`<circle cx="0" cy="${cy}" r="3" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
};
const drawBlower = async () => {
  const s = sheet(); inlineStubs(s, 30); fanRotor(s); return s;
};
const drawAirCooler = async () => {
  const s = sheet();
  pipe(s, [[-124, 0], [-99, 0]]); pipe(s, [[99, 0], [124, 0]]);
  s.ext(-100, -30, 100, 30, SW.symbol);
  s.g.push(`<rect x="-100" y="-30" width="200" height="60" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  for (const y of [-12, 0, 12]) line(s, -100, y, 100, y);
  for (let x = -84; x <= 84; x += 14) line(s, x, -23, x, 23);
  fanRotor(s, -70);
  return s;
};
const drawCondenser = async () => {
  const s = sheet(); inlineStubs(s, 30);
  pipe(s, [[0, -54], [0, -29]]); pipe(s, [[0, 29], [0, 54]]);
  s.ext(-30, -30, 30, 30, SW.symbol);
  s.g.push(`<circle cx="0" cy="0" r="30" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  s.g.push(`<polyline points="-30,0 -15,0 0,-15 0,15 15,0 30,0" fill="none" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawConeTank = async () => {
  const s = sheet();
  pipe(s, [[0, -120], [0, -95]]); pipe(s, [[0, 69], [0, 94]]);
  s.ext(-80, -96, 80, 70, SW.symbol);
  s.g.push(`<path d="M -80 -70 L 0 -96 L 80 -70 V 70 H -80 Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
  return s;
};
const drawBoiler = async () => {
  const s = sheet();
  pipe(s, [[-84, -25], [-59, -25]]); pipe(s, [[59, -45], [84, -45]]);
  s.ext(-60, -70, 60, 70, SW.symbol);
  s.g.push(`<rect x="-60" y="-70" width="120" height="140" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  s.g.push(`<path d="M -60 -25 H -38 V 15 H 38 V -5 H -18 V -45 H 60" fill="none" ${stroke(SW.symbol)}/>`);
  s.g.push(`<path d="M -12 51 C -24 35 -6 31 -4 20 C 8 31 4 37 13 42 C 23 57 6 64 0 63 C -7 63 -13 58 -12 51 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawFlare = async () => {
  const s = sheet();
  pipe(s, [[-44, 90], [-19, 90]]);
  s.ext(-20, -150, 20, 110, SW.symbol);
  s.g.push(`<path d="M -20 -110 V 110 H 20 V -110" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  s.g.push(`<path d="M -10 -114 C -25 -130 -4 -137 0 -150 C 5 -138 17 -135 14 -122 C 12 -113 1 -108 -10 -114 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawReboiler = async () => {
  const s = sheet();
  // Kettle: enlarged vapour space above the submerged U-tube bundle.
  pipe(s, [[-124, 10], [-99, 10]]); pipe(s, [[-124, 30], [-99, 30]]);
  pipe(s, [[0, -84], [0, -59]]); pipe(s, [[95, 30], [120, 30]]);
  s.ext(-100, -60, 100, 60, SW.symbol);
  s.g.push(`<path d="M -100 0 L -60 -60 H 70 A 30 60 0 0 1 70 60 H -60 L -100 40 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  line(s, -80, -30, -80, 50);
  s.g.push(`<path d="M -100 10 H 50 A 10 10 0 0 1 50 30 H -100" fill="none" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawTrayColumn = async () => {
  const s = await drawVessel();
  for (const [i, y] of [-105, -63, -21, 21, 63, 105].entries()) {
    const side = i % 2 ? -1 : 1;
    line(s, -60 * side, y, 42 * side, y);
    line(s, 42 * side, y, 42 * side, y + 14);
  }
  return s;
};
const drawButterfly = async () => {
  const s = sheet(); inlineStubs(s);
  // ISA's disc between short end bars, within the accepted 44 x 28 envelope.
  line(s, -22, -14, -22, 14); line(s, 22, -14, 22, 14);
  line(s, -16, -14, 16, 14);
  return s;
};
const drawMotorValve = async () => {
  const s = sheet(); inlineStubs(s); electric(s, [[0, -48], [0, -80]]);
  bowtie(s); line(s, 0, 0, 0, -23);
  s.ext(-13, -49, 13, -23, SW.symbol);
  s.g.push(`<circle cx="0" cy="-36" r="13" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  await text(s, "M", 0, -31, 13, 600);
  return s;
};
const drawPistonValve = async () => {
  const s = sheet(); inlineStubs(s);
  pneumatic(s, [[0, -57], [0, -88]]); bowtie(s);
  s.ext(-20, -58, 20, -30, SW.symbol);
  s.g.push(`<rect x="-20" y="-58" width="40" height="28" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  line(s, -20, -44, 20, -44); line(s, 0, 0, 0, -44);
  return s;
};
const drawHandwheel = async () => {
  const s = sheet();
  // Manual operator shown separately, its lower stem attaches to the valve centre.
  line(s, 0, 0, 0, -36); line(s, -18, -36, 18, -36);
  return s;
};
const drawInterlock = async () => {
  const s = sheet(), r = 26;
  inElectric(s, r); outElectric(s, r);
  s.ext(-r, -r, r, r, SW.symbol);
  s.g.push(`<polygon points="0,-26 26,0 0,26 -26,0" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  await text(s, "I-202", 0, 4, 11.5, 600);
  return s;
};


/* ---------- batch 2: remaining everyday symbols and first tier 3 equipment ---------- */
const drawAngle = async () => {
  const s = sheet();
  pipe(s, [[0, 22 + STUB], [0, 21]]);
  pipe(s, [[21, 0], [22 + STUB, 0]]);
  s.ext(-14, -14, 22, 22, SW.symbol);
  s.g.push(`<path d="M -14 22 L 14 22 L 0 0 Z M 22 -14 L 22 14 L 0 0 Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
  return s;
};
const drawThreeWay = async () => {
  const s = sheet(); inlineStubs(s);
  pipe(s, [[0, 22 + STUB], [0, 21]]); bowtie(s);
  s.ext(-14, 0, 14, 22, SW.symbol);
  s.g.push(`<path d="M -14 22 L 14 22 L 0 0 Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
  return s;
};
const drawRegulator = async () => {
  const s = sheet(); inlineStubs(s);
  // Downstream pressure acts on the diaphragm; a plain process connection is not pneumatic.
  connection(s, [[38, 0], [38, -43], [17, -43]]);
  bowtie(s); line(s, 0, 0, 0, -36);
  s.ext(-20, -50, 20, -36, SW.symbol);
  s.g.push(`<path d="M -20 -36 A 20 14 0 0 1 20 -36 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  const spring = [[0, -50], [0, -56], [-10, -62], [10, -68], [-10, -74], [10, -80], [0, -86]];
  s.extPts(spring, SW.symbol);
  s.g.push(`<polyline points="${pts(spring)}" fill="none" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawRuptureDisc = async () => {
  const s = sheet(); inlineStubs(s, 10);
  s.ext(-10, -20, 10, 20, SW.symbol);
  s.g.push(`<rect x="-10" y="-20" width="20" height="40" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  s.g.push(`<path d="M -5 -20 V -10 A 10 10 0 0 1 -5 10 V 20" fill="none" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawOrifice = async () => {
  const s = sheet();
  pipe(s, [[-STUB, 0], [STUB, 0]]);
  line(s, 0, -18, 0, 18);
  s.ext(-3.5, -25, 3.5, -18, SW.symbol);
  s.g.push(`<circle cx="0" cy="-21.5" r="3.5" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawReducer = async () => {
  const s = sheet(); inlineStubs(s);
  s.ext(-22, -14, 22, 14, SW.symbol);
  s.g.push(`<path d="M -22 -14 L -22 14 L 22 0 Z" fill="${PAPER}" ${stroke(SW.symbol)} stroke-linejoin="miter"/>`);
  return s;
};
const drawOffPage = async () => {
  const s = sheet(); pipe(s, [[-54, 0], [-29, 0]]);
  s.ext(-30, -14, 40, 14, SW.symbol);
  s.g.push(`<path d="M -30 -14 H 22 L 40 0 L 22 14 H -30 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  await text(s, "P-02", -3, 4, 11.5, 600);
  return s;
};
const drawStrainer = async () => {
  const s = sheet(); inlineStubs(s, 30);
  s.ext(-30, -20, 30, 20, SW.symbol);
  s.g.push(`<path d="M -30 0 L 0 -20 L 30 0 L 0 20 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  s.g.push(`<path d="M 0 -20 V 20" fill="none" ${stroke(SW.symbol)} stroke-dasharray="5 3"/>`);
  return s;
};
const drawCyclone = async () => {
  const s = sheet();
  pipe(s, [[-84, -48], [-59, -48]]);
  pipe(s, [[0, -94], [0, -69]]);
  pipe(s, [[0, 109], [0, 134]]);
  s.ext(-60, -70, 60, 110, SW.symbol);
  s.g.push(`<path d="M -60 -70 H 60 V -10 L 12 110 H -12 L -60 -10 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  // Vortex finder extends into the cylindrical separation chamber.
  line(s, -10, -70, -10, -25); line(s, 10, -70, 10, -25);
  return s;
};
const drawPFR = async () => {
  const s = sheet(), d = 120, half = 120, rx = HEAD(d);
  pipe(s, [[-half-rx-STUB, 0], [-half-rx+1, 0]]);
  pipe(s, [[half+rx-1, 0], [half+rx+STUB, 0]]);
  s.ext(-half-rx, -d/2, half+rx, d/2, SW.symbol);
  s.g.push(`<path d="M ${-half} ${-d/2} H ${half} A ${rx} ${d/2} 0 0 1 ${half} ${d/2} H ${-half} A ${rx} ${d/2} 0 0 1 ${-half} ${-d/2} Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawSphere = async () => {
  const s = sheet();
  pipe(s, [[0, -84], [0, -59]]); pipe(s, [[0, 59], [0, 84]]);
  s.ext(-60, -60, 60, 60, SW.symbol);
  s.g.push(`<circle cx="0" cy="0" r="60" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawBurner = async () => {
  const s = sheet();
  pipe(s, [[-54, 0], [-29, 0]], true);
  s.ext(-30, -20, 60, 20, SW.symbol);
  s.g.push(`<path d="M -30 -10 H 0 L 18 -20 V 20 L 0 10 H -30 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  // Outlined flame follows the accepted boiler/flare treatment.
  s.g.push(`<path d="M 22 -10 C 34 -18 39 -4 60 0 C 40 4 34 18 22 10 C 31 6 31 -6 22 -10 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawPackedColumn = async () => {
  const s = await drawVessel();
  for (const top of [-110, 20]) {
    s.g.push(`<rect x="-48" y="${top}" width="96" height="90" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
    // Crossed diagonals identify packing, bounded by the two bed support lines.
    line(s, -48, top, 48, top+90); line(s, 48, top, -48, top+90);
  }
  return s;
};

/* ---------- batch 3: pumps, exchangers and mechanical equipment ---------- */
const drawCoolingTower = async () => {
  const s = sheet();
  pipe(s, [[-45 - STUB, -45], [-44, -45]]);
  pipe(s, [[51.67 - 1, 65], [51.67 + STUB, 65]]);
  s.ext(-60, -90, 60, 90, SW.symbol);
  // The catalog's natural-draught profile: broad rim and basin, narrow waist.
  s.g.push(`<path d="M -60 -90 H 60 L 30 0 L 60 90 H -60 L -30 0 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  line(s, -45, -45, 45, -45);
  line(s, -51.67, 65, 51.67, 65);
  return s;
};
const drawGenerator = async () => {
  const s = sheet();
  line(s, -54, 0, -29, 0); // mechanical shaft, not a process pipe
  s.ext(-30, -30, 30, 30, SW.symbol);
  s.g.push(`<circle cx="0" cy="0" r="30" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  await text(s, "G", 0, 5, 13, 600);
  return s;
};
const drawPumpDiaphragm = async () => {
  const s = sheet(); pumpCasing(s);
  s.g.push(`<path d="M 0 -30 C -16 -14 -16 14 0 30" fill="none" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawPumpGeneral = async () => {
  const s = sheet(); pumpCasing(s); return s;
};
const drawPumpScrew = async () => {
  const s = sheet(); pumpCasing(s);
  for (const y of [-3, 3]) {
    const p = [[-20, y], [-16, y-3], [-10, y+3], [-4, y-3], [2, y+3], [8, y-3], [12, y]];
    s.g.push(`<polyline points="${pts(p)}" fill="none" ${stroke(SW.symbol)} stroke-linejoin="round"/>`);
  }
  return s;
};
const drawPumpProgressiveCavity = async () => {
  const s = sheet(); pumpCasing(s);
  s.g.push(`<path d="M -20 0 A 5 5 0 0 1 -10 0 A 5 5 0 0 0 0 0 A 5 5 0 0 1 10 0" fill="none" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawPumpPiston = async () => {
  const s = sheet(); pumpCasing(s);
  line(s, -10, 0, 10, 0); line(s, 10, -10, 10, 10);
  return s;
};
const drawHXPlate = async () => {
  const s = sheet();
  pipe(s, [[-86, -54], [-86, -29]]); pipe(s, [[86, -54], [86, -29]]);
  pipe(s, [[-86, 29], [-86, 54]]); pipe(s, [[86, 29], [86, 54]]);
  s.ext(-100, -30, 100, 30, SW.symbol);
  s.g.push(`<rect x="-100" y="-30" width="200" height="60" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  for (const x of [-60, 0, 60]) line(s, x, -30, x, 30);
  line(s, -86, -30, 86, 30); line(s, -86, 30, 86, -30);
  return s;
};
const drawHXUTube = async () => {
  const s = sheet();
  pipe(s, [[-88, -54], [-88, -29]]); pipe(s, [[-88, 29], [-88, 54]]);
  pipe(s, [[-56, -54], [-56, -29]]); pipe(s, [[84, 29], [84, 54]]);
  s.ext(-100, -30, 100, 30, SW.symbol);
  s.g.push(`<rect x="-100" y="-30" width="200" height="60" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  line(s, -76, -30, -76, 30);
  s.g.push(`<path d="M -76 -15 H 56 A 15 15 0 0 1 56 15 H -76" fill="none" ${stroke(SW.symbol)}/>`);
  line(s, -100, 0, -76, 0); // channel partition separates the tube inlet and outlet
  return s;
};
const drawMotor = async () => {
  const s = sheet();
  line(s, 29, 0, 54, 0); // mechanical shaft
  s.ext(-30, -30, 30, 30, SW.symbol);
  s.g.push(`<circle cx="0" cy="0" r="30" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  await text(s, "M", 0, 5, 13, 600);
  return s;
};
const drawTurbine = async () => {
  const s = sheet();
  pipe(s, [[-30, -39], [-30, -14]]);
  pipe(s, [[30, 29], [30, 54]]);
  line(s, 59, 0, 84, 0); // shaft leaves the expanding casing
  s.ext(-60, -40, 60, 40, SW.symbol);
  s.g.push(`<path d="M -60 -10 L 60 -40 V 40 L -60 10 Z" fill="${PAPER}" ${stroke(SW.symbol)}/>`);
  return s;
};
const drawAgitator = async () => {
  const s = sheet();
  // Shaft and drive bar above a pitched-blade hub, distinct from valve bowties.
  line(s, 0, -80, 0, 0); line(s, -20, -80, 20, -80);
  line(s, -20, 0, 20, 0);
  line(s, -20, 0, -34, -14);
  line(s, 20, 0, 34, 14);
  return s;
};

/* ---------- manifest ---------- */
const ISA = "https://www.isa.org/products/ansi-isa-5-1-2024-instrumentation-and-control-symb";
const ISO = "https://commons.wikimedia.org/wiki/File:ISO_10628-2_2012_Symbols.pdf";

const SYMBOLS = [
  {
    id: "valve-control-diaphragm", label: "Control valve, diaphragm actuator", draw: drawControlValve,
    engine: "valve_control", usageUsers: 283, inExemplar: true,
    dsl: ['equip LV-101 : valve_control [actuator: "diaphragm"]'],
    standard: "ANSI/ISA-5.1 Table 5.4.2 no. 1 (spring-diaphragm actuator) on Table 5.4.1 no. 1a (two-way valve body); stem to the body centre as in Table 5.4.4",
    sourceUrl: ISA,
    notes: "Diaphragm actuator (dome, flat side down) on the same bowtie, with the stem running from the body's centre up to the dome and the pneumatic signal entering the dome top. The pneumatic mark is ISA's pair of slashes; the exemplar's single slash is ISA's mark for an undefined signal, and its stem stops 14 short of the body. The engine draws the rotated black hourglass with a dome floating above a short stem; fail action (FO/FC) stays a label beside the actuator. Usage counts every valve_control, whatever its actuator.",
  },
  {
    id: "tank-atmospheric", label: "Atmospheric storage tank", draw: drawTank,
    engine: "tank_atm", usageUsers: 275, inExemplar: true,
    dsl: ["equip TK-100 : tank_atm"],
    standard: "ISO 10628-2:2012 X8200 (tank with dished roof)",
    sourceUrl: ISO,
    notes: "Flat bottom, straight shell and a 26-deep dished roof at the exemplar's 160 × 140, with the inlet meeting the roof crown and the outlet leaving the bottom centre. The engine's tank is 90 wide with a 14-deep roof drawn as an open arc over a separate rectangle, and has no nozzles.",
  },
  {
    id: "pump-centrifugal", label: "Centrifugal pump", draw: drawPump,
    engine: "pump_centrifugal", usageUsers: 235, inExemplar: true,
    dsl: ["equip P-101 : pump_centrifugal"],
    standard: "ISO 10628-2:2012 reg. 2322 (pump, centrifugal type)",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Pump,_centrifugal_type_(ISO_10628-2).svg",
    notes: "Casing circle, horizontal diameter and two lines from the top and bottom of the casing converging on the discharge point, with suction entering the opposite end, as ISO 10628-2 reg. 2322 draws it. The engine draws a detached wedge on the upper right that matches neither ISO pump; the exemplar's floating triangle points right while its pipe leaves from the top.",
  },
  {
    id: "vessel-horizontal", label: "Horizontal vessel", draw: drawVesselH,
    engine: "vessel_h", usageUsers: 208, inExemplar: false,
    dsl: ["equip V-201 : vessel_h"],
    standard: "ISO 10628-2:2012 reg. 2062 (tank, vessel with dished ends), horizontal",
    sourceUrl: ISO,
    notes: "The vertical vessel laid on its side: 120 shell diameter, 240 straight length and 2:1 elliptical heads 30 deep, with a feed and a vapour nozzle on top and a liquid outlet below. The engine's drum is 130 × 70 with 14-deep heads and no nozzles.",
  },
  {
    id: "valve-gate", label: "Gate valve", draw: drawGate,
    engine: "valve_gate", usageUsers: 156, inExemplar: true,
    dsl: ["equip HV-103 : valve_gate"],
    standard: "ANSI/ISA-5.1 Table 5.4.1 no. 1a (two-way valve body); ISO 10628-2:2012 reg. 2101 (valve, general)",
    sourceUrl: ISA,
    notes: "Two-way valve body: two white triangles meeting at a point on the pipe axis, 44 × 28, with nothing on top because a manual gate valve carries no operator. ISO 10628-2 X8074 adds a vertical centre line to mark the gate type; US practice leaves the body plain. The engine's catalog body is turned 90 degrees into a flat-topped hourglass and renders solid black, because the catalog stylesheet omits the valve-body class.",
  },
  {
    id: "filter", label: "Filter (liquid)", draw: drawFilter,
    engine: "filter", usageUsers: 149, inExemplar: false,
    dsl: ["equip F-101 : filter"],
    standard: "ISO 10628-2:2012 X8116 (liquid filter, general)",
    sourceUrl: ISO,
    notes: "A 60 × 100 housing with a dashed line across it for the filter medium, fed from the top and drained from the bottom. The engine draws a 70 square crossed by a solid line and two diagonals, which is not an ISO filter; on the catalog sheet those inner lines vanish (their class is missing from the catalog stylesheet) and the empty tag background shows as a black bar. Usage is an overcount: the word also matches label text.",
  },
  {
    id: "valve-check", label: "Check valve", draw: drawCheck,
    engine: "valve_check", usageUsers: 142, inExemplar: false,
    dsl: ["equip CV-104 : valve_check"],
    standard: "ISO 10628-2:2012 X8077 (check valve, general); ANSI/ISA-5.1 has no check-valve symbol",
    sourceUrl: ISO,
    notes: "The two-way bowtie with a solid dot on its upstream top corner, with flow from left to right. The exemplar's check valve is a diagonal flapper line crossing the downstream triangle, which neither standard draws. The engine puts a small arc inside the upstream triangle of its black hourglass; the arc does not show on the catalog sheet because its class is missing from the catalog stylesheet.",
  },
  {
    id: "valve-relief", label: "Pressure relief / safety valve", draw: drawRelief,
    engine: "valve_psv", usageUsers: 142, inExemplar: false,
    dsl: ['equip PSV-105 : valve_psv [set_pressure: "150 psig"]'],
    standard: "ANSI/ISA-5.1 Table 5.4.3 no. 15 (pressure safety valve, angle body) with Table 5.4.2 no. 20 (spring actuator); ISO 10628-2:2012 X2125",
    sourceUrl: ISA,
    notes: "Angle body: inlet triangle from below, outlet triangle to the side, and the exemplar's drawn spring on a short stem above the body centre, on minor process stubs. The exemplar draws a straight bowtie stood on end and vents through the top of the spring; the engine draws an in-line black hourglass with a 45° outlet stub on one corner and a spring beside it that does not show on the catalog sheet. ISA draws the spring as a diagonal with cross marks; the zigzag is ISO's form and reads more clearly at this size.",
  },
  {
    id: "heat-exchanger-shell-tube", label: "Shell-and-tube heat exchanger", draw: drawHX,
    engine: "hx_shell_tube", usageUsers: 125, inExemplar: false,
    dsl: ["equip E-101 : hx_shell_tube"],
    standard: "ISO 10628-2:2012 reg. 2511 (heat exchanger with straight tubes, fixed tube sheets)",
    sourceUrl: ISO,
    notes: "A 200 × 60 shell with two tube sheets 24 in from the ends and four straight tubes between them; tube-side nozzles on the channels (in top left, out bottom right) and shell-side nozzles between the tube sheets (in top right, out bottom left). The engine draws a vessel with rounded heads and tube lines, with no tube sheets and no nozzles, so the two sides cannot be told apart; on the catalog sheet even the tube lines vanish, leaving a plain drum.",
  },
  {
    id: "vessel-vertical", label: "Vertical vessel", draw: drawVessel,
    engine: "vessel_v", usageUsers: 101, inExemplar: true,
    dsl: ["equip V-101 : vessel_v"],
    standard: "ISO 10628-2:2012 reg. 2062 (tank, vessel with dished ends)",
    sourceUrl: ISO,
    notes: "Straight shell closed by 2:1 elliptical heads: 120 wide, 280 straight side and 30-deep heads (a quarter of the diameter), with the feed, relief and drain nozzles meeting the heads exactly. The exemplar's heads are 22 deep although its notes call them 2:1; the engine's vessel is 70 wide with 16-deep heads and draws no nozzles.",
  },
  {
    id: "pump-positive-displacement", label: "Positive-displacement pump (gear)", draw: drawPumpPD,
    engine: "pump_pd", usageUsers: 87, inExemplar: false,
    dsl: ["equip P-102 : pump_pd"],
    standard: "ISO 10628-2:2012 reg. 8091 (pump, gear type)",
    sourceUrl: ISO,
    notes: "The centrifugal pump's casing and discharge lines with two overlapping gear wheels in place of the diameter. ISO has no general positive-displacement symbol, so the gear pump stands for the family, as the engine intends; screw, progressive-cavity and piston pumps are tier 3. The engine draws a smaller 22-radius circle with two side-by-side wheels and no discharge lines, so it cannot show flow direction; on the catalog sheet the wheels and stubs vanish and only the bare circle is left.",
  },
  {
    id: "valve-ball", label: "Ball valve", draw: drawBall,
    engine: "valve_ball", usageUsers: 63, inExemplar: false,
    dsl: ["equip HV-105 : valve_ball"],
    standard: "ANSI/ISA-5.1 Table 5.4.1 no. 6 (ball valve); ISO 10628-2:2012 X8071",
    sourceUrl: ISA,
    notes: "An open ball of radius 10.5 at the body centre, with the two triangles stopping where they meet it. The engine draws a solid dot at the centre, which is how both standards mark a globe valve.",
  },
  {
    id: "valve-globe", label: "Globe valve", draw: drawGlobe,
    engine: "valve_globe", usageUsers: 30, inExemplar: false,
    dsl: ["equip HV-106 : valve_globe"],
    standard: "ANSI/ISA-5.1 Table 5.4.1 no. 1b (straight globe valve); ISO 10628-2:2012 X8068",
    sourceUrl: ISA,
    notes: "The two-way bowtie with a solid dot of radius 5 where the triangles meet. The engine draws a white circle above the body, which matches neither standard.",
  },
  {
    id: "valve-control-solenoid", label: "On/off valve, solenoid actuator", draw: drawSolenoidValve,
    engine: "valve_control", usageUsers: null, inExemplar: true,
    dsl: ['equip XV-202 : valve_control [actuator: "solenoid"]'],
    standard: "ANSI/ISA-5.1 Table 5.4.2 no. 10 (solenoid actuator) on Table 5.4.1 no. 1a (two-way valve body)",
    sourceUrl: ISA,
    notes: "The exemplar's 26 square marked S on the same bowtie, with the stem from the body centre to the square and the electric trip signal entering its top. The exemplar's stem runs from the top of the body's bounding box into the square instead. The engine's catalog entry shows only the default diaphragm actuator; its renderer draws the solenoid as a 24 × 22 box on the same rotated black body. Usage is not counted separately: valve_control's 283 users include every actuator.",
  },
  {
    id: "instrument-discrete-field", label: "Instrument, discrete, field mounted", draw: bubble("discrete", false, "LT", "101", (s, e) => { inProcess(s, e); outElectric(s, e); }),
    engine: "field_discrete", usageUsers: null, inExemplar: true,
    dsl: ["inst LT-101 : field_discrete"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column D, row 1 (discrete instrument; field mounted, normally accessible)",
    sourceUrl: ISA,
    notes: "A plain r = 18 circle with the tag letters over the loop number, a process connection line entering from the left and an electric signal leaving right. The engine's catalog has no instrument entries; its renderer draws this one correctly at r = 14.",
  },
  {
    id: "instrument-discrete-control-room", label: "Instrument, discrete, control room", draw: bubble("discrete", true, "TI", "104", (s, e) => { inElectric(s, e); outElectric(s, e); }),
    engine: "cr_discrete", usageUsers: null, inExemplar: false,
    dsl: ["inst TI-104 : cr_discrete"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column D, row 2 (discrete instrument; main control room, front of panel, normally accessible)",
    sourceUrl: ISA,
    notes: "The field circle with one solid horizontal line through its full diameter for a primary location the operator can reach. ISA uses a dashed line for the back of the main panel and a double line for a local panel; the engine's renderer draws a dashed line for local panels.",
  },
  {
    id: "instrument-shared-field", label: "Instrument, shared display / shared control, field", draw: bubble("shared", false, "FI", "105", (s, e) => { inElectric(s, e); outElectric(s, e); }),
    engine: "field_shared", usageUsers: null, inExemplar: false,
    dsl: ["inst FI-105 : field_shared"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column A, row 1 (shared display, shared control; field mounted, normally accessible)",
    sourceUrl: ISA,
    notes: "A circle inscribed in a 36 square, with no location line. The engine's renderer inscribes a hexagon in a circle, which is not an ISA shape.",
  },
  {
    id: "instrument-shared-control-room", label: "Instrument, shared display / shared control, control room", draw: bubble("shared", true, "LIC", "101", (s, e) => { inElectric(s, e); outPneumatic(s, e); }),
    engine: "cr_shared", usageUsers: null, inExemplar: true,
    dsl: ["inst LIC-101 : cr_shared"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column A, row 2 (shared display, shared control; main control room, normally accessible)",
    sourceUrl: ISA,
    notes: "Shared display, shared control function (circle inscribed in a square) with one solid horizontal line for a primary location normally accessible to the operator, r = 18 with the exemplar's tag type. The exemplar and the engine both inscribe a hexagon instead, which ISA-5.1 reserves for computer functions; the engine's symbol catalog has no instrument entries at all.",
  },
  {
    id: "instrument-computer-control-room", label: "Computer function, control room", draw: bubble("computer", true, "FY", "103", (s, e) => { inElectric(s, e); outElectric(s, e); }),
    engine: "cr_computer", usageUsers: null, inExemplar: false,
    dsl: ["inst FY-103 : cr_computer"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column C, row 2 (computer systems and software; main control room, normally accessible)",
    sourceUrl: ISA,
    notes: "A regular hexagon with flat top and bottom, as tall as the bubbles (36) and pointed at left and right, with the location line running point to point. The engine's renderer draws a diamond inside a circle for computer functions, which is not an ISA shape.",
  },
  {
    id: "instrument-plc-control-room", label: "PLC function, control room", draw: bubble("plc", true, "LY", "202", (s, e) => { inElectric(s, e); outElectric(s, e); }),
    engine: "cr_plc", usageUsers: null, inExemplar: false,
    dsl: ["inst LY-202 : cr_plc"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column B, row 2 (alternate shared display and control, used for PLC and safety systems; main control room, normally accessible)",
    sourceUrl: ISA,
    notes: "A diamond inscribed in a 36 square, corners on the square's mid-sides, with the location line across the full width. A three-digit loop number cannot fit the diamond's lower point at full size, so both tag lines move in against the location line and shrink together until they clear the diamond, extending the rule the exemplar uses for four-letter tags. The engine's renderer draws a square inside a circle for PLC functions, which is not an ISA shape.",
  },
  {
    id: "reactor-cstr", label: "Stirred reactor (CSTR)", draw: drawReactor,
    engine: "reactor_cstr", usageUsers: 45, inExemplar: false, tier: 2,
    dsl: ["equip R-101 : reactor_cstr"],
    standard: "ISO 10628-2:2012 X8006 (jacketed vessel with agitator)",
    sourceUrl: ISO,
    notes: "The accepted 120-diameter vessel and 2:1 heads, with a surrounding heating jacket, two minor utility nozzles and a shaft with opposed paddles. The engine omits the jacket.",
  },
  {
    id: "compressor", label: "Compressor", draw: drawCompressor,
    engine: "compressor", usageUsers: 42, inExemplar: false, tier: 2,
    dsl: ["equip C-101 : compressor"],
    standard: "ISO 10628-2:2012 reg. 2302 (compressor, general)",
    sourceUrl: ISO,
    notes: "Gas-compressor circle with a converging passage, at the accepted 60-unit pump diameter. Uses the general compressor rather than a centrifugal subtype; the engine uses a bare trapezoid.",
  },
  {
    id: "heat-exchanger-air-cooled", label: "Air-cooled heat exchanger", draw: drawAirCooler,
    engine: "hx_air_cooled", usageUsers: 40, inExemplar: false, tier: 2,
    dsl: ["equip E-102 : hx_air_cooled"],
    standard: "ISO 10628-2:2012 X2505 (finned tube with fan)",
    sourceUrl: ISO,
    notes: "Finned tube bank uses the accepted heat-exchanger envelope, with a separate outlined fan above it. Process stubs connect only to the tube bank.",
  },
  {
    id: "condenser", label: "Condenser", draw: drawCondenser,
    engine: "condenser", usageUsers: 30, inExemplar: false, tier: 2,
    dsl: ["equip E-103 : condenser"],
    standard: "ISO 10628-2:2012 X8079 (heat exchanger, general; condenser)",
    sourceUrl: ISO,
    notes: "Circular exchanger with the ISO angular internal passage and four process connections. The equipment circle follows the accepted 60-unit pump scale. Usage is an overcount because condenser also occurs in labels.",
  },
  {
    id: "tank-cone-roof", label: "Cone-roof tank", draw: drawConeTank,
    engine: "tank_cone_roof", usageUsers: 29, inExemplar: false, tier: 2,
    dsl: ["equip TK-101 : tank_cone_roof"],
    standard: "ISO 10628-2:2012 X2063 (tank with conical roof and flat bottom)",
    sourceUrl: ISO,
    notes: "The accepted 160 by 140 tank shell and 26-unit roof rise, with straight roof slopes instead of the atmospheric tank arc.",
  },
  {
    id: "blower", label: "Blower / fan", draw: drawBlower,
    engine: "blower", usageUsers: 24, inExemplar: false, tier: 2,
    dsl: ["equip B-101 : blower"],
    standard: "ISO 10628-2:2012 X8164 (fan)",
    sourceUrl: ISO,
    notes: "One fan symbol represents the inventory blower/fan row. Opposed curved blades and a hub in the accepted 60-unit equipment circle; no coloured or filled blades.",
  },
  {
    id: "boiler", label: "Boiler", draw: drawBoiler,
    engine: "boiler", usageUsers: 23, inExemplar: false, tier: 2,
    dsl: ["equip B-102 : boiler"],
    standard: "ISO 10628-2:2012 reg. 2532 (steam generator)",
    sourceUrl: ISO,
    notes: "Outlined fired enclosure with a water/steam passage above an outlined flame; 120 wide to match the accepted vessel diameter. Both process stubs reach the passage.",
  },
  {
    id: "flare", label: "Flare", draw: drawFlare,
    engine: "flare", usageUsers: 21, inExemplar: false, tier: 2,
    dsl: ["equip FL-101 : flare"],
    standard: "ISO 10628-2:2012 reg. 2591 (flare stack)",
    sourceUrl: ISO,
    notes: "Open stack with a side inlet and an outlined flame at its open top. Flame remains white with ink outline, following the binding monochrome style.",
  },
  {
    id: "reboiler", label: "Reboiler (kettle)", draw: drawReboiler,
    engine: "reboiler", usageUsers: 20, inExemplar: false, tier: 2,
    dsl: ["equip E-104 : reboiler"],
    standard: "ISO 10628-2:2012 X8131 (kettle-type heat exchanger)",
    sourceUrl: ISO,
    notes: "Kettle shell with enlarged vapour space and submerged U-tube bundle. Two left tube-side ports, top vapour outlet and right liquid outlet; 120 shell diameter with a 30-deep 2:1 end.",
  },
  {
    id: "column-tray", label: "Tray column", draw: drawTrayColumn,
    engine: "column_tray", usageUsers: 18, inExemplar: false, tier: 2,
    dsl: ["equip T-101 : column_tray"],
    standard: "ISO 10628-2:2012 X8101 (tray column)",
    sourceUrl: ISO,
    notes: "Reuses the accepted vertical vessel byte-for-byte as its shell, adding six alternating trays and downcomers between the 2:1 heads.",
  },
  {
    id: "valve-butterfly", label: "Butterfly valve", draw: drawButterfly,
    engine: "valve_butterfly", usageUsers: 10, inExemplar: false, tier: 2,
    dsl: ["equip HV-107 : valve_butterfly"],
    standard: "ANSI/ISA-5.1 Table 5.4.1 no. 5; ISO 10628-2:2012 X8075",
    sourceUrl: ISA,
    notes: "ISA disc drawn as a diagonal between short end bars. It shares the accepted 44 by 28 valve envelope and process stubs; the butterfly convention replaces the generic bowtie.",
  },
  {
    id: "valve-control-motor", label: "Control valve, motor actuator", draw: drawMotorValve,
    engine: "valve_control", usageUsers: null, inExemplar: false, tier: 2,
    dsl: ["equip XV-203 : valve_control [actuator: \"motor\"]"],
    standard: "ANSI/ISA-5.1 Table 5.4.2 no. 9 on Table 5.4.1 no. 1a",
    sourceUrl: ISA,
    notes: "Accepted bowtie and full centre-reaching stem, with a circular motor actuator marked M and the accepted electric signal stub. Actuator usage is included in valve_control, not counted separately.",
  },
  {
    id: "valve-control-piston", label: "Control valve, piston actuator", draw: drawPistonValve,
    engine: "valve_control", usageUsers: null, inExemplar: false, tier: 2,
    dsl: ["equip XV-204 : valve_control [actuator: \"piston\"]"],
    standard: "ANSI/ISA-5.1 Table 5.4.2 no. 4 on Table 5.4.1 no. 1a",
    sourceUrl: ISA,
    notes: "Accepted bowtie and centre-reaching stem connected to the piston line inside an outlined cylinder. Pneumatic input uses the accepted double slash. Actuator usage is not counted separately.",
  },
  {
    id: "actuator-manual-handwheel", label: "Manual actuator / handwheel", draw: drawHandwheel,
    engine: null, usageUsers: null, inExemplar: false, tier: 2,
    dsl: [],
    standard: "ANSI/ISA-5.1 Table 5.4.2 no. 11 (manual actuator)",
    sourceUrl: ISA,
    notes: "Manual operator represented by the ISA handwheel bar in side elevation on a stem, ready to attach at a valve body centre. The DSL cannot express manual actuation; dsl is empty.",
  },
  {
    id: "interlock-logic", label: "Interlock logic function", draw: drawInterlock,
    engine: null, usageUsers: null, inExemplar: true, tier: 2,
    dsl: [],
    standard: "ANSI/ISA-5.1 Table 5.1.2 no. 3",
    sourceUrl: ISA,
    notes: "Reuses the exemplar 52-unit standalone interlock diamond and I-202 tag with electric stubs. The DSL cannot express interlock logic: interlock silently becomes field_discrete, so dsl is empty.",
  },
  {
    id: "instrument-discrete-local-panel", label: "Instrument, discrete, local panel", draw: bubble("discrete", "local", "TI", "106", (s, e) => { inElectric(s, e); outElectric(s, e); }),
    engine: "local_discrete", usageUsers: null, inExemplar: false, tier: 2,
    dsl: ["inst TI-106 : local_discrete"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column D, row 4 (auxiliary location, normally accessible)",
    sourceUrl: ISA,
    notes: "Accepted discrete bubble with two solid horizontal chords at y = -2.5 and +2.5 for an accessible auxiliary location (local panel), using the accepted paired-signal offsets. Primary control-room instruments retain one line. Letters are fitted above the double line; the engine incorrectly uses a dashed line.",
  },
  {
    id: "instrument-shared-local-panel", label: "Instrument, shared display / control, local panel", draw: bubble("shared", "local", "LIC", "107", (s, e) => { inElectric(s, e); outElectric(s, e); }),
    engine: "local_shared", usageUsers: null, inExemplar: false, tier: 2,
    dsl: ["inst LIC-107 : local_shared"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column A, row 4 (auxiliary location, normally accessible)",
    sourceUrl: ISA,
    notes: "Accepted circle in a square with two solid horizontal chords at y = -2.5 and +2.5 for an accessible auxiliary location (local panel), using the accepted paired-signal offsets. Primary control-room instruments retain one line. Letters are fitted above the double line. The engine uses the wrong shared shape and a dashed location line.",
  },
  {
    id: "instrument-computer-field", label: "Computer function, field mounted", draw: bubble("computer", false, "FY", "108", (s, e) => { inElectric(s, e); outElectric(s, e); }),
    engine: "field_computer", usageUsers: null, inExemplar: false, tier: 2,
    dsl: ["inst FY-108 : field_computer"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column C, row 1",
    sourceUrl: ISA,
    notes: "Reuses the accepted computer hexagon without a location line for field mounting. The engine incorrectly draws a diamond inside a circle. The field PLC is drawn separately in the same inventory row.",
  },
  {
    id: "instrument-plc-field", label: "PLC function, field mounted", draw: bubble("plc", false, "LY", "109", (s, e) => { inElectric(s, e); outElectric(s, e); }),
    engine: "field_plc", usageUsers: null, inExemplar: false, tier: 2,
    dsl: ["inst LY-109 : field_plc"],
    standard: "ANSI/ISA-5.1 Table 5.1.1 column B, row 1 (field mounted, normally accessible)",
    sourceUrl: ISA,
    notes: "Accepted diamond in a 36 square with no location line. Reuses the control-room PLC tag-fitting rule and electric stubs. The engine incorrectly draws a square inside a circle.",
  },
  {
    id: "valve-angle", label: "Angle valve", draw: drawAngle,
    engine: null, usageUsers: null, inExemplar: false, tier: 2,
    dsl: [],
    standard: "ANSI/ISA-5.1 Table 5.4.1 no. 2; ISO 10628-2:2012 reg. 2102",
    sourceUrl: ISA,
    notes: "Reuses the accepted relief valve angle body, without its spring: inlet below and outlet right; each triangle is the accepted valve half-body. The DSL cannot express an angle valve.",
  },
  {
    id: "valve-three-way", label: "Three-way valve", draw: drawThreeWay,
    engine: null, usageUsers: null, inExemplar: false, tier: 2,
    dsl: [],
    standard: "ANSI/ISA-5.1 Table 5.4.1 no. 3; ISO 10628-2:2012 reg. 2103",
    sourceUrl: ISA,
    notes: "Accepted bowtie plus a third matching triangle below, all meeting at the body centre. Three process stubs; routing arrows are omitted for a generic body without a selected flow configuration. The DSL cannot express a three-way valve.",
  },
  {
    id: "regulator-pressure-reducing", label: "Pressure-reducing regulator", draw: drawRegulator,
    engine: null, usageUsers: null, inExemplar: false, tier: 2,
    dsl: [],
    standard: "ANSI/ISA-5.1 Table 5.4.3 nos. 10–11 (self-actuated pressure regulator)",
    sourceUrl: ISA,
    notes: "Accepted bowtie, centre-reaching stem and diaphragm, with the accepted zigzag spring and downstream pressure feedback to the diaphragm. Downstream sensing distinguishes pressure reduction from back-pressure regulation. Feedback is a plain process connection. The DSL cannot express self-actuated regulators.",
  },
  {
    id: "rupture-disc", label: "Rupture disc", draw: drawRuptureDisc,
    engine: null, usageUsers: null, inExemplar: false, tier: 2,
    dsl: [],
    standard: "ISO 10628-2:2012 X8080; ANSI/ISA-5.1 Table 5.4.3 no. 18",
    sourceUrl: ISO,
    notes: "Narrow rectangular holder with a bowed membrane, following the locally cached ISO X8080 reference. Process stubs meet the holder on both sides. The DSL cannot express a rupture disc.",
  },
  {
    id: "orifice-plate", label: "Orifice plate (flow element)", draw: drawOrifice,
    engine: null, usageUsers: null, inExemplar: false, tier: 2,
    dsl: [],
    standard: "ANSI/ISA-5.1 Table 5.4.3 no. 5; ISO 10628-2:2012 C0096",
    sourceUrl: ISA,
    notes: "Edge-on plate across a continuous process line, with a small open identification handle above the plate. No instrument bubble is substituted for the primary element. The DSL cannot express an in-line orifice plate.",
  },
  {
    id: "reducer-concentric", label: "Concentric reducer", draw: drawReducer,
    engine: null, usageUsers: null, inExemplar: false, tier: 2,
    dsl: [],
    standard: "ISO 10628-2:2012 reg. 516",
    sourceUrl: ISO,
    notes: "Outlined triangle on the process axis, wide end left, following the cached ISO reducer reference; uses the accepted 44 by 28 valve envelope. The DSL cannot express a reducer.",
  },
  {
    id: "connector-off-page", label: "Off-page connector", draw: drawOffPage,
    engine: null, usageUsers: null, inExemplar: false, tier: 2,
    dsl: [],
    standard: "ANSI/ISA-5.1 Table 5.3.2 no. 17",
    sourceUrl: ISA,
    notes: "Outlined continuation arrow with the destination P-02 in the accepted Inter tag style and a process stub at its tail. The DSL cannot express an off-page destination.",
  },
  {
    id: "strainer", label: "Strainer", draw: drawStrainer,
    engine: null, usageUsers: null, inExemplar: false, tier: 2,
    dsl: [],
    standard: "ISO 10628-2:2012 X8090",
    sourceUrl: ISO,
    notes: "Inline diamond housing with a dashed screen across the flow path; the medium reuses the accepted filter dashed-line idiom. Process stubs meet the left and right corners. The DSL cannot express a strainer.",
  },
  {
    id: "cyclone-separator", label: "Cyclone separator", draw: drawCyclone,
    engine: "cyclone", usageUsers: 9, inExemplar: false, tier: 3,
    dsl: ["equip CY-101 : cyclone"],
    standard: "ISO 10628-2:2012 X2618",
    sourceUrl: ISO,
    notes: "120-wide cylindrical chamber over a conical solids hopper, with side feed, top gas outlet and bottom solids outlet. An internal vortex finder marks the gas separation path; outline and nozzle weights follow the accepted vessel.",
  },
  {
    id: "reactor-plug-flow", label: "Plug-flow reactor", draw: drawPFR,
    engine: "reactor_pfr", usageUsers: 9, inExemplar: false, tier: 3,
    dsl: ["equip R-102 : reactor_pfr"],
    standard: "ISO 10628-2:2012 reg. 2062 (vessel body); tubular-reactor convention, no dedicated PFR symbol",
    sourceUrl: ISO,
    notes: "Tubular vessel with axial inlet and outlet using the accepted horizontal vessel dimensions and 2:1 heads. Plug-flow service is identified by equipment metadata; no unique standardized PFR glyph is claimed. Packing is not implied, unlike the engine drawing.",
  },
  {
    id: "vessel-spherical", label: "Spherical vessel", draw: drawSphere,
    engine: "sphere", usageUsers: 9, inExemplar: false, tier: 3,
    dsl: ["equip V-301 : sphere"],
    standard: "ISO 10628-2:2012 reg. 2063 (spherical vessel)",
    sourceUrl: ISO,
    notes: "120-diameter spherical shell, at the accepted vessel diameter, with top and bottom process nozzles. Supports are omitted as a separately inventoried accessory.",
  },
  {
    id: "burner", label: "Burner", draw: drawBurner,
    engine: "burner", usageUsers: 8, inExemplar: false, tier: 3,
    dsl: ["equip B-103 : burner"],
    standard: "ISO 10628-2:2012 X8107",
    sourceUrl: ISO,
    notes: "Fuel inlet and flared burner mouth with an outlined flame, reusing the white-flame treatment of the accepted boiler and flare. Fuel stub uses the accepted minor-process weight.",
  },
  {
    id: "column-packed", label: "Packed column", draw: drawPackedColumn,
    engine: "column_packed", usageUsers: 7, inExemplar: false, tier: 3,
    dsl: ["equip T-102 : column_packed"],
    standard: "ISO 10628-2:2012 X8141 (packing) in X8100 (column)",
    sourceUrl: ISO,
    notes: "Reuses the accepted vertical vessel shell, 2:1 heads and nozzles; two bounded beds with crossed diagonals identify packing. The tray column uses open alternating trays instead.",
  },
  {
    id: "cooling-tower", label: "Cooling tower", draw: drawCoolingTower,
    engine: "cooling_tower", usageUsers: 7, inExemplar: false, tier: 3,
    dsl: ["equip CT-101 : cooling_tower"],
    standard: "ISO 10628-2:2012 reg. 2521 (cooling tower)",
    sourceUrl: ISO,
    notes: "Waisted natural-draught tower matching the engine's broad rim, narrow middle and flared basin, 120 wide at the accepted vessel scale. The 24 px process stubs meet the water distribution and basin lines; the outline retains the accepted 1.6 px stroke.",
  },
  {
    id: "generator", label: "Generator", draw: drawGenerator,
    engine: "generator", usageUsers: 6, inExemplar: false, tier: 3,
    dsl: ["equip G-101 : generator"],
    standard: "ISO 10628-2:2012 C0079 (generator)",
    sourceUrl: ISO,
    notes: "Outlined 60-unit equipment circle marked G in the accepted Inter lettering. The left stub is a mechanical shaft at the symbol weight, not a process or signal line. Usage is an overcount because generator also occurs in labels.",
  },
  {
    id: "pump-diaphragm", label: "Diaphragm pump", draw: drawPumpDiaphragm,
    engine: "pump_diaphragm", usageUsers: 2, inExemplar: false, tier: 3,
    dsl: ["equip P-103 : pump_diaphragm"],
    standard: "ISO 10628-2:2012 X8095 (pump, diaphragm type)",
    sourceUrl: ISO,
    notes: "Reuses the accepted 60-unit pump casing, converging discharge lines and process stubs. A bowed diaphragm joins the top and bottom of the casing, following the cached ISO pump reference.",
  },
  {
    id: "pump-general", label: "Pump, general", draw: drawPumpGeneral,
    engine: "pump_general", usageUsers: 2, inExemplar: false, tier: 3,
    dsl: ["equip P-104 : pump_general"],
    standard: "ISO 10628-2:2012 reg. 2301 (pump, liquid type, general)",
    sourceUrl: ISO,
    notes: "Accepted pump casing and discharge convergence without the centrifugal diameter or a positive-displacement internal mark; follows the cached ISO pump reference.",
  },
  {
    id: "pump-screw", label: "Screw pump", draw: drawPumpScrew,
    engine: null, usageUsers: null, inExemplar: false, tier: 3,
    dsl: [],
    standard: "ISO 10628-2:2012 reg. 8092 (pump, screw type)",
    sourceUrl: ISO,
    notes: "Accepted pump casing with two parallel zigzag screw marks, following the cached ISO pump reference. The DSL cannot express a screw pump.",
  },
  {
    id: "pump-progressive-cavity", label: "Progressive-cavity pump", draw: drawPumpProgressiveCavity,
    engine: null, usageUsers: null, inExemplar: false, tier: 3,
    dsl: [],
    standard: "ISO 10628-2:2012 reg. 8093 (pump, progressive cavity type)",
    sourceUrl: ISO,
    notes: "Accepted pump casing with a continuous alternating curved rotor mark, following the cached ISO pump reference. The DSL cannot express a progressive-cavity pump.",
  },
  {
    id: "pump-piston", label: "Reciprocating piston pump", draw: drawPumpPiston,
    engine: null, usageUsers: null, inExemplar: false, tier: 3,
    dsl: [],
    standard: "ISO 10628-2:2012 X8094 (pump, reciprocating piston type)",
    sourceUrl: ISO,
    notes: "Accepted pump casing with a horizontal rod ending at a vertical piston bar, following the cached ISO pump reference. The DSL cannot express a piston pump.",
  },
  {
    id: "heat-exchanger-plate", label: "Plate heat exchanger", draw: drawHXPlate,
    engine: null, usageUsers: null, inExemplar: false, tier: 3,
    dsl: [],
    standard: "ISO 10628-2:2012 reg. 2516 (heat exchanger of plate type)",
    sourceUrl: ISO,
    notes: "Reuses the accepted 200 by 60 exchanger envelope with vertical plate divisions and crossed diagonals from the cached ISO plate-exchanger reference. Four process stubs identify the two circuits. The DSL cannot express a plate heat exchanger.",
  },
  {
    id: "heat-exchanger-u-tube", label: "U-tube heat exchanger", draw: drawHXUTube,
    engine: null, usageUsers: null, inExemplar: false, tier: 3,
    dsl: [],
    standard: "ISO 10628-2:2012 reg. 2513 (heat exchanger with U-shaped tubes)",
    sourceUrl: ISO,
    notes: "Accepted 200 by 60 exchanger shell with one tube sheet, a U-shaped tube and a divided channel. Both tube-side nozzles are left of the tube sheet; shell-side nozzles are to its right. Follows the cached ISO exchanger reference. The DSL cannot express a U-tube heat exchanger.",
  },
  {
    id: "motor-electric", label: "Electric motor", draw: drawMotor,
    engine: null, usageUsers: null, inExemplar: false, tier: 3,
    dsl: [],
    standard: "ISO 10628-2:2012 C0082 (electric motor)",
    sourceUrl: ISO,
    notes: "The accepted circular M operator idiom enlarged to the 60-unit equipment scale. The right stub is a mechanical shaft at symbol weight. The DSL cannot express a standalone electric motor.",
  },
  {
    id: "turbine", label: "Turbine", draw: drawTurbine,
    engine: null, usageUsers: null, inExemplar: false, tier: 3,
    dsl: [],
    standard: "ISO 10628-2:2012 reg. 2571 (turbine, general)",
    sourceUrl: ISO,
    notes: "Expanding turbine casing with inlet at the narrow end, exhaust at the wide end and a separate mechanical shaft to the right. Outline and shaft use 1.6; fluid connections use 2.5. The DSL cannot express a turbine.",
  },
  {
    id: "agitator", label: "Agitator", draw: drawAgitator,
    engine: null, usageUsers: null, inExemplar: false, tier: 3,
    dsl: [],
    standard: "ISO 10628-2:2012 reg. 2672 (agitator)",
    sourceUrl: ISO,
    notes: "The accepted shaft and top drive bar with a horizontal impeller hub and two short pitched blades angled in opposite directions, all in the accepted 1.6 px stroke. Open blades distinguish the agitator from a bowtie valve. The DSL cannot express a standalone agitator; heating jacket and vessel supports remain undrawn.",
  },
];

const STYLE = "Ink #1E293B only, on white #FFFFFF symbol fills, no colour: every symbol outline (and a bubble's inner shape and location line) is 1.6, process stubs 2.5 with minor process 1.5, signal stubs 1.4 (electric dashed 7/5, pneumatic with a pair of 45° slashes every 34, process connection plain). Drawn at exemplar scale: every valve is the same 44 × 28 bowtie, pumps are 60-unit circles, vessels are 120 in diameter with 2:1 heads 30 deep, the tank is 160 × 140 under a 26-deep roof, and instrument symbols are 36 tall with Inter 11.5/600 letters over an 11.5 regular loop number, shrunk only when a tag would touch its outline.";

const outDir = new URL("../../../visual-eval/symbols/pid/", import.meta.url);
await mkdir(outDir, { recursive: true });
for (const sym of SYMBOLS) {
  const s = await sym.draw();
  const x0 = Math.floor(s.x0 - PAD), y0 = Math.floor(s.y0 - PAD);
  const w = Math.ceil(s.x1 + PAD) - x0, h = Math.ceil(s.y1 + PAD) - y0;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x0} ${y0} ${w} ${h}" role="img">`,
    `<title>${sym.label}</title>`,
    ...s.g,
    `</svg>`,
  ].join("\n") + "\n";
  await writeFile(new URL(`${sym.id}.svg`, outDir), svg);
}
const manifest = {
  type: "pid",
  variant: null,
  exemplar: "pid",
  style: STYLE,
  symbols: SYMBOLS.map(({ id, label, engine, dsl, standard, sourceUrl, inExemplar, tier = 1, usageUsers, notes }) => ({
    id, label, file: `${id}.svg`, engine, dsl, standard, sourceUrl, inExemplar, tier, usageUsers, notes,
  })),
};
await writeFile(new URL("manifest.json", outDir), JSON.stringify(manifest, null, 2) + "\n");
console.log(`pid symbols: ${SYMBOLS.length} written`);
