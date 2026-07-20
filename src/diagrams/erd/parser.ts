import type {
  ErdAst,
  ErdAttribute,
  ErdCardinality,
  ErdEntity,
  ErdNotation,
  ErdRef,
} from "../../core/types";
import { createSourceLocator } from "../../core/source-range";
import type { SourceRange } from "../../core/types";

export class ErdParseError extends Error {
  constructor(message: string, public lineNumber?: number) {
    super(lineNumber !== undefined ? `[line ${lineNumber}] ${message}` : message);
    this.name = "ErdParseError";
  }
}

// ─── Lexical helpers ──────────────────────────────────────────

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

// ─── Cardinality tokens ───────────────────────────────────────

const NAMED_CARDS: Record<string, ErdCardinality> = {
  "one-mandatory": "one-mandatory",
  "one-optional": "one-optional",
  "many-mandatory": "many-mandatory",
  "many-optional": "many-optional",
  "1..1": "one-mandatory",
  "0..1": "one-optional",
  "1..n": "many-mandatory",
  "0..n": "many-optional",
  "1..*": "many-mandatory",
  "0..*": "many-optional",
};

/**
 * Mermaid ASCII glyph parser. Reads either a left-side or right-side glyph.
 * Left side examples: `||`, `|o`, `}o`, `}|`
 * Right side examples: `||`, `o|`, `o{`, `|{`
 */
function parseMermaidGlyph(token: string, side: "left" | "right"): ErdCardinality | null {
  // Normalize to a stable key.
  const t = token.toLowerCase();
  if (side === "left") {
    if (t === "||") return "one-mandatory";
    if (t === "|o") return "one-optional";
    if (t === "}|") return "many-mandatory";
    if (t === "}o") return "many-optional";
  } else {
    if (t === "||") return "one-mandatory";
    if (t === "o|") return "one-optional";
    if (t === "|{") return "many-mandatory";
    if (t === "o{") return "many-optional";
  }
  return null;
}

function parseCardToken(raw: string, side: "left" | "right"): ErdCardinality | null {
  const tok = raw.trim().toLowerCase();
  if (!tok) return null;
  if (NAMED_CARDS[tok]) return NAMED_CARDS[tok];
  // Mermaid ASCII fallback.
  return parseMermaidGlyph(tok, side);
}

// ─── Top-level parser ─────────────────────────────────────────

interface RawLine {
  text: string;
  lineNumber: number;
  start: number;
}

function lex(text: string): RawLine[] {
  const out: RawLine[] = [];
  const lines = text.split(/\r?\n/);
  let lineStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const stripped = stripComment(raw);
    const leading = stripped.length - stripped.trimStart().length;
    const value = stripped.trim();
    if (value) out.push({ text: value, lineNumber: i + 1, start: lineStart + leading });
    lineStart += raw.length + (i < lines.length - 1 ? (text[lineStart + raw.length] === "\r" ? 2 : 1) : 0);
  }
  return out;
}

