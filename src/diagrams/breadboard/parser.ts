/**
 * Breadboard DSL parser. Section-based:
 *
 *     breadboard
 *     board: half | full | mini
 *     title: "..."
 *     parts
 *       id : kind [arg=value ...] @placement
 *     wires
 *       <endpoint> --color-- <endpoint>  [via @coord]
 */

import type {
  BreadboardAst,
  BreadboardCoord,
  BreadboardEndpoint,
  BreadboardForm,
  BreadboardPart,
  BreadboardPartKind,
  BreadboardPlacement,
  BreadboardRail,
  BreadboardSidePlacement,
  BreadboardWire,
  BreadboardWireColor,
} from "../../core/types";

export class BreadboardParseError extends Error {
  constructor(message: string, public lineNumber?: number) {
    super(lineNumber !== undefined ? `[line ${lineNumber}] ${message}` : message);
    this.name = "BreadboardParseError";
  }
}

// ─── Lex helpers ─────────────────────────────────────────────

function stripComment(s: string): string {
  let out = "";
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "/" && s[i + 1] === "/") break;
      if (ch === "#") break;
    }
    out += ch;
  }
  return out;
}

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

interface RawLine { text: string; lineNumber: number; }

function lex(text: string): RawLine[] {
  return text.split(/\r?\n/).map((raw, i) => ({
    text: stripComment(raw).trimEnd().replace(/^\s+/, ""),
    lineNumber: i + 1,
  })).filter((l) => l.text.length > 0);
}

// ─── Coordinate parser ───────────────────────────────────────

const ROW_LETTERS = new Set(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]);

export function parseCoord(token: string, lineNumber: number): BreadboardCoord {
  const t = token.startsWith("@") ? token.slice(1) : token;
  // Rail forms: +t8, -t8, +b14, -b14
  const railMatch = /^([+-])([tb])(\d+)$/.exec(t);
  if (railMatch) {
    const sign = railMatch[1] as "+" | "-";
    const half = railMatch[2] as "t" | "b";
    const col = parseInt(railMatch[3]!, 10);
    if (col < 1) throw new BreadboardParseError(`Rail column must be ≥ 1, got ${col}`, lineNumber);
    return { kind: "rail", rail: `${sign}${half}` as BreadboardRail, col };
  }
  // Hole forms: 5e, 12g
  const holeMatch = /^(\d+)([a-jA-J])$/.exec(t);
  if (holeMatch) {
    const col = parseInt(holeMatch[1]!, 10);
    const row = holeMatch[2]!.toLowerCase();
    if (col < 1) throw new BreadboardParseError(`Column must be ≥ 1, got ${col}`, lineNumber);
    if (!ROW_LETTERS.has(row)) throw new BreadboardParseError(`Unknown row '${row}'`, lineNumber);
    return { kind: "hole", col, row: row as "a" };
  }
  throw new BreadboardParseError(`Invalid coordinate '${token}' (expected @5e, @+t8, @-b14, etc.)`, lineNumber);
}

const SIDE_PLACEMENTS = new Set(["beside-left", "beside-right", "above", "below"]);

function parsePlacement(rest: string, lineNumber: number): BreadboardPlacement {
  const t = rest.trim();
  if (!t.startsWith("@")) {
    throw new BreadboardParseError(`Placement must start with '@', got '${t}'`, lineNumber);
  }
  const body = t.slice(1).trim();
  if (SIDE_PLACEMENTS.has(body)) {
    return { kind: "side", side: body as BreadboardSidePlacement };
  }
  // span: @5e..9e
  const spanIdx = body.indexOf("..");
  if (spanIdx >= 0) {
    const fromRaw = body.slice(0, spanIdx).trim();
    const toRaw = body.slice(spanIdx + 2).trim();
    return {
      kind: "span",
      from: parseCoord(fromRaw, lineNumber),
      to: parseCoord(toRaw, lineNumber),
    };
  }
  return { kind: "point", at: parseCoord(body, lineNumber) };
}

// ─── Part declaration parser ─────────────────────────────────

