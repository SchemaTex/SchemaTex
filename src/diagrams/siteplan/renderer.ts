import type { RenderConfig } from "../../core/types";
import {
  circle,
  defs,
  desc as svgDesc,
  el,
  group,
  line as svgLine,
  path as svgPath,
  polygon as svgPolygon,
  rect,
  svgRoot,
  text as svgText,
  title as svgTitle,
} from "../../core/svg";
import { DEFAULT_FONT_FAMILY, TITLE } from "../../core/theme";
import { parseSiteplan } from "./parser";
import { formatSiteLength, layoutSiteplan } from "./layout";
import type {
  Point,
  SiteplanLayoutResult,
  SiteplanMarkerKind,
  SiteplanPath,
  SiteplanPolygon,
} from "./types";

const PAPER = "#ffffff";
const INK = "#111827";
const MUTED = "#5f6b7a";
const PLAN_LINE = "#1f2937";
const FAINT_LINE = "#d6dbe3";
const LEGEND_COLS = 1;
const LEGEND_LIMIT = 9;
const SIDE_PANEL_W = 188;
const SIDE_PANEL_GAP = 24;

const r2 = (n: number): number => Math.round(n * 100) / 100;

export function renderSiteplan(text: string, config?: RenderConfig): string {
  return renderSiteplanLayout(layoutSiteplan(parseSiteplan(text)), config);
}

function polyPoints(points: Point[], sx: (n: number) => number, sy: (n: number) => number): string {
  return points.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
}

function pathD(points: Point[], sx: (n: number) => number, sy: (n: number) => number): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
}

