/**
 * Hand-authored PRISMA 2020 exemplars (single and dual pipeline). Run from any directory:
 *   node scripts/visual-eval/draw-prisma-exemplars.mjs [png-dir]
 * Writes visual-eval/exemplars/prisma/{single,dual}/ideal.svg, plus PNG previews when a
 * directory is given. Wording follows the official PRISMA 2020 flow diagram template for
 * new systematic reviews (Page et al., BMJ 2021;372:n71). Every text is measured with
 * resvg and checked against its box, every arrow and every other text before writing.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = {
  ink: '#1F2933', muted: '#52606D', border: '#616E7C', paper: '#FFFFFF',
  gold: '#F5C84C', grey: '#D5DAE0', phase: '#CFE0F1', arrow: '#3E4C59',
};
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 22, subtitle: 13, header: 14, phase: 14, label: 13.5, body: 13, source: 11 };
const LH = 19, PAD_X = 14, PAD_Y = 12, ROW_GAP = 38, COL_GAP = 44;
const PNG_DIR = process.argv[2];

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
const fmt = n => n.toLocaleString('en-US');

function drawVariant(v) {
  const g = [], texts = [], segs = [], boxes = [];
  const text = (s, x, y, { fs = FS.body, weight = 400, fill = C.ink, anchor = 'start', owner = null } = {}) => {
    const m = measure(s, fs, weight);
    const w = m.x1 - m.x0;
    const dx = anchor === 'middle' ? -w / 2 - m.x0 : 0;
    const r = { x0: x + m.x0 + dx, y0: y + m.y0, x1: x + m.x1 + dx, y1: y + m.y1 };
    texts.push({ s, r, owner });
    g.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" fill="${fill}"${anchor === 'middle' ? ' text-anchor="middle"' : ''}>${esc(s)}</text>`);
    return r;
  };
  const lineSpec = lines => lines.map(l => (typeof l === 'string' ? { s: l } : l));
  const boxHeight = n => PAD_Y * 2 + 14 + (n - 1) * LH + 4;

  // Column geometry.
  const X = { phase: 28, L: 92 };
  const W = { main: 318, side: 350, rMain: 262, rSide: 232 };
  X.S = X.L + W.main + COL_GAP;
  X.R = X.S + W.side + 60;
  X.RS = X.R + W.rMain + COL_GAP;
  const width = (v.dual ? X.RS + W.rSide : X.S + W.side) + 34;

  const rows = v.rows.map(r => ({ ...r, h: boxHeight(Math.max(...['L', 'S', 'R', 'RS'].map(k => (r[k] ? r[k].length : 0)))) }));
  let y = 158;
  for (const r of rows) { r.y = y; y += r.h + ROW_GAP; }
  const bottom = y - ROW_GAP;
  const height = bottom + 58;

  const addBox = (id, x, yy, w, h, lines) => {
    const b = { id, x0: x, y0: yy, x1: x + w, y1: yy + h };
    boxes.push(b);
    g.push(`<rect x="${x}" y="${yy}" width="${w}" height="${h}" rx="3" fill="${C.paper}" stroke="${C.border}" stroke-width="1.25"/>`);
    const L = lineSpec(lines);
    const blockH = 14 + (L.length - 1) * LH + 4;
    let base = yy + (h - blockH) / 2 + 14;
    L.forEach((l, i) => {
      const r = text(l.s, x + PAD_X + (l.indent ? 12 : 0), base + i * LH, {
        fs: i === 0 || l.strong ? FS.label : FS.body, weight: i === 0 || l.strong ? 600 : 400,
        fill: l.muted ? C.muted : C.ink, owner: id,
      });
      if (r.x1 > b.x1 - 8 || r.y1 > b.y1 - 5 || r.y0 < b.y0 + 5) throw new Error(`Text leaves box ${id}: ${l.s}`);
    });
    return b;
  };
  const arrow = (pts, id) => {
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      if (a[0] !== b[0] && a[1] !== b[1]) throw new Error(`Non-orthogonal arrow ${id}`);
      segs.push({ a, b, id });
    }
    const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
    const ux = Math.sign(q[0] - p[0]), uy = Math.sign(q[1] - p[1]);
    const L = 10, H = 5;
    const end = [q[0] - ux * L, q[1] - uy * L];
    const d = pts.slice(0, -1).map((pt, i) => `${i ? 'L' : 'M'}${pt[0]} ${pt[1]}`).join(' ') + ` L${end[0]} ${end[1]}`;
    g.push(`<path d="${d}" fill="none" stroke="${C.arrow}" stroke-width="1.5"/>`);
    g.push(`<polygon points="${q[0]},${q[1]} ${end[0] - uy * H},${end[1] - ux * H} ${end[0] + uy * H},${end[1] + ux * H}" fill="${C.arrow}"/>`);
  };

  // Title block and pipeline headers.
  text(v.title, 28, 44, { fs: FS.title, weight: 600 });
  text(v.subtitle, 28, 68, { fs: FS.subtitle, fill: C.muted });
  const header = (x, w, fill, s) => {
    g.push(`<rect x="${x}" y="100" width="${w}" height="36" rx="4" fill="${fill}"/>`);
    text(s, x + w / 2, 123, { fs: FS.header, weight: 600, anchor: 'middle' });
  };
  header(X.L, X.S + W.side - X.L, C.gold, 'Identification of new studies via databases and registers');
  if (v.dual) header(X.R, X.RS + W.rSide - X.R, C.grey, 'Identification of new studies via other methods');

  // Phase bars.
  const phase = (label, y0, y1) => {
    g.push(`<rect x="${X.phase}" y="${y0}" width="36" height="${y1 - y0}" rx="6" fill="${C.phase}"/>`);
    const m = measure(label, FS.phase, 600);
    if (m.x1 - m.x0 > y1 - y0 - 16) throw new Error(`Phase label too long: ${label}`);
    const cx = X.phase + 18, cy = (y0 + y1) / 2;
    g.push(`<text x="${cx}" y="${cy + 5}" font-size="${FS.phase}" font-weight="600" fill="${C.ink}" text-anchor="middle" transform="rotate(-90 ${cx} ${cy})">${esc(label)}</text>`);
  };
  const R = Object.fromEntries(rows.map(r => [r.id, r]));
  phase('Identification', R.identified.y, R.identified.y + R.identified.h);
  phase('Screening', R.screened.y, R.assessed.y + R.assessed.h);
  phase('Included', R.included.y, R.included.y + R.included.h);

  // Boxes.
  const B = {};
  for (const r of rows) {
    if (r.L) B[`L-${r.id}`] = addBox(`L-${r.id}`, X.L, r.y, W.main, r.h, r.L);
    if (r.S) B[`S-${r.id}`] = addBox(`S-${r.id}`, X.S, r.y, W.side, r.h, r.S);
    if (r.R) B[`R-${r.id}`] = addBox(`R-${r.id}`, X.R, r.y, W.rMain, r.h, r.R);
    if (r.RS) B[`RS-${r.id}`] = addBox(`RS-${r.id}`, X.RS, r.y, W.rSide, r.h, r.RS);
  }
  const cx = b => (b.x0 + b.x1) / 2, cy = b => (b.y0 + b.y1) / 2;
  const main = ['identified', 'screened', 'sought', 'assessed', 'included'];
  for (let i = 1; i < main.length; i++) {
    const a = B[`L-${main[i - 1]}`], b = B[`L-${main[i]}`];
    arrow([[cx(a), a.y1], [cx(a), b.y0]], `L${i}`);
  }
  for (const id of main.slice(0, 4)) {
    const a = B[`L-${id}`], s = B[`S-${id}`];
    arrow([[a.x1, cy(a)], [s.x0, cy(a)]], `S-${id}`);
  }
  if (v.dual) {
    const i = B['R-identified'], so = B['R-sought'], as = B['R-assessed'], inc = B['L-included'];
    arrow([[cx(i), i.y1], [cx(i), so.y0]], 'R1');
    arrow([[cx(so), so.y1], [cx(so), as.y0]], 'R2');
    arrow([[so.x1, cy(so)], [B['RS-sought'].x0, cy(so)]], 'RS1');
    arrow([[as.x1, cy(as)], [B['RS-assessed'].x0, cy(as)]], 'RS2');
    arrow([[cx(as), as.y1], [cx(as), cy(inc)], [inc.x1, cy(inc)]], 'R-inc');
  }
  text('Layout and wording: PRISMA 2020 flow diagram for new systematic reviews (Page et al., BMJ 2021;372:n71).', 28, height - 22, { fs: FS.source, fill: C.muted });

  // Geometry checks.
  const hit = (r, s, pad = 3) => {
    const x0 = Math.min(s.a[0], s.b[0]) - pad, x1 = Math.max(s.a[0], s.b[0]) + pad;
    const y0 = Math.min(s.a[1], s.b[1]) - pad, y1 = Math.max(s.a[1], s.b[1]) + pad;
    return r.x0 < x1 && r.x1 > x0 && r.y0 < y1 && r.y1 > y0;
  };
  for (const t of texts) {
    for (const s of segs) if (hit(t.r, s)) throw new Error(`Text "${t.s}" touches arrow ${s.id}`);
    for (const u of texts) if (u !== t && t.r.x0 < u.r.x1 && t.r.x1 > u.r.x0 && t.r.y0 < u.r.y1 && t.r.y1 > u.r.y0) throw new Error(`Texts overlap: ${t.s} / ${u.s}`);
    if (t.r.x1 > width - 8 || t.r.y1 > height - 4) throw new Error(`Text clipped: ${t.s}`);
  }
  for (const s of segs) for (const b of boxes) {
    const inner = { x0: b.x0 + 1, y0: b.y0 + 1, x1: b.x1 - 1, y1: b.y1 - 1 };
    if (hit(inner, s, 0)) throw new Error(`Arrow ${s.id} crosses box ${b.id}`);
  }
  for (const a of boxes) for (const b of boxes) if (a !== b && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0) throw new Error(`Boxes overlap ${a.id} ${b.id}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">
<title>${esc(v.title)}</title>
<desc>${esc(v.desc)}</desc>
<rect width="${width}" height="${height}" fill="${C.paper}"/>
${g.join('\n')}
</svg>
`;
}

const variants = {
  single: {
    dual: false,
    title: 'Drug efficacy for refractory migraine',
    subtitle: 'PRISMA 2020 flow diagram · new systematic review · databases and registers only',
    desc: 'PRISMA 2020 flow diagram: 1,540 records identified, 340 removed, 1,200 screened, 260 reports sought, 246 assessed, 42 studies included.',
    rows: [
      { id: 'identified',
        L: ['Records identified from:', `Databases (n = ${fmt(1450)})`, { s: 'MEDLINE 600 · Embase 500 · CENTRAL 350', muted: true, indent: true }, 'Registers (n = 90)', { s: 'ClinicalTrials.gov 90', muted: true, indent: true }],
        S: ['Records removed before screening:', 'Duplicate records removed (n = 330)', 'Records marked as ineligible by automation', { s: 'tools (n = 0)', indent: true }, 'Records removed for other reasons (n = 10)'] },
      { id: 'screened', L: ['Records screened', `(n = ${fmt(1200)})`], S: ['Records excluded', '(n = 940)'] },
      { id: 'sought', L: ['Reports sought for retrieval', '(n = 260)'], S: ['Reports not retrieved', '(n = 14)'] },
      { id: 'assessed', L: ['Reports assessed for eligibility', '(n = 246)'],
        S: ['Reports excluded:', 'Wrong population (n = 80)', 'Wrong comparator (n = 58)', 'Wrong outcome (n = 42)', 'Not randomised (n = 24)'] },
      { id: 'included', L: ['Studies included in review', '(n = 42)', { s: 'Reports of included studies', strong: true }, '(n = 46)'] },
    ],
  },
  dual: {
    dual: true,
    title: 'Community interventions for heat-health protection',
    subtitle: 'PRISMA 2020 flow diagram · new systematic review · databases, registers and other sources',
    desc: 'PRISMA 2020 flow diagram with two pipelines: 1,800 database and register records and 64 records from other methods; 58 studies in 63 reports included.',
    rows: [
      { id: 'identified',
        L: ['Records identified from:', `Databases (n = ${fmt(1680)})`, { s: 'MEDLINE 690 · Embase 610 · CINAHL 380', muted: true, indent: true }, 'Registers (n = 120)', { s: 'ClinicalTrials.gov 85 · WHO ICTRP 35', muted: true, indent: true }],
        S: ['Records removed before screening:', 'Duplicate records removed (n = 360)', 'Records marked as ineligible by automation', { s: 'tools (n = 40)', indent: true }, 'Records removed for other reasons (n = 0)'],
        R: ['Records identified from:', 'Websites (n = 12)', 'Organisations (n = 9)', 'Citation searching (n = 43)'] },
      { id: 'screened', L: ['Records screened', `(n = ${fmt(1400)})`], S: ['Records excluded', `(n = ${fmt(1100)})`] },
      { id: 'sought', L: ['Reports sought for retrieval', '(n = 300)'], S: ['Reports not retrieved', '(n = 20)'],
        R: ['Reports sought for retrieval', '(n = 64)'], RS: ['Reports not retrieved', '(n = 6)'] },
      { id: 'assessed', L: ['Reports assessed for eligibility', '(n = 280)'],
        S: ['Reports excluded:', 'Wrong intervention (n = 100)', 'Wrong outcome (n = 75)', 'Wrong study design (n = 55)'],
        R: ['Reports assessed for eligibility', '(n = 58)'],
        RS: ['Reports excluded:', 'Wrong intervention (n = 22)', 'Wrong outcome (n = 16)', 'Wrong study design (n = 12)'] },
      { id: 'included', L: ['Studies included in review', '(n = 58)', { s: 'Reports of included studies', strong: true }, '(n = 63)'] },
    ],
  },
};

for (const [name, v] of Object.entries(variants)) {
  const svg = drawVariant(v);
  await writeFile(new URL(`../../visual-eval/exemplars/prisma/${name}/ideal.svg`, import.meta.url), svg);
  if (PNG_DIR) {
    const png = new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng();
    await writeFile(`${PNG_DIR}/prisma-${name}.png`, png);
  }
  console.log(`prisma/${name} ok`);
}
