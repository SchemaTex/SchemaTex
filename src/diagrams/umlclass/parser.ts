/**
 * UML Class Diagram parser — hand-written recursive descent over a line-oriented
 * DSL with `{ … }` member blocks. Per docs/reference/36-UMLCLASS-STANDARD.md §4.
 *
 * The DSL is PlantUML-flavoured (primary) and additionally accepts Mermaid
 * `classDiagram` glyph aliases for one-line migration. Header keywords accepted:
 * `umlclass`, `class-diagram`, and `classDiagram` (Mermaid).
 *
 * Zero runtime deps. No regex generators.
 */

import type {
  UmlClassAst,
  UmlClassClassifier,
  UmlClassClassifierKind,
  UmlClassDirection,
  UmlClassMember,
  UmlClassParameter,
  UmlClassRelationKind,
  UmlClassRelationship,
  UmlClassVisibility,
} from "./types";
import type { SourceRange } from "../../core/types";
import { createSourceLocator } from "../../core/source-range";

export class UmlClassParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "UmlClassParseError";
  }
}

// ─── Public entry ─────────────────────────────────────────────

export function parseUmlClass(text: string): UmlClassAst {
  const locator = createSourceLocator(text);
  const ast: UmlClassAst = {
    type: "umlclass",
    direction: "tb",
    classifiers: [],
    relationships: [],
    packages: [],
    warnings: [],
  };

  const rawLines = text.split(/\r?\n/);
  const lineStarts: number[] = [];
  let lineStart = 0;
  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    lineStarts.push(lineStart);
    lineStart += rawLines[lineIndex]!.length + (lineIndex < rawLines.length - 1 ? (text[lineStart + rawLines[lineIndex]!.length] === "\r" ? 2 : 1) : 0);
  }
  const absoluteTrimStart = (lineIndex: number, authored: string): number => {
    const raw = rawLines[lineIndex] ?? "";
    const at = raw.indexOf(authored);
    return lineStarts[lineIndex]! + Math.max(0, at);
  };
  let i = 0;

  // ── Header ──
  // Skip leading blanks/comments to locate the header line.
  let headerSeen = false;
  while (i < rawLines.length) {
    const raw = rawLines[i] ?? "";
    const t = stripComment(raw).trim();
    if (t === "") { i++; continue; }
    if (/^(umlclass|class-diagram|classDiagram)\b/i.test(t)) {
      // Strip the header keyword; an optional trailing quoted title becomes ast.title.
      const after = t.replace(/^(umlclass|class-diagram|classDiagram)\b/i, "").trim();
      const titleMatch = matchQuoted(after);
      if (titleMatch) {
        ast.title = titleMatch.value;
        const tokenAt = t.indexOf(after) + after.indexOf(after.slice(0, titleMatch.length));
        ast.titleSourceRange = locator.range(absoluteTrimStart(i, t) + tokenAt, absoluteTrimStart(i, t) + tokenAt + titleMatch.length);
      }
      headerSeen = true;
      i++;
      break;
    }
    // First non-blank/non-comment line is not a header — accept implicit header
    // for forgiveness, but break so we start parsing body at i.
    headerSeen = true;
    break;
  }
  if (!headerSeen) {
    // Empty input — return empty AST rather than throw.
    return ast;
  }

  // ── Body ──
  // Package/namespace nesting stack (fully-qualified ids).
  const pkgStack: string[] = [];
  while (i < rawLines.length) {
    const raw = rawLines[i] ?? "";
    const t = stripComment(raw).trim();
    if (t === "") { i++; continue; }

    // Namespace open: `namespace Name {`, `namespace A.B.C {`, `namespace x["Label"] {`.
    if (/^namespace\b/i.test(t)) {
      const top = pkgStack[pkgStack.length - 1];
      const ns = parseNamespaceHeader(t);
      const fullId = top ? `${top}.${ns.name}` : ns.name;
      registerPackageChain(ast, fullId, ns.label);
      pkgStack.push(fullId);
      i++; continue;
    }
    // Namespace close.
    if (t === "}") {
      if (pkgStack.length > 0) { pkgStack.pop(); i++; continue; }
      ast.warnings.push(`Line ${i + 1}: stray "}" with no open namespace.`);
      i++; continue;
    }

    // Directive lines: `title:`, `direction:`, `theme:`.
    if (matchDirective(t, "title")) {
      const v = afterColon(t);
      const q = matchQuoted(v);
      ast.title = q ? q.value : v;
      const token = q ? v.slice(0, q.length) : v;
      const at = t.indexOf(token);
      ast.titleSourceRange = locator.range(absoluteTrimStart(i, t) + at, absoluteTrimStart(i, t) + at + token.length);
      i++; continue;
    }
    if (matchDirective(t, "direction")) {
      const v = afterColon(t).toLowerCase();
      if (v === "tb" || v === "bt" || v === "lr" || v === "rl") {
        ast.direction = v as UmlClassDirection;
      }
      i++; continue;
    }
    if (matchDirective(t, "theme")) {
      ast.metadata = ast.metadata ?? {};
      ast.metadata.theme = afterColon(t);
      i++; continue;
    }

    // Classifier declarations (with optional inline `{ … }` or multi-line body).
    const braceIdx = topLevelBraceIndex(t);
    const headerPart = braceIdx >= 0 ? t.slice(0, braceIdx).trim() : t;
    const classifier = tryParseClassifierHeader(headerPart, i + 1);
    if (classifier) {
      const nameToken = classifierDisplayToken(headerPart);
      if (nameToken) {
        const abs = absoluteTrimStart(i, t) + headerPart.indexOf(nameToken.token);
        classifier.nameSourceRange = locator.range(abs + nameToken.innerStart, abs + nameToken.innerEnd);
      }
      const members: UmlClassMember[] = [];
      if (braceIdx >= 0) {
        const after = t.slice(braceIdx + 1);
        const closeIdx = lastTopLevelClose(after);
        if (closeIdx >= 0) {
          // Inline complete body on a single line: `class Foo { +a +b }`.
          const bodyStr = after.slice(0, closeIdx).trim();
          members.push(...parseInlineMembers(bodyStr, classifier.kind, i + 1));
          i++;
        } else {
          // `{` opens a multi-line body (possibly with leading content on this line).
          const lead = after.trim();
          if (lead) members.push(...parseInlineMembers(lead, classifier.kind, i + 1));
          i++;
          while (i < rawLines.length) {
            const mt = stripComment(rawLines[i] ?? "").trim();
            if (mt === "") { i++; continue; }
            if (mt === "}") { i++; break; }
            // Manual compartment separator — accepted but currently ignored (rare).
            if (/^(--|\.\.|==|__)$/.test(mt)) { i++; continue; }
            const m = parseMember(mt, classifier.kind, i + 1);
            if (m) {
              annotateMemberRanges(m, mt, absoluteTrimStart(i, mt), locator.range);
              members.push(m);
            }
            i++;
          }
        }
      } else {
        i++;
      }
      classifier.members = members;
      const top = pkgStack[pkgStack.length - 1];
      if (top) classifier.packageId = top;
      mergeClassifier(ast, classifier);
      if (top) assignToPackage(ast, top, classifier.id);
      continue;
    }

    // Relationship lines.
    const rels = tryParseRelationship(t, i + 1);
    if (rels) {
      for (const r of rels) {
        ast.relationships.push(r);
        ensureClassifier(ast, r.from);
        ensureClassifier(ast, r.to);
      }
      i++; continue;
    }

    // Single-line member / annotation: `ClassName : +member` or `ClassName : <<iface>>`.
    const memberLine = tryParseMemberLine(t);
    if (memberLine) {
      applyMemberLine(ast, memberLine.id, memberLine.body, i + 1);
      const cls = ast.classifiers.find((candidate) => candidate.id === memberLine.id);
      const member = cls?.members[cls.members.length - 1];
      if (member) {
        const bodyAt = t.indexOf(memberLine.body);
        annotateMemberRanges(member, memberLine.body, absoluteTrimStart(i, t) + bodyAt, locator.range);
      }
      i++; continue;
    }

    // Soft warning for an unrecognised line — never abort.
    ast.warnings.push(`Line ${i + 1}: unrecognised line: "${truncate(t, 80)}"`);
    i++;
  }

  // ── Post-validation ──
  validateGeneralizationAcyclicity(ast);
  validateRealizationTargets(ast);
  emitAutoCreatedWarning(ast);

  return ast;
}

