/**
 * Reliability Block Diagram renderer — LayoutResult → semantic SVG.
 * Per docs/reference/50-RBD-STANDARD.md §3, §6.
 *
 * Shares the risk-reliability colour cluster (fault tree / bowtie): neutral
 * block bodies, blue reserved for the computed reliability numerals, red
 * reserved for single points of failure (a block whose failure alone fails the
 * system). The computed system reliability is the headline — the "engine
 * computes the answer" stance applied to IEC 61078.
 *
 * Hard rules: no inline styles (classes from tokens), <title>/<desc>, data-*.
 */

import type { RenderConfig } from "../../core/types";
import {
  circle,
  el,
  group,
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
import { parseRbd } from "./parser";
import { layoutRbd, RBD_CONST as C } from "./layout";
import type { RbdAnalysis, RbdLayoutBlock, RbdLayoutResult } from "./types";

export function renderRbd(text: string, config?: RenderConfig): string {
  const ast = parseRbd(text);
  const layout = layoutRbd(ast);
  return renderRbdLayout(layout, config);
}

export function renderRbdLayout(layout: RbdLayoutResult, config?: RenderConfig): string {
  const theme = resolveReliabilityTheme(config?.theme ?? "default");
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast, analysis } = layout;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? "Reliability block diagram";

  const styleBlock = el(
    "style",
    {},
    `
.sx-rbd-bg { fill: ${theme.bg}; }
.sx-rbd-wire { fill: none; stroke: ${theme.edgeStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-rbd-node { fill: ${theme.edgeStroke}; stroke: none; }
.sx-rbd-term { fill: ${theme.eventFill}; stroke: ${theme.eventStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-rbd-block { fill: ${theme.eventFill}; stroke: ${theme.eventStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-rbd-block[data-spof="true"] { stroke: ${theme.spofStroke}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-rbd-block[data-critical="true"] { stroke: ${theme.gateStroke}; stroke-width: 2.25; }
.sx-rbd-label { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.label}px; font-weight: 600; }
.sx-rbd-r { fill: ${theme.probText}; font-size: ${FONT_SIZE.small}px; font-weight: 600; }
.sx-rbd-mark { fill: ${theme.gateStroke}; font-size: ${FONT_SIZE.small}px; font-weight: 700; }
.sx-rbd-rsys { fill: ${theme.probText}; font-size: ${FONT_SIZE.label + 1}px; font-weight: 700; }
.sx-rbd-title { fill: ${theme.eventStroke}; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
`.trim()
  );

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    rect({ x: 0, y: 0, width, height, class: "sx-rbd-bg" }),
  ];

  const inner: string[] = [];

  if (ast.title) {
    inner.push(
      svgText(
        { x: C.CANVAS_PAD, y: 22, class: "sx-rbd-title", "font-family": fontFamily },
        ast.title
      )
    );
  }

  // System reliability headline (centred, top).
  inner.push(
    svgText(
      {
        x: layout.width / 2,
        y: (ast.title ? C.TITLE_H : 0) + 18,
        class: "sx-rbd-rsys",
        "text-anchor": "middle",
      },
      systemLabel(analysis, ast.mission)
    )
  );

  // 1. Wires (behind nodes/blocks).
  for (const w of layout.wires) inner.push(svgPath({ d: w.path, class: "sx-rbd-wire" }));

  // 2. Split/join + terminal nodes.
  for (const n of layout.nodes) {
    if (n.kind === "in" || n.kind === "out") {
      inner.push(circle({ cx: n.x, cy: n.y, r: 6, class: "sx-rbd-term", "data-node": n.kind }));
    } else {
      inner.push(circle({ cx: n.x, cy: n.y, r: C.NODE_R, class: "sx-rbd-node", "data-node": n.kind }));
    }
  }

  // 3. k-of-n marks.
  for (const mk of layout.marks) {
    inner.push(svgText({ x: mk.x, y: mk.y, class: "sx-rbd-mark" }, mk.text));
  }

  // 4. Blocks.
  for (const b of layout.blocks) inner.push(renderBlock(b));

  children.push(
    group({ transform: pad ? `translate(${pad}, ${pad})` : undefined, "font-family": fontFamily }, inner)
  );

  return svgRoot(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": a11y,
      "data-diagram-type": "rbd",
    },
    children
  );
}

