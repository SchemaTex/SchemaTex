/**
 * Hand-authored block-diagram house-style exemplar. Run from any directory:
 *   node scripts/visual-eval/draw-blockdiagram-exemplar.mjs [preview.png]
 * Writes ideal.svg, source.sx and notes.md into visual-eval/exemplars/blockdiagram/,
 * plus an optional PNG preview. Every geometry check runs before any write; text
 * bounds come from resvg's real font shaping, not a character-count estimate.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

// ---- Design tokens (decided before geometry) -------------------------------
const C = { ink: '#16202B', slate: '#63707F', rule: '#C9D2DC', paper: '#FFFFFF', power: '#C2410C' };
// Group tints reuse the engine's role fills (src/core/theme.ts DEFAULT_BLOCK) so the
// exemplar and the renderer share one colour language. Frame = lighter wash of the hue.
const GROUP = {
  power:   { label: 'POWER',            block: '#FFEDD5', frame: '#FFF8F1', edge: '#FBD9B8', role: 'disturbance' },
  sensing: { label: 'SENSING',          block: '#F3E8FF', frame: '#FBF7FF', edge: '#E4D2FA', role: 'sensor' },
  compute: { label: 'COMPUTE',          block: '#DBEAFE', frame: '#F5F9FF', edge: '#C7DBF7', role: 'controller' },
  comms:   { label: 'STORAGE & RADIO',  block: '#ECFCCB', frame: '#FAFEF2', edge: '#D6EFA6', role: 'output' },
  actuate: { label: 'ACTUATION',        block: '#DCFCE7', frame: '#F4FDF7', edge: '#BDEBCB', role: 'actuator' },
};
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 22, subtitle: 12.5, block: 13, part: 11, signal: 11.5, caption: 11 };
const SW = { block: 1.5, wire: 1.5, bus: 3, power: 2.5, frame: 1, rule: 1 };
const U = 8;
const W = 1320, H = 556;
const PAD = 2.5; // text clearance
const TITLE = 'Greenhouse Climate Telemetry Node';
const SUBTITLE = 'Hardware block diagram · battery-powered LoRa sensor node · one MCU hub, two shared buses, two regulated rails';
const TARGET = new URL('../../visual-eval/exemplars/blockdiagram/', import.meta.url);
const PNG = process.argv[2];

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const layers = { frames: [], wires: [], blocks: [], marks: [], text: [] };
const texts = [], bodies = [], segments = [], dots = [], frames = [];
const cache = new Map();
let serial = 0;

function measure(s, fs, weight, anchor, style) {
  const key = JSON.stringify([s, fs, weight, anchor, style]);
  if (!cache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" font-style="${style}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b || !b.width) throw new Error(`Cannot measure text: ${s}`);
    cache.set(key, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 });
  }
  return cache.get(key);
}
function text(s, x, y, { fs = FS.signal, weight = 400, fill = C.ink, anchor = 'start', style = 'normal', owner, spacing } = {}) {
  const m = measure(s, fs, weight, anchor, style);
  const extra = spacing ? spacing * (s.length - 1) : 0;
  const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1 + extra, y1: y + m.y1 };
  texts.push({ s, r, owner });
  layers.text.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}"${style !== 'normal' ? ` font-style="${style}"` : ''}${spacing ? ` letter-spacing="${spacing}"` : ''} text-anchor="${anchor}" fill="${fill}">${esc(s)}</text>`);
  return r;
}

// ---- Primitives ------------------------------------------------------------
function frame(group, x0, y0, x1, y1) {
  const g = GROUP[group];
  frames.push({ group, x0, y0, x1, y1 });
  layers.frames.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="10" fill="${g.frame}" stroke="${g.edge}" stroke-width="${SW.frame}"/>`);
  const r = text(g.label, x0 + 2 * U, y0 + 2.5 * U, { fs: FS.caption, weight: 600, fill: C.slate, spacing: 0.8 });
  frames.at(-1).caption = r;
}
const B = {};
function block(id, group, x, y, w, h, title, part) {
  const g = GROUP[group];
  const b = { id, group, x0: x, y0: y, x1: x + w, y1: y + h, cx: x + w / 2, cy: y + h / 2, title, part,
    interior: { x0: x + 6, y0: y + 4, x1: x + w - 6, y1: y + h - 4 } };
  bodies.push(b); B[id] = b;
  layers.blocks.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${g.block}" stroke="${C.ink}" stroke-width="${SW.block}"/>`);
  if (part) {
    text(title, b.cx, b.cy - 2, { fs: FS.block, weight: 500, anchor: 'middle', owner: id });
    text(part, b.cx, b.cy + 15, { fs: FS.part, fill: C.slate, anchor: 'middle', owner: id });
  } else text(title, b.cx, b.cy + 4.5, { fs: FS.block, weight: 500, anchor: 'middle', owner: id });
  return b;
}
const STYLE = {
  power: { stroke: C.power, width: SW.power, dash: '' },
  data:  { stroke: C.ink, width: SW.wire, dash: '' },
  bus:   { stroke: C.ink, width: SW.bus, dash: '' },
  irq:   { stroke: C.slate, width: SW.wire, dash: '5 4' },
};
/** An orthogonal polyline. `from`/`to` name the block whose edge each end sits on. */
function wire(kind, pts, { from, to, arrow = !!to } = {}) {
  const st = STYLE[kind], id = `${kind}-${serial++}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a[0] !== b[0] && a[1] !== b[1]) throw new Error(`Non-orthogonal wire ${id}`);
    if (a[0] === b[0] && a[1] === b[1]) throw new Error(`Zero-length wire ${id}`);
    segments.push({ a, b, kind, id, width: st.width,
      attach: [i === 1 && from && { block: from, p: a }, i === pts.length - 1 && to && { block: to, p: b }].filter(Boolean) });
  }
  const draw = pts.map(p => p.slice());
  if (arrow) {
    const [px, py] = pts.at(-2), [tx, ty] = pts.at(-1);
    const dx = Math.sign(tx - px), dy = Math.sign(ty - py), L = 9, hw = 3.5;
    draw[draw.length - 1] = [tx - dx * (L - 1), ty - dy * (L - 1)];
    const bx = tx - dx * L, by = ty - dy * L;
    layers.marks.push(`<path d="M ${tx} ${ty} L ${bx - dy * hw} ${by + dx * hw} L ${bx + dy * hw} ${by - dx * hw} Z" fill="${st.stroke}"/>`);
  }
  layers.wires.push(`<path d="M ${draw.map(p => p.join(' ')).join(' L ')}" fill="none" stroke="${st.stroke}" stroke-width="${st.width}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}/>`);
  return id;
}
function dot(x, y, kind, legend = false) {
  const r = kind === 'bus' ? 4 : 3.5;
  dots.push({ x, y, r, kind, legend });
  layers.marks.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${STYLE[kind].stroke}"/>`);
}

