/** Draw visual-eval/exemplars/pid/ideal.svg — the look the P&ID engine is aiming at.
 *
 *   node scripts/visual-eval/draw-pid-exemplar.mjs
 *
 * Subject is the drawing every process-control course starts with: a vessel
 * whose level is regulated by a DCS loop, plus a high-level trip that shuts the
 * inlet through hardwired logic the DCS cannot reach. That pairing is the whole
 * point of the sheet, so the drawing has to make the two paths visibly separate.
 *
 * Ink-only, like the logic exemplar: a P&ID earns its hierarchy from line weight
 * and line decoration, never colour. Nothing is written until every label has
 * been checked against every other label, every line and the canvas edge.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const INK = "#1E293B", MUTED = "#64748B", PAPER = "#FFFFFF", RULE = "#E2E8F0";
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const W = 1560, H = 960, M = 46;
const SW = { process: 2.5, minor: 1.5, signal: 1.4, symbol: 1.6 };
const R_BUB = 18, R_DOT = 3.5;

const g = [];                       // graphics, in paint order
const texts = [];
const boxes = [];                   // solid boxes labels must avoid (gate bodies etc.)
const segs = [];                    // every drawn line segment, for the label check

const n2 = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pts = (p) => p.map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ");
const record = (p) => { for (let i = 0; i + 1 < p.length; i++) segs.push([p[i], p[i + 1]]); };
const box = (x0, y0, x1, y1) => boxes.push({ x0, y0, x1, y1 });
const text = (s, x, y, o = {}) => texts.push({ s, x, y, fs: o.fs ?? 11.5, bold: !!o.bold,
  anchor: o.anchor ?? "middle", fill: o.fill ?? INK, ls: o.ls ?? 0, skip: !!o.skip });

/* ---------- line types ---------- */
const walk = (p, step, fn) => {
  let carry = step / 2;
  for (let i = 0; i + 1 < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (!len) continue;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    for (let d = carry; d < len; d += step) fn(x1 + ux * d, y1 + uy * d, ux, uy);
    carry = ((carry - len) % step + step) % step;
  }
};
const pipe = (p, minor = false) => {
  record(p);
  g.push(`<polyline points="${pts(p)}" fill="none" stroke="${INK}" stroke-width="${minor ? SW.minor : SW.process}" stroke-linejoin="miter" stroke-linecap="butt"/>`);
};
const electric = (p) => {
  record(p);
  g.push(`<polyline points="${pts(p)}" fill="none" stroke="${INK}" stroke-width="${SW.signal}" stroke-dasharray="7 5"/>`);
};
const pneumatic = (p) => {
  record(p);
  g.push(`<polyline points="${pts(p)}" fill="none" stroke="${INK}" stroke-width="${SW.signal}"/>`);
  // ISA pneumatic mark: a short slash leaning at 45 degrees across the line,
  // not a rung — a rung reads as a ladder rather than as a signal.
  walk(p, 34, (x, y, ux, uy) => {
    const dx = (ux - uy) / Math.SQRT2, dy = (uy + ux) / Math.SQRT2, k = 6;
    g.push(`<line x1="${n2(x - dx * k)}" y1="${n2(y - dy * k)}" x2="${n2(x + dx * k)}" y2="${n2(y + dy * k)}" stroke="${INK}" stroke-width="${SW.signal}"/>`);
  });
};
const capillary = (p) => {
  record(p);
  g.push(`<polyline points="${pts(p)}" fill="none" stroke="${INK}" stroke-width="${SW.signal}"/>`);
  walk(p, 14, (x, y) => g.push(`<circle cx="${n2(x)}" cy="${n2(y)}" r="2" fill="${INK}"/>`));
};
const dot = (x, y) => g.push(`<circle cx="${x}" cy="${y}" r="${R_DOT}" fill="${INK}"/>`);
/** A horizontal run that hops the vertical at `over` — the reference's crossing
 *  jumper, which is what keeps a dotted sensing line legible where it meets a
 *  heavy pipe it does not join. */
const hopRun = (y, from, to, over, r = 9) => {
  const dir = to > from ? 1 : -1;
  const a = over - dir * r, b = over + dir * r;
  const p1 = [[from, y], [a, y]], p2 = [[b, y], [to, y]];
  record(p1); record(p2);
  return { p1, p2, arc: `<path d="M ${a} ${y} A ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${b} ${y}" fill="none" stroke="${INK}" stroke-width="${SW.signal}"/>` };
};

