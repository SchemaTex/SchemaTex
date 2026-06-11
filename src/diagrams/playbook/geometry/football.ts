/**
 * Football geometry — formations, route tree, defense presets, field markings.
 *
 * Coordinate model: yards. x lateral from the ball (0 = center, + = offense's
 * right); y depth off the LOS (0 = LOS, + = downfield). Render flips y so
 * downfield is up. Spec: 49-SPORTS-PLAYBOOK-STANDARD §3–§6.
 */

import { group, line, rect, text as textEl } from "../../../core/svg";
import type {
  BreakDir,
  DefenseScheme,
  Formation,
  MoveEnd,
  MoveGeom,
  NamedRoute,
  PlaybookAst,
  PlaybookLayoutResult,
  PlaybookMove,
  PlayerGeom,
  PlayerSymbol,
  ZoneGeom,
} from "../types";
import type { Bounds, LegendItem, PbTheme, RenderCtx, SportModule } from "./spec";

type Pt = { x: number; y: number };

const K = {
  scale: 14,
  olSplit: 1.4,
  wrSplit: 13,
  slotSplit: 6,
  minHalfWidth: 20,
  margin: 2,
  hashNfl: 3.08,
  hashCollege: 6.67,
};

const r2 = (n: number): number => Math.round(n * 100) / 100;
const round2 = (p: Pt): Pt => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 });
const dirSign = (d: BreakDir): number => (d === "right" ? 1 : -1);

// ─── Formation rosters ───────────────────────────────────────────

interface Slot { id: string; pos: PlayerSymbol; label: string; x: number; y: number }

function offensiveLine(): Slot[] {
  return [
    { id: "LT", pos: "ol", label: "T", x: -2 * K.olSplit, y: 0 },
    { id: "LG", pos: "ol", label: "G", x: -1 * K.olSplit, y: 0 },
    { id: "C", pos: "c", label: "C", x: 0, y: 0 },
    { id: "RG", pos: "ol", label: "G", x: 1 * K.olSplit, y: 0 },
    { id: "RT", pos: "ol", label: "T", x: 2 * K.olSplit, y: 0 },
  ];
}

function tightEnd(side: BreakDir): Slot {
  const s = side === "right" ? 1 : -1;
  return { id: "Y", pos: "te", label: "Y", x: s * (2 * K.olSplit + 1.3), y: 0 };
}

