/** Draw the block-diagram cases' `ideal.svg` — the targets the engine is aiming at.
 *
 * One kit draws all eight, reproducing the idiom of
 * `visual-eval/exemplars/blockdiagram/ideal.svg`: ink outlines on white, one
 * accent (terracotta) spent on nothing but the feedback path, block labels at
 * 13 over at most two lines, signal names in italic slate beside the wire,
 * a 34 px summing junction with its signs set just outside the circle, a
 * filled dot at every pickoff, orthogonal wires, and a legend at the foot.
 *
 * Layout follows the exemplar's own solution to a long chain: rank the blocks by
 * longest path, lay the ranks left to right, and when the row would outrun the
 * page, fold it into bands joined by a labelled channel. Feedback returns in
 * its own band below everything, which is what keeps the wire crossings at zero.
 *
 *   node scripts/visual-eval/draw-blockdiagram-target.mjs          # all cases
 *   node scripts/visual-eval/draw-blockdiagram-target.mjs control-loop
 */
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

const INK = "#16202B";
const SLATE = "#63707F";
const RULE = "#C9D2DC";
const ACCENT = "#B4462A";      // the feedback path, and nothing else
const BUS_FILL = "#EEF2F6";

/** Light fills keyed to the block's declared `role:`. The DSL states the role
 *  on every block, so a drawing that leaves every body white is throwing away
 *  information the author supplied. Kept pale and outlined in ink, so the
 *  terracotta accent stays the loudest thing on the page and still means only
 *  one thing: the measured/feedback path. */
const ROLE_FILL = {
  reference: "#F5F7F9", input: "#EDF3FA", controller: "#E7EFFA", actuator: "#E9F5EC",
  plant: "#F6F1E7", sensor: "#F3EDF8", output: "#FBF3E5", generic: "#FFFFFF",
};
const ROLE_NAME = {
  reference: "Reference", input: "Input", controller: "Control", actuator: "Actuator",
  plant: "Plant", sensor: "Sensor", output: "Output",
};

const M = 46;
const U = 8;                   // spacing unit
const FS_TITLE = 22, FS_SUB = 12.5, FS_BLOCK = 13, FS_SIG = 11.5, FS_CAP = 11;
const BLOCK_R = 4, W_BLOCK = 1.5, W_WIRE = 1.5;
const SUM_R = 17, DOT_R = 3.5;
const HEAD_L = 9, HEAD_W = 3.5;
const COL_GAP = 116, ROW_GAP = 46;
const MAX_ROW = 1600;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 100) / 100;

