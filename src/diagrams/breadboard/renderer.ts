/**
 * Breadboard renderer. Z-order: substrate → rails/labels → holes → parts → wires.
 */

import type {
  BreadboardCoord,
  BreadboardLayoutPart,
  BreadboardLayoutResult,
  BreadboardLayoutSubstrate,
  RenderConfig,
  SceneItem,
} from "../../core/types";
import {
  svgRoot,
  group,
  rect as rectEl,
  circle as circleEl,
  text as textEl,
  path as pathEl,
  title as titleEl,
  desc as descEl,
  el,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { placeLabel, edgeLabelObstacles, labelPathPoints, type LabelBox } from "../../core/label-placement";
import { estimateTextWidth } from "../../core/text-metrics";
import { resolveSceneTitle } from "../../core/title-scene";
import { partSpec } from "./parts";
import { breadboardCoordXY, breadboardPartBounds, layoutBreadboard, BB_CONST } from "./layout";
import { parseBreadboard } from "./parser";

const WIRE_COLOR_MAP: Record<string, string> = {
  red: "#dc2626",
  black: "#1f2937",
  blue: "#2563eb",
  yellow: "#facc15",
  orange: "#f97316",
  green: "#16a34a",
  white: "#f3f4f6",
  purple: "#7c3aed",
  brown: "#78350f",
  grey: "#64748b",
};

export function breadboardStylesheet(t: BaseTheme): string {
  return `
.lt-bb { font-family: "Helvetica Neue", Helvetica, sans-serif; }
.lt-bb-title { font-weight: 700; font-size: 16px; fill: ${t.text}; }
.lt-bb-substrate { fill: #F4F0E6; stroke: #C7BDAA; stroke-width: 1; }
.lt-bb-rail-pos { fill: #fde2e2; stroke: #dc2626; stroke-width: 0.6; }
.lt-bb-rail-neg { fill: #dde7fa; stroke: #2563eb; stroke-width: 0.6; }
.lt-bb-rail-stripe-pos { stroke: #dc2626; stroke-width: 1.2; }
.lt-bb-rail-stripe-neg { stroke: #2563eb; stroke-width: 1.2; }
.lt-bb-trough { fill: #FCFAF5; stroke: #C7BDAA; stroke-width: 0.6; }
.lt-bb-hole { fill: #FCFAF5; stroke: #9C9486; stroke-width: 0.4; }
.lt-bb-hole-rail { fill: #FCFAF5; stroke: #9C9486; stroke-width: 0.4; }
.lt-bb-col-label { font-size: 7px; fill: #787268; text-anchor: middle; }
.lt-bb-row-label { font-size: 7px; fill: #787268; text-anchor: middle; dominant-baseline: middle; }
.lt-bb-lead { stroke: #94a3b8; stroke-width: 1.6; fill: none; stroke-linecap: round; }
.lt-bb-resistor { fill: #DCC39A; stroke: #A88B5C; stroke-width: 0.7; }
.lt-bb-cap-can { fill: #94a3b8; stroke: #1f2937; stroke-width: 0.8; }
.lt-bb-button { fill: #2B2D31; stroke: #121314; stroke-width: 0.8; }
.lt-bb-dip-body { fill: #1f2937; stroke: #475569; stroke-width: 0.8; }
.lt-bb-dip-silk { font-weight: 600; font-size: 8px; fill: #f3f4f6; }
.lt-bb-pin-label { font-size: 6.5px; fill: #f3f4f6; dominant-baseline: middle; }
.lt-bb-pin-label-sensor { font-size: 6.5px; fill: #f3f4f6; dominant-baseline: middle; }
.lt-bb-board-title { font-weight: 600; font-size: 9px; fill: #f3f4f6; }
.lt-bb-board-title-sensor { font-weight: 600; font-size: 9px; fill: #f3f4f6; }
.lt-bb-part-label { font-weight: 600; font-size: 9px; fill: ${t.text}; text-anchor: middle; }
.lt-bb-wire { fill: none; stroke-width: 2.2; stroke-linecap: round; }
.lt-bb-wire-edge { fill: none; stroke: #64748B; stroke-width: 3; stroke-linecap: round; }
.lt-bb-wire-dot { stroke: #0f172a; stroke-width: 0.6; }
`.trim();
}

// ─── Substrate rendering ─────────────────────────────────────

function renderSubstrate(sub: BreadboardLayoutSubstrate): string {
  const PITCH = sub.pitch;
  const elements: string[] = [];

  // Substrate body
  elements.push(rectEl({
    x: sub.x, y: sub.y, width: sub.width, height: sub.height,
    rx: 6, class: "lt-bb-substrate",
  }));

  // Trough
  elements.push(rectEl({
    x: sub.x + BB_CONST.BOARD_PAD_X,
    y: sub.troughY - sub.troughHeight / 2,
    width: sub.width - BB_CONST.BOARD_PAD_X * 2,
    height: sub.troughHeight,
    class: "lt-bb-trough",
  }));

  // Rails
  if (sub.hasRails) {
    const rails = [
      { y: sub.y + BB_CONST.BOARD_PAD_Y, type: "top" },
      { y: sub.y + sub.height - BB_CONST.BOARD_PAD_Y - BB_CONST.RAIL_HEIGHT, type: "bottom" },
    ];
    for (const r of rails) {
      // Positive stripe (red, top half of rail strip)
      elements.push(pathEl({
        d: `M ${sub.x + BB_CONST.BOARD_PAD_X} ${r.y + 4} L ${sub.x + sub.width - BB_CONST.BOARD_PAD_X} ${r.y + 4}`,
        class: "lt-bb-rail-stripe-pos",
      }));
      // Negative stripe (blue)
      elements.push(pathEl({
        d: `M ${sub.x + BB_CONST.BOARD_PAD_X} ${r.y + BB_CONST.RAIL_HEIGHT - 4} L ${sub.x + sub.width - BB_CONST.BOARD_PAD_X} ${r.y + BB_CONST.RAIL_HEIGHT - 4}`,
        class: "lt-bb-rail-stripe-neg",
      }));
      // Rail break (only on full board)
      if (sub.railsBreak) {
        const breakX1 = sub.x + BB_CONST.BOARD_PAD_X + BB_CONST.ROW_LABEL_W + (30) * PITCH - PITCH / 2;
        const breakX2 = breakX1 + PITCH;
        elements.push(rectEl({
          x: breakX1, y: r.y, width: breakX2 - breakX1, height: BB_CONST.RAIL_HEIGHT,
          fill: "#F4F0E6",
        }));
      }
      // Rail holes
      for (let c = 1; c <= sub.cols; c++) {
        const cx = sub.x + BB_CONST.BOARD_PAD_X + BB_CONST.ROW_LABEL_W + PITCH / 2 + (c - 1) * PITCH;
        elements.push(circleEl({ cx, cy: r.y + 4, r: 1.4, class: "lt-bb-hole-rail" }));
        elements.push(circleEl({ cx, cy: r.y + BB_CONST.RAIL_HEIGHT - 4, r: 1.4, class: "lt-bb-hole-rail" }));
      }
    }
  }

  // Column labels (every 5)
  const topRailsH = sub.hasRails ? BB_CONST.RAIL_HEIGHT : 0;
  const colLabelY = sub.y + BB_CONST.BOARD_PAD_Y + topRailsH + 8;
  for (let c = 5; c <= sub.cols; c += 5) {
    const cx = sub.x + BB_CONST.BOARD_PAD_X + BB_CONST.ROW_LABEL_W + PITCH / 2 + (c - 1) * PITCH;
    elements.push(textEl({ x: cx, y: colLabelY, class: "lt-bb-col-label" }, String(c)));
  }
  // Bottom column labels
  const colLabelY2 = sub.y + sub.height - BB_CONST.BOARD_PAD_Y - (sub.hasRails ? BB_CONST.RAIL_HEIGHT : 0) - 4;
  for (let c = 5; c <= sub.cols; c += 5) {
    const cx = sub.x + BB_CONST.BOARD_PAD_X + BB_CONST.ROW_LABEL_W + PITCH / 2 + (c - 1) * PITCH;
    elements.push(textEl({ x: cx, y: colLabelY2, class: "lt-bb-col-label" }, String(c)));
  }

  // Row labels (a..e top, f..j bottom) on left and right sides
  const rowsTop = ["a", "b", "c", "d", "e"];
  const rowsBot = ["f", "g", "h", "i", "j"];
  const gridY0 = sub.y + BB_CONST.BOARD_PAD_Y + topRailsH + BB_CONST.COL_LABEL_H + PITCH / 2;
  for (let i = 0; i < 5; i++) {
    const yTop = gridY0 + i * PITCH;
    const yBot = gridY0 + (i + 5) * PITCH + BB_CONST.TROUGH;
    elements.push(textEl({ x: sub.x + BB_CONST.BOARD_PAD_X + 4, y: yTop, class: "lt-bb-row-label" }, rowsTop[i]!));
    elements.push(textEl({ x: sub.x + sub.width - BB_CONST.BOARD_PAD_X - 4, y: yTop, class: "lt-bb-row-label" }, rowsTop[i]!));
    elements.push(textEl({ x: sub.x + BB_CONST.BOARD_PAD_X + 4, y: yBot, class: "lt-bb-row-label" }, rowsBot[i]!));
    elements.push(textEl({ x: sub.x + sub.width - BB_CONST.BOARD_PAD_X - 4, y: yBot, class: "lt-bb-row-label" }, rowsBot[i]!));
  }

  // Holes (10 rows × cols)
  for (let c = 1; c <= sub.cols; c++) {
    for (let r = 0; r < 10; r++) {
      const cx = sub.x + BB_CONST.BOARD_PAD_X + BB_CONST.ROW_LABEL_W + PITCH / 2 + (c - 1) * PITCH;
      let cy = gridY0 + r * PITCH;
      if (r >= 5) cy += BB_CONST.TROUGH;
      elements.push(circleEl({ cx, cy, r: 1.6, class: "lt-bb-hole" }));
    }
  }

  return group({ class: "lt-bb-substrate-group" }, elements);
}

// ─── Parts ───────────────────────────────────────────────────

function editableCoord(coord: BreadboardCoord): { kind: "hole" | "rail"; col: number; row?: string; rail?: string } {
  return coord.kind === "hole"
    ? { kind: "hole", col: coord.col, row: coord.row }
    : { kind: "rail", col: coord.col, rail: coord.rail };
}

function renderPart(lp: BreadboardLayoutPart, sub: BreadboardLayoutSubstrate, scene?: SceneItem[], labelBox?: LabelBox): string {
  const spec = partSpec(lp.part.kind, lp.part.args);
  const body = spec.body(lp.part, lp.width, lp.height);
  const bounds = breadboardPartBounds(lp);
  const twoTerminal = spec.category === "grid" && spec.pins.length === 2;
  const labelText = lp.part.label ?? defaultPartLabel(lp);
  const labelEl = labelText
    ? textEl({
        x: labelBox ? labelBox.x + labelBox.width / 2 : bounds.x + bounds.width / 2,
        y: labelBox ? labelBox.y + 9 : bounds.y - 6,
        class: "lt-bb-part-label",
      }, labelText)
    : "";
  const placement = lp.part.placement;
  const canMove = placement.kind !== "side" && lp.part.placementSourceRange !== undefined;
  const key = `node:${lp.part.id}`;
  if (canMove) {
    const from = placement.kind === "point" ? placement.at : placement.from;
    const to = placement.kind === "span" ? placement.to : undefined;
    const anchor = breadboardCoordXY(sub, from);
    const gridX0 = breadboardCoordXY(sub, { kind: "hole", col: 1, row: "a" }).x;
    const holeRowYs = [..."abcdefghij"].map((row) =>
      breadboardCoordXY(sub, { kind: "hole", col: 1, row: row as "a" }).y
    );
    const railRowYs = sub.hasRails
      ? Object.fromEntries(["+t", "-t", "+b", "-b"].map((rail) => [
          rail,
          breadboardCoordXY(sub, { kind: "rail", rail: rail as "+t", col: 1 }).y,
        ]))
      : {};
    scene?.push({
      key,
      kind: "node",
      semanticId: lp.part.id,
      label: lp.part.label ?? lp.part.id,
      bbox: bounds,
      positionSource: {
        kind: "breadboard",
        range: lp.part.placementSourceRange!,
        from: editableCoord(from),
        to: to ? editableCoord(to) : undefined,
        anchorSvgX: anchor.x,
        anchorSvgY: anchor.y,
        gridX0,
        holeRowYs,
        railRowYs,
        pitch: sub.pitch,
        cols: sub.cols,
      },
      editable: { label: false, position: "free" },
    });
  }
  return group(
    {
      class: `lt-bb-part lt-bb-part-${lp.part.kind}`,
      "data-sx-key": scene && canMove ? key : undefined,
      "data-sx-owner": scene && canMove ? key : undefined,
    },
    [
      group({ transform: `translate(${lp.x.toFixed(2)} ${lp.y.toFixed(2)})${twoTerminal ? ` rotate(${lp.rotation}) translate(0 ${-lp.height / 2})` : ""}` }, [body]),
      labelEl,
    ],
  );
}

function defaultPartLabel(lp: BreadboardLayoutPart): string | undefined {
  const id = lp.part.id;
  const args = lp.part.args;
  if (lp.part.kind === "resistor" && args.value !== undefined) {
    return `${id.toUpperCase()} ${args.value}Ω`;
  }
  if (lp.part.kind === "led" && args.color) {
    return `${id.toUpperCase()} (${String(args.color)})`;
  }
  if (lp.part.kind.startsWith("mcu-") || lp.part.kind.startsWith("sensor-") || lp.part.kind.startsWith("display-") || lp.part.kind.startsWith("module-") || lp.part.kind.startsWith("actuator-")) {
    return undefined; // module body draws its own title
  }
  return id.toUpperCase();
}

// ─── Wires ───────────────────────────────────────────────────

function renderWire(lw: BreadboardLayoutResult["wires"][number], scene?: SceneItem[], index = 0): string {
  const stroke = WIRE_COLOR_MAP[lw.color] ?? "#475569";
  const from = lw.wire.from.kind === "pin" ? lw.wire.from.partId : undefined;
  const to = lw.wire.to.kind === "pin" ? lw.wire.to.partId : undefined;
  scene?.push({
    key: `edge:${index}`,
    kind: "edge",
    path: lw.path,
    editable: { label: false, position: "none" },
  });
  const path = pathEl({ d: lw.path, class: "lt-bb-wire", stroke, "data-sx-live-edge": scene ? "true" : undefined });
  const dot1 = circleEl({
    cx: lw.fromXY.x,
    cy: lw.fromXY.y,
    r: 1.8,
    fill: stroke,
    class: "lt-bb-wire-dot",
    "data-sx-owner": scene && from ? `node:${from}` : undefined,
  });
  const dot2 = circleEl({
    cx: lw.toXY.x,
    cy: lw.toXY.y,
    r: 1.8,
    fill: stroke,
    class: "lt-bb-wire-dot",
    "data-sx-owner": scene && to ? `node:${to}` : undefined,
  });
  return group({
    class: "lt-bb-wire-g",
    ...(scene && (from || to) ? {
      "data-sx-live-explicit": "true",
      "data-sx-live-start": from,
      "data-sx-live-end": to,
    } : {}),
  }, [pathEl({ d: lw.path, class: "lt-bb-wire-edge", "data-sx-live-edge": scene ? "true" : undefined }), path, dot1, dot2]);
}

// ─── Public API ─────────────────────────────────────────────

export function renderBreadboardLayout(layout: BreadboardLayoutResult, config?: RenderConfig): string {
  const theme = resolveBaseTheme(config?.theme ?? "default");
  const css = breadboardStylesheet(theme);

  const titleStr = layout.ast.title ?? "Breadboard";

  const title = layout.ast.title
    ? resolveSceneTitle(layout.ast.title, layout.ast.titleSourceRange, layout.width / 2, 22, config)
    : undefined;
  const titleNode = title
    ? textEl({ x: title.x, y: title.y, class: "lt-bb-title", "text-anchor": "middle", ...title.attrs }, layout.ast.title!)
    : "";

  const substrate = renderSubstrate(layout.substrate);
  const occupied: LabelBox[] = [...layout.parts.map(breadboardPartBounds), ...layout.wires.flatMap(wire => edgeLabelObstacles(labelPathPoints(wire.path)))];
  if (layout.ast.title) occupied.push({ x: 0, y: 0, width: layout.width, height: 30 });
  const parts = layout.parts.map(part => {
    const value = part.part.label ?? defaultPartLabel(part);
    const bounds = breadboardPartBounds(part);
    const labelBox = value ? placeLabel({ x: bounds.x + bounds.width / 2, y: bounds.y - 10 },
      { width: estimateTextWidth(value, 9), height: 11 }, occupied, { x: 1, y: 0 }) : undefined;
    if (labelBox) {
      labelBox.x = Math.max(8, Math.min(labelBox.x, layout.width - labelBox.width - 8));
      labelBox.y = Math.max(layout.ast.title ? 38 : 8, Math.min(labelBox.y, layout.height - labelBox.height - 8));
      occupied.push(labelBox);
    }
    return renderPart(part, layout.substrate, config?.__scene, labelBox);
  }).join("\n");
  const wires = layout.wires.map((wire, index) => renderWire(wire, config?.__scene, index)).join("\n");

  const inner = [
    titleEl(escapeXml(titleStr)),
    descEl("Breadboard wiring diagram generated by Schematex"),
    el("style", {}, css),
    titleNode,
    substrate,
    group({ class: "lt-bb-parts" }, [parts]),
    group({ class: "lt-bb-wires" }, [wires]),
  ];

  return svgRoot(
    {
      width: layout.width,
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      class: "lt-bb",
    },
    inner
  );
}

export function renderBreadboard(text: string, config?: RenderConfig): string {
  const ast = parseBreadboard(text);
  const layout = layoutBreadboard(ast);
  return renderBreadboardLayout(layout, config);
}
