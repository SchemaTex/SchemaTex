/** Draw visual-eval/exemplars/decisiontree/influence/ideal.svg — the look an influence diagram aims at.
 *
 *   node scripts/visual-eval/draw-decisiontree-influence-exemplar.mjs
 *
 * Reads the exemplar's own source.sx, so the drawing can never say more or less
 * than the DSL. Shapes follow Howard & Matheson: decision = rectangle,
 * uncertainty = oval, deterministic = double oval, value = octagon. Arcs are
 * straight; an arc into a decision is dashed because it means "known before
 * deciding". Decisions carry their order as a step badge, derived from the arcs.
 *
 * The drawing shares the question-tree exemplar's font stack, type scale, ink,
 * line colour, title and legend treatment
 * (scripts/visual-eval/draw-decisiontree-taxonomy-exemplar.mjs).
 *
 * Node placement is the hand-drawn part: PLACE puts each node on a column/row
 * grid. The script refuses to draw if the source and PLACE disagree, and nothing
 * is written until every label, node, arc, arrowhead and the canvas edge have
 * been checked.
 */
import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const DIR = new URL("../../visual-eval/exemplars/decisiontree/influence/", import.meta.url);
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

/* ---------- palette (shared with the question-tree exemplar) ---------- */
const INK = "#1F2933", SLATE = "#52606D", LINE = "#3E4C59", PAPER = "#FFFFFF";
const DECISION_FILL = "#DDE5ED"; // one step darker than the question tree's #F0F4F8
const UNCERTAIN_FILL = PAPER;
const VALUE_FILL = LINE;         // the objective is the one dark node; white text on it

/* ---------- type scale (shared) ---------- */
const T = {
  title:    { fs: 20, fw: 600 },
  decision: { fs: 13, fw: 600 },
  node:     { fs: 13, fw: 400 },
  value:    { fs: 13, fw: 600 },
  badge:    { fs: 10, fw: 700 },
  legend:   { fs: 11.5, fw: 400 },
};

/* ---------- geometry ---------- */
const M = 40;                  // canvas margin
const TOP = 124;               // centre of grid row 0
const COL_W = 212;             // centre-to-centre distance between grid columns
const ROW_Y = [0, 185, 330, 475]; // grid row offsets from TOP; fractional rows interpolate
const NODE_H = 56;
const RECT_PADX = 22, OVAL_PADX = 12, OCT_PADX = 30, OCT_CUT = 16, DOUBLE_GAP = 4;
const ARROW_L = 8, ARROW_HW = 4.5, BADGE_R = 9, DASH = "6 4";
const CLEAR_ARC_NODE = 10;     // an arc may not come closer than this to a node it does not touch
const NEAR = 24;               // two arcs sharing a node must still be apart this far out from it

/* Hand placement: [column, row]. Rules the placement follows are in notes.md. */
const PLACE = {
  Launch:     [2, 0],    // decision 1 on the top line, straight above decision 2
  Cost:       [3, 1],
  Margin:     [4, 1],
  NPV:        [5, 1],    // level with its closest parent, at the right edge
  TestSales:  [1, 2],
  Price:      [2, 2],
  Competitor: [3, 2],
  Market:     [0, 3],    // the root uncertainty, bottom left
  Units:      [3.75, 3], // pulled left so its three incoming arcs fan out
};