const browser = await chromium.launch();
const page = await browser.newPage();
const ruler = await browser.newPage();
await ruler.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (text, size, weight = 400, style = "normal") => {
  const key = `${style}|${weight}|${size}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const w = await ruler.evaluate(
    ([t, s, wt, st, f]) => {
      const ctx = document.getElementById("c").getContext("2d");
      ctx.font = `${st} ${wt} ${s}px ${f}`;
      return ctx.measureText(t).width;
    },
    [text, size, weight, style, FONT]
  );
  cache.set(key, w);
  return w;
};

// ---------------------------------------------------------------- parse

const parse = (src) => {
  const doc = { title: "", deck: "", nodes: new Map(), edges: [] };
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) { if (!doc.deck) doc.deck = line.replace(/^#\s*/, "").replace(/\.$/, ""); continue; }
    let m;
    if ((m = /^blockdiagram\s+"(.*)"/.exec(line))) { doc.title = m[1]; continue; }
    if ((m = /^(\w+)\s*=\s*(block|signal)\(\s*"((?:[^"\\]|\\.)*)"\s*\)\s*(?:\[(.*)\])?/.exec(line))) {
      const role = /role:\s*(\w[\w-]*)/.exec(m[4] ?? "")?.[1] ?? "generic";
      doc.nodes.set(m[1], { id: m[1], kind: m[2], label: m[3].replace(/\\n/g, "\n"), role });
      continue;
    }
    if ((m = /^(\w+)\s*=\s*sum\((.*)\)/.exec(line))) {
      const terms = m[2].split(",").map((t) => t.trim()).map((t) => ({ sign: t[0] === "-" ? "-" : "+", id: t.replace(/^[+-]/, "") }));
      doc.nodes.set(m[1], { id: m[1], kind: "sum", label: "", role: "sum", terms });
      continue;
    }
    if ((m = /^(\w+)\s*->\s*(\w+)\s*(?:\[\s*"(.*)"\s*\])?/.exec(line))) {
      doc.edges.push({ from: m[1], to: m[2], label: m[3] ?? "" });
      continue;
    }
  }
  return doc;
};

/** Longest-path ranks over the acyclic part; edges that would close a cycle are
 *  the feedback edges, which is exactly what the accent colour is for. */
const rank = (doc) => {
  const ids = [...doc.nodes.keys()];
  const out = new Map(ids.map((i) => [i, []]));
  for (const e of doc.edges) if (out.has(e.from) && doc.nodes.has(e.to)) out.get(e.from).push(e.to);
  const state = new Map(ids.map((i) => [i, 0]));
  const back = new Set();
  const walk = (id) => {
    state.set(id, 1);
    for (const t of out.get(id)) {
      if (state.get(t) === 1) back.add(`${id}->${t}`);
      else if (state.get(t) === 0) walk(t);
    }
    state.set(id, 2);
  };
  for (const id of ids) if (state.get(id) === 0) walk(id);
  for (const e of doc.edges) e.back = back.has(`${e.from}->${e.to}`);

  const r = new Map(ids.map((i) => [i, 0]));
  for (let pass = 0; pass < ids.length + 2; pass++)
    for (const e of doc.edges)
      if (!e.back && doc.nodes.has(e.from) && doc.nodes.has(e.to))
        r.set(e.to, Math.max(r.get(e.to), r.get(e.from) + 1));
  return r;
};

// ---------------------------------------------------------------- sheet

class Sheet {
  constructor(id, title, deck) {
    Object.assign(this, { id, title, deck });
    this.back = []; this.wires = []; this.shapes = []; this.texts = [];
    this.labels = []; this.solids = []; this.segs = [];
    this.maxX = -Infinity; this.maxY = -Infinity;
  }
  grow(x, y, w = 0, h = 0) { this.maxX = Math.max(this.maxX, x + w); this.maxY = Math.max(this.maxY, y + h); }

  async at(x, y, s, { size = FS_SIG, weight = 400, fill = INK, anchor = "start", style = "normal", block = "", knock = false } = {}) {
    const w = await measure(s, size, weight, style);
    const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    if (knock) this.shapes.push(`<rect x="${n2(left - 4)}" y="${n2(y - size * 0.84)}" width="${n2(w + 8)}" height="${n2(size * 1.2)}" fill="#ffffff"/>`);
    this.texts.push(
      `<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT_SVG}" font-size="${size}"` +
      (weight !== 400 ? ` font-weight="${weight}"` : "") +
      (style !== "normal" ? ` font-style="${style}"` : "") +
      ` fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}>${esc(s)}</text>`
    );
    this.labels.push({ x: left, y: y - size * 0.8, w, h: size * 1.12, s, block });
    this.grow(left, y - size * 0.8, w, size * 1.12);
  }

  occupied(box, pad = 5) {
    const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
    if (this.labels.some((l) => hit(box, l)) || this.solids.some((r) => hit(box, r))) return true;
    return this.segs.some((g) => Sheet.segNearBox(g, box, 3));
  }

  /** Does a wire segment run through, or graze, this label box? */
  static segNearBox([x1, y1, x2, y2], b, pad) {
    const X0 = b.x - pad, X1 = b.x + b.w + pad, Y0 = b.y - pad, Y1 = b.y + b.h + pad;
    const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
      if (px >= X0 && px <= X1 && py >= Y0 && py <= Y1) return true;
    }
    return false;
  }

  async tryAt(cands, text, opts = {}) {
    const size = opts.size ?? FS_SIG;
    const w = await measure(text, size, opts.weight ?? 400, opts.style ?? "normal");
    for (const [x, y, anchor] of cands) {
      const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
      if (!this.occupied({ x: left, y: y - size * 0.8, w, h: size * 1.12 }))
        return this.at(x, y, text, { ...opts, anchor });
    }
    // Nothing on the shortlist was free: sweep away from the last candidate
    // before giving up and knocking a hole in whatever is underneath.
    const [x, y, anchor] = cands[cands.length - 1];
    for (let d = 16; d <= 140; d += 16)
      for (const dy of [-d, d]) {
        const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
        if (!this.occupied({ x: left, y: y + dy - size * 0.8, w, h: size * 1.12 }))
          return this.at(x, y + dy, text, { ...opts, anchor });
      }
    return this.at(x, y, text, { ...opts, anchor, knock: true });
  }

  path(d, { stroke = INK, width = W_WIRE, dash = "" } = {}) {
    // Keep the segments: the exemplar's checker tests every label against every
    // wire, not just against other labels.
    const pts = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
    for (let i = 1; i < pts.length; i++) this.segs.push([...pts[i - 1], ...pts[i]]);
    this.wires.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""} stroke-linejoin="round" stroke-linecap="butt"/>`);
  }
  head(x, y, ux, uy, stroke = INK) {
    const px = -uy, py = ux, bx = x - ux * HEAD_L, by = y - uy * HEAD_L;
    this.shapes.push(`<path d="M ${n2(x)} ${n2(y)} L ${n2(bx + px * HEAD_W)} ${n2(by + py * HEAD_W)} L ${n2(bx - px * HEAD_W)} ${n2(by - py * HEAD_W)} Z" fill="${stroke}"/>`);
  }
  /** Do these segments run through any block other than the two they join? */
  crosses(segs, skip) {
    return this.solids.some((r) => {
      if (skip.includes(r.s)) return false;
      const X0 = r.x + 3, X1 = r.x + r.w - 3, Y0 = r.y + 3, Y1 = r.y + r.h - 3;
      return segs.some(([x1, y1, x2, y2]) => {
        const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3));
        for (let t = 0; t <= steps; t++) {
          const px = x1 + ((x2 - x1) * t) / steps, py = y1 + ((y2 - y1) * t) / steps;
          if (px > X0 && px < X1 && py > Y0 && py < Y1) return true;
        }
        return false;
      });
    });
  }

  dot(x, y, fill = INK) { this.shapes.push(`<circle cx="${n2(x)}" cy="${n2(y)}" r="${DOT_R}" fill="${fill}"/>`); }

  render() {
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img">`);
    o.push(`<title>${esc(this.title)}</title>`);
    o.push(`<desc>${esc(this.desc || "")}</desc>`);
    o.push(`<rect x="0" y="0" width="${this.w}" height="${this.h}" fill="#ffffff"/>`);
    o.push(`<text x="${M}" y="48" font-family="${FONT_SVG}" font-size="${FS_TITLE}" font-weight="600" fill="${INK}">${esc(this.title)}</text>`);
    o.push(`<text x="${M}" y="70" font-family="${FONT_SVG}" font-size="${FS_SUB}" fill="${SLATE}">${esc(this.deck)}</text>`);
    o.push(`<line x1="${M}" y1="84" x2="${this.w - M}" y2="84" stroke="${RULE}" stroke-width="1"/>`);
    o.push(...this.back, ...this.wires, ...this.shapes, ...this.texts);
    o.push("</svg>");
    return o.join("\n") + "\n";
  }
}

