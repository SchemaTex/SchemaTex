import { diagnosticFromError } from "../core/diagnostics";

/** Structured error type returned by the AI tool layer. */
export interface SchematexValidationError {
  /** Stable machine-readable diagnostic code. */
  code?: string;
  /** 1-based line number where the error occurred, if the parser reported it. */
  line?: number;
  /** 1-based column, if reported. */
  column?: number;
  /** Source snippet from the offending line, if the parser captured it. */
  source?: string;
  /** Exact unrecognised value when a warning reports a soft fallback. */
  token?: string;
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
 *
 * Engine-internal runtime errors (TypeError, ReferenceError, RangeError)
 * are distinguished from user-input parse errors so callers can route
 * them to bug tracking rather than user-facing "fix your DSL" UI.
 */
export function extractError(err: unknown): SchematexValidationError {
  const diagnostic = diagnosticFromError(err);
  return {
    code: diagnostic.code,
    line: diagnostic.line,
    column: diagnostic.column,
    source: diagnostic.source,
    token: diagnostic.token,
    message: diagnostic.message,
    hint: diagnostic.hint,
  };
}
