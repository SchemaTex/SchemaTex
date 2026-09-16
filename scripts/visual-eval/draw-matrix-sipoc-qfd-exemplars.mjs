/**
 * Hand-authored matrix exemplars for the SIPOC and QFD (House of Quality) variants.
 *   node scripts/visual-eval/draw-matrix-sipoc-qfd-exemplars.mjs [png-dir]
 * Writes visual-eval/exemplars/matrix/{sipoc,qfd}/{source.sx,ideal.svg,notes.md}.
 * Text bounds come from resvg shaping with the same font used for the raster.
 * Every text is checked against every other text, every line segment, every
 * symbol box, its declared cell and the canvas; nothing is written on failure.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// ── Design tokens (shared matrix family, see exemplars/matrix/quadrant) ──────
const C = {
  ink: '#1e293b', slate: '#475569', rule: '#e2e8f0', ruleStrong: '#cbd5e1',
  paper: '#ffffff', band: '#F1F3F6', accent: '#24618c', accentTint: '#EAF0F6',
  neg: '#a1543f', highlight: '#E6E9ED',
};
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 22, subtitle: 13, head: 14, body: 13, small: 12, caption: 11, letter: 26 };
const PNG_DIR = process.argv[2];
const ROOT = new URL('../../visual-eval/exemplars/matrix/', import.meta.url);

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cache = new Map();
function measure(s, fs, weight, anchor = 'start') {
  const key = JSON.stringify([s, fs, weight, anchor]);
  if (!cache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b || !b.width) throw new Error(`Cannot measure: ${s}`);
    cache.set(key, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 });
  }
  return cache.get(key);
}
const widthOf = (s, fs, w) => { const m = measure(s, fs, w); return m.x1 - m.x0; };
function wrap(s, maxW, fs, weight) {
  const out = []; let cur = '';
  for (const word of s.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && widthOf(next, fs, weight) > maxW) { out.push(cur); cur = word; } else cur = next;
  }
  if (cur) out.push(cur);
  for (const l of out) if (widthOf(l, fs, weight) > maxW) throw new Error(`Word too wide: ${l}`);
  return out;
}

function sheet() {
  const g = [], texts = [], segs = [], boxes = [];
  const n = v => Math.round(v * 100) / 100;
  const api = {
    text(s, x, y, { fs = FS.body, weight = 400, fill = C.ink, anchor = 'start', within, ls } = {}) {
      const m = measure(s, fs, weight, anchor);
      if (ls) throw new Error('letter-spacing is not measured');
      texts.push({ s, r: { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 }, within });
      g.push(`<text x="${n(x)}" y="${n(y)}" font-size="${fs}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`);
    },
    /** Lines vertically centred on cy. */
    block(lines, x, cy, lh, opts) {
      const top = cy - (lines.length - 1) * lh / 2;
      lines.forEach((l, i) => api.text(l, x, top + i * lh + (opts.fs ?? FS.body) * 0.36, opts));
    },
    line(a, b, { stroke = C.rule, width = 1, dash } = {}) {
      segs.push({ a, b, w: width });
      g.push(`<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
    },
    rect(x, y, w, h, { fill = 'none', stroke, width = 1, rx = 0 } = {}) {
      g.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${rx}"` : ''} fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${width}"` : ''}/>`);
      if (stroke) for (const [a, b] of [[[x, y], [x + w, y]], [[x + w, y], [x + w, y + h]], [[x, y + h], [x + w, y + h]], [[x, y], [x, y + h]]]) segs.push({ a, b, w: width });
    },
    raw(s) { g.push(s); },
    shape(s, box) { g.push(s); boxes.push(box); },
    check(label, W, H) {
      const errs = [];
      const hit = (a, b, pad = 0) => a.x0 - pad < b.x1 && a.x1 + pad > b.x0 && a.y0 - pad < b.y1 && a.y1 + pad > b.y0;
      const segHit = (s, r) => { // Liang–Barsky
        let t0 = 0, t1 = 1; const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
        for (const [p, q] of [[-dx, s.a[0] - r.x0], [dx, r.x1 - s.a[0]], [-dy, s.a[1] - r.y0], [dy, r.y1 - s.a[1]]]) {
          if (p === 0) { if (q < 0) return false; continue; }
          const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
        }
        return true;
      };
      texts.forEach((t, i) => {
        const r = t.r;
        if (r.x0 < 6 || r.y0 < 6 || r.x1 > W - 6 || r.y1 > H - 6) errs.push(`canvas: ${t.s}`);
        if (t.within) { const w = t.within; if (r.x0 < w.x0 + 2 || r.x1 > w.x1 - 2 || r.y0 < w.y0 + 2 || r.y1 > w.y1 - 2) errs.push(`cell: ${t.s}`); }
        for (let j = i + 1; j < texts.length; j++) if (hit(r, texts[j].r, 1.5)) errs.push(`text/text: ${t.s} × ${texts[j].s}`);
        for (const s of segs) { const p = s.w / 2 + 1.5; if (segHit(s, { x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p })) { errs.push(`text/line: ${t.s}`); break; } }
        for (const b of boxes) if (hit(r, b, 1.5)) { errs.push(`text/shape: ${t.s}`); break; }
      });
      if (errs.length) throw new Error(`${label}: ${errs.length} collisions\n${errs.join('\n')}`);
      return { texts: texts.length, segments: segs.length, shapes: boxes.length };
    },
    svg(W, H, title, desc) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
