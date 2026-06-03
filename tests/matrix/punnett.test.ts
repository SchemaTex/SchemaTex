import { describe, test, expect } from "vitest";
import { parseMatrix } from "../../src/diagrams/matrix/parser";
import { renderMatrix } from "../../src/diagrams/matrix/renderer";
import { computePunnett, reduceRatio, punnettFooter } from "../../src/diagrams/matrix/types";

// ─────────────────────────────────────────────────────────────
// Punnett square — Mendelian cross
//
// DSL shape (canonical grammar):
//   matrix punnett "Title"
//   cross: Bb x Bb               (also `parents:`; separator x / × / *)
//   trait B: "Brown" / "Blue"    (optional phenotype names)
//
// The differentiator is computation: from the two parental genotypes the
// engine derives the gametes, the offspring grid, and the genotype +
// phenotype ratios — the user never fills the grid.
// ─────────────────────────────────────────────────────────────

describe("matrix punnett — parsing", () => {
  test("parses a monohybrid cross into aligned loci", () => {
    const ast = parseMatrix(`matrix punnett "Eye color"\ncross: Bb x Bb`);
    expect(ast.mode).toBe("punnett");
    expect(ast.punnett).toBeDefined();
    expect(ast.punnett!.genes).toEqual([{ dominant: "B", recessive: "b" }]);
    expect(ast.punnett!.parent1).toEqual([["B", "b"]]);
    expect(ast.punnett!.parent2).toEqual([["B", "b"]]);
    // grid dimension = 2^genes
    expect(ast.cols).toBe(2);
    expect(ast.rows).toBe(2);
  });

  test("accepts `parents:` alias and × / * separators", () => {
    for (const dsl of [
      "matrix punnett\nparents: Aa x aa",
      "matrix punnett\ncross: Aa × aa",
      "matrix punnett\ncross: Aa * aa",
    ]) {
      const ast = parseMatrix(dsl);
      expect(ast.punnett!.parent1).toEqual([["A", "a"]]);
      expect(ast.punnett!.parent2).toEqual([["a", "a"]]);
    }
  });

  test("captures optional trait names per locus", () => {
    const ast = parseMatrix(
      `matrix punnett\ncross: Bb x Bb\ntrait B: "Brown eyes" / "Blue eyes"`,
    );
    expect(ast.punnett!.genes[0]).toEqual({
      dominant: "B",
      recessive: "b",
      dominantTrait: "Brown eyes",
      recessiveTrait: "Blue eyes",
    });
  });

  test("aligns parent-2 loci to parent-1 order regardless of letter order", () => {
    const ast = parseMatrix(`matrix punnett\ncross: RrYy x YyRr`);
    // genes follow parent-1 order: R then Y
    expect(ast.punnett!.genes.map((g) => g.dominant)).toEqual(["R", "Y"]);
    // parent-2 realigned: R-locus first, Y-locus second
    expect(ast.punnett!.parent2).toEqual([
      ["R", "r"],
      ["Y", "y"],
    ]);
  });
});

describe("matrix punnett — computed genetics", () => {
  test("monohybrid Bb × Bb gives a 3:1 phenotype and 1:2:1 genotype ratio", () => {
    const ast = parseMatrix(`matrix punnett\ncross: Bb x Bb`);
    const r = computePunnett(ast.punnett!);
    expect(r.gametes1).toEqual(["B", "b"]);
    expect(r.gametes2).toEqual(["B", "b"]);
    expect(r.grid.length).toBe(2);
    expect(r.grid[0]!.length).toBe(2);
    expect(reduceRatio(r.phenotypeRatio.map((p) => p.count))).toBe("3:1");
    // genotype counts: 1 BB, 2 Bb, 1 bb
    const geno = Object.fromEntries(r.genotypeRatio.map((e) => [e.label, e.count]));
    expect(geno).toEqual({ BB: 1, Bb: 2, bb: 1 });
  });

  test("test cross Bb × bb gives a 1:1 phenotype ratio", () => {
    const r = computePunnett(parseMatrix(`matrix punnett\ncross: Bb x bb`).punnett!);
    expect(reduceRatio(r.phenotypeRatio.map((p) => p.count))).toBe("1:1");
  });

  test("homozygous BB × bb gives all heterozygous offspring (1 class)", () => {
    const r = computePunnett(parseMatrix(`matrix punnett\ncross: BB x bb`).punnett!);
    expect(r.phenotypeRatio.length).toBe(1);
    expect(r.genotypeRatio).toEqual([{ key: "Bb", label: "Bb", count: 4 }]);
  });

  test("dihybrid RrYy × RrYy gives the canonical 9:3:3:1 and a 4×4 grid", () => {
    const r = computePunnett(parseMatrix(`matrix punnett\ncross: RrYy x RrYy`).punnett!);
    expect(r.grid.length).toBe(4);
    expect(r.grid[0]!.length).toBe(4);
    expect(reduceRatio(r.phenotypeRatio.map((p) => p.count))).toBe("9:3:3:1");
    // 9 distinct genotypes, summing to 16 cells
    expect(r.genotypeRatio.length).toBe(9);
    expect(r.genotypeRatio.reduce((s, e) => s + e.count, 0)).toBe(16);
  });

  test("dominant allele is always written first in a genotype", () => {
    const r = computePunnett(parseMatrix(`matrix punnett\ncross: Bb x Bb`).punnett!);
    const labels = r.genotypeRatio.map((e) => e.label);
    expect(labels).toContain("Bb"); // never "bB"
    expect(labels).not.toContain("bB");
  });

  test("phenotype labels use trait names when provided", () => {
    const r = computePunnett(
      parseMatrix(`matrix punnett\ncross: Bb x Bb\ntrait B: "Brown" / "Blue"`).punnett!,
    );
    const labels = r.phenotypeRatio.map((p) => p.label);
    expect(labels).toContain("Brown");
    expect(labels).toContain("Blue");
  });

  test("footer collapses the genotype list beyond a monohybrid", () => {
    const di = computePunnett(parseMatrix(`matrix punnett\ncross: RrYy x RrYy`).punnett!);
    expect(punnettFooter(di).genotypeDetail).toBe("9 distinct genotypes");
    const mono = computePunnett(parseMatrix(`matrix punnett\ncross: Bb x Bb`).punnett!);
    expect(punnettFooter(mono).genotypeDetail).toContain("BB");
  });
});

describe("matrix punnett — rendering", () => {
  const SVG = renderMatrix(
    `matrix punnett "Eye color"\ncross: Bb x Bb\ntrait B: "Brown" / "Blue"`,
  );

  test("emits a semantic punnett SVG", () => {
    expect(SVG).toContain('data-mode="punnett"');
    expect(SVG).toContain("<title>");
    expect(SVG).toContain("Punnett square");
  });

  test("draws every offspring genotype and the computed ratio", () => {
    expect(SVG).toContain("BB");
    expect(SVG).toContain("bb");
    expect(SVG).toContain("Phenotype ratio");
    expect(SVG).toContain("3:1");
  });

  test("an empty cross renders a hint rather than crashing", () => {
    const empty = renderMatrix(`matrix punnett "Nothing yet"`);
    expect(empty).toContain('data-mode="punnett"');
    expect(empty).toContain("cross:");
  });
});
