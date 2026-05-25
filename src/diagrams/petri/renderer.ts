/**
 * Petri net — SVG renderer.
 *
 * Spec: docs/reference/34-PETRINET-STANDARD.md §3, §6, §8
 */

import type { RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  rect,
  circle,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  defs,
  polygon,
  escapeXml,
} from "../../core/svg";
import { resolvePetriTheme, type PetriTokens, type ResolvedTheme } from "../../core/theme";
import { parsePetri } from "./parser";
import { layoutPetri, PETRI_CONST as C } from "./layout";
import type {
  PetriArcGeom,
  PetriAst,
  PetriLayoutResult,
  PetriPlaceBox,
  PetriPoint,
  PetriTransitionBox,
} from "./types";

type Theme = ResolvedTheme<PetriTokens>;

function buildCss(t: Theme): string {
  return `
.sx-petri { font-family: system-ui, -apple-system, sans-serif; }
.sx-petri-place { fill: ${t.placeFill}; stroke: ${t.placeStroke}; stroke-width: 2; }
.sx-petri-place-cap { stroke-dasharray: 4 3; }
.sx-petri-token { fill: ${t.tokenFill}; stroke: none; }
.sx-petri-token-num { font: 600 11px sans-serif; fill: ${t.tokenFill}; }
.sx-petri-bar { fill: ${t.transitionBarFill}; stroke: ${t.transitionStroke}; stroke-width: 2; }
.sx-petri-box { fill: ${t.transitionBoxFill}; stroke: ${t.transitionStroke}; stroke-width: 2; }
.sx-petri-enabled { fill: ${t.enabledFill}; stroke: ${t.enabledStroke}; stroke-width: 3; }
.sx-petri-dead .sx-petri-bar, .sx-petri-dead .sx-petri-box { stroke: ${t.deadStroke}; }
.sx-petri-dead { opacity: 0.7; }
.sx-petri-label { font: 12px sans-serif; fill: ${t.text}; }
.sx-petri-sublabel { font: italic 10px sans-serif; fill: ${t.textMuted}; }
.sx-petri-cap { font: 9px sans-serif; fill: ${t.textMuted}; }
.sx-petri-rate { font: italic 9px sans-serif; fill: ${t.textMuted}; }
.sx-petri-arc { stroke: ${t.arcStroke}; stroke-width: 2; fill: none; }
.sx-petri-arc-inhibitor, .sx-petri-arc-reset { stroke: ${t.inhibitorStroke}; }
.sx-petri-inhibitor-dot { fill: ${t.placeFill}; stroke: ${t.inhibitorStroke}; stroke-width: 2; }
.sx-petri-weight { font: 600 9px sans-serif; fill: ${t.weightLabel}; }
.sx-petri-title { font: 700 16px sans-serif; fill: ${t.text}; }
`.trim();
}

function markers(t: Theme): string {
  return defs([
    el(
      "marker",
      { id: "sx-petri-head", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: "auto-start-reverse" },
      [polygon({ points: "0,0 9,5 0,10", fill: t.arcStroke })],
    ),
    el(
      "marker",
      { id: "sx-petri-head-reset", viewBox: "0 0 16 10", refX: 15, refY: 5, markerWidth: 13, markerHeight: 9, orient: "auto-start-reverse" },
      [
        polygon({ points: "0,0 7,5 0,10", fill: t.inhibitorStroke }),
        polygon({ points: "7,0 14,5 7,10", fill: t.inhibitorStroke }),
      ],
    ),
  ]);
}

// ── token dots ──────────────────────────────────────────────────

function tokenPositions(n: number): PetriPoint[] {
  const d = C.TOKEN_R + 2.2;
  switch (n) {
    case 1:
      return [{ x: 0, y: 0 }];
    case 2:
      return [
        { x: -d, y: 0 },
        { x: d, y: 0 },
      ];
    case 3:
      return [
        { x: 0, y: -d },
        { x: -d, y: d },
        { x: d, y: d },
      ];
    default:
      return [
        { x: -d, y: -d },
        { x: d, y: -d },
        { x: -d, y: d },
        { x: d, y: d },
      ];
  }
}

