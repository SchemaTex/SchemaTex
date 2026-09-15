/** Draw the breadboard part library — `visual-eval/symbols/breadboard/`.
 *
 * Tiers 1–3 of the library (see `inventory.md` there), including the fifteen parts learners
 * use most, in the style of the accepted exemplar
 * (`scripts/visual-eval/draw-breadboard-exemplar.mjs`): the same palette, the
 * same drawing idioms and the same scale, 0.1 in = 18 px, so 1 mm = 18 / 2.54 px.
 *
 * Parts that plug into the board are drawn at the exemplar's own board
 * coordinates and cropped, with the board under them drawn faintly: every hole
 * in the rectangle their legs span plus one hole on each side (never across the
 * trough), and the trough itself for a part that straddles it. Boards and
 * modules (Uno, ESP32, relay, HC-SR04, LCD) are drawn on their own, component
 * side up, with their header pins on 0.1 in.
 *
 * Each part is drawn from the side that identifies it: from above for parts
 * that lie flat, straddle the trough or are boards (resistor, diode, LED,
 * button, DIP, header, trimmer, boards), and from the front for tall upright
 * parts (the electrolytic can and the ceramic disc). A part whose body would
 * hide its own legs from above stands over the rows beyond its legs, with the
 * legs visible into their holes — the trimmer's convention in the exemplar.
 *
 * Each manifest entry carries a one-part DSL source. The eval collector
 * renders that source live, so engine comparisons cannot become stale.
 *
 *   ./node_modules/.bin/vite-node scripts/visual-eval/symbols/draw-breadboard.mjs
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";

const OUT = new URL("../../../visual-eval/symbols/breadboard/", import.meta.url);
const PAD = 8;
const FAINT = 0.45;

// ─── palette (from the exemplar) ────────────────────────────
const INK = "#1F2328", MUTED = "#5B616B";
const TROUGH = "#E6E0D2", HOLE = "#8A8475";
const LEG = "#8E8E8E", LEG_END = "#5C5C5C";
const PCB = "#1A8A8F", PCB_EDGE = "#0E6468", PCB_SILK = "#E9F6F6", PCB_SILK_DIM = "#A9D8DA";
const METAL = "#C9CDD2", METAL_EDGE = "#8A9098", PIN_METAL = "#B9BEC4";
const CHIP = "#232529", CHIP_EDGE = "#121314", CHIP_MARK = "#8E949B";
const GOLD = "#C9A23F", GOLD_EDGE = "#8A6B1F", GOLD_LIGHT = "#EBD08A";
const WIRE = { red: ["#D83A2E", "#8F2019"], black: ["#383C42", "#0B0C0E"] };
const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

// ─── geometry (from the exemplar) ───────────────────────────
const P = 18;                       // 0.1 inch
const MM = P / 2.54;                // 1 mm
const mm = (v) => v * MM;
const X0 = 272;                     // breadboard left edge
const UT = 128, UNO_H = 378, GAP = 40;
const BT = UT + UNO_H + GAP;        // breadboard top edge
const colX = (c) => X0 + 36 + (c - 1) * P;
const ROW = { a: 86, b: 104, c: 122, d: 140, e: 158, f: 212, g: 230, h: 248, i: 266, j: 284 };
const RAIL = { "+t": 20, "-t": 38, "+b": 326, "-b": 344 };
const RAIL_COLS = Array.from({ length: 29 }, (_, i) => i + 1).filter((c) => c % 6 !== 0);
const TROUGH_Y = BT + 185;
const ROW_ORDER = ["+t", "-t", ..."abcde", ..."fghij", "+b", "-b"];

const parseHole = (id) => {
  const r = /^([+-][tb])(\d+)$/.exec(id);
  if (r) return { row: r[1], col: +r[2] };
  const h = /^(\d+)([a-j])$/.exec(id);
  if (!h) throw new Error(`bad hole ${id}`);
  return { row: h[2], col: +h[1] };
};
const holeExists = ({ row, col }) => (row in RAIL ? RAIL_COLS.includes(col) : col >= 1 && col <= 30);
const holeId = ({ row, col }) => (row in RAIL ? `${row}${col}` : `${col}${row}`);
/** `17a` or `+t3` → hole centre. */
const hole = (id) => {
  const h = parseHole(id);
  if (!holeExists(h)) throw new Error(`${id} has no hole`);
  return [colX(h.col), BT + (h.row in RAIL ? RAIL[h.row] : ROW[h.row])];
};

// ─── svg helpers (from the exemplar) ────────────────────────
const n = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attrs = (a) => Object.entries(a).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}="${typeof v === "number" ? n(v) : esc(v)}"`).join(" ");
const tag = (name, a, inner) => (inner === undefined ? `<${name} ${attrs(a)}/>` : `<${name} ${attrs(a)}>${inner}</${name}>`);

// Measure with the same rasterizer used for the review sheets; no browser process.
const measure = (text, size, weight = 400, spacing = 0) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="100" font-family="Helvetica, Arial, sans-serif"><text x="10" y="50" font-size="${size}" font-weight="${weight}">${esc(text)}</text></svg>`;
  return (new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: ["/System/Library/Fonts/Helvetica.ttc"] } }).getBBox()?.width ?? 0) + spacing * text.length + 1;
};

/** Extent of everything a part draws, in exemplar px. */
function extent() {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  return {
    b,
    add(x, y, w = 0, h = 0) { b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x + w); b.y1 = Math.max(b.y1, y + h); },
    dot(x, y, r) { this.add(x - r, y - r, 2 * r, 2 * r); },
  };
}

/** Measured text. `rotate` turns it to read bottom-to-top, as the Uno's pin names do. */
async function label(ext, text, x, y, { size, weight = 400, fill = INK, anchor = "start", spacing = 0, rotate = false, maxWidth }) {
  const w = await measure(text, size, weight, spacing);
  if (maxWidth !== undefined && w > maxWidth) throw new Error(`"${text}" is ${n(w)} px wide, more than the ${n(maxWidth)} px it has`);
  const start = anchor === "middle" ? -w / 2 : anchor === "end" ? -w : 0;
  if (rotate) ext.add(x - size * 0.76, y - start - w, size * 1.0, w);
  else ext.add(x + start, y - size * 0.76, w, size * 1.0);
  return tag("text", {
    x, y, transform: rotate ? `rotate(-90 ${n(x)} ${n(y)})` : undefined,
    "font-size": size, "font-weight": weight === 400 ? undefined : weight, fill,
    "text-anchor": anchor === "start" ? undefined : anchor, "letter-spacing": spacing || undefined,
  }, esc(text));
}

// ─── shared part idioms ─────────────────────────────────────
function partKit(ext) {
  const legEnd = (pin, id) => {
    const [x, y] = hole(id);
    ext.dot(x, y, 2.4);
    return tag("circle", { "data-pin": pin, cx: x, cy: y, r: 2.4, fill: LEG_END });
  };
  const leg = (x1, y1, x2, y2) => tag("line", { x1, y1, x2, y2, stroke: LEG, "stroke-width": 2, "stroke-linecap": "round" });
  return { legEnd, leg };
}
/** A square header post seen end-on: gold with one lit corner. */
const post = (x, y, s = 4.6) =>
  tag("rect", { x: x - s / 2, y: y - s / 2, width: s, height: s, fill: GOLD, stroke: GOLD_EDGE, "stroke-width": 0.6 }) +
  tag("rect", { x: x - s / 2 + 0.6, y: y - s / 2 + 0.6, width: s * 0.4, height: s * 0.4, fill: GOLD_LIGHT });
/** A header post seen from the side, running from (x, y1) to its tip at (x, y2) or along x. */
const postSide = (x1, y1, x2, y2) =>
  tag("line", { x1, y1, x2, y2, stroke: GOLD_EDGE, "stroke-width": 4.4, "stroke-linecap": "butt" }) +
  tag("line", { x1, y1, x2, y2, stroke: GOLD, "stroke-width": 3 });
/** A mounting hole, as on the exemplar's Uno. */
const mountHole = (x, y, r = 11) => tag("circle", { cx: x, cy: y, r, fill: "#C9CED3" }) + tag("circle", { cx: x, cy: y, r: r * 0.59, fill: "#FFFFFF" });

// ─── tier-1 parts that plug into the board ──────────────────
const BANDS = { black: "#1F1F1F", brown: "#7B4A26", red: "#C8302A", orange: "#E47B22", gold: "#C9A23F" };
function resistor(ext, from, to, bands) {
  const { legEnd, leg } = partKit(ext);
  const [x1, y] = hole(from), [x2] = hole(to);
  const cx = (x1 + x2) / 2, bw = 46, bh = 13;
  const g = [leg(x1, y, x2, y)];
  g.push(tag("rect", { x: cx - bw / 2, y: y - bh / 2, width: bw, height: bh, rx: 6, fill: "#DCC39A", stroke: "#A88B5C", "stroke-width": 0.9 }));
  for (const ex of [cx - bw / 2 + 6.5, cx + bw / 2 - 6.5]) g.push(tag("ellipse", { cx: ex, cy: y, rx: 7, ry: 7.6, fill: "#DCC39A", stroke: "#A88B5C", "stroke-width": 0.9 }));
  g.push(tag("rect", { x: cx - bw / 2 + 5, y: y - bh / 2 + 0.5, width: bw - 10, height: bh - 1, fill: "#DCC39A" }));
  [9.5, 17, 24.5, 36.5].forEach((off, i) => g.push(tag("rect", { x: cx - bw / 2 + off - 2, y: y - (i === 0 ? 7.2 : bh / 2), width: 4, height: i === 0 ? 14.4 : bh, fill: BANDS[bands[i]] })));
  g.push(tag("rect", { x: cx - bw / 2 + 4, y: y - 4.6, width: bw - 8, height: 2, rx: 1, fill: "#FFFFFF", opacity: 0.28 }));
  g.push(legEnd("1", from), legEnd("2", to));
  ext.add(cx - bw / 2 - 1, y - 8.1, bw + 2, 16.2);
  return g.join("");
}

/** 1N4007 in DO-41: black body 5.2 × 2.7 mm with a grey band at the cathode end. */
function diode(ext, anode, cathode) {
  const { legEnd, leg } = partKit(ext);
  const [xa, y] = hole(anode), [xk] = hole(cathode);
  const dir = Math.sign(xk - xa), cx = (xa + xk) / 2, bw = mm(5.2), bh = mm(2.7);
  const g = [leg(xa, y, xk, y)];
  g.push(tag("rect", { x: cx - bw / 2, y: y - bh / 2, width: bw, height: bh, rx: 3.5, fill: "#2A2C30", stroke: "#0B0C0E", "stroke-width": 0.9 }));
  const bandX = cx + dir * (bw / 2 - 4.5) - 3.25;
  g.push(tag("rect", { x: bandX, y: y - bh / 2 + 0.45, width: 6.5, height: bh - 0.9, fill: "#C4C9CE" }));
  g.push(tag("rect", { x: cx - bw / 2 + 4, y: y - bh / 2 + 3, width: bw - 8, height: 2, rx: 1, fill: "#FFFFFF", opacity: 0.2 }));
  g.push(legEnd("anode", anode), legEnd("cathode", cathode));
  ext.add(cx - bw / 2 - 0.5, y - bh / 2 - 0.5, bw + 1, bh + 1);
  return g.join("");
}

/** 6 mm tactile switch: 6 × 6 mm body, 3.5 mm cap, legs across the trough. */
function pushbutton(ext, anchor) {
  const { legEnd, leg } = partKit(ext);
  const [x1, ye] = hole(anchor);
  const col = +/^\d+/.exec(anchor)[0];
  const x2 = colX(col + 2), yf = BT + ROW.f, cx = (x1 + x2) / 2, cy = TROUGH_Y;
  const s = mm(6), hs = s / 2, capR = mm(3.5) / 2, dimple = hs - 6.2;
  const g = [leg(x1, ye, x1, cy - hs), leg(x2, ye, x2, cy - hs), leg(x1, yf, x1, cy + hs), leg(x2, yf, x2, cy + hs)];
  g.push(tag("rect", { x: cx - hs, y: cy - hs, width: s, height: s, rx: 3, fill: "#2B2D31", stroke: "#121314", "stroke-width": 1 }));
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.push(tag("circle", { cx: cx + dx * dimple, cy: cy + dy * dimple, r: 1.9, fill: "#7D8288" }));
  g.push(tag("circle", { cx, cy, r: capR, fill: "#45494F", stroke: "#1A1B1E", "stroke-width": 1 }), tag("circle", { cx: cx - 1.6, cy: cy - 1.6, r: capR * 0.68, fill: "#555A62" }));
  g.push(legEnd("1", anchor), legEnd("2", `${col + 2}e`), legEnd("3", `${col}f`), legEnd("4", `${col + 2}f`));
  ext.add(cx - hs - 0.5, cy - hs - 0.5, s + 1, s + 1);
  return g.join("");
}

