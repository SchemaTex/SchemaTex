import { describe, expect, it } from "vitest";
import { DIAGRAM_REGISTRY } from "../../src/ai/registry";

/**
 * `standard` is rendered inline as a single-line citation in product UI (the
 * playground doc bar, gallery cards, ChatDiagram). It is also shipped to npm
 * consumers via `getDiagramMeta`, so a long or repo-internal value leaks into
 * other people's products and breaks their layout.
 *
 * Provenance beyond the primary standard belongs in `standardAlso`.
 */
const MAX_STANDARD_LENGTH = 60;

describe("registry standards are short, public citations", () => {
  for (const meta of DIAGRAM_REGISTRY) {
    describe(meta.type, () => {
      it("has a non-empty primary standard", () => {
        expect(meta.standard.trim()).not.toBe("");
      });

      it(`is at most ${MAX_STANDARD_LENGTH} characters`, () => {
        expect(meta.standard.length).toBeLessThanOrEqual(MAX_STANDARD_LENGTH);
      });

      it("does not leak an internal repository file", () => {
        expect(meta.standard).not.toMatch(/\.md\b/);
        expect(meta.standard).not.toMatch(/\bsee\s+\d/i);
      });

      it("does not cram multiple standards into one line", () => {
        // `·` is the separator the UI itself uses between name and standard,
        // so a standard containing one is a list wearing a scalar's clothes.
        // A single `·`-joined pair is tolerated (e.g. "AWS A2.4 · ISO 2553");
        // more than that belongs in standardAlso.
        expect(meta.standard.split("·").length).toBeLessThanOrEqual(2);
      });

      it("keeps secondary references well-formed", () => {
        for (const also of meta.standardAlso ?? []) {
          expect(also.trim()).not.toBe("");
          expect(also).not.toMatch(/\.md\b/);
        }
      });
    });
  }
});
