/**
 * Stage plot — stage-specific derived layout and renderer.
 *
 * The measured surface and base bounds come from the floorplan layout. This
 * module owns only live-sound equipment, numbered monitor mixes, signal paths
 * and the input-list twin view.
 */

import type { RenderConfig } from "../../core/types";
import {
  desc as descEl,
  el,
  group,
  line,
  path,
  polygon,
  rect,
  svgRoot,
  text as textEl,
  title as titleEl,
} from "../../core/svg";
import {
  resolveStageplotTheme,
  type ResolvedTheme,
  type StageplotTokens,
} from "../../core/theme";
import { STAGE_SYMBOLS } from "./stage-symbols";
import { orthogonalPolyline } from "./orthogonal-routing";
import { parseFloorplan } from "./parser";
import type {
  FloorplanAst,
  FloorplanLayoutResult,
  StageEquipmentAst,
  StageEquipmentGeom,
  StageInputRow,
  StageOutputRow,
  StageOutputType,
  StageStandType,
  StageplotLayoutData,
} from "./types";

const FT = 0.3048;
const SCALE = 52;
const DISPLAY_FONT = '"IBM Plex Sans", "Noto Sans", sans-serif';
const BODY_FONT = '"Noto Sans", "Noto Sans Arabic", sans-serif';
const MONO_FONT = '"IBM Plex Mono", "Noto Sans Mono", monospace';

type Theme = ResolvedTheme<StageplotTokens>;

const r2 = (value: number): number => Math.round(value * 100) / 100;
const round = (value: number): number => Math.round(value * 1e6) / 1e6;

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function inferStageStand(item: StageEquipmentAst): StageStandType {
  if (item.stand) return item.stand;
  if (item.kind === "boom-stand" || item.kind === "overhead") return "boom";
  if (item.kind === "straight-stand") return "straight";
  if (item.kind === "drum-mic") return "short-boom";
  return "none";
}

function stagePosition(
  ast: FloorplanAst,
  item: Pick<StageEquipmentAst, "room" | "outside" | "x" | "y" | "floor">
): string {
  if (item.outside) return "OFFSTAGE";
  const room = ast.rooms.find(
    (candidate) =>
      candidate.id === item.room && candidate.floor === item.floor
  );
  if (!room || room.w <= 0 || room.h <= 0) return "—";
  const xRatio = item.x / room.w;
  const yRatio = item.y / room.h;
  const vertical = yRatio < 1 / 3 ? "US" : yRatio < 2 / 3 ? "MS" : "DS";
  const horizontal = xRatio < 1 / 3 ? "R" : xRatio < 2 / 3 ? "C" : "L";
  return `${vertical}${horizontal}`;
}

/**
 * Derive the console patch from the plotted equipment. This is the sole input
 * list derivation used by both the public helper and SVG renderer.
 */
export function deriveStageInputList(
  input: FloorplanAst | string
): StageInputRow[] {
  const ast = typeof input === "string" ? parseFloorplan(input) : input;
  return ast.stageplot.equipment
    .filter((item): item is StageEquipmentAst & { channel: number } =>
      item.channel !== undefined
    )
    .map((item) => ({
      channel: item.channel,
      source: item.source ?? item.label ?? titleCase(item.kind),
      model: item.model ?? "—",
      position: stagePosition(ast, item),
      stand: inferStageStand(item),
      phantom: item.phantom,
      notes: item.notes ?? "",
    }))
    .sort((a, b) => a.channel - b.channel);
}

const OUTPUT_TYPES: Partial<
  Record<StageEquipmentAst["kind"], StageOutputType>
> = {
  "monitor-wedge": "WEDGE",
  iem: "IEM",
  "side-fill": "SIDE FILL",
};

/**
 * Derive the console output schedule from monitor endpoints. Multiple speakers
 * on the same mix and of the same type collapse to one quantity-bearing row.
 */
export function deriveStageOutputList(
  input: FloorplanAst | string
): StageOutputRow[] {
  const ast = typeof input === "string" ? parseFloorplan(input) : input;
  const grouped = new Map<
    string,
    StageOutputRow & {
      destinations: Set<string>;
      positions: Set<string>;
      noteValues: Set<string>;
    }
  >();
  for (const item of ast.stageplot.equipment) {
    const type = OUTPUT_TYPES[item.kind];
    if (!type || item.mix === undefined || item.mix <= 0) continue;
    const key = `${item.mix}:${type}`;
    const destination =
      item.label ?? item.source ?? titleCase(item.kind);
    const position = stagePosition(ast, item);
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += 1;
      existing.destinations.add(destination);
      existing.positions.add(position);
      if (item.notes) existing.noteValues.add(item.notes);
      continue;
    }
    grouped.set(key, {
      mix: item.mix,
      destination,
      type,
      quantity: 1,
      position,
      notes: item.notes ?? "",
      destinations: new Set([destination]),
      positions: new Set([position]),
      noteValues: new Set(item.notes ? [item.notes] : []),
    });
  }
  return [...grouped.values()]
    .map((row) => ({
      mix: row.mix,
      destination: [...row.destinations].join(" / "),
      type: row.type,
      quantity: row.quantity,
      position: [...row.positions].join(" + "),
      notes: [...row.noteValues].join(" · "),
    }))
    .sort((a, b) => a.mix - b.mix || a.type.localeCompare(b.type));
}