/** 5 mm LED from above: 5.8 mm flange flattened on the cathode side, 5 mm dome. */
function led(ext, anode, cathode) {
  const { legEnd, leg } = partKit(ext);
  const [x, ya] = hole(anode), [, yk] = hole(cathode);
  const cy = (ya + yk) / 2, toK = yk < ya ? -1 : 1;
  const R = mm(5.8) / 2, r = mm(5.0) / 2, flat = r + 0.7;
  const g = [leg(x, ya, x, cy), leg(x, yk, x, cy)];
  const fy = cy + toK * flat, half = Math.sqrt(R ** 2 - flat ** 2);
  g.push(tag("path", { d: `M ${n(x - half)} ${n(fy)} L ${n(x + half)} ${n(fy)} A ${n(R)} ${n(R)} 0 1 ${toK < 0 ? 1 : 0} ${n(x - half)} ${n(fy)} Z`, fill: "#B8261F" }));
  g.push(tag("circle", { cx: x, cy, r, fill: "#E23B30" }));
  g.push(tag("ellipse", { cx: x - 6.2, cy: cy - 6.2, rx: 6, ry: 3.6, fill: "#FFFFFF", opacity: 0.55, transform: `rotate(-35 ${n(x - 6.2)} ${n(cy - 6.2)})` }));
  g.push(legEnd("anode", anode), legEnd("cathode", cathode));
  ext.add(x - R, cy - R, 2 * R, 2 * R);
  return g.join("");
}

/** Bourns 3362P-size single-turn trimmer (6.99 × 6.60 mm), three legs in line on 0.1 in. */
function trimmer(ext, anchor) {
  const { legEnd, leg } = partKit(ext);
  const col = +/^\d+/.exec(anchor)[0];
  const [x1, y] = hole(anchor), cx = colX(col + 1), x3 = colX(col + 2);
  const w = mm(6.99), h = mm(6.6), bottom = y - 10, top = bottom - h, rc = top + h / 2;
  const g = [leg(x1, y, x1, bottom), leg(cx, y, cx, bottom), leg(x3, y, x3, bottom)];
  g.push(tag("rect", { x: cx - w / 2, y: top, width: w, height: h, rx: 4, fill: "#2E64AE", stroke: "#1D4379", "stroke-width": 1 }));
  g.push(tag("circle", { cx, cy: rc, r: 16, fill: "#F1ECDF", stroke: "#BDB39B", "stroke-width": 1 }));
  g.push(tag("g", { transform: `rotate(30 ${n(cx)} ${n(rc)})` }, tag("rect", { x: cx - 10, y: rc - 1.5, width: 20, height: 3, rx: 1, fill: "#7A705C" }) + tag("rect", { x: cx - 1.5, y: rc - 10, width: 3, height: 20, rx: 1, fill: "#7A705C" })));
  g.push(legEnd("1", anchor), legEnd("2", `${col + 1}e`), legEnd("3", `${col + 2}e`));
  ext.add(cx - w / 2 - 0.5, top - 0.5, w + 1, h + 1);
  return g.join("");
}

/** DIP-8 straddling the trough, JEDEC MS-001 body (9.4 × 6.35 mm), notch left and
 *  pin 1 lower left, counting anticlockwise as seen from above. */
async function dip(ext, anchor, pins, marking) {
  const { legEnd } = partKit(ext);
  const col = +/^\d+/.exec(anchor)[0], per = pins / 2;
  const x1 = colX(col), x2 = colX(col + per - 1), cx = (x1 + x2) / 2, cy = TROUGH_Y;
  const L = (per - 1) * P + 12.6, W = mm(6.35);
  const yE = BT + ROW.e, yF = BT + ROW.f;
  const g = [];
  for (let i = 0; i < per; i++) {
    const x = colX(col + i);
    g.push(tag("rect", { x: x - 3.5, y: yE, width: 7, height: cy - W / 2 - yE + 1, fill: PIN_METAL }));
    g.push(tag("rect", { x: x - 3.5, y: cy + W / 2 - 1, width: 7, height: yF - (cy + W / 2) + 1, fill: PIN_METAL }));
  }
  g.push(tag("rect", { x: cx - L / 2, y: cy - W / 2, width: L, height: W, rx: 2, fill: CHIP, stroke: CHIP_EDGE, "stroke-width": 0.9 }));
  g.push(tag("path", { d: `M ${n(cx - L / 2)} ${n(cy - 5.5)} A 5.5 5.5 0 0 1 ${n(cx - L / 2)} ${n(cy + 5.5)} Z`, fill: "#3A3D42" }));
  g.push(tag("circle", { cx: x1, cy: cy + W / 2 - 6.5, r: 2.4, fill: "#3A3D42" }));
  g.push(tag("rect", { x: cx - L / 2 + 4, y: cy - W / 2 + 2.5, width: L - 8, height: 2, rx: 1, fill: "#FFFFFF", opacity: 0.1 }));
  g.push(await label(ext, marking, cx + 3, cy + 3.3, { size: 9.5, fill: CHIP_MARK, anchor: "middle", spacing: 0.4, maxWidth: L - 18 }));
  for (let i = 0; i < per; i++) {
    g.push(legEnd(String(i + 1), `${col + i}f`));
    g.push(legEnd(String(pins - i), `${col + i}e`));
  }
  ext.add(cx - L / 2 - 0.5, cy - W / 2 - 0.5, L + 1, W + 1);
  return g.join("");
}

/** 1 × N break-away male header, 2.54 mm plastic per post, 0.64 mm square posts. */
function header(ext, anchor, pins) {
  const [x0, y] = hole(anchor);
  const w = pins * P, h = mm(2.5), left = x0 - P / 2;
  const g = [tag("rect", { x: left, y: y - h / 2, width: w, height: h, rx: 1.4, fill: "#2B2D31", stroke: "#121314", "stroke-width": 0.9 })];
  for (let i = 1; i < pins; i++) {
    const bx = left + i * P;
    g.push(tag("path", { d: `M ${n(bx - 1.8)} ${n(y - h / 2)} L ${n(bx)} ${n(y - h / 2 + 2.6)} L ${n(bx + 1.8)} ${n(y - h / 2)} Z M ${n(bx - 1.8)} ${n(y + h / 2)} L ${n(bx)} ${n(y + h / 2 - 2.6)} L ${n(bx + 1.8)} ${n(y + h / 2)} Z`, fill: "#121314" }));
  }
  g.push(tag("rect", { x: left + 3, y: y - h / 2 + 1.6, width: w - 6, height: 1.6, rx: 0.8, fill: "#FFFFFF", opacity: 0.12 }));
  for (let i = 0; i < pins; i++) g.push(post(x0 + i * P, y));
  ext.add(left - 0.5, y - h / 2 - 0.5, w + 1, h + 1);
  return g.join("");
}

/** Radial electrolytic, 5 × 11 mm can seen from the front, standing over the rows above
 *  its legs; the sleeve stripe with minus marks is on the negative leg's side. */
function capElec(ext, anchor) {
  const { legEnd, leg } = partKit(ext);
  const [xp, y] = hole(anchor), col = +/^\d+/.exec(anchor)[0], row = /[a-j]$/.exec(anchor)[0];
  const xn = xp + P, cx = xp + P / 2, w = mm(5), h = mm(11), bottom = y - 10, top = bottom - h;
  const SLEEVE = "#2B5597", SLEEVE_EDGE = "#183463", STRIPE = "#C8D3E6";
  const g = [leg(xp, y, xp, bottom), leg(xn, y, xn, bottom)];
  g.push(tag("rect", { x: cx - w / 2, y: top, width: w, height: h, rx: 4, fill: SLEEVE, stroke: SLEEVE_EDGE, "stroke-width": 0.9 }));
  const sx = cx + w / 2 - 11.5, sr = 3.6;
  g.push(tag("path", { d: `M ${n(sx)} ${n(top + 0.45)} L ${n(cx + w / 2 - sr)} ${n(top + 0.45)} Q ${n(cx + w / 2 - 0.45)} ${n(top + 0.45)} ${n(cx + w / 2 - 0.45)} ${n(top + sr)} L ${n(cx + w / 2 - 0.45)} ${n(bottom - sr)} Q ${n(cx + w / 2 - 0.45)} ${n(bottom - 0.45)} ${n(cx + w / 2 - sr)} ${n(bottom - 0.45)} L ${n(sx)} ${n(bottom - 0.45)} Z`, fill: STRIPE }));
  for (let i = 0; i < 4; i++) g.push(tag("rect", { x: sx + 2.6, y: top + 14 + i * 16, width: 5.6, height: 1.8, fill: SLEEVE }));
  g.push(tag("line", { x1: cx - w / 2 + 0.5, y1: bottom - 9, x2: cx + w / 2 - 0.5, y2: bottom - 9, stroke: SLEEVE_EDGE, "stroke-width": 1.1, opacity: 0.7 }));
  g.push(tag("rect", { x: cx - w / 2 + 5, y: top + 6, width: 3, height: h - 20, rx: 1.5, fill: "#FFFFFF", opacity: 0.22 }));
  g.push(legEnd("+", anchor), legEnd("-", `${col + 1}${row}`));
  ext.add(cx - w / 2 - 0.5, top - 0.5, w + 1, h + 1);
  return g.join("");
}

