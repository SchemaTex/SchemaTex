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
 * Error class names that indicate a *runtime* failure inside the engine
 * (a bug we wrote) rather than a user-input parse/validation error. When
 * we see one of these, the extracted error is flagged with an `[engine
 * bug: …]` prefix and carries a single trimmed stack-frame as `source`,
 * so production integrators (ChatDiagram et al.) can file a bug report
 * with enough detail to actually reproduce.
 *
 * Captures the 2026-05 genogram TDZ class of issue: 92 occurrences with
 * just `"Cannot access 'x' before initialization"` as the message and no
 * structured fields. With this list, the same failure would have shown
 * up as `[engine bug: ReferenceError] Cannot access 'x' before
 * initialization` plus the offending frame.
 */
const ENGINE_BUG_NAMES = new Set([
  "ReferenceError",
  "TypeError",
  "RangeError",
]);

/**
 * Extract a {@link SchematexValidationError} from any thrown value.
 *
 * Works across all per-diagram parser error classes because it reads
 * `.line`, `.column`, `.source` structurally when present. Unknown
 * throws (non-Error values) are coerced to a message-only error.
 *
 * Engine-internal runtime errors (TypeError, ReferenceError, RangeError)
 * are distinguished from user-input parse errors so callers can route
 * them to bug tracking rather than user-facing "fix your DSL" UI.
 */
export function extractError(err: unknown): SchematexValidationError {
  if (err instanceof Error) {
    const anyErr = err as Error & {
      line?: number;
      column?: number;
      source?: string;
      hint?: string;
    };
    // User-defined parse-error classes also extend Error but set their own
    // `.name` and usually attach `.line`. Anything with a numeric line is
    // by definition a parse error, not a runtime bug — even if its `.name`
    // happened to collide with a built-in.
    const hasParseFields = typeof anyErr.line === "number";
    const isEngineBug = !hasParseFields && ENGINE_BUG_NAMES.has(err.name);
    const sourceHint = isEngineBug
      ? firstStackFrame(err.stack)
      : typeof anyErr.source === "string"
      ? anyErr.source
      : undefined;
    return {
      line: typeof anyErr.line === "number" ? anyErr.line : undefined,
      column: typeof anyErr.column === "number" ? anyErr.column : undefined,
      source: sourceHint,
      message: isEngineBug
        ? `[engine bug: ${err.name}] ${err.message}`
        : err.message,
      hint:
        typeof anyErr.hint === "string"
          ? anyErr.hint
          : isEngineBug
          ? "This looks like a Schematex internal error rather than a DSL syntax problem. Please file an issue with the failing DSL at https://github.com/SchemaTex/Schematex/issues."
          : undefined,
    };
  }
  return { message: String(err) };
}

/**
 * Pick the topmost stack frame, with absolute paths normalized to bare
 * filenames so we don't leak the user's disk layout into their logs.
 */
function firstStackFrame(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  for (const line of stack.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("at ")) {
      return trimmed.replace(/\((?:.*\/)?([^/]+)\)/, "($1)");
    }
  }
  return undefined;
}
