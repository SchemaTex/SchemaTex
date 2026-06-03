/**
 * Causal Loop Diagram (causalloop / cld) parser — flat link DSL.
 * Per docs/reference/41-CAUSAL-LOOP-STANDARD.md §"DSL sketch".
 *
 * Header keyword: `causalloop` or `cld`, optional quoted title.
 *
 * Links (one per line):
 *   A -> B : +            positive polarity (X,Y move the same way)
 *   A -> B : -            negative polarity (opposite)
 *   A -> B : s            alias for +  (same)        ─┐ normalised to +/−
 *   A -> B : o            alias for −  (opposite)    ─┘
 *   A -> B : same | opposite        word aliases
 *   "Adoption rate" -> Adopters : +  delay           delay hash marks
 *   A -> B : + ~delay                                trailing ~delay also ok
 *
 * Variables are implicit from first mention; an explicit declaration line
 *   var "Adoption rate"
 * lets the author fix the canonical label / ordering.
 *
 * Loop phrases (optional; loops are auto-named R1/B1 by detection order):
 *   loop R1 "Word of mouth"
 *
 * Quotes: any pair accepted (ASCII, curly, CJK 「」, guillemets) via core/quotes.
 * Unquoted bareword ids are allowed for single-token names.
 *
 * Zero runtime deps. Typed ParseError.
 */

import { extractQuotedString, isOpenQuote, stripQuotes } from "../../core/quotes";
import type {
  CausalLink,
  CausalLoopAst,
  CausalPolarity,
  CausalVariable,
} from "./types";

export class CausalLoopParseError extends Error {
  constructor(
    message: string,
    public line?: number
  ) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "CausalLoopParseError";
  }
}

// ─── Public entry ─────────────────────────────────────────────

export function parseCausalLoop(text: string): CausalLoopAst {
  const ast: CausalLoopAst = {
    type: "causalloop",
    layout: "auto",
    variables: [],
    links: [],
    annotations: [],
    warnings: [],
  };

  const lines = text.split(/\r?\n/);
  let i = 0;

  // ── Header ──
  let headerSeen = false;
  for (; i < lines.length; i++) {
    const t = stripComment(lines[i] ?? "").trim();
    if (t === "") continue;
    const h = /^(causalloop|cld)\b(.*)$/i.exec(t);
    if (h) {
      const after = h[2]!.trim();
      if (after) {
        const title = stripLeadingQuoted(after);
        if (title !== undefined) ast.title = title;
      }
      headerSeen = true;
      i++;
      break;
    }
    // Implicit header — start parsing the body at this line.
    break;
  }
  if (!headerSeen && i >= lines.length) {
    throw new CausalLoopParseError(
      "empty diagram — expected a 'causalloop' (or 'cld') header and at least one link"
    );
  }

  // ── Body ──
  for (; i < lines.length; i++) {
    const t = stripComment(lines[i] ?? "").trim();
    if (t === "") continue;
    const lineNo = i + 1;

    // Directive: layout.
    const lm = /^layout\s*:\s*(\S+)/i.exec(t);
    if (lm) {
      const v = lm[1]!.toLowerCase();
      if (v === "auto" || v === "circle") ast.layout = v;
      else ast.warnings.push(`Line ${lineNo}: unknown layout "${v}" — using auto.`);
      continue;
    }

    // Variable declaration.
    if (/^var\b/i.test(t)) {
      parseVarLine(ast, t.replace(/^var\b/i, "").trim(), lineNo);
      continue;
    }

    // Loop phrase annotation.
    if (/^loop\b/i.test(t)) {
      parseLoopLine(ast, t.replace(/^loop\b/i, "").trim(), lineNo);
      continue;
    }

    // Otherwise: a causal link.
    if (t.includes("->")) {
      parseLinkLine(ast, t, lineNo);
      continue;
    }

    ast.warnings.push(`Line ${lineNo}: unrecognised line: "${truncate(t, 80)}"`);
  }

  validate(ast);
  return ast;
}

// ─── Line parsers ─────────────────────────────────────────────

function parseVarLine(ast: CausalLoopAst, rest: string, lineNo: number): void {
  if (!rest) throw new CausalLoopParseError("'var' needs a variable name", lineNo);
  const { value } = takeName(rest, lineNo);
  upsertVariable(ast, value, false);
}

function parseLoopLine(ast: CausalLoopAst, rest: string, lineNo: number): void {
  // loop R1 "Word of mouth"
  const m = /^([RB]\d+)\s+(.+)$/i.exec(rest);
  if (!m) {
    throw new CausalLoopParseError(
      `'loop' needs a loop id (e.g. R1, B1) and a phrase, got "${truncate(rest, 60)}"`,
      lineNo
    );
  }
  const id = m[1]!.toUpperCase();
  const phrase = stripQuotes(m[2]!.trim());
  ast.annotations.push({ id, phrase });
}