export function parseErd(text: string): ErdAst {
  const locator = createSourceLocator(text);
  const lines = lex(text);
  if (lines.length === 0) throw new ErdParseError("Empty input");

  // Header.
  const header = lines[0]!;
  const headerWords = header.text.split(/\s+/);
  const h0 = headerWords[0]?.toLowerCase();
  // Mermaid `erDiagram` paste-compat path (entities auto-create, bare relationships, type-first attrs).
  if (h0 === "erdiagram") {
    return parseMermaidErd(lines, locator.range);
  }
  if (h0 !== "erd") {
    throw new ErdParseError(`Expected 'erd' (or Mermaid 'erDiagram') header, got: ${header.text}`, header.lineNumber);
  }

  let i = 1;
  let notation: ErdNotation = "crowsfoot";
  let direction: "LR" | "TB" = "LR";
  let title: string | undefined;
  let titleSourceRange: SourceRange | undefined;

  // Header attribute lines (notation:, direction:, title:) — order-insensitive, before the first table/ref.
  while (i < lines.length) {
    const line = lines[i]!;
    const t = line.text;
    const lower = t.toLowerCase();
    if (lower.startsWith("notation:")) {
      const v = t.slice("notation:".length).trim().toLowerCase();
      if (v !== "crowsfoot" && v !== "chen" && v !== "barker") {
        throw new ErdParseError(`Unknown notation '${v}'. Supported: crowsfoot.`, line.lineNumber);
      }
      if (v !== "crowsfoot") {
        // v0.1 only renders crow's foot. Fail loudly so callers know.
        throw new ErdParseError(
          `notation '${v}' is documented but not yet implemented in v0.1; use 'crowsfoot'.`,
          line.lineNumber
        );
      }
      notation = v;
      i++;
      continue;
    }
    if (lower.startsWith("direction:")) {
      const v = t.slice("direction:".length).trim().toUpperCase();
      if (v !== "LR" && v !== "TB") {
        throw new ErdParseError(`Unknown direction '${v}'. Use LR or TB.`, line.lineNumber);
      }
      direction = v;
      i++;
      continue;
    }
    if (lower.startsWith("title:")) {
      const token = t.slice("title:".length).trim();
      title = unquote(token);
      const at = t.indexOf(token);
      titleSourceRange = locator.range(line.start + at, line.start + at + token.length);
      i++;
      continue;
    }
    break;
  }

  const entities: ErdEntity[] = [];
  const refs: ErdRef[] = [];

  while (i < lines.length) {
    const line = lines[i]!;
    const t = line.text;
    const head = t.split(/\s+/)[0]?.toLowerCase();

    if (head === "table") {
      const consumed = parseTableBlock(lines, i, entities, locator.range);
      i = consumed;
      continue;
    }

    if (head === "ref") {
      parseRefLine(t, line.lineNumber, refs);
      i++;
      continue;
    }

    throw new ErdParseError(`Unexpected line: ${t}`, line.lineNumber);
  }

  // Validate FK targets exist (warn-style: we add anyway, but reject obvious typos).
  const entityIds = new Set(entities.map((e) => e.id.toLowerCase()));
  for (const e of entities) {
    for (const a of e.attributes) {
      if (a.fkTarget) {
        const [tableName] = a.fkTarget.split(".");
        if (tableName && !entityIds.has(tableName.toLowerCase())) {
          throw new ErdParseError(
            `FK target table '${tableName}' (in ${e.id}.${a.name}) does not exist.`
          );
        }
      }
    }
  }

  return {
    type: "erd",
    notation,
    direction,
    title,
    titleSourceRange,
    entities,
    refs,
  };
}

// ─── Mermaid `erDiagram` paste-compat parser ──────────────────

const MERMAID_NAME = /[A-Za-z_][\w-]*/;
const REL_RE = new RegExp(
  `^(${MERMAID_NAME.source})\\s+([}|o][o|]|\\|\\||\\|o)(\\.\\.|--|~~)([}|o][{|]|\\|\\||o\\|)\\s+(${MERMAID_NAME.source})\\s*(?::\\s*(.*))?$`
);

/**
 * Mermaid: `ENTITY { type name KEY }` — attributes are **type-first**, the
 * opposite of the native `table` block. KEY ∈ PK | FK | UK.
 */
