import { boxOf, flagBoxes, labelBox, placeLabels, routeNet } from "./schematic-layout";
import { labelLeader } from "../../core/label-placement";
import { estimateTextWidth } from "../../core/text-metrics";
import type { CircuitAST, RenderConfig, SceneItem } from "../../core/types";
import { componentCaption, layoutCircuit, type LaidOutComponent, type CircuitLayoutResult } from "./layout";
import {
  RAIL_LABEL,
  layoutCircuitNetlist,
  rerouteCircuitNetlist,
  type RoutedWire,
  type SupplyFlagMark,
} from "./autolayout";
import { effectiveSymbolDef } from "./symbols";
import {
  svgRoot,
  defs,
  group,
  el,
  circle,
  rect,
  line,
  text,
  title as titleEl,
  desc,
  escapeXml,
  path as pathEl,
} from "../../core/svg";
import { resolveIndustrialTheme } from "../../core/theme";
import { resolveSceneTitle } from "../../core/title-scene";

// Three-pixel dashes distinguish caption leaders from electrical conductors.
const LABEL_LEADER_DASH = 3;

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
  layout: CircuitLayoutResult & { routes?: RoutedWire[]; flags?: SupplyFlagMark[] },
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

  const sym = effectiveSymbolDef(comp.componentType, comp.attrs);

  const body = sym.svg(comp.label, comp.value, comp.attrs);
  const transform = it.mirrorX
    ? `translate(${tx + it.length}, ${ty}) scale(-1, 1)`
    : `translate(${tx}, ${ty}) rotate(${it.rotation})`;

  // Label + value text: placed in non-rotated space using unrotated anchor endpoints.
  const labels: string[] = [];
  const caption = componentCaption(comp);
  if (caption || comp.value) {
    const labelX = it.labelPos!.x + offX;
    const labelY = it.labelPos!.y + offY;
    const bounds = labelBox(comp, { x: labelX, y: labelY });
    const bodyBounds = boxOf(it, 0);
    const centre = { x: labelX, y: (bounds.minY + bounds.maxY) / 2 };
    const attachment = { x: Math.max(bodyBounds.minX, Math.min(bodyBounds.maxX, centre.x - offX)) + offX,
      y: Math.max(bodyBounds.minY, Math.min(bodyBounds.maxY, centre.y - offY)) + offY };
    const leader = labelLeader({ x: bounds.minX, y: bounds.minY, width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY }, [attachment, attachment]);
    if (leader) labels.push(line({ x1: leader.from.x, y1: leader.from.y, x2: leader.to.x, y2: leader.to.y, class: "schematex-circuit-label-leader" }));
    if (caption) {
      labels.push(
        text(
          {
            x: labelX,
            y: labelY,
            class: "schematex-circuit-label",
            "text-anchor": "middle",
            "data-sx-role": scene && comp.labelSourceRange ? "label" : undefined,
          },
          caption
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
        bbox: { x: labelX - estimateTextWidth(comp.value, 10) / 2, y: labelY + 2, width: estimateTextWidth(comp.value, 10), height: 14 },
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
  const layout: CircuitLayoutResult & { routes?: RoutedWire[]; flags?: SupplyFlagMark[] } = isNetlist
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
  // Conductor captions belong to their routed electrical net. Keeping them out
  // of items prevents a zero-resistance connection from consuming a layout slot.
  for (const net of ast.nets) {
    if (!net.conductors?.length) continue;
    const segments = (layout.routes ?? [])
      .filter(route => routeNet(route.netId, ast.nets.map(n => n.id)) === net.id)
      .flatMap(route => route.points.slice(1).map((b, i) => ({ a: route.points[i]!, b })))
      .sort((a, b) => Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y) -
        Math.hypot(a.b.x - a.a.x, a.b.y - a.a.y));
    const segment = segments[0];
    const at = segment ? { x: (segment.a.x + segment.b.x) / 2, y: (segment.a.y + segment.b.y) / 2 } :
      layout.items.flatMap(item => Object.entries(item.anchors)
        .filter(([pin]) => ast.pinMap?.[item.component.id]?.[pin] === net.id).map(([, anchor]) => anchor))[0] ??
      { x: 0, y: 0 };
    for (const [index, conductor] of net.conductors.entries()) {
      const x = segment && segment.a.y === segment.b.y
        ? Math.min(segment.a.x, segment.b.x) + Math.abs(segment.b.x - segment.a.x) * index / net.conductors.length
        : at.x;
      (layout.flags ??= []).push({ kind: "label", at: { x, y: at.y - topOff },
        label: [conductor.label ?? conductor.id, conductor.value].filter(Boolean).join(" · ") });
    }
  }
  const positionalWires: RoutedWire[] = layout.items
    .filter((item) => item.component.componentType === "wire")
    .map((item) => ({ netId: item.component.id, points: [item.anchors.start, item.anchors.end] }));
  placeLabels(layout.items, [...(layout.routes ?? []), ...positionalWires], layout.flags ?? [], topOff);
  const labelBounds = layout.items.filter((item) => item.labelPos).map((item) => labelBox(item.component, item.labelPos!));
  const painted = [...labelBounds, ...layout.items.map((item) => boxOf(item, 0)), ...flagBoxes(layout.flags ?? [], topOff)];
  const padding = 8; // Match the existing label/canvas margin used by state diagrams.
  const left = Math.min(0, ...painted.map((box) => box.minX + layout.offsetX - padding));
  const top = Math.min(0, ...painted.map((box) => box.minY + layout.offsetY - padding));
  const width = Math.max(layout.width, ...painted.map((box) => box.maxX + layout.offsetX + padding)) - left;
  const height = Math.max(layout.height, ...painted.map((box) => box.maxY + layout.offsetY + padding)) - top;
  const { offsetX, offsetY } = layout;

  const t = resolveIndustrialTheme(config?.theme ?? "default");

  // In netlist mode, routes are rendered BEFORE items so components sit on top
  // of wires (visually cleaner — symbol fills cover the wire endpoints).
  const routeSvg = (layout.routes ?? [])
    .map((r, index) => renderRoute(r, offsetX, offsetY, index, ast, layout.items, config?.__scene))
    .join("");
  const items = layout.items.map((it) => renderItem(it, offsetX, offsetY, topOff, config?.__scene)).join("");

  // Local supply marks. These are decoration, not parts: they carry no
  // component identity, so they are drawn straight from their glyph and never
  // enter the scene graph as something a user could select or edit.
  const flagSvg = (layout.flags ?? [])
    .map((f: SupplyFlagMark) => {
      const sym = effectiveSymbolDef(f.kind, undefined);
      const rot = f.kind === "ground" ? 90 : 270;
      const x = f.at.x + offsetX;
      const y = f.at.y + offsetY + topOff;
      const glyph = f.kind === "label" ? "" : `<g transform="translate(${x}, ${y}) rotate(${rot})">${sym.svg()}</g>`;
      if (!f.label) return glyph;
      return (
        glyph +
        text(
          {
            x: x + RAIL_LABEL.x,
            y: y + RAIL_LABEL.y,
            class: "schematex-circuit-net-label",
            "text-anchor": "start",
          },
          f.label
        )
      );
    })
    .join("");

  const css = `
.schematex-circuit { font-family: system-ui, -apple-system, sans-serif; }
.schematex-circuit-hit { fill: transparent; stroke: none; pointer-events: all; }
.schematex-circuit-body { stroke: ${t.stroke}; stroke-width: 1.75; fill: none; stroke-linejoin: round; stroke-linecap: round; }
.schematex-circuit-fill { stroke: ${t.stroke}; stroke-width: 1.5; fill: ${t.stroke}; }
.schematex-circuit-wire { stroke: ${t.stroke}; stroke-width: 1.75; fill: none; stroke-linecap: square; }
.schematex-circuit-dot { fill: ${t.stroke}; stroke: none; }
.schematex-circuit-label-leader { stroke: ${t.stroke}; stroke-width: 1; stroke-dasharray: ${LABEL_LEADER_DASH} ${LABEL_LEADER_DASH}; fill: none; }
.schematex-circuit-label { font-size: 11px; font-weight: 600; fill: ${t.text}; }
.schematex-circuit-value { font-size: 10px; font-style: italic; fill: ${t.textMuted}; }
.schematex-circuit-net-label { font-size: 11px; font-weight: 600; fill: ${t.accent}; }
.schematex-circuit-pol { font-size: 9px; fill: ${t.stroke}; }
.schematex-circuit-meter { font-size: 12px; font-weight: 700; fill: ${t.stroke}; }
.schematex-circuit-title { font-size: 16px; font-weight: 700; fill: ${t.text}; }
.schematex-circuit-enclosure { stroke: ${t.stroke}; stroke-width: 2; stroke-dasharray: 8 5; fill: ${t.bg}; }
.schematex-circuit-enclosure-inner { stroke: ${t.textMuted}; stroke-width: 1; stroke-dasharray: 4 3; fill: none; }
.schematex-circuit-panel-label { font-size: 11px; font-weight: 700; fill: ${t.text}; }
.schematex-circuit-din { fill: ${t.bg}; stroke: ${t.stroke}; stroke-width: 1.4; }
.schematex-circuit-din-slot { fill: ${t.textMuted}; opacity: 0.5; }
.schematex-circuit-duct { fill: none; stroke: ${t.textMuted}; stroke-width: 1.2; stroke-dasharray: 3 2; }
.schematex-circuit-duct-tooth { stroke: ${t.textMuted}; stroke-width: 0.8; opacity: 0.65; }
.schematex-circuit-panel-led { fill: ${t.accent}; stroke: ${t.stroke}; stroke-width: 0.8; }
.schematex-circuit-panel-light { fill: ${t.bg}; stroke: ${t.stroke}; stroke-width: 1.5; }
.schematex-circuit-estop { fill: ${t.error}; stroke: ${t.stroke}; stroke-width: 1.4; }
`.trim();

  const titleScene = ast.title
    ? resolveSceneTitle(ast.title, ast.titleSourceRange, left + width / 2, 18, config)
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
      viewBox: `${left} ${top} ${Math.ceil(width)} ${Math.ceil(height + topOff)}`,
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
        ? [group({ transform: `translate(0, ${topOff})` }, [routeSvg + flagSvg + items]), titleBar]
        : [titleBar, group({ transform: `translate(0, ${topOff})` }, [routeSvg + flagSvg + items])]),
    ]
  );
}
