/**
 * Hand-authored IEC 61131-3 SFC exemplar. Run from the repo root:
 *   node scripts/visual-eval/draw-sfc-exemplar.mjs [preview.png]
 * Text bounds come from resvg shaping; every text is checked against every
 * other text and every stroke before anything is written.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = { ink: '#20272B', muted: '#59636B', rule: '#CBD1D6', paper: '#FFFFFF' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 25, label: 14, pin: 13, note: 12 };
const SW = { symbol: 2, wire: 1.5, rule: 1, bar: 4 };
const TARGET = new URL('../../visual-eval/exemplars/sfc/ideal.svg', import.meta.url);
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

const W = 1060, XM = 470, XL = 250, XR = 690, SWD = 96, SH = 44, LOOP = 110;
const Q = 36, NAME = 150, TIME = 72;

function poly(pts, { fill = C.ink } = {}) {
  pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; segs.push([p[0], p[1], q[0], q[1]]); });
  out.push(`<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${fill}"/>`);
}
/** Step box; initial step gets the IEC double outline. Actions hang to the right. */
function step(x, top, name, { initial = false, action } = {}) {
  rect(x - SWD / 2, top, SWD, SH, { w: SW.symbol });
  if (initial) rect(x - SWD / 2 + 5, top + 5, SWD - 10, SH - 10, { w: SW.wire });
  text(name, x, top + 27, { weight: 600, anchor: 'middle' });
  if (!action) return;
  const [q, a, t] = action, ax = x + SWD / 2 + 24, aw = Q + NAME + (t ? TIME : 0);
  line(x + SWD / 2, top + SH / 2, ax, top + SH / 2);
  rect(ax, top, aw, SH, { w: SW.wire });
  line(ax + Q, top, ax + Q, top + SH, { w: SW.wire });
  text(q, ax + Q / 2, top + 27, { weight: 600, anchor: 'middle' });
  text(a, ax + Q + 10, top + 27);
  if (t) { line(ax + Q + NAME, top, ax + Q + NAME, top + SH, { w: SW.wire }); text(t, ax + Q + NAME + TIME / 2, top + 27, { fs: FS.pin, anchor: 'middle' }); }
}
function transition(x, y, cond) {
  line(x - 20, y, x + 20, y, { w: SW.bar });
  text(cond, x + 32, y + 5);
}
function doubleBar(y) {
  line(XL - 20, y, XR + 20, y); line(XL - 20, y + 5, XR + 20, y + 5);
}

text('Bake and cool concurrently', 48, 50, { fs: FS.title, weight: 600 });
text('Batch oven sequence  ·  IEC 61131-3 sequential function chart', 48, 76, { fs: 13, fill: C.muted });

// Main column: initial step, heat-up, shared transition into the parallel bake/cool.
step(XM, 128, 'S0', { initial: true });
line(XM, 172, XM, 244); transition(XM, 208, 'BakeReady');
step(XM, 244, 'S_Heat', { action: ['N', 'Heater_On'] });
line(XM, 288, XM, 352); transition(XM, 320, 'HeatDone');

// Simultaneous divergence (double line), two concurrent branches, simultaneous convergence.
doubleBar(352);
for (const x of [XL, XR]) { line(x, 357, x, 400); line(x, 444, x, 500); }
step(XL, 400, 'S_Bake', { action: ['D', 'Oven_Run', 'T#15m'] });
step(XR, 400, 'S_Cool', { action: ['L', 'Cooler_On', 'T#5m'] });
doubleBar(500);

line(XM, 505, XM, 580); transition(XM, 542, 'Bake_Done AND Cool_Done');
step(XM, 580, 'S_Done', { action: ['N', 'AnnounceDone'] });
line(XM, 624, XM, 700); transition(XM, 660, 'NOT BakeReady');

// Return link to the initial step; upward flow carries an arrow.
line(XM, 700, LOOP, 700); line(LOOP, 700, LOOP, 100); line(LOOP, 100, XM, 100); line(XM, 100, XM, 128);
poly([[LOOP, 392], [LOOP - 6, 408], [LOOP + 6, 408]]);

line(48, 740, W - 48, 740, { w: SW.rule, stroke: C.rule });
text('Double outline: initial step.  Thick bar: transition, condition to its right.  Double line: branches run simultaneously.', 48, 766, { fs: FS.note, fill: C.muted });
text('Action qualifiers: N while the step is active,  D delayed by the time shown,  L limited to the time shown.', 48, 784, { fs: FS.note, fill: C.muted });
finish(W, 808, 'Bake and cool concurrently — IEC 61131-3 SFC');
