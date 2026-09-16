/**
 * Original safety-sign line art for evacuation plans.
 *
 * The geometry follows the semantic shape/color grammar described by
 * ISO 3864 and the identities registered by ISO 7010 / NFPA 170. It is
 * drawn from scratch on a shared 24×24 grid; no standards artwork is copied,
 * traced, downloaded, or embedded.
 */

import { circle, group, path, polygon, rect } from "../../core/svg";
import type {
  CompliancePolicy,
  SafetyDrawCtx,
  SafetyKind,
  SafetyName,
  SafetySymbolDef,
} from "./types";
import { resolveSafetyKind } from "./types";

const KNOCKOUT = "sx-fp-safety-knockout";
const KNOCKOUT_STROKE = "sx-fp-safety-knockout-stroke";
const DARK = "sx-fp-safety-dark";
const DARK_STROKE = "sx-fp-safety-dark-stroke";
const SAFE_PLATE = "sx-fp-safety-plate-safe";
const FIRE_PLATE = "sx-fp-safety-plate-fire";
const LOCATION = "sx-fp-safety-location";

/** Combination escape-route signs are 2:1 landscape; every other plate is square. */
const EXIT_DIRECTION_WIDTH = 48;

function plate(
  colour: SafetySymbolDef["colour"],
  shape: "square" | "circle" | "triangle" = "square",
  width = 24
): string {
  const cls =
    colour === "safe"
      ? SAFE_PLATE
      : colour === "fire"
        ? FIRE_PLATE
        : colour === "mandatory"
          ? "sx-fp-safety-plate-mand"
          : colour === "warning"
            ? "sx-fp-safety-plate-warn"
            : "sx-fp-safety-plate-neutral";
  if (shape === "circle") return circle({ class: cls, cx: 12, cy: 12, r: 11 });
  if (shape === "triangle") {
    return polygon({ class: cls, points: "12,1 23,22 1,22" });
  }
  return rect({ class: cls, x: 0, y: 0, width, height: 24, rx: 2 });
}

// Coordinates are emitted directly, including reduced runners in combination signs.
function runningFigure(dir: 1 | -1, size = 1, dx = 0, dy = 0): string {
  const x = (v: number): number => dx + size * (dir === 1 ? v : 24 - v);
  const y = (v: number): number => dy + size * v;
  return [
    circle({ class: KNOCKOUT, cx: x(11.2), cy: y(5.3), r: 2.2 * size }),
    knockoutStroke(`M${x(10.2)} ${y(8.6)} L${x(8.4)} ${y(12.9)}`, 2.05 * size),
    knockoutStroke(`M${x(8.4)} ${y(12.9)} L${x(11.9)} ${y(14.9)} L${x(11.5)} ${y(19.8)}`, 2.05 * size),
    knockoutStroke(`M${x(8.4)} ${y(12.9)} L${x(6.5)} ${y(16.6)} L${x(3.6)} ${y(18.2)}`, 2.05 * size),
    knockoutStroke(`M${x(10.1)} ${y(9.2)} L${x(12.5)} ${y(11.2)} L${x(14.8)} ${y(10.2)}`, 2.05 * size),
    knockoutStroke(`M${x(9.8)} ${y(9.2)} L${x(6.9)} ${y(8.9)} L${x(5)} ${y(10.9)}`, 2.05 * size),
  ].join("");
}

function doorway(dir: 1 | -1, final = false, size = 1, dx = 0, dy = 0): string {
  const x = (v: number): number => dx + size * (dir === 1 ? v : 24 - v);
  const y = (v: number): number => dy + size * v;
  return knockoutStroke(`M${x(17.4)} ${y(3.6)} H${x(22.3)} V${y(final ? 18.9 : 20.5)} H${x(17.4)}`, 1.7 * size, "butt") +
    (final ? knockoutStroke(`M${x(16.7)} ${y(22)} H${x(22.3)}`, 1.7 * size) : "");
}

function exitGlyph(dir: 1 | -1, final = false, nfpa = false): string {
  const extra = nfpa
    ? rect({ class: KNOCKOUT_STROKE, x: dir === 1 ? 16.5 : 3.5, y: 3.8, width: 4.2, height: 16.4, rx: 0.4 })
    : doorway(dir, final);
  return plate("safe") + runningFigure(dir) + extra;
}

/** Solid ISO 3864-3 directional arrow filling one 24-wide half of the plate. */
function combinationArrow(dir: 1 | -1, dx: number): string {
  const x = (v: number): number => dx + (dir === 1 ? v : 24 - v);
  return path({
    class: KNOCKOUT,
    d: `M${x(3)} 9 H${x(13)} V4.5 L${x(21)} 12 L${x(13)} 19.5 V15 H${x(3)} Z`,
  });
}

