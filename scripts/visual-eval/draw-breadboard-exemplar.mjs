/** Draw the breadboard exemplar — `visual-eval/exemplars/breadboard/ideal.svg`.
 *
 * The build is the one in the exemplar's `source.sx`: an Arduino Uno above a
 * half-size breadboard, a pushbutton on pin 2 with a 10 kΩ pull-down, an LED on
 * PWM pin 3 through 220 Ω, and a 10 kΩ trimmer potentiometer on A0.
 *
 * Geometry is exact: 0.1 in = 18 px everywhere, on the board and on the Uno, so
 * every Uno header pin sits on the same pitch as the breadboard columns. Every
 * wire end and part lead is placed on a hole centre by construction, and the
 * script finishes by measuring label, wire and body clearances and failing if
 * anything overlaps.
 *
 *   node scripts/visual-eval/draw-breadboard-exemplar.mjs
 */
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const OUT = new URL("../../visual-eval/exemplars/breadboard/ideal.svg", import.meta.url);

// ─── palette ────────────────────────────────────────────────
const INK = "#1F2328", MUTED = "#5B616B";
const BOARD = "#F4F1E9", BOARD_EDGE = "#D6CFBF", GROOVE = "#E4DECF", TROUGH = "#E6E0D2";
const HOLE = "#8A8475", SILK = "#A09886";
const RAIL_POS = "#D9483B", RAIL_NEG = "#3E73BA";
const PCB = "#1A8A8F", PCB_EDGE = "#0E6468", PCB_SILK = "#E9F6F6", PCB_SILK_DIM = "#A9D8DA";
const LEG = "#8E8E8E", LEG_END = "#5C5C5C";
const WIRE = {
  red: ["#D83A2E", "#8F2019"],
  black: ["#383C42", "#0B0C0E"],
  yellow: ["#F0B825", "#A07409"],
  green: ["#2E9B57", "#1B6334"],
  orange: ["#EE8420", "#A5540B"],
};
const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

// ─── geometry ───────────────────────────────────────────────
const P = 18;                       // 0.1 inch
const M = 28;                       // canvas margin
const X0 = 272;                     // breadboard left edge
const UT = 128;                     // Uno top edge
const UNO_W = 486, UNO_H = 378;     // 2.7 in × 2.1 in
const GAP = 40;
const BT = UT + UNO_H + GAP;        // breadboard top edge
const BW = 594, BH = 364;
const W = X0 + BW + M, H = BT + BH + M;

const colX = (c) => X0 + 36 + (c - 1) * P;
const ROW = { a: 86, b: 104, c: 122, d: 140, e: 158, f: 212, g: 230, h: 248, i: 266, j: 284 };
const RAIL = { "+t": 20, "-t": 38, "+b": 326, "-b": 344 };
const RAIL_COLS = Array.from({ length: 29 }, (_, i) => i + 1).filter((c) => c % 6 !== 0);
const TROUGH_Y = BT + 185;

/** `17a` or `+t3` → hole centre. */
const hole = (id) => {
  const r = /^([+-][tb])(\d+)$/.exec(id);
  if (r) {
    if (!RAIL_COLS.includes(+r[2])) throw new Error(`rail ${id} has no hole`);
    return [colX(+r[2]), BT + RAIL[r[1]]];
  }
  const h = /^(\d+)([a-j])$/.exec(id);
  if (!h) throw new Error(`bad hole ${id}`);
  return [colX(+h[1]), BT + ROW[h[2]]];
};

