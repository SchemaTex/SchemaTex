import type { SourceRange } from "./types";
import { findClosingQuote, isOpenQuote } from "./quotes";

/** Find the first complete quoted token in a parser-owned line. */
export function findFirstQuotedRange(
  line: string,
  startAt = 0
): { start: number; end: number } | undefined {
  for (let i = Math.max(0, startAt); i < line.length; i++) {
    if (!isOpenQuote(line[i]!)) continue;
    const close = findClosingQuote(line, i);
    if (close >= 0) return { start: i, end: close + 1 };
  }
  return undefined;
}

/** Build an efficient UTF-16 source-range locator for a single parser input. */
export function createSourceLocator(source: string): {
  range: (start: number, end: number) => SourceRange;
} {
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10) lineStarts.push(i + 1);
  }

  const lineAt = (offset: number): number => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (lineStarts[mid]! <= offset) low = mid + 1;
      else high = mid - 1;
    }
    return Math.max(0, high);
  };

  return {
    range(start: number, end: number): SourceRange {
      const safeStart = Math.max(0, Math.min(source.length, start));
      const safeEnd = Math.max(safeStart, Math.min(source.length, end));
      const line = lineAt(safeStart);
      return {
        start: safeStart,
        end: safeEnd,
        line,
        colStart: safeStart - lineStarts[line]!,
        colEnd: safeEnd - lineStarts[line]!,
      };
    },
  };
}
