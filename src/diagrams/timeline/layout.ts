import type {
  TimelineAST,
  TimelineCardLayout,
  TimelineEra,
  TimelineEraLayout,
  TimelineEvent,
  TimelineEventLayout,
  TimelineLaneLayout,
  TimelineLayoutResult,
  TimelineLegendItem,
  TimelinePinLayout,
  TimelineSide,
  TimelineTick,
  TimelineTrack,
} from "./types";
import { formatYear } from "./dates";

const CANVAS_WIDTH = 960;
const PAD_LEFT_WITH_TRACKS = 140;
const PAD_LEFT_NO_TRACKS = 40;
const PAD_RIGHT = 40;
const PAD_TOP_BASE = 40;
const ERA_BAND_HEIGHT = 16;
const AXIS_HEIGHT = 40;
const LANE_HEIGHT_RANGE = 36;
const LANE_HEIGHT_POINT = 28;
const LANE_GAP = 8;

// Palette used when a renderer-level theme palette isn't threaded through.
// Kept in sync with BaseTheme.palette defaults so auto-pack colors look the
// same in the swimlane baseline before theme tokens are applied.
const DEFAULT_CATEGORY_PALETTE = [
  "#2563eb", "#059669", "#d97706", "#7c3aed",
  "#dc2626", "#0891b2", "#db2777", "#475569",
];

export function layoutTimeline(ast: TimelineAST): TimelineLayoutResult {
  switch (ast.style) {
    case "gantt":    return layoutGantt(ast);
    case "lollipop": return layoutLollipop(ast);
    case "swimlane":
    default:         return layoutSwimlane(ast);
  }
}

// ─── Shared helpers ──────────────────────────────────────

function timeExtent(ast: TimelineAST): { min: number; max: number; span: number } {
  const starts = [
    ...ast.events.map(e => e.start.value),
    ...ast.eras.map(e => e.start.value),
  ];
  const ends = [
    ...ast.events.map(e => e.end?.value ?? e.start.value),
    ...ast.eras.map(e => e.end.value),
  ];
  if (!starts.length) return { min: 0, max: 1, span: 1 };
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = max - min || 1;
  return { min, max, span };
}

function buildScale(
  mode: TimelineAST["scale"],
  events: TimelineEvent[],
  tMin: number,
  tMax: number,
  plotX: number,
  plotW: number,
): (v: number) => number {
  if (mode === "equidistant") {
    const sorted = events.slice().sort((a, b) => a.start.value - b.start.value);
    const n = sorted.length || 1;
    const indexByValue = new Map<number, number>();
    sorted.forEach((e, i) => indexByValue.set(e.start.value, i));
    return (v: number) => {
      const idx = indexByValue.get(v);
      if (idx !== undefined) {
        return plotX + (n === 1 ? plotW / 2 : (idx / (n - 1)) * plotW);
      }
      return plotX + ((v - tMin) / (tMax - tMin)) * plotW;
    };
  }
  if (mode === "log") {
    const now = Math.max(tMax, 0);
    const toAgo = (v: number) => Math.max(1, now - v + 1);
    const minAgo = toAgo(tMax);
    const maxAgo = toAgo(tMin);
    const logMin = Math.log10(minAgo);
    const logMax = Math.log10(maxAgo);
    const range = logMax - logMin || 1;
    return (v: number) => {
      const frac = (logMax - Math.log10(toAgo(v))) / range;
      return plotX + frac * plotW;
    };
  }
  const span = tMax - tMin || 1;
  return (v: number) => plotX + ((v - tMin) / span) * plotW;
}

function packEraRows(eras: TimelineEra[]): { rows: number; rowOf: number[] } {
  if (!eras.length) return { rows: 0, rowOf: [] };
  const rowsEnd: number[] = [];
  const rowOf: number[] = [];
  for (const e of eras) {
    let placed = -1;
    for (let i = 0; i < rowsEnd.length; i++) {
      if (rowsEnd[i]! <= e.start.value) { placed = i; break; }
    }
    if (placed < 0) {
      rowsEnd.push(e.end.value);
      placed = rowsEnd.length - 1;
    } else {
      rowsEnd[placed] = e.end.value;
    }
    rowOf.push(placed);
  }
  return { rows: rowsEnd.length, rowOf };
}

