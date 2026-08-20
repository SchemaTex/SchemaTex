import { describe, expect, it } from "vitest";
import {
  SAFETY_PREVIEW_SYMBOLS,
  SAFETY_SYMBOLS,
  resolveSafetySymbol,
} from "../../src/diagrams/floorplan/safety-symbols";
import {
  SAFETY_ALIASES,
  SAFETY_KINDS,
  type SafetyName,
} from "../../src/diagrams/floorplan/types";
import { getSymbolCatalog } from "../../src/symbols-catalog";

describe("evacuation safety symbol catalog", () => {
  it("covers every DSL kind and all required glyph/profile variants", () => {
    expect(Object.keys(SAFETY_SYMBOLS).sort()).toEqual([...SAFETY_KINDS].sort());
    expect(Object.keys(SAFETY_PREVIEW_SYMBOLS)).toHaveLength(45);
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
    expect(SAFETY_SYMBOLS["exit-direction"].code).toBe(
      "E001/E002 + ISO 3864-3 arrow"
    );
    expect(SAFETY_SYMBOLS["emergency-door-push"].code).toBe("E022/E023");
    expect(SAFETY_SYMBOLS["emergency-door-slide"].code).toBe("E033/E034");
    expect(SAFETY_SYMBOLS["fire-equipment"].code).toBe("F004");
    expect(SAFETY_SYMBOLS["fire-phone"].code).toBe("F006");
  });

  it("draws a pictogram-first composite exit-direction sign", () => {
    const def = resolveSafetySymbol("exit-direction", {
      hand: "left",
      profile: "iso",
    });
    const svg = def.draw({ hand: "left", profile: "iso" });
    expect(def.colour).toBe("safe");
    expect(svg).toContain("sx-fp-safety-plate-safe");
    expect(svg).toContain("sx-fp-safety-knockout");
    expect(svg).not.toContain("EXIT");
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

  it("publishes the safety catalog and its common aliases for tool discovery", () => {
    const catalog = getSymbolCatalog("evacuation");
    expect(catalog?.entries.map(({ id }) => id).sort()).toEqual(
      [...SAFETY_KINDS].sort()
    );
    expect(
      catalog?.entries.find(({ id }) => id === "extinguisher")?.aliases
    ).toContain("fire-extinguisher");
    expect(
      catalog?.entries.find(({ id }) => id === "assembly")?.aliases
    ).toEqual(expect.arrayContaining(["assembly-point", "muster-point"]));
    expect(catalog?.entries.find(({ id }) => id === "exit")?.svg).toContain(
      "#00843D"
    );
    expect(
      catalog?.entries.find(({ id }) => id === "extinguisher")?.svg
    ).toContain("#C8102E");
  });

  it.each(Object.entries(SAFETY_ALIASES))(
    "resolves and draws the alias %s as %s",
    (alias, canonical) => {
      const fromAlias = resolveSafetySymbol(alias as SafetyName, {
        hand: "right",
        profile: "iso",
      });
      const fromCanonical = resolveSafetySymbol(canonical, {
        hand: "right",
        profile: "iso",
      });
      expect(fromAlias.code).toBe(fromCanonical.code);
      expect(fromAlias.colour).toBe(fromCanonical.colour);
      expect(fromAlias.draw({ hand: "right", profile: "iso" })).toMatch(
        /sx-fp-safety-/
      );
    }
  );
});