function classifierDisplayToken(line: string): { token: string; innerStart: number; innerEnd: number } | undefined {
  const alias = /\bas\s+("[^"]+"|[A-Za-z_][\w.]*)/i.exec(line);
  if (alias) {
    const token = alias[1]!;
    return token.startsWith('"')
      ? { token, innerStart: 0, innerEnd: token.length }
      : { token, innerStart: 0, innerEnd: token.length };
  }
  // A bare classifier token is also its stable relationship id. Editing only
  // that token would leave references dangling, so expose display aliases
  // only until multi-range id rename is implemented.
  return undefined;
}

function annotateMemberRanges(
  member: UmlClassMember,
  authored: string,
  absoluteStart: number,
  range: (start: number, end: number) => SourceRange
): void {
  const namePattern = member.kind === "operation"
    ? new RegExp(`\\b${escapeRegExp(member.name)}\\s*(?=\\()`)
    : new RegExp(`\\b${escapeRegExp(member.name)}\\b`);
  const nameMatch = namePattern.exec(authored);
  if (nameMatch?.index !== undefined) {
    member.nameSourceRange = range(absoluteStart + nameMatch.index, absoluteStart + nameMatch.index + member.name.length);
  }
  if (member.type) {
    const typeAt = authored.lastIndexOf(member.type);
    if (typeAt >= 0) member.typeSourceRange = range(absoluteStart + typeAt, absoluteStart + typeAt + member.type.length);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Header / classifier parsing ──────────────────────────────

/**
 * Returns a Classifier with `members: []` if the line is a classifier-header;
 * otherwise undefined. The caller decides whether to consume a `{ … }` block
 * based on whether `t` ends with `{`.
 */
function tryParseClassifierHeader(line: string, lineNo: number): UmlClassClassifier | undefined {
  // Tokenise: optional «stereotype», optional `abstract`, kind keyword, id,
  // optional `as Alias`, optional trailing `{`.
  let rest = line.trim();
  let stereotype: string | undefined;
  let isAbstract = false;

  // Stereotype: «word» or <<word>>
  const stereo = matchStereotype(rest);
  if (stereo) {
    stereotype = stereo.value;
    rest = rest.slice(stereo.length).trim();
  }

  // Optional `abstract` modifier.
  if (/^abstract\s+/i.test(rest)) {
    isAbstract = true;
    rest = rest.replace(/^abstract\s+/i, "").trim();
  }

  // Kind keyword.
  const kindMatch = /^(class|interface|enum|enumeration|datatype|primitive)\b/i.exec(rest);
  let kind: UmlClassClassifierKind | undefined;
  if (kindMatch) {
    const kw = kindMatch[1]!.toLowerCase();
    kind = (kw === "enumeration" ? "enum" : kw) as UmlClassClassifierKind;
    rest = rest.slice(kindMatch[0].length).trim();
  } else if (stereotype) {
    // Stereotype-only header — default to class, unless stereotype names a kind.
    const sLower = stereotype.toLowerCase();
    if (sLower === "interface") kind = "interface";
    else if (sLower === "enumeration" || sLower === "enum") kind = "enum";
    else if (sLower === "datatype") kind = "datatype";
    else if (sLower === "primitive") kind = "primitive";
    else kind = "class";
  } else {
    return undefined; // Not a classifier line.
  }

  // Strip trailing `{` if present.
  if (rest.endsWith("{")) rest = rest.slice(0, -1).trim();

  // Name (and optional `as Alias`).
  // The name may be a quoted string or a bare id.
  let id = "";
  let name = "";
  const q = matchQuoted(rest);
  if (q) {
    id = q.value;
    name = q.value;
    rest = rest.slice(q.length).trim();
  } else {
    const idMatch = /^([A-Za-z_][\w.]*)/.exec(rest);
    if (!idMatch) {
      throw new UmlClassParseError(`expected classifier name`, lineNo);
    }
    id = idMatch[1]!;
    name = id;
    rest = rest.slice(idMatch[0].length).trim();
  }

  // Generic class-name parameters: `class List~T~` → display name "List<T>"
  // (the parameterised-classifier *box* is still deferred; the name renders inline).
  if (rest.startsWith("~")) {
    let depth = 0;
    let j = 0;
    for (; j < rest.length; j++) {
      if (rest[j] === "~") {
        const next = rest[j + 1] ?? "";
        const isClose = depth > 0 && (next === "" || "~,)>] \t".includes(next));
        if (isClose) depth--; else depth++;
        if (depth === 0) { j++; break; }
      }
    }
    const generic = rest.slice(0, j);
    name = name + normalizeGenerics(generic);
    rest = rest.slice(j).trim();
  }

  // Optional `as Alias` — alias becomes the *display* name; id stays for refs.
  const aliasMatch = /^as\s+(?:"([^"]+)"|([A-Za-z_][\w.]*))/i.exec(rest);
  if (aliasMatch) {
    name = aliasMatch[1] ?? aliasMatch[2] ?? name;
    rest = rest.slice(aliasMatch[0].length).trim();
  }
  // Strip trailing `{` again in case the alias consumed text before it.
  if (rest.endsWith("{")) rest = rest.slice(0, -1).trim();

  return {
    id,
    name,
    kind,
    stereotype: stereotype && stereotype.toLowerCase() !== kind ? stereotype : undefined,
    isAbstract: isAbstract || (kind === "class" && stereotype === "abstract") || undefined,
    members: [],
  };
}

function mergeClassifier(ast: UmlClassAst, decl: UmlClassClassifier): void {
  const existing = ast.classifiers.find((c) => c.id === decl.id);
  if (!existing) {
    ast.classifiers.push(decl);
    return;
  }
  // Body-bearing declaration wins over an arc-auto-created shell.
  if (existing.autoCreated) {
    Object.assign(existing, decl, { autoCreated: false });
  } else {
    ast.warnings.push(`Classifier "${decl.id}" redeclared — keeping first declaration.`);
  }
}

function ensureClassifier(ast: UmlClassAst, id: string): void {
  if (!ast.classifiers.some((c) => c.id === id)) {
    ast.classifiers.push({
      id,
      name: id,
      kind: "class",
      members: [],
      autoCreated: true,
    });
  }
}

// ─── Namespace / package parsing ──────────────────────────────

/**
 * Parse a `namespace …` header line into `{ name, label? }`.
 * Forms: `namespace Foo {`, `namespace A.B.C {`, `namespace x["Label"] {`,
 * `namespace x "Label" {`. The trailing `{` is optional (forgiving).
 */
function parseNamespaceHeader(line: string): { name: string; label?: string } {
  let rest = line.replace(/^namespace\b/i, "").trim();
  if (rest.endsWith("{")) rest = rest.slice(0, -1).trim();

  // Bracket label form: Name["Label"] or Name[Label].
  const lb = /\[\s*("?)([^"\]]*)\1\s*\]\s*$/.exec(rest);
  if (lb && lb.index > 0) {
    const label = lb[2]!.trim();
    const name = rest.slice(0, lb.index).trim();
    return { name, ...(label ? { label } : {}) };
  }
  // Quoted label form: Name "Label".
  const nameMatch = /^([A-Za-z_][\w.]*)/.exec(rest);
  if (nameMatch) {
    const name = nameMatch[0];
    const tail = rest.slice(name.length).trim();
    const q = matchQuoted(tail);
    if (q) return { name, label: q.value };
    return { name };
  }
  return { name: rest || "namespace" };
}

