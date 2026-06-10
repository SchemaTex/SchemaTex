import { describe, it, expect } from "vitest";
import {
  estimateTextWidth,
  estimateMaxLineWidth,
  isFullWidth,
} from "../../src/core/text-metrics";

describe("text-metrics", () => {
  describe("isFullWidth", () => {
    it("detects CJK ideographs, kana, hangul, full-width forms", () => {
      for (const ch of ["中", "図", "の", "カ", "한", "，", "Ａ", "　"]) {
        expect(isFullWidth(ch), ch).toBe(true);
      }
    });

    it("rejects Latin, digits, half-width punctuation", () => {
      for (const ch of ["a", "Z", "9", ".", " ", "é"]) {
        expect(isFullWidth(ch), ch).toBe(false);
      }
    });
  });

  describe("estimateTextWidth", () => {
    it("scales linearly with font size", () => {
      const at12 = estimateTextWidth("Hello", 12);
      const at24 = estimateTextWidth("Hello", 24);
      expect(at24).toBeCloseTo(at12 * 2, 5);
    });

    it("counts a full-width char as a full em", () => {
      expect(estimateTextWidth("中", 12)).toBe(12);
      expect(estimateTextWidth("中文", 16)).toBe(32);
    });

    it("measures CJK wider than the same count of Latin chars", () => {
      expect(estimateTextWidth("中文标签", 12)).toBeGreaterThan(
        estimateTextWidth("abcd", 12)
      );
    });

    it("measures narrow glyphs below average and digits above", () => {
      const narrow = estimateTextWidth("ill", 12);
      const avg = estimateTextWidth("ooo", 12);
      const wide = estimateTextWidth("000", 12);
      expect(narrow).toBeLessThan(avg);
      expect(avg).toBeLessThan(wide);
    });

    it("widens for bold weights", () => {
      expect(estimateTextWidth("Label", 12, { fontWeight: 700 })).toBeGreaterThan(
        estimateTextWidth("Label", 12)
      );
    });

    it("uses a flat factor for monospace", () => {
      expect(estimateTextWidth("il", 10, { monospace: true })).toBeCloseTo(12, 5);
      // full-width still counts 1.0 em in monospace
      expect(estimateTextWidth("中i", 10, { monospace: true })).toBeCloseTo(16, 5);
    });

    it("stays within a sane band for a typical mixed label", () => {
      // "Heater watts" at 11.5px — real paint ≈ 70px in system-ui.
      const w = estimateTextWidth("Heater watts", 11.5);
      expect(w).toBeGreaterThan(55);
      expect(w).toBeLessThan(85);
    });
  });

  describe("estimateMaxLineWidth", () => {
    it("returns the widest line", () => {
      const w = estimateMaxLineWidth("short\na much longer line", 12);
      expect(w).toBe(estimateTextWidth("a much longer line", 12));
    });
  });
});
