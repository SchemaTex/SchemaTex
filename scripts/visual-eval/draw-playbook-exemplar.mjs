#!/usr/bin/env node
/** Draws the three sports-playbook exemplars — football, basketball and soccer —
 *  into visual-eval/exemplars/playbook/<sport>/ideal.svg.
 *
 * One kit draws all three, so the family is consistent by construction: the
 * same page frame, header, legend, player tokens, line weights, arrowheads,
 * T-bars, wave and dash rhythm, ball glyph and label rules. Each sport only
 * supplies its surface (to scale, in its own unit), its markings, its players
 * and its actions, and chooses which line style each action gets — the
 * pass/run inversion between basketball and soccer lives in `GRAMMAR` below.
 *
 * Every sport attacks up the page: football downfield, basketball toward the
 * basket at the top, soccer toward the goal at the top.
 *
 * After drawing, every text box, token, line and arrowhead is checked against
 * every other one and against the canvas edge; the script prints the counts
 * and exits non-zero on any collision. It also checks that each drawing has
 * exactly the players and actions its source.sx declares.
 *
 *   node scripts/visual-eval/draw-playbook-exemplar.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../visual-eval/exemplars/playbook/", import.meta.url);

// ─── Palette ────────────────────────────────────────────────────────────
const C = {
  paper: "#FFFFFF",
  ink: "#15233B", // title, offense tokens, offense movement lines
  caption: "#5B6675", // subtitle, legend text
  rule: "#DDE2E8", // legend divider
  defense: "#B42318", // defender X, defender tags, defender movement
  turf: "#62A574", // football field and soccer pitch
  turfStripe: "#5A9C6B", // mowing stripes
  turfSurround: "#4B8A5C", // grass beyond the sidelines / touchlines / goal line
  marking: "#FFFFFF", // grass markings
  maple: "#EFD9B2", // basketball court
  mapleSurround: "#D3B083", // apron beyond the sidelines and baseline
  paint: "#E5C595", // painted lane
  courtLine: "#9A6634", // court markings
  rim: "#E2621B",
  ballBasketball: "#E07A1F",
};
const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Frame ──────────────────────────────────────────────────────────────
const W = 1012;
const M = 32; // page margin
const BAND = 24; // out-of-bounds band beyond a real boundary line
const FW = 900; // surface width, the same for all three sports
const FX0 = M + BAND;
const TITLE_Y = 42;
const SUB_Y = 64;
const PANEL_TOP = 86;

// ─── Type scale ─────────────────────────────────────────────────────────
const T = {
  title: { size: 20, weight: 600 },
  subtitle: { size: 12.5, weight: 400 },
  token: { size: 11.5, weight: 700 }, // one-character token label
  token2: { size: 10, weight: 700 }, // two-character token label
  tag: { size: 10.5, weight: 700 }, // defender position letter / number
  zone: { size: 10, weight: 600, tracking: 0.8 },
  legend: { size: 12, weight: 400 },
};

// ─── Line kit ───────────────────────────────────────────────────────────
const L = {
  stroke: 2.4,
  dash: 7,
  gap: 5,
  waveAmp: 3.3,
  waveLen: 10,
  waveTail: 13,
  headLen: 11,
  headHalf: 5.2,
  shotHeadLen: 13,
  shotHeadHalf: 7,
  shotOffset: 2.6,
  shotStroke: 1.7,
  teeHalf: 7.5,
  teeStroke: 2.8,
  tokenR: 11,
  xHalf: 6.5,
  xStroke: 2.6,
  ballR: 4.6,
};

/** (sport, action) → line style and terminator. The one table that carries
 *  the pass/run inversion: basketball passes are dashed and cuts solid;
 *  soccer passes are solid and runs dashed. */
const GRAMMAR = {
  football: { route: ["solid", "arrow"], run: ["solid", "arrow"], block: ["solid", "tee"], pass: ["dashed", "arrow"], motion: ["dashed", "arrow"] },
  basketball: { cut: ["solid", "arrow"], pass: ["dashed", "arrow"], dribble: ["wavy", "arrow"], screen: ["solid", "tee"], shot: ["solid", "arrow"] },
  soccer: { pass: ["solid", "arrow"], run: ["dashed", "arrow"], dribble: ["wavy", "arrow"], shot: ["double", "arrow"] },
};

