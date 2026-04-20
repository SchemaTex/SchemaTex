import type { RenderConfig } from "../../core/types";
import { svgRoot, group, rect, line, path, text as textEl, title as titleEl, desc as descEl, defs, circle, escapeXml } from "../../core/svg";
import { resolveTimelineTheme, cssCustomProperties, type ResolvedTheme, type TimelineTokens } from "../../core/theme";
import { parseTimeline } from "./parser";
import { layoutTimeline } from "./layout";
import type {
  TimelineCardLayout,
  TimelineEventLayout,
  TimelineLayoutResult,
  TimelinePinLayout,
} from "./types";

type Theme = ResolvedTheme<TimelineTokens>;

const ERA_BAND_HEIGHT = 16;
const ERA_ROW_GAP = 2;

export function renderTimeline(src: string, config?: RenderConfig): string {
  const ast = parseTimeline(src);
  const layout = layoutTimeline(ast);
  const theme = resolveTimelineTheme(config?.theme ?? "default");

  const styleBlock = styleForTheme(theme, config?.fontFamily);

  const children: string[] = [
    titleEl(ast.title ? `Timeline — ${ast.title}` : "Timeline"),
    descEl("Schematex timeline diagram"),
    defs([`<style>${styleBlock}</style>`]),
  ];

  if (ast.title) {
    children.push(
      textEl(
        { x: layout.width / 2, y: 26, "text-anchor": "middle", class: "st-title" },
        ast.title,
      ),
    );
  }

  children.push(renderEras(layout, theme));

  switch (layout.style) {
    case "gantt":
      children.push(renderGantt(layout, theme));
      break;
    case "lollipop":
      children.push(renderLollipop(layout, theme));
      break;
    case "swimlane":
    default:
      children.push(renderSwimlane(layout, theme));
      break;
  }

  children.push(renderAxis(layout));

  return svgRoot(
    {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      width: layout.width,
      height: layout.height,
      class: `st-timeline st-timeline-${layout.style}`,
      "data-diagram-type": "timeline",
      "data-style": layout.style,
      role: "graphics-document",
    },
    children,
  );
}

// ─── Styles ───────────────────────────────────────────────

