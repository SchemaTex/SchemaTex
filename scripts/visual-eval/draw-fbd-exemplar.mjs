/**
 * Hand-authored IEC 61131-3 FBD exemplar. Run from the repo root:
 *   node scripts/visual-eval/draw-fbd-exemplar.mjs [preview.png]
 * Text bounds come from resvg shaping; every text is checked against every
 * other text and every stroke before anything is written.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = { ink: '#20272B', muted: '#59636B', rule: '#CBD1D6', paper: '#FFFFFF' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 25, label: 14, pin: 13, note: 12 };
const SW = { symbol: 2, wire: 1.5, rule: 1 };
const TARGET = new URL('../../visual-eval/exemplars/fbd/ideal.svg', import.meta.url);
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

const W = 1040, L = 48, R = W - 48;
const BW = 132, HEAD = 30, PITCH = 26, STUB = 24;

/** A function block: type inside the top, instance above, formal names at pins. */
function block(x, y, { type, inst, ins, outs, edge = [], neg = [] }) {
  const rows = Math.max(ins.length, outs.length);
  const h = HEAD + rows * PITCH + 8;
  rect(x, y, BW, h, { w: SW.symbol });
  text(type, x + BW / 2, y + 21, { weight: 600, anchor: 'middle' });
  if (inst) text(inst, x + BW / 2, y - 10, { weight: 600, anchor: 'middle' });
  const pin = {};
  ins.forEach((n, i) => {
    const py = y + HEAD + 16 + i * PITCH;
    if (neg.includes(i)) { line(x - STUB, py, x - 8, py); circle(x - 4, py, 4); } else line(x - STUB, py, x, py);
    let lx = x + 8;
    if (edge.includes(n)) { line(x, py - 5, x + 7, py, { w: SW.wire }); line(x + 7, py, x, py + 5, { w: SW.wire }); lx = x + 12; }
    if (n) text(n, lx, py + 4.5, { fs: FS.pin });
    pin[n || `in${i}`] = [x - STUB, py];
  });
  outs.forEach((n, i) => {
    const py = y + HEAD + 16 + i * PITCH;
    line(x + BW, py, x + BW + STUB, py);
    if (n) text(n, x + BW - 8, py + 4.5, { fs: FS.pin, anchor: 'end' });
    pin[n || `out${i}`] = [x + BW + STUB, py];
  });
  return { pin, h };
}
/** Variable or literal feeding an input: name right-aligned, wire to the pin. */
function feed([px, py], name, x0, { weight = 600 } = {}) {
  text(name, x0 - 8, py + 5, { weight, anchor: 'end' });
  line(x0, py, px, py);
}
function sink([px, py], name, x1) {
  line(px, py, x1, py);
  text(name, x1 + 8, py + 5, { weight: 600 });
}

text('Bottle counter', L, 56, { fs: FS.title, weight: 600 });
text('PROGRAM BottleCounter  ·  IEC 61131-3 function block diagram', L, 82, { fs: 13, fill: C.muted });

let top = 112;
function network(n, comment, bodyH, draw) {
  line(L, top, R, top, { w: SW.rule, stroke: C.rule });
  text(`Network ${n}`, L, top + 28, { weight: 600 });
  text(comment, L + 96, top + 28, { fill: C.muted });
  draw(top + 80);
  top += 80 + bodyH + 30;
}

network(1, 'Debounce the photo-eye: the beam must stay broken for 50 ms.', 90, y => {
  const b = block(460, y, { type: 'TON', inst: 'Dwell', ins: ['IN', 'PT'], outs: ['Q', 'ET'] });
  feed(b.pin.IN, 'BottleSensor', 330);
  feed(b.pin.PT, 'T#50ms', 330, { weight: 400 });
});

network(2, 'Count one bottle on each rising edge; clear the count on case reset.', 116, y => {
  const t = block(360, y, { type: 'R_TRIG', inst: 'Pulse', ins: ['CLK'], outs: ['Q'] });
  feed(t.pin.CLK, 'Dwell.Q', 250);
  const c = block(700, y, { type: 'CTU', inst: 'BatchSize', ins: ['CU', 'R', 'PV'], outs: ['Q', 'CV'], edge: ['CU'] });
  line(t.pin.Q[0], t.pin.Q[1], c.pin.CU[0], c.pin.CU[1]);
  feed(c.pin.R, 'CaseReset', 610);
  feed(c.pin.PV, '24', 610, { weight: 400 });
});

network(3, 'Case full: report batch done to the case packer.', 64, y => {
  const m = block(460, y, { type: 'MOVE', ins: ['IN'], outs: ['OUT'] });
  feed(m.pin.IN, 'BatchSize.Q', 380);
  sink(m.pin.OUT, 'BatchDone', 680);
});

network(4, 'Run the infeed conveyor while commanded and the case is not yet full.', 90, y => {
  const a = block(460, y, { type: 'AND', ins: ['', ''], outs: [''], neg: [1] });
  // Pins are unnamed on a Boolean function; the second input is negated.
  const [p1, p2] = [[460 - STUB, y + HEAD + 16], [460 - STUB, y + HEAD + 16 + PITCH]];
  feed(p1, 'RunCmd', 380);
  feed(p2, 'BatchDone', 380);
  sink([460 + BW + STUB, y + HEAD + 16], 'InfeedRun', 680);
});

line(L, top, R, top, { w: SW.rule, stroke: C.rule });
text('Instance name above each block, block type inside the top, formal parameter names inside at their pins.', L, top + 26, { fs: FS.note, fill: C.muted });
text('An inward wedge marks an edge-triggered input (CTU.CU); a small circle marks a negated input.', L, top + 44, { fs: FS.note, fill: C.muted });
finish(W, top + 66, 'Bottle counter — IEC 61131-3 FBD');
