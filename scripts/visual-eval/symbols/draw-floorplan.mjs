#!/usr/bin/env node
/** Draws the floor-plan symbol library in visual-eval/symbols/floorplan/.
 *
 * Every symbol follows scripts/visual-eval/draw-floorplan-exemplar.mjs: the same
 * palette, stroke attributes and 64 px/m scale, authored in metres. Symbols the
 * exemplar contains are lifted from its own coordinates; the rest are drawn from
 * the same rules. A symbol is rotated about its centre into its canonical
 * north-up orientation (rotate 0 in the DSL) and cropped to its bounds plus
 * 8 units of padding, so all symbols keep true relative size.
 *
 * Tier 1 is the round-1 set: the symbols most ChatDiagram users draw plus the
 * architectural basics. See visual-eval/symbols/floorplan/inventory.md.
 *
 *   node scripts/visual-eval/symbols/draw-floorplan.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../../../visual-eval/symbols/floorplan/", import.meta.url);

// ─── Exemplar style (copied, not re-invented) ───────────────────────────
const C = {
  graphite: "#1F2328",
  slate: "#55606C",
  pencil: "#A3ABB4",
  mist: "#EDEFF2",
  glazing: "#4F86B0",
  caption: "#6E7782",
  paper: "#FFFFFF",
};
const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const K = 64; // px per metre, as in the exemplar
const PAD = 8;

const S = `stroke="${C.slate}" stroke-width="1.1" fill="${C.paper}"`;
const SN = `stroke="${C.slate}" stroke-width="1.1" fill="none"`;
const SM = `stroke="${C.slate}" stroke-width="1.1" fill="${C.mist}"`;
const THIN = `stroke="${C.slate}" stroke-width="0.8" fill="none"`;
const POCHE = `fill="${C.graphite}"`;
const LEAF = `stroke="${C.graphite}" stroke-width="1.6" stroke-linecap="butt"`;
const LEAFP = `stroke="${C.graphite}" stroke-width="1.6" stroke-linejoin="miter" fill="none"`;
const ARC = `stroke="${C.pencil}" stroke-width="0.9" fill="none"`;
const FRAME = `stroke="${C.graphite}" stroke-width="0.9"`;
const GLASS = `stroke="${C.glazing}" stroke-width="1.8"`;
const TREAD = `stroke="${C.slate}" stroke-width="0.9"`;
const TREAD_ABOVE = `stroke="${C.pencil}" stroke-width="0.9" stroke-dasharray="3 2.5"`;
const BREAK = `stroke="${C.graphite}" stroke-width="1.4" fill="none" stroke-linejoin="round"`;
const ARROW = `stroke="${C.graphite}" stroke-width="1.1" fill="none"`;

const f = (v) => +v.toFixed(2);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Text width in px: Inter's wide capitals and digits at 0.72 em, other glyphs 0.58 em (semibold). */
const textWidth = (s, fs, weight, tracking) =>
  [...s].reduce((w, ch) => w + fs * (/[A-Z0-9]/.test(ch) ? 0.72 : weight >= 600 ? 0.6 : 0.56), 0) +
  Math.max(0, [...s].length - 1) * tracking;

// ─── Symbol builder: metres in, rotated px out ──────────────────────────
function symbol({ title, centre: [cx, cy], rotate = 0 }, draw) {
  const rad = (rotate * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad));
  const sin = Math.round(Math.sin(rad));
  const P = (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    return [(dx * cos - dy * sin) * K, (dx * sin + dy * cos) * K];
  };
  const items = [];
  const pts = [];
  const at = (p, o) => `${f(p[0] + o[0])} ${f(p[1] + o[1])}`;
  const api = {
    bound(x, y) {
      pts.push(P(x, y));
    },
    line(x1, y1, x2, y2, a) {
      const p = P(x1, y1);
      const q = P(x2, y2);
      pts.push(p, q);
      items.push((o) => `<line x1="${f(p[0] + o[0])}" y1="${f(p[1] + o[1])}" x2="${f(q[0] + o[0])}" y2="${f(q[1] + o[1])}" ${a}/>`);
    },
    rect(x0, y0, x1, y1, rx, a) {
      const p = P(x0, y0);
      const q = P(x1, y1);
      const mx = Math.min(p[0], q[0]);
      const my = Math.min(p[1], q[1]);
      const w = Math.abs(p[0] - q[0]);
      const h = Math.abs(p[1] - q[1]);
      pts.push([mx, my], [mx + w, my + h]);
      items.push((o) => `<rect x="${f(mx + o[0])}" y="${f(my + o[1])}" width="${f(w)}" height="${f(h)}" ${rx ? `rx="${rx}" ` : ""}${a}/>`);
    },
    circle(x, y, r, a) {
      const p = P(x, y);
      pts.push([p[0] - r, p[1] - r], [p[0] + r, p[1] + r]);
      items.push((o) => `<circle cx="${f(p[0] + o[0])}" cy="${f(p[1] + o[1])}" r="${f(r)}" ${a}/>`);
    },
    ellipse(x, y, rxm, rym, a) {
      const p = P(x, y);
      let rx = rxm * K;
      let ry = rym * K;
      if (sin !== 0) [rx, ry] = [ry, rx];
      pts.push([p[0] - rx, p[1] - ry], [p[0] + rx, p[1] + ry]);
      items.push((o) => `<ellipse cx="${f(p[0] + o[0])}" cy="${f(p[1] + o[1])}" rx="${f(rx)}" ry="${f(ry)}" ${a}/>`);
    },
    /** cmds: ["M", x, y] | ["L", x, y] | ["A", rxM, ryM, sweep, x, y] | ["Z"] */
    path(cmds, a) {
      const parts = cmds.map((c) => {
        if (c[0] === "Z") return () => "Z";
        const p = P(c.at(-2), c.at(-1));
        pts.push(p);
        if (c[0] === "A") {
          const [rx, ry] = sin !== 0 ? [c[2], c[1]] : [c[1], c[2]];
          return (o) => `A ${f(rx * K)} ${f(ry * K)} 0 0 ${c[3]} ${at(p, o)}`;
        }
        return (o) => `${c[0]} ${at(p, o)}`;
      });
      items.push((o) => `<path d="${parts.map((fn) => fn(o)).join(" ")}" ${a}/>`);
    },
    /** Text stays upright; (x, y) is a metre anchor, dx/dy a px offset after rotation. */
    text(x, y, s, { dx = 0, dy = 0, fs, weight = 400, fill, tracking = 0 }) {
      const p = P(x, y);
      const tx = p[0] + dx;
      const ty = p[1] + dy;
      const w = textWidth(s, fs, weight, tracking);
      pts.push([tx - w / 2, ty - fs * 0.74], [tx + w / 2, ty + fs * 0.22]);
      const attrs = [`font-size="${fs}"`, weight !== 400 ? `font-weight="${weight}"` : "", `fill="${fill}"`, `text-anchor="middle"`, tracking ? `letter-spacing="${tracking}"` : ""].filter(Boolean);
      items.push((o) => `<text x="${f(tx + o[0])}" y="${f(ty + o[1])}" ${attrs.join(" ")}>${esc(s)}</text>`);
    },
  };
  draw(api);
  const minX = Math.min(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  const maxY = Math.max(...pts.map((p) => p[1]));
  const o = [PAD - minX, PAD - minY];
  const W = f(maxX - minX + 2 * PAD);
  const H = f(maxY - minY + 2 * PAD);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}" role="img">`,
    `<title>${esc(title)}</title>`,
    ...items.map((fn) => fn(o)),
    `</svg>`,
    "",
  ].join("\n");
}

// ─── Shared drawing rules ───────────────────────────────────────────────

/** A wall run along y = 0 from x0 to x1, thickness t, drawn as poché. */
const wall = (s, x0, x1, t) => s.rect(x0, -t / 2, x1, t / 2, 0, POCHE);

/** Hinged leaf open at 90° from (hx, face) into +y, with its pencil quarter arc to the strike jamb. */
function swingLeaf(s, hx, face, width, towards) {
  s.line(hx, face, hx, face + width, LEAF);
  // towards = -1: strike jamb to the left of the hinge (arc runs clockwise on screen)
  s.path([["M", hx, face + width], ["A", width, width, towards === -1 ? 1 : 0, hx + towards * width, face]], ARC);
}

/** The exemplar's UP arrow: open circle at the start, 1.1 px graphite line, filled head. */
function stairArrow(s, points) {
  const [x0, y0] = points[0];
  s.path(points.map(([x, y], i) => [i ? "L" : "M", x, y]), ARROW);
  const [xa, ya] = points.at(-2);
  const [xt, yt] = points.at(-1);
  const len = Math.hypot(xt - xa, yt - ya);
  const ux = (xt - xa) / len;
  const uy = (yt - ya) / len;
  const bx = xt - (ux * 7) / K;
  const by = yt - (uy * 7) / K;
  const w = 3.6 / K;
  s.path([["M", bx - uy * w, by + ux * w], ["L", xt + ux / K, yt + uy / K], ["L", bx + uy * w, by - ux * w], ["Z"]], `fill="${C.graphite}"`);
  s.circle(x0, y0, 2.6, `fill="${C.paper}" stroke="${C.graphite}" stroke-width="1.1"`);
}

/**
 * One flight of treads in its own frame: u runs along the direction of travel from
 * the first riser, v across from the walker's right-hand stringer (0) to the left (width).
 * Treads before the cut are solid slate; with `cutAt`, the exemplar's zigzag break line
 * crosses the flight there and treads beyond it are pencil-dashed.
 */
function flight(s, map, { width, from, to, tread = 0.275, cutAt = null }) {
  const L = (u1, v1, u2, v2, a) => {
    const [x1, y1] = map(u1, v1);
    const [x2, y2] = map(u2, v2);
    s.line(x1, y1, x2, y2, a);
  };
  const tilt = 0.34 * (width / 0.9);
  const cut = (v) => cutAt + tilt / 2 - (v / width) * tilt;
  for (let k = from; k <= to; k++) {
    const u = +(k * tread).toFixed(3);
    if (cutAt === null || u <= cut(width)) L(u, 0, u, width, TREAD);
    else if (u >= cut(0)) L(u, 0, u, width, TREAD_ABOVE);
    else {
      const vc = ((cutAt + tilt / 2 - u) / tilt) * width;
      L(u, 0, u, vc, TREAD);
      L(u, vc, u, width, TREAD_ABOVE);
    }
  }
  if (cutAt !== null) {
    const vm = width / 2;
    const pts = [[0, cut(0)], [vm - 0.06, cutAt + 0.02], [vm - 0.02, cutAt - 0.12], [vm + 0.03, cutAt + 0.11], [vm + 0.07, cutAt - 0.02], [width, cut(width)]];
    s.path(pts.map(([v, u], i) => [i ? "L" : "M", ...map(u, v)]), BREAK);
  }
}

/** Office task chair centred at (cx, cy); back to the north when sy = 1, to the south when sy = -1. */
function taskChair(s, cx, cy, sy = 1) {
  const Y = (y) => cy + sy * y;
  const hub = [cx, Y(0.04)];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; // one leg under the backrest, none pointing forward
    const x = hub[0] + 0.3 * Math.cos(a);
    const y = hub[1] + sy * 0.3 * Math.sin(a);
    s.line(hub[0], hub[1], x, y, THIN);
    s.circle(x, y, 1.7, `stroke="${C.slate}" stroke-width="0.8" fill="${C.paper}"`);
  }
  s.rect(cx - 0.23, Y(sy === 1 ? -0.14 : 0.28), cx + 0.23, Y(sy === 1 ? 0.28 : -0.14), 4, S);
  const sw = (v) => (sy === 1 ? v : 1 - v);
  s.path([["M", cx - 0.25, Y(-0.12)], ["A", 0.55, 0.55, sw(1), cx + 0.25, Y(-0.12)], ["L", cx + 0.21, Y(-0.06)], ["A", 0.5, 0.5, sw(0), cx - 0.21, Y(-0.06)], ["Z"]], S);
}

/** The accepted 0.42 m chair, including its 3 px corners, rotated about its centre. */
function planChair(s, cx, cy, angle = 0) {
  const a = angle * Math.PI / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const p = (x, y) => [cx + x * cos - y * sin, cy + x * sin + y * cos];
  const h = 0.21, r = 3 / K;
  const cmds = [
    ["M", -h + r, -h], ["L", h - r, -h], ["A", r, r, 1, h, -h + r],
    ["L", h, h - r], ["A", r, r, 1, h - r, h],
    ["L", -h + r, h], ["A", r, r, 1, -h, h - r],
    ["L", -h, -h + r], ["A", r, r, 1, -h + r, -h], ["Z"],
  ];
  s.path(cmds.map((c) => c[0] === "Z" ? c : [...c.slice(0, -2), ...p(c.at(-2), c.at(-1))]), S);
  s.line(...p(-h, -0.14), ...p(h, -0.14), THIN);
  // Exact extrema of the rotated rounded square, including its circular corners.
  const extent = (h - r) * (Math.abs(cos) + Math.abs(sin)) + r;
  s.bound(cx - extent, cy - extent);
  s.bound(cx + extent, cy + extent);
}

/** The accepted double-bed geometry, scaled in metres; stroke weights and radii stay fixed. */
function scaledBed(s, w, h) {
  const X = (x) => (x / 1.4 - 0.5) * w;
  const Y = (y) => (y / 2 - 0.5) * h;
  s.rect(X(0), Y(0), X(1.4), Y(2), 3, S);
  for (const x of [0.1, 0.75]) s.rect(X(x), Y(0.1), X(x + 0.55), Y(0.4), 3, S);
  s.line(X(0), Y(0.6), X(1.4), Y(0.6), THIN);
  s.line(X(0), Y(0.9), X(1.4), Y(0.75), THIN);
}

/** The round-table-4 spacing: 0.05 m clear to each 0.42 m chair, backs outward. */
function roundDining(s, diameter, seats) {
  s.circle(0, 0, diameter / 2 * K, S);
  for (let i = 0; i < seats; i++) {
    const angle = i * 360 / seats;
    const a = (angle - 90) * Math.PI / 180;
    const radius = diameter / 2 + 0.05 + 0.21;
    planChair(s, radius * Math.cos(a), radius * Math.sin(a), angle);
  }
}

/** Long tables with the accepted chair at evenly spaced positions, 0.05 m off the edge. */
function longDining(s, w, h, seatsPerSide, sides) {
  s.rect(-w / 2, -h / 2, w / 2, h / 2, 2, S);
  for (const side of sides) {
    for (let i = 0; i < seatsPerSide; i++) {
      planChair(s, -w / 2 + (i + 0.5) * w / seatsPerSide, side * (h / 2 + 0.26), side === -1 ? 0 : 180);
    }
  }
}

const HIDDEN = `${THIN} stroke-dasharray="3 2"`;
const NOTATION = `stroke="${C.graphite}" stroke-width="1.1" fill="none"`;

// ─── The symbols ────────────────────────────────────────────────────────
const BLUEPRINT = "https://blueprintprimer.com/posts/door-and-window-symbols-on-floor-plans";
const ROOMSKETCHER = "https://www.roomsketcher.com/blog/floor-plan-symbols/";
const ENGINEERFIX = "https://engineerfix.com/how-to-properly-show-stairs-on-a-floor-plan/";
const METRIC = "https://www.firstinarchitecture.co.uk/metric-data-08-standard-furniture-sizes/";
const NKBA = "https://nkba-ps.com/images/downloads/Awards/nkba_kitchen_planning_guidelines_pre_2023.pdf";
const BATH = "https://www.houseplanshelper.com/bathroom-dimensions.html";
const HPH = "https://www.houseplanshelper.com/floor-plan-symbols.html";

