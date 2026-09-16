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
/** Causal loop diagram exemplar (Sterman 2000 notation).
 *   node scripts/visual-eval/draw-causalloop-exemplar.mjs [preview.png]
 */
const C = { ink: '#16202b', link: '#2b3440', muted: '#63707f', rule: '#e2e8f0', R: '#b4462a', B: '#1f6f8b' };
const W = 1000, H = 760;
const TARGET = new URL('../../visual-eval/exemplars/causalloop/', import.meta.url);
const O = P(505, 390);
const VFS = 15;
const V = {
  active: { p: P(505, 150), s: 'Active customers' },
  workload: { p: P(810, 260), s: 'Support workload' },
  response: { p: P(820, 520), s: 'Response time' },
  satisfaction: { p: P(540, 640), s: 'Customer satisfaction' },
  referrals: { p: P(210, 520), s: 'Customer referrals' },
  newc: { p: P(200, 260), s: 'New customers' },
};
const LINKS = [
  ['active', 'workload', '+', { bow: 50 }],
  ['workload', 'response', '+', { bow: 50 }],
  ['response', 'satisfaction', '−', { bow: 50, delay: true }],
  ['satisfaction', 'referrals', '+', { bow: 50 }],
  ['referrals', 'newc', '+', { bow: 50 }],
  ['newc', 'active', '+', { bow: 50 }],
  ['active', 'referrals', '+', { bow: -34, chord: true }],
];
text('Customer growth and capacity', 48, 60, { fs: 24, weight: 700, fill: C.ink });
text('Referrals grow the customer base; the support load they create slowly erodes satisfaction and caps growth', 48, 86, { fs: 13.5, fill: C.muted });
const boxes = {};
for (const [k, v] of Object.entries(V)) {
  const r = textCentered(v.s, v.p[0], v.p[1], { fs: VFS, weight: 600, fill: C.ink });
  boxes[k] = inflate(r, 9);
}
function exitBox(center, toward, b) { // point where ray center->toward leaves box b
  const d = sub(toward, center); let t = Infinity;
  if (d[0]) t = Math.min(t, ((d[0] > 0 ? b.x1 : b.x0) - center[0]) / d[0]);
  if (d[1]) t = Math.min(t, ((d[1] > 0 ? b.y1 : b.y0) - center[1]) / d[1]);
  return addv(center, mul(d, t));
}
const linkSvg = [];
for (const [a, b, pol, o] of LINKS) {
  const A = V[a].p, B = V[b].p, tag = `link:${a}-${b}`;
  const mid = mul(addv(A, B), 0.5);
  const out = o.chord ? (() => { const d = unit(sub(B, A)); return [-d[1], d[0]]; })() : unit(sub(mid, O));
  const ctrl = addv(mid, mul(out, 2 * o.bow));
  const s0 = exitBox(A, ctrl, boxes[a]), tip = exitBox(B, ctrl, boxes[b]);
  const base = head(tip, ctrl, { fill: C.link, L: 11, Wd: 4.2, tag });
  const pts = quadPts(s0, ctrl, base);
  lineReg(pts, tag);
  linkSvg.push(`<path d="M ${r2(s0[0])} ${r2(s0[1])} Q ${r2(ctrl[0])} ${r2(ctrl[1])} ${r2(base[0])} ${r2(base[1])}" fill="none" stroke="${C.link}" stroke-width="1.7"/>`);
  // polarity beside the arrowhead, on the outer side of the curve
  const full = quadPts(s0, ctrl, tip, 100);
  const q = full[84], tan = unit(sub(full[86], full[82]));
  let n = [-tan[1], tan[0]];
  const side = o.chord ? -1 : (n[0] * out[0] + n[1] * out[1] > 0 ? 1 : -1);
  n = mul(n, side);
  const g = measure(pol, 18, 700, 'middle');
  const pp = addv(q, mul(n, 8 + Math.abs(n[0]) * g.w / 2 + Math.abs(n[1]) * g.h / 2));
  textCentered(pol, pp[0], pp[1], { fs: 18, weight: 700, fill: C.ink, id: `${pol} on ${tag}` });
  if (o.delay) {
    const m = full[50], t2 = unit(sub(full[52], full[48])), nn = [-t2[1], t2[0]];
    for (const k of [-3, 3]) {
      const c = addv(m, mul(t2, k)), p1 = addv(c, mul(nn, 9)), p2 = sub(c, mul(nn, 9));
      lineReg([p1, p2], tag);
      linkSvg.push(`<line x1="${r2(p1[0])}" y1="${r2(p1[1])}" x2="${r2(p2[0])}" y2="${r2(p2[1])}" stroke="${C.link}" stroke-width="2"/>`);
    }
  }
}
svgParts.push(...linkSvg);
function loopMark(cx, cy, letter, name, col, rad = 19) {
  // clockwise circular arrow (screen angles increase clockwise), matching both loops' circulation
  const a0 = -Math.PI / 2 + 0.5, a1 = a0 + Math.PI * 1.65;
  const pts = Array.from({ length: 41 }, (_, i) => addv([cx, cy], mul(dir(a0 + (a1 - a0) * i / 40), rad)));
  const tip = pts[40], prev = addv([cx, cy], mul(dir(a1 - 0.25), rad));
  const base = head(addv([cx, cy], mul(dir(a1 + 0.12), rad)), prev, { fill: col, L: 9, Wd: 4.5, tag: `loop:${letter}` });
  lineReg(pts, `loop:${letter}`);
  add(`<path d="${pathD(pts)}" fill="none" stroke="${col}" stroke-width="2"/>`);
  circleReg(cx, cy, rad + 3, `loop:${letter}`);
  textCentered(letter, cx, cy, { fs: 17, weight: 700, fill: col, allow: [`loop:${letter}`] });
  textCentered(name, cx, cy + rad + 20, { fs: 13, style: 'italic', weight: 500, fill: col });
}
loopMark(305, 340, 'R', 'Referral growth', C.R);
loopMark(640, 400, 'B', 'Capacity constraint', C.B);
// legend
const LY = 720;
add(`<line x1="48" y1="${LY - 30}" x2="${W - 48}" y2="${LY - 30}" stroke="${C.rule}" stroke-width="1"/>`);
let x = 48;
const item = (glyph, label) => { glyph(x); x += 26; const r = text(label, x, LY + 4.5, { fs: 12.5, fill: C.ink }); x = r.x1 + 34; };
item(gx => textCentered('+', gx + 8, LY, { fs: 18, weight: 700, fill: C.ink }), 'same direction');
item(gx => textCentered('−', gx + 8, LY, { fs: 18, weight: 700, fill: C.ink }), 'opposite direction');
item(gx => add(`<line x1="${gx - 6}" y1="${LY}" x2="${gx + 22}" y2="${LY}" stroke="${C.link}" stroke-width="1.7"/><line x1="${gx + 5}" y1="${LY - 8}" x2="${gx + 5}" y2="${LY + 8}" stroke="${C.link}" stroke-width="2"/><line x1="${gx + 11}" y1="${LY - 8}" x2="${gx + 11}" y2="${LY + 8}" stroke="${C.link}" stroke-width="2"/>`), 'delay');
item(gx => textCentered('R', gx + 8, LY, { fs: 16, weight: 700, fill: C.R }), 'reinforcing loop (even count of −)');
item(gx => textCentered('B', gx + 8, LY, { fs: 16, weight: 700, fill: C.B }), 'balancing loop (odd count of −)');
checkAll(W, H, { crossTags: t => t.startsWith('link:') || t.startsWith('loop:') });

