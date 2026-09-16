/** Draw an ecomap case's `ideal.svg` — the target the engine is aiming at.
 *
 * The target set has to be *one* drawing repeated, not eight drawings that
 * drift, so this reproduces the idiom of `visual-eval/exemplars/ecomap/ideal.svg`
 * exactly: a dashed accent boundary around the household, systems on a single
 * ring grouped by sector, radial spokes whose *drawn form* (not colour) states
 * the quality of the tie, solid triangles at the end energy arrives at, muted
 * category tints, and a legend at the foot repeating every code at the weight
 * it is drawn at.
 *
 * Text widths are measured in a real browser rather than estimated, and the
 * finished drawing is checked label-against-label, label-against-line and
 * label-against-canvas-edge before it is written — a target that collides is
 * worse than no target, because the judge then scores the engine against it.
 *
 *   node scripts/visual-eval/draw-ecomap-target.mjs visual-eval/cases/ecomap-caregiver
 */
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

const INK = "#1e293b";
const MUTED = "#64748b";
const FAINT = "#94a3b8";
const HAIRLINE = "#dbe2ea";
const ACCENT = "#2563eb";     // household boundary, the only structural accent
const STRESS = "#b4544a";     // stressful ties borrow the health clay

/** Ring tint per system category. The first six are the exemplar's own. */
const CATS = {
  family:          { ring: "#8a6a55", fill: "#f4efea", name: "Family & kin" },
  education:       { ring: "#a8792e", fill: "#f7f1e4", name: "Education" },
  health:          { ring: "#b4544a", fill: "#f9ecea", name: "Health & therapy" },
  work:            { ring: "#3f7d6a", fill: "#e9f2ee", name: "Work" },
  government:      { ring: "#5f7391", fill: "#edf1f6", name: "Government services" },
  community:       { ring: "#7a6595", fill: "#f1edf6", name: "Community" },
  friends:         { ring: "#2f8f9c", fill: "#eaf4f5", name: "Friends & peers" },
  "mental-health": { ring: "#9c4f78", fill: "#f5edf2", name: "Mental health" },
  legal:           { ring: "#3d4655", fill: "#e8eaee", name: "Legal & justice" },
  financial:       { ring: "#7d8a2e", fill: "#f2f3ea", name: "Financial" },
  substance:       { ring: "#5f8a3f", fill: "#eff3ec", name: "Recovery & substance" },
  religion:        { ring: "#4f86c4", fill: "#edf3f9", name: "Faith community" },
};

/** Clockwise from the top: daily structure, then community, kin, clinical, statutory. */
const SECTOR = [
  "education", "work", "financial", "community", "religion", "friends",
  "family", "substance", "health", "mental-health", "government", "legal",
];

const KIND = {
  "===": "strong", "==": "moderate", "---": "ordinary", "--": "tenuous",
  "~~~": "stressful", "-/-": "cutoff", "-": "ordinary",
  "-->": "ordinary", "<--": "ordinary", "<->": "ordinary",
  "===>": "strong", "<===": "strong", "==>": "moderate", "<==": "moderate",
};
const HEADS = { "-->": "b", "<--": "a", "<->": "ab", "===>": "b", "<===": "a", "==>": "b", "<==": "a" };

// Geometry, lifted from the exemplar.
const R_SYS = 56, R_MAJOR = 66;
const SPOKE_GAP = 160;        // clear air between the boundary and a system circle
const RING_CLEAR = 120;       // clear air between neighbouring system circles
const SPOKE_LIFT = 3;         // a spoke starts just outside the dashed boundary
const STRONG_GAP = 4.2, MODERATE_GAP = 6.4;
const ZIG_AMP = 5, ZIG_STEP = 15;
const HEAD_LEN = 11, HEAD_HALF = 3.2;
const CUT_GAP = 8, CUT_TICK = 14;
const LINE_H = 15.5;
const MARGIN = 46;

const caseDir = process.argv[2];
if (!caseDir) throw new Error("usage: draw-ecomap-target.mjs <case dir>");

// ---------------------------------------------------------------- parse