const n2 = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- text measurement (resvg, same engine as the eval) ---------- */
const HELVETICA_NEUE = "/System/Library/Fonts/HelveticaNeue.ttc";
const MEASURE_FONT = await readFile(HELVETICA_NEUE).then(
  () => ({ fontFiles: [HELVETICA_NEUE], loadSystemFonts: false, defaultFontFamily: "Helvetica Neue" }),
  () => ({ loadSystemFonts: true }),
);
const widths = new Map();
function measure(s, st) {
  const key = `${s}|${st.fs}|${st.fw}`;
  if (widths.has(key)) return widths.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="100"><text x="10" y="60" font-family="${FONT}" font-size="${st.fs}" font-weight="${st.fw}">${esc(s)}</text></svg>`;
  const b = new Resvg(svg, { font: MEASURE_FONT }).getBBox();
  const w = b ? b.x - 10 + b.width : s.length * st.fs * 0.56;
  widths.set(key, w);
  return w;
}

/* ---------- parse source.sx (influence subset) ---------- */
const src = await readFile(new URL("source.sx", DIR), "utf8");
let title = "";
const nodes = [], byId = new Map(), arcs = [];
for (const raw of src.split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#") || line.startsWith("//")) continue;
  let m;
  if ((m = line.match(/^decisiontree:influence\s+"([^"]*)"\s*$/))) { title = m[1]; continue; }
  if ((m = line.match(/^(decision|chance|value)\s+(\w+)\s+"([^"]*)"(\s+deterministic)?\s*$/))) {
    const kind = m[1] === "chance" ? (m[4] ? "deterministic" : "uncertainty") : m[1];
    const node = { id: m[2], kind, label: m[3] };
    nodes.push(node);
    byId.set(node.id, node);
    continue;
  }
  if ((m = line.match(/^(\w+)\s*->\s*(\w+)\s*$/))) { arcs.push({ from: m[1], to: m[2] }); continue; }
  throw new Error(`Unparsed line: ${line}`);
}
for (const a of arcs) {
  if (!byId.has(a.from) || !byId.has(a.to)) throw new Error(`Arc to an undeclared node: ${a.from} -> ${a.to}`);
  a.info = byId.get(a.to).kind === "decision";
}
for (const n of nodes) if (!PLACE[n.id]) throw new Error(`No placement for ${n.id}`);
for (const id of Object.keys(PLACE)) if (!byId.has(id)) throw new Error(`Placement for a node the source does not declare: ${id}`);

/* ---------- node sizes: one shared size per kind ---------- */
const style = (n) => (n.kind === "decision" ? T.decision : n.kind === "value" ? T.value : T.node);
const maxW = (kinds) => Math.max(...nodes.filter((n) => kinds.includes(n.kind)).map((n) => measure(n.label, style(n))));
const RECT_W = Math.ceil(maxW(["decision"]) + 2 * RECT_PADX);
// An oval holds its text box when (w/2)^2/a^2 + (h/2)^2/b^2 <= 1; h/2 = 9 px for 13 px text.
const INNER_B = NODE_H / 2 - DOUBLE_GAP;
const OVAL_A = Math.ceil((maxW(["uncertainty", "deterministic"]) / 2) / Math.sqrt(1 - (9 / INNER_B) ** 2) + OVAL_PADX + DOUBLE_GAP);
const OCT_W = Math.ceil(maxW(["value"]) + 2 * OCT_PADX);

const rowY = (r) => {
  const lo = Math.floor(r), hi = Math.ceil(r);
  return TOP + ROW_Y[lo] + (ROW_Y[hi] - ROW_Y[lo]) * (r - lo);
};
const X0 = M + Math.max(RECT_W, 2 * OVAL_A, OCT_W) / 2;
for (const n of nodes) {
  const [c, r] = PLACE[n.id];
  n.x = X0 + c * COL_W;
  n.y = rowY(r);
  n.w = n.kind === "decision" ? RECT_W : n.kind === "value" ? OCT_W : 2 * OVAL_A;
  n.h = NODE_H;
  if (n.kind === "value") {
    const x0 = n.x - n.w / 2, x1 = n.x + n.w / 2, y0 = n.y - n.h / 2, y1 = n.y + n.h / 2, k = OCT_CUT;
    n.poly = [[x0 + k, y0], [x1 - k, y0], [x1, y0 + k], [x1, y1 - k], [x1 - k, y1], [x0 + k, y1], [x0, y1 - k], [x0, y0 + k]];
  }
  n.box = { x0: n.x - n.w / 2, y0: n.y - n.h / 2, x1: n.x + n.w / 2, y1: n.y + n.h / 2 };
}

/* ---------- shape geometry ---------- */
// Signed distance-like test: is point p inside node n grown by pad?
function insideNode(n, p, pad) {
  const dx = p[0] - n.x, dy = p[1] - n.y;
  if (n.kind === "decision") return Math.abs(dx) < n.w / 2 + pad && Math.abs(dy) < n.h / 2 + pad;
  if (n.kind === "value") {
    return n.poly.every((a, i) => {
      const b = n.poly[(i + 1) % n.poly.length];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      return (ex * (p[1] - a[1]) - ey * (p[0] - a[0])) / Math.hypot(ex, ey) > -pad;
    });
  }
  return (dx / (n.w / 2 + pad)) ** 2 + (dy / (n.h / 2 + pad)) ** 2 < 1;
}
// Where the ray from the node centre towards (tx, ty) leaves the node outline.
function boundary(n, tx, ty) {
  const dx = tx - n.x, dy = ty - n.y, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  let lo = 0, hi = Math.max(n.w, n.h);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (insideNode(n, [n.x + ux * mid, n.y + uy * mid], 0)) lo = mid; else hi = mid;
  }
  return [n.x + ux * lo, n.y + uy * lo];
}

/* ---------- drawing + collision registry ---------- */
const g = [], texts = [], marks = [];
const text = (s, x, y, st, o = {}) => {
  const w = measure(s, st);
  const anchor = o.anchor ?? "middle";
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  texts.push({ s, owner: o.owner, box: { x0, y0: y - 0.74 * st.fs, x1: x0 + w, y1: y + 0.24 * st.fs } });
  g.push(`<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT}" font-size="${st.fs}" font-weight="${st.fw}" fill="${o.fill ?? INK}" text-anchor="${anchor}">${esc(s)}</text>`);
};
const pts = (poly) => poly.map((p) => p.map(n2).join(",")).join(" ");