function parseMermaidAttr(
  raw: string,
  absoluteStart?: number,
  range?: (start: number, end: number) => SourceRange
): ErdAttribute {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const flags = { pk: false, fk: false, uk: false };
  const words: string[] = [];
  for (const tok of tokens) {
    const u = tok.toUpperCase();
    if (u === "PK") flags.pk = true;
    else if (u === "FK") flags.fk = true;
    else if (u === "UK") flags.uk = true;
    else words.push(tok);
  }
  // type-first: [type, name] — if only one word, treat it as the name.
  const type = words.length >= 2 ? words[0] : undefined;
  const name = words.length >= 2 ? words[1]! : (words[0] ?? "");
  const nameAt = raw.indexOf(name);
  const typeAt = type ? raw.indexOf(type) : -1;
  return {
    name,
    type,
    ...(absoluteStart !== undefined && range && nameAt >= 0
      ? { nameSourceRange: range(absoluteStart + nameAt, absoluteStart + nameAt + name.length) }
      : {}),
    ...(absoluteStart !== undefined && range && type && typeAt >= 0
      ? { typeSourceRange: range(absoluteStart + typeAt, absoluteStart + typeAt + type.length) }
      : {}),
    pk: flags.pk || undefined,
    fk: flags.fk || undefined,
    uk: flags.uk || undefined,
    notNull: flags.pk || undefined,
  };
}

function parseMermaidErd(
  lines: RawLine[],
  range: (start: number, end: number) => SourceRange
): ErdAst {
  const entityMap = new Map<string, ErdEntity>();
  const order: string[] = [];
  const refs: ErdRef[] = [];
  // Header attributes (`title:`, `direction:`, `notation:`) are accepted here
  // too — they are unambiguous `key: value` lines that can't be confused with
  // an entity block or a relationship, and an LLM naturally reaches for
  // `title: "..."` when it uses the Mermaid `erDiagram` header. Rejecting them
  // used to fail an otherwise-valid diagram.
  let title: string | undefined;
  let titleSourceRange: SourceRange | undefined;
  let direction: "LR" | "TB" = "LR";
  let notation: ErdNotation = "crowsfoot";

  const ensure = (id: string): ErdEntity => {
    let e = entityMap.get(id);
    if (!e) {
      e = { id, name: id, attributes: [] };
      entityMap.set(id, e);
      order.push(id);
    }
    return e;
  };

  let i = 1; // skip the `erDiagram` header line
  while (i < lines.length) {
    const t = lines[i]!.text;
    const ln = lines[i]!.lineNumber;

    // Header attributes — order-insensitive, same forms the native `erd`
    // header accepts. `title:` maps to the diagram title; `direction:`/
    // `notation:` are validated identically.
    const lower = t.toLowerCase();
    if (lower.startsWith("title:")) {
      const token = t.slice("title:".length).trim();
      title = unquote(token);
      const at = t.indexOf(token);
      titleSourceRange = range(lines[i]!.start + at, lines[i]!.start + at + token.length);
      i++;
      continue;
    }
    if (lower.startsWith("direction:")) {
      const v = t.slice("direction:".length).trim().toUpperCase();
      if (v !== "LR" && v !== "TB") {
        throw new ErdParseError(`Unknown direction '${v}'. Use LR or TB.`, ln);
      }
      direction = v;
      i++;
      continue;
    }
    if (lower.startsWith("notation:")) {
      const v = t.slice("notation:".length).trim().toLowerCase();
      if (v !== "crowsfoot") {
        throw new ErdParseError(
          `notation '${v}' is documented but not yet implemented in v0.1; use 'crowsfoot'.`,
          ln,
        );
      }
      notation = v;
      i++;
      continue;
    }

    // Entity block: `NAME {` (multi-line) or `NAME { ... }` (inline).
    const inlineBlock = new RegExp(`^(${MERMAID_NAME.source})\\s*\\{\\s*(.*?)\\s*\\}$`).exec(t);
    const openBlock = new RegExp(`^(${MERMAID_NAME.source})\\s*\\{$`).exec(t);
    if (inlineBlock) {
      const e = ensure(inlineBlock[1]!);
      let from = t.indexOf(inlineBlock[2]!);
      for (const a of inlineBlock[2]!.split(";").map((s) => s.trim()).filter(Boolean)) {
        const at = t.indexOf(a, from);
        e.attributes.push(parseMermaidAttr(a, lines[i]!.start + at, range));
        from = at + a.length;
      }
      i++;
      continue;
    }
    if (openBlock) {
      const e = ensure(openBlock[1]!);
      i++;
      while (i < lines.length && lines[i]!.text !== "}") {
        e.attributes.push(parseMermaidAttr(lines[i]!.text, lines[i]!.start, range));
        i++;
      }
      if (i >= lines.length) throw new ErdParseError(`Unterminated entity block '${openBlock[1]}'.`, ln);
      i++; // consume `}`
      continue;
    }

    // Relationship: `A ||--o{ B : label`
    const rel = REL_RE.exec(t);
    if (rel) {
      const [, src, lg, line, rg, tgt, label] = rel;
      const fromCard = parseMermaidGlyph(lg!, "left");
      const toCard = parseMermaidGlyph(rg!, "right");
      if (!fromCard || !toCard) {
        throw new ErdParseError(`Invalid Mermaid cardinality glyph in: ${t}`, ln);
      }
      ensure(src!);
      ensure(tgt!);
      refs.push({
        from: src!,
        to: tgt!,
        fromCard,
        toCard,
        identifying: line === "--",
        label: label ? label.trim() : undefined,
      });
      i++;
      continue;
    }

    throw new ErdParseError(`Unrecognized erDiagram line: ${t}`, ln);
  }

  return {
    type: "erd",
    notation,
    direction,
    title,
    titleSourceRange,
    entities: order.map((id) => entityMap.get(id)!),
    refs,
  };
}

