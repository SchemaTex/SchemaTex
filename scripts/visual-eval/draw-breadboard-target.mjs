/** Draw the breadboard cases' `ideal.svg` — the targets the engine is aiming at.
 *
 * One kit draws all eight, following `docs/reference/26-BREADBOARD-STANDARD.md`:
 * a half-size board of 30 columns by two banks of five rows, lettered a–e above
 * the central trough and f–j below it, continuous red/blue power rails top and
 * bottom, 0.1 inch hole pitch, stylised Fritzing-recognisable part bodies
 * (resistor beige with colour bands, LED as a coloured dome, DIP black with a
 * notch, pushbutton blue, electrolytic capacitor silver with its stripe), and
 * jumper wires as smooth Bézier arcs in solid net colours.
 *
 * Deliberate stylisation, per the doc's own §3.2: an off-board module — the
 * Arduino, a sensor, a display, a servo — is drawn as a labelled block with the
 * pins it actually uses on the edge facing the breadboard. A physically exact
 * Uno would put 5V and GND on the far side, and every power wire would then
 * have to loop round the board, which buys accuracy the reader cannot use and
 * costs the legibility the whole view exists for.
 *
 *   node scripts/visual-eval/draw-breadboard-target.mjs            # all cases
 *   node scripts/visual-eval/draw-breadboard-target.mjs blink
 */
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

const INK = "#16202B", SLATE = "#63707F", RULE = "#C9D2DC";
const BOARD = "#EFE6D2", BOARD_EDGE = "#CBBB96", HOLE = "#6F675B", CHANNEL = "#E4D9C0";
const RAIL_POS = "#C0392B", RAIL_NEG = "#2C6BAA";
const MODULE = "#12796B", MODULE_EDGE = "#0C5C51";

const WIRE = {
  red: "#C0392B", black: "#23272A", yellow: "#E3B93C", green: "#2E9E5B",
  white: "#F2F5F7", orange: "#E08A2E", blue: "#2C6BAA", purple: "#7A5AA8",
};

const M = 46;
const P = 20;                  // hole pitch
let COLS = 30;   // set per case: a source that addresses past 30 needs a full board
const FS_TITLE = 22, FS_SUB = 12.5, FS_SILK = 9, FS_PART = 11, FS_PIN = 9.5, FS_CAP = 11;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 100) / 100;

const browser = await chromium.launch();
const page = await browser.newPage();
const ruler = await browser.newPage();
await ruler.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (t, size, weight = 400) => {
  const key = `${weight}|${size}|${t}`;
  if (cache.has(key)) return cache.get(key);
  const w = await ruler.evaluate(
    ([tt, s, wt, f]) => {
      const ctx = document.getElementById("c").getContext("2d");
      ctx.font = `${wt} ${s}px ${f}`;
      return ctx.measureText(tt).width;
    },
    [t, size, weight, FONT]
  );
  cache.set(key, w);
  return w;
};

// ---------------------------------------------------------------- parse

const parse = (src) => {
  const doc = { title: "", deck: "", parts: [], wires: [] };
  let section = "";
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) { if (!doc.deck) doc.deck = line.replace(/^#\s*/, "").replace(/\.$/, ""); continue; }
    let m;
    if (/^breadboard\b/.test(line)) continue;
    if ((m = /^title:\s*"(.*)"/.exec(line))) { doc.title = m[1]; continue; }
    if (/^board:/.test(line)) continue;
    if (line === "parts" || line === "wires") { section = line; continue; }
    if (section === "parts" && (m = /^(\w+):\s*(.+)$/.exec(line))) {
      const rest = m[2].trim();
      const at = /@(\S+)$/.exec(rest);
      doc.parts.push({ id: m[1], spec: rest.replace(/\s*@\S+$/, "").trim(), at: at ? at[1] : "" });
      continue;
    }
    if (section === "wires" && (m = /^(\S+)\s*--(\w+)--\s*(\S+)$/.exec(line))) {
      doc.wires.push({ from: m[1], colour: m[2], to: m[3] });
      continue;
    }
  }
  return doc;
};

// ---------------------------------------------------------------- geometry

