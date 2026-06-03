/**
 * IDEF0 renderer — LayoutResult → semantic SVG.
 * Per docs/reference/45-IDEF0-STANDARD.md §"Visual conventions".
 *
 * Draws: function boxes (name centred, box number lower-right corner); ICOM
 * arrows on the four mandated sides with arrowheads + labels at the open end;
 * the diagonal staircase arrangement; the page frame + bottom title block
 * (Node / Title / Number). Boundary arrows carry their ICOM code (I1/C1/O1/M1).
 *
 * Hard rules: no inline styles (classes from a <style> block driven by theme
 * tokens), <title>/<desc>, data-* for interactivity, svg.ts builder only.
 */

import type { RenderConfig } from "../../core/types";
import {
  group,
  line as svgLine,
  multilineText,
  path as svgPath,
  polygon,
  rect,
  svgRoot,
  text as svgText,
  title as svgTitle,
  desc as svgDesc,
  el,
} from "../../core/svg";
import {
  DEFAULT_FONT_FAMILY,
  FONT_SIZE,
  STROKE_WIDTH,
  resolveBaseTheme,
} from "../../core/theme";
import { parseIdef0 } from "./parser";
import { layoutIdef0, IDEF0_CONST as C } from "./layout";
import type {
  BoxSide,
  Idef0LayoutArrow,
  Idef0LayoutBox,
  Idef0LayoutResult,
} from "./types";

export function renderIdef0(text: string, config?: RenderConfig): string {
  const ast = parseIdef0(text);
  const layout = layoutIdef0(ast);
  return renderIdef0Layout(layout, config);
}

export function renderIdef0Layout(layout: Idef0LayoutResult, config?: RenderConfig): string {
  const theme = resolveBaseTheme(config?.theme ?? "default");
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast } = layout;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? "IDEF0 function model";

  const styleBlock = el(
    "style",
    {},
    `
.sx-idef0-bg { fill: ${theme.bg}; }
.sx-idef0-frame { fill: none; stroke: ${theme.stroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-idef0-box { fill: ${theme.fillMuted}; stroke: ${theme.stroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-idef0-box-name { fill: ${theme.text}; font-size: ${FONT_SIZE.label}px; font-weight: 600; }
.sx-idef0-box-num { fill: ${theme.textMuted}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 700; }
.sx-idef0-arrow { fill: none; stroke: ${theme.stroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-idef0-arrow[data-margin="true"] { stroke: ${theme.accent}; }
.sx-idef0-arrow[data-tunneled="true"] { stroke-dasharray: 5 3; }
.sx-idef0-head { fill: ${theme.stroke}; }
.sx-idef0-arrow[data-margin="true"] + .sx-idef0-head, .sx-idef0-head[data-margin="true"] { fill: ${theme.accent}; }
.sx-idef0-label { fill: ${theme.text}; font-size: ${FONT_SIZE.small + 1}px; }
.sx-idef0-icom { fill: ${theme.textMuted}; font-size: ${FONT_SIZE.small}px; font-weight: 700; }
.sx-idef0-title { fill: ${theme.text}; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
.sx-idef0-meta { fill: ${theme.textMuted}; font-size: ${FONT_SIZE.small + 1}px; }
.sx-idef0-tb { fill: none; stroke: ${theme.stroke}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-idef0-tb-text { fill: ${theme.text}; font-size: ${FONT_SIZE.small + 1}px; }
.sx-idef0-tb-key { fill: ${theme.textMuted}; font-size: ${FONT_SIZE.small}px; font-weight: 700; }
`.trim()
  );

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    rect({ x: 0, y: 0, width, height, class: "sx-idef0-bg" }),
  ];

  const inner: string[] = [];

  // Title.
  if (ast.title) {
    inner.push(
      svgText({ x: C.MARGIN, y: 24, class: "sx-idef0-title", "font-family": fontFamily }, ast.title)
    );
  }

  // Arrows (under boxes so heads sit cleanly at the edge).
  for (const a of layout.arrows) {
    inner.push(renderArrow(a));
  }

  // Boxes.
  for (const b of layout.boxes) {
    inner.push(renderBox(b));
  }

  // A-0 metadata (purpose / viewpoint).
  let metaY = layout.height - C.TITLEBLOCK_H - 4;
  if (ast.viewpoint) {
    inner.push(svgText({ x: C.MARGIN, y: metaY, class: "sx-idef0-meta" }, `Viewpoint: ${ast.viewpoint}`));
    metaY -= 16;
  }
  if (ast.purpose) {
    inner.push(svgText({ x: C.MARGIN, y: metaY, class: "sx-idef0-meta" }, `Purpose: ${ast.purpose}`));
  }

  // Title block (Node / Title / Number).
  inner.push(renderTitleBlock(layout.width, layout.height, ast.node, ast.title ?? ""));

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
      "data-diagram-type": "idef0",
    },
    children
  );
}

// ─── Box ──────────────────────────────────────────────────────

function renderBox(b: Idef0LayoutBox): string {
  const parts: string[] = [
    rect({ x: b.x, y: b.y, width: b.width, height: b.height, class: "sx-idef0-box" }),
    multilineText(
      {
        x: b.x + b.width / 2,
        y: b.y + b.height / 2,
        class: "sx-idef0-box-name",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      },
      wrap(b.box.name, 18),
      14
    ),
    // Box number in the lower-right interior corner.
    svgText(
      { x: b.x + b.width - 6, y: b.y + b.height - 6, class: "sx-idef0-box-num", "text-anchor": "end" },
      String(b.box.number)
    ),
  ];
  return group(
    {
      class: "sx-idef0-box-g",
      "data-id": b.box.id,
      "data-number": String(b.box.number),
      ...(b.box.nodeNumber ? { "data-node": b.box.nodeNumber } : {}),
    },
    parts
  );
}