function roomKey(floor: number, id: string): string {
  return `${floor}:${id}`;
}

function stageBoundsCheck(
  item: StageEquipmentGeom,
  room: FloorplanLayoutResult["rooms"][number],
  errors: string[]
): void {
  const over = Math.max(
    room.x - item.x,
    item.x + item.w - (room.x + room.w),
    room.y - item.y,
    item.y + item.h - (room.y + room.h)
  );
  if (over > 0.011) {
    errors.push(
      `stage equipment ${item.kind} "${item.id}" extends ${round(over)} m outside "${room.id}" — move it or shrink it`
    );
  }
}

export function finalizeStageplotLayout(
  ast: FloorplanAst,
  lay: FloorplanLayoutResult
): FloorplanLayoutResult {
  if (lay.rooms.length === 0) {
    lay.errors.push(
      'stageplot needs at least one measured surface — declare: stage deck at 0,0 size 32x20'
    );
  }
  const unit = ast.unit === "ft" ? FT : 1;
  const rooms = new Map<string, FloorplanLayoutResult["rooms"][number]>();
  lay.rooms.forEach((room) => rooms.set(roomKey(room.floor, room.id), room));
  const plateByFloor = new Map(
    lay.plates.map((plate) => [plate.level, plate.offset])
  );
  const equipment: StageEquipmentGeom[] = [];
  const byId = new Map<string, StageEquipmentGeom>();
  const channels = new Map<number, string>();

  for (const source of ast.stageplot.equipment) {
    const def = STAGE_SYMBOLS[source.kind];
    const room = source.room
      ? rooms.get(roomKey(source.floor, source.room))
      : undefined;
    if (source.room && !room) {
      lay.errors.push(
        `stage equipment ${source.kind} "${source.id}" references unknown stage "${source.room}"`
      );
      continue;
    }
    const offset = plateByFloor.get(source.floor) ?? { x: 0, y: 0 };
    const item: StageEquipmentGeom = {
      kind: source.kind,
      id: source.id,
      x: round(
        source.outside
          ? source.x * unit + offset.x
          : (room?.x ?? 0) + source.x * unit
      ),
      y: round(
        source.outside
          ? source.y * unit + offset.y
          : (room?.y ?? 0) + source.y * unit
      ),
      w: round((source.size?.w ?? def.w / unit) * unit),
      h: round((source.size?.h ?? def.h / unit) * unit),
      rotate: source.rotate,
      label: source.label,
      channel: source.channel,
      source: source.source,
      model: source.model,
      stand: inferStageStand(source),
      phantom: source.phantom,
      notes: source.notes,
      mix: source.mix,
      roomId: source.room,
      floor: source.floor,
    };
    if (source.channel !== undefined) {
      if (!Number.isInteger(source.channel) || source.channel <= 0) {
        lay.errors.push(
          `stage equipment "${source.id}" needs a positive integer channel`
        );
      } else {
        const previous = channels.get(source.channel);
        if (previous) {
          lay.errors.push(
            `duplicate input channel ${source.channel} on "${previous}" and "${source.id}" — every console input must be unique`
          );
        } else {
          channels.set(source.channel, source.id);
        }
      }
      if (!source.model) {
        lay.warnings.push(
          `input channel ${source.channel} "${source.source ?? source.label ?? source.id}" has no suggested microphone/DI model`
        );
      }
    }
    if (
      OUTPUT_TYPES[source.kind] &&
      (!Number.isInteger(source.mix) || (source.mix ?? 0) <= 0)
    ) {
      lay.errors.push(
        `${source.kind} "${source.id}" needs a positive mix number — every monitor output must match a console mix send`
      );
    }
    if (room) stageBoundsCheck(item, room, lay.errors);
    equipment.push(item);
    byId.set(roomKey(source.floor, source.id), item);
  }

  const signals: StageplotLayoutData["signals"] = [];
  for (const signal of ast.stageplot.signals) {
    const anchors: StageEquipmentGeom[] = [];
    for (const id of signal.anchors) {
      const item = byId.get(roomKey(signal.floor, id));
      if (!item) {
        lay.errors.push(
          `signal "${signal.id}" references unknown equipment anchor "${id}" on floor ${signal.floor}`
        );
      } else {
        anchors.push(item);
      }
    }
    if (anchors.length !== signal.anchors.length || anchors.length < 2) continue;
    signals.push({
      id: signal.id,
      anchors: signal.anchors,
      points: orthogonalPolyline(
        anchors.map((item) => ({
          x: round(item.x + item.w / 2),
          y: round(item.y + item.h / 2),
        }))
      ),
      label: signal.label,
      floor: signal.floor,
    });
  }

  let minX = lay.bounds.minX;
  let minY = lay.bounds.minY;
  let maxX = lay.bounds.maxX;
  let maxY = lay.bounds.maxY;
  for (const item of equipment) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.w);
    maxY = Math.max(maxY, item.y + item.h);
  }
  lay.bounds = { minX, minY, maxX, maxY };
  lay.stageplot = {
    equipment,
    signals,
    inputList: deriveStageInputList(ast),
    outputList: deriveStageOutputList(ast),
    document: ast.stageplot.document,
    showInputList: ast.stageplot.showInputList,
    showOutputList: ast.stageplot.showOutputList,
    showSignalPaths: ast.stageplot.showSignalPaths,
  };
  return lay;
}

