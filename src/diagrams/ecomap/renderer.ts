import type {
  LayoutResult,
  LayoutNode,
  LayoutEdge,
  RenderConfig,
} from "../../core/types";
import { svgRoot, el, group, text, title, desc } from "../../core/svg";

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
  config: RenderConfig
): string {
  const centerNode = layout.nodes.find(
    (n) => n.individual.properties?.center === "true"
  );
  const systemNodes = layout.nodes.filter(
    (n) => n.individual.properties?.center !== "true"
  );

  const defsStr = buildDefs();
  const styleStr = buildStyles(config);
  const connectionsStr = renderConnections(layout.edges);
  const centerStr = centerNode ? renderCenter(centerNode, config) : "";
  const systemsStr = renderSystems(systemNodes, config);
  const labelsStr = renderConnectionLabels(layout.edges);

  return svgRoot(
    {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "lineage-diagram lineage-ecomap",
      width: layout.width,
      height: layout.height,
    },
    [
      title("Ecomap"),
      desc(
        `Ecomap diagram with ${systemNodes.length} external systems`
      ),
      defsStr,
      styleStr,
      connectionsStr,
      centerStr,
      systemsStr,
      labelsStr,
    ]
  );
}

// ─── Defs ──────────────────────────────────────────────────

function buildDefs(): string {
  const arrowMarker = el(
    "marker",
    {
      id: "lineage-eco-arrow",
      viewBox: "0 0 10 10",
      refX: "10",
      refY: "5",
      markerWidth: "8",
      markerHeight: "8",
      orient: "auto-start-reverse",
    },
    [el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#555" })]
  );

  return el("defs", {}, [arrowMarker]);
}

// ─── Styles ────────────────────────────────────────────────

function buildStyles(config: RenderConfig): string {
  let css = `
.lineage-center-shape { fill: white; stroke: #333; stroke-width: 2.5; }
.lineage-center-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize + 2}px; text-anchor: middle; dominant-baseline: central; fill: #333; font-weight: 600; }
.lineage-system-shape { fill: #f5f5f5; stroke: #888; stroke-width: 2; }
.lineage-system-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize - 1}px; text-anchor: middle; fill: #333; }
.lineage-eco-line { stroke: #555; stroke-width: 2; fill: none; }
.lineage-eco-line-parallel { stroke: #555; stroke-width: 1.5; fill: none; }
.lineage-eco-line-weak { stroke: #888; stroke-width: 1.5; stroke-dasharray: 6,4; fill: none; }
.lineage-eco-line-broken { stroke: #888; stroke-width: 2; stroke-dasharray: 3,8; fill: none; }
.lineage-eco-line-stressful { stroke: #555; stroke-width: 2; fill: none; }
.lineage-eco-conn-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize - 2}px; text-anchor: middle; fill: #666; }
.lineage-eco-arrow { fill: #555; }
`;

  for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
    css += `.lineage-system-${cat} .lineage-system-shape { fill: ${color}18; stroke: ${color}; }\n`;
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
  const elements: string[] = [
    el("circle", {
      cx,
      cy,
      r,
      class: "lineage-center-shape",
    }),
    text(
      {
        x: cx,
        y: cy,
        class: "lineage-center-label",
      },
      label
    ),
  ];

  if (ind.age) {
    elements.push(
      text(
        {
          x: cx,
          y: cy + config.fontSize + 4,
          class: "lineage-center-label",
          "font-size": `${config.fontSize}px`,
          "font-weight": "normal",
        },
        `Age ${ind.age}`
      )
    );
  }

  return group(
    { class: "lineage-center", "data-id": ind.id },
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
    const label = ind.label !== ind.id ? ind.label : capitalize(ind.id);

    const labelLines = wrapLabel(label, 12);
    const labelElements: string[] = [];
    const labelStartY = cy + r + config.fontSize + 2;

    for (let li = 0; li < labelLines.length; li++) {
      labelElements.push(
        text(
          {
            x: cx,
            y: labelStartY + li * (config.fontSize + 1),
            class: "lineage-system-label",
          },
          labelLines[li]
        )
      );
    }

    elements.push(
      group(
        {
          class: `lineage-system lineage-system-${cat}`,
          "data-system-id": ind.id,
        },
        [
          el("circle", {
            cx,
            cy,
            r,
            class: "lineage-system-shape",
          }),
          ...labelElements,
        ]
      )
    );
  }

  return group({ class: "lineage-systems" }, elements);
}

// ─── Connections ───────────────────────────────────────────

function renderConnections(edges: LayoutEdge[]): string {
  const elements: string[] = [];

  for (const edge of edges) {
    const coords = extractLineCoords(edge.path);
    if (!coords) continue;

    const relType = edge.relationship.type;
    const flow = edge.relationship.energyFlow;
    const lineElements: string[] = [];

    const arrowAttrs = getArrowAttrs(flow);

    switch (relType) {
      case "strong":
        lineElements.push(
          ...parallelLines(coords, 3, 4, {
            class: "lineage-eco-line-parallel",
            ...arrowAttrs,
          })
        );
        break;

      case "moderate":
        lineElements.push(
          ...parallelLines(coords, 2, 4, {
            class: "lineage-eco-line-parallel",
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
            class: "lineage-eco-line-weak",
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
            class: "lineage-eco-line-stressful",
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
            class: "lineage-eco-line-stressful",
            ...arrowAttrs,
          })
        );
        lineElements.push(
          ...conflictMarks(coords)
        );
        break;

      case "broken":
        lineElements.push(
          el("line", {
            x1: coords.x1,
            y1: coords.y1,
            x2: coords.x2,
            y2: coords.y2,
            class: "lineage-eco-line-broken",
            ...arrowAttrs,
          })
        );
        break;

      default:
        lineElements.push(
          el("line", {
            x1: coords.x1,
            y1: coords.y1,
            x2: coords.x2,
            y2: coords.y2,
            class: "lineage-eco-line",
            ...arrowAttrs,
          })
        );
        break;
    }

    elements.push(
      group(
        {
          class: `lineage-connection lineage-connection-${relType}`,
          "data-from": edge.from,
          "data-to": edge.to,
        },
        lineElements
      )
    );
  }

  return group({ class: "lineage-connections" }, elements);
}

// ─── Connection labels ─────────────────────────────────────

function renderConnectionLabels(edges: LayoutEdge[]): string {
  const elements: string[] = [];

  for (const edge of edges) {
    if (!edge.relationship.label) continue;
    const coords = extractLineCoords(edge.path);
    if (!coords) continue;

    const mx = (coords.x1 + coords.x2) / 2;
    const my = (coords.y1 + coords.y2) / 2;

    elements.push(
      group({ class: "lineage-conn-label-group" }, [
        el("rect", {
          x: mx - 40,
          y: my - 8,
          width: 80,
          height: 16,
          rx: 3,
          fill: "white",
          "fill-opacity": "0.85",
        }),
        text(
          { x: mx, y: my + 4, class: "lineage-eco-conn-label" },
          edge.relationship.label
        ),
      ])
    );
  }

  return group({ class: "lineage-connection-labels" }, elements);
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
      class: "lineage-eco-line",
      "stroke-width": "2",
    }),
    el("line", {
      x1: mx + 3 + nx * markLen,
      y1: my + 3 + ny * markLen,
      x2: mx + 3 - nx * markLen,
      y2: my + 3 - ny * markLen,
      class: "lineage-eco-line",
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
      return { "marker-end": "url(#lineage-eco-arrow)" };
    case "to":
      return { "marker-start": "url(#lineage-eco-arrow)" };
    case "mutual":
      return {
        "marker-start": "url(#lineage-eco-arrow)",
        "marker-end": "url(#lineage-eco-arrow)",
      };
    default:
      return {};
  }
}

// ─── Text helpers ──────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function wrapLabel(label: string, maxChars: number): string[] {
  if (label.length <= maxChars) return [label];
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current && current.length + word.length + 1 > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