/**
 * Combination escape-route sign on a landscape 48×24 plate: the running figure
 * leaving a doorway at full pictogram size beside an equally weighted arrow.
 * ISO 3864-3 puts the arrow on the side the route runs, so the whole plate
 * mirrors with `dir` rather than only the figure.
 */
function exitDirectionGlyph(dir: 1 | -1, nfpa = false): string {
  const figureDx = dir === 1 ? 0 : 24;
  const arrowDx = dir === 1 ? 24 : 0;
  const door = nfpa
    ? rect({
        class: KNOCKOUT_STROKE,
        x: figureDx + (dir === 1 ? 16.5 : 3.5),
        y: 3.8,
        width: 4.2,
        height: 16.4,
        rx: 0.4,
      })
    : doorway(dir, false, 1, figureDx, 0);
  return (
    plate("safe", "square", EXIT_DIRECTION_WIDTH) +
    runningFigure(dir, 1, figureDx, 0) +
    door +
    combinationArrow(dir, arrowDx)
  );
}

function crossGlyph(colour: "safe" | "fire" = "safe"): string {
  return [
    plate(colour),
    rect({ class: KNOCKOUT, x: 9.4, y: 4.4, width: 5.2, height: 15.2, rx: 0.6 }),
    rect({ class: KNOCKOUT, x: 4.4, y: 9.4, width: 15.2, height: 5.2, rx: 0.6 }),
  ].join("");
}

function handset(fire = false): string {
  if (fire) {
    return [
      knockoutStroke("M11.6867 14.1558C8.3208 14.1558 4.4742 10.3092 4.4742 6.9433", 2.04),
      path({ class: KNOCKOUT, d: "M13.4898 16.1994 10.124 12.8335 10.725 12.2325C11.8069 11.1506 13.009 11.391 13.9706 12.3527C14.9323 13.3144 15.1727 14.5165 14.0908 15.5983L13.4898 16.1994Z" }),
      path({ class: KNOCKOUT, d: "M5.7965 8.506 2.4306 5.1402 3.0317 4.5392C4.1135 3.4573 5.3156 3.6977 6.2773 4.6594C7.239 5.621 7.4794 6.8231 6.3975 7.905L5.7965 8.506Z" }),
    ].join("");
  }
  return [
    knockoutStroke("M14.9255 17.3598 C10.9657 17.3598 6.4402 12.8343 6.4402 8.8745", 2.4),
    path({ class: KNOCKOUT, d: "M17.0468 19.7640 L13.0870 15.8042 L13.7941 15.0971 C15.0669 13.8243 16.4811 14.1071 17.6125 15.2385 C18.7439 16.3698 19.0267 17.7841 17.7539 19.0569 Z" }),
    path({ class: KNOCKOUT, d: "M7.9958 10.7130 L4.0360 6.7532 L4.7431 6.0461 C6.0159 4.7733 7.4302 5.0561 8.5615 6.1875 C9.6929 7.3189 9.9757 8.7331 8.7029 10.0059 Z" }),
  ].join("");
}

function flame(cls = KNOCKOUT): string {
  return path({
    class: cls,
    d: "M 12 3 C 14 6 18 7.2 17.3 12 C 17 15 15.1 18.8 12 20.5 C 8.2 19 6.4 16.4 6.8 13 C 7.2 9.8 10.4 8.8 9.7 5.7 C 11.1 6.5 12.2 8.3 12.1 10.1 C 14 8.2 13.4 5.5 12 3 Z",
  });
}

// Put the class on the group so each path retains the target stroke width.
function knockoutStroke(d: string, width: number, linecap?: "butt"): string {
  return group({ class: KNOCKOUT_STROKE }, [path({ d, "stroke-width": width, "stroke-linecap": linecap })]);
}

function inwardArrows(): string {
  return [
      knockoutStroke("M2.3 2.3 3.9971 3.9971", 1.7),
      path({ class: KNOCKOUT, d: "M5.977 5.977 5.1991 2.2293 2.2293 5.1991 5.977 5.977Z" }),
      knockoutStroke("M21.7 2.3 20.0029 3.9971", 1.7),
      path({ class: KNOCKOUT, d: "M18.023 5.977 21.7707 5.1991 18.8009 2.2293 18.023 5.977Z" }),
      knockoutStroke("M2.3 21.7 3.9971 20.0029", 1.7),
      path({ class: KNOCKOUT, d: "M5.977 18.023 2.2293 18.8009 5.1991 21.7707 5.977 18.023Z" }),
      knockoutStroke("M21.7 21.7 20.0029 20.0029", 1.7),
      path({ class: KNOCKOUT, d: "M18.023 18.023 18.8009 21.7707 21.7707 18.8009 18.023 18.023Z" }),
  ].join("");
}

