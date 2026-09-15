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
/** Markov chain exemplar: customer lifecycle, textbook state-transition drawing.
 *   node scripts/visual-eval/draw-markov-exemplar.mjs [preview.png]
 */
const C = { ink: '#1f2937', arc: '#475569', prob: '#1e40af', muted: '#64748b', rule: '#e2e8f0', absorb: '#f1f5f9' };
const W = 900, H = 635, R = 44, GAP = 2;
const TARGET = new URL('../../visual-eval/exemplars/markov/', import.meta.url);
const S = {
  Prospect: { c: P(190, 225), label: 'Prospect' },
  Active: { c: P(450, 225), label: 'Active' },
  AtRisk: { c: P(710, 225), label: 'At risk' },
  Churned: { c: P(580, 445), label: 'Churned', absorbing: true },
};
const EDGES = [
  ['Prospect', 'Prospect', '0.40', { loop: -Math.PI / 2 }],
  ['Prospect', 'Active', '0.60', { bend: 0, side: -1 }],
  ['Active', 'Active', '0.75', { loop: -Math.PI / 2 }],
  ['Active', 'AtRisk', '0.15', { bend: -30 }],
  ['Active', 'Churned', '0.10', { bend: 0, side: -1 }],
  ['AtRisk', 'Active', '0.35', { bend: -30 }],
  ['AtRisk', 'AtRisk', '0.35', { loop: -Math.PI / 2 }],
  ['AtRisk', 'Churned', '0.30', { bend: 0, side: 1 }],
  ['Churned', 'Churned', '1.0', { loop: Math.PI / 2 }],
];
const LFS = 14;
function probLabel(s, anchorPt, nrm, tag) {
  const m = measure(s, LFS, 600, 'middle');
  const off = 7 + Math.abs(nrm[0]) * m.w / 2 + Math.abs(nrm[1]) * m.h / 2;
  const p = addv(anchorPt, mul(nrm, off));
  textCentered(s, p[0], p[1], { fs: LFS, weight: 600, fill: C.prob });
}
const arcSvg = [];
for (const [a, b, p, o] of EDGES) {
  const A = S[a].c, B = S[b].c, tag = `${a}->${b}`;
  if (o.loop !== undefined) {
    const t = o.loop, spread = 0.42, reach = 64;
    const p0 = addv(A, mul(dir(t - spread), R)), tip = addv(A, mul(dir(t + spread), R + GAP));
    const c1 = addv(A, mul(dir(t - spread - 0.1), R + reach)), c2 = addv(A, mul(dir(t + spread + 0.1), R + reach));
    const pts = cubicPts(p0, c1, c2, tip);
    const base = head(tip, c2, { fill: C.arc, tag });
    lineReg(pts, tag);
    arcSvg.push(`<path d="M ${r2(p0[0])} ${r2(p0[1])} C ${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(base[0])} ${r2(base[1])}" fill="none" stroke="${C.arc}" stroke-width="1.6"/>`);
    const apex = pts[32];
    probLabel(p, apex, dir(t), tag);
    continue;
  }
  const d = unit(sub(B, A)), n = [-d[1], d[0]], mid = mul(addv(A, B), 0.5);
  const ctrl = addv(mid, mul(n, 2 * o.bend));
  const s0 = addv(A, mul(unit(sub(ctrl, A)), R)), tip = addv(B, mul(unit(sub(ctrl, B)), R + GAP));
  const base = head(tip, ctrl, { fill: C.arc, tag });
  const pts = quadPts(s0, ctrl, base);
  lineReg(pts, tag);
  arcSvg.push(`<path d="M ${r2(s0[0])} ${r2(s0[1])} Q ${r2(ctrl[0])} ${r2(ctrl[1])} ${r2(base[0])} ${r2(base[1])}" fill="none" stroke="${C.arc}" stroke-width="1.6"/>`);
  const m = quadPts(s0, ctrl, tip, 2)[1];
  const side = o.bend ? Math.sign(o.bend) : o.side;
  probLabel(p, m, mul(n, side), tag);
}
// Title
text('Customer lifecycle', 48, 60, { fs: 24, weight: 700, fill: C.ink });
text('Monthly transitions of a subscription customer · outgoing probabilities of each state sum to 1', 48, 86, { fs: 13.5, fill: C.muted });
svgParts.push(...arcSvg);
for (const [k, s] of Object.entries(S)) {
  const [x, y] = s.c;
  circleReg(x, y, R + 1, k);
  add(`<circle cx="${x}" cy="${y}" r="${R}" fill="${s.absorbing ? C.absorb : '#ffffff'}" stroke="${C.ink}" stroke-width="2"/>`);
  if (s.absorbing) add(`<circle cx="${x}" cy="${y}" r="${R - 6}" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`);
  textCentered(s.label, x, y, { fs: 15, weight: 600, fill: C.ink, allow: [k] });
}
// Legend
const LY = 593;
add(`<line x1="48" y1="${LY - 34}" x2="${W - 48}" y2="${LY - 34}" stroke="${C.rule}" stroke-width="1"/>`);
add(`<circle cx="62" cy="${LY}" r="13" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>`);
text('Transient state', 84, LY + 4.5, { fs: 12.5, fill: C.ink });
add(`<circle cx="226" cy="${LY}" r="13" fill="${C.absorb}" stroke="${C.ink}" stroke-width="1.6"/><circle cx="226" cy="${LY}" r="9" fill="none" stroke="${C.ink}" stroke-width="1.1"/>`);
text('Absorbing state (never left)', 248, LY + 4.5, { fs: 12.5, fill: C.ink });
add(`<line x1="450" y1="${LY}" x2="482" y2="${LY}" stroke="${C.arc}" stroke-width="1.6"/><path d="M 492 ${LY} L 482 ${LY - 4} L 482 ${LY + 4} Z" fill="${C.arc}"/>`);
textCentered('0.15', 471, LY - 12, { fs: 12, weight: 600, fill: C.prob });
text('One-step transition probability', 502, LY + 4.5, { fs: 12.5, fill: C.ink });
checkAll(W, H, { crossTags: t => t.includes('->') });

