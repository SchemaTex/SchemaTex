/** Draw visual-eval/exemplars/decisiontree/decision/ideal.svg — the look a decision-analysis tree aims at.
 *
 *   node scripts/visual-eval/draw-decisiontree-decision-exemplar.mjs
 *
 * Reads the exemplar's own source.sx, so the drawing can never say more or less
 * than the DSL. The tree is rolled back here from the source numbers (chance node
 * = probability-weighted mean, decision node = best child), so every expected
 * value on the page is computed, never typed. Decision squares, chance circles and
 * payoff triangles follow Raiffa / Clemen & Reilly / TreeAge; the best strategy is
 * drawn in green and every rejected decision branch carries a double hash mark.
 * Text is measured with resvg, the renderer the eval rasterises with; nothing is
 * written until every label, node, edge and the canvas edge have been checked.
 */
import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const DIR = new URL("../../visual-eval/exemplars/decisiontree/decision/", import.meta.url);
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

/* ---------- palette (shared with the taxonomy exemplar) ---------- */
const INK = "#1F2933", SLATE = "#52606D", LINE = "#3E4C59", PAPER = "#FFFFFF";
const NODE_FILL = "#F0F4F8";          // taxonomy question fill
const BEST = "#2B7A4B";               // taxonomy "routine" green: the recommended strategy
const BEST_TINT = "#EAF5EE";
const MUTED_EDGE = "#9AA5B1";         // outline of off-strategy value boxes

/* ---------- type scale ---------- */
const T = {
  title:    { fs: 20, fw: 600 },
  subtitle: { fs: 12.5, fw: 400 },
  branch:   { fs: 12, fw: 500 },
  prob:     { fs: 11, fw: 400 },
  ev:       { fs: 11.5, fw: 700 },
  payoff:   { fs: 12.5, fw: 600 },
  node:     { fs: 11, fw: 400 },
  header:   { fs: 10, fw: 700, ls: 1 },
  legend:   { fs: 11.5, fw: 400 },
};

/* ---------- geometry ---------- */
const M = 40;                          // canvas margin
const TOP = 172;                       // y of the first payoff branch
const SQ = 24, R = 12, TRI_W = 13, TRI_H = 16;
const STEM_MIN = 22, CORNER = 6;
const PITCH = 48, GAP_PER_LEVEL = 14;  // sibling pitch; extra gap per level of separation
const PAD = 10, HASH_SPACE = 26;       // label inset from the rail; room for the rejection hash
const EV_PX = 6, EV_H = 19, EV_GAP = 5;
const PAYOFF_GAP = 12;

const n2 = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const MINUS = "−";

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

/* ---------- money and probability formats ---------- */
// Payoffs in $ millions with the fewest decimals that stay exact; expected values always one decimal.
function money(v, fixed) {
  const m = Math.abs(v) / 1e6;
  let body;
  if (m === 0) body = "$0";
  else if (fixed !== undefined) body = `$${m.toFixed(fixed)}M`;
  else body = `$${Number.isInteger(m) ? m : Number.isInteger(m * 10) ? m.toFixed(1) : m.toFixed(2)}M`;
  return (v < -1e-9 ? MINUS : "") + body;
}
const prob = (p) => `p = ${p.toFixed(2)}`;