/** Ceramic disc, 5 mm, marked 104 (100 nF), face on, legs pinched into two holes. */
async function capCeramic(ext, anchor, code) {
  const [x1, y] = hole(anchor), col = +/^\d+/.exec(anchor)[0], row = /[a-j]$/.exec(anchor)[0];
  const x2 = x1 + P, cx = x1 + P / 2, r = mm(5) / 2, neck = y - 17, cy = neck - r + 1;
  const DISC = "#D6923A", DISC_EDGE = "#9A5F1C";
  const ld = (x, s) => tag("path", { d: `M ${n(x)} ${n(y)} L ${n(x)} ${n(y - 9)} L ${n(cx + s * 3)} ${n(neck)}`, fill: "none", stroke: LEG, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const g = [ld(x1, -1), ld(x2, 1)];
  g.push(tag("path", { d: `M ${n(cx - 8)} ${n(cy + r - 3)} L ${n(cx - 3.8)} ${n(neck + 1)} L ${n(cx + 3.8)} ${n(neck + 1)} L ${n(cx + 8)} ${n(cy + r - 3)} Z`, fill: DISC, stroke: DISC_EDGE, "stroke-width": 0.9, "stroke-linejoin": "round" }));
  g.push(tag("circle", { cx, cy, r, fill: DISC, stroke: DISC_EDGE, "stroke-width": 0.9 }));
  g.push(tag("rect", { x: cx - 8, y: cy + r - 4.2, width: 16, height: 3.5, fill: DISC }));
  g.push(tag("ellipse", { cx: cx - 6.5, cy: cy - 8.5, rx: 5.5, ry: 2.8, fill: "#FFFFFF", opacity: 0.35, transform: `rotate(-30 ${n(cx - 6.5)} ${n(cy - 8.5)})` }));
  g.push(await label(ext, code, cx, cy + 4.6, { size: 10.5, weight: 600, fill: "#5A3510", anchor: "middle", maxWidth: 2 * r - 8 }));
  const { legEnd } = partKit(ext);
  g.push(legEnd("1", anchor), legEnd("2", `${col + 1}${row}`));
  ext.add(cx - r - 0.5, cy - r - 0.5, 2 * r + 1, 2 * r + 1);
  return g.join("");
}

// ─── boards and modules ─────────────────────────────────────
/** Arduino Uno R3, lifted from the exemplar; every pin name at the unused weight. */
async function uno(ext) {
  const UX = X0 - 198;
  const mil = (mx, my) => [UX + mx * 0.18, UT + (2100 - my) * 0.18];
  const pt = (mx, my) => mil(mx, my).map(n).join(" ");
  const DIGITAL = [
    ["SCL", 840], ["SDA", 940], ["AREF", 1040], ["GND", 1140], ["13", 1240], ["12", 1340],
    ["~11", 1440], ["~10", 1540], ["~9", 1640], ["8", 1740],
    ["7", 1900], ["~6", 2000], ["~5", 2100], ["4", 2200], ["~3", 2300], ["2", 2400], ["TX 1", 2500], ["RX 0", 2600],
  ];
  const POWER = [["NC", 1100], ["IOREF", 1200], ["RESET", 1300], ["3.3V", 1400], ["5V", 1500], ["GND", 1600], ["GND", 1700], ["VIN", 1800]];
  const ANALOG = [["A0", 2000], ["A1", 2100], ["A2", 2200], ["A3", 2300], ["A4", 2400], ["A5", 2500]];
  const u = [];
  u.push(tag("path", { d: `M ${pt(0, 2100)} L ${pt(2620, 2100)} L ${pt(2700, 2020)} L ${pt(2700, 80)} L ${pt(2620, 0)} L ${pt(0, 0)} Z`, fill: PCB, stroke: PCB_EDGE, "stroke-width": 1.2, "stroke-linejoin": "round" }));
  ext.add(UX - 0.6, UT - 0.6, 486 + 1.2, 378 + 1.2);
  for (const [mx, my] of [[550, 100], [600, 2000], [2600, 1400], [2600, 300]]) { const [x, y] = mil(mx, my); u.push(mountHole(x, y)); }
  { const [x, y] = mil(-245, 1712); u.push(tag("rect", { x, y, width: 630 * 0.18, height: 472 * 0.18, rx: 2, fill: METAL, stroke: METAL_EDGE, "stroke-width": 1 }), tag("rect", { x: x + 8, y: y + 20, width: 36, height: 45, rx: 2, fill: "#9CA3AB" })); ext.add(x - 0.5, y - 0.5, 630 * 0.18 + 1, 472 * 0.18 + 1); }
  { const [x, y] = mil(-70, 480); u.push(tag("rect", { x, y, width: 630 * 0.18, height: 355 * 0.18, rx: 3, fill: "#26282C", stroke: "#0B0C0E", "stroke-width": 1 }), tag("circle", { cx: x + 22, cy: y + 32, r: 12, fill: "#3C3F45" }), tag("circle", { cx: x + 22, cy: y + 32, r: 4, fill: METAL_EDGE })); ext.add(x - 0.5, y - 0.5, 630 * 0.18 + 1, 355 * 0.18 + 1); }
  { const [x, y] = mil(300, 1900); u.push(tag("rect", { x: x - 15, y: y - 11, width: 30, height: 22, rx: 2, fill: METAL, stroke: METAL_EDGE, "stroke-width": 0.8 }), tag("circle", { cx: x, cy: y, r: 6.5, fill: "#B3342B" })); }
  {
    const [x, y] = mil(1230, 840);
    const w = 1400 * 0.18, h = 320 * 0.18;
    for (let i = 0; i < 14; i++) {
      const px = mil(1280 + i * 100, 0)[0];
      u.push(tag("rect", { x: px - 3.5, y: y - 4, width: 7, height: 4, fill: PIN_METAL }), tag("rect", { x: px - 3.5, y: y + h, width: 7, height: 4, fill: PIN_METAL }));
    }
    u.push(tag("rect", { x, y, width: w, height: h, rx: 2, fill: CHIP }));
    u.push(tag("path", { d: `M ${n(x)} ${n(y + h / 2 - 7)} A 7 7 0 0 1 ${n(x)} ${n(y + h / 2 + 7)} Z`, fill: "#3A3D42" }));
    u.push(await label(ext, "ATmega328P", x + w / 2, y + h / 2 + 3.5, { size: 10, fill: CHIP_MARK, anchor: "middle", spacing: 0.4 }));
  }
  u.push(await label(ext, "Arduino", mil(1610, 0)[0], UT + 128, { size: 13, weight: 600, fill: PCB_SILK, anchor: "middle", spacing: 1.2 }));
  u.push(await label(ext, "UNO", mil(1610, 0)[0], UT + 160, { size: 28, weight: 800, fill: PCB_SILK, anchor: "middle", spacing: 1 }));
  const headerRow = async (list, my, side) => {
    const xs = list.map(([, mx]) => mil(mx, my)[0]);
    const y = mil(0, my)[1];
    u.push(tag("rect", { x: xs[0] - 9, y: y - 9, width: xs.at(-1) - xs[0] + 18, height: 18, rx: 1.5, fill: "#202225" }));
    for (const [i, [lbl]] of list.entries()) {
      const x = xs[i];
      u.push(tag("rect", { x: x - 4, y: y - 4, width: 8, height: 8, fill: "#0A0A0B", stroke: "#3A3D42", "stroke-width": 1 }));
      const size = 7.5, tx = x + size * 0.36, ty = side === "below" ? y + 13 : y - 13;
      u.push(await label(ext, lbl, tx, ty, { size, fill: PCB_SILK_DIM, anchor: side === "below" ? "end" : "start", rotate: true }));
    }
    return [xs[0], xs.at(-1)];
  };
  const [d1a] = await headerRow(DIGITAL.slice(0, 10), 2000, "below");
  const [, d2b] = await headerRow(DIGITAL.slice(10), 2000, "below");
  const [pa, pb] = await headerRow(POWER, 100, "above");
  const [aa, ab] = await headerRow(ANALOG, 100, "above");
  u.push(await label(ext, "DIGITAL (PWM ~)", (d1a + d2b) / 2, UT + 66, { size: 8, weight: 700, fill: PCB_SILK, anchor: "middle", spacing: 0.8 }));
  u.push(await label(ext, "POWER", (pa + pb) / 2, UT + 313, { size: 8, weight: 700, fill: PCB_SILK, anchor: "middle", spacing: 0.8 }));
  u.push(await label(ext, "ANALOG IN", (aa + ab) / 2, UT + 313, { size: 8, weight: 700, fill: PCB_SILK, anchor: "middle", spacing: 0.8 }));
  return u.join("");
}

/** DOIT ESP32 DevKit V1, 30 pins: 51.8 × 28.2 mm, two rows of 15 on 0.1 in, rows 0.9 in apart.
 *  Drawn as it sits on a breadboard, USB to the left and the antenna to the right. */
async function esp32(ext) {
  const L = mm(51.8), W = mm(28.2), cy = W / 2, row = 81, x0 = L / 2 - 7 * P;
  const TOP = ["VIN", "GND", "D13", "D12", "D14", "D27", "D26", "D25", "D33", "D32", "D35", "D34", "VN", "VP", "EN"];
  const BOTTOM = ["3V3", "GND", "D15", "D2", "D4", "RX2", "TX2", "D5", "D18", "D19", "D21", "RX0", "TX0", "D22", "D23"];
  const BOARD = "#2C2E33", SILK = "#E6E8EA";
  const g = [tag("rect", { x: 0, y: 0, width: L, height: W, rx: 3, fill: BOARD, stroke: "#0B0C0E", "stroke-width": 1.2 })];
  ext.add(-0.6, -0.6, L + 1.2, W + 1.2);
  // ESP32-WROOM-32 module (18 × 25.5 mm) at the antenna end: shield, then the PCB antenna.
  const mw = mm(25.5), mh = mm(18), mx = L - mw - 2, my = cy - mh / 2;
  g.push(tag("rect", { x: mx, y: my, width: mw, height: mh, rx: 1.5, fill: "#1E1F23", stroke: "#0B0C0E", "stroke-width": 0.9 }));
  const sw = mm(18.4), sh = mm(16.6);
  g.push(tag("rect", { x: mx + 4, y: cy - sh / 2, width: sw, height: sh, rx: 2, fill: METAL, stroke: METAL_EDGE, "stroke-width": 1 }));
  g.push(tag("rect", { x: mx + 8, y: cy - sh / 2 + 3, width: sw - 8, height: 2, rx: 1, fill: "#FFFFFF", opacity: 0.35 }));
  g.push(await label(ext, "ESP32-WROOM-32", mx + 4 + sw / 2, cy + 3.3, { size: 9, weight: 600, fill: "#6F757C", anchor: "middle", spacing: 0.3, maxWidth: sw - 10 }));
  {
    const ax0 = mx + 4 + sw + 7, ax1 = mx + mw - 6, ay0 = my + 10, ay1 = my + mh - 10, steps = 7;
    let d = `M ${n(ax0)} ${n(ay1)}`;
    for (let i = 0; i <= steps; i++) {
      const x = ax0 + ((ax1 - ax0) * i) / steps;
      d += ` L ${n(x)} ${n(i % 2 ? ay1 : ay0)}`;
      if (i < steps) d += ` L ${n(ax0 + ((ax1 - ax0) * (i + 1)) / steps)} ${n(i % 2 ? ay1 : ay0)}`;
    }
    g.push(tag("path", { d, fill: "none", stroke: GOLD, "stroke-width": 1.8, "stroke-linejoin": "round" }));
  }
  // USB end: micro-USB, EN and BOOT buttons, USB-to-UART chip, regulator, two LEDs.
  g.push(tag("rect", { x: -mm(1), y: cy - mm(7.5) / 2, width: mm(5.6), height: mm(7.5), rx: 2, fill: METAL, stroke: METAL_EDGE, "stroke-width": 1 }), tag("rect", { x: 4, y: cy - 13, width: 9, height: 26, rx: 2, fill: "#6F757C" }));
  for (const [by, name] of [[cy - 52, "EN"], [cy + 52, "BOOT"]]) {
    g.push(tag("rect", { x: 10, y: by - 12, width: 30, height: 24, rx: 2, fill: METAL, stroke: METAL_EDGE, "stroke-width": 0.8 }), tag("circle", { cx: 25, cy: by, r: 6.5, fill: "#2B2D31" }));
    g.push(await label(ext, name, 46, by + 3, { size: 8, weight: 600, fill: SILK, spacing: 0.4 }));
  }
  g.push(tag("rect", { x: 104, y: cy - 38, width: 36, height: 36, rx: 2, fill: "#16171A", stroke: "#45494F", "stroke-width": 0.8 }), tag("circle", { cx: 109, cy: cy - 33, r: 1.6, fill: "#45494F" }));
  g.push(tag("rect", { x: 94, y: cy + 16, width: 46, height: 25, rx: 1.5, fill: "#16171A", stroke: "#45494F", "stroke-width": 0.8 }), tag("rect", { x: 104, y: cy + 8, width: 26, height: 8, fill: PIN_METAL }));
  g.push(tag("rect", { x: 158, y: cy + 22, width: 11, height: 7, rx: 1, fill: "#E23B30" }), tag("rect", { x: 158, y: cy - 29, width: 11, height: 7, rx: 1, fill: "#3E73BA" }));
  // header pins: solder joints seen from above, names outside the board
  for (const [names, y, side] of [[TOP, cy - row, "above"], [BOTTOM, cy + row, "below"]]) {
    for (const [i, name] of names.entries()) {
      const x = x0 + i * P;
      g.push(tag("circle", { cx: x, cy: y, r: 4.8, fill: "#C4C9CE", stroke: METAL_EDGE, "stroke-width": 0.7 }), tag("rect", { x: x - 1.6, y: y - 1.6, width: 3.2, height: 3.2, fill: "#7D8288" }));
      const size = 7.5, tx = x + size * 0.36;
      g.push(await label(ext, name, tx, side === "above" ? -5 : W + 5, { size, fill: MUTED, anchor: side === "above" ? "start" : "end", rotate: true }));
    }
  }
  return g.join("");
}

/** 5 V one-channel relay module: 50 × 26 mm board, SRD-05VDC-SL-C relay (19.2 × 15.6 mm),
 *  VCC/GND/IN header at one end, NO/COM/NC screw terminal at the other. */
async function relayModule(ext) {
  const L = mm(50), W = mm(26), cy = W / 2;
  const BOARD = "#1F4E96", EDGE = "#13356A", SILK = "#EAF1FB";
  const g = [tag("rect", { x: 0, y: 0, width: L, height: W, rx: 4, fill: BOARD, stroke: EDGE, "stroke-width": 1.2 })];
  ext.add(-0.6, -0.6, L + 1.2, W + 1.2);
  for (const [x, y] of [[mm(3), mm(3)], [L - mm(3), mm(3)], [mm(3), W - mm(3)], [L - mm(3), W - mm(3)]]) g.push(mountHole(x, y, 10));
  // header
  const hx = mm(3.2);
  g.push(tag("rect", { x: hx - P / 2, y: cy - 1.5 * P, width: P, height: 3 * P, rx: 1.4, fill: "#2B2D31", stroke: "#121314", "stroke-width": 0.9 }));
  for (const [i, name] of ["VCC", "GND", "IN"].entries()) {
    const y = cy + (i - 1) * P;
    g.push(post(hx, y));
    g.push(await label(ext, name, hx + 15, y + 3, { size: 8, weight: 600, fill: SILK, spacing: 0.3 }));
  }
  // driver: power LED, transistor, flyback diode
  g.push(tag("rect", { x: 70, y: 30, width: 12, height: 7, rx: 1, fill: "#E23B30" }));
  g.push(await label(ext, "PWR", 88, 36.5, { size: 7.5, weight: 600, fill: SILK, spacing: 0.3 }));
  g.push(tag("rect", { x: 78, y: 128, width: 18, height: 13, rx: 1.5, fill: "#16171A", stroke: "#45494F", "stroke-width": 0.8 }));
  g.push(tag("rect", { x: 72, y: 150, width: 30, height: 12, rx: 3, fill: "#2A2C30", stroke: "#0B0C0E", "stroke-width": 0.8 }), tag("rect", { x: 94, y: 150.5, width: 4.5, height: 11, fill: "#C4C9CE" }));
  // relay
  const rw = mm(19.2), rh = mm(15.6), rx = mm(16.5), ry = cy - rh / 2;
  g.push(tag("rect", { x: rx, y: ry, width: rw, height: rh, rx: 2.5, fill: "#3F86D6", stroke: "#265C9E", "stroke-width": 1 }));
  g.push(tag("rect", { x: rx + 6, y: ry + 5, width: rw - 12, height: 2.4, rx: 1.2, fill: "#FFFFFF", opacity: 0.3 }));
  g.push(await label(ext, "SRD-05VDC-SL-C", rx + rw / 2, cy - 4, { size: 9, weight: 700, fill: "#FFFFFF", anchor: "middle", spacing: 0.2, maxWidth: rw - 12 }));
  g.push(await label(ext, "10A 250VAC", rx + rw / 2, cy + 12, { size: 8, fill: "#DDEBFA", anchor: "middle", maxWidth: rw - 12 }));
  // terminal block, 3 ways on 5.0 mm
  const tw = mm(7.6), th = mm(15), tx = L - tw - mm(0.8), ty = cy - th / 2;
  g.push(tag("rect", { x: tx, y: ty, width: tw, height: th, rx: 2, fill: "#2E64AE", stroke: "#1D4379", "stroke-width": 1 }));
  for (const [i, name] of ["NO", "COM", "NC"].entries()) {
    const y = cy + (i - 1) * mm(5), sx = tx + tw * 0.44;
    g.push(tag("rect", { x: tx + tw - 5, y: y - 10, width: 5, height: 20, fill: "#15305A" }));
    g.push(tag("circle", { cx: sx, cy: y, r: mm(1.6), fill: METAL, stroke: METAL_EDGE, "stroke-width": 0.9 }));
    g.push(tag("line", { x1: sx - 7.5, y1: y + 4.3, x2: sx + 7.5, y2: y - 4.3, stroke: "#6F757C", "stroke-width": 2.2, "stroke-linecap": "round" }));
    g.push(await label(ext, name, tx - 7, y + 3, { size: 8, weight: 600, fill: SILK, anchor: "end", spacing: 0.3 }));
  }
  return g.join("");
}

/** HC-SR04 ultrasonic ranger: 45 × 20 mm board, two 16 mm transducers 26 mm apart,
 *  HC-49S crystal between them, four pins out of the lower edge on 0.1 in. */
async function hcsr04(ext) {
  const L = mm(45), W = mm(20), cx = L / 2, cy = W / 2;
  const BOARD = "#1F4E96", EDGE = "#13356A", SILK = "#EAF1FB";
  const g = [];
  // pins first, so the board edge covers their roots
  const pinNames = ["Vcc", "Trig", "Echo", "Gnd"];
  const tip = W + mm(2.5) + mm(6);
  for (let i = 0; i < 4; i++) { const x = cx + (i - 1.5) * P; g.push(postSide(x, W, x, tip)); ext.add(x - 2.2, W, 4.4, tip - W); }
  g.push(tag("rect", { x: cx - 2 * P, y: W - 1, width: 4 * P, height: mm(2.5) + 1, rx: 1, fill: "#2B2D31", stroke: "#121314", "stroke-width": 0.9 }));
  g.push(tag("rect", { x: 0, y: 0, width: L, height: W, rx: 3, fill: BOARD, stroke: EDGE, "stroke-width": 1.2 }));
  ext.add(-0.6, -0.6, L + 1.2, W + 1.2);
  for (const [x, y] of [[6.5, 6.5], [L - 6.5, 6.5], [6.5, W - 6.5], [L - 6.5, W - 6.5]]) g.push(mountHole(x, y, 4.6));
  // crystal
  const kw = mm(11.05), kh = mm(4.65), ky = 6;
  g.push(tag("rect", { x: cx - kw / 2, y: ky, width: kw, height: kh, rx: kh / 2, fill: "#D4D7DB", stroke: METAL_EDGE, "stroke-width": 1 }), tag("rect", { x: cx - kw / 2 + 3.5, y: ky + 3.5, width: kw - 7, height: kh - 7, rx: (kh - 7) / 2, fill: "none", stroke: PIN_METAL, "stroke-width": 1 }));
  // transducers
  const R = mm(16) / 2, Rm = mm(12.2) / 2;
  for (const [s, name] of [[-1, "T"], [1, "R"]]) {
    const tx = cx + s * mm(13);
    g.push(tag("circle", { cx: tx, cy, r: R, fill: METAL, stroke: METAL_EDGE, "stroke-width": 1 }));
    g.push(tag("circle", { cx: tx, cy, r: Rm, fill: "#2B2D31", stroke: "#1A1B1E", "stroke-width": 1 }));
    const step = 6.5, k = Math.floor(Rm / step);
    for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++)
      if ((i * step) ** 2 + (j * step) ** 2 <= (Rm - 4.5) ** 2) g.push(tag("circle", { cx: tx + i * step, cy: cy + j * step, r: 1.2, fill: "#4A4E55" }));
    g.push(tag("path", { d: `M ${n(tx - R + 5)} ${n(cy - 14)} A ${n(R - 5)} ${n(R - 5)} 0 0 1 ${n(tx - 14)} ${n(cy - R + 5)}`, fill: "none", stroke: "#FFFFFF", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.45 }));
    g.push(await label(ext, name, tx - s * 44, W - 6, { size: 9, weight: 700, fill: SILK, anchor: "middle" }));
  }
  g.push(await label(ext, "HC-SR04", cx, cy + 3.5, { size: 9, weight: 700, fill: SILK, anchor: "middle", spacing: 0.3, maxWidth: 2 * (mm(13) - R) + 30 }));
  for (let i = 0; i < 4; i++) g.push(await label(ext, pinNames[i], cx + (i - 1.5) * P, W - 6, { size: 7, fill: SILK, anchor: "middle", maxWidth: P - 1.5 }));
  return g.join("");
}

/** 1602 character LCD with I2C backpack: 80 × 36 mm board, 64.5 × 16 mm blue viewing area,
 *  the backpack's GND/VCC/SDA/SCL header sticking out of the left edge. */
async function lcd1602(ext) {
  const L = mm(80), W = mm(36), cx = L / 2, cy = W / 2;
  const g = [];
  // backpack header, out of the left edge
  const tipX = -mm(8.5);
  for (const [i, name] of ["GND", "VCC", "SDA", "SCL"].entries()) {
    const y = cy + (i - 1.5) * P;
    g.push(postSide(0, y, tipX, y));
    g.push(await label(ext, name, tipX - 6, y + 2.7, { size: 7.5, fill: MUTED, anchor: "end" }));
  }
  g.push(tag("rect", { x: -mm(2.5), y: cy - 2 * P, width: mm(2.5) + 4, height: 4 * P, rx: 1, fill: "#2B2D31", stroke: "#121314", "stroke-width": 0.9 }));
  ext.add(tipX, cy - 2 * P, -tipX, 4 * P);
  g.push(tag("rect", { x: 0, y: 0, width: L, height: W, rx: 3, fill: "#2F7D3E", stroke: "#1E5428", "stroke-width": 1.2 }));
  ext.add(-0.6, -0.6, L + 1.2, W + 1.2);
  for (const [x, y] of [[mm(2.5), mm(2.5)], [L - mm(2.5), mm(2.5)], [mm(2.5), W - mm(2.5)], [L - mm(2.5), W - mm(2.5)]]) g.push(mountHole(x, y, 10));
  for (let i = 0; i < 16; i++) {
    const x = mm(8) + i * P, y = mm(2.3);
    g.push(i === 0 ? tag("rect", { x: x - 4.6, y: y - 4.6, width: 9.2, height: 9.2, fill: "#C4C9CE", stroke: METAL_EDGE, "stroke-width": 0.7 }) : tag("circle", { cx: x, cy: y, r: 4.6, fill: "#C4C9CE", stroke: METAL_EDGE, "stroke-width": 0.7 }));
    g.push(tag("circle", { cx: x, cy: y, r: 1.6, fill: "#7D8288" }));
  }
  const bw = mm(71.2), bh = mm(24.2), bx = cx - bw / 2, by = cy - bh / 2 + mm(1);
  g.push(tag("rect", { x: bx, y: by, width: bw, height: bh, rx: 2, fill: "#1E2023", stroke: "#0B0C0E", "stroke-width": 1 }));
  const vw = mm(64.5), vh = mm(16), vx = cx - vw / 2, vy = by + bh / 2 - vh / 2;
  g.push(tag("rect", { x: vx, y: vy, width: vw, height: vh, rx: 1.5, fill: "#3470D8", stroke: "#1D4E9E", "stroke-width": 0.9 }));
  g.push(tag("rect", { x: vx + 6, y: vy + 4, width: vw - 12, height: 2.4, rx: 1.2, fill: "#FFFFFF", opacity: 0.18 }));
  const cw = mm(2.95), ch = mm(4.35), pitchX = mm(3.55), pitchY = mm(4.85);
  const gx = cx - (15 * pitchX + cw) / 2, gy = vy + vh / 2 - (pitchY + ch) / 2;
  const lines = ["Hello, world!", "I2C addr 0x27"];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 16; c++) {
    const x = gx + c * pitchX, y = gy + r * pitchY;
    g.push(tag("rect", { x, y, width: cw, height: ch, fill: "#FFFFFF", opacity: 0.1 }));
    const chr = lines[r][c];
    if (chr && chr !== " ") g.push(await label(ext, chr, x + cw / 2, y + ch / 2 + 7.8, { size: 21, weight: 500, fill: "#F4F8FF", anchor: "middle", maxWidth: cw }));
  }
  return g.join("");
}

