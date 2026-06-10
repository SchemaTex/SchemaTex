/**
 * EPC renderer — LayoutResult → semantic SVG.
 * Per docs/reference/44-EPC-STANDARD.md §"Reference images / Visual conventions".
 *
 * Visual conventions (verified against the Wikimedia reference images):
 *   - Event    = elongated hexagon, red / salmon-pink fill, centred label.
 *   - Function = rounded rectangle, green fill, centred label.
 *   - Connector= small grey circle carrying the operator glyph ∧ / ∨ / ×.
 *   - Control flow = solid directed arrows, single arrowhead, top-to-bottom.
 *   - Flagged (rule-violating) nodes get a red emphasis ring + data-flagged.
 *
 * Hard rules: no inline styles (classes from a <style> block), <title>/<desc>,
 * data-* for interactivity, svg.ts builder only.
 */

import type { RenderConfig } from "../../core/types";
import {
  circle,
  defs,
  el,
  group,
  multilineText,
  path as svgPath,
  polygon,
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
  resolveBaseTheme,
} from "../../core/theme";
import { parseEpc } from "./parser";
import { layoutEpc, EPC_CONST as C } from "./layout";
import type {
  EpcAnalysis,
  EpcConnector,
  EpcLayoutEdge,
  EpcLayoutNode,
  EpcLayoutResult,
} from "./types";

// EPC-specific palette per theme. Default/dark use the canonical ARIS colours
// (red/salmon event, green function, grey connector); monochrome is shape-only.
interface EpcPalette {
  eventFill: string;
  eventStroke: string;
  funcFill: string;
  funcStroke: string;
  connFill: string;
  connStroke: string;
  labelText: string;
  connGlyph: string;
  edge: string;
  flag: string;
  flagFill: string;
  backEdge: string;
  edgeLabel: string;
}

function epcPalette(themeName: string): EpcPalette {
  const base = resolveBaseTheme(themeName);
  if (themeName === "monochrome") {
    return {
      eventFill: "#ffffff", eventStroke: "#000000",
      funcFill: "#ffffff", funcStroke: "#000000",
      connFill: "#ffffff", connStroke: "#000000",
      labelText: "#000000", connGlyph: "#000000",
      edge: "#000000", flag: "#000000", flagFill: "#f0f0f0",
      backEdge: "#000000", edgeLabel: "#000000",
    };
  }
  if (themeName === "dark") {
    return {
      eventFill: "#f38ba8", eventStroke: "#11111b",
      funcFill: "#a6e3a1", funcStroke: "#11111b",
      connFill: "#45475a", connStroke: "#cdd6f4",
      labelText: "#11111b", connGlyph: "#cdd6f4",
      edge: "#cdd6f4", flag: "#f38ba8", flagFill: "#45304a",
      backEdge: "#7f849c", edgeLabel: base.textMuted,
    };
  }
  return {
    eventFill: "#f6a5b8", eventStroke: "#1f2937",
    funcFill: "#86d29a", funcStroke: "#1f2937",
    connFill: "#e5e7eb", connStroke: "#374151",
    labelText: "#1f2937", connGlyph: "#111827",
    edge: "#334155", flag: "#dc2626", flagFill: "#fee2e2",
    backEdge: "#94a3b8", edgeLabel: base.textMuted,
  };
}

export function renderEpc(text: string, config?: RenderConfig): string {
  const ast = parseEpc(text);
  const layout = layoutEpc(ast);
  return renderEpcLayout(layout, config);
}

