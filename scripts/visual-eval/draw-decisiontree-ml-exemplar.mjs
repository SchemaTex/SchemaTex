/** Draw visual-eval/exemplars/decisiontree/ml/ideal.svg — the look a classifier tree aims at.
 *
 *   node scripts/visual-eval/draw-decisiontree-ml-exemplar.mjs
 *
 * Reads the exemplar's own source.sx, so the drawing can never say more or less
 * than the DSL. Before drawing it checks the numbers a trained tree must obey:
 * every node's samples equal the sum of its class counts, each pair of children
 * adds up to its parent, the stated Gini matches the counts, each split lowers
 * the weighted impurity, and each leaf's class is its majority class.
 *
 * Split nodes are neutral rounded boxes carrying the rule; leaves are cards whose
 * coloured header names the predicted class. Every node shows its
 * sample count, a stacked bar of its class mix and the class counts. The True
 * branch is always on the left. Text is measured with resvg, the renderer the
 * eval rasterises with; nothing is written until every label, node, edge and the
 * canvas edge have been checked.
 */
import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const DIR = new URL("../../visual-eval/exemplars/decisiontree/ml/", import.meta.url);
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

/* ---------- palette (ink, lines and fills shared with the taxonomy exemplar) ---------- */
const INK = "#1F2933", SLATE = "#52606D", LINE = "#3E4C59", PAPER = "#FFFFFF";
const SPLIT_FILL = "#F0F4F8", BAR_TRACK = "#D9E2EC";
const CLASS = {
  // band: header fill and bar segment · on: header text · edge: box outline · tint: body fill
  renews:     { band: "#1D64A8", on: "#FFFFFF", edge: "#1D64A8", tint: "#E7F1F9" },
  downgrades: { band: "#F2B233", on: "#1F2933", edge: "#C98A0E", tint: "#FFF6DD" },
  cancels:    { band: "#B42318", on: "#FFFFFF", edge: "#B42318", tint: "#FDECEA" },
};

/* ---------- type scale ---------- */
const T = {
  title:    { fs: 20, fw: 600 },
  subtitle: { fs: 12, fw: 400 },
  rule:     { fs: 13, fw: 600 },
  purity:   { fs: 12.5, fw: 600 },
  stats:    { fs: 11, fw: 400 },
  count:    { fs: 10.5, fw: 500 },
  tag:      { fs: 10, fw: 700, ls: 1 },
  branch:   { fs: 11, fw: 600 },
  legend:   { fs: 11.5, fw: 400 },
};

/* ---------- geometry ---------- */
const M = 40;                  // canvas margin
const TOP = 116;               // top of the root split
const NODE_MIN_W = 172, PADX = 14;
const BAR_H = 8, CHIP = 8;
const SPLIT_H = 88;            // rule, stats, bar, counts
const BAND_H = 22, LEAF_H = BAND_H + 86;  // share, stats, bar, counts
const GAP_V = 80, STEM = 28;   // parent bottom -> child top; parent bottom -> rail
const LEAF_GAP = 18, GAP_PER_LEVEL = 12;
const CORNER = 6, R = 6;

const n2 = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (v) => v.toLocaleString("en-US");
const pretty = (s) => s.replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/!=/g, "≠");
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/* ---------- text measurement (resvg, same engine as the eval) ---------- */
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

