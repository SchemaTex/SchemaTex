/**
 * DSL preprocessing shared across all diagram parsers.
 *
 * Two cross-cutting Mermaid-compat features are normalized here so each
 * per-diagram parser sees a consistent surface:
 *
 *   1. **Frontmatter** — Mermaid allows a YAML-style block at the top of
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
 *   2. **Comments** — different parsers historically supported different
 *      comment markers (`#`, `//`, Mermaid's `%%`). {@link stripLineComment}
 *      strips all three, respecting double-quoted regions so URLs with `//`
 *      and CSS-style values containing `#` don't get truncated.
 *
 * Both helpers are intentionally narrow: they only do what every parser
 * needs. Diagram-specific lexing stays in each parser.
 */

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

/**
 * Strip an inline comment from a line.
 *
 * Recognized markers (in order of precedence):
 *   - `%%` — Mermaid's comment style
 *   - `//` — C-style line comment
 *   - `#`  — shell/python style
 *
 * Markers inside ASCII double-quoted regions are preserved verbatim so URLs
 * (`"https://..."`) and CSS-color values (`"#ff0"`) survive. Smart-quoted
 * regions are NOT special-cased — they're rare inside attribute strings,
 * and the cost of full Unicode quote tracking for every line isn't worth
 * the protection.
 */
export function stripLineComment(line: string): string {
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
    if (ch === "%" && line[i + 1] === "%") return line.slice(0, i);
    if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
    if (ch === "#") return line.slice(0, i);
  }
  return line;
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
