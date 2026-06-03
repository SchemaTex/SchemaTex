/**
 * Causal Loop Diagram renderer — LayoutResult → semantic SVG.
 * Per docs/reference/41-CAUSAL-LOOP-STANDARD.md §"Visual conventions".
 *
 * House style (Sterman / Wikipedia "Adoption model"):
 *  - Variables are plain text labels, *boxless* (no enclosing shape).
 *  - Links are smooth curved single-arrowhead paths bowing outward.
 *  - The polarity glyph (+ / −) sits beside the arrowhead (target) end.
 *  - Each detected loop carries a blue circular-arrow R/B glyph at its
 *    centroid, the arc curling in the loop's circulation direction, with an
 *    optional descriptive phrase below.
 *  - Delay links carry two short hash ticks (‖) across the path midpoint.
 *
 * Hard rules: no inline styles (classes only), <title>/<desc>, data-*,
 * svg.ts builder.
 */

import type { RenderConfig } from "../../core/types";
import {
  el,
  group,
  line as svgLine,
  path as svgPath,
  polygon,
  svgRoot,
  text as svgText,
  title as svgTitle,
  desc as svgDesc,
} from "../../core/svg";
import { DEFAULT_FONT_FAMILY, FONT_SIZE, STROKE_WIDTH } from "../../core/theme";
import { parseCausalLoop } from "./parser";
import { layoutCausalLoop, CAUSALLOOP_CONST as C } from "./layout";
import type {
  CausalLoopGlyph,
  CausalLoopLayoutLink,
  CausalLoopLayoutNode,
  CausalLoopLayoutResult,
} from "./types";

// Self-contained colour tokens (the shared theme module is not modified).
interface CausalLoopTokens {
  bg: string;
  ink: string; // causal structure (links, labels, polarity)
  accent: string; // blue R/B loop annotation colour
  delay: string;
}

function resolveTokens(theme: string): CausalLoopTokens {
  if (theme === "dark") {
    return { bg: "#1e1e2e", ink: "#cdd6f4", accent: "#89b4fa", delay: "#cdd6f4" };
  }
  if (theme === "monochrome") {
    return { bg: "#ffffff", ink: "#111111", accent: "#111111", delay: "#111111" };
  }
  return { bg: "#ffffff", ink: "#1a1a1a", accent: "#1d6fd6", delay: "#1a1a1a" };
}

export function renderCausalLoop(text: string, config?: RenderConfig): string {
  const ast = parseCausalLoop(text);
  const layout = layoutCausalLoop(ast);
  return renderCausalLoopLayout(layout, config);
}

export function renderCausalLoopLayout(
  layout: CausalLoopLayoutResult,
  config?: RenderConfig
): string {
  const theme = resolveTokens(config?.theme ?? "default");
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast } = layout;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? "Causal loop diagram";

  const styleBlock = el(
    "style",
    {},
    `
.sx-cld-bg { fill: ${theme.bg}; }
.sx-cld-link { fill: none; stroke: ${theme.ink}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-cld-arrow { fill: ${theme.ink}; stroke: none; }
.sx-cld-var { fill: ${theme.ink}; font-size: ${FONT_SIZE.label + 1}px; font-weight: 600; }
.sx-cld-polarity { fill: ${theme.ink}; font-size: ${FONT_SIZE.label + 2}px; font-weight: 700; }
.sx-cld-link-label { fill: ${theme.ink}; font-size: ${FONT_SIZE.small}px; }
.sx-cld-delay { stroke: ${theme.delay}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-cld-glyph { fill: none; stroke: ${theme.accent}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-cld-glyph-head { fill: ${theme.accent}; stroke: none; }
.sx-cld-glyph-label { fill: ${theme.accent}; font-size: ${FONT_SIZE.label}px; font-weight: 700; }
.sx-cld-glyph-phrase { fill: ${theme.accent}; font-size: ${FONT_SIZE.small + 1}px; font-style: italic; }
.sx-cld-title { fill: ${theme.ink}; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
`.trim()
  );

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    el("rect", { x: 0, y: 0, width, height, class: "sx-cld-bg" }),
  ];

  const inner: string[] = [];

  if (ast.title) {
    inner.push(
      svgText(
        { x: C.CANVAS_PAD, y: 20, class: "sx-cld-title", "font-family": fontFamily },
        ast.title
      )
    );
  }

  // 1. Links (under labels so labels stay readable where curves pass near).
  for (const l of layout.links) inner.push(renderLink(l));

  // 2. Loop glyphs (R/B circular arrows).
  for (const g of layout.glyphs) inner.push(renderGlyph(g));

  // 3. Variable labels (boxless, on top).
  for (const n of layout.nodes) inner.push(renderVariable(n));

  children.push(
    group(
      { transform: pad ? `translate(${pad}, ${pad})` : undefined, "font-family": fontFamily },
      inner
    )
  );

  return svgRoot(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": a11y,
      "data-diagram-type": "causalloop",
    },
    children
  );
}

