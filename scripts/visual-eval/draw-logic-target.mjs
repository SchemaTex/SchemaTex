/** Draw a logic-gate case's `ideal.svg` — the target the engine is aiming at.
 *
 *   node scripts/visual-eval/draw-logic-target.mjs [case-id ...]
 *
 * Symbol geometry, palette and type scale come from
 * visual-eval/exemplars/logic/ansi/ideal.svg, so all six targets are the same drawing
 * repeated. Placement and wiring stay per-case below: these circuits each want
 * a different idiom — a decoder tree, a sum-of-products rail field, a stacked
 * ripple chain, a cross-coupled latch — and one router good enough for all of
 * them would draw every one of them worse than choosing the idiom by hand.
 *
 * Nothing is written until the finished drawing passes the collision check at
 * the bottom of `emit`: every label against every other label, every wire and
 * the canvas edge, and every wire against every gate it is not attached to. A
 * target that collides is worse than no target, because the vision judge then
 * scores the engine against it.
 */
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

/* =============================== kit ================================= */
const INK = "#1E293B", MUTED = "#64748B", PAPER = "#FFFFFF", RULE = "#E2E8F0";
const FS = { title: 20, port: 13, net: 10, caption: 11.5, sub: 11.5 };
const SW = { gate: 1.5, wire: 1.25, bubble: 1.5 };
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const GW = 60, R_BUB = 5, R_DOT = 3.5, NOT_W = 42;

const INVERTING = new Set(["nand", "nor", "xnor", "not"]);
const OR_FAMILY = new Set(["or", "nor", "xor", "xnor"]);

/** Body height grows with fan-in so the pins never crowd. */
const bodyH = (kind, n = 2) =>
  kind === "not" || kind === "buf" ? 44 : n <= 2 ? 48 : n <= 4 ? 60 : 24 * n;

class Sheet {
  constructor({ title, subtitle, legend, caption }) {
    Object.assign(this, { title, subtitle, legend, caption });
    this.gates = {}; this.wires = []; this.dots = []; this.texts = [];
  }

  /** kind: and | or | xor | nand | nor | xnor | not | buf */
  gate(id, kind, x, y, n = 2) {
    const h = bodyH(kind, n);
    return (this.gates[id] = { id, kind, x, y, n, h });
  }

  out(ref) {
    if (typeof ref !== "string") return ref;              // already a point
    const g = this.gates[ref];
    if (!g) throw new Error(`no gate ${ref}`);
    const nose = g.kind === "not" || g.kind === "buf" ? g.x + NOT_W : g.x + GW;
    return [INVERTING.has(g.kind) ? nose + 2 * R_BUB : nose, g.y];
  }

  pinDy(g, i) {
    if (g.n <= 1) return 0;
    const pitch = (g.h - 24) / (g.n - 1);
    return (i - (g.n - 1) / 2) * pitch;
  }

  /** Where an input wire stops: OR-family backs are concave, so the wire has
   *  to follow the arc in rather than stopping on the bounding box. */
  pin(id, i) {
    const g = this.gates[id];
    const dy = this.pinDy(g, i);
    let x = g.x;
    if (OR_FAMILY.has(g.kind)) {
      const t = (dy + g.h / 2) / g.h;
      x = (g.kind === "xor" || g.kind === "xnor" ? g.x - 9 : g.x) + 2 * 14 * t * (1 - t);
    }
    return [x, g.y + dy];
  }

  bbox(id) {
    const g = this.gates[id];
    const left = g.kind === "xor" || g.kind === "xnor" ? g.x - 9 : g.x;
    return { x0: left, y0: g.y - g.h / 2, x1: this.out(id)[0], y1: g.y + g.h / 2, id };
  }

  wire(pts, attached = []) { this.wires.push({ pts, attached }); return pts; }
  dot(x, y) { this.dots.push([x, y]); }

  /** One source to one sink. Straight when the rows agree, otherwise a single
   *  dogleg through `channel` — the x of a vertical run inside a column gutter. */
  link(src, sinkId, i, channel) {
    const a = this.out(src), b = this.pin(sinkId, i);
    const attached = [typeof src === "string" ? src : null, sinkId].filter(Boolean);
    if (Math.abs(a[1] - b[1]) < 0.01) return this.wire([a, b], attached);
    if (channel === undefined) throw new Error(`${src}->${sinkId} needs a channel`);
    return this.wire([a, [channel, a[1]], [channel, b[1]], b], attached);
  }

  /** Branch off an existing horizontal run: a filled dot on the run, then a
   *  vertical down (or up) into one more pin. */
  tap(x, y, sinkId, i) {
    const b = this.pin(sinkId, i);
    this.dot(x, y);
    return this.wire([[x, y], [x, b[1]], b], [sinkId]);
  }