function styleForTheme(theme: Theme, fontFamily?: string): string {
  const font = fontFamily ?? "system-ui, -apple-system, sans-serif";
  return `
    .st-timeline { ${cssCustomProperties(theme)}
      --st-axis: ${theme.axis};
      --st-axis-label: ${theme.axisLabel};
      --st-era-label: ${theme.eraLabel};
      --st-lane-stripe: ${theme.laneStripe};
      --st-marker-ring: ${theme.markerRing};
      --st-marker-fill: ${theme.markerFill};
      --st-milestone-fill: ${theme.milestoneFill};
      --st-pin-shaft: ${theme.pinShaft};
      --st-card-bg: ${theme.cardBg};
      --st-card-stroke: ${theme.cardStroke};
      --st-card-text: ${theme.cardText};
      --st-legend-bg: ${theme.legendBg};
      --st-legend-stroke: ${theme.legendStroke};
      font-family: ${font}; background: var(--schematex-bg); }
    .st-title { font-size: 16px; font-weight: 600; fill: var(--schematex-text); }
    .st-axis-line { stroke: var(--st-axis); stroke-width: 1.5; fill: none; }
    .st-axis-tick { stroke: var(--st-axis); stroke-width: 1; opacity: 0.55; }
    .st-axis-label { font-size: 11px; fill: var(--st-axis-label); }
    .st-era-rect { opacity: ${theme.eraOpacity}; }
    .st-era-strip { opacity: ${theme.eraPlotOpacity}; }
    .st-era-label { font-size: 11px; font-weight: 500; fill: var(--st-era-label); }
    .st-event-dot { stroke: var(--st-marker-fill); stroke-width: 1.5; }
    .st-event-label { font-size: 12px; fill: var(--schematex-text); }
    .st-range-bar { opacity: 0.88; }
    .st-range-label { font-size: 11px; fill: #fff; font-weight: 500; }
    .st-milestone { stroke: var(--st-marker-fill); stroke-width: 2; }
    .st-milestone-label { font-size: 12px; fill: var(--schematex-text); font-weight: 600; }
    .st-track-label { font-size: 12px; font-weight: 600; fill: var(--schematex-text); }
    .st-lane-stripe { fill: var(--st-lane-stripe); opacity: ${theme.laneStripeOpacity}; }
    .st-callout-line { stroke: var(--st-axis); stroke-width: 0.8; stroke-dasharray: 2 2; opacity: 0.5; fill: none; }
    .st-callout-text { font-size: 10.5px; fill: var(--schematex-text-muted); }
    .st-label-leader { stroke: var(--st-axis); stroke-width: 0.75; opacity: 0.35; fill: none; }
    .st-icon { font-size: 14px; }
    /* Gantt */
    .st-pin-shaft { stroke: var(--st-pin-shaft); stroke-width: 1.25; stroke-dasharray: 3 2; fill: none; }
    .st-pin-label { font-size: 11.5px; fill: var(--schematex-text); font-weight: 500; }
    .st-pin-head { stroke: var(--st-marker-fill); stroke-width: 1.5; }
    .st-lane-label { font-size: 11px; fill: var(--schematex-text-muted); font-weight: 500; }
    .st-legend-box { fill: var(--st-legend-bg); stroke: var(--st-legend-stroke); stroke-width: 1; }
    .st-legend-title { font-size: 11px; font-weight: 600; fill: var(--schematex-text-muted); }
    .st-legend-label { font-size: 11px; fill: var(--schematex-text); }
    /* Lollipop */
    .st-card { fill: var(--st-card-bg); stroke: var(--st-card-stroke); stroke-width: 1; }
    .st-card-title { font-size: 12px; font-weight: 600; fill: var(--st-card-text); }
    .st-card-date { font-size: 10.5px; fill: var(--schematex-text-muted); }
    .st-card-icon { font-size: 16px; }
    .st-stem { stroke: var(--st-axis); stroke-width: 1.25; opacity: 0.55; fill: none; }
    .st-lp-marker-ring { stroke-width: 2.5; }
    .st-lp-marker-core { stroke: none; }
  `;
}

// ─── Shared sections ──────────────────────────────────────

function renderEras(layout: TimelineLayoutResult, theme: Theme): string {
  if (!layout.eras.length) return "";
  const topBase = layout.title ? 54 : 40;
  const palette = theme.palette;
  // Find leftmost + rightmost eras per band row so we can extend their plot
  // strips to cover overhang (e.g. lollipop cards extending past plot edges).
  const leftmostOnRow = new Map<number, number>();
  const rightmostOnRow = new Map<number, number>();
  layout.eras.forEach((e, i) => {
    const l = leftmostOnRow.get(e.bandRow);
    if (l === undefined || e.x < layout.eras[l]!.x) leftmostOnRow.set(e.bandRow, i);
    const r = rightmostOnRow.get(e.bandRow);
    if (r === undefined || e.x + e.width > layout.eras[r]!.x + layout.eras[r]!.width) rightmostOnRow.set(e.bandRow, i);
  });
  const plotEnd = layout.plotX + layout.plotW;

  const items = layout.eras.map((e, i) => {
    const y = topBase + e.bandRow * (ERA_BAND_HEIGHT + ERA_ROW_GAP);
    const fill = e.era.color ?? palette[i % palette.length]!;
    const labelX = e.x + 6;
    // Plot strip extends to plot edges for the leftmost/rightmost era on its
    // band row — otherwise cards overhanging the first/last event sit on bare
    // background.
    const isLeftmost = leftmostOnRow.get(e.bandRow) === i;
    const isRightmost = rightmostOnRow.get(e.bandRow) === i;
    const stripX = isLeftmost ? Math.min(e.x, layout.plotX) : e.x;
    const stripEnd = isRightmost ? Math.max(e.x + e.width, plotEnd) : e.x + e.width;
    return [
      rect({
        x: e.x,
        y,
        width: e.width,
        height: ERA_BAND_HEIGHT,
        fill,
        class: "st-era-rect",
        "data-era-id": e.era.id,
      }),
      rect({
        x: stripX,
        y: layout.plotY,
        width: stripEnd - stripX,
        height: layout.plotH,
        fill,
        class: "st-era-strip",
      }),
      textEl(
        { x: labelX, y: y + 12, class: "st-era-label" },
        truncate(e.era.label, Math.max(4, Math.floor(e.width / 7))),
      ),
    ].join("");
  });
  return group({ class: "st-eras" }, items);
}