export function renderEpcLayout(layout: EpcLayoutResult, config?: RenderConfig): string {
  const themeName = config?.theme ?? "default";
  const pal = epcPalette(themeName);
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast } = layout;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? "Event-driven process chain";

  const styleBlock = el(
    "style",
    {},
    `
.sx-epc-bg { fill: ${resolveBaseTheme(themeName).bg}; }
.sx-epc-event { fill: ${pal.eventFill}; stroke: ${pal.eventStroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linejoin: round; }
.sx-epc-func { fill: ${pal.funcFill}; stroke: ${pal.funcStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-epc-conn { fill: ${pal.connFill}; stroke: ${pal.connStroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-epc-node[data-flagged="true"] .sx-epc-event,
.sx-epc-node[data-flagged="true"] .sx-epc-func,
.sx-epc-node[data-flagged="true"] .sx-epc-conn { stroke: ${pal.flag}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-epc-flagring { fill: none; stroke: ${pal.flag}; stroke-width: ${STROKE_WIDTH.thin}; stroke-dasharray: 4 3; }
.sx-epc-label { fill: ${pal.labelText}; font-size: ${FONT_SIZE.label}px; font-weight: 600; }
.sx-epc-glyph { fill: ${pal.connGlyph}; font-size: 17px; font-weight: 700; }
.sx-epc-edge { fill: none; stroke: ${pal.edge}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-epc-edge[data-back="true"] { stroke: ${pal.backEdge}; stroke-dasharray: 5 4; }
.sx-epc-arrow { fill: ${pal.edge}; stroke: none; }
.sx-epc-arrow-back { fill: ${pal.backEdge}; stroke: none; }
.sx-epc-edge-label { fill: ${pal.edgeLabel}; font-size: ${FONT_SIZE.small}px; }
.sx-epc-title { fill: ${pal.labelText}; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
`.trim()
  );

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    defs([
      el("marker", {
        id: "sx-epc-arrowhead", viewBox: "0 0 10 10",
        refX: "9", refY: "5", markerWidth: "8", markerHeight: "8", orient: "auto-start-reverse",
      }, [polygon({ points: "0,0 10,5 0,10", class: "sx-epc-arrow" })]),
      el("marker", {
        id: "sx-epc-arrowhead-back", viewBox: "0 0 10 10",
        refX: "9", refY: "5", markerWidth: "8", markerHeight: "8", orient: "auto-start-reverse",
      }, [polygon({ points: "0,0 10,5 0,10", class: "sx-epc-arrow-back" })]),
    ]),
    rect({ x: 0, y: 0, width, height, class: "sx-epc-bg" }),
  ];

  const inner: string[] = [];

  if (ast.title) {
    inner.push(svgText({ x: width / 2, y: 22, class: "sx-epc-title", "font-family": fontFamily, "text-anchor": "middle" }, ast.title));
  }

  // 1. Edges (behind nodes).
  for (const e of layout.edges) inner.push(renderEdge(e));

  // 2. Nodes.
  for (const n of layout.nodes) inner.push(renderNode(n));

  children.push(
    group({ transform: pad ? `translate(${pad}, ${pad})` : undefined, "font-family": fontFamily }, inner)
  );

  return svgRoot(
    {
      width, height, viewBox: `0 0 ${width} ${height}`,
      role: "img", "aria-label": a11y, "data-diagram-type": "epc",
    },
    children
  );
}

// ─── Nodes ────────────────────────────────────────────────────

function renderNode(n: EpcLayoutNode): string {
  const parts: string[] = [];
  const node = n.node;
  const label = node.kind === "connector" ? "" : (node.label ?? node.id);

  if (node.kind === "event") {
    parts.push(hexagon(n.cx, n.cy, n.width, n.height, "sx-epc-event"));
    parts.push(multilineText(
      { x: n.cx, y: n.cy, class: "sx-epc-label", "text-anchor": "middle", "dominant-baseline": "middle" },
      wrap(label, 18), 14
    ));
  } else if (node.kind === "function") {
    parts.push(rect({
      x: n.cx - n.width / 2, y: n.cy - n.height / 2, width: n.width, height: n.height,
      rx: 12, ry: 12, class: "sx-epc-func",
    }));
    parts.push(multilineText(
      { x: n.cx, y: n.cy, class: "sx-epc-label", "text-anchor": "middle", "dominant-baseline": "middle" },
      wrap(label, 18), 14
    ));
  } else {
    parts.push(circle({ cx: n.cx, cy: n.cy, r: C.CONN_R, class: "sx-epc-conn" }));
    parts.push(svgText(
      { x: n.cx, y: n.cy, class: "sx-epc-glyph", "text-anchor": "middle", "dominant-baseline": "central" },
      connectorGlyph(node)
    ));
  }

  if (n.flagged) {
    const r = node.kind === "connector" ? C.CONN_R + 5 : 0;
    if (node.kind === "connector") {
      parts.push(circle({ cx: n.cx, cy: n.cy, r, class: "sx-epc-flagring" }));
    } else {
      parts.push(rect({
        x: n.cx - n.width / 2 - 5, y: n.cy - n.height / 2 - 5,
        width: n.width + 10, height: n.height + 10, rx: 12, class: "sx-epc-flagring",
      }));
    }
  }

  return group(
    {
      class: "sx-epc-node",
      "data-id": node.id,
      "data-kind": node.kind,
      ...(node.kind === "connector" ? { "data-operator": node.operator } : {}),
      ...(n.flagged ? { "data-flagged": "true" } : {}),
    },
    parts
  );
}

