/**
 * Fault Tree renderer — LayoutResult → semantic SVG.
 * Per docs/reference/37-FAULT-TREE-STANDARD.md §3, §5.6, §8.
 *
 * Output-up / inputs-down gates (mirror of the `logic` engine): AND = dome,
 * OR/XOR/VOTING = shield, INHIBIT = hexagon, PAND = dome + order condition.
 * The computed minimal cut sets are boxed in red (single points of failure in
 * the strongest red) — the first-class differentiator, the `pert` red-accent
 * stance applied to reliability.
 *
 * Hard rules: no inline styles (classes from tokens), <title>/<desc>, data-*.
 */

import type { RenderConfig } from "../../core/types";
import {
  circle,
  el,
  group,
  line as svgLine,
  multilineText,
  path as svgPath,
  rect,
  svgRoot,
  text as svgText,
  title as svgTitle,
  desc as svgDesc,
} from "../../core/svg";
import {
  DEFAULT_FONT_FAMILY,
  FONT_SIZE,
  STROKE_WIDTH,
  resolveReliabilityTheme,
} from "../../core/theme";
import { parseFaultTree } from "./parser";
import { layoutFaultTree, eventBox, FAULTTREE_CONST as C } from "./layout";
import type {
  FaultTreeAnalysis,
  FaultTreeLayoutEvent,
  FaultTreeLayoutGate,
  FaultTreeLayoutResult,
} from "./types";

export function renderFaultTree(text: string, config?: RenderConfig): string {
  const ast = parseFaultTree(text);
  const layout = layoutFaultTree(ast);
  return renderFaultTreeLayout(layout, config);
}

export function renderFaultTreeLayout(layout: FaultTreeLayoutResult, config?: RenderConfig): string {
  const theme = resolveReliabilityTheme(config?.theme ?? "default");
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast, analysis } = layout;
  const showProb = ast.analysis.probability;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? "Fault tree";

  const styleBlock = el(
    "style",
    {},
    `
.sx-ft-bg { fill: ${theme.bg}; }
.sx-ft-event { fill: ${theme.eventFill}; stroke: ${theme.eventStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-ft-event[data-role="top"] { stroke: ${theme.topEventStroke}; stroke-width: 2.25; }
.sx-ft-basic { fill: ${theme.basicFill}; stroke: ${theme.basicStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-ft-undeveloped { fill: ${theme.undevelopedFill}; stroke: ${theme.basicStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-ft-house { fill: ${theme.houseFill}; stroke: ${theme.eventStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-ft-gate { fill: ${theme.gateFill}; stroke: ${theme.gateStroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linejoin: round; }
.sx-ft-cond { fill: ${theme.conditionFill}; stroke: ${theme.eventStroke}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-ft-pin, .sx-ft-edge { fill: none; stroke: ${theme.edgeStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-ft-shared-mark { fill: none; stroke: ${theme.basicStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-ft-label { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.label}px; font-weight: 600; }
.sx-ft-id { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 700; }
.sx-ft-cap { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.small}px; }
.sx-ft-prob { fill: ${theme.probText}; font-size: ${FONT_SIZE.small}px; font-weight: 600; }
.sx-ft-gate-label { fill: ${theme.gateStroke}; font-size: ${FONT_SIZE.small}px; font-weight: 700; }
.sx-ft-cond-text { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.small}px; }
.sx-ft-cutset { fill: ${theme.cutsetFill}; stroke: ${theme.cutsetStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-ft-cutset[data-spof="true"] { stroke: ${theme.spofStroke}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-ft-ptop { fill: ${theme.probText}; font-size: ${FONT_SIZE.label}px; font-weight: 700; }
.sx-ft-transfer { fill: ${theme.eventFill}; stroke: ${theme.eventStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-ft-transfer-label { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.small}px; font-weight: 600; }
.sx-ft-title { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
`.trim()
  );

  const instById = new Map(layout.events.map((e) => [e.instanceId, e] as const));

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    rect({ x: 0, y: 0, width, height, class: "sx-ft-bg" }),
  ];

  const inner: string[] = [];

  if (ast.title) {
    inner.push(
      svgText({ x: layout.width / 2, y: 22, class: "sx-ft-title", "font-family": fontFamily, "text-anchor": "middle" }, ast.title)
    );
  }

  // 1. Cut-set boxes (behind nodes — the red frame rings each event).
  for (const box of layout.cutSetBoxes) {
    inner.push(
      rect({
        x: box.x, y: box.y, width: box.width, height: box.height,
        rx: 6,
        class: "sx-ft-cutset",
        "data-cutset": box.cutSet.events.join(","),
        "data-cutset-index": String(box.index),
        "data-order": String(box.cutSet.order),
        ...(box.cutSet.isSpof ? { "data-spof": "true" } : {}),
        ...(box.cutSet.prob !== undefined ? { "data-cutset-prob": String(box.cutSet.prob) } : {}),
      })
    );
  }

  // 2. Edges (structural links).
  for (const e of layout.edges) {
    inner.push(
      group({ class: "sx-ft-edge-g", "data-from": e.fromGateOwner, "data-to": e.to },
        [svgPath({ d: e.path, class: "sx-ft-edge" })])
    );
  }

  // 3. Gates (+ output pin up to the owner event, + conditioning ellipse).
  for (const g of layout.gates) {
    inner.push(renderGate(g, instById));
  }

  // 4. Events.
  for (const e of layout.events) {
    inner.push(renderEvent(e, showProb));
  }

  // 5. Transfer triangles.
  for (const t of layout.transfers) {
    inner.push(renderTransfer(t.x, t.y, t.name));
  }

  // 6. P(top) annotation beside the top event.
  if (showProb) {
    const top = layout.events.find((e) => e.role === "top");
    if (top) inner.push(renderTopProb(top, analysis));
  }

  children.push(
    group({ transform: pad ? `translate(${pad}, ${pad})` : undefined, "font-family": fontFamily }, inner)
  );

  return svgRoot(
    {
      width, height, viewBox: `0 0 ${width} ${height}`,
      role: "img", "aria-label": a11y, "data-diagram-type": "faulttree",
    },
    children
  );
}