/** Register a package and all its dot-notation ancestors (auto-created). */
function registerPackageChain(ast: UmlClassAst, fullId: string, label?: string): void {
  const segs = fullId.split(".").filter(Boolean);
  let parentId: string | undefined;
  let acc = "";
  for (let k = 0; k < segs.length; k++) {
    acc = acc ? `${acc}.${segs[k]}` : segs[k]!;
    let pkg = ast.packages.find((p) => p.id === acc);
    if (!pkg) {
      pkg = { id: acc, name: segs[k]!, classifierIds: [], ...(parentId ? { parentId } : {}) };
      ast.packages.push(pkg);
    }
    if (k === segs.length - 1 && label) pkg.name = label;
    parentId = acc;
  }
}

function assignToPackage(ast: UmlClassAst, pkgId: string, classifierId: string): void {
  const pkg = ast.packages.find((p) => p.id === pkgId);
  if (pkg && !pkg.classifierIds.includes(classifierId)) pkg.classifierIds.push(classifierId);
}

// ─── Single-line member / annotation (`Class : member`) ───────

function tryParseMemberLine(line: string): { id: string; body: string } | undefined {
  const m = /^([A-Za-z_][\w.]*)\s*:\s*(.+)$/.exec(line);
  if (!m) return undefined;
  const body = m[2]!.trim();
  if (!body) return undefined;
  return { id: m[1]!, body };
}

