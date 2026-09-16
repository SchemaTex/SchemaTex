#!/usr/bin/env node
/** Draws visual-eval/exemplars/siteplan/ideal.svg — the site plan exemplar.
 *
 * The drawing is generated from the exemplar's own source.sx, parsed with the
 * engine's siteplan parser, so every number on the sheet is computed from the
 * same geometry the engine reads: lot area, footprints, impervious surface and
 * coverage percentages, setback distances, and the bearing and length of each
 * property line. The script then checks those numbers against the labels the
 * author typed, and checks every text box against every other text box, line,
 * hatch, symbol and the canvas edge. It exits non-zero on any failure.
 *
 *   ./node_modules/.bin/vite-node scripts/visual-eval/draw-siteplan-exemplar.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseSiteplan } from "../../src/diagrams/siteplan/parser.ts";

const DIR = new URL("../../visual-eval/exemplars/siteplan/", import.meta.url);
const ast = parseSiteplan(readFileSync(new URL("source.sx", DIR), "utf8"));
const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

// ─── Palette (shared with the floor plan exemplar, plus Stone) ──────────
const C = {
  graphite: "#1F2328", // property lines, building outlines, titles, building names
  slate: "#55606C", // setbacks, easement, fence, utilities, paving outlines, annotation text
  pencil: "#A3ABB4", // dimension lines, street centreline, rules, north circle
  mist: "#EDEFF2", // paved surfaces: street, driveway, walks, patio
  stone: "#D5DAE0", // existing building footprint fill
  water: "#4F86B0", // water service — the only hue; blue means water or glass across the family
  caption: "#6E7782", // subtitle, table headers, scale figures
  paper: "#FFFFFF",
};
const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Projection: feet → px ──────────────────────────────────────────────
const K = 5.8; // px per foot
const OX = 110;
const OY = 140;
const W = 1000;
const H = 1040;
const X = (ft) => +(OX + ft * K).toFixed(2);
const Y = (ft) => +(OY + ft * K).toFixed(2);
const L = (ft) => +(ft * K).toFixed(2);

// ─── Text metrics: Helvetica AFM advance widths (1/1000 em), ×1.06 for Inter ─
const ASCII = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
const REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
const EXTRA = { "′": 280, "″": 460, "°": 400, "×": 584, "·": 278, "—": 1000, "²": 333, "+": 584 };
const textWidth = (s, fs, weight = 400, tracking = 0) => {
  const table = weight >= 600 ? BOLD : REG;
  let em = 0;
  for (const ch of s) {
    const i = ASCII.indexOf(ch);
    em += i >= 0 ? table[i] : EXTRA[ch] ?? 600;
  }
  return (em / 1000) * fs * 1.06 + Math.max(0, [...s].length - 1) * tracking;
};

// ─── Collision registry (px) ────────────────────────────────────────────
const texts = []; // {id, x0, y0, x1, y1}
const segs = []; // {id, x1, y1, x2, y2}
const rects = []; // {id, x0, y0, x1, y1} solid obstacles
const segP = (id, x1, y1, x2, y2) => segs.push({ id, x1, y1, x2, y2 });
const segF = (id, x1, y1, x2, y2) => segP(id, X(x1), Y(y1), X(x2), Y(y2));

const out = [];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function text(id, x, y, s, { fs = 11, weight = 400, fill = C.slate, anchor = "middle", tracking = 0, rotate = 0 } = {}) {
  const w = textWidth(s, fs, weight, tracking);
  const asc = fs * 0.74;
  const desc = fs * 0.22;
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  const box =
    rotate === -90
      ? { x0: x - asc, y0: anchor === "middle" ? y - w / 2 : anchor === "end" ? y : y - w, x1: x + desc, y1: anchor === "middle" ? y + w / 2 : anchor === "end" ? y + w : y }
      : { x0, y0: y - asc, x1: x0 + w, y1: y + desc };
  texts.push({ id, ...box });
  const attrs = [
    `x="${+x.toFixed(2)}"`,
    `y="${+y.toFixed(2)}"`,
    `font-size="${fs}"`,
    weight !== 400 ? `font-weight="${weight}"` : "",
    `fill="${fill}"`,
    `text-anchor="${anchor}"`,
    tracking ? `letter-spacing="${tracking}"` : "",
    rotate ? `transform="rotate(${rotate} ${+x.toFixed(2)} ${+y.toFixed(2)})"` : "",
  ].filter(Boolean);
  out.push(`<text ${attrs.join(" ")}>${esc(s)}</text>`);
  return box;
}
const lnP = (x1, y1, x2, y2, a) => `<line x1="${+x1.toFixed(2)}" y1="${+y1.toFixed(2)}" x2="${+x2.toFixed(2)}" y2="${+y2.toFixed(2)}" ${a}/>`;
const ln = (x1, y1, x2, y2, a) => lnP(X(x1), Y(y1), X(x2), Y(y2), a);
const rectP = (x0, y0, x1, y1, a) => `<rect x="${+Math.min(x0, x1).toFixed(2)}" y="${+Math.min(y0, y1).toFixed(2)}" width="${+Math.abs(x1 - x0).toFixed(2)}" height="${+Math.abs(y1 - y0).toFixed(2)}" ${a}/>`;
const rectF = (r, a) => rectP(X(r.x0), Y(r.y0), X(r.x1), Y(r.y1), a);

// ─── Geometry from the source ───────────────────────────────────────────
const need = (v, what) => {
  if (!v) throw new Error(`source.sx: missing ${what}`);
  return v;
};
const findPoly = (id) => need(ast.polygons.find((p) => p.id === id), `polygon ${id}`);
const findPath = (id) => need(ast.paths.find((p) => p.id === id), `path ${id}`);
const findLine = (id) => need(ast.lines.find((p) => p.id === id), `line ${id}`);

const shoelace = (pts) => Math.abs(pts.reduce((s, p, i) => s + p.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * p.y, 0)) / 2;
function boxOfPoly(p) {
  const xs = p.points.map((q) => q.x);
  const ys = p.points.map((q) => q.y);
  const r = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  const isRect = p.points.length === 4 && p.points.every((q, i) => {
    const n = p.points[(i + 1) % 4];
    return q.x === n.x || q.y === n.y;
  });
  check(isRect, `${p.id} is expected to be an axis-aligned rectangle`);
  return r;
}
function boxOfPath(p) {
  check(p.points.length === 2, `${p.id} is expected to be one straight run`);
  const [a, b] = p.points;
  const h = p.width / 2;
  check(a.x === b.x || a.y === b.y, `${p.id} is expected to run square to the lot`);
  return a.x === b.x
    ? { x0: a.x - h, x1: a.x + h, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }
    : { y0: a.y - h, y1: a.y + h, x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x) };
}
const areaOf = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
const clip = (r, c) => ({ x0: Math.max(r.x0, c.x0), y0: Math.max(r.y0, c.y0), x1: Math.min(r.x1, c.x1), y1: Math.min(r.y1, c.y1) });

const status = (label) => (/^existing\b/i.test(label) ? "E" : /^(proposed|new)\b/i.test(label) ? "N" : "");
const bare = (label) => label.replace(/^(existing|proposed|new)\s+/i, "");
const tagged = (label) => `${status(label) ? `(${status(label)}) ` : ""}${bare(label).toUpperCase()}`;
const sf = (n) => Math.round(n).toLocaleString("en-US");
const pct = (n) => `${n.toFixed(1)}%`;

const lotPoly = need(ast.polygons.find((p) => p.role === "parcel"), "parcel");
const lot = boxOfPoly(lotPoly);
const lotArea = shoelace(lotPoly.points);
check(Math.abs(lotArea - areaOf(lot)) < 1e-9, "lot polygon area should equal its rectangle");

const house = findPoly("house");
const adu = findPoly("adu");
const houseBox = boxOfPoly(house);
const aduBox = boxOfPoly(adu);
const patio = findPoly("patio");
const patioBox = boxOfPoly(patio);
const drive = findPath("drive");
const driveBox = boxOfPath(drive);
const frontWalk = findPath("frontWalk");
const frontWalkBox = boxOfPath(frontWalk);
const aduWalk = findPath("aduWalk");
const aduWalkBox = boxOfPath(aduWalk);
const road = findPath("alder");
const roadBox = boxOfPath(road);
const north = ast.north ?? 0;

// Which lot side faces the street: the side whose midpoint is nearest the road centreline.
const sides = {
  rear: { a: { x: lot.x0, y: lot.y0 }, b: { x: lot.x1, y: lot.y0 } },
  front: { a: { x: lot.x0, y: lot.y1 }, b: { x: lot.x1, y: lot.y1 } },
  west: { a: { x: lot.x0, y: lot.y0 }, b: { x: lot.x0, y: lot.y1 } },
  east: { a: { x: lot.x1, y: lot.y0 }, b: { x: lot.x1, y: lot.y1 } },
};
{
  const [ra, rb] = road.points;
  const distTo = (s) => Math.hypot((s.a.x + s.b.x) / 2 - (ra.x + rb.x) / 2, (s.a.y + s.b.y) / 2 - (ra.y + rb.y) / 2);
  const nearest = Object.entries(sides).sort((p, q) => distTo(p[1]) - distTo(q[1]))[0][0];
  check(nearest === "front", `the street should face the lot side named front, found ${nearest}`);
}

// Distance from a building rectangle to each lot line, measured square to the line.
const toLines = (b) => ({ front: lot.y1 - b.y1, rear: b.y0 - lot.y0, west: b.x0 - lot.x0, east: lot.x1 - b.x1 });
const houseDist = toLines(houseBox);
const aduDist = toLines(aduBox);
const xOverlap = Math.min(houseBox.x1, aduBox.x1) - Math.max(houseBox.x0, aduBox.x0);
check(xOverlap > 0, "the ADU should sit directly behind the house for a square separation");
const separation = houseBox.y0 - aduBox.y1;

// Required setbacks: read from each setback line's position and cross-checked with its label.
const leadingFeet = (label) => {
  const m = /^(\d+(?:\.\d+)?)′/.exec(label ?? "");
  return m ? Number(m[1]) : NaN;
};
const required = {};
for (const s of ast.lines.filter((l) => l.role === "setback")) {
  const [a, b] = s.points;
  let side;
  let d;
  if (a.y === b.y) {
    side = Math.abs(a.y - lot.y1) < Math.abs(a.y - lot.y0) ? "front" : "rear";
    d = side === "front" ? lot.y1 - a.y : a.y - lot.y0;
  } else {
    side = Math.abs(a.x - lot.x0) < Math.abs(a.x - lot.x1) ? "west" : "east";
    d = side === "west" ? a.x - lot.x0 : lot.x1 - a.x;
  }
  required[side] = d;
  check(leadingFeet(s.label) === d, `setback "${s.label}" is drawn ${d} ft from the ${side} line`);
  check(new RegExp(side === "west" || side === "east" ? "side" : side, "i").test(s.label), `setback "${s.label}" should name the ${side} line`);
}
for (const side of ["front", "rear", "west", "east"]) {
  check(required[side] !== undefined, `no setback line for the ${side} lot line`);
  check(houseDist[side] >= required[side], `residence is ${houseDist[side]} ft from the ${side} line, ${required[side]} ft required`);
  check(aduDist[side] >= required[side], `ADU is ${aduDist[side]} ft from the ${side} line, ${required[side]} ft required`);
}

// Easement: a strip between the rear lot line and the easement line.
const easement = findLine("rearEasement");
const easementWidth = easement.points[0].y - lot.y0;
check(easement.points[0].y === easement.points[1].y, "the easement line should run parallel to the rear lot line");
check(leadingFeet(easement.label) === easementWidth, `easement "${easement.label}" is drawn ${easementWidth} ft wide`);
const easementBox = { x0: lot.x0, y0: lot.y0, x1: lot.x1, y1: lot.y0 + easementWidth };
for (const [n, b] of [["residence", houseBox], ["ADU", aduBox]]) check(areaOf(clip(b, easementBox)) === 0, `${n} encroaches on the easement`);

// Surfaces: every building and paved surface, clipped to the lot (the driveway apron in the street right-of-way is not counted).
const surfaces = [
  { key: "house", label: house.label, box: houseBox, building: true },
  { key: "adu", label: adu.label, box: aduBox, building: true },
  { key: "drive", label: drive.label, box: driveBox },
  { key: "patio", label: patio.label, box: patioBox },
  { key: "frontWalk", label: frontWalk.label, box: frontWalkBox },
  { key: "aduWalk", label: aduWalk.label, box: aduWalkBox },
].map((s) => ({ ...s, area: areaOf(clip(s.box, lot)), status: status(s.label) }));
for (let a = 0; a < surfaces.length; a++)
  for (let b = a + 1; b < surfaces.length; b++)
    check(areaOf(clip(surfaces[a].box, surfaces[b].box)) === 0, `${surfaces[a].key} overlaps ${surfaces[b].key}, so areas would double count`);
{
  // independent union count on a 0.5 ft grid
  let cells = 0;
  for (let gx = lot.x0; gx < lot.x1; gx += 0.5)
    for (let gy = lot.y0; gy < lot.y1; gy += 0.5) {
      const cx = gx + 0.25;
      const cy = gy + 0.25;
      if (surfaces.some((s) => cx > s.box.x0 && cx < s.box.x1 && cy > s.box.y0 && cy < s.box.y1)) cells++;
    }
  const grid = cells * 0.25;
  const summed = surfaces.reduce((t, s) => t + s.area, 0);
  check(grid === summed, `impervious union on a grid is ${grid} sf, the sum of surfaces is ${summed} sf`);
}
const sum = (list) => list.reduce((t, s) => t + s.area, 0);
const bldE = sum(surfaces.filter((s) => s.building && s.status === "E"));
const bldN = sum(surfaces.filter((s) => s.building && s.status === "N"));
const impE = sum(surfaces.filter((s) => s.status === "E"));
const impN = sum(surfaces.filter((s) => s.status === "N"));

// Dimensions the author typed: property lines carry bearing + distance; the rest are distances.
const dimChecks = [];
function bearingOf(a, b) {
  const sheet = (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI;
  const az = (((sheet - north) % 360) + 360) % 360;
  if (az <= 90) return { ns: "N", deg: az, ew: "E" };
  if (az <= 180) return { ns: "S", deg: 180 - az, ew: "E" };
  if (az <= 270) return { ns: "S", deg: az - 180, ew: "W" };
  return { ns: "N", deg: 360 - az, ew: "W" };
}
const dms = (deg) => {
  const total = Math.round(deg * 3600);
  const d = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″`;
};
const plDims = [];
const distDims = [];
for (const d of ast.dimensions) {
  const len = Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y);
  const bearing = /^([NS]) (\d{2}°\d{2}′\d{2}″) ([EW]) ([\d.]+)′$/.exec(d.label);
  if (bearing) {
    const fwd = bearingOf(d.from, d.to);
    const back = bearingOf(d.to, d.from);
    const matches = [fwd, back].some((q) => q.ns === bearing[1] && dms(q.deg) === bearing[2] && q.ew === bearing[3]);
    check(matches, `"${d.label}": the line runs ${fwd.ns} ${dms(fwd.deg)} ${fwd.ew} with north at ${north}°`);
    check(Math.abs(Number(bearing[4]) - len) < 0.005, `"${d.label}": the line is ${len.toFixed(2)} ft`);
    const side = Object.entries(sides).find(([, s]) =>
      [[s.a, s.b], [s.b, s.a]].some(([p, q]) => p.x === d.from.x && p.y === d.from.y && q.x === d.to.x && q.y === d.to.y));
    check(side, `"${d.label}" should run along a lot line`);
    if (side) plDims.push({ side: side[0], label: d.label, len });
    dimChecks.push(`${d.label} = ${fwd.ns} ${dms(fwd.deg)} ${fwd.ew} ${len.toFixed(2)} ft`);
  } else {
    check(leadingFeet(d.label) === len && /^[\d.]+′$/.test(d.label), `"${d.label}" measures ${len} ft`);
    check(d.from.x === d.to.x || d.from.y === d.to.y, `"${d.label}" should run square to the lot`);
    distDims.push({ ...d, len });
    dimChecks.push(`${d.label} = ${len} ft`);
  }
}
check(plDims.length === 4 && new Set(plDims.map((p) => p.side)).size === 4, "each lot line needs one bearing-and-distance label");
// each building distance on the plan must equal the value in the setback table
const onEdge = (p, b) =>
  ((p.y === b.y0 || p.y === b.y1) && p.x >= b.x0 && p.x <= b.x1) || ((p.x === b.x0 || p.x === b.x1) && p.y >= b.y0 && p.y <= b.y1);
const onLotLine = (p) => p.x === lot.x0 || p.x === lot.x1 || p.y === lot.y0 || p.y === lot.y1;
const expectedDims = [
  ...Object.entries(houseDist).filter(([s]) => s !== "rear").map(([s, v]) => ({ what: `residence ${s}`, v, b: houseBox })),
  ...Object.entries(aduDist).filter(([s]) => s !== "front").map(([s, v]) => ({ what: `ADU ${s}`, v, b: aduBox })),
];
for (const e of expectedDims) {
  const hit = distDims.find((d) => d.len === e.v && (onEdge(d.from, e.b) || onEdge(d.to, e.b)) && (onLotLine(d.from) || onLotLine(d.to)));
  check(hit, `no dimension shows the ${e.what} distance of ${e.v} ft`);
}
check(distDims.some((d) => d.len === separation && [d.from, d.to].some((p) => onEdge(p, houseBox)) && [d.from, d.to].some((p) => onEdge(p, aduBox))), `no dimension shows the ${separation} ft building separation`);

// ─── SVG ────────────────────────────────────────────────────────────────
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}" role="img" aria-labelledby="t d">`);
out.push(`<title id="t">${esc(ast.title)}</title>`);
out.push(
  `<desc id="d">Permit site plan of ${esc(lotPoly.label)}, a ${sf(lotArea)} square foot lot on ${esc(road.label)}: existing ${sf(houseBox.x1 - houseBox.x0)} by ${sf(houseBox.y1 - houseBox.y0)} foot residence, proposed ${sf(aduBox.x1 - aduBox.x0)} by ${sf(aduBox.y1 - aduBox.y0)} foot detached ADU, driveway, walks, patio, fence, a ${easementWidth} foot rear utility easement, setbacks from all four lot lines, utilities, and a site data table. Building coverage ${pct(((bldE + bldN) / lotArea) * 100)}, impervious surface ${pct(((impE + impN) / lotArea) * 100)}.</desc>`,
);
out.push(`<rect width="${W}" height="${H}" fill="${C.paper}"/>`);

// Title block
const aduWords = bare(adu.label);
text("title", 40, 50, ast.title, { fs: 20, weight: 600, fill: C.graphite, anchor: "start" });
text("subtitle", 40, 72, `${lotPoly.label} · ${sf(lotArea)} sf lot · ${status(adu.label) === "N" ? "proposed " : ""}${aduWords} · bearings and distances in feet`, { fs: 12, fill: C.caption, anchor: "start" });
out.push(lnP(40, 88, W - 40, 88, `stroke="${C.pencil}" stroke-width="0.6"`));

// ─── Street ─────────────────────────────────────────────────────────────
{
  const G = [];
  const [a, b] = road.points;
  G.push(rectF(roadBox, `fill="${C.mist}"`));
  for (const yy of [roadBox.y0, roadBox.y1]) {
    G.push(ln(roadBox.x0, yy, roadBox.x1, yy, `stroke="${C.slate}" stroke-width="1.1"`));
    segF("curb", roadBox.x0, yy, roadBox.x1, yy);
  }
  const name = road.label.toUpperCase();
  const nx = X((lot.x0 + lot.x1) / 2 + 5);
  const ny = Y(a.y);
  const nw = textWidth(name, 11, 600, 1.2);
  const cl = `stroke="${C.pencil}" stroke-width="0.9" stroke-dasharray="18 5 4 5"`;
  G.push(lnP(X(a.x), ny, nx - nw / 2 - 8, ny, cl), lnP(nx + nw / 2 + 8, ny, X(b.x), ny, cl));
  segP("centreline", X(a.x), ny, nx - nw / 2 - 8, ny);
  segP("centreline", nx + nw / 2 + 8, ny, X(b.x), ny);
  out.push(`<g class="street">${G.join("")}</g>`);
  text("street-name", nx, ny + 4, name, { fs: 11, weight: 600, fill: C.graphite, tracking: 1.2 });
}

// ─── Paved surfaces ─────────────────────────────────────────────────────
{
  const G = [];
  const pave = `fill="${C.mist}" stroke="${C.slate}" stroke-width="0.9"`;
  for (const r of [driveBox, patioBox, frontWalkBox, aduWalkBox]) {
    G.push(rectF(r, pave));
    segF("paving", r.x0, r.y0, r.x1, r.y0);
    segF("paving", r.x1, r.y0, r.x1, r.y1);
    segF("paving", r.x0, r.y1, r.x1, r.y1);
    segF("paving", r.x0, r.y0, r.x0, r.y1);
  }
  out.push(`<g class="paving">${G.join("")}</g>`);
}

// ─── Buildings ──────────────────────────────────────────────────────────
const plate = { x0: 0, y0: 0, x1: 0, y1: 0 };
{
  const G = [];
  G.push(rectF(houseBox, `fill="${C.stone}" stroke="${C.graphite}" stroke-width="1.6"`));
  // Proposed building: 45° hatch, broken around the name plate, heavier outline
  const bx0 = X(aduBox.x0), by0 = Y(aduBox.y0), bx1 = X(aduBox.x1), by1 = Y(aduBox.y1);
  const nameFs = 12;
  const aduName = tagged(adu.label);
  const aduSub = `${sf(aduBox.x1 - aduBox.x0)}′ × ${sf(aduBox.y1 - aduBox.y0)}′ · ${sf(areaOf(aduBox))} sf`;
  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;
  const pw = Math.max(textWidth(aduName, nameFs, 600, 0.7), textWidth(aduSub, 11)) + 12;
  Object.assign(plate, { x0: cx - pw / 2, x1: cx + pw / 2, y0: cy - 20, y1: cy + 19 });
  G.push(rectP(bx0, by0, bx1, by1, `fill="${C.paper}"`));
  const step = 7 * Math.SQRT2;
  const hatch = [];
  for (let c = bx0 + by0 + step / 2; c < bx1 + by1; c += step) {
    const xa = Math.max(bx0, c - by1);
    const xb = Math.min(bx1, c - by0);
    if (xb <= xa) continue;
    const pa = Math.max(plate.x0, c - plate.y1);
    const pb = Math.min(plate.x1, c - plate.y0);
    const pieces = pb > pa && pa < xb && pb > xa ? [[xa, Math.max(xa, pa)], [Math.min(xb, pb), xb]] : [[xa, xb]];
    for (const [u, v] of pieces) {
      if (v - u < 0.5) continue;
      hatch.push(`M${u.toFixed(2)} ${(c - u).toFixed(2)}L${v.toFixed(2)} ${(c - v).toFixed(2)}`);
      segP("adu-hatch", u, c - u, v, c - v);
    }
  }
  G.push(`<path d="${hatch.join("")}" stroke="${C.slate}" stroke-width="0.6" fill="none"/>`);
  G.push(rectP(bx0, by0, bx1, by1, `fill="none" stroke="${C.graphite}" stroke-width="2.4"`));
  for (const b of [houseBox, aduBox]) {
    segF("building", b.x0, b.y0, b.x1, b.y0);
    segF("building", b.x1, b.y0, b.x1, b.y1);
    segF("building", b.x0, b.y1, b.x1, b.y1);
    segF("building", b.x0, b.y0, b.x0, b.y1);
  }
  out.push(`<g class="buildings">${G.join("")}</g>`);
  text("plate-name", cx, cy - 3, aduName, { fs: nameFs, weight: 600, fill: C.graphite, tracking: 0.7 });
  text("plate-sub", cx, cy + 13, aduSub, { fs: 11, fill: C.caption });
  const hx = X((houseBox.x0 + houseBox.x1) / 2);
  const hy = Y((houseBox.y0 + houseBox.y1) / 2);
  text("house-name", hx, hy - 3, tagged(house.label), { fs: 12, weight: 600, fill: C.graphite, tracking: 0.7 });
  text("house-sub", hx, hy + 13, `${sf(houseBox.x1 - houseBox.x0)}′ × ${sf(houseBox.y1 - houseBox.y0)}′ · ${sf(areaOf(houseBox))} sf`, { fs: 11, fill: C.caption });
}

// ─── Existing tree: scalloped canopy with trunk ─────────────────────────
function canopy(cx, cy, r, n = 11) {
  const pts = Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2), cy + r * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2)]);
  const arc = (2 * r * Math.sin(Math.PI / n) * 0.62).toFixed(2);
  return `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}` + pts.map((_, i) => {
    const q = pts[(i + 1) % n];
    return `A${arc} ${arc} 0 0 1 ${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
  }).join("") + "Z";
}
const tree = need(ast.markers.find((m) => m.kind === "tree"), "tree");
{
  const cx = X(tree.at.x);
  const cy = Y(tree.at.y);
  const r = L(tree.size / 2);
  const d = canopy(cx, cy, r);
  out.push(`<g class="tree"><path d="${d}" fill="none" stroke="${C.slate}" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="2.6" fill="${C.paper}" stroke="${C.slate}" stroke-width="1"/></g>`);
  for (let i = 0; i < 24; i++) {
    const t1 = (i / 24) * 2 * Math.PI;
    const t2 = ((i + 1) / 24) * 2 * Math.PI;
    segP("tree", cx + (r + 1.5) * Math.cos(t1), cy + (r + 1.5) * Math.sin(t1), cx + (r + 1.5) * Math.cos(t2), cy + (r + 1.5) * Math.sin(t2));
  }
  rects.push({ id: "trunk", x0: cx - 3, y0: cy - 3, x1: cx + 3, y1: cy + 3 });
  text("tree-label", cx, cy + r + 13, tagged(tree.label), { fs: 9.5, tracking: 0.3 });
}

// ─── Utilities: dashed runs broken for their tags ───────────────────────
const U = [];
const utilityStyle = {
  water: { tag: "W", stroke: C.water, width: 1.3, dash: "9 3.5" },
  sewer: { tag: "SS", stroke: C.slate, width: 1.3, dash: "9 3.5" },
  aduService: { tag: "W+SS", stroke: C.slate, width: 1.3, dash: "9 3.5" },
  power: { tag: "OHE", stroke: C.slate, width: 0.9, dash: "" },
};
const tagAt = { water: [108], sewer: [112], aduService: [48], power: [-5, 65] };
for (const u of ast.lines.filter((l) => l.role === "utility")) {
  const st = need(utilityStyle[u.id], `style for utility ${u.id}`);
  check(u.points.length === 2, `${u.id} should be one straight run`);
  const [a, b] = u.points;
  const vertical = a.x === b.x;
  const along = vertical ? [a.y, b.y].sort((p, q) => p - q) : [a.x, b.x].sort((p, q) => p - q);
  const attr = `stroke="${st.stroke}" stroke-width="${st.width}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ""} fill="none"`;
  const tw = textWidth(st.tag, 8.5, 600);
  const gaps = tagAt[u.id].map((t) => {
    const half = (vertical ? 18 : tw + 10) / 2 / K;
    return [t - half, t + half, t];
  });
  let cursor = along[0];
  for (const [g0, g1, t] of gaps) {
    if (vertical) {
      U.push(ln(a.x, cursor, a.x, g0, attr));
      segF(`util-${u.id}`, a.x, cursor, a.x, g0);
      text(`tag-${u.id}-${t}`, X(a.x), Y(t) + 3, st.tag, { fs: 8.5, weight: 600, fill: st.stroke, rotate: 0 });
    } else {
      U.push(ln(cursor, a.y, g0, a.y, attr));
      segF(`util-${u.id}`, cursor, a.y, g0, a.y);
      text(`tag-${u.id}-${t}`, X(t), Y(a.y) + 3, st.tag, { fs: 8.5, weight: 600, fill: st.stroke });
    }
    cursor = g1;
  }
  if (vertical) {
    U.push(ln(a.x, cursor, a.x, along[1], attr));
    segF(`util-${u.id}`, a.x, cursor, a.x, along[1]);
  } else {
    U.push(ln(cursor, a.y, along[1], a.y, attr));
    segF(`util-${u.id}`, cursor, a.y, along[1], a.y);
  }
}
{
  // water meter box at the street end of the water service
  const wm = findLine("water").points.reduce((p, q) => (q.y > p.y ? q : p));
  U.push(rectP(X(wm.x) - 4, Y(wm.y) - 3, X(wm.x) + 4, Y(wm.y) + 3, `fill="${C.paper}" stroke="${C.water}" stroke-width="1.1"`));
  rects.push({ id: "meter", x0: X(wm.x) - 4, y0: Y(wm.y) - 3, x1: X(wm.x) + 4, y1: Y(wm.y) + 3 });
}
out.push(`<g class="utilities">${U.join("")}</g>`);

// ─── Fence: thin line with × marks ──────────────────────────────────────
const fence = findLine("rearFence");
{
  const G = [];
  const pts = fence.points;
  G.push(`<polyline points="${pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")}" fill="none" stroke="${C.slate}" stroke-width="0.9"/>`);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    segF("fence", a.x, a.y, b.x, b.y);
    const len = L(Math.hypot(b.x - a.x, b.y - a.y));
    const n = Math.floor(len / 28);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const px = X(a.x) + (X(b.x) - X(a.x)) * t;
      const py = Y(a.y) + (Y(b.y) - Y(a.y)) * t;
      G.push(lnP(px - 2, py - 2, px + 2, py + 2, `stroke="${C.slate}" stroke-width="0.9"`), lnP(px - 2, py + 2, px + 2, py - 2, `stroke="${C.slate}" stroke-width="0.9"`));
      segP("fence", px - 2, py - 2, px + 2, py + 2);
    }
  }
  out.push(`<g class="fence">${G.join("")}</g>`);
}

// ─── Setback and easement lines ─────────────────────────────────────────
{
  const G = [];
  for (const s of ast.lines.filter((l) => l.role === "setback")) {
    const [a, b] = s.points;
    G.push(ln(a.x, a.y, b.x, b.y, `stroke="${C.slate}" stroke-width="1.1" stroke-dasharray="8 5"`));
    segF(`setback-${s.id}`, a.x, a.y, b.x, b.y);
  }
  const [a, b] = easement.points;
  G.push(ln(a.x, a.y, b.x, b.y, `stroke="${C.slate}" stroke-width="1.1" stroke-dasharray="16 4 4 4"`));
  segF("easement", a.x, a.y, b.x, b.y);
  out.push(`<g class="setbacks">${G.join("")}</g>`);
}

// ─── Property lines: heavy phantom line, each side starting and ending on a long dash ─
{
  const G = [];
  const pattern = [22, 4, 4, 4, 4, 4];
  const P = pattern.reduce((t, v) => t + v, 0);
  for (const s of Object.values(sides)) {
    const len = L(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y));
    const n = Math.max(1, Math.round((len - pattern[0]) / P));
    const f = len / (n * P + pattern[0]);
    G.push(ln(s.a.x, s.a.y, s.b.x, s.b.y, `stroke="${C.graphite}" stroke-width="2.4" stroke-dasharray="${pattern.map((v) => +(v * f).toFixed(3)).join(" ")}"`));
    segF("property-line", s.a.x, s.a.y, s.b.x, s.b.y);
  }
  out.push(`<g class="property-lines">${G.join("")}</g>`);
}

// ─── Dimensions: pencil line, graphite 45° slash ticks, slate figures ───
{
  const D = [];
  const DIM = `stroke="${C.pencil}" stroke-width="0.8"`;
  const TICK = `stroke="${C.graphite}" stroke-width="1.3" stroke-linecap="round"`;
  // where each figure sits: along = position along the line (ft), side = which side of the line
  const placement = {
    "26′": { along: 110, side: -1 },
    "9′": { along: 7, side: -1 },
    "19′": { along: 51, side: -1 },
    "18′": { along: 12.5, side: -1 },
    "21′": { along: 13, side: -1 },
    "13′": { along: 51, side: -1 },
    "12′": { along: 48, side: 1 },
  };
  for (const d of distDims) {
    const p = need(placement[d.label], `placement for dimension ${d.label}`);
    const x1 = X(d.from.x), y1 = Y(d.from.y), x2 = X(d.to.x), y2 = Y(d.to.y);
    D.push(lnP(x1, y1, x2, y2, DIM));
    segP(`dim-${d.label}`, x1, y1, x2, y2);
    for (const [x, y] of [[x1, y1], [x2, y2]]) {
      D.push(lnP(x - 4, y + 4, x + 4, y - 4, TICK));
      segP(`tick-${d.label}`, x - 4, y + 4, x + 4, y - 4);
    }
    if (d.from.y === d.to.y) text(`dim-${d.label}`, X(p.along), y1 - 6, d.label, { fs: 11 });
    else text(`dim-${d.label}`, x1 + (p.side < 0 ? -6 : 6 + 11 * 0.74), Y(p.along), d.label, { fs: 11, rotate: -90 });
  }
  out.push(`<g class="dimensions">${D.join("")}</g>`);
  // property-line bearings and distances, set outside the lot (front: in the parkway strip)
  for (const p of plDims) {
    const fs = 10.5;
    if (p.side === "rear") text("pl-rear", X((lot.x0 + lot.x1) / 2), Y(lot.y0) - 10, p.label, { fs, fill: C.graphite });
    if (p.side === "front") text("pl-front", X(30), Y(lot.y1 + 2.5) + 3.8, p.label, { fs, fill: C.graphite });
    if (p.side === "west") text("pl-west", X(lot.x0) - 9 - fs * 0.22, Y((lot.y0 + lot.y1) / 2), p.label, { fs, fill: C.graphite, rotate: -90 });
    if (p.side === "east") text("pl-east", X(lot.x1) + 9 + fs * 0.74, Y((lot.y0 + lot.y1) / 2), p.label, { fs, fill: C.graphite, rotate: -90 });
  }
}

// ─── Plan annotations ───────────────────────────────────────────────────
{
  const A = { fs: 9.5, tracking: 0.4 };
  const up = (s) => s.toUpperCase();
  const sb = (id) => findLine(id).label;
  const mid = (a, b) => (a + b) / 2;
  text("sb-front", X(30), Y(required.front ? lot.y1 - required.front : 0) + 14, up(sb("front")), A);
  text("sb-rear", X(22), Y(mid(lot.y0 + easementWidth, lot.y0 + required.rear)) + 3.5, up(sb("rear")), A);
  text("sb-west", X(mid(lot.x0 + 1, lot.x0 + required.west)) + 3.5, Y(60), up(sb("west")), { ...A, rotate: -90 });
  text("sb-east", X(mid(lot.x1 - required.east, lot.x1 - 1)) + 3.5, Y(46), up(sb("east")), { ...A, rotate: -90 });
  text("easement", X(22), Y(mid(5, lot.y0 + easementWidth)) + 3.5, up(easement.label), A);
  text("fence", X(15), Y(3) + 3.5, up(fence.label), A);
  text("drive", X(mid(driveBox.x0, driveBox.x1)) + 3.5, Y(85), tagged(drive.label), { ...A, rotate: -90 });
  text("front-walk", X(mid(frontWalkBox.x0, frontWalkBox.x1) + 0), Y(mid(frontWalkBox.y0, frontWalkBox.y1)) + 3.5, tagged(frontWalk.label), A);
  text("walk-adu", X(mid(aduWalkBox.x0, aduWalkBox.x1)) + 3.5, Y(52), tagged(aduWalk.label), { ...A, rotate: -90 });
  text("patio", X(mid(patioBox.x0, patioBox.x1)), Y(mid(patioBox.y0, patioBox.y1)) + 3.5, tagged(patio.label), A);
}

// ─── Side panel: site data, setbacks, legend, graphic scale, north ──────
const PX0 = 560;
const PX1 = W - 40;
const P = [];
const head = (id, y, s) => text(id, PX0, y, s, { fs: 9, weight: 600, fill: C.caption, tracking: 1, anchor: "start" });
const rule = (y, strong = false) => {
  P.push(lnP(PX0, y, PX1, y, `stroke="${strong ? C.slate : C.pencil}" stroke-width="${strong ? 0.9 : 0.6}"`));
  segP("rule", PX0, y, PX1, y);
};
{
  // SITE DATA
  let y = 140;
  head("h-site", y, "SITE DATA");
  y += 20;
  text("lot-area", PX0, y, `Lot area ${sf(lotArea)} sf  ·  ${(lot.x1 - lot.x0).toFixed(2)}′ × ${(lot.y1 - lot.y0).toFixed(2)}′`, { fs: 11, fill: C.graphite, anchor: "start" });
  y += 24;
  const cols = [
    { x: 752, h: "EXISTING" },
    { x: 832, h: "PROPOSED" },
    { x: 900, h: "TOTAL" },
    { x: PX1, h: "% OF LOT" },
  ];
  text("h-area", PX0, y, "SURFACE (SF)", { fs: 8.5, weight: 600, fill: C.caption, anchor: "start", tracking: 0.6 });
  for (const c of cols) text(`h-${c.h}`, c.x, y, c.h, { fs: 8.5, weight: 600, fill: C.caption, anchor: "end", tracking: 0.6 });
  y += 7;
  rule(y, true);
  const row = (id, label, e, n, bold = false) => {
    y += 19;
    const w = bold ? 600 : 400;
    const fill = C.graphite;
    text(`${id}-l`, PX0, y, label, { fs: 11, weight: w, fill, anchor: "start" });
    const total = e + n;
    const vals = [e ? sf(e) : "—", n ? sf(n) : "—", sf(total), bold ? pct((total / lotArea) * 100) : ""];
    vals.forEach((v, i) => v && text(`${id}-${i}`, cols[i].x, y, v, { fs: 11, weight: w, fill: v === "—" ? C.pencil : fill, anchor: "end" }));
  };
  const byKey = Object.fromEntries(surfaces.map((s) => [s.key, s]));
  const line = (k) => {
    const s = byKey[k];
    const words = bare(s.label);
    row(k, `(${s.status}) ${words.charAt(0).toUpperCase()}${words.slice(1)}`, s.status === "E" ? s.area : 0, s.status === "N" ? s.area : 0);
  };
  line("house");
  line("adu");
  y += 5;
  rule(y);
  row("coverage", "Building coverage", bldE, bldN, true);
  y += 5;
  rule(y);
  line("drive");
  line("patio");
  line("frontWalk");
  line("aduWalk");
  y += 5;
  rule(y);
  row("impervious", "Impervious surface", impE, impN, true);
  y += 19;
  text("pervious-l", PX0, y, "Pervious (landscape)", { fs: 11, fill: C.graphite, anchor: "start" });
  text("pervious-2", cols[2].x, y, sf(lotArea - impE - impN), { fs: 11, fill: C.graphite, anchor: "end" });
  text("pervious-3", cols[3].x, y, pct(((lotArea - impE - impN) / lotArea) * 100), { fs: 11, fill: C.graphite, anchor: "end" });
  y += 17;
  text("site-note", PX0, y, `Driveway apron in the street right-of-way is not counted.`, { fs: 10, fill: C.caption, anchor: "start" });

  // SETBACKS
  y += 40;
  head("h-setbacks", y, "SETBACKS (FT)");
  y += 22;
  const scol = [
    { x: 752, h: "REQUIRED" },
    { x: 866, h: `(${status(house.label)}) ${bare(house.label).split(" ").at(-1).toUpperCase()}` },
    { x: PX1, h: `(${status(adu.label)}) ${bare(adu.label).split(" ").at(-1).toUpperCase()}` },
  ];
  text("hs-line", PX0, y, "LOT LINE", { fs: 8.5, weight: 600, fill: C.caption, anchor: "start", tracking: 0.6 });
  for (const c of scol) text(`hs-${c.h}`, c.x, y, c.h, { fs: 8.5, weight: 600, fill: C.caption, anchor: "end", tracking: 0.6 });
  y += 7;
  rule(y, true);
  const names = { front: "Front", rear: "Rear", west: "Side (west)", east: "Side (east)" };
  for (const side of ["front", "rear", "west", "east"]) {
    y += 19;
    text(`s-${side}-l`, PX0, y, names[side], { fs: 11, fill: C.graphite, anchor: "start" });
    text(`s-${side}-r`, scol[0].x, y, `${required[side]}`, { fs: 11, fill: C.graphite, anchor: "end" });
    text(`s-${side}-h`, scol[1].x, y, `${houseDist[side]}`, { fs: 11, fill: C.graphite, anchor: "end" });
    text(`s-${side}-a`, scol[2].x, y, `${aduDist[side]}`, { fs: 11, fill: C.graphite, anchor: "end" });
  }
  y += 5;
  rule(y);
  y += 19;
  text("s-sep-l", PX0, y, "Between buildings", { fs: 11, fill: C.graphite, anchor: "start" });
  text("s-sep-v", scol[2].x, y, `${separation}`, { fs: 11, fill: C.graphite, anchor: "end" });
  y += 17;
  text("setback-note", PX0, y, "Measured square to each lot line from the nearest wall.", { fs: 10, fill: C.caption, anchor: "start" });

  // LEGEND
  y += 40;
  head("h-legend", y, "LEGEND");
  const items = [
    ["Property line", (x, yy) => lnP(x, yy, x + 44, yy, `stroke="${C.graphite}" stroke-width="2.4" stroke-dasharray="14 3 3 3 3 3"`)],
    ["Setback line", (x, yy) => lnP(x, yy, x + 44, yy, `stroke="${C.slate}" stroke-width="1.1" stroke-dasharray="8 5"`)],
    ["Easement line", (x, yy) => lnP(x, yy, x + 44, yy, `stroke="${C.slate}" stroke-width="1.1" stroke-dasharray="16 4 4 4"`)],
    ["Fence", (x, yy) => lnP(x, yy, x + 44, yy, `stroke="${C.slate}" stroke-width="0.9"`) + [11, 22, 33].map((d) => lnP(x + d - 2, yy - 2, x + d + 2, yy + 2, `stroke="${C.slate}" stroke-width="0.9"`) + lnP(x + d - 2, yy + 2, x + d + 2, yy - 2, `stroke="${C.slate}" stroke-width="0.9"`)).join("")],
    ["Existing tree", (x, yy) => `<path d="${canopy(x + 22, yy, 7.5, 8)}" fill="none" stroke="${C.slate}" stroke-width="1"/><circle cx="${x + 22}" cy="${yy}" r="1.8" fill="${C.paper}" stroke="${C.slate}" stroke-width="0.9"/>`],
    ["Existing building (E)", (x, yy) => rectP(x + 6, yy - 7, x + 38, yy + 7, `fill="${C.stone}" stroke="${C.graphite}" stroke-width="1.4"`)],
    ["Proposed building (N)", (x, yy) => `<clipPath id="lg-hatch"><rect x="${x + 6}" y="${yy - 7}" width="32" height="14"/></clipPath><path clip-path="url(#lg-hatch)" d="${[0, 1, 2, 3, 4, 5, 6].map((k) => `M${x + 6 + k * 7 - 14} ${yy + 7}L${x + 6 + k * 7} ${yy - 7}`).join("")}" stroke="${C.slate}" stroke-width="0.6"/>` + rectP(x + 6, yy - 7, x + 38, yy + 7, `fill="none" stroke="${C.graphite}" stroke-width="2"`)],
    ["Concrete paving", (x, yy) => rectP(x + 6, yy - 7, x + 38, yy + 7, `fill="${C.mist}" stroke="${C.slate}" stroke-width="0.9"`)],
    ["Water service (W)", (x, yy) => lnP(x, yy, x + 44, yy, `stroke="${C.water}" stroke-width="1.3" stroke-dasharray="9 3.5"`)],
    ["Sewer lateral (SS)", (x, yy) => lnP(x, yy, x + 44, yy, `stroke="${C.slate}" stroke-width="1.3" stroke-dasharray="9 3.5"`)],
    ["Overhead electric (OHE)", (x, yy) => lnP(x, yy, x + 44, yy, `stroke="${C.slate}" stroke-width="0.9"`)],
  ];
  const perCol = Math.ceil(items.length / 2);
  y += 8;
  items.forEach(([label, draw], i) => {
    const col = i < perCol ? 0 : 1;
    const x = PX0 + col * 205;
    const yy = y + 14 + (i - col * perCol) * 22;
    P.push(draw(x, yy));
    rects.push({ id: `legend-sample-${i}`, x0: x - 1, y0: yy - 8, x1: x + 45, y1: yy + 8 });
    text(`legend-${i}`, x + 56, yy + 4, label, { fs: 11, fill: C.graphite, anchor: "start" });
  });
  y += 14 + (perCol - 1) * 22 + 8;

  // GRAPHIC SCALE + NORTH
  const sbY = H - 70;
  const seg = 10;
  const segs4 = Math.round((ast.scale ?? 40) / seg);
  for (let k = 0; k < segs4; k++) P.push(rectP(PX0 + k * L(seg), sbY, PX0 + (k + 1) * L(seg), sbY + 6, `fill="${k % 2 === 0 ? C.graphite : C.paper}" stroke="${C.graphite}" stroke-width="0.8"`));
  rects.push({ id: "scalebar", x0: PX0, y0: sbY, x1: PX0 + segs4 * L(seg), y1: sbY + 6 });
  for (let k = 0; k <= segs4; k++) text(`scale-${k}`, PX0 + k * L(seg), sbY - 5, String(k * seg), { fs: 10, fill: C.caption });
  text("scale-unit", PX0 + segs4 * L(seg) + 12, sbY + 6, "ft", { fs: 10, fill: C.caption, anchor: "start" });
  text("scale-caption", PX0, sbY + 24, "GRAPHIC SCALE", { fs: 9, weight: 600, fill: C.caption, anchor: "start", tracking: 1 });
  const nx = PX1 - 22;
  const ny = sbY + 2;
  P.push(`<circle cx="${nx}" cy="${ny}" r="17" fill="none" stroke="${C.pencil}" stroke-width="1"/>`);
  P.push(`<g transform="rotate(${north} ${nx} ${ny})"><path d="M ${nx} ${ny - 14} L ${nx - 6} ${ny + 9} L ${nx} ${ny + 5} Z" fill="${C.graphite}"/><path d="M ${nx} ${ny - 14} L ${nx + 6} ${ny + 9} L ${nx} ${ny + 5} Z" fill="${C.paper}" stroke="${C.graphite}" stroke-width="1" stroke-linejoin="round"/></g>`);
  rects.push({ id: "north", x0: nx - 17, y0: ny - 17, x1: nx + 17, y1: ny + 17 });
  const rad = (north * Math.PI) / 180;
  text("north-n", nx + 27 * Math.sin(rad), ny - 27 * Math.cos(rad) + 4, "N", { fs: 12, weight: 600, fill: C.graphite });
}
out.push(`<g class="panel">${P.join("")}</g>`);
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
check(overlap(texts.find((t) => t.id === "plate-name"), plate) && texts.filter((t) => t.id.startsWith("plate-")).every((t) => t.x0 >= plate.x0 && t.x1 <= plate.x1 && t.y0 >= plate.y0 && t.y1 <= plate.y1), "the ADU name and size must sit wholly inside the gap cut in its hatch");
for (let a = 0; a < texts.length; a++) {
  const t = texts[a];
  if (t.x0 < 4 || t.y0 < 4 || t.x1 > W - 4 || t.y1 > H - 4) problems.push(`${t.id} leaves the canvas`);
  for (let b = a + 1; b < texts.length; b++) if (overlap(t, texts[b], PAD)) problems.push(`${t.id} overlaps ${texts[b].id}`);
  const padded = { x0: t.x0 - PAD, y0: t.y0 - PAD, x1: t.x1 + PAD, y1: t.y1 + PAD };
  for (const s of segs) if (segHitsBox(s, padded)) problems.push(`${t.id} crosses ${s.id}`);
  for (const rc of rects) if (overlap(padded, rc)) problems.push(`${t.id} overlaps ${rc.id}`);
}
problems.push(...failures);

writeFileSync(new URL("ideal.svg", DIR), out.join("\n") + "\n");
console.log(`lot ${sf(lotArea)} sf · buildings ${sf(bldE)} + ${sf(bldN)} = ${sf(bldE + bldN)} sf (${pct(((bldE + bldN) / lotArea) * 100)}) · impervious ${sf(impE)} + ${sf(impN)} = ${sf(impE + impN)} sf (${pct(((impE + impN) / lotArea) * 100)})`);
console.log(`setbacks required ${JSON.stringify(required)} · residence ${JSON.stringify(houseDist)} · ADU ${JSON.stringify(aduDist)} · separation ${separation} ft · easement ${easementWidth} ft`);
for (const d of dimChecks) console.log(`  dim ${d}`);
console.log(`texts ${texts.length}, segments ${segs.length}, rects ${rects.length}`);
console.log(`problems: ${problems.length}`);
for (const p of [...new Set(problems)]) console.log("  " + p);
process.exitCode = problems.length ? 1 : 0;