<title>${esc(title)}</title>
<desc>${esc(desc)}</desc>
<rect x="0" y="0" width="${W}" height="${H}" fill="${C.paper}"/>
<g font-family="${FONT}">
${g.join('\n')}
</g>
</svg>
`;
    },
  };
  return api;
}
const tri = (cx, cy, s, up = true) => { // equilateral-ish triangle points
  const h = s * 0.87; const t = up ? cy - h * 0.58 : cy + h * 0.58, b = up ? cy + h * 0.42 : cy - h * 0.42;
  return `${cx},${t} ${cx + s / 2},${b} ${cx - s / 2},${b}`;
};

// ═════════════════════════════════════════════════════════════════════════
// SIPOC
// ═════════════════════════════════════════════════════════════════════════
function drawSipoc() {
  const TITLE = 'B2B order fulfilment · SIPOC';
  const SUB = 'Define-phase scope for the late-shipment improvement project: six high-level steps from order received to invoice sent.';
  const D = {
    suppliers: ['Buyer (customer purchasing team)', 'Credit bureau', 'Warehouse management system', 'Packaging vendor', 'Freight carrier'],
    inputs: ['Purchase order', 'Credit report and limit', 'Available stock by SKU', 'Cartons and shipping labels', 'Pickup schedule'],
    process: ['Receive and enter order', 'Check credit and stock', 'Pick items', 'Pack and label', 'Ship with carrier', 'Issue invoice'],
    outputs: ['Order confirmation', 'Pick list', 'Packed and labelled shipment', 'Tracking number and advance ship notice', 'Invoice'],
    customers: ['Buyer', 'Warehouse pick team', 'Freight carrier', "Buyer's receiving dock", "Buyer's accounts payable"],
  };
  const START = 'Order received in ERP', END = 'Invoice sent to buyer';
  const s = sheet();
  const M = 44, GAP = 24, CW = 204, PW = 300;
  const W = 2 * M + 4 * CW + PW + 4 * GAP;
  const cols = [
    ['S', 'Suppliers', 'Who provides the inputs', 'suppliers'],
    ['I', 'Inputs', 'What the process needs', 'inputs'],
    ['P', 'Process', 'High-level steps, start to end', 'process'],
    ['O', 'Outputs', 'What the process produces', 'outputs'],
    ['C', 'Customers', 'Who receives the outputs', 'customers'],
  ];
  let x = M;
  const colX = cols.map(([l]) => { const w = l === 'P' ? PW : CW; const r = { x, w }; x += w + GAP; return r; });

  s.text(TITLE, M, 46, { fs: FS.title, weight: 600 });
  s.text(SUB, M, 74, { fs: FS.subtitle, fill: C.slate });

  const HY = 108, HH = 66, BY = HY + HH;
  // Process geometry fixes the body height.
  const Bt = BY + 32, STEP_H = 40, STEP_GAP = 20, PILL_H = 30;
  const stepTop = i => Bt + PILL_H / 2 + 22 + i * (STEP_H + STEP_GAP);
  const lastBottom = stepTop(D.process.length - 1) + STEP_H;
  const Bb = lastBottom + 22 + PILL_H / 2;
  const PANEL_BOTTOM = Bb + PILL_H / 2 + 18;

  cols.forEach(([letter, word, caption, key], ci) => {
    const { x: cx, w } = colX[ci];
    const isP = letter === 'P';
    const r = 10;
    s.rect(cx, HY, w, PANEL_BOTTOM - HY, { fill: C.paper, stroke: C.ruleStrong, rx: r });
    s.raw(`<path d="M${cx + 0.5} ${BY} V${HY + r} Q${cx + 0.5} ${HY + 0.5} ${cx + r} ${HY + 0.5} H${cx + w - r} Q${cx + w - 0.5} ${HY + 0.5} ${cx + w - 0.5} ${HY + r} V${BY} Z" fill="${isP ? C.accentTint : C.band}"/>`);
    s.line([cx, BY], [cx + w, BY], { stroke: C.ruleStrong });
    const within = { x0: cx, y0: HY, x1: cx + w, y1: BY };
    s.text(letter, cx + 16, HY + 35, { fs: FS.letter, weight: 700, fill: isP ? C.accent : C.ink, within });
    s.text(word, cx + 16 + widthOf(letter, FS.letter, 700) + 10, HY + 33, { fs: FS.head, weight: 600, within });
    s.text(caption, cx + 16, HY + 54, { fs: FS.caption, fill: C.slate, within });
    if (ci < cols.length - 1) {
      const gx = cx + w + GAP / 2, gy = HY + HH / 2;
      s.shape(`<path d="M${gx - 4} ${gy - 7} L${gx + 5} ${gy} L${gx - 4} ${gy + 7} Z" fill="${C.slate}"/>`, { x0: gx - 4, y0: gy - 7, x1: gx + 5, y1: gy + 7 });
    }
    if (isP) return;
    // Evenly split rows so supplier↔input and output↔customer pairs read across.
    const items = D[key], rowH = (PANEL_BOTTOM - BY - 16) / items.length;
    items.forEach((item, i) => {
      const y0 = BY + 8 + i * rowH;
      if (i > 0) s.line([cx + 16, y0], [cx + w - 16, y0]);
      const lines = wrap(item, w - 32, FS.body, 400);
      s.block(lines, cx + 16, y0 + rowH / 2, 18, { fs: FS.body, within: { x0: cx + 12, y0, x1: cx + w - 12, y1: y0 + rowH } });
    });
  });

  // Process column: dashed boundary, start/end scope pills, numbered steps.
  const { x: px, w: pw } = colX[2];
  const bx0 = px + 14, bx1 = px + pw - 14, pillX0 = px + 34, pillX1 = px + pw - 34;
  const dash = '5 4';
  for (const y of [Bt, Bb]) {
    s.line([bx0, y], [pillX0 - 6, y], { stroke: C.accent, width: 1.2, dash });
    s.line([pillX1 + 6, y], [bx1, y], { stroke: C.accent, width: 1.2, dash });
  }
  s.line([bx0, Bt], [bx0, Bb], { stroke: C.accent, width: 1.2, dash });
  s.line([bx1, Bt], [bx1, Bb], { stroke: C.accent, width: 1.2, dash });
  const pill = (cy, tag, label) => {
    const y0 = cy - PILL_H / 2;
    s.rect(pillX0, y0, pillX1 - pillX0, PILL_H, { fill: C.accent, rx: PILL_H / 2 });
    const within = { x0: pillX0 + 8, y0, x1: pillX1 - 8, y1: y0 + PILL_H };
    const tw = widthOf(tag, FS.caption, 700), lw = widthOf(label, FS.body, 500);
    const start = (pillX0 + pillX1) / 2 - (tw + 8 + lw) / 2;
    s.text(tag, start, cy + 4, { fs: FS.caption, weight: 700, fill: '#C9DAE8', within });
    s.text(label, start + tw + 8, cy + 4.6, { fs: FS.body, weight: 500, fill: C.paper, within });
  };
  const arrow = (y0, y1) => {
    const ax = (pillX0 + pillX1) / 2;
    s.line([ax, y0], [ax, y1 - 6], { stroke: C.accent, width: 1.5 });
    s.shape(`<path d="M${ax - 4.5} ${y1 - 7} L${ax + 4.5} ${y1 - 7} L${ax} ${y1} Z" fill="${C.accent}"/>`, { x0: ax - 4.5, y0: y1 - 7, x1: ax + 4.5, y1 });
  };
  pill(Bt, 'START', START);
  D.process.forEach((step, i) => {
    const y0 = stepTop(i);
    arrow(i === 0 ? Bt + PILL_H / 2 : y0 - STEP_GAP, y0);
    s.rect(pillX0, y0, pillX1 - pillX0, STEP_H, { fill: C.paper, stroke: C.ruleStrong, width: 1.2, rx: 6 });
    const bcx = pillX0 + 22, bcy = y0 + STEP_H / 2;
    s.raw(`<circle cx="${bcx}" cy="${bcy}" r="11" fill="${C.accentTint}"/>`);
    s.text(String(i + 1), bcx, bcy + 4.2, { fs: FS.small, weight: 700, fill: C.accent, anchor: 'middle' });
    s.text(step, pillX0 + 42, bcy + 4.6, { fs: FS.body, weight: 500, within: { x0: pillX0 + 36, y0, x1: pillX1, y1: y0 + STEP_H } });
  });
  arrow(lastBottom, Bb - PILL_H / 2);
  pill(Bb, 'END', END);

  const foot = wrap('Dashed outline = process boundary; the project may change only what sits inside it. Rows read across: each supplier provides the input beside it, and each output goes to the customer beside it.', W - 2 * M, FS.small, 400);
  let fy = PANEL_BOTTOM + 30;
  for (const l of foot) { s.text(l, M, fy, { fs: FS.small, fill: C.slate }); fy += 18; }
  const H = Math.ceil(fy + 14);
  const counts = s.check('sipoc', W, H);

  const desc = `A Six Sigma SIPOC table scoping the B2B order fulfilment process. Five labelled columns read left to right — Suppliers, Inputs, Process, Outputs, Customers. The Process column holds six numbered high-level steps (${D.process.join(', ')}) inside a dashed process boundary that starts at "${START}" and ends at "${END}". Suppliers line up with the inputs they provide, and outputs line up with the customers who receive them.`;
  const q = a => a.map(v => `"${v}"`).join(', ');
  const source = `matrix sipoc "B2B order fulfilment"
