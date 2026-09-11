/** Draw the STRIDE threat-model cases' `ideal.svg` — the targets the engine is
 *  aiming at.
 *
 * One kit draws all six, so the set is one drawing repeated. The notation is
 * the DFD vocabulary that `docs/reference/46-THREAT-MODEL-STRIDE-STANDARD.md`
 * inherits from `31-DFD-STANDARD.md` §5: an external entity is a rectangle, a
 * process is a circle, a data store is two parallel horizontal lines with the
 * label between them, and a data flow is a labelled arrow.
 *
 * What makes it a *threat* model rather than a data-flow diagram is the two
 * things the engine is supposed to compute, and which this target therefore
 * shows outright:
 *
 *   1. STRIDE-per-element — every element wears the threat letters that apply
 *      to its kind: external S·R, process S·T·R·I·D·E, data store T·R?·I·D,
 *      data flow T·I·D.
 *   2. Trust-boundary crossings — a flow whose two ends sit in different trust
 *      zones is where spoofing, tampering and disclosure actually bite, so
 *      those flows are the only red thing on the page and they are counted in
 *      the footer.
 *
 * Trust zones are drawn as dashed columns. Microsoft's tool draws the boundary
 * itself red; this keeps the boundary neutral and spends red on the crossings
 * instead, which is the choice the standard doc leaves open and the one that
 * keeps the danger signal sharp.
 *
 *   node scripts/visual-eval/draw-threatmodel-target.mjs           # all cases
 *   node scripts/visual-eval/draw-threatmodel-target.mjs web-app
 */
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

const INK = "#0f172a";
const LINE = "#1e293b";
const MUTED = "#475569";
const FAINT = "#64748b";
const HAIR = "#dbe2ea";
const ZONE = "#94a3b8";        // trust-boundary rule: neutral, so red stays rare
const ZONE_FILL = "#f8fafc";
const RISK = "#b02a37";        // reserved for boundary-crossing flows
const RISK_FILL = "#fbeced";

const M = 46;
const FS_TITLE = 18, FS_DECK = 9.5, FS_EL = 12.5, FS_FLOW = 11, FS_BADGE = 8.5, FS_ZONE = 11, FS_NOTE = 10.5;
const COL_GAP = 214;           // wide enough that a flow label lives in the gap, not on a zone
const ROW_PITCH = 196;
const HEAD_LEN = 10, HEAD_HALF = 3.6;

/** STRIDE-per-element, from the standard's core table. */
const STRIDE = {
  external: ["S", "R"],
  process: ["S", "T", "R", "I", "D", "E"],
  datastore: ["T", "R?", "I", "D"],
  flow: ["T", "I", "D"],
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 100) / 100;