const W = Math.round(Math.max(...nodes.map((n) => n.box.x1)) + M);
const H = Math.round(Math.max(...nodes.map((n) => n.box.y1)) + M);

// title
text(title, M, 50, T.title, { anchor: "start", owner: "title" });

// legend, right-aligned on the title line: four node kinds, then the two arc meanings
{
  const y = 50, gy0 = y - 11, gy1 = y + 3, gm = (gy0 + gy1) / 2;
  const items = [
    { label: "Decision", w: 22, draw: (x0, x1) => `<rect x="${n2(x0)}" y="${n2(gy0)}" width="${n2(x1 - x0)}" height="${n2(gy1 - gy0)}" fill="${DECISION_FILL}" stroke="${LINE}" stroke-width="1.2"/>` },
    { label: "Uncertainty", w: 24, draw: (x0, x1) => `<ellipse cx="${n2((x0 + x1) / 2)}" cy="${n2(gm)}" rx="${n2((x1 - x0) / 2)}" ry="${n2((gy1 - gy0) / 2)}" fill="${UNCERTAIN_FILL}" stroke="${LINE}" stroke-width="1.2"/>` },
    { label: "Deterministic", w: 24, draw: (x0, x1) => `<ellipse cx="${n2((x0 + x1) / 2)}" cy="${n2(gm)}" rx="${n2((x1 - x0) / 2)}" ry="${n2((gy1 - gy0) / 2)}" fill="${UNCERTAIN_FILL}" stroke="${LINE}" stroke-width="1.2"/><ellipse cx="${n2((x0 + x1) / 2)}" cy="${n2(gm)}" rx="${n2((x1 - x0) / 2 - 2.5)}" ry="${n2((gy1 - gy0) / 2 - 2.5)}" fill="none" stroke="${LINE}" stroke-width="1"/>` },
    { label: "Value", w: 22, draw: (x0, x1) => { const k = 4; return `<polygon points="${pts([[x0 + k, gy0], [x1 - k, gy0], [x1, gy0 + k], [x1, gy1 - k], [x1 - k, gy1], [x0 + k, gy1], [x0, gy1 - k], [x0, gy0 + k]])}" fill="${VALUE_FILL}" stroke="${LINE}" stroke-width="1.2"/>`; } },
    { label: "Known before deciding", w: 30, gap: 30, draw: (x0, x1) => `<line x1="${n2(x0)}" y1="${n2(gm)}" x2="${n2(x1 - 7)}" y2="${n2(gm)}" stroke="${LINE}" stroke-width="1.5" stroke-dasharray="4 3"/><polygon points="${pts([[x1, gm], [x1 - 7, gm - 4], [x1 - 7, gm + 4]])}" fill="${LINE}"/>` },
    { label: "Influences", w: 30, draw: (x0, x1) => `<line x1="${n2(x0)}" y1="${n2(gm)}" x2="${n2(x1 - 7)}" y2="${n2(gm)}" stroke="${LINE}" stroke-width="1.5"/><polygon points="${pts([[x1, gm], [x1 - 7, gm - 4], [x1 - 7, gm + 4]])}" fill="${LINE}"/>` },
  ];
  let x = W - M;
  for (const it of [...items].reverse()) {
    const lw = measure(it.label, T.legend);
    text(it.label, x, y, T.legend, { anchor: "end", fill: SLATE, owner: `legend-${it.label}` });
    x -= lw + 7;
    g.push(it.draw(x - it.w, x));
    marks.push({ id: `legend-glyph-${it.label}`, box: { x0: x - it.w, y0: gy0, x1: x, y1: gy1 } });
    x -= it.w + (it.gap ?? 20);
  }
}

