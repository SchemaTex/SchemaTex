/** Draw visual-eval/exemplars/decisiontree/taxonomy/ideal.svg — the look a question tree aims at.
 *
 *   node scripts/visual-eval/draw-decisiontree-taxonomy-exemplar.mjs
 *
 * Reads the exemplar's own source.sx, so the drawing can never say more or less
 * than the DSL. Questions are hexagons (the clinical-algorithm decision box),
 * outcomes are cards whose coloured header names the urgency class, and every
 * branch carries its Yes/No beside the line on the side away from its parent.
 * Text is measured with resvg, the renderer the eval rasterises with; nothing is
 * written until every label, node, edge and the canvas edge have been checked.
 */
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const DIR = process.argv[2] ? pathToFileURL(resolve(process.argv[2]) + "/") : new URL("../../visual-eval/exemplars/decisiontree/taxonomy/", import.meta.url);
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

/* ---------- palette ---------- */
const INK = "#1F2933", SLATE = "#52606D", LINE = "#3E4C59", PAPER = "#FFFFFF";
const Q_FILL = "#F0F4F8";
const CLASS = {
  // band: header fill · on: header text · edge: box outline · tint: body fill
  emergency: { band: "#B42318", on: "#FFFFFF", edge: "#B42318", tint: "#FDECEA" },
  urgent:    { band: "#F2B233", on: "#1F2933", edge: "#C98A0E", tint: "#FFF6DD" },
  routine:   { band: "#2B7A4B", on: "#FFFFFF", edge: "#2B7A4B", tint: "#EAF5EE" },
};

/* ---------- type scale ---------- */
const T = {
  title:  { fs: 20, fw: 600 },
  q:      { fs: 13, fw: 400 },
  action: { fs: 12.5, fw: 500 },
  tag:    { fs: 10, fw: 700, ls: 1 },
  branch: { fs: 11, fw: 600 },
  badge:  { fs: 10, fw: 700 },
  legend: { fs: 11.5, fw: 400 },
};

/* ---------- geometry ---------- */
const M = 40;                 // canvas margin
const TOP = 92;               // top of the root question
const Q_H = 56, Q_INSET = 18, Q_PADX = 14, Q_SINGLE = 240, Q_WRAP = 220, Q_LH = 17;
const GAP_V = 80, STEM = 28;  // parent bottom -> child top; parent bottom -> rail
const LEAF_W = 168, BAND_H = 22, BODY_PAD = 11, A_LH = 16;
const LEAF_GAP = 18, GAP_PER_LEVEL = 12;
const ARROW_L = 8, ARROW_HW = 4.5, CORNER = 6, BADGE_R = 9;