function stageCss(t: Theme): string {
  return `
.sx-stageplot { font-family: ${BODY_FONT}; }
.sx-stage-eyebrow { font: 700 8.5px ${MONO_FONT}; letter-spacing: .12em; fill: ${t.input}; }
.sx-stage-title { font: 650 22px ${DISPLAY_FONT}; letter-spacing: -.02em; fill: ${t.ink}; }
.sx-stage-meta-label { font: 700 7.5px ${MONO_FONT}; letter-spacing: .09em; fill: ${t.textMuted}; }
.sx-stage-meta-value { font: 550 9.5px ${BODY_FONT}; fill: ${t.ink}; }
.sx-stage-header-rule { stroke: ${t.hatchStroke}; stroke-width: 1; }
.sx-stage-section { font: 600 13px ${DISPLAY_FONT}; fill: ${t.ink}; }
.sx-stage-caption { font: 500 9px ${MONO_FONT}; fill: ${t.textMuted}; letter-spacing: .04em; }
.sx-stage-surface { fill: ${t.stageSurface}; stroke: ${t.stageEdge}; stroke-width: 2.2; }
.sx-stage-deck-line { fill: none; stroke: ${t.stageEdge}; stroke-width: .8; opacity: .16; }
.sx-stage-rail { fill: ${t.rail}; opacity: .92; }
.sx-stage-rail-text { font: 700 11px ${DISPLAY_FONT}; fill: ${t.paper}; letter-spacing: .08em; }
.sx-stage-direction { font: 700 11px ${DISPLAY_FONT}; fill: ${t.rail}; letter-spacing: .1em; }
.sx-stage-direction-note { font: 500 9px ${BODY_FONT}; fill: ${t.textMuted}; }
.sx-stage-audience { fill: ${t.stageEdge}; opacity: .1; stroke: ${t.stageEdge}; stroke-width: 1; }
.sx-stage-audience-text { font: 700 11px ${DISPLAY_FONT}; fill: ${t.stageEdge}; letter-spacing: .18em; }
.sx-stage-dim { fill: none; stroke: ${t.textMuted}; stroke-width: 1; }
.sx-stage-dim-guide { fill: none; stroke: ${t.hatchStroke}; stroke-width: .8; stroke-dasharray: 2 3; }
.sx-stage-dim-text { font: 650 9px ${MONO_FONT}; fill: ${t.textMuted}; paint-order: stroke; stroke: ${t.paper}; stroke-width: 3px; }
.sx-stage-device { fill: ${t.equipmentFill}; stroke: ${t.ink}; stroke-width: 1.3; }
.sx-stage-signal-device { fill: ${t.paper}; stroke: ${t.signal}; stroke-width: 1.5; }
.sx-stage-detail { fill: none; stroke: ${t.ink}; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round; }
.sx-stage-port { fill: ${t.signal}; stroke: none; }
.sx-stage-stand { fill: none; stroke: ${t.ink}; stroke-width: 1.5; stroke-linecap: round; }
.sx-stage-mic { fill: ${t.ink}; stroke: none; }
.sx-stage-cymbal { fill: ${t.paper}; stroke: ${t.monitor}; stroke-width: 1.4; }
.sx-stage-monitor { fill: ${t.monitor}; stroke: ${t.ink}; stroke-width: 1.2; }
.sx-stage-monitor-cone { fill: ${t.paper}; stroke: ${t.ink}; stroke-width: 1; }
.sx-stage-power { fill: ${t.paper}; stroke: ${t.monitor}; stroke-width: 1.6; }
.sx-stage-power-mark { fill: ${t.monitor}; stroke: none; }
.sx-stage-riser { fill: ${t.fillMuted}; fill-opacity: .88; stroke: ${t.stageEdge}; stroke-width: 1.2; }
.sx-stage-riser-lip { stroke: ${t.stageEdge}; stroke-width: 2.4; opacity: .45; }
.sx-stage-riser-label { font: 650 8px ${MONO_FONT}; fill: ${t.stageEdge}; paint-order: stroke; stroke: ${t.fillMuted}; stroke-width: 3px; }
.sx-stage-paper { fill: ${t.paper}; stroke: ${t.ink}; stroke-width: 1; }
.sx-stage-glyph-text { font-family: ${MONO_FONT}; font-weight: 700; fill: ${t.ink}; }
.sx-stage-label { font: 600 10px ${BODY_FONT}; fill: ${t.ink}; paint-order: stroke; stroke: ${t.paper}; stroke-width: 3px; stroke-linejoin: round; }
.sx-stage-channel { fill: ${t.signal}; stroke: ${t.paper}; stroke-width: 1.5; }
.sx-stage-channel-text { font: 700 7px ${MONO_FONT}; fill: ${t.paper}; letter-spacing: -.02em; }
.sx-stage-mix-badge { fill: ${t.monitor}; stroke: ${t.paper}; stroke-width: 1.5; }
.sx-stage-mix-text { font: 800 8.5px ${MONO_FONT}; fill: ${t.paper}; }
.sx-stage-signal { fill: none; stroke: ${t.signal}; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 4 5; opacity: .48; }
.sx-stage-signal-arrow { fill: ${t.signal}; stroke: none; opacity: .58; }
.sx-stage-signal-label { font: 600 9px ${MONO_FONT}; fill: ${t.signal}; paint-order: stroke; stroke: ${t.paper}; stroke-width: 3px; }
.sx-stage-legend-text { font: 600 8.5px ${BODY_FONT}; fill: ${t.textMuted}; }
.sx-stage-legend-mix { fill: ${t.monitor}; stroke: ${t.ink}; stroke-width: 1; }
.sx-input-heading { font: 700 13px ${DISPLAY_FONT}; fill: ${t.ink}; }
.sx-input-head-bg { fill: ${t.input}; }
.sx-input-head { font: 700 9px ${MONO_FONT}; fill: ${t.paper}; letter-spacing: .03em; }
.sx-input-row { fill: ${t.paper}; stroke: ${t.hatchStroke}; stroke-width: 1; }
.sx-input-row-alt { fill: ${t.fillMuted}; stroke: ${t.hatchStroke}; stroke-width: 1; }
.sx-input-cell { font: 500 10.5px ${BODY_FONT}; fill: ${t.ink}; }
.sx-input-cell-mono { font: 650 10px ${MONO_FONT}; fill: ${t.ink}; }
.sx-stage-error-title { font: 700 16px ${DISPLAY_FONT}; fill: ${t.negative}; }
.sx-stage-error-line { font: 11px ${MONO_FONT}; fill: ${t.negative}; }
`.trim();
}