// ─── `table` block parser ─────────────────────────────────────

function parseTableBlock(
  lines: RawLine[],
  startIdx: number,
  outEntities: ErdEntity[],
  range: (start: number, end: number) => SourceRange
): number {
  const head = lines[startIdx]!;
  // Two accepted shapes:
  //   table Name {                                    (multi-line: attributes follow)
  //   table Name { id int PK; email varchar UK }      (single-line: ; separated)
  const inlineMatch = /^table\s+(.+?)\s*\{\s*(.*?)\s*\}\s*$/i.exec(head.text);
  if (inlineMatch) {
    const declRaw = inlineMatch[1]!.trim();
    const inside = inlineMatch[2]!.trim();
    const { id, name } = splitDecl(declRaw, head.lineNumber);
    const displayToken = /^("[^"]+")\s+as\s+/i.exec(declRaw)?.[1];
    const displayAt = displayToken ? head.text.indexOf(displayToken) : -1;
    const nameSourceRange = displayToken && displayAt >= 0
      ? range(head.start + displayAt, head.start + displayAt + displayToken.length)
      : undefined;
    if (outEntities.some((e) => e.id === id)) {
      throw new ErdParseError(`Duplicate table id '${id}'.`, head.lineNumber);
    }
    const attributes: ErdAttribute[] = [];
    if (inside.length > 0) {
      const attrLines = inside.split(";").map((s) => s.trim()).filter(Boolean);
      let from = head.text.indexOf(inside);
      for (const a of attrLines) {
        const at = head.text.indexOf(a, from);
        attributes.push(parseAttributeLine(a, head.lineNumber, id, head.start + at, range));
        from = at + a.length;
      }
    }
    outEntities.push({ id, name, nameSourceRange, attributes });
    return startIdx + 1;
  }

  const m = /^table\s+(.+?)\s*\{$/i.exec(head.text);
  if (!m) {
    throw new ErdParseError(
      `Expected 'table NAME {' (with brace at end of line) or 'table NAME { ... }' inline form, got: ${head.text}`,
      head.lineNumber
    );
  }
  const declRaw = m[1]!.trim();
  const { id, name } = splitDecl(declRaw, head.lineNumber);
  const displayToken = /^("[^"]+")\s+as\s+/i.exec(declRaw)?.[1];
  const displayAt = displayToken ? head.text.indexOf(displayToken) : -1;
  const nameSourceRange = displayToken && displayAt >= 0
    ? range(head.start + displayAt, head.start + displayAt + displayToken.length)
    : undefined;

  if (outEntities.some((e) => e.id === id)) {
    throw new ErdParseError(`Duplicate table id '${id}'.`, head.lineNumber);
  }

  const attributes: ErdAttribute[] = [];
  let i = startIdx + 1;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.text === "}") {
      outEntities.push({ id, name, nameSourceRange, attributes });
      return i + 1;
    }
    const attr = parseAttributeLine(line.text, line.lineNumber, id, line.start, range);
    attributes.push(attr);
    i++;
  }
  throw new ErdParseError(`Unterminated table block '${id}'.`, head.lineNumber);
}

