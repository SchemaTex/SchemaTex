import { describe, it, expect } from "vitest";
import { DIAGRAM_REGISTRY, getExamples, getSyntax, renderDsl, validateDsl } from "../../src/ai";
import { getGenerationProfile } from "../../src/ai/profiles";

/**
 * The minimum a diagram family must offer a model that has never seen it: a
 * grammar card, a pattern it can copy that actually draws, and a worked
 * example. Everything below is checked from the public surface, because that is
 * the surface an agent gets.
 */

describe("example coverage", () => {
  it("provides an example for every registered family", () => {
    for (const { type } of DIAGRAM_REGISTRY) {
      expect(getExamples(type, { limit: 1 }).examples.length, type).toBeGreaterThan(0);
    }
  });
});

describe("grammar cards", () => {
  it("gives every registered family a profile with concrete forms", () => {
    for (const { type } of DIAGRAM_REGISTRY) {
      const profile = getGenerationProfile(type);
      expect(profile, type).toBeDefined();
      expect(profile!.forms.length, type).toBeGreaterThan(0);
      expect(profile!.header.trim().length, type).toBeGreaterThan(0);
    }
  });

  it("ships a copyable pattern that validates and renders on its own", () => {
    // A pattern is what a model pastes verbatim. If it needs a header line the
    // card never showed, the first attempt fails for a reason the model cannot
    // see. Render as well as validate: valid DSL that throws on draw is worse
    // than invalid DSL, because nothing reports it.
    const broken: string[] = [];
    for (const { type } of DIAGRAM_REGISTRY) {
      const pattern = extractPattern(getSyntax(type).syntax.content);
      if (!pattern) { broken.push(`${type}: no copyable pattern`); continue; }
      // No type argument: the pattern must carry its own header, because a
      // model that pastes it has not told anyone which diagram it meant.
      if (!validateDsl(undefined, pattern).ok) { broken.push(`${type}: does not validate on its own`); continue; }
      if (!renderDsl(undefined, pattern).ok) broken.push(`${type}: validates but does not render`);
    }
    expect(broken).toEqual([]);
  });

  it("keeps every card small enough to sit in one agent tool call", () => {
    // An agent fetches one diagram's card per generation, and that card should
    // cover as much of that diagram's syntax as it can — so this is a drift
    // alarm, not a budget. At roughly twice the average card it only fires when
    // one has grown into a manual. Floorplan is above it because it advertises
    // a 99-part symbol catalog, which is the coverage working as intended.
    const oversize = DIAGRAM_REGISTRY
      .map(({ type }) => ({ type, words: getSyntax(type).syntax.content.trim().split(/\s+/).length }))
      .filter(card => card.words > 1024 && card.type !== "floorplan")
      .map(card => `${card.type} (${card.words} words)`);
    expect(oversize).toEqual([]);
  });
});

/** The fenced block under "## Copyable pattern", dedented. */
function extractPattern(card: string): string | undefined {
  const section = card.split(/^## /m).find(part => part.startsWith("Copyable pattern"));
  if (!section) return undefined;
  const lines = section.split("\n").slice(1);
  const body = lines.filter(line => line.startsWith("    ") || !line.trim());
  const text = body.map(line => line.slice(4)).join("\n").trim();
  return text || undefined;
}
