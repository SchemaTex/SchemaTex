/** Draw visual-eval/exemplars/circuit/ideal.svg — the look the circuit engine is aiming at.
 *
 *   ./node_modules/.bin/vite-node scripts/visual-eval/draw-circuit-exemplar.mjs
 *
 * Subject: an NE555 astable blinking a red LED through a 2N3904 low-side switch,
 * powered from a 9 V battery. The layout follows the TI datasheet's astable
 * figure (timing chain on the left of the chip, output on the right) with the
 * house conventions of the reviewed circuit targets: +9 V rail across the top,
 * return rail along the bottom, bold designator over a regular value.
 *
 * Nothing is guessed. Every pin position is the live symbol anchor from
 * src/diagrams/circuit/symbols.ts scaled by K, every wire must end on a pin or
 * on another wire, the drawn connectivity must equal the parsed source.sx
 * netlist, no junction may have four branches, no wire may cross a symbol body,
 * and no label may touch another label, a wire, a body or the sheet edge.
 * The SVG is written only when all of that holds.
 */
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { effectiveSymbolDef } from "../../src/diagrams/circuit/symbols.ts";
import { parseCircuit } from "../../src/diagrams/circuit/parser.ts";
import { estimateTextWidth } from "../../src/core/text-metrics.ts";

const dir = new URL("../../visual-eval/exemplars/circuit/", import.meta.url);
const source = await readFile(new URL("source.sx", dir), "utf8");

/* ---------- design tokens ---------- */
const INK = "#17212B", MUTED = "#52606D", PAPER = "#FFFFFF";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const W = 1360, H = 912, MARGIN = 24;
const SW = { wire: 2.5, body: 2.5, heavy: 4 };
const R_DOT = 5;
const K = 2; // one live symbol unit = 2 px
const T = {
  title: { fs: 28, bold: true },
  subtitle: { fs: 16, fill: MUTED },
  ref: { fs: 19, bold: true },
  value: { fs: 18 },
  net: { fs: 17, bold: true },
  pinName: { fs: 15 },
  pinNum: { fs: 14, fill: MUTED },
  pol: { fs: 17, fill: MUTED },
  note: { fs: 15, fill: MUTED },
};

const g = [];      // symbol graphics
const wires = [];  // { net, pts }
const texts = [];  // { s, x, y, fs, bold, fill, anchor, inside }
const bodies = []; // { ref, kind: "box" | "circle", ... } — wires must stay out
const pins = {};   // "U1.vcc" -> [x, y]

const n2 = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const line = (x1, y1, x2, y2, w = SW.body) =>
  g.push(`<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`);
const poly = (p, w = SW.body) =>
  g.push(`<polyline points="${p.map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ")}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`);
const text = (s, x, y, style, o = {}) =>
  texts.push({ s, x, y, fs: style.fs, bold: !!style.bold, fill: style.fill ?? INK, anchor: o.anchor ?? "start", inside: o.inside });
const wire = (net, ...pts) => wires.push({ net, pts });
const box = (ref, x0, y0, x1, y1) => bodies.push({ ref, kind: "box", x0, y0, x1, y1 });

/* ---------- placement from live symbol geometry ---------- */
const ROT = {
  0: ([x, y]) => [x, y],
  90: ([x, y]) => [-y, x],   // rightward symbol turned to run downward
  270: ([x, y]) => [y, -x],  // rightward symbol turned to run upward
};
const place = (ref, type, [ox, oy], rot = 0) => {
  const def = effectiveSymbolDef(type, {});
  const names = def.netlistPins?.length ? def.netlistPins : ["start", "end"];
  const out = {};
  for (const name of names) {
    const a = def.anchors[name];
    assert(a, `${type} has no anchor ${name}`);
    const [dx, dy] = ROT[rot]([a.x * K, a.y * K]);
    out[name] = pins[`${ref}.${name}`] = [ox + dx, oy + dy];
  }
  return { pins: out, names };
};

