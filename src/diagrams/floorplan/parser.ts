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
  CompliancePolicy,
  DoorHinge,
  DoorSwing,
  DoorType,
  EscapeRouteAst,
  EscapeRouteKind,
  EvacuationSheetOrientation,
  EvacuationSheetSize,
  FireDoorMarkAst,
  WindowType,
  FloorplanArray,
  FloorplanAst,
  FloorplanExtend,
  FloorplanFurniture,
  FloorplanOpening,
  FloorplanRoom,
  FloorplanZone,
  FloorplanUnit,
  FurnitureType,
  OpeningKind,
  RelativeAlign,
  RelativeHow,
  SafetyKind,
  SafetySymbolAst,
  StageEquipmentAst,
  StageEquipmentKind,
  StageSignalPathAst,
  StageStandType,
  WallSide,
} from "./types";
import type { LegendOverrides } from "../../core/types";
import { parseLegendDirective } from "../../core/legend-parser";
import { FURNITURE_TYPES } from "./catalog";
import { createSourceLocator, findFirstQuotedRange } from "../../core/source-range";
import { SAFETY_KINDS, STAGE_EQUIPMENT_KINDS } from "./types";

export class FloorplanParseError extends Error {
  readonly line: number;
  readonly code?: string;
  readonly hint?: string;
  constructor(message: string, line: number, code?: string, hint?: string) {
    super(`line ${line}: ${message}`);
    this.name = "FloorplanParseError";
    this.line = line;
    this.code = code;
    this.hint = hint;
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

function findAtCoordinateRange(line: string): { start: number; end: number } | undefined {
  const match = /\bat\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*,\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))/i.exec(line);
  if (!match || match.index === undefined) return undefined;
  const token = match[1]!;
  const start = match.index + match[0].indexOf(token);
  return { start, end: start + token.length };
}

function findSizeRange(line: string): { start: number; end: number } | undefined {
  const match = /\bsize\s+(\d*\.?\d+(?:\s*[x×]\s*\d*\.?\d+)?)/i.exec(line);
  if (!match || match.index === undefined) return undefined;
  const token = match[1]!;
  const start = match.index + match[0].indexOf(token);
  return { start, end: start + token.length };
}

// ─── Value parsers ───────────────────────────────────────────────

function parseNum(t: Tok | undefined, what: string, ln: number): number {
  if (!isWord(t)) throw new FloorplanParseError(`expected a number for ${what}`, ln);
  const v = Number(t.word);
  if (!Number.isFinite(v)) throw new FloorplanParseError(`expected a number for ${what}, got "${t.word}"`, ln);
  return v;
}

function parsePositiveInt(t: Tok | undefined, what: string, ln: number): number {
  const value = parseNum(t, what, ln);
  if (!Number.isInteger(value) || value <= 0) {
    throw new FloorplanParseError(`${what} must be a positive integer, got ${value}`, ln);
  }
  return value;
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
    if (v <= 0) throw new FloorplanParseError(`${what} must be greater than zero`, ln);
    return { w: v, h: v };
  }
  if (!m) throw new FloorplanParseError(`expected "WxH" for ${what}, got "${t.word}"`, ln);
  const dims = { w: Number(m[1]), h: Number(m[2]) };
  if (dims.w <= 0 || dims.h <= 0) {
    throw new FloorplanParseError(`${what} dimensions must be greater than zero`, ln);
  }
  return dims;
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
const COMPLIANCE_POLICIES: readonly CompliancePolicy[] = ["iso", "nfpa", "uae"];
const SHEET_SIZES: readonly EvacuationSheetSize[] = [
  "a4",
  "a3",
  "a2",
  "letter",
  "tabloid",
];
const SHEET_ORIENTATIONS: readonly EvacuationSheetOrientation[] = [
  "landscape",
  "portrait",
];
const ROUTE_KINDS: readonly EscapeRouteKind[] = [
  "primary",
  "secondary",
  "accessible",
  "rescue",
];
const STAGE_STANDS: readonly StageStandType[] = [
  "boom",
  "straight",
  "short-boom",
  "clip",
  "none",
];
const STAGE_KIND_ALIASES: Record<string, StageEquipmentKind> = {
  riser: "stage-riser",
  di: "di-box",
  directbox: "di-box",
  wedge: "monitor-wedge",
  monitor: "monitor-wedge",
  foh: "foh-console",
  console: "foh-console",
  "keyboard-stand": "keyboard",
  "musicstand": "music-stand",
  "setlist": "set-list",
};

export const FURNITURE_ALIASES: Record<string, FurnitureType> = {
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
  // Common everyday synonyms an LLM reaches for that map cleanly onto an
  // existing type. Keeps a valid layout from failing on a vocabulary gap.
  "console-table": "side-table",
  console: "side-table",
  "end-table": "side-table",
  couch: "sofa",
  settee: "loveseat",
  "tv-console": "tv-stand",
  "media-console": "tv-stand",
  "entertainment-center": "tv-stand",
  refrigerator: "fridge",
  cooktop: "stove",
  stovetop: "stove",
  armoire: "wardrobe",
  wc: "toilet",
  "water-closet": "toilet",
  "lounge-chair": "armchair",
  stool: "bar-stool",
  closet: "wardrobe",
  "file-cabinet": "filing-cabinet",
  oven: "stove",
};