// ─── Block ────────────────────────────────────────────────────

function renderBlock(b: RbdLayoutBlock): string {
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const label = b.block.label ?? b.block.id;
  const parts: string[] = [
    rect({
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      rx: C.BLOCK_RX,
      class: "sx-rbd-block",
      ...(b.isSpof ? { "data-spof": "true" } : {}),
      ...(b.critical && !b.isSpof ? { "data-critical": "true" } : {}),
    }),
    multilineText(
      { x: cx, y: cy, class: "sx-rbd-label", "text-anchor": "middle", "dominant-baseline": "middle" },
      wrap(label, 18),
      13
    ),
  ];

  if (b.R !== undefined) {
    parts.push(
      svgText(
        { x: cx, y: b.y + b.height + C.CAP_GAP, class: "sx-rbd-r", "text-anchor": "middle" },
        `R=${fmtR(b.R)}`
      )
    );
  }

  return group(
    {
      class: "sx-rbd-block-g",
      "data-id": b.block.id,
      ...(b.R !== undefined ? { "data-r": String(b.R) } : {}),
      ...(b.isSpof ? { "data-spof": "true" } : {}),
      ...(b.critical ? { "data-critical": "true" } : {}),
    },
    parts
  );
}

// ─── Text helpers ─────────────────────────────────────────────

export function systemLabel(analysis: RbdAnalysis, mission?: number): string {
  if (analysis.systemReliability === undefined) {
    const miss = analysis.missing.length > 0 ? ` — missing R on ${analysis.missing.join(", ")}` : "";
    return `System reliability: n/a${miss}`;
  }
  const arg = mission !== undefined ? `(t=${fmtVal(mission)})` : "";
  return `System reliability  R${arg} = ${fmtR(analysis.systemReliability)}`;
}

function fmtVal(n: number): string {
  return String(parseFloat(n.toFixed(2)));
}

function fmtR(n: number): string {
  if (n >= 1) return "1";
  if (n <= 0) return "0";
  // Reliabilities cluster near 1, where the "number of nines" is the whole point.
  // Start at 5 significant figures, but never let rounding collapse a sub-1
  // reliability to "1" (which would hide the nines) — add precision until it shows.
  for (let p = 5; p <= 9; p++) {
    const s = parseFloat(n.toPrecision(p));
    if (s < 1) return String(s);
  }
  return String(parseFloat(n.toPrecision(9)));
}

function summarise(layout: RbdLayoutResult): string {
  const { analysis } = layout;
  const n = layout.blocks.length;
  const parts: string[] = [`Reliability block diagram: ${n} block${n === 1 ? "" : "s"}.`];
  if (analysis.systemReliability !== undefined) {
    parts.push(`System reliability R = ${fmtR(analysis.systemReliability)}.`);
  } else if (analysis.missing.length > 0) {
    parts.push(`System reliability n/a — missing R on ${analysis.missing.join(", ")}.`);
  }
  const spofs = analysis.blocks.filter((b) => b.isSpof).map((b) => b.id);
  if (spofs.length > 0) parts.push(`Single point${spofs.length > 1 ? "s" : ""} of failure: ${spofs.join(", ")}.`);
  if (analysis.criticalBlock) parts.push(`Highest reliability-importance block: ${analysis.criticalBlock}.`);
  for (const note of analysis.notes) parts.push(note);
  for (const w of analysis.warnings) parts.push(w);
  return parts.join(" ");
}

function wrap(s: string, perLine: number): string {
  if (s.length <= perLine) return s;
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > perLine) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) {
    lines.length = 2;
    lines[1] = lines[1]!.slice(0, perLine - 1) + "…";
  }
  return lines.join("<br/>");
}