const src = await readFile(`${caseDir}/source.sx`, "utf8");
const doc = { title: "", deck: "", centre: null, systems: [], ties: [] };
for (const raw of src.split("\n")) {
  const line = raw.replace(/\s+$/, "");
  if (!line.trim()) continue;
  let m;
  if (line.trim().startsWith("#")) {
    if (!doc.deck) doc.deck = line.replace(/^\s*#\s*/, "").replace(/\.$/, "").replace(/:\s+/, " — ");
    continue;
  }
  if ((m = /^ecomap\s+"(.*)"/.exec(line))) { doc.title = m[1]; continue; }
  if ((m = /^\s*center:\s*(\S+)\s*(?:\[(.*)\])?/.exec(line))) {
    doc.centre = { id: m[1], ...attrs(m[2] || "") };
    continue;
  }
  if ((m = /^\s*([A-Za-z][\w-]*)\s*\[(.*)\]\s*$/.exec(line))) {
    doc.systems.push({ id: m[1], ...attrs(m[2]) });
    continue;
  }
  const tokens = line.replace(/\[.*\]/, "").trim().split(/\s+/);
  if (tokens.length >= 3) {
    const op = tokens.slice(1, -1).join("");
    if (op in KIND) doc.ties.push({ a: tokens[0], b: tokens[tokens.length - 1], op });
  }
}

function attrs(body) {
  const out = {};
  const label = /label:\s*"([^"]*)"/.exec(body);
  if (label) out.label = label[1];
  const cat = /category:\s*([\w-]+)/.exec(body);
  if (cat) out.category = cat[1];
  if (/importance:\s*major/.test(body)) out.major = true;
  const age = /\bage:\s*(\d+)/.exec(body);
  if (age) out.age = Number(age[1]);
  const year = /(?:^|,)\s*(\d{4})\s*(?:,|$)/.exec(body);
  if (out.age === undefined && year) out.age = 2026 - Number(year[1]);
  if (/\bmale\b/.test(body)) out.sex = "male";
  if (/\bfemale\b/.test(body)) out.sex = "female";
  return out;
}

if (!doc.centre) throw new Error(`${caseDir}: no centre`);
for (const s of doc.systems) if (!CATS[s.category]) throw new Error(`${caseDir}: unknown category ${s.category}`);

// Sector order clockwise from the top, declaration order within a sector.
doc.systems.forEach((s, i) => { s.seq = i; });
const ring = [...doc.systems].sort(
  (p, q) => SECTOR.indexOf(p.category) - SECTOR.indexOf(q.category) || p.seq - q.seq
);

for (const t of doc.ties) {
  const outward = t.a === doc.centre.id;
  t.system = ring.find((s) => s.id === (outward ? t.b : t.a));
  if (!t.system) throw new Error(`${caseDir}: tie touches no system (${t.a} ${t.op} ${t.b})`);
  t.kind = KIND[t.op];
  const heads = HEADS[t.op] || "";
  // "a" and "b" are source-order ends; translate them into centre/system ends.
  t.headCentre = heads.includes(outward ? "a" : "b");
  t.headSystem = heads.includes(outward ? "b" : "a");
}

// ---------------------------------------------------------------- measure

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (text, size, weight) => {
  const key = `${weight}|${size}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const w = await page.evaluate(
    ([t, s, wt, f]) => {
      const ctx = document.getElementById("c").getContext("2d");
      ctx.font = `${wt} ${s}px ${f}`;
      return ctx.measureText(t).width;
    },
    [text, size, weight, FONT]
  );
  cache.set(key, w);
  return w;
};

const wrap = async (text, limit, size, weight) => {
  const words = text.split(/\s+/);
  const out = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (line && (await measure(trial, size, weight)) > limit) { out.push(line); line = w; }
    else line = trial;
  }
  if (line) out.push(line);
  return out;
};

/** Wrap `text` so it sits inside a circle of radius r; null when it will not. */
const fitCircle = async (text, r, size, weight, maxLines) => {
  for (let k = 1; k <= maxLines; k++) {
    const half = (k * LINE_H) / 2;
    const avail = 2 * Math.sqrt(Math.max(1, r * r - half * half)) - 16;
    const lines = await wrap(text, avail, size, weight);
    if (lines.length <= k) return lines;
  }
  return null;
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 10) / 10;
const text = (x, y, s, { size = 12.5, weight = 400, fill = INK, anchor = "middle", extra = "" } = {}) =>
  `<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT_SVG}" font-size="${size}"` +
  (weight !== 400 ? ` font-weight="${weight}"` : "") +
  ` fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ""}${extra}>${esc(s)}</text>`;

