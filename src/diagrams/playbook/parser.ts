/**
 * Sports playbook — DSL parser (text → AST), multi-sport.
 *
 * Spec: docs/reference/49-SPORTS-PLAYBOOK-STANDARD.md §3.
 *
 * Syntax problems (unknown keyword / route / formation / scheme) throw
 * `PlaybookParseError`. Semantic problems (a move off a missing player) are
 * collected by the layout pass.
 */

import type {
  BreakDir,
  DefenseScheme,
  Formation,
  MoveKind,
  NamedRoute,
  PlaybookAst,
  PlaybookMove,
  PlaybookPlayer,
  PlaybookSport,
  PlaybookZone,
  PlayerSymbol,
  MovePoint,
} from "./types";

export class PlaybookParseError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(`line ${line}: ${message}`);
    this.name = "PlaybookParseError";
    this.line = line;
  }
}

// ─── Tokenizer ───────────────────────────────────────────────────

type Tok = { word: string } | { str: string };
const isStr = (t: Tok | undefined): t is { str: string } => t !== undefined && "str" in t;
const isWord = (t: Tok | undefined, w?: string): t is { word: string } =>
  t !== undefined && "word" in t && (w === undefined || t.word.toLowerCase() === w);
const tokDisplay = (t: Tok): string => ("word" in t ? t.word : `"${t.str}"`);

const normalizeQuotes = (s: string): string => s.replace(/[“”「」『』]/g, '"').replace(/[‘’]/g, "'");

function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1] !== undefined) out.push({ str: m[1] });
    else out.push({ word: m[2]! });
  }
  return out;
}

// ─── Value parsers ───────────────────────────────────────────────

function parseNum(t: Tok | undefined, what: string, ln: number): number {
  if (!isWord(t)) throw new PlaybookParseError(`expected a number for ${what}`, ln);
  const v = Number(t.word);
  if (!Number.isFinite(v)) throw new PlaybookParseError(`expected a number for ${what}, got "${t.word}"`, ln);
  return v;
}

function parseId(t: Tok | undefined, what: string, ln: number): string {
  if (!isWord(t)) throw new PlaybookParseError(`expected ${what}`, ln);
  return t.word;
}

const COORD = /^([+-]?\d*\.?\d+),([+-]?\d*\.?\d+)$/;

// ─── Vocabulary ──────────────────────────────────────────────────

const POSITIONS: readonly PlayerSymbol[] = ["o", "c", "ol", "qb", "rb", "wr", "te", "x", "dl", "lb", "db", "s", "gk"];

const NAMED_ROUTES: readonly NamedRoute[] = [
  "go", "fly", "streak", "vertical", "slant", "flat", "hitch", "out", "in", "dig",
  "curl", "comeback", "corner", "flag", "post", "wheel", "cross", "drag", "seam", "screen",
  "dive", "iso", "power", "counter", "sweep", "toss", "draw", "trap",
];
const RUN_CONCEPTS = new Set<NamedRoute>(["dive", "iso", "power", "counter", "sweep", "toss", "draw", "trap"]);

const FORMATIONS: readonly Formation[] = [
  "i-form", "shotgun", "singleback", "pistol", "trips", "spread", "trips-right", "trips-left",
  "empty", "goal-line", "wishbone",
  "4-4-2", "4-3-3", "4-2-3-1", "3-5-2", "4-4-1-1", "4-5-1", "3-4-3",
  "horns", "1-4-high", "1-4-low", "box", "spread-pnr", "5-out", "4-out",
];
const DEFENSES: readonly DefenseScheme[] = [
  "4-3", "3-4", "4-4", "nickel", "dime",
  "cover-0", "cover-1", "cover-2", "cover-3", "cover-4", "cover-6",
  "man", "zone-2-3", "zone-3-2", "zone-1-3-1",
  "low-block", "mid-block", "high-press",
];
const DIRS: readonly BreakDir[] = ["left", "right"];

// ─── Statement parsers ───────────────────────────────────────────

function parseHeader(tok: Tok[], ast: PlaybookAst, ln: number): void {
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) ast.title = t.str;
    else if (isWord(t, "sport")) {
      const s = parseId(tok.shift(), "sport", ln).toLowerCase();
      if (s !== "football" && s !== "basketball" && s !== "soccer") {
        throw new PlaybookParseError(`sport must be football|basketball|soccer, got "${s}"`, ln);
      }
      ast.sport = s as PlaybookSport;
    } else throw new PlaybookParseError(`playbook: unexpected token "${tokDisplay(t)}"`, ln);
  }
}