  /** A net that feeds several gates: one horizontal trunk (on `lane` when the
   *  source's own row would cut through a gate), one vertical per sink, a
   *  filled dot wherever the trunk carries on past a branch. */
  fan(src, branches, lane) {
    const a = this.out(src);
    const srcId = typeof src === "string" ? src : null;
    const sorted = [...branches].sort((p, q) => p.channel - q.channel);
    const trunkY = lane ?? a[1];
    const far = sorted[sorted.length - 1].channel;
    if (trunkY !== a[1]) {
      const first = sorted[0].channel;
      this.wire([a, [first, a[1]], [first, trunkY], [far, trunkY]], srcId ? [srcId] : []);
    } else {
      this.wire([a, [far, trunkY]], srcId ? [srcId] : []);
    }
    for (const br of sorted) {
      const b = br.point ?? this.pin(br.gate, br.i);
      this.wire([[br.channel, trunkY], [br.channel, b[1]], b], br.gate ? [br.gate] : []);
      if (br.channel !== far || (trunkY !== a[1] && br.channel === sorted[0].channel)) this.dot(br.channel, trunkY);
    }
  }

  /** A literal rail: one vertical line tapped by horizontal stubs. This is how
   *  sum-of-products drawings survive a signal that feeds eight AND gates. */
  rail(src, x, branches, opts = {}) {
    const a = this.out(src);
    const srcId = typeof src === "string" ? src : null;
    const pts = branches.map((br) => br.point ?? this.pin(br.gate, br.i));
    const ys = [a[1], ...pts.map((p) => p[1])];
    const lo = Math.min(...ys), hi = Math.max(...ys);
    this.wire([a, [x, a[1]]], srcId ? [srcId] : []);
    this.wire([[x, lo], [x, hi]]);
    branches.forEach((br, k) => {
      const b = pts[k];
      this.wire([[x, b[1]], b], br.gate ? [br.gate] : []);
      if (b[1] !== lo && b[1] !== hi) this.dot(x, b[1]);
    });
    if (a[1] !== lo && a[1] !== hi) this.dot(x, a[1]);
    if (opts.label) this.text(opts.label, x, lo - 12, { fs: FS.net, fill: MUTED, anchor: "middle", ls: 0.4 });
  }

  text(s, x, y, o = {}) {
    this.texts.push({ s, x, y, fs: o.fs ?? FS.port, bold: !!o.bold,
      anchor: o.anchor ?? "start", fill: o.fill ?? INK, ls: o.ls ?? 0 });
  }
  /** Net name set above its own output wire, the way the exemplar does it. */
  net(id, x, dy = -7) { const g = this.gates[id]; this.text(id, x, g.y + dy, { fs: FS.net, fill: MUTED, anchor: "middle", ls: 0.4 }); }
}

/* ---------- symbols ---------- */
const orPath = (x, y, h) => {
  const a = h / 2, b = h * 0.458, c = h * 0.292;
  return `M ${x},${y - a} Q ${x + 14},${y} ${x},${y + a}` +
    ` C ${x + 26},${y + b} ${x + 46},${y + c} ${x + GW},${y}` +
    ` C ${x + 46},${y - c} ${x + 26},${y - b} ${x},${y - a} Z`;
};
const gatePath = (g) => {
  const { kind, x, y, h } = g;
  if (kind === "and" || kind === "nand") {
    const r = h / 2;
    return `M ${x},${y - r} H ${x + GW - r} A ${r},${r} 0 0 1 ${x + GW - r},${y + r} H ${x} Z`;
  }
  if (kind === "not" || kind === "buf") return `M ${x},${y - 22} L ${x},${y + 22} L ${x + NOT_W},${y} Z`;
  return orPath(x, y, h);
};

