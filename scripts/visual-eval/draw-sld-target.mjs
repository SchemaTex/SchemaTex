/** Draw the single-line diagram cases' `ideal.svg` — the targets the engine is
 *  aiming at.
 *
 * The set has to be *one* drawing repeated, not ten that drift, so one kit
 * draws every symbol and every annotation and each case only says where things
 * go. The symbols follow `docs/reference/11-SINGLE-LINE-STANDARD.md` §1: an
 * ANSI breaker is a diagonal contact arm with the arc-quench hook at the top,
 * an isolator is the same arm without the hook, a transformer is two
 * interlinked windings, a bus is a heavy horizontal bar, a leaf load is a
 * down-triangle. Power flows top to bottom (§2.1), the name sits beside its
 * symbol in semibold with the rating on a lighter second line (§2.5), and
 * cable annotation hangs off the run it describes (§3.3).
 *
 * Text widths are measured in a real browser, and every drawing is checked
 * label-against-label, label-against-symbol and label-against-canvas-edge
 * before it is written — a target that collides is worse than no target,
 * because the judge then scores the engine against it.
 *
 *   node scripts/visual-eval/draw-sld-target.mjs                    # all cases
 *   node scripts/visual-eval/draw-sld-target.mjs three-phase-board
 */
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

const INK = "#0f172a";        // names
const LINE = "#1e293b";       // conductors and symbol outlines
const RATING = "#475569";     // the lighter second line
const FAINT = "#64748b";      // cable annotation, section captions
const HAIR = "#dbe2ea";

const W_LINE = 1.5;           // a conductor
const W_BUS = 3;              // a bus bar
const W_SYM = 1.5;            // a symbol outline
const FS_NAME = 12, FS_RATING = 11, FS_CABLE = 10;

const M = 46;            // the one page margin: title rule, section rules, notes, auto-fit
const BUS_OVERHANG = 70; // a bus runs this far past its outermost tap
const BUS_MIN = 300;     // ...but never reads as a stub