function firstAidCross(): string {
  return [
    rect({ class: KNOCKOUT, x: 18.35, y: 1.9, width: 1.9, height: 5.6, rx: 0.3 }),
    rect({ class: KNOCKOUT, x: 16.5, y: 3.75, width: 5.6, height: 1.9, rx: 0.3 }),
  ].join("");
}

// Shared F-series flame, with offsets baked into the 24-unit coordinates.
function fireFlame(dx = 0, dy = 0, size = 1, cls = KNOCKOUT): string {
  const p = (x: number, y: number): string => `${x * size + dx} ${y * size + dy}`;
  return path({
    class: cls,
    d: `M${p(18.6, 11.2)} C${p(20.9, 13.3)} ${p(21.6, 15.6)} ${p(21.1, 17.6)} C${p(20.7, 19.4)} ${p(19.3, 20.4)} ${p(17.8, 20.4)} C${p(16.1, 20.4)} ${p(14.8, 19.1)} ${p(14.9, 17.3)} C${p(15, 15.9)} ${p(15.9, 15.1)} ${p(16.3, 14)} C${p(17, 14.9)} ${p(17.1, 15.7)} ${p(17, 16.5)} C${p(18.2, 15.3)} ${p(18.9, 13.5)} ${p(18.6, 11.2)} Z`,
  });
}

function standingFigure(dx: number, dy: number, sx: number, sy: number, dark = false): string {
  const x = (v: number): number => dx + v * sx;
  const y = (v: number): number => dy + v * sy;
  const cls = dark ? DARK : KNOCKOUT;
  return [
    path({ class: cls, d: `M${x(8.9)} ${y(11.2)} a${1.9 * sx} ${1.9 * sy} 0 1 0 ${3.8 * sx} 0 a${1.9 * sx} ${1.9 * sy} 0 1 0 ${-3.8 * sx} 0` }),
    rect({ class: cls, x: x(9), y: y(13.6), width: 3.6 * sx, height: 4.6 * sy, rx: 1.2 * sx, ry: 1.2 * sy }),
    ...([[9.2, 14.2, 7, 17.6], [12.4, 14.2, 14.6, 17.6], [9.9, 17.6, 9, 21.6], [11.7, 17.6, 12.6, 21.6]] as const).map(([x1, y1, x2, y2]) => {
      const length = Math.hypot(x2 - x1, y2 - y1);
      const nx = (y1 - y2) / length * 1.025;
      const ny = (x2 - x1) / length * 1.025;
      const arc = `A${1.025 * sx} ${1.025 * sy} 0 0 0`;
      return path({ class: cls, d: `M${x(x1 + nx)} ${y(y1 + ny)} L${x(x2 + nx)} ${y(y2 + ny)} ${arc} ${x(x2 - nx)} ${y(y2 - ny)} L${x(x1 - nx)} ${y(y1 - ny)} ${arc} ${x(x1 + nx)} ${y(y1 + ny)} Z` });
    }),
  ].join("");
}

function rescueWindow(): string {
  return runningFigure(-1, 0.64, 6.8, 1.6) + knockoutStroke("M12 2 H22 V14 H12 V11", 1.7);
}

function make(
  code: string,
  colour: SafetySymbolDef["colour"],
  draw: (ctx: SafetyDrawCtx) => string,
  sheetMm = 8,
  viewWidth?: number
): SafetySymbolDef {
  return { code, colour, draw, sheetMm, ...(viewWidth === undefined ? {} : { viewWidth }) };
}

const exitDefault = make("E001/E002", "safe", (ctx) => {
  const dir = ctx.hand === "left" ? -1 : 1;
  return exitGlyph(dir);
});

const exitFinalDefault = make("E001/E002", "safe", (ctx) => {
  const dir = ctx.hand === "left" ? -1 : 1;
  return exitGlyph(dir, true);
});