/* ---------- emit + check ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Number(v.toFixed(2));

async function emit(sheet, { width, height, margin = 46, desc }, measure) {
  const boxes = [];
  for (const t of sheet.texts) {
    const w = await measure(t.s, t.fs, t.bold ? 600 : 400, t.ls);
    const x0 = t.anchor === "end" ? t.x - w : t.anchor === "middle" ? t.x - w / 2 : t.x;
    boxes.push({ t, x0, y0: t.y - t.fs * 0.78, x1: x0 + w, y1: t.y + t.fs * 0.24 });
  }
  const segs = [];
  for (const w of sheet.wires)
    for (let i = 0; i + 1 < w.pts.length; i++) segs.push({ a: w.pts[i], b: w.pts[i + 1], attached: w.attached });

  const grow = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
  const segHits = (a, b, r) => !(Math.max(a[0], b[0]) < r.x0 || Math.min(a[0], b[0]) > r.x1 ||
    Math.max(a[1], b[1]) < r.y0 || Math.min(a[1], b[1]) > r.y1);
  const rects = (p, q) => !(p.x1 < q.x0 || p.x0 > q.x1 || p.y1 < q.y0 || p.y0 > q.y1);

  const problems = [];
  for (const box of boxes) {
    const b = grow(box, 2);
    if (b.x0 < margin - 24 || b.y0 < 12 || b.x1 > width - margin + 24 || b.y1 > height - 12)
      problems.push(`text "${box.t.s}" outside the canvas margin`);
    for (const s of segs) if (segHits(s.a, s.b, b)) problems.push(`text "${box.t.s}" over a wire`);
    for (const id of Object.keys(sheet.gates)) if (rects(b, grow(sheet.bbox(id), 1))) problems.push(`text "${box.t.s}" over gate ${id}`);
    for (const o of boxes) if (o !== box && rects(b, grow(o, 2))) problems.push(`text "${box.t.s}" over text "${o.t.s}"`);
    for (const [x, y] of sheet.dots) if (segHits([x - R_DOT, y - R_DOT], [x + R_DOT, y + R_DOT], b)) problems.push(`text "${box.t.s}" over a junction dot`);
  }
  for (const s of segs)
    for (const id of Object.keys(sheet.gates)) {
      if (s.attached.includes(id)) continue;
      if (segHits(s.a, s.b, grow(sheet.bbox(id), 1))) problems.push(`a wire runs through gate ${id}`);
    }
  if (problems.length) throw new Error([...new Set(problems)].join("\n  "));

  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`);
  o.push(`<title>${esc(sheet.title)}</title>`);
  o.push(`<desc>${esc(desc)}</desc>`);
  o.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${PAPER}"/>`);
  o.push(`<line x1="${margin}" y1="96" x2="${width - margin}" y2="96" stroke="${RULE}" stroke-width="1"/>`);
  if (sheet.caption) o.push(`<line x1="${margin}" y1="${height - 70}" x2="${width - margin}" y2="${height - 70}" stroke="${RULE}" stroke-width="1"/>`);
  o.push(`<g fill="none" stroke="${INK}" stroke-width="${SW.wire}" stroke-linecap="square" stroke-linejoin="miter">`);
  for (const w of sheet.wires) o.push(`<polyline points="${w.pts.map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ")}"/>`);
  o.push(`</g>`);
  o.push(`<g fill="${PAPER}" stroke="${INK}" stroke-width="${SW.gate}" stroke-linejoin="round">`);
  for (const g of Object.values(sheet.gates)) {
    o.push(`<path d="${gatePath(g)}"/>`);
    if (g.kind === "xor" || g.kind === "xnor")
      o.push(`<path d="M ${g.x - 9},${g.y - g.h / 2} Q ${g.x + 5},${g.y} ${g.x - 9},${g.y + g.h / 2}" fill="none"/>`);
    if (INVERTING.has(g.kind)) {
      const nose = g.kind === "not" ? g.x + NOT_W : g.x + GW;
      o.push(`<circle cx="${nose + R_BUB}" cy="${g.y}" r="${R_BUB}" stroke-width="${SW.bubble}"/>`);
    }
  }
  o.push(`</g>`);
  o.push(`<g fill="${INK}">`);
  for (const [x, y] of sheet.dots) o.push(`<circle cx="${n2(x)}" cy="${n2(y)}" r="${R_DOT}"/>`);
  o.push(`</g>`);
  o.push(`<g font-family="${FONT}">`);
  for (const t of sheet.texts)
    o.push(`<text x="${n2(t.x)}" y="${n2(t.y)}" font-size="${t.fs}" fill="${t.fill}" text-anchor="${t.anchor}"` +
      `${t.bold ? ' font-weight="600"' : ""}${t.ls ? ` letter-spacing="${t.ls}"` : ""}>${esc(t.s)}</text>`);
  o.push(`</g>`);
  o.push(`</svg>`);
  return o.join("\n") + "\n";
}

/* ============================= layouts =============================== */
const SUB = "ANSI / IEEE Std 91 distinctive-shape gates · signal flow left to right";
const LEGEND = "filled dot = junction · plain crossing = no connection";

/** Header, input stubs and output stubs are the same on every sheet. */
const frame = (s, { width, inputs, outputs, railOut }) => {
  s.text(s.title, 46, 56, { fs: FS.title, bold: true });
  s.text(SUB, 46, 80, { fs: FS.sub, fill: MUTED });
  s.text(LEGEND, width - 46, 80, { fs: FS.sub, fill: MUTED, anchor: "end" });
  for (const [name, y] of inputs) s.text(name, 54, y + 4.5, { anchor: "end" });
  for (const [name, y] of outputs) s.text(name, railOut + 10, y + 4.5, { bold: true });
};

const LAYOUTS = {};

