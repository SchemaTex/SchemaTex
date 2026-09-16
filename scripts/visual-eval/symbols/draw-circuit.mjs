/** Draw visual-eval/symbols/circuit/ — the reviewed circuit schematic symbols in the circuit exemplar's style.
 *
 *   ./node_modules/.bin/vite-node scripts/visual-eval/symbols/draw-circuit.mjs
 *
 * The tokens and the five exemplar symbol functions are copied from
 * scripts/visual-eval/draw-circuit-exemplar.mjs (that script writes the
 * exemplar when imported, so it cannot be imported here). Every pin is the live
 * anchor from src/diagrams/circuit/symbols.ts scaled by K = 2, so a wire that
 * reaches a pin here reaches the same pin in the engine.
 *
 * Three kinds of symbol:
 *  - "copy": the exemplar's own drawing. It is first drawn where the exemplar puts
 *    it; every element must appear byte for byte in ideal.svg and every pin must lie
 *    on an exemplar wire.
 *  - "revised": drawn where the exemplar puts it with the same pins (checked against
 *    the exemplar wires), but the drawing deliberately departs from the exemplar to
 *    settle a flagged defect (see the symbol's notes).
 *  - "new": not in the exemplar; extrapolated from its rules. Every pin must be the
 *    end of a lead the symbol draws.
 * Each symbol is then redrawn with its top-left ink 8 px from the corner of its own
 * sheet, so one unit in the output is one exemplar pixel.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { effectiveSymbolDef } from "../../../src/diagrams/circuit/symbols.ts";
import { estimateTextWidth } from "../../../src/core/text-metrics.ts";

const root = new URL("../../../", import.meta.url);
const outDir = new URL("visual-eval/symbols/circuit/", root);
const ideal = await readFile(new URL("visual-eval/exemplars/circuit/ideal.svg", root), "utf8");

/* ---------- design tokens (copied from draw-circuit-exemplar.mjs) ---------- */
const INK = "#17212B", MUTED = "#52606D", PAPER = "#FFFFFF";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const SW = { wire: 2.5, body: 2.5, heavy: 4 };
const K = 2; // one live symbol unit = 2 px
const T = {
  pol: { fs: 17, fill: MUTED },      // polarity marks (exemplar)
  pinNum: { fs: 14, fill: MUTED },   // IC pin numbers (exemplar)
  letter: { fs: 18 },                // a qualifying letter inside a body (exemplar value size)
};
const PAD = 8;
const CONTACT_R = 4.5;   // open terminal circle of a switch contact
const ENVELOPE_R = 30;   // transistor envelope; centre 48 px right of the base or gate pin

let g = [];      // symbol graphics
let texts = [];  // { s, x, y, fs, bold, fill, anchor }
let extra = [];  // extent points for paths the parser cannot read (arcs)
let ends = [];   // lead end points: every pin must be one of them
const pins = {};
const box = () => {}; // the exemplar records bodies for its wire checks; a lone symbol has no wires

const n2 = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const line = (x1, y1, x2, y2, w = SW.body) => {
  ends.push([x1, y1], [x2, y2]);
  g.push(`<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`);
};
const poly = (p, w = SW.body) => {
  ends.push(p[0], p[p.length - 1]);
  g.push(`<polyline points="${p.map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ")}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`);
};
const text = (s, x, y, style, o = {}) =>
  texts.push({ s, x, y, fs: style.fs, bold: !!style.bold, fill: style.fill ?? INK, anchor: o.anchor ?? "start" });
/* New primitives, in the exemplar's attribute style. */
const circle = (cx, cy, r, w = SW.body) =>
  g.push(`<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${r}" fill="${PAPER}" stroke="${INK}" stroke-width="${w}"/>`);
const rect = (x, y, w, h) =>
  g.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${w}" height="${h}" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.body}"/>`);
const butt = (x1, y1, x2, y2, w) =>
  g.push(`<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${INK}" stroke-width="${w}"/>`);
const dashed = (x1, y1, x2, y2) =>
  g.push(`<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${INK}" stroke-width="2" stroke-dasharray="5 4"/>`);
/** A stroked open path. Arc paths pass their extent points, since arc flags are not coordinates. */
const path = (d, { pts = [], lead = false, fill = "none" } = {}) => {
  extra.push(...pts);
  if (lead) {
    const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    ends.push([nums[0], nums[1]], [nums[nums.length - 2], nums[nums.length - 1]]);
  }
  g.push(`<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${SW.body}" stroke-linecap="round" stroke-linejoin="round"/>`);
};
/** Solid arrowhead with its tip at (tx, ty), pointing along (ux, uy). Same form as the exemplar's. */
const arrowHead = (tx, ty, ux, uy, len = 13, half = 6) => {
  const bx = tx - ux * len, by = ty - uy * len;
  g.push(`<path d="M ${n2(tx)},${n2(ty)} L ${n2(bx - uy * half)},${n2(by + ux * half)} L ${n2(bx + uy * half)},${n2(by - ux * half)} Z" fill="${INK}"/>`);
};
const unit = (x1, y1, x2, y2) => { const L = Math.hypot(x2 - x1, y2 - y1); return [(x2 - x1) / L, (y2 - y1) / L, L]; };

/* ---------- placement from live symbol geometry (copied, plus per-instance pins) ---------- */
const ROT = {
  0: ([x, y]) => [x, y],
  90: ([x, y]) => [-y, x],   // rightward symbol turned to run downward
  270: ([x, y]) => [y, -x],  // rightward symbol turned to run upward
};
const place = (ref, type, [ox, oy], rot = 0, o = {}) => {
  const def = effectiveSymbolDef(type, o.attrs ?? {});
  const names = o.names
    ?? (def.netlistPins?.length ? def.netlistPins
      : o.attrs ? Object.keys(def.anchors).filter((k) => k !== "start" && k !== "end")
        : ["start", "end"]);
  const out = {};
  for (const name of names) {
    const a = def.anchors[name];
    assert(a, `${type} has no anchor ${name}`);
    const [dx, dy] = ROT[rot]([a.x * K, a.y * K]);
    out[name] = pins[`${ref}.${name}`] = [ox + dx, oy + dy];
  }
  return { pins: out, names };
};

/* ---------- exemplar symbols (copied from draw-circuit-exemplar.mjs) ---------- */
const resistorV = (ref, origin) => {
  const { pins: p } = place(ref, "resistor", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1], a = 11;
  const zig = [[x, y0], [x, y0 + 10], [x + a, y0 + 15], [x - a, y0 + 25], [x + a, y0 + 35],
    [x - a, y0 + 45], [x + a, y0 + 55], [x - a, y0 + 65], [x, y0 + 70], [x, y1]];
  poly(zig);
  box(ref, x - a, y0 + 12, x + a, y0 + 68);
  return p;
};
const capacitorV = (ref, origin, polarised = false) => {
  const { pins: p } = place(ref, polarised ? "electrolytic_cap" : "capacitor", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1], half = 20;
  const pa = y0 + 16, pb = y0 + 24;
  line(x, y0, x, pa, SW.wire);
  line(x - half, pa, x + half, pa, SW.heavy - 0.5);
  if (polarised) {
    g.push(`<path d="M ${x - half},${pb + 8} Q ${x},${pb - 8} ${x + half},${pb + 8}" fill="none" stroke="${INK}" stroke-width="${SW.heavy - 0.5}" stroke-linecap="round"/>`);
    text("+", x + half + 4, pa - 4, T.pol);
  } else {
    line(x - half, pb, x + half, pb, SW.heavy - 0.5);
  }
  line(x, pb, x, y1, SW.wire);
  box(ref, x - half, pa - 2, x + half, pb + (polarised ? 8 : 2));
  return p;
};
const ledV = (ref, origin) => {
  const { pins: p } = place(ref, "led", origin, 90);
  const [x, ya] = p.start, yk = p.end[1];
  const top = ya + 16, tip = ya + 44, half = 16;
  line(x, ya, x, top, SW.wire);
  g.push(`<path d="M ${x - half},${top} L ${x + half},${top} L ${x},${tip} Z" fill="${INK}" stroke="${INK}" stroke-width="${SW.body}" stroke-linejoin="round"/>`);
  line(x - half, tip, x + half, tip, SW.body + 0.5);
  line(x, tip, x, yk, SW.wire);
  for (const dy of [4, 18]) {
    const [sx, sy, ex, ey] = [x + 20, top + dy + 10, x + 38, top + dy - 6];
    line(sx, sy, ex, ey, 2);
    const u = [(ex - sx), (ey - sy)], L = Math.hypot(...u), ux = u[0] / L, uy = u[1] / L;
    const bx = ex - ux * 8, by = ey - uy * 8;
    g.push(`<path d="M ${n2(ex)},${n2(ey)} L ${n2(bx - uy * 4)},${n2(by + ux * 4)} L ${n2(bx + uy * 4)},${n2(by - ux * 4)} Z" fill="${INK}"/>`);
  }
  box(ref, x - half, top - 2, x + 40, tip + 2);
  return p;
};
const groundV = (ref, at) => {
  const [x, y] = at;
  pins[`${ref}.start`] = at;
  line(x, y, x, y + 22, SW.wire);
  line(x - 20, y + 22, x + 20, y + 22, SW.body);
  line(x - 13, y + 30, x + 13, y + 30, SW.body);
  line(x - 6, y + 38, x + 6, y + 38, SW.body);
  box(ref, x - 20, y + 20, x + 20, y + 40);
  return { start: at };
};

/* ---------- revised exemplar symbols ---------- */
// Battery: the exemplar's two cells, moved 1 px toward the + pin so both leads are 11 px.
const batteryV = (ref, bottom) => {
  const { pins: p } = place(ref, "battery", bottom, 270);
  const [x, yTop] = p.plus, yBot = p.minus[1];
  const plates = [[11, 22, SW.body], [19, 11, SW.heavy + 1], [29, 22, SW.body], [37, 11, SW.heavy + 1]];
  line(x, yTop, x, yTop + 11, SW.wire);
  for (const [dy, half, w] of plates) line(x - half, yTop + dy, x + half, yTop + dy, w);
  line(x, yTop + 37, x, yBot, SW.wire);
  text("+", x + 28, yTop + 17, T.pol);
  return p;
};
// Bipolar transistor: envelope r 30 centred 48 px right of the base pin, so collector and
// emitter leave the envelope 16 px before their pins; base bar ±22 at 4.5 px, 42 px from the
// base pin; emitter arrow halfway along the emitter inside the envelope (IEEE 315 8.2.4).
const bjt = (type) => (ref, baseAt) => {
  const { pins: p } = place(ref, type, baseAt, 0);
  const [bx, by] = p.b, barX = bx + 42;
  circle(bx + 48, by, ENVELOPE_R);
  line(bx, by, barX, by, SW.wire);
  line(barX, by - 22, barX, by + 22, SW.heavy + 0.5);
  for (const name of ["c", "e"]) {
    const [px, py] = p[name], sy = Math.sign(py - by);
    line(barX, by + sy * 11, px, py, SW.body);
  }
  const [ex, ey] = p.e, sy = Math.sign(ey - by);
  const [ux, uy] = unit(barX, by + sy * 11, ex, ey);
  if (type === "npn") arrowHead(barX + ux * 24, by + sy * 11 + uy * 24, ux, uy);          // outward
  else arrowHead(barX + ux * 10, by + sy * 11 + uy * 10, -ux, -uy);                         // inward
  return p;
};
const npn = bjt("npn"), pnp = bjt("pnp");

/* ---------- new symbols, extrapolated from the exemplar ---------- */
// Diode family: the LED's own body (triangle 32 wide and 28 tall, 16 px leads, 3 px bar).
const diodeFamily = (type, bar) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin, 90);
  const [x, ya] = p.start, yk = p.end[1];
  const top = ya + 16, tip = ya + 44, half = 16;
  line(x, ya, x, top, SW.wire);
  g.push(`<path d="M ${x - half},${top} L ${x + half},${top} L ${x},${tip} Z" fill="${INK}" stroke="${INK}" stroke-width="${SW.body}" stroke-linejoin="round"/>`);
  bar(x, tip, half);
  line(x, tip, x, yk, SW.wire);
  return p;
};
const diode = diodeFamily("diode", (x, tip, half) => line(x - half, tip, x + half, tip, SW.body + 0.5));
const zener = diodeFamily("zener", (x, tip, half) =>
  poly([[x - half - 5, tip + 7], [x - half, tip], [x + half, tip], [x + half + 5, tip - 7]], SW.body + 0.5));
const schottky = diodeFamily("schottky", (x, tip, half) =>
  poly([[x - half + 5, tip + 7], [x - half, tip + 7], [x - half, tip], [x + half, tip], [x + half, tip - 7], [x + half - 5, tip - 7]], SW.body + 0.5));

const potentiometerV = (ref, origin) => {
  const { pins: p } = place(ref, "potentiometer", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1], a = 11;
  poly([[x, y0], [x, y0 + 20], [x + a, y0 + 25], [x - a, y0 + 35], [x + a, y0 + 45],
    [x - a, y0 + 55], [x + a, y0 + 65], [x - a, y0 + 75], [x, y0 + 80], [x, y1]]);
  const [wx, wy] = p.wiper;
  line(wx, wy, x + 26, wy, SW.wire);
  arrowHead(x + 14, wy, -1, 0);
  return p;
};

const inductorV = (ref, origin) => {
  const { pins: p } = place(ref, "inductor", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1];
  path(`M ${x},${y0} L ${x},${y0 + 10} A 10,10 0 0 1 ${x},${y0 + 30} A 10,10 0 0 1 ${x},${y0 + 50} A 10,10 0 0 1 ${x},${y0 + 70} L ${x},${y1}`,
    { pts: [[x, y0], [x + 10, y0 + 20], [x, y1]], lead: true });
  return p;
};

const transformer = (ref, origin) => {
  const { pins: p } = place(ref, "transformer", origin, 0);
  const [ox, oy] = p.p1, bot = p.p2[1], xs = p.s1[0];
  const winding = (axis, sweep) => {
    let d = `M ${axis},${oy}`;
    for (let y = oy + 20; y <= bot; y += 20) d += ` A 10,10 0 0 ${sweep} ${axis},${y}`;
    path(d, { pts: [[axis, oy], [axis + (sweep ? 10 : -10), (oy + bot) / 2], [axis, bot]] });
  };
  line(ox, oy, ox + 30, oy, SW.wire); line(ox, bot, ox + 30, bot, SW.wire);
  winding(ox + 30, 1);
  line(ox + 56, oy, ox + 56, bot, SW.body); line(ox + 64, oy, ox + 64, bot, SW.body);
  winding(xs - 30, 0);
  line(xs - 30, oy, xs, oy, SW.wire); line(xs - 30, bot, xs, bot, SW.wire);
  return p;
};

// Sources stand upright like the battery: + pin on top, 80 px pin to pin, envelope r 24.
const sourceV = (type) => (ref, bottom) => {
  const { pins: p } = place(ref, type, bottom, 270);
  const [x, yTop] = p.plus, yBot = p.minus[1], cy = (yTop + yBot) / 2;
  line(x, yTop, x, cy - 24, SW.wire);
  circle(x, cy, 24);
  line(x, cy + 24, x, yBot, SW.wire);
  if (type === "voltage_source") {
    text("+", x, cy - 5, T.pol, { anchor: "middle" });
    text("−", x, cy + 17, T.pol, { anchor: "middle" });
  } else {
    path(`M ${x - 14},${cy} C ${x - 9},${cy - 13} ${x - 5},${cy - 13} ${x},${cy} C ${x + 5},${cy + 13} ${x + 9},${cy + 13} ${x + 14},${cy}`);
  }
  return p;
};
const voltageSource = sourceV("voltage_source"), acSource = sourceV("ac_source");

const supplyV = (ref, at) => {
  const [x, y] = at;
  pins[`${ref}.start`] = at;
  line(x, y, x, y - 22, SW.wire);
  line(x - 20, y - 22, x + 20, y - 22, SW.body);
  return { start: at };
};

const opamp = (ref, origin) => {
  const { pins: p } = place(ref, "opamp", origin, 0);
  const [ix, iy] = p.plus, [ox, oy] = p.out, cy = oy, x0 = ix + 16, x1 = ox - 16;
  g.push(`<path d="M ${x0},${cy - 40} L ${x1},${cy} L ${x0},${cy + 40} Z" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.body}" stroke-linejoin="round"/>`);
  line(ix, iy, x0, iy, SW.wire);
  line(p.minus[0], p.minus[1], x0, p.minus[1], SW.wire);
  line(x1, oy, ox, oy, SW.wire);
  text("+", x0 + 12, iy + 6, T.pol, { anchor: "middle" });
  text("−", x0 + 12, p.minus[1] + 6, T.pol, { anchor: "middle" });
  return p;
};

