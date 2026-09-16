#!/usr/bin/env node
/** Draws the NFPA 170 and UAE Civil Defence evacuation exemplars.
 *
 *   node scripts/visual-eval/draw-evacuation-exemplar.mjs [nfpa|uae]
 *
 * Both sheets repeat the ISO exemplar's drawing: same canvas, palette, type
 * scale, wall weights, route bands, legend panel and title block. What changes
 * is what the profile requires — the NFPA exit glyph and star location marker,
 * the area of refuge, NOT AN EXIT and no-lift prohibitions and the accessible
 * route on the NFPA sheet; the yellow triangular marker and paired
 * English / Arabic text on the UAE sheet.
 *
 * Building geometry is authored in the plan's own unit on the same lattice as
 * the variant's source.sx, projected to pixels once. Walls are then derived,
 * not drawn by hand: every room edge is split at neighbouring room boundaries
 * and classified by what lies on either side, so an edge with rooms on both
 * sides becomes a thin partition and an edge with a room on one side becomes
 * exterior poche. Pictograms are lifted from the shipped symbol catalogue in
 * visual-eval/symbols/evacuation so the exemplar cannot drift from the library
 * the engine draws with. Finally every text box is tested against every wall,
 * plate, route band, stair, panel and other text box, and the script exits
 * non-zero on any collision.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SYMBOLS = new URL("../../visual-eval/symbols/evacuation/", import.meta.url);
const EXEMPLARS = new URL("../../visual-eval/exemplars/evacuation/", import.meta.url);

// ─── Palette (identical to the ISO exemplar) ────────────────────────────
const C = {
  ink: "#1B2430",      // titles, room names, wall-side door leaves
  body: "#5A646E",     // secondary text, stair names
  caption: "#8A939C",  // captions and footnotes
  rule: "#D6DBDF",     // frame and panel rules
  poche: "#8D959D",    // exterior wall poche
  part: "#B4BBC2",     // partitions, door leaves, swings
  swing: "#C2C8CE",    // swing arcs
  fill: "#F2F4F5",     // room fill; circulation stays white
  paper: "#FFFFFF",
  safe: "#00843D",     // ISO 3864-1 safe condition
  route: "#00A651",    // escape-route band
  fire: "#C8102E",     // fire equipment and prohibition
  mand: "#005387",     // mandatory blue (ISO location marker)
  warn: "#FFCC00",     // warning yellow (UAE location marker)
  assemblyTint: "#EAF4EE",
};
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const W = 1400;
const H = 730;

// ─── Pictograms from the shipped catalogue ──────────────────────────────
// Each catalogue file is one plate drawn on the shared 24-unit grid inside a
// padding/scale wrapper. Strip the wrapper and keep the art at 24 units so it
// can be re-placed at the plan's own sign size.
const artCache = new Map();
function art(name) {
  if (!artCache.has(name)) {
    const src = readFileSync(new URL(`${name}.svg`, SYMBOLS), "utf8");
    const open = src.indexOf('<g transform="translate(8 8) scale(1.25)">');
    if (open < 0) throw new Error(`${name}: catalogue file is not a 24-unit plate`);
    const body = src.slice(open + '<g transform="translate(8 8) scale(1.25)">'.length, src.lastIndexOf("</g>"));
    artCache.set(name, body.trim());
  }
  return artCache.get(name);
}
/** The running figure, reused where a profile changes only the door beside it. */
function runner(mirrored) {
  const plated = art("exit-final").split('<path d="M17.4 3.6')[0];
  const figure = plated.replace(/^\s*<rect[^>]*\/>\s*/, "").trim();
  return mirrored ? `<g transform="translate(24 0) scale(-1 1)">\n${figure}\n</g>` : figure;
}
const PLATE = (colour, w = 24) => `<rect x="0" y="0" width="${w}" height="24" rx="2" fill="${colour}"/>`;

/**
 * NFPA 170 exit: the same running figure beside a plain rectangular door leaf
 * instead of the ISO three-sided doorway. `final` adds the discharge threshold.
 */
function nfpaExit(hand, final) {
  const m = hand === "left";
  const doorX = m ? 3.5 : 16.3;
  return [
    PLATE(C.safe),
    runner(m),
    `<rect x="${doorX}" y="3.8" width="4.2" height="${final ? 14.6 : 16.4}" rx="0.4" fill="none" stroke="#fff" stroke-width="1.7"/>`,
    final ? `<path d="M${doorX - 0.7} 22 H${doorX + 4.9}" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>` : "",
  ].join("\n");
}
/** Combination escape-route sign: pictogram and arrow, equally weighted, 48x24. */
function combo(hand, profile) {
  const m = hand === "left";
  const figDx = m ? 24 : 0;
  const arrDx = m ? 0 : 24;
  const x = (v) => figDx + (m ? 24 - v : v);
  const ax = (v) => arrDx + (m ? 24 - v : v);
  const door = profile === "nfpa"
    ? `<rect x="${figDx + (m ? 3.5 : 16.3)}" y="3.8" width="4.2" height="16.4" rx="0.4" fill="none" stroke="#fff" stroke-width="1.7"/>`
    : `<path d="M${x(17.4)} 3.6 H${x(22.3)} V20.5 H${x(17.4)}" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>`;
  const figure = `<g transform="translate(${figDx} 0)${m ? " translate(24 0) scale(-1 1)" : ""}">${runner(false)}</g>`;
  const arrow = `<path d="M${ax(3)} 9 H${ax(13)} V4.5 L${ax(21)} 12 L${ax(13)} 19.5 V15 H${ax(3)} Z" fill="#fff"/>`;
  return [PLATE(C.safe, 48), figure, door, arrow].join("\n");
}
/** NFPA location marker: eight-point star on a safe-green plate. */
const hereNfpa = [
  PLATE(C.safe),
  `<polygon points="12,2.5 15,9 21.5,12 15,15 12,21.5 9,15 2.5,12 9,9" fill="#fff"/>`,
  `<circle cx="12" cy="12" r="2" fill="${C.ink}"/>`,
].join("\n");
/** UAE location marker: dark target on the warning-yellow triangle. */
const hereUae = [
  `<polygon points="12,1 23,22 1,22" fill="${C.warn}"/>`,
  `<circle cx="12" cy="14" r="4" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`,
  `<circle cx="12" cy="14" r="1.4" fill="${C.ink}"/>`,
].join("\n");
/** ISO location marker: not a sign, a plain blue bull's-eye. */
const hereIso = [
  `<circle cx="12" cy="12" r="12" fill="${C.mand}"/>`,
  `<circle cx="12" cy="12" r="7" fill="none" stroke="#fff" stroke-width="1.6"/>`,
  `<circle cx="12" cy="12" r="2.5" fill="#fff"/>`,
].join("\n");
/** NOT AN EXIT: US practice sets this as text, not a pictogram. */
const notAnExit = [
  `<rect x="0" y="0" width="48" height="24" rx="2" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>`,
  `<text x="24" y="11.4" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8.4" font-weight="700" fill="${C.ink}">NOT AN</text>`,
  `<text x="24" y="20" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8.4" font-weight="700" fill="${C.ink}">EXIT</text>`,
].join("\n");