// System label inside its own circle; the circle grows before the type shrinks.
for (const s of ring) {
  s.r = s.major ? R_MAJOR : R_SYS;
  let lines = null;
  while (!(lines = await fitCircle(s.label ?? s.id, s.r, 12.5, 500, 3)) && s.r < 82) s.r += 5;
  if (!lines) throw new Error(`${caseDir}: "${s.label}" does not fit a system circle`);
  s.lines = lines;
}

// Individual centre: name first, optional age as secondary text. No nested glyph.
const centre = doc.centre;
centre.person = Boolean(centre.sex) || centre.age !== undefined;
centre.r = centre.person ? 80 : 68;   // retain established target circle sizes
for (;;) {
  const avail = centre.person
    ? 2 * Math.sqrt(Math.max(1, centre.r * centre.r - 16 * 16)) - 16
    : null;
  const lines = centre.person
    ? await wrap(centre.label ?? centre.id, avail, 14, 600)
    : await fitCircle(centre.label ?? centre.id, centre.r, 14, 600, 2);
  if (lines && lines.length <= 2 && (!centre.person || lines.length === 1)) { centre.lines = lines; break; }
  centre.r += 6;
  if (centre.r > 132) throw new Error(`${caseDir}: centre label does not fit`);
}

// ---------------------------------------------------------------- layout

const rMax = Math.max(...ring.map((s) => s.r));
// The ring is as tight as the longer of two clearances allows: the spoke has to
// be long enough to read as a spoke, and neighbouring systems must not crowd.
const R = Math.max(
  centre.r + SPOKE_GAP + R_SYS,
  (2 * rMax + RING_CLEAR) / (2 * Math.sin(Math.PI / ring.length))
);
const step = 360 / ring.length;
ring.forEach((s, i) => {
  const a = ((-90 + i * step) * Math.PI) / 180;
  s.cx = R * Math.cos(a);
  s.cy = R * Math.sin(a);
  s.ux = Math.cos(a);
  s.uy = Math.sin(a);
});

const ringSpan = 2 * (R + rMax);

// ---------------------------------------------------------------- line codes

const parallels = (ax, ay, bx, by, n, gap, stroke = INK, w = 2) => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  const px = -dy / L, py = dx / L;
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * gap;
    out.push(
      `<line x1="${n2(ax + px * o)}" y1="${n2(ay + py * o)}" x2="${n2(bx + px * o)}" y2="${n2(by + py * o)}"` +
      ` stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`
    );
  }
  return out;
};

const zigzag = (ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const n = Math.max(4, Math.round(L / ZIG_STEP));
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = (k * L) / n;
    const a = k === 0 || k === n ? 0 : (k % 2 ? ZIG_AMP : -ZIG_AMP);
    pts.push(`${n2(ax + ux * t + px * a)},${n2(ay + uy * t + py * a)}`);
  }
  return [`<polyline points="${pts.join(" ")}" fill="none" stroke="${STRESS}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`];
};

const cutoff = (ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const mid = L / 2, h = CUT_GAP / 2, t = CUT_TICK / 2;
  const at = (d, o = 0) => [ax + ux * d + px * o, ay + uy * d + py * o];
  const seg = (p, q) => `<line x1="${n2(p[0])}" y1="${n2(p[1])}" x2="${n2(q[0])}" y2="${n2(q[1])}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  return [
    seg(at(0), at(mid - h)),
    seg(at(mid + h), at(L)),
    seg(at(mid - h, -t), at(mid - h, t)),
    seg(at(mid + h, -t), at(mid + h, t)),
  ];
};

/** Solid triangle whose tip is at (tx,ty), pointing along (ux,uy). */
const head = (tx, ty, ux, uy) => {
  const px = -uy, py = ux;
  const bx = tx - ux * HEAD_LEN, by = ty - uy * HEAD_LEN;
  return `<path d="M ${n2(tx)} ${n2(ty)} L ${n2(bx + px * HEAD_HALF)} ${n2(by + py * HEAD_HALF)}` +
    ` L ${n2(bx - px * HEAD_HALF)} ${n2(by - py * HEAD_HALF)} Z" fill="${INK}"/>`;
};

