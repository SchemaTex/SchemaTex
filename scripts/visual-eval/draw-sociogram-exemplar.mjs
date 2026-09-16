import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// ---- drawing kit: resvg-measured text, collision registry, geometry checks ----
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const fontOpt = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r2 = v => Math.round(v * 100) / 100;
const svgParts = [], TEXTS = [], LINES = [], CIRCLES = [], RECTS = [];
const mcache = new Map();
function measure(s, fs, weight = 400, anchor = 'start', style = 'normal', ls = 0) {
  const key = JSON.stringify([s, fs, weight, anchor, style, ls]);
  if (!mcache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" font-style="${style}" letter-spacing="${ls}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font: fontOpt }).innerBBox();
    if (!b) throw new Error(`cannot measure ${s}`);
    mcache.set(key, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128, w: b.width, h: b.height });
  }
  return mcache.get(key);
}
const add = s => svgParts.push(s);
function text(s, x, y, { fs = 13, weight = 400, fill = '#1f2937', anchor = 'start', style = 'normal', ls = 0, allow = [], id = s } = {}) {
  const m = measure(s, fs, weight, anchor, style, ls);
  const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 };
  TEXTS.push({ s: id, r, allow });
  add(`<text x="${r2(x)}" y="${r2(y)}" font-size="${fs}" font-weight="${weight}"${style !== 'normal' ? ` font-style="${style}"` : ''}${ls ? ` letter-spacing="${ls}"` : ''} text-anchor="${anchor}" fill="${fill}">${esc(s)}</text>`);
  return r;
}
// Place a text so its ink box is centred on (cx, cy).
function textCentered(s, cx, cy, o = {}) {
  const m = measure(s, o.fs ?? 13, o.weight ?? 400, 'middle', o.style ?? 'normal', o.ls ?? 0);
  return text(s, cx, cy - (m.y0 + m.y1) / 2, { ...o, anchor: 'middle' });
}
const lineReg = (pts, tag) => { LINES.push({ pts, tag }); return pts; };
const circleReg = (cx, cy, r, tag) => CIRCLES.push({ cx, cy, r, tag });
const rectReg = (x0, y0, x1, y1, tag) => RECTS.push({ x0, y0, x1, y1, tag });
const P = (x, y) => [x, y];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = a => Math.hypot(a[0], a[1]);
const unit = a => mul(a, 1 / len(a));
const dir = t => [Math.cos(t), Math.sin(t)];
const quadPts = (p0, c, p1, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]; });
const cubicPts = (p0, c1, c2, p1, n = 64) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k]); });
const pathD = pts => 'M ' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join(' L ');
function head(tip, from, { L = 10, Wd = 4, fill = '#1f2937', tag = 'head' } = {}) {
  const u = unit(sub(tip, from)), n = [-u[1], u[0]], b = sub(tip, mul(u, L));
  const a = addv(b, mul(n, Wd)), c = sub(b, mul(n, Wd));
  lineReg([a, tip, c, a], tag);
  add(`<path d="M ${r2(tip[0])} ${r2(tip[1])} L ${r2(a[0])} ${r2(a[1])} L ${r2(c[0])} ${r2(c[1])} Z" fill="${fill}"/>`);
  return b;
}
function segRect(a, b, r) { // Liang-Barsky
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - r.x0], [dx, r.x1 - a[0]], [-dy, a[1] - r.y0], [dy, r.y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return false; } else { const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
  }
  return true;
}
const rectsHit = (a, b, pad = 0) => a.x0 - pad < b.x1 && b.x0 - pad < a.x1 && a.y0 - pad < b.y1 && b.y0 - pad < a.y1;
const inflate = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
function segSeg(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function checkAll(W, H, { pad = 3, crossTags = null } = {}) {
  const errs = [];
  TEXTS.forEach((t, ti) => {
    if (t.r.x0 < 4 || t.r.y0 < 4 || t.r.x1 > W - 4 || t.r.y1 > H - 4) errs.push(`clipped: ${t.s}`);
    const R = inflate(t.r, pad);
    TEXTS.forEach((u, ui) => { if (ui > ti && rectsHit(t.r, u.r, pad)) errs.push(`text/text: ${t.s} | ${u.s}`); });
    for (const l of LINES) if (!t.allow.includes(l.tag)) for (let i = 1; i < l.pts.length; i++) if (segRect(l.pts[i - 1], l.pts[i], R)) { errs.push(`text/line: ${t.s} | ${l.tag}`); break; }
    for (const c of CIRCLES) if (!t.allow.includes(c.tag)) {
      const nx = Math.max(R.x0, Math.min(c.cx, R.x1)), ny = Math.max(R.y0, Math.min(c.cy, R.y1));
      if (Math.hypot(nx - c.cx, ny - c.cy) < c.r) errs.push(`text/circle: ${t.s} | ${c.tag}`);
    }
    for (const q of RECTS) if (!t.allow.includes(q.tag) && rectsHit(R, q)) errs.push(`text/rect: ${t.s} | ${q.tag}`);
  });
  if (crossTags) {
    const ls = LINES.filter(l => crossTags(l.tag));
    for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
      if (ls[i].tag === ls[j].tag) continue;
      const A = ls[i].pts, B = ls[j].pts; let hit = false;
      for (let a = 1; a < A.length && !hit; a++) for (let b = 1; b < B.length && !hit; b++) if (segSeg(A[a - 1], A[a], B[b - 1], B[b])) hit = true;
      if (hit) errs.push(`crossing: ${ls[i].tag} x ${ls[j].tag}`);
    }
  }
  if (errs.length) throw new Error('Geometry check failed:\n' + [...new Set(errs)].join('\n'));
}
async function finish({ dir: target, W, H, title, desc, dsl, notes, png }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" font-family="${FONT}">\n<title>${esc(title)}</title>\n<desc>${esc(desc)}</desc>\n<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n${svgParts.join('\n')}\n</svg>\n`;
  await mkdir(target, { recursive: true });
  await writeFile(new URL('ideal.svg', target), svg);
  await writeFile(new URL('source.sx', target), dsl);
  await writeFile(new URL('notes.md', target), notes);
  if (png) await writeFile(png, new Resvg(svg, { font: fontOpt, fitTo: { mode: 'zoom', value: 2 }, background: 'white' }).render().asPng());
  console.log('wrote', target.pathname, W, H);
}
// ---------------------------------------------------------------------------
/** Sociogram exemplar: Moreno classroom sociometry.
 *   node scripts/visual-eval/draw-sociogram-exemplar.mjs [preview.png]
 */
