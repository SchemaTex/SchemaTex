/**
 * Petri net DSL parser — hand-written, line-based recursive descent.
 *
 * Spec: docs/reference/34-PETRINET-STANDARD.md §4
 */

import type {
  PetriArc,
  PetriArcType,
  PetriAst,
  PetriDirection,
  PetriPlace,
  PetriTokenStyle,
  PetriTransition,
} from "./types";

export class PetriParseError extends Error {
  line?: number;
  constructor(message: string, line?: number) {
    super(line !== undefined ? `${message} (line ${line})` : message);
    this.name = "PetriParseError";
    this.line = line;
  }
}

// ─── Tokenizer ───────────────────────────────────────────────────

const OPENERS = ['"', "“", "「", "『", "«"]; // " “ 「 『 «
const CLOSERS = ['"', "”", "」", "』", "»"]; // " ” 」 』 »

interface Tok {
  text: string;
  quoted: boolean;
}

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    const oi = OPENERS.indexOf(c);
    if (oi >= 0) {
      const close = CLOSERS[oi]!;
      let j = i + 1;
      let buf = "";
      while (j < s.length && s[j] !== close && s[j] !== '"') {
        buf += s[j];
        j++;
      }
      out.push({ text: buf, quoted: true });
      i = j + 1;
      continue;
    }
    let j = i;
    let buf = "";
    while (j < s.length && s[j] !== " " && s[j] !== "\t") {
      buf += s[j];
      j++;
    }
    out.push({ text: buf, quoted: false });
    i = j;
  }
  return out;
}

/** Glue `key: 3` / `key : 3` into `key:3` so the tokenizer yields one token. */
function normalizeKeyNums(line: string): string {
  return line.replace(/([A-Za-z]+)\s*:\s*(-?\d+(?:\.\d+)?)/g, "$1:$2");
}

const DOT_RE = /^[•●･]+$/; // • ● ･
const ARC_RE = /^(\S+?)\s*(->|-o|=>|--)\s*(\S+)(.*)$/;

function toInt(raw: string, what: string, line: number): number {
  if (!/^-?\d+$/.test(raw)) {
    throw new PetriParseError(`${what} must be an integer, got "${raw}"`, line);
  }
  return parseInt(raw, 10);
}

// ─── Parser ──────────────────────────────────────────────────────