function formationRoster(formation: Formation, side: BreakDir): Slot[] {
  const s = side === "right" ? 1 : -1;
  const ol = offensiveLine();
  const X: Slot = { id: "X", pos: "wr", label: "X", x: -s * K.wrSplit, y: 0 };
  const Z: Slot = { id: "Z", pos: "wr", label: "Z", x: s * K.wrSplit, y: -1 };

  switch (formation) {
    case "i-form":
      return [...ol, tightEnd(side),
        { id: "QB", pos: "qb", label: "QB", x: 0, y: -1.5 },
        { id: "FB", pos: "rb", label: "F", x: 0, y: -3.6 },
        { id: "RB", pos: "rb", label: "RB", x: 0, y: -6.2 }, X, Z];
    case "wishbone":
      return [...ol, tightEnd(side),
        { id: "QB", pos: "qb", label: "QB", x: 0, y: -1.5 },
        { id: "FB", pos: "rb", label: "F", x: 0, y: -3.4 },
        { id: "LH", pos: "rb", label: "H", x: -3.5, y: -5.2 },
        { id: "RB", pos: "rb", label: "H", x: 3.5, y: -5.2 }, X];
    case "singleback":
      return [...ol, tightEnd(side),
        { id: "QB", pos: "qb", label: "QB", x: 0, y: -1.5 },
        { id: "RB", pos: "rb", label: "RB", x: 0, y: -5 },
        X, { id: "H", pos: "wr", label: "H", x: s * K.slotSplit, y: -1 }, Z];
    case "pistol":
      return [...ol, tightEnd(side),
        { id: "QB", pos: "qb", label: "QB", x: 0, y: -4 },
        { id: "RB", pos: "rb", label: "RB", x: 0, y: -7 }, X, Z];
    case "shotgun":
      return [...ol, tightEnd(side),
        { id: "QB", pos: "qb", label: "QB", x: 0, y: -5 },
        { id: "RB", pos: "rb", label: "RB", x: s * 1.8, y: -5 }, X, Z];
    case "spread":
      return [...ol,
        { id: "QB", pos: "qb", label: "QB", x: 0, y: -5 },
        { id: "RB", pos: "rb", label: "RB", x: s * 1.8, y: -5 },
        { id: "X", pos: "wr", label: "X", x: -K.wrSplit - 1, y: 0 },
        { id: "H", pos: "wr", label: "H", x: -K.slotSplit, y: -1 },
        { id: "Y", pos: "wr", label: "Y", x: K.slotSplit, y: -1 },
        { id: "Z", pos: "wr", label: "Z", x: K.wrSplit + 1, y: 0 }];
    case "trips": case "trips-right": case "trips-left": {
      const t = formation === "trips-left" ? -1 : formation === "trips-right" ? 1 : s;
      return [...ol,
        { id: "QB", pos: "qb", label: "QB", x: 0, y: -5 },
        { id: "RB", pos: "rb", label: "RB", x: -t * 1.8, y: -5 },
        { id: "X", pos: "wr", label: "X", x: -t * (K.wrSplit + 1), y: 0 },
        { id: "Z", pos: "wr", label: "Z", x: t * (K.wrSplit + 1), y: 0 },
        { id: "H", pos: "wr", label: "H", x: t * 9, y: -1 },
        { id: "Y", pos: "wr", label: "Y", x: t * 5, y: -1 }];
    }
    case "empty":
      return [...ol,
        { id: "QB", pos: "qb", label: "QB", x: 0, y: -5 },
        { id: "X", pos: "wr", label: "X", x: -K.wrSplit - 1, y: 0 },
        { id: "H", pos: "wr", label: "H", x: -K.slotSplit - 1, y: -1 },
        { id: "Z", pos: "wr", label: "Z", x: K.wrSplit + 1, y: 0 },
        { id: "Y", pos: "wr", label: "Y", x: K.slotSplit + 1, y: -1 },
        { id: "H2", pos: "wr", label: "h", x: K.slotSplit - 2, y: -1 }];
    case "goal-line":
      return [...ol,
        { id: "Y", pos: "te", label: "Y", x: 2 * K.olSplit + 1.3, y: 0 },
        { id: "TE2", pos: "te", label: "Y", x: -(2 * K.olSplit + 1.3), y: 0 },
        { id: "QB", pos: "qb", label: "QB", x: 0, y: -1.5 },
        { id: "FB", pos: "rb", label: "F", x: 0, y: -3.4 },
        { id: "RB", pos: "rb", label: "RB", x: 0, y: -5.4 },
        { id: "Z", pos: "wr", label: "Z", x: s * 9, y: 0 }];
    default:
      return [...ol, { id: "QB", pos: "qb", label: "QB", x: 0, y: -1.5 }];
  }
}

// ─── Defense presets ─────────────────────────────────────────────

function front43(side: BreakDir): Slot[] {
  const s = side === "right" ? 1 : -1;
  return [
    { id: "DE_W", pos: "dl", label: "E", x: -3.6, y: 1 },
    { id: "DT_W", pos: "dl", label: "T", x: -1.2, y: 1 },
    { id: "DT_S", pos: "dl", label: "T", x: 1.2, y: 1 },
    { id: "DE_S", pos: "dl", label: "E", x: 3.6, y: 1 },
    { id: "WLB", pos: "lb", label: "W", x: -4.5, y: 4.3 },
    { id: "MLB", pos: "lb", label: "M", x: 0, y: 4.8 },
    { id: "SLB", pos: "lb", label: "S", x: s * 4.5, y: 4.3 },
  ];
}

function front34(side: BreakDir): Slot[] {
  const s = side === "right" ? 1 : -1;
  return [
    { id: "DE_W", pos: "dl", label: "E", x: -2.6, y: 1 },
    { id: "NT", pos: "dl", label: "N", x: 0, y: 1 },
    { id: "DE_S", pos: "dl", label: "E", x: 2.6, y: 1 },
    { id: "WOLB", pos: "lb", label: "W", x: -5.4, y: 3.6 },
    { id: "WILB", pos: "lb", label: "M", x: -1.6, y: 4.6 },
    { id: "SILB", pos: "lb", label: "M", x: 1.6, y: 4.6 },
    { id: "SOLB", pos: "lb", label: "S", x: s * 5.4, y: 3.6 },
  ];
}

