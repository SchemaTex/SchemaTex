/**
 * Hand-authored stage plot exemplar (plan view + input list + monitor outputs).
 *   node scripts/visual-eval/draw-stageplot-exemplar.mjs [png-path]
 * Writes visual-eval/exemplars/stageplot/ideal.svg. Plan geometry is authored in feet on
 * the same grid as source.sx (24 px per ft). Text bounds come from resvg shaping with
 * Helvetica Neue; every text box is checked against other text, every shape and the canvas
 * edge before writing.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = {
  ink: '#1F2933', muted: '#5F6B76', rule: '#D5DAE0', paper: '#FFFFFF', deck: '#F3F4F6',
  riser: '#E4E7EB', input: '#1D4ED8', mixFill: '#FCD9A8', mixStroke: '#B45309', head: '#2B3440', zebra: '#F7F8FA',
};
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 22, subtitle: 13, section: 13, label: 12, small: 11 };
const PNG = process.argv[2];
const OUT = new URL('../../visual-eval/exemplars/stageplot/ideal.svg', import.meta.url);
const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cache = new Map();
function measure(s, fs, weight = 400, anchor = 'start', ls = 0) {
  const key = JSON.stringify([s, fs, weight, anchor, ls]);
  if (!cache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b) throw new Error(`Cannot measure ${s}`);
    cache.set(key, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 });
  }
  return cache.get(key);
}

const W = 1400;
const els = [], texts = [], shapes = [];
function text(s, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start', owner, ls = 0 } = {}) {
  const m = measure(s, fs, weight, anchor, ls);
  const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1, s, owner };
  texts.push(r);
  els.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}"${ls ? ` letter-spacing="${ls}"` : ''}>${esc(s)}</text>`);
  return r;
}
function shape(svg, x0, y0, x1, y1, owner, obstacle = true) {
  if (obstacle) shapes.push({ x0, y0, x1, y1, owner });
  els.push(svg);
}
const rect = (x, y, w, h, { fill = C.paper, stroke = C.ink, sw = 1.5, rx = 0, owner, obstacle = true, dash } = {}) =>
  shape(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`, x - sw / 2, y - sw / 2, x + w + sw / 2, y + h + sw / 2, owner, obstacle);
const line = (x1, y1, x2, y2, { stroke = C.ink, sw = 1, owner, obstacle = true } = {}) =>
  shape(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`, Math.min(x1, x2) - sw / 2, Math.min(y1, y2) - sw / 2, Math.max(x1, x2) + sw / 2, Math.max(y1, y2) + sw / 2, owner, obstacle);
const circle = (cx, cy, r, { fill = C.paper, stroke = C.ink, sw = 1.5, owner, obstacle = true } = {}) =>
  shape(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`, cx - r - sw / 2, cy - r - sw / 2, cx + r + sw / 2, cy + r + sw / 2, owner, obstacle);

// ---- header -------------------------------------------------------------------------
text('Full Band — Six Monitor Mixes', 40, 50, { fs: FS.title, weight: 600 });
text('Stage plot and input list · Grand Hall · August 21, 2026', 40, 74, { fs: FS.subtitle, fill: C.muted });
text('Rev 3 · July 27, 2026', W - 40, 50, { fs: FS.subtitle, weight: 600, anchor: 'end' });
text('Morgan Lee · production@example.com · +1 310 555 0142', W - 40, 74, { fs: FS.subtitle, fill: C.muted, anchor: 'end' });
line(40, 92, W - 40, 92, { stroke: C.rule, obstacle: false });

// ---- plan ---------------------------------------------------------------------------
const PX = 24, SW_FT = 40, SD_FT = 24;
const SX = (W - SW_FT * PX) / 2, SY = 176;
const X = ft => SX + ft * PX, Y = ft => SY + ft * PX;
const SR = SX + SW_FT * PX, SB = SY + SD_FT * PX;

text('UPSTAGE', W / 2, 118, { fs: FS.small, weight: 600, fill: C.muted, anchor: 'middle', ls: 1.5 });
// Width dimension, figure in a gap on the line.
const dimY = 146;
const wf = text('40 ft', W / 2, dimY + 4, { fs: FS.small, fill: C.muted, anchor: 'middle' });
line(SX, dimY, wf.x0 - 6, dimY, { stroke: C.muted });
line(wf.x1 + 6, dimY, SR, dimY, { stroke: C.muted });
for (const x of [SX, SR]) { line(x, dimY - 6, x, dimY + 6, { stroke: C.muted }); line(x, dimY + 10, x, SY - 6, { stroke: C.rule }); }
const dimX = SR + 26;
const df = text('24 ft', dimX, (SY + SB) / 2 + 4, { fs: FS.small, fill: C.muted, anchor: 'middle' });
line(dimX, SY, dimX, df.y0 - 6, { stroke: C.muted });
line(dimX, df.y1 + 6, dimX, SB, { stroke: C.muted });
for (const y of [SY, SB]) { line(dimX - 6, y, dimX + 6, y, { stroke: C.muted }); line(SR + 6, y, dimX - 10, y, { stroke: C.rule }); }

text('STAGE RIGHT', (40 + SX - 20) / 2, (SY + SB) / 2 - 4, { fs: FS.section, weight: 600, anchor: 'middle', ls: 1 });
text("performer's right", (40 + SX - 20) / 2, (SY + SB) / 2 + 14, { fs: FS.small, fill: C.muted, anchor: 'middle' });
text('STAGE LEFT', (dimX + 30 + W - 40) / 2, (SY + SB) / 2 - 4, { fs: FS.section, weight: 600, anchor: 'middle', ls: 1 });
text("performer's left", (dimX + 30 + W - 40) / 2, (SY + SB) / 2 + 14, { fs: FS.small, fill: C.muted, anchor: 'middle' });

rect(SX, SY, SW_FT * PX, SD_FT * PX, { fill: C.deck, stroke: C.ink, sw: 2.5, obstacle: false });
text('DOWNSTAGE', W / 2, SB + 22, { fs: FS.small, weight: 600, fill: C.muted, anchor: 'middle', ls: 1.5 });
rect(SX, SB + 34, SW_FT * PX, 28, { fill: '#E9ECEF', stroke: 'none', sw: 0, rx: 3, owner: 'aud' });
text('AUDIENCE', W / 2, SB + 52, { fs: FS.small, weight: 600, anchor: 'middle', ls: 3, owner: 'aud' });

// Symbols.
const badge = (ch, xft, yft) => {
  const cx = X(xft), cy = Y(yft), own = `ch${ch}`;
  circle(cx, cy, 11, { fill: C.input, stroke: C.paper, sw: 1.5, owner: own });
  text(String(ch), cx, cy + 4, { fs: FS.small, weight: 700, fill: C.paper, anchor: 'middle', owner: own });
};
const wedge = (mix, xft, yft, dest) => {
  const cx = X(xft), cy = Y(yft), own = `mix${mix}`, w = 32, h = 15;
  shape(`<path d="M${cx - w} ${cy + h}L${cx + w} ${cy + h}L${cx + w - 12} ${cy - h}L${cx - w + 12} ${cy - h}Z" fill="${C.mixFill}" stroke="${C.mixStroke}" stroke-width="1.5"/>`, cx - w, cy - h, cx + w, cy + h, own);
  text(`MIX ${mix}`, cx, cy + 5, { fs: FS.small, weight: 700, anchor: 'middle', owner: own });
  text(dest, cx, cy + h + 16, { fs: FS.label, anchor: 'middle' });
};
const box = (xft, yft, wft, hft, label, own, opts = {}) => {
  rect(X(xft), Y(yft), wft * PX, hft * PX, { owner: own, rx: 2, ...opts });
  if (label) text(label, X(xft + wft / 2), Y(yft + hft / 2) + 4, { fs: opts.fs ?? FS.label, weight: 600, anchor: 'middle', owner: own });
};
const mic = (xft, yft, own) => circle(X(xft), Y(yft), 4.5, { fill: C.ink, stroke: C.ink, sw: 1, owner: own });
const power = (xft, yft, label, anchor) => {
  const cx = X(xft), cy = Y(yft), own = `pw${label}`;
  circle(cx, cy, 12, { fill: C.paper, stroke: C.ink, sw: 1.5, owner: own });
  shape(`<path d="M${cx + 2} ${cy - 8}L${cx - 5} ${cy + 1}L${cx} ${cy + 1}L${cx - 2} ${cy + 8}L${cx + 5} ${cy - 1}L${cx} ${cy - 1}Z" fill="${C.ink}"/>`, cx - 5, cy - 8, cx + 5, cy + 8, own);
  const tx = anchor === 'end' ? cx - 20 : cx + 20;
  text(label, tx, cy - 2, { fs: FS.label, weight: 600, anchor, owner: own });
  text('120 V / 20 A', tx, cy + 13, { fs: FS.small, fill: C.muted, anchor, owner: own });
};

// Drum riser and kit (drummer faces the audience; throne upstage of the kick).
rect(X(14), Y(1), 12 * PX, 8 * PX, { fill: C.riser, stroke: C.muted, sw: 1.25, obstacle: false });
text('Drums · 8 in riser', X(14) + 10, Y(9) - 10, { fs: FS.small, weight: 600, fill: C.muted });
circle(X(18.6), Y(3.9), 16, { fill: 'none', stroke: '#8A949E', sw: 1, owner: 'kit' });   // crash
circle(X(22.9), Y(4.1), 19, { fill: 'none', stroke: '#8A949E', sw: 1, owner: 'kit' });   // ride
circle(X(20.2), Y(3.1), 9, { fill: '#8A949E', stroke: C.muted, sw: 1, owner: 'kit' });   // throne
circle(X(20.2), Y(6.2), 25, { owner: 'kit' });                                         // kick
circle(X(18.0), Y(5.6), 15, { owner: 'kit' });                                         // snare
circle(X(16.9), Y(4.4), 13, { owner: 'kit' });                                         // hi-hat
circle(X(21.4), Y(4.8), 12, { owner: 'kit' });                                         // rack tom
circle(X(23.1), Y(6.4), 19, { owner: 'kit' });                                         // floor tom
badge(1, 20.2, 8.0);
badge(2, 17.2, 6.9);
badge(3, 15.2, 4.4);
badge(4, 21.6, 3.5);
badge(5, 24.8, 7.4);
badge(6, 16.2, 2.0);
badge(7, 24.6, 2.0);
wedge(6, 20.2, 10.4, 'Drums');

// Guitars, bass, keys.
box(3.5, 4, 3, 1.6, 'Guitar L', 'gl');
mic(5, 6.0, 'gl-m'); badge(9, 6.0, 6.3);
power(1.3, 1.5, 'Circuit A', 'start');
box(33.5, 4, 3, 1.6, 'Guitar R', 'gr');
mic(35, 6.0, 'gr-m'); badge(10, 36.0, 6.3);
power(38.7, 1.5, 'Circuit B', 'end');
box(27.8, 2.2, 3, 2.4, 'Bass', 'bass');
box(28.6, 5.8, 1.4, 0.9, 'DI', 'bdi', { fs: FS.small });
badge(8, 31.0, 6.25);
box(1.5, 11, 5, 1.3, 'Keys', 'keys');
box(7.6, 10.7, 1.4, 0.9, 'DI', 'kdl', { fs: FS.small });
badge(11, 10.0, 11.15);
box(7.6, 12.1, 1.4, 0.9, 'DI', 'kdr', { fs: FS.small });
badge(12, 10.0, 12.55);
wedge(1, 4, 15.2, 'Keys');

// Bass IEM and stage box.
rect(X(28.3), Y(11.6), 1.6 * PX, 1 * PX, { fill: C.mixFill, stroke: C.mixStroke, sw: 1.5, rx: 3, owner: 'iem' });
text('IEM', X(29.1), Y(12.1) + 4, { fs: FS.small, weight: 700, anchor: 'middle', owner: 'iem' });
text('MIX 4 · Bass IEM', X(29.1), Y(12.6) + 18, { fs: FS.label, anchor: 'middle' });
rect(X(36.6), Y(10.6), 2 * PX, 1.4 * PX, { owner: 'snake', rx: 2 });
for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) circle(X(36.6) + 9 + i * 10, Y(10.6) + 11 + j * 12, 2.2, { fill: C.ink, stroke: C.ink, sw: 0, owner: 'snake' });
text('Stage box', X(37.6), Y(12) + 18, { fs: FS.label, anchor: 'middle' });

// Vocals: mic on boom, channel badge, performer, wedge downstage.
for (const [ch, x, y, who, role, mix, mx, my] of [[13, 9, 17, 'Jon', 'guitar / vocal', 2, 9, 20.4], [14, 20, 17.6, 'Maya', 'lead vocal', 3, 20, 21], [15, 31, 17, 'Rae', 'guitar / vocal', 5, 31, 20.4]]) {
  const own = `v${ch}`;
  line(X(x) - 20, Y(y) - 12, X(x), Y(y), { stroke: C.muted, sw: 1.5, owner: own });
  circle(X(x) - 20, Y(y) - 12, 3, { fill: C.paper, stroke: C.muted, sw: 1.5, owner: own });
  mic(x, y, own);
  badge(ch, x + 0.75, y);
  text(`${who} · ${role}`, X(x) + 32, Y(y) + 4, { fs: FS.label, weight: 600 });
  wedge(mix, mx, my, mix === 2 ? 'Guitar L' : mix === 3 ? 'Lead' : 'Guitar R');
}

// ---- legend -------------------------------------------------------------------------
let ly = SB + 96, lx = 40;
circle(lx + 11, ly - 4, 11, { fill: C.input, stroke: C.paper, owner: 'lg' });
text('5', lx + 11, ly, { fs: FS.small, weight: 700, fill: C.paper, anchor: 'middle', owner: 'lg' });
lx = text('Input channel, see input list', lx + 30, ly, { fill: C.muted }).x1 + 30;
shape(`<path d="M${lx} ${ly + 8}L${lx + 44} ${ly + 8}L${lx + 36} ${ly - 14}L${lx + 8} ${ly - 14}Z" fill="${C.mixFill}" stroke="${C.mixStroke}" stroke-width="1.5"/>`, lx, ly - 14, lx + 44, ly + 8, 'lg');
lx = text('Monitor wedge and mix number', lx + 54, ly, { fill: C.muted }).x1 + 30;
circle(lx + 5, ly - 4, 4.5, { fill: C.ink, stroke: C.ink, sw: 1, owner: 'lg' });
lx = text('Microphone', lx + 18, ly, { fill: C.muted }).x1 + 30;
rect(lx, ly - 13, 34, 20, { owner: 'lg2', rx: 2 });
text('DI', lx + 17, ly + 1, { fs: FS.small, weight: 600, anchor: 'middle', owner: 'lg2' });
lx = text('Direct box', lx + 44, ly, { fill: C.muted }).x1 + 30;
circle(lx + 12, ly - 4, 12, { owner: 'lg3' });
shape(`<path d="M${lx + 14} ${ly - 12}L${lx + 7} ${ly - 3}L${lx + 12} ${ly - 3}L${lx + 10} ${ly + 4}L${lx + 17} ${ly - 5}L${lx + 12} ${ly - 5}Z" fill="${C.ink}"/>`, lx, ly - 16, lx + 24, ly + 8, 'lg3');
text('Power drop', lx + 32, ly, { fill: C.muted });
text('Positions: US / MS / DS (up, mid, downstage) + R / C / L, from the performer', W - 40, ly, { fill: C.muted, anchor: 'end' });

// ---- tables -------------------------------------------------------------------------
const RH = 26;
function table(x, y, title, cols, rows) {
  text(title, x, y, { fs: FS.section, weight: 600 });
  const top = y + 12, total = cols.reduce((a, c) => a + c.w, 0);
  rect(x, top, total, RH, { fill: C.head, stroke: 'none', sw: 0, owner: `th${title}` });
  let cx = x;
  for (const c of cols) { text(c.h, c.right ? cx + c.w - 10 : cx + 10, top + 17, { fs: FS.small, weight: 600, fill: C.paper, anchor: c.right ? 'end' : 'start', owner: `th${title}`, ls: 0.5 }); cx += c.w; }
  rows.forEach((r, i) => {
    const ry = top + RH * (i + 1);
    if (i % 2) rect(x, ry, total, RH, { fill: C.zebra, stroke: 'none', sw: 0, obstacle: false });
    let cx2 = x;
    cols.forEach((c, k) => {
      const v = r[k];
      if (k === 0) {
        text(String(v), cx2 + 10, ry + 17, { weight: 700, fill: c.color ?? C.ink });
      } else if (v !== '') text(String(v), c.right ? cx2 + c.w - 10 : cx2 + 10, ry + 17, { fill: C.ink, weight: v === 'YES' ? 700 : 400, anchor: c.right ? 'end' : 'start' });
      cx2 += c.w;
    });
  });
  const bottom = top + RH * (rows.length + 1);
  line(x, bottom, x + total, bottom, { stroke: C.rule, obstacle: false });
  return bottom;
}
const pos = (xft, yft) => `${yft < 8 ? 'US' : yft < 16 ? 'MS' : 'DS'}${xft < 40 / 3 ? 'R' : xft > 80 / 3 ? 'L' : 'C'}`;
const inputs = [
  [1, 'Kick', 'Shure Beta 52A', 'short boom', 'no', 20, 7], [2, 'Snare top', 'Shure SM57', 'short boom', 'no', 18, 6],
  [3, 'Hi-hat', 'Shure SM81', 'boom', 'YES', 16, 5], [4, 'Rack tom', 'Sennheiser e604', 'clip', 'no', 21, 4],
  [5, 'Floor tom', 'Sennheiser e604', 'clip', 'no', 24, 6], [6, 'Overhead L', 'Shure KSM137', 'boom', 'YES', 16, 2],
  [7, 'Overhead R', 'Shure KSM137', 'boom', 'YES', 24, 2], [8, 'Bass DI', 'Radial J48', '—', 'YES', 29, 6],
  [9, 'Guitar L', 'Sennheiser e906', 'short boom', 'no', 5, 6], [10, 'Guitar R', 'Sennheiser e906', 'short boom', 'no', 35, 6],
  [11, 'Keys L', 'Radial ProD2', '—', 'no', 8, 11], [12, 'Keys R', 'Radial ProD2', '—', 'no', 8, 13],
  [13, 'Jon — guitar / vocal', 'Shure Beta 58A', 'boom', 'no', 9, 17], [14, 'Maya — lead vocal', 'Shure Beta 58A', 'boom', 'no', 20, 18],
  [15, 'Rae — guitar / vocal', 'Shure Beta 58A', 'boom', 'no', 31, 17],
].map(([ch, src, m, st, p, x, y]) => [ch, src, m, pos(x, y), st, p]);
const tTop = ly + 52;
const b1 = table(40, tTop, 'Input list', [
  { h: 'CH', w: 52, color: C.input }, { h: 'SOURCE', w: 200 }, { h: 'MIC / DI', w: 160 }, { h: 'POS', w: 64 }, { h: 'STAND', w: 110 }, { h: '48V', w: 60 },
], inputs);
const mixes = [
  [1, 'Keys', 'Wedge', pos(4, 15), ''], [2, 'Jon, guitar L', 'Wedge', pos(9, 20), ''], [3, 'Maya, lead', 'Wedge', pos(20, 21), ''],
  [4, 'Bass', 'IEM', pos(29, 12), 'Artist provides receiver'], [5, 'Rae, guitar R', 'Wedge', pos(31, 20), ''], [6, 'Drums', 'Wedge', pos(20, 10), 'Drum fill'],
];
const mx = 40 + 646 + 48;
const b2 = table(mx, tTop, 'Monitor outputs', [
  { h: 'MIX', w: 56, color: C.mixStroke }, { h: 'DESTINATION', w: 150 }, { h: 'TYPE', w: 70 }, { h: 'POS', w: 60 }, { h: 'NOTES', w: W - 40 - mx - 336 },
], mixes);
text('Power', mx, b2 + 40, { fs: FS.section, weight: 600 });
text('Circuit A · 120 V / 20 A · USR, beside guitar L', mx, b2 + 64);
text('Circuit B · 120 V / 20 A · USL, beside guitar R', mx, b2 + 86);
const H = Math.max(b1, b2 + 86) + 40;

// ---- checks -------------------------------------------------------------------------
const errs = [];
const hit = (a, b, p) => a.x0 < b.x1 + p && a.x1 + p > b.x0 && a.y0 < b.y1 + p && a.y1 + p > b.y0;
texts.forEach((t, i) => {
  if (t.x0 < 8 || t.y0 < 8 || t.x1 > W - 8 || t.y1 > H - 8) errs.push(`off canvas: ${t.s}`);
  texts.slice(i + 1).forEach(u => { if (hit(t, u, 2)) errs.push(`text/text: ${t.s} | ${u.s}`); });
  shapes.forEach(s => { if (!(s.owner !== undefined && s.owner === t.owner) && hit(t, s, 2)) errs.push(`text/shape: ${t.s} (${s.owner ?? '-'})`); });
});
// Symbols of different items must not touch either.
shapes.forEach((a, i) => shapes.slice(i + 1).forEach(b => {
  if (a.owner && b.owner && a.owner !== b.owner && !a.owner.startsWith('lg') && !(a.owner === 'kit' && b.owner === 'kit') && hit(a, b, 1)) {
    if (!(a.owner === 'kit' || b.owner === 'kit')) errs.push(`shape/shape: ${a.owner} | ${b.owner}`);
  }
}));
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">\n<title>Full Band — Six Monitor Mixes</title>\n<desc>Stage plot in plan view, upstage at top and audience at bottom, with fifteen numbered inputs, six monitor mixes, two power drops, and the input list and monitor output table.</desc>\n<rect width="${W}" height="${H}" fill="${C.paper}"/>\n${els.join('\n')}\n</svg>\n`;
await writeFile(OUT, svg);
if (PNG) await writeFile(PNG, new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
console.log('stageplot: ok', W, H);