// ─── Events ───────────────────────────────────────────────────

function renderEvent(e: FaultTreeLayoutEvent, showProb: boolean): string {
  const cy = e.topY + C.EVENT_H / 2;
  const parts: string[] = [];
  const label = e.event.label ?? e.event.id;

  if (e.role === "top" || e.role === "intermediate") {
    parts.push(rect({ x: e.cx - e.width / 2, y: e.topY, width: e.width, height: C.EVENT_H, rx: C.EVENT_RX, class: "sx-ft-event", "data-role": e.role }));
    parts.push(multilineText({ x: e.cx, y: cy, class: "sx-ft-label", "text-anchor": "middle", "dominant-baseline": "middle" }, eventBox(label).lines.join("<br/>"), 14));
  } else if (e.role === "basic") {
    parts.push(circle({ cx: e.cx, cy, r: C.BASIC_R, class: "sx-ft-basic" }));
    if (e.shared) parts.push(svgLine({ x1: e.cx - 5, y1: cy + C.BASIC_R - 5, x2: e.cx + 5, y2: cy + C.BASIC_R - 5, class: "sx-ft-shared-mark" }));
    parts.push(svgText({ x: e.cx, y: cy + 3, class: "sx-ft-id", "text-anchor": "middle" }, e.event.id));
    parts.push(...leafCaption(e, cy + C.BASIC_R, label, showProb));
  } else if (e.role === "undeveloped") {
    const r = C.DIAMOND_W / 2;
    parts.push(svgPath({ d: `M ${e.cx} ${cy - r} L ${e.cx + r} ${cy} L ${e.cx} ${cy + r} L ${e.cx - r} ${cy} Z`, class: "sx-ft-undeveloped" }));
    parts.push(svgText({ x: e.cx, y: cy + 3, class: "sx-ft-id", "text-anchor": "middle" }, e.event.id));
    parts.push(...leafCaption(e, cy + r, label, showProb));
  } else if (e.role === "house") {
    const w = C.HOUSE_W, h = C.HOUSE_H, roofH = h * 0.34;
    const top = cy - h / 2, bottom = cy + h / 2, L = e.cx - w / 2, R = e.cx + w / 2;
    parts.push(svgPath({ d: `M ${L} ${bottom} L ${R} ${bottom} L ${R} ${top + roofH} L ${e.cx} ${top} L ${L} ${top + roofH} Z`, class: "sx-ft-house" }));
    parts.push(svgText({ x: e.cx, y: cy + roofH / 2 + 3, class: "sx-ft-id", "text-anchor": "middle" }, `${e.event.id}=${e.event.state ?? 1}`));
    parts.push(...leafCaption(e, bottom, label, false));
  }

  return group(
    {
      class: "sx-ft-event-g",
      "data-id": e.event.id,
      "data-role": e.role,
      ...(e.event.prob !== undefined ? { "data-prob": String(e.event.prob) } : {}),
      ...(e.event.state !== undefined ? { "data-state": String(e.event.state) } : {}),
      ...(e.shared ? { "data-shared-id": e.event.id } : {}),
    },
    parts
  );
}