export function parsePetri(text: string): PetriAst {
  const rawLines = text.split(/\r?\n/);
  const ast: PetriAst = {
    type: "petri",
    direction: "lr",
    tokenStyle: "auto",
    places: [],
    transitions: [],
    arcs: [],
    fireSequence: [],
    warnings: [],
  };

  const placeIds = new Set<string>();
  const transIds = new Set<string>();
  let sawHeader = false;

  for (let ln = 0; ln < rawLines.length; ln++) {
    const rawLine = rawLines[ln]!;
    const lineNo = ln + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;

    // ── header ──
    if (!sawHeader && /^petri(net)?\b/i.test(trimmed)) {
      sawHeader = true;
      const toks = tokenize(trimmed);
      const titleTok = toks.find((t, idx) => idx > 0 && t.quoted);
      if (titleTok) ast.title = titleTok.text;
      else if (toks[1] && !toks[1].quoted) ast.title = toks.slice(1).map((t) => t.text).join(" ");
      continue;
    }
    if (!sawHeader) {
      // tolerate a missing header keyword on the very first content line
      if (/^petri(net)?\b/i.test(trimmed)) {
        sawHeader = true;
        continue;
      }
    }

    const lower = trimmed.toLowerCase();

    // ── directives ──
    if (lower.startsWith("layout:")) {
      const v = trimmed.slice(trimmed.indexOf(":") + 1).trim().toLowerCase();
      if (v === "lr" || v === "tb") ast.direction = v as PetriDirection;
      else ast.warnings.push(`Unknown layout "${v}" (line ${lineNo}); using lr.`);
      continue;
    }
    if (lower.startsWith("tokens:")) {
      const v = trimmed.slice(trimmed.indexOf(":") + 1).trim().toLowerCase();
      if (v === "dots" || v === "count" || v === "auto") ast.tokenStyle = v as PetriTokenStyle;
      else ast.warnings.push(`Unknown token style "${v}" (line ${lineNo}); using auto.`);
      continue;
    }
    if (lower.startsWith("marking:")) {
      parseMarking(trimmed.slice(trimmed.indexOf(":") + 1), lineNo, ast, placeIds);
      continue;
    }
    if (lower.startsWith("fire:")) {
      const ids = trimmed
        .slice(trimmed.indexOf(":") + 1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      ast.fireSequence.push(...ids);
      continue;
    }

    // ── place ──
    if (/^place\b/i.test(trimmed)) {
      ast.places.push(parsePlace(trimmed, lineNo, placeIds, transIds));
      continue;
    }

    // ── transition ──
    if (/^transition\b/i.test(trimmed)) {
      ast.transitions.push(parseTransition(rawLine.trim(), lineNo, placeIds, transIds));
      continue;
    }

    // ── arc ──
    const arcM = ARC_RE.exec(trimmed);
    if (arcM) {
      ast.arcs.push(parseArc(arcM, lineNo, placeIds, transIds));
      continue;
    }

    ast.warnings.push(`Unrecognized line ${lineNo}: "${trimmed}"`);
  }

  // ── post-parse validation referenced by the fire sequence ──
  for (const id of ast.fireSequence) {
    if (!transIds.has(id)) {
      throw new PetriParseError(`fire: references unknown transition "${id}"`);
    }
  }

  return ast;
}

function declareDup(
  id: string,
  lineNo: number,
  placeIds: Set<string>,
  transIds: Set<string>,
): void {
  if (placeIds.has(id) || transIds.has(id)) {
    throw new PetriParseError(`duplicate node id "${id}"`, lineNo);
  }
}

function parsePlace(
  line: string,
  lineNo: number,
  placeIds: Set<string>,
  transIds: Set<string>,
): PetriPlace {
  const toks = tokenize(normalizeKeyNums(line));
  // toks[0] === "place"
  const idTok = toks[1];
  if (!idTok || idTok.quoted) throw new PetriParseError(`place is missing an id`, lineNo);
  const id = idTok.text;
  declareDup(id, lineNo, placeIds, transIds);

  const place: PetriPlace = { id, tokens: 0, line: lineNo };
  const labelParts: string[] = [];

  for (let i = 2; i < toks.length; i++) {
    const t = toks[i]!;
    if (t.quoted) {
      labelParts.push(t.text);
      continue;
    }
    const txt = t.text;
    if (/^\*\d+$/.test(txt)) {
      place.tokens = parseInt(txt.slice(1), 10);
    } else if (DOT_RE.test(txt)) {
      place.tokens = [...txt].length;
    } else if (/^tokens:/i.test(txt)) {
      place.tokens = toInt(txt.slice(txt.indexOf(":") + 1), "tokens", lineNo);
    } else if (/^capacity:/i.test(txt)) {
      const k = toInt(txt.slice(txt.indexOf(":") + 1), "capacity", lineNo);
      if (k <= 0) throw new PetriParseError(`capacity must be a positive integer`, lineNo);
      place.capacity = k;
    } else {
      labelParts.push(txt);
    }
  }
  if (place.tokens < 0) throw new PetriParseError(`token count cannot be negative`, lineNo);
  if (labelParts.length) place.label = labelParts.join(" ");
  placeIds.add(id);
  return place;
}

function parseTransition(
  line: string,
  lineNo: number,
  placeIds: Set<string>,
  transIds: Set<string>,
): PetriTransition {
  // Extract a [guard] first (may contain spaces), then tokenize the rest.
  let guard: string | undefined;
  const stripped = line.replace(/\[([^\]]*)\]/, (_m, g) => {
    guard = String(g).trim();
    return " ";
  });
  const toks = tokenize(normalizeKeyNums(stripped));
  const idTok = toks[1];
  if (!idTok || idTok.quoted) throw new PetriParseError(`transition is missing an id`, lineNo);
  const id = idTok.text;
  declareDup(id, lineNo, placeIds, transIds);

  const tr: PetriTransition = { id, kind: "immediate", line: lineNo };
  if (guard) tr.guard = guard;
  const labelParts: string[] = [];

  for (let i = 2; i < toks.length; i++) {
    const t = toks[i]!;
    if (t.quoted) {
      labelParts.push(t.text);
      continue;
    }
    const txt = t.text;
    const low = txt.toLowerCase();
    if (low === "immediate") tr.kind = "immediate";
    else if (low === "timed") tr.kind = "timed";
    else if (/^rate:/i.test(txt)) {
      tr.rate = parseFloat(txt.slice(txt.indexOf(":") + 1));
      tr.kind = "timed";
    } else if (/^(prio|priority):/i.test(txt)) {
      tr.priority = toInt(txt.slice(txt.indexOf(":") + 1), "priority", lineNo);
    } else {
      labelParts.push(txt);
    }
  }
  if (labelParts.length) tr.label = labelParts.join(" ");
  transIds.add(id);
  return tr;
}

