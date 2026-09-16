/** Draw the five comparison exemplars — one per mode — from each folder's
 *  source.sx into visual-eval/exemplars/comparison/<mode>/ideal.svg.
 *
 * One kit draws all five, so the family reads as one hand: a left-aligned title,
 * ink text on white, hairline rules between rows and one heavier rule under
 * every header. Colour is spent only where it carries meaning — green / amber /
 * red for yes / partial / no and for pro / con, green again for the winning
 * option, blue and plum for the things being compared (T-chart columns, the
 * two subjects of a double bubble).
 *
 *   node scripts/visual-eval/draw-comparison-exemplars.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const DIR = new URL("../../visual-eval/exemplars/comparison/", import.meta.url);
const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

const INK = "#1B2430", SLATE = "#5F6B7A", FAINT = "#8792A0";
const RULE = "#CDD5DE", HAIR = "#E4E9EE", WASH = "#F4F6F9";
const BLUE = "#28598C", BLUE_T = "#E6EEF7", PLUM = "#6B4F8C", PLUM_T = "#EEE9F4";
const TEAL = "#2A7473";
const GREEN = "#2E7A4E", GREEN_T = "#E3F1E8", GREEN_COL = "#F2F8F4";
const RED = "#B03A3A", RED_T = "#F7E4E3", AMBER = "#9A6A14", AMBER_T = "#FAEFD9";
const LINK = "#AEB8C3";

const M = 48;
const FS_TITLE = 22, FS_HEAD = 14, FS_BODY = 13.5, FS_SMALL = 11;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 100) / 100;

const browser = await chromium.launch();
const ruler = await browser.newPage();
await ruler.setContent("<canvas id=c></canvas>");
const cache = new Map();
async function measure(text, size, weight = 400) {
  const key = `${weight}|${size}|${text}`;
  if (!cache.has(key))
    cache.set(key, await ruler.evaluate(([t, s, w, f]) => {
      const ctx = document.getElementById("c").getContext("2d");
      ctx.font = `${w} ${s}px ${f}`;
      return ctx.measureText(t).width;
    }, [text, size, weight, FONT]));
  return cache.get(key);
}
async function wrap(text, size, weight, maxW) {
  const lines = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && (await measure(next, size, weight)) > maxW) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** The narrowest wrap that keeps the greedy line count: lines come out even,
 *  and no point ends on one stranded word. */
async function balancedWrap(text, size, weight, maxW) {
  const greedy = await wrap(text, size, weight, maxW);
  if (greedy.length < 2) return greedy;
  let lo = maxW / greedy.length, hi = maxW, best = greedy;
  for (let k = 0; k < 14; k++) {
    const mid = (lo + hi) / 2;
    const lines = await wrap(text, size, weight, mid);
    if (lines.length === greedy.length) { best = lines; hi = mid; } else lo = mid;
  }
  return best;
}

// ---------------------------------------------------------------- source

function parse(src) {
  const doc = { title: "", mode: "", baseline: "", columns: [], pros: [], cons: [], options: [], criteria: [],
    left: "", right: "", shared: [], leftOnly: [], rightOnly: [] };
  let column = null, criterion = null;
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    let m;
    if ((m = /^(comparison|tchart)\s+"(.*)"$/.exec(line))) { doc.title = m[2]; if (m[1] === "tchart") doc.mode = "tchart"; continue; }
    if ((m = /^mode:\s*([\w-]+)/.exec(line))) { doc.mode = m[1]; continue; }
    if ((m = /^baseline:\s*"(.*)"/.exec(line))) { doc.baseline = m[1]; continue; }
    if ((m = /^column\s+"(.*)"/.exec(line))) { column = { label: m[1], items: [] }; doc.columns.push(column); continue; }
    if ((m = /^-\s+(.*)$/.exec(line))) { column.items.push(m[1]); continue; }
    if ((m = /^(pro|con)\s+"(.*)"/.exec(line))) { (m[1] === "pro" ? doc.pros : doc.cons).push(m[2]); continue; }
    if ((m = /^option\s+"(.*)"/.exec(line))) { doc.options.push(m[1]); continue; }
    if ((m = /^criterion\s+"(.*?)"(?:\s+weight:\s*([\d.]+))?/.exec(line))) {
      criterion = { label: m[1], weight: m[2] ? Number(m[2]) : 1, cells: {} };
      doc.criteria.push(criterion);
      continue;
    }
    if ((m = /^(left|right)\s+"(.*)"/.exec(line))) { doc[m[1]] = m[2]; continue; }
    if ((m = /^(shared|left-only|right-only)\s+"(.*)"/.exec(line))) {
      ({ shared: doc.shared, "left-only": doc.leftOnly, "right-only": doc.rightOnly })[m[1]].push(m[2]);
      continue;
    }
    if (criterion && (m = /^(.+?):\s*(.+)$/.exec(line))) { criterion.cells[m[1]] = m[2].replace(/^"(.*)"$/, "$1"); continue; }
    throw new Error(`unparsed line: ${line}`);
  }
  return doc;
}