/* ---------------------------------------------------------------- adder --*/
LAYOUTS["full-adder"] = () => {
  const width = 800, height = 520, RAIL = 62, OUT = 690;
  const s = new Sheet({ title: "1-bit Full Adder", caption: true });
  const A = 146, B = 170, Cin = 250;
  s.gate("s1", "xor", 190, 158);
  s.gate("c1", "and", 190, 390);
  s.gate("Sum", "xor", 380, 196);
  s.gate("c2", "and", 380, 300);
  s.gate("Cout", "or", 570, 345);

  s.wire([[RAIL, A], s.pin("s1", 0)], ["s1"]);
  s.tap(112, A, "c1", 0);
  s.wire([[RAIL, B], s.pin("s1", 1)], ["s1"]);
  s.tap(88, B, "c1", 1);
  s.fan("s1", [{ channel: 300, gate: "Sum", i: 0 }, { channel: 332, gate: "c2", i: 0 }]);
  s.fan([RAIL, Cin], [{ channel: 344, gate: "Sum", i: 1 }, { channel: 356, gate: "c2", i: 1 }]);
  s.link("c2", "Cout", 0, 500);
  s.link("c1", "Cout", 1, 524);
  s.wire([s.out("Sum"), [OUT, 196]], ["Sum"]);
  s.wire([s.out("Cout"), [OUT, 345]], ["Cout"]);

  s.net("s1", 276, -9);
  s.net("c1", 390, -9);
  s.net("c2", 470, -9);
  s.text("Sum = A ⊕ B ⊕ Cin", 46, 478, { fs: FS.caption, fill: MUTED });
  s.text("Cout = A·B + (A ⊕ B)·Cin", 300, 478, { fs: FS.caption, fill: MUTED });
  frame(s, { width, railOut: OUT,
    inputs: [["A", A], ["B", B], ["Cin", Cin]],
    outputs: [["Sum", 196], ["Cout", 345]] });
  return { sheet: s, page: { width, height, desc:
    "Gate-level 1-bit full adder in ANSI/IEEE Std 91 distinctive-shape symbols. Inputs A, B and Cin enter as labelled stubs on the left. A and B drive an exclusive-OR whose output is the half-sum net s1, and an AND whose output is the carry-generate net c1. A second exclusive-OR adds Cin to s1 to give Sum; a second AND combines s1 with Cin to give the carry-propagate net c2; an OR gate sums c1 and c2 into Cout. All wires are orthogonal, filled dots mark fan-out junctions, and the two outputs leave on the right margin." } };
};

/* -------------------------------------------------------------- decoder --*/
LAYOUTS["2to4-decoder"] = () => {
  const width = 790, height = 600, RAIL = 62, OUT = 690;
  const s = new Sheet({ title: "Enabled 2-to-4 Decoder", caption: true });
  const E = 120, S1 = 170, S0 = 250;
  s.gate("nS1", "not", 190, S1, 1);
  s.gate("nS0", "not", 190, S0, 1);
  s.gate("e0", "and", 380, 200);
  s.gate("e1", "and", 380, 400);
  const Y = { Y0: 150, Y1: 250, Y2: 350, Y3: 450 };
  for (const [id, y] of Object.entries(Y)) s.gate(id, "and", 570, y);

  // enable: one rail down the first gutter into both half-decode ANDs
  s.wire([[RAIL, E], [300, E], [300, 188], s.pin("e0", 0)], ["e0"]);
  s.dot(300, 188);
  s.wire([[300, 188], [300, 388], s.pin("e1", 0)], ["e1"]);
  // S1 drives its inverter and, unchanged, the high half-decode
  s.wire([[RAIL, S1], s.pin("nS1", 0)], ["nS1"]);
  s.dot(120, S1);
  s.wire([[120, S1], [120, 412], s.pin("e1", 1)], ["e1"]);
  s.link("nS1", "e0", 1, 340);
  // S0 and its complement are the minterm literals: one rail each, tapped twice
  s.wire([[RAIL, S0], s.pin("nS0", 0)], ["nS0"]);
  s.dot(96, S0);
  s.wire([[96, S0], [96, 500], [536, 500], [536, 262], s.pin("Y1", 1)], ["Y1"]);
  s.dot(536, 462);
  s.wire([[536, 462], s.pin("Y3", 1)], ["Y3"]);
  s.rail("nS0", 512, [{ gate: "Y0", i: 1 }, { gate: "Y2", i: 1 }]);
  s.fan("e0", [{ channel: 470, gate: "Y0", i: 0 }, { channel: 486, gate: "Y1", i: 0 }]);
  s.fan("e1", [{ channel: 470, gate: "Y2", i: 0 }, { channel: 486, gate: "Y3", i: 0 }]);
  for (const [id, y] of Object.entries(Y)) s.wire([s.out(id), [OUT, y]], [id]);

  s.net("nS1", 276, -9);
  s.net("nS0", 320, -9);
  s.net("e0", 456, -9);
  s.net("e1", 456, -9);
  s.text("Y0 = E·S1′·S0′", 46, 558, { fs: FS.caption, fill: MUTED });
  s.text("Y1 = E·S1′·S0", 210, 558, { fs: FS.caption, fill: MUTED });
  s.text("Y2 = E·S1·S0′", 370, 558, { fs: FS.caption, fill: MUTED });
  s.text("Y3 = E·S1·S0", 530, 558, { fs: FS.caption, fill: MUTED });
  frame(s, { width, railOut: OUT,
    inputs: [["E", E], ["S1", S1], ["S0", S0]],
    outputs: Object.entries(Y) });
  return { sheet: s, page: { width, height, desc:
    "Gate-level enabled 2-to-4 decoder in ANSI/IEEE Std 91 distinctive-shape symbols. Enable E and select lines S1 and S0 enter as labelled stubs on the left. Two inverters produce the complements nS1 and nS0. E is qualified by S1 and by nS1 in a pair of AND gates, giving the half-decode nets e0 and e1, and each of those is combined with S0 or nS0 in a final AND to give one of the four active-high outputs Y0 to Y3. The S0 and nS0 literals run as vertical rails tapped twice each; all wires are orthogonal, filled dots mark junctions and plain crossings mark wires that pass without connecting." } };
};

