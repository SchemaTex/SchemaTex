/**
 * Shared identifier grammar for every diagram DSL.
 *
 * Identifiers may contain Unicode letters, combining marks, decimal digits,
 * underscores, and hyphens. Identifiers start with a Unicode letter or
 * underscore; digits, combining marks, and hyphens are allowed thereafter.
 */
export const IDENTIFIER_SOURCE =
  String.raw`[\p{L}_][\p{L}\p{N}\p{M}_-]*`;

/** Dot-qualified identifiers used by UML/class and port-reference grammars. */
export const QUALIFIED_IDENTIFIER_SOURCE =
  String.raw`${IDENTIFIER_SOURCE}(?:\.${IDENTIFIER_SOURCE})*`;

const IDENTIFIER_RE = new RegExp(`^(?:${IDENTIFIER_SOURCE})$`, "u");
const QUALIFIED_IDENTIFIER_RE = new RegExp(
  `^(?:${QUALIFIED_IDENTIFIER_SOURCE})$`,
  "u"
);
const IDENTIFIER_CHAR_RE = /[\p{L}\p{N}\p{M}_-]/u;

export function isIdentifier(value: string): boolean {
  return IDENTIFIER_RE.test(value);
}

export function isQualifiedIdentifier(value: string): boolean {
  return QUALIFIED_IDENTIFIER_RE.test(value);
}

export function isIdentifierChar(value: string): boolean {
  return IDENTIFIER_CHAR_RE.test(value);
}

export function readIdentifier(
  source: string,
  start = 0
): { value: string; end: number } | null {
  const match = new RegExp(IDENTIFIER_SOURCE, "uy");
  match.lastIndex = start;
  const result = match.exec(source);
  if (!result) return null;
  return { value: result[0], end: match.lastIndex };
}

export function readQualifiedIdentifier(
  source: string,
  start = 0
): { value: string; end: number } | null {
  const match = new RegExp(QUALIFIED_IDENTIFIER_SOURCE, "uy");
  match.lastIndex = start;
  const result = match.exec(source);
  if (!result) return null;
  return { value: result[0], end: match.lastIndex };
}