suppliers: ${q(D.suppliers)}
inputs: ${q(D.inputs)}
process: ${q(D.process)}
outputs: ${q(D.outputs)}
customers: ${q(D.customers)}
`;
  const notes = `A SIPOC for B2B order fulfilment, the one-page scoping table a Six Sigma team builds in the Define phase of DMAIC before it measures anything. It follows ASQ's SIPOC convention: five columns in the fixed order Suppliers · Inputs · Process · Outputs · Customers, a Process column of roughly five to seven high-level steps (six here), and an explicit start and stop point that fixes the scope of the process ([ASQ SIPOC job aid](https://asq.org/quality-resources/articles/sipoc-job-aid?id=232019f796fc447dad7cdb2cf242f48a), [ASQ, Developing SIPOC Diagrams](https://asq.org/quality-resources/articles/developing-sipoc-diagrams?id=6d0b7d9b494c40efbe3319afaa909d6d); Pyzdek & Keller, *The Six Sigma Handbook*, 5th ed.).

Why it works as the exemplar for this type:

- Each column is one rounded panel with a tinted header carrying a large initial letter, the column name and a one-line plain-language caption, so the S-I-P-O-C reading order is obvious; small chevrons between headers point left to right.
- The Process column is wider than the other four and is the only one in the accent colour. Its steps are numbered white boxes stacked top to bottom and joined by short arrows — a high-level sequence, not a detailed flowchart.
- Scope is drawn, not implied: a dashed outline marks the process boundary, and filled START and END capsules sit on its top and bottom edges with the dashed line breaking around them, so the first and last step read as the edges of the project.
- The four side columns split the body into equal rows, so each supplier sits beside the input it provides and each output sits beside the customer who receives it; a thin divider separates rows and long items wrap inside the column.
- A one-line footnote explains the boundary and the row pairing in words, and the page keeps the matrix family's title and slate subtitle.

