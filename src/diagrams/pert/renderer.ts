/**
 * PERT renderer — semantic SVG output.
 *
 * Spec: docs/reference/32-PERT-STANDARD.md §6, §9.4
 *
 * Every computed schedule field is mirrored onto `data-*` attributes so the
 * SVG is queryable without re-running the scheduler.
 */

import type { RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  rect,
  circle,
  line,
  path as pathEl,
  polygon,
  text as textEl,
  title as titleEl,
  desc,
  defs,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { parsePert } from "./parser";
import { schedulePert } from "./scheduler";
import { layoutPert, PERT_CONST } from "./layout";
import { renderGantt } from "./gantt";
import type {
  PertAoa,
  PertAst,
  PertAxis,
  PertBox,
  PertEdge,
  PertLane,
  PertLayoutResult,
  PertSentinel,
  PertSummary,
  PertUnit,
} from "./types";

function fmtVal(n: number): string {
  return String(parseFloat(n.toFixed(2)));
}

function unitWord(unit: PertUnit): string {
  return unit === "abstract" ? "" : unit;
}

// House palette: soft blue is the resting state; a quiet red is reserved as
// the *accent* that marks the critical path — never a full-bleed red wash.
const PALETTE = {
  border: "#6f93c4",
  band: "#e7f0fb",
  fill: "#fbfdff",
  div: "#d4e1f1",
  name: "#234567",
  field: "#2c4257",
  fieldLabel: "#8497ad",
  idColor: "#728198",
  edge: "#9fb0c6",
  critBorder: "#d2604f",
  critBand: "#fbe6e0",
  critFill: "#fffaf8",
  critName: "#8a3322",
  critDiv: "#f0d0c7",
  critEdge: "#d2604f",
  sentinelFill: "#eef2f8",
  sentinelStroke: "#8497ad",
  axis: "#aebccf",
  axisBaseline: "#8497ad",
  grid: "#e3eaf3",
} as const;

function buildCss(t: BaseTheme): string {
  const P = PALETTE;
  return `
.sx-pert { font-family: system-ui, -apple-system, sans-serif; }
.sx-pert-task .task-box { fill: ${P.fill}; stroke: ${P.border}; stroke-width: 1.4; }
.sx-pert-task .name-band { fill: ${P.band}; }
.sx-pert-task.critical .task-box { stroke: ${P.critBorder}; stroke-width: 2.2; fill: ${P.critFill}; }
.sx-pert-task.critical .name-band { fill: ${P.critBand}; }
.sx-pert-div { stroke: ${P.div}; stroke-width: 1; }
.sx-pert-task.critical .sx-pert-div { stroke: ${P.critDiv}; }
.sx-pert-field { font-size: 11px; fill: ${P.field}; }
.sx-pert-field-label { font-size: 8px; fill: ${P.fieldLabel}; letter-spacing: 0.3px; }
.sx-pert-name { font-size: 13px; font-weight: 600; fill: ${P.name}; }
.sx-pert-task.critical .sx-pert-name { fill: ${P.critName}; }
.sx-pert-id { font-size: 10px; fill: ${P.idColor}; }
.sx-pert-sigma { font-size: 9px; fill: ${P.fieldLabel}; }
.sx-pert-task.critical .slack { font-weight: 700; fill: ${P.critBorder}; }
.sx-pert-ms { fill: ${P.band}; stroke: ${P.border}; stroke-width: 1.4; }
.sx-pert-task.critical .sx-pert-ms { fill: ${P.critBand}; stroke: ${P.critBorder}; stroke-width: 2.2; }
.sx-pert-task .ts-bar { fill: ${P.band}; stroke: ${P.border}; stroke-width: 1.4; }
.sx-pert-task.critical .ts-bar { fill: ${P.critBand}; stroke: ${P.critBorder}; stroke-width: 2.2; }
.sx-pert-edge { stroke: ${P.edge}; stroke-width: 1.5; fill: none; }
.sx-pert-edge.critical { stroke: ${P.critEdge}; stroke-width: 2.2; }
.sx-pert-edge-label { font-size: 10px; fill: ${P.field}; }
.sx-pert-edge-label.critical { fill: ${P.critBorder}; }
.sx-pert-edge-halo { fill: ${t.bg}; opacity: 0.92; }
.sx-pert-sentinel circle { fill: ${P.sentinelFill}; stroke: ${P.sentinelStroke}; stroke-width: 1.4; }
.sx-pert-sentinel text { font-size: 10px; fill: ${P.idColor}; }
.sx-pert-title { font-size: 16px; font-weight: 700; fill: ${t.text}; }
.sx-pert-lane line { stroke: ${P.div}; stroke-width: 1; }
.sx-pert-lane .lane-fill { fill: #f6f9fd; }
.sx-pert-lane .lane-fill.alt { fill: #eef3fa; }
.sx-pert-lane-label { font-size: 12px; font-weight: 600; fill: ${P.name}; }
.sx-pert-axis line { stroke: ${P.axis}; }
.sx-pert-axis .baseline { stroke: ${P.axisBaseline}; stroke-width: 1.2; }
.sx-pert-axis text { font-size: 9px; fill: ${P.idColor}; }
.sx-pert-grid { stroke: ${P.grid}; stroke-width: 1; }
.sx-pert-summary { font-size: 11px; fill: ${P.idColor}; }
.sx-pert-summary .crit { fill: ${P.critBorder}; font-weight: 600; }
.sx-pert-aoa-event circle { fill: ${P.band}; stroke: ${P.border}; stroke-width: 1.6; }
.sx-pert-aoa-event.critical circle { fill: ${P.critBand}; stroke: ${P.critBorder}; stroke-width: 2.4; }
.sx-pert-aoa-event text { font-size: 13px; font-weight: 700; fill: ${P.name}; }
.sx-pert-aoa-event.critical text { fill: ${P.critName}; }
.sx-pert-aoa-arc { stroke: ${P.edge}; stroke-width: 1.6; fill: none; }
.sx-pert-aoa-arc.critical { stroke: ${P.critEdge}; stroke-width: 2.4; }
.sx-pert-aoa-arc.dummy { stroke: ${P.edge}; stroke-width: 1.3; stroke-dasharray: 5 4; }
.sx-pert-aoa-name { font-size: 11px; font-weight: 600; fill: ${P.name}; }
.sx-pert-aoa-name.critical { fill: ${P.critBorder}; }
.sx-pert-aoa-dur { font-size: 10px; fill: ${P.fieldLabel}; }
.sx-pert-aoa-dur.critical { fill: ${P.critBorder}; }
`.trim();
}

function markers(): string {
  const tri = (id: string, color: string): string =>
    el(
      "marker",
      {
        id,
        viewBox: "0 0 10 10",
        refX: 9,
        refY: 5,
        markerWidth: 8,
        markerHeight: 8,
        orient: "auto-start-reverse",
      },
      [polygon({ points: "0,0 10,5 0,10", fill: color })],
    );
  return defs([tri("sx-pert-arrow", PALETTE.edge), tri("sx-pert-arrow-crit", PALETTE.critEdge)]);
}

// ─── Activity box (six-field) ────────────────────────────────────

function renderBox(b: PertBox, mode: PertLayoutResult["mode"]): string {
  if (b.milestone) return renderMilestone(b);
  if (mode === "timescaled") return renderTimescaledBar(b);
  return renderSixField(b);
}

function dataAttrs(b: PertBox): Record<string, string | number> {
  const c = b.computed;
  const attrs: Record<string, string | number> = {
    class: `sx-pert-task${c.critical ? " critical" : ""}${b.task.className ? " " + b.task.className : ""}`,
    "data-id": b.id,
    "data-es": fmtVal(c.es),
    "data-ef": fmtVal(c.ef),
    "data-ls": fmtVal(c.ls),
    "data-lf": fmtVal(c.lf),
    "data-slack": fmtVal(c.slack),
    "data-duration": fmtVal(b.task.duration),
    "data-critical": String(c.critical),
  };
  if (b.task.tags.length) attrs["data-tag"] = b.task.tags.join(" ");
  if (b.task.threePoint) {
    const tp = b.task.threePoint;
    attrs["data-pert-triple"] = `${fmtVal(tp.o)}/${fmtVal(tp.m)}/${fmtVal(tp.p)}`;
    if (b.task.variance !== undefined) attrs["data-pert-variance"] = fmtVal(b.task.variance);
  }
  return attrs;
}

function renderSixField(b: PertBox): string {
  const { x, y, width: w, height: h } = b;
  const c = b.computed;
  const col = w / 3;
  const topH = 22;
  const botH = 22;
  const yTop = y + topH;
  const yBot = y + h - botH;
  const cx = x + w / 2;

  const parts: string[] = [
    rect({ class: "task-box", x, y, width: w, height: h, rx: 4, ry: 4 }),
    rect({ class: "name-band", x: x + 0.7, y: yTop, width: w - 1.4, height: yBot - yTop }),
    line({ class: "sx-pert-div", x1: x, y1: yTop, x2: x + w, y2: yTop }),
    line({ class: "sx-pert-div", x1: x, y1: yBot, x2: x + w, y2: yBot }),
    line({ class: "sx-pert-div", x1: x + col, y1: y, x2: x + col, y2: yTop }),
    line({ class: "sx-pert-div", x1: x + 2 * col, y1: y, x2: x + 2 * col, y2: yTop }),
    line({ class: "sx-pert-div", x1: x + col, y1: yBot, x2: x + col, y2: y + h }),
    line({ class: "sx-pert-div", x1: x + 2 * col, y1: yBot, x2: x + 2 * col, y2: y + h }),
  ];

  const field = (
    fx: number,
    label: string,
    value: string,
    cls = "sx-pert-field",
  ): string =>
    group({}, [
      textEl({ class: "sx-pert-field-label", x: fx, y: y + 9, "text-anchor": "middle" }, label),
      textEl({ class: cls, x: fx, y: y + 19, "text-anchor": "middle" }, value),
    ]);

  parts.push(field(x + col / 2, "ES", fmtVal(c.es)));
  parts.push(field(x + col * 1.5, "DUR", fmtVal(b.task.duration)));
  parts.push(field(x + col * 2.5, "EF", fmtVal(c.ef)));

  // Bottom row
  const fieldBot = (fx: number, label: string, value: string, cls = "sx-pert-field"): string =>
    group({}, [
      textEl({ class: cls, x: fx, y: yBot + 13, "text-anchor": "middle" }, value),
      textEl({ class: "sx-pert-field-label", x: fx, y: yBot + 21, "text-anchor": "middle" }, label),
    ]);
  parts.push(fieldBot(x + col / 2, "LS", fmtVal(c.ls)));
  parts.push(fieldBot(x + col * 1.5, "SLACK", fmtVal(c.slack), "sx-pert-field slack"));
  parts.push(fieldBot(x + col * 2.5, "LF", fmtVal(c.lf)));

  // Middle row: name + id (+ sigma)
  const hasSigma = b.task.variance !== undefined;
  const nameY = hasSigma ? y + topH + 18 : y + topH + 19;
  parts.push(textEl({ class: "sx-pert-name", x: cx, y: nameY, "text-anchor": "middle" }, b.task.label));
  parts.push(textEl({ class: "sx-pert-id", x: cx, y: nameY + 14, "text-anchor": "middle" }, b.id));
  if (hasSigma) {
    parts.push(
      textEl(
        { class: "sx-pert-sigma", x: cx, y: nameY + 27, "text-anchor": "middle" },
        `σ=${fmtVal(Math.sqrt(b.task.variance!))}`,
      ),
    );
  }

  return group(dataAttrs(b), parts);
}

function renderMilestone(b: PertBox): string {
  const { x, y, width: w, height: h } = b;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pts = `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`;
  const parts: string[] = [
    polygon({ class: "sx-pert-ms", points: pts }),
    textEl({ class: "sx-pert-name", x: cx, y: cy - 2, "text-anchor": "middle" }, b.task.label),
    textEl({ class: "sx-pert-id", x: cx, y: cy + 12, "text-anchor": "middle" }, `@ ${fmtVal(b.computed.es)}`),
  ];
  return group(dataAttrs(b), parts);
}

function renderTimescaledBar(b: PertBox): string {
  const { x, y, width: w, height: h } = b;
  const c = b.computed;
  const cx = x + w / 2;
  const parts: string[] = [rect({ class: "task-box ts-bar", x, y, width: w, height: h, rx: 5, ry: 5 })];
  // task name sits above the bar (Gantt convention) so it never overflows
  parts.push(textEl({ class: "sx-pert-name", x, y: y - 6, "text-anchor": "start" }, `${b.task.label}`));
  // id centred in the bar
  parts.push(textEl({ class: "sx-pert-id", x: cx, y: y + h / 2 + 4, "text-anchor": "middle" }, b.id));
  const wide = w >= 104;
  if (wide) {
    parts.push(textEl({ class: "sx-pert-field-label", x: x + 7, y: y + 15, "text-anchor": "start" }, `ES ${fmtVal(c.es)}`));
    parts.push(textEl({ class: "sx-pert-field-label", x: x + w - 7, y: y + 15, "text-anchor": "end" }, `EF ${fmtVal(c.ef)}`));
    parts.push(
      textEl(
        { class: `sx-pert-field-label${c.critical ? " slack" : ""}`, x: cx, y: y + h - 8, "text-anchor": "middle" },
        `slack ${fmtVal(c.slack)}`,
      ),
    );
  }
  return group(dataAttrs(b), parts);
}

// ─── Edges ───────────────────────────────────────────────────────

function renderEdge(e: PertEdge): string {
  const cls = `sx-pert-edge${e.critical ? " critical" : ""}`;
  const marker = e.critical ? "url(#sx-pert-arrow-crit)" : "url(#sx-pert-arrow)";
  return pathEl({
    class: cls,
    d: e.d,
    "marker-end": marker,
    "data-from": e.from,
    "data-to": e.to,
    "data-type": e.type,
    "data-lag": e.lag,
    "data-critical": String(e.critical),
  });
}

function renderEdgeLabel(e: PertEdge): string | null {
  if (!e.label) return null;
  const w = e.label.text.length * 6 + 6;
  const hh = 14;
  return group({ class: "sx-pert-edge-label-g" }, [
    rect({
      class: "sx-pert-edge-halo",
      x: e.label.x - w / 2,
      y: e.label.y - hh / 2,
      width: w,
      height: hh,
      rx: 3,
      ry: 3,
    }),
    textEl(
      {
        class: `sx-pert-edge-label${e.critical ? " critical" : ""}`,
        x: e.label.x,
        y: e.label.y + 3.5,
        "text-anchor": "middle",
      },
      e.label.text,
    ),
  ]);
}

function renderLanes(lanes: PertLane[], width: number): string {
  if (lanes.length === 0) return "";
  const last = lanes[lanes.length - 1];
  const bottom = last.y + last.height;
  const parts: string[] = [];
  for (const ln of lanes) {
    parts.push(rect({ class: `lane-fill${ln.alt ? " alt" : ""}`, x: 0, y: ln.y, width, height: ln.height }));
  }
  for (const ln of lanes) {
    parts.push(line({ x1: 0, y1: ln.y, x2: width, y2: ln.y }));
  }
  parts.push(line({ x1: 0, y1: bottom, x2: width, y2: bottom }));
  parts.push(line({ x1: PERT_CONST.LANE_LABEL_W, y1: lanes[0].y, x2: PERT_CONST.LANE_LABEL_W, y2: bottom }));
  for (const ln of lanes) {
    if (!ln.name) continue;
    parts.push(
      textEl({ class: "sx-pert-lane-label", x: 16, y: ln.y + ln.height / 2 + 4, "text-anchor": "start" }, ln.name),
    );
  }
  return group({ class: "sx-pert-lane" }, parts);
}

function renderSentinel(s: PertSentinel): string {
  return group({ class: "sx-pert-sentinel", "data-id": s.id }, [
    circle({ cx: s.cx, cy: s.cy, r: s.r }),
    textEl({ x: s.cx, y: s.cy + 3.5, "text-anchor": "middle" }, s.label),
  ]);
}

function renderAxis(axis: PertAxis, gridTop: number): string {
  const parts: string[] = [];
  // gridlines at major ticks
  for (const tk of axis.ticks) {
    if (tk.major) {
      parts.push(line({ class: "sx-pert-grid", x1: tk.pos, y1: gridTop, x2: tk.pos, y2: axis.baseline }));
    }
  }
  parts.push(line({ class: "baseline", x1: axis.start, y1: axis.baseline, x2: axis.end, y2: axis.baseline }));
  for (const tk of axis.ticks) {
    const len = tk.major ? 7 : 4;
    parts.push(line({ x1: tk.pos, y1: axis.baseline, x2: tk.pos, y2: axis.baseline + len }));
    if (tk.major) {
      parts.push(
        textEl({ x: tk.pos, y: axis.baseline + 18, "text-anchor": "middle" }, fmtVal(tk.value)),
      );
    }
  }
  return group({ class: "sx-pert-axis" }, parts);
}

function renderAoa(aoa: PertAoa): string {
  const arcEls: string[] = [];
  const labelEls: string[] = [];
  for (const a of aoa.arcs) {
    const cls = `sx-pert-aoa-arc${a.dummy ? " dummy" : ""}${a.critical ? " critical" : ""}`;
    const marker = a.critical ? "url(#sx-pert-arrow-crit)" : "url(#sx-pert-arrow)";
    arcEls.push(
      pathEl({
        class: cls,
        d: a.d,
        "marker-end": marker,
        "data-from": a.from,
        "data-to": a.to,
        "data-task": a.taskId ?? "",
        "data-dummy": String(a.dummy),
        "data-critical": String(a.critical),
      }),
    );
    if (!a.dummy && a.label) {
      const critCls = a.critical ? " critical" : "";
      const durStr = fmtVal(a.duration ?? 0);
      const w = Math.max(a.label.length * 6.2, durStr.length * 6) + 8;
      labelEls.push(
        rect({ class: "sx-pert-edge-halo", x: a.labelX - w / 2, y: a.labelY - 16, width: w, height: 31, rx: 3, ry: 3 }),
      );
      labelEls.push(
        textEl({ class: `sx-pert-aoa-name${critCls}`, x: a.labelX, y: a.labelY - 4, "text-anchor": "middle" }, a.label),
      );
      labelEls.push(
        textEl({ class: `sx-pert-aoa-dur${critCls}`, x: a.labelX, y: a.labelY + 12, "text-anchor": "middle" }, durStr),
      );
    }
  }
  const eventEls: string[] = [];
  for (const e of aoa.events) {
    eventEls.push(
      group({ class: `sx-pert-aoa-event${e.critical ? " critical" : ""}`, "data-event": e.id }, [
        circle({ cx: e.x, cy: e.y, r: e.r }),
        textEl({ x: e.x, y: e.y + 4.5, "text-anchor": "middle" }, String(e.id)),
      ]),
    );
  }
  return group({ class: "sx-pert-aoa" }, [
    group({ class: "sx-pert-aoa-arcs" }, arcEls),
    group({ class: "sx-pert-aoa-labels" }, labelEls),
    group({ class: "sx-pert-aoa-events" }, eventEls),
  ]);
}

function summaryText(summary: PertSummary): { plain: string; critPath: string } {
  const u = unitWord(summary.unit);
  const dur = `${fmtVal(summary.projectDuration)}${u ? " " + u : ""}`;
  const sigma = summary.projectStdDev !== undefined ? ` · σ ≈ ${fmtVal(summary.projectStdDev)}` : "";
  const plain = `Project duration ${dur} · ${summary.taskCount} tasks · ${summary.depCount} dependencies · ${summary.criticalCount} critical${sigma}`;
  const critPath = summary.criticalPath.map((id) => id).join(" → ");
  return { plain, critPath };
}

// ─── Top-level ───────────────────────────────────────────────────

export function renderPertLayout(layout: PertLayoutResult, config?: RenderConfig): string {
  const t = resolveBaseTheme(config?.theme ?? "default");
  const children: string[] = [];

  const cp = layout.summary.criticalPath;
  children.push(titleEl(`PERT network${layout.title ? " — " + layout.title : ""}`));
  children.push(
    desc(
      `${layout.summary.taskCount} activities, project duration ${fmtVal(layout.summary.projectDuration)} ${unitWord(layout.unit)}` +
        (cp.length ? `, critical path ${cp.join(" → ")}` : "") +
        ".",
    ),
  );
  children.push(el("style", {}, buildCss(t)));
  children.push(markers());

  if (layout.title) {
    children.push(
      textEl({ x: layout.width / 2, y: 26, class: "sx-pert-title", "text-anchor": "middle" }, layout.title),
    );
  }

  if (layout.aoa) {
    children.push(renderAoa(layout.aoa));
  } else {
    // swimlane bands (under everything)
    if (layout.lanes && layout.lanes.length) {
      children.push(renderLanes(layout.lanes, layout.width));
    }

    // axis (under boxes)
    if (layout.axis) {
      let minBoxY = Infinity;
      for (const b of layout.boxes) minBoxY = Math.min(minBoxY, b.y);
      children.push(renderAxis(layout.axis, isFinite(minBoxY) ? minBoxY : layout.axis.baseline - 20));
    }

    // edges first (under boxes)
    const edgeEls: string[] = [];
    for (const e of layout.edges) edgeEls.push(renderEdge(e));
    children.push(group({ class: "sx-pert-edges" }, edgeEls));

    // sentinels
    if (layout.sentinels.length) {
      children.push(group({ class: "sx-pert-sentinels" }, layout.sentinels.map(renderSentinel)));
    }

    // boxes
    const boxEls: string[] = [];
    for (const b of layout.boxes) boxEls.push(renderBox(b, layout.mode));
    children.push(group({ class: "sx-pert-tasks" }, boxEls));

    // edge labels on top
    const labelEls: string[] = [];
    for (const e of layout.edges) {
      const lbl = renderEdgeLabel(e);
      if (lbl) labelEls.push(lbl);
    }
    children.push(group({ class: "sx-pert-labels" }, labelEls));
  }

  // summary footer
  const { plain, critPath } = summaryText(layout.summary);
  const footerY = layout.height - 12;
  const footerParts: string[] = [
    textEl({ class: "sx-pert-summary", x: PERT_PAD, y: footerY, "text-anchor": "start" }, plain),
  ];
  if (critPath) {
    footerParts.push(
      textEl(
        { class: "sx-pert-summary crit", x: layout.width - PERT_PAD, y: footerY, "text-anchor": "end" },
        `Critical path: ${critPath}`,
      ),
    );
  }
  children.push(group({ class: "sx-pert-footer" }, footerParts));

  return svgRoot(
    {
      class: "sx-pert",
      role: "img",
      "aria-label": escapeXml(layout.title ?? "PERT network diagram"),
      width: layout.width,
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      "data-diagram-type": "pert",
    },
    children,
  );
}

const PERT_PAD = 24;

export function renderPert(textOrAst: string | PertAst, config?: RenderConfig): string {
  const ast = typeof textOrAst === "string" ? parsePert(textOrAst) : textOrAst;
  const schedule = schedulePert(ast);
  if (ast.layout === "gantt") return renderGantt(ast, schedule, config);
  const layout = layoutPert(ast, schedule);
  return renderPertLayout(layout, config);
}