// ─── Geometry helpers ───────────────────────────────────────────────────
const r2 = (v) => Math.round(v * 100) / 100;
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function lengthOf(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
  return len;
}
/** Point and unit direction at arc length s along a polyline. */
function pointAt(pts, s) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = dist(a, b);
    if (seg === 0) continue;
    if (acc + seg >= s || i === pts.length - 1) {
      const t = Math.max(0, Math.min(1, (s - acc) / seg));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: (b.x - a.x) / seg, dy: (b.y - a.y) / seg };
    }
    acc += seg;
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  const seg = dist(a, b) || 1;
  return { x: b.x, y: b.y, dx: (b.x - a.x) / seg, dy: (b.y - a.y) / seg };
}
function slice(pts, s0, s1) {
  const out = [pointAt(pts, s0)];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += dist(pts[i - 1], pts[i]);
    if (acc > s0 + 0.01 && acc < s1 - 0.01) out.push({ x: pts[i].x, y: pts[i].y });
  }
  out.push(pointAt(pts, s1));
  return out.map((p) => ({ x: p.x, y: p.y }));
}
function quad(p0, c, p1, n = 28) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y });
  }
  return out;
}
const d = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${r2(p.x)} ${r2(p.y)}`).join(" ");
function segDist(p, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}
function segsCross(a, b, c, e) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) * o(a, b, e) < 0 && o(c, e, a) * o(c, e, b) < 0;
}
function segHitsBox(a, b, box, pad = 0) {
  const bx = { x0: box.x0 - pad, y0: box.y0 - pad, x1: box.x1 + pad, y1: box.y1 + pad };
  const inside = (p) => p.x >= bx.x0 && p.x <= bx.x1 && p.y >= bx.y0 && p.y <= bx.y1;
  if (inside(a) || inside(b)) return true;
  const corners = [{ x: bx.x0, y: bx.y0 }, { x: bx.x1, y: bx.y0 }, { x: bx.x1, y: bx.y1 }, { x: bx.x0, y: bx.y1 }];
  for (let i = 0; i < 4; i++) if (segsCross(a, b, corners[i], corners[(i + 1) % 4])) return true;
  return false;
}
const boxCircle = (box, c) => Math.hypot(Math.max(box.x0 - c.x, 0, c.x - box.x1), Math.max(box.y0 - c.y, 0, c.y - box.y1));
const boxesOverlap = (a, b, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;

// ─── Text metrics (Helvetica Neue advance widths, em) ───────────────────
const ADV = {
  " ": 0.278, "0": 0.556, "1": 0.556, "2": 0.556, "3": 0.556, "4": 0.556, "5": 0.556, "6": 0.556, "7": 0.556, "8": 0.556, "9": 0.556,
  A: 0.667, B: 0.667, C: 0.722, D: 0.722, E: 0.611, F: 0.574, G: 0.759, H: 0.722, I: 0.259, J: 0.519, K: 0.667, L: 0.556, M: 0.87,
  N: 0.722, O: 0.759, P: 0.648, Q: 0.759, R: 0.685, S: 0.648, T: 0.574, U: 0.722, V: 0.611, W: 0.926, X: 0.611, Y: 0.648, Z: 0.611,
  a: 0.537, b: 0.593, c: 0.537, d: 0.593, e: 0.537, f: 0.296, g: 0.574, h: 0.556, i: 0.222, j: 0.222, k: 0.519, l: 0.222, m: 0.853,
  n: 0.556, o: 0.574, p: 0.593, q: 0.593, r: 0.333, s: 0.5, t: 0.315, u: 0.556, v: 0.5, w: 0.758, x: 0.518, y: 0.5, z: 0.481,
  "·": 0.278, "&": 0.648, "-": 0.389, "–": 0.5, "×": 0.6, "(": 0.259, ")": 0.259, ":": 0.278, ",": 0.278, ".": 0.278, "'": 0.259, "$": 0.556, "/": 0.278, "½": 0.834,
};
function textWidth(str, size, weight = 400, tracking = 0) {
  const k = weight >= 600 ? 1.06 : 1;
  let w = 0;
  for (const ch of String(str)) w += (ADV[ch] ?? 0.6) * size * k;
  return w + Math.max(0, [...String(str)].length - 1) * tracking;
}

// ─── Sheet ──────────────────────────────────────────────────────────────
function sheet(sport) {
  return {
    sport,
    layer: { surface: [], zones: [], lines: [], tokens: [], text: [], legend: [] },
    texts: [], // {id, kind, owner, x0, y0, x1, y1}
    tokens: [], // {id, kind, x, y, r}
    lines: [], // {id, owner, pts (centre line after trimming), heads: [{tip, base}]}
    pendingTags: [],
    H: 0,
  };
}

function text(s, layer, x, y, str, o = {}) {
  const { size = 12, weight = 400, fill = C.ink, anchor = "start", tracking = 0, halo, opacity, rotate = 0, kind = "text", owner, id = str } = o;
  const w = textWidth(str, size, weight, tracking);
  const asc = size * 0.72, desc = size * 0.2;
  let box;
  if (rotate) {
    box = { x0: x - asc / 2, y0: y - w / 2, x1: x + asc / 2, y1: y + w / 2 };
  } else {
    const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    box = { x0, y0: y - asc, x1: x0 + w, y1: y + desc };
  }
  s.texts.push({ id, kind, owner, ...box });
  const attrs = [
    `font-size="${size}"`,
    weight !== 400 ? `font-weight="${weight}"` : "",
    `fill="${fill}"`,
    anchor !== "start" ? `text-anchor="${anchor}"` : "",
    tracking ? `letter-spacing="${tracking}"` : "",
    opacity ? `fill-opacity="${opacity}"` : "",
    halo ? `stroke="${halo}" stroke-width="3" stroke-linejoin="round" paint-order="stroke"` : "",
  ].filter(Boolean).join(" ");
  if (rotate) {
    // rotated about the glyph box centre; y offset puts the cap height's middle on the anchor
    s.layer[layer].push(`<text transform="translate(${r2(x)} ${r2(y)}) rotate(${rotate})" x="0" y="${r2(asc / 2)}" ${attrs}>${esc(str)}</text>`);
  } else {
    s.layer[layer].push(`<text x="${r2(x)}" y="${r2(y)}" ${attrs}>${esc(str)}</text>`);
  }
}

// ─── Player tokens ──────────────────────────────────────────────────────
function offense(s, id, p, label = id, shape = "circle") {
  const r = L.tokenR;
  if (shape === "square") {
    const h = r * 0.92;
    s.layer.tokens.push(`<rect x="${r2(p.x - h)}" y="${r2(p.y - h)}" width="${r2(2 * h)}" height="${r2(2 * h)}" fill="${C.paper}" stroke="${C.ink}" stroke-width="2.2"/>`);
  } else {
    s.layer.tokens.push(`<circle cx="${r2(p.x)}" cy="${r2(p.y)}" r="${r}" fill="${C.paper}" stroke="${C.ink}" stroke-width="2.2"/>`);
  }
  s.tokens.push({ id, kind: "offense", x: p.x, y: p.y, r: r + 1.1 });
  if (label) {
    const t = [...label].length > 1 ? T.token2 : T.token;
    text(s, "tokens", p.x, p.y + t.size * 0.36, label, { ...t, anchor: "middle", kind: "inlabel", owner: id, id: `${id}:label` });
  }
}

function defender(s, id, p, tag) {
  const k = L.xHalf;
  const seg = (sx, sy) => `M${r2(p.x - k * sx)} ${r2(p.y - k * sy)}L${r2(p.x + k * sx)} ${r2(p.y + k * sy)}`;
  const path = `${seg(1, 1)} ${seg(1, -1)}`;
  s.layer.tokens.push(`<path d="${path}" stroke="${C.paper}" stroke-width="${L.xStroke + 2.6}" stroke-linecap="round" stroke-opacity="0.9"/>`);
  s.layer.tokens.push(`<path d="${path}" stroke="${C.defense}" stroke-width="${L.xStroke}" stroke-linecap="round"/>`);
  s.tokens.push({ id, kind: "defense", x: p.x, y: p.y, r: k + 2 });
  if (tag) s.pendingTags.push({ id, p, tag });
}

/** Ball glyph beside its first carrier; placed after the lines are known. */
function ball(s, owner, p, fill, stroke) {
  s.pendingTags.push({ id: `${owner}:ball`, p, ball: { fill, stroke } });
}

// ─── Movement lines ─────────────────────────────────────────────────────
/** Draw one action. `pts` are px; the line is trimmed by `startGap` / `endGap`
 *  so it leaves a token edge and stops short of its target. */
function move(s, { id, owner, sport, action, pts, startGap = 0, endGap = 0, color = C.ink, teeHalf = L.teeHalf }) {
  const [style, end] = GRAMMAR[sport][action];
  const full = lengthOf(pts);
  const line = slice(pts, startGap, full - endGap);
  const len = lengthOf(line);
  const out = [];
  const heads = [];
  const headLen = style === "double" ? L.shotHeadLen : L.headLen;
  const headHalf = style === "double" ? L.shotHeadHalf : L.headHalf;
  const bodyEnd = end === "arrow" ? len - headLen + 1.2 : len;
  const body = slice(line, 0, bodyEnd);
  const cap = `stroke-linecap="round" stroke-linejoin="round" fill="none"`;

  if (style === "solid") {
    out.push(`<path d="${d(body)}" stroke="${color}" stroke-width="${L.stroke}" ${cap}/>`);
  } else if (style === "dashed") {
    const bl = lengthOf(body);
    const n = Math.max(2, Math.round((bl + L.gap) / (L.dash + L.gap)));
    const k = (bl + L.gap) / (n * (L.dash + L.gap));
    out.push(`<path d="${d(body)}" stroke="${color}" stroke-width="${L.stroke}" stroke-dasharray="${r2(L.dash * k)} ${r2(L.gap * k)}" stroke-linecap="butt" stroke-linejoin="round" fill="none"/>`);
  } else if (style === "wavy") {
    const bl = lengthOf(body);
    const waveLen = Math.max(0, bl - L.waveTail);
    const halves = Math.max(1, Math.round((2 * waveLen) / L.waveLen));
    const wl = (2 * waveLen) / halves;
    const wpts = [];
    for (let t = 0; t <= waveLen; t += 1.2) {
      const q = pointAt(body, t);
      const off = L.waveAmp * Math.sin((2 * Math.PI * t) / wl);
      wpts.push({ x: q.x - q.dy * off, y: q.y + q.dx * off });
    }
    wpts.push(pointAt(body, waveLen));
    wpts.push(pointAt(body, bl));
    out.push(`<path d="${d(wpts)}" stroke="${color}" stroke-width="${L.stroke - 0.2}" ${cap}/>`);
  } else if (style === "double") {
    for (const sgn of [-1, 1]) {
      const off = body.map((q, i) => {
        const a = body[Math.max(0, i - 1)], b = body[Math.min(body.length - 1, i + 1)];
        const sl = dist(a, b) || 1;
        return { x: q.x - ((b.y - a.y) / sl) * L.shotOffset * sgn, y: q.y + ((b.x - a.x) / sl) * L.shotOffset * sgn };
      });
      out.push(`<path d="${d(off)}" stroke="${color}" stroke-width="${L.shotStroke}" ${cap}/>`);
    }
  }

  const tip = pointAt(line, len);
  if (end === "arrow") {
    const base = { x: tip.x - tip.dx * headLen, y: tip.y - tip.dy * headLen };
    const a = { x: base.x - tip.dy * headHalf, y: base.y + tip.dx * headHalf };
    const b = { x: base.x + tip.dy * headHalf, y: base.y - tip.dx * headHalf };
    out.push(`<path d="M${r2(tip.x)} ${r2(tip.y)}L${r2(a.x)} ${r2(a.y)}L${r2(b.x)} ${r2(b.y)}Z" fill="${color}"/>`);
    heads.push({ tip: { x: tip.x, y: tip.y }, a, b });
  } else if (end === "tee") {
    const a = { x: tip.x - tip.dy * teeHalf, y: tip.y + tip.dx * teeHalf };
    const b = { x: tip.x + tip.dy * teeHalf, y: tip.y - tip.dx * teeHalf };
    out.push(`<path d="M${r2(a.x)} ${r2(a.y)}L${r2(b.x)} ${r2(b.y)}" stroke="${color}" stroke-width="${L.teeStroke}" stroke-linecap="round"/>`);
    heads.push({ tip: { x: tip.x, y: tip.y }, a, b, tee: true });
  }
  s.layer.lines.push(`<g data-action="${action}" data-player="${esc(owner)}">${out.join("")}</g>`);
  // collision geometry: the centre line plus the terminator edges
  const geo = [...line];
  s.lines.push({ id, owner, action, pts: geo, heads, pad: style === "wavy" ? L.waveAmp + 1.2 : style === "double" ? L.shotOffset + 1 : L.stroke / 2 });
  return line;
}

// ─── Label placement (defender tags, ball glyphs, zone labels) ──────────
function placeFloating(s, W_, H_, extraBoxes = []) {
  for (const f of s.pendingTags) {
    if (f.ball) {
      // lower right of the carrier first, then the other diagonals, then the sides
      const cands = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
      const dd = L.tokenR + L.ballR + 4;
      let placed = null;
      for (const [cx, cy] of cands) {
        const n = Math.hypot(cx, cy);
        const q = { x: f.p.x + (cx / n) * dd, y: f.p.y + (cy / n) * dd };
        const box = { x0: q.x - L.ballR, y0: q.y - L.ballR, x1: q.x + L.ballR, y1: q.y + L.ballR };
        if (!floatingClear(s, box, f.id.split(":")[0])) continue;
        placed = q;
        break;
      }
      if (!placed) throw new Error(`${s.sport}: no free spot for ${f.id}`);
      const { fill, stroke } = f.ball;
      s.layer.tokens.push(`<circle cx="${r2(placed.x)}" cy="${r2(placed.y)}" r="${L.ballR}" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`);
      s.tokens.push({ id: f.id, kind: "ball", x: placed.x, y: placed.y, r: L.ballR + 0.7 });
      continue;
    }
    const t = T.tag;
    const w = textWidth(f.tag, t.size, t.weight);
    // centred below the X first, then above, then to either side
    const cands = [[0, 15.5], [0, -16.5], [13, 3], [-13, 3]];
    let done = false;
    for (const [ox, oy] of cands) {
      const anchor = ox > 0 ? "start" : ox < 0 ? "end" : "middle";
      const x = f.p.x + ox;
      const y = f.p.y + oy + t.size * 0.36;
      const x0 = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
      const box = { x0, y0: y - t.size * 0.72, x1: x0 + w, y1: y + t.size * 0.2 };
      if (!floatingClear(s, box, f.id)) continue;
      text(s, "text", x, y, f.tag, { ...t, fill: C.defense, anchor, halo: C.paper, kind: "tag", owner: f.id, id: `${f.id}:tag` });
      done = true;
      break;
    }
    if (!done) throw new Error(`${s.sport}: no free spot for the tag of ${f.id}`);
  }
  s.pendingTags = [];
}
function floatingClear(s, box, owner) {
  const pad = 2;
  for (const t of s.texts) if (t.kind !== "marking" && boxesOverlap(t, box, pad)) return false;
  for (const k of s.tokens) if (boxCircle(box, k) < k.r + pad) return false;
  for (const ln of s.lines) {
    for (let i = 1; i < ln.pts.length; i++) if (segHitsBox(ln.pts[i - 1], ln.pts[i], box, ln.pad + pad)) return false;
    for (const h of ln.heads) if (segHitsBox(h.a, h.b, box, pad) || segHitsBox(h.a, h.tip, box, pad) || segHitsBox(h.b, h.tip, box, pad)) return false;
  }
  return true;
}

// ─── Header, legend, document ───────────────────────────────────────────
function header(s, title, subtitle) {
  text(s, "text", M, TITLE_Y, title, { ...T.title, kind: "title" });
  text(s, "text", M, SUB_Y, subtitle, { ...T.subtitle, fill: C.caption, kind: "title" });
}

function swatch(kind, x, y) {
  const ink = C.ink;
  const head = (tx, col = ink, hl = L.headLen, hh = L.headHalf) => `<path d="M${tx} ${y}L${tx - hl} ${y - hh}L${tx - hl} ${y + hh}Z" fill="${col}"/>`;
  switch (kind) {
    case "offense": return `<circle cx="${x + 15}" cy="${y}" r="${L.tokenR - 1}" fill="${C.paper}" stroke="${ink}" stroke-width="2.2"/>`;
    case "defense": {
      const k = L.xHalf, cx = x + 15;
      return `<path d="M${cx - k} ${y - k}L${cx + k} ${y + k}M${cx - k} ${y + k}L${cx + k} ${y - k}" stroke="${C.defense}" stroke-width="${L.xStroke}" stroke-linecap="round"/>`;
    }
    case "solid": return `<path d="M${x} ${y}L${x + 20} ${y}" stroke="${ink}" stroke-width="${L.stroke}" stroke-linecap="round"/>${head(x + 30)}`;
    case "dashed": return `<path d="M${x} ${y}L${x + 20} ${y}" stroke="${ink}" stroke-width="${L.stroke}" stroke-dasharray="6 4"/>${head(x + 30)}`;
    case "wavy": {
      const pts = [];
      for (let t = 0; t <= 16; t += 1) pts.push({ x: x + t, y: y + L.waveAmp * Math.sin((2 * Math.PI * t) / 8) });
      pts.push({ x: x + 20, y });
      return `<path d="${d(pts)}" stroke="${ink}" stroke-width="${L.stroke - 0.2}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${head(x + 30)}`;
    }
    case "double": return `<path d="M${x} ${y - L.shotOffset}L${x + 18} ${y - L.shotOffset}M${x} ${y + L.shotOffset}L${x + 18} ${y + L.shotOffset}" stroke="${ink}" stroke-width="${L.shotStroke}"/>${head(x + 30, ink, L.shotHeadLen, L.shotHeadHalf)}`;
    case "tee": return `<path d="M${x} ${y}L${x + 28} ${y}" stroke="${ink}" stroke-width="${L.stroke}" stroke-linecap="round"/><path d="M${x + 28} ${y - L.teeHalf}L${x + 28} ${y + L.teeHalf}" stroke="${ink}" stroke-width="${L.teeStroke}" stroke-linecap="round"/>`;
    case "zone": return `<ellipse cx="${x + 15}" cy="${y}" rx="14" ry="7.5" fill="${C.turf}" stroke="${C.ink}" stroke-opacity="0.55" stroke-width="1.2" stroke-dasharray="4 3"/>`;
    case "ballBasketball": return `<circle cx="${x + 15}" cy="${y}" r="${L.ballR}" fill="${C.ballBasketball}" stroke="${ink}" stroke-width="1.4"/>`;
    case "ballSoccer": return `<circle cx="${x + 15}" cy="${y}" r="${L.ballR}" fill="${C.paper}" stroke="${ink}" stroke-width="1.4"/>`;
    default: throw new Error(`unknown swatch ${kind}`);
  }
}

