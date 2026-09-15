/** Draw visual-eval/exemplars/sld/ansi/ideal.svg — the look the ANSI single-line
 *  engine is aiming at.
 *
 *   node scripts/visual-eval/draw-sld-ansi-exemplar.mjs
 *
 * Subject: a commercial building on a 12.47 kV primary service. Utility supply,
 * revenue metering, a 15 kV main breaker tripped by 50/51 and 50/51N relays,
 * a 1500 kVA delta / grounded-wye service transformer, a 2000 A main switchboard
 * with four feeders, and a standby generator reaching the standby panel through
 * an automatic transfer switch.
 *
 * The page, palette, type scale, bus, LV breaker, meter, CT, ATS, panel and
 * motor idioms are the ones `draw-sld-target.mjs` uses for the ten reviewed sld
 * case targets. Three symbols follow IEEE 315 more closely than that kit: the
 * medium-voltage breaker is the general circuit-breaker square with device
 * number 52 inside, the transformer is two coil windings with core lines (the
 * interlinked circles are the IEC 60617 form), and each wye winding carries a
 * connection glyph with its neutral ground drawn.
 *
 * Every label is checked against every other label, every symbol, every drawn
 * conductor or control line, and the canvas edge before the file is written.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

const INK = "#0f172a";        // names, symbol lettering
const LINE = "#1e293b";       // conductors and symbol outlines
const RATING = "#475569";     // rating lines under a name
const FAINT = "#64748b";      // cable annotation, section captions, notes
const HAIR = "#dbe2ea";       // title rule, section rule

const W_LINE = 1.5, W_BUS = 3, W_SYM = 1.5, W_CTRL = 1.2;
const FS_NAME = 12, FS_RATING = 11, FS_CABLE = 10;
const M = 46;
const BUS_OVERHANG = 70;
const PAD = 5;                // clear air every label keeps from everything else

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------- browser ruler

const browser = await chromium.launch();
const ruler = await browser.newPage();
await ruler.setContent("<canvas id=c></canvas>");
const measure = (text, size, weight = 400) =>
  ruler.evaluate(([t, s, wt, f]) => {
    const ctx = document.getElementById("c").getContext("2d");
    ctx.font = `${wt} ${s}px ${f}`;
    return ctx.measureText(t).width;
  }, [text, size, weight, FONT]);

// ---------------------------------------------------------------- sheet

const wires = [], syms = [], texts = [];
const labels = [];   // text boxes
const boxes = [];    // symbol bodies
const segs = [];     // every conductor / control segment, as [x1,y1,x2,y2]

function run(points, { width = W_LINE, dash = "" } = {}) {
  for (let i = 1; i < points.length; i++) segs.push([...points[i - 1], ...points[i]]);
  const d = points.map(([x, y], i) => `${i ? "L" : "M"} ${n2(x)} ${n2(y)}`).join(" ");
  wires.push(`<path d="${d}" fill="none" stroke="${LINE}" stroke-width="${width}" stroke-linecap="${dash ? "butt" : "square"}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
}
const dot = (x, y, r = 3) => wires.push(`<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="${LINE}"/>`);

async function at(x, y, s, { size = FS_RATING, weight = 400, fill = RATING, anchor = "start", block = "", ls = 0 } = {}) {
  const w = (await measure(s, size, weight)) + ls * Math.max(0, s.length - 1);
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  texts.push(`<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT_SVG}" font-size="${size}"` +
    (weight !== 400 ? ` font-weight="${weight}"` : "") +
    ` fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${ls ? ` letter-spacing="${ls}"` : ""}>${esc(s)}</text>`);
  labels.push({ x: left, y: y - size * 0.8, w, h: size * 1.05, s, block });
}

/** Name in semibold with any number of rating lines under it. */
async function caption(d, name, lines = [], side = "right") {
  const block = `cap-${d.id}`;
  const anchor = side === "right" ? "start" : "end";
  const x = d.x + (side === "right" ? d.hw + 14 : -(d.hw + 14));
  const top = d.y - 3 - Math.max(0, lines.length - 1) * 7.5;
  await at(x, top, name, { size: FS_NAME, weight: 600, fill: INK, anchor, block });
  for (let i = 0; i < lines.length; i++)
    await at(x, top + 16 + i * 15, lines[i], { anchor, block });
}
async function captionBelow(d, name, lines = [], gap = 14) {
  const block = `cap-${d.id}`;
  const y = d.y + d.hh + gap + 10;
  await at(d.x, y, name, { size: FS_NAME, weight: 600, fill: INK, anchor: "middle", block });
  for (let i = 0; i < lines.length; i++)
    await at(d.x, y + 15 + i * 15, lines[i], { anchor: "middle", block });
}
const cable = (x, y, s, side = "left") =>
  at(x + (side === "left" ? -10 : 10), y, s, { size: FS_CABLE, fill: FAINT, anchor: side === "left" ? "end" : "start" });