const SYMBOLS = [
  // ── Architectural basics ──
  {
    id: "window-fixed",
    source: "floorplan\nroom sample \"\" size 3x3\nwindow sample north at 50% width 1.4 type fixed\n",
    previewGroup: "sx-fp-openings",
    label: "Window (fixed)",
    engine: null,
    usageUsers: 1168,
    dsl: ["window guest south at 50% width 1.4", "window living north at 40% width 1.2 type fixed"],
    standard: "Window as a wall break with two wall-face lines and a middle glass line (The Blueprint Primer); jamb lines close the wall ends",
    sourceUrl: BLUEPRINT,
    notes: "Two graphite wall-face lines, jamb lines and one blue glass line inside a 0.30 m exterior wall, so a window can never be read as a thin partition. The engine has no catalog window; in plans it draws three identical grey lines.",
    // Exemplar: the guest bedroom's south window, 1.40 m in the 0.30 m exterior wall.
    def: { title: "Window (fixed)", centre: [1.7, 9.2] },
    draw(s) {
      s.rect(0.7, 9.05, 1.0, 9.35, 0, POCHE);
      s.rect(2.4, 9.05, 2.7, 9.35, 0, POCHE);
      s.line(1.0, 9.05, 2.4, 9.05, FRAME);
      s.line(1.0, 9.35, 2.4, 9.35, FRAME);
      s.line(1.0, 9.2, 2.4, 9.2, GLASS);
      s.line(1.0, 9.05, 1.0, 9.35, FRAME);
      s.line(2.4, 9.05, 2.4, 9.35, FRAME);
    },
  },
  {
    id: "door-single",
    source: "floorplan\nroom sample \"\" size 3x3\ndoor sample north at 50% width 0.9 type single hinge right\n",
    previewGroup: "sx-fp-openings",
    label: "Single swing door",
    engine: null,
    usageUsers: 153,
    dsl: ["door between utility kitchen at 40% width 0.8 hinge right", "door hall south at 50% width 0.9 hinge left swing in", "door between guest hall at 50% type single"],
    standard: "Door symbol as a wall break, leaf drawn open at 90° and a quarter-circle swing (The Blueprint Primer; NKBA Kitchen & Bath Drawing ch. 3: wall lines heavier than door lines)",
    sourceUrl: BLUEPRINT,
    notes: "Leaf drawn open at 90° from the hinge jamb in 1.6 px graphite, a thin pencil quarter arc to the strike jamb, and 0.12 m partition poché on both sides, so the wall stays the heaviest element. The engine has no catalog door to compare: doors are drawn only as wall openings inside a plan.",
    // Exemplar: the utility–kitchen door, 0.80 m in a 0.12 m partition, hinged on the right jamb, swinging south.
    def: { title: "Single swing door", centre: [8.8, 4.8] },
    draw(s) {
      s.rect(8.1, 4.34, 8.4, 4.46, 0, POCHE);
      s.rect(9.2, 4.34, 9.5, 4.46, 0, POCHE);
      s.line(9.2, 4.46, 9.2, 5.26, LEAF);
      s.path([["M", 9.2, 5.26], ["A", 0.8, 0.8, 1, 8.4, 4.46]], ARC);
    },
  },
  {
    id: "door-double",
    label: "Double swing door",
    engine: null,
    usageUsers: 658,
    dsl: ["door between living hall at 50% width 1.4 type double", "door lobby south at 50% width 1.8 type double swing out"],
    standard: "Double (French) doors as two leaves and two quarter arcs that meet at the centre of the opening (RoomSketcher, floor plan symbols)",
    sourceUrl: ROOMSKETCHER,
    notes: "The exemplar's living-room doors: a 1.40 m opening in a 0.12 m partition with two 0.70 m leaves (pairs are typically 1.2–1.8 m), each drawn like the single door and meeting at the centre. Drawn swinging south to match the single door's canonical orientation; the exemplar hangs them the other way. The engine has no catalog door; in plans it draws the same two arcs with heavier, darker swing lines.",
    def: { title: "Double swing door", centre: [0, 0.4] },
    draw(s) {
      wall(s, -1.0, -0.7, 0.12);
      wall(s, 0.7, 1.0, 0.12);
      swingLeaf(s, -0.7, 0.06, 0.7, 1);
      swingLeaf(s, 0.7, 0.06, 0.7, -1);
    },
  },
  {
    id: "opening",
    label: "Cased opening",
    engine: null,
    usageUsers: 582,
    dsl: ["opening between living kitchen at 45% width 1.6", "opening hall east at 50%"],
    standard: "Doorless opening as a gap in the wall line (RoomSketcher); the header above the cut plane drawn as thin dashed lines (US NCS V5 Uniform Drawing System, Module 6: features above)",
    sourceUrl: "https://www.nationalcadstandard.org/ncs5/pdfs/ncs5_uds6.pdf",
    notes: "The exemplar's living–kitchen opening: a 1.60 m gap in a 0.12 m partition with pencil dashed lines (4 on, 3 off) along both wall faces, marking the header overhead, so an intended opening is not mistaken for a missing piece of wall. The engine has no catalog opening; in plans it leaves a plain gap.",
    def: { title: "Cased opening", centre: [0, 0] },
    draw(s) {
      wall(s, -1.1, -0.8, 0.12);
      wall(s, 0.8, 1.1, 0.12);
      const dash = `stroke="${C.pencil}" stroke-width="0.9" stroke-dasharray="4 3"`;
      s.line(-0.8, -0.06, 0.8, -0.06, dash);
      s.line(-0.8, 0.06, 0.8, 0.06, dash);
    },
  },
  {
    id: "door-sliding",
    label: "Sliding door",
    engine: null,
    usageUsers: 483,
    dsl: ["door kitchen north from start 0.3 width 2.2 type sliding id patio", "door bedroom east at 50% width 1.8 type sliding"],
    standard: "Sliding door as two panels on parallel tracks that overlap in the middle, no swing (RoomSketcher; The Blueprint Primer: bypass door)",
    sourceUrl: ROOMSKETCHER,
    notes: "The exemplar's patio door: a 2.20 m opening in the 0.30 m exterior wall (two-panel patio doors run 1.8–2.4 m), two glazing-blue panels on offset tracks overlapping 0.12 m at the meeting stiles, graphite jamb and meeting stiles, and a thin threshold line on the outside face (north). The panels are blue because this door is glass; an interior bypass closet door drawn with the same DSL words would need solid leaves instead. The engine has no catalog door; in plans it draws two thin offset lines with no stiles.",
    def: { title: "Sliding door", centre: [7.2, 0] },
    draw(s) {
      s.rect(5.8, -0.15, 6.1, 0.15, 0, POCHE);
      s.rect(8.3, -0.15, 8.6, 0.15, 0, POCHE);
      const lo = 6.1;
      const hi = 8.3;
      const mid = (lo + hi) / 2;
      const glass = `stroke="${C.glazing}" stroke-width="2.2"`;
      const stile = `stroke="${C.graphite}" stroke-width="1.2"`;
      s.line(lo, -0.05, mid + 0.06, -0.05, glass);
      s.line(mid - 0.06, 0.05, hi, 0.05, glass);
      s.line(lo, -0.1, lo, 0.1, stile);
      s.line(hi, -0.1, hi, 0.1, stile);
      s.line(mid + 0.06, -0.1, mid + 0.06, 0, stile);
      s.line(mid - 0.06, 0, mid - 0.06, 0.1, stile);
      s.line(lo, -0.15, hi, -0.15, `stroke="${C.graphite}" stroke-width="0.8"`);
    },
  },
  {
    id: "stairs",
    label: "Straight stair",
    engine: "stairs",
    usageUsers: 234,
    dsl: ["furniture stairs in hall at 1.4,1.35 size 0.9x3.3", "furniture stairs in hall at 1.4,1.35 size 0.9x3.3 rotate 180"],
    standard: "Straight stair in plan: solid treads below the ~4 ft cut plane, heavy diagonal break line, dashed treads beyond, arrow from the lowest riser labelled UP (Engineer Fix); zigzag straight break and thin dashed 'features above' line (US NCS V5 Uniform Drawing System, Module 6 Symbols)",
    sourceUrl: ENGINEERFIX,
    notes: "Treads every 0.275 m, solid below a graphite zigzag break line about seven risers up and pencil-dashed beyond; the arrow starts with an open circle on the first tread, stops short of the break, and UP sits upright outside the first riser. The engine draws dashes as dark as the solid treads, a filled bow-tie mark instead of a cut line, and prints UP across the treads.",
    // Exemplar: the hall stair, 0.90 × 3.30 m, drawn there rising south (rotate 180); canonical rotate 0 rises north.
    def: { title: "Straight stair", centre: [5.25, 7.4], rotate: 180 },
    draw(s) {
      const ST = { x0: 4.8, x1: 5.7, y0: 5.75, y1: 9.05 };
      const tread = 0.275;
      const breakAt = (x) => 7.62 - ((x - ST.x0) / (ST.x1 - ST.x0)) * 0.34;
      s.rect(ST.x0, ST.y0, ST.x1, ST.y1, 0, SN);
      for (let k = 1; k < 12; k++) {
        const yy = +(ST.y0 + k * tread).toFixed(3);
        const xc = ST.x0 + ((7.62 - yy) / 0.34) * (ST.x1 - ST.x0);
        if (yy <= breakAt(ST.x1)) s.line(ST.x0, yy, ST.x1, yy, TREAD);
        else if (yy >= breakAt(ST.x0)) s.line(ST.x0, yy, ST.x1, yy, TREAD_ABOVE);
        else {
          s.line(ST.x0, yy, xc, yy, TREAD);
          s.line(xc, yy, ST.x1, yy, TREAD_ABOVE);
        }
      }
      const xa = ST.x0, xb = ST.x1, ym = (breakAt(xa) + breakAt(xb)) / 2, xm = (xa + xb) / 2;
      s.path([["M", xa, breakAt(xa)], ["L", xm - 0.06, ym + 0.02], ["L", xm - 0.02, ym - 0.12], ["L", xm + 0.03, ym + 0.11], ["L", xm + 0.07, ym - 0.02], ["L", xb, breakAt(xb)]], BREAK);
      s.circle(5.25, 5.9, 2.6, `fill="${C.paper}" stroke="${C.graphite}" stroke-width="1.1"`);
      s.line(5.25, 5.94, 5.25, 7.08, `stroke="${C.graphite}" stroke-width="1.1"`);
      s.path([["M", 5.25 - 3.6 / K, 7.08 - 7 / K], ["L", 5.25, 7.08 + 1 / K], ["L", 5.25 + 3.6 / K, 7.08 - 7 / K], ["Z"]], `fill="${C.graphite}"`);
      // "UP" upright just outside the first riser: the exemplar's 14.7 px gap, mirrored below the stair.
      s.text(5.25, 5.75, "UP", { dy: 14.72 + 9.5 * 0.727, fs: 9.5, weight: 600, fill: C.graphite, tracking: 0.4 });
    },
  },
  {
    id: "stairs-u",
    label: "U-shaped stair (half landing)",
    engine: "stairs-u",
    usageUsers: 48,
    inExemplar: false,
    dsl: ["furniture stairs-u in hall at 0.2,0.3 size 1.9x2.9", "furniture stairs-u in hall at 0.2,0.3 size 1.9x2.9 rotate 180"],
    standard: "Switchback stair: two parallel flights joined by a half landing for a 180° turn (RoomSketcher); landing shown solid, arrow following the path of travel, break line and dashed treads beyond the cut (Engineer Fix)",
    sourceUrl: ENGINEERFIX,
    notes: "Two 0.95 m flights of seven 0.275 m treads each (0.9 m is the usual minimum flight width) and a 0.975 m half landing, 1.90 × 2.90 m overall. The first flight rises north on the east side as in the engine; the arrow turns across the landing and stops before the break line two treads into the return flight, whose remaining treads are pencil-dashed. Tread, break, arrow and UP rules are the straight stair's. The engine draws the same plan but with dashes as dark as the treads, a filled bow-tie cut mark and UP printed across the treads.",
    def: { title: "U-shaped stair", centre: [0.95, 1.45] },
    draw(s) {
      const W = 0.95;
      const landing = 0.975;
      const end = 2.9;
      s.rect(0, 0, 2 * W, end, 0, SN);
      s.line(W, landing, W, end, SN);
      s.line(0, landing, 2 * W, landing, TREAD);
      // first flight: rising north on the east half (walker's right = east)
      flight(s, (u, v) => [2 * W - v, end - u], { width: W, from: 1, to: 6 });
      // return flight: travelling south on the west half (walker's right = west)
      const cutAt = 2.5 * 0.275;
      flight(s, (u, v) => [v, landing + u], { width: W, from: 1, to: 6, cutAt });
      stairArrow(s, [[1.5 * W, end - 0.15], [1.5 * W, landing / 2], [0.5 * W, landing / 2], [0.5 * W, landing + cutAt - 0.33]]);
      s.text(1.5 * W, end, "UP", { dy: 14.72 + 9.5 * 0.727, fs: 9.5, weight: 600, fill: C.graphite, tracking: 0.4 });
    },
  },
  {
    id: "door-bifold",
    label: "Bifold door",
    engine: null,
    usageUsers: 36,
    inExemplar: false,
    dsl: ["door between bedroom closet at 50% width 1.2 type bifold", "door hall west at 30% width 0.9 type bifold"],
    standard: "Bifold door as angled panel pairs forming a V or accordion shape in the opening (The Blueprint Primer); four-panel closet bifolds are two pairs meeting at the centre, sold for 48 in (1.22 m) openings",
    sourceUrl: BLUEPRINT,
    notes: "A 1.20 m closet opening in a 0.12 m partition with four 0.30 m panels in two pairs, each pair folded to 40° so its knee stands 0.19 m out of the wall face. Panels are 1.6 px graphite like every door leaf; there is no swing arc because a bifold does not sweep a quarter circle. The engine has no catalog door; in plans it draws two shallow tent peaks that span the whole opening, which reads as a closed zigzag rather than folding doors.",
    def: { title: "Bifold door", centre: [0, 0.1] },
    draw(s) {
      wall(s, -0.9, -0.6, 0.12);
      wall(s, 0.6, 0.9, 0.12);
      const p = 0.3;
      const a = (40 * Math.PI) / 180;
      const face = 0.06;
      for (const side of [-1, 1]) {
        const j = side * 0.6;
        const knee = [j - side * p * Math.cos(a), face + p * Math.sin(a)];
        const tip = [j - side * 2 * p * Math.cos(a), face];
        s.path([["M", j, face], ["L", ...knee], ["L", ...tip]], LEAFP);
      }
    },
  },
  {
    id: "door-pocket",
    label: "Pocket door",
    engine: null,
    usageUsers: 22,
    dsl: ["door between bath hall from start 0.3 width 0.8 type pocket", "door between pantry kitchen at 50% width 0.8 type pocket"],
    standard: "Pocket door as a leaf partly withdrawn into a cavity inside the wall thickness, no swing (The Blueprint Primer)",
    sourceUrl: BLUEPRINT,
    notes: "The exemplar's bathroom door: a 0.80 m opening in a 0.12 m partition (pocket doors are usually 0.6–0.9 m), a white cavity slot running a door's width into the wall, and a 1.6 px graphite leaf half drawn out of it with a short graphite pull mark at its edge. Turned from the exemplar's north–south wall to run east–west, pocket to the east. The engine has no catalog door; in plans it draws half a thin line in the gap with no cavity, so it cannot be told from a sliding door.",
    // Exemplar: bath–hall pocket door on the x = 5.8 partition, 4.7–5.5, cavity to the south; rotate -90 puts the pocket east.
    def: { title: "Pocket door", centre: [5.8, 5.6], rotate: -90 },
    draw(s) {
      const lo = 4.7;
      const hi = 5.5;
      const width = hi - lo;
      s.rect(5.74, 4.4, 5.86, lo, 0, POCHE);
      s.rect(5.74, hi, 5.86, hi + width + 0.3, 0, POCHE);
      s.rect(5.775, hi, 5.825, hi + width, 0, `fill="${C.paper}"`);
      s.line(5.8, lo + width * 0.45, 5.8, hi + width - 0.04, `stroke="${C.graphite}" stroke-width="1.6"`);
      s.line(5.74, lo + width * 0.45, 5.86, lo + width * 0.45, `stroke="${C.graphite}" stroke-width="1.2"`);
    },
  },
  {
    id: "stairs-l",
    label: "L-shaped stair (quarter landing)",
    engine: "stairs-l",
    usageUsers: 6,
    inExemplar: false,
    dsl: ["furniture stairs-l in hall at 0.2,0.2 size 3.4x2.3", "furniture stairs-l in hall at 0.2,0.2 size 3.4x2.3 rotate 90"],
    standard: "Quarter-landing stair turning 90° at a landing; the landing usually falls below the ~4 ft cut and is shown solid, the arrow bends with the path of travel, treads beyond the break dashed (Engineer Fix; RoomSketcher)",
    sourceUrl: ENGINEERFIX,
    notes: "0.95 m flights: five 0.275 m treads rising north up the west side to a 0.95 m square landing, then nine treads rising east, 3.43 × 2.33 m overall (16 risers at about 180 mm reach a 2.9 m storey). The arrow turns at the landing and stops before the break line three treads into the upper flight; treads beyond are pencil-dashed. Same turn direction as the engine. The engine draws dashes as dark as the treads, a filled bow-tie cut mark and UP printed across the treads.",
    def: { title: "L-shaped stair", centre: [1.7125, 1.1625] },
    draw(s) {
      const W = 0.95;
      const T = 0.275;
      const run1 = W + 5 * T; // south end of the first flight
      const run2 = W + 9 * T; // east end of the upper flight
      s.path([["M", 0, 0], ["L", run2, 0], ["L", run2, W], ["L", W, W], ["L", W, run1], ["L", 0, run1], ["Z"]], SN);
      s.line(0, W, W, W, TREAD);
      s.line(W, 0, W, W, TREAD);
      flight(s, (u, v) => [W - v, run1 - u], { width: W, from: 1, to: 4 });
      const cutAt = 3.5 * T;
      flight(s, (u, v) => [W + u, W - v], { width: W, from: 1, to: 8, cutAt });
      stairArrow(s, [[W / 2, run1 - 0.15], [W / 2, W / 2], [W + cutAt - 0.33, W / 2]]);
      s.text(W / 2, run1, "UP", { dy: 14.72 + 9.5 * 0.727, fs: 9.5, weight: 600, fill: C.graphite, tracking: 0.4 });
    },
  },

  // ── Furniture and fixtures, by users ──
  {
    id: "counter",
    label: "Kitchen counter",
    engine: "counter",
    usageUsers: 737,
    dsl: ["furniture counter in kitchen at 3.55,0.9 size 0.6x3.0", "furniture counter in utility at 0.12,2.35 size 0.65x1.2"],
    standard: "Base cabinets 24 in (0.61 m) deep under a 25 in countertop (NKBA Kitchen Planning Guidelines); built-in surfaces toned apart from loose furniture (RoomSketcher cabinets and countertops)",
    sourceUrl: NKBA,
    notes: "A 1.80 × 0.60 m run, back to the north wall, in mist with a 1.1 px slate outline: the exemplar keeps mist for built-ins only, so a counter never reads as a table. The engine draws it white with a dashed line near the front edge that looks like an overhang or a hidden cabinet.",
    // Exemplar: the kitchen counter run on the east wall; the depth is the DSL's 0.60 m.
    def: { title: "Kitchen counter", centre: [9.55, 2.4], rotate: -90 },
    draw(s) {
      s.rect(9.25, 1.5, 9.85, 3.3, 0, SM);
    },
  },
  {
    id: "desk",
    label: "Desk with chair",
    engine: "desk",
    usageUsers: 726,
    inExemplar: false,
    dsl: ["furniture desk in office at 0.5,0.2 size 1.2x0.6", "grid desk in classroom rows 3 cols 3 centers 1,1 4,3.5"],
    standard: "Desk drawn to its worktop, 1200–1500 × 600–750 mm, with the task chair pulled up to the front edge (Metric Data: standard furniture sizes)",
    sourceUrl: METRIC,
    notes: "A 1.20 × 0.60 m worktop in the loose-furniture style (white, 1.1 px slate, 2 px corners) with the task chair drawn in front of it, back to the south, because the engine's `desk` word adds a chair on its own. The engine draws a plain box and a grey dining-chair square below it, so a desk and a table for one look alike.",
    def: { title: "Desk with chair", centre: [0, 0.25] },
    draw(s) {
      taskChair(s, 0, 0.66, -1);
      s.rect(-0.6, -0.3, 0.6, 0.3, 2, S);
    },
  },
  {
    id: "plant",
    label: "Potted plant",
    engine: "plant",
    usageUsers: 725,
    inExemplar: false,
    dsl: ["furniture plant in living at 5.2,0.3", "furniture plant in lobby at 0.4,0.4 size 0.6x0.6"],
    standard: "Plant in plan as a pot circle with leaves radiating over it (convention of real-estate marketing plans such as RoomSketcher's furniture library)",
    sourceUrl: ROOMSKETCHER,
    notes: "A 0.40 m pot (a common floor planter size) under seven leaves reaching 0.60 m across, leaves in 0.8 px slate over a 1.1 px pot rim. The engine draws a circle with six spokes, which reads as a ceiling fan or a wheel.",
    def: { title: "Potted plant", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.2 * K, S);
      const n = 7;
      const r0 = 0.03;
      const r1 = 0.3;
      const half = 0.06;
      const chord = r1 - r0;
      const R = (chord * chord) / 4 / (2 * half) + half / 2;
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (k * 2 * Math.PI) / n;
        const p0 = [r0 * Math.cos(a), r0 * Math.sin(a)];
        const p1 = [r1 * Math.cos(a), r1 * Math.sin(a)];
        s.path([["M", ...p0], ["A", R, R, 1, ...p1], ["A", R, R, 1, ...p0], ["Z"]], `stroke="${C.slate}" stroke-width="0.8" fill="${C.paper}"`);
      }
      s.circle(0, 0, 0.035 * K, `fill="${C.slate}"`);
    },
  },
  {
    id: "sink",
    label: "Washbasin",
    engine: "sink",
    usageUsers: 704,
    inExemplar: false,
    dsl: ["furniture sink in bath at 0.2,0.1", "furniture sink in restroom at 0.3,0.1 size 0.55x0.45 rotate 90"],
    standard: "Wall-hung washbasin drawn to fixture size, typically 500–600 mm wide and 400–500 mm deep, with the bowl and tap at the wall side (House Plans Helper, bathroom dimensions)",
    sourceUrl: BATH,
    notes: "A 0.55 × 0.45 m basin, back to the north wall: white body in 1.1 px slate with 3 px corners, the exemplar vanity's oval bowl and its solid tap dot at the back. The engine's version is close in shape, but its outline is heavier and its bowl thinner, so the sink reads as a box with a mark in it.",
    def: { title: "Washbasin", centre: [0, 0] },
    draw(s) {
      s.rect(-0.275, -0.225, 0.275, 0.225, 3, S);
      s.ellipse(0, 0.03, 0.19, 0.13, S);
      s.circle(0, -0.155, 1.6, `fill="${C.slate}"`);
    },
  },
  {
    id: "toilet",
    label: "Toilet",
    engine: "toilet",
    usageUsers: 595,
    dsl: ["furniture toilet in bath at 1.57,1.0 size 0.4x0.7", "furniture wc in bath at 1.57,1.0 size 0.4x0.7 rotate 90", "furniture water-closet in bath at 1.57,1.0"],
    standard: "Water closet in plan: tank against the wall and an elongated bowl with seat opening, drawn to fixture size; total depth including tank 66–74 cm (House Plans Helper, bathroom dimensions)",
    sourceUrl: BATH,
    notes: "Tank against the north wall and an elongated bowl with a seat opening, 0.70 m from the wall overall. The exemplar's own toilet is only 0.62 m with a round front, so the bowl is lengthened here; the engine draws a heavy circle hanging off the tank, which reads as a round bowl.",
    // Exemplar: the bathroom toilet, tank on the east wall (rotate 90); canonical rotate 0 puts the tank north.
    def: { title: "Toilet", centre: [7.57, 5.75], rotate: -90 },
    draw(s) {
      // Tank as in the exemplar; bowl lengthened so the fixture is 0.70 m from the wall (its DSL size).
      const neck = 7.58; // tank face 7.70 → start of the elongated front
      const front = 7.22;
      const half = 0.18; // half bowl width
      s.rect(7.7, 5.52, 7.92, 5.98, 2, S);
      s.path([["M", 7.7, 5.75 - half], ["L", neck, 5.75 - half], ["A", neck - front, half, 0, neck, 5.75 + half], ["L", 7.7, 5.75 + half], ["Z"]], S);
      s.bound(front, 5.75);
      s.ellipse(7.45, 5.75, 0.15, 0.11, THIN);
    },
  },
  {
    id: "chair",
    label: "Chair",
    engine: "chair",
    usageUsers: 561,
    dsl: ["furniture chair in kitchen at 1.1,1.8", "furniture chair in kitchen at 1.1,3.25 rotate 180"],
    standard: "Side chair drawn to its seat, about 450 × 450 mm, with the backrest as a line along the back edge (Metric Data: standard furniture sizes)",
    sourceUrl: METRIC,
    notes: "The exemplar's dining chair: 0.42 × 0.42 m, 3 px corners, white with a 0.8 px backrest line 0.07 m inside the north edge, so the chair faces south. The engine's chair has its backrest on the west edge at rotate 0, a quarter turn from the sofa and armchair, and a grey fill.",
    // Exemplar: a chair on the north side of the dining table, back to the north.
    def: { title: "Chair", centre: [7.1, 2.04] },
    draw(s) {
      s.rect(6.89, 1.83, 7.31, 2.25, 3, S);
      s.line(6.89, 1.9, 7.31, 1.9, THIN);
    },
  },
  {
    id: "rug",
    label: "Rug",
    engine: "rug",
    usageUsers: 531,
    dsl: ["furniture rug in living at 0.9,1.0 size 2.8x2.0"],
    standard: "Area rug as a light outline under the furniture it anchors, standard sizes 1.6 × 2.3 m to 2.4 × 3.0 m (real-estate plan practice, RoomSketcher furniture library)",
    sourceUrl: ROOMSKETCHER,
    notes: "The exemplar's living-room rug, 2.80 × 2.00 m: a 1 px pencil border with a 0.6 px pencil inner border 0.1 m in, no fill, so furniture drawn over it stays in front. The engine draws a dashed grey outline, which reads as a zone or something overhead rather than a rug.",
    def: { title: "Rug", centre: [2.3, 2.0] },
    draw(s) {
      s.rect(0.9, 1.0, 3.7, 3.0, 2, `stroke="${C.pencil}" stroke-width="1" fill="none"`);
      s.rect(1.0, 1.1, 3.6, 2.9, 1, `stroke="${C.pencil}" stroke-width="0.6" fill="none"`);
    },
  },
  {
    id: "sofa",
    label: "Sofa",
    engine: "sofa",
    usageUsers: 520,
    dsl: ["furniture sofa in living at 1.2,3.3 size 2.2x0.9 rotate 180", "furniture couch in lounge at 0.3,0.2"],
    standard: "Three-seat sofa 2100–2340 × 890–990 mm, drawn with back, arms and seat cushions (Metric Data: standard furniture sizes)",
    sourceUrl: METRIC,
    notes: "The exemplar's sofa, 2.20 × 0.90 m with 4 px corners: 0.18 m arms and back and three seat cushions in 0.8 px lines. Turned so the back is north at rotate 0, as the engine's sofa is. The engine's version matches in layout but its back band and outline are heavier.",
    // Exemplar: the living-room sofa, back on the south side (rotate 180 in the DSL).
    def: { title: "Sofa", centre: [2.3, 3.75], rotate: 180 },
    draw(s) {
      s.rect(1.2, 3.3, 3.4, 4.2, 4, S);
      s.line(1.38, 3.3, 1.38, 4.02, THIN);
      s.line(3.22, 3.3, 3.22, 4.02, THIN);
      s.line(1.38, 4.02, 3.22, 4.02, THIN);
      s.line(1.99, 3.3, 1.99, 4.02, THIN);
      s.line(2.61, 3.3, 2.61, 4.02, THIN);
    },
  },
  {
    id: "coffee-table",
    label: "Coffee table",
    engine: "coffee-table",
    usageUsers: 519,
    dsl: ["furniture coffee-table in living at 1.8,1.9 size 1.0x0.6"],
    standard: "Coffee table 1000 × 500 mm (large) or 750 × 750 mm (small) (Metric Data: standard furniture sizes)",
    sourceUrl: METRIC,
    notes: "The exemplar's coffee table: a plain 1.00 × 0.60 m white top with 3 px corners. The engine's is the same shape with a heavier outline.",
    def: { title: "Coffee table", centre: [2.3, 2.2] },
    draw(s) {
      s.rect(1.8, 1.9, 2.8, 2.5, 3, S);
    },
  },
  {
    id: "fridge",
    label: "Refrigerator",
    engine: "fridge",
    usageUsers: 513,
    dsl: ["furniture fridge in kitchen at 3.45,0.15 size 0.6x0.7", "furniture refrigerator in kitchen at 0.1,0.1"],
    standard: "Refrigerator as a box tagged REF (RoomSketcher); full-size units 600–910 mm wide and about 700 mm deep (NKBA Kitchen Planning Guidelines)",
    sourceUrl: ROOMSKETCHER,
    notes: "The exemplar's refrigerator: 0.60 m wide, 0.70 m deep, back to the north wall, white with 'REF' in 8.5 px semibold slate. The engine adds a door band across the top and sets REF larger and lighter.",
    def: { title: "Refrigerator", centre: [9.55, 0.5] },
    draw(s) {
      s.rect(9.25, 0.15, 9.85, 0.85, 0, S);
      s.text(9.55, 0.5, "REF", { dy: 3.2, fs: 8.5, weight: 600, fill: C.slate });
    },
  },
  {
    id: "dining-table",
    label: "Dining table (4 seats)",
    engine: "dining-table",
    usageUsers: 509,
    dsl: ["furniture dining-table in kitchen at 0.9,2.3 size 1.6x0.9", "furniture dining-table in dining at 1,1 size 2.0x0.9 seats \"Ann\" \"Bo\" \"Cy\" \"Di\" \"Ed\" \"Flo\""],
    standard: "Dining table for four 1350 × 750 mm, for six 1500 × 900 mm, with chairs about 450 mm square pulled up to the long sides (Metric Data: standard furniture sizes)",
    sourceUrl: METRIC,
    notes: "The exemplar's dining group: a 1.60 × 0.90 m table with two 0.42 m chairs on each long side, 0.05 m off the edge, backs outward; the engine likewise seats the long sides one chair per 0.65 m. The engine's chairs are grey-filled and sit farther from the table.",
    def: { title: "Dining table (4 seats)", centre: [7.5, 2.75] },
    draw(s) {
      s.rect(6.7, 2.3, 8.3, 3.2, 2, S);
      for (const cx of [7.1, 7.9]) {
        s.rect(cx - 0.21, 1.83, cx + 0.21, 2.25, 3, S);
        s.line(cx - 0.21, 1.9, cx + 0.21, 1.9, THIN);
        s.rect(cx - 0.21, 3.25, cx + 0.21, 3.67, 3, S);
        s.line(cx - 0.21, 3.6, cx + 0.21, 3.6, THIN);
      }
    },
  },
  {
    id: "kitchen-sink",
    label: "Kitchen sink (double bowl)",
    engine: "kitchen-sink",
    usageUsers: 477,
    dsl: ["furniture kitchen-sink in kitchen at 3.45,1.29 size 0.8x0.5 rotate 90", "fixture kitchen-sink in kitchen on north at 40%"],
    standard: "Sink bowls set into the countertop, tap at the back (NKBA Kitchen Planning Guidelines: sink in a 24 in deep counter run)",
    sourceUrl: NKBA,
    notes: "The exemplar's double-bowl sink, two 0.36 m bowls with 3 px corners and a solid tap dot at the wall, shown on a 1.10 m piece of mist counter because a sink is always set into one. The counter piece is context, as the wall stubs are for doors. The engine draws its own white box around the bowls, so a sink placed on a counter shows a second outline.",
    // Exemplar: the sink on the east counter run; rotate -90 puts the wall north.
    def: { title: "Kitchen sink", centre: [9.6, 1.54], rotate: -90 },
    draw(s) {
      s.rect(9.35, 0.99, 9.85, 2.09, 0, SM);
      s.rect(9.42, 1.16, 9.78, 1.52, 3, S);
      s.rect(9.42, 1.58, 9.78, 1.92, 3, S);
      s.circle(9.8, 1.55, 1.8, `fill="${C.slate}"`);
    },
  },
  {
    id: "shelving",
    label: "Shelving (gondola run)",
    engine: "shelving",
    usageUsers: 436,
    inExemplar: false,
    dsl: ["furniture shelving in shop at 2,2 size 2.7x0.9", "grid shelving in shop rows 3 cols 1 centers 2.5,1 2.5,4"],
    standard: "Retail gondola in 3 ft or 4 ft sections; double-sided island units 32–48 in (0.8–1.2 m) deep overall (gondola shelving size guides)",
    sourceUrl: "https://www.gondola-shelving.com/blogs/blogs/gondola-shelving-size-guide-heights-depths-backs-more",
    notes: "A double-sided run of three 0.90 m (3 ft) sections, 2.70 × 0.90 m: white fixture outline in 1.1 px slate, a 0.06 m back-to-back spine and the section joints in 0.8 px lines; at two sections the same drawing read as a table. Wall shelving against a wall is `bookshelf`. The engine draws a 4 × 2 grid of small cells, which reads as lockers or a table.",
    def: { title: "Shelving", centre: [0, 0] },
    draw(s) {
      s.rect(-1.35, -0.45, 1.35, 0.45, 0, S);
      s.line(-1.35, -0.03, 1.35, -0.03, THIN);
      s.line(-1.35, 0.03, 1.35, 0.03, THIN);
      for (const x of [-0.45, 0.45]) {
        s.line(x, -0.45, x, -0.03, THIN);
        s.line(x, 0.03, x, 0.45, THIN);
      }
    },
  },
  {
    id: "stove",
    label: "Stove (range)",
    engine: "stove",
    usageUsers: 434,
    inExemplar: false,
    dsl: ["furniture stove in kitchen at 3.55,2.95 size 0.6x0.6", "fixture cooktop in kitchen on north at 70%"],
    standard: "Range or cooktop as a box with four burner circles, freestanding ranges 24–30 in (0.61–0.76 m) wide (NKBA Kitchen Planning Guidelines; RoomSketcher ovens and stovetops)",
    sourceUrl: NKBA,
    notes: "A freestanding 0.60 × 0.60 m range, back to the north wall: the exemplar hob's four burners (0.07 and 0.09 m radii on the diagonals) in 0.8 px lines, plus a 0.8 px control-panel line 0.08 m from the back that the built-in hob does not have. The engine's four equal burners are close; its outline is heavier.",
    def: { title: "Stove", centre: [0, 0] },
    draw(s) {
      s.rect(-0.3, -0.3, 0.3, 0.3, 0, S);
      s.line(-0.3, -0.22, 0.3, -0.22, THIN);
      for (const [x, y, r] of [[-0.13, -0.08, 0.07], [0.13, -0.08, 0.09], [-0.13, 0.17, 0.09], [0.13, 0.17, 0.07]]) s.circle(x, y, r * K, THIN);
    },
  },
  {
    id: "wardrobe",
    label: "Wardrobe",
    engine: "wardrobe",
    usageUsers: 431,
    dsl: ["furniture wardrobe in guest at 2.72,2.4 size 0.6x1.8", "furniture closet in bedroom at 0.2,0.1 size 1.8x0.6"],
    standard: "Wardrobe or closet with the hanging rail drawn along its length and hangers across it, 600 mm deep (House Plans Helper; Metric Data: standard furniture sizes)",
    sourceUrl: HPH,
    notes: "The exemplar's wardrobe, 1.80 × 0.60 m: white, a 0.8 px rail down the middle and slanted 0.8 px hanger marks every 0.15 m. Turned so the back is on the north wall. The engine draws upright ticks through the rail, which reads as a measuring scale.",
    // Exemplar: the guest-bedroom wardrobe, back on the east partition; rotate -90 puts the back north.
    def: { title: "Wardrobe", centre: [3.02, 7.7], rotate: -90 },
    draw(s) {
      s.rect(2.72, 6.8, 3.32, 8.6, 0, S);
      s.line(3.02, 6.86, 3.02, 8.54, THIN);
      for (let yy = 7.0; yy <= 8.45; yy += 0.15) s.line(2.86, yy + 0.03, 3.18, yy - 0.03, THIN);
    },
  },
  {
    id: "armchair",
    label: "Armchair",
    engine: "armchair",
    usageUsers: 429,
    dsl: ["furniture armchair in living at 1.0,0.5 size 0.8x0.8", "furniture lounge-chair in lobby at 2,1 rotate 90"],
    standard: "Armchair about 900 × 950 mm, drawn with back and arms (Metric Data: standard furniture sizes)",
    sourceUrl: METRIC,
    notes: "The exemplar's armchair, 0.80 × 0.80 m with 4 px corners, back to the north: 0.14 m arms and a 0.18 m back in 0.8 px lines. The engine's matches in layout with a heavier back band.",
    def: { title: "Armchair", centre: [1.4, 0.9] },
    draw(s) {
      s.rect(1.0, 0.5, 1.8, 1.3, 4, S);
      s.line(1.14, 0.68, 1.14, 1.3, THIN);
      s.line(1.66, 0.68, 1.66, 1.3, THIN);
      s.line(1.14, 0.68, 1.66, 0.68, THIN);
    },
  },
  {
    id: "desk-chair",
    label: "Office chair",
    engine: "desk-chair",
    usageUsers: 399,
    inExemplar: false,
    dsl: ["furniture desk-chair in office at 1.1,1.0", "furniture desk-chair in office at 1.1,1.0 rotate 180"],
    standard: "Task chair about 650 × 650 mm of floor including its five-star base (BIFMA / EN 1335 sizes, office furniture dimension guides)",
    sourceUrl: "https://kavela.furniture/en/office-furniture-dimensions-guide/",
    notes: "A 0.46 × 0.42 m seat with 4 px corners and a curved backrest to the north, over a five-star base 0.60 m across whose casters show beyond the seat; outlines 1.1 px, base 0.8 px. The engine's `desk-chair` is a desk-sized box with a small chair below it, so it reads as a desk.",
    def: { title: "Office chair", centre: [0, 0] },
    draw(s) {
      taskChair(s, 0, 0, 1);
    },
  },
  {
    id: "shower",
    label: "Shower tray",
    engine: "shower",
    usageUsers: 362,
    dsl: ["furniture shower in bath at 1.2,2.7 size 0.9x0.9"],
    standard: "Shower as a square tray with crossed lines through the centre to the drain (House Plans Helper); recommended size 36 × 36 in, 91 × 91 cm (House Plans Helper, bathroom dimensions)",
    sourceUrl: HPH,
    notes: "The exemplar's shower: a 0.90 × 0.90 m mist tray (built-in) with 0.8 px pencil diagonals and a small drain circle at the crossing. The engine puts a shower-head circle in one corner and draws the diagonals as dark as the outline.",
    def: { title: "Shower tray", centre: [7.45, 7.55] },
    draw(s) {
      s.rect(7.0, 7.1, 7.9, 8.0, 0, SM);
      s.line(7.0, 7.1, 7.9, 8.0, `stroke="${C.pencil}" stroke-width="0.8"`);
      s.line(7.9, 7.1, 7.0, 8.0, `stroke="${C.pencil}" stroke-width="0.8"`);
      s.circle(7.45, 7.55, 0.045 * K, S);
    },
  },
  {
    id: "bookshelf",
    label: "Bookshelf",
    engine: "bookshelf",
    usageUsers: 342,
    dsl: ["furniture bookshelf in living at 0.15,3.05 size 0.35x1.2", "furniture bookshelf in study at 0.5,0.1 size 1.2x0.35"],
    standard: "Wall shelving drawn to its footprint, about 300–400 mm deep, with bay divisions (Metric Data: standard furniture sizes, storage units)",
    sourceUrl: METRIC,
    notes: "The exemplar's bookshelf, 1.20 × 0.35 m with bay divisions every 0.40 m in 0.8 px lines, back to the north wall. The engine divides it into narrow 0.15 m slots, which reads as a radiator or a grille.",
    // Exemplar: the living-room bookshelf, back on the west wall; rotate 90 puts the back north.
    def: { title: "Bookshelf", centre: [0.325, 3.65], rotate: 90 },
    draw(s) {
      s.rect(0.15, 3.05, 0.5, 4.25, 0, S);
      for (const yy of [3.45, 3.85]) s.line(0.15, yy, 0.5, yy, THIN);
    },
  },
  {
    id: "bed-double",
    label: "Double bed",
    engine: "bed-double",
    usageUsers: 329,
    dsl: ["furniture bed-double in guest at 0.65,0.15 size 1.4x2.0"],
    standard: "Bed drawn to mattress size (double 1.40 × 2.00 m) with pillows at the head against the wall and the bedding shown turned down (House Plans Helper, floor plan symbols)",
    sourceUrl: HPH,
    notes: "A 1.40 × 2.00 m mattress with two pillows at the head, a fold line and a slanted turned-down sheet edge, in 1.1 px slate outlines with 0.8 px detail on white. The engine uses a stroke about twice as heavy, oversized pillows and no turned-down sheet, so it reads as a generic box.",
    // Exemplar: the guest bed, 1.40 × 2.00 m, head on the north wall.
    def: { title: "Double bed", centre: [1.35, 5.55] },
    draw(s) {
      s.rect(0.65, 4.55, 2.05, 6.55, 3, S);
      s.rect(0.75, 4.65, 1.3, 4.95, 3, S);
      s.rect(1.4, 4.65, 1.95, 4.95, 3, S);
      s.line(0.65, 5.15, 2.05, 5.15, THIN);
      s.path([["M", 0.65, 5.45], ["L", 2.05, 5.3]], THIN);
    },
  },
  // ── Tier 2, round 2, by users ──
  {
    id: "nightstand",
    label: "Nightstand",
    engine: "nightstand",
    tier: 2,
    usageUsers: 309,
    inExemplar: true,
    dsl: ["furniture nightstand in bedroom at 1.2,0.4 size 0.45x0.45"],
    standard: "Bedside table about 450 × 450 mm beside the bed head (Metric Data: standard furniture sizes)",
    sourceUrl: METRIC,
    notes: "The exemplar's 0.45 × 0.45 m nightstand, a typical bedside footprint (Metric Data), copied exactly with square corners and its central 0.08 m radius circle; the exemplar has no drawer line. The engine uses the same box-and-circle motif at 0.50 × 0.40 m with different stroke weights.",
    // Exemplar: the nightstand west of the guest bed, back to the north.
    def: { title: "Nightstand", centre: [0.395, 4.825] },
    draw(s) {
      s.rect(0.17, 4.6, 0.62, 5.05, 0, S);
      s.circle(0.395, 4.825, 0.08 * K, THIN);
    },
  },
  {
    id: "tv-stand",
    label: "TV stand",
    engine: "tv-stand",
    tier: 2,
    usageUsers: 282,
    inExemplar: false,
    dsl: ["furniture tv-stand in living at 1,0.3 size 1.5x0.45"],
    standard: "Low media cabinet with a thin screen along the wall side; typical 1500 × 450 mm footprint (round-2 size brief)",
    sourceUrl: null,
    notes: "A typical 1.50 × 0.45 m media cabinet (round-2 size brief), white with 2 px corners and a centred 1.20 × 0.06 m graphite screen bar at the north wall side. The engine defaults to 1.60 × 0.45 m and bisects the cabinet with a centre line, without showing a screen at the back.",
    def: { title: "TV stand", centre: [0, 0] },
    draw(s) {
      s.rect(-0.75, -0.225, 0.75, 0.225, 2, S);
      s.rect(-0.6, -0.185, 0.6, -0.125, 0, POCHE);
    },
  },
  {
    id: "whiteboard",
    label: "Whiteboard",
    engine: "whiteboard",
    tier: 2,
    usageUsers: 269,
    inExemplar: false,
    dsl: ["furniture whiteboard in classroom at 1,0.2 size 2.4x0.08"],
    standard: "Wall-mounted board shown edge-on in plan, with a pen tray on the room side; typical 2400 × 80 mm footprint (round-2 size brief)",
    sourceUrl: null,
    notes: "A typical 2.40 × 0.08 m wall-mounted board (round-2 size brief), back north, with a 0.8 px pen-tray line inset along the south edge and 2 px corners. The engine defaults to 3.00 × 0.12 m and draws a solid dark frame around a white strip, with no pen tray.",
    def: { title: "Whiteboard", centre: [0, 0] },
    draw(s) {
      s.rect(-1.2, -0.04, 1.2, 0.04, 2, S);
      s.line(-1.08, 0.01, 1.08, 0.01, THIN);
    },
  },
  {
    id: "bar-stool",
    label: "Bar stool",
    engine: "bar-stool",
    tier: 2,
    usageUsers: 251,
    inExemplar: false,
    dsl: ["furniture bar-stool in kitchen at 1,2 size 0.38x0.38"],
    standard: "Round stool seat about 380–400 mm across, with the footrest ring visible below (floor-plan inventory; round-2 size brief)",
    sourceUrl: null,
    notes: "A typical 0.38 m diameter seat (round-2 size brief), white in 1.1 px slate, over a 0.48 m diameter footrest ring in 0.8 px slate; the ring sets the overall footprint. The engine draws only a grey-filled 0.35 m seat circle, with no footrest.",
    def: { title: "Bar stool", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.24 * K, THIN);
      s.circle(0, 0, 0.19 * K, S);
    },
  },
  {
    id: "vanity",
    label: "Vanity (double basin)",
    engine: "vanity",
    tier: 2,
    usageUsers: 225,
    inExemplar: true,
    dsl: ["furniture vanity in bath at 0.4,0.2 size 1.2x0.55"],
    standard: "Built-in basin counter toned apart from loose furniture (NKBA bath planning convention); compact double vanity 1200 × 550 mm (accepted exemplar)",
    sourceUrl: BATH,
    notes: "The exemplar's compact 1.20 × 0.55 m double vanity (a typical 1.2 m basin counter), copied exactly: square-cornered mist counter, two white oval basins and solid tap dots to the north. The engine defaults to 1.50 × 0.55 m, fills the counter white and uses thinner basin outlines.",
    def: { title: "Vanity (double basin)", centre: [7.15, 4.795] },
    draw(s) {
      s.rect(6.55, 4.52, 7.75, 5.07, 0, SM);
      for (const cx of [6.85, 7.45]) {
        s.ellipse(cx, 4.8, 0.17, 0.12, S);
        s.circle(cx, 4.6, 1.6, `fill="${C.slate}"`);
      }
    },
  },
  {
    id: "island",
    label: "Kitchen island",
    engine: "island",
    tier: 2,
    usageUsers: 199,
    inExemplar: false,
    dsl: ["furniture island in kitchen at 1,1 size 2.1x0.95"],
    standard: "Freestanding built-in kitchen counter (NKBA kitchen planning convention); typical 2100 × 950 mm footprint (round-2 size brief)",
    sourceUrl: NKBA,
    notes: "A typical 2.10 × 0.95 m kitchen island (round-2 size brief), mist with 2 px corners and a dashed base-front line 0.28 m inside the south seating edge, leaving the overhang zone outside the base. The engine defaults to 1.80 × 0.90 m and adds an inset rectangle on a white top.",
    def: { title: "Kitchen island", centre: [0, 0] },
    draw(s) {
      s.rect(-1.05, -0.475, 1.05, 0.475, 2, SM);
      s.line(-1.05, 0.195, 1.05, 0.195, `${THIN} stroke-dasharray="3 2"`);
    },
  },
  {
    id: "side-table",
    label: "Side table",
    engine: "side-table",
    tier: 2,
    usageUsers: 185,
    inExemplar: false,
    dsl: ["furniture side-table in living at 1,1 size 0.5x0.5"],
    standard: "Small square occasional table, typically 500 × 500 mm (round-2 size brief); plain top as in the exemplar's coffee table",
    sourceUrl: null,
    notes: "A typical 0.50 × 0.50 m occasional table (round-2 size brief), a plain white top with the coffee table's 3 px corners and 1.1 px slate outline. The engine has the same footprint and rounded top, with different corner radius and outline styling.",
    def: { title: "Side table", centre: [0, 0] },
    draw(s) {
      s.rect(-0.25, -0.25, 0.25, 0.25, 3, S);
    },
  },
  {
    id: "dresser",
    label: "Dresser",
    engine: "dresser",
    tier: 2,
    usageUsers: 183,
    inExemplar: false,
    dsl: ["furniture dresser in bedroom at 1,0.3 size 1.2x0.5"],
    standard: "Chest of drawers about 500 mm deep (floor-plan inventory), 1200 × 500 mm typical footprint (round-2 size brief); drawer fronts face the room",
    sourceUrl: null,
    notes: "A typical 1.20 × 0.50 m dresser (round-2 size brief), back north, with two drawer-front lines and short pulls along the south edge in 0.8 px slate. The engine uses the same footprint but a line through the middle and two circular marks in the rear half.",
    def: { title: "Dresser", centre: [0, 0] },
    draw(s) {
      s.rect(-0.6, -0.25, 0.6, 0.25, 2, S);
      for (const cx of [-0.3, 0.3]) {
        s.line(cx - 0.27, 0.16, cx + 0.27, 0.16, THIN);
        s.line(cx - 0.08, 0.205, cx + 0.08, 0.205, THIN);
      }
    },
  },
  {
    id: "bathtub",
    label: "Bathtub",
    engine: "bathtub",
    tier: 2,
    usageUsers: 159,
    inExemplar: true,
    dsl: ["furniture bathtub in bath at 0.3,0.3 size 1.7x0.75"],
    standard: "Built-in tub with inner basin and drain, typically 1700 × 750 mm; minimum standard tub about 1530 × 760 mm (House Plans Helper, bathroom dimensions)",
    sourceUrl: BATH,
    notes: "The exemplar's typical 1.70 × 0.75 m built-in tub (House Plans Helper bathroom sizing), copied exactly with a mist surround, white basin with 12 px corners and an open drain circle, rotated 180° to put its wall side north. The engine defaults to 0.80 × 1.70 m with a white surround, rounded outer corners and a solid drain at the north end.",
    // Exemplar: bath under the south window; rotate 180 puts the wall north.
    def: { title: "Bathtub", centre: [6.8, 8.675], rotate: 180 },
    draw(s) {
      s.rect(5.95, 8.3, 7.65, 9.05, 0, SM);
      s.rect(6.05, 8.4, 7.55, 8.95, 12, S);
      s.circle(7.36, 8.675, 0.04 * K, THIN);
    },
  },
  {
    id: "round-table-4",
    label: "Round table (4 seats)",
    engine: "round-table-4",
    tier: 2,
    usageUsers: 155,
    inExemplar: false,
    dsl: ["furniture round-table-4 in dining at 1,1 size 1.84x1.84"],
    standard: "Compact four-seat round dining table about 900 mm diameter (round-2 size brief), with side chairs about 450 mm square (Metric Data: standard furniture sizes)",
    sourceUrl: METRIC,
    notes: "A typical compact 0.90 m diameter top (round-2 size brief) with four exact copies of the 0.42 m chair, 0.05 m from the edge at the cardinal points with backs outward, 1.84 × 1.84 m overall including chairs. The engine's size includes its chair ring and defaults to a 1.52 m top, with grey-filled chairs and different spacing.",
    def: { title: "Round table (4 seats)", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.45 * K, S);
      for (const side of [-1, 1]) {
        const c = side * 0.71;
        s.rect(-0.21, c - 0.21, 0.21, c + 0.21, 3, S);
        s.line(-0.21, c + side * 0.14, 0.21, c + side * 0.14, THIN);
        s.rect(c - 0.21, -0.21, c + 0.21, 0.21, 3, S);
        s.line(c + side * 0.14, -0.21, c + side * 0.14, 0.21, THIN);
      }
    },
  },

  // ── Remaining Tier 2 inventory, round 2 ──
  {
    id: "window-sliding",
    label: "Sliding window",
    engine: null,
    tier: 2,
    usageUsers: null,
    inExemplar: false,
    dsl: ["window room north at 50% width 1.4 type sliding"],
    standard: "Two glass panels on offset tracks in the wall (The Blueprint Primer) (floor-plan inventory); typical design size 1.4 × 0.3 m (Schematex catalog).",
    sourceUrl: "https://blueprintprimer.com/posts/door-and-window-symbols-on-floor-plans",
    notes: "A typical 1.40 m two-panel horizontal slider in a 0.30 m exterior wall (inventory / Blueprint Primer convention), with the fixed window's poché ends, face lines and blue glass on overlapping tracks. Chosen as a horizontal bypass slider; the engine lacks a catalog window and draws simpler offset lines in plans.",
    def: { title: "Sliding window", centre: [0, 0] },
    draw(s) {
      wall(s, -1, -0.7, 0.3);
      wall(s, 0.7, 1, 0.3);
      for (const y of [-0.15, 0.15]) s.line(-0.7, y, 0.7, y, FRAME);
      for (const x of [-0.7, 0.7]) s.line(x, -0.15, x, 0.15, FRAME);
      s.line(-0.7, -0.04, 0.06, -0.04, GLASS);
      s.line(-0.06, 0.04, 0.7, 0.04, GLASS);
      s.line(0.06, -0.1, 0.06, 0.02, FRAME);
      s.line(-0.06, -0.02, -0.06, 0.1, FRAME);
    },
  },
  {
    id: "window-casement",
    label: "Casement window",
    engine: null,
    tier: 2,
    usageUsers: null,
    inExemplar: false,
    dsl: ["window room north at 50% width 0.7 type casement"],
    standard: "Sash with an outward swing arc (European plan practice) (floor-plan inventory); typical design size 0.7 × 0.3 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 0.70 m single casement in a 0.30 m exterior wall (European plan convention in the inventory), using the fixed-window frame and an outward pencil quarter arc. Chosen left-hinged and open 90 degrees to the north, with a blue sash; the engine has no catalog window and draws the casement only inside plans.",
    def: { title: "Casement window", centre: [0, 0] },
    draw(s) {
      wall(s, -0.65, -0.35, 0.3);
      wall(s, 0.35, 0.65, 0.3);
      for (const y of [-0.15, 0.15]) s.line(-0.35, y, 0.35, y, FRAME);
      for (const x of [-0.35, 0.35]) s.line(x, -0.15, x, 0.15, FRAME);
      s.line(-0.35, 0, 0.35, 0, GLASS);
      s.line(-0.35, -0.15, -0.35, -0.85, GLASS);
      s.path([["M", 0.35, -0.15], ["A", 0.7, 0.7, 0, -0.35, -0.85]], ARC);
    },
  },
  {
    id: "window-bay",
    label: "Bay window",
    engine: null,
    tier: 2,
    usageUsers: null,
    inExemplar: false,
    dsl: ["window room north at 50% width 1.8 type bay"],
    standard: "Glazing projecting past the wall face on angled sides (floor-plan inventory); typical design size 1.8 × 0.75 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 1.80 m three-sided bay with about 0.45 m projection beyond a 0.30 m wall (inventory convention, chosen design size), with angled framed blue glazing and a room-side sill line. Chosen as a canted bay rather than a curved bow; the engine has no catalog bay and its in-plan drawing is simpler.",
    def: { title: "Bay window", centre: [0, 0] },
    draw(s) {
      wall(s, -1.2, -0.9, 0.3);
      wall(s, 0.9, 1.2, 0.3);
      s.line(-0.9, -0.15, -0.9, 0.15, FRAME);
      s.line(0.9, -0.15, 0.9, 0.15, FRAME);
      s.line(-0.9, 0.15, 0.9, 0.15, FRAME);
      s.path([["M", -0.9, -0.15], ["L", -0.5, -0.6], ["L", 0.5, -0.6], ["L", 0.9, -0.15]], FRAME+' fill="none"');
      s.path([["M", -0.9, -0.05], ["L", -0.47, -0.5], ["L", 0.47, -0.5], ["L", 0.9, -0.05]], FRAME+' fill="none"');
      s.path([["M", -0.9, -0.1], ["L", -0.485, -0.55], ["L", 0.485, -0.55], ["L", 0.9, -0.1]], GLASS+' fill="none"');
      for (const side of [-1, 1]) s.line(side * 0.5, -0.6, side * 0.47, -0.5, FRAME);
    },
  },
  {
    id: "north-arrow",
    label: "North arrow",
    engine: null,
    tier: 2,
    usageUsers: null,
    inExemplar: true,
    dsl: ["north"],
    standard: "North arrow beside graphic scale (NCS Uniform Drawing System convention); exact 34 px circle from the accepted exemplar.",
    sourceUrl: null,
    notes: "The exemplar's north arrow copied exactly: a 34 px pencil circle, split graphite-and-white pointer and 12 px semibold N, a fixed sheet notation rather than a physical footprint. The engine has no catalog entry and uses its own compass decoration in plans.",
    def: { title: "North arrow", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 17, `fill="none" stroke="${C.pencil}" stroke-width="1"`);
      s.path([["M", 0, -14 / K], ["L", -6 / K, 9 / K], ["L", 0, 5 / K], ["Z"]], POCHE);
      s.path([["M", 0, -14 / K], ["L", 6 / K, 9 / K], ["L", 0, 5 / K], ["Z"]], `fill="${C.paper}" stroke="${C.graphite}" stroke-width="1" stroke-linejoin="round"`);
      s.text(0, 0, "N", { dy: -23, fs: 12, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "column",
    label: "Column",
    engine: "column",
    tier: 2,
    usageUsers: 60,
    inExemplar: false,
    dsl: ["furniture column in room at 2,2 size 0.4x0.4"],
    standard: "Structural column, filled square or circle (floor-plan inventory); typical design size 0.4 × 0.4 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 0.40 m square structural column (catalog default), drawn as solid graphite cut material. Chosen square rather than circular; the engine has the same footprint but uses its lighter solid furniture colour; the usage count is inflated by label text and may also match longer symbol names.",
    def: { title: "Column", centre: [0, 0] },
    draw(s) {
      s.rect(-0.2, -0.2, 0.2, 0.2, 0, POCHE);
    },
  },
  {
    id: "elevator",
    label: "Elevator",
    engine: "elevator",
    tier: 2,
    usageUsers: 41,
    inExemplar: false,
    dsl: ["furniture elevator in room at 2,2 size 1.6x1.5"],
    standard: "Car outline with doors; kept in tier 2 as a core element of any multi-storey plan (floor-plan inventory); typical design size 1.6 × 1.5 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 1.60 × 1.50 m car footprint (catalog default), with the conventional X and a 0.90 m south door opening with partly retracted centre-opening panels. Chosen as the car only, excluding the shaft and clearances; the engine draws a closed X-box without an entrance.",
    def: { title: "Elevator", centre: [0, 0] },
    draw(s) {
      s.path([["M", -0.45, 0.75], ["L", -0.8, 0.75], ["L", -0.8, -0.75], ["L", 0.8, -0.75], ["L", 0.8, 0.75], ["L", 0.45, 0.75]], S);
      s.line(-0.7, -0.65, 0.7, 0.6, THIN);
      s.line(0.7, -0.65, -0.7, 0.6, THIN);
      s.line(-0.45, 0.75, 0.45, 0.75, THIN);
      s.line(-0.45, 0.7, -0.15, 0.7, THIN);
      s.line(0.15, 0.7, 0.45, 0.7, THIN);
    },
  },
  {
    id: "tv",
    label: "TV",
    engine: "tv",
    tier: 2,
    usageUsers: 433,
    inExemplar: false,
    dsl: ["furniture tv in room at 2,2 size 1.2x0.06"],
    standard: "Thin wall-mounted screen in plan (inventory); typical 1.20 × 0.06 m screen from the round-2 brief.",
    sourceUrl: null,
    notes: "A typical 1.20 × 0.06 m flat-screen footprint (round-2 screen-bar brief), centred with its back north in graphite. Chosen as a bare wall screen without a cabinet; the engine uses a thicker 1.40 × 0.15 m solid block; the usage count is inflated by label text and may also match longer symbol names.",
    def: { title: "TV", centre: [0, 0] },
    draw(s) {
      s.rect(-0.6, -0.03, 0.6, 0.03, 0, POCHE);
    },
  },
  {
    id: "bookcase",
    label: "Bookcase",
    engine: "bookcase",
    tier: 2,
    usageUsers: 177,
    inExemplar: true,
    dsl: ["furniture bookcase in room at 2,2 size 1.2x0.35"],
    standard: "Same plan convention as bookshelf; wall storage 300–400 mm deep (Metric Data).",
    sourceUrl: "https://www.firstinarchitecture.co.uk/metric-data-08-standard-furniture-sizes/",
    notes: "A typical 1.20 × 0.35 m bookcase (Metric Data storage convention), copying the accepted bookshelf's three 0.40 m bays and exact exemplar geometry, back north. The DSL keeps this as a separate word; the engine uses a 0.90 × 0.30 m box divided into narrow slots.",
    def: { title: "Bookcase", centre: [0, 0] },
    draw(s) {
      s.rect(-0.6, -0.175, 0.6, 0.175, 0, S);
      for (const x of [-0.2, 0.2]) s.line(x, -0.175, x, 0.175, THIN);
    },
  },
  {
    id: "bench",
    label: "Bench",
    engine: "bench",
    tier: 2,
    usageUsers: 151,
    inExemplar: false,
    dsl: ["furniture bench in room at 2,2 size 1.8x0.55"],
    standard: "Long seat without back (floor-plan inventory); typical design size 1.8 × 0.55 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 1.80 × 0.55 m backless bench (catalog default), with three seat boards in the accepted white furniture style. Chosen as a freestanding slatted bench; the engine adds cross-support lines over the boards.",
    def: { title: "Bench", centre: [0, 0] },
    draw(s) {
      s.rect(-0.9, -0.275, 0.9, 0.275, 3, S);
      for (const y of [-0.09, 0.09]) s.line(-0.9, y, 0.9, y, THIN);
    },
  },
  {
    id: "bed-king",
    label: "King bed",
    engine: "bed-king",
    tier: 2,
    usageUsers: 146,
    inExemplar: false,
    dsl: ["furniture bed-king in room at 2,2 size 1.93x2.03"],
    standard: "Mattress 1.93 × 2.03 m (US King) (inventory mattress convention); scaled accepted double-bed drawing.",
    sourceUrl: null,
    notes: "A 1.93 × 2.03 m mattress (inventory size), using the accepted double-bed geometry scaled in metres, including its paired pillows and slanted sheet edge, with fixed stroke weights and corner radii. Chosen US sizing for king and queen and metric sizing for single; the engine uses a plain fold line and different pillow proportions.",
    def: { title: "King bed", centre: [0, 0] },
    draw(s) {
      scaledBed(s, 1.93, 2.03);
    },
  },
  {
    id: "sectional",
    label: "Sectional sofa",
    engine: "sectional",
    tier: 2,
    usageUsers: 125,
    inExemplar: false,
    dsl: ["furniture sectional in room at 2,2 size 2.6x2.0"],
    standard: "L-shaped sofa with corner seat (floor-plan inventory); typical design size 2.6 × 2.0 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 2.60 × 2.00 m L-sofa (catalog default), with 0.90 m deep seating and 0.18 m back/arm bands in the accepted sofa's thin detail style. Chosen with the return on the west and backs north/west; the engine uses heavier separate back bands and a different cushion layout.",
    def: { title: "Sectional sofa", centre: [0, 0] },
    draw(s) {
      s.path([["M", -1.3, -1], ["L", 1.3, -1], ["L", 1.3, -0.1], ["L", -0.4, -0.1], ["L", -0.4, 1], ["L", -1.3, 1], ["Z"]], S);
      s.line(-1.12, -0.82, 1.12, -0.82, THIN);
      s.line(-1.12, -0.82, -1.12, 0.82, THIN);
      s.line(1.12, -0.82, 1.12, -0.1, THIN);
      s.line(-1.12, 0.82, -0.4, 0.82, THIN);
      s.line(-0.4, -0.82, -0.4, -0.1, THIN);
      s.line(0.36, -0.82, 0.36, -0.1, THIN);
      s.line(-1.12, -0.1, -0.4, -0.1, THIN);
      s.line(-1.12, 0.36, -0.4, 0.36, THIN);
    },
  },
  {
    id: "bed-queen",
    label: "Queen bed",
    engine: "bed-queen",
    tier: 2,
    usageUsers: 118,
    inExemplar: false,
    dsl: ["furniture bed-queen in room at 2,2 size 1.52x2.03"],
    standard: "Mattress 1.52 × 2.03 m (US Queen) (inventory mattress convention); scaled accepted double-bed drawing.",
    sourceUrl: null,
    notes: "A 1.52 × 2.03 m mattress (inventory size), using the accepted double-bed geometry scaled in metres, including its paired pillows and slanted sheet edge, with fixed stroke weights and corner radii. Chosen US sizing for king and queen and metric sizing for single; the engine uses a plain fold line and different pillow proportions.",
    def: { title: "Queen bed", centre: [0, 0] },
    draw(s) {
      scaledBed(s, 1.52, 2.03);
    },
  },
  {
    id: "floor-lamp",
    label: "Floor lamp",
    engine: "floor-lamp",
    tier: 2,
    usageUsers: 102,
    inExemplar: false,
    dsl: ["furniture floor-lamp in room at 2,2 size 0.4x0.4"],
    standard: "Floor lamp as shade and base circles (inventory); typical 400 mm shade, 200 mm base.",
    sourceUrl: null,
    notes: "A typical 0.40 m shade over a 0.20 m base (inventory floor-lamp convention, chosen design size), drawn as concentric circles with a stem dot. Chosen as physical furniture rather than an electrical ceiling point; the engine uses a crossed 0.35 m circle that resembles a light notation.",
    def: { title: "Floor lamp", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.2 * K, S);
      s.circle(0, 0, 0.1 * K, THIN);
      s.circle(0, 0, 1.6, `fill="${C.slate}"`);
    },
  },
  {
    id: "bed-single",
    label: "Single bed",
    engine: "bed-single",
    tier: 2,
    usageUsers: 93,
    inExemplar: false,
    dsl: ["furniture bed-single in room at 2,2 size 0.9x2"],
    standard: "Mattress 0.90 × 2.00 m (inventory mattress convention); scaled accepted double-bed drawing.",
    sourceUrl: null,
    notes: "A 0.90 × 2.00 m mattress (inventory size), using the accepted double-bed geometry scaled in metres, including its paired pillows and slanted sheet edge, with fixed stroke weights and corner radii. Chosen US sizing for king and queen and metric sizing for single; the engine uses a plain fold line and different pillow proportions.",
    def: { title: "Single bed", centre: [0, 0] },
    draw(s) {
      scaledBed(s, 0.9, 2);
    },
  },
  {
    id: "fireplace",
    label: "Fireplace",
    engine: "fireplace",
    tier: 2,
    usageUsers: 63,
    inExemplar: false,
    dsl: ["furniture fireplace in room at 2,2 size 1.5x0.5"],
    standard: "Hearth projecting from the wall, firebox recessed (floor-plan inventory); typical design size 1.5 × 0.5 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 1.50 × 0.50 m fireplace/hearth footprint (catalog default), with mist masonry, a recessed white firebox and a projecting south hearth. Chosen as a built-in masonry fireplace; the engine uses a white surround with angled rear detail.",
    def: { title: "Fireplace", centre: [0, 0] },
    draw(s) {
      s.rect(-0.75, -0.25, 0.75, 0.25, 0, SM);
      s.rect(-0.55, -0.2, 0.55, 0.05, 0, S);
      s.line(-0.65, 0.1, 0.65, 0.1, THIN);
    },
  },
  {
    id: "loveseat",
    label: "Loveseat",
    engine: "loveseat",
    tier: 2,
    usageUsers: 60,
    inExemplar: false,
    dsl: ["furniture loveseat in room at 2,2 size 1.5x0.95"],
    standard: "Two-seat sofa 1500 × 950 mm (Metric Data)",
    sourceUrl: "https://www.firstinarchitecture.co.uk/metric-data-08-standard-furniture-sizes/",
    notes: "A typical 1.50 × 0.95 m two-seat sofa (Metric Data / inventory), with the accepted sofa's 0.18 m back and arms and two cushions, back north. The engine defaults to 0.90 m depth and outlines its back band more heavily.",
    def: { title: "Loveseat", centre: [0, 0] },
    draw(s) {
      s.rect(-0.75, -0.475, 0.75, 0.475, 4, S);
      s.line(-0.57, -0.295, -0.57, 0.475, THIN);
      s.line(0.57, -0.295, 0.57, 0.475, THIN);
      s.line(-0.57, -0.295, 0.57, -0.295, THIN);
      s.line(0, -0.295, 0, 0.475, THIN);
    },
  },
  {
    id: "range",
    label: "Range",
    engine: "range",
    tier: 2,
    usageUsers: 201,
    inExemplar: false,
    dsl: ["furniture range in room at 2,2 size 0.9x0.85"],
    standard: "Commercial range with burners and oven (floor-plan inventory); typical design size 0.9 × 0.85 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 0.90 × 0.85 m commercial range (catalog default), six burners over an oven with its front and pull south, white as a freestanding appliance. Chosen as a six-burner range; the engine crowds its burners into the rear half and has no oven pull.",
    def: { title: "Range", centre: [0, 0] },
    draw(s) {
      s.rect(-0.45, -0.425, 0.45, 0.425, 0, S);
      for (const x of [-0.28, 0, 0.28]) for (const y of [-0.23, 0.08]) s.circle(x, y, 0.09 * K, THIN);
      s.line(-0.45, 0.28, 0.45, 0.28, THIN);
      s.line(-0.18, 0.35, 0.18, 0.35, THIN);
    },
  },
  {
    id: "wall-cabinet",
    label: "Wall cabinet",
    engine: "wall-cabinet",
    tier: 2,
    usageUsers: 164,
    inExemplar: false,
    dsl: ["furniture wall-cabinet in room at 2,2 size 0.9x0.35"],
    standard: "Upper cabinet dashed, above the cut plane (NKBA drawing standards) (floor-plan inventory); typical design size 0.9 × 0.35 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 0.90 × 0.35 m upper kitchen cabinet (catalog default / NKBA convention), with a dashed outline and two-door joint because it is above the cut plane. Chosen as a two-door wall unit, unfilled so the counter can show below; the engine draws an undivided dashed box.",
    def: { title: "Wall cabinet", centre: [0, 0] },
    draw(s) {
      s.rect(-0.45, -0.175, 0.45, 0.175, 0, HIDDEN);
      s.line(0, -0.175, 0, 0.175, HIDDEN);
    },
  },
  {
    id: "range-hood",
    label: "Range hood",
    engine: "range-hood",
    tier: 2,
    usageUsers: 147,
    inExemplar: false,
    dsl: ["furniture range-hood in room at 2,2 size 0.9x0.6"],
    standard: "Hood above cooktop dashed above the cut plane (NKBA drawing convention); typical 900 × 600 mm canopy.",
    sourceUrl: null,
    notes: "A typical 0.90 × 0.60 m wall hood (NKBA / inventory convention, chosen to cover the 0.90 m range), dashed above the cut plane with its duct neck north. Chosen as a wall canopy rather than an island hood; the engine has a smaller 0.80 × 0.55 m dashed trapezoid without a neck.",
    def: { title: "Range hood", centre: [0, 0] },
    draw(s) {
      s.path([["M", -0.3, -0.3], ["L", 0.3, -0.3], ["L", 0.45, 0.3], ["L", -0.45, 0.3], ["Z"]], HIDDEN);
      s.rect(-0.12, -0.3, 0.12, -0.08, 0, HIDDEN);
    },
  },
  {
    id: "washer",
    label: "Washer",
    engine: "washer",
    tier: 2,
    usageUsers: 138,
    inExemplar: true,
    dsl: ["furniture washer in room at 2,2 size 0.6x0.6"],
    standard: "600 mm box tagged W (RoomSketcher); exact 600 mm square exemplar appliance.",
    sourceUrl: null,
    notes: "The exemplar's typical 0.60 × 0.60 m washer (RoomSketcher appliance convention), copied exactly with white body, 0.20 m radius drum and centred W in 8.5 px semibold slate. The engine uses a smaller proportional drum and a larger tag.",
    def: { title: "Washer", centre: [8.42, 5.6] },
    draw(s) {
      s.rect(8.12, 5.3, 8.72, 5.8999999999999995, 0, S);
      s.circle(8.42, 5.6, 0.2 * K, THIN);
      s.text(8.42, 5.6, "W", { dy: 3, fs: 8.5, weight: 600, fill: C.slate });
    },
  },
  {
    id: "dishwasher",
    label: "Dishwasher",
    engine: "dishwasher",
    tier: 2,
    usageUsers: 115,
    inExemplar: true,
    dsl: ["furniture dishwasher in room at 2,2 size 0.56x0.44"],
    standard: "Under-counter dishwasher shown hidden and tagged DW (RoomSketcher / accepted exemplar); nominal 600 mm appliance.",
    sourceUrl: null,
    notes: "The exemplar's 0.44 × 0.56 m hidden appliance outline and 8 px DW tag are copied exactly, rotated from the east run to put the back north; a nominal dishwasher is about 0.60 m wide (RoomSketcher / inventory). Chosen to extract only the hidden appliance and tag, leaving the shared counter to the counter symbol; the engine draws a solid 0.60 m white box with a front band.",
    def: { title: "Dishwasher", centre: [9.6, 2.3], rotate: -90 },
    draw(s) {
      s.rect(9.38, 2.02, 9.82, 2.58, 0, HIDDEN);
      s.text(9.6, 2.3, "DW", { dy: 3.2, fs: 8, weight: 600, fill: C.slate });
    },
  },
  {
    id: "dryer",
    label: "Dryer",
    engine: "dryer",
    tier: 2,
    usageUsers: 111,
    inExemplar: true,
    dsl: ["furniture dryer in room at 2,2 size 0.6x0.6"],
    standard: "600 mm box tagged D (RoomSketcher); exact 600 mm square exemplar appliance.",
    sourceUrl: null,
    notes: "The exemplar's typical 0.60 × 0.60 m dryer (RoomSketcher appliance convention), copied exactly with white body, 0.20 m radius drum and centred D in 8.5 px semibold slate. The engine uses a smaller proportional drum and a larger tag.",
    def: { title: "Dryer", centre: [8.42, 6.3] },
    draw(s) {
      s.rect(8.12, 6.0, 8.72, 6.6, 0, S);
      s.circle(8.42, 6.3, 0.2 * K, THIN);
      s.text(8.42, 6.3, "D", { dy: 3, fs: 8.5, weight: 600, fill: C.slate });
    },
  },
  {
    id: "urinal",
    label: "Urinal",
    engine: "urinal",
    tier: 2,
    usageUsers: 66,
    inExemplar: false,
    dsl: ["furniture urinal in room at 2,2 size 0.4x0.35"],
    standard: "Wall-hung bowl (floor-plan inventory); typical design size 0.4 × 0.35 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 0.40 × 0.35 m wall-hung urinal (catalog default), with a rounded bowl, inner basin and flush dot at the north wall. Chosen as a compact individual urinal; the engine has a similar outer shape without the bowl detail.",
    def: { title: "Urinal", centre: [0, 0] },
    draw(s) {
      s.rect(-0.2, -0.175, 0.2, -0.095, 2, S);
      s.path([["M", -0.15, -0.095], ["L", 0.15, -0.095], ["L", 0.15, 0.025], ["A", 0.15, 0.15, 1, -0.15, 0.025], ["Z"]], S);
      s.bound(0, 0.175);
      s.ellipse(0, 0.025, 0.09, 0.08, THIN);
      s.circle(0, -0.135, 1.6, `fill="${C.slate}"`);
    },
  },
  {
    id: "smartboard",
    label: "Smartboard",
    engine: "smartboard",
    tier: 2,
    usageUsers: 144,
    inExemplar: false,
    dsl: ["furniture smartboard in room at 2,2 size 2x0.12"],
    standard: "Thin board on the wall (floor-plan inventory); typical design size 2 × 0.12 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 2.00 × 0.12 m interactive board (catalog default), shown edge-on with a thin tray and a small control dot, wall side north. Chosen as a wall-mounted interactive flat panel; the engine reuses the whiteboard's solid dark frame with no distinguishing control.",
    def: { title: "Smartboard", centre: [0, 0] },
    draw(s) {
      s.rect(-1, -0.06, 1, 0.06, 2, S);
      s.line(-0.9, 0.01, 0.8, 0.01, THIN);
      s.circle(0.9, 0.015, 1.2, `fill="${C.slate}"`);
    },
  },
  {
    id: "filing-cabinet",
    label: "Filing cabinet",
    engine: "filing-cabinet",
    tier: 2,
    usageUsers: 140,
    inExemplar: false,
    dsl: ["furniture filing-cabinet in room at 2,2 size 0.5x0.6"],
    standard: "Box with drawer front line (floor-plan inventory); typical design size 0.5 × 0.6 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 0.50 × 0.60 m filing cabinet (catalog default), with its drawer front and pull south, back north. Chosen as a vertical cabinet seen in plan, so stacked drawers share one front line; the engine draws three horizontal bands across the top as if viewed in elevation.",
    def: { title: "Filing cabinet", centre: [0, 0] },
    draw(s) {
      s.rect(-0.25, -0.3, 0.25, 0.3, 2, S);
      s.line(-0.25, 0.2, 0.25, 0.2, THIN);
      s.line(-0.08, 0.255, 0.08, 0.255, THIN);
    },
  },
  {
    id: "teacher-desk",
    label: "Teacher desk",
    engine: "teacher-desk",
    tier: 2,
    usageUsers: 115,
    inExemplar: false,
    dsl: ["furniture teacher-desk in room at 2,2 size 1.4x0.7"],
    standard: "Desk without a chair (floor-plan inventory); typical design size 1.4 × 0.7 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 1.40 × 0.70 m teacher worktop (catalog default), white with 2 px corners and a thin hidden modesty-panel line below the top, without an automatic chair. Chosen as a plain teaching desk, back north; the engine adds a prominent rectangle and a solid front line on the top.",
    def: { title: "Teacher desk", centre: [0, 0] },
    draw(s) {
      s.rect(-0.7, -0.35, 0.7, 0.35, 2, S);
      s.line(-0.52, 0.18, 0.52, 0.18, HIDDEN);
    },
  },
  {
    id: "cubbies",
    label: "Cubbies",
    engine: "cubbies",
    tier: 2,
    usageUsers: 100,
    inExemplar: false,
    dsl: ["furniture cubbies in room at 2,2 size 1.8x0.4"],
    standard: "Cubbies as storage cells in plan (inventory); 300 mm bays, 400 mm deep (catalog convention).",
    sourceUrl: null,
    notes: "A typical 1.80 × 0.40 m run of six 0.30 m cubbies (catalog bay-spacing convention), a single row of storage cells with its back north. Chosen to show only plan bays, not vertically stacked cubbies as an elevation grid; the engine uses a 2.00 m run with unevenly rounded bay count.",
    def: { title: "Cubbies", centre: [0, 0] },
    draw(s) {
      s.rect(-0.9, -0.2, 0.9, 0.2, 0, S);
      for (const x of [-0.6, -0.3, 0, 0.3, 0.6]) s.line(x, -0.2, x, 0.2, THIN);
    },
  },
  {
    id: "kidney-table",
    label: "Kidney table",
    engine: "kidney-table",
    tier: 2,
    usageUsers: 79,
    inExemplar: false,
    dsl: ["furniture kidney-table in room at 2,2 size 1.8x1.2"],
    standard: "Bean-shaped teaching table (floor-plan inventory); typical design size 1.8 × 1.2 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 1.80 × 1.20 m kidney teaching table (catalog default), with a continuous white top and a clear concave teacher recess on the south side. Chosen as the table alone without chairs; the engine uses a shallower curved notch and heavier styling.",
    def: { title: "Kidney table", centre: [0, 0] },
    draw(s) {
      s.path([["M", -0.9, 0], ["A", 0.9, 0.6, 1, 0.9, 0], ["A", 0.3, 0.6, 1, 0.3, 0], ["A", 0.3, 0.25, 0, -0.3, 0], ["A", 0.3, 0.6, 1, -0.9, 0], ["Z"]], S);
      s.bound(0, -0.6);
      s.bound(-0.6, 0.6);
      s.bound(0.6, 0.6);
    },
  },
  {
    id: "conference-table",
    label: "Conference table",
    engine: "conference-table",
    tier: 2,
    usageUsers: 71,
    inExemplar: false,
    dsl: ["furniture conference-table in room at 2,2 size 2.4x1.2"],
    standard: "Long table with chairs on both sides (floor-plan inventory); typical design size 2.4 × 1.2 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 2.40 × 1.20 m conference top (catalog default) with eight accepted chairs at 0.60 m pitch, 0.05 m clear of the two long edges, backs outward. Chosen without end chairs, matching the catalog seating rule; the engine uses grey seats with no backrest detail and different spacing.",
    def: { title: "Conference table", centre: [0, 0] },
    draw(s) {
      longDining(s, 2.4, 1.2, 4, [-1, 1]);
    },
  },
  {
    id: "bar",
    label: "Bar",
    engine: "bar",
    tier: 2,
    usageUsers: 330,
    inExemplar: false,
    dsl: ["furniture bar in room at 2,2 size 3x2.2"],
    standard: "Bar counter with back bar (inventory); chosen 3 m station, 0.7 m front counter, 0.5 m back counter and 1 m staff aisle.",
    sourceUrl: null,
    notes: "A typical 3.00 m bar counter 0.70 m deep, a 0.50 m back bar and a 1.00 m staff aisle (inventory back-bar convention, chosen design dimensions), mist as fixed joinery. Chosen as a complete bar station with customers south; the engine draws only a 3.00 × 0.70 m front counter; the usage count is inflated by label text and may also match longer symbol names.",
    def: { title: "Bar", centre: [0, 0] },
    draw(s) {
      s.rect(-1.5, -1.1, 1.5, -0.6, 0, SM);
      s.rect(-1.5, 0.4, 1.5, 1.1, 2, SM);
      s.line(-1.5, 0.82, 1.5, 0.82, HIDDEN);
      for (const x of [-0.5, 0.5]) s.line(x, -1.1, x, -0.6, THIN);
    },
  },
  {
    id: "stage",
    label: "Stage",
    engine: "stage",
    tier: 2,
    usageUsers: 135,
    inExemplar: false,
    dsl: ["furniture stage in room at 2,2 size 4x2"],
    standard: "Raised platform outline (floor-plan inventory); typical design size 4 × 2 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 4.00 × 2.00 m portable stage (catalog default), with a solid platform outline and thin front-edge line on the south audience side. Chosen as a raised modular platform rather than a room; the engine uses a dashed inset rectangle; the usage count is inflated by label text and may also match longer symbol names.",
    def: { title: "Stage", centre: [0, 0] },
    draw(s) {
      s.rect(-2, -1, 2, 1, 0, S);
      s.line(-2, 0.88, 2, 0.88, THIN);
    },
  },
  {
    id: "booth",
    label: "Booth",
    engine: "booth",
    tier: 2,
    usageUsers: 134,
    inExemplar: false,
    dsl: ["furniture booth in room at 2,2 size 1.2x1.54"],
    standard: "Restaurant booth as facing benches and central table (inventory); chosen 1.20 m two-person benches, 0.60 m table depth.",
    sourceUrl: null,
    notes: "A typical four-person booth with a 1.20 × 0.60 m top and two 1.20 × 0.42 m benches, 1.54 m overall depth (inventory booth convention, chosen compact size). Chosen as facing fixed benches with the accepted chair's depth, 3 px corners and outward backrest line, plus cushion divisions; the engine has a larger 1.40 × 1.60 m group with grey benches and no back detail.",
    def: { title: "Booth", centre: [0, 0] },
    draw(s) {
      s.rect(-0.6, -0.3, 0.6, 0.3, 2, S);
      for (const side of [-1, 1]) {
        const cy = side * 0.56;
        s.rect(-0.6, cy - 0.21, 0.6, cy + 0.21, 3, S);
        s.line(-0.6, cy + side * 0.14, 0.6, cy + side * 0.14, THIN);
        s.line(0, cy - side * 0.21, 0, cy + side * 0.14, THIN);
      }
    },
  },
  {
    id: "banquet-table",
    label: "Banquet table",
    engine: "banquet-table",
    tier: 2,
    usageUsers: 133,
    inExemplar: false,
    dsl: ["furniture banquet-table in room at 2,2 size 2.44x0.76"],
    standard: "8 ft × 30 in (2.44 × 0.76 m) rectangle with chairs both sides (floor-plan inventory); typical design size 2.44 × 0.76 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A standard 8 ft × 30 in banquet top, 2.44 × 0.76 m (inventory event convention), with eight accepted chairs evenly spaced along the two long sides, backs outward. Chosen four per side with no end chairs, matching the engine's count; the engine uses grey chairs and different seat spacing.",
    def: { title: "Banquet table", centre: [0, 0] },
    draw(s) {
      longDining(s, 2.44, 0.76, 4, [-1, 1]);
    },
  },
  {
    id: "dance-floor",
    label: "Dance floor",
    engine: "dance-floor",
    tier: 2,
    usageUsers: 119,
    inExemplar: false,
    dsl: ["furniture dance-floor in room at 2,2 size 3.6x3.6"],
    standard: "Parquet grid in 0.90 m squares (round-2 brief); 4 × 4 modules form a 3.60 m floor.",
    sourceUrl: null,
    notes: "A typical modular 3.60 × 3.60 m dance floor built from sixteen 0.90 m square parquet panels (round-2 brief), white with thin panel joints. Chosen modular parquet rather than diagonal hatch; the engine draws a 4.00 m square with diagonal hatching.",
    def: { title: "Dance floor", centre: [0, 0] },
    draw(s) {
      s.rect(-1.8, -1.8, 1.8, 1.8, 0, S);
      for (const d of [-0.9, 0, 0.9]) {
        s.line(d, -1.8, d, 1.8, THIN);
        s.line(-1.8, d, 1.8, d, THIN);
      }
    },
  },
  {
    id: "round-table-6",
    label: "Round table for 6",
    engine: "round-table-6",
    tier: 2,
    usageUsers: 112,
    inExemplar: false,
    dsl: ["furniture round-table-6 in room at 2,2 size 2.424x2.424"],
    standard: "60 in round event table with 6 chairs (inventory and Schematex floor-plan standard §2.3); 1.524 m top diameter.",
    sourceUrl: null,
    notes: "A standard 60 in round top, 1.524 m diameter (inventory / event convention), with 6 accepted chairs evenly spaced clockwise from north, 0.05 m from the table edge and backs outward. Chosen the catalog's event-table diameter, with DSL size including its 0.45 m chair ring; the drawing uses the accepted 0.42 m chair and spacing instead of the engine's grey seats.",
    def: { title: "Round table for 6", centre: [0, 0] },
    draw(s) {
      roundDining(s, 1.524, 6);
    },
  },
  {
    id: "round-table-8",
    label: "Round table for 8",
    engine: "round-table-8",
    tier: 2,
    usageUsers: 112,
    inExemplar: false,
    dsl: ["furniture round-table-8 in room at 2,2 size 2.424x2.424"],
    standard: "60 in round event table with 8 chairs (inventory and Schematex floor-plan standard §2.3); 1.524 m top diameter.",
    sourceUrl: null,
    notes: "A standard 60 in round top, 1.524 m diameter (inventory / event convention), with 8 accepted chairs evenly spaced clockwise from north, 0.05 m from the table edge and backs outward. Chosen the catalog's event-table diameter, with DSL size including its 0.45 m chair ring; the drawing uses the accepted 0.42 m chair and spacing instead of the engine's grey seats.",
    def: { title: "Round table for 8", centre: [0, 0] },
    draw(s) {
      roundDining(s, 1.524, 8);
    },
  },
  {
    id: "dj-booth",
    label: "DJ booth",
    engine: "dj-booth",
    tier: 2,
    usageUsers: 105,
    inExemplar: false,
    dsl: ["furniture dj-booth in room at 2,2 size 1.2x0.8"],
    standard: "Table tagged DJ (floor-plan inventory); typical design size 1.2 × 0.8 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 1.20 × 0.80 m DJ worktop (catalog default), white with the exemplar's small semibold appliance-style DJ tag. Chosen as the booth footprint without individual decks; the engine uses the same simple motif with a larger tag.",
    def: { title: "DJ booth", centre: [0, 0] },
    draw(s) {
      s.rect(-0.6, -0.4, 0.6, 0.4, 2, S);
      s.text(0, 0, "DJ", { dy: 3.2, fs: 8.5, weight: 600, fill: C.slate });
    },
  },
  {
    id: "cocktail-table",
    label: "Cocktail table",
    engine: "cocktail-table",
    tier: 2,
    usageUsers: 92,
    inExemplar: false,
    dsl: ["furniture cocktail-table in room at 2,2 size 0.76x0.76"],
    standard: "Small high round table (floor-plan inventory); typical design size 0.76 × 0.76 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 30 in high-top, about 0.76 m diameter (inventory / catalog event convention), shown as a plain round top. Chosen standing service without chairs or a visible pedestal through the opaque top; the engine adds an inner circle for the base.",
    def: { title: "Cocktail table", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.38 * K, S);
    },
  },
  {
    id: "podium",
    label: "Podium",
    engine: "podium",
    tier: 2,
    usageUsers: 90,
    inExemplar: false,
    dsl: ["furniture podium in room at 2,2 size 0.6x0.5"],
    standard: "Lectern outline (floor-plan inventory); typical design size 0.6 × 0.5 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 0.60 × 0.50 m lectern (catalog default), a tapered top with a thin reading-lip line to the south speaker side. Chosen a lectern rather than an elevated speaking platform; the engine uses the same taper without a lip.",
    def: { title: "Podium", centre: [0, 0] },
    draw(s) {
      s.path([["M", -0.22, -0.25], ["L", 0.22, -0.25], ["L", 0.3, 0.25], ["L", -0.3, 0.25], ["Z"]], S);
      s.line(-0.265, 0.15, 0.265, 0.15, THIN);
    },
  },
  {
    id: "head-table",
    label: "Head table",
    engine: "head-table",
    tier: 2,
    usageUsers: 85,
    inExemplar: false,
    dsl: ["furniture head-table in room at 2,2 size 3.7x0.76"],
    standard: "Long table seated on one side only (floor-plan inventory); typical design size 3.7 × 0.76 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 3.70 × 0.76 m head table (catalog default), with six accepted chairs evenly spaced on its north side only, facing south toward the room. Chosen chairs behind the table for a dais layout; the engine puts its grey chair row on the south side.",
    def: { title: "Head table", centre: [0, 0] },
    draw(s) {
      longDining(s, 3.7, 0.76, 6, [-1]);
    },
  },
  {
    id: "row-chairs",
    label: "Row chairs",
    engine: "row-chairs",
    tier: 2,
    usageUsers: 70,
    inExemplar: false,
    dsl: ["furniture row-chairs in room at 2,2 size 2.2x0.5"],
    standard: "Theatre rows at 0.55 m pitch (floor-plan inventory); typical design size 2.2 × 0.5 m (Schematex catalog).",
    sourceUrl: null,
    notes: "Four accepted 0.42 m chairs at the standard 0.55 m theatre pitch (inventory), backs north, spanning 2.07 × 0.42 m of drawn furniture within a nominal 2.20 × 0.50 m row. Chosen a single short row with no aisle or ganging rail; the engine has grey seats without the backrest line.",
    def: { title: "Row chairs", centre: [0, 0] },
    draw(s) {
      for (let i = 0; i < 4; i++) planChair(s, (i - 1.5) * 0.55, 0);
    },
  },
  {
    id: "round-table-10",
    label: "Round table for 10",
    engine: "round-table-10",
    tier: 2,
    usageUsers: 58,
    inExemplar: false,
    dsl: ["furniture round-table-10 in room at 2,2 size 2.7288x2.7288"],
    standard: "72 in round event table with 10 chairs (inventory and Schematex floor-plan standard §2.3); 1.8288 m top diameter.",
    sourceUrl: null,
    notes: "A standard 72 in round top, 1.8288 m diameter (inventory / event convention), with 10 accepted chairs evenly spaced clockwise from north, 0.05 m from the table edge and backs outward. Chosen the catalog's event-table diameter, with DSL size including its 0.45 m chair ring; the drawing uses the accepted 0.42 m chair and spacing instead of the engine's grey seats.",
    def: { title: "Round table for 10", centre: [0, 0] },
    draw(s) {
      roundDining(s, 1.8288, 10);
    },
  },
  {
    id: "pallet-rack",
    label: "Pallet rack",
    engine: "pallet-rack",
    tier: 2,
    usageUsers: 99,
    inExemplar: false,
    dsl: ["furniture pallet-rack in room at 2,2 size 2.7x1.1"],
    standard: "Rack bays with beam lines (floor-plan inventory); typical design size 2.7 × 1.1 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 2.70 × 1.10 m pallet rack (catalog default), two 1.35 m bays with paired beam lines and small upright footprints, back north. Chosen a top view of the frame rather than elevation X-bracing; the engine crosses each bay with diagonals.",
    def: { title: "Pallet rack", centre: [0, 0] },
    draw(s) {
      s.rect(-1.35, -0.55, 1.35, 0.55, 0, S);
      for (const y of [-0.45, 0.45]) s.line(-1.35, y, 1.35, y, THIN);
      for (const x of [-1.35, 0, 1.35]) {
        s.line(x, -0.55, x, 0.55, THIN);
        for (const y of [-0.55, 0.45]) s.rect(x - 0.025, y, x + 0.025, y + 0.1, 0, S);
      }
    },
  },
  {
    id: "walk-in",
    label: "Walk-in cooler",
    engine: "walk-in",
    tier: 2,
    usageUsers: 92,
    inExemplar: false,
    dsl: ["furniture walk-in in room at 2,2 size 2.4x2"],
    standard: "Insulated box room with door (floor-plan inventory); typical design size 2.4 × 2 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 2.40 × 2.00 m walk-in cooler (catalog default), 0.12 m insulated walls in mist around a white interior, with a real 0.90 m south door opening and outward swing. Chosen hinged outward-opening cooler access; the engine fills its nominal opening with a dark block and gives the leaf a shorter projection.",
    def: { title: "Walk-in cooler", centre: [0, 0] },
    draw(s) {
      s.path([["M", -0.45, 1], ["L", -1.2, 1], ["L", -1.2, -1], ["L", 1.2, -1], ["L", 1.2, 1], ["L", 0.45, 1], ["L", 0.45, 0.88], ["L", 1.08, 0.88], ["L", 1.08, -0.88], ["L", -1.08, -0.88], ["L", -1.08, 0.88], ["L", -0.45, 0.88], ["Z"]], SM);
      swingLeaf(s, -0.45, 1, 0.9, 1);
      s.text(0, 0, "WALK-IN", { dy: 3.2, fs: 8.5, weight: 600, fill: C.slate });
    },
  },
  {
    id: "prep-table",
    label: "Prep table",
    engine: "prep-table",
    tier: 2,
    usageUsers: 86,
    inExemplar: false,
    dsl: ["furniture prep-table in room at 2,2 size 1.5x0.75"],
    standard: "Stainless table with undershelf (floor-plan inventory); typical design size 1.5 × 0.75 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 1.50 × 0.75 m freestanding stainless prep table (catalog default), white with a thin dashed undershelf inset 0.08 m. Chosen a movable table rather than fixed joinery, so there is no mist fill; the engine has the same outline motif with different stroke weights.",
    def: { title: "Prep table", centre: [0, 0] },
    draw(s) {
      s.rect(-0.75, -0.375, 0.75, 0.375, 2, S);
      s.rect(-0.67, -0.295, 0.67, 0.295, 0, HIDDEN);
    },
  },
  {
    id: "checkout",
    label: "Checkout counter",
    engine: "checkout",
    tier: 2,
    usageUsers: 65,
    inExemplar: false,
    dsl: ["furniture checkout in room at 2,2 size 1.6x0.7"],
    standard: "Counter with register and belt (floor-plan inventory); typical design size 1.6 × 0.7 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical 1.60 × 0.70 m fixed checkout station (catalog default), mist joinery with a white conveyor belt and register at the east end. Chosen a fixed grocery checkout with the cashier to the north; the engine has a white box, a solid register block and one belt line.",
    def: { title: "Checkout counter", centre: [0, 0] },
    draw(s) {
      s.rect(-0.8, -0.35, 0.8, 0.35, 2, SM);
      s.rect(-0.7, -0.22, 0.25, 0.22, 2, S);
      s.line(-0.65, -0.16, 0.2, -0.16, THIN);
      s.line(-0.65, 0.16, 0.2, 0.16, THIN);
      s.rect(0.37, -0.2, 0.68, 0.12, 2, S);
      s.line(0.4, -0.13, 0.65, -0.13, THIN);
    },
  },
  {
    id: "commercial-sink",
    label: "Commercial sink",
    engine: "commercial-sink",
    tier: 2,
    usageUsers: 63,
    inExemplar: false,
    dsl: ["furniture commercial-sink in room at 2,2 size 2.4x0.7"],
    standard: "Three-compartment commercial sink with drainboards (inventory); chosen 2.40 × 0.70 m stainless fixture.",
    sourceUrl: null,
    notes: "A typical 2.40 × 0.70 m three-compartment sink with end drainboards (inventory convention, chosen commercial fixture size), white stainless steel with three bowls, rear taps and drains. Chosen a freestanding stainless sink rather than a basin cut into joinery; the engine's 1.80 × 0.60 m unit lacks drainboards.",
    def: { title: "Commercial sink", centre: [0, 0] },
    draw(s) {
      s.rect(-1.2, -0.35, 1.2, 0.35, 0, S);
      for (const cx of [-0.5, 0, 0.5]) {
        s.rect(cx - 0.21, -0.2, cx + 0.21, 0.25, 3, S);
        s.circle(cx, -0.28, 1.6, `fill="${C.slate}"`);
        s.circle(cx, 0.04, 0.025 * K, THIN);
      }
      for (const side of [-1, 1]) for (const y of [-0.18, -0.06, 0.06, 0.18]) s.line(side * 0.82, y, side * 1.12, y, THIN);
    },
  },
  {
    id: "forklift",
    label: "Forklift",
    engine: "forklift",
    tier: 2,
    usageUsers: 60,
    inExemplar: false,
    dsl: ["furniture forklift in room at 2,2 size 1.2x3.4"],
    standard: "Counterbalance forklift in top view (catalog / inventory); chosen 1.20 × 3.40 m envelope including forks.",
    sourceUrl: null,
    notes: "A typical compact counterbalance forklift about 1.20 m wide and 3.40 m long including 1.10 m forks (chosen industrial planning footprint), with forks north, mast, wheels, operator seat and steering wheel. Chosen to include fork length rather than only the chassis; the engine's compact 1.20 × 2.20 m motif has very short forks and a single internal circle.",
    def: { title: "Forklift", centre: [0, 0] },
    draw(s) {
      s.rect(-0.5, -0.6, 0.5, 1.7, 3, S);
      for (const side of [-1, 1]) {
        s.rect(side * 0.6, -0.4, side * 0.48, 0.05, 2, S);
        s.rect(side * 0.48, 1.1, side * 0.6, 1.5, 2, S);
        s.rect(side * 0.2, -1.7, side * 0.34, -0.6, 0, S);
      }
      s.rect(-0.5, -0.6, 0.5, -0.45, 0, S);
      s.rect(-0.38, -0.25, 0.38, 0.95, 2, THIN);
      s.rect(-0.21, 0.3, 0.21, 0.72, 3, S);
      s.line(-0.21, 0.65, 0.21, 0.65, THIN);
      s.circle(0, 0.02, 0.14 * K, THIN);
    },
  },
  {
    id: "tree",
    label: "Tree",
    engine: "tree",
    tier: 2,
    usageUsers: 152,
    inExemplar: false,
    dsl: ["furniture tree in room at 2,2 size 2x2"],
    standard: "Canopy circle with trunk centre (floor-plan inventory); typical design size 2 × 2 m (Schematex catalog).",
    sourceUrl: null,
    notes: "A typical young tree with a 2.00 m canopy (catalog default), a white canopy outline and a solid trunk centre dot. Chosen a simple deciduous canopy notation without species-specific foliage; the engine adds a second internal canopy circle; the usage count is inflated by label text and may also match longer symbol names.",
    def: { title: "Tree", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 1 * K, S);
      s.circle(0, 0, 0.07 * K, `fill="${C.slate}"`);
    },
  },
  {
    id: "car",
    label: "Car",
    engine: "car",
    tier: 2,
    usageUsers: 129,
    inExemplar: false,
    dsl: ["furniture car in room at 2,2 size 1.8x4.6"],
    standard: "Passenger car top view for site plans (inventory); typical 4.60 × 1.80 m body (round-2 brief).",
    sourceUrl: null,
    notes: "A typical 4.60 × 1.80 m passenger car (round-2 brief), nose north, with rounded body ends, windshield, rear window and roof lines in the furniture palette. Chosen a generic saloon silhouette without mirrors or parking-clearance envelope; the engine uses a smaller 4.40 m envelope and exposed wheel blocks; the usage count is inflated by label text and may also match longer symbol names.",
    def: { title: "Car", centre: [0, 0] },
    draw(s) {
      s.path([["M", -0.9, -1.95], ["A", 0.9, 0.35, 1, 0.9, -1.95], ["L", 0.9, 1.95], ["A", 0.9, 0.35, 1, -0.9, 1.95], ["Z"]], S);
      s.bound(0, -2.3);
      s.bound(0, 2.3);
      s.path([["M", -0.75, -1.05], ["L", 0.75, -1.05], ["L", 0.65, -0.6], ["L", -0.65, -0.6], ["Z"]], THIN);
      s.path([["M", -0.65, 0.95], ["L", 0.65, 0.95], ["L", 0.75, 1.35], ["L", -0.75, 1.35], ["Z"]], THIN);
      s.line(-0.65, -0.6, -0.65, 0.95, THIN);
      s.line(0.65, -0.6, 0.65, 0.95, THIN);
    },
  },
  {
    id: "light",
    label: "Light",
    engine: "light",
    tier: 2,
    usageUsers: 173,
    inExemplar: false,
    dsl: ["furniture light in room at 2,2 size 0.28x0.28"],
    standard: "US ceiling lighting outlet: plain circle (ANSI Y32.9 / NECA residential-plan convention supplied in the review); fixed 17.92 px diameter, not a physical fixture size.",
    sourceUrl: null,
    notes: "Plain graphite ceiling-outlet circle, with no IEC lamp cross. The engine uses the same lightDraw for light and ceiling-light, at nominal sizes 0.35 m and 0.45 m; parser aliases lamp to light and light-fixture to ceiling-light. Both entries therefore intentionally share identical fixed-size outlet geometry. Optional radial ticks are omitted. Usage count is inflated by label text and may also match longer symbol names.",
    def: { title: "Light", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.14 * K, NOTATION);
    },
  },
  {
    id: "ceiling-fan",
    label: "Ceiling fan",
    engine: "ceiling-fan",
    tier: 2,
    usageUsers: 173,
    inExemplar: false,
    dsl: ["furniture ceiling-fan in room at 2,2 size 0.28x0.28"],
    standard: "Circle with blades: ceiling-fan plan notation (inventory); fixed 17.92 px notation, not the physical fan diameter.",
    sourceUrl: null,
    notes: "A fixed 0.28 m-equivalent circle (17.92 px), with three blades and a hub in graphite, using the inventory's fan-point notation convention rather than physical blade span. Chosen a three-blade ceiling-fan pictogram at the same size as lights; the engine draws a 0.90 m overhead fixture with a dashed sweep circle.",
    def: { title: "Ceiling fan", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.14 * K, NOTATION);
      for (let i = 0; i < 3; i++) {
        const a = i * 2 * Math.PI / 3;
        const p = (x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
        s.path([["M", ...p(-0.025, -0.025)], ["L", ...p(-0.045, -0.11)], ["L", ...p(0.02, -0.11)], ["L", ...p(0.025, -0.025)], ["Z"]], NOTATION);
      }
      s.circle(0, 0, 0.035 * K, `stroke="${C.graphite}" stroke-width="1.1" fill="${C.paper}"`);
    },
  },
  {
    id: "ceiling-light",
    label: "Ceiling light",
    engine: "ceiling-light",
    tier: 2,
    usageUsers: 153,
    inExemplar: false,
    dsl: ["furniture ceiling-light in room at 2,2 size 0.28x0.28"],
    standard: "US ceiling lighting outlet: plain circle (ANSI Y32.9 / NECA residential-plan convention supplied in the review); fixed 17.92 px diameter, not a physical fixture size.",
    sourceUrl: null,
    notes: "Plain graphite ceiling-outlet circle, with no IEC lamp cross. The engine uses the same lightDraw for light and ceiling-light, at nominal sizes 0.35 m and 0.45 m; parser aliases lamp to light and light-fixture to ceiling-light. Both entries therefore intentionally share identical fixed-size outlet geometry. Optional radial ticks are omitted.",
    def: { title: "Ceiling light", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.14 * K, NOTATION);
    },
  },
  {
    id: "outlet",
    label: "Outlet (NEC)",
    engine: "outlet",
    tier: 2,
    usageUsers: 81,
    inExemplar: false,
    dsl: ["fixture outlet in room on north at 50%"],
    standard: "Single receptacle: circle with one line through it (ANSI Y32.9 convention supplied in the review); fixed 17.92 px circle at the wall.",
    sourceUrl: null,
    notes: "Generic outlet is resolved to the single receptacle: one graphite stroke through a 17.92 px circle touching the accepted north wall stub. This visibly distinguishes it from duplex-outlet with two parallel strokes. The engine also distinguishes single and duplex, but its contact-stroke counts differ from the reviewed convention.",
    def: { title: "Outlet (NEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.circle(0, 0.17, 0.14 * K, NOTATION);
      s.line(0, 0.03, 0, 0.31, NOTATION);
    },
  },
  {
    id: "outlet-iec",
    label: "Outlet (IEC)",
    engine: "outlet-iec",
    tier: 2,
    usageUsers: null,
    inExemplar: false,
    dsl: ["floorplan \"IEC socket\" unit m symbols iec\nroom room at 0,0 size 6x6\nfixture outlet in room on north at 50%"],
    standard: "IEC 60617 installation-plan socket: wall-side semicircle and one stem (inventory / catalog convention); fixed 17.92 px width.",
    sourceUrl: null,
    notes: "A fixed 0.28 m-equivalent semicircular socket notation (17.92 px wide) touching a short north wall stub, with one stem for a single socket (IEC 60617 installation-plan convention cited in the inventory). Chosen the catalog's semicircle-and-stem family at a uniform graphite notation size; the engine has no wall stub and uses smaller slate geometry.",
    def: { title: "Outlet (IEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.path([["M", -0.14, 0.03], ["A", 0.14, 0.14, 0, 0.14, 0.03]], NOTATION);
      s.line(-0.14, 0.03, 0.14, 0.03, NOTATION);
      for (const x of [0]) s.line(x, 0.17, x, 0.31, NOTATION);
    },
  },
  {
    id: "electrical-panel",
    label: "Electrical panel",
    engine: "electrical-panel",
    tier: 2,
    usageUsers: 67,
    inExemplar: false,
    dsl: ["fixture electrical-panel in room on north at 50%"],
    standard: "Filled rectangle at the wall for an electrical panel (inventory plan convention); fixed 17.92 × 8.96 px notation.",
    sourceUrl: null,
    notes: "A fixed 0.28 m-equivalent wide by 0.14 m-equivalent deep panel notation (17.92 × 8.96 px), a filled graphite rectangle touching the north wall stub as in the inventory convention. Chosen an unlabelled panel mark rather than a physical cabinet; the engine uses a 0.55 × 0.24 m outlined box tagged PANEL.",
    def: { title: "Electrical panel", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.rect(-0.14, 0.03, 0.14, 0.17, 0, POCHE);
    },
  },
  {
    id: "duplex-outlet",
    label: "Duplex outlet (NEC)",
    engine: "duplex-outlet",
    tier: 2,
    usageUsers: 61,
    inExemplar: false,
    dsl: ["fixture duplex-outlet in room on north at 50%"],
    standard: "Duplex receptacle: circle with two parallel lines (ANSI Y32.9 convention supplied in the review); fixed 17.92 px circle at the wall.",
    sourceUrl: null,
    notes: "The accepted duplex drawing is retained byte-for-byte: two parallel graphite contact strokes in a 17.92 px circle touching the north wall stub. Generic outlet now uses a single stroke, so the two entries are distinct. The engine uses four contact strokes for its duplex entry.",
    def: { title: "Duplex outlet (NEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.circle(0, 0.17, 0.14 * K, NOTATION);
      for (const x of [-0.045, 0.045]) s.line(x, 0.03, x, 0.26, NOTATION);
    },
  },
  {
    id: "duplex-outlet-iec",
    label: "Duplex outlet (IEC)",
    engine: "duplex-outlet-iec",
    tier: 2,
    usageUsers: null,
    inExemplar: false,
    dsl: ["floorplan \"IEC socket\" unit m symbols iec\nroom room at 0,0 size 6x6\nfixture duplex-outlet in room on north at 50%"],
    standard: "IEC 60617 installation-plan socket: wall-side semicircle and two stems (inventory / catalog convention); fixed 17.92 px width.",
    sourceUrl: null,
    notes: "A fixed 0.28 m-equivalent semicircular socket notation (17.92 px wide) touching a short north wall stub, with two stems for a double socket (IEC 60617 installation-plan convention cited in the inventory). Chosen the catalog's semicircle-and-stem family at a uniform graphite notation size; the engine has no wall stub and uses smaller slate geometry.",
    def: { title: "Duplex outlet (IEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.path([["M", -0.14, 0.03], ["A", 0.14, 0.14, 0, 0.14, 0.03]], NOTATION);
      s.line(-0.14, 0.03, 0.14, 0.03, NOTATION);
      for (const x of [-0.04, 0.04]) s.line(x, 0.17, x, 0.31, NOTATION);
    },
  },
  // ── Tier 3, round 3, inventory rows 1–18 ──
  {
    id: "spiral-stairs",
    label: "Spiral stair",
    engine: "spiral-stairs",
    tier: 3,
    usageUsers: 4,
    inExemplar: false,
    dsl: ["furniture spiral-stairs in room at 2,2 size 1.8x1.8"],
    standard: "Typical compact spiral stair: 1.80 m outside diameter, 0.24 m centre post, radial treads at 22.5 degrees; plan convention from the inventory.",
    sourceUrl: null,
    notes: "Clockwise ascent from the south around a centre post. Reuses flight with an angular map, the accepted cut line, dashed upper treads, stairArrow and UP label. The 0.275 m helper pitch is a drawing parameter here, not a uniform radial tread depth; dimensions are illustrative, not a code-compliance claim.",
    def: { title: "Spiral stair", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.9 * K, SN);
      const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
      const map = (u, v) => polar(0.9 - v, Math.PI / 2 + u / 0.275 * Math.PI / 8);
      flight(s, map, { width: 0.78, from: 0, to: 15, cutAt: 7.5 * 0.275 });
      s.circle(0, 0, 0.12 * K, S);
      stairArrow(s, Array.from({ length: 13 }, (_, i) => polar(0.61, (101.25 + i * 10) * Math.PI / 180)));
      s.text(0, 0.9, "UP", { dy: 21.63, fs: 9.5, weight: 600, fill: C.graphite, tracking: 0.4 });
    },
  },
  {
    id: "lockers",
    label: "Lockers",
    engine: "lockers",
    tier: 3,
    usageUsers: 57,
    inExemplar: false,
    dsl: ["furniture lockers in room at 2,2 size 1.8x0.45"],
    standard: "Typical 1.80 × 0.45 m locker bank, six 300 mm bays (catalog dimensions).",
    sourceUrl: null,
    notes: "Six plan bays with doors and small pulls along the south face; white freestanding metal storage, using the accepted storage outline and detail weights.",
    def: { title: "Lockers", centre: [0, 0] },
    draw(s) {
      s.rect(-0.9, -0.225, 0.9, 0.225, 2, S);
      for (let i = 0; i < 6; i++) {
        const x = -0.9 + i * 0.3;
        if (i) s.line(x, -0.225, x, 0.225, THIN);
        s.line(x + 0.025, 0.15, x + 0.275, 0.15, THIN);
        s.line(x + 0.2, 0.19, x + 0.25, 0.19, THIN);
      }
    },
  },
  {
    id: "loading-dock",
    label: "Loading dock",
    engine: "loading-dock",
    tier: 3,
    usageUsers: 54,
    inExemplar: false,
    dsl: ["furniture loading-dock in room at 2,2 size 3x0.6"],
    standard: "Typical 3.00 m dock bay with a 0.60 m deep edge strip (catalog footprint); dock edge and bumpers per inventory.",
    sourceUrl: null,
    notes: "A plan crop of a built-in dock edge, with two projecting rubber bumpers toward the truck on the south. The strip includes bumper projection; this is not an overhead-door elevation or a complete dock leveller.",
    def: { title: "Loading dock", centre: [0, 0] },
    draw(s) {
      s.rect(-1.5, -0.3, 1.5, 0.15, 0, SM);
      s.line(-1.5, 0.06, 1.5, 0.06, THIN);
      for (const x of [-1.2, 0.9]) s.rect(x, 0.15, x + 0.3, 0.3, 2, `fill="${C.graphite}"`);
    },
  },
  {
    id: "grill",
    label: "Grill (commercial griddle)",
    engine: "grill",
    tier: 3,
    usageUsers: 54,
    inExemplar: false,
    dsl: ["furniture grill in room at 2,2 size 0.9x0.9"],
    standard: "Typical 0.90 × 0.90 m commercial cooking appliance (catalog); flat griddle per inventory.",
    sourceUrl: null,
    notes: "Chosen flat griddle with an uninterrupted cooking plate, rear splash strip, front grease trough and controls to the south. Shares the accepted range palette; white denotes the freestanding stainless appliance.",
    def: { title: "Grill (commercial griddle)", centre: [0, 0] },
    draw(s) {
      s.rect(-0.45, -0.45, 0.45, 0.45, 2, S);
      s.line(-0.45, -0.37, 0.45, -0.37, THIN);
      s.rect(-0.37, -0.3, 0.37, 0.2, 2, THIN);
      s.line(-0.37, 0.27, 0.37, 0.27, THIN);
      s.line(-0.45, 0.32, 0.45, 0.32, THIN);
      for (const x of [-0.25, 0, 0.25]) s.circle(x, 0.39, 1.6, `fill="${C.slate}"`);
    },
  },
  {
    id: "switch",
    label: "Switch (NEC)",
    engine: "switch",
    tier: 3,
    usageUsers: 52,
    inExemplar: false,
    dsl: ["fixture switch in room on north at 50%"],
    standard: "Single-pole wall switch: S at the wall (ANSI Y32.9 convention supplied in the brief); fixed 15 px letter.",
    sourceUrl: null,
    notes: "Upright graphite S beside the accepted north wall stub. No subscript for a single-pole switch; 3, 4 and D belong to later variants. Usage count is inflated by label text and may match longer switch names.",
    def: { title: "Switch (NEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.text(0, 0.18, "S", { dy: 5, fs: 15, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "switch-iec",
    label: "Switch (IEC)",
    engine: "switch-iec",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["floorplan \"IEC switch\" unit m symbols iec\nroom room at 0,0 size 6x6\nfixture switch in room on north at 50%"],
    standard: "IEC 60617 installation-plan switch family: lever stroke with origin dot, following the engine catalog; fixed-size graphite notation.",
    sourceUrl: null,
    notes: "Single-pole IEC lever and origin-dot form, beside the same north wall stub as the NEC switch and IEC sockets. This follows the catalog installation-plan convention, not a circuit schematic contact pair.",
    def: { title: "Switch (IEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.line(-0.08, 0.1, 0.1, 0.3, NOTATION);
      s.circle(-0.08, 0.1, 1.6, POCHE);
    },
  },
  {
    id: "distribution-board",
    label: "Distribution board",
    engine: "distribution-board",
    tier: 3,
    usageUsers: 47,
    inExemplar: false,
    dsl: ["fixture distribution-board in room on north at 50%"],
    standard: "IEC-practice distribution-board plan notation: rectangle tagged DB with circuit ways (inventory / catalog); fixed 38.4 × 17.92 px mark.",
    sourceUrl: null,
    notes: "Graphite wall notation using the accepted wall stub and electrical weights; DB compartment at the west, four circuit ways at the east. The size is notation, not a physical cabinet or circuit schedule.",
    def: { title: "Distribution board", centre: [0, 0] },
    draw(s) {
      wall(s, -0.4, 0.4, 0.06);
      s.rect(-0.3, 0.03, 0.3, 0.31, 2, NOTATION);
      s.line(-0.02, 0.03, -0.02, 0.31, NOTATION);
      for (const y of [0.1, 0.17, 0.24]) s.line(-0.02, y, 0.3, y, NOTATION);
      s.text(-0.16, 0.17, "DB", { dy: 2.8, fs: 7, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "beanbag",
    label: "Beanbag",
    engine: "beanbag",
    tier: 3,
    usageUsers: 45,
    inExemplar: false,
    dsl: ["furniture beanbag in room at 2,2 size 1x0.9"],
    standard: "Typical 1.00 × 0.90 m soft seat; simple plan outline per inventory.",
    sourceUrl: null,
    notes: "Simple rounded soft seat with one shallow upholstery seam; no spokes, tuft grid or equipment-like internal marks. White with the accepted furniture outline.",
    def: { title: "Beanbag", centre: [0, 0] },
    draw(s) {
      s.ellipse(0, 0, 0.5, 0.45, S);
      s.path([["M", -0.28, -0.15], ["A", 0.35, 0.2, 0, 0.28, -0.15]], THIN);
    },
  },
  {
    id: "fryer",
    label: "Fryer",
    engine: "fryer",
    tier: 3,
    usageUsers: 43,
    inExemplar: false,
    dsl: ["furniture fryer in room at 2,2 size 0.4x0.8"],
    standard: "Typical 0.40 × 0.80 m commercial fryer (catalog footprint), two side-by-side baskets.",
    sourceUrl: null,
    notes: "Two narrow baskets in a white stainless appliance, with handles south and a rear control strip. Basket layout is plan view; the catalog places its two rectangles front-to-back.",
    def: { title: "Fryer", centre: [0, 0] },
    draw(s) {
      s.rect(-0.2, -0.4, 0.2, 0.4, 2, S);
      s.line(-0.2, -0.28, 0.2, -0.28, THIN);
      for (const x of [-0.17, 0.02]) {
        s.rect(x, -0.2, x + 0.15, 0.2, 2, THIN);
        s.rect(x + 0.05, 0.2, x + 0.1, 0.35, 1, S);
        s.line(x + 0.04, -0.15, x + 0.04, 0.15, THIN);
        s.line(x + 0.11, -0.15, x + 0.11, 0.15, THIN);
      }
    },
  },
  {
    id: "clothing-rack",
    label: "Clothing rack",
    engine: "clothing-rack",
    tier: 3,
    usageUsers: 32,
    inExemplar: false,
    dsl: ["furniture clothing-rack in room at 2,2 size 1.5x0.6"],
    standard: "Typical 1.50 × 0.60 m freestanding garment rail; rail with hangers per inventory.",
    sourceUrl: null,
    notes: "Chosen straight rail rather than the catalog round rack. Reuses the accepted wardrobe slanted hanger marks and thin rail, with two transverse foot bars; no enclosing cabinet.",
    def: { title: "Clothing rack", centre: [0, 0] },
    draw(s) {
      for (const x of [-0.7, 0.7]) s.rect(x - 0.025, -0.3, x + 0.025, 0.3, 2, S);
      s.line(-0.75, 0, 0.75, 0, SN);
      for (let x = -0.55; x < 0.6; x += 0.15) s.line(x - 0.03, -0.2, x + 0.03, 0.2, THIN);
    },
  },
  {
    id: "easel",
    label: "Easel",
    engine: "easel",
    tier: 3,
    usageUsers: 28,
    inExemplar: false,
    dsl: ["furniture easel in room at 2,2 size 0.8x0.75"],
    standard: "Typical 0.80 × 0.75 m A-frame easel stance (catalog footprint), board edge seen in plan.",
    sourceUrl: null,
    notes: "Three-foot stance with a thin board crossing the front legs, following the catalog plan orientation. Board crosses the cut plane and is solid; the easel is shown in plan rather than as a front-view canvas.",
    def: { title: "Easel", centre: [0, 0] },
    draw(s) {
      s.line(0, -0.375, -0.32, 0.375, THIN);
      s.line(0, -0.375, 0.32, 0.375, THIN);
      for (const [x, y] of [[0, -0.35], [-0.32, 0.35], [0.32, 0.35]]) s.rect(x - 0.025, y - 0.025, x + 0.025, y + 0.025, 1, S);
      s.rect(-0.4, 0.18, 0.4, 0.3, 2, S);
      s.line(-0.36, 0.25, 0.36, 0.25, THIN);
    },
  },
  {
    id: "toy-box",
    label: "Toy box",
    engine: "toy-box",
    tier: 3,
    usageUsers: 28,
    inExemplar: false,
    dsl: ["furniture toy-box in room at 2,2 size 1x0.5"],
    standard: "Typical 1.00 × 0.50 m lidded toy chest (catalog).",
    sourceUrl: null,
    notes: "White freestanding chest using the accepted storage outline, with inset lid, two rear hinges and a south pull. Kept as a closed plan outline.",
    def: { title: "Toy box", centre: [0, 0] },
    draw(s) {
      s.rect(-0.5, -0.25, 0.5, 0.25, 3, S);
      s.rect(-0.43, -0.18, 0.43, 0.18, 2, THIN);
      for (const x of [-0.28, 0.2]) s.rect(x, -0.22, x + 0.08, -0.15, 1, S);
      s.line(-0.08, 0.215, 0.08, 0.215, THIN);
    },
  },
  {
    id: "piano",
    label: "Grand piano",
    engine: "piano",
    tier: 3,
    usageUsers: 28,
    inExemplar: false,
    dsl: ["furniture piano in room at 2,2 size 1.5x1.8"],
    standard: "Typical compact grand piano body 1.50 × 1.80 m; curved case and keyboard (inventory).",
    sourceUrl: null,
    notes: "Closed grand case with straight bass side west, curved treble side east and keyboard south. Reuses planChair for the player seat, 0.05 m clear of the body, facing north. The stated DSL size is the piano body; the chair extends the drawn envelope.",
    def: { title: "Grand piano", centre: [0, 0] },
    draw(s) {
      s.path([["M", -0.75, 0.9], ["L", -0.75, -0.55], ["A", 0.35, 0.35, 1, -0.4, -0.9], ["L", -0.1, -0.9], ["A", 0.35, 0.45, 1, 0.25, -0.45], ["A", 0.5, 0.8, 0, 0.75, 0.35], ["L", 0.75, 0.9], ["Z"]], S);
      s.rect(-0.65, 0.65, 0.65, 0.84, 0, THIN);
      for (let i = 1; i < 21; i++) {
        const x = -0.65 + i * 1.3 / 21;
        s.line(x, 0.65, x, 0.84, THIN);
        if ([1, 2, 4, 5, 6].includes(i % 7)) s.rect(x - 0.012, 0.65, x + 0.012, 0.75, 0, `fill="${C.slate}"`);
      }
      planChair(s, 0, 1.16, 180);
    },
  },
  {
    id: "data-outlet",
    label: "Data outlet",
    engine: "data-outlet",
    tier: 3,
    usageUsers: 27,
    inExemplar: false,
    dsl: ["fixture data-outlet in room on north at 50%"],
    standard: "Communications outlet: square tagged D (inventory / catalog convention); fixed 17.92 × 15.36 px mark.",
    sourceUrl: null,
    notes: "Chosen square-D variant of the inventory triangle-or-square convention. Fixed graphite notation at the accepted north wall stub, distinct from a power receptacle.",
    def: { title: "Data outlet", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.rect(-0.14, 0.03, 0.14, 0.27, 0, NOTATION);
      s.text(0, 0.15, "D", { dy: 3.1, fs: 9, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "ottoman",
    label: "Ottoman",
    engine: "ottoman",
    tier: 3,
    usageUsers: 25,
    inExemplar: false,
    dsl: ["furniture ottoman in room at 2,2 size 0.6x0.45"],
    standard: "Typical 0.60 × 0.45 m upholstered footstool (catalog).",
    sourceUrl: null,
    notes: "Simple white upholstered outline with a thin inset seam and the accepted 3 px furniture corners; no backrest, so it remains distinct from chair.",
    def: { title: "Ottoman", centre: [0, 0] },
    draw(s) {
      s.rect(-0.3, -0.225, 0.3, 0.225, 3, S);
      s.rect(-0.25, -0.175, 0.25, 0.175, 2, THIN);
    },
  },
  {
    id: "fountain",
    label: "Fountain",
    engine: "fountain",
    tier: 3,
    usageUsers: 24,
    inExemplar: false,
    dsl: ["furniture fountain in room at 2,2 size 1.8x1.8"],
    standard: "Typical 1.80 m diameter courtyard fountain (catalog); concentric basin rings per inventory.",
    sourceUrl: null,
    notes: "Built-in basin rim in mist around a white basin, with thin water ring and central nozzle. Simple plan rings without decorative spray graphics or an elevation bowl.",
    def: { title: "Fountain", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.9 * K, SM);
      s.circle(0, 0, 0.78 * K, S);
      s.circle(0, 0, 0.64 * K, THIN);
      s.circle(0, 0, 0.055 * K, S);
    },
  },
  {
    id: "treadmill",
    label: "Treadmill",
    engine: "treadmill",
    tier: 3,
    usageUsers: 21,
    inExemplar: false,
    dsl: ["furniture treadmill in room at 2,2 size 0.9x2"],
    standard: "Typical 0.90 × 2.00 m treadmill footprint (catalog), belt deck and console.",
    sourceUrl: null,
    notes: "White equipment frame with a 0.60 m running belt, side rails and console north; no clearance envelope. Console is selected below the plan cut plane and shown solid.",
    def: { title: "Treadmill", centre: [0, 0] },
    draw(s) {
      s.rect(-0.45, -1, 0.45, 1, 3, S);
      s.rect(-0.3, -0.5, 0.3, 0.9, 2, THIN);
      s.line(-0.3, 0.8, 0.3, 0.8, THIN);
      for (const x of [-0.37, 0.37]) s.line(x, -0.7, x, 0.15, SN);
      s.rect(-0.38, -0.86, 0.38, -0.62, 3, S);
      s.rect(-0.16, -0.82, 0.16, -0.68, 2, THIN);
    },
  },
  {
    id: "yoga-mat",
    label: "Yoga mat",
    engine: "yoga-mat",
    tier: 3,
    usageUsers: 19,
    inExemplar: false,
    dsl: ["furniture yoga-mat in room at 2,2 size 0.6x1.8"],
    standard: "Standard planning mat 0.60 × 1.80 m (inventory / catalog).",
    sourceUrl: null,
    notes: "Simple solid pencil outline using the accepted rug palette; unfilled, with 3 px corners. No dashes because the mat is on the floor, not above the cut plane.",
    def: { title: "Yoga mat", centre: [0, 0] },
    draw(s) {
      s.rect(-0.3, -0.9, 0.3, 0.9, 3, `stroke="${C.pencil}" stroke-width="1" fill="none"`);
    },
  },
  // ── Tier 3, round 3b, inventory rows 19–36 ──
  {
    id: "desk-l",
    label: "L-shaped desk",
    engine: "desk-l",
    tier: 3,
    usageUsers: 18,
    inExemplar: false,
    dsl: ["furniture desk-l in room at 2,2 size 1.6x1.6"],
    standard: "Typical 1.60 × 1.60 m corner worktop with 0.70 m deep arms (catalog).",
    sourceUrl: null,
    notes: "West return, north worktop and the accepted task chair facing north in the recess. White movable furniture, with 2 px worktop corners; the chair uses the accepted desk placement rule.",
    def: { title: "L-shaped desk", centre: [0, 0] },
    draw(s) {
      taskChair(s, 0.3, 0.26, -1);
      const r = 2 / K;
      s.path([["M", -0.8 + r, -0.8], ["L", 0.8 - r, -0.8], ["A", r, r, 1, 0.8, -0.8 + r], ["L", 0.8, -0.1 - r], ["A", r, r, 1, 0.8 - r, -0.1], ["L", -0.1 + r, -0.1], ["A", r, r, 0, -0.1, -0.1 + r], ["L", -0.1, 0.8 - r], ["A", r, r, 1, -0.1 - r, 0.8], ["L", -0.8 + r, 0.8], ["A", r, r, 1, -0.8, 0.8 - r], ["L", -0.8, -0.8 + r], ["A", r, r, 1, -0.8 + r, -0.8], ["Z"]], S);
    },
  },
  {
    id: "weight-bench",
    label: "Weight bench",
    engine: "weight-bench",
    tier: 3,
    usageUsers: 18,
    inExemplar: false,
    dsl: ["furniture weight-bench in room at 2,2 size 0.6x1.8"],
    standard: "Typical 0.60 × 1.80 m bench and stand footprint, with a 1.30 m training bar across the rack.",
    sourceUrl: null,
    notes: "Padded flat bench in the accepted upholstered furniture style, head north, two rack uprights and a short training bar with plates. Bar extends beyond the nominal DSL bench footprint; rack and bar are selected below the cut plane.",
    def: { title: "Weight bench", centre: [0, 0] },
    draw(s) {
      for (const y of [-0.8, 0.8]) s.rect(-0.3, y - 0.035, 0.3, y + 0.035, 2, S);
      s.rect(-0.16, -0.6, 0.16, 0.9, 3, S);
      s.line(-0.16, -0.1, 0.16, -0.1, THIN);
      for (const x of [-0.3, 0.22]) s.rect(x, -0.8, x + 0.08, -0.72, 1, S);
      s.line(-0.65, -0.76, 0.65, -0.76, SN);
      for (const x of [-0.53, 0.48]) s.rect(x, -0.9, x + 0.05, -0.62, 1, S);
    },
  },
  {
    id: "pool-table",
    label: "Pool table",
    engine: "pool-table",
    tier: 3,
    usageUsers: 16,
    inExemplar: false,
    dsl: ["furniture pool-table in room at 2,2 size 2.54x1.27"],
    standard: "Typical 2.54 × 1.27 m planning footprint (catalog); six-pocket billiard table per inventory.",
    sourceUrl: null,
    notes: "White table outline and thin inset cushion boundary; six slate pocket openings at corners and long-side midpoints. Dimensions denote the outside planning footprint, not a regulation playing surface; cue clearance is excluded.",
    def: { title: "Pool table", centre: [0, 0] },
    draw(s) {
      s.rect(-1.27, -0.635, 1.27, 0.635, 3, S);
      s.rect(-1.15, -0.515, 1.15, 0.515, 2, THIN);
      for (const x of [-1.15, 0, 1.15]) for (const y of [-0.515, 0.515]) s.circle(x, y, 0.045 * K, `fill="${C.slate}"`);
    },
  },
  {
    id: "bidet",
    label: "Bidet",
    engine: "bidet",
    tier: 3,
    usageUsers: 14,
    inExemplar: false,
    dsl: ["furniture bidet in room at 2,2 size 0.4x0.6"],
    standard: "Typical 0.40 × 0.60 m floor-mounted bidet (catalog).",
    sourceUrl: null,
    notes: "Elongated white bowl with a north tap deck, tap dot and drain, following the accepted washbasin and toilet detail weights. No cistern, so it remains distinct from the toilet.",
    def: { title: "Bidet", centre: [0, 0] },
    draw(s) {
      s.path([["M", -0.2, -0.3], ["L", 0.2, -0.3], ["L", 0.2, 0.1], ["A", 0.2, 0.2, 1, -0.2, 0.1], ["Z"]], S);
      s.bound(0, 0.3);
      s.ellipse(0, 0.025, 0.13, 0.19, THIN);
      s.circle(0, -0.23, 1.6, `fill="${C.slate}"`);
      s.circle(0, 0.08, 1.6, THIN);
    },
  },
  {
    id: "bunk-bed",
    label: "Bunk bed",
    engine: "bunk-bed",
    tier: 3,
    usageUsers: 14,
    inExemplar: false,
    dsl: ["furniture bunk-bed in room at 2,2 size 0.95x2"],
    standard: "Typical 0.95 × 2.00 m bunk frame around the accepted 0.90 × 2.00 m single mattress.",
    sourceUrl: null,
    notes: "Lower mattress reuses scaledBed exactly at single-bed size. The wider upper frame, its end rail and side guard are dashed above the cut plane. A short ladder projects east; its visible lower rungs are solid. DSL size excludes the ladder projection.",
    def: { title: "Bunk bed", centre: [0, 0] },
    draw(s) {
      scaledBed(s, 0.9, 2);
      s.rect(-0.475, -1, 0.475, 1, 3, HIDDEN);
      s.line(-0.475, -0.88, 0.475, -0.88, HIDDEN);
      s.line(0.38, -0.88, 0.38, 0.32, HIDDEN);
      for (const x of [0.475, 0.65]) s.line(x, 0.4, x, 0.95, SN);
      for (const y of [0.45, 0.65, 0.85]) s.line(0.475, y, 0.65, y, THIN);
    },
  },
  {
    id: "power-rack",
    label: "Power rack",
    engine: "power-rack",
    tier: 3,
    usageUsers: 14,
    inExemplar: false,
    dsl: ["furniture power-rack in room at 2,2 size 1.4x1.4"],
    standard: "Typical 1.40 × 1.40 m four-post rack (catalog), with a 2.20 m barbell.",
    sourceUrl: null,
    notes: "Four solid-outline post sections, side base rails and dashed overhead ties. The racked bar is selected below the cut plane; its plates extend the envelope beyond the DSL rack footprint. No elevation bracing or clearance zone.",
    def: { title: "Power rack", centre: [0, 0] },
    draw(s) {
      for (const x of [-0.7, 0.6]) s.rect(x, -0.7, x + 0.1, 0.7, 2, S);
      for (const y of [-0.65, 0.65]) s.line(-0.65, y, 0.65, y, HIDDEN);
      for (const x of [-0.7, 0.6]) for (const y of [-0.7, 0.6]) s.rect(x, y, x + 0.1, y + 0.1, 1, S);
      s.line(-1.1, -0.15, 1.1, -0.15, SN);
      for (const x of [-0.96, 0.9]) s.rect(x, -0.375, x + 0.06, 0.075, 1, S);
    },
  },
  {
    id: "crib",
    label: "Crib",
    engine: "crib",
    tier: 3,
    usageUsers: 13,
    inExemplar: false,
    dsl: ["furniture crib in room at 2,2 size 0.7x1.3"],
    standard: "Typical compact 0.70 × 1.30 m cot footprint (catalog).",
    sourceUrl: null,
    notes: "White mattress inside a slatted cot frame. Slats run only across the narrow side-rail bands in plan, with no bars across the mattress and no pillow. Furniture outline and interior weights follow the accepted bed family.",
    def: { title: "Crib", centre: [0, 0] },
    draw(s) {
      s.rect(-0.35, -0.65, 0.35, 0.65, 3, S);
      s.rect(-0.28, -0.57, 0.28, 0.57, 2, THIN);
      for (let i = 0; i < 12; i++) {
        const y = -0.52 + i * 1.04 / 11;
        s.line(-0.35, y, -0.28, y, THIN);
        s.line(0.28, y, 0.35, y, THIN);
      }
    },
  },
  {
    id: "fitting-room",
    label: "Fitting room",
    engine: "fitting-room",
    tier: 3,
    usageUsers: 10,
    inExemplar: false,
    dsl: ["furniture fitting-room in room at 2,2 size 1.1x1.1"],
    standard: "Typical compact 1.10 × 1.10 m retail changing cubicle (catalog).",
    sourceUrl: null,
    notes: "Three fixed partitions in mist, a white rear bench, thin east mirror and a folded curtain across the south entrance. Curtain is solid because fabric crosses the cut plane; its overhead track is dashed. This is the inventory compact cubicle, without a clearance envelope.",
    def: { title: "Fitting room", centre: [0, 0] },
    draw(s) {
      s.path([["M", -0.55, 0.55], ["L", -0.55, -0.55], ["L", 0.55, -0.55], ["L", 0.55, 0.55], ["L", 0.49, 0.55], ["L", 0.49, -0.49], ["L", -0.49, -0.49], ["L", -0.49, 0.55], ["Z"]], SM);
      s.rect(-0.4, -0.43, 0.4, -0.15, 3, S);
      s.line(-0.4, -0.34, 0.4, -0.34, THIN);
      s.rect(0.45, -0.02, 0.48, 0.38, 0, S);
      s.line(-0.49, 0.52, 0.49, 0.52, HIDDEN);
      const folds = Array.from({ length: 15 }, (_, i) => [i ? "L" : "M", -0.49 + i * 0.98 / 14, i % 2 ? 0.47 : 0.55]);
      s.path(folds, THIN);
    },
  },
  {
    id: "pendant-light",
    label: "Pendant light",
    engine: "pendant-light",
    tier: 3,
    usageUsers: 8,
    inExemplar: false,
    dsl: ["furniture pendant-light in room at 2,2 size 0.28x0.42"],
    standard: "Ceiling outlet with drop mark (inventory / ANSI Y32.9 family); fixed 17.92 px circle.",
    sourceUrl: null,
    notes: "Accepted plain ceiling-outlet circle with a short north drop stem and suspension dot. This is fixed-size electrical notation, not a pendant elevation or a physical shade diameter.",
    def: { title: "Pendant light", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0.07, 0.14 * K, NOTATION);
      s.line(0, -0.21, 0, -0.07, NOTATION);
      s.circle(0, -0.21, 1.6, POCHE);
    },
  },
  {
    id: "salon-chair",
    label: "Salon chair",
    engine: "salon-chair",
    tier: 3,
    usageUsers: 7,
    inExemplar: false,
    dsl: ["furniture salon-chair in room at 2,2 size 0.7x0.9"],
    standard: "Typical 0.70 × 0.90 m hydraulic styling chair including footrest; inventory chair-and-base convention.",
    sourceUrl: null,
    notes: "Accepted planChair seat and backrest on a round hydraulic base, with arm pads and a south footrest. Chosen chair alone as the inventory requests; the engine catalog includes a counter and mirror in its larger styling-station footprint.",
    def: { title: "Salon chair", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.3 * K, THIN);
      planChair(s, 0, 0);
      for (const x of [-0.35, 0.25]) s.rect(x, -0.14, x + 0.1, 0.24, 2, S);
      for (const x of [-0.14, 0.14]) s.line(x, 0.21, x, 0.5, THIN);
      s.rect(-0.25, 0.43, 0.25, 0.6, 2, S);
    },
  },
  {
    id: "piano-upright",
    label: "Upright piano",
    engine: "piano-upright",
    tier: 3,
    usageUsers: 7,
    inExemplar: false,
    dsl: ["furniture piano-upright in room at 2,2 size 1.5x0.6"],
    standard: "Typical 1.50 × 0.60 m upright piano case (catalog), with a 0.75 × 0.35 m player bench.",
    sourceUrl: null,
    notes: "Case back north, keyboard south using the accepted grand-piano key spacing and slate details. White upholstered bench uses the accepted bench outline, 0.15 m clear of the case. DSL size is the case; bench extends the envelope.",
    def: { title: "Upright piano", centre: [0, 0] },
    draw(s) {
      s.rect(-0.75, -0.3, 0.75, 0.3, 2, S);
      s.line(-0.75, 0.06, 0.75, 0.06, THIN);
      s.rect(-0.65, 0.08, 0.65, 0.27, 0, THIN);
      for (let i = 1; i < 21; i++) {
        const x = -0.65 + i * 1.3 / 21;
        s.line(x, 0.08, x, 0.27, THIN);
        if ([1, 2, 4, 5, 6].includes(i % 7)) s.rect(x - 0.012, 0.08, x + 0.012, 0.18, 0, `fill="${C.slate}"`);
      }
      s.rect(-0.375, 0.45, 0.375, 0.8, 3, S);
      s.rect(-0.325, 0.5, 0.325, 0.75, 2, THIN);
    },
  },
  {
    id: "gfci-outlet",
    label: "GFCI outlet (NEC)",
    engine: "gfci-outlet",
    tier: 3,
    usageUsers: 5,
    inExemplar: false,
    dsl: ["fixture gfci-outlet in room on north at 50%"],
    standard: "GFCI-tagged receptacle (inventory / ANSI Y32.9 family); fixed 17.92 px circle.",
    sourceUrl: null,
    notes: "Accepted single-receptacle circle and one contact stroke, with a GFCI tag below in the accepted small semibold label style. Chosen single receptacle, matching the catalog entry; protection does not change contact count.",
    def: { title: "GFCI outlet (NEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.circle(0, 0.17, 0.14 * K, NOTATION);
      s.line(0, 0.03, 0, 0.31, NOTATION);
      s.text(0, 0.31, "GFCI", { dy: 12, fs: 8.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "gfci-outlet-iec",
    label: "RCD outlet (IEC)",
    engine: "gfci-outlet-iec",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["floorplan \"IEC RCD outlet (IEC)\" unit m symbols iec\nroom room at 0,0 size 6x6\nfixture gfci-outlet in room on north at 50%"],
    standard: "IEC 60617 installation-plan socket family, annotated RCD for residual-current protection; fixed 17.92 px width.",
    sourceUrl: null,
    notes: "Accepted outlet-iec semicircle and one stem, extended only with the catalog RCD tag. Fixed graphite mark on the accepted wall stub; RCD is a protection annotation, not a second socket.",
    def: { title: "RCD outlet (IEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.path([["M", -0.14, 0.03], ["A", 0.14, 0.14, 0, 0.14, 0.03]], NOTATION);
      s.line(-0.14, 0.03, 0.14, 0.03, NOTATION);
      s.line(0, 0.17, 0, 0.31, NOTATION);
      s.text(0, 0.31, "RCD", { dy: 12, fs: 8.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "recessed-light",
    label: "Recessed light",
    engine: "recessed-light",
    tier: 3,
    usageUsers: 4,
    inExemplar: false,
    dsl: ["furniture recessed-light in room at 2,2 size 0.36x0.36"],
    standard: "Circle in a square (inventory / ANSI Y32.9 convention); fixed 17.92 px circle inside a 23.04 px square.",
    sourceUrl: null,
    notes: "Extends the accepted plain US ceiling-outlet circle with a square recess surround. No IEC lamp cross; fixed-size notation rather than a physical luminaire footprint.",
    def: { title: "Recessed light", centre: [0, 0] },
    draw(s) {
      s.rect(-0.18, -0.18, 0.18, 0.18, 0, NOTATION);
      s.circle(0, 0, 0.14 * K, NOTATION);
    },
  },
  {
    id: "motion-sensor",
    label: "Motion sensor",
    engine: "motion-sensor",
    tier: 3,
    usageUsers: 3,
    inExemplar: false,
    dsl: ["furniture motion-sensor in room at 2,2 size 0.28x0.28"],
    standard: "Sensor tagged MS (inventory convention); fixed 17.92 px circle.",
    sourceUrl: null,
    notes: "Chosen circular MS device tag at the accepted light notation size, in graphite with a small semibold tag. This is a ceiling sensor point, with no wall stub or detection-area wedge; the engine uses sensing-wave marks.",
    def: { title: "Motion sensor", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.14 * K, NOTATION);
      s.text(0, 0, "MS", { dy: 2.8, fs: 7, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "wall-light",
    label: "Wall light",
    engine: "wall-light",
    tier: 3,
    usageUsers: 3,
    inExemplar: false,
    dsl: ["fixture wall-light in room on north at 50%"],
    standard: "Half circle at wall (inventory / ANSI Y32.9 convention); fixed 17.92 px width.",
    sourceUrl: null,
    notes: "Plain semicircular wall-light mark touching the accepted north wall stub. No contact stem, distinguishing it from IEC sockets; no IEC lamp cross is added to the US lighting family.",
    def: { title: "Wall light", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.path([["M", -0.14, 0.03], ["A", 0.14, 0.14, 0, 0.14, 0.03]], NOTATION);
      s.line(-0.14, 0.03, 0.14, 0.03, NOTATION);
      s.bound(0, 0.17);
    },
  },
  {
    id: "switch-dimmer",
    label: "Dimmer switch (NEC)",
    engine: "switch-dimmer",
    tier: 3,
    usageUsers: 3,
    inExemplar: false,
    dsl: ["fixture switch-dimmer in room on north at 50%"],
    standard: "S with D subscript (ANSI Y32.9 convention supplied in the brief); accepted fixed 15 px S.",
    sourceUrl: null,
    notes: "Accepted switch geometry retained, with a separate 7.5 px D set lower and to the right as a true visual subscript. Uses ordinary D with explicit placement rather than relying on font-specific Unicode subscript support.",
    def: { title: "Dimmer switch (NEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.text(0, 0.18, "S", { dy: 5, fs: 15, weight: 600, fill: C.graphite });
      s.text(0, 0.18, "D", { dx: 8, dy: 9, fs: 7.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "switch-dimmer-iec",
    label: "Dimmer switch (IEC)",
    engine: "switch-dimmer-iec",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["floorplan \"IEC Dimmer switch (IEC)\" unit m symbols iec\nroom room at 0,0 size 6x6\nfixture switch-dimmer in room on north at 50%"],
    standard: "IEC 60617 installation-plan dimmer family: accepted switch lever with triangular dimmer modifier (catalog convention).",
    sourceUrl: null,
    notes: "Exact accepted switch-iec lever and origin dot, extended with the catalog triangular modifier at the free end. Fixed graphite notation beside the accepted wall stub.",
    def: { title: "Dimmer switch (IEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.line(-0.08, 0.1, 0.1, 0.3, NOTATION);
      s.circle(-0.08, 0.1, 1.6, POCHE);
      s.path([["M", 0.1, 0.27], ["L", 0.065, 0.325], ["L", 0.135, 0.325], ["Z"]], POCHE);
    },
  },
  // ── Tier 3, round 3c, final 18 inventory rows ──
  {
    id: "thermostat",
    label: "Thermostat",
    engine: "thermostat",
    tier: 3,
    usageUsers: 2,
    inExemplar: false,
    dsl: ["fixture thermostat in room on north at 50%"],
    standard: "Wall thermostat: small box tagged T (round-3 brief); fixed 17.92 × 15.36 px notation.",
    sourceUrl: null,
    notes: "Uses the accepted data-outlet box and label placement on the north wall stub. The box follows the brief instead of the inventory circle; T identifies the wall control.",
    def: { title: "Thermostat", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.rect(-0.14, 0.03, 0.14, 0.27, 0, NOTATION);
      s.text(0, 0.15, "T", { dy: 3.1, fs: 9, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "outlet-240v",
    label: "240 V outlet (NEC)",
    engine: "outlet-240v",
    tier: 3,
    usageUsers: 2,
    inExemplar: false,
    dsl: ["fixture outlet-240v in room on north at 50%"],
    standard: "ANSI Y32.9 single special-purpose receptacle: triangle inside a circle, annotated 240 V; fixed 17.92 px circle.",
    sourceUrl: "https://assets.unilogcorp.com/267/ITEM/DOC/Leviton_617_Catalog.pdf",
    notes: "Retains the accepted US receptacle circle and wall stub; the special-purpose triangle replaces its ordinary contact stroke. The 240 V tag identifies service voltage without prescribing amperage or a NEMA configuration.",
    def: { title: "240 V outlet (NEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.circle(0, 0.17, 0.14 * K, NOTATION);
      s.path([["M", 0, 0.03], ["L", 0.1212, 0.24], ["L", -0.1212, 0.24], ["Z"]], NOTATION);
      s.text(0, 0.31, "240 V", { dy: 12, fs: 8.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "outlet-240v-iec",
    label: "240 V outlet (IEC)",
    engine: "outlet-240v-iec",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["floorplan \"IEC outlet-240v\" unit m symbols iec\nroom room at 0,0 size 6x6\nfixture outlet-240v in room on north at 50%"],
    standard: "IEC 60617 installation-plan socket family with a 240 V service annotation; fixed 17.92 px width.",
    sourceUrl: null,
    notes: "Exact accepted outlet-iec semicircle and single stem, with the voltage tag in the accepted GFCI/RCD label style. Voltage does not imply a second socket or a particular pole count.",
    def: { title: "240 V outlet (IEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.path([["M", -0.14, 0.03], ["A", 0.14, 0.14, 0, 0.14, 0.03]], NOTATION);
      s.line(-0.14, 0.03, 0.14, 0.03, NOTATION);
      s.line(0, 0.17, 0, 0.31, NOTATION);
      s.text(0, 0.31, "240 V", { dy: 12, fs: 8.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "shampoo-bowl",
    label: "Shampoo bowl",
    engine: "shampoo-bowl",
    tier: 3,
    usageUsers: 2,
    inExemplar: false,
    dsl: ["furniture shampoo-bowl in room at 2,2 size 0.7x1.5"],
    standard: "Salon backwash basin and chair in plan, chosen 0.70 × 1.50 m envelope; accepted chair and washbasin drawing rules.",
    sourceUrl: null,
    notes: "Basin north behind the client, with a south neck recess, oval bowl, rear tap dot and drain. Reuses the accepted planChair seat, salon arm pads and footrest; white ceramic and upholstery with slate outlines. DSL size includes chair and footrest.",
    def: { title: "Shampoo bowl", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0.15, 0.3 * K, THIN);
      planChair(s, 0, 0.15);
      for (const x of [-0.35, 0.25]) s.rect(x, 0.01, x + 0.1, 0.39, 2, S);
      for (const x of [-0.14, 0.14]) s.line(x, 0.36, x, 0.65, THIN);
      s.rect(-0.25, 0.58, 0.25, 0.75, 2, S);
      s.rect(-0.275, -0.75, 0.275, -0.15, 3, S);
      s.ellipse(0, -0.43, 0.19, 0.2, THIN);
      s.circle(0, -0.67, 1.6, `fill="${C.slate}"`);
      s.circle(0, -0.47, 1.6, THIN);
      s.path([["M", -0.09, -0.15], ["A", 0.09, 0.09, 1, 0.09, -0.15]], THIN);
      s.line(-0.075, -0.15, 0.075, -0.15, `stroke="${C.paper}" stroke-width="2"`);
    },
  },
  {
    id: "emergency-light",
    label: "Emergency light",
    engine: "emergency-light",
    tier: 3,
    usageUsers: 2,
    inExemplar: false,
    dsl: ["furniture emergency-light in room at 2,2 size 0.28x0.28"],
    standard: "Emergency lighting outlet: accepted US light circle with EM designation (inventory convention); fixed 17.92 px circle.",
    sourceUrl: null,
    notes: "The EM tag below the accepted plain light marks emergency service in the existing small uppercase tag style. Chosen a ceiling lighting point, rather than the engine twin-head battery-unit pictogram; no wall stub or IEC lamp cross.",
    def: { title: "Emergency light", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.14 * K, NOTATION);
      s.text(0, 0.14, "EM", { dy: 12, fs: 8.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "manicure-table",
    label: "Manicure table",
    engine: "manicure-table",
    tier: 3,
    usageUsers: 2,
    inExemplar: false,
    dsl: ["furniture manicure-table in room at 2,2 size 1x0.5"],
    standard: "Typical 1.00 × 0.50 m manicure worktop (catalog), with client and technician seated opposite each other.",
    sourceUrl: null,
    notes: "Reuses longDining with one accepted 0.42 m chair on each long side, backs outward and 0.05 m clear of the top. White movable furniture; the DSL size denotes the worktop, with a 1.00 × 1.44 m overall seated envelope.",
    def: { title: "Manicure table", centre: [0, 0] },
    draw(s) {
      longDining(s, 1, 0.5, 1, [-1, 1]);
    },
  },
  {
    id: "smoke-detector",
    label: "Smoke detector",
    engine: "smoke-detector",
    tier: 3,
    usageUsers: 1,
    inExemplar: false,
    dsl: ["furniture smoke-detector in room at 2,2 size 0.28x0.28", "furniture smoke-alarm in room at 2,2 size 0.28x0.28"],
    standard: "Smoke detector: circle tagged SD (inventory convention); fixed 17.92 px circle.",
    sourceUrl: null,
    notes: "Exact accepted motion-sensor circle and 7 px semibold tag placement, with SD replacing MS. Ceiling-mounted device point, without a wall stub.",
    def: { title: "Smoke detector", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.14 * K, NOTATION);
      s.text(0, 0, "SD", { dy: 2.8, fs: 7, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "switch-3way",
    label: "3-way switch (NEC)",
    engine: "switch-3way",
    tier: 3,
    usageUsers: 1,
    inExemplar: false,
    dsl: ["fixture switch-3way in room on north at 50%"],
    standard: "ANSI Y32.9 3-way wall switch: S with 3 subscript; accepted fixed 15 px S.",
    sourceUrl: null,
    notes: "Exact accepted switch-dimmer geometry, replacing only D with 3: 7.5 px semibold subscript at dx 8 and dy 9. North wall stub and main S are unchanged.",
    def: { title: "3-way switch (NEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.text(0, 0.18, "S", { dy: 5, fs: 15, weight: 600, fill: C.graphite });
      s.text(0, 0.18, "3", { dx: 8, dy: 9, fs: 7.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "switch-3way-iec",
    label: "3-way switch (IEC)",
    engine: "switch-3way-iec",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["floorplan \"IEC switch-3way\" unit m symbols iec\nroom room at 0,0 size 6x6\nfixture switch-3way in room on north at 50%"],
    standard: "IEC 60617 installation-plan two-way switch: accepted lever with a branch stroke (catalog convention).",
    sourceUrl: null,
    notes: "Retains the accepted switch-iec lever and origin dot; the short branch near its free end follows the catalog two-way modifier, scaled to the accepted lever. US three-way corresponds to IEC two-way.",
    def: { title: "3-way switch (IEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.line(-0.08, 0.1, 0.1, 0.3, NOTATION);
      s.circle(-0.08, 0.1, 1.6, POCHE);
      s.line(0.035, 0.228, 0.15, 0.197, NOTATION);
    },
  },
  {
    id: "fluorescent-light",
    label: "Fluorescent light",
    engine: "fluorescent-light",
    tier: 3,
    usageUsers: 1,
    inExemplar: false,
    dsl: ["furniture fluorescent-light in room at 2,2 size 1.2x0.3", "furniture troffer in room at 2,2 size 1.2x0.3"],
    standard: "Linear fluorescent luminaire: long narrow rectangle at its physical 1.20 × 0.30 m fixture size (brief / catalog convention).",
    sourceUrl: null,
    notes: "Graphite electrical outline with a longitudinal centre line, following the catalog linear fixture form at 64 px/m. This fixture uses real dimensions; it is not reduced to the fixed-size point used for ceiling light outlets.",
    def: { title: "Fluorescent light", centre: [0, 0] },
    draw(s) {
      s.rect(-0.6, -0.15, 0.6, 0.15, 0, NOTATION);
      s.line(-0.6, 0, 0.6, 0, NOTATION);
    },
  },
  {
    id: "tv-outlet",
    label: "TV outlet",
    engine: "tv-outlet",
    tier: 3,
    usageUsers: 1,
    inExemplar: false,
    dsl: ["fixture tv-outlet in room on north at 50%", "fixture coax-outlet in room on north at 50%"],
    standard: "Communications outlet: accepted data-outlet box tagged TV (round-3 brief); fixed 17.92 × 15.36 px mark.",
    sourceUrl: null,
    notes: "Exact accepted data-outlet box on the north wall stub, with TV identifying television/coax service. The paired letters use the accepted 8.5 px tag size.",
    def: { title: "TV outlet", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.rect(-0.14, 0.03, 0.14, 0.27, 0, NOTATION);
      s.text(0, 0.15, "TV", { dy: 3.1, fs: 8.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "junction-box",
    label: "Junction box",
    engine: "junction-box",
    tier: 3,
    usageUsers: 1,
    inExemplar: false,
    dsl: ["furniture junction-box in room at 2,2 size 0.28x0.28"],
    standard: "Junction box: circle tagged J (round-3 brief); fixed 17.92 px circle.",
    sourceUrl: null,
    notes: "Uses the accepted circular electrical device notation and small semibold J. Chosen ceiling junction point without a wall stub; circular form follows the brief instead of the inventory square.",
    def: { title: "Junction box", centre: [0, 0] },
    draw(s) {
      s.circle(0, 0, 0.14 * K, NOTATION);
      s.text(0, 0, "J", { dy: 3.1, fs: 9, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "weatherproof-outlet",
    label: "Weatherproof outlet (NEC)",
    engine: "weatherproof-outlet",
    tier: 3,
    usageUsers: 1,
    inExemplar: false,
    dsl: ["fixture weatherproof-outlet in room on north at 50%"],
    standard: "ANSI Y32.9 receptacle family with WP weatherproof designation; fixed 17.92 px circle.",
    sourceUrl: null,
    notes: "Exact accepted single US receptacle and wall stub, extended only by WP in the accepted GFCI tag style. Weather protection does not change contact count.",
    def: { title: "Weatherproof outlet (NEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.circle(0, 0.17, 0.14 * K, NOTATION);
      s.line(0, 0.03, 0, 0.31, NOTATION);
      s.text(0, 0.31, "WP", { dy: 12, fs: 8.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "weatherproof-outlet-iec",
    label: "Weatherproof outlet (IEC)",
    engine: "weatherproof-outlet-iec",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["floorplan \"IEC weatherproof-outlet\" unit m symbols iec\nroom room at 0,0 size 6x6\nfixture weatherproof-outlet in room on north at 50%"],
    standard: "IEC 60617 installation-plan socket family with IP44 enclosure designation (round-3 brief); fixed 17.92 px width.",
    sourceUrl: null,
    notes: "Exact accepted IEC semicircle and single stem on the north wall stub. Chosen IP44 tag as the brief permits; this is an illustrative enclosure rating, not a universal rating for every exterior socket.",
    def: { title: "Weatherproof outlet (IEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.path([["M", -0.14, 0.03], ["A", 0.14, 0.14, 0, 0.14, 0.03]], NOTATION);
      s.line(-0.14, 0.03, 0.14, 0.03, NOTATION);
      s.line(0, 0.17, 0, 0.31, NOTATION);
      s.text(0, 0.31, "IP44", { dy: 12, fs: 8.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "floor-outlet",
    label: "Floor outlet",
    engine: "floor-outlet",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["furniture floor-outlet in room at 2,2 size 0.36x0.36"],
    standard: "Floor-mounted receptacle: single US receptacle inside a square floor box (brief / ANSI Y32.9 family).",
    sourceUrl: null,
    notes: "Accepted 17.92 px single-receptacle circle and full contact stroke centred inside a 23.04 px square. No wall bar because the box is floor-mounted; fixed-size electrical notation.",
    def: { title: "Floor outlet", centre: [0, 0] },
    draw(s) {
      s.rect(-0.18, -0.18, 0.18, 0.18, 0, NOTATION);
      s.circle(0, 0, 0.14 * K, NOTATION);
      s.line(0, -0.14, 0, 0.14, NOTATION);
    },
  },
  {
    id: "phone-outlet",
    label: "Phone outlet",
    engine: "phone-outlet",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["fixture phone-outlet in room on north at 50%"],
    standard: "Communications outlet: accepted data-outlet box tagged PH (round-3 brief); fixed 17.92 × 15.36 px mark.",
    sourceUrl: null,
    notes: "Exact accepted data-outlet box on the north wall stub, with PH identifying telephone service distinctly from the thermostat T; the brief requests the square communications family instead of the inventory triangle.",
    def: { title: "Phone outlet", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.rect(-0.14, 0.03, 0.14, 0.27, 0, NOTATION);
      s.text(0, 0.15, "PH", { dy: 3.1, fs: 8.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "switch-4way",
    label: "4-way switch (NEC)",
    engine: "switch-4way",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["fixture switch-4way in room on north at 50%"],
    standard: "ANSI Y32.9 4-way wall switch: S with 4 subscript; accepted fixed 15 px S.",
    sourceUrl: null,
    notes: "Exact accepted switch-dimmer geometry, replacing only D with 4: 7.5 px semibold subscript at dx 8 and dy 9. North wall stub and main S are unchanged.",
    def: { title: "4-way switch (NEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.text(0, 0.18, "S", { dy: 5, fs: 15, weight: 600, fill: C.graphite });
      s.text(0, 0.18, "4", { dx: 8, dy: 9, fs: 7.5, weight: 600, fill: C.graphite });
    },
  },
  {
    id: "switch-4way-iec",
    label: "4-way switch (IEC)",
    engine: "switch-4way-iec",
    tier: 3,
    usageUsers: null,
    inExemplar: false,
    dsl: ["floorplan \"IEC switch-4way\" unit m symbols iec\nroom room at 0,0 size 6x6\nfixture switch-4way in room on north at 50%"],
    standard: "IEC 60617 installation-plan intermediate switch: two crossing levers with origin dots (catalog convention).",
    sourceUrl: null,
    notes: "Retains the accepted switch-iec lever and adds its mirrored crossing lever and second origin dot, as in the catalog intermediate-switch form. US four-way corresponds to IEC intermediate.",
    def: { title: "4-way switch (IEC)", centre: [0, 0] },
    draw(s) {
      wall(s, -0.25, 0.25, 0.06);
      s.line(-0.08, 0.1, 0.1, 0.3, NOTATION);
      s.circle(-0.08, 0.1, 1.6, POCHE);
      s.line(0.1, 0.1, -0.08, 0.3, NOTATION);
      s.circle(0.1, 0.1, 1.6, POCHE);
    },
  },
];

mkdirSync(OUT, { recursive: true });
for (const sym of SYMBOLS) writeFileSync(new URL(`${sym.id}.svg`, OUT), symbol(sym.def, sym.draw));

const manifest = {
  type: "floorplan",
  variant: null,
  exemplar: "floorplan",
  style: "Drawn at the exemplar's 64 px per metre on white paper: cut walls are solid graphite #1F2328 poché, door leaves 1.6 px graphite with 0.9 px pencil #A3ABB4 swing arcs, and windows 0.9 px graphite face lines around a 1.8 px glazing-blue #4F86B0 glass line. Furniture and fixtures are 1.1 px slate #55606C outlines filled white, with 0.8 px slate interior detail and 2–3 px corner radii; mist #EDEFF2 is kept for built-in counters and tubs only. Stair treads are 0.9 px slate, solid up to a 1.4 px graphite break line and pencil-dashed beyond, with a graphite arrow and 'UP' in 9.5 px semibold Inter.",
  symbols: SYMBOLS.map(({ id, label, engine, source, previewGroup, dsl, standard, sourceUrl, inExemplar = true, notes, tier = 1, usageUsers }) => ({
    id, label, file: `${id}.svg`, engine, source, previewGroup, dsl, standard, sourceUrl, inExemplar, notes, tier, usageUsers,
  })),
};
writeFileSync(new URL("manifest.json", OUT), JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote ${SYMBOLS.length} symbols`);