// ─── Arrow ────────────────────────────────────────────────────

function renderArrow(a: Idef0LayoutArrow): string {
  const parts: string[] = [
    svgPath({
      d: a.path,
      class: "sx-idef0-arrow",
      ...(a.margin ? { "data-margin": "true" } : {}),
      ...(a.arrow.tunneled ? { "data-tunneled": "true" } : {}),
    }),
    arrowHead(a.head.x, a.head.y, a.head.dir, a.margin),
  ];

  // Label at the open end.
  if (a.arrow.label) {
    parts.push(
      svgText(
        { x: a.label.x, y: a.label.y, class: "sx-idef0-label", "text-anchor": a.label.anchor },
        a.arrow.label
      )
    );
  }
  // ICOM boundary code (I1/C1/O1/M1) near the frame end.
  if (a.arrow.icomCode) {
    parts.push(
      svgText(
        { x: a.label.x, y: a.label.y + 13, class: "sx-idef0-icom", "text-anchor": a.label.anchor },
        a.arrow.icomCode
      )
    );
  }

  return group(
    {
      class: "sx-idef0-arrow-g",
      "data-role": a.arrow.role,
      "data-side": sideOf(a.arrow.role),
      ...(a.arrow.icomCode ? { "data-icom": a.arrow.icomCode } : {}),
      ...(a.arrow.tunneled ? { "data-tunneled": "true" } : {}),
    },
    parts
  );
}

function sideOf(role: Idef0LayoutArrow["arrow"]["role"]): BoxSide {
  switch (role) {
    case "input":
      return "left";
    case "control":
      return "top";
    case "output":
      return "right";
    case "mechanism":
    case "call":
      return "bottom";
  }
}

/** Filled triangle head, pointing in `dir` (the direction of travel). */
function arrowHead(x: number, y: number, dir: BoxSide, margin: boolean): string {
  const s = C.ARROW_HEAD;
  let pts: string;
  switch (dir) {
    case "left":
      pts = `${x},${y} ${x + s},${y - s / 2} ${x + s},${y + s / 2}`;
      break;
    case "right":
      pts = `${x},${y} ${x - s},${y - s / 2} ${x - s},${y + s / 2}`;
      break;
    case "top":
      pts = `${x},${y} ${x - s / 2},${y + s} ${x + s / 2},${y + s}`;
      break;
    case "bottom":
      pts = `${x},${y} ${x - s / 2},${y - s} ${x + s / 2},${y - s}`;
      break;
  }
  return polygon({ points: pts, class: "sx-idef0-head", ...(margin ? { "data-margin": "true" } : {}) });
}

// ─── Title block ──────────────────────────────────────────────

function renderTitleBlock(width: number, height: number, node: string, title: string): string {
  const h = C.TITLEBLOCK_H;
  const y = height - h;
  const x0 = C.MARGIN / 2;
  const x1 = width - C.MARGIN / 2;
  const w = x1 - x0;
  const c1 = x0 + w * 0.22;
  const c2 = x0 + w * 0.78;

  return group({ class: "sx-idef0-titleblock" }, [
    rect({ x: x0, y, width: w, height: h, class: "sx-idef0-tb" }),
    svgLine({ x1: c1, y1: y, x2: c1, y2: y + h, class: "sx-idef0-tb" }),
    svgLine({ x1: c2, y1: y, x2: c2, y2: y + h, class: "sx-idef0-tb" }),
    svgText({ x: x0 + 6, y: y + 13, class: "sx-idef0-tb-key" }, "NODE"),
    svgText({ x: x0 + 6, y: y + 27, class: "sx-idef0-tb-text" }, node),
    svgText({ x: c1 + 6, y: y + 13, class: "sx-idef0-tb-key" }, "TITLE"),
    svgText({ x: c1 + 6, y: y + 27, class: "sx-idef0-tb-text" }, clip(title || "—", 60)),
    svgText({ x: c2 + 6, y: y + 13, class: "sx-idef0-tb-key" }, "NUMBER"),
  ]);
}

// ─── <desc> summary ───────────────────────────────────────────

function summarise(layout: Idef0LayoutResult): string {
  const { ast } = layout;
  const counts: Record<string, number> = {};
  for (const a of ast.arrows) counts[a.role] = (counts[a.role] ?? 0) + 1;
  const arrowStr = Object.entries(counts)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  const parts: string[] = [
    `IDEF0 function model${ast.title ? ` "${ast.title}"` : ""} (node ${ast.node}): ${ast.boxes.length} function${ast.boxes.length === 1 ? "" : "s"} on a diagonal staircase.`,
  ];
  if (arrowStr) parts.push(`ICOM arrows: ${arrowStr}.`);
  parts.push(
    `Boxes: ${ast.boxes.map((b) => `${b.number}. ${b.name}${b.nodeNumber ? ` (${b.nodeNumber})` : ""}`).join("; ")}.`
  );
  for (const w of ast.warnings) parts.push(w);
  return parts.join(" ");
}

// ─── Helpers ──────────────────────────────────────────────────

function clip(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

/** Soft-wrap a label into <=3 lines (<br/>-joined). */
function wrap(s: string, perLine: number): string {
  if (s.length <= perLine) return s;
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > perLine) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = clip(lines[2]!, perLine);
  }
  return lines.join("<br/>");
}
