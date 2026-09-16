// Draws visual-eval/exemplars/mindmap/futureswheel/ideal.svg and prints a geometry report.
// Run: node scripts/visual-eval/draw-mindmap-futureswheel-exemplar.mjs
import { writeFileSync } from "node:fs";

const OUT = new URL("../../visual-eval/exemplars/mindmap/futureswheel/ideal.svg", import.meta.url);
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const HUES = ["#3A6EA5", "#2F8B77", "#6E8B3D", "#C08A2E", "#B4544A"];
const INK = "#1F2933", TEXT2 = "#2B3440", TEXT3 = "#5A6472", RING = "#D6DCE3", CAPTION = "#8A94A1";

// Tree — mirrors source.sx exactly.
const tree = {
  label: "Four-day work week becomes standard",
  kids: [
    { label: "Three-day weekends", kids: [
      { label: "More short domestic trips", kids: [{ label: "Friday travel peaks" }] },
      { label: "More time for family care" } ] },
    { label: "Longer working days", kids: [
      { label: "Fatigue late in the day", kids: [{ label: "More workplace errors" }] },
      { label: "Harder school pickups" } ] },
    { label: "Fewer commuting days", kids: [
      { label: "Lower transport emissions" },
      { label: "Less weekday transit revenue", kids: [{ label: "Transit fares rise" }] } ] },
    { label: "Services still open five days", kids: [
      { label: "Staggered team rotas", kids: [{ label: "Fewer shared meeting days" }] },
      { label: "Hiring to cover the fifth day" } ] },
    { label: "Easier hiring and retention", kids: [
      { label: "Lower staff turnover", kids: [{ label: "Training costs fall" }] },
      { label: "Pressure on five-day employers" } ] },
  ],
};

// Type scale per order (shared with the map exemplar).
const TYPE = [
  { fs: 18, weight: 700, charW: 0.6, wrap: 200, padY: 17, fill: INK, text: "#FFFFFF" },
  { fs: 14, weight: 600, charW: 0.6, wrap: 118, padY: 12 },
  { fs: 13, weight: 400, charW: 0.55, wrap: 118, padY: 11 },
  { fs: 12, weight: 400, charW: 0.55, wrap: 104, padY: 10 },
];
const RADII = [0, 262, 462, 628];
const SIBLING_SPREAD = 18; // degrees either side of the parent angle

const textW = (s, t) => s.length * t.fs * t.charW;
function wrap(label, t) {
  if (textW(label, t) <= t.wrap) return [label];
  const words = label.split(" ");
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    const m = Math.max(textW(a, t), textW(b, t));
    if (!best || m < best.m) best = { m, lines: [a, b] };
  }
  return best.lines;
}

function mix(hex, amount) { // mix hex with white; amount = share of hue
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(255 + (v - 255) * amount));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// ── Place nodes ─────────────────────────────────────────────────────────────
const nodes = [];
function size(node, order) {
  const t = TYPE[order];
  const lines = wrap(node.label, t);
  const lh = t.fs * 1.25;
  const ry = (lines.length * lh) / 2 + t.padY;
  let rx = ry * 1.35;
  lines.forEach((ln, i) => {
    const yc = (i - (lines.length - 1) / 2) * lh;
    const yEdge = Math.abs(yc) + t.fs * 0.42;
    const half = textW(ln, t) / 2;
    rx = Math.max(rx, half + 14, half / Math.sqrt(Math.max(0.05, 0.84 - (yEdge * yEdge) / (ry * ry))));
  });
  return { lines, lh, rx, ry };
}
function place(node, order, angle, branch, parent) {
  const r = RADII[order];
  const a = (angle * Math.PI) / 180;
  const n = { ...size(node, order), label: node.label, order, angle, branch, parent,
    x: r * Math.cos(a), y: r * Math.sin(a) };
  nodes.push(n);
  const kids = node.kids ?? [];
  kids.forEach((k, i) => {
    const off = kids.length === 1 ? 0 : (order === 0 ? 0 : (i - (kids.length - 1) / 2) * 2 * SIBLING_SPREAD);
    const childAngle = order === 0 ? -90 + (360 / kids.length) * i : angle + off;
    place(k, order + 1, childAngle, order === 0 ? i : branch, n);
  });
}
place(tree, 0, 0, -1, null);

// Canvas bounds.
const M = 36;
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const n of nodes) {
  minX = Math.min(minX, n.x - n.rx); maxX = Math.max(maxX, n.x + n.rx);
  minY = Math.min(minY, n.y - n.ry); maxY = Math.max(maxY, n.y + n.ry);
}
minX = Math.min(minX, -RADII[3] - 8); maxX = Math.max(maxX, RADII[3] + 8);
minY = Math.min(minY, -RADII[3] - 8); maxY = Math.max(maxY, RADII[3] + 16);
const W = Math.ceil(maxX - minX + 2 * M), H = Math.ceil(maxY - minY + 2 * M);
const CX = -minX + M, CY = -minY + M;
for (const n of nodes) { n.x += CX; n.y += CY; }

