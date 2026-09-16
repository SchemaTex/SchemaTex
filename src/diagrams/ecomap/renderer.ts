import { systemCaption } from "./labels";
import { TITLE } from "../../core/theme";
import { resolveSceneTitle } from "../../core/title-scene";
import type {
  DiagramAST,
  LayoutResult,
  LayoutNode,
  LayoutEdge,
  RenderConfig,
} from "../../core/types";
import { svgRoot, el, group, text, title, desc } from "../../core/svg";
import { cssCustomProperties, resolveBaseTheme, STROKE_WIDTH, type BaseTheme } from "../../core/theme";
import { applyLegendOverrides, renderLegend } from "../../core/legend";
import { estimateTextWidth } from "../../core/text-metrics";
import { buildEcomapLegend } from "./legend";

// ─── Category colors (Hartman standard) ────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  family: "#8D6E63",
  friends: "#42A5F5",
  work: "#66BB6A",
  education: "#FFA726",
  health: "#EF5350",
  "mental-health": "#AB47BC",
  religion: "#CCBB33",
  recreation: "#26C6DA",
  legal: "#78909C",
  government: "#8D6E63",
  financial: "#66BB6A",
  community: "#29B6F6",
  cultural: "#FFA726",
  substance: "#EF5350",
  technology: "#42A5F5",
  pet: "#8D6E63",
};

// ─── Public API ────────────────────────────────────────────

export function renderEcomap(
  layout: LayoutResult,
  config: RenderConfig,
  ast?: DiagramAST
): string {
  const centerNode = layout.nodes.find(
    (n) => n.individual.properties?.center === "true"
  );
  const systemNodes = layout.nodes.filter(
    (n) => n.individual.properties?.center !== "true"
  );

  const t = resolveBaseTheme(config.theme);
  const defsStr = buildDefs(t);
  const styleStr = buildStyles(config, t);
  const connectionsStr = renderConnections(layout.edges, centerNode?.individual.id);
  const centerStr = centerNode ? renderCenter(centerNode, config) : "";
  const systemsStr = renderSystems(systemNodes, config);
  const labelsStr = renderConnectionLabels(layout.edges, layout.nodes, t);

  const layers: string[] = [
    title(ast?.metadata?.title ?? "Ecomap"),
    desc(`Ecomap diagram with ${systemNodes.length} external systems`),
    defsStr,
    styleStr,
  ];

  // Defer pushing chart-content until we know whether the legend widens the
  // viewBox so we can horizontally center the chart.
  const chartContent = [
    connectionsStr,
    centerStr,
    systemsStr,
    labelsStr,
  ];

  const chartTitle = ast?.metadata?.title;
  const titleHeight = chartTitle ? TITLE.bandH : 0;
  let finalWidth = layout.width;
  let finalHeight = layout.height;
  let legendSvg = "";

  if (ast) {
    const autoSpec = buildEcomapLegend(ast);
    const finalSpec = applyLegendOverrides(autoSpec, ast.legendOverrides);
    if (finalSpec.mode === "on" && finalSpec.items.length > 0) {
      const { svg, bbox: lb } = renderLegend(
        finalSpec,
        {
          canvasWidth: layout.width,
          canvasHeight: layout.height,
          padding: 16,
        },
        t,
        { fontFamily: config.fontFamily, fontSize: config.fontSize }
      );
      if (svg) {
        legendSvg = svg;
        const overflowX = lb.x + lb.w + 8;
        const overflowY = lb.y + lb.h + 8;
        if (overflowX > finalWidth) finalWidth = overflowX;
        if (overflowY > finalHeight) finalHeight = overflowY;
      }
    }
  }

  const chartXOffset = Math.max(0, (finalWidth - layout.width) / 2);
  layers.push(
    group(
      { transform: `translate(${chartXOffset}, ${titleHeight})` },
      chartContent
    )
  );
  if (legendSvg) layers.push(group({ transform: `translate(0, ${titleHeight})` }, [legendSvg]));
  finalHeight += titleHeight;
  if (chartTitle) {
    const resolved = resolveSceneTitle(chartTitle, ast?.titleSourceRange, finalWidth / 2, TITLE.y, config);
    layers.push(text({ x: resolved.x, y: resolved.y, ...resolved.attrs,
      "text-anchor": "middle", "font-family": config.fontFamily,
      "font-size": TITLE.size, "font-weight": TITLE.weight, fill: t.text }, chartTitle));
  }

  return svgRoot(
    {
      viewBox: `0 0 ${finalWidth} ${finalHeight}`,
      class: "schematex-diagram schematex-ecomap",
      width: finalWidth,
      height: finalHeight,
    },
    layers
  );
}

// ─── Defs ──────────────────────────────────────────────────