/** Half-extents, so a lead meets a symbol's edge instead of a guessed point. */
const HALF = {
  utility: [17, 17], generator: [17, 17], solar: [19, 16],
  transformer: [14, 22.5], breaker: [15, 19], switch_load: [13, 16],
  fuse: [6, 15], ct: [9, 9], vt: [9, 9], watthour_meter: [13, 13],
  relay: [14, 14], motor: [15, 15], load: [14, 13], box: [35, 17],
  panel: [40, 16], consumer_unit: [40, 16], ups: [38, 18], ats: [26, 24],
  battery: [18, 24], hub: [38, 15],
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------- browser

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

// ---------------------------------------------------------------- kit

class Sheet {
  constructor(id, title, deck, w, h) {
    Object.assign(this, { id, title, deck, w, h });
    this.wires = [];
    this.syms = [];
    this.texts = [];
    this.labels = [];
    this.boxes = [];
    this.sections = [];
    this.pageTexts = [];   // section captions and notes: aligned to the page, not the drawing
    this.minX = Infinity; this.maxX = -Infinity; this.maxY = -Infinity;
  }

  grow(x, y, w = 0, h = 0) {
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x + w);
    this.maxY = Math.max(this.maxY, y + h);
  }

  /** Size the sheet to its own content, so every drawing carries the same
   *  margin, and slide the drawing right if anything (a bus tag, say) reached
   *  past the left margin. */
  fit() {
    const dx = Math.max(0, M - this.minX);
    this.dx = dx;
    for (const l of this.labels) l.x += dx;
    for (const b of this.boxes) b.x += dx;
    this.h = Math.ceil(Math.max(this.maxY, ...this.pageTexts.map((t) => t.y)) + M);
    this.w = Math.ceil(Math.max(this.maxX + dx + M, this.titleW + 2 * M,
                                ...this.pageTexts.map((t) => t.x + t.w + M)));
    for (const t of this.pageTexts)
      this.labels.push({ x: t.x, y: t.y - t.size * 0.8, w: t.w, h: t.size * 1.12, s: t.s });
    return this;
  }

  // -- conductors -------------------------------------------------

  /** A run of orthogonal segments through the given points. */
  run(points, { width = W_LINE, dash = "" } = {}) {
    for (const [x, y] of points) this.grow(x - width / 2, y - width / 2, width, width);
    const d = points.map(([x, y], i) => `${i ? "L" : "M"} ${n2(x)} ${n2(y)}`).join(" ");
    this.wires.push(`<path d="${d}" fill="none" stroke="${LINE}" stroke-width="${width}" stroke-linecap="square" stroke-linejoin="miter"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
  }

  /** Vertical lead between two placed symbols, or between a symbol and a bus. */
  drop(a, b) {
    const x = a.x ?? a[0];
    this.run([[x, a.bottom ?? a[1]], [x, b.top ?? b[1]]]);
  }

  dot(x, y) { this.wires.push(`<circle cx="${n2(x)}" cy="${n2(y)}" r="3" fill="${LINE}"/>`); }

  /** A bus is sized from the taps that land on it, not from the page: it runs
   *  `BUS_OVERHANG` past the outermost tap and never reads as a stub. Its tag
   *  and voltage sit *outside* the two ends, on the bar's own centre line, so
   *  neither can ever meet a tap however many ways the bus carries. */
  async busbar(y, taps, name, voltage) {
    const lo = Math.min(...taps), hi = Math.max(...taps);
    let x1 = lo - BUS_OVERHANG, x2 = hi + BUS_OVERHANG;
    const short = BUS_MIN - (x2 - x1);
    if (short > 0) { x1 -= short / 2; x2 += short / 2; }
    this.run([[x1, y], [x2, y]], { width: W_BUS });
    if (name) await this.at(x1 - 14, y + 4, name, { size: FS_NAME, weight: 600, fill: INK, anchor: "end" });
    if (voltage) await this.at(x2 + 14, y + 4, voltage, { size: FS_RATING, fill: RATING });
    return { y, x1, x2, top: y, bottom: y };
  }

  // -- text -------------------------------------------------------

  async at(x, y, s, { size = FS_RATING, weight = 400, fill = RATING, anchor = "start", block = "", extra = "" } = {}) {
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

  /** Name in semibold with its rating underneath, beside the symbol. */
  async caption(d, name, rating, side = "right") {
    const block = `cap-${d.id}`;
    const anchor = side === "right" ? "start" : "end";
    const x = d.x + (side === "right" ? d.hw + 14 : -(d.hw + 14));
    await this.at(x, d.y - 3, name, { size: FS_NAME, weight: 600, fill: INK, anchor, block });
    if (rating) await this.at(x, d.y + 13, rating, { size: FS_RATING, fill: RATING, anchor, block });
  }

  /** Name above the symbol, for a row of equal siblings. */
  async captionAbove(d, name, rating, gap = 14) {
    const block = `cap-${d.id}`;
    const y = d.y - d.hh - gap;
    if (rating) await this.at(d.x, y, rating, { size: FS_RATING, fill: RATING, anchor: "middle", block });
    await this.at(d.x, rating ? y - 16 : y, name, { size: FS_NAME, weight: 600, fill: INK, anchor: "middle", block });
  }

  async captionBelow(d, name, rating, gap = 16) {
    const block = `cap-${d.id}`;
    const y = d.y + d.hh + gap + 10;   // gap is clear air; the baseline sits below the ascent
    await this.at(d.x, y, name, { size: FS_NAME, weight: 600, fill: INK, anchor: "middle", block });
    if (rating) await this.at(d.x, y + 15, rating, { size: FS_RATING, fill: RATING, anchor: "middle", block });
  }

  /** Conductor annotation, hung off the run it describes. */
  async cable(x, y, s, side = "left") {
    await this.at(x + (side === "left" ? -10 : 10), y, s, {
      size: FS_CABLE, fill: FAINT, anchor: side === "left" ? "end" : "start",
    });
  }

  /** A voltage-section divider: hairline plus the two section captions. */
  /** Page-aligned text: section captions and notes line up with the title rule,
   *  not with the drawing, so they stay put when the drawing is slid across. */
  async page(x, y, str, opts = {}) {
    const size = opts.size ?? FS_CABLE;
    this.pageTexts.push({ x, y, s: str, size, w: await measure(str, size), extra: opts.extra ?? "" });
  }

  async section(y, above, below) {
    this.sections.push(y);   // drawn at render, once the sheet has been fitted
    await this.page(M, y - 9, above, { extra: ' letter-spacing="1.2"' });
    await this.page(M, y + 19, below, { extra: ' letter-spacing="1.2"' });
  }

  async note(y, s, x = M) { await this.page(x, y, s); }

  // -- symbols ----------------------------------------------------

  sym(id, kind, x, y) {
    const [hw, hh] = HALF[kind] ?? HALF.box;
    const g = [];
    const S = (body) => g.push(body);
    const stroke = `stroke="${LINE}" stroke-width="${W_SYM}"`;
    const thin = `stroke="${LINE}" stroke-width="1.3" fill="none" stroke-linecap="round"`;

    switch (kind) {
      case "utility":   // AC source: circle with a sine wave
        S(`<circle cx="${x}" cy="${y}" r="17" fill="white" ${stroke}/>`);
        S(`<path d="M ${x - 9} ${y} Q ${x - 4.5} ${y - 9} ${x} ${y} T ${x + 9} ${y}" ${thin}/>`);
        break;
      case "generator":
        S(`<circle cx="${x}" cy="${y}" r="17" fill="white" ${stroke}/>`);
        S(`<text x="${x}" y="${y - 1}" font-family="${FONT_SVG}" font-size="13" font-weight="700" fill="${INK}" text-anchor="middle">G</text>`);
        S(`<path d="M ${x - 7} ${y + 8} Q ${x - 3.5} ${y + 2} ${x} ${y + 8} T ${x + 7} ${y + 8}" ${thin}/>`);
        break;
      case "solar":     // PV module: a cell array with incident light
        S(`<rect x="${x - 19}" y="${y - 12}" width="38" height="24" fill="white" ${stroke}/>`);
        S(`<path d="M ${x - 19} ${y + 12} L ${x + 19} ${y - 12} M ${x - 6} ${y - 12} L ${x - 6} ${y + 12} M ${x + 6} ${y - 12} L ${x + 6} ${y + 12}" ${thin}/>`);
        break;
      case "battery":   // alternating long and short plates
        for (let i = 0; i < 3; i++) {
          const yy = y - 18 + i * 14;
          S(`<path d="M ${x - 17} ${yy} L ${x + 17} ${yy}" fill="none" stroke="${LINE}" stroke-width="2"/>`);
          S(`<path d="M ${x - 8.5} ${yy + 7} L ${x + 8.5} ${yy + 7}" fill="none" stroke="${LINE}" stroke-width="2"/>`);
        }
        break;
      case "transformer":   // two interlinked windings
        S(`<circle cx="${x}" cy="${y - 8.5}" r="14" fill="none" ${stroke}/>`);
        S(`<circle cx="${x}" cy="${y + 8.5}" r="14" fill="none" ${stroke}/>`);
        break;
      case "breaker":       // ANSI device 52: contact arm hinged on the lower
                            // terminal, with the arc-quench hook at its tip
        S(`<path d="M ${x} ${y + 19} L ${x + 11} ${y - 11}" fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round"/>`);
        S(`<path d="M ${x + 11} ${y - 11} A 7 7 0 0 0 ${x + 5} ${y - 22}" fill="none" stroke="${LINE}" stroke-width="1.6" stroke-linecap="round"/>`);
        S(`<circle cx="${x}" cy="${y + 19}" r="2.8" fill="${LINE}"/>`);
        S(`<circle cx="${x}" cy="${y - 19}" r="2.8" fill="${LINE}"/>`);
        break;
      case "switch_load":   // isolator / contactor: the same arm, no hook
        S(`<path d="M ${x} ${y + 16} L ${x + 10} ${y - 12}" fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round"/>`);
        S(`<circle cx="${x}" cy="${y + 16}" r="2.8" fill="${LINE}"/>`);
        S(`<circle cx="${x}" cy="${y - 16}" r="2.8" fill="${LINE}"/>`);
        break;
      case "fuse":
        S(`<rect x="${x - 6}" y="${y - 15}" width="12" height="30" fill="white" ${stroke}/>`);
        break;
      case "ct": case "vt":
        S(`<circle cx="${x}" cy="${y}" r="9" fill="white" ${stroke}/>`);
        S(`<text x="${x}" y="${y + 3.5}" font-family="${FONT_SVG}" font-size="8" font-weight="700" fill="${INK}" text-anchor="middle">${kind.toUpperCase()}</text>`);
        break;
      case "watthour_meter":
        S(`<circle cx="${x}" cy="${y}" r="13" fill="white" ${stroke}/>`);
        S(`<text x="${x}" y="${y + 4}" font-family="${FONT_SVG}" font-size="10" font-weight="600" fill="${INK}" text-anchor="middle">Wh</text>`);
        break;
      case "relay":
        S(`<circle cx="${x}" cy="${y}" r="14" fill="white" ${stroke}/>`);
        S(`<text x="${x}" y="${y + 4}" font-family="${FONT_SVG}" font-size="10" font-weight="600" fill="${INK}" text-anchor="middle">${this.relayCode ?? "51"}</text>`);
        break;
      case "motor":
        S(`<circle cx="${x}" cy="${y}" r="15" fill="white" ${stroke}/>`);
        S(`<text x="${x}" y="${y + 5}" font-family="${FONT_SVG}" font-size="13" font-weight="700" fill="${INK}" text-anchor="middle">M</text>`);
        break;
      case "load":      // terminal load: the standard down-triangle
        S(`<path d="M ${x - 14} ${y - 13} L ${x + 14} ${y - 13} L ${x} ${y + 13} Z" fill="white" ${stroke} stroke-linejoin="miter"/>`);
        break;
      case "box":
        S(`<rect x="${x - 35}" y="${y - 17}" width="70" height="34" fill="white" ${stroke}/>`);
        break;
      case "panel": case "consumer_unit":
        S(`<rect x="${x - 40}" y="${y - 16}" width="80" height="32" fill="white" ${stroke}/>`);
        S(`<path d="M ${x - 40} ${y - 6} L ${x + 40} ${y - 6}" fill="none" stroke="${LINE}" stroke-width="1"/>`);
        break;
      case "ups":
        S(`<rect x="${x - 38}" y="${y - 18}" width="76" height="36" fill="white" ${stroke}/>`);
        S(`<text x="${x}" y="${y + 5}" font-family="${FONT_SVG}" font-size="12" font-weight="700" fill="${INK}" text-anchor="middle">UPS</text>`);
        break;
      case "hub":
        S(`<rect x="${x - 38}" y="${y - 15}" width="76" height="30" fill="white" ${stroke}/>`);
        break;
      case "ats": {     // transfer switch: arm shown closed on the normal source
        const py = y + 20;
        S(`<path d="M ${x - 22} ${y - 24} L ${x - 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="${W_LINE}"/>`);
        S(`<path d="M ${x + 22} ${y - 24} L ${x + 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="${W_LINE}"/>`);
        S(`<circle cx="${x - 22}" cy="${y - 8}" r="2.6" fill="${LINE}"/>`);
        S(`<circle cx="${x + 22}" cy="${y - 8}" r="2.6" fill="${LINE}"/>`);
        S(`<path d="M ${x} ${py} L ${x - 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round"/>`);
        S(`<path d="M ${x} ${py} L ${x + 22} ${y - 8}" fill="none" stroke="${LINE}" stroke-width="1.3" stroke-dasharray="3 3"/>`);
        S(`<circle cx="${x}" cy="${py}" r="3" fill="${LINE}"/>`);
        S(`<text x="${x - 28}" y="${y - 12}" font-family="${FONT_SVG}" font-size="9" fill="${FAINT}" text-anchor="end">N</text>`);
        S(`<text x="${x + 28}" y="${y - 12}" font-family="${FONT_SVG}" font-size="9" fill="${FAINT}">E</text>`);
        break;
      }
      default:
        S(`<rect x="${x - hw}" y="${y - hh}" width="${hw * 2}" height="${hh * 2}" fill="white" ${stroke}/>`);
    }
    this.syms.push(g.join(""));
    this.boxes.push({ x: x - hw, y: y - hh, w: hw * 2, h: hh * 2, s: `${kind} ${id}` });
    this.grow(x - hw, y - hh, hw * 2, hh * 2);
    const d = { id, kind, x, y, hw, hh, top: y - hh, bottom: y + hh, left: x - hw, right: x + hw };
    return d;
  }

  /** Place a symbol and its caption in one go. */
  async node(id, kind, x, y, name, rating, side = "right") {
    const d = this.sym(id, kind, x, y);
    if (side === "above") await this.captionAbove(d, name, rating);
    else if (side === "below") await this.captionBelow(d, name, rating);
    else await this.caption(d, name, rating, side);
    return d;
  }

  render() {
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img">`);
    o.push(`<title>${esc(this.title)}</title>`);
    o.push(`<desc>${esc(this.desc || "")}</desc>`);
    o.push(`<rect x="0" y="0" width="${this.w}" height="${this.h}" fill="#ffffff"/>`);
    o.push(`<text x="${M}" y="46" font-family="${FONT_SVG}" font-size="18" font-weight="700" fill="${INK}">${esc(this.title)}</text>`);
    o.push(`<text x="${M}" y="65" font-family="${FONT_SVG}" font-size="9.5" font-weight="600" fill="${FAINT}" letter-spacing="1.3">${esc(this.deck)}</text>`);
    o.push(`<line x1="${M}" y1="78" x2="${this.w - M}" y2="78" stroke="${HAIR}" stroke-width="1"/>`);
    for (const y of this.sections)
      o.push(`<path d="M ${M} ${n2(y)} L ${n2(this.w - M)} ${n2(y)}" fill="none" stroke="${HAIR}" stroke-width="1" stroke-dasharray="6 5"/>`);
    const g = [...this.wires, ...this.syms, ...this.texts];
    o.push(this.dx ? `<g transform="translate(${n2(this.dx)} 0)">` : "");
    o.push(...g);
    o.push(this.dx ? "</g>" : "");
    for (const t of this.pageTexts)
      o.push(`<text x="${n2(t.x)}" y="${n2(t.y)}" font-family="${FONT_SVG}" font-size="${t.size}" fill="${FAINT}"${t.extra}>${esc(t.s)}</text>`);
    o.push("</svg>");
    return o.join("\n") + "\n";
  }
}

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
        for (const b of boxes) if (hit(a, b)) out.push(`label/symbol: "${a.s}" on ${b.s}`);
      }
      return [...new Set(out)];
    },
    [sheet.labels, sheet.boxes, sheet.w, sheet.h]
  );

