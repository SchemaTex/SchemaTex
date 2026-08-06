import { describe, expect, test } from "vitest";
import { parseResult, renderResult } from "../../src";

describe("result status", () => {
  test("a lint-capable engine with clean input is valid", () => {
    const result = parseResult(
      'circuit "clean" netlist\nV1 vin 0 5V\nR1 vin mid 10k\nR2 mid 0 10k'
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe("valid");
    expect(result.diagnostics).toHaveLength(0);
  });

  test("an engine without lint is unverified", () => {
    const result = renderResult(
      'venn "Sets"\nset A "Alpha"\nset B "Beta"\nA & B : "Shared"'
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe("unverified");
    expect(result.diagnostics).toHaveLength(0);
  });

  test("non-fatal diagnostics make a successful result partial", () => {
    const result = renderResult(
      'circuit "floating" netlist\nV1 a b 5V\nR1 b a 1k'
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe("partial");
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  test("a parse failure is invalid", () => {
    const result = parseResult('venn "Broken"\nnot valid venn syntax');

    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid");
  });
});