function splitDecl(declRaw: string, lineNumber: number): { id: string; name: string } {
  void lineNumber;
  const aliasMatch = /^"([^"]+)"\s+as\s+([A-Za-z_][\w]*)$/i.exec(declRaw);
  if (aliasMatch) {
    return { id: aliasMatch[2]!, name: aliasMatch[1]! };
  }
  const idOnly = declRaw.replace(/^"|"$/g, "");
  return { id: idOnly, name: idOnly };
}

/**
 * Attribute line grammar:
 *   name [type] [marker]*  [-> Other.col]   [: "comment"]
 *   markers ∈ {PK, FK, UK, NN, *, !}, case-insensitive
 *   `*` and `!` are aliases for NOT NULL (Barker convention)
 */
function parseAttributeLine(
  raw: string,
  lineNumber: number,
  tableId: string,
  absoluteStart?: number,
  range?: (start: number, end: number) => SourceRange
): ErdAttribute {
  let s = raw.trim();
  // Comment after ':' at end (only if not part of "type" — types do not contain ':').
  let comment: string | undefined;
  const colonIdx = findUnquotedChar(s, ":");
  if (colonIdx >= 0) {
    comment = unquote(s.slice(colonIdx + 1).trim());
    s = s.slice(0, colonIdx).trim();
  }

  // FK target: ` -> Table.col` or ` => Table.col`
  let fkTarget: string | undefined;
  const arrowMatch = /\s+(?:->|=>)\s+([A-Za-z_][\w]*\.[A-Za-z_][\w]*)\s*$/.exec(s);
  if (arrowMatch) {
    fkTarget = arrowMatch[1];
    s = s.slice(0, arrowMatch.index).trim();
  }

  const tokens = s.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    throw new ErdParseError(`Empty attribute in table '${tableId}'.`, lineNumber);
  }

  const name = tokens[0]!;
  const rest = tokens.slice(1);

  const flags = { pk: false, fk: false, uk: false, nn: false };
  const typeParts: string[] = [];
  for (const tok of rest) {
    const upper = tok.toUpperCase();
    if (upper === "PK") flags.pk = true;
    else if (upper === "FK") flags.fk = true;
    else if (upper === "UK" || upper === "UNIQUE") flags.uk = true;
    else if (upper === "NN" || upper === "NOT-NULL" || upper === "NOTNULL") flags.nn = true;
    else if (tok === "*" || tok === "!") flags.nn = true;
    else typeParts.push(tok);
  }

  if (fkTarget) flags.fk = true;
  if (flags.pk) flags.nn = true; // PK implies NOT NULL.

  const nameAt = raw.indexOf(name);
  let typeSourceRange: SourceRange | undefined;
  if (absoluteStart !== undefined && range && typeParts.length > 0) {
    const first = typeParts[0]!;
    const last = typeParts[typeParts.length - 1]!;
    const firstAt = raw.indexOf(first, nameAt + name.length);
    const lastAt = raw.indexOf(last, firstAt + first.length - last.length);
    if (firstAt >= 0 && lastAt >= firstAt) typeSourceRange = range(absoluteStart + firstAt, absoluteStart + lastAt + last.length);
  }

  return {
    name,
    ...(absoluteStart !== undefined && range && nameAt >= 0
      ? { nameSourceRange: range(absoluteStart + nameAt, absoluteStart + nameAt + name.length) }
      : {}),
    type: typeParts.length > 0 ? typeParts.join(" ") : undefined,
    ...(typeSourceRange ? { typeSourceRange } : {}),
    pk: flags.pk || undefined,
    fk: flags.fk || undefined,
    uk: flags.uk || undefined,
    notNull: flags.nn || undefined,
    fkTarget,
    comment,
  };
}