/** Label (one line, below the shape) + probability, for leaf events. */
function leafCaption(e: FaultTreeLayoutEvent, shapeBottom: number, label: string, showProb: boolean): string[] {
  const out: string[] = [];
  const hasOwnLabel = !!e.event.label && e.event.label !== e.event.id;
  // CAP_GAP clears the widest (capped) cut-set box below the shape.
  if (hasOwnLabel) {
    out.push(svgText({ x: e.cx, y: shapeBottom + C.CAP_GAP, class: "sx-ft-cap", "text-anchor": "middle" }, clip(label, 20)));
  }
  if (showProb && e.event.prob !== undefined) {
    const y = shapeBottom + (hasOwnLabel ? C.CAP_GAP + C.CAP_LINE_H : C.CAP_GAP);
    out.push(svgText({ x: e.cx, y, class: "sx-ft-prob", "text-anchor": "middle" }, `p=${fmtProb(e.event.prob)}`));
  }
  return out;
}

// ─── Gates ────────────────────────────────────────────────────

function renderGate(g: FaultTreeLayoutGate, instById: Map<string, FaultTreeLayoutEvent>): string {
  const { cx, cy, width: w, height: h } = g;
  const top = cy - h / 2, bottom = cy + h / 2, L = cx - w / 2, R = cx + w / 2;
  const parts: string[] = [];

  // Output pin up to the owner event's bottom edge.
  const owner = instById.get(g.ownerInstanceId);
  if (owner) parts.push(svgLine({ x1: cx, y1: top, x2: cx, y2: owner.topY + C.EVENT_H, class: "sx-ft-pin" }));

  const kind = g.gate.kind;
  if (kind === "and" || kind === "pand") {
    parts.push(svgPath({ d: `M ${L} ${bottom} L ${L} ${cy} A ${w / 2} ${h / 2} 0 0 1 ${R} ${cy} L ${R} ${bottom} Z`, class: "sx-ft-gate" }));
  } else if (kind === "inhibit") {
    parts.push(svgPath({ d: `M ${cx} ${top} L ${R} ${cy - h / 4} L ${R} ${cy + h / 4} L ${cx} ${bottom} L ${L} ${cy + h / 4} L ${L} ${cy - h / 4} Z`, class: "sx-ft-gate" }));
  } else {
    // OR / XOR / VOTING — shield: concave bottom, two curved sides to a top point.
    const bz = bottom - 9;
    parts.push(svgPath({ d: `M ${L} ${bottom} Q ${cx} ${bz} ${R} ${bottom} Q ${R} ${cy - h / 4} ${cx} ${top} Q ${L} ${cy - h / 4} ${L} ${bottom} Z`, class: "sx-ft-gate" }));
    if (kind === "xor") parts.push(svgPath({ d: `M ${L + 2} ${bottom + 4} Q ${cx} ${bz + 4} ${R - 2} ${bottom + 4}`, class: "sx-ft-pin" }));
    if (kind === "voting") parts.push(svgText({ x: cx, y: cy + 4, class: "sx-ft-gate-label", "text-anchor": "middle" }, `${g.gate.k}/${g.gate.n}`));
  }

  // Conditioning ellipse (INHIBIT / PAND).
  if (g.cond) {
    parts.push(svgLine({ x1: R, y1: cy, x2: g.cond.x - g.cond.w / 2, y2: g.cond.y, class: "sx-ft-pin" }));
    parts.push(el("ellipse", { cx: g.cond.x, cy: g.cond.y, rx: g.cond.w / 2, ry: g.cond.h / 2, class: "sx-ft-cond" }));
    parts.push(multilineText({ x: g.cond.x, y: g.cond.y, class: "sx-ft-cond-text", "text-anchor": "middle", "dominant-baseline": "middle" }, wrap(g.cond.text, 14), 11));
  }

  return group(
    {
      class: "sx-ft-gate-g",
      "data-id": g.ownerInstanceId,
      "data-gate": kind,
      ...(kind === "voting" ? { "data-k": String(g.gate.k), "data-n": String(g.gate.n) } : {}),
      ...(g.gate.condition ? { "data-condition": g.gate.condition } : {}),
    },
    parts
  );
}

