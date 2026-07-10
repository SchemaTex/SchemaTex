import type { CircuitAST, RenderConfig } from "../../core/types";
import { layoutCircuit, type LaidOutComponent, type CircuitLayoutResult } from "./layout";
import { layoutCircuitNetlist, type RoutedWire } from "./autolayout";
import { getSymbol } from "./symbols";
import {
  svgRoot,
  defs,
  group,
  el,
  circle,
  text,
  title as titleEl,
  desc,
  escapeXml,
} from "../../core/svg";
import { resolveIndustrialTheme } from "../../core/theme";

function renderItem(it: LaidOutComponent, offX: number, offY: number): string {
  const comp = it.component;
  const tx = it.x + offX;
  const ty = it.y + offY;

  if (comp.componentType === "wire") {
    const x2 = (it.anchors.end.x) + offX;
    const y2 = (it.anchors.end.y) + offY;
    return `<line x1="${tx}" y1="${ty}" x2="${x2}" y2="${y2}" class="schematex-circuit-wire"/>`;
  }

  if (comp.componentType === "dot") {
    return circle({
      cx: tx,
      cy: ty,
      r: 3.5,
      class: "schematex-circuit-dot",
      "data-id": comp.id,
    });
  }

  if (comp.componentType === "label") {
    const dir = comp.direction;
    const anchor =
      dir === "left" ? "end" : dir === "right" ? "start" : "middle";
    const dx = dir === "right" ? 6 : dir === "left" ? -6 : 0;
    const dy = dir === "down" ? 14 : dir === "up" ? -6 : 4;
    return text(
      {
        x: tx + dx,
        y: ty + dy,
        class: "schematex-circuit-net-label",
        "text-anchor": anchor,
      },
      comp.label ?? ""
    );
  }

  const sym = getSymbol(comp.componentType);
  if (!sym) {
    return `<rect x="${tx - 10}" y="${ty - 10}" width="20" height="20" fill="none" class="schematex-circuit-err" stroke-dasharray="3,2"/><text x="${tx}" y="${ty + 3}" text-anchor="middle" font-size="9" class="schematex-circuit-err">?${escapeXml(comp.componentType)}</text>`;
  }

  const body = sym.svg(comp.label, comp.value, comp.attrs);
  const transform = it.mirrorX
    ? `translate(${tx + it.length}, ${ty}) scale(-1, 1)`
    : `translate(${tx}, ${ty}) rotate(${it.rotation})`;

  // Label + value text: placed in non-rotated space using unrotated anchor endpoints.
  const labels: string[] = [];
  if (comp.label || comp.value) {
    // Keep labels above horizontal symbols and to the right of vertical ones,
    // regardless of whether the component points forward or backward. Using a
    // signed perpendicular here put left/up-facing labels below or outside the
    // viewBox (notably mains sources and the second switch in a traveler pair).
    const angle = (it.rotation * Math.PI) / 180;
    const midpointX = it.x + offX + (it.length * Math.cos(angle)) / 2;
    const midpointY = it.y + offY + (it.length * Math.sin(angle)) / 2;
    const vertical = Math.abs(Math.sin(angle)) > 0.5;
    const labelX = midpointX + (vertical ? 34 : 0);
    const labelY = midpointY - (vertical ? 2 : 18);
    if (comp.label) {
      labels.push(
        text(
          {
            x: labelX,
            y: labelY,
            class: "schematex-circuit-label",
            "text-anchor": "middle",
          },
          comp.label
        )
      );
    }
    if (comp.value) {
      labels.push(
        text(
          {
            x: labelX,
            y: labelY + 12,
            class: "schematex-circuit-value",
            "text-anchor": "middle",
          },
          comp.value
        )
      );
    }
  }

  return (
    `<g transform="${transform}" data-id="${escapeXml(comp.id)}" data-type="${escapeXml(comp.componentType)}">${body}</g>` +
    labels.join("")
  );
}

function renderRoute(r: RoutedWire, offX: number, offY: number): string {
  if (r.points.length < 2) return "";
  const pts = r.points.map((p) => `${p.x + offX},${p.y + offY}`).join(" ");
  const line = `<polyline points="${pts}" class="schematex-circuit-wire" fill="none"/>`;
  const dots = (r.junctions ?? [])
    .map(
      (j) =>
        `<circle cx="${j.x + offX}" cy="${j.y + offY}" r="3.5" class="schematex-circuit-dot"/>`
    )
    .join("");
  return line + dots;
}

