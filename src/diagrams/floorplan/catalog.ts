/**
 * Floor plan — furniture & fixture symbol catalog.
 *
 * Spec: docs/reference/48-FLOORPLAN-STANDARD.md §2.2–2.3, §5.
 *
 * Original line art following the Architectural Graphic Standards plan-view
 * silhouettes (same stance as network vs Cisco icons): thin stroke, light
 * fill, themable via CSS classes. Every draw renders into a w×h meter box
 * at the origin; the renderer wraps it in a translate/rotate group.
 *
 * Auto-seating (§2.3): round tables distribute N chairs on the circumference;
 * rectangular dining/banquet/conference tables seat both long edges at one
 * chair per 0.65 m; head tables seat one side only; row-chairs place a strip
 * at 0.55 m pitch. Chair overhang beyond the nominal box is declared via
 * `envelope` so collision checks use the chair-ring envelope (§6.3).
 */

import { circle, el, line, path, polygon, rect, text as textEl } from "../../core/svg";
import { estimateTextWidth } from "../../core/text-metrics";
import type { FurnitureType, SymbolDef, SymbolDrawCtx } from "./types";

// Chair footprint (m): seat width × depth, used by all auto-seating.
const CHAIR_W = 0.44;
const CHAIR_D = 0.38;
/** How far auto chairs sit from the table edge (center offset, m). */
const CHAIR_GAP = 0.27;
/** Chair overhang envelope beyond a table edge (m). */
const CHAIR_OVERHANG = 0.5;
/** Round-table chair ring depth (§5: 0.45 m). */
const RING = 0.45;

function chairAt(px: (m: number) => number, cx: number, cy: number, deg: number): string {
  const body = rect({
    class: "sx-fp-chair",
    x: px(-CHAIR_W / 2),
    y: px(-CHAIR_D / 2),
    width: px(CHAIR_W),
    height: px(CHAIR_D),
    rx: px(0.09),
  });
  const rot = Math.round(deg * 10) / 10;
  return el("g", { transform: `translate(${px(cx)},${px(cy)}) rotate(${rot})` }, [body]);
}

/** Default / minimum seat-name font size (meters). */
const SEAT_FS = 0.17;
const SEAT_FS_MIN = 0.085;

/**
 * Occupant name centered on a seat (§2.5). Upright text regardless of seat
 * angle — reads left-to-right around the table; the symbol is drawn before
 * any item rotation, so names stay horizontal for unrotated tables (the
 * seating-chart norm). Empty/undefined names render nothing.
 *
 * The font auto-shrinks so the name fits `slotW` (the neighbour-to-neighbour
 * seat spacing, meters) — long names on tightly-pitched edge tables (head /
 * banquet) scale down instead of overlapping the next seat; short names keep
 * the default size. Floored at `SEAT_FS_MIN` so it never vanishes.
 */
function seatName(c: SymbolDrawCtx, cx: number, cy: number, name: string | undefined, slotW: number): string {
  if (!name) return "";
  const unitW = estimateTextWidth(name, 1); // width at fontSize = 1 m
  let fs = SEAT_FS;
  if (unitW > 0 && unitW * fs > slotW) fs = Math.max(SEAT_FS_MIN, slotW / unitW);
  return textEl(
    {
      class: "sx-fp-seat-name",
      x: c.px(cx),
      y: c.px(cy),
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": c.px(fs),
    },
    name
  );
}

/**
 * Chairs along the top and/or bottom edge of a w-wide table at 0.65 m pitch.
 * When `seats` is given, occupant names are placed on each chair in order:
 * the whole top row left-to-right, then the whole bottom row left-to-right.
 */
function edgeChairs(c: SymbolDrawCtx, top: boolean, bottom: boolean, seats?: string[]): string {
  const n = Math.max(1, Math.round(c.w / 0.65));
  const slotW = (c.w / n) * 0.96; // seat pitch, minus a hair of breathing room
  const out: string[] = [];
  let s = 0;
  const row = (cy: number, deg: number): void => {
    for (let i = 0; i < n; i++) {
      const cx = ((i + 0.5) / n) * c.w;
      out.push(chairAt(c.px, cx, cy, deg));
      if (seats) out.push(seatName(c, cx, cy, seats[s++], slotW));
    }
  };
  if (top) row(-CHAIR_GAP, 0);
  if (bottom) row(c.h + CHAIR_GAP, 180);
  return out.join("");
}

function box(c: SymbolDrawCtx, cls = "sx-fp-furn", rx = 0): string {
  return rect({ class: cls, x: 0, y: 0, width: c.px(c.w), height: c.px(c.h), rx: rx ? c.px(rx) : undefined });
}

function glyphText(c: SymbolDrawCtx, label: string): string {
  return textEl(
    {
      class: "sx-fp-furn-text",
      x: c.px(c.w / 2),
      y: c.px(c.h / 2),
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": c.px(Math.min(0.24, c.h * 0.4)),
    },
    label
  );
}

function bedDraw(pillows: 1 | 2) {
  return (c: SymbolDrawCtx): string => {
    const parts = [box(c, "sx-fp-furn", 0.05)];
    const pw = pillows === 2 ? c.w / 2 - 0.18 : c.w - 0.24;
    parts.push(rect({ class: "sx-fp-furn", x: c.px(0.12), y: c.px(0.1), width: c.px(pw), height: c.px(0.42), rx: c.px(0.06) }));
    if (pillows === 2) {
      parts.push(rect({ class: "sx-fp-furn", x: c.px(c.w / 2 + 0.06), y: c.px(0.1), width: c.px(pw), height: c.px(0.42), rx: c.px(0.06) }));
    }
    // blanket fold line
    parts.push(line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(0.72), x2: c.px(c.w), y2: c.px(0.72) }));
    return parts.join("");
  };
}

function sofaDraw(cushions: number) {
  return (c: SymbolDrawCtx): string => {
    const parts = [box(c, "sx-fp-furn", 0.08)];
    // backrest
    parts.push(rect({ class: "sx-fp-furn", x: c.px(0.15), y: 0, width: c.px(c.w - 0.3), height: c.px(0.18), rx: c.px(0.05) }));
    // arms
    parts.push(line({ class: "sx-fp-furn-line", x1: c.px(0.15), y1: c.px(0.18), x2: c.px(0.15), y2: c.px(c.h - 0.05) }));
    parts.push(line({ class: "sx-fp-furn-line", x1: c.px(c.w - 0.15), y1: c.px(0.18), x2: c.px(c.w - 0.15), y2: c.px(c.h - 0.05) }));
    // cushion dividers
    for (let i = 1; i < cushions; i++) {
      const x = c.px(0.15 + ((c.w - 0.3) * i) / cushions);
      parts.push(line({ class: "sx-fp-furn-line", x1: x, y1: c.px(0.18), x2: x, y2: c.px(c.h - 0.08) }));
    }
    return parts.join("");
  };
}

function shelfDraw(c: SymbolDrawCtx): string {
  const parts = [box(c)];
  const n = Math.max(2, Math.round(c.w / 0.15));
  for (let i = 1; i < n; i++) {
    const x = c.px((c.w * i) / n);
    parts.push(line({ class: "sx-fp-furn-line", x1: x, y1: 0, x2: x, y2: c.px(c.h) }));
  }
  return parts.join("");
}

function boardDraw(c: SymbolDrawCtx): string {
  return [
    rect({ class: "sx-fp-furn-solid", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h) }),
    rect({ class: "sx-fp-board-inner", x: c.px(0.08), y: c.px(c.h * 0.2), width: c.px(c.w - 0.16), height: c.px(c.h * 0.6) }),
  ].join("");
}

function applianceDraw(label: string, drum: boolean) {
  return (c: SymbolDrawCtx): string => {
    const parts = [box(c)];
    if (drum) {
      parts.push(circle({ class: "sx-fp-furn-line", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(Math.min(c.w, c.h) * 0.32) }));
    } else {
      parts.push(line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(0.12), x2: c.px(c.w), y2: c.px(0.12) }));
    }
    parts.push(glyphText(c, label));
    return parts.join("");
  };
}