// arcs (drawn under nodes): straight, from outline to outline, tip exactly on the target outline
const segs = [];
for (const a of arcs) {
  const f = byId.get(a.from), t = byId.get(a.to);
  const start = boundary(f, t.x, t.y);
  const tip = boundary(t, f.x, f.y);
  const len = Math.hypot(tip[0] - start[0], tip[1] - start[1]);
  const ux = (tip[0] - start[0]) / len, uy = (tip[1] - start[1]) / len;
  const end = [tip[0] - ux * ARROW_L, tip[1] - uy * ARROW_L];
  a.start = start; a.tip = tip; a.len = len;
  g.push(`<line x1="${n2(start[0])}" y1="${n2(start[1])}" x2="${n2(end[0])}" y2="${n2(end[1])}" stroke="${LINE}" stroke-width="1.5" stroke-linecap="${a.info ? "butt" : "round"}"${a.info ? ` stroke-dasharray="${DASH}"` : ""}/>`);
  g.push(`<polygon points="${pts([tip, [end[0] - uy * ARROW_HW, end[1] + ux * ARROW_HW], [end[0] + uy * ARROW_HW, end[1] - ux * ARROW_HW]])}" fill="${LINE}"/>`);
  segs.push({ from: a.from, to: a.to, a: start, b: tip });
}

// decision order: a decision comes after every decision that has a directed path to it
const children = new Map(nodes.map((n) => [n.id, arcs.filter((a) => a.from === n.id).map((a) => a.to)]));
const reaches = (from, to, seen = new Set()) => children.get(from).some((c) => c === to || (!seen.has(c) && (seen.add(c), reaches(c, to, seen))));
const decisions = nodes.filter((n) => n.kind === "decision");
decisions.sort((p, q) => (reaches(p.id, q.id) ? -1 : reaches(q.id, p.id) ? 1 : 0));
decisions.forEach((d, i) => { d.step = i + 1; });

// nodes
for (const n of nodes) {
  const { x0, y0, x1, y1 } = n.box;
  if (n.kind === "decision") {
    g.push(`<rect x="${n2(x0)}" y="${n2(y0)}" width="${n2(n.w)}" height="${n2(n.h)}" fill="${DECISION_FILL}" stroke="${LINE}" stroke-width="1.5"/>`);
  } else if (n.kind === "value") {
    g.push(`<polygon points="${pts(n.poly)}" fill="${VALUE_FILL}" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/>`);
  } else {
    g.push(`<ellipse cx="${n2(n.x)}" cy="${n2(n.y)}" rx="${n2(n.w / 2)}" ry="${n2(n.h / 2)}" fill="${UNCERTAIN_FILL}" stroke="${LINE}" stroke-width="1.5"/>`);
    if (n.kind === "deterministic")
      g.push(`<ellipse cx="${n2(n.x)}" cy="${n2(n.y)}" rx="${n2(n.w / 2 - DOUBLE_GAP)}" ry="${n2(n.h / 2 - DOUBLE_GAP)}" fill="none" stroke="${LINE}" stroke-width="1.2"/>`);
  }
  marks.push({ id: n.id, node: n, box: n.box });
  text(n.label, n.x, n.y + 4.5, style(n), { owner: n.id, fill: n.kind === "value" ? PAPER : INK });
  if (n.step) {
    g.push(`<circle cx="${n2(x0)}" cy="${n2(y0)}" r="${BADGE_R}" fill="${LINE}" stroke="${PAPER}" stroke-width="1.5"/>`);
    marks.push({ id: `badge-${n.id}`, of: n.id, box: { x0: x0 - BADGE_R, y0: y0 - BADGE_R, x1: x0 + BADGE_R, y1: y0 + BADGE_R } });
    text(String(n.step), x0, y0 + 3.6, T.badge, { fill: PAPER, owner: `badge-${n.id}` });
  }
}