// ---------------------------------------------------------------- build

const build = async (name) => {
  const dir = `visual-eval/cases/blockdiagram-${name}`;
  const doc = parse(await readFile(`${dir}/source.sx`, "utf8"));
  const r = rank(doc);

  // Which blocks sit on the return leg of a feedback loop? Walk back from the
  // source of every back-edge until the forward chain is reached; those blocks,
  // and the wires along the way, are the only terracotta on the page.
  const inTo = new Map([...doc.nodes.keys()].map((i) => [i, []]));
  for (const e of doc.edges) if (inTo.has(e.to)) inTo.get(e.to).push(e);
  const fbNodes = new Set();
  for (const e of doc.edges.filter((x) => x.back)) {
    let cur = e.from, guard = 0;
    while (cur && guard++ < 24) {
      const n = doc.nodes.get(cur);
      if (!n || n.kind === "sum") break;
      const feeders = inTo.get(cur) ?? [];
      const onlyFeeder = feeders.length === 1 ? feeders[0].from : null;
      fbNodes.add(cur);
      if (!onlyFeeder) break;
      const up = doc.nodes.get(onlyFeeder);
      if (!up || up.kind === "sum") break;
      // stop as soon as we reach a block that also drives the forward chain
      const drivesForward = doc.edges.some((x) => x.from === onlyFeeder && !x.back && !fbNodes.has(x.to) && doc.nodes.get(x.to)?.kind !== "sum");
      if (drivesForward) break;
      cur = onlyFeeder;
    }
  }
  const fbEdge = (e) => e.back || fbNodes.has(e.from) || (fbNodes.has(e.to) && !doc.edges.some((x) => x === e && !x.back && !fbNodes.has(x.from)) && fbNodes.has(e.to) && fbNodes.has(e.from));

  const s = new Sheet(`blockdiagram-${name}`, doc.title,
    doc.deck.replace(/^Assumptions:\s*/i, "").replace(/^Scenario:\s*/i, ""));

  // Size every node from its own label.
  for (const n of doc.nodes.values()) {
    if (n.kind === "sum") { n.hw = SUM_R; n.hh = SUM_R; continue; }
    n.lines = n.label.split("\n");
    if (n.lines.length === 1 && n.label.length > 20) {
      const words = n.label.split(" ");
      const mid = Math.ceil(words.length / 2);
      n.lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
    }
    let widest = 0;
    for (const l of n.lines) widest = Math.max(widest, await measure(l, FS_BLOCK, 500));
    n.hw = Math.max(60, widest / 2 + 2 * U);
    n.hh = n.kind === "signal" ? 15 : (n.lines.length > 1 ? 28 : 23);
  }

  // Columns by rank; feedback-side blocks are held out for their own band.
  const forward = [...doc.nodes.values()].filter((n) => !fbNodes.has(n.id));
  const byRank = new Map();
  for (const n of forward) {
    const k = r.get(n.id);
    if (!byRank.has(k)) byRank.set(k, []);
    byRank.get(k).push(n);
  }
  const cols = [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([k, ns]) => ({ k, ns, hw: Math.max(...ns.map((n) => n.hw)) }));

  // Fold the column run into bands so no band outruns the page.
  const bands = [];
  let cur = [], width = 0;
  for (const c of cols) {
    const add = c.hw * 2 + (cur.length ? COL_GAP : 0);
    if (cur.length && width + add > MAX_ROW) { bands.push(cur); cur = []; width = 0; }
    cur.push(c);
    width += c.hw * 2 + (cur.length > 1 ? COL_GAP : 0);
  }
  if (cur.length) bands.push(cur);

  const TOP = 132;
  let y = TOP;
  for (const b of bands) {
    let x = M + 14;
    const rowH = Math.max(...b.flatMap((c) => c.ns.map((n) => n.hh)));
    for (const c of b) {
      c.cx = x + c.hw;
      const stack = c.ns.length;
      c.ns.forEach((n, i) => {
        n.cx = c.cx;
        n.cy = y + rowH + (i - (stack - 1) / 2) * (n.hh * 2 + 44);
      });
      x = c.cx + c.hw + COL_GAP;
    }
    b.y = y + rowH;
    // A stacked column reaches above the band's centre line, so measure the
    // band's real top and push the whole band down until it clears the channel.
    b.top = Math.min(...b.flatMap((c) => c.ns.map((n) => n.cy - n.hh)));
    if (b.top < y) {
      const shift = y - b.top;
      for (const c of b) for (const n of c.ns) n.cy += shift;
      b.y += shift; b.top += shift;
    }
    b.bottom = Math.max(...b.flatMap((c) => c.ns.map((n) => n.cy + n.hh)));
    y = b.bottom + 132;   // the fold channel sits halfway down this gap
  }

  // Feedback band, right to left, under everything.
  const fbList = [...doc.nodes.values()].filter((n) => fbNodes.has(n.id));
  let fbY = 0;
  if (fbList.length) {
    fbY = Math.max(...bands.map((b) => b.bottom)) + 108;
    const lastBand = bands[bands.length - 1];
    const rightEdge = Math.max(...lastBand.flatMap((c) => c.ns.map((n) => n.cx + n.hw)));
    let x = rightEdge;
    for (const n of fbList) { n.cx = x - n.hw; n.cy = fbY; x = n.cx - n.hw - COL_GAP; }
  }

  for (const n of doc.nodes.values()) s.solids.push({ x: n.cx - n.hw, y: n.cy - n.hh, w: n.hw * 2, h: n.hh * 2, s: n.id });

  // ---- wires
  const bandOf = (n) => bands.findIndex((b) => b.some((c) => c.ns.includes(n)));
  const lanes = new Map();
  const pending = [];
  for (const e of doc.edges) {
    const a = doc.nodes.get(e.from), b = doc.nodes.get(e.to);
    if (!a || !b) continue;
    // The whole measured path is terracotta, including the pickoff into the
    // first sensing block — that is how the exemplar draws load → encoder.
    const accent = e.back || fbNodes.has(a.id) || fbNodes.has(b.id);
    const stroke = accent ? ACCENT : INK;
    const ba = fbNodes.has(a.id) ? -1 : bandOf(a), bb = fbNodes.has(b.id) ? -1 : bandOf(b);
    const sig = async (cands) => { if (e.label) pending.push({ cands, text: e.label }); };

    // A straight shot is only straight if nothing stands in the way.
    const straightOK = ba === bb && ba !== -1 && Math.abs(a.cy - b.cy) < 2 && b.cx > a.cx &&
      !s.crosses([[a.cx + a.hw, a.cy, b.cx - b.hw, b.cy]], [a.id, b.id]);
    if (straightOK) {
      const x1 = a.cx + a.hw, x2 = b.cx - b.hw;
      s.path(`M ${n2(x1)} ${n2(a.cy)} L ${n2(x2 - HEAD_L)} ${n2(a.cy)}`, { stroke });
      s.head(x2, b.cy, 1, 0, stroke);
      const mx = (x1 + x2) / 2, top = Math.min(a.cy - a.hh, b.cy - b.hh), bot = Math.max(a.cy + a.hh, b.cy + b.hh);
      await sig([[mx, a.cy - 10, "middle"], [mx, top - 12, "middle"], [mx, bot + 20, "middle"], [mx, top - 30, "middle"]]);
    } else if (ba === bb && ba !== -1 && b.cx > a.cx) {
      // Two ways round the corner; take whichever misses every other block.
      const x1 = a.cx + a.hw, x2 = b.cx - b.hw;
      const down = b.cy > a.cy;
      const bEdge = down ? b.cy - b.hh : b.cy + b.hh;
      const optA = { pts: [[x1, a.cy], [b.cx, a.cy], [b.cx, bEdge - (down ? HEAD_L : -HEAD_L)]], into: "v" };
      const kx = a.cx + a.hw + COL_GAP / 2;
      const optB = { pts: [[x1, a.cy], [kx, a.cy], [kx, b.cy], [x2 - HEAD_L, b.cy]], into: "h" };
      // Last resort for a long reach across a crowded row: drop into the channel
      // under the band, run along it, and come back up into the target.
      const lane = bands[ba].bottom + 40 + (lanes.get(`u${ba}`) ?? 0) * 16;
      const optC = { pts: [[a.cx, a.cy + a.hh], [a.cx, lane], [b.cx, lane], [b.cx, b.cy + b.hh + HEAD_L]], into: "u" };
      const segsOf = (o) => o.pts.slice(1).map((p, i) => [...o.pts[i], ...p]);
      const pick = [optB, optA, optC].find((o) => !s.crosses(segsOf(o), [a.id, b.id])) ?? optC;
      if (pick === optC) lanes.set(`u${ba}`, (lanes.get(`u${ba}`) ?? 0) + 1);
      s.path("M " + pick.pts.map(([px, py]) => `${n2(px)} ${n2(py)}`).join(" L "), { stroke });
      if (pick.into === "h") s.head(x2, b.cy, 1, 0, stroke);
      else if (pick.into === "u") s.head(b.cx, b.cy + b.hh, 0, -1, stroke);
      else s.head(b.cx, bEdge, 0, down ? 1 : -1, stroke);
      const mid = pick.into === "h" ? kx : pick.into === "u" ? (a.cx + b.cx) / 2 : b.cx;
      const my = pick.into === "u" ? lane : (a.cy + b.cy) / 2;
      const cands = [];
      for (const dy of [0, -22, 22, -44, 44, -66, 66, -14, 14])
        for (const [dx, an] of [[10, "start"], [-10, "end"]]) cands.push([mid + dx, my + dy, an]);
      cands.push([(x1 + mid) / 2, a.cy - 10, "middle"], [(mid + x2) / 2, b.cy - 10, "middle"],
                 [(x1 + mid) / 2, a.cy + 22, "middle"], [(mid + x2) / 2, b.cy + 22, "middle"]);
      await sig(cands);
    } else if (ba !== -1 && bb === ba + 1) {
      // Fold: leave the end of one band, drop into the channel, enter the next.
      const key = `fold${ba}`;
      const seen = lanes.get(key) ?? 0; lanes.set(key, seen + 1);
      const ch = (bands[ba].bottom + bands[bb].top) / 2 + seen * 18;
      s.path(`M ${n2(a.cx + a.hw)} ${n2(a.cy)} L ${n2(a.cx + a.hw + 30)} ${n2(a.cy)} L ${n2(a.cx + a.hw + 30)} ${n2(ch)} L ${n2(b.cx - b.hw - 30)} ${n2(ch)} L ${n2(b.cx - b.hw - 30)} ${n2(b.cy)} L ${n2(b.cx - b.hw - HEAD_L)} ${n2(b.cy)}`, { stroke });
      s.head(b.cx - b.hw, b.cy, 1, 0, stroke);
      await sig([0, 1, 2, 3].flatMap((i) => [[(a.cx + b.cx) / 2 + i * 40, ch - 10, "middle"], [(a.cx + b.cx) / 2 + i * 40, ch + 20, "middle"]]));
    } else {
      // Anything else — feedback return, or a long reach — goes round below.
      const key = "under";
      const seen = lanes.get(key) ?? 0; lanes.set(key, seen + 1);
      const ch = (fbList.length ? fbY : Math.max(...bands.map((bb2) => bb2.bottom)) + 70) + (fbList.length ? 0 : seen * 20);
      if (fbNodes.has(a.id) && b.kind === "sum") {
        s.path(`M ${n2(a.cx - a.hw)} ${n2(a.cy)} L ${n2(b.cx)} ${n2(a.cy)} L ${n2(b.cx)} ${n2(b.cy + SUM_R + HEAD_L)}`, { stroke });
        s.head(b.cx, b.cy + SUM_R, 0, -1, stroke);
        await sig([0, -24, 24].map((d) => [b.cx + 14, (a.cy + b.cy) / 2 + d, "start"]).concat([[a.cx - a.hw - 12, a.cy - 10, "end"], [(a.cx + b.cx) / 2, a.cy - 12, "middle"]]));
      } else if (fbNodes.has(a.id) && fbNodes.has(b.id)) {
        // Along the return leg: straight right to left.
        s.path(`M ${n2(a.cx - a.hw)} ${n2(a.cy)} L ${n2(b.cx + b.hw + HEAD_L)} ${n2(b.cy)}`, { stroke });
        s.head(b.cx + b.hw, b.cy, -1, 0, stroke);
        await sig([[(a.cx + b.cx) / 2, a.cy - 12, "middle"], [(a.cx + b.cx) / 2, a.cy + 22, "middle"]]);
      } else if (fbNodes.has(b.id)) {
        // Pickoff on the forward line just past the source — never on top of the
        // next block — then down and across into the sensing block's top edge.
        const px = a.cx + a.hw + 40;
        const lane = b.cy - b.hh - 34;
        s.dot(px, a.cy, stroke);
        s.path(`M ${n2(a.cx + a.hw)} ${n2(a.cy)} L ${n2(px)} ${n2(a.cy)} L ${n2(px)} ${n2(lane)} L ${n2(b.cx)} ${n2(lane)} L ${n2(b.cx)} ${n2(b.cy - b.hh - HEAD_L)}`, { stroke });
        s.head(b.cx, b.cy - b.hh, 0, 1, stroke);
        await sig([0, -22, 22].flatMap((d) => [[px + 12, (a.cy + lane) / 2 + d, "start"], [px - 12, (a.cy + lane) / 2 + d, "end"]]).concat([[(px + b.cx) / 2, lane - 10, "middle"]]));
      } else {
        const dir = b.cx >= a.cx ? 1 : -1;
        s.path(`M ${n2(a.cx)} ${n2(a.cy + a.hh)} L ${n2(a.cx)} ${n2(ch)} L ${n2(b.cx)} ${n2(ch)} L ${n2(b.cx)} ${n2(b.cy + b.hh + HEAD_L)}`, { stroke });
        s.head(b.cx, b.cy + b.hh, 0, -1, stroke);
        await sig([0, 1, 2, 3, 4].flatMap((i) => [[(a.cx + b.cx) / 2 + i * 46, ch - 8, "middle"], [(a.cx + b.cx) / 2 + i * 46, ch + 18, "middle"]]));
        void dir;
      }
    }
  }

  for (const p_ of pending) await s.tryAt(p_.cands, p_.text, { size: FS_SIG, style: "italic", fill: SLATE });

  // ---- nodes
  for (const n of doc.nodes.values()) {
    const accent = fbNodes.has(n.id);
    const stroke = accent ? ACCENT : INK;
    if (n.kind === "sum") {
      s.shapes.push(`<circle cx="${n2(n.cx)}" cy="${n2(n.cy)}" r="${SUM_R}" fill="#ffffff" stroke="${INK}" stroke-width="${W_BLOCK}"/>`);
      await s.at(n.cx - SUM_R - 12, n.cy - 6, "+", { size: 14, weight: 600, fill: INK, anchor: "middle", block: `sum-${n.id}` });
      await s.at(n.cx - 13, n.cy + SUM_R + 16, "−", { size: 14, weight: 600, fill: ACCENT, anchor: "middle", block: `sum-${n.id}` });
      continue;
    }
    if (n.kind === "signal") {
      s.shapes.push(`<rect x="${n2(n.cx - n.hw)}" y="${n2(n.cy - n.hh)}" width="${n2(n.hw * 2)}" height="${n2(n.hh * 2)}" rx="${n.hh}" fill="${BUS_FILL}" stroke="${SLATE}" stroke-width="1.2"/>`);
      await s.at(n.cx, n.cy + 4, n.lines.join(" "), { size: FS_SIG, weight: 600, fill: SLATE, anchor: "middle", block: `n-${n.id}` });
      continue;
    }
    s.shapes.push(`<rect x="${n2(n.cx - n.hw)}" y="${n2(n.cy - n.hh)}" width="${n2(n.hw * 2)}" height="${n2(n.hh * 2)}" rx="${BLOCK_R}" fill="${ROLE_FILL[n.role] ?? "#ffffff"}" stroke="${stroke}" stroke-width="${W_BLOCK}"/>`);
    const k = n.lines.length;
    for (const [i, l] of n.lines.entries())
      await s.at(n.cx, n.cy + 4.5 - ((k - 1) * 16) / 2 + i * 16, l, { size: FS_BLOCK, weight: 500, fill: INK, anchor: "middle", block: `n-${n.id}` });
  }

  // ---- legend
  const legendY = Math.max(s.maxY, fbList.length ? fbY + 40 : 0) + 56;
  let lx = M;
  const items = [["Forward signal path", INK, false]];
  if (fbList.length || doc.edges.some((e) => e.back)) items.push(["Feedback / measured path", ACCENT, false]);
  if (doc.edges.some((e) => fbNodes.has(e.to))) items.push(["Pickoff (branch) point", INK, true]);
  const rolesUsed = [...new Set([...doc.nodes.values()].filter((n) => n.kind === "block" && ROLE_NAME[n.role]).map((n) => n.role))]
    .sort((a, b) => Object.keys(ROLE_NAME).indexOf(a) - Object.keys(ROLE_NAME).indexOf(b));
  for (const [text, colour, isDot] of items) {
    if (isDot) s.dot(lx + 14, legendY - 4, colour);
    else {
      s.path(`M ${lx} ${legendY - 4} L ${lx + 28 - HEAD_L} ${legendY - 4}`, { stroke: colour });
      s.head(lx + 28, legendY - 4, 1, 0, colour);
    }
    await s.at(lx + 38, legendY, text, { size: FS_CAP, fill: SLATE });
    lx += 38 + (await measure(text, FS_CAP)) + 44;
  }

  let rx2 = M;
  const roleY = legendY + (rolesUsed.length ? 26 : 0);
  for (const role of rolesUsed) {
    s.shapes.push(`<rect x="${n2(rx2)}" y="${n2(roleY - 12)}" width="26" height="14" rx="3" fill="${ROLE_FILL[role]}" stroke="${INK}" stroke-width="1.2"/>`);
    await s.at(rx2 + 36, roleY, ROLE_NAME[role], { size: FS_CAP, fill: SLATE });
    rx2 += 36 + (await measure(ROLE_NAME[role], FS_CAP)) + 30;
  }
  s.w = Math.ceil(Math.max(s.maxX, lx, rx2) + M);
  s.h = Math.ceil(roleY + M);
  const fwd = [...doc.nodes.values()].filter((n) => n.kind === "block" && !fbNodes.has(n.id));
  s.desc =
    `A functional block diagram of ${doc.title}. ` +
    `${fwd.length} blocks carry the forward signal path${bands.length > 1 ? `, folded into ${bands.length} rows joined by a labelled channel so the chain stays readable` : ""}. ` +
    (doc.nodes.size && [...doc.nodes.values()].some((n) => n.kind === "sum")
      ? `A summing junction takes the reference on its left input and the measurement on its bottom input, with the signs set just outside the circle. ` : "") +
    (fbList.length ? `The feedback path — ${fbList.map((n) => n.label.replace(/\n/g, " ")).join(", ")} — returns in its own band below the forward chain and is the only terracotta on the page. ` : "") +
    `Every wire is orthogonal, every arrowhead lands on a block edge, signal names are set in italic beside the wire they name, and a legend at the foot states the line codes.`;
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
    ([labels, solids, segs, W, H]) => {
      const pad = 4;
      const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
      const out = [];
      for (let i = 0; i < labels.length; i++) {
        const a = labels[i];
        if (a.x < 6 || a.y < 6 || a.x + a.w > W - 6 || a.y + a.h > H - 6) out.push(`canvas edge: "${a.s}"`);
        for (let j = i + 1; j < labels.length; j++) {
          if (a.block && a.block === labels[j].block) continue;
          if (hit(a, labels[j])) out.push(`label/label: "${a.s}" x "${labels[j].s}"`);
        }
        for (const r of solids) if (hit(a, r) && a.block !== `n-${r.s}` && a.block !== `sum-${r.s}`) out.push(`label/block: "${a.s}" on ${r.s}`);
        if (a.block) continue;
        const X0 = a.x - 2, X1 = a.x + a.w + 2, Y0 = a.y - 2, Y1 = a.y + a.h + 2;
        for (const [x1, y1, x2, y2] of segs) {
          const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3));
          let on = false;
          for (let t = 0; t <= steps && !on; t++) {
            const px = x1 + ((x2 - x1) * t) / steps, py = y1 + ((y2 - y1) * t) / steps;
            if (px >= X0 && px <= X1 && py >= Y0 && py <= Y1) on = true;
          }
          if (on) { out.push(`label/wire: "${a.s}"`); break; }
        }
      }
      // A wire that runs through a block body is a routing fault, not a label one.
      for (const r of solids) {
        const X0 = r.x + 3, X1 = r.x + r.w - 3, Y0 = r.y + 3, Y1 = r.y + r.h - 3;
        for (const [x1, y1, x2, y2] of segs) {
          const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3));
          let through = false;
          for (let t = 0; t <= steps && !through; t++) {
            const px = x1 + ((x2 - x1) * t) / steps, py = y1 + ((y2 - y1) * t) / steps;
            if (px > X0 && px < X1 && py > Y0 && py < Y1) through = true;
          }
          if (through) { out.push(`wire through block ${r.s}`); break; }
        }
      }
      return [...new Set(out)];
    },
    [sheet.labels, sheet.solids, sheet.segs, sheet.w, sheet.h]
  );

// ---------------------------------------------------------------- run

const ALL = ["audio-signal-chain", "control-loop", "electric-vehicle-powertrain", "embedded-system",
             "radar-receiver", "satellite-communications", "video-streaming-pipeline", "web-app-architecture"];
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
let failed = 0;
for (const name of names) {
  const sheet = await build(name);
  const svgText = sheet.render();
  await page.setContent(`<style>html,body{margin:0}</style>${svgText}`);
  const found = [...duplicateAttributes(svgText), ...(await check(sheet))];
  if (found.length) {
    failed++;
    console.error(`blockdiagram-${name} collides, not written:\n  ${found.join("\n  ")}`);
    continue;
  }
  await writeFile(`visual-eval/cases/blockdiagram-${name}/ideal.svg`, svgText);
  console.log(`blockdiagram-${name}: ${sheet.w}x${sheet.h}, 0 collisions`);
}
await browser.close();
if (failed) process.exit(1);