/** A browser tolerates a repeated attribute; the snapshot renderer rejects the
 *  whole file. Catch it here rather than in the eval run. */
const duplicateAttributes = (svgText) => {
  const out = [];
  for (const el of svgText.match(/<[a-zA-Z]+\s[^>]*>/g) ?? []) {
    const names = [...el.matchAll(/([a-zA-Z-]+)="/g)].map((m) => m[1]);
    const dup = [...new Set(names.filter((n) => names.filter((m) => m === n).length > 1))];
    if (dup.length) out.push(`duplicate ${dup.join(", ")} on ${el.slice(0, 60)}…`);
  }
  return [...new Set(out)];
};

const DECK = "ANSI · SINGLE-LINE DIAGRAM";
const CASES = {};

/* ------------------------------------------------ three-phase board */
CASES["three-phase-board"] = async () => {
  const s = new Sheet("sld-three-phase-board", "Three-Phase Distribution Board", `${DECK} · 400 V`, 1280, 780);
  s.desc = "A 400 V utility supply runs down through the 250 A main breaker and the multifunction meter onto the " +
    "DB-1 three-phase busbar. Six outgoing ways tap the bus, each through its own C-curve breaker and each " +
    "labelled with its cable: lighting, socket outlets, an AHU fan motor, a kitchen distribution board, a " +
    "workshop panel and a spare feeder.";

  const util = await s.node("UTIL", "utility", 180, 150, "400 V Utility Supply", "400 V · 50 kA fault level");
  const main = await s.node("MAIN", "breaker", 180, 250, "Main Breaker 52-Q0", "250 A · 36 kA");
  const mtr = await s.node("MTR", "watthour_meter", 180, 348, "Multifunction Meter PM-1", "400 V · 250 A");
  s.drop(util, main); s.drop(main, mtr);

  const BUS = 440;
  s.run([[180, mtr.bottom], [180, BUS]]);
  await s.busbar(BUS, [180, 260, 1160], "DB-1 Three-Phase Busbar", "400 V · 3-phase");
  s.dot(180, BUS);

  const ways = [
    { id: "Q1", x: 260, name: "Q1 Lighting L1", rate: "32 A · C-curve · 10 kA", cable: "4C 6 mm² Cu", load: ["L1", "load", "Lighting L1", "32 A · 230 V"] },
    { id: "Q2", x: 440, name: "Q2 Socket Outlets S1", rate: "63 A · C-curve · 10 kA", cable: "4C 16 mm² Cu", load: ["S1", "load", "Socket Outlets S1", "63 A · 230 V"] },
    { id: "Q3", x: 620, name: "Q3 AHU-1", rate: "80 A · C-curve · 10 kA", cable: "4C 25 mm² Cu", load: ["AHU1", "motor", "AHU-1 Fan Motor", "22 kW · 400 V · 3ph"] },
    { id: "Q4", x: 800, name: "Q4 Kitchen DB", rate: "100 A · C-curve · 10 kA", cable: "4C 35 mm² Cu", load: ["KDB", "consumer_unit", "Kitchen DB", "100 A · 400/230 V"] },
    { id: "Q5", x: 980, name: "Q5 Workshop Panel", rate: "125 A · C-curve · 10 kA", cable: "4C 50 mm² Cu", load: ["WP", "consumer_unit", "Workshop Panel", "125 A · 400/230 V"] },
    { id: "Q6", x: 1160, name: "Q6 Spare Feeder", rate: "160 A · C-curve · 10 kA", cable: "4C 70 mm² Cu", load: ["SPARE", "load", "Future Feeder", "160 A"] },
  ];
  for (const w of ways) {
    const cb = s.sym(w.id, "breaker", w.x, 560);
    s.run([[w.x, BUS], [w.x, cb.top]]);
    s.dot(w.x, BUS);
    await s.captionAbove(cb, w.name, w.rate, 12);
    const ld = s.sym(w.load[0], w.load[1], w.x, 700);
    s.run([[w.x, cb.bottom], [w.x, ld.top]]);
    await s.cable(w.x, 646, w.cable, "right");
    await s.captionBelow(ld, w.load[2], w.load[3], 14);
  }
  return s;
};

/* ------------------------------------------------ motor control centre */
CASES["motor-control-centre"] = async () => {
  const s = new Sheet("sld-motor-control-centre", "Motor Control Centre Section", `${DECK} · 480 V THREE PHASE`, 1080, 900);
  s.desc = "The 480 V plant supply enters through the MCC-1 800 A main breaker onto the MCC-1 480 V bus. Three " +
    "identical motor-starter columns tap the bus, each built the same way top to bottom: feeder breaker, " +
    "contactor, overload relay, motor — a process pump, a cooling fan and a conveyor drive, each with its own " +
    "cable size.";

  const util = await s.node("UTIL", "utility", 200, 150, "480 V Plant Supply", "480 V · 50 kA fault level");
  const cbm = await s.node("CBM", "breaker", 200, 250, "MCC-1 Main Breaker", "800 A · 50 kA");
  s.drop(util, cbm);

  const BUS = 350;
  s.run([[200, cbm.bottom], [200, BUS]]);
  await s.busbar(BUS, [200, 340, 900], "MCC-1 480 V Bus", "480 V · 3-phase");
  s.dot(200, BUS);

  const cols = [
    { x: 340, cb: ["CB101", "52-M101 Feeder Breaker", "125 A · 25 kA"], k: ["K101", "K101 Contactor", "90 A · AC-3"], ol: ["OL101", "OL101 Overload Relay", "device 49 · 38–50 A"], m: ["M101", "M-101 Process Pump", "30 kW · 480 V · 3ph"], cable: "3C 35 mm² Cu" },
    { x: 620, cb: ["CB102", "52-M102 Feeder Breaker", "63 A · 25 kA"], k: ["K102", "K102 Contactor", "50 A · AC-3"], ol: ["OL102", "OL102 Overload Relay", "device 49 · 21–28 A"], m: ["M102", "M-102 Cooling Fan", "15 kW · 480 V · 3ph"], cable: "3C 16 mm² Cu" },
    { x: 900, cb: ["CB103", "52-M103 Feeder Breaker", "250 A · 25 kA"], k: ["K103", "K103 Contactor", "180 A · AC-3"], ol: ["OL103", "OL103 Overload Relay", "device 49 · 75–100 A"], m: ["M103", "M-103 Conveyor Drive", "55 kW · 480 V · 3ph"], cable: "3C 70 mm² Cu" },
  ];
  for (const c of cols) {
    const cb = s.sym(c.cb[0], "breaker", c.x, 460);
    s.run([[c.x, BUS], [c.x, cb.top]]);
    s.dot(c.x, BUS);
    await s.captionAbove(cb, c.cb[1], c.cb[2], 12);
    const k = await s.node(c.k[0], "switch_load", c.x, 570, c.k[1], c.k[2]);
    s.drop(cb, k);
    s.relayCode = "49";
    const ol = await s.node(c.ol[0], "relay", c.x, 680, c.ol[1], c.ol[2]);
    s.drop(k, ol);
    const m = s.sym(c.m[0], "motor", c.x, 800);
    s.run([[c.x, ol.bottom], [c.x, m.top]]);
    await s.cable(c.x, 748, c.cable, "left");
    await s.captionBelow(m, c.m[1], c.m[2], 14);
  }
  return s;
};

/* ------------------------------------------------ EV charging hub */
CASES["ev-charging-hub"] = async () => {
  const s = new Sheet("sld-ev-charging-hub", "EV Charging Hub · 12 Bay", `${DECK} · 11 kV / 400 V`, 1080, 830);
  s.desc = "An 11 kV utility supply feeds a 1600 kVA charging-hub transformer and a 2500 A main low-voltage " +
    "breaker onto the 400 V charging distribution board. Four ways leave the board: two 630 A feeders to the " +
    "DC charger banks, a 250 A feeder to the AC chargers, and a direct way to the dynamic load-management " +
    "controller.";

  const grid = await s.node("GRID", "utility", 230, 150, "11 kV Utility Supply", "11 kV · 250 MVA");
  const tx = await s.node("TX", "transformer", 230, 262, "Charging Hub Transformer", "1600 kVA · 11 kV / 400 V");
  s.drop(grid, tx);
  await s.cable(230, 213, "11 kV", "left");
  const main = await s.node("MAIN", "breaker", 230, 380, "Main LV Breaker", "2500 A · 50 kA");
  s.drop(tx, main);

  const BUS = 480;
  s.run([[230, main.bottom], [230, BUS]]);
  await s.busbar(BUS, [230, 320, 960], "Charging Distribution Board", "400 V");
  s.dot(230, BUS);

  const ways = [
    { id: "F1", x: 320, name: "Feeder DC Chargers A", rate: "630 A", load: ["DC1", "load", "DC Chargers 1–4", "300 kW"] },
    { id: "F2", x: 560, name: "Feeder DC Chargers B", rate: "630 A", load: ["DC2", "load", "DC Chargers 5–8", "300 kW"] },
    { id: "F3", x: 800, name: "Feeder AC Chargers", rate: "250 A", load: ["AC", "load", "AC Chargers 9–12", "176 kW"] },
  ];
  for (const w of ways) {
    const cb = s.sym(w.id, "breaker", w.x, 590);
    s.run([[w.x, BUS], [w.x, cb.top]]);
    s.dot(w.x, BUS);
    await s.captionAbove(cb, w.name, w.rate, 12);
    const ld = s.sym(w.load[0], w.load[1], w.x, 710);
    s.run([[w.x, cb.bottom], [w.x, ld.top]]);
    await s.captionBelow(ld, w.load[2], w.load[3], 14);
  }
  const lmc = s.sym("LMC", "box", 960, 706);   // sits on the same baseline as the charger loads
  s.run([[960, BUS], [960, lmc.top]]);
  s.dot(960, BUS);
  await s.captionBelow(lmc, "Dynamic Load Management", "Load management controller", 14);
  return s;
};

/* ------------------------------------------------ battery storage */
CASES["battery-storage-plant"] = async () => {
  const s = new Sheet("sld-battery-storage-plant", "Battery Energy Storage Plant", `${DECK} · 33 kV / 690 V / 1000 V DC`, 940, 1080);
  s.desc = "A 33 kV grid point of connection feeds the POC breaker and the 33 kV collector bus. A 10 MVA " +
    "33 kV / 690 V step-up transformer and the PCS AC breaker carry the AC side down to the bidirectional " +
    "5 MW / 10 MWh power conversion system. Below it, on the DC side of the section divide, the plant splits " +
    "into two 1000 V DC battery strings, each through its own 1600 A DC isolator.";

  const X = 330;
  const grid = await s.node("GRID", "utility", X, 140, "33 kV Grid Point of Connection", "500 MVA · 33 kV");
  const poc = await s.node("POC", "breaker", X, 246, "POC Breaker 52-G", "1250 A · 25 kA sym");
  s.drop(grid, poc);

  const BUS = 340;
  s.run([[X, poc.bottom], [X, BUS]]);
  await s.busbar(BUS, [X], "33 kV Collector Bus", "33 kV");
  s.dot(X, BUS);

  const tx = await s.node("TX", "transformer", X, 440, "Step-up Transformer", "10 MVA · 33 kV / 690 V");
  s.run([[X, BUS], [X, tx.top]]);
  await s.cable(X, 396, "3C 300 mm² · 33 kV", "left");
  const acb = await s.node("ACB", "breaker", X, 556, "PCS AC Breaker", "2500 A · 50 kA sym");
  s.drop(tx, acb);
  await s.cable(X, 512, "3×630 mm² Cu · 690 V", "left");
  const pcs = await s.node("PCS", "box", X, 656, "Bidirectional PCS Inverter", "5 MW / 10 MWh · 690 V AC");
  s.drop(acb, pcs);

  await s.section(736, "AC SECTION · 33 kV / 690 V", "DC SECTION · 1000 V DC");

  const DCBUS = 800;
  s.run([[X, pcs.bottom], [X, DCBUS]]);
  s.run([[190, DCBUS], [530, DCBUS]]);
  s.dot(X, DCBUS);
  for (const [id, x, name, bid, bname] of [
    ["DC1", 190, "DC Isolator A", "BAT1", "Battery String A"],
    ["DC2", 530, "DC Isolator B", "BAT2", "Battery String B"],
  ]) {
    const iso = s.sym(id, "switch_load", x, 876);
    s.run([[x, DCBUS], [x, iso.top]]);
    await s.caption(iso, name, "1600 A DC", "right");
    const bat = s.sym(bid, "load", x, 990);
    s.run([[x, iso.bottom], [x, bat.top]]);
    await s.cable(x, 936, "2×240 mm² DC", "left");
    await s.captionBelow(bat, bname, "1000 V DC · 5 MWh", 14);
  }
  return s;
};

/* ------------------------------------------------ commercial solar */
CASES["commercial-solar"] = async () => {
  const s = new Sheet("sld-commercial-solar", "Commercial PV Interconnection", `${DECK} · 600 V DC / 400 V AC`, 1100, 1110);
  s.desc = "Three PV arrays land on a 600 V DC combiner, then run through the DC isolator into the 200 kW " +
    "grid-tie inverter. On the AC side the inverter feeds the 400 A breaker and the production meter onto the " +
    "400 V main switchboard, which the utility also supplies; the building loads hang below the switchboard. " +
    "The dashed rule marks where the DC section ends and the AC section begins.";

  const arrays = [
    { id: "PV_A", x: 200, name: "PV Array A", rate: "100 kWdc", cable: "PV1-F 2×70 mm²" },
    { id: "PV_B", x: 400, name: "PV Array B", rate: "100 kWdc", cable: "PV1-F 2×70 mm²" },
    { id: "PV_C", x: 600, name: "PV Array C", rate: "50 kWdc", cable: "PV1-F 2×35 mm²" },
  ];
  const CMBY = 300;
  for (const a of arrays) {
    const d = s.sym(a.id, "solar", a.x, 160);
    await s.captionAbove(d, a.name, a.rate, 14);
    s.run([[a.x, d.bottom], [a.x, CMBY - 45], [400, CMBY - 45], [400, CMBY - 15]]);
    await s.cable(a.x, CMBY - 58, a.cable, a.x === 600 ? "left" : "right");
    if (a.x !== 400) s.dot(400, CMBY - 45);
  }
  const cmb = await s.node("CMB", "hub", 400, CMBY, "DC Combiner", "600 Vdc");
  const disc = await s.node("DISC_DC", "switch_load", 400, 416, "DC Isolator", "600 Vdc · 500 A");
  s.drop(cmb, disc);
  await s.cable(400, 372, "2×240 mm² DC", "left");
  const inv = await s.node("INV", "box", 400, 530, "Grid-tie Inverter", "200 kWac");
  s.drop(disc, inv);

  await s.section(610, "DC SECTION · 600 V DC", "AC SECTION · 400 V");

  const cb = await s.node("CB_AC", "breaker", 400, 700, "AC Breaker", "400 A · C-curve · 25 kA");
  s.run([[400, inv.bottom], [400, cb.top]]);
  await s.cable(400, 664, "4×240 mm² Cu", "left");
  const mtr = await s.node("MTR", "watthour_meter", 400, 800, "Production Meter", "");
  s.drop(cb, mtr);

  const BUS = 890;
  s.run([[400, mtr.bottom], [400, BUS]]);
  await s.busbar(BUS, [400, 560, 870], "Main Switchboard", "400 V");
  s.dot(400, BUS);

  const util = await s.node("UTIL", "utility", 870, 800, "Utility", "400 V", "left");
  s.run([[870, util.bottom], [870, BUS]]);
  s.dot(870, BUS);

  const load = s.sym("LOAD", "load", 560, 980);
  s.run([[560, BUS], [560, load.top]]);
  s.dot(560, BUS);
  await s.captionBelow(load, "Building Loads", "Facility", 14);
  return s;
};

/* ------------------------------------------------ industrial 11 kV */
CASES["industrial-11kv-substation"] = async () => {
  const s = new Sheet("sld-industrial-11kv-substation", "Industrial 11 kV Customer Substation", `${DECK} · 11 kV / 415 V`, 1060, 1120);
  s.desc = "The 11 kV utility incomer runs through the 52-HV vacuum circuit breaker, the protection current " +
    "transformers and the revenue meter into the 2500 kVA Dyn11 transformer. The overcurrent and earth-fault " +
    "relay sits off to the side and trips the breaker over a dashed control link rather than a power " +
    "conductor. On the low-voltage side the 4000 A main air circuit breaker feeds the 415 V main switchboard, " +
    "which serves MCC-1 — and through it a 315 kW process motor — and the plant distribution board.";

  const X = 480;
  const grid = await s.node("GRID", "utility", X, 140, "11 kV Utility Incomer", "11 kV · 250 MVA");
  const vcb = await s.node("VCB", "breaker", X, 250, "52-HV Incomer VCB", "630 A · 25 kA");
  s.drop(grid, vcb);
  await s.cable(X, 205, "11 kV", "left");

  s.relayCode = "51";
  const rly = s.sym("RLY", "relay", 210, 250);
  s.run([[rly.right, 250], [vcb.x - 24, 250]], { dash: "5 4" });
  await s.at(300, 242, "TRIP", { size: FS_CABLE, fill: FAINT, extra: ' letter-spacing="1.1"' });
  await s.captionBelow(rly, "Overcurrent / Earth Fault Relay", "50/51 · 50N/51N", 14);

  const ct = await s.node("CT1", "ct", X, 350, "Protection CTs", "200/1 A");
  s.drop(vcb, ct);
  const mtr = await s.node("MTR", "watthour_meter", X, 440, "Revenue Meter", "11 kV");
  s.drop(ct, mtr);
  const tx = await s.node("TX", "transformer", X, 550, "TX-1", "2500 kVA · 11 kV / 415 V · Dyn11");
  s.drop(mtr, tx);

  await s.section(636, "HIGH-VOLTAGE SIDE · 11 kV", "LOW-VOLTAGE SIDE · 415 V");

  const lv = await s.node("LV", "breaker", X, 720, "52-LV Main ACB", "4000 A · 50 kA");
  s.run([[X, tx.bottom], [X, lv.top]]);

  const BUS = 810;
  s.run([[X, lv.bottom], [X, BUS]]);
  await s.busbar(BUS, [300, 480, 720], "415 V Main LV Switchboard", "415 V");
  s.dot(X, BUS);

  const mcc = s.sym("MCC", "panel", 300, 900);
  s.run([[300, BUS], [300, mcc.top]]);
  s.dot(300, BUS);
  await s.caption(mcc, "MCC-1", "1600 A", "left");
  const motor = s.sym("MOTOR", "motor", 300, 1010);
  s.run([[300, mcc.bottom], [300, motor.top]]);
  await s.captionBelow(motor, "Process Motor", "315 kW · 415 V · 3ph", 14);

  const db = s.sym("DB", "panel", 720, 900);
  s.run([[720, BUS], [720, db.top]]);
  s.dot(720, BUS);
  await s.captionBelow(db, "Plant Distribution Board", "800 A", 14);
  return s;
};

/* ------------------------------------------------ generator transfer */
CASES["generator-transfer"] = async () => {
  const s = new Sheet("sld-generator-transfer", "Generator Transfer Distribution", `${DECK} · 480 V`, 1000, 660);
  s.desc = "A 480 V open-transition transfer scheme. The utility supply and the 250 kVA standby generator each " +
    "run through their own breaker into the two sides of a 400 A automatic transfer switch: the arm is drawn " +
    "closed on the normal source, with the emergency side dashed. Below the switch the load splits onto the " +
    "normal-load bus and the essential-load bus.";

  const util = await s.node("UTIL", "utility", 300, 160, "Utility Supply", "480 V", "left");
  const gen = await s.node("GEN", "generator", 700, 160, "Standby Generator", "250 kVA · 480 V", "right");
  const cbu = await s.node("CB_U", "breaker", 300, 280, "Utility Breaker", "400 A · 35 kA", "left");
  const cbg = await s.node("CB_G", "breaker", 700, 280, "Generator Breaker", "300 A · 25 kA", "right");
  s.drop(util, cbu); s.drop(gen, cbg);

  const ats = s.sym("ATS", "ats", 500, 420);
  s.run([[300, cbu.bottom], [300, 396], [478, 396]]);
  s.run([[700, cbg.bottom], [700, 396], [522, 396]]);
  await s.caption(ats, "Open-transition Transfer", "400 A · 480 V", "right");
  await s.at(566, 458, "automatic transfer switch", { size: FS_CABLE, fill: FAINT });

  s.run([[500, 440], [500, 520]]);
  s.run([[240, 520], [820, 520]]);
  s.dot(500, 520);
  for (const [x, name] of [[240, "Normal-load Bus"], [820, "Essential-load Bus"]]) {
    s.run([[x, 520], [x, 580]]);
    await s.busbar(580, [x], name, "480 V");
  }
  return s;
};

/* ------------------------------------------------ data centre dual feed */
CASES["data-centre-dual-feed"] = async () => {
  const s = new Sheet("sld-data-centre-dual-feed", "Data Centre · Dual Feed Critical Power", `${DECK} · 11 kV / 400 V`, 1260, 1130);
  s.desc = "Two independent 11 kV utility feeds, drawn as two columns that never share a conductor. On the " +
    "critical side, feed A passes through transformer A and incomer A into the critical automatic transfer " +
    "switch, whose emergency side is fed by the 1500 kVA standby generator; the transfer switch feeds the " +
    "500 kVA UPS, PDU A and data hall IT load A. On the redundant side, feed B passes through transformer B " +
    "and incomer B straight to PDU B and data hall IT load B. There is no bus tie between the two systems.";

  await s.at(190, 118, "SYSTEM A · CRITICAL", { size: FS_CABLE, fill: FAINT, extra: ' letter-spacing="1.2"' });
  await s.at(900, 118, "SYSTEM B · REDUNDANT", { size: FS_CABLE, fill: FAINT, extra: ' letter-spacing="1.2"' });

  const A = 300, B = 1010;
  const u1 = await s.node("U1", "utility", A, 175, "Utility Feed A", "11 kV · 500 MVA", "left");
  const t1 = await s.node("TX1", "transformer", A, 290, "Transformer A", "1600 kVA · 11 kV / 400 V", "left");
  s.drop(u1, t1);
  await s.cable(A, 240, "11 kV", "right");
  const c1 = await s.node("CB1", "breaker", A, 405, "Incomer A", "2500 A · 50 kA", "left");
  s.drop(t1, c1);
  await s.cable(A, 362, "400 V", "right");

  const g1 = await s.node("G1", "generator", 620, 405, "Generator G1", "1500 kVA · 400 V", "right");
  const ats = s.sym("ATS1", "ats", A, 545);
  s.run([[A, c1.bottom], [A, 500], [A - 22, 500], [A - 22, 521]]);
  s.run([[620, g1.bottom], [620, 500], [A + 22, 500], [A + 22, 521]]);
  await s.caption(ats, "ATS Critical A", "1600 A · 4-pole", "left");

  const ups = await s.node("UPS1", "ups", A, 680, "UPS A", "500 kVA", "left");
  s.run([[A, 565], [A, ups.top]]);
  const p1 = await s.node("PDU1", "panel", A, 810, "PDU A", "800 A · 400/230 V", "left");
  s.drop(ups, p1);
  const i1 = s.sym("IT1", "load", A, 940);
  s.run([[A, p1.bottom], [A, i1.top]]);
  await s.captionBelow(i1, "Data Hall IT Load A", "400 kW", 14);

  const u2 = await s.node("U2", "utility", B, 175, "Utility Feed B", "11 kV · 500 MVA", "right");
  const t2 = await s.node("TX2", "transformer", B, 290, "Transformer B", "1600 kVA · 11 kV / 400 V", "right");
  s.drop(u2, t2);
  await s.cable(B, 240, "11 kV", "left");
  const c2 = await s.node("CB2", "breaker", B, 405, "Incomer B", "2500 A · 50 kA", "right");
  s.drop(t2, c2);
  await s.cable(B, 362, "400 V", "left");
  const p2 = await s.node("PDU2", "panel", B, 810, "PDU B", "800 A · 400/230 V", "right");
  s.run([[B, c2.bottom], [B, p2.top]]);
  await s.cable(B, 620, "400 V", "left");
  const i2 = s.sym("IT2", "load", B, 940);
  s.run([[B, p2.bottom], [B, i2.top]]);
  await s.captionBelow(i2, "Data Hall IT Load B", "400 kW", 14);

  await s.note(1035, "System A and System B are electrically separate — there is no bus tie between them.");
  await s.note(1055, "ATS Critical A is drawn in its normal position: closed on Utility Feed A, with Generator G1 on standby.");
  return s;
};

/* ------------------------------------------------ hospital essential branch */
CASES["hospital-essential-branch"] = async () => {
  const s = new Sheet("sld-hospital-essential-branch", "Hospital Essential Electrical System", `${DECK} · 480 V`, 1420, 1160);
  s.desc = "The normal utility service feeds the main service breaker and the normal switchboard, drawn as a " +
    "heavy vertical bus down the left. The 1250 kW emergency generator feeds an emergency bus drawn the same " +
    "way down the right. Between them sit three automatic transfer switches, one per NEC 517 branch — " +
    "equipment, critical and life safety — each with its normal side closed on the normal switchboard and its " +
    "emergency side dashed back to the generator bus. Each transfer switch runs right into its own branch " +
    "panel and that branch's load: essential HVAC, the OR and ICU critical loads, and egress lighting with " +
    "fire alarm.";

  const NX = 150, EX = 1300, TOP = 380, BOT = 1000;
  const util = await s.node("UTIL", "utility", NX, 170, "Normal Utility Service", "480 V · 65 kA", "right");
  const main = await s.node("MAIN", "breaker", NX, 278, "Main Service Breaker", "2000 A · 65 kA", "right");
  s.drop(util, main);
  s.run([[NX, main.bottom], [NX, TOP]]);
  s.run([[NX, TOP], [NX, BOT]], { width: W_BUS });
  await s.at(NX - 10, TOP - 12, "Normal Switchboard · 480 V", { size: FS_NAME, weight: 600, fill: INK });

  const gen = await s.node("GEN", "generator", EX, 170, "Emergency Generator", "1250 kW · 480 V", "left");
  s.run([[EX, gen.bottom], [EX, TOP]]);
  s.run([[EX, TOP], [EX, BOT]], { width: W_BUS });
  await s.at(EX + 10, TOP - 12, "Emergency Bus · 480 V", { size: FS_NAME, weight: 600, fill: INK, anchor: "end" });

  const branches = [
    { id: "ATSN", y: 500, rate: "400 A", name: "ATS Equipment Branch", panel: ["EQ", "Equipment Branch Panel", "400 A"], load: ["HVAC", "Essential HVAC", "200 kW"] },
    { id: "ATSC", y: 720, rate: "600 A", name: "ATS Critical Branch", panel: ["CR", "Critical Branch Panel", "600 A"], load: ["OR", "OR and ICU Critical Loads", "150 kW"] },
    { id: "ATSL", y: 940, rate: "400 A", name: "ATS Life Safety Branch", panel: ["LS", "Life Safety Panel", "400 A"], load: ["EGR", "Egress Lighting and Fire Alarm", "80 kW"] },
  ];
  for (const b of branches) {
    const ats = s.sym(b.id, "ats", 500, b.y);
    s.run([[NX, b.y - 56], [478, b.y - 56], [478, b.y - 24]]);
    s.dot(NX, b.y - 56);
    s.run([[EX, b.y - 92], [522, b.y - 92], [522, b.y - 24]], { dash: "6 5" });
    s.dot(EX, b.y - 92);
    await s.caption(ats, b.name, b.rate, "left");

    const panel = s.sym(b.panel[0], "panel", 800, b.y + 20);
    s.run([[500, b.y + 20], [760, b.y + 20]]);
    await s.captionBelow(panel, b.panel[1], b.panel[2], 12);
    // a load triangle is fed at its flat top, so the run turns down into it
    const load = s.sym(b.load[0], "load", 1080, b.y + 65);
    s.run([[840, b.y + 20], [1080, b.y + 20], [1080, load.top]]);
    await s.captionBelow(load, b.load[1], b.load[2], 12);
  }
  await s.note(1108, "Each branch transfers independently: the emergency side of every transfer switch is dashed back to the generator bus, never to another branch.");
  return s;
};

/* ------------------------------------------------ marine vessel */
CASES["marine-vessel-power"] = async () => {
  const s = new Sheet("sld-marine-vessel-power", "Offshore Support Vessel · Main Power", `${DECK} · 440 V THREE PHASE`, 1440, 840);
  s.desc = "Two 1000 kW diesel generators and an interlocked shore connection each feed the 440 V main " +
    "switchboard through their own breaker; the switchboard serves the 750 kW propulsion drive and the hotel " +
    "services board. To the right, and deliberately not tied to it, the 250 kW emergency generator feeds its " +
    "own emergency switchboard and the emergency lighting and navigation load.";

  await s.at(90, 118, "MAIN POWER SYSTEM", { size: FS_CABLE, fill: FAINT, extra: ' letter-spacing="1.2"' });
  await s.at(1250, 118, "EMERGENCY POWER SYSTEM", { size: FS_CABLE, fill: FAINT, extra: ' letter-spacing="1.2"' });

  const srcs = [
    { id: "DG1", kind: "generator", x: 200, name: "Diesel Generator 1", rate: "1000 kW · 440 V", cb: ["GCB1", "Generator Breaker 1", "1600 A · 50 kA"] },
    { id: "DG2", kind: "generator", x: 480, name: "Diesel Generator 2", rate: "1000 kW · 440 V", cb: ["GCB2", "Generator Breaker 2", "1600 A · 50 kA"] },
    { id: "SHORE", kind: "utility", x: 760, name: "Shore Connection", rate: "500 A · 440 V", cb: ["SCB", "Shore Breaker (interlocked)", "500 A · 50 kA"] },
  ];
  const MSB = 490;
  for (const g of srcs) {
    const src = s.sym(g.id, g.kind, g.x, 200);
    await s.captionAbove(src, g.name, g.rate, 14);
    const cb = s.sym(g.cb[0], "breaker", g.x, 350);
    s.run([[g.x, src.bottom], [g.x, cb.top]]);
    await s.caption(cb, g.cb[1], g.cb[2], "right");
    s.run([[g.x, cb.bottom], [g.x, MSB]]);
    s.dot(g.x, MSB);
  }
  await s.busbar(MSB, [200, 300, 660, 760], "Main Switchboard", "440 V · 3-phase");

  const prop = s.sym("PROP", "motor", 300, 640);
  s.run([[300, MSB], [300, prop.top]]);
  s.dot(300, MSB);
  await s.captionBelow(prop, "Propulsion Drive", "750 kW · 440 V", 14);
  const hotel = s.sym("HOTEL", "panel", 660, 640);
  s.run([[660, MSB], [660, hotel.top]]);
  s.dot(660, MSB);
  await s.captionBelow(hotel, "Hotel Services Board", "400 A", 14);

  const emg = s.sym("EMG", "generator", 1400, 200);
  await s.captionAbove(emg, "Emergency Generator", "250 kW · 440 V", 14);
  s.run([[1400, emg.bottom], [1400, MSB]]);
  s.dot(1400, MSB);
  await s.busbar(MSB, [1400], "Emergency Switchboard", "440 V");
  const safe = s.sym("SAFE", "load", 1400, 640);
  s.run([[1400, MSB], [1400, safe.top]]);
  await s.captionBelow(safe, "Emergency Lighting / Navigation", "100 kW", 14);

  await s.note(770, "The shore breaker is mechanically interlocked against the two generator breakers.");
  await s.note(770, "The emergency switchboard has no tie to the main switchboard.", 1250);
  return s;
};

// ---------------------------------------------------------------- run

const want = process.argv.slice(2);
const names = want.length ? want : Object.keys(CASES);
let failed = 0;
for (const name of names) {
  if (!CASES[name]) throw new Error(`no layout for sld-${name}`);
  const sheet = await CASES[name]();
  sheet.titleW = await measure(sheet.title, 18, 700);
  const svgText = sheet.fit().render();
  await page.setContent(`<style>html,body{margin:0}</style>${svgText}`);
  const found = [...duplicateAttributes(svgText), ...(await check(sheet))];
  if (found.length) {
    failed++;
    console.error(`sld-${name} collides, not written:\n  ${found.join("\n  ")}`);
    continue;
  }
  await writeFile(`visual-eval/cases/sld-${name}/ideal.svg`, svgText);
  console.log(`sld-${name}: ${sheet.w}x${sheet.h}, ${sheet.boxes.length} symbols, 0 collisions`);
}
await browser.close();
if (failed) process.exit(1);
