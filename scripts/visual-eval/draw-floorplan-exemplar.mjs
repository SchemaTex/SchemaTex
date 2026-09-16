#!/usr/bin/env node
/** Draws visual-eval/exemplars/floorplan/ideal.svg — the floor plan exemplar.
 *
 * All geometry is authored in metres on the same wall centre-line grid as the
 * exemplar's source.sx, projected to pixels once, and every text box is then
 * checked against every other text box, wall, fixture outline, door swing,
 * dimension line and the canvas edge. The script exits non-zero on any
 * collision.
 *
 *   node scripts/visual-eval/draw-floorplan-exemplar.mjs
 */
import { writeFileSync } from "node:fs";

const OUT = new URL("../../visual-eval/exemplars/floorplan/ideal.svg", import.meta.url);

// ─── Palette ────────────────────────────────────────────────────────────
const C = {
  graphite: "#1F2328", // wall poché, door leaves, titles, room names
  slate: "#55606C", // furniture and fixture outlines
  pencil: "#A3ABB4", // door swings, dimension/extension lines, lines beyond the cut plane
  mist: "#EDEFF2", // built-in surfaces: counters, vanity, bath, shower tray
  glazing: "#4F86B0", // glass in windows and the sliding door
  caption: "#6E7782", // areas, subtitle, scale captions
  paper: "#FFFFFF",
};
const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Projection ─────────────────────────────────────────────────────────
const K = 64; // px per metre
const OX = 118;
const OY = 180;
const W = 808;
const H = 910;
const X = (m) => +(OX + m * K).toFixed(2);
const Y = (m) => +(OY + m * K).toFixed(2);
const L = (m) => +(m * K).toFixed(2);

const EXT = 0.3;
const INT = 0.12;
const PLAN_W = 10;
const PLAN_H = 9.2;

// ─── Collision registry ─────────────────────────────────────────────────
const texts = []; // {id, x0, y0, x1, y1}
const segs = []; // {id, x1, y1, x2, y2}  (px)
const rects = []; // {id, x0, y0, x1, y1} (px) solid obstacles

const segM = (id, x1, y1, x2, y2) => segs.push({ id, x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2) });
const segP = (id, x1, y1, x2, y2) => segs.push({ id, x1, y1, x2, y2 });
const rectM = (id, x0, y0, x1, y1) => rects.push({ id, x0: X(x0), y0: Y(y0), x1: X(x1), y1: Y(y1) });

// Text width model: 0.56 em per glyph regular, 0.62 em semibold, plus tracking.
const textWidth = (s, fs, weight = 400, tracking = 0) =>
  [...s].length * fs * (weight >= 600 ? 0.62 : 0.56) + Math.max(0, [...s].length - 1) * tracking;