/** A polyline with rounded corners, as SVG path data. */
function rounded(points, radius) {
  let d = `M ${n(points[0][0])} ${n(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1], [x, y] = points[i], [nx, ny] = points[i + 1];
    const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    d += ` L ${n(x - ((x - px) / l1) * r)} ${n(y - ((y - py) / l1) * r)} Q ${n(x)} ${n(y)} ${n(x + ((nx - x) / l2) * r)} ${n(y + ((ny - y) / l2) * r)}`;
  }
  const last = points.at(-1);
  return d + ` L ${n(last[0])} ${n(last[1])}`;
}

function wire(ext, color, points, radius = 22) {
  const [core, shade] = WIRE[color];
  const d = rounded(points, radius);
  const g = [
    tag("path", { d, fill: "none", stroke: shade, "stroke-width": 6.4, "stroke-linecap": "round", "stroke-linejoin": "round" }),
    tag("path", { d, fill: "none", stroke: core, "stroke-width": 4.2, "stroke-linecap": "round", "stroke-linejoin": "round" }),
    tag("path", { d, fill: "none", stroke: "#FFFFFF", "stroke-width": 1.1, opacity: color === "black" ? 0.22 : 0.3, "stroke-linecap": "round", transform: "translate(-0.9 -0.9)" }),
  ];
  for (const [x, y] of [points[0], points.at(-1)]) {
    g.push(tag("circle", { cx: x, cy: y, r: 3.7, fill: shade }), tag("circle", { cx: x, cy: y, r: 1.6, fill: "#D4D7DB" }));
    ext.dot(x, y, 3.7);
  }
  for (const [x, y] of points) ext.dot(x, y, 3.2);
  return g.join("");
}

/** The holes around a part's legs, faint: the rectangle the legs span grown by one hole
 *  on each side but never across the trough, plus the trough when the part straddles it. */
function underlay(ext, legHoles) {
  const hs = legHoles.map(parseHole);
  const cols = hs.map((h) => h.col), rows = hs.map((h) => ROW_ORDER.indexOf(h.row));
  const E = ROW_ORDER.indexOf("e"), F = ROW_ORDER.indexOf("f");
  const [c0, c1] = [Math.max(1, Math.min(...cols) - 1), Math.min(30, Math.max(...cols) + 1)];
  const [lo, hi] = [Math.min(...rows), Math.max(...rows)];
  const r0 = lo === F ? lo : Math.max(0, lo - 1), r1 = hi === E ? hi : Math.min(ROW_ORDER.length - 1, hi + 1);
  const g = [];
  if (lo <= E && hi >= F) {
    const x = colX(c0) - P / 2, w = colX(c1) - colX(c0) + P;
    g.push(tag("rect", { x, y: BT + 174, width: w, height: 22, rx: 3, fill: TROUGH, opacity: FAINT }));
    ext.add(x, BT + 174, w, 22);
  }
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const h = { row: ROW_ORDER[r], col: c };
    if (!holeExists(h)) continue;
    const [x, y] = hole(holeId(h));
    g.push(tag("rect", { x: x - 2.2, y: y - 2.2, width: 4.4, height: 4.4, rx: 0.9, fill: HOLE, opacity: FAINT }));
    ext.add(x - 2.2, y - 2.2, 4.4, 4.4);
  }
  return g.join("");
}

// ─── tier 2 and 3: original top-view artwork at nominal package dimensions ───
function bodyBox(x, y, w, h, fill, edge, rx = 2) {
  return tag("rect", { x, y, width: w, height: h, rx, fill, stroke: edge, "stroke-width": 0.9 }) +
    tag("rect", { x: x + 4, y: y + 3, width: w - 8, height: 2, rx: 1, fill: "#FFFFFF", opacity: 0.2 });
}
function moduleBoard(ext, w, h, fill = "#1F4E96", edge = "#13356A") {
  ext.add(-1, -1, w + 2, h + 2);
  return bodyBox(0, 0, w, h, fill, edge, 3);
}
async function namedPosts(ext, names, x, y, vertical = false, labelSide = -1) {
  const g = [bodyBox(x - 9, y - 9, vertical ? P : names.length * P, vertical ? names.length * P : P, "#2B2D31", "#121314", 1)];
  ext.add(x - 10, y - 10, vertical ? 20 : names.length * P + 2, vertical ? names.length * P + 2 : 20);
  for (const [i, name] of names.entries()) {
    const px = x + (vertical ? 0 : i * P), py = y + (vertical ? i * P : 0);
    g.push(post(px, py));
    g.push(await label(ext, name, vertical ? px + labelSide * 16 : px + 2.7, vertical ? py + 2.7 : py + labelSide * 18,
      { size: 7.5, fill: MUTED, rotate: !vertical, anchor: vertical ? (labelSide < 0 ? "end" : "start") : (labelSide < 0 ? "start" : "end") }));
  }
  return g.join("");
}
function smallChip(x, y, w, h, pinsPerSide = 4) {
  let g = "";
  for (let i = 0; i < pinsPerSide; i++) for (const sy of [y - 3, y + h]) g += tag("rect", { x: x + 3 + i * (w - 6) / (pinsPerSide - 1), y: sy, width: 2, height: 3, fill: PIN_METAL });
  return g + bodyBox(x, y, w, h, CHIP, CHIP_EDGE) + tag("circle", { cx: x + 4, cy: y + 5, r: 1.5, fill: CHIP_MARK });
}
async function dht(ext, large) {
  const w = mm(large ? 15.1 : 12), h = mm(large ? 7.7 : 5.5), cx = colX(13) + P / 2;
  const y = hole("12e")[1], by = y - h - 16, x = cx - w / 2;
  const { leg, legEnd } = partKit(ext), g = [];
  for (let i = 0; i < 4; i++) g.push(leg(colX(12 + i), y, colX(12 + i), by + h), legEnd(["VCC", "DATA", "NC", "GND"][i], `${12 + i}e`));
  g.push(bodyBox(x, by, w, h, large ? "#EEEDE6" : "#3C8ED0", large ? "#B7B5AA" : "#235785", 2));
  for (let i = 0; i < 6; i++) g.push(tag("rect", { x: x + 8 + i * (w - 20) / 6, y: by + 8, width: 4, height: h - 16, rx: 1, fill: large ? "#777A77" : "#1E527E" }));
  g.push(await label(ext, large ? "DHT22" : "DHT11", cx, by - 7, { size: 9, fill: MUTED, anchor: "middle" }));
  for (let i = 0; i < 4; i++) g.push(await label(ext, ["+", "DATA", "NC", "−"][i], colX(12 + i) + 2.7, y + 12, { size: 7, fill: MUTED, rotate: true, anchor: "end" }));
  ext.add(x - 1, by - 1, w + 2, h + 2);
  return g.join("");
}
async function compactMcu(ext, pico) {
  const w = mm(pico ? 51 : 45), h = mm(pico ? 21 : 18), cy = h / 2;
  const top = pico ? ["GP0","GP1","GND","GP2","GP3","GP4","GP5","GND","GP6","GP7","GP8","GP9","GND","GP10","GP11","GP12","GP13","GND","GP14","GP15"] : ["TX1","RX0","RST","GND","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12"];
  const bottom = pico ? ["VBUS","VSYS","GND","3V3_EN","3V3","ADC_VREF","GP28","AGND","GP27","GP26","RUN","GP22","GND","GP21","GP20","GP19","GP18","GND","GP17","GP16"] : ["D13","3V3","AREF","A0","A1","A2","A3","A4","A5","A6","A7","5V","RST","GND","VIN"];
  const pitchRows = (pico ? 7 : 6) * P, start = (w - (top.length - 1) * P) / 2;
  const g = [moduleBoard(ext, w, h, pico ? "#2F7D3E" : PCB, pico ? "#1E5428" : PCB_EDGE)];
  for (const [names, y, side] of [[pico ? bottom : top, cy - pitchRows / 2, -1], [pico ? top : bottom, cy + pitchRows / 2, 1]]) {
    for (const [i, name] of names.entries()) {
      const x = start + i * P;
      g.push(tag("circle", { cx: x, cy: y, r: 4.5, fill: METAL, stroke: METAL_EDGE, "stroke-width": 0.6 }), post(x, y, 3.2));
      g.push(await label(ext, name, x + 2.7, side < 0 ? -6 : h + 6, { size: 7.5, fill: MUTED, rotate: true, anchor: side < 0 ? "start" : "end" }));
    }
  }
  g.push(bodyBox(-mm(1), cy - mm(pico ? 4 : 3.8), mm(pico ? 5.7 : 9), mm(pico ? 8 : 7.6), METAL, METAL_EDGE));
  g.push(tag("rect", { x: -4, y: cy - 16, width: 10, height: 32, rx: 2, fill: "#45494F" }));
  ext.add(-mm(1) - 1, cy - 30, 50, 60);
  const sz = mm(pico ? 7 : 7), chipX = w * 0.48, chipY = cy - sz / 2;
  g.push(smallChip(chipX, chipY, sz, sz));
  g.push(await label(ext, pico ? "RP2040" : "328P", chipX + sz / 2, cy + 3, { size: 8, fill: CHIP_MARK, anchor: "middle" }));
  g.push(bodyBox(w * 0.27, cy - 12, 25, 24, METAL, METAL_EDGE), tag("circle", { cx: w * 0.27 + 12.5, cy, r: 6, fill: "#EEEDE6" }));
  g.push(await label(ext, pico ? "BOOTSEL" : "RESET", w * 0.27 + 12.5, cy - 18, { size: 7, fill: PCB_SILK, anchor: "middle" }));
  g.push(await label(ext, pico ? "PICO" : "NANO", w * 0.80, cy + 4, { size: 13, weight: 600, fill: PCB_SILK, anchor: "middle" }));
  for (let i = 0; i < 4; i++) g.push(bodyBox(w * 0.48 + i * 13, cy + sz / 2 + 9, 8, 5, i === 0 ? "#E23B30" : "#DCC39A", METAL_EDGE, 0.5));
  return g.join("");
}
async function servo(ext) {
  const w = mm(22.2), h = mm(11.8), cy = h / 2, g = [];
  g.push(bodyBox(-mm(5), cy - mm(2.3), w + mm(10), mm(4.6), "#3676BE", "#21467F"));
  for (const x of [-mm(2.5), w + mm(2.5)]) g.push(mountHole(x, cy, mm(1)));
  g.push(bodyBox(0, 0, w, h, "#3676BE", "#21467F"));
  const sx = w - h / 2;
  g.push(tag("circle", { cx: sx, cy, r: h * 0.42, fill: "#285B9C", stroke: "#21467F", "stroke-width": 0.9 }));
  g.push(bodyBox(sx - mm(10), cy - mm(2.5), mm(20), mm(5), "#EEEDE6", "#B7B5AA", 12));
  for (const dx of [-7, -4, 4, 7]) g.push(tag("circle", { cx: sx + mm(dx), cy, r: 2, fill: "#92958E" }));
  g.push(tag("circle", { cx: sx, cy, r: 7, fill: METAL, stroke: METAL_EDGE, "stroke-width": 0.9 }), tag("line", { x1: sx - 4, y1: cy, x2: sx + 4, y2: cy, stroke: "#656B70", "stroke-width": 1.5 }));
  const cx = -mm(18);
  for (const [i, color] of ["#7B4A26", "#D83A2E", "#E47B22"].entries()) {
    const yy = cy + (i - 1) * 8;
    g.push(tag("path", { d: `M 0 ${n(yy)} C -30 ${n(yy)} -70 ${n(yy)} ${n(cx)} ${n(yy)}`, fill: "none", stroke: "#553A27", "stroke-width": 6.4, "stroke-linecap": "round" }), tag("path", { d: `M 0 ${n(yy)} L ${n(cx)} ${n(yy)}`, fill: "none", stroke: color, "stroke-width": 4.2 }));
  }
  g.push(bodyBox(cx - 28, cy - 27, 28, 54, "#2B2D31", "#121314"));
  for (let i = 0; i < 3; i++) g.push(tag("rect", { x: cx - 22, y: cy + (i - 1) * P - 3, width: 6, height: 6, fill: "#0B0C0E", stroke: GOLD_EDGE, "stroke-width": 0.6 }));
  g.push(await label(ext, "GND / +5V / PWM", cx - 14, cy + 43, { size: 7.5, fill: MUTED, anchor: "middle" }));
  g.push(await label(ext, "SG90", w * 0.25, h - 10, { size: 10, weight: 600, fill: PCB_SILK, anchor: "middle" }));
  ext.add(cx - 29, -1, w + mm(5) - cx + 30, h + 2);
  return g.join("");
}
async function oled(ext) {
  const w = mm(27), h = mm(27), g = [moduleBoard(ext, w, h)];
  for (const x of [mm(2), w - mm(2)]) for (const y of [mm(2), h - mm(2)]) g.push(mountHole(x, y, 6));
  g.push(bodyBox(mm(2), mm(7), mm(23), mm(16), "#151C26", "#090E16"));
  g.push(tag("rect", { x: mm(2.6), y: mm(9), width: mm(21.7), height: mm(10.85), fill: "#101C29" }));
  g.push(await label(ext, "23.4 °C", w / 2, mm(15), { size: 19, fill: "#D1F1FC", anchor: "middle" }));
  g.push(await label(ext, "SSD1306  128 × 64", w / 2, mm(18.4), { size: 8, fill: "#92CBDD", anchor: "middle" }));
  g.push(await namedPosts(ext, ["GND", "VCC", "SCL", "SDA"], w / 2 - 1.5 * P, mm(2.5)));
  return g.join("");
}
async function screwBlock(ext, x, y, names) {
  const pitch = mm(5), w = names.length * pitch, h = mm(7.5), g = [bodyBox(x, y, w, h, "#2E64AE", "#1D4379")];
  for (const [i, name] of names.entries()) {
    const cx = x + (i + 0.5) * pitch, cy = y + h / 2;
    g.push(tag("circle", { cx, cy, r: mm(1.6), fill: METAL, stroke: METAL_EDGE, "stroke-width": 0.9 }), tag("line", { x1: cx - 7, y1: cy + 4, x2: cx + 7, y2: cy - 4, stroke: "#6F757C", "stroke-width": 2 }));
    g.push(await label(ext, name, cx, y + h + 12, { size: 7.5, fill: "#FFF0EC", anchor: "middle" }));
  }
  return g.join("");
}
async function motorDriver(ext) {
  const w = mm(43), h = mm(43), g = [moduleBoard(ext, w, h, "#B73731", "#79231F")];
  for (const x of [mm(3), w - mm(3)]) for (const y of [mm(3), h - mm(3)]) g.push(mountHole(x, y, 9));
  g.push(bodyBox(mm(11), mm(3), mm(21), mm(14), "#33373C", "#15171A"));
  for (let i = 0; i < 8; i++) g.push(tag("rect", { x: mm(12) + i * mm(2.5), y: mm(3), width: mm(1), height: mm(14), fill: "#646A70" }));
  g.push(await label(ext, "L298N", w / 2, mm(20), { size: 13, fill: "#FFF0EC", weight: 600, anchor: "middle" }));
  for (const x of [mm(5), mm(37)]) g.push(tag("circle", { cx: x, cy: mm(22), r: mm(3), fill: "#2B5597", stroke: "#183463", "stroke-width": 0.9 }), tag("circle", { cx: x, cy: mm(22), r: mm(2.3), fill: METAL }), tag("path", { d: `M ${n(x - 8)} ${n(mm(22))} h 16 M ${n(x)} ${n(mm(22) - 8)} v 16`, stroke: METAL_EDGE, "stroke-width": 0.8 }));
  g.push(await screwBlock(ext, mm(1), mm(28), ["OUT1", "OUT2"]), await screwBlock(ext, mm(16.5), mm(28), ["+12V", "GND", "+5V"]), await screwBlock(ext, mm(32), mm(28), ["OUT3", "OUT4"]));
  g.push(await namedPosts(ext, ["ENA","IN1","IN2","IN3","IN4","ENB"], w / 2 - 2.5 * P, h - 6, false, 1));
  return g.join("");
}
async function sevenSegment(ext) {
  const w = mm(42), h = mm(24), g = [moduleBoard(ext, w, h)];
  g.push(bodyBox(mm(3), mm(3), mm(36), mm(14), "#232529", "#121314"));
  for (let i = 0; i < 4; i++) {
    const x = mm(5) + i * mm(8.2) + (i > 1 ? mm(1) : 0), y = mm(5), sw = mm(5), sh = mm(4.57);
    for (const yy of [y, y + sh, y + 2 * sh]) g.push(tag("path", { d: `M ${n(x + 3)} ${n(yy)} h ${n(sw - 6)}`, stroke: "#E23B30", "stroke-width": 3, "stroke-linecap": "round" }));
    for (const xx of [x, x + sw]) for (const yy of [y + 3, y + sh + 3]) g.push(tag("path", { d: `M ${n(xx)} ${n(yy)} v ${n(sh - 6)}`, stroke: "#E23B30", "stroke-width": 3, "stroke-linecap": "round" }));
  }
  for (const y of [mm(8), mm(11)]) g.push(tag("circle", { cx: w / 2, cy: y, r: 2, fill: "#E23B30" }));
  g.push(await label(ext, "TM1637", w / 2, h - 10, { size: 9, fill: PCB_SILK, anchor: "middle" }));
  g.push(await namedPosts(ext, ["CLK", "DIO", "VCC", "GND"], 8, h / 2 - 1.5 * P, true));
  return g.join("");
}
async function rtc(ext) {
  const w = mm(38), h = mm(22), g = [moduleBoard(ext, w, h)];
  for (const x of [mm(6), w - mm(3)]) for (const y of [mm(3), h - mm(3)]) g.push(mountHole(x, y, 8));
  g.push(smallChip(mm(10), mm(5), mm(10.3), mm(7.5), 8));
  g.push(await label(ext, "DS3231", mm(15.15), mm(9.2), { size: 9, fill: CHIP_MARK, anchor: "middle" }));
  g.push(smallChip(mm(25), mm(6), mm(5), mm(4)));
  g.push(await label(ext, "ZS-042", mm(21), mm(17.8), { size: 12, fill: PCB_SILK, anchor: "middle" }));
  g.push(await namedPosts(ext, ["32K", "SQW", "SCL", "SDA", "VCC", "GND"], mm(2), h / 2 - 2.5 * P, true));
  for (let i = 0; i < 3; i++) g.push(bodyBox(mm(23) + i * 13, mm(13), 8, 5, "#DCC39A", METAL_EDGE, 0.5));
  return g.join("");
}
async function rotary(ext) {
  const w = mm(26), h = mm(19), g = [moduleBoard(ext, w, h, "#2C2E33", "#0B0C0E")];
  const cx = mm(11), cy = h / 2;
  g.push(bodyBox(cx - mm(6), cy - mm(6), mm(12), mm(12), METAL, METAL_EDGE));
  g.push(tag("circle", { cx, cy, r: mm(4.5), fill: "#B7BBC1", stroke: METAL_EDGE, "stroke-width": 0.9 }));
  const r = mm(3);
  g.push(tag("path", { d: `M ${n(cx - r * 0.8)} ${n(cy - r * 0.6)} L ${n(cx + r * 0.8)} ${n(cy - r * 0.6)} A ${n(r)} ${n(r)} 0 1 1 ${n(cx - r * 0.8)} ${n(cy - r * 0.6)} Z`, fill: "#DDE0E3", stroke: METAL_EDGE, "stroke-width": 0.9 }));
  g.push(await namedPosts(ext, ["CLK", "DT", "SW", "+", "GND"], w - 8, h / 2 - 2 * P, true, 1));
  g.push(await label(ext, "KY-040", cx, h - 9, { size: 8, fill: PCB_SILK, anchor: "middle" }));
  return g.join("");
}
async function tof(ext) {
  const w = mm(25.4), h = mm(17.8), g = [moduleBoard(ext, w, h)];
  for (const x of [mm(2.5), w - mm(2.5)]) g.push(mountHole(x, mm(3), 8));
  const x = w / 2 - mm(2.2), y = mm(5.5);
  g.push(bodyBox(x, y, mm(4.4), mm(2.4), "#38333D", "#16141A", 1));
  for (const dx of [mm(0.9), mm(3.2)]) g.push(tag("circle", { cx: x + dx, cy: y + mm(1.2), r: 3, fill: "#151019", stroke: "#695779", "stroke-width": 0.6 }));
  g.push(smallChip(mm(5), mm(9.5), 18, 12));
  g.push(await label(ext, "VL53L0X", w / 2 + 15, mm(11), { size: 9, fill: PCB_SILK, anchor: "middle" }));
  g.push(await namedPosts(ext, ["VIN", "2V8", "GND", "SDA", "SCL", "XSHUT", "GPIO"], w / 2 - 3 * P, h - 9, false, 1));
  return g.join("");
}

// ─── the library, tier 1, most used first ───────────────────
const SYMBOLS = [
  {
    id: "resistor",
    label: "Resistor, 10 kΩ",
    desc: "Top view of a 10 kΩ carbon-film resistor at 0.1 in = 18 px: beige dog-bone body with brown, black, orange and gold bands, grey leads along row c from hole 13c to hole 17c.",
    legHoles: ["13c", "17c"],
    draw: (ext) => resistor(ext, "13c", "17c", ["brown", "black", "orange", "gold"]),
    engineSource: "  r1: resistor 10k @13c..17c",
    dsl: ["r1: resistor 10k @13c..17c"],
    usageUsers: 245,
    inExemplar: true,
    standard: "IEC 60062 four-band colour code (brown 1, black 0, orange ×1000, gold ±5 %, gap before the tolerance band); 1/4 W carbon-film body about 6.3 × 2.4 mm; Fritzing breadboard-view resistor",
    sourceUrl: "https://www.te.com/en/products/passive-components/resistors/intersection/resistor-color-codes.html",
    notes: "The first band sits on the left bulge and a wider gap precedes the gold tolerance band, so the code reads in the right direction; grey leads run the full 0.4 in to dark lead ends on 13c and 17c. The body is 46 × 15 px, 6.5 × 2.1 mm, within the tolerance of a 1/4 W part, so it keeps the exemplar's size. The engine draws a flat 31 × 8 px bar with four evenly spaced 2 px bands and no tolerance gap, on its smaller 14 px pitch, with thin slate leads and no visible lead ends.",
  },
  {
    id: "dip-ic",
    label: "DIP-8 IC (NE555)",
    desc: "Top view of an 8-pin DIP chip marked NE555 straddling the trough: black body with a notch on the left, pin 1 at the lower left in hole 14f, pins 1 to 4 along row f and 5 to 8 back along row e.",
    legHoles: ["14e", "17f"],
    draw: (ext) => dip(ext, "14e", 8, "NE555"),
    engineSource: "  u1: dip pins=8 NE555 @14e",
    dsl: ["u1: dip pins=8 NE555 @14e", "pins=14 and pins=16 draw the longer packages; the part number is the value"],
    usageUsers: 180,
    inExemplar: false,
    standard: "JEDEC MS-001 plastic DIP: 0.1 in pin pitch, rows 0.3 in apart, 8-lead body about 9.4 × 6.35 mm; pin 1 beside the notch, pins numbered anticlockwise seen from above (TI NE555 datasheet, P package)",
    sourceUrl: "https://www.ti.com/lit/ds/symlink/ne555.pdf",
    notes: "Copies the exemplar's ATmega328P: a black body with a half-round notch, pale leg shoulders and a grey part number. The body is 67 × 45 px, true size, so its long edges stop 4.5 px short of rows e and f and the shoulders run out to the lead ends. With the notch on the left, pin 1 is the lower-left leg (14f, marked with a dot) and the count runs anticlockwise: 1–4 along row f, 5–8 back along row e. The engine numbers the other way round — pin 1 at 14e, pins 1–4 along row e — which is the chip seen from below, while its own pin-1 dot is at the lower left. Its lower pins also land in row g, one row past the trough's edge, because it spaces the two rows three holes apart without counting the trough. It also ignores the part number and prints IC8 on a 42 × 34 px body.",
  },
  {
    id: "led",
    label: "LED, 5 mm red",
    desc: "Top view of a 5 mm red LED straddling the breadboard trough: anode leg in hole 26f, cathode leg in hole 26e, the flange cut flat on the cathode side.",
    legHoles: ["26e", "26f"],
    draw: (ext) => led(ext, "26f", "26e"),
    engineSource: "  led1: led red @26f..26e",
    dsl: ["led1: led red @26f..26e", "anode hole first, cathode hole second"],
    usageUsers: 177,
    inExemplar: true,
    standard: "5 mm through-hole LED: 5.0 mm dome on a 5.8 mm flange; the flat on the flange and the shorter leg mark the cathode (SparkFun LED and Polarity tutorials)",
    sourceUrl: "https://learn.sparkfun.com/tutorials/polarity/all",
    notes: "Now at true size: a 35 px red dome on a 41 px darker flange, straddling the trough with the anode in f and the cathode in e. The flat is cut where the dome meets the flange, so the dark ring runs all the way round except on the cathode side, which reads from a distance. The two dark marks inside the dome in the sample were removed because they read as a pause sign. From above both legs look the same length, so the flat stays the only polarity mark. The engine draws a 12 px disc lying along the row across two columns instead of across the trough, with a thin black bar for the cathode.",
  },
  {
    id: "male-header",
    label: "Male pin header, 1 × 4",
    desc: "Top view of a four-pin break-away male header plugged into row c, holes 10c to 13c: a black plastic strip with notches between posts and a gold square post on each hole.",
    legHoles: ["10c", "13c"],
    draw: (ext) => header(ext, "10c", 4),
    engineSource: "  j1: header pins=4 @10c",
    dsl: ["j1: header pins=4 @10c", "pins= sets the count; posts run to the right of the anchor"],
    usageUsers: 164,
    inExemplar: false,
    standard: "Break-away 0.1 in male header: 2.54 mm plastic per post, 2.5 mm wide, 0.64 mm square posts (SparkFun Break Away Headers - Straight, PRT-00116)",
    sourceUrl: "https://www.sparkfun.com/products/116",
    notes: "A 72 × 18 px black strip with a V notch between posts where it snaps apart, and a 4.6 px gold post on each hole centre. A header has no legs to show: the posts go straight down, so the post itself marks the hole. The engine draws a 48 px black bar with yellow dots on the holes, but the bar starts 3 px before the first dot and stops at the edge of the last one, and the points wires attach to sit half a hole above the row the dots are drawn on.",
  },
  {
    id: "arduino-uno",
    label: "Arduino Uno R3",
    desc: "Component side of an Arduino Uno R3 at true scale, 2.7 × 2.1 in, USB socket and barrel jack on the left: the digital header along the top edge and the power and analog headers along the bottom edge, each socket named in rotated silkscreen type, the ATmega328P DIP-28 in the lower right.",
    legHoles: null,
    draw: (ext) => uno(ext),
    engineSource: "  uno: mcu uno @above",
    dsl: ["uno: mcu uno @above", "also @below, @beside-left, @beside-right"],
    usageUsers: 153,
    inExemplar: true,
    standard: "Arduino UNO R3 board outline 68.6 × 53.4 mm with headers on 0.1 in and the 0.16 in gap between pins 7 and 8 (Arduino UNO R3 documentation and board files)",
    sourceUrl: "https://docs.arduino.cc/hardware/uno-rev3/",
    notes: "Lifted from the exemplar unchanged, except that every pin name is at the unused weight: a diagram turns the pins it wires bold white, as the exemplar does for 5V, GND, A0, 2 and 3. Its headers share the breadboard's 0.1 in pitch, so power wires can drop straight into the rails. The engine draws a 110 × 200 px teal card standing on end, with 25 of the Uno's 32 header pins as dots down its two long sides at 12 px spacing and a caption, so no pin sits where it is on the board.",
  },
  {
    id: "esp32-devkit",
    label: "ESP32 DevKit V1 (30-pin)",
    desc: "Component side of a DOIT ESP32 DevKit V1 at true scale, 51.8 × 28.2 mm, USB to the left: a silver ESP32-WROOM-32 module with its gold antenna at the right end, EN and BOOT buttons beside the USB socket, and two rows of 15 header pins 0.9 in apart, each named outside the board.",
    legHoles: null,
    draw: (ext) => esp32(ext),
    engineSource: "  esp: mcu esp32 @beside-left",
    dsl: ["esp: mcu esp32 @beside-left", "esp32, esp32-devkit, esp32-c3 and esp32-s3 all draw this board"],
    usageUsers: 118,
    inExemplar: false,
    standard: "DOIT ESP32 DevKit V1, 30 pins: 51.8 × 28.2 mm, 15 pins per side on 0.1 in, rows 0.9 in apart; ESP32-WROOM-32 module 18 × 25.5 mm (Espressif datasheet; Mischianti DevKit V1 pinout)",
    sourceUrl: "https://mischianti.org/doit-esp32-dev-kit-v1-high-resolution-pinout-and-specs/",
    notes: "Drawn as it sits across a breadboard, pins along the rows: with the rows 0.9 in apart the two headers land in rows b and i and leave one free hole per strip on each side. The pin names are the silkscreen names in board order (VIN and 3V3 at the USB end, EN beside the antenna). They sit outside the board, rotated like the Uno's, because the 2.7 mm between a pin and the board edge or the module cannot hold 7.5 px type. The engine draws a 110 × 180 px slate card standing on end with 31 dots and a mix of DevKitC and DevKit V1 pin names, so neither board's pin order matches.",
  },
  {
    id: "pushbutton",
    label: "Pushbutton, 6 mm tactile",
    desc: "Top view of a 6 mm tactile pushbutton straddling the trough, legs in holes 17e, 19e, 17f and 19f: black square body, four corner dimples and a round cap.",
    legHoles: ["17e", "19f"],
    draw: (ext) => pushbutton(ext, "17e"),
    engineSource: "  sw1: button @17e",
    dsl: ["sw1: button @17e", "names the top-left leg; the others follow at 19e, 17f and 19f"],
    usageUsers: 111,
    inExemplar: true,
    standard: "6 mm four-leg tactile switch, 6 × 6 mm body with a 3.5 mm cap: the legs across the trough are joined inside, pressing joins the two legs on the same side (Makeability Lab, Using buttons; Arduino Button example)",
    sourceUrl: "https://makeabilitylab.github.io/physcomp/arduino/buttons.html",
    notes: "Now at true size, a 42.5 px body and a 25 px cap (the sample was 40 and 22). The black body sits over the trough with short legs to 17e, 19e, 17f and 19f: the legs across the trough are always connected and pressing joins column 17 to column 19. The engine draws an 18 px grey square with no legs over rows f and g below the trough, between holes and away from the four it names.",
  },
  {
    id: "capacitor-electrolytic",
    label: "Electrolytic capacitor, 100 µF",
    desc: "Front view of a 5 × 11 mm radial electrolytic capacitor standing over rows a to d, with its positive leg in hole 12e and its negative leg in hole 13e; a blue sleeve with a pale stripe of minus marks on the negative side.",
    legHoles: ["12e", "13e"],
    draw: (ext) => capElec(ext, "12e"),
    engineSource: "  c1: cap-elec 100uF @12e",
    dsl: ["c1: cap-elec 100uF @12e", "c1: cap 100uF @12e", "positive leg at the anchor, negative leg one column to the right"],
    usageUsers: 72,
    inExemplar: false,
    standard: "Radial aluminium electrolytic, 5 mm × 11 mm can: the sleeve stripe with minus signs marks the negative lead, which is also the shorter one (SparkFun Polarity tutorial; Fritzing core electrolytic capacitor)",
    sourceUrl: "https://learn.sparkfun.com/tutorials/polarity/all",
    notes: "From above a standing can hides both legs and shows only its top, so the can is drawn from the front, standing over the rows above its legs, as the trimmer stands over rows b–d. The 35 × 78 px can is true size; the stripe and its minus marks face the negative hole, and a groove near the bottom marks the rubber seal. The engine draws a 14 px grey-blue circle just above row e, between the two holes, with a pale arc and a small white minus sign.",
  },
  {
    id: "relay-module",
    label: "Relay module, 1 channel, 5 V",
    desc: "Component side of a blue one-channel 5 V relay module at true scale, 50 × 26 mm: a three-pin VCC, GND, IN header at the left end, a light blue SRD-05VDC-SL-C relay in the middle, and a three-way NO, COM, NC screw terminal at the right end.",
    legHoles: null,
    draw: (ext) => relayModule(ext),
    engineSource: "  k1: module relay @3a",
    dsl: ["k1: module relay @3a", "relay-1ch and 1ch-relay are the same part"],
    usageUsers: 53,
    inExemplar: false,
    standard: "Common 5 V one-channel relay module: VCC/GND/IN header, SRD-05VDC-SL-C relay 19.2 × 15.6 mm, NO/COM/NC screw terminal on 5.0 mm (Songle SRD datasheet; Components101 5V single-channel relay module)",
    sourceUrl: "https://components101.com/switches/5v-single-channel-relay-module-pinout-features-applications-working-datasheet",
    notes: "Low-voltage side on the left, mains side on the right, as on the real board, so the reader sees that COM, NO and NC are screw terminals and not header pins. The small parts that matter to a learner are there without traces: the power LED, the driver transistor and the flyback diode. The engine draws a 126 × 76 px card with all six connections — VCC, GND, IN, COM, NO, NC — as header pins in one row along its lower edge.",
  },
  {
    id: "capacitor-ceramic",
    label: "Ceramic disc capacitor, 100 nF (104)",
    desc: "Front view of a 5 mm orange ceramic disc capacitor marked 104, standing over rows c and d, its two legs pinched together and plugged into holes 20e and 21e.",
    legHoles: ["20e", "21e"],
    draw: (ext) => capCeramic(ext, "20e", "104"),
    engineSource: "  c2: cap-ceramic 104 @20e",
    dsl: ["c2: cap-ceramic 104 @20e", "the value is the three-digit code or a value such as 100nF"],
    usageUsers: 48,
    inExemplar: false,
    standard: "Ceramic disc capacitor with the EIA three-digit code: 104 = 10 × 10⁴ pF = 100 nF; non-polarised (SparkFun Capacitors tutorial; Fritzing core ceramic capacitor)",
    sourceUrl: "https://learn.sparkfun.com/tutorials/capacitors/all",
    notes: "Seen from above a disc stands edge-on as a thin sliver, so it is drawn face on, standing over the rows above its legs like the electrolytic can, with the dipped coating running down into a neck. The 35 px disc is true size and carries its code, because 104 is what a learner looks for in a kit. The engine draws a 12 px yellow circle in row e between the two holes, with no marking.",
  },
  {
    id: "trimmer",
    label: "Trimmer potentiometer, 10 kΩ",
    desc: "Top view of a blue 10 kΩ trimmer potentiometer with a cream rotor and cross slot, standing over rows b to d with three legs in holes 7e, 8e and 9e, the wiper in the middle.",
    legHoles: ["7e", "9e"],
    draw: (ext) => trimmer(ext, "7e"),
    engineSource: "  pot1: potentiometer 10k @7e",
    dsl: ["pot1: potentiometer 10k @7e", "pot1: pot 10k @7e"],
    usageUsers: 47,
    inExemplar: true,
    standard: "Single-turn top-adjust trimmer the size of a Bourns 3362P, 6.99 × 6.60 mm, three pins in line on 0.1 in, wiper in the middle (Bourns 3362 datasheet; Arduino AnalogInput example)",
    sourceUrl: "https://www.bourns.com/docs/product-datasheets/3362.pdf",
    notes: "A blue body with a cream rotor stands over rows b to d, and three short legs drop into 7e, 8e and 9e with the wiper in the middle. The body is 49.5 × 47 px, the true size of a 3362P, the common in-line breadboard trimmer; the sample's reference, Adafruit #356, is a 9.5 mm part that would cover row a as well and leave the strips no free hole. The engine draws a 54 × 46 px yellow module card labelled POT with numbered header pins 19 px apart, so on its 14 px grid the wiper and far pin miss their holes.",
  },
  {
    id: "hc-sr04",
    label: "HC-SR04 ultrasonic sensor",
    desc: "Front of an HC-SR04 ultrasonic distance sensor at true scale, 45 × 20 mm: a blue board with two silver transducers marked T and R, a crystal between them, and four pins, Vcc, Trig, Echo and Gnd, sticking out of the lower edge.",
    legHoles: null,
    draw: (ext) => hcsr04(ext),
    engineSource: "  us1: sensor hcsr04 @10a",
    dsl: ["us1: sensor hcsr04 @10a", "us1: sensor hc-sr04 @10a"],
    usageUsers: 43,
    inExemplar: false,
    standard: "HC-SR04 module: 45 × 20 mm board, two 16 mm transducers (T transmits, R receives), pins Vcc, Trig, Echo, Gnd on 0.1 in (Handsontec HC-SR04 user guide)",
    sourceUrl: "https://www.handsontec.com/dataspecs/HC-SR04-Ultrasonic.pdf",
    notes: "The two mesh-faced cans are what everyone recognises, so the board is drawn face on with its pins pointing down out of the lower edge, the way it plugs into a breadboard row. The pin names are the board's own, in its order. The engine draws a 100 × 60 px card with no transducers and the four pins spread 28 px apart, which is not a breadboard pitch; their names run into one another.",
  },
  {
    id: "lcd-1602-i2c",
    label: "LCD 1602 with I2C backpack",
    desc: "Front of a 16 × 2 character LCD at true scale, 80 × 36 mm: green board, black bezel, blue viewing area showing Hello, world! on the first line, sixteen solder pads along the top edge, and the I2C backpack's GND, VCC, SDA and SCL pins sticking out of the left edge.",
    legHoles: null,
    draw: (ext) => lcd1602(ext),
    engineSource: "  lcd1: display lcd-1602-i2c @3a",
    dsl: ["lcd1: display lcd-1602-i2c @3a", "lcd1: display lcd @3a"],
    usageUsers: 41,
    inExemplar: false,
    standard: "1602A character LCD: 80 × 36 mm board, 71.2 × 24.2 mm bezel, 64.5 × 16 mm viewing area, 16 characters × 2 lines of 5 × 8 dots; PCF8574 backpack header GND, VCC, SDA, SCL (Handsontec I2C 1602 LCD datasheet)",
    sourceUrl: "https://handsontec.com/dataspecs/module/I2C_1602_LCD.pdf",
    notes: "The backpack is soldered behind the display, so from the front only its four pins show, out of the left edge; their names sit beside the pin tips because the printing is on the back. The character cells are drawn at their true 2.95 × 4.35 mm size with a line of text, which is what makes a 1602 read as a 1602. The engine draws a 130 × 60 px green card labelled LCD 1602 I²C with its four pins 38 px apart along the lower edge.",
  },
  {
    id: "diode",
    label: "Rectifier diode, 1N4007",
    desc: "Top view of a 1N4007 rectifier diode lying along row c from its anode in hole 10c to its cathode in hole 14c: black body with a grey band at the cathode end.",
    legHoles: ["10c", "14c"],
    draw: (ext) => diode(ext, "10c", "14c"),
    engineSource: "  d1: diode @10c..14c",
    dsl: ["d1: diode @10c..14c", "anode hole first, cathode hole second"],
    usageUsers: 41,
    inExemplar: false,
    standard: "1N4001–1N4007 in DO-41: body 5.2 mm long, 2.7 mm diameter, band at the cathode (Vishay 1N4001 datasheet)",
    sourceUrl: "https://www.vishay.com/docs/88503/1n4001.pdf",
    notes: "Drawn like the resistor: grey leads the full span to dark lead ends, a 37 × 19 px black body with rounded ends and a grey band on the cathode side, true size. The band matches the bar of the schematic symbol, which is how a learner checks direction. The engine draws a 31 × 8 px bar with a thin light stripe near the cathode end.",
  },
  {
    id: "jumper-wire",
    label: "Jumper wire, rail to strip (red)",
    desc: "A short red pre-cut jumper wire from the top positive rail at column 7 straight down to hole 7a, passing over the ground-rail hole, with a plugged-in end cap at each hole.",
    legHoles: ["+t7", "7a"],
    draw: (ext) => wire(ext, "red", [hole("+t7"), hole("7a")]),
    engineWire: "  @+t7 --red-- @7a",
    dsl: ["@+t7 --red-- @7a", "in the wires section; colours red, black, blue, yellow, orange, green, white, purple, brown, grey"],
    usageUsers: null,
    inExemplar: true,
    standard: "Pre-cut breadboard jumper; red for +5 V and black for ground, + rail marked red and − rail blue (SparkFun How to Use a Breadboard; Arduino Button example)",
    sourceUrl: "https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard/all",
    notes: "A straight red run from +t7 to 7a, like a pre-cut jumper, with a 4.2 px core over a 6.4 px darker edge and a dark cap with a pale pin tip at each end, so it reads as plugged in. The engine draws a 2.4 px line that bows sideways as a Bézier arc between two 1.8 px dots.",
  },
  {
    "id": "servo-sg90",
    "label": "Micro servo, SG90",
    "desc": "Micro servo, SG90. Top view with mounting ears, output horn and a short three-wire cable ending in a female connector; cable length is illustrative.",
    "legHoles": null,
    "engineSource": "  p1: actuator servo-sg90 @3a",
    "dsl": [
        "p1: actuator servo-sg90 @3a"
    ],
    "usageUsers": 39,
    "tier": 2,
    "inExemplar": false,
    "standard": "TowerPro SG90 convention: 22.2 × 11.8 mm case footprint; brown ground, red supply, orange signal.",
    "sourceUrl": null,
    "notes": "Top view with mounting ears, output horn and a short three-wire cable ending in a female connector; cable length is illustrative. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => servo(ext)
  },
  {
    "id": "oled-ssd1306",
    "label": "OLED 0.96 in, SSD1306 I2C",
    "desc": "OLED 0.96 in, SSD1306 I2C. Four-pin I2C variant, GND/VCC/SCL/SDA order. Nominal breakout dimensions; module variants differ.",
    "legHoles": null,
    "engineSource": "  p1: display oled-ssd1306 @3a",
    "dsl": [
        "p1: display oled-ssd1306 @3a"
    ],
    "usageUsers": 34,
    "tier": 2,
    "inExemplar": false,
    "standard": "SSD1306 128 × 64 OLED; common four-pin 27 × 27 mm breakout with 21.7 × 10.85 mm active area.",
    "sourceUrl": null,
    "notes": "Four-pin I2C variant, GND/VCC/SCL/SDA order. Nominal breakout dimensions; module variants differ. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => oled(ext)
  },
  {
    "id": "arduino-nano",
    "label": "Arduino Nano",
    "desc": "Arduino Nano. USB left, all 30 header names outside the board; top view includes mini-USB, ATmega328P and reset switch.",
    "legHoles": null,
    "engineSource": "  p1: mcu nano @above",
    "dsl": [
        "p1: mcu nano @above"
    ],
    "usageUsers": 34,
    "tier": 2,
    "inExemplar": false,
    "standard": "Arduino Nano classic documentation: 45 × 18 mm board; 15 pins per row, 0.6 in row spacing.",
    "sourceUrl": null,
    "notes": "USB left, all 30 header names outside the board; top view includes mini-USB, ATmega328P and reset switch. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => compactMcu(ext, false)
  },
  {
    "id": "l298n",
    "label": "L298N motor driver module",
    "desc": "L298N motor driver module. Top view with finned heatsink, two electrolytic tops, motor and power screw terminals, and six logic posts. ENA/ENB jumpers removed; control header names outside. Board variants differ.",
    "legHoles": null,
    "engineSource": "  p1: module l298n @3a",
    "dsl": [
        "p1: module l298n @3a"
    ],
    "usageUsers": 30,
    "tier": 2,
    "inExemplar": false,
    "standard": "Common red L298N module convention; nominal 43 × 43 mm PCB, ST L298 dual H-bridge, 5 mm screw-terminal pitch.",
    "sourceUrl": null,
    "notes": "Top view with finned heatsink, two electrolytic tops, motor and power screw terminals, and six logic posts. ENA/ENB jumpers removed; control header names outside. Board variants differ. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => motorDriver(ext)
  },
  {
    "id": "dht11",
    "label": "DHT11 temperature and humidity sensor",
    "desc": "DHT11 temperature and humidity sensor. Bare four-pin sensor, top vents in blue housing; body shifted above the legs so VCC, DATA, NC and GND lead ends remain visible. Engine instead draws a module card.",
    "legHoles": [
        "12e",
        "15e"
    ],
    "engineSource": "  p1: sensor dht11 @12e",
    "dsl": [
        "p1: sensor dht11 @12e"
    ],
    "usageUsers": 22,
    "tier": 2,
    "inExemplar": false,
    "standard": "Aosong DHT11 package convention: 12 × 5.5 mm top footprint, four leads on 2.54 mm pitch.",
    "sourceUrl": null,
    "notes": "Bare four-pin sensor, top vents in blue housing; body shifted above the legs so VCC, DATA, NC and GND lead ends remain visible. Engine instead draws a module card. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => dht(ext, false)
  },
  {
    "id": "raspberry-pi-pico",
    "label": "Raspberry Pi Pico",
    "desc": "Raspberry Pi Pico. Original Pico with micro-USB, RP2040, BOOTSEL and all 40 physical header pins, including every ground. Engine card exposes a reduced pin list.",
    "legHoles": null,
    "engineSource": "  p1: mcu pico @above",
    "dsl": [
        "p1: mcu pico @above"
    ],
    "usageUsers": 11,
    "tier": 2,
    "inExemplar": false,
    "standard": "Raspberry Pi Pico datasheet convention: 51 × 21 mm PCB, 20 pins per row on 0.1 in, rows 0.7 in apart.",
    "sourceUrl": null,
    "notes": "Original Pico with micro-USB, RP2040, BOOTSEL and all 40 physical header pins, including every ground. Engine card exposes a reduced pin list. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => compactMcu(ext, true)
  },
  {
    "id": "tm1637",
    "label": "TM1637 four-digit display",
    "desc": "TM1637 four-digit display. Top view, red seven-segment test pattern 88:88, driver underneath, CLK/DIO/VCC/GND header along the left edge. Module variants differ.",
    "legHoles": null,
    "engineSource": "  p1: display tm1637 @3a",
    "dsl": [
        "p1: display tm1637 @3a"
    ],
    "usageUsers": 11,
    "tier": 2,
    "inExemplar": false,
    "standard": "Common 0.36 in four-digit TM1637 module convention; nominal 42 × 24 mm board and 36 × 14 mm display package.",
    "sourceUrl": null,
    "notes": "Top view, red seven-segment test pattern 88:88, driver underneath, CLK/DIO/VCC/GND header along the left edge. Module variants differ. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => sevenSegment(ext)
  },
  {
    "id": "rtc-ds3231",
    "label": "DS3231 real-time clock",
    "desc": "DS3231 real-time clock. Component-side top view. CR2032 holder is on the underside and deliberately hidden; no battery circle superimposed on the chips. Six-pin order 32K/SQW/SCL/SDA/VCC/GND.",
    "legHoles": null,
    "engineSource": "  p1: module rtc-ds3231 @3a",
    "dsl": [
        "p1: module rtc-ds3231 @3a"
    ],
    "usageUsers": 11,
    "tier": 2,
    "inExemplar": false,
    "standard": "ZS-042 DS3231 module convention: nominal 38 × 22 mm board, DS3231 SO-16 and AT24C32 EEPROM; Analog Devices DS3231 package.",
    "sourceUrl": null,
    "notes": "Component-side top view. CR2032 holder is on the underside and deliberately hidden; no battery circle superimposed on the chips. Six-pin order 32K/SQW/SCL/SDA/VCC/GND. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => rtc(ext)
  },
  {
    "id": "dht22",
    "label": "DHT22 temperature and humidity sensor",
    "desc": "DHT22 temperature and humidity sensor. Bare four-pin white sensor viewed from above, body shifted beyond the legs; pin 3 is NC. Vented top and four visible grey leads distinguish it from a breakout.",
    "legHoles": [
        "12e",
        "15e"
    ],
    "engineSource": "  p1: sensor dht22 @12e",
    "dsl": [
        "p1: sensor dht22 @12e"
    ],
    "usageUsers": 10,
    "tier": 2,
    "inExemplar": false,
    "standard": "Aosong AM2302/DHT22 package convention: 15.1 × 7.7 mm top footprint, four leads on 2.54 mm pitch.",
    "sourceUrl": null,
    "notes": "Bare four-pin white sensor viewed from above, body shifted beyond the legs; pin 3 is NC. Vented top and four visible grey leads distinguish it from a breakout. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => dht(ext, true)
  },
  {
    "id": "rotary-ky040",
    "label": "Rotary encoder module, KY-040",
    "desc": "Rotary encoder module, KY-040. Top view of metal encoder can and D-flat shaft; header order CLK/DT/SW/+/GND runs down the right edge. Push-switch is integrated in the shaft.",
    "legHoles": null,
    "engineSource": "  p1: module rotary-ky040 @3a",
    "dsl": [
        "p1: module rotary-ky040 @3a"
    ],
    "usageUsers": 5,
    "tier": 3,
    "inExemplar": false,
    "standard": "KY-040 module convention: nominal 26 × 19 mm board, 12 mm encoder body, 6 mm shaft and five posts on 0.1 in.",
    "sourceUrl": null,
    "notes": "Top view of metal encoder can and D-flat shaft; header order CLK/DT/SW/+/GND runs down the right edge. Push-switch is integrated in the shaft. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => rotary(ext)
  },
  {
    "id": "vl53l0x",
    "label": "Time-of-flight distance sensor, VL53L0X",
    "desc": "Time-of-flight distance sensor, VL53L0X. Two optical windows, regulator and mounting holes; VIN/2V8/GND/SDA/SCL/XSHUT/GPIO posts at 0.1 in. Nominal breakout geometry, not a vendor artwork trace.",
    "legHoles": null,
    "engineSource": "  p1: sensor vl53l0x @3a",
    "dsl": [
        "p1: sensor vl53l0x @3a"
    ],
    "usageUsers": 4,
    "tier": 3,
    "inExemplar": false,
    "standard": "ST VL53L0X 4.4 × 2.4 mm optical package; Adafruit-style 25.4 × 17.8 mm seven-pin breakout convention.",
    "sourceUrl": null,
    "notes": "Two optical windows, regulator and mounting holes; VIN/2V8/GND/SDA/SCL/XSHUT/GPIO posts at 0.1 in. Nominal breakout geometry, not a vendor artwork trace. Original artwork from package conventions; no downloaded or traced graphics. Engine comparison is rendered from the minimal DSL and cropped to its part.",
    draw: (ext) => tof(ext)
  },
];

// ─── write ──────────────────────────────────────────────────
await mkdir(OUT, { recursive: true });
const manifest = {
  type: "breadboard",
  variant: null,
  exemplar: "breadboard",
  style: "True scale, 0.1 in = 18 units, so 1 mm = 7.09 units. Parts that lie flat, straddle the trough or are boards are seen from above; tall upright parts (electrolytic can, ceramic disc) are seen from the front, and any part whose body would hide its legs stands over the rows beyond them. Leads are grey #8E8E8E, 2 units, round-capped, each ending in a #5C5C5C dot on a hole centre; header posts are gold #C9A23F squares on 0.1 in. Bodies are flat fills with a darker hairline and one soft white highlight: resistor beige #DCC39A, LED red #E23B30 on #B8261F, button and header plastic #2B2D31, chips #232529 with #B9BEC4 shoulders and #8E949B marking, trimmer blue #2E64AE, module boards blue #1F4E96, Uno teal #1A8A8F with #E9F6F6 type. Wires are a 4.2-unit core over a 6.4-unit darker edge with a dark cap and pale #D4D7DB tip at each end. Type is the exemplar's Inter stack; pin names 7–8 px.",
  symbols: [],
};
const reviewed = JSON.parse(await readFile(new URL("manifest.json", OUT), "utf8"));
for (const sym of SYMBOLS) {
  // Tier 1 is reviewed and frozen: preserve its target artwork and metadata.
  if (!sym.tier) {
    manifest.symbols.push(reviewed.symbols.find((entry) => entry.id === sym.id));
    continue;
  }
  const ext = extent();
  const holes = sym.legHoles ? underlay(ext, sym.legHoles) : "";
  const part = await sym.draw(ext);
  const x = Math.floor(ext.b.x0 - PAD), y = Math.floor(ext.b.y0 - PAD);
  const w = Math.ceil(ext.b.x1 + PAD) - x, h = Math.ceil(ext.b.y1 + PAD) - y;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" font-family="${FONT.replace(/"/g, "")}">
<title>${esc(sym.label)}</title>
<desc>${esc(sym.desc)}</desc>
<g transform="translate(${-x} ${-y})">
${holes}
${part}
</g>
</svg>
`;
  await writeFile(new URL(`${sym.id}.svg`, OUT), svg);
  manifest.symbols.push({
    id: sym.id, label: sym.label, file: `${sym.id}.svg`, engine: null,
    source: `breadboard\nboard: half\nparts\n${sym.engineWire ? `wires\n${sym.engineWire}` : sym.engineSource}\n`,
    previewGroup: sym.engineWire ? "lt-bb-wires" : "lt-bb-parts",
    dsl: sym.dsl, standard: sym.standard, sourceUrl: sym.sourceUrl, inExemplar: sym.inExemplar,
    tier: sym.tier ?? 1, usageUsers: sym.usageUsers, notes: sym.notes,
  });
  console.log(`${sym.id}: ${w}×${h}, crop ${x} ${y} ${w} ${h}`);
}
await writeFile(new URL("manifest.json", OUT), JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote ${SYMBOLS.length} symbols to ${OUT.pathname}`);