function applyMemberLine(ast: UmlClassAst, id: string, body: string, lineNo: number): void {
  let cls = ast.classifiers.find((c) => c.id === id);
  if (!cls) {
    cls = { id, name: id, kind: "class", members: [] };
    ast.classifiers.push(cls);
  } else if (cls.autoCreated) {
    cls.autoCreated = false;
  }

  // Whole-body stereotype/annotation: `Class : <<interface>>`.
  const st = matchStereotype(body);
  if (st && st.length === body.length) {
    const sLower = st.value.toLowerCase();
    if (sLower === "interface") cls.kind = "interface";
    else if (sLower === "enumeration" || sLower === "enum") cls.kind = "enum";
    else if (sLower === "datatype") cls.kind = "datatype";
    else if (sLower === "primitive") cls.kind = "primitive";
    else if (sLower === "abstract") cls.isAbstract = true;
    else cls.stereotype = st.value;
    return;
  }

  const member = parseMember(body, cls.kind, lineNo);
  if (member) cls.members.push(member);
}

// ─── Inline (single-line) member bodies ──────────────────────

/** Index of the first top-level `{` not inside a quoted string, or -1. */
function topLevelBraceIndex(s: string): number {
  let inQuote = false;
  let quoteCh = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inQuote) { if (ch === quoteCh) inQuote = false; continue; }
    if (ch === '"' || ch === "“" || ch === "「" || ch === "『" || ch === "«") {
      inQuote = true; quoteCh = closingQuote(ch); continue;
    }
    if (ch === "{") return i;
  }
  return -1;
}

/** Index of the last `}` in `s` (closing an inline body), or -1 if none. */
function lastTopLevelClose(s: string): number {
  return s.lastIndexOf("}");
}

/**
 * Parse the content between `{ … }` when it was written on a single line, e.g.
 * `+ name : String + login() : void` or enum `BRONZE SILVER GOLD`. Members are
 * split on visibility-glyph boundaries (`+ - # ~`) at bracket-depth 0; when no
 * glyph members are present the body is split on whitespace (bare enum literals).
 */
function parseInlineMembers(
  body: string,
  kind: UmlClassClassifierKind,
  lineNo: number
): UmlClassMember[] {
  const out: UmlClassMember[] = [];
  for (const part of splitInlineMembers(body)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = parseMember(trimmed, kind, lineNo);
    if (m) out.push(m);
  }
  return out;
}

function splitInlineMembers(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  let hasGlyphMember = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (ch === "(" || ch === "[" || ch === "<") depth++;
    else if (ch === ")" || ch === "]" || ch === ">") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (ch === "+" || ch === "-" || ch === "#" || ch === "~")) {
      const prev = i === 0 ? "" : body[i - 1]!;
      const prevIsBoundary = i === 0 || prev === " " || prev === "\t";
      let j = i + 1;
      while (j < body.length && (body[j] === " " || body[j] === "\t")) j++;
      const next = body[j] ?? "";
      const nextStartsMember = /[A-Za-z_/]/.test(next);
      if (prevIsBoundary && nextStartsMember) {
        hasGlyphMember = true;
        if (i > start) { out.push(body.slice(start, i)); start = i; }
      }
    }
  }
  if (hasGlyphMember) {
    const tail = body.slice(start);
    if (tail.trim()) out.push(tail);
    return out;
  }
  // No glyph members → whitespace split at depth 0 (enum literals / bare names).
  return splitWhitespaceTopLevel(body);
}

function splitWhitespaceTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "(" || ch === "[" || ch === "<") depth++;
    else if (ch === ")" || ch === "]" || ch === ">") depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === " " || ch === "\t")) {
      if (buf) { out.push(buf); buf = ""; }
    } else {
      buf += ch;
    }
  }
  if (buf) out.push(buf);
  return out;
}

// ─── Member parsing (attribute / operation / literal) ─────────