export const SAFETY_SYMBOLS: Record<SafetyKind, SafetySymbolDef> = {
  here: make("ISO 23601", "safe", () =>
    [
      circle({ class: LOCATION, cx: 12, cy: 12, r: 12 }),
      group({ class: KNOCKOUT_STROKE }, [circle({ cx: 12, cy: 12, r: 6.9675, "stroke-width": 1.5594 })]),
      circle({ class: KNOCKOUT, cx: 12, cy: 12, r: 2.5162 }),
    ].join("")
  ),
  exit: exitDefault,
  "exit-direction": make(
    "E001/E002 + ISO 3864-3 arrow",
    "safe",
    (ctx) => exitDirectionGlyph(ctx.hand === "left" ? -1 : 1),
    8,
    EXIT_DIRECTION_WIDTH
  ),
  "exit-final": exitFinalDefault,
  assembly: make("E007", "safe", () =>
    [
      plate("safe"),
      inwardArrows(),
      circle({ class: KNOCKOUT, cx: 12, cy: 7.3, r: 1.6 }),
      circle({ class: KNOCKOUT, cx: 9.4, cy: 10.3, r: 1.75 }),
      circle({ class: KNOCKOUT, cx: 14.6, cy: 10.3, r: 1.75 }),
      path({ class: KNOCKOUT, d: "M7.2 17.2V14.6C7.2 13.2 8.1 12.5 9.4 12.5C10.7 12.5 11.6 13.2 11.6 14.6V17.2H7.2Z" }),
      path({ class: KNOCKOUT, d: "M12.4 17.2V14.6C12.4 13.2 13.3 12.5 14.6 12.5C15.9 12.5 16.8 13.2 16.8 14.6V17.2H12.4Z" }),
    ].join("")
  ),
  refuge: make("E024", "safe", () =>
    [
      plate("safe"),
      inwardArrows(),
      circle({ class: KNOCKOUT, cx: 11.052, cy: 7.857, r: 1.311 }),
      knockoutStroke("M10.707 10.065 L11.19 13.17 H13.95 L16.02 16.62 H17.4 M11.19 11.1 H13.95", 1.4145),
      knockoutStroke("M9.327 11.928 A3.45 3.45 0 1 0 13.122 16.896", 1.173),
    ].join("")
  ),
  shelter: make("E021", "safe", () =>
    [
      plate("safe"),
      knockoutStroke("M3 6 L7 3 H17 L21 6 V17 H3 Z", 1.7),
      ...[1.2, 5.3, 9.4, 13.5].map((dx) => standingFigure(dx, 2.44, 0.38, 0.52)),
      knockoutStroke("M3 21 H8 M16 21 H21", 1.7),
      path({ class: KNOCKOUT, d: "M9 18 H15 V20 Q15 22 12 23 Q9 22 9 20 Z" }),
    ].join("")
  ),
  "first-aid": make("E003", "safe", () => crossGlyph()),
  aed: make("E010", "safe", () =>
    [
      plate("safe"),
      path({ class: KNOCKOUT, d: "M10.6 21.2C8.2 19 3 15.6 3 10.8C3 8.3 4.9 6.6 7 6.6C8.6 6.6 9.9 7.5 10.6 8.8C11.3 7.5 12.6 6.6 14.2 6.6C16.3 6.6 18.2 8.3 18.2 10.8C18.2 15.6 13 19 10.6 21.2Z" }),
      path({ class: SAFE_PLATE, d: "M11.2 8.9H13.6L11.9 12.5H14L9.4 19.2L10.5 14.4H8.2L11.2 8.9Z" }),
      firstAidCross(),
    ].join("")
  ),
  stretcher: make("E013", "safe", () =>
    [
      plate("safe"),
      circle({ class: KNOCKOUT, cx: 4.5, cy: 11.4, r: 1.9 }),
      knockoutStroke("M8 12H12L15 13H19", 2.05),
      knockoutStroke("M2.8 16H21.2M5 16V19M19 16V19", 1.7),
      firstAidCross(),
    ].join("")
  ),
  doctor: make("E009", "safe", () =>
    [
      plate("safe"),
      circle({ class: KNOCKOUT, cx: 9.4, cy: 6.3, r: 2.5 }),
      path({ class: KNOCKOUT, d: "M3.4 21V15Q3.4 10.5 9.4 10.5Q15.4 10.5 15.4 15V21H3.4Z" }),
      path({ class: SAFE_PLATE, d: "M5.9 11 A0.7 0.7 0 0 1 7.3 11 V14.5 Q7.3 17.1 10.2 17.1 Q11.6 17.1 11.6 15.5 V14 H13 V15.5 Q13 18.5 10.2 18.5 Q5.9 18.5 5.9 14.5 Z" }),
      circle({ class: SAFE_PLATE, cx: 12.3, cy: 13.6, r: 1.25 }),
      firstAidCross(),
    ].join("")
  ),
  eyewash: make("E011", "safe", () =>
    [
      plate("safe"),
      knockoutStroke("M4.4 8.6C7 5 13.8 5 16.4 8.6C13.8 12.2 7 12.2 4.4 8.6Z", 1.4),
      circle({ class: KNOCKOUT, cx: 10.4, cy: 8.6, r: 2.2 }),
      knockoutStroke("M8.2 16 7.2 13.4", 1.4),
      knockoutStroke("M10.4 15.8V13", 1.4),
      knockoutStroke("M12.6 16 13.6 13.4", 1.4),
      path({ class: KNOCKOUT, d: "M7.2 16.6H13.6L12 18.8H8.8L7.2 16.6Z" }),
      rect({ class: KNOCKOUT, x: 9.6, y: 18.4, width: 1.6, height: 3.4 }),
      firstAidCross(),
    ].join("")
  ),
  "safety-shower": make("E012", "safe", () =>
    [
      plate("safe"),
      knockoutStroke("M3.4 2.8H10.8V4.2", 1.7),
      path({ class: KNOCKOUT, d: "M8.8 4H12.8L14.8 6.2H6.8L8.8 4Z" }),
      knockoutStroke("M7.6 7.6 6.8 9.8", 1.4),
      knockoutStroke("M10.8 7.6V8.1", 1.4),
      knockoutStroke("M14 7.6 14.8 9.8", 1.4),
      circle({ class: KNOCKOUT, cx: 10.8, cy: 11.2, r: 1.9 }),
      rect({ class: KNOCKOUT, x: 9, y: 13.6, width: 3.6, height: 4.6, rx: 1.2 }),
      knockoutStroke("M9.2 14.2 7 17.6", 2.05),
      knockoutStroke("M12.4 14.2 14.6 17.6", 2.05),
      knockoutStroke("M9.9 17.6 9 21.6", 2.05),
      knockoutStroke("M11.7 17.6 12.6 21.6", 2.05),
      firstAidCross(),
    ].join("")
  ),
  "emergency-phone": make("E004", "safe", () => plate("safe") + handset() + firstAidCross()),
  "break-glass": make("E008", "safe", () =>
    [
      plate("safe"),
      path({ class: KNOCKOUT, d: "M15 2 L16.3 6 L20.5 3.5 L19 8 L23 9 L19 11.3 L21 15.5 L16.6 13.8 L15 18 L13.5 13.8 L10 16 L11.2 11.5 L7.7 9 L12 7.5 L10.5 3.8 L14 6 Z" }),
      path({ class: SAFE_PLATE, d: "M1.8611 17.6713 L15.8611 5.6713 L18.1389 8.3287 L4.1389 20.3287 Z" }),
      knockoutStroke("M3 19 L17 7", 2.05),
      path({ class: SAFE_PLATE, d: "M2.7 11.78 L6 9.58 L8.25 10.72 L10.39 13.95 L9.29 17.25 L7.27 18.25 L5.22 22.35 H1.3 L3.2 17.06 L1.59 15.04 Z" }),
      path({ class: KNOCKOUT, d: "M3 12 L6 10 L8 11 L10 14 L9 17 L7 18 L5 22 H1.8 L3.6 17 L2 15 Z" }),
    ].join("")
  ),
  "escape-ladder": make("E016", "safe", () =>
    plate("safe") + rescueWindow() + knockoutStroke("M3 12 V22 M9 12 V22 M3 14 H9 M3 17 H9 M3 20 H9", 1.7)
  ),
  "rescue-window": make("E017", "safe", () =>
    [
      plate("safe"),
      rescueWindow(),
      knockoutStroke("M3 18 L11 12 M5 20 L13 14 M5 17 L7 19 M8 15 L10 17", 1.7),
      path({ class: KNOCKOUT, d: "M9 18 H18 V15 H21 L23 18 V21 H9 Z" }),
      ...[12, 20].flatMap((cx) => [
        circle({ class: SAFE_PLATE, cx, cy: 21, r: 2.05 }),
        circle({ class: KNOCKOUT, cx, cy: 21, r: 1.35 }),
      ]),
    ].join("")
  ),
  "emergency-door-push": make("E022/E023", "safe", (ctx) => {
    const x = (v: number): number => ctx.hand === "left" ? v : 24 - v;
    return [
      plate("safe"),
      knockoutStroke(`M${x(6)} 20 V3 H${x(19)} V20`, 1.7),
      path({ class: KNOCKOUT, d: `M${x(7.8)} 4.5 L${x(14.5)} 7 V21 L${x(7.8)} 18.5 Z` }),
      knockoutStroke(`M${x(20)} 13 C${x(23)} 19 ${x(15)} 22 ${x(4.8)} 15`, 1.7),
      path({ class: KNOCKOUT, d: `M${x(2.2)} 15 L${x(7.2)} 11.5 V14 H${x(9)} V16 H${x(7.2)} V18.5 Z` }),
    ].join("");
  }),
  "emergency-door-slide": make("E033/E034", "safe", (ctx) => {
    const x = (v: number): number => ctx.hand === "left" ? 24 - v : v;
    return [
      plate("safe"),
      knockoutStroke("M2.5 3 H21.5 M2.5 21 H21.5", 1.7),
      rect({ class: KNOCKOUT, x: ctx.hand === "left" ? 11 : 5, y: 5, width: 8, height: 14 }),
      path({ class: SAFE_PLATE, d: `M${x(6.788)} 10.633 H${x(14.988)} L${x(11.708)} 7.082 H${x(15.152)} L${x(20.892)} 12.04 L${x(15.152)} 16.998 H${x(11.708)} L${x(14.988)} 13.447 H${x(6.788)} Z` }),
      path({ class: KNOCKOUT, d: `M${x(13)} 10.633 H${x(14.988)} L${x(13)} 8.4808 V7.082 H${x(15.152)} L${x(20.892)} 12.04 L${x(15.152)} 16.998 H${x(13)} V15.5992 L${x(14.988)} 13.447 H${x(13)} Z` }),
    ].join("");
  }),
  extinguisher: make("F001", "fire", () =>
    [
      plate("fire"),
      rect({ class: KNOCKOUT, x: 3.4, y: 20.4, width: 11.2, height: 1.7, rx: 0.7 }),
      rect({ class: KNOCKOUT, x: 5.6, y: 7.4, width: 6.6, height: 12.6, rx: 1.7 }),
      rect({ class: FIRE_PLATE, x: 7.2, y: 11.8, width: 3.4, height: 3.8, rx: 0.4 }),
      rect({ class: KNOCKOUT, x: 7.4, y: 4.6, width: 3, height: 3 }),
      rect({ class: KNOCKOUT, x: 5, y: 3.5, width: 8, height: 1.6, rx: 0.7 }),
      knockoutStroke("M12.8 6Q15.8 7.2 15.4 10.6", 1.4),
      rect({ class: KNOCKOUT, x: 14.2, y: 10.4, width: 2.4, height: 1.7, rx: 0.5 }),
      fireFlame(0, 0),
    ].join("")
  ),
  "hose-reel": make("F002", "fire", () =>
    [
      plate("fire"),
      rect({ class: KNOCKOUT, x: 2.6, y: 3.2, width: 1.7, height: 9.8, rx: 0.5 }),
      knockoutStroke("M4.3 8H11", 1.4),
      circle({ class: KNOCKOUT, cx: 7.4, cy: 8, r: 2.4 }),
      path({ class: FIRE_PLATE, d: "M5.9 7.6 H7 V6.5 H7.8 V7.6 H8.9 V8.4 H7.8 V9.5 H7 V8.4 H5.9 Z" }),
      knockoutStroke("M11 3.4V11.2", 1.1),
      knockoutStroke("M13.1 3.4V11.2", 1.1),
      knockoutStroke("M15.2 3.4V11.2", 1.1),
      knockoutStroke("M17.3 3.4V11.2", 1.1),
      knockoutStroke("M19.4 3.4V11.2", 1.1),
      knockoutStroke("M11 11.2V16.8", 1.1),
      path({ class: KNOCKOUT, d: "M9.8 16.4H12.2V17.6L11.7 21H10.3L9.8 17.6V16.4Z" }),
      fireFlame(0.2, 1.4),
    ].join("")
  ),
  "fire-ladder": make("F003", "fire", () =>
    [
      plate("fire"),
      knockoutStroke("M3 21 6 3M12 21 9 3M5.7 5H9.3M5.2 8H9.8M4.7 11H10.3M4.2 14H10.8M3.7 17H11.3M3.2 20H11.8", 1.7),
      fireFlame(0.2, 0),
    ].join("")
  ),
  "fire-equipment": make("F004", "fire", () =>
    [
      plate("fire"),
      path({ class: KNOCKOUT, d: "M1.8 17.4C3 15.6 4.4 14.2 6.4 14.2H14C14.7 14.2 14.9 14.9 14.5 15.4L14.2 15.8H6.8C5 15.8 3.6 16.6 2.8 17.8C2.5 18.2 1.5 17.9 1.8 17.4Z" }),
      path({ class: KNOCKOUT, d: "M5 13.5C5 8.9 7.4 6 9.8 6C12.2 6 13.8 8.8 13.8 12.8V13.5H5Z" }),
      knockoutStroke("M6.6 8.6C7.6 5.4 11.4 4.7 12.8 7.6", 1.2),
      path({ class: FIRE_PLATE, d: "M11.65 13.85 L11.13 9.66 Q13.25 7.94 15.37 9.66 L14.85 13.85 Z" }),
      path({ class: KNOCKOUT, d: "M12.31 13.15 L11.87 9.96 Q13.25 8.88 14.63 9.96 L14.19 13.15 Z" }),
      fireFlame(0.4, 0.6),
    ].join("")
  ),
  "call-point": make("F005", "fire", () =>
    [
      plate("fire"),
      knockoutStroke("M6.9 13.2H3.4V3.2H13.4V13.2H10.1", 1.7),
      circle({ class: KNOCKOUT, cx: 8.5, cy: 8.2, r: 1.9 }),
      knockoutStroke("M8.5 11.2V16.4", 2.05),
      path({ class: KNOCKOUT, d: "M7.4 15.6C7.4 14.6 8.2 14.2 9 14.4C9.4 13.6 10.6 13.5 11.1 14.3C11.6 13.7 12.8 13.8 13.1 14.7C13.7 14.4 14.6 14.8 14.6 15.8V18.6C14.6 20.4 13.6 21.4 12.2 21.8V23H8.2V21.4C7 20.6 5.2 18.8 4.8 17.4C4.5 16.5 5.4 15.9 6.1 16.5L7.4 17.6V15.6Z" }),
      fireFlame(0.2, -2.4),
    ].join("")
  ),
  "fire-phone": make("F006", "fire", () =>
    [
      plate("fire"),
      handset(true),
      fireFlame(0.2, 0),
    ].join("")
  ),
  riser: make("", "fire", () =>
    [
      plate("fire"),
      path({ class: KNOCKOUT_STROKE, d: "M 8 3 V 21 M 16 3 V 21 M 5 8 H 19 M 5 16 H 19" }),
      circle({ class: KNOCKOUT_STROKE, cx: 12, cy: 12, r: 3 }),
      path({ class: KNOCKOUT_STROKE, d: "M 10 10 L 14 14 M 14 10 L 10 14" }),
    ].join("")
  ),
  "not-an-exit": make("NFPA 170 Ch.11", "fire", () =>
    [
      plate("fire"),
      rect({ class: KNOCKOUT_STROKE, x: 6, y: 4, width: 12, height: 16 }),
      path({ class: KNOCKOUT_STROKE, d: "M 4 4 L 20 20" }),
    ].join("")
  ),
  "no-elevator": make("P020", "fire", () =>
    [
      circle({ class: KNOCKOUT, cx: 12, cy: 12, r: 12 }),
      path({ class: DARK_STROKE, d: "M5 5.4 H15.5 V18.6 H5 Z" }),
      standingFigure(2, 3, 0.55, 0.55, true),
      standingFigure(6, 3, 0.55, 0.55, true),
      fireFlame(6.5, 1, 0.65, DARK),
      path({ class: FIRE_PLATE, "fill-rule": "evenodd", d: "M12 0 A12 12 0 1 0 12 24 A12 12 0 1 0 12 0 Z M12 2.8 A9.2 9.2 0 1 1 12 21.2 A9.2 9.2 0 1 1 12 2.8 Z" }),
      path({ class: FIRE_PLATE, d: "M3.5101 5.4899 L5.4899 3.5101 L20.4899 18.5101 L18.5101 20.4899 Z" }),
    ].join("")
  ),
  "alarm-sounder": make("F018", "fire", () =>
    [
      plate("fire"),
      path({ class: KNOCKOUT, d: "M3 18H12L11 10Q10.7 7 7.5 7Q4.3 7 4 10L3 18Z" }),
      knockoutStroke("M2.5 20H12.5M7.5 2V4M1.8 5 3.3 6.5M13.2 5 11.7 6.5", 1.7),
      fireFlame(0.3, 0),
    ].join("")
  ),
};

