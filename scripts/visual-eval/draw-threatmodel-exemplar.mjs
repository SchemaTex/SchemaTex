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
/** STRIDE threat-model exemplar: web application data-flow diagram.
 *   node scripts/visual-eval/draw-threatmodel-exemplar.mjs [preview.png]
 */
const C = { title: '#0f172a', ink: '#1e293b', text: '#475569', muted: '#64748b', rule: '#dbe2ea',
  zoneFill: '#f8fafc', zoneLine: '#94a3b8', cross: '#b02a37', badgeFill: '#eef2f6', badgeLine: '#94a3b8' };
const W = 1160, H = 700;
const TARGET = new URL('../../visual-eval/exemplars/threatmodel/', import.meta.url);
text('Web application threat model', 48, 56, { fs: 22, weight: 700, fill: C.title });
text('STRIDE per element on a data-flow diagram  ·  5 of 6 data flows cross a trust boundary', 48, 80, { fs: 13, fill: C.muted });
add(`<line x1="48" y1="98" x2="${W - 48}" y2="98" stroke="${C.rule}" stroke-width="1"/>`);
const ZY0 = 124, ZY1 = 530;
const zones = [['INTERNET', 60, 290], ['DMZ', 500, 690], ['INTERNAL', 880, 1100]];
for (const [name, x0, x1] of zones) {
  add(`<rect x="${x0}" y="${ZY0}" width="${x1 - x0}" height="${ZY1 - ZY0}" rx="10" fill="${C.zoneFill}" stroke="${C.zoneLine}" stroke-width="1.6" stroke-dasharray="7 5"/>`);
  lineReg([[x0, ZY0], [x1, ZY0], [x1, ZY1], [x0, ZY1], [x0, ZY0]], `zone:${name}`);
  textCentered(name, (x0 + x1) / 2, ZY0 + 24, { fs: 11.5, weight: 700, fill: C.text, ls: 1.2 });
}
const badge = (letters, cx, cy, tag) => {
  const m = measure(letters, 9.5, 700, 'middle', 'normal', 0.6), w = m.w + 16;
  add(`<rect x="${r2(cx - w / 2)}" y="${cy - 9}" width="${r2(w)}" height="18" rx="9" fill="${C.badgeFill}" stroke="${C.badgeLine}" stroke-width="1"/>`);
  textCentered(letters, cx, cy, { fs: 9.5, weight: 700, fill: C.text, ls: 0.6, allow: [tag], id: `${letters} ${tag}` });
  return { x0: cx - w / 2, x1: cx + w / 2 };
};
const nameText = (lines, cx, cy, tag) => lines.forEach((s, i) => textCentered(s, cx, cy + (i - (lines.length - 1) / 2) * 17, { fs: 13.5, weight: 600, fill: C.title, allow: [tag] }));
// external entities
for (const [id, cy, label] of [['User', 250, 'Customer Browser'], ['API', 430, 'Shipping API']]) {
  const x0 = 90, x1 = 260, y0 = cy - 36, y1 = cy + 36, tag = `el:${id}`;
  add(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#ffffff" stroke="${C.ink}" stroke-width="1.8"/>`);
  rectReg(x0 - 1, y0 - 1, x1 + 1, y1 + 1, tag);
  nameText([label], 175, cy - 10, tag); badge('S · R', 175, cy + 14, tag);
}
// processes
const WEB = P(595, 250), AUTH = P(595, 440), RW = 64, RA = 66;
for (const [id, c, r, lines] of [['Web', WEB, RW, ['Web Application']], ['Auth', AUTH, RA, ['Authentication', 'Service']]]) {
  const tag = `el:${id}`;
  add(`<circle cx="${c[0]}" cy="${c[1]}" r="${r}" fill="#ffffff" stroke="${C.ink}" stroke-width="1.8"/>`);
  circleReg(c[0], c[1], r + 1, tag);
  nameText(lines, c[0], c[1] - 10 - (lines.length - 1) * 4, tag); badge('S · T · R · I · D · E', c[0], c[1] + 16 + (lines.length - 1) * 6, tag);
}
// data stores: two parallel lines, label between
for (const [id, cy, label] of [['Audit', 250, 'Audit Log'], ['Users', 440, 'Customer Database']]) {
  const x0 = 910, x1 = 1070, y0 = cy - 32, y1 = cy + 32, tag = `el:${id}`;
  add(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#ffffff"/>`);
  add(`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${C.ink}" stroke-width="2.2"/><line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${C.ink}" stroke-width="2.2"/>`);
  rectReg(x0, y0 - 1, x1, y1 + 1, tag);
  nameText([label], 990, cy - 9, tag); badge('T · R? · I · D', 990, cy + 14, tag);
}
// data flows: orthogonal polylines, arrowhead at the target
const flowSvg = [];
const flow = (pts, label, lp, crosses, anchor = 'middle') => {
  const col = crosses ? C.cross : C.ink, tag = `flow:${label}`;
  const tip = pts[pts.length - 1];
  const base = head(tip, pts[pts.length - 2], { L: 10, Wd: 3.8, fill: col, tag });
  const body = [...pts.slice(0, -1), base];
  lineReg(body, tag);
  flowSvg.push(`<path d="${pathD(body)}" fill="none" stroke="${col}" stroke-width="${crosses ? 1.9 : 1.6}" stroke-linejoin="round"/>`);
  const m = measure(label, 12, 500, anchor);
  text(label, lp[0], lp[1] - (m.y0 + m.y1) / 2, { fs: 12, weight: 500, fill: col, anchor, id: tag });
};
const onCircle = (c, r, y, side) => P(c[0] + side * Math.sqrt(r * r - (y - c[1]) ** 2), y);
flow([P(260, 250), onCircle(WEB, RW, 250, -1)], 'HTTPS request', P(395, 238), true);
flow([onCircle(WEB, RW, 306, -1), P(430, 306), P(430, 430), P(260, 430)], 'shipment request', P(420, 368), true, 'end');
flow([P(595, WEB[1] + RW), P(595, AUTH[1] - RA)], 'credentials', P(605, 347), false, 'start');
flow([onCircle(WEB, RW, 250, 1), P(910, 250)], 'audit event', P(785, 238), true);
flow([onCircle(WEB, RW, 272, 1), P(800, 272), P(800, 426), P(910, 426)], 'order data', P(790, 355), true, 'end');
flow([onCircle(AUTH, RA, 456, 1), P(910, 456)], 'account lookup', P(740, 470), true);
svgParts.splice(svgParts.findIndex(s => s.startsWith('<rect x="90"')), 0, ...flowSvg);
// legend
const LY = 590;
let x = 48;
const item = (draw, label, gw) => { draw(x); const r = text(label, x + gw + 10, LY + 4.5, { fs: 12.5, fill: C.ink }); x = r.x1 + 30; };
item(gx => add(`<rect x="${gx}" y="${LY - 10}" width="30" height="20" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>`), 'External entity', 30);
item(gx => add(`<circle cx="${gx + 11}" cy="${LY}" r="11" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>`), 'Process', 22);
item(gx => add(`<line x1="${gx}" y1="${LY - 9}" x2="${gx + 30}" y2="${LY - 9}" stroke="${C.ink}" stroke-width="2"/><line x1="${gx}" y1="${LY + 9}" x2="${gx + 30}" y2="${LY + 9}" stroke="${C.ink}" stroke-width="2"/>`), 'Data store', 30);
item(gx => add(`<rect x="${gx}" y="${LY - 10}" width="30" height="20" rx="5" fill="${C.zoneFill}" stroke="${C.zoneLine}" stroke-width="1.4" stroke-dasharray="5 3"/>`), 'Trust boundary', 30);
item(gx => add(`<line x1="${gx}" y1="${LY}" x2="${gx + 26}" y2="${LY}" stroke="${C.ink}" stroke-width="1.6"/><path d="M ${gx + 34} ${LY} L ${gx + 25} ${LY - 3.6} L ${gx + 25} ${LY + 3.6} Z" fill="${C.ink}"/>`), 'Data flow within a zone', 34);
item(gx => add(`<line x1="${gx}" y1="${LY}" x2="${gx + 26}" y2="${LY}" stroke="${C.cross}" stroke-width="1.9"/><path d="M ${gx + 34} ${LY} L ${gx + 25} ${LY - 3.6} L ${gx + 25} ${LY + 3.6} Z" fill="${C.cross}"/>`), 'Data flow crossing a boundary', 34);
text('Badges list the STRIDE threats that apply to each element: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.', 48, 632, { fs: 12, fill: C.muted });
text('R? marks repudiation as conditional on a data store; every data flow is exposed to T · I · D.', 48, 652, { fs: 12, fill: C.muted });
checkAll(W, H, { crossTags: t => t.startsWith('flow:') });

const DSL = `threatmodel "Web Application STRIDE"
external User: Customer Browser
external API: Shipping API
process Web: Web Application
process Auth: Authentication Service
datastore Users: Customer Database
datastore Audit: Audit Log
User -> Web : HTTPS request
Web -> Auth : credentials
Auth -> Users : account lookup
Web -> Users : order data
Web -> Audit : audit event
Web -> API : shipment request
boundary "Internet" { User, API }
boundary "DMZ" { Web, Auth }
boundary "Internal" { Users, Audit }
`;
const NOTES = `Promoted from the reviewed case \`threatmodel-web-app\`: a customer's browser talks to a web application in a DMZ, which calls an authentication service, writes to a customer database and an audit log in the internal zone, and sends shipment requests out to a third-party shipping API. It is a STRIDE threat model drawn as a data-flow diagram, following Shostack, *Threat Modeling: Designing for Security* (2014), ch. 2–3, and the Microsoft Threat Modeling Tool stencil: a rectangle is an external entity, a circle is a process, two parallel lines are a data store, arrows are data flows, dashed frames are trust boundaries, and each element is tagged with the STRIDE-per-element threats that apply to its kind.

Why it works as the exemplar for this type:

- The three trust zones are equal-height dashed, lightly tinted columns laid out left to right from least to most trusted, so every boundary crossing is a line leaving one column for another.
- Each element carries its STRIDE badge inside its own shape, under its name, so a threat list can never be mistaken for a label on a nearby flow.
- Every flow is its own orthogonal line with its own entry point: no two flows share a trunk, merge, or cross, and each label sits in clear space beside its line in the line's colour.
- Red is reserved for the flows that cross a trust boundary; the one flow that stays inside the DMZ is drawn in ink, so the risky flows stand out without any extra marking.
- The legend row pairs a small drawn glyph with each notation, and two caption lines spell out the STRIDE letters and the conditional R? on data stores.

Palette: title #0f172a, element ink #1e293b, label slate #475569, caption grey #64748b, zone fill #f8fafc with #94a3b8 dashed border, boundary-crossing red #b02a37, badge #eef2f6 / #94a3b8.
`;
await finish({ dir: TARGET, W, H, title: 'Web application threat model', desc: 'STRIDE data-flow diagram with Internet, DMZ and Internal trust zones; five of six data flows cross a trust boundary and are drawn red; each element carries its STRIDE-per-element badge.', dsl: DSL, notes: NOTES, png: process.argv[2] });