/* ---------- equipment ---------- */
const tank = (cx, top, w, h, id, name) => {
  const x0 = cx - w / 2, x1 = cx + w / 2, dome = 26;
  g.push(`<path d="M ${x0} ${top} L ${x0} ${top + h} L ${x1} ${top + h} L ${x1} ${top} A ${w / 2} ${dome} 0 0 0 ${x0} ${top} Z" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.symbol}" stroke-linejoin="round"/>`);
  box(x0, top - dome, x1, top + h);
  text(id, cx, top + h / 2 - 4, { bold: true, fs: 13, skip: true });
  text(name, cx, top + h / 2 + 16, { fill: MUTED, skip: true });
  return { top: top - dome, bottom: top + h };
};
const vessel = (cx, top, bottom, w, id, name) => {
  const x0 = cx - w / 2, x1 = cx + w / 2, ry = 22;
  g.push(`<path d="M ${x0} ${top} A ${w / 2} ${ry} 0 0 1 ${x1} ${top} L ${x1} ${bottom} A ${w / 2} ${ry} 0 0 1 ${x0} ${bottom} Z" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.symbol}" stroke-linejoin="round"/>`);
  box(x0, top - ry, x1, bottom + ry);
  text(id, cx, (top + bottom) / 2 - 4, { bold: true, fs: 13, skip: true });
  text(name, cx, (top + bottom) / 2 + 16, { fill: MUTED, skip: true });
};
const pump = (cx, cy, id, name) => {
  g.push(`<circle cx="${cx}" cy="${cy}" r="30" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
  g.push(`<polygon points="${cx - 14},${cy - 16} ${cx - 14},${cy + 16} ${cx + 18},${cy}" fill="none" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
  box(cx - 30, cy - 30, cx + 30, cy + 30);
  text(id, cx, cy + 52, { bold: true, fs: 12 });
  text(name, cx, cy + 72, { fill: MUTED });
};
/** Every valve is the same bowtie body; the type is what sits on top of it. */
const bowtie = (cx, cy, w = 44, h = 28) => {
  g.push(`<path d="M ${cx - w / 2} ${cy - h / 2} L ${cx - w / 2} ${cy + h / 2} L ${cx} ${cy} Z M ${cx + w / 2} ${cy - h / 2} L ${cx + w / 2} ${cy + h / 2} L ${cx} ${cy} Z" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.symbol}" stroke-linejoin="round"/>`);
  box(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
};
const valveLabels = (cx, cy, id, name) => {
  text(id, cx, cy + 50, { bold: true, fs: 12 });
  text(name, cx, cy + 70, { fill: MUTED });
};
const controlValve = (cx, cy, kind, fail, id, name) => {
  bowtie(cx, cy);
  g.push(`<line x1="${cx}" y1="${cy - 14}" x2="${cx}" y2="${cy - 36}" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
  segs.push([[cx, cy - 14], [cx, cy - 36]]);
  if (kind === "diaphragm") {
    g.push(`<path d="M ${cx - 20} ${cy - 36} A 20 14 0 0 1 ${cx + 20} ${cy - 36} Z" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
    box(cx - 20, cy - 50, cx + 20, cy - 36);
    text(fail, cx + 30, cy - 40, { anchor: "start", fs: 12, bold: true });
  } else {
    g.push(`<rect x="${cx - 13}" y="${cy - 49}" width="26" height="26" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
    g.push(`<text x="${cx}" y="${cy - 31}" font-family="${FONT}" font-size="13" font-weight="600" fill="${INK}" text-anchor="middle">S</text>`);
    box(cx - 13, cy - 49, cx + 13, cy - 23);
    text(fail, cx + 23, cy - 40, { anchor: "start", fs: 12, bold: true });
  }
  valveLabels(cx, cy, id, name);
};
const gateValve = (cx, cy, id, name) => { bowtie(cx, cy); valveLabels(cx, cy, id, name); };
const checkValve = (cx, cy, id, name) => {
  bowtie(cx, cy);
  // swing flapper on the downstream side: the mark that says "one way only"
  g.push(`<line x1="${cx + 4}" y1="${cy + 13}" x2="${cx + 16}" y2="${cy - 13}" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
  valveLabels(cx, cy, id, name);
};
const reliefValve = (cx, cy, id, set) => {
  const h = 44, w = 26;
  g.push(`<path d="M ${cx - w / 2} ${cy + h / 2} L ${cx + w / 2} ${cy + h / 2} L ${cx} ${cy} Z M ${cx - w / 2} ${cy - h / 2} L ${cx + w / 2} ${cy - h / 2} L ${cx} ${cy} Z" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.symbol}" stroke-linejoin="round"/>`);
  box(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
  const spring = [[cx, cy - h / 2], [cx - 13, cy - 34], [cx + 13, cy - 42], [cx - 13, cy - 50], [cx + 13, cy - 58], [cx, cy - 64]];
  g.push(`<polyline points="${pts(spring)}" fill="none" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
  record(spring);
  box(cx - 13, cy - 64, cx + 13, cy - h / 2);
  text(id, cx + 26, cy - 8, { anchor: "start", bold: true, fs: 12 });
  text(set, cx + 26, cy + 12, { anchor: "start", fill: MUTED });
};

/* ---------- instruments ---------- */
const bubble = async (cx, cy, letters, num, kind, measure) => {
  g.push(`<circle cx="${cx}" cy="${cy}" r="${R_BUB}" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
  if (kind === "cr_shared") {
    const hex = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      hex.push([cx + R_BUB * Math.cos(a), cy + R_BUB * Math.sin(a)]);
    }
    g.push(`<polygon points="${pts(hex)}" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
    g.push(`<line x1="${cx - R_BUB}" y1="${cy}" x2="${cx + R_BUB}" y2="${cy}" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
  }
  box(cx - R_BUB, cy - R_BUB, cx + R_BUB, cy + R_BUB);
  // a four-letter tag like LSHH has to shrink to stay inside its own bubble
  const wide = await measure(letters, 11.5, 600);
  const fs = Math.min(11.5, (2 * R_BUB - 13) / wide * 11.5);
  g.push(`<text x="${cx}" y="${cy - 3}" font-family="${FONT}" font-size="${n2(fs)}" font-weight="600" fill="${INK}" text-anchor="middle">${esc(letters)}</text>`);
  g.push(`<text x="${cx}" y="${cy + 12}" font-family="${FONT}" font-size="11.5" fill="${INK}" text-anchor="middle">${esc(num)}</text>`);
};
const interlock = (cx, cy, label) => {
  const r = 26;
  g.push(`<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${PAPER}" stroke="${INK}" stroke-width="${SW.symbol}"/>`);
  box(cx - r, cy - r, cx + r, cy + r);
  g.push(`<text x="${cx}" y="${cy + 4}" font-family="${FONT}" font-size="11.5" font-weight="600" fill="${INK}" text-anchor="middle">${esc(label)}</text>`);
};
const lineTag = async (cx, cy, label, measure) => {
  const w = (await measure(label, 9.5, 400, 0.2)) + 16;
  g.push(`<rect x="${n2(cx - w / 2)}" y="${cy - 10}" width="${n2(w)}" height="20" rx="2" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>`);
  box(cx - w / 2, cy - 10, cx + w / 2, cy + 10);
  g.push(`<text x="${cx}" y="${cy + 3.5}" font-family="${FONT}" font-size="9.5" letter-spacing="0.2" fill="${INK}" text-anchor="middle">${esc(label)}</text>`);
};

/* ======================= the drawing ======================= */
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (s, fs, weight, ls = 0) => {
  const key = `${weight}|${fs}|${ls}|${s}`;
  if (!cache.has(key)) cache.set(key, (await page.evaluate(([t, z, w, f]) => {
    const ctx = document.getElementById("c").getContext("2d");
    ctx.font = `${w} ${z}px ${f}`;
    return ctx.measureText(t).width;
  }, [s, fs, weight, 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif'])) + ls * s.length);
  return cache.get(key);
};

const HEADER = 640, LOWER = 750, PANEL = 250;

// field / control-room divide — the line that makes "cr_shared" mean something
g.push(`<line x1="${M}" y1="${PANEL}" x2="${W - M}" y2="${PANEL}" stroke="${MUTED}" stroke-width="1" stroke-dasharray="12 4 2 4"/>`);
text("CONTROL ROOM / DCS", W - M, PANEL - 10, { anchor: "end", fs: 10, fill: MUTED, ls: 1.2 });
text("FIELD", W - M, PANEL + 22, { anchor: "end", fs: 10, fill: MUTED, ls: 1.2 });

tank(170, 470, 160, 140, "TK-100", "Feed Tank");
vessel(620, 400, 680, 120, "V-101", "Surge Vessel");
tank(1380, 470, 160, 140, "TK-102", "Product Tank");
pump(880, LOWER, "P-101", "Transfer Pump");

controlValve(330, HEADER, "solenoid", "FC", "XV-202", "Inlet Shutoff");
gateValve(760, LOWER, "HV-103", "Suction Isolation");
checkValve(1000, HEADER, "CV-104", "Discharge Check");
controlValve(1160, HEADER, "diaphragm", "FO", "LV-101", "Level Control Valve");
reliefValve(590, 272, "PSV-105", "Set 150 psig");

// process piping, left to right
pipe([[170, 610], [170, HEADER], [308, HEADER]]);
pipe([[352, HEADER], [500, HEADER], [500, 340], [650, 340], [650, 378]]);
pipe([[590, 378], [590, 294]], true);
pipe([[620, 702], [620, LOWER], [738, LOWER]]);
pipe([[782, LOWER], [850, LOWER]]);
pipe([[880, 720], [880, HEADER], [978, HEADER]]);
pipe([[1022, HEADER], [1138, HEADER]]);
pipe([[1182, HEADER], [1250, HEADER], [1250, 400], [1380, 400], [1380, 444]]);
// relief discharge to atmosphere
pipe([[590, 208], [590, 190], [648, 190]], true);
g.push(`<path d="M 648 184 L 662 190 L 648 196 Z" fill="${INK}"/>`);
text("TO ATM", 670, 194, { anchor: "start", fill: MUTED });

// instruments and their signals
await bubble(430, 450, "LSHH", "202", "field_discrete", measure);
await bubble(790, 520, "LT", "101", "field_discrete", measure);
await bubble(900, 200, "LIC", "101", "cr_shared", measure);
await bubble(940, 560, "PI", "106", "field_discrete", measure);
interlock(430, 340, "I-202");

{
  // the trip sensing line hops the feed riser it crosses but does not join
  const h = hopRun(450, 560, 448, 500);
  capillary(h.p1); capillary(h.p2); g.push(h.arc);
}
capillary([[680, 520], [772, 520]]);
capillary([[940, HEADER], [940, 578]]);
dot(940, HEADER);
electric([[430, 432], [430, 366]]);
electric([[404, 340], [330, 340], [330, 589]]);
electric([[790, 502], [790, 200], [882, 200]]);
pneumatic([[918, 200], [1160, 200], [1160, 588]]);

await lineTag(240, HEADER, '6"-PW-101-A1A', measure);
await lineTag(1315, 400, '3"-PW-104-A1A', measure);

/* ---------- header, legend, note ---------- */
text("Vessel Level Control with High-Level Shutdown", M, 44, { anchor: "start", fs: 20, bold: true });
text("ISA-5.1 instrumentation on ISO 10628 equipment · process flow left to right", M, 68, { anchor: "start", fill: MUTED });
text("solid dot = connection · jumper = crossing, not connected", W - M, 68, { anchor: "end", fill: MUTED });
g.push(`<line x1="${M}" y1="96" x2="${W - M}" y2="96" stroke="${RULE}" stroke-width="1"/>`);
g.push(`<line x1="${M}" y1="${H - 122}" x2="${W - M}" y2="${H - 122}" stroke="${RULE}" stroke-width="1"/>`);

const LEG_Y = H - 82;
const legend = [
  ["Process", (x) => pipe([[x, LEG_Y], [x + 44, LEG_Y]])],
  ["Process, minor", (x) => pipe([[x, LEG_Y], [x + 44, LEG_Y]], true)],
  ["Electric signal", (x) => electric([[x, LEG_Y], [x + 44, LEG_Y]])],
  ["Pneumatic signal", (x) => pneumatic([[x, LEG_Y], [x + 44, LEG_Y]])],
  ["Capillary / filled system", (x) => capillary([[x, LEG_Y], [x + 44, LEG_Y]])],
];
let lx = M;
for (const [label, draw] of legend) {
  draw(lx);
  text(label, lx + 54, LEG_Y + 4, { anchor: "start", fill: MUTED });
  lx += 54 + (await measure(label, 11.5, 400)) + 42;
}
text("LSHH-202 trips XV-202 through hardwired interlock I-202, so the high-level shutdown stays independent of the LIC-101 loop running in the DCS.",
  M, H - 40, { anchor: "start", fill: MUTED });

/* ---------- collision check ---------- */
const laid = [];
for (const t of texts) {
  const w = await measure(t.s, t.fs, t.bold ? 600 : 400, t.ls);
  const x0 = t.anchor === "end" ? t.x - w : t.anchor === "middle" ? t.x - w / 2 : t.x;
  laid.push({ t, x0, y0: t.y - t.fs * 0.78, x1: x0 + w, y1: t.y + t.fs * 0.24 });
}
const grow = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
const rects = (p, q) => !(p.x1 < q.x0 || p.x0 > q.x1 || p.y1 < q.y0 || p.y0 > q.y1);
const segHits = (a, b, r) => !(Math.max(a[0], b[0]) < r.x0 || Math.min(a[0], b[0]) > r.x1 ||
  Math.max(a[1], b[1]) < r.y0 || Math.min(a[1], b[1]) > r.y1);
const bad = [];
for (const L of laid) {
  const b = grow(L, 3);
  if (b.x0 < 12 || b.y0 < 12 || b.x1 > W - 12 || b.y1 > H - 12) bad.push(`"${L.t.s}" off the sheet`);
  for (const o of laid) if (o !== L && rects(b, grow(o, 3))) bad.push(`"${L.t.s}" over "${o.t.s}"`);
  if (L.t.skip) continue;      // equipment names sit inside their own symbol
  for (const s of segs) if (segHits(s[0], s[1], b)) bad.push(`"${L.t.s}" over a line`);
  for (const q of boxes) if (rects(b, q)) bad.push(`"${L.t.s}" over a symbol`);
}
if (bad.length) { await browser.close(); throw new Error([...new Set(bad)].join("\n  ")); }

const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">`);
out.push(`<title>Vessel Level Control with High-Level Shutdown</title>`);
out.push(`<desc>${esc("Piping and instrumentation diagram of a vessel level control loop with an independent high-level shutdown, drawn with ISA-5.1 instrument symbols on ISO 10628 equipment. Process flow runs left to right: the atmospheric feed tank TK-100 discharges through the solenoid-operated fail-closed shutoff valve XV-202 and over the top into the vertical surge vessel V-101, which is protected by the spring relief valve PSV-105 venting to atmosphere. V-101 drains through the manual gate valve HV-103 to the centrifugal transfer pump P-101, then through the swing check valve CV-104 and the diaphragm-operated fail-open control valve LV-101 into the product tank TK-102. Two level paths leave the vessel and never touch each other: the level transmitter LT-101 senses V-101 through a capillary line and reports on an electric signal to LIC-101, a shared-display controller drawn above the control-room divide, which modulates LV-101 on a pneumatic signal; separately the high-high level switch LSHH-202 senses the vessel and trips XV-202 through the hardwired interlock I-202 on electric signals, with no path through the DCS. A local pressure gauge PI-106 taps the pump discharge. Line weight and line decoration carry the whole hierarchy: heavy solid for process piping, light solid for the minor relief line, dashed for electric signals, hashed for pneumatic signals and dotted for capillary sensing lines, with a legend along the bottom edge.")}</desc>`);
out.push(`<rect width="${W}" height="${H}" fill="${PAPER}"/>`);
out.push(...g);
for (const t of texts)
  out.push(`<text x="${n2(t.x)}" y="${n2(t.y)}" font-size="${t.fs}" fill="${t.fill}" text-anchor="${t.anchor}"${t.bold ? ' font-weight="600"' : ""}${t.ls ? ` letter-spacing="${t.ls}"` : ""}>${esc(t.s)}</text>`);
out.push(`</svg>`);
await mkdir(new URL("../../visual-eval/exemplars/pid/", import.meta.url), { recursive: true });
await writeFile(new URL("../../visual-eval/exemplars/pid/ideal.svg", import.meta.url), out.join("\n") + "\n");
await browser.close();
console.log(`pid exemplar: ${W}x${H}, ${texts.length} labels, 0 collisions`);
