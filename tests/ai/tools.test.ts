/**
 * Tests for the AI tool layer (src/ai/tools.ts).
 *
 * Exercises the full pipeline — registry, examples, syntax, validation,
 * rendering — without any MCP or AI SDK transport.
 */
import { describe, it, expect } from "vitest";
import {
  listDiagrams,
  getSyntax,
  getExamples,
  validateDsl,
  renderDsl,
} from "../../src/ai";

describe("listDiagrams", () => {
  it("returns all 20 diagram types", () => {
    const list = listDiagrams();
    expect(list.length).toBe(20);
    const types = list.map((d) => d.type);
    expect(types).toContain("genogram");
    expect(types).toContain("sld");
    expect(types).toContain("fishbone");
    expect(types).toContain("decisiontree");
  });

  it("each entry has tagline + useWhen + standard", () => {
    for (const entry of listDiagrams()) {
      expect(entry.tagline.length).toBeGreaterThan(10);
      expect(entry.useWhen.length).toBeGreaterThan(20);
      expect(entry.standard.length).toBeGreaterThan(3);
    }
  });
});

describe("getSyntax", () => {
  it("returns syntax content for genogram", () => {
    const result = getSyntax("genogram");
    expect(result.type).toBe("genogram");
    expect(result.syntax.content.length).toBeGreaterThan(500);
    // JSX stripped → no <Playground tags
    expect(result.syntax.content).not.toContain("<Playground");
  });

  it("returns syntax for sld", () => {
    const result = getSyntax("sld");
    expect(result.syntax.content.length).toBeGreaterThan(100);
  });

  it("throws on unknown type", () => {
    expect(() => getSyntax("nonexistent")).toThrow(/Unknown diagram type/);
  });

  it("every syntax doc is trimmed — starts at '## 1.' and excludes trailing sections", () => {
    // The build-time trim drops the `## About …` prelude and the trailing
    // Standard-compliance / Related-examples / Roadmap sections because they
    // don't help an LLM generate DSL. See scripts/build-ai-content.mjs.
    for (const entry of listDiagrams()) {
      const { syntax } = getSyntax(entry.type);
      expect(syntax.content.startsWith("## 1. "), entry.type).toBe(true);
      expect(syntax.content).not.toMatch(/^## \d+\. Standard compliance/m);
      expect(syntax.content).not.toMatch(/^## \d+\. Related examples/m);
      expect(syntax.content).not.toMatch(/^## \d+\. Roadmap/m);
    }
  });
});

describe("getExamples", () => {
  it("returns genogram examples with dsl field", () => {
    const result = getExamples("genogram");
    expect(result.type).toBe("genogram");
    expect(result.count).toBeGreaterThan(0);
    for (const ex of result.examples) {
      expect(ex.dsl).toMatch(/^genogram/);
      expect(ex.title.length).toBeGreaterThan(0);
    }
  });

  it("respects limit option", () => {
    const result = getExamples("genogram", { limit: 2 });
    expect(result.count).toBeLessThanOrEqual(2);
  });

  it("filters by maxComplexity", () => {
    const result = getExamples("genogram", { maxComplexity: 1 });
    for (const ex of result.examples) {
      expect(ex.complexity).toBeLessThanOrEqual(1);
    }
  });

  it("normalises blockdiagram ↔ block alias", () => {
    const result = getExamples("blockdiagram");
    expect(result.count).toBeGreaterThan(0);
  });

  it("throws on unknown type", () => {
    expect(() => getExamples("nonexistent")).toThrow();
  });
});

describe("validateDsl", () => {
  it("accepts valid genogram DSL", () => {
    const result = validateDsl(
      "genogram",
      `genogram
  alice [female, 1980]
  bob [male, 1978]
  alice -- bob
    carol [female, 2008]`
    );
    expect(result.ok).toBe(true);
  });

  it("returns structured error with line info for bad genogram", () => {
    const result = validateDsl(
      "genogram",
      `genogram
  alice [female, 1980]
  alice -- nobody
    carol [female, 2008]`
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toMatch(/unknown|nobody/i);
      // genogram parser tracks line info
      expect(result.errors[0].line).toBeGreaterThan(0);
    }
  });

  it("returns structured error with line info for bad sld (newly upgraded)", () => {
    const result = validateDsl(
      "sld",
      `sld "test"
UTIL = utility
FOO = notatype
UTIL -> FOO`
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBe(3);
    }
  });

  it("auto-detects type from DSL first-line", () => {
    const result = validateDsl(undefined, "genogram\n  alice [female]");
    expect(result.ok).toBe(true);
  });
});

describe("renderDsl", () => {
  it("produces SVG for valid input", () => {
    const result = renderDsl(
      "genogram",
      `genogram
  alice [female, 1980]`
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
    }
  });

  it("returns structured errors on parse failure", () => {
    const result = renderDsl("genogram", `genogram\n  alice -- ghost`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("example DSL integrity", () => {
  it("every bundled example renders without error", () => {
    for (const diagramType of [
      "genogram",
      "ecomap",
      "pedigree",
      "sld",
      "fishbone",
      "sociogram",
    ]) {
      const { examples } = getExamples(diagramType, { limit: 10 });
      for (const ex of examples) {
        const r = renderDsl(undefined, ex.dsl);
        if (!r.ok) {
          throw new Error(
            `Example ${ex.slug} failed to render: ${r.errors[0]?.message}`
          );
        }
      }
    }
  });
});
