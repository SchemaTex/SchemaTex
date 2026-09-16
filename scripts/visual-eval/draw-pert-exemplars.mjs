/**
 * Hand-authored PERT / CPM exemplars: one project drawn four ways.
 *   node scripts/visual-eval/draw-pert-exemplars.mjs [png-dir]
 * Writes visual-eval/exemplars/pert/{network,aoa,timescaled,gantt}/{source.sx,ideal.svg,notes.md}.
 * The schedule (forward and backward pass) is computed here, never typed. Text is
 * measured with resvg using Helvetica Neue; every drawing is checked for text
 * overlap, text crossed by lines, lines through shapes and clipping before writing.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// ── Design tokens ─────────────────────────────────────────────────────────────
// Blue house palette for ordinary work; red is reserved for the critical path.
const C = {
  ink: '#0F172A', muted: '#475569', faint: '#94A3B8', rule: '#CBD5E1', grid: '#E2E8F0',
  paper: '#FFFFFF', blue: '#1D4ED8', blueTint: '#EFF6FF', blueBar: '#DBEAFE',
  red: '#C62828', redTint: '#FDECEC', weekend: '#F1F5F9', link: '#64748B',
};
// Helvetica Neue for everything: neutral, compact numerals that stay legible at 12 px.
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 24, subtitle: 14, label: 13, small: 12 };
const SW = { crit: 2.5, link: 1.5, box: 1.25, rule: 1 };
const OUT = new URL('../../visual-eval/exemplars/pert/', import.meta.url);
const PNG_DIR = process.argv[2];

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Project and schedule ──────────────────────────────────────────────────────
const TITLE = 'Warehouse management system rollout';
const TASKS = [
  { id: 'A', name: 'Requirements', dur: 5, after: [], lane: 'Planning' },
  { id: 'B', name: 'Buy hardware', dur: 10, after: ['A'], lane: 'Infrastructure' },
  { id: 'C', name: 'Configure WMS', dur: 15, after: ['A'], lane: 'Software' },
  { id: 'D', name: 'Install scanners', dur: 8, after: ['B'], lane: 'Infrastructure' },
  { id: 'E', name: 'ERP integration', dur: 12, after: ['C'], lane: 'Software' },
  { id: 'F', name: 'System test', dur: 6, after: ['D', 'E'], lane: 'Software' },
  { id: 'G', name: 'Write SOPs', dur: 10, after: ['A'], lane: 'Operations' },
  { id: 'H', name: 'Train staff', dur: 5, after: ['F', 'G'], lane: 'Operations' },
  { id: 'I', name: 'Load data', dur: 4, after: ['E'], lane: 'Software' },
  { id: 'J', name: 'Go-live', dur: 0, after: ['H', 'I'], lane: 'Operations', milestone: true },
];
const T = Object.fromEntries(TASKS.map(t => [t.id, t]));
for (const t of TASKS) { t.es = Math.max(0, ...t.after.map(p => T[p].ef)); t.ef = t.es + t.dur; }
const PROJECT = Math.max(...TASKS.map(t => t.ef));
for (const t of [...TASKS].reverse()) {
  const succ = TASKS.filter(s => s.after.includes(t.id));
  t.lf = succ.length ? Math.min(...succ.map(s => s.ls)) : PROJECT;
  t.ls = t.lf - t.dur; t.tf = t.ls - t.es; t.crit = t.tf === 0;
  t.ff = (succ.length ? Math.min(...succ.map(s => s.es)) : PROJECT) - t.ef;
}
const CRIT = TASKS.filter(t => t.crit).map(t => t.id);
if (PROJECT !== 43 || CRIT.join('') !== 'ACEFHJ') throw new Error(`Schedule changed: ${PROJECT} ${CRIT}`);

// ── Drawing surface with geometry checks ──────────────────────────────────────
const cache = new Map();
function measure(s, fs, weight, anchor) {
  const key = JSON.stringify([s, fs, weight, anchor]);
  if (!cache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b) throw new Error(`Cannot measure ${s}`);
    cache.set(key, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 });
  }
  return cache.get(key);
}

class Doc {
  constructor(name, W, H) { Object.assign(this, { name, W, H, g: [], texts: [], segs: [], shapes: [] }); }
  raw(s) { this.g.push(s); }
  text(s, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start', inside, italic = false } = {}) {
    if (fs < 11) throw new Error(`${this.name}: text under 11 px: ${s}`);
    const m = measure(s, fs, weight, anchor);
    const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 };
    this.texts.push({ s, r, inside });
    this.g.push(`<text x="${x}" y="${y}" font-size="${fs}"${weight !== 400 ? ` font-weight="${weight}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${italic ? ' font-style="italic"' : ''} fill="${fill}">${esc(s)}</text>`);
    return r;
  }
  width(s, fs = FS.label, weight = 400) { const m = measure(s, fs, weight, 'start'); return m.x1 - m.x0; }
  // Polyline; `attach` names shapes the line may touch (its endpoints).
  path(pts, { stroke = C.link, w = SW.link, dash, attach = [], arrow = true, check = true } = {}) {
    if (check) for (let i = 1; i < pts.length; i++) this.segs.push({ a: pts[i - 1], b: pts[i], attach });
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${r1(p[0])} ${r1(p[1])}`).join(' ');
    this.g.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linejoin="round"/>`);
    if (arrow) this.arrow(pts[pts.length - 2], pts[pts.length - 1], stroke, w);
  }
  arrow(p, q, fill, w) {
    const L = w > 2 ? 11 : 9, Wd = w > 2 ? 5 : 4.2;
    const dx = q[0] - p[0], dy = q[1] - p[1], n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
    const bx = q[0] - ux * L, by = q[1] - uy * L;
    this.g.push(`<polygon points="${r1(q[0])},${r1(q[1])} ${r1(bx - uy * Wd)},${r1(by + ux * Wd)} ${r1(bx + uy * Wd)},${r1(by - ux * Wd)}" fill="${fill}"/>`);
  }
  shape(id, x0, y0, x1, y1) { this.shapes.push({ id, x0, y0, x1, y1 }); }
  dot(x, y, fill) { this.g.push(`<circle cx="${x}" cy="${y}" r="3" fill="${fill}"/>`); }
  check() {
    const errs = [];
    const ov = (a, b, p = 0) => a.x0 < b.x1 + p && b.x0 < a.x1 + p && a.y0 < b.y1 + p && b.y0 < a.y1 + p;
    for (let i = 0; i < this.texts.length; i++) {
      const t = this.texts[i];
      if (t.r.x0 < 8 || t.r.x1 > this.W - 8 || t.r.y0 < 8 || t.r.y1 > this.H - 8) errs.push(`clipped: ${t.s}`);
      for (let j = i + 1; j < this.texts.length; j++) if (ov(t.r, this.texts[j].r, 2)) errs.push(`text overlap: ${t.s} / ${this.texts[j].s}`);
      for (const s of this.segs) if (segHitsRect(s.a, s.b, grow(t.r, 3))) errs.push(`line crosses text: ${t.s}`);
      for (const sh of this.shapes) {
        if (t.inside === sh.id) { if (!(t.r.x0 >= sh.x0 + 3 && t.r.x1 <= sh.x1 - 3 && t.r.y0 >= sh.y0 + 2 && t.r.y1 <= sh.y1 - 2)) errs.push(`text escapes ${sh.id}: ${t.s}`); }
        else if (ov(t.r, sh, 2)) errs.push(`text on shape ${sh.id}: ${t.s}`);
      }
    }
    for (const s of this.segs) for (const sh of this.shapes) {
      if (s.attach.includes(sh.id)) continue;
      if (segHitsRect(s.a, s.b, grow(sh, -1))) errs.push(`line through ${sh.id}`);
    }
    if (errs.length) throw new Error(`${this.name}:\n  ${[...new Set(errs)].join('\n  ')}`);
  }
  svg(title, desc) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.W}" height="${this.H}" viewBox="0 0 ${this.W} ${this.H}" font-family="${FONT}">
<title>${esc(title)}</title>
<desc>${esc(desc)}</desc>
<rect width="${this.W}" height="${this.H}" fill="${C.paper}"/>
${this.g.join('\n')}
</svg>
`;
  }
}
const r1 = v => Math.round(v * 10) / 10;
const grow = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
function segHitsRect(a, b, r) {
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - r.x0], [dx, r.x1 - a[0]], [-dy, a[1] - r.y0], [dy, r.y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const u = q / p;
    if (p < 0) { if (u > t1) return false; if (u > t0) t0 = u; } else { if (u < t0) return false; if (u < t1) t1 = u; }
  }
  return t0 < t1;
}
function header(doc, subtitle) {
  doc.text(TITLE, 48, 46, { fs: FS.title, weight: 700 });
  doc.text(subtitle, 48, 72, { fs: FS.subtitle, fill: C.muted });
}
const SUB = `${PROJECT} working days · critical path A – C – E – F – H – J`;

// ── Variant 1: activity-on-node network ───────────────────────────────────────
function drawNetwork() {
  const BW = 176, BH = 102, PX = 216, PY = 140, X0 = 48, Y0 = 118;
  const cols = 6, W = X0 * 2 + (cols - 1) * PX + BW, H = 856;
  const d = new Doc('network', W, H);
  header(d, `Activity-on-node precedence network · ${SUB}`);
  const place = { G: [1, 0], B: [1, 1], D: [2, 1], A: [0, 2], C: [1, 2], E: [2, 2], F: [3, 2], H: [4, 2], J: [5, 2], I: [3, 3] };
  const box = id => { const [c, r] = place[id]; const x = X0 + c * PX, y = Y0 + r * PY; return { x, y, r: x + BW, b: y + BH, cx: x + BW / 2, cy: y + BH / 2 }; };
  const node = (x, y, w, h, t, key) => {
    const crit = t ? t.crit : false, stroke = crit ? C.red : C.blue, tint = crit ? C.redTint : C.blueTint, id = key ? 'key' : t.id;
    const hh = 28;
    d.shape(id, x, y, x + w, y + h);
    d.raw(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${C.paper}" stroke="${stroke}" stroke-width="${crit ? SW.crit : SW.box}"/>`);
    d.raw(`<path d="M${x + 1} ${y + hh}H${x + w - 1}M${x + 1} ${y + h - hh}H${x + w - 1}" stroke="${stroke}" stroke-width="1"/>`);
    d.raw(`<rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${hh - 2}" rx="3" fill="${tint}"/><rect x="${x + 1.5}" y="${y + h - hh + 0.5}" width="${w - 3}" height="${hh - 2}" rx="3" fill="${tint}"/>`);
    d.raw(`<path d="M${x + w / 3} ${y + 1}V${y + hh}M${x + 2 * w / 3} ${y + 1}V${y + hh}M${x + w / 3} ${y + h - hh}V${y + h - 1}M${x + 2 * w / 3} ${y + h - hh}V${y + h - 1}" stroke="${stroke}" stroke-width="1"/>`);
    const cells = key ? [['Early start', 'Duration', 'Early finish'], ['Late start', 'Total float', 'Late finish']]
      : [[t.es, t.dur, t.ef], [t.ls, t.tf, t.lf]];
    const numFill = crit ? C.red : C.ink;
    cells.forEach((row, ri) => row.forEach((v, ci) => d.text(String(v), x + (ci + 0.5) * w / 3, y + (ri ? h - 9 : 19), { fs: key ? FS.small : FS.label, weight: key || ci === 1 ? 400 : 600, anchor: 'middle', fill: key ? C.muted : numFill, inside: id })));
    if (key) d.text('Activity ID · name', x + w / 2, y + h / 2 + 5, { weight: 700, anchor: 'middle', inside: id });
    else {
      const label = `${t.id} · ${t.name}`, lw = d.width(label, FS.label, 700);
      let tx = x + w / 2 - lw / 2;
      if (t.milestone) {
        const mx = tx - 1, my = y + h / 2; tx += 8;
        d.raw(`<polygon points="${mx - 7},${my} ${mx},${my - 7} ${mx + 7},${my} ${mx},${my + 7}" fill="${C.red}"/>`);
      }
      d.text(label, tx, y + h / 2 + 5, { weight: 700, inside: id });
    }
  };
  for (const t of TASKS) { const b = box(t.id); node(b.x, b.y, BW, BH, t); }

  const gap = (c) => X0 + c * PX + BW + (PX - BW) / 2; // x centre of gutter right of column c
  const grey = { stroke: C.link, w: SW.link }, red = { stroke: C.red, w: SW.crit };
  const A = box('A'), Bx = box('B'), G = box('G'), Cb = box('C'), D = box('D'), E = box('E'), F = box('F'), Hb = box('H'), I = box('I'), J = box('J');
  // A fans out to B and G up one shared trunk; A → C is the critical straight run.
  const tx = gap(0);
  d.path([[A.r, A.cy], [tx, A.cy], [tx, G.cy], [G.x, G.cy]], { ...grey, attach: ['A', 'G'] });
  d.path([[tx, Bx.cy], [Bx.x, Bx.cy]], { ...grey, attach: ['B'] });
  d.dot(tx, A.cy, C.link); d.dot(tx, Bx.cy, C.link);
  d.path([[A.r, A.cy], [Cb.x, Cb.cy]], { ...red, attach: ['A', 'C'] });
  d.path([[Bx.r, Bx.cy], [D.x, D.cy]], { ...grey, attach: ['B', 'D'] });
  d.path([[Cb.r, Cb.cy], [E.x, E.cy]], { ...red, attach: ['C', 'E'] });
  // Gutter between E and F: E → I branches off near E, D → F merges near F.
  const g2 = gap(2), xi = g2 - 9, xd = g2 + 7;
  d.path([[D.r, D.cy], [xd, D.cy], [xd, F.cy]], { ...grey, attach: ['D'], arrow: false });
  d.path([[xi, E.cy], [xi, I.cy], [I.x, I.cy]], { ...grey, attach: ['I'] });
  d.path([[E.r, E.cy], [F.x, F.cy]], { ...red, attach: ['E', 'F'] });
  d.dot(xi, E.cy, C.red); d.dot(xd, F.cy, C.red);
  d.path([[F.r, F.cy], [Hb.x, Hb.cy]], { ...red, attach: ['F', 'H'] });
  d.path([[G.r, G.cy], [Hb.cx, G.cy], [Hb.cx, Hb.y]], { ...grey, attach: ['G', 'H'] });
  d.path([[Hb.r, Hb.cy], [J.x, J.cy]], { ...red, attach: ['H', 'J'] });
  d.path([[I.r, I.cy], [J.cx, I.cy], [J.cx, J.b]], { ...grey, attach: ['I', 'J'] });

  // Legend: node key + line key.
  const ly = 676;
  d.raw(`<path d="M48 ${ly - 22}H${W - 48}" stroke="${C.grid}" stroke-width="1"/>`);
  d.text('Reading a node', 48, ly, { fs: FS.small, weight: 700, fill: C.muted });
  node(48, ly + 14, 300, BH, null, true);
  const lx = 420;
  d.text('Links', lx, ly, { fs: FS.small, weight: 700, fill: C.muted });
  d.path([[lx, ly + 40], [lx + 56, ly + 40]], { ...red, check: false });
  d.text('Critical path: zero total float, any delay moves go-live', lx + 72, ly + 45);
  d.path([[lx, ly + 76], [lx + 56, ly + 76]], { ...grey, check: false });
  d.text('Finish-to-start dependency with float', lx + 72, ly + 81);
  d.raw(`<polygon points="${lx + 21},${ly + 112} ${lx + 28},${ly + 105} ${lx + 35},${ly + 112} ${lx + 28},${ly + 119}" fill="${C.red}"/>`);
  d.text('Milestone (zero duration)', lx + 72, ly + 117);
  d.text('Durations and dates in working days from kickoff (day 0).', lx, ly + 150, { fs: FS.small, fill: C.muted });
  d.check();
  return d.svg(`${TITLE} — activity-on-node network`, `Precedence diagram of ${TASKS.length} activities with early and late dates and total float; critical path ${CRIT.join(', ')} takes ${PROJECT} days.`);
}

// ── Variant 2: activity-on-arrow network ──────────────────────────────────────
function drawAoa() {
  const W = 1310, H = 700, R = 32, SY = 372, UY = SY - 112, GY = SY - 206, DY = SY + 112;
  const d = new Doc('aoa', W, H);
  header(d, `Activity-on-arrow (i–j) network · ${SUB}`);
  const EV = { 1: [90, SY], 2: [290, SY], 4: [490, SY], 5: [690, SY], 6: [820, SY], 7: [1020, SY], 8: [1220, SY], 3: [555, UY] };
  // Event times: earliest = max over incoming, latest = min over outgoing.
  const ARC = [['A', 1, 2], ['B', 2, 3], ['C', 2, 4], ['G', 2, 7], ['D', 3, 6], ['E', 4, 5], [null, 5, 6], ['F', 6, 7], ['I', 5, 8], ['H', 7, 8]];
  const te = {}, tl = {};
  const dur = a => (a[0] ? T[a[0]].dur : 0);
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) te[n] = Math.max(0, ...ARC.filter(a => a[2] === n).map(a => te[a[1]] + dur(a)));
  for (const n of [8, 7, 6, 5, 4, 3, 2, 1]) { const out = ARC.filter(a => a[1] === n); tl[n] = out.length ? Math.min(...out.map(a => tl[a[2]] - dur(a))) : te[8]; }
  if (te[8] !== PROJECT) throw new Error('AOA event graph disagrees with AON schedule');
  const critArc = a => te[a[1]] === tl[a[1]] && te[a[2]] === tl[a[2]] && te[a[1]] + dur(a) === te[a[2]];
  const k = Math.SQRT1_2 * R;
  const style = a => (critArc(a) ? { stroke: C.red, w: SW.crit } : { stroke: C.link, w: SW.link });
  const label = (a, x, yAbove, yBelow) => {
    const t = T[a[0]], fill = critArc(a) ? C.red : C.ink;
    d.text(`${t.id} · ${t.name}`, x, yAbove, { weight: 600, anchor: 'middle', fill });
    d.text(`${t.dur} d`, x, yBelow, { fs: FS.small, anchor: 'middle', fill: C.muted });
  };
  const ev = n => EV[n];
  for (const a of ARC) {
    const [p, q] = [ev(a[1]), ev(a[2])], st = style(a), att = [`e${a[1]}`, `e${a[2]}`];
    if (a[0] === 'B') {
      const s = [p[0] + k, p[1] - k], turn = [s[0] + (s[1] - UY), UY];
      d.path([s, turn, [q[0] - R, UY]], { ...st, attach: att });
      d.text(`${T.B.id} · ${T.B.name}`, q[0] - R - 10, UY - 9, { weight: 600, anchor: 'end' });
      d.text(`${T.B.dur} d`, (turn[0] + q[0] - R) / 2, UY + 21, { fs: FS.small, anchor: 'middle', fill: C.muted });
    } else if (a[0] === 'D') {
      const e = [q[0] - k, q[1] - k], turn = [e[0] - (e[1] - UY), UY];
      d.path([[p[0] + R, UY], turn, e], { ...st, attach: att });
      d.text(`${T.D.id} · ${T.D.name}`, p[0] + R + 10, UY - 9, { weight: 600 });
      d.text(`${T.D.dur} d`, (p[0] + R + turn[0]) / 2, UY + 21, { fs: FS.small, anchor: 'middle', fill: C.muted });
    } else if (a[0] === 'G') {
      d.path([[p[0], p[1] - R], [p[0], GY], [q[0], GY], [q[0], q[1] - R]], { ...st, attach: att });
      label(a, (p[0] + q[0]) / 2, GY - 9, GY + 21);
    } else if (a[0] === 'I') {
      const s = [p[0] + k, p[1] + k], t1 = [s[0] + (DY - s[1]), DY], e = [q[0] - k, q[1] + k], t2 = [e[0] - (DY - e[1]), DY];
      d.path([s, t1, t2, e], { ...st, attach: att });
      label(a, (t1[0] + t2[0]) / 2, DY - 9, DY + 21);
    } else {
      d.path([[p[0] + R, SY], [q[0] - R, SY]], { ...st, attach: att, dash: a[0] ? undefined : '7 5' });
      if (a[0]) label(a, (p[0] + q[0]) / 2, SY - 10, SY + 22);
    }
  }
  const circle = (n, x, y, e, l, crit, id) => {
    const stroke = crit ? C.red : C.blue;
    d.shape(id, x - R, y - R, x + R, y + R);
    d.raw(`<circle cx="${x}" cy="${y}" r="${R}" fill="${C.paper}" stroke="${stroke}" stroke-width="${crit ? SW.crit : SW.box + 0.5}"/>`);
    d.raw(`<path d="M${x - R} ${y}H${x + R}M${x} ${y}V${y + R}" stroke="${stroke}" stroke-width="1"/>`);
    d.text(String(n), x, y - 9, { fs: 15, weight: 700, anchor: 'middle', fill: crit ? C.red : C.blue, inside: id });
    d.text(String(e), x - 12, y + 18, { fs: FS.small, anchor: 'middle', inside: id });
    d.text(String(l), x + 12, y + 18, { fs: FS.small, anchor: 'middle', inside: id });
  };
  for (const n of Object.keys(EV).map(Number)) circle(n, EV[n][0], EV[n][1], te[n], tl[n], te[n] === tl[n], `e${n}`);

  const ly = 566;
  d.raw(`<path d="M48 ${ly - 26}H${W - 48}" stroke="${C.grid}" stroke-width="1"/>`);
  d.text('Reading an event', 48, ly, { fs: FS.small, weight: 700, fill: C.muted });
  circle(3, 88, ly + 56, 15, 24, false, 'key');
  d.text('Event number', 136, ly + 36, { fs: FS.small });
  d.text('Earliest time (15) · latest time (24)', 136, ly + 76, { fs: FS.small });
  d.text('Slack at event 3 = 24 − 15 = 9 days', 136, ly + 96, { fs: FS.small, fill: C.muted });
  const lx = 560;
  d.text('Arrows', lx, ly, { fs: FS.small, weight: 700, fill: C.muted });
  d.path([[lx, ly + 30], [lx + 56, ly + 30]], { stroke: C.red, w: SW.crit, check: false });
  d.text('Critical activity: name above, duration below', lx + 72, ly + 35);
  d.path([[lx, ly + 62], [lx + 56, ly + 62]], { stroke: C.link, w: SW.link, check: false });
  d.text('Activity with float', lx + 72, ly + 67);
  d.path([[lx, ly + 94], [lx + 56, ly + 94]], { stroke: C.red, w: SW.crit, dash: '7 5', check: false });
  d.text('Dummy: zero-time logic link (F needs both D and E; I needs only E)', lx + 72, ly + 99);
  d.check();
  return d.svg(`${TITLE} — activity-on-arrow network`, `Arrow diagram with ${Object.keys(EV).length} numbered events and one dummy; critical path 1-2-4-5-6-7-8 takes ${PROJECT} days.`);
}

// ── Variant 3: time-scaled logic diagram ──────────────────────────────────────
function drawTimescaled() {
  const DAY = 27, X0 = 72, W = X0 + 45 * DAY + 100, H = 640, BH = 44, IN = 12;
  const ROW = { G: 0, B: 1, D: 1, A: 2, C: 2, E: 2, F: 2, H: 2, J: 2, I: 3 };
  const RY = r => 186 + r * 90;
  const X = t => X0 + t * DAY;
  const d = new Doc('timescaled', W, H);
  header(d, `Time-scaled logic diagram · ${SUB}`);
  const top = 112, bottom = RY(3) + 50;
  // Time axis: a light grid every 5 days, labelled top and bottom.
  d.text('Day', X0 - 12, top - 8, { fs: FS.small, anchor: 'end', fill: C.muted });
  for (let t = 0; t <= 45; t += 5) {
    d.raw(`<path d="M${X(t)} ${top}V${bottom}" stroke="${C.grid}" stroke-width="1"/>`);
    d.text(String(t), X(t), top - 8, { fs: FS.small, anchor: 'middle', fill: C.muted });
    d.text(String(t), X(t), bottom + 18, { fs: FS.small, anchor: 'middle', fill: C.muted });
  }
  d.raw(`<path d="M${X0} ${top}H${X(45)}M${X0} ${bottom}H${X(45)}" stroke="${C.rule}" stroke-width="1"/>`);
  const pe = X(PROJECT);
  d.raw(`<path d="M${pe} ${top}V${bottom}" stroke="${C.red}" stroke-width="1" stroke-dasharray="3 3"/>`);

  const bar = t => ({ x0: X(t.es) + IN, x1: X(t.ef), y0: RY(ROW[t.id]) - BH / 2, y1: RY(ROW[t.id]) + BH / 2, cy: RY(ROW[t.id]) });
  const red = { stroke: C.red, w: SW.crit }, grey = { stroke: C.link, w: SW.link };
  const floatLine = (t, toX, label) => {
    const b = bar(t);
    d.path([[b.x1, b.cy], [toX, b.cy]], { stroke: C.link, w: SW.link, dash: '5 4', arrow: false });
    d.raw(`<path d="M${toX} ${b.cy - 6}V${b.cy + 6}" stroke="${C.link}" stroke-width="${SW.link}"/>`);
    d.text(label, (b.x1 + toX) / 2, b.cy - 8, { fs: FS.small, anchor: 'middle', fill: C.muted });
  };
  // Float first so bars paint on top.
  floatLine(T.G, X(T.H.es), `float ${T.G.tf} d`);
  floatLine(T.D, X(T.F.es), `float ${T.D.tf} d (shared with B)`);
  floatLine(T.I, X(T.J.es), `float ${T.I.tf} d`);
  // Links: leave the end of a bar, enter the start of the next.
  const A = bar(T.A), B = bar(T.B), G = bar(T.G), D = bar(T.D), E = bar(T.E), F = bar(T.F), Hh = bar(T.H), I = bar(T.I);
  d.path([[A.x1, A.y0], [A.x1, G.cy], [G.x0, G.cy]], { ...grey, attach: ['A', 'G'] });
  d.path([[A.x1, B.cy], [B.x0, B.cy]], { ...grey, attach: ['B'] });
  d.dot(A.x1, B.cy, C.link);
  for (const [p, q] of [['A', 'C'], ['C', 'E'], ['E', 'F'], ['F', 'H']]) { const bp = bar(T[p]), bq = bar(T[q]); d.path([[bp.x1, bp.cy], [bq.x0, bq.cy]], { ...red, attach: [p, q] }); }
  d.path([[B.x1, B.cy], [D.x0, D.cy]], { ...grey, attach: ['B', 'D'] });
  d.path([[X(T.F.es), D.cy], [F.x0 + 8, D.cy], [F.x0 + 8, F.y0]], { ...grey, attach: ['F'] });
  d.path([[E.x1, E.y1], [E.x1, I.cy], [I.x0, I.cy]], { ...grey, attach: ['E', 'I'] });
  d.path([[X(T.H.es), G.cy], [Hh.x0 + 8, G.cy], [Hh.x0 + 8, Hh.y0]], { ...grey, attach: ['H'] });
  const jx = X(PROJECT) + IN + 13, jy = RY(2);
  d.shape('J', jx - 13, jy - 13, jx + 13, jy + 13);
  d.path([[Hh.x1, Hh.cy], [jx - 13, jy]], { ...red, attach: ['H', 'J'] });
  d.path([[X(T.J.es), I.cy], [jx, I.cy], [jx, jy + 13]], { ...grey, attach: ['J'] });
  d.raw(`<polygon points="${jx - 13},${jy} ${jx},${jy - 13} ${jx + 13},${jy} ${jx},${jy + 13}" fill="${C.red}"/>`);
  d.text('J · Go-live', jx + 20, jy + 5, { weight: 700, fill: C.red });

  for (const t of TASKS.filter(t => !t.milestone)) {
    const b = bar(t), crit = t.crit;
    d.shape(t.id, b.x0, b.y0, b.x1, b.y1);
    d.raw(`<rect x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0}" height="${BH}" rx="4" fill="${crit ? C.redTint : C.blueBar}" stroke="${crit ? C.red : C.blue}" stroke-width="${crit ? SW.crit : SW.box}"/>`);
    d.text(`${t.id} · ${t.name}`, b.x0 + 8, b.cy - 4, { weight: 700, fill: crit ? C.red : C.ink, inside: t.id });
    d.text(`${t.es}–${t.ef} · ${t.dur} d`, b.x0 + 8, b.cy + 14, { fs: FS.small, fill: C.muted, inside: t.id });
  }

  const ly = bottom + 60;
  d.raw(`<path d="M48 ${ly - 20}H${W - 48}" stroke="${C.grid}" stroke-width="1"/>`);
  const items = [
    [() => d.raw(`<rect x="48" y="${ly - 10}" width="44" height="20" rx="3" fill="${C.redTint}" stroke="${C.red}" stroke-width="${SW.crit}"/>`), 'Critical activity: bar starts at early start, length = duration'],
    [() => d.raw(`<rect x="48" y="${ly + 22}" width="44" height="20" rx="3" fill="${C.blueBar}" stroke="${C.blue}" stroke-width="${SW.box}"/>`), 'Activity with float (inside: early start–early finish · duration)'],
  ];
  items.forEach(([draw, s], i) => { draw(); d.text(s, 104, ly + 5 + i * 32); });
  const lx = 700;
  d.raw(`<path d="M${lx} ${ly}H${lx + 44}" stroke="${C.link}" stroke-width="${SW.link}" stroke-dasharray="5 4"/><path d="M${lx + 44} ${ly - 6}V${ly + 6}" stroke="${C.link}" stroke-width="${SW.link}"/>`);
  d.text('Float: time the activity can slip before its successor must start', lx + 58, ly + 5);
  d.path([[lx, ly + 32], [lx + 44, ly + 32]], { ...grey, check: false });
  d.text('Finish-to-start link, drawn at the day it happens', lx + 58, ly + 37);
  d.check();
  return d.svg(`${TITLE} — time-scaled logic diagram`, `Activities as bars on a working-day axis at their early start with float shown as dashed extensions; project ends day ${PROJECT}.`);
}

// ── Variant 4: calendar Gantt ─────────────────────────────────────────────────
const START = Date.UTC(2026, 9, 5); // Monday 5 October 2026
const DAYMS = 86400000;
const workDate = n => START + (Math.floor(n / 5) * 7 + (n % 5)) * DAYMS; // 5-day calendar
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = ms => { const dt = new Date(ms); return `${DOW[dt.getUTCDay()]} ${dt.getUTCDate()} ${MON[dt.getUTCMonth()]}`; };
function drawGantt() {
  const DAYPX = 12, X0 = 492, NDAYS = 70, W = X0 + NDAYS * DAYPX + 44, RH = 32, SH = 30;
  const col = { name: 48, days: 272, start: 300, finish: 392 };
  const cal = ms => X0 + Math.round((ms - START) / DAYMS) * DAYPX;
  const lanes = ['Planning', 'Infrastructure', 'Software', 'Operations'];
  const rows = [];
  for (const l of lanes) { rows.push({ lane: l }); for (const t of TASKS.filter(t => t.lane === l).sort((a, b) => a.es - b.es || a.ef - b.ef)) rows.push({ t }); }
  const top = 150;
  let y = top;
  for (const r of rows) { r.y = y; y += r.lane ? SH : RH; }
  const bottom = y, H = bottom + 110;
  const d = new Doc('gantt', W, H);
  header(d, `Critical-path Gantt chart · ${fmt(workDate(0))} – ${fmt(workDate(PROJECT - 1))} 2026 · ${PROJECT} working days, Monday–Friday calendar`);
  // Timescale: months, then week-commencing Mondays; weekends shaded.
  const gridTop = 96;
  d.raw(`<rect x="${X0}" y="${gridTop}" width="${NDAYS * DAYPX}" height="${bottom - gridTop}" fill="none" stroke="${C.rule}" stroke-width="1"/>`);
  for (let i = 0; i < NDAYS; i++) {
    const dt = new Date(START + i * DAYMS);
    if (dt.getUTCDay() === 0 || dt.getUTCDay() === 6) d.raw(`<rect x="${X0 + i * DAYPX}" y="${gridTop + 54}" width="${DAYPX}" height="${bottom - gridTop - 54}" fill="${C.weekend}"/>`);
  }
  let mStart = 0;
  for (let i = 0; i <= NDAYS; i++) {
    const dt = new Date(START + i * DAYMS);
    if (i === NDAYS || (i > 0 && dt.getUTCDate() === 1)) {
      const prev = new Date(START + mStart * DAYMS), xa = X0 + mStart * DAYPX, xb = X0 + i * DAYPX;
      if (xb - xa > 90) d.text(`${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][prev.getUTCMonth()]} ${prev.getUTCFullYear()}`, xa + 8, gridTop + 19, { fs: FS.small, weight: 700 });
      if (i < NDAYS) d.raw(`<path d="M${xb} ${gridTop}V${gridTop + 27}" stroke="${C.rule}" stroke-width="1"/>`);
      mStart = i;
    }
    if (i < NDAYS && dt.getUTCDay() === 1) {
      d.raw(`<path d="M${X0 + i * DAYPX} ${gridTop + 27}V${bottom}" stroke="${i ? C.grid : C.rule}" stroke-width="1"/>`);
      d.text(`${dt.getUTCDate()} ${MON[dt.getUTCMonth()]}`, X0 + i * DAYPX + 6, gridTop + 46, { fs: FS.small, fill: C.muted });
    }
  }
  d.raw(`<path d="M${X0} ${gridTop + 27}H${X0 + NDAYS * DAYPX}M${X0 - 444} ${top}H${X0 + NDAYS * DAYPX}" stroke="${C.rule}" stroke-width="1"/>`);
  // Table header.
  d.text('Activity', col.name, top - 12, { fs: FS.small, weight: 700, fill: C.muted });
  d.text('Days', col.days, top - 12, { fs: FS.small, weight: 700, fill: C.muted, anchor: 'end' });
  d.text('Start', col.start, top - 12, { fs: FS.small, weight: 700, fill: C.muted });
  d.text('Finish', col.finish, top - 12, { fs: FS.small, weight: 700, fill: C.muted });

  for (const r of rows) {
    if (r.lane) {
      d.raw(`<rect x="${col.name - 8}" y="${r.y}" width="${X0 - col.name + 8}" height="${SH}" fill="${C.blueTint}"/><path d="M${col.name - 8} ${r.y + SH}H${X0 + NDAYS * DAYPX}" stroke="${C.grid}" stroke-width="1"/>`);
      d.text(r.lane, col.name, r.y + 20, { fs: FS.label, weight: 700, fill: C.blue });
      continue;
    }
    const t = r.t, cy = r.y + RH / 2, crit = t.crit, fill = crit ? C.red : C.ink;
    d.raw(`<path d="M${col.name - 8} ${r.y + RH}H${X0 + NDAYS * DAYPX}" stroke="${C.grid}" stroke-width="1"/>`);
    d.text(t.id, col.name, cy + 5, { fs: FS.label, weight: 700, fill: crit ? C.red : C.muted });
    d.text(t.name, col.name + 22, cy + 5, { fs: FS.label, fill });
    if (t.milestone) {
      const mx = cal(workDate(t.es - 1)) + DAYPX;
      d.text('0', col.days, cy + 5, { fs: FS.label, anchor: 'end' });
      d.text(fmt(workDate(t.es - 1)), col.start, cy + 5, { fs: FS.label });
      d.text(fmt(workDate(t.es - 1)), col.finish, cy + 5, { fs: FS.label });
      d.shape(t.id, mx - 9, cy - 9, mx + 9, cy + 9);
      d.raw(`<polygon points="${mx - 9},${cy} ${mx},${cy - 9} ${mx + 9},${cy} ${mx},${cy + 9}" fill="${crit ? C.red : C.blue}"/>`);
      d.text(`Go-live ${fmt(workDate(t.es - 1))}`, mx + 16, cy + 5, { fs: FS.small, weight: 700, fill: C.red });
      continue;
    }
    d.text(String(t.dur), col.days, cy + 5, { fs: FS.label, anchor: 'end' });
    d.text(fmt(workDate(t.es)), col.start, cy + 5, { fs: FS.label });
    d.text(fmt(workDate(t.ef - 1)), col.finish, cy + 5, { fs: FS.label });
    const x0 = cal(workDate(t.es)), x1 = cal(workDate(t.ef - 1)) + DAYPX;
    if (t.tf > 0) {
      const xl = cal(workDate(t.lf - 1)) + DAYPX;
      d.raw(`<path d="M${x1} ${cy}H${xl}M${xl} ${cy - 6}V${cy + 6}" stroke="${C.link}" stroke-width="${SW.link}" stroke-dasharray="0"/>`);
      d.segs.push({ a: [x1, cy], b: [xl, cy], attach: [t.id] });
      d.text(`${t.tf} d float`, xl + 7, cy + 4, { fs: FS.small, fill: C.muted });
    }
    d.shape(t.id, x0, cy - 8, x1, cy + 8);
    d.raw(`<rect x="${x0}" y="${cy - 8}" width="${x1 - x0}" height="16" rx="3" fill="${crit ? C.red : C.blueBar}" stroke="${crit ? C.red : C.blue}" stroke-width="${SW.box}"/>`);
  }
  d.raw(`<path d="M${col.name - 8} ${bottom}H${X0}" stroke="${C.rule}" stroke-width="1"/>`);
  const ly = bottom + 44;
  d.raw(`<rect x="48" y="${ly - 12}" width="40" height="16" rx="3" fill="${C.red}"/>`);
  d.text('Critical activity (zero float)', 98, ly + 1);
  d.raw(`<rect x="320" y="${ly - 12}" width="40" height="16" rx="3" fill="${C.blueBar}" stroke="${C.blue}" stroke-width="${SW.box}"/>`);
  d.text('Activity with float', 370, ly + 1);
  d.raw(`<path d="M540 ${ly - 4}H584M584 ${ly - 10}V${ly + 2}" stroke="${C.link}" stroke-width="${SW.link}"/>`);
  d.text('Total float to late finish', 594, ly + 1);
  d.raw(`<polygon points="800,${ly - 4} 809,${ly - 13} 818,${ly - 4} 809,${ly + 5}" fill="${C.red}"/>`);
  d.text('Milestone', 828, ly + 1);
  d.raw(`<rect x="940" y="${ly - 12}" width="26" height="16" fill="${C.weekend}" stroke="${C.grid}"/>`);
  d.text('Weekend (non-working)', 976, ly + 1);
  d.text('Dates computed from the dependencies; bars span start of first day to end of last working day.', 48, ly + 32, { fs: FS.small, fill: C.muted });
  d.check();
  return d.svg(`${TITLE} — calendar Gantt chart`, `Gantt chart on a Monday–Friday calendar from 5 Oct 2026, grouped by workstream, critical bars red, float shown to late finish; go-live ${fmt(workDate(PROJECT - 1))}.`);
}

// ── Sources, notes, output ────────────────────────────────────────────────────
function source(kind) {
  const head = kind === 'gantt'
    ? [`gantt "${TITLE}"`, 'start: 2026-10-05', 'calendar: 5day', 'unit: days']
    : ['pert', `title: "${TITLE}"`, 'unit: days', `layout: ${kind}`];
  const pad = Math.max(...TASKS.map(t => t.name.length)) + 2;
  const lines = TASKS.map(t => {
    const dur = t.milestone ? 'milestone' : `duration: ${String(t.dur).padEnd(2)}`;
    const after = t.after.length ? ` after: ${t.after.join(', ')}` : '';
    const lane = kind === 'gantt' ? ` lane: "${t.lane}"` : '';
    return `task ${t.id} ${`"${t.name}"`.padEnd(pad + 1)} ${dur}${after}${lane}`;
  });
  return `${head.join('\n')}\n\n${lines.join('\n')}\n`;
}

const SHARED = `The project is a warehouse management system rollout: ten activities from requirements to go-live, with a critical path of requirements, WMS configuration, ERP integration, system test, staff training and go-live that takes ${PROJECT} working days. All four PERT exemplars draw this same schedule, so their numbers must agree.`;
const NOTES = {
  network: `${SHARED} This drawing is the activity-on-node precedence network defined in the PMI Practice Standard for Scheduling (3rd ed., 2019) and the PMBOK Guide, using the six-field node box popularised by Moder, Phillips and Davis, *Project Management with CPM, PERT and Precedence Diagramming* (3rd ed., 1983): early start, duration and early finish across the top; activity ID and name in the middle; late start, total float and late finish across the bottom.

Why it works as the exemplar for this type:

- Every node carries all six schedule fields in the same fixed positions, so a reader can check the forward pass (top row) and backward pass (bottom row) without a legend; the legend repeats the key once with the field names spelled out.
- Columns follow the longest-path rank from kickoff, and the critical path is laid out as one straight horizontal spine; activities with float sit above or below it so no dependency line crosses another.
- Red is reserved for zero total float: critical node borders, their numbers and the spine links are red; everything else is blue boxes with grey links.
- Links are orthogonal and enter the left edge of their successor. A fan-out shares one trunk with a dot at each branch, and a merge joins the incoming line just before the arrowhead, so splits and joins never look like crossings.
- The go-live milestone keeps the full box (duration 0) with a small diamond beside its name.

Palette: ink #0F172A, muted #475569, link grey #64748B, activity blue #1D4ED8 with tint #EFF6FF, critical red #C62828 with tint #FDECEC, divider #E2E8F0, paper #FFFFFF.
`,
  aoa: `${SHARED} This drawing is the activity-on-arrow (arrow diagramming) form of the critical path method from Kelley and Walker, "Critical-Path Planning and Scheduling" (1959), as taught in Lockyer and Gordon, *Project Management and Network Analysis*: activities are arrows between numbered events, events are numbered so every arrow runs from a lower to a higher number, and a dashed zero-time dummy carries logic that arrows alone cannot show.

Why it works as the exemplar for this type:

- Each event circle is split the textbook way: event number in the top half, earliest time bottom left, latest time bottom right, so slack at an event is visible as two unequal numbers.
- The critical path runs as one straight horizontal chain of events; branches with float leave at 45 degrees or straight up, travel horizontally, and rejoin, so no arrow crosses another.
- Activity name sits above its arrow and duration below it, both on the horizontal part of the arrow, never on a diagonal.
- Exactly one dummy is used, where it is logically required (system test needs both scanners and integration; loading data needs only integration). It is dashed, unlabelled and, being on the critical path, red.
- Red is reserved for the critical path (events and arrows); other events are blue and other arrows grey.

Palette: ink #0F172A, muted #475569, arrow grey #64748B, event blue #1D4ED8, critical red #C62828, divider #E2E8F0, paper #FFFFFF.
`,
  timescaled: `${SHARED} This drawing is a time-scaled logic diagram (time-scaled network), the hybrid of network and bar chart described in the PMI Practice Standard for Scheduling (3rd ed., 2019) and by Moder, Phillips and Davis (1983): each activity is a bar placed at its early start on a working-day axis, its length is its duration, logic links are drawn at the day they occur, and float appears as a dashed extension.

Why it works as the exemplar for this type:

- Horizontal position is exact: bars start at the early start day and end at the early finish day on a shared 0–45 axis labelled at the top and bottom, with light gridlines every five days and a dashed red line at project finish.
- The critical path occupies one row, so its bars read as an unbroken red chain; activities with float sit on rows above and below, placed so that no link crosses a bar or another link.
- Float is drawn, not just stated: a dashed line from the bar's end to the day its successor starts, closed by a short tick and labelled with the number of days; float shared by a chain (buy hardware, then install scanners) is labelled once at the end of the chain.
- Every bar holds its ID and name in bold and its day range and duration in a smaller second line, all at 12 px or larger.
- Links leave the end of a bar and arrive at the start of the next; a merge from another row drops onto the top of the successor bar so it never overlaps the critical run.

Palette: ink #0F172A, muted #475569, link grey #64748B, activity blue #1D4ED8 on #DBEAFE, critical red #C62828 on #FDECEC, gridline #E2E8F0, axis #CBD5E1, paper #FFFFFF.
`,
  gantt: `${SHARED} This drawing is a critical-path Gantt chart in the scheduling-software convention of the PMI Practice Standard for Scheduling (3rd ed., 2019): a task table on the left, calendar bars on the right placed from the computed early dates on a Monday-to-Friday calendar starting 5 October 2026, grouped by workstream, with total float shown as a line to the late finish.

Why it works as the exemplar for this type:

- The left table repeats what the bars show as numbers (duration, start and finish dates), so the chart can be checked without measuring; dates include the weekday.
- The timescale has two tiers, month and week commencing, with week gridlines and weekend columns shaded, so it is obvious that bars continue through non-working weekends.
- Rows are grouped under tinted workstream headers and ordered by early start inside each group.
- Critical bars are solid red; bars with float are pale blue with a blue outline, followed by a thin line to the late finish date and a label giving the float in working days.
- The go-live milestone is a red diamond at the end of its day with its date written beside it; nothing overlaps the bars.

Palette: ink #0F172A, muted #475569, float grey #64748B, activity blue #1D4ED8 on #DBEAFE, lane tint #EFF6FF, critical red #C62828, weekend #F1F5F9, gridline #E2E8F0, rule #CBD5E1, paper #FFFFFF.
`,
};

const svgs = { network: drawNetwork(), aoa: drawAoa(), timescaled: drawTimescaled(), gantt: drawGantt() };
for (const [kind, svg] of Object.entries(svgs)) {
  const dir = new URL(`${kind}/`, OUT);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('ideal.svg', dir), svg);
  await writeFile(new URL('source.sx', dir), source(kind));
  await writeFile(new URL('notes.md', dir), NOTES[kind]);
  if (PNG_DIR) {
    await mkdir(PNG_DIR, { recursive: true });
    const png = new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng();
    await writeFile(`${PNG_DIR}/pert-${kind}.png`, png);
  }
  console.log(`wrote pert/${kind}`);
}