function renderStageError(lay: FloorplanLayoutResult, t: Theme): string {
  const width = Math.max(
    620,
    ...lay.errors.map((error) => error.length * 6.4 + 40)
  );
  const height = 62 + lay.errors.length * 20;
  return svgRoot(
    {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      class: "sx-stageplot",
      role: "img",
    },
    [
      titleEl(lay.title),
      descEl(`Stage plot validation failed with ${lay.errors.length} errors.`),
      el("style", {}, stageCss(t)),
      rect({ fill: t.paper, x: 0, y: 0, width, height }),
      textEl({ class: "sx-stage-error-title", x: 18, y: 28 }, "Stage plot needs attention"),
      ...lay.errors.map((error, index) =>
        textEl(
          { class: "sx-stage-error-line", x: 18, y: 54 + index * 20 },
          `✕ ${error}`
        )
      ),
    ]
  );
}

function tableCell(
  value: string,
  x: number,
  y: number,
  width: number,
  cls = "sx-input-cell"
): string {
  const maxChars = Math.max(3, Math.floor((width - 14) / 5.5));
  const clipped =
    value.length > maxChars ? `${value.slice(0, Math.max(1, maxChars - 1))}…` : value;
  return textEl(
    {
      class: cls,
      x: r2(x + 8),
      y: r2(y + 18),
      "data-full-value": clipped === value ? undefined : value,
    },
    clipped
  );
}

interface StageTableColumn<T> {
  header: string;
  width: number;
  value: (row: T) => string;
  mono?: boolean;
}

function renderStageTable<T>(options: {
  heading: string;
  caption: string;
  rows: T[];
  columns: StageTableColumn<T>[];
  x: number;
  y: number;
  width: number;
}): { shapes: string[]; height: number } {
  const headingH = 30;
  const headH = 30;
  const rowH = 28;
  const shapes = [
    textEl(
      {
        class: "sx-input-heading",
        x: options.x,
        y: r2(options.y + 18),
      },
      options.heading
    ),
    textEl(
      {
        class: "sx-stage-caption",
        x: r2(options.x + options.width),
        y: r2(options.y + 18),
        "text-anchor": "end",
      },
      options.caption
    ),
    rect({
      class: "sx-input-head-bg",
      x: options.x,
      y: options.y + headingH,
      width: options.width,
      height: headH,
      rx: 3,
    }),
  ];
  let cursor = options.x;
  for (const column of options.columns) {
    shapes.push(
      textEl(
        {
          class: "sx-input-head",
          x: r2(cursor + 8),
          y: r2(options.y + headingH + 19),
        },
        column.header
      )
    );
    cursor += column.width;
  }
  options.rows.forEach((row, index) => {
    const rowY = options.y + headingH + headH + index * rowH;
    shapes.push(
      rect({
        class: index % 2 ? "sx-input-row-alt" : "sx-input-row",
        x: options.x,
        y: rowY,
        width: options.width,
        height: rowH,
      })
    );
    let x = options.x;
    for (const column of options.columns) {
      shapes.push(
        tableCell(
          column.value(row),
          x,
          rowY,
          column.width,
          column.mono ? "sx-input-cell-mono" : "sx-input-cell"
        )
      );
      x += column.width;
    }
  });
  return {
    shapes,
    height: headingH + headH + options.rows.length * rowH,
  };
}

