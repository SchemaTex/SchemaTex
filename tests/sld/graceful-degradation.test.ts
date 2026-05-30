import { describe, test, expect } from "vitest";
import { parseSLDDSL } from "../../src/diagrams/sld/parser";
import { lintSLD } from "../../src/diagrams/sld/lint";
import { parseResult, renderResult } from "../../src/index";

// L2 — "never blank on one bad token". An unrecognised SLD node type must NOT
// throw (which would blank the whole diagram). The parser keeps the node with
// the `unknown` sentinel + the raw token, the renderer draws a visibly-flagged
// placeholder, and the lint pass surfaces a non-fatal warning.

describe("SLD graceful degradation — unknown node type", () => {
  test("parser keeps an unknown type instead of throwing", () => {
    const ast = parseSLDDSL(`sld "T"\nM1 = meter\nB = bus\nM1 -> B`);
    const m1 = ast.nodes.find((n) => n.id === "M1");
    expect(m1?.nodeType).toBe("unknown");
    expect(m1?.rawType).toBe("meter");
    // A real type alongside still parses normally — no collateral damage.
    expect(ast.nodes.find((n) => n.id === "B")?.nodeType).toBe("bus");
  });

  test("renderResult is ok + partial, not invalid/blank", () => {
    const res = renderResult(`sld "T"\nM1 = meter\nB = bus\nM1 -> B`);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("partial");
    expect(res.svg).toContain('data-raw-type="meter"');
  });

  test("lint surfaces SLD_UNKNOWN_DEVICE with a did-you-mean hint", () => {
    const diags = lintSLD(`sld "T"\nM1 = meter\nB = bus\nM1 -> B`);
    const d = diags.find((x) => x.code === "SLD_UNKNOWN_DEVICE");
    expect(d).toBeDefined();
    expect(d?.severity).toBe("warning");
    expect(d?.fatal).toBe(false);
    expect(d?.message).toContain("meter");
  });

  test("parseResult reports partial status and the warning code", () => {
    const res = parseResult(`sld "T"\nM1 = meter\nB = bus\nM1 -> B`);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("partial");
    expect(res.diagnostics.some((d) => d.code === "SLD_UNKNOWN_DEVICE")).toBe(
      true
    );
  });

  test("a fully-known diagram stays valid (regression)", () => {
    const res = parseResult(`sld "T"\nB = bus\nT1 = transformer\nB -> T1`);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("valid");
    expect(res.diagnostics).toHaveLength(0);
  });

  test("duplicate ids are still a fatal error", () => {
    const res = parseResult(`sld "T"\nB = bus\nB = meter`);
    expect(res.ok).toBe(false);
    expect(res.status).toBe("invalid");
  });
});
