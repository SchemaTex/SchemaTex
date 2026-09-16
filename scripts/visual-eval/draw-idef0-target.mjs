/** Draw the IDEF0 cases' `ideal.svg` — the targets the engine is aiming at.
 *
 * One kit draws all five, so the set is one drawing repeated. The rules come
 * from `docs/reference/45-IDEF0-STANDARD.md` (FIPS PUB 183), and in IDEF0 they
 * are semantics rather than taste:
 *
 *   - ICOM placement: Inputs enter the LEFT edge, Controls the TOP, Outputs
 *     leave the RIGHT, Mechanisms enter the BOTTOM pointing up.
 *   - Each arrow's label sits outside the box at the arrow's open end.
 *   - Boxes step on a diagonal staircase, upper-left to lower-right.
 *   - The box number (0–6, not the node number) sits in the lower-right
 *     interior corner of each box.
 *   - Boundary arrows carry an ICOM code — I1, C1, O1, M1 — printed where the
 *     arrow meets the diagram frame, numbered along that edge.
 *   - The page carries the standard frame with a bottom title block of three
 *     cells: Node / Title / Number.
 *
 * Text widths are measured in a real browser, and each drawing is checked
 * label-against-label, label-against-box and label-against-canvas-edge, and
 * for duplicated SVG attributes, before it is written.
 *
 *   node scripts/visual-eval/draw-idef0-target.mjs                 # all cases
 *   node scripts/visual-eval/draw-idef0-target.mjs order-fulfilment
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
const BOXFILL = "#f6f8fa";

const M = 46;                  // page margin, as in the other families
const FRAME_W = 1.5, ARROW_W = 1.5, BOX_W = 1.6;
const BW = 214, BH = 104;      // function box
const XSTEP = 338, YSTEP = 152;
const HEAD_LEN = 11, HEAD_HALF = 3.8;
const HOP_R = 7;
const TITLEBLOCK_H = 52;
const FS_TITLE = 18, FS_DECK = 9.5, FS_BOX = 13, FS_LABEL = 11, FS_CODE = 9, FS_CELL = 8.5;

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

// ---------------------------------------------------------------- parse

const parse = (src) => {
  const doc = { title: "", node: "A0", fns: [], arrows: [] };
  for (const raw of src.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    let m;
    if ((m = /^idef0\s+"(.*)"/.exec(line))) { doc.title = m[1]; continue; }
    if ((m = /^node\s+(\S+)/.exec(line))) { doc.node = m[1]; continue; }
    if ((m = /^function\s+(\S+)\s+"(.*)"/.exec(line))) { doc.fns.push({ id: m[1], name: m[2] }); continue; }
    if ((m = /^(control|input|mechanism|output)\s+(\S+)\.([ICMO])\s+"(.*)"/.exec(line))) {
      doc.arrows.push({ kind: "boundary", role: m[1], box: m[2], label: m[4] });
      continue;
    }
    if ((m = /^(\S+)\s*->\s*(\S+)\s*:\s*"(.*)"/.exec(line))) {
      doc.arrows.push({ kind: "internal", from: m[1], to: m[2], label: m[3] });
      continue;
    }
  }
  return doc;
};

const ROLE_EDGE = { input: "left", control: "top", output: "right", mechanism: "bottom" };
const ROLE_CODE = { input: "I", control: "C", output: "O", mechanism: "M" };

// ---------------------------------------------------------------- sheet

class Sheet {
  constructor(id, title, deck, node) {
    Object.assign(this, { id, title, deck, node });
    this.wires = [];
    this.shapes = [];
    this.texts = [];
    this.labels = [];
    this.boxes = [];
    this.verticals = [];
    this.minX = Infinity; this.maxX = -Infinity; this.minY = Infinity; this.maxY = -Infinity;
  }

  grow(x, y, w = 0, h = 0) {
    this.minX = Math.min(this.minX, x); this.maxX = Math.max(this.maxX, x + w);
    this.minY = Math.min(this.minY, y); this.maxY = Math.max(this.maxY, y + h);
  }

  async at(x, y, s, { size = FS_LABEL, weight = 400, fill = INK, anchor = "start", block = "", extra = "" } = {}) {
    const w = await measure(s, size, weight);
    const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    this.texts.push(
      `<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT_SVG}" font-size="${size}"` +
      (weight !== 400 ? ` font-weight="${weight}"` : "") +
      ` fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${extra}>${esc(s)}</text>`
    );
    this.labels.push({ x: left, y: y - size * 0.8, w, h: size * 1.12, s, block });
    this.grow(left, y - size * 0.8, w, size * 1.12);
  }

  path(d, { width = ARROW_W, dash = "", stroke = LINE } = {}) {
    this.wires.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""} stroke-linecap="butt" stroke-linejoin="miter"/>`);
  }

  vline(x, y1, y2) {
    this.verticals.push({ x, y1: Math.min(y1, y2), y2: Math.max(y1, y2) });
    this.path(`M ${n2(x)} ${n2(y1)} L ${n2(x)} ${n2(y2)}`);
    this.grow(x, Math.min(y1, y2), 0, Math.abs(y2 - y1));
  }

  /** A horizontal run that hops over any vertical it crosses, so a crossing
   *  can never be misread as a junction (the rubric's "no unintended
   *  connections"; IDEF0 marks real junctions by merging, never by touching). */
  hrun(x1, x2, y) {
    const dir = Math.sign(x2 - x1);
    const cross = this.verticals
      .filter((v) => v.y1 < y - 1 && y + 1 < v.y2 && (v.x - x1) * dir > HOP_R && (x2 - v.x) * dir > HOP_R)
      .map((v) => v.x)
      .sort((a, b) => (a - b) * dir);
    let d = `M ${n2(x1)} ${n2(y)}`;
    for (const cx of cross) {
      d += ` L ${n2(cx - dir * HOP_R)} ${n2(y)} A ${HOP_R} ${HOP_R} 0 0 ${dir > 0 ? 1 : 0} ${n2(cx + dir * HOP_R)} ${n2(y)}`;
    }
    d += ` L ${n2(x2)} ${n2(y)}`;
    this.path(d);
    this.grow(Math.min(x1, x2), y - HOP_R, Math.abs(x2 - x1), HOP_R);
  }

  /** Solid IDEF0 arrowhead, tip at (x,y), pointing along (ux,uy). */
  head(x, y, ux, uy) {
    const px = -uy, py = ux;
    const bx = x - ux * HEAD_LEN, by = y - uy * HEAD_LEN;
    this.shapes.push(
      `<path d="M ${n2(x)} ${n2(y)} L ${n2(bx + px * HEAD_HALF)} ${n2(by + py * HEAD_HALF)} L ${n2(bx - px * HEAD_HALF)} ${n2(by - py * HEAD_HALF)} Z" fill="${LINE}"/>`
    );
  }

  fnbox(id, num, x, y, lines) {
    this.shapes.push(`<rect x="${n2(x - BW / 2)}" y="${n2(y - BH / 2)}" width="${BW}" height="${BH}" fill="${BOXFILL}" stroke="${LINE}" stroke-width="${BOX_W}"/>`);
    this.boxes.push({ x: x - BW / 2, y: y - BH / 2, w: BW, h: BH, s: id });
    this.grow(x - BW / 2, y - BH / 2, BW, BH);
    return { id, num, x, y, left: x - BW / 2, right: x + BW / 2, top: y - BH / 2, bottom: y + BH / 2 };
  }

  render() {
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img">`);
    o.push(`<title>${esc(this.title)}</title>`);
    o.push(`<desc>${esc(this.desc || "")}</desc>`);
    o.push(`<rect x="0" y="0" width="${this.w}" height="${this.h}" fill="#ffffff"/>`);
    o.push(`<text x="${M}" y="46" font-family="${FONT_SVG}" font-size="${FS_TITLE}" font-weight="700" fill="${INK}">${esc(this.title)}</text>`);
    o.push(`<text x="${M}" y="65" font-family="${FONT_SVG}" font-size="${FS_DECK}" font-weight="600" fill="${FAINT}" letter-spacing="1.3">${esc(this.deck)}</text>`);
    o.push(...this.frameEls, ...this.wires, ...this.shapes, ...this.texts);
    o.push("</svg>");
    return o.join("\n") + "\n";
  }
}