const KIND_ALIASES: Record<string, BreadboardPartKind> = {
  resistor: "resistor",
  led: "led",
  cap: "cap-elec",
  "cap-elec": "cap-elec",
  "cap-ceramic": "cap-ceramic",
  diode: "diode",
  button: "button",
  dip: "dip",
  header: "header",
  pot: "potentiometer",
  potentiometer: "potentiometer",
  // multi-token forms handled separately:  "mcu uno", "sensor hcsr04", etc.
};

const MCU_SUBTYPES: Record<string, BreadboardPartKind> = {
  uno: "mcu-uno",
  nano: "mcu-nano",
  esp32: "mcu-esp32",
  "esp32-devkit": "mcu-esp32",
  "esp32-c3": "mcu-esp32",
  "esp32-s3": "mcu-esp32",
  pico: "mcu-pico",
};

const SENSOR_SUBTYPES: Record<string, BreadboardPartKind> = {
  hcsr04: "sensor-hcsr04", "hc-sr04": "sensor-hcsr04",
  dht11: "sensor-dht11", dht22: "sensor-dht22",
  vl53l0x: "sensor-vl53l0x", "vl53-l0x": "sensor-vl53l0x", tof: "sensor-vl53l0x",
};

const DISPLAY_SUBTYPES: Record<string, BreadboardPartKind> = {
  "oled-ssd1306": "display-oled-ssd1306",
  oled: "display-oled-ssd1306",
  "lcd-1602-i2c": "display-lcd-1602-i2c",
  lcd: "display-lcd-1602-i2c",
  tm1637: "display-tm1637",
};

const MODULE_SUBTYPES: Record<string, BreadboardPartKind> = {
  "rotary-ky040": "module-rotary-ky040",
  rotary: "module-rotary-ky040",
  l298n: "module-l298n",
  "l298": "module-l298n",
  motor: "module-l298n",
};

const ACTUATOR_SUBTYPES: Record<string, BreadboardPartKind> = {
  "servo-sg90": "actuator-servo-sg90",
  servo: "actuator-servo-sg90",
};

function resolveKind(tokens: string[], lineNumber: number): { kind: BreadboardPartKind; consumed: number } {
  const head = tokens[0]?.toLowerCase() ?? "";
  if (head === "mcu") {
    const sub = tokens[1]?.toLowerCase() ?? "";
    if (!MCU_SUBTYPES[sub]) throw new BreadboardParseError(`Unknown mcu subtype '${sub}'`, lineNumber);
    return { kind: MCU_SUBTYPES[sub]!, consumed: 2 };
  }
  if (head === "sensor") {
    const sub = tokens[1]?.toLowerCase() ?? "";
    if (!SENSOR_SUBTYPES[sub]) throw new BreadboardParseError(`Unknown sensor subtype '${sub}'`, lineNumber);
    return { kind: SENSOR_SUBTYPES[sub]!, consumed: 2 };
  }
  if (head === "display") {
    const sub = tokens[1]?.toLowerCase() ?? "";
    if (!DISPLAY_SUBTYPES[sub]) throw new BreadboardParseError(`Unknown display subtype '${sub}'`, lineNumber);
    return { kind: DISPLAY_SUBTYPES[sub]!, consumed: 2 };
  }
  if (head === "module") {
    const sub = tokens[1]?.toLowerCase() ?? "";
    if (!MODULE_SUBTYPES[sub]) throw new BreadboardParseError(`Unknown module subtype '${sub}'`, lineNumber);
    return { kind: MODULE_SUBTYPES[sub]!, consumed: 2 };
  }
  if (head === "actuator") {
    const sub = tokens[1]?.toLowerCase() ?? "";
    if (!ACTUATOR_SUBTYPES[sub]) throw new BreadboardParseError(`Unknown actuator subtype '${sub}'`, lineNumber);
    return { kind: ACTUATOR_SUBTYPES[sub]!, consumed: 2 };
  }
  if (KIND_ALIASES[head]) return { kind: KIND_ALIASES[head]!, consumed: 1 };
  throw new BreadboardParseError(`Unknown part kind '${head}'`, lineNumber);
}

