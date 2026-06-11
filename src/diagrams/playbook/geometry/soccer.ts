/**
 * Soccer geometry — full pitch (IFAB Law 1), formations, pitch markings.
 *
 * Coordinate model: meters, 105 × 68 landscape. x along the length (0 = own
 * goal line → 105 = opponent goal line; the offense attacks toward +x); y
 * across the width (0 → 68, goals centered at y = 34). Rendered un-flipped.
 * Spec: 49 §7 (soccer). Penalty arc is clipped to the part outside the box;
 * corner arcs are 1 m quarter-circles — the two marks generic tools get wrong.
 */

import { circle, group, line, path, rect } from "../../../core/svg";
import type {
  DefenseScheme,
  Formation,
  PlaybookAst,
  PlaybookLayoutResult,
  PlayerGeom,
  ZoneGeom,
} from "../types";
import type { Bounds, LegendItem, PbTheme, RenderCtx, SportModule } from "./spec";

const K = {
  scale: 8,
  L: 105,
  W: 68,
  circleR: 9.15,
  paDepth: 16.5,
  paHalf: 20.16, // 40.32 / 2
  gaDepth: 5.5,
  gaHalf: 9.16, // 18.32 / 2
  penDist: 11,
  goalHalf: 3.66, // 7.32 / 2
  cornerR: 1,
  margin: 3,
};

const r2 = (n: number): number => Math.round(n * 100) / 100;

// ─── Formations (own team attacks toward +x) ─────────────────────

interface Slot { id: string; label: string; x: number; y: number; gk?: boolean }

function formationRoster(formation: Formation | undefined): Slot[] {
  const p = (id: string, x: number, y: number, gk = false): Slot => ({ id, label: id, x, y, gk });
  const back4 = [p("2", 20, 12), p("4", 20, 27), p("5", 20, 41), p("3", 20, 56)];
  const gk = p("1", 5, 34, true);
  switch (formation) {
    case "4-4-2":
      return [gk, ...back4, p("7", 50, 10), p("6", 50, 27), p("8", 50, 41), p("11", 50, 58), p("9", 80, 28), p("10", 80, 40)];
    case "4-2-3-1":
      return [gk, ...back4, p("6", 40, 28), p("8", 40, 40), p("7", 65, 12), p("10", 65, 34), p("11", 65, 56), p("9", 85, 34)];
    case "4-5-1":
      return [gk, ...back4, p("6", 48, 27), p("8", 48, 41), p("7", 52, 10), p("11", 52, 58), p("10", 62, 34), p("9", 85, 34)];
    case "4-4-1-1":
      return [gk, ...back4, p("7", 50, 10), p("6", 50, 27), p("8", 50, 41), p("11", 50, 58), p("10", 68, 34), p("9", 84, 34)];
    case "3-5-2":
      return [gk, p("4", 20, 20), p("5", 20, 34), p("6", 20, 48), p("2", 52, 6), p("3", 52, 62), p("8", 50, 25), p("10", 55, 43), p("7", 45, 34), p("9", 82, 28), p("11", 82, 40)];
    case "3-4-3":
      return [gk, p("4", 20, 20), p("5", 20, 34), p("6", 20, 48), p("2", 48, 8), p("8", 48, 28), p("10", 48, 40), p("3", 48, 60), p("7", 82, 14), p("9", 82, 34), p("11", 82, 54)];
    case "4-3-3":
    default:
      return [gk, ...back4, p("6", 42, 34), p("8", 52, 24), p("10", 52, 44), p("7", 82, 12), p("9", 82, 34), p("11", 82, 56)];
  }
}

