/**
 * UML Use Case DSL parser.
 *
 * Accepts the declarative form (`actor:`, `usecase:`, relations) and the
 * PlantUML-aligned inline form (`:Name:`, `(Name)`). Both desugar to the
 * same AST.
 *
 * Spec: docs/reference/29-USECASE-STANDARD.md §7
 */

import type {
  UsecaseActor,
  UsecaseActorKind,
  UsecaseActorSide,
  UsecaseAst,
  UsecaseDirection,
  UsecaseNode,
  UsecaseNote,
  UsecaseRelKind,
  UsecaseRelation,
} from "./types";
import { IDENTIFIER_SOURCE } from "../../core/identifier";

export class UsecaseParseError extends Error {
  line?: number;
  constructor(message: string, line?: number) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "UsecaseParseError";
    if (line !== undefined) this.line = line;
  }
}

interface RawLine {
  text: string;
  line: number;
}

function preprocess(src: string): RawLine[] {
  const out: RawLine[] = [];
  const rows = src.split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i] ?? "";
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    // Strip end-of-line comments (# or //) outside quotes.
    let inQ = false;
    let cut = raw.length;
    for (let j = 0; j < raw.length; j++) {
      const c = raw[j];
      if (c === '"') { inQ = !inQ; continue; }
      if (inQ) continue;
      if (c === "#") { cut = j; break; }
      if (c === "/" && raw[j + 1] === "/") { cut = j; break; }
    }
    const stripped = raw.slice(0, cut).trim();
    if (!stripped) continue;
    out.push({ text: stripped, line: i + 1 });
  }
  return out;
}

// ─── Endpoint + relation helpers ────────────────────────────────

interface Tok { kind: "ident" | "quoted"; text: string }

function tokenizeEndpoint(s: string, lineNo: number): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const trimmed = s.trim();
  while (i < trimmed.length) {
    while (i < trimmed.length && /\s/.test(trimmed[i])) i++;
    if (i >= trimmed.length) break;
    if (trimmed[i] === '"') {
      const end = trimmed.indexOf('"', i + 1);
      if (end < 0) {
        throw new UsecaseParseError(`unterminated quoted string in "${s}"`, lineNo);
      }
      out.push({ kind: "quoted", text: trimmed.slice(i + 1, end) });
      i = end + 1;
    } else {
      let j = i;
      while (j < trimmed.length && !/\s/.test(trimmed[j])) j++;
      out.push({ kind: "ident", text: trimmed.slice(i, j) });
      i = j;
    }
  }
  return out;
}

function isMultiplicityText(s: string): boolean {
  return /^[0-9*]+(?:\.\.[0-9*]+)?$/.test(s);
}

function parseSourceEndpoint(s: string, lineNo: number): { id: string; mult?: string } {
  const toks = tokenizeEndpoint(s, lineNo);
  if (toks.length === 0) {
    throw new UsecaseParseError(`empty source endpoint`, lineNo);
  }
  if (toks.length === 1) {
    return { id: toks[0].text };
  }
  if (
    toks.length === 2 &&
    toks[1].kind === "quoted" &&
    isMultiplicityText(toks[1].text)
  ) {
    return { id: toks[0].text, mult: toks[1].text };
  }
  throw new UsecaseParseError(`cannot parse endpoint "${s}"`, lineNo);
}

function parseTargetEndpoint(s: string, lineNo: number): { id: string; mult?: string } {
  const toks = tokenizeEndpoint(s, lineNo);
  if (toks.length === 0) {
    throw new UsecaseParseError(`empty target endpoint`, lineNo);
  }
  if (toks.length === 1) {
    return { id: toks[0].text };
  }
  if (
    toks.length === 2 &&
    toks[0].kind === "quoted" &&
    isMultiplicityText(toks[0].text)
  ) {
    return { mult: toks[0].text, id: toks[1].text };
  }
  // Some DSLs put source-side mult after the operator on the source side
  // (rare, but allow a trailing quoted multiplicity gracefully).
  if (
    toks.length === 2 &&
    toks[1].kind === "quoted" &&
    isMultiplicityText(toks[1].text)
  ) {
    return { id: toks[0].text, mult: toks[1].text };
  }
  throw new UsecaseParseError(`cannot parse endpoint "${s}"`, lineNo);
}

const REL_OPS = ["--|>", "..>", "<..", "-->", "--"] as const;

