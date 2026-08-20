/**
 * Original safety-sign line art for evacuation plans.
 *
 * The geometry follows the semantic shape/color grammar described by
 * ISO 3864 and the identities registered by ISO 7010 / NFPA 170. It is
 * drawn from scratch on a shared 24×24 grid; no standards artwork is copied,
 * traced, downloaded, or embedded.
 */

import { circle, line, path, polygon, rect } from "../../core/svg";
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

function plate(
  colour: SafetySymbolDef["colour"],
  shape: "square" | "circle" | "triangle" = "square"
): string {
  const cls =
    colour === "safe"
      ? "sx-fp-safety-plate-safe"
      : colour === "fire"
        ? "sx-fp-safety-plate-fire"
        : colour === "mandatory"
          ? "sx-fp-safety-plate-mand"
          : colour === "warning"
            ? "sx-fp-safety-plate-warn"
            : "sx-fp-safety-plate-neutral";
  if (shape === "circle") return circle({ class: cls, cx: 12, cy: 12, r: 11 });
  if (shape === "triangle") {
    return polygon({ class: cls, points: "12,1 23,22 1,22" });
  }
  return rect({ class: cls, x: 0, y: 0, width: 24, height: 24, rx: 2 });
}

function runningFigure(dir: 1 | -1): string {
  const x = (value: number): number => (dir === 1 ? value : 24 - value);
  return [
    circle({ class: KNOCKOUT, cx: x(9.2), cy: 6.4, r: 1.9 }),
    path({
      class: KNOCKOUT_STROKE,
      d: `M ${x(9.6)} 9 L ${x(11.2)} 13.4 L ${x(13.8)} 16.2`,
    }),
    path({
      class: KNOCKOUT_STROKE,
      d: `M ${x(11.2)} 13.4 L ${x(8.2)} 17.8 L ${x(7.4)} 21`,
    }),
    path({
      class: KNOCKOUT_STROKE,
      d: `M ${x(10.4)} 11 L ${x(6.6)} 12.6`,
    }),
    path({
      class: KNOCKOUT_STROKE,
      d: `M ${x(10.9)} 11.5 L ${x(14.8)} 10.1`,
    }),
  ].join("");
}

function doorway(dir: 1 | -1, final = false): string {
  const x = (value: number): number => (dir === 1 ? value : 24 - value);
  const frame = path({
    class: KNOCKOUT_STROKE,
    d: `M ${x(17.2)} 4.6 L ${x(21)} 4.6 L ${x(21)} 19.4 L ${x(17.2)} 19.4`,
  });
  if (!final) return frame;
  return (
    frame +
    line({
      class: KNOCKOUT_STROKE,
      x1: x(16.7),
      y1: 20.5,
      x2: x(22),
      y2: 20.5,
    })
  );
}

function exitGlyph(dir: 1 | -1, final = false, nfpa = false): string {
  const extra = nfpa
    ? rect({
        class: KNOCKOUT_STROKE,
        x: dir === 1 ? 16.5 : 3.5,
        y: 3.8,
        width: 4.2,
        height: 16.4,
        rx: 0.4,
      })
    : doorway(dir, final);
  return plate("safe") + runningFigure(dir) + extra;
}

function directionArrow(dir: 1 | -1): string {
  const x = (value: number): number => (dir === 1 ? value : 24 - value);
  return path({
    class: KNOCKOUT_STROKE,
    d: `M ${x(2.5)} 3.2 H ${x(10)} M ${x(7.1)} 0.8 L ${x(10)} 3.2 L ${x(7.1)} 5.6`,
  });
}

function exitDirectionGlyph(dir: 1 | -1, nfpa = false): string {
  return exitGlyph(dir, false, nfpa) + directionArrow(dir);
}

function crossGlyph(colour: "safe" | "fire" = "safe"): string {
  return (
    plate(colour) +
    path({
      class: KNOCKOUT,
      d: "M 9 4 H 15 V 9 H 20 V 15 H 15 V 20 H 9 V 15 H 4 V 9 H 9 Z",
    })
  );
}

