/**
 * Hand-authored IEC 60617 single-line exemplar: the same distribution centre as
 * visual-eval/exemplars/sld/ansi/ (utility metering, MV breaker with overcurrent relays, service
 * transformer, main switchboard with four feeders, standby generator through an ATS), redrawn
 * with IEC symbols and IEC ratings (11 kV / 400/230 V, 50 Hz).
 *   node scripts/visual-eval/draw-sld-iec-exemplar.mjs [preview.png]
 * Text bounds come from resvg shaping. Nothing is written unless every geometry check passes.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const C = { name: '#0f172a', ink: '#1e293b', rating: '#475569', note: '#64748b', rule: '#dbe2ea', paper: '#ffffff' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const SW = { conductor: 1.5, bus: 3, symbol: 1.5, thin: 1.2, rule: 1 };
const W = 1580, H = 1372;
const font = { loadSystemFonts: false, fontFiles: ['/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc', '/System/Library/Fonts/Supplemental/Arial.ttf'], defaultFontFamily: 'Helvetica Neue' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const g = [], texts = [], bodies = [], segs = [];
const f = n => +n.toFixed(2);

function body(id, x0, y0, x1, y1) { bodies.push({ id, x0, y0, x1, y1 }); }
function seg(a, b, { role = 'conductor', attach = [], dash = false, color = C.ink, owner = null } = {}) {
  segs.push({ a, b, role, attach, owner });
  g.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${color}" stroke-width="${SW[role] ?? SW.symbol}"${dash ? ' stroke-dasharray="5 4"' : ''}/>`);
}
function wire(ps, attach, opts = {}) {
  for (let i = 1; i < ps.length; i++) {
    if (ps[i][0] !== ps[i - 1][0] && ps[i][1] !== ps[i - 1][1]) throw Error(`diagonal run ${ps}`);
    seg(ps[i - 1], ps[i], { attach, ...opts });
  }
}
function T(s, x, y, { fs = 11, weight = 400, fill = C.rating, anchor = 'start', ls = 0, owner = null } = {}) {
  texts.push({ s, x, y, fs, weight, fill, anchor, ls, owner });
}
function label(x, y, name, lines = [], anchor = 'start') {
  T(name, x, y, { fs: 12, weight: 600, fill: C.name, anchor });
  lines.forEach((s, i) => T(s, x, y + 15 * (i + 1), { anchor }));
}
const dot = (x, y, r = 3) => g.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${C.ink}"/>`);
const circle = (x, y, r, fill = C.paper) => g.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${C.ink}" stroke-width="${SW.symbol}"/>`);

// ---------- IEC 60617 symbols. Each returns its conductor terminals. ----------
// Switching device, vertical, open: moving contact hinged on the lower terminal.
// Breaker = cross at the fixed contact; disconnector = bar across the fixed contact.
function switching(id, x, cy, kind) {
  const top = cy - 18, bot = cy + 18, tip = [x - 13, cy - 15];
  body(id, x - 17, cy - 23, x + 8, bot);
  seg([x, bot], tip, { role: 'symbol', owner: id });
  if (kind === 'breaker') { seg([x - 4.5, top - 4.5], [x + 4.5, top + 4.5], { role: 'symbol', owner: id }); seg([x - 4.5, top + 4.5], [x + 4.5, top - 4.5], { role: 'symbol', owner: id }); }
  else seg([x - 6, top], [x + 6, top], { role: 'symbol', owner: id });
  return { id, top: [x, top], bot: [x, bot], blade: y => [x - 13 * (bot - y) / (bot - tip[1]), y] };
}
function fuse(id, x, cy) {
  body(id, x - 6, cy - 16, x + 6, cy + 16);
  g.push(`<rect x="${x - 6}" y="${cy - 16}" width="12" height="32" fill="${C.paper}" stroke="${C.ink}" stroke-width="${SW.symbol}"/>`);
  seg([x, cy - 16], [x, cy + 16], { role: 'symbol', owner: id });
  return { id, top: [x, cy - 16], bot: [x, cy + 16] };
}
function transformer(id, x, cy, earthSide = -1) {
  body(id, x - 16, cy - 28, x + 16, cy + 28);
  g.push(`<circle cx="${x}" cy="${cy - 12}" r="16" fill="none" stroke="${C.ink}" stroke-width="${SW.symbol}"/>`);
  g.push(`<circle cx="${x}" cy="${cy + 12}" r="16" fill="none" stroke="${C.ink}" stroke-width="${SW.symbol}"/>`);
  return { id, top: [x, cy - 28], bot: [x, cy + 28], neutral: [x + earthSide * 16, cy + 12] };
}
function earth(id, x, y) {
  body(id, x - 10, y + 10, x + 10, y + 18);
  seg([x, y], [x, y + 10], { role: 'symbol', owner: id });
  for (const [dy, hw] of [[10, 10], [14, 6.5], [18, 3]]) seg([x - hw, y + dy], [x + hw, y + dy], { role: 'symbol', owner: id });
}
function earthedNeutral(tid, t, x, y, caption) {
  wire([t.neutral, [x, t.neutral[1]], [x, y]], [tid, `${tid}-E`], { role: 'thin' });
  earth(`${tid}-E`, x, y);
  caption.forEach((s, i) => T(s, x - 16, y + 4 + 15 * i, { fs: 10, fill: C.note, anchor: 'end' }));
}
function machine(id, x, cy, r, letter) {
  body(id, x - r, cy - r, x + r, cy + r);
  circle(x, cy, r);
  T(letter, x, cy - 1, { fs: 13, weight: 700, fill: C.ink, anchor: 'middle', owner: id });
  T('3~', x, cy + 11, { fs: 8.5, weight: 600, fill: C.ink, anchor: 'middle', owner: id });
  return { id, top: [x, cy - r], bot: [x, cy + r] };
}
function panel(id, x, top) {
  body(id, x - 40, top, x + 40, top + 32);
  g.push(`<rect x="${x - 40}" y="${top}" width="80" height="32" fill="${C.paper}" stroke="${C.ink}" stroke-width="${SW.symbol}"/>`);
  seg([x - 40, top + 9], [x + 40, top + 9], { role: 'thin', owner: id });
  return { id, top: [x, top] };
}

// ---------- header ----------
T('Distribution Centre · 11 kV Primary Service', 46, 50, { fs: 18, weight: 700, fill: C.name });
T('IEC · SINGLE-LINE DIAGRAM · 11 KV / 400/230 V · 50 HZ', 46, 72, { fs: 9.5, weight: 600, fill: C.note, ls: 1.3 });
g.push(`<line x1="46" y1="88" x2="${W - 46}" y2="88" stroke="${C.rule}" stroke-width="1"/>`);

// ---------- medium-voltage trunk ----------
const X = 420;
body('UTIL', X - 17, 133, X + 17, 167);
circle(X, 150, 17);
g.push(`<path d="M ${X - 10} 150 C ${X - 6} 141, ${X - 2} 141, ${X} 150 S ${X + 6} 159, ${X + 10} 150" fill="none" stroke="${C.ink}" stroke-width="${SW.thin}"/>`);
label(450, 146, 'Network infeed', ['11 kV · 3~ 50 Hz', 'Sk″ 250 MVA · Ik″ 13.1 kA']);

body('MTR', X - 17, 232, X + 17, 258);
g.push(`<rect x="${X - 17}" y="232" width="34" height="26" fill="${C.paper}" stroke="${C.ink}" stroke-width="${SW.symbol}"/>`);
seg([X - 17, 238], [X + 17, 238], { role: 'thin', owner: 'MTR' });
T('Wh', X, 253, { fs: 10, weight: 600, fill: C.ink, anchor: 'middle', owner: 'MTR' });
label(450, 241, 'Revenue meter -P1', ['CT 100/1 A · VT 11/0.11 kV']);
wire([[X, 167], [X, 232]], ['UTIL', 'MTR']);

const Q0 = switching('Q0', X, 340, 'disconnector');
label(450, 336, 'Incoming disconnector -Q0', ['12 kV · 630 A']);
wire([[X, 258], Q0.top], ['MTR', 'Q0']);
T('3 × 1C 95 mm² XLPE 12 kV', 405, 296, { fs: 10, fill: C.note, anchor: 'end' });

const Q1 = switching('Q1', X, 425, 'breaker');
label(450, 421, 'Main circuit-breaker -Q1', ['Vacuum · 12 kV · 630 A · 25 kA']);
wire([Q0.bot, Q1.top], ['Q0', 'Q1']);

// Current transformer: ring threaded by the conductor.
body('T11', X - 9, 501, X + 9, 519);
circle(X, 510, 9, 'none');
label(450, 506, 'Current transformer -T11', ['200/1 A · 5P20']);
wire([Q1.bot, [X, 519]], ['Q1', 'T11']);
seg([X, 501], [X, 519], { role: 'conductor', owner: 'T11' });

// Protection relays on the CT secondary, trip linkage dashed to the breaker.
for (const [id, cx, sym, name, fn] of [['F11', 300, 'I>  I>>', '-F11', 'Phase overcurrent'], ['F12', 160, 'I₀>', '-F12', 'Earth fault']]) {
  body(id, cx - 32, 495, cx + 32, 525);
  g.push(`<rect x="${cx - 32}" y="495" width="64" height="30" fill="${C.paper}" stroke="${C.ink}" stroke-width="${SW.symbol}"/>`);
  T(sym, cx, 515, { fs: 11, weight: 700, fill: C.ink, anchor: 'middle', owner: id });
  label(cx, 548, name, [fn], 'middle');
}
wire([[X - 9, 510], [332, 510]], ['T11', 'F11'], { role: 'thin' });
wire([[268, 510], [192, 510]], ['F11', 'F12'], { role: 'thin' });
const tripY = 427, tripEnd = Q1.blade(tripY);
wire([[160, 495], [160, tripY], tripEnd], ['F12', 'Q1'], { role: 'thin', dash: true });
wire([[300, 495], [300, tripY]], ['F11'], { role: 'thin', dash: true });
dot(300, tripY, 2.4);
T('TRIP', 230, 418, { fs: 9, fill: C.note, anchor: 'middle', ls: 1 });

const T1 = transformer('T1', X, 615);
label(450, 606, 'Service transformer -T1', ['1600 kVA · 11/0.42 kV', 'Dyn11 · uk 6 %']);
wire([[X, 519], T1.top], ['T11', 'T1']);
earthedNeutral('T1', T1, 376, 650, ['Star point earthed', '185 mm² Cu']);

g.push(`<line x1="46" y1="706" x2="${W - 46}" y2="706" stroke="${C.rule}" stroke-width="1" stroke-dasharray="6 5"/>`);
segs.push({ a: [46, 706], b: [W - 46, 706], role: 'rule', attach: ['*'] });
T('MEDIUM VOLTAGE · 11 KV', 46, 696, { fs: 10, fill: C.note, ls: 1.2 });
T('LOW VOLTAGE · 400/230 V', 46, 727, { fs: 10, fill: C.note, ls: 1.2 });

// ---------- low-voltage main ----------
const Q2 = switching('Q2', X, 790, 'breaker');
label(450, 786, 'Main circuit-breaker -Q2', ['ACB 2500 A · LSIG · 50 kA']);
wire([T1.bot, Q2.top], ['T1', 'Q2']);
T('6 × 1C 630 mm² Cu per phase', 405, 750, { fs: 10, fill: C.note, anchor: 'end' });
const BUS = 870;
g.push(`<line x1="220" y1="${BUS}" x2="1150" y2="${BUS}" stroke="${C.ink}" stroke-width="${SW.bus}"/>`);
segs.push({ a: [220, BUS], b: [1150, BUS], role: 'bus', attach: [] });
wire([Q2.bot, [X, BUS]], ['Q2']);
dot(X, BUS);
T('Main switchboard -MSB', 205, BUS + 4, { fs: 12, weight: 600, fill: C.name, anchor: 'end' });
T('400/230 V · 2500 A · 50 kA', 1165, BUS + 4);

// Feeders.
function feederBreaker(id, x, name, rating) {
  const q = switching(id, x, 950, 'breaker');
  wire([[x, BUS], q.top], [id]); dot(x, BUS);
  label(x + 30, 946, name, [rating]);
  return q;
}
const cable = (s, x, y) => T(s, x + 12, y, { fs: 10, fill: C.note });

const Q3 = feederBreaker('Q3', 300, 'Panel HA feeder -Q3', 'MCCB 400 A · 50 kA');
const HA = panel('HA', 300, 1090);
wire([Q3.bot, HA.top], ['Q3', 'HA']);
cable('4×1C 240 mm² + PE 120', 300, 1030);
label(300, 1145, 'Panel HA', ['400 A · 400/230 V'], 'middle');

const Q4 = feederBreaker('Q4', 560, 'Chiller feeder -Q4', 'MCCB 630 A · 50 kA');
const M1 = machine('CH1', 560, 1105, 15, 'M');
wire([Q4.bot, M1.top], ['Q4', 'CH1']);
cable('3×1C 300 mm² + PE 150', 560, 1030);
label(560, 1145, 'Chiller CH-1', ['300 kW · 400 V'], 'middle');

const Q5 = switching('Q5', 820, 935, 'disconnector');
wire([[820, BUS], Q5.top], ['Q5']); dot(820, BUS);
label(850, 931, 'T-2 feeder -Q5', ['Disconnector 250 A']);
const F5 = fuse('F5', 820, 995);
wire([Q5.bot, F5.top], ['Q5', 'F5']);
label(850, 991, 'Fuse -F5', ['gG 160 A']);
const T2 = transformer('T2', 820, 1102);
wire([F5.bot, T2.top], ['F5', 'T2']);
cable('4×1C 95 mm² + PE 50', 820, 1048);
label(850, 1093, 'Isolation transformer -T2', ['100 kVA · 400/400 V', 'Dyn11 · uk 4 %']);
earthedNeutral('T2', T2, 776, 1138, ['Star point earthed', '50 mm² Cu']);
const LA = panel('LA', 820, 1200);
wire([T2.bot, LA.top], ['T2', 'LA']);
label(820, 1255, 'Panel LA', ['160 A · 400/230 V'], 'middle');

const Q6 = feederBreaker('Q6', 1080, 'ATS normal feeder -Q6', 'MCCB 1250 A · 50 kA');
cable('3 × 4×1C 240 mm²', 1080, 1030);

// Standby generator, earthed at its own star point.
const G1 = machine('G1', 1370, 760, 17, 'G');
label(1400, 756, 'Standby generator -G1', ['500 kW / 625 kVA · 0.8 PF', '400/230 V']);
wire([[1353, 760], [1330, 760], [1330, 775]], ['G1', 'G1-E'], { role: 'thin' });
earth('G1-E', 1330, 775);
T('Star point earthed', 1314, 783, { fs: 10, fill: C.note, anchor: 'end' });
T('95 mm² Cu', 1314, 798, { fs: 10, fill: C.note, anchor: 'end' });
const Q7 = switching('Q7', 1370, 900, 'breaker');
label(1400, 896, 'Generator breaker -Q7', ['ACB 1250 A · LSI · 50 kA']);
wire([G1.bot, Q7.top], ['G1', 'Q7']);
cable('3 × 4×1C 240 mm²', 1370, 1000);

// ATS as a two-way (changeover) switch shown in its normal position.
body('ATS', 1076, 1096, 1128, 1143);
const N = [1080, 1100], E = [1124, 1100], P = [1102, 1140];
wire([Q6.bot, N], ['Q6', 'ATS']);
wire([Q7.bot, [1370, 1060], [1124, 1060], E], ['Q7', 'ATS']);
seg(P, N, { role: 'symbol', owner: 'ATS' });
g.push(`<line x1="${P[0]}" y1="${P[1]}" x2="${E[0]}" y2="${E[1]}" stroke="${C.ink}" stroke-width="${SW.thin}" stroke-dasharray="3 3"/>`);
for (const p of [N, E, P]) dot(p[0], p[1], 2.5);
T('N', 1068, 1104, { fs: 9, fill: C.note, anchor: 'end' });
T('E', 1136, 1104, { fs: 9, fill: C.note });
label(1150, 1131, 'ATS-1', ['1250 A · 4-pole · open transition']);
const SDP = panel('SDP', 1102, 1200);
wire([P, SDP.top], ['ATS', 'SDP']);
label(1102, 1255, 'Standby panel SDP', ['1250 A · 400/230 V'], 'middle');

T('Dashed lines are relay trip linkages and the thin line from -T11 is the CT secondary; neither carries load current. ATS-1 is shown in its normal position.', 46, 1318, { fs: 10, fill: C.note });
T('Device designations follow IEC 81346 (-Q switching device, -F protection, -T transformer, -P meter). Earth-fault protection on -Q2 is the G element of its LSIG trip unit.', 46, 1336, { fs: 10, fill: C.note });

// ---------- checks ----------
const cache = new Map();
function tbox(t) {
  const k = JSON.stringify([t.s, t.fs, t.weight, t.anchor, t.ls]);
  if (!cache.has(k)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="200"><text x="1500" y="100" font-family="${FONT}" font-size="${t.fs}" font-weight="${t.weight}" text-anchor="${t.anchor}" letter-spacing="${t.ls}">${esc(t.s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b) throw Error(`measure ${t.s}`);
    cache.set(k, { x0: b.x - 1500, y0: b.y - 100, x1: b.x + b.width - 1500, y1: b.y + b.height - 100 });
  }
  const m = cache.get(k);
  return { x0: t.x + m.x0, y0: t.y + m.y0, x1: t.x + m.x1, y1: t.y + m.y1 };
}
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const grow = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
const sbox = s => ({ x0: Math.min(s.a[0], s.b[0]), y0: Math.min(s.a[1], s.b[1]), x1: Math.max(s.a[0], s.b[0]), y1: Math.max(s.a[1], s.b[1]) });
function segHits(s, r) { // Liang-Barsky, handles diagonal blades
  const [ax, ay] = s.a, dx = s.b[0] - ax, dy = s.b[1] - ay; let lo = 0, hi = 1;
  for (const [p, q] of [[-dx, ax - r.x0], [dx, r.x1 - ax], [-dy, ay - r.y0], [dy, r.y1 - ay]]) {
    if (p === 0) { if (q < 0) return false; } else if (p < 0) lo = Math.max(lo, q / p); else hi = Math.min(hi, q / p);
    if (lo > hi) return false;
  }
  return true;
}
const errors = [];
const laid = texts.map(t => ({ ...t, r: tbox(t) }));
const CLEAR = 4;
for (let i = 0; i < laid.length; i++) {
  const t = laid[i], r = grow(t.r, CLEAR);
  if (t.r.x0 < 12 || t.r.y0 < 12 || t.r.x1 > W - 12 || t.r.y1 > H - 12) errors.push(`canvas: ${t.s}`);
  for (let j = i + 1; j < laid.length; j++) if (hit(grow(t.r, 1.5), laid[j].r)) errors.push(`text/text: ${t.s} / ${laid[j].s}`);
  for (const b of bodies) {
    if (t.owner === b.id) { if (!hit(t.r, b) || t.r.x0 < b.x0 || t.r.x1 > b.x1 || t.r.y0 < b.y0 || t.r.y1 > b.y1) errors.push(`text escapes its symbol: ${t.s}`); }
    else if (hit(r, b)) errors.push(`text/symbol: ${t.s} / ${b.id}`);
  }
  for (const s of segs) {
    if (t.owner && s.owner === t.owner && s.role === 'thin') { if (segHits(s, grow(t.r, 1))) errors.push(`text/own line: ${t.s}`); continue; }
    if (t.owner && s.owner === t.owner) continue;
    if (t.owner === 'T11') continue;
    if (segHits(s, grow(t.r, t.owner ? 1.5 : CLEAR))) errors.push(`text/line: ${t.s} / ${s.role} ${s.a}-${s.b}`);
  }
}
for (const s of segs) {
  if (s.owner || s.role === 'rule' || s.role === 'bus') continue;
  for (const b of bodies) {
    if (s.attach.includes(b.id)) continue;
    if (segHits(s, grow(b, 1))) errors.push(`line through unrelated symbol: ${s.a}-${s.b} / ${b.id}`);
  }
}
for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
  const a = bodies[i], b = bodies[j];
  if (a.id + '-E' === b.id || b.id + '-E' === a.id) continue;
  if (hit(grow(a, 4), b)) errors.push(`symbol/symbol: ${a.id} / ${b.id}`);
}
if (errors.length) throw Error(`Refusing to write (${errors.length}):\n${[...new Set(errors)].join('\n')}`);

const desc = 'An 11 kV network infeed passes through revenue meter -P1, incoming disconnector -Q0, vacuum circuit-breaker -Q1 and current transformer -T11 into the 1600 kVA Dyn11 service transformer -T1, whose star point is earthed. Overcurrent relay -F11 (I>, I>>) and earth-fault relay -F12 (I0>) take current from -T11 and trip -Q1 over dashed linkages. On the 400/230 V side the 2500 A main circuit-breaker -Q2 feeds main switchboard -MSB, which serves Panel HA, chiller motor CH-1, isolation transformer -T2 through disconnector -Q5 and fuse -F5 to Panel LA, and the normal side of ATS-1. Standby generator -G1 reaches the emergency side of ATS-1 through breaker -Q7; ATS-1 supplies the standby panel. All symbols follow IEC 60617: breakers as switches with a cross, disconnectors with a bar, the fuse as a rectangle, transformers as two overlapping circles.';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">\n<title>Distribution Centre · 11 kV Primary Service</title>\n<desc>${esc(desc)}</desc>\n<rect width="${W}" height="${H}" fill="${C.paper}"/>\n<g stroke-linecap="round">\n${g.join('\n')}\n</g>\n<g font-family="${FONT}">\n${texts.map(t => `<text x="${t.x}" y="${t.y}" font-size="${t.fs}" font-weight="${t.weight}" fill="${t.fill}" text-anchor="${t.anchor}"${t.ls ? ` letter-spacing="${t.ls}"` : ''}>${esc(t.s)}</text>`).join('\n')}\n</g>\n</svg>\n`;

const source = `# Commercial building on an 11 kV primary service, IEC symbols: revenue metering, an
# incoming disconnector and vacuum breaker with overcurrent relays, a 1600 kVA Dyn11
# service transformer, a 2500 A main switchboard with four feeders, and a standby
# generator through an ATS. Same topology as the ANSI exemplar.
sld "Distribution Centre · 11 kV Primary Service" [standard: iec]

UTIL = utility [label: "Network infeed", voltage: "11 kV, 3~ 50 Hz", rating: "Sk″ 250 MVA, Ik″ 13.1 kA"]
MTR = watthour_meter [label: "Revenue meter -P1", rating: "CT 100/1 A, VT 11/0.11 kV"]
Q0 = switch [label: "Incoming disconnector -Q0", rating: "12 kV, 630 A"]
Q1 = breaker_vacuum [label: "Main circuit-breaker -Q1", rating: "Vacuum, 12 kV, 630 A, 25 kA"]
T11 = ct [label: "Current transformer -T11", rating: "200/1 A, 5P20"]
F11 = relay [device: "I> I>>", label: "Phase overcurrent -F11", ct: "T11"]
F12 = relay [device: "I0>", label: "Earth fault -F12", ct: "T11"]
T1 = transformer_dy [label: "Service transformer -T1", rating: "1600 kVA, 11/0.42 kV, Dyn11", impedance: "uk 6 %", grounding: "Star point earthed, 185 mm² Cu"]
Q2 = breaker [label: "Main circuit-breaker -Q2", rating: "ACB 2500 A, LSIG, 50 kA"]
MSB = bus [label: "Main switchboard -MSB", voltage: "400/230 V", rating: "2500 A, 50 kA"]

Q3 = breaker [label: "Panel HA feeder -Q3", rating: "MCCB 400 A, 50 kA"]
HA = panel [label: "Panel HA", rating: "400 A, 400/230 V"]
Q4 = breaker [label: "Chiller feeder -Q4", rating: "MCCB 630 A, 50 kA"]
CH1 = motor [label: "Chiller CH-1", rating: "300 kW, 400 V, 3~"]
Q5 = switch [label: "T-2 feeder -Q5", rating: "Disconnector 250 A"]
F5 = fuse [label: "Fuse -F5", rating: "gG 160 A"]
T2 = transformer_dy [label: "Isolation transformer -T2", rating: "100 kVA, 400/400 V, Dyn11", impedance: "uk 4 %", grounding: "Star point earthed, 50 mm² Cu"]
LA = panel [label: "Panel LA", rating: "160 A, 400/230 V"]
Q6 = breaker [label: "ATS normal feeder -Q6", rating: "MCCB 1250 A, 50 kA"]

GEN = generator [label: "Standby generator -G1", voltage: "400/230 V", rating: "500 kW / 625 kVA, 0.8 PF", grounding: "Star point earthed, 95 mm² Cu"]
Q7 = breaker [label: "Generator breaker -Q7", rating: "ACB 1250 A, LSI, 50 kA"]
ATS = ats [label: "ATS-1", rating: "1250 A, 4-pole, open transition"]
SDP = panel [label: "Standby panel SDP", rating: "1250 A, 400/230 V"]

UTIL -> MTR
MTR -> Q0 [cable: "3 × 1C 95 mm² XLPE 12 kV"]
Q0 -> Q1
Q1 -> T11
T11 -> T1
F11 -> Q1
F12 -> Q1
T1 -> Q2 [cable: "6 × 1C 630 mm² Cu per phase"]
Q2 -> MSB
MSB -> Q3
Q3 -> HA [cable: "4×1C 240 mm² + PE 120"]
MSB -> Q4
Q4 -> CH1 [cable: "3×1C 300 mm² + PE 150"]
MSB -> Q5
Q5 -> F5
F5 -> T2 [cable: "4×1C 95 mm² + PE 50"]
T2 -> LA
MSB -> Q6
Q6 -> ATS [cable: "3 × 4×1C 240 mm²"]
GEN -> Q7
Q7 -> ATS [cable: "3 × 4×1C 240 mm²"]
ATS -> SDP
`;

const notes = `# Single-line diagram exemplar (IEC) — 11 kV primary service with standby generator

**Scenario.** The IEC counterpart of the ANSI exemplar: the same commercial distribution centre
and the same topology, drawn the way a European, Middle-Eastern or Asian consultant would issue
it. An 11 kV network infeed with revenue metering, an incoming disconnector and a vacuum
circuit-breaker tripped by overcurrent and earth-fault relays, a 1600 kVA Dyn11 service
transformer, a 2500 A main switchboard with four feeders, and a 500 kW standby generator reaching
the standby panel through an automatic transfer switch (ATS). Ratings are restated in IEC terms
— 11 kV / 400/230 V at 50 Hz, cable sizes in mm², IEC 81346 device designations (-Q, -F, -T, -P)
— and kept mutually consistent: -T1 delivers about 2200 A at 420 V, which the 2500 A main
breaker carries, and its 6 % impedance limits the secondary fault to about 37 kA, inside the
50 kA ratings. Two things differ from the ANSI sheet on purpose: the T-2 feeder is a
disconnector and fuse instead of a breaker, so the sheet shows both IEC switching symbols and the
fuse; and there is an incoming disconnector ahead of -Q1, as IEC switchgear normally draws.

**Layout.** Identical to the ANSI sheet: one vertical trunk from the infeed at the top to the
switchboard bus; relays to the left of the trunk on the CT secondary with dashed trip linkages up
to -Q1; a dashed rule between medium and low voltage below -T1 that only the trunk crosses; four
feeders dropping from the bus on 260 px centres; the generator right of the bus end, its
conductor running down and left into the ATS emergency contact without crossing anything. Names
and ratings sit to the right of each device; terminal loads carry theirs centred underneath.

**Palette.** The same five colours as the ANSI sheet, no accent hue: names \`#0f172a\`; conductors,
bus and symbol outlines \`#1e293b\`; rating lines \`#475569\`; cable annotation, earthing captions,
section captions and notes \`#64748b\`; title and section rules \`#dbe2ea\`. Symbol interiors are
paper white \`#ffffff\`.

**Type scale.** Inter, Helvetica Neue, Helvetica, Arial. Title 18/700; deck line 9.5/600 upper
case, letter-spacing 1.3. Device names 12/600, rating lines 11/400 on a 15 px pitch. Cable
annotation, earthing captions, section captions and notes 10/400. Lettering inside symbols:
\`G\`/\`M\` 13/700 with \`3~\` 8.5/600, relay functions 11/700, \`Wh\` 10/600.

**Symbols (IEC 60617).** Stroke weights: conductor 1.5, bus 3, symbol outline 1.5, CT secondary,
earthing leads and trip linkages 1.2, trip linkages dashed 5/4.
- *Circuit-breaker:* a make contact whose moving blade is hinged on the lower terminal, with a
  small cross (×) on the fixed contact.
- *Disconnector:* the same blade with a short bar across the fixed contact.
- *Fuse:* a 12 × 32 rectangle with the conductor running through it.
- *Two-winding transformer:* two overlapping r = 16 circles; the vector group Dyn11 and the
  impedance uk are written in the rating lines. The star point leaves the secondary circle and
  runs to an earth symbol with the earthing-conductor size beside it.
- *Current transformer:* an r = 9 ring threaded by the conductor, its secondary taken off sideways.
- *Protection relays:* rectangles lettered with their measured quantity and function — \`I>  I>>\`
  for definite-time and instantaneous overcurrent, \`I₀>\` for earth fault — instead of IEEE
  device numbers.
- *Earth:* a lead ending in three bars of decreasing length.
- *Generator and motor:* circles lettered \`G\` or \`M\` over \`3~\`.
- *Integrating meter:* a rectangle with a bar across its top, lettered \`Wh\`.
- *ATS:* a two-way (changeover) contact — solid blade to the normal contact N, dashed blade to the
  emergency contact E — drawn in its normal position.
- *Distribution board:* an 80 × 32 rectangle with a hairline near the top.

**Collisions.** The generator measures every string with resvg and refuses to write unless every
label keeps 4 px clear of every other label, every symbol, every conductor, CT secondary, earthing
lead, trip linkage, bus and section rule and the canvas edge; symbol lettering stays inside its
own symbol; no run passes through a symbol it does not connect to; and all runs are orthogonal
except the switch blades. **0 collisions.**

**Departures.**
1. The network infeed is a circle with a sine wave, as on the ANSI sheet. IEC 60617 has no
   dedicated "utility" symbol; the infeed's voltage and short-circuit power carry the information.
2. The 1500 kVA / 12.47 kV / 480Y/277 V ratings of the ANSI sheet become 1600 kVA / 11 kV /
   400/230 V, the nearest standard IEC values, and every downstream rating is rescaled to match.
3. The ATS is drawn as a changeover contact; IEC 60617 has no single ATS symbol.
4. As on the ANSI sheet there is no legend or title block; those belong to the drawing border.

**Source.** \`source.sx\` selects IEC symbols with \`[standard: iec]\` in the header. Relay function
text goes in \`device:\`; the relay-to-breaker connections are the trip linkages; every other
\`->\` is a power conductor with its size in \`cable:\`.

## References

- IEC 60617, *Graphical symbols for diagrams* (online database: circuit-breaker, disconnector, fuse, transformer, current transformer and earth symbols) — https://webstore.iec.ch/en/iec_catalog/product/preview/?id=L3B1Yi9wZGYvcHJldmlldy9pbmZvX2llYzYwNjE3e2VkMS4wfWIucGRm
- IEC 60076-1, *Power transformers — General* (vector group notation such as Dyn11; impedance voltage uk)
- IEC 81346-2, *Industrial systems — Structuring principles — Classification of objects and codes for classes* (-Q, -F, -T, -P letter codes)
- "IEC Symbols for Isolators, Disconnectors, Fuses, Contactors", Radica Software symbol library — https://symbols.radicasoftware.com/228/iec-isolators-disconnectors-fuses-contactors-overloads
- "Electrical Schematic Symbols Reference (IEEE C37.2 and IEC)", Industrial Monitor Direct — https://industrialmonitordirect.com/blogs/knowledgebase/electrical-schematic-symbols-complete-ansiieee-reference
- "How to Read a Single Line Diagram", Cable Hero (IEC-style one-lines, breaker and isolator symbols, transformer vector groups) — https://www.cablehero.com.au/how-to-read-a-single-line-diagram
- "Single-line diagram", Wikipedia — https://en.wikipedia.org/wiki/Single-line_diagram

Palette: names #0f172a · conductors #1e293b · ratings #475569 · notes #64748b · rules #dbe2ea · paper #ffffff
`;

const dir = new URL('../../visual-eval/exemplars/sld/iec/', import.meta.url);
const png = new Resvg(svg, { font, fitTo: { mode: 'width', value: W * 2 } }).render().asPng();
await mkdir(dir, { recursive: true });
await writeFile(new URL('ideal.svg', dir), svg);
await writeFile(new URL('source.sx', dir), source);
await writeFile(new URL('notes.md', dir), notes);
if (process.argv[2]) await writeFile(process.argv[2], png);
console.log(JSON.stringify({ canvas: [W, H], texts: texts.length, symbols: bodies.length, segments: segs.length, collisions: 0 }));