function renderAxis(layout: TimelineLayoutResult): string {
  const ax = layout.axisY;
  const items: string[] = [
    line({ x1: layout.plotX, y1: ax, x2: layout.plotX + layout.plotW, y2: ax, class: "st-axis-line" }),
  ];
  for (const t of layout.ticks) {
    items.push(line({ x1: t.x, y1: ax, x2: t.x, y2: ax + 5, class: "st-axis-tick" }));
    items.push(textEl({ x: t.x, y: ax + 18, "text-anchor": "middle", class: "st-axis-label" }, t.label));
  }
  return group({ class: "st-axis" }, items);
}

// ─── Swimlane renderer ────────────────────────────────────

function renderSwimlane(layout: TimelineLayoutResult, theme: Theme): string {
  const parts: string[] = [];
  parts.push(renderTrackLabels(layout));
  parts.push(renderLaneStripes(layout));
  parts.push(renderSwimlaneRanges(layout, theme));
  parts.push(renderSwimlanePoints(layout, theme));
  parts.push(renderLabels(layout));
  parts.push(renderNotes(layout));
  return parts.join("");
}

function renderTrackLabels(layout: TimelineLayoutResult): string {
  const items = layout.lanes
    .filter(l => l.label)
    .map(l => textEl(
      { x: layout.plotX - 12, y: l.y + l.height / 2 + 4, "text-anchor": "end", class: "st-track-label" },
      l.label,
    ));
  return group({ class: "st-track-labels" }, items);
}

function renderLaneStripes(layout: TimelineLayoutResult): string {
  const items = layout.lanes.map((l, i) => {
    if (i % 2 !== 0) return "";
    return rect({
      x: layout.plotX,
      y: l.y,
      width: layout.plotW,
      height: l.height,
      class: "st-lane-stripe",
    });
  }).filter(Boolean);
  return group({ class: "st-lanes" }, items);
}

function renderSwimlaneRanges(layout: TimelineLayoutResult, theme: Theme): string {
  const items: string[] = [];
  // Map track id → palette index for stable color per lane.
  const trackOrder = layout.lanes.map(l => l.trackId);
  const palette = theme.categoryPalette;
  for (const ev of layout.events) {
    if (ev.event.kind !== "range") continue;
    const idx = trackOrder.indexOf(ev.event.trackId!);
    const fill = ev.event.color ?? palette[(idx < 0 ? 0 : idx) % palette.length]!;
    items.push(rect({
      x: ev.x,
      y: ev.y,
      width: ev.w ?? 4,
      height: ev.h,
      rx: 4,
      ry: 4,
      fill,
      class: "st-range-bar",
      "data-event-id": ev.event.id,
    }));
    const w = ev.w ?? 0;
    if (w >= 60) {
      items.push(textEl(
        { x: ev.labelX, y: ev.labelY, "text-anchor": "middle", class: "st-range-label" },
        truncate(ev.event.label, Math.floor(w / 6)),
      ));
    } else if (w > 0) {
      items.push(textEl(
        { x: ev.x + w + 4, y: ev.labelY, "text-anchor": "start", class: "st-event-label" },
        ev.event.label,
      ));
    }
  }
  return group({ class: "st-ranges" }, items);
}