export const FURNITURE_TYPE_NAMES: readonly string[] = [
  ...FURNITURE_TYPES,
  ...Object.keys(FURNITURE_ALIASES),
];

function parseFurnitureType(t: Tok | undefined, ln: number): FurnitureType {
  const word = isWord(t) ? t.word : "";
  const canonical = FURNITURE_ALIASES[word] ?? (word as FurnitureType);
  if (!(FURNITURE_TYPES as readonly string[]).includes(canonical)) {
    throw new FloorplanParseError(
      `unknown furniture type "${word}". Valid types: ${FURNITURE_TYPE_NAMES.join(", ")}`,
      ln
    );
  }
  return canonical;
}

function parseStageEquipmentKind(
  t: Tok | undefined,
  ln: number
): StageEquipmentKind {
  const word = isWord(t) ? t.word.toLowerCase() : "";
  const canonical =
    STAGE_KIND_ALIASES[word] ?? (word as StageEquipmentKind);
  if (!(STAGE_EQUIPMENT_KINDS as readonly string[]).includes(canonical)) {
    throw new FloorplanParseError(
      `unknown stage equipment kind "${word}". Valid kinds: ${STAGE_EQUIPMENT_KINDS.join(", ")}`,
      ln
    );
  }
  return canonical;
}

function parseYesNo(
  t: Tok | undefined,
  what: string,
  ln: number
): boolean {
  const value = parseId(t, `${what} (yes|no)`, ln).toLowerCase();
  if (["yes", "on", "true"].includes(value)) return true;
  if (["no", "off", "false"].includes(value)) return false;
  throw new FloorplanParseError(
    `${what} must be yes|no, got "${value}"`,
    ln
  );
}

// ─── Statement parsers ───────────────────────────────────────────

function parseHeader(
  tok: Tok[],
  ast: FloorplanAst,
  ln: number,
  mode: FloorplanAst["mode"]
): void {
  ast.mode = mode;
  if (mode === "evacuation" && ast.title === "Floor Plan") ast.title = "Evacuation Plan";
  if (mode === "stageplot" && ast.title === "Floor Plan") ast.title = "Stage Plot";
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) ast.title = t.str;
    else if (t.word === "unit") {
      const u = parseId(tok.shift(), "unit (m|ft)", ln);
      if (u !== "m" && u !== "ft") throw new FloorplanParseError(`unit must be "m" or "ft", got "${u}"`, ln);
      ast.unit = u as FloorplanUnit;
    } else if (t.word === "stack") {
      const stack = parseId(tok.shift(), "stack (horizontal|vertical)", ln);
      if (stack !== "horizontal" && stack !== "vertical") {
        throw new FloorplanParseError(`stack must be horizontal|vertical, got "${stack}"`, ln);
      }
      ast.stack = stack;
    } else throw new FloorplanParseError(`${mode}: unexpected token "${t.word}"`, ln);
  }
}

function parseStageEquipmentOptions(
  item: StageEquipmentAst,
  tok: Tok[],
  ln: number
): boolean {
  let sawLocation = false;
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) item.label = t.str;
    else if (t.word === "in") {
      item.room = parseId(tok.shift(), `a stage id after "in"`, ln);
      item.outside = false;
    } else if (t.word === "outside") {
      item.outside = true;
    } else if (t.word === "at") {
      const coord = parseCoord(tok.shift(), "stage equipment location", ln);
      item.x = coord.x;
      item.y = coord.y;
      sawLocation = true;
    } else if (t.word === "size") {
      item.size = parseDims(tok.shift(), "stage equipment size", ln);
    } else if (t.word === "rotate") {
      item.rotate = parseNum(tok.shift(), "rotate", ln);
    } else if (t.word === "channel" || t.word === "ch") {
      item.channel = parseNum(tok.shift(), "input channel", ln);
    } else if (t.word === "source") {
      const source = tok.shift();
      if (!isStr(source)) {
        throw new FloorplanParseError(`source expects quoted text`, ln);
      }
      item.source = source.str;
    } else if (t.word === "model" || t.word === "mic") {
      const model = tok.shift();
      if (!isStr(model)) {
        throw new FloorplanParseError(`model expects quoted text`, ln);
      }
      item.model = model.str;
    } else if (t.word === "stand") {
      const stand = parseId(tok.shift(), "stand type", ln);
      if (!(STAGE_STANDS as readonly string[]).includes(stand)) {
        throw new FloorplanParseError(
          `stand must be ${STAGE_STANDS.join("|")}, got "${stand}"`,
          ln
        );
      }
      item.stand = stand as StageStandType;
    } else if (t.word === "phantom" || t.word === "48v") {
      item.phantom = parseYesNo(tok.shift(), "phantom", ln);
    } else if (t.word === "notes" || t.word === "note") {
      const notes = tok.shift();
      if (!isStr(notes)) {
        throw new FloorplanParseError(`notes expects quoted text`, ln);
      }
      item.notes = notes.str;
    } else if (t.word === "mix" || t.word === "number") {
      item.mix = parseNum(tok.shift(), "monitor mix number", ln);
    } else {
      throw new FloorplanParseError(
        `equipment ${item.kind}: unexpected token "${t.word}"`,
        ln
      );
    }
  }
  return sawLocation;
}