// Generic IC: the exemplar's U1 idiom — paper-filled body, 16 px pin leads, muted pin
// numbers outside the body. The default 8-pin block; pin positions follow the engine.
const IC_ATTRS = { pins_left: "1,2,3,4", pins_right: "8,7,6,5", ic_label: "" };
const genericIc = (ref, origin) => {
  const { pins: p, names } = place(ref, "generic_ic", origin, 0, { attrs: IC_ATTRS });
  const def = effectiveSymbolDef("generic_ic", IC_ATTRS);
  const [ox, oy] = origin, x0 = ox, x1 = ox + def.length * K, y0 = oy - 80, y1 = oy + 80;
  rect(x0, y0, x1 - x0, y1 - y0);
  for (const name of names) {
    const [px, py] = p[name];
    if (px < x0) { line(px, py, x0, py, SW.wire); text(name, x0 - 8, py - 7, T.pinNum, { anchor: "middle" }); }
    else { line(x1, py, px, py, SW.wire); text(name, x1 + 8, py - 7, T.pinNum, { anchor: "middle" }); }
  }
  return p;
};

const fuseV = (ref, origin) => {
  const { pins: p } = place(ref, "fuse", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1];
  rect(x - 9, y0 + 12, 18, 36);
  line(x, y0, x, y1, SW.wire);
  return p;
};

// Switch contacts: open terminal circles r 4.5 at the engine's contact points, blade 2.5 px.
const contact = (x, y) => circle(x, y, CONTACT_R);
const spstBlade = (x, y0) => {
  const [ux, uy, L] = unit(x, y0 + 20, x + 22, y0 + 58);
  line(x + ux * CONTACT_R, y0 + 20 + uy * CONTACT_R, x + 22, y0 + 58, SW.body);
  return [x + ux * L / 2, y0 + 20 + uy * L / 2];
};
const spstV = (type, linkage) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin, 90);
  const [x, y0] = p.start, y1 = p.end[1];
  line(x, y0, x, y0 + 20 - CONTACT_R, SW.wire);
  line(x, y0 + 60 + CONTACT_R, x, y1, SW.wire);
  contact(x, y0 + 20); contact(x, y0 + 60);
  const [mx, my] = spstBlade(x, y0);
  if (linkage) dashed(mx + 6, my, x + 42, my);
  return p;
};
const switchSpst = spstV("switch_spst", false), relayNo = spstV("relay_no", true);

const spdtV = (ref, origin) => {
  const { pins: p } = place(ref, "switch_spdt", origin, 90);
  const [x, y0] = p.common;
  line(x, y0, x, y0 + 20 - CONTACT_R, SW.wire);
  contact(x, y0 + 20);
  for (const name of ["nc", "no"]) {
    const [px, py] = p[name];
    line(px, py - 16 + CONTACT_R, px, py, SW.wire);
    contact(px, py - 16);
  }
  const [nx, ny] = [p.nc[0], p.nc[1] - 16];
  const [ux, uy, L] = unit(x, y0 + 20, nx, ny);
  line(x + ux * CONTACT_R, y0 + 20 + uy * CONTACT_R, x + ux * (L - CONTACT_R), y0 + 20 + uy * (L - CONTACT_R), SW.body);
  return p;
};

const relayCoilV = (ref, origin) => {
  const { pins: p } = place(ref, "relay_coil", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1];
  line(x, y0, x, y0 + 28, SW.wire);
  rect(x - 22, y0 + 28, 44, 24);
  line(x, y0 + 52, x, y1, SW.wire);
  return p;
};

// MOSFET: the transistor envelope; L-less gate line ±22 at 2.5 px, 36 px from the gate pin;
// enhancement channel of three butt-capped 4.5 px segments 44 px from the gate pin; drain and
// source leave the outer segments, bulk leaves the middle one and ties to the source.
const mosfet = (type) => (ref, gateAt) => {
  const { pins: p } = place(ref, type, gateAt, 0);
  const [gx, gy] = p.g, gateX = gx + 36, chX = gx + 44, tieX = gx + 68;
  circle(gx + 48, gy, ENVELOPE_R);
  line(gx, gy, gateX, gy, SW.wire);
  line(gateX, gy - 22, gateX, gy + 22, SW.body);
  for (const [a, b] of (type === "nmos_depletion" ? [[-22, 22]] : [[-22, -8], [-3, 3], [8, 22]])) butt(chX, gy + a, chX, gy + b, SW.heavy + 0.5);
  for (const name of ["d", "s"]) {
    const [px, py] = p[name], sy = Math.sign(py - gy);
    poly([[chX, gy + sy * 15], [px, gy + sy * 15], [px, py]], SW.body);
  }
  const ss = Math.sign(p.s[1] - gy);
  poly([[chX, gy], [tieX, gy], [tieX, gy + ss * 15]], SW.body);
  if (type === "nmos" || type === "nmos_depletion") arrowHead(chX + 3, gy, -1, 0);   // N channel: bulk arrow points at the channel
  else arrowHead(chX + 16, gy, 1, 0);                   // P channel: away from it
  return p;
};
const nmos = mosfet("nmos"), pmos = mosfet("pmos");

// Round bodies on two-terminal loads: envelope r 24, 16 px leads, like the sources.
const lampV = (ref, origin) => {
  const { pins: p } = place(ref, "lamp", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1], cy = (y0 + y1) / 2;
  circle(x, cy, 24);
  line(x, y0, x, cy - 12, SW.wire);
  line(x, cy + 12, x, y1, SW.wire);
  path(`M ${x},${cy - 12} A 12,12 0 0 1 ${x},${cy + 12}`, { pts: [[x + 12, cy]] });
  return p;
};
const motorV = (ref, origin) => {
  const { pins: p } = place(ref, "motor", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1], cy = (y0 + y1) / 2;
  line(x, y0, x, cy - 24, SW.wire);
  circle(x, cy, 24);
  line(x, cy + 24, x, y1, SW.wire);
  text("M", x, cy + 6.5, T.letter, { anchor: "middle" });
  return p;
};
const buzzerV = (ref, origin) => {
  const { pins: p } = place(ref, "buzzer", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1];
  line(x, y0, x, y0 + 26, SW.wire);
  rect(x - 14, y0 + 26, 28, 28);
  line(x, y0 + 54, x, y1, SW.wire);
  line(x + 14, y0 + 26, x + 26, y0 + 54, SW.body);
  return p;
};

// Terminal strip: one cell per terminal, an open terminal circle, the terminal number muted.
const TB_ATTRS = { pins: "1,2,3,4" };
const terminalBlock = (ref, origin) => {
  const { pins: p, names } = place(ref, "terminal_block", origin, 0, { attrs: TB_ATTRS });
  const ys = names.map((n) => p[n][1]), x0 = origin[0];
  const top = Math.min(...ys) - 18, bottom = Math.max(...ys) + 18;
  rect(x0, top, 64, bottom - top);
  for (let i = 1; i < ys.length; i++) line(x0, ys[i] - 18, x0 + 64, ys[i] - 18, SW.body);
  for (const name of names) {
    const [px, py] = p[name];
    line(px, py, x0 + 20 - CONTACT_R, py, SW.wire);
    circle(x0 + 20, py, CONTACT_R);
    text(name, x0 + 44, py + 5, T.pinNum, { anchor: "middle" });
  }
  return p;
};

/* ---------- round 2: Tier 2, in inventory order ---------- */
const combinedRelay = (type) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin);
  const [x, y] = origin;
  // The accepted 44 × 24 coil; each electrical lead reaches a different face.
  rect(x + 16, y - 12, 44, 24);
  for (const name of ["coil_a", "coil_b"]) {
    const [px, py] = p[name], sy = Math.sign(py - y);
    poly([[px, py], [x + 38, py], [x + 38, y + sy * 12]]);
  }
  if (type === "relay") {
    for (const name of ["common", "no"]) {
      const [px, py] = p[name];
      line(x + 100 + CONTACT_R, py, px, py); contact(x + 100, py);
    }
    const [ux, uy] = unit(x + 100, y - 20, x + 78, y + 18);
    line(x + 100 + ux * CONTACT_R, y - 20 + uy * CONTACT_R, x + 78, y + 18);
    dashed(x + 60, y, x + 88, y);
  } else {
    line(x + 100 + CONTACT_R, y, ...p.common); contact(x + 100, y);
    for (const name of ["nc", "no"]) {
      const [px, py] = p[name];
      line(x + 124 + CONTACT_R, py, px, py); contact(x + 124, py);
    }
    const [ux, uy, len] = unit(x + 100, y, x + 124, y - 32);
    line(x + 100 + ux * CONTACT_R, y + uy * CONTACT_R,
      x + 100 + ux * (len - CONTACT_R), y + uy * (len - CONTACT_R));
    dashed(x + 60, y - 16, x + 112, y - 16);
  }
  return p;
};
const contactorV = (ref, origin) => {
  const { pins: p } = place(ref, "contactor", origin, 90);
  const [x, y] = p.start;
  line(x, y, x, y + 22 - CONTACT_R); line(x, y + 66 + CONTACT_R, ...p.end);
  contact(x, y + 22); contact(x, y + 66);
  line(x + CONTACT_R, y + 22, x + 7, y + 22);
  line(x + CONTACT_R, y + 66, x + 7, y + 66);
  line(x + 18, y + 22, x + 18, y + 66);
  dashed(x + 18, y + 44, x + 40, y + 44);
  line(x + 40, y + 34, x + 40, y + 54);
  return p;
};
const pilotLightV = (ref, origin) => {
  const { pins: p } = place(ref, "pilot_light", origin, 90);
  const [x, y] = p.start, cy = y + 22;
  circle(x, cy, 16);
  line(x, y, x, cy - 8); line(x, cy + 8, ...p.end);
  path(`M ${x},${cy - 8} A 8,8 0 0 1 ${x},${cy + 8}`, { pts: [[x + 8, cy]] });
  text("G", x + 24, cy + 6, T.letter);
  return p;
};
const speakerH = (ref, origin) => {
  const { pins: p } = place(ref, "speaker", origin);
  const [x, y] = p.start;
  rect(x + 24, y - 12, 12, 24);
  path(`M ${x + 36},${y - 12} L ${x + 60},${y - 26} L ${x + 60},${y + 26} L ${x + 36},${y + 12} Z`, { fill: PAPER });
  poly([[x, y], [x + 12, y], [x + 12, y - 6], [x + 24, y - 6]]);
  // Route the second terminal to the driver, never to the acoustic cone.
  poly([[...p.end], [x + 80, y + 40], [x + 16, y + 40], [x + 16, y + 6], [x + 24, y + 6]]);
  return p;
};
const fanV = (ref, origin) => {
  const { pins: p } = place(ref, "fan", origin, 90);
  const [x, y] = p.start, cy = y + 44;
  circle(x, cy, 24); line(x, y, x, cy - 24); line(x, cy + 24, ...p.end);
  text("M", x, cy + 6.5, T.letter, { anchor: "middle" });
  text("FAN", x + 34, cy + 6.5, T.letter);
  return p;
};
const comparatorTriangle = (ref, origin) => {
  opamp(ref, origin);
  return place(ref, "comparator", origin).pins;
};
const closedSwitchV = (type) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin, 90);
  const [x, y] = p.start, y1 = p.end[1], a = y + 16, b = y1 - 16;
  line(x, y, x, a - CONTACT_R); line(x, b + CONTACT_R, ...p.end);
  contact(x, a); contact(x, b); line(x, a + CONTACT_R, x, b - CONTACT_R);
  if (type === "emergency_stop") {
    const cy = (a + b) / 2;
    dashed(x, cy, x + 28, cy);
    // Mushroom-head manual actuator, shown released; no panel-face artwork.
    line(x + 28, cy - 14, x + 28, cy + 14);
    path(`M ${x + 28},${cy - 14} Q ${x + 50},${cy} ${x + 28},${cy + 14}`);
  }
  return p;
};
const ldrV = (ref, origin) => {
  const { pins: p } = place(ref, "ldr", origin, 90);
  const [x, y] = p.start;
  resistorV(ref, [x, y + 10]);
  line(x, y, x, y + 10); line(x, y + 90, ...p.end);
  for (const dy of [32, 52]) {
    const [sx, sy, tx, ty] = [x - 42, y + dy - 16, x - 18, y + dy];
    line(sx, sy, tx, ty, 2); const [ux, uy] = unit(sx, sy, tx, ty);
    arrowHead(tx, ty, ux, uy, 8, 4);
  }
  return p;
};
const antennaH = (ref, origin) => {
  const { pins: p } = place(ref, "antenna", origin);
  const [x, y] = p.start;
  // Both engine layout anchors are on the same feed conductor.
  line(x, y, ...p.end); line(x + 30, y, x + 30, y - 44);
  poly([[x + 10, y - 44], [x + 30, y - 20], [x + 50, y - 44]]);
  return p;
};
const meterV = (type, letter) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin, 90);
  const [x, y] = p.start, cy = y + 40;
  circle(x, cy, 24); line(x, y, x, cy - 24); line(x, cy + 24, ...p.end);
  text(letter, x, cy + 6.5, T.letter, { anchor: "middle" });
  return p;
};
const crystalV = (ref, origin) => {
  const { pins: p } = place(ref, "crystal", origin, 90);
  const [x, y] = p.start;
  line(x, y, x, y + 20); line(x, y + 60, ...p.end);
  line(x - 20, y + 20, x + 20, y + 20, 3.5);
  rect(x - 14, y + 28, 28, 24);
  line(x - 20, y + 60, x + 20, y + 60, 3.5);
  return p;
};
const optocouplerH = (ref, origin) => {
  const { pins: p } = place(ref, "optocoupler", origin);
  const [x, y] = origin, dx = x + 24, bar = x + 76;
  // LED triangle/bar dimensions and transistor envelope match the accepted set.
  circle(x + 82, y, ENVELOPE_R);
  poly([[...p.a], [dx, y - 24], [dx, y - 14]]);
  path(`M ${dx - 16},${y - 14} L ${dx + 16},${y - 14} L ${dx},${y + 14} Z`, { fill: INK });
  line(dx - 16, y + 14, dx + 16, y + 14, 3);
  poly([[dx, y + 14], [dx, y + 24], [...p.k]]);
  line(bar, y - 22, bar, y + 22, 4.5);
  for (const name of ["c", "e"]) {
    const [px, py] = p[name], sy = Math.sign(py - y);
    // Turning out at x + 100 keeps the actual engine pins beyond the envelope.
    poly([[bar, y + sy * 11], [x + 100, y + sy * 24], [px, py]]);
  }
  const [ux, uy] = unit(bar, y + 11, x + 100, y + 24);
  arrowHead(bar + ux * 21, y + 11 + uy * 21, ux, uy, 10, 4.5);
  for (const dy of [-8, 8]) {
    line(x + 42, y + dy, x + 65, y + dy, 2);
    arrowHead(x + 65, y + dy, 1, 0, 8, 4);
  }
  return p;
};
const regulatorH = (ref, origin) => {
  const { pins: p } = place(ref, "voltage_regulator", origin);
  const [x, y] = origin;
  rect(x + 16, y - 26, 88, 50);
  line(...p.in, x + 16, y); line(x + 104, y, ...p.out);
  line(x + 60, y + 24, ...p.gnd);
  text("REG", x + 60, y + 6.5, T.letter, { anchor: "middle" });
  return p;
};
const centreOffV = (ref, origin) => {
  const { pins: p } = place(ref, "switch_spdt_center_off", origin, 90);
  const [x, y] = p.common;
  line(x, y, x, y + 20 - CONTACT_R); contact(x, y + 20);
  for (const name of ["left", "right"]) {
    const [px, py] = p[name];
    line(px, py - 20 + CONTACT_R, px, py); contact(px, py - 20);
  }
  line(x, y + 20 + CONTACT_R, x, y + 72);
  return p;
};