// ---------------------------------------------------------------- symbols

const HALF = {
  utility: [17, 17], generator: [17, 17], watthour_meter: [13, 13], ct: [9, 9],
  breaker52: [15, 15], breaker: [15, 19], transformer: [22, 16], relay: [19, 19],
  motor: [15, 15], panel: [40, 16], ats: [26, 24],
};

/** Wye connection glyph whose neutral runs down to a ground symbol; top of the arms at `top`. */
function wyeGround(S, gx, top) {
  S(`<path d="M ${gx - 6} ${top} L ${gx} ${top + 6} L ${gx + 6} ${top} M ${gx} ${top + 6} L ${gx} ${top + 21}" fill="none" stroke="${LINE}" stroke-width="1.3" stroke-linecap="round"/>`);
  S(`<path d="M ${gx - 8} ${top + 21} L ${gx + 8} ${top + 21} M ${gx - 5} ${top + 25} L ${gx + 5} ${top + 25} M ${gx - 2} ${top + 29} L ${gx + 2} ${top + 29}" fill="none" stroke="${LINE}" stroke-width="1.3" stroke-linecap="round"/>`);
}

function sym(id, kind, x, y, extra = {}) {
  const [hw, hh] = HALF[kind];
  const S = (b) => syms.push(b);
  const stroke = `stroke="${LINE}" stroke-width="${W_SYM}"`;
  const thin = `stroke="${LINE}" stroke-width="1.3" fill="none" stroke-linecap="round"`;
  const letter = (tx, ty, s, size, weight = 700) =>
    S(`<text x="${n2(tx)}" y="${n2(ty)}" font-family="${FONT_SVG}" font-size="${size}" font-weight="${weight}" fill="${INK}" text-anchor="middle">${esc(s)}</text>`);
  switch (kind) {
    case "utility":
      S(`<circle cx="${x}" cy="${y}" r="17" fill="white" ${stroke}/>`);
      S(`<path d="M ${x - 9} ${y} Q ${x - 4.5} ${y - 9} ${x} ${y} T ${x + 9} ${y}" ${thin}/>`);
      break;
    case "generator":
      S(`<circle cx="${x}" cy="${y}" r="17" fill="white" ${stroke}/>`);
      letter(x, y - 1, "G", 13);
      S(`<path d="M ${x - 7} ${y + 8} Q ${x - 3.5} ${y + 2} ${x} ${y + 8} T ${x + 7} ${y + 8}" ${thin}/>`);
      // grounded-wye stator, neutral grounded at the generator (separately derived through a 4-pole ATS)
      wyeGround(S, x - 32, y - 8);
      boxes.push({ x: x - 40, y: y - 8, w: 16, h: 29, s: `glyphs ${id}` });
      break;
    case "watthour_meter":
      S(`<circle cx="${x}" cy="${y}" r="13" fill="white" ${stroke}/>`);
      letter(x, y + 4, "Wh", 10, 600);
      break;
    case "ct":
      S(`<circle cx="${x}" cy="${y}" r="9" fill="white" ${stroke}/>`);
      letter(x, y + 3, "CT", 8);
      break;
    case "breaker52":   // IEEE 315 general circuit breaker, device 52 inside
      S(`<rect x="${x - 15}" y="${y - 15}" width="30" height="30" fill="white" ${stroke}/>`);
      letter(x, y + 4, "52", 11);
      break;
    case "breaker":     // air circuit breaker: contact arm with arc hook
      S(`<path d="M ${x} ${y + 19} L ${x + 11} ${y - 11}" fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round"/>`);
      S(`<path d="M ${x + 11} ${y - 11} A 7 7 0 0 0 ${x + 5} ${y - 22}" fill="none" stroke="${LINE}" stroke-width="1.6" stroke-linecap="round"/>`);
      S(`<circle cx="${x}" cy="${y + 19}" r="2.8" fill="${LINE}"/>`);
      S(`<circle cx="${x}" cy="${y - 19}" r="2.8" fill="${LINE}"/>`);
      break;
    case "transformer": {   // two coil windings, humps away from the core
      const hump = (yy, sweep) => `M ${x - 18} ${yy} A 6 6 0 0 ${sweep} ${x - 6} ${yy} A 6 6 0 0 ${sweep} ${x + 6} ${yy} A 6 6 0 0 ${sweep} ${x + 18} ${yy}`;
      S(`<path d="${hump(y - 10, 1)}" fill="none" ${stroke} stroke-linecap="round"/>`);
      S(`<path d="${hump(y + 10, 0)}" fill="none" ${stroke} stroke-linecap="round"/>`);
      S(`<path d="M ${x - 22} ${y - 3} L ${x + 22} ${y - 3} M ${x - 22} ${y + 3} L ${x + 22} ${y + 3}" fill="none" stroke="${LINE}" stroke-width="1.2"/>`);
      // connection glyphs to the left: delta primary, grounded wye secondary
      const gx = x - 42;
      S(`<path d="M ${gx} ${y - 17} L ${gx + 6.5} ${y - 6} L ${gx - 6.5} ${y - 6} Z" fill="none" stroke="${LINE}" stroke-width="1.3" stroke-linejoin="round"/>`);
      wyeGround(S, gx, y + 5);
      boxes.push({ x: gx - 8, y: y - 17, w: 16, h: 51, s: `glyphs ${id}` });
      break;
    }
    case "relay":
      S(`<circle cx="${x}" cy="${y}" r="19" fill="white" stroke="${LINE}" stroke-width="1.3"/>`);
      letter(x, y + 3.5, extra.code, 9.5, 700);
      break;
    case "motor":
      S(`<circle cx="${x}" cy="${y}" r="15" fill="white" ${stroke}/>`);
      letter(x, y + 5, "M", 13);
      break;
    case "panel":
      S(`<rect x="${x - 40}" y="${y - 16}" width="80" height="32" fill="white" ${stroke}/>`);
      S(`<path d="M ${x - 40} ${y - 6} L ${x + 40} ${y - 6}" fill="none" stroke="${LINE}" stroke-width="1"/>`);
      break;
    case "ats": {       // arm drawn closed on the normal source
      const py = y + 20;
      S(`<path d="M ${x - 22} ${y - 24} L ${x - 22} ${y - 8} M ${x + 22} ${y - 24} L ${x + 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="${W_LINE}"/>`);
      S(`<circle cx="${x - 22}" cy="${y - 8}" r="2.6" fill="${LINE}"/><circle cx="${x + 22}" cy="${y - 8}" r="2.6" fill="${LINE}"/>`);
      S(`<path d="M ${x} ${py} L ${x - 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round"/>`);
      S(`<path d="M ${x} ${py} L ${x + 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="1.3" stroke-dasharray="3 3"/>`);
      S(`<path d="M ${x} ${py} L ${x} ${y + 24}" fill="none" stroke="${LINE}" stroke-width="${W_LINE}"/>`);
      S(`<circle cx="${x}" cy="${py}" r="3" fill="${LINE}"/>`);
      S(`<text x="${x - 28}" y="${y - 12}" font-family="${FONT_SVG}" font-size="9" fill="${FAINT}" text-anchor="end">N</text>`);
      S(`<text x="${x + 28}" y="${y - 12}" font-family="${FONT_SVG}" font-size="9" fill="${FAINT}">E</text>`);
      break;
    }
  }
  boxes.push({ x: x - hw, y: y - hh, w: hw * 2, h: hh * 2, s: `${kind} ${id}` });
  return { id, kind, x, y, hw, hh, top: y - hh, bottom: y + hh, left: x - hw, right: x + hw };
}

