import { describe, it, expect } from "vitest";
import { DIAGRAM_REGISTRY, getExamples } from "../../src/ai";
import { getGenerationProfile } from "../../src/ai/profiles";

// Published example validity is covered by core/svg-xml-conformance.test.ts.
// Here check that every registered family has usable generation guidance.
describe("generation profile coverage", () => {
  it("provides grammar forms and examples for every registered family", () => {
    for (const { type } of DIAGRAM_REGISTRY) {
      const profile = getGenerationProfile(type);
      expect(profile.type).toBe(type);
      expect(profile.forms.length, type).toBeGreaterThan(0);
      expect(getExamples(type, { limit: 1 }).examples.length, type).toBeGreaterThan(0);
    }
  });
});
