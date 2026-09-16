import { describe, it, expect } from "vitest";
import { DIAGRAM_REGISTRY, getExamples } from "../../src/ai";

// Published example validity is covered by core/svg-xml-conformance.test.ts.
// Require example coverage even when a newly registered family has no corpus entries.
describe("example coverage", () => {
  it("provides an example for every registered family", () => {
    for (const { type } of DIAGRAM_REGISTRY) {
      expect(getExamples(type, { limit: 1 }).examples.length, type).toBeGreaterThan(0);
    }
  });
});
