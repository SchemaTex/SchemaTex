import type { SLDAST, SLDNode, RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
} from "../../core/svg";
import {
  resolveIndustrialTheme,
  type IndustrialTokens,
  type ResolvedTheme,
} from "../../core/theme";
import { layoutSLD, type SLDLayoutNode } from "./layout";
import { renderSymbol } from "./symbols";

type IT = ResolvedTheme<IndustrialTokens>;

const TITLE_BASELINE_Y = 22;
const TITLE_DESCENT = 4;
const TITLE_TO_SOURCE_GAP = 12;

function buildCss(t: IT): string {
  return `
.lt-sld { font-family: "Inter", "Helvetica Neue", sans-serif; }
.lt-sld-stroke { stroke: ${t.stroke}; stroke-width: 1.4; fill: none; }
.lt-sld-stroke-thick { stroke: ${t.stroke}; stroke-width: 1.8; fill: none; stroke-linecap: round; }
.lt-sld-fill { fill: ${t.bg}; stroke: ${t.stroke}; stroke-width: 1.4; }
.lt-sld-fill-dark { fill: ${t.stroke}; stroke: ${t.stroke}; stroke-width: 1; }
.lt-sld-dot { fill: ${t.stroke}; stroke: none; }
.lt-sld-wire-clearance { stroke: ${t.bg}; stroke-width: 5; fill: none; }
.lt-sld-control { stroke: ${t.stroke}; stroke-width: 1.4; stroke-dasharray: 5 4; fill: none; }
.lt-sld-wire { stroke: ${t.stroke}; stroke-width: 1.4; fill: none; }
.lt-sld-bus { stroke: ${t.strokeHeavy}; stroke-width: 3; stroke-linecap: square; }
.lt-sld-title { font-size: 16px; font-weight: 700; fill: ${t.text}; }
.lt-sld-id { font-size: 11px; font-weight: 700; fill: ${t.text}; text-anchor: middle; }
.lt-sld-id-side { font-size: 11px; font-weight: 700; fill: ${t.text}; text-anchor: start; }
.lt-sld-rating { font-size: 9px; fill: ${t.textMuted}; text-anchor: middle; }
.lt-sld-rating-side { font-size: 9px; fill: ${t.textMuted}; text-anchor: start; }
.lt-sld-voltage { font-size: 10px; font-weight: 700; fill: ${t.textMuted}; }
.lt-sld-nameplate { font-size: 9px; fill: ${t.textMuted}; }
.lt-sld-cable { font-size: 9px; fill: ${t.textMuted}; }
.lt-sld-symbol-text:not([font-size]) { font-size: 11px; }
.lt-sld-symbol-text { fill: ${t.text}; dominant-baseline: middle; }
.lt-sld-wdg:not([font-size]) { font-size: 10px; }
.lt-sld-wdg { font-weight: 700; fill: ${t.stroke}; dominant-baseline: middle; }
.lt-sld-bus-label { font-size: 11px; font-weight: 700; fill: ${t.accent}; }
.lt-sld-standard-badge { font-size: 10px; font-weight: 700; fill: ${t.textMuted}; letter-spacing: 0.3px; }
.lt-sld-unknown-box { fill: none; stroke: ${t.accent}; stroke-width: 1.6; stroke-dasharray: 5 3; }
.lt-sld-unknown-mark { font-size: 16px; font-weight: 700; fill: ${t.accent}; dominant-baseline: middle; }
.lt-sld-unknown-type { font-size: 9px; font-family: monospace; fill: ${t.textMuted}; }
`.trim();
}

/**
 * Jurisdiction-localised standard badge. ABNT (Brazil) reads in Portuguese;
 * AS/NZS and IEC use their published designations. ANSI (the default) shows no
 * badge to keep historical output unchanged.
 */
function standardBadge(standard: SLDAST["standard"]): string | undefined {
  switch (standard) {
    case "iec":
      return "Standard: IEC 60617";
    case "abnt":
      return "Norma: ABNT NBR 5410 (IEC 60364)";
    case "as-nzs":
      return "Standard: AS/NZS 3000 (IEC 60364)";
    default:
      return undefined;
  }
}

function renderLabels(ln: SLDLayoutNode): string[] {
  return ln.labels.map((l) =>
    textEl({ x: l.x, y: l.y, class: l.className }, l.text),
  );
}

