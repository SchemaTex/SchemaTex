import { circle, group, line, path, polygon, rect, text } from "../../core/svg";
import { wrapTextToWidth } from "../../core/text-metrics";
import type { PidActuatorType, PidEquipType, PidFailPosition } from "./types";
import { PID_ACTUATOR_TYPES, PID_FAIL_POSITIONS } from "./types";

/**
 * Symbol library for ISA-5.1 / ISO 10628 equipment.
 *
 * Each symbol returns SVG centered at (0, 0). The geometry record below
 * encodes the bounding box and the standard set of port anchors (relative
 * to the center) used by the layout engine.
 */

export interface PortMap {
  [name: string]: { x: number; y: number };
}

export interface SymbolGeometry {
  width: number;
  height: number;
  /** Port name → (x,y) relative to the symbol's CENTER. */
  ports: PortMap;
}

const HALF = (n: number) => n / 2;

export const GEOMETRY: Record<PidEquipType, SymbolGeometry> = {
  // ── Tanks & vessels ─────────────────────────────────────
  tank_atm: {
    width: 90,
    height: 90,
    ports: {
      top: { x: 0, y: -45 },
      bottom: { x: 0, y: 45 },
      left: { x: -45, y: 0 },
      right: { x: 45, y: 0 },
      in: { x: -45, y: 0 },
      out: { x: 45, y: 0 },
    },
  },
  tank_cone_roof: {
    width: 90,
    height: 100,
    ports: {
      top: { x: 0, y: -50 },
      bottom: { x: 0, y: 50 },
      left: { x: -45, y: 0 },
      right: { x: 45, y: 0 },
    },
  },
  vessel_v: {
    width: 70,
    height: 130,
    ports: {
      top: { x: 0, y: -65 },
      bottom: { x: 0, y: 65 },
      left: { x: -35, y: 0 },
      right: { x: 35, y: 0 },
      in: { x: -35, y: -25 },
      out: { x: 35, y: 25 },
    },
  },
  vessel_h: {
    width: 130,
    height: 70,
    ports: {
      top: { x: 0, y: -35 },
      bottom: { x: 0, y: 35 },
      left: { x: -65, y: 0 },
      right: { x: 65, y: 0 },
      in: { x: -65, y: 0 },
      out: { x: 65, y: 0 },
    },
  },
  sphere: {
    width: 90,
    height: 90,
    ports: {
      top: { x: 0, y: -45 },
      bottom: { x: 0, y: 45 },
      left: { x: -45, y: 0 },
      right: { x: 45, y: 0 },
    },
  },
  column_tray: {
    width: 60,
    height: 180,
    ports: {
      top: { x: 0, y: -90 },
      bottom: { x: 0, y: 90 },
      feed: { x: -30, y: 0 },
      reflux: { x: 0, y: -90 },
      bottom_return: { x: -30, y: 70 },
      vapor_out: { x: 0, y: -90 },
      liquid_out: { x: 0, y: 90 },
    },
  },
  column_packed: {
    width: 60,
    height: 180,
    ports: {
      top: { x: 0, y: -90 },
      bottom: { x: 0, y: 90 },
      feed: { x: -30, y: 0 },
    },
  },
  hx_shell_tube: {
    width: 130,
    height: 60,
    ports: {
      shell_in: { x: 0, y: -30 },
      shell_out: { x: 0, y: 30 },
      tube_in: { x: -65, y: 0 },
      tube_out: { x: 65, y: 0 },
      in: { x: -65, y: 0 },
      out: { x: 65, y: 0 },
    },
  },
  hx_air_cooled: {
    width: 130,
    height: 80,
    ports: {
      in: { x: -65, y: 10 },
      out: { x: 65, y: 10 },
    },
  },
  reboiler: {
    width: 110,
    height: 60,
    ports: {
      in: { x: -55, y: 0 },
      out: { x: 55, y: 0 },
      bottom: { x: 0, y: 30 },
    },
  },
  condenser: {
    width: 130,
    height: 60,
    ports: {
      shell_in: { x: -50, y: -30 },
      shell_out: { x: 50, y: 30 },
      tube_in: { x: -65, y: 0 },
      tube_out: { x: 65, y: 0 },
      in: { x: -65, y: 0 },
      out: { x: 65, y: 0 },
    },
  },
  pump_general: {
    width: 70,
    height: 60,
    ports: {
      in: { x: -35, y: 0 },
      out: { x: 35, y: 0 },
      left: { x: -35, y: 0 },
      right: { x: 35, y: 0 },
    },
  },
  pump_centrifugal: {
    width: 70,
    height: 60,
    ports: {
      in: { x: -30, y: 0 },
      out: { x: 28, y: -22 },
      top: { x: 28, y: -22 },
      left: { x: -30, y: 0 },
      right: { x: 28, y: -22 },
    },
  },
  pump_diaphragm: {
    width: 70,
    height: 60,
    ports: {
      in: { x: -35, y: 0 },
      out: { x: 35, y: 0 },
      left: { x: -35, y: 0 },
      right: { x: 35, y: 0 },
    },
  },
  pump_pd: {
    width: 70,
    height: 60,
    ports: {
      in: { x: -35, y: 0 },
      out: { x: 35, y: 0 },
    },
  },
  compressor: {
    width: 90,
    height: 60,
    ports: {
      in: { x: -45, y: 0 },
      out: { x: 45, y: 0 },
    },
  },
  blower: {
    width: 70,
    height: 60,
    ports: {
      in: { x: -35, y: 0 },
      out: { x: 35, y: 0 },
    },
  },
  reactor_cstr: {
    width: 90,
    height: 110,
    ports: {
      top: { x: 0, y: -55 },
      bottom: { x: 0, y: 55 },
      in: { x: -45, y: -10 },
      out: { x: 0, y: 55 },
    },
  },
  reactor_pfr: {
    width: 130,
    height: 50,
    ports: {
      in: { x: -65, y: 0 },
      out: { x: 65, y: 0 },
    },
  },
  filter: {
    width: 70,
    height: 70,
    ports: {
      in: { x: -35, y: 0 },
      out: { x: 35, y: 0 },
      left: { x: -35, y: 0 },
      right: { x: 35, y: 0 },
      top: { x: 0, y: -35 },
      bottom: { x: 0, y: 35 },
      drain: { x: 0, y: 35 },
      backwash: { x: -35, y: 22 },
    },
  },
  cyclone: {
    width: 70,
    height: 100,
    ports: {
      top: { x: 0, y: -50 },
      in: { x: -35, y: -30 },
      bottom: { x: 0, y: 50 },
      out: { x: 0, y: -50 },
    },
  },
  flare: {
    width: 30,
    height: 110,
    ports: {
      top: { x: 0, y: -55 },
      bottom: { x: 0, y: 55 },
      in: { x: 0, y: 55 },
    },
  },
  cooling_tower: {
    width: 100,
    height: 90,
    ports: {
      top: { x: 0, y: -45 },
      in: { x: -50, y: 0 },
      out: { x: 50, y: 0 },
    },
  },
  boiler: {
    width: 100,
    height: 100,
    ports: {
      feed: { x: -50, y: 20 },
      in: { x: -50, y: 20 },
      steam: { x: 50, y: -28 },
      out: { x: 50, y: -28 },
      fuel: { x: -50, y: 38 },
      blowdown: { x: 0, y: 50 },
      top: { x: 0, y: -50 },
      bottom: { x: 0, y: 50 },
    },
  },
  burner: {
    width: 76,
    height: 56,
    ports: {
      fuel: { x: -38, y: 0 },
      in: { x: -38, y: 0 },
      flame: { x: 38, y: 0 },
      out: { x: 38, y: 0 },
    },
  },
  generator: {
    width: 76,
    height: 76,
    ports: {
      shaft: { x: -38, y: 0 },
      in: { x: -38, y: 0 },
      electric: { x: 38, y: 0 },
      out: { x: 38, y: 0 },
      top: { x: 0, y: -38 },
      bottom: { x: 0, y: 38 },
    },
  },

  // ── Valves (in-line) ──────────────────────────────────
  valve_gate: {
    width: 36,
    height: 22,
    ports: { in: { x: -18, y: 0 }, out: { x: 18, y: 0 }, left: { x: -18, y: 0 }, right: { x: 18, y: 0 } },
  },
  valve_ball: {
    width: 36,
    height: 22,
    ports: { in: { x: -18, y: 0 }, out: { x: 18, y: 0 } },
  },
  valve_globe: {
    width: 36,
    height: 28,
    ports: { in: { x: -18, y: 0 }, out: { x: 18, y: 0 } },
  },
  valve_butterfly: {
    width: 36,
    height: 22,
    ports: { in: { x: -18, y: 0 }, out: { x: 18, y: 0 } },
  },
  valve_check: {
    width: 36,
    height: 22,
    ports: { in: { x: -18, y: 0 }, out: { x: 18, y: 0 } },
  },
  valve_control: {
    // Reserve one stable envelope for every actuator variant. This keeps
    // layout independent from a particular valve attribute or fixture.
    width: 44,
    height: 76,
    ports: {
      in: { x: -18, y: 12 },
      out: { x: 18, y: 12 },
      left: { x: -18, y: 12 },
      right: { x: 18, y: 12 },
      top: { x: 0, y: -34 },
      signal: { x: 0, y: -34 },
    },
  },
  valve_psv: {
    width: 36,
    height: 60,
    ports: { in: { x: -18, y: 12 }, out: { x: 18, y: -8 } },
  },
  // Graceful-degradation placeholder for an unrecognised equipment type.
  unknown: {
    width: 70,
    height: 50,
    ports: {
      top: { x: 0, y: -25 },
      bottom: { x: 0, y: 25 },
      left: { x: -35, y: 0 },
      right: { x: 35, y: 0 },
      in: { x: -35, y: 0 },
      out: { x: 35, y: 0 },
    },
  },
};