const n2 = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- text measurement (resvg, same engine as the eval) ---------- */
// Inter is rarely installed, so resvg resolves the stack to Helvetica Neue on macOS.
// Loading only that face keeps measurement fast; other systems fall back to all fonts.
const HELVETICA_NEUE = "/System/Library/Fonts/HelveticaNeue.ttc";
const MEASURE_FONT = await readFile(HELVETICA_NEUE).then(
  () => ({ fontFiles: [HELVETICA_NEUE], loadSystemFonts: false, defaultFontFamily: "Helvetica Neue" }),
  () => ({ loadSystemFonts: true }),
);
const widths = new Map();
function measure(s, st) {
  const key = `${s}|${st.fs}|${st.fw}|${st.ls ?? 0}`;
  if (widths.has(key)) return widths.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="100"><text x="10" y="60" font-family="${FONT}" font-size="${st.fs}" font-weight="${st.fw}" letter-spacing="${st.ls ?? 0}">${esc(s)}</text></svg>`;
  const b = new Resvg(svg, { font: MEASURE_FONT }).getBBox();
  const w = b ? b.x - 10 + b.width : s.length * st.fs * 0.56;
  widths.set(key, w);
  return w;
}
// One line if it fits; otherwise the break that makes two lines as even as possible,
// so a label never ends on a lone word.
function wrap(s, st, single, max) {
  if (measure(s, st) <= single) return [s];
  const words = s.split(/\s+/);
  const greedy = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measure(next, st) > max) { greedy.push(cur); cur = word; } else cur = next;
  }
  if (cur) greedy.push(cur);
  if (greedy.length !== 2) return greedy;
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const w = Math.max(...lines.map((l) => measure(l, st)));
    if (w <= max && (!best || w < best.w)) best = { w, lines };
  }
  return best ? best.lines : greedy;
}

/* ---------- parse source.sx (taxonomy subset) ---------- */
const src = await readFile(new URL("source.sx", DIR), "utf8");
let title = "", classes = [];
const stack = [];
let root = null, nextId = 0;
for (const raw of src.split("\n")) {
  if (!raw.trim() || /^\s*(%%|#)/.test(raw)) continue;
  const indent = raw.match(/^ */)[0].length;
  const line = raw.trim();
  let m;
  if ((m = line.match(/^decisiontree\s+"([^"]*)"/))) { title = m[1]; continue; }
  if ((m = line.match(/^classes:\s*(.+)$/))) { classes = m[1].split(",").map((c) => c.trim()); continue; }
  m = line.match(/^(?:(yes|no):\s*)?(q|a)\s+"([^"]*)"(?:\s+class=(\S+))?\s*$/);
  if (!m) throw new Error(`Unparsed line: ${line}`);
  const node = { id: `n${nextId++}`, branch: m[1], kind: m[2] === "q" ? "question" : "answer", label: m[3], cls: m[4], children: [] };
  while (stack.length && stack.at(-1).indent >= indent) stack.pop();
  if (stack.length) { node.parent = stack.at(-1).node; node.parent.children.push(node); } else root = node;
  stack.push({ node, indent });
}
for (const c of classes) if (!CLASS[c]) throw new Error(`No colour for class ${c}`);

/* ---------- layout ---------- */
const all = [];
(function walk(n, d) { n.depth = d; all.push(n); n.children.forEach((c) => walk(c, d + 1)); })(root, 0);
const questions = all.filter((n) => n.kind === "question");
const leaves = all.filter((n) => n.kind === "answer");
const qDepth = Math.max(...questions.map((q) => q.depth));
const rowTop = (d) => TOP + d * (Q_H + GAP_V);

// questions: wrapped text decides width, one shared height
for (const q of questions) {
  q.lines = wrap(q.label, T.q, Q_SINGLE, Q_WRAP);
  if (q.lines.length > 2) throw new Error(`Question wraps to ${q.lines.length} lines: ${q.label}`);
  q.w = Math.max(...q.lines.map((l) => measure(l, T.q))) + 2 * (Q_INSET + Q_PADX);
  q.h = Q_H;
  q.y = rowTop(q.depth);
}
// outcomes: one shared card size, all on one shelf below the deepest question
for (const a of leaves) a.lines = wrap(a.label, T.action, LEAF_W - 2 * BODY_PAD, LEAF_W - 2 * BODY_PAD);
const bodyLines = Math.max(...leaves.map((a) => a.lines.length));
const LEAF_H = BAND_H + 2 * BODY_PAD + bodyLines * A_LH;
for (const a of leaves) { a.w = LEAF_W; a.h = LEAF_H; a.y = rowTop(qDepth + 1); }

// leaf x: sibling spacing grows the higher the split that separates two neighbours
const ancestors = (n) => { const out = []; for (let p = n; p; p = p.parent) out.push(p); return out; };
let cursor = M, prev = null;
for (const a of leaves) {
  if (prev) {
    const up = new Set(ancestors(prev));
    const lca = ancestors(a).find((p) => up.has(p));
    cursor += LEAF_GAP + (qDepth - lca.depth) * GAP_PER_LEVEL;
  }
  a.x = cursor + LEAF_W / 2;
  cursor += LEAF_W;
  prev = a;
}
(function place(n) { if (!n.children.length) return; n.children.forEach(place); n.x = (n.children[0].x + n.children.at(-1).x) / 2; })(root);

/* ---------- drawing + collision registry ---------- */
const g = [], texts = [], nodes = [], segs = [];
const text = (s, x, y, st, o = {}) => {
  const w = measure(s, st);
  const anchor = o.anchor ?? "middle";
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  texts.push({ s, owner: o.owner, box: { x0, y0: y - 0.74 * st.fs, x1: x0 + w, y1: y + 0.24 * st.fs } });
  g.push(`<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT}" font-size="${st.fs}" font-weight="${st.fw}"${st.ls ? ` letter-spacing="${st.ls}"` : ""} fill="${o.fill ?? INK}" text-anchor="${anchor}">${esc(s)}</text>`);
};