const spoke = (t) => {
  const s = t.system;
  const a = [s.ux * (centre.r + SPOKE_LIFT), s.uy * (centre.r + SPOKE_LIFT)];
  const b = [s.cx - s.ux * s.r, s.cy - s.uy * s.r];
  const inset = (from, to, d) => [from[0] + (to[0] - from[0]) * 0 + s.ux * d, from[1] + s.uy * d];
  let A = a, B = b;
  if (t.headCentre) A = [a[0] + s.ux * HEAD_LEN, a[1] + s.uy * HEAD_LEN];
  if (t.headSystem) B = [b[0] - s.ux * HEAD_LEN, b[1] - s.uy * HEAD_LEN];
  const out = [];
  if (t.kind === "strong") out.push(...parallels(A[0], A[1], B[0], B[1], 3, STRONG_GAP));
  else if (t.kind === "moderate") out.push(...parallels(A[0], A[1], B[0], B[1], 2, MODERATE_GAP));
  else if (t.kind === "tenuous")
    out.push(`<line x1="${n2(A[0])}" y1="${n2(A[1])}" x2="${n2(B[0])}" y2="${n2(B[1])}" stroke="${FAINT}" stroke-width="1.3" stroke-dasharray="5 5"/>`);
  else if (t.kind === "stressful") out.push(...zigzag(A[0], A[1], B[0], B[1]));
  else if (t.kind === "cutoff") out.push(...cutoff(A[0], A[1], B[0], B[1]));
  else out.push(...parallels(A[0], A[1], B[0], B[1], 1, 0));
  if (t.headCentre) out.push(head(a[0], a[1], -s.ux, -s.uy));
  if (t.headSystem) out.push(head(b[0], b[1], s.ux, s.uy));
  void inset;
  return out;
};

// ---------------------------------------------------------------- legend

const usedCats = SECTOR.filter((c) => ring.some((s) => s.category === c));
const kindsUsed = new Set(doc.ties.map((t) => t.kind));
const anyHead = doc.ties.some((t) => t.headCentre || t.headSystem);
const anyBoth = doc.ties.some((t) => t.headCentre && t.headSystem);
const anyOne = doc.ties.some((t) => (t.headCentre ? 1 : 0) + (t.headSystem ? 1 : 0) === 1);

const CODE_ORDER = ["strong", "moderate", "ordinary", "tenuous", "stressful", "cutoff"];
const CODE_NAME = {
  strong: "Strong", moderate: "Moderate", ordinary: "Ordinary",
  tenuous: "Tenuous", stressful: "Stressful", cutoff: "Cut off",
};
const codeItems = CODE_ORDER.filter((k) => kindsUsed.has(k));
const flowWord = centre.person ? "person" : "household";

const catWidths = [];
for (const c of usedCats) catWidths.push(await measure(CATS[c].name, 11, 400));
const codeWidths = [];
for (const k of codeItems) codeWidths.push(await measure(CODE_NAME[k], 11, 400));
const oneLabel = `Energy toward the ${flowWord}`;
const bothLabel = "Reciprocal exchange";
const oneW = await measure(oneLabel, 11, 400);
const bothW = await measure(bothLabel, 11, 400);

const CAT_STEP = (w) => 17 + w + 26;
const SAMPLE = 42, CODE_STEP = (w) => SAMPLE + 9 + w + 28;

let catRow = 0;
for (const w of catWidths) catRow += CAT_STEP(w);
let codeRow = 0;
for (const w of codeWidths) codeRow += CODE_STEP(w);
if (anyOne) codeRow += CODE_STEP(oneW) - 11;
if (anyBoth) codeRow += CODE_STEP(bothW) - 11;

const legendW = Math.max(catRow, codeRow);
const W = Math.max(Math.ceil(ringSpan + 2 * MARGIN + 20), Math.ceil(legendW + 2 * MARGIN));
const CX = W / 2;
const CY = 128 + R + rMax;
const legendRule = CY + R + rMax + 34;
const noteText = anyHead ? "Arrowheads show which way support flows." : "";
const H = Math.ceil(legendRule + (noteText ? 172 : 142));

// ---------------------------------------------------------------- draw

const o = [];
o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
o.push(`  <title>${esc(doc.title)} — social-work ecomap</title>`);

