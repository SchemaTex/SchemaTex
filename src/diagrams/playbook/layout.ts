/**
 * Sports playbook — layout pass (AST → absolute geometry, native units).
 *
 * Dispatches to the per-sport geometry module (football / basketball / soccer)
 * for player placement, zones, field bounds, and sport-specific named moves,
 * then resolves the generic movement kinds (pass / dribble / cut / move /
 * screen / shot / handoff + hand-authored polylines) here. The line *style* is
 * sport-dependent (basketball cut=solid pass=dashed; soccer pass=solid
 * run=dashed) — see `styleFor`. Spec: 49-SPORTS-PLAYBOOK-STANDARD §3.
 */

import type {
  LineStyle,
  MoveEnd,
  MoveGeom,
  MoveKind,
  PlaybookAst,
  PlaybookLayoutResult,
  PlaybookMove,
  PlaybookSport,
  PlayerGeom,
} from "./types";
import type { SportModule } from "./geometry/spec";
import { footballModule } from "./geometry/football";
import { basketballModule } from "./geometry/basketball";
import { soccerModule } from "./geometry/soccer";

type Pt = { x: number; y: number };

const MODULES: Record<PlaybookSport, SportModule> = {
  football: footballModule,
  basketball: basketballModule,
  soccer: soccerModule,
};

export function sportModule(sport: PlaybookSport): SportModule {
  return MODULES[sport];
}

const round2 = (p: Pt): Pt => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 });

/** (sport, kind) → line style. The pass/run mapping flips between sports. */
function styleFor(sport: PlaybookSport, kind: MoveKind): LineStyle {
  if (kind === "dribble") return "wavy";
  if (kind === "shot") return sport === "soccer" ? "double" : "solid";
  if (kind === "pass") return sport === "soccer" ? "solid" : "dashed";
  if (kind === "motion") return "dashed";
  if (sport === "soccer" && (kind === "run" || kind === "cut" || kind === "move")) return "dashed";
  return "solid"; // run/cut/move (fb,bb), route, screen, block, pull, handoff
}

function endFor(kind: MoveKind, override?: MoveEnd): MoveEnd {
  if (override) return override;
  if (kind === "screen" || kind === "block") return "tee";
  if (kind === "handoff") return "none";
  return "arrow";
}

// ─── Player-ref resolution ───────────────────────────────────────

function findPlayer(ref: string, byId: Map<string, number>): number | undefined {
  if (byId.has(ref)) return byId.get(ref);
  const lower = ref.toLowerCase();
  for (const [k, v] of byId) if (k.toLowerCase() === lower) return v;
  return undefined;
}

/** A reference token → absolute point: coord "x,y" | player id | landmark. */
function resolveRef(
  token: string,
  byId: Map<string, number>,
  players: PlayerGeom[],
  mod: SportModule
): Pt | null {
  const coord = /^(-?\d*\.?\d+),(-?\d*\.?\d+)$/.exec(token);
  if (coord) return { x: Number(coord[1]), y: Number(coord[2]) };
  const pi = findPlayer(token, byId);
  if (pi !== undefined) return { x: players[pi]!.x, y: players[pi]!.y };
  const lm = mod.resolveLandmark?.(token);
  if (lm) return { x: lm.x, y: lm.y };
  return null;
}

// ─── Layout ──────────────────────────────────────────────────────

export function layoutPlaybook(ast: PlaybookAst): PlaybookLayoutResult {
  const mod = MODULES[ast.sport];
  const errors: string[] = [];
  const warnings: string[] = [];

  const players = mod.buildPlayers(ast);
  const byId = new Map<string, number>();
  players.forEach((p, i) => byId.set(p.id, i));
  if (players.length === 0) {
    errors.push('no players — add a `formation`/set or explicit `player` statements');
  }

  const zones = mod.buildZones(ast, players);

  const moves: MoveGeom[] = [];
  for (const m of ast.moves) {
    const srcIdx = findPlayer(m.player, byId);
    if (srcIdx === undefined) {
      warnings.push(`move on unknown player "${m.player}" — skipped`);
      continue;
    }
    const src: Pt = { x: players[srcIdx]!.x, y: players[srcIdx]!.y };

    // sport-specific named moves first (football routes, runs, pulls)
    const named = mod.resolveNamed?.(m, src, players, byId, warnings);
    if (named) { moves.push(named); continue; }

    const geom = resolveGeneric(m, src, byId, players, mod, ast.sport, warnings);
    if (geom) moves.push(geom);
  }

  const bounds = mod.bounds(ast, players, moves, zones);

  return {
    title: ast.title,
    sport: ast.sport,
    down: ast.down,
    distance: ast.distance,
    losYard: ast.losYard,
    toGoal: ast.toGoal,
    hash: ast.hash,
    view: ast.view === "half" ? "half" : "full",
    players,
    moves,
    zones,
    bounds,
    errors,
    warnings,
  };
}

function resolveGeneric(
  m: PlaybookMove,
  src: Pt,
  byId: Map<string, number>,
  players: PlayerGeom[],
  mod: SportModule,
  sport: PlaybookSport,
  warnings: string[]
): MoveGeom | null {
  const style = styleFor(sport, m.kind);

  // hand-authored polyline (coords / refs)
  if (m.points && m.points.length) {
    const pts: Pt[] = [{ x: src.x, y: src.y }];
    let cur: Pt = { x: src.x, y: src.y };
    for (const p of m.points) {
      if (p.ref) {
        const r = resolveRef(p.ref, byId, players, mod);
        if (!r) { warnings.push(`${m.kind} ${m.player}: unknown destination "${p.ref}" — skipped`); return null; }
        cur = r;
      } else if (p.rel) {
        cur = { x: cur.x + (p.x ?? 0), y: cur.y + (p.y ?? 0) };
      } else {
        cur = { x: p.x ?? cur.x, y: p.y ?? cur.y };
      }
      pts.push(cur);
    }
    return { player: m.player, kind: m.kind, style, points: pts.map(round2), end: endFor(m.kind, m.end) };
  }

  // target-based (pass / screen / block / handoff / shot)
  let dest: Pt | null = null;
  if (m.target) dest = resolveRef(m.target, byId, players, mod);
  else if (m.kind === "shot") dest = mod.resolveLandmark?.("rim") ?? mod.resolveLandmark?.("goal") ?? null;
  if (!dest) {
    warnings.push(`${m.kind} ${m.player}: needs a target/destination — skipped`);
    return null;
  }

  if (m.kind === "screen" || m.kind === "block") {
    // stop just short of the target so the T-bar sits on the defender
    const dx = dest.x - src.x, dy = dest.y - src.y;
    const len = Math.hypot(dx, dy) || 1;
    const gap = sport === "football" ? 0.6 : sport === "basketball" ? 1.2 : 1.6;
    const stop = Math.max(0, len - gap);
    const end = { x: src.x + (dx / len) * stop, y: src.y + (dy / len) * stop };
    return { player: m.player, kind: m.kind, style, points: [round2(src), round2(end)], end: "tee" };
  }
  return { player: m.player, kind: m.kind, style, points: [round2(src), round2(dest)], end: endFor(m.kind, m.end) };
}