// title + legend
const W = Math.round(cursor + M);
text(title, M, 50, T.title, { anchor: "start", owner: "title" });
{
  const items = classes.map((c) => ({ c, label: c[0].toUpperCase() + c.slice(1) }));
  let x = W - M;
  const y = 50;
  for (const it of [...items].reverse()) {
    const w = measure(it.label, T.legend);
    text(it.label, x, y, T.legend, { anchor: "end", fill: SLATE, owner: `legend-${it.c}` });
    x -= w + 8;
    g.push(`<rect x="${n2(x - 12)}" y="${n2(y - 10)}" width="12" height="12" rx="3" fill="${CLASS[it.c].band}" stroke="${CLASS[it.c].edge}"/>`);
    nodes.push({ id: `legend-chip-${it.c}`, box: { x0: x - 12, y0: y - 10, x1: x, y1: y + 2 } });
    x -= 12 + 22;
  }
  const qLabel = "Question";
  const qw = measure(qLabel, T.legend);
  text(qLabel, x, y, T.legend, { anchor: "end", fill: SLATE, owner: "legend-q" });
  x -= qw + 8;
  const hx1 = x, hx0 = x - 22, hy0 = y - 10, hy1 = y + 2;
  g.push(`<polygon points="${[[hx0 + 5, hy0], [hx1 - 5, hy0], [hx1, (hy0 + hy1) / 2], [hx1 - 5, hy1], [hx0 + 5, hy1], [hx0, (hy0 + hy1) / 2]].map((p) => p.map(n2).join(",")).join(" ")}" fill="${Q_FILL}" stroke="${LINE}" stroke-width="1.2"/>`);
  nodes.push({ id: "legend-hex", box: { x0: hx0, y0: hy0, x1: hx1, y1: hy1 } });
}

// edges (drawn under nodes)
for (const p of all) {
  if (!p.children.length) continue;
  const pb = p.y + p.h;
  const rail = pb + STEM;
  for (const c of p.children) {
    const dir = Math.sign(c.x - p.x);
    const tip = c.y, end = tip - ARROW_L;
    const d = `M${n2(p.x)},${n2(pb)} V${n2(rail - CORNER)} Q${n2(p.x)},${n2(rail)} ${n2(p.x + dir * CORNER)},${n2(rail)} H${n2(c.x - dir * CORNER)} Q${n2(c.x)},${n2(rail)} ${n2(c.x)},${n2(rail + CORNER)} V${n2(end)}`;
    g.push(`<path d="${d}" fill="none" stroke="${LINE}" stroke-width="1.5" stroke-linecap="round"/>`);
    g.push(`<polygon points="${n2(c.x)},${n2(tip)} ${n2(c.x - ARROW_HW)},${n2(end)} ${n2(c.x + ARROW_HW)},${n2(end)}" fill="${LINE}"/>`);
    const e = { parent: p.id, child: c.id };
    segs.push({ ...e, a: [p.x, pb], b: [p.x, rail] }, { ...e, a: [p.x, rail], b: [c.x, rail] }, { ...e, a: [c.x, rail], b: [c.x, tip] });
    // Yes/No beside the drop, on the side away from the parent
    const label = c.branch === "yes" ? "Yes" : c.branch === "no" ? "No" : null;
    if (label) text(label, c.x + dir * 7, rail + 23, T.branch, { anchor: dir < 0 ? "end" : "start", owner: `branch-${c.id}` });
  }
}