function centroid(points: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export function renderSiteplanLayout(lay: SiteplanLayoutResult, config?: RenderConfig): string {
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 28;
  const titleBand = lay.title ? 34 : 14;
  const hasPanel = (lay.legend && lay.legendItems.length > 0) || lay.north !== undefined || lay.scale !== undefined;
  const panelW = hasPanel ? SIDE_PANEL_W : 0;
  const panelGap = hasPanel ? SIDE_PANEL_GAP : 0;
  const targetW = 980;
  const targetH = 660;
  const spanX = Math.max(1, lay.bounds.maxX - lay.bounds.minX);
  const spanY = Math.max(1, lay.bounds.maxY - lay.bounds.minY);
  const drawingMaxW = targetW - pad * 2 - panelW - panelGap;
  const drawingMaxH = targetH - pad * 2 - titleBand;
  const scale = Math.min(drawingMaxW / spanX, drawingMaxH / spanY);
  const drawingW = spanX * scale;
  const drawingH = spanY * scale;
  const contentW = drawingW + panelW + panelGap;
  const width = Math.max(520, contentW + pad * 2);
  const height = Math.max(420, drawingH + pad * 2 + titleBand);
  const contentX = pad + Math.max(0, (width - pad * 2 - contentW) / 2);
  const plotY = titleBand + pad + Math.max(0, (height - titleBand - pad * 2 - drawingH) / 2);
  const panelX = contentX + drawingW + panelGap;
  const ox = contentX - lay.bounds.minX * scale;
  const oy = plotY - lay.bounds.minY * scale;
  const sx = (n: number) => ox + n * scale;
  const sy = (n: number) => oy + n * scale;
  const len = (n: number) => n * scale;

  const style = el(
    "style",
    {},
    `
.sx-sp-bg { fill: ${PAPER}; }
.sx-sp-sheet { fill: none; stroke: ${PLAN_LINE}; stroke-width: 1; }
.sx-sp-sheet-rule { stroke: ${FAINT_LINE}; stroke-width: 1; }
.sx-sp-title { fill: ${INK}; font-size: 15px; font-weight: ${TITLE.weight}; letter-spacing: 0; }
.sx-sp-note { fill: ${MUTED}; font-size: 11px; }
.sx-sp-parcel { stroke: #111827; stroke-width: 2.2; }
.sx-sp-structure { stroke: #253041; stroke-width: 1.6; }
.sx-sp-roofline { fill: none; stroke: #9aa4b2; stroke-width: 0.75; }
.sx-sp-zone { stroke: #9aa4b2; stroke-width: 1; stroke-dasharray: 7 4; }
.sx-sp-landscape { stroke: #899481; stroke-width: 0.9; }
.sx-sp-parking { stroke: #8e99a8; stroke-width: 0.9; }
.sx-sp-road { fill: none; stroke: #f1f3f6; stroke-linecap: butt; stroke-linejoin: round; }
.sx-sp-road-center { fill: none; stroke: #9aa4b2; stroke-width: 0.9; stroke-linecap: butt; stroke-linejoin: round; }
.sx-sp-driveway-edge { fill: none; stroke: #aeb8c4; stroke-linecap: round; stroke-linejoin: round; }
.sx-sp-driveway { fill: none; stroke: #d8dde5; stroke-linecap: round; stroke-linejoin: round; }
.sx-sp-driveway-mark { fill: none; stroke: ${PAPER}; stroke-width: 1.15; stroke-linecap: butt; stroke-dasharray: 7 7; }
.sx-sp-driveway-arrow { fill: ${PAPER}; stroke: #8a94a3; stroke-width: 0.35; }
.sx-sp-walkway, .sx-sp-trail { fill: none; stroke: #d7d0c3; stroke-linecap: round; stroke-linejoin: round; }
.sx-sp-setback { fill: none; stroke: #6b7280; stroke-width: 1; stroke-dasharray: 8 5; }
.sx-sp-easement { fill: none; stroke: #6b7280; stroke-width: 1; stroke-dasharray: 2 5; }
.sx-sp-fence { fill: none; stroke: #344054; stroke-width: 1; stroke-dasharray: 8 3 1.5 3; }
.sx-sp-utility { fill: none; stroke: #2563eb; stroke-width: 1; stroke-dasharray: 2 5; }
.sx-sp-frontage { fill: none; stroke: #111827; stroke-width: 1.7; }
.sx-sp-boundary { fill: none; stroke: #111827; stroke-width: 1.8; }
.sx-sp-dim { fill: none; stroke: #475467; stroke-width: 0.9; }
.sx-sp-callout { fill: none; stroke: #344054; stroke-width: 0.9; marker-end: url(#sx-sp-arrow); }
.sx-sp-label { fill: ${INK}; font-size: 10.2px; font-weight: 600; paint-order: stroke; stroke: ${PAPER}; stroke-width: 3.4px; stroke-linejoin: round; }
.sx-sp-small { fill: ${INK}; font-size: 8.8px; paint-order: stroke; stroke: ${PAPER}; stroke-width: 2.8px; stroke-linejoin: round; }
.sx-sp-marker { fill: #fbfdf8; stroke: #3f684b; stroke-width: 1.05; }
.sx-sp-marker-line { fill: none; stroke: #3f684b; stroke-width: 0.7; }
.sx-sp-car { fill: #fafafa; stroke: #667085; stroke-width: 0.9; }
.sx-sp-pin { fill: #ffffff; stroke: #b42318; stroke-width: 1; }
.sx-sp-entry { fill: #ffffff; stroke: #475467; stroke-width: 1; }
.sx-sp-legend-box { fill: ${PAPER}; stroke: #cfd5dd; stroke-width: 0.9; }
.sx-sp-legend-title { fill: ${INK}; font-size: 10px; font-weight: 700; }
.sx-sp-legend-text { fill: ${MUTED}; font-size: 9.4px; }
`.trim()
  );

  const children: string[] = [
    svgTitle(lay.title),
    svgDesc(`Site plan with ${lay.polygons.length} polygons, ${lay.paths.length} paths, ${lay.lines.length} line features, and ${lay.markers.length} markers.`),
    defs([
      el("marker", { id: "sx-sp-arrow", markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: "auto" }, [
        svgPath({ d: "M1 1 L7 4 L1 7 Z", fill: "#344054" }),
      ]),
      el("pattern", { id: "sx-sp-structure-hatch", patternUnits: "userSpaceOnUse", width: 7, height: 7 }, [
        rect({ x: 0, y: 0, width: 7, height: 7, fill: "#fbfcfd" }),
        svgPath({ d: "M-2 7 L7 -2 M2 9 L9 2", stroke: "#d6dbe3", "stroke-width": 0.65 }),
      ]),
      el("pattern", { id: "sx-sp-parking-hatch", patternUnits: "userSpaceOnUse", width: 24, height: 18 }, [
        rect({ x: 0, y: 0, width: 24, height: 18, fill: "#f4f6f8" }),
        svgPath({ d: "M4 18 L4 6 M12 18 L12 6 M20 18 L20 6", stroke: "#c5ccd6", "stroke-width": 0.8 }),
      ]),
      el("pattern", { id: "sx-sp-landscape-dot", patternUnits: "userSpaceOnUse", width: 12, height: 12 }, [
        rect({ x: 0, y: 0, width: 12, height: 12, fill: "#fcfdf9" }),
        circle({ cx: 3, cy: 4, r: 0.8, fill: "#a6b99d" }),
        circle({ cx: 9, cy: 9, r: 0.8, fill: "#a6b99d" }),
      ]),
    ]),
    style,
    rect({ x: 0, y: 0, width, height, class: "sx-sp-bg" }),
    rect({ x: 8, y: 8, width: r2(width - 16), height: r2(height - 16), class: "sx-sp-sheet" }),
  ];

  if (lay.title) {
    children.push(svgText({ x: pad, y: 26, class: "sx-sp-title", "font-family": fontFamily, "text-anchor": "start" }, lay.title));
    children.push(svgLine({ x1: pad, y1: titleBand, x2: r2(width - pad), y2: titleBand, class: "sx-sp-sheet-rule" }));
  }

  const roads: string[] = [];
  const surfaces: string[] = [];
  const structures: string[] = [];
  const paths: string[] = [];
  const overlays: string[] = [];
  const dims: string[] = [];
  const markers: string[] = [];
  const callouts: string[] = [];
  const labels: string[] = [];
  for (const p of lay.paths.filter((p) => p.role === "road")) {
    roads.push(renderPath(p, sx, sy, len, true));
    if (p.label) labels.push(labelOnLine(p.points, p.label, sx, sy, fontFamily, "sx-sp-small", -4));
  }
  for (const p of lay.polygons) {
    if (p.role === "structure") structures.push(renderPolygon(p, sx, sy, fontFamily));
    else surfaces.push(renderPolygon(p, sx, sy, fontFamily));
  }
  for (const p of lay.paths.filter((p) => p.role !== "road")) {
    paths.push(renderPath(p, sx, sy, len, false));
    if (p.label) labels.push(labelOnLine(p.points, p.label, sx, sy, fontFamily, "sx-sp-small", -5));
  }
  for (const l of lay.lines) {
    const d = pathD(l.points, sx, sy);
    overlays.push(svgPath({ d, class: `sx-sp-${l.role}`, "data-line": l.id }));
    if (l.label) labels.push(labelOnLine(l.points, l.label, sx, sy, fontFamily, "sx-sp-small", l.role === "frontage" ? 11 : -5));
  }
  for (const d of lay.dimensions) dims.push(renderDimension(d.from, d.to, d.label, sx, sy, fontFamily));
  for (const m of lay.markers) markers.push(renderMarker(m.kind, sx(m.at.x), sy(m.at.y), len(m.size), m.rotate, m.label, fontFamily));
  for (const c of lay.callouts) {
    callouts.push(svgPath({ d: `M${r2(sx(c.at.x))} ${r2(sy(c.at.y))} L${r2(sx(c.to.x))} ${r2(sy(c.to.y))}`, class: "sx-sp-callout" }));
    callouts.push(svgText({ x: sx(c.at.x), y: sy(c.at.y) - 5, class: "sx-sp-small", "font-family": fontFamily, "text-anchor": "middle" }, c.label));
  }
  const scene = [
    group({ class: "sx-sp-roads" }, roads),
    group({ class: "sx-sp-surfaces" }, surfaces),
    group({ class: "sx-sp-structures" }, structures),
    group({ class: "sx-sp-paths" }, paths),
    group({ class: "sx-sp-overlays" }, overlays),
    group({ class: "sx-sp-dimensions" }, dims),
    group({ class: "sx-sp-markers" }, markers),
    group({ class: "sx-sp-callouts" }, callouts),
    group({ class: "sx-sp-labels" }, labels),
  ];

  children.push(group({ class: "sx-siteplan-scene" }, scene));
  if (hasPanel) {
    children.push(svgLine({ x1: r2(panelX - 12), y1: titleBand + 14, x2: r2(panelX - 12), y2: r2(height - pad), class: "sx-sp-sheet-rule" }));
    const panelParts: string[] = [];
    let cursorY = titleBand + pad + 36;
    if (lay.north !== undefined) {
      panelParts.push(renderNorth(panelX + panelW / 2, cursorY, lay.north, fontFamily));
      cursorY += 72;
    }
    if (lay.legend && lay.legendItems.length) {
      panelParts.push(renderLegend(lay, panelX, cursorY, panelW, fontFamily));
      cursorY += 34 + Math.ceil(Math.min(lay.legendItems.length, LEGEND_LIMIT) / LEGEND_COLS) * 20;
    }
    if (lay.scale) {
      const scaleWidth = Math.min(Math.max(52, len(lay.scale)), panelW - 18);
      panelParts.push(renderScaleBar(panelX + 4, Math.max(cursorY + 26, height - pad - 34), scaleWidth, formatSiteLength(lay.scale, lay.unit), fontFamily));
    }
    children.push(group({ class: "sx-sp-accessories" }, panelParts));
  }

  return svgRoot({ width: Math.round(width), height: Math.round(height), viewBox: `0 0 ${Math.round(width)} ${Math.round(height)}`, class: "sx-sp", role: "img" }, children);
}

function renderPolygon(p: SiteplanPolygon, sx: (n: number) => number, sy: (n: number) => number, fontFamily: string): string {
  const c = centroid(p.points);
  const attrs: Record<string, string | number | undefined> = {
    points: polyPoints(p.points, sx, sy),
    class: `sx-sp-${p.role}`,
    "data-polygon": p.id,
    fill: p.fill ?? defaultPolygonFill(p.role),
  };
  return group({ class: "sx-sp-polygon" }, [
    svgPolygon(attrs),
    ...(p.role === "structure" ? renderRoofLines(p.points, sx, sy) : []),
    ...(p.label
      ? [svgText({ x: sx(c.x), y: sy(c.y), class: "sx-sp-label", "font-family": fontFamily, "text-anchor": "middle", "dominant-baseline": "central" }, p.label)]
      : []),
  ]);
}

function defaultPolygonFill(role: SiteplanPolygon["role"]): string {
  switch (role) {
    case "parcel":
      return "#fffefd";
    case "structure":
      return "url(#sx-sp-structure-hatch)";
    case "zone":
      return "#fbfdf8";
    case "landscape":
      return "url(#sx-sp-landscape-dot)";
    case "parking":
      return "url(#sx-sp-parking-hatch)";
  }
}

function renderRoofLines(points: Point[], sx: (n: number) => number, sy: (n: number) => number): string[] {
  if (points.length < 4 || points.length > 8) return [];
  const c = centroid(points);
  return points.map((p) => svgLine({ x1: sx(c.x), y1: sy(c.y), x2: sx(p.x), y2: sy(p.y), class: "sx-sp-roofline" }));
}

function renderPath(p: SiteplanPath, sx: (n: number) => number, sy: (n: number) => number, len: (n: number) => number, road: boolean): string {
  const d = pathD(p.points, sx, sy);
  const ratio = road ? 0.44 : p.role === "driveway" ? 0.42 : 0.34;
  const maxWidth = road ? 44 : p.role === "driveway" ? 24 : 16;
  const visualWidth = Math.min(Math.max(2.5, len(p.width) * ratio), maxWidth);
  if (p.role === "driveway") {
    const parts = [
      svgPath({ d, class: "sx-sp-driveway-edge", "stroke-width": r2(visualWidth + 1.8), "data-path": p.id }),
      svgPath({ d, class: "sx-sp-driveway", "stroke-width": visualWidth }),
    ];
    if (p.width >= 12) parts.push(svgPath({ d, class: "sx-sp-driveway-mark" }));
    if (p.width >= 14) parts.push(...renderDrivewayArrows(p.points, sx, sy, visualWidth));
    return group({ class: "sx-sp-path sx-sp-path-driveway" }, parts);
  }
  const parts = [svgPath({ d, class: `sx-sp-${p.role}`, "stroke-width": visualWidth, "data-path": p.id })];
  if (road) parts.push(svgPath({ d, class: "sx-sp-road-center" }));
  return group({ class: `sx-sp-path sx-sp-path-${p.role}` }, parts);
}

interface ScreenPoint {
  x: number;
  y: number;
}

function screenPoints(points: Point[], sx: (n: number) => number, sy: (n: number) => number): ScreenPoint[] {
  return points.map((p) => ({ x: sx(p.x), y: sy(p.y) }));
}

function polylineLength(points: ScreenPoint[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

function samplePolyline(points: ScreenPoint[], distance: number): { x: number; y: number; angle: number } {
  let walked = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const seg = Math.hypot(dx, dy);
    if (walked + seg >= distance) {
      const t = seg === 0 ? 0 : (distance - walked) / seg;
      return {
        x: a.x + dx * t,
        y: a.y + dy * t,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      };
    }
    walked += seg;
  }
  const a = points[Math.max(0, points.length - 2)]!;
  const b = points[points.length - 1]!;
  return { x: b.x, y: b.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}

function renderDrivewayArrows(points: Point[], sx: (n: number) => number, sy: (n: number) => number, visualWidth: number): string[] {
  const screen = screenPoints(points, sx, sy);
  const total = polylineLength(screen);
  if (total < 64) return [];
  const count = Math.min(3, Math.max(1, Math.floor(total / 180)));
  const size = Math.min(Math.max(visualWidth * 0.44, 7), 12);
  const arrows: string[] = [];
  for (let i = 0; i < count; i++) {
    const f = count === 1 ? 0.52 : (i + 1) / (count + 1);
    const s = samplePolyline(screen, total * f);
    arrows.push(renderDrivewayArrow(s.x, s.y, s.angle, size));
  }
  return arrows;
}

function renderDrivewayArrow(x: number, y: number, angle: number, size: number): string {
  const s = size;
  const d =
    `M${r2(-s * 0.55)} ${r2(-s * 0.18)} L${r2(s * 0.12)} ${r2(-s * 0.18)} ` +
    `L${r2(s * 0.12)} ${r2(-s * 0.4)} L${r2(s * 0.62)} 0 ` +
    `L${r2(s * 0.12)} ${r2(s * 0.4)} L${r2(s * 0.12)} ${r2(s * 0.18)} ` +
    `L${r2(-s * 0.55)} ${r2(s * 0.18)} Z`;
  return group({ class: "sx-sp-driveway-arrow-g", transform: `translate(${r2(x)},${r2(y)}) rotate(${r2(angle)})` }, [
    svgPath({ d, class: "sx-sp-driveway-arrow" }),
  ]);
}

function labelOnLine(points: Point[], label: string, sx: (n: number) => number, sy: (n: number) => number, fontFamily: string, cls: string, yOffset: number): string {
  let best = { a: points[0]!, b: points[Math.min(1, points.length - 1)]!, dist: -1 };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = sx(b.x) - sx(a.x);
    const dy = sy(b.y) - sy(a.y);
    const dist = Math.hypot(dx, dy);
    if (dist > best.dist) best = { a, b, dist };
  }
  const ax = sx(best.a.x);
  const ay = sy(best.a.y);
  const bx = sx(best.b.x);
  const by = sy(best.b.y);
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.max(1, Math.hypot(dx, dy));
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  const x = r2((ax + bx) / 2 + (-dy / dist) * yOffset);
  const y = r2((ay + by) / 2 + (dx / dist) * yOffset);
  return svgText(
    {
      x,
      y,
      class: cls,
      "font-family": fontFamily,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      transform: Math.abs(angle) > 3 ? `rotate(${r2(angle)} ${x} ${y})` : undefined,
    },
    label
  );
}

function renderDimension(from: Point, to: Point, label: string, sx: (n: number) => number, sy: (n: number) => number, fontFamily: string): string {
  const x1 = sx(from.x);
  const y1 = sy(from.y);
  const x2 = sx(to.x);
  const y2 = sy(to.y);
  const vertical = Math.abs(y2 - y1) > Math.abs(x2 - x1);
  const tick = 3.8;
  const tickA = (x: number, y: number): string => svgLine({ x1: r2(x - tick), y1: r2(y + tick), x2: r2(x + tick), y2: r2(y - tick), class: "sx-sp-dim" });
  const midX = r2((x1 + x2) / 2);
  const midY = r2((y1 + y2) / 2);
  const textAttrs: Record<string, string | number | undefined> = {
    class: "sx-sp-small",
    "font-family": fontFamily,
    "text-anchor": "middle",
  };
  return group({ class: "sx-sp-measure" }, [
    svgLine({ x1, y1, x2, y2, class: "sx-sp-dim" }),
    tickA(x1, y1),
    tickA(x2, y2),
    svgText(
      vertical
        ? { ...textAttrs, x: r2(midX - 6), y: midY, transform: `rotate(-90 ${r2(midX - 6)} ${midY})` }
        : { ...textAttrs, x: midX, y: r2(midY - 5) },
      label
    ),
  ]);
}

function renderMarker(kind: SiteplanMarkerKind, x: number, y: number, sizePx: number, rotate: number, label: string | undefined, fontFamily: string): string {
  const s = Math.max(8, sizePx);
  const parts: string[] = [];
  if (kind === "tree") {
    parts.push(circle({ cx: x, cy: y, r: s / 2, class: "sx-sp-marker", "data-marker": kind }));
    parts.push(circle({ cx: x, cy: y, r: s * 0.28, class: "sx-sp-marker" }));
    parts.push(svgLine({ x1: x - s * 0.42, y1: y, x2: x + s * 0.42, y2: y, class: "sx-sp-marker-line" }));
    parts.push(svgLine({ x1: x, y1: y - s * 0.42, x2: x, y2: y + s * 0.42, class: "sx-sp-marker-line" }));
  } else if (kind === "car") {
    parts.push(
      group({ transform: `translate(${x},${y}) rotate(${rotate})`, "data-marker": kind }, [
        rect({ x: -s * 0.28, y: -s * 0.5, width: s * 0.56, height: s, rx: s * 0.12, class: "sx-sp-car" }),
        svgLine({ x1: -s * 0.2, y1: -s * 0.2, x2: s * 0.2, y2: -s * 0.2, class: "sx-sp-car" }),
        svgLine({ x1: -s * 0.2, y1: s * 0.22, x2: s * 0.2, y2: s * 0.22, class: "sx-sp-car" }),
      ])
    );
  } else {
    const cls = kind === "entry" ? "sx-sp-entry" : kind === "pin" ? "sx-sp-pin" : "sx-sp-marker";
    parts.push(circle({ cx: x, cy: y, r: s / 3, class: cls, "data-marker": kind }));
  }
  if (label) parts.push(svgText({ x, y: y - s / 2 - 5, class: "sx-sp-small", "font-family": fontFamily, "text-anchor": "middle" }, label));
  return group({ class: `sx-sp-marker-${kind}` }, parts);
}

function renderNorth(x: number, y: number, deg: number, fontFamily: string): string {
  return group({ class: "sx-sp-north", transform: `translate(${x},${y})` }, [
    circle({ cx: 0, cy: 0, r: 17, fill: "none", stroke: "#475467", "stroke-width": 0.9 }),
    group({ transform: `rotate(${deg})` }, [
      svgPath({ d: "M0 -14 L5 5 L0 1 L-5 5 Z", fill: "#344054" }),
      svgLine({ x1: 0, y1: 1, x2: 0, y2: 13, stroke: "#344054", "stroke-width": 1.1 }),
    ]),
    svgText({ x: 0, y: -22, class: "sx-sp-small", "font-family": fontFamily, "text-anchor": "middle" }, "N"),
  ]);
}

function renderScaleBar(x: number, y: number, w: number, label: string, fontFamily: string): string {
  const ww = Math.max(36, w);
  const seg = ww / 4;
  const bars = [0, 1, 2, 3].map((i) =>
    rect({ x: r2(x + seg * i), y: r2(y - 4), width: r2(seg), height: 8, fill: i % 2 === 0 ? "#111827" : PAPER, stroke: "#111827", "stroke-width": 0.7 })
  );
  return group({ class: "sx-sp-scale" }, [
    ...bars,
    svgText({ x: r2(x + ww / 2), y: r2(y - 10), class: "sx-sp-small", "font-family": fontFamily, "text-anchor": "middle" }, label),
    svgText({ x, y: r2(y + 17), class: "sx-sp-small", "font-family": fontFamily, "text-anchor": "middle" }, "0"),
  ]);
}

function renderLegend(lay: SiteplanLayoutResult, x: number, y: number, availableWidth: number, fontFamily: string): string {
  const parts: string[] = [];
  const colW = Math.max(160, availableWidth / LEGEND_COLS);
  const rowH = 20;
  const items = lay.legendItems.slice(0, LEGEND_LIMIT);
  const rows = Math.ceil(items.length / LEGEND_COLS);
  const boxH = 26 + rows * rowH + 10;
  parts.push(rect({ x, y: r2(y - 16), width: availableWidth, height: boxH, rx: 3, class: "sx-sp-legend-box" }));
  parts.push(svgText({ x: x + 10, y: y, class: "sx-sp-legend-title", "font-family": fontFamily }, "Legend"));
  for (const [i, item] of items.entries()) {
    const cx = x + (i % LEGEND_COLS) * colW;
    const cy = y + 24 + Math.floor(i / LEGEND_COLS) * rowH;
    parts.push(renderLegendSymbol(item.key, cx + 10, cy - 4));
    parts.push(svgText({ x: cx + 48, y: cy, class: "sx-sp-legend-text", "font-family": fontFamily }, item.label));
  }
  return group({ class: "sx-sp-legend" }, parts);
}

function renderLegendSymbol(key: string, x: number, y: number): string {
  if (key === "tree") return circle({ cx: x + 14, cy: y - 1, r: 6, class: "sx-sp-marker" });
  if (key === "pin" || key === "entry" || key === "hydrant" || key === "well") {
    return circle({ cx: x + 14, cy: y - 1, r: 5, class: `sx-sp-${key === "pin" ? "pin" : "entry"}` });
  }
  if (["road", "driveway", "walkway", "trail"].includes(key)) {
    const width = key === "road" ? 7 : key === "driveway" ? 5 : 4;
    if (key === "driveway") {
      return group({ class: "sx-sp-legend-driveway" }, [
        svgLine({ x1: x, y1: y, x2: x + 28, y2: y, class: "sx-sp-driveway-edge", "stroke-width": width + 2 }),
        svgLine({ x1: x, y1: y, x2: x + 28, y2: y, class: "sx-sp-driveway", "stroke-width": width }),
        svgLine({ x1: x + 3, y1: y, x2: x + 25, y2: y, class: "sx-sp-driveway-mark" }),
      ]);
    }
    return svgLine({ x1: x, y1: y, x2: x + 28, y2: y, class: `sx-sp-${key}`, "stroke-width": width });
  }
  if (["setback", "easement", "fence", "utility", "frontage", "boundary"].includes(key)) {
    return svgLine({ x1: x, y1: y, x2: x + 28, y2: y, class: `sx-sp-${key}` });
  }
  const fill = key === "parcel" ? "#fffefd" : key === "structure" ? "url(#sx-sp-structure-hatch)" : key === "parking" ? "url(#sx-sp-parking-hatch)" : key === "landscape" ? "url(#sx-sp-landscape-dot)" : "#fffefd";
  return rect({ x, y: y - 7, width: 28, height: 12, rx: 1, class: `sx-sp-${key}`, fill });
}