function renderSwimlanePoints(layout: TimelineLayoutResult, theme: Theme): string {
  const items: string[] = [];
  for (const ev of layout.events) {
    if (ev.event.kind === "range") continue;
    const isMilestone = ev.event.kind === "milestone";
    const color = ev.event.color ?? (isMilestone ? theme.milestoneFill : theme.markerRing);
    const shape = ev.event.shape ?? (isMilestone ? "star" : "circle");
    items.push(renderMarker(ev, color, shape, isMilestone));
  }
  return group({ class: "st-points" }, items);
}

function renderMarker(
  ev: TimelineEventLayout,
  color: string,
  shape: "circle" | "square" | "diamond" | "star" | "flag",
  isMilestone: boolean,
): string {
  const x = ev.x;
  const y = ev.y;
  const r = isMilestone ? 8 : 5;
  const klass = isMilestone ? "st-milestone" : "st-event-dot";
  switch (shape) {
    case "square":
      return rect({ x: x - r, y: y - r, width: r * 2, height: r * 2, fill: color, class: klass, "data-event-id": ev.event.id });
    case "diamond":
      return path({ d: `M ${x},${y - r} L ${x + r},${y} L ${x},${y + r} L ${x - r},${y} Z`, fill: color, class: klass, "data-event-id": ev.event.id });
    case "star":
      return path({ d: starPath(x, y, r + 2, (r + 2) / 2.5, 5), fill: color, class: klass, "data-event-id": ev.event.id });
    case "flag":
      return path({ d: `M ${x - r},${y + r} L ${x - r},${y - r - 4} L ${x + r + 4},${y - r - 1} L ${x - r},${y + 2}`, fill: color, class: klass, "data-event-id": ev.event.id });
    case "circle":
    default:
      return circle({ cx: x, cy: y, r, fill: color, class: klass, "data-event-id": ev.event.id });
  }
}

function renderLabels(layout: TimelineLayoutResult): string {
  const items: string[] = [];
  for (const ev of layout.events) {
    if (ev.event.kind === "range") continue;
    const cls = ev.event.kind === "milestone" ? "st-milestone-label" : "st-event-label";
    const text = ev.event.icon
      ? `${ev.event.icon} ${ev.event.label}`
      : ev.event.label;
    // Leader line when label was pushed far from marker by cascade.
    const dy = ev.labelY - ev.y;
    if (Math.abs(dy) > 22) {
      const y1 = dy < 0 ? ev.y - 6 : ev.y + 6;
      const y2 = dy < 0 ? ev.labelY + 3 : ev.labelY - 10;
      items.push(line({ x1: ev.x, y1, x2: ev.x, y2, class: "st-label-leader" }));
    }
    items.push(textEl(
      { x: ev.labelX, y: ev.labelY, "text-anchor": ev.labelAnchor, class: cls },
      text,
    ));
  }
  return group({ class: "st-labels" }, items);
}

function renderNotes(layout: TimelineLayoutResult): string {
  const items: string[] = [];
  for (const ev of layout.events) {
    if (!ev.event.note) continue;
    const x = ev.x;
    const ny = (ev.noteY ?? ev.y + 18);
    const nx = (ev.noteX ?? x + 10);
    const wrapped = wrapText(ev.event.note, 46);
    items.push(path({ d: `M ${x} ${ev.y + 6} Q ${x + 4} ${ny - 4} ${nx} ${ny}`, class: "st-callout-line" }));
    wrapped.forEach((ln, i) => {
      items.push(textEl(
        { x: nx, y: ny + i * 13, class: "st-callout-text" },
        ln,
      ));
    });
  }
  return group({ class: "st-notes" }, items);
}

// ─── Gantt renderer ───────────────────────────────────────

function renderGantt(layout: TimelineLayoutResult, theme: Theme): string {
  const parts: string[] = [];
  // Lane stripes + labels
  parts.push(renderGanttLanes(layout));
  // Task bars (range events)
  parts.push(renderGanttBars(layout, theme));
  // Pins (point/milestone events)
  parts.push(renderGanttPins(layout));
  // Legend
  if (layout.legend && layout.legend.length) {
    parts.push(renderLegend(layout));
  }
  return parts.join("");
}