// ---- Geometry --------------------------------------------------------------
// Columns, left to right: power | 3V3 riser | sensing | I2C trunk | compute | SPI trunk | storage/radio/actuation.
// Rows sit on an 80 px pitch; the microcontroller is sized to its five attachment points.
const X = { riser: 380, i2c: 636, irqJog: 664, spi: 916, radioTap: 1144 };
const Y = { rail: 128, frameTop: 148, row1: 184, row2: 264, row3: 344, rail5: 488, legend: 528 };
const BH = 56;

text(TITLE, 32, 44, { fs: FS.title, weight: 600 });
text(SUBTITLE, 32, 68, { fs: FS.subtitle, fill: C.slate });
layers.frames.push(`<line x1="32" y1="88" x2="${W - 32}" y2="88" stroke="${C.rule}" stroke-width="${SW.rule}"/>`);
segments.push({ a: [32, 88], b: [W - 32, 88], kind: 'rule', id: 'rule', width: 1, attach: [] });

frame('power', 32, Y.frameTop, 360, 416);
frame('sensing', 396, Y.frameTop, 612, 416);
frame('compute', 648, Y.frameTop, 892, 464);
frame('comms', 940, Y.frameTop, 1288, 336);
frame('actuate', 940, 352, 1288, 464);

block('buck', 'power', 224, Y.row1, 120, BH, 'Buck Regulator', 'TPS62840 · 3.3 V');
block('bat', 'power', 40, Y.row2, 112, BH, 'Li-ion Cell', '3.7 V · 2600 mAh');
block('boost', 'power', 224, Y.row3, 120, BH, 'Boost Regulator', 'TPS61023 · 5 V');