/* ------------------------------------------------------------------ mux --*/
LAYOUTS["4to1-multiplexer"] = () => {
  const width = 1090, height = 840, RAIL = 62, OUT = 1010;
  const s = new Sheet({ title: "4-to-1 Multiplexer", caption: true });
  const P = { p0: 160, p1: 280, p2: 400, p3: 520 };
  for (const [id, y] of Object.entries(P)) s.gate(id, "and", 460, y, 3);
  s.gate("o01", "or", 680, 220);
  s.gate("o23", "or", 680, 460);
  s.gate("Y", "or", 880, 340);
  s.gate("nS1", "not", 190, 660, 1);
  s.gate("nS0", "not", 190, 720, 1);

  // data inputs run straight into the top pin of their own product term
  Object.keys(P).forEach((id, k) => s.wire([[RAIL, P[id] - 18], s.pin(id, 0)], [id]));
  // select literals: four vertical rails, each tapped by the two terms it qualifies
  s.wire([[RAIL, 660], s.pin("nS1", 0)], ["nS1"]);
  s.dot(120, 660);
  s.wire([[120, 660], [120, 570], [330, 570], [330, 400], s.pin("p2", 1)], ["p2"]);
  s.dot(330, 520);
  s.wire([[330, 520], s.pin("p3", 1)], ["p3"]);
  s.wire([[RAIL, 720], s.pin("nS0", 0)], ["nS0"]);
  s.dot(96, 720);
  s.wire([[96, 720], [96, 610], [410, 610], [410, 298], s.pin("p1", 2)], ["p1"]);
  s.dot(410, 538);
  s.wire([[410, 538], s.pin("p3", 2)], ["p3"]);
  s.rail("nS1", 300, [{ gate: "p0", i: 1 }, { gate: "p1", i: 1 }]);
  s.rail("nS0", 380, [{ gate: "p0", i: 2 }, { gate: "p2", i: 2 }]);

  s.link("p0", "o01", 0, 600);
  s.link("p1", "o01", 1, 622);
  s.link("p2", "o23", 0, 600);
  s.link("p3", "o23", 1, 622);
  s.link("o01", "Y", 0, 800);
  s.link("o23", "Y", 1, 822);
  s.wire([s.out("Y"), [OUT, 340]], ["Y"]);

  for (const id of Object.keys(P)) s.net(id, 552, -11);
  s.net("o01", 772, -11);
  s.net("o23", 772, -11);
  // rail names sit on the short run out of the inverter, where no data wire passes
  s.text("nS1", 272, 651, { fs: FS.net, fill: MUTED, anchor: "middle", ls: 0.4 });
  s.text("nS0", 312, 711, { fs: FS.net, fill: MUTED, anchor: "middle", ls: 0.4 });
  s.text("S1", 232, 561, { fs: FS.net, fill: MUTED, anchor: "middle", ls: 0.4 });
  s.text("S0", 232, 601, { fs: FS.net, fill: MUTED, anchor: "middle", ls: 0.4 });
  s.text("Y = D0·S1′·S0′ + D1·S1′·S0 + D2·S1·S0′ + D3·S1·S0", 46, 798, { fs: FS.caption, fill: MUTED });
  frame(s, { width, railOut: OUT,
    inputs: [["D0", 142], ["D1", 262], ["D2", 382], ["D3", 502], ["S1", 660], ["S0", 720]],
    outputs: [["Y", 340]] });
  return { sheet: s, page: { width, height, desc:
    "Gate-level 4-to-1 multiplexer in ANSI/IEEE Std 91 distinctive-shape symbols. Data inputs D0 to D3 enter on the left and each drives the top pin of its own three-input AND gate. Select inputs S1 and S0 enter below and drive two inverters; the four select literals S1, nS1, S0 and nS0 then run as vertical rails, each tapped by the two product terms it qualifies, so exactly one of p0 to p3 can be high. The four product terms are combined by two OR gates, o01 and o23, whose outputs feed a final OR to give Y. All wires are orthogonal; filled dots mark junctions and plain crossings mark wires that pass without connecting." } };
};

