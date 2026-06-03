/**
 * Markov chain — semantic SVG renderer.
 *
 * Spec: docs/reference/42-MARKOV-CHAIN-STANDARD.md §"Visual conventions"
 *
 *   - States are circles with the label centred inside; absorbing states get the
 *     **double-ring** (concentric-circle) convention.
 *   - Transitions are directed arcs with an open arrowhead at the target; one arc
 *     per non-zero pᵢⱼ; opposite-direction pairs bow apart (geometry from layout).
 *   - Self-loops are first-class small loops curling off the node.
 *   - Probability labels are plain numerals at the arc midpoint / loop apex.
 *   - The computed payload (π, classification, absorbing N/B/t) is summarised in
 *     `<desc>` and surfaced via `data-*` and per-state π annotations.
 *
 * No inline style — everything is CSS classes via the svg.ts builder. The colour
 * palette is derived from the shared BaseTheme (no edits to theme.ts).
 */

import type { RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  circle,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  defs,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { parseMarkov } from "./parser";
import { layoutMarkov, MARKOV_CONST as C } from "./layout";
import type {
  MarkovArcGeom,
  MarkovAst,
  MarkovLayoutResult,
  MarkovStateBox,
} from "./types";

/** Markov palette derived from BaseTheme — no edits to the shared theme module. */
interface MarkovPalette {
  stateFill: string;
  stateStroke: string;
  absorbingAccent: string;
  arcStroke: string;
  text: string;
  textMuted: string;
  piAccent: string;
}

function palette(name: string): MarkovPalette {
  const b: BaseTheme = resolveBaseTheme(name);
  const mono = name === "monochrome";
  return {
    stateFill: b.fillMuted,
    stateStroke: b.stroke,
    absorbingAccent: mono ? b.stroke : b.accent,
    arcStroke: b.neutral,
    text: b.text,
    textMuted: b.textMuted,
    piAccent: mono ? b.text : b.accent,
  };
}

function buildCss(p: MarkovPalette): string {
  return `
.sx-markov { font-family: system-ui, -apple-system, sans-serif; }
.sx-markov-state { fill: ${p.stateFill}; stroke: ${p.stateStroke}; stroke-width: 2; }
.sx-markov-absorb-ring { fill: none; stroke: ${p.absorbingAccent}; stroke-width: 2; }
.sx-markov-state-absorbing { stroke: ${p.absorbingAccent}; }
.sx-markov-state-label { font: 600 13px sans-serif; fill: ${p.text}; }
.sx-markov-state-sublabel { font: 10px sans-serif; fill: ${p.textMuted}; }
.sx-markov-pi { font: 600 10px sans-serif; fill: ${p.piAccent}; }
.sx-markov-arc { stroke: ${p.arcStroke}; stroke-width: 1.6; fill: none; }
.sx-markov-arc-self { stroke: ${p.arcStroke}; stroke-width: 1.6; fill: none; }
.sx-markov-prob { font: 11px sans-serif; fill: ${p.text}; }
.sx-markov-title { font: 700 16px sans-serif; fill: ${p.text}; }
`.trim();
}

function markers(p: MarkovPalette): string {
  return defs([
    el(
      "marker",
      {
        id: "sx-markov-head",
        viewBox: "0 0 10 10",
        refX: 8.5,
        refY: 5,
        markerWidth: 7,
        markerHeight: 7,
        orient: "auto-start-reverse",
      },
      // Open arrowhead (two strokes), matching the canonical figures.
      [pathEl({ d: "M 0 0 L 9 5 L 0 10", fill: "none", stroke: p.arcStroke, "stroke-width": 1.4 })],
    ),
  ]);
}

// ── states ───────────────────────────────────────────────────────

function renderState(sb: MarkovStateBox): string {
  const parts: string[] = [];
  const stateClass = sb.isAbsorbing
    ? "sx-markov-state sx-markov-state-absorbing"
    : "sx-markov-state";
  parts.push(circle({ class: stateClass, cx: sb.cx, cy: sb.cy, r: sb.r }));
  // Double-ring for absorbing states (inner concentric circle).
  if (sb.isAbsorbing) {
    parts.push(circle({ class: "sx-markov-absorb-ring", cx: sb.cx, cy: sb.cy, r: sb.r - 5 }));
  }

  // Centred label (id, or human label if present).
  const labelText = sb.state.label ?? sb.state.id;
  parts.push(
    textEl(
      { class: "sx-markov-state-label", x: sb.cx, y: sb.cy + 4, "text-anchor": "middle" },
      labelText,
    ),
  );

  // π annotation under the circle when computed.
  if (sb.pi !== undefined) {
    parts.push(
      textEl(
        { class: "sx-markov-pi", x: sb.cx, y: sb.cy + sb.r + 14, "text-anchor": "middle" },
        `π=${fmt(sb.pi)}`,
      ),
    );
  }

  const attrs: Record<string, string | number | undefined> = {
    class: "sx-markov-state-g",
    "data-id": sb.state.id,
  };
  if (sb.classTag) attrs["data-class"] = sb.classTag;
  if (sb.pi !== undefined) attrs["data-pi"] = fmt(sb.pi);
  return group(attrs, parts);
}

// ── arcs ─────────────────────────────────────────────────────────

function arcPath(ag: MarkovArcGeom): string {
  const p = ag.points;
  return `M ${num(p[0]!.x)} ${num(p[0]!.y)} C ${num(p[1]!.x)} ${num(p[1]!.y)} ${num(p[2]!.x)} ${num(p[2]!.y)} ${num(p[3]!.x)} ${num(p[3]!.y)}`;
}

function renderArc(ag: MarkovArcGeom): string {
  const cls = ag.self ? "sx-markov-arc-self" : "sx-markov-arc";
  const parts: string[] = [
    pathEl({ class: cls, d: arcPath(ag), "marker-end": "url(#sx-markov-head)" }),
    textEl(
      { class: "sx-markov-prob", x: ag.labelX, y: ag.labelY + 3, "text-anchor": "middle" },
      fmt(ag.transition.probability),
    ),
  ];
  return group(
    {
      class: ag.self ? "sx-markov-arc-g sx-markov-arc-self-g" : "sx-markov-arc-g",
      "data-from": ag.transition.from,
      "data-to": ag.transition.to,
      "data-prob": fmt(ag.transition.probability),
    },
    parts,
  );
}

// ── desc / summary ───────────────────────────────────────────────

function buildDesc(layout: MarkovLayoutResult): string {
  const a = layout.analysis;
  const out: string[] = [
    `${layout.states.length} states, ${layout.arcs.length} transitions.`,
  ];

  if (a.classification) {
    const c = a.classification;
    const counts = { recurrent: 0, transient: 0, absorbing: 0 };
    for (const k of Object.values(c.byState)) counts[k]++;
    out.push(
      `Classification: ${counts.recurrent} recurrent, ${counts.transient} transient, ${counts.absorbing} absorbing.`,
    );
    if (c.absorbingStates.length) out.push(`Absorbing: ${c.absorbingStates.join(", ")}.`);
  }

  if (a.stationary) {
    if (a.stationary.unique) {
      const entries = layout.analysis.order
        .filter((id) => a.stationary!.pi[id] !== undefined)
        .map((id) => `${id}=${fmt(a.stationary!.pi[id]!)}`);
      out.push(`Stationary π: { ${entries.join(", ")} }.`);
    } else if (a.stationary.perClass.length) {
      const blocks = a.stationary.perClass.map((pc) => {
        const e = pc.states.map((id) => `${id}=${fmt(pc.pi[id]!)}`).join(", ");
        return `{ ${e} }`;
      });
      out.push(`Stationary π (per recurrent class, not globally unique): ${blocks.join("; ")}.`);
    }
  }

  if (a.absorbing) {
    const ab = a.absorbing;
    const tParts = ab.transient.map((id, i) => `${id}=${fmt(ab.t[i]!)}`);
    out.push(`Expected steps to absorption t: { ${tParts.join(", ")} }.`);
    const bRows = ab.transient.map((from, i) => {
      const probs = ab.absorbing.map((to, j) => `${to}=${fmt(ab.B[i]![j]!)}`).join(", ");
      return `${from}→(${probs})`;
    });
    out.push(`Absorption probabilities B: ${bRows.join("; ")}.`);
  }

  if (a.periods) {
    const ps = Object.entries(a.periods).map(([ci, per]) => {
      const cls = a.classification!.communicatingClasses[Number(ci)]!;
      return `{${cls.join(",")}}=${per}`;
    });
    if (ps.length) out.push(`Periods: ${ps.join(", ")}.`);
  }

  for (const note of a.notes) out.push(note);
  for (const w of layout.ast.warnings) out.push(w);
  return out.join(" ");
}

// ── top-level ────────────────────────────────────────────────────

export function renderMarkovLayout(layout: MarkovLayoutResult, config?: RenderConfig): string {
  const p = palette(config?.theme ?? "default");
  const children: string[] = [];

  children.push(titleEl(`Markov chain${layout.title ? " — " + layout.title : ""}`));
  children.push(desc(buildDesc(layout)));
  children.push(el("style", {}, buildCss(p)));
  children.push(markers(p));

  const titleBand = layout.title ? C.TITLE_BAND : 0;
  if (layout.title) {
    children.push(
      textEl(
        { x: layout.width / 2, y: 22, class: "sx-markov-title", "text-anchor": "middle" },
        layout.title,
      ),
    );
  }

  const body: string[] = [];
  body.push(group({ class: "sx-markov-arcs" }, layout.arcs.map(renderArc)));
  body.push(group({ class: "sx-markov-states" }, layout.states.map(renderState)));

  children.push(
    titleBand ? group({ transform: `translate(0, ${titleBand})` }, body) : group({}, body),
  );

  return svgRoot(
    {
      class: "sx-markov",
      role: "img",
      "aria-label": escapeXml(layout.title ?? "Markov chain"),
      width: layout.width,
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      "data-diagram-type": "markov",
    },
    children,
  );
}

export function renderMarkov(textOrAst: string | MarkovAst, config?: RenderConfig): string {
  const ast = typeof textOrAst === "string" ? parseMarkov(textOrAst) : textOrAst;
  const layout = layoutMarkov(ast);
  return renderMarkovLayout(layout, config);
}

// ── helpers ──────────────────────────────────────────────────────

/** Plain-numeral probability format: trim trailing zeros, keep small values readable. */
function fmt(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  const r = Math.round(x * 1000) / 1000;
  return String(r);
}

/** Round geometry to 2 dp for stable golden strings. */
function num(x: number): number {
  return Math.round(x * 100) / 100;
}