function renderTokens(pb: PetriPlaceBox, style: PetriAst["tokenStyle"]): string {
  const n = pb.tokens;
  if (n <= 0) return "";
  const asDots = style !== "count" && n <= C.TOKEN_COUNT_MAX_DOTS;
  if (asDots) {
    return tokenPositions(n)
      .map((p) => circle({ class: "sx-petri-token", cx: pb.cx + p.x, cy: pb.cy + p.y, r: C.TOKEN_R }))
      .join("");
  }
  return textEl(
    { class: "sx-petri-token-num", x: pb.cx, y: pb.cy + 4, "text-anchor": "middle" },
    String(n),
  );
}

// ── places ──────────────────────────────────────────────────────

function renderPlace(pb: PetriPlaceBox, style: PetriAst["tokenStyle"]): string {
  const cls = pb.place.capacity !== undefined ? "sx-petri-place sx-petri-place-cap" : "sx-petri-place";
  const parts: string[] = [circle({ class: cls, cx: pb.cx, cy: pb.cy, r: pb.r })];
  parts.push(renderTokens(pb, style));
  // id (+ optional human label) above the circle
  const labelY = pb.cy - pb.r - C.LABEL_GAP;
  parts.push(textEl({ class: "sx-petri-label", x: pb.cx, y: labelY, "text-anchor": "middle" }, pb.place.id));
  if (pb.place.label) {
    parts.push(
      textEl({ class: "sx-petri-sublabel", x: pb.cx, y: labelY - C.LABEL_LINE_H, "text-anchor": "middle" }, pb.place.label),
    );
  }
  if (pb.place.capacity !== undefined) {
    parts.push(
      textEl({ class: "sx-petri-cap", x: pb.cx + pb.r + 3, y: pb.cy + pb.r + 9 }, `K=${pb.place.capacity}`),
    );
  }
  const attrs: Record<string, string | number | undefined> = {
    class: "sx-petri-place-g",
    "data-id": pb.place.id,
    "data-tokens": pb.tokens,
  };
  if (pb.place.capacity !== undefined) attrs["data-capacity"] = pb.place.capacity;
  if (pb.isSource) attrs["data-source"] = "true";
  if (pb.isSink) attrs["data-sink"] = "true";
  return group(attrs, parts);
}

// ── transitions ─────────────────────────────────────────────────

function renderTransition(tb: PetriTransitionBox): string {
  const x = tb.cx - tb.w / 2;
  const y = tb.cy - tb.h / 2;
  const parts: string[] = [];
  if (tb.enabled) {
    parts.push(
      rect({ class: "sx-petri-enabled", x: x - 4, y: y - 4, width: tb.w + 8, height: tb.h + 8, rx: 4, ry: 4 }),
    );
  }
  const shapeClass = tb.transition.kind === "timed" ? "sx-petri-box" : "sx-petri-bar";
  parts.push(rect({ class: shapeClass, x, y, width: tb.w, height: tb.h, rx: 1, ry: 1 }));

  // id above the shape
  const labelY = y - C.LABEL_GAP;
  parts.push(textEl({ class: "sx-petri-label", x: tb.cx, y: labelY, "text-anchor": "middle" }, tb.transition.id));
  if (tb.transition.label) {
    parts.push(
      textEl({ class: "sx-petri-sublabel", x: tb.cx, y: labelY - C.LABEL_LINE_H, "text-anchor": "middle" }, tb.transition.label),
    );
  }
  if (tb.transition.kind === "timed" && tb.transition.rate !== undefined) {
    parts.push(textEl({ class: "sx-petri-rate", x: tb.cx, y: y + tb.h + 10, "text-anchor": "middle" }, `λ=${tb.transition.rate}`));
  }
  if (tb.transition.guard) {
    parts.push(textEl({ class: "sx-petri-rate", x: tb.cx + tb.w / 2 + 4, y: tb.cy + 3 }, `[${tb.transition.guard}]`));
  }
  return group(
    {
      class: tb.dead ? "sx-petri-trans-g sx-petri-dead" : "sx-petri-trans-g",
      "data-id": tb.transition.id,
      "data-kind": tb.transition.kind,
      "data-enabled": tb.enabled ? "true" : "false",
    },
    parts,
  );
}

// ── arcs ─────────────────────────────────────────────────────────

