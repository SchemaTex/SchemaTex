import { describe, expect, test } from "vitest";
import {
  parseResult,
  render,
  renderPreview,
  renderResult,
  type SchematexConfig,
} from "../../src";
import { getAllDiagramTypes } from "../../src/ai";

describe("preview API", () => {
  test("every diagram type returns a visible preview result", () => {
    for (const type of getAllDiagramTypes()) {
      const result = renderResult("", {
        type: type as SchematexConfig["type"],
      });

      expect(result.svg, type).toContain("<svg");
      expect(result.svg.length, type).toBeGreaterThan(100);
      if (!result.ok) {
        expect(result.status, type).toBe("invalid");
        expect(result.svg, type).toContain("data-schematex-status=\"invalid\"");
        expect(result.diagnostics.length, type).toBeGreaterThan(0);
      }
    }
  });

  test("strict render still throws while preview mode shows diagnostics", () => {
    const bad = "genogram\n  alice -- ghost";

    expect(() => render(bad)).toThrow();
    expect(renderPreview(bad)).toContain("preview could not be rendered");
    expect(render(bad, { mode: "preview" })).toContain(
      "data-schematex-status=\"invalid\""
    );
  });

  test("parseResult reports parser diagnostics without throwing", () => {
    const result = parseResult("flowchart BAD\nA --> B");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.type).toBe("flowchart");
      expect(result.diagnostics[0]?.line).toBe(1);
      expect(result.diagnostics[0]?.code).toBe("DSL_INVALID");
    }
  });
});