const fireDoor = make("", "neutral", () =>
  [
    plate("neutral"),
    rect({ class: DARK_STROKE, x: 5, y: 3, width: 14, height: 18 }),
    flame(DARK),
  ].join("")
);

const smokeDoor = make("", "neutral", () =>
  [
    plate("neutral"),
    rect({ class: DARK_STROKE, x: 5, y: 3, width: 14, height: 18 }),
    path({ class: DARK_STROKE, d: "M 7 15 C 9 12 11 18 13 15 C 15 12 17 18 19 15 M 7 10 C 9 7 11 13 13 10 C 15 7 17 13 19 10" }),
  ].join("")
);

function directionalExit(
  hand: "left" | "right",
  profile: "iso" | "nfpa",
  final: boolean
): SafetySymbolDef {
  const dir = hand === "left" ? -1 : 1;
  const code =
    profile === "nfpa"
      ? "NFPA 170 Ch.11"
      : hand === "left"
        ? "E001"
        : "E002";
  return make(code, "safe", () => exitGlyph(dir, final, profile === "nfpa"));
}

function directionalExitDirection(
  hand: "left" | "right",
  profile: "iso" | "nfpa"
): SafetySymbolDef {
  const dir = hand === "left" ? -1 : 1;
  const code =
    profile === "nfpa"
      ? "NFPA 170 Ch.11"
      : `${hand === "left" ? "E001" : "E002"} + ISO 3864-3 arrow`;
  return make(
    code,
    "safe",
    () => exitDirectionGlyph(dir, profile === "nfpa"),
    8,
    EXIT_DIRECTION_WIDTH
  );
}

