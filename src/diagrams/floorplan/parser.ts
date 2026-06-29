/**
 * Floor plan — DSL parser (text → AST).
 *
 * Spec: docs/reference/48-FLOORPLAN-STANDARD.md §3.
 *
 * Syntax-level problems (unknown keyword, malformed numbers, unknown
 * furniture type, duplicate room id) throw `FloorplanParseError` with the
 * line number. Semantic geometry problems (room overlap, non-adjacent
 * doors, out-of-room furniture) are collected by the layout pass instead —
 * see §6 severity table.
 */

import type {
  ArrayMode,
  DoorHinge,
  DoorSwing,
  DoorType,
  WindowType,
  FloorplanArray,
  FloorplanAst,
  FloorplanExtend,
  FloorplanFurniture,
  FloorplanOpening,
  FloorplanRoom,
  FloorplanUnit,
  FurnitureType,
  OpeningKind,
  RelativeAlign,
  RelativeHow,
  WallSide,
} from "./types";
import { FURNITURE_TYPES } from "./catalog";

export class FloorplanParseError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(`line ${line}: ${message}`);
    this.name = "FloorplanParseError";
    this.line = line;
  }
}

// ─── Tokenizer ───────────────────────────────────────────────────

/** A token is either a bare word or a quoted string. */
type Tok = { word: string } | { str: string };

const isStr = (t: Tok | undefined): t is { str: string } => t !== undefined && "str" in t;
const isWord = (t: Tok | undefined, w?: string): t is { word: string } =>
  t !== undefined && "word" in t && (w === undefined || t.word === w);

/** CJK quotes accepted as ASCII quotes (house rule). */
function normalizeQuotes(line: string): string {
  return line.replace(/[“”「」『』]/g, '"').replace(/[‘’]/g, "'");
}

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
  if (!isWord(t)) throw new FloorplanParseError(`expected a number for ${what}`, ln);
  const v = Number(t.word);
  if (!Number.isFinite(v)) throw new FloorplanParseError(`expected a number for ${what}, got "${t.word}"`, ln);
  return v;
}

function parseCoord(t: Tok | undefined, what: string, ln: number): { x: number; y: number } {
  if (!isWord(t)) throw new FloorplanParseError(`expected "x,y" for ${what}`, ln);
  const m = /^(-?\d*\.?\d+),(-?\d*\.?\d+)$/.exec(t.word);
  if (!m) throw new FloorplanParseError(`expected "x,y" for ${what}, got "${t.word}"`, ln);
  return { x: Number(m[1]), y: Number(m[2]) };
}

function parseDims(t: Tok | undefined, what: string, ln: number): { w: number; h: number } {
  if (!isWord(t)) throw new FloorplanParseError(`expected "WxH" for ${what}`, ln);
  const normalized = t.word.replace("×", "x");
  const m = /^(\d*\.?\d+)x(\d*\.?\d+)$/i.exec(normalized);
  if (!m && /^(\d*\.?\d+)$/.test(normalized)) {
    const v = Number(normalized);
    return { w: v, h: v };
  }
  if (!m) throw new FloorplanParseError(`expected "WxH" for ${what}, got "${t.word}"`, ln);
  return { w: Number(m[1]), h: Number(m[2]) };
}

function parsePct(t: Tok | undefined, ln: number): number {
  if (!isWord(t)) throw new FloorplanParseError(`expected a percentage for "at"`, ln);
  const v = Number(t.word.replace(/%$/, ""));
  if (!Number.isFinite(v)) throw new FloorplanParseError(`expected a percentage for "at", got "${t.word}"`, ln);
  return v;
}

function parseId(t: Tok | undefined, what: string, ln: number): string {
  if (!isWord(t)) throw new FloorplanParseError(`expected ${what}`, ln);
  return t.word;
}

const SIDES: readonly WallSide[] = ["north", "south", "east", "west"];
const REL_HOW: readonly RelativeHow[] = ["right-of", "left-of", "above", "below"];

const FURNITURE_ALIASES: Record<string, FurnitureType> = {
  section: "sectional",
  sectional_sofa: "sectional",
  cabinet: "wall-cabinet",
  socket: "outlet",
  receptacle: "duplex-outlet",
  "power-outlet": "duplex-outlet",
  "duplex-receptacle": "duplex-outlet",
  "light-fixture": "ceiling-light",
  "ceiling-lamp": "ceiling-light",
  lamp: "light",
  "data-socket": "data-outlet",
  "ethernet-outlet": "data-outlet",
  panel: "electrical-panel",
  "breaker-panel": "electrical-panel",
  db: "distribution-board",
  "consumer-unit": "distribution-board",
};