function legend(s, top, items) {
  s.layer.legend.push(`<path d="M${M} ${r2(top)}L${W - M} ${r2(top)}" stroke="${C.rule}" stroke-width="1"/>`);
  const rowY = top + 28;
  let x = M;
  for (const [kind, label] of items) {
    s.layer.legend.push(swatch(kind, x, rowY));
    text(s, "legend", x + 38, rowY + 4.3, label, { ...T.legend, fill: C.caption, kind: "legend" });
    x += 38 + textWidth(label, T.legend.size) + 26;
  }
  if (x - 26 > W - M) throw new Error(`${s.sport}: legend overflows (${Math.round(x)})`);
  s.H = rowY + 30;
}

function documentSvg(s, title, description) {
  const clip = `<clipPath id="${s.sport}-surface"><rect x="${s.panel.x}" y="${s.panel.y}" width="${s.panel.w}" height="${r2(s.panel.h)}"/></clipPath>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${r2(s.H)}" width="${W}" height="${r2(s.H)}" font-family="${FONT}">`,
    `<title>${esc(title)}</title>`,
    `<desc>${esc(description)}</desc>`,
    `<defs>${clip}</defs>`,
    `<rect width="${W}" height="${r2(s.H)}" fill="${C.paper}"/>`,
    `<g class="surface">${s.layer.surface.join("")}</g>`,
    `<g class="zones" clip-path="url(#${s.sport}-surface)">${s.layer.zones.join("")}</g>`,
    `<g class="moves">${s.layer.lines.join("")}</g>`,
    `<g class="players">${s.layer.tokens.join("")}</g>`,
    `<g class="labels">${s.layer.text.join("")}</g>`,
    `<g class="legend">${s.layer.legend.join("")}</g>`,
    `</svg>`,
  ].join("\n");
}