function parseField(tok: Tok[], ast: PlaybookAst, ln: number): void {
  while (tok.length) {
    const t = tok.shift()!;
    if (isWord(t, "down")) ast.down = parseNum(tok.shift(), "down", ln);
    else if (isWord(t, "distance") || isWord(t, "togo")) ast.distance = parseNum(tok.shift(), "distance", ln);
    else if (isWord(t, "los") || isWord(t, "ball")) ast.losYard = parseNum(tok.shift(), "los", ln);
    else if (isWord(t, "goal") || isWord(t, "togoal")) ast.toGoal = parseNum(tok.shift(), "goal", ln);
    else if (isWord(t, "view")) {
      const v = parseId(tok.shift(), "view (full|half)", ln).toLowerCase();
      if (v !== "full" && v !== "half" && v !== "auto") throw new PlaybookParseError(`view must be full|half`, ln);
      ast.view = v as "full" | "half" | "auto";
    } else if (isWord(t, "hash")) {
      const h = parseId(tok.shift(), "hash (nfl|college|none)", ln).toLowerCase();
      if (h !== "nfl" && h !== "college" && h !== "none") throw new PlaybookParseError(`hash must be nfl|college|none`, ln);
      ast.hash = h;
    } else throw new PlaybookParseError(`field: unexpected token "${tokDisplay(t)}"`, ln);
  }
}

function parseFormation(tok: Tok[], ast: PlaybookAst, ln: number): void {
  let name = parseId(tok.shift(), "a formation", ln).toLowerCase();
  let side: BreakDir | undefined;
  const hy = /^(.*)-(left|right)$/.exec(name);
  if (hy && (FORMATIONS as readonly string[]).includes(hy[1]!) && hy[1] !== "trips") {
    name = hy[1]!;
    side = hy[2] as BreakDir;
  }
  if (!(FORMATIONS as readonly string[]).includes(name)) {
    throw new PlaybookParseError(`unknown formation "${name}"`, ln);
  }
  ast.formation = name as Formation;
  while (tok.length) {
    const t = tok.shift()!;
    if (isWord(t, "left") || isWord(t, "right")) side = (t as { word: string }).word.toLowerCase() as BreakDir;
    else throw new PlaybookParseError(`formation: unexpected token "${tokDisplay(t)}"`, ln);
  }
  if (name === "trips-right") ast.formationSide = "right";
  else if (name === "trips-left") ast.formationSide = "left";
  else if (side) ast.formationSide = side;
}

function parseDefense(tok: Tok[], ast: PlaybookAst, ln: number): void {
  const d = parseId(tok.shift(), "a defensive scheme", ln).toLowerCase();
  if (!(DEFENSES as readonly string[]).includes(d)) throw new PlaybookParseError(`unknown defense "${d}"`, ln);
  ast.defense = d as DefenseScheme;
}

function parsePlayer(tok: Tok[], ast: PlaybookAst, ln: number): void {
  const id = parseId(tok.shift(), "a player id", ln);
  const posRaw = parseId(tok.shift(), "a position", ln).toLowerCase();
  if (!(POSITIONS as readonly string[]).includes(posRaw)) throw new PlaybookParseError(`unknown position "${posRaw}"`, ln);
  const isDef = posRaw === "x" || posRaw === "dl" || posRaw === "lb" || posRaw === "db" || posRaw === "s";
  const p: PlaybookPlayer = { id, side: isDef ? "defense" : "offense", pos: posRaw as PlayerSymbol, label: id, line: ln };
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) p.label = t.str;
    else if (isWord(t, "label")) { const lt = tok.shift(); p.label = isStr(lt) ? lt.str : parseId(lt, "a label", ln); }
    else if (isWord(t, "at")) {
      const c = COORD.exec(parseId(tok.shift(), "x,y", ln));
      if (!c) throw new PlaybookParseError(`expected "x,y" after at`, ln);
      p.at = { x: Number(c[1]), y: Number(c[2]) };
    } else if (isWord(t, "side")) {
      const sv = parseId(tok.shift(), "side", ln).toLowerCase();
      if (sv !== "offense" && sv !== "defense") throw new PlaybookParseError(`side must be offense|defense`, ln);
      p.side = sv as "offense" | "defense";
    } else throw new PlaybookParseError(`player: unexpected token "${tokDisplay(t)}"`, ln);
  }
  ast.players.push(p);
}

function splitNameDir(token: string): { name: string; dir?: BreakDir } {
  const m = /^(.*)-(left|right)$/.exec(token.toLowerCase());
  if (m) return { name: m[1]!, dir: m[2] as BreakDir };
  return { name: token.toLowerCase() };
}

