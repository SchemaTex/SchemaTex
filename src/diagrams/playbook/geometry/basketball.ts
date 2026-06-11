/**
 * Basketball geometry — NBA half-court, sets, landmarks, court markings.
 *
 * Coordinate model: feet. x lateral from center (0; ±25 = sidelines); y from
 * the baseline (0, under the hoop) up to 47 (half-court line). Basket at
 * (0, 5.25). Rendered un-flipped: baseline + hoop at the top, half-court line
 * at the bottom — the universal coaching view. Spec: 49 §7 (basketball).
 *
 * Geometry per NBA Rule No. 1: lane 16 ft wide × 15 ft (FT line), FT circle
 * r=6 @ (0,15), 3-pt arc r=23.75 from the rim with straight corners at x=±22,
 * restricted-area arc r=4, center circle r=6 @ (0,47).
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
  scale: 11,
  width: 50, // x ∈ [-25, 25]
  half: 47,
  rimY: 5.25,
  laneHalf: 8, // NBA lane half-width
  ftY: 15,
  ftR: 6,
  threeR: 23.75,
  cornerX: 22,
  cornerMeetY: 14.2,
  restrictedR: 4,
  centerR: 6,
  margin: 2.5,
};

const r2 = (n: number): number => Math.round(n * 100) / 100;

// ─── Landmarks (NBA half-court, feet) ────────────────────────────

const LANDMARKS: Record<string, { x: number; y: number }> = {
  top: { x: 0, y: 28 },
  rslot: { x: 8, y: 26 }, lslot: { x: -8, y: 26 }, slot: { x: 8, y: 26 },
  rwing: { x: 19, y: 17 }, lwing: { x: -19, y: 17 }, wing: { x: 19, y: 17 },
  rcorner: { x: 22, y: 3 }, lcorner: { x: -22, y: 3 }, corner: { x: 22, y: 3 },
  "rshort-corner": { x: 12, y: 2 }, "lshort-corner": { x: -12, y: 2 },
  relbow: { x: 8, y: 15 }, lelbow: { x: -8, y: 15 }, elbow: { x: 8, y: 15 },
  rblock: { x: 8, y: 7 }, lblock: { x: -8, y: 7 }, block: { x: 8, y: 7 },
  rdunker: { x: 9, y: 4 }, ldunker: { x: -9, y: 4 },
  "high-post": { x: 0, y: 15 }, ft: { x: 0, y: 15 }, "free-throw": { x: 0, y: 15 },
  "rlow-post": { x: 9, y: 8 }, "llow-post": { x: -9, y: 8 },
  rim: { x: 0, y: 5.25 }, basket: { x: 0, y: 5.25 }, hoop: { x: 0, y: 5.25 }, paint: { x: 0, y: 10 },
};

// ─── Sets (offensive alignments) ─────────────────────────────────

interface Slot { id: string; label: string; x: number; y: number }

function setRoster(formation: Formation | undefined): Slot[] {
  const L = LANDMARKS;
  const at = (lm: string): { x: number; y: number } => L[lm]!;
  const slots = (pts: Array<{ x: number; y: number }>): Slot[] =>
    pts.map((p, i) => ({ id: String(i + 1), label: String(i + 1), x: p.x, y: p.y }));

  switch (formation) {
    case "horns": return slots([at("top"), at("lcorner"), at("rcorner"), at("lelbow"), at("relbow")]);
    case "1-4-high": return slots([at("top"), at("lwing"), at("rwing"), at("lelbow"), at("relbow")]);
    case "1-4-low": return slots([at("top"), at("lcorner"), at("rcorner"), at("lblock"), at("rblock")]);
    case "box": return slots([at("top"), at("lelbow"), at("relbow"), at("lblock"), at("rblock")]);
    case "spread-pnr": return slots([at("top"), at("lcorner"), at("rcorner"), at("lwing"), { x: 8, y: 24 }]);
    case "4-out": return slots([at("top"), at("lwing"), at("rwing"), at("lcorner"), at("rblock")]);
    case "5-out": default: return slots([at("top"), at("lwing"), at("rwing"), at("lcorner"), at("rcorner")]);
  }
}

function defenseRoster(scheme: DefenseScheme, offense: PlayerGeom[]): { defenders: Slot[]; zones: ZoneGeom[] } {
  const zones: ZoneGeom[] = [];
  if (scheme === "man") {
    // X matched up one step toward the basket from each offensive player
    const defenders = offense.filter((p) => p.side === "offense").slice(0, 5).map((o) => {
      const dx = -o.x * 0.12;
      const dy = (K.rimY - o.y) * 0.18;
      return { id: "X" + o.id, label: "X" + o.label, x: o.x + dx, y: o.y + dy };
    });
    return { defenders, zones };
  }
  // zone fronts (defender spots)
  let pts: Array<{ x: number; y: number }>;
  if (scheme === "zone-3-2") pts = [{ x: 0, y: 20 }, { x: -13, y: 17 }, { x: 13, y: 17 }, { x: -8, y: 8 }, { x: 8, y: 8 }];
  else if (scheme === "zone-1-3-1") pts = [{ x: 0, y: 22 }, { x: -12, y: 14 }, { x: 0, y: 13 }, { x: 12, y: 14 }, { x: 0, y: 5.5 }];
  else pts = [{ x: -7, y: 18 }, { x: 7, y: 18 }, { x: 0, y: 9 }, { x: -13, y: 6 }, { x: 13, y: 6 }]; // zone-2-3
  const defenders = pts.map((p, i) => ({ id: "X" + (i + 1), label: "X", x: p.x, y: p.y }));
  return { defenders, zones };
}

// ─── SportModule ─────────────────────────────────────────────────

export const basketballModule: SportModule = {
  scale: K.scale,
  yUp: false,

  buildPlayers(ast: PlaybookAst): PlayerGeom[] {
    const players: PlayerGeom[] = [];
    const byId = new Map<string, number>();
    const add = (p: PlayerGeom): void => {
      if (byId.has(p.id)) players[byId.get(p.id)!] = p;
      else { byId.set(p.id, players.length); players.push(p); }
    };
    for (const sl of setRoster(ast.formation)) add({ id: sl.id, side: "offense", pos: "o", label: sl.label, x: sl.x, y: sl.y });
    if (ast.defense) for (const d of defenseRoster(ast.defense, players).defenders) add({ id: d.id, side: "defense", pos: "x", label: d.label, x: d.x, y: d.y });
    for (const p of ast.players) {
      const at = p.at ?? (byId.has(p.id) ? { x: players[byId.get(p.id)!]!.x, y: players[byId.get(p.id)!]!.y } : { x: 0, y: 0 });
      add({ id: p.id, side: p.side, pos: p.pos === "c" || p.pos === "ol" ? "o" : p.pos, label: p.label, x: at.x, y: at.y });
    }
    return players;
  },

  buildZones(ast: PlaybookAst): ZoneGeom[] {
    return ast.zones.map((z) => ({ x: z.x, y: z.y, rx: z.rx, ry: z.ry, label: z.label }));
  },

  resolveLandmark(name: string): { x: number; y: number } | null {
    return LANDMARKS[name.toLowerCase()] ?? null;
  },

  bounds(_ast: PlaybookAst, players: PlayerGeom[], moves, zones): Bounds {
    // show the half-court width; crop the depth to the content (the court rect
    // is drawn full-length and clipped) so there's no dead space past the play
    let minX = -25, maxX = 25, minY = 0, maxY = 30;
    const ext = (x: number, y: number): void => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
    for (const p of players) ext(p.x, p.y);
    for (const mv of moves) for (const pt of mv.points) ext(pt.x, pt.y);
    for (const z of zones) { ext(z.x - z.rx, z.y - z.ry); ext(z.x + z.rx, z.y + z.ry); }
    const m = K.margin;
    return { minX: Math.min(-25, minX) - m * 0.4, maxX: Math.max(25, maxX) + m * 0.4, minY: Math.min(0, minY) - m * 0.4, maxY: Math.min(K.half, maxY + m * 0.6) };
  },

  drawField(_lay: PlaybookLayoutResult, ctx: RenderCtx, t: PbTheme): string {
    const parts: string[] = [];
    const X = ctx.X, Y = ctx.Y, px = ctx.px;
    // paint / lane
    parts.push(rect({ class: "sx-pb-court-line", fill: "none", x: r2(X(-K.laneHalf)), y: r2(Y(0)), width: r2(px(2 * K.laneHalf)), height: r2(px(K.ftY)) }));
    // free-throw circle
    parts.push(circle({ class: "sx-pb-court-line", fill: "none", cx: r2(X(0)), cy: r2(Y(K.ftY)), r: r2(px(K.ftR)) }));
    // backboard + rim
    parts.push(line({ class: "sx-pb-court-line", x1: r2(X(-3)), y1: r2(Y(4)), x2: r2(X(3)), y2: r2(Y(4)) }));
    parts.push(circle({ class: "sx-pb-rim", fill: "none", cx: r2(X(0)), cy: r2(Y(K.rimY)), r: r2(px(0.75)) }));
    // restricted-area arc (bulges toward court, +y)
    parts.push(path({ class: "sx-pb-court-line", fill: "none", d: `M ${r2(X(-K.restrictedR))} ${r2(Y(K.rimY))} A ${r2(px(K.restrictedR))} ${r2(px(K.restrictedR))} 0 0 0 ${r2(X(K.restrictedR))} ${r2(Y(K.rimY))}` }));
    // 3-point line: corners + arc
    parts.push(path({
      class: "sx-pb-court-line", fill: "none",
      d: `M ${r2(X(-K.cornerX))} ${r2(Y(0))} L ${r2(X(-K.cornerX))} ${r2(Y(K.cornerMeetY))} ` +
         `A ${r2(px(K.threeR))} ${r2(px(K.threeR))} 0 0 0 ${r2(X(K.cornerX))} ${r2(Y(K.cornerMeetY))} L ${r2(X(K.cornerX))} ${r2(Y(0))}`,
    }));
    // center circle (upper half visible)
    parts.push(path({ class: "sx-pb-court-line", fill: "none", d: `M ${r2(X(-K.centerR))} ${r2(Y(K.half))} A ${r2(px(K.centerR))} ${r2(px(K.centerR))} 0 0 1 ${r2(X(K.centerR))} ${r2(Y(K.half))}` }));
    void t;
    return group({ class: "sx-pb-field-g" }, parts);
  },

  legend(): LegendItem[] {
    return [
      { kind: "offense", label: "Offense (1–5)" },
      { kind: "defense", label: "Defense (X)" },
      { kind: "run", label: "Cut" },
      { kind: "pass", label: "Pass" },
      { kind: "dribble", label: "Dribble" },
      { kind: "screen", label: "Screen" },
    ];
  },
};

export const BASKETBALL_K = K;