function generateTicks(
  tMin: number,
  tMax: number,
  span: number,
  xScale: (v: number) => number,
  mode: TimelineAST["scale"],
): TimelineTick[] {
  const ticks: TimelineTick[] = [];

  if (mode === "log") {
    const now = Math.max(tMax, 0);
    const minAgo = Math.max(1, now - tMax + 1);
    const maxAgo = Math.max(1, now - tMin + 1);
    const logMin = Math.floor(Math.log10(minAgo));
    const logMax = Math.ceil(Math.log10(maxAgo));
    for (let p = logMin; p <= logMax; p++) {
      const ago = Math.pow(10, p);
      const v = now - ago;
      if (v < tMin || v > tMax) continue;
      const label = ago >= 1e6 ? `${ago / 1e6} Ma` : ago >= 1e3 ? `${ago / 1e3} ka` : `${ago} yr`;
      ticks.push({ value: v, x: xScale(v), label, major: true });
    }
    return ticks;
  }

  const step = niceStep(span);
  const start = Math.ceil(tMin / step) * step;
  for (let v = start; v <= tMax; v += step) {
    ticks.push({ value: v, x: xScale(v), label: formatYear(v, span), major: true });
  }
  return ticks;
}

function niceStep(span: number): number {
  const candidates = [
    0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 25, 50,
    100, 200, 500, 1000, 2000, 5000, 10000, 50000, 100000, 500000, 1e6,
  ];
  for (const c of candidates) {
    if (span / c <= 10) return c;
  }
  return Math.pow(10, Math.ceil(Math.log10(span / 10)));
}

function estimateLabelWidth(label: string, icon?: string): number {
  const iconW = icon ? 14 : 0;
  return 6.5 * label.length + iconW + 4;
}

// ─── Swimlane (default, baseline) ────────────────────────

function layoutSwimlane(ast: TimelineAST): TimelineLayoutResult {
  const events = ast.events.slice().sort((a, b) => a.start.value - b.start.value);
  const allTracks = resolveTracks(ast, events);
  assignAutoTracks(events, allTracks);

  const { min: startVal, max: endVal, span } = timeExtent(ast);
  const paddedStart = startVal - span * 0.02;
  const paddedEnd = endVal + span * 0.02;

  const hasNamedTracks = ast.tracks.length > 0;
  const plotX = hasNamedTracks ? PAD_LEFT_WITH_TRACKS : PAD_LEFT_NO_TRACKS;
  const plotRight = CANVAS_WIDTH - PAD_RIGHT;
  const plotW = plotRight - plotX;

  const xScale = buildScale(ast.scale, events, paddedStart, paddedEnd, plotX, plotW);

  const eraRows = packEraRows(ast.eras);
  const eraBandTotal = eraRows.rows * (ERA_BAND_HEIGHT + 2);

  const titleOffset = ast.title ? 28 : 0;
  const plotY = PAD_TOP_BASE + titleOffset + eraBandTotal;

  const lanes: TimelineLaneLayout[] = [];
  let cursorY = plotY + 8;
  for (const t of allTracks) {
    const hasRange = events.some(e => e.trackId === t.id && e.kind === "range");
    const h = hasRange ? LANE_HEIGHT_RANGE : LANE_HEIGHT_POINT;
    lanes.push({ trackId: t.id, label: t.label, y: cursorY, height: h });
    cursorY += h + LANE_GAP;
  }
  const plotH = cursorY - plotY;
  const axisY = cursorY + 4;
  const height = axisY + AXIS_HEIGHT + 20;

  const eraLayouts: TimelineEraLayout[] = ast.eras.map((e, idx) => ({
    era: e,
    x: xScale(e.start.value),
    width: Math.max(2, xScale(e.end.value) - xScale(e.start.value)),
    bandRow: eraRows.rowOf[idx]!,
  }));

  const laneByTrack = new Map(lanes.map(l => [l.trackId, l]));
  const eventLayouts: TimelineEventLayout[] = [];
  const labelBoxes: Array<{ x1: number; x2: number; y: number }> = [];
  for (const ev of events) {
    const lane = laneByTrack.get(ev.trackId!)!;
    if (!lane) continue;
    if (ev.kind === "range") {
      const x = xScale(ev.start.value);
      const xe = xScale(ev.end!.value);
      const w = Math.max(4, xe - x);
      eventLayouts.push({
        event: ev,
        x,
        w,
        y: lane.y + 6,
        h: lane.height - 12,
        labelX: x + w / 2,
        labelY: lane.y + lane.height / 2 + 4,
        labelAnchor: "middle",
      });
    } else {
      const x = xScale(ev.start.value);
      const cy = lane.y + lane.height / 2;
      const labelW = estimateLabelWidth(ev.label, ev.icon);
      // Bidirectional cascade: try above first, then below, growing outward.
      // This roughly doubles the usable label slots compared to above-only.
      const candidates = [
        cy - 14, cy + 18, cy - 28, cy + 32,
        cy - 42, cy + 46, cy - 56, cy + 60,
      ];
      let labelY = candidates[0]!;
      for (const y of candidates) {
        const box = { x1: x - labelW / 2, x2: x + labelW / 2, y };
        const collide = labelBoxes.some(b => Math.abs(b.y - box.y) < 13 && b.x1 < box.x2 && b.x2 > box.x1);
        if (!collide) { labelY = y; labelBoxes.push(box); break; }
      }
      eventLayouts.push({
        event: ev,
        x,
        y: cy,
        h: LANE_HEIGHT_POINT,
        labelX: x,
        labelY,
        labelAnchor: "middle",
        noteX: ev.note ? x + 12 : undefined,
        noteY: ev.note ? cy + 16 : undefined,
      });
    }
  }

  return {
    width: CANVAS_WIDTH,
    height,
    style: "swimlane",
    plotX,
    plotY,
    plotW,
    plotH,
    lanes,
    events: eventLayouts,
    eras: eraLayouts,
    ticks: generateTicks(paddedStart, paddedEnd, span, xScale, ast.scale)
      .filter(t => t.x >= plotX - 2 && t.x <= plotX + plotW + 2),
    axisY,
    title: ast.title,
  };
}