function defensePreset(scheme: DefenseScheme, side: BreakDir): { defenders: Slot[]; zones: ZoneGeom[] } {
  const s = side === "right" ? 1 : -1;
  const cb = (sign: number, y: number, label = "C"): Slot => ({ id: sign < 0 ? "LCB" : "RCB", pos: "db", label, x: sign * K.wrSplit, y });

  let front: Slot[];
  let cover: DefenseScheme;
  let showZones = true;
  if (scheme === "3-4") { front = front34(side); cover = "cover-2"; showZones = false; }
  else if (scheme === "4-4") { front = [...front43(side), { id: "SS", pos: "s", label: "$", x: s * 6, y: 4.6 }]; cover = "cover-3"; }
  else if (scheme === "nickel") { front = front43(side).slice(0, 6); cover = "cover-2"; }
  else if (scheme === "dime") { front = front43(side).slice(0, 5); cover = "cover-3"; }
  else if (scheme.startsWith("cover")) { front = front43(side); cover = scheme; }
  else { front = front43(side); cover = "cover-2"; showZones = false; }

  const sec: Slot[] = [];
  const zones: ZoneGeom[] = [];
  switch (cover) {
    case "cover-0":
      sec.push(cb(-1, 5.5), cb(1, 5.5), { id: "FS", pos: "s", label: "F", x: -6, y: 5 }, { id: "SS", pos: "s", label: "$", x: s * 6, y: 5 }); break;
    case "cover-1":
      sec.push(cb(-1, 6), cb(1, 6), { id: "SS", pos: "s", label: "$", x: s * 6, y: 5 }, { id: "FS", pos: "s", label: "F", x: 0, y: 13.5 });
      zones.push({ x: 0, y: 13.5, rx: 5, ry: 3.5, label: "deep middle" }); break;
    case "cover-2":
      sec.push(cb(-1, 5), cb(1, 5), { id: "FS", pos: "s", label: "F", x: -9, y: 12.5 }, { id: "SS", pos: "s", label: "$", x: 9, y: 12.5 });
      zones.push({ x: -9, y: 12.5, rx: 9, ry: 4, label: "deep half" }, { x: 9, y: 12.5, rx: 9, ry: 4, label: "deep half" }); break;
    case "cover-3":
      sec.push(cb(-1, 11.5), cb(1, 11.5), { id: "FS", pos: "s", label: "F", x: 0, y: 14 }, { id: "SS", pos: "s", label: "$", x: s * 6, y: 5 });
      zones.push({ x: -13.5, y: 12, rx: 5.8, ry: 3.6, label: "deep ⅓" }, { x: 0, y: 14.5, rx: 5.8, ry: 3.6, label: "deep ⅓" }, { x: 13.5, y: 12, rx: 5.8, ry: 3.6, label: "deep ⅓" }); break;
    case "cover-4":
      sec.push(cb(-1, 10), cb(1, 10), { id: "FS", pos: "s", label: "F", x: -6, y: 12.5 }, { id: "SS", pos: "s", label: "$", x: 6, y: 12.5 });
      zones.push({ x: -13, y: 12, rx: 6.5, ry: 4, label: "deep ¼" }, { x: -5, y: 13, rx: 6.5, ry: 4, label: "deep ¼" }, { x: 5, y: 13, rx: 6.5, ry: 4, label: "deep ¼" }, { x: 13, y: 12, rx: 6.5, ry: 4, label: "deep ¼" }); break;
    case "cover-6":
      sec.push(cb(-1, 10), cb(1, 5), { id: "FS", pos: "s", label: "F", x: -7, y: 12.5 }, { id: "SS", pos: "s", label: "$", x: 9, y: 12.5 });
      zones.push({ x: -7, y: 12.5, rx: 7, ry: 4, label: "deep ¼" }, { x: -13, y: 12, rx: 6.5, ry: 4, label: "deep ¼" }, { x: 9, y: 12.5, rx: 9, ry: 4, label: "deep ½" }); break;
    default:
      sec.push(cb(-1, 5), cb(1, 5), { id: "FS", pos: "s", label: "F", x: -9, y: 12.5 }, { id: "SS", pos: "s", label: "$", x: 9, y: 12.5 });
  }
  return { defenders: [...front, ...sec].slice(0, 11), zones: showZones ? zones : [] };
}