function findUnquotedChar(s: string, ch: string): number {
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') inQuote = !inQuote;
    if (!inQuote && s[i] === ch) return i;
  }
  return -1;
}

// ─── `ref` line parser ────────────────────────────────────────

/**
 * Two accepted forms:
 *
 *   ref Source <leftCard> -- <rightCard> Target [: "label"]
 *
 *     where leftCard / rightCard are named cardinalities, e.g.
 *     `many-mandatory`, `one-optional`, `0..1`, `1..N`.
 *
 *   ref Source <mermaidGlyph><line><mermaidGlyph> Target [: "label"]
 *
 *     where line is `--` (identifying) or `..` (non-identifying), and
 *     glyphs are Mermaid: `}o`, `}|`, `|o`, `||`, `o{`, `|{`, `o|`.
 *
 * Source / Target may be `Table` or `Table.column`.
 */
function parseRefLine(raw: string, lineNumber: number, outRefs: ErdRef[]): void {
  // Strip leading 'ref'.
  let s = raw.replace(/^ref\s+/i, "").trim();

  // Optional trailing : "label"
  let label: string | undefined;
  const colonIdx = findUnquotedChar(s, ":");
  if (colonIdx >= 0) {
    label = unquote(s.slice(colonIdx + 1).trim());
    s = s.slice(0, colonIdx).trim();
  }

  // Try Mermaid-style: <left-glyph><line><right-glyph>
  // line is one of: --, .., ~~ (treated as non-identifying)
  const merm = /^(\S+)\s+([}|o][o|]|\|\||\|o)(\.\.|--|~~)([}|o][{|]|\|\||o\|)\s+(\S+)$/.exec(s);
  if (merm) {
    const [, src, lg, line, rg, tgt] = merm;
    const fromCard = parseMermaidGlyph(lg!, "left");
    const toCard = parseMermaidGlyph(rg!, "right");
    if (!fromCard || !toCard) {
      throw new ErdParseError(`Invalid Mermaid cardinality glyph in: ${raw}`, lineNumber);
    }
    outRefs.push({
      from: src!,
      to: tgt!,
      fromCard,
      toCard,
      identifying: line === "--",
      label,
    });
    return;
  }

  // Named-cardinality form. Split on the line-style token (-- or ..).
  // Capture left card (1+ tokens), then "--" or "..", then right card (1 token), then target.
  const named = /^(\S+)\s+(\S+(?:[-_/]\S+)*|\d+\.\.\d+|\d+\.\.[Nn*])\s+(--|\.\.|~~)\s+(\S+(?:[-_/]\S+)*|\d+\.\.\d+|\d+\.\.[Nn*])\s+(\S+)$/.exec(s);
  if (named) {
    const [, src, leftCard, line, rightCard, tgt] = named;
    const fromCard = parseCardToken(leftCard!, "left");
    const toCard = parseCardToken(rightCard!, "right");
    if (!fromCard) {
      throw new ErdParseError(`Unknown left cardinality '${leftCard}'.`, lineNumber);
    }
    if (!toCard) {
      throw new ErdParseError(`Unknown right cardinality '${rightCard}'.`, lineNumber);
    }
    outRefs.push({
      from: src!,
      to: tgt!,
      fromCard,
      toCard,
      identifying: line === "--",
      label,
    });
    return;
  }

  throw new ErdParseError(
    `Unrecognized ref line: ${raw}\n` +
      `Expected: ref Source <card> -- <card> Target [: "label"]  or Mermaid form e.g. ref A }o--|| B`,
    lineNumber
  );
}
