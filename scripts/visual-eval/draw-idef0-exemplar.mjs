/**
 * Hand-authored IDEF0 (FIPS PUB 183) A0 decomposition exemplar.
 *   node scripts/visual-eval/draw-idef0-exemplar.mjs [preview.png]
 * Writes visual-eval/exemplars/idef0/ideal.svg only after checking that no text
 * touches another text, an arrow, a box or the frame, measured with resvg's own
 * text shaping, and that every arrow is orthogonal.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// ---------------------------------------------------------------- tokens
const C = { paper: '#FFFFFF', ink: '#0F172A', line: '#1E293B', muted: '#475569', faint: '#64748B', rule: '#94A3B8', box: '#F1F5F9' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 20, sub: 11, box: 13.5, num: 11, label: 12, code: 10.5, cellKey: 9.5, cell: 12.5 };
const SW = { frame: 1.5, box: 1.6, arrow: 1.4 };
const W = 1310, H = 880;
const F = { x0: 44, y0: 116, x1: 1266, y1: 790, tb: 842 };
const BW = 180, BH = 86, HEAD = 10, HOP = 6;
const TARGET = new URL('../../visual-eval/exemplars/idef0/ideal.svg', import.meta.url);
const PNG = process.argv[2];

// ---------------------------------------------------------------- kit
const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [], texts = [], segs = [];
const cache = new Map();
function measure(s, fs, weight, anchor) {
  const k = JSON.stringify([s, fs, weight, anchor]);
  if (!cache.has(k)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b) throw new Error(`cannot measure ${s}`);
    cache.set(k, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 });
  }
  return cache.get(k);
}
function text(s, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start', spacing } = {}) {
  const m = measure(s, fs, weight, anchor);
  const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1 + (spacing ? spacing * s.length : 0), y1: y + m.y1 };
  texts.push({ s, r });
  out.push(`<text x="${x}" y="${y}" font-size="${fs}"${weight !== 400 ? ` font-weight="${weight}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${spacing ? ` letter-spacing="${spacing}"` : ''} fill="${fill}">${esc(s)}</text>`);
  return r;
}
function segHitsRect([a, b], r, pad) {
  const x0 = r.x0 - pad, x1 = r.x1 + pad, y0 = r.y0 - pad, y1 = r.y1 + pad;
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
const rectSegs = (x0, y0, x1, y1) => segs.push([[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]);

// ---------------------------------------------------------------- page
out.push(`<rect width="${W}" height="${H}" fill="${C.paper}"/>`);
text('Fulfil customer order', 44, 50, { fs: FS.title, weight: 600 });
text('IDEF0 FUNCTION MODEL · A0 DECOMPOSITION · FIPS PUB 183', 44, 74, { fs: FS.sub, fill: C.faint });
out.push(`<rect x="${F.x0}" y="${F.y0}" width="${F.x1 - F.x0}" height="${F.tb - F.y0}" fill="none" stroke="${C.line}" stroke-width="${SW.frame}"/>`);
out.push(`<line x1="${F.x0}" y1="${F.y1}" x2="${F.x1}" y2="${F.y1}" stroke="${C.line}" stroke-width="${SW.frame}"/>`);
rectSegs(F.x0, F.y0, F.x1, F.tb); segs.push([[F.x0, F.y1], [F.x1, F.y1]]);
// title block: Node / Title / Number
const cells = [[F.x0, 250, 'NODE', 'A0'], [250, 1080, 'TITLE', 'Fulfil customer order'], [1080, F.x1, 'NUMBER', 'C-1']];
for (const [x0, x1, key, val] of cells) {
  if (x0 !== F.x0) { out.push(`<line x1="${x0}" y1="${F.y1}" x2="${x0}" y2="${F.tb}" stroke="${C.line}" stroke-width="${SW.frame}"/>`); segs.push([[x0, F.y1], [x0, F.tb]]); }
  text(key, x0 + 12, F.y1 + 18, { fs: FS.cellKey, weight: 600, fill: C.faint, spacing: 0.6 });
  text(val, x0 + 12, F.y1 + 38, { fs: FS.cell, weight: 600 });
}

// ---------------------------------------------------------------- boxes (staircase)
const B = {};
[['A1', 'Allocate stock', 200, 250], ['A2', 'Pick items', 440, 375], ['A3', 'Pack order', 680, 500], ['A4', 'Ship parcel', 920, 625]]
  .forEach(([id, name, x, y], i) => {
    B[id] = { x, y, cx: x + BW / 2, r: x + BW, b: y + BH };
    out.push(`<rect x="${x}" y="${y}" width="${BW}" height="${BH}" fill="${C.box}" stroke="${C.line}" stroke-width="${SW.box}"/>`);
    rectSegs(x, y, x + BW, y + BH);
    text(name, x + BW / 2, y + BH / 2 + 4, { fs: FS.box, weight: 600, anchor: 'middle' });
    text(String(i + 1), x + BW - 9, y + BH - 9, { fs: FS.num, weight: 600, fill: C.muted, anchor: 'end' });
  });

// ---------------------------------------------------------------- arrows
const hops = []; // [x, y] where a horizontal run bridges a vertical arrow
function arrow(pts) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    if (a[0] !== b[0] && a[1] !== b[1]) throw new Error(`non-orthogonal ${JSON.stringify(pts)}`);
    segs.push([a, b]);
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const on = a[1] === b[1] ? hops.filter(([hx, hy]) => hy === a[1] && hx > Math.min(a[0], b[0]) && hx < Math.max(a[0], b[0])) : [];
    const dir = Math.sign(b[0] - a[0]);
    on.sort((p, q) => dir * (p[0] - q[0]));
    for (const [hx] of on) d += ` H ${hx - dir * HOP} a ${HOP} ${HOP} 0 0 ${dir > 0 ? 1 : 0} ${dir * 2 * HOP} 0`;
    const last = i === pts.length - 1;
    const ex = last ? b[0] - Math.sign(b[0] - a[0]) * HEAD : b[0];
    const ey = last ? b[1] - Math.sign(b[1] - a[1]) * HEAD : b[1];
    d += a[1] === b[1] ? ` H ${ex}` : ` V ${ey}`;
  }
  out.push(`<path d="${d}" fill="none" stroke="${C.line}" stroke-width="${SW.arrow}" stroke-linejoin="round"/>`);
  const [a, b] = pts.slice(-2), ux = Math.sign(b[0] - a[0]), uy = Math.sign(b[1] - a[1]);
  const base = [b[0] - ux * HEAD, b[1] - uy * HEAD];
  out.push(`<polygon points="${b.join(',')} ${base[0] - uy * 4.2},${base[1] + ux * 4.2} ${base[0] + uy * 4.2},${base[1] - ux * 4.2}" fill="${C.line}"/>`);
}
const label = (s, x, y, anchor = 'start') => text(s, x, y, { fs: FS.label, anchor });
const code = (s, x, y, anchor = 'start') => text(s, x, y, { fs: FS.code, weight: 600, fill: C.faint, anchor });

// Inputs (left edge)
[['I1', 'Paid order', B.A1.y + 26], ['I2', 'Stock levels', B.A1.y + 60]].forEach(([c, s, y]) => {
  arrow([[F.x0, y], [B.A1.x, y]]);
  code(c, F.x0 + 10, y - 7); label(s, F.x0 + 34, y - 7);
});
// Controls (top edge) — the feedback into A1 bridges the A2 and A3 controls
const FB_Y = 205, FB_X = 910, FB_IN = B.A1.x + 136;
hops.push([B.A2.cx, FB_Y], [B.A3.cx, FB_Y]);
[['C1', 'Allocation rules', B.A1.x + 50, B.A1], ['C2', 'Pick route', B.A2.cx, B.A2], ['C3', 'Packaging standard', B.A3.cx, B.A3], ['C4', 'Carrier cut-off times', B.A4.cx, B.A4]]
  .forEach(([c, s, x, box]) => {
    arrow([[x, F.y0], [x, box.y]]);
    code(c, x + 8, F.y0 + 20); label(s, x + 8, F.y0 + 37);
  });
// Mechanisms (bottom edge, pointing up)
[['M1', 'Warehouse system', B.A1.cx, B.A1], ['M2', 'Pickers', B.A2.cx, B.A2], ['M3', 'Packing station', B.A3.cx, B.A3], ['M4', 'Parcel carrier', B.A4.cx, B.A4]]
  .forEach(([c, s, x, box]) => {
    arrow([[x, F.y1], [x, box.b]]);
    label(s, x + 8, F.y1 - 26); code(c, x + 8, F.y1 - 10);
  });
// Box-to-box flows down the staircase
const flow = (from, to, s, y1, y2, xv) => {
  arrow([[from.r, y1], [xv, y1], [xv, y2], [to.x, y2]]);
  label(s, xv + 8, to.y - 14);
};
flow(B.A1, B.A2, 'Pick list', B.A1.y + 43, B.A2.y + 43, B.A1.r + 30);
flow(B.A2, B.A3, 'Picked items', B.A2.y + 43, B.A3.y + 43, B.A2.r + 30);
flow(B.A3, B.A4, 'Packed order', B.A3.y + 55, B.A4.y + 43, B.A3.r + 30);
// Feedback: A3's short-pick report returns over the top as a control on A1
arrow([[B.A3.r, B.A3.y + 20], [FB_X, B.A3.y + 20], [FB_X, FB_Y], [FB_IN, FB_Y], [FB_IN, B.A1.y]]);
label('Short-pick report', B.A2.cx + 20, FB_Y - 8);
// Outputs (right edge)
[['O1', 'Shipped parcel', B.A4.y + 26], ['O2', 'Tracking number', B.A4.y + 60]].forEach(([c, s, y]) => {
  arrow([[B.A4.r, y], [F.x1, y]]);
  label(s, B.A4.r + 14, y - 7); code(c, F.x1 - 10, y - 7, 'end');
});

// ---------------------------------------------------------------- checks
const errs = [];
texts.forEach((t, i) => {
  if (t.r.x0 < 8 || t.r.y0 < 8 || t.r.x1 > W - 8 || t.r.y1 > H - 8) errs.push(`off canvas: ${t.s}`);
  texts.slice(i + 1).forEach((u) => {
    if (t.r.x0 < u.r.x1 + 3 && u.r.x0 < t.r.x1 + 3 && t.r.y0 < u.r.y1 + 3 && u.r.y0 < t.r.y1 + 3) errs.push(`text/text: ${t.s} | ${u.s}`);
  });
  for (const s of segs) if (segHitsRect(s, t.r, 3)) { errs.push(`text/line: ${t.s} @ ${JSON.stringify(s)}`); break; }
});
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">
<title>Fulfil customer order — A0</title>
<desc>IDEF0 A0 decomposition diagram in the FIPS PUB 183 diagram form. Four function boxes step down a diagonal: 1 Allocate stock, 2 Pick items, 3 Pack order, 4 Ship parcel. Inputs I1 Paid order and I2 Stock levels enter box 1 from the left. Controls enter from the top: C1 Allocation rules, C2 Pick route, C3 Packaging standard, C4 Carrier cut-off times. Mechanisms enter from the bottom: M1 Warehouse system, M2 Pickers, M3 Packing station, M4 Parcel carrier. Pick list, Picked items and Packed order flow from box to box. Box 3's Short-pick report returns over the top as a control on box 1, bridging the controls it crosses. Outputs O1 Shipped parcel and O2 Tracking number leave box 4 on the right. Title block: node A0, title Fulfil customer order, number C-1.</desc>
${out.join('\n')}
</svg>
`;
await writeFile(TARGET, svg);
if (PNG) await writeFile(PNG, new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
console.log('ok', texts.length, 'texts');
