import { describe, test, expect } from "vitest";
import { render } from "../../src/index";
import { parsePedigree } from "../../src/diagrams/pedigree";

describe("pedigree e2e", () => {
  test("render() auto-detects pedigree and produces SVG", () => {
    const svg = render(`pedigree "Test"
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2
    II-1 [male, affected, proband]`);
    expect(svg).toContain("<svg");
    expect(svg).toContain("schematex-pedigree");
    expect(svg).toContain("</svg>");
  });

  test("parse() returns pedigree AST", () => {
    const ast = parsePedigree(`pedigree
  a [male]
  b [female]
  a -- b
    c [male, affected]`);
    expect(ast.type).toBe("pedigree");
    expect(ast.individuals).toHaveLength(3);
    expect(ast.relationships).toHaveLength(2);
  });

  test("Case 1: Autosomal Recessive (CF)", () => {
    const svg = render(`pedigree "Cystic Fibrosis Family"
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2
    II-1 [male, unaffected]
    II-2 [female, carrier]
    II-3 [male, affected, proband]
    II-4 [female, unaffected]`);
    expect(svg).toContain("schematex-pedigree-carrier-fill");
    expect(svg).toContain("schematex-pedigree-affected-fill");
    expect(svg).toContain("schematex-pedigree-proband-arrow-line");
    expect(svg).toContain(">I<");
    expect(svg).toContain(">II<");
  });

  test("Case 2: Consanguinity", () => {
    const svg = render(`pedigree "Consanguineous Marriage"
  I-1 [male, carrier]
  I-2 [female, unaffected]
  I-1 -- I-2
    II-1 [male, carrier]
    II-2 [female, unaffected]
  I-3 [male, unaffected]
  I-4 [female, carrier]
  I-3 -- I-4
    II-3 [female, carrier]
  II-1 == II-3
    III-1 [male, affected, proband]`);
    expect(svg).toContain("schematex-pedigree-edge-consanguineous");
    expect(svg).toContain("schematex-pedigree-affected-fill");
    expect(svg).toContain(">III<");
  });

  test("Case 3: X-Linked Recessive (Hemophilia)", () => {
    const svg = render(`pedigree "Hemophilia A"
  I-1 [male, unaffected]
  I-2 [female, carrier-x]
  I-1 -- I-2
    II-1 [male, affected]
    II-2 [female, carrier-x]
    II-3 [male, unaffected]
    II-4 [female, unaffected]
  II-2 -- II-5 [male, unaffected]
    III-1 [male, affected]
    III-2 [female, carrier-x]
    III-3 [male, unaffected]`);
    expect(svg).toContain("schematex-pedigree-carrier-x-dot");
    expect(svg).toContain("schematex-pedigree-affected-fill");
    expect(svg).toContain(">III<");
  });

  test("Case 4: Huntington (5 generations)", () => {
    const svg = render(`pedigree "Huntington Disease"
  I-1 [male, affected, deceased]
  I-2 [female, deceased]
  I-1 -- I-2
    II-1 [male, affected, deceased]
    II-2 [female, unaffected]
    II-3 [male, unaffected, deceased]
  II-1 -- II-4 [female, unaffected]
    III-1 [female, affected]
    III-2 [male, presymptomatic]
    III-3 [female, unaffected]
  III-1 -- III-4 [male, unaffected]
    IV-1 [male, presymptomatic, proband]
    IV-2 [female, unaffected]
  III-3 -- III-5 [male, unaffected]
    IV-3 [male, unaffected]
    IV-4 [female, unaffected]`);
    expect(svg).toContain(">IV<");
    expect(svg).not.toContain(">V<");
    expect(svg).toContain("schematex-pedigree-presymptomatic");
    expect(svg).toContain("schematex-pedigree-proband-arrow-line");
    expect(svg).toContain("schematex-pedigree-deceased");
  });
});
