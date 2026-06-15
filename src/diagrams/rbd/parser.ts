/**
 * Reliability Block Diagram parser — DSL text → RbdAst.
 * Per docs/reference/50-RBD-STANDARD.md §4.
 *
 * Grammar (brace-delimited, success-logic nesting):
 *   rbd ["Title"]
 *     series   { <structure>* }
 *     parallel { <structure>* }
 *     kofn k/n { <structure>* }
 *     block ID ["Label"] (R=0.99 | p=0.01 | R=99%)
 *
 * A bare top-level list of structures is wrapped in an implicit `series`.
 * The `block` keyword is required for leaves so attribute scanning is
 * unambiguous (it stops at the next keyword / brace).
 */

import type { RbdAst, RbdBlock, RbdGroup, RbdStructure } from "./types";

/** Fold CJK / curly quote pairs to straight quotes so the tokenizer is simple. */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[“”„«»「」『』＂]/g, '"')
    .replace(/[‘’‚＇]/g, "'");
}

export class RbdParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RbdParseError";
  }
}

const HEADER_RE = /^\s*(rbd|reliability(?:blockdiagram)?|reliability-block-diagram)\b/i;

type Tok =
  | { t: "lbrace" }
  | { t: "rbrace" }
  | { t: "word"; v: string }
  | { t: "string"; v: string };

const GROUP_KW = new Set(["series", "parallel", "kofn", "k-of-n", "voting"]);

export function parseRbd(text: string): RbdAst {
  const normalized = normalizeQuotes(text);
  const lines = normalized.split("\n");

  // ── Header line: keyword + optional quoted title ──
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim() === "") continue;
    if (!HEADER_RE.test(lines[i]!)) {
      throw new RbdParseError(
        "RBD must start with 'rbd' (or 'reliability'). Example: rbd \"My System\""
      );
    }
    headerIdx = i;
    break;
  }
  if (headerIdx < 0) throw new RbdParseError("Empty RBD input.");

  const warnings: string[] = [];
  const metadata: Record<string, string> = {};
  const headerRest = lines[headerIdx]!.replace(HEADER_RE, "").trim();
  const title = extractQuoted(headerRest);

  // ── Body → token stream (comments stripped) ──
  const body = lines.slice(headerIdx + 1).join("\n");
  const tokens = tokenize(stripBodyDirectives(body, metadata));

  // ── Recursive-descent parse ──
  const seenIds = new Set<string>();
  let pos = 0;

  const peek = (): Tok | undefined => tokens[pos];

  const parseBlock = (): RbdBlock => {
    // current token is the id word
    const idTok = tokens[pos++]!;
    if (idTok.t !== "word") throw new RbdParseError("Expected a block id.");
    const id = idTok.v;
    if (seenIds.has(id)) warnings.push(`Duplicate block id "${id}" — later definition rendered, ids should be unique.`);
    seenIds.add(id);

    let label: string | undefined;
    let R: number | undefined;

    // Optional quoted label immediately after the id.
    if (peek()?.t === "string") {
      label = (tokens[pos++] as { t: "string"; v: string }).v;
    }
    // Attribute words: R=…, p=…, prob=…, or a bare numeric reliability.
    while (peek()?.t === "word") {
      const w = (peek() as { t: "word"; v: string }).v;
      const attr = parseAttr(w);
      if (!attr) break; // next keyword / id — end of this block
      pos++;
      if (attr.key === "p") R = clamp01(1 - attr.value, w, warnings);
      else R = clamp01(attr.value, w, warnings);
    }

    return { kind: "block", id, ...(label !== undefined ? { label } : {}), ...(R !== undefined ? { R } : {}) };
  };

  const parseGroup = (kwRaw: string): RbdGroup => {
    const kw = kwRaw.toLowerCase();
    let k: number | undefined;
    let n: number | undefined;
    if (kw === "kofn" || kw === "k-of-n" || kw === "voting") {
      // Next word holds "k/n" (or "k" then "/n" already glued).
      const spec = peek();
      if (spec?.t === "word" && /^\d+\s*\/\s*\d+$/.test(spec.v)) {
        pos++;
        const [ks, ns] = spec.v.split("/");
        k = parseInt(ks!, 10);
        n = parseInt(ns!, 10);
      } else {
        throw new RbdParseError(`'${kwRaw}' needs a k/n threshold, e.g. 'kofn 2/3 { … }'.`);
      }
    }
    if (peek()?.t !== "lbrace") throw new RbdParseError(`Expected '{' after '${kwRaw}'.`);
    pos++; // consume {
    const children = parseList();
    if (peek()?.t !== "rbrace") throw new RbdParseError(`Unclosed '${kwRaw}' group — missing '}'.`);
    pos++; // consume }

    if (children.length === 0) warnings.push(`Empty '${kwRaw}' group ignored.`);

    const kind = kw === "series" ? "series" : "parallel";
    const isKofn = kw === "kofn" || kw === "k-of-n" || kw === "voting";
    if (isKofn) {
      const total = n ?? children.length;
      let thr = k ?? total;
      if (thr > total) {
        warnings.push(`k-of-n threshold k=${thr} exceeds n=${total} — clamped to ${total}.`);
        thr = total;
      }
      if (thr < 1) {
        warnings.push(`k-of-n threshold k=${thr} < 1 — clamped to 1.`);
        thr = 1;
      }
      return { kind: "kofn", k: thr, n: total, children };
    }
    return { kind, children };
  };

  const parseStructure = (): RbdStructure => {
    const tok = peek();
    if (!tok) throw new RbdParseError("Unexpected end of input.");
    if (tok.t === "rbrace") throw new RbdParseError("Unexpected '}'.");
    if (tok.t === "string") throw new RbdParseError(`Unexpected quoted text "${tok.v}" — labels attach to a block.`);
    if (tok.t === "lbrace") throw new RbdParseError("Unexpected '{' — a group keyword (series/parallel/kofn) must precede it.");
    const w = tok.v;
    if (GROUP_KW.has(w.toLowerCase())) {
      pos++;
      return parseGroup(w);
    }
    if (w.toLowerCase() === "block") {
      pos++;
      return parseBlock();
    }
    // Lenient: a bare id (LLM forgot `block`) is treated as a block.
    return parseBlock();
  };

  function parseList(): RbdStructure[] {
    const items: RbdStructure[] = [];
    while (pos < tokens.length && peek()?.t !== "rbrace") {
      items.push(parseStructure());
    }
    return items;
  }

  const top = parseList();
  if (pos < tokens.length) throw new RbdParseError("Unbalanced '}' in RBD body.");

  let root: RbdStructure;
  if (top.length === 0) {
    throw new RbdParseError("RBD has no blocks. Add at least one `block ID R=…`.");
  } else if (top.length === 1 && top[0]!.kind !== "block") {
    root = top[0]!;
  } else {
    root = { kind: "series", children: top };
  }

  return {
    type: "rbd",
    ...(title ? { title } : {}),
    root,
    warnings,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

// ─── Tokenizer ────────────────────────────────────────────────

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = src.length;
  const isQuote = (c: string): boolean => c === '"' || c === "'";
  while (i < n) {
    const c = src[i]!;
    if (c === "#") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (c === "{") { out.push({ t: "lbrace" }); i++; continue; }
    if (c === "}") { out.push({ t: "rbrace" }); i++; continue; }
    if (isQuote(c)) {
      const close = c;
      let v = "";
      i++;
      while (i < n && src[i] !== close) { v += src[i]; i++; }
      i++; // closing quote (tolerate missing — EOF ends the string)
      out.push({ t: "string", v: v.trim() });
      continue;
    }
    // word: run of non-space, non-brace, non-quote chars
    let v = "";
    while (i < n && !/\s/.test(src[i]!) && src[i] !== "{" && src[i] !== "}" && !isQuote(src[i]!)) {
      v += src[i];
      i++;
    }
    out.push({ t: "word", v });
  }
  return out;
}

