import { describe, test, expect } from "vitest";
import { parseMatrix } from "../../src/diagrams/matrix/parser";
import { renderMatrix } from "../../src/diagrams/matrix/renderer";

describe("matrix table style", () => {
  test("style: table flips axis/arrows/grid/quadrant-annotation off", () => {
    const ast = parseMatrix(`matrix eisenhower "This Week"
style: table
Q1: "Ship hotfix"
Q2: "Q3 OKRs"`);
    expect(ast.style).toBe("table");
    expect(ast.config.showAxis).toBe("off");
    expect(ast.config.axisArrows).toBe(false);
    expect(ast.config.gridLines).toBe(false);
    expect(ast.config.quadrantAnnotations).toBe(false);
  });

  test("Q1..Q4 shorthand maps to correct (col,row) cellLabels", () => {
    const ast = parseMatrix(`matrix eisenhower
Q1: "TR"
Q2: "TL"
Q3: "BL"
Q4: "BR"`);
    expect(ast.cellLabels).toHaveLength(4);
    const byLabel = new Map(ast.cellLabels.map((c) => [c.label, c]));
    expect(byLabel.get("TR")).toEqual({ col: 1, row: 1, label: "TR" });
    expect(byLabel.get("TL")).toEqual({ col: 0, row: 1, label: "TL" });
    expect(byLabel.get("BL")).toEqual({ col: 0, row: 0, label: "BL" });
    expect(byLabel.get("BR")).toEqual({ col: 1, row: 0, label: "BR" });
  });

  test("multiple Q1: lines stack as a list inside the same cell", () => {
    const ast = parseMatrix(`matrix eisenhower
style: table
Q1: "Ship hotfix"
Q1: "Customer demo prep"`);
    const tr = ast.cellLabels.filter((c) => c.col === 1 && c.row === 1);
    expect(tr).toHaveLength(2);
    expect(tr[0]!.label).toBe("Ship hotfix");
    expect(tr[1]!.label).toBe("Customer demo prep");
  });

  test("renders 2x2 cellLabels — was previously dropped (the 'I MEANT TABLE' bug)", () => {
    const svg = renderMatrix(`matrix eisenhower "Demo"
style: table
Q1: "Alpha"
Q2: "Beta"`);
    // Both labels must appear in SVG output; previously they vanished in 2x2 quadrant mode.
    expect(svg).toContain("Alpha");
    expect(svg).toContain("Beta");
    // table style should suppress arrowed axes
    expect(svg).not.toContain('marker-end="url(#sx-matrix-arrow)"');
  });

  test("table style suppresses quadrant annotations as overlay (renders inside cells instead)", () => {
    const svg = renderMatrix(`matrix eisenhower "Demo"
style: table
Q1: "Ship hotfix"`);
    // Quadrant title "Do First" should appear (as cell-title), but NOT inside the
    // overlay `sx-matrix-quad-annot` group (that's the non-table layout).
    expect(svg).toContain("Do First");
    expect(svg).not.toContain('id="sx-matrix-quad-annot"');
  });

  test("3x3 cellLabels still render (regression: 9-box talent grid)", () => {
    const svg = renderMatrix(`matrix
grid: 3x3
cell (0,0) label: "low/low"
cell (1,1) label: "core"
cell (2,2) label: "star"`);
    expect(svg).toContain("low/low");
    expect(svg).toContain("core");
    expect(svg).toContain("star");
  });

  test("cell () label: long form still works alongside Q-shorthand", () => {
    const ast = parseMatrix(`matrix eisenhower
style: table
cell (1,1) label: "Direct cell form"
Q1: "Shorthand form"`);
    const tr = ast.cellLabels.filter((c) => c.col === 1 && c.row === 1);
    expect(tr.map((c) => c.label).sort()).toEqual(["Direct cell form", "Shorthand form"]);
  });
});