const browser = await chromium.launch();
const page = await browser.newPage();
const ruler = await browser.newPage();
await ruler.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (text, size, weight = 400) => {
  const key = `${weight}|${size}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const w = await ruler.evaluate(
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
  const out = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    const trial = line ? `${line} ${w}` : w;
    if (line && (await measure(trial, size, weight)) > limit) { out.push(line); line = w; }
    else line = trial;
  }
  if (line) out.push(line);
  return out;
};

// ---------------------------------------------------------------- parse

const parse = (src) => {
  const doc = { title: "", els: new Map(), flows: [], zones: [] };
  for (const raw of src.split("\n")) {
    const line = raw.replace(/^\s*#.*$/, "").trim();
    if (!line) continue;
    let m;
    if ((m = /^threatmodel\s+"(.*)"/.exec(line))) { doc.title = m[1]; continue; }
    if ((m = /^(external|process|datastore)\s+(\w+)\s*:\s*(.+)$/.exec(line))) {
      doc.els.set(m[2], { id: m[2], kind: m[1], name: m[3].trim() });
      continue;
    }
    if ((m = /^(\w+)\s*->\s*(\w+)\s*:\s*(.+)$/.exec(line))) {
      doc.flows.push({ from: m[1], to: m[2], label: m[3].trim() });
      continue;
    }
    if ((m = /^boundary\s+"(.*)"\s*\{(.*)\}\s*$/.exec(line))) {
      doc.zones.push({ name: m[1], members: m[2].split(",").map((s) => s.trim()).filter(Boolean) });
      continue;
    }
  }
  for (const [i, z] of doc.zones.entries())
    for (const id of z.members) if (doc.els.has(id)) doc.els.get(id).zone = i;
  return doc;
};

// ---------------------------------------------------------------- sheet

class Sheet {
  constructor(id, title, deck) {
    Object.assign(this, { id, title, deck });
    this.back = []; this.wires = []; this.shapes = []; this.texts = [];
    this.labels = []; this.blocks = []; this.solids = [];
    this.maxX = -Infinity; this.maxY = -Infinity;
  }
  grow(x, y, w = 0, h = 0) { this.maxX = Math.max(this.maxX, x + w); this.maxY = Math.max(this.maxY, y + h); }

  async at(x, y, s, { size = FS_FLOW, weight = 400, fill = INK, anchor = "start", block = "", extra = "", knock = false } = {}) {
    const w = await measure(s, size, weight);
    const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    if (knock) this.shapes.push(`<rect x="${n2(left - 5)}" y="${n2(y - size * 0.84)}" width="${n2(w + 10)}" height="${n2(size * 1.2)}" fill="#ffffff"/>`);
    this.texts.push(
      `<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT_SVG}" font-size="${size}"` +
      (weight !== 400 ? ` font-weight="${weight}"` : "") +
      ` fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${extra}>${esc(s)}</text>`
    );
    this.labels.push({ x: left, y: y - size * 0.8, w, h: size * 1.12, s, block });
    this.grow(left, y - size * 0.8, w, size * 1.12);
  }

  /** Does this box already run into a label or an element? */
  occupied(box, pad = 6) {
    const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
    return this.labels.some((l) => hit(box, l)) || this.solids.some((r) => hit(box, r));
  }

  /** Place text at the first candidate position that is free; fall back to the last. */
  async tryAt(cands, text, opts = {}) {
    const size = opts.size ?? FS_FLOW;
    const w = await measure(text, size, opts.weight ?? 400);
    for (const [x, y, anchor] of cands) {
      const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
      if (!this.occupied({ x: left, y: y - size * 0.8, w, h: size * 1.12 }))
        return this.at(x, y, text, { ...opts, anchor });
    }
    const [x, y, anchor] = cands[cands.length - 1];
    return this.at(x, y, text, { ...opts, anchor });
  }

  path(d, { stroke = LINE, width = 1.6, dash = "" } = {}) {
    this.wires.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""} stroke-linejoin="round" stroke-linecap="butt"/>`);
  }

  head(x, y, ux, uy, stroke = LINE) {
    const px = -uy, py = ux, bx = x - ux * HEAD_LEN, by = y - uy * HEAD_LEN;
    this.shapes.push(`<path d="M ${n2(x)} ${n2(y)} L ${n2(bx + px * HEAD_HALF)} ${n2(by + py * HEAD_HALF)} L ${n2(bx - px * HEAD_HALF)} ${n2(by - py * HEAD_HALF)} Z" fill="${stroke}"/>`);
  }

  /** A STRIDE badge: the threat letters that apply to this element's kind. */
  async badge(cx, y, letters, risk = false) {
    const s = letters.join(" · ");
    const w = (await measure(s, FS_BADGE, 700)) + 18;
    this.shapes.push(`<rect x="${n2(cx - w / 2)}" y="${n2(y - 9)}" width="${n2(w)}" height="18" rx="9" fill="${risk ? RISK_FILL : "#eef2f6"}" stroke="${risk ? RISK : ZONE}" stroke-width="1"/>`);
    this.texts.push(`<text x="${n2(cx)}" y="${n2(y + 3.5)}" font-family="${FONT_SVG}" font-size="${FS_BADGE}" font-weight="700" fill="${risk ? RISK : MUTED}" text-anchor="middle" letter-spacing="0.6">${esc(s)}</text>`);
    this.labels.push({ x: cx - w / 2, y: y - 9, w, h: 18, s, block: `badge-${cx}-${y}` });
    this.grow(cx - w / 2, y - 9, w, 18);
  }

  render() {
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img">`);
    o.push(`<title>${esc(this.title)}</title>`);
    o.push(`<desc>${esc(this.desc || "")}</desc>`);
    o.push(`<rect x="0" y="0" width="${this.w}" height="${this.h}" fill="#ffffff"/>`);
    o.push(`<text x="${M}" y="46" font-family="${FONT_SVG}" font-size="${FS_TITLE}" font-weight="700" fill="${INK}">${esc(this.title)}</text>`);
    o.push(`<text x="${M}" y="65" font-family="${FONT_SVG}" font-size="${FS_DECK}" font-weight="600" fill="${FAINT}" letter-spacing="1.3">${esc(this.deck)}</text>`);
    o.push(`<line x1="${M}" y1="78" x2="${this.w - M}" y2="78" stroke="${HAIR}" stroke-width="1"/>`);
    o.push(...this.back, ...this.wires, ...this.shapes, ...this.texts);
    o.push("</svg>");
    return o.join("\n") + "\n";
  }
}