function assertUniqueStageEquipment(
  ast: FloorplanAst,
  item: StageEquipmentAst,
  ln: number
): void {
  if (
    ast.stageplot.equipment.some(
      (existing) => existing.id === item.id && existing.floor === item.floor
    )
  ) {
    throw new FloorplanParseError(
      `duplicate stage equipment id "${item.id}" on floor ${item.floor}`,
      ln
    );
  }
}

function parseStageEquipment(
  tok: Tok[],
  ast: FloorplanAst,
  ln: number,
  floor: number
): void {
  const kind = parseStageEquipmentKind(tok.shift(), ln);
  const id = parseId(tok.shift(), "a stage equipment id", ln);
  const item: StageEquipmentAst = {
    kind,
    id,
    outside: false,
    x: 0,
    y: 0,
    rotate: 0,
    phantom: false,
    floor,
    line: ln,
  };
  const sawLocation = parseStageEquipmentOptions(item, tok, ln);
  if ((!item.room && !item.outside) || !sawLocation) {
    throw new FloorplanParseError(
      `equipment ${kind} "${id}": expected "in <stage> at x,y" or "outside at x,y"`,
      ln
    );
  }
  assertUniqueStageEquipment(ast, item, ln);
  ast.stageplot.equipment.push(item);
}

function defaultMonitorId(
  ast: FloorplanAst,
  mix: number,
  floor: number
): string {
  let suffix = 1;
  let id = `mix-${mix}`;
  while (
    ast.stageplot.equipment.some(
      (item) => item.id === id && item.floor === floor
    )
  ) {
    suffix += 1;
    id = `mix-${mix}-${suffix}`;
  }
  return id;
}

function parseStageMonitor(
  tok: Tok[],
  ast: FloorplanAst,
  ln: number,
  floor: number
): void {
  const mix = parseNum(tok.shift(), "monitor mix number", ln);
  const next = tok[0];
  const id =
    isWord(next) &&
    !["in", "outside", "at", "size", "rotate"].includes(next.word)
      ? (tok.shift() as { word: string }).word
      : defaultMonitorId(ast, mix, floor);
  const item: StageEquipmentAst = {
    kind: "monitor-wedge",
    id,
    outside: false,
    x: 0,
    y: 0,
    rotate: 0,
    phantom: false,
    mix,
    floor,
    line: ln,
  };
  const sawLocation = parseStageEquipmentOptions(item, tok, ln);
  if ((!item.room && !item.outside) || !sawLocation) {
    throw new FloorplanParseError(
      `monitor ${mix}: expected "in <stage> at x,y" or "outside at x,y"`,
      ln
    );
  }
  assertUniqueStageEquipment(ast, item, ln);
  ast.stageplot.equipment.push(item);
}

function parseStageSignal(
  tok: Tok[],
  ast: FloorplanAst,
  ln: number,
  floor: number
): void {
  const anchors: string[] = [];
  let label: string | undefined;
  const first = tok.shift();
  if (!isWord(first) || first.word === "->") {
    throw new FloorplanParseError(`signal: expected a starting equipment id`, ln);
  }
  anchors.push(first.word);
  while (tok.length) {
    const arrow = tok.shift();
    if (isStr(arrow)) {
      label = arrow.str;
      break;
    }
    if (!isWord(arrow, "->")) {
      throw new FloorplanParseError(
        `signal: expected "->" between equipment ids`,
        ln
      );
    }
    const anchor = tok.shift();
    if (!isWord(anchor) || anchor.word === "->") {
      throw new FloorplanParseError(
        `signal: expected an equipment id after "->"`,
        ln
      );
    }
    anchors.push(anchor.word);
  }
  if (tok.length) {
    throw new FloorplanParseError(`signal: unexpected trailing tokens`, ln);
  }
  if (anchors.length < 2) {
    throw new FloorplanParseError(`signal needs at least two equipment ids`, ln);
  }
  const signal: StageSignalPathAst = {
    id: `signal-${ast.stageplot.signals.length + 1}`,
    anchors,
    label,
    floor,
    line: ln,
  };
  ast.stageplot.signals.push(signal);
}

function parseStageDocumentValue(
  tok: Tok[],
  field: string,
  ln: number
): string {
  const value = tok.shift();
  if (!isStr(value)) {
    throw new FloorplanParseError(`${field} expects quoted text`, ln);
  }
  if (tok.length) {
    throw new FloorplanParseError(`${field}: unexpected trailing tokens`, ln);
  }
  return value.str;
}

function parseRoom(tok: Tok[], ast: FloorplanAst, ln: number, floor: number): void {
  const id = parseId(tok.shift(), "a room id", ln);
  if (ast.rooms.some((r) => r.id === id && r.floor === floor)) {
    throw new FloorplanParseError(`duplicate room id "${id}" on floor ${floor}`, ln);
  }
  const room: FloorplanRoom = { id, label: id, w: 4, h: 3, floor, line: ln };
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
    else if (t.word === "label-role") {
      const role = parseId(tok.shift(), "label role (normal|primary|secondary|hidden)", ln);
      if (!["normal", "primary", "secondary", "hidden"].includes(role)) {
        throw new FloorplanParseError(
          `label-role must be normal|primary|secondary|hidden, got "${role}"`,
          ln
        );
      }
      room.labelRole = role as FloorplanRoom["labelRole"];
      if (role === "hidden") room.nolabel = true;
    }
    else throw new FloorplanParseError(`room: unexpected token "${t.word}"`, ln);
  }
  ast.rooms.push(room);
}