/* ---------- round 2 continuation: next 18 inventory entries ---------- */
const noConnect = (ref, origin) => {
  const { pins: p } = place(ref, "no_connect", origin);
  const [x, y] = p.start;
  line(x - 16, y, x, y);
  line(x - 6, y - 6, x + 6, y + 6);
  line(x - 6, y + 6, x + 6, y - 6);
  return p;
};
const variableResistorV = (type) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin, 90);
  const [x, y] = p.start, offset = (p.end[1] - y - 80) / 2;
  resistorV(ref, [x, y + offset]);
  if (offset) { line(x, y, x, y + offset); line(x, y + offset + 80, ...p.end); }
  const cy = (y + p.end[1]) / 2;
  if (type === "rheostat") {
    line(x - 25, cy + 28, x + 25, cy - 28);
    const [ux, uy] = unit(x - 25, cy + 28, x + 25, cy - 28);
    arrowHead(x + 25, cy - 28, ux, uy);
  } else {
    // Intrinsic nonlinearity: bent diagonal qualifier, not an adjustable wiper.
    poly([[x - 28, cy + 18], [x - 20, cy + 26], [x + 20, cy - 26], [x + 28, cy - 18]]);
    text("V", x + 32, cy + 6, T.letter);
  }
  return p;
};
const selectorV = (ref, origin) => {
  const { pins: p } = place(ref, "selector_switch", origin, 90);
  const [x, y] = p.start, a = y + 12, b = p.end[1] - 12;
  line(x, y, x, a - CONTACT_R); line(x, b + CONTACT_R, ...p.end);
  contact(x, a); contact(x, b);
  const [ux, uy] = unit(x, a, x + 16, b - 2);
  line(x + ux * CONTACT_R, a + uy * CONTACT_R, x + 16, b - 2);
  dashed(x + 8, (a + b) / 2, x + 34, (a + b) / 2);
  text("SELECTOR", x + 42, (a + b) / 2 + 6, T.letter);
  return p;
};
const scrV = (ref, origin) => {
  const { pins: p } = place(ref, "scr", origin, 90);
  const [x, y] = p.a;
  line(x, y, x, y + 22);
  path(`M ${x - 16},${y + 22} L ${x + 16},${y + 22} L ${x},${y + 50} Z`, { fill: INK });
  line(x - 16, y + 50, x + 16, y + 50, 3); line(x, y + 50, ...p.k);
  poly([[...p.g], [x - 24, p.g[1]], [x - 8, y + 50]]);
  return p;
};
const triacV = (ref, origin) => {
  const { pins: p } = place(ref, "triac", origin, 90);
  const [x, y] = p.mt1, top = y + 24, bot = y + 56;
  line(x, y, x, top); line(x, bot, ...p.mt2);
  line(x - 28, top, x + 28, top, 3); line(x - 28, bot, x + 28, bot, 3);
  path(`M ${x - 28},${top} L ${x - 4},${top} L ${x - 16},${bot} Z`, { fill: INK });
  path(`M ${x + 4},${bot} L ${x + 28},${bot} L ${x + 16},${top} Z`, { fill: INK });
  poly([[...p.g], [x - 32, y + 16], [x - 24, top]]);
  return p;
};
const igbtH = (ref, origin) => {
  const { pins: p } = place(ref, "igbt", origin);
  const [x, y] = p.g, gate = x + 32, bar = x + 44;
  circle(x + 48, y, ENVELOPE_R);
  line(x, y, gate, y); line(gate, y - 22, gate, y + 22);
  line(bar, y - 22, bar, y + 22, 4.5);
  for (const name of ["c", "e"]) {
    const [px, py] = p[name]; line(bar, y + Math.sign(py - y) * 11, px, py);
  }
  const [ux, uy] = unit(bar, y + 11, ...p.e);
  arrowHead(bar + ux * 23, y + 11 + uy * 23, ux, uy);
  return p;
};
const terminalH = (type) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin);
  const [x, y] = p.start, cx = (x + p.end[0]) / 2, r = CONTACT_R;
  line(x, y, cx - r, y); line(cx + r, y, ...p.end); contact(cx, y);
  if (type === "test_point") text("TP", cx, y - 12, T.letter, { anchor: "middle" });
  return p;
};
const photodiodeV = (ref, origin) => {
  const p = diodeFamily("photodiode", (x, tip, half) => line(x - half, tip, x + half, tip, 3))(ref, origin);
  const [x, y] = p.start;
  for (const dy of [20, 36]) {
    line(x + 42, y + dy - 16, x + 22, y + dy, 2);
    const [ux, uy] = unit(x + 42, y + dy - 16, x + 22, y + dy);
    arrowHead(x + 22, y + dy, ux, uy, 8, 4);
  }
  return p;
};
const microphoneV = (ref, origin) => {
  const { pins: p } = place(ref, "microphone", origin, 90);
  const [x, y] = p.start, cy = y + 40;
  circle(x, cy, 24); line(x, y, x, cy - 24); line(x, cy + 24, ...p.end);
  line(x - 30, cy - 24, x - 30, cy + 24);
  return p;
};
const relayNcV = (ref, origin) => {
  const p = closedSwitchV("relay_nc")(ref, origin);
  dashed(p.start[0], (p.start[1] + p.end[1]) / 2, p.start[0] + 34, (p.start[1] + p.end[1]) / 2);
  return p;
};
const currentSourceV = (ref, origin) => {
  const { pins: p } = place(ref, "current_source", origin, 270);
  const [x, y] = p.plus, cy = y + 40;
  circle(x, cy, 24); line(x, y, x, cy - 24); line(x, cy + 24, ...p.minus);
  // SPICE positive current runs from the first (+) net to the second (-) net.
  line(x, cy - 13, x, cy + 13); arrowHead(x, cy + 13, 0, 1, 10, 5);
  return p;
};
const bridgeRectifierH = (ref, origin) => {
  const { pins: p } = place(ref, "bridge_rectifier", origin);
  const [x, y] = origin, left = [x + 12, y], right = [x + 84, y], top = [x + 48, y - 36], bot = [x + 48, y + 36];
  for (const [name, pt] of [["ac1", left], ["ac2", right], ["dcp", top], ["dcn", bot]]) line(...p[name], ...pt);
  const branch = (a, b) => {
    const [ux, uy] = unit(...a, ...b), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const base = [mid[0] - ux * 10.5, mid[1] - uy * 10.5], tip = [mid[0] + ux * 10.5, mid[1] + uy * 10.5];
    line(...a, ...base);
    path(`M ${n2(base[0] - uy * 12)},${n2(base[1] + ux * 12)} L ${n2(base[0] + uy * 12)},${n2(base[1] - ux * 12)} L ${n2(tip[0])},${n2(tip[1])} Z`, { fill: INK });
    line(tip[0] - uy * 12, tip[1] + ux * 12, tip[0] + uy * 12, tip[1] - ux * 12, 3);
    line(...tip, ...b);
  };
  branch(bot, left); branch(bot, right); branch(left, top); branch(right, top);
  text("+", x + 62, y - 39, T.pol); text("−", x + 62, y + 51, T.pol);
  return p;
};
const timer555 = (ref, origin) => {
  const { pins: p } = place(ref, "555_timer", origin);
  const [x, y] = origin, w = 224;
  rect(x, y - 120, w, 240);
  const labels = { gnd: [1, "GND"], trg: [2, "TRIG"], out: [3, "OUT"], rst: [4, "RESET"], ctl: [5, "CTRL"], thr: [6, "THR"], dis: [7, "DISCH"], vcc: [8, "VCC"] };
  for (const [name, [num, label]] of Object.entries(labels)) {
    const [px, py] = p[name];
    if (px < x) {
      line(px, py, x, py); text(label, x + 12, py + 5, { fs: 15 }); text(String(num), x - 8, py - 7, T.pinNum, { anchor: "middle" });
    } else if (px > x + w) {
      line(x + w, py, px, py); text(label, x + w - 12, py + 5, { fs: 15 }, { anchor: "end" }); text(String(num), x + w + 8, py - 7, T.pinNum, { anchor: "middle" });
    } else if (py < y) {
      line(px, py, px, y - 120); text(label, px, y - 98, { fs: 15 }, { anchor: "middle" }); text(String(num), px - 7, y - 128, T.pinNum, { anchor: "end" });
    } else {
      line(px, y + 120, px, py); text(label, px, y + 108, { fs: 15 }, { anchor: "middle" }); text(String(num), px - 7, y + 134, T.pinNum, { anchor: "end" });
    }
  }
  text("555 TIMER", x + w / 2, y + 164, T.letter, { anchor: "middle" });
  return p;
};
const pushNoV = (ref, origin) => {
  const p = spstV("push_no", false)(ref, origin), [x, y] = p.start;
  const [ux, uy, len] = unit(x, y + 20, x + 22, y + 58), cy = y + 20 + uy * len / 2;
  dashed(x + ux * len / 2, cy, x + 40, cy);
  line(x + 40, cy, x + 52, cy); line(x + 52, cy - 12, x + 52, cy + 12);
  return p;
};
const jfetN = (ref, origin, type = "jfet_n") => {
  const { pins: p } = place(ref, type, origin);
  const [x, y] = p.g, bar = x + 44;
  circle(x + 48, y, ENVELOPE_R);
  line(x, y, bar, y);
  if (type === "jfet_p") arrowHead(bar - 13, y, -1, 0, 11, 5);
  else arrowHead(bar - 2, y, 1, 0, 11, 5);
  line(bar, y - 22, bar, y + 22, 4.5);
  for (const name of ["d", "s"]) {
    const [px, py] = p[name], sy = Math.sign(py - y);
    poly([[bar, y + sy * 15], [x + 64, y + sy * 15], [px, py]]);
  }
  return p;
};
const chassisGroundH = (ref, origin) => {
  const { pins: p } = place(ref, "gnd_chassis", origin);
  const [x, y] = p.start, cx = x + 20;
  line(x, y, ...p.end); line(cx, y, cx, y + 22);
  line(cx - 20, y + 22, cx + 20, y + 22);
  for (const dx of [-14, 0, 14]) line(cx + dx, y + 22, cx + dx - 8, y + 34);
  return p;
};

/* ---------- round 2 continuation: final Tier 2 and first Tier 3 entries ---------- */
const pushNcV = (ref, origin) => {
  const p = closedSwitchV("push_nc")(ref, origin), [x, y] = p.start, cy = y + 40;
  dashed(x, cy, x + 40, cy);
  line(x + 40, cy, x + 52, cy); line(x + 52, cy - 12, x + 52, cy + 12);
  return p;
};
const thermistorNtcV = (ref, origin, type = "thermistor_ntc") => {
  const { pins: p } = place(ref, type, origin, 90);
  const [x, y] = p.start, cy = y + 50;
  resistorV(ref, [x, y + 10]);
  line(x, y, x, y + 10); line(x, y + 90, ...p.end);
  poly([[x - 28, cy + 18], [x - 20, cy + 26], [x + 20, cy - 26], [x + 28, cy - 18]]);
  text(type === "thermistor_ptc" ? "PTC" : "NTC", x + 36, cy + 6, T.letter);
  return p;
};
const signalGroundH = (ref, origin) => {
  const { pins: p } = place(ref, "gnd_signal", origin);
  const [x, y] = p.start, cx = x + 20;
  line(x, y, ...p.end); line(cx, y, cx, y + 22);
  path(`M ${cx - 20},${y + 22} L ${cx + 20},${y + 22} L ${cx},${y + 46} Z`, { fill: PAPER });
  return p;
};
const plcH = (ref, origin) => {
  const { pins: p } = place(ref, "plc", origin, 0, { names: ["start", "end", "pwr", "out"] });
  const [x, y] = origin;
  rect(x + 16, y - 32, 108, 96);
  for (const name of ["start", "pwr"]) line(...p[name], x + 16, p[name][1]);
  for (const name of ["end", "out"]) line(x + 124, p[name][1], ...p[name]);
  text("PLC", x + 70, y - 44, T.letter, { anchor: "middle" });
  return p;
};
const panelAidH = (type) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin);
  const [x, y] = p.start, right = p.end[0], w = right - x - 32;
  line(x, y, x + 16, y); line(right - 16, y, ...p.end);
  if (type === "enclosure") {
    rect(x + 16, y - 16, w, 320);
    text("ENCLOSURE", (x + right) / 2, y - 28, T.letter, { anchor: "middle" });
  } else if (type === "din_rail") {
    rect(x + 16, y - 14, w, 28);
    for (let dx = 32; dx < w; dx += 32) rect(x + dx, y - 6, 16, 12);
    text("DIN RAIL", (x + right) / 2, y - 26, T.letter, { anchor: "middle" });
  } else {
    rect(x + 16, y - 22, w, 44);
    for (let dx = 32; dx < w; dx += 24) {
      line(x + dx, y - 22, x + dx, y - 8); line(x + dx, y + 8, x + dx, y + 22);
    }
    text("WIRE DUCT", (x + right) / 2, y - 34, T.letter, { anchor: "middle" });
  }
  return p;
};
const converterH = (ref, origin) => {
  const { pins: p } = place(ref, "dc_dc_converter", origin), [x, y] = origin;
  rect(x + 16, y - 40, 68, 80);
  for (const name of ["vin", "gin"]) line(...p[name], x + 16, p[name][1]);
  for (const name of ["vout", "gout"]) line(x + 84, p[name][1], ...p[name]);
  line(x + 24, y + 30, x + 76, y - 30);
  text("DC", x + 22, y - 12, T.letter); text("DC", x + 48, y + 26, T.letter);
  return p;
};
const ferriteBeadV = (ref, origin) => {
  const { pins: p } = place(ref, "ferrite_bead", origin, 90), [x, y] = p.start;
  path(`M ${x - 12},${y + 24} L ${x + 12},${y + 16} L ${x + 12},${y + 36} L ${x - 12},${y + 44} Z`, { fill: PAPER });
  line(x, y, ...p.end);
  text("FERRITE", x + 24, y + 36, T.letter);
  return p;
};
const flasherH = (ref, origin) => {
  const { pins: p } = place(ref, "automotive_flasher_3pin", origin), [x, y] = origin;
  rect(x + 16, y - 38, 84, 76);
  line(...p.b, x + 16, y);
  for (const name of ["l", "p"]) line(x + 100, p[name][1], ...p[name]);
  text("B", x + 24, y + 6, T.letter);
  text("L", x + 76, y - 16, T.letter); text("P", x + 76, y + 28, T.letter);
  text("FLASHER", x + 58, y - 50, T.letter, { anchor: "middle" });
  return p;
};
const triodeH = (ref, origin) => {
  const { pins: p } = place(ref, "triode", origin), [x, y] = p.grid;
  circle(x + 48, y, ENVELOPE_R);
  line(x, y, x + 28, y);
  for (const dx of [28, 40, 52, 64]) line(x + dx, y, x + dx + 6, y);
  line(x + 34, y - 14, x + 62, y - 14);
  poly([[x + 48, y - 14], [x + 48, y - 40], [p.plate[0], y - 40], [...p.plate]]);
  poly([[x + 38, y + 18], [x + 38, y + 10], [x + 58, y + 10], [x + 58, y + 18]]);
  poly([[x + 48, y + 10], [x + 48, y + 40], [p.cathode[0], y + 40], [...p.cathode]]);
  return p;
};
const diacV = (ref, origin) => {
  const { pins: p } = place(ref, "diac", origin, 90), [x, y] = p.start, top = y + 20, bot = y + 52;
  line(x, y, x, top); line(x, bot, ...p.end);
  line(x - 28, top, x + 28, top, 3); line(x - 28, bot, x + 28, bot, 3);
  path(`M ${x - 28},${top} L ${x - 4},${top} L ${x - 16},${bot} Z`, { fill: INK });
  path(`M ${x + 4},${bot} L ${x + 28},${bot} L ${x + 16},${top} Z`, { fill: INK });
  return p;
};
const oscilloscopeV = (ref, origin) => {
  const { pins: p } = place(ref, "oscilloscope", origin, 90), [x, y] = p.start, cy = y + 40;
  circle(x, cy, 24); line(x, y, x, cy - 24); line(x, cy + 24, ...p.end);
  path(`M ${x - 14},${cy} C ${x - 9},${cy - 13} ${x - 5},${cy - 13} ${x},${cy} C ${x + 5},${cy + 13} ${x + 9},${cy + 13} ${x + 14},${cy}`);
  text("SCOPE", x + 36, cy + 6, T.letter);
  return p;
};
const phototransistorH = (ref, origin) => {
  npn(ref, origin);
  const { pins: p } = place(ref, "phototransistor", origin), [x, y] = p.b;
  for (const dx of [0, 16]) {
    const a = [x + dx, y - 44], b = [x + dx + 20, y - 24];
    line(...a, ...b, 2); const [ux, uy] = unit(...a, ...b); arrowHead(...b, ux, uy, 8, 4);
  }
  return p;
};
const solenoidValveV = (ref, origin) => {
  const { pins: p } = place(ref, "solenoid_valve", origin, 90), [x, y] = p.start;
  inductorV(ref, [x, y + 10]);
  line(x, y, x, y + 10); line(x, y + 90, ...p.end);
  text("VALVE", x + 28, y + 56, T.letter);
  return p;
};
const thermalOverloadV = (ref, origin) => {
  const p = closedSwitchV("thermal_overload")(ref, origin), [x, y] = p.start;
  dashed(x, y + 40, x + 32, y + 40);
  poly([[x + 32, y + 26], [x + 32, y + 54], [x + 42, y + 54]]);
  text("THERMAL", x + 54, y + 46, T.letter);
  return p;
};
const varactorV = (ref, origin) => {
  const { pins: p } = place(ref, "varactor", origin, 90), [x, y] = p.start;
  line(x, y, x, y + 12);
  path(`M ${x - 16},${y + 12} L ${x + 16},${y + 12} L ${x},${y + 40} Z`, { fill: INK });
  line(x - 16, y + 40, x + 16, y + 40, 3);
  line(x - 16, y + 48, x + 16, y + 48, 3.5); line(x, y + 48, ...p.end);
  return p;
};