function formatStageDimension(value: number, unit: FloorplanAst["unit"]): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}

export function renderStageplotLayout(
  lay: FloorplanLayoutResult,
  config?: RenderConfig
): string {
  const t = resolveStageplotTheme(config?.theme ?? "default");
  if (lay.errors.length > 0) return renderStageError(lay, t);
  const stage = lay.stageplot;
  if (!stage) {
    return renderStageError(
      { ...lay, errors: ["stageplot layout data is missing"] },
      t
    );
  }

  const px = (meters: number): number => r2(meters * SCALE);
  const plotPad = { left: 112, right: 112, top: 64, bottom: 88 };
  const plotW =
    px(lay.bounds.maxX - lay.bounds.minX) + plotPad.left + plotPad.right;
  const plotH =
    px(lay.bounds.maxY - lay.bounds.minY) + plotPad.top + plotPad.bottom;
  const tableW = 960;
  const width = Math.max(
    680,
    plotW,
    stage.showInputList || stage.showOutputList ? tableW : 0
  );
  const plotOffsetX = (width - plotW) / 2;
  const titleH = 78;
  const X = (meters: number): number =>
    r2(plotOffsetX + plotPad.left + px(meters - lay.bounds.minX));
  const Y = (meters: number): number =>
    r2(titleH + plotPad.top + px(meters - lay.bounds.minY));

  const surface: string[] = [];
  for (const room of lay.rooms) {
    for (const part of room.parts) {
      const x = X(part.x);
      const y = Y(part.y);
      const w = px(part.w);
      const h = px(part.h);
      const deckLines: string[] = [];
      for (let yy = 1; yy < part.h; yy += 1) {
        deckLines.push(
          line({
            class: "sx-stage-deck-line",
            x1: x,
            y1: Y(part.y + yy),
            x2: r2(x + w),
            y2: Y(part.y + yy),
          })
        );
      }
      surface.push(
        group(
          {
            class: "sx-stage-surface-group",
            "data-stage": room.id,
          },
          [
            rect({
              class: "sx-stage-surface",
              x,
              y,
              width: w,
              height: h,
              rx: 2,
            }),
            ...deckLines,
          ]
        )
      );
    }
  }

  const signalShapes = stage.showSignalPaths
    ? stage.signals.map((signal) => {
    const d = signal.points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${X(point.x)} ${Y(point.y)}`)
      .join(" ");
    const start = signal.points[0];
    const next = signal.points[1];
    const labelPoint =
      start && next
        ? { x: (start.x + next.x) / 2, y: (start.y + next.y) / 2 }
        : start;
    const arrows = signal.points.slice(1).flatMap((end, index) => {
      const begin = signal.points[index];
      if (!begin) return [];
      const x1 = X(begin.x);
      const y1 = Y(begin.y);
      const x2 = X(end.x);
      const y2 = Y(end.y);
      if (Math.hypot(x2 - x1, y2 - y1) < 18) return [];
      const x = r2(x1 + (x2 - x1) * 0.68);
      const y = r2(y1 + (y2 - y1) * 0.68);
      const deg = r2((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);
      return [
        polygon({
          class: "sx-stage-signal-arrow",
          points: "-3,-2.3 3.5,0 -3,2.3",
          transform: `translate(${x},${y}) rotate(${deg})`,
        }),
      ];
    });
    return group(
      {
        class: "sx-stage-signal-path",
        "data-signal": signal.id,
      },
      [
        path({ class: "sx-stage-signal", d }),
        ...arrows,
        ...(signal.label && labelPoint
          ? [
              textEl(
                {
                  class: "sx-stage-signal-label",
                  x: r2(X(labelPoint.x)),
                  y: r2(Y(labelPoint.y) - 6),
                  "text-anchor": "middle",
                },
                signal.label
              ),
            ]
          : []),
      ]
    );
      })
    : [];

  const sortedEquipment = [...stage.equipment].sort((a, b) => {
    const au = STAGE_SYMBOLS[a.kind].underlay ? 0 : 1;
    const bu = STAGE_SYMBOLS[b.kind].underlay ? 0 : 1;
    return au - bu;
  });
  const equipmentShapes = sortedEquipment.map((item) => {
    const def = STAGE_SYMBOLS[item.kind];
    const w = px(item.w);
    const h = px(item.h);
    const cx = X(item.x) + w / 2;
    const cy = Y(item.y) + h / 2;
    const children = [
      def.draw({
        w: item.w,
        h: item.h,
        px,
        label: item.label,
      }),
    ];
    if (item.kind === "monitor-wedge" && item.mix !== undefined) {
      children.push(
        textEl(
          {
            class: "sx-stage-mix-text",
            x: w / 2,
            y: r2(h * 0.62),
            "text-anchor": "middle",
            "dominant-baseline": "central",
          },
          `MIX ${item.mix}`
        )
      );
    } else if (OUTPUT_TYPES[item.kind] && item.mix !== undefined) {
      const badgeW = 42;
      children.push(
        rect({
          class: "sx-stage-mix-badge",
          x: r2(w - badgeW + 2),
          y: -3,
          width: badgeW,
          height: 15,
          rx: 7.5,
        }),
        textEl(
          {
            class: "sx-stage-mix-text",
            x: r2(w - badgeW / 2 + 2),
            y: 7.5,
            "text-anchor": "middle",
          },
          `MIX ${item.mix}`
        )
      );
    }
    if (item.channel !== undefined) {
      const badgeW = 34;
      children.push(
        rect({
          class: "sx-stage-channel",
          x: r2(w - badgeW + 2),
          y: -3,
          width: badgeW,
          height: 15,
          rx: 7.5,
        }),
        textEl(
          {
            class: "sx-stage-channel-text",
            x: r2(w - badgeW / 2 + 2),
            y: 7.5,
            "text-anchor": "middle",
          },
          `CH ${item.channel}`
        )
      );
    }
    if (item.label) {
      children.push(
        textEl(
          {
            class:
              item.kind === "stage-riser"
                ? "sx-stage-riser-label"
                : "sx-stage-label",
            x: item.kind === "stage-riser" ? 7 : w / 2,
            y: item.kind === "stage-riser" ? 13 : r2(h + 13),
            "text-anchor":
              item.kind === "stage-riser" ? "start" : "middle",
          },
          item.label
        )
      );
    }
    return group(
      {
        class: "sx-stage-equipment",
        "data-equipment": item.kind,
        "data-equipment-id": item.id,
        "data-channel": item.channel,
        "data-mix": item.mix,
        transform: `translate(${r2(cx)},${r2(cy)})${item.rotate ? ` rotate(${r2(item.rotate)})` : ""} translate(${r2(-w / 2)},${r2(-h / 2)})`,
      },
      children
    );
  });

  const primary = lay.rooms[0];
  const directions: string[] = [];
  if (primary) {
    const stageLeft = X(primary.x);
    const stageRight = X(primary.x + primary.w);
    const stageTop = Y(primary.y);
    const stageBottom = Y(primary.y + primary.h);
    const leftX = stageLeft - 76;
    const rightX = stageRight + 76;
    const midY = (stageTop + stageBottom) / 2;
    const upY = stageTop - 43;
    const downY = stageBottom + 22;
    const horizontalDimY = stageTop - 19;
    const verticalDimX = stageLeft - 34;
    const tick = 3.6;
    const sourceWidth =
      primary.sourceW ??
      primary.w / (lay.unit === "ft" ? FT : 1);
    const sourceHeight =
      primary.sourceH ??
      primary.h / (lay.unit === "ft" ? FT : 1);
    directions.push(
      line({
        class: "sx-stage-dim-guide",
        x1: stageLeft,
        y1: stageTop,
        x2: stageLeft,
        y2: horizontalDimY,
      }),
      line({
        class: "sx-stage-dim-guide",
        x1: stageRight,
        y1: stageTop,
        x2: stageRight,
        y2: horizontalDimY,
      }),
      line({
        class: "sx-stage-dim",
        x1: stageLeft,
        y1: horizontalDimY,
        x2: stageRight,
        y2: horizontalDimY,
      }),
      line({
        class: "sx-stage-dim",
        x1: r2(stageLeft - tick),
        y1: r2(horizontalDimY + tick),
        x2: r2(stageLeft + tick),
        y2: r2(horizontalDimY - tick),
      }),
      line({
        class: "sx-stage-dim",
        x1: r2(stageRight - tick),
        y1: r2(horizontalDimY + tick),
        x2: r2(stageRight + tick),
        y2: r2(horizontalDimY - tick),
      }),
      textEl(
        {
          class: "sx-stage-dim-text",
          x: r2((stageLeft + stageRight) / 2),
          y: r2(horizontalDimY - 5),
          "text-anchor": "middle",
        },
        formatStageDimension(sourceWidth, lay.unit)
      ),
      line({
        class: "sx-stage-dim-guide",
        x1: verticalDimX,
        y1: stageTop,
        x2: stageLeft,
        y2: stageTop,
      }),
      line({
        class: "sx-stage-dim-guide",
        x1: verticalDimX,
        y1: stageBottom,
        x2: stageLeft,
        y2: stageBottom,
      }),
      line({
        class: "sx-stage-dim",
        x1: verticalDimX,
        y1: stageTop,
        x2: verticalDimX,
        y2: stageBottom,
      }),
      line({
        class: "sx-stage-dim",
        x1: r2(verticalDimX - tick),
        y1: r2(stageTop + tick),
        x2: r2(verticalDimX + tick),
        y2: r2(stageTop - tick),
      }),
      line({
        class: "sx-stage-dim",
        x1: r2(verticalDimX - tick),
        y1: r2(stageBottom + tick),
        x2: r2(verticalDimX + tick),
        y2: r2(stageBottom - tick),
      }),
      textEl(
        {
          class: "sx-stage-dim-text",
          x: r2(verticalDimX - 5),
          y: r2(midY),
          "text-anchor": "middle",
          transform: `rotate(-90 ${r2(verticalDimX - 5)} ${r2(midY)})`,
        },
        formatStageDimension(sourceHeight, lay.unit)
      ),
      rect({
        class: "sx-stage-rail",
        x: r2(leftX - 12),
        y: stageTop,
        width: 24,
        height: px(primary.h),
        rx: 3,
      }),
      rect({
        class: "sx-stage-rail",
        x: r2(rightX - 12),
        y: stageTop,
        width: 24,
        height: px(primary.h),
        rx: 3,
      }),
      textEl(
        {
          class: "sx-stage-rail-text",
          x: leftX,
          y: midY,
          "text-anchor": "middle",
          transform: `rotate(-90 ${leftX} ${midY})`,
        },
        "STAGE RIGHT"
      ),
      textEl(
        {
          class: "sx-stage-rail-text",
          x: rightX,
          y: midY,
          "text-anchor": "middle",
          transform: `rotate(90 ${rightX} ${midY})`,
        },
        "STAGE LEFT"
      ),
      textEl(
        {
          class: "sx-stage-direction-note",
          x: leftX,
          y: r2(stageBottom + 14),
          "text-anchor": "middle",
        },
        "performer view"
      ),
      textEl(
        {
          class: "sx-stage-direction-note",
          x: rightX,
          y: r2(stageBottom + 14),
          "text-anchor": "middle",
        },
        "performer view"
      ),
      textEl(
        {
          class: "sx-stage-direction",
          x: X(primary.x + primary.w / 2),
          y: upY,
          "text-anchor": "middle",
        },
        "UPSTAGE"
      ),
      textEl(
        {
          class: "sx-stage-direction",
          x: X(primary.x + primary.w / 2),
          y: downY,
          "text-anchor": "middle",
        },
        "DOWNSTAGE"
      ),
      rect({
        class: "sx-stage-audience",
        x: X(primary.x),
        y: r2(downY + 10),
        width: px(primary.w),
        height: 26,
        rx: 3,
      }),
      textEl(
        {
          class: "sx-stage-audience-text",
          x: X(primary.x + primary.w / 2),
          y: r2(downY + 28),
          "text-anchor": "middle",
        },
        "AUDIENCE"
      )
    );
  }

  const tableSections: string[] = [];
  const plotBottom = titleH + plotH;
  const tableX = (width - tableW) / 2;
  let cursorY = plotBottom + 12;
  tableSections.push(
    group(
      {
        class: "sx-stage-legend",
        "data-stage-sheet": "legend",
      },
      [
        textEl(
          {
            class: "sx-stage-caption",
            x: tableX,
            y: r2(cursorY + 16),
          },
          "LEGEND"
        ),
        rect({
          class: "sx-stage-channel",
          x: r2(tableX + 62),
          y: r2(cursorY + 3),
          width: 36,
          height: 16,
          rx: 8,
        }),
        textEl(
          {
            class: "sx-stage-channel-text",
            x: r2(tableX + 80),
            y: r2(cursorY + 14),
            "text-anchor": "middle",
          },
          "CH 5"
        ),
        textEl(
          {
            class: "sx-stage-legend-text",
            x: r2(tableX + 106),
            y: r2(cursorY + 16),
          },
          "INPUT CHANNEL"
        ),
        polygon({
          class: "sx-stage-legend-mix",
          points: `${r2(tableX + 222)},${r2(cursorY + 19)} ${r2(tableX + 263)},${r2(cursorY + 19)} ${r2(tableX + 258)},${r2(cursorY + 3)} ${r2(tableX + 227)},${r2(cursorY + 3)}`,
        }),
        textEl(
          {
            class: "sx-stage-mix-text",
            x: r2(tableX + 242.5),
            y: r2(cursorY + 13),
            "text-anchor": "middle",
          },
          "MIX 1"
        ),
        textEl(
          {
            class: "sx-stage-legend-text",
            x: r2(tableX + 273),
            y: r2(cursorY + 16),
          },
          "MONITOR SEND"
        ),
        textEl(
          {
            class: "sx-stage-caption",
            x: r2(tableX + tableW),
            y: r2(cursorY + 16),
            "text-anchor": "end",
          },
          "POSITION: US / MS / DS + STAGE R / C / L"
        ),
      ]
    )
  );
  cursorY += 38;

  if (stage.showOutputList && stage.outputList.length > 0) {
    const outputTable = renderStageTable<StageOutputRow>({
      heading: "MONITOR OUTPUTS",
      caption: "AUTO-DERIVED FROM MONITOR ENDPOINTS",
      rows: stage.outputList,
      columns: [
        {
          header: "MIX",
          width: 70,
          value: (row) => String(row.mix),
          mono: true,
        },
        {
          header: "DESTINATION",
          width: 220,
          value: (row) => row.destination,
        },
        { header: "TYPE", width: 110, value: (row) => row.type },
        {
          header: "QTY",
          width: 60,
          value: (row) => String(row.quantity),
          mono: true,
        },
        {
          header: "POSITION",
          width: 100,
          value: (row) => row.position,
          mono: true,
        },
        { header: "NOTES", width: 400, value: (row) => row.notes },
      ],
      x: tableX,
      y: cursorY,
      width: tableW,
    });
    tableSections.push(
      group(
        {
          class: "sx-stage-output-list",
          "data-stage-sheet": "output-list",
        },
        outputTable.shapes
      )
    );
    cursorY += outputTable.height + 24;
  }

  if (stage.showInputList) {
    const inputTable = renderStageTable<StageInputRow>({
      heading: "INPUT LIST",
      caption: "AUTO-DERIVED FROM STAGE EQUIPMENT",
      rows: stage.inputList,
      columns: [
        {
          header: "CH",
          width: 56,
          value: (row) => String(row.channel),
          mono: true,
        },
        {
          header: "INSTRUMENT / VOCAL",
          width: 180,
          value: (row) => row.source,
        },
        {
          header: "SUGGESTED MIC / DI",
          width: 190,
          value: (row) => row.model,
        },
        {
          header: "POSITION",
          width: 76,
          value: (row) => row.position,
          mono: true,
        },
        { header: "STAND", width: 114, value: (row) => row.stand },
        {
          header: "48V",
          width: 60,
          value: (row) => (row.phantom ? "YES" : "NO"),
          mono: true,
        },
        { header: "NOTES", width: 284, value: (row) => row.notes },
      ],
      x: tableX,
      y: cursorY,
      width: tableW,
    });
    tableSections.push(
      group(
        {
          class: "sx-stage-input-list",
          "data-stage-sheet": "input-list",
        },
        inputTable.shapes
      )
    );
    cursorY += inputTable.height + 24;
  }

  const height = cursorY;
  const venueAndDate = [
    stage.document.venue,
    stage.document.showDate,
  ]
    .filter(Boolean)
    .join(" · ");
  const technicalContact = stage.document.technicalContact ?? "—";
  const revision = stage.document.revision ?? "—";
  const contactParts = technicalContact
    .split(/\s*·\s*/)
    .filter((part) => part.length > 0);
  const contactLines =
    contactParts.length <= 1
      ? [technicalContact]
      : [
          contactParts.slice(0, 2).join(" · "),
          contactParts.slice(2).join(" · "),
        ].filter((line) => line.length > 0);
  const header = group(
    { class: "sx-stage-document-header" },
    [
      textEl(
        { class: "sx-stage-eyebrow", x: 24, y: 18 },
        "STAGE PLOT / TECHNICAL ADVANCE"
      ),
      textEl(
        {
          class: "sx-stage-title",
          x: 24,
          y: 43,
        },
        lay.title
      ),
      ...(venueAndDate
        ? [
            textEl(
              {
                class: "sx-stage-meta-value",
                x: 24,
                y: 61,
              },
              venueAndDate
            ),
          ]
        : []),
      textEl(
        {
          class: "sx-stage-meta-label",
          x: r2(width - 340),
          y: 18,
        },
        "REVISION"
      ),
      textEl(
        {
          class: "sx-stage-meta-value",
          x: r2(width - 340),
          y: 32,
        },
        revision
      ),
      textEl(
        {
          class: "sx-stage-meta-label",
          x: r2(width - 340),
          y: 43,
        },
        "TECHNICAL CONTACT"
      ),
      ...contactLines.map((contactLine, index) =>
        textEl(
          {
            class: "sx-stage-meta-value",
            x: r2(width - 340),
            y: 55 + index * 11,
          },
          contactLine
        )
      ),
      line({
        class: "sx-stage-header-rule",
        x1: 24,
        y1: 70,
        x2: r2(width - 24),
        y2: 70,
      }),
    ]
  );
  const description =
    `${stage.equipment.length} stage devices, ${stage.inputList.length} input channels, ` +
    `${stage.outputList.length} monitor outputs, ${stage.signals.length} declared signal paths. ` +
    `Stage right is page left and stage left is page right, from performer view.`;

  return svgRoot(
    {
      viewBox: `0 0 ${r2(width)} ${r2(height)}`,
      width: r2(width),
      height: r2(height),
      class: "sx-stageplot",
      role: "img",
    },
    [
      titleEl(lay.title),
      descEl(description),
      el("style", {}, stageCss(t)),
      rect({ fill: t.paper, x: 0, y: 0, width, height }),
      header,
      group({ class: "sx-stage-directions" }, directions),
      group({ class: "sx-stage-surfaces" }, surface),
      group({ class: "sx-stage-signals" }, signalShapes),
      group({ class: "sx-stage-equipment-layer" }, equipmentShapes),
      ...tableSections,
    ].filter(Boolean)
  );
}
