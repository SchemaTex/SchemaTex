import { describe, expect, it } from "vitest";
import { parsePrisma, PrismaParseError } from "../../src/diagrams/prisma/parser";

const MINIMAL_2020_SINGLE = `
prisma
mode: 2020-single
title: Effect of exercise on chronic low-back pain — SR

identification:
  databases:
    n: 1418
    sources: PubMed=600, Embase=450, Cochrane=184, Web of Science=184
    duplicates-removed: 318

screening:
  records-screened: 1100
  excluded:
    n: 870
    reasons: irrelevant title=750, non-English=120

eligibility:
  full-text-assessed: 230
  excluded:
    n: 195
    reasons: wrong population=80, wrong intervention=60, wrong outcome=55

included:
  studies: 35
  reports: 38
`;

const DUAL = `
prisma
mode: 2020-dual
title: Yoga for chronic back pain

identification:
  databases:
    n: 1234
    sources: PubMed=600, Embase=450, Cochrane=184
    duplicates-removed: 254
  other:
    n: 56
    sources: citation-search=30, hand-search=20, expert-recommendation=6

screening:
  records-screened: 1036
  excluded:
    n: 810
    reasons: duplicate=120, irrelevant title=560, non-English=130

eligibility:
  full-text-assessed: 226
  excluded:
    n: 195
    reasons: wrong population=80, wrong intervention=60, wrong outcome=55

included:
  studies: 31
  reports: 33
`;

describe("prisma parser", () => {
  it("parses a minimal 2020-single document", () => {
    const ast = parsePrisma(MINIMAL_2020_SINGLE);
    expect(ast.type).toBe("prisma");
    expect(ast.mode).toBe("2020-single");
    expect(ast.kind).toBe("systematic-review");
    expect(ast.title).toContain("Effect of exercise");
    expect(ast.identification.n).toBe(1418);
    expect(ast.identification.duplicatesRemoved).toBe(318);
    expect(ast.identification.sources?.[0]).toEqual({ name: "PubMed", count: 600 });
    expect(ast.screening.recordsScreened).toBe(1100);
    expect(ast.screening.excluded.n).toBe(870);
    expect(ast.screening.excluded.reasons?.length).toBe(2);
    expect(ast.eligibility.fullTextAssessed).toBe(230);
    expect(ast.eligibility.excluded.reasons?.length).toBe(3);
    expect(ast.included.studies).toBe(35);
    expect(ast.included.reports).toBe(38);
    // 1418 - 318 = 1100 ✓; 1100 - 870 = 230 ✓; 230 - 195 = 35 ✓ → no warnings
    expect(ast.warnings).toEqual([]);
  });

  it("parses a 2020-dual document with both identification columns", () => {
    const ast = parsePrisma(DUAL);
    expect(ast.mode).toBe("2020-dual");
    expect(ast.identification.n).toBe(1234);
    expect(ast.identificationOther?.n).toBe(56);
    expect(ast.identificationOther?.sources?.length).toBe(3);
    expect(ast.warnings).toEqual([]);
  });

  it("auto-detects dual mode when other: provided without explicit mode", () => {
    const dsl = DUAL.replace("mode: 2020-dual\n", "");
    const ast = parsePrisma(dsl);
    expect(ast.mode).toBe("2020-dual");
    expect(ast.warnings.some((w) => /switching mode to "2020-dual"/i.test(w))).toBe(true);
  });

  it("strips commas from large counts", () => {
    const dsl = MINIMAL_2020_SINGLE.replace("n: 1418", "n: 1,418");
    const ast = parsePrisma(dsl);
    expect(ast.identification.n).toBe(1418);
  });

  it("rejects unknown keys inside a stage block", () => {
    const dsl = MINIMAL_2020_SINGLE.replace(
      "  databases:\n    n: 1418",
      "  databases:\n    n: 1418\n    bogus: 5",
    );
    expect(() => parsePrisma(dsl)).toThrow(PrismaParseError);
  });

  it("rejects missing required stages", () => {
    const dsl = `prisma\nmode: 2020-single\n\nidentification:\n  databases:\n    n: 10\n`;
    expect(() => parsePrisma(dsl)).toThrow(/screening/);
  });

  it("emits a warning when source counts do not sum to n (warn mode default)", () => {
    const dsl = MINIMAL_2020_SINGLE.replace(
      "sources: PubMed=600, Embase=450, Cochrane=184, Web of Science=184",
      "sources: PubMed=600, Embase=450",
    );
    const ast = parsePrisma(dsl);
    expect(ast.warnings.some((w) => /sources sum/i.test(w))).toBe(true);
  });

  it("throws in strict validation mode on arithmetic mismatch", () => {
    const dsl = MINIMAL_2020_SINGLE.replace("mode: 2020-single", "mode: 2020-single\nvalidate-counts: strict")
      .replace("records-screened: 1100", "records-screened: 999");
    expect(() => parsePrisma(dsl)).toThrow(/records-screened expected/);
  });

  it("supports scoping-review kind", () => {
    const dsl = MINIMAL_2020_SINGLE.replace("title:", "kind: scoping-review\ntitle:");
    const ast = parsePrisma(dsl);
    expect(ast.kind).toBe("scoping-review");
  });

  it("supports previous-studies row", () => {
    const dsl = MINIMAL_2020_SINGLE.replace(
      "identification:",
      "previous-studies:\n  n: 19\n  sources: previous review=19\n\nidentification:",
    );
    const ast = parsePrisma(dsl);
    expect(ast.previousStudies?.n).toBe(19);
  });
});

