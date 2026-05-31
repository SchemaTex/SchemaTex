import { describe, test, expect } from "vitest";
import { parseMindmap } from "../../src/diagrams/mindmap/parser";
import { lintMindmap } from "../../src/diagrams/mindmap/lint";
import { renderResult } from "../../src/core/api";

describe("mindmap missing-root degradation", () => {
  test("bullets-only input synthesizes a placeholder root instead of throwing", () => {
    const ast = parseMindmap("mindmap\n  - Marketing\n  - Sales\n  - Engineering");
    expect(ast.root).toBeDefined();
    expect(ast.rootInferred).toBe("placeholder");
    // the three branches hang off the synthesized root
    expect(ast.root.children.length).toBe(3);
  });

  test("a bare first line (no #) is adopted as the central topic", () => {
    const ast = parseMindmap("mindmap\nMy Project\n  - Phase 1\n  - Phase 2");
    expect(ast.rootInferred).toBe("line");
    expect(ast.root.label).toBe("My Project");
    expect(ast.root.children.length).toBe(2);
  });

  test("an explicit # root is unchanged (no degradation flag)", () => {
    const ast = parseMindmap("# Root\n  - a\n  - b");
    expect(ast.rootInferred).toBeUndefined();
    expect(ast.root.label).toBe("Root");
  });

  test("a completely empty document still errors (nothing to draw)", () => {
    expect(() => parseMindmap("mindmap\n%% theme: dark")).toThrow();
  });

  test("lint surfaces a synthesized-root warning", () => {
    const diags = lintMindmap("mindmap\n  - only a bullet");
    expect(diags.length).toBe(1);
    expect(diags[0].code).toBe("MINDMAP_SYNTHESIZED_ROOT");
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].fatal).toBe(false);
  });

  test("end-to-end render reports partial status, not invalid", () => {
    const r = renderResult("mindmap\n  - Marketing\n  - Sales");
    expect(r.ok).toBe(true);
    expect(r.status).toBe("partial");
    expect(r.svg).toContain("<svg");
    expect(r.diagnostics[0]?.code).toBe("MINDMAP_SYNTHESIZED_ROOT");
  });
});