/* ------------------------------------------------------------------ latch --*/
LAYOUTS["sr-latch-nor"] = () => {
  const width = 1060, height = 620, RAIL = 62, OUT = 940;
  const s = new Sheet({ title: "NOR SR Latch", caption: true });
  const R = 188, S = 388;
  s.gate("rbuf", "buf", 190, R, 1);
  s.gate("sbuf", "buf", 190, S, 1);
  s.gate("Q", "nor", 420, 200);
  s.gate("Qbar", "nor", 420, 400);
  s.gate("qbuf", "buf", 640, 140, 1);
  s.gate("qb1", "buf", 640, 460, 1);
  s.gate("qmonitor", "buf", 830, 140, 1);
  s.gate("qb2", "buf", 830, 460, 1);

  s.wire([[RAIL, R], s.pin("rbuf", 0)], ["rbuf"]);
  s.wire([[RAIL, S], s.pin("sbuf", 0)], ["sbuf"]);
  s.link("rbuf", "Q", 0, 330);
  s.link("sbuf", "Qbar", 0, 330);

  // Q and Qbar each leave right, tap once for the cross-coupled feedback and
  // once for their buffer chain, then run on to the output margin.
  s.wire([s.out("Q"), [OUT, 200]], ["Q"]);
  s.dot(540, 200);
  s.wire([[540, 200], [540, 340], [356, 340], [356, 412], s.pin("Qbar", 1)], ["Qbar"]);
  s.tap(600, 200, "qbuf", 0);
  s.wire([s.out("Qbar"), [OUT, 400]], ["Qbar"]);
  s.dot(566, 400);
  s.wire([[566, 400], [566, 290], [380, 290], [380, 212], s.pin("Q", 1)], ["Q"]);
  s.tap(600, 400, "qb1", 0);

  s.wire([s.out("qbuf"), s.pin("qmonitor", 0)], ["qbuf", "qmonitor"]);
  s.wire([s.out("qb1"), s.pin("qb2", 0)], ["qb1", "qb2"]);
  s.wire([s.out("qmonitor"), [920, 140]], ["qmonitor"]);
  s.wire([s.out("qb2"), [920, 460]], ["qb2"]);
  s.text("qmonitor", 928, 144.5, { fs: FS.net, fill: MUTED });
  s.text("qb2", 928, 464.5, { fs: FS.net, fill: MUTED });

  s.net("rbuf", 288, -9);
  s.net("sbuf", 288, -9);
  s.net("qbuf", 756, -9);
  s.net("qb1", 756, -9);
  s.text("Q = (R + Qbar)′", 46, 578, { fs: FS.caption, fill: MUTED });
  s.text("Qbar = (S + Q)′", 240, 578, { fs: FS.caption, fill: MUTED });
  s.text("S = R = 1 is disallowed — both outputs would go low", 440, 578, { fs: FS.caption, fill: MUTED });
  frame(s, { width, railOut: OUT, inputs: [["R", R], ["S", S]], outputs: [["Q", 200], ["Qbar", 400]] });
  return { sheet: s, page: { width, height, desc:
    "Gate-level active-high SR latch built from two cross-coupled NOR gates, drawn with ANSI/IEEE Std 91 distinctive-shape symbols. Inputs S and R enter on the left through buffers sbuf and rbuf. The upper NOR takes rbuf and the fed-back Qbar and produces Q; the lower NOR takes sbuf and the fed-back Q and produces Qbar, so each output is wired back to the other gate's second input — the cross-coupling that gives the latch its memory. Q and Qbar also drive buffer chains qbuf to qmonitor and qb1 to qb2 before leaving on the right. All wires are orthogonal; filled dots mark junctions and plain crossings mark wires that pass without connecting." } };
};