function renderGanttLanes(layout: TimelineLayoutResult): string {
  const items: string[] = [];
  layout.lanes.forEach((l, i) => {
    if (i % 2 === 0) {
      items.push(rect({
        x: layout.plotX,
        y: l.y,
        width: layout.plotW,
        height: l.height,
        class: "st-lane-stripe",
      }));
    }
    items.push(textEl({
      x: layout.plotX - 10,
      y: l.y + l.height / 2 + 4,
      "text-anchor": "end",
      class: "st-lane-label",
    }, l.label));
  });
  return group({ class: "st-gantt-lanes" }, items);
}

function renderGanttBars(layout: TimelineLayoutResult, theme: Theme): string {
  const items: string[] = [];
  const laneByCat = new Map(layout.lanes.map(l => [l.label, l]));
  const legendByLabel = new Map((layout.legend ?? []).map(l => [l.label, l.color]));
  for (const ev of layout.events) {
    if (ev.event.kind !== "range") continue;
    const cat = ev.event.category ?? layout.lanes[0]?.label ?? "";
    const color = ev.event.color ?? legendByLabel.get(cat) ?? theme.categoryPalette[0]!;
    const w = ev.w ?? 4;
    items.push(rect({
      x: ev.x,
      y: ev.y,
      width: w,
      height: ev.h,
      rx: 5,
      ry: 5,
      fill: color,
      class: "st-range-bar",
      "data-event-id": ev.event.id,
      "data-category": cat,
    }));
    if (w >= 60) {
      items.push(textEl(
        { x: ev.labelX, y: ev.labelY, "text-anchor": "middle", class: "st-range-label" },
        truncate(ev.event.label, Math.floor(w / 6)),
      ));
    } else if (w > 0) {
      const lane = laneByCat.get(cat);
      const ly = lane ? lane.y + lane.height / 2 + 4 : ev.labelY;
      items.push(textEl(
        { x: ev.x + w + 4, y: ly, "text-anchor": "start", class: "st-event-label" },
        ev.event.label,
      ));
    }
  }
  return group({ class: "st-gantt-bars" }, items);
}

function renderGanttPins(layout: TimelineLayoutResult): string {
  const pins = layout.pins ?? [];
  if (!pins.length) return "";
  const items: string[] = [];
  for (const p of pins) {
    items.push(renderPin(p));
  }
  return group({ class: "st-gantt-pins" }, items);
}

function renderPin(p: TimelinePinLayout): string {
  const isMilestone = p.event.kind === "milestone";
  const shaft = path({
    d: `M ${p.x} ${p.labelY + 2} L ${p.x} ${p.axisY - 4}`,
    class: "st-pin-shaft",
  });
  const head = isMilestone
    ? path({
        d: starPath(p.x, p.axisY - 6, 7, 3, 5),
        fill: p.color,
        class: "st-pin-head",
        "data-event-id": p.event.id,
      })
    : circle({
        cx: p.x,
        cy: p.axisY - 6,
        r: 5,
        fill: p.color,
        class: "st-pin-head",
        "data-event-id": p.event.id,
      });
  const txt = p.event.icon ? `${p.event.icon} ${p.event.label}` : p.event.label;
  const label = textEl(
    { x: p.x, y: p.labelY, "text-anchor": "middle", class: "st-pin-label" },
    txt,
  );
  return shaft + head + label;
}