/* ---------- round 2 continuation: final 20 Tier 3 entries ---------- */
const solarCellV = (ref, origin) => {
  const { pins: p } = place(ref, "solar_cell", origin, 270), [x, y] = p.plus;
  line(x, y, x, y + 28); line(x - 22, y + 28, x + 22, y + 28);
  line(x - 11, y + 44, x + 11, y + 44, 5); line(x, y + 44, ...p.minus);
  text("+", x - 36, y + 28, T.pol);
  for (const dx of [0, 18]) {
    const a = [x + 28 + dx, y + 6], b = [x + 12 + dx, y + 22];
    line(...a, ...b, 2); const [ux, uy] = unit(...a, ...b); arrowHead(...b, ux, uy, 8, 4);
  }
  return p;
};
const dpdtH = (ref, origin) => {
  const { pins: p } = place(ref, "switch_dpdt", origin), mids = [];
  for (const i of [1, 2]) {
    const [x, y] = p[`p${i}`], cx = x + 20, tx = p[`nc${i}`][0] - 16, ty = p[`nc${i}`][1];
    line(x, y, cx - CONTACT_R, y); contact(cx, y);
    for (const name of [`nc${i}`, `no${i}`]) {
      line(tx + CONTACT_R, p[name][1], ...p[name]); contact(tx, p[name][1]);
    }
    const [ux, uy, len] = unit(cx, y, tx, ty);
    line(cx + ux * CONTACT_R, y + uy * CONTACT_R, cx + ux * (len - CONTACT_R), y + uy * (len - CONTACT_R));
    mids.push([(cx + tx) / 2, (y + ty) / 2]);
  }
  dashed(...mids[0], ...mids[1]);
  return p;
};
const slowFuseV = (ref, origin) => {
  fuseV(ref, origin);
  const { pins: p } = place(ref, "fuse_slow", origin, 90);
  text("T", p.start[0] + 22, p.start[1] + 36, T.letter);
  return p;
};
const tvsV = (ref, origin) => {
  const { pins: p } = place(ref, "tvs_diode", origin, 90), [x, y] = p.start;
  line(x, y, x, y + 12); line(x, y + 60, ...p.end);
  // Opposed breakdown diodes, with their cathodes connected between the two Z bars.
  path(`M ${x - 16},${y + 12} L ${x + 16},${y + 12} L ${x},${y + 32} Z`, { fill: INK });
  path(`M ${x - 16},${y + 60} L ${x + 16},${y + 60} L ${x},${y + 40} Z`, { fill: INK });
  poly([[x - 21, y + 39], [x - 16, y + 32], [x + 16, y + 32], [x + 21, y + 25]], 3);
  poly([[x - 21, y + 47], [x - 16, y + 40], [x + 16, y + 40], [x + 21, y + 33]], 3);
  line(x, y + 32, x, y + 40);
  return p;
};
const proximityH = (ref, origin) => {
  const { pins: p } = place(ref, "proximity_sensor", origin), [x, y] = p.start;
  rect(x + 16, y - 28, 76, 56);
  line(x, y, x + 16, y); line(x + 92, y, ...p.end);
  path(`M ${x + 54},${y - 14} Q ${x + 66},${y} ${x + 54},${y + 14} M ${x + 64},${y - 20} Q ${x + 82},${y} ${x + 64},${y + 20}`);
  text("PROX", x + 54, y - 40, T.letter, { anchor: "middle" });
  return p;
};
const darlingtonH = (type) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin), [x, y] = p.b;
  circle(x + 48, y, ENVELOPE_R);
  poly([[x, y], [x + 20, y], [x + 20, y - 9], [x + 28, y - 9]]);
  line(x + 28, y - 18, x + 28, y, 4.5);
  line(x + 52, y - 2, x + 52, y + 18, 4.5);
  // Separate diagonal transistor branches from the orthogonal collector bus.
  line(x + 28, y - 15, x + 42, y - 24);
  poly([[x + 42, y - 24], [p.c[0], y - 24], [...p.c]]);
  poly([[x + 52, y + 1], [x + 68, y - 9], [x + 68, y - 24]]);
  // Q1 emitter drops to Q2's base; no diagonal return or polygon around the pair.
  poly([[x + 28, y - 3], [x + 44, y + 3], [x + 44, y + 8], [x + 52, y + 8]]);
  poly([[x + 52, y + 14], [x + 68, y + 23], [p.e[0], y + 23], [...p.e]]);
  for (const [a, b] of [[[x + 28, y - 3], [x + 44, y + 3]], [[x + 52, y + 14], [x + 68, y + 23]]]) {
    const [ux, uy, len] = unit(...a, ...b), outward = type === "darlington_npn";
    const t = outward ? len - 4 : 4;
    arrowHead(a[0] + ux * t, a[1] + uy * t, outward ? ux : -ux, outward ? uy : -uy, 8, 3.5);
  }
  return p;
};
const digitalGroundH = (ref, origin) => {
  signalGroundH(ref, origin);
  const { pins: p } = place(ref, "gnd_digital", origin);
  text("DIGITAL", p.start[0] + 52, p.start[1] + 36, T.letter);
  return p;
};
const variableCapV = (ref, origin) => {
  const { pins: p } = place(ref, "variable_cap", origin, 90), [x, y] = p.start;
  capacitorV(ref, [x, y + 4]); line(x, y, x, y + 4); line(x, y + 44, ...p.end);
  line(x - 28, y + 48, x + 28, y);
  const [ux, uy] = unit(x - 28, y + 48, x + 28, y); arrowHead(x + 28, y, ux, uy);
  return p;
};
const inductorVariantV = (type) => (ref, origin) => {
  inductorV(ref, origin);
  const { pins: p } = place(ref, type, origin, 90), [x, y] = p.start;
  if (type === "variable_inductor") {
    line(x - 18, y + 70, x + 28, y + 10);
    const [ux, uy] = unit(x - 18, y + 70, x + 28, y + 10); arrowHead(x + 28, y + 10, ux, uy);
  } else {
    line(x + 20, y + 10, x + 20, y + 70);
    if (type === "inductor_iron") line(x + 28, y + 10, x + 28, y + 70);
    else text("FERRITE", x + 32, y + 46, T.letter);
  }
  return p;
};
const instrumentationH = (ref, origin) => {
  const { pins: p } = place(ref, "instrumentation_amp", origin), [x, y] = origin;
  path(`M ${x + 16},${y - 40} L ${x + 84},${y} L ${x + 16},${y + 40} Z`, { fill: PAPER });
  line(x + 22, y - 34, x + 22, y + 34);
  line(...p.inp, x + 16, p.inp[1]); line(...p.inn, x + 16, p.inn[1]); line(x + 84, y, ...p.out);
  text("+", x + 32, p.inp[1] + 6, T.pol, { anchor: "middle" });
  text("−", x + 32, p.inn[1] + 6, T.pol, { anchor: "middle" });
  text("INA", x + 50, y - 52, T.letter, { anchor: "middle" });
  return p;
};
const bufferH = (type) => (ref, origin) => {
  const { pins: p } = place(ref, type, origin), [x, y] = p.in;
  path(`M ${x + 16},${y - 28} L ${x + 72},${y} L ${x + 16},${y + 28} Z`, { fill: PAPER });
  line(x, y, x + 16, y); line(x + 72, y, ...p.out);
  if (type === "schmitt_buffer") {
    poly([[x + 26, y + 8], [x + 34, y + 8], [x + 34, y - 8], [x + 46, y - 8]]);
    poly([[x + 26, y + 8], [x + 40, y + 8], [x + 40, y - 8], [x + 46, y - 8]]);
  } else line(...p.en, p.en[0], y - 17);
  return p;
};
const socketH = (ref, origin) => {
  const { pins: p } = place(ref, "mains_socket", origin), [x, y] = p.start;
  path(`M ${x + 16},${y - 20} A 20,20 0 0 1 ${x + 16},${y + 20}`,
    { pts: [[x + 16, y - 20], [x + 36, y], [x + 16, y + 20]] });
  line(x, y, x + 16, y); line(x + 16, y, x + 64, y); line(x + 64, y, ...p.end);
  line(x + 64, y - 16, x + 64, y + 16);
  text("SOCKET", x + 40, y - 36, T.letter, { anchor: "middle" });
  return p;
};
const disconnectV = (ref, origin) => {
  const { pins: p } = place(ref, "disconnect_switch", origin, 90), [x, y] = p.start;
  spstV("switch_spst", false)(ref, [x, y + 8]);
  line(x, y, x, y + 8); line(x, y + 88, ...p.end);
  text("ISOLATOR", x + 36, y + 54, T.letter);
  return p;
};