function parseExtend(tok: Tok[], ast: FloorplanAst, ln: number, floor: number): void {
  const room = parseId(tok.shift(), "a room id", ln);
  const ext: FloorplanExtend = { room, w: 2, h: 2, floor, line: ln };
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

function parseOpening(kind: OpeningKind, tok: Tok[], ast: FloorplanAst, ln: number, floor: number): void {
  const op: FloorplanOpening = {
    kind,
    pct: 50,
    width: 0, // resolved after the form is known
    hinge: "left",
    swing: "in",
    doorType: "single",
    windowType: "fixed",
    floor,
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
    else if (t.word === "width") {
      op.width = parseNum(tok.shift(), "width", ln);
      if (op.width <= 0) throw new FloorplanParseError(`width must be greater than zero`, ln);
    }
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
    const physicalMeters = kind === "window" ? 1.2 : kind === "opening" ? 1.0 : op.between ? 0.8 : 0.9;
    op.width = ast.unit === "ft" ? physicalMeters / 0.3048 : physicalMeters;
  }
  ast.openings.push(op);
}

const FURNITURE_INSTANCE_KEYWORDS = new Set(["in", "on", "at", "size", "rotate", "seats"]);

function parseFurniture(
  tok: Tok[],
  ast: FloorplanAst,
  ln: number,
  floor: number,
  wallMounted = false
): void {
  const type = parseFurnitureType(tok.shift(), ln);
  const f: FloorplanFurniture = { type, x: 0, y: 0, rotate: 0, floor, line: ln };
  const instance = tok[0];
  if (isWord(instance) && !FURNITURE_INSTANCE_KEYWORDS.has(instance.word)) {
    f.instanceId = instance.word;
    tok.shift();
  }
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) f.label = t.str;
    else if (t.word === "in") f.room = parseId(tok.shift(), `a room id after "in"`, ln);
    else if (t.word === "on") {
      const side = parseId(tok.shift(), "a wall side", ln);
      if (!(SIDES as readonly string[]).includes(side)) {
        throw new FloorplanParseError(`expected a wall side north|south|east|west, got "${side}"`, ln);
      }
      f.anchor = { side: side as WallSide, pct: 50 };
    }
    else if (t.word === "at") {
      if (f.anchor) {
        f.anchor.pct = parsePct(tok.shift(), ln);
      } else {
        const c = parseCoord(tok.shift(), "at", ln);
        f.x = c.x;
        f.y = c.y;
      }
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
  if (wallMounted && !f.anchor) {
    throw new FloorplanParseError(
      `fixture requires "on north|south|east|west at N%"`,
      ln
    );
  }
  if (!wallMounted && f.anchor) {
    throw new FloorplanParseError(
      `wall anchors use "fixture", not "furniture"`,
      ln
    );
  }
  ast.furniture.push(f);
}

function parseArray(mode: ArrayMode, tok: Tok[], ast: FloorplanAst, ln: number, floor: number): void {
  const type = parseFurnitureType(tok.shift(), ln);
  const a: FloorplanArray = {
    mode,
    type,
    rows: 1,
    cols: 1,
    count: Infinity,
    placement: "centers",
    gap: 0,
    rotate: 0,
    floor,
    line: ln,
  };
  while (tok.length) {
    const t = tok.shift()!;
    if (!isWord(t)) throw new FloorplanParseError(`${mode}: unexpected string "${t.str}"`, ln);
    else if (t.word === "in") a.room = parseId(tok.shift(), `a room id after "in"`, ln);
    else if (t.word === "rows") a.rows = parsePositiveInt(tok.shift(), "rows", ln);
    else if (t.word === "cols") a.cols = parsePositiveInt(tok.shift(), "cols", ln);
    else if (t.word === "count") a.count = parsePositiveInt(tok.shift(), "count", ln);
    else if (t.word === "area" || t.word === "centers" || t.word === "within") {
      a.placement = t.word === "within" ? "within" : "centers";
      a.p1 = parseCoord(tok.shift(), `${t.word} p1`, ln);
      a.p2 = parseCoord(tok.shift(), `${t.word} p2`, ln);
    } else if (t.word === "itemsize") a.itemsize = parseDims(tok.shift(), "itemsize", ln);
    else if (t.word === "gap") {
      a.gap = parseNum(tok.shift(), "gap", ln);
      if (a.gap < 0) throw new FloorplanParseError(`gap must be zero or greater`, ln);
    }
    else if (t.word === "rotate") a.rotate = parseNum(tok.shift(), "rotate", ln);
    else if (t.word === "center") a.center = parseCoord(tok.shift(), "center", ln);
    else if (t.word === "radius") {
      a.radius = parseNum(tok.shift(), "radius", ln);
      if (a.radius <= 0) throw new FloorplanParseError(`radius must be greater than zero`, ln);
    }
    else if (t.word === "from") a.fromDeg = parseNum(tok.shift(), "from", ln);
    else if (t.word === "to") a.toDeg = parseNum(tok.shift(), "to", ln);
    else throw new FloorplanParseError(`${mode}: unexpected token "${t.word}"`, ln);
  }
  ast.arrays.push(a);
}

function parseZone(tok: Tok[], ast: FloorplanAst, ln: number, floor: number): void {
  const id = parseId(tok.shift(), "a zone id", ln);
  const zone: FloorplanZone = {
    id,
    label: id,
    room: "",
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    keepClear: false,
    floor,
    line: ln,
  };
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) zone.label = t.str;
    else if (t.word === "in") zone.room = parseId(tok.shift(), `a room id after "in"`, ln);
    else if (t.word === "at") {
      const coord = parseCoord(tok.shift(), "zone location", ln);
      zone.x = coord.x;
      zone.y = coord.y;
    } else if (t.word === "size") {
      const dims = parseDims(tok.shift(), "zone size", ln);
      zone.w = dims.w;
      zone.h = dims.h;
    } else if (t.word === "keep-clear") {
      zone.keepClear = true;
    } else {
      throw new FloorplanParseError(`zone: unexpected token "${t.word}"`, ln);
    }
  }
  if (!zone.room) throw new FloorplanParseError(`zone requires "in <room>"`, ln);
  ast.zones.push(zone);
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      previous = saved;
    }
  }
  return row[b.length] ?? Math.max(a.length, b.length);
}