function renderLegend(layout: TimelineLayoutResult): string {
  const legend = layout.legend ?? [];
  if (!legend.length) return "";
  const boxW = 130;
  const padding = 10;
  const rowH = 18;
  const h = padding * 2 + 18 + legend.length * rowH;
  const x = layout.width - boxW - 16;
  const y = layout.plotY;
  const items: string[] = [
    rect({ x, y, width: boxW, height: h, rx: 6, ry: 6, class: "st-legend-box" }),
    textEl({ x: x + padding, y: y + padding + 12, class: "st-legend-title" }, "Teams"),
  ];
  legend.forEach((it, i) => {
    const rowY = y + padding + 18 + i * rowH + 8;
    items.push(rect({ x: x + padding, y: rowY - 7, width: 12, height: 12, rx: 2, ry: 2, fill: it.color }));
    items.push(textEl({ x: x + padding + 20, y: rowY + 3, class: "st-legend-label" }, truncate(it.label, 14)));
  });
  return group({ class: "st-legend" }, items);
}

// ─── Lollipop renderer ────────────────────────────────────

function renderLollipop(layout: TimelineLayoutResult, theme: Theme): string {
  const parts: string[] = [];
  // Ranges as thin bars on axis
  parts.push(renderLollipopRanges(layout, theme));
  // Cards + stems + markers
  parts.push(renderLollipopCards(layout, theme));
  return parts.join("");
}

function renderLollipopRanges(layout: TimelineLayoutResult, theme: Theme): string {
  const items: string[] = [];
  for (const ev of layout.events) {
    if (ev.event.kind !== "range") continue;
    const color = ev.event.color ?? theme.categoryPalette[0]!;
    items.push(rect({
      x: ev.x,
      y: ev.y,
      width: ev.w ?? 4,
      height: ev.h,
      rx: 3,
      ry: 3,
      fill: color,
      class: "st-range-bar",
      "data-event-id": ev.event.id,
    }));
  }
  return group({ class: "st-lp-ranges" }, items);
}

function renderLollipopCards(layout: TimelineLayoutResult, theme: Theme): string {
  const cards = layout.cards ?? [];
  if (!cards.length) return "";
  const items: string[] = [];
  for (const c of cards) {
    items.push(renderLollipopCard(c, theme));
  }
  return group({ class: "st-lp-cards" }, items);
}

function renderLollipopCard(c: TimelineCardLayout, theme: Theme): string {
  const parts: string[] = [];
  // Stem
  parts.push(path({ d: `M ${c.x} ${c.stemY1} L ${c.x} ${c.stemY2}`, class: "st-stem" }));
  // Marker on axis — ring with core
  parts.push(circle({ cx: c.x, cy: c.axisY, r: 7, fill: theme.markerFill, stroke: c.color, class: "st-lp-marker-ring" }));
  parts.push(circle({ cx: c.x, cy: c.axisY, r: 3.2, fill: c.color, class: "st-lp-marker-core" }));
  // Card
  parts.push(rect({
    x: c.cardX,
    y: c.cardY,
    width: c.cardW,
    height: c.cardH,
    rx: 8,
    ry: 8,
    class: "st-card",
  }));
  // Left color stripe
  parts.push(rect({
    x: c.cardX,
    y: c.cardY,
    width: 4,
    height: c.cardH,
    rx: 2,
    ry: 2,
    fill: c.color,
  }));
  const padX = c.cardX + 14;
  const titleText = c.event.icon ? `${c.event.icon}  ${c.event.label}` : c.event.label;
  parts.push(textEl(
    { x: padX, y: c.cardY + 22, class: "st-card-title" },
    truncate(titleText, 26),
  ));
  parts.push(textEl(
    { x: padX, y: c.cardY + 40, class: "st-card-date" },
    c.event.start.raw,
  ));
  return parts.join("");
}

// ─── Utilities ────────────────────────────────────────────

function truncate(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  if (maxChars < 4) return "";
  return s.slice(0, maxChars - 1) + "…";
}

function wrapText(s: string, max: number): string[] {
  const words = s.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) out.push(cur);
      cur = w;
    } else {
      cur = (cur ? cur + " " : "") + w;
    }
  }
  if (cur) out.push(cur);
  return out.slice(0, 4);
}

function starPath(cx: number, cy: number, rOuter: number, rInner: number, points: number): string {
  const step = Math.PI / points;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = i * step - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " ";
  }
  return d + "Z";
}

void escapeXml;
