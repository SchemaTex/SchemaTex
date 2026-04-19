import type { SLDAST, SLDNode, RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  defs,
} from "../../core/svg";
import { resolveIndustrialTheme, type IndustrialTokens, type ResolvedTheme } from "../../core/theme";
import { layoutSLD, type SLDLayoutNode } from "./layout";
import { renderSymbol } from "./symbols";

type IT = ResolvedTheme<IndustrialTokens>;

// Zebra-band fills for grouped rows. Local to SLD — no other diagram uses
// alternating row backgrounds, so they don't need to live in IndustrialTokens.
const BAND_ODD_LIGHT = "#f7f7f7";
const BAND_EVEN_LIGHT = "#fbfbfb";
const BAND_ODD_DARK = "#2a2b3c";
const BAND_EVEN_DARK = "#313244";

function buildCss(t: IT): string {
  const isDark = t.bg !== "#ffffff";
  const bandOdd = isDark ? BAND_ODD_DARK : BAND_ODD_LIGHT;
  const bandEven = isDark ? BAND_EVEN_DARK : BAND_EVEN_LIGHT;
  return `
.lt-sld { background: ${t.bg}; font-family: system-ui, -apple-system, sans-serif; }
.lt-sld-stroke { stroke: ${t.stroke}; stroke-width: 1.8; fill: none; }
.lt-sld-stroke-thick { stroke: ${t.stroke}; stroke-width: 2.4; fill: none; stroke-linecap: round; }
.lt-sld-fill { fill: ${t.bg}; stroke: ${t.stroke}; stroke-width: 2; }
.lt-sld-fill-dark { fill: ${t.stroke}; stroke: ${t.stroke}; stroke-width: 1; }
.lt-sld-dot { fill: ${t.stroke}; stroke: none; }
.lt-sld-wire { stroke: ${t.stroke}; stroke-width: 2; fill: none; }
.lt-sld-bus { stroke: ${t.strokeHeavy}; stroke-width: 6; stroke-linecap: square; }
.lt-sld-band-odd { fill: ${bandOdd}; stroke: none; }
.lt-sld-band-even { fill: ${bandEven}; stroke: none; }
.lt-sld-band-label { font: bold 11px sans-serif; fill: ${t.textMuted}; }
.lt-sld-title { font: bold 16px sans-serif; fill: ${t.text}; }
.lt-sld-id { font: bold 11px sans-serif; fill: ${t.text}; text-anchor: middle; }
.lt-sld-rating { font: 9px sans-serif; fill: ${t.textMuted}; text-anchor: middle; }
.lt-sld-voltage { font: bold 10px sans-serif; fill: ${t.textMuted}; }
.lt-sld-nameplate { font: 9px sans-serif; fill: ${t.textMuted}; }
.lt-sld-cable { font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; fill: ${t.textMuted}; }
.lt-sld-symbol-text { font: 11px sans-serif; fill: ${t.text}; dominant-baseline: middle; }
.lt-sld-wdg { font: bold 10px sans-serif; fill: ${t.stroke}; dominant-baseline: middle; }
.lt-sld-bus-label { font: bold 11px sans-serif; fill: ${t.accent}; }
`.trim();
}