/* ---------- symbols (IEEE 315 shapes, pins at live anchors) ---------- */
const resistorV = (ref, origin) => {
  const { pins: p } = place(ref, "resistor", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1], a = 11;
  const zig = [[x, y0], [x, y0 + 10], [x + a, y0 + 15], [x - a, y0 + 25], [x + a, y0 + 35],
    [x - a, y0 + 45], [x + a, y0 + 55], [x - a, y0 + 65], [x, y0 + 70], [x, y1]];
  poly(zig);
  box(ref, x - a, y0 + 12, x + a, y0 + 68);
  return p;
};
const resistorH = (ref, origin) => {
  const { pins: p } = place(ref, "resistor", origin, 0);
  const [x0, y] = p.start, x1 = p.end[0], a = 11;
  poly([[x0, y], [x0 + 10, y], [x0 + 15, y - a], [x0 + 25, y + a], [x0 + 35, y - a],
    [x0 + 45, y + a], [x0 + 55, y - a], [x0 + 65, y + a], [x0 + 70, y], [x1, y]]);
  box(ref, x0 + 12, y - a, x0 + 68, y + a);
  return p;
};
const capacitorV = (ref, origin, polarised = false) => {
  const { pins: p } = place(ref, polarised ? "electrolytic_cap" : "capacitor", origin, 90);
  const [x, y0] = p.start, y1 = p.end[1], half = 20;
  const pa = y0 + 16, pb = y0 + 24; // plate offsets 8 and 12 live units
  line(x, y0, x, pa, SW.wire);
  line(x - half, pa, x + half, pa, SW.heavy - 0.5);
  if (polarised) {
    // IEEE 315 2.2 style 2: the curved element is the negative electrode.
    g.push(`<path d="M ${x - half},${pb + 8} Q ${x},${pb - 8} ${x + half},${pb + 8}" fill="none" stroke="${INK}" stroke-width="${SW.heavy - 0.5}" stroke-linecap="round"/>`);
    text("+", x + half + 4, pa - 4, T.pol);
  } else {
    line(x - half, pb, x + half, pb, SW.heavy - 0.5);
  }
  line(x, pb, x, y1, SW.wire);
  box(ref, x - half, pa - 2, x + half, pb + (polarised ? 8 : 2));
  return p;
};
const batteryV = (ref, bottom) => {
  const { pins: p } = place(ref, "battery", bottom, 270);
  const [x, yTop] = p.plus, yBot = p.minus[1];
  // IEEE 315 2.5: long line positive. Two cells, long plate on the + pin side.
  const plates = [[12, 22, SW.body], [20, 11, SW.heavy + 1], [30, 22, SW.body], [38, 11, SW.heavy + 1]];
  line(x, yTop, x, yTop + 12, SW.wire);
  for (const [dy, half, w] of plates) line(x - half, yTop + dy, x + half, yTop + dy, w);
  line(x, yTop + 38, x, yBot, SW.wire);
  text("+", x + 28, yTop + 18, T.pol);
  box(ref, x - 22, yTop + 10, x + 22, yTop + 40);
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
  // Emission arrows point away from the junction (IEEE 315 1.3B).
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
const npn = (ref, baseAt) => {
  const { pins: p } = place(ref, "npn", baseAt, 0);
  const [bx, by] = p.b, [cx, cy] = p.c, [ex, ey] = p.e;
  const barX = cx - 32, circle = { cx: barX + 12, cy: by, r: 36 };
  g.push(`<circle cx="${circle.cx}" cy="${circle.cy}" r="${circle.r}" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.body}"/>`);
  line(bx, by, barX, by, SW.wire);
  line(barX, by - 24, barX, by + 24, SW.heavy + 0.5);
  line(barX, by - 12, cx, cy, SW.body);
  line(barX, by + 12, ex, ey, SW.body);
  // NPN: emitter arrow points outward, drawn on the emitter lead near the pin.
  const ux = (ex - barX) / Math.hypot(ex - barX, ey - by - 12), uy = (ey - by - 12) / Math.hypot(ex - barX, ey - by - 12);
  const tipX = barX + ux * 30, tipY = by + 12 + uy * 30, baseX = tipX - ux * 13, baseY = tipY - uy * 13;
  g.push(`<path d="M ${n2(tipX)},${n2(tipY)} L ${n2(baseX - uy * 6)},${n2(baseY + ux * 6)} L ${n2(baseX + uy * 6)},${n2(baseY - ux * 6)} Z" fill="${INK}"/>`);
  bodies.push({ ref, kind: "circle", ...circle });
  return p;
};
const timer555 = (ref, origin) => {
  const { pins: p, names } = place(ref, "555_timer", origin, 0);
  const [ox, oy] = origin;
  const x0 = ox, x1 = ox + 112 * K, y0 = oy - 60 * K, y1 = oy + 60 * K;
  g.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.body}"/>`);
  box(ref, x0, y0, x1, y1);
  const NAME = { gnd: "GND", trg: "TRIG", out: "OUT", rst: "RESET", ctl: "CTRL", thr: "THR", dis: "DISCH", vcc: "VCC" };
  for (const name of names) {
    const [px, py] = p[name];
    const num = String(names.indexOf(name) + 1); // DIP pin number = netlist position
    if (px < x0) { line(px, py, x0, py, SW.wire); text(NAME[name], x0 + 12, py + 5, T.pinName, { inside: ref }); text(num, x0 - 8, py - 7, T.pinNum, { anchor: "middle" }); }
    else if (px > x1) { line(x1, py, px, py, SW.wire); text(NAME[name], x1 - 12, py + 5, T.pinName, { anchor: "end", inside: ref }); text(num, x1 + 8, py - 7, T.pinNum, { anchor: "middle" }); }
    else if (py < y0) { line(px, py, px, y0, SW.wire); text(NAME[name], px, y0 + 22, T.pinName, { anchor: "middle", inside: ref }); text(num, px - 7, y0 - 8, T.pinNum, { anchor: "end" }); }
    else { line(px, y1, px, py, SW.wire); text(NAME[name], px, y1 - 12, T.pinName, { anchor: "middle", inside: ref }); text(num, px - 7, y1 + 14, T.pinNum, { anchor: "end" }); }
  }
  text(ref, (x0 + x1) / 2, oy - 8, T.ref, { anchor: "middle", inside: ref });
  text("NE555", (x0 + x1) / 2, oy + 16, T.value, { anchor: "middle", inside: ref });
  return p;
};
const groundSymbol = (at) => {
  const [x, y] = at;
  pins["_GND.start"] = at;
  line(x, y, x, y + 22, SW.wire);
  line(x - 20, y + 22, x + 20, y + 22, SW.body);
  line(x - 13, y + 30, x + 13, y + 30, SW.body);
  line(x - 6, y + 38, x + 6, y + 38, SW.body);
  box("_GND", x - 20, y + 20, x + 20, y + 40);
};