/** The surface panel: fill, out-of-bounds bands on the real boundary sides, boundary lines. */
function panel(s, { h, top, fill, surround, line, lineWidth = 3, bottomLine = false }) {
  const y = PANEL_TOP + (top ? BAND : 0);
  s.panel = { x: FX0, y, w: FW, h };
  const bandTop = PANEL_TOP;
  const bandH = y + h - bandTop;
  s.layer.surface.push(`<rect x="${M}" y="${bandTop}" width="${W - 2 * M}" height="${r2(bandH)}" fill="${surround}"/>`);
  s.layer.surface.push(`<rect x="${FX0}" y="${y}" width="${FW}" height="${r2(h)}" fill="${fill}"/>`);
  return {
    y,
    boundary: () => {
      const lw = lineWidth, hw = lw / 2;
      const parts = [
        `M${FX0 + hw} ${top ? y + hw : y}L${FX0 + hw} ${r2(y + h)}`,
        `M${FX0 + FW - hw} ${top ? y + hw : y}L${FX0 + FW - hw} ${r2(y + h)}`,
      ];
      if (top) parts.push(`M${FX0} ${y + hw}L${FX0 + FW} ${y + hw}`);
      if (bottomLine) parts.push(`M${FX0} ${r2(y + h - hw)}L${FX0 + FW} ${r2(y + h - hw)}`);
      s.layer.surface.push(`<path d="${parts.join(" ")}" stroke="${line}" stroke-width="${lw}" fill="none"/>`);
    },
  };
}

// ─── Source check ───────────────────────────────────────────────────────
const MOVE_KEYWORDS = new Set(["route", "run", "cut", "move", "dribble", "drive", "pass", "screen", "block", "shot", "shoot", "pull", "handoff", "motion"]);
function sourceFacts(sport) {
  const src = readFileSync(new URL(`${sport}/source.sx`, ROOT), "utf8");
  const facts = { title: "", sport: "", formation: null, defense: null, players: [], moves: [] };
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const words = line.split(/\s+/);
    const kw = words[0];
    if (kw === "playbook") {
      facts.title = /"([^"]*)"/.exec(line)[1];
      facts.sport = /sport\s+(\w+)/.exec(line)[1];
    } else if (kw === "formation" || kw === "set") facts.formation = words[1];
    else if (kw === "defense") facts.defense = words[1];
    else if (kw === "player") facts.players.push(words[1]);
    else if (MOVE_KEYWORDS.has(kw)) facts.moves.push(`${kw} ${words[1]}`);
  }
  return facts;
}
function assertMatchesSource(s, facts, drawnMoves, drawnPlayers) {
  const problems = [];
  if (facts.sport !== s.sport) problems.push(`source sport is ${facts.sport}`);
  const a = [...facts.moves].sort().join(" | ");
  const b = [...drawnMoves].sort().join(" | ");
  if (a !== b) problems.push(`actions differ:\n  source: ${a}\n  drawn:  ${b}`);
  for (const id of facts.players) if (!drawnPlayers.includes(id)) problems.push(`source player ${id} is not drawn`);
  return problems;
}

