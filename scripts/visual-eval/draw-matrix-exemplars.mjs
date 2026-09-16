/**
 * Hand-authored matrix exemplars for the heatmap, correlation and punnett variants.
 *   node scripts/visual-eval/draw-matrix-exemplars.mjs [png-dir]
 * Writes source.sx, ideal.svg and notes.md into visual-eval/exemplars/matrix/<variant>/.
 * Text bounds come from resvg's real font shaping. Every drawing is checked for
 * text/text, text/shape and shape/shape overlap, containment, canvas bounds and
 * WCAG text contrast before anything is written.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// ── Shared design tokens (same family as exemplars/matrix/quadrant) ─────────
const C = { ink: '#1e293b', slate: '#475569', body: '#334155', rule: '#e2e8f0', panel: '#f1f5f9', paper: '#ffffff' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 22, subtitle: 13, head: 13, label: 12, caption: 11 };
const R = { cell: 3, pill: 12 };
const GAP = 3; // white gutter between coloured cells
const PNG_DIR = process.argv[2];
const ROOT = new URL('../../visual-eval/exemplars/matrix/', import.meta.url);

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cache = new Map();
function measure(s, fs, weight, anchor, italic) {
  const key = JSON.stringify([s, fs, weight, anchor, italic]);
  if (!cache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''} text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b || !b.width) throw new Error(`Cannot measure: ${s}`);
    cache.set(key, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 });
  }
  return cache.get(key);
}

// WCAG relative luminance / contrast.
function lum(hex) {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
const bestInk = bg => (contrast(C.ink, bg) >= contrast('#ffffff', bg) ? C.ink : '#ffffff');

function drawing(W, H) {
  const out = [], texts = [], shapes = new Map();
  const d = {
    W, H, out,
    shape(id, x0, y0, x1, y1, { parent, fill = C.paper, stroke, sw = 1, rx = 0, draw = true } = {}) {
      if (shapes.has(id)) throw new Error(`Duplicate shape ${id}`);
      shapes.set(id, { id, x0, y0, x1, y1, parent, fill });
      if (draw) out.push(`<rect x="${x0}" y="${y0}" width="${+(x1 - x0).toFixed(2)}" height="${+(y1 - y0).toFixed(2)}"${rx ? ` rx="${rx}"` : ''} fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`);
      return id;
    },
    text(s, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start', italic = false, in: container } = {}) {
      const m = measure(s, fs, weight, anchor, italic);
      const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 };
      const bg = container ? shapes.get(container).fill : C.paper;
      texts.push({ s, r, container, fill, bg, fs, weight });
      out.push(`<text x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" font-size="${fs}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''} text-anchor="${anchor}" fill="${fill}">${esc(s)}</text>`);
      return r;
    },
    width: (s, fs, weight = 400, italic = false) => { const m = measure(s, fs, weight, 'start', italic); return m.x1 - m.x0; },
    raw(s) { out.push(s); },
    check() {
      const errs = [], hit = (a, b, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
      const inside = (a, b, pad) => a.x0 >= b.x0 + pad && a.x1 <= b.x1 - pad && a.y0 >= b.y0 + pad && a.y1 <= b.y1 - pad;
      const ancestors = id => { const s = []; while (id) { s.push(id); id = shapes.get(id).parent; } return s; };
      const canvas = { x0: 0, y0: 0, x1: W, y1: H };
      for (const t of texts) {
        if (!inside(t.r, canvas, 8)) errs.push(`text off canvas: ${t.s}`);
        if (t.container && !inside(t.r, shapes.get(t.container), 3)) errs.push(`text escapes its box: ${t.s}`);
        const okShapes = new Set(ancestors(t.container));
        for (const s of shapes.values()) if (!okShapes.has(s.id) && hit(t.r, s, 2)) errs.push(`text "${t.s}" hits shape ${s.id}`);
        const need = t.fs >= 18 || (t.fs >= 14 && t.weight >= 600) ? 3 : 4.5;
        if (contrast(t.fill, t.bg) < need) errs.push(`low contrast ${contrast(t.fill, t.bg).toFixed(2)}: ${t.s}`);
      }
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++)
        if (hit(texts[i].r, texts[j].r, 2)) errs.push(`text "${texts[i].s}" hits text "${texts[j].s}"`);
      const list = [...shapes.values()];
      for (const s of list) {
        if (!inside(s, canvas, 0)) errs.push(`shape off canvas ${s.id}`);
        if (s.parent && !inside(s, shapes.get(s.parent), 0)) errs.push(`shape ${s.id} escapes ${s.parent}`);
      }
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (ancestors(a.id).includes(b.id) || ancestors(b.id).includes(a.id)) continue;
        if (hit(a, b)) errs.push(`shape ${a.id} hits ${b.id}`);
      }
      if (errs.length) throw new Error(`Refusing to write ${errs.length} failures:\n${[...new Set(errs)].join('\n')}`);
      return { texts: texts.length, shapes: shapes.size };
    },
    svg(title, desc, defs = '') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">\n<title>${esc(title)}</title>\n<desc>${esc(desc)}</desc>\n${defs}<rect x="0" y="0" width="${W}" height="${H}" fill="${C.paper}"/>\n${out.join('\n')}\n</svg>\n`;
    },
  };
  return d;
}
function header(d, title, subtitle) {
  d.text(title, 48, 46, { fs: FS.title, weight: 600 });
  d.text(subtitle, 48, 74, { fs: FS.subtitle, fill: C.slate });
}
function pill(d, id, label, cx, cy, parent) {
  const w = Math.max(36, d.width(label, FS.label, 600) + 18);
  d.shape(id, cx - w / 2, cy - 12, cx + w / 2, cy + 12, { parent, fill: C.paper, stroke: C.ink, sw: 1, rx: R.pill });
  d.text(label, cx, cy + 4.3, { fs: FS.label, weight: 600, anchor: 'middle', in: id });
  return w;
}

// ═══ 1. Heatmap — ISO 31000 / IEC 31010 5×5 consequence × likelihood ══════
function heatmap() {
  const LIK = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
  const CON = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Severe'];
  const BANDS = [
    { name: 'Low', min: 1, max: 3, fill: '#cfe6c7', action: 'Accept; review each year' },
    { name: 'Moderate', min: 4, max: 6, fill: '#f6e3a1', action: 'Manage with routine controls' },
    { name: 'High', min: 8, max: 12, fill: '#f2aa6b', action: 'Named owner, monthly review' },
    { name: 'Extreme', min: 15, max: 25, fill: '#c2413b', action: 'Treat before go-live' },
  ];
  const RISKS = [
    ['R1', 'Medication lists mis-mapped', 4, 5], ['R2', 'Cut-over downtime over 48 h', 3, 4],
    ['R3', 'Lab interface vendor slips', 4, 3], ['R4', 'Lead clinical analyst leaves', 3, 3],
    ['R5', 'Nurses untrained at go-live', 4, 2], ['R6', 'Budget overrun above 10%', 2, 3],
    ['R7', 'Ransomware during cut-over', 2, 5], ['R8', 'Label printers misconfigured', 5, 1],
    ['R9', 'Legacy archive access lost', 1, 4], ['R10', 'Downtime drills not rehearsed', 3, 4],
    ['R11', 'Patient records wrongly merged', 3, 5],
  ].map(([id, name, l, c]) => ({ id, name, l, c, score: l * c }));
  const band = s => { const b = BANDS.find(b => s >= b.min && s <= b.max); if (!b) throw new Error(`No band for ${s}`); return b; };
  for (let l = 1; l <= 5; l++) for (let c = 1; c <= 5; c++) band(l * c);

  const W = 1200, H = 780, gx = 210, gy = 128, CW = 124, CH = 92;
  const d = drawing(W, H);
  header(d, 'EHR migration — project risk matrix', 'Five-by-five likelihood × consequence matrix. Cell score = likelihood level × consequence level (1–25); risks are plotted by ID.');
  d.text('Likelihood', gx - 16, gy - 14, { fs: FS.label, weight: 600, anchor: 'end' });
  for (let l = 1; l <= 5; l++) for (let c = 1; c <= 5; c++) {
    const x = gx + (c - 1) * CW, y = gy + (5 - l) * CH, s = l * c, b = band(s), id = `cell-${l}-${c}`;
    d.shape(id, x + GAP / 2, y + GAP / 2, x + CW - GAP / 2, y + CH - GAP / 2, { fill: b.fill, rx: R.cell });
    d.text(String(s), x + 12, y + 24, { fs: FS.head, weight: 600, fill: bestInk(b.fill), in: id });
    const here = RISKS.filter(r => r.l === l && r.c === c);
    if (here.length) {
      const widths = here.map(r => Math.max(36, d.width(r.id, FS.label, 600) + 18)), gap = 6;
      let cx = x + CW / 2 - (widths.reduce((a, w) => a + w, 0) + gap * (here.length - 1)) / 2;
      here.forEach((r, i) => { pill(d, `pill-${r.id}`, r.id, cx + widths[i] / 2, y + CH / 2 + 10, id); cx += widths[i] + gap; });
    }
  }
  LIK.forEach((n, i) => {
    const cy = gy + (4 - i) * CH + CH / 2;
    d.text(n, gx - 16, cy - 1, { fs: FS.label, weight: 500, anchor: 'end' });
    d.text(`Level ${i + 1}`, gx - 16, cy + 15, { fs: FS.caption, fill: C.slate, anchor: 'end' });
  });
  const by = gy + 5 * CH;
  CON.forEach((n, i) => {
    const cx = gx + i * CW + CW / 2;
    d.text(n, cx, by + 22, { fs: FS.label, weight: 500, anchor: 'middle' });
    d.text(`Level ${i + 1}`, cx, by + 38, { fs: FS.caption, fill: C.slate, anchor: 'middle' });
  });
  d.text('Consequence', gx + 2.5 * CW, by + 64, { fs: FS.label, weight: 600, anchor: 'middle' });

  // Rating legend: one row under the grid.
  const ly = by + 112;
  d.text('Risk rating', 48, ly - 8, { fs: FS.head, weight: 600 });
  BANDS.forEach((b, i) => {
    const x = 48 + i * 196;
    d.shape(`sw-${b.name}`, x, ly + 6, x + 18, ly + 24, { fill: b.fill, rx: R.cell });
    d.text(`${b.name}  ${b.min}–${b.max}`, x + 28, ly + 20, { fs: FS.label, weight: 600 });
    d.text(b.action, x + 28, ly + 37, { fs: FS.caption, fill: C.slate });
  });

  // Register panel, highest score first.
  const px = 876;
  d.text('Risk register', px, gy - 14, { fs: FS.label, weight: 600 });
  [...RISKS].sort((a, b) => b.score - a.score || a.l - b.l).forEach((r, i) => {
    const y = gy + 6 + i * 42;
    d.shape(`reg-${r.id}`, px, y, px + 44, y + 24, { fill: C.paper, stroke: C.ink, rx: R.pill });
    d.text(r.id, px + 22, y + 16.3, { fs: FS.label, weight: 600, anchor: 'middle', in: `reg-${r.id}` });
    d.shape(`regsw-${r.id}`, px + 56, y + 3, px + 60, y + 34, { fill: band(r.score).fill });
    d.text(r.name, px + 70, y + 13, { fs: FS.label, weight: 500 });
    d.text(`L${r.l} × C${r.c} = ${r.score} · ${band(r.score).name}`, px + 70, y + 30, { fs: FS.caption, fill: C.slate });
  });
  const counts = d.check();
  const svg = d.svg('EHR migration — project risk matrix',
    'A five-by-five risk matrix for an electronic health record migration. Likelihood rises from Rare to Almost certain up the vertical axis and consequence from Insignificant to Severe along the horizontal axis. Each cell shows its score, likelihood times consequence, and is coloured by rating band: green Low 1–3, yellow Moderate 4–6, orange High 8–12, red Extreme 15–25. Eleven risks are plotted by ID and listed in a register ordered by score.');
  const bottomToTop = RISKS.map(r => r);
  const source = [
    '# EHR migration project risk register, scored per ISO 31000 / IEC 31010 consequence-likelihood matrix.',
    '# cell (col,row) is zero-based: col = consequence level - 1, row = likelihood level - 1 (row 0 at the bottom).',
    '# value = likelihood x consequence; label = risk IDs in that cell.',
    ...bottomToTop.map(r => `# ${r.id} ${r.name}: L${r.l} x C${r.c} = ${r.score}`),
    'matrix heatmap 5x5 "EHR migration — project risk matrix"',
    `rows: [${LIK.join(', ')}]`,
    `cols: [${CON.join(', ')}]`,
    ...Array.from({ length: 25 }, (_, k) => {
      const l = Math.floor(k / 5) + 1, c = (k % 5) + 1, ids = RISKS.filter(r => r.l === l && r.c === c).map(r => r.id);
      return `cell (${c - 1},${l - 1}) value: ${l * c}${ids.length ? ` label: "${ids.join(', ')}"` : ''}`;
    }),
  ].join('\n') + '\n';
  const notes = `An electronic health record migration risk matrix drawn to the consequence/likelihood matrix technique of ISO/IEC 31010:2019 (Annex B, "consequence/likelihood matrix"), used inside the ISO 31000:2018 risk-assessment process: five named likelihood levels up the vertical axis, five named consequence levels along the horizontal axis, each cell scored as likelihood × consequence (1–25) and shaded by rating band, with eleven project risks placed by ID and listed in a register. The four bands (Low 1–3, Moderate 4–6, High 8–12, Extreme 15–25) follow the common AS/NZS 4360 / ISO 31000 practice; the standard itself leaves band thresholds to the organisation, so the thresholds and the action for each band are stated in the legend. Sources: [IEC 31010:2019](https://www.iso.org/standard/72140.html), [ISO/IEC 31010 overview](https://en.wikipedia.org/wiki/ISO/IEC_31010), [ISO 31000 5×5 matrix practice](https://mindsetcyber.com.au/iso-31000-risk-matrix/).

Why it works as the exemplar for this type:

- Both axes are ordered low to high away from the origin (likelihood up, consequence right), every level carries its name plus "Level n", and each axis has a bold title, so a cell is readable without a key.
- Every one of the 25 cells shows its numeric score in the top-left corner, and the fill comes from a small set of named bands (green, yellow, orange, red), not a continuous ramp, so equal scores always look identical.
- Risks are white ID pills centred in their cell; a cell holding two risks sets the pills side by side, and the full risk name lives in the register, never squeezed into the grid.
- The register on the right is sorted by score and repeats each risk's L × C = score and band, with a thin band-coloured tick, so the grid and the list cross-check each other.
- The legend states each band's score range and the action it triggers, which is what turns a coloured grid into a decision tool.
- Cells are separated by 3px white gutters instead of grid lines, and text on the red band switches to white; every text/fill pair meets WCAG 4.5:1.

Palette: ink #1e293b, slate #475569, low green #cfe6c7, moderate yellow #f6e3a1, high orange #f2aa6b, extreme red #c2413b, pill white #ffffff.
`;
  return { variant: 'heatmap', W, svg, source, notes, counts };
}

// ═══ 2. Correlation — symmetric Pearson matrix, lower triangle ════════════
function correlation() {
  const V = [['Age'], ['BMI'], ['Waist', 'circumference'], ['Systolic', 'blood pressure'], ['LDL', 'cholesterol'], ['HDL', 'cholesterol'], ['Fasting', 'glucose'], ['Weekly', 'exercise']];
  const upper = [.18, .27, .46, .21, .04, .33, -.22, .86, .31, .17, -.38, .35, -.29, .34, .20, -.43, .41, -.33, .15, -.09, .26, -.14, -.12, .11, -.08, -.24, .27, -.25];
  const N = V.length, M = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (i === j ? 1 : 0)));
  let k = 0;
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { M[i][j] = M[j][i] = upper[k++]; }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (M[i][j] !== M[j][i] || Math.abs(M[i][j]) > 1) throw new Error('Matrix not symmetric');
  // Diverging ramp centred on 0 (ColorBrewer RdBu, blue negative / red positive).
  const STOPS = [[-1, '#2166ac'], [-0.5, '#92c5de'], [0, '#f7f7f7'], [0.5, '#f4a582'], [1, '#b2182b']];
  const ramp = v => { for (let i = 1; i < STOPS.length; i++) if (v <= STOPS[i][0]) return mix(STOPS[i - 1][1], STOPS[i][1], (v - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0])); return STOPS.at(-1)[1]; };
  const fmt = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);

  const CW = 100, CH = 76, gx = 64, gy = 120, W = gx + N * CW + 48, H = gy + N * CH + 90;
  const d = drawing(W, H);
  header(d, 'Cardiometabolic risk factors — correlation matrix', 'Pearson r among eight screening measures in 1,248 adults. Lower triangle shown; each variable is named on the diagonal.');
  for (let i = 0; i < N; i++) for (let j = 0; j <= i; j++) {
    const x = gx + j * CW, y = gy + i * CH, id = `c-${i}-${j}`;
    if (i === j) {
      d.shape(id, x + GAP / 2, y + GAP / 2, x + CW - GAP / 2, y + CH - GAP / 2, { fill: C.panel, rx: R.cell });
      const lines = V[i], y0 = y + CH / 2 + 4.5 - (lines.length - 1) * 8;
      lines.forEach((t, n) => d.text(t, x + CW / 2, y0 + n * 16, { fs: FS.label, weight: 600, anchor: 'middle', in: id }));
    } else {
      const fill = ramp(M[i][j]);
      d.shape(id, x + GAP / 2, y + GAP / 2, x + CW - GAP / 2, y + CH - GAP / 2, { fill, rx: R.cell });
      d.text(fmt(M[i][j]), x + CW / 2, y + CH / 2 + 5.5, { fs: 15, weight: 600, anchor: 'middle', fill: bestInk(fill), in: id });
    }
  }
  // Legend in the empty upper triangle.
  const lx = gx + 4.4 * CW, lw = 3.2 * CW, ly = gy + 20;
  d.text('Pearson correlation coefficient r', lx, ly, { fs: FS.label, weight: 600 });
  d.shape('bar', lx, ly + 14, lx + lw, ly + 30, { draw: false, fill: '#f7f7f7' });
  d.raw(`<rect x="${lx}" y="${ly + 14}" width="${lw}" height="16" rx="${R.cell}" fill="url(#rdbu)"/>`);
  [-1, -0.5, 0, 0.5, 1].forEach(v => {
    const x = lx + ((v + 1) / 2) * lw;
    d.shape(`tick${v}`, x - 0.5, ly + 32, x + 0.5, ly + 38, { fill: C.slate });
    d.text(v === 0 ? '0' : (v < 0 ? '−' : '+') + Math.abs(v).toFixed(1), x, ly + 52, { fs: FS.caption, fill: C.slate, anchor: v === -1 ? 'start' : v === 1 ? 'end' : 'middle' });
  });
  d.text('Negative', lx, ly + 70, { fs: FS.caption, fill: '#2166ac', weight: 600 });
  d.text('Positive', lx + lw, ly + 70, { fs: FS.caption, fill: '#b2182b', weight: 600, anchor: 'end' });
  d.text('The matrix is symmetric: r(A, B) = r(B, A), so the upper', lx, ly + 100, { fs: FS.caption, fill: C.slate });
  d.text('triangle repeats these values and the diagonal is r = 1.', lx, ly + 116, { fs: FS.caption, fill: C.slate });
  d.text('With n = 1,248, |r| ≥ 0.06 is significant at p < 0.05.', lx, ly + 132, { fs: FS.caption, fill: C.slate });
  d.text('Read a coefficient at the row of one variable and the column', 48, H - 42, { fs: FS.caption, fill: C.slate });
  d.text('below the other; both names sit on the diagonal.', 48, H - 26, { fs: FS.caption, fill: C.slate });
  const counts = d.check();
  const defs = `<defs><linearGradient id="rdbu" x1="0" x2="1" y1="0" y2="0">${STOPS.map(([v, c]) => `<stop offset="${(v + 1) / 2}" stop-color="${c}"/>`).join('')}</linearGradient></defs>\n`;
  const svg = d.svg('Cardiometabolic risk factors — correlation matrix',
    'Lower-triangle Pearson correlation matrix of eight cardiometabolic screening measures: age, BMI, waist circumference, systolic blood pressure, LDL cholesterol, HDL cholesterol, fasting glucose and weekly exercise. Each variable is named in a grey diagonal cell; each off-diagonal cell shows the coefficient and is coloured on a diverging blue-white-red scale centred on zero. The strongest relationship is BMI with waist circumference at 0.86; HDL cholesterol and weekly exercise correlate negatively with most other measures. A colour bar legend sits in the empty upper triangle.', defs);
  const names = V.map(v => v.join(' '));
  const source = [
    '# Cardiometabolic screening cohort, n = 1,248 adults; Pearson r, symmetric matrix.',
    '# rows and cols list the same variables in the same order; row 0 is drawn at the bottom.',
    `matrix correlation ${N}x${N} "Cardiometabolic risk factors — correlation matrix"`,
    `rows: [${names.join(', ')}]`,
    `cols: [${names.join(', ')}]`,
    ...M.flatMap((row, i) => row.map((v, j) => `cell (${j},${i}) value: ${v}`)),
  ].join('\n') + '\n';
  const notes = `A Pearson correlation matrix for eight cardiometabolic screening measures, drawn as a shaded correlation matrix in the corrgram tradition of Friendly (2002) and the lower-triangle "color" layout of R's corrplot: because r(A, B) = r(B, A) the matrix is symmetric, so only the lower triangle is drawn, the diagonal (always r = 1) is used to name the variables, and each coefficient is both printed and encoded on a diverging colour scale whose neutral midpoint is exactly zero. Sources: [Friendly, Corrgrams: exploratory displays for correlation matrices, The American Statistician 56 (2002)](https://www.datavis.ca/papers/corrgram.pdf), [corrplot reference manual](https://cran.r-project.org/web/packages/corrplot/corrplot.pdf), [ColorBrewer RdBu diverging scheme](https://colorbrewer2.org/).

Why it works as the exemplar for this type:

- Only one triangle is drawn; the redundant half and the r = 1 diagonal carry no data, so the diagonal becomes the variable-name labels and a coefficient is found at the intersection of its two variables' row and column.
- The colour scale diverges from a near-white neutral at 0 to blue for negative and red for positive, with symmetric end points at −1 and +1, so strength reads as saturation and sign reads as hue.
- Every cell prints the coefficient to two decimals with a true minus sign; the colour supports the number, it never replaces it. Text flips to white on the darkest cells and meets WCAG 4.5:1 everywhere.
- The legend is a continuous colour bar with ticks at −1, −0.5, 0, +0.5, +1 and "Negative" / "Positive" named in their hues, placed in the empty upper triangle so it costs no extra canvas.
- A short note states sample size and the significance threshold, which is what a reader needs to decide whether a small r matters.

Palette: ink #1e293b, slate #475569, diagonal panel #f1f5f9, strong negative #2166ac, weak negative #92c5de, zero #f7f7f7, weak positive #f4a582, strong positive #b2182b.
`;
  return { variant: 'correlation', W, svg, source, notes, counts };
}

// ═══ 3. Punnett — dihybrid RrYy × RrYy ═══════════════════════════════════
function punnett() {
  const gametes = ['RY', 'Ry', 'rY', 'ry'];
  const order = (a, b) => (a <= 'Z' && b > 'Z' ? a + b : b <= 'Z' && a > 'Z' ? b + a : a + b);
  const PHENO = {
    'Round, yellow': { fill: '#f2cf5b', key: 'R_ Y_' }, 'Round, green': { fill: '#9fcb85', key: 'R_ yy' },
    'Wrinkled, yellow': { fill: '#faebb8', key: 'rr Y_' }, 'Wrinkled, green': { fill: '#d7ead0', key: 'rr yy' },
  };
  const pheno = g => `${/R/.test(g) ? 'Round' : 'Wrinkled'}, ${/Y/.test(g) ? 'yellow' : 'green'}`;
  const grid = gametes.map(left => gametes.map(top => order(top[0], left[0]) + order(top[1], left[1])));
  const pc = {}, gc = {};
  grid.flat().forEach(g => { pc[pheno(g)] = (pc[pheno(g)] || 0) + 1; gc[g] = (gc[g] || 0) + 1; });
  const ratio = ['Round, yellow', 'Round, green', 'Wrinkled, yellow', 'Wrinkled, green'].map(p => pc[p]);
  if (ratio.join(':') !== '9:3:3:1') throw new Error(`Bad phenotype ratio ${ratio}`);
  const GENO = ['RRYY', 'RRYy', 'RRyy', 'RrYY', 'RrYy', 'Rryy', 'rrYY', 'rrYy', 'rryy'];
  if (GENO.map(g => gc[g]).join(':') !== '1:2:1:2:4:2:1:2:1') throw new Error('Bad genotype ratio');

  const W = 1060, H = 650, gx = 214, gy = 186, CW = 124, CH = 96, HW = 60, HH = 44;
  const d = drawing(W, H);
  header(d, 'Dihybrid cross — seed shape and colour in peas', 'Punnett square for RrYy × RrYy. Round (R) is dominant to wrinkled (r); yellow (Y) is dominant to green (y).');
  d.text('Parent 1  RrYy  ·  pollen gametes', gx + 2 * CW, gy - HH - 16, { fs: FS.head, weight: 600, anchor: 'middle' });
  d.text('Parent 2', gx - HW - 16, gy + 2 * CH - 12, { fs: FS.head, weight: 600, anchor: 'end' });
  d.text('RrYy', gx - HW - 16, gy + 2 * CH + 6, { fs: FS.head, weight: 600, italic: true, anchor: 'end' });
  d.text('ovule gametes', gx - HW - 16, gy + 2 * CH + 24, { fs: FS.caption, fill: C.slate, anchor: 'end' });
  gametes.forEach((g, i) => {
    const tx = gx + i * CW, ty = gy - HH;
    d.shape(`top-${g}`, tx + GAP / 2, ty + GAP / 2, tx + CW - GAP / 2, ty + HH - GAP / 2, { fill: C.panel, rx: R.cell });
    d.text(g, tx + CW / 2, ty + HH / 2 + 5.5, { fs: 16, weight: 600, italic: true, anchor: 'middle', in: `top-${g}` });
    const lx = gx - HW, ly = gy + i * CH;
    d.shape(`left-${g}`, lx + GAP / 2, ly + GAP / 2, lx + HW - GAP / 2, ly + CH - GAP / 2, { fill: C.panel, rx: R.cell });
    d.text(g, lx + HW / 2, ly + CH / 2 + 5.5, { fs: 16, weight: 600, italic: true, anchor: 'middle', in: `left-${g}` });
  });
  grid.forEach((row, r) => row.forEach((g, c) => {
    const x = gx + c * CW, y = gy + r * CH, p = pheno(g), id = `cell-${r}-${c}`;
    d.shape(id, x + GAP / 2, y + GAP / 2, x + CW - GAP / 2, y + CH - GAP / 2, { fill: PHENO[p].fill, rx: R.cell });
    d.text(g, x + CW / 2, y + CH / 2 - 2, { fs: 17, weight: 600, italic: true, anchor: 'middle', in: id });
    d.text(p, x + CW / 2, y + CH / 2 + 18, { fs: FS.caption, fill: C.body, anchor: 'middle', in: id });
  }));
  d.text('Each parent makes four equally likely gametes (independent assortment), so each of the 16 boxes has probability 1/16.', 48, gy + 4 * CH + 40, { fs: FS.label, fill: C.slate });

  const px = 764;
  d.text('Phenotype ratio', px, gy - HH + 4, { fs: FS.head, weight: 600 });
  d.text('9 : 3 : 3 : 1', px, gy - HH + 34, { fs: 24, weight: 600 });
  Object.entries(PHENO).forEach(([p, v], i) => {
    const y = gy + 10 + i * 58;
    d.shape(`key-${i}`, px, y, px + 30, y + 30, { fill: v.fill, rx: R.cell });
    d.text(p, px + 44, y + 12, { fs: FS.head, weight: 600 });
    d.text(`${v.key}  ·  ${pc[p]} of 16`, px + 44, y + 29, { fs: FS.label, fill: C.slate });
  });
  const gy2 = gy + 10 + 4 * 58 + 30;
  d.text('Genotype ratio', px, gy2, { fs: FS.head, weight: 600 });
  for (let r = 0; r < 3; r++) GENO.slice(r * 3, r * 3 + 3).forEach((g, c) => {
    const x = px + c * 88, y = gy2 + 26 + r * 22;
    d.text(String(gc[g]), x + 14, y, { fs: FS.label, weight: 600, anchor: 'end' });
    d.text(g, x + 20, y, { fs: FS.label, italic: true, fill: C.body });
  });
  const counts = d.check();
  const svg = d.svg('Dihybrid cross — seed shape and colour in peas',
    'A 4 by 4 Punnett square for the dihybrid pea cross RrYy × RrYy. The four pollen gametes RY, Ry, rY and ry run across the top and the four ovule gametes down the left. Each of the 16 boxes gives the offspring genotype and its phenotype and is shaded by phenotype: 9 round yellow, 3 round green, 3 wrinkled yellow, 1 wrinkled green. A key states the 9:3:3:1 phenotype ratio and the 1:2:1:2:4:2:1:2:1 genotype ratio.');
  const source = [
    '# Mendel\'s pea dihybrid cross: seed shape R (round) > r (wrinkled), seed colour Y (yellow) > y (green).',
    '# Expected offspring: 9 round yellow : 3 round green : 3 wrinkled yellow : 1 wrinkled green.',
    'matrix punnett "Dihybrid cross — seed shape and colour in peas"',
    'cross: RrYy x RrYy',
    'trait R: "Round" / "Wrinkled"',
    'trait Y: "Yellow" / "Green"',
  ].join('\n') + '\n';
  const notes = `A dihybrid Punnett square for Mendel's pea cross RrYy × RrYy (seed shape and seed colour), drawn the way Reginald Punnett introduced the square around 1905 and the way genetics textbooks still teach it: one parent's gametes across the top edge, the other parent's gametes down the left edge, the offspring genotype written in each of the 16 boxes, and the resulting phenotype ratio stated beside the grid. Allele symbols follow the textbook convention of an upper-case letter for the dominant allele and italic gene symbols. Sources: [Punnett square](https://en.wikipedia.org/wiki/Punnett_square), [Reginald Punnett and Mendelism (1905)](https://en.wikipedia.org/wiki/Reginald_Punnett), [Edwards, "Punnett's square", Studies in History and Philosophy of Biological and Biomedical Sciences (2012)](https://www.researchgate.net/publication/221824531_Punnett's_square).

Why it works as the exemplar for this type:

- Gametes sit in their own grey header cells on the top and left edges, labelled with which parent and which sex cell they come from, so the square reads as "combine the row gamete with the column gamete".
- Each box shows the genotype first, large and italic, with alleles ordered dominant-first per gene (RrYy, never rRyY), and the phenotype in small plain text underneath.
- Shading encodes phenotype with a two-part logic: hue is seed colour (yellow family vs green family) and depth is seed shape (strong for round, pale for wrinkled), so the four classes and their 9 : 3 : 3 : 1 proportions are visible before reading any text.
- The key on the right states the phenotype ratio in large type, then each class with its swatch, its genotype pattern (R_ Y_) and its count out of 16, followed by the full 1:2:1:2:4:2:1:2:1 genotype ratio.
- One line under the grid states the probability rule (four equally likely gametes, each box is 1/16), which is the reason the counts are ratios.

Palette: ink #1e293b, slate #475569, header panel #f1f5f9, round yellow #f2cf5b, wrinkled yellow #faebb8, round green #9fcb85, wrinkled green #d7ead0.
`;
  return { variant: 'punnett', W, svg, source, notes, counts };
}

const results = [heatmap(), correlation(), punnett()];
for (const r of results) {
  const png = new Resvg(r.svg, { font, fitTo: { mode: 'width', value: r.W * 2 } }).render().asPng();
  const dir = new URL(`${r.variant}/`, ROOT);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('ideal.svg', dir), r.svg);
  await writeFile(new URL('source.sx', dir), r.source);
  await writeFile(new URL('notes.md', dir), r.notes);
  if (PNG_DIR) { await mkdir(PNG_DIR, { recursive: true }); await writeFile(`${PNG_DIR}/matrix-${r.variant}.png`, png); }
  console.log(r.variant, JSON.stringify(r.counts));
}