const BX = 0, BY = 0;                       // board origin, translated later
const RAIL_T_POS = BY + 24, RAIL_T_NEG = BY + 44;
const ROW_A = BY + 96;                      // rows a..e
const TROUGH_TOP = ROW_A + 4 * P + 12;
const ROW_F = TROUGH_TOP + 30;              // rows f..j
const RAIL_B_POS = ROW_F + 4 * P + 34, RAIL_B_NEG = RAIL_B_POS + 20;

const BOARD_H = RAIL_B_NEG + 24 - BY;
const boardW = () => (COLS + 1) * P + 24;

const colX = (c) => BX + 22 + (c - 1) * P;
const rowY = (r) => {
  const i = "abcdefghij".indexOf(r);
  return i < 5 ? ROW_A + i * P : ROW_F + (i - 5) * P;
};

/** Resolve an address like `@5e`, `@+t10`, `uno:13`, `c1:+` to a point. */
const resolve = (doc, ref, parts) => {
  let m;
  if ((m = /^@([+-])([tb])(\d+)$/.exec(ref))) {
    const y = m[2] === "t" ? (m[1] === "+" ? RAIL_T_POS : RAIL_T_NEG) : (m[1] === "+" ? RAIL_B_POS : RAIL_B_NEG);
    return [colX(+m[3]), y];
  }
  if ((m = /^@(\d+)([a-j])$/.exec(ref))) return [colX(+m[1]), rowY(m[2])];
  if ((m = /^(\w+):(.+)$/.exec(ref))) {
    const p = parts.get(m[1]);
    if (p && p.pins && p.pins[m[2]]) return p.pins[m[2]];
    if (p && p.pins) {
      const alt = Object.keys(p.pins).find((k) => k.toLowerCase() === m[2].toLowerCase());
      if (alt) return p.pins[alt];
    }
  }
  throw new Error(`cannot resolve ${ref}`);
};

// ---------------------------------------------------------------- sheet

class Sheet {
  constructor(title, deck) {
    Object.assign(this, { title, deck });
    this.board = []; this.parts = []; this.wires = []; this.texts = [];
    this.labels = [];
  }
  async at(x, y, s, { size = FS_PART, weight = 600, fill = INK, anchor = "middle", block = "", knock = false } = {}) {
    const w = await measure(s, size, weight);
    const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    if (knock) this.texts.push(`<rect x="${n2(left - 5)}" y="${n2(y - size * 0.86)}" width="${n2(w + 10)}" height="${n2(size * 1.24)}" rx="3" fill="#FFFFFFE6"/>`);
    this.texts.push(
      `<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT_SVG}" font-size="${size}"` +
      (weight !== 400 ? ` font-weight="${weight}"` : "") +
      ` fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}>${esc(s)}</text>`
    );
    this.labels.push({ x: left, y: y - size * 0.8, w, h: size * 1.12, s, block });
  }
  render() {
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img">`);
    o.push(`<title>${esc(this.title)}</title>`);
    o.push(`<desc>${esc(this.desc || "")}</desc>`);
    o.push(`<rect x="0" y="0" width="${this.w}" height="${this.h}" fill="#ffffff"/>`);
    o.push(`<text x="${M}" y="48" font-family="${FONT_SVG}" font-size="${FS_TITLE}" font-weight="600" fill="${INK}">${esc(this.title)}</text>`);
    o.push(`<text x="${M}" y="70" font-family="${FONT_SVG}" font-size="${FS_SUB}" fill="${SLATE}">${esc(this.deck)}</text>`);
    o.push(`<line x1="${M}" y1="84" x2="${this.w - M}" y2="84" stroke="${RULE}" stroke-width="1"/>`);
    o.push(`<g transform="translate(${n2(this.dx)} ${n2(this.dy)})">`);
    o.push(...this.board, ...this.wires, ...this.parts, ...this.texts);
    o.push("</g>");
    o.push(...(this.foot ?? []));
    o.push("</svg>");
    return o.join("\n") + "\n";
  }
}

// ---------------------------------------------------------------- board

