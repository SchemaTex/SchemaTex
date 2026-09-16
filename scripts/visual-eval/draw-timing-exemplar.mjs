/**
 * Hand-authored digital timing exemplar (I2C register read). Run from the repo root:
 *   node scripts/visual-eval/draw-timing-exemplar.mjs [preview.png]
 * Text bounds come from resvg shaping; every text is checked against every
 * other text and every stroke before anything is written.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = { ink: '#20272B', muted: '#59636B', rule: '#CBD1D6', grid: '#E8ECEF', paper: '#FFFFFF' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 25, label: 14, pin: 13, note: 12 };
const SW = { symbol: 2, wire: 1.5, rule: 1 };
const TARGET = new URL('../../visual-eval/exemplars/timing/ideal.svg', import.meta.url);
const PNG = process.argv[2];

// ---- shared kit: measured text, strokes, collision gate -------------------
const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [], texts = [], segs = [];
function measure(s, fs, weight, anchor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
  const b = new Resvg(svg, { font }).innerBBox();
  return { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 };
}
function text(s, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start' } = {}) {
  const m = measure(s, fs, weight, anchor);
  texts.push({ s, r: { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 } });
  out.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${esc(s)}</text>`);
  return x + m.x1;
}
function line(x1, y1, x2, y2, { w = SW.wire, stroke = C.ink, check = true } = {}) {
  if (check) segs.push([x1, y1, x2, y2]);
  out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"/>`);
}
function rect(x, y, w, h, opt = {}) {
  line(x, y, x + w, y, opt); line(x + w, y, x + w, y + h, opt); line(x + w, y + h, x, y + h, opt); line(x, y + h, x, y, opt);
}
function circle(cx, cy, r, { w = SW.wire } = {}) {
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * 2 * Math.PI, b = (i + 1) / 24 * 2 * Math.PI;
    segs.push([cx + r * Math.cos(a), cy + r * Math.sin(a), cx + r * Math.cos(b), cy + r * Math.sin(b)]);
  }
  out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.paper}" stroke="${C.ink}" stroke-width="${w}"/>`);
}
function segHitsRect([x1, y1, x2, y2], r, c) {
  const R = { x0: r.x0 - c, y0: r.y0 - c, x1: r.x1 + c, y1: r.y1 + c };
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1 - R.x0], [dx, R.x1 - x1], [-dy, y1 - R.y0], [dy, R.y1 - y1]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
function finish(W, H, title) {
  const bad = [];
  texts.forEach((a, i) => {
    if (a.r.x0 < 4 || a.r.y0 < 4 || a.r.x1 > W - 4 || a.r.y1 > H - 4) bad.push(`clipped: ${a.s}`);
    texts.slice(i + 1).forEach(b => {
      if (a.r.x0 < b.r.x1 + 2 && b.r.x0 < a.r.x1 + 2 && a.r.y0 < b.r.y1 + 2 && b.r.y0 < a.r.y1 + 2) bad.push(`text/text: ${a.s} | ${b.s}`);
    });
    segs.forEach(s => { if (segHitsRect(s, a.r, 2.5)) bad.push(`text/line: ${a.s} @ ${s.map(v => Math.round(v)).join(',')}`); });
  });
  if (bad.length) { console.error(bad.join('\n')); throw new Error(`${bad.length} collisions`); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}"><title>${esc(title)}</title><rect width="${W}" height="${H}" fill="${C.paper}"/>\n${out.join('\n')}\n</svg>\n`;
  writeFileSync(TARGET, svg);
  if (PNG) writeFileSync(PNG, new Resvg(svg, { font, fitTo: { mode: 'width', value: W * 2 } }).render().asPng());
  console.log(`ok: ${texts.length} texts, ${segs.length} segments, 0 collisions`);
}
// ---------------------------------------------------------------------------

const W = 1340, T0 = 180, U = 56, N = 20, D = 5, LH = 30;
const X = i => T0 + i * U;

text('I2C register read burst', 24, 44, { fs: FS.title, weight: 600 });
text('Master reads two bytes from register 0x10 of the device at address 0x50  ·  WaveDrom signal notation', 24, 70, { fs: 13, fill: C.muted });

for (let i = 0; i <= N; i++) line(X(i), 150, X(i), 388, { w: 1, stroke: C.grid, check: false });

// Phase brackets
function bracket(a, b, label) {
  line(X(a), 124, X(b), 124, { w: SW.rule, stroke: C.muted });
  line(X(a), 124, X(a), 130, { w: SW.rule, stroke: C.muted }); line(X(b), 124, X(b), 130, { w: SW.rule, stroke: C.muted });
  text(label, (X(a) + X(b)) / 2, 116, { fs: FS.note, weight: 600, fill: C.muted, anchor: 'middle' });
}
bracket(1, 8, 'Write register pointer 0x10');
bracket(8, 19, 'Read two bytes, NACK the last one, stop');

function laneName(top, name, group) {
  text(name, 160, top + 20, { weight: 600, anchor: 'end' });
  if (group) text(group, 24, top + 20, { fs: FS.note, weight: 600, fill: C.muted });
}
/** Bit waveform from level changes [x, 0|1]; vertical edges. */
function wave(top, changes) {
  const y = v => (v ? top : top + LH);
  const pts = [];
  changes.forEach(([x, v], i) => {
    if (i) pts.push([x, y(changes[i - 1][1])]);
    pts.push([x, y(v)]);
  });
  pts.push([X(N), y(changes[changes.length - 1][1])]);
  pts.forEach((p, i) => { if (i) segs.push([pts[i - 1][0], pts[i - 1][1], p[0], p[1]]); });
  out.push(`<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${C.ink}" stroke-width="${SW.wire}"/>`);
}
/** Bus lane: cells [from, to, kind, label]; kinds bus | hi | z | fall | rise. */
function bus(top, cells, { fs = FS.pin, fill = C.ink } = {}) {
  const lvl = { T: top, B: top + LH, M: top + LH / 2 };
  const left = { bus: 'TB', hi: 'T', z: 'M', fall: 'T', rise: 'B' };
  const right = { bus: 'TB', hi: 'T', z: 'M', fall: 'B', rise: 'T' };
  cells.forEach(([a, b, kind, label], i) => {
    const xa = X(a), xb = X(b), la = a === 0 ? xa : xa + D, rb = b === N ? xb : xb - D;
    if (kind === 'bus') { line(la, lvl.T, rb, lvl.T); line(la, lvl.B, rb, lvl.B); text(label, (xa + xb) / 2, top + 20, { fs, anchor: 'middle', fill }); }
    if (kind === 'hi' || kind === 'z') line(la, lvl[left[kind]], rb, lvl[left[kind]]);
    if (kind === 'fall' || kind === 'rise') {
      const m = xa + (kind === 'fall' ? 0.5 : 0.6) * U, s = lvl[left[kind]], e = lvl[right[kind]];
      line(la, s, m - D, s); line(m - D, s, m + D, e); line(m + D, e, rb, e);
    }
    const next = cells[i + 1];
    if (next) for (const l of right[kind]) for (const r of left[next[2]]) line(xb - D, lvl[l], xb + D, lvl[r]);
  });
}

