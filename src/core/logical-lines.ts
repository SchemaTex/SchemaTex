/**
 * Shared statement reader for line-oriented DSLs that allow quoted strings.
 *
 * Physical newlines inside a double-quoted string stay part of the same
 * logical statement. Outside quotes, a newline terminates the statement.
 * Absolute offsets are preserved so engine parsers can keep reporting source
 * locations against the original document.
 */

export interface DslLogicalLine {
  /** Statement text, starting at the first non-whitespace source character. */
  text: string;
  /** One-based physical source line where the statement begins. */
  line: number;
  /** One-based physical source line where the statement ends. */
  endLine: number;
  /** Absolute UTF-16 offset of `text[0]` in the original source. */
  start: number;
  /** Leading indentation of the first physical line. */
  indent: number;
}

export class UnterminatedDslStringError extends Error {
  readonly code = "DOCUMENT_UNTERMINATED_STRING";

  constructor(
    public readonly line: number,
    public readonly source?: string
  ) {
    super(`Line ${line}: unterminated double-quoted string`);
    this.name = "UnterminatedDslStringError";
  }
}

export interface ReadLogicalLinesOptions {
  /** Markers that make a whole physical line a comment when it is not quoted. */
  fullLineCommentMarkers?: readonly string[];
  /** Markers that discard the rest of a physical line when outside quotes. */
  inlineCommentMarkers?: readonly string[];
}

interface PhysicalLine {
  start: number;
  contentEnd: number;
  end: number;
  text: string;
  number: number;
}

function physicalLines(source: string): PhysicalLine[] {
  const result: PhysicalLine[] = [];
  let start = 0;
  let number = 1;
  while (start <= source.length) {
    const newline = source.indexOf("\n", start);
    const end = newline < 0 ? source.length : newline + 1;
    let contentEnd = newline < 0 ? source.length : newline;
    if (contentEnd > start && source[contentEnd - 1] === "\r") contentEnd--;
    result.push({
      start,
      contentEnd,
      end,
      text: source.slice(start, contentEnd),
      number,
    });
    if (newline < 0) break;
    start = newline + 1;
    number++;
  }
  return result;
}

export function readLogicalLines(
  source: string,
  options: ReadLogicalLinesOptions = {}
): DslLogicalLine[] {
  const result: DslLogicalLine[] = [];
  const fullLineMarkers = options.fullLineCommentMarkers ?? [];
  const inlineMarkers = options.inlineCommentMarkers ?? [];

  let statementStart: number | undefined;
  let statementLine = 0;
  let statementIndent = 0;
  let statementSource = "";
  let inQuote = false;
  let escaped = false;

  for (const line of physicalLines(source)) {
    if (statementStart === undefined) {
      const trimmed = line.text.trim();
      if (!trimmed) continue;
      if (fullLineMarkers.some((marker) => trimmed.startsWith(marker))) continue;
      statementIndent = line.text.search(/\S/);
      statementStart = line.start + statementIndent;
      statementLine = line.number;
      statementSource = line.text.slice(statementIndent);
    }

    const scanStart = statementStart >= line.start
      ? statementStart
      : line.start;
    let logicalEnd = line.contentEnd;
    for (let i = scanStart; i < line.contentEnd; i++) {
      const ch = source[i]!;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (inQuote && ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inQuote = !inQuote;
        continue;
      }
      if (!inQuote) {
        const marker = inlineMarkers.find((candidate) =>
          source.startsWith(candidate, i)
        );
        if (marker) {
          logicalEnd = i;
          break;
        }
      }
    }

    if (inQuote) continue;

    const raw = source.slice(statementStart, logicalEnd).trimEnd();
    if (raw.trim()) {
      result.push({
        text: raw,
        line: statementLine,
        endLine: line.number,
        start: statementStart,
        indent: statementIndent,
      });
    }
    statementStart = undefined;
    statementLine = 0;
    statementIndent = 0;
    statementSource = "";
    escaped = false;
  }

  if (statementStart !== undefined && inQuote) {
    throw new UnterminatedDslStringError(statementLine, statementSource);
  }

  return result;
}

/** Decode the content between double quotes using the shared DSL escapes. */
export function decodeDslString(content: string): string {
  let result = "";
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    if (ch !== "\\" || i + 1 >= content.length) {
      result += ch;
      continue;
    }
    const next = content[++i]!;
    if (next === "n") result += "\n";
    else if (next === "r") result += "\r";
    else if (next === "t") result += "\t";
    else if (next === '"' || next === "\\") result += next;
    else result += `\\${next}`;
  }
  // Physical multiline strings commonly carry indentation only because the
  // declaration itself is indented. Do not turn that source formatting into
  // visible label padding.
  return result.replace(/\r?\n[ \t]*/g, "\n");
}
