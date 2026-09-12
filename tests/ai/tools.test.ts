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
  getDiagramCapabilities,
  inspectDiagram,
  applyDiagramEdits,
} from "../../src/ai";

describe("listDiagrams", () => {
  it("lists unique diagram types", () => {
    const types = listDiagrams().map(entry => entry.type);
    expect(types.length).toBeGreaterThan(0);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toContain("genogram");
  });

  it("each entry has tagline + useWhen + standard", () => {
    for (const entry of listDiagrams()) {
      expect(entry.tagline.trim()).not.toBe("");
      expect(entry.useWhen.trim()).not.toBe("");
      expect(entry.standard.trim()).not.toBe("");
    }
  });

  it("uses the canonical interactive capability registry for all engines", () => {
    for (const entry of listDiagrams()) {
      expect(entry.interactive).toEqual(getDiagramCapabilities(entry.type));
    }
  });

  it("publishes canonical reasons for every constrained position model", () => {
    for (const entry of listDiagrams()) {
      if (entry.interactive.position !== "free") {
        expect(entry.interactive.reason, entry.type).toBeTypeOf("string");
        expect(entry.interactive.reason!.trim(), entry.type).not.toBe("");
      }
    }
  });
});

describe("AI-safe editing", () => {
  const dsl = `flowchart TD "Release"
  A[Draft] --> B[Ship]`;

  it("inspects stable targets without leaking source offsets", () => {
    const result = inspectDiagram("flowchart", dsl);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.capabilities.position).toBe("free");
    expect(result.items.some((item) => item.key === "node:A")).toBe(true);
    expect(result.items[0]).not.toHaveProperty("sourceRange");
  });

  it("applies a label and position batch atomically", () => {
    const inspected = inspectDiagram("flowchart", dsl);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const result = applyDiagramEdits("flowchart", dsl, inspected.revision, [
      { target: "node:A", op: "setLabel", value: "Approved" },
      { target: "node:A", op: "setPosition", x: 80, y: 90 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dsl).toContain("A[Approved]");
    expect(result.dsl).toMatch(/^pin A 80,90$/m);
    expect(result.revision).not.toBe(inspected.revision);
  });

  it("rejects stale and partially invalid batches without changing DSL", () => {
    const inspected = inspectDiagram("flowchart", dsl);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;

    const stale = applyDiagramEdits("flowchart", `${dsl}\n`, inspected.revision, [
      { target: "node:A", op: "setLabel", value: "Approved" },
    ]);
    expect(stale.ok).toBe(false);
    if (!stale.ok) {
      expect(stale.code).toBe("STALE_REVISION");
      expect(stale.dsl).toBe(`${dsl}\n`);
    }

    const atomic = applyDiagramEdits("flowchart", dsl, inspected.revision, [
      { target: "node:A", op: "setLabel", value: "Approved" },
      { target: "node:missing", op: "setLabel", value: "Never applied" },
    ]);
    expect(atomic.ok).toBe(false);
    if (!atomic.ok) {
      expect(atomic.code).toBe("TARGET_NOT_FOUND");
      expect(atomic.dsl).toBe(dsl);
    }
  });
});

describe("getSyntax", () => {
  it("returns syntax content for genogram", () => {
    const result = getSyntax("genogram");
    expect(result.type).toBe("genogram");
    expect(result.syntax.detail).toBe("canonical");
    expect(result.syntax.content.trim()).not.toBe("");
    // JSX stripped → no <Playground tags
    expect(result.syntax.content).not.toContain("<Playground");
  });

  it("throws on unknown type", () => {
    expect(() => getSyntax("nonexistent")).toThrow(/Unknown diagram type/);
  });

  it("canonical syntax stays on the generation profile by default", () => {
    for (const entry of listDiagrams()) {
      const { syntax } = getSyntax(entry.type);
      expect(syntax.detail).toBe("canonical");
      expect(syntax.content.trim()).not.toBe("");
    }
  });

  it("renders canonical forms as copyable code instead of Markdown bullets", () => {
    const { syntax } = getSyntax("pid");

    expect(syntax.content).toContain("    inst FT-101 : field_discrete");
    expect(syntax.content).toContain("      measures L2");
    expect(syntax.content).not.toContain("- inst FT-101 : field_discrete");
  });

  it("returns distinct reference content when requested", () => {
    for (const entry of listDiagrams()) {
      const { syntax } = getSyntax(entry.type, { detail: "reference" });
      expect(syntax.detail).toBe("reference");
      expect(syntax.content.trim()).not.toBe("");
      expect(syntax.content).not.toBe(getSyntax(entry.type).syntax.content);
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

  it("returns structured error with line info for a fatal sld error", () => {
    // Post-L2 an *unknown* type is a non-fatal warning, so to exercise the
    // structured-error line-info path we use a still-fatal error: a duplicate
    // node id on line 3.
    const result = validateDsl(
      "sld",
      `sld "test"
UTIL = utility
UTIL = breaker`
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBe(3);
    }
  });

  it("auto-detects type from DSL first-line", () => {
    const result = validateDsl(undefined, "genogram\n  alice [female]");
    expect(result.ok).toBe(true);
    expect(result.type).toBe("genogram");
  });

  it("normalises aliases for explicit and detected types", () => {
    const explicit = validateDsl(
      "entity-structure",
      `entity-structure "Ownership"
entity holdco "HoldCo" corp@US`
    );
    expect(explicit.ok).toBe(true);
    expect(explicit.type).toBe("entity");

    const detected = validateDsl(
      undefined,
      `stateDiagram-v2
[*] --> Running
Running --> [*] : done`
    );
    expect(detected.ok).toBe(true);
    expect(detected.type).toBe("state");
  });

  it("adds a repair hint when a parser reports only an error message", () => {
    const result = validateDsl("flowchart", `flowchart BAD\nA --> B`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].hint).toMatch(/validateDsl again/i);
    }
  });

  // ─── Pass A: parsers backfilled with line/column ────────────────

  it("flowchart parser emits line + column", () => {
    const result = validateDsl("flowchart", `flowchart BAD\nA --> B`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBe(1);
      expect(result.errors[0].column).toBeGreaterThan(0);
    }
  });

  it("decisiontree parser emits line", () => {
    const result = validateDsl(
      "decisiontree",
      `decisiontree "T"\ndecision "Root"\n  bogus "Bad"`
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBeGreaterThan(0);
    }
  });

  it("timeline parser emits line", () => {
    const result = validateDsl(
      "timeline",
      `timeline "T"\nera "Bad"`
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBeGreaterThan(0);
    }
  });

  it("ladder parser emits line + source", () => {
    const result = validateDsl(
      "ladder",
      `ladder "T"\nrung 1:\n  BOGUS(TAG)`
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBe(3);
      expect(result.errors[0].source).toContain("BOGUS");
    }
  });

  it("mindmap degrades a missing root to a partial render with a warning", () => {
    // No `#` H1 → the parser recovers a placeholder root rather than throwing.
    const result = validateDsl("mindmap", `## orphan child`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("partial");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toMatch(/central topic|# Title/i);
    }
  });

  it("timing parser emits line + source", () => {
    const result = validateDsl(
      "timing",
      `timing "T"\nCLK: !!!`
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].source).toContain("CLK");
    }
  });

  it("blockdiagram parser emits line + source", () => {
    const result = validateDsl(
      "blockdiagram",
      `blockdiagram "T"\nA = block("a")\n->`
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].line).toBe(3);
      expect(result.errors[0].source).toContain("->");
    }
  });

  it("orgchart degrades a duplicate id to a partial render with a warning", () => {
    // Re-declaring an id no longer throws — the first declaration is kept.
    const result = validateDsl(
      "orgchart",
      `orgchart "T"\nA: "Alice" | CEO\nA: "Dup" | CEO`
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("partial");
      expect(result.warnings.some((w) => /duplicate/i.test(w.message))).toBe(true);
    }
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
      expect(result.svg).toContain("data-schematex-status=\"invalid\"");
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
      "fbd",
      "sfc",
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
