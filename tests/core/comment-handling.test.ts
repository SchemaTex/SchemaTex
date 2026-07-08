import { describe, test, expect } from "vitest";
import {
  stripLineComment,
  stripComments,
  UNIVERSAL_COMMENT_MARKERS,
} from "../../src/core/dsl-preprocess";
import { listDiagrams, getExamples, validateDsl } from "../../src/ai";

describe("stripLineComment marker set", () => {
  test("default set strips %%, //, and #", () => {
    expect(stripLineComment("a %% c").trimEnd()).toBe("a");
    expect(stripLineComment("a // c").trimEnd()).toBe("a");
    expect(stripLineComment("a # c").trimEnd()).toBe("a");
  });

  test("narrowing to %% leaves # and // untouched", () => {
    expect(stripLineComment("a # c", UNIVERSAL_COMMENT_MARKERS)).toBe("a # c");
    expect(stripLineComment("a // c", UNIVERSAL_COMMENT_MARKERS)).toBe("a // c");
    expect(stripLineComment("a %% c", UNIVERSAL_COMMENT_MARKERS).trimEnd()).toBe("a");
  });

  test("markers inside double-quoted regions are preserved", () => {
    expect(stripLineComment('label "50%% done"', UNIVERSAL_COMMENT_MARKERS)).toBe(
      'label "50%% done"',
    );
    expect(stripLineComment('n "https://x" %% note', UNIVERSAL_COMMENT_MARKERS).trimEnd()).toBe(
      'n "https://x"',
    );
  });
});

describe("stripComments preserves line positions", () => {
  test("a comment-only line becomes blank, not removed", () => {
    const out = stripComments("a\n%% gone\nb", UNIVERSAL_COMMENT_MARKERS);
    expect(out.split("\n")).toEqual(["a", "", "b"]);
  });
});

// Contract: `%%` is a universal comment marker — injecting a `%%` line into any
// diagram's own valid example must not break validation. Locks the shared
// preprocess pass against per-diagram lexer drift.
describe("%% is a universal comment across every diagram type", () => {
  for (const d of listDiagrams()) {
    const ex = getExamples(d.type, { limit: 1 }).examples[0];
    if (!ex?.dsl) continue; // no bundled example for this type — nothing to assert
    test(`${d.type}: baseline valid, and valid with an injected %% comment`, () => {
      const lines = ex.dsl.split("\n");
      const base = validateDsl(d.type, ex.dsl);
      expect(base.ok, `baseline example should validate: ${JSON.stringify(base)}`).toBe(true);

      const withComment = [lines[0], "%% injected comment line", ...lines.slice(1)].join("\n");
      const after = validateDsl(d.type, withComment);
      expect(after.ok, `%% comment should be ignored: ${JSON.stringify(after)}`).toBe(true);
    });
  }
});

describe("circuit honors SPICE-style comments", () => {
  test("`*` full-line comment is ignored (matches advertised SPICE-style)", () => {
    const dsl = `circuit "T" netlist\n* power section\nV1 vcc 0 12V\nR1 vcc 0 10k`;
    expect(validateDsl("circuit", dsl).ok).toBe(true);
  });

  test("`%%` comment also works via the universal pass", () => {
    const dsl = `circuit "T" netlist\n%% power section\nV1 vcc 0 12V\nR1 vcc 0 10k`;
    expect(validateDsl("circuit", dsl).ok).toBe(true);
  });
});