/* ---------- checks ---------- */
const hit = (a, b, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
const problems = [];
const counts = { textText: 0, textArc: 0, textNode: 0, textEscapes: 0, nodeNode: 0, arcNode: 0, arcCross: 0, arcAngle: 0, tipTip: 0, badgeArc: 0, offCanvas: 0 };
const flag = (k, msg) => { counts[k]++; problems.push(msg); };

const segPts = (s, step = 1) => {
  const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), k = Math.ceil(len / step), out = [];
  for (let i = 0; i <= k; i++) out.push([s.a[0] + ((s.b[0] - s.a[0]) * i) / k, s.a[1] + ((s.b[1] - s.a[1]) * i) / k]);
  return out;
};
const inBox = (p, b, pad) => p[0] > b.x0 - pad && p[0] < b.x1 + pad && p[1] > b.y0 - pad && p[1] < b.y1 + pad;

// text against text, arcs, foreign nodes, its own node outline, canvas
for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++)
  if (hit(texts[i].box, texts[j].box, 2)) flag("textText", `text/text: "${texts[i].s}" x "${texts[j].s}"`);
for (const t of texts) {
  for (const s of segs) if (segPts(s).some((p) => inBox(p, t.box, 3))) flag("textArc", `text/arc: "${t.s}" x ${s.from}->${s.to}`);
  const own = marks.find((m) => m.id === t.owner);
  for (const m of marks) if (m.id !== t.owner && m.id !== own?.of && m.of !== t.owner && hit(t.box, m.box, 3)) flag("textNode", `text/node: "${t.s}" x ${m.id}`);
  if (own?.node) {
    const pad = own.node.kind === "deterministic" ? -(DOUBLE_GAP + 3) : -4;
    const { x0, y0, x1, y1 } = t.box;
    if (![[x0, y0], [x1, y0], [x0, y1], [x1, y1]].every((p) => insideNode(own.node, p, pad))) flag("textEscapes", `text escapes its node: "${t.s}"`);
  }
  const { x0, y0, x1, y1 } = t.box;
  if (x0 < 8 || y0 < 8 || x1 > W - 8 || y1 > H - 8) flag("offCanvas", `text off canvas: "${t.s}"`);
}
// node against node (and badges, legend glyphs)
for (let i = 0; i < marks.length; i++) for (let j = i + 1; j < marks.length; j++) {
  const a = marks[i], b = marks[j];
  if (a.of === b.id || b.of === a.id) continue;
  if (hit(a.box, b.box, 16)) flag("nodeNode", `node/node: ${a.id} x ${b.id}`);
}
// arc against every node it does not touch, exact outline grown by the clearance; badges too
let minArcNode = Infinity;
for (const s of segs) for (const n of nodes) {
  if (n.id === s.from || n.id === s.to) continue;
  const ps = segPts(s, 1);
  if (ps.some((p) => insideNode(n, p, CLEAR_ARC_NODE))) flag("arcNode", `arc/node: ${s.from}->${s.to} x ${n.id}`);
  let lo = 0, hi = 200; // largest pad the arc stays clear of
  for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (ps.some((p) => insideNode(n, p, mid))) hi = mid; else lo = mid; }
  minArcNode = Math.min(minArcNode, lo);
}
for (const s of segs) for (const m of marks) {
  if (!m.of) continue;
  if (segPts(s).some((p) => Math.hypot(p[0] - (m.box.x0 + BADGE_R), p[1] - (m.box.y0 + BADGE_R)) < BADGE_R + 4)) flag("badgeArc", `badge/arc: ${m.id} x ${s.from}->${s.to}`);
}
// arcs against each other: a proper crossing, or two arcs leaving/entering one node too close in angle
const cross = (p, q, r, s) => {
  const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return o(p, q, r) * o(p, q, s) < 0 && o(r, s, p) * o(r, s, q) < 0;
};
let minAngle = Infinity, minNearGap = Infinity;
for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
  const a = segs[i], b = segs[j];
  const shared = [a.from, a.to].find((id) => id === b.from || id === b.to);
  if (!shared) { if (cross(a.a, a.b, b.a, b.b)) flag("arcCross", `arc/arc: ${a.from}->${a.to} x ${b.from}->${b.to}`); continue; }
  const n = byId.get(shared);
  const dir = (s) => { const far = s.from === shared ? s.b : s.a; return Math.atan2(far[1] - n.y, far[0] - n.x); };
  let d = Math.abs(dir(a) - dir(b)); d = Math.min(d, 2 * Math.PI - d);
  minAngle = Math.min(minAngle, (d * 180) / Math.PI);
  // What the eye needs: the two lines are still apart just outside the node they share.
  const near = (s) => { const [p, q] = s.from === shared ? [s.a, s.b] : [s.b, s.a]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]); return [p[0] + ((q[0] - p[0]) * NEAR) / L, p[1] + ((q[1] - p[1]) * NEAR) / L]; };
  const pa = near(a), pb = near(b), gap = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
  minNearGap = Math.min(minNearGap, gap);
  if (gap < 14) flag("arcAngle", `arcs merge at ${shared}: ${a.from}->${a.to}, ${b.from}->${b.to} are ${gap.toFixed(1)} px apart ${NEAR} px out`);
}
// arrowheads arriving at one node stay apart
for (let i = 0; i < arcs.length; i++) for (let j = i + 1; j < arcs.length; j++) {
  const a = arcs[i], b = arcs[j];
  if (a.to === b.to && Math.hypot(a.tip[0] - b.tip[0], a.tip[1] - b.tip[1]) < 16) flag("tipTip", `arrowheads crowd at ${a.to}: from ${a.from} and ${b.from}`);
}
for (const n of nodes) if (n.box.x0 < M - 1 || n.box.y0 < 70 || n.box.x1 > W - M + 1 || n.box.y1 > H - M + 1) flag("offCanvas", `node off canvas: ${n.id}`);
if (marks.some((m) => m.id.startsWith("legend") && nodes.some((n) => hit(m.box, n.box, 16)))) flag("nodeNode", "legend overlaps a node");