// Uno, in mils from its lower-left corner (USB end on the left).
const UX = X0 - 198;
const mil = (mx, my) => [UX + mx * 0.18, UT + (2100 - my) * 0.18];
const DIGITAL = [
  ["SCL", 840], ["SDA", 940], ["AREF", 1040], ["GND", 1140], ["13", 1240], ["12", 1340],
  ["~11", 1440], ["~10", 1540], ["~9", 1640], ["8", 1740],
  ["7", 1900], ["~6", 2000], ["~5", 2100], ["4", 2200], ["~3", 2300], ["2", 2400], ["TX 1", 2500], ["RX 0", 2600],
];
const POWER = [["NC", 1100], ["IOREF", 1200], ["RESET", 1300], ["3.3V", 1400], ["5V", 1500], ["GND", 1600], ["GND", 1700], ["VIN", 1800]];
const ANALOG = [["A0", 2000], ["A1", 2100], ["A2", 2200], ["A3", 2300], ["A4", 2400], ["A5", 2500]];
const pinName = (label) => label.replace(/^~/, "").replace(/^TX /, "").replace(/^RX /, "");
const unoPin = (name, which = 0) => {
  const all = [...DIGITAL.map(([l, x]) => [pinName(l), x, 2000]), ...POWER.map(([l, x]) => [l, x, 100]), ...ANALOG.map(([l, x]) => [l, x, 100])];
  const hits = all.filter(([l]) => l === name);
  const [, x, y] = hits[which];
  return mil(x, y);
};
const USED_PINS = new Set(["5V", "A0", "2", "3"]);
const USED_GND_MIL = 1600;

