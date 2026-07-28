import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { renderResult } from "../../src/core/api";
import { parseBreadboard } from "../../src/diagrams/breadboard/parser";
import { layoutBreadboard } from "../../src/diagrams/breadboard/layout";

interface RegressionFixture {
  error: string;
  engine: "flowchart" | "breadboard" | "timeline";
  outcome: "render" | "warning" | "actionable-error";
  dsl: string;
}

const fixtures = JSON.parse(
  readFileSync(
    new URL("../fixtures/regression/parser-tolerance-2026-07.json", import.meta.url),
    "utf8"
  )
) as RegressionFixture[];

describe("production parser tolerance regressions (2026-07)", () => {
  test("keeps every reported production error verbatim as a fixture", () => {
    expect(fixtures.map((fixture) => fixture.error)).toEqual([
      '[line N:1] expected node identifier, got "```mermaid"',
      '[line N:1] expected node identifier, got "<artifact "',
      "</parameter>",
      "</invoke>",
      "<parameter …>",
      "antml:*",
      "<｜｜DSML｜｜parameter>",
      'expected node identifier, got "الجد1 --> "',
      'got "原因1"',
      'got "סבא1 --> ה"',
      'got "áconos[Diá"',
      'got "ô1 --> Pai"',
      'expected edge operator, got "for F1"',
      'expected edge operator, got ")"',
      "Part 'esp32' has no pin named 'D2'",
      "Part 'nano' has no pin named 'A1' (known pins: ...)",
      "Part 'btn' has no pin named 'pin1'",
      "Grid/module part 'servo' must use @coord placement",
      "Line N: Unrecognized line in section: Tarea C :",
    ]);
  });

  for (const fixture of fixtures.filter((candidate) => candidate.outcome === "render")) {
    test(`renders: ${fixture.error}`, () => {
      const result = renderResult(fixture.dsl, { type: fixture.engine });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.svg).toContain("<svg");
    });
  }

  test("diagnoses unsupported `note for F1` syntax with a repair", () => {
    const fixture = fixtures.find((candidate) => candidate.outcome === "actionable-error")!;
    const result = renderResult(fixture.dsl, { type: "flowchart" });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain(
      "flowchart does not support 'note for <node>' statements"
    );
    expect(result.diagnostics[0]?.hint).toContain('F1["Father');
  });

  test("keeps an empty timeline value as an undated event and warning", () => {
    const fixture = fixtures.find((candidate) => candidate.outcome === "warning")!;
    const result = renderResult(fixture.dsl, { type: "timeline" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("partial");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "timeline/undated-entry",
        line: 3,
      })
    );
  });

  test("unknown breadboard pins include a nearest-name repair", () => {
    const ast = parseBreadboard(`breadboard
parts
  nano: mcu nano @beside-left
wires
  nano:A9 --blue-- @1a`);
    expect(() => layoutBreadboard(ast)).toThrow(/Did you mean 'A[0-7]'\?/);
  });
});