block('rh', 'sensing', 420, Y.row1, 168, BH, 'Temp + Humidity', 'SHT40');
block('co2', 'sensing', 420, Y.row2, 168, BH, 'CO₂ Sensor', 'SCD41');
block('lux', 'sensing', 420, Y.row3, 168, BH, 'Ambient Light', 'OPT3001');

block('mcu', 'compute', 684, Y.row1, 184, 160, 'Microcontroller', 'STM32L4 · Cortex-M4');
block('swd', 'compute', 676, 392, 112, BH, 'Debug Header', 'SWD · TC2030');

block('flash', 'comms', 964, Y.row1, 160, BH, 'SPI NOR Flash', 'W25Q128 · 16 MB log');
block('radio', 'comms', 964, Y.row2, 200, BH, 'LoRa Transceiver', 'SX1262 · 868 MHz');
block('ant', 'comms', 1200, Y.row2, 72, BH, 'Antenna', 'λ/4 whip');

block('drv', 'actuate', 964, 392, 160, BH, 'Fan Driver', 'Low-side MOSFET');
block('fan', 'actuate', 1168, 392, 104, BH, 'Vent Fan', '5 V · 40 mm');

// Microcontroller attachment points: I2C and INT on the left at 1/4 and 3/4 height,
// SPI mid-right, SWD and PWM on the bottom, each 48 px in from a corner.
const pin = { i2c: B.mcu.y0 + 40, irq: B.mcu.y0 + 120, spi: B.mcu.cy, swd: B.mcu.x0 + 48, pwm: B.mcu.x1 - 48 };

// Power tree. VBAT branches to both regulators; 3V3 is one riser + one top trunk.
const vbatX = 196, busY = B.bat.cy;
wire('power', [[B.bat.x1, busY], [vbatX, busY]], { from: B.bat, arrow: false });
wire('power', [[vbatX, busY], [vbatX, B.buck.cy], [B.buck.x0, B.buck.cy]], { to: B.buck });
wire('power', [[vbatX, busY], [vbatX, B.boost.cy], [B.boost.x0, B.boost.cy]], { to: B.boost });
dot(vbatX, busY, 'power');
text('VBAT', B.bat.x1 + 5, busY - 7, { fs: FS.signal, style: 'italic', fill: C.power });

const buckOut = B.buck.y0 + 16;
const tapDy = 42; // power enters sensors lower than the I2C taps leave
wire('power', [[B.buck.x1, buckOut], [X.riser, buckOut]], { from: B.buck, arrow: false });
wire('power', [[X.riser, Y.rail], [X.riser, B.lux.y0 + tapDy]], {});
dot(X.riser, buckOut, 'power');
wire('power', [[X.riser, Y.rail], [X.radioTap, Y.rail]], {});
for (const s of ['rh', 'co2']) {
  wire('power', [[X.riser, B[s].y0 + tapDy], [B[s].x0, B[s].y0 + tapDy]], { to: B[s] });
  dot(X.riser, B[s].y0 + tapDy, 'power');
}
wire('power', [[X.riser, B.lux.y0 + tapDy], [B.lux.x0, B.lux.y0 + tapDy]], { to: B.lux });
wire('power', [[B.mcu.cx, Y.rail], [B.mcu.cx, B.mcu.y0]], { to: B.mcu }); dot(B.mcu.cx, Y.rail, 'power');
const flashTap = B.flash.x1 - 28;
wire('power', [[flashTap, Y.rail], [flashTap, B.flash.y0]], { to: B.flash }); dot(flashTap, Y.rail, 'power');
wire('power', [[X.radioTap, Y.rail], [X.radioTap, B.radio.y0]], { to: B.radio });
text('3V3', X.riser + 10, Y.rail - 8, { fs: FS.signal, weight: 600, fill: C.power });