const desc = [
  `A Hartman ecomap for ${doc.title}.`,
  centre.person
    ? `At the centre, a dashed blue boundary holds ${centre.label ?? centre.id}${centre.age !== undefined ? `, age ${centre.age}` : ""}, with the name above an optional secondary age label.`
    : `At the centre, a dashed blue boundary holds the household, ${centre.label ?? centre.id}.`,
  `${ring.length} outside systems sit on one ring around it: ${ring.map((s) => s.label ?? s.id).join(", ")}.`,
  `Each is joined to the centre by a single straight spoke whose drawn form states the quality of the tie: three parallel lines for a strong tie, two for a moderate one, one plain line for an ordinary tie, a thin dashed line for a tenuous tie, a red zigzag for a stressful tie, and a line broken by two ticks for a cut-off tie.`,
  anyHead ? `Solid triangles show which way support flows.` : "",
  `A legend at the foot lists the system tints and every connection code.`,
].filter(Boolean).join(" ");
o.push(`  <desc>${esc(desc)}</desc>`);
o.push(`  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);
o.push(`  ${text(MARGIN, 68, doc.title, { size: 23, weight: 600, anchor: "" })}`);
o.push(`  ${text(MARGIN, 91, doc.deck, { size: 12.5, fill: MUTED, anchor: "" })}`);
o.push(`  <line x1="${MARGIN}" y1="104" x2="${W - MARGIN}" y2="104" stroke="${HAIRLINE}" stroke-width="1"/>`);
o.push(`  <g transform="translate(${n2(CX)} ${n2(CY)})">`);

o.push(`    <circle cx="0" cy="0" r="${centre.r}" fill="#ffffff" stroke="${ACCENT}" stroke-width="2.4" stroke-dasharray="9 6"/>`);
for (const t of doc.ties) for (const el of spoke(t)) o.push(`    ${el}`);

for (const s of ring) {
  const c = CATS[s.category];
  o.push(`    <circle cx="${n2(s.cx)}" cy="${n2(s.cy)}" r="${s.r}" fill="${c.fill}" stroke="${c.ring}" stroke-width="${s.major ? 3 : 2}"/>`);
  const k = s.lines.length;
  s.lines.forEach((line, i) => {
    const y = s.cy + 4.4 - ((k - 1) * LINE_H) / 2 + i * LINE_H;
    o.push(`    ${text(s.cx, y, line, { size: 12.5, weight: 500, extra: ` data-block="sys-${s.id}"` })}`);
  });
}

if (centre.person) {
  const hasAge = centre.age !== undefined;
  o.push(`    ${text(0, hasAge ? -8 : 0, centre.lines[0], { size: 14, weight: 600, extra: ' dominant-baseline="central" data-block="centre-name"' })}`);
  if (hasAge) o.push(`    ${text(0, 9, `Age ${centre.age}`, { size: 12, fill: MUTED, extra: ' dominant-baseline="central" data-block="centre-age"' })}`);
} else {
  const k = centre.lines.length;
  centre.lines.forEach((line, i) => {
    const y = 5 - ((k - 1) * 17) / 2 + i * 17;
    o.push(`    ${text(0, y, line, { size: 14, weight: 600, extra: ' data-block="centre"' })}`);
  });
}
o.push("  </g>");

// Legend.
o.push(`  <line x1="${MARGIN}" y1="${n2(legendRule)}" x2="${W - MARGIN}" y2="${n2(legendRule)}" stroke="${HAIRLINE}" stroke-width="1"/>`);
o.push(`  ${text(MARGIN, legendRule + 22, "SYSTEM TYPE", { size: 10, weight: 600, fill: FAINT, anchor: "", extra: ' letter-spacing="1.1"' })}`);
let x = MARGIN + 9;
usedCats.forEach((c, i) => {
  o.push(`  <circle cx="${n2(x)}" cy="${n2(legendRule + 46)}" r="8" fill="${CATS[c].fill}" stroke="${CATS[c].ring}" stroke-width="2"/>`);
  o.push(`  ${text(x + 17, legendRule + 50, CATS[c].name, { size: 11, anchor: "" })}`);
  x += CAT_STEP(catWidths[i]);
});

o.push(`  ${text(MARGIN, legendRule + 82, "CONNECTION CODE", { size: 10, weight: 600, fill: FAINT, anchor: "", extra: ' letter-spacing="1.1"' })}`);
const cy = legendRule + 106;
x = MARGIN;
codeItems.forEach((k, i) => {
  const a = [x, cy], b = [x + SAMPLE, cy];
  if (k === "strong") o.push(...parallels(a[0], a[1], b[0], b[1], 3, STRONG_GAP).map((s) => `  ${s}`));
  else if (k === "moderate") o.push(...parallels(a[0], a[1], b[0], b[1], 2, MODERATE_GAP).map((s) => `  ${s}`));
  else if (k === "tenuous") o.push(`  <line x1="${x}" y1="${n2(cy)}" x2="${x + SAMPLE}" y2="${n2(cy)}" stroke="${FAINT}" stroke-width="1.3" stroke-dasharray="5 5"/>`);
  else if (k === "stressful") o.push(...zigzag(a[0], a[1], b[0], b[1]).map((s) => `  ${s}`));
  else if (k === "cutoff") o.push(...cutoff(a[0], a[1], b[0], b[1]).map((s) => `  ${s}`));
  else o.push(...parallels(a[0], a[1], b[0], b[1], 1, 0).map((s) => `  ${s}`));
  o.push(`  ${text(x + SAMPLE + 9, cy + 4, CODE_NAME[k], { size: 11, anchor: "" })}`);
  x += CODE_STEP(codeWidths[i]);
});
if (anyOne) {
  o.push(...parallels(x + 11, cy, x + SAMPLE, cy, 1, 0).map((s) => `  ${s}`));
  o.push(`  ${head(x, cy, -1, 0)}`);
  o.push(`  ${text(x + SAMPLE + 9, cy + 4, oneLabel, { size: 11, anchor: "" })}`);
  x += CODE_STEP(oneW) - 11;
}
if (anyBoth) {
  o.push(...parallels(x + 11, cy, x + SAMPLE - 11, cy, 1, 0).map((s) => `  ${s}`));
  o.push(`  ${head(x, cy, -1, 0)}`);
  o.push(`  ${head(x + SAMPLE, cy, 1, 0)}`);
  o.push(`  ${text(x + SAMPLE + 9, cy + 4, bothLabel, { size: 11, anchor: "" })}`);
}
if (noteText) o.push(`  ${text(MARGIN, legendRule + 132, noteText, { size: 11, fill: MUTED, anchor: "" })}`);
o.push("</svg>");

const svgText = o.join("\n") + "\n";

// ---------------------------------------------------------------- verify

/** Every label box against every other label, every line and the canvas edge. */
const collisions = async () => {
  await page.setContent(`<style>html,body{margin:0}</style>${svgText}`);
  return page.evaluate(() => {
    const svg = document.querySelector("svg");
    const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
    const pad = 1.5;
    const texts = [...svg.querySelectorAll("text")].map((t) => {
      const r = t.getBBox();
      const m = t.getScreenCTM();
      return { s: t.textContent, block: t.getAttribute("data-block"), x: r.x + (m.e - svg.getScreenCTM().e), y: r.y + (m.f - svg.getScreenCTM().f), w: r.width, h: r.height };
    });
    const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
    const out = [];
    for (let i = 0; i < texts.length; i++) {
      const a = texts[i];
      if (a.x < -0.5 || a.y < -0.5 || a.x + a.w > W + 0.5 || a.y + a.h > H + 0.5) out.push(`canvas edge: "${a.s}"`);
      for (let j = i + 1; j < texts.length; j++) {
        if (a.block && a.block === texts[j].block) continue;   // stacked lines of one label
        if (hit(a, texts[j])) out.push(`label/label: "${a.s}" x "${texts[j].s}"`);
      }
    }
    const root = svg.getScreenCTM();
    const segs = [...svg.querySelectorAll("line")].map((l) => {
      const m = l.getScreenCTM();
      const ox = m.e - root.e, oy = m.f - root.f;
      return [l.x1.baseVal.value + ox, l.y1.baseVal.value + oy, l.x2.baseVal.value + ox, l.y2.baseVal.value + oy];
    });
    const near = (px, py, [x1, y1, x2, y2]) => {
      const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L)) : 0;
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    };
    for (const a of texts) {
      for (const s of segs) {
        let touch = false;
        for (let u = 0; u <= 1.0001 && !touch; u += 0.05)
          for (const [px, py] of [[a.x + u * a.w, a.y], [a.x + u * a.w, a.y + a.h], [a.x, a.y + u * a.h], [a.x + a.w, a.y + u * a.h]])
            if (near(px, py, s) < 1) { touch = true; break; }
        if (touch) out.push(`label/line: "${a.s}"`);
      }
    }
    return [...new Set(out)];
  });
};

const found = await collisions();
if (found.length) {
  await browser.close();
  throw new Error(`${caseDir.split("/").pop()} collides, not written:\n  ${found.join("\n  ")}`);
}

await writeFile(`${caseDir}/ideal.svg`, svgText);
await browser.close();
console.log(`${caseDir.split("/").pop()}: ${W}x${H}, ${ring.length} systems, ${doc.ties.length} ties, 0 collisions`);