function resolveTracks(ast: TimelineAST, events: TimelineEvent[]): TimelineTrack[] {
  const namedIds = new Set(ast.tracks.map(t => t.id));
  const tracks: TimelineTrack[] = ast.tracks.slice();
  for (const ev of events) {
    if (ev.trackId && !namedIds.has(ev.trackId)) {
      ev.trackId = undefined;
    }
  }
  return tracks;
}

function assignAutoTracks(events: TimelineEvent[], tracks: TimelineTrack[]): void {
  const unassigned = events.filter(e => !e.trackId);
  if (unassigned.length === 0) return;

  const pointsOnly = unassigned.every(e => e.kind !== "range");

  if (pointsOnly) {
    let lane = tracks.find(t => t.id === "__auto_points__");
    if (!lane) {
      lane = { id: "__auto_points__", label: "" };
      tracks.push(lane);
    }
    for (const ev of unassigned) ev.trackId = lane.id;
    return;
  }

  const packed: Array<{ id: string; endX: number }> = [];
  const pointLane: TimelineTrack = { id: "__auto_points__", label: "" };
  const pointEvents: TimelineEvent[] = [];

  for (const ev of unassigned) {
    if (ev.kind !== "range") {
      pointEvents.push(ev);
      continue;
    }
    let placed = false;
    for (const lane of packed) {
      if (ev.start.value >= lane.endX) {
        ev.trackId = lane.id;
        lane.endX = ev.end!.value;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const id = `__auto_${packed.length}__`;
      tracks.push({ id, label: "" });
      packed.push({ id, endX: ev.end!.value });
      ev.trackId = id;
    }
  }
  if (pointEvents.length) {
    tracks.push(pointLane);
    for (const ev of pointEvents) ev.trackId = pointLane.id;
  }
}

// ─── Gantt (project-plan) ────────────────────────────────

const GANTT_PIN_ZONE = 70;
const GANTT_LANE_H = 30;
const GANTT_LEGEND_W = 140;

function layoutGantt(ast: TimelineAST): TimelineLayoutResult {
  const events = ast.events.slice().sort((a, b) => a.start.value - b.start.value);
  const { min: startVal, max: endVal, span } = timeExtent(ast);
  const padSpan = span * 0.03;
  const paddedStart = startVal - padSpan;
  const paddedEnd = endVal + padSpan;

  // Derive categories from events that have `category`, then named tracks, then auto.
  const categories: string[] = [];
  const catSeen = new Set<string>();
  for (const ev of events) {
    const c = ev.category ?? (ev.kind === "range" ? ast.tracks.find(t => t.id === ev.trackId)?.label : undefined);
    if (c && !catSeen.has(c)) { catSeen.add(c); categories.push(c); }
  }
  // Fallback: if no categories but there are range events, put them under "Tasks".
  if (!categories.length && events.some(e => e.kind === "range")) {
    categories.push("Tasks");
  }

  const hasLegend = categories.length > 0;
  const plotX = hasLegend ? PAD_LEFT_WITH_TRACKS - 20 : PAD_LEFT_NO_TRACKS;
  const plotRight = CANVAS_WIDTH - (hasLegend ? GANTT_LEGEND_W + 20 : PAD_RIGHT);
  const plotW = plotRight - plotX;

  const xScale = buildScale(ast.scale, events, paddedStart, paddedEnd, plotX, plotW);

  const eraRows = packEraRows(ast.eras);
  const eraBandTotal = eraRows.rows * (ERA_BAND_HEIGHT + 2);

  const titleOffset = ast.title ? 28 : 0;
  const pinZoneTop = PAD_TOP_BASE + titleOffset + eraBandTotal;
  const pinZoneBottom = pinZoneTop + GANTT_PIN_ZONE;
  const axisY = pinZoneBottom;

  const lanes: TimelineLaneLayout[] = categories.map((c, i) => ({
    trackId: `__cat_${i}__`,
    label: c,
    y: axisY + 14 + i * GANTT_LANE_H,
    height: GANTT_LANE_H - 8,
  }));

  const plotY = pinZoneTop;
  const plotH = (lanes.length ? (lanes[lanes.length - 1]!.y + lanes[lanes.length - 1]!.height - plotY) : GANTT_PIN_ZONE);
  const height = (lanes.length ? lanes[lanes.length - 1]!.y + lanes[lanes.length - 1]!.height + 40 : axisY + 60);

  const palette = DEFAULT_CATEGORY_PALETTE;
  const colorFor = (cat: string | undefined): string => {
    if (!cat) return palette[0]!;
    const idx = categories.indexOf(cat);
    return palette[(idx < 0 ? 0 : idx) % palette.length]!;
  };

  const laneByCat = new Map(lanes.map(l => [l.label, l]));

  // Events: split into pins (point/milestone above axis) and bars (range in lane).
  const pins: TimelinePinLayout[] = [];
  const eventLayouts: TimelineEventLayout[] = [];

  // Cascade pin label rows to minimize overlap
  const pinBoxes: Array<{ x1: number; x2: number; y: number }> = [];
  for (const ev of events) {
    if (ev.kind === "range") {
      const cat = ev.category ?? "Tasks";
      const lane = laneByCat.get(cat) ?? lanes[0];
      if (!lane) continue;
      const x = xScale(ev.start.value);
      const xe = xScale(ev.end!.value);
      const w = Math.max(4, xe - x);
      eventLayouts.push({
        event: ev,
        x,
        w,
        y: lane.y + 4,
        h: lane.height - 8,
        labelX: x + w / 2,
        labelY: lane.y + lane.height / 2 + 4,
        labelAnchor: "middle",
      });
      continue;
    }
    // Pin
    const x = xScale(ev.start.value);
    const labelW = estimateLabelWidth(ev.label, ev.icon);
    let labelY = pinZoneTop + 12;
    let step = 0;
    while (step < 4) {
      const box = { x1: x - labelW / 2, x2: x + labelW / 2, y: labelY };
      const collide = pinBoxes.some(b => Math.abs(b.y - box.y) < 14 && b.x1 < box.x2 && b.x2 > box.x1);
      if (!collide) { pinBoxes.push(box); break; }
      labelY += 16;
      step++;
    }
    pins.push({
      event: ev,
      x,
      labelY,
      axisY,
      color: colorFor(ev.category),
    });
  }

  const eraLayouts: TimelineEraLayout[] = ast.eras.map((e, idx) => ({
    era: e,
    x: xScale(e.start.value),
    width: Math.max(2, xScale(e.end.value) - xScale(e.start.value)),
    bandRow: eraRows.rowOf[idx]!,
  }));

  const legend: TimelineLegendItem[] = categories.map(c => ({ label: c, color: colorFor(c) }));

  return {
    width: CANVAS_WIDTH,
    height,
    style: "gantt",
    plotX,
    plotY,
    plotW,
    plotH,
    lanes,
    events: eventLayouts,
    eras: eraLayouts,
    ticks: generateTicks(paddedStart, paddedEnd, span, xScale, ast.scale)
      .filter(t => t.x >= plotX - 2 && t.x <= plotX + plotW + 2),
    axisY,
    title: ast.title,
    pins,
    legend: hasLegend ? legend : undefined,
  };
}

// ─── Lollipop (alternating cards) ────────────────────────

const LOLLIPOP_CARD_W = 180;
const LOLLIPOP_CARD_H = 54;
const LOLLIPOP_STEM_BASE = 26;
const LOLLIPOP_STEM_STACK = 18;

function layoutLollipop(ast: TimelineAST): TimelineLayoutResult {
  const events = ast.events.slice().sort((a, b) => a.start.value - b.start.value);

  // Event-only time extent so the axis doesn't extend past the last event
  // just to accommodate an era that ends later.
  const eStarts = events.map(e => e.start.value);
  const eEnds = events.map(e => e.end?.value ?? e.start.value);
  const eStart = eStarts.length ? Math.min(...eStarts) : 0;
  const eEnd = eEnds.length ? Math.max(...eEnds) : 1;
  const span = Math.max(1e-9, eEnd - eStart);
  const padSpan = span * 0.02;
  const paddedStart = eStart - padSpan;
  const paddedEnd = eEnd + padSpan;

  const plotX = PAD_LEFT_NO_TRACKS + 20;
  const plotRight = CANVAS_WIDTH - PAD_RIGHT - 20;
  const plotW = plotRight - plotX;

  // Reserve half-card room at axis ends so cards can't overhang plot bounds.
  const CARD_HALF = LOLLIPOP_CARD_W / 2;
  const axisInset = CARD_HALF + 8;
  const axisStart = plotX + axisInset;
  const axisEnd = plotRight - axisInset;
  const axisW = Math.max(1, axisEnd - axisStart);

  const rawScale = buildScale(ast.scale, events, paddedStart, paddedEnd, axisStart, axisW);
  const xScale = (v: number) => Math.max(plotX, Math.min(plotRight, rawScale(v)));

  const eraRows = packEraRows(ast.eras);
  const eraBandTotal = eraRows.rows * (ERA_BAND_HEIGHT + 2);

  const titleOffset = ast.title ? 28 : 0;
  // Estimate 2 stacked rows per side at worst; compute actual after card assignment.
  const plotY = PAD_TOP_BASE + titleOffset + eraBandTotal;

  // Assign sides: explicit first, then alternate
  const cards: TimelineCardLayout[] = [];
  let alt: TimelineSide = "above";
  const palette = DEFAULT_CATEGORY_PALETTE;

  // Track column occupancy to stagger stems when cards would overlap.
  const aboveRows: number[] = []; // stores last-right-edge x per stack row
  const belowRows: number[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    if (ev.kind === "range") continue; // ranges rendered as thin bars on axis
    const side: TimelineSide = ev.side ?? alt;
    if (!ev.side) alt = alt === "above" ? "below" : "above";

    const x = xScale(ev.start.value);
    const cardX = x - LOLLIPOP_CARD_W / 2;
    const cardRight = cardX + LOLLIPOP_CARD_W;
    const rows = side === "above" ? aboveRows : belowRows;
    // Find first row where left edge doesn't collide. Allow 2px tolerance so
    // cards whose borders would just-barely kiss stay on the same row instead
    // of cascading up — equidistant layouts depend on this to keep all
    // same-side cards horizontally aligned.
    let row = 0;
    for (; row < rows.length; row++) {
      if (rows[row]! <= cardX + 2) { rows[row] = cardRight; break; }
    }
    if (row === rows.length) { rows.push(cardRight); }

    const stemLen = LOLLIPOP_STEM_BASE + row * LOLLIPOP_STEM_STACK;

    cards.push({
      event: ev,
      x,
      axisY: 0, // filled after we know axisY
      side,
      cardX,
      cardY: 0,
      cardW: LOLLIPOP_CARD_W,
      cardH: LOLLIPOP_CARD_H,
      stemY1: 0,
      stemY2: 0,
      color: ev.color ?? palette[i % palette.length]!,
      index: row,
    });
    // store stemLen in a transient property via cardH field hack? Use index+side map instead.
    (cards[cards.length - 1] as unknown as { _stemLen: number })._stemLen = stemLen;
  }

  const maxAboveStems = aboveRows.length;
  const maxBelowStems = belowRows.length;
  const topExtent = LOLLIPOP_CARD_H + LOLLIPOP_STEM_BASE + Math.max(0, maxAboveStems - 1) * LOLLIPOP_STEM_STACK;
  const realAxisY = plotY + topExtent + 10;
  const bottomExtent = LOLLIPOP_CARD_H + LOLLIPOP_STEM_BASE + Math.max(0, maxBelowStems - 1) * LOLLIPOP_STEM_STACK;
  const height = realAxisY + bottomExtent + 40;

  // Fill in card axis/stem/card positions now that we know realAxisY
  for (const c of cards) {
    const stemLen = (c as unknown as { _stemLen: number })._stemLen ?? LOLLIPOP_STEM_BASE;
    c.axisY = realAxisY;
    if (c.side === "above") {
      c.stemY1 = realAxisY - 3;
      c.stemY2 = realAxisY - stemLen;
      c.cardY = c.stemY2 - c.cardH;
    } else {
      c.stemY1 = realAxisY + 3;
      c.stemY2 = realAxisY + stemLen;
      c.cardY = c.stemY2;
    }
    delete (c as unknown as { _stemLen?: number })._stemLen;
  }

  // Ranges → thin bars on axis
  const eventLayouts: TimelineEventLayout[] = [];
  for (const ev of events) {
    if (ev.kind !== "range") continue;
    const x = xScale(ev.start.value);
    const xe = xScale(ev.end!.value);
    const w = Math.max(4, xe - x);
    eventLayouts.push({
      event: ev,
      x,
      w,
      y: realAxisY - 5,
      h: 10,
      labelX: x + w / 2,
      labelY: realAxisY - 10,
      labelAnchor: "middle",
    });
  }

  const eraLayouts: TimelineEraLayout[] = ast.eras.map((e, idx) => ({
    era: e,
    x: xScale(e.start.value),
    width: Math.max(2, xScale(e.end.value) - xScale(e.start.value)),
    bandRow: eraRows.rowOf[idx]!,
  }));

  // Per-row leftmost/rightmost extension: ensure era covers full plot width
  // so cards at axis extremes never overhang a gap.
  const leftmostIdxByRow = new Map<number, number>();
  const rightmostIdxByRow = new Map<number, number>();
  eraLayouts.forEach((e, i) => {
    const curL = leftmostIdxByRow.get(e.bandRow);
    if (curL === undefined || e.x < eraLayouts[curL]!.x) leftmostIdxByRow.set(e.bandRow, i);
    const curR = rightmostIdxByRow.get(e.bandRow);
    const right = e.x + e.width;
    if (curR === undefined || right > eraLayouts[curR]!.x + eraLayouts[curR]!.width) {
      rightmostIdxByRow.set(e.bandRow, i);
    }
  });
  for (const [, i] of leftmostIdxByRow) {
    const e = eraLayouts[i]!;
    const right = e.x + e.width;
    e.x = Math.min(e.x, plotX);
    e.width = right - e.x;
  }
  for (const [, i] of rightmostIdxByRow) {
    const e = eraLayouts[i]!;
    e.width = Math.max(e.width, plotRight - e.x);
  }

  return {
    width: CANVAS_WIDTH,
    height,
    style: "lollipop",
    plotX,
    plotY,
    plotW,
    plotH: height - plotY - 20,
    lanes: [],
    events: eventLayouts,
    eras: eraLayouts,
    ticks: generateTicks(paddedStart, paddedEnd, span, xScale, ast.scale)
      .filter(t => t.x >= plotX - 2 && t.x <= plotX + plotW + 2),
    axisY: realAxisY,
    title: ast.title,
    cards,
  };
}