// ─── Collision check ────────────────────────────────────────────────────
function check(s) {
  const n = { textText: 0, textToken: 0, textLine: 0, tokenToken: 0, lineToken: 0, headHead: 0, edge: 0, crossings: 0 };
  const detail = [];
  const pad = 1.5;
  const texts = s.texts;
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++)
      if (boxesOverlap(texts[i], texts[j], pad)) { n.textText++; detail.push(`text "${texts[i].id}" × "${texts[j].id}"`); }
  for (const t of texts) {
    for (const k of s.tokens) {
      if (t.kind === "inlabel" && t.owner === k.id) continue;
      if (boxCircle(t, k) < k.r + (t.kind === "marking" ? 0 : pad)) { n.textToken++; detail.push(`text "${t.id}" × token ${k.id}`); }
    }
    for (const ln of s.lines) {
      let hit = false;
      for (let i = 1; i < ln.pts.length && !hit; i++) hit = segHitsBox(ln.pts[i - 1], ln.pts[i], t, ln.pad + pad);
      for (const h of ln.heads) hit = hit || segHitsBox(h.a, h.b, t, pad) || segHitsBox(h.a, h.tip, t, pad) || segHitsBox(h.b, h.tip, t, pad);
      if (hit) { n.textLine++; detail.push(`text "${t.id}" × line ${ln.id}`); }
    }
    if (t.x0 < 4 || t.y0 < 4 || t.x1 > W - 4 || t.y1 > s.H - 4) { n.edge++; detail.push(`text "${t.id}" at the canvas edge`); }
  }
  for (let i = 0; i < s.tokens.length; i++) {
    const a = s.tokens[i];
    if (a.x - a.r < s.panel.x - BAND + 2 || a.x + a.r > s.panel.x + FW + BAND - 2) { n.edge++; detail.push(`token ${a.id} off the surface`); }
    for (let j = i + 1; j < s.tokens.length; j++) {
      const b = s.tokens[j];
      if (b.id === `${a.id}:ball` || a.id === `${b.id}:ball`) continue; // a ball glyph sits beside its carrier by design
      if (dist(a, b) < a.r + b.r + 2) { n.tokenToken++; detail.push(`token ${a.id} × ${b.id} (${dist(a, b).toFixed(1)} px)`); }
    }
  }
  for (const ln of s.lines) {
    for (const k of s.tokens) {
      // a line leaves its own player's token edge: there it only fails if it enters the token
      const own = k.id === ln.owner || k.id === `${ln.owner}:ball`;
      const clear = own ? k.r : k.r + ln.pad + 1.5;
      let hit = false;
      for (let i = 1; i < ln.pts.length && !hit; i++) hit = segDist(k, ln.pts[i - 1], ln.pts[i]) < clear;
      for (const h of ln.heads) hit = hit || segDist(k, h.a, h.b) < k.r + 1.5 || segDist(k, h.a, h.tip) < k.r + 1.5 || segDist(k, h.b, h.tip) < k.r + 1.5;
      if (hit) { n.lineToken++; detail.push(`line ${ln.id} × token ${k.id}`); }
    }
  }
  const allHeads = s.lines.flatMap((ln) => ln.heads.map((h) => ({ ...h, id: ln.id })));
  for (let i = 0; i < allHeads.length; i++)
    for (let j = i + 1; j < allHeads.length; j++) {
      const a = allHeads[i], b = allHeads[j];
      const ca = { x: (a.a.x + a.b.x + a.tip.x) / 3, y: (a.a.y + a.b.y + a.tip.y) / 3 };
      const cb = { x: (b.a.x + b.b.x + b.tip.x) / 3, y: (b.a.y + b.b.y + b.tip.y) / 3 };
      if (dist(ca, cb) < 14) { n.headHead++; detail.push(`terminators of ${a.id} and ${b.id} touch`); }
    }
  const crossings = [];
  for (let i = 0; i < s.lines.length; i++)
    for (let j = i + 1; j < s.lines.length; j++) {
      const A = s.lines[i].pts, B = s.lines[j].pts;
      let crossed = false;
      for (let p = 1; p < A.length && !crossed; p++)
        for (let q = 1; q < B.length && !crossed; q++) crossed = segsCross(A[p - 1], A[p], B[q - 1], B[q]);
      if (crossed) crossings.push(`${s.lines[i].id} × ${s.lines[j].id}`);
    }
  n.crossings = crossings.length;
  return { n, detail, crossings };
}