// ─── Transfer triangle ────────────────────────────────────────

function renderTransfer(x: number, y: number, name: string): string {
  const s = 16;
  return group({ class: "sx-ft-transfer-g", "data-link": name, "data-dir": "out" }, [
    svgPath({ d: `M ${x} ${y + s} L ${x - s} ${y} L ${x + s} ${y} Z`, class: "sx-ft-transfer" }),
    svgText({ x: x + s + 4, y: y + s / 2 + 3, class: "sx-ft-transfer-label" }, name),
  ]);
}

// ─── P(top) ───────────────────────────────────────────────────

function renderTopProb(top: FaultTreeLayoutEvent, analysis: FaultTreeAnalysis): string {
  // Centred just above the top event box (avoids overflowing the canvas width).
  const x = top.cx;
  const y = top.topY - 9;
  return svgText({ x, y, class: "sx-ft-ptop", "text-anchor": "middle" }, topProbLabel(analysis));
}

export function topProbLabel(analysis: FaultTreeAnalysis): string {
  if (analysis.unsatisfiable) return "P(top) = 0 — no cut sets";
  if (analysis.topProb === undefined) return "P(top) = n/a (missing p)";
  return `P(top) = ${fmtProb(analysis.topProb)} (${analysis.method})`;
}

// ─── <desc> summary ───────────────────────────────────────────

function summarise(layout: FaultTreeLayoutResult): string {
  const { ast, analysis } = layout;
  const counts: Record<string, number> = {};
  for (const e of ast.events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  const evStr = Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(", ");
  const top = ast.events.find((e) => e.kind === "top");
  const parts: string[] = [`Fault tree${top ? ` for "${top.label ?? top.id}"` : ""}: ${evStr}.`];

  if (ast.analysis.cutsets) {
    if (analysis.unsatisfiable) {
      parts.push("No cut sets — the top event cannot occur with the current house states.");
    } else if (analysis.cutSets.length > 0) {
      const spofs = analysis.cutSets.filter((c) => c.isSpof).map((c) => c.events[0]);
      const setsStr = analysis.cutSets.map((c) => `{${c.events.join(", ")}}`).join(", ");
      parts.push(`${analysis.cutSets.length} minimal cut set${analysis.cutSets.length > 1 ? "s" : ""}: ${setsStr}.`);
      if (spofs.length > 0) parts.push(`Single point${spofs.length > 1 ? "s" : ""} of failure: ${spofs.join(", ")}.`);
    }
  }
  if (ast.analysis.probability) {
    if (analysis.topProb !== undefined) parts.push(`P(top) = ${fmtProb(analysis.topProb)} (${analysis.method}).`);
    else if (analysis.missingProb.length > 0) parts.push(`P(top) = n/a — missing p on ${analysis.missingProb.join(", ")}.`);
  }
  for (const n of analysis.notes) parts.push(n);
  for (const w of analysis.warnings) parts.push(w);
  return parts.join(" ");
}

// ─── Helpers ──────────────────────────────────────────────────

function fmtProb(n: number): string {
  if (n === 0) return "0";
  if (n >= 0.001) return String(parseFloat(n.toPrecision(3)));
  return n.toExponential(2);
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

/** Soft-wrap a label into <=2 lines (<br/>-joined) for in-box text. */
function wrap(s: string, perLine: number): string {
  if (s.length <= perLine) return s;
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur.length + 1 + w.length) > perLine) { lines.push(cur); cur = w; }
    else cur = cur ? `${cur} ${w}` : w;
    if (lines.length === 1 && (cur.length + 1) > perLine) break;
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) { lines.length = 2; lines[1] = clip(lines[1]!, perLine); }
  return lines.join("<br/>");
}