function arcPath(ag: PetriArcGeom): string {
  const p = ag.points;
  if (p.length === 4) {
    return `M ${p[0]!.x} ${p[0]!.y} C ${p[1]!.x} ${p[1]!.y} ${p[2]!.x} ${p[2]!.y} ${p[3]!.x} ${p[3]!.y}`;
  }
  return `M ${p[0]!.x} ${p[0]!.y} L ${p[p.length - 1]!.x} ${p[p.length - 1]!.y}`;
}

function renderArc(ag: PetriArcGeom): string {
  const parts: string[] = [];
  let cls = "sx-petri-arc";
  let markerEnd: string | undefined;
  if (ag.type === "standard") {
    markerEnd = "url(#sx-petri-head)";
  } else if (ag.type === "reset") {
    cls += " sx-petri-arc-reset";
    markerEnd = "url(#sx-petri-head-reset)";
  } else if (ag.type === "inhibitor") {
    cls += " sx-petri-arc-inhibitor";
  } // read: no head, base class

  parts.push(pathEl({ class: cls, d: arcPath(ag), ...(markerEnd ? { "marker-end": markerEnd } : {}) }));

  // inhibitor: hollow circle at the transition end
  if (ag.type === "inhibitor") {
    const pts = ag.points;
    const last = pts[pts.length - 1]!;
    const prev = pts[pts.length - 2]!;
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const r = 4;
    const cx = last.x - (dx / len) * r;
    const cy = last.y - (dy / len) * r;
    parts.push(circle({ class: "sx-petri-inhibitor-dot", cx, cy, r }));
  }

  if (ag.weight > 1) {
    parts.push(
      textEl({ class: "sx-petri-weight", x: ag.labelX, y: ag.labelY + 3, "text-anchor": "middle" }, String(ag.weight)),
    );
  }
  return group(
    { class: "sx-petri-arc-g", "data-from": ag.arc.from, "data-to": ag.arc.to, "data-type": ag.type, "data-weight": ag.weight },
    parts,
  );
}

// ── top-level ────────────────────────────────────────────────────

export function renderPetriLayout(layout: PetriLayoutResult, config?: RenderConfig): string {
  const t = resolvePetriTheme(config?.theme ?? "default");
  const children: string[] = [];

  const marking = layout.places
    .filter((p) => p.tokens > 0)
    .map((p) => `${p.place.id}:${p.tokens}`)
    .join(", ");
  const descParts = [
    `${layout.places.length} places, ${layout.transitions.length} transitions, ${layout.arcs.length} arcs.`,
    marking ? `Marking {${marking}}.` : "Empty marking.",
    layout.enabledIds.length ? `Enabled: ${layout.enabledIds.join(", ")}.` : "No enabled transitions.",
    layout.subclass ? `Class: ${layout.subclass}.` : "",
  ].filter(Boolean);

  children.push(titleEl(`Petri net${layout.title ? " — " + layout.title : ""}`));
  children.push(desc(descParts.join(" ")));
  children.push(el("style", {}, buildCss(t)));
  children.push(markers(t));

  const titleBand = layout.title ? 32 : 0;
  if (layout.title) {
    children.push(textEl({ x: layout.width / 2, y: 22, class: "sx-petri-title", "text-anchor": "middle" }, layout.title));
  }

  const body: string[] = [];
  body.push(group({ class: "sx-petri-arcs" }, layout.arcs.map(renderArc)));
  body.push(group({ class: "sx-petri-places" }, layout.places.map((p) => renderPlace(p, layout.ast.tokenStyle))));
  body.push(group({ class: "sx-petri-transitions" }, layout.transitions.map(renderTransition)));

  children.push(titleBand ? group({ transform: `translate(0, ${titleBand})` }, body) : group({}, body));

  const height = layout.height + titleBand;
  return svgRoot(
    {
      class: "sx-petri",
      role: "img",
      "aria-label": escapeXml(layout.title ?? "Petri net"),
      width: layout.width,
      height,
      viewBox: `0 0 ${layout.width} ${height}`,
      "data-diagram-type": "petri",
    },
    children,
  );
}

export function renderPetri(textOrAst: string | PetriAst, config?: RenderConfig): string {
  const ast = typeof textOrAst === "string" ? parsePetri(textOrAst) : textOrAst;
  const layout = layoutPetri(ast);
  return renderPetriLayout(layout, config);
}