// question hexagons with step numbers (breadth-first reading order)
const bfs = [...questions].sort((a, b) => a.depth - b.depth || a.x - b.x);
bfs.forEach((q, i) => { q.step = i + 1; });
for (const q of questions) {
  const x0 = q.x - q.w / 2, x1 = q.x + q.w / 2, y0 = q.y, y1 = q.y + q.h, ym = q.y + q.h / 2;
  q.poly = [[x0 + Q_INSET, y0], [x1 - Q_INSET, y0], [x1, ym], [x1 - Q_INSET, y1], [x0 + Q_INSET, y1], [x0, ym]];
  g.push(`<polygon points="${q.poly.map((p) => p.map(n2).join(",")).join(" ")}" fill="${Q_FILL}" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/>`);
  nodes.push({ id: q.id, box: { x0, y0, x1, y1 }, poly: q.poly });
  const first = ym - ((q.lines.length - 1) * Q_LH) / 2 + 4.5;
  q.lines.forEach((l, i) => text(l, q.x, first + i * Q_LH, T.q, { owner: q.id }));
  g.push(`<circle cx="${n2(x0)}" cy="${n2(ym)}" r="${BADGE_R}" fill="${LINE}" stroke="${PAPER}" stroke-width="1.5"/>`);
  nodes.push({ id: `badge-${q.id}`, of: q.id, box: { x0: x0 - BADGE_R, y0: ym - BADGE_R, x1: x0 + BADGE_R, y1: ym + BADGE_R } });
  text(String(q.step), x0, ym + 3.6, T.badge, { fill: PAPER, owner: `badge-${q.id}` });
}

// outcome cards: coloured header naming the class, tinted body with the action
for (const a of leaves) {
  const k = CLASS[a.cls] ?? { band: Q_FILL, tint: Q_FILL, edge: LINE, on: INK };
  const x0 = a.x - a.w / 2, y0 = a.y, r = 6;
  g.push(`<rect x="${n2(x0)}" y="${n2(y0)}" width="${a.w}" height="${a.h}" rx="${r}" fill="${k.tint}" stroke="${k.edge}" stroke-width="1.5"/>`);
  if (a.cls) g.push(`<path d="M${n2(x0)},${n2(y0 + BAND_H)} V${n2(y0 + r)} Q${n2(x0)},${n2(y0)} ${n2(x0 + r)},${n2(y0)} H${n2(x0 + a.w - r)} Q${n2(x0 + a.w)},${n2(y0)} ${n2(x0 + a.w)},${n2(y0 + r)} V${n2(y0 + BAND_H)} Z" fill="${k.band}"/>`);
  nodes.push({ id: a.id, box: { x0, y0, x1: x0 + a.w, y1: y0 + a.h } });
  if (a.cls) text(a.cls.toUpperCase(), a.x, y0 + 15, T.tag, { fill: k.on, owner: a.id });
  const bodyTop = y0 + (a.cls ? BAND_H : 0), bodyH = a.h - (a.cls ? BAND_H : 0);
  const first = bodyTop + bodyH / 2 - ((a.lines.length - 1) * A_LH) / 2 + 4.3;
  a.lines.forEach((l, i) => text(l, a.x, first + i * A_LH, T.action, { owner: a.id }));
}

const H = Math.round(Math.max(...leaves.map((a) => a.y + a.h)) + M);