function parseFurnitureType(t: Tok | undefined, ln: number): FurnitureType {
  const word = isWord(t) ? t.word : "";
  const canonical = FURNITURE_ALIASES[word] ?? (word as FurnitureType);
  if (!(FURNITURE_TYPES as readonly string[]).includes(canonical)) {
    throw new FloorplanParseError(
      `unknown furniture type "${word}". Valid types: ${FURNITURE_TYPES.join(", ")}`,
      ln
    );
  }
  return canonical;
}

// ─── Statement parsers ───────────────────────────────────────────

function parseHeader(tok: Tok[], ast: FloorplanAst, ln: number): void {
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) ast.title = t.str;
    else if (t.word === "unit") {
      const u = parseId(tok.shift(), "unit (m|ft)", ln);
      if (u !== "m" && u !== "ft") throw new FloorplanParseError(`unit must be "m" or "ft", got "${u}"`, ln);
      ast.unit = u as FloorplanUnit;
    } else throw new FloorplanParseError(`floorplan: unexpected token "${t.word}"`, ln);
  }
}

function parseRoom(tok: Tok[], ast: FloorplanAst, ln: number): void {
  const id = parseId(tok.shift(), "a room id", ln);
  if (ast.rooms.some((r) => r.id === id)) {
    throw new FloorplanParseError(`duplicate room id "${id}"`, ln);
  }
  const room: FloorplanRoom = { id, label: id, w: 4, h: 3, line: ln };
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) room.label = t.str;
    else if (t.word === "at") room.at = parseCoord(tok.shift(), "at", ln);
    else if ((REL_HOW as readonly string[]).includes(t.word)) {
      room.rel = {
        how: t.word as RelativeHow,
        ref: parseId(tok.shift(), `a room id after "${t.word}"`, ln),
        offset: undefined,
        align: undefined,
      };
    } else if (t.word === "offset") {
      if (!room.rel) throw new FloorplanParseError(`"offset" requires a relative placement (right-of/left-of/above/below)`, ln);
      room.rel.offset = parseNum(tok.shift(), "offset", ln);
    } else if (t.word === "align") {
      if (!room.rel) throw new FloorplanParseError(`"align" requires a relative placement (right-of/left-of/above/below)`, ln);
      const a = parseId(tok.shift(), "align (start|center|end)", ln);
      if (a !== "start" && a !== "center" && a !== "end") {
        throw new FloorplanParseError(`align must be start|center|end, got "${a}"`, ln);
      }
      room.rel.align = a as RelativeAlign;
    } else if (t.word === "size") {
      const d = parseDims(tok.shift(), "size", ln);
      room.w = d.w;
      room.h = d.h;
    } else if (t.word === "fill") room.fill = parseId(tok.shift(), "a fill color", ln);
    else if (t.word === "nolabel") room.nolabel = true;
    else throw new FloorplanParseError(`room: unexpected token "${t.word}"`, ln);
  }
  ast.rooms.push(room);
}

function parseExtend(tok: Tok[], ast: FloorplanAst, ln: number): void {
  const room = parseId(tok.shift(), "a room id", ln);
  const ext: FloorplanExtend = { room, w: 2, h: 2, line: ln };
  while (tok.length) {
    const t = tok.shift()!;
    if (!isWord(t)) throw new FloorplanParseError(`extend: unexpected string "${t.str}"`, ln);
    else if (t.word === "at") ext.at = parseCoord(tok.shift(), "at", ln);
    else if ((REL_HOW as readonly string[]).includes(t.word)) {
      ext.rel = {
        how: t.word as RelativeHow,
        ref: parseId(tok.shift(), `a room id after "${t.word}"`, ln),
        offset: undefined,
        align: undefined,
      };
    } else if (t.word === "offset") {
      if (!ext.rel) throw new FloorplanParseError(`"offset" requires a relative placement (right-of/left-of/above/below)`, ln);
      ext.rel.offset = parseNum(tok.shift(), "offset", ln);
    } else if (t.word === "align") {
      if (!ext.rel) throw new FloorplanParseError(`"align" requires a relative placement (right-of/left-of/above/below)`, ln);
      const a = parseId(tok.shift(), "align (start|center|end)", ln);
      if (a !== "start" && a !== "center" && a !== "end") {
        throw new FloorplanParseError(`align must be start|center|end, got "${a}"`, ln);
      }
      ext.rel.align = a as RelativeAlign;
    } else if (t.word === "size") {
      const d = parseDims(tok.shift(), "size", ln);
      ext.w = d.w;
      ext.h = d.h;
    } else throw new FloorplanParseError(`extend: unexpected token "${t.word}"`, ln);
  }
  ast.extensions.push(ext);
}