function parseSafetyKind(word: string, ln: number): SafetyKind {
  if ((SAFETY_KINDS as readonly string[]).includes(word)) {
    return word as SafetyKind;
  }
  const suggestion = [...SAFETY_KINDS].sort(
    (a, b) => levenshtein(word, a) - levenshtein(word, b)
  )[0];
  throw new FloorplanParseError(
    `unknown safety kind "${word}". Did you mean "${suggestion}"? Valid kinds: ${SAFETY_KINDS.join(", ")} ` +
      `(ISO 7010 / NFPA 170 safety-symbol catalogue)`,
    ln
  );
}

function defaultSafetyId(ast: FloorplanAst, kind: SafetyKind): string {
  if (kind === "here" && !ast.safety.some((symbol) => symbol.id === "here")) {
    return "here";
  }
  let suffix = 1;
  let candidate: string = kind;
  while (ast.safety.some((symbol) => symbol.id === candidate)) {
    suffix += 1;
    candidate = `${kind}-${suffix}`;
  }
  return candidate;
}

function parseSafety(
  kindWord: string,
  tok: Tok[],
  ast: FloorplanAst,
  ln: number,
  floor: number
): void {
  const kind = parseSafetyKind(kindWord, ln);
  const symbol: SafetySymbolAst = {
    kind,
    id: "",
    outside: false,
    x: 0,
    y: 0,
    rotate: 0,
    floor,
    line: ln,
  };
  if (isWord(tok[0]) && !isWord(tok[0], "in") && !isWord(tok[0], "outside")) {
    symbol.id = (tok.shift() as { word: string }).word;
  } else {
    symbol.id = defaultSafetyId(ast, kind);
  }
  if (ast.safety.some((existing) => existing.id === symbol.id && existing.floor === floor)) {
    throw new FloorplanParseError(
      `duplicate safety symbol id "${symbol.id}" on floor ${floor}`,
      ln
    );
  }

  const location = tok.shift();
  if (isWord(location, "in")) {
    symbol.room = parseId(tok.shift(), `a room id after "in"`, ln);
    if (!isWord(tok.shift(), "at")) {
      throw new FloorplanParseError(`safety ${kind}: expected "at x,y"`, ln);
    }
    const coord = parseCoord(tok.shift(), "safety location", ln);
    symbol.x = coord.x;
    symbol.y = coord.y;
  } else if (isWord(location, "outside")) {
    symbol.outside = true;
    if (!isWord(tok.shift(), "at")) {
      throw new FloorplanParseError(`safety ${kind}: expected "outside at x,y"`, ln);
    }
    const coord = parseCoord(tok.shift(), "safety location", ln);
    symbol.x = coord.x;
    symbol.y = coord.y;
  } else {
    throw new FloorplanParseError(
      `safety ${kind}: expected "in <room> at x,y" or "outside at x,y"`,
      ln
    );
  }

  while (tok.length) {
    const token = tok.shift();
    if (isStr(token)) {
      symbol.label = token.str;
    } else if (isWord(token, "side")) {
      const side = parseId(tok.shift(), "a wall side", ln);
      if (!(SIDES as readonly string[]).includes(side)) {
        throw new FloorplanParseError(
          `expected a wall side north|south|east|west, got "${side}"`,
          ln
        );
      }
      symbol.side = side as WallSide;
    } else if (isWord(token, "hand")) {
      const hand = parseId(tok.shift(), "hand (left|right)", ln);
      if (hand !== "left" && hand !== "right") {
        throw new FloorplanParseError(`hand must be left|right, got "${hand}"`, ln);
      }
      symbol.hand = hand;
    } else if (isWord(token, "rotate")) {
      symbol.rotate = parseNum(tok.shift(), "rotate", ln);
    } else if (isWord(token, "class")) {
      const fireClass = tok.shift();
      if (!isStr(fireClass)) {
        throw new FloorplanParseError(`class expects a quoted fire class`, ln);
      }
      symbol.fireClass = fireClass.str;
    } else {
      throw new FloorplanParseError(`safety ${kind}: unexpected option`, ln);
    }
  }
  ast.safety.push(symbol);
}

