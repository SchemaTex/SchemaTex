/**
 * Hand-authored legal entity structure chart exemplar. Run from any directory:
 *   node scripts/visual-eval/draw-entity-exemplar.mjs [png-path]
 * Shapes follow the U.S. tax structure-chart convention used in IRS LB&I International
 * Practice Units and Big-4 tax charts: corporation = rectangle, partnership = triangle,
 * disregarded entity = oval inside a rectangle, trust = oval, individual = circle.
 * Each entity kind also carries a pastel fill so types read at a glance.
 * Every text is measured with resvg and checked against shapes, lines and other text,
 * and every label written inside a shape is checked against that shape's real outline.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = {
  ink: '#334155', text: '#1E293B', muted: '#475569', paper: '#FFFFFF',
  frame: '#94A3B8', frameTint: '#F8FAFC', legendBorder: '#E2E8F0',
  corp: '#DBEAFE', llc: '#DCFCE7', llcInner: '#F4FDF7', trust: '#EDE9FE', person: '#FED7AA', lp: '#FEF3C7',
  control: '#2563EB', transfer: '#B45309',
};
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 21, subtitle: 12.5, name: 13.5, kind: 12, edge: 12.5, frame: 11, legend: 12.5 };
const SW = { shape: 1.4, own: 1.6, rel: 1.6, frame: 1.1 };
const NH = 84;          // every node shape shares this height
const R = 10;           // corner radius for rounded shapes and frames
const PAD = 24;         // frame padding around its contents
const PNG = process.argv[2];

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cache = new Map();
function measure(s, fs, weight) {
  const key = `${s}|${fs}|${weight}`;
  if (!cache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="200"><text x="100" y="100" font-family="${FONT}" font-size="${fs}" font-weight="${weight}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b) throw new Error(`Cannot measure ${s}`);
    cache.set(key, { x0: b.x - 100, y0: b.y - 100, x1: b.x + b.width - 100, y1: b.y + b.height - 100 });
  }
  return cache.get(key);
}

const g = [], texts = [], segs = [], shapes = [], inside = [];
function text(s, x, y, { fs = FS.name, weight = 400, fill = C.text, anchor = 'start', owner = null, spacing = 0 } = {}) {
  const m = measure(s, fs, weight);
  const extra = spacing * Math.max(0, s.length - 1);
  const w = m.x1 - m.x0 + extra;
  const shift = anchor === 'middle' ? -w / 2 - m.x0 : anchor === 'end' ? -w - m.x0 : 0;
  const r = { x0: x + m.x0 + shift, y0: y + m.y0, x1: x + m.x0 + shift + w, y1: y + m.y1 };
  texts.push({ s, r, owner });
  const a = anchor === 'start' ? '' : ` text-anchor="${anchor}"`;
  const ls = spacing ? ` letter-spacing="${spacing}"` : '';
  g.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" fill="${fill}"${a}${ls}>${esc(s)}</text>`);
  return r;
}
function seg(a, b, id, owners = []) { segs.push({ a, b, id, owners }); }
function path(pts, { stroke = C.ink, width = SW.own, dash = null, arrow = false, id, owners = [] }) {
  for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i], id, owners);
  let draw = pts;
  if (arrow) {
    const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ux = (q[0] - p[0]) / len, uy = (q[1] - p[1]) / len;
    const end = [q[0] - ux * 10, q[1] - uy * 10];
    draw = [...pts.slice(0, -1), end];
    g.push(`<polygon points="${q[0]},${q[1]} ${end[0] - uy * 5},${end[1] + ux * 5} ${end[0] + uy * 5},${end[1] - ux * 5}" fill="${stroke}"/>`);
  }
  const d = draw.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  g.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
}

// Shapes: each is centred on (cx, cy), NH tall, and returns { id, b, top, bottom, fits(rect) }
// so labels can be checked against the real outline and lines can attach to real anchor points.
const inEllipse = (r, cx, cy, rx, ry) =>
  [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].every(([x, y]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
function register(id, cx, cy, w, h, fits, extra = {}) {
  const b = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
  const s = { id, cx, cy, b, top: [cx, b.y0], bottom: [cx, b.y1], fits, ...extra };
  shapes.push(s);
  return s;
}
function corp(id, cx, cy, w) {
  g.push(`<rect x="${cx - w / 2}" y="${cy - NH / 2}" width="${w}" height="${NH}" fill="${C.corp}" stroke="${C.ink}" stroke-width="${SW.shape}"/>`);
  return register(id, cx, cy, w, NH, r => r.x0 >= cx - w / 2 + 12 && r.x1 <= cx + w / 2 - 12 && r.y0 >= cy - NH / 2 + 10 && r.y1 <= cy + NH / 2 - 10);
}
function oval(id, cx, cy, w) {
  const rx = w / 2, ry = NH / 2;
  g.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.trust}" stroke="${C.ink}" stroke-width="${SW.shape}"/>`);
  return register(id, cx, cy, w, NH, r => inEllipse(r, cx, cy, rx - 10, ry - 6));
}
function disregarded(id, cx, cy, w) {
  const inset = 11, rx = w / 2 - inset, ry = NH / 2 - inset;
  g.push(`<rect x="${cx - w / 2}" y="${cy - NH / 2}" width="${w}" height="${NH}" rx="${R}" fill="${C.llc}" stroke="${C.ink}" stroke-width="${SW.shape}"/>`);
  g.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.llcInner}" stroke="${C.ink}" stroke-width="${SW.shape}"/>`);
  return register(id, cx, cy, w, NH, r => inEllipse(r, cx, cy, rx - 8, ry - 4));
}
function triangle(id, cx, cy, w) {
  const apexY = cy - NH / 2, baseY = cy + NH / 2;
  g.push(`<polygon points="${cx},${apexY} ${cx + w / 2},${baseY} ${cx - w / 2},${baseY}" fill="${C.lp}" stroke="${C.ink}" stroke-width="${SW.shape}" stroke-linejoin="round"/>`);
  const halfAt = y => (w / 2) * (y - apexY) / NH;
  // Labels must sit in the lower two-thirds and clear both slanted sides by 12px at their top edge.
  return register(id, cx, cy, w, NH,
    r => r.y0 >= apexY + NH / 3 && r.y1 <= baseY - 6 && r.x0 >= cx - halfAt(r.y0) + 12 && r.x1 <= cx + halfAt(r.y0) - 12,
    { top: [cx, apexY] });
}
function circle(id, cx, cy, rr) {
  g.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${C.person}" stroke="${C.ink}" stroke-width="${SW.shape}"/>`);
  return register(id, cx, cy, 2 * rr, 2 * rr, () => false);
}
// Two-line label centred in a shape: semibold name(s), then a lighter classification line.
function label(shape, lines, dy = 0) {
  const lh = 18;
  const first = shape.cy - ((lines.length - 1) * lh) / 2 + 4.5 + dy;
  lines.forEach(([s, kind], i) => {
    const r = text(s, shape.cx, first + i * lh, {
      fs: kind === 'name' ? FS.name : FS.kind, weight: kind === 'name' ? 600 : 400,
      fill: kind === 'name' ? C.text : C.muted, anchor: 'middle', owner: shape.id,
    });
    inside.push({ shape, s, r });
  });
}
function frame(id, contents, fill, name, extraBottom = 0) {
  const x0 = Math.min(...contents.map(s => s.b.x0)) - PAD, x1 = Math.max(...contents.map(s => s.b.x1)) + PAD;
  const y0 = Math.min(...contents.map(s => s.b.y0)) - PAD - 18, y1 = Math.max(...contents.map(s => s.b.y1)) + PAD + extraBottom;
  return { id, x0, y0, x1, y1, fill, name };
}
function drawFrame(f) {
  g.push(`<rect x="${f.x0}" y="${f.y0}" width="${f.x1 - f.x0}" height="${f.y1 - f.y0}" rx="${R + 2}" fill="${f.fill}" stroke="${C.frame}" stroke-width="${SW.frame}" stroke-dasharray="6 4"/>`);
  seg([f.x0, f.y0], [f.x1, f.y0], f.id); seg([f.x1, f.y0], [f.x1, f.y1], f.id);
  seg([f.x1, f.y1], [f.x0, f.y1], f.id); seg([f.x0, f.y1], [f.x0, f.y0], f.id);
  text(f.name, f.x0 + 14, f.y0 + 20, { fs: FS.frame, weight: 600, fill: C.muted, spacing: 1.2, owner: f.id });
}

// Layout. One vertical spine S carries the grantor, the trust, the holding company and its
// middle subsidiary; siblings sit either side of it.
const S = 560;
const Y = { grantor: 138, sd: 290, de: 486, sub: 652 };

// Shapes are drawn into a separate buffer so frames can be sized from them first.
const body = g.splice(0);
const grantor = circle('grantor', S, Y.grantor, 30);
const trustee = corp('trustee', S - 370, Y.sd, 250);
const trust = oval('trust', S, Y.sd, 290);
const children = oval('children', S + 370, Y.sd, 250);
const holdco = corp('holdco', S, Y.de, 250);
const re = disregarded('re', S - 310, Y.sub, 250);
const sec = disregarded('sec', S, Y.sub, 250);
const lp = triangle('lp', S + 320, Y.sub, 300);
const shapeSvg = g.splice(0);
g.push(...body);

const sdFrame = frame('SD', [trustee, trust, children], C.frameTint, 'SOUTH DAKOTA');
const deFrame = frame('DE', [holdco, re, sec, lp], C.frameTint, 'DELAWARE', 22);
const X0 = Math.min(sdFrame.x0, deFrame.x0), X1 = Math.max(sdFrame.x1, deFrame.x1);
for (const f of [sdFrame, deFrame]) { f.x0 = X0; f.x1 = X1; }
const W = X1 + X0;

// Title block, aligned with the frames' left edge.
text('Smith Family Office — Dynasty Trust Structure', X0, 44, { fs: FS.title, weight: 600 });
text('Entity structure chart · shapes show U.S. tax classification · percentages are ownership interests', X0, 66, { fs: FS.subtitle, fill: C.muted });

drawFrame(sdFrame);
drawFrame(deFrame);
g.push(...shapeSvg);

label(trustee, [['Dakota Trust Company', 'name'], ['Corporation · directed trustee', 'kind']]);
label(trust, [['Smith Irrevocable Dynasty Trust', 'name'], ['Trust · est. 2021 · GST exempt', 'kind']]);
label(children, [["Children's Separate Shares", 'name'], ['Trust · for descendants', 'kind']]);
label(holdco, [['Smith Family Holdings, Inc.', 'name'], ['Corporation', 'kind']]);
label(re, [['Smith Real Estate LLC', 'name'], ['Disregarded entity', 'kind']]);
label(sec, [['Smith Securities LLC', 'name'], ['Disregarded entity', 'kind']]);
label(lp, [['Smith Family', 'name'], ['Partners, LP', 'name']], 14);
text('Partnership', lp.cx, lp.b.y1 + 18, { fs: FS.kind, fill: C.muted, anchor: 'middle', owner: 'lp' });
text('Robert Smith', S + 44, Y.grantor - 3, { fs: FS.name, weight: 600, owner: 'grantor' });
text('Individual · grantor', S + 44, Y.grantor + 15, { fs: FS.kind, fill: C.muted, owner: 'grantor' });

// Relationships that are not ownership: gift, fiduciary control, distributions.
path([grantor.bottom, trust.top], { stroke: C.transfer, dash: '2 4', arrow: true, id: 'gift', owners: ['grantor', 'trust'] });
text('gift', S + 12, sdFrame.y0 - 13, { fs: FS.edge, fill: C.transfer, owner: 'gift' });
path([[trustee.b.x1, Y.sd], [trust.b.x0, Y.sd]], { stroke: C.control, dash: '7 4', arrow: true, id: 'admin', owners: ['trustee', 'trust'] });
text('administers', (trustee.b.x1 + trust.b.x0) / 2, Y.sd - 9, { fs: FS.edge, fill: C.control, anchor: 'middle', owner: 'admin' });
path([[trust.b.x1, Y.sd], [children.b.x0, Y.sd]], { stroke: C.transfer, dash: '2 4', arrow: true, id: 'dist', owners: ['trust', 'children'] });
text('distributions', (trust.b.x1 + children.b.x0) / 2, Y.sd - 9, { fs: FS.edge, fill: C.transfer, anchor: 'middle', owner: 'dist' });

// Ownership: plain solid lines leaving the owner at bottom-centre and entering the owned entity at
// top-centre (the partnership at its apex), percentage beside the vertical just above the child.
const pct = (s, x, childTop, owner, side = 'right') =>
  text(s, x + (side === 'right' ? 9 : -9), childTop - 12, { fs: FS.edge, weight: 600, anchor: side === 'right' ? 'start' : 'end', owner });
const bus1 = (sdFrame.y1 + deFrame.y0) / 2;           // trust's bus runs in the gap between the frames
const bus2 = (holdco.b.y1 + re.b.y0) / 2 - 2;          // holding company's bus
const lpX = lp.cx;
// Each ownership line records its owner and owned entity, so lines from different owners can be
// checked never to share a segment or a junction.
const ownSegs = [], dots = [];
const own = (owner, child, pts, id) => {
  path(pts, { id, owners: [owner, child] });
  for (let i = 1; i < pts.length; i++) ownSegs.push({ owner, child, a: pts[i - 1], b: pts[i], id });
};
const dot = (owner, p) => { dots.push({ owner, p }); g.push(`<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="${C.ink}"/>`); };
const gpX = lpX - 84, apexY = lp.b.y0;                 // GP lane: its own column left of the apex, then a short run into it
own('trust', 'holdco', [trust.bottom, holdco.top], 'own-holdco');
own('trust', 'lp', [[S, bus1], [lpX, bus1], lp.top], 'own-lp');
own('holdco', 'lp', [[holdco.b.x1, Y.de], [gpX, Y.de], [gpX, apexY], lp.top], 'own-gp');
own('holdco', 'sec', [holdco.bottom, sec.top], 'own-sec');
own('holdco', 're', [[S, bus2], [re.cx, bus2], re.top], 'own-re');
pct('100%', S, holdco.b.y0, 'own-holdco');
pct('100%', re.cx, re.b.y0, 'own-re');
pct('100%', S, sec.b.y0, 'own-sec');
text('99% LP', lpX + 9, apexY - 9, { fs: FS.edge, weight: 600, owner: 'own-lp' });
text('1% GP', (gpX + lpX) / 2, apexY - 9, { fs: FS.edge, weight: 600, anchor: 'middle', owner: 'own-gp' });
dot('trust', [S, bus1]);
dot('holdco', [S, bus2]);

// No two ownership lines from different owners share a segment or a junction; they may meet only
// where both enter the same owned entity at its anchor point.
const onSeg = (p, s) => {
  const cross = (s.b[0] - s.a[0]) * (p[1] - s.a[1]) - (s.b[1] - s.a[1]) * (p[0] - s.a[0]);
  return Math.abs(cross) < 1e-6 && p[0] >= Math.min(s.a[0], s.b[0]) - 1e-6 && p[0] <= Math.max(s.a[0], s.b[0]) + 1e-6
    && p[1] >= Math.min(s.a[1], s.b[1]) - 1e-6 && p[1] <= Math.max(s.a[1], s.b[1]) + 1e-6;
};
const meet = (s, t) => {
  const d = (s.b[0] - s.a[0]) * (t.b[1] - t.a[1]) - (s.b[1] - s.a[1]) * (t.b[0] - t.a[0]);
  if (Math.abs(d) < 1e-9) return [s.a, s.b, t.a, t.b].filter((p, i) => onSeg(p, i < 2 ? t : s));
  const u = ((t.a[0] - s.a[0]) * (t.b[1] - t.a[1]) - (t.a[1] - s.a[1]) * (t.b[0] - t.a[0])) / d;
  const p = [s.a[0] + u * (s.b[0] - s.a[0]), s.a[1] + u * (s.b[1] - s.a[1])];
  return onSeg(p, s) && onSeg(p, t) ? [p] : [];
};
const sameP = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6;
for (const s of ownSegs) for (const t of ownSegs) {
  if (s.owner === t.owner) continue;
  for (const p of meet(s, t)) {
    const entry = s.child === t.child && sameP(p, shapes.find(sh => sh.id === s.child).top);
    if (!entry) throw new Error(`Ownership lines from ${s.owner} and ${t.owner} share a point (${s.id} / ${t.id})`);
  }
}
for (const d of dots) for (const s of ownSegs) if (s.owner !== d.owner && onSeg(d.p, s)) throw new Error(`Junction dot of ${d.owner} sits on ${s.id}`);

// Legend.
const LY = deFrame.y1 + 26;
g.push(`<rect x="${X0}" y="${LY}" width="${X1 - X0}" height="98" rx="${R}" fill="${C.paper}" stroke="${C.legendBorder}" stroke-width="1"/>`);
text('LEGEND', X0 + 18, LY + 24, { fs: FS.frame, weight: 600, fill: C.muted, spacing: 1.2, owner: 'legend' });
text('Frames group entities by state of formation or trust situs.', X1 - 18, LY + 24, { fs: FS.kind, fill: C.muted, anchor: 'end', owner: 'legend' });
const row1 = LY + 52, row2 = LY + 80;
let lx = X0 + 18;
const mini = (s, wShape, svgAt) => {
  g.push(svgAt(lx, row1));
  text(s, lx + wShape + 9, row1 + 4.5, { fs: FS.legend, owner: 'legend' });
  lx += wShape + 9 + measure(s, FS.legend, 400).x1 + 30;
};
const st = `stroke="${C.ink}" stroke-width="1.2"`;
mini('Corporation', 38, (x, y) => `<rect x="${x}" y="${y - 10}" width="38" height="20" fill="${C.corp}" ${st}/>`);
mini('Partnership', 44, (x, y) => `<polygon points="${x + 22},${y - 10} ${x + 44},${y + 10} ${x},${y + 10}" fill="${C.lp}" ${st} stroke-linejoin="round"/>`);
mini('Disregarded entity', 38, (x, y) => `<rect x="${x}" y="${y - 10}" width="38" height="20" rx="4" fill="${C.llc}" ${st}/><ellipse cx="${x + 19}" cy="${y}" rx="14" ry="6" fill="${C.llcInner}" ${st}/>`);
mini('Trust', 38, (x, y) => `<ellipse cx="${x + 19}" cy="${y}" rx="19" ry="10" fill="${C.trust}" ${st}/>`);
mini('Individual', 20, (x, y) => `<circle cx="${x + 10}" cy="${y}" r="10" fill="${C.person}" ${st}/>`);
lx = X0 + 18;
const legendLine = (stroke, dash, arrow, s) => {
  const x0 = lx, x1 = lx + 40;
  if (arrow) {
    g.push(`<path d="M${x0} ${row2} L${x1 - 9} ${row2}" stroke="${stroke}" stroke-width="1.6"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
    g.push(`<polygon points="${x1},${row2} ${x1 - 9},${row2 - 4.5} ${x1 - 9},${row2 + 4.5}" fill="${stroke}"/>`);
  } else g.push(`<path d="M${x0} ${row2} L${x1} ${row2}" stroke="${stroke}" stroke-width="1.6"/>`);
  text(s, x1 + 9, row2 + 4.5, { fs: FS.legend, owner: 'legend' });
  lx = x1 + 9 + measure(s, FS.legend, 400).x1 + 30;
};
legendLine(C.ink, null, false, 'Ownership, owner above (percentage of interest held)');
legendLine(C.control, '7 4', true, 'Fiduciary control, no economic interest');
legendLine(C.transfer, '2 4', true, 'Gift or distribution');
const H = LY + 98 + X0;

// Geometry checks: the script refuses to write on any collision, clipping or label overflow.
for (const { shape, s, r } of inside) if (!shape.fits(r)) throw new Error(`Label does not fit inside ${shape.id}: ${s}`);
const overlaps = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
const segRect = s => ({ x0: Math.min(s.a[0], s.b[0]), y0: Math.min(s.a[1], s.b[1]), x1: Math.max(s.a[0], s.b[0]), y1: Math.max(s.a[1], s.b[1]) });
for (const t of texts) {
  for (const s of segs) if (overlaps(t.r, segRect(s), 3)) throw new Error(`Text "${t.s}" touches line ${s.id}`);
  for (const u of texts) if (u !== t && overlaps(t.r, u.r, 2)) throw new Error(`Texts overlap: "${t.s}" / "${u.s}"`);
  for (const sh of shapes) if (sh.id !== t.owner && overlaps(t.r, sh.b, 4)) throw new Error(`Text "${t.s}" touches shape ${sh.id}`);
  if (t.r.x0 < 8 || t.r.x1 > W - 8 || t.r.y0 < 8 || t.r.y1 > H - 8) throw new Error(`Text clipped: ${t.s}`);
}
for (const s of segs) for (const sh of shapes) {
  if (s.owners.includes(sh.id)) continue;
  const inner = { x0: sh.b.x0 + 2, y0: sh.b.y0 + 2, x1: sh.b.x1 - 2, y1: sh.b.y1 - 2 };
  if (overlaps(segRect(s), inner)) throw new Error(`Line ${s.id} crosses shape ${sh.id}`);
}
for (const a of shapes) for (const b of shapes) if (a !== b && overlaps(a.b, b.b, 12)) throw new Error(`Shapes too close: ${a.id} / ${b.id}`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<title>Smith Family Office — Dynasty Trust Structure</title>
<desc>Entity structure chart: Robert Smith gifts to a South Dakota dynasty trust administered by Dakota Trust Company; the trust distributes to children's shares and owns 100% of Smith Family Holdings, Inc. and a 99% LP interest in Smith Family Partners, LP; the holding company owns the 1% GP interest and two disregarded Delaware LLCs.</desc>
<rect width="${W}" height="${H}" fill="${C.paper}"/>
${g.join('\n')}
</svg>
`;
await writeFile(new URL('../../visual-eval/exemplars/entity/ideal.svg', import.meta.url), svg);
if (PNG) await writeFile(PNG, new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
console.log('entity ok', W, H);
