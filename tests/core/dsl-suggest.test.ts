import { describe, it, expect } from "vitest";
import { suggestKeyword, didYouMean } from "../../src/core/dsl-suggest";

describe("suggestKeyword", () => {
  it("returns the obvious close match", () => {
    expect(suggestKeyword("RES", ["OTE", "OTL", "RES", "OTN"])).toBe("RES");
  });

  it("matches case-insensitively", () => {
    expect(suggestKeyword("res", ["RES"])).toBe("RES");
  });

  it("returns null when nothing is within edit distance 2", () => {
    expect(suggestKeyword("XYZQRS", ["OTE", "OTL", "RES"])).toBeNull();
  });

  it("returns null when two candidates are equally close (ambiguous)", () => {
    // OTE and OTL are both distance 1 from OTX → no clear winner.
    expect(suggestKeyword("OTX", ["OTE", "OTL", "OTN"])).toBeNull();
  });

  it("picks the strictly-closer candidate", () => {
    // distance(MCB1, mcb)=1; distance(MCB1, rcbo)=4 → mcb wins.
    expect(suggestKeyword("MCB1", ["mcb", "rcbo", "iga"])).toBe("mcb");
  });
});

describe("didYouMean", () => {
  it("returns a parenthetical suffix when a match exists", () => {
    expect(didYouMean("RES", ["OTE", "RES"])).toBe(" (did you mean 'RES'?)");
  });

  it("returns empty string when no good match", () => {
    expect(didYouMean("XYZQRS", ["A", "B"])).toBe("");
  });
});