const GLYPH = {
  "exit-final": () => art("exit-final"),
  "exit-final-left": () => `<g transform="translate(24 0) scale(-1 1)">${art("exit-final")}</g>`,
  "exit-direction-right": () => combo("right", "iso"),
  "exit-direction-left": () => combo("left", "iso"),
  "nfpa-exit-final": () => nfpaExit("right", true),
  "nfpa-exit-final-left": () => nfpaExit("left", true),
  "nfpa-exit-direction-right": () => combo("right", "nfpa"),
  "nfpa-exit-direction-left": () => combo("left", "nfpa"),
  assembly: () => art("assembly-point"),
  extinguisher: () => art("fire-extinguisher"),
  "hose-reel": () => art("fire-hose-reel"),
  "call-point": () => art("fire-alarm-call-point"),
  "first-aid": () => art("first-aid"),
  aed: () => art("aed"),
  refuge: () => art("evacuation-temporary-refuge"),
  "no-elevator": () => art("no-elevator"),
  "not-an-exit": () => notAnExit,
  "here-nfpa": () => hereNfpa,
  "here-uae": () => hereUae,
  "here-iso": () => hereIso,
};
const GLYPH_W = new Set([
  "exit-direction-right", "exit-direction-left",
  "nfpa-exit-direction-right", "nfpa-exit-direction-left", "not-an-exit",
]);

// ─── Sheet state ────────────────────────────────────────────────────────
let out, texts, solids, K, OX, OY, SIGN;
// Panels own their own contents: a legend row is allowed to sit on the legend.
let zone = null;
const r2 = (n) => +n.toFixed(2);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const X = (u) => r2(OX + u * K);
const Y = (u) => r2(OY + u * K);
const L = (u) => r2(u * K);

const textWidth = (s, fs, weight = 400, tracking = 0) =>
  [...s].length * fs * (weight >= 600 ? 0.62 : 0.56) + Math.max(0, [...s].length - 1) * tracking;

function text(id, x, y, s, o = {}) {
  const { fs = 11, weight = 400, fill = C.ink, anchor = "middle", tracking = 0, rtl = false } = o;
  const w = textWidth(s, fs, weight, tracking);
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  texts.push({ id, zone, x0, y0: y - fs * 0.74, x1: x0 + w, y1: y + fs * 0.22 });
  const attrs = [
    `x="${r2(x)}"`, `y="${r2(y)}"`, `font-family="${FONT}"`, `font-size="${fs}"`,
    weight >= 600 ? `font-weight="${weight}"` : "", `fill="${fill}"`,
    `text-anchor="${anchor}"`, tracking ? `letter-spacing="${tracking}"` : "",
    rtl ? `direction="rtl"` : "",
  ].filter(Boolean).join(" ");
  out.push(`<text ${attrs}>${esc(s)}</text>`);
}
/** A solid the labels must keep clear of. */
function solid(id, x0, y0, x1, y1) {
  solids.push({ id, zone, x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) });
}

// ─── Walls derived from the room lattice ────────────────────────────────
const EPS = 1e-4;
function roomAt(rooms, x, y) {
  return rooms.find((r) => x > r.x + EPS && x < r.x + r.w - EPS && y > r.y + EPS && y < r.y + r.h - EPS);
}
/**
 * Split every room edge at neighbouring room boundaries and classify each piece
 * by what lies on either side: rooms both sides = partition, room one side =
 * exterior poche, neither = nothing.
 */
function wallSegments(rooms, axis) {
  const lines = [...new Set(rooms.flatMap((r) => (axis === "v" ? [r.x, r.x + r.w] : [r.y, r.y + r.h])))].sort((a, b) => a - b);
  const cuts = [...new Set(rooms.flatMap((r) => (axis === "v" ? [r.y, r.y + r.h] : [r.x, r.x + r.w])))].sort((a, b) => a - b);
  const pieces = [];
  for (const line of lines) {
    for (let i = 0; i < cuts.length - 1; i += 1) {
      const [a, b] = [cuts[i], cuts[i + 1]];
      const mid = (a + b) / 2;
      const lo = axis === "v" ? roomAt(rooms, line - EPS * 10, mid) : roomAt(rooms, mid, line - EPS * 10);
      const hi = axis === "v" ? roomAt(rooms, line + EPS * 10, mid) : roomAt(rooms, mid, line + EPS * 10);
      // The same room on both sides is not a wall: a room simply spans a line
      // that is a real boundary further along.
      if ((!lo && !hi) || lo === hi) continue;
      pieces.push({ line, a, b, kind: lo && hi ? "part" : "ext", outside: lo ? 1 : -1 });
    }
  }
  // merge runs of the same line and kind
  const merged = [];
  for (const p of pieces) {
    const last = merged[merged.length - 1];
    if (last && last.line === p.line && last.kind === p.kind && last.outside === p.outside && Math.abs(last.b - p.a) < EPS) last.b = p.b;
    else merged.push({ ...p });
  }
  return merged;
}
/** Subtract door openings from a wall run, returning the pieces that remain. */
function minus(a, b, gaps) {
  let spans = [[a, b]];
  for (const [g0, g1] of gaps) {
    spans = spans.flatMap(([s0, s1]) => {
      if (g1 <= s0 + EPS || g0 >= s1 - EPS) return [[s0, s1]];
      const kept = [];
      if (g0 > s0 + EPS) kept.push([s0, g0]);
      if (g1 < s1 - EPS) kept.push([g1, s1]);
      return kept;
    });
  }
  return spans.filter(([s0, s1]) => s1 - s0 > EPS);
}

// ─── Doors ──────────────────────────────────────────────────────────────
function sharedEdge(rooms, aId, bId) {
  const a = rooms.find((r) => r.id === aId);
  const b = rooms.find((r) => r.id === bId);
  if (!a || !b) throw new Error(`door between unknown rooms ${aId}/${bId}`);
  const ovY = [Math.max(a.y, b.y), Math.min(a.y + a.h, b.y + b.h)];
  const ovX = [Math.max(a.x, b.x), Math.min(a.x + a.w, b.x + b.w)];
  if (Math.abs(a.x + a.w - b.x) < EPS || Math.abs(b.x + b.w - a.x) < EPS) {
    if (ovY[1] - ovY[0] < EPS) throw new Error(`${aId}/${bId} touch at a corner, not a wall`);
    return { axis: "v", line: Math.abs(a.x + a.w - b.x) < EPS ? a.x + a.w : b.x + b.w, lo: ovY[0], hi: ovY[1], a, b };
  }
  if (Math.abs(a.y + a.h - b.y) < EPS || Math.abs(b.y + b.h - a.y) < EPS) {
    if (ovX[1] - ovX[0] < EPS) throw new Error(`${aId}/${bId} touch at a corner, not a wall`);
    return { axis: "h", line: Math.abs(a.y + a.h - b.y) < EPS ? a.y + a.h : b.y + b.h, lo: ovX[0], hi: ovX[1], a, b };
  }
  throw new Error(`${aId}/${bId} do not share a wall`);
}
function resolveDoors(rooms, doors) {
  return doors.map((d) => {
    if (d.between) {
      const e = sharedEdge(rooms, d.between[0], d.between[1]);
      const c = e.lo + (e.hi - e.lo) * (d.at ?? 0.5);
      return { ...d, axis: e.axis, line: e.line, g0: c - d.width / 2, g1: c + d.width / 2, rooms: [e.a, e.b] };
    }
    const r = rooms.find((x) => x.id === d.room);
    const horizontal = d.side === "north" || d.side === "south";
    const line = d.side === "north" ? r.y : d.side === "south" ? r.y + r.h : d.side === "west" ? r.x : r.x + r.w;
    const lo = horizontal ? r.x : r.y;
    const hi = horizontal ? r.x + r.w : r.y + r.h;
    const c = lo + (hi - lo) * (d.at ?? 0.5);
    return { ...d, axis: horizontal ? "h" : "v", line, g0: c - d.width / 2, g1: c + d.width / 2, rooms: [r], exterior: true };
  });
}