// Bus lines
laneName(164, 'SCL', 'Bus lines');
const scl = [[X(0), 1], [X(2), 0]];
for (let i = 2; i < 18; i++) scl.push([X(i) + 0.25 * U, 1], [X(i) + 0.75 * U, 0]);
scl.push([X(18) + 0.25 * U, 1]);
wave(164, scl);

laneName(220, 'SDA');
bus(220, [[0, 1, 'hi'], [1, 2, 'fall'], [2, 4, 'bus', '0x50 · W'], [4, 5, 'bus', 'ACK'], [5, 7, 'bus', 'Reg 0x10'],
  [7, 8, 'bus', 'ACK'], [8, 9, 'fall'], [9, 11, 'bus', '0x50 · R'], [11, 12, 'bus', 'ACK'], [12, 14, 'bus', 'Data 0'],
  [14, 15, 'bus', 'ACK'], [15, 17, 'bus', 'Data 1'], [17, 18, 'bus', 'NACK'], [18, 19, 'rise'], [19, 20, 'hi']]);

line(24, 272, W - 24, 272, { w: SW.rule, stroke: C.rule });
laneName(288, 'SDA driver', 'Decoded');
bus(288, [[0, 1, 'z'], [1, 4, 'bus', 'Master'], [4, 5, 'bus', 'Slave'], [5, 7, 'bus', 'Master'], [7, 8, 'bus', 'Slave'],
  [8, 11, 'bus', 'Master'], [11, 14, 'bus', 'Slave'], [14, 15, 'bus', 'Master'], [15, 17, 'bus', 'Slave'],
  [17, 19, 'bus', 'Master'], [19, 20, 'z']], { fs: FS.note, fill: C.muted });

line(24, 336, W - 24, 336, { w: SW.rule, stroke: C.rule });
laneName(352, 'BUSY', 'Firmware');
wave(352, [[X(0), 0], [X(1), 1], [X(19), 0]]);

// Bus-condition markers: start, repeated start and stop happen while SCL is high.
for (const [x, label] of [[X(1) + 0.5 * U, 'S'], [X(8) + 0.5 * U, 'Sr'], [X(18) + 0.6 * U, 'P']]) {
  segs.push([x, 150, x, 262]);
  out.push(`<line x1="${x}" y1="150" x2="${x}" y2="262" stroke="${C.muted}" stroke-width="1" stroke-dasharray="4 3"/>`);
  text(label, x, 146, { fs: FS.note, weight: 600, fill: C.ink, anchor: 'middle' });
}

line(24, 404, W - 24, 404, { w: SW.rule, stroke: C.rule });
text('S start and P stop: SDA changes while SCL is high.  Sr repeated start.  ACK: the receiver pulls SDA low; NACK: SDA is left high.', 24, 428, { fs: FS.note, fill: C.muted });
text('Byte fields are compressed: the eight data clocks of each byte are drawn as two.', 24, 446, { fs: FS.note, fill: C.muted });
finish(W, 470, 'I2C register read burst — timing diagram');