export function renderCircuit(ast: CircuitAST, config?: RenderConfig): string {
  const isNetlist = ast.mode === "netlist";
  const layout: CircuitLayoutResult & { routes?: RoutedWire[] } = isNetlist
    ? layoutCircuitNetlist(ast)
    : layoutCircuit(ast);
  const { width, height, offsetX, offsetY } = layout;

  const t = resolveIndustrialTheme(config?.theme ?? "default");

  // In netlist mode, routes are rendered BEFORE items so components sit on top
  // of wires (visually cleaner — symbol fills cover the wire endpoints).
  const routeSvg = (layout.routes ?? [])
    .map((r) => renderRoute(r, offsetX, offsetY))
    .join("");
  const items = layout.items.map((it) => renderItem(it, offsetX, offsetY)).join("");

  const css = `
.schematex-circuit { font-family: system-ui, -apple-system, sans-serif; }
.schematex-circuit-body { stroke: ${t.stroke}; stroke-width: 1.75; fill: none; stroke-linejoin: round; stroke-linecap: round; }
.schematex-circuit-fill { stroke: ${t.stroke}; stroke-width: 1.5; fill: ${t.stroke}; }
.schematex-circuit-wire { stroke: ${t.stroke}; stroke-width: 1.75; fill: none; stroke-linecap: square; }
.schematex-circuit-dot { fill: ${t.stroke}; stroke: none; }
.schematex-circuit-label { font: 600 11px system-ui, sans-serif; fill: ${t.text}; }
.schematex-circuit-value { font: italic 10px system-ui, sans-serif; fill: ${t.textMuted}; }
.schematex-circuit-net-label { font: 600 11px system-ui, sans-serif; fill: ${t.accent}; }
.schematex-circuit-pol { font: 9px sans-serif; fill: ${t.stroke}; }
.schematex-circuit-meter { font: bold 12px sans-serif; fill: ${t.stroke}; }
.schematex-circuit-title { font: 700 16px sans-serif; fill: ${t.text}; }
.schematex-circuit-err { stroke: ${t.error}; fill: ${t.error}; }
.schematex-circuit-enclosure { stroke: ${t.stroke}; stroke-width: 2; stroke-dasharray: 8 5; fill: ${t.bg}; }
.schematex-circuit-enclosure-inner { stroke: ${t.textMuted}; stroke-width: 1; stroke-dasharray: 4 3; fill: none; }
.schematex-circuit-panel-label { font: 700 11px system-ui, sans-serif; fill: ${t.text}; }
.schematex-circuit-din { fill: ${t.bg}; stroke: ${t.stroke}; stroke-width: 1.4; }
.schematex-circuit-din-slot { fill: ${t.textMuted}; opacity: 0.5; }
.schematex-circuit-duct { fill: none; stroke: ${t.textMuted}; stroke-width: 1.2; stroke-dasharray: 3 2; }
.schematex-circuit-duct-tooth { stroke: ${t.textMuted}; stroke-width: 0.8; opacity: 0.65; }
.schematex-circuit-panel-led { fill: ${t.accent}; stroke: ${t.stroke}; stroke-width: 0.8; }
.schematex-circuit-panel-light { fill: ${t.bg}; stroke: ${t.stroke}; stroke-width: 1.5; }
.schematex-circuit-estop { fill: ${t.error}; stroke: ${t.stroke}; stroke-width: 1.4; }
`.trim();

  const titleBar = ast.title
    ? text(
        {
          x: width / 2,
          y: 18,
          "text-anchor": "middle",
          class: "schematex-circuit-title",
        },
        ast.title
      )
    : "";

  const topOff = ast.title ? 24 : 0;

  return svgRoot(
    {
      class: "schematex-circuit",
      viewBox: `0 0 ${Math.round(width)} ${Math.round(height + topOff)}`,
      width: Math.round(width),
      height: Math.round(height + topOff),
      role: "img",
      "data-diagram-type": "circuit",
    },
    [
      titleEl(ast.title ?? "Circuit Schematic"),
      desc(
        `Circuit schematic with ${ast.components.length} components`
      ),
      defs([el("style", {}, css)]),
      titleBar,
      group({ transform: `translate(0, ${topOff})` }, [routeSvg + items]),
    ]
  );
}