const DSL = `causalloop "Customer growth and capacity"
"Active customers" -> "Customer referrals" : +
"Customer referrals" -> "New customers" : +
"New customers" -> "Active customers" : +
"Active customers" -> "Support workload" : +
"Support workload" -> "Response time" : +
"Response time" -> "Customer satisfaction" : - delay
"Customer satisfaction" -> "Customer referrals" : +
loop R1 "Referral growth"
loop B1 "Capacity constraint"
`;
const NOTES = `A subscription business grows by word of mouth: more active customers make more referrals, which bring new customers. The same customers also load the support team, response times lengthen, and — after a delay while customers notice — satisfaction drops and referrals fall. The drawing is a causal loop diagram in the notation of Sterman, *Business Dynamics: Systems Thinking and Modeling for a Complex World* (2000), chapter 5: variables are plain text, every causal link is a curved arrow with a + or − polarity beside its head, a slow link carries two hash marks, and each feedback loop is named by a circular arrow around R (reinforcing) or B (balancing). The letters follow Sterman's rule: the referral loop has no negative links, so it reinforces; the capacity loop has one, so it balances.

Why it works as the exemplar for this type:

- Variables are unboxed, bold, and every arrow starts and stops a fixed gap short of the text, so the words are never struck through.
- Links bow outward along the loop they belong to, so the eye follows each loop round as a closed ring; the one shared shortcut (active customers to referrals) is a gentler chord that splits the ring into the two loops.
- Each polarity sign sits just beside its arrowhead on the outside of the curve, large and bold enough to read as part of that link and no other.
- The delay is two short strokes across the middle of the slow link, not a floating word.
- Loop identifiers sit in the open middle of their own loop, their circular arrow turns the same way the loop circulates, and the loop's name is written under it in the loop colour; colour is used for nothing else.
- A single legend row explains +, −, the delay mark and the R/B counting rule.

Palette: variable ink #16202b, link #2b3440, reinforcing rust #b4462a, balancing teal #1f6f8b, caption grey #63707f, rule #e2e8f0.
`;
await finish({ dir: TARGET, W, H, title: 'Customer growth and capacity', desc: 'Causal loop diagram: reinforcing loop R Referral growth (active customers, referrals, new customers) and balancing loop B Capacity constraint through support workload, response time and a delayed drop in customer satisfaction.', dsl: DSL, notes: NOTES, png: process.argv[2] });