// 5 V: boost bottom → channel directly under the sensing and compute frames → fan driver bottom.
wire('power', [[B.boost.cx, B.boost.y1], [B.boost.cx, Y.rail5], [B.drv.cx, Y.rail5], [B.drv.cx, B.drv.y1]], { from: B.boost, to: B.drv });
text('5V', B.boost.cx + 10, Y.rail5 - 8, { fs: FS.signal, weight: 600, fill: C.power });

// I2C: one vertical trunk shared by three sensors, one drop into the MCU.
const i2cTap = s => B[s].y0 + 16;
wire('bus', [[X.i2c, i2cTap('rh')], [X.i2c, i2cTap('lux')]], {});
for (const s of ['rh', 'co2', 'lux']) wire('data', [[B[s].x1, i2cTap(s)], [X.i2c, i2cTap(s)]], { from: B[s], arrow: false });
dot(X.i2c, i2cTap('co2'), 'bus');
wire('data', [[X.i2c, pin.i2c], [B.mcu.x0, pin.i2c]], { to: B.mcu });
dot(X.i2c, pin.i2c, 'bus');
text('I²C', X.i2c - 10, i2cTap('rh') - 9, { fs: FS.signal, weight: 600 });

// Interrupt from the light sensor: passes below the I2C trunk end, then rises to its pin.
const irqY = B.lux.y0 + 42;
wire('irq', [[B.lux.x1, irqY], [X.irqJog, irqY], [X.irqJog, pin.irq], [B.mcu.x0, pin.irq]], { from: B.lux, to: B.mcu });
text('INT', B.lux.x1 + 6, irqY - 7, { fs: FS.signal, style: 'italic', fill: C.slate });

// SPI: one trunk from the MCU shared by flash and radio.
const spiTap = s => B[s].cy;
wire('bus', [[X.spi, spiTap('flash')], [X.spi, spiTap('radio')]], {});
wire('data', [[B.mcu.x1, pin.spi], [X.spi, pin.spi]], { from: B.mcu, arrow: false });
dot(X.spi, pin.spi, 'bus');
for (const s of ['flash', 'radio']) wire('data', [[X.spi, spiTap(s)], [B[s].x0, spiTap(s)]], { to: B[s] });
text('SPI', X.spi - 10, spiTap('flash') - 9, { fs: FS.signal, weight: 600 });

wire('data', [[B.radio.x1, B.radio.cy], [B.ant.x0, B.radio.cy]], { from: B.radio, to: B.ant });
text('RF', B.radio.x1 + 9, B.radio.cy - 7, { fs: FS.signal, style: 'italic', fill: C.slate });

wire('data', [[pin.pwm, B.mcu.y1], [pin.pwm, B.drv.cy], [B.drv.x0, B.drv.cy]], { from: B.mcu, to: B.drv });
text('PWM', pin.pwm + 12, B.drv.cy - 7, { fs: FS.signal, style: 'italic', fill: C.slate });
wire('data', [[B.drv.x1, B.drv.cy], [B.fan.x0, B.drv.cy]], { from: B.drv, to: B.fan });

wire('data', [[pin.swd, B.swd.y0], [pin.swd, B.mcu.y1]], { from: B.swd, to: B.mcu });
text('SWD', pin.swd + 10, B.swd.y0 - 16, { fs: FS.signal, style: 'italic', fill: C.slate });

