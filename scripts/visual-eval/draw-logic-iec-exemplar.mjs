/**
 * Hand-authored IEC 60617-12 logic exemplar: the same 2-bit magnitude comparator as
 * visual-eval/exemplars/logic/ansi/, same grid, palette and type scale, with every gate
 * drawn as a rectangle carrying its qualifying symbol.
 *   node scripts/visual-eval/draw-logic-iec-exemplar.mjs [preview.png]
 * Text bounds come from resvg shaping. Nothing is written unless the geometry checks pass.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const C = { ink: '#1E293B', muted: '#64748B', paper: '#FFFFFF', rule: '#E2E8F0' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 20, port: 13, qualifier: 13, caption: 11.5, net: 10 };
const SW = { gate: 1.5, wire: 1.25, rule: 1 };
const GATE = { w: 44, h2: 48, h3: 60, h1: 44, bubble: 5 };
const W = 1290, H = 706;
const font = { loadSystemFonts: false, fontFiles: ['/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc', '/System/Library/Fonts/Supplemental/Arial.ttf'], defaultFontFamily: 'Helvetica Neue' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Gates keep the ANSI exemplar's columns and output rows. x = input edge.
const gates = [
  { id: 'd1', q: '=1', x: 190, y: 130, n: 2 },
  { id: 'nB1', q: '1', x: 190, y: 306, n: 1, neg: true },
  { id: 'd0', q: '=1', x: 190, y: 482, n: 2 },
  { id: 'nB0', q: '1', x: 190, y: 570, n: 1, neg: true },
  { id: 'e1', q: '1', x: 380, y: 130, n: 1, neg: true },
  { id: 'g1', q: '&', x: 380, y: 218, n: 2 },
  { id: 'EQ', q: '≥1', x: 570, y: 394, n: 2, neg: true },
  { id: 'g0', q: '&', x: 570, y: 482, n: 3 },
  { id: 'GT', q: '≥1', x: 760, y: 306, n: 2 },
  { id: 'LT', q: '≥1', x: 950, y: 482, n: 2, neg: true },
];
const gateById = Object.fromEntries(gates.map(g => [g.id, g]));
for (const g of gates) {
  g.h = g.n === 3 ? GATE.h3 : g.n === 1 ? GATE.h1 : GATE.h2;
  g.box = { x0: g.x, y0: g.y - g.h / 2, x1: g.x + GATE.w, y1: g.y + g.h / 2 };
  g.out = g.x + GATE.w + (g.neg ? 2 * GATE.bubble : 0);
}
const out = id => gateById[id].out;

// Wires: [points, from, to]. Endpoints on gate edges; fan-out branches start on a wire.
const wires = [
  [[[62, 118], [190, 118]], null, 'd1'],
  [[[110, 118], [110, 206], [380, 206]], null, 'g1'],
  [[[62, 142], [190, 142]], null, 'd1'],
  [[[88, 142], [88, 306], [190, 306]], null, 'nB1'],
  [[[62, 470], [190, 470]], null, 'd0'],
  [[[110, 470], [110, 526], [490, 526], [490, 482], [570, 482]], null, 'g0'],
  [[[62, 494], [190, 494]], null, 'd0'],
  [[[88, 494], [88, 570], [190, 570]], null, 'nB0'],
  [[[out('d1'), 130], [380, 130]], 'd1', 'e1'],
  [[[276, 130], [276, 382], [570, 382]], null, 'EQ'],
  [[[out('nB1'), 306], [300, 306], [300, 230], [380, 230]], 'nB1', 'g1'],
  [[[out('d0'), 482], [324, 482], [324, 406], [570, 406]], 'd0', 'EQ'],
  [[[out('e1'), 130], [466, 130], [466, 464], [570, 464]], 'e1', 'g0'],
  [[[out('nB0'), 570], [514, 570], [514, 500], [570, 500]], 'nB0', 'g0'],
  [[[out('g1'), 218], [668, 218], [668, 294], [760, 294]], 'g1', 'GT'],
  [[[out('g0'), 482], [692, 482], [692, 318], [760, 318]], 'g0', 'GT'],
  [[[out('GT'), 306], [1150, 306]], 'GT', null],
  [[[924, 306], [924, 470], [950, 470]], null, 'LT'],
  [[[out('EQ'), 394], [1150, 394]], 'EQ', null],
  [[[852, 394], [852, 494], [950, 494]], null, 'LT'],
  [[[out('LT'), 482], [1150, 482]], 'LT', null],
];
const dots = [[110, 118], [88, 142], [110, 470], [88, 494], [276, 130], [924, 306], [852, 394]];

const texts = [];
const T = (s, x, y, fs, { fill = C.ink, anchor = 'start', weight = 400, ls = 0, owner = null } = {}) => texts.push({ s, x, y, fs, fill, anchor, weight, ls, owner });
T('2-bit Magnitude Comparator', 46, 56, FS.title, { weight: 600 });
T('IEC 60617-12 rectangular symbols · signal flow left to right', 46, 80, FS.caption, { fill: C.muted });
T('filled dot = junction · plain crossing = no connection · ○ = negated output', 1244, 80, FS.caption, { fill: C.muted, anchor: 'end' });
for (const [s, y] of [['A1', 122.5], ['B1', 146.5], ['A0', 474.5], ['B0', 498.5]]) T(s, 54, y, FS.port, { anchor: 'end' });
for (const [s, y, m] of [['GT', 310.5, 'A > B'], ['EQ', 398.5, 'A = B'], ['LT', 486.5, 'A < B']]) {
  T(s, 1160, y, FS.port, { weight: 600 });
  T(m, 1200, y, FS.net, { fill: C.muted });
}
T('MSB', 54, 168, FS.net, { fill: C.muted, anchor: 'end' });
T('LSB', 54, 520, FS.net, { fill: C.muted, anchor: 'end' });
for (const [s, x, y] of [['d1', 300, 123], ['nB1', 262, 299], ['e1', 449, 123], ['g1', 560, 211], ['d0', 287, 475], ['nB0', 380, 563], ['g0', 653, 475]])
  T(s, x, y, FS.net, { fill: C.muted, anchor: 'middle', ls: 0.4 });
T('GT = A1·B1′ + (A1 XNOR B1)·A0·B0′', 46, 664, FS.caption, { fill: C.muted });
T('EQ = (A1 XNOR B1)·(A0 XNOR B0)', 340, 664, FS.caption, { fill: C.muted });
T('LT = (GT + EQ)′', 620, 664, FS.caption, { fill: C.muted });
// Qualifying symbol: centred horizontally in the upper part of the rectangle (IEC 60617-12 §4).
for (const g of gates) T(g.q, g.x + GATE.w / 2, g.box.y0 + 19, FS.qualifier, { anchor: 'middle', weight: 600, owner: g.id });

// ---------- measurement and checks ----------
const cache = new Map();
function box(t) {
  const k = JSON.stringify([t.s, t.fs, t.weight, t.anchor, t.ls]);
  if (!cache.has(k)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="200"><text x="1000" y="100" font-family="${FONT}" font-size="${t.fs}" font-weight="${t.weight}" text-anchor="${t.anchor}" letter-spacing="${t.ls}">${esc(t.s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b) throw Error(`measure ${t.s}`);
    cache.set(k, { x0: b.x - 1000, y0: b.y - 100, x1: b.x + b.width - 1000, y1: b.y + b.height - 100 });
  }
  const m = cache.get(k);
  return { x0: t.x + m.x0 - 2, y0: t.y + m.y0 - 2, x1: t.x + m.x1 + 2, y1: t.y + m.y1 + 2 };
}
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const grow = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
const segBox = (a, b) => ({ x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) });
const errors = [];
const segs = [];
for (const [ps, from, to] of wires) for (let i = 1; i < ps.length; i++) {
  if (ps[i][0] !== ps[i - 1][0] && ps[i][1] !== ps[i - 1][1]) errors.push(`diagonal wire ${ps}`);
  segs.push({ a: ps[i - 1], b: ps[i], from, to });
}
const bodyOf = g => ({ x0: g.box.x0, y0: g.box.y0, x1: g.out, y1: g.box.y1 });
const laid = texts.map(t => ({ ...t, r: box(t) }));
for (let i = 0; i < laid.length; i++) {
  const t = laid[i];
  if (t.r.x0 < 8 || t.r.y0 < 8 || t.r.x1 > W - 8 || t.r.y1 > H - 8) errors.push(`canvas: ${t.s}`);
  for (let j = i + 1; j < laid.length; j++) if (hit(t.r, laid[j].r)) errors.push(`text/text ${t.s} / ${laid[j].s}`);
  for (const g of gates) {
    if (t.owner === g.id) { if (!(t.r.x0 >= g.box.x0 + 2 && t.r.x1 <= g.box.x1 - 2 && t.r.y0 >= g.box.y0 + 1 && t.r.y1 <= g.box.y1 - 2)) errors.push(`qualifier escapes ${g.id}`); }
    else if (hit(t.r, grow(bodyOf(g), 1))) errors.push(`text/gate ${t.s} / ${g.id}`);
  }
  for (const s of segs) if (hit(t.r, grow(segBox(s.a, s.b), SW.wire / 2))) errors.push(`text/wire ${t.s}`);
}
for (const s of segs) for (const g of gates) {
  const b = bodyOf(g), sb = segBox(s.a, s.b);
  if (s.to === g.id || s.from === g.id) {
    // Attached: may touch the rectangle edge (or bubble tip) only.
    if (hit(sb, grow(b, -0.01)) && !(sb.y0 === sb.y1 && (sb.x1 === g.box.x0 || sb.x0 === g.out))) errors.push(`wire enters own gate ${g.id}`);
    continue;
  }
  if (hit(grow(sb, SW.wire / 2), grow(b, SW.gate / 2))) errors.push(`wire through gate ${g.id}`);
}
for (const g of gates) {
  const ins = segs.filter(s => s.to === g.id && s.b[0] === g.box.x0);
  if (ins.length !== g.n) errors.push(`input count ${g.id}: ${ins.length}`);
  for (const s of ins) if (s.b[1] <= g.box.y0 + 6 || s.b[1] >= g.box.y1 - 6) errors.push(`input too near corner ${g.id}`);
  for (const h of gates) if (g !== h && hit(grow(bodyOf(g), 12), bodyOf(h))) errors.push(`gate/gate ${g.id} ${h.id}`);
}
if (errors.length) throw Error(`Refusing to write (${errors.length}):\n${[...new Set(errors)].join('\n')}`);

const body = [];
body.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${C.paper}"/>`);
body.push(`<line x1="46" y1="96" x2="1244" y2="96" stroke="${C.rule}" stroke-width="${SW.rule}"/>`);
body.push(`<line x1="46" y1="636" x2="1244" y2="636" stroke="${C.rule}" stroke-width="${SW.rule}"/>`);
body.push(`<g fill="none" stroke="${C.ink}" stroke-width="${SW.wire}" stroke-linecap="square" stroke-linejoin="miter">`);
for (const [ps] of wires) body.push(`<polyline points="${ps.map(p => p.join(',')).join(' ')}"/>`);
body.push('</g>', `<g fill="${C.paper}" stroke="${C.ink}" stroke-width="${SW.gate}">`);
for (const g of gates) {
  body.push(`<rect x="${g.box.x0}" y="${g.box.y0}" width="${GATE.w}" height="${g.h}"/>`);
  if (g.neg) body.push(`<circle cx="${g.box.x1 + GATE.bubble}" cy="${g.y}" r="${GATE.bubble}"/>`);
}
body.push('</g>', `<g fill="${C.ink}">`, ...dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5"/>`), '</g>');
body.push(`<g font-family="${FONT}">`);
for (const t of texts) body.push(`<text x="${t.x}" y="${t.y}" font-size="${t.fs}" fill="${t.fill}" text-anchor="${t.anchor}"${t.weight !== 400 ? ` font-weight="${t.weight}"` : ''}${t.ls ? ` letter-spacing="${t.ls}"` : ''}>${esc(t.s)}</text>`);
body.push('</g>');
const desc = 'A gate-level logic diagram of a 2-bit magnitude comparator drawn with IEC 60617-12 rectangular binary-logic symbols. Every gate is a rectangle with its qualifying symbol inside: =1 for exclusive-OR, & for AND, ≥1 for OR and 1 for the buffer; a small negation circle at the output turns ≥1 into NOR and 1 into an inverter. The four inputs A1, B1, A0 and B0 enter on the left; two exclusive-OR elements detect a difference on each bit pair, a negated ≥1 element forms the equal output, inverters supply the complemented B bits and the bit-1 equality term, an AND pair and a three-input AND form the greater-than product terms, a ≥1 element sums them into GT, and a final negated ≥1 element derives LT from GT and EQ. All wires are orthogonal; filled dots mark fan-out junctions and plain crossings do not connect.';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">\n<title>2-bit Magnitude Comparator</title>\n<desc>${esc(desc)}</desc>\n${body.join('\n')}\n</svg>\n`;

const source = `# Gate-level 2-bit magnitude comparator (A1A0 vs B1B0), IEC 60617-12 symbols.
# Same circuit as the ANSI exemplar; only the symbol family changes.
logic "2-bit Magnitude Comparator" style: iec
input A1, A0, B1, B0
output GT, EQ, LT
nB1 = NOT(B1)
nB0 = NOT(B0)
d1 = XOR(A1, B1)
d0 = XOR(A0, B0)
EQ = NOR(d1, d0)
e1 = NOT(d1)
g1 = AND(A1, nB1)
g0 = AND(e1, A0, nB0)
GT = OR(g1, g0)
LT = NOR(GT, EQ)
`;

const notes = `# Logic gate exemplar (IEC) — 2-bit magnitude comparator

**Scenario.** The same circuit as the ANSI exemplar, so the two sheets can be laid side by side:
compare two 2-bit numbers A = A1A0 and B = B1B0 and produce A>B (GT), A=B (EQ) and A<B (LT).
Ten gates — two exclusive-ORs, three inverters, a 2-input AND, a 3-input AND, an OR and two NORs —
with the same fan-out (A1, B1, A0, B0, d1, GT and EQ each drive two loads). Every gate, wire,
junction, net name and caption sits at the same coordinate as on the ANSI sheet; only the gate
symbols differ.

**Palette.** Five colours, the same as the ANSI sheet. Ink \`#1E293B\` — gate outlines, qualifying
symbols, wires, title and port names. Muted \`#64748B\` — subtitle, net names, MSB/LSB and A>B
annotations, boolean captions. Paper \`#FFFFFF\` — gate and negation-circle interiors, so a wire
never shows through a symbol. Rule \`#E2E8F0\` — the header and caption hairlines. No accent hue.

**Type scale.** Title 20/600, port labels 13 (outputs 600), qualifying symbols 13/600, subtitle and
captions 11.5, net names 10 with 0.4 letter-spacing. One font stack (Inter with Helvetica Neue,
Helvetica and Arial fallbacks).

**Symbol geometry** follows IEC 60617-12. Every element is a 44 px wide rectangle: 48 px high for
two inputs, 60 px for the three-input AND, 44 px for the single-input inverter, so input pins keep
the ANSI sheet's 24 px pitch and never land on a corner. The qualifying symbol is centred in the
upper part of the rectangle: \`=1\` exclusive-OR, \`&\` AND, \`≥1\` OR, \`1\` buffer. Inversion is the
negation indicator — an r = 5 circle tangent to the output edge — not a separate symbol, so NOT is
\`1\` with a negated output and NOR is \`≥1\` with a negated output. No gate carries a type word
underneath: the qualifying symbol already names the function. Stroke weights match the ANSI
sheet: 1.5 for outlines and negation circles, 1.25 for wires, junction dots r = 3.5.

**Layout and collisions.** Five columns by logic depth (input edges at 190 / 380 / 570 / 760 /
950), 44 px row grid, long runs in the odd rows between gate bodies, vertical jogs in allocated
gutter channels — identical to the ANSI sheet. Because the rectangles are narrower than the
distinctive shapes, each output wire simply starts a little further left. The generator measures
every string with resvg and refuses to write unless every text box clears every other text box,
every wire and every gate body; every qualifying symbol stays inside its own rectangle; no wire
crosses a gate it is not attached to; each gate has exactly its declared number of inputs, none
at a corner; and all wires are orthogonal. Result: **0 collisions**.

**Standard and departures.** IEC 60617-12:1997 *Graphical symbols for diagrams — Part 12: Binary
logic elements* (the same rectangular-shape form appears in IEEE Std 91-1984): AND, OR,
exclusive-OR and buffer elements identified by their qualifying symbols, with the negation
indicator on the output.
The polarity-indicator (triangle) convention is not used: this sheet is drawn in single-logic
convention, where the negation circle is the correct mark. The doc's suggestion to print gate
names under each symbol is not followed, for the same reason as on the ANSI sheet.

## References

- IEC 60617-12:1997, Graphical symbols for diagrams — Part 12: Binary logic elements — https://standards.globalspec.com/std/896209/iec-60617-12
- EN 60617-12:1998 catalogue entry (scope: symbols for logic functions and devices) — https://standards.iteh.ai/catalog/standards/clc/2284f1bd-677f-4d36-8c73-e21d3eba4254/en-60617-12-1998
- "ANSI vs IEC Logic Symbols: A Schematic Reading Guide", DigiSim.io (rectangles with & and ≥1; negation circle vs polarity wedge) — https://digisim.io/blog/decoding-digital-logic-mastering-ansi-vs-iec-symbols-on
- "Logic Gate Symbols: The Complete Chart", JLCPCB (IEC =1 exclusive-OR, 1 buffer with negated output for NOT) — https://jlcpcb.com/blog/logic-gate-symbols-guide

Palette: ink #1E293B · muted #64748B · paper #FFFFFF · rule #E2E8F0
`;

const dir = new URL('../../visual-eval/exemplars/logic/iec/', import.meta.url);
const png = new Resvg(svg, { font, fitTo: { mode: 'width', value: W * 2 } }).render().asPng();
await mkdir(dir, { recursive: true });
await writeFile(new URL('ideal.svg', dir), svg);
await writeFile(new URL('source.sx', dir), source);
await writeFile(new URL('notes.md', dir), notes);
if (process.argv[2]) await writeFile(process.argv[2], png);
console.log(JSON.stringify({ canvas: [W, H], texts: texts.length, gates: gates.length, wireSegments: segs.length, collisions: 0 }));