function renderLabels(ln: SLDLayoutNode): string[] {
  const pieces: string[] = [];
  const { node } = ln;
  if (ln.nodeType === "bus") {
    // Bus label + voltage sits above the bus bar
    const label = node.label ?? node.id;
    pieces.push(
      textEl(
        { x: (ln.busLeft ?? ln.x - 40) + 4, y: ln.y - 8, class: "lt-sld-bus-label" },
        node.voltage ? `${node.voltage} · ${label}` : label
      )
    );
    return pieces;
  }

  if (ln.nodeType === "hub") {
    // Label rendered inside the hub rect; skip external ID.
    if (node.rating || node.voltage) {
      const lines: string[] = [];
      if (node.rating) lines.push(node.rating);
      if (node.voltage) lines.push(node.voltage);
      lines.forEach((l, i) => {
        pieces.push(
          textEl(
            { x: ln.x, y: ln.bottomY + 14 + i * 11, class: "lt-sld-rating" },
            l
          )
        );
      });
    }
    return pieces;
  }

  if (ln.nodeType === "bus_tie") {
    // Tie breaker label to the side
    pieces.push(
      textEl(
        { x: ln.x, y: ln.topY - 6, class: "lt-sld-rating" },
        node.label ?? node.id
      )
    );
    return pieces;
  }

  // ID above
  const idY = ln.topY - 22;
  pieces.push(
    textEl({ x: ln.x, y: idY, class: "lt-sld-id" }, node.label ?? node.id)
  );

  // Rating below
  const lines: string[] = [];
  if (node.rating) lines.push(node.rating);
  if (node.voltage) lines.push(node.voltage);
  if (node.deviceNumber && ln.nodeType === "relay") {
    // deviceNumber is shown inside the relay glyph; skip here
  }
  lines.forEach((l, i) => {
    pieces.push(
      textEl(
        { x: ln.x, y: ln.bottomY + 14 + i * 11, class: "lt-sld-rating" },
        l
      )
    );
  });

  // Transformer nameplate
  if (
    (ln.nodeType === "transformer" ||
      ln.nodeType === "transformer_dy" ||
      ln.nodeType === "transformer_yd" ||
      ln.nodeType === "transformer_yy" ||
      ln.nodeType === "transformer_dd" ||
      ln.nodeType === "autotransformer" ||
      ln.nodeType === "transformer_3winding") &&
    node.nameplate
  ) {
    const np = node.nameplate;
    const keys = Object.keys(np);
    let offset = -12;
    const x = ln.x + ln.halfWidth + 28;
    for (const k of keys) {
      pieces.push(
        textEl(
          { x, y: ln.y + offset, class: "lt-sld-nameplate" },
          `${k}: ${np[k]}`
        )
      );
      offset += 11;
    }
  }

  return pieces;
}

export function renderSLD(ast: SLDAST, config?: RenderConfig): string {
  const layout = layoutSLD(ast);
  const t = resolveIndustrialTheme(config?.theme ?? "default");
  const titleOffset = ast.title ? 34 : 12;
  const width = Math.ceil(layout.width);
  const height = Math.ceil(layout.height + titleOffset);

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Single-Line Diagram"));
  children.push(
    desc(
      `Single-line diagram with ${ast.nodes.length} nodes and ${ast.connections.length} connections`
    )
  );
  children.push(el("style", {}, buildCss(t)));

  // Arrow marker
  children.push(
    defs([
      el(
        "marker",
        {
          id: "lt-sld-arrow",
          markerWidth: 8,
          markerHeight: 8,
          refX: 6,
          refY: 3,
          orient: "auto",
          markerUnits: "strokeWidth",
        },
        [el("path", { d: "M 0 0 L 6 3 L 0 6 z", fill: t.textMuted })]
      ),
    ])
  );

  if (ast.title) {
    children.push(
      textEl({ x: 20, y: 22, class: "lt-sld-title" }, ast.title)
    );
  }

  const inner: string[] = [];

  // Voltage bands (alternating background)
  layout.bands.forEach((b, i) => {
    inner.push(
      el("rect", {
        x: 0,
        y: b.y,
        width: layout.width,
        height: b.height,
        class: i % 2 === 0 ? "lt-sld-band-odd" : "lt-sld-band-even",
      })
    );
    if (b.voltage) {
      inner.push(
        textEl(
          { x: 14, y: b.y + 18, class: "lt-sld-band-label" },
          b.voltage
        )
      );
    }
  });

  // Connection wires (draw before symbols so symbols sit on top)
  for (const e of layout.edges) {
    inner.push(pathEl({ d: e.path, class: "lt-sld-wire" }));
    if (e.cable) {
      // Position cable label near midpoint, slightly offset
      inner.push(
        textEl(
          { x: e.midX + 6, y: e.midY - 2, class: "lt-sld-cable" },
          e.cable
        )
      );
    }
    if (e.label) {
      inner.push(
        textEl(
          { x: e.midX + 6, y: e.midY + 10, class: "lt-sld-cable" },
          e.label
        )
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
        })
      );
      for (const piece of renderLabels(ln)) inner.push(piece);
      continue;
    }
    const attrs = {
      transform: `translate(${ln.x}, ${ln.y})`,
      "data-type": ln.nodeType,
      "data-id": ln.node.id,
    };
    inner.push(
      group(attrs, [
        renderSymbol(
          ln.nodeType,
          ln.nodeType === "hub"
            ? ln.node.label ?? ln.node.id
            : (ln.node as SLDNode).deviceNumber
        ),
      ])
    );
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
    children
  );
}