// Legend: one full-width row below every frame and wire.
layers.frames.push(`<line x1="32" y1="${Y.legend - 20}" x2="${W - 32}" y2="${Y.legend - 20}" stroke="${C.rule}" stroke-width="${SW.rule}"/>`);
let lx = 32;
const legendItem = (kind, label, withArrow = true) => {
  wire(kind, [[lx, Y.legend - 4], [lx + 36, Y.legend - 4]], { arrow: withArrow });
  lx = text(label, lx + 46, Y.legend, { fs: FS.caption, fill: C.slate }).x1 + 40;
};
legendItem('power', 'Power rail');
legendItem('data', 'Data / control signal');
legendItem('bus', 'Shared bus trunk', false);
legendItem('irq', 'Interrupt');
dot(lx + 4, Y.legend - 4, 'bus', true);
lx = text('Junction (branch point)', lx + 18, Y.legend, { fs: FS.caption, fill: C.slate }).x1 + 40;
layers.frames.push(`<rect x="${lx}" y="${Y.legend - 12}" width="30" height="16" rx="4" fill="${GROUP.sensing.frame}" stroke="${GROUP.sensing.edge}"/>`);
text('Tint = functional subsystem', lx + 42, Y.legend, { fs: FS.caption, fill: C.slate });

// ---- Validation ------------------------------------------------------------
const grow = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const inside = (a, b) => a.x0 >= b.x0 && a.y0 >= b.y0 && a.x1 <= b.x1 && a.y1 <= b.y1;
const segBox = s => ({ x0: Math.min(s.a[0], s.b[0]), x1: Math.max(s.a[0], s.b[0]), y0: Math.min(s.a[1], s.b[1]), y1: Math.max(s.a[1], s.b[1]) });
const canvas = { x0: 12, y0: 12, x1: W - 12, y1: H - 12 };
const errors = [], fail = s => errors.push(s);