function parsePart(rawLine: string, lineNumber: number): BreadboardPart {
  // id : kind [args] @placement
  const colonIdx = rawLine.indexOf(":");
  if (colonIdx < 0) {
    throw new BreadboardParseError(`Part declaration must use 'id: kind ...' syntax`, lineNumber);
  }
  const id = rawLine.slice(0, colonIdx).trim();
  if (!/^[a-zA-Z][\w-]*$/.test(id)) {
    throw new BreadboardParseError(`Invalid part id '${id}'`, lineNumber);
  }
  const after = rawLine.slice(colonIdx + 1).trim();
  // Split on '@' to separate kind+args from placement.
  const atIdx = after.indexOf("@");
  if (atIdx < 0) {
    throw new BreadboardParseError(`Part '${id}' missing placement (use '@5e' or '@beside-left')`, lineNumber);
  }
  const kindAndArgs = after.slice(0, atIdx).trim();
  const placementStr = after.slice(atIdx).trim();

  const tokens = kindAndArgs.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) throw new BreadboardParseError(`Part '${id}' missing kind`, lineNumber);
  const { kind, consumed } = resolveKind(tokens, lineNumber);
  const argTokens = tokens.slice(consumed);

  const args: Record<string, string | number> = {};
  for (const tok of argTokens) {
    const eq = tok.indexOf("=");
    if (eq >= 0) {
      const k = tok.slice(0, eq).trim();
      const v = tok.slice(eq + 1).trim();
      const n = Number(v);
      args[k] = Number.isFinite(n) && /^-?\d/.test(v) ? n : v;
    } else {
      // Bare token treated as the canonical "value" arg (e.g. resistor 220 → value=220, led red → color=red)
      const n = Number(tok);
      if (Number.isFinite(n) && /^-?\d/.test(tok)) args.value = n;
      else if (kind === "led") args.color = tok;
      else args.value = tok;
    }
  }

  // Resistor with span placement — derive cols from span length so part width matches exactly.
  const placement = parsePlacement(placementStr, lineNumber);
  if (kind === "resistor" && placement.kind === "span") {
    const colSpan = Math.abs(getCol(placement.to) - getCol(placement.from));
    if (colSpan > 0) args.cols = colSpan;
  }
  if (kind === "diode" && placement.kind === "span") {
    const colSpan = Math.abs(getCol(placement.to) - getCol(placement.from));
    if (colSpan > 0) args.cols = colSpan;
  }

  return { id, kind, args, placement };
}

function getCol(c: BreadboardCoord): number {
  return c.col;
}

// ─── Wire parser ─────────────────────────────────────────────

const WIRE_COLORS: Record<string, BreadboardWireColor> = {
  red: "red", black: "black", blue: "blue", yellow: "yellow",
  orange: "orange", green: "green", white: "white", purple: "purple",
  brown: "brown", grey: "grey", gray: "grey",
};

function parseEndpoint(token: string, lineNumber: number): BreadboardEndpoint {
  if (token.startsWith("@")) {
    return { kind: "coord", at: parseCoord(token, lineNumber) };
  }
  const colonIdx = token.indexOf(":");
  if (colonIdx <= 0) {
    throw new BreadboardParseError(`Wire endpoint must be '@<coord>' or 'partId:pin', got '${token}'`, lineNumber);
  }
  const partId = token.slice(0, colonIdx).trim();
  const pin = token.slice(colonIdx + 1).trim();
  if (!partId || !pin) throw new BreadboardParseError(`Malformed pin endpoint '${token}'`, lineNumber);
  return { kind: "pin", partId, pin };
}

function parseWire(rawLine: string, lineNumber: number): BreadboardWire {
  // <ep1> --color-- <ep2>  [via @coord]
  // The color sits between two double-dashes.
  const m = /^(\S+)\s+--([a-zA-Z]+)--\s+(\S+)(?:\s+via\s+(\S+))?\s*$/.exec(rawLine);
  if (!m) {
    throw new BreadboardParseError(`Malformed wire line '${rawLine}' (expected '<ep> --color-- <ep>')`, lineNumber);
  }
  const fromTok = m[1]!;
  const colorTok = m[2]!.toLowerCase();
  const toTok = m[3]!;
  const viaTok = m[4];

  const color = WIRE_COLORS[colorTok];
  if (!color) {
    throw new BreadboardParseError(`Unknown wire color '${colorTok}'`, lineNumber);
  }
  const wire: BreadboardWire = {
    from: parseEndpoint(fromTok, lineNumber),
    to: parseEndpoint(toTok, lineNumber),
    color,
  };
  if (viaTok) wire.via = parseCoord(viaTok, lineNumber);
  return wire;
}

