/**
 * Event tree exemplar (NUREG/CR-2300 / IEC 62502): large-break LOCA.
 *   node scripts/visual-eval/draw-eventtree-exemplar.mjs [preview.png]
 * Text is measured with resvg; every text box is checked against every other
 * text, every line and the canvas before the SVG is written.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = { ink: '#0f172a', line: '#334155', muted: '#64748b', rule: '#cbd5e1', rowRule: '#e2e8f0',
  band: '#f1f5f9', paper: '#ffffff', blue: '#2563eb', green: '#16a34a', amber: '#d97706', red: '#dc2626' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 22, sub: 13, head: 13, label: 13, small: 12 };
const W = 1300, H = 548;
const TARGET = new URL('../../visual-eval/exemplars/eventtree/ideal.svg', import.meta.url);
const PNG = process.argv[2];

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [], texts = [], segs = [];
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
function T(s, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start' } = {}) {
  const m = measure(s, fs, weight, anchor);
  texts.push({ s, r: { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 } });
  out.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`);
  return m.x1 - m.x0;
}
function L(x1, y1, x2, y2, { stroke = C.line, w = 2, dash, check = true } = {}) {
  out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="butt"/>`);
  if (check) segs.push({ x0: Math.min(x1, x2) - w / 2, x1: Math.max(x1, x2) + w / 2, y0: Math.min(y1, y2) - w / 2, y1: Math.max(y1, y2) + w / 2 });
}
const hit = (a, b, p = 0) => a.x0 < b.x1 + p && b.x0 < a.x1 + p && a.y0 < b.y1 + p && b.y0 < a.y1 + p;

// ── Content ─────────────────────────────────────────────────────────────
const IE = { name: 'Large-break LOCA', f: 1e-4 };
const FUN = [
  { name: ['Reactor trip'], p: 0.001 },
  { name: ['ECCS injection'], p: 0.01 },
  { name: ['Containment', 'heat removal'], p: 0.02 },
  { name: ['Containment', 'integrity'], p: 0.005 },
];
const SEQ = [
  { path: 'ssss', out: 'No release', sev: 'ok' },
  { path: 'sssf', out: 'Late release', sev: 'late' },
  { path: 'ssf', out: 'Late release', sev: 'late' },
  { path: 'sf', out: 'Early release', sev: 'severe' },
  { path: 'f', out: 'Core damage', sev: 'severe' },
];
const SEV = { ok: C.green, late: C.amber, severe: C.red };
const freq = path => [...path].reduce((v, c, i) => v * (c === 's' ? 1 - FUN[i].p : FUN[i].p), IE.f);
const fmtE = v => { let e = Math.floor(Math.log10(v)); let m = v / 10 ** e; if (m.toFixed(2) === '10.00') { m /= 10; e += 1; } return `${m.toFixed(2)}E-${String(-e).padStart(2, '0')}`; };
const code = path => [...path].map((c, i) => `${i + 1}${c}`).join(' ');

// ── Geometry ────────────────────────────────────────────────────────────
const M = 40, colW = 160, ieR = 200;
const colL = FUN.map((_, i) => ieR + i * colW);
const forkX = colL.map(x => x + colW / 2);
const treeR = ieR + FUN.length * colW;              // 840
const tab = { num: [treeR, treeR + 44], seq: [treeR + 44, treeR + 170], end: [treeR + 170, treeR + 330], freq: [treeR + 330, W - M] };
const band = { y0: 92, y1: 148 };
const row0 = 196, P = 58;
const rowY = SEQ.map((_, i) => row0 + i * P);
const leafX = treeR - 12;
const yOf = prefix => { const i = SEQ.findIndex(s => s.path === prefix); return i >= 0 ? rowY[i] : yOf(prefix + 's'); };

out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${C.paper}"/>`);
T('Large-break LOCA event tree', M, 48, { fs: FS.title, weight: 600 });
T('Four safety functions in response order · upper branch = success, lower branch = failure · frequencies per reactor-year', M, 72, { fs: FS.sub, fill: C.muted });

// Header band
out.push(`<rect x="${M}" y="${band.y0}" width="${W - 2 * M}" height="${band.y1 - band.y0}" fill="${C.band}"/>`);
L(M, band.y0, W - M, band.y0, { stroke: C.rule, w: 1, check: false });
L(M, band.y1, W - M, band.y1, { stroke: C.line, w: 1.5, check: false });
T('Initiating event', M + 8, 116, { fs: FS.head, weight: 600 });
T('f = 1.00E-04 /yr', M + 8, 134, { fs: FS.small, fill: C.muted });
FUN.forEach((f, i) => {
  const cx = forkX[i];
  const lines = f.name;
  const y0 = lines.length === 1 ? 116 : 108;
  lines.forEach((s, j) => T(s, cx, y0 + j * 15, { fs: FS.head, weight: 600, anchor: 'middle' }));
  T(`P(fail) = ${f.p}`, cx, y0 + lines.length * 15 + 3, { fs: FS.small, fill: C.muted, anchor: 'middle' });
});
T('#', (tab.num[0] + tab.num[1]) / 2, 125, { fs: FS.head, weight: 600, anchor: 'middle' });
T('Sequence', tab.seq[0] + 10, 125, { fs: FS.head, weight: 600 });
T('End state', tab.end[0] + 10, 125, { fs: FS.head, weight: 600 });
T('Frequency', tab.freq[1] - 8, 125, { fs: FS.head, weight: 600, anchor: 'end' });

// Column dividers
const gridBottom = rowY.at(-1) + 30;
colL.forEach(x => L(x, band.y1, x, gridBottom, { stroke: C.rule, w: 1, dash: '4 4', check: false }));
L(treeR, band.y1, treeR, gridBottom, { stroke: C.rule, w: 1, check: false });

// Tree: success runs straight on, failure drops to its own row.
function node(prefix, xStart) {
  const k = prefix.length, y = yOf(prefix);
  if (SEQ.some(s => s.path === prefix)) {
    L(xStart, y, leafX, y);
    out.push(`<circle cx="${leafX}" cy="${y}" r="3.5" fill="${C.line}"/>`);
    return;
  }
  const fx = forkX[k], yf = yOf(prefix + 'f');
  L(xStart, y, fx, y);
  L(fx, y, fx, yf);
  for (const [c, yy, p] of [['s', y, 1 - FUN[k].p], ['f', yf, FUN[k].p]]) {
    const w = T(`${k + 1}${c}`, fx + 10, yy - 8, { fs: FS.small, fill: C.muted });
    T(String(+p.toFixed(4)), fx + 10 + w + 6, yy - 8, { fs: FS.small, weight: 600, fill: C.blue });
  }
  node(prefix + 's', fx);
  node(prefix + 'f', fx);
}
const yIE = yOf('');
L(M + 8, yIE, M + 118, yIE, { stroke: C.ink, w: 5 });
T(IE.name, M + 8, yIE - 12, { fs: FS.label, weight: 600 });
node('', M + 118);

// Result table
SEQ.forEach((s, i) => {
  const y = rowY[i] + 4.5;
  if (i > 0) L(treeR, rowY[i] - P / 2, W - M, rowY[i] - P / 2, { stroke: C.rowRule, w: 1, check: false });
  T(String(i + 1), (tab.num[0] + tab.num[1]) / 2, y, { anchor: 'middle' });
  T(code(s.path), tab.seq[0] + 10, y, { fs: FS.small, fill: C.muted });
  out.push(`<rect x="${tab.end[0] + 10}" y="${rowY[i] - 5}" width="10" height="10" rx="2" fill="${SEV[s.sev]}"/>`);
  T(s.out, tab.end[0] + 28, y, { weight: 600 });
  T(fmtE(freq(s.path)), tab.freq[1] - 8, y, { weight: 600, fill: C.blue, anchor: 'end' });
});
L(M, gridBottom, W - M, gridBottom, { stroke: C.line, w: 1.5, check: false });

// Summary and legend
const adverse = SEQ.filter(s => s.sev !== 'ok');
const total = adverse.reduce((a, s) => a + freq(s.path), 0);
const top = adverse.reduce((a, s) => (freq(s.path) > freq(a.path) ? s : a));
const topIdx = SEQ.indexOf(top) + 1;
let x = M;
x += T('Release or core damage:', x, gridBottom + 32, { weight: 600 }) + 6;
x += T(`${fmtE(total)} /yr`, x, gridBottom + 32, { weight: 600, fill: C.blue }) + 6;
T(`(${(100 * total / IE.f).toFixed(1)}% of initiating events) · largest contributor is sequence ${topIdx}, ${top.out.toLowerCase()} after loss of containment heat removal`, x, gridBottom + 32, { fill: C.muted });
x = M;
for (const [sev, label] of [['ok', 'Controlled, no release'], ['late', 'Late release'], ['severe', 'Early release or core damage']]) {
  out.push(`<rect x="${x}" y="${gridBottom + 50}" width="10" height="10" rx="2" fill="${SEV[sev]}"/>`);
  x += 16 + T(label, x + 16, gridBottom + 59.5, { fs: FS.small, fill: C.muted }) + 28;
}

// ── Checks ──────────────────────────────────────────────────────────────
const errs = [];
texts.forEach((a, i) => {
  if (a.r.x0 < 4 || a.r.x1 > W - 4 || a.r.y0 < 4 || a.r.y1 > H - 4) errs.push(`canvas: ${a.s}`);
  texts.slice(i + 1).forEach(b => { if (hit(a.r, b.r, 2)) errs.push(`text/text: ${a.s} | ${b.s}`); });
  segs.forEach(sg => { if (hit(a.r, sg, 2)) errs.push(`text/line: ${a.s}`); });
});
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Large-break LOCA event tree">
<title>Large-break LOCA event tree</title>
<desc>Event tree: large-break LOCA (1.00E-04 /yr) questioned by reactor trip, ECCS injection, containment heat removal and containment integrity; five sequences ending in no release, late release (2), early release and core damage.</desc>
<g font-family="${FONT}">
${out.join('\n')}
</g>
</svg>
`;
await writeFile(TARGET, svg);
if (PNG) await writeFile(PNG, new Resvg(svg, { font, fitTo: { mode: 'width', value: W * 2 } }).render().asPng());
console.log(`eventtree: ${texts.length} texts, ${segs.length} lines, 0 collisions`);
