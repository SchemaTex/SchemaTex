/**
 * Hand-authored UML 2.5.1 use case diagram exemplar.
 *   node scripts/visual-eval/draw-usecase-exemplar.mjs [preview.png]
 * Writes visual-eval/exemplars/usecase/ideal.svg only after checking that no text
 * touches another text, a line, an ellipse outline or the canvas edge. Text bounds
 * come from resvg's own shaping with the same font used for the preview raster.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// ---------------------------------------------------------------- tokens
const C = {
  paper: '#FFFFFF', ink: '#0F172A', line: '#334155', muted: '#475569',
  faint: '#64748B', frame: '#94A3B8', header: '#EEF2F7', tint: '#F8FAFC', accent: '#2563EB',
};
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 20, sub: 11, subject: 14, uc: 13, actor: 13, key: 11, ext: 11, label: 11.5 };
const SW = { outline: 1.5, assoc: 1.4, subject: 1.5 };
const W = 1240, H = 740;
const TARGET = new URL('../../visual-eval/exemplars/usecase/ideal.svg', import.meta.url);
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
function text(s, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start' } = {}) {
  const m = measure(s, fs, weight, anchor);
  const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 };
  texts.push({ s, r });
  out.push(`<text x="${x}" y="${y}" font-size="${fs}"${weight !== 400 ? ` font-weight="${weight}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${fill}">${esc(s)}</text>`);
  return r;
}
const width = (s, fs, weight = 400) => { const m = measure(s, fs, weight, 'start'); return m.x1 - m.x0; };
const seg = (a, b) => segs.push([a, b]);
function segHitsRect([a, b], r, pad) {
  const x0 = r.x0 - pad, x1 = r.x1 + pad, y0 = r.y0 - pad, y1 = r.y1 + pad;
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
function segsCross([a, b], [c, d]) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function check(connectors) {
  const errs = [];
  texts.forEach((t, i) => {
    if (t.r.x0 < 8 || t.r.y0 < 8 || t.r.x1 > W - 8 || t.r.y1 > H - 8) errs.push(`off canvas: ${t.s}`);
    texts.slice(i + 1).forEach((u) => {
      if (t.r.x0 < u.r.x1 + 2 && u.r.x0 < t.r.x1 + 2 && t.r.y0 < u.r.y1 + 2 && u.r.y0 < t.r.y1 + 2) errs.push(`text/text: ${t.s} | ${u.s}`);
    });
    for (const s of segs) if (segHitsRect(s, t.r, 2.5)) { errs.push(`text/line: ${t.s} @ ${JSON.stringify(s)}`); break; }
  });
  connectors.forEach((a, i) => connectors.slice(i + 1).forEach((b) => { if (segsCross(a, b)) errs.push(`connectors cross ${JSON.stringify(a)} ${JSON.stringify(b)}`); }));
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
}

// ---------------------------------------------------------------- content
out.push(`<rect width="${W}" height="${H}" fill="${C.paper}"/>`);
text('Online bookstore', 44, 50, { fs: FS.title, weight: 600 });
text('UML 2.5.1 USE CASE DIAGRAM · 4 ACTORS · 7 USE CASES · INCLUDE, EXTEND AND GENERALIZATION', 44, 74, { fs: FS.sub, fill: C.faint });
out.push(`<line x1="44" y1="88" x2="${W - 44}" y2="88" stroke="${C.frame}" stroke-width="1"/>`);

// Subject boundary
const S = { x0: 264, y0: 118, x1: 1000, y1: 700 };
out.push(`<rect x="${S.x0}" y="${S.y0}" width="${S.x1 - S.x0}" height="${S.y1 - S.y0}" rx="6" fill="${C.tint}" stroke="${C.frame}" stroke-width="${SW.subject}"/>`);
seg([S.x0, S.y0], [S.x1, S.y0]); seg([S.x1, S.y0], [S.x1, S.y1]); seg([S.x1, S.y1], [S.x0, S.y1]); seg([S.x0, S.y1], [S.x0, S.y0]);
text('Bookstore System', S.x0 + 18, S.y0 + 26, { fs: FS.subject, weight: 600 });

// Use cases
const UC = {};
function usecase(id, name, cx, cy, ext) {
  const rx = Math.max(84, width(name, FS.uc, 600) / 2 + 34);
  const ry = ext ? 50 : 28;
  UC[id] = { cx, cy, rx, ry };
  out.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.paper}" stroke="${C.line}" stroke-width="${SW.outline}"/>`);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI, b = ((i + 1) / 48) * 2 * Math.PI;
    seg([cx + rx * Math.cos(a), cy + ry * Math.sin(a)], [cx + rx * Math.cos(b), cy + ry * Math.sin(b)]);
  }
  if (!ext) { text(name, cx, cy + 4.5, { fs: FS.uc, weight: 600, anchor: 'middle' }); return; }
  text(name, cx, cy - 16, { fs: FS.uc, weight: 600, anchor: 'middle' });
  const dy = -4, half = rx * Math.sqrt(1 - (dy / ry) ** 2);
  out.push(`<line x1="${cx - half}" y1="${cy + dy}" x2="${cx + half}" y2="${cy + dy}" stroke="${C.line}" stroke-width="1"/>`);
  seg([cx - half, cy + dy], [cx + half, cy + dy]);
  text('extension points', cx, cy + 13, { fs: FS.ext, weight: 600, anchor: 'middle', fill: C.muted });
  text(ext, cx, cy + 29, { fs: FS.ext, anchor: 'middle', fill: C.muted });
}
const C1 = 470, C2 = 820;
usecase('Browse', 'Browse Catalog', C1, 200);
usecase('Checkout', 'Check Out', C1, 336, 'discount code');
usecase('Discount', 'Apply Discount Code', C1, 492);
usecase('Track', 'Track Order', C1, 626);
usecase('Pay', 'Process Payment', C2, 336);
usecase('SignIn', 'Sign In', C2, 492);
usecase('Ship', 'Ship Order', C2, 626);

// point on ellipse boundary in the direction of p
function rim(id, p) {
  const u = UC[id], dx = p[0] - u.cx, dy = p[1] - u.cy;
  const k = 1 / Math.sqrt((dx / u.rx) ** 2 + (dy / u.ry) ** 2);
  return [u.cx + dx * k, u.cy + dy * k];
}
const r2 = (p) => p.map((v) => Math.round(v * 10) / 10);

// Actors
const A = {};
function stick(id, name, cx, cy) {
  A[id] = { cx, cy };
  out.push(`<g fill="none" stroke="${C.line}" stroke-width="1.6" stroke-linecap="round"><circle cx="${cx}" cy="${cy - 30}" r="10" fill="${C.paper}"/><line x1="${cx}" y1="${cy - 20}" x2="${cx}" y2="${cy + 10}"/><line x1="${cx - 18}" y1="${cy - 10}" x2="${cx + 18}" y2="${cy - 10}"/><line x1="${cx}" y1="${cy + 10}" x2="${cx - 14}" y2="${cy + 32}"/><line x1="${cx}" y1="${cy + 10}" x2="${cx + 14}" y2="${cy + 32}"/></g>`);
  segs.push([[cx - 18, cy - 40], [cx + 18, cy + 32]]);
  text(name, cx, cy + 54, { fs: FS.actor, weight: 600, anchor: 'middle' });
}
stick('Customer', 'Customer', 150, 268);
stick('Member', 'Member', 150, 600);
stick('WH', 'Warehouse Staff', 1120, 626);
// external system actor: classifier rectangle with the «actor» keyword
const PP = { x: 1050, y: 306, w: 150, h: 60 };
out.push(`<rect x="${PP.x}" y="${PP.y}" width="${PP.w}" height="${PP.h}" fill="${C.header}" stroke="${C.line}" stroke-width="${SW.outline}"/>`);
seg([PP.x, PP.y], [PP.x + PP.w, PP.y]); seg([PP.x + PP.w, PP.y], [PP.x + PP.w, PP.y + PP.h]); seg([PP.x + PP.w, PP.y + PP.h], [PP.x, PP.y + PP.h]); seg([PP.x, PP.y + PP.h], [PP.x, PP.y]);
text('«actor»', PP.x + PP.w / 2, PP.y + 24, { fs: FS.key, fill: C.accent, anchor: 'middle' });
text('Payment Provider', PP.x + PP.w / 2, PP.y + 43, { fs: FS.actor, weight: 600, anchor: 'middle' });

// Connectors
const connectors = [];
function openHead(tip, from, len = 11, half = 5.5) {
  const dx = tip[0] - from[0], dy = tip[1] - from[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
  const b = [tip[0] - ux * len, tip[1] - uy * len];
  const p = [[b[0] - uy * half, b[1] + ux * half], tip, [b[0] + uy * half, b[1] - ux * half]].map(r2);
  out.push(`<polyline points="${p.map((q) => q.join(',')).join(' ')}" fill="none" stroke="${C.line}" stroke-width="${SW.assoc}" stroke-linejoin="round"/>`);
}
function assoc(a, b) {
  a = r2(a); b = r2(b);
  out.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.line}" stroke-width="${SW.assoc}"/>`);
  seg(a, b); connectors.push([a, b]);
}
function dep(fromId, toId, keyword, labelPos, anchor = 'middle', extra) {
  const f = UC[fromId], t = UC[toId];
  const a = r2(rim(fromId, [t.cx, t.cy])), b = r2(rim(toId, [f.cx, f.cy]));
  out.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.line}" stroke-width="${SW.assoc}" stroke-dasharray="6 4"/>`);
  seg(a, b); connectors.push([a, b]);
  openHead(b, a);
  text(keyword, labelPos[0], labelPos[1], { fs: FS.label, fill: C.muted, anchor });
  if (extra) text(extra, labelPos[0], labelPos[1] + 16, { fs: FS.label, fill: C.muted, anchor });
}
assoc([A.Customer.cx + 22, A.Customer.cy - 14], rim('Browse', [A.Customer.cx, A.Customer.cy]));
assoc([A.Customer.cx + 22, A.Customer.cy - 2], rim('Checkout', [A.Customer.cx, A.Customer.cy]));
assoc([A.Member.cx + 22, A.Member.cy - 4], rim('Track', [A.Member.cx, A.Member.cy]));
assoc([UC.Pay.cx + UC.Pay.rx, UC.Pay.cy], [PP.x, PP.y + PP.h / 2]);
assoc([UC.Ship.cx + UC.Ship.rx, UC.Ship.cy], [A.WH.cx - 26, UC.Ship.cy]);
dep('Checkout', 'Pay', '«include»', [(C1 + C2) / 2 + 4, 326]);
dep('Checkout', 'SignIn', '«include»', [676, 392]);
dep('Track', 'SignIn', '«include»', [628, 548]);
dep('Discount', 'Checkout', '«extend»', [C1 - 10, 414], 'end', '[code entered]');

// Actor generalization: Member is a kind of Customer (hollow triangle at the parent)
{
  const x = A.Customer.cx, tipY = A.Customer.cy + 66, baseY = tipY + 16, botY = A.Member.cy - 44;
  out.push(`<line x1="${x}" y1="${baseY}" x2="${x}" y2="${botY}" stroke="${C.line}" stroke-width="${SW.assoc}"/>`);
  seg([x, tipY], [x, botY]); connectors.push([[x, tipY], [x, botY]]);
  out.push(`<polygon points="${x},${tipY} ${x + 9},${baseY} ${x - 9},${baseY}" fill="${C.paper}" stroke="${C.line}" stroke-width="${SW.assoc}" stroke-linejoin="round"/>`);
}

check(connectors);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">
<title>Online bookstore</title>
<desc>UML 2.5.1 use case diagram for the Bookstore System subject. Left of the boundary, the actor Customer is associated with Browse Catalog and Check Out, and the actor Member, a specialisation of Customer, is associated with Track Order. Right of the boundary, the external actor Payment Provider is associated with Process Payment and the actor Warehouse Staff with Ship Order. Check Out includes Process Payment and Sign In; Track Order includes Sign In. Apply Discount Code extends Check Out at the extension point discount code when a code is entered.</desc>
${out.join('\n')}
</svg>
`;
await writeFile(TARGET, svg);
if (PNG) await writeFile(PNG, new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
console.log('ok', texts.length, 'texts', connectors.length, 'connectors');