// ─── Top-level parser ────────────────────────────────────────

const VALID_BOARDS = new Set<BreadboardForm>(["mini", "half", "full"]);

export function parseBreadboard(text: string): BreadboardAst {
  const lines = lex(text);
  if (lines.length === 0) throw new BreadboardParseError("Empty input");

  // Header.
  const header = lines[0]!;
  if (header.text.split(/\s+/)[0]?.toLowerCase() !== "breadboard") {
    throw new BreadboardParseError(`Expected 'breadboard' header, got: ${header.text}`, header.lineNumber);
  }

  let i = 1;
  let board: BreadboardForm = "half";
  let title: string | undefined;

  // Header attributes: board:, title: (order-insensitive, before first section).
  while (i < lines.length) {
    const line = lines[i]!;
    const lower = line.text.toLowerCase();
    if (lower.startsWith("board:")) {
      const v = line.text.slice("board:".length).trim().toLowerCase() as BreadboardForm;
      if (!VALID_BOARDS.has(v)) {
        throw new BreadboardParseError(`Unknown board '${v}'. Use mini | half | full.`, line.lineNumber);
      }
      board = v;
      i++;
      continue;
    }
    if (lower.startsWith("title:")) {
      title = unquote(line.text.slice("title:".length).trim());
      i++;
      continue;
    }
    break;
  }

  const parts: BreadboardPart[] = [];
  const wires: BreadboardWire[] = [];

  // Section dispatch.
  let mode: "parts" | "wires" | null = null;
  while (i < lines.length) {
    const line = lines[i]!;
    const t = line.text;
    const lower = t.toLowerCase();
    if (lower === "parts") { mode = "parts"; i++; continue; }
    if (lower === "wires") { mode = "wires"; i++; continue; }
    if (mode === "parts") {
      parts.push(parsePart(t, line.lineNumber));
    } else if (mode === "wires") {
      wires.push(parseWire(t, line.lineNumber));
    } else {
      throw new BreadboardParseError(`Unexpected line outside parts/wires section: '${t}'`, line.lineNumber);
    }
    i++;
  }

  // Validation.
  const partIds = new Set(parts.map((p) => p.id));
  for (const part of parts) {
    if (parts.filter((p) => p.id === part.id).length > 1) {
      throw new BreadboardParseError(`Duplicate part id '${part.id}'`);
    }
  }
  for (const wire of wires) {
    for (const ep of [wire.from, wire.to]) {
      if (ep.kind === "pin" && !partIds.has(ep.partId)) {
        throw new BreadboardParseError(`Wire references unknown part '${ep.partId}'`);
      }
    }
  }
  // Mini boards have no rails — reject rail coordinates.
  if (board === "mini") {
    const checkCoord = (c: BreadboardCoord) => {
      if (c.kind === "rail") {
        throw new BreadboardParseError(`Mini boards have no power rails; '${railToken(c)}' is invalid`);
      }
    };
    for (const part of parts) {
      if (part.placement.kind === "point") checkCoord(part.placement.at);
      if (part.placement.kind === "span") { checkCoord(part.placement.from); checkCoord(part.placement.to); }
    }
    for (const wire of wires) {
      for (const ep of [wire.from, wire.to]) {
        if (ep.kind === "coord") checkCoord(ep.at);
      }
      if (wire.via) checkCoord(wire.via);
    }
  }

  return { type: "breadboard", board, title, parts, wires };
}

function railToken(c: BreadboardCoord): string {
  if (c.kind === "rail") return `@${c.rail}${c.col}`;
  return `@${c.col}${c.row}`;
}
