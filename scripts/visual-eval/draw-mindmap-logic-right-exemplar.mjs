// Draws visual-eval/exemplars/mindmap/logic-right/ideal.svg from that exemplar's
// source.sx, then checks labels, connectors and canvas edges for collisions.
// Run: node scripts/visual-eval/draw-mindmap-logic-right-exemplar.mjs
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../../visual-eval/exemplars/mindmap/logic-right/", import.meta.url);
const src = readFileSync(new URL("source.sx", dir), "utf8");

// ── Tree from the markmap-style source ──────────────────────────────────
const root = { label: "", depth: 0, children: [] };
let l1 = null, l2 = null;
for (const raw of src.split("\n")) {
  if (!raw.trim() || raw.trim().startsWith("%%")) continue;
  let m;
  if ((m = raw.match(/^# (.+)$/))) root.label = m[1].trim();
  else if ((m = raw.match(/^## (.+)$/))) { l1 = { label: m[1].trim(), depth: 1, children: [] }; root.children.push(l1); }
  else if ((m = raw.match(/^- (.+)$/))) { l2 = { label: m[1].trim(), depth: 2, children: [] }; l1.children.push(l2); }
  else if ((m = raw.match(/^ {2}- (.+)$/))) l2.children.push({ label: m[1].trim(), depth: 3, children: [] });
  else throw new Error("unparsed line: " + raw);
}

// ── Tokens (shared with the mindmap/map exemplar) ───────────────────────
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const PALETTE = ["#3A6EA5", "#2F8B77", "#6E8B3D", "#C08A2E", "#B4544A", "#7B5EA7"];
const INK = "#1F2933", TEXT2 = "#2B3440", TEXT3 = "#5A6472";
const FS = [18, 14, 13, 12];
const textW = (s, fs, bold) => s.length * fs * (bold ? 0.6 : 0.55);
const mix = (hex, t) => { // t of the colour, (1 - t) of white
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * t + 255 * (1 - t)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
};
const f = (v) => v.toFixed(1);

// ── Columns: one per depth, left edges aligned ──────────────────────────
const MARGIN = 40;
const ROOT_H = 54, PILL_H = 30;
const all = [];
(function walk(n, b) { n.branch = b; all.push(n); n.children.forEach((c, i) => walk(c, n.depth === 0 ? i : b)); })(root, -1);
for (const n of all) {
  n.tw = textW(n.label, FS[n.depth], n.depth <= 1);
  n.w = n.depth === 0 ? n.tw + 56 : n.depth === 1 ? n.tw + 32 : n.tw;
}
const colW = [0, 1, 2, 3].map((d) => Math.max(...all.filter((n) => n.depth === d).map((n) => n.w)));
const colX = [MARGIN];
colX[1] = colX[0] + colW[0] + 64; // room for the staggered root connectors
colX[2] = colX[1] + colW[1] + 44;
colX[3] = colX[2] + colW[2] + 44;
const WIDTH = Math.round(colX[3] + colW[3] + MARGIN);

// ── Rows: tidy tree, parent centred on its children ─────────────────────
// Anchor y = pill centre (depth 1) or underline (depths 2–3).
const LEAF = { 2: { band: 34, anchor: 23 }, 3: { band: 30, anchor: 21 } };
function place(n, top) {
  if (!n.children.length) { n.y = top + LEAF[n.depth].anchor; return top + LEAF[n.depth].band; }
  let cursor = top;
  n.children.forEach((c, i) => {
    if (i > 0) {
      if (n.depth === 0) cursor += 28;
      else if (n.depth === 1) cursor += 4 + (c.children.length || n.children[i - 1].children.length ? 8 : 0);
    }
    cursor = place(c, cursor);
  });
  n.y = (n.children[0].y + n.children[n.children.length - 1].y) / 2;
  return cursor;
}
const HEIGHT = Math.round(place(root, MARGIN) + MARGIN);

// ── Geometry ────────────────────────────────────────────────────────────
const out = [];
const boxes = []; // { x1, y1, x2, y2, name, node }
const polylines = []; // { pts, parent, name }
const colourOf = (n) => (n.depth === 0 ? INK : n.depth === 3 ? mix(PALETTE[n.branch], 0.75) : PALETTE[n.branch]);

function elbowGroup(parent, px, py, sx, R, width, colour) {
  let d = `M ${f(px)} ${f(py)} H ${f(sx)}`;
  polylines.push({ pts: [[px, py], [sx, py]], parent });
  for (const c of parent.children) {
    const cx = colX[c.depth];
    const dy = c.y - py;
    if (Math.abs(dy) < 0.5) {
      d += ` M ${f(sx)} ${f(py)} H ${f(cx)}`;
      polylines.push({ pts: [[sx, py], [cx, py]], parent });
      continue;
    }
    const s = Math.sign(dy), r = Math.min(R, Math.abs(dy));
    d += ` M ${f(sx)} ${f(py)} V ${f(c.y - s * r)} Q ${f(sx)} ${f(c.y)} ${f(sx + r)} ${f(c.y)} H ${f(cx)}`;
    const pts = [[sx, py], [sx, c.y - s * r]];
    for (let k = 1; k <= 8; k++) { const t = k / 8; pts.push([sx + r * t * t, c.y - s * r * (1 - t) * (1 - t)]); }
    pts.push([cx, c.y]);
    polylines.push({ pts, parent });
  }
  out.push(`  <path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`);
}

// Root → first level: staggered exits and nested turns, so no two branch colours share a line.
const rootX = colX[0], rootY = root.y, rootW = root.w;
const n1 = root.children.length;
const rootEnd = rootX + rootW - ROOT_H / 2;
const exits = root.children.map((c, i) => (i - (n1 - 1) / 2) * 8);
const up = root.children.map((c, i) => i).filter((i) => root.children[i].y < rootY + exits[i] - 0.5);
const down = root.children.map((c, i) => i).filter((i) => root.children[i].y > rootY + exits[i] + 0.5).reverse();
const turnX = {};
up.forEach((i, k) => (turnX[i] = rootX + rootW + 14 + k * 11));
down.forEach((i, k) => (turnX[i] = rootX + rootW + 14 + k * 11));
root.children.forEach((c, i) => {
  const ey = rootY + exits[i];
  const ex = rootEnd + Math.sqrt((ROOT_H / 2) ** 2 - exits[i] ** 2) - 3;
  const colour = PALETTE[i];
  if (turnX[i] === undefined) {
    out.push(`  <path d="M ${f(ex)} ${f(ey)} H ${f(colX[1] + 4)}" fill="none" stroke="${colour}" stroke-width="3" stroke-linecap="round"/>`);
    polylines.push({ pts: [[ex, ey], [colX[1] + 4, ey]], parent: root, child: c });
    return;
  }
  const sx = turnX[i], s = Math.sign(c.y - ey), r = Math.min(10, Math.abs(c.y - ey));
  out.push(`  <path d="M ${f(ex)} ${f(ey)} H ${f(sx)} V ${f(c.y - s * r)} Q ${f(sx)} ${f(c.y)} ${f(sx + r)} ${f(c.y)} H ${f(colX[1] + 4)}" fill="none" stroke="${colour}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  const pts = [[ex, ey], [sx, ey], [sx, c.y - s * r]];
  for (let k = 1; k <= 8; k++) { const t = k / 8; pts.push([sx + r * t * t, c.y - s * r * (1 - t) * (1 - t)]); }
  pts.push([colX[1] + 4, c.y]);
  polylines.push({ pts, parent: root, child: c });
});

// First level → second level, second → third.
for (const a of root.children) {
  elbowGroup(a, colX[1] + a.w - 4, a.y, colX[2] - 20, 7, 2, PALETTE[a.branch]);
  for (const b of a.children) {
    if (b.children.length) elbowGroup(b, colX[2] + b.w, b.y, colX[3] - 20, 6, 1.3, mix(PALETTE[b.branch], 0.75));
  }
}

// Underlines for depths 2–3 (they continue the incoming connector).
for (const n of all.filter((n) => n.depth >= 2)) {
  const x = colX[n.depth];
  out.push(`  <line x1="${f(x)}" y1="${f(n.y)}" x2="${f(x + n.w)}" y2="${f(n.y)}" stroke="${colourOf(n)}" stroke-width="${n.depth === 2 ? 2 : 1.3}" stroke-linecap="round"/>`);
}

// Root capsule, first-level pills, then all text.
out.push(`  <rect x="${f(rootX)}" y="${f(rootY - ROOT_H / 2)}" width="${f(rootW)}" height="${ROOT_H}" rx="27" fill="${INK}"/>`);
boxes.push({ x1: rootX, y1: rootY - ROOT_H / 2, x2: rootX + rootW, y2: rootY + ROOT_H / 2, name: root.label, node: root });
for (const a of root.children) {
  out.push(`  <rect x="${f(colX[1])}" y="${f(a.y - PILL_H / 2)}" width="${f(a.w)}" height="${PILL_H}" rx="15" fill="${PALETTE[a.branch]}"/>`);
  boxes.push({ x1: colX[1], y1: a.y - PILL_H / 2, x2: colX[1] + a.w, y2: a.y + PILL_H / 2, name: a.label, node: a });
}
out.push(`  <text x="${f(rootX + rootW / 2)}" y="${f(rootY + 6.5)}" font-family="${FONT}" font-size="18" font-weight="700" fill="#FFFFFF" text-anchor="middle">${root.label}</text>`);
for (const a of root.children) {
  out.push(`  <text x="${f(colX[1] + a.w / 2)}" y="${f(a.y + 5)}" font-family="${FONT}" font-size="14" font-weight="600" fill="#FFFFFF" text-anchor="middle">${a.label}</text>`);
}
for (const n of all.filter((n) => n.depth >= 2)) {
  const fs = FS[n.depth], base = n.y - 7;
  out.push(`  <text x="${f(colX[n.depth])}" y="${f(base)}" font-family="${FONT}" font-size="${fs}" fill="${n.depth === 2 ? TEXT2 : TEXT3}">${n.label}</text>`);
  boxes.push({ x1: colX[n.depth], y1: base - 0.74 * fs, x2: colX[n.depth] + n.w, y2: base + 0.22 * fs, name: n.label, node: n });
}

const l1names = root.children.map((c) => c.label);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img">
  <title>${root.label} — logic chart</title>
  <desc>A logic chart that reads left to right. The dark rounded capsule on the left states the goal "${root.label}". Four coloured branches leave it and turn at right angles with rounded corners into filled pills in one aligned column: ${l1names.join(", ")}. Each pill splits into sub-levers written as plain text on a short underline in the branch colour, all starting on one vertical line, and a few of those split again into first moves in a lighter tone in a third aligned column. Nothing overlaps.</desc>
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#FFFFFF"/>
${out.join("\n")}
</svg>
`;
writeFileSync(new URL("ideal.svg", dir), svg);

// ── Verification ────────────────────────────────────────────────────────
const inside = (p, b, pad = 0) => p[0] > b.x1 + pad && p[0] < b.x2 - pad && p[1] > b.y1 + pad && p[1] < b.y2 - pad;
const problems = [];
for (let i = 0; i < boxes.length; i++)
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2) problems.push(`label/label: ${a.name} × ${b.name}`);
  }
let samples = 0;
const sampleLine = (pts, step = 2) => {
  const res = [];
  for (let k = 1; k < pts.length; k++) {
    const [x1, y1] = pts[k - 1], [x2, y2] = pts[k];
    const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.ceil(L / step));
    for (let s = 0; s <= n; s++) res.push([x1 + ((x2 - x1) * s) / n, y1 + ((y2 - y1) * s) / n]);
  }
  return res;
};
for (const pl of polylines) {
  for (const p of sampleLine(pl.pts)) {
    samples++;
    for (const b of boxes) {
      if (b.node === pl.parent || b.node === pl.child) continue; // tucked under its own parent shape and, at the root, under the pill it feeds
      if (inside(p, b, 1)) { problems.push(`connector/label: from ${pl.parent.label} hits ${b.name}`); break; }
    }
  }
}
for (const n of all.filter((n) => n.depth >= 2)) {
  for (const p of sampleLine([[colX[n.depth], n.y], [colX[n.depth] + n.w, n.y]])) {
    samples++;
    for (const b of boxes) if (b.node !== n && inside(p, b, 1)) { problems.push(`underline/label: ${n.label} hits ${b.name}`); break; }
  }
}
const segs = polylines.flatMap((pl, idx) => pl.pts.slice(1).map((p, k) => ({ a: pl.pts[k], b: p, pl, idx })));
const cross = (s, t) => {
  const d = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = d(s.a, s.b, t.a), d2 = d(s.a, s.b, t.b), d3 = d(t.a, t.b, s.a), d4 = d(t.a, t.b, s.b);
  return d1 * d2 < -1e-6 && d3 * d4 < -1e-6;
};
let crossings = 0;
for (let i = 0; i < segs.length; i++)
  for (let j = i + 1; j < segs.length; j++) {
    const s = segs[i], t = segs[j];
    if (s.pl.parent === t.pl.parent && s.pl.parent !== root) continue; // same spine
    if (s.idx === t.idx) continue;
    if (cross(s, t)) { crossings++; problems.push(`connector/connector: ${s.pl.parent.label} × ${t.pl.parent.label}`); }
  }
for (const b of boxes)
  if (b.x1 < 16 || b.y1 < 16 || b.x2 > WIDTH - 16 || b.y2 > HEIGHT - 16) problems.push(`edge: ${b.name}`);
let minGap = Infinity;
for (const d of [2, 3]) {
  const col = boxes.filter((b) => b.node.depth === d).sort((p, q) => p.y1 - q.y1);
  for (let k = 1; k < col.length; k++) minGap = Math.min(minGap, col[k].y1 - col[k - 1].y2);
}
console.log(`canvas ${WIDTH}×${HEIGHT}, nodes ${all.length}, label boxes ${boxes.length}, samples ${samples}, crossings ${crossings}`);
console.log(`columns x = ${colX.map(f).join(" / ")}; min vertical clear gap between text rows ${f(minGap)} px`);
console.log(`collisions: ${problems.length}`);
for (const p of problems) console.log("  " + p);