function roundTable(seats: number, diaM: number): SymbolDef {
  const nominal = diaM + 2 * RING;
  return {
    w: nominal,
    h: nominal,
    draw: (c: SymbolDrawCtx): string => {
      const half = Math.min(c.w, c.h) / 2;
      const ring = Math.min(RING, half * 0.37);
      const r = half - ring;
      const cx = c.w / 2;
      const cy = c.h / 2;
      // chord between adjacent seats on the chair ring = the no-overlap slot
      const slotW = 2 * (r + ring * 0.55) * Math.sin(Math.PI / seats);
      const parts = [circle({ class: "sx-fp-furn", cx: c.px(cx), cy: c.px(cy), r: c.px(r) })];
      for (let i = 0; i < seats; i++) {
        const a = (i / seats) * 2 * Math.PI - Math.PI / 2;
        const px0 = cx + (r + ring * 0.55) * Math.cos(a);
        const py0 = cy + (r + ring * 0.55) * Math.sin(a);
        parts.push(chairAt(c.px, px0, py0, (a * 180) / Math.PI + 90));
        if (c.seats) parts.push(seatName(c, px0, py0, c.seats[i], slotW));
      }
      return parts.join("");
    },
  };
}

function tableDraw(top: boolean, bottom: boolean) {
  return (c: SymbolDrawCtx): string => box(c) + edgeChairs(c, top, bottom, c.seats);
}

// ─── Stairs (research-backed conventions, spec §2.4) ─────────────
// Tread depth 0.28 m (11" — safe under both IRC and IBC), direction arrow
// from the lowest tread with an "UP" label, and a 45° zigzag break line at
// the imaginary 4 ft cut plane (~6–7 treads up). Treads beyond the break
// render dashed.

const TREAD = 0.28;

/** Perpendicular tread lines along a straight run; returns SVG parts. */
function treadLines(
  c: SymbolDrawCtx,
  vert: boolean,
  fixed0: number,
  fixed1: number,
  from: number,
  to: number,
  dashedFrom?: number
): string {
  const parts: string[] = [];
  const dir = to >= from ? 1 : -1;
  for (let d = from; dir > 0 ? d <= to : d >= to; d += TREAD * dir) {
    const dashed = dashedFrom !== undefined && (dir > 0 ? d > dashedFrom : d < dashedFrom);
    const cls = dashed ? "sx-fp-furn-dash" : "sx-fp-furn-line";
    if (vert) parts.push(line({ class: cls, x1: c.px(fixed0), y1: c.px(d), x2: c.px(fixed1), y2: c.px(d) }));
    else parts.push(line({ class: cls, x1: c.px(d), y1: c.px(fixed0), x2: c.px(d), y2: c.px(fixed1) }));
  }
  return parts.join("");
}

/** 45° zigzag break line across a run (the drafting cut-plane symbol). */
function breakLine(c: SymbolDrawCtx, vert: boolean, lo: number, hi: number, at: number): string {
  const span = hi - lo;
  const dz = Math.min(0.12, span * 0.18);
  const tilt = span * 0.18;
  const pts = vert
    ? [
        [lo, at + tilt],
        [lo + span * 0.4, at + tilt * 0.2],
        [lo + span * 0.5 - dz, at + tilt * 0.2 + dz],
        [lo + span * 0.5 + dz, at - tilt * 0.2 - dz],
        [lo + span * 0.6, at - tilt * 0.2],
        [hi, at - tilt],
      ]
    : [
        [at + tilt, lo],
        [at + tilt * 0.2, lo + span * 0.4],
        [at + tilt * 0.2 + dz, lo + span * 0.5 - dz],
        [at - tilt * 0.2 - dz, lo + span * 0.5 + dz],
        [at - tilt * 0.2, lo + span * 0.6],
        [at - tilt, hi],
      ];
  const d = pts.map(([a, b], i) => `${i === 0 ? "M" : "L"} ${c.px(vert ? a! : a!)} ${c.px(vert ? b! : b!)}`).join(" ");
  return path({ class: "sx-fp-stair-break", d });
}

