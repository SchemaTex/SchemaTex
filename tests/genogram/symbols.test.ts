import { describe, test, expect } from "vitest";
import {
  renderIndividualSymbol,
  getRequiredDefs,
  individualPerimeter,
} from "../../src/diagrams/genogram/symbols";
import { genogram } from "../../src/diagrams/genogram";
import type { Individual } from "../../src/core/types";

function makeIndividual(overrides: Partial<Individual> = {}): Individual {
  return {
    id: "test",
    label: "Test",
    sex: "male",
    status: "alive",
    ...overrides,
  };
}

describe("genogram symbols", () => {
  test("male symbol is a rect", () => {
    const svg = renderIndividualSymbol(makeIndividual({ sex: "male" }), 0, 0, 40);
    expect(svg).toContain("<rect");
    expect(svg).toContain("schematex-genogram-male");
    expect(svg).toContain("schematex-genogram-node");
  });

  test("female symbol is a circle", () => {
    const svg = renderIndividualSymbol(
      makeIndividual({ id: "f", sex: "female" }),
      0, 0, 40
    );
    expect(svg).toContain("<circle");
    expect(svg).toContain("schematex-genogram-female");
  });

  test.each(["unknown", "other"] as const)("%s uses a question mark with the existing perimeter", sex => {
    const person = makeIndividual({ sex });
    const svg = renderIndividualSymbol(person, 0, 0, 40);
    expect(svg).not.toMatch(/<(polygon|rect|circle)\b/);
    expect(svg).toMatch(/<text[^>]*class="schematex-genogram-unknown-mark"[^>]*>\?<\/text>/);
    expect(individualPerimeter(person, 40)).toEqual({ half: 20, shape: "diamond" });
    expect(individualPerimeter({ ...person, markers: ["index-person"] }, 40)).toEqual({ half: 24, shape: "diamond" });
  });

  test.each(["unknown", "other"] as const)("%s retains an explicit diamond", sex => {
    const svg = renderIndividualSymbol(makeIndividual({ sex, shape: "diamond" }), 0, 0, 40);
    expect(svg).toContain('<polygon points="0,-20 20,0 0,20 -20,0"');
    expect(svg).not.toContain('>?</text>');
  });

  test("the DSL preserves explicit shapes and the sibling placeholder alongside unknown people", () => {
    const svg = genogram.render(`genogram
  u [unknown]
  o [other]
  d [unknown, shape: diamond]
  s [unknown-siblings]
  u -- o
    ?`);
    const node = (id: string) => svg.match(new RegExp(`<g[^>]*data-individual-id="${id}"[^>]*>[\\s\\S]*?<\\/g>`))?.[0] ?? "";
    for (const id of ["u", "o"]) {
      expect(node(id)).toContain('>?</text>');
      expect(node(id)).not.toContain('<polygon');
    }
    expect(node("d")).toContain('<polygon');
    expect(node("d")).not.toContain('>?</text>');
    expect(node("s")).toContain('<polygon');
    expect(node("s")).toContain('schematex-genogram-unknown-siblings-mark');
    expect(svg.match(/class="schematex-genogram-unknown-siblings-mark"/g)).toHaveLength(2);
  });

  test("unknown-siblings retains its exact diamond and question mark", () => {
    expect(renderIndividualSymbol(makeIndividual({ sex: "unknown", markers: ["unknown-siblings"] }), 0, 0, 40)).toBe(
      '<g class="schematex-genogram-node schematex-genogram-alive schematex-genogram-unknown schematex-genogram-unknown-siblings" data-individual-id="test" data-status="alive" transform="translate(0, 0)">' +
      '<title>Test</title>\n<polygon points="0,-20 20,0 0,20 -20,0" class="schematex-genogram-shape"/>\n' +
      '<text x="0" y="5" class="schematex-genogram-unknown-siblings-mark" text-anchor="middle" font-size="16" font-weight="bold">?</text></g>'
    );
  });

  test.each(["full", "half-left", "quad-tr", "striped", "dotted"] as const)("unknown %s condition uses a rounded frame with a legible question mark and age", fill => {
    const svg = renderIndividualSymbol(makeIndividual({
      sex: "unknown", status: "deceased", age: 42, external: true, markers: ["index-person"],
      conditions: [{ label: "illness", fill, color: "#111111" }],
    }), 0, 0, 40);
    expect(svg).not.toContain("<polygon");
    expect(svg).toMatch(/<rect[^>]*rx="[^"]+"[^>]*class="schematex-genogram-index-border"/);
    expect(svg).toMatch(/<rect[^>]*rx="[^"]+"[^>]*class="schematex-genogram-condition-fill/);
    expect(svg).toContain('stroke-dasharray="4,3"');
    expect(svg.match(/class="schematex-genogram-deceased-mark"/g)).toHaveLength(2);
    expect(svg.indexOf('class="schematex-genogram-unknown-mark"')).toBeGreaterThan(svg.lastIndexOf('class="schematex-genogram-deceased-mark"'));
    expect(svg).toMatch(/<text x="0" y="0"[^>]*class="schematex-genogram-unknown-mark"[^>]*data-contrast="on-dark"[^>]*>\?</);
    expect(svg).toMatch(/<text x="0" y="17"[^>]*class="schematex-genogram-age"[^>]*>42</);
  });

  test.each(["stillborn", "miscarriage", "abortion", "pregnancy"] as const)("%s still overrides unknown sex", status => {
    const svg = renderIndividualSymbol(makeIndividual({ sex: "unknown", status }), 0, 0, 40);
    expect(svg).not.toContain('schematex-genogram-unknown-mark');
    if (status === "abortion") expect(svg).not.toMatch(/<(polygon|rect|circle)\b/);
  });

  test("deceased has X overlay lines", () => {
    const svg = renderIndividualSymbol(
      makeIndividual({ status: "deceased" }),
      0, 0, 40
    );
    expect(svg).toContain("schematex-genogram-deceased");
    const lineCount = (svg.match(/<line /g) || []).length;
    expect(lineCount).toBeGreaterThanOrEqual(2);
  });

  test("includes title for accessibility", () => {
    const svg = renderIndividualSymbol(
      makeIndividual({ label: "John", birthYear: 1950 }),
      0, 0, 40
    );
    expect(svg).toContain("<title>");
    expect(svg).toContain("John");
    expect(svg).toContain("1950");
  });

  test("conditions generate fill elements", () => {
    const svg = renderIndividualSymbol(
      makeIndividual({
        conditions: [{ label: "heart-disease", fill: "full" }],
      }),
      0, 0, 40
    );
    expect(svg).toContain("fill");
  });

  test("multiple conditions stack correctly", () => {
    const svg = renderIndividualSymbol(
      makeIndividual({
        conditions: [
          { label: "condition-a", fill: "full" },
          { label: "condition-b", fill: "half-left" },
        ],
      }),
      0, 0, 40
    );
    expect(svg).toContain("condition-a");
    expect(svg).toContain("condition-b");
  });

  test("data-individual-id attribute is set", () => {
    const svg = renderIndividualSymbol(
      makeIndividual({ id: "john" }),
      100, 50, 40
    );
    expect(svg).toContain('data-individual-id="john"');
  });

  test("getRequiredDefs returns defs for conditions", () => {
    const individuals: Individual[] = [
      makeIndividual({
        conditions: [
          { label: "a", fill: "half-left" },
          { label: "b", fill: "striped" },
        ],
      }),
    ];
    const defsStr = getRequiredDefs(individuals);
    expect(defsStr).toContain("<defs>");
    expect(defsStr).toContain("clipPath");
    expect(defsStr).toContain("pattern");
  });

  test("getRequiredDefs returns empty defs when no conditions", () => {
    const defsStr = getRequiredDefs([makeIndividual()]);
    expect(defsStr).toContain("<defs>");
  });

  test("uses svg builder (contains proper xml structure)", () => {
    const svg = renderIndividualSymbol(makeIndividual(), 0, 0, 40);
    expect(svg).toContain("<g ");
    expect(svg).toContain("</g>");
  });

  // ─── Case B: shape override ────────────────────────────────────
  describe("shape override (Case B)", () => {
    test("shape: triangle overrides male's default square", () => {
      const svg = renderIndividualSymbol(
        makeIndividual({ sex: "male", shape: "triangle" }),
        0, 0, 40
      );
      expect(svg).toContain("<polygon");
      // The base shape <rect> for male should NOT be drawn
      expect(svg).not.toMatch(/<rect[^>]*class="schematex-genogram-shape"/);
    });

    test("shape: triangle-down for matrilineal kinship convention", () => {
      const svg = renderIndividualSymbol(
        makeIndividual({ sex: "male", shape: "triangle-down" }),
        0, 0, 40
      );
      expect(svg).toContain("<polygon");
    });

    test("no shape override falls back to sex-based default", () => {
      const svg = renderIndividualSymbol(makeIndividual({ sex: "female" }), 0, 0, 40);
      expect(svg).toContain("<circle");
    });
  });
});