const drawBoard = async (s) => {
  const g = s.board;
  g.push(`<rect x="${BX}" y="${BY}" width="${n2(boardW())}" height="${n2(BOARD_H)}" rx="8" fill="${BOARD}" stroke="${BOARD_EDGE}" stroke-width="1.5"/>`);
  // power rails
  for (const [y, colour, sign] of [[RAIL_T_POS, RAIL_POS, "+"], [RAIL_T_NEG, RAIL_NEG, "−"],
                                   [RAIL_B_POS, RAIL_POS, "+"], [RAIL_B_NEG, RAIL_NEG, "−"]]) {
    g.push(`<path d="M ${n2(colX(1) - 12)} ${n2(y)} L ${n2(colX(COLS) + 12)} ${n2(y)}" stroke="${colour}" stroke-width="1.2" opacity="0.55"/>`);
    for (let c = 1; c <= COLS; c++) {
      if (c % 6 === 1) continue;               // the standard five-hole grouping
      g.push(`<rect x="${n2(colX(c) - 2.6)}" y="${n2(y - 2.6)}" width="5.2" height="5.2" rx="1" fill="${HOLE}"/>`);
    }
    g.push(`<text x="${n2(colX(1) - 20)}" y="${n2(y + 4)}" font-family="${FONT_SVG}" font-size="11" font-weight="700" fill="${colour}" text-anchor="middle">${sign}</text>`);
    g.push(`<text x="${n2(colX(COLS) + 20)}" y="${n2(y + 4)}" font-family="${FONT_SVG}" font-size="11" font-weight="700" fill="${colour}" text-anchor="middle">${sign}</text>`);
  }
  // central trough
  g.push(`<rect x="${n2(colX(1) - 14)}" y="${n2(TROUGH_TOP)}" width="${n2((COLS - 1) * P + 28)}" height="${n2(ROW_F - TROUGH_TOP)}" rx="3" fill="${CHANNEL}" stroke="${BOARD_EDGE}" stroke-width="1"/>`);
  // tie-point holes
  for (let c = 1; c <= COLS; c++)
    for (const r of "abcdefghij")
      g.push(`<rect x="${n2(colX(c) - 2.8)}" y="${n2(rowY(r) - 2.8)}" width="5.6" height="5.6" rx="1" fill="${HOLE}"/>`);
  // silkscreen: column numbers every 5, row letters both sides
  for (let c = 5; c <= COLS; c += 5) {
    g.push(`<text x="${n2(colX(c))}" y="${n2(ROW_A - 12)}" font-family="${FONT_SVG}" font-size="${FS_SILK}" fill="${SLATE}" text-anchor="middle">${c}</text>`);
    g.push(`<text x="${n2(colX(c))}" y="${n2(rowY("j") + 20)}" font-family="${FONT_SVG}" font-size="${FS_SILK}" fill="${SLATE}" text-anchor="middle">${c}</text>`);
  }
  for (const r of "abcdefghij")
    for (const x of [colX(1) - 16, colX(COLS) + 16])
      g.push(`<text x="${n2(x)}" y="${n2(rowY(r) + 3.4)}" font-family="${FONT_SVG}" font-size="${FS_SILK}" fill="${SLATE}" text-anchor="middle">${r}</text>`);
};

// ---------------------------------------------------------------- parts

const RESISTOR_BANDS = {
  "220": ["#C0392B", "#C0392B", "#8B5A2B"], "330": ["#E38B2E", "#E38B2E", "#8B5A2B"],
  "1k": ["#8B5A2B", "#23272A", "#C0392B"], "10k": ["#8B5A2B", "#23272A", "#E3B93C"],
  "100k": ["#8B5A2B", "#23272A", "#E38B2E"],
};