/** Direction arrow: small circle at the start, shaft, solid arrowhead. */
function dirArrow(c: SymbolDrawCtx, points: Array<[number, number]>, labelText: string): string {
  const parts: string[] = [];
  const [sx, sy] = points[0]!;
  parts.push(circle({ class: "sx-fp-furn-line", cx: c.px(sx), cy: c.px(sy), r: c.px(0.05) }));
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${c.px(x)} ${c.px(y)}`).join(" ");
  parts.push(path({ class: "sx-fp-furn-line", d }));
  const [ex, ey] = points[points.length - 1]!;
  const [px2, py2] = points[points.length - 2]!;
  const ang = Math.atan2(ey - py2, ex - px2);
  const hs = 0.11;
  const a1 = ang + Math.PI - 0.5;
  const a2 = ang + Math.PI + 0.5;
  parts.push(
    polygon({
      class: "sx-fp-furn-dot",
      points: `${c.px(ex)},${c.px(ey)} ${c.px(ex + hs * Math.cos(a1))},${c.px(ey + hs * Math.sin(a1))} ${c.px(ex + hs * Math.cos(a2))},${c.px(ey + hs * Math.sin(a2))}`,
    })
  );
  // label rides beside the shaft, a step in from the start (haloed in CSS)
  const [nx, ny] = points[1]!;
  const segLen = Math.hypot(nx - sx, ny - sy) || 1;
  const ux = (nx - sx) / segLen;
  const uy = (ny - sy) / segLen;
  const lx = sx + ux * 0.42 - uy * 0.16;
  const ly = sy + uy * 0.42 + ux * 0.16;
  parts.push(
    textEl(
      {
        class: "sx-fp-furn-text",
        x: c.px(lx),
        y: c.px(ly),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-size": c.px(0.18),
      },
      labelText
    )
  );
  return parts.join("");
}

function straightStairs(c: SymbolDrawCtx): string {
  const vert = c.h >= c.w;
  const len = vert ? c.h : c.w;
  const breakAt = Math.min(7 * TREAD, len * 0.62);
  // run ascends from the box's bottom/left end toward the break
  const parts: string[] = [box(c, "sx-fp-furn-nofill")];
  if (vert) {
    parts.push(treadLines(c, true, 0, c.w, c.h - TREAD, 0.02, c.h - breakAt));
    parts.push(breakLine(c, true, 0, c.w, c.h - breakAt));
    parts.push(dirArrow(c, [[c.w / 2, c.h - 0.18], [c.w / 2, c.h - breakAt + 0.28]], c.label ?? "UP"));
  } else {
    parts.push(treadLines(c, false, 0, c.h, TREAD, c.w - 0.02, breakAt));
    parts.push(breakLine(c, false, 0, c.h, breakAt));
    parts.push(dirArrow(c, [[0.18, c.h / 2], [breakAt - 0.28, c.h / 2]], c.label ?? "UP"));
  }
  return parts.join("");
}

function lStairs(c: SymbolDrawCtx): string {
  // vertical run up the left edge to a top-left landing, then right —
  // the symbol's outline is the L itself, not the bounding box
  const rw = Math.min(c.w, c.h) * 0.45;
  const parts: string[] = [
    path({
      class: "sx-fp-furn-nofill",
      d: `M 0 0 L ${c.px(c.w)} 0 L ${c.px(c.w)} ${c.px(rw)} L ${c.px(rw)} ${c.px(rw)} L ${c.px(rw)} ${c.px(c.h)} L 0 ${c.px(c.h)} Z`,
    }),
  ];
  // landing divider
  parts.push(line({ class: "sx-fp-furn-line", x1: c.px(rw), y1: 0, x2: c.px(rw), y2: c.px(rw) }));
  // run 1 (vertical, below landing): solid treads
  parts.push(treadLines(c, true, 0, rw, c.h - TREAD, rw + 0.05));
  // run 2 (horizontal, right of landing): treads to the break, dashed beyond
  const breakAt = rw + (c.w - rw) * 0.55;
  parts.push(treadLines(c, false, 0, rw, rw + TREAD, c.w - 0.02, breakAt));
  parts.push(breakLine(c, false, 0, rw, breakAt));
  parts.push(
    dirArrow(
      c,
      [
        [rw / 2, c.h - 0.18],
        [rw / 2, rw / 2],
        [breakAt - 0.24, rw / 2],
      ],
      c.label ?? "UP"
    )
  );
  return parts.join("");
}

function uStairs(c: SymbolDrawCtx): string {
  // two parallel vertical runs + a full-width landing at the top
  const lh = Math.min(c.h * 0.3, Math.max(0.9, c.w / 2));
  const mid = c.w / 2;
  const parts: string[] = [box(c, "sx-fp-furn-nofill")];
  parts.push(line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(lh), x2: c.px(c.w), y2: c.px(lh) }));
  parts.push(line({ class: "sx-fp-furn-line", x1: c.px(mid), y1: c.px(lh), x2: c.px(mid), y2: c.px(c.h) }));
  // ascending run (right): solid treads up to the landing
  parts.push(treadLines(c, true, mid, c.w, c.h - TREAD, lh + 0.05));
  // upper run (left, above the cut plane): break early, dashed beyond
  const breakAt = lh + (c.h - lh) * 0.4;
  parts.push(treadLines(c, true, 0, mid, lh + TREAD, c.h - 0.02, breakAt));
  parts.push(breakLine(c, true, 0, mid, breakAt));
  parts.push(
    dirArrow(
      c,
      [
        [mid + mid / 2, c.h - 0.18],
        [mid + mid / 2, lh / 2],
        [mid / 2, lh / 2],
        [mid / 2, breakAt - 0.24],
      ],
      c.label ?? "UP"
    )
  );
  return parts.join("");
}

function spiralStairs(c: SymbolDrawCtx): string {
  const r = Math.min(c.w, c.h) / 2 - 0.02;
  const cx = c.w / 2;
  const cy = c.h / 2;
  const parts: string[] = [
    circle({ class: "sx-fp-furn", cx: c.px(cx), cy: c.px(cy), r: c.px(r) }),
    circle({ class: "sx-fp-furn-line", cx: c.px(cx), cy: c.px(cy), r: c.px(0.08) }),
  ];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    parts.push(
      line({
        class: "sx-fp-furn-line",
        x1: c.px(cx + 0.08 * Math.cos(a)),
        y1: c.px(cy + 0.08 * Math.sin(a)),
        x2: c.px(cx + r * Math.cos(a)),
        y2: c.px(cy + r * Math.sin(a)),
      })
    );
  }
  // ascending sweep arrow on the walkline
  const wr = r * 0.62;
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 1.9;
  const steps = 5;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push([cx + wr * Math.cos(a), cy + wr * Math.sin(a)]);
  }
  parts.push(dirArrow(c, pts, c.label ?? "UP"));
  return parts.join("");
}

function outletDraw(duplex: boolean): (c: SymbolDrawCtx) => string {
  return (c: SymbolDrawCtx): string => {
    const parts: string[] = [];
    const cx = c.w / 2;
    const centers = duplex ? [c.h * 0.34, c.h * 0.66] : [c.h / 2];
    parts.push(rect({ class: "sx-fp-furn-nofill", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h), rx: c.px(0.04) }));
    for (const cy of centers) {
      parts.push(circle({ class: "sx-fp-furn-line", cx: c.px(cx), cy: c.px(cy), r: c.px(Math.min(c.w, c.h) * 0.16) }));
      parts.push(line({ class: "sx-fp-furn-line", x1: c.px(cx - c.w * 0.1), y1: c.px(cy), x2: c.px(cx + c.w * 0.1), y2: c.px(cy) }));
    }
    return parts.join("");
  };
}

function electricalSwitchDraw(c: SymbolDrawCtx): string {
  return [
    rect({ class: "sx-fp-furn-nofill", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h), rx: c.px(0.04) }),
    line({ class: "sx-fp-furn-line", x1: c.px(c.w * 0.28), y1: c.px(c.h * 0.65), x2: c.px(c.w * 0.72), y2: c.px(c.h * 0.35) }),
    circle({ class: "sx-fp-furn-dot", cx: c.px(c.w * 0.28), cy: c.px(c.h * 0.65), r: c.px(0.025) }),
  ].join("");
}

function lightDraw(label = "L"): (c: SymbolDrawCtx) => string {
  return (c: SymbolDrawCtx): string => {
    const r = Math.min(c.w, c.h) / 2 - 0.01;
    const cx = c.w / 2;
    const cy = c.h / 2;
    return [
      circle({ class: "sx-fp-furn-nofill", cx: c.px(cx), cy: c.px(cy), r: c.px(r) }),
      line({ class: "sx-fp-furn-line", x1: c.px(cx - r * 0.65), y1: c.px(cy - r * 0.65), x2: c.px(cx + r * 0.65), y2: c.px(cy + r * 0.65) }),
      line({ class: "sx-fp-furn-line", x1: c.px(cx + r * 0.65), y1: c.px(cy - r * 0.65), x2: c.px(cx - r * 0.65), y2: c.px(cy + r * 0.65) }),
      textEl({ class: "sx-fp-furn-text", x: c.px(cx), y: c.px(cy + r + 0.11), "text-anchor": "middle", "font-size": c.px(0.16) }, label),
    ].join("");
  };
}

function panelDraw(label: string): (c: SymbolDrawCtx) => string {
  return (c: SymbolDrawCtx): string => {
    const parts = [
      rect({ class: "sx-fp-furn", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h), rx: c.px(0.03) }),
      textEl({
        class: "sx-fp-furn-text",
        x: c.px(c.w / 2),
        y: c.px(c.h / 2),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-size": c.px(Math.min(0.14, c.h * 0.45)),
      }, label),
    ];
    return parts.join("");
  };
}

// ─── Catalog ─────────────────────────────────────────────────────

export const FLOORPLAN_SYMBOLS: Record<FurnitureType, SymbolDef> = {
  // ── residential / living ──
  "bed-double": { w: 1.6, h: 2.0, draw: bedDraw(2) },
  "bed-single": { w: 0.9, h: 2.0, draw: bedDraw(1) },
  "bed-queen": { w: 1.55, h: 2.05, draw: bedDraw(2) },
  "bed-king": { w: 1.95, h: 2.05, draw: bedDraw(2) },
  sofa: { w: 2.2, h: 0.9, draw: sofaDraw(3) },
  loveseat: { w: 1.5, h: 0.9, draw: sofaDraw(2) },
  armchair: { w: 0.9, h: 0.9, draw: sofaDraw(1) },
  "coffee-table": { w: 1.0, h: 0.5, draw: (c) => box(c, "sx-fp-furn", 0.06) },
  tv: { w: 1.4, h: 0.15, draw: (c) => rect({ class: "sx-fp-furn-solid", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h) }) },
  rug: {
    w: 2.0,
    h: 1.4,
    underlay: true,
    draw: (c) => rect({ class: "sx-fp-rug", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h), rx: c.px(0.1) }),
  },
  wardrobe: {
    w: 1.8,
    h: 0.6,
    draw: (c) => {
      // hanger rail runs along the long axis, with cross ticks for hangers
      const parts = [box(c)];
      if (c.w >= c.h) {
        parts.push(line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(c.h / 2), x2: c.px(c.w), y2: c.px(c.h / 2) }));
        const n = Math.max(2, Math.round(c.w / 0.15));
        for (let i = 0; i < n; i++) {
          const x = c.px(((i + 0.5) / n) * c.w);
          parts.push(line({ class: "sx-fp-furn-line", x1: x, y1: c.px(c.h / 2 - 0.1), x2: x, y2: c.px(c.h / 2 + 0.1) }));
        }
      } else {
        parts.push(line({ class: "sx-fp-furn-line", x1: c.px(c.w / 2), y1: 0, x2: c.px(c.w / 2), y2: c.px(c.h) }));
        const n = Math.max(2, Math.round(c.h / 0.15));
        for (let i = 0; i < n; i++) {
          const y = c.px(((i + 0.5) / n) * c.h);
          parts.push(line({ class: "sx-fp-furn-line", x1: c.px(c.w / 2 - 0.1), y1: y, x2: c.px(c.w / 2 + 0.1), y2: y }));
        }
      }
      return parts.join("");
    },
  },
  dresser: {
    w: 1.2,
    h: 0.5,
    draw: (c) =>
      [
        box(c),
        line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(c.h / 2), x2: c.px(c.w), y2: c.px(c.h / 2) }),
        circle({ class: "sx-fp-furn-line", cx: c.px(c.w * 0.3), cy: c.px(c.h * 0.25), r: c.px(0.03) }),
        circle({ class: "sx-fp-furn-line", cx: c.px(c.w * 0.7), cy: c.px(c.h * 0.25), r: c.px(0.03) }),
      ].join(""),
  },
  nightstand: {
    w: 0.5,
    h: 0.4,
    draw: (c) => box(c) + circle({ class: "sx-fp-furn-line", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(0.08) }),
  },
  bookshelf: { w: 0.9, h: 0.3, draw: shelfDraw },
  plant: {
    w: 0.5,
    h: 0.5,
    draw: (c) => {
      const r = Math.min(c.w, c.h) / 2;
      const parts = [circle({ class: "sx-fp-furn", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(r) })];
      for (const a of [0, 60, 120, 180, 240, 300]) {
        const rad = (a * Math.PI) / 180;
        parts.push(
          line({
            class: "sx-fp-furn-line",
            x1: c.px(c.w / 2),
            y1: c.px(c.h / 2),
            x2: c.px(c.w / 2 + (r - 0.03) * Math.cos(rad)),
            y2: c.px(c.h / 2 + (r - 0.03) * Math.sin(rad)),
          })
        );
      }
      return parts.join("");
    },
  },
  "dining-table": { w: 1.6, h: 0.9, envelope: [CHAIR_OVERHANG, 0, CHAIR_OVERHANG, 0], draw: tableDraw(true, true) },
  sectional: {
    w: 2.6,
    h: 2.0,
    draw: (c) => {
      // L-sofa: long run along the top + chaise down the left, back rails on the outer edges
      const d = 0.9 * Math.min(c.h / 2.0, 1);
      const parts: string[] = [
        path({
          class: "sx-fp-furn",
          d: `M 0 0 L ${c.px(c.w)} 0 L ${c.px(c.w)} ${c.px(d)} L ${c.px(d)} ${c.px(d)} L ${c.px(d)} ${c.px(c.h)} L 0 ${c.px(c.h)} Z`,
        }),
        rect({ class: "sx-fp-furn", x: c.px(0.12), y: 0, width: c.px(c.w - 0.24), height: c.px(0.16), rx: c.px(0.05) }),
        rect({ class: "sx-fp-furn", x: 0, y: c.px(0.12), width: c.px(0.16), height: c.px(c.h - 0.24), rx: c.px(0.05) }),
      ];
      for (const fx of [0.33, 0.66]) {
        parts.push(line({ class: "sx-fp-furn-line", x1: c.px(d + (c.w - d) * fx), y1: c.px(0.16), x2: c.px(d + (c.w - d) * fx), y2: c.px(d - 0.05) }));
      }
      parts.push(line({ class: "sx-fp-furn-line", x1: c.px(0.16), y1: c.px(c.h / 2 + d / 4), x2: c.px(d - 0.05), y2: c.px(c.h / 2 + d / 4) }));
      return parts.join("");
    },
  },
  "side-table": { w: 0.5, h: 0.5, draw: (c) => box(c, "sx-fp-furn", 0.06) },
  "tv-stand": {
    w: 1.6,
    h: 0.45,
    underlay: true, // a surface — the TV sits on it
    draw: (c) => box(c) + line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(c.h / 2), x2: c.px(c.w), y2: c.px(c.h / 2) }),
  },
  fireplace: {
    w: 1.5,
    h: 0.5,
    draw: (c) => {
      const inset = Math.min(0.18, c.w * 0.15);
      return [
        box(c),
        // firebox opening toward the room (south edge)
        rect({
          class: "sx-fp-furn-line",
          x: c.px(inset),
          y: c.px(c.h * 0.3),
          width: c.px(c.w - 2 * inset),
          height: c.px(c.h * 0.7 - 0.04),
        }),
        line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(c.h * 0.3), x2: c.px(inset), y2: 0 }),
        line({ class: "sx-fp-furn-line", x1: c.px(c.w), y1: c.px(c.h * 0.3), x2: c.px(c.w - inset), y2: 0 }),
      ].join("");
    },
  },
  "floor-lamp": {
    w: 0.35,
    h: 0.35,
    draw: (c) => {
      const r = Math.min(c.w, c.h) / 2;
      return [
        circle({ class: "sx-fp-furn", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(r) }),
        line({ class: "sx-fp-furn-line", x1: c.px(c.w / 2 - r), y1: c.px(c.h / 2), x2: c.px(c.w / 2 + r), y2: c.px(c.h / 2) }),
        line({ class: "sx-fp-furn-line", x1: c.px(c.w / 2), y1: c.px(c.h / 2 - r), x2: c.px(c.w / 2), y2: c.px(c.h / 2 + r) }),
      ].join("");
    },
  },
  ottoman: { w: 0.6, h: 0.45, draw: (c) => box(c, "sx-fp-furn", 0.12) },
  piano: {
    w: 1.5,
    h: 1.7,
    draw: (c) => {
      // grand piano: straight keyboard edge at the top, harp-curved body
      const X = (v: number) => c.px(v * (c.w / 1.5));
      const Y = (v: number) => c.px(v * (c.h / 1.7));
      const body = [
        `M ${X(0)} ${Y(0)}`,
        `L ${X(1.5)} ${Y(0)}`,
        `L ${X(1.5)} ${Y(0.75)}`,
        `C ${X(1.5)} ${Y(1.25)} ${X(1.25)} ${Y(1.7)} ${X(0.8)} ${Y(1.7)}`,
        `C ${X(0.45)} ${Y(1.7)} ${X(0.28)} ${Y(1.45)} ${X(0.28)} ${Y(1.1)}`,
        `C ${X(0.28)} ${Y(0.85)} ${X(0.14)} ${Y(0.72)} ${X(0)} ${Y(0.68)}`,
        "Z",
      ].join(" ");
      return (
        path({ class: "sx-fp-furn", d: body }) +
        line({ class: "sx-fp-furn-line", x1: X(0), y1: Y(0.14), x2: X(1.5), y2: Y(0.14) }) +
        chairAt(c.px, (c.w / 1.5) * 0.75, -0.25, 180)
      );
    },
    envelope: [CHAIR_OVERHANG, 0, 0, 0],
  },
  "piano-upright": {
    w: 1.5,
    h: 0.6,
    envelope: [0, 0, CHAIR_OVERHANG, 0],
    draw: (c) =>
      box(c) +
      line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(c.h * 0.55), x2: c.px(c.w), y2: c.px(c.h * 0.55) }) +
      chairAt(c.px, c.w / 2, c.h + CHAIR_GAP, 180),
  },
  "pool-table": {
    w: 2.54,
    h: 1.27,
    draw: (c) => {
      const rail = Math.min(0.12, c.h * 0.1);
      const parts = [
        box(c, "sx-fp-furn", 0.06),
        rect({ class: "sx-fp-furn-line", x: c.px(rail), y: c.px(rail), width: c.px(c.w - 2 * rail), height: c.px(c.h - 2 * rail) }),
      ];
      for (const [px0, py0] of [
        [rail, rail],
        [c.w / 2, rail],
        [c.w - rail, rail],
        [rail, c.h - rail],
        [c.w / 2, c.h - rail],
        [c.w - rail, c.h - rail],
      ]) {
        parts.push(circle({ class: "sx-fp-furn-dot", cx: c.px(px0!), cy: c.px(py0!), r: c.px(0.045) }));
      }
      return parts.join("");
    },
  },
  crib: {
    w: 0.7,
    h: 1.3,
    draw: (c) => {
      const parts = [box(c, "sx-fp-furn", 0.05), rect({ class: "sx-fp-furn-line", x: c.px(0.08), y: c.px(0.08), width: c.px(c.w - 0.16), height: c.px(c.h - 0.16), rx: c.px(0.04) })];
      const n = Math.max(3, Math.round(c.h / 0.18));
      for (let i = 1; i < n; i++) {
        const y = c.px(0.08 + ((c.h - 0.16) * i) / n);
        parts.push(line({ class: "sx-fp-furn-line", x1: c.px(0.08), y1: y, x2: c.px(c.w - 0.08), y2: y }));
      }
      return parts.join("");
    },
  },
  "bunk-bed": {
    w: 0.95,
    h: 2.0,
    draw: (c) =>
      bedDraw(1)(c) +
      line({ class: "sx-fp-furn-dash", x1: c.px(0.07), y1: c.px(0.07), x2: c.px(c.w - 0.07), y2: c.px(0.07) }) +
      [0.25, 0.45, 0.65].map((f) => line({ class: "sx-fp-furn-line", x1: c.px(c.w - 0.16), y1: c.px(c.h * f), x2: c.px(c.w), y2: c.px(c.h * f) })).join(""),
  },
  "ceiling-fan": {
    w: 0.9,
    h: 0.9,
    underlay: true, // overhead fixture — never collides with floor furniture
    draw: (c) => {
      const r = Math.min(c.w, c.h) / 2;
      const cx = c.w / 2;
      const cy = c.h / 2;
      const parts = [
        circle({ class: "sx-fp-furn-dash", cx: c.px(cx), cy: c.px(cy), r: c.px(r) }),
        circle({ class: "sx-fp-furn", cx: c.px(cx), cy: c.px(cy), r: c.px(r * 0.18) }),
      ];
      for (const a of [20, 110, 200, 290]) {
        const rad = (a * Math.PI) / 180;
        parts.push(
          el("ellipse", {
            class: "sx-fp-furn-line",
            cx: c.px(cx + r * 0.55 * Math.cos(rad)),
            cy: c.px(cy + r * 0.55 * Math.sin(rad)),
            rx: c.px(r * 0.42),
            ry: c.px(r * 0.15),
            transform: `rotate(${a} ${c.px(cx + r * 0.55 * Math.cos(rad))} ${c.px(cy + r * 0.55 * Math.sin(rad))})`,
          })
        );
      }
      return parts.join("");
    },
  },

  // ── kitchen / bath ──
  counter: {
    w: 2.0,
    h: 0.6,
    underlay: true,
    draw: (c) =>
      box(c) +
      line({
        class: "sx-fp-furn-dash",
        x1: c.px(0.05),
        y1: c.px(c.h - 0.06),
        x2: c.px(c.w - 0.05),
        y2: c.px(c.h - 0.06),
      }),
  },
  "kitchen-sink": {
    w: 0.8,
    h: 0.6,
    draw: (c) =>
      [
        box(c),
        rect({ class: "sx-fp-furn-line", x: c.px(0.07), y: c.px(0.1), width: c.px(c.w / 2 - 0.11), height: c.px(c.h - 0.2), rx: c.px(0.04) }),
        rect({ class: "sx-fp-furn-line", x: c.px(c.w / 2 + 0.04), y: c.px(0.1), width: c.px(c.w / 2 - 0.11), height: c.px(c.h - 0.2), rx: c.px(0.04) }),
        circle({ class: "sx-fp-furn-dot", cx: c.px(c.w / 2), cy: c.px(0.06), r: c.px(0.024) }),
      ].join(""),
  },
  stove: {
    w: 0.6,
    h: 0.6,
    draw: (c) => {
      const parts = [box(c)];
      const inset = 0.18;
      for (const [bx, by] of [
        [inset, inset],
        [c.w - inset, inset],
        [inset, c.h - inset],
        [c.w - inset, c.h - inset],
      ]) {
        parts.push(circle({ class: "sx-fp-furn-line", cx: c.px(bx!), cy: c.px(by!), r: c.px(0.085) }));
      }
      return parts.join("");
    },
  },
  fridge: { w: 0.7, h: 0.7, draw: applianceDraw("REF", false) },
  dishwasher: { w: 0.6, h: 0.6, draw: applianceDraw("DW", false) },
  island: {
    w: 1.8,
    h: 0.9,
    underlay: true,
    draw: (c) =>
      box(c) + rect({ class: "sx-fp-furn-line", x: c.px(0.08), y: c.px(0.08), width: c.px(c.w - 0.16), height: c.px(c.h - 0.16) }),
  },
  toilet: {
    w: 0.5,
    h: 0.7,
    draw: (c) =>
      [
        rect({ class: "sx-fp-furn", x: 0, y: 0, width: c.px(c.w), height: c.px(0.2), rx: c.px(0.04) }),
        el("ellipse", {
          class: "sx-fp-furn",
          cx: c.px(c.w / 2),
          cy: c.px(0.2 + (c.h - 0.24) / 2),
          rx: c.px(c.w / 2 - 0.04),
          ry: c.px((c.h - 0.28) / 2),
        }),
      ].join(""),
  },
  sink: {
    w: 0.55,
    h: 0.45,
    draw: (c) =>
      [
        box(c, "sx-fp-furn", 0.05),
        el("ellipse", {
          class: "sx-fp-furn-line",
          cx: c.px(c.w / 2),
          cy: c.px(c.h / 2 + 0.02),
          rx: c.px(c.w / 2 - 0.08),
          ry: c.px(c.h / 2 - 0.1),
        }),
        circle({ class: "sx-fp-furn-dot", cx: c.px(c.w / 2), cy: c.px(0.07), r: c.px(0.024) }),
      ].join(""),
  },
  bathtub: {
    w: 0.8,
    h: 1.7,
    draw: (c) =>
      [
        box(c, "sx-fp-furn", 0.08),
        rect({ class: "sx-fp-furn-line", x: c.px(0.09), y: c.px(0.09), width: c.px(c.w - 0.18), height: c.px(c.h - 0.18), rx: c.px(0.22) }),
        circle({ class: "sx-fp-furn-dot", cx: c.px(c.w / 2), cy: c.px(0.26), r: c.px(0.035) }),
      ].join(""),
  },
  shower: {
    w: 0.9,
    h: 0.9,
    draw: (c) =>
      [
        box(c),
        line({ class: "sx-fp-furn-line", x1: 0, y1: 0, x2: c.px(c.w), y2: c.px(c.h) }),
        line({ class: "sx-fp-furn-line", x1: c.px(c.w), y1: 0, x2: 0, y2: c.px(c.h) }),
        circle({ class: "sx-fp-furn", cx: c.px(0.15), cy: c.px(0.15), r: c.px(0.06) }),
      ].join(""),
  },
  washer: { w: 0.6, h: 0.6, draw: applianceDraw("W", true) },
  dryer: { w: 0.6, h: 0.6, draw: applianceDraw("D", true) },
  "wall-cabinet": {
    w: 0.9,
    h: 0.35,
    underlay: true, // above the cut plane — drawn dashed over the base run
    draw: (c) => rect({ class: "sx-fp-furn-dash", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h) }),
  },
  "range-hood": {
    w: 0.8,
    h: 0.55,
    underlay: true, // above the cut plane
    draw: (c) =>
      el("g", {}, [
        polygon({
          class: "sx-fp-furn-dash",
          points: `${c.px(0.08)},0 ${c.px(c.w - 0.08)},0 ${c.px(c.w)},${c.px(c.h)} 0,${c.px(c.h)}`,
        }),
      ]),
  },
  "bar-stool": {
    w: 0.35,
    h: 0.35,
    draw: (c) =>
      circle({ class: "sx-fp-chair", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(Math.min(c.w, c.h) / 2) }),
  },
  vanity: {
    w: 1.5,
    h: 0.55,
    draw: (c) => {
      const parts = [box(c)];
      for (const fx of [0.27, 0.73]) {
        parts.push(
          el("ellipse", {
            class: "sx-fp-furn-line",
            cx: c.px(c.w * fx),
            cy: c.px(c.h / 2 + 0.02),
            rx: c.px(Math.min(0.22, c.w * 0.16)),
            ry: c.px(c.h / 2 - 0.12),
          })
        );
        parts.push(circle({ class: "sx-fp-furn-dot", cx: c.px(c.w * fx), cy: c.px(0.07), r: c.px(0.022) }));
      }
      return parts.join("");
    },
  },
  bidet: {
    w: 0.4,
    h: 0.6,
    draw: (c) =>
      rect({ class: "sx-fp-furn", x: c.px(c.w * 0.15), y: 0, width: c.px(c.w * 0.7), height: c.px(0.12), rx: c.px(0.03) }) +
      el("ellipse", {
        class: "sx-fp-furn",
        cx: c.px(c.w / 2),
        cy: c.px(0.12 + (c.h - 0.16) / 2),
        rx: c.px(c.w / 2 - 0.03),
        ry: c.px((c.h - 0.18) / 2),
      }) +
      circle({ class: "sx-fp-furn-line", cx: c.px(c.w / 2), cy: c.px(c.h * 0.45), r: c.px(0.035) }),
  },
  urinal: {
    w: 0.4,
    h: 0.35,
    draw: (c) =>
      rect({ class: "sx-fp-furn", x: 0, y: 0, width: c.px(c.w), height: c.px(0.08) }) +
      path({
        class: "sx-fp-furn",
        d: `M ${c.px(0.05)} ${c.px(0.08)} L ${c.px(c.w - 0.05)} ${c.px(0.08)} C ${c.px(c.w - 0.05)} ${c.px(c.h * 0.75)} ${c.px(c.w * 0.7)} ${c.px(c.h)} ${c.px(c.w / 2)} ${c.px(c.h)} C ${c.px(c.w * 0.3)} ${c.px(c.h)} ${c.px(0.05)} ${c.px(c.h * 0.75)} ${c.px(0.05)} ${c.px(0.08)} Z`,
      }),
  },

  // ── stairs & vertical circulation ──
  stairs: { w: 1.0, h: 3.0, consumesLabel: true, draw: straightStairs },
  "stairs-l": { w: 2.2, h: 2.2, consumesLabel: true, draw: lStairs },
  "stairs-u": { w: 2.0, h: 3.0, consumesLabel: true, draw: uStairs },
  "spiral-stairs": { w: 1.5, h: 1.5, consumesLabel: true, draw: spiralStairs },
  elevator: {
    w: 1.6,
    h: 1.5,
    draw: (c) =>
      box(c) +
      line({ class: "sx-fp-furn-line", x1: 0, y1: 0, x2: c.px(c.w), y2: c.px(c.h) }) +
      line({ class: "sx-fp-furn-line", x1: c.px(c.w), y1: 0, x2: 0, y2: c.px(c.h) }),
  },

  // ── structural ──
  column: {
    w: 0.4,
    h: 0.4,
    draw: (c) => rect({ class: "sx-fp-furn-solid", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h) }),
  },

  // ── classroom / office ──
  "desk-chair": {
    w: 0.6,
    h: 0.75,
    draw: (c) =>
      [
        rect({ class: "sx-fp-furn", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h * 0.58) }),
        rect({
          class: "sx-fp-chair",
          x: c.px(c.w / 2 - (c.w * 0.3)),
          y: c.px(c.h * 0.66),
          width: c.px(c.w * 0.6),
          height: c.px(c.h * 0.32),
          rx: c.px(0.07),
        }),
      ].join(""),
  },
  desk: {
    w: 1.4,
    h: 0.7,
    envelope: [0, 0, CHAIR_OVERHANG, 0],
    draw: (c) => box(c) + chairAt(c.px, c.w / 2, c.h + CHAIR_GAP, 180),
  },
  chair: {
    w: 0.45,
    h: 0.45,
    draw: (c) =>
      rect({ class: "sx-fp-chair", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h), rx: c.px(0.1) }) +
      line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(0.06), x2: 0, y2: c.px(c.h - 0.06) }),
  },
  whiteboard: { w: 3.0, h: 0.12, draw: boardDraw },
  smartboard: { w: 2.0, h: 0.12, draw: boardDraw },
  bookcase: { w: 0.9, h: 0.3, draw: shelfDraw },
  "desk-l": {
    w: 1.6,
    h: 1.6,
    draw: (c) => {
      const d = 0.7 * Math.min(c.w / 1.6, c.h / 1.6);
      return (
        path({
          class: "sx-fp-furn",
          d: `M 0 0 L ${c.px(c.w)} 0 L ${c.px(c.w)} ${c.px(d)} L ${c.px(d)} ${c.px(d)} L ${c.px(d)} ${c.px(c.h)} L 0 ${c.px(c.h)} Z`,
        }) + chairAt(c.px, d + 0.32, d + 0.32, 315)
      );
    },
  },
  "filing-cabinet": {
    w: 0.5,
    h: 0.6,
    draw: (c) =>
      box(c) +
      line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(c.h / 3), x2: c.px(c.w), y2: c.px(c.h / 3) }) +
      line({ class: "sx-fp-furn-line", x1: 0, y1: c.px((2 * c.h) / 3), x2: c.px(c.w), y2: c.px((2 * c.h) / 3) }),
  },
  lockers: {
    w: 1.8,
    h: 0.45,
    draw: (c) => {
      const parts = [box(c)];
      const n = Math.max(2, Math.round(c.w / 0.3));
      for (let i = 1; i < n; i++) {
        const x = c.px((c.w * i) / n);
        parts.push(line({ class: "sx-fp-furn-line", x1: x, y1: 0, x2: x, y2: c.px(c.h) }));
      }
      for (let i = 0; i < n; i++) {
        parts.push(circle({ class: "sx-fp-furn-dot", cx: c.px(((i + 0.78) / n) * c.w), cy: c.px(c.h / 2), r: c.px(0.02) }));
      }
      return parts.join("");
    },
  },
  cubbies: {
    w: 2.0,
    h: 0.4,
    draw: (c) => {
      const parts = [box(c)];
      const n = Math.max(2, Math.round(c.w / 0.3));
      for (let i = 1; i < n; i++) {
        const x = c.px((c.w * i) / n);
        parts.push(line({ class: "sx-fp-furn-line", x1: x, y1: 0, x2: x, y2: c.px(c.h) }));
      }
      return parts.join("");
    },
  },
  "kidney-table": {
    w: 1.8,
    h: 1.2,
    draw: (c) => {
      const sx = c.w / 1.8;
      const sy = c.h / 1.2;
      const X = (v: number) => c.px(v * sx);
      const Y = (v: number) => c.px(v * sy);
      const d = [
        `M ${X(0)} ${Y(0.55)}`,
        `C ${X(0)} ${Y(0.15)} ${X(0.35)} ${Y(0)} ${X(0.9)} ${Y(0)}`,
        `C ${X(1.45)} ${Y(0)} ${X(1.8)} ${Y(0.15)} ${X(1.8)} ${Y(0.55)}`,
        `C ${X(1.8)} ${Y(0.95)} ${X(1.5)} ${Y(1.2)} ${X(1.18)} ${Y(1.2)}`,
        `Q ${X(0.9)} ${Y(0.82)} ${X(0.62)} ${Y(1.2)}`,
        `C ${X(0.3)} ${Y(1.2)} ${X(0)} ${Y(0.95)} ${X(0)} ${Y(0.55)}`,
        "Z",
      ].join(" ");
      return path({ class: "sx-fp-furn", d });
    },
  },
  "round-table-4": roundTable(4, 1.52),
  "round-table-6": roundTable(6, 1.52),
  "round-table-8": roundTable(8, 1.52),
  "round-table-10": roundTable(10, 1.83),
  "conference-table": { w: 2.4, h: 1.2, envelope: [CHAIR_OVERHANG, 0, CHAIR_OVERHANG, 0], draw: tableDraw(true, true) },

  // ── event / banquet ──
  "banquet-table": { w: 2.44, h: 0.76, envelope: [CHAIR_OVERHANG, 0, CHAIR_OVERHANG, 0], draw: tableDraw(true, true) },
  "head-table": { w: 3.7, h: 0.76, envelope: [0, 0, CHAIR_OVERHANG, 0], draw: tableDraw(false, true) },
  stage: {
    w: 4.0,
    h: 2.0,
    draw: (c) =>
      box(c) +
      rect({
        class: "sx-fp-furn-dash",
        x: c.px(0.1),
        y: c.px(0.1),
        width: c.px(c.w - 0.2),
        height: c.px(c.h - 0.2),
      }),
  },
  "dance-floor": {
    w: 4.0,
    h: 4.0,
    underlay: true,
    draw: (c) => {
      const parts: string[] = [];
      for (let d = 0.5; d < c.w + c.h; d += 0.5) {
        const x1 = Math.max(0, d - c.h);
        const y1 = Math.min(d, c.h);
        const x2 = Math.min(d, c.w);
        const y2 = Math.max(0, d - c.w);
        parts.push(line({ class: "sx-fp-hatch", x1: c.px(x1), y1: c.px(y1), x2: c.px(x2), y2: c.px(y2) }));
      }
      parts.push(rect({ class: "sx-fp-furn-nofill", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h) }));
      return parts.join("");
    },
  },
  bar: {
    w: 3.0,
    h: 0.7,
    draw: (c) =>
      box(c) + line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(c.h - 0.15), x2: c.px(c.w), y2: c.px(c.h - 0.15) }),
  },
  "dj-booth": { w: 1.2, h: 0.8, draw: (c) => box(c) + glyphText(c, "DJ") },
  "cocktail-table": {
    w: 0.76,
    h: 0.76,
    draw: (c) =>
      circle({ class: "sx-fp-furn", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(Math.min(c.w, c.h) / 2) }) +
      circle({ class: "sx-fp-furn-line", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(Math.min(c.w, c.h) / 6) }),
  },
  podium: {
    w: 0.6,
    h: 0.5,
    draw: (c) =>
      polygon({
        class: "sx-fp-furn",
        points: `${c.px(c.w * 0.15)},0 ${c.px(c.w * 0.85)},0 ${c.px(c.w)},${c.px(c.h)} 0,${c.px(c.h)}`,
      }),
  },
  "row-chairs": {
    w: 2.2,
    h: 0.5,
    draw: (c) => {
      const n = Math.max(1, Math.floor(c.w / 0.55 + 1e-6));
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        parts.push(chairAt(c.px, ((i + 0.5) / n) * c.w, c.h / 2, 0));
      }
      return parts.join("");
    },
  },

  // ── retail ──
  // Gondola run: a long fixture with a back-to-back spine and product bays.
  shelving: {
    w: 1.8,
    h: 0.6,
    draw: (c) => {
      const parts = [box(c)];
      parts.push(line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(c.h / 2), x2: c.px(c.w), y2: c.px(c.h / 2) }));
      const n = Math.max(2, Math.round(c.w / 0.45));
      for (let i = 1; i < n; i++) {
        const x = c.px((c.w * i) / n);
        parts.push(line({ class: "sx-fp-furn-line", x1: x, y1: 0, x2: x, y2: c.px(c.h) }));
      }
      return parts.join("");
    },
  },
  // POS counter with a register block and a belt line.
  checkout: {
    w: 1.6,
    h: 0.7,
    draw: (c) =>
      [
        box(c),
        rect({ class: "sx-fp-furn-solid", x: c.px(c.w - 0.5), y: c.px(0.12), width: c.px(0.34), height: c.px(0.3), rx: c.px(0.04) }),
        line({ class: "sx-fp-furn-line", x1: c.px(0.12), y1: c.px(c.h * 0.6), x2: c.px(c.w - 0.62), y2: c.px(c.h * 0.6) }),
      ].join(""),
  },
  // Round garment rack: rail circle with radial hanger ticks.
  "clothing-rack": {
    w: 1.0,
    h: 1.0,
    draw: (c) => {
      const r = Math.min(c.w, c.h) / 2;
      const cx = c.w / 2;
      const cy = c.h / 2;
      const parts = [
        circle({ class: "sx-fp-furn-nofill", cx: c.px(cx), cy: c.px(cy), r: c.px(r) }),
        circle({ class: "sx-fp-furn-dot", cx: c.px(cx), cy: c.px(cy), r: c.px(0.04) }),
      ];
      for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
        const rad = (a * Math.PI) / 180;
        parts.push(
          line({
            class: "sx-fp-furn-line",
            x1: c.px(cx + (r - 0.09) * Math.cos(rad)),
            y1: c.px(cy + (r - 0.09) * Math.sin(rad)),
            x2: c.px(cx + r * Math.cos(rad)),
            y2: c.px(cy + r * Math.sin(rad)),
          })
        );
      }
      return parts.join("");
    },
  },
  // Changing booth: bench at the back, a mirror strip, a dashed curtain at the opening.
  "fitting-room": {
    w: 1.1,
    h: 1.1,
    draw: (c) =>
      [
        rect({ class: "sx-fp-furn-nofill", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h) }),
        rect({ class: "sx-fp-furn", x: c.px(0.12), y: c.px(0.12), width: c.px(c.w - 0.24), height: c.px(0.28), rx: c.px(0.04) }),
        line({ class: "sx-fp-furn-dash", x1: 0, y1: c.px(c.h), x2: c.px(c.w), y2: c.px(c.h) }),
        rect({ class: "sx-fp-furn-solid", x: c.px(c.w - 0.06), y: c.px(c.h * 0.5), width: c.px(0.04), height: c.px(c.h * 0.35) }),
      ].join(""),
  },

  // ── warehouse / industrial ──
  // Pallet racking: an open frame with bay dividers and cross-bracing.
  "pallet-rack": {
    w: 2.7,
    h: 1.1,
    draw: (c) => {
      const parts = [rect({ class: "sx-fp-furn-nofill", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h) })];
      const bays = Math.max(2, Math.round(c.w / 1.35));
      for (let i = 0; i < bays; i++) {
        const x0 = (c.w * i) / bays;
        const x1 = (c.w * (i + 1)) / bays;
        if (i > 0) parts.push(line({ class: "sx-fp-furn-line", x1: c.px(x0), y1: 0, x2: c.px(x0), y2: c.px(c.h) }));
        parts.push(line({ class: "sx-fp-furn-line", x1: c.px(x0), y1: 0, x2: c.px(x1), y2: c.px(c.h) }));
        parts.push(line({ class: "sx-fp-furn-line", x1: c.px(x1), y1: 0, x2: c.px(x0), y2: c.px(c.h) }));
      }
      return parts.join("");
    },
  },
  // Dock door: roll-up door segments with two bumpers at the outer face.
  "loading-dock": {
    w: 3.0,
    h: 0.6,
    draw: (c) => {
      const parts = [box(c)];
      const n = Math.max(3, Math.round(c.w / 0.5));
      for (let i = 1; i < n; i++) {
        const x = c.px((c.w * i) / n);
        parts.push(line({ class: "sx-fp-furn-line", x1: x, y1: 0, x2: x, y2: c.px(c.h) }));
      }
      parts.push(rect({ class: "sx-fp-furn-solid", x: c.px(0.12), y: c.px(c.h - 0.12), width: c.px(0.3), height: c.px(0.1) }));
      parts.push(rect({ class: "sx-fp-furn-solid", x: c.px(c.w - 0.42), y: c.px(c.h - 0.12), width: c.px(0.3), height: c.px(0.1) }));
      return parts.join("");
    },
  },
  // Counterbalance forklift silhouette: body, mast forks at the front, operator seat.
  forklift: {
    w: 1.2,
    h: 2.2,
    draw: (c) =>
      [
        rect({ class: "sx-fp-furn", x: c.px(0.15), y: c.px(0.42), width: c.px(c.w - 0.3), height: c.px(c.h - 0.72), rx: c.px(0.06) }),
        rect({ class: "sx-fp-furn-solid", x: c.px(0.25), y: 0, width: c.px(0.12), height: c.px(0.42) }),
        rect({ class: "sx-fp-furn-solid", x: c.px(c.w - 0.37), y: 0, width: c.px(0.12), height: c.px(0.42) }),
        circle({ class: "sx-fp-furn-line", cx: c.px(c.w / 2), cy: c.px(c.h - 0.62), r: c.px(0.18) }),
      ].join(""),
  },

  // ── salon / spa ──
  // Styling station: back counter with a mirror strip and a chair facing it.
  "salon-chair": {
    w: 0.8,
    h: 1.4,
    draw: (c) =>
      [
        rect({ class: "sx-fp-furn", x: 0, y: 0, width: c.px(c.w), height: c.px(0.32), rx: c.px(0.03) }),
        rect({ class: "sx-fp-furn-solid", x: c.px(0.08), y: c.px(0.05), width: c.px(c.w - 0.16), height: c.px(0.05) }),
        circle({ class: "sx-fp-furn", cx: c.px(c.w / 2), cy: c.px(c.h * 0.64), r: c.px(Math.min(c.w, 0.62) / 2) }),
        circle({ class: "sx-fp-furn-line", cx: c.px(c.w / 2), cy: c.px(c.h * 0.64), r: c.px(0.08) }),
      ].join(""),
  },
  // Backwash unit: a reclining chair with a wash basin at the head end.
  "shampoo-bowl": {
    w: 0.9,
    h: 1.5,
    draw: (c) =>
      [
        rect({ class: "sx-fp-furn", x: c.px(0.1), y: c.px(0.5), width: c.px(c.w - 0.2), height: c.px(c.h - 0.6), rx: c.px(0.08) }),
        circle({ class: "sx-fp-furn", cx: c.px(c.w / 2), cy: c.px(0.4), r: c.px(0.32) }),
        circle({ class: "sx-fp-furn-line", cx: c.px(c.w / 2), cy: c.px(0.4), r: c.px(0.12) }),
        circle({ class: "sx-fp-furn-dot", cx: c.px(c.w / 2), cy: c.px(0.12), r: c.px(0.04) }),
      ].join(""),
  },
  // Manicure table: a small table with a client and a technician chair.
  "manicure-table": {
    w: 1.0,
    h: 0.5,
    envelope: [CHAIR_GAP + CHAIR_D, 0, CHAIR_GAP + CHAIR_D, 0],
    draw: (c) => [box(c), chairAt(c.px, c.w / 2, -CHAIR_GAP, 0), chairAt(c.px, c.w / 2, c.h + CHAIR_GAP, 180)].join(""),
  },

  // ── gym / fitness ──
  // Treadmill: a deck with a running belt and a console at the front.
  treadmill: {
    w: 0.9,
    h: 2.0,
    draw: (c) =>
      [
        box(c, "sx-fp-furn", 0.05),
        rect({ class: "sx-fp-furn-line", x: c.px(0.12), y: c.px(0.5), width: c.px(c.w - 0.24), height: c.px(c.h - 0.65), rx: c.px(0.04) }),
        rect({ class: "sx-fp-furn-solid", x: c.px(0.1), y: c.px(0.08), width: c.px(c.w - 0.2), height: c.px(0.16), rx: c.px(0.03) }),
      ].join(""),
  },
  // Flat bench with upright posts and a loaded barbell crossing it.
  "weight-bench": {
    w: 0.6,
    h: 1.8,
    envelope: [0, 0.35, 0, 0.35],
    draw: (c) =>
      [
        rect({ class: "sx-fp-furn", x: c.px(c.w / 2 - 0.12), y: c.px(0.3), width: c.px(0.24), height: c.px(c.h - 0.4), rx: c.px(0.05) }),
        rect({ class: "sx-fp-furn-solid", x: c.px(0.06), y: c.px(0.18), width: c.px(0.1), height: c.px(0.1) }),
        rect({ class: "sx-fp-furn-solid", x: c.px(c.w - 0.16), y: c.px(0.18), width: c.px(0.1), height: c.px(0.1) }),
        line({ class: "sx-fp-furn-line", x1: c.px(-0.3), y1: c.px(0.23), x2: c.px(c.w + 0.3), y2: c.px(0.23) }),
      ].join(""),
  },
  // Power rack: a square frame with four corner posts and a barbell.
  "power-rack": {
    w: 1.4,
    h: 1.4,
    envelope: [0, 0.3, 0, 0.3],
    draw: (c) => {
      const post = 0.14;
      const corners: Array<[number, number]> = [
        [0, 0],
        [c.w - post, 0],
        [0, c.h - post],
        [c.w - post, c.h - post],
      ];
      const parts = [rect({ class: "sx-fp-furn-nofill", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h) })];
      for (const [px0, py0] of corners) {
        parts.push(rect({ class: "sx-fp-furn-solid", x: c.px(px0), y: c.px(py0), width: c.px(post), height: c.px(post) }));
      }
      parts.push(line({ class: "sx-fp-furn-line", x1: c.px(-0.28), y1: c.px(c.h * 0.4), x2: c.px(c.w + 0.28), y2: c.px(c.h * 0.4) }));
      return parts.join("");
    },
  },
  // Exercise mat — an underlay surface, like a rug.
  "yoga-mat": {
    w: 0.6,
    h: 1.8,
    underlay: true,
    draw: (c) => rect({ class: "sx-fp-furn-dash", x: 0, y: 0, width: c.px(c.w), height: c.px(c.h), rx: c.px(0.08) }),
  },

  // ── restaurant / commercial kitchen ──
  // Restaurant booth: two facing benches (chair fill) with a table between.
  // Default seats 4 (two per bench); benches are not auto-named seats.
  booth: {
    w: 1.4,
    h: 1.6,
    envelope: [0, 0, 0, 0],
    draw: (c) => {
      const benchH = Math.min(0.45, c.h * 0.28);
      const inset = c.w * 0.12;
      return [
        rect({ class: "sx-fp-chair", x: 0, y: 0, width: c.px(c.w), height: c.px(benchH), rx: c.px(0.06) }),
        rect({ class: "sx-fp-chair", x: 0, y: c.px(c.h - benchH), width: c.px(c.w), height: c.px(benchH), rx: c.px(0.06) }),
        rect({
          class: "sx-fp-furn",
          x: c.px(inset),
          y: c.px(benchH + 0.06),
          width: c.px(c.w - 2 * inset),
          height: c.px(Math.max(0.1, c.h - 2 * benchH - 0.12)),
          rx: c.px(0.04),
        }),
      ].join("");
    },
  },
  // Stainless prep / work table: solid top with a dashed under-shelf outline.
  "prep-table": {
    w: 1.5,
    h: 0.75,
    draw: (c) =>
      box(c) +
      rect({
        class: "sx-fp-furn-dash",
        x: c.px(0.08),
        y: c.px(0.08),
        width: c.px(Math.max(0.1, c.w - 0.16)),
        height: c.px(Math.max(0.1, c.h - 0.16)),
      }),
  },
  // Commercial range: 6 burners (2 rows × 3 cols) over an oven (front line).
  range: {
    w: 0.9,
    h: 0.85,
    draw: (c) => {
      const parts = [box(c)];
      const r = Math.min(c.w / 6, c.h / 8);
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const cx = ((col + 0.5) / 3) * c.w;
          const cy = ((row + 0.5) / 4) * c.h;
          parts.push(circle({ class: "sx-fp-furn-line", cx: c.px(cx), cy: c.px(cy), r: c.px(r) }));
        }
      }
      parts.push(line({ class: "sx-fp-furn-line", x1: 0, y1: c.px(c.h * 0.62), x2: c.px(c.w), y2: c.px(c.h * 0.62) }));
      return parts.join("");
    },
  },
  // Walk-in cooler/freezer: insulated double-wall box with a door gap + label.
  "walk-in": {
    w: 2.4,
    h: 2.0,
    draw: (c) => {
      const t = Math.min(0.12, c.w * 0.06);
      const doorW = Math.min(0.9, c.w * 0.4);
      const parts = [
        box(c),
        rect({
          class: "sx-fp-furn-line",
          x: c.px(t),
          y: c.px(t),
          width: c.px(Math.max(0.1, c.w - 2 * t)),
          height: c.px(Math.max(0.1, c.h - 2 * t)),
        }),
        // door gap on the bottom wall + a hinged leaf
        rect({ class: "sx-fp-furn-solid", x: c.px((c.w - doorW) / 2), y: c.px(c.h - t), width: c.px(doorW), height: c.px(t) }),
        line({
          class: "sx-fp-door-leaf",
          x1: c.px((c.w - doorW) / 2),
          y1: c.px(c.h),
          x2: c.px((c.w - doorW) / 2),
          y2: c.px(c.h + doorW * 0.6),
        }),
        glyphText(c, "WALK-IN"),
      ];
      return parts.join("");
    },
  },
  // Three-compartment commercial sink: three basins + a faucet dot per basin.
  "commercial-sink": {
    w: 1.8,
    h: 0.6,
    draw: (c) => {
      const parts = [box(c)];
      const gap = c.w * 0.04;
      const bw = (c.w - 4 * gap) / 3;
      for (let i = 0; i < 3; i++) {
        const bx = gap + i * (bw + gap);
        parts.push(rect({ class: "sx-fp-furn-line", x: c.px(bx), y: c.px(c.h * 0.18), width: c.px(bw), height: c.px(c.h * 0.64), rx: c.px(0.03) }));
        parts.push(circle({ class: "sx-fp-furn-dot", cx: c.px(bx + bw / 2), cy: c.px(c.h * 0.12), r: c.px(0.04) }));
      }
      return parts.join("");
    },
  },
  // Deep fryer: two fry vats with handles.
  fryer: {
    w: 0.4,
    h: 0.8,
    draw: (c) => {
      const parts = [box(c)];
      for (const cy of [c.h * 0.28, c.h * 0.72]) {
        parts.push(rect({ class: "sx-fp-furn-line", x: c.px(c.w * 0.18), y: c.px(cy - c.h * 0.16), width: c.px(c.w * 0.64), height: c.px(c.h * 0.32), rx: c.px(0.02) }));
      }
      return parts.join("");
    },
  },

  // ── electrical overlay fixtures ──
  outlet: { w: 0.22, h: 0.22, underlay: true, draw: outletDraw(false) },
  "duplex-outlet": { w: 0.24, h: 0.36, underlay: true, draw: outletDraw(true) },
  switch: { w: 0.24, h: 0.3, underlay: true, draw: electricalSwitchDraw },
  light: { w: 0.35, h: 0.35, underlay: true, draw: lightDraw("L") },
  "ceiling-light": { w: 0.45, h: 0.45, underlay: true, draw: lightDraw("CL") },
  "data-outlet": { w: 0.28, h: 0.24, underlay: true, draw: panelDraw("D") },
  "electrical-panel": { w: 0.55, h: 0.24, underlay: true, draw: panelDraw("PANEL") },
  "distribution-board": { w: 0.6, h: 0.28, underlay: true, draw: panelDraw("DB") },

  // ── site / outdoor ──
  // Tree in plan: a canopy disc with a foliage ring and a trunk dot.
  tree: {
    w: 2.0,
    h: 2.0,
    draw: (c) => {
      const r = Math.min(c.w, c.h) / 2;
      return [
        circle({ class: "sx-fp-furn", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(r) }),
        circle({ class: "sx-fp-furn-line", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(r * 0.6) }),
        circle({ class: "sx-fp-furn-dot", cx: c.px(c.w / 2), cy: c.px(c.h / 2), r: c.px(0.07) }),
      ].join("");
    },
  },
  // Car in plan (parking-stall footprint): body, glazing lines, four wheels.
  car: {
    w: 1.8,
    h: 4.4,
    draw: (c) => {
      const parts = [rect({ class: "sx-fp-furn", x: c.px(0.12), y: c.px(0.1), width: c.px(c.w - 0.24), height: c.px(c.h - 0.2), rx: c.px(0.35) })];
      parts.push(line({ class: "sx-fp-furn-line", x1: c.px(0.3), y1: c.px(c.h * 0.26), x2: c.px(c.w - 0.3), y2: c.px(c.h * 0.26) }));
      parts.push(line({ class: "sx-fp-furn-line", x1: c.px(0.3), y1: c.px(c.h * 0.72), x2: c.px(c.w - 0.3), y2: c.px(c.h * 0.72) }));
      for (const wy of [c.h * 0.3, c.h * 0.7]) {
        parts.push(rect({ class: "sx-fp-furn-solid", x: 0, y: c.px(wy - 0.18), width: c.px(0.14), height: c.px(0.36), rx: c.px(0.03) }));
        parts.push(rect({ class: "sx-fp-furn-solid", x: c.px(c.w - 0.14), y: c.px(wy - 0.18), width: c.px(0.14), height: c.px(0.36), rx: c.px(0.03) }));
      }
      return parts.join("");
    },
  },
};

export const FURNITURE_TYPES = Object.keys(FLOORPLAN_SYMBOLS) as readonly FurnitureType[];
