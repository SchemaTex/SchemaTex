/**
 * Hand-authored UML 2.5.1 sequence diagram exemplar.
 *   node scripts/visual-eval/draw-sequence-exemplar.mjs [preview.png]
 * Writes visual-eval/exemplars/sequence/ideal.svg after checking that no text
 * touches another text, a line, a frame or the canvas edge. Text bounds come from
 * resvg's own shaping with the same font used for the preview raster.
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
const FS = { title: 20, sub: 11, name: 13, key: 10.5, msg: 12, frag: 11.5, guard: 11.5, legend: 11.5 };
const SW = { head: 1.5, life: 1, msg: 1.4, frame: 1.25, bar: 1.25 };
const W = 1340, H = 940;
const TARGET = new URL('../../visual-eval/exemplars/sequence/ideal.svg', import.meta.url);
const PNG = process.argv[2];

// ---------------------------------------------------------------- kit
const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [], texts = [], segs = [];
const cache = new Map();
function measure(s, fs, weight, anchor, style) {
  const k = JSON.stringify([s, fs, weight, anchor, style]);
  if (!cache.has(k)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" font-style="${style}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b) throw new Error(`cannot measure ${s}`);
    cache.set(k, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 });
  }
  return cache.get(k);
}
function text(s, x, y, { fs = FS.msg, weight = 400, fill = C.ink, anchor = 'start', style = 'normal', halo = false } = {}) {
  const m = measure(s, fs, weight, anchor, style);
  const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 };
  texts.push({ s, r });
  const st = style === 'italic' ? ' font-style="italic"' : '';
  out.push(`<text x="${x}" y="${y}" font-size="${fs}"${weight !== 400 ? ` font-weight="${weight}"` : ''}${st}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${fill}">${esc(s)}</text>`);
  return r;
}
const width = (s, fs, weight = 400) => { const m = measure(s, fs, weight, 'start', 'normal'); return m.x1 - m.x0; };
function seg(a, b) { segs.push([a, b]); }
function line(a, b, { stroke = C.line, sw = SW.msg, dash } = {}) {
  seg(a, b);
  out.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
}
function rect(x, y, w, h, { fill = 'none', stroke = C.line, sw = SW.head, rx = 0 } = {}) {
  seg([x, y], [x + w, y]); seg([x + w, y], [x + w, y + h]); seg([x + w, y + h], [x, y + h]); seg([x, y + h], [x, y]);
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''} fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
}
function poly(pts, { fill = 'none', stroke = C.line, sw = SW.frame, close = true } = {}) {
  for (let i = 0; i < pts.length - (close ? 0 : 1); i++) seg(pts[i], pts[(i + 1) % pts.length]);
  out.push(`<${close ? 'polygon' : 'polyline'} points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`);
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
function check() {
  const errs = [];
  texts.forEach((t, i) => {
    if (t.r.x0 < 8 || t.r.y0 < 8 || t.r.x1 > W - 8 || t.r.y1 > H - 8) errs.push(`off canvas: ${t.s}`);
    texts.slice(i + 1).forEach((u) => {
      if (t.r.x0 < u.r.x1 + 2 && u.r.x0 < t.r.x1 + 2 && t.r.y0 < u.r.y1 + 2 && u.r.y0 < t.r.y1 + 2) errs.push(`text/text: ${t.s} | ${u.s}`);
    });
    for (const s of segs) if (segHitsRect(s, t.r, 2)) { errs.push(`text/line: ${t.s} @ ${JSON.stringify(s)}`); break; }
  });
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
}

// ---------------------------------------------------------------- content
const HEAD_TOP = 108, HEAD_H = 44, END = 872, BAR = 10;
const L = {
  Shopper: { x: 92, kind: 'actor', name: 'Shopper' },
  Web: { x: 272, key: '«boundary»', name: 'Web Store' },
  Checkout: { x: 478, key: '«control»', name: 'Checkout Service' },
  Payments: { x: 690, key: '«control»', name: 'Payment Gateway' },
  Order: { x: 884, name: 'Order', created: 402 },
  DB: { x: 1060, key: '«database»', name: 'Orders DB' },
  Bus: { x: 1236, key: '«queue»', name: 'Event Bus' },
};
// activation bars: [lifeline, from, to]
const BARS = [['Web', 190, 836], ['Checkout', 230, 780], ['Payments', 270, 312], ['Order', 424, 536], ['DB', 494, 526]];
const barAt = (id, y) => BARS.some(([l, a, b]) => l === id && y >= a && y <= b);
const edge = (id, y, towardsX) => {
  const x = L[id].x;
  if (!barAt(id, y)) return x;
  return towardsX > x ? x + BAR / 2 : x - BAR / 2;
};

out.push(`<rect width="${W}" height="${H}" fill="${C.paper}"/>`);
text('Checkout with a saved card', 44, 50, { fs: FS.title, weight: 600 });
text('UML 2.5.1 SEQUENCE DIAGRAM · 7 LIFELINES · ALT, LOOP AND OPT FRAGMENTS', 44, 74, { fs: FS.sub, fill: C.faint });
out.push(`<line x1="44" y1="88" x2="${W - 44}" y2="88" stroke="${C.frame}" stroke-width="1"/>`);

// ---- combined fragments (drawn first so lifelines and bars sit on top)
function fragment(op, x0, y0, x1, y1, operands) {
  out.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${C.frame}" stroke-width="${SW.frame}"/>`);
  seg([x0, y0], [x1, y0]); seg([x1, y0], [x1, y1]); seg([x1, y1], [x0, y1]); seg([x0, y1], [x0, y0]);
  const tw = width(op, FS.frag, 600) + 20, th = 20;
  poly([[x0, y0], [x0 + tw, y0], [x0 + tw, y0 + th - 7], [x0 + tw - 7, y0 + th], [x0, y0 + th]], { fill: C.header, stroke: C.frame });
  text(op, x0 + 8, y0 + 14.5, { fs: FS.frag, weight: 600, fill: C.ink });
  for (const { y, guard, gx } of operands) {
    if (y !== y0) {
      out.push(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${C.frame}" stroke-width="${SW.frame}" stroke-dasharray="6 4"/>`);
      seg([x0, y], [x1, y]);
    }
    text(guard, gx, y + (y === y0 ? 15 : 18), { fs: FS.guard, fill: C.muted });
  }
}
fragment('alt', 196, 340, 1304, 794, [{ y: 340, guard: '[approved]', gx: 490 }, { y: 716, guard: '[declined]', gx: 490 }]);
fragment('loop', 808, 446, 1136, 552, [{ y: 446, guard: '[for each cart line]', gx: 896 }]);
fragment('opt', 404, 576, 1290, 656, [{ y: 576, guard: '[receipt requested]', gx: 490 }]);

// ---- lifeline heads and dashed axes
for (const [id, l] of Object.entries(L)) {
  if (l.kind === 'actor') {
    const cx = l.x, top = HEAD_TOP - 4;
    out.push(`<g fill="none" stroke="${C.line}" stroke-width="1.5" stroke-linecap="round"><circle cx="${cx}" cy="${top + 8}" r="8" fill="${C.paper}"/><line x1="${cx}" y1="${top + 16}" x2="${cx}" y2="${top + 34}"/><line x1="${cx - 12}" y1="${top + 22}" x2="${cx + 12}" y2="${top + 22}"/><line x1="${cx}" y1="${top + 34}" x2="${cx - 10}" y2="${top + 46}"/><line x1="${cx}" y1="${top + 34}" x2="${cx + 10}" y2="${top + 46}"/></g>`);
    segs.push([[cx - 12, top], [cx + 12, top + 46]]);
    text(l.name, cx, top + 64, { fs: FS.name, weight: 600, anchor: 'middle' });
    l.axisTop = top + 72;
  } else {
    const w = Math.max(104, width(l.name, FS.name, 600) + 28);
    const h = l.key ? HEAD_H : 34;
    const cy = l.created ?? HEAD_TOP + HEAD_H / 2;
    const y = cy - h / 2;
    rect(l.x - w / 2, y, w, h, { fill: C.header, stroke: C.line });
    if (l.key) {
      text(l.key, l.x, y + 17, { fs: FS.key, fill: C.accent, anchor: 'middle' });
      text(l.name, l.x, y + 34, { fs: FS.name, weight: 600, anchor: 'middle' });
    } else {
      text(l.name, l.x, y + 22, { fs: FS.name, weight: 600, anchor: 'middle' });
    }
    l.axisTop = y + h; l.headLeft = l.x - w / 2;
  }
  out.push(`<line x1="${l.x}" y1="${l.axisTop}" x2="${l.x}" y2="${END}" stroke="${C.frame}" stroke-width="${SW.life}" stroke-dasharray="5 4"/>`);
  seg([l.x, l.axisTop], [l.x, END]);
}
for (const [id, a, b] of BARS) rect(L[id].x - BAR / 2, a, BAR, b - a, { fill: C.paper, stroke: C.line, sw: SW.bar });

// ---- messages
function head(x, y, dir, kind) {
  const len = 11, half = 5;
  const p = [[x - dir * len, y - half], [x, y], [x - dir * len, y + half]];
  if (kind === 'sync') out.push(`<polygon points="${p.map((q) => q.join(',')).join(' ')}" fill="${C.line}" stroke="${C.line}" stroke-width="1" stroke-linejoin="round"/>`);
  else out.push(`<polyline points="${p.map((q) => q.join(',')).join(' ')}" fill="none" stroke="${C.line}" stroke-width="${SW.msg}" stroke-linejoin="round"/>`);
}
function msg(from, to, y, label, kind, { labelX } = {}) {
  const x2t = to === 'Order' && kind === 'create' ? L.Order.headLeft : null;
  const x1 = edge(from, y, L[to].x);
  const x2 = x2t ?? edge(to, y, L[from].x);
  const dir = x2 > x1 ? 1 : -1;
  const dashed = kind === 'reply' || kind === 'create';
  out.push(`<line x1="${x1}" y1="${y}" x2="${x2 - (kind === 'sync' ? dir * 10 : 0)}" y2="${y}" stroke="${C.line}" stroke-width="${SW.msg}"${dashed ? ' stroke-dasharray="6 4"' : ''}/>`);
  seg([x1, y], [x2, y]);
  head(x2, y, dir, kind);
  const lx = labelX ?? (x1 + x2) / 2;
  text(label, lx, y - 8, { fs: FS.msg, anchor: labelX ? 'start' : 'middle', fill: C.ink });
}
msg('Shopper', 'Web', 190, 'Place order', 'sync');
msg('Web', 'Checkout', 230, 'POST /checkout', 'sync');
msg('Checkout', 'Payments', 270, 'authorize(card, total)', 'sync');
msg('Payments', 'Checkout', 312, 'authorization result', 'reply');
msg('Checkout', 'Order', 402, '«create»', 'create');
msg('Order', 'DB', 494, 'INSERT order_line', 'sync');
msg('DB', 'Order', 526, 'ok', 'reply');
msg('Checkout', 'Bus', 628, 'OrderPlaced', 'async', { labelX: 498 });
msg('Checkout', 'Web', 690, '201 Created', 'reply');
msg('Checkout', 'Web', 764, '402 Payment Required', 'reply');
msg('Web', 'Shopper', 836, 'Show confirmation', 'reply');

// ---- legend
const LY = 908;
out.push(`<line x1="44" y1="${LY - 22}" x2="${W - 44}" y2="${LY - 22}" stroke="${C.frame}" stroke-width="1"/>`);
let lx = 44;
for (const [kind, cap] of [['sync', 'synchronous call'], ['async', 'asynchronous signal'], ['reply', 'reply, or «create» to a new lifeline']]) {
  const x2 = lx + 44;
  out.push(`<line x1="${lx}" y1="${LY - 4}" x2="${x2 - (kind === 'sync' ? 10 : 0)}" y2="${LY - 4}" stroke="${C.line}" stroke-width="${SW.msg}"${kind === 'reply' || kind === 'create' ? ' stroke-dasharray="6 4"' : ''}/>`);
  seg([lx, LY - 4], [x2, LY - 4]);
  head(x2, LY - 4, 1, kind);
  const r = text(cap, x2 + 10, LY, { fs: FS.legend, fill: C.muted });
  lx = r.x1 + 34;
}
rect(lx, LY - 14, 10, 20, { fill: C.paper, stroke: C.line, sw: SW.bar });
const r1 = text('execution (activation)', lx + 20, LY, { fs: FS.legend, fill: C.muted });
lx = r1.x1 + 34;
poly([[lx, LY - 14], [lx + 34, LY - 14], [lx + 34, LY + 0], [lx + 28, LY + 6], [lx, LY + 6]], { fill: C.header, stroke: C.frame });
text('op', lx + 8, LY, { fs: FS.frag, weight: 600 });
text('combined fragment, [guard] per operand', lx + 44, LY, { fs: FS.legend, fill: C.muted });

check();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">
<title>Checkout with a saved card</title>
<desc>UML 2.5.1 sequence diagram. A Shopper places an order with the Web Store, which calls the Checkout Service; Checkout asks the Payment Gateway to authorize the card and gets a reply. In an alt fragment: when approved, Checkout creates an Order object, which inserts each cart line into the Orders DB inside a loop fragment; an opt fragment publishes an asynchronous OrderPlaced signal to the Event Bus when a receipt is requested; Checkout replies 201 Created. When declined, Checkout replies 402 Payment Required. The Web Store then shows the confirmation to the Shopper.</desc>
${out.join('\n')}
</svg>
`;
await writeFile(TARGET, svg);
if (PNG) await writeFile(PNG, new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
console.log('ok', texts.length, 'texts', segs.length, 'segments');