// ─── Route-tree expansion ────────────────────────────────────────

function passRoute(named: NamedRoute, depth: number | undefined, outSign: number, inSign: number): Pt[] {
  const d = depth;
  switch (named) {
    case "go": case "fly": case "streak": case "vertical": return [{ x: 0, y: 0 }, { x: 0, y: d ?? 16 }];
    case "seam": return [{ x: 0, y: 0 }, { x: inSign * 0.5, y: d ?? 14 }];
    case "slant": return [{ x: 0, y: 0 }, { x: 0, y: 1.6 }, { x: inSign * 4.5, y: 6 }];
    case "flat": return [{ x: 0, y: 0 }, { x: outSign * 1.5, y: 1 }, { x: outSign * 5.5, y: 2.2 }];
    case "hitch": return [{ x: 0, y: 0 }, { x: 0, y: d ?? 5.5 }, { x: inSign * 1, y: (d ?? 5.5) - 1.2 }];
    case "out": return [{ x: 0, y: 0 }, { x: 0, y: d ?? 10 }, { x: outSign * 5.5, y: d ?? 10 }];
    case "in": case "dig": return [{ x: 0, y: 0 }, { x: 0, y: d ?? 10 }, { x: inSign * 6.5, y: d ?? 10 }];
    case "curl": return [{ x: 0, y: 0 }, { x: 0, y: d ?? 12 }, { x: inSign * 1.6, y: (d ?? 12) - 1.6 }];
    case "comeback": return [{ x: 0, y: 0 }, { x: 0, y: d ?? 14 }, { x: outSign * 2.2, y: (d ?? 14) - 2.4 }];
    case "corner": case "flag": return [{ x: 0, y: 0 }, { x: 0, y: d ?? 10 }, { x: outSign * 5.5, y: (d ?? 10) + 5 }];
    case "post": return [{ x: 0, y: 0 }, { x: 0, y: d ?? 10 }, { x: inSign * 5.5, y: (d ?? 10) + 6 }];
    case "wheel": return [{ x: 0, y: 0 }, { x: outSign * 3, y: 1 }, { x: outSign * 4, y: d ?? 11 }];
    case "cross": case "drag": return [{ x: 0, y: 0 }, { x: 0, y: 1.5 }, { x: inSign * 14, y: 3.2 }];
    case "screen": return [{ x: 0, y: 0 }, { x: 0, y: -1 }, { x: outSign * 4.5, y: -1 }];
    default: return [{ x: 0, y: 0 }, { x: 0, y: d ?? 10 }];
  }
}

function runPath(named: NamedRoute, start: Pt, dir: BreakDir): Pt[] {
  const k = dirSign(dir);
  switch (named) {
    case "dive": case "trap": return [start, { x: k * 1, y: 0.5 }, { x: k * 1.6, y: 3.2 }];
    case "iso": return [start, { x: k * 0.4, y: 0.5 }, { x: k * 0.8, y: 3.4 }];
    case "power": return [start, { x: start.x + k * 1.4, y: start.y + 1.5 }, { x: k * 2.6, y: 0.6 }, { x: k * 3.6, y: 4.2 }];
    case "counter": return [start, { x: -k * 1.6, y: start.y + 0.3 }, { x: k * 2.2, y: 0.6 }, { x: k * 3.2, y: 4.2 }];
    case "sweep": case "toss": return [start, { x: k * 5, y: start.y + 0.6 }, { x: k * 7, y: 1.2 }, { x: k * 7, y: 5 }];
    case "draw": return [start, { x: 0, y: start.y + 1.5 }, { x: k * 1, y: 3.4 }];
    default: return [start, { x: k * 1.4, y: 3.2 }];
  }
}

// ─── Player ref aliasing ─────────────────────────────────────────

const ALIAS: Record<string, string> = {
  hb: "RB", tb: "RB", halfback: "RB", tailback: "RB",
  fb: "FB", se: "X", fl: "Z", wr1: "X", wr2: "Z", wr3: "H", wr4: "Y",
};
function resolveRef(ref: string, byId: Map<string, number>): number | undefined {
  if (byId.has(ref)) return byId.get(ref);
  const lower = ref.toLowerCase();
  for (const [k, v] of byId) if (k.toLowerCase() === lower) return v;
  const a = ALIAS[lower];
  if (a && byId.has(a)) return byId.get(a);
  return undefined;
}

