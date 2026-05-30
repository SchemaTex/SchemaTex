import { describe, test, expect } from "vitest";
import { parseLogic } from "../../src/diagrams/logic/parser";
import { lintLogic } from "../../src/diagrams/logic/lint";
import { parseResult, renderResult } from "../../src/index";

// L2 — "never blank on one bad token" for logic-gate diagrams. An unrecognised
// gate keyword keeps the `unknown` sentinel + raw token; the renderer draws a
// dashed "?" placeholder and the lint pass emits a non-fatal warning.

describe("Logic graceful degradation — unknown gate", () => {
  test("parser keeps an unknown gate instead of throwing", () => {
    const ast = parseLogic(`logic "T"\ninput A, B\nG = LOAD(A, B)\noutput G`);
    const g = ast.gates.find((x) => x.id === "G");
    expect(g?.gateType).toBe("unknown");
    expect(g?.rawType).toBe("LOAD");
    expect(g?.inputs).toEqual(["A", "B"]);
  });

  test("renderResult is ok + partial with a flagged placeholder", () => {
    const res = renderResult(`logic "T"\ninput A, B\nG = LOAD(A, B)\noutput G`);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("partial");
    expect(res.svg).toContain('data-gate-type="unknown"');
  });

  test("lint surfaces LOGIC_UNKNOWN_GATE", () => {
    const diags = lintLogic(`logic "T"\ninput A, B\nG = LOAD(A, B)\noutput G`);
    const d = diags.find((x) => x.code === "LOGIC_UNKNOWN_GATE");
    expect(d).toBeDefined();
    expect(d?.severity).toBe("warning");
    expect(d?.fatal).toBe(false);
    expect(d?.message).toContain("LOAD");
  });

  test("a known gate diagram stays valid (regression)", () => {
    const res = parseResult(`logic "T"\ninput A, B\nG = AND(A, B)\noutput G`);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("valid");
    expect(res.diagnostics).toHaveLength(0);
  });
});