const out = [];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function text(id, x, y, s, { fs = 11, weight = 400, fill = C.graphite, anchor = "middle", tracking = 0, rotate = 0, cls = "" } = {}) {
  const w = textWidth(s, fs, weight, tracking);
  const asc = fs * 0.74;
  const desc = fs * 0.22;
  let x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  let box;
  if (rotate === -90) {
    // text runs bottom-to-top, centred on (x, y) along its length
    box = { x0: x - asc, y0: y - w / 2, x1: x + desc, y1: y + w / 2 };
  } else {
    box = { x0, y0: y - asc, x1: x0 + w, y1: y + desc };
  }
  texts.push({ id, ...box });
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-size="${fs}"`,
    weight !== 400 ? `font-weight="${weight}"` : "",
    `fill="${fill}"`,
    `text-anchor="${anchor}"`,
    tracking ? `letter-spacing="${tracking}"` : "",
    rotate ? `transform="rotate(${rotate} ${x} ${y})"` : "",
    cls ? `class="${cls}"` : "",
  ].filter(Boolean);
  out.push(`<text ${attrs.join(" ")}>${esc(s)}</text>`);
}

// ─── Rooms (wall centre-line rectangles, metres) ────────────────────────
const rooms = [
  { id: "living", name: "LIVING ROOM", x: 0, y: 0, w: 5.8, h: 4.4 },
  { id: "kitchen", name: "KITCHEN / DINING", x: 5.8, y: 0, w: 4.2, h: 4.4 },
  { id: "guest", name: "GUEST BEDROOM", x: 0, y: 4.4, w: 3.4, h: 4.8 },
  { id: "hall", name: "HALL", x: 3.4, y: 4.4, w: 2.4, h: 4.8 },
  { id: "bath", name: "BATHROOM", x: 5.8, y: 4.4, w: 2.2, h: 4.8 },
  { id: "utility", name: "UTILITY", x: 8.0, y: 4.4, w: 2.0, h: 4.8 },
];
const area = (r) => (r.w * r.h).toFixed(1);

// ─── Walls ──────────────────────────────────────────────────────────────
// Rectangles in metres; openings are punched afterwards with paper-coloured gaps.
const e = EXT / 2;
const i = INT / 2;
const wallRects = [
  // exterior ring
  [-e, -e, PLAN_W + e, e],
  [-e, PLAN_H - e, PLAN_W + e, PLAN_H + e],
  [-e, -e, e, PLAN_H + e],
  [PLAN_W - e, -e, PLAN_W + e, PLAN_H + e],
  // interior partitions
  [5.8 - i, e, 5.8 + i, 4.4], // living | kitchen
  [e, 4.4 - i, PLAN_W - e, 4.4 + i], // front rooms | back rooms
  [3.4 - i, 4.4, 3.4 + i, PLAN_H - e], // guest | hall
  [5.8 - i, 4.4, 5.8 + i, PLAN_H - e], // hall | bath
  [8.0 - i, 4.4, 8.0 + i, PLAN_H - e], // bath | utility
];

// ─── Openings ───────────────────────────────────────────────────────────
// wall: "h" (runs along x at y=at) or "v" (runs along y at x=at); lo..hi along the wall.
const openings = [
  { id: "front", kind: "door", wall: "h", at: 9.2, t: EXT, lo: 3.65, hi: 4.6, hinge: "lo", into: -1, exterior: true },
  { id: "living-hall", kind: "double", wall: "h", at: 4.4, t: INT, lo: 3.9, hi: 5.3, into: -1 },
  { id: "guest-hall", kind: "door", wall: "v", at: 3.4, t: INT, lo: 5.3, hi: 6.15, hinge: "lo", into: -1 },
  { id: "bath-hall", kind: "pocket", wall: "v", at: 5.8, t: INT, lo: 4.7, hi: 5.5 },
  { id: "utility-kitchen", kind: "door", wall: "h", at: 4.4, t: INT, lo: 8.4, hi: 9.2, hinge: "hi", into: 1 },
  { id: "utility-side", kind: "door", wall: "v", at: 10, t: EXT, lo: 7.41, hi: 8.31, hinge: "hi", into: -1, exterior: true },
  { id: "patio", kind: "sliding", wall: "h", at: 0, t: EXT, lo: 6.1, hi: 8.3 },
  { id: "living-kitchen", kind: "opening", wall: "v", at: 5.8, t: INT, lo: 1.18, hi: 2.78 },
  { id: "w-living-n", kind: "window", wall: "h", at: 0, t: EXT, lo: 1.32, hi: 3.32 },
  { id: "w-living-w", kind: "window", wall: "v", at: 0, t: EXT, lo: 1.4, hi: 3.0 },
  { id: "w-kitchen-e", kind: "window", wall: "v", at: 10, t: EXT, lo: 0.94, hi: 2.14 },
  { id: "w-guest-w", kind: "window", wall: "v", at: 0, t: EXT, lo: 5.86, hi: 7.26 },
  { id: "w-guest-s", kind: "window", wall: "h", at: 9.2, t: EXT, lo: 1.0, hi: 2.4 },
  { id: "w-bath-s", kind: "window", wall: "h", at: 9.2, t: EXT, lo: 6.23, hi: 7.13 },
];

// ─── SVG assembly ───────────────────────────────────────────────────────
const g = (cls, body) => `<g class="${cls}">${body}</g>`;
const r = (x0, y0, x1, y1, a = "") =>
  `<rect x="${X(Math.min(x0, x1))}" y="${Y(Math.min(y0, y1))}" width="${L(Math.abs(x1 - x0))}" height="${L(Math.abs(y1 - y0))}" ${a}/>`;
const ln = (x1, y1, x2, y2, a = "") => `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" ${a}/>`;
const lnP = (x1, y1, x2, y2, a = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${a}/>`;

out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}" role="img" aria-labelledby="t d">`);
out.push(`<title id="t">Linden House — Ground Floor</title>`);
out.push(`<desc id="d">Ground-floor plan of a two-storey house, 10.00 by 9.20 metres to wall centre-lines: living room, kitchen and dining, guest bedroom, hall with stair, bathroom and utility room, 6 rooms totalling 92.0 square metres.</desc>`);
out.push(`<rect width="${W}" height="${H}" fill="${C.paper}"/>`);

// Title block
text("title", 40, 50, "Linden House — Ground Floor", { fs: 20, weight: 600, anchor: "start" });
text("subtitle", 40, 72, "Two-storey house · 6 rooms · 92.0 m² · dimensions in metres to wall centre-lines", { fs: 12, fill: C.caption, anchor: "start" });
out.push(lnP(40, 88, W - 40, 88, `stroke="${C.pencil}" stroke-width="0.6"`));

// ─── Furniture & fixtures (drawn under the walls) ───────────────────────
const F = [];
const S = `stroke="${C.slate}" stroke-width="1.1" fill="${C.paper}"`;
const SN = `stroke="${C.slate}" stroke-width="1.1" fill="none"`;
const SM = `stroke="${C.slate}" stroke-width="1.1" fill="${C.mist}"`;
const THIN = `stroke="${C.slate}" stroke-width="0.8" fill="none"`;
const rr = (x0, y0, x1, y1, rad, a) =>
  `<rect x="${X(x0)}" y="${Y(y0)}" width="${L(x1 - x0)}" height="${L(y1 - y0)}" rx="${rad}" ${a}/>`;

// Living room — rug (underlay), sofa facing north, two armchairs facing south, coffee table, bookshelf
F.push(rr(0.9, 1.0, 3.7, 3.0, 2, `stroke="${C.pencil}" stroke-width="1" fill="none"`));
F.push(rr(1.0, 1.1, 3.6, 2.9, 1, `stroke="${C.pencil}" stroke-width="0.6" fill="none"`));
segM("rug", 0.9, 1.0, 3.7, 1.0); segM("rug", 3.7, 1.0, 3.7, 3.0); segM("rug", 0.9, 3.0, 3.7, 3.0); segM("rug", 0.9, 1.0, 0.9, 3.0);
// sofa (back on the south side)
F.push(rr(1.2, 3.3, 3.4, 4.2, 4, S));
F.push(ln(1.38, 3.3, 1.38, 4.02, THIN.replace('fill="none"', "")), ln(3.22, 3.3, 3.22, 4.02, THIN));
F.push(ln(1.38, 4.02, 3.22, 4.02, THIN));
F.push(ln(1.99, 3.3, 1.99, 4.02, THIN), ln(2.61, 3.3, 2.61, 4.02, THIN));
rectM("sofa", 1.2, 3.3, 3.4, 4.2);
// armchairs (back on the north side)
for (const x0 of [1.0, 2.8]) {
  F.push(rr(x0, 0.5, x0 + 0.8, 1.3, 4, S));
  F.push(ln(x0 + 0.14, 0.68, x0 + 0.14, 1.3, THIN), ln(x0 + 0.66, 0.68, x0 + 0.66, 1.3, THIN), ln(x0 + 0.14, 0.68, x0 + 0.66, 0.68, THIN));
  rectM("armchair", x0, 0.5, x0 + 0.8, 1.3);
}
F.push(rr(1.8, 1.9, 2.8, 2.5, 3, S));
rectM("coffee-table", 1.8, 1.9, 2.8, 2.5);
F.push(r(0.15, 3.05, 0.5, 4.25, S));
for (const yy of [3.45, 3.85]) F.push(ln(0.15, yy, 0.5, yy, THIN));
rectM("bookshelf", 0.15, 3.05, 0.5, 4.25);

// Kitchen — counter run on the east wall with sink under the window, dishwasher, hob; fridge; dining table for four
F.push(r(9.35, 0.9, 9.85, 3.9, SM));
rectM("counter", 9.35, 0.9, 9.85, 3.9);
// double-bowl sink, rotated along the counter
F.push(rr(9.42, 1.16, 9.78, 1.52, 3, S), rr(9.42, 1.58, 9.78, 1.92, 3, S));
F.push(`<circle cx="${X(9.8)}" cy="${Y(1.55)}" r="1.8" fill="${C.slate}"/>`);
// dishwasher under the counter (hidden line) + tag
F.push(r(9.38, 2.02, 9.82, 2.58, `stroke="${C.slate}" stroke-width="0.8" stroke-dasharray="3 2" fill="none"`));
// hob with four burners
F.push(r(9.38, 2.97, 9.82, 3.53, S));
for (const [cx, cy, rad] of [[9.49, 3.1, 0.07], [9.49, 3.39, 0.09], [9.71, 3.1, 0.09], [9.71, 3.39, 0.07]]) {
  F.push(`<circle cx="${X(cx)}" cy="${Y(cy)}" r="${L(rad)}" ${THIN}/>`);
}
// fridge
F.push(r(9.25, 0.15, 9.85, 0.85, S));
rectM("fridge", 9.25, 0.15, 9.85, 0.85);
// dining table + four chairs
F.push(rr(6.7, 2.3, 8.3, 3.2, 2, S));
rectM("dining-table", 6.7, 2.3, 8.3, 3.2);
for (const cx of [7.1, 7.9]) {
  F.push(rr(cx - 0.21, 1.83, cx + 0.21, 2.25, 3, S), ln(cx - 0.21, 1.9, cx + 0.21, 1.9, THIN));
  F.push(rr(cx - 0.21, 3.25, cx + 0.21, 3.67, 3, S), ln(cx - 0.21, 3.6, cx + 0.21, 3.6, THIN));
  rectM("chair", cx - 0.21, 1.83, cx + 0.21, 2.25);
  rectM("chair", cx - 0.21, 3.25, cx + 0.21, 3.67);
}

// Guest bedroom — double bed with two nightstands, wardrobe
F.push(rr(0.65, 4.55, 2.05, 6.55, 3, S));
F.push(rr(0.75, 4.65, 1.3, 4.95, 3, S), rr(1.4, 4.65, 1.95, 4.95, 3, S));
F.push(ln(0.65, 5.15, 2.05, 5.15, THIN));
F.push(`<path d="M ${X(0.65)} ${Y(5.45)} L ${X(2.05)} ${Y(5.3)}" ${THIN}/>`);
rectM("bed", 0.65, 4.55, 2.05, 6.55);
for (const x0 of [0.17, 2.1]) {
  F.push(r(x0, 4.6, x0 + 0.45, 5.05, S), `<circle cx="${X(x0 + 0.225)}" cy="${Y(4.825)}" r="${L(0.08)}" ${THIN}/>`);
  rectM("nightstand", x0, 4.6, x0 + 0.45, 5.05);
}
F.push(r(2.72, 6.8, 3.32, 8.6, S));
F.push(ln(3.02, 6.86, 3.02, 8.54, THIN));
for (let yy = 7.0; yy <= 8.45; yy += 0.15) F.push(ln(2.86, yy + 0.03, 3.18, yy - 0.03, THIN));
rectM("wardrobe", 2.72, 6.8, 3.32, 8.6);

// Bathroom — vanity with two basins, toilet on the east wall, shower tray, bath under the window
F.push(r(6.55, 4.52, 7.75, 5.07, SM));
for (const cx of [6.85, 7.45]) {
  F.push(`<ellipse cx="${X(cx)}" cy="${Y(4.8)}" rx="${L(0.17)}" ry="${L(0.12)}" ${S}/>`);
  F.push(`<circle cx="${X(cx)}" cy="${Y(4.6)}" r="1.6" fill="${C.slate}"/>`);
}
rectM("vanity", 6.55, 4.52, 7.75, 5.07);
// toilet: tank against the east wall, bowl facing west
F.push(rr(7.7, 5.52, 7.92, 5.98, 2, S));
F.push(`<path d="M ${X(7.7)} ${Y(5.59)} L ${X(7.46)} ${Y(5.59)} A ${L(0.16)} ${L(0.16)} 0 0 0 ${X(7.46)} ${Y(5.91)} L ${X(7.7)} ${Y(5.91)} Z" ${S}/>`);
F.push(`<ellipse cx="${X(7.5)}" cy="${Y(5.75)}" rx="${L(0.13)}" ry="${L(0.1)}" ${THIN}/>`);
rectM("toilet", 7.3, 5.52, 7.92, 5.98);
// shower tray
F.push(r(7.0, 7.1, 7.9, 8.0, SM));
F.push(ln(7.0, 7.1, 7.9, 8.0, `stroke="${C.pencil}" stroke-width="0.8"`), ln(7.9, 7.1, 7.0, 8.0, `stroke="${C.pencil}" stroke-width="0.8"`));
F.push(`<circle cx="${X(7.45)}" cy="${Y(7.55)}" r="${L(0.045)}" ${S}/>`);
rectM("shower", 7.0, 7.1, 7.9, 8.0);
// bath
F.push(r(5.95, 8.3, 7.65, 9.05, SM));
F.push(rr(6.05, 8.4, 7.55, 8.95, 12, S));
F.push(`<circle cx="${X(7.36)}" cy="${Y(8.675)}" r="${L(0.04)}" ${THIN}/>`);
rectM("bath", 5.95, 8.3, 7.65, 9.05);

// Utility — washer, dryer, counter
for (const [y0, id] of [[5.3, "washer"], [6.0, "dryer"]]) {
  F.push(r(8.12, y0, 8.72, y0 + 0.6, S), `<circle cx="${X(8.42)}" cy="${Y(y0 + 0.3)}" r="${L(0.2)}" ${THIN}/>`);
  rectM(id, 8.12, y0, 8.72, y0 + 0.6);
}
F.push(r(8.06, 6.75, 8.77, 7.95, SM));
rectM("utility-counter", 8.06, 6.75, 8.77, 7.95);

// Hall — straight stair rising north to south, cut by a break line
const STAIR = { x0: 4.8, x1: 5.7, y0: 5.75, y1: 9.05 };
const tread = 0.275;
const breakAt = (x) => 7.62 - ((x - STAIR.x0) / (STAIR.x1 - STAIR.x0)) * 0.34; // y of the break line at x
F.push(r(STAIR.x0, STAIR.y0, STAIR.x1, STAIR.y1, SN));
rectM("stair", STAIR.x0, STAIR.y0, STAIR.x1, STAIR.y1);
for (let k = 1; k < 12; k++) {
  const yy = +(STAIR.y0 + k * tread).toFixed(3);
  // x where the break line crosses this tread
  const xc = STAIR.x0 + ((7.62 - yy) / 0.34) * (STAIR.x1 - STAIR.x0);
  const solid = `stroke="${C.slate}" stroke-width="0.9"`;
  const dashed = `stroke="${C.pencil}" stroke-width="0.9" stroke-dasharray="3 2.5"`;
  if (yy <= breakAt(STAIR.x1)) F.push(ln(STAIR.x0, yy, STAIR.x1, yy, solid));
  else if (yy >= breakAt(STAIR.x0)) F.push(ln(STAIR.x0, yy, STAIR.x1, yy, dashed));
  else {
    F.push(ln(STAIR.x0, yy, xc, yy, solid), ln(xc, yy, STAIR.x1, yy, dashed));
  }
  segM("tread", STAIR.x0, yy, STAIR.x1, yy);
}
{
  const xa = STAIR.x0, xb = STAIR.x1, ym = (breakAt(xa) + breakAt(xb)) / 2, xm = (xa + xb) / 2;
  F.push(`<path d="M ${X(xa)} ${Y(breakAt(xa))} L ${X(xm - 0.06)} ${Y(ym + 0.02)} L ${X(xm - 0.02)} ${Y(ym - 0.12)} L ${X(xm + 0.03)} ${Y(ym + 0.11)} L ${X(xm + 0.07)} ${Y(ym - 0.02)} L ${X(xb)} ${Y(breakAt(xb))}" stroke="${C.graphite}" stroke-width="1.4" fill="none" stroke-linejoin="round"/>`);
  segM("break", xa, breakAt(xa), xb, breakAt(xb));
}
// direction arrow from the first riser, labelled UP at its start
F.push(`<circle cx="${X(5.25)}" cy="${Y(5.9)}" r="2.6" fill="${C.paper}" stroke="${C.graphite}" stroke-width="1.1"/>`);
F.push(ln(5.25, 5.94, 5.25, 7.08, `stroke="${C.graphite}" stroke-width="1.1"`));
F.push(`<path d="M ${X(5.25) - 3.6} ${Y(7.08) - 7} L ${X(5.25)} ${Y(7.08) + 1} L ${X(5.25) + 3.6} ${Y(7.08) - 7} Z" fill="${C.graphite}"/>`);
segM("arrow", 5.25, 5.9, 5.25, 7.1);
out.push(g("furniture", F.join("")));

// ─── Walls with openings punched ────────────────────────────────────────
const Wl = [];
Wl.push(`<path fill="${C.graphite}" d="${wallRects.map(([x0, y0, x1, y1]) => `M ${X(x0)} ${Y(y0)} H ${X(x1)} V ${Y(y1)} H ${X(x0)} Z`).join(" ")}"/>`);
for (const [x0, y0, x1, y1] of wallRects) rectM("wall", x0, y0, x1, y1);
// gap rectangles
const gapRect = (o) =>
  o.wall === "h" ? [o.lo, o.at - o.t / 2 - 0.01, o.hi, o.at + o.t / 2 + 0.01] : [o.at - o.t / 2 - 0.01, o.lo, o.at + o.t / 2 + 0.01, o.hi];
for (const o of openings) {
  const [x0, y0, x1, y1] = gapRect(o);
  Wl.push(r(x0, y0, x1, y1, `fill="${C.paper}"`));
  // remove wall obstacles inside gaps from the text test by recording gap as free (walls stay conservative)
}
out.push(g("walls", Wl.join("")));

// ─── Opening symbols ────────────────────────────────────────────────────
const O = [];
const LEAF = `stroke="${C.graphite}" stroke-width="1.6" stroke-linecap="butt"`;
const ARC = `stroke="${C.pencil}" stroke-width="0.9" fill="none"`;
function swing(o, hingeAt, width, into) {
  // hinge on the wall face the door swings towards
  const face = o.at + into * (o.t / 2);
  if (o.wall === "h") {
    const hx = hingeAt;
    const dirAlong = hingeAt === o.lo ? 1 : -1;
    const tipY = face + into * width;
    O.push(ln(hx, face, hx, tipY, LEAF));
    const sweep = (into === 1) === (dirAlong === 1) ? 0 : 1;
    O.push(`<path d="M ${X(hx)} ${Y(tipY)} A ${L(width)} ${L(width)} 0 0 ${sweep} ${X(hx + dirAlong * width)} ${Y(face)}" ${ARC}/>`);
    segM(`${o.id}-leaf`, hx, face, hx, tipY);
    for (let a = 0; a <= 16; a++) {
      const t = (a / 16) * (Math.PI / 2);
      const px = hx + dirAlong * width * Math.sin(t);
      const py = face + into * width * Math.cos(t);
      const t2 = ((a + 1) / 16) * (Math.PI / 2);
      if (a < 16) segM(`${o.id}-arc`, px, py, hx + dirAlong * width * Math.sin(t2), face + into * width * Math.cos(t2));
    }
  } else {
    const hy = hingeAt;
    const dirAlong = hingeAt === o.lo ? 1 : -1;
    const tipX = face + into * width;
    O.push(ln(face, hy, tipX, hy, LEAF));
    const sweep = (into === 1) === (dirAlong === 1) ? 1 : 0;
    O.push(`<path d="M ${X(tipX)} ${Y(hy)} A ${L(width)} ${L(width)} 0 0 ${sweep} ${X(face)} ${Y(hy + dirAlong * width)}" ${ARC}/>`);
    segM(`${o.id}-leaf`, face, hy, tipX, hy);
    for (let a = 0; a < 16; a++) {
      const t = (a / 16) * (Math.PI / 2);
      const t2 = ((a + 1) / 16) * (Math.PI / 2);
      segM(`${o.id}-arc`, face + into * width * Math.cos(t), hy + dirAlong * width * Math.sin(t), face + into * width * Math.cos(t2), hy + dirAlong * width * Math.sin(t2));
    }
  }
}
for (const o of openings) {
  const width = o.hi - o.lo;
  if (o.kind === "door") {
    swing(o, o.hinge === "lo" ? o.lo : o.hi, width, o.into);
    if (o.exterior) {
      const outer = o.at - o.into * (o.t / 2);
      O.push(o.wall === "h" ? ln(o.lo, outer, o.hi, outer, `stroke="${C.graphite}" stroke-width="0.8"`) : ln(outer, o.lo, outer, o.hi, `stroke="${C.graphite}" stroke-width="0.8"`));
    }
  } else if (o.kind === "double") {
    swing(o, o.lo, width / 2, o.into);
    swing(o, o.hi, width / 2, o.into);
  } else if (o.kind === "window") {
    const faces = [o.at - o.t / 2, o.at + o.t / 2];
    const frame = `stroke="${C.graphite}" stroke-width="0.9"`;
    const glass = `stroke="${C.glazing}" stroke-width="1.8"`;
    if (o.wall === "h") {
      O.push(ln(o.lo, faces[0], o.hi, faces[0], frame), ln(o.lo, faces[1], o.hi, faces[1], frame), ln(o.lo, o.at, o.hi, o.at, glass));
      O.push(ln(o.lo, faces[0], o.lo, faces[1], frame), ln(o.hi, faces[0], o.hi, faces[1], frame));
    } else {
      O.push(ln(faces[0], o.lo, faces[0], o.hi, frame), ln(faces[1], o.lo, faces[1], o.hi, frame), ln(o.at, o.lo, o.at, o.hi, glass));
      O.push(ln(faces[0], o.lo, faces[1], o.lo, frame), ln(faces[0], o.hi, faces[1], o.hi, frame));
    }
  } else if (o.kind === "sliding") {
    // two glazed panels on offset tracks, overlapping at the meeting stile
    const mid = (o.lo + o.hi) / 2;
    const glass = `stroke="${C.glazing}" stroke-width="2.2"`;
    const stile = `stroke="${C.graphite}" stroke-width="1.2"`;
    O.push(ln(o.lo, o.at - 0.05, mid + 0.06, o.at - 0.05, glass), ln(mid - 0.06, o.at + 0.05, o.hi, o.at + 0.05, glass));
    O.push(ln(o.lo, o.at - 0.1, o.lo, o.at + 0.1, stile), ln(o.hi, o.at - 0.1, o.hi, o.at + 0.1, stile));
    O.push(ln(mid + 0.06, o.at - 0.1, mid + 0.06, o.at, stile), ln(mid - 0.06, o.at, mid - 0.06, o.at + 0.1, stile));
    O.push(ln(o.lo, o.at - o.t / 2, o.hi, o.at - o.t / 2, `stroke="${C.graphite}" stroke-width="0.8"`));
  } else if (o.kind === "pocket") {
    // leaf half drawn out of a cavity in the wall
    const cav = `fill="${C.paper}"`;
    O.push(r(o.at - 0.025, o.hi, o.at + 0.025, o.hi + width, cav));
    O.push(ln(o.at, o.lo + width * 0.45, o.at, o.hi + width - 0.04, `stroke="${C.graphite}" stroke-width="1.6"`));
    O.push(ln(o.at - 0.06, o.lo + width * 0.45, o.at + 0.06, o.lo + width * 0.45, `stroke="${C.graphite}" stroke-width="1.2"`));
  } else if (o.kind === "opening") {
    // cased opening: header above the cut plane shown dashed
    const dash = `stroke="${C.pencil}" stroke-width="0.9" stroke-dasharray="4 3"`;
    O.push(ln(o.at - o.t / 2, o.lo, o.at - o.t / 2, o.hi, dash), ln(o.at + o.t / 2, o.lo, o.at + o.t / 2, o.hi, dash));
  }
}
out.push(g("openings", O.join("")));

// ─── Room labels ────────────────────────────────────────────────────────
const labelAt = {
  living: [4.72, 2.05],
  kitchen: [7.62, 0.98],
  guest: [1.45, 7.62],
  hall: [4.13, 6.95],
  bath: [6.9, 6.5],
  utility: [9.0, 8.62],
};
for (const rm of rooms) {
  const [cx, cy] = labelAt[rm.id];
  text(`${rm.id}-name`, X(cx), Y(cy), rm.name, { fs: 12, weight: 600, tracking: 0.7 });
  text(`${rm.id}-area`, X(cx), Y(cy) + 16, `${area(rm)} m²`, { fs: 11, fill: C.caption });
}
// appliance tags and stair label
text("tag-ref", X(9.55), Y(0.5) + 3.2, "REF", { fs: 8.5, weight: 600, fill: C.slate });
text("tag-dw", X(9.6), Y(2.3) + 3.2, "DW", { fs: 8, weight: 600, fill: C.slate });
text("tag-w", X(8.42), Y(5.6) + 3, "W", { fs: 8.5, weight: 600, fill: C.slate });
text("tag-d", X(8.42), Y(6.3) + 3, "D", { fs: 8.5, weight: 600, fill: C.slate });
text("stair-up", X(5.25), Y(5.52), "UP", { fs: 9.5, weight: 600, tracking: 0.4 });

// ─── Dimensions ─────────────────────────────────────────────────────────
const D = [];
const DIM = `stroke="${C.pencil}" stroke-width="0.8"`;
const TICK = `stroke="${C.graphite}" stroke-width="1.3" stroke-linecap="round"`;
const faceTop = Y(-e), faceBottom = Y(PLAN_H + e), faceLeft = X(-e);
const fmt = (v) => v.toFixed(2);
function hDim(id, marks, yLine, extFrom, textAbove = true) {
  D.push(lnP(X(marks[0]) - 5, yLine, X(marks.at(-1)) + 5, yLine, DIM));
  segP(`${id}-line`, X(marks[0]) - 5, yLine, X(marks.at(-1)) + 5, yLine);
  for (const m of marks) {
    const x = X(m);
    const y0 = extFrom < yLine ? extFrom + 4 : extFrom - 4;
    const y1 = extFrom < yLine ? yLine + 5 : yLine - 5;
    D.push(lnP(x, y0, x, y1, DIM), lnP(x - 4.5, yLine + 4.5, x + 4.5, yLine - 4.5, TICK));
    segP(`${id}-ext`, x, y0, x, y1);
  }
  for (let k = 0; k < marks.length - 1; k++) {
    const mid = (X(marks[k]) + X(marks[k + 1])) / 2;
    text(`${id}-t${k}`, mid, textAbove ? yLine - 5 : yLine + 14, fmt(marks[k + 1] - marks[k]), { fs: 11, fill: C.slate });
  }
}
function vDim(id, marks, xLine, extFrom) {
  D.push(lnP(xLine, Y(marks[0]) - 5, xLine, Y(marks.at(-1)) + 5, DIM));
  segP(`${id}-line`, xLine, Y(marks[0]) - 5, xLine, Y(marks.at(-1)) + 5);
  for (const m of marks) {
    const y = Y(m);
    D.push(lnP(extFrom - 4, y, xLine - 5, y, DIM), lnP(xLine - 4.5, y - 4.5, xLine + 4.5, y + 4.5, TICK));
    segP(`${id}-ext`, extFrom - 4, y, xLine - 5, y);
  }
  for (let k = 0; k < marks.length - 1; k++) {
    const mid = (Y(marks[k]) + Y(marks[k + 1])) / 2;
    text(`${id}-t${k}`, xLine - 5, mid, fmt(marks[k + 1] - marks[k]), { fs: 11, fill: C.slate, rotate: -90 });
  }
}
hDim("top-rooms", [0, 5.8, 10], faceTop - 30, faceTop);
hDim("top-overall", [0, 10], faceTop - 58, faceTop);
hDim("bottom-rooms", [0, 3.4, 5.8, 8.0, 10], faceBottom + 34, faceBottom);
vDim("left-rooms", [0, 4.4, 9.2], faceLeft - 30, faceLeft);
vDim("left-overall", [0, 9.2], faceLeft - 58, faceLeft);
out.push(g("dimensions", D.join("")));

// ─── Graphic scale and north arrow ──────────────────────────────────────
const Sb = [];
const sbX = X(0), sbY = 868;
for (let k = 0; k < 5; k++) {
  Sb.push(`<rect x="${sbX + k * K}" y="${sbY}" width="${K}" height="6" fill="${k % 2 === 0 ? C.graphite : C.paper}" stroke="${C.graphite}" stroke-width="0.8"/>`);
}
rects.push({ id: "scalebar", x0: sbX, y0: sbY, x1: sbX + 5 * K, y1: sbY + 6 });
for (let k = 0; k <= 5; k++) text(`scale-${k}`, sbX + k * K, sbY - 5, String(k), { fs: 10, fill: C.caption });
text("scale-unit", sbX + 5 * K + 12, sbY + 6, "m", { fs: 10, fill: C.caption, anchor: "start" });
text("scale-caption", sbX, sbY + 24, "GRAPHIC SCALE", { fs: 9, weight: 600, fill: C.caption, anchor: "start", tracking: 1 });

const nx = X(PLAN_W) - 6, ny = 870;
Sb.push(`<circle cx="${nx}" cy="${ny}" r="17" fill="none" stroke="${C.pencil}" stroke-width="1"/>`);
Sb.push(`<path d="M ${nx} ${ny - 14} L ${nx - 6} ${ny + 9} L ${nx} ${ny + 5} Z" fill="${C.graphite}"/>`);
Sb.push(`<path d="M ${nx} ${ny - 14} L ${nx + 6} ${ny + 9} L ${nx} ${ny + 5} Z" fill="${C.paper}" stroke="${C.graphite}" stroke-width="1" stroke-linejoin="round"/>`);
rects.push({ id: "north", x0: nx - 17, y0: ny - 17, x1: nx + 17, y1: ny + 17 });
text("north-n", nx, ny - 23, "N", { fs: 12, weight: 600, anchor: "middle" });
out.push(g("sheet", Sb.join("")));
out.push(`</svg>`);

// ─── Collision check ────────────────────────────────────────────────────
const overlap = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
const segHitsBox = (s, b) => {
  const n = Math.max(2, Math.ceil(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / 1.5));
  for (let k = 0; k <= n; k++) {
    const px = s.x1 + ((s.x2 - s.x1) * k) / n;
    const py = s.y1 + ((s.y2 - s.y1) * k) / n;
    if (px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1) return true;
  }
  return false;
};
const problems = [];
const PAD = 2;
const tagHosts = { "tag-ref": "fridge", "tag-dw": "counter", "tag-w": "washer", "tag-d": "dryer" };
for (let a = 0; a < texts.length; a++) {
  const t = texts[a];
  if (t.x0 < 4 || t.y0 < 4 || t.x1 > W - 4 || t.y1 > H - 4) problems.push(`${t.id} leaves the canvas`);
  for (let b = a + 1; b < texts.length; b++) if (overlap(t, texts[b], PAD)) problems.push(`${t.id} overlaps ${texts[b].id}`);
  const padded = { x0: t.x0 - PAD, y0: t.y0 - PAD, x1: t.x1 + PAD, y1: t.y1 + PAD };
  for (const s of segs) {
    if (t.id.startsWith("top-") || t.id.startsWith("bottom-") || t.id.startsWith("left-")) {
      // a dimension figure sits on its own dimension line by design
      if (s.id === `${t.id.replace(/-t\d+$/, "")}-line`) continue;
    }
    if (segHitsBox(s, t.id.startsWith("tag-") ? t : padded)) problems.push(`${t.id} crosses ${s.id}`);
  }
  for (const rc of rects) {
    if (tagHosts[t.id] === rc.id || (rc.id === "counter" && t.id === "tag-dw")) {
      if (!(t.x0 >= rc.x0 && t.x1 <= rc.x1 && t.y0 >= rc.y0 && t.y1 <= rc.y1)) problems.push(`${t.id} spills out of ${rc.id}`);
      continue;
    }
    if (overlap(padded, rc)) problems.push(`${t.id} overlaps ${rc.id}`);
  }
}
writeFileSync(OUT, out.join("\n") + "\n");
console.log(`texts ${texts.length}, segments ${segs.length}, rects ${rects.length}`);
console.log(`collisions: ${problems.length}`);
for (const p of [...new Set(problems)]) console.log("  " + p);
process.exitCode = problems.length ? 1 : 0;