const drop = (a, b) => run([[a.x, a.bottom], [a.x, b.top]]);

// ---------------------------------------------------------------- the drawing

const TITLE = "Distribution Center · 12.47 kV Primary Service";
const DECK = "ANSI · SINGLE-LINE DIAGRAM · 12.47 kV / 480Y/277 V";
const X = 400;                         // service trunk

// Medium-voltage service
const util = sym("UTIL", "utility", X, 140);
await caption(util, "Utility Service", ["12.47 kV · 3Ø 4W", "250 MVA SC · 11.6 kA sym · X/R 12"]);
const mtr = sym("MTR", "watthour_meter", X, 240);
await caption(mtr, "Utility Revenue Meter M-1", ["Primary metering · CT 100:5 · PT 7200:120 V"]);
drop(util, mtr);
const cb52 = sym("CB52", "breaker52", X, 350);
await caption(cb52, "Main Breaker 52-M", ["15 kV vacuum · 600 A · 25 kA"]);
drop(mtr, cb52);
await cable(X, 298, "3-1/C #2 MV-105 · 15 kV");
const ct1 = sym("CT1", "ct", X, 440);
await caption(ct1, "CT-1", ["200:5 A · C200"]);
drop(cb52, ct1);

// Protective relays: CT-1 secondary in, trip out to 52-M
const r51 = sym("R51", "relay", 280, 440, { code: "50/51" });
const r51n = sym("R51N", "relay", 150, 440, { code: "50/51N" });
run([[ct1.left, 440], [r51.right, 440]], { width: W_CTRL });
run([[r51.left, 440], [r51n.right, 440]], { width: W_CTRL });
run([[r51n.x, r51n.top], [r51n.x, 350], [cb52.left, 350]], { width: W_CTRL, dash: "5 4" });
run([[r51.x, r51.top], [r51.x, 350]], { width: W_CTRL, dash: "5 4" });
dot(r51.x, 350, 2.4);
await at(332, 340, "TRIP", { size: FS_CABLE, fill: FAINT, anchor: "middle", ls: 1.1 });
await captionBelow(r51, "Phase Overcurrent", [], 12);
await captionBelow(r51n, "Ground Overcurrent", [], 12);

