import { describe, test, expect } from "vitest";
import { render } from "../../src/core/api";
import { parseGenogram } from "../../src/diagrams/genogram";
import * as fs from "node:fs";
import * as path from "node:path";

const FIXTURES = {
  "nuclear-family": `genogram
  john [male, 1950]
  mary [female, 1955]
  john -- mary
    alice [female, 1980]
    bob [male, 1983]`,

  "three-generation": `genogram "Smith Family"
  grandpa [male, 1930, deceased]
  grandma [female, 1932]
  grandpa -- grandma
    dad [male, 1955]
    aunt [female, 1958]
  dad -- mom [female, 1957]
    me [male, 1985]
    sister [female, 1988]`,

  "divorce-remarriage": `genogram
  tom [male, 1950]
  jane [female, 1952]
  tom -x- jane
    child1 [male, 1975]
  tom -- susan [female, 1960]
    child2 [female, 1985]`,

  "medical-conditions": `genogram
  father [male, 1945, conditions: heart-disease(full) + diabetes(half-left)]
  mother [female, 1948]
  father -- mother
    son [male, 1970, conditions: diabetes(striped)]`,

  "single-individual": `genogram
  solo [female, 1990]`,

  "childless-couple": `genogram
  husband [male, 1960]
  wife [female, 1962]
  husband -- wife`,
};

describe("genogram end-to-end", () => {
  test("render() produces valid SVG from text", () => {
    const svg = render("genogram\n  john [male]\n  mary [female]\n  john -- mary");
    expect(svg).toContain("<svg");
    expect(svg).toContain("john");
    expect(svg).toContain("</svg>");
  });

  test("auto-detects genogram type", () => {
    const ast = parseGenogram("genogram\n  a [male]");
    expect(ast.type).toBe("genogram");
  });

  test("parse returns correct AST structure", () => {
    const ast = parseGenogram(FIXTURES["nuclear-family"]);
    expect(ast.type).toBe("genogram");
    expect(ast.individuals).toHaveLength(4);
    expect(ast.relationships.length).toBeGreaterThan(0);
  });

  test("all 6 standard test cases render without error", () => {
    for (const [name, fixture] of Object.entries(FIXTURES)) {
      const svg = render(fixture);
      expect(svg, `fixture '${name}' should produce valid SVG`).toContain("<svg");
      expect(svg).toContain("</svg>");
    }
  });

  test("rendered SVG contains expected structure", () => {
    const svg = render(FIXTURES["nuclear-family"]);
    expect(svg).toContain("schematex-diagram");
    expect(svg).toContain("schematex-genogram");
    expect(svg).toContain("schematex-genogram-node");
    expect(svg).toContain("schematex-genogram-edge");
    expect(svg).toContain("schematex-genogram-label");
    expect(svg).toContain("<style>");
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
  });

  test("generate example SVGs", () => {
    const examplesDir = path.resolve(__dirname, "../../examples/genogram");

    for (const [name, fixture] of Object.entries(FIXTURES)) {
      const svg = render(fixture);
      const filePath = path.join(examplesDir, `${name}.svg`);
      fs.writeFileSync(filePath, svg, "utf-8");

      // Verify file was written
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("<svg");
    }
  });

  test("throws on non-genogram input", () => {
    expect(() => render("ecomap\n  a [male]")).toThrow();
  });

  test("throws on empty input", () => {
    expect(() => render("")).toThrow();
  });
});