/** Elongated hexagon centred at (cx,cy). Points cut from left/right midlines. */
function hexagon(cx: number, cy: number, w: number, h: number, cls: string): string {
  const cut = Math.min(h * 0.5, 14);
  const L = cx - w / 2, R = cx + w / 2;
  const T = cy - h / 2, B = cy + h / 2;
  const pts = [
    `${L + cut},${T}`,
    `${R - cut},${T}`,
    `${R},${cy}`,
    `${R - cut},${B}`,
    `${L + cut},${B}`,
    `${L},${cy}`,
  ].join(" ");
  return polygon({ points: pts, class: cls });
}

function connectorGlyph(c: EpcConnector): string {
  if (c.operator === "and") return "∧"; // ∧
  if (c.operator === "or") return "∨"; // ∨
  return "×"; // × (XOR)
}

// ─── Edges ────────────────────────────────────────────────────

function renderEdge(e: EpcLayoutEdge): string {
  if (!e.path) return "";
  const parts: string[] = [
    svgPath({
      d: e.path,
      class: "sx-epc-edge",
      "marker-end": e.backEdge ? "url(#sx-epc-arrowhead-back)" : "url(#sx-epc-arrowhead)",
      ...(e.backEdge ? { "data-back": "true" } : {}),
    }),
  ];
  if (e.edge.label) {
    parts.push(svgText(
      { x: e.mid.x, y: e.mid.y - 4, class: "sx-epc-edge-label", "text-anchor": "middle" },
      clip(e.edge.label, 24)
    ));
  }
  return group(
    { class: "sx-epc-edge-g", "data-from": e.edge.from, "data-to": e.edge.to },
    parts
  );
}

// ─── <desc> summary ───────────────────────────────────────────

function summarise(layout: EpcLayoutResult): string {
  const { ast, analysis } = layout;
  const counts = { event: 0, function: 0, connector: 0 };
  for (const n of ast.nodes) counts[n.kind]++;
  const parts: string[] = [
    `Event-driven process chain${ast.title ? ` "${ast.title}"` : ""}: ${counts.event} events, ${counts.function} functions, ${counts.connector} connectors.`,
  ];
  parts.push(describeWellFormed(analysis));
  for (const v of analysis.violations) parts.push(v.message);
  return parts.join(" ");
}

function describeWellFormed(analysis: EpcAnalysis): string {
  const errors = analysis.violations.filter((v) => v.severity === "error").length;
  const warns = analysis.violations.filter((v) => v.severity === "warning").length;
  if (errors === 0 && warns === 0) return "Well-formed.";
  const bits: string[] = [];
  if (errors) bits.push(`${errors} rule violation${errors > 1 ? "s" : ""}`);
  if (warns) bits.push(`${warns} warning${warns > 1 ? "s" : ""}`);
  return `${bits.join(", ")}.`;
}

// ─── Helpers ──────────────────────────────────────────────────

function clip(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function wrap(s: string, perLine: number): string {
  if (s.length <= perLine) return s;
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur.length + 1 + w.length) > perLine) { lines.push(cur); cur = w; }
    else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  if (lines.length > 3) { lines.length = 3; lines[2] = clip(lines[2]!, perLine); }
  return lines.join("<br/>");
}
