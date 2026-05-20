/**
 * UML Use Case renderer — SVG output.
 *
 * Spec: docs/reference/29-USECASE-STANDARD.md §6, §10
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
  text as textEl,
  title as titleEl,
  desc,
  defs,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { parseUsecase } from "./parser";
import { layoutUsecase } from "./layout";
import type {
  UsecaseActorBox,
  UsecaseAst,
  UsecaseEdge,
  UsecaseEllipse,
  UsecaseGeneralizationTree,
  UsecaseLayoutResult,
} from "./types";

function buildCss(t: BaseTheme): string {
  // Palette tuned to match the polished house style: soft blue use-case fills,
  // a quiet rounded subject boundary, and crisp dark actor strokes.
  const ucFill = "#eaf2fc";
  const ucStroke = "#5b85c0";
  const subjectStroke = "#c2cede";
  const assocStroke = "#475569";
  return `
.sx-uc { font-family: system-ui, -apple-system, sans-serif; }
.sx-uc-subject rect { stroke: ${subjectStroke}; stroke-width: 1.4; fill: #fafbfd; }
.sx-uc-subject-title { font: 700 14px sans-serif; fill: ${t.text}; letter-spacing: 0.2px; }
.sx-uc-actor circle, .sx-uc-actor line { stroke: ${t.stroke}; stroke-width: 1.6; fill: none; stroke-linecap: round; }
.sx-uc-actor-head { fill: ${t.bg}; }
.sx-uc-actor-name { font: 600 12px sans-serif; fill: ${t.text}; }
.sx-uc-actor-system rect { stroke: ${ucStroke}; stroke-width: 1.4; fill: ${ucFill}; }
.sx-uc-usecase ellipse { stroke: ${ucStroke}; stroke-width: 1.4; fill: ${ucFill}; }
.sx-uc-name { font: 600 12px sans-serif; fill: ${t.text}; }
.sx-uc-stereotype { font: italic 10px sans-serif; fill: ${t.textMuted}; }
.sx-uc-extpoint-head { font: italic 10px sans-serif; fill: ${t.textMuted}; }
.sx-uc-extpoint { font: 10px sans-serif; fill: ${t.textMuted}; }
.sx-uc-div { stroke: ${ucStroke}; stroke-width: 1; opacity: 0.5; }
.sx-uc-assoc { stroke: ${assocStroke}; stroke-width: 1.4; fill: none; }
.sx-uc-include { stroke: ${assocStroke}; stroke-width: 1.4; fill: none; stroke-dasharray: 5 3; }
.sx-uc-extend { stroke: ${t.accent}; stroke-width: 1.4; fill: none; stroke-dasharray: 5 3; }
.sx-uc-general { stroke: ${assocStroke}; stroke-width: 1.4; fill: none; }
.sx-uc-pill { fill: ${t.bg}; opacity: 0.92; }
.sx-uc-edge-label { font: italic 10px sans-serif; fill: ${t.textMuted}; }
.sx-uc-edge-label-accent { fill: ${t.accent}; }
.sx-uc-mult { font: 10px sans-serif; fill: ${t.textMuted}; }
.sx-uc-title { font: 700 16px sans-serif; fill: ${t.text}; }
`.trim();
}

function markers(t: BaseTheme): string {
  return defs([
    el(
      "marker",
      {
        id: "sx-uc-open-arrow",
        viewBox: "0 0 10 8",
        refX: 9,
        refY: 4,
        markerWidth: 11,
        markerHeight: 9,
        orient: "auto",
      },
      [el("polyline", { points: "0,0 9,4 0,8", fill: "none", stroke: t.stroke, "stroke-width": 1.5 })],
    ),
    el(
      "marker",
      {
        id: "sx-uc-open-arrow-accent",
        viewBox: "0 0 10 8",
        refX: 9,
        refY: 4,
        markerWidth: 11,
        markerHeight: 9,
        orient: "auto",
      },
      [el("polyline", { points: "0,0 9,4 0,8", fill: "none", stroke: t.accent, "stroke-width": 1.5 })],
    ),
    el(
      "marker",
      {
        id: "sx-uc-gen-arrow",
        viewBox: "0 0 12 10",
        refX: 11,
        refY: 5,
        markerWidth: 13,
        markerHeight: 11,
        orient: "auto",
      },
      [el("polygon", { points: "0,0 11,5 0,10", fill: t.bg, stroke: t.stroke, "stroke-width": 1.5 })],
    ),
  ]);
}

const C = {
  // stick figure proportions, scaled to the 40×60 bounding box
  HEAD_R: 6,
  HEAD_CY: 8,
  BODY_TOP: 14,
  BODY_BOT: 36,
  ARM_Y: 22,
  ARM_X1: 6,
  ARM_X2: 34,
  LEG_Y: 56,
  LEG_X1: 8,
  LEG_X2: 32,
  NAME_DY: 72,
  CHAR_W: 6.4,
} as const;

function renderActor(b: UsecaseActorBox): string {
  const a = b.actor;
  const isRect = a.kind === "external" || a.kind === "system";
  if (isRect) {
    return group(
      { class: "sx-uc-actor sx-uc-actor-system", "data-id": a.id, transform: `translate(${b.x}, ${b.y})` },
      [
        rect({ x: 0, y: 0, width: b.width, height: b.height, rx: 2, ry: 2 }),
        textEl(
          { class: "sx-uc-stereotype", x: b.width / 2, y: 18, "text-anchor": "middle" },
          `«${a.stereotype ?? "actor"}»`,
        ),
        textEl(
          { class: "sx-uc-actor-name", x: b.width / 2, y: 36, "text-anchor": "middle" },
          a.name,
        ),
      ],
    );
  }

  // stick figure
  const fig: string[] = [
    circle({ class: "sx-uc-actor-head", cx: 20, cy: C.HEAD_CY, r: C.HEAD_R }),
    line({ x1: 20, y1: C.BODY_TOP, x2: 20, y2: C.BODY_BOT }),
    line({ x1: C.ARM_X1, y1: C.ARM_Y, x2: C.ARM_X2, y2: C.ARM_Y }),
    line({ x1: 20, y1: C.BODY_BOT, x2: C.LEG_X1, y2: C.LEG_Y }),
    line({ x1: 20, y1: C.BODY_BOT, x2: C.LEG_X2, y2: C.LEG_Y }),
  ];
  if (a.kind === "business") {
    // diagonal slash across the torso (upper-left to lower-right)
    fig.push(line({ class: "sx-uc-actor-slash", x1: 8, y1: C.BODY_TOP, x2: 32, y2: C.BODY_BOT }));
  }
  if (a.stereotype) {
    fig.push(
      textEl(
        { class: "sx-uc-stereotype", x: 20, y: -2, "text-anchor": "middle" },
        `«${a.stereotype}»`,
      ),
    );
  }
  fig.push(
    textEl({ class: "sx-uc-actor-name", x: 20, y: C.NAME_DY, "text-anchor": "middle" }, a.name),
  );
  return group(
    { class: "sx-uc-actor", "data-id": a.id, transform: `translate(${b.x}, ${b.y})` },
    fig,
  );
}

function renderUsecaseEllipse(e: UsecaseEllipse): string {
  const u = e.usecase;
  const parts: string[] = [
    el("ellipse", { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry }),
  ];

  // vertical text stack centered in the ellipse
  let topY: number;
  const hasExt = u.extensionPoints.length > 0;
  if (hasExt) {
    // name sits in upper half, extension points in lower
    topY = e.cy - e.ry + 18 + (u.stereotype ? 12 : 0);
  } else {
    topY = e.cy + 4;
  }

  if (u.stereotype) {
    parts.push(
      textEl(
        { class: "sx-uc-stereotype", x: e.cx, y: (hasExt ? e.cy - e.ry + 16 : e.cy - 12), "text-anchor": "middle" },
        `«${u.stereotype}»`,
      ),
    );
  }
  parts.push(
    textEl(
      { class: "sx-uc-name", x: e.cx, y: hasExt ? topY : e.cy + 4, "text-anchor": "middle" },
      u.name,
    ),
  );

  if (hasExt) {
    const divY = (hasExt ? topY : e.cy) + 8;
    parts.push(line({ class: "sx-uc-div", x1: e.cx - e.rx + 8, y1: divY, x2: e.cx + e.rx - 8, y2: divY }));
    let ty = divY + 14;
    const leftX = e.cx - e.rx + 16;
    parts.push(textEl({ class: "sx-uc-extpoint-head", x: leftX, y: ty }, "extension points"));
    ty += 13;
    for (const ep of u.extensionPoints) {
      parts.push(textEl({ class: "sx-uc-extpoint", x: leftX, y: ty }, ep));
      ty += 13;
    }
  }

  return group({ class: "sx-uc-usecase", "data-id": u.id }, parts);
}

function classForEdge(e: UsecaseEdge): string {
  switch (e.relation.kind) {
    case "include":
      return "sx-uc-include";
    case "extend":
      return "sx-uc-extend";
    case "generalization":
      return "sx-uc-general";
    default:
      return "sx-uc-assoc";
  }
}

function markerFor(e: UsecaseEdge): string | undefined {
  if (e.arrowKind === "hollow") return "url(#sx-uc-gen-arrow)";
  if (e.arrowKind === "open") {
    return e.relation.kind === "extend"
      ? "url(#sx-uc-open-arrow-accent)"
      : "url(#sx-uc-open-arrow)";
  }
  return undefined;
}

function renderEdge(e: UsecaseEdge): string {
  const attrs: Record<string, string | number> = {
    class: classForEdge(e),
    d: e.d,
    "data-source": e.relation.source,
    "data-target": e.relation.target,
  };
  const marker = markerFor(e);
  if (marker) attrs["marker-end"] = marker;
  return pathEl(attrs);
}

function renderEdgeLabel(e: UsecaseEdge): string | null {
  if (!e.label) return null;
  const rows = e.label.rows;
  const lineH = 12;
  const totalH = rows.length * lineH;
  const widest = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const pillW = widest * 6.0 + 8;
  const pillH = totalH + 4;
  const startY = e.label.cy - totalH / 2 + 9;
  const accent = e.relation.kind === "extend";
  const parts: string[] = [
    rect({
      class: "sx-uc-pill",
      x: e.label.cx - pillW / 2,
      y: e.label.cy - pillH / 2,
      width: pillW,
      height: pillH,
      rx: 4,
      ry: 4,
    }),
  ];
  rows.forEach((r, i) => {
    parts.push(
      textEl(
        {
          class: accent && i === 0 ? "sx-uc-edge-label sx-uc-edge-label-accent" : "sx-uc-edge-label",
          x: e.label!.cx,
          y: startY + i * lineH,
          "text-anchor": "middle",
        },
        r,
      ),
    );
  });
  return group({ class: "sx-uc-edge-label-g" }, parts);
}

function renderMultiplicities(e: UsecaseEdge): string[] {
  const out: string[] = [];
  if (e.multiplicityFrom) {
    out.push(
      textEl(
        { class: "sx-uc-mult", x: e.multiplicityFrom.x, y: e.multiplicityFrom.y, "text-anchor": "middle" },
        e.multiplicityFrom.text,
      ),
    );
  }
  if (e.multiplicityTo) {
    out.push(
      textEl(
        { class: "sx-uc-mult", x: e.multiplicityTo.x, y: e.multiplicityTo.y, "text-anchor": "middle" },
        e.multiplicityTo.text,
      ),
    );
  }
  return out;
}

function renderTree(tr: UsecaseGeneralizationTree): string {
  const parts: string[] = [];
  for (const leg of tr.legPaths) {
    parts.push(pathEl({ class: "sx-uc-general", d: leg }));
  }
  parts.push(pathEl({ class: "sx-uc-general", d: tr.trunkD, "marker-end": "url(#sx-uc-gen-arrow)" }));
  return group(
    { class: "sx-uc-gen-tree", "data-parent": tr.parentId },
    parts,
  );
}

export function renderUsecaseLayout(layout: UsecaseLayoutResult, config?: RenderConfig): string {
  const t = resolveBaseTheme(config?.theme ?? "default");
  const children: string[] = [];

  const nInclude = layout.ast.relations.filter((r) => r.kind === "include").length;
  const nExtend = layout.ast.relations.filter((r) => r.kind === "extend").length;
  children.push(titleEl(`Use Case Diagram${layout.title ? " — " + layout.title : ""}`));
  children.push(
    desc(
      `${layout.subject ? "Subject: " + layout.subject.name + ". " : ""}` +
        `${layout.actors.length} actors, ${layout.usecases.length} use cases, ${nInclude} include, ${nExtend} extend.`,
    ),
  );
  children.push(el("style", {}, buildCss(t)));
  children.push(markers(t));

  if (layout.title) {
    children.push(
      textEl(
        { x: layout.width / 2, y: 24, class: "sx-uc-title", "text-anchor": "middle" },
        layout.title,
      ),
    );
  }

  // subject (behind everything)
  if (layout.subject) {
    const s = layout.subject;
    const subjParts: string[] = [
      rect({ x: s.x, y: s.y, width: s.width, height: s.height, rx: 8, ry: 8 }),
    ];
    if (s.name) {
      subjParts.push(
        textEl(
          { class: "sx-uc-subject-title", x: s.x + s.width / 2, y: s.y + 24, "text-anchor": "middle" },
          s.name,
        ),
      );
    }
    children.push(group({ class: "sx-uc-subject", "data-id": "subject" }, subjParts));
  }

  // edges under nodes
  const edgeEls: string[] = [];
  for (const e of layout.edges) edgeEls.push(renderEdge(e));
  for (const tr of layout.trees) edgeEls.push(renderTree(tr));
  children.push(group({ class: "sx-uc-edges" }, edgeEls));

  // actors
  const actorEls: string[] = [];
  for (const a of layout.actors) actorEls.push(renderActor(a));
  children.push(group({ class: "sx-uc-actors" }, actorEls));

  // use cases
  const ucEls: string[] = [];
  for (const u of layout.usecases) ucEls.push(renderUsecaseEllipse(u));
  children.push(group({ class: "sx-uc-usecases" }, ucEls));

  // labels + multiplicities on top
  const labelEls: string[] = [];
  for (const e of layout.edges) {
    const lbl = renderEdgeLabel(e);
    if (lbl) labelEls.push(lbl);
    labelEls.push(...renderMultiplicities(e));
  }
  children.push(group({ class: "sx-uc-labels" }, labelEls));

  return svgRoot(
    {
      class: "sx-uc",
      role: "img",
      "aria-label": escapeXml(layout.title ?? "UML use case diagram"),
      width: layout.width,
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      "data-diagram-type": "usecase",
    },
    children,
  );
}

export function renderUsecase(textOrAst: string | UsecaseAst, config?: RenderConfig): string {
  const ast = typeof textOrAst === "string" ? parseUsecase(textOrAst) : textOrAst;
  const layout = layoutUsecase(ast);
  return renderUsecaseLayout(layout, config);
}
