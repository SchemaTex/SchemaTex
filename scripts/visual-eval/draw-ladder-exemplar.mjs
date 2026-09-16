/**
 * Hand-authored LD house-style exemplar. Run from any directory:
 *   node scripts/visual-eval/draw-ladder-exemplar.mjs
 * Only the three exemplar artifacts are written, plus a PNG preview when a path is given.
 * All geometry is checked before any write. Text bounds come from resvg's actual
 * font shaping, not a character-count estimate. No browser or generated assets.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

// Design decisions precede geometry. A monochrome, offline drawing: no state hue.
const C = { ink: '#20272B', muted: '#59636B', rule: '#CBD1D6', paper: '#FFFFFF' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 25, label: 14, subtitle: 13, secondary: 12 };
const SW = { rail: 3, symbol: 2, wire: 1.5, rule: 1 };
const G = { margin: 36, left: 80, right: 1240, output: 1136,
  bladeHalfGap: 7, contactHalfHeight: 14, coilHalfWidth: 22,
  coilArcRadius: 8, coilHalfHeight: 16, branchDrop: 66,
  bracketHalfWidth: 29, bracketHalfHeight: 14, blockWidth: 244,
  blockHeight: 116, blockX: 884, statusX: 1174, textClearance: 2.5 };
const W = 1320;
const TITLE = 'Drill station · spindle control & tool life';
const SUBTITLE = 'MainTask (10 ms)  /  DrillStation  /  SpindleAndToolLife';
const TARGET = new URL('../../visual-eval/exemplars/ladder/', import.meta.url);
// Optional: a path to also write a PNG preview for checking by eye.
const PNG = process.argv[2];

// On this workstation Helvetica Neue is the deliberately selected fallback.
// Use exactly the same font configuration for measurement and final raster.
const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const graphics = [], texts = [], bodies = [], segments = [], connectors = [], ports = [];
const measureCache = new Map();
let serial = 0;

function measure(s, fs, weight, anchor) {
  const key = JSON.stringify([s, fs, weight, anchor]);
  if (!measureCache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}" fill="${C.ink}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b || !b.width || !b.height) throw new Error(`Cannot measure text: ${s}`);
    measureCache.set(key, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 });
  }
  return measureCache.get(key);
}
function text(s, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start', owner } = {}) {
  const m = measure(s, fs, weight, anchor);
  const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1 };
  texts.push({ s, r, owner });
  graphics.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${esc(s)}</text>`);
}
function line(a, b, { role = 'wire', owner, attach = [], id = `line-${serial++}` } = {}) {
  const s = { a, b, role, owner, attach, id, width: SW[role] };
  segments.push(s);
  if (role === 'wire') {
    if (a[0] !== b[0] && a[1] !== b[1]) throw new Error(`Non-orthogonal connection ${id}`);
    if (a[0] === b[0] && a[1] === b[1]) throw new Error(`Zero-length connection ${id}`);
    connectors.push(s);
  }
  graphics.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${role === 'rule' ? C.rule : C.ink}" stroke-width="${SW[role]}"/>`);
}
function body(id, x0, y0, x1, y1, interior) {
  const b = { id, x0, y0, x1, y1, interior };
  bodies.push(b);
  return b;
}
function port(owner, p, name) {
  const v = { owner, p, name };
  ports.push(v);
  return v;
}
function join(a, b) {
  line(a.p, b.p, { attach: [a, b] });
}
const node = (x, y, name) => ({ p: [x, y], name });
const contact = (op, tag, x, name) => ({ op, tag, x, name });
const coil = (op, tag, name) => ({ op, tag, x: G.output, name });
const block = (op, tag, preset) => ({ op, tag, preset });
const branch = (x0, x1, paths) => ({ x0, x1, paths });

// One model generates both the SVG and the valid engine DSL. These are program
// tags; the I/O mapping and the drilling sequencer belong to adjacent routines.
const RUNGS = [
  { h: 112, comment: 'Acknowledge spindle fault only with the run command off and the drive healthy.', items: [
    contact('XIC', 'FaultResetPB', 210), contact('XIO', 'SpindleRun', 430), contact('XIO', 'DriveFault', 650), coil('OTU', 'SpindleFault')] },
  { h: 160, comment: 'Allow 3 s to prove spindle speed; also detect sustained loss of speed while running.', items: [
    contact('XIC', 'SpindleRun', 210), contact('XIO', 'AtSpeed', 430), block('TON', 'SpeedProof', 3000)] },
  { h: 154, comment: 'Latch a drive trip or speed timeout. Set follows reset, so an active fault wins.', items: [
    branch(140, 502, [[contact('XIC', 'DriveFault', 320)], [contact('XIC', 'SpeedProof.DN', 320)]]), coil('OTL', 'SpindleFault')] },
  { h: 164, comment: 'A fresh Start edge seals in the spindle; Stop or loss of any permissive drops the command.', items: [
    branch(136, 440, [[contact('XIC', 'StartPB', 218), contact('ONS', 'Start_OS', 364)], [contact('XIC', 'SpindleRun', 288)]]),
    contact('XIC', 'StopOK', 532), contact('XIC', 'SafetyOK', 674), contact('XIC', 'DriveReady', 816), contact('XIO', 'SpindleFault', 958), coil('OTE', 'SpindleRun')] },
  { h: 112, comment: 'Permit a new drilling cycle only at speed and below the tool-life limit.', items: [
    contact('XIC', 'SpindleRun', 210), contact('XIC', 'AtSpeed', 430), contact('XIO', 'SpindleFault', 650), contact('XIO', 'ToolLife.DN', 870), coil('OTE', 'FeedPermit')] },
  { h: 160, comment: 'Count each completed part once. CTU detects the rising edge; tool life is 500 parts.', items: [
    contact('XIC', 'CycleDone', 210, 'From drill sequencer'), block('CTU', 'ToolLife', 500)] },
  { h: 112, comment: 'After replacing the tool, reset its count only with the spindle stopped and the cycle idle.', items: [
    contact('XIC', 'ToolResetPB', 210), contact('XIO', 'SpindleRun', 430), contact('XIO', 'AtSpeed', 650), contact('XIO', 'CycleActive', 870), coil('RES', 'ToolLife')] },
  { h: 140, comment: 'Warn at 450 parts so the operator can prepare a tool; the cycle inhibit takes effect at 500.', items: [
    { op: 'GEQ', tag: 'ToolLife.ACC', threshold: 450 }, coil('OTE', 'ToolWarnLamp')] },
];
// Update the count/reset before publishing the next-cycle permissive.
RUNGS.splice(6, 0, RUNGS.splice(4, 1)[0]);
let cursor = 130;
RUNGS.forEach((r, i) => { r.number = i; r.top = cursor; r.y = cursor + 54; cursor += r.h; });
const FOOT = cursor + 12;
const H = FOOT + 102;

function blades(spec, y) {
  const { x, tag, op, name } = spec;
  const id = `${op}-${serial++}`, d = G.bladeHalfGap, h = G.contactHalfHeight;
  body(id, x - d, y - h, x + d, y + h);
  line([x - d, y - h], [x - d, y + h], { role: 'symbol', owner: id });
  line([x + d, y - h], [x + d, y + h], { role: 'symbol', owner: id });
  if (op === 'XIO') line([x - d, y + h - 3], [x + d, y - h + 3], { role: 'symbol', owner: id });
  text(tag, x, y - 25, { weight: 600, anchor: 'middle' });
  if (name) text(name, x, y + 35, { fs: FS.secondary, fill: C.muted, anchor: 'middle' });
  return { left: port(id, [x - d, y], 'in'), right: port(id, [x + d, y], 'out') };
}

function coilSymbol(x, y, qualifier, tag, id = `coil-${serial++}`) {
  const hw = G.coilHalfWidth, rh = G.coilHalfHeight, rx = G.coilArcRadius, cx = hw - rx;
  body(id, x - hw, y - rh, x + hw, y + rh,
    { x0: x - cx + 2, y0: y - rh + 2, x1: x + cx - 2, y1: y + rh - 2 });
  for (const side of [-1, 1]) {
    const sx = x + side * cx;
    graphics.push(`<path d="M ${sx} ${y - rh} A ${rx} ${rh} 0 0 ${side < 0 ? 0 : 1} ${sx} ${y + rh}" fill="none" stroke="${C.ink}" stroke-width="${SW.symbol}"/>`);
    // Conservative chord envelope: the maximum deviation at 64 subdivisions is
    // <0.005 px; the checker adds 0.01 px beyond the normal stroke envelope.
    const arc = Array.from({ length: 65 }, (_, i) => {
      const t = -Math.PI / 2 + Math.PI * i / 64;
      return [sx + side * rx * Math.cos(t), y + rh * Math.sin(t)];
    });
    for (let i = 1; i < arc.length; i++) segments.push({ a: arc[i - 1], b: arc[i], role: 'symbol', width: SW.symbol + 0.02, owner: id, attach: [], id });
  }
  if (qualifier) text(qualifier, x, y + 5, { fs: qualifier.length > 1 ? FS.secondary : FS.label, weight: 600, anchor: 'middle', owner: id });
  if (tag) text(tag, x, y - 27, { weight: 600, anchor: 'middle' });
  return { left: port(id, [x - hw, y], 'in'), right: port(id, [x + hw, y], 'out') };
}

function bracket(spec, y) {
  const { x, tag, op } = spec, hw = G.bracketHalfWidth, hh = G.bracketHalfHeight;
  const id = `${op}-${serial++}`;
  body(id, x - hw, y - hh, x + hw, y + hh,
    { x0: x - hw + 7, y0: y - hh + 2, x1: x + hw - 7, y1: y + hh - 2 });
  for (const side of [-1, 1]) {
    const bx = x + side * hw, tip = bx - side * 6;
    line([tip, y - hh], [bx, y - hh], { role: 'symbol', owner: id });
    line([bx, y - hh], [bx, y + hh], { role: 'symbol', owner: id });
    line([bx, y + hh], [tip, y + hh], { role: 'symbol', owner: id });
  }
  text(op, x, y + 5, { weight: 600, anchor: 'middle', owner: id });
  text(tag, x, y - 25, { weight: 600, anchor: 'middle' });
  return { left: port(id, [x - hw, y], 'in'), right: port(id, [x + hw, y], 'out') };
}

function instruction(spec, y) {
  const { op, tag, preset } = spec;
  const compare = op === 'GEQ';
  const id = `${op}-${serial++}`, x = compare ? 170 : G.blockX, top = y - 20, w = G.blockWidth, h = G.blockHeight - (compare ? 23 : 0);
  body(id, x, top, x + w, top + h,
    { x0: x + 7, y0: top + 5, x1: x + w - 7, y1: top + h - 5 });
  graphics.push(`<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${C.paper}"/>`);
  for (const [a, b] of [ [[x, top], [x + w, top]], [[x + w, top], [x + w, top + h]],
    [[x + w, top + h], [x, top + h]], [[x, top + h], [x, top]] ]) line(a, b, { role: 'symbol', owner: id });
  text(op, x + 12, y + 5, { weight: 600, owner: id });
  text(compare ? 'A ≥ B' : op === 'TON' ? 'ON DELAY' : 'COUNT UP', x + w - 12, y + 5,
    { fs: FS.secondary, fill: C.muted, anchor: 'end', owner: id });
  line([x, y + 16], [x + w, y + 16], { role: 'rule', owner: id });
  const rows = compare ? [['Source A', tag], ['Source B', String(spec.threshold)]]
    : [[op === 'TON' ? 'Timer' : 'Counter', tag], ['Preset', String(preset)], ['Accum', '0']];
  rows.forEach(([k, v], i) => {
    const yy = y + 36 + 23 * i;
    text(k, x + 12, yy, { fs: FS.subtitle, fill: C.muted, owner: id });
    text(v, x + w - 12, yy, { fs: FS.subtitle, weight: 600, anchor: 'end', owner: id });
  });
  if (compare) return { left: port(id, [x, y], 'rung-condition-in'), right: port(id, [x + w, y], 'comparison-result') };
  const enable = coilSymbol(G.statusX, y, op === 'TON' ? 'EN' : 'CU', null);
  const done = coilSymbol(G.statusX, y + 42, 'DN', null);
  join(port(id, [x + w, y], op === 'TON' ? 'EN' : 'CU'), enable.left);
  join(port(id, [x + w, y + 42], 'DN'), done.left);
  // The lower DN is a terminal status glyph, not an extra wired output rung.
  // Only the main rung continuation connects to the right power rail.
  return { left: port(id, [x, y], 'rung-condition-in'), right: enable.right };
}

function renderItem(spec, y) {
  if (spec.paths) {
    const y2 = y + G.branchDrop;
    const start = node(spec.x0, y, 'branch split'), end = node(spec.x1, y, 'branch merge');
    line(start.p, [spec.x0, y2]);
    line(end.p, [spec.x1, y2]);
    spec.paths.forEach((items, i) => series(items, y + i * G.branchDrop,
      node(spec.x0, y + i * G.branchDrop, 'branch start'), node(spec.x1, y + i * G.branchDrop, 'branch end')));
    return { left: start, right: end };
  }
  if (spec.op === 'XIC' || spec.op === 'XIO') return blades(spec, y);
  if (spec.op === 'ONS' || spec.op === 'RES') return bracket(spec, y);
  if (spec.op === 'TON' || spec.op === 'CTU' || spec.op === 'GEQ') return instruction(spec, y);
  return coilSymbol(spec.x, y, { OTE: '', OTL: 'L', OTU: 'U' }[spec.op], spec.tag);
}
function series(items, y, start, end) {
  let prev = start;
  for (const spec of items) {
    const e = renderItem(spec, y);
    join(prev, e.left);
    prev = e.right;
  }
  join(prev, end);
}

text(TITLE, G.margin, 47, { fs: FS.title, weight: 600 });
text(SUBTITLE, G.margin, 73, { fs: FS.subtitle, fill: C.muted });
text('D01 · LD-01', W - G.margin, 45, { fs: FS.label, weight: 600, anchor: 'end' });
text('OFFLINE / 1 OF 1', W - G.margin, 72, { fs: FS.secondary, fill: C.muted, anchor: 'end' });
line([G.margin, 94], [W - G.margin, 94], { role: 'rule' });
text('IEC 61131-3 LD  ·  Allen-Bradley instruction notation', G.margin, 116, { fs: FS.secondary, fill: C.muted });

const railTop = 164, railBottom = RUNGS.at(-1).y + 78;
for (const x of [G.left, G.right]) line([x, railTop], [x, railBottom], { role: 'rail' });
for (const r of RUNGS) {
  graphics.push(`<g id="rung-${r.number}" data-rung="${r.number}">`);
  text(String(r.number).padStart(3, '0'), G.left - 17, r.y + 5, { fs: FS.subtitle, weight: 600, fill: C.muted, anchor: 'end' });
  text(r.comment, G.left + 16, r.top + 10, { fs: FS.label, fill: C.muted });
  series(r.items, r.y, node(G.left, r.y, 'left power rail'), node(G.right, r.y, 'right power rail'));
  graphics.push('</g>');
}
line([G.margin, FOOT], [W - G.margin, FOOT], { role: 'rule' });
text('I/O CONVENTION', G.margin, FOOT + 26, { fs: FS.secondary, weight: 600 });
text('StopOK and SafetyOK = healthy-high. Safety relay operates the drive STO independently.', 180, FOOT + 26,
  { fs: FS.secondary, fill: C.muted });
text('READING NOTES', G.margin, FOOT + 51, { fs: FS.secondary, weight: 600 });
text('Timer preset in ms; counter preset in parts. Accum = offline initial value. EN / CU / DN are status terminals.', 180, FOOT + 51,
  { fs: FS.secondary, fill: C.muted });
text('SCOPE', G.margin, FOOT + 76, { fs: FS.secondary, weight: 600 });
text('FeedPermit authorizes the next cycle; clamp, feed motion and safe standstill are handled by the station sequencer.', 180, FOOT + 76,
  { fs: FS.secondary, fill: C.muted });

// Geometry validation. The only intentional text/body intersections are an
// instruction's own contents and a symbol's qualifier, each checked against a
// smaller declared interior AND all outline segments. No broad label exemptions.
const grow = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const inside = (a, b) => a.x0 >= b.x0 && a.y0 >= b.y0 && a.x1 <= b.x1 && a.y1 <= b.y1;
const same = (a, b) => Math.abs(a[0] - b[0]) < 0.001 && Math.abs(a[1] - b[1]) < 0.001;
function segmentHits(s, r) {
  // Liang-Barsky clipping also handles NC diagonals and the sampled coil arcs.
  const [ax, ay] = s.a, dx = s.b[0] - ax, dy = s.b[1] - ay;
  let lo = 0, hi = 1;
  for (const [p, q] of [[-dx, ax - r.x0], [dx, r.x1 - ax], [-dy, ay - r.y0], [dy, r.y1 - ay]]) {
    if (p === 0) { if (q < 0) return false; }
    else if (p < 0) lo = Math.max(lo, q / p);
    else hi = Math.min(hi, q / p);
    if (lo > hi) return false;
  }
  return true;
}
const errors = [];
const counts = { texts: texts.length, symbols: bodies.length, connectionSegments: connectors.length,
  textPairs: 0, textBodies: 0, textSegments: 0, lineBodies: 0, attachmentChecks: 0, collisions: 0 };
const fail = s => errors.push(s);
for (let i = 0; i < texts.length; i++) {
  const t = texts[i], r = grow(t.r, G.textClearance);
  if (!inside(r, { x0: 12, y0: 12, x1: W - 12, y1: H - 12 })) fail(`Text off canvas: ${t.s}`);
  for (let j = i + 1; j < texts.length; j++) {
    counts.textPairs++;
    if (hit(r, grow(texts[j].r, G.textClearance))) fail(`Text/text: ${t.s} / ${texts[j].s}`);
  }
  for (const b of bodies) {
    counts.textBodies++;
    if (t.owner === b.id) {
      if (!b.interior || !inside(r, b.interior)) fail(`Text outside its reserved interior: ${t.s}`);
    } else if (hit(r, grow(b, SW.symbol / 2))) fail(`Text/body: ${t.s} / ${b.id}`);
  }
  for (const s of segments) {
    counts.textSegments++;
    if (segmentHits(s, grow(r, s.width / 2))) fail(`Text/line: ${t.s} / ${s.id}`);
  }
}
for (const b of bodies) {
  if (!inside(grow(b, SW.symbol / 2), { x0: 12, y0: 12, x1: W - 12, y1: H - 12 })) fail(`Body off canvas: ${b.id}`);
  for (const other of bodies) if (b !== other && hit(b, other)) fail(`Body/body: ${b.id} / ${other.id}`);
}
for (const s of segments) {
  for (const p of [s.a, s.b]) if (p[0] < 12 || p[0] > W - 12 || p[1] < 12 || p[1] > H - 12) fail(`Line off canvas: ${s.id}`);
  for (const b of bodies) {
    counts.lineBodies++;
    if (s.owner === b.id) continue;
    const attachments = s.attach.filter(a => a.owner === b.id);
    if (attachments.length) {
      // A connected line is allowed to touch ONLY its named terminal boundary.
      if (segmentHits(s, grow(b, -0.01))) fail(`Attached line penetrates symbol: ${s.id} / ${b.id}`);
      for (const a of attachments) {
        counts.attachmentChecks++;
        if (!same(a.p, s.a) && !same(a.p, s.b)) fail(`Connection misses terminal: ${s.id} / ${a.name}`);
        const [x, y] = a.p;
        if (!((x === b.x0 || x === b.x1) && y >= b.y0 && y <= b.y1)) fail(`Terminal off symbol edge: ${b.id} / ${a.name}`);
      }
    } else if (segmentHits(s, grow(b, (s.width + SW.symbol) / 2))) fail(`Line through unrelated symbol: ${s.id} / ${b.id}`);
  }
}
// Every connection endpoint belongs to a named port, a rail, or another wire.
const onSegment = (p, s) => segmentHits({ a: p, b: p }, {
  x0: Math.min(s.a[0], s.b[0]), x1: Math.max(s.a[0], s.b[0]),
  y0: Math.min(s.a[1], s.b[1]), y1: Math.max(s.a[1], s.b[1]) });
for (const s of connectors) for (const p of [s.a, s.b]) {
  const attached = s.attach.some(a => a.owner && same(a.p, p));
  const joined = segments.some(o => o !== s && (o.role === 'wire' || o.role === 'rail') && onSegment(p, o));
  if (!attached && !joined) fail(`Dangling connection: ${s.id} at ${p}`);
}
// An orthogonal crossing must be an endpoint of at least one segment (a T or
// corner), not an ambiguous four-way wire crossing. Reject coincident overlaps.
for (let i = 0; i < connectors.length; i++) for (let j = i + 1; j < connectors.length; j++) {
  const a = connectors[i], b = connectors[j];
  const ah = a.a[1] === a.b[1], bh = b.a[1] === b.b[1];
  if (ah === bh) {
    const axis = ah ? 0 : 1, fixed = 1 - axis;
    if (a.a[fixed] === b.a[fixed] && Math.min(Math.max(a.a[axis], a.b[axis]), Math.max(b.a[axis], b.b[axis])) >
      Math.max(Math.min(a.a[axis], a.b[axis]), Math.min(b.a[axis], b.b[axis]))) fail(`Overlapping wires: ${a.id} / ${b.id}`);
  } else {
    const h = ah ? a : b, v = ah ? b : a, p = [v.a[0], h.a[1]];
    if (onSegment(p, h) && onSegment(p, v) && ![h.a, h.b, v.a, v.b].some(e => same(e, p))) fail(`Unmarked wire crossing: ${a.id} / ${b.id}`);
  }
}
counts.collisions = errors.length;
if (errors.length) throw new Error(`Refusing to write: ${errors.length} geometry failures\n${[...new Set(errors)].join('\n')}`);

function dslItems(items, indent = '  ') {
  return items.flatMap(s => s.paths
    ? [`${indent}parallel:`, ...s.paths.flatMap(p => [`${indent}  branch:`, ...dslItems(p, indent + '    ')])]
    : [`${indent}${s.op}(${s.tag}${s.preset !== undefined ? `, PRE=${s.preset}, ACC=0` : ''}${s.threshold !== undefined ? `, IN1=${s.tag}, IN2=${s.threshold}` : ''}${s.name ? `, name="${s.name}"` : ''})`]);
}
const source = [
  '# MainTask (10 ms) / DrillStation / SpindleAndToolLife',
  '# AB instruction semantics: TIMER in ms; COUNTER in finished parts.',
  '# StopOK and SafetyOK are healthy-high; safety relay controls drive STO.',
  '# Start_OS is a dedicated BOOL storage bit, not an input alias.',
  '# CycleDone is held for at least one task scan and drops between parts.',
  '# DriveReady means available to run (not a stopped-only ready indication).',
  '# AtSpeed false is not a safe-standstill indication; tool service uses the machine isolation procedure.',
  '# FeedPermit is the new-cycle permissive to the separate drill sequencer.',
  '# PRE and ACC preserve AB operands; status pins and AB glyph style are not expressible in this DSL.',
  `ladder "${TITLE}"`, '',
  ...RUNGS.flatMap(r => [`rung ${r.number} "${r.comment}":`, ...dslItems(r.items), '']),
].join('\n');
const desc = 'Offline ladder drawing for a drilling station, read top to bottom and left to right. Eight numbered and commented rungs: guarded fault reset, three-second spindle speed proving timer, drive-trip or timeout fault latch, edge-triggered start with seal-in and healthy-high stop/safety permissives, a 500-part tool-life counter, a stopped/idle tool-change counter reset, drilling feed permission, and a GEQ comparison that lights an advance tool warning at 450 parts. Allen-Bradley L and U coils, inline ONS and RES brackets, TON EN/DN and CTU CU/DN status terminals. All wires are orthogonal and terminate at the exact contact blade, coil arc, instruction boundary or power rail. Safety STO and drilling motion are handled outside this control routine.';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}" stroke-linecap="butt" stroke-linejoin="miter">\n<title>${esc(TITLE)}</title>\n<desc>${esc(desc)}</desc>\n<rect width="${W}" height="${H}" fill="${C.paper}"/>\n${graphics.join('\n')}\n</svg>\n`;

const notes = `# Ladder exemplar — drill-station spindle and tool life

**Scenario.** A small drilling station's \`SpindleAndToolLife\` routine in
\`DrillStation\`, called every 10 ms by \`MainTask\`. The operator starts the
spindle with a fresh Start edge; its own output seals around the Start branch.
Stop, a lost safety/drive permissive or a spindle fault breaks that seal. A
non-retentive TON allows three seconds to reach speed and detects a sustained
loss of speed. A drive trip or timeout latches SpindleFault. A CTU counts one
finished part per CycleDone rising edge; at 500 parts the station withdraws
permission to start another cycle. A GEQ comparison lights ToolWarnLamp at 450
parts, giving the operator advance notice to prepare a replacement. A deliberate
tool reset is accepted only with the run command off, AtSpeed false and no
active cycle. The adjacent sequencer owns clamp/feed motion and safe standstill;
this is a complete spindle/tool-life routine, not the entire machine program.

**Control details.** StopOK and SafetyOK are healthy-high input aliases, so their
instructions are XIC, even though the field Stop device has a normally closed
contact. DriveReady means available to run, including while running. Start_OS is
a dedicated BOOL storage bit. Its ONS precedes all permissives: a held Start
cannot restart the spindle after a permissive returns. Fault reset is above fault
set, making active faults dominant. The timer reads the previous scan's SpindleRun;
monitoring begins at most one 10 ms scan after the command. CycleDone must stay
true for at least one task scan and return false between parts. CTU already detects
the rising edge, so no redundant ONS is inserted before it. Counting is independent
of SpindleRun so a completed final part is not lost when the operator stops.
The CTU and reset execute before FeedPermit, so reaching 500 withdraws the
next-cycle permissive in the same scan. The sequencer consumes FeedPermit
after this routine and only to authorize a new cycle.
ToolLife is retained between ordinary stops; only RES resets it. AtSpeed false is
not proof of safe standstill; tool replacement follows the machine's isolation
procedure. The independent safety relay operates drive STO.

**Palette.** Four named literal colours, no accent hue and no online-state
highlight. Ink \`#20272B\` is every symbol, wire, rail, tag and primary title.
Muted \`#59636B\` is comments, parameter captions, rung numbers and sheet notes.
Rule \`#CBD1D6\` is the two sheet dividers and block header dividers. Paper
\`#FFFFFF\` is the canvas and instruction interiors. Colour never distinguishes
logical truth or equipment status in this offline plate.

**Type scale.** Title 25/600; tag and instruction labels 14/600; rung comments
14/400; routine path and block operand rows 13; sheet notes and status qualifiers
12. All text uses one stack: Inter, Helvetica Neue, Helvetica, Arial, sans-serif.
Inter provides clean technical labels; Helvetica Neue is its closely matched
fallback on this workstation. The measurement and raster passes use that same
installed font, including semibold, through resvg. No monospace tag exception,
CSS variable, shadow, tinted card or rounded instruction block.

**Symbol geometry.** Power rails are 3 px, rung/branch links 1.5 px, symbol outlines
2 px and editorial rules 1 px. NO contacts are two 28 px blades 14 px apart; NC
adds a single diagonal between them. Every output/latch/unlatch/status coil uses
the same pair of half ellipses: horizontal radius 8, vertical radius 16, 44 px
total width. Wires meet their outer midpoints exactly, never an arc endpoint or
the empty interior. L and U are AB retentive bit qualifiers. ONS and RES share a
58 × 28 px open bracket geometry, with 6 px inward tips. Rectangular TON/CTU
instructions share a 244 × 116 px body and 23 px operand-row pitch. GEQ uses the
same instruction geometry with one fewer operand row, hence 93 px height; its
header gives both the mnemonic and the comparison operator, with Source A and
Source B immediately below. Its output passes comparison truth to the lamp.
The timer/counter's named
EN/DN and CU/DN status terminals use the same coil geometry, on 42 px pitch; the
lower DN terminates as a status symbol, without an invented connection to the
right rail. Branches split and merge at explicit orthogonal T joints, on 66 px
vertical pitch. There are no ambiguous crossings. Tags clear symbol tops by
11 px or more; columns are chosen around full measured tag widths.

**Layout and collisions.** The sheet is ${W} × ${H}, with the output column at
x=${G.output}, rails at x=${G.left}/${G.right}, and the instruction/status region
aligned to the right. Rung bands expand only for a branch or instruction block.
The script shapes each text string with resvg and uses the resulting actual ink
bounds plus a 2.5 px clearance. It checks every text against every other text,
every symbol, every line segment (including outlines, diagonals and sampled coil
arcs), and the canvas. Text that belongs inside a symbol must fit an explicit
inset interior and still clear all of its outline segments. Every line is checked
against every unrelated symbol; attached lines must end at a declared port and
cannot enter the body. It also checks body/body collisions, canvas containment,
dangling wires, coincident connections and ambiguous crossings. It refuses to
write on any failure. This run checked ${counts.textPairs} text pairs,
${counts.textBodies} text/body pairs, ${counts.textSegments} text/segment pairs,
${counts.lineBodies} line/body pairs and ${counts.attachmentChecks} attached
endpoints: **0 collisions**. The final SVG is rasterised by resvg at 1600 px wide
to the requested scratch path for visual inspection.

**Departures from the reference document and DSL limits.** The house style uses
IEC LD rails, links, NO/NC contacts and coil geometry with a consistent
Allen-Bradley instruction dialect. It is not a claim that AB mnemonics are IEC
keywords. Unlike the repository reference's IEC S/R qualifiers, this plate uses
AB L/U; unlike its arrow contact and Boolean R coil, ONS and RES use AB brackets.
The standard doc's illustrated coil leads do not meet the curve extremities;
this drawing corrects that geometry. The doc's 9 px tags and 60 × 50 blocks are
expanded for legibility. Rung numbers are zero-based, three-digit AB-style labels.

TON and CTU are the native AB ladder instructions: Timer/Counter, Preset and Accum
operands, with EN/DN or CU/DN status terminals. They are not IEC function-block
instances with IN/PT/Q/ET or CU/R/PV/Q/CV pins. A counter reset is a separate RES
instruction, not a Boolean reset coil or an invented CTU R terminal. Preset 3000
means 3000 ms for a TIMER; preset 500 means 500 completed parts. Accum 0 is an
offline initial value, not a claimed live measurement. IEC negated/S/R coils,
P/N edge contacts and pin modifiers are deliberately absent:
mixing alternate dialects or unnecessary logic into the routine would weaken
the exemplar. All seven Tier 1 inventory families appear. Ten Tier 2 capabilities
appear when the comparison family is represented in its AB dialect: comparison,
instruction body, block terminal, AB L, AB U, AB inline instruction, AB status
terminal, rung number, tag annotation and rung comment. GEQ is specifically the
AB boxed comparison, not IEC Table 75's compare-contact glyph; the inventory's
strict IEC glyph count is therefore nine of eighteen. RES belongs to the
inline-instruction family and is not double-counted as an IEC R coil.

The same eight rungs, tag names, branches and instruction parameters are in
source.sx. Every path uses the parser's required branch: wrapper, with no var
declarations. PRE and ACC survive as generic function-block parameters. The DSL
requires an extra first positional label for GEQ; ToolLife.ACC is used there and
as IN1, with IN2=450. It denotes the source operand, not a fictitious GEQ instance.
The DSL
cannot request AB L/U or bracketed ONS/RES glyphs, nor express status pins,
terminal attachment geometry, the font/spacing system, task metadata, retention
or I/O polarity declarations. Its current renderer shows S/R, an arrow contact
for ONS, an R coil for RES, and nameless inline block connections. These are
renderer/DSL limits, not substitute logic in ideal.svg. The DSL is a diagram
description, not executable PLC code. Validation returned true with no
diagnostics using renderResult(source, {type: 'ladder'}). The installed
vite-node 2.1.9 does not implement the requested -e option (it reports "No files
specified"), so the same check was run through ViteNodeServer/ViteNodeRunner
from stdin, without adding a helper file.

**References.** IEC 61131-3:2013 §8.2 supplies the LD framework; vendor-specific
instruction behaviour and notation are checked against Rockwell's
[bit instructions](https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/bit-instructions1.html),
[TON](https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/timer-and-counter-instructions/timer-on-delay--ton-.html)
and [CTU](https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/timer-and-counter-instructions/count-up--ctu-.html)
documentation, plus the [AB comparison instruction reference](https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1785-rm001_-en-p.pdf)
for GEQ's Source A / Source B form. No unverified NEMA clause is asserted.
`;

// Render before writes as well: a font or SVG failure must not publish artifacts.
const raster = new Resvg(svg, { font, fitTo: { mode: 'width', value: 1600 } }).render();
if (raster.width !== 1600) throw new Error('Unexpected raster width');
await mkdir(TARGET, { recursive: true });
if (PNG) await mkdir(new URL('./', `file://${PNG}`), { recursive: true });
await writeFile(new URL('ideal.svg', TARGET), svg);
await writeFile(new URL('source.sx', TARGET), source);
await writeFile(new URL('notes.md', TARGET), notes);
if (PNG) await writeFile(PNG, raster.asPng());
console.log(`ladder exemplar: ${W}×${H}; ${fileURLToPath(TARGET)}`);
console.log(JSON.stringify(counts));