/* ---------- layout ---------- */
const TOP = 190, BOT = 800;
const COL = { bat: 170, dec: 330, timing: 540, bus: 610, load: 1190, ctl: 1010 };
const CAP_ROW = 660; // BT1, C3, C1 and C2 share one row

const U1 = timer555("U1", [680, 500]);
const BT1 = batteryV("BT1", [COL.bat, CAP_ROW + 44]);
const C3 = capacitorV("C3", [COL.dec, CAP_ROW]);
const R1 = resistorV("R1", [COL.timing, 275]);
const R2 = resistorV("R2", [COL.timing, 460]);
const C1 = capacitorV("C1", [COL.timing, CAP_ROW], true);
const C2 = capacitorV("C2", [COL.ctl, CAP_ROW]);
const Q1 = npn("Q1", [1110, U1.out[1]]);
const R3 = resistorH("R3", [U1.out[0] + 55, U1.out[1]]);
const R4 = resistorV("R4", [COL.load, 212]);
const D1 = ledV("D1", [COL.load, 322]);
groundSymbol([250, BOT]);

wire("VCC", BT1.plus, [COL.bat, TOP], [COL.load, TOP], R4.start);
wire("VCC", [COL.dec, TOP], C3.start);
wire("VCC", [COL.timing, TOP], R1.start);
wire("VCC", [U1.vcc[0], TOP], U1.vcc);
wire("VCC", [U1.rst[0], TOP], U1.rst);
wire("GND", BT1.minus, [COL.bat, BOT], [COL.load, BOT], Q1.e);
wire("GND", C3.end, [COL.dec, BOT]);
wire("GND", C1.end, [COL.timing, BOT]);
wire("GND", U1.gnd, [U1.gnd[0], BOT]);
wire("GND", C2.end, [COL.ctl, BOT]);
wire("DIS", R1.end, R2.start);
wire("DIS", [COL.timing, U1.dis[1]], U1.dis);
wire("THR", R2.end, C1.start);
wire("THR", [COL.timing, U1.thr[1]], U1.thr);
wire("THR", [COL.bus, U1.thr[1]], [COL.bus, U1.trg[1]], U1.trg);
wire("CV", U1.ctl, [COL.ctl, U1.ctl[1]], C2.start);
wire("OUT", U1.out, R3.start);
wire("BASE", R3.end, Q1.b);
wire("LED_A", R4.end, D1.start);
wire("LED_K", D1.end, Q1.c);