const DSL = `markov "Customer lifecycle"
  analysis: stationary, classify
  state Prospect
  state Active
  state AtRisk "At risk"
  state Churned absorbing
  Prospect -> Prospect : 0.40
  Prospect -> Active : 0.60
  Active -> Active : 0.75
  Active -> AtRisk : 0.15
  Active -> Churned : 0.10
  AtRisk -> Active : 0.35
  AtRisk -> AtRisk : 0.35
  AtRisk -> Churned : 0.30
  Churned -> Churned : 1.0
`;
const NOTES = `A four-state discrete-time Markov chain for a subscription customer, month to month: a Prospect converts to Active, an Active customer can slip to At risk, an At-risk customer can be won back, and either of the last two can churn. Churned is absorbing. The drawing follows the textbook state-transition convention of Norris, *Markov Chains* (1997), and Grinstead & Snell, *Introduction to Probability*, ch. 11: states are circles, every one-step transition with non-zero probability is a directed arc labelled with that probability, a state's own probability of staying put is a self-loop, and an absorbing state is drawn with a double ring.

Why it works as the exemplar for this type:

- Each probability sits at the midpoint of its own arc, pushed a fixed small distance out along the arc's normal on the side the curve bows toward, so a number can never be read as belonging to a neighbouring arc.
- A pair of opposite transitions between the same two states (Active and At risk) is drawn as two arcs bowing to opposite sides, never as one double-headed line, because the two directions carry different probabilities.
- Self-loops leave and re-enter the circle on the side facing open space, and their probability sits just beyond the loop's apex.
- The absorbing state is the only double-ringed, lightly filled circle and carries only its 1.0 self-loop; every state's outgoing numbers visibly sum to 1.
- Arcs are one weight and one slate colour with small solid arrowheads that touch the circle; blue is kept for the probabilities alone, so the numbers read first.
- A single legend row explains the two state kinds and the arc label, and nothing crosses.

Palette: state ink #1f2937, arc slate #475569, probability blue #1e40af, absorbing fill #f1f5f9, caption grey #64748b, rule #e2e8f0.
`;
await finish({ dir: TARGET, W, H, title: 'Customer lifecycle', desc: 'Markov chain with states Prospect, Active, At risk and absorbing Churned; transition probabilities on every arc, each state\'s outgoing probabilities summing to 1.', dsl: DSL, notes: NOTES, png: process.argv[2] });
