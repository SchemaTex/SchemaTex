/**
 * Tests for buildPromptContext — the single-shot prompt assembler.
 */
import { describe, it, expect } from "vitest";
import { buildPromptContext, validateDsl } from "../../src/ai";

describe("buildPromptContext", () => {
  it("assembles a card + worked examples into one block", () => {
    const ctx = buildPromptContext("genogram");
    expect(ctx.type).toBe("genogram");
    expect(ctx.text).toContain("# Genogram (genogram)");
    expect(ctx.text).toContain("Canonical generation syntax");
    expect(ctx.text).toContain("## Worked examples");
    expect(ctx.text).toContain("```");
    expect(ctx.exampleCount).toBeGreaterThan(0);
  });

  it("embeds examples that actually validate (no broken few-shot)", () => {
    const ctx = buildPromptContext("genogram", { examples: 2 });
    // Pull the fenced DSL blocks back out and validate each.
    const blocks = ctx.text.match(/```\n([\s\S]*?)\n```/g) ?? [];
    expect(blocks.length).toBe(ctx.exampleCount);
    for (const block of blocks) {
      const dsl = block.replace(/```\n?/g, "");
      const res = validateDsl("genogram", dsl);
      expect(res.ok, `embedded example failed validation:\n${dsl}`).toBe(true);
    }
  });

  it("omits examples when examples: 0", () => {
    const ctx = buildPromptContext("genogram", { examples: 0 });
    expect(ctx.exampleCount).toBe(0);
    expect(ctx.text).not.toContain("## Worked examples");
  });

  it("throws a helpful error for an unknown type", () => {
    expect(() => buildPromptContext("not-a-diagram")).toThrow(/Unknown diagram type/);
  });
});
