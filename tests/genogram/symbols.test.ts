import { describe, test, expect } from "vitest";
import {
  renderIndividualSymbol,
  getRequiredDefs,
} from "../../src/diagrams/genogram/symbols";
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

  test("unknown symbol is a diamond polygon", () => {
    const svg = renderIndividualSymbol(
      makeIndividual({ id: "u", sex: "unknown" }),
      0, 0, 40
    );
    expect(svg).toContain("<polygon");
    expect(svg).toContain("schematex-genogram-unknown");
  });

  test("other sex uses diamond like unknown", () => {
    const svg = renderIndividualSymbol(
      makeIndividual({ id: "o", sex: "other" }),
      0, 0, 40
    );
    expect(svg).toContain("<polygon");
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
});