function parseMember(
  line: string,
  classifierKind: UmlClassClassifierKind,
  lineNo: number
): UmlClassMember | undefined {
  // Pull off trailing `{property}` annotations (any number).
  const properties: string[] = [];
  let body = line;
  while (true) {
    const m = /\{([^}]+)\}\s*$/.exec(body);
    if (!m) break;
    properties.unshift(m[1]!.trim());
    body = body.slice(0, m.index).trim();
  }

  // Mermaid member-level classifiers: trailing `*` (abstract) / `$` (static).
  // Stripped from the very end (a bare `*`/`$`, never `[*]` multiplicity).
  let suffixAbstract = false;
  let suffixStatic = false;
  while (body.length > 0) {
    const last = body[body.length - 1];
    if (last === "*") { suffixAbstract = true; body = body.slice(0, -1).trimEnd(); }
    else if (last === "$") { suffixStatic = true; body = body.slice(0, -1).trimEnd(); }
    else break;
  }
  const suffix = { isStatic: suffixStatic, isAbstract: suffixAbstract };

  // Visibility.
  let visibility: UmlClassVisibility | undefined;
  const vis = /^([+\-#~])\s*/.exec(body);
  if (vis) {
    visibility = visibilityFromGlyph(vis[1]!);
    body = body.slice(vis[0].length);
  }

  // Detect operation by the first '(' before any ':' or '='.
  const parenIdx = body.indexOf("(");
  const colonIdx = body.indexOf(":");
  const eqIdx = body.indexOf("=");
  const isOperation =
    parenIdx >= 0 &&
    (colonIdx < 0 || parenIdx < colonIdx) &&
    (eqIdx < 0 || parenIdx < eqIdx);

  if (isOperation) {
    return parseOperation(body, visibility, properties, lineNo, suffix);
  }

  // Enumeration literal — bare name, no `:` / `=` / visibility, classifier is an enum.
  if (
    classifierKind === "enum" &&
    visibility === undefined &&
    colonIdx < 0 &&
    eqIdx < 0 &&
    /^[A-Za-z_][\w.]*$/.test(body)
  ) {
    return {
      kind: "literal",
      name: body,
      ...(suffixStatic ? { isStatic: true } : {}),
    };
  }

  // Attribute.
  return parseAttribute(body, visibility, properties, lineNo, suffix);
}

function parseOperation(
  body: string,
  visibility: UmlClassVisibility | undefined,
  properties: string[],
  lineNo: number,
  suffix: { isStatic: boolean; isAbstract: boolean }
): UmlClassMember {
  const parenIdx = body.indexOf("(");
  const closeIdx = matchingCloseParen(body, parenIdx);
  if (closeIdx < 0) {
    throw new UmlClassParseError(`unmatched '(' in operation`, lineNo);
  }
  const name = body.slice(0, parenIdx).trim();
  const paramStr = body.slice(parenIdx + 1, closeIdx).trim();
  const after = body.slice(closeIdx + 1).trim();

  const params: UmlClassParameter[] = [];
  if (paramStr) {
    // Split on top-level commas (parens may nest in types).
    const parts = splitTopLevel(paramStr, ",");
    for (const p of parts) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      let direction: UmlClassParameter["direction"] | undefined;
      let rest = trimmed;
      const dm = /^(in|out|inout)\s+/i.exec(rest);
      if (dm) {
        direction = dm[1]!.toLowerCase() as UmlClassParameter["direction"];
        rest = rest.slice(dm[0].length);
      }
      // Accept "name: Type" / "name : Type" / Java-style "Type name".
      let pname = rest;
      let ptype: string | undefined;
      const ci = rest.indexOf(":");
      if (ci >= 0) {
        pname = rest.slice(0, ci).trim();
        ptype = rest.slice(ci + 1).trim();
      } else if (/\s/.test(rest) && !/[<>]/.test(rest)) {
        // Java order: "Type name". Avoid mistakenly splitting generic types like "Map<K,V> m".
        const lastSpace = rest.lastIndexOf(" ");
        const candType = rest.slice(0, lastSpace).trim();
        const candName = rest.slice(lastSpace + 1).trim();
        if (/^[A-Za-z_][\w.]*$/.test(candName)) {
          ptype = candType;
          pname = candName;
        }
      }
      if (ptype) ptype = normalizeGenerics(ptype);
      params.push({ name: pname, ...(ptype ? { type: ptype } : {}), ...(direction ? { direction } : {}) });
    }
  }

  // Return type: `: Type` (Schematex/PlantUML) or space-separated `Type`
  // (Mermaid `methodName() Type`).
  let returnType: string | undefined;
  if (after.startsWith(":")) {
    returnType = after.slice(1).trim();
  } else if (after) {
    returnType = after;
  }
  if (returnType) returnType = normalizeGenerics(returnType);

  return {
    kind: "operation",
    visibility,
    name,
    params,
    ...(returnType ? { type: returnType } : {}),
    isStatic: properties.includes("static") || suffix.isStatic || undefined,
    isAbstract: properties.includes("abstract") || suffix.isAbstract || undefined,
    properties: properties.filter((p) => p !== "static" && p !== "abstract"),
  };
}