const drawPart = async (s, p, parts) => {
  const g = s.parts;
  const [kind, ...rest] = p.spec.split(/\s+/);
  p.pins = {};
  const span = /^(\d+)([a-j])\.\.(\d+)([a-j])$/.exec(p.at);
  const one = /^(\d+)([a-j])$/.exec(p.at);

  if (kind === "resistor" && span) {
    const x1 = colX(+span[1]), y1 = rowY(span[2]), x2 = colX(+span[3]), y2 = rowY(span[4]);
    g.push(`<path d="M ${n2(x1)} ${n2(y1)} L ${n2(x2)} ${n2(y2)}" stroke="#9AA3A8" stroke-width="2"/>`);
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, bw = Math.abs(x2 - x1) - 26;
    g.push(`<rect x="${n2(cx - bw / 2)}" y="${n2(cy - 8)}" width="${n2(bw)}" height="16" rx="7" fill="#D8C9A3" stroke="#A8956B" stroke-width="1"/>`);
    const bands = RESISTOR_BANDS[rest[0]] ?? ["#8B5A2B", "#23272A", "#C0392B"];
    bands.forEach((col, i) => {
      const bx = cx - bw / 2 + 8 + i * 9;
      g.push(`<rect x="${n2(bx)}" y="${n2(cy - 8)}" width="4" height="16" fill="${col}"/>`);
    });
    await s.at(cx, cy - 26, `${p.id.toUpperCase()} ${rest[0]}Ω`, { size: FS_PART, fill: INK, block: `p-${p.id}`, knock: true });
    p.pins["1"] = [x1, y1]; p.pins["2"] = [x2, y2];
    return;
  }
  if (kind === "led" && span) {
    const x1 = colX(+span[1]), y1 = rowY(span[2]), x2 = colX(+span[3]), y2 = rowY(span[4]);
    const colour = { red: "#D0342C", green: "#2E9E5B", blue: "#2C6BAA", yellow: "#E3B93C" }[rest[0]] ?? "#D0342C";
    g.push(`<path d="M ${n2(x1)} ${n2(y1)} L ${n2(x1)} ${n2((y1 + y2) / 2)} M ${n2(x2)} ${n2(y2)} L ${n2(x2)} ${n2((y1 + y2) / 2)}" stroke="#9AA3A8" stroke-width="2"/>`);
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    g.push(`<path d="M ${n2(cx - 11)} ${n2(cy + 7)} L ${n2(cx - 11)} ${n2(cy - 2)} A 11 11 0 0 1 ${n2(cx + 11)} ${n2(cy - 2)} L ${n2(cx + 11)} ${n2(cy + 7)} Z" fill="${colour}" stroke="#8E241E" stroke-width="1"/>`);
    g.push(`<ellipse cx="${n2(cx - 3.5)}" cy="${n2(cy - 3)}" rx="3" ry="4" fill="#ffffff" opacity="0.45"/>`);
    await s.at(cx, cy - 24, `${p.id.toUpperCase()} ${rest[0]}`, { size: FS_PART, fill: INK, block: `p-${p.id}`, knock: true });
    for (const k of ["a", "anode", "+"]) p.pins[k] = [x1, y1];
    for (const k of ["k", "cathode", "-"]) p.pins[k] = [x2, y2];
    return;
  }
  if (kind === "dip") {
    const pins = +(/pins=(\d+)/.exec(p.spec)?.[1] ?? 8);
    const half = pins / 2;
    const c0 = one ? +one[1] : 12;
    const x1 = colX(c0), x2 = colX(c0 + half - 1);
    const top = rowY("e"), bot = rowY("f");
    g.push(`<rect x="${n2(x1 - 10)}" y="${n2(top - 6)}" width="${n2(x2 - x1 + 20)}" height="${n2(bot - top + 12)}" rx="3" fill="#2B2B2B" stroke="#111" stroke-width="1"/>`);
    g.push(`<path d="M ${n2(x1 - 10)} ${n2((top + bot) / 2 - 7)} A 7 7 0 0 0 ${n2(x1 - 10)} ${n2((top + bot) / 2 + 7)}" fill="${BOARD}"/>`);
    for (let i = 0; i < half; i++) {
      const x = colX(c0 + i);
      g.push(`<rect x="${n2(x - 3)}" y="${n2(top - 12)}" width="6" height="8" rx="1" fill="#C9CDD1"/>`);
      g.push(`<rect x="${n2(x - 3)}" y="${n2(bot + 4)}" width="6" height="8" rx="1" fill="#C9CDD1"/>`);
      p.pins[String(i + 1)] = [x, bot];                   // pin 1 bottom-left, anticlockwise
      p.pins[String(pins - i)] = [x, top];
    }
    await s.at((x1 + x2) / 2, (top + bot) / 2 + 4, p.id.toUpperCase(), { size: FS_PART, fill: "#ffffff", block: `p-${p.id}` });
    return;
  }
  if (kind === "button" && one) {
    const c0 = +one[1], y = rowY(one[2]);
    const x1 = colX(c0), x2 = colX(c0 + 2);
    g.push(`<rect x="${n2(x1 - 8)}" y="${n2(y - 16)}" width="${n2(x2 - x1 + 16)}" height="32" rx="3" fill="#2C3E50" stroke="#1B2733" stroke-width="1"/>`);
    g.push(`<circle cx="${n2((x1 + x2) / 2)}" cy="${n2(y)}" r="9" fill="#3498DB" stroke="#2077B4" stroke-width="1"/>`);
    p.pins["1"] = [x1, y]; p.pins["2"] = [x2, y];
    await s.at((x1 + x2) / 2, y - 26, p.id.toUpperCase(), { size: FS_PART, fill: INK, block: `p-${p.id}`, knock: true });
    return;
  }
  if (kind === "potentiometer" && one) {
    const c0 = +one[1], y = rowY(one[2]);
    const x1 = colX(c0), x3 = colX(c0 + 2);
    g.push(`<rect x="${n2(x1 - 10)}" y="${n2(y - 30)}" width="${n2(x3 - x1 + 20)}" height="34" rx="3" fill="#2C6BAA" stroke="#1E4E7E" stroke-width="1"/>`);
    g.push(`<circle cx="${n2((x1 + x3) / 2)}" cy="${n2(y - 14)}" r="10" fill="#D8DDE2" stroke="#9AA3A8" stroke-width="1"/>`);
    g.push(`<path d="M ${n2((x1 + x3) / 2)} ${n2(y - 14)} L ${n2((x1 + x3) / 2 + 7)} ${n2(y - 20)}" stroke="#43505C" stroke-width="2"/>`);
    p.pins["1"] = [x1, y]; p.pins["2"] = [colX(c0 + 1), y]; p.pins["3"] = [x3, y];
    await s.at((x1 + x3) / 2, y - 40, p.id.toUpperCase(), { size: FS_PART, fill: INK, block: `p-${p.id}`, knock: true });
    return;
  }
  if (kind === "cap-elec" && one) {
    const c0 = +one[1], y = rowY(one[2]);
    const x1 = colX(c0), x2 = colX(c0 + 1);
    const cx = (x1 + x2) / 2;
    g.push(`<path d="M ${n2(x1)} ${n2(y)} L ${n2(x1)} ${n2(y - 12)} M ${n2(x2)} ${n2(y)} L ${n2(x2)} ${n2(y - 12)}" stroke="#9AA3A8" stroke-width="2"/>`);
    g.push(`<rect x="${n2(cx - 13)}" y="${n2(y - 40)}" width="26" height="30" rx="5" fill="#B8BCC0" stroke="#8B9095" stroke-width="1"/>`);
    g.push(`<rect x="${n2(cx + 3)}" y="${n2(y - 40)}" width="10" height="30" rx="4" fill="#43505C"/>`);
    g.push(`<text x="${n2(cx + 8)}" y="${n2(y - 22)}" font-family="${FONT_SVG}" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">−</text>`);
    p.pins["+"] = [x1, y]; p.pins["-"] = [x2, y];
    await s.at(cx, y - 48, `${p.id.toUpperCase()} ${rest[0] ?? ""}`.trim(), { size: FS_PART, fill: INK, block: `p-${p.id}`, knock: true });
    return;
  }
  // Off-board module: a labelled block with the pins it actually uses on the
  // edge facing the breadboard.
  const used = new Set();
  for (const w of s.doc.wires) for (const end of [w.from, w.to]) {
    const mm = /^(\w+):(.+)$/.exec(end);
    if (mm && mm[1] === p.id) used.add(mm[2]);
  }
  const names = [...used];
  const left = p.at === "beside-left";
  const h = Math.max(120, names.length * 30 + 54);
  const w = 152;
  const x = left ? BX - 74 - w : BX + boardW() + 74;
  const y = BY + (BOARD_H - h) / 2;
  g.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${w}" height="${n2(h)}" rx="7" fill="${MODULE}" stroke="${MODULE_EDGE}" stroke-width="1.5"/>`);
  const headX = left ? x + w : x;
  names.forEach((nm, i) => {
    const py = y + 44 + i * 30;
    g.push(`<rect x="${n2(headX - 7)}" y="${n2(py - 7)}" width="14" height="14" rx="2" fill="#1B2733" stroke="#E3B93C" stroke-width="1.2"/>`);
    g.push(`<text x="${n2(left ? headX - 14 : headX + 14)}" y="${n2(py + 3.5)}" font-family="${FONT_SVG}" font-size="${FS_PIN}" font-weight="700" fill="#ffffff" text-anchor="${left ? "end" : "start"}">${esc(nm)}</text>`);
    p.pins[nm] = [headX, py];
  });
  const label = p.spec.replace(/^\w+\s*/, "").trim() || p.id;
  await s.at(x + w / 2, y + 26, label.toUpperCase(), { size: FS_PART, fill: "#ffffff", block: `p-${p.id}` });
  p.box = { x, y, w, h };
};

