/**
 * Threat Model renderer — LayoutResult → semantic SVG.
 *
 * DFD shapes (31-DFD-STANDARD §5): external entity = rectangle, process =
 * circle, data store = two parallel horizontal lines (open rectangle). Trust
 * boundaries are dashed red rounded rectangles (MS TMT convention,
 * 46-THREAT-MODEL-STRIDE-STANDARD §"Visual conventions"). Per-element STRIDE
 * badges list the applicable letters; data flows that cross a trust boundary
 * are accented red.
 *
 * Hard rules: no `style=` inline attributes (all visuals via a `<style>` block
 * + CSS classes), `<title>`/`<desc>`, `data-*` for interactivity, SVG builder
 * only, deterministic.
 */

import type { RenderConfig } from "../../core/types";
import {
  circle,
  defs,
  el,
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
} from "../../core/svg";
import {
  DEFAULT_FONT_FAMILY,
  FONT_SIZE,
  STROKE_WIDTH,
  resolveBaseTheme,
} from "../../core/theme";
import { parseThreatModel } from "./parser";
import { layoutThreatModel, TM_CONST as C } from "./layout";
import type {
  LaidOutFlow,
  LaidOutNode,
  ThreatModelLayout,
} from "./types";
import { STRIDE_NAMES } from "./types";

export function renderThreatModel(text: string, config?: RenderConfig): string {
  const ast = parseThreatModel(text);
  const layout = layoutThreatModel(ast);
  return renderThreatModelLayout(layout, config);
}

export function renderThreatModelLayout(
  layout: ThreatModelLayout,
  config?: RenderConfig
): string {
  const theme = resolveBaseTheme(config?.theme ?? "default");
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = layout.ast.title ?? "Threat model (DFD + STRIDE)";

  // Security accent — red, reserved for boundaries and boundary-crossing flows.
  const danger = "#c62828";

  const styleBlock = el(
    "style",
    {},
    `
.sx-tm-bg { fill: ${theme.bg}; }
.sx-tm-title { fill: ${theme.text}; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
.sx-tm-external { fill: ${theme.fillMuted}; stroke: ${theme.stroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-tm-process { fill: ${theme.fill}; stroke: ${theme.stroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-tm-store-line { fill: none; stroke: ${theme.stroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-tm-store-bg { fill: ${theme.bg}; stroke: none; }
.sx-tm-label { fill: ${theme.text}; font-size: ${FONT_SIZE.label}px; font-weight: 600; }
.sx-tm-flow { fill: none; stroke: ${theme.stroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-tm-flow[data-crossing="true"] { stroke: ${danger}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-tm-arrow { fill: ${theme.stroke}; stroke: none; }
.sx-tm-arrow[data-crossing="true"] { fill: ${danger}; }
.sx-tm-flow-label { fill: ${theme.text}; font-size: ${FONT_SIZE.small}px; }
.sx-tm-flow-label[data-crossing="true"] { fill: ${danger}; font-weight: 700; }
.sx-tm-flow-halo { fill: ${theme.bg}; stroke: none; }
.sx-tm-boundary { fill: none; stroke: ${danger}; stroke-width: ${STROKE_WIDTH.normal}; stroke-dasharray: 6 4; }
.sx-tm-boundary-label { fill: ${danger}; font-size: ${FONT_SIZE.small}px; font-weight: 700; }
.sx-tm-badge { fill: ${theme.accent}; }
.sx-tm-badge[data-cond-r="true"] { fill: ${danger}; }
.sx-tm-badge-text { fill: #ffffff; font-size: ${FONT_SIZE.small}px; font-weight: 700; }
`.trim()
  );

  // Arrowhead markers (normal + crossing). Markers are defs, not inline style.
  const markerDefs = defs([
    arrowMarker("sx-tm-mk", "sx-tm-arrow"),
    arrowMarker("sx-tm-mk-x", "sx-tm-arrow", "true"),
  ]);

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    markerDefs,
    rect({ x: 0, y: 0, width, height, class: "sx-tm-bg" }),
  ];

  const inner: string[] = [];

  if (layout.ast.title) {
    inner.push(
      svgText(
        { x: width / 2, y: 24, class: "sx-tm-title", "font-family": fontFamily, "text-anchor": "middle" },
        layout.ast.title
      )
    );
  }

  // 1. Trust boundaries (behind nodes).
  for (const b of layout.boundaries) {
    inner.push(
      group(
        { class: "sx-tm-boundary-g", "data-boundary": b.name },
        [
          rect({
            x: b.x,
            y: b.y,
            width: b.w,
            height: b.h,
            rx: 14,
            class: "sx-tm-boundary",
          }),
          svgText(
            {
              x: b.x + 8,
              y: b.y + 15,
              class: "sx-tm-boundary-label",
              "font-family": fontFamily,
            },
            b.name
          ),
        ]
      )
    );
  }

  // 2. Flows (with arrowheads + halo'd labels). Crossings accented.
  for (const f of layout.flows) {
    inner.push(renderFlow(f, fontFamily));
  }

  // 3. Nodes + STRIDE badges.
  for (const n of layout.nodes) {
    inner.push(renderNode(n, fontFamily));
  }

  children.push(group({ class: "sx-tm-root" }, inner));

  return svgRoot(
    {
      width,
      height,
      viewBox: `${-pad} ${-pad} ${width} ${height}`,
      class: "schematex schematex-threatmodel",
      "font-family": fontFamily,
      role: "img",
      "aria-label": a11y,
    },
    children
  );
}

// ─── node rendering ───────────────────────────────────────────