// ─── Plan drawing ───────────────────────────────────────────────────────
function drawPlan(s) {
  const { rooms, ext, part } = s;
  const doors = resolveDoors(rooms, s.doors).map((d) => ({ ...d, ext }));

  out.push("<g>");
  for (const r of rooms) {
    out.push(`<rect x="${X(r.x)}" y="${Y(r.y)}" width="${L(r.w)}" height="${L(r.h)}" fill="${r.circulation ? C.paper : C.fill}"/>`);
  }
  out.push("</g>");

  // Assembly-point apron, drawn under the routes.
  if (s.assembly) {
    const a = s.assembly;
    out.push(`<rect x="${X(a.x - a.w / 2)}" y="${Y(a.y - a.h / 2)}" width="${L(a.w)}" height="${L(a.h)}" rx="6" fill="${C.assemblyTint}" stroke="${C.safe}" stroke-width="1.6" stroke-dasharray="7 5"/>`);
  }

  // Stairs and lift shafts sit under the route bands: escape runs over the treads.
  for (const f of s.fixtures ?? []) {
    const x = X(f.x);
    const y = Y(f.y);
    const w = L(f.w);
    const h = L(f.h);
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.paper}" stroke="${C.part}" stroke-width="1"/>`);
    solid(`fixture-${f.id}`, x, y, x + w, y + h);
    if (f.kind === "stairs") {
      // Treads run across the flight, so they follow its short side.
      const along = f.h > f.w ? f.h : f.w;
      const treads = Math.max(2, Math.round(along / f.tread));
      for (let i = 0; i <= treads; i += 1) {
        if (f.h > f.w) {
          const ty = r2(y + (h * i) / treads);
          out.push(`<line x1="${x}" y1="${ty}" x2="${r2(x + w)}" y2="${ty}" stroke="${C.part}" stroke-width="1"/>`);
        } else {
          const tx = r2(x + (w * i) / treads);
          out.push(`<line x1="${tx}" y1="${y}" x2="${tx}" y2="${r2(y + h)}" stroke="${C.part}" stroke-width="1"/>`);
        }
      }
    } else {
      out.push(`<path d="M${x} ${y} L${r2(x + w)} ${r2(y + h)} M${r2(x + w)} ${y} L${x} ${r2(y + h)}" stroke="${C.part}" stroke-width="1" fill="none"/>`);
    }
  }

  drawRoutes(s);

  // Exterior poche, then partitions, both cut by the door openings.
  for (const axis of ["h", "v"]) {
    for (const seg of wallSegments(rooms, axis)) {
      const gaps = doors.filter((d) => d.axis === axis && Math.abs(d.line - seg.line) < EPS).map((d) => [d.g0, d.g1]);
      const th = seg.kind === "ext" ? ext : part;
      for (const [a, b] of minus(seg.a, seg.b, gaps)) {
        const near = seg.kind === "ext" ? (seg.outside === 1 ? seg.line : seg.line - th) : seg.line - th / 2;
        const [x0, y0, w, h] = axis === "v"
          ? [X(near), Y(a), L(th), L(b - a)]
          : [X(a), Y(near), L(b - a), L(th)];
        out.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${seg.kind === "ext" ? C.poche : C.part}"/>`);
        solid(`wall-${axis}-${seg.line}-${a}`, x0, y0, x0 + w, y0 + h);
      }
    }
  }

  for (const d of doors) drawDoor(d);
  for (const sg of s.signs) drawSign(s, sg);
  drawLabels(s);
}

function drawDoor(d) {
  const w = d.g1 - d.g0;
  if (d.exterior) {
    // Final-discharge doorways read as a leaf filling the opening, not a swing.
    const th = d.ext;
    const [x0, y0, ww, hh] = d.axis === "h"
      ? [X(d.g0), Y(d.side === "north" ? d.line - th : d.line), L(w), L(th)]
      : [X(d.side === "west" ? d.line - th : d.line), Y(d.g0), L(th), L(w)];
    out.push(`<rect x="${x0}" y="${y0}" width="${ww}" height="${hh}" fill="${C.paper}" stroke="${C.part}" stroke-width="1"/>`);
    return;
  }
  const fire = d.fire === true;
  const leafCol = fire ? C.ink : C.part;
  const arcCol = fire ? C.part : C.swing;
  const sign = d.open === "back" ? -1 : 1; // which side of the wall the leaf swings to
  const hx0 = d.axis === "h" ? d.g0 : Math.min(d.line, d.line + sign * w);
  const hx1 = d.axis === "h" ? d.g1 : Math.max(d.line, d.line + sign * w);
  const hy0 = d.axis === "h" ? Math.min(d.line, d.line + sign * w) : d.g0;
  const hy1 = d.axis === "h" ? Math.max(d.line, d.line + sign * w) : d.g1;
  solid(`door-${d.axis}-${r2(d.line)}-${r2(d.g0)}`, X(hx0), Y(hy0), X(hx1), Y(hy1));
  const hingeAtEnd = d.hinge === "end";
  if (d.axis === "h") {
    const hx = hingeAtEnd ? d.g1 : d.g0;
    const tipY = d.line + sign * w;
    out.push(`<path d="M${X(hx)} ${Y(d.line)} L${X(hx)} ${Y(tipY)}" stroke="${leafCol}" stroke-width="${fire ? 3.2 : 2}" stroke-linecap="round"/>`);
    out.push(`<path d="M${X(hx)} ${Y(tipY)} A ${L(w)} ${L(w)} 0 0 ${(sign > 0) === hingeAtEnd ? 1 : 0} ${X(hingeAtEnd ? d.g0 : d.g1)} ${Y(d.line)}" fill="none" stroke="${arcCol}" stroke-width="1"/>`);
    if (fire) out.push(`<circle cx="${X(hx)}" cy="${Y(d.line)}" r="2.6" fill="${C.ink}"/>`);
  } else {
    const hy = hingeAtEnd ? d.g1 : d.g0;
    const tipX = d.line + sign * w;
    out.push(`<path d="M${X(d.line)} ${Y(hy)} L${X(tipX)} ${Y(hy)}" stroke="${leafCol}" stroke-width="${fire ? 3.2 : 2}" stroke-linecap="round"/>`);
    out.push(`<path d="M${X(tipX)} ${Y(hy)} A ${L(w)} ${L(w)} 0 0 ${(sign > 0) === hingeAtEnd ? 0 : 1} ${X(d.line)} ${Y(hingeAtEnd ? d.g0 : d.g1)}" fill="none" stroke="${arcCol}" stroke-width="1"/>`);
    if (fire) out.push(`<circle cx="${X(d.line)}" cy="${Y(hy)}" r="2.6" fill="${C.ink}"/>`);
  }
}