const hereNfpa = make("NFPA 170 Ch.11", "safe", () =>
  [
    plate("safe"),
    polygon({ class: KNOCKOUT, points: "12,2.5 15,9 21.5,12 15,15 12,21.5 9,15 2.5,12 9,9" }),
    circle({ class: DARK, cx: 12, cy: 12, r: 2 }),
  ].join("")
);

const hereUae = make("UAE Civil Defence", "warning", () =>
  [
    plate("warning", "triangle"),
    circle({ class: DARK_STROKE, cx: 12, cy: 14, r: 4 }),
    circle({ class: DARK, cx: 12, cy: 14, r: 1.4 }),
  ].join("")
);

/**
 * Forty renderable catalog cells: 30 vocabulary glyphs (including the two
 * structural door marks) plus ten profile/direction variants.
 */
export const SAFETY_PREVIEW_SYMBOLS: Readonly<Record<string, SafetySymbolDef>> = {
  ...SAFETY_SYMBOLS,
  "fire-door": fireDoor,
  "smoke-door": smokeDoor,
  "exit:iso:left": directionalExit("left", "iso", false),
  "exit:iso:right": directionalExit("right", "iso", false),
  "exit:nfpa:left": directionalExit("left", "nfpa", false),
  "exit:nfpa:right": directionalExit("right", "nfpa", false),
  "exit-direction:iso:left": directionalExitDirection("left", "iso"),
  "exit-direction:iso:right": directionalExitDirection("right", "iso"),
  "exit-direction:nfpa:left": directionalExitDirection("left", "nfpa"),
  "exit-direction:nfpa:right": directionalExitDirection("right", "nfpa"),
  "exit-final:iso:left": directionalExit("left", "iso", true),
  "exit-final:iso:right": directionalExit("right", "iso", true),
  "exit-final:nfpa:left": directionalExit("left", "nfpa", true),
  "exit-final:nfpa:right": directionalExit("right", "nfpa", true),
  "here:nfpa": hereNfpa,
  "here:uae": hereUae,
};

export function resolveSafetySymbol(
  name: SafetyName,
  context: { hand: "left" | "right"; profile: CompliancePolicy }
): SafetySymbolDef {
  const kind = resolveSafetyKind(name);
  if (!kind) {
    throw new Error(`unknown evacuation safety symbol "${name}"`);
  }
  if (kind === "exit" || kind === "exit-final") {
    const profile = context.profile === "nfpa" ? "nfpa" : "iso";
    return directionalExit(context.hand, profile, kind === "exit-final");
  }
  if (kind === "exit-direction") {
    const profile = context.profile === "nfpa" ? "nfpa" : "iso";
    return directionalExitDirection(context.hand, profile);
  }
  if (kind === "here" && context.profile === "nfpa") return hereNfpa;
  if (kind === "here" && context.profile === "uae") return hereUae;
  return SAFETY_SYMBOLS[kind];
}

export const STRUCTURAL_SAFETY_SYMBOLS = {
  "fire-door": fireDoor,
  "smoke-door": smokeDoor,
} as const;