// ---------------------------------------------------------------- build

const build = async (caseName) => {
  const dir = `visual-eval/cases/idef0-${caseName}`;
  const doc = parse(await readFile(`${dir}/source.sx`, "utf8"));
  const s = new Sheet(`idef0-${caseName}`, doc.title, "IDEF0 FUNCTION MODEL · FIPS PUB 183", doc.node);

  // Staircase: upper-left to lower-right, one box per step.
  const FIRST_X = 380, FIRST_Y = 300;
  const placed = new Map();
  doc.fns.forEach((f, i) => {
    placed.set(f.id, { ...f, num: i + 1, cx: FIRST_X + i * XSTEP, cy: FIRST_Y + i * YSTEP });
  });

  // Which arrows land on which edge, so a shared edge can be slotted.
  const edges = new Map();
  const slot = (boxId, edge, a) => {
    const key = `${boxId}|${edge}`;
    if (!edges.has(key)) edges.set(key, []);
    edges.get(key).push(a);
  };
  for (const a of doc.arrows) {
    if (a.kind === "internal") { slot(a.from, "right", a); slot(a.to, "left", a); }
    else slot(a.box, ROLE_EDGE[a.role], a);
  }
  // On a shared left edge the elbow from upstream arrives above the boundary
  // input, which comes straight in from the frame.
  for (const [key, list] of edges)
    if (key.endsWith("|left")) list.sort((p, q) => (p.kind === "internal" ? 0 : 1) - (q.kind === "internal" ? 0 : 1));

  const pointOn = (b, edge, a) => {
    const list = edges.get(`${b.id}|${edge}`);
    const i = list.indexOf(a), n = list.length;
    const t = (i + 1) / (n + 1);
    if (edge === "left") return [b.cx - BW / 2, b.cy - BH / 2 + BH * t];
    if (edge === "right") return [b.cx + BW / 2, b.cy - BH / 2 + BH * t];
    if (edge === "top") return [b.cx - BW / 2 + BW * t, b.cy - BH / 2];
    return [b.cx - BW / 2 + BW * t, b.cy + BH / 2];
  };

  // The drawing area, sized so every boundary label has room at its open end.
  const widest = async (role, weight = 400) => {
    let w = 0;
    for (const a of doc.arrows)
      if (a.kind === "boundary" && a.role === role) w = Math.max(w, await measure(a.label, FS_LABEL, weight));
    return w;
  };
  const boxes = [...placed.values()];
  const leftMost = Math.min(...boxes.map((b) => b.cx)) - BW / 2;
  const rightMost = Math.max(...boxes.map((b) => b.cx)) + BW / 2;
  const drawL = Math.min(leftMost - 150, M + 20);
  const drawR = rightMost + Math.max(190, (await widest("output")) + 40);
  const drawT = Math.min(...boxes.map((b) => b.cy)) - BH / 2 - 130;
  const drawB = Math.max(...boxes.map((b) => b.cy)) + BH / 2 + 140;

  const fnOf = (id) => placed.get(id);

  // --- internal arrows first, so their verticals are known for hops
  for (const a of doc.arrows.filter((x) => x.kind === "internal")) {
    const from = fnOf(a.from), to = fnOf(a.to);
    const [sx, sy] = pointOn(from, "right", a);
    const [tx, ty] = pointOn(to, "left", a);
    const mid = (sx + tx) / 2;
    s.hrun(sx, mid, sy);
    s.vline(mid, sy, ty);
    s.hrun(mid, tx - HEAD_LEN, ty);
    s.head(tx, ty, 1, 0);
    await s.at(sx + 12, sy - 10, a.label, { size: FS_LABEL, fill: INK });
  }

  // --- boundary arrows, numbered along their own edge (FIPS ICOM codes)
  const counters = { I: 0, C: 0, O: 0, M: 0 };
  const boundary = doc.arrows.filter((a) => a.kind === "boundary");
  const order = { input: (a) => pointOn(fnOf(a.box), "left", a)[1], control: (a) => pointOn(fnOf(a.box), "top", a)[0],
                  output: (a) => pointOn(fnOf(a.box), "right", a)[1], mechanism: (a) => pointOn(fnOf(a.box), "bottom", a)[0] };
  // Verticals are laid before horizontals, so a horizontal knows what it has
  // to hop over. ICOM numbering is per edge, so the order does not affect it.
  for (const role of ["control", "mechanism", "input", "output"]) {
    const list = boundary.filter((a) => a.role === role).sort((p, q) => order[role](p) - order[role](q));
    for (const a of list) {
      const b = fnOf(a.box);
      const code = `${ROLE_CODE[role]}${++counters[ROLE_CODE[role]]}`;
      if (role === "control") {
        const [x, y] = pointOn(b, "top", a);
        s.vline(x, drawT, y - HEAD_LEN);
        s.head(x, y, 0, 1);
        await s.at(x + 12, drawT + 20, a.label, { size: FS_LABEL, block: code });
        await s.at(x + 12, drawT + 38, code, { size: FS_CODE, weight: 600, fill: FAINT, block: code, extra: ' letter-spacing="1"' });
      } else if (role === "mechanism") {
        const [x, y] = pointOn(b, "bottom", a);
        s.vline(x, drawB, y + HEAD_LEN);
        s.head(x, y, 0, -1);
        await s.at(x + 12, drawB - 26, a.label, { size: FS_LABEL, block: code });
        await s.at(x + 12, drawB - 8, code, { size: FS_CODE, weight: 600, fill: FAINT, block: code, extra: ' letter-spacing="1"' });
      } else if (role === "input") {
        const [x, y] = pointOn(b, "left", a);
        s.hrun(drawL, x - HEAD_LEN, y);
        s.head(x, y, 1, 0);
        await s.at(drawL + 12, y - 12, a.label, { size: FS_LABEL, block: code });
        await s.at(drawL + 12, y + 18, code, { size: FS_CODE, weight: 600, fill: FAINT, block: code, extra: ' letter-spacing="1"' });
      } else {
        const [x, y] = pointOn(b, "right", a);
        s.hrun(x, drawR - HEAD_LEN, y);
        s.head(drawR, y, 1, 0);
        await s.at(drawR - 12, y - 12, a.label, { size: FS_LABEL, anchor: "end", block: code });
        await s.at(drawR - 12, y + 18, code, { size: FS_CODE, weight: 600, fill: FAINT, anchor: "end", block: code, extra: ' letter-spacing="1"' });
      }
    }
  }

  // --- the boxes themselves, drawn over the arrows that stop at their edges
  for (const b of boxes) {
    const h = s.fnbox(b.id, b.num, b.cx, b.cy, 1);
    await s.at(b.cx, b.cy + 1, b.name, { size: FS_BOX, weight: 600, anchor: "middle", block: `box-${b.id}` });
    await s.at(h.right - 12, h.bottom - 12, String(b.num), { size: FS_LABEL, weight: 600, fill: MUTED, anchor: "end", block: `box-${b.id}` });
  }

  // --- frame and the FIPS title block
  s.grow(drawL, drawT); s.grow(drawR, drawB + TITLEBLOCK_H);
  s.w = Math.ceil(Math.max(s.maxX, drawR) + M);
  s.h = Math.ceil(drawB + TITLEBLOCK_H + M);
  const fx = drawL, fy = drawT, fw = drawR - drawL, fh = drawB + TITLEBLOCK_H - drawT;
  s.frameEls = [
    `<rect x="${n2(fx)}" y="${n2(fy)}" width="${n2(fw)}" height="${n2(fh)}" fill="none" stroke="${LINE}" stroke-width="${FRAME_W}"/>`,
    `<path d="M ${n2(fx)} ${n2(drawB)} L ${n2(fx + fw)} ${n2(drawB)}" fill="none" stroke="${LINE}" stroke-width="${FRAME_W}"/>`,
  ];
  const c1 = fx + 260, c2 = fx + fw - 220;
  for (const x of [c1, c2])
    s.frameEls.push(`<path d="M ${n2(x)} ${n2(drawB)} L ${n2(x)} ${n2(drawB + TITLEBLOCK_H)}" fill="none" stroke="${LINE}" stroke-width="${FRAME_W}"/>`);
  const cells = [[fx + 14, "NODE", doc.node], [c1 + 14, "TITLE", doc.title], [c2 + 14, "NUMBER", ""]];
  for (const [x, head, val] of cells) {
    await s.at(x, drawB + 20, head, { size: FS_CELL, weight: 600, fill: FAINT, extra: ' letter-spacing="1.2"' });
    if (val) await s.at(x, drawB + 40, val, { size: FS_LABEL, fill: INK });
  }

  s.desc =
    `An IDEF0 function model of ${doc.title}, drawn to FIPS PUB 183. ` +
    `${boxes.length} function boxes — ${boxes.map((b) => `${b.name} (${b.num})`).join(", ")} — step down a diagonal staircase from upper left to lower right, each carrying its box number in the lower-right interior corner. ` +
    `Every arrow occupies the edge its role requires: inputs enter the left edge, controls descend into the top, outputs leave the right, and mechanisms rise into the bottom. ` +
    `Each arrow's label sits outside the box at the arrow's open end, and every boundary arrow carries its ICOM code — ${boundary.map((a) => ROLE_CODE[a.role]).filter((v, i, arr) => arr.indexOf(v) === i).join(", ")} numbered along each edge — where it meets the diagram frame. ` +
    `The page carries the standard frame with a bottom title block of three cells: node, title and number.`;
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
    ([labels, boxes, W, H]) => {
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
        for (const b of boxes) if (hit(a, b) && a.block !== `box-${b.s}`) out.push(`label/box: "${a.s}" on ${b.s}`);
      }
      return [...new Set(out)];
    },
    [sheet.labels, sheet.boxes, sheet.w, sheet.h]
  );

// ---------------------------------------------------------------- run

const ALL = ["clinical-pathway", "manufacturing-process", "order-fulfilment", "procurement", "software-release"];
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
let failed = 0;
for (const name of names) {
  const sheet = await build(name);
  const svgText = sheet.render();
  await page.setContent(`<style>html,body{margin:0}</style>${svgText}`);
  const found = [...duplicateAttributes(svgText), ...(await check(sheet))];
  if (found.length) {
    failed++;
    console.error(`idef0-${name} collides, not written:\n  ${found.join("\n  ")}`);
    continue;
  }
  await writeFile(`visual-eval/cases/idef0-${name}/ideal.svg`, svgText);
  console.log(`idef0-${name}: ${sheet.w}x${sheet.h}, ${sheet.boxes.length} boxes, 0 collisions`);
}
await browser.close();
if (failed) process.exit(1);
