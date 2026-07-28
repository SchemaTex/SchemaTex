/**
 * Original, builder-only stage-plot line art.
 *
 * Every symbol draws inside its nominal w×h metre box and uses semantic CSS
 * classes from stageplot.ts. Existing floorplan symbols are referenced rather
 * than copied.
 */

import {
  circle,
  el,
  line,
  path,
  polygon,
  rect,
  text as textEl,
} from "../../core/svg";
import type {
  StageEquipmentKind,
  SymbolDef,
  SymbolDrawCtx,
} from "./types";
import { FLOORPLAN_SYMBOLS } from "./catalog";

function label(c: SymbolDrawCtx, value: string, size = 0.22): string {
  return textEl(
    {
      class: "sx-stage-glyph-text",
      x: c.px(c.w / 2),
      y: c.px(c.h / 2),
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": c.px(Math.min(size, c.h * 0.35)),
    },
    value
  );
}

function amp(value: string): (c: SymbolDrawCtx) => string {
  return (c) => {
    const parts = [
      rect({
        class: "sx-stage-device",
        x: 0,
        y: 0,
        width: c.px(c.w),
        height: c.px(c.h),
        rx: c.px(0.06),
      }),
      line({
        class: "sx-stage-detail",
        x1: c.px(0.08),
        y1: c.px(0.23),
        x2: c.px(c.w - 0.08),
        y2: c.px(0.23),
      }),
    ];
    for (let x = 0.16; x < c.w - 0.08; x += 0.2) {
      parts.push(
        circle({
          class: "sx-stage-port",
          cx: c.px(x),
          cy: c.px(0.12),
          r: c.px(0.025),
        })
      );
    }
    parts.push(label(c, value));
    return parts.join("");
  };
}

function micStand(kind: "boom" | "straight" | "drum" | "overhead") {
  return (c: SymbolDrawCtx): string => {
    const cx = c.px(c.w / 2);
    const baseY = c.px(c.h * 0.88);
    const mastTop = c.px(kind === "drum" ? c.h * 0.45 : c.h * 0.2);
    const parts = [
      line({
        class: "sx-stage-stand",
        x1: cx,
        y1: baseY,
        x2: cx,
        y2: mastTop,
      }),
      line({
        class: "sx-stage-stand",
        x1: c.px(c.w * 0.18),
        y1: c.px(c.h * 0.94),
        x2: cx,
        y2: baseY,
      }),
      line({
        class: "sx-stage-stand",
        x1: c.px(c.w * 0.82),
        y1: c.px(c.h * 0.94),
        x2: cx,
        y2: baseY,
      }),
    ];
    if (kind !== "straight") {
      const endX = c.px(kind === "overhead" ? c.w * 0.88 : c.w * 0.8);
      const endY = c.px(kind === "drum" ? c.h * 0.35 : c.h * 0.1);
      parts.push(
        line({
          class: "sx-stage-stand",
          x1: cx,
          y1: mastTop,
          x2: endX,
          y2: endY,
        }),
        el("ellipse", {
          class: "sx-stage-mic",
          cx: endX,
          cy: endY,
          rx: c.px(0.11),
          ry: c.px(0.045),
          transform: `rotate(-18 ${endX} ${endY})`,
        })
      );
    } else {
      parts.push(
        el("ellipse", {
          class: "sx-stage-mic",
          cx,
          cy: c.px(c.h * 0.12),
          rx: c.px(0.05),
          ry: c.px(0.12),
        })
      );
    }
    return parts.join("");
  };
}

const native: Record<
  Exclude<
    StageEquipmentKind,
    "stage" | "dance-floor" | "dj-booth" | "podium" | "row-chairs" | "piano"
  >,
  SymbolDef
