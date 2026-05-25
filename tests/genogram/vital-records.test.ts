import { describe, test, expect } from "vitest";
import { parseGenogram } from "../../src/diagrams/genogram/parser";
import { render } from "../../src/index";

// ─── B-1: genealogy / legal family-tree vital records ──────────
// dob/dod ISO dates, note caption, German birth-status glyphs.

describe("vital records — parsing", () => {
  test("dob/dod accept full ISO dates and back-fill birth/death year", () => {
    const ast = parseGenogram(
      `genogram\n  hans [male, dob: "1940-03-12", dod: "2018-11-04"]`
    );
    const hans = ast.individuals.find((i) => i.id === "hans")!;
    expect(hans.dob).toBe("1940-03-12");
    expect(hans.dod).toBe("2018-11-04");
    expect(hans.birthYear).toBe(1940);
    expect(hans.deathYear).toBe(2018);
    // a death date implies deceased
    expect(hans.status).toBe("deceased");
  });

  test("bare 4-digit year still works (backward compatible)", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950, 1990, deceased]`);
    const john = ast.individuals.find((i) => i.id === "john")!;
    expect(john.birthYear).toBe(1950);
    expect(john.deathYear).toBe(1990);
    expect(john.dob).toBeUndefined();
  });

  test("note field is captured", () => {
    const ast = parseGenogram(
      `genogram\n  hans [male, dob: "1940-03-12", note: "Erblasser"]`
    );
    expect(ast.individuals[0].note).toBe("Erblasser");
  });

  test("birth status: out-of-wedlock and adopted", () => {
    const ast = parseGenogram(
      `genogram\n  a [male, birth: out-of-wedlock]\n  b [female, birth: adopted]`
    );
    expect(ast.individuals[0].birthStatus).toBe("out-of-wedlock");
    expect(ast.individuals[1].birthStatus).toBe("adopted");
  });

  test("invalid birth status throws a helpful error", () => {
    expect(() =>
      parseGenogram(`genogram\n  a [male, birth: bogus]`)
    ).toThrow(/Invalid birth status/);
  });
});

describe("vital records — rendering", () => {
  const dsl = `genogram "Erbfolge Witt"
  hans [male, dob: "1940-03-12", dod: "2018-11-04", note: "Erblasser"]
  greta [female, dob: "1943-07-22"]
  hans -- greta "m. 1965"
    klaus [male, dob: "1968-05-01", birth: out-of-wedlock]
    petra [female, dob: "1972-09-15", birth: adopted]`;

  test("born/died dates render as a * … † … caption", () => {
    const svg = render(dsl);
    expect(svg).toContain("* 1940-03-12");
    expect(svg).toContain("† 2018-11-04");
    expect(svg).toContain("schematex-genogram-vitals");
  });

  test("note renders as its own caption line", () => {
    const svg = render(dsl);
    expect(svg).toContain("Erblasser");
    expect(svg).toContain("schematex-genogram-note");
  });

  test("out-of-wedlock born glyph is (*)", () => {
    const svg = render(dsl);
    expect(svg).toContain("(*) 1968-05-01");
  });

  test("adopted born glyph is [*]", () => {
    const svg = render(dsl);
    expect(svg).toContain("[*] 1972-09-15");
  });

  test("born-only person shows * with no dagger", () => {
    const svg = render(`genogram\n  greta [female, dob: "1943-07-22"]`);
    expect(svg).toContain("* 1943-07-22");
    expect(svg).not.toContain("†");
  });

  test("clinical year-only genogram keeps the inline (year–year) suffix", () => {
    const svg = render(`genogram\n  john [male, 1950, 1990, deceased]`);
    expect(svg).toContain("(1950–1990)");
    // no genealogy caption *element* for pure year-only individuals
    // (the CSS rule for the class is always emitted; the <text> is not)
    expect(svg).not.toMatch(/<text[^>]*class="schematex-genogram-vitals"/);
  });
});
