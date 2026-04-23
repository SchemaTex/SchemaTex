import type { InlineToken } from "../../core/types";

/**
 * Inline markdown tokenizer for mindmap labels.
 *
 * Supported (Phase A):
 *   **bold**, *italic*
 *   `code`
 *   [text](url)
 *   leading `[ ]` / `[x]` → checkbox token (task list)
 *
 * Phase B adds wrap() for multi-line layout.
 *
 * Deliberately tiny — ~150 lines, no dep on marked/markdown-it. Not a
 * conforming CommonMark parser: nested bold+italic within links works, but
 * we don't try to handle every edge case (unbalanced `**`, escapes in code,
 * etc.). Unmatched delimiters fall through as literal text.
 */

const RE_TASK = /^\[( |x|X)\]\s+(.*)$/;

export function tokenizeInline(raw: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let text = raw;

  // Leading task-list checkbox
  const task = text.match(RE_TASK);
  if (task) {
    tokens.push({ kind: "checkbox", checked: task[1].toLowerCase() === "x" });
    text = task[2];
  }

  parseInto(text, tokens, { bold: false, italic: false });
  return tokens;
}

interface Style {
  bold: boolean;
  italic: boolean;
}

// Walks `src` appending tokens into `out`. Handles code/link/bold/italic.
function parseInto(src: string, out: InlineToken[], style: Style): void {
  let i = 0;
  let plain = "";
  const flushPlain = () => {
    if (plain.length === 0) return;
    out.push({ kind: "text", value: plain, bold: style.bold || undefined, italic: style.italic || undefined });
    plain = "";
  };

  while (i < src.length) {
    const ch = src[i];

    // `code` — terminated by matching backtick; no formatting inside
    if (ch === "`") {
      const end = src.indexOf("`", i + 1);
      if (end > i) {
        flushPlain();
        out.push({ kind: "code", value: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // [text](url)
    if (ch === "[") {
      const closeBracket = findUnescaped(src, "]", i + 1);
      if (closeBracket > 0 && src[closeBracket + 1] === "(") {
        const closeParen = findUnescaped(src, ")", closeBracket + 2);
        if (closeParen > 0) {
          flushPlain();
          const inner: InlineToken[] = [];
          parseInto(src.slice(i + 1, closeBracket), inner, style);
          out.push({ kind: "link", href: src.slice(closeBracket + 2, closeParen), value: inner });
          i = closeParen + 1;
          continue;
        }
      }
    }

    // **bold**
    if (ch === "*" && src[i + 1] === "*") {
      const end = src.indexOf("**", i + 2);
      if (end > i) {
        flushPlain();
        parseInto(src.slice(i + 2, end), out, { ...style, bold: true });
        i = end + 2;
        continue;
      }
    }

    // *italic*
    if (ch === "*") {
      const end = src.indexOf("*", i + 1);
      if (end > i && src[end + 1] !== "*") {
        flushPlain();
        parseInto(src.slice(i + 1, end), out, { ...style, italic: true });
        i = end + 1;
        continue;
      }
    }

    plain += ch;
    i++;
  }
  flushPlain();
}

function findUnescaped(s: string, ch: string, from: number): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === ch) return i;
  }
  return -1;
}

// ─── Measurement ─────────────────────────────────────────────────────────

// Per-em width multipliers. Heuristic — refined by font but single-factor is
// close enough for layout purposes (we give labels some padding anyway).
const EM_REGULAR = 0.58;
const EM_BOLD = 0.62;
const EM_CODE = 0.62;
const CHECKBOX_EM = 1.05; // checkbox + trailing space, in units of fontSize

export function measureTokens(tokens: readonly InlineToken[], fontSize: number): number {
  let w = 0;
  for (const t of tokens) {
    w += tokenWidth(t, fontSize);
  }
  return w;
}

function tokenWidth(t: InlineToken, fs: number): number {
  switch (t.kind) {
    case "text": {
      const em = t.bold ? EM_BOLD : EM_REGULAR;
      return t.value.length * fs * em;
    }
    case "code":
      // +4px for code background horizontal padding (2px each side)
      return t.value.length * fs * EM_CODE + 4;
    case "link":
      return measureTokens(t.value, fs);
    case "checkbox":
      return fs * CHECKBOX_EM;
  }
}

// ─── Plain-text extraction (for aria-label / title / tooltip) ────────────

export function tokensToPlainText(tokens: readonly InlineToken[]): string {
  let out = "";
  for (const t of tokens) {
    switch (t.kind) {
      case "text":
      case "code":
        out += t.value;
        break;
      case "link":
        out += tokensToPlainText(t.value);
        break;
      case "checkbox":
        out += t.checked ? "[x] " : "[ ] ";
        break;
    }
  }
  return out;
}

// ─── Phase B: line wrapping ──────────────────────────────────────────────

export interface TokenLine {
  tokens: InlineToken[];
  width: number;
}

/**
 * Wrap tokens to `maxWidth`. Breaks at word boundaries within text tokens;
 * code/link/checkbox are atomic (not split). Words longer than maxWidth go
 * on their own line (overflow rather than hyphenate).
 *
 * Returns at least one line (possibly empty if tokens are empty).
 */
export function wrapTokens(
  tokens: readonly InlineToken[],
  maxWidth: number,
  fontSize: number
): TokenLine[] {
  const lines: TokenLine[] = [];
  let line: InlineToken[] = [];
  let lineW = 0;

  const pushLine = () => {
    lines.push({ tokens: line, width: lineW });
    line = [];
    lineW = 0;
  };

  const pushAtomic = (t: InlineToken, w: number) => {
    if (lineW > 0 && lineW + w > maxWidth) pushLine();
    line.push(t);
    lineW += w;
  };

  for (const t of tokens) {
    if (t.kind === "text") {
      // Split on spaces but preserve them by appending to preceding word.
      const words = splitWordsWithTrailingSpace(t.value);
      for (const w of words) {
        const wt: InlineToken = { kind: "text", value: w, bold: t.bold, italic: t.italic };
        const ww = tokenWidth(wt, fontSize);
        if (lineW > 0 && lineW + ww > maxWidth) {
          // Current word wraps to new line; strip leading space
          pushLine();
          const trimmed = w.replace(/^ +/, "");
          if (trimmed.length === 0) continue;
          const tt: InlineToken = { kind: "text", value: trimmed, bold: t.bold, italic: t.italic };
          line.push(tt);
          lineW = tokenWidth(tt, fontSize);
        } else {
          line.push(wt);
          lineW += ww;
        }
      }
    } else {
      pushAtomic(t, tokenWidth(t, fontSize));
    }
  }
  pushLine();
  return lines;
}

// Split "foo bar  baz" into ["foo ", "bar ", " baz"]-ish — each word keeps
// its trailing space so measurements stay stable across the split.
function splitWordsWithTrailingSpace(s: string): string[] {
  if (s.length === 0) return [];
  const out: string[] = [];
  const re = /(\S+\s*)|(\s+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out.push(m[0]);
  }
  return out.length > 0 ? out : [s];
}
