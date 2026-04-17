import { describe, test, expect } from "vitest";
import { parsePedigree } from "../../src/diagrams/pedigree/parser";

describe("pedigree parser", () => {
  test("parses simple pedigree header", () => {
    const ast = parsePedigree(`pedigree\n  I-1 [male]`);
    expect(ast.type).toBe("pedigree");
    expect(ast.individuals).toHaveLength(1);
  });

  test("parses header with title", () => {
    const ast = parsePedigree(`pedigree "CF Family"\n  I-1 [male]`);
    expect(ast.metadata?.title).toBe("CF Family");
  });

  test("parses sex properties", () => {
    const ast = parsePedigree(`pedigree\n  a [male]\n  b [female]\n  c [unknown]`);
    expect(ast.individuals[0].sex).toBe("male");
    expect(ast.individuals[1].sex).toBe("female");
    expect(ast.individuals[2].sex).toBe("unknown");
  });

  test("parses genetic status: affected", () => {
    const ast = parsePedigree(`pedigree\n  a [male, affected]`);
    expect(ast.individuals[0].geneticStatus).toBe("affected");
  });

  test("parses genetic status: carrier", () => {
    const ast = parsePedigree(`pedigree\n  a [female, carrier]`);
    expect(ast.individuals[0].geneticStatus).toBe("carrier");
  });

  test("parses genetic status: carrier-x", () => {
    const ast = parsePedigree(`pedigree\n  a [female, carrier-x]`);
    expect(ast.individuals[0].geneticStatus).toBe("carrier-x");
  });

  test("parses genetic status: presymptomatic", () => {
    const ast = parsePedigree(`pedigree\n  a [male, presymptomatic]`);
    expect(ast.individuals[0].geneticStatus).toBe("presymptomatic");
  });

  test("parses markers: proband", () => {
    const ast = parsePedigree(`pedigree\n  a [male, affected, proband]`);
    expect(ast.individuals[0].markers).toContain("proband");
  });

  test("parses markers: consultand", () => {
    const ast = parsePedigree(`pedigree\n  a [female, consultand]`);
    expect(ast.individuals[0].markers).toContain("consultand");
  });

  test("parses markers: evaluated", () => {
    const ast = parsePedigree(`pedigree\n  a [female, evaluated]`);
    expect(ast.individuals[0].markers).toContain("evaluated");
  });

  test("parses deceased status", () => {
    const ast = parsePedigree(`pedigree\n  a [male, affected, deceased]`);
    expect(ast.individuals[0].status).toBe("deceased");
    expect(ast.individuals[0].geneticStatus).toBe("affected");
  });

  test("parses couple and children", () => {
    const ast = parsePedigree(`pedigree
  I-1 [male]
  I-2 [female]
  I-1 -- I-2
    II-1 [male]
    II-2 [female]`);
    expect(ast.individuals).toHaveLength(4);
    expect(ast.relationships).toHaveLength(3); // married + 2 parent-child
    expect(ast.relationships[0].type).toBe("married");
    expect(ast.relationships[1].type).toBe("parent-child");
    expect(ast.relationships[2].type).toBe("parent-child");
  });

  test("parses consanguinity operator ==", () => {
    const ast = parsePedigree(`pedigree
  a [male]
  b [female]
  a == b`);
    expect(ast.relationships[0].type).toBe("consanguineous");
  });

  test("parses separation operator -/-", () => {
    const ast = parsePedigree(`pedigree
  a [male]
  b [female]
  a -/- b`);
    expect(ast.relationships[0].type).toBe("separated");
  });

  test("parses inline partner definition", () => {
    const ast = parsePedigree(`pedigree
  a [male]
  a -- b [female]`);
    expect(ast.individuals).toHaveLength(2);
    expect(ast.individuals[1].sex).toBe("female");
  });

  test("parses legend definitions", () => {
    const ast = parsePedigree(`pedigree "Cancer"
  legend: breast = "Breast cancer" (fill: quad-tl)
  legend: ovarian = "Ovarian cancer" (fill: quad-tr)
  I-1 [male]`);
    expect(ast.legend).toHaveLength(2);
    expect(ast.legend![0].id).toBe("breast");
    expect(ast.legend![0].label).toBe("Breast cancer");
    expect(ast.legend![0].fill).toBe("quad-tl");
  });

  test("parses affected with specific traits", () => {
    const ast = parsePedigree(`pedigree
  a [female, affected: breast+ovarian]`);
    expect(ast.individuals[0].geneticStatus).toBe("affected");
    expect(ast.individuals[0].conditions).toHaveLength(2);
    expect(ast.individuals[0].conditions![0].label).toBe("breast");
    expect(ast.individuals[0].conditions![1].label).toBe("ovarian");
  });

  test("parses full CF family case", () => {
    const ast = parsePedigree(`pedigree "Cystic Fibrosis Family"
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2
    II-1 [male, unaffected]
    II-2 [female, carrier]
    II-3 [male, affected, proband]
    II-4 [female, unaffected]`);
    expect(ast.individuals).toHaveLength(6);
    expect(ast.relationships).toHaveLength(5); // 1 married + 4 parent-child
    expect(ast.individuals[4].geneticStatus).toBe("affected");
    expect(ast.individuals[4].markers).toContain("proband");
  });

  test("skips comments", () => {
    const ast = parsePedigree(`pedigree
  # Generation I
  I-1 [male]
  // another comment
  I-2 [female]`);
    expect(ast.individuals).toHaveLength(2);
  });

  test("parses label property", () => {
    const ast = parsePedigree(`pedigree\n  a [male, label: "John Smith"]`);
    expect(ast.individuals[0].label).toBe("John Smith");
  });
});