/* ---------- parse source.sx (decision subset, same grammar as the engine) ---------- */
const src = await readFile(new URL("source.sx", DIR), "utf8");
let title = "";
let root = null, nextId = 0;
const stack = [];
for (const raw of src.split("\n")) {
  if (!raw.trim() || /^\s*(%%|#|\/\/)/.test(raw)) continue;
  const indent = raw.match(/^ */)[0].length;
  let line = raw.trim();
  let m;
  if ((m = line.match(/^decisiontree:(?:decision|da)\s+"([^"]*)"\s*$/))) { title = m[1]; continue; }
  const node = { id: `n${nextId++}`, children: [] };
  if ((m = line.match(/^choice\s+"([^"]*)"\s*(.*)$/))) { node.choice = m[1]; line = m[2]; }
  else if ((m = line.match(/^prob\s+([0-9.]+)\s+(.*)$/))) { node.prob = Number(m[1]); line = m[2]; }
  if (line === "") node.wrapper = true;
  else {
    m = line.match(/^(decision|chance|end|outcome)\b(.*)$/);
    if (!m) throw new Error(`Unparsed line: ${raw.trim()}`);
    node.kind = m[1] === "outcome" ? "end" : m[1];
    const rest = m[2];
    const label = rest.match(/"([^"]*)"/);
    node.label = label ? label[1] : "";
    const pay = rest.match(/payoff=(-?[0-9.]+)/);
    if (pay) node.payoff = Number(pay[1]);
    if (node.kind === "end" && node.payoff === undefined) throw new Error(`Payoff missing: ${raw.trim()}`);
  }
  while (stack.length && stack.at(-1).indent >= indent) stack.pop();
  if (stack.length) { node.parent = stack.at(-1).node; node.parent.children.push(node); } else root = node;
  stack.push({ node, indent });
}
// A bare `choice "X"` line wraps the node indented under it.
(function collapse(n) {
  n.children = n.children.flatMap((c) => {
    collapse(c);
    if (!c.wrapper) return [c];
    if (c.children.length !== 1) throw new Error(`choice "${c.choice}" must wrap exactly one node`);
    const only = c.children[0];
    only.choice = c.choice;
    return [only];
  });
  for (const c of n.children) c.parent = n;
})(root);

/* ---------- roll back ---------- */
function rollback(n) {
  n.children.forEach(rollback);
  if (n.kind === "end") { n.ev = n.payoff; return; }
  if (n.kind === "chance") {
    const sum = n.children.reduce((a, c) => a + c.prob, 0);
    if (Math.abs(sum - 1) > 1e-9) throw new Error(`Probabilities under "${n.label}" sum to ${sum}`);
    if (n.children.some((c) => c.prob === undefined)) throw new Error(`Chance branch without probability under "${n.label}"`);
    n.ev = n.children.reduce((a, c) => a + c.prob * c.ev, 0);
    return;
  }
  if (n.children.some((c) => c.choice === undefined)) throw new Error(`Decision branch without a choice under "${n.label}"`);
  n.best = n.children.reduce((b, c) => (c.ev > b.ev + 1e-9 ? c : b));
  n.ev = n.best.ev;
}
rollback(root);
// The recommended strategy: the best choice at every decision it reaches, every outcome of every chance node.
(function mark(n) {
  n.onPath = true;
  const next = n.kind === "decision" ? [n.best] : n.children;
  next.forEach(mark);
})(root);

/* ---------- layout ---------- */
const all = [];
(function walk(n, d) { n.depth = d; all.push(n); n.children.forEach((c) => walk(c, d + 1)); })(root, 0);
const inner = all.filter((n) => n.kind !== "end");
const leaves = all.filter((n) => n.kind === "end");

// text carried by each node and branch
for (const n of all) {
  n.halfW = n.kind === "decision" ? SQ / 2 : n.kind === "chance" ? R : 0;
  n.halfH = n.kind === "decision" ? SQ / 2 : n.kind === "chance" ? R : TRI_H / 2;
  // Node name under the node: the root's label, or the label of a node reached by a choice.
  // A node reached from a chance node is named by its branch instead.
  n.name = n.kind !== "end" && (n === root || n.choice !== undefined) ? n.label : "";
  n.branchName = n.parent ? (n.parent.kind === "decision" ? n.choice : n.label) : "";
  n.rejected = n.parent?.kind === "decision" && n.parent.best !== n;
  n.evText = n.kind === "end" ? "" : money(n.ev, 1);
  n.evW = n.kind === "end" ? 0 : measure(n.evText, T.ev) + 2 * EV_PX;
  n.nameW = n.name ? measure(n.name, T.node) : 0;
  // how far left of its centre the node's own drawing reaches (shape, value box, name)
  n.reserve = n.kind === "end" ? 0 : Math.max(n.halfW, n.evW / 2, n.nameW / 2) + 8;
  // stem long enough that the rail clears the node's name and value box
  n.stem = n.kind === "end" ? 0 : Math.max(STEM_MIN, Math.max(n.evW, n.nameW) / 2 - n.halfW + 8);
}
const branchNeed = (c) =>
  (c.rejected ? HASH_SPACE : 0) + PAD + Math.max(measure(c.branchName, T.branch), c.prob !== undefined ? measure(prob(c.prob), T.prob) : 0) + PAD + c.reserve;

// x: one column per depth for decisions and chances; every payoff triangle in one column at the right
const maxInnerDepth = Math.max(...inner.map((n) => n.depth));
const colX = [M + root.reserve];
for (let d = 1; d <= maxInnerDepth; d++) {
  const need = inner.filter((c) => c.depth === d).map((c) => colX[d - 1] + c.parent.halfW + c.parent.stem + branchNeed(c));
  colX[d] = Math.max(...need);
}
for (const n of inner) n.x = colX[n.depth];
const triX = Math.max(...leaves.map((c) => c.parent.x + c.parent.halfW + c.parent.stem + branchNeed(c)));
for (const n of leaves) n.x = triX;

// y: payoffs top to bottom, the gap growing with how high up the split between neighbours is
const ancestors = (n) => { const out = []; for (let p = n; p; p = p.parent) out.push(p); return out; };
let cursor = TOP, prev = null;
for (const a of leaves) {
  if (prev) {
    const up = new Set(ancestors(prev));
    const lca = ancestors(a).find((p) => up.has(p));
    const sepLevels = Math.min(prev.depth, a.depth) - lca.depth - 1;
    cursor += PITCH + Math.max(0, sepLevels) * GAP_PER_LEVEL;
  }
  a.y = cursor;
  prev = a;
}
(function place(n) { if (!n.children.length) return; n.children.forEach(place); n.y = (n.children[0].y + n.children.at(-1).y) / 2; })(root);

/* ---------- drawing + collision registry ---------- */
const layers = { edgesOff: [], edgesBest: [], marks: [], nodes: [], text: [] };
const texts = [], nodes = [], segs = [];
const text = (s, x, y, st, o = {}) => {
  const w = measure(s, st);
  const anchor = o.anchor ?? "middle";
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  texts.push({ s, owner: o.owner, box: { x0, y0: y - 0.74 * st.fs, x1: x0 + w, y1: y + 0.24 * st.fs } });
  layers.text.push(`<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT}" font-size="${st.fs}" font-weight="${st.fw}"${st.ls ? ` letter-spacing="${st.ls}"` : ""} fill="${o.fill ?? INK}" text-anchor="${anchor}">${esc(s)}</text>`);
};

/* edges: parent edge -> stem -> rail -> branch; branch name above, probability below */
for (const p of inner) {
  const px = p.x + p.halfW, railX = p.x + p.halfW + p.stem;
  for (const c of p.children) {
    const best = p.onPath && c.onPath;
    const cy = c.y, py = p.y, cx = c.x - c.halfW;   // a triangle's apex sits on its centre line
    const dy = Math.sign(cy - py);
    const d = dy === 0
      ? `M${n2(px)},${n2(py)} H${n2(cx)}`
      : `M${n2(px)},${n2(py)} H${n2(railX - CORNER)} Q${n2(railX)},${n2(py)} ${n2(railX)},${n2(py + dy * CORNER)} V${n2(cy - dy * CORNER)} Q${n2(railX)},${n2(cy)} ${n2(railX + CORNER)},${n2(cy)} H${n2(cx)}`;
    (best ? layers.edgesBest : layers.edgesOff).push(
      `<path d="${d}" fill="none" stroke="${best ? BEST : LINE}" stroke-width="${best ? 2.5 : 1.5}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
    const e = { parent: p.id, child: c.id };
    segs.push({ ...e, a: [px, py], b: [railX, py] }, { ...e, a: [railX, py], b: [railX, cy] }, { ...e, a: [railX, cy], b: [cx, cy] });

    let labelX = railX + PAD;
    if (c.rejected) {
      // double hash across the rejected decision branch, just past the rail
      const hx = railX + 17;
      for (const off of [-2.5, 2.5]) {
        const a = [hx + off - 3, cy + 6], b = [hx + off + 3, cy - 6];
        layers.marks.push(`<line x1="${n2(a[0])}" y1="${n2(a[1])}" x2="${n2(b[0])}" y2="${n2(b[1])}" stroke="${LINE}" stroke-width="1.75" stroke-linecap="round"/>`);
        segs.push({ ...e, hash: true, a, b });
      }
      labelX += HASH_SPACE;
    }
    text(c.branchName, labelX, cy - 6, T.branch, { anchor: "start", owner: `branch-${c.id}` });
    if (c.prob !== undefined) text(prob(c.prob), labelX, cy + 15, T.prob, { anchor: "start", fill: SLATE, owner: `branch-${c.id}` });
  }
}

/* decision squares and chance circles, each with its rolled-back value above and its name below */
for (const n of inner) {
  const stroke = n.onPath ? BEST : LINE;
  if (n.kind === "decision") {
    layers.nodes.push(`<rect x="${n2(n.x - SQ / 2)}" y="${n2(n.y - SQ / 2)}" width="${SQ}" height="${SQ}" rx="2" fill="${NODE_FILL}" stroke="${LINE}" stroke-width="1.75"/>`);
  } else {
    layers.nodes.push(`<circle cx="${n2(n.x)}" cy="${n2(n.y)}" r="${R}" fill="${NODE_FILL}" stroke="${LINE}" stroke-width="1.75"/>`);
  }
  nodes.push({ id: n.id, box: { x0: n.x - n.halfW, y0: n.y - n.halfH, x1: n.x + n.halfW, y1: n.y + n.halfH } });
  const by1 = n.y - n.halfH - EV_GAP, by0 = by1 - EV_H, bx0 = n.x - n.evW / 2;
  layers.nodes.push(`<rect x="${n2(bx0)}" y="${n2(by0)}" width="${n2(n.evW)}" height="${EV_H}" rx="4" fill="${n.onPath ? BEST_TINT : PAPER}" stroke="${n.onPath ? stroke : MUTED_EDGE}" stroke-width="1.25"/>`);
  nodes.push({ id: `ev-${n.id}`, of: n.id, box: { x0: bx0, y0: by0, x1: bx0 + n.evW, y1: by1 } });
  text(n.evText, n.x, by1 - 5.2, T.ev, { owner: `ev-${n.id}` });
  if (n.name) text(n.name, n.x, n.y + n.halfH + 14, T.node, { fill: SLATE, owner: `name-${n.id}` });
}

/* payoff triangles (apex toward the tree) and the payoff column */
const payoffRight = triX + TRI_W + PAYOFF_GAP + Math.max(...leaves.map((a) => measure(money(a.payoff), T.payoff)));
for (const a of leaves) {
  const pts = [[a.x, a.y], [a.x + TRI_W, a.y - TRI_H / 2], [a.x + TRI_W, a.y + TRI_H / 2]];
  layers.nodes.push(`<polygon points="${pts.map((p) => p.map(n2).join(",")).join(" ")}" fill="${NODE_FILL}" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/>`);
  nodes.push({ id: a.id, box: { x0: a.x, y0: a.y - TRI_H / 2, x1: a.x + TRI_W, y1: a.y + TRI_H / 2 } });
  text(money(a.payoff), payoffRight, a.y + 4.4, T.payoff, { anchor: "end", owner: `pay-${a.id}` });
}
text("PAYOFF", payoffRight, TOP - 34, T.header, { anchor: "end", fill: SLATE, owner: "header" });

const W = Math.round(payoffRight + M);
const H = Math.round(leaves.at(-1).y + TRI_H / 2 + M + 8);

/* title, derived one-line result, legend */
text(title, M, 50, T.title, { anchor: "start", owner: "title" });
{
  const clauses = [];
  (function describe(n, cond) {
    if (n.kind === "decision") {
      clauses.push(cond ? `if ${cond.toLowerCase()}, ${n.best.choice.toLowerCase()}` : n.best.choice.toLowerCase());
      describe(n.best, null);
    } else if (n.kind === "chance") {
      n.children.forEach((c) => describe(c, c.label));
    }
  })(root, null);
  const lead = clauses[0][0].toUpperCase() + clauses[0].slice(1);
  const sentence = `Best strategy: ${[lead, ...clauses.slice(1)].join("; ")}. Expected value ${money(root.ev, 1)}.`;
  text(sentence, M, 74, T.subtitle, { anchor: "start", fill: SLATE, owner: "subtitle" });
}
{
  const y = 104;
  const items = [];
  const sw = 14;
  items.push({ label: "Decision", w: sw, draw: (x) => `<rect x="${n2(x)}" y="${n2(y - 11)}" width="12" height="12" rx="1.5" fill="${NODE_FILL}" stroke="${LINE}" stroke-width="1.5"/>`, box: (x) => ({ x0: x, y0: y - 11, x1: x + 12, y1: y + 1 }) });
  items.push({ label: "Chance", w: sw, draw: (x) => `<circle cx="${n2(x + 6.5)}" cy="${n2(y - 5)}" r="6.5" fill="${NODE_FILL}" stroke="${LINE}" stroke-width="1.5"/>`, box: (x) => ({ x0: x, y0: y - 11.5, x1: x + 13, y1: y + 1.5 }) });
  items.push({ label: "Payoff", w: 11, draw: (x) => `<polygon points="${n2(x)},${n2(y - 5)} ${n2(x + 11)},${n2(y - 12)} ${n2(x + 11)},${n2(y + 2)}" fill="${NODE_FILL}" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/>`, box: (x) => ({ x0: x, y0: y - 12, x1: x + 11, y1: y + 2 }) });
  const evW = measure("$", T.ev) + 2 * EV_PX + 8;
  items.push({ label: "Expected value", w: evW, draw: (x) => `<rect x="${n2(x)}" y="${n2(y - 13)}" width="${n2(evW)}" height="16" rx="3.5" fill="${PAPER}" stroke="${MUTED_EDGE}" stroke-width="1.25"/>`, box: (x) => ({ x0: x, y0: y - 13, x1: x + evW, y1: y + 3 }) });
  items.push({ label: "Best strategy", w: 24, draw: (x) => `<line x1="${n2(x)}" y1="${n2(y - 5)}" x2="${n2(x + 24)}" y2="${n2(y - 5)}" stroke="${BEST}" stroke-width="2.5" stroke-linecap="round"/>`, box: (x) => ({ x0: x, y0: y - 7, x1: x + 24, y1: y - 3 }) });
  items.push({ label: "Rejected option", w: 24, draw: (x) => `<line x1="${n2(x)}" y1="${n2(y - 5)}" x2="${n2(x + 24)}" y2="${n2(y - 5)}" stroke="${LINE}" stroke-width="1.5" stroke-linecap="round"/>` + [-2.5, 2.5].map((o) => `<line x1="${n2(x + 12 + o - 2.5)}" y1="${n2(y)}" x2="${n2(x + 12 + o + 2.5)}" y2="${n2(y - 10)}" stroke="${LINE}" stroke-width="1.5" stroke-linecap="round"/>`).join(""), box: (x) => ({ x0: x, y0: y - 10, x1: x + 24, y1: y }) });
  let x = W - M;
  for (const it of [...items].reverse()) {
    const lw = measure(it.label, T.legend);
    text(it.label, x, y, T.legend, { anchor: "end", fill: SLATE, owner: `legend-${it.label}` });
    x -= lw + 7 + it.w;
    // the value-box swatch carries a "$" so it reads as a number box
    layers.nodes.push(it.draw(x));
    nodes.push({ id: `legend-${it.label}-mark`, box: it.box(x) });
    if (it.label === "Expected value") text("$", x + evW / 2, y - 0.8, T.ev, { owner: `legend-${it.label}-mark` });
    x -= 20;
  }
}

/* ---------- collision check ---------- */
const hit = (a, b, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
const segBox = (s, pad) => ({ x0: Math.min(s.a[0], s.b[0]) - pad, y0: Math.min(s.a[1], s.b[1]) - pad, x1: Math.max(s.a[0], s.b[0]) + pad, y1: Math.max(s.a[1], s.b[1]) + pad });
const problems = [];
for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++)
  if (hit(texts[i].box, texts[j].box, 2)) problems.push(`text/text: "${texts[i].s}" x "${texts[j].s}"`);
for (const t of texts) {
  for (const s of segs) if (hit(t.box, segBox(s, 2))) problems.push(`text/edge: "${t.s}" x ${s.parent}->${s.child}${s.hash ? " (hash)" : ""}`);
  for (const n of nodes) if (n.id !== t.owner && hit(t.box, n.box, 2)) problems.push(`text/node: "${t.s}" x ${n.id}`);
  const own = nodes.find((n) => n.id === t.owner);
  if (own && (t.box.x0 < own.box.x0 + 2 || t.box.x1 > own.box.x1 - 2)) problems.push(`text wider than its box: "${t.s}"`);
  const { x0, y0, x1, y1 } = t.box;
  if (x0 < M - 1 || y0 < 8 || x1 > W - M + 1 || y1 > H - 8) problems.push(`text off canvas: "${t.s}"`);
}
for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
  const a = nodes[i], b = nodes[j];
  if (a.of === b.id || b.of === a.id) continue;
  if (hit(a.box, b.box, 4)) problems.push(`node/node: ${a.id} x ${b.id}`);
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
const nD = all.filter((n) => n.kind === "decision").length, nC = all.filter((n) => n.kind === "chance").length;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(title)}</title>
<desc>Decision tree rolled back to expected value: ${nD} decisions, ${nC} chance events and ${leaves.length} payoffs. The best strategy is drawn in green (expected value ${money(root.ev, 1)}); rejected options are struck with a double hash.</desc>
<rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER}"/>
${[...layers.edgesOff, ...layers.edgesBest, ...layers.marks, ...layers.nodes, ...layers.text].join("\n")}
</svg>
`;
console.log(`canvas ${W}x${H}; ${nD} decisions, ${nC} chances, ${leaves.length} payoffs; root EV ${root.ev}; collisions: ${problems.length}`);
for (const n of inner) console.log(`  EV ${n.kind.padEnd(8)} ${(n.branchName || n.label).padEnd(14)} ${n.ev}`);
for (const p of problems) console.log("  " + p);
if (problems.length) process.exit(1);
await writeFile(new URL("ideal.svg", DIR), svg);
console.log("wrote ideal.svg");