/* ---------- collision check ---------- */
const hit = (a, b, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
const segBox = (s, pad) => ({ x0: Math.min(s.a[0], s.b[0]) - pad, y0: Math.min(s.a[1], s.b[1]) - pad, x1: Math.max(s.a[0], s.b[0]) + pad, y1: Math.max(s.a[1], s.b[1]) + pad });
const inside = (pt, poly, pad) => poly.every((p, i) => {
  const q = poly[(i + 1) % poly.length];
  const ex = q[0] - p[0], ey = q[1] - p[1];
  return (ex * (pt[1] - p[1]) - ey * (pt[0] - p[0])) / Math.hypot(ex, ey) >= pad;
});
const problems = [];
for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++)
  if (hit(texts[i].box, texts[j].box, 1)) problems.push(`text/text: "${texts[i].s}" x "${texts[j].s}"`);
for (const t of texts) {
  for (const s of segs) if (hit(t.box, segBox(s, 2))) problems.push(`text/edge: "${t.s}" x ${s.parent}->${s.child}`);
  const own = nodes.find((n) => n.id === t.owner);
  // A step number sits in its badge, which is deliberately centred on its own question's left point.
  for (const n of nodes) if (n.id !== t.owner && n.id !== own?.of && hit(t.box, n.box, 2)) problems.push(`text/node: "${t.s}" x ${n.id}`);
  if (own?.poly) {
    const { x0, y0, x1, y1 } = t.box;
    if (![[x0, y0], [x1, y0], [x0, y1], [x1, y1]].every((pt) => inside(pt, own.poly, 4))) problems.push(`text escapes its hexagon: "${t.s}"`);
  } else if (own && !own.id.startsWith("badge") && !hit(t.box, { x0: own.box.x0 + 4, y0: own.box.y0 + 2, x1: own.box.x1 - 4, y1: own.box.y1 - 2 }) ) problems.push(`text outside its card: "${t.s}"`);
  if (own && !own.id.startsWith("badge") && !own.poly && (t.box.x0 < own.box.x0 + 4 || t.box.x1 > own.box.x1 - 4)) problems.push(`text wider than its card: "${t.s}"`);
  const { x0, y0, x1, y1 } = t.box;
  if (x0 < 8 || y0 < 8 || x1 > W - 8 || y1 > H - 8) problems.push(`text off canvas: "${t.s}"`);
}
for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
  const a = nodes[i], b = nodes[j];
  if (a.of === b.id || b.of === a.id) continue;
  if (hit(a.box, b.box, 8)) problems.push(`node/node: ${a.id} x ${b.id}`);
}
for (const s of segs) for (const n of nodes) {
  if (n.id === s.parent || n.id === s.child) continue;
  if (hit(segBox(s, 0), { x0: n.box.x0 - 2, y0: n.box.y0 - 2, x1: n.box.x1 + 2, y1: n.box.y1 + 2 })) problems.push(`edge/node: ${s.parent}->${s.child} x ${n.id}`);
}
for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
  const a = segs[i], b = segs[j];
  if (a.parent === b.parent) continue;
  if (a.child === b.parent || b.child === a.parent) continue;
  if (hit(segBox(a, 0), segBox(b, 0), 0.5)) problems.push(`edge/edge: ${a.parent}->${a.child} x ${b.parent}->${b.child}`);
}

/* ---------- write ---------- */
const nQ = questions.length, nA = leaves.length;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(title)}</title>
<desc>Question tree: ${nQ} yes/no questions lead to ${nA} actions, each colour-coded by urgency (${classes.join(", ")}).</desc>
<rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER}"/>
${g.join("\n")}
</svg>
`;
console.log(`canvas ${W}x${H}; ${nQ} questions, ${nA} outcomes; collisions: ${problems.length}`);
for (const p of problems) console.log("  " + p);
if (problems.length) process.exit(1);
await writeFile(new URL("ideal.svg", DIR), svg);
console.log("wrote ideal.svg");