// ════════════════════════════════════════════════════════════════════════
// FOOTBALL — yards. x lateral from the ball (+ = offense's right), y depth
// from the line of scrimmage (+ = downfield). Downfield is up the page.
// ════════════════════════════════════════════════════════════════════════
function drawFootball() {
  const s = sheet("football");
  const facts = sourceFacts("football");
  const HALF = 160 / 6; // 53⅓ yd field → ±26.67 yd from the middle
  const S = FW / (2 * HALF); // px per yard
  const V_TOP = 20.5, V_BOT = -8.5;
  const FH = (V_TOP - V_BOT) * S;
  const pnl = panel(s, { h: FH, top: false, fill: C.turf, surround: C.turfSurround, line: C.marking });
  const P = (u, v) => ({ x: FX0 + (u + HALF) * S, y: pnl.y + (V_TOP - v) * S });
  const X = (u) => FX0 + (u + HALF) * S;
  const Y = (v) => pnl.y + (V_TOP - v) * S;

  header(s, facts.title, "Spread 2×2 against a 4-3 Cover 2 shell  ·  2nd & 7, ball on own 35  ·  college hash marks");

  // mowing stripes, five yards wide, between the yard lines
  for (let v = -10; v < V_TOP; v += 5) {
    if (Math.round(v / 5) % 2 === 0) continue;
    const y0 = Math.max(Y(v + 5), pnl.y), y1 = Math.min(Y(v), pnl.y + FH);
    if (y1 > y0) s.layer.surface.push(`<rect x="${FX0}" y="${r2(y0)}" width="${FW}" height="${r2(y1 - y0)}" fill="${C.turfStripe}"/>`);
  }
  const mk = [];
  // yard lines every 5 yd; the line of scrimmage (the 35) is heavier
  for (let v = -5; v <= V_TOP; v += 5) {
    if (v === 0) continue;
    mk.push(`<path d="M${FX0} ${r2(Y(v))}L${FX0 + FW} ${r2(Y(v))}" stroke="${C.marking}" stroke-opacity="0.78" stroke-width="1.6"/>`);
  }
  // hash marks (60 ft from each sideline = ±6.67 yd) and sideline ticks, every yard, 2 ft long
  const HASH = 20 / 3, TICK = 2 / 3;
  for (let v = Math.ceil(V_BOT); v <= Math.floor(V_TOP); v++) {
    if (v % 5 === 0) continue;
    for (const sgn of [-1, 1]) {
      mk.push(`<path d="M${r2(X(sgn * HASH - TICK / 2))} ${r2(Y(v))}L${r2(X(sgn * HASH + TICK / 2))} ${r2(Y(v))}" stroke="${C.marking}" stroke-opacity="0.78" stroke-width="1.4"/>`);
      const edge = sgn * (HALF - 0.11);
      mk.push(`<path d="M${r2(X(edge))} ${r2(Y(v))}L${r2(X(edge - sgn * TICK))} ${r2(Y(v))}" stroke="${C.marking}" stroke-opacity="0.78" stroke-width="1.4"/>`);
    }
  }
  mk.push(`<path d="M${FX0} ${r2(Y(0))}L${FX0 + FW} ${r2(Y(0))}" stroke="${C.marking}" stroke-width="2.6"/>`);
  s.layer.surface.push(...mk);
  pnl.boundary();
  // yard numbers: 6 ft tall, tops 9 yd from the sideline, tops facing the middle of the field
  const numSize = (2 * S) / 0.72;
  for (const [v, label] of [[-5, "30"], [5, "40"], [15, "50"]]) {
    for (const sgn of [-1, 1]) {
      text(s, "surface", X(sgn * (HALF - 8)), Y(v), label, { size: r2(numSize), weight: 700, fill: C.marking, opacity: 0.5, anchor: "middle", rotate: sgn < 0 ? 90 : -90, kind: "marking", id: `yard ${label} ${sgn < 0 ? "L" : "R"}` });
    }
  }

  // coverage: two deep halves
  for (const sgn of [-1, 1]) {
    const c = P(sgn * 13.4, 16.3);
    s.layer.zones.push(`<ellipse cx="${r2(c.x)}" cy="${r2(c.y)}" rx="${r2(12 * S)}" ry="${r2(4.1 * S)}" fill="${C.paper}" fill-opacity="0.13" stroke="${C.ink}" stroke-opacity="0.45" stroke-width="1.2" stroke-dasharray="5 4"/>`);
  }

  // players
  const OL_Y = -0.85;
  const offenseRoster = [
    ["LT", -3.2, OL_Y, "T"], ["LG", -1.6, OL_Y, "G"], ["C", 0, OL_Y, "C", "square"], ["RG", 1.6, OL_Y, "G"], ["RT", 3.2, OL_Y, "T"],
    ["X", -16.5, OL_Y, "X"], ["H", -9.8, -1.85, "H"], ["Y", 9.8, -1.85, "Y"], ["Z", 16.5, OL_Y, "Z"],
    ["QB", 0, -5.3, "QB"], ["RB", 2.5, -5.3, "RB"],
  ];
  const defenseRoster = [
    ["DE_W", -4.6, 2.4, "E"], ["DT_W", -2.2, 2.4, "T"], ["DT_S", 0.8, 2.4, "T"], ["DE_S", 4.6, 2.4, "E"],
    ["WLB", -5.2, 6.1, "W"], ["MLB", 0, 6.6, "M"], ["SLB", 5.2, 6.1, "S"],
    ["LCB", -17, 7.3, "C"], ["RCB", 17, 7.3, "C"], ["FS", -9, 13.5, "F"], ["SS", 9, 13.5, "$"],
  ];
  const at = Object.fromEntries([...offenseRoster, ...defenseRoster].map(([id, u, v]) => [id, { u, v }]));
  const px = (id) => P(at[id].u, at[id].v);

  const drawn = [];
  const route = (id, yards, action = "route") => {
    move(s, { id: `${action} ${id}`, owner: id, sport: "football", action, pts: yards.map(([u, v]) => P(u, v)), startGap: L.tokenR + 2 });
    drawn.push(`${action} ${id}`);
  };
  route("X", [[-16.5, OL_Y], [-16.5, 5], [-15.55, 3.95]]);
  route("Z", [[16.5, OL_Y], [16.5, 5], [15.55, 3.95]]);
  route("H", [[-9.8, -1.85], [-9.8, 10], [-15.8, 16.5]]);
  route("Y", [[9.8, -1.85], [9.8, 10], [15.8, 16.5]]);
  move(s, { id: "route RB", owner: "RB", sport: "football", action: "route", pts: quad(P(2.5, -5.3), P(5.0, 0.9), P(8.4, 0.9)), startGap: L.tokenR + 2 });
  drawn.push("route RB");
  // blocks: T-bars stop short of the rusher; the double team aims at his two shoulders
  const block = (id, target, shoulder = 0) => {
    const tp = P(at[target].u + shoulder, at[target].v);
    move(s, { id: `block ${id}`, owner: id, sport: "football", action: "block", pts: [px(id), tp], startGap: L.tokenR + 2, endGap: L.xHalf + 6, teeHalf: 6 });
    drawn.push(`block ${id}`);
  };
  block("LT", "DE_W");
  block("LG", "DT_W");
  block("C", "DT_S", -0.5);
  block("RG", "DT_S", 0.5);
  block("RT", "DE_S");

  for (const [id, u, v, label, shape] of offenseRoster) offense(s, id, P(u, v), label, shape);
  for (const [id, u, v, tag] of defenseRoster) defender(s, id, P(u, v), tag);
  // no separate ball glyph: the square center is the ball's position (AFCA convention)

  placeFloating(s);
  // zone labels, placed in free space inside each deep half
  for (const sgn of [-1, 1]) {
    const cands = [[sgn * 20.5, 18.6], [sgn * 20, 14.6], [sgn * 6.5, 18.6], [sgn * 13.4, 19.2]];
    let ok = false;
    for (const [u, v] of cands) {
      const q = P(u, v);
      const w = textWidth("DEEP HALF", T.zone.size, T.zone.weight, T.zone.tracking);
      const box = { x0: q.x - w / 2, y0: q.y - 7.2, x1: q.x + w / 2, y1: q.y + 2 };
      if (!floatingClear(s, box, null)) continue;
      text(s, "text", q.x, q.y, "DEEP HALF", { ...T.zone, fill: C.ink, opacity: 0.72, anchor: "middle", kind: "zone", id: `zone ${sgn}` });
      ok = true;
      break;
    }
    if (!ok) throw new Error("football: no room for a zone label");
  }

  legend(s, pnl.y + FH + 20, [["offense", "Offense"], ["defense", "Defense"], ["solid", "Route"], ["tee", "Block"], ["zone", "Deep coverage zone"]]);
  const problems = assertMatchesSource(s, facts, drawn, []);
  const svg = documentSvg(s, facts.title, "American football play diagram: Smash concept from a spread 2x2 formation against a 4-3 Cover 2 defense. The outside receivers X and Z run 5-yard hitches and the slots H and Y run corner routes, putting each cornerback in a high-low bind under the deep-half safeties; the running back releases to the flat and the offensive line blocks the four-man rush, with the center and right guard double-teaming the nose tackle.");
  return { s, svg, problems };
}