/* ---------- labels ---------- */
text("555 LED Flasher", 60, 62, T.title);
text("NE555 astable at about 1 Hz, switching a red LED through a 2N3904 transistor · 9 V battery", 60, 94, T.subtitle);
text("VCC · +9 V", COL.bat + 14, TOP - 12, T.net);
text("GND", 250 + 30, BOT + 36, T.net);
const refLeft = (ref, value, x, yMid) => { text(ref, x, yMid - 6, T.ref, { anchor: "end" }); text(value, x, yMid + 18, T.value, { anchor: "end" }); };
const refRight = (ref, value, x, yMid) => { text(ref, x, yMid - 6, T.ref); text(value, x, yMid + 18, T.value); };
refLeft("BT1", "9 V", COL.bat - 36, CAP_ROW + 20);
refRight("C3", "100 nF", COL.dec + 30, CAP_ROW + 20);
refLeft("R1", "1 kΩ", COL.timing - 26, (R1.start[1] + R1.end[1]) / 2);
refLeft("R2", "68 kΩ", COL.timing - 26, (R2.start[1] + R2.end[1]) / 2);
refLeft("C1", "10 µF", COL.timing - 32, CAP_ROW + 20);
refRight("C2", "10 nF", COL.ctl + 30, CAP_ROW + 20);
text("R3", (R3.start[0] + R3.end[0]) / 2, R3.start[1] - 44, T.ref, { anchor: "middle" });
text("4.7 kΩ", (R3.start[0] + R3.end[0]) / 2, R3.start[1] - 20, T.value, { anchor: "middle" });
refRight("R4", "330 Ω", COL.load + 58, (R4.start[1] + R4.end[1]) / 2);
refRight("D1", "red LED", COL.load + 58, (D1.start[1] + D1.end[1]) / 2);
refRight("Q1", "2N3904", COL.load + 58, Q1.b[1]);
text("f ≈ 1.44 / ((R1 + 2·R2) · C1) ≈ 1.05 Hz, about 50 % duty  ·  LED current ≈ 21 mA  ·  C3 decouples U1 across pins 8 and 1", 60, H - 34, T.note);

/* ---------- checks ---------- */
const key = ([x, y]) => `${n2(x)},${n2(y)}`;
const segs = wires.flatMap((w) => w.pts.slice(1).map((b, i) => ({ net: w.net, a: w.pts[i], b })));
for (const s of segs) assert(s.a[0] === s.b[0] || s.a[1] === s.b[1], `diagonal wire in ${s.net}`);
const onSeg = (p, s, interior = false) => {
  const [x, y] = p, [ax, ay] = s.a, [bx, by] = s.b;
  const within = x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by);
  const colinear = (ax === bx && x === ax) || (ay === by && y === ay);
  if (!within || !colinear) return false;
  return !interior || (key(p) !== key(s.a) && key(p) !== key(s.b));
};

// 1. Every wire end lands on a pin or on another wire; every pin has a wire.
const pinAt = new Map(Object.entries(pins).map(([k, p]) => [key(p), k]));
for (const w of wires) for (const end of [w.pts[0], w.pts[w.pts.length - 1]]) {
  const onOther = segs.some((s) => !(w.pts.includes(s.a) && w.pts.includes(s.b)) && onSeg(end, s));
  assert(pinAt.has(key(end)) || onOther, `${w.net} wire ends in open space at ${key(end)}`);
}
for (const [name, p] of Object.entries(pins)) assert(segs.some((s) => onSeg(p, s)), `${name} is not wired`);