const DOOR_TYPES: readonly DoorType[] = ["single", "double", "sliding", "pocket", "bifold"];
const WINDOW_TYPES: readonly WindowType[] = ["fixed", "sliding", "casement", "bay"];

function parseOpening(kind: OpeningKind, tok: Tok[], ast: FloorplanAst, ln: number): void {
  const op: FloorplanOpening = {
    kind,
    pct: 50,
    width: 0, // resolved after the form is known
    hinge: "left",
    swing: "in",
    doorType: "single",
    windowType: "fixed",
    line: ln,
  };
  const t0 = tok.shift();
  if (isWord(t0, "between")) {
    op.between = [parseId(tok.shift(), "a room id", ln), parseId(tok.shift(), "a second room id", ln)];
  } else {
    op.room = parseId(t0, `a room id or "between"`, ln);
    const side = parseId(tok.shift(), "a wall side", ln);
    if (!(SIDES as readonly string[]).includes(side)) {
      throw new FloorplanParseError(`expected a wall side north|south|east|west, got "${side}"`, ln);
    }
    op.side = side as WallSide;
  }
  while (tok.length) {
    const t = tok.shift()!;
    if (!isWord(t)) throw new FloorplanParseError(`${kind}: unexpected string "${t.str}"`, ln);
    else if (t.word === "at") op.pct = parsePct(tok.shift(), ln);
    else if (t.word === "width") op.width = parseNum(tok.shift(), "width", ln);
    else if (t.word === "hinge") {
      const h = parseId(tok.shift(), "hinge (left|right)", ln);
      if (h !== "left" && h !== "right") throw new FloorplanParseError(`hinge must be left|right, got "${h}"`, ln);
      op.hinge = h as DoorHinge;
    } else if (t.word === "swing") {
      const s = parseId(tok.shift(), "swing (in|out)", ln);
      if (s !== "in" && s !== "out") throw new FloorplanParseError(`swing must be in|out, got "${s}"`, ln);
      op.swing = s as DoorSwing;
    } else if (t.word === "type") {
      const d = parseId(tok.shift(), `${kind} type`, ln);
      if (kind === "window") {
        if (!(WINDOW_TYPES as readonly string[]).includes(d)) {
          throw new FloorplanParseError(`window type must be ${WINDOW_TYPES.join("|")}, got "${d}"`, ln);
        }
        op.windowType = d as WindowType;
      } else {
        if (!(DOOR_TYPES as readonly string[]).includes(d)) {
          throw new FloorplanParseError(`door type must be ${DOOR_TYPES.join("|")}, got "${d}"`, ln);
        }
        op.doorType = d as DoorType;
      }
    } else throw new FloorplanParseError(`${kind}: unexpected token "${t.word}"`, ln);
  }
  if (op.width === 0) {
    // §5 defaults: door 0.9 m exterior (wall-side form) / 0.8 m interior (between form); window 1.2 m.
    op.width = kind === "window" ? 1.2 : kind === "opening" ? 1.0 : op.between ? 0.8 : 0.9;
  }
  ast.openings.push(op);
}

function parseFurniture(tok: Tok[], ast: FloorplanAst, ln: number): void {
  const type = parseFurnitureType(tok.shift(), ln);
  const f: FloorplanFurniture = { type, x: 0, y: 0, rotate: 0, line: ln };
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) f.label = t.str;
    else if (t.word === "in") f.room = parseId(tok.shift(), `a room id after "in"`, ln);
    else if (t.word === "at") {
      const c = parseCoord(tok.shift(), "at", ln);
      f.x = c.x;
      f.y = c.y;
    } else if (t.word === "size") f.size = parseDims(tok.shift(), "size", ln);
    else if (t.word === "rotate") f.rotate = parseNum(tok.shift(), "rotate", ln);
    else if (t.word === "seats") {
      // `seats "Alice" "Bob" …` — consume consecutive quoted names. An empty
      // string ("") leaves that seat blank (skip a guest without shifting).
      const names: string[] = [];
      while (isStr(tok[0])) names.push((tok.shift() as { str: string }).str);
      if (names.length === 0) {
        throw new FloorplanParseError(`"seats" expects one or more quoted names`, ln);
      }
      f.seats = names;
    } else throw new FloorplanParseError(`furniture: unexpected token "${t.word}"`, ln);
  }
  ast.furniture.push(f);
}