/** Indent the whole block by `n` spaces, leaving blank lines blank. */
function shift(dsl: string, n: number): string {
  const pad = " ".repeat(n);
  return dsl
    .split("\n")
    .map((l) => (l.trim() ? pad + l : l))
    .join("\n");
}

describe("prisma parser — common leading indentation", () => {
  it("parses a block indented by 2 spaces exactly like the flat form", () => {
    // The shape docs and LLM replies actually produce: the whole DSL sits
    // inside an indented context (a JSX template literal, a markdown fence).
    expect(parsePrisma(shift(MINIMAL_2020_SINGLE, 2))).toEqual(parsePrisma(MINIMAL_2020_SINGLE));
  });

  it("parses a block indented by an odd number of spaces", () => {
    // 3 is not a multiple of the 2-space level width — the margin must be
    // removed before levels are measured, not floor-divided along with them.
    expect(parsePrisma(shift(MINIMAL_2020_SINGLE, 3))).toEqual(parsePrisma(MINIMAL_2020_SINGLE));
  });

  it("preserves relative nesting under a deep common margin", () => {
    const ast = parsePrisma(shift(MINIMAL_2020_SINGLE, 8));
    expect(ast.identification.n).toBe(1418);
    expect(ast.identification.sources?.length).toBe(4);
    expect(ast.screening.excluded.reasons?.length).toBe(2);
    expect(ast.warnings).toEqual([]);
  });

  it("keeps the dual-column form intact when indented", () => {
    expect(parsePrisma(shift(DUAL, 2))).toEqual(parsePrisma(DUAL));
  });

  it("rejects a header indented deeper than the body, and names the real defect", () => {
    const dsl = "  prisma\n" + MINIMAL_2020_SINGLE.replace(/^\s*\nprisma\n/, "");
    expect(() => parsePrisma(dsl)).toThrow(PrismaParseError);
    expect(() => parsePrisma(dsl)).toThrow(/header is indented/);
  });

  it("still reports a wrong header keyword as a wrong keyword", () => {
    const dsl = MINIMAL_2020_SINGLE.replace("prisma\n", "prizma\n");
    expect(() => parsePrisma(dsl)).toThrow(/first non-blank line must be "prisma", got "prizma"/);
  });
});