// 2. Connectivity from geometry (union-find over segments that touch).
const parent = segs.map((_, i) => i);
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
  const [s, t] = [segs[i], segs[j]];
  if (onSeg(s.a, t) || onSeg(s.b, t) || onSeg(t.a, s) || onSeg(t.b, s)) parent[find(i)] = find(j);
}
const drawnNetOf = (p) => find(segs.findIndex((s) => onSeg(p, s)));
const drawn = new Map();
for (const [name, p] of Object.entries(pins)) {
  if (name.startsWith("_")) continue;
  const n = drawnNetOf(p);
  drawn.set(n, [...(drawn.get(n) ?? []), name]);
}
const ast = parseCircuit(source);
const parsed = new Map();
for (const [ref, map] of Object.entries(ast.pinMap)) {
  if (ref.startsWith("_")) continue;
  for (const [pin, net] of Object.entries(map)) parsed.set(net, [...(parsed.get(net) ?? []), `${ref}.${pin}`]);
}
const sig = (arr) => [...arr].sort().join(" ");
const drawnSigs = new Set([...drawn.values()].map(sig));
const parsedSigs = new Set([...parsed.values()].map(sig));
const mismatches = [...parsedSigs].filter((s) => !drawnSigs.has(s)).length + [...drawnSigs].filter((s) => !parsedSigs.has(s)).length;
const drawnGnd = drawnNetOf(pins["_GND.start"]);
assert.equal(sig(drawn.get(drawnGnd)), sig(parsed.get("GND")), "ground symbol is not on the GND net");

// 3. Junctions: count branches at every point; dots on 3, never 4.
const branches = new Map();
const bump = (p, d) => { const k = key(p); branches.set(k, (branches.get(k) ?? new Set()).add(d)); };
for (const s of segs) {
  const dx = Math.sign(s.b[0] - s.a[0]), dy = Math.sign(s.b[1] - s.a[1]);
  bump(s.a, `${dx},${dy}`); bump(s.b, `${-dx},${-dy}`);
}
for (const s of segs) for (const [k] of branches) {
  const p = k.split(",").map(Number);
  if (onSeg(p, s, true)) {
    const dx = Math.sign(s.b[0] - s.a[0]), dy = Math.sign(s.b[1] - s.a[1]);
    branches.get(k).add(`${dx},${dy}`).add(`${-dx},${-dy}`);
  }
}
const dots = [];
for (const [k, set] of branches) {
  const isPin = pinAt.has(k) && !pinAt.get(k).startsWith("_");
  const count = set.size + (isPin ? 1 : 0);
  assert(count < 4, `four-way junction at ${k}`);
  if (set.size >= 3) dots.push(k.split(",").map(Number));
}
// Crossings between different nets are not allowed either.
for (const s of segs) for (const t of segs) if (s.net !== t.net) {
  const h = s.a[1] === s.b[1] ? s : null, v = t.a[0] === t.b[0] ? t : null;
  if (!h || !v) continue;
  const x = v.a[0], y = h.a[1];
  assert(!(onSeg([x, y], h) && onSeg([x, y], v)), `${s.net} and ${t.net} cross at ${x},${y}`);
}

// 4. No wire through a symbol body.
const segHitsBox = (s, b) => {
  const [x0, x1] = [Math.min(s.a[0], s.b[0]), Math.max(s.a[0], s.b[0])];
  const [y0, y1] = [Math.min(s.a[1], s.b[1]), Math.max(s.a[1], s.b[1])];
  return x1 > b.x0 + 0.5 && x0 < b.x1 - 0.5 && y1 > b.y0 + 0.5 && y0 < b.y1 - 0.5;
};
const segDist = (s, [px, py]) => {
  const [ax, ay] = s.a, [bx, by] = s.b, L2 = (bx - ax) ** 2 + (by - ay) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L2));
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
};
for (const s of segs) for (const b of bodies) {
  if (b.kind === "box") assert(!segHitsBox(s, b), `${s.net} wire crosses ${b.ref}`);
  else assert(segDist(s, [b.cx, b.cy]) > b.r, `${s.net} wire enters ${b.ref}`);
}