function findRelOp(line: string): { op: string; start: number; end: number } | null {
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (inQ) continue;
    for (const op of REL_OPS) {
      if (line.startsWith(op, i)) {
        // Ensure the operator isn't a substring of a longer one
        // (e.g. `--` inside `--|>`). Since we iterate longest-first, the
        // first match wins.
        return { op, start: i, end: i + op.length };
      }
    }
  }
  return null;
}

function findLabelColon(s: string): number {
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (inQ) continue;
    if (c === ":") return i;
  }
  return -1;
}

interface LabelParts {
  stereotype?: string;
  condition?: string;
  extPointRef?: string;
}

function parseLabelClause(raw: string): LabelParts {
  const out: LabelParts = {};
  let s = raw.trim();
  // stereotype: «...» or <<...>>
  let m = s.match(/^«([^»]+)»\s*/);
  if (!m) m = s.match(/^<<([^>]+)>>\s*/);
  if (m) {
    out.stereotype = m[1].trim();
    s = s.slice(m[0].length);
  }
  // condition: [...]
  m = s.match(/^\[([^\]]+)\]\s*/);
  if (m) {
    out.condition = m[1].trim();
    s = s.slice(m[0].length);
  }
  // extension point ref: (extension point: name)
  m = s.match(/^\(extension\s+point\s*:\s*([^)]+)\)\s*/i);
  if (m) {
    out.extPointRef = m[1].trim();
    s = s.slice(m[0].length);
  }
  // Anything left and we don't have a stereotype yet — treat as freeform
  // stereotype label (e.g., `«include»` parsed already, leftover is fine).
  if (!out.stereotype && s.trim()) {
    out.stereotype = s.trim().replace(/^«|»$/g, "");
  }
  return out;
}

// ─── Parser state ────────────────────────────────────────────────

interface ParserState {
  ast: UsecaseAst;
  /** Identifier table → kind ("actor" | "usecase"). */
  idTable: Map<string, "actor" | "usecase">;
  lines: RawLine[];
  i: number;
}

function declareId(state: ParserState, id: string, kind: "actor" | "usecase", lineNo: number): void {
  const prior = state.idTable.get(id);
  if (prior !== undefined) {
    throw new UsecaseParseError(
      `identifier '${id}' already declared (line ${lineNo})`,
      lineNo,
    );
  }
  state.idTable.set(id, kind);
}

function parseHeader(state: ParserState): void {
  if (state.i >= state.lines.length) {
    throw new UsecaseParseError("empty document — expected 'usecase' header", 1);
  }
  const first = state.lines[state.i];
  if (!/^usecase\b/i.test(first.text)) {
    throw new UsecaseParseError(
      `first non-comment line must start with 'usecase' (got: ${first.text})`,
      first.line,
    );
  }
  // optional inline title: `usecase "Some Title"`
  const tail = first.text.replace(/^usecase\b/i, "").trim();
  if (tail) {
    const m = tail.match(/^"([^"]+)"$/);
    if (m) state.ast.title = m[1];
  }
  state.i++;

  while (state.i < state.lines.length) {
    const ln = state.lines[state.i];
    const m = ln.text.match(/^(title|system|direction|generalization)\s*:\s*(.+)$/i);
    if (!m) break;
    const key = m[1].toLowerCase();
    const valueRaw = m[2].trim();
    const value = stripQuotes(valueRaw);
    if (key === "title") state.ast.title = value;
    else if (key === "system") state.ast.system = value;
    else if (key === "direction") {
      const d = value.toUpperCase();
      if (d !== "LR" && d !== "TB") {
        throw new UsecaseParseError(`direction must be LR or TB (got: ${value})`, ln.line);
      }
      state.ast.direction = d as UsecaseDirection;
    } else if (key === "generalization") {
      const v = value.toLowerCase();
      if (v === "tree") state.ast.generalizationTree = true;
      else if (v === "individual") state.ast.generalizationTree = false;
      else throw new UsecaseParseError(`generalization must be 'tree' or 'individual'`, ln.line);
    }
    state.i++;
  }
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) return t.slice(1, -1);
  return t;
}

