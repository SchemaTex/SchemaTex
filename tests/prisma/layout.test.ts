import { describe, expect, it } from "vitest";
import { parsePrisma } from "../../src/diagrams/prisma/parser";
import { layoutPrisma } from "../../src/diagrams/prisma/layout";

const SINGLE = `
prisma
mode: 2020-single
title: Test

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
title: Dual

identification:
  databases:
    n: 1234
    duplicates-removed: 254
  other:
    n: 56

screening:
  records-screened: 1036
  excluded:
    n: 810

eligibility:
  full-text-assessed: 226
  excluded:
    n: 195
    reasons: wrong=195

included:
  studies: 31
`;

describe("prisma layout", () => {
  it("produces the canonical boxes in single mode (with a split removed box)", () => {
    const ast = parsePrisma(SINGLE);
    const lo = layoutPrisma(ast);
    const roles = lo.boxes.map((b) => b.role);
    // SINGLE has duplicates-removed, so "Records removed before screening" is
    // its own box in the right column (canonical PRISMA layout).
    expect(roles).toEqual([
      "id-databases",
      "id-removed",
      "screening",
      "screening-excluded",
      "eligibility",
      "eligibility-excluded",
      "included",
    ]);
  });

  it("places the removed box in the right column, covered by the section header", () => {
    const ast = parsePrisma(SINGLE);
    const lo = layoutPrisma(ast);
    const db = lo.boxes.find((b) => b.role === "id-databases")!;
    const removed = lo.boxes.find((b) => b.role === "id-removed")!;
    // Removed sits to the right of the identified box, top-aligned.
    expect(removed.x).toBeGreaterThan(db.x + db.width);
    expect(removed.y).toBe(db.y);
    // The databases section header spans from the identified box across to the
    // right edge of the removed box.
    const header = lo.headers.find((h) => h.column === "databases")!;
    expect(header.x).toBe(db.x);
    expect(header.x + header.width).toBeGreaterThanOrEqual(removed.x + removed.width - 1);
  });

  it("orders rows top to bottom", () => {
    const ast = parsePrisma(SINGLE);
    const lo = layoutPrisma(ast);
    const idY = lo.boxes.find((b) => b.role === "id-databases")!.y;
    const scrY = lo.boxes.find((b) => b.role === "screening")!.y;
    const eliY = lo.boxes.find((b) => b.role === "eligibility")!.y;
    const incY = lo.boxes.find((b) => b.role === "included")!.y;
    expect(idY).toBeLessThan(scrY);
    expect(scrY).toBeLessThan(eliY);
    expect(eliY).toBeLessThan(incY);
  });

  it("places exclusion boxes to the right of their main box", () => {
    const ast = parsePrisma(SINGLE);
    const lo = layoutPrisma(ast);
    const scr = lo.boxes.find((b) => b.role === "screening")!;
    const scrExc = lo.boxes.find((b) => b.role === "screening-excluded")!;
    expect(scrExc.x).toBeGreaterThan(scr.x + scr.width);
  });

  it("produces two identification columns in dual mode plus a merge", () => {
    const ast = parsePrisma(DUAL);
    const lo = layoutPrisma(ast);
    const left = lo.boxes.find((b) => b.role === "id-databases")!;
    const right = lo.boxes.find((b) => b.role === "id-other")!;
    expect(left.y).toBe(right.y);
    expect(left.x + left.width).toBeLessThan(right.x);
    // The databases stream is the trunk; the other-methods stream joins it as a
    // single merge leg.
    expect(lo.edges.filter((e) => e.kind === "merge-leg").length).toBe(1);
    expect(lo.edges.filter((e) => e.kind === "merge-trunk").length).toBe(1);
    // Each identification column has its own spanning section header.
    expect(lo.headers.length).toBe(2);
  });

  it("aggregates long reason lists into a tail bucket", () => {
    const manyReasons = Array.from({ length: 12 }, (_, i) => `reason${i}=${10 + i}`).join(", ");
    const dsl = SINGLE.replace(
      "reasons: irrelevant title=750, non-English=120",
      `reasons: ${manyReasons}`,
    ).replace("n: 870", `n: ${Array.from({ length: 12 }, (_, i) => 10 + i).reduce((a, b) => a + b, 0)}`)
     .replace("records-screened: 1100", "records-screened: 1418")
     .replace("duplicates-removed: 318", "duplicates-removed: 0")
     .replace("full-text-assessed: 230", "full-text-assessed: 1232");
    const ast = parsePrisma(dsl);
    const lo = layoutPrisma(ast);
    const scrExc = lo.boxes.find((b) => b.role === "screening-excluded")!;
    const reasonLines = scrExc.lines.filter((l) => l.style === "reason");
    // Top 7 + 1 "Other" bucket = 8.
    expect(reasonLines.length).toBeLessThanOrEqual(8);
    expect(reasonLines.some((l) => /^Other/.test(l.text))).toBe(true);
  });
});
