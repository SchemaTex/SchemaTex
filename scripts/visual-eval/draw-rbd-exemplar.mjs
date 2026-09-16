/**
 * Reliability block diagram exemplar (IEC 61078): data-centre Tier III availability.
 *   node scripts/visual-eval/draw-rbd-exemplar.mjs [preview.png]
 * Reliabilities and Birnbaum importances are computed here, not typed in.
 * Text is measured with resvg and checked against text, lines, blocks and canvas.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = { ink: '#0f172a', line: '#334155', muted: '#64748b', block: '#eef2f7', paper: '#ffffff',
  blue: '#2563eb', green: '#059669', red: '#dc2626' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 22, sub: 13, name: 14, value: 13, small: 12, big: 22 };
const W = 1300, H = 480;
const TARGET = new URL('../../visual-eval/exemplars/rbd/ideal.svg', import.meta.url);
const PNG = process.argv[2];

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [], texts = [], segs = [], boxes = [];
const cache = new Map();
function measure(s, fs, weight, anchor) {
  const k = [s, fs, weight, anchor].join('|');
  if (!cache.has(k)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="200"><text x="1500" y="100" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    cache.set(k, { x0: b.x - 1500, y0: b.y - 100, x1: b.x + b.width - 1500, y1: b.y + b.height - 100 });
  }
  return cache.get(k);
}
function T(s, x, y, { fs = FS.name, weight = 400, fill = C.ink, anchor = 'start', inside } = {}) {
  const m = measure(s, fs, weight, anchor);
  texts.push({ s, inside, r: { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 } });
  out.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`);
  return m.x1 - m.x0;
}
function L(x1, y1, x2, y2, { stroke = C.line, w = 2 } = {}) {
  out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"/>`);
  segs.push({ x0: Math.min(x1, x2) - w / 2, x1: Math.max(x1, x2) + w / 2, y0: Math.min(y1, y2) - w / 2, y1: Math.max(y1, y2) + w / 2 });
}
const hit = (a, b, p = 0) => a.x0 < b.x1 + p && b.x0 < a.x1 + p && a.y0 < b.y1 + p && b.y0 < a.y1 + p;
const dot = (x, y) => out.push(`<circle cx="${x}" cy="${y}" r="3.5" fill="${C.line}"/>`);

// ── Reliability model ───────────────────────────────────────────────────
const R = { UTIL: 0.999, GEN: 0.98, ATS: 0.995, CRAC1: 0.97, CRAC2: 0.97, CRAC3: 0.97, SW1: 0.995, SW2: 0.995, ST1: 0.99, ST2: 0.99 };
const NAME = { UTIL: 'Utility feed', GEN: 'Diesel generator', ATS: 'Transfer switch', CRAC1: 'CRAC unit 1', CRAC2: 'CRAC unit 2', CRAC3: 'CRAC unit 3', SW1: 'Core switch A', SW2: 'Core switch B', ST1: 'Storage node A', ST2: 'Storage node B' };
const par = (...r) => 1 - r.reduce((a, x) => a * (1 - x), 1);
const twoOfThree = (a, b, c) => a * b + a * c + b * c - 2 * a * b * c;
const groups = r => ({
  power: par(r.UTIL, r.GEN * r.ATS),
  cooling: twoOfThree(r.CRAC1, r.CRAC2, r.CRAC3),
  network: par(r.SW1, r.SW2),
  storage: par(r.ST1, r.ST2),
});
const system = r => Object.values(groups(r)).reduce((a, x) => a * x, 1);
const Rsys = system(R);
const birnbaum = Object.fromEntries(Object.keys(R).map(id => [id, system({ ...R, [id]: 1 }) - system({ ...R, [id]: 0 })]));
const spof = Object.keys(R).filter(id => system({ ...R, [id]: 0 }) === 0);
const maxI = Math.max(...Object.values(birnbaum));
const critical = new Set(Object.keys(R).filter(id => Math.abs(birnbaum[id] - maxI) < 1e-12));
const G = groups(R);

// ── Geometry ────────────────────────────────────────────────────────────
const BW = 150, BH = 60, Yc = 236, M = 40;
function block(id, x, yMid) {
  const hi = critical.has(id), bad = spof.includes(id);
  const y = yMid - BH / 2;
  const stroke = bad ? C.red : hi ? C.green : C.line;
  out.push(`<rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="6" fill="${C.block}" stroke="${stroke}" stroke-width="${hi || bad ? 3 : 2}"/>`);
  boxes.push({ id, x0: x, y0: y, x1: x + BW, y1: y + BH });
  T(NAME[id], x + BW / 2, yMid - 3, { weight: 600, anchor: 'middle', inside: id });
  T(`R = ${R[id]}`, x + BW / 2, yMid + 16, { fs: FS.value, fill: C.blue, anchor: 'middle', inside: id });
}
// Parallel/k-of-n rails: split at sx, join at jx, one branch per row offset.
function rails(sx, jx, offsets) {
  L(sx, Yc + Math.min(...offsets), sx, Yc + Math.max(...offsets));
  L(jx, Yc + Math.min(...offsets), jx, Yc + Math.max(...offsets));
  dot(sx, Yc); dot(jx, Yc);
}

out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${C.paper}"/>`);
T('Data centre Tier III availability', M, 48, { fs: FS.title, weight: 600 });
T('Reliability block diagram · the system works while working blocks connect In to Out', M, 72, { fs: FS.sub, fill: C.muted });
T('System reliability', W - M, 44, { fs: FS.sub, fill: C.muted, anchor: 'end' });
T(`R = ${Rsys.toFixed(4)}`, W - M, 72, { fs: FS.big, weight: 600, fill: C.blue, anchor: 'end' });

// Terminals
out.push(`<circle cx="${M + 12}" cy="${Yc}" r="7" fill="${C.paper}" stroke="${C.line}" stroke-width="2"/>`);
T('In', M + 12, Yc + 28, { fs: FS.small, fill: C.muted, anchor: 'middle' });
L(M + 19, Yc, 90, Yc);

// Power: utility in parallel with generator + transfer switch in series
rails(90, 470, [-42, 42]);
L(90, Yc - 42, 205, Yc - 42); block('UTIL', 205, Yc - 42); L(355, Yc - 42, 470, Yc - 42);
L(90, Yc + 42, 114, Yc + 42); block('GEN', 114, Yc + 42); L(264, Yc + 42, 296, Yc + 42);
block('ATS', 296, Yc + 42); L(446, Yc + 42, 470, Yc + 42);
L(470, Yc, 520, Yc);

// Cooling: 2 of 3
rails(520, 718, [-84, 0, 84]);
for (const [id, dy] of [['CRAC1', -84], ['CRAC2', 0], ['CRAC3', 84]]) {
  L(520, Yc + dy, 544, Yc + dy); block(id, 544, Yc + dy); L(694, Yc + dy, 718, Yc + dy);
}
T('2/3', 730, Yc - 9, { fs: FS.value, weight: 600 });
L(718, Yc, 776, Yc);

// Network and storage pairs
for (const [sx, ids] of [[776, ['SW1', 'SW2']], [1024, ['ST1', 'ST2']]]) {
  rails(sx, sx + 198, [-42, 42]);
  ids.forEach((id, i) => { const dy = i ? 42 : -42; L(sx, Yc + dy, sx + 24, Yc + dy); block(id, sx + 24, Yc + dy); L(sx + 174, Yc + dy, sx + 198, Yc + dy); });
}
L(974, Yc, 1024, Yc);
L(1222, Yc, W - M - 19, Yc);
out.push(`<circle cx="${W - M - 12}" cy="${Yc}" r="7" fill="${C.paper}" stroke="${C.line}" stroke-width="2"/>`);
T('Out', W - M - 12, Yc + 28, { fs: FS.small, fill: C.muted, anchor: 'middle' });

// Group captions with computed group reliability
const capY = Yc + 84 + BH / 2 + 34;
for (const [cx, label, r] of [[280, 'Power supply', G.power], [619, 'Cooling · 2 of 3 required', G.cooling], [875, 'Core network', G.network], [1123, 'Storage', G.storage]]) {
  T(label, cx, capY, { fs: FS.small, weight: 600, fill: C.muted, anchor: 'middle' });
  T(`R = ${r.toFixed(5)}`, cx, capY + 17, { fs: FS.small, fill: C.blue, anchor: 'middle' });
}

// Legend
const ly = H - 40;
let x = M;
out.push(`<rect x="${x}" y="${ly - 11}" width="26" height="16" rx="3" fill="${C.block}" stroke="${C.green}" stroke-width="3"/>`);
x += 36 + T(`Highest Birnbaum importance (${maxI.toFixed(3)}): the best place to add reliability`, x + 36, ly, { fs: FS.small, fill: C.muted }) + 36;
out.push(`<rect x="${x}" y="${ly - 11}" width="26" height="16" rx="3" fill="${C.block}" stroke="${C.red}" stroke-width="3"/>`);
x += 36 + T(spof.length ? 'Single point of failure' : 'Single point of failure (none: every block has a redundant partner)', x + 36, ly, { fs: FS.small, fill: C.muted });

// ── Checks ──────────────────────────────────────────────────────────────
const errs = [];
texts.forEach((a, i) => {
  if (a.r.x0 < 4 || a.r.x1 > W - 4 || a.r.y0 < 4 || a.r.y1 > H - 4) errs.push(`canvas: ${a.s}`);
  texts.slice(i + 1).forEach(b => { if (hit(a.r, b.r, 2)) errs.push(`text/text: ${a.s} | ${b.s}`); });
  segs.forEach(sg => { if (hit(a.r, sg, 2)) errs.push(`text/line: ${a.s}`); });
  boxes.forEach(b => {
    if (a.inside === b.id) { if (a.r.x0 < b.x0 + 8 || a.r.x1 > b.x1 - 8 || a.r.y0 < b.y0 + 6 || a.r.y1 > b.y1 - 6) errs.push(`overflow: ${a.s}`); }
    else if (hit(a.r, b, 2)) errs.push(`text/block: ${a.s} | ${b.id}`);
  });
});
for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (hit(boxes[i], boxes[j], 8)) errs.push(`block/block ${boxes[i].id} ${boxes[j].id}`);
if (x > W - M) errs.push('legend too wide');
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Data centre Tier III availability">
<title>Data centre Tier III availability</title>
<desc>Reliability block diagram: power (utility in parallel with generator and transfer switch), cooling 2 of 3 CRAC units, redundant core switches and storage nodes in series. System reliability ${Rsys.toFixed(4)}; CRAC units carry the highest Birnbaum importance (${maxI.toFixed(3)}); no single point of failure.</desc>
<g font-family="${FONT}">
${out.join('\n')}
</g>
</svg>
`;
await writeFile(TARGET, svg);
if (PNG) await writeFile(PNG, new Resvg(svg, { font, fitTo: { mode: 'width', value: W * 2 } }).render().asPng());
console.log(`rbd: R=${Rsys.toFixed(5)} Imax=${maxI.toFixed(4)} spof=${spof.length}; ${texts.length} texts, 0 collisions`);