// ── Connectors: 1, 2 or 3 parallel strokes between oval boundaries ────────────
function ellipseExitT(px, py, dx, dy, e, wantLast) {
  // Solve ((px+t dx - ex)/rx)^2 + ((py+t dy - ey)/ry)^2 = 1
  const ox = (px - e.x) / e.rx, oy = (py - e.y) / e.ry, vx = dx / e.rx, vy = dy / e.ry;
  const A = vx * vx + vy * vy, B = 2 * (ox * vx + oy * vy), C = ox * ox + oy * oy - 1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t1 = (-B - s) / (2 * A), t2 = (-B + s) / (2 * A);
  return wantLast ? t2 : t1;
}
const GAP = 4.4, EDGE_GAP = 2.5;
const connectors = [];
for (const n of nodes) {
  if (!n.parent) continue;
  const p = n.parent;
  const dx = n.x - p.x, dy = n.y - p.y, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const k = n.order; // single, double, triple
  const strokes = [];
  for (let i = 0; i < k; i++) {
    const o = (i - (k - 1) / 2) * GAP;
    const sx = p.x + nx * o, sy = p.y + ny * o;
    const t0 = ellipseExitT(sx, sy, dx, dy, p, true);
    const t1 = ellipseExitT(sx, sy, dx, dy, n, false);
    const e0 = EDGE_GAP / len, e1 = EDGE_GAP / len;
    strokes.push([sx + dx * (t0 + e0), sy + dy * (t0 + e0), sx + dx * (t1 - e1), sy + dy * (t1 - e1)]);
  }
  const c = strokes[Math.floor(k / 2)];
  const mid = k % 2 ? c : [(strokes[0][0] + strokes[1][0]) / 2, (strokes[0][1] + strokes[1][1]) / 2,
    (strokes[0][2] + strokes[1][2]) / 2, (strokes[0][3] + strokes[1][3]) / 2];
  connectors.push({ from: p, to: n, strokes, mid, width: k === 1 ? 2.2 : k === 2 ? 1.5 : 1.2, color: HUES[n.branch] });
}

// ── Ring captions (bottom of each ring, an angle no spoke uses) + legend ──────────
const captions = ["First order", "Second order", "Third order"].map((txt, i) => {
  const fs = 11, w = txt.length * fs * 0.62 + 12;
  const y = CY + RADII[i + 1];
  return { txt, x: CX, y, fs, box: { x: CX - w / 2, y: y - 9, w, h: 18 } };
});
const legend = { x: M, y: H - M - 74, w: 206, h: 74, rows: ["First-order consequence", "Second-order consequence", "Third-order consequence"] };

// ── Geometry checks ─────────────────────────────────────────────────────────────
const issues = [];
const inEllipse = (x, y, e, m = 0) => ((x - e.x) / (e.rx + m)) ** 2 + ((y - e.y) / (e.ry + m)) ** 2 < 1;
const ellipsePts = (e, m, k = 72) => Array.from({ length: k }, (_, i) => {
  const a = (i / k) * Math.PI * 2; return [e.x + (e.rx + m) * Math.cos(a), e.y + (e.ry + m) * Math.sin(a)];
});
const name = (n) => `"${n.label}"`;
for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
  const a = nodes[i], b = nodes[j];
  if (ellipsePts(a, 8).some(([x, y]) => inEllipse(x, y, b, 8))) issues.push(`oval overlap ${name(a)} / ${name(b)}`);
}
const segPts = (s, k = 40) => Array.from({ length: k + 1 }, (_, i) => [s[0] + (s[2] - s[0]) * i / k, s[1] + (s[3] - s[1]) * i / k]);
for (const c of connectors) for (const n of nodes) {
  if (n === c.from || n === c.to) continue;
  if (c.strokes.some((s) => segPts(s).some(([x, y]) => inEllipse(x, y, n, 4)))) issues.push(`connector ${name(c.from)}→${name(c.to)} crosses ${name(n)}`);
}
const cross = (p, q) => {
  const [ax, ay, bx, by] = p, [cx, cy, dx, dy] = q;
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
};
for (let i = 0; i < connectors.length; i++) for (let j = i + 1; j < connectors.length; j++) {
  const a = connectors[i], b = connectors[j];
  if (a.strokes.some((s) => b.strokes.some((t) => cross(s, t)))) issues.push(`connectors cross ${name(a.to)} / ${name(b.to)}`);
}
const boxes = [...captions.map((c) => ({ label: `caption ${c.txt}`, ...c.box })), { label: "legend", ...legend }];
for (const b of boxes) {
  const pts = [];
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 4; j++) pts.push([b.x + b.w * i / 10, b.y + b.h * j / 4]);
  for (const n of nodes) if (pts.some(([x, y]) => inEllipse(x, y, n, 6))) issues.push(`${b.label} overlaps ${name(n)}`);
  for (const c of connectors) for (const s of c.strokes) for (const [x, y] of segPts(s))
    if (x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4) { issues.push(`${b.label} touches connector to ${name(c.to)}`); break; }
}
for (const n of nodes) if (n.x - n.rx < 4 || n.y - n.ry < 4 || n.x + n.rx > W - 4 || n.y + n.ry > H - 4) issues.push(`${name(n)} off canvas`);