function parseRoute(
  tok: Tok[],
  ast: FloorplanAst,
  ln: number,
  floor: number
): void {
  let kind: EscapeRouteKind = "primary";
  if (isWord(tok[0]) && (ROUTE_KINDS as readonly string[]).includes(tok[0].word)) {
    kind = (tok.shift() as { word: EscapeRouteKind }).word;
  }
  const anchors: string[] = [];
  let label: string | undefined;
  const first = tok.shift();
  if (!isWord(first) || first.word === "->") {
    throw new FloorplanParseError(`route: expected a starting anchor`, ln);
  }
  anchors.push(first.word);
  while (tok.length) {
    const arrow = tok.shift();
    if (isStr(arrow)) {
      label = arrow.str;
      break;
    }
    if (!isWord(arrow, "->")) {
      throw new FloorplanParseError(`route: expected "->" between anchors`, ln);
    }
    const anchor = tok.shift();
    if (!isWord(anchor) || anchor.word === "->") {
      throw new FloorplanParseError(`route: expected an anchor after "->"`, ln);
    }
    anchors.push(anchor.word);
  }
  if (tok.length) {
    throw new FloorplanParseError(`route: unexpected trailing tokens`, ln);
  }
  if (anchors.length < 2) {
    throw new FloorplanParseError(`route needs at least two anchors`, ln);
  }
  const route: EscapeRouteAst = {
    id: `route-${ast.routes.length + 1}`,
    kind,
    anchors,
    label,
    floor,
    line: ln,
  };
  ast.routes.push(route);
}

function parseFireDoor(
  kind: FireDoorMarkAst["kind"],
  tok: Tok[],
  ast: FloorplanAst,
  ln: number,
  floor: number
): void {
  const mark: FireDoorMarkAst = { kind, floor, line: ln };
  const target = tok.shift();
  if (isWord(target, "between")) {
    mark.between = [
      parseId(tok.shift(), "a room id", ln),
      parseId(tok.shift(), "a second room id", ln),
    ];
  } else {
    mark.room = parseId(target, `a room id or "between"`, ln);
    const side = parseId(tok.shift(), "a wall side", ln);
    if (!(SIDES as readonly string[]).includes(side)) {
      throw new FloorplanParseError(
        `expected a wall side north|south|east|west, got "${side}"`,
        ln
      );
    }
    mark.side = side as WallSide;
    if (isWord(tok[0], "at")) {
      tok.shift();
      mark.pct = parsePct(tok.shift(), ln);
    }
  }
  while (tok.length) {
    const token = tok.shift();
    if (isWord(token, "rating")) {
      const rating = tok.shift();
      if (!isStr(rating)) {
        throw new FloorplanParseError(`rating expects a quoted value`, ln);
      }
      mark.rating = rating.str;
    } else if (isWord(token)) {
      throw new FloorplanParseError(`${kind}: unexpected token "${token.word}"`, ln);
    } else if (token) {
      throw new FloorplanParseError(`${kind}: unexpected string "${token.str}"`, ln);
    }
  }
  ast.fireDoors.push(mark);
}

function parseEvacuationLegend(
  raw: string,
  overrides: LegendOverrides,
  ln: number
): void {
  const normalized = raw.replace(
    /^legend\s+(on|off|auto)\s*$/i,
    "legend: $1"
  );
  if (!parseLegendDirective(normalized, overrides)) {
    throw new FloorplanParseError(`invalid legend directive`, ln);
  }
  if (overrides.mode === "off") {
    throw new FloorplanParseError(
      `an evacuation plan must carry a legend (ISO 23601 §6 / NFPA 170 Ch.11); "legend: off" is not permitted in evacuation mode`,
      ln
    );
  }
}

// ─── Entry point ─────────────────────────────────────────────────