// ════════════════════════════════════════════════════════════════════════
// BASKETBALL — feet, NBA half court. x lateral from the middle (±25 = the
// sidelines), y from the baseline (0) toward the midcourt line (47); drawn to
// 41 ft. The basket is at the top of the page.
// ════════════════════════════════════════════════════════════════════════
function drawBasketball() {
  const s = sheet("basketball");
  const facts = sourceFacts("basketball");
  const S = FW / 50;
  const V_BOT = 41; // cropped 6 ft short of midcourt; the court continues past the open bottom edge
  const FH = V_BOT * S;
  const pnl = panel(s, { h: FH, top: true, fill: C.maple, surround: C.mapleSurround, line: C.courtLine });
  const P = (u, v) => ({ x: FX0 + (u + 25) * S, y: pnl.y + v * S });
  const X = (u) => FX0 + (u + 25) * S;
  const Y = (v) => pnl.y + v * S;
  header(s, facts.title, "Horns set against man-to-man defense  ·  NBA half court (50 × 47 ft), shown to 41 ft");

  const line = (attrs, dash = "") => `<path ${attrs} stroke="${C.courtLine}" stroke-width="2" fill="none"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  const mk = [];
  // painted lane: 16 ft wide, free-throw line 19 ft from the baseline (15 ft from the backboard)
  mk.push(`<rect x="${r2(X(-8))}" y="${r2(Y(0))}" width="${r2(16 * S)}" height="${r2(19 * S)}" fill="${C.paint}" stroke="${C.courtLine}" stroke-width="2"/>`);
  // lane-space marks: the block at 7–8 ft, marks at 11 and 14 ft
  for (const sgn of [-1, 1]) {
    const edge = X(sgn * 8);
    mk.push(`<rect x="${r2(sgn < 0 ? edge - 0.67 * S : edge)}" y="${r2(Y(7))}" width="${r2(0.67 * S)}" height="${r2(S)}" fill="${C.courtLine}"/>`);
    for (const v of [11, 14]) mk.push(line(`d="M${r2(edge)} ${r2(Y(v))}L${r2(edge + sgn * 0.5 * S)} ${r2(Y(v))}"`));
    // 28-ft hash on the sideline, 3 ft into the court
    mk.push(line(`d="M${r2(X(sgn * 25))} ${r2(Y(28))}L${r2(X(sgn * 22))} ${r2(Y(28))}"`));
  }
  // free-throw circle, r = 6 ft: dashed inside the lane, solid outside
  mk.push(line(`d="M${r2(X(-6))} ${r2(Y(19))}A${6 * S} ${6 * S} 0 0 1 ${r2(X(6))} ${r2(Y(19))}"`, "9 7"));
  mk.push(line(`d="M${r2(X(-6))} ${r2(Y(19))}A${6 * S} ${6 * S} 0 0 0 ${r2(X(6))} ${r2(Y(19))}"`));
  // three-point line: straight corners 22 ft from the basket, arc r = 23.75 ft
  const meet = 5.25 + Math.sqrt(23.75 ** 2 - 22 ** 2);
  mk.push(line(`d="M${r2(X(-22))} ${r2(Y(0))}L${r2(X(-22))} ${r2(Y(meet))}A${r2(23.75 * S)} ${r2(23.75 * S)} 0 0 0 ${r2(X(22))} ${r2(Y(meet))}L${r2(X(22))} ${r2(Y(0))}"`));
  // restricted area, r = 4 ft from the basket
  mk.push(line(`d="M${r2(X(-4))} ${r2(Y(4))}L${r2(X(-4))} ${r2(Y(5.25))}A${4 * S} ${4 * S} 0 0 0 ${r2(X(4))} ${r2(Y(5.25))}L${r2(X(4))} ${r2(Y(4))}"`));
  s.layer.surface.push(...mk);
  pnl.boundary();
  // backboard 6 ft wide, 4 ft in from the baseline; rim 18 in across, centre 5.25 ft from the baseline
  s.layer.surface.push(`<path d="M${r2(X(-3))} ${r2(Y(4))}L${r2(X(3))} ${r2(Y(4))}" stroke="${C.ink}" stroke-opacity="0.75" stroke-width="3.2"/>`);
  s.layer.surface.push(`<path d="M${r2(X(0))} ${r2(Y(4))}L${r2(X(0))} ${r2(Y(4.5))}" stroke="${C.rim}" stroke-width="2.4"/>`);
  s.layer.surface.push(`<circle cx="${r2(X(0))}" cy="${r2(Y(5.25))}" r="${r2(0.75 * S)}" fill="none" stroke="${C.rim}" stroke-width="2.6"/>`);

  // Horns: 1 at the top, 4 and 5 at the elbows, 2 and 3 in the corners; man defense a step toward the basket
  const offenseRoster = [["1", 0, 31.5], ["2", -23.2, 3.4], ["3", 23.2, 3.4], ["4", -8, 19], ["5", 8, 19]];
  const defenseRoster = [["X1", 0, 28.3, "1"], ["X2", -20.6, 2.3, "2"], ["X3", 20.6, 2.3, "3"], ["X4", -6.6, 16.6, "4"], ["X5", 6.6, 16.6, "5"]];
  const drawn = [];
  const act = (action, owner, pts, o = {}) => {
    move(s, { id: `${action} ${owner}`, owner, sport: "basketball", action, pts, ...o });
    drawn.push(`${action} ${owner}`);
  };
  // 5 screens X1's right shoulder
  act("screen", "5", [P(8, 19), P(2.9, 27.3)], { startGap: L.tokenR + 2 });
  // 1 comes off the screen to the right wing
  act("dribble", "1", quad(P(0, 31.5), P(8, 33), P(14, 26.5)), { startGap: L.tokenR + 2 });
  // 5 rolls from the screen spot to the rim
  act("cut", "5", [P(2.2, 26.1), P(0.6, 9.4)]);
  // 4 pops to the left slot
  act("cut", "4", [P(-8, 19), P(-11.8, 27.6)], { startGap: L.tokenR + 2 });
  // X2 leaves the corner to tag the roller
  act("cut", "X2", [P(-20.6, 2.3), P(-3.9, 8.1)], { startGap: L.xHalf + 5, color: C.defense });
  // the skip pass from the wing to 2 in the far corner
  act("pass", "1", [P(14, 26.5), P(-23.2, 3.4)], { startGap: 9, endGap: L.tokenR + 5 });

  for (const [id, u, v] of offenseRoster) offense(s, id, P(u, v));
  for (const [id, u, v, tag] of defenseRoster) defender(s, id, P(u, v), tag);
  ball(s, "1", P(0, 31.5), C.ballBasketball, C.ink);
  placeFloating(s);

  legend(s, pnl.y + FH + 20, [["offense", "Offense"], ["defense", "Defense"], ["solid", "Cut (player)"], ["dashed", "Pass (ball)"], ["wavy", "Dribble"], ["tee", "Screen"], ["ballBasketball", "Ball"]]);
  const problems = assertMatchesSource(s, facts, drawn, [...offenseRoster, ...defenseRoster].map((r) => r[0]));
  const svg = documentSvg(s, facts.title, "Basketball half-court play diagram: Horns pick-and-roll. From the Horns set, 5 sets a ball screen for 1 and rolls to the rim while 4 pops to the left slot; 1 dribbles off the screen to the right wing. When X2 leaves the left corner to tag the roller, 1 throws the skip pass to 2 in that corner.");
  return { s, svg, problems };
}

// ════════════════════════════════════════════════════════════════════════
// SOCCER — metres, IFAB pitch 105 × 68. l along the length (0 = own goal
// line, 105 = the goal attacked), w across the width (0 = the attacking
// team's left touchline). The attacking half is drawn with the goal at the
// top of the page.
// ════════════════════════════════════════════════════════════════════════
function drawSoccer() {
  const s = sheet("soccer");
  const facts = sourceFacts("soccer");
  const S = FW / 68;
  const L_BOT = 50.5;
  const FH = (105 - L_BOT) * S;
  const pnl = panel(s, { h: FH, top: true, fill: C.turf, surround: C.turfSurround, line: C.marking });
  // DSL coordinates are (l, w): `player 9 o at 80,37` → P(80, 37)
  const P = (l, w) => ({ x: FX0 + w * S, y: pnl.y + (105 - l) * S });
  header(s, facts.title, "Attacking half against a 4-4-2 low block  ·  IFAB pitch, 105 × 68 m");

  // mowing stripes, 5.25 m deep, counted from the goal line
  for (let i = 0; i * 5.25 < 105 - L_BOT; i++) {
    if (i % 2 === 0) continue;
    const y0 = pnl.y + i * 5.25 * S, y1 = Math.min(pnl.y + FH, y0 + 5.25 * S);
    s.layer.surface.push(`<rect x="${FX0}" y="${r2(y0)}" width="${FW}" height="${r2(y1 - y0)}" fill="${C.turfStripe}"/>`);
  }
  const white = (dd, extra = "") => `<path d="${dd}" stroke="${C.marking}" stroke-opacity="0.85" stroke-width="2" fill="none"${extra}/>`;
  const pt = (l, w) => { const q = P(l, w); return `${r2(q.x)} ${r2(q.y)}`; };
  const mk = [];
  mk.push(white(`M${pt(52.5, 0)}L${pt(52.5, 68)}`)); // halfway line
  mk.push(`<g clip-path="url(#soccer-surface)">${white(`M${pt(52.5, 34 - 9.15)}A${r2(9.15 * S)} ${r2(9.15 * S)} 0 1 1 ${pt(52.5, 34 + 9.15)}A${r2(9.15 * S)} ${r2(9.15 * S)} 0 1 1 ${pt(52.5, 34 - 9.15)}`)}</g>`);
  mk.push(white(`M${pt(105, 13.84)}L${pt(88.5, 13.84)}L${pt(88.5, 54.16)}L${pt(105, 54.16)}`)); // penalty area 16.5 × 40.32
  mk.push(white(`M${pt(105, 24.84)}L${pt(99.5, 24.84)}L${pt(99.5, 43.16)}L${pt(105, 43.16)}`)); // goal area 5.5 × 18.32
  const arcHalf = Math.sqrt(9.15 ** 2 - 5.5 ** 2);
  mk.push(white(`M${pt(88.5, 34 - arcHalf)}A${r2(9.15 * S)} ${r2(9.15 * S)} 0 0 0 ${pt(88.5, 34 + arcHalf)}`)); // penalty arc
  mk.push(white(`M${pt(105, 1)}A${r2(S)} ${r2(S)} 0 0 1 ${pt(104, 0)}`)); // corner arcs, r = 1 m
  mk.push(white(`M${pt(105, 67)}A${r2(S)} ${r2(S)} 0 0 0 ${pt(104, 68)}`));
  for (const [l, w] of [[94, 34], [52.5, 34]]) { const q = P(l, w); mk.push(`<circle cx="${r2(q.x)}" cy="${r2(q.y)}" r="2.6" fill="${C.marking}"/>`); }
  s.layer.surface.push(...mk);
  pnl.boundary();
  // goal, 7.32 m between the posts, net drawn in the band behind the goal line
  const gp = P(105, 30.34), gq = P(105, 37.66);
  s.layer.surface.push(`<rect x="${r2(gp.x)}" y="${r2(gp.y - 18)}" width="${r2(gq.x - gp.x)}" height="18" fill="${C.marking}" fill-opacity="0.22" stroke="${C.marking}" stroke-width="2"/>`);
  for (let k = 1; k < 6; k++) s.layer.surface.push(`<path d="M${r2(gp.x + ((gq.x - gp.x) * k) / 6)} ${r2(gp.y - 18)}L${r2(gp.x + ((gq.x - gp.x) * k) / 6)} ${r2(gp.y)}" stroke="${C.marking}" stroke-opacity="0.45" stroke-width="0.8"/>`);

  const team = [["6", 55, 34], ["8", 70, 24], ["10", 70, 46], ["9", 80, 37], ["11", 84, 5], ["7", 84, 63]];
  // the low-block preset: keeper, back four on 88 m, midfield four on 74 m, front two on 62 m
  const opponents = [[100, 34], [88, 12], [88, 27], [88, 41], [88, 56], [74, 14], [74, 28], [74, 40], [74, 54], [62, 28], [62, 40]];
  const drawn = [];
  const act = (action, owner, pts, o = {}) => {
    move(s, { id: `${action} ${owner} #${drawn.length}`, owner, sport: "soccer", action, pts, ...o });
    drawn.push(`${action} ${owner}`);
  };
  const meet = P(93, 32);
  act("dribble", "6", [P(55, 34), P(62, 34)], { startGap: L.tokenR + 2 });
  act("pass", "6", [P(62, 34), P(80, 37)], { startGap: 8, endGap: L.tokenR + 4 });
  // 8's run stops short of the meeting point so the ball's arrow owns it
  act("run", "8", [P(70, 24), meet], { startGap: L.tokenR + 2, endGap: 30 });
  act("pass", "9", [P(80, 37), meet], { startGap: L.tokenR + 2 });
  act("shot", "8", [meet, P(105, 30.8)], { startGap: 10, endGap: 2 });

  team.forEach(([id, l, w]) => offense(s, id, P(l, w)));
  opponents.forEach(([l, w], i) => defender(s, `X${i + 1}`, P(l, w)));
  ball(s, "6", P(55, 34), C.paper, C.ink);
  placeFloating(s);

  legend(s, pnl.y + FH + 20, [["offense", "Team"], ["defense", "Opponent"], ["solid", "Pass (ball)"], ["dashed", "Run (player)"], ["wavy", "Dribble"], ["double", "Shot"], ["ballSoccer", "Ball"]]);
  const problems = assertMatchesSource(s, facts, drawn, team.map((r) => r[0]));
  const svg = documentSvg(s, facts.title, "Soccer tactics diagram on the attacking half of an IFAB pitch: a third-man run against a 4-4-2 low block. 6 dribbles at the opponent's front two and passes into 9 between the lines; 8 runs beyond the back line and 9 plays the ball first time into his path; 8 shoots at the near post.");
  return { s, svg, problems };
}

// ─── Main ───────────────────────────────────────────────────────────────
let failed = false;
for (const draw of [drawFootball, drawBasketball, drawSoccer]) {
  const { s, svg, problems } = draw();
  writeFileSync(new URL(`${s.sport}/ideal.svg`, ROOT), svg + "\n");
  const { n, detail, crossings } = check(s);
  const collisions = n.textText + n.textToken + n.textLine + n.tokenToken + n.lineToken + n.headHead + n.edge;
  console.log(`${s.sport.padEnd(10)} ${W}×${Math.round(s.H)}  texts ${s.texts.length}, tokens ${s.tokens.length}, lines ${s.lines.length}  →  text×text ${n.textText}, text×token ${n.textToken}, text×line ${n.textLine}, token×token ${n.tokenToken}, line×token ${n.lineToken}, terminators ${n.headHead}, edge ${n.edge}; line crossings ${n.crossings}${crossings.length ? ` (${crossings.join("; ")})` : ""}`);
  for (const line of detail) console.log(`    ${line}`);
  for (const p of problems) console.log(`    source mismatch: ${p}`);
  if (collisions || problems.length) failed = true;
}
if (failed) process.exit(1);