function parseArray(mode: ArrayMode, tok: Tok[], ast: FloorplanAst, ln: number): void {
  const type = parseFurnitureType(tok.shift(), ln);
  const a: FloorplanArray = {
    mode,
    type,
    rows: 1,
    cols: 1,
    count: Infinity,
    rotate: 0,
    line: ln,
  };
  while (tok.length) {
    const t = tok.shift()!;
    if (!isWord(t)) throw new FloorplanParseError(`${mode}: unexpected string "${t.str}"`, ln);
    else if (t.word === "in") a.room = parseId(tok.shift(), `a room id after "in"`, ln);
    else if (t.word === "rows") a.rows = parseNum(tok.shift(), "rows", ln);
    else if (t.word === "cols") a.cols = parseNum(tok.shift(), "cols", ln);
    else if (t.word === "count") a.count = parseNum(tok.shift(), "count", ln);
    else if (t.word === "area") {
      a.p1 = parseCoord(tok.shift(), "area p1", ln);
      a.p2 = parseCoord(tok.shift(), "area p2", ln);
    } else if (t.word === "itemsize") a.itemsize = parseDims(tok.shift(), "itemsize", ln);
    else if (t.word === "rotate") a.rotate = parseNum(tok.shift(), "rotate", ln);
    else if (t.word === "center") a.center = parseCoord(tok.shift(), "center", ln);
    else if (t.word === "radius") a.radius = parseNum(tok.shift(), "radius", ln);
    else if (t.word === "from") a.fromDeg = parseNum(tok.shift(), "from", ln);
    else if (t.word === "to") a.toDeg = parseNum(tok.shift(), "to", ln);
    else throw new FloorplanParseError(`${mode}: unexpected token "${t.word}"`, ln);
  }
  ast.arrays.push(a);
}

// ─── Entry point ─────────────────────────────────────────────────

export function parseFloorplan(text: string): FloorplanAst {
  const ast: FloorplanAst = {
    type: "floorplan",
    title: "Floor Plan",
    unit: "m",
    rooms: [],
    extensions: [],
    openings: [],
    furniture: [],
    arrays: [],
  };

  let sawHeader = false;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const raw = normalizeQuotes(lines[i]!).trim();
    if (!raw) continue;
    const all = tokenize(raw);
    // Token-level comment stripping: a bare token starting with "#" or "//"
    // begins a comment — unless the "#…" directly follows `fill` (hex color).
    const tok: Tok[] = [];
    for (let k = 0; k < all.length; k++) {
      const t = all[k]!;
      if (isWord(t) && (t.word.startsWith("#") || t.word.startsWith("//"))) {
        const prev = all[k - 1];
        if (t.word.startsWith("#") && isWord(prev, "fill")) {
          tok.push(t);
          continue;
        }
        break;
      }
      tok.push(t);
    }
    if (tok.length === 0) continue;
    const head = tok.shift();
    if (!isWord(head)) throw new FloorplanParseError(`unexpected string at line start`, ln);
    const kw = head.word.toLowerCase();
    if (kw === "floorplan") {
      parseHeader(tok, ast, ln);
      sawHeader = true;
    } else if (!sawHeader) {
      throw new FloorplanParseError(`the first statement must be the "floorplan" header`, ln);
    } else if (kw === "room") parseRoom(tok, ast, ln);
    else if (kw === "north") {
      ast.north = tok.length ? parseNum(tok.shift(), "north rotation (degrees)", ln) : 0;
      if (tok.length) throw new FloorplanParseError(`north: unexpected trailing tokens`, ln);
    } else if (kw === "extend") parseExtend(tok, ast, ln);
    else if (kw === "door" || kw === "window" || kw === "opening") parseOpening(kw as OpeningKind, tok, ast, ln);
    else if (kw === "furniture") parseFurniture(tok, ast, ln);
    else if (kw === "grid" || kw === "row" || kw === "arc") parseArray(kw as ArrayMode, tok, ast, ln);
    else {
      throw new FloorplanParseError(
        `unknown keyword "${kw}". Expected: floorplan, room, extend, door, window, opening, furniture, grid, row, arc`,
        ln
      );
    }
  }
  return ast;
}