// ─── svg helpers ────────────────────────────────────────────
const n = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attrs = (a) => Object.entries(a).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}="${typeof v === "number" ? n(v) : esc(v)}"`).join(" ");
const tag = (name, a, inner) => (inner === undefined ? `<${name} ${attrs(a)}/>` : `<${name} ${attrs(a)}>${inner}</${name}>`);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");
const measure = (text, size, weight = 400, spacing = 0) =>
  page.evaluate(([t, s, w, f, sp]) => {
    const ctx = document.getElementById("c").getContext("2d");
    ctx.font = `${w} ${s}px ${f}`;
    return ctx.measureText(t).width + sp * t.length;
  }, [text, size, weight, FONT, spacing]);

const layers = { board: [], jumpers: [], parts: [], uno: [], wires: [], labels: [] };
/** Everything that takes space, for the clearance check. */
const ink = { labels: [], bodies: [], wires: [], ends: [] };

async function label(layer, text, x, y, { size = 11.5, weight = 400, fill = INK, anchor = "start", spacing = 0, owner = "" } = {}) {
  const w = await measure(text, size, weight, spacing);
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  ink.labels.push({ text, x: x0, y: y - size * 0.74, w, h: size * 0.96, owner });
  layers[layer].push(tag("text", { x, y, "font-size": size, "font-weight": weight === 400 ? undefined : weight, fill, "text-anchor": anchor === "start" ? undefined : anchor, "letter-spacing": spacing || undefined }, esc(text)));
}

// ─── title ──────────────────────────────────────────────────
await label("labels", "Button, Knob and LED", M, 44, { size: 20, weight: 700 });
await label("labels", "Arduino Uno: the button on pin 2 (10 kΩ pull-down) switches the LED on PWM pin 3; the knob on A0 sets its brightness.", M, 68, { size: 12.5, fill: MUTED });

// ─── breadboard ─────────────────────────────────────────────
{
  const b = layers.board;
  b.push(tag("rect", { x: X0, y: BT, width: BW, height: BH, rx: 7, fill: BOARD, stroke: BOARD_EDGE, "stroke-width": 1.2 }));
  for (const gy of [56, 312]) b.push(tag("line", { x1: X0 + 8, y1: BT + gy, x2: X0 + BW - 8, y2: BT + gy, stroke: GROOVE, "stroke-width": 1.4 }));
  b.push(tag("rect", { x: X0 + 30, y: BT + 174, width: BW - 60, height: 22, rx: 3, fill: TROUGH }));
  // rail stripes, signs and holes
  for (const [lineY, color] of [[9, RAIL_POS], [49, RAIL_NEG], [315, RAIL_POS], [355, RAIL_NEG]])
    b.push(tag("line", { x1: X0 + 30, y1: BT + lineY, x2: X0 + BW - 30, y2: BT + lineY, stroke: color, "stroke-width": 1.6 }));
  for (const [rail, sign, color] of [["+t", "+", RAIL_POS], ["-t", "−", RAIL_NEG], ["+b", "+", RAIL_POS], ["-b", "−", RAIL_NEG]]) {
    for (const sx of [X0 + 17, X0 + BW - 17])
      b.push(tag("text", { x: sx, y: BT + RAIL[rail] + 4.5, "font-size": 13, "font-weight": 700, fill: color, "text-anchor": "middle" }, sign));
    for (const c of RAIL_COLS) {
      const [x, y] = hole(`${rail}${c}`);
      b.push(tag("rect", { class: "hole", "data-hole": `${rail}${c}`, x: x - 2.2, y: y - 2.2, width: 4.4, height: 4.4, rx: 0.9, fill: HOLE }));
    }
  }
  for (let c = 1; c <= 30; c++) for (const r of "abcdefghij") {
    const [x, y] = hole(`${c}${r}`);
    b.push(tag("rect", { class: "hole", "data-hole": `${c}${r}`, x: x - 2.2, y: y - 2.2, width: 4.4, height: 4.4, rx: 0.9, fill: HOLE }));
  }
  for (const r of "abcdefghij") for (const sx of [X0 + 17, X0 + BW - 17])
    b.push(tag("text", { x: sx, y: BT + ROW[r] + 3.2, "font-size": 9, fill: SILK, "text-anchor": "middle" }, r));
  for (const c of [1, 5, 10, 15, 20, 25, 30]) for (const sy of [69, 305])
    b.push(tag("text", { x: colX(c), y: BT + sy, "font-size": 9, fill: SILK, "text-anchor": "middle" }, String(c)));
}

// ─── Arduino Uno ────────────────────────────────────────────
{
  const u = layers.uno;
  const pt = (mx, my) => mil(mx, my).map(n).join(" ");
  u.push(tag("path", { d: `M ${pt(0, 2100)} L ${pt(2620, 2100)} L ${pt(2700, 2020)} L ${pt(2700, 80)} L ${pt(2620, 0)} L ${pt(0, 0)} Z`, fill: PCB, stroke: PCB_EDGE, "stroke-width": 1.2, "stroke-linejoin": "round" }));
  ink.bodies.push({ id: "uno", x: UX, y: UT, w: UNO_W, h: UNO_H });
  for (const [mx, my] of [[550, 100], [600, 2000], [2600, 1400], [2600, 300]]) {
    const [x, y] = mil(mx, my);
    u.push(tag("circle", { cx: x, cy: y, r: 11, fill: "#C9CED3" }), tag("circle", { cx: x, cy: y, r: 6.5, fill: "#FFFFFF" }));
  }
  // USB-B and barrel jack on the left end
  { const [x, y] = mil(-245, 1712); u.push(tag("rect", { x, y, width: 630 * 0.18, height: 472 * 0.18, rx: 2, fill: "#C9CDD2", stroke: "#8A9098", "stroke-width": 1 }), tag("rect", { x: x + 8, y: y + 20, width: 36, height: 45, rx: 2, fill: "#9CA3AB" })); }
  { const [x, y] = mil(-70, 480); u.push(tag("rect", { x, y, width: 630 * 0.18, height: 355 * 0.18, rx: 3, fill: "#26282C", stroke: "#0B0C0E", "stroke-width": 1 }), tag("circle", { cx: x + 22, cy: y + 32, r: 12, fill: "#3C3F45" }), tag("circle", { cx: x + 22, cy: y + 32, r: 4, fill: "#8A9098" })); }
  // reset button
  { const [x, y] = mil(300, 1900); u.push(tag("rect", { x: x - 15, y: y - 11, width: 30, height: 22, rx: 2, fill: "#C9CDD2", stroke: "#8A9098", "stroke-width": 0.8 }), tag("circle", { cx: x, cy: y, r: 6.5, fill: "#B3342B" })); }
  // ATmega328P
  {
    const [x, y] = mil(1230, 840);
    const w = 1400 * 0.18, h = 320 * 0.18;
    for (let i = 0; i < 14; i++) {
      const px = mil(1280 + i * 100, 0)[0];
      u.push(tag("rect", { x: px - 3.5, y: y - 4, width: 7, height: 4, fill: "#B9BEC4" }), tag("rect", { x: px - 3.5, y: y + h, width: 7, height: 4, fill: "#B9BEC4" }));
    }
    u.push(tag("rect", { x, y, width: w, height: h, rx: 2, fill: "#232529" }));
    u.push(tag("path", { d: `M ${n(x)} ${n(y + h / 2 - 7)} A 7 7 0 0 1 ${n(x)} ${n(y + h / 2 + 7)} Z`, fill: "#3A3D42" }));
    await label("uno", "ATmega328P", x + w / 2, y + h / 2 + 3.5, { size: 10, fill: "#8E949B", anchor: "middle", spacing: 0.4, owner: "uno" });
  }
  await label("uno", "Arduino", mil(1610, 0)[0], UT + 128, { size: 13, weight: 600, fill: PCB_SILK, anchor: "middle", spacing: 1.2, owner: "uno" });
  await label("uno", "UNO", mil(1610, 0)[0], UT + 160, { size: 28, weight: 800, fill: PCB_SILK, anchor: "middle", spacing: 1, owner: "uno" });

  // headers, sockets and silkscreen pin names
  const header = async (list, my, side) => {
    const xs = list.map(([, mx]) => mil(mx, my)[0]);
    const y = mil(0, my)[1];
    u.push(tag("rect", { x: xs[0] - 9, y: y - 9, width: xs.at(-1) - xs[0] + 18, height: 18, rx: 1.5, fill: "#202225" }));
    for (const [i, [lbl, mx]] of list.entries()) {
      const x = xs[i];
      const name = pinName(lbl);
      u.push(tag("rect", { class: "socket", "data-pin": name, x: x - 4, y: y - 4, width: 8, height: 8, fill: "#0A0A0B", stroke: "#3A3D42", "stroke-width": 1 }));
      const used = USED_PINS.has(name) || (name === "GND" && mx === USED_GND_MIL);
      const size = used ? 8.5 : 7.5;
      const lw = await measure(lbl, size, used ? 700 : 400);
      const tx = x + size * 0.36;
      const ty = side === "below" ? y + 13 : y - 13;
      u.push(tag("text", { x: tx, y: ty, transform: `rotate(-90 ${n(tx)} ${n(ty)})`, "font-size": size, "font-weight": used ? 700 : undefined, fill: used ? "#FFFFFF" : PCB_SILK_DIM, "text-anchor": side === "below" ? "end" : "start" }, esc(lbl)));
      ink.labels.push({ text: lbl, x: x - size * 0.4, y: side === "below" ? ty : ty - lw, w: size * 0.8, h: lw, owner: "uno" });
    }
    return [xs[0], xs.at(-1)];
  };
  const [d1a, d1b] = await header(DIGITAL.slice(0, 10), 2000, "below");
  const [d2a, d2b] = await header(DIGITAL.slice(10), 2000, "below");
  const [pa, pb] = await header(POWER, 100, "above");
  const [aa, ab] = await header(ANALOG, 100, "above");
  await label("uno", "DIGITAL (PWM ~)", (d1a + d2b) / 2, UT + 66, { size: 8, weight: 700, fill: PCB_SILK, anchor: "middle", spacing: 0.8, owner: "uno" });
  await label("uno", "POWER", (pa + pb) / 2, UT + 313, { size: 8, weight: 700, fill: PCB_SILK, anchor: "middle", spacing: 0.8, owner: "uno" });
  await label("uno", "ANALOG IN", (aa + ab) / 2, UT + 313, { size: 8, weight: 700, fill: PCB_SILK, anchor: "middle", spacing: 0.8, owner: "uno" });
  void d1b; void d2a;
}

// ─── parts ──────────────────────────────────────────────────
const legEnd = (part, pin, id) => {
  const [x, y] = hole(id);
  ink.ends.push({ x, y, r: 2.4, owner: part });
  return tag("circle", { class: "lead-end", "data-part": part, "data-pin": pin, cx: x, cy: y, r: 2.4, fill: LEG_END });
};
const leg = (x1, y1, x2, y2) => tag("line", { x1, y1, x2, y2, stroke: LEG, "stroke-width": 2, "stroke-linecap": "round" });

const BANDS = { black: "#1F1F1F", brown: "#7B4A26", red: "#C8302A", orange: "#E47B22", gold: "#C9A23F" };
function resistor(id, from, to, bands) {
  const [x1, y] = hole(from), [x2] = hole(to);
  const cx = (x1 + x2) / 2, bw = 46, bh = 13;
  const g = [leg(x1, y, x2, y)];
  g.push(tag("rect", { x: cx - bw / 2, y: y - bh / 2, width: bw, height: bh, rx: 6, fill: "#DCC39A", stroke: "#A88B5C", "stroke-width": 0.9 }));
  for (const ex of [cx - bw / 2 + 6.5, cx + bw / 2 - 6.5]) g.push(tag("ellipse", { cx: ex, cy: y, rx: 7, ry: 7.6, fill: "#DCC39A", stroke: "#A88B5C", "stroke-width": 0.9 }));
  g.push(tag("rect", { x: cx - bw / 2 + 5, y: y - bh / 2 + 0.5, width: bw - 10, height: bh - 1, fill: "#DCC39A" }));
  [9.5, 17, 24.5, 36.5].forEach((off, i) => g.push(tag("rect", { x: cx - bw / 2 + off - 2, y: y - (i === 0 ? 7.2 : bh / 2), width: 4, height: i === 0 ? 14.4 : bh, fill: BANDS[bands[i]] })));
  g.push(tag("rect", { x: cx - bw / 2 + 4, y: y - 4.6, width: bw - 8, height: 2, rx: 1, fill: "#FFFFFF", opacity: 0.28 }));
  g.push(legEnd(id, "1", from), legEnd(id, "2", to));
  ink.bodies.push({ id, x: cx - bw / 2 - 0.5, y: y - 7.6, w: bw + 1, h: 15.2 });
  layers.parts.push(tag("g", { "data-part": id }, g.join("")));
}

function pushbutton(id, anchor) {
  const [x1, ye] = hole(anchor);
  const col = +/^\d+/.exec(anchor)[0];
  const x2 = colX(col + 2), yf = BT + ROW.f, cx = (x1 + x2) / 2, cy = TROUGH_Y;
  const g = [leg(x1, ye, x1, cy - 20), leg(x2, ye, x2, cy - 20), leg(x1, yf, x1, cy + 20), leg(x2, yf, x2, cy + 20)];
  g.push(tag("rect", { x: cx - 20, y: cy - 20, width: 40, height: 40, rx: 3, fill: "#2B2D31", stroke: "#121314", "stroke-width": 1 }));
  for (const [dx, dy] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) g.push(tag("circle", { cx: cx + dx, cy: cy + dy, r: 1.9, fill: "#7D8288" }));
  g.push(tag("circle", { cx, cy, r: 11, fill: "#45494F", stroke: "#1A1B1E", "stroke-width": 1 }), tag("circle", { cx: cx - 1.5, cy: cy - 1.5, r: 7.5, fill: "#555A62" }));
  g.push(legEnd(id, "1", anchor), legEnd(id, "2", `${col + 2}e`), legEnd(id, "3", `${col}f`), legEnd(id, "4", `${col + 2}f`));
  ink.bodies.push({ id, x: cx - 20, y: cy - 20, w: 40, h: 40 });
  layers.parts.push(tag("g", { "data-part": id }, g.join("")));
}

function led(id, anode, cathode) {
  const [x, ya] = hole(anode), [, yk] = hole(cathode);
  const cy = (ya + yk) / 2, top = yk < ya ? -1 : 1;
  const g = [leg(x, ya, x, cy), leg(x, yk, x, cy)];
  const fy = cy + top * 14, half = Math.sqrt(16.5 ** 2 - 14 ** 2);
  g.push(tag("path", { d: `M ${n(x - half)} ${n(fy)} L ${n(x + half)} ${n(fy)} A 16.5 16.5 0 1 ${top < 0 ? 1 : 0} ${n(x - half)} ${n(fy)} Z`, fill: "#B8261F" }));
  g.push(tag("circle", { cx: x, cy: cy - top * 0.8, r: 13.2, fill: "#E23B30" }));
  g.push(tag("rect", { x: x - 4.5, y: cy - 3, width: 3, height: 9, fill: "#8F1C16", opacity: 0.35 }), tag("rect", { x: x + 1.5, y: cy - 5, width: 3.5, height: 11, fill: "#8F1C16", opacity: 0.35 }));
  g.push(tag("ellipse", { cx: x - 5, cy: cy - 5, rx: 4.6, ry: 2.8, fill: "#FFFFFF", opacity: 0.55, transform: `rotate(-35 ${n(x - 5)} ${n(cy - 5)})` }));
  g.push(legEnd(id, "anode", anode), legEnd(id, "cathode", cathode));
  ink.bodies.push({ id, x: x - 16.5, y: cy - 16.5, w: 33, h: 33 });
  layers.parts.push(tag("g", { "data-part": id }, g.join("")));
}

function trimmer(id, anchor) {
  const col = +/^\d+/.exec(anchor)[0];
  const [x1, y] = hole(anchor), cx = colX(col + 1), x3 = colX(col + 2);
  const top = y - 60, size = 50, rc = top + size / 2;
  const g = [leg(x1, y, x1, top + size), leg(cx, y, cx, top + size), leg(x3, y, x3, top + size)];
  g.push(tag("rect", { x: cx - size / 2, y: top, width: size, height: size, rx: 4, fill: "#2E64AE", stroke: "#1D4379", "stroke-width": 1 }));
  g.push(tag("circle", { cx, cy: rc, r: 16, fill: "#F1ECDF", stroke: "#BDB39B", "stroke-width": 1 }));
  g.push(tag("g", { transform: `rotate(30 ${n(cx)} ${n(rc)})` }, tag("rect", { x: cx - 10, y: rc - 1.5, width: 20, height: 3, rx: 1, fill: "#7A705C" }) + tag("rect", { x: cx - 1.5, y: rc - 10, width: 3, height: 20, rx: 1, fill: "#7A705C" })));
  g.push(legEnd(id, "1", anchor), legEnd(id, "2", `${col + 1}e`), legEnd(id, "3", `${col + 2}e`));
  ink.bodies.push({ id, x: cx - size / 2, y: top, w: size, h: size });
  layers.parts.push(tag("g", { "data-part": id }, g.join("")));
}

trimmer("pot1", "7e");
resistor("r1", "13c", "17c", ["brown", "black", "orange", "gold"]);
pushbutton("sw1", "17e");
resistor("r2", "22h", "26h", ["red", "red", "brown", "gold"]);
led("led1", "26f", "26e");

// ─── wires ──────────────────────────────────────────────────
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
/** Sampled centre line of the same rounded polyline, for the clearance check. */
function samples(points, radius) {
  const out = [];
  const seg = (a, b) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t <= len; t += 2) out.push([a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len]); };
  let cur = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1], [x, y] = points[i], [nx, ny] = points[i + 1];
    const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const a = [x - ((x - px) / l1) * r, y - ((y - py) / l1) * r], b = [x + ((nx - x) / l2) * r, y + ((ny - y) / l2) * r];
    seg(cur, a);
    for (let t = 0; t <= 1; t += 0.1) out.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * x + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * y + t * t * b[1]]);
    cur = b;
  }
  seg(cur, points.at(-1));
  return out;
}

function wire(name, color, points, { layer = "wires", radius = 22 } = {}) {
  const [core, shade] = WIRE[color];
  const d = rounded(points, radius);
  const g = [
    tag("path", { d, fill: "none", stroke: shade, "stroke-width": 6.4, "stroke-linecap": "round", "stroke-linejoin": "round" }),
    tag("path", { class: "wire-core", "data-wire": name, d, fill: "none", stroke: core, "stroke-width": 4.2, "stroke-linecap": "round", "stroke-linejoin": "round" }),
    tag("path", { d, fill: "none", stroke: "#FFFFFF", "stroke-width": 1.1, opacity: color === "black" ? 0.22 : 0.3, "stroke-linecap": "round", transform: "translate(-0.9 -0.9)" }),
  ];
  for (const [x, y] of [points[0], points.at(-1)]) {
    g.push(tag("circle", { cx: x, cy: y, r: 3.7, fill: shade }), tag("circle", { cx: x, cy: y, r: 1.6, fill: "#D4D7DB" }));
    ink.ends.push({ x, y, r: 3.7, owner: name });
  }
  ink.wires.push({ name, pts: samples(points, radius), ends: [points[0], points.at(-1)] });
  layers[layer].push(tag("g", { "data-wire": name }, g.join("")));
}

const [p5vx, p5vy] = unoPin("5V");
const [pgx, pgy] = mil(USED_GND_MIL, 100);
const [pa0x, pa0y] = unoPin("A0");
const [p2x, p2y] = unoPin("2");
const [p3x, p3y] = unoPin("3");

wire("5V", "red", [[p5vx, p5vy], hole("+t3")]);
wire("GND", "black", [[pgx, pgy], hole("-t4")]);
wire("A0", "yellow", [[pa0x, pa0y], hole("8a")]);
wire("pin 2", "green", [[p2x, p2y], [p2x, UT - 16], [colX(17), UT - 16], hole("17a")]);
wire("pin 3", "orange", [[p3x, p3y], [p3x, UT - 34], [colX(22), UT - 34], hole("22f")]);
// short on-board jumpers
wire("pot 5V", "red", [hole("+t7"), hole("7a")], { layer: "jumpers" });
wire("pot GND", "black", [hole("-t9"), hole("9a")], { layer: "jumpers" });
wire("pull-down GND", "black", [hole("-t13"), hole("13a")], { layer: "jumpers" });
wire("button 5V", "red", [hole("+t19"), hole("19a")], { layer: "jumpers" });
wire("LED GND", "black", [hole("-t26"), hole("26a")], { layer: "jumpers" });

// ─── part labels (in the trough, or under a resistor) ───────
await label("labels", "10 kΩ pot", colX(8), TROUGH_Y + 4, { size: 11, weight: 600, fill: "#4A4F57", anchor: "middle", owner: "pot1" });
await label("labels", "button", colX(18) - 27, TROUGH_Y + 4, { size: 11, weight: 600, fill: "#4A4F57", anchor: "end", owner: "sw1" });
await label("labels", "LED", colX(26) + 23, TROUGH_Y + 4, { size: 11, weight: 600, fill: "#4A4F57", owner: "led1" });
// A resistor's value sits two rows under it on a plate snapped to the hole grid:
// the plate hides three whole unused holes, never part of one.
for (const [text, col, row, owner] of [["10 kΩ", 15, "e", "r1"], ["220 Ω", 24, "j", "r2"]]) {
  const x = colX(col), y = BT + ROW[row];
  const w = await measure(text, 11, 600);
  if (w + 8 > 3 * P) throw new Error(`label ${text} is wider than its three-hole plate`);
  layers.labels.push(tag("rect", { x: colX(col - 1) - P / 2, y: y - P / 2, width: 3 * P, height: P, rx: 3, fill: BOARD }));
  await label("labels", text, x, y + 4, { size: 11, weight: 600, fill: "#4A4F57", anchor: "middle", owner });
}

// ─── wire legend ────────────────────────────────────────────
{
  const lx = M, ly = BT + 30;
  await label("labels", "Wires", lx, ly, { size: 12, weight: 700 });
  const rows = [["red", "5 V"], ["black", "Ground"], ["yellow", "A0 · knob wiper"], ["green", "Pin 2 · button"], ["orange", "Pin 3 · LED"]];
  for (const [i, [color, text]] of rows.entries()) {
    const y = ly + 26 + i * 23;
    const [core, shade] = WIRE[color];
    layers.labels.push(tag("line", { x1: lx + 3, y1: y - 4, x2: lx + 27, y2: y - 4, stroke: shade, "stroke-width": 6.4, "stroke-linecap": "round" }), tag("line", { x1: lx + 3, y1: y - 4, x2: lx + 27, y2: y - 4, stroke: core, "stroke-width": 4.2, "stroke-linecap": "round" }));
    await label("labels", text, lx + 38, y, { size: 11.5, fill: MUTED });
  }
}

// ─── clearance checks ───────────────────────────────────────
const problems = [];
const overlap = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const inRect = ([x, y], r, pad) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
for (let i = 0; i < ink.labels.length; i++) for (let j = i + 1; j < ink.labels.length; j++)
  if (overlap(ink.labels[i], ink.labels[j], 1)) problems.push(`label "${ink.labels[i].text}" overlaps label "${ink.labels[j].text}"`);
for (const l of ink.labels) {
  if (l.x < 4 || l.y < 4 || l.x + l.w > W - 4 || l.y + l.h > H - 4) problems.push(`label "${l.text}" leaves the canvas`);
  for (const w of ink.wires) if (w.pts.some((p) => inRect(p, l, 4))) problems.push(`wire ${w.name} touches label "${l.text}"`);
  for (const b of ink.bodies) if (b.id !== l.owner && overlap(l, b, 3)) problems.push(`label "${l.text}" touches part ${b.id}`);
  for (const e of ink.ends) if (inRect([e.x, e.y], l, e.r + 2)) problems.push(`label "${l.text}" covers a lead or wire end (${e.owner})`);
}
for (const w of ink.wires) {
  // A wire may cross the Uno's edge only where it plugs into a header socket 18 px in.
  const own = (p, reach) => w.ends.some(([x, y]) => Math.hypot(p[0] - x, p[1] - y) < reach);
  for (const b of ink.bodies)
    if (w.pts.some((p) => !own(p, b.id === "uno" ? 24 : 14) && inRect(p, b, 3.5))) problems.push(`wire ${w.name} crosses part ${b.id}`);
  for (const e of ink.ends) if (e.owner !== w.name && w.pts.some((p) => Math.hypot(p[0] - e.x, p[1] - e.y) < e.r + 4)) problems.push(`wire ${w.name} runs over the end of ${e.owner}`);
}
for (let i = 0; i < ink.wires.length; i++) for (let j = i + 1; j < ink.wires.length; j++) {
  const a = ink.wires[i], b = ink.wires[j];
  if (a.pts.some((p) => b.pts.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 7))) problems.push(`wire ${a.name} touches wire ${b.name}`);
}
await browser.close();

// ─── write ──────────────────────────────────────────────────
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT.replace(/"/g, "")}">
<title>Button, Knob and LED</title>
<desc>Breadboard wiring view of an Arduino Uno build, drawn at true scale with 0.1 inch between holes. The Uno sits above a half-size breadboard with its power and analog header facing the board. A red wire runs from the Uno 5V pin to the top positive rail at column 3 and a black wire from GND to the top ground rail at column 4. A blue 10 kΩ trimmer potentiometer has its legs in holes 7e, 8e and 9e; short red and black jumpers feed its outer legs from the rails and a yellow wire takes its wiper from column 8 to A0. A pushbutton straddles the centre trough with legs in 17e, 19e, 17f and 19f; a red jumper brings 5 V to column 19, a green wire runs from pin 2 to column 17, and a 10 kΩ resistor from 13c to 17c with a black jumper at column 13 pulls pin 2 to ground. An orange wire runs from PWM pin 3 to 22f, a 220 Ω resistor runs from 22h to 26h, and a red LED straddles the trough with its anode in 26f and its flat cathode side in 26e, returned to ground by a black jumper at column 26.</desc>
<rect width="${W}" height="${H}" fill="#FFFFFF"/>
${Object.values(layers).map((l) => l.join("\n")).join("\n")}
</svg>
`;
await writeFile(OUT, svg);
console.log(`wrote ${OUT.pathname} (${W}×${H})`);
console.log(problems.length ? `${problems.length} clearance problems:\n  ${problems.join("\n  ")}` : "clearance: 0 problems");
if (problems.length) process.exitCode = 1;
