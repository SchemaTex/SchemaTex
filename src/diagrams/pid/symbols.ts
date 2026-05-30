import { circle, group, line, path, polygon, rect, text } from "../../core/svg";
import type { PidEquipType } from "./types";

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
    width: 36,
    height: 60,
    ports: { in: { x: -18, y: 12 }, out: { x: 18, y: 12 }, top: { x: 0, y: -22 } },
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
const FILL_WHITE = "#ffffff";

function bowtie(): string {
  // Two triangles meeting at center.
  return polygon({
    points: "-18,-11 0,0 -18,11 18,11 0,0 18,-11",
    class: "lt-pid-valve-body",
  });
}

export function renderEquip(type: PidEquipType, label: string, rawType?: string): string {
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
        text({ x: 0, y: h / 2 + 13, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "tank_atm": {
      const w = 90;
      const h = 90;
      const cylTop = -h / 2 + 14;
      const parts = [
        // dome top
        path({
          d: `M ${-w / 2} ${cylTop} A ${w / 2} 14 0 0 1 ${w / 2} ${cylTop}`,
          class: "lt-pid-equip",
        }),
        // body
        rect({
          x: -w / 2,
          y: cylTop,
          width: w,
          height: h - 14,
          class: "lt-pid-equip",
        }),
        // tag
        text(
          { x: 0, y: 4, "text-anchor": "middle", class: "lt-pid-equip-tag" },
          label
        ),
      ];
      return group({ class: "lt-pid-equip-group" }, parts);
    }
    case "tank_cone_roof": {
      const w = 90;
      const h = 100;
      const roofH = 18;
      const top = -h / 2;
      return group({}, [
        polygon({
          points: `${-w / 2},${top + roofH} 0,${top} ${w / 2},${top + roofH}`,
          class: "lt-pid-equip",
        }),
        rect({
          x: -w / 2,
          y: top + roofH,
          width: w,
          height: h - roofH,
          class: "lt-pid-equip",
        }),
        text({ x: 0, y: 4, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "vessel_v": {
      const w = 70;
      const h = 130;
      const headH = 16;
      const top = -h / 2;
      const bot = h / 2;
      return group({}, [
        path({
          d: `M ${-w / 2} ${top + headH}
              A ${w / 2} ${headH} 0 0 1 ${w / 2} ${top + headH}
              L ${w / 2} ${bot - headH}
              A ${w / 2} ${headH} 0 0 1 ${-w / 2} ${bot - headH}
              Z`,
          class: "lt-pid-equip",
        }),
        text(
          { x: 0, y: 4, "text-anchor": "middle", class: "lt-pid-equip-tag" },
          label
        ),
      ]);
    }
    case "vessel_h": {
      const w = 130;
      const h = 70;
      const headW = 14;
      const left = -w / 2;
      const right = w / 2;
      return group({}, [
        path({
          d: `M ${left + headW} ${-h / 2}
              L ${right - headW} ${-h / 2}
              A ${headW} ${h / 2} 0 0 1 ${right - headW} ${h / 2}
              L ${left + headW} ${h / 2}
              A ${headW} ${h / 2} 0 0 1 ${left + headW} ${-h / 2}
              Z`,
          class: "lt-pid-equip",
        }),
        text(
          { x: 0, y: 4, "text-anchor": "middle", class: "lt-pid-equip-tag" },
          label
        ),
      ]);
    }
    case "sphere": {
      return group({}, [
        circle({ cx: 0, cy: 0, r: 45, class: "lt-pid-equip" }),
        text({ x: 0, y: 4, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "column_tray": {
      const w = 60;
      const h = 180;
      const headH = 12;
      const trays = 12;
      const inner = h - headH * 2;
      const traySpacing = inner / (trays + 1);
      const trayLines: string[] = [];
      for (let i = 1; i <= trays; i++) {
        const y = -h / 2 + headH + traySpacing * i;
        trayLines.push(
          line({
            x1: -w / 2 + 6,
            y1: y,
            x2: w / 2 - 6,
            y2: y,
            class: "lt-pid-tray-line",
          })
        );
      }
      return group({}, [
        path({
          d: `M ${-w / 2} ${-h / 2 + headH}
              A ${w / 2} ${headH} 0 0 1 ${w / 2} ${-h / 2 + headH}
              L ${w / 2} ${h / 2 - headH}
              A ${w / 2} ${headH} 0 0 1 ${-w / 2} ${h / 2 - headH}
              Z`,
          class: "lt-pid-equip",
        }),
        ...trayLines,
        text(
          {
            x: 0,
            y: -h / 2 - 6,
            "text-anchor": "middle",
            class: "lt-pid-equip-tag",
          },
          label
        ),
      ]);
    }
    case "column_packed": {
      const w = 60;
      const h = 180;
      const headH = 12;
      // X-shaped packing pattern, rendered as repeated `<` and `>` characters
      const packing = path({
        d: `M ${-w / 2 + 6} ${-h / 2 + headH + 6}
            L ${w / 2 - 6} ${h / 2 - headH - 6}
            M ${w / 2 - 6} ${-h / 2 + headH + 6}
            L ${-w / 2 + 6} ${h / 2 - headH - 6}`,
        class: "lt-pid-tray-line",
      });
      return group({}, [
        path({
          d: `M ${-w / 2} ${-h / 2 + headH}
              A ${w / 2} ${headH} 0 0 1 ${w / 2} ${-h / 2 + headH}
              L ${w / 2} ${h / 2 - headH}
              A ${w / 2} ${headH} 0 0 1 ${-w / 2} ${h / 2 - headH}
              Z`,
          class: "lt-pid-equip",
        }),
        packing,
        text(
          {
            x: 0,
            y: -h / 2 - 6,
            "text-anchor": "middle",
            class: "lt-pid-equip-tag",
          },
          label
        ),
      ]);
    }
    case "hx_shell_tube": {
      const w = 130;
      const h = 60;
      const headW = 12;
      const left = -w / 2;
      const right = w / 2;
      const tubes: string[] = [];
      for (let yy = -h / 2 + 12; yy <= h / 2 - 12; yy += 8) {
        tubes.push(
          line({
            x1: left + headW + 4,
            y1: yy,
            x2: right - headW - 4,
            y2: yy,
            class: "lt-pid-tray-line",
          })
        );
      }
      return group({}, [
        path({
          d: `M ${left + headW} ${-h / 2}
              L ${right - headW} ${-h / 2}
              A ${headW} ${h / 2} 0 0 1 ${right - headW} ${h / 2}
              L ${left + headW} ${h / 2}
              A ${headW} ${h / 2} 0 0 1 ${left + headW} ${-h / 2}
              Z`,
          class: "lt-pid-equip",
        }),
        ...tubes,
        text(
          {
            x: 0,
            y: h / 2 + 14,
            "text-anchor": "middle",
            class: "lt-pid-equip-tag",
          },
          label
        ),
      ]);
    }
    case "hx_air_cooled": {
      const w = 130;
      const h = 80;
      return group({}, [
        rect({
          x: -w / 2,
          y: -h / 2 + 18,
          width: w,
          height: h - 18,
          class: "lt-pid-equip",
        }),
        circle({ cx: 0, cy: -h / 2 + 14, r: 18, class: "lt-pid-equip" }),
        // 3-blade fan
        path({
          d: `M 0 ${-h / 2 + 14} L 14 ${-h / 2 + 6}
              M 0 ${-h / 2 + 14} L -14 ${-h / 2 + 6}
              M 0 ${-h / 2 + 14} L 0 ${-h / 2 + 30}`,
          class: "lt-pid-tray-line",
        }),
        text(
          { x: 0, y: h / 2 + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" },
          label
        ),
      ]);
    }
    case "reboiler": {
      const w = 110;
      const h = 60;
      const headW = 14;
      return group({}, [
        path({
          d: `M ${-w / 2 + headW} ${-h / 2}
              L ${w / 2 - headW} ${-h / 2}
              A ${headW} ${h / 2} 0 0 1 ${w / 2 - headW} ${h / 2}
              L ${-w / 2 + headW} ${h / 2}
              A ${headW} ${h / 2} 0 0 1 ${-w / 2 + headW} ${-h / 2}
              Z`,
          class: "lt-pid-equip",
        }),
        line({
          x1: -w / 2 + headW + 4,
          y1: -10,
          x2: w / 2 - headW - 4,
          y2: -10,
          class: "lt-pid-tray-line",
        }),
        line({
          x1: -w / 2 + headW + 4,
          y1: 0,
          x2: w / 2 - headW - 4,
          y2: 0,
          class: "lt-pid-tray-line",
        }),
        line({
          x1: -w / 2 + headW + 4,
          y1: 10,
          x2: w / 2 - headW - 4,
          y2: 10,
          class: "lt-pid-tray-line",
        }),
        text({ x: 0, y: h / 2 + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "condenser": {
      // Visually identical to a horizontal HX with a label hint.
      const w = 130;
      const h = 60;
      const headW = 12;
      const left = -w / 2;
      const right = w / 2;
      const tubes: string[] = [];
      for (let yy = -h / 2 + 12; yy <= h / 2 - 12; yy += 10) {
        tubes.push(
          line({
            x1: left + headW + 4,
            y1: yy,
            x2: right - headW - 4,
            y2: yy,
            class: "lt-pid-tray-line",
          })
        );
      }
      return group({}, [
        path({
          d: `M ${left + headW} ${-h / 2}
              L ${right - headW} ${-h / 2}
              A ${headW} ${h / 2} 0 0 1 ${right - headW} ${h / 2}
              L ${left + headW} ${h / 2}
              A ${headW} ${h / 2} 0 0 1 ${left + headW} ${-h / 2}
              Z`,
          class: "lt-pid-equip",
        }),
        ...tubes,
        text({ x: 0, y: h / 2 + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "pump_centrifugal": {
      // Circle + right-side triangle outlet.
      const r = 22;
      return group({}, [
        circle({ cx: 0, cy: 0, r, class: "lt-pid-equip" }),
        polygon({
          points: `${r * 0.4},${-r * 0.9} ${r + 6},${-r * 0.9} ${r * 0.4},${0}`,
          class: "lt-pid-equip",
        }),
        text(
          { x: 0, y: r + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" },
          label
        ),
      ]);
    }
    case "pump_pd": {
      const r = 22;
      return group({}, [
        circle({ cx: 0, cy: 0, r, class: "lt-pid-equip" }),
        circle({ cx: -8, cy: 0, r: 6, class: "lt-pid-tray-line", fill: "none" }),
        circle({ cx: 8, cy: 0, r: 6, class: "lt-pid-tray-line", fill: "none" }),
        text(
          { x: 0, y: r + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" },
          label
        ),
      ]);
    }
    case "compressor": {
      // Trapezoid (left wide → right narrow inverted = compressor)
      return group({}, [
        polygon({
          points: "-45,-20 45,-12 45,12 -45,20",
          class: "lt-pid-equip",
        }),
        text({ x: 0, y: 36, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "blower": {
      const r = 22;
      return group({}, [
        circle({ cx: 0, cy: 0, r, class: "lt-pid-equip" }),
        path({
          d: `M 0 0 L ${r * 0.8} ${-r * 0.5} M 0 0 L ${-r * 0.6} ${-r * 0.6} M 0 0 L 0 ${r * 0.8}`,
          class: "lt-pid-tray-line",
        }),
        text({ x: 0, y: r + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "reactor_cstr": {
      const w = 90;
      const h = 110;
      const headH = 14;
      const top = -h / 2;
      const bot = h / 2;
      return group({}, [
        path({
          d: `M ${-w / 2} ${top + headH}
              A ${w / 2} ${headH} 0 0 1 ${w / 2} ${top + headH}
              L ${w / 2} ${bot - headH}
              A ${w / 2} ${headH} 0 0 1 ${-w / 2} ${bot - headH}
              Z`,
          class: "lt-pid-equip",
        }),
        // agitator shaft + paddle
        line({ x1: 0, y1: top - 14, x2: 0, y2: 4, class: "lt-pid-tray-line" }),
        rect({ x: -10, y: 4, width: 20, height: 4, class: "lt-pid-equip" }),
        text(
          { x: 0, y: bot + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" },
          label
        ),
      ]);
    }
    case "reactor_pfr": {
      const w = 130;
      const h = 50;
      const headW = 12;
      const left = -w / 2;
      const right = w / 2;
      // Packed-bed style fill
      const dots: string[] = [];
      for (let xx = left + headW + 8; xx <= right - headW - 8; xx += 12) {
        for (let yy = -h / 2 + 12; yy <= h / 2 - 8; yy += 10) {
          dots.push(circle({ cx: xx, cy: yy, r: 1.6, fill: STROKE_BLACK }));
        }
      }
      return group({}, [
        path({
          d: `M ${left + headW} ${-h / 2}
              L ${right - headW} ${-h / 2}
              A ${headW} ${h / 2} 0 0 1 ${right - headW} ${h / 2}
              L ${left + headW} ${h / 2}
              A ${headW} ${h / 2} 0 0 1 ${left + headW} ${-h / 2}
              Z`,
          class: "lt-pid-equip",
        }),
        ...dots,
        text({ x: 0, y: h / 2 + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "filter": {
      const w = 70;
      const h = 70;
      // diagonal hatch via 3 lines
      return group({}, [
        rect({ x: -w / 2, y: -h / 2, width: w, height: h, class: "lt-pid-equip" }),
        line({ x1: -w / 2, y1: 0, x2: w / 2, y2: 0, class: "lt-pid-tray-line" }),
        line({ x1: -w / 2 + 8, y1: -h / 2 + 8, x2: w / 2 - 8, y2: -8, class: "lt-pid-tray-line" }),
        line({ x1: -w / 2 + 8, y1: 8, x2: w / 2 - 8, y2: h / 2 - 8, class: "lt-pid-tray-line" }),
        text({ x: 0, y: h / 2 + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "cyclone": {
      const w = 70;
      const h = 100;
      const cyl = 30;
      return group({}, [
        path({
          d: `M ${-w / 2} ${-h / 2}
              L ${w / 2} ${-h / 2}
              L ${w / 2} ${-h / 2 + cyl}
              L 0 ${h / 2}
              L ${-w / 2} ${-h / 2 + cyl}
              Z`,
          class: "lt-pid-equip",
        }),
        text({ x: 0, y: h / 2 + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "flare": {
      const w = 30;
      const h = 110;
      return group({}, [
        rect({ x: -w / 2, y: -h / 2, width: w, height: h, class: "lt-pid-equip" }),
        polygon({
          points: `${-8},${-h / 2 - 4} 0,${-h / 2 - 22} 8,${-h / 2 - 4}`,
          fill: "#ff7755",
          stroke: STROKE_BLACK,
        }),
        text({ x: 0, y: h / 2 + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }
    case "cooling_tower": {
      const w = 100;
      const h = 90;
      return group({}, [
        path({
          d: `M ${-w / 2} ${-h / 2}
              L ${w / 2} ${-h / 2}
              L ${w / 4} 0
              L ${w / 2} ${h / 2}
              L ${-w / 2} ${h / 2}
              L ${-w / 4} 0
              Z`,
          class: "lt-pid-equip",
        }),
        text({ x: 0, y: h / 2 + 14, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    }

    // ── Valves ──────────────────────────────────────────
    case "valve_gate":
      return group({}, [
        bowtie(),
        text({ x: 0, y: 22, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    case "valve_ball":
      return group({}, [
        bowtie(),
        circle({ cx: 0, cy: 0, r: 4, fill: STROKE_BLACK }),
        text({ x: 0, y: 22, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    case "valve_globe":
      return group({}, [
        bowtie(),
        circle({ cx: 0, cy: -5, r: 5, class: "lt-pid-valve-body", fill: FILL_WHITE }),
        text({ x: 0, y: 22, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    case "valve_butterfly":
      return group({}, [
        bowtie(),
        line({ x1: 0, y1: -10, x2: 0, y2: 10, class: "lt-pid-tray-line" }),
        text({ x: 0, y: 22, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    case "valve_check":
      return group({}, [
        bowtie(),
        path({ d: "M -10 -8 A 10 10 0 0 1 -10 8", class: "lt-pid-tray-line", fill: "none" }),
        text({ x: 0, y: 22, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    case "valve_control":
      return group({}, [
        bowtie(),
        // actuator: diaphragm
        line({ x1: 0, y1: -11, x2: 0, y2: -22, class: "lt-pid-tray-line" }),
        path({ d: "M -14 -22 A 14 8 0 0 1 14 -22 L -14 -22 Z", class: "lt-pid-equip" }),
        text({ x: 0, y: 24, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);
    case "valve_psv":
      return group({}, [
        bowtie(),
        // diagonal outlet (45°)
        line({
          x1: 18, y1: -11,
          x2: 26, y2: -22,
          class: "lt-pid-process",
        }),
        // spring stack
        path({
          d: "M -6 -11 L -10 -16 L -2 -20 L -10 -24 L -2 -28",
          class: "lt-pid-tray-line",
          fill: "none",
        }),
        text({ x: 0, y: 24, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
      ]);

    default:
      return group({}, [
        rect({ x: -30, y: -20, width: 60, height: 40, class: "lt-pid-equip" }),
        text({ x: 0, y: 4, "text-anchor": "middle", class: "lt-pid-equip-tag" }, label),
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
    // Hexagon inscribed (point-up)
    parts.push(circle({ cx: 0, cy: 0, r, class: "lt-inst-body" }));
    const hex: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      hex.push(`${(r - 2) * Math.cos(a)},${(r - 2) * Math.sin(a)}`);
    }
    parts.push(
      polygon({
        points: hex.join(" "),
        class: "lt-inst-body",
        fill: "none",
      })
    );
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