export function parseFloorplan(text: string): FloorplanAst {
  const locator = createSourceLocator(text);
  const ast: FloorplanAst = {
    type: "floorplan",
    mode: "floorplan",
    title: "Floor Plan",
    unit: "m",
    floors: [],
    stack: "horizontal",
    rooms: [],
    extensions: [],
    openings: [],
    furniture: [],
    arrays: [],
    zones: [],
    compliance: "iso",
    sheet: { size: "a3", orientation: "landscape" },
    safety: [],
    routes: [],
    fireDoors: [],
    showFurniture: false,
    legendOverrides: {},
    stageplot: {
      equipment: [],
      signals: [],
      document: {},
      showInputList: true,
      showOutputList: true,
      showSignalPaths: false,
    },
  };

  let sawHeader = false;
  let currentFloor = 0;
  const lines = text.split(/\r?\n/);
  let absoluteLineStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const original = lines[i]!;
    const raw = normalizeQuotes(original).trim();
    const lineStart = absoluteLineStart;
    absoluteLineStart += original.length + (i < lines.length - 1 ? (text[lineStart + original.length] === "\r" ? 2 : 1) : 0);
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
    if (
      kw === "floorplan" ||
      kw === "evacuation" ||
      kw === "escapeplan" ||
      kw === "stageplot" ||
      kw === "stage-plot"
    ) {
      if (sawHeader) {
        throw new FloorplanParseError(
          `a floorplan document may contain exactly one header; use "floor N" for additional levels`,
          ln,
          "floorplan/multiple-document-headers",
          `Remove this header and keep its rooms under a floor section, or split the source into separate documents.`
        );
      }
      parseHeader(
        tok,
        ast,
        ln,
        kw === "floorplan"
          ? "floorplan"
          : kw === "stageplot" || kw === "stage-plot"
            ? "stageplot"
            : "evacuation"
      );
      const titleToken = findFirstQuotedRange(original);
      if (titleToken) ast.titleSourceRange = locator.range(lineStart + titleToken.start, lineStart + titleToken.end);
      sawHeader = true;
    } else if (!sawHeader) {
      throw new FloorplanParseError(
        `the first statement must be the "floorplan", "evacuation", "escapeplan", or "stageplot" header`,
        ln
      );
    } else if (kw === "floor") {
      if (
        ast.floors.length === 0 &&
        (
          ast.rooms.length > 0 ||
          ast.extensions.length > 0 ||
          ast.openings.length > 0 ||
          ast.furniture.length > 0 ||
          ast.arrays.length > 0 ||
          ast.zones.length > 0
        )
      ) {
        throw new FloorplanParseError(
          `unscoped statements appear before the first floor section`,
          ln,
          "floorplan/unscoped-statements-before-floor",
          `Move the first "floor N" line directly after the document header.`
        );
      }
      const level = parseNum(tok.shift(), "floor level", ln);
      if (!Number.isInteger(level)) {
        throw new FloorplanParseError(`floor level must be an integer, got ${level}`, ln);
      }
      if (ast.floors.some((floor) => floor.level === level)) {
        throw new FloorplanParseError(`duplicate floor ${level} — merge the two sections`, ln);
      }
      const labelToken = tok.shift();
      if (labelToken && !isStr(labelToken)) {
        throw new FloorplanParseError(`floor: unexpected token "${labelToken.word}"`, ln);
      }
      if (tok.length) {
        const trailing = tok[0];
        if (trailing) {
          throw new FloorplanParseError(
            `floor: unexpected ${isStr(trailing) ? `string "${trailing.str}"` : `token "${trailing.word}"`}`,
            ln
          );
        }
      }
      const label = isStr(labelToken)
        ? labelToken.str
        : level === 0
          ? "Ground Floor"
          : level === 1
            ? "First Floor"
            : level > 1
            ? `Floor ${level}`
            : `Basement ${-level}`;
      ast.floors.push({ level, label, line: ln });
      currentFloor = level;
    } else if (ast.mode === "stageplot" && kw === "stage") {
      parseRoom(tok, ast, ln, currentFloor);
      const room = ast.rooms[ast.rooms.length - 1];
      if (room) {
        room.nolabel = true;
        const labelToken = findFirstQuotedRange(original);
        if (labelToken) {
          room.labelSourceRange = locator.range(
            lineStart + labelToken.start,
            lineStart + labelToken.end
          );
        }
        const positionToken = findAtCoordinateRange(original);
        if (positionToken) {
          room.positionSourceRange = locator.range(
            lineStart + positionToken.start,
            lineStart + positionToken.end
          );
        }
        const sizeToken = findSizeRange(original);
        if (sizeToken) {
          room.sizeSourceRange = locator.range(
            lineStart + sizeToken.start,
            lineStart + sizeToken.end
          );
        }
      }
    } else if (kw === "room") {
      parseRoom(tok, ast, ln, currentFloor);
      const room = ast.rooms[ast.rooms.length - 1];
      const labelToken = findFirstQuotedRange(original);
      if (room && labelToken) room.labelSourceRange = locator.range(lineStart + labelToken.start, lineStart + labelToken.end);
      const positionToken = findAtCoordinateRange(original);
      if (room && positionToken) room.positionSourceRange = locator.range(lineStart + positionToken.start, lineStart + positionToken.end);
      const sizeToken = findSizeRange(original);
      if (room && sizeToken) room.sizeSourceRange = locator.range(lineStart + sizeToken.start, lineStart + sizeToken.end);
    } else if (ast.mode === "evacuation" && kw === "compliance") {
      const policy = parseId(tok.shift(), "compliance profile (iso|nfpa|uae)", ln);
      if (!(COMPLIANCE_POLICIES as readonly string[]).includes(policy)) {
        throw new FloorplanParseError(
          `compliance must be iso|nfpa|uae, got "${policy}"`,
          ln
        );
      }
      ast.compliance = policy as CompliancePolicy;
      if (tok.length) throw new FloorplanParseError(`compliance: unexpected trailing tokens`, ln);
    } else if (ast.mode === "evacuation" && kw === "sheet") {
      const size = parseId(tok.shift(), "sheet size", ln);
      if (!(SHEET_SIZES as readonly string[]).includes(size)) {
        throw new FloorplanParseError(
          `sheet must be a4|a3|a2|letter|tabloid, got "${size}"`,
          ln
        );
      }
      ast.sheet.size = size as EvacuationSheetSize;
      if (tok.length) {
        const orientation = parseId(tok.shift(), "sheet orientation", ln);
        if (!(SHEET_ORIENTATIONS as readonly string[]).includes(orientation)) {
          throw new FloorplanParseError(
            `sheet orientation must be landscape|portrait, got "${orientation}"`,
            ln
          );
        }
        ast.sheet.orientation = orientation as EvacuationSheetOrientation;
      }
      if (tok.length) throw new FloorplanParseError(`sheet: unexpected trailing tokens`, ln);
    } else if (ast.mode === "evacuation" && kw === "show") {
      const layer = parseId(tok.shift(), `a layer after "show"`, ln);
      if (layer !== "furniture") {
        throw new FloorplanParseError(`show supports only "furniture", got "${layer}"`, ln);
      }
      ast.showFurniture = true;
      if (tok.length) throw new FloorplanParseError(`show furniture: unexpected trailing tokens`, ln);
    } else if (
      ast.mode === "evacuation" &&
      (kw === "legend" || kw === "legend:" || kw.startsWith("legend."))
    ) {
      parseEvacuationLegend(raw, ast.legendOverrides, ln);
    } else if (ast.mode === "evacuation" && kw === "safety") {
      parseSafety(parseId(tok.shift(), "a safety kind", ln), tok, ast, ln, currentFloor);
    } else if (
      ast.mode === "evacuation" &&
      (SAFETY_KINDS as readonly string[]).includes(kw)
    ) {
      parseSafety(kw, tok, ast, ln, currentFloor);
    } else if (ast.mode === "evacuation" && kw === "route") {
      parseRoute(tok, ast, ln, currentFloor);
    } else if (
      ast.mode === "evacuation" &&
      (kw === "fire-door" || kw === "smoke-door")
    ) {
      parseFireDoor(kw, tok, ast, ln, currentFloor);
    } else if (ast.mode === "stageplot" && kw === "equipment") {
      parseStageEquipment(tok, ast, ln, currentFloor);
    } else if (ast.mode === "stageplot" && kw === "monitor") {
      parseStageMonitor(tok, ast, ln, currentFloor);
    } else if (ast.mode === "stageplot" && kw === "signal") {
      parseStageSignal(tok, ast, ln, currentFloor);
    } else if (ast.mode === "stageplot" && kw === "venue") {
      ast.stageplot.document.venue = parseStageDocumentValue(tok, "venue", ln);
    } else if (ast.mode === "stageplot" && kw === "show-date") {
      ast.stageplot.document.showDate = parseStageDocumentValue(
        tok,
        "show-date",
        ln
      );
    } else if (ast.mode === "stageplot" && kw === "revision") {
      ast.stageplot.document.revision = parseStageDocumentValue(
        tok,
        "revision",
        ln
      );
    } else if (
      ast.mode === "stageplot" &&
      (kw === "technical-contact" || kw === "contact")
    ) {
      ast.stageplot.document.technicalContact = parseStageDocumentValue(
        tok,
        kw,
        ln
      );
    } else if (ast.mode === "stageplot" && kw === "input-list") {
      ast.stageplot.showInputList = parseYesNo(
        tok.shift(),
        "input-list",
        ln
      );
      if (tok.length) {
        throw new FloorplanParseError(
          `input-list: unexpected trailing tokens`,
          ln
        );
      }
    } else if (ast.mode === "stageplot" && kw === "output-list") {
      ast.stageplot.showOutputList = parseYesNo(
        tok.shift(),
        "output-list",
        ln
      );
      if (tok.length) {
        throw new FloorplanParseError(
          `output-list: unexpected trailing tokens`,
          ln
        );
      }
    } else if (ast.mode === "stageplot" && kw === "signal-paths") {
      ast.stageplot.showSignalPaths = parseYesNo(
        tok.shift(),
        "signal-paths",
        ln
      );
      if (tok.length) {
        throw new FloorplanParseError(
          `signal-paths: unexpected trailing tokens`,
          ln
        );
      }
    }
    else if (kw === "north") {
      ast.north = tok.length ? parseNum(tok.shift(), "north rotation (degrees)", ln) : 0;
      if (tok.length) throw new FloorplanParseError(`north: unexpected trailing tokens`, ln);
    } else if (kw === "extend") parseExtend(tok, ast, ln, currentFloor);
    else if (kw === "door" || kw === "window" || kw === "opening") {
      parseOpening(kw as OpeningKind, tok, ast, ln, currentFloor);
    }
    else if (kw === "furniture" || kw === "fixture") {
      parseFurniture(tok, ast, ln, currentFloor, kw === "fixture");
      const item = ast.furniture[ast.furniture.length - 1];
      const labelToken = item?.label ? findFirstQuotedRange(original) : undefined;
      if (item && labelToken) item.labelSourceRange = locator.range(lineStart + labelToken.start, lineStart + labelToken.end);
      const positionToken = findAtCoordinateRange(original);
      if (item && positionToken) {
        item.positionSourceRange = locator.range(
          lineStart + positionToken.start,
          lineStart + positionToken.end
        );
      }
    }
    else if (kw === "grid" || kw === "row" || kw === "arc") {
      parseArray(kw as ArrayMode, tok, ast, ln, currentFloor);
    }
    else if (kw === "zone") {
      parseZone(tok, ast, ln, currentFloor);
    }
    else {
      throw new FloorplanParseError(
        `unknown keyword "${kw}". Expected: floorplan, evacuation, stageplot, floor, room, stage, extend, door, window, opening, furniture, equipment, monitor, signal, venue, show-date, revision, technical-contact, input-list, output-list, signal-paths, grid, row, arc, fixture, zone, safety, route`,
        ln
      );
    }
  }
  return ast;
}