// ─── SportModule ─────────────────────────────────────────────────

export const footballModule: SportModule = {
  scale: K.scale,
  yUp: true,

  buildPlayers(ast: PlaybookAst): PlayerGeom[] {
    const players: PlayerGeom[] = [];
    const byId = new Map<string, number>();
    const add = (p: PlayerGeom): void => {
      if (byId.has(p.id)) players[byId.get(p.id)!] = p;
      else { byId.set(p.id, players.length); players.push(p); }
    };
    if (ast.formation) for (const sl of formationRoster(ast.formation, ast.formationSide)) add({ id: sl.id, side: "offense", pos: sl.pos, label: sl.label, x: sl.x, y: sl.y });
    if (ast.defense) for (const d of defensePreset(ast.defense, ast.formationSide).defenders) add({ id: d.id, side: "defense", pos: d.pos, label: d.label, x: d.x, y: d.y });
    for (const p of ast.players) {
      const at = p.at ?? (byId.has(p.id) ? { x: players[byId.get(p.id)!]!.x, y: players[byId.get(p.id)!]!.y } : { x: 0, y: 0 });
      add({ id: p.id, side: p.side, pos: p.pos, label: p.label, x: at.x, y: at.y });
    }
    return players;
  },

  buildZones(ast: PlaybookAst): ZoneGeom[] {
    const zones: ZoneGeom[] = [];
    if (ast.defense) zones.push(...defensePreset(ast.defense, ast.formationSide).zones);
    for (const z of ast.zones) zones.push({ x: z.x, y: z.y, rx: z.rx, ry: z.ry, label: z.label });
    return zones;
  },

  resolveNamed(m: PlaybookMove, src: Pt, players: PlayerGeom[], byId: Map<string, number>): MoveGeom | null {
    const endFor = (kind: string): MoveEnd => m.end ?? (kind === "block" ? "tee" : "arrow");
    if (m.kind === "pull") {
      const k = dirSign(m.dir ?? "right");
      const offTackle = 2 * K.olSplit + 0.8;
      const pts: Pt[] = [{ x: src.x, y: 0 }, { x: src.x, y: -1.3 }, { x: k * offTackle, y: -1.3 }, { x: k * offTackle, y: 1.6 }];
      return { player: m.player, kind: "pull", style: "solid", points: pts.map(round2), end: "arrow" };
    }
    if ((m.kind === "run" || m.kind === "route") && m.named) {
      if (m.kind === "run") {
        return { player: m.player, kind: "run", style: "solid", points: runPath(m.named, src, m.dir ?? "right").map(round2), end: "arrow" };
      }
      const outSign = m.dir ? dirSign(m.dir) : src.x >= 0 ? 1 : -1;
      const rel = passRoute(m.named, m.depth, outSign, -outSign);
      return { player: m.player, kind: "route", style: "solid", points: rel.map((p) => round2({ x: src.x + p.x, y: src.y + p.y })), end: endFor("route") };
    }
    void players; void byId;
    return null; // generic kinds handled by layout
  },

  bounds(ast: PlaybookAst, players: PlayerGeom[], moves: MoveGeom[], zones: ZoneGeom[]): Bounds {
    let minX = -K.minHalfWidth, maxX = K.minHalfWidth, minY = -7, maxY = 6;
    const ext = (x: number, y: number): void => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
    for (const p of players) ext(p.x, p.y);
    for (const mv of moves) for (const pt of mv.points) ext(pt.x, pt.y);
    for (const z of zones) { ext(z.x - z.rx, z.y - z.ry); ext(z.x + z.rx, z.y + z.ry); }
    if (ast.toGoal !== undefined) maxY = Math.max(maxY, ast.toGoal + 11);
    const m = K.margin;
    return { minX: minX - m, maxX: maxX + m, minY: minY - m, maxY: maxY + m };
  },

  drawField(lay: PlaybookLayoutResult, ctx: RenderCtx, t: PbTheme): string {
    const b = lay.bounds;
    const parts: string[] = [];
    const x1 = ctx.X(b.minX), x2 = ctx.X(b.maxX);

    // end zone + goal line + goalpost
    if (lay.toGoal !== undefined) {
      const gl = lay.toGoal; // goal line depth
      const ezTop = Math.min(gl + 10, b.maxY);
      parts.push(rect({ class: "sx-pb-endzone", x: r2(x1), y: r2(ctx.Y(ezTop)), width: r2((b.maxX - b.minX) * K.scale), height: r2((ezTop - gl) * K.scale) }));
      parts.push(line({ class: "sx-pb-goalline", x1: r2(x1), y1: r2(ctx.Y(gl)), x2: r2(x2), y2: r2(ctx.Y(gl)) }));
      // goalpost at the back of the end zone
      const gy = ctx.Y(Math.min(gl + 10, b.maxY) - 0.2);
      const cx = ctx.X(0);
      const up = ctx.px(2.2);
      const cross = ctx.px(3);
      parts.push(line({ class: "sx-pb-goalpost", x1: r2(cx), y1: r2(gy), x2: r2(cx), y2: r2(gy + ctx.px(1)) }));
      parts.push(line({ class: "sx-pb-goalpost", x1: r2(cx - cross / 2), y1: r2(gy), x2: r2(cx + cross / 2), y2: r2(gy) }));
      parts.push(line({ class: "sx-pb-goalpost", x1: r2(cx - cross / 2), y1: r2(gy), x2: r2(cx - cross / 2), y2: r2(gy - up) }));
      parts.push(line({ class: "sx-pb-goalpost", x1: r2(cx + cross / 2), y1: r2(gy), x2: r2(cx + cross / 2), y2: r2(gy - up) }));
    }

    // yard lines every 5 yds
    const startY = Math.ceil(b.minY / 5) * 5;
    for (let yd = startY; yd <= b.maxY; yd += 5) {
      if (Math.abs(yd) < 1e-6) continue;
      if (lay.toGoal !== undefined && yd > lay.toGoal + 0.01) continue; // beyond goal line = end zone
      parts.push(line({ class: "sx-pb-yard", x1: r2(x1), y1: r2(ctx.Y(yd)), x2: r2(x2), y2: r2(ctx.Y(yd)) }));
      // yard number (absolute) when toGoal is known
      if (lay.toGoal !== undefined) {
        const yardNum = lay.toGoal - yd;
        if (yardNum > 0 && yardNum % 10 === 0) {
          parts.push(textEl({ class: "sx-pb-yardnum", x: r2(x1 + 12), y: r2(ctx.Y(yd) + 4), "text-anchor": "middle" }, String(yardNum)));
          parts.push(textEl({ class: "sx-pb-yardnum", x: r2(x2 - 12), y: r2(ctx.Y(yd) + 4), "text-anchor": "middle" }, String(yardNum)));
        }
      }
    }

    // hash marks (1-yd ticks at the lateral landmarks)
    if (lay.hash !== "none") {
      const hx = lay.hash === "college" ? K.hashCollege : K.hashNfl;
      const top = lay.toGoal !== undefined ? Math.min(b.maxY, lay.toGoal) : b.maxY;
      for (let yd = Math.ceil(b.minY); yd <= top; yd += 1) {
        for (const sgn of [-1, 1]) {
          const xc = ctx.X(sgn * hx);
          parts.push(line({ class: "sx-pb-hash", x1: r2(xc - 2), y1: r2(ctx.Y(yd)), x2: r2(xc + 2), y2: r2(ctx.Y(yd)) }));
        }
      }
    }

    // line of scrimmage (the football itself is drawn by the renderer)
    parts.push(line({ class: "sx-pb-los", x1: r2(x1), y1: r2(ctx.Y(0)), x2: r2(x2), y2: r2(ctx.Y(0)) }));
    void t;
    return group({ class: "sx-pb-field-g" }, parts);
  },

  legend(lay: PlaybookLayoutResult): LegendItem[] {
    const items: LegendItem[] = [
      { kind: "offense", label: "Offense" },
      { kind: "defense", label: "Defense" },
      { kind: "run", label: "Route / run" },
      { kind: "screen", label: "Block" },
      { kind: "motion", label: "Motion" },
    ];
    if (lay.zones.length) items.push({ kind: "zone", label: "Zone" });
    return items;
  },
};

export { resolveRef as footballResolveRef };
export const FOOTBALL_K = K;
