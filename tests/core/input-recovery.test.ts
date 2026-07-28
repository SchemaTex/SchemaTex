import { describe, test, expect } from "vitest";
import {
  parse,
  parseResult,
  render,
  renderResult,
} from "../../src/core/api";
import { renderDsl, validateDsl } from "../../src/ai";

const ok = (dsl: string, type?: import("../../src/core/api").SchematexConfig["type"]) =>
  renderResult(dsl, type ? { type } : undefined);

describe("markdown code-fence stripping (cross-engine)", () => {
  test("```mermaid-wrapped flowchart still renders", () => {
    const r = ok("```mermaid\nflowchart TD\n  A --> B\n```");
    expect(r.ok).toBe(true);
    expect(r.svg).toContain("<svg");
  });

  test("bare ```-wrapped genogram still renders", () => {
    const r = ok("```\ngenogram\n  a [male]\n  b [female]\n  a -- b\n```");
    expect(r.ok).toBe(true);
    expect(r.type).toBe("genogram");
  });

  test("truncated artifact with only an opening fence is recovered", () => {
    const r = ok("```mermaid\nflowchart LR\n  X --> Y");
    expect(r.ok).toBe(true);
  });

  test("unfenced input is unaffected", () => {
    const r = ok("flowchart TD\n  A --> B");
    expect(r.ok).toBe(true);
  });

  test("a fence with a language tag (```schematex) is stripped", () => {
    const r = ok("```schematex\norgchart\n  CEO\n  CEO -> CTO\n```");
    expect(r.ok).toBe(true);
  });
});

describe("LLM artifact-wrapper stripping (all public entry points)", () => {
  const dirtyDsl = [
    "",
    "```mermaid",
    "<artifact title='Dependency map' type='diagram'>",
    "flowchart TD",
    "  Alpha --> Beta",
    "</parameter>",
    "<｜｜DSML｜｜parameter>",
    "</artifact>",
    "```",
  ].join("\n");

  test("strict parse and render inherit the shared cleanup", () => {
    expect(() => parse(dirtyDsl, { type: "flowchart" })).not.toThrow();
    expect(render(dirtyDsl, { type: "flowchart" })).toContain("<svg");
  });

  test("result APIs inherit the shared cleanup", () => {
    expect(parseResult(dirtyDsl, { type: "flowchart" }).ok).toBe(true);
    expect(renderResult(dirtyDsl, { type: "flowchart" }).ok).toBe(true);
  });

  test("AI validate and render entry points inherit the shared cleanup", () => {
    expect(validateDsl("flowchart", dirtyDsl).ok).toBe(true);
    expect(renderDsl("flowchart", dirtyDsl).ok).toBe(true);
  });

  test("a scalar tool parameter line is removed rather than leaving its value", () => {
    const dsl =
      'timeline\n<parameter name="open" string="true">false</parameter>\n2026: "Launch"';
    expect(renderResult(dsl, { type: "timeline" }).ok).toBe(true);
  });
});

describe("abbreviated header recovery (engine known via config.type)", () => {
  const CASES: [string, NonNullable<import("../../src/core/api").SchematexConfig["type"]>][] = [
    ["flow\n  A --> B", "flowchart"],
    ["org\n  CEO\n  CEO -> CTO", "orgchart"],
    ["gen\n  a [male]\n  b [female]\n  a -- b", "genogram"],
    ["ped\n  a [male]\n  b [female]", "pedigree"],
    ["socio\n  alice\n  bob\n  alice -> bob", "sociogram"],
    ["eco\n  center: maria [female]\n  work [label: \"Job\"]\n  maria --- work", "ecomap"],
  ];
  test.each(CASES)("%j recovers to its canonical header", (dsl, type) => {
    const r = renderResult(dsl, { type });
    expect(r.ok, JSON.stringify(r.diagnostics)).toBe(true);
    expect(r.type).toBe(type);
  });

  test("canonical header is untouched (no double-rewrite)", () => {
    const r = renderResult("flowchart TD\n  A --> B", { type: "flowchart" });
    expect(r.ok).toBe(true);
  });

  test("an unrelated first token is not rewritten", () => {
    // 'graph' is a valid flowchart header and not a prefix of 'flowchart' —
    // must pass through unchanged.
    const r = renderResult("graph TD\n  A --> B", { type: "flowchart" });
    expect(r.ok).toBe(true);
  });
});

describe("fence + abbreviation combined", () => {
  test("fenced AND abbreviated input both recovered", () => {
    const r = renderResult("```\nflow\n  A --> B\n```", { type: "flowchart" });
    expect(r.ok).toBe(true);
  });
});
