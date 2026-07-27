import { describe, expect, it } from "vitest";
import {
  SAFETY_PREVIEW_SYMBOLS,
  SAFETY_SYMBOLS,
  resolveSafetySymbol,
} from "../../src/diagrams/floorplan/safety-symbols";
import { SAFETY_KINDS } from "../../src/diagrams/floorplan/types";

describe("evacuation safety symbol catalog", () => {
  it("covers every DSL kind and all 40 required glyph/profile variants", () => {
    expect(Object.keys(SAFETY_SYMBOLS).sort()).toEqual([...SAFETY_KINDS].sort());
    expect(Object.keys(SAFETY_PREVIEW_SYMBOLS)).toHaveLength(40);
  });

  it("uses fixed sheet-millimetre definitions and original 24×24 geometry", () => {
    for (const [key, def] of Object.entries(SAFETY_PREVIEW_SYMBOLS)) {
      expect(def.sheetMm, key).toBeGreaterThanOrEqual(7);
      const svg = def.draw({ hand: "right", profile: "iso" });
      expect(svg, key).toMatch(/sx-fp-safety-/);
      expect(svg, key).not.toMatch(/<svg|viewBox|https?:\/\//);
    }
  });

  it("uses solid semantic plates with knockout pictograms", () => {
    const exit = resolveSafetySymbol("exit", {
      hand: "right",
      profile: "iso",
    }).draw({ hand: "right", profile: "iso" });
    const extinguisher = resolveSafetySymbol("extinguisher", {
      hand: "right",
      profile: "iso",
    }).draw({ hand: "right", profile: "iso" });
    expect(exit).toContain("sx-fp-safety-plate-safe");
    expect(exit).toContain("sx-fp-safety-knockout");
    expect(extinguisher).toContain("sx-fp-safety-plate-fire");
    expect(extinguisher).toContain("sx-fp-safety-knockout");
  });

  it("carries the corrected current ISO identity codes", () => {
    expect(SAFETY_SYMBOLS["emergency-door-push"].code).toBe("E022/E023");
    expect(SAFETY_SYMBOLS["emergency-door-slide"].code).toBe("E033/E034");
    expect(SAFETY_SYMBOLS["fire-equipment"].code).toBe("F004");
    expect(SAFETY_SYMBOLS["fire-phone"].code).toBe("F006");
  });

  it("selects distinct ISO/NFPA/UAE profile variants", () => {
    const isoExit = resolveSafetySymbol("exit", {
      hand: "left",
      profile: "iso",
    });
    const nfpaExit = resolveSafetySymbol("exit", {
      hand: "left",
      profile: "nfpa",
    });
    expect(isoExit).not.toBe(nfpaExit);
    expect(isoExit.code).toBe("E001");
    expect(nfpaExit.code).toBe("NFPA 170 Ch.11");

    const isoHere = resolveSafetySymbol("here", {
      hand: "right",
      profile: "iso",
    });
    const uaeHere = resolveSafetySymbol("here", {
      hand: "right",
      profile: "uae",
    });
    expect(isoHere).not.toBe(uaeHere);
    expect(uaeHere.colour).toBe("warning");
  });
});