function renderNode(n: LaidOutNode, fontFamily: string): string {
  const parts: string[] = [];
  const dataAttrs = {
    "data-id": n.id,
    "data-kind": n.kind,
    "data-stride": n.stride.categories.join(""),
  };

  if (n.kind === "process") {
    parts.push(
      circle({ cx: n.cx, cy: n.cy, r: C.PROCESS_R, class: "sx-tm-process" })
    );
    parts.push(idLabel(n, fontFamily));
  } else if (n.kind === "external") {
    parts.push(
      rect({ x: n.x, y: n.y, width: n.w, height: n.h, class: "sx-tm-external" })
    );
    parts.push(idLabel(n, fontFamily));
  } else {
    // Data store: white body + two parallel horizontal lines (open at ends).
    parts.push(
      rect({ x: n.x, y: n.y, width: n.w, height: n.h, class: "sx-tm-store-bg" })
    );
    parts.push(
      svgLine({ x1: n.x, y1: n.y, x2: n.x + n.w, y2: n.y, class: "sx-tm-store-line" })
    );
    parts.push(
      svgLine({
        x1: n.x,
        y1: n.y + n.h,
        x2: n.x + n.w,
        y2: n.y + n.h,
        class: "sx-tm-store-line",
      })
    );
    parts.push(idLabel(n, fontFamily));
  }

  // STRIDE badge — compact letter cluster above the node.
  parts.push(strideBadge(n, fontFamily));

  return group({ class: `sx-tm-node sx-tm-node-${n.kind}`, ...dataAttrs }, parts);
}

function idLabel(n: LaidOutNode, fontFamily: string): string {
  const text =
    n.kind === "process" && /^[\d.]+$/.test(n.id)
      ? `${n.id}\n${n.label}`
      : n.label;
  return multilineText(
    {
      x: n.cx,
      y: n.cy,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      class: "sx-tm-label",
      "font-family": fontFamily,
    },
    text,
    13
  );
}

function strideBadge(n: LaidOutNode, fontFamily: string): string {
  const letters = n.stride.categories.join("");
  // Badge sits just above the node's top edge.
  const charW = 7;
  const bw = letters.length * charW + 10;
  const bh = 15;
  const bx = n.cx - bw / 2;
  const by = n.y - bh - 4;
  return group({ class: "sx-tm-badge-g", "data-stride": letters }, [
    rect({
      x: bx,
      y: by,
      width: bw,
      height: bh,
      rx: 4,
      class: "sx-tm-badge",
      ...(n.stride.conditionalR ? { "data-cond-r": "true" } : {}),
    }),
    svgText(
      {
        x: n.cx,
        y: by + bh / 2 + 0.5,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        class: "sx-tm-badge-text",
        "font-family": fontFamily,
      },
      letters
    ),
  ]);
}

// ─── flow rendering ───────────────────────────────────────────

function renderFlow(f: LaidOutFlow, fontFamily: string): string {
  const pts = f.points;
  const d =
    "M " +
    pts.map((p) => `${round(p.x)} ${round(p.y)}`).join(" L ");
  const crossing = f.crossesBoundary ? "true" : undefined;
  const marker = f.crossesBoundary ? "url(#sx-tm-mk-x)" : "url(#sx-tm-mk)";

  const labelHaloW = f.label.length * 5.4 + 8;
  const parts: string[] = [
    svgPath({
      d,
      class: "sx-tm-flow",
      "marker-end": marker,
      ...(crossing ? { "data-crossing": crossing } : {}),
    }),
  ];
  if (f.label) {
    parts.push(
      rect({
        x: f.labelX - labelHaloW / 2,
        y: f.labelY - 7,
        width: labelHaloW,
        height: 13,
        class: "sx-tm-flow-halo",
      })
    );
    parts.push(
      svgText(
        {
          x: f.labelX,
          y: f.labelY,
          "text-anchor": "middle",
          "dominant-baseline": "central",
          class: "sx-tm-flow-label",
          "font-family": fontFamily,
          ...(crossing ? { "data-crossing": crossing } : {}),
        },
        f.label
      )
    );
  }
  return group(
    {
      class: "sx-tm-flow-g",
      "data-from": f.source,
      "data-to": f.target,
      ...(crossing ? { "data-crossing": crossing } : {}),
    },
    parts
  );
}

function arrowMarker(id: string, cls: string, crossing?: string): string {
  return el(
    "marker",
    {
      id,
      markerWidth: 9,
      markerHeight: 9,
      refX: 8,
      refY: 4,
      orient: "auto",
      markerUnits: "userSpaceOnUse",
    },
    [
      polygon({
        points: "0,0 9,4 0,8",
        class: cls,
        ...(crossing ? { "data-crossing": crossing } : {}),
      }),
    ]
  );
}

// ─── helpers ──────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function summarise(layout: ThreatModelLayout): string {
  const a = layout.analysis;
  const counts = {
    external: layout.nodes.filter((n) => n.kind === "external").length,
    process: layout.nodes.filter((n) => n.kind === "process").length,
    store: layout.nodes.filter((n) => n.kind === "store").length,
  };
  const lines: string[] = [];
  lines.push(
    `STRIDE threat model: ${counts.external} external entit${
      counts.external === 1 ? "y" : "ies"
    }, ${counts.process} process(es), ${counts.store} data store(s), ${
      layout.flows.length
    } data flow(s).`
  );
  if (a.crossings.length > 0) {
    lines.push(
      `${a.crossings.length} boundary-crossing flow(s): ${a.crossings
        .map((f) => `${f.source}→${f.target}`)
        .join(", ")}.`
    );
  }
  for (const n of a.nodes) {
    lines.push(
      `${n.id} (${n.kind}) → ${n.categories
        .map((c) => STRIDE_NAMES[c])
        .join(", ")}.`
    );
  }
  return lines.join(" ");
}