// ---------------------------------------------------------------- kit

function sheet() {
  const s = { parts: [], texts: [], circles: [], links: [], problems: [] };
  s.raw = (str) => s.parts.push(str);
  /** y is the baseline. `within` is the box the text must stay inside. */
  s.text = async (x, y, str, o = {}) => {
    const { size = FS_BODY, weight = 400, fill = INK, anchor = "start", within } = o;
    const w = await measure(str, size, weight);
    const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    const box = { x0, x1: x0 + w, y0: y - size * 0.78, y1: y + size * 0.24, str };
    s.texts.push(box);
    if (within && (box.x0 < within.x0 - 0.5 || box.x1 > within.x1 + 0.5 || box.y0 < within.y0 - 0.5 || box.y1 > within.y1 + 0.5))
      s.problems.push(`"${str}" overflows its cell`);
    s.parts.push(`<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT_SVG}" font-size="${size}" font-weight="${weight}" fill="${fill}"${anchor === "start" ? "" : ` text-anchor="${anchor}"`}>${esc(str)}</text>`);
    return w;
  };
  return s;
}

const line = (x1, y1, x2, y2, stroke, width = 1) =>
  `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${stroke}" stroke-width="${width}"/>`;
const rect = (x, y, w, h, fill, extra = "") =>
  `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${fill}"${extra}/>`;