function buildDefs(t: BaseTheme): string {
  const arrowMarker = el(
    "marker",
    {
      id: "schematex-ecomap-eco-arrow",
      viewBox: "0 0 10 10",
      refX: "10",
      refY: "5",
      markerWidth: "5",
      markerHeight: "5",
      orient: "auto",
    },
    [el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: t.stroke })]
  );

  const startMarker = el("marker", {
    id: "schematex-ecomap-eco-arrow-start", viewBox: "0 0 10 10", refX: 0, refY: 5,
    markerWidth: 5, markerHeight: 5, orient: "auto",
  }, [el("path", { d: "M 10 0 L 0 5 L 10 10 z", fill: t.stroke })]);
  return el("defs", {}, [arrowMarker, startMarker]);
}

// ─── Styles ────────────────────────────────────────────────

function buildStyles(config: RenderConfig, t: BaseTheme): string {
  let css = `
.schematex-ecomap {${cssCustomProperties(t)} color: ${t.text};
}
.schematex-ecomap-center-shape { fill: ${t.fill}; stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.thick}; }
.schematex-ecomap-center-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize + 2}px; text-anchor: middle; dominant-baseline: central; fill: ${t.text}; font-weight: 600; }
.schematex-ecomap-center-age { font-family: ${config.fontFamily}; font-size: ${config.fontSize}px; font-weight: 400; text-anchor: middle; dominant-baseline: central; fill: ${t.textMuted}; }
.schematex-ecomap-system-shape { fill: ${t.fillMuted}; stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-ecomap-system-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize}px; text-anchor: middle; fill: ${t.text}; }
.schematex-ecomap-eco-line { stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; fill: none; stroke-linecap: round; }
.schematex-ecomap-eco-line-parallel { stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; fill: none; stroke-linecap: round; }
.schematex-ecomap-eco-line-weak { stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-dasharray: 6,4; fill: none; stroke-linecap: round; }
.schematex-ecomap-eco-line-broken { stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-dasharray: 3,8; fill: none; stroke-linecap: round; }
.schematex-ecomap-eco-line-stressful { stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; fill: none; stroke-linecap: round; }
.schematex-ecomap-eco-conn-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize - 2}px; text-anchor: middle; fill: ${t.textMuted}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 3px; stroke-linejoin: round; }
.schematex-ecomap-eco-arrow { fill: ${t.neutral}; }
.schematex-ecomap-connection-mesosystem .schematex-ecomap-eco-line,
.schematex-ecomap-connection-mesosystem .schematex-ecomap-eco-line-parallel,
.schematex-ecomap-connection-mesosystem .schematex-ecomap-eco-line-weak,
.schematex-ecomap-connection-mesosystem .schematex-ecomap-eco-line-broken,
.schematex-ecomap-connection-mesosystem .schematex-ecomap-eco-line-stressful { stroke-opacity: 0.55; }
`;

  for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
    css += `.schematex-ecomap-system-${cat} .schematex-ecomap-system-shape { fill: ${color}18; stroke: ${color}; }\n`;
  }

  return el("style", {}, css);
}

// ─── Center ────────────────────────────────────────────────

function renderCenter(node: LayoutNode, config: RenderConfig): string {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const r = node.width / 2;
  const ind = node.individual;

  const label = ind.label !== ind.id ? ind.label : capitalize(ind.id);
  const hasAge = ind.age !== undefined;
  const captionGap = 4;
  const elements: string[] = [
    el("circle", {
      cx,
      cy,
      r,
      class: "schematex-ecomap-center-shape",
    }),
    text(
      {
        x: cx,
        y: hasAge ? cy - (config.fontSize + captionGap) / 2 : cy,
        class: "schematex-ecomap-center-label",
      },
      label
    ),
  ];

  if (hasAge) elements.push(text({
    x: cx,
    y: cy + (config.fontSize + 2 + captionGap) / 2,
    class: "schematex-ecomap-center-age",
  }, `Age ${ind.age}`));

  return group(
    { class: "schematex-ecomap-center", "data-id": ind.id },
    elements
  );
}

// ─── Systems ───────────────────────────────────────────────

function renderSystems(
  nodes: LayoutNode[],
  config: RenderConfig
): string {
  const elements: string[] = [];

  for (const node of nodes) {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const r = node.width / 2;
    const ind = node.individual;
    const cat = ind.properties?.category ?? "other";
    const labelLines = systemCaption(ind, config.fontSize).lines;
    const labelElements: string[] = [];
    const labelStartY = cy - (labelLines.length - 1) * (config.fontSize + 3) / 2 + config.fontSize * 0.35;

    for (let li = 0; li < labelLines.length; li++) {
      labelElements.push(
        text(
          {
            x: cx,
            y: labelStartY + li * (config.fontSize + 3),
            class: "schematex-ecomap-system-label",
          },
          labelLines[li]
        )
      );
    }

    elements.push(
      group(
        {
          class: `schematex-ecomap-system schematex-ecomap-system-${cat}`,
          "data-system-id": ind.id,
        },
        [
          el("circle", {
            cx,
            cy,
            r,
            class: "schematex-ecomap-system-shape",
          }),
          ...labelElements,
        ]
      )
    );
  }

  return group({ class: "schematex-ecomap-systems" }, elements);
}

