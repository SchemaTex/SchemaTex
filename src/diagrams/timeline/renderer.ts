import type { RenderConfig } from "../../core/types";
import { svgRoot, group, rect, line, path, text as textEl, title as titleEl, desc as descEl, defs, circle, escapeXml } from "../../core/svg";
import { resolveTimelineTheme, type ResolvedTheme, type TimelineTokens } from "../../core/theme";
import { wrapTextToWidth } from "../../core/text-metrics";
import { formatDate } from "./dates";
import { parseTimeline } from "./parser";
import { layoutTimeline } from "./layout";
import { resolveSceneTitle } from "../../core/title-scene";
import type {
  TimelineCardLayout,
  TimelineDate,
  TimelineEventLayout,
  TimelineLayoutResult,
  TimelinePinLayout,
} from "./types";

type Theme = ResolvedTheme<TimelineTokens>;


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
    const title = resolveSceneTitle(ast.title, ast.titleSourceRange, layout.width / 2, 26, config);
    children.push(
      textEl(
        { x: title.x, y: title.y, "text-anchor": "middle", class: "st-title", ...title.attrs },
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
  children.push(renderNativeGeometry(layout, config));

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
  const font = fontFamily ?? '"Helvetica Neue", Helvetica, sans-serif';
  return `
    .st-timeline { font-family: ${font}; }
    .st-title { font-size: 16px; font-weight: 600; fill: ${theme.text}; }
    .st-axis-line { stroke: ${theme.axis}; stroke-width: 1.5; fill: none; }
    .st-axis-tick { stroke: ${theme.axis}; stroke-width: 1; opacity: 0.55; }
    .st-axis-label { font-size: 11px; fill: ${theme.axisLabel}; }
    .st-era-rect { opacity: ${theme.eraOpacity}; }
    .st-era-strip { opacity: ${theme.eraPlotOpacity}; }
    .st-era-label { font-size: 11px; font-weight: 500; fill: ${theme.eraLabel}; }
    .st-event-dot { stroke: ${theme.markerFill}; stroke-width: 1.5; }
    .st-event-label { font-size: 12px; fill: ${theme.text}; }
    .st-range-bar { opacity: 0.88; }
    .st-range-label { font-size: 11px; fill: #fff; font-weight: 500; }
    .st-milestone { stroke: ${theme.markerFill}; stroke-width: 2; }
    .st-milestone-label { font-size: 12px; fill: ${theme.text}; font-weight: 600; }
    .st-track-label { font-size: 12px; font-weight: 600; fill: ${theme.text}; }
    .st-lane-stripe { fill: ${theme.laneStripe}; opacity: ${theme.laneStripeOpacity}; }
    .st-callout-line { stroke: ${theme.axis}; stroke-width: 0.8; stroke-dasharray: 2 2; opacity: 0.5; fill: none; }
    .st-callout-text { font-size: 10.5px; fill: ${theme.textMuted}; }
    .st-label-leader { stroke: ${theme.axis}; stroke-width: 0.75; opacity: 0.35; fill: none; }
    .st-icon { font-size: 14px; }
    /* Gantt */
    .st-pin-shaft { stroke: ${theme.pinShaft}; stroke-width: 1.25; stroke-dasharray: 3 2; fill: none; }
    .st-pin-label { font-size: 11.5px; fill: ${theme.text}; font-weight: 500; }
    .st-pin-head { stroke: ${theme.markerFill}; stroke-width: 1.5; }
    .st-lane-label { font-size: 11px; fill: ${theme.textMuted}; font-weight: 500; }
    .st-legend-box { fill: ${theme.legendBg}; stroke: ${theme.legendStroke}; stroke-width: 1; }
    .st-legend-title { font-size: 11px; font-weight: 600; fill: ${theme.textMuted}; }
    .st-legend-label { font-size: 11px; fill: ${theme.text}; }
    /* Lollipop */
    .st-card { fill: ${theme.cardBg}; stroke: ${theme.cardStroke}; stroke-width: 1; }
    .st-card-title { font-size: 12px; font-weight: 600; fill: ${theme.cardText}; }
    .st-card-date { font-size: 10.5px; fill: ${theme.textMuted}; }
    .st-card-icon { font-size: 16px; }
    .st-stem { stroke: ${theme.axis}; stroke-width: 1.25; opacity: 0.55; fill: none; }
    .st-lp-marker-ring { stroke-width: 2.5; }
    .st-lp-marker-core { stroke: none; }
    .sx-native-handle { fill: #fff; stroke: #2563eb; stroke-width: 1.5; vector-effect: non-scaling-stroke; cursor: ew-resize; }
    .sx-native-handle:hover, .sx-native-handle.sx-interactive-selected { fill: #dbeafe; stroke-width: 2; }
  `;
}

function editableDate(date: TimelineDate, range: import("../../core/types").SourceRange | undefined): range is import("../../core/types").SourceRange {
  return range !== undefined && date.precision !== "ordinal";
}

function renderNativeGeometry(layout: TimelineLayoutResult, config?: RenderConfig): string {
  const scene = config?.__scene;
  const unitsPerSvgX = layout.timeUnitsPerSvgX;
  if (!scene || unitsPerSvgX === undefined) return "";
  const handles: string[] = [];
  const add = (
    key: string,
    x: number,
    y: number,
    date: TimelineDate,
    range: import("../../core/types").SourceRange | undefined,
  ): void => {
    if (!editableDate(date, range)) return;
    scene.push({
      key,
      kind: "node",
      label: date.raw,
      bbox: { x: x - 5, y: y - 5, width: 10, height: 10 },
      positionSource: {
        kind: "date",
        range,
        value: date.value,
        raw: date.raw,
        precision: date.precision as "day" | "month" | "year" | "ma",
        unitsPerSvgX,
      },
      editable: { label: false, position: "move-x" },
    });
    handles.push(circle({
      cx: x,
      cy: y,
      r: 5,
      class: "sx-native-handle",
      "data-sx-key": key,
      "data-sx-owner": key,
    }));
  };

  for (const event of layout.events) {
    const y = event.y + (event.event.kind === "range" ? event.h / 2 : 0);
    add(`handle:event:${event.event.id}:start`, event.x, y, event.event.start, event.event.startSourceRange);
    if (event.event.end && event.event.endSourceRange) {
      add(`handle:event:${event.event.id}:end`, event.x + (event.w ?? 0), y, event.event.end, event.event.endSourceRange);
    }
  }
  for (const pin of layout.pins ?? []) {
    add(`handle:event:${pin.event.id}:start`, pin.x, pin.axisY - 6, pin.event.start, pin.event.startSourceRange);
  }
  for (const card of layout.cards ?? []) {
    add(`handle:event:${card.event.id}:start`, card.x, card.axisY, card.event.start, card.event.startSourceRange);
  }
  for (const era of layout.eras) {
    const y = (layout.title ? 54 : 40) + era.bandY + era.bandHeight / 2;
    add(`handle:era:${era.era.id}:start`, era.x, y, era.era.start, era.era.startSourceRange);
    add(`handle:era:${era.era.id}:end`, era.x + era.width, y, era.era.end, era.era.endSourceRange);
  }
  return group({ class: "sx-native-handles" }, handles);
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
    const y = topBase + e.bandY;
    const fill = e.era.color ?? palette[i % palette.length]!;
    const labelX = e.labelX;
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
        height: e.bandHeight,
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
      ...e.labelLines.map((label, index) => textEl(
        { x: labelX, y: y + 13 + index * 13, class: "st-era-label" }, label,
      )),
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
  parts.push(group({ class: "st-event-dates" }, layout.events.filter(e => e.dateY !== undefined).map(e => {
    return textEl({ x: e.labelX, y: e.dateY!, "text-anchor": "middle", class: "st-callout-text" },
      formatDate(e.event.start) + (e.event.end ? ` – ${formatDate(e.event.end)}` : ""));
  })));
  return parts.join("");
}

function renderTrackLabels(layout: TimelineLayoutResult): string {
  const items = layout.lanes
    .filter(l => l.label)
    .flatMap(l => {
      const lines = wrapTextToWidth(l.label, 12, layout.plotX - 32, { fontWeight: 600 });
      return lines.map((label, i) => textEl(
        { x: layout.plotX - 12, y: l.y + l.height / 2 + 4 + (i - (lines.length - 1) / 2) * 15,
          "text-anchor": "end", class: "st-track-label" }, label,
      ));
    });
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
    const inside = ev.labelInside === true;
    const lines = ev.labelLines ?? [ev.event.label];
    lines.forEach((label, i) => items.push(textEl(
      { x: ev.labelX, y: ev.labelY + i * 15, "text-anchor": ev.labelAnchor,
        class: inside ? "st-range-label" : "st-event-label" }, label,
    )));
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
      const labelBottom = ev.labelY + ((ev.labelLines?.length ?? 1) - 1) * 15;
      const y2 = dy < 0 ? labelBottom + 3 : ev.labelY - 10;
      items.push(line({ x1: ev.x, y1, x2: ev.labelX, y2, class: "st-label-leader" }));
    }
    (ev.labelLines ?? [text]).forEach((label, i) => items.push(textEl(
      { x: ev.labelX, y: ev.labelY + i * 15, "text-anchor": ev.labelAnchor, class: cls },
      label,
    )));
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
    const wrapped = ev.noteLines ?? wrapText(ev.event.note, 46);
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