// actor: Name [as ID] [(kind)] [«stereotype»]
function parseActorDecl(ln: RawLine, state: ParserState): boolean {
  const m = ln.text.match(/^actor\s*:\s*(.+)$/i);
  if (!m) return false;
  let rest = m[1].trim();
  // optional stereotype at end
  let stereotype: string | undefined;
  const ster = rest.match(/«([^»]+)»\s*$/) || rest.match(/<<([^>]+)>>\s*$/);
  if (ster) {
    stereotype = ster[1].trim();
    rest = rest.slice(0, ster.index).trim();
  }
  // optional kind in parens
  let kind: UsecaseActorKind = "human";
  let side: UsecaseActorSide | undefined;
  const kindMatch = rest.match(/\((external|business|system|left|right)\)\s*$/i);
  if (kindMatch) {
    const k = kindMatch[1].toLowerCase();
    if (k === "left" || k === "right") side = k as UsecaseActorSide;
    else kind = k as UsecaseActorKind;
    rest = rest.slice(0, kindMatch.index).trim();
  }
  // accept a second parens (rare): allow both `(external)` and `(left)` chained
  const kindMatch2 = rest.match(/\((external|business|system|left|right)\)\s*$/i);
  if (kindMatch2) {
    const k = kindMatch2[1].toLowerCase();
    if (k === "left" || k === "right") side = k as UsecaseActorSide;
    else kind = k as UsecaseActorKind;
    rest = rest.slice(0, kindMatch2.index).trim();
  }
  // optional `as ID`
  let id: string | undefined;
  const asMatch = rest.match(new RegExp(`\\s+as\\s+(${IDENTIFIER_SOURCE})\\s*$`, "u"));
  if (asMatch) {
    id = asMatch[1];
    rest = rest.slice(0, asMatch.index).trim();
  }
  // remaining is the name (quoted or bare)
  const name = stripQuotes(rest);
  if (!name) throw new UsecaseParseError(`actor declaration missing name`, ln.line);
  const actorId = id ?? defaultIdFor(name);
  declareId(state, actorId, "actor", ln.line);
  const actor: UsecaseActor = {
    id: actorId,
    name,
    kind,
    line: ln.line,
  };
  if (stereotype !== undefined) actor.stereotype = stereotype;
  if (side !== undefined) actor.side = side;
  state.ast.actors.push(actor);
  return true;
}

// usecase: "Name" [as ID] [«stereotype»] [{ extension point: ... }]
function parseUsecaseDecl(ln: RawLine, state: ParserState): boolean {
  const m = ln.text.match(/^usecase\s*:\s*(.+)$/i);
  if (!m) return false;
  let rest = m[1].trim();
  // possible trailing `{` opening a block
  let opensBlock = false;
  if (rest.endsWith("{")) {
    opensBlock = true;
    rest = rest.slice(0, -1).trim();
  }
  // optional stereotype
  let stereotype: string | undefined;
  const ster = rest.match(/«([^»]+)»\s*$/) || rest.match(/<<([^>]+)>>\s*$/);
  if (ster) {
    stereotype = ster[1].trim();
    rest = rest.slice(0, ster.index).trim();
  }
  // optional `as ID`
  let id: string | undefined;
  const asMatch = rest.match(new RegExp(`\\s+as\\s+(${IDENTIFIER_SOURCE})\\s*$`, "u"));
  if (asMatch) {
    id = asMatch[1];
    rest = rest.slice(0, asMatch.index).trim();
  }
  const name = stripQuotes(rest);
  if (!name) throw new UsecaseParseError(`usecase declaration missing name`, ln.line);
  const ucId = id ?? defaultIdFor(name);
  declareId(state, ucId, "usecase", ln.line);
  const node: UsecaseNode = {
    id: ucId,
    name,
    extensionPoints: [],
    line: ln.line,
  };
  if (stereotype !== undefined) node.stereotype = stereotype;
  state.ast.usecases.push(node);

  if (opensBlock) {
    state.i++;
    while (state.i < state.lines.length) {
      const inner = state.lines[state.i];
      if (inner.text === "}") {
        return true;
      }
      const epMatch = inner.text.match(/^extension\s+point\s*:\s*(.+)$/i);
      if (epMatch) {
        node.extensionPoints.push(epMatch[1].trim());
        state.i++;
        continue;
      }
      throw new UsecaseParseError(
        `expected 'extension point: ...' or '}' inside use-case block`,
        inner.line,
      );
    }
    throw new UsecaseParseError(`unterminated use-case block (missing '}')`, ln.line);
  }
  return true;
}