function glyphPath(kind, cx, cy, r) {
  const k = r / 10, p = (dx, dy) => `${n2(cx + dx * k)} ${n2(cy + dy * k)}`;
  if (kind === "yes") return `M${p(-4.4, 0.3)} L${p(-1.3, 3.4)} L${p(4.6, -3.3)}`;
  if (kind === "no") return `M${p(-3.4, -3.4)} L${p(3.4, 3.4)} M${p(3.4, -3.4)} L${p(-3.4, 3.4)}`;
  return `M${p(-4.8, 1.3)} C${p(-3.2, -2.6)} ${p(-1.1, -2.4)} ${p(0, 0)} S${p(3.2, 2.6)} ${p(4.8, -1.3)}`;
}
const VALENCE = { yes: [GREEN, GREEN_T], partial: [AMBER, AMBER_T], no: [RED, RED_T] };
/** A tinted disc with the mark in its own colour: the quiet form, for cells. */
const badge = (kind, cx, cy, r = 10) => {
  const [c, t] = VALENCE[kind];
  return `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${r}" fill="${t}" stroke="${c}" stroke-width="1.2"/>` +
    `<path d="${glyphPath(kind, cx, cy, r)}" fill="none" stroke="${c}" stroke-width="${n2(1.8 * r / 10)}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
/** A solid disc with a white mark: the loud form, for column headers. */
const solidBadge = (kind, cx, cy, r) =>
  `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${r}" fill="${VALENCE[kind][0]}"/>` +
  `<path d="${glyphPath(kind, cx, cy, r)}" fill="none" stroke="#ffffff" stroke-width="${n2(1.9 * r / 10)}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Title at the top left; returns the baseline of its last line. */
async function title(s, text, W) {
  const lines = await wrap(text, FS_TITLE, 600, W - 2 * M);
  for (const [i, l] of lines.entries()) await s.text(M, 58 + i * 28, l, { size: FS_TITLE, weight: 600 });
  return 58 + (lines.length - 1) * 28;
}

function verify(s, W, H) {
  const out = [...s.problems];
  const t = s.texts;
  for (let i = 0; i < t.length; i++)
    for (let j = i + 1; j < t.length; j++)
      if (t[i].x0 < t[j].x1 - 1 && t[j].x0 < t[i].x1 - 1 && t[i].y0 < t[j].y1 - 1 && t[j].y0 < t[i].y1 - 1)
        out.push(`text overlap: "${t[i].str}" / "${t[j].str}"`);
  for (const b of t) if (b.x0 < M * 0.75 || b.x1 > W - M * 0.75 || b.y0 < 12 || b.y1 > H - M * 0.6) out.push(`too close to the edge: "${b.str}"`);
  for (const a of s.circles) {
    for (const b of s.circles)
      if (a !== b && Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r + 12) out.push(`circles too close: ${a.id} / ${b.id}`);
    if (a.cx - a.r < M * 0.75 || a.cx + a.r > W - M * 0.75) out.push(`circle near edge: ${a.id}`);
  }
  for (const k of s.links)
    for (const c of s.circles) {
      if (c.id === k.a || c.id === k.b) continue;
      const dx = k.x2 - k.x1, dy = k.y2 - k.y1;
      const u = Math.max(0, Math.min(1, ((c.cx - k.x1) * dx + (c.cy - k.y1) * dy) / (dx * dx + dy * dy)));
      if (Math.hypot(k.x1 + u * dx - c.cx, k.y1 + u * dy - c.cy) < c.r + 6) out.push(`link ${k.a}→${k.b} grazes ${c.id}`);
    }
  for (const tag of s.parts.join("\n").match(/<[a-z]+\b[^>]*>/g) ?? []) {
    const names = [...tag.matchAll(/\s([a-z:-]+)="/g)].map((m) => m[1]);
    if (new Set(names).size !== names.length) out.push(`duplicate attribute in ${tag.slice(0, 50)}`);
  }
  return out;
}

const svgDoc = (W, H, doc, desc, s) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">\n` +
  `<title>${esc(doc.title)}</title>\n<desc>${esc(desc)}</desc>\n${rect(0, 0, W, H, "#ffffff")}\n${s.parts.join("\n")}\n</svg>\n`;

// ---------------------------------------------------------------- T-chart

/** The things being compared each get an identity colour — the same blue and
 *  plum that mark the two subjects of a double bubble — with a pale panel of it. */
const SUBJECT = [BLUE, PLUM, TEAL];
const PANEL = ["#F1F5FA", "#F5F2F9", "#EFF6F5"];

async function tchart(doc) {
  const s = sheet();
  const n = doc.columns.length;
  const GUT = 64, PX = 22, BULLET = 22, LINE_H = 23, PAD_Y = 15, FS_ITEM = 15, R = 12;
  // As wide as the longest point needs, capped at a comfortable reading measure.
  let longest = 0;
  for (const c of doc.columns) for (const it of c.items) longest = Math.max(longest, await measure(it, FS_ITEM));
  const COL_W = Math.round(Math.max(300, Math.min(n === 2 ? 410 : 320, longest + BULLET)));
  const W = 2 * M + n * COL_W + (n - 1) * GUT + 2 * PX;
  const colX = (i) => M + PX + i * (COL_W + GUT);
  const tb = await title(s, doc.title, W);
  const headY = tb + 66, barY = headY + 20;

  // Each column flows on its own: a T-chart's points are rarely pairs, and
  // forcing shared rows leaves holes wherever one side wraps.
  const bodies = [];
  let bottom = barY;
  for (const c of doc.columns) {
    const rows = [];
    let y = barY + 10;
    for (const it of c.items) {
      const lines = await balancedWrap(it, FS_ITEM, 400, COL_W - BULLET);
      rows.push({ lines, y });
      y += lines.length * LINE_H + 2 * PAD_Y;
    }
    bodies.push(rows);
    bottom = Math.max(bottom, y + 8);
  }

  for (const [i, c] of doc.columns.entries()) {
    const color = SUBJECT[i % SUBJECT.length], x = colX(i), x0 = x - PX, w = COL_W + 2 * PX;
    // One panel per column, square under the crossbar and rounded at the foot,
    // all ending at the same depth so the stem runs between two equal blocks.
    s.raw(`<path d="M${n2(x0)} ${n2(barY)} H${n2(x0 + w)} V${n2(bottom - R)} Q${n2(x0 + w)} ${n2(bottom)} ${n2(x0 + w - R)} ${n2(bottom)} H${n2(x0 + R)} Q${n2(x0)} ${n2(bottom)} ${n2(x0)} ${n2(bottom - R)} Z" fill="${PANEL[i % PANEL.length]}"/>`);
    await s.text(x, headY, c.label, { size: 20, weight: 700, fill: color, within: { x0: x, x1: x + COL_W, y0: tb, y1: barY } });
    for (const [r, { lines, y }] of bodies[i].entries()) {
      const h = lines.length * LINE_H + 2 * PAD_Y, base = y + PAD_Y + 16;
      s.raw(`<circle cx="${n2(x + 4)}" cy="${n2(base - 5)}" r="3.5" fill="${color}"/>`);
      for (const [k, l] of lines.entries())
        await s.text(x + BULLET, base + k * LINE_H, l, { size: FS_ITEM, within: { x0: x, x1: x + COL_W, y0: y, y1: y + h } });
      if (r < bodies[i].length - 1) s.raw(line(x + BULLET, y + h, x + COL_W, y + h, "#ffffff", 2));
    }
  }
  s.raw(`<line x1="${n2(colX(0) - PX)}" y1="${n2(barY)}" x2="${n2(colX(n - 1) + COL_W + PX)}" y2="${n2(barY)}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
  for (let i = 1; i < n; i++)
    s.raw(`<line x1="${n2(colX(i) - GUT / 2)}" y1="${n2(barY)}" x2="${n2(colX(i) - GUT / 2)}" y2="${n2(bottom)}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
  const H = Math.ceil(bottom + M);
  const desc = `A T-chart with ${n} columns — ${doc.columns.map((c) => `${c.label} (${c.items.length} points)`).join(" and ")}. Coloured headings sit above one heavy rule; each column's points lie on a pale panel of its colour, and a vertical rule runs down between the panels.`;
  return { s, W, H, desc };
}

// ---------------------------------------------------------------- pros and cons

async function prosCons(doc) {
  const s = sheet();
  const COL_W = 424, GUT = 52, TEXT_X = 32, LINE_H = 21, PAD_Y = 13;
  const W = 2 * M + 2 * COL_W + GUT;
  const colX = (i) => M + i * (COL_W + GUT);
  const tb = await title(s, doc.title, W);
  const headY = tb + 58, barY = headY + 17;
  const sides = [
    { label: "Pros", items: doc.pros, kind: "yes", color: GREEN },
    { label: "Cons", items: doc.cons, kind: "no", color: RED },
  ];
  const wrapped = [];
  for (const [i, sd] of sides.entries()) {
    const x = colX(i);
    s.raw(solidBadge(sd.kind, x + 11, headY - 5, 11));
    await s.text(x + 30, headY, sd.label, { size: 16, weight: 600 });
    await s.text(x + COL_W, headY, `${sd.items.length}`, { size: 14, weight: 600, fill: sd.color, anchor: "end" });
    s.raw(line(x, barY, x + COL_W, barY, sd.color, 2));
    wrapped.push(await Promise.all(sd.items.map((it) => wrap(it, FS_BODY, 400, COL_W - TEXT_X - 4))));
  }
  const rows = Math.max(doc.pros.length, doc.cons.length);
  let y = barY;
  for (let r = 0; r < rows; r++) {
    const h = Math.max(...wrapped.map((w) => w[r]?.length ?? 0)) * LINE_H + 2 * PAD_Y;
    for (const [i, w] of wrapped.entries()) {
      if (!w[r]) continue;
      const x = colX(i), base = y + PAD_Y + 15;
      s.raw(badge(sides[i].kind, x + 10, base - 4.5, 10));
      for (const [k, l] of w[r].entries())
        await s.text(x + TEXT_X, base + k * LINE_H, l, { within: { x0: x, x1: x + COL_W, y0: y, y1: y + h } });
      if (w[r + 1]) s.raw(line(x + TEXT_X, y + h, x + COL_W, y + h, HAIR));
    }
    y += h;
  }
  const H = Math.ceil(y + M);
  const desc = `Pros and cons for "${doc.title}": ${doc.pros.length} pros in a green-headed column on the left, ${doc.cons.length} cons in a red-headed column on the right, each point marked with a tick or a cross.`;
  return { s, W, H, desc };
}

// ---------------------------------------------------------------- matrix

const MARKS = new Set(["yes", "partial", "no"]);

async function matrix(doc) {
  const s = sheet();
  const PAD = 16, ROW_MIN = 46, LINE_H = 20;
  let critW = 0;
  for (const c of doc.criteria) critW = Math.max(critW, await measure(c.label, FS_BODY, 500));
  critW = Math.ceil(Math.min(270, critW + 2 * PAD));
  let optW = 124;
  for (const o of doc.options) optW = Math.max(optW, (await measure(o, FS_HEAD, 600)) + 2 * PAD);
  for (const c of doc.criteria)
    for (const o of doc.options) { const v = c.cells[o]; if (v && !MARKS.has(v)) optW = Math.max(optW, (await measure(v, FS_BODY)) + 2 * PAD); }
  optW = Math.ceil(optW);
  const tableW = critW + doc.options.length * optW;
  const W = 2 * M + tableW;
  const x0 = M, optX = (i) => x0 + critW + i * optW;
  const tb = await title(s, doc.title, W);
  const headTop = tb + 30, headBottom = headTop + 50;
  for (const [i, o] of doc.options.entries())
    await s.text(optX(i) + optW / 2, headBottom - 17, o, { size: FS_HEAD, weight: 600, anchor: "middle", within: { x0: optX(i), x1: optX(i) + optW, y0: headTop, y1: headBottom } });
  let y = headBottom;
  const body = [];
  for (const [r, c] of doc.criteria.entries()) {
    const lines = await wrap(c.label, FS_BODY, 500, critW - 2 * PAD);
    const h = Math.max(ROW_MIN, lines.length * LINE_H + 24);
    if (r % 2 === 1) s.raw(rect(x0, y, tableW, h, WASH));
    const mid = y + h / 2;
    for (const [k, l] of lines.entries())
      await s.text(x0 + PAD, mid + 4.8 + (k - (lines.length - 1) / 2) * LINE_H, l, { weight: 500, within: { x0, x1: x0 + critW, y0: y, y1: y + h } });
    for (const [i, o] of doc.options.entries()) {
      const v = c.cells[o];
      if (!v) continue;
      if (MARKS.has(v)) body.push(badge(v, optX(i) + optW / 2, mid, 10));
      else await s.text(optX(i) + optW / 2, mid + 4.8, v, { anchor: "middle", within: { x0: optX(i), x1: optX(i) + optW, y0: y, y1: y + h } });
    }
    y += h;
  }
  s.raw(body.join("\n"));
  s.raw(line(x0, headBottom, x0 + tableW, headBottom, INK, 1.5));
  s.raw(line(x0, y, x0 + tableW, y, RULE));
  // Key: only the marks the table actually uses.
  const used = ["yes", "partial", "no"].filter((k) => doc.criteria.some((c) => Object.values(c.cells).includes(k)));
  const keyY = y + 34;
  let kx = x0;
  for (const k of used) {
    s.raw(badge(k, kx + 9, keyY - 4.2, 9));
    const label = { yes: "Yes", partial: "Partly", no: "No" }[k];
    kx += 26 + (await s.text(kx + 24, keyY, label, { size: 12.5, fill: SLATE })) + 22;
  }
  const H = Math.ceil(keyY + M - 8);
  const desc = `A comparison matrix of ${doc.options.length} options (${doc.options.join(", ")}) against ${doc.criteria.length} criteria. Cells hold either a measured value or a yes, partly or no mark on a tinted disc; a key under the table names the marks.`;
  return { s, W, H, desc };
}

// ---------------------------------------------------------------- decision

const ordinal = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
const signed = (d) => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "±0");

async function decision(doc) {
  const s = sheet();
  const totals = Object.fromEntries(doc.options.map((o) => [o, doc.criteria.reduce((n, c) => n + c.weight * Number(c.cells[o] ?? 0), 0)]));
  const ranks = Object.fromEntries(doc.options.map((o) => [o, 1 + doc.options.filter((p) => totals[p] > totals[o]).length]));
  const winner = doc.options.reduce((best, o) => (totals[o] > totals[best] ? o : best), doc.options[0]);
  const datum = doc.options.includes(doc.baseline) ? doc.baseline : "";

  const PAD = 16, LINE_H = 20, ROW_MIN = 54, WEIGHT_W = 84;
  let critW = 0;
  for (const c of doc.criteria) critW = Math.max(critW, await measure(c.label, FS_BODY, 500));
  critW = Math.ceil(Math.min(250, Math.max(critW, await measure("Weighted total", FS_BODY, 600)) + 2 * PAD));
  let optW = 124;
  for (const o of doc.options) optW = Math.max(optW, (await measure(o, FS_HEAD, 600)) + 2 * PAD);
  optW = Math.ceil(optW);
  const tableW = critW + WEIGHT_W + doc.options.length * optW;
  const W = 2 * M + tableW;
  const x0 = M, weightX = x0 + critW, optX = (i) => weightX + WEIGHT_W + i * optW;
  const tb = await title(s, doc.title, W);

  const headTop = tb + 30, headBottom = headTop + 62;
  const rowHeights = [];
  const critLines = [];
  for (const c of doc.criteria) {
    const lines = await wrap(c.label, FS_BODY, 500, critW - 2 * PAD);
    critLines.push(lines);
    rowHeights.push(Math.max(ROW_MIN, lines.length * LINE_H + 28));
  }
  const bodyBottom = headBottom + rowHeights.reduce((a, b) => a + b, 0);
  const totalBottom = bodyBottom + 62, deltaBottom = totalBottom + (datum ? 46 : 0);

  // Column washes first, so every rule and number sits on top of them.
  for (const [i, o] of doc.options.entries()) {
    if (o === winner) {
      s.raw(rect(optX(i), headTop, optW, deltaBottom - headTop, GREEN_COL));
      s.raw(rect(optX(i), headTop, optW, 3, GREEN));
    } else if (o === datum) s.raw(rect(optX(i), headTop, optW, deltaBottom - headTop, WASH));
  }

  await s.text(weightX + WEIGHT_W / 2, headTop + 32, "Weight", { size: 12.5, weight: 500, fill: SLATE, anchor: "middle" });
  for (const [i, o] of doc.options.entries()) {
    const cx = optX(i) + optW / 2, cell = { x0: optX(i), x1: optX(i) + optW, y0: headTop, y1: headBottom };
    await s.text(cx, headTop + 32, o, { size: FS_HEAD, weight: 600, anchor: "middle", within: cell });
    if (o === winner) await s.text(cx, headTop + 50, "Highest total", { size: FS_SMALL, weight: 600, fill: GREEN, anchor: "middle", within: cell });
    else if (o === datum) await s.text(cx, headTop + 50, "Datum", { size: FS_SMALL, weight: 600, fill: SLATE, anchor: "middle", within: cell });
  }

  let y = headBottom;
  for (const [r, c] of doc.criteria.entries()) {
    const h = rowHeights[r], mid = y + h / 2;
    if (r > 0) s.raw(line(x0, y, x0 + tableW, y, HAIR));
    for (const [k, l] of critLines[r].entries())
      await s.text(x0 + PAD, mid + 4.8 + (k - (critLines[r].length - 1) / 2) * LINE_H, l, { weight: 500, within: { x0, x1: weightX, y0: y, y1: y + h } });
    s.raw(`<rect x="${n2(weightX + WEIGHT_W / 2 - 19)}" y="${n2(mid - 11)}" width="38" height="22" rx="11" fill="#ffffff" stroke="${RULE}" stroke-width="1"/>`);
    await s.text(weightX + WEIGHT_W / 2, mid + 4.6, `×${c.weight}`, { size: 13, weight: 600, fill: SLATE, anchor: "middle" });
    for (const [i, o] of doc.options.entries()) {
      const score = Number(c.cells[o] ?? 0), cx = optX(i) + optW / 2, cell = { x0: optX(i), x1: optX(i) + optW, y0: y, y1: y + h };
      await s.text(cx, mid + 1, String(score), { size: 16, weight: 500, anchor: "middle", within: cell });
      await s.text(cx, mid + 18, `${score * c.weight} pts`, { size: FS_SMALL, fill: FAINT, anchor: "middle", within: cell });
    }
    y += h;
  }

  // Weighted total: the computed answer, so it gets the heaviest rule and type.
  await s.text(x0 + PAD, bodyBottom + 28, "Weighted total", { weight: 600 });
  await s.text(x0 + PAD, bodyBottom + 45, "sum of score × weight", { size: FS_SMALL, fill: SLATE });
  for (const [i, o] of doc.options.entries()) {
    const cx = optX(i) + optW / 2, win = o === winner;
    await s.text(cx, bodyBottom + 29, String(totals[o]), { size: 19, weight: 700, fill: win ? GREEN : INK, anchor: "middle" });
    const pill = ordinal(ranks[o]);
    s.raw(win
      ? `<rect x="${n2(cx - 18)}" y="${n2(bodyBottom + 37)}" width="36" height="17" rx="8.5" fill="${GREEN}"/>`
      : `<rect x="${n2(cx - 18)}" y="${n2(bodyBottom + 37)}" width="36" height="17" rx="8.5" fill="#ffffff" stroke="${RULE}" stroke-width="1"/>`);
    await s.text(cx, bodyBottom + 49.5, pill, { size: 10.5, weight: 700, fill: win ? "#ffffff" : SLATE, anchor: "middle" });
  }
  if (datum) {
    s.raw(line(x0, totalBottom, x0 + tableW, totalBottom, HAIR));
    await s.text(x0 + PAD, totalBottom + 28, `Versus the ${datum} datum`, { weight: 500 });
    for (const [i, o] of doc.options.entries()) {
      const cx = optX(i) + optW / 2, d = totals[o] - totals[datum];
      if (o === datum) await s.text(cx, totalBottom + 28, "datum", { size: 12, fill: FAINT, anchor: "middle" });
      else await s.text(cx, totalBottom + 28.5, signed(d), { size: 14.5, weight: 600, fill: d > 0 ? GREEN : d < 0 ? RED : SLATE, anchor: "middle" });
    }
  }
  s.raw(line(x0, headBottom, x0 + tableW, headBottom, INK, 1.5));
  s.raw(line(x0, bodyBottom, x0 + tableW, bodyBottom, INK, 1.5));
  s.raw(line(x0, deltaBottom, x0 + tableW, deltaBottom, RULE));

  const order = [...doc.options].sort((a, b) => totals[b] - totals[a]);
  const second = order[1];
  const lead = datum && winner !== datum ? `, ${totals[winner] - totals[datum]} ahead of the ${datum} datum` : "";
  const capY = deltaBottom + 36;
  await s.text(x0, capY, `${winner} wins with ${totals[winner]} points${lead}; ${second} is second with ${totals[second]}.`, { size: 13.5 });
  await s.text(x0, capY + 21, "Each cell shows the score and, beneath it, the points it earns: the score times the criterion’s weight.", { size: 12, fill: SLATE });
  const H = Math.ceil(capY + 21 + M - 6);
  const desc = `A weighted decision matrix: ${doc.options.length} options scored against ${doc.criteria.length} weighted criteria. The computed weighted totals rank ${order.map((o) => `${o} ${totals[o]}`).join(", ")}; ${winner} wins and its column is tinted green${datum ? `, and a final row gives each option's difference from the ${datum} datum` : ""}.`;
  return { s, W, H, desc };
}

// ---------------------------------------------------------------- double bubble

async function doubleBubble(doc) {
  const s = sheet();
  const FS_B = 13, LH = 17, GAP = 16;
  const fit = async (text) => {
    let best = null;
    for (let w = 60; w <= 190; w += 4) {
      const lines = await wrap(text, FS_B, 400, w);
      if (lines.length > 3) continue;
      let bw = 0;
      for (const l of lines) bw = Math.max(bw, await measure(l, FS_B));
      const r = Math.hypot(bw / 2, (lines.length * LH) / 2) + 8;
      if (!best || r < best.r - 0.5) best = { lines, r };
    }
    return best;
  };
  const fits = new Map();
  for (const t of [...doc.shared, ...doc.leftOnly, ...doc.rightOnly]) fits.set(t, await fit(t));
  const rb = Math.ceil(Math.max(...[...fits.values()].map((f) => f.r)));
  const centreLabelW = Math.max(await measure(doc.left, 19, 600), await measure(doc.right, 19, 600));
  const Rc = Math.ceil(Math.max(rb + 16, centreLabelW / 2 + 22));

  const nodes = [];
  const pitch = 2 * rb + GAP;
  const D = Rc + rb + 116;
  doc.shared.forEach((t, i) => nodes.push({ id: `shared${i}`, text: t, cx: 0, cy: (i - (doc.shared.length - 1) / 2) * pitch, r: rb, role: "shared" }));
  nodes.push({ id: "left", text: doc.left, cx: -D, cy: 0, r: Rc, role: "left" });
  nodes.push({ id: "right", text: doc.right, cx: D, cy: 0, r: Rc, role: "right" });
  const ring = (items, side) => {
    const k = items.length;
    let Ro = Rc + rb + 66;
    const step = () => 2 * Math.asin(Math.min(1, (2 * rb + GAP) / (2 * Ro)));
    while ((k - 1) * step() > (150 * Math.PI) / 180) Ro += 4;
    const st = step(), centre = side === "left" ? -D : D, outward = side === "left" ? -1 : 1;
    // Top to bottom in the order written, on both sides, so the nth unique trait
    // of one subject sits level with the nth of the other.
    items.forEach((t, j) => {
      const a = (j - (k - 1) / 2) * st;
      nodes.push({ id: `${side}${j}`, text: t, cx: centre + outward * Ro * Math.cos(a), cy: Ro * Math.sin(a), r: rb, role: `${side}-only` });
    });
  };
  ring(doc.leftOnly, "left");
  ring(doc.rightOnly, "right");

  const tb = await title(s, doc.title, 900);
  const minX = Math.min(...nodes.map((n) => n.cx - n.r)), maxX = Math.max(...nodes.map((n) => n.cx + n.r));
  const minY = Math.min(...nodes.map((n) => n.cy - n.r)), maxY = Math.max(...nodes.map((n) => n.cy + n.r));
  const W = Math.ceil(maxX - minX + 2 * M + 20);
  const dx = M + 10 - minX, dy = tb + 44 - minY;
  for (const n of nodes) { n.cx += dx; n.cy += dy; s.circles.push(n); }
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const links = [
    ...doc.shared.flatMap((_, i) => [["left", `shared${i}`], ["right", `shared${i}`]]),
    ...doc.leftOnly.map((_, j) => ["left", `left${j}`]),
    ...doc.rightOnly.map((_, j) => ["right", `right${j}`]),
  ];
  for (const [a, b] of links) {
    const A = byId[a], B = byId[b];
    const len = Math.hypot(B.cx - A.cx, B.cy - A.cy), ux = (B.cx - A.cx) / len, uy = (B.cy - A.cy) / len;
    const k = { a, b, x1: A.cx + ux * A.r, y1: A.cy + uy * A.r, x2: B.cx - ux * B.r, y2: B.cy - uy * B.r };
    s.links.push(k);
    s.raw(`<line x1="${n2(k.x1)}" y1="${n2(k.y1)}" x2="${n2(k.x2)}" y2="${n2(k.y2)}" stroke="${LINK}" stroke-width="1.5" stroke-linecap="round"/>`);
  }
  const style = {
    left: [BLUE, BLUE, "#ffffff"], right: [PLUM, PLUM, "#ffffff"],
    "left-only": [BLUE_T, BLUE, INK], "right-only": [PLUM_T, PLUM, INK], shared: ["#ffffff", SLATE, INK],
  };
  for (const n of nodes) {
    const [fill, stroke, text] = style[n.role];
    const centre = n.role === "left" || n.role === "right";
    s.raw(`<circle cx="${n2(n.cx)}" cy="${n2(n.cy)}" r="${n.r}" fill="${fill}"${centre ? "" : ` stroke="${stroke}" stroke-width="1.3"`}/>`);
    if (centre) { await s.text(n.cx, n.cy + 6.5, n.text, { size: 19, weight: 600, fill: text, anchor: "middle" }); continue; }
    const { lines } = fits.get(n.text);
    for (const [k, l] of lines.entries()) {
      const y = n.cy + 4.6 + (k - (lines.length - 1) / 2) * LH;
      const w = await s.text(n.cx, y, l, { size: FS_B, fill: text, anchor: "middle" });
      for (const [px, py] of [[n.cx - w / 2, y - 10], [n.cx + w / 2, y - 10], [n.cx - w / 2, y + 3], [n.cx + w / 2, y + 3]])
        if (Math.hypot(px - n.cx, py - n.cy) > n.r - 3) s.problems.push(`"${l}" pokes out of its bubble`);
    }
  }
  const leftGroup = nodes.filter((n) => n.role === "left" || n.role === "left-only");
  const rightGroup = nodes.filter((n) => n.role === "right" || n.role === "right-only");
  const midOf = (g) => (Math.min(...g.map((n) => n.cx - n.r)) + Math.max(...g.map((n) => n.cx + n.r))) / 2;
  const capY = maxY + dy + 38;
  await s.text(midOf(leftGroup), capY, `Only ${doc.left}`, { size: 12.5, weight: 600, fill: BLUE, anchor: "middle" });
  await s.text(byId.shared0 ? byId.shared0.cx : W / 2, capY, "Both", { size: 12.5, weight: 600, fill: SLATE, anchor: "middle" });
  await s.text(midOf(rightGroup), capY, `Only ${doc.right}`, { size: 12.5, weight: 600, fill: PLUM, anchor: "middle" });
  const H = Math.ceil(capY + M - 8);
  const desc = `A double-bubble map comparing ${doc.left} and ${doc.right}. The two subjects are large circles, ${doc.left} in blue on the left and ${doc.right} in plum on the right. The ${doc.shared.length} traits they share stand in a column between them, each joined to both; the ${doc.leftOnly.length} traits unique to ${doc.left} fan out to its left and the ${doc.rightOnly.length} unique to ${doc.right} fan out to its right.`;
  return { s, W, H, desc };
}

// ---------------------------------------------------------------- run

const DRAW = { tchart, "pros-cons": prosCons, matrix, decision, "double-bubble": doubleBubble };
let failed = false;
for (const mode of Object.keys(DRAW)) {
  const doc = parse(await readFile(new URL(`${mode}/source.sx`, DIR), "utf8"));
  if (doc.mode !== mode) throw new Error(`${mode}/source.sx declares mode "${doc.mode}"`);
  const { s, W, H, desc } = await DRAW[mode](doc);
  const problems = verify(s, W, H);
  if (problems.length) { failed = true; console.log(`${mode}: ${problems.length} problems\n  ${problems.join("\n  ")}`); continue; }
  await writeFile(new URL(`${mode}/ideal.svg`, DIR), svgDoc(W, H, doc, desc, s));
  console.log(`${mode}: ${W}x${H}, ${s.texts.length} texts, 0 problems`);
}
await browser.close();
if (failed) process.exit(1);