> = {
  "drum-kit": {
    w: 2.4,
    h: 2,
    draw: (c) => [
      circle({
        class: "sx-stage-device",
        cx: c.px(c.w / 2),
        cy: c.px(c.h * 0.62),
        r: c.px(Math.min(c.w, c.h) * 0.27),
      }),
      circle({
        class: "sx-stage-device",
        cx: c.px(c.w * 0.28),
        cy: c.px(c.h * 0.34),
        r: c.px(0.28),
      }),
      circle({
        class: "sx-stage-device",
        cx: c.px(c.w * 0.72),
        cy: c.px(c.h * 0.34),
        r: c.px(0.28),
      }),
      circle({
        class: "sx-stage-cymbal",
        cx: c.px(c.w * 0.13),
        cy: c.px(c.h * 0.17),
        r: c.px(0.25),
      }),
      circle({
        class: "sx-stage-cymbal",
        cx: c.px(c.w * 0.87),
        cy: c.px(c.h * 0.17),
        r: c.px(0.25),
      }),
      label(c, "DRUMS", 0.18),
    ].join(""),
  },
  "guitar-amp": { w: 1.25, h: 0.72, draw: amp("GTR") },
  "bass-amp": { w: 1.25, h: 0.82, draw: amp("BASS") },
  keyboard: {
    w: 1.8,
    h: 0.72,
    draw: (c) => {
      const parts = [
        rect({
          class: "sx-stage-device",
          x: 0,
          y: 0,
          width: c.px(c.w),
          height: c.px(c.h * 0.42),
          rx: c.px(0.04),
        }),
      ];
      for (let x = 0.12; x < c.w; x += 0.18) {
        parts.push(
          line({
            class: "sx-stage-detail",
            x1: c.px(x),
            y1: 0,
            x2: c.px(x),
            y2: c.px(c.h * 0.42),
          })
        );
      }
      parts.push(
        line({
          class: "sx-stage-stand",
          x1: c.px(0.3),
          y1: c.px(c.h * 0.42),
          x2: c.px(c.w - 0.3),
          y2: c.px(c.h),
        }),
        line({
          class: "sx-stage-stand",
          x1: c.px(c.w - 0.3),
          y1: c.px(c.h * 0.42),
          x2: c.px(0.3),
          y2: c.px(c.h),
        })
      );
      return parts.join("");
    },
  },
  "bass-cabinet": { w: 1.2, h: 1.2, draw: amp("CAB") },
  "boom-stand": { w: 0.9, h: 1.5, draw: micStand("boom") },
  "straight-stand": { w: 0.7, h: 1.5, draw: micStand("straight") },
  "drum-mic": { w: 0.7, h: 0.8, draw: micStand("drum") },
  overhead: { w: 1.1, h: 1.8, draw: micStand("overhead") },
  "di-box": {
    w: 0.48,
    h: 0.34,
    draw: (c) =>
      rect({
        class: "sx-stage-signal-device",
        x: 0,
        y: 0,
        width: c.px(c.w),
        height: c.px(c.h),
        rx: c.px(0.04),
      }) + label(c, "DI", 0.18),
  },
  mixer: {
    w: 1.8,
    h: 0.95,
    draw: (c) => {
      const parts = [
        rect({
          class: "sx-stage-signal-device",
          x: 0,
          y: 0,
          width: c.px(c.w),
          height: c.px(c.h),
          rx: c.px(0.06),
        }),
      ];
      for (let x = 0.18; x < c.w - 0.08; x += 0.22) {
        parts.push(
          line({
            class: "sx-stage-detail",
            x1: c.px(x),
            y1: c.px(0.12),
            x2: c.px(x),
            y2: c.px(c.h - 0.12),
          }),
          circle({
            class: "sx-stage-port",
            cx: c.px(x),
            cy: c.px(0.22),
            r: c.px(0.035),
          })
        );
      }
      return parts.join("");
    },
  },
  "foh-console": {
    w: 2.4,
    h: 1.2,
    draw: (c) => native.mixer.draw(c) + label(c, "FOH", 0.2),
  },
  snake: {
    w: 0.7,
    h: 0.55,
    draw: (c) => {
      const parts = [
        rect({
          class: "sx-stage-signal-device",
          x: 0,
          y: 0,
          width: c.px(c.w),
          height: c.px(c.h),
          rx: c.px(0.04),
        }),
      ];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          parts.push(
            circle({
              class: "sx-stage-port",
              cx: c.px(0.14 + col * 0.14),
              cy: c.px(0.13 + row * 0.14),
              r: c.px(0.035),
            })
          );
        }
      }
      return parts.join("");
    },
  },
  "monitor-wedge": {
    w: 0.95,
    h: 0.65,
    draw: (c) =>
      polygon({
        class: "sx-stage-monitor",
        points: `0,${c.px(c.h)} ${c.px(c.w)},${c.px(c.h)} ${c.px(c.w * 0.78)},0 ${c.px(c.w * 0.22)},0`,
      }),
  },
  "side-fill": {
    w: 1.2,
    h: 1.5,
    draw: (c) => [
      rect({
        class: "sx-stage-monitor",
        x: 0,
        y: 0,
        width: c.px(c.w),
        height: c.px(c.h),
        rx: c.px(0.04),
      }),
      circle({
        class: "sx-stage-monitor-cone",
        cx: c.px(c.w / 2),
        cy: c.px(c.h * 0.38),
        r: c.px(Math.min(c.w, c.h) * 0.25),
      }),
      circle({
        class: "sx-stage-monitor-cone",
        cx: c.px(c.w / 2),
        cy: c.px(c.h * 0.76),
        r: c.px(Math.min(c.w, c.h) * 0.14),
      }),
    ].join(""),
  },
  iem: {
    w: 0.55,
    h: 0.65,
    draw: (c) => [
      rect({
        class: "sx-stage-signal-device",
        x: c.px(0.08),
        y: c.px(0.18),
        width: c.px(c.w * 0.62),
        height: c.px(c.h * 0.65),
        rx: c.px(0.05),
      }),
      path({
        class: "sx-stage-detail",
        d: `M ${c.px(c.w * 0.42)} ${c.px(0.18)} C ${c.px(c.w * 0.45)} ${c.px(-0.02)}, ${c.px(c.w * 0.92)} ${c.px(0.02)}, ${c.px(c.w * 0.87)} ${c.px(0.28)}`,
      }),
      circle({
        class: "sx-stage-mic",
        cx: c.px(c.w * 0.86),
        cy: c.px(0.31),
        r: c.px(0.06),
      }),
    ].join(""),
  },
  "power-drop": {
    w: 0.5,
    h: 0.5,
    draw: (c) => [
      circle({
        class: "sx-stage-power",
        cx: c.px(c.w / 2),
        cy: c.px(c.h / 2),
        r: c.px(Math.min(c.w, c.h) * 0.44),
      }),
      path({
        class: "sx-stage-power-mark",
        d: `M ${c.px(c.w * 0.55)} ${c.px(c.h * 0.08)} L ${c.px(c.w * 0.3)} ${c.px(c.h * 0.55)} H ${c.px(c.w * 0.5)} L ${c.px(c.w * 0.38)} ${c.px(c.h * 0.92)} L ${c.px(c.w * 0.72)} ${c.px(c.h * 0.42)} H ${c.px(c.w * 0.5)} Z`,
      }),
    ].join(""),
  },
  "stage-riser": {
    w: 2.4,
    h: 1.8,
    underlay: true,
    draw: (c) => [
      rect({
        class: "sx-stage-riser",
        x: 0,
        y: 0,
        width: c.px(c.w),
        height: c.px(c.h),
      }),
      line({
        class: "sx-stage-riser-cross",
        x1: 0,
        y1: 0,
        x2: c.px(c.w),
        y2: c.px(c.h),
      }),
      line({
        class: "sx-stage-riser-cross",
        x1: c.px(c.w),
        y1: 0,
        x2: 0,
        y2: c.px(c.h),
      }),
    ].join(""),
  },
  "music-stand": {
    w: 0.7,
    h: 1.1,
    draw: (c) => [
      polygon({
        class: "sx-stage-device",
        points: `${c.px(0.08)},0 ${c.px(c.w - 0.08)},0 ${c.px(c.w * 0.84)},${c.px(c.h * 0.38)} ${c.px(c.w * 0.16)},${c.px(c.h * 0.38)}`,
      }),
      line({
        class: "sx-stage-stand",
        x1: c.px(c.w / 2),
        y1: c.px(c.h * 0.38),
        x2: c.px(c.w / 2),
        y2: c.px(c.h * 0.88),
      }),
      line({
        class: "sx-stage-stand",
        x1: c.px(c.w * 0.2),
        y1: c.px(c.h),
        x2: c.px(c.w / 2),
        y2: c.px(c.h * 0.88),
      }),
      line({
        class: "sx-stage-stand",
        x1: c.px(c.w * 0.8),
        y1: c.px(c.h),
        x2: c.px(c.w / 2),
        y2: c.px(c.h * 0.88),
      }),
    ].join(""),
  },
  "set-list": {
    w: 0.5,
    h: 0.7,
    draw: (c) => {
      const parts = [
        rect({
          class: "sx-stage-paper",
          x: 0,
          y: 0,
          width: c.px(c.w),
          height: c.px(c.h),
          rx: c.px(0.03),
        }),
      ];
      for (let y = 0.16; y < c.h - 0.05; y += 0.13) {
        parts.push(
          line({
            class: "sx-stage-detail",
            x1: c.px(0.09),
            y1: c.px(y),
            x2: c.px(c.w - 0.09),
            y2: c.px(y),
          })
        );
      }
      return parts.join("");
    },
  },
};

export const STAGE_SYMBOLS: Record<StageEquipmentKind, SymbolDef> = {
  ...native,
  stage: FLOORPLAN_SYMBOLS.stage,
  "dance-floor": FLOORPLAN_SYMBOLS["dance-floor"],
  "dj-booth": FLOORPLAN_SYMBOLS["dj-booth"],
  podium: FLOORPLAN_SYMBOLS.podium,
  "row-chairs": FLOORPLAN_SYMBOLS["row-chairs"],
  piano: FLOORPLAN_SYMBOLS.piano,
};