// PlantUML inline form: :Name: [as ID]  or  (Name) [as ID]
function parsePlantUmlInline(ln: RawLine, state: ParserState): boolean {
  // Actor: :Name:
  let m = ln.text.match(new RegExp(`^:([^:]+):\\s*(?:as\\s+(${IDENTIFIER_SOURCE}))?\\s*$`, "u"));
  if (m) {
    const name = m[1].trim();
    const id = m[2] ?? defaultIdFor(name);
    declareId(state, id, "actor", ln.line);
    state.ast.actors.push({ id, name, kind: "human", line: ln.line });
    return true;
  }
  // Use case: (Name)
  m = ln.text.match(new RegExp(`^\\(([^()]+)\\)\\s*(?:as\\s+(${IDENTIFIER_SOURCE}))?\\s*$`, "u"));
  if (m) {
    const name = m[1].trim();
    const id = m[2] ?? defaultIdFor(name);
    declareId(state, id, "usecase", ln.line);
    state.ast.usecases.push({
      id,
      name,
      extensionPoints: [],
      line: ln.line,
    });
    return true;
  }
  return false;
}

function parseNote(ln: RawLine, state: ParserState): boolean {
  const m = ln.text.match(/^note\s+(?:"([^"]+)"|([^{]+))\s*\{\s*$/i);
  if (!m) return false;
  const text = (m[1] ?? m[2] ?? "").trim();
  state.i++;
  const members: string[] = [];
  while (state.i < state.lines.length) {
    const inner = state.lines[state.i];
    if (inner.text === "}") {
      const note: UsecaseNote = { text, members, line: ln.line };
      state.ast.notes.push(note);
      return true;
    }
    for (const tok of inner.text.split(",").map((t) => t.trim()).filter(Boolean)) {
      members.push(tok);
    }
    state.i++;
  }
  throw new UsecaseParseError(`unterminated note block`, ln.line);
}

function defaultIdFor(name: string): string {
  // Convert a quoted name into a synthetic id when the user omits `as <id>`.
  // Preserve Unicode letters/digits so non-ASCII names stay distinct — Korean
  // actors like `순원` / `순장` used to collapse to `__` and collide with
  // "identifier '__' already declared". Only characters that can't appear in an
  // identifier are replaced with `_`.
  const safe = name.replace(/[^\p{L}\p{N}_]/gu, "_");
  return /^[\p{L}_]/u.test(safe) ? safe : "_" + safe;
}

function parseRelation(ln: RawLine, state: ParserState): boolean {
  const op = findRelOp(ln.text);
  if (!op) return false;
  const lhs = ln.text.slice(0, op.start).trim();
  const remainder = ln.text.slice(op.end);
  const colonIdx = findLabelColon(remainder);
  const rhs = (colonIdx >= 0 ? remainder.slice(0, colonIdx) : remainder).trim();
  const labelRaw = colonIdx >= 0 ? remainder.slice(colonIdx + 1).trim() : "";
  const src = parseSourceEndpoint(lhs, ln.line);
  const tgt = parseTargetEndpoint(rhs, ln.line);

  // Auto-declare endpoints if user forgot to declare them up-front. Default to
  // use-case for unknown ids inside `()`-style usage; for relations we err on
  // the side of erroring so typos are caught.
  for (const idTok of [src.id, tgt.id]) {
    if (!state.idTable.has(idTok)) {
      throw new UsecaseParseError(`unknown identifier '${idTok}'`, ln.line);
    }
  }

  const label = parseLabelClause(labelRaw);

  let kind: UsecaseRelKind;
  let sourceId = src.id;
  let targetId = tgt.id;

  switch (op.op) {
    case "--":
      kind = "association";
      break;
    case "-->":
      kind = "directed";
      break;
    case "..>":
      // Default include; allow «extend» label to override.
      if (label.stereotype && /^extend\b/i.test(label.stereotype)) {
        kind = "extend";
      } else {
        kind = "include";
      }
      break;
    case "<..":
      // `A <.. B`: the LHS is the extension, the RHS is the base (the use case
      // being extended). Canonical AST keeps source=extension, target=base, and
      // the renderer normalises the arrowhead to point at the base. The `<..`
      // glyph only signals "this is an extend, written base-on-the-right".
      if (label.stereotype && /^include\b/i.test(label.stereotype)) {
        // include with reversed glyph — the RHS includes the LHS.
        kind = "include";
        [sourceId, targetId] = [targetId, sourceId];
      } else {
        kind = "extend";
      }
      break;
    case "--|>":
      kind = "generalization";
      break;
    default:
      throw new UsecaseParseError(`unknown operator '${op.op}'`, ln.line);
  }

  // Validation per §7.10
  const srcKind = state.idTable.get(sourceId)!;
  const tgtKind = state.idTable.get(targetId)!;
  validateRelation(kind, srcKind, tgtKind, sourceId, targetId, ln.line);

  const rel: UsecaseRelation = {
    kind,
    source: sourceId,
    target: targetId,
    line: ln.line,
  };
  // Multiplicities follow the DSL-written endpoints. If an include glyph was
  // reversed (`<..` with «include»), swap them to match the re-oriented ids.
  let srcMult = src.mult;
  let tgtMult = tgt.mult;
  if (op.op === "<.." && kind === "include") {
    [srcMult, tgtMult] = [tgtMult, srcMult];
  }
  if (srcMult !== undefined) rel.sourceMultiplicity = srcMult;
  if (tgtMult !== undefined) rel.targetMultiplicity = tgtMult;
  // Stereotype: ignore if it just restates the default keyword.
  if (label.stereotype) {
    const ls = label.stereotype.toLowerCase();
    if (kind === "include" && ls !== "include") rel.stereotype = label.stereotype;
    else if (kind === "extend" && ls !== "extend") rel.stereotype = label.stereotype;
    else if (kind === "association" || kind === "directed") {
      rel.stereotype = label.stereotype;
    }
  }
  if (label.condition !== undefined) rel.condition = label.condition;
  if (label.extPointRef !== undefined) rel.extensionPointRef = label.extPointRef;

  // Validate extension-point reference (must exist on the base use case).
  if (kind === "extend" && rel.extensionPointRef) {
    const base = state.ast.usecases.find((u) => u.id === targetId);
    if (base && !base.extensionPoints.includes(rel.extensionPointRef)) {
      throw new UsecaseParseError(
        `extension point '${rel.extensionPointRef}' is not declared on use case '${base.name}'`,
        ln.line,
      );
    }
  }

  state.ast.relations.push(rel);
  return true;
}