// 5. Label collisions: text vs text, wires, bodies, dots, sheet edge.
const tbox = (t) => {
  const w = estimateTextWidth(t.s, t.fs, { fontWeight: t.bold ? 700 : 400 });
  const x0 = t.anchor === "start" ? t.x : t.anchor === "end" ? t.x - w : t.x - w / 2;
  return { x0: x0 - 2, x1: x0 + w + 2, y0: t.y - t.fs * 0.74 - 2, y1: t.y + t.fs * 0.24 + 2 };
};
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const collisions = [];
texts.forEach((t, i) => {
  const b = tbox(t);
  if (b.x0 < MARGIN || b.x1 > W - MARGIN || b.y0 < MARGIN || b.y1 > H - MARGIN) collisions.push(`${t.s}: sheet edge`);
  texts.slice(i + 1).forEach((u) => overlap(b, tbox(u)) && collisions.push(`${t.s} / ${u.s}`));
  const grown = { x0: b.x0 - SW.wire / 2, x1: b.x1 + SW.wire / 2, y0: b.y0 - SW.wire / 2, y1: b.y1 + SW.wire / 2 };
  for (const s of segs) if (segHitsBox(s, grown)) collisions.push(`${t.s}: ${s.net} wire`);
  for (const body of bodies) {
    if (body.ref === t.inside) continue;
    const bb = body.kind === "box" ? body : { x0: body.cx - body.r, x1: body.cx + body.r, y0: body.cy - body.r, y1: body.cy + body.r };
    if (overlap(b, bb)) collisions.push(`${t.s}: ${body.ref} body`);
  }
  for (const [x, y] of dots) if (overlap(b, { x0: x - R_DOT, x1: x + R_DOT, y0: y - R_DOT, y1: y + R_DOT })) collisions.push(`${t.s}: dot`);
});

console.log(`netlist mismatches: ${mismatches}`);
console.log(`junction dots: ${dots.length}`);
console.log(`label collisions: ${collisions.length}${collisions.length ? "\n  " + collisions.join("\n  ") : ""}`);
assert.equal(mismatches, 0, "drawn connectivity differs from source.sx");
assert.equal(collisions.length, 0, "labels collide");

/* ---------- write ---------- */
const title = "555 LED Flasher";
const desc = "Circuit schematic drawn with IEEE 315 symbols. A 9 V battery BT1 feeds a +9 V rail across the top and a GND return rail along the bottom, with C3 100 nF decoupling across them. An NE555 timer U1 runs astable: R1 1 kilohm from +9 V to DISCH pin 7, R2 68 kilohm from DISCH to the joined THR pin 6 and TRIG pin 2, and the 10 microfarad electrolytic C1 from that node to ground; RESET pin 4 and VCC pin 8 go to +9 V, GND pin 1 to ground, and CTRL pin 5 is bypassed by C2 10 nF. OUT pin 3 drives the base of the 2N3904 NPN transistor Q1 through R3 4.7 kilohm; Q1 switches a red LED D1 in series with R4 330 ohm from the +9 V rail to its collector, and its emitter returns to ground. Dots mark T-junctions; no wires cross.";
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">`,
  `<title>${title}</title>`,
  `<desc>${esc(desc)}</desc>`,
  `<rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER}"/>`,
  `<g fill="none" stroke="${INK}" stroke-width="${SW.wire}" stroke-linecap="round" stroke-linejoin="round">`,
  ...wires.map((w) => `<polyline data-net="${w.net}" points="${w.pts.map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ")}"/>`),
  `</g>`,
  ...g,
  `<g fill="${INK}">`,
  ...dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${R_DOT}"/>`),
  `</g>`,
  `<g font-family="${FONT}">`,
  ...texts.map((t) => `<text x="${n2(t.x)}" y="${n2(t.y)}" font-size="${t.fs}"${t.bold ? ' font-weight="700"' : ""} fill="${t.fill}"${t.anchor !== "start" ? ` text-anchor="${t.anchor}"` : ""}>${esc(t.s)}</text>`),
  `</g>`,
  `</svg>`,
].join("\n");
await writeFile(new URL("ideal.svg", dir), svg + "\n");
console.log("wrote visual-eval/exemplars/circuit/ideal.svg");