// ---------------------------------------------------------------- build

const build = async (name) => {
  const dir = `visual-eval/cases/threatmodel-${name}`;
  const doc = parse(await readFile(`${dir}/source.sx`, "utf8"));
  const s = new Sheet(`threatmodel-${name}`, doc.title, "STRIDE THREAT MODEL · DATA-FLOW DIAGRAM");

  // Trust zones become columns, in declaration order; members stack down each.
  const cols = doc.zones.map((z) => ({ ...z, els: z.members.map((id) => doc.els.get(id)).filter(Boolean) }));

  // Size every element from its own label.
  for (const c of cols) {
    for (const e of c.els) {
      if (e.kind === "process") {
        e.lines = await wrap(e.name, 130, FS_EL, 600);
        let widest = 0;
        for (const l of e.lines) widest = Math.max(widest, await measure(l, FS_EL, 600));
        e.r = Math.max(50, widest / 2 + 16, e.lines.length * 9 + 34);
        e.hw = e.r; e.hh = e.r;
      } else {
        e.lines = await wrap(e.name, 190, FS_EL, 600);
        let widest = 0;
        for (const l of e.lines) widest = Math.max(widest, await measure(l, FS_EL, 600));
        e.hw = Math.max(84, widest / 2 + 18);
        e.hh = e.kind === "external" ? 34 : 26;
      }
    }
    c.hw = Math.max(...c.els.map((e) => e.hw));
  }

  // Column x, element y.
  let x = M + 14;
  const TOP = 152;
  for (const c of cols) {
    c.x1 = x; c.cx = x + c.hw + 26; c.x2 = c.cx + c.hw + 26;
    c.els.forEach((e, i) => { e.cx = c.cx; e.cy = TOP + 150 + i * ROW_PITCH; });
    x = c.x2 + COL_GAP;
  }
  const bottom = Math.max(...cols.flatMap((c) => c.els.map((e) => e.cy + e.hh)));
  const zoneBottom = bottom + 46;

  // Zone frames first, so everything else sits over them.
  for (const c of cols) {
    s.back.push(`<rect x="${n2(c.x1)}" y="${TOP}" width="${n2(c.x2 - c.x1)}" height="${n2(zoneBottom - TOP)}" rx="10" fill="${ZONE_FILL}" stroke="${ZONE}" stroke-width="1.6" stroke-dasharray="7 5"/>`);
    await s.at(c.cx, TOP + 26, c.name.toUpperCase(), { size: FS_ZONE, weight: 700, fill: MUTED, anchor: "middle", extra: ' letter-spacing="1.2"' });
  }

  // Every element and badge is an obstacle before a single flow label is placed.
  for (const c of cols)
    for (const e of c.els) {
      s.solids.push({ x: e.cx - e.hw, y: e.cy - e.hh, w: e.hw * 2, h: e.hh * 2, s: e.id });
      const bw = (await measure(STRIDE[e.kind].join(" · "), FS_BADGE, 700)) + 18;
      s.solids.push({ x: e.cx - bw / 2, y: e.cy - e.hh - 31, w: bw, h: 18, s: `${e.id}-badge` });
    }

  // Flows. A flow whose ends sit in different zones is the risk locus.
  const crossings = [];
  for (const f of doc.flows) {
    f.a = doc.els.get(f.from); f.b = doc.els.get(f.to);
    f.cross = f.a.zone !== f.b.zone;
    if (f.cross) crossings.push(f);
  }
  const idxIn = (e) => cols[e.zone].els.indexOf(e);
  const lanes = new Map();
  let farChannels = 0;
  for (const f of doc.flows) {
    const { a, b } = f;
    const stroke = f.cross ? RISK : LINE;
    const width = f.cross ? 1.9 : 1.5;
    const span = Math.abs(a.zone - b.zone);
    const opts = { size: FS_FLOW, fill: f.cross ? RISK : MUTED, knock: true };
    const label = async (cands) => s.tryAt(cands, f.label, opts);

    if (span === 0 && Math.abs(idxIn(a) - idxIn(b)) === 1) {
      // Neighbours in one zone: a short vertical hop.
      const up = b.cy < a.cy;
      const y1 = up ? a.cy - a.hh : a.cy + a.hh;
      const y2 = up ? b.cy + b.hh + HEAD_LEN : b.cy - b.hh - HEAD_LEN;
      s.path(`M ${n2(a.cx)} ${n2(y1)} L ${n2(a.cx)} ${n2(y2)}`, { stroke, width });
      s.head(a.cx, up ? b.cy + b.hh : b.cy - b.hh, 0, up ? -1 : 1, stroke);
      // Offsets are measured from the element edge, not a fraction of it: the
      // STRIDE badge is centred and can be wider than a slim element.
      const mid = (y1 + y2) / 2 + 4;
      const out = a.hw + 12;
      await label([
        [a.cx + out, mid, "start"], [a.cx - out, mid, "end"],
        [a.cx + out, y1 + (up ? -14 : 18), "start"], [a.cx - out, y1 + (up ? -14 : 18), "end"],
        [a.cx + out + 40, mid, "start"], [a.cx - out - 40, mid, "end"],
        [a.cx + 14, mid, "start"],
      ]);
    } else if (span === 0) {
      // Same zone but skipping a neighbour: go round the inside edge of the zone.
      const col = cols[a.zone];
      const side = col.x2 - 16;
      const down = b.cy > a.cy;
      s.path(`M ${n2(a.cx + a.hw)} ${n2(a.cy)} L ${n2(side)} ${n2(a.cy)} L ${n2(side)} ${n2(b.cy)} L ${n2(b.cx + b.hw + HEAD_LEN)} ${n2(b.cy)}`, { stroke, width });
      s.head(b.cx + b.hw, b.cy, -1, 0, stroke);
      const cands = [];
      for (const t of [0.3, 0.2, 0.42, 0.12, 0.5, 0.62, 0.74])
        for (const [dx, anchor] of [[10, "start"], [-10, "end"], [0, "middle"]])
          cands.push([side + dx, a.cy + (b.cy - a.cy) * t + 4, anchor]);
      await label(cands);
      void down;
    } else if (span === 1) {
      // Adjacent zones: run in the gap, one lane per flow.
      const fwd = b.zone > a.zone;
      const key = `${Math.min(a.zone, b.zone)}|${fwd}`;
      const seen = lanes.get(key) ?? 0;
      lanes.set(key, seen + 1);
      const left = cols[Math.min(a.zone, b.zone)], right = cols[Math.max(a.zone, b.zone)];
      const mid = (left.x2 + right.x1) / 2;
      const labelW = await measure(f.label, FS_FLOW);
      const want = mid + (fwd ? -1 : 1) * 34 + (fwd ? seen : -seen) * 26;
      const lane = Math.min(Math.max(want, left.x2 + labelW / 2 + 14), right.x1 - labelW / 2 - 14);
      const dir = fwd ? 1 : -1;
      const sx = fwd ? a.cx + a.hw : a.cx - a.hw;
      const tx = fwd ? b.cx - b.hw : b.cx + b.hw;
      if (Math.abs(a.cy - b.cy) < 2) {
        s.path(`M ${n2(sx)} ${n2(a.cy)} L ${n2(tx - dir * HEAD_LEN)} ${n2(a.cy)}`, { stroke, width });
        await label([[(sx + tx) / 2, a.cy - 11, "middle"], [(sx + tx) / 2, a.cy + 20, "middle"]]);
      } else {
        s.path(`M ${n2(sx)} ${n2(a.cy)} L ${n2(lane)} ${n2(a.cy)} L ${n2(lane)} ${n2(b.cy)} L ${n2(tx - dir * HEAD_LEN)} ${n2(b.cy)}`, { stroke, width });
        const ly = (a.cy + b.cy) / 2 + 4;
        await label([0, -26, 26, -52, 52, -78, 78].map((d) => [lane, ly + d + (seen - 1) * 26, "middle"]));
      }
      s.head(tx, b.cy, dir, 0, stroke);
    } else {
      // Two zones or more apart: go round underneath, clear of every zone.
      const ch = zoneBottom + 22 + farChannels * 26;
      farChannels++;
      const dir = b.cx > a.cx ? 1 : -1;
      s.path(`M ${n2(a.cx)} ${n2(a.cy + a.hh)} L ${n2(a.cx)} ${n2(ch)} L ${n2(b.cx)} ${n2(ch)} L ${n2(b.cx)} ${n2(b.cy + b.hh + HEAD_LEN)}`, { stroke, width });
      s.head(b.cx, b.cy + b.hh, 0, -1, stroke);
      await label([[(a.cx + b.cx) / 2, ch - 6, "middle"], [(a.cx + b.cx) / 2, ch + 18, "middle"]]);
      void dir;
    }
  }

  // Elements over the flows.
  for (const c of cols) {
    for (const e of c.els) {
      if (e.kind === "external") {
        s.shapes.push(`<rect x="${n2(e.cx - e.hw)}" y="${n2(e.cy - e.hh)}" width="${n2(e.hw * 2)}" height="${n2(e.hh * 2)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.8"/>`);
      } else if (e.kind === "process") {
        s.shapes.push(`<circle cx="${n2(e.cx)}" cy="${n2(e.cy)}" r="${n2(e.r)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.8"/>`);
      } else {
        s.shapes.push(`<rect x="${n2(e.cx - e.hw)}" y="${n2(e.cy - e.hh)}" width="${n2(e.hw * 2)}" height="${n2(e.hh * 2)}" fill="#ffffff" stroke="none"/>`);
        for (const yy of [e.cy - e.hh, e.cy + e.hh])
          s.path(`M ${n2(e.cx - e.hw)} ${n2(yy)} L ${n2(e.cx + e.hw)} ${n2(yy)}`, { width: 2.2 });
      }
      const k = e.lines.length;
      for (const [i, l] of e.lines.entries())
        await s.at(e.cx, e.cy + 4.5 - ((k - 1) * 16) / 2 + i * 16, l, { size: FS_EL, weight: 600, anchor: "middle", block: `el-${e.id}` });
      await s.badge(e.cx, e.cy - e.hh - 22, STRIDE[e.kind]);
    }
  }

  // Footer: what the drawing computed.
  const legendY = zoneBottom + 42 + farChannels * 26;
  await s.at(M, legendY, `${crossings.length} of ${doc.flows.length} flows cross a trust boundary`, { size: FS_NOTE, weight: 700, fill: RISK });
  await s.at(M, legendY + 18, crossings.map((f) => `${f.a.name} → ${f.b.name}`).join("   ·   "), { size: FS_NOTE, fill: MUTED });
  await s.at(M, legendY + 42, "Rectangle = external entity (S·R)  —  Circle = process (S·T·R·I·D·E)  —  Parallel lines = data store (T·R?·I·D)  —  Every data flow carries T·I·D", { size: FS_NOTE, fill: FAINT });
  await s.at(M, legendY + 60, "Trust boundaries are drawn neutral; red is reserved for the flows that cross one, which is where spoofing, tampering and disclosure bite.", { size: FS_NOTE, fill: FAINT });

  s.w = Math.ceil(Math.max(s.maxX, x - COL_GAP) + M);
  s.h = Math.ceil(legendY + 60 + M);
  s.desc =
    `A STRIDE threat model of ${doc.title}, drawn as a data-flow diagram over ${cols.length} trust zones: ${cols.map((c) => c.name).join(", ")}. ` +
    `${[...doc.els.values()].filter((e) => e.kind === "external").length} external entities are drawn as rectangles, ` +
    `${[...doc.els.values()].filter((e) => e.kind === "process").length} processes as circles, and ` +
    `${[...doc.els.values()].filter((e) => e.kind === "datastore").length} data stores as two parallel horizontal lines with the label between them. ` +
    `Each element carries the STRIDE letters that apply to its kind. Of the ${doc.flows.length} data flows, ${crossings.length} cross a trust boundary — ` +
    `${crossings.map((f) => `${f.a.name} to ${f.b.name}`).join(", ")} — and those are the only ones drawn in red, because a boundary crossing is where the spoofing, tampering and disclosure threats actually bite.`;
  return s;
};