const t1 = sym("T1", "transformer", X, 560);
run([[X, ct1.bottom], [X, t1.top]]);
await caption(t1, "Service Transformer T-1", ["1500 kVA · 12.47 kV – 480Y/277 V", "Δ–Yg · 5.75 %Z"]);
await at(X - 58, 596, "GEC 3/0 Cu", { size: FS_CABLE, fill: FAINT, anchor: "end" });

// Section divide: medium voltage above, low voltage below
const SECTION = 636;
const pageTexts = [];
pageTexts.push({ y: SECTION - 9, s: "MEDIUM VOLTAGE · 12.47 kV", ls: 1.2 }, { y: SECTION + 19, s: "LOW VOLTAGE · 480Y/277 V", ls: 1.2 });

// Low-voltage service
const mb = sym("MB", "breaker", X, 730);
run([[X, t1.bottom], [X, mb.top]]);
await cable(X, 680, "6 sets 4-600 kcmil Cu");
await caption(mb, "MSB Main Breaker", ["2000 AF / 2000 AT · LSIG · 65 kA"]);

const BUS = 810;
run([[X, mb.bottom], [X, BUS]]);
const F = { HA: 280, CH: 520, T2: 760, ATS: 1000 };
const busL = F.HA - BUS_OVERHANG, busR = F.ATS + BUS_OVERHANG;
run([[busL, BUS], [busR, BUS]], { width: W_BUS });
await at(busL - 14, BUS + 4, "Main Switchboard MSB", { size: FS_NAME, weight: 600, fill: INK, anchor: "end" });
await at(busR + 14, BUS + 4, "480Y/277 V · 2000 A · 65 kA", { size: FS_RATING, fill: RATING });
dot(X, BUS);

const FY = 900;
const feeder = async (id, x, name, rating, cab) => {
  const cb = sym(id, "breaker", x, FY);
  run([[x, BUS], [x, cb.top]]);
  dot(x, BUS);
  await caption(cb, name, [rating]);
  if (cab) await cable(x, 965, cab, "right");
  return cb;
};

