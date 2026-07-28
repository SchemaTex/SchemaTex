/**
 * DSL preprocessing shared across all diagram parsers.
 *
 * Three cross-cutting input features are normalized here so each
 * per-diagram parser sees a consistent surface:
 *
 *   1. **LLM wrappers** — Markdown fences, leaked `<artifact>` tags, and
 *      model tool-call framing are never diagram syntax. They are removed
 *      before detection so every parser and every public entry point inherits
 *      the same recovery behavior.
 *
 *   2. **Frontmatter** — Mermaid allows a YAML-style block at the top of
 *      the input:
 *
 *          ---
 *          title: My diagram
 *          ---
 *          flowchart TD
 *            ...
 *
 *      We strip the block before the parser runs and return the parsed
 *      keys as a metadata bag. Parsers that already accept an inline title
 *      (`flowchart TD "..."`, `genogram "..."`) can merge the frontmatter
 *      title in if no inline one was provided.
 *
 *   3. **Comments** — different parsers historically supported different
 *      comment markers (`#`, `//`, Mermaid's `%%`). {@link stripLineComment}
 *      strips all three, respecting double-quoted regions so URLs with `//`
 *      and CSS-style values containing `#` don't get truncated.
 *
 * These helpers are intentionally narrow: they only do what every parser
 * needs. Diagram-specific lexing stays in each parser.
 */

export interface DslRemovalRange {
  start: number;
  end: number;
}

const ANTHROPIC_CONTROL_TAG =
  /<\/?(?:antml:)?(?:function_calls|invoke|parameter)\b[^>]*>/gi;
const DEEPSEEK_CONTROL_TAG = /<[^<>]*｜[^<>]*>/g;
const SCALAR_PARAMETER_LINE =
  /^[ \t]*<(?:antml:)?parameter\b[^>]*>[ \t]*(?:true|false|null|undefined|-?\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')[ \t]*<\/(?:antml:)?parameter>[ \t]*(?:\r?\n|$)/gim;

function blankRange(text: string, start: number, end: number): string {
  return (
    text.slice(0, start) +
    text.slice(start, end).replace(/[^\r\n]/g, " ") +
    text.slice(end)
  );
}

function mergeRemovalRanges(ranges: DslRemovalRange[]): DslRemovalRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: DslRemovalRange[] = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
      continue;
    }
    previous.end = Math.max(previous.end, range.end);
  }
  return merged;
}

function collectMatches(
  text: string,
  pattern: RegExp,
  ranges: DslRemovalRange[]
): string {
  let result = text;
  pattern.lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (start === undefined || match[0].length === 0) continue;
    const end = start + match[0].length;
    ranges.push({ start, end });
    result = blankRange(result, start, end);
  }
  return result;
}

/**
 * Locate wrappers that can never be valid Schematex DSL.
 *
 * The returned ranges refer to the original UTF-16 input. The core API blanks
 * them instead of deleting them so diagnostics and editing source ranges still
 * point at the authored text. {@link stripArtifactWrappers} uses the same
 * ranges for callers that want the compact, cleaned string.
 */
export function findArtifactWrapperRanges(text: string): DslRemovalRange[] {
  if (!text) return [];

  const ranges: DslRemovalRange[] = [];
  let working = text;

  // Markdown fence around the whole artifact. Blank it first so a nested
  // <artifact> opener becomes the first significant token for the next pass.
  const openingFence =
    /^\uFEFF?\s*```[A-Za-z0-9_-]*[ \t]*(?:\r?\n|$)/.exec(working);
  if (openingFence) {
    ranges.push({ start: 0, end: openingFence[0].length });
    working = blankRange(working, 0, openingFence[0].length);
  }
  const closingFence = /(?:^|\r?\n)[ \t]*```[ \t]*$/.exec(working);
  if (closingFence) {
    const newlineLength = closingFence[0].startsWith("\r\n")
      ? 2
      : closingFence[0].startsWith("\n")
        ? 1
        : 0;
    const start = closingFence.index + newlineLength;
    ranges.push({ start, end: working.length });
    working = blankRange(working, start, working.length);
  }

  // Only treat <artifact> as a wrapper when it is the first significant token.
  // Angle-bracket syntax elsewhere (for example circuit <ep>) stays untouched.
  const artifactOpen = /^\uFEFF?\s*<artifact\b[^>]*>[ \t]*(?:\r?\n)?/i.exec(
    working
  );
  if (artifactOpen) {
    ranges.push({ start: 0, end: artifactOpen[0].length });
    working = blankRange(working, 0, artifactOpen[0].length);

    const artifactClose = /(?:\r?\n)?[ \t]*<\/artifact>[ \t\r\n]*$/i.exec(
      working
    );
    if (artifactClose) {
      ranges.push({
        start: artifactClose.index,
        end: artifactClose.index + artifactClose[0].length,
      });
      working = blankRange(
        working,
        artifactClose.index,
        artifactClose.index + artifactClose[0].length
      );
    }
  }

  // A standalone scalar parameter line contains control metadata, not DSL.
  // Removing only its tags would leave e.g. `false` as a bogus diagram line.
  working = collectMatches(working, SCALAR_PARAMETER_LINE, ranges);
  working = collectMatches(working, ANTHROPIC_CONTROL_TAG, ranges);
  collectMatches(working, DEEPSEEK_CONTROL_TAG, ranges);

  return mergeRemovalRanges(ranges);
}