// ─── Connections ───────────────────────────────────────────

function renderConnections(edges: LayoutEdge[], centerId?: string): string {
  const elements: string[] = [];

  for (const edge of edges) {
    const coords = extractLineCoords(edge.path);
    if (!coords) continue;

    const relType = edge.relationship.type;
    const flow = edge.relationship.energyFlow;
    const length = Math.hypot(coords.x2 - coords.x1, coords.y2 - coords.y1);
    const ux = (coords.x2 - coords.x1) / length, uy = (coords.y2 - coords.y1) / length;
    if (flow === "to" || flow === "mutual") { coords.x1 += ux * 4; coords.y1 += uy * 4; }
    if (flow === "from" || flow === "mutual") { coords.x2 -= ux * 4; coords.y2 -= uy * 4; }
    const lineElements: string[] = [];

    const arrowAttrs = getArrowAttrs(flow);

    switch (relType) {
      case "strong":
        lineElements.push(
          ...parallelLines(coords, 3, 4, {
            class: "schematex-ecomap-eco-line-parallel",
            ...arrowAttrs,
          })
        );
        break;

      case "moderate":
        lineElements.push(
          ...parallelLines(coords, 2, 4, {
            class: "schematex-ecomap-eco-line-parallel",
            ...arrowAttrs,
          })
        );
        break;

      case "weak":
        lineElements.push(
          el("line", {
            x1: coords.x1,
            y1: coords.y1,
            x2: coords.x2,
            y2: coords.y2,
            class: "schematex-ecomap-eco-line-weak",
            ...arrowAttrs,
          })
        );
        break;

      case "stressful":
      case "stressful-strong":
        lineElements.push(
          el("path", {
            d: wavyPath(
              coords.x1,
              coords.y1,
              coords.x2,
              coords.y2,
              8,
              20
            ),
            class: "schematex-ecomap-eco-line-stressful",
            "stroke-width": relType === "stressful-strong" ? "3" : "2",
            ...arrowAttrs,
          })
        );
        break;

      case "conflictual":
        lineElements.push(
          el("path", {
            d: wavyPath(
              coords.x1,
              coords.y1,
              coords.x2,
              coords.y2,
              8,
              20
            ),
            class: "schematex-ecomap-eco-line-stressful",
            ...arrowAttrs,
          })
        );
        lineElements.push(
          ...conflictMarks(coords)
        );
        break;

      case "broken": {
        const mx = (coords.x1+coords.x2)/2, my = (coords.y1+coords.y2)/2;
        lineElements.push(el("line", { ...coords, class: "schematex-ecomap-eco-line" }));
        for(const offset of [-3,3]) lineElements.push(el("line", {
          x1:mx+ux*offset-uy*6,y1:my+uy*offset+ux*6,
          x2:mx+ux*offset+uy*6,y2:my+uy*offset-ux*6,
          class:"schematex-ecomap-eco-line",
        }));
      }
        break;

      default:
        lineElements.push(
          el("line", {
            x1: coords.x1,
            y1: coords.y1,
            x2: coords.x2,
            y2: coords.y2,
            class: "schematex-ecomap-eco-line",
            ...arrowAttrs,
          })
        );
        break;
    }

    const isMesosystem =
      centerId !== undefined && edge.from !== centerId && edge.to !== centerId;
    const groupClass = isMesosystem
      ? `schematex-ecomap-connection schematex-ecomap-connection-${relType} schematex-ecomap-connection-mesosystem`
      : `schematex-ecomap-connection schematex-ecomap-connection-${relType}`;
    const groupAttrs: Record<string, string> = {
      class: groupClass,
      "data-from": edge.from,
      "data-to": edge.to,
    };
    if (isMesosystem) groupAttrs["data-mesosystem"] = "true";

    elements.push(group(groupAttrs, lineElements));
  }

  return group({ class: "schematex-ecomap-connections" }, elements);
}

// ─── Connection labels ─────────────────────────────────────