const ARROW_TYPE: Record<string, PetriArcType> = {
  "->": "standard",
  "-o": "inhibitor",
  "--": "read",
  "=>": "reset",
};

function parseArc(
  m: RegExpExecArray,
  lineNo: number,
  placeIds: Set<string>,
  transIds: Set<string>,
): PetriArc {
  const from = m[1]!;
  const arrow = m[2]!;
  const to = m[3]!;
  const rest = m[4] ?? "";
  const type = ARROW_TYPE[arrow]!;

  const known = (id: string): "place" | "transition" | null =>
    placeIds.has(id) ? "place" : transIds.has(id) ? "transition" : null;
  const kf = known(from);
  const kt = known(to);
  if (!kf) throw new PetriParseError(`arc references unknown node "${from}" — declare it as a place or transition first`, lineNo);
  if (!kt) throw new PetriParseError(`arc references unknown node "${to}" — declare it as a place or transition first`, lineNo);
  if (kf === kt) {
    throw new PetriParseError(
      `arc connects two ${kf}s — a Petri net arc must go place→transition or transition→place`,
      lineNo,
    );
  }
  if ((type === "inhibitor" || type === "reset") && kf !== "place") {
    throw new PetriParseError(`${type} arcs are place→transition only`, lineNo);
  }

  const arc: PetriArc = { from, to, type, weight: 1, line: lineNo };
  const toks = tokenize(normalizeKeyNums(rest));
  const labelParts: string[] = [];
  for (const t of toks) {
    if (t.quoted) {
      labelParts.push(t.text);
      continue;
    }
    const txt = t.text;
    if (/^\*\d+$/.test(txt)) arc.weight = parseInt(txt.slice(1), 10);
    else if (/^weight:/i.test(txt)) arc.weight = toInt(txt.slice(txt.indexOf(":") + 1), "weight", lineNo);
    else labelParts.push(txt);
  }
  if (arc.weight <= 0) throw new PetriParseError(`arc weight must be a positive integer`, lineNo);
  if (labelParts.length) arc.label = labelParts.join(" ");
  return arc;
}

function parseMarking(
  body: string,
  lineNo: number,
  ast: PetriAst,
  placeIds: Set<string>,
): void {
  for (const part of body.split(",")) {
    const p = part.trim();
    if (!p) continue;
    const eq = p.indexOf("=");
    if (eq < 0) {
      ast.warnings.push(`Bad marking entry "${p}" (line ${lineNo}); expected id=n.`);
      continue;
    }
    const id = p.slice(0, eq).trim();
    const n = toInt(p.slice(eq + 1).trim(), "marking", lineNo);
    if (!placeIds.has(id)) {
      throw new PetriParseError(`marking references unknown place "${id}"`, lineNo);
    }
    const place = ast.places.find((pl) => pl.id === id);
    if (place) place.tokens = n;
  }
}