/** Remaining tokens → polyline points (coords / landmark refs). Skips "to"/"then". */
function parseDests(tok: Tok[]): MovePoint[] {
  const pts: MovePoint[] = [];
  while (tok.length) {
    const t = tok.shift()!;
    if (isWord(t, "to") || isWord(t, "then") || isWord(t, "->")) continue;
    if (!isWord(t)) continue;
    const c = COORD.exec(t.word);
    if (c) {
      const rel = /^[+]/.test(c[1]!) || /^[+]/.test(c[2]!);
      pts.push({ x: Number(c[1]), y: Number(c[2]), rel });
    } else {
      pts.push({ ref: t.word });
    }
  }
  return pts;
}

/** route / run — football named tree OR explicit dest polyline. */
function parseRouteRun(kind: "route" | "run", tok: Tok[], ast: PlaybookAst, ln: number): void {
  const player = parseId(tok.shift(), "a player id", ln);
  const m: PlaybookMove = { player, kind, line: ln };
  const first = tok[0];
  if (isWord(first, "to") || isWord(first, "path")) {
    tok.shift();
    m.points = parseDests(tok);
    ast.moves.push(m);
    return;
  }
  if (isWord(first)) {
    const { name, dir } = splitNameDir(first.word);
    if ((NAMED_ROUTES as readonly string[]).includes(name)) {
      tok.shift();
      m.named = name as NamedRoute;
      if (dir) m.dir = dir;
      if (kind === "route" && RUN_CONCEPTS.has(name as NamedRoute)) m.kind = "run";
      while (tok.length) {
        const t = tok.shift()!;
        if (isWord(t) && (DIRS as readonly string[]).includes(t.word.toLowerCase())) m.dir = t.word.toLowerCase() as BreakDir;
        else if (isWord(t) && Number.isFinite(Number(t.word))) m.depth = Number(t.word);
        else if (isWord(t, "depth")) m.depth = parseNum(tok.shift(), "depth", ln);
        else throw new PlaybookParseError(`${kind}: unexpected token "${tokDisplay(t)}"`, ln);
      }
      ast.moves.push(m);
      return;
    }
  }
  // explicit destinations
  m.points = parseDests(tok);
  if (m.points.length === 0) throw new PlaybookParseError(`${kind} ${player}: needs a route name or destination`, ln);
  ast.moves.push(m);
}

/** Generic polyline move (cut / move / dribble). */
function parsePoly(kind: MoveKind, tok: Tok[], ast: PlaybookAst, ln: number): void {
  const player = parseId(tok.shift(), "a player id", ln);
  const points = parseDests(tok);
  if (points.length === 0) throw new PlaybookParseError(`${kind} ${player}: needs a destination (x,y or a landmark)`, ln);
  ast.moves.push({ player, kind, points, line: ln });
}

/** Single-target move (pass / screen / block / shot / handoff). */
function parseTargeted(kind: MoveKind, tok: Tok[], ast: PlaybookAst, ln: number, optionalTarget = false): void {
  const player = parseId(tok.shift(), "a player id", ln);
  const nxt = tok[0];
  if (isWord(nxt, "to")) tok.shift();
  const tgt = tok.shift();
  if (!tgt) {
    if (optionalTarget) { ast.moves.push({ player, kind, line: ln }); return; }
    throw new PlaybookParseError(`${kind} ${player}: needs a target (player id, landmark, or x,y)`, ln);
  }
  const target = isWord(tgt) ? tgt.word : tgt.str;
  ast.moves.push({ player, kind, target, line: ln });
}

function parsePull(tok: Tok[], ast: PlaybookAst, ln: number): void {
  const player = parseId(tok.shift(), "a lineman id", ln);
  const dt = tok.shift();
  const { dir } = splitNameDir(isWord(dt) ? dt.word : "");
  let d = dir;
  if (!d && isWord(dt) && (DIRS as readonly string[]).includes(dt.word.toLowerCase())) d = dt.word.toLowerCase() as BreakDir;
  if (!d) throw new PlaybookParseError(`pull: expected left|right`, ln);
  ast.moves.push({ player, kind: "pull", named: "power", dir: d, line: ln });
}

function parseMotion(tok: Tok[], ast: PlaybookAst, ln: number): void {
  const player = parseId(tok.shift(), "a player id", ln);
  const m: PlaybookMove = { player, kind: "motion", line: ln };
  const dt = tok.shift();
  if (isWord(dt) && (DIRS as readonly string[]).includes(dt.word.toLowerCase())) {
    m.dir = dt.word.toLowerCase() as BreakDir;
    const n = tok.shift();
    if (isWord(n) && Number.isFinite(Number(n.word))) m.depth = Number(n.word);
  } else if (isWord(dt, "to")) {
    m.points = parseDests(tok);
  } else if (isWord(dt)) {
    const c = COORD.exec(dt.word);
    if (c) m.points = [{ x: Number(c[1]), y: Number(c[2]), rel: /^[+]/.test(c[1]!) }];
    else m.points = [{ ref: dt.word }];
  } else throw new PlaybookParseError(`motion: expected left|right or a destination`, ln);
  ast.moves.push(m);
}