/** Opponent block (X) compressed to a band by `low/mid/high` press. */
function opponentBlock(scheme: DefenseScheme): Slot[] {
  const cx = scheme === "high-press" ? 45 : scheme === "mid-block" ? 70 : 88; // low-block default
  const p = (i: number, x: number, y: number): Slot => ({ id: "X" + i, label: "X", x, y });
  return [
    p(1, cx + 12, 34),
    p(2, cx, 12), p(3, cx, 27), p(4, cx, 41), p(5, cx, 56),
    p(6, cx - 14, 14), p(7, cx - 14, 28), p(8, cx - 14, 40), p(9, cx - 14, 54),
    p(10, cx - 26, 28), p(11, cx - 26, 40),
  ];
}

const LANDMARKS: Record<string, { x: number; y: number }> = {
  center: { x: 52.5, y: 34 }, "centre-spot": { x: 52.5, y: 34 },
  box: { x: 96, y: 34 }, "top-box": { x: 88.5, y: 34 }, d: { x: 84.85, y: 34 }, "penalty-arc": { x: 84.85, y: 34 },
  "penalty-spot": { x: 94, y: 34 },
  "near-post": { x: 105, y: 30.5 }, "far-post": { x: 105, y: 37.7 }, goal: { x: 105, y: 34 },
  "rcorner": { x: 105, y: 2 }, "lcorner": { x: 105, y: 66 },
  "six-yard": { x: 101, y: 34 },
};

// ─── SportModule ─────────────────────────────────────────────────

