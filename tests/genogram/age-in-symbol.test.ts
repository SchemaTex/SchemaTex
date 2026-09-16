import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { genogram } from "../../src/diagrams/genogram";
import { renderResult } from "../../src/core/api";

function node(svg: string, id: string): string {
  return svg.match(new RegExp(`<g class="schematex-genogram-node[^>]*data-individual-id="${id}"[^>]*>[\\s\\S]*?<\\/g>`))?.[0] ?? "";
}
function age(svg: string): string | undefined {
  return svg.match(/<text\b[^>]*class="schematex-genogram-age"[^>]*>([^<]*)<\/text>/)?.[1];
}

describe("source-dated genogram ages", () => {
  it("uses the assessment year, preserves the title and life dates, and renders deterministically", () => {
    const source = 'genogram "Assessment" [asOf: 2026]\n  p [male, 1969, label: "Person"]';
    const svg = genogram.render(source);
    expect(age(node(svg, "p"))).toBe("57");
    expect(node(svg, "p")).toMatch(/<text x="0" y="5" class="schematex-genogram-age" text-anchor="middle"/);
    expect(svg).toContain('>Assessment</text>');
    expect(svg).toContain('Person (b. 1969)');
    expect(genogram.render(source)).toBe(svg);
    expect(age(node(genogram.render(source.replace("asOf: 2026", "asOf: 2027")), "p"))).toBe("58");
    expect(age(node(renderResult(source).svg, "p"))).toBe("57");
  });

  it("does not guess living ages without asOf or a birth year", () => {
    expect(age(genogram.render('genogram\n  p [female, 1969]'))).toBeUndefined();
    expect(age(genogram.render('genogram [asOf: 2026]\n  p [female]'))).toBeUndefined();
    expect(age(genogram.render('genogram [asOf: 2026]\n  p [pregnancy, 2026]'))).toBeUndefined();
  });

  it("uses age at death independently of asOf, retaining the cross and life dates", () => {
    for (const header of ['genogram', 'genogram [asOf: 2026]']) {
      const svg = genogram.render(`${header}\n  p [male, 1940, deceased, death: 2018, label: "Person"]`);
      const symbol = node(svg, "p");
      expect(age(symbol)).toBe("78");
      expect(symbol.match(/class="schematex-genogram-deceased-mark"/g)).toHaveLength(2);
      expect(symbol.indexOf('class="schematex-genogram-age"')).toBeGreaterThan(symbol.lastIndexOf('class="schematex-genogram-deceased-mark"'));
      expect(symbol).toContain('data-contrast="halo"');
      expect(svg).toContain('paint-order: stroke');
      expect(svg).toContain('Person (1940–2018)');
    }
    expect(age(genogram.render('genogram [asOf: 2026]\n  p [male, 1940, deceased]'))).toBeUndefined();
  });

  it("keeps explicit ages authoritative, including zero and deceased people", () => {
    const svg = genogram.render('genogram [asOf: 2026]\n  p [male, 1969, age: 42]\n  q [female, 1940, deceased, death: 2018, age: 77]\n  baby [unknown, 2026, age: 0]');
    expect(age(node(svg, "p"))).toBe("42");
    expect(age(node(svg, "q"))).toBe("77");
    expect(age(node(svg, "baby"))).toBe("0");
  });

  it.each(['"2026"', '2026.5', '2026-01-01', '2e3', '-2026', '26', '0000', '2026years', ''])("diagnoses invalid assessment year %s in the rendered diagnostic SVG", value => {
    const svg = renderResult(`\n genogram "Assessment" [asOf: ${value}]\n  p [male, 1969]`).svg;
    expect(svg).toContain('data-schematex-status="invalid"');
    expect(svg).toContain('Line 2, col 1');
    expect(svg).toContain('asOf');
    expect(svg).toContain('plain four-digit year');
  });

  it.each(["heritage", "medical"])("renders the documented mode: %s header with an unsupported-property warning", mode => {
    const source = `genogram "T" [mode: ${mode}]\n  p [male, 1969]`;
    for (const svg of [genogram.render(source), renderResult(source).svg]) {
      expect(svg).not.toContain('data-schematex-status="invalid"');
      expect(node(svg, "p")).toContain('schematex-genogram-shape');
      expect(svg).toContain('>T</text>');
      expect(svg).toContain('<desc data-severity="warning" data-code="GENOGRAM_UNIMPLEMENTED_HEADER_PROPERTY" data-line="1">');
      expect(svg).toContain("Header property &apos;mode&apos; is not implemented and has no rendering effect.");
    }
  });

  it.each([
    'asOf: 2026, mode: heritage',
    'mode: heritage, asOf: 2026',
    'extension: "not, implemented", asOf: 2026',
  ])("computes ages alongside general header properties: %s", properties => {
    const svg = renderResult(`genogram "T" [${properties}]\n  alan [male, 1966]\n  bea [female, 1970]`).svg;
    expect(svg).not.toContain('data-schematex-status="invalid"');
    expect(age(node(svg, "alan"))).toBe("60");
    expect(age(node(svg, "bea"))).toBe("56");
    expect(svg.match(/<desc data-severity="warning"/g)).toHaveLength(1);
  });

  it("names an unimplemented property and its line in the SVG warning without affecting geometry", () => {
    const source = '\n# comment\ngenogram "T" [custom-option: enabled]\n  p [male]';
    const svg = renderResult(source).svg;
    expect(svg).toContain('data-severity="warning" data-code="GENOGRAM_UNIMPLEMENTED_HEADER_PROPERTY" data-line="3"');
    expect(svg).toContain("Line 3: Header property &apos;custom-option&apos; is not implemented");
    expect(svg.replace(/<desc data-severity="warning"[^>]*>[\s\S]*?<\/desc>\n/g, ""))
      .toBe(renderResult(source.replace(' [custom-option: enabled]', '')).svg);
  });

  it("still rejects malformed asOf alongside an unsupported property", () => {
    const svg = renderResult('\ngenogram "T" [mode: heritage, asOf: 2026-01-01]\n  p [male, 1966]').svg;
    expect(svg).toContain('data-schematex-status="invalid"');
    expect(svg).toContain('Line 2, col 1');
    expect(svg).toContain('asOf');
    expect(svg).toContain('plain four-digit year');
  });

  it("rejects initials with a line-numbered rendered diagnostic", () => {
    const svg = renderResult('genogram\n  p [male, initials: "JG"]').svg;
    expect(svg).toContain('data-schematex-status="invalid"');
    expect(svg).toContain('Line 2, col 1: initials is not supported');
    expect(svg).toContain('label:');
  });

  it.each([
    ['full, #222', 'on-dark'],
    ['full, #ffffff', 'halo'],
    ['half-left, #222', 'on-dark'],
    ['quad-br, #ffffff', 'halo'],
    ['striped', 'on-dark'],
  ])("keeps the numeral readable over %s", (fill, contrast) => {
    const svg = genogram.render(`genogram [asOf: 2026]\n  p [female, 1969, conditions: condition(${fill})]`);
    expect(age(node(svg, "p"))).toBe("57");
    expect(node(svg, "p")).toContain(`data-contrast="${contrast}"`);
    expect(svg).toContain("paint-order: stroke");
    expect(node(svg, "p")).not.toContain("style=");
    expect(node(svg, "p")).toContain('schematex-genogram-condition-fill');
  });

  it("medical-history displays its assessed ages and age at death", () => {
    const svg = genogram.render(readFileSync('visual-eval/cases/genogram-medical-history/source.sx', 'utf8'));
    expect(age(node(svg, "robert"))).toBe("78");
    expect(svg.match(/<text\b[^>]*class="schematex-genogram-age"/g)).toHaveLength(7);
    for (const [id, value] of [["helen", "83"], ["david", "60"], ["linda", "57"], ["susan", "58"], ["emma", "32"], ["james", "29"]]) {
      expect(age(node(svg, id))).toBe(value);
    }
  });
});
