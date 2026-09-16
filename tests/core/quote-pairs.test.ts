import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderResult } from "../../src/core/api";
import { listDiagrams } from "../../src/ai";
import { QUOTE_PAIRS, findClosingQuote } from "../../src/core/quotes";
import type { DiagramType } from "../../src/core/types";

/**
 * The library documents seven interchangeable quote pairs (see
 * `src/core/quotes.ts`). "Write the label however your locale writes quotes"
 * is a headline promise of the DSL, so it has to hold for every engine, not
 * only for the ones whose parser happened to route through the shared helper.
 *
 * This test takes each engine's own evaluation case — real, non-toy DSL — and
 * re-authors every quoted string with each of the seven pairs. A variant must
 * render exactly as well as the ASCII original and produce the same
 * diagnostics. A parser that only knows `"` fails here loudly.
 */

const CASES_DIR = join(__dirname, "../../visual-eval/cases");

interface QuotedSpan {
  start: number;
  end: number; // index of the closing quote
}

/** Every ASCII double-quoted span on `source`, in order. */
function asciiQuotedSpans(source: string): QuotedSpan[] {
  const spans: QuotedSpan[] = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '"') continue;
    const close = findClosingQuote(source, i);
    if (close < 0) continue;
    spans.push({ start: i, end: close });
    i = close;
  }
  return spans;
}

/**
 * Re-author `source` with `open`/`close` as the string delimiters.
 *
 * Returns undefined when the substitution cannot be expressed faithfully:
 * a label containing an apostrophe cannot be wrapped in `'…'`, and the
 * non-ASCII pairs carry no escape syntax, so a label containing the closing
 * bracket would terminate early. Skipping is honest; mangling is not.
 */
function reauthor(
  source: string,
  spans: QuotedSpan[],
  open: string,
  close: string
): string | undefined {
  if (open === '"') return source;
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    const inner = source.slice(span.start + 1, span.end);
    if (inner.includes(open) || inner.includes(close)) return undefined;
    // `\"` in the original has no equivalent inside a non-ASCII pair.
    if (open !== "'" && inner.includes("\\")) return undefined;
    out += source.slice(cursor, span.start) + open + inner + close;
    cursor = span.end + 1;
  }
  return out + source.slice(cursor);
}

interface EvalCase {
  id: string;
  type: DiagramType;
  source: string;
  spans: QuotedSpan[];
}

/** Does the source quote something on its header line *and* further down? */
function hasTitleAndBodyQuotes(source: string, spans: QuotedSpan[]): boolean {
  if (spans.length < 2) return false;
  const lineStarts = [...source.matchAll(/\n/g)].map((m) => m.index);
  const lineOf = (index: number): number =>
    lineStarts.filter((start) => start < index).length;
  const first = lineOf(spans[0]!.start);
  return spans.some((span) => lineOf(span.start) > first);
}

/** One representative case per diagram type, preferring richer sources. */
function collectCases(): Map<DiagramType, EvalCase> {
  const known = new Set(listDiagrams().map((entry) => entry.type));
  const picked = new Map<DiagramType, EvalCase>();
  if (!existsSync(CASES_DIR)) return picked;

  for (const id of readdirSync(CASES_DIR).sort()) {
    const goalPath = join(CASES_DIR, id, "goal.json");
    const sourcePath = join(CASES_DIR, id, "source.sx");
    if (!existsSync(goalPath) || !existsSync(sourcePath)) continue;

    const goal = JSON.parse(readFileSync(goalPath, "utf8")) as {
      type?: string;
    };
    const type = goal.type as DiagramType | undefined;
    if (!type || !known.has(type)) continue;

    const source = readFileSync(sourcePath, "utf8");
    const spans = asciiQuotedSpans(source);
    if (!hasTitleAndBodyQuotes(source, spans)) continue;

    const existing = picked.get(type);
    if (!existing || spans.length > existing.spans.length) {
      picked.set(type, { id, type, source, spans });
    }
  }
  return picked;
}

const CASES = collectCases();
const PAIRS = Object.entries(QUOTE_PAIRS);

/** Diagnostics reduced to a comparable shape — codes and severities only. */
function fingerprint(
  diagnostics: readonly { code?: string; severity?: string }[]
): string[] {
  return diagnostics
    .map((entry) => `${entry.severity ?? "?"}:${entry.code ?? "?"}`)
    .sort();
}

describe("every engine accepts all seven documented quote pairs", () => {
  it("found evaluation cases to check", () => {
    expect(CASES.size).toBeGreaterThan(20);
  });

  for (const [type, evalCase] of [...CASES.entries()].sort()) {
    describe(`${type} (${evalCase.id})`, () => {
      const baseline = renderResult(evalCase.source, { type });

      it('renders with ASCII " (baseline)', () => {
        expect(baseline.ok, JSON.stringify(baseline.diagnostics)).toBe(true);
      });

      for (const [open, close] of PAIRS) {
        if (open === '"') continue;
        const variant = reauthor(evalCase.source, evalCase.spans, open, close);
        // A pair that cannot express this case's labels is skipped, not failed.
        if (variant === undefined) continue;

        it(`renders the same with ${open}…${close}`, () => {
          const result = renderResult(variant, { type });
          expect(result.ok, JSON.stringify(result.diagnostics)).toBe(
            baseline.ok
          );
          expect(fingerprint(result.diagnostics)).toEqual(
            fingerprint(baseline.diagnostics)
          );
        });
      }
    });
  }
});
