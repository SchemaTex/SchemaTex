/**
 * Hand-authored welding-symbol exemplars. Run from the repo root:
 *   node scripts/visual-eval/draw-welding-exemplars.mjs aws|iso-a [preview.png]
 * Text bounds come from resvg shaping; every text is checked against every
 * other text and every stroke before anything is written.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = { ink: '#20272B', muted: '#59636B', rule: '#CBD1D6', paper: '#FFFFFF' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 25, label: 14, pin: 13, note: 12 };
const SW = { symbol: 2, wire: 1.5, rule: 1 };
const VARIANT = process.argv[2];
if (VARIANT !== 'aws' && VARIANT !== 'iso-a') throw new Error('variant must be aws or iso-a');
const TARGET = new URL(`../../visual-eval/exemplars/welding/${VARIANT}/ideal.svg`, import.meta.url);
const PNG = process.argv[3];

// ---- shared kit: measured text, strokes, collision gate -------------------
const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [], texts = [], segs = [];
function measure(s, fs, weight, anchor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
  const b = new Resvg(svg, { font }).innerBBox();
  return { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 };
}
function text(s, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start' } = {}) {
  const m = measure(s, fs, weight, anchor);
  texts.push({ s, r: { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 } });
  out.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${esc(s)}</text>`);
  return x + m.x1;
}
function line(x1, y1, x2, y2, { w = SW.wire, stroke = C.ink, check = true } = {}) {
  if (check) segs.push([x1, y1, x2, y2]);
  out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"/>`);
}
function rect(x, y, w, h, opt = {}) {
  line(x, y, x + w, y, opt); line(x + w, y, x + w, y + h, opt); line(x + w, y + h, x, y + h, opt); line(x, y + h, x, y, opt);
}
function circle(cx, cy, r, { w = SW.wire } = {}) {
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * 2 * Math.PI, b = (i + 1) / 24 * 2 * Math.PI;
    segs.push([cx + r * Math.cos(a), cy + r * Math.sin(a), cx + r * Math.cos(b), cy + r * Math.sin(b)]);
  }
  out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.paper}" stroke="${C.ink}" stroke-width="${w}"/>`);
}
function segHitsRect([x1, y1, x2, y2], r, c) {
  const R = { x0: r.x0 - c, y0: r.y0 - c, x1: r.x1 + c, y1: r.y1 + c };
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1 - R.x0], [dx, R.x1 - x1], [-dy, y1 - R.y0], [dy, R.y1 - y1]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
function finish(W, H, title) {
  const bad = [];
  texts.forEach((a, i) => {
    if (a.r.x0 < 4 || a.r.y0 < 4 || a.r.x1 > W - 4 || a.r.y1 > H - 4) bad.push(`clipped: ${a.s}`);
    texts.slice(i + 1).forEach(b => {
      if (a.r.x0 < b.r.x1 + 2 && b.r.x0 < a.r.x1 + 2 && a.r.y0 < b.r.y1 + 2 && b.r.y0 < a.r.y1 + 2) bad.push(`text/text: ${a.s} | ${b.s}`);
    });
    segs.forEach(s => { if (segHitsRect(s, a.r, 2.5)) bad.push(`text/line: ${a.s} @ ${s.map(v => Math.round(v)).join(',')}`); });
  });
  if (bad.length) { console.error(bad.join('\n')); throw new Error(`${bad.length} collisions`); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}"><title>${esc(title)}</title><rect width="${W}" height="${H}" fill="${C.paper}"/>\n${out.join('\n')}\n</svg>\n`;
  writeFileSync(TARGET, svg);
  if (PNG) writeFileSync(PNG, new Resvg(svg, { font, fitTo: { mode: 'width', value: W * 2 } }).render().asPng());
  console.log(`ok: ${texts.length} texts, ${segs.length} segments, 0 collisions`);
}
// ---------------------------------------------------------------------------

const W = 1080, XR0 = 520, XR1 = 860, SX = 690, S = 22;

function poly(pts, { fill = 'none', w = SW.symbol, closed = true } = {}) {
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) { const q = pts[(i + 1) % pts.length]; segs.push([pts[i][0], pts[i][1], q[0], q[1]]); }
  const tag = closed ? 'polygon' : 'polyline';
  out.push(`<${tag} points="${pts.map(p => p.join(',')).join(' ')}" fill="${fill}" stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="miter"/>`);
}
function dashed(x1, y, x2) {
  segs.push([x1, y, x2, y]);
  out.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${C.ink}" stroke-width="${SW.wire}" stroke-dasharray="9 5"/>`);
}
/** Reference line, straight leader with arrowhead to the joint, tail fork with text. */
function callout(yref, tip, tail) {
  line(XR0, yref, XR1, yref, { w: SW.wire });
  line(XR0, yref, tip[0], tip[1], { w: SW.wire });
  const dx = XR0 - tip[0], dy = yref - tip[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
  poly([tip, [tip[0] + 14 * ux - 4.5 * uy, tip[1] + 14 * uy + 4.5 * ux], [tip[0] + 14 * ux + 4.5 * uy, tip[1] + 14 * uy - 4.5 * ux]], { fill: C.ink, w: 1 });
  if (tail) {
    line(XR1, yref, XR1 + 16, yref - 16, { w: SW.wire }); line(XR1, yref, XR1 + 16, yref + 16, { w: SW.wire });
    text(tail, XR1 + 26, yref + 5);
  }
}
/** Fillet: perpendicular leg on the left. dir -1 draws above the line at y, +1 below. */
const fillet = (y, dir) => poly([[SX, y], [SX, y + dir * S], [SX + S, y]]);
const vee = (y, dir, hw = 18, d = S) => poly([[SX - hw, y + dir * d], [SX, y], [SX + hw, y + dir * d]], { closed: false });

// Joint sketches, drawn as sections in the same ink.
function base(ry) { rect(80, ry + 170, 300, 20, { w: SW.symbol }); }
function tJoint(ry) {
  base(ry); rect(222, ry + 56, 16, 114, { w: SW.symbol });
  poly([[238, ry + 170], [252, ry + 170], [238, ry + 156]], { fill: C.ink, w: 1 });
  poly([[222, ry + 170], [208, ry + 170], [222, ry + 156]], { fill: C.ink, w: 1 });
  return [249, ry + 158];
}
function pipe(ry) {
  base(ry); rect(190, ry + 60, 80, 110, { w: SW.symbol });
  out.push(`<line x1="230" y1="${ry + 48}" x2="230" y2="${ry + 200}" stroke="${C.muted}" stroke-width="1" stroke-dasharray="14 4 3 4"/>`);
  poly([[270, ry + 170], [284, ry + 170], [270, ry + 156]], { fill: C.ink, w: 1 });
  poly([[190, ry + 170], [176, ry + 170], [190, ry + 156]], { fill: C.ink, w: 1 });
  return [281, ry + 158];
}
function butt(ry, backing) {
  poly([[80, ry + 130], [206, ry + 130], [222, ry + 158], [80, ry + 158]]);
  poly([[228, ry + 158], [244, ry + 130], [370, ry + 130], [370, ry + 158]]);
  if (backing) rect(186, ry + 158, 76, 12, { w: SW.symbol });
  return [225, ry + 124];
}
function caption(ry, title, desc) {
  text(title, 80, ry + 226, { weight: 600 });
  text(desc, 80, ry + 246, { fs: FS.note, fill: C.muted });
}
const rows = [110, 370, 630];

if (VARIANT === 'aws') {
  text('Bracket assembly', 48, 50, { fs: FS.title, weight: 600 });
  text('AWS A2.4 welding symbols  ·  arrow-side weld below the reference line, other-side weld above', 48, 76, { fs: 13, fill: C.muted });

  let ry = rows[0], y = ry + 120;
  callout(y, tJoint(ry), 'GMAW');
  fillet(y, -1); fillet(y, 1);
  text('6', SX - 8, y - 6, { anchor: 'end' });
  text('8', SX - 8, y + 17, { anchor: 'end' });
  text('50-150', SX + S + 8, y + 17);
  caption(ry, 'Stiffener to base plate', 'Arrow side: 8 mm fillet, 50 mm long at 150 mm pitch.  Other side: 6 mm continuous fillet.');

  ry = rows[1]; y = ry + 120;
  callout(y, pipe(ry), 'SMAW');
  fillet(y, 1);
  text('6', SX - 8, y + 17, { anchor: 'end' });
  line(XR0, y - 7, XR0, y - 36, { w: SW.wire });
  poly([[XR0, y - 36], [XR0 + 20, y - 29], [XR0, y - 22]], { fill: C.ink, w: 1 });
  circle(XR0, y, 7);
  caption(ry, 'Pipe support to base plate', 'Circle: weld all around.  Flag: weld in the field.  6 mm fillet.');

  ry = rows[2]; y = ry + 100;
  callout(y, butt(ry, true), 'SMAW; E7018');
  vee(y, 1, 26, 30);
  rect(SX - 12, y - 12, 24, 12, { w: SW.symbol });
  text('12', SX - 34, y + 19, { anchor: 'end' });
  text('3', SX, y + 25, { fs: FS.pin, anchor: 'middle' });
  text('60°', SX, y + 50, { fs: FS.pin, anchor: 'middle' });
  line(SX - 18, y + 58, SX + 18, y + 58, { w: SW.symbol });
  text('G', SX, y + 77, { fs: FS.pin, weight: 600, anchor: 'middle' });
  caption(ry, 'Splice plate butt joint', 'V-groove from the arrow side: 12 mm deep, 60° included angle, 3 mm root opening, ground flush; backing bar.');
} else {
  text('Frame weld details', 48, 50, { fs: FS.title, weight: 600 });
  text('ISO 2553:2019 system A  ·  symbol on the solid line = arrow side, on the dashed line = other side', 48, 76, { fs: 13, fill: C.muted });

  let ry = rows[0], y = ry + 120;
  callout(y, tJoint(ry), '135');
  dashed(XR0 + 24, y + 6, XR1 - 4);
  fillet(y, -1); poly([[SX, y + 6], [SX, y + 6 + S], [SX + S, y + 6]]);
  text('a5', SX - 8, y - 6, { anchor: 'end' });
  text('100', SX + S + 8, y - 6);
  text('a4', SX - 8, y + 23, { anchor: 'end' });
  caption(ry, 'Stiffener to base plate', 'Arrow side: 5 mm throat fillet, 100 mm long.  Other side: 4 mm throat fillet.  Process 135 (MAG).');

  ry = rows[1]; y = ry + 100;
  callout(y, butt(ry, false), '111/ISO 5817-B/PA');
  dashed(XR0 + 24, y + 6, XR1 - 4);
  vee(y, -1);
  text('s10', SX - 28, y - 6, { anchor: 'end' });
  caption(ry, 'Butt joint', 'V-groove from the arrow side, 10 mm penetration.  Tail: process 111, quality level B, flat position PA.');

  ry = rows[2]; y = ry + 120;
  callout(y, tJoint(ry), '135');
  fillet(y, -1); fillet(y, 1);
  text('z6', SX - 8, y - 6, { anchor: 'end' });
  text('z6', SX - 8, y + 17, { anchor: 'end' });
  caption(ry, 'Lug to plate', 'Symmetric 6 mm leg fillets on both sides, so no dashed line is drawn.');
}
finish(W, 900, VARIANT === 'aws' ? 'Bracket assembly — AWS A2.4 welding symbols' : 'Frame weld details — ISO 2553 system A');