/* ---------- write ---------- */
const nInfo = arcs.filter((a) => a.info).length;
const kindCount = (k) => nodes.filter((n) => n.kind === k).length;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(title)}</title>
<desc>Influence diagram: ${kindCount("decision")} decisions, ${kindCount("uncertainty")} uncertainties, ${kindCount("deterministic")} deterministic node and ${kindCount("value")} value node, joined by ${arcs.length} arcs. The ${nInfo} dashed arcs show what is known before each decision.</desc>
<rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER}"/>
${g.join("\n")}
</svg>
`;
console.log(`canvas ${W}x${H}; ${nodes.length} nodes, ${arcs.length} arcs (${nInfo} informational)`);
console.log(`checks: ${JSON.stringify(counts)}`);
console.log(`closest arc to a node it does not touch: ${minArcNode.toFixed(1)} px; smallest angle between arcs at one node: ${minAngle.toFixed(1)} deg; closest two arcs come ${NEAR} px out from a shared node: ${minNearGap.toFixed(1)} px`);
for (const p of problems) console.log("  " + p);
if (process.env.DRAFT) await writeFile(process.env.DRAFT, svg); // look at a failing layout without installing it
if (problems.length) process.exit(1);
await writeFile(new URL("ideal.svg", DIR), svg);
console.log("wrote ideal.svg");
