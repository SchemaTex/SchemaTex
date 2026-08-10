import type { CircuitAST, RenderConfig, SceneItem } from "../../core/types";
import { layoutCircuit, type LaidOutComponent, type CircuitLayoutResult } from "./layout";
import { layoutCircuitNetlist, rerouteCircuitNetlist, type RoutedWire } from "./autolayout";
import { effectiveSymbolDef, getSymbol } from "./symbols";
import {
  svgRoot,
  defs,
  group,
  el,
  circle,
  rect,
  text,
  title as titleEl,
  desc,
  escapeXml,
  path as pathEl,
} from "../../core/svg";
import { resolveIndustrialTheme } from "../../core/theme";
import { resolveSceneTitle } from "../../core/title-scene";

function itemBBox(
  it: LaidOutComponent,
  offX: number,
  offY: number,
  topOff: number
): { x: number; y: number; width: number; height: number } {
  const points = Object.values(it.anchors);
  const xs = points.length ? points.map((point) => point.x + offX) : [it.x + offX];
  const ys = points.length ? points.map((point) => point.y + offY + topOff) : [it.y + offY + topOff];
  const minX = Math.min(...xs) - 18;
  const minY = Math.min(...ys) - 22;
  const maxX = Math.max(...xs) + 18;
  const maxY = Math.max(...ys) + 22;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function samePoint(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < 0.1 && Math.abs(a.y - b.y) < 0.1;
}

/** Apply stable component pins before routes are rebuilt from the moved anchors. */
function applyCircuitPins(
  layout: CircuitLayoutResult & { routes?: RoutedWire[] },
  pins: Map<string, { x: number; y: number }> | undefined,
  topOff: number
): void {
  if (!pins?.size) return;
  for (const item of layout.items) {
    if (!item.component.stableId) continue;
    const pin = pins.get(item.component.id);
    if (!pin) continue;
    const bbox = itemBBox(item, layout.offsetX, layout.offsetY, topOff);
    const dx = pin.x - bbox.x;
    const dy = pin.y - bbox.y;
    if (!dx && !dy) continue;
    const oldAnchors = Object.values(item.anchors).map((point) => ({ ...point }));
    item.x += dx;
    item.y += dy;
    for (const anchor of Object.values(item.anchors)) {
      anchor.x += dx;
      anchor.y += dy;
    }

    // Positional-mode wires are layout items rather than routed nets.
    for (const wire of layout.items) {
      if (wire.component.componentType !== "wire" || wire === item) continue;
      for (const [name, anchor] of Object.entries(wire.anchors)) {
        if (!oldAnchors.some((old) => samePoint(old, anchor))) continue;
        anchor.x += dx;
        anchor.y += dy;
        if (name === "start") {
          wire.x += dx;
          wire.y += dy;
        }
      }
    }
  }
}

function renderItem(
  it: LaidOutComponent,
  offX: number,
  offY: number,
  topOff: number,
  scene?: SceneItem[]
): string {
  const comp = it.component;
  const tx = it.x + offX;
  const ty = it.y + offY;
  const key = `node:${comp.id}`;
  const bbox = itemBBox(it, offX, offY, topOff);
  const position = comp.stableId ? "free" as const : "none" as const;
  scene?.push({
    key,
    kind: "node",
    semanticId: comp.stableId ? comp.id : undefined,
    label: comp.label,
    sourceRange: comp.labelSourceRange,
    bbox,
    editable: { label: comp.labelSourceRange !== undefined, position },
  });
  const wrap = (children: string | string[]): string => scene
    ? group(
        { "data-sx-key": key, "data-sx-owner": key, "data-id": comp.id, "data-type": comp.componentType },
        [
          rect({
            class: "schematex-circuit-hit",
            x: bbox.x,
            y: bbox.y - topOff,
            width: bbox.width,
            height: bbox.height,
          }),
          ...(Array.isArray(children) ? children : [children]),
        ]
      )
    : Array.isArray(children) ? children.join("") : children;

  if (comp.componentType === "wire") {
    const x2 = (it.anchors.end.x) + offX;
    const y2 = (it.anchors.end.y) + offY;
    return wrap(`<line x1="${tx}" y1="${ty}" x2="${x2}" y2="${y2}" class="schematex-circuit-wire"/>`);
  }

  if (comp.componentType === "dot") {
    return wrap(circle({
      cx: tx,
      cy: ty,
      r: 3.5,
      class: "schematex-circuit-dot",
      "data-id": comp.id,
    }));
  }

  if (comp.componentType === "label") {
    const dir = comp.direction;
    const anchor =
      dir === "left" ? "end" : dir === "right" ? "start" : "middle";
    const dx = dir === "right" ? 6 : dir === "left" ? -6 : 0;
    const dy = dir === "down" ? 14 : dir === "up" ? -6 : 4;
    return wrap(text(
      {
        x: tx + dx,
        y: ty + dy,
        class: "schematex-circuit-net-label",
        "text-anchor": anchor,
        "data-sx-role": scene && comp.labelSourceRange ? "label" : undefined,
      },
      comp.label ?? ""
    ));
  }

  const sym = effectiveSymbolDef(comp.componentType, comp.attrs) ?? getSymbol(comp.componentType);
  if (!sym) {
    return wrap(`<rect x="${tx - 10}" y="${ty - 10}" width="20" height="20" fill="none" class="schematex-circuit-err" stroke-dasharray="3,2"/><text x="${tx}" y="${ty + 3}" text-anchor="middle" font-size="9" class="schematex-circuit-err">?${escapeXml(comp.componentType)}</text>`);
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
    const labelX =
      midpointX + (vertical ? 34 : 0) + (sym.labelOffset?.dx ?? 0);
    const labelY =
      midpointY - (vertical ? 2 : 18) + (sym.labelOffset?.dy ?? 0);
    if (comp.label) {
      labels.push(
        text(
          {
            x: labelX,
            y: labelY,
            class: "schematex-circuit-label",
            "text-anchor": "middle",
            "data-sx-role": scene && comp.labelSourceRange ? "label" : undefined,
          },
          comp.label
        )
      );
    }
    if (comp.value) {
      const valueKey = `${key}:value`;
      scene?.push({
        key: valueKey,
        kind: "label",
        label: comp.value,
        sourceRange: comp.valueSourceRange,
        bbox: { x: labelX - Math.max(24, comp.value.length * 3.2), y: labelY, width: Math.max(48, comp.value.length * 6.4), height: 14 },
        editable: { label: comp.valueSourceRange !== undefined, position: "none" },
      });
      labels.push(
        text(
          {
            x: labelX,
            y: labelY + 12,
            class: "schematex-circuit-value",
            "text-anchor": "middle",
            "data-sx-key": scene && comp.valueSourceRange ? valueKey : undefined,
            "data-sx-role": scene && comp.valueSourceRange ? "label" : undefined,
          },
          comp.value
        )
      );
    }
  }

  const bodyGroup = scene
    ? group({ transform, "data-id": comp.id, "data-type": comp.componentType }, [body])
    : `<g transform="${transform}" data-id="${escapeXml(comp.id)}" data-type="${escapeXml(comp.componentType)}">${body}</g>`;
  return wrap([
    bodyGroup,
    labels.join(""),
  ]);
}

function renderRoute(
  r: RoutedWire,
  offX: number,
  offY: number,
  index: number,
  ast: CircuitAST,
  items: LaidOutComponent[],
  scene?: SceneItem[]
): string {
  if (r.points.length < 2) return "";
  const pts = r.points.map((point) => `${point.x + offX},${point.y + offY}`).join(" ");
  const d = r.points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"}${point.x + offX} ${point.y + offY}`).join(" ");
  const line = scene
    ? pathEl({ d, class: "schematex-circuit-wire", "data-sx-live-edge": "true" })
    : `<polyline points="${pts}" class="schematex-circuit-wire" fill="none"/>`;
  const dots = (r.junctions ?? [])
    .map(
      (j) =>
        `<circle cx="${j.x + offX}" cy="${j.y + offY}" r="3.5" class="schematex-circuit-dot"/>`
    )
    .join("");
  if (!scene) return line + dots;
  const net = [...ast.nets].sort((a, b) => b.id.length - a.id.length).find((candidate) =>
    r.netId === candidate.id || r.netId.startsWith(`${candidate.id}.`)
  );
  const ids = [...new Set((net?.anchors ?? []).map((anchor) => anchor.split(".")[0]!))];
  const branchId = net && r.netId.startsWith(`${net.id}.`)
    ? r.netId.slice(net.id.length + 1).split(".")[0]
    : undefined;
  const ownersAt = (point: { x: number; y: number }): string[] => [
    ...new Set(items.flatMap((item) =>
      Object.values(item.anchors).some((anchor) => samePoint(anchor, point))
        ? [item.component.id]
        : []
    )),
  ];
  const startOwners = ownersAt(r.points[0]!);
  const endOwners = ownersAt(r.points[r.points.length - 1]!);
  // A routed branch starts at one specific component pin and terminates on a
  // shared rail/spine. A two-component net has two authored endpoints. Never
  // reuse the net's first/last ids for every branch: that made live dragging
  // pull unrelated endpoints until the post-drop rerender corrected them.
  const liveStartOwners = startOwners.length
    ? startOwners
    : branchId
      ? [branchId]
      : ids.length === 2
        ? [ids[0]!]
        : [];
  const liveEndOwners = endOwners.length
    ? endOwners
    : branchId
      ? []
      : ids.length === 2
        ? [ids[1]!]
        : [];
  const liveStart = liveStartOwners.join(",") || undefined;
  const liveEnd = liveEndOwners.join(",") || undefined;
  const key = `edge:${index}`;
  scene?.push({ key, kind: "edge", path: d, editable: { label: false, position: "none" } });
  return group({
    "data-sx-key": scene ? key : undefined,
    "data-from": liveStartOwners[0],
    "data-to": liveEndOwners[0],
    "data-sx-live-explicit": "true",
    "data-sx-live-start": liveStart,
    "data-sx-live-end": liveEnd,
    "data-sx-live-mode": "orthogonal",
  }, [line, dots]);
}

export function renderCircuit(ast: CircuitAST, config?: RenderConfig): string {
  const isNetlist = ast.mode === "netlist";
  const topOff = ast.title ? 24 : 0;
  const layout: CircuitLayoutResult & { routes?: RoutedWire[] } = isNetlist
    ? layoutCircuitNetlist(ast)
    : layoutCircuit(ast);
  const baseRoutes = layout.routes?.map((route) => ({
    ...route,
    points: route.points.map((point) => ({ ...point })),
    junctions: route.junctions?.map((point) => ({ ...point })),
  })) ?? [];
  applyCircuitPins(layout, config?.__pins, topOff);
  if (isNetlist && config?.__pins?.size) {
    layout.routes = rerouteCircuitNetlist(ast, layout.items, baseRoutes);
  }
  const { width, height, offsetX, offsetY } = layout;

  const t = resolveIndustrialTheme(config?.theme ?? "default");

  // In netlist mode, routes are rendered BEFORE items so components sit on top
  // of wires (visually cleaner — symbol fills cover the wire endpoints).
  const routeSvg = (layout.routes ?? [])
    .map((r, index) => renderRoute(r, offsetX, offsetY, index, ast, layout.items, config?.__scene))
    .join("");
  const items = layout.items.map((it) => renderItem(it, offsetX, offsetY, topOff, config?.__scene)).join("");

  const css = `
.schematex-circuit { font-family: system-ui, -apple-system, sans-serif; }
.schematex-circuit-hit { fill: transparent; stroke: none; pointer-events: all; }
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

  const titleScene = ast.title
    ? resolveSceneTitle(ast.title, ast.titleSourceRange, width / 2, 18, config)
    : undefined;
  const titleBar = ast.title && titleScene
    ? text(
        {
          x: titleScene.x,
          y: titleScene.y,
          "text-anchor": "middle",
          class: "schematex-circuit-title",
          ...titleScene.attrs,
        },
        ast.title
      )
    : "";

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
      ...(config?.__scene
        ? [group({ transform: `translate(0, ${topOff})` }, [routeSvg + items]), titleBar]
        : [titleBar, group({ transform: `translate(0, ${topOff})` }, [routeSvg + items])]),
    ]
  );
}