/* ---------- parse source.sx (ml subset) ---------- */
const src = await readFile(new URL("source.sx", DIR), "utf8");
let title = "", classes = [], impurity = "gini";
const stack = [];
let root = null, nextId = 0;
for (const raw of src.split("\n")) {
  if (!raw.trim() || /^\s*(%%|#)/.test(raw)) continue;
  const indent = raw.match(/^ */)[0].length;
  const line = raw.trim();
  let m;
  if ((m = line.match(/^decisiontree:ml\s+"([^"]*)"/))) { title = m[1]; continue; }
  if ((m = line.match(/^classes:\s*(.+)$/))) { classes = m[1].split(",").map((c) => c.trim()); continue; }
  if ((m = line.match(/^impurity:\s*(\w+)$/))) { impurity = m[1]; continue; }
  m = line.match(/^(?:(true|false)\s+)?(split|leaf)(?:\s+"([^"]*)")?((?:\s+\w+=(?:\[[^\]]*\]|\S+))*)\s*$/);
  if (!m) throw new Error(`Unparsed line: ${line}`);
  const kv = Object.fromEntries([...m[4].matchAll(/(\w+)=(\[[^\]]*\]|\S+)/g)].map((x) => [x[1], x[2]]));
  const node = {
    id: `n${nextId++}`, branch: m[1], kind: m[2], rule: m[3] ? pretty(m[3]) : "",
    samples: Number(kv.samples), value: kv.value.slice(1, -1).split(",").map(Number),
    impurity: Number(kv[impurity]), cls: kv.class, children: [],
  };
  while (stack.length && stack.at(-1).indent >= indent) stack.pop();
  if (stack.length) { node.parent = stack.at(-1).node; node.parent.children.push(node); } else root = node;
  stack.push({ node, indent });
}
if (impurity !== "gini") throw new Error(`Only gini is drawn here, got ${impurity}`);
for (const c of classes) if (!CLASS[c]) throw new Error(`No colour for class ${c}`);

/* ---------- number checks ---------- */
const all = [];
(function walk(n, d) { n.depth = d; all.push(n); n.children.forEach((c) => walk(c, d + 1)); })(root, 0);
const sum = (v) => v.reduce((a, b) => a + b, 0);
const gini = (v) => 1 - v.reduce((a, c) => a + (c / sum(v)) ** 2, 0);
const numberProblems = [];
for (const n of all) {
  if (n.value.length !== classes.length) numberProblems.push(`${n.id}: ${n.value.length} counts for ${classes.length} classes`);
  if (sum(n.value) !== n.samples) numberProblems.push(`${n.id}: samples ${n.samples} but counts sum to ${sum(n.value)}`);
  if (Math.abs(gini(n.value) - n.impurity) > 0.0005) numberProblems.push(`${n.id}: gini ${n.impurity} but counts give ${gini(n.value).toFixed(3)}`);
  n.major = n.value.indexOf(Math.max(...n.value));
  if (n.kind === "leaf") {
    if (n.children.length) numberProblems.push(`${n.id}: leaf with children`);
    if (n.cls !== classes[n.major]) numberProblems.push(`${n.id}: class ${n.cls} but majority is ${classes[n.major]}`);
  } else {
    const [t, f] = n.children;
    if (n.children.length !== 2 || t.branch !== "true" || f.branch !== "false") numberProblems.push(`${n.id}: a split needs a true child then a false child`);
    else {
      n.value.forEach((v, i) => { if (t.value[i] + f.value[i] !== v) numberProblems.push(`${n.id}: class ${classes[i]} children ${t.value[i]}+${f.value[i]} != ${v}`); });
      const weighted = (t.samples * gini(t.value) + f.samples * gini(f.value)) / n.samples;
      if (weighted >= gini(n.value)) numberProblems.push(`${n.id}: split does not lower impurity`);
    }
  }
}
if (numberProblems.length) { for (const p of numberProblems) console.log("  " + p); throw new Error("source numbers are inconsistent"); }

/* ---------- layout ---------- */
const splits = all.filter((n) => n.kind === "split");
const leaves = all.filter((n) => n.kind === "leaf");
const sDepth = Math.max(...splits.map((s) => s.depth));
const rowTop = (d) => TOP + d * (SPLIT_H + GAP_V);
const share = (n) => Math.round((100 * n.samples) / root.samples);
const statsText = (n) => n.kind === "split"
  ? `${fmt(n.samples)} samples  ·  ${n === root ? "" : `${share(n)}% of all  ·  `}gini ${n.impurity.toFixed(2)}`
  : `${share(n)}% of all samples  ·  gini ${n.impurity.toFixed(2)}`;
const purityText = (n) => `${Math.round((100 * n.value[n.major]) / n.samples)}% of ${fmt(n.samples)} samples`;
const countsWidth = (n) => n.value.reduce((w, v, i) => w + CHIP + 4 + measure(fmt(v), T.count) + (i ? 12 : 0), 0);

for (const s of splits) {
  s.w = Math.max(NODE_MIN_W, measure(s.rule, T.rule) + 2 * PADX, measure(statsText(s), T.stats) + 2 * PADX, countsWidth(s) + 2 * PADX);
  s.h = SPLIT_H;
  s.y = rowTop(s.depth);
}
const LEAF_W = Math.max(NODE_MIN_W, ...leaves.map((a) => Math.max(measure(purityText(a), T.purity), measure(statsText(a), T.stats), countsWidth(a)) + 2 * PADX));
for (const a of leaves) { a.w = LEAF_W; a.h = LEAF_H; a.y = rowTop(sDepth + 1); }

// leaf x: spacing grows the higher the split that separates two neighbours
const ancestors = (n) => { const out = []; for (let p = n; p; p = p.parent) out.push(p); return out; };
let cursor = M, prev = null;
for (const a of leaves) {
  if (prev) {
    const up = new Set(ancestors(prev));
    const lca = ancestors(a).find((p) => up.has(p));
    cursor += LEAF_GAP + (sDepth - lca.depth) * GAP_PER_LEVEL;
  }
  a.x = cursor + LEAF_W / 2;
  cursor += LEAF_W;
  prev = a;
}
(function place(n) { if (!n.children.length) return; n.children.forEach(place); n.x = (n.children[0].x + n.children.at(-1).x) / 2; })(root);

/* ---------- drawing + collision registry ---------- */
const defs = [], g = [], texts = [], nodes = [], segs = [];
const text = (s, x, y, st, o = {}) => {
  const w = measure(s, st);
  const anchor = o.anchor ?? "middle";
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  texts.push({ s, owner: o.owner, box: { x0, y0: y - 0.74 * st.fs, x1: x0 + w, y1: y + 0.24 * st.fs } });
  g.push(`<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT}" font-size="${st.fs}" font-weight="${st.fw}"${st.ls ? ` letter-spacing="${st.ls}"` : ""} fill="${o.fill ?? INK}" text-anchor="${anchor}">${esc(s)}</text>`);
};
// Stacked class-mix bar, clipped to a rounded track.
let clipId = 0;
const bar = (n, x0, y0, w, owner) => {
  const id = `mix${clipId++}`;
  defs.push(`<clipPath id="${id}"><rect x="${n2(x0)}" y="${n2(y0)}" width="${n2(w)}" height="${BAR_H}" rx="${BAR_H / 2}"/></clipPath>`);
  const parts = [`<rect x="${n2(x0)}" y="${n2(y0)}" width="${n2(w)}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${BAR_TRACK}"/>`];
  let cx = x0;
  n.value.forEach((v, i) => {
    const sw = (v / n.samples) * w;
    if (sw > 0) parts.push(`<rect x="${n2(cx)}" y="${n2(y0)}" width="${n2(sw)}" height="${BAR_H}" fill="${CLASS[classes[i]].band}"/>`);
    cx += sw;
  });
  g.push(`<g clip-path="url(#${id})">${parts.join("")}</g>`);
  nodes.push({ id: `bar-${owner}`, of: owner, box: { x0, y0, x1: x0 + w, y1: y0 + BAR_H } });
};
// Class counts in class order, each after a chip of its class colour.
const counts = (n, cx, baseline, owner) => {
  let x = cx - countsWidth(n) / 2;
  n.value.forEach((v, i) => {
    const k = CLASS[classes[i]];
    if (i) x += 12;
    g.push(`<rect x="${n2(x)}" y="${n2(baseline - CHIP)}" width="${CHIP}" height="${CHIP}" rx="2" fill="${k.band}"${k.edge !== k.band ? ` stroke="${k.edge}" stroke-width="0.8"` : ""}/>`);
    x += CHIP + 4;
    text(fmt(v), x, baseline, T.count, { anchor: "start", owner });
    x += measure(fmt(v), T.count);
  });
};

// title, subtitle, legend
const W = Math.round(cursor + M);
text(title, M, 50, T.title, { anchor: "start", owner: "title" });
text(`Classification tree  ·  ${fmt(root.samples)} training samples  ·  Gini impurity  ·  depth ${sDepth + 1}`, M, 74, T.subtitle, { anchor: "start", fill: SLATE, owner: "subtitle" });
{
  let x = W - M;
  const y = 50;
  for (const c of [...classes].reverse()) {
    const label = cap(c);
    text(label, x, y, T.legend, { anchor: "end", fill: SLATE, owner: `legend-${c}` });
    x -= measure(label, T.legend) + 8;
    g.push(`<rect x="${n2(x - 12)}" y="${n2(y - 10)}" width="12" height="12" rx="3" fill="${CLASS[c].band}" stroke="${CLASS[c].edge}"/>`);
    nodes.push({ id: `legend-chip-${c}`, box: { x0: x - 12, y0: y - 10, x1: x, y1: y + 2 } });
    x -= 12 + 22;
  }
  const sLabel = "Split rule";
  text(sLabel, x, y, T.legend, { anchor: "end", fill: SLATE, owner: "legend-split" });
  x -= measure(sLabel, T.legend) + 8;
  g.push(`<rect x="${n2(x - 22)}" y="${n2(y - 10)}" width="22" height="12" rx="3" fill="${SPLIT_FILL}" stroke="${LINE}" stroke-width="1.2"/>`);
  nodes.push({ id: "legend-split-chip", box: { x0: x - 22, y0: y - 10, x1: x, y1: y + 2 } });

  // second row: how to read a node
  const y2 = 74;
  const key = "Bar: class mix of the training samples in the node";
  text(key, W - M, y2, T.legend, { anchor: "end", fill: SLATE, owner: "legend-bar" });
  const bx1 = W - M - measure(key, T.legend) - 8, bw = 40;
  const sample = { samples: root.samples, value: root.value };
  bar(sample, bx1 - bw, y2 - 8, bw, "legend");
}

// edges (drawn under nodes); the True branch is always the left one
const LINE_W = 1.5, ARROW_L = 8, ARROW_HW = 4.5;
for (const p of all) {
  if (!p.children.length) continue;
  const pb = p.y + p.h;
  const rail = pb + STEM;
  for (const c of p.children) {
    const dir = Math.sign(c.x - p.x);
    const tip = c.y, end = tip - ARROW_L;
    const d = `M${n2(p.x)},${n2(pb)} V${n2(rail - CORNER)} Q${n2(p.x)},${n2(rail)} ${n2(p.x + dir * CORNER)},${n2(rail)} H${n2(c.x - dir * CORNER)} Q${n2(c.x)},${n2(rail)} ${n2(c.x)},${n2(rail + CORNER)} V${n2(end)}`;
    g.push(`<path d="${d}" fill="none" stroke="${LINE}" stroke-width="${LINE_W}" stroke-linecap="round"/>`);
    g.push(`<polygon points="${n2(c.x)},${n2(tip)} ${n2(c.x - ARROW_HW)},${n2(end)} ${n2(c.x + ARROW_HW)},${n2(end)}" fill="${LINE}"/>`);
    const e = { parent: p.id, child: c.id };
    segs.push({ ...e, a: [p.x, pb], b: [p.x, rail] }, { ...e, a: [p.x, rail], b: [c.x, rail] }, { ...e, a: [c.x, rail], b: [c.x, tip] });
    const label = c.branch === "true" ? "True" : "False";
    text(label, c.x + dir * 7, rail + 23, T.branch, { anchor: dir < 0 ? "end" : "start", owner: `branch-${c.id}` });
  }
}

// split nodes: rule, stats, class-mix bar, counts
for (const s of splits) {
  const x0 = s.x - s.w / 2, y0 = s.y;
  g.push(`<rect x="${n2(x0)}" y="${n2(y0)}" width="${n2(s.w)}" height="${s.h}" rx="${R}" fill="${SPLIT_FILL}" stroke="${LINE}" stroke-width="1.5"/>`);
  nodes.push({ id: s.id, box: { x0, y0, x1: x0 + s.w, y1: y0 + s.h } });
  text(s.rule, s.x, y0 + 23, T.rule, { owner: s.id });
  text(statsText(s), s.x, y0 + 42, T.stats, { fill: SLATE, owner: s.id });
  bar(s, x0 + PADX, y0 + 52, s.w - 2 * PADX, s.id);
  counts(s, s.x, y0 + 76, s.id);
}

// leaf cards: coloured header names the predicted class; the first body line says how strongly
for (const a of leaves) {
  const k = CLASS[a.cls];
  const x0 = a.x - a.w / 2, y0 = a.y;
  g.push(`<rect x="${n2(x0)}" y="${n2(y0)}" width="${n2(a.w)}" height="${a.h}" rx="${R}" fill="${k.tint}" stroke="${k.edge}" stroke-width="1.5"/>`);
  g.push(`<path d="M${n2(x0)},${n2(y0 + BAND_H)} V${n2(y0 + R)} Q${n2(x0)},${n2(y0)} ${n2(x0 + R)},${n2(y0)} H${n2(x0 + a.w - R)} Q${n2(x0 + a.w)},${n2(y0)} ${n2(x0 + a.w)},${n2(y0 + R)} V${n2(y0 + BAND_H)} Z" fill="${k.band}"/>`);
  nodes.push({ id: a.id, box: { x0, y0, x1: x0 + a.w, y1: y0 + a.h } });
  text(a.cls.toUpperCase(), a.x, y0 + 15, T.tag, { fill: k.on, owner: a.id });
  const body = y0 + BAND_H;
  text(purityText(a), a.x, body + 22, T.purity, { owner: a.id });
  text(statsText(a), a.x, body + 41, T.stats, { fill: SLATE, owner: a.id });
  bar(a, x0 + PADX, body + 51, a.w - 2 * PADX, a.id);
  counts(a, a.x, body + 75, a.id);
}

const H = Math.round(Math.max(...leaves.map((a) => a.y + a.h)) + M);

/* ---------- collision check ---------- */
const hit = (a, b, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
const segBox = (s, pad) => ({ x0: Math.min(s.a[0], s.b[0]) - pad, y0: Math.min(s.a[1], s.b[1]) - pad, x1: Math.max(s.a[0], s.b[0]) + pad, y1: Math.max(s.a[1], s.b[1]) + pad });
const problems = [];
for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++)
  if (hit(texts[i].box, texts[j].box, 1)) problems.push(`text/text: "${texts[i].s}" x "${texts[j].s}"`);
for (const t of texts) {
  for (const s of segs) if (hit(t.box, segBox(s, 2))) problems.push(`text/edge: "${t.s}" x ${s.parent}->${s.child}`);
  const own = nodes.find((n) => n.id === t.owner);
  for (const n of nodes) {
    if (n.id === t.owner) continue;
    // a node's own bar sits inside it; its text must still clear the bar
    if (n.of === t.owner ? hit(t.box, n.box, 1) : hit(t.box, n.box, 2)) problems.push(`text/node: "${t.s}" x ${n.id}`);
  }
  if (own && (t.box.x0 < own.box.x0 + 6 || t.box.x1 > own.box.x1 - 6 || t.box.y0 < own.box.y0 + 3 || t.box.y1 > own.box.y1 - 3)) problems.push(`text outside its node: "${t.s}"`);
  const { x0, y0, x1, y1 } = t.box;
  if (x0 < 8 || y0 < 8 || x1 > W - 8 || y1 > H - 8) problems.push(`text off canvas: "${t.s}"`);
}
for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
  const a = nodes[i], b = nodes[j];
  if (a.of === b.id || b.of === a.id) continue;
  if (hit(a.box, b.box, 8)) problems.push(`node/node: ${a.id} x ${b.id}`);
}
for (const s of segs) for (const n of nodes) {
  if (n.id === s.parent || n.id === s.child || n.of === s.parent || n.of === s.child) continue;
  if (hit(segBox(s, 0), { x0: n.box.x0 - 2, y0: n.box.y0 - 2, x1: n.box.x1 + 2, y1: n.box.y1 + 2 })) problems.push(`edge/node: ${s.parent}->${s.child} x ${n.id}`);
}
for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
  const a = segs[i], b = segs[j];
  if (a.parent === b.parent) continue;
  if (a.child === b.parent || b.child === a.parent) continue;
  if (hit(segBox(a, 0), segBox(b, 0), 0.5)) problems.push(`edge/edge: ${a.parent}->${a.child} x ${b.parent}->${b.child}`);
}

/* ---------- write ---------- */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(title)}</title>
<desc>Classification tree trained on ${fmt(root.samples)} samples: ${splits.length} splits lead to ${leaves.length} leaves, each coloured by its predicted class (${classes.join(", ")}). Every node shows its sample count, Gini impurity and class mix; the True branch of each split is on the left.</desc>
<defs>${defs.join("")}</defs>
<rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER}"/>
${g.join("\n")}
</svg>
`;
console.log(`canvas ${W}x${H}; ${splits.length} splits, ${leaves.length} leaves; number checks passed; collisions: ${problems.length}`);
for (const p of problems) console.log("  " + p);
if (problems.length) process.exit(1);
await writeFile(new URL("ideal.svg", DIR), svg);
console.log("wrote ideal.svg");