// ─── Variables ────────────────────────────────────────────────

function renderVariable(n: CausalLoopLayoutNode): string {
  return group({ class: "sx-cld-var-g", "data-id": n.id }, [
    svgText(
      {
        x: n.cx,
        y: n.cy + 4,
        class: "sx-cld-var",
        "text-anchor": "middle",
      },
      n.label
    ),
  ]);
}

// ─── Links ────────────────────────────────────────────────────

function renderLink(l: CausalLoopLayoutLink): string {
  const parts: string[] = [svgPath({ d: l.path, class: "sx-cld-link" })];

  // Arrowhead (filled triangle at the head, oriented along the tangent).
  parts.push(arrowhead(l.headX, l.headY, l.headTangentX, l.headTangentY));

  // Polarity glyph (+ / −) beside the arrowhead.
  parts.push(
    svgText(
      {
        x: l.polarityX,
        y: l.polarityY + 4,
        class: "sx-cld-polarity",
        "text-anchor": "middle",
      },
      l.polarity === "+" ? "+" : "−" // U+2212 MINUS SIGN
    )
  );

  // Delay hash marks.
  if (l.delay && l.delayX !== undefined && l.delayY !== undefined) {
    const nx = l.delayNormalX ?? 0;
    const ny = l.delayNormalY ?? 0;
    const half = C.DELAY_LEN / 2;
    for (const off of [-C.DELAY_GAP / 2, C.DELAY_GAP / 2]) {
      // tangent direction is perpendicular to the normal
      const tx = -ny;
      const ty = nx;
      const ox = l.delayX + tx * off;
      const oy = l.delayY + ty * off;
      parts.push(
        svgLine({
          x1: ox - nx * half,
          y1: oy - ny * half,
          x2: ox + nx * half,
          y2: oy + ny * half,
          class: "sx-cld-delay",
        })
      );
    }
  }

  // Optional link label near the midpoint, offset to the polarity side.
  if (l.label) {
    parts.push(
      svgText(
        { x: l.polarityX, y: l.polarityY + 16, class: "sx-cld-link-label", "text-anchor": "middle" },
        l.label
      )
    );
  }

  return group(
    {
      class: "sx-cld-link-g",
      "data-from": l.from,
      "data-to": l.to,
      "data-polarity": l.polarity,
      ...(l.delay ? { "data-delay": "true" } : {}),
    },
    parts
  );
}

function arrowhead(x: number, y: number, tx: number, ty: number): string {
  const len = 9;
  const wide = 4.5;
  // Base of the triangle, behind the tip along the tangent.
  const bx = x - tx * len;
  const by = y - ty * len;
  // Perpendicular.
  const px = -ty;
  const py = tx;
  const p1 = `${fmt(bx + px * wide)},${fmt(by + py * wide)}`;
  const p2 = `${fmt(bx - px * wide)},${fmt(by - py * wide)}`;
  const tip = `${fmt(x)},${fmt(y)}`;
  return polygon({ points: `${tip} ${p1} ${p2}`, class: "sx-cld-arrow" });
}

// ─── Loop glyphs ──────────────────────────────────────────────