for (let i = 0; i < texts.length; i++) {
  const t = texts[i], r = grow(t.r, PAD);
  if (!inside(r, canvas)) fail(`Text off canvas: ${t.s}`);
  for (let j = i + 1; j < texts.length; j++) if (hit(r, grow(texts[j].r, PAD))) fail(`Text/text: ${t.s} / ${texts[j].s}`);
  for (const b of bodies) {
    if (t.owner === b.id) { if (!inside(r, b.interior)) fail(`Text outside its block: ${t.s}`); }
    else if (hit(r, grow(b, SW.block / 2))) fail(`Text/block: ${t.s} / ${b.id}`);
  }
  for (const s of segments) if (hit(r, grow(segBox(s), s.width / 2))) fail(`Text/wire: ${t.s} / ${s.id}`);
  for (const d of dots) if (hit(r, { x0: d.x - d.r, y0: d.y - d.r, x1: d.x + d.r, y1: d.y + d.r })) fail(`Text/dot: ${t.s}`);
}
for (const b of bodies) {
  if (!inside(b, canvas)) fail(`Block off canvas: ${b.id}`);
  for (const o of bodies) if (b !== o && hit(b, grow(o, U))) fail(`Blocks closer than 8 px: ${b.id} / ${o.id}`);
  const f = frames.find(fr => fr.group === b.group);
  if (!inside(grow(b, U), f)) fail(`Block not inside its subsystem frame: ${b.id}`);
  if (hit(grow(b, 4), f.caption)) fail(`Frame caption touches block: ${b.id}`);
}
for (const s of segments) {
  if (s.kind === 'rule') continue;
  for (const p of [s.a, s.b]) if (p[0] < 12 || p[0] > W - 12 || p[1] < 12 || p[1] > H - 12) fail(`Wire off canvas: ${s.id}`);
  for (const f of frames) if (hit(grow(segBox(s), s.width / 2), grow(f.caption, PAD))) fail(`Wire through frame caption: ${s.id} / ${f.group}`);
  for (const b of bodies) {
    const box = grow(segBox(s), s.width / 2 - 0.01);
    const att = s.attach.find(t => t.block === b);
    if (att) {
      // Attached: may only touch the block's edge, never enter it.
      if (hit(segBox(s), grow(b, -0.01))) fail(`Wire enters its block: ${s.id} / ${b.id}`);
      const end = att.p;
      const onEdge = ((end[0] === b.x0 || end[0] === b.x1) && end[1] > b.y0 && end[1] < b.y1)
        || ((end[1] === b.y0 || end[1] === b.y1) && end[0] > b.x0 && end[0] < b.x1);
      if (!onEdge) fail(`Wire end not on block edge: ${s.id} / ${b.id}`);
    } else if (hit(box, b)) fail(`Wire through unrelated block: ${s.id} / ${b.id}`);
  }
}
// Crossings: two perpendicular segments meeting where neither ends is a crossing.
// Parallel overlap of different wires is always an error.
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const net = segments.filter(s => s.kind !== 'rule');
let crossings = 0;
for (let i = 0; i < net.length; i++) for (let j = i + 1; j < net.length; j++) {
  const a = net[i], b = net[j];
  if (a.id === b.id) continue;
  const ah = a.a[1] === a.b[1], bh = b.a[1] === b.b[1];
  if (ah === bh) {
    const ax = ah ? 0 : 1, fx = 1 - ax;
    if (a.a[fx] === b.a[fx] && Math.min(Math.max(a.a[ax], a.b[ax]), Math.max(b.a[ax], b.b[ax])) >
      Math.max(Math.min(a.a[ax], a.b[ax]), Math.min(b.a[ax], b.b[ax]))) fail(`Overlapping wires: ${a.id} / ${b.id}`);
  } else {
    const h = ah ? a : b, v = ah ? b : a, p = [v.a[0], h.a[1]];
    const on = (pt, s) => { const q = segBox(s); return pt[0] >= q.x0 && pt[0] <= q.x1 && pt[1] >= q.y0 && pt[1] <= q.y1; };
    if (!on(p, h) || !on(p, v)) continue;
    const isEnd = [h.a, h.b, v.a, v.b].some(e => same(e, p));
    if (!isEnd) { crossings++; continue; }
    // A tee (an end landing mid-segment) must carry a junction dot; a shared corner must not.
    const mid = !same(p, h.a) && !same(p, h.b) || !same(p, v.a) && !same(p, v.b);
    const hasDot = dots.some(d => d.x === p[0] && d.y === p[1]);
    if (mid && !hasDot) fail(`Tee without junction dot at ${p}`);
  }
}
for (const d of dots.filter(d => !d.legend)) {
  const through = net.filter(s => { const q = segBox(s); return d.x >= q.x0 && d.x <= q.x1 && d.y >= q.y0 && d.y <= q.y1; });
  if (through.length < 2) fail(`Junction dot not on a branch: ${d.x},${d.y}`);
}
if (crossings > 2) fail(`Too many wire crossings: ${crossings}`);
if (errors.length) throw new Error(`Refusing to write: ${errors.length} geometry failures\n${[...new Set(errors)].join('\n')}`);