function parseAttribute(
  body: string,
  visibility: UmlClassVisibility | undefined,
  properties: string[],
  _lineNo: number,
  suffix: { isStatic: boolean; isAbstract: boolean }
): UmlClassMember {
  // Derived prefix.
  let isDerived = false;
  if (body.startsWith("/")) {
    isDerived = true;
    body = body.slice(1).trim();
  }

  // Default value.
  let defaultValue: string | undefined;
  const eqIdx = body.indexOf("=");
  let rest = body;
  if (eqIdx >= 0) {
    defaultValue = body.slice(eqIdx + 1).trim();
    rest = body.slice(0, eqIdx).trim();
  }

  // Multiplicity.
  let multiplicity: string | undefined;
  const mm = /\[([^\]]+)\]\s*$/.exec(rest);
  if (mm) {
    multiplicity = mm[1]!.trim();
    rest = rest.slice(0, mm.index).trim();
  }

  // Name : Type  OR  Type name (Java order).
  let name = rest;
  let type: string | undefined;
  const ci = rest.indexOf(":");
  if (ci >= 0) {
    name = rest.slice(0, ci).trim();
    type = rest.slice(ci + 1).trim();
  } else if (/\s/.test(rest) && !/[<>(]/.test(rest)) {
    const lastSpace = rest.lastIndexOf(" ");
    const candType = rest.slice(0, lastSpace).trim();
    const candName = rest.slice(lastSpace + 1).trim();
    if (/^[A-Za-z_][\w.]*$/.test(candName)) {
      type = candType;
      name = candName;
    }
  }
  if (type) type = normalizeGenerics(type);

  return {
    kind: "attribute",
    visibility,
    name,
    ...(type ? { type } : {}),
    ...(multiplicity ? { multiplicity } : {}),
    ...(defaultValue ? { defaultValue } : {}),
    isStatic: properties.includes("static") || suffix.isStatic || undefined,
    isDerived: isDerived || undefined,
    properties: properties.filter((p) => p !== "static"),
  };
}

// ─── Relationship parsing ─────────────────────────────────────

interface ConnectorSpec {
  glyph: string;
  kind: UmlClassRelationKind;
  /** When true, the source/target ids should be swapped (the adornment-bearing
   * end is on the LEFT of the typed connector — the "reversed" form). */
  reversed: boolean;
}

// Order is **load-bearing**: longer glyphs first so `<|--` is not partially
// matched as `<--`, `..|>` not partially matched as `..>`, etc.
//
// `reversed: true` means the **adornment is on the LEFT side** of the typed
// connector — so to put the source (the unadorned end) on `from` and the
// adorned end on `to`, swap left/right. The semantic invariant after parsing:
//   generalization/realization → `from` = child, `to` = parent (triangle at to)
//   composition/aggregation    → `from` = whole, `to` = part   (diamond at from)
//   directed/dependency        → `from` = source, `to` = target (arrow at to)
const CONNECTORS: ConnectorSpec[] = [
  { glyph: "<|--", kind: "generalization", reversed: true  }, // triangle on left → swap
  { glyph: "--|>", kind: "generalization", reversed: false },
  { glyph: "<|..", kind: "realization",   reversed: true  }, // triangle on left → swap
  { glyph: "..|>", kind: "realization",   reversed: false },
  { glyph: "*--",  kind: "composition",   reversed: false }, // diamond on left = whole on left → keep
  { glyph: "--*",  kind: "composition",   reversed: true  },
  { glyph: "o--",  kind: "aggregation",   reversed: false },
  { glyph: "--o",  kind: "aggregation",   reversed: true  },
  { glyph: "..>",  kind: "dependency",    reversed: false },
  { glyph: "<..",  kind: "dependency",    reversed: true  },
  { glyph: "-->",  kind: "directed",      reversed: false },
  { glyph: "<--",  kind: "directed",      reversed: true  },
  { glyph: "..",   kind: "dependency",    reversed: false },
  { glyph: "--",   kind: "association",   reversed: false },
];

/**
 * Try to parse a relationship line. Returns an array because a single line
 * `Animal <|-- Dog, Cat` would (eventually) produce multiple rels — currently
 * we always return one element, but the array shape leaves the door open.
 */
function tryParseRelationship(line: string, lineNo: number): UmlClassRelationship[] | undefined {
  // Find a connector glyph in the line (longest match wins).
  let conn: ConnectorSpec | undefined;
  let connStart = -1;
  for (const c of CONNECTORS) {
    const idx = findConnector(line, c.glyph);
    if (idx >= 0 && (connStart < 0 || idx < connStart || (idx === connStart && c.glyph.length > (conn?.glyph.length ?? 0)))) {
      // Prefer the earliest connector; on tie, the longest glyph wins.
      if (connStart < 0 || idx < connStart) {
        conn = c; connStart = idx;
      } else if (idx === connStart && c.glyph.length > (conn?.glyph.length ?? 0)) {
        conn = c;
      }
    }
  }
  if (!conn || connStart < 0) return undefined;

  let left = line.slice(0, connStart).trim();
  let right = line.slice(connStart + conn.glyph.length).trim();

  // Trailing label after `:` on the right side.
  let label: string | undefined;
  const colon = right.lastIndexOf(":");
  // Only treat `:` as the label separator if it's at the top level (no `(` open).
  if (colon >= 0 && balancedTo(right, colon)) {
    const tail = right.slice(colon + 1).trim();
    if (tail.length) {
      const q = matchQuoted(tail);
      label = q ? q.value : tail;
    }
    right = right.slice(0, colon).trim();
  }

  // Optional ends: `"mult" id "mult" role …`. Pull leading quoted end off the
  // left, and the trailing quoted end off the right (post-`right`).
  // Author writes either `id` or `"1" id` or `id "1"` — we accept all.
  const leftParse = splitEndedSide(left, "left");
  left = leftParse.id;
  const sourceMult: string | undefined = leftParse.mult;
  const sourceRole: string | undefined = leftParse.role;

  const rightParse = splitEndedSide(right, "right");
  right = rightParse.id;
  const targetMult: string | undefined = rightParse.mult;
  const targetRole: string | undefined = rightParse.role;

  if (!left || !right) {
    throw new UmlClassParseError(`malformed relationship (could not locate both endpoints)`, lineNo);
  }

  let fromId = left;
  let toId = right;
  let sm = sourceMult, tm = targetMult, sr = sourceRole, tr = targetRole;
  if (conn.reversed) {
    [fromId, toId] = [toId, fromId];
    [sm, tm] = [tm, sm];
    [sr, tr] = [tr, sr];
  }

  return [{
    from: fromId,
    to: toId,
    kind: conn.kind,
    ...(label ? { label } : {}),
    ...(sm ? { sourceMult: sm } : {}),
    ...(tm ? { targetMult: tm } : {}),
    ...(sr ? { sourceRole: sr } : {}),
    ...(tr ? { targetRole: tr } : {}),
  }];
}

