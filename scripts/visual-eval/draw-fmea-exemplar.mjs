/**
 * FMEA exemplar (AIAG & VDA FMEA Handbook 2019, Design FMEA form steps 2-5).
 *   node scripts/visual-eval/draw-fmea-exemplar.mjs [preview.png]
 * Cells wrap by measured text width (resvg); every text is checked to sit inside
 * its cell and clear every other text and the canvas before the SVG is written.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = { ink: '#0f172a', line: '#334155', muted: '#64748b', grid: '#cbd5e1', band: '#e2e8f0', head: '#f1f5f9', paper: '#ffffff' };
const AP = {
  H: { word: 'High', fill: '#fecaca', stroke: '#dc2626', text: '#991b1b' },
  M: { word: 'Medium', fill: '#fde68a', stroke: '#d97706', text: '#92400e' },
  L: { word: 'Low', fill: '#dcfce7', stroke: '#16a34a', text: '#166534' },
};
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 22, sub: 13, band: 12, head: 12, cell: 13, small: 12 };
const TARGET = new URL('../../visual-eval/exemplars/fmea/ideal.svg', import.meta.url);
const PNG = process.argv[2];

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [], texts = [], cells = [];
const cache = new Map();
function measure(s, fs, weight, anchor = 'start') {
  const k = [s, fs, weight, anchor].join('|');
  if (!cache.has(k)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="200"><text x="1500" y="100" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    cache.set(k, { x0: b.x - 1500, y0: b.y - 100, x1: b.x + b.width - 1500, y1: b.y + b.height - 100 });
  }
  return cache.get(k);
}
function T(s, x, y, { fs = FS.cell, weight = 400, fill = C.ink, anchor = 'start', inside } = {}) {
  const m = measure(s, fs, weight, anchor);
  texts.push({ s, inside, r: { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 } });
  out.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`);
  return m.x1 - m.x0;
}
function wrap(s, width, fs, weight = 400) {
  const lines = [];
  let cur = '';
  for (const w of s.split(' ')) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && measure(t, fs, weight).x1 - measure(t, fs, weight).x0 > width) { lines.push(cur); cur = w; } else cur = t;
  }
  lines.push(cur);
  return lines;
}
const hit = (a, b, p = 0) => a.x0 < b.x1 + p && b.x0 < a.x1 + p && a.y0 < b.y1 + p && b.y0 < a.y1 + p;

// ── Content: one row per failure cause ─────────────────────────────────
const COLS = [
  { key: 'el', label: 'Focus element', w: 128, step: 2 },
  { key: 'fn', label: 'Function', w: 150, step: 3 },
  { key: 'fe', label: 'Failure effect (FE)', w: 150, step: 4 },
  { key: 's', label: 'S', w: 38, step: 4, num: true },
  { key: 'fm', label: 'Failure mode (FM)', w: 140, step: 4 },
  { key: 'fc', label: 'Failure cause (FC)', w: 150, step: 4 },
  { key: 'pc', label: 'Prevention control (PC)', w: 150, step: 5 },
  { key: 'o', label: 'O', w: 38, step: 5, num: true },
  { key: 'dc', label: 'Detection control (DC)', w: 160, step: 5 },
  { key: 'd', label: 'D', w: 38, step: 5, num: true },
  { key: 'ap', label: 'AP', w: 84, step: 5, num: true },
];
const STEPS = { 2: 'Step 2 · Structure', 3: 'Step 3 · Function', 4: 'Step 4 · Failure analysis', 5: 'Step 5 · Risk analysis' };
const ROWS = [
  { el: 'Cell module', fn: 'Store and deliver energy', fe: 'Pack fire / occupant injury', s: 10, fm: 'Thermal runaway', fc: 'Internal short from dendrite growth', pc: 'Cell qualification', o: 4, dc: 'In-line CT scan', d: 5, ap: 'H' },
  { el: 'Cell module', fn: 'Store and deliver energy', fe: 'Pack fire / occupant injury', s: 10, fm: 'Thermal runaway', fc: 'Overcharge past cutoff', pc: 'BMS voltage clamp', o: 4, dc: 'Redundant voltage sense', d: 3, ap: 'H' },
  { el: 'Cell module', fn: 'Store and deliver energy', fe: 'Reduced range', s: 6, fm: 'Capacity fade', fc: 'Electrolyte depletion', pc: null, o: 5, dc: 'Periodic SOH estimate', d: 6, ap: 'L' },
  { el: 'Busbar joint', fn: 'Conduct current between modules', fe: 'Local overheating', s: 8, fm: 'High-resistance connection', fc: 'Loose torque on weld', pc: null, o: 4, dc: 'End-of-line resistance test', d: 4, ap: 'M' },
];
// Merge a cell with the rows below while the chain to its left is identical.
const MERGE = { el: ['el'], fn: ['el', 'fn'], fe: ['el', 'fm', 'fe'], s: ['el', 'fm', 'fe', 's'], fm: ['el', 'fm'] };

// ── Geometry ────────────────────────────────────────────────────────────
const M = 40, PADX = 10, LINE = 17;
const tableW = COLS.reduce((a, c) => a + c.w, 0);
const W = tableW + 2 * M;
let cx = M;
for (const c of COLS) { c.x = cx; cx += c.w; }
const bandY = 100, bandH = 28, headY = bandY + bandH, headH = 46, bodyY = headY + headH;

const valueText = (r, c) => (c.key === 'pc' && r.pc === null ? 'None' : String(r[c.key]));
const rowH = ROWS.map((r, i) => {
  let lines = 1;
  for (const c of COLS) {
    if (c.num || (MERGE[c.key] && i > 0 && MERGE[c.key].every(k => ROWS[i - 1][k] === r[k]))) continue;
    if (MERGE[c.key]) continue; // merged cells are sized after spans are known
    lines = Math.max(lines, wrap(valueText(r, c), c.w - 2 * PADX, FS.cell).length);
  }
  return Math.max(52, lines * LINE + 22);
});
const rowY = [];
rowH.reduce((y, h, i) => { rowY[i] = y; return y + h; }, bodyY);
const bodyBottom = rowY.at(-1) + rowH.at(-1);

out.push(`<rect x="0" y="0" width="${W}" height="__H__" fill="${C.paper}"/>`);
T('EV battery pack DFMEA', M, 48, { fs: FS.title, weight: 600 });
T('Design FMEA · DFMEA-2026-014 · next higher level: EV battery pack · S, O, D rated 1–10 · AP = Action Priority', M, 72, { fs: FS.sub, fill: C.muted });

// Step bands
for (const step of [2, 3, 4, 5]) {
  const cs = COLS.filter(c => c.step === step);
  const x0 = cs[0].x, x1 = cs.at(-1).x + cs.at(-1).w;
  out.push(`<rect x="${x0}" y="${bandY}" width="${x1 - x0}" height="${bandH}" fill="${C.band}" stroke="${C.paper}" stroke-width="2"/>`);
  const id = `band${step}`;
  cells.push({ id, x0, y0: bandY, x1, y1: bandY + bandH });
  T(STEPS[step], x0 + PADX, bandY + 18.5, { fs: FS.band, weight: 600, inside: id });
}
// Column headers
for (const c of COLS) {
  const id = `head-${c.key}`;
  out.push(`<rect x="${c.x}" y="${headY}" width="${c.w}" height="${headH}" fill="${C.head}" stroke="${C.grid}" stroke-width="1"/>`);
  cells.push({ id, x0: c.x, y0: headY, x1: c.x + c.w, y1: headY + headH });
  const lines = c.num ? [c.label] : wrap(c.label, c.w - 2 * PADX, FS.head, 600);
  const y0 = headY + headH / 2 - ((lines.length - 1) * 15) / 2 + 4.5;
  lines.forEach((s, j) => T(s, c.num ? c.x + c.w / 2 : c.x + PADX, y0 + j * 15, { fs: FS.head, weight: 600, anchor: c.num ? 'middle' : 'start', inside: id }));
}

// Body cells
ROWS.forEach((r, i) => {
  for (const c of COLS) {
    const keys = MERGE[c.key];
    if (keys && i > 0 && keys.every(k => ROWS[i - 1][k] === r[k])) continue;
    let span = 1;
    while (keys && i + span < ROWS.length && keys.every(k => ROWS[i + span][k] === r[k])) span += 1;
    const y0 = rowY[i], y1 = rowY[i + span - 1] + rowH[i + span - 1];
    const id = `cell-${c.key}-${i}`;
    out.push(`<rect x="${c.x}" y="${y0}" width="${c.w}" height="${y1 - y0}" fill="${C.paper}" stroke="${C.grid}" stroke-width="1"/>`);
    cells.push({ id, x0: c.x, y0, x1: c.x + c.w, y1 });
    if (c.key === 'ap') {
      const a = AP[r.ap], cw = 64, ch = 24, mx = c.x + c.w / 2, my = (y0 + y1) / 2;
      out.push(`<rect x="${mx - cw / 2}" y="${my - ch / 2}" width="${cw}" height="${ch}" rx="12" fill="${a.fill}" stroke="${a.stroke}" stroke-width="1.5"/>`);
      T(a.word, mx, my + 4.5, { fs: FS.small, weight: 600, fill: a.text, anchor: 'middle', inside: id });
    } else if (c.num) {
      T(valueText(r, c), c.x + c.w / 2, (y0 + y1) / 2 + 4.5, { weight: 600, anchor: 'middle', inside: id });
    } else {
      const none = c.key === 'pc' && r.pc === null;
      const lines = wrap(valueText(r, c), c.w - 2 * PADX, FS.cell, c.key === 'el' ? 600 : 400);
      const top = keys ? y0 + 22 : (y0 + y1) / 2 - ((lines.length - 1) * LINE) / 2 + 4.5;
      lines.forEach((s, j) => T(s, c.x + PADX, top + j * LINE, { weight: c.key === 'el' ? 600 : 400, fill: none ? C.muted : C.ink, inside: id }));
    }
  }
});
// Structure-element boundary and outer frame
const itemBreaks = ROWS.map((r, i) => (i > 0 && ROWS[i - 1].el !== r.el ? rowY[i] : null)).filter(v => v !== null);
itemBreaks.forEach(y => out.push(`<line x1="${M}" y1="${y}" x2="${M + tableW}" y2="${y}" stroke="${C.line}" stroke-width="1.5"/>`));
out.push(`<rect x="${M}" y="${bandY}" width="${tableW}" height="${bodyBottom - bandY}" fill="none" stroke="${C.line}" stroke-width="1.5"/>`);
out.push(`<line x1="${M}" y1="${bodyY}" x2="${M + tableW}" y2="${bodyY}" stroke="${C.line}" stroke-width="1.5"/>`);

// Legend
const ly = bodyBottom + 36;
let x = M;
x += T('Action Priority', x, ly, { fs: FS.small, weight: 600 }) + 18;
for (const [k, meaning] of [['H', 'act to improve prevention or detection, or justify current controls'], ['M', 'should act or justify'], ['L', 'could act']]) {
  const a = AP[k], cw = 64, ch = 22;
  out.push(`<rect x="${x}" y="${ly - 15}" width="${cw}" height="${ch}" rx="11" fill="${a.fill}" stroke="${a.stroke}" stroke-width="1.5"/>`);
  T(a.word, x + cw / 2, ly, { fs: FS.small, weight: 600, fill: a.text, anchor: 'middle' });
  x += cw + 8;
  x += T(meaning, x, ly, { fs: FS.small, fill: C.muted }) + 26;
}
const H = ly + 34;

// ── Checks ──────────────────────────────────────────────────────────────
const errs = [];
texts.forEach((a, i) => {
  if (a.r.x0 < 4 || a.r.x1 > W - 4 || a.r.y0 < 4 || a.r.y1 > H - 4) errs.push(`canvas: ${a.s}`);
  texts.slice(i + 1).forEach(b => { if (hit(a.r, b.r, 1.5)) errs.push(`text/text: ${a.s} | ${b.s}`); });
  if (a.inside) {
    const c = cells.find(k => k.id === a.inside);
    if (a.r.x0 < c.x0 + 5 || a.r.x1 > c.x1 - 5 || a.r.y0 < c.y0 + 4 || a.r.y1 > c.y1 - 4) errs.push(`overflow: ${a.s} in ${c.id}`);
  }
});
if (x > W - M + 26) errs.push(`legend too wide: ${x}`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="EV battery pack DFMEA">
<title>EV battery pack DFMEA</title>
<desc>AIAG-VDA design FMEA worksheet, steps 2 to 5: cell module and busbar joint, three failure modes, four causes, with prevention and detection controls, S/O/D ratings and Action Priority (two High, one Medium, one Low).</desc>
<g font-family="${FONT}">
${out.join('\n').replace('__H__', H)}
</g>
</svg>
`;
await writeFile(TARGET, svg);
if (PNG) await writeFile(PNG, new Resvg(svg, { font, fitTo: { mode: 'width', value: W * 2 } }).render().asPng());
console.log(`fmea: ${W}x${H}, ${texts.length} texts, 0 collisions`);