// ---- Outputs ---------------------------------------------------------------
const desc = 'Hardware block diagram of a battery-powered greenhouse telemetry node, read left to right. A Li-ion cell feeds a VBAT branch to a 3.3 V buck and a 5 V boost regulator. The 3V3 rail rises to one top trunk and taps down into the three sensors, the microcontroller, the SPI flash and the LoRa transceiver; the 5V rail runs in a channel just below the sensing and compute frames to the fan driver. Temperature/humidity, CO2 and ambient-light sensors share one I2C bus trunk into the microcontroller; the light sensor also raises an interrupt. The microcontroller drives one SPI trunk shared by the flash log and the LoRa transceiver, which feeds the antenna, and a PWM line to the fan driver and vent fan. An SWD debug header and the fan PWM line leave the bottom of the microcontroller. Power lines are orange, data lines ink, the interrupt dashed; junction dots mark every branch.';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}" stroke-linecap="butt" stroke-linejoin="miter">
<title>${esc(TITLE)}</title>
<desc>${esc(desc)}</desc>
<rect width="${W}" height="${H}" fill="${C.paper}"/>
<g id="frames">${layers.frames.join('')}</g>
<g id="wires">${layers.wires.join('')}</g>
<g id="blocks">${layers.blocks.join('')}</g>
<g id="marks">${layers.marks.join('')}</g>
<g id="labels">${layers.text.join('\n')}</g>
</svg>
`;

const source = `# Greenhouse climate telemetry node: power tree, I2C sensor bus, SPI bus, LoRa uplink.
# Roles reuse the engine palette: disturbance = power, sensor = sensing, controller = compute,
# output = storage & radio, actuator = actuation. Rails and buses are signal() nodes because the
# DSL has no bus-trunk or subsystem-frame statement.
blockdiagram "${TITLE}"
bat = block("Li-ion Cell\\n3.7 V · 2600 mAh") [role: disturbance]
buck = block("Buck Regulator\\nTPS62840 · 3.3 V") [role: disturbance]
boost = block("Boost Regulator\\nTPS61023 · 5 V") [role: disturbance]
rh = block("Temp + Humidity\\nSHT40") [role: sensor]
co2 = block("CO2 Sensor\\nSCD41") [role: sensor]
lux = block("Ambient Light\\nOPT3001") [role: sensor]
mcu = block("Microcontroller\\nSTM32L4 · Cortex-M4") [role: controller]
swd = block("SWD Debug Header") [role: input]
flash = block("SPI NOR Flash\\nW25Q128 · 16 MB log") [role: output]
radio = block("LoRa Transceiver\\nSX1262 · 868 MHz") [role: output]
ant = block("Antenna") [role: output]
drv = block("Fan Driver\\nLow-side MOSFET") [role: actuator]
fan = block("Vent Fan\\n5 V · 40 mm") [role: actuator]
rail33 = signal("3V3 rail") [discrete]
rail5 = signal("5V rail") [discrete]
i2c = signal("I2C bus")
spi = signal("SPI bus")
bat -> buck ["VBAT"]
bat -> boost ["VBAT"]
buck -> rail33
rail33 -> rh
rail33 -> co2
rail33 -> lux
rail33 -> mcu
rail33 -> flash
rail33 -> radio
boost -> rail5
rail5 -> drv
rh -> i2c
co2 -> i2c
lux -> i2c
i2c -> mcu
lux -> mcu ["INT"]
swd -> mcu ["SWD"]
mcu -> spi
spi -> flash
spi -> radio
radio -> ant ["RF"]
mcu -> drv ["PWM"]
drv -> fan
`;

const notes = `# Exemplar notes — block diagram

**Scenario.** The hardware block diagram of a battery-powered greenhouse climate node, the kind
printed on page one of a vendor reference design or a board design review. A Li-ion cell feeds two
regulators: a 3.3 V buck for all logic and radio, and a 5 V boost for the vent fan. Three sensors
(temperature and humidity, CO₂, ambient light) share one I²C bus into the microcontroller; the
light sensor also raises an interrupt line when a brightness threshold is crossed. The
microcontroller drives one SPI bus shared by a flash chip (the local measurement log) and a LoRa
radio feeding the antenna, and a PWM line to a MOSFET fan driver. An SWD debug header plugs in
below it. Thirteen blocks with four real branch points: the battery output (two regulators), the
3V3 rail (six loads), the I²C bus (three sensors) and the SPI bus (two devices).