// ─── Helpers ──────────────────────────────────────────────────

/** Pull `key: value` directive lines (metadata) out of the body before tokenizing. */
function stripBodyDirectives(body: string, metadata: Record<string, string>): string {
  return body
    .split("\n")
    .filter((line) => {
      const m = line.match(/^\s*(title|standard|note)\s*:\s*(.+)$/i);
      if (m) {
        const key = m[1]!.toLowerCase();
        if (key !== "title") metadata[key] = m[2]!.trim();
        else metadata.title = m[2]!.trim();
        return false;
      }
      return true;
    })
    .join("\n");
}

function extractQuoted(s: string): string | undefined {
  const m = s.match(/^["']([^"']*)["']/);
  if (m) return m[1]!.trim();
  return s.length > 0 ? s.trim() : undefined;
}

interface Attr { key: "R" | "p"; value: number }

/** Parse `R=0.99`, `p=1%`, `prob:0.9`, or a bare number (→ R). Returns null for non-attrs. */
function parseAttr(w: string): Attr | null {
  const m = w.match(/^(R|r|p|prob|q)\s*[=:]\s*(.+)$/);
  if (m) {
    const key = m[1]!.toLowerCase();
    const value = parseNum(m[2]!);
    if (value === undefined) return null;
    // q (unreliability) and p (failure prob) both mean "probability of failure".
    return { key: key === "p" || key === "q" ? "p" : "R", value };
  }
  // Bare numeric → reliability.
  const bare = parseNum(w);
  if (bare !== undefined) return { key: "R", value: bare };
  return null;
}

function parseNum(s: string): number | undefined {
  const t = s.trim();
  if (/%$/.test(t)) {
    const v = parseFloat(t.slice(0, -1));
    return Number.isFinite(v) ? v / 100 : undefined;
  }
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : undefined;
}

function clamp01(v: number, raw: string, warnings: string[]): number {
  if (v < 0) { warnings.push(`Reliability ${raw} < 0 — clamped to 0.`); return 0; }
  if (v > 1) { warnings.push(`Reliability ${raw} > 1 — clamped to 1.`); return 1; }
  return v;
}