export const soccerModule: SportModule = {
  scale: K.scale,
  yUp: false,

  buildPlayers(ast: PlaybookAst): PlayerGeom[] {
    const players: PlayerGeom[] = [];
    const byId = new Map<string, number>();
    const add = (pl: PlayerGeom): void => {
      if (byId.has(pl.id)) players[byId.get(pl.id)!] = pl;
      else { byId.set(pl.id, players.length); players.push(pl); }
    };
    for (const sl of formationRoster(ast.formation)) add({ id: sl.id, side: "offense", pos: sl.gk ? "gk" : "o", label: sl.label, x: sl.x, y: sl.y });
    if (ast.defense) for (const d of opponentBlock(ast.defense)) add({ id: d.id, side: "defense", pos: "x", label: d.label, x: d.x, y: d.y });
    for (const pl of ast.players) {
      const at = pl.at ?? (byId.has(pl.id) ? { x: players[byId.get(pl.id)!]!.x, y: players[byId.get(pl.id)!]!.y } : { x: 0, y: 0 });
      add({ id: pl.id, side: pl.side, pos: pl.pos === "c" || pl.pos === "ol" ? "o" : pl.pos, label: pl.label, x: at.x, y: at.y });
    }
    return players;
  },

  buildZones(ast: PlaybookAst): ZoneGeom[] {
    return ast.zones.map((z) => ({ x: z.x, y: z.y, rx: z.rx, ry: z.ry, label: z.label }));
  },

  resolveLandmark(name: string): { x: number; y: number } | null {
    return LANDMARKS[name.toLowerCase()] ?? null;
  },

  bounds(ast: PlaybookAst): Bounds {
    const m = K.margin;
    if (ast.view === "half") return { minX: 52.5 - m, maxX: K.L + m, minY: -m, maxY: K.W + m };
    return { minX: -m, maxX: K.L + m, minY: -m, maxY: K.W + m };
  },

  drawField(_lay: PlaybookLayoutResult, ctx: RenderCtx, t: PbTheme): string {
    const X = ctx.X, Y = ctx.Y, px = ctx.px;
    const parts: string[] = [];
    const ln = (x1: number, y1: number, x2: number, y2: number): string =>
      line({ class: "sx-pb-pitch-line", x1: r2(X(x1)), y1: r2(Y(y1)), x2: r2(X(x2)), y2: r2(Y(y2)) });
    // stripe bands (mowing) — alternating tints (surface base + boundary drawn by renderer)
    const bands = 10;
    for (let i = 0; i < bands; i++) {
      if (i % 2 === 0) continue;
      parts.push(rect({ class: "sx-pb-stripe", x: r2(X((i * K.L) / bands)), y: r2(Y(0)), width: r2(px(K.L / bands)), height: r2(px(K.W)) }));
    }
    // corner arcs (1 m quarter-circles)
    const cr = px(K.cornerR);
    const corners: Array<[number, number, number]> = [[0, 0, 0], [K.L, 0, 1], [0, K.W, 2], [K.L, K.W, 3]];
    for (const [cxF, cyF, q] of corners) {
      const cx = X(cxF), cy = Y(cyF);
      const sx = cxF === 0 ? 1 : -1;
      const sy = cyF === 0 ? 1 : -1;
      parts.push(path({ class: "sx-pb-pitch-line", fill: "none", d: `M ${r2(cx + sx * cr)} ${r2(cy)} A ${r2(cr)} ${r2(cr)} 0 0 ${q === 1 || q === 2 ? 1 : 0} ${r2(cx)} ${r2(cy + sy * cr)}` }));
    }
    // halfway line + center circle + spot
    parts.push(ln(52.5, 0, 52.5, K.W));
    parts.push(circle({ class: "sx-pb-pitch-line", fill: "none", cx: r2(X(52.5)), cy: r2(Y(34)), r: r2(px(K.circleR)) }));
    parts.push(circle({ class: "sx-pb-pitch-dot", cx: r2(X(52.5)), cy: r2(Y(34)), r: 1.6 }));
    // boxes + spots + arcs + goals, both ends
    const topY = (half: number): number => Math.min(Y(34 - half), Y(34 + half));
    for (const end of [0, 1]) {
      const gx = end === 0 ? 0 : K.L;
      const sgn = end === 0 ? 1 : -1; // into the field
      // penalty area
      parts.push(rect({ class: "sx-pb-pitch-line", fill: "none", x: r2(X(Math.min(gx, gx + sgn * K.paDepth))), y: r2(topY(K.paHalf)), width: r2(px(K.paDepth)), height: r2(px(2 * K.paHalf)) }));
      // goal area
      parts.push(rect({ class: "sx-pb-pitch-line", fill: "none", x: r2(X(Math.min(gx, gx + sgn * K.gaDepth))), y: r2(topY(K.gaHalf)), width: r2(px(K.gaDepth)), height: r2(px(2 * K.gaHalf)) }));
      // penalty spot
      const spotX = gx + sgn * K.penDist;
      parts.push(circle({ class: "sx-pb-pitch-dot", cx: r2(X(spotX)), cy: r2(Y(34)), r: 1.4 }));
      // penalty arc (outside the box)
      const edgeX = gx + sgn * K.paDepth;
      const dy = Math.sqrt(K.circleR * K.circleR - (K.paDepth - K.penDist) * (K.paDepth - K.penDist));
      const sweep = end === 0 ? 1 : 0;
      parts.push(path({ class: "sx-pb-pitch-line", fill: "none", d: `M ${r2(X(edgeX))} ${r2(Y(34 - dy))} A ${r2(px(K.circleR))} ${r2(px(K.circleR))} 0 0 ${sweep} ${r2(X(edgeX))} ${r2(Y(34 + dy))}` }));
      // goal (outside the goal line)
      const goalX = gx - sgn * 2.2;
      parts.push(rect({ class: "sx-pb-goalbox", x: r2(X(Math.min(gx, goalX))), y: r2(topY(K.goalHalf)), width: r2(px(2.2)), height: r2(px(2 * K.goalHalf)) }));
    }
    void t;
    return group({ class: "sx-pb-field-g" }, parts);
  },

  legend(): LegendItem[] {
    return [
      { kind: "offense", label: "Team" },
      { kind: "gk", label: "Keeper" },
      { kind: "defense", label: "Opponent" },
      { kind: "pass", label: "Pass" },
      { kind: "run", label: "Run" },
      { kind: "dribble", label: "Dribble" },
      { kind: "shot", label: "Shot" },
    ];
  },
};

export const SOCCER_K = K;