export function renderSLD(ast: SLDAST, config?: RenderConfig): string {
  const layout = layoutSLD(ast);
  const t = resolveIndustrialTheme(config?.theme ?? "default");
  const sourceLabelTop = Math.min(...layout.nodes.flatMap(node => [node.topY, ...node.labels.map(l => l.y-l.fontSize)]));
  const titleOffset =
    ast.title && Number.isFinite(sourceLabelTop)
      ? Math.max(
          12,
          TITLE_BASELINE_Y +
            TITLE_DESCENT +
            TITLE_TO_SOURCE_GAP -
            sourceLabelTop,
        )
      : 12;
  const width = Math.ceil(layout.width);
  const height = Math.ceil(layout.height + titleOffset);

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Single-Line Diagram"));
  children.push(
    desc(
      `Single-line diagram with ${ast.nodes.length} nodes and ${ast.connections.length} connections`,
    ),
  );
  children.push(el("style", {}, buildCss(t)));

  if (ast.title) {
    children.push(
      textEl(
        {
          x: 20,
          y: TITLE_BASELINE_Y,
          class: "lt-sld-title",
          "data-sld-role": "title",
        },
        ast.title,
      ),
    );
  }

  // Standard-compliance badge (top-right), localised for the jurisdiction.
  const badge = standardBadge(ast.standard);
  if (badge) {
    children.push(
      textEl(
        {
          x: width - 14,
          y: 22,
          class: "lt-sld-standard-badge",
          "text-anchor": "end",
        },
        badge,
      ),
    );
  }

  const inner: string[] = [];

  // Connection wires (draw before symbols so symbols sit on top)
  for (const e of layout.edges) {
    inner.push(pathEl({ d: e.path, class: "lt-sld-wire-clearance" }));
    inner.push(
      pathEl({
        d: e.path,
        "data-from": e.from,
        "data-to": e.to,
        class: e.control ? "lt-sld-control" : "lt-sld-wire",
      }),
    );
    for (const l of e.labels) {
      inner.push(textEl({ x: l.x, y: l.y, class: "lt-sld-cable" }, l.text));
    }
  }

  // Actual branch junctions get dots. Crossings between distinct terminal
  // nets retain a small paper gap and are never marked as connections.
  for (const net of new Set(layout.edges.map((e) => e.net))) {
    const routes = layout.edges
      .filter((e) => e.net === net && !e.control)
      .map((e) =>
        [...e.path.matchAll(/[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => ({
          x: +m[1]!,
          y: +m[2]!,
        })),
      );
    const vertices = new Map(routes.flat().map((p) => [`${p.x},${p.y}`, p]));
    for (const p of vertices.values()) {
      const rays = new Set<string>();
      for (const route of routes)
        for (let i = 1; i < route.length; i++) {
          const a = route[i - 1]!,
            b = route[i]!;
          if (
            a.x === p.x &&
            b.x === p.x &&
            p.y >= Math.min(a.y, b.y) &&
            p.y <= Math.max(a.y, b.y)
          ) {
            if (Math.min(a.y, b.y) < p.y) rays.add("up");
            if (Math.max(a.y, b.y) > p.y) rays.add("down");
          }
          if (
            a.y === p.y &&
            b.y === p.y &&
            p.x >= Math.min(a.x, b.x) &&
            p.x <= Math.max(a.x, b.x)
          ) {
            if (Math.min(a.x, b.x) < p.x) rays.add("left");
            if (Math.max(a.x, b.x) > p.x) rays.add("right");
          }
        }
      if (rays.size >= 3)
        inner.push(
          el("circle", { cx: p.x, cy: p.y, r: 2, class: "lt-sld-dot" }),
        );
    }
  }

  // Nodes
  for (const ln of layout.nodes) {
    if (ln.nodeType === "bus") {
      const left = ln.busLeft ?? ln.x - 40;
      const right = ln.busRight ?? ln.x + 40;
      inner.push(
        el("line", {
          x1: left,
          y1: ln.y,
          x2: right,
          y2: ln.y,
          class: "lt-sld-bus",
          "data-id": ln.node.id,
        }),
      );
      for (const piece of renderLabels(ln)) inner.push(piece);
      continue;
    }
    const attrs: Record<string, string> = {
      transform: `translate(${ln.x}, ${ln.y})`,
      "data-type": ln.nodeType,
      "data-id": ln.node.id,
    };
    if (ln.nodeType === "unknown" && ln.node.rawType) {
      attrs["data-raw-type"] = ln.node.rawType;
    }
    const detail =
      ln.nodeType === "hub"
        ? (ln.node.label ?? ln.node.id)
        : ln.nodeType === "unknown"
          ? ln.node.rawType
          : (ln.node as SLDNode).deviceNumber;
    inner.push(group(attrs, [renderSymbol(ln.nodeType, detail, ast.standard)]));
    for (const piece of renderLabels(ln)) inner.push(piece);
  }

  const wrap = group({ transform: `translate(0, ${titleOffset})` }, inner);
  children.push(wrap);

  return svgRoot(
    {
      class: "lt-sld",
      role: "img",
      "aria-labelledby": "lt-sld-title lt-sld-desc",
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    children,
  );
}