function splitEndedSide(s: string, side: "left" | "right"): { id: string; mult?: string; role?: string } {
  // Cases we accept:
  //   `id`
  //   `"mult" id`              (multiplicity-then-id — left side common)
  //   `id "mult"`              (id-then-multiplicity)
  //   `"mult" id role`         (multiplicity + role)
  //   `id "mult" role`
  //   `+role id`               (PlantUML role-prefix uncommon; accepted as id-only)
  // The id is the *bare identifier* — we locate it as the unique [A-Za-z_][\w.]* token.
  const tokens = tokenise(s);
  let id = "";
  let mult: string | undefined;
  let role: string | undefined;
  for (const tok of tokens) {
    if (tok.kind === "quoted") {
      if (mult === undefined) mult = tok.value;
      else role = tok.value;
    } else if (tok.kind === "ident") {
      if (!id) id = tok.value;
      else if (!role) role = tok.value;
    }
  }
  void side; // currently no left/right asymmetry; kept for future tuning.
  return { id, ...(mult ? { mult } : {}), ...(role ? { role } : {}) };
}

interface Token { kind: "quoted" | "ident"; value: string }

function tokenise(s: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === " " || ch === "\t") { i++; continue; }
    if (ch === '"' || ch === "“" || ch === "「" || ch === "『" || ch === "«") {
      const q = matchQuoted(s.slice(i));
      if (q) { out.push({ kind: "quoted", value: q.value }); i += q.length; continue; }
    }
    const m = /^[A-Za-z_][\w.]*/.exec(s.slice(i));
    if (m) { out.push({ kind: "ident", value: m[0] }); i += m[0].length; continue; }
    i++; // skip stray punctuation
  }
  return out;
}

// ─── Connector-finding ────────────────────────────────────────

function findConnector(line: string, glyph: string): number {
  // Search for glyph as a substring, but require it not be embedded in a longer
  // run of `-` / `.` / `<` / `>` / `|` / `*` / `o` of the same type.
  let from = 0;
  while (true) {
    const idx = line.indexOf(glyph, from);
    if (idx < 0) return -1;
    const before = idx > 0 ? line[idx - 1] : "";
    const after = idx + glyph.length < line.length ? line[idx + glyph.length] : "";
    // Disallow extension on either side with chars that would form a longer
    // connector token (e.g. `<--` inside `<|--`).
    const isConnectorChar = (c: string) => "<>|*o-=.".includes(c);
    if (!isConnectorChar(before) && !isConnectorChar(after)) return idx;
    from = idx + 1;
  }
}

// ─── Validation passes ────────────────────────────────────────

function validateGeneralizationAcyclicity(ast: UmlClassAst): void {
  // Build adjacency of generalization + realization (child → parent).
  const adj = new Map<string, string[]>();
  for (const r of ast.relationships) {
    if (r.kind === "generalization" || r.kind === "realization") {
      // Source extends target; arrow source = child, target = parent.
      const list = adj.get(r.from) ?? [];
      list.push(r.to);
      adj.set(r.from, list);
    }
  }
  // DFS from every node looking for a back-edge.
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map<string, number>();
  for (const id of adj.keys()) colour.set(id, WHITE);
  const cycle: string[] = [];
  function dfs(node: string, stack: string[]): boolean {
    colour.set(node, GREY);
    stack.push(node);
    for (const next of adj.get(node) ?? []) {
      const c = colour.get(next) ?? WHITE;
      if (c === GREY) {
        const startIdx = stack.indexOf(next);
        cycle.push(...stack.slice(startIdx), next);
        return true;
      }
      if (c === WHITE && dfs(next, stack)) return true;
    }
    stack.pop();
    colour.set(node, BLACK);
    return false;
  }
  for (const id of adj.keys()) {
    if (colour.get(id) === WHITE && dfs(id, [])) {
      const path = cycle.join(" → ");
      throw new UmlClassParseError(
        `generalization cycle detected: ${path} — a classifier cannot be its own ancestor`
      );
    }
  }
}

function validateRealizationTargets(ast: UmlClassAst): void {
  for (const r of ast.relationships) {
    if (r.kind !== "realization") continue;
    const target = ast.classifiers.find((c) => c.id === r.to);
    if (target && target.kind !== "interface") {
      ast.warnings.push(
        `Realization target "${r.to}" is not an «interface» — consider marking it so.`
      );
    }
  }
}