function renderConnectionLabels(
  edges: LayoutEdge[],
  nodes: LayoutNode[],
  t: BaseTheme
): string {
  const elements: string[] = [];

  // A label whose anchor lands inside any node circle gets nudged along its
  // line (an outer-ring spoke can pass straight through an inner-ring node).
  const clearsNodes = (x: number, y: number, halfW: number): boolean =>
    nodes.every((n) => {
      const r = n.width / 2;
      const ncx = n.x + r;
      const ncy = n.y + r;
      const dx = Math.max(Math.abs(x - ncx) - halfW, 0);
      const dy = Math.abs(y - ncy);
      return dx * dx + dy * dy > (r + 4) * (r + 4);
    });

  for (const edge of edges) {
    if (!edge.relationship.label) continue;
    const coords = extractLineCoords(edge.path);
    if (!coords) continue;

    const labelW = estimateTextWidth(edge.relationship.label, 10) + 12;
    let lt = 0.5;
    for (const cand of [0.5, 0.62, 0.38, 0.72, 0.28]) {
      const x = coords.x1 + (coords.x2 - coords.x1) * cand;
      const y = coords.y1 + (coords.y2 - coords.y1) * cand;
      if (clearsNodes(x, y, labelW / 2)) {
        lt = cand;
        break;
      }
    }
    const mx = coords.x1 + (coords.x2 - coords.x1) * lt;
    const my = coords.y1 + (coords.y2 - coords.y1) * lt;

    elements.push(
      group({ class: "schematex-ecomap-conn-label-group" }, [
        el("rect", {
          x: mx - labelW / 2,
          y: my - 8,
          width: labelW,
          height: 16,
          rx: 3,
          fill: t.bg,
          "fill-opacity": "0.85",
        }),
        text(
          { x: mx, y: my + 4, class: "schematex-ecomap-eco-conn-label" },
          edge.relationship.label
        ),
      ])
    );
  }

  return group({ class: "schematex-ecomap-connection-labels" }, elements);
}

// ─── Line type helpers ─────────────────────────────────────

interface LineCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function extractLineCoords(pathData: string): LineCoords | null {
  const m = pathData.match(
    /M\s*([\d.-]+)\s+([\d.-]+)\s*L\s*([\d.-]+)\s+([\d.-]+)/
  );
  if (!m) return null;
  return { x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] };
}

function parallelLines(
  coords: LineCoords,
  count: number,
  gap: number,
  attrs: Record<string, string | number | undefined>
): string[] {
  const { x1, y1, x2, y2 } = coords;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return [];

  const nx = -dy / len;
  const ny = dx / len;

  const lines: string[] = [];
  const offsets =
    count === 2
      ? [-gap / 2, gap / 2]
      : count === 3
        ? [-gap, 0, gap]
        : [0];

  for (const off of offsets) {
    lines.push(
      el("line", {
        x1: x1 + nx * off,
        y1: y1 + ny * off,
        x2: x2 + nx * off,
        y2: y2 + ny * off,
        ...attrs,
      })
    );
  }

  return lines;
}

function wavyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amplitude: number,
  wavelength: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const segments = Math.max(4, Math.round(len / wavelength));

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  let d = `M ${x1} ${y1}`;
  for (let i = 0; i < segments; i++) {
    const t1 = (i + 0.5) / segments;
    const t2 = (i + 1) / segments;
    const sign = i % 2 === 0 ? 1 : -1;
    const cpx = x1 + dx * t1 + nx * amplitude * sign;
    const cpy = y1 + dy * t1 + ny * amplitude * sign;
    const ex = x1 + dx * t2;
    const ey = y1 + dy * t2;
    d += ` Q ${cpx} ${cpy} ${ex} ${ey}`;
  }

  return d;
}

function conflictMarks(coords: LineCoords): string[] {
  const mx = (coords.x1 + coords.x2) / 2;
  const my = (coords.y1 + coords.y2) / 2;
  const dx = coords.x2 - coords.x1;
  const dy = coords.y2 - coords.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return [];

  const nx = -dy / len;
  const ny = dx / len;
  const markLen = 6;

  return [
    el("line", {
      x1: mx - 3 + nx * markLen,
      y1: my - 3 + ny * markLen,
      x2: mx - 3 - nx * markLen,
      y2: my - 3 - ny * markLen,
      class: "schematex-ecomap-eco-line",
      "stroke-width": "2",
    }),
    el("line", {
      x1: mx + 3 + nx * markLen,
      y1: my + 3 + ny * markLen,
      x2: mx + 3 - nx * markLen,
      y2: my + 3 - ny * markLen,
      class: "schematex-ecomap-eco-line",
      "stroke-width": "2",
    }),
  ];
}

function getArrowAttrs(
  flow?: "from" | "to" | "mutual" | "none"
): Record<string, string> {
  if (!flow || flow === "none") return {};
  switch (flow) {
    case "from":
      return { "marker-end": "url(#schematex-ecomap-eco-arrow)" };
    case "to":
      return { "marker-start": "url(#schematex-ecomap-eco-arrow-start)" };
    case "mutual":
      return {
        "marker-start": "url(#schematex-ecomap-eco-arrow-start)",
        "marker-end": "url(#schematex-ecomap-eco-arrow)",
      };
    default:
      return {};
  }
}

// ─── Text helpers ──────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