const C = { ink: '#1f2937', edge: '#334155', rej: '#b42318', muted: '#64748b', rule: '#e2e8f0',
  starFill: '#fbe7b5', starLine: '#a16207', negFill: '#eff6ff', negLine: '#2563eb', rejFill: '#fdecec', isoFill: '#f1f5f9', isoLine: '#64748b' };
const W = 1120, H = 720;
const TARGET = new URL('../../visual-eval/exemplars/sociogram/', import.meta.url);
const N = {
  ava: { p: P(430, 360), s: 'Ava' }, ben: { p: P(270, 215), s: 'Ben' }, chloe: { p: P(600, 205), s: 'Chloe' },
  diego: { p: P(190, 390), s: 'Diego' }, emma: { p: P(660, 400), s: 'Emma' }, hana: { p: P(575, 565), s: 'Hana' },
  finn: { p: P(335, 560), s: 'Finn' }, ivan: { p: P(160, 645), s: 'Ivan' }, jade: { p: P(790, 150), s: 'Jade' },
  gia: { p: P(790, 640), s: 'Gia' },
};
const E = [
  ['ava', 'ben', 'mutual'], ['ava', 'chloe', 'mutual'], ['ben', 'diego', 'mutual'], ['emma', 'hana', 'mutual'],
  ['diego', 'ava', 'choice'], ['emma', 'ava', 'choice'], ['finn', 'ava', 'choice'], ['hana', 'ava', 'choice'],
  ['chloe', 'emma', 'choice'], ['finn', 'hana', 'choice'], ['ivan', 'finn', 'choice'], ['jade', 'chloe', 'choice'],
  ['diego', 'ivan', 'reject'], ['hana', 'ivan', 'reject'],
];
// sociometric status, computed from the choices
for (const k in N) Object.assign(N[k], { inC: 0, outC: 0, rej: 0 });
for (const [a, b, t] of E) {
  if (t === 'reject') { N[b].rej++; continue; }
  N[b].inC++; N[a].outC++;
  if (t === 'mutual') { N[a].inC++; N[b].outC++; }
}
for (const k in N) {
  const n = N[k];
  n.r = Math.min(40, 14 + 4 * n.inC);
  n.status = n.inC >= 5 ? 'star' : n.rej >= 2 ? 'rejectee' : n.inC === 0 && n.outC === 0 ? 'isolate' : n.inC === 0 ? 'neglectee' : 'plain';
}
text('Year 5 seating choices', 48, 60, { fs: 24, weight: 700, fill: C.ink });
text('Each pupil named the classmates they would like to sit with, and anyone they would rather not sit with', 48, 86, { fs: 13.5, fill: C.muted });
const edgeSvg = [];
for (const [a, b, t] of E) {
  const A = N[a], B = N[b], u = unit(sub(B.p, A.p)), tag = `edge:${a}-${b}`;
  const GAP = 3;
  let s0 = addv(A.p, mul(u, A.r + GAP)), e0 = sub(B.p, mul(u, B.r + GAP));
  const col = t === 'reject' ? C.rej : C.edge;
  const L = 9, Wd = 3.6;
  const e1 = head(e0, s0, { L, Wd, fill: col, tag });
  if (t === 'mutual') s0 = head(s0, e0, { L, Wd, fill: col, tag });
  lineReg([s0, e1], tag);
  edgeSvg.push(`<line x1="${r2(s0[0])}" y1="${r2(s0[1])}" x2="${r2(e1[0])}" y2="${r2(e1[1])}" stroke="${col}" stroke-width="${t === 'mutual' ? 2.4 : 1.5}"${t === 'reject' ? ' stroke-dasharray="6 4"' : ''}/>`);
}
svgParts.push(...edgeSvg);
const nodeStyle = st => ({
  star: { fill: C.starFill, stroke: C.starLine, w: 2.4, dash: '' },
  neglectee: { fill: C.negFill, stroke: C.negLine, w: 1.8, dash: '4 3' },
  rejectee: { fill: C.rejFill, stroke: C.rej, w: 1.8, dash: '4 3' },
  isolate: { fill: C.isoFill, stroke: C.isoLine, w: 1.8, dash: '4 3' },
  plain: { fill: '#ffffff', stroke: C.ink, w: 1.8, dash: '' },
}[st]);
for (const [k, n] of Object.entries(N)) {
  const st = nodeStyle(n.status);
  circleReg(n.p[0], n.p[1], n.r + 2, `node:${k}`);
  add(`<circle cx="${n.p[0]}" cy="${n.p[1]}" r="${n.r}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="${st.w}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}/>`);
  if (n.inC >= 1) textCentered(String(n.inC), n.p[0], n.p[1], { fs: n.r >= 30 ? 16 : 12.5, weight: 700, fill: n.status === 'star' ? C.starLine : C.muted, allow: [`node:${k}`], id: `count ${k}` });
}
// names: try eight positions around each node, keep the first that is clear of every edge, node and name
const clear = r => {
  const R = inflate(r, 4);
  for (const l of LINES) for (let i = 1; i < l.pts.length; i++) if (segRect(l.pts[i - 1], l.pts[i], R)) return false;
  for (const c of CIRCLES) { const nx = Math.max(R.x0, Math.min(c.cx, R.x1)), ny = Math.max(R.y0, Math.min(c.cy, R.y1)); if (Math.hypot(nx - c.cx, ny - c.cy) < c.r) return false; }
  return !TEXTS.some(t => rectsHit(t.r, R));
};
const ANG = [90, 270, 0, 180, 45, 135, 315, 225].map(d => d * Math.PI / 180);
for (const [k, n] of Object.entries(N)) {
  const m = measure(n.s, 14, 600, 'middle');
  let done = false;
  for (const a of ANG) {
    const d = dir(a), off = n.r + 7 + Math.abs(d[0]) * m.w / 2 + Math.abs(d[1]) * m.h / 2;
    const c = addv(n.p, mul(d, off));
    const r = { x0: c[0] - m.w / 2, x1: c[0] + m.w / 2, y0: c[1] - m.h / 2, y1: c[1] + m.h / 2 };
    if (clear(r)) { textCentered(n.s, c[0], c[1], { fs: 14, weight: 600, fill: C.ink }); done = true; break; }
  }
  if (!done) throw new Error(`no clear label position for ${k}`);
}
// key panel
const KX = 880, KY = 150;
add(`<line x1="${KX - 28}" y1="${KY - 20}" x2="${KX - 28}" y2="${H - 50}" stroke="${C.rule}" stroke-width="1"/>`);
text('KEY', KX, KY, { fs: 11.5, weight: 700, fill: C.muted, ls: 1.2 });
let y = KY + 34;
const edgeKey = (label, t) => {
  const col = t === 'reject' ? C.rej : C.edge, x0 = KX, x1 = KX + 46;
  const e1 = head([x1, y], [x0, y], { L: 9, Wd: 3.6, fill: col, tag: 'key' });
  const s0 = t === 'mutual' ? head([x0, y], [x1, y], { L: 9, Wd: 3.6, fill: col, tag: 'key' }) : [x0, y];
  add(`<line x1="${s0[0]}" y1="${y}" x2="${e1[0]}" y2="${y}" stroke="${col}" stroke-width="${t === 'mutual' ? 2.4 : 1.5}"${t === 'reject' ? ' stroke-dasharray="6 4"' : ''}/>`);
  text(label, KX + 60, y + 4.5, { fs: 13, fill: C.ink }); y += 32;
};
edgeKey('chooses', 'choice'); edgeKey('mutual choice', 'mutual'); edgeKey('rejects', 'reject');
y += 10;
const nodeKey = (label, sub2, st, r = 12) => {
  const s = nodeStyle(st);
  add(`<circle cx="${KX + 23}" cy="${y}" r="${r}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.w}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`);
  text(label, KX + 60, y - 2, { fs: 13, weight: 600, fill: C.ink });
  text(sub2, KX + 60, y + 15, { fs: 12, fill: C.muted }); y += 50;
};
nodeKey('Star', 'chosen by five or more', 'star');
nodeKey('Neglectee', 'chooses, never chosen', 'neglectee');
nodeKey('Rejectee', 'rejected by two or more', 'rejectee');
nodeKey('Isolate', 'no choices either way', 'isolate');
text('Circle size and number:', KX, y + 4, { fs: 12, weight: 600, fill: C.ink });
text('choices received', KX, y + 21, { fs: 12, fill: C.muted });
checkAll(W, H, { crossTags: t => t.startsWith('edge:') });

