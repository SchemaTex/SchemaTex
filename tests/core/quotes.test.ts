import { describe, test, expect } from "vitest";
import {
  matchQuotedTitle,
  stripQuotes,
  extractQuotedString,
  findClosingQuote,
} from "../../src/core/quotes";

describe("smart-quote helpers", () => {
  test("matchQuotedTitle accepts ASCII double quotes", () => {
    expect(matchQuotedTitle('logic "Motor control"')).toBe("Motor control");
  });

  test("matchQuotedTitle accepts ASCII single quotes", () => {
    expect(matchQuotedTitle("logic 'Motor control'")).toBe("Motor control");
  });

  test("matchQuotedTitle accepts curly Unicode double quotes", () => {
    expect(matchQuotedTitle('venn “PRISMA”')).toBe("PRISMA");
  });

  test("matchQuotedTitle accepts French/Spanish guillemets", () => {
    expect(matchQuotedTitle("venn «Arbol de la vida»")).toBe(
      "Arbol de la vida"
    );
  });

  test("matchQuotedTitle accepts CJK corner brackets", () => {
    expect(matchQuotedTitle("logic 「信号」")).toBe("信号");
  });

  test("findClosingQuote handles \\\" escape inside ASCII strings", () => {
    const s = '"a \\"b\\" c"';
    const close = findClosingQuote(s, 0);
    expect(close).toBe(s.length - 1);
  });

  test("extractQuotedString unescapes \\\" inside ASCII strings", () => {
    const r = extractQuotedString('"hello \\"world\\""', 0);
    expect(r?.value).toBe('hello "world"');
  });

  test("extractQuotedString returns inner text for guillemets", () => {
    const r = extractQuotedString("«bonjour»", 0);
    expect(r?.value).toBe("bonjour");
  });

  test("stripQuotes handles all recognised pairs", () => {
    expect(stripQuotes('"x"')).toBe("x");
    expect(stripQuotes("'x'")).toBe("x");
    expect(stripQuotes("“x”")).toBe("x");
    expect(stripQuotes("«x»")).toBe("x");
    expect(stripQuotes("「x」")).toBe("x");
    expect(stripQuotes("plain")).toBe("plain");
  });

  test("extractQuotedString throws on unterminated ASCII quote", () => {
    expect(() => extractQuotedString('"no end', 0)).toThrow(/unterminated/i);
  });
});