// ── SVG ─────────────────────────────────────────────────────────────────────────
const f = (v) => v.toFixed(1);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">`);
out.push(`  <title>Four-day work week becomes standard — futures wheel</title>`);
out.push(`  <desc>A futures wheel. The central change, "Four-day work week becomes standard", sits in a dark oval in the middle. Five first-order consequences sit on the first ring, each a filled oval in its own colour joined to the centre by a single line. Each has two second-order consequences on the second ring in tinted ovals joined by double lines, and five of those lead to a third-order consequence on the outer ring in an outlined oval joined by triple lines. The rings are labelled at the bottom and a key in the lower-left corner explains the line styles. Nothing overlaps.</desc>`);
out.push(`  <rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>`);
for (let i = 1; i <= 3; i++) out.push(`  <circle cx="${f(CX)}" cy="${f(CY)}" r="${RADII[i]}" fill="none" stroke="${RING}" stroke-width="${i === 1 ? 1.6 : 1.3}"/>`);
for (const c of captions) {
  out.push(`  <rect x="${f(c.box.x)}" y="${f(c.box.y)}" width="${f(c.box.w)}" height="${c.box.h}" fill="#FFFFFF"/>`);
  out.push(`  <text x="${f(c.x)}" y="${f(c.y + c.fs * 0.36)}" font-family="${FONT}" font-size="${c.fs}" font-weight="600" letter-spacing="0.6" fill="${CAPTION}" text-anchor="middle">${c.txt.toUpperCase()}</text>`);
}
for (const c of connectors) for (const s of c.strokes)
  out.push(`  <line x1="${f(s[0])}" y1="${f(s[1])}" x2="${f(s[2])}" y2="${f(s[3])}" stroke="${c.color}" stroke-width="${c.width}" stroke-linecap="butt"/>`);
for (const n of nodes) {
  const t = TYPE[n.order];
  const hue = n.order === 0 ? INK : HUES[n.branch];
  const fill = n.order === 0 ? INK : n.order === 1 ? hue : n.order === 2 ? mix(hue, 0.12) : "#FFFFFF";
  const stroke = n.order >= 2 ? ` stroke="${hue}" stroke-width="${n.order === 2 ? 1.6 : 1.2}"` : "";
  const color = n.order <= 1 ? "#FFFFFF" : n.order === 2 ? TEXT2 : TEXT3;
  out.push(`  <ellipse cx="${f(n.x)}" cy="${f(n.y)}" rx="${f(n.rx)}" ry="${f(n.ry)}" fill="${fill}"${stroke}/>`);
  n.lines.forEach((ln, i) => {
    const yc = n.y + (i - (n.lines.length - 1) / 2) * n.lh;
    const wt = t.weight !== 400 ? ` font-weight="${t.weight}"` : "";
    out.push(`  <text x="${f(n.x)}" y="${f(yc + t.fs * 0.36)}" font-family="${FONT}" font-size="${t.fs}"${wt} fill="${color}" text-anchor="middle">${esc(ln)}</text>`);
  });
}
// Legend: line style per order.
legend.rows.forEach((txt, i) => {
  const y = legend.y + 12 + i * 25, k = i + 1;
  for (let s = 0; s < k; s++) {
    const o = (s - (k - 1) / 2) * GAP;
    out.push(`  <line x1="${legend.x}" y1="${f(y + o)}" x2="${legend.x + 40}" y2="${f(y + o)}" stroke="${TEXT3}" stroke-width="${k === 1 ? 2.2 : k === 2 ? 1.5 : 1.2}"/>`);
  }
  out.push(`  <text x="${legend.x + 52}" y="${f(y + 4.3)}" font-family="${FONT}" font-size="12" fill="${TEXT3}">${txt}</text>`);
});
out.push(`</svg>`);
writeFileSync(OUT, out.join("\n") + "\n");
console.log(`canvas ${W}x${H}, events ${nodes.length}, connectors ${connectors.length}, strokes ${connectors.reduce((s, c) => s + c.strokes.length, 0)}`);
console.log(`collisions: ${issues.length}`);
for (const i of issues) console.log("  - " + i);