/* ----------------------------------------------------------- ripple adder --*/
LAYOUTS["4bit-ripple-adder"] = () => {
  const width = 880, height = 1080, RAIL = 62, OUT = 780;
  const s = new Sheet({ title: "4-bit Ripple-Carry Adder", caption: true });
  const base = (k) => 160 + 210 * k;          // one full-adder stage per band
  const inputs = [], outputs = [];

  for (let k = 0; k < 4; k++) {
    const Y = base(k), carry = k === 3 ? "Cout" : `c${k}`;
    s.gate(`x${k}`, "xor", 190, Y);
    s.gate(`S${k}`, "xor", 380, Y + 38);
    s.gate(`b${k}`, "and", 380, Y + 110);
    s.gate(carry, "or", 570, Y + 98);
    s.gate(`a${k}`, "and", 190, Y + 150);
  }
  for (let k = 0; k < 4; k++) {
    const Y = base(k), carry = k === 3 ? "Cout" : `c${k}`;
    // the two addend bits enter on their own rows and each drops once into the
    // generate AND, so the stage reads the same way four times over
    s.wire([[RAIL, Y - 12], s.pin(`x${k}`, 0)], [`x${k}`]);
    s.tap(112, Y - 12, `a${k}`, 0);
    s.wire([[RAIL, Y + 12], s.pin(`x${k}`, 1)], [`x${k}`]);
    s.tap(88, Y + 12, `a${k}`, 1);
    s.fan(`x${k}`, [{ channel: 300, gate: `S${k}`, i: 0 }, { channel: 332, gate: `b${k}`, i: 0 }]);

    // carry in: along a lane above the band, then down into the two gates that
    // consume it. The lane is entered from the left for Cin, from the previous
    // stage's OR on the right for every other bit.
    const L = Y - 34;
    const head = k === 0 ? [[RAIL, L]] : [s.out(`c${k - 1}`), [680, base(k - 1) + 98], [680, L]];
    const far = k === 0 ? 356 : 344, near = k === 0 ? 344 : 356;
    const chan = { 344: [`b${k}`, 1], 356: [`S${k}`, 0 + 1] };
    s.wire([...head, [far, L]], k === 0 ? [] : [`c${k - 1}`]);
    for (const x of [near, far]) {
      const [g, i] = chan[x];
      const pt = s.pin(g, i);
      if (x === near) s.dot(x, L);
      s.wire([[x, L], [x, pt[1]], pt], [g]);
    }

    s.link(`a${k}`, carry, 0, 500);
    s.wire([s.out(`b${k}`), s.pin(carry, 1)], [`b${k}`, carry]);
    s.wire([s.out(`S${k}`), [OUT, Y + 38]], [`S${k}`]);
    s.net(`x${k}`, 290, -9);
    s.net(`a${k}`, 330, -9);
    s.net(`b${k}`, 470, -9);
    if (k < 3) s.net(`c${k}`, 700, -9);
    inputs.push([`A${k}`, Y - 12], [`B${k}`, Y + 12]);
    outputs.push([`S${k}`, Y + 38]);
  }
  s.wire([s.out("Cout"), [OUT, base(3) + 98]], ["Cout"]);
  inputs.push(["Cin", base(0) - 34]);
  outputs.push(["Cout", base(3) + 98]);

  s.text("Each bit is a full adder: Sk = Ak ⊕ Bk ⊕ ck−1", 46, 1038, { fs: FS.caption, fill: MUTED });
  s.text("ck = Ak·Bk + (Ak ⊕ Bk)·ck−1 — the carry ripples down the chain", 380, 1038, { fs: FS.caption, fill: MUTED });
  frame(s, { width, railOut: OUT, inputs, outputs });
  return { sheet: s, page: { width, height, desc:
    "Gate-level 4-bit ripple-carry adder in ANSI/IEEE Std 91 distinctive-shape symbols, drawn as four identical full-adder stages stacked one above the other, bit 0 at the top. In each stage the two addend bits Ak and Bk enter on the left, drive an exclusive-OR whose output xk is the half sum and an AND whose output ak is the carry generate; a second exclusive-OR adds the incoming carry to xk to give the sum bit Sk, a second AND combines xk with the incoming carry to give the carry propagate bk, and an OR gate sums ak and bk into that stage's carry out. Cin enters the top stage from the left; every other stage takes its carry from the stage above along a lane that runs back across the sheet, which is the ripple the name refers to. The four sum bits and Cout leave on the right margin. All wires are orthogonal; filled dots mark junctions and plain crossings mark wires that pass without connecting." } };
};