/**
 * Strip model-authored wrappers from DSL text.
 *
 * Clean input is returned byte-for-byte unchanged. This pure helper mirrors
 * the shared core preprocessing behavior and is useful to downstream callers
 * that need the normalized source itself.
 */
export function stripArtifactWrappers(text: string): string {
  const ranges = findArtifactWrapperRanges(text);
  if (ranges.length === 0) return text;
  let result = text;
  for (const range of [...ranges].reverse()) {
    result = result.slice(0, range.start) + result.slice(range.end);
  }
  return result;
}

export interface DslFrontmatter {
  /** Parsed key/value pairs from the `---` block. Empty if no block found. */
  data: Record<string, string>;
  /** Input with the frontmatter block removed, ready for the diagram parser. */
  body: string;
}

const FRONTMATTER_DELIM = /^-{3,}\s*$/;

/**
 * Strip a Mermaid-style YAML frontmatter block from the start of `text`.
 *
 * Accepts any whitespace-only or blank lines before the opening `---`. The
 * parser is deliberately tiny: one `key: value` per line, no nesting, no
 * quoted/multiline values. Anything fancier we treat as "not a frontmatter
 * block" and return the original text unchanged — better to no-op than
 * to silently swallow malformed YAML.
 */
export function parseFrontmatter(text: string): DslFrontmatter {
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === "") i++;
  if (i >= lines.length || !FRONTMATTER_DELIM.test(lines[i]!)) {
    return { data: {}, body: text };
  }
  const openIdx = i;
  i++;
  const data: Record<string, string> = {};
  while (i < lines.length && !FRONTMATTER_DELIM.test(lines[i]!)) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      i++;
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx <= 0) {
      // Malformed line inside the block — bail out, treat the whole thing
      // as not-a-frontmatter so the user sees their original input back.
      return { data: {}, body: text };
    }
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    // Strip matching surrounding quotes (single, double, or smart) without
    // pulling in the full quotes.ts helpers — frontmatter values are dumb.
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith("“") && value.endsWith("”")))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
    i++;
  }
  if (i >= lines.length) {
    // Opened a `---` block but never closed it — leave input untouched.
    return { data: {}, body: text };
  }
  // i now points at the closing `---`; body starts on the next line.
  const body = lines.slice(i + 1).join("\n");
  // If we found an opening delim but the body is empty and data is empty,
  // it was probably just a separator someone typed. Return raw text.
  if (Object.keys(data).length === 0 && openIdx === 0) {
    return { data: {}, body: text };
  }
  return { data, body };
}

/** A line-comment marker. Each begins a "rest of line is a comment" region. */
export type CommentMarker = "%%" | "//" | "#";

/**
 * The historical default marker set. Kept as the default so existing callers
 * (`isBlankOrComment`, `firstContentLine`, and the handful of per-diagram
 * parsers that import `stripLineComment` directly) are unchanged.
 */
export const DEFAULT_COMMENT_MARKERS: readonly CommentMarker[] = ["%%", "//", "#"];

/**
 * `%%` is the one marker that never begins valid content in ANY schematex
 * grammar (it is Mermaid's comment style). It is stripped for every diagram in
 * the shared preprocess pass, giving one universal, learnable comment syntax
 * regardless of a diagram's own lexer. Per-diagram native markers (`#` shell,
 * `*` SPICE, …) are still honored by each parser on top of this.
 */
export const UNIVERSAL_COMMENT_MARKERS: readonly CommentMarker[] = ["%%"];

/**
 * Strip an inline comment from a line.
 *
 * Recognized markers default to {@link DEFAULT_COMMENT_MARKERS} (`%%`, `//`,
 * `#`) but can be narrowed by the caller — the shared preprocess pass passes
 * {@link UNIVERSAL_COMMENT_MARKERS} so it only removes `%%`, leaving `#`/`//`
 * to diagrams where they are content (e.g. `#` headings in mindmap).
 *
 * Markers inside ASCII double-quoted regions are preserved verbatim so URLs
 * (`"https://..."`) and CSS-color values (`"#ff0"`) survive. Smart-quoted
 * regions are NOT special-cased — they're rare inside attribute strings,
 * and the cost of full Unicode quote tracking for every line isn't worth
 * the protection.
 */
export function stripLineComment(
  line: string,
  markers: readonly CommentMarker[] = DEFAULT_COMMENT_MARKERS,
): string {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      // Respect a backslash escape so `"foo\""` stays inside the quote.
      if (i > 0 && line[i - 1] === "\\") continue;
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    for (const marker of markers) {
      if (line.startsWith(marker, i)) return line.slice(0, i);
    }
  }
  return line;
}

/**
 * Strip comments from every line of a block, preserving line positions:
 * comment-only lines become blank rather than being removed, so downstream
 * parser diagnostics keep stable line numbers. Used by the shared preprocess
 * pass with {@link UNIVERSAL_COMMENT_MARKERS}.
 */
export function stripComments(
  text: string,
  markers: readonly CommentMarker[] = DEFAULT_COMMENT_MARKERS,
): string {
  return text
    .split("\n")
    .map((line) => stripLineComment(line, markers))
    .join("\n");
}

/** Returns true if the trimmed line is blank or a pure comment. */
export function isBlankOrComment(line: string): boolean {
  return stripLineComment(line).trim() === "";
}

/** Return the first non-blank, non-comment line after comment stripping. */
export function firstContentLine(text: string): string | undefined {
  for (const raw of text.split(/\r?\n/)) {
    const line = stripLineComment(raw).trim();
    if (line !== "") return line;
  }
  return undefined;
}