const DSL = `sociogram "Year 5 seating choices"
  config: sizing = in-degree
  config: highlight = stars, isolates
  ava [label: "Ava"]
  ben [label: "Ben"]
  chloe [label: "Chloe"]
  diego [label: "Diego"]
  emma [label: "Emma"]
  finn [label: "Finn"]
  gia [label: "Gia"]
  hana [label: "Hana"]
  ivan [label: "Ivan"]
  jade [label: "Jade"]
  ava <-> ben
  ava <-> chloe
  ben <-> diego
  emma <-> hana
  diego -> ava
  emma -> ava
  finn -> ava
  hana -> ava
  chloe -> emma
  finn -> hana
  ivan -> finn
  jade -> chloe
  diego -x> ivan
  hana -x> ivan
`;
const NOTES = `A sociometric test in a class of ten: each pupil named the classmates they would like to sit with and anyone they would rather not. Ava is chosen by six classmates, four pairs choose each other, Jade chooses Chloe but nobody chooses her, Ivan is rejected by two classmates, and Gia neither chooses nor is chosen. The drawing follows Moreno's sociogram, *Who Shall Survive?* (1934), with the directed-graph conventions of Wasserman & Faust, *Social Network Analysis* (1994), ch. 5: people are circles, a choice is an arrow from chooser to chosen, a reciprocated choice is one line with a head at each end, a rejection is a dashed line, and sociometric status (star, neglectee, rejectee, isolate) is marked on the person.

Why it works as the exemplar for this type:

- Circle size grows with choices received, and the count is printed inside the larger circles, so the star is found before any arrow is read.
- The most-chosen person sits in the middle and the least-connected at the edge, so centrality on the page matches centrality in the group; the isolate stands alone in a corner.
- Names sit outside their circle, on whichever side is clear of every line, never on top of a node or an arrow.
- Arrowheads are small, solid and stop just short of the circle; a mutual choice is a heavier line with a head at both ends rather than two overlapping arrows.
- Only rejections are red, and they are also dashed, so negative ties survive black-and-white printing; status fills are pale and their dashed borders echo the dashed rejection line.
- A key down the right explains the three tie types and the four statuses; no edge carries a floating text label, and no lines cross.

Palette: ink #1f2937, choice line #334155, rejection red #b42318, star gold #fbe7b5 / #a16207, neglectee blue #eff6ff / #2563eb, rejectee pink #fdecec, isolate grey #f1f5f9 / #64748b, caption grey #64748b.
`;
await finish({ dir: TARGET, W, H, title: 'Year 5 seating choices', desc: 'Moreno sociogram of ten pupils: Ava is the star with six choices; mutual pairs Ava-Ben, Ava-Chloe, Ben-Diego, Emma-Hana; Jade is a neglectee, Ivan is rejected by Diego and Hana, Gia is an isolate.', dsl: DSL, notes: NOTES, png: process.argv[2] });