// ─── Escape routes ──────────────────────────────────────────────────────
const WHEELCHAIR = `<circle cx="10.8" cy="5.3" r="1.9" fill="#fff"/>
<path d="M10.3 8.5 L11 13 H15 L18 18 H20 M11 10 H15" fill="none" stroke="#fff" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8.3 11.2 A5 5 0 1 0 13.8 18.4" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;

function polyline(pts) {
  const legs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    legs.push({ x0, y0, x1, y1, len, at: total });
    total += len;
  }
  return { legs, total, at: (t) => {
    const leg = legs.find((l) => t <= l.at + l.len + EPS) ?? legs[legs.length - 1];
    const f = Math.min(1, Math.max(0, (t - leg.at) / leg.len));
    return { x: leg.x0 + (leg.x1 - leg.x0) * f, y: leg.y0 + (leg.y1 - leg.y0) * f,
             dx: (leg.x1 - leg.x0) / leg.len, dy: (leg.y1 - leg.y0) / leg.len };
  } };
}
function drawRoutes(s) {
  const band = L(s.bandWidth);
  for (const rt of s.routes) {
    const p = polyline(rt.pts);
    const d = rt.pts.map(([x, y], i) => `${i ? "L" : "M"}${X(x)} ${Y(y)}`).join(" ");
    const dash = rt.kind === "secondary" ? ` stroke-dasharray="${r2(band * 7.5)} ${r2(band * 2)}"` : "";
    out.push(`<path d="${d}" fill="none" stroke="${C.route}" stroke-width="${band}" stroke-linecap="butt" stroke-linejoin="round"${dash}/>`);
    for (const leg of p.legs) {
      solid(`route-${rt.kind}`,
        X(Math.min(leg.x0, leg.x1)) - (leg.x0 === leg.x1 ? band / 2 : 0),
        Y(Math.min(leg.y0, leg.y1)) - (leg.y0 === leg.y1 ? band / 2 : 0),
        X(Math.max(leg.x0, leg.x1)) + (leg.x0 === leg.x1 ? band / 2 : 0),
        Y(Math.max(leg.y0, leg.y1)) + (leg.y0 === leg.y1 ? band / 2 : 0));
    }
    // Chevrons point away from the reader, one every `chevron` units of building.
    const marks = [];
    for (let t = s.chevron; t < p.total - s.chevron * 0.35; t += s.chevron) {
      const q = p.at(t);
      if (rt.kind === "secondary") {
        // one chevron per dash, so a chevron never lands in a gap
        const period = (band * 9.5) / K;
        const phase = t % period;
        if (phase > (band * 7.5) / K - 0.1) continue;
      }
      const tip = { x: X(q.x) + q.dx * band * 0.0, y: Y(q.y) + q.dy * 0 };
      const len = band * 0.975;
      const half = band * 0.425;
      const bx = tip.x - q.dx * len;
      const by = tip.y - q.dy * len;
      marks.push(`<path d="M${r2(tip.x)} ${r2(tip.y)} L${r2(bx - q.dy * half)} ${r2(by + q.dx * half)} L${r2(bx + q.dy * half)} ${r2(by - q.dx * half)} Z" fill="#FFFFFF"/>`);
    }
    out.push(marks.join(""));
    if (rt.kind === "accessible") {
      const q = p.at(p.total * (rt.markerAt ?? 0.5));
      const k = (band * 1.25) / 24;
      out.push(`<g transform="translate(${r2(X(q.x) - 12 * k)} ${r2(Y(q.y) - 12 * k)}) scale(${r2(k)})">${WHEELCHAIR}</g>`);
    }
  }
}

// ─── Signs ──────────────────────────────────────────────────────────────
function drawSign(s, sg) {
  const wide = GLYPH_W.has(sg.kind);
  const size = (sg.size ?? 1) * SIGN;
  const w = size * (wide ? 2 : 1);
  const k = size / 24;
  const px = X(sg.x) - w / 2;
  const py = Y(sg.y) - size / 2;
  out.push(`<g transform="translate(${r2(px)} ${r2(py)}) scale(${r2(k)})">\n${GLYPH[sg.kind]()}\n</g>`);
  solid(`sign-${sg.kind}-${sg.x}`, px, py, px + w, py + size);
  if (!sg.label) return;
  const lines = Array.isArray(sg.label) ? sg.label : [sg.label];
  const fs = sg.fs ?? 9;
  const pos = sg.at ?? "above";
  const cx = X(sg.x);
  let tx = cx;
  let ty = py - 5;
  let anchor = "middle";
  if (pos === "below") ty = py + size + fs + 2;
  if (pos === "left") { tx = px - 6; ty = Y(sg.y) + fs * 0.36; anchor = "end"; }
  if (pos === "right") { tx = px + w + 6; ty = Y(sg.y) + fs * 0.36; anchor = "start"; }
  if (pos === "above") ty = py - 5 - (lines.length - 1) * (fs + 2);
  // A sign at the building edge puts its caption clear of the wall, in plan
  // coordinates, the way a posted plan sets "FINAL EXIT" outside the poche.
  if (sg.labelXY) { tx = X(sg.labelXY[0]); ty = Y(sg.labelXY[1]); anchor = sg.anchor ?? "middle"; }
  lines.forEach((line, i) => {
    text(`label-${sg.kind}-${sg.x}-${i}`, tx, r2(ty + i * (fs + 2)), line, {
      fs: i === 0 ? fs : fs - 0.5, weight: i === 0 ? (sg.weight ?? 600) : 400,
      fill: i === 0 ? (sg.fill ?? C.safe) : C.body, anchor, rtl: sg.rtl && i > 0,
    });
  });
}

// ─── Room labels placed in measured free space ──────────────────────────
const hits = (a, b) =>
  !(a.zone && a.zone === b.zone) &&
  a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5;
function boxes(lines, x, y, fs) {
  return lines.map((line, i) => {
    const size = i === 0 ? fs : fs - 2;
    const w = textWidth(line.text, size, line.weight ?? 400, line.tracking ?? 0);
    const yy = y + i * (fs + 2);
    return { x0: x - w / 2, x1: x + w / 2, y0: yy - size * 0.74, y1: yy + size * 0.22 };
  });
}
function place(room, lines, fs) {
  const cx = X(room.x + room.w / 2);
  const cy = Y(room.y + room.h / 2);
  const inner = { x0: X(room.x) + 4, y0: Y(room.y) + 4, x1: X(room.x + room.w) - 4, y1: Y(room.y + room.h) - 4 };
  const dy = L(room.h);
  const dx = L(room.w);
  // Search the room for free space: centre first, then up and down, then the
  // quarter positions left and right of centre.
  const steps = [0, -0.22, 0.22, -0.33, 0.33, -0.4, 0.4];
  const offsets = room.labelAt
    ? [[X(room.labelAt[0]) - cx, Y(room.labelAt[1]) - cy]]
    : [
        ...steps.map((f) => [0, dy * f]),
        ...[-0.26, 0.26, -0.34, 0.34].flatMap((g) => steps.map((f) => [dx * g, dy * f])),
      ];
  const base = cy - ((lines.length - 1) * (fs + 2)) / 2 + fs * 0.3;
  for (const [ox, oy] of offsets) {
    const bs = boxes(lines, cx + ox, base + oy, fs);
    const inside = room.labelAt || bs.every((b) => b.x0 >= inner.x0 && b.x1 <= inner.x1 && b.y0 >= inner.y0 && b.y1 <= inner.y1);
    const clear = bs.every((b) => !solids.some((s) => hits(b, s)) && !texts.some((t) => hits(b, t)));
    if (inside && clear) return { x: cx + ox, y: base + oy };
    if (room.labelAt) {
      const why = bs.flatMap((b) => [
        ...solids.filter((sd) => hits(b, sd)).map((sd) => sd.id),
        ...texts.filter((t) => hits(b, t)).map((t) => t.id),
      ]);
      throw new Error(`"${room.label}" pinned label hits ${why.join(", ") || "the room edge"}`);
    }
  }
  return null;
}
function drawLabels(s) {
  for (const room of s.rooms) {
    if (!room.label) continue;
    const fs = room.fs ?? 12;
    const lines = [{ text: room.label, weight: 400 }];
    if (room.ar) lines.push({ text: room.ar, weight: 400 });
    const at = place(room, lines, fs);
    if (!at) throw new Error(`no free space for the "${room.label}" label`);
    lines.forEach((line, i) => {
      text(`room-${room.id}-${i}`, at.x, r2(at.y + i * (fs + 2)), line.text, {
        fs: i === 0 ? fs : fs - 2,
        fill: i === 0 ? (room.dim ? C.body : C.ink) : C.body,
        tracking: room.tracking ?? 0,
        rtl: i > 0,
      });
    });
  }
}

// ─── Legend (Tier M: every symbol on the plan is listed) ────────────────
function legendSwatch(kind, x, y) {
  const band = 9;
  if (kind === "primary" || kind === "secondary" || kind === "accessible") {
    const dash = kind === "secondary" ? ` stroke-dasharray="17 5"` : "";
    const pieces = [`<path d="M${x} ${y} h42" stroke="${C.route}" stroke-width="${band}" stroke-linecap="butt"${dash}/>`];
    pieces.push(`<path d="M${x + 25} ${y} L${x + 18} ${y - 4.4} L${x + 18} ${y + 4.4} Z" fill="#fff"/>`);
    if (kind === "accessible") pieces.push(`<g transform="translate(${x + 1} ${y - 5.5}) scale(0.46)">${WHEELCHAIR}</g>`);
    return pieces.join("");
  }
  if (kind === "fire-door") {
    return `<path d="M${x + 4} ${y + 7} L${x + 4} ${y - 7}" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<circle cx="${x + 4}" cy="${y + 7}" r="2.6" fill="${C.ink}"/>` +
      `<path d="M${x + 4} ${y - 7} A 14 14 0 0 1 ${x + 18} ${y + 7}" fill="none" stroke="${C.part}" stroke-width="1" stroke-dasharray="3 3"/>`;
  }
  if (kind === "stair") {
    const bars = [];
    for (let i = 1; i < 5; i += 1) bars.push(`<line x1="${x + i * 8.4}" y1="${y - 7}" x2="${x + i * 8.4}" y2="${y + 7}" stroke="${C.part}" stroke-width="1"/>`);
    return `<rect x="${x}" y="${y - 7}" width="42" height="14" fill="#fff" stroke="${C.part}" stroke-width="1"/>${bars.join("")}`;
  }
  if (kind === "elevator") {
    return `<rect x="${x + 8}" y="${y - 8}" width="26" height="16" fill="#fff" stroke="${C.part}" stroke-width="1"/>` +
      `<path d="M${x + 8} ${y - 8} L${x + 34} ${y + 8} M${x + 34} ${y - 8} L${x + 8} ${y + 8}" stroke="${C.part}" stroke-width="1" fill="none"/>`;
  }
  const wide = GLYPH_W.has(kind);
  const k = 22 / 24;
  const px = wide ? x : x + 11;
  return `<g transform="translate(${px} ${y - 11}) scale(${r2(k)})">${GLYPH[kind]()}</g>`;
}
function drawLegend(s) {
  zone = "legend";
  const P = { x: 1058, y: 148, w: 322, h: 532 };
  out.push(`<rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="4" fill="${C.paper}" stroke="${C.rule}" stroke-width="1"/>`);
  solid("legend-panel", P.x, P.y, P.x + P.w, P.y + P.h);
  const lx = P.x + 16;
  text("legend-title", lx, P.y + 22, s.legendTitle ?? "LEGEND", { fs: 11, weight: 600, anchor: "start", tracking: 1.4 });
  if (s.legendTitleAr) text("legend-title-ar", P.x + P.w - 16, P.y + 22, s.legendTitleAr, { fs: 10, fill: C.body, anchor: "end", rtl: true });
  out.push(`<line x1="${lx}" y1="${P.y + 30}" x2="${P.x + P.w - 16}" y2="${P.y + 30}" stroke="${C.rule}" stroke-width="1"/>`);
  const rows = s.legend.reduce((n, sec) => n + sec.rows.length, 0);
  const bilingual = s.legend.some((sec) => sec.rows.some((r) => r.ar));
  const rowPitch = bilingual ? 28 : 24;
  const headPitch = 16;
  let y = P.y + 45;
  for (const [i, sec] of s.legend.entries()) {
    if (i) y += 12;
    text(`legend-head-${sec.title}`, lx, y, sec.ar ? `${sec.title}  ·  ${sec.ar}` : sec.title,
      { fs: 9, weight: 600, fill: C.caption, anchor: "start", tracking: 1 });
    y += headPitch;
    for (const row of sec.rows) {
      const cy = y + rowPitch / 2 - 4;
      out.push(legendSwatch(row.kind, lx, cy));
      text(`legend-${row.label}`, lx + 52, cy + 4, row.label, { fs: 11, anchor: "start" });
      if (row.ar) text(`legend-ar-${row.label}`, P.x + P.w - 16, cy + 16, row.ar, { fs: 9.5, fill: C.body, anchor: "end", rtl: true });
      y += rowPitch;
    }
  }
  const foot = P.y + P.h - 12;
  if (y > foot - 6) throw new Error(`legend overflows its panel by ${r2(y - foot + 6)} px (${rows} rows)`);
  text("legend-foot", lx, foot, s.legendNote, { fs: 9, fill: C.caption, anchor: "start" });
  zone = null;
}

// ─── Action panel, north point, scale bar, title block ──────────────────
function drawActions(s) {
  zone = "action";
  const P = s.actionPanel;
  out.push(`<rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="4" fill="${C.paper}" stroke="${C.rule}" stroke-width="1"/>`);
  solid("action-panel", P.x, P.y, P.x + P.w, P.y + P.h);
  text("action-title", P.x + 16, P.y + 22, s.actionTitle, { fs: 11, weight: 600, anchor: "start", tracking: 1.4 });
  if (s.actionTitleAr) text("action-title-ar", P.x + P.w - 16, P.y + 22, s.actionTitleAr, { fs: 10, fill: C.body, anchor: "end", rtl: true });
  out.push(`<line x1="${P.x + 16}" y1="${P.y + 30}" x2="${P.x + P.w - 16}" y2="${P.y + 30}" stroke="${C.rule}" stroke-width="1"/>`);
  s.actions.forEach((step, i) => {
    const cy = P.y + 48 + i * 21;
    out.push(`<circle cx="${P.x + 23}" cy="${cy - 3}" r="7.5" fill="${C.ink}"/>`);
    text(`step-n-${i}`, P.x + 23, cy, String(i + 1), { fs: 9, weight: 600, fill: C.paper });
    text(`step-${i}`, P.x + 40, cy + 1, step.en, { fs: 11, anchor: "start" });
    if (step.ar) text(`step-ar-${i}`, P.x + P.w - 16, cy + 1, step.ar, { fs: 10.5, fill: C.body, anchor: "end", rtl: true });
  });
  text("action-foot", P.x + 16, P.y + P.h - 14, s.actionFoot, { fs: 9, fill: C.caption, anchor: "start" });
  zone = null;
}
function drawNorth(s) {
  const [cx, cy] = s.north;
  const r = 28.67;
  out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.part}" stroke-width="1"/>`);
  out.push(`<path d="M${cx} ${cy - 22.4} L${cx + 9.75} ${cy + 17.8} L${cx} ${cy + 8.6} Z" fill="${C.ink}"/>`);
  out.push(`<path d="M${cx} ${cy - 22.4} L${cx - 9.75} ${cy + 17.8} L${cx} ${cy + 8.6} Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="1"/>`);
  solid("north", cx - r, cy - r, cx + r, cy + r);
  text("north-n", cx, cy + 41.7, "N", { fs: 10, weight: 600, fill: C.body });
}
function drawScale(s) {
  const [x, y] = s.scaleBar;
  const step = L(s.scaleStep);
  for (let i = 0; i < 3; i += 1) {
    out.push(`<rect x="${r2(x + i * step)}" y="${y}" width="${r2(step)}" height="6.55" fill="${i % 2 ? C.paper : C.ink}" stroke="${C.ink}" stroke-width="1"/>`);
  }
  solid("scale-bar", x, y, x + step * 3, y + 6.55);
  for (let i = 0; i < 4; i += 1) {
    const lab = i === 3 ? `${s.scaleStep * 3} ${s.unit}` : String(s.scaleStep * i);
    text(`scale-${i}`, r2(x + i * step), y - 4.37, lab, { fs: 9, fill: C.caption });
  }
  text("scale-note", x, y + 22.4, s.scaleNote, { fs: 10, fill: C.body, anchor: "start" });
}

