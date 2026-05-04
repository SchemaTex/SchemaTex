/**
 * Smart-quote-aware string helpers shared across parsers.
 *
 * Many human writers (and most LLM outputs in non-English locales) use
 * Unicode quote pairs rather than ASCII `"`. We accept all common pairs:
 *
 *   "..."    ASCII straight double
 *   '...'    ASCII straight single
 *   "..."    Unicode curly double (U+201C/U+201D)
 *   '...'    Unicode curly single (U+2018/U+2019)
 *   «...»    French/Spanish guillemets (U+00AB/U+00BB)
 *   「...」  CJK corner brackets (U+300C/U+300D)
 *   『...』  CJK white corner brackets (U+300E/U+300F)
 *
 * Inside ASCII-quoted strings, `\"` and `\'` are recognised as escapes so
 * authors can include literal quotes without breaking the parser.
 */

export const QUOTE_PAIRS: Record<string, string> = {
  '"': '"',
  "'": "'",
  "“": "”", // " "
  "‘": "’", // ' '
  "«": "»", // « »
  "「": "」", // 「 」
  "『": "』", // 『 』
};

const OPEN_QUOTES = new Set(Object.keys(QUOTE_PAIRS));

export function isOpenQuote(ch: string): boolean {
  return OPEN_QUOTES.has(ch);
}

export function isAnyQuote(ch: string): boolean {
  if (OPEN_QUOTES.has(ch)) return true;
  for (const close of Object.values(QUOTE_PAIRS)) if (ch === close) return true;
  return false;
}

/**
 * Find the index of the closing quote that matches the opener at `openIdx`.
 * For ASCII openers (" '), supports `\"`/`\'` escapes inside the string.
 * Returns -1 if no closer is found.
 */
export function findClosingQuote(s: string, openIdx: number): number {
  const open = s[openIdx];
  if (open === undefined || !OPEN_QUOTES.has(open)) return -1;
  const close = QUOTE_PAIRS[open]!;
  const escapable = open === '"' || open === "'";
  for (let i = openIdx + 1; i < s.length; i++) {
    const ch = s[i];
    if (escapable && ch === "\\" && i + 1 < s.length) {
      i++;
      continue;
    }
    if (ch === close) return i;
  }
  return -1;
}

/**
 * Extract a quoted string starting at `start` (must point at an opener).
 * Returns the unescaped inner value plus the index *after* the closer.
 * Returns null if `start` is not on an opener.
 * Throws if the opener is found but no closer is.
 */
export function extractQuotedString(
  s: string,
  start: number
): { value: string; end: number } | null {
  const open = s[start];
  if (open === undefined || !OPEN_QUOTES.has(open)) return null;
  const closeIdx = findClosingQuote(s, start);
  if (closeIdx < 0) {
    throw new Error(`unterminated quoted string starting at index ${start}`);
  }
  const raw = s.slice(start + 1, closeIdx);
  const value = open === '"' || open === "'" ? unescapeAscii(raw, open) : raw;
  return { value, end: closeIdx + 1 };
}

function unescapeAscii(s: string, quote: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && i + 1 < s.length) {
      const next = s[i + 1]!;
      if (next === quote || next === "\\") {
        out += next;
        i++;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

/**
 * Find the first quoted substring anywhere on `line` and return its inner
 * value. Replaces the common idiom `line.match(/"([^"]*)"/)` so that smart
 * quotes are also accepted.
 */
export function matchQuotedTitle(line: string): string | undefined {
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (OPEN_QUOTES.has(ch)) {
      try {
        const r = extractQuotedString(line, i);
        if (r) return r.value;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * If `s` is wrapped in any recognised quote pair, return the inner value;
 * otherwise return `s` (trimmed). Whitespace outside the quotes is ignored.
 */
export function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length < 2) return t;
  const open = t[0]!;
  if (!OPEN_QUOTES.has(open)) return t;
  const expected = QUOTE_PAIRS[open]!;
  if (t[t.length - 1] !== expected) return t;
  const inner = t.slice(1, -1);
  return open === '"' || open === "'" ? unescapeAscii(inner, open) : inner;
}