const f1 = await feeder("F1", F.HA, "Panel HA Feeder", "400 AF / 400 AT · 65 kA", "4-600 kcmil Cu · 1-#3 G");
const ha = sym("HA", "panel", F.HA, 1040);
drop(f1, ha);
await captionBelow(ha, "Panel HA", ["400 A · 480Y/277 V"]);

const f2 = await feeder("F2", F.CH, "Chiller Feeder", "400 AF / 350 AT · 65 kA", "3-500 kcmil Cu · 1-#3 G");
const ch = sym("CH1", "motor", F.CH, 1040);
drop(f2, ch);
await captionBelow(ch, "Chiller CH-1", ["300 kW · 480 V · 3Ø"]);

const f3 = await feeder("F3", F.T2, "T-2 Feeder", "225 AF / 175 AT · 65 kA", "3-2/0 Cu · 1-#6 G");
const t2 = sym("T2", "transformer", F.T2, 1035);
drop(f3, t2);
await caption(t2, "Transformer T-2", ["112.5 kVA · 480 – 208Y/120 V", "Δ–Yg · 4.5 %Z"]);
await at(F.T2 - 58, 1071, "GEC 1/0 Cu", { size: FS_CABLE, fill: FAINT, anchor: "end" });
const la = sym("LA", "panel", F.T2, 1150);
drop(t2, la);
await captionBelow(la, "Panel LA", ["400 A MCB · 208Y/120 V"]);

const f4 = await feeder("F4", F.ATS, "ATS Normal Feeder", "800 AF / 800 AT · 65 kA", "3 sets 4-300 kcmil Cu");
const ats = sym("ATS", "ats", F.ATS + 22, 1040);
run([[F.ATS, f4.bottom], [F.ATS, ats.top]]);
await caption(ats, "ATS-1", ["800 A · 4-pole · open transition"]);
const sdp = sym("SDP", "panel", ats.x, 1150);
run([[ats.x, ats.bottom], [ats.x, sdp.top]]);
await captionBelow(sdp, "Standby Panel SDP", ["800 A · 480Y/277 V"]);

// Standby generator to the emergency side of the ATS
const GX = 1290;
const gen = sym("GEN", "generator", GX, 700);
await caption(gen, "Standby Generator G-1", ["500 kW / 625 kVA · 0.8 PF", "480Y/277 V"]);
await at(GX - 48, 721, "GEC 2/0 Cu", { size: FS_CABLE, fill: FAINT, anchor: "end" });
const cbg = sym("CBG", "breaker", GX, 840);
drop(gen, cbg);
await caption(cbg, "Generator Breaker", ["800 AF / 800 AT · LSI · 35 kA"]);
run([[GX, cbg.bottom], [GX, 990], [ats.x + 22, 990], [ats.x + 22, ats.top]]);
await cable(GX, 935, "3 sets 4-300 kcmil Cu", "right");

// Notes
pageTexts.push(
  { y: 1252, s: "Dashed lines are relay trip circuits and the thin solid line is the CT-1 secondary; neither carries load current." },
  { y: 1270, s: "LSIG trip unit includes ground-fault protection, required by NEC 230.95 on a 2000 A, 480Y/277 V disconnect. ATS-1 is shown in its normal position." },
);

// ---------------------------------------------------------------- fit, check, render

for (const t of pageTexts) {
  t.ls = t.ls ?? 0;
  t.w = (await measure(t.s, FS_CABLE)) + t.ls * (t.s.length - 1);
  labels.push({ x: M, y: t.y - FS_CABLE * 0.8, w: t.w, h: FS_CABLE * 1.05, s: t.s, block: "" });
}
const titleW = await measure(TITLE, 18, 700);
const maxX = Math.max(...labels.map((l) => l.x + l.w), ...boxes.map((b) => b.x + b.w), ...segs.flatMap((s) => [s[0], s[2]]));
const maxY = Math.max(...labels.map((l) => l.y + l.h), ...boxes.map((b) => b.y + b.h));
const minX = Math.min(...labels.map((l) => l.x), ...boxes.map((b) => b.x));
if (minX < M) throw new Error(`drawing reaches ${minX}, left of the margin`);
const W = Math.ceil(Math.max(maxX + M, titleW + 2 * M));
const H = Math.ceil(maxY + M);

