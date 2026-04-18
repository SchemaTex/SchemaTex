import { describe, test, expect } from "vitest";
import { parseVennDSL, VennParseError } from "../../src/diagrams/venn/parser";

describe("Venn parser — primary syntax", () => {
  test("parses 3-set PRISMA example", () => {
    const ast = parseVennDSL(`
venn "PRISMA"
set pubmed "PubMed"
set embase "Embase"
set cochrane "Cochrane"

pubmed only : 412
embase only : 289
pubmed & embase : 134
pubmed & embase & cochrane : 78
`);
    expect(ast.type).toBe("venn");
    expect(ast.title).toBe("PRISMA");
    expect(ast.sets).toHaveLength(3);
    expect(ast.sets[0]?.id).toBe("pubmed");
    expect(ast.regions).toHaveLength(4);
    const pubmedOnly = ast.regions.find(
      (r) => r.only && r.sets.length === 1 && r.sets[0] === "pubmed"
    );
    expect(pubmedOnly?.value.kind).toBe("integer");
    if (pubmedOnly?.value.kind === "integer") {
      expect(pubmedOnly.value.value).toBe(412);
    }
    const triple = ast.regions.find((r) => r.sets.length === 3);
    expect(triple?.value.kind).toBe("integer");
  });

  test("parses percentages and list values", () => {
    const ast = parseVennDSL(`
venn "mixed"
set A "A"
set B "B"
A only : 15%
B only : [apple, banana]
A & B : "shared"
`);
    expect(ast.regions[0]?.value.kind).toBe("percent");
    expect(ast.regions[1]?.value.kind).toBe("list");
    expect(ast.regions[2]?.value.kind).toBe("text");
  });
});

describe("Venn parser — enumeration syntax", () => {
  test("auto-derives regions from element sets", () => {
    const ast = parseVennDSL(`
venn "math"
A = { 1, 2, 3, 4 }
B = { 3, 4, 5, 6 }
`);
    expect(ast.sets).toHaveLength(2);
    expect(ast.sets[0]?.elements).toEqual(["1", "2", "3", "4"]);
    // regions: A-only {1,2}, B-only {5,6}, A∩B {3,4}
    expect(ast.regions.length).toBeGreaterThanOrEqual(3);
    const ab = ast.regions.find((r) => r.sets.length === 2);
    expect(ab?.value.kind).toBe("list");
    if (ab?.value.kind === "list") {
      expect(ab.value.value).toEqual(["3", "4"]);
    }
  });
});

describe("Venn parser — region-labeled syntax", () => {
  test("accepts `region ... :` alias", () => {
    const ast = parseVennDSL(`
venn "x"
set A "A"
set B "B"
region A only : "only a"
region A & B : "both"
`);
    expect(ast.regions).toHaveLength(2);
    expect(ast.regions[1]?.value.kind).toBe("text");
  });
});

describe("Venn parser — Euler syntax", () => {
  test("parses subset / disjoint relations", () => {
    const ast = parseVennDSL(`
venn "bio" [diagram: euler]
set animals "Animals"
set mammals "Mammals"
set dogs "Dogs"

mammals subset animals
dogs subset mammals
`);
    expect(ast.config.mode).toBe("euler");
    expect(ast.relations).toHaveLength(2);
    expect(ast.relations[0]).toEqual({ from: "mammals", to: "animals", type: "subset" });
  });
});

describe("Venn parser — config", () => {
  test("proportional config via header props", () => {
    const ast = parseVennDSL(`
venn "t" [proportional: true]
set A "A"
set B "B"
A only : 10
`);
    expect(ast.config.proportional).toBe(true);
  });

  test("config: directives", () => {
    const ast = parseVennDSL(`
venn "t"
set A "A"
config: proportional = true
config: palette = monochrome
`);
    expect(ast.config.proportional).toBe(true);
    expect(ast.config.palette).toBe("monochrome");
  });
});

describe("Venn parser — errors", () => {
  test("unknown set reference throws", () => {
    expect(() =>
      parseVennDSL(`
venn "t"
set A "A"
A & Q : 1
`)
    ).toThrow(VennParseError);
  });

  test("missing header throws", () => {
    expect(() => parseVennDSL("not a venn diagram")).toThrow(VennParseError);
  });
});