The DSL has no way to state the start and end points of the scope; ideal.svg shows them because a SIPOC without them is incomplete, and an engine would need a \`start:\` / \`end:\` line to draw them.

Palette: ink #1e293b, slate #475569, panel border #cbd5e1, row divider #e2e8f0, header band #F1F3F6, process accent #24618c, process tint #EAF0F6, paper #ffffff.
`;
  return { key: 'sipoc', W, H, svg: s.svg(W, H, TITLE, desc), source, notes, counts };
}

// ═════════════════════════════════════════════════════════════════════════
// QFD — House of Quality
// ═════════════════════════════════════════════════════════════════════════
function drawQfd() {
  const TITLE = 'Drip coffee maker · House of Quality';
  const SUB = 'Customer weights 1–5 from 40 owner interviews. Technical importance is computed down each column and ranks where engineering effort pays most.';
  const WHATS = [
    { label: 'Coffee stays hot', weight: 5 },
    { label: 'Brews quickly', weight: 4 },
    { label: 'Quiet operation', weight: 3 },
    { label: 'Easy to clean', weight: 4 },
    { label: 'Low energy use', weight: 2 },
  ];
  const HOWS = [
    { label: 'Heater power (W)', dir: 'up' },
    { label: 'Brew time (min)', dir: 'down' },
    { label: 'Carafe heat loss (°C/h)', dir: 'down' },
    { label: 'Pump noise (dBA)', dir: 'down' },
    { label: 'Removable parts (count)', dir: 'up' },
    { label: 'Standby power (W)', dir: 'down' },
  ];
  const REL = [ // [what, how, strength]
    [0, 0, 3], [0, 2, 9], [0, 5, 1],
    [1, 0, 9], [1, 1, 9], [1, 3, 1],
    [2, 0, 1], [2, 1, 3], [2, 3, 9],
    [3, 2, 1], [3, 4, 9],
    [4, 0, 3], [4, 2, 3], [4, 5, 9],
  ];
  const ROOF = [[0, 1, '++'], [0, 3, '-'], [1, 3, '--'], [2, 4, '-'], [2, 5, '+']];
  // Customer competitive assessment, 1–5: [ours, competitor A, competitor B]
  const RATING = [[2, 4, 3], [4, 3, 3], [3, 4, 2], [2, 3, 4], [3, 2, 4]];

  // Arithmetic: importance(j) = Σ_i weight(i) × strength(i, j)
  const imp = HOWS.map((_, j) => REL.filter(r => r[1] === j).reduce((a, r) => a + WHATS[r[0]].weight * r[2], 0));
  const total = imp.reduce((a, b) => a + b, 0);
  const pct = imp.map(v => v / total * 100);
  const rank = imp.map(v => 1 + imp.filter(o => o > v).length);
  if (JSON.stringify(imp) !== '[60,45,55,31,36,23]' || total !== 250) throw new Error(`QFD arithmetic changed: ${imp} / ${total}`);

  const s = sheet();
  const M = 48, WHAT_W = 236, WT_W = 64, CW = 96, n = HOWS.length;
  const WX = M + WHAT_W, HX0 = WX + WT_W, HX1 = HX0 + n * CW;
  const CX0 = HX1 + 28, CPW = 236, W = CX0 + CPW + M;
  const RB = 396, DIR_H = 30, HEAD_H = 78, RH = 48;
  const DY = RB, HY = RB + DIR_H, BY = HY + HEAD_H, BYE = BY + WHATS.length * RH;
  const IMP_H = [44, 34, 34], IY = [BYE, BYE + 44, BYE + 78], IYE = BYE + 112;
  const xc = j => HX0 + (j + 0.5) * CW;

  s.text(TITLE, M, 46, { fs: FS.title, weight: 600 });
  s.text(SUB, M, 74, { fs: FS.subtitle, fill: C.slate });

  // Legend in the free space left of the roof.
  let ly = 124;
  const lx = M;
  s.text('RELATIONSHIP', lx, ly, { fs: FS.caption, weight: 600, fill: C.slate }); ly += 24;
  const sym = (kind, cx, cy) => {
    if (kind === 9) s.shape(`<circle cx="${cx}" cy="${cy}" r="8" fill="${C.ink}"/>`, { x0: cx - 8, y0: cy - 8, x1: cx + 8, y1: cy + 8 });
    else if (kind === 3) s.shape(`<circle cx="${cx}" cy="${cy}" r="7.5" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>`, { x0: cx - 9, y0: cy - 9, x1: cx + 9, y1: cy + 9 });
    else s.shape(`<polygon points="${tri(cx, cy, 18)}" fill="${C.paper}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`, { x0: cx - 10, y0: cy - 10, x1: cx + 10, y1: cy + 10 });
  };
  for (const [k, name] of [[9, 'Strong = 9'], [3, 'Medium = 3'], [1, 'Weak = 1']]) {
    sym(k, lx + 10, ly - 4.5); s.text(name, lx + 30, ly, { fs: FS.small }); ly += 24;
  }
  ly += 14;
  s.text('CORRELATION (ROOF)', lx, ly, { fs: FS.caption, weight: 600, fill: C.slate }); ly += 24;
  const corrText = c => c.replace(/-/g, '−');
  for (const [c, name] of [['++', 'Strong positive'], ['+', 'Positive'], ['-', 'Negative'], ['--', 'Strong negative']]) {
    s.text(corrText(c), lx + 10, ly, { fs: FS.head, weight: 700, fill: c.includes('+') ? C.accent : C.neg, anchor: 'middle' });
    s.text(name, lx + 30, ly, { fs: FS.small }); ly += 24;
  }

  // Roof: 45° lattice of diamond cells over the HOW columns.
  const roofStroke = { stroke: C.ruleStrong, width: 1 };
  const apex = [HX0 + n * CW / 2, RB - n * CW / 2];
  s.line([HX0, RB], apex, roofStroke);
  s.line([HX1, RB], apex, roofStroke);
  for (let k = 1; k < n; k++) {
    const xk = HX0 + k * CW;
    const tr = (HX1 - xk) / 2, tl = (xk - HX0) / 2;
    s.line([xk, RB], [xk + tr, RB - tr], roofStroke);
    s.line([xk, RB], [xk - tl, RB - tl], roofStroke);
  }
  for (const [a, b, c] of ROOF) {
    const cx = HX0 + (a + b + 1) * CW / 2, cy = RB - (b - a) * CW / 2;
    s.text(corrText(c), cx, cy + 6, { fs: 18, weight: 700, fill: c.includes('+') ? C.accent : C.neg, anchor: 'middle', within: { x0: cx - 24, y0: cy - 24, x1: cx + 24, y1: cy + 24 } });
  }

  // Grid backgrounds.
  s.rect(M, DY, WHAT_W + WT_W, HEAD_H + DIR_H, { fill: C.band });
  s.rect(HX0, HY, n * CW, HEAD_H, { fill: C.band });
  const top = imp.indexOf(Math.max(...imp));
  s.rect(xc(top) - CW / 2, IY[0], CW, IMP_H[0] + IMP_H[1] + IMP_H[2], { fill: C.highlight });

  // Direction-of-improvement row.
  s.text('Direction of improvement', HX0 - 12, DY + 19, { fs: FS.small, fill: C.slate, anchor: 'end', within: { x0: M, y0: DY, x1: HX0, y1: HY } });
  HOWS.forEach((h, j) => {
    const cx = xc(j), cy = DY + DIR_H / 2, up = h.dir === 'up';
    const tip = up ? cy - 9 : cy + 9, base = up ? cy - 1 : cy + 1, tail = up ? cy + 9 : cy - 9;
    s.shape(`<path d="M${cx} ${tail} V${base}" stroke="${C.ink}" stroke-width="2"/><path d="M${cx - 6} ${base} L${cx + 6} ${base} L${cx} ${tip} Z" fill="${C.ink}"/>`, { x0: cx - 6, y0: cy - 9, x1: cx + 6, y1: cy + 9 });
  });

  // HOW header row.
  HOWS.forEach((h, j) => {
    const lines = wrap(h.label, CW - 14, FS.small, 600);
    s.block(lines, xc(j), HY + HEAD_H / 2, 15, { fs: FS.small, weight: 600, anchor: 'middle', within: { x0: xc(j) - CW / 2, y0: HY, x1: xc(j) + CW / 2, y1: BY } });
  });
  s.text('Customer requirements', M + 12, BY - 14, { fs: FS.small, weight: 600, within: { x0: M, y0: HY, x1: WX, y1: BY } });
  s.text('Weight', WX + WT_W / 2, BY - 14, { fs: FS.small, weight: 600, anchor: 'middle', within: { x0: WX, y0: HY, x1: HX0, y1: BY } });

  // Body.
  WHATS.forEach((w, i) => {
    const y0 = BY + i * RH, cy = y0 + RH / 2;
    s.text(w.label, M + 12, cy + 4.6, { fs: FS.body, within: { x0: M, y0, x1: WX, y1: y0 + RH } });
    s.text(String(w.weight), WX + WT_W / 2, cy + 4.6, { fs: FS.body, weight: 600, anchor: 'middle', within: { x0: WX, y0, x1: HX0, y1: y0 + RH } });
  });
  for (const [i, j, k] of REL) sym(k, xc(j), BY + (i + 0.5) * RH);

  // Computed rows.
  const merged = (label, caption, y0, h) => {
    const within = { x0: M, y0, x1: HX0, y1: y0 + h };
    if (caption) {
      s.text(label, M + 12, y0 + 19, { fs: FS.body, weight: 600, within });
      s.text(caption, M + 12, y0 + 35, { fs: FS.caption, fill: C.slate, within });
    } else s.text(label, M + 12, y0 + h / 2 + 4.6, { fs: FS.body, weight: 600, within });
  };
  merged('Technical importance', 'Σ (weight × relationship strength)', IY[0], IMP_H[0]);
  merged('Relative importance', null, IY[1], IMP_H[1]);
  merged('Priority rank', null, IY[2], IMP_H[2]);
  HOWS.forEach((_, j) => {
    const cell = r => ({ x0: xc(j) - CW / 2, y0: IY[r], x1: xc(j) + CW / 2, y1: IY[r] + IMP_H[r] });
    s.text(String(imp[j]), xc(j), IY[0] + IMP_H[0] / 2 + 5, { fs: FS.head + 1, weight: 700, anchor: 'middle', within: cell(0) });
    s.text(`${pct[j].toFixed(1)}%`, xc(j), IY[1] + IMP_H[1] / 2 + 4.6, { fs: FS.body, fill: C.slate, anchor: 'middle', within: cell(1) });
    s.text(String(rank[j]), xc(j), IY[2] + IMP_H[2] / 2 + 4.6, { fs: FS.body, weight: 600, fill: rank[j] === 1 ? C.accent : C.ink, anchor: 'middle', within: cell(2) });
  });

  // Grid lines (drawn after fills).
  const strong = { stroke: C.ruleStrong, width: 1 };
  s.line([M, DY], [HX0, DY], strong);
  s.line([HX0, RB], [HX1, RB], strong);
  s.line([M, HY], [HX1, HY], { stroke: C.rule });
  s.line([M, BY], [HX1, BY], strong);
  for (let i = 1; i < WHATS.length; i++) s.line([M, BY + i * RH], [HX1, BY + i * RH]);
  s.line([M, BYE], [HX1, BYE], strong);
  s.line([M, IY[1]], [HX1, IY[1]]);
  s.line([M, IY[2]], [HX1, IY[2]]);
  s.line([M, IYE], [HX1, IYE], strong);
  s.line([M, DY], [M, IYE], strong);
  s.line([WX, HY], [WX, BYE]);
  s.line([HX0, RB], [HX0, IYE], strong);
  for (let k = 1; k < n; k++) s.line([HX0 + k * CW, HY], [HX0 + k * CW, IYE]);
  s.line([HX1, RB], [HX1, IYE], strong);

  // Competitive assessment panel.
  const sx = v => CX0 + 24 + (v - 1) * (CPW - 48) / 4;
  s.rect(CX0, HY, CPW, HEAD_H, { fill: C.band });
  const headWithin = { x0: CX0, y0: HY, x1: CX0 + CPW, y1: BY };
  s.text('Customer rating', CX0 + 12, HY + 22, { fs: FS.small, weight: 600, within: headWithin });
  s.text('1 = poor · 5 = best', CX0 + 12, HY + 39, { fs: FS.caption, fill: C.slate, within: headWithin });
  for (let v = 1; v <= 5; v++) {
    s.text(String(v), sx(v), BY - 12, { fs: FS.caption, weight: 600, fill: C.slate, anchor: 'middle', within: headWithin });
    s.line([sx(v), BY + 6], [sx(v), BYE - 6], { stroke: C.rule, dash: '2 3' });
  }
  s.line([CX0, HY], [CX0 + CPW, HY], { stroke: C.rule });
  s.line([CX0, BY], [CX0 + CPW, BY], strong);
  for (let i = 1; i < WHATS.length; i++) s.line([CX0, BY + i * RH], [CX0 + CPW, BY + i * RH]);
  s.line([CX0, BYE], [CX0 + CPW, BYE], strong);
  s.line([CX0, HY], [CX0, BYE], strong);
  s.line([CX0 + CPW, HY], [CX0 + CPW, BYE], strong);
  const marker = (who, cx, cy) => {
    if (who === 0) s.shape(`<circle cx="${cx}" cy="${cy}" r="5.5" fill="${C.accent}"/>`, { x0: cx - 6, y0: cy - 6, x1: cx + 6, y1: cy + 6 });
    else if (who === 1) s.shape(`<rect x="${cx - 4.5}" y="${cy - 4.5}" width="9" height="9" fill="${C.paper}" stroke="${C.slate}" stroke-width="1.6"/>`, { x0: cx - 6, y0: cy - 6, x1: cx + 6, y1: cy + 6 });
    else s.shape(`<polygon points="${tri(cx, cy, 11, false)}" fill="${C.paper}" stroke="${C.slate}" stroke-width="1.6" stroke-linejoin="round"/>`, { x0: cx - 6, y0: cy - 6, x1: cx + 6, y1: cy + 6 });
  };
  const ours = [];
  RATING.forEach((r, i) => {
    const cy = BY + (i + 0.5) * RH;
    r.forEach((v, who) => marker(who, sx(v), cy + (who - 1) * 11));
    ours.push(`${sx(r[0])},${cy - 11}`);
  });
  s.raw(`<polyline points="${ours.join(' ')}" fill="none" stroke="${C.accent}" stroke-width="1.2" stroke-opacity="0.55"/>`);
  let ky = IY[0] + 20;
  ['Our current model', 'Competitor A', 'Competitor B'].forEach((name, who) => {
    marker(who, CX0 + 18, ky - 4.5); s.text(name, CX0 + 34, ky, { fs: FS.small }); ky += 24;
  });

  const foot = wrap(`Each technical importance is the sum, down its column, of customer weight × relationship strength (9 / 3 / 1); relative importance is that sum as a share of all ${total} points. Heater power leads, but its roof shows a trade-off with pump noise.`, W - 2 * M, FS.small, 400);
  let fy = IYE + 32;
  for (const l of foot) { s.text(l, M, fy, { fs: FS.small, fill: C.slate }); fy += 18; }
  const H = Math.ceil(fy + 14);
  const counts = s.check('qfd', W, H);

  const desc = `A House of Quality for a drip coffee maker. Five customer requirements with importance weights sit on the left; six technical characteristics with direction-of-improvement arrows run across the top. The relationship matrix uses filled circles (strong, 9), open circles (medium, 3) and triangles (weak, 1). A triangular roof records correlations between characteristics. Computed rows give technical importance ${HOWS.map((h, j) => `${h.label} ${imp[j]}`).join(', ')}, their share of ${total}, and priority rank. A right-hand panel compares customer ratings of our model with two competitors.`;
  const source = `matrix qfd "Drip coffee maker"
${WHATS.map(w => `what: "${w.label}" weight: ${w.weight}`).join('\n')}
${HOWS.map(h => `how: "${h.label}" dir: ${h.dir}`).join('\n')}
${REL.map(([i, j, k]) => `rel (${i},${j}): ${k}`).join('\n')}
${ROOF.map(([a, b, c]) => `roof (${a},${b}): ${c}`).join('\n')}
`;
  const notes = `A House of Quality for a drip coffee maker, the central matrix of Quality Function Deployment as Yoji Akao defined it (*Quality Function Deployment*, 1990) and as Hauser & Clausing popularised it in the West ([“The House of Quality”, *Harvard Business Review*, May–June 1988](https://hbr.org/1988/05/the-house-of-quality)). Customer requirements with importance weights form the rows, technical characteristics with a direction of improvement form the columns, the body records relationship strength on the 9 / 3 / 1 scale, the triangular roof records whether two characteristics support or conflict with each other (++ to −−), and the foot of the house carries the computed technical importance (Σ weight × strength per column) and its relative share ([ASQ, What is QFD?](https://asq.org/quality-resources/qfd-quality-function-deployment)). Here the totals are ${imp.join(' / ')} out of ${total}, so heater power (24.0%) and carafe heat loss (22.0%) are the priorities; the customer-rating panel on the right is Hauser & Clausing's competitive assessment.

Why it works as the exemplar for this type:

- The house shape is literal: a 45° lattice of diamond cells sits exactly over the characteristic columns, each diamond at the meeting point of its two columns, holding a bold ++ / + in the accent blue or − / −− in brick red; empty diamonds mean no correlation.
- Relationship strength is carried by the three standard symbols — filled circle, open circle, open triangle — centred in square-ish cells, never by numbers, and a legend in the empty corner beside the roof gives each symbol its 9 / 3 / 1 value.
- Each characteristic has its unit in the header and a drawn up or down arrow in a dedicated row above it, labelled "Direction of improvement".
- The computed rows are visually separate from the input body (heavier rule, merged label cell with the formula in a caption line) and show the raw sum, the percentage and the rank; the top-ranked column is shaded through all three rows.
- The competitive assessment shares the body's row grid, uses a 1–5 scale with dotted guides, and gives our model, competitor A and competitor B distinct marker shapes on offset lines so equal scores never overlap; a faint line joins our own ratings.
- Header labels wrap horizontally inside 96 px columns instead of being rotated, and a footnote states the arithmetic in words.

The DSL cannot express the competitive assessment, and it has no separate percentage and raw-sum display at once (\`normalize: true\` switches between them); ideal.svg shows both because the standard house shows both.

Palette: ink #1e293b, slate #475569, grid rule #e2e8f0, section rule #cbd5e1, header band #F1F3F6, top-priority shade #E6E9ED, positive correlation and our model #24618c, negative correlation #a1543f, paper #ffffff.
`;
  return { key: 'qfd', W, H, svg: s.svg(W, H, TITLE, desc), source, notes, counts };
}

const results = [drawSipoc(), drawQfd()];
for (const r of results) {
  const raster = new Resvg(r.svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render();
  const dir = new URL(`${r.key}/`, ROOT);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('ideal.svg', dir), r.svg);
  await writeFile(new URL('source.sx', dir), r.source);
  await writeFile(new URL('notes.md', dir), r.notes);
  if (PNG_DIR) { await mkdir(PNG_DIR, { recursive: true }); await writeFile(`${PNG_DIR}/matrix-${r.key}.png`, raster.asPng()); }
  console.log(`${r.key}: ${r.W}×${r.H}`, JSON.stringify(r.counts));
}