const problems = [];
const hit = (a, b) => a.x < b.x + b.w + PAD && b.x < a.x + a.w + PAD && a.y < b.y + b.h + PAD && b.y < a.y + a.h + PAD;
for (let i = 0; i < labels.length; i++) {
  const a = labels[i];
  if (a.x < 6 || a.y < 86 || a.x + a.w > W - 6 || a.y + a.h > H - 6) problems.push(`canvas: "${a.s}"`);
  for (let j = i + 1; j < labels.length; j++)
    if (!(a.block && a.block === labels[j].block) && hit(a, labels[j])) problems.push(`label/label: "${a.s}" x "${labels[j].s}"`);
  for (const b of boxes) if (hit(a, b)) problems.push(`label/symbol: "${a.s}" on ${b.s}`);
  for (const [x1, y1, x2, y2] of segs) {
    const s = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    if (hit(a, s)) problems.push(`label/line: "${a.s}" on (${x1},${y1})-(${x2},${y2})`);
  }
}
// no conductor or control line may pass through a symbol body it does not end on
for (const [x1, y1, x2, y2] of segs)
  for (const b of boxes) {
    const inner = { x0: b.x + 1.5, y0: b.y + 1.5, x1: b.x + b.w - 1.5, y1: b.y + b.h - 1.5 };
    const crosses = x1 === x2
      ? x1 > inner.x0 && x1 < inner.x1 && Math.max(y1, y2) > inner.y0 && Math.min(y1, y2) < inner.y1
      : y1 > inner.y0 && y1 < inner.y1 && Math.max(x1, x2) > inner.x0 && Math.min(x1, x2) < inner.x1;
    if (crosses) problems.push(`line/symbol: (${x1},${y1})-(${x2},${y2}) through ${b.s}`);
  }
// the section rule is a page-wide hairline: only the trunk may cross it
for (const l of labels) if (l.y < SECTION + PAD && l.y + l.h > SECTION - PAD) problems.push(`label/section rule: "${l.s}"`);

const unique = [...new Set(problems)];
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">`);
out.push(`<title>${esc(TITLE)}</title>`);
out.push(`<desc>${esc("A 12.47 kV utility service passes through revenue meter M-1, the 15 kV main breaker 52-M and CT-1 into the 1500 kVA delta / grounded-wye service transformer T-1. Relays 50/51 and 50/51N take current from CT-1 and trip 52-M over dashed control lines. On the 480Y/277 V side the 2000 A LSIG main breaker feeds main switchboard MSB, which serves Panel HA, chiller CH-1, transformer T-2 with Panel LA, and the normal side of ATS-1. Standby generator G-1 feeds the emergency side of ATS-1 through its own breaker, and ATS-1 feeds standby panel SDP.")}</desc>`);
out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);
out.push(`<text x="${M}" y="46" font-family="${FONT_SVG}" font-size="18" font-weight="700" fill="${INK}">${esc(TITLE)}</text>`);
out.push(`<text x="${M}" y="65" font-family="${FONT_SVG}" font-size="9.5" font-weight="600" fill="${FAINT}" letter-spacing="1.3">${esc(DECK)}</text>`);
out.push(`<line x1="${M}" y1="78" x2="${W - M}" y2="78" stroke="${HAIR}" stroke-width="1"/>`);
out.push(`<path d="M ${M} ${SECTION} L ${W - M} ${SECTION}" fill="none" stroke="${HAIR}" stroke-width="1" stroke-dasharray="6 5"/>`);
out.push(...wires, ...syms, ...texts);
for (const t of pageTexts)
  out.push(`<text x="${M}" y="${t.y}" font-family="${FONT_SVG}" font-size="${FS_CABLE}" fill="${FAINT}"${t.ls ? ` letter-spacing="${t.ls}"` : ""}>${esc(t.s)}</text>`);
out.push("</svg>");
await browser.close();

if (unique.length) {
  console.error(`sld/ansi exemplar collides, not written:\n  ${unique.join("\n  ")}`);
  process.exit(1);
}
await mkdir("visual-eval/exemplars/sld/ansi", { recursive: true });
await writeFile("visual-eval/exemplars/sld/ansi/ideal.svg", out.join("\n") + "\n");
console.log(`sld/ansi exemplar: ${W}x${H}, ${boxes.length} symbol boxes, ${labels.length} labels, ${segs.length} line segments, 0 collisions`);