function parseLinkLine(ast: CausalLoopAst, t: string, lineNo: number): void {
  const arrowIdx = topLevelArrow(t);
  if (arrowIdx < 0) {
    throw new CausalLoopParseError(`malformed link (expected '->'): "${truncate(t, 60)}"`, lineNo);
  }
  const fromRaw = t.slice(0, arrowIdx).trim();
  let rhs = t.slice(arrowIdx + 2).trim();
  if (!fromRaw) throw new CausalLoopParseError("link is missing a source variable", lineNo);

  // The target name comes first; polarity is declared after a `:`.
  const { value: target, rest: afterTarget } = takeName(rhs, lineNo);
  rhs = afterTarget.trim();

  const from = takeName(fromRaw, lineNo).value;
  if (!from) throw new CausalLoopParseError("link is missing a source variable", lineNo);
  if (!target) throw new CausalLoopParseError("link is missing a target variable", lineNo);

  // Polarity + flags from the remainder (after target).
  let delay = false;
  let label: string | undefined;
  let polRaw = "";

  // Trailing ~delay / delay flag, anywhere in the remainder.
  if (/~?\bdelay\b/i.test(rhs)) {
    delay = true;
    rhs = rhs.replace(/~?\bdelay\b/i, "").trim();
  }

  const colon = rhs.indexOf(":");
  if (colon >= 0) {
    polRaw = rhs.slice(colon + 1).trim();
    const beforeColon = rhs.slice(0, colon).trim();
    if (beforeColon) label = stripQuotes(beforeColon);
  } else if (rhs) {
    // Allow polarity without an explicit colon: `A -> B +`.
    polRaw = rhs.trim();
  }

  // Polarity token may carry a trailing label after whitespace: `+ "note"`.
  // Symbol forms (+ − -) match bare; word forms (s/o/same/opposite) need a
  // word boundary so we don't swallow the start of a label.
  const polMatch = /^([+−-]|(?:s|o|same|opposite)\b)/i.exec(polRaw);
  if (!polMatch) {
    throw new CausalLoopParseError(
      `link ${from} -> ${target} is missing a polarity (use + / − , or s/o, same/opposite)`,
      lineNo
    );
  }
  const polarity = normalisePolarity(polMatch[1]!);
  const tail = polRaw.slice(polMatch[0].length).trim();
  if (tail && label === undefined) label = stripQuotes(tail);

  upsertVariable(ast, from, true);
  upsertVariable(ast, target, true);

  const link: CausalLink = { from, to: target, polarity };
  if (delay) link.delay = true;
  if (label) link.label = label;
  ast.links.push(link);
}

// ─── Validation ───────────────────────────────────────────────

function validate(ast: CausalLoopAst): void {
  if (ast.links.length === 0) {
    throw new CausalLoopParseError(
      "a causal loop diagram needs at least one causal link (A -> B : +)"
    );
  }
  const ids = new Set(ast.variables.map((v) => v.id));
  for (const l of ast.links) {
    if (!ids.has(l.from)) throw new CausalLoopParseError(`link references unknown variable "${l.from}"`);
    if (!ids.has(l.to)) throw new CausalLoopParseError(`link references unknown variable "${l.to}"`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function upsertVariable(ast: CausalLoopAst, id: string, auto: boolean): void {
  const existing = ast.variables.find((v) => v.id === id);
  if (!existing) {
    const v: CausalVariable = { id, label: id };
    if (auto) v.autoCreated = true;
    ast.variables.push(v);
    return;
  }
  if (!auto && existing.autoCreated) existing.autoCreated = false;
}

function normalisePolarity(raw: string): CausalPolarity {
  const v = raw.toLowerCase();
  if (v === "+" || v === "s" || v === "same") return "+";
  return "-"; // "-" / "−" / "o" / "opposite"
}

/**
 * Read a name token from the start of `s`: either a quoted string (any pair)
 * or a bareword run up to a `:`, `->`, or `~`/whitespace-delimited flag.
 */
function takeName(s: string, lineNo: number): { value: string; rest: string } {
  const t = s.trimStart();
  const lead = s.length - t.length;
  if (t.length === 0) throw new CausalLoopParseError("expected a variable name", lineNo);

  const first = t[0]!;
  if (isOpenQuote(first)) {
    const q = extractQuotedString(t, 0);
    if (!q) throw new CausalLoopParseError("unterminated quoted name", lineNo);
    return { value: q.value, rest: s.slice(lead + q.end) };
  }

  // Bareword: stop at `:` (polarity sep), or whitespace.
  let end = 0;
  while (end < t.length) {
    const ch = t[end]!;
    if (ch === ":" || /\s/.test(ch)) break;
    end++;
  }
  const value = t.slice(0, end);
  if (value === "") throw new CausalLoopParseError("expected a variable name", lineNo);
  return { value, rest: s.slice(lead + end) };
}

/** Index of the first top-level `->` (outside any quote pair), or -1. */
function topLevelArrow(s: string): number {
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (isOpenQuote(ch)) {
      const q = safeQuoteEnd(s, i);
      if (q < 0) return -1;
      i = q;
      continue;
    }
    if (ch === "-" && s[i + 1] === ">") return i;
    i++;
  }
  return -1;
}

/** Absolute index just past the closing quote of the pair opened at `openIdx`, or -1. */
function safeQuoteEnd(s: string, openIdx: number): number {
  try {
    const q = extractQuotedString(s, openIdx);
    return q ? q.end : -1;
  } catch {
    return -1;
  }
}

/** If `s` begins with a quoted string, return its inner value; else undefined. */
function stripLeadingQuoted(s: string): string | undefined {
  const t = s.trimStart();
  if (t.length === 0 || !isOpenQuote(t[0]!)) return undefined;
  try {
    const q = extractQuotedString(t, 0);
    return q?.value;
  } catch {
    return undefined;
  }
}

function stripComment(line: string): string {
  let i = 0;
  while (i < line.length) {
    const ch = line[i]!;
    if (isOpenQuote(ch)) {
      const end = safeQuoteEnd(line, i);
      if (end < 0) break;
      i = end;
      continue;
    }
    if (ch === "#") return line.slice(0, i);
    if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
    i++;
  }
  return line;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