// ─── Sheet ──────────────────────────────────────────────────────────────
function draw(s) {
  out = [];
  texts = [];
  solids = [];
  K = s.K;
  OX = s.OX;
  OY = s.OY;
  SIGN = s.signPx;

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  out.push(`<title>${esc(s.title)}</title>`);
  out.push(`<desc>${esc(s.desc)}</desc>`);
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${C.paper}"/>`);
  out.push(`<rect x="16" y="16" width="${W - 32}" height="${H - 32}" fill="none" stroke="${C.rule}" stroke-width="1"/>`);

  text("title", 40, 58, s.title, { fs: 18, weight: 600, anchor: "start" });
  text("subtitle", 40, 80, s.subtitle, { fs: 11, fill: C.body, anchor: "start" });
  text("block-1", W - 20, 58, s.block1, { fs: 11, weight: 600, fill: C.body, anchor: "end", tracking: 0.6 });
  text("block-2", W - 20, 80, s.block2, { fs: 11, fill: C.body, anchor: "end", rtl: Boolean(s.block2Rtl) });
  out.push(`<line x1="40" y1="96" x2="${W - 20}" y2="96" stroke="${C.rule}" stroke-width="1"/>`);

  drawPlan(s);
  drawNorth(s);
  drawScale(s);
  drawLegend(s);
  drawActions(s);

  text("foot-left", 40, 706, s.footLeft, { fs: 9, fill: C.caption, anchor: "start" });
  text("foot-right", W - 20, 706, s.footRight, { fs: 9, fill: C.caption, anchor: "end" });
  out.push("</svg>");

  // Every text box against every solid, every other text box, and the frame.
  const clashes = [];
  for (let i = 0; i < texts.length; i += 1) {
    const t = texts[i];
    if (t.x0 < 18 || t.x1 > W - 18 || t.y0 < 18 || t.y1 > H - 18) clashes.push(`${t.id} leaves the sheet`);
    for (const sd of solids) if (hits(t, sd)) clashes.push(`${t.id} over ${sd.id}`);
    for (let j = i + 1; j < texts.length; j += 1) if (hits(t, texts[j])) clashes.push(`${t.id} over ${texts[j].id}`);
  }
  return { svg: `${out.join("\n")}\n`, clashes, counts: { texts: texts.length, solids: solids.length } };
}