// ── Renderers — each draws around (0,0). ─────────────────────

const STROKE_BLACK = "#1d1d1d";
const STROKE_DETAIL = "#555";
const FILL_WHITE = "#ffffff";

function bowtie(x = 15.4, y = 9.8): string {
  // Target coordinates are resized directly; strokes retain engine weights.
  return group({}, [
    line({ x1: -18, y1: 0, x2: -x, y2: 0, class: "lt-pid-process", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
    line({ x1: x, y1: 0, x2: 18, y2: 0, class: "lt-pid-process", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
    path({
      d: `M ${-x} ${-y} L ${-x} ${y} L 0 0 Z M ${x} ${-y} L ${x} ${y} L 0 0 Z`,
      class: "lt-pid-valve-body",
      fill: FILL_WHITE,
      stroke: STROKE_BLACK,
      "stroke-width": 1.4,
      "stroke-linejoin": "round",
    }),
  ]);
}

export function normalizePidActuator(value?: string): PidActuatorType | undefined {
  const normalized = value?.trim().toLowerCase();
  return PID_ACTUATOR_TYPES.find((item) => item === normalized);
}

export function normalizePidFailPosition(value?: string): PidFailPosition | undefined {
  const normalized = value?.trim().toUpperCase();
  return PID_FAIL_POSITIONS.find((item) => item === normalized);
}

function renderValveActuator(
  actuator: PidActuatorType,
  fail?: PidFailPosition
): string {
  const parts: string[] = [
    // Valve body center is y=12; all operators attach through one stem.
    line({ x1: 0, y1: 12, x2: 0, y2: -4.1, class: "lt-pid-tray-line", stroke: STROKE_DETAIL, "stroke-width": 1 }),
  ];

  switch (actuator) {
    case "motor":
      parts.push(
        circle({ cx: 0, cy: -13.2, r: 9.1, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        text({ x: 0, y: -9.2, "text-anchor": "middle", class: "lt-pid-actuator-letter", "font-size": 11, "font-weight": 700 }, "M"),
        line({ x1: 0, y1: -34, x2: 0, y2: -22.3, class: "lt-pid-tray-line", stroke: STROKE_DETAIL, "stroke-width": 1 })
      );
      break;
    case "solenoid":
      parts.push(
        rect({ x: -9.1, y: -22.3, width: 18.2, height: 18.2, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        text({ x: 0, y: -9.2, "text-anchor": "middle", class: "lt-pid-actuator-letter", "font-size": 11, "font-weight": 700 }, "S"),
        line({ x1: 0, y1: -34, x2: 0, y2: -22.3, class: "lt-pid-tray-line", stroke: STROKE_DETAIL, "stroke-width": 1 })
      );
      break;
    case "piston":
      parts.push(
        rect({ x: -14, y: -28.6, width: 28, height: 19.6, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        line({ x1: -14, y1: -18.8, x2: 14, y2: -18.8, class: "lt-pid-tray-line", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        line({ x1: 0, y1: -18.8, x2: 0, y2: -4.1, class: "lt-pid-tray-line", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        line({ x1: 0, y1: -34, x2: 0, y2: -28.6, class: "lt-pid-tray-line", stroke: STROKE_DETAIL, "stroke-width": 1 })
      );
      break;
    case "diaphragm":
      parts.push(
        path({
          d: "M -14 -13.2 A 14 9.8 0 0 1 14 -13.2 Z",
          class: "lt-pid-equip",
          fill: FILL_WHITE,
          stroke: STROKE_BLACK,
          "stroke-width": 1.6,
        }),
        line({ x1: 0, y1: -4.1, x2: 0, y2: -13.2, class: "lt-pid-tray-line", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        line({ x1: 0, y1: -34, x2: 0, y2: -23, class: "lt-pid-tray-line", stroke: STROKE_DETAIL, "stroke-width": 1 })
      );
      break;
  }

  if (fail) {
    parts.push(
      text(
        { x: 18, y: -14, "text-anchor": "start", class: "lt-pid-fail-position" },
        fail
      )
    );
  }

  return group(
    { class: "lt-pid-actuator", "data-actuator": actuator, ...(fail ? { "data-fail": fail } : {}) },
    parts
  );
}

/** Use one measured, wrapped annotation below equipment instead of fitting a
 * full description into the process symbol or over its horizontal nozzles. */
export function renderEquip(type: PidEquipType, label: string, rawType?: string, attrs: Record<string, string> = {}): string {
  const symbol = renderEquipBody(type, rawType, attrs);
  if (!label) return symbol;
  const geometry = GEOMETRY[type] ?? { height: 50 };
  const lines = wrapTextToWidth(label, 11, 150, { fontWeight: 600 });
  return group({}, [symbol, ...lines.map((value, index) => text({ x: 0, y: geometry.height / 2 + 24 + index * 14, "text-anchor": "middle", class: "lt-pid-equip-tag" }, value))]);
}

function renderEquipBody(
  type: PidEquipType,
  rawType?: string,
  attrs: Record<string, string> = {}
): string {
  switch (type) {
    case "unknown": {
      // Visibly-flagged placeholder: a dashed box with a "?" — deliberately NOT
      // a real equipment glyph, so an engineer can never mistake it for one.
      const w = 70;
      const h = 50;
      return group({}, [
        rect({
          x: -w / 2,
          y: -h / 2,
          width: w,
          height: h,
          rx: 3,
          class: "lt-pid-unknown-box",
        }),
        text({ x: 0, y: -2, "text-anchor": "middle", class: "lt-pid-unknown-mark" }, "?"),
        rawType
          ? text(
              { x: 0, y: 13, "text-anchor": "middle", class: "lt-pid-unknown-type" },
              rawType.length > 12 ? rawType.slice(0, 11) + "…" : rawType
            )
          : "",
      ]);
    }
    case "tank_atm": {
      // Dished roof and flat bottom, with nozzles at the fixed anchors.
      return group({}, [
        path({ d: "M 0 -45 V -35 M 0 35 V 45 M -45 0 H -40 M 40 0 H 45", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -40 -22 V 35 H 40 V -22 A 40 13 0 0 0 -40 -22 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "tank_cone_roof": {
      // Conical roof on the accepted flat-bottom tank shell.
      return group({}, [
        path({ d: "M 0 -50 V -40 M 0 40 V 50 M -45 0 H -40 M 40 0 H 45", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -40 -27 L 0 -40 L 40 -27 V 40 H -40 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "vessel_v": {
      // Two 2:1 heads and paired crown nozzles; retain the offset inlet and outlet.
      return group({}, [
        path({ d: "M 0 -65 V -62 H -14.5 V -53.06 M 0 -62 H 14.5 V -53.06 M 0 55 V 65 M -35 0 H -29 M 29 0 H 35 M -35 -25 H -29 M 29 25 H 35", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -29 -40.5 A 29 14.5 0 0 1 29 -40.5 V 40.5 A 29 14.5 0 0 1 -29 40.5 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "vessel_h": {
      // Horizontal 2:1 heads with two upper nozzles and a lower liquid nozzle.
      return group({}, [
        path({ d: "M -65 0 H -57 M 57 0 H 65 M 0 -35 H -32 V -25 M 0 -35 H 32 V -25 M 32 25 V 35 H 0", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -44.5 -25 H 44.5 A 12.5 25 0 0 1 44.5 25 H -44.5 A 12.5 25 0 0 1 -44.5 -25 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "sphere": {
      // Spherical shell with short process nozzles.
      return group({}, [
        path({ d: "M 0 -45 V -37 M 0 37 V 45 M -45 0 H -37 M 37 0 H 45", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        circle({ cx: 0, cy: 0, r: 37, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "column_tray": {
      // Six alternating open trays with downcomers.
      return group({}, [
        path({ d: "M 0 -90 V -87 H -13 V -78.26 M 0 -87 H 13 V -78.26 M 0 80 V 90 M -30 0 H -26 M -30 70 H -25.3", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -26 -67 A 26 13 0 0 1 26 -67 V 67 A 26 13 0 0 1 -26 67 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -26 -50 H 18.2 V -43 M 26 -30 H -18.2 V -23 M -26 -10 H 18.2 V -3 M 26 10 H -18.2 V 17 M -26 30 H 18.2 V 37 M 26 50 H -18.2 V 57", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "column_packed": {
      // Two bounded, crossed packing beds distinguish this from the tray column.
      return group({}, [
        path({ d: "M 0 -90 V -87 H -13 V -78.26 M 0 -87 H 13 V -78.26 M 0 80 V 90 M -30 0 H -26", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -26 -67 A 26 13 0 0 1 26 -67 V 67 A 26 13 0 0 1 -26 67 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -20.8 -53 H 20.8 V -10 H -20.8 Z M -20.8 -53 L 20.8 -10 M 20.8 -53 L -20.8 -10 M -20.8 10 H 20.8 V 53 H -20.8 Z M -20.8 10 L 20.8 53 M 20.8 10 L -20.8 53", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "hx_shell_tube": {
      // Two tube sheets separate the channels from the four-tube bundle.
      return group({}, [
        path({ d: "M -65 0 H -59 M 59 0 H 65 M 0 -30 V -25 M 0 25 V 30", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        rect({ x: -59, y: -25, width: 118, height: 50, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -44.84 -25 V 25 M 44.84 -25 V 25 M -44.84 -15 H 44.84 M -44.84 -5 H 44.84 M -44.84 5 H 44.84 M -44.84 15 H 44.84", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "hx_air_cooled": {
      return group({}, [
        path({ d: "M -65 10 H -55 M 55 10 H 65", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        rect({ x: -55, y: -9, width: 110, height: 48, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -55 5.4 H 55 M -55 15 H 55 M -55 24.6 H 55", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        path({ d: "M -46.2 -5 V 35 M -38.5 -5 V 35 M -30.8 -5 V 35 M -23.1 -5 V 35 M -15.4 -5 V 35 M -7.7 -5 V 35 M 0 -5 V 35 M 7.7 -5 V 35 M 15.4 -5 V 35 M 23.1 -5 V 35 M 30.8 -5 V 35 M 38.5 -5 V 35 M 46.2 -5 V 35", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        circle({ cx: 0, cy: -25, r: 14, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M 0 -25 C -14 -39 14 -39 0 -25 C 14 -11 -14 -11 0 -25", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        circle({ cx: 0, cy: -25, r: 1.4, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "reboiler": {
      // Kettle vapour space and submerged U-tube, fitted to the existing three ports.
      return group({}, [
        path({ d: "M -55 0 H -48 M 48 0 H 55 M 0 27 V 30", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -48 -4 L -28.8 -27 H 33.6 A 14.4 27 0 0 1 33.6 27 H -28.8 L -48 14 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -38.4 -15.5 V 20.5 M -48 0 H 24 A 5 5 0 0 1 24 10 H -48", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "condenser": {
      // Keep the circular angular-passage target; route shell nozzles to the fixed offset ports.
      return group({}, [
        path({ d: "M -65 0 H -24 M 24 0 H 65 M -50 -30 V -27 H 0 V -24 M 0 24 V 27 H 50 V 30", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        circle({ cx: 0, cy: 0, r: 24, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -24 0 H -12 L 0 -12 V 12 L 12 0 H 24", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "pump_general": {
      // Accepted casing and internals, with connections to the fixed port anchors.
      return group({}, [
        path({ d: "M -35 0 H -29 M 29 0 H 35", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        circle({ cx: 0, cy: 0, r: 29, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M 0 -29 L 29 0 L 0 29", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "pump_centrifugal": {
      // Accepted casing and internals, with connections to the fixed port anchors.
      return group({}, [
        path({ d: "M -30 0 H -29 M 29 0 H 33 V -22 H 28", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        circle({ cx: 0, cy: 0, r: 29, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M 0 -29 L 29 0 L 0 29", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        path({ d: "M -29 0 H 29", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "pump_diaphragm": {
      // Accepted casing and internals, with connections to the fixed port anchors.
      return group({}, [
        path({ d: "M -35 0 H -29 M 29 0 H 35", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        circle({ cx: 0, cy: 0, r: 29, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M 0 -29 L 29 0 L 0 29", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        path({ d: "M 0 -29 C -15.47 -13.53 -15.47 13.53 0 29", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "pump_pd": {
      // Accepted casing and internals, with connections to the fixed port anchors.
      return group({}, [
        path({ d: "M -35 0 H -29 M 29 0 H 35", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        circle({ cx: 0, cy: 0, r: 29, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M 0 -29 L 29 0 L 0 29", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        circle({ cx: -5.8, cy: -7.73, r: 9.18, class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        circle({ cx: -5.8, cy: 7.73, r: 9.18, class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "compressor": {
      return group({}, [
        path({ d: "M -45 0 H -29 M 29 0 H 45", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        circle({ cx: 0, cy: 0, r: 29, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -17.4 -23.2 L 26.1 -12.644 M -17.4 23.2 L 26.1 12.644", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "blower": {
      return group({}, [
        path({ d: "M -35 0 H -29 M 29 0 H 35", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        circle({ cx: 0, cy: 0, r: 29, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M 0 0 C -29 -29 29 -29 0 0 C 29 29 -29 29 0 0", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        circle({ cx: 0, cy: 0, r: 2.9, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "reactor_cstr": {
      // Jacket, jacket connections, shaft and impeller fitted inside the fixed envelope.
      return group({}, [
        path({ d: "M 0 -55 V -50 H -14 V -38.12 M 0 -50 H 14 V -38.12 M 0 44 V 55 M -45 -10 H -28 M -45 -4 H -34 M 34 28 H 45", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -28 -26 A 28 14 0 0 1 28 -26 V 30 A 28 14 0 0 1 -28 30 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -28 -15 H -34 V 30 A 34 20 0 0 0 -6.6 49.5 M 6.6 49.5 A 34 20 0 0 0 34 30 V -15 H 28 M 0 -55 V 20 M -10 -55 H 10", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        path({ d: "M -16 16 L 0 20 L 16 16 V 24 L 0 20 L -16 24 Z", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "reactor_pfr": {
      // Tubular vessel with axial nozzles; the accepted PFR does not imply packing.
      return group({}, [
        path({ d: "M -65 0 H -56 M 56 0 H 65", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -44 -24 H 44 A 12 24 0 0 1 44 24 H -44 A 12 24 0 0 1 -44 -24 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "filter": {
      // Three separated dashes identify the filter medium; keep the backwash nozzle.
      return group({}, [
        path({ d: "M -35 0 H -25 M 25 0 H 35 M 0 -35 V -28 M 0 28 V 35 M -35 22 H -25", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        rect({ x: -25, y: -28, width: 50, height: 56, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -21 0 H -11 M -5 0 H 5 M 11 0 H 21", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "cyclone": {
      // Side inlet, top vortex finder and truncated solids hopper.
      return group({}, [
        path({ d: "M -35 -30 H -29 M 0 -50 V -39 M 0 39 V 50", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -29 -39 H 29 V -13 L 5.8 39 H -5.8 L -29 -13 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -5 -39 V -19 M 5 -39 V -19", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "flare": {
      // Open stack and monochrome outlined flame, with the inlet at its declared bottom port.
      return group({}, [
        path({ d: "M 0 47 V 55", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -13 -36 V 47 H 13 V -36", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -5.5 -37 C -13.75 -45 -2.2 -48.5 0 -55 C 2.75 -49 9.35 -47.5 7.7 -41 C 6.6 -36.5 0.55 -34 -5.5 -37 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "cooling_tower": {
      return group({}, [
        path({ d: "M -50 0 H -46 V -22 H -31.5 M 36.17 32 H 46 V 0 H 50 M 0 -45 V -44", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -42 -44 H 42 L 21 0 L 42 44 H -42 L -21 0 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -31.5 -22 H 31.5 M -36.27 32 H 36.27", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    }
    case "boiler": {
      // Serpentine tube pass and outlined flame, connected to the offset feed and steam ports.
      return group({}, [
        path({ d: "M -50 20 H -45 V -16 H -39 M 39 -29 H 50 V -28 M -50 38 H -39 M 0 -50 V -45 M 0 45 V 50", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        rect({ x: -39, y: -45, width: 78, height: 90, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M -39 -16 H -24.7 V 9.6 H 24.7 V -3.2 H -11.7 V -29 H 39 M -39 38 H -10", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        path({ d: "M -7.8 32.8 C -15.6 22.5 -3.9 19.9 -2.6 12.9 C 5.2 19.9 2.6 23.8 8.45 27 C 14.95 36.6 3.9 41.1 0 40.5 C -4.55 40.5 -8.45 37.3 -7.8 32.8 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "burner": {
      // Fuel nozzle and flared mouth with the outlined flame ending at the outlet anchor.
      return group({}, [
        path({ d: "M -38 0 H -22", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -22 -13 H -2 L 10 -26 V 26 L -2 13 H -22 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        path({ d: "M 12.7 -13 C 20.7 -23.4 24 -5.2 38 0 C 24.7 5.2 20.7 23.4 12.7 13 C 18.7 7.8 18.7 -7.8 12.7 -13 Z", class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
      ]);
    }
    case "generator": {
      return group({}, [
        path({ d: "M -38 0 H -36 M 36 0 H 38 M 0 -38 V -36 M 0 36 V 38", class: "lt-pid-tray-line", fill: "none", stroke: STROKE_DETAIL, "stroke-width": 1 }),
        circle({ cx: 0, cy: 0, r: 36, class: "lt-pid-equip", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.6 }),
        text({ x: 0, y: 5, "text-anchor": "middle", class: "lt-pid-equip-tag", "font-size": 13, "font-weight": 600, fill: STROKE_BLACK }, "G"),
      ]);
    }

    // ── Valves ──────────────────────────────────────────
    case "valve_gate":
      return group({}, [
        bowtie(),
      ]);
    case "valve_ball":
      return group({}, [
        bowtie(),
        circle({ cx: 0, cy: 0, r: 7.35, fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.4 }),
      ]);
    case "valve_globe":
      return group({}, [
        bowtie(),
        group({ class: "lt-pid-valve-body" }, [
          circle({ cx: 0, cy: 0, r: 3.5, fill: STROKE_BLACK, stroke: "none" }),
        ]),
      ]);
    case "valve_butterfly":
      return group({}, [
        line({ x1: -18, y1: 0, x2: -15.4, y2: 0, class: "lt-pid-process", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        line({ x1: 15.4, y1: 0, x2: 18, y2: 0, class: "lt-pid-process", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({ d: "M -15.4 -9.8 V 9.8 M 15.4 -9.8 V 9.8", class: "lt-pid-valve-body", fill: FILL_WHITE, stroke: STROKE_BLACK, "stroke-width": 1.4 }),
        line({ x1: -11.2, y1: -9.8, x2: 11.2, y2: 9.8, class: "lt-pid-tray-line", stroke: STROKE_DETAIL, "stroke-width": 1 }),
      ]);
    case "valve_check":
      return group({}, [
        // Leave room for the upstream seat dot inside the fixed 22-high box.
        bowtie(12.1, 7.7),
        group({ class: "lt-pid-tray-line" }, [
          circle({ cx: -12.1, cy: -7.7, r: 2.475, fill: STROKE_BLACK, stroke: "none" }),
        ]),
      ]);
    case "valve_control": {
      const actuator = normalizePidActuator(attrs.actuator) ?? "diaphragm";
      const fail = normalizePidFailPosition(attrs.fail);
      return group({}, [
        group({ transform: "translate(0 12)" }, [bowtie()]),
        renderValveActuator(actuator, fail),
      ]);
    }
    case "valve_psv":
      return group({}, [
        // Angle body at (0,-8), sized to fill the symbol box. Connect the
        // bottom inlet and side outlet to the existing, asymmetric ports.
        path({ d: "M -18 12 H 0 V 6.96 M 14.96 -8 H 18", class: "lt-pid-process", fill: "none", stroke: STROKE_BLACK, "stroke-width": 2.6 }),
        path({
          d: "M -9.52 6.96 L 9.52 6.96 L 0 -8 Z M 14.96 -17.52 L 14.96 1.52 L 0 -8 Z",
          class: "lt-pid-valve-body",
          fill: FILL_WHITE,
          stroke: STROKE_BLACK,
          "stroke-width": 1.4,
          "stroke-linejoin": "round",
        }),
        path({
          d: "M 0 -8 L 0 -16 L -8.84 -19 L 8.84 -22 L -8.84 -25 L 8.84 -28 L 0 -29",
          class: "lt-pid-tray-line",
          fill: "none",
          stroke: STROKE_DETAIL,
          "stroke-width": 1,
        }),
      ]);

    default:
      return group({}, [
        rect({ x: -30, y: -20, width: 60, height: 40, class: "lt-pid-equip" }),
      ]);
  }
}

// ── Instrument bubble renderer ──────────────────────────────

export function renderInstrument(
  category: string,
  letterCode: string,
  loopNumber: string
): string {
  const r = 14;

  const isComputer = category.endsWith("computer");
  const isPlc = category.endsWith("plc");
  const isShared = category.endsWith("shared");
  const isControlRoom = category.startsWith("cr_");
  const isLocal = category.startsWith("local_");

  const parts: string[] = [];

  // Outer body
  if (isComputer) {
    // Diamond inscribed
    parts.push(circle({ cx: 0, cy: 0, r, class: "lt-inst-body" }));
    parts.push(
      polygon({
        points: `0,${-r + 1} ${r - 1},0 0,${r - 1} ${-(r - 1)},0`,
        class: "lt-inst-body",
        fill: "none",
      })
    );
  } else if (isPlc) {
    // Square inscribed
    parts.push(circle({ cx: 0, cy: 0, r, class: "lt-inst-body" }));
    const side = r * Math.SQRT1_2 * 2 - 2;
    parts.push(
      rect({
        x: -side / 2,
        y: -side / 2,
        width: side,
        height: side,
        class: "lt-inst-body",
        fill: "none",
      })
    );
  } else if (isShared) {
    // ISA shared display/control: circle inscribed in a square.
    parts.push(rect({ x: -r, y: -r, width: 2 * r, height: 2 * r, class: "lt-inst-body" }));
    parts.push(circle({ cx: 0, cy: 0, r, class: "lt-inst-body" }));
  } else {
    // discrete — circle only
    parts.push(circle({ cx: 0, cy: 0, r, class: "lt-inst-body" }));
  }

  // Location indicator (horizontal line for control room; dashed for local).
  if (isControlRoom) {
    parts.push(line({ x1: -r, y1: 0, x2: r, y2: 0, class: "lt-inst-cr-line" }));
  } else if (isLocal) {
    parts.push(line({ x1: -r, y1: 0, x2: r, y2: 0, class: "lt-inst-local-line" }));
  }

  // Tag text — split into letter-code + loop-number, one above and one below center.
  parts.push(
    text(
      {
        x: 0,
        y: -3,
        "text-anchor": "middle",
        class: "lt-inst-tag",
      },
      letterCode
    )
  );
  parts.push(
    text(
      {
        x: 0,
        y: 9,
        "text-anchor": "middle",
        class: "lt-inst-tag",
      },
      loopNumber
    )
  );

  return group({ class: "lt-inst-symbol" }, parts);
}

void HALF;