// ---------------------------------------------------------------- wires

const drawWire = (s, a, b, colour) => {
  const [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // A jumper bows away from the straight line, the way a real one lies.
  const bow = Math.min(46, len * 0.22);
  const nx = -dy / len, ny = dx / len;
  const side = x2 >= x1 ? 1 : -1;
  const cx = (x1 + x2) / 2 + nx * bow * side, cy = (y1 + y2) / 2 + ny * bow * side;
  const stroke = WIRE[colour] ?? "#23272A";
  s.wires.push(`<path d="M ${n2(x1)} ${n2(y1)} Q ${n2(cx)} ${n2(cy)} ${n2(x2)} ${n2(y2)}" fill="none" stroke="#00000022" stroke-width="5.4" stroke-linecap="round"/>`);
  s.wires.push(`<path d="M ${n2(x1)} ${n2(y1)} Q ${n2(cx)} ${n2(cy)} ${n2(x2)} ${n2(y2)}" fill="none" stroke="${stroke}" stroke-width="3.4" stroke-linecap="round"${colour === "white" ? ` stroke-opacity="1"` : ""}/>`);
  if (colour === "white")
    s.wires.push(`<path d="M ${n2(x1)} ${n2(y1)} Q ${n2(cx)} ${n2(cy)} ${n2(x2)} ${n2(y2)}" fill="none" stroke="#B7C0C7" stroke-width="0.9" stroke-linecap="round"/>`);
  for (const [ex, ey] of [a, b])
    s.wires.push(`<circle cx="${n2(ex)}" cy="${n2(ey)}" r="3.1" fill="${stroke}" stroke="#00000033" stroke-width="0.8"/>`);
};

// ---------------------------------------------------------------- build

const build = async (name) => {
  const dir = `visual-eval/cases/breadboard-${name}`;
  const doc = parse(await readFile(`${dir}/source.sx`, "utf8"));
  // A half board has 30 columns. If the source addresses past that, it needs a
  // full board — record the conflict rather than quietly clipping the drawing.
  let maxCol = 0;
  const src2 = await readFile(`${dir}/source.sx`, "utf8");
  for (const m of src2.matchAll(/@[+-]?[tb]?(\d+)[a-j]?\b/g)) maxCol = Math.max(maxCol, +m[1]);
  const declaredHalf = /board:\s*half/.test(src2);
  COLS = declaredHalf && maxCol <= 30 ? 30 : 63;
  const conflict = declaredHalf && maxCol > 30
    ? `The source declares board: half, which has 30 columns, but addresses column ${maxCol}; drawn on a full-size board so nothing is lost.`
    : "";

  const s = new Sheet(doc.title, doc.deck);
  s.doc = doc;
  s.conflict = conflict;
  await drawBoard(s);

  const parts = new Map();
  for (const p of doc.parts) parts.set(p.id, p);
  for (const p of doc.parts) await drawPart(s, p, parts);

  const nets = new Set();
  for (const w of doc.wires) {
    const a = resolve(doc, w.from, parts), b = resolve(doc, w.to, parts);
    drawWire(s, a, b, w.colour);
    nets.add(w.colour);
  }

  // Frame: the module blocks stick out either side of the board.
  const boxes = doc.parts.filter((p) => p.box).map((p) => p.box);
  const minX = Math.min(BX, ...boxes.map((b) => b.x)) - 30;
  const maxX = Math.max(BX + boardW(), ...boxes.map((b) => b.x + b.w)) - 0 + 30;
  s.dx = M - minX;
  s.dy = 120;
  s.w = Math.ceil(maxX - minX + 2 * M);
  const bodyBottom = BOARD_H + s.dy + 20;

  const foot = [];
  let lx = M;
  for (const c of [...nets]) {
    foot.push(`<path d="M ${lx} ${n2(bodyBottom + 34)} L ${lx + 26} ${n2(bodyBottom + 34)}" stroke="${WIRE[c] ?? "#23272A"}" stroke-width="3.4" stroke-linecap="round"/>`);
    if (c === "white") foot.push(`<path d="M ${lx} ${n2(bodyBottom + 34)} L ${lx + 26} ${n2(bodyBottom + 34)}" stroke="#B7C0C7" stroke-width="0.9" stroke-linecap="round"/>`);
    const label = { red: "+5 V", black: "ground", yellow: "signal", green: "signal", white: "signal", orange: "signal", blue: "signal", purple: "signal" }[c] ?? c;
    foot.push(`<text x="${lx + 34}" y="${n2(bodyBottom + 38)}" font-family="${FONT_SVG}" font-size="${FS_CAP}" fill="${SLATE}">${esc(`${c} — ${label}`)}</text>`);
    lx += 34 + (await measure(`${c} — ${label}`, FS_CAP)) + 34;
  }
  foot.push(`<text x="${M}" y="${n2(bodyBottom + 62)}" font-family="${FONT_SVG}" font-size="${FS_CAP}" fill="${SLATE}">${esc(`Columns 1–${COLS}, rows a–e above the trough and f–j below it; the five holes in a column are one node, and the trough breaks the connection between e and f.`)}</text>`);
  if (conflict) foot.push(`<text x="${M}" y="${n2(bodyBottom + 80)}" font-family="${FONT_SVG}" font-size="${FS_CAP}" fill="#B4462A">${esc(conflict)}</text>`);
  s.foot = foot;
  s.h = Math.ceil(bodyBottom + (conflict ? 80 : 62) + M);

  s.desc =
    `A breadboard wiring view of ${doc.title}, on a half-size board of 30 columns with rows a–e above the central trough and f–j below it, and continuous power rails top and bottom. ` +
    `${doc.parts.length} parts are placed at their own tie points: ${doc.parts.map((p) => `${p.id} (${p.spec})`).join(", ")}. ` +
    `${doc.wires.length} jumper wires run as smooth arcs in their net colours, each landing exactly on a hole. ` +
    `Off-board modules are drawn as labelled blocks with the pins they actually use on the edge facing the board.` +
    (conflict ? ` ${conflict}` : "");
  return s;
};

// ---------------------------------------------------------------- verify

const duplicateAttributes = (svgText) => {
  const out = [];
  for (const el of svgText.match(/<[a-zA-Z]+\s[^>]*>/g) ?? []) {
    const names = [...el.matchAll(/([a-zA-Z-]+)="/g)].map((m) => m[1]);
    const dup = [...new Set(names.filter((nm) => names.filter((m2) => m2 === nm).length > 1))];
    if (dup.length) out.push(`duplicate ${dup.join(", ")} on ${el.slice(0, 60)}…`);
  }
  return [...new Set(out)];
};

const check = (sheet) =>
  page.evaluate(
    ([labels, dx, dy, W, H]) => {
      const pad = 3;
      const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
      const out = [];
      const boxes = labels.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy }));
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i];
        if (a.x < 6 || a.y < 6 || a.x + a.w > W - 6 || a.y + a.h > H - 6) out.push(`canvas edge: "${a.s}"`);
        for (let j = i + 1; j < boxes.length; j++) {
          if (a.block && a.block === boxes[j].block) continue;
          if (hit(a, boxes[j])) out.push(`label/label: "${a.s}" x "${boxes[j].s}"`);
        }
      }
      return [...new Set(out)];
    },
    [sheet.labels, sheet.dx, sheet.dy, sheet.w, sheet.h]
  );

// ---------------------------------------------------------------- run

const ALL = ["blink", "button-pulldown", "hcsr04", "i2c-oled", "ne555-astable",
             "potentiometer-analog", "servo-external", "shift-register"];
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
let failed = 0;
for (const nm of names) {
  const sheet = await build(nm);
  const svgText = sheet.render();
  await page.setContent(`<style>html,body{margin:0}</style>${svgText}`);
  const found = [...duplicateAttributes(svgText), ...(await check(sheet))];
  if (found.length) {
    failed++;
    console.error(`breadboard-${nm} collides, not written:\n  ${found.join("\n  ")}`);
    continue;
  }
  await writeFile(`visual-eval/cases/breadboard-${nm}/ideal.svg`, svgText);
  console.log(`breadboard-${nm}: ${sheet.w}x${sheet.h}, ${sheet.doc.parts.length} parts, ${sheet.doc.wires.length} wires`);
}
await browser.close();
if (failed) process.exit(1);