function renderGlyph(g: CausalLoopGlyph): string {
  const r = g.r;
  // A ~300° arc with an arrowhead, curling in the loop's circulation direction.
  // Start angle and sweep chosen so the open gap + arrowhead read as a circle.
  const startAng = -Math.PI / 2; // top
  const sweep = (300 * Math.PI) / 180;
  const endAng = g.clockwise ? startAng + sweep : startAng - sweep;

  const sx = g.cx + r * Math.cos(startAng);
  const sy = g.cy + r * Math.sin(startAng);
  const ex = g.cx + r * Math.cos(endAng);
  const ey = g.cy + r * Math.sin(endAng);

  const largeArc = 1; // 300° > 180°
  const sweepFlag = g.clockwise ? 1 : 0;
  const arc = `M ${fmt(sx)} ${fmt(sy)} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${fmt(ex)} ${fmt(ey)}`;

  // Arrowhead at the arc end, tangent = derivative of the circle param.
  // d/dθ (cosθ, sinθ) = (−sinθ, cosθ); for CCW increasing θ. For clockwise we
  // traverse increasing θ too (sweepFlag 1) so tangent is (−sin, cos).
  const dir = g.clockwise ? 1 : -1;
  const tx = -Math.sin(endAng) * dir;
  const ty = Math.cos(endAng) * dir;
  const tn = Math.hypot(tx, ty) || 1;

  const label = `${g.loop.id}`;

  const parts: string[] = [
    svgPath({ d: arc, class: "sx-cld-glyph" }),
    glyphArrow(ex, ey, tx / tn, ty / tn),
    svgText(
      { x: g.cx, y: g.cy + 5, class: "sx-cld-glyph-label", "text-anchor": "middle" },
      label
    ),
  ];

  if (g.loop.phrase) {
    parts.push(
      svgText(
        { x: g.phraseX, y: g.phraseY, class: "sx-cld-glyph-phrase", "text-anchor": "middle" },
        g.loop.phrase
      )
    );
  }

  return group(
    {
      class: "sx-cld-glyph-g",
      "data-loop": g.loop.id,
      "data-kind": g.loop.kind,
      "data-vars": g.loop.variables.join(","),
      "data-negatives": String(g.loop.negativeCount),
      "data-circulation": g.clockwise ? "cw" : "ccw",
    },
    parts
  );
}

function glyphArrow(x: number, y: number, tx: number, ty: number): string {
  const len = 7;
  const wide = 3.5;
  const bx = x - tx * len;
  const by = y - ty * len;
  const px = -ty;
  const py = tx;
  const p1 = `${fmt(bx + px * wide)},${fmt(by + py * wide)}`;
  const p2 = `${fmt(bx - px * wide)},${fmt(by - py * wide)}`;
  return polygon({ points: `${fmt(x)},${fmt(y)} ${p1} ${p2}`, class: "sx-cld-glyph-head" });
}

// ─── <desc> summary ───────────────────────────────────────────

function summarise(layout: CausalLoopLayoutResult): string {
  const { ast, analysis } = layout;
  const parts: string[] = [
    `Causal loop diagram${ast.title ? ` "${ast.title}"` : ""}: ${ast.variables.length} variable${
      ast.variables.length === 1 ? "" : "s"
    }, ${ast.links.length} causal link${ast.links.length === 1 ? "" : "s"}.`,
  ];

  if (analysis.loops.length === 0) {
    parts.push("No feedback loops detected (open causal structure).");
  } else {
    parts.push(
      `${analysis.loops.length} feedback loop${analysis.loops.length === 1 ? "" : "s"}: ${analysis.reinforcing} reinforcing (R), ${analysis.balancing} balancing (B).`
    );
    for (const loop of analysis.loops) {
      const kindWord = loop.kind === "R" ? "reinforcing" : "balancing";
      const phrase = loop.phrase ? ` "${loop.phrase}"` : "";
      parts.push(
        `${loop.id}${phrase} (${kindWord}, ${loop.negativeCount} negative link${
          loop.negativeCount === 1 ? "" : "s"
        }): ${loop.variables.join(" → ")} → ${loop.variables[0]}.`
      );
    }
  }

  if (analysis.variablesInNoLoop.length > 0) {
    parts.push(`Not in any loop: ${analysis.variablesInNoLoop.join(", ")}.`);
  }
  for (const note of analysis.notes) parts.push(note);
  for (const w of ast.warnings) parts.push(w);
  return parts.join(" ");
}

// ─── Helpers ──────────────────────────────────────────────────

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}