// ─── NFPA 170 Chapter 11 ────────────────────────────────────────────────
const NFPA = {
  id: "nfpa",
  unit: "ft",
  K: 6.2, OX: 70, OY: 175,
  ext: 1, part: 0.42, signPx: 30, bandWidth: 1.75, chevron: 9,
  title: "Harborview Supply — Store 214 Evacuation Plan",
  subtitle: "Evacuation diagram to NFPA 170 Chapter 11 · egress to NFPA 101 §7.4 · posted under 29 CFR 1910.38",
  block1: "LEVEL 1 OF 2 · SHEET TABLOID · SCALE 1:96",
  block2: "Posted at: Customer Service desk · Rev 2 · Issued 2026-09",
  desc: "A posted evacuation diagram for the ground level of a retail store, drawn to NFPA 170 Chapter 11. A grey line-work plan shows an open sales floor along the south, a service corridor across the middle, and back-of-house rooms along the north. A green plate with a white eight-point star marks the reader's position on the sales floor. A bold green band runs from it east and out of the main entrance to the assembly point in the east lot, a dashed green band runs north and west through the service corridor and out of the receiving door, and a third solid band carrying a wheelchair symbol runs east to the level side exit. Green plates mark the three exits, the exit-direction signs and the area of refuge at the stair; red plates mark a fire extinguisher and the manual pull station; crossed-out red plates prohibit the elevator, and a black-on-white sign marks the office door as not an exit. A north arrow, a scale bar, an action panel and a boxed legend complete the sheet.",
  rooms: [
    { id: "receiving", label: "Receiving", x: 0, y: 0, w: 24, h: 18 },
    { id: "stockroom", label: "Stockroom", x: 24, y: 0, w: 40, h: 18 },
    { id: "stair", label: "Stair 1", dim: true, fs: 10, x: 64, y: 0, w: 10, h: 18 },
    { id: "lift", label: "Elevator", dim: true, fs: 10, x: 74, y: 0, w: 10, h: 18 },
    { id: "breakroom", label: "Break Room", labelAt: [93, 12], x: 84, y: 0, w: 18, h: 18 },
    { id: "restrooms", label: "Restrooms", x: 102, y: 0, w: 14, h: 18 },
    { id: "office", label: "Store Office", x: 116, y: 0, w: 16, h: 18 },
    { id: "corridor", label: "SERVICE CORRIDOR", dim: true, fs: 10, tracking: 1.1, circulation: true, labelAt: [20, 24.8], x: 0, y: 18, w: 132, h: 8 },
    { id: "sales", label: "Sales Floor", x: 0, y: 26, w: 132, h: 26 },
  ],
  doors: [
    { between: ["receiving", "corridor"], at: 0.5, width: 4, open: "back", hinge: "end" },
    { between: ["stockroom", "corridor"], at: 0.5, width: 4, open: "back" },
    { between: ["stair", "corridor"], at: 0.5, width: 3.5, open: "back", fire: true },
    { between: ["lift", "corridor"], at: 0.5, width: 3.5, open: "back" },
    { between: ["breakroom", "corridor"], at: 0.5, width: 3, open: "back" },
    { between: ["restrooms", "corridor"], at: 0.5, width: 3, open: "back" },
    { between: ["office", "corridor"], at: 0.5, width: 3, open: "back" },
    { between: ["corridor", "sales"], at: 0.5, width: 4 },
    { between: ["corridor", "sales"], at: 0.12, width: 4 },
    { room: "receiving", side: "north", at: 0.5, width: 6 },
    { room: "sales", side: "south", at: 0.818, width: 8 },
    { room: "sales", side: "east", at: 0.538, width: 6 },
  ],
  fixtures: [
    { id: "stair1", kind: "stairs", tread: 1, x: 65.5, y: 3.5, w: 7, h: 10 },
    { id: "lift1", kind: "elevator", x: 75.5, y: 5, w: 7, h: 8 },
  ],
  assembly: { x: 146, y: 52, w: 20, h: 16 },
  signs: [
    { kind: "here-nfpa", x: 66, y: 40, labelXY: [63, 36.6], anchor: "end", label: "YOU ARE HERE", fs: 11, fill: C.safe },
    { kind: "nfpa-exit-final", x: 112, y: 49.2, labelXY: [115.6, 50.6], anchor: "start", label: "MAIN EXIT" },
    { kind: "nfpa-exit-final-left", x: 12, y: 3.4, labelXY: [15.5, -3.2], anchor: "start", label: ["EXIT — RECEIVING", "to the service yard"] },
    { kind: "nfpa-exit-final", x: 128, y: 35.6, labelXY: [128, 30.6], label: "SIDE EXIT" },
    { kind: "nfpa-exit-direction-left", x: 40, y: 21.2 },
    { kind: "nfpa-exit-direction-right", x: 96, y: 30 },
    { kind: "refuge", x: 69, y: 12.5 },
    { kind: "no-elevator", x: 79, y: 12.5 },
    { kind: "not-an-exit", x: 124, y: 21.5 },
    { kind: "extinguisher", x: 30, y: 29.5, labelXY: [30, 34.4], label: "ABC", fs: 9, fill: C.fire },
    { kind: "extinguisher", x: 98, y: 4, labelXY: [98, 8.9], label: "K", fs: 9, fill: C.fire },
    { kind: "call-point", x: 114, y: 29.5, labelXY: [114, 34.4], label: "PULL", fs: 8, fill: C.fire },
    { kind: "first-aid", x: 88, y: 4 },
    { kind: "assembly", x: 146, y: 50, size: 1.6, labelXY: [146, 63.2], label: ["ASSEMBLY POINT", "East parking lot"], fs: 11 },
  ],
  routes: [
    { kind: "primary", pts: [[66, 40], [66, 48], [108, 48], [108, 58], [146, 58]] },
    { kind: "secondary", pts: [[66, 40], [66, 21.2], [12, 21.2], [12, -8]] },
    { kind: "accessible", pts: [[66, 40], [138, 40], [138, 44.5], [146, 44.5]], markerAt: 0.4 },
  ],
  north: [975, 250],
  scaleBar: [121, 549], scaleStep: 10,
  scaleNote: "Scale 1:96 at tabloid · safety signs 15 mm",
  legendNote: "Lists every symbol used on this plan (NFPA 170 Ch.11).",
  legend: [
    { title: "ESCAPE ROUTES", rows: [
      { kind: "primary", label: "Primary escape route" },
      { kind: "secondary", label: "Alternative escape route" },
      { kind: "accessible", label: "Accessible egress route" },
    ] },
    { title: "EXITS, REFUGE AND PROHIBITIONS", rows: [
      { kind: "nfpa-exit-final", label: "Exit (NFPA exit symbol)" },
      { kind: "nfpa-exit-direction-right", label: "Exit direction" },
      { kind: "refuge", label: "Area of refuge" },
      { kind: "assembly", label: "Assembly point" },
      { kind: "no-elevator", label: "Do not use elevator in fire" },
      { kind: "not-an-exit", label: "Not an exit" },
    ] },
    { title: "FIRE AND FIRST AID", rows: [
      { kind: "extinguisher", label: "Fire extinguisher, class marked" },
      { kind: "call-point", label: "Manual pull station" },
      { kind: "first-aid", label: "First aid station" },
    ] },
    { title: "YOUR POSITION", rows: [{ kind: "here-nfpa", label: "You are here (NFPA marker)" }] },
    { title: "BUILDING", rows: [{ kind: "fire-door", label: "Fire-rated door, 45 min" }] },
  ],
  actionPanel: { x: 400, y: 545, w: 500, h: 147 },
  actionTitle: "IF YOU DISCOVER A FIRE",
  actions: [
    { en: "Pull the nearest red fire alarm station." },
    { en: "Leave by the green route — never use the elevator." },
    { en: "Close doors behind you; do not stop for belongings." },
    { en: "Report to the assembly point and wait to be counted." },
  ],
  actionFoot: "Emergency 911 · Store manager on duty, extension 214",
  footLeft: "Original symbol geometry drawn to the visual grammar described in NFPA 170 and ISO 3864-1. Occupant information only — not a fire-service pre-incident plan.",
  footRight: "Sheet 1 of 1",
};