/* ---------- the tier-1 set, families in order of designator-prefix usage ---------- */
const IEEE315 = "https://standards.ieee.org/ieee/315_/6396/";
const SPECS = [
  // R — 2,296 users
  {
    id: "resistor", label: "Resistor", mode: "copy", part: "R1", at: [540, 275], draw: (o) => resistorV("R1", o),
    pinNames: { start: "start", end: "end" }, engine: "resistor", usageUsers: 2296,
    dsl: ["R1 <net> <net> (netlist, R prefix)", "R1: resistor down", "type=resistor", "pullup"],
    standard: "IEEE 315-1975 §2.1.1 resistor, general (zigzag form)",
    notes: "Three zigzag cycles (six corners, amplitude 11) across the middle 60 px of an 80 px pin pitch, with 10 px straight leads, all at the 2.5 px wire weight. The engine packs seven corners with a taller swing (16 px at this scale) into the same span, so it reads busier. Users: the R designator count, since the resistor is what a bare R draws.",
  },
  {
    id: "potentiometer", label: "Potentiometer", mode: "new", draw: (o) => potentiometerV("RV1", o),
    pinNames: { start: "start", wiper: "wiper", end: "end" }, engine: "potentiometer", usageUsers: 189,
    dsl: ["R1 <a> <wiper> <b> type=pot (netlist; pins start, wiper, end)", "type=potentiometer", "pot"],
    standard: "IEEE 315-1975 §2.1.3 resistor with adjustable contact",
    notes: "The resistor's zigzag (60 px, amplitude 11) on a 100 px pitch, so the leads are 20 px, with the wiper pin 44 px to the side at mid-length and a solid 13 px arrowhead stopping just short of the zigzag. The engine draws the same parts with the arrow coming down onto the zigzag from above. Users: word count for pot / potentiometer.",
  },
  // V — 1,826 users
  {
    id: "voltage_source", label: "DC voltage source", mode: "new", draw: (o) => voltageSource("V1", o),
    pinNames: { plus: "plus (+)", minus: "minus (−)" }, engine: "voltage_source", usageUsers: 1826,
    dsl: ["V1 <+net> <−net> (netlist, V prefix)", "type=voltage_source", "vsource", "dc_supply"],
    standard: "Independent DC voltage source, circle with + and − (circuit-analysis and SPICE convention; IEEE 315-1975 §2.5.1 would draw a single battery cell)",
    notes: "An upright 48 px paper-filled circle with muted 17 px + above − inside, 16 px leads and the + pin on top, 80 px pin to pin, standing the way the battery stands. IEEE 315 draws a generalized DC source as one battery cell, which would make a V source indistinguishable from a one-cell battery; the circle keeps the distinction the netlist makes. The engine draws the same circle half the size with the + and − set off-centre. Users: the V designator count, since the DC source is what a bare V draws.",
  },
  {
    id: "ac_source", label: "AC voltage source", mode: "new", draw: (o) => acSource("V2", o),
    pinNames: { plus: "plus", minus: "minus" }, engine: "ac_source", usageUsers: 17,
    dsl: ["V1 <net> <net> type=ac (netlist)", "type=ac_source", "ac", "acsource"],
    standard: "IEEE 315-1975 §2.7 oscillator, generalized alternating-current source",
    notes: "The DC source's circle and leads with one full sine cycle (28 px wide, 2.5 px) inside, kept horizontal whatever way the leads run. The engine's sine is a smaller pair of quadratic humps. Users: word count; most AC sources are written as a bare V, so this undercounts.",
  },
  // Q — 1,461 users
  {
    id: "npn", label: "NPN bipolar transistor", mode: "revised", part: "Q1", at: [1110, 468], draw: (o) => npn("Q1", o),
    pinNames: { b: "base", c: "collector", e: "emitter" }, engine: "npn", usageUsers: 1461,
    dsl: ["Q1 <c> <b> <e> (netlist, Q prefix)", "Q1: npn", "type=npn", "transistor", "bjt_npn"],
    standard: "IEEE 315-1975 §8.6.2 NPN transistor, with envelope (Introduction A4.11; emitter and collector per §8.2.4–8.2.5)",
    notes: "Revised from the exemplar's Q1 so the collector and emitter leads run 16 px beyond the envelope to their pins, as IEEE 315 draws them: the envelope shrinks from r 36 to r 30 and sits 48 px right of the base pin; the pins stay on the engine's anchors (base 80 px left of collector and emitter, which are 32 px above and below it). Base bar ±22 at 4.5 px; collector and emitter meet the bar at about 60°; the solid emitter arrow sits halfway along the emitter inside the envelope and points outward. The engine's leads cross its smaller envelope the same way, but its base bar is no heavier than the leads and its arrowhead is small. Users: the Q designator count, since NPN is what a bare Q draws.",
  },
  {
    id: "pnp", label: "PNP bipolar transistor", mode: "new", draw: (o) => pnp("Q2", o),
    pinNames: { b: "base", c: "collector", e: "emitter" }, engine: "pnp", usageUsers: 66,
    dsl: ["Q1 <c> <b> <e> pnp (netlist, Q prefix + model token)", "type=pnp", "bjt_pnp"],
    standard: "IEEE 315-1975 §8.6.1 PNP transistor, with envelope",
    notes: "The NPN drawing with the emitter on top, where the engine puts it, and the emitter arrow pointing in toward the base bar. The engine's inward arrow sits on the bar itself, where it reads as a blob. Users: word count for pnp / bjt_pnp.",
  },
  // C — 1,455 users
  {
    id: "capacitor", label: "Capacitor", mode: "copy", part: "C3", at: [330, 660], draw: (o) => capacitorV("C3", o),
    pinNames: { start: "start", end: "end" }, engine: "capacitor", usageUsers: 1455,
    dsl: ["C1 <net> <net> (netlist, C prefix)", "C1: capacitor down", "type=capacitor"],
    standard: "IEEE 315-1975 §2.2.1 capacitor, general, style 1 (Note 2.2C)",
    notes: "Exactly C3 in the exemplar: two straight 40 px plates at 3.5 px, 8 px apart, 16 px leads, 40 px pin to pin. The engine draws the plates at lead weight. Users: the C designator count, since the plain capacitor is what a bare C draws.",
  },
  {
    id: "electrolytic_cap", label: "Polarized electrolytic capacitor", mode: "copy", part: "C1", at: [540, 660], draw: (o) => capacitorV("C1", o, true),
    pinNames: { start: "start (+)", end: "end (−)" }, engine: "electrolytic_cap", usageUsers: 1,
    dsl: ["C1 <+net> <−net> type=ecap (netlist)", "C1: electrolytic_cap down", "type=electrolytic_cap", "ecap"],
    standard: "IEEE 315-1975 §2.2.2 polarized capacitor, style 2 (Notes 2.2A, 2.2C)",
    notes: "A straight positive plate and a curved negative plate, both 40 px wide at 3.5 px, 8 px apart (the 1:5 minimum of Note 2.2C), with the curve's ends turned away from the straight plate and one muted + beside it. The engine bows its curve the other way, ends pointing back at the straight plate, draws both plates at lead weight and prints both + and −. Users: word count; most electrolytics are written as a bare C with a value, so the real number is far higher.",
  },
  // U / X — 1,264 users
  {
    id: "generic_ic", label: "Integrated circuit (generic block)", mode: "new", draw: (o) => genericIc("U1", o),
    pinNames: Object.fromEntries(["1", "2", "3", "4", "5", "6", "7", "8"].map((n) => [n, `pin ${n}`])), engine: "generic_ic", usageUsers: 1264,
    dsl: ["U1 <net> <net> … pins=\"VCC,GND,OUT,…\" (netlist, U or X prefix)", "type=ic", "ic", "mcu"],
    standard: "IEEE 315-1975 §16.1 circuit element (rectangle); pin names inside and numbers outside per the exemplar's U1 and Horowitz & Hill",
    notes: "The exemplar's U1 idiom for the engine's default 8-pin block: a 160 × 160 paper-filled rectangle, 16 px pin leads on a 32 px pitch, pins 1–4 down the left and 8–5 down the right, and muted 14 px pin numbers outside the body above each lead. Pin names, when a netlist gives them, go inside at 15 px as on U1; the part name is a designator and stays off the symbol. The engine prints its labels inside at a small size with no numbers outside. Users: the U designator count (X adds 192 more), since a generic block is what a bare U or X draws.",
  },
  {
    id: "opamp", label: "Operational amplifier", mode: "new", draw: (o) => opamp("U2", o),
    pinNames: { plus: "non-inverting (+)", minus: "inverting (−)", out: "output" }, engine: "opamp", usageUsers: 196,
    dsl: ["U1 <+in> <−in> <out> type=opamp (netlist)", "type=opamp"],
    standard: "IEEE 315-1975 §16.2.3 amplifier with two inputs (triangle pointing in the direction of transmission); input polarity marks as op-amp datasheets draw them",
    notes: "A 68 × 80 paper-filled triangle whose base sits 16 px inside the input pins and whose tip stops 16 px short of the output pin, so every pin ends a lead; muted 17 px + and − just inside the base beside their inputs, + on top where the engine puts the non-inverting pin. The engine's inputs sit on the triangle's base with no lead and its output pin is the bare tip. IEEE 315 §17.1 also shows a teardrop op-amp outline that is almost never used, so the triangle is kept. Users: word count.",
  },
  // D — 1,048 users
  {
    id: "diode", label: "Diode", mode: "new", draw: (o) => diode("D2", o),
    pinNames: { start: "start (anode)", end: "end (cathode)" }, engine: "diode", usageUsers: 1048,
    dsl: ["D1 <anode> <cathode> (netlist, D prefix)", "type=diode"],
    standard: "IEEE 315-1975 §8.5.1 semiconductor diode (envelope omitted, §8.2.2 filled triangle touching the bar)",
    notes: "The LED's body without the emission arrows: a filled triangle 32 px wide and 28 px tall pointing from anode to cathode, a 3 px cathode bar, 16 px leads, 60 px pin to pin. The engine draws the same shape smaller with its bar at lead weight. Users: the D designator count, since the plain diode is what a bare D draws.",
  },
  {
    id: "led", label: "Light-emitting diode", mode: "copy", part: "D1", at: [1190, 322], draw: (o) => ledV("D1", o),
    pinNames: { start: "start (anode)", end: "end (cathode)" }, engine: "led", usageUsers: 691,
    dsl: ["D1 <anode> <cathode> led (netlist, D prefix + model token)", "D1: led down", "type=led"],
    standard: "IEEE 315-1975 §8.5.1 semiconductor diode with §1.3.1 radiation arrows pointing away (Note 1.3B)",
    notes: "A filled triangle pointing from anode to cathode, a 3 px cathode bar, 60 px between pins, and two parallel emission arrows with solid heads leaving the junction. The engine's arrowheads are open corners no wider than the shaft, so its emission arrows read as short double strokes above the triangle. Users: word count.",
  },
  {
    id: "zener", label: "Zener diode", mode: "new", draw: (o) => zener("D3", o),
    pinNames: { start: "start (anode)", end: "end (cathode)" }, engine: "zener", usageUsers: 137,
    dsl: ["D1 <anode> <cathode> zener (netlist, D prefix + model token)", "type=zener"],
    standard: "IEEE 315-1975 §8.5.6.1 breakdown diode, unidirectional (voltage regulator), style 2",
    notes: "The diode with the cathode bar's ends bent 7 px in opposite directions, one toward the anode and one away, into a Z, at the bar's 3 px weight. The engine's bends are the same form at lead weight. Users: word count.",
  },
  {
    id: "schottky", label: "Schottky diode", mode: "new", draw: (o) => schottky("D4", o),
    pinNames: { start: "start (anode)", end: "end (cathode)" }, engine: "schottky", usageUsers: 120,
    dsl: ["D1 <anode> <cathode> schottky (netlist, D prefix + model token)", "type=schottky"],
    standard: "Schottky barrier diode: §8.5.1 diode with S-hooked cathode bar (industry practice; not in the 1975 edition)",
    notes: "The diode with each end of the cathode bar bent 7 px and turned 5 px back, one toward the anode and one away, into an S. The hooks stop clear of the triangle; the engine's hooks nearly touch it. Users: word count.",
  },
  // F — 816 users
  {
    id: "fuse", label: "Fuse", mode: "new", draw: (o) => fuseV("F1", o),
    pinNames: { start: "start", end: "end" }, engine: "fuse", usageUsers: 816,
    dsl: ["F1 <net> <net> (netlist, F prefix)", "type=fuse"],
    standard: "IEEE 315-1975 §9.1.1 fuse, general (rectangle with the conductor through it)",
    notes: "An 18 × 36 paper-filled rectangle with the 2.5 px lead running straight through it, 60 px pin to pin. IEEE 315 also allows the S-curve form; the rectangle stays legible at small sizes and cannot be misread as a resistor on a sheet that uses zigzag resistors. The engine draws a rounded capsule. Users: the F designator count, since the fuse is what a bare F draws.",
  },
  // S / SW — 746 users
  {
    id: "switch_spst", label: "Switch, single-pole single-throw", mode: "new", draw: (o) => switchSpst("S1", o),
    pinNames: { start: "start", end: "end" }, engine: "switch_spst", usageUsers: 746,
    dsl: ["S1 <net> <net> (netlist, S prefix)", "type=switch_spst", "switch", "switch_no"],
    standard: "IEEE 315-1975 §4.6.1 switch, single-throw, with §5.1.1 terminals (Introduction A4.7)",
    notes: "Two open terminal circles (r 4.5) 40 px apart on an 80 px pin pitch, 15.5 px leads, and a 2.5 px blade leaving the upper contact about 30° off the conductor line and ending beside the lower one, shown open. The engine draws filled dots, which on a schematic mean junctions. Users: the S designator count (SW adds 236 more), since the SPST switch is what a bare S draws.",
  },
  {
    id: "switch_spdt", label: "Switch, single-pole double-throw", mode: "new", draw: (o) => spdtV("S2", o),
    pinNames: { common: "common", nc: "normally closed", no: "normally open" }, engine: "switch_spdt", usageUsers: 62,
    dsl: ["S1 <common> <nc> <no> type=switch_spdt (netlist)", "type=switch_spdt"],
    standard: "IEEE 315-1975 §4.6.2 switch, double-throw; §4.3.3 transfer contact, blade form",
    notes: "The common contact on top and the two throw contacts 48 px apart below it, all open terminal circles with leads to the engine's pins; the blade rests against the normally closed contact. The engine draws filled dots and leaves the blade short of both contacts, so neither position is shown. Users: word count.",
  },
  // M — 656 users
  {
    id: "nmos", label: "N-channel MOSFET (enhancement)", mode: "new", draw: (o) => nmos("M1", o),
    pinNames: { g: "gate", d: "drain", s: "source" }, engine: "nmos", usageUsers: 656,
    dsl: ["M1 <d> <g> <s> (netlist, M prefix)", "type=nmos", "mosfet_n"],
    standard: "IEEE 315-1975 §8.6.10 N-channel insulated-gate FET: §8.2.3 enhancement channel, §8.2.8 insulated gate, bulk tied to source as in §8.6.10.3",
    notes: "The transistor envelope (r 30), a 2.5 px gate line parallel to a channel of three butt-capped 4.5 px segments (outer segments 14 px, gaps 5 px, centre 6 px), drain and source leaving the outer segments and turning to their pins, and the bulk leaving the centre segment and tying to the source. The N-channel bulk arrow points at the channel. The gate lead meets the gate line in the middle because the engine's gate pin is level with the channel centre; IEEE 315 attaches it at the source end. The engine's arrow points away from the channel, which is the P-channel sign, and it has no envelope or bulk tie. Users: the M designator count, since the N-channel MOSFET is what a bare M draws.",
  },
  {
    id: "pmos", label: "P-channel MOSFET (enhancement)", mode: "new", draw: (o) => pmos("M2", o),
    pinNames: { g: "gate", d: "drain", s: "source" }, engine: "pmos", usageUsers: 96,
    dsl: ["M1 <d> <g> <s> pmos (netlist, M prefix + model token)", "type=pmos", "mosfet_p"],
    standard: "IEEE 315-1975 §8.6.11 P-channel insulated-gate FET: §8.2.3 enhancement channel, §8.2.8 insulated gate, bulk tied to source",
    notes: "The N-channel drawing with the source on top, where the engine puts it, and the bulk arrow pointing away from the channel. The engine's arrow points at the channel, which is the N-channel sign, so its P and N symbols are swapped. Users: word count.",
  },
  // T — 615 users (the parser draws a bare T as a terminal block)
  {
    id: "transformer", label: "Transformer (magnetic core)", mode: "new", draw: (o) => transformer("T1", o),
    pinNames: { p1: "primary 1", p2: "primary 2", s1: "secondary 1", s2: "secondary 2" }, engine: "transformer", usageUsers: 262,
    dsl: ["T1 <p1> <p2> <s1> <s2> type=transformer (netlist; a bare T draws a terminal block)", "type=transformer", "xfmr"],
    standard: "IEEE 315-1975 §6.4.2.1 magnetic-core transformer, nonsaturating",
    notes: "Two windings of four loops (r 10, 2.5 px) facing a core of two 2.5 px lines 8 px apart, with 30 px leads out to the engine's four pins 80 px apart on each side, 120 px across. The loops are the inductor's loops. The engine's windings sit at the pins with long gaps to the core. Users: word count; the T designator count (615) is not used because a bare T draws a terminal block.",
  },
  // L — 591 users
  {
    id: "inductor", label: "Inductor", mode: "new", draw: (o) => inductorV("L1", o),
    pinNames: { start: "start", end: "end" }, engine: "inductor", usageUsers: 591,
    dsl: ["L1 <net> <net> (netlist, L prefix)", "type=inductor"],
    standard: "IEEE 315-1975 §6.2.1 inductor, winding (loop form)",
    notes: "Three loops (r 10) across the middle 60 px of an 80 px pitch with 10 px leads, the resistor's proportions, at 2.5 px; the loops match the transformer's. The engine draws the same three loops half the size. Users: the L designator count, since the inductor is what a bare L draws.",
  },
  // K — 491 users
  {
    id: "relay_coil", label: "Relay coil", mode: "new", draw: (o) => relayCoilV("K1", o),
    pinNames: { start: "start", end: "end" }, engine: "relay_coil", usageUsers: 491,
    dsl: ["K1 <net> <net> (netlist, K prefix)", "type=relay_coil", "coil"],
    standard: "IEEE 315-1975 §4.5 operating coil, relay coil (rectangle form)",
    notes: "A 44 × 24 paper-filled rectangle across the conductor with 28 px leads, 80 px pin to pin. The engine adds a diagonal stroke through the rectangle, which IEEE 315 §4.5 does not have. Users: the K designator count, since the coil is what a bare K draws.",
  },
  {
    id: "relay_no", label: "Relay contact, normally open", mode: "new", draw: (o) => relayNo("K1a", o),
    pinNames: { start: "start", end: "end" }, engine: "relay_no", usageUsers: 32,
    dsl: ["K1 <net> <net> type=relay_no (netlist)", "type=relay_no"],
    standard: "IEEE 315-1975 §4.3.2 open contact (make), blade form, with §14.1.1 mechanical linkage",
    notes: "The SPST switch drawing with a short dashed linkage (2 px, 5 on 4 off) leaving the blade's midpoint, which marks the contact as worked by a coil drawn elsewhere. The engine floats its dashes above the blade without touching it. Users: word count; the composite relay (coil and contact in one symbol) has 510 more.",
  },
  // Symbols without a designator family of their own, by word count
  {
    id: "vcc", label: "Supply connection (power flag)", mode: "new", draw: (o) => supplyV("PWR1", o),
    pinNames: { start: "start" }, engine: "vcc", usageUsers: 1983,
    dsl: ["PWR1 <rail> type=vcc (netlist)", "type=vcc"],
    standard: "IEEE 315-1975 §3.9.3.1 common connection at a specific potential (the rail name replaces the asterisk)",
    notes: "The ground symbol turned up: a 22 px stem and one 40 px bar at 2.5 px, the pin at the stem's foot. The rail name (+9 V, VCC) is diagram text set beside the bar, not part of the symbol. The engine draws a short bar floating beside a wire stub. Users: word count, but vcc is mostly a net name, so this measures how often a named supply rail exists, not how often the symbol is drawn.",
  },
  {
    id: "motor", label: "Motor", mode: "new", draw: (o) => motorV("MOT1", o),
    pinNames: { start: "start", end: "end" }, engine: "motor", usageUsers: 476,
    dsl: ["M1 <net> <net> type=motor (netlist; a bare M draws a MOSFET)", "type=motor", "dc_motor"],
    standard: "IEEE 315-1975 §13.1.3 motor, general",
    notes: "An upright 48 px paper-filled circle with an ink M at 18 px, 16 px leads, 80 px pin to pin. The engine draws the same thing half the size. Users: word count.",
  },
  {
    id: "battery", label: "Battery (multicell)", mode: "revised", part: "BT1", at: [170, 704], draw: (o) => batteryV("BT1", o),
    pinNames: { plus: "plus (+)", minus: "minus (−)" }, engine: "battery", usageUsers: 433,
    dsl: ["BT1 <+net> <−net> (netlist, B prefix)", "B1: battery up", "type=battery"],
    standard: "IEEE 315-1975 §2.5 battery, §2.5.3 multicell: the long line is always positive",
    notes: "Two cells, each a long thin plate (44 px at 2.5 px) toward the + pin and a short heavy plate (22 px at 5 px) toward the − pin, pins 48 px apart, with a muted + at the positive end. Revised from the exemplar's BT1: the plates move 1 px toward the + pin so both leads are 11 px (the exemplar has 12 and 10). The engine puts a long plate next to its minus pin, so it draws the polarity backwards, and draws long and short plates at one weight. Users: word count; the BT designator alone has 12.",
  },
  {
    id: "lamp", label: "Lamp (incandescent)", mode: "new", draw: (o) => lampV("DS1", o),
    pinNames: { start: "start", end: "end" }, engine: "lamp", usageUsers: 431,
    dsl: ["L1 <net> <net> type=lamp (netlist; a bare L draws an inductor)", "type=lamp", "light", "bulb"],
    standard: "IEEE 315-1975 §11.1.4 incandescent lamp (filament loop inside a circle), leads brought in from opposite sides",
    notes: "An upright 48 px paper-filled circle; both leads run into it and are joined by a filament loop (r 12) bulging to one side. IEEE 315 brings both leads in from one side; the engine's pins are at opposite ends, so the leads enter top and bottom. The engine draws a circle with an X, the IEC signal-lamp symbol, which is not in IEEE 315. Users: word count for lamp / light / bulb.",
  },
  {
    id: "ground", label: "Ground", mode: "copy", part: "_GND", at: [250, 800], draw: (o) => groundV("_GND", o),
    pinNames: { start: "start" }, engine: "ground", usageUsers: 274,
    dsl: ["0 or GND as a net name (a ground symbol is added automatically)", "GND1 <net> type=ground", "gnd"],
    standard: "IEEE 315-1975 §3.9.1 ground, general",
    notes: "Exactly the exemplar's ground: a 22 px stem hanging from the pin and three bars 40, 26 and 12 px long, 8 px apart, all at 2.5 px. The engine draws a small sideways version. Users: word count; nearly every netlist references ground through a 0 or GND net, so the symbol appears far more often than this.",
  },
  {
    id: "buzzer", label: "Buzzer", mode: "new", draw: (o) => buzzerV("BZ1", o),
    pinNames: { start: "start", end: "end" }, engine: "buzzer", usageUsers: 178,
    dsl: ["BZ1 <net> <net> type=buzzer (netlist)", "type=buzzer"],
    standard: "IEEE 315-1975 §10.1.2 buzzer",
    notes: "A 28 px paper-filled square on the conductor with 26 px leads and a 2.5 px reed line slanting away from one top corner, as §10.1.2 draws it. The engine draws a dome, which is the §10.1.1 bell. Users: word count.",
  },
  {
    id: "terminal_block", label: "Terminal block (4 terminals)", mode: "new", draw: (o) => terminalBlock("TB1", o),
    pinNames: { 1: "terminal 1", 2: "terminal 2", 3: "terminal 3", 4: "terminal 4" }, engine: "terminal_block", usageUsers: 42,
    dsl: ["T1 <net> <net> <net> <net> (netlist, T prefix; pins=\"1,2,3,4\")", "type=terminal_block", "terminal", "tb"],
    standard: "IEEE 315-1975 §5.1.1.1 terminal board or terminal strip, with terminals shown",
    notes: "A 64 px wide paper-filled strip of 36 px cells, one per terminal, each with an open terminal circle (r 4.5, the switch contacts' size), a lead from its pin to the circle and the terminal number in muted 14 px. Pins sit on the engine's anchors. The engine draws a 160 px box with the wire running through a numbered circle and out the far side. Users: word count; a bare T (615 users) also draws a terminal block, though many of those users meant a transformer.",
  },
  // Round 2: the next inventory rows (no-connect pending convention review).
  {
    id: "relay", label: "Relay, coil and normally open contact", mode: "new", draw: (o) => combinedRelay("relay")("B1", o),
    pinNames: {"coil_a": "coil_a", "coil_b": "coil_b", "common": "common", "no": "no"}, engine: "relay", tier: 2, usageUsers: 510,
    dsl: ["K1 CA CB COM NO type=relay"],
    standard: "IEEE 315-1975 \u00a74.30.2 relay assembly, using \u00a74.5 coil and \u00a74.3.2 make contact", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 44 \u00d7 24 plain rectangular coil mechanically links to an open blade and hollow terminals. Separate coil leads enter opposite coil faces. The engine adds nonstandard coil slashes and uses filled contacts.",
  },
  {
    id: "contactor", label: "Contactor, single pole, double break", mode: "new", draw: (o) => contactorV("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "contactor", tier: 2, usageUsers: 148,
    dsl: ["S1 A B type=contactor"],
    standard: "IEEE 315-1975 \u00a74.29 contactor; \u00a74.3.2 make contacts and \u00a714.1.1 mechanical linkage", sourceUrl: IEEE315, inExemplar: false,
    notes: "A normally open double-break bridge moves toward two fixed contacts together. Hollow terminals, 2.5 px contacts and a dashed actuator link reuse the switch idiom. The engine draws parallel diagonal blades without a distinct double-break bridge.",
  },
  {
    id: "pilot_light", label: "Pilot light, green incandescent", mode: "new", draw: (o) => pilotLightV("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "pilot_light", tier: 2, usageUsers: 93,
    dsl: ["DS1 A B type=pilot_light"],
    standard: "IEEE 315-1975 \u00a711.1.1 lamp, \u00a711.1.1B colour letter G and \u00a711.1.4 incandescent filament", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted filament lamp on the engine's compact 44 px pitch, with a 16 px radius envelope, 8 px filament loop and ink G qualifier for green. Leads reach both pins. The engine draws concentric panel-face circles with no electrical leads.",
  },
  {
    id: "speaker", label: "Loudspeaker", mode: "new", draw: (o) => speakerH("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "speaker", tier: 2, usageUsers: 89,
    dsl: ["LS1 A B type=speaker"],
    standard: "IEEE 315-1975 \u00a710.1.3 loudspeaker", sourceUrl: IEEE315, inExemplar: false,
    notes: "A rectangular driver and flared cone, paper filled with 2.5 px outlines. Both leads enter the driver; the return routes below the cone to the opposite engine anchor. The engine omits the lead to its end anchor and draws two leads on the left.",
  },
  {
    id: "fan", label: "Fan motor", mode: "new", draw: (o) => fanV("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "fan", tier: 2, usageUsers: 73,
    dsl: ["M1 A B type=fan"],
    standard: "IEEE 315-1975 \u00a713.1.3 motor, with FAN application qualifier", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 48 px motor circle and 18 px M on the engine's 88 px pitch, with FAN identifying the driven load. IEEE 315 has no separate fan impeller primitive; the engine's filled IEC impeller is replaced by the motor and functional qualifier.",
  },
  {
    id: "comparator", label: "Comparator", mode: "new", draw: (o) => comparatorTriangle("B1", o),
    pinNames: {"plus": "plus", "minus": "minus", "out": "out"}, engine: "comparator", tier: 2, usageUsers: 66,
    dsl: ["U1 INP INM OUT type=comparator"],
    standard: "IEEE 315-1975 \u00a716.2.3 amplifier with two inputs, used as comparator", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted op-amp triangle, lead lengths and muted input polarity marks. There is no inversion bubble: the minus input already identifies inversion. The engine places an unwarranted output bubble and leaves pins on the triangle.",
  },
  {
    id: "switch_nc", label: "Switch, normally closed", mode: "new", draw: (o) => closedSwitchV("switch_nc")("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "switch_nc", tier: 2, usageUsers: 64,
    dsl: ["S1 A B type=switch_nc"],
    standard: "IEEE 315-1975 \u00a74.3.1 closed contact, blade form", sourceUrl: IEEE315, inExemplar: false,
    notes: "Hollow contact circles and a straight blade touching both contacts show the normal closed state, with leads terminating at the 80 px engine pitch. The engine uses filled contacts and adds an actuator not needed for a plain contact.",
  },
  {
    id: "relay_spdt", label: "Relay with changeover contact", mode: "new", draw: (o) => combinedRelay("relay_spdt")("B1", o),
    pinNames: {"coil_a": "coil_a", "coil_b": "coil_b", "common": "common", "nc": "nc", "no": "no"}, engine: "relay_spdt", tier: 2, usageUsers: 55,
    dsl: ["K1 CA CB COM NC NO type=relay_spdt"],
    standard: "IEEE 315-1975 \u00a74.30.2 relay with transfer contacts; \u00a74.3.3 transfer contact", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted coil, hollow terminals and 2.5 px blade, with the blade touching NC and a mechanical link from coil to blade. All five leads end on live anchors. The engine adds coil slashes and leaves the blade short of NC.",
  },
  {
    id: "ldr", label: "Light-dependent resistor", mode: "new", draw: (o) => ldrV("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "ldr", tier: 2, usageUsers: 45,
    dsl: ["R1 A B type=ldr"],
    standard: "IEEE 315-1975 \u00a72.1.13 symmetrical photoconductive transducer; \u00a71.3.1 radiation", sourceUrl: IEEE315, inExemplar: false,
    notes: "The exact accepted resistor zigzag, with leads extended to the 100 px engine pitch and two solid-head radiation arrows pointing inward. Envelope omitted so the resistor does not protrude through a circle. The engine uses open arrow corners and an envelope too small for its zigzag.",
  },
  {
    id: "antenna", label: "Antenna", mode: "new", draw: (o) => antennaH("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "antenna", tier: 2, usageUsers: 42,
    dsl: ["ANT1 FEED FEED type=antenna"],
    standard: "IEEE 315-1975 \u00a72.3 antenna", sourceUrl: IEEE315, inExemplar: false,
    notes: "A vertical feed stem and symmetric antenna arms at the established 2.5 px lead weight. Both engine anchors lie on one continuous feed conductor and the DSL assigns them the same net. The engine paints only its start anchor and leaves the separate end anchor unconnected; no second electrical antenna terminal is implied.",
  },
  {
    id: "voltmeter", label: "Voltmeter", mode: "new", draw: (o) => meterV("voltmeter", "V")("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "voltmeter", tier: 2, usageUsers: 42,
    dsl: ["VM1 A B type=voltmeter"],
    standard: "IEEE 315-1975 \u00a712.1 indicating instrument, voltage", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 48 px source/motor envelope with 16 px leads and a centred ink V at 18 px. The engine uses the same instrument form at half size; explicit attributes replace its CSS-dependent label.",
  },
  {
    id: "crystal", label: "Piezoelectric crystal", mode: "new", draw: (o) => crystalV("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "crystal", tier: 2, usageUsers: 40,
    dsl: ["Y1 A B type=crystal"],
    standard: "IEEE 315-1975 \u00a72.10 piezoelectric crystal unit", sourceUrl: IEEE315, inExemplar: false,
    notes: "Two 3.5 px capacitor electrodes flank a paper-filled 28 \u00d7 24 resonator rectangle, with equal 8 px clearances and 20 px leads on the 80 px engine pitch. The engine draws all electrodes at outline weight.",
  },
  {
    id: "optocoupler", label: "Optocoupler, LED and NPN phototransistor", mode: "new", draw: (o) => optocouplerH("B1", o),
    pinNames: {"a": "a", "k": "k", "c": "c", "e": "e"}, engine: "optocoupler", tier: 2, usageUsers: 40,
    dsl: ["U1 ANODE CATHODE COL EMIT type=optocoupler"],
    standard: "IEEE 315-1975 \u00a78.10 optoelectronic device; \u00a78.5.1 diode, \u00a78.6.16 phototransistor and \u00a71.3.1 radiation", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 32 \u00d7 28 filled diode and 3 px cathode bar emit two arrows toward a 4.5 px transistor base. The NPN emitter arrow points outward; r 30 envelope and leads extend to all four engine anchors. The engine's LED leads miss its triangle; these join both diode electrodes, with no electrical connection across the optical gap.",
  },
  {
    id: "voltage_regulator", label: "Voltage regulator", mode: "new", draw: (o) => regulatorH("B1", o),
    pinNames: {"in": "in", "gnd": "gnd", "out": "out"}, engine: "voltage_regulator", tier: 2, usageUsers: 37,
    dsl: ["U1 INPUT GND OUTPUT type=voltage_regulator"],
    standard: "IEEE 315-1975 \u00a716.1 circuit element, functional rectangle", sourceUrl: IEEE315, inExemplar: false,
    notes: "A paper-filled functional block with ink REG qualifier, input/output leads of 16 px and a 16 px ground lead. This follows the accepted IC idiom; the engine has only a 10 px ground stub at this scale and uses model text as its body label.",
  },
  {
    id: "emergency_stop", label: "Emergency-stop contact, normally closed", mode: "new", draw: (o) => closedSwitchV("emergency_stop")("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "emergency_stop", tier: 2, usageUsers: 26,
    dsl: ["S1 A B type=emergency_stop"],
    standard: "IEEE 315-1975 \u00a74.7.2 normally closed pushbutton contact; emergency-stop function is application practice, not a dedicated IEEE 315 symbol", sourceUrl: IEEE315, inExemplar: false,
    notes: "A closed blade between hollow terminals on the 60 px engine pitch, with a mechanically linked mushroom-head manual actuator shown released. This represents the electrical NC contact, not a complete safety function. The engine draws an E inside a coloured panel-face circle with no contact leads.",
  },
  {
    id: "switch_spdt_center_off", label: "SPDT switch, centre off", mode: "new", draw: (o) => centreOffV("B1", o),
    pinNames: {"common": "common", "left": "left", "right": "right"}, engine: "switch_spdt_center_off", tier: 2, usageUsers: 24,
    dsl: ["S1 COM LEFT RIGHT type=switch_spdt_center_off"],
    standard: "IEEE 315-1975 \u00a74.6.2 double-throw switch, centre-off position", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted SPDT hollow contacts and blade, with the blade centred in the open gap between both throws. Leads meet the 108 px common-to-throw pitch and 52 px throw separation. The engine uses filled contacts and an OFF word; blade position alone conveys the state here.",
  },
  {
    id: "ammeter", label: "Ammeter", mode: "new", draw: (o) => meterV("ammeter", "A")("B1", o),
    pinNames: {"start": "start", "end": "end"}, engine: "ammeter", tier: 2, usageUsers: 22,
    dsl: ["AM1 A B type=ammeter"],
    standard: "IEEE 315-1975 \u00a712.1 indicating instrument, current", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 48 px source/motor envelope with 16 px leads and a centred ink A at 18 px. The engine uses the same instrument form at half size; explicit attributes replace its CSS-dependent label.",
  },
  {
    id: "no_connect", label: "No-connect mark", mode: "new", draw: (o) => noConnect("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "no_connect", tier: 2, usageUsers: 88,
    dsl: ["NC1 UNUSED UNUSED type=no_connect"],
    standard: "IEEE 315-1975 \u00a73.1.12 context only; documented CAD-practice exception (KiCad, Altium, OrCAD pin-end X)", sourceUrl: IEEE315, inExemplar: false,
    notes: "Two crossed 12 px strokes at the element weight, centred exactly on the coincident engine anchors, with a 16 px lead ending at the X. The X is the reviewer-approved schematic-capture convention, not a graphic reproduced from IEEE 315. Both layout anchors refer to the same unconnected net.",
  },
  {
    id: "varistor", label: "Varistor", mode: "new", draw: (o) => variableResistorV("varistor")("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "varistor", tier: 2, usageUsers: 17,
    dsl: ["R1 A B type=varistor"],
    standard: "IEEE 315-1975 \u00a72.1.6 symmetrical varistor; \u00a72.1.5 intrinsic nonlinearity", sourceUrl: IEEE315, inExemplar: false,
    notes: "The exact accepted resistor zigzag on the 80 px engine pitch, crossed by a bent intrinsic-nonlinearity mark. An ink V beside it qualifies voltage dependence; no third wiper terminal is implied.",
  },
  {
    id: "selector_switch", label: "Selector switch", mode: "new", draw: (o) => selectorV("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "selector_switch", tier: 2, usageUsers: 17,
    dsl: ["S1 A B type=selector_switch"],
    standard: "IEEE 315-1975 \u00a74.13 selector switch; \u00a74.3.2 make contact", sourceUrl: IEEE315, inExemplar: false,
    notes: "A selector-operated contact, shown open, on the two-terminal 52 px engine pitch. Hollow terminals and an angled blade follow the accepted switch; a mechanical link and plain SELECTOR qualifier identify its operation. This is one contact of a selector, since the engine exposes only two terminals, not a multi-throw bank.",
  },
  {
    id: "scr", label: "Thyristor (SCR)", mode: "new", draw: (o) => scrV("B2", o),
    pinNames: {"a": "a", "k": "k", "g": "g"}, engine: "scr", tier: 2, usageUsers: 15,
    dsl: ["D1 ANODE CATHODE GATE type=scr"],
    standard: "IEEE 315-1975 \u00a78.6.12.1 reverse-blocking triode thyristor, N-type gate", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 32 by 28 filled diode triangle and 3 px cathode bar on the 72 px engine pitch, with equal 22 px main leads. The gate joins the cathode-side bar, with its independent lead ending at the live gate anchor.",
  },
  {
    id: "triac", label: "Triac", mode: "new", draw: (o) => triacV("B2", o),
    pinNames: {"mt1": "mt1", "mt2": "mt2", "g": "g"}, engine: "triac", tier: 2, usageUsers: 15,
    dsl: ["D1 MT1 MT2 GATE type=triac"],
    standard: "IEEE 315-1975 \u00a78.6.15 bidirectional triode thyristor", sourceUrl: IEEE315, inExemplar: false,
    notes: "Two opposite filled triangles between shared 3 px bars show the bidirectional device. Triangles are 24 px wide and 32 px long to fit side by side, with 24 px terminal stubs. The gate joins the MT1-side bar and reaches its engine anchor.",
  },
  {
    id: "igbt", label: "IGBT", mode: "new", draw: (o) => igbtH("B2", o),
    pinNames: {"c": "c", "g": "g", "e": "e"}, engine: "igbt", tier: 2, usageUsers: 14,
    dsl: ["Q1 COL GATE EMIT type=igbt"],
    standard: "IEEE 315-1975 \u00a78.2.8 insulated gate and \u00a78.2.4 emitter primitives; IGBT composite is post-1975 industry practice (not a dedicated IEEE 315-1975 symbol)", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted r 30 transistor envelope, 4.5 px base bar and outward emitter arrow combine with an isolated 2.5 px gate plate. Collector and emitter leads continue beyond the envelope to the engine pins. This explicitly identified modern composite is absent from the 1975 edition.",
  },
  {
    id: "port", label: "Terminal (single)", mode: "new", draw: (o) => terminalH("port")("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "port", tier: 2, usageUsers: 13,
    dsl: ["P1 NET NET type=port"],
    standard: "IEEE 315-1975 \u00a75.1.1 terminal", sourceUrl: IEEE315, inExemplar: false,
    notes: "One hollow terminal, r 4.5, with leads reaching both 32 px-spaced layout anchors. Both anchors belong to the same net; they do not imply two independent electrical terminals.",
  },
  {
    id: "photodiode", label: "Photodiode", mode: "new", draw: (o) => photodiodeV("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "photodiode", tier: 2, usageUsers: 12,
    dsl: ["D1 ANODE CATHODE type=photodiode"],
    standard: "IEEE 315-1975 \u00a78.5.4.1 photosensitive diode with \u00a71.3.1 radiation", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted diode triangle and bar, with two 2 px radiation arrows pointing inward toward the junction, opposite the LED emission arrows. Both main leads end at the 60 px engine pitch.",
  },
  {
    id: "microphone", label: "Microphone", mode: "new", draw: (o) => microphoneV("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "microphone", tier: 2, usageUsers: 12,
    dsl: ["MIC1 A B type=microphone"],
    standard: "IEEE 315-1975 \u00a710.2.1 microphone, general", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 48 px paper-filled circle and 16 px leads, with a diaphragm line beside the circle. The leads enter opposite sides to match the engine anchors; the separate diaphragm is an acoustic mark, not an electrical terminal.",
  },
  {
    id: "relay_nc", label: "Relay contact, normally closed", mode: "new", draw: (o) => relayNcV("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "relay_nc", tier: 2, usageUsers: 9,
    dsl: ["K1 A B type=relay_nc"],
    standard: "IEEE 315-1975 \u00a74.3.1 closed contact with \u00a714.1.1 mechanical linkage", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted normally closed blade between hollow contacts, with a 2 px dashed link touching the blade midpoint to denote a relay coil drawn elsewhere. Leads end at the 80 px engine anchors.",
  },
  {
    id: "current_source", label: "Current source", mode: "new", draw: (o) => currentSourceV("B2", o),
    pinNames: {"plus": "plus", "minus": "minus"}, engine: "current_source", tier: 2, usageUsers: 8,
    dsl: ["I1 POS 0 type=current_source"],
    standard: "IEEE 315-1975 \u00a72 source context; circle-and-arrow independent current source is circuit-analysis/SPICE convention, not an IEEE 315 graphic", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted source circle, r 24, and 16 px leads contain a solid-head arrow. Positive SPICE current points from the first (plus) net to the second (minus) net, downward in this upright drawing; no voltage polarity marks are printed. This convention is identified explicitly, like the accepted circular voltage source.",
  },
  {
    id: "bridge_rectifier", label: "Bridge rectifier", mode: "new", draw: (o) => bridgeRectifierH("B2", o),
    pinNames: {"ac1": "ac1", "ac2": "ac2", "dcp": "dcp", "dcn": "dcn"}, engine: "bridge_rectifier", tier: 2, usageUsers: 8,
    dsl: ["D1 AC1 AC2 POS NEG type=bridge_rectifier"],
    standard: "IEEE 315-1975 \u00a716.3 rectifier; four \u00a78.5.1 semiconductor diodes", sourceUrl: IEEE315, inExemplar: false,
    notes: "Four copies of the accepted diode body, reduced proportionally to 24 by 21 px with the 3 px bar retained, form a complete bridge. The compact bodies keep adjacent electrodes clear on the fixed 96 px engine pin span. Both cathodes meet DC+, both anodes meet DC-, and each AC node joins one anode and one cathode. Four 12 px external leads meet the engine diamond anchors. Muted + and minus qualify the DC nodes.",
  },
  {
    id: "rheostat", label: "Rheostat", mode: "new", draw: (o) => variableResistorV("rheostat")("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "rheostat", tier: 2, usageUsers: 7,
    dsl: ["R1 A B type=rheostat"],
    standard: "IEEE 315-1975 \u00a72.1.4 continuously adjustable resistor, rheostat", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted resistor zigzag on the 100 px engine pitch, with 20 px end leads and a diagonal solid-head variability arrow. It has two electrical terminals; the crossing arrow is a qualifier rather than a third wiper lead.",
  },
  {
    id: "555_timer", label: "555 timer", mode: "revised", part: "U1", at: [680, 500], draw: (o) => timer555("B2", o),
    pinNames: {"gnd": "gnd", "trg": "trg", "out": "out", "rst": "rst", "ctl": "ctl", "thr": "thr", "dis": "dis", "vcc": "vcc"}, engine: "555_timer", tier: 2, usageUsers: 3,
    dsl: ["U1 GND TRIG OUT RESET CTRL THRESH DISCH VCC type=555_timer"],
    standard: "IEEE 315-1975 \u00a716.1 functional circuit element, rectangular IC block", sourceUrl: IEEE315, inExemplar: true,
    notes: "The exemplar U1 body, all eight pin positions, 16 px leads, ink 15 px functional pin names and muted 14 px physical pin numbers are retained. Designator and model/value text are omitted; plain 555 TIMER below the block identifies its function. The engine netlist order remains physical pins 1 through 8.",
  },
  {
    id: "test_point", label: "Test point", mode: "new", draw: (o) => terminalH("test_point")("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "test_point", tier: 2, usageUsers: 3,
    dsl: ["TP1 NET NET type=test_point"],
    standard: "IEEE 315-1975 \u00a71.5 Note 1.5A alternative test-point recognition; \u00a75.1.1 terminal", sourceUrl: IEEE315, inExemplar: false,
    notes: "A hollow terminal and plain TP recognition qualifier, explicitly documented here as the alternative recognition notation allowed by Note 1.5A, rather than a claim to reproduce the general recognition graphic. Both 32 px-spaced layout anchors belong to the same test net.",
  },
  {
    id: "push_no", label: "Pushbutton, normally open", mode: "new", draw: (o) => pushNoV("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "push_no", tier: 2, usageUsers: 1,
    dsl: ["S1 A B type=push_no"],
    standard: "IEEE 315-1975 \u00a74.7.1 normally open pushbutton", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted SPST blade and hollow terminals with a mechanically linked straight pushbutton head, shown released. The 2 px dashed linkage meets the blade midpoint; the button and shaft use the element weight. Both leads match the 80 px pitch.",
  },
  {
    id: "jfet_n", label: "JFET, N-channel", mode: "new", draw: (o) => jfetN("B2", o),
    pinNames: {"d": "d", "g": "g", "s": "s"}, engine: "jfet_n", tier: 2, usageUsers: 1,
    dsl: ["J1 DRAIN GATE SOURCE type=jfet_n"],
    standard: "IEEE 315-1975 \u00a78.6.10.1 N-channel junction-gate field-effect transistor", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted r 30 transistor envelope and 4.5 px continuous channel, with an N-channel gate arrow pointing inward at the channel. The gate is directly connected, not insulated. Drain and source leads continue outside the envelope to the live engine anchors.",
  },
  {
    id: "gnd_chassis", label: "Chassis ground", mode: "new", draw: (o) => chassisGroundH("B2", o),
    pinNames: {"start": "start", "end": "end"}, engine: "gnd_chassis", tier: 2, usageUsers: 1,
    dsl: ["G1 CHASSIS CHASSIS type=gnd_chassis"],
    standard: "IEEE 315-1975 \u00a73.9.2 chassis or frame connection", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted ground stem and 40 px bar with three parallel diagonal chassis strokes at 2.5 px. Both engine layout anchors sit on the same 40 px feed conductor; the DSL gives them one net, as for the accepted antenna feed. No separate second ground terminal is implied.",
  },
  {
    id: "push_nc", label: "Pushbutton, normally closed", mode: "new", draw: (o) => pushNcV("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "push_nc", tier: 2, usageUsers: 0,
    dsl: ["S1 A B type=push_nc"],
    standard: "IEEE 315-1975 \u00a74.7.2", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted closed blade and hollow contacts on the 80 px pitch, with the straight pushbutton head and dashed linkage from push_no. Shown released and closed.",
  },
  {
    id: "thermistor_ntc", label: "NTC thermistor", mode: "new", draw: (o) => thermistorNtcV("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "thermistor_ntc", tier: 2, usageUsers: 0,
    dsl: ["R1 A B type=thermistor_ntc"],
    standard: "IEEE 315-1975 \u00a72.1.12.1.4", sourceUrl: IEEE315, inExemplar: false,
    notes: "The exact accepted zigzag with 20 px end leads on the 100 px pitch, crossed by the accepted bent intrinsic-nonlinearity mark. Plain ink NTC identifies the negative temperature coefficient; the mark is not a wiper or third terminal.",
  },
  {
    id: "gnd_signal", label: "Signal ground (common connection)", mode: "new", draw: (o) => signalGroundH("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "gnd_signal", tier: 2, usageUsers: 0,
    dsl: ["G1 COMMON COMMON type=gnd_signal"],
    standard: "IEEE 315-1975 \u00a73.9.3.2", sourceUrl: IEEE315, inExemplar: false,
    notes: "A 22 px ground stem and hollow downward common-connection triangle, 40 px wide, at the accepted element weight. Both 40 px-spaced layout anchors share one feed and one net. The engine solid triangle is replaced by the open IEEE common-connection mark.",
  },
  {
    id: "plc", label: "PLC module", mode: "new", draw: (o) => plcH("B3", o),
    pinNames: {"start": "start", "end": "end", "pwr": "pwr", "out": "out"}, engine: "plc", tier: 3, usageUsers: 50,
    dsl: ["U1 INPUT OUTPUT type=plc"],
    standard: "IEEE 315-1975 \u00a716.1 functional circuit block; PLC function is modern application practice", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted paper-filled IC rectangle with 16 px leads at all four engine anchors and a plain PLC qualifier beside it. The two-terminal netlist exposes start/end; pwr/out are additional named layout anchors, not extra positional netlist pins. No panel lamps or model text.",
  },
  {
    id: "enclosure", label: "Enclosure", mode: "new", draw: (o) => panelAidH("enclosure")("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "enclosure", tier: 3, usageUsers: 23,
    dsl: ["E1 LEFT RIGHT type=enclosure"],
    standard: "IEEE 315-1975 \u00a71.10 grouping context; panel-layout enclosure convention", sourceUrl: IEEE315, inExemplar: false,
    notes: "Panel-layout aid: a paper-filled enclosure outline at the default doubled engine height, with 16 px guide stubs ending at the 480 px-spaced start/end anchors. These are placement guides, not electrical enclosure terminals. IEEE 315 section 1.10 is grouping context, not a dedicated cabinet graphic; internal furniture is omitted.",
  },
  {
    id: "din_rail", label: "DIN rail", mode: "new", draw: (o) => panelAidH("din_rail")("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "din_rail", tier: 3, usageUsers: 20,
    dsl: ["DR1 LEFT RIGHT type=din_rail"],
    standard: "No dedicated IEEE 315 section; panel-layout convention", sourceUrl: null, inExemplar: false,
    notes: "Panel-layout aid, not an IEEE 315 schematic primitive. An outlined rail and hollow mounting slots use only paper fill and 2.5 px strokes. The 16 px end guide stubs meet the default 360 px engine span; they are layout anchors, not electrical terminals.",
  },
  {
    id: "wire_duct", label: "Wire duct", mode: "new", draw: (o) => panelAidH("wire_duct")("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "wire_duct", tier: 3, usageUsers: 18,
    dsl: ["WD1 LEFT RIGHT type=wire_duct"],
    standard: "No dedicated IEEE 315 section; panel-layout convention", sourceUrl: null, inExemplar: false,
    notes: "Panel-layout aid, not an IEEE 315 schematic primitive. A paper-filled 44 px duct with open slot strokes and a plain WIRE DUCT qualifier. The 16 px end guide stubs meet the default 360 px engine span; no electrical connection through the duct is implied.",
  },
  {
    id: "dc_dc_converter", label: "DC-DC converter", mode: "new", draw: (o) => converterH("B3", o),
    pinNames: {"vin": "vin", "gin": "gin", "vout": "vout", "gout": "gout"}, engine: "dc_dc_converter", tier: 3, usageUsers: 16,
    dsl: ["U1 VIN GIN VOUT GOUT type=dc_dc_converter"],
    standard: "IEEE 315-1975 \u00a716.1", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted functional rectangle and 16 px leads at all four live anchors, with a diagonal division and plain ink DC qualifiers identifying both sides. Input and output returns remain distinct, matching the four-terminal engine device.",
  },
  {
    id: "ferrite_bead", label: "Ferrite bead", mode: "new", draw: (o) => ferriteBeadV("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "ferrite_bead", tier: 3, usageUsers: 12,
    dsl: ["L1 A B type=ferrite_bead"],
    standard: "IEEE 315-1975 \u00a715.18", sourceUrl: IEEE315, inExemplar: false,
    notes: "A conductor through an outlined slanted ferrite sleeve with a plain FERRITE qualifier. The 60 px conductor ends match both anchors. Paper fill replaces the engine solid block to obey the binding style; the sleeve denotes the magnetic material, not an additional winding.",
  },
  {
    id: "automotive_flasher_3pin", label: "Automotive flasher, 3-pin", mode: "new", draw: (o) => flasherH("B3", o),
    pinNames: {"b": "b", "l": "l", "p": "p"}, engine: "automotive_flasher_3pin", tier: 3, usageUsers: 10,
    dsl: ["K1 BAT LOAD PILOT type=automotive_flasher_3pin"],
    standard: "IEEE 315-1975 \u00a74.22 interrupter context; \u00a716.1 functional assembly block", sourceUrl: IEEE315, inExemplar: false,
    notes: "A functional rectangle for the flasher assembly, with 16 px leads, plain B/L/P terminal functions and FLASHER beside the body. IEEE 315 section 4.22 is interrupter context; this section 16.1 block does not claim to reproduce the mechanical interrupter graphic. All three pins including optional pilot are represented.",
  },
  {
    id: "triode", label: "Triode (vacuum tube)", mode: "new", draw: (o) => triodeH("B3", o),
    pinNames: {"plate": "plate", "grid": "grid", "cathode": "cathode"}, engine: "triode", tier: 3, usageUsers: 10,
    dsl: ["U1 PLATE GRID CATHODE type=triode"],
    standard: "IEEE 315-1975 \u00a77.3", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted r 30 envelope contains a plate, interrupted control grid and bent cathode. Grid segments use the 2.5 px element weight rather than mechanical-link dashes. Plate and cathode leads route beyond the envelope to the three doubled engine anchors. Heater terminals are omitted because the engine exposes only plate, grid and cathode.",
  },
  {
    id: "diac", label: "Diac", mode: "new", draw: (o) => diacV("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "diac", tier: 3, usageUsers: 8,
    dsl: ["D1 A B type=diac"],
    standard: "IEEE 315-1975 \u00a78.5.9", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted triac pair of opposed filled triangles between shared 3 px bars, with the gate omitted. Equal 20 px main leads meet the 72 px engine span. This is a bidirectional two-terminal trigger device, not two series rectifiers.",
  },
  {
    id: "oscilloscope", label: "Oscilloscope", mode: "new", draw: (o) => oscilloscopeV("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "oscilloscope", tier: 3, usageUsers: 7,
    dsl: ["VM1 SIGNAL RETURN type=oscilloscope"],
    standard: "IEEE 315-1975 \u00a712.1", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 48 px instrument circle and 16 px leads contain the accepted sine trace. Plain SCOPE beside the circle distinguishes an indicating instrument from an AC source. The two engine terminals represent signal and return.",
  },
  {
    id: "phototransistor", label: "Phototransistor", mode: "new", draw: (o) => phototransistorH("B3", o),
    pinNames: {"c": "c", "b": "b", "e": "e"}, engine: "phototransistor", tier: 3, usageUsers: 5,
    dsl: ["Q1 COL BASE EMIT type=phototransistor"],
    standard: "IEEE 315-1975 \u00a78.6.16", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted NPN envelope, 4.5 px base bar and outward emitter arrow, with two solid-head radiation arrows pointing inward. All three engine pins, including the accessible base, retain the accepted transistor geometry and external lead lengths.",
  },
  {
    id: "solenoid_valve", label: "Solenoid valve", mode: "new", draw: (o) => solenoidValveV("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "solenoid_valve", tier: 3, usageUsers: 4,
    dsl: ["K1 A B type=solenoid_valve"],
    standard: "IEEE 315-1975 \u00a74.5.3", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted three coil loops and 10 px extensions to the 100 px engine pitch, with plain VALVE beside the winding. This represents the electrical solenoid actuator; fluid ports and the hydraulic valve body are not electrical netlist terminals.",
  },
  {
    id: "thermal_overload", label: "Thermal overload", mode: "new", draw: (o) => thermalOverloadV("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "thermal_overload", tier: 3, usageUsers: 3,
    dsl: ["S1 A B type=thermal_overload"],
    standard: "IEEE 315-1975 \u00a74.30.5 thermal relay context; \u00a74.3.1 normally closed trip contact", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted normally closed blade and hollow terminals with a dashed mechanical link to a bent thermal-actuator mark and plain THERMAL qualifier. This represents the two-terminal overload trip contact, not a complete heater-and-contact assembly; both leads meet the 80 px engine anchors.",
  },
  {
    id: "varactor", label: "Varactor", mode: "new", draw: (o) => varactorV("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "varactor", tier: 3, usageUsers: 3,
    dsl: ["D1 ANODE CATHODE type=varactor"],
    standard: "IEEE 315-1975 \u00a78.5.2", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted filled 32 by 28 diode triangle, 3 px cathode bar and a second 3.5 px capacitor plate with an 8 px gap. The end lead joins the second plate without bridging that gap; main terminals match the 64 px engine pitch.",
  },
  {
    id: "wattmeter", label: "Wattmeter", mode: "new", draw: (o) => meterV("wattmeter", "W")("B3", o),
    pinNames: {"start": "start", "end": "end"}, engine: "wattmeter", tier: 3, usageUsers: 3,
    dsl: ["WM1 A B type=wattmeter"],
    standard: "IEEE 315-1975 \u00a712.1", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted 48 px meter circle, 16 px leads and centred ink W at 18 px. This is the engine two-terminal indicating-instrument abstraction, not a four-terminal current-and-voltage-coil wattmeter connection diagram.",
  },
  {
    id: "solar_cell", label: "Solar cell", mode: "new", draw: (o) => solarCellV("B4", o),
    pinNames: {"plus": "plus", "minus": "minus"}, engine: "solar_cell", tier: 3, usageUsers: 2,
    dsl: ["B1 POS NEG type=solar_cell"],
    standard: "IEEE 315-1975 §8.7 photovoltaic cell; §1.3.1 radiation", sourceUrl: IEEE315, inExemplar: false,
    notes: "Single cell using the accepted long positive plate and short 5 px negative plate, with inward photovoltaic arrows. The long plate faces plus; both leads end on the 72 px engine pitch.",
  },
  {
    id: "switch_dpdt", label: "DPDT switch", mode: "new", draw: (o) => dpdtH("B4", o),
    pinNames: {"p1": "p1", "nc1": "nc1", "no1": "no1", "p2": "p2", "nc2": "nc2", "no2": "no2"}, engine: "switch_dpdt", tier: 3, usageUsers: 2,
    dsl: ["S1 P1 NC1 NO1 P2 NC2 NO2 type=switch_dpdt"],
    standard: "IEEE 315-1975 §4.6.2.1 double-pole double-throw switch", sourceUrl: IEEE315, inExemplar: false,
    notes: "Two accepted SPDT blades rest on NC contacts. All six terminals are hollow and the blade midpoints are joined by a 2 px dashed mechanical link. Each lead reaches its own live engine anchor.",
  },
  {
    id: "fuse_slow", label: "Slow-blow fuse", mode: "new", draw: (o) => slowFuseV("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "fuse_slow", tier: 3, usageUsers: 1,
    dsl: ["F1 A B type=fuse_slow"],
    standard: "IEEE 315-1975 §9.1.1 fuse with IEC time-delay qualifier T", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted fuse rectangle and through conductor on a 60 px pitch, with plain T beside the body for the IEC slow-blow qualifier.",
  },
  {
    id: "tvs_diode", label: "TVS diode", mode: "new", draw: (o) => tvsV("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "tvs_diode", tier: 3, usageUsers: 1,
    dsl: ["D1 A B type=tvs_diode"],
    standard: "IEEE 315-1975 §8.5.6.2 bidirectional breakdown diode", sourceUrl: IEEE315, inExemplar: false,
    notes: "Two opposed filled diode triangles and connected back-to-back Z cathode bars denote a bidirectional TVS. Triangles shorten to 20 px to keep two breakdown elements and 12 px external leads within the 72 px engine pitch; bars retain 3 px weight.",
  },
  {
    id: "proximity_sensor", label: "Proximity sensor", mode: "new", draw: (o) => proximityH("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "proximity_sensor", tier: 3, usageUsers: 1,
    dsl: ["U1 A B type=proximity_sensor"],
    standard: "No dedicated IEEE 315 section; IEC 60617 part 7 proximity-detector convention", sourceUrl: null, inExemplar: false,
    notes: "The accepted two-terminal proximity convention: paper-filled sensing block, two non-contact field curves and plain PROX beside it. No invented supply or third output terminal; 16 px leads meet both 108 px-spaced anchors.",
  },
  {
    id: "darlington_npn", label: "Darlington, NPN", mode: "new", draw: (o) => darlingtonH("darlington_npn")("B4", o),
    pinNames: {"c": "c", "b": "b", "e": "e"}, engine: "darlington_npn", tier: 3, usageUsers: 0,
    dsl: ["Q1 COL BASE EMIT type=darlington_npn"],
    standard: "IEEE 315-1975 §8.6.17 Darlington connection, NPN", sourceUrl: IEEE315, inExemplar: false,
    notes: "Two separated bipolar transistors share the accepted r 30 envelope, with 4.5 px base bars and two outward 8 px emitter arrows. A stepped orthogonal first-emitter-to-second-base run and a separate top collector bus keep the cascade legible; external leads meet the unchanged engine pins.",
  },
  {
    id: "darlington_pnp", label: "Darlington, PNP", mode: "new", draw: (o) => darlingtonH("darlington_pnp")("B4", o),
    pinNames: {"c": "c", "b": "b", "e": "e"}, engine: "darlington_pnp", tier: 3, usageUsers: 0,
    dsl: ["Q1 COL BASE EMIT type=darlington_pnp"],
    standard: "IEEE 315-1975 §8.6.17 Darlington connection, PNP form", sourceUrl: IEEE315, inExemplar: false,
    notes: "The same separated Darlington cascade with both 8 px emitter arrows reversed inward. Two 4.5 px base bars, an orthogonal collector bus and stepped first-emitter-to-second-base wiring share one r 30 envelope. External leads preserve the engine's collector-above-emitter pins.",
  },
  {
    id: "nmos_depletion", label: "N-channel depletion MOSFET", mode: "new", draw: (o) => mosfet("nmos_depletion")("B4", o),
    pinNames: {"d": "d", "g": "g", "s": "s"}, engine: "nmos_depletion", tier: 3, usageUsers: 0,
    dsl: ["M1 DRAIN GATE SOURCE type=nmos_depletion"],
    standard: "IEEE 315-1975 §8.6.10.3 N-channel depletion insulated-gate FET", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted N-channel MOSFET envelope, gate, inward bulk arrow and source tie, with a continuous butt-capped 4.5 px channel instead of the enhancement segments. All three external leads end at the doubled engine anchors.",
  },
  {
    id: "jfet_p", label: "JFET, P-channel", mode: "new", draw: (o) => jfetN("B4", o, "jfet_p"),
    pinNames: {"d": "d", "g": "g", "s": "s"}, engine: "jfet_p", tier: 3, usageUsers: 0,
    dsl: ["J1 DRAIN GATE SOURCE type=jfet_p"],
    standard: "IEEE 315-1975 §8.6.11.1 P-channel junction-gate FET", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted N-channel JFET envelope, continuous channel and external leads, with the gate arrow reversed to point away from the channel.",
  },
  {
    id: "gnd_digital", label: "Digital ground", mode: "new", draw: (o) => digitalGroundH("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "gnd_digital", tier: 3, usageUsers: 0,
    dsl: ["G1 DGND DGND type=gnd_digital"],
    standard: "IEEE 315-1975 §3.9.3.2 common connection, digital qualifier", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted hollow common-connection triangle and stem, with DIGITAL beside it. Both layout anchors share one feed and the same net; digital identifies the common without implying protective earth.",
  },
  {
    id: "thermistor_ptc", label: "PTC thermistor", mode: "new", draw: (o) => thermistorNtcV("B4", o, "thermistor_ptc"),
    pinNames: {"start": "start", "end": "end"}, engine: "thermistor_ptc", tier: 3, usageUsers: 0,
    dsl: ["R1 A B type=thermistor_ptc"],
    standard: "IEEE 315-1975 §2.1.12.1.3 positive-temperature-coefficient thermistor", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted NTC resistor zigzag, bent intrinsic-nonlinearity mark and 100 px lead pitch, with plain PTC replacing NTC. The crossing mark is not a third terminal.",
  },
  {
    id: "variable_cap", label: "Variable capacitor", mode: "new", draw: (o) => variableCapV("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "variable_cap", tier: 3, usageUsers: 0,
    dsl: ["C1 A B type=variable_cap"],
    standard: "IEEE 315-1975 §2.2.4 variable capacitor", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 40 px capacitor plates at 3.5 px with an 8 px gap, centred on the 48 px engine pitch. A diagonal solid-head variability arrow crosses both plates; it is a qualifier, not an electrical terminal.",
  },
  {
    id: "inductor_iron", label: "Iron-core inductor", mode: "new", draw: (o) => inductorVariantV("inductor_iron")("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "inductor_iron", tier: 3, usageUsers: 0,
    dsl: ["L1 A B type=inductor_iron"],
    standard: "IEEE 315-1975 §6.2.2 magnetic-core inductor", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted three r 10 coil loops and 80 px pitch, with two parallel 2.5 px core bars, 8 px apart, beside the winding.",
  },
  {
    id: "inductor_ferrite", label: "Ferrite-core inductor", mode: "new", draw: (o) => inductorVariantV("inductor_ferrite")("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "inductor_ferrite", tier: 3, usageUsers: 0,
    dsl: ["L1 A B type=inductor_ferrite"],
    standard: "IEEE 315-1975 §6.2.2 magnetic-core inductor, ferrite qualifier", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted coil loops and 80 px pitch with one 2.5 px core bar and plain FERRITE beside it. The material qualifier distinguishes this catalog variant without introducing a nonstandard heavy fill.",
  },
  {
    id: "variable_inductor", label: "Variable inductor", mode: "new", draw: (o) => inductorVariantV("variable_inductor")("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "variable_inductor", tier: 3, usageUsers: 0,
    dsl: ["L1 A B type=variable_inductor"],
    standard: "IEEE 315-1975 §6.2.5 variable inductor", sourceUrl: IEEE315, inExemplar: false,
    notes: "Exactly the accepted three coil loops on the 80 px engine pitch, crossed by the accepted diagonal solid-head variability arrow. Only the winding ends are electrical terminals.",
  },
  {
    id: "instrumentation_amp", label: "Instrumentation amplifier", mode: "new", draw: (o) => instrumentationH("B4", o),
    pinNames: {"inp": "inp", "inn": "inn", "out": "out"}, engine: "instrumentation_amp", tier: 3, usageUsers: 0,
    dsl: ["U1 INP INM OUT type=instrumentation_amp"],
    standard: "IEEE 315-1975 §16.2 amplifier; instrumentation function qualifier", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted 68 by 80 amplifier triangle with a doubled left input edge, matching the engine's instrumentation distinction, plus muted input polarities and plain INA beside the body. Inputs retain 48 px separation and all three engine pins have 16 px leads.",
  },
  {
    id: "schmitt_buffer", label: "Schmitt-trigger buffer", mode: "new", draw: (o) => bufferH("schmitt_buffer")("B4", o),
    pinNames: {"in": "in", "out": "out"}, engine: "schmitt_buffer", tier: 3, usageUsers: 0,
    dsl: ["U1 INPUT OUTPUT type=schmitt_buffer"],
    standard: "IEEE 91 logic convention; IEEE 315-1975 §16.2 triangle context only", sourceUrl: null, inExemplar: false,
    notes: "The accepted paper-filled amplifier triangle adapted to the 88 px buffer span, with 16 px input/output leads and an internal hysteresis glyph. This is the IEEE 91 logic convention, not a dedicated IEEE 315-1975 buffer symbol.",
  },
  {
    id: "tri_state_buffer", label: "Tri-state buffer", mode: "new", draw: (o) => bufferH("tri_state_buffer")("B4", o),
    pinNames: {"in": "in", "out": "out", "en": "en"}, engine: "tri_state_buffer", tier: 3, usageUsers: 0,
    dsl: ["U1 INPUT OUTPUT ENABLE type=tri_state_buffer"],
    standard: "IEEE 91 three-state logic convention; IEEE 315-1975 §16.2 triangle context only", sourceUrl: null, inExemplar: false,
    notes: "The same buffer triangle and 16 px main leads with a separate active-high enable lead ending exactly at the engine en anchor. The enable meets the sloping triangle edge; no inversion bubble or invented power pin.",
  },
  {
    id: "mains_socket", label: "Mains socket", mode: "new", draw: (o) => socketH("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "mains_socket", tier: 3, usageUsers: 0,
    dsl: ["P1 LINE NEUTRAL type=mains_socket"],
    standard: "IEC 60617-11 socket-outlet convention", sourceUrl: null, inExemplar: false,
    notes: "The engine's installation-style socket convention: an open semicircle intersected by the conductor and a transverse bar. Accepted 2.5 px strokes, equal 16 px terminal stubs on the 80 px engine pitch, and plain SOCKET beside the body.",
  },
  {
    id: "disconnect_switch", label: "Disconnect switch", mode: "new", draw: (o) => disconnectV("B4", o),
    pinNames: {"start": "start", "end": "end"}, engine: "disconnect_switch", tier: 3, usageUsers: 0,
    dsl: ["S1 A B type=disconnect_switch"],
    standard: "IEEE 315-1975 §4.6.3 disconnect switch", sourceUrl: IEEE315, inExemplar: false,
    notes: "The accepted open switch blade and hollow terminals, centred on the 96 px engine pitch with equal lead extensions. Plain ISOLATOR beside the symbol identifies the disconnect function; the visible open blade shows separation.",
  },
];
assert.equal(SPECS.length, 103);

/* ---------- extents ---------- */
function extentOf(elements, labels, pts) {
  const e = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x, y) => { e.x0 = Math.min(e.x0, x); e.y0 = Math.min(e.y0, y); e.x1 = Math.max(e.x1, x); e.y1 = Math.max(e.y1, y); };
  for (const el of elements) {
    const attr = (k) => Number(el.match(new RegExp(` ${k}="(-?[\\d.]+)"`))[1]);
    if (el.startsWith("<line")) { add(attr("x1"), attr("y1")); add(attr("x2"), attr("y2")); }
    else if (el.startsWith("<circle")) { const [cx, cy, r] = [attr("cx"), attr("cy"), attr("r")]; add(cx - r, cy - r); add(cx + r, cy + r); }
    else if (el.startsWith("<rect")) { add(attr("x"), attr("y")); add(attr("x") + attr("width"), attr("y") + attr("height")); }
    else {
      const data = el.match(/ (?:points|d)="([^"]+)"/)[1];
      if (/ A /.test(data)) continue; // arc paths supply their own extent points
      const nums = data.match(/-?\d+(?:\.\d+)?/g).map(Number);
      for (let i = 0; i < nums.length; i += 2) add(nums[i], nums[i + 1]);
    }
  }
  for (const [x, y] of pts) add(x, y);
  for (const t of labels) {
    const w = estimateTextWidth(t.s, t.fs, { fontWeight: t.bold ? 700 : 400 });
    const x0 = t.anchor === "start" ? t.x : t.anchor === "end" ? t.x - w : t.x - w / 2;
    add(x0, t.y - t.fs * 0.74); add(x0 + w, t.y + t.fs * 0.24);
  }
  return e;
}
const textEl = (t) => `<text x="${n2(t.x)}" y="${n2(t.y)}" font-size="${t.fs}"${t.bold ? ' font-weight="700"' : ""} fill="${t.fill}"${t.anchor !== "start" ? ` text-anchor="${t.anchor}"` : ""}>${esc(t.s)}</text>`;

/* ---------- exemplar wires ---------- */
const wireSegments = [];
const wireEnds = new Set();
for (const m of ideal.matchAll(/<polyline data-net="[^"]+" points="([^"]+)"/g)) {
  const pts = m[1].split(" ");
  wireEnds.add(pts[0]); wireEnds.add(pts[pts.length - 1]);
  const xy = pts.map((s) => s.split(",").map(Number));
  for (let i = 1; i < xy.length; i++) wireSegments.push([xy[i - 1], xy[i]]);
}
const onWire = ([x, y]) => wireSegments.some(([[ax, ay], [bx, by]]) =>
  (ax === bx && x === ax && y >= Math.min(ay, by) && y <= Math.max(ay, by)) ||
  (ay === by && y === ay && x >= Math.min(ax, bx) && x <= Math.max(ax, bx)));

const DESC = {
  copy: (s, vb) => `Drawn exactly as ${s.part} in the Schematex circuit exemplar (visual-eval/exemplars/circuit/ideal.svg, exemplar viewBox ${vb})`,
  revised: (s, vb) => `Drawn at ${s.part}'s place in the Schematex circuit exemplar (exemplar viewBox ${vb}) with the same pins, revised as the manifest notes say`,
  new: () => "Not in the Schematex circuit exemplar; drawn to its rules with pins on the engine's anchors",
};

await mkdir(outDir, { recursive: true });
const entries = [];
for (const spec of SPECS) {
  // 1. Draw once to measure; exemplar symbols are drawn where the exemplar draws them.
  g = []; texts = []; extra = []; ends = [];
  const at = spec.at ?? [400, 400];
  const first = spec.draw(at);
  if (spec.mode === "copy") {
    for (const el of [...g, ...texts.map(textEl)]) assert(ideal.includes(el), `${spec.part}: not in ideal.svg: ${el}`);
  }
  if (spec.mode !== "new") {
    for (const [name, pt] of Object.entries(first)) {
      assert(wireEnds.has(`${n2(pt[0])},${n2(pt[1])}`) || onWire(pt), `${spec.part}.${name} is not on an exemplar wire`);
    }
  }
  for (const [name, [px, py]] of Object.entries(first)) {
    assert(ends.some(([x, y]) => Math.abs(x - px) < 1e-9 && Math.abs(y - py) < 1e-9), `${spec.id}.${name} does not end a lead`);
  }
  const ext = extentOf(g, texts, extra);

  // 2. Redraw on its own sheet, 8 px of padding, integer pins.
  const shift = [PAD - Math.floor(ext.x0), PAD - Math.floor(ext.y0)];
  const count = g.length;
  g = []; texts = []; extra = []; ends = [];
  const local = spec.draw([at[0] + shift[0], at[1] + shift[1]]);
  assert.equal(g.length, count);
  const W = Math.ceil(ext.x1 + shift[0] + PAD), H = Math.ceil(ext.y1 + shift[1] + PAD);
  const pinText = Object.entries(local)
    .map(([name, [x, y]]) => { assert(Number.isInteger(x) && Number.isInteger(y), `${spec.id}.${name} not integer`); return `${spec.pinNames[name]} (${x},${y})`; })
    .join(", ");
  const desc = `${spec.label}, ${spec.standard}. ${DESC[spec.mode](spec, `${-shift[0]} ${-shift[1]} ${W} ${H}`)}; one unit is one exemplar pixel. Pins: ${pinText}.`;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">`,
    `<title>${esc(spec.label)}</title>`,
    `<desc>${esc(desc)}</desc>`,
    ...g,
    ...(texts.length ? [`<g font-family="${FONT}">`, ...texts.map(textEl), `</g>`] : []),
    `</svg>`,
  ].join("\n");
  await writeFile(new URL(`${spec.id}.svg`, outDir), svg + "\n");
  entries.push({
    id: spec.id, label: spec.label, file: `${spec.id}.svg`, engine: spec.engine, dsl: spec.dsl,
    standard: spec.standard, sourceUrl: spec.sourceUrl === undefined ? IEEE315 : spec.sourceUrl, inExemplar: spec.mode !== "new", tier: spec.tier ?? 1, usageUsers: spec.usageUsers,
    notes: spec.notes,
  });
  console.log(`${spec.id} [${spec.mode}]: ${W}×${H}, ${pinText}`);
}

const manifest = {
  type: "circuit",
  variant: null,
  exemplar: "circuit",
  style: "Ink #17212B with round caps and joins; muted #52606D only for polarity marks (+, −) at Helvetica Neue 17 px and pin or terminal numbers at 14 px; white #FFFFFF inside closed bodies (transistor envelopes, source, lamp and motor circles, IC, op-amp, coil, fuse, buzzer, terminal strip, contact circles); solid ink fills only for diode triangles and arrowheads. Leads, outlines, zigzags, coil loops, switch blades and transformer cores are 2.5 px; capacitor plates 3.5; battery short plates 5; diode cathode bars 3; LED emission arrows and relay linkage dashes 2; transistor base bars and MOSFET channel segments 4.5, the channel segments butt-capped so their gaps stay open. Every pin is the engine's anchor doubled and ends a lead: resistor, inductor, switch, coil, source and motor 80 px pin to pin, potentiometer 100, diode family and fuse 60, battery 48, capacitor 40; transistor envelopes r 30 with the base or gate pin 80 px left of the other two; op-amp inputs 100 px left of the output.",
  symbols: entries,
};
await writeFile(new URL("manifest.json", outDir), JSON.stringify(manifest, null, 2) + "\n");
console.log("wrote visual-eval/symbols/circuit/");