function parseZone(tok: Tok[], ast: PlaybookAst, ln: number): void {
  const z: PlaybookZone = { x: 0, y: 0, rx: 6, ry: 5, line: ln };
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) z.label = t.str;
    else if (isWord(t, "at")) {
      const c = COORD.exec(parseId(tok.shift(), "x,y", ln));
      if (!c) throw new PlaybookParseError(`zone: expected "x,y" after at`, ln);
      z.x = Number(c[1]); z.y = Number(c[2]);
    } else if (isWord(t, "size")) {
      const st = tok.shift();
      const m = /^(\d*\.?\d+)x(\d*\.?\d+)$/i.exec(isWord(st) ? st.word : "");
      if (!m) throw new PlaybookParseError(`zone size expects "rxXry"`, ln);
      z.rx = Number(m[1]); z.ry = Number(m[2]);
    } else if (isWord(t, "label")) { const lt = tok.shift(); z.label = isStr(lt) ? lt.str : parseId(lt, "a label", ln); }
    else throw new PlaybookParseError(`zone: unexpected token "${tokDisplay(t)}"`, ln);
  }
  ast.zones.push(z);
}

function parseHandoff(tok: Tok[], ast: PlaybookAst, ln: number): void {
  const from = parseId(tok.shift(), "the source id", ln);
  const to = parseId(tok.shift(), "the target id", ln);
  ast.moves.push({ player: from, kind: "handoff", target: to, line: ln });
}

// ─── Entry point ─────────────────────────────────────────────────

export function parsePlaybook(text: string): PlaybookAst {
  const ast: PlaybookAst = {
    type: "playbook",
    title: "Football Play",
    sport: "football",
    down: 0,
    distance: 0,
    hash: "nfl",
    view: "auto",
    formationSide: "right",
    players: [],
    moves: [],
    zones: [],
  };

  let sawHeader = false;
  let titleSetByUser = false;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const raw = normalizeQuotes(lines[i]!).trim();
    if (!raw) continue;
    const all = tokenize(raw);
    const tok: Tok[] = [];
    for (const t of all) {
      if (isWord(t) && (t.word.startsWith("#") || t.word.startsWith("//"))) break;
      tok.push(t);
    }
    if (tok.length === 0) continue;
    const head = tok.shift();
    if (!isWord(head)) throw new PlaybookParseError(`unexpected string at line start`, ln);
    const kw = head.word.toLowerCase();
    if (kw === "playbook") {
      const before = ast.title;
      parseHeader(tok, ast, ln);
      if (ast.title !== before) titleSetByUser = true;
      sawHeader = true;
      continue;
    }
    if (!sawHeader) throw new PlaybookParseError(`the first statement must be the "playbook" header`, ln);
    if (kw === "field") parseField(tok, ast, ln);
    else if (kw === "view") {
      const v = parseId(tok.shift(), "view (full|half)", ln).toLowerCase();
      if (v !== "full" && v !== "half" && v !== "auto") throw new PlaybookParseError(`view must be full|half`, ln);
      ast.view = v as "full" | "half" | "auto";
    }
    else if (kw === "formation" || kw === "set") parseFormation(tok, ast, ln);
    else if (kw === "defense" || kw === "def") parseDefense(tok, ast, ln);
    else if (kw === "player") parsePlayer(tok, ast, ln);
    else if (kw === "route") parseRouteRun("route", tok, ast, ln);
    else if (kw === "run") parseRouteRun("run", tok, ast, ln);
    else if (kw === "cut") parsePoly("cut", tok, ast, ln);
    else if (kw === "move") parsePoly("move", tok, ast, ln);
    else if (kw === "dribble" || kw === "drive") parsePoly("dribble", tok, ast, ln);
    else if (kw === "pass") parseTargeted("pass", tok, ast, ln);
    else if (kw === "screen") parseTargeted("screen", tok, ast, ln);
    else if (kw === "block") parseTargeted("block", tok, ast, ln);
    else if (kw === "shot" || kw === "shoot") parseTargeted("shot", tok, ast, ln, true);
    else if (kw === "pull") parsePull(tok, ast, ln);
    else if (kw === "handoff") parseHandoff(tok, ast, ln);
    else if (kw === "motion") parseMotion(tok, ast, ln);
    else if (kw === "zone") parseZone(tok, ast, ln);
    else throw new PlaybookParseError(`unknown keyword "${kw}"`, ln);
  }

  // default title per sport when the user didn't name the play
  if (!titleSetByUser) {
    ast.title = ast.sport === "basketball" ? "Basketball Play" : ast.sport === "soccer" ? "Soccer Tactic" : "Football Play";
  }
  return ast;
}