/* ------------------------------------------------------------------- bcd --*/
LAYOUTS["bcd-seven-segment-driver"] = () => {
  const width = 1020, height = 1390, RAIL = 62, OUT = 940;
  const s = new Sheet({ title: "BCD Seven-Segment Driver", caption: true });

  // Sum of products: each BCD bit and its complement runs down the sheet as a
  // literal rail, and every product term taps the rails it needs.
  const IN = {
    A: { y: 140, drop: 148, inv: 400, lane: 640, rail: 340, buf: "c" },
    B: { y: 200, drop: 132, inv: 460, lane: 652, rail: 388, buf: "d" },
    C: { y: 260, drop: 116, inv: 520, lane: 664, rail: 436, buf: "e" },
    D: { y: 320, drop: 100, inv: 580, lane: 676, rail: 484, buf: "f" },
  };
  const NRAIL = { nA: 364, nB: 412, nC: 460 };      // nD is generated but unused
  const TERMS = {
    a1: { y: 790, lits: ["nA", "nB", "nC"] },
    a2: { y: 880, lits: ["nA", "B", "nC", "D"] },
    a3: { y: 970, lits: ["A", "nB", "C", "D"] },
    b1: { y: 1060, lits: ["nA", "nB", "C", "D"] },
    b2: { y: 1150, lits: ["nA", "B", "nC", "D"] },
    b3: { y: 1240, lits: ["A", "B", "nC", "D"] },
  };
  const railX = (lit) => NRAIL[lit] ?? IN[lit].rail;

  for (const [name, p] of Object.entries(IN)) {
    s.gate(p.buf, "buf", 200, p.y, 1);
    s.gate(`n${name}`, "not", 200, p.inv, 1);
  }
  for (const [id, t] of Object.entries(TERMS)) s.gate(id, "and", 620, t.y, t.lits.length);
  s.gate("g", "or", 620, 690);
  s.gate("a", "or", 800, 880, 3);
  s.gate("b", "or", 800, 1150, 3);

  for (const [name, p] of Object.entries(IN)) {
    s.wire([[RAIL, p.y], s.pin(p.buf, 0)], [p.buf]);
    s.dot(p.drop, p.y);
    s.wire([[p.drop, p.y], [p.drop, p.lane], [p.rail, p.lane]]);
    s.dot(p.drop, p.inv);
    s.wire([[p.drop, p.inv], s.pin(`n${name}`, 0)], [`n${name}`]);
    s.wire([s.out(p.buf), [OUT, p.y]], [p.buf]);
  }
  for (const [n, x] of Object.entries(NRAIL)) s.wire([s.out(n), [x, s.gates[n].y]], [n]);
  s.wire([s.out("nD"), [300, 580]], ["nD"]);
  s.text("nD", 308, 584.5, { fs: FS.net, fill: MUTED });

  const taps = {};
  for (const [id, t] of Object.entries(TERMS))
    t.lits.forEach((lit, i) => (taps[railX(lit)] ??= []).push([s.pin(id, i), id]));
  (taps[IN.A.rail] ??= []).push([s.pin("g", 0), "g"]);
  (taps[IN.B.rail] ??= []).push([s.pin("g", 1), "g"]);
  const nameOf = (x) => Object.keys(NRAIL).find((n) => NRAIL[n] === x)
    ?? Object.keys(IN).find((n) => IN[n].rail === x);
  const topOf = (x) => NRAIL[nameOf(x)] ? s.gates[nameOf(x)].y : IN[nameOf(x)].lane;
  for (const xs of Object.keys(taps)) {
    const x = Number(xs), list = taps[xs];
    const bottom = Math.max(...list.map(([pt]) => pt[1]));
    s.wire([[x, topOf(x)], [x, bottom]]);
    for (const [pt, id] of list) {
      if (pt[1] !== bottom) s.dot(x, pt[1]);
      s.wire([[x, pt[1]], pt], [id]);
    }
    // the rail is named where it starts, next to the gate that drives it
    s.text(nameOf(x), x, topOf(x) - 8, { fs: FS.net, fill: MUTED, anchor: "middle", ls: 0.4 });
  }

  s.link("a1", "a", 0, 740);
  s.wire([s.out("a2"), s.pin("a", 1)], ["a2", "a"]);
  s.link("a3", "a", 2, 762);
  s.link("b1", "b", 0, 740);
  s.wire([s.out("b2"), s.pin("b", 1)], ["b2", "b"]);
  s.link("b3", "b", 2, 762);
  s.wire([s.out("a"), [OUT, 880]], ["a"]);
  s.wire([s.out("b"), [OUT, 1150]], ["b"]);
  s.wire([s.out("g"), [OUT, 690]], ["g"]);

  for (const id of Object.keys(TERMS)) s.net(id, 706, -11);
  s.text("a = A′B′C′ + A′BC′D + AB′CD", 46, 1348, { fs: FS.caption, fill: MUTED });
  s.text("b = A′B′CD + A′BC′D + ABC′D", 320, 1348, { fs: FS.caption, fill: MUTED });
  s.text("c–f are buffered bits and g = A + B in this partial driver", 600, 1348, { fs: FS.caption, fill: MUTED });
  frame(s, { width, railOut: OUT,
    inputs: Object.entries(IN).map(([n, p]) => [n, p.y]),
    outputs: [["c", 140], ["d", 200], ["e", 260], ["f", 320], ["g", 690], ["a", 880], ["b", 1150]] });
  return { sheet: s, page: { width, height, desc:
    "Partial gate-level BCD to seven-segment driver in ANSI/IEEE Std 91 distinctive-shape symbols. The four BCD bits A, B, C and D enter on the left as the input bus; each drives a buffer that becomes one of the pass-through segment outputs c, d, e and f, and each also drops into an inverter, so all four complements nA, nB, nC and nD are generated. The bits and their complements then run down the sheet as labelled vertical literal rails. Segment a is the OR of three inverted-input AND terms a1, a2 and a3; segment b is the OR of its own three AND terms b1, b2 and b3; each term taps the rails for the literals it needs, with a filled dot at every connection. Segment g is the OR of A and B. All seven outputs a to g leave on the right margin. A wire that crosses a rail without a dot is not connected to it." } };
};

/* ============================== driver =============================== */
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (text, size, weight, ls = 0) => {
  const key = `${weight}|${size}|${ls}|${text}`;
  if (!cache.has(key))
    cache.set(key, (await page.evaluate(([t, s, w, f]) => {
      const ctx = document.getElementById("c").getContext("2d");
      ctx.font = `${w} ${s}px ${f}`;
      return ctx.measureText(t).width;
    }, [text, size, weight, 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif'])) + ls * text.length);
  return cache.get(key);
};

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LAYOUTS);
let failed = 0;
for (const id of ids) {
  const build = LAYOUTS[id];
  if (!build) { console.log(`no layout for ${id}`); failed++; continue; }
  try {
    const { sheet, page: pg } = build();
    const svg = await emit(sheet, pg, measure);
    await writeFile(new URL(`../../visual-eval/cases/logic-${id}/ideal.svg`, import.meta.url), svg);
    console.log(`ok   ${id}  ${pg.width}x${pg.height}  ${Object.keys(sheet.gates).length} gates`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${id}\n  ${e.message}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