function validateRelation(
  kind: UsecaseRelKind,
  srcKind: "actor" | "usecase",
  tgtKind: "actor" | "usecase",
  srcId: string,
  tgtId: string,
  lineNo: number,
): void {
  if (kind === "association" || kind === "directed") {
    if (srcKind === "actor" && tgtKind === "actor") {
      throw new UsecaseParseError(
        `association must connect an actor and a use case, not two actors ('${srcId}' and '${tgtId}')`,
        lineNo,
      );
    }
    if (srcKind === "usecase" && tgtKind === "usecase") {
      throw new UsecaseParseError(
        `to relate two use cases use «include» (..>) or «extend» (<..), not association`,
        lineNo,
      );
    }
    return;
  }
  if (kind === "include" || kind === "extend") {
    if (srcKind !== "usecase" || tgtKind !== "usecase") {
      const which = kind === "include" ? "include" : "extend";
      throw new UsecaseParseError(
        `«${which}» relationship endpoints must be use cases (got actor)`,
        lineNo,
      );
    }
    return;
  }
  if (kind === "generalization") {
    if (srcKind !== tgtKind) {
      throw new UsecaseParseError(
        `generalization must connect two actors or two use cases, not actor and use case`,
        lineNo,
      );
    }
    return;
  }
}

// ─── Top-level driver ────────────────────────────────────────────

export function parseUsecase(src: string): UsecaseAst {
  const ast: UsecaseAst = {
    type: "usecase",
    direction: "LR",
    generalizationTree: true,
    actors: [],
    usecases: [],
    relations: [],
    notes: [],
    warnings: [],
  };
  const state: ParserState = {
    ast,
    idTable: new Map(),
    lines: preprocess(src),
    i: 0,
  };
  parseHeader(state);

  while (state.i < state.lines.length) {
    const ln = state.lines[state.i];
    // Try declarations first
    if (parseActorDecl(ln, state)) { state.i++; continue; }
    if (parseUsecaseDecl(ln, state)) { state.i++; continue; }
    if (parsePlantUmlInline(ln, state)) { state.i++; continue; }
    if (parseNote(ln, state)) { state.i++; continue; }
    if (parseRelation(ln, state)) { state.i++; continue; }
    throw new UsecaseParseError(`unrecognised statement: ${ln.text}`, ln.line);
  }

  // Soft warnings
  if (!ast.system && ast.usecases.length >= 3) {
    ast.warnings.push(
      "system: header omitted; subject (system boundary) will not be drawn.",
    );
  }
  return ast;
}