// ---------------------------------------------------------------- verify

const duplicateAttributes = (svgText) => {
  const out = [];
  for (const el of svgText.match(/<[a-zA-Z]+\s[^>]*>/g) ?? []) {
    const names = [...el.matchAll(/([a-zA-Z-]+)="/g)].map((m) => m[1]);
    const dup = [...new Set(names.filter((n) => names.filter((m) => m === n).length > 1))];
    if (dup.length) out.push(`duplicate ${dup.join(", ")} on ${el.slice(0, 60)}…`);
  }
  return [...new Set(out)];
};

const check = (sheet) =>
  page.evaluate(
    ([labels, W, H]) => {
      const pad = 5;
      const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
      const out = [];
      for (let i = 0; i < labels.length; i++) {
        const a = labels[i];
        if (a.x < 6 || a.y < 6 || a.x + a.w > W - 6 || a.y + a.h > H - 6) out.push(`canvas edge: "${a.s}"`);
        for (let j = i + 1; j < labels.length; j++) {
          if (a.block && a.block === labels[j].block) continue;
          if (hit(a, labels[j])) out.push(`label/label: "${a.s}" x "${labels[j].s}"`);
        }
      }
      return [...new Set(out)];
    },
    [sheet.labels, sheet.w, sheet.h]
  );

// ---------------------------------------------------------------- run

const ALL = ["cicd-supply-chain", "healthcare-records", "iot-cloud", "mobile-banking", "payment-processing", "web-app"];
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
let failed = 0;
for (const name of names) {
  const sheet = await build(name);
  const svgText = sheet.render();
  await page.setContent(`<style>html,body{margin:0}</style>${svgText}`);
  const found = [...duplicateAttributes(svgText), ...(await check(sheet))];
  if (found.length) {
    failed++;
    console.error(`threatmodel-${name} collides, not written:\n  ${found.join("\n  ")}`);
    continue;
  }
  await writeFile(`visual-eval/cases/threatmodel-${name}/ideal.svg`, svgText);
  console.log(`threatmodel-${name}: ${sheet.w}x${sheet.h}, 0 collisions`);
}
await browser.close();
if (failed) process.exit(1);
