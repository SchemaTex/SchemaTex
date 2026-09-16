/**
 * Hand-authored git branch graph exemplars, one per variant, from one Git Flow history.
 *   node scripts/visual-eval/draw-gitgraph-exemplar.mjs [preview-dir]
 * Writes visual-eval/exemplars/gitgraph/{vertical,horizontal}/ideal.svg, each only
 * after checking that no text touches another text, a lane line or the canvas
 * edge, measured with resvg's own text shaping. With a directory argument it also
 * writes gitgraph-vertical.png and gitgraph-horizontal.png there.
 *
 *   vertical   — one row per commit, newest at the top, as in `git log --graph`.
 *   horizontal — time left to right, one lane per branch stacked top to bottom.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// ---------------------------------------------------------------- tokens
const C = { paper: '#FFFFFF', ink: '#0F172A', muted: '#475569', faint: '#64748B', rule: '#94A3B8', band: '#F8FAFC', tagLine: '#334155' };
const LANE = {
  main: { i: 0, color: '#2563EB' },
  'hotfix/2.3.1': { i: 1, color: '#DC2626' },
  'release/2.4': { i: 2, color: '#7C3AED' },
  develop: { i: 3, color: '#D97706' },
  'feature/saved-carts': { i: 4, color: '#059669' },
};
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 20, sub: 11, msg: 13, msgH: 12, pill: 11, legend: 11.5 };
const SW = { lane: 2.5 };
const OUTDIR = process.argv[2];

// ---------------------------------------------------------------- history (oldest first)
const commits = [
  { id: 'c1', lane: 'main', msg: 'Release 2.3.0', parents: [], tag: 'v2.3.0' },
  { id: 'c2', lane: 'develop', msg: 'Add product search API', parents: ['c1'] },
  { id: 'c3', lane: 'feature/saved-carts', msg: 'Persist carts per user', parents: ['c2'] },
  { id: 'c4', lane: 'feature/saved-carts', msg: 'Restore cart on sign-in', parents: ['c3'] },
  { id: 'c5', lane: 'hotfix/2.3.1', msg: 'Fix VAT rounding on refunds', parents: ['c1'], highlight: true },
  { id: 'c6', lane: 'main', msg: 'Merge hotfix/2.3.1', parents: ['c1', 'c5'], tag: 'v2.3.1' },
  { id: 'c7', lane: 'develop', msg: 'Merge hotfix/2.3.1 into develop', parents: ['c2', 'c5'] },
  { id: 'c8', lane: 'develop', msg: 'Merge feature/saved-carts', parents: ['c7', 'c4'] },
  { id: 'c9', lane: 'release/2.4', msg: 'Bump version to 2.4.0', parents: ['c8'] },
  { id: 'c10', lane: 'release/2.4', msg: 'Fix checkout button copy', parents: ['c9'] },
  { id: 'c11', lane: 'main', msg: 'Merge release/2.4', parents: ['c6', 'c10'], tag: 'v2.4.0' },
  { id: 'c12', lane: 'develop', msg: 'Merge release/2.4 into develop', parents: ['c8', 'c10'] },
];
const N = commits.length;
const kindOf = (c) => (c.parents.length > 1 ? 'merge' : c.highlight ? 'highlight' : 'commit');

// ---------------------------------------------------------------- kit
const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let out = [], texts = [], segs = [];
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
function text(s, x, y, { fs = FS.msg, weight = 400, fill = C.ink, anchor = 'start' } = {}) {
  const m = measure(s, fs, weight, anchor);
  const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 };
  texts.push({ s, r });
  out.push(`<text x="${x}" y="${y}" font-size="${fs}"${weight !== 400 ? ` font-weight="${weight}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${fill}">${esc(s)}</text>`);
  return r;
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
function path(d, color, pts) {
  out.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${SW.lane}" stroke-linecap="round"/>`);
  for (let i = 0; i + 1 < pts.length; i++) segs.push([pts[i], pts[i + 1]]);
}
function bezier(p0, p1, p2, p3) {
  const pts = [];
  for (let t = 0; t <= 1.0001; t += 0.0625) {
    const u = 1 - t;
    pts.push([0, 1].map((k) => u ** 3 * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t ** 3 * p3[k]));
  }
  return pts;
}
function pill(s, x, cy, { fill, stroke, color, weight = 600, tag = false, anchor = 'start' }) {
  const m = measure(s, FS.pill, weight, 'start');
  const padL = tag ? 18 : 8, w = m.x1 - m.x0 + padL + 8, h = 19;
  if (anchor === 'middle') x -= w / 2;
  if (anchor === 'end') x -= w;
  out.push(`<rect x="${x}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1.2"` : ''}/>`);
  if (tag) out.push(`<circle cx="${x + 9}" cy="${cy}" r="2.6" fill="none" stroke="${color}" stroke-width="1.3"/>`);
  text(s, x + padL, cy + 4, { fs: FS.pill, weight, fill: color });
  return { x0: x, x1: x + w, y0: cy - h / 2, y1: cy + h / 2 };
}
const branchPill = (lane, x, cy, anchor) => pill(lane, x, cy, { fill: LANE[lane].color, color: C.paper, anchor });
const tagPill = (s, x, cy, anchor) => pill(s, x, cy, { fill: C.paper, stroke: C.tagLine, color: C.ink, tag: true, anchor });
function marker(x, y, lane, kind) {
  const col = LANE[lane].color;
  if (kind === 'merge') out.push(`<circle cx="${x}" cy="${y}" r="6.5" fill="${C.paper}" stroke="${col}" stroke-width="2.5"/>`);
  else if (kind === 'highlight') out.push(`<rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="2" fill="${col}" stroke="${C.paper}" stroke-width="2"/>`);
  else out.push(`<circle cx="${x}" cy="${y}" r="6.5" fill="${col}" stroke="${C.paper}" stroke-width="2"/>`);
}
function header(W, subtitle) {
  text('Git Flow release history', 44, 50, { fs: FS.title, weight: 600 });
  text(subtitle, 44, 74, { fs: FS.sub, fill: C.faint });
  out.push(`<line x1="44" y1="88" x2="${W - 44}" y2="88" stroke="${C.rule}" stroke-width="1"/>`);
}
function legend(W, LY) {
  out.push(`<line x1="44" y1="${LY - 26}" x2="${W - 44}" y2="${LY - 26}" stroke="${C.rule}" stroke-width="1"/>`);
  let lx = 56;
  const leg = (kind, cap) => { marker(lx, LY - 4, 'main', kind); const r = text(cap, lx + 14, LY, { fs: FS.legend, fill: C.muted }); lx = r.x1 + 30; };
  leg('commit', 'commit');
  leg('merge', 'merge commit');
  leg('highlight', 'highlighted commit');
  lx = pill('branch', lx - 6, LY - 4, { fill: LANE.main.color, color: C.paper }).x1 + 8;
  lx = text('branch', lx, LY, { fs: FS.legend, fill: C.muted }).x1 + 30;
  lx = tagPill('v1.0', lx - 6, LY - 4).x1 + 8;
  text('tag', lx, LY, { fs: FS.legend, fill: C.muted });
}
function check(W, H, dots) {
  const errs = [];
  texts.forEach((t, i) => {
    if (t.r.x0 < 8 || t.r.y0 < 8 || t.r.x1 > W - 8 || t.r.y1 > H - 8) errs.push(`off canvas: ${t.s}`);
    texts.slice(i + 1).forEach((u) => {
      if (t.r.x0 < u.r.x1 + 2 && u.r.x0 < t.r.x1 + 2 && t.r.y0 < u.r.y1 + 2 && u.r.y0 < t.r.y1 + 2) errs.push(`text/text: ${t.s} | ${u.s}`);
    });
    for (const s of segs) if (segHitsRect(s, t.r, 4)) { errs.push(`text/line: ${t.s}`); break; }
    for (const d of dots) if (segHitsRect([[d.x, d.y], [d.x, d.y]], t.r, 9)) errs.push(`text/commit: ${t.s} @ ${d.id}`);
  });
  if (errs.length) { console.error([...new Set(errs)].join('\n')); process.exit(1); }
}
function svgDoc(W, H, desc) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">
<title>Git Flow release history</title>
<desc>${desc}</desc>
${out.join('\n')}
</svg>
`;
}
const STORY = 'main is tagged v2.3.0; develop branches from it and feature/saved-carts branches from develop with two commits. hotfix/2.3.1 branches from main with a highlighted fix, merges into main as v2.3.1 and into develop. The feature merges into develop, release/2.4 branches from develop with two commits and merges into main as v2.4.0 and back into develop.';

// ================================================================ vertical
function vertical() {
  out = []; texts = []; segs = [];
  const LX0 = 72, LSTEP = 30, ROW = 40, TOP = 136, MSGX = 250, W = 920;
  const H = TOP + (N - 1) * ROW + 118;
  const P = Object.fromEntries(commits.map((c, k) => [c.id, { ...c, x: LX0 + LANE[c.lane].i * LSTEP, y: TOP + (N - 1 - k) * ROW }]));
  const tips = {};
  for (const c of commits) tips[c.lane] = c.id;

  out.push(`<rect width="${W}" height="${H}" fill="${C.paper}"/>`);
  header(W, 'GIT BRANCH GRAPH · 5 BRANCHES · 12 COMMITS · NEWEST COMMIT AT THE TOP');
  commits.forEach((c, k) => { if (k % 2 === 0) out.push(`<rect x="44" y="${P[c.id].y - ROW / 2}" width="${W - 88}" height="${ROW}" fill="${C.band}"/>`); });

  for (const c of commits) {
    const ch = P[c.id];
    c.parents.forEach((pid, n) => {
      const p = P[pid];
      if (p.x === ch.x) { path(`M ${p.x} ${p.y} V ${ch.y}`, LANE[c.lane].color, [[p.x, p.y], [ch.x, ch.y]]); return; }
      if (n === 0) { // fork: leave the parent at once, then run up the new lane
        const a = [p.x, p.y], b = [ch.x, p.y - ROW], ym = (a[1] + b[1]) / 2;
        path(`M ${a[0]} ${a[1]} C ${a[0]} ${ym}, ${b[0]} ${ym}, ${b[0]} ${b[1]} V ${ch.y}`, LANE[c.lane].color, [...bezier(a, [a[0], ym], [b[0], ym], b), [ch.x, ch.y]]);
      } else { // merge: run up the source lane, then turn into the merge commit
        const a = [p.x, ch.y + ROW], b = [ch.x, ch.y], ym = (a[1] + b[1]) / 2;
        path(`M ${p.x} ${p.y} V ${a[1]} C ${a[0]} ${ym}, ${b[0]} ${ym}, ${b[0]} ${b[1]}`, LANE[p.lane].color, [[p.x, p.y], ...bezier(a, [a[0], ym], [b[0], ym], b)]);
      }
    });
  }
  for (const c of commits) {
    const { x, y } = P[c.id], kind = kindOf(c);
    marker(x, y, c.lane, kind);
    const r = text(c.msg, MSGX, y + 4.5, { fs: FS.msg, weight: kind === 'highlight' ? 600 : 400, fill: kind === 'merge' ? C.muted : C.ink });
    let px = r.x1 + 12;
    for (const [lane, tip] of Object.entries(tips)) if (tip === c.id) px = branchPill(lane, px, y).x1 + 6;
    if (c.tag) tagPill(c.tag, px, y);
  }
  legend(W, TOP + (N - 1) * ROW + 62);
  check(W, H, Object.values(P));
  return svgDoc(W, H, `Git branch graph with one coloured lane per branch and one row per commit, newest at the top. ${STORY}`);
}

// ================================================================ horizontal
function horizontal() {
  out = []; texts = []; segs = [];
  // Columns follow ancestry, not wall-clock: a commit sits one column right of its
  // latest parent, so unrelated work on different branches shares a column.
  const gen = {};
  for (const c of commits) gen[c.id] = c.parents.length ? Math.max(...c.parents.map((p) => gen[p])) + 1 : 0;
  const COLS = Math.max(...Object.values(gen)) + 1;
  const X0 = 276, S = 142, TOP = 178, LSTEP = 92, CURVE = 0.45 * S, WRAP = 118, LINE_H = 15;
  const W = X0 + (COLS - 1) * S + 152;
  const laneY = (lane) => TOP + LANE[lane].i * LSTEP;
  const P = Object.fromEntries(commits.map((c) => [c.id, { ...c, x: X0 + gen[c.id] * S, y: laneY(c.lane) }]));
  const H = laneY('feature/saved-carts') + 118;

  out.push(`<rect width="${W}" height="${H}" fill="${C.paper}"/>`);
  header(W, 'GIT BRANCH GRAPH · 5 BRANCHES · 12 COMMITS · TIME RUNS LEFT TO RIGHT');
  for (const lane of Object.keys(LANE)) if (LANE[lane].i % 2 === 0) out.push(`<rect x="44" y="${laneY(lane) - LSTEP / 2}" width="${W - 88}" height="${LSTEP}" fill="${C.band}"/>`);

  // edges: a fork leaves its parent vertically and settles into the child lane;
  // a merge runs along its own lane and rises or drops into the merge commit.
  for (const c of commits) {
    const ch = P[c.id];
    c.parents.forEach((pid, n) => {
      const p = P[pid];
      if (p.y === ch.y) { path(`M ${p.x} ${p.y} H ${ch.x}`, LANE[c.lane].color, [[p.x, p.y], [ch.x, ch.y]]); return; }
      if (n === 0) {
        const a = [p.x, p.y], b = [p.x + CURVE, ch.y];
        const c1 = [a[0], b[1]], c2 = [a[0] + CURVE * 0.1, b[1]];
        path(`M ${a[0]} ${a[1]} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${b[0]} ${b[1]} H ${ch.x}`, LANE[c.lane].color, [...bezier(a, c1, c2, b), [ch.x, ch.y]]);
      } else {
        const a = [ch.x - CURVE, p.y], b = [ch.x, ch.y];
        const c1 = [b[0] - CURVE * 0.1, a[1]], c2 = [b[0], a[1]];
        path(`M ${p.x} ${p.y} H ${a[0]} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${b[0]} ${b[1]}`, LANE[p.lane].color, [[p.x, p.y], ...bezier(a, c1, c2, b)]);
      }
    });
  }

  // branch names in the left gutter; live branches also named at their tip
  for (const lane of Object.keys(LANE)) branchPill(lane, X0 - 62, laneY(lane), 'end');
  const tip = {};
  for (const c of commits) tip[c.lane] = c.id;
  for (const lane of ['main', 'develop']) branchPill(lane, P[tip[lane]].x + 20, laneY(lane), 'start');

  // commit messages, wrapped to two lines, on the side of the dot no line leaves from
  const lineAbove = (d) => commits.some((c) => (c.parents[0] === d.id && laneY(c.lane) < d.y) || (c.id === d.id && c.parents.slice(1).some((p) => P[p].y < d.y)));
  const lineBelow = (d) => commits.some((c) => (c.parents[0] === d.id && laneY(c.lane) > d.y) || (c.id === d.id && c.parents.slice(1).some((p) => P[p].y > d.y)));
  // one line when it fits; otherwise the two-line split whose longer line is shortest
  function wrap(s, fs, weight) {
    const wid = (t) => { const m = measure(t, fs, weight, 'start'); return m.x1 - m.x0; };
    if (wid(s) <= WRAP) return [s];
    const words = s.split(' ');
    let best = [s], bestW = Infinity;
    for (let k = 1; k < words.length; k++) {
      const pair = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
      const w = Math.max(...pair.map(wid));
      if (w < bestW) { best = pair; bestW = w; }
    }
    return best;
  }
  for (const c of commits) {
    const d = P[c.id], kind = kindOf(c);
    marker(d.x, d.y, c.lane, kind);
    const weight = kind === 'highlight' ? 600 : 400, fill = kind === 'merge' ? C.muted : C.ink;
    const lines = wrap(c.msg, FS.msgH, weight);
    const above = lineBelow(d) && !lineAbove(d);
    const bothSides = lineBelow(d) && lineAbove(d);
    // with lines on both sides, the message sits below and to the right, clear of the vertical run
    const anchor = bothSides ? 'start' : 'middle', lx = bothSides ? d.x + 14 : d.x;
    let top;
    if (above) {
      top = d.y - 18 - (lines.length - 1) * LINE_H;
      lines.forEach((ln, k) => text(ln, lx, top + k * LINE_H, { fs: FS.msgH, weight, fill, anchor }));
      if (c.tag) tagPill(c.tag, d.x, top - 24, 'middle');
    } else {
      lines.forEach((ln, k) => text(ln, lx, d.y + 26 + k * LINE_H, { fs: FS.msgH, weight, fill, anchor }));
      if (c.tag) tagPill(c.tag, d.x, d.y - 24, 'middle');
    }
  }
  legend(W, H - 34);
  check(W, H, Object.values(P));
  return svgDoc(W, H, `Git branch graph with time running left to right and one coloured lane per branch, main on top. ${STORY}`);
}

for (const [variant, draw] of [['vertical', vertical], ['horizontal', horizontal]]) {
  const svg = draw();
  await writeFile(new URL(`../../visual-eval/exemplars/gitgraph/${variant}/ideal.svg`, import.meta.url), svg);
  if (OUTDIR) await writeFile(`${OUTDIR}/gitgraph-${variant}.png`, new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
  console.log(variant, 'ok', texts.length, 'texts');
}