**Palette.** Ink \`#16202B\` for block outlines, labels and data wires; slate \`#63707F\` for signal
names, part numbers, subsystem captions and the legend; rule \`#C9D2DC\` for the hairline under the
title. Power is the one warm line colour, \`#C2410C\`, used for every rail wire, its arrowheads, its
junction dots and the rail names — so the power tree reads as its own layer on top of the data
wiring. The interrupt is a slate dashed line. Block fills are the engine's own role fills, one per
subsystem: power \`#FFEDD5\`, sensing \`#F3E8FF\`, compute \`#DBEAFE\`, storage and radio \`#ECFCCB\`,
actuation \`#DCFCE7\`. Each subsystem frame is a much lighter wash of the same hue with a slightly
darker edge, so the regions are visible without competing with the blocks.

**Type scale.** Title 22 semibold, subtitle 12.5, block name 13 medium with an optional second line
at 11 slate for the part number, signal and rail names 11.5 (rail and bus names semibold, signal
names italic), subsystem caption 11 semibold with wide letter spacing, legend 11. One corner radius
for blocks (4) and one for frames (10); strokes: blocks and data wires 1.5, power rails 2.5, bus
trunks 3, frames 1. 8 px spacing unit; blocks are 56 px tall on an 80 px row pitch.

**Geometry.** Every wire is orthogonal. Arrowheads (solid 9 × 7 triangles) land exactly on the
receiving block's edge. A bus is one thick vertical trunk with thin horizontal taps to each device
— never a separate wire per device and never a pill-shaped bus node; the bus name (I²C, SPI) sits
once above its trunk. Taps from I²C sensors carry no arrowhead because the bus is shared; the single
drop into the microcontroller does. A junction dot (3.5 px power, 4 px bus) marks every tee; plain
corners get no dot. Rail names 3V3 and 5V appear once, at the start of the trunk, not on each tap.
Power enters the sensors lower on their left edge than the I²C taps leave their right edge, so the
two layers never share a row.

**Layout.** Signal flow runs left to right in five columns: power, sensing, compute, then storage,
radio and actuation. Buses live in the two gutters between columns (I²C left of the
microcontroller, SPI right of it), so every tap is a short straight stub. The 3V3 rail rises in the
gutter between power and sensing, runs along a clear channel above all frames and drops straight
into the tops of the microcontroller, flash and radio; the radio is wider than the flash so its drop
passes beside the flash rather than through it. The microcontroller is only as tall as its five
attachment points need (two sensor rows): I²C and the interrupt on the left at a quarter and three
quarters of its height, SPI mid-right, SWD and PWM on the bottom edge. The interrupt passes below
the end of the I²C trunk and steps up to its pin, so it never crosses the bus. The 5V rail runs in
a channel directly under the sensing and compute frames and rises into the fan driver. The legend
is a single row under a hairline, below every frame and wire. The result has **zero wire crossings**. The script checks every label against every
other label, block, wire, junction dot and the canvas edge, confirms each block sits inside its
frame, that every tee has a dot, and that attached wires end on the block edge; it refuses to write
on any failure.

**Departures from the DSL.** The DSL has no bus-trunk, power-rail or subsystem-frame statement
(the standard doc describes \`boundary "…":\` but the parser does not implement it). In source.sx
rails and buses are therefore \`signal()\` nodes that every device connects to, and the power blocks
use \`role: disturbance\` only because that role carries the orange fill. The engine cannot draw a
single trunk with taps, a distinct power line colour, the part-number second line in slate, or the
frames; those are drawn here because hardware block-diagram practice requires them.

**References.** IEEE Std 315 / IEC 60617-2 for signal-flow direction and the filled-dot junction
convention; the system block diagrams on the first pages of TI, ST, Nordic and Espressif datasheets
and reference designs for rails-on-top power trees, shared-bus trunks and per-subsystem tinting.
`;

const raster = new Resvg(svg, { font, fitTo: { mode: 'width', value: W * 2 } }).render();
await mkdir(TARGET, { recursive: true });
await writeFile(new URL('ideal.svg', TARGET), svg);
await writeFile(new URL('source.sx', TARGET), source);
await writeFile(new URL('notes.md', TARGET), notes);
if (PNG) await writeFile(PNG, raster.asPng());
console.log(`blockdiagram exemplar: ${W}×${H}; crossings=${crossings}; texts=${texts.length}; blocks=${bodies.length}; segments=${net.length}; ${fileURLToPath(TARGET)}`);