function emitAutoCreatedWarning(ast: UmlClassAst): void {
  const auto = ast.classifiers.filter((c) => c.autoCreated).map((c) => c.id);
  if (auto.length > 0) {
    ast.warnings.push(
      `Auto-created classifier(s) from arc references: ${auto.join(", ")}. Declare them explicitly if intentional.`
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function stripComment(line: string): string {
  // Strip trailing comments. NEVER inside a quoted string and NEVER inside a
  // `{ ... }` member block (where `#` is the UML "protected" visibility glyph).
  //
  // Rules:
  //   `//` and `%%` (Mermaid) — comment anywhere (outside quotes/braces).
  //   `'` — comment only when first non-whitespace char (PlantUML convention).
  //   `#` — comment only when (a) OUTSIDE any `{ … }` brace block, AND
  //         (b) preceded by at least one non-whitespace + whitespace token
  //         (so leading-`#` whole-line comments must use `//`/`%%`/`'`).
  let inQuote = false;
  let quoteCh = "";
  let braceDepth = 0;
  let seenContent = false;
  let prevWasSpace = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuote) {
      if (ch === quoteCh) inQuote = false;
      continue;
    }
    if (ch === '"' || ch === "“" || ch === "「" || ch === "『" || ch === "«") {
      inQuote = true;
      quoteCh = closingQuote(ch);
      seenContent = true; prevWasSpace = false;
      continue;
    }
    if (ch === "{") { braceDepth++; seenContent = true; prevWasSpace = false; continue; }
    if (ch === "}") { if (braceDepth > 0) braceDepth--; seenContent = true; prevWasSpace = false; continue; }
    if (braceDepth === 0) {
      if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
      if (ch === "%" && line[i + 1] === "%") return line.slice(0, i);
      if (ch === "'" && i === firstNonSpace(line)) return ""; // PlantUML line-only comment
      if (ch === "#" && seenContent && prevWasSpace) return line.slice(0, i);
    }
    const isSpace = ch === " " || ch === "\t";
    if (!isSpace) seenContent = true;
    prevWasSpace = isSpace;
  }
  return line;
}

function closingQuote(open: string): string {
  switch (open) {
    case '"': return '"';
    case "“": return "”";
    case "「": return "」";
    case "『": return "』";
    case "«": return "»";
    default: return open;
  }
}

function firstNonSpace(s: string): number {
  for (let i = 0; i < s.length; i++) if (s[i] !== " " && s[i] !== "\t") return i;
  return -1;
}

interface Quoted { value: string; length: number }

/** Match a leading quoted string in `s` (straight or CJK quotes). */
function matchQuoted(s: string): Quoted | undefined {
  if (!s) return undefined;
  const open = s[0]!;
  if (open !== '"' && open !== "“" && open !== "「" && open !== "『") return undefined;
  const close = closingQuote(open);
  const end = s.indexOf(close, 1);
  if (end < 0) return undefined;
  return { value: s.slice(1, end), length: end + 1 };
}

interface Stereotype { value: string; length: number }

function matchStereotype(s: string): Stereotype | undefined {
  if (!s) return undefined;
  if (s.startsWith("«")) {
    const end = s.indexOf("»", 1);
    if (end < 0) return undefined;
    return { value: s.slice(1, end).trim(), length: end + 1 };
  }
  if (s.startsWith("<<")) {
    const end = s.indexOf(">>", 2);
    if (end < 0) return undefined;
    return { value: s.slice(2, end).trim(), length: end + 2 };
  }
  return undefined;
}

function matchDirective(line: string, name: string): boolean {
  return new RegExp(`^${name}\\s*:`, "i").test(line);
}

function afterColon(line: string): string {
  const i = line.indexOf(":");
  return i < 0 ? "" : line.slice(i + 1).trim();
}

function visibilityFromGlyph(g: string): UmlClassVisibility {
  switch (g) {
    case "+": return "public";
    case "-": return "private";
    case "#": return "protected";
    case "~": return "package";
    default: return "public";
  }
}

function matchingCloseParen(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "(" || ch === "<" || ch === "[") depth++;
    else if (ch === ")" || ch === ">" || ch === "]") depth--;
    if (ch === sep && depth === 0) { out.push(buf); buf = ""; }
    else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

function balancedTo(s: string, idx: number): boolean {
  let depth = 0;
  for (let i = 0; i < idx; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
  }
  return depth === 0;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

/**
 * Convert Mermaid tilde-generics to angle brackets: `List~int~` → `List<int>`,
 * `Map~String,int~` → `Map<String,int>`, nested `List~List~int~~` →
 * `List<List<int>>`. A `~` opens unless it closes an open level and is followed
 * by a delimiter (`~`, `,`, `)`, `>`, `]`, space, or end). If the tildes don't
 * balance, the original string is returned unchanged (so a stray `~` is safe).
 */
function normalizeGenerics(s: string): string {
  if (!s.includes("~")) return s;
  let out = "";
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "~") {
      const next = s[i + 1] ?? "";
      const isClose = depth > 0 && (next === "" || "~,)>] \t".includes(next));
      if (isClose) { out += ">"; depth--; }
      else { out += "<"; depth++; }
    } else {
      out += ch;
    }
  }
  return depth === 0 ? out : s;
}