function handset(cls = KNOCKOUT_STROKE): string {
  return path({
    class: cls,
    d: "M 7 5 C 5.5 7.2 6.8 11.5 10.3 15 C 13.8 18.5 18.1 19.8 20 17.8 L 17.1 14.8 L 14.5 16.1 C 12.3 14.9 9.1 11.7 7.9 9.5 L 9.2 7 Z",
  });
}

function flame(cls = KNOCKOUT): string {
  return path({
    class: cls,
    d: "M 12 3 C 14 6 18 7.2 17.3 12 C 17 15 15.1 18.8 12 20.5 C 8.2 19 6.4 16.4 6.8 13 C 7.2 9.8 10.4 8.8 9.7 5.7 C 11.1 6.5 12.2 8.3 12.1 10.1 C 14 8.2 13.4 5.5 12 3 Z",
  });
}

function make(
  code: string,
  colour: SafetySymbolDef["colour"],
  draw: (ctx: SafetyDrawCtx) => string,
  sheetMm = 8
): SafetySymbolDef {
  return { code, colour, draw, sheetMm };
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
      plate("safe"),
      circle({ class: KNOCKOUT_STROKE, cx: 12, cy: 12, r: 6.5 }),
      circle({ class: KNOCKOUT, cx: 12, cy: 12, r: 2.2 }),
      line({ class: KNOCKOUT_STROKE, x1: 12, y1: 2.8, x2: 12, y2: 6 }),
      line({ class: KNOCKOUT_STROKE, x1: 12, y1: 18, x2: 12, y2: 21.2 }),
      line({ class: KNOCKOUT_STROKE, x1: 2.8, y1: 12, x2: 6, y2: 12 }),
      line({ class: KNOCKOUT_STROKE, x1: 18, y1: 12, x2: 21.2, y2: 12 }),
    ].join("")
  ),
  exit: exitDefault,
  "exit-direction": make(
    "E001/E002 + ISO 3864-3 arrow",
    "safe",
    (ctx) => exitDirectionGlyph(ctx.hand === "left" ? -1 : 1)
  ),
  "exit-final": exitFinalDefault,
  assembly: make("E007", "safe", () =>
    [
      plate("safe"),
      ...[
        [7, 7],
        [17, 7],
        [7, 17],
        [17, 17],
      ].map(([x, y]) => circle({ class: KNOCKOUT, cx: x, cy: y, r: 1.7 })),
      path({
        class: KNOCKOUT_STROKE,
        d: "M 3 3 L 8.2 8.2 M 21 3 L 15.8 8.2 M 3 21 L 8.2 15.8 M 21 21 L 15.8 15.8",
      }),
    ].join("")
  ),
  refuge: make("NFPA 170 Ch.11", "safe", () =>
    [
      plate("safe"),
      circle({ class: KNOCKOUT, cx: 10, cy: 5, r: 1.8 }),
      circle({ class: KNOCKOUT_STROKE, cx: 11.5, cy: 14.5, r: 5 }),
      path({
        class: KNOCKOUT_STROKE,
        d: "M 10 7.2 L 10 12.5 L 15.3 12.5 M 8 9.5 L 13.5 9.5 M 15.2 15.8 L 19 20",
      }),
    ].join("")
  ),
  shelter: make("NFPA 170 Ch.11", "safe", () =>
    [
      plate("safe"),
      path({ class: KNOCKOUT_STROKE, d: "M 4 11 L 12 4 L 20 11 V 20 H 4 Z" }),
      path({ class: KNOCKOUT, d: "M 12 8 L 15 12 L 13.5 18 H 10.5 L 9 12 Z" }),
    ].join("")
  ),
  "first-aid": make("E003", "safe", () => crossGlyph()),
  aed: make("E010", "safe", () =>
    [
      plate("safe"),
      path({
        class: KNOCKOUT,
        d: "M 12 20 C 9.6 17.6 4.5 14.2 4.5 9.3 C 4.5 5.5 9.2 4.1 12 7 C 14.8 4.1 19.5 5.5 19.5 9.3 C 19.5 14.2 14.4 17.6 12 20 Z",
      }),
      polygon({ class: DARK, points: "13,7.3 9.6,12.5 12,12.5 10.8,17 15.4,10.8 12.8,10.8" }),
    ].join("")
  ),
  stretcher: make("E013", "safe", () =>
    [
      plate("safe"),
      circle({ class: KNOCKOUT, cx: 7, cy: 9, r: 1.6 }),
      path({ class: KNOCKOUT_STROKE, d: "M 4 15 H 20 M 6 15 L 5 20 M 18 15 L 19 20 M 8.5 10 L 15.5 14 H 7" }),
    ].join("")
  ),
  doctor: make("E009", "safe", () =>
    [
      plate("safe"),
      circle({ class: KNOCKOUT, cx: 12, cy: 6, r: 2.1 }),
      path({ class: KNOCKOUT_STROKE, d: "M 7 20 V 13 C 7 9.5 17 9.5 17 13 V 20 M 9 13 C 9 17 15 17 15 13" }),
      circle({ class: KNOCKOUT_STROKE, cx: 15.5, cy: 17.5, r: 1.5 }),
    ].join("")
  ),
  eyewash: make("E011", "safe", () =>
    [
      plate("safe"),
      path({ class: KNOCKOUT_STROKE, d: "M 4 11 C 8 6.5 16 6.5 20 11 C 16 15.5 8 15.5 4 11 Z" }),
      circle({ class: KNOCKOUT, cx: 12, cy: 11, r: 2 }),
      path({ class: KNOCKOUT, d: "M 8 17 C 8 15.5 9.3 14.7 10 13.5 C 10.7 14.7 12 15.5 12 17 A 2 2 0 0 1 8 17 Z" }),
    ].join("")
  ),
  "safety-shower": make("E012", "safe", () =>
    [
      plate("safe"),
      path({ class: KNOCKOUT_STROKE, d: "M 5 5 H 14 V 8 C 17 8 19 10 19 12 H 11 C 11 10 12 8.8 14 8" }),
      ...[12, 15, 18].map((x) =>
        path({ class: KNOCKOUT_STROKE, d: `M ${x} 14 L ${x - 1} 19` })
      ),
    ].join("")
  ),
  "emergency-phone": make("E004", "safe", () => plate("safe") + handset()),
  "break-glass": make("E008", "safe", () =>
    [
      plate("safe"),
      rect({ class: KNOCKOUT_STROKE, x: 5, y: 4, width: 14, height: 16, rx: 1 }),
      path({ class: KNOCKOUT_STROKE, d: "M 7 17 L 11 12 L 9 10 L 14 7 L 12.5 12 L 17 14" }),
    ].join("")
  ),
  "escape-ladder": make("E016", "safe", () =>
    [
      plate("safe"),
      rect({ class: KNOCKOUT_STROKE, x: 4, y: 4, width: 9, height: 8 }),
      path({ class: KNOCKOUT_STROKE, d: "M 14 5 L 14 21 M 19 5 L 19 21 M 14 8 H 19 M 14 12 H 19 M 14 16 H 19" }),
    ].join("")
  ),
  "rescue-window": make("E017", "safe", () =>
    [
      plate("safe"),
      rect({ class: KNOCKOUT_STROKE, x: 4, y: 4, width: 16, height: 16 }),
      circle({ class: KNOCKOUT, cx: 10, cy: 9, r: 1.7 }),
      path({ class: KNOCKOUT_STROKE, d: "M 10 11 L 13 15 L 17 13 M 12 14 L 9 18 M 13 15 L 16 19" }),
    ].join("")
  ),
  "emergency-door-push": make("E022/E023", "safe", (ctx) => {
    const left = ctx.hand === "left";
    const doorX = left ? 3 : 15;
    return [
      plate("safe"),
      rect({ class: KNOCKOUT_STROKE, x: doorX, y: 4, width: 6, height: 16 }),
      circle({ class: KNOCKOUT, cx: left ? 15 : 9, cy: 7, r: 1.7 }),
      path({
        class: KNOCKOUT_STROKE,
        d: left ? "M 15 9 L 13 13 L 8 12 M 13 13 L 16 19" : "M 9 9 L 11 13 L 16 12 M 11 13 L 8 19",
      }),
    ].join("");
  }),
  "emergency-door-slide": make("E033/E034", "safe", (ctx) => {
    const left = ctx.hand === "left";
    return [
      plate("safe"),
      rect({ class: KNOCKOUT_STROKE, x: 5, y: 4, width: 14, height: 16 }),
      line({ class: KNOCKOUT_STROKE, x1: 12, y1: 4, x2: 12, y2: 20 }),
      path({
        class: KNOCKOUT,
        d: left ? "M 11 9 L 6 12 L 11 15 Z" : "M 13 9 L 18 12 L 13 15 Z",
      }),
    ].join("");
  }),
  extinguisher: make("F001", "fire", () =>
    [
      plate("fire"),
      rect({ class: KNOCKOUT_STROKE, x: 8, y: 8, width: 8, height: 11, rx: 2 }),
      path({ class: KNOCKOUT_STROKE, d: "M 9 8 V 5 H 15 V 8 M 12 5 L 16 4 M 16 4 C 21 7 20 12 17 14" }),
      line({ class: KNOCKOUT_STROKE, x1: 8, y1: 20, x2: 16, y2: 20 }),
    ].join("")
  ),
  "hose-reel": make("F002", "fire", () =>
    [
      plate("fire"),
      circle({ class: KNOCKOUT_STROKE, cx: 11, cy: 12, r: 7 }),
      circle({ class: KNOCKOUT_STROKE, cx: 11, cy: 12, r: 3.5 }),
      path({ class: KNOCKOUT_STROKE, d: "M 14.5 12 H 19 C 21 12 21 16 19 18 L 17 20" }),
    ].join("")
  ),
  "fire-ladder": make("F003", "fire", () =>
    [
      plate("fire"),
      path({ class: KNOCKOUT_STROKE, d: "M 7 3 L 7 21 M 17 3 L 17 21 M 7 6 H 17 M 7 10 H 17 M 7 14 H 17 M 7 18 H 17" }),
    ].join("")
  ),
  "fire-equipment": make("F004", "fire", () =>
    [
      plate("fire"),
      flame(),
      circle({ class: DARK_STROKE, cx: 18, cy: 17, r: 3 }),
      path({ class: DARK_STROKE, d: "M 18 14 V 20 M 15 17 H 21" }),
    ].join("")
  ),
  "call-point": make("F005", "fire", () =>
    [
      plate("fire"),
      rect({ class: KNOCKOUT_STROKE, x: 5, y: 4, width: 14, height: 16, rx: 1 }),
      circle({ class: KNOCKOUT_STROKE, cx: 12, cy: 10, r: 3.2 }),
      path({ class: KNOCKOUT_STROKE, d: "M 8 17 H 16" }),
    ].join("")
  ),
  "fire-phone": make("F006", "fire", () => plate("fire") + handset()),
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
  "no-elevator": make("NFPA 170 Ch.11", "fire", () =>
    [
      plate("fire"),
      rect({ class: KNOCKOUT_STROKE, x: 6, y: 4, width: 12, height: 16 }),
      circle({ class: KNOCKOUT, cx: 10, cy: 9, r: 1.3 }),
      circle({ class: KNOCKOUT, cx: 14, cy: 9, r: 1.3 }),
      path({ class: KNOCKOUT_STROKE, d: "M 10 11 V 16 M 14 11 V 16 M 4 4 L 20 20" }),
    ].join("")
  ),
  "alarm-sounder": make("NFPA 170 Ch.11", "fire", () =>
    [
      plate("fire"),
      path({ class: KNOCKOUT_STROKE, d: "M 8 16 H 16 L 14 13 V 8 C 14 5 10 5 10 8 V 13 Z M 10 19 H 14" }),
      path({ class: KNOCKOUT_STROKE, d: "M 5 8 C 3 10 3 14 5 16 M 19 8 C 21 10 21 14 19 16" }),
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
  return make(code, "safe", () => exitDirectionGlyph(dir, profile === "nfpa"));
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
