import { describe, test, expect } from "vitest";
import { parseOrgchart } from "../../src/diagrams/orgchart/parser";
import { lintOrgchart } from "../../src/diagrams/orgchart/lint";
import { renderResult } from "../../src/core/api";

describe("orgchart recoverable-input degradation", () => {
  test("an unparseable line is skipped, not fatal", () => {
    const ast = parseOrgchart(
      'orgchart\nalice : "Alice" | CEO\nthis line is garbage\nbob : "Bob" | CTO [reports: alice]'
    );
    expect(ast.nodes.map((n) => n.id).sort()).toEqual(["alice", "bob"]);
    expect(ast.recovered?.unparseableLines?.length).toBe(1);
    expect(ast.recovered?.unparseableLines?.[0].text).toContain("garbage");
  });

  test("edge-only (Mermaid-style) input synthesizes the referenced nodes", () => {
    const ast = parseOrgchart("orgchart\nCEO -> CTO\nCEO -> CFO\nCTO -> Eng1");
    expect(ast.nodes.map((n) => n.id).sort()).toEqual(["CEO", "CFO", "CTO", "Eng1"]);
    expect(ast.recovered?.impliedNodes?.sort()).toEqual(["CEO", "CFO", "CTO", "Eng1"]);
    // report edges preserved so the layout can build the tree
    expect(ast.edges.filter((e) => e.kind === "report").length).toBe(3);
  });

  test("a duplicate id keeps the first declaration", () => {
    const ast = parseOrgchart('orgchart\nA : "Alice"\nA : "Dup"');
    expect(ast.nodes.length).toBe(1);
    expect(ast.nodes[0].name).toBe("Alice");
    expect(ast.recovered?.duplicateIds).toEqual(["A"]);
  });

  test("a genuinely empty chart still errors", () => {
    expect(() => parseOrgchart('orgchart "Title only"')).toThrow();
  });

  test("lint surfaces each recovery as a warning", () => {
    const diags = lintOrgchart("orgchart\nCEO -> CTO\nbad line here");
    const codes = diags.map((d) => d.code).sort();
    expect(codes).toContain("ORGCHART_IMPLIED_NODE");
    expect(codes).toContain("ORGCHART_UNPARSEABLE_LINE");
    expect(diags.every((d) => d.severity === "warning" && !d.fatal)).toBe(true);
  });

  test("end-to-end render reports partial, not invalid", () => {
    const r = renderResult("orgchart\nCEO -> CTO\nCEO -> CFO");
    expect(r.ok).toBe(true);
    expect(r.status).toBe("partial");
    expect(r.svg).toContain("<svg");
  });
});
