/**
 * Structured error type returned by the AI tool layer.
 *
 * The underlying per-diagram parsers each throw their own error class
 * (genogram.ParseError, SLDParseError, PedigreeParseError, ...). Some
 * carry line/column, some don't. {@link extractError} normalises any
 * thrown value into this shape via structural extraction — no parser
 * refactor required.
 */
export interface SchematexValidationError {
  /** 1-based line number where the error occurred, if the parser reported it. */
  line?: number;
  /** 1-based column, if reported. */
  column?: number;
  /** Source snippet from the offending line, if the parser captured it. */
  source?: string;
  /** Human-readable error message. */
  message: string;
  /** Optional remediation hint. */
  hint?: string;
}

/**
 * Extract a {@link SchematexValidationError} from any thrown value.
 *
 * Works across all per-diagram parser error classes because it reads
 * `.line`, `.column`, `.source` structurally when present. Unknown
 * throws (non-Error values) are coerced to a message-only error.
 */
export function extractError(err: unknown): SchematexValidationError {
  if (err instanceof Error) {
    const anyErr = err as Error & {
      line?: number;
      column?: number;
      source?: string;
      hint?: string;
    };
    return {
      line: typeof anyErr.line === "number" ? anyErr.line : undefined,
      column: typeof anyErr.column === "number" ? anyErr.column : undefined,
      source: typeof anyErr.source === "string" ? anyErr.source : undefined,
      message: err.message,
      hint: typeof anyErr.hint === "string" ? anyErr.hint : undefined,
    };
  }
  return { message: String(err) };
}
