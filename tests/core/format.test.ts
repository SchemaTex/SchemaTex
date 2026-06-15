import { describe, expect, it } from "vitest";
import { formatProbability } from "../../src/core/format";

describe("formatProbability", () => {
  it("clamps the endpoints", () => {
    expect(formatProbability(0)).toBe("0");
    expect(formatProbability(-0.1)).toBe("0");
    expect(formatProbability(1)).toBe("1");
    expect(formatProbability(1.2)).toBe("1");
  });

  it("uses scientific notation for tiny values", () => {
    expect(formatProbability(1e-4)).toBe("1.00e-4");
    expect(formatProbability(0.00012)).toBe("1.20e-4");
  });

  it("uses three significant figures mid-range", () => {
    expect(formatProbability(0.0234)).toBe("0.0234");
    expect(formatProbability(0.5)).toBe("0.5");
  });

  it("never rounds a sub-1 value up to 1 — the nines survive", () => {
    expect(formatProbability(0.9999)).toBe("0.9999");
    expect(formatProbability(0.999999)).toBe("0.999999");
    expect(formatProbability(0.99987)).not.toBe("1");
  });
});