// ─── UAE Civil Defence ──────────────────────────────────────────────────
const UAE = {
  id: "uae",
  unit: "m",
  K: 27.3, OX: 110.98, OY: 175.3,
  ext: 0.3, part: 0.12, signPx: 30, bandWidth: 0.4, chevron: 2,
  title: "Al Reem Medical Centre — Ground Floor Escape Plan",
  subtitle: "Escape plan to the UAE Fire and Life Safety Code · signs to ISO 7010 · English and Arabic as Civil Defence requires",
  block1: "GROUND FLOOR OF 3 · SHEET A3 · SCALE 1:100",
  block2: "مركز الريم الطبي · الطابق الأرضي · مراجعة ٢",
  block2Rtl: true,
  desc: "A posted escape plan for the ground floor of a clinic, drawn to UAE Civil Defence requirements with every label in English and Arabic. A grey line-work plan shows reception, a waiting hall, triage, pharmacy and laboratory along the north, consulting and treatment rooms, the lift, toilets and a staff room along the south, and a corridor between them with a protected stair at each end. A yellow triangular marker gives the reader's position in the waiting hall; a bold green band runs from it along the corridor to the east stair and out to the assembly point, and a dashed green band runs the other way to the west stair. Green ISO 7010 plates mark the two final exits and two exit-direction signs, red plates mark two fire extinguishers, a hose reel and the fire alarm call point, a green cross marks first aid in triage, and a crossed-out red plate at the lift prohibits its use. A north arrow, a scale bar, a bilingual action panel and a bilingual legend complete the sheet.",
  rooms: [
    { id: "reception", label: "Reception", ar: "الاستقبال", x: 3.6, y: 0, w: 5.4, h: 5 },
    { id: "waiting", label: "Waiting Hall", ar: "صالة الانتظار", labelAt: [11, 2.6], x: 9, y: 0, w: 6.6, h: 5 },
    { id: "triage", label: "Triage", ar: "الفرز", x: 15.6, y: 0, w: 3.5, h: 5 },
    { id: "pharmacy", label: "Pharmacy", ar: "الصيدلية", x: 19.1, y: 0, w: 3.2, h: 5 },
    { id: "lab", label: "Laboratory", ar: "المختبر", x: 22.3, y: 0, w: 3.3, h: 5 },
    { id: "stairW", label: "Stair 1", dim: true, fs: 10, labelAt: [2.75, 5.42], x: 0, y: 5, w: 3.6, h: 2.6 },
    { id: "corridor", label: "CORRIDOR", dim: true, fs: 10, tracking: 1.1, circulation: true, labelAt: [15.6, 5.9], x: 3.6, y: 5, w: 22, h: 2.6 },
    { id: "stairE", label: "Stair 2", dim: true, fs: 10, labelAt: [26.45, 5.42], x: 25.6, y: 5, w: 3.6, h: 2.6 },
    { id: "consult1", label: "Consulting 1", ar: "عيادة ١", x: 3.6, y: 7.6, w: 4, h: 5 },
    { id: "consult2", label: "Consulting 2", ar: "عيادة ٢", x: 7.6, y: 7.6, w: 4, h: 5 },
    { id: "treatment", label: "Treatment", ar: "غرفة العلاج", x: 11.6, y: 7.6, w: 5, h: 5 },
    { id: "lift", label: "Lift", ar: "المصعد", dim: true, fs: 10, x: 16.6, y: 7.6, w: 2.6, h: 5 },
    { id: "wc", label: "Toilets", ar: "دورات المياه", x: 19.2, y: 7.6, w: 3.2, h: 5 },
    { id: "staff", label: "Staff Room", ar: "غرفة الموظفين", x: 22.4, y: 7.6, w: 3.2, h: 5 },
  ],
  doors: [
    { between: ["reception", "corridor"], open: "back", at: 0.5, width: 2 },
    { between: ["waiting", "corridor"], open: "back", at: 0.7, width: 2.4 },
    { between: ["triage", "corridor"], open: "back", at: 0.5, width: 1.1 },
    { between: ["pharmacy", "corridor"], open: "back", at: 0.5, width: 1.1 },
    { between: ["lab", "corridor"], open: "back", at: 0.5, width: 1 },
    { between: ["consult1", "corridor"], at: 0.5, width: 1 },
    { between: ["consult2", "corridor"], at: 0.5, width: 1 },
    { between: ["treatment", "corridor"], at: 0.5, width: 1.2 },
    { between: ["lift", "corridor"], at: 0.5, width: 1.1 },
    { between: ["wc", "corridor"], at: 0.5, width: 0.9 },
    { between: ["staff", "corridor"], at: 0.5, width: 0.9 },
    { between: ["stairW", "corridor"], at: 0.5, width: 1.2, fire: true, open: "back" },
    { between: ["corridor", "stairE"], at: 0.5, width: 1.2, fire: true },
    { room: "stairW", side: "west", at: 0.5, width: 1.2 },
    { room: "stairE", side: "east", at: 0.5, width: 1.2 },
  ],
  fixtures: [
    { id: "stairW", kind: "stairs", tread: 0.28, x: 1.35, y: 6.6, w: 1.4, h: 0.85 },
    { id: "stairE", kind: "stairs", tread: 0.28, x: 26.95, y: 6.6, w: 1.4, h: 0.85 },
  ],
  assembly: { x: 31.05, y: 13, w: 4.3, h: 3.2 },
  signs: [
    { kind: "here-uae", x: 13.6, y: 2.6, labelXY: [13.6, 1.15], label: ["YOU ARE HERE", "أنت هنا"], fs: 11, fill: C.ink, rtl: true },
    { kind: "exit-final-left", x: 1.3, y: 5.6, labelXY: [-0.45, 5.6], anchor: "end", label: ["FINAL EXIT", "مخرج نهائي"], fs: 9 },
    { kind: "exit-final", x: 27.9, y: 5.6, labelXY: [29.65, 5.6], anchor: "start", label: ["FINAL EXIT", "مخرج نهائي"], fs: 9 },
    { kind: "exit-direction-left", x: 7.4, y: 5.6 },
    { kind: "exit-direction-right", x: 18.1, y: 5.6 },
    { kind: "no-elevator", x: 17.9, y: 8.45 },
    { kind: "extinguisher", x: 4.9, y: 5.6, labelXY: [4.9, 4.75], label: "ABC", fs: 9, fill: C.fire },
    { kind: "extinguisher", x: 21.7, y: 5.6, labelXY: [21.7, 4.75], label: "CO₂", fs: 9, fill: C.fire },
    { kind: "hose-reel", x: 10.4, y: 5.6 },
    { kind: "call-point", x: 23.8, y: 5.6 },
    { kind: "first-aid", x: 17.35, y: 3.4 },
    { kind: "assembly", x: 31.05, y: 12.4, size: 1.59, labelXY: [31.05, 15.05], label: ["ASSEMBLY POINT", "نقطة التجمع"], fs: 11, rtl: true },
  ],
  routes: [
    { kind: "primary", pts: [[14, 2.6], [14, 6.55], [31.05, 6.55], [31.05, 11.6]] },
    { kind: "secondary", pts: [[13.2, 2.6], [13.2, 7.15], [5, 7.15], [4.2, 6.55], [-0.6, 6.55]] },
  ],
  north: [970.93, 227.17],
  scaleBar: [121.9, 549.31], scaleStep: 2,
  scaleNote: "Scale 1:100 at A3 · safety signs 11 mm",
  legendTitle: "LEGEND", legendTitleAr: "المفتاح",
  legendNote: "Every symbol on this plan is listed (UAE Civil Defence).",
  legend: [
    { title: "ESCAPE ROUTES", ar: "مسارات الإخلاء", rows: [
      { kind: "primary", label: "Primary escape route", ar: "مسار الإخلاء الرئيسي" },
      { kind: "secondary", label: "Alternative escape route", ar: "مسار الإخلاء البديل" },
    ] },
    { title: "EXITS AND ASSEMBLY", ar: "المخارج ونقطة التجمع", rows: [
      { kind: "exit-final", label: "Final exit (E001/E002)", ar: "مخرج نهائي" },
      { kind: "exit-direction-right", label: "Exit direction", ar: "اتجاه المخرج" },
      { kind: "assembly", label: "Assembly point (E007)", ar: "نقطة التجمع" },
      { kind: "no-elevator", label: "Do not use the lift", ar: "لا تستخدم المصعد" },
    ] },
    { title: "FIRE AND FIRST AID", ar: "معدات الحريق والإسعاف", rows: [
      { kind: "extinguisher", label: "Fire extinguisher (F001)", ar: "طفاية حريق" },
      { kind: "hose-reel", label: "Fire hose reel (F002)", ar: "بكرة خرطوم الحريق" },
      { kind: "call-point", label: "Call point (F005)", ar: "نقطة إنذار الحريق" },
      { kind: "first-aid", label: "First aid point (E003)", ar: "نقطة الإسعافات الأولية" },
    ] },
    { title: "YOUR POSITION", ar: "موقعك", rows: [{ kind: "here-uae", label: "You are here", ar: "أنت هنا" }] },
    { title: "BUILDING", ar: "المبنى", rows: [{ kind: "fire-door", label: "Fire-rated door, EI 60", ar: "باب مقاوم للحريق" }] },
  ],
  actionPanel: { x: 400, y: 545, w: 500, h: 147 },
  actionTitle: "IF YOU DISCOVER A FIRE",
  actionTitleAr: "عند اكتشاف حريق",
  actions: [
    { en: "Raise the alarm at the nearest call point.", ar: "شغّل أقرب نقطة إنذار." },
    { en: "Leave by the green route shown.", ar: "اخرج عبر المسار الأخضر." },
    { en: "Never use the lift.", ar: "لا تستخدم المصعد." },
    { en: "Go to the assembly point.", ar: "توجه إلى نقطة التجمع." },
  ],
  actionFoot: "Emergency 997 · Clinic reception, extension 100",
  footLeft: "Original symbol geometry drawn to the visual grammar described in ISO 7010 and ISO 3864-1. Occupant information only — not a fire-service pre-incident plan.",
  footRight: "Sheet 1 of 1",
};

// ─── Entry point ────────────────────────────────────────────────────────
const wanted = process.argv.slice(2);
const all = [NFPA, UAE].filter((s) => wanted.length === 0 || wanted.includes(s.id));
let failed = false;
for (const s of all) {
  const { svg, clashes, counts } = draw(s);
  writeFileSync(new URL(`${s.id}/ideal.svg`, EXEMPLARS), svg);
  if (clashes.length) {
    failed = true;
    console.error(`${s.id}: ${clashes.length} collisions`);
    for (const c of [...new Set(clashes)]) console.error(`  ${c}`);
  } else {
    console.log(`${s.id}: ${counts.texts} labels, ${counts.solids} pieces of geometry, 0 collisions`);
  }
}
if (failed) process.exit(1);
