import { describe, test, expect } from "vitest";
import { parseVennDSL } from "../../src/diagrams/venn/parser";
import { layoutVenn } from "../../src/diagrams/venn/layout";

describe("Venn layout dispatcher", () => {
  test("n=2 fixed layout places two circles", () => {
    const ast = parseVennDSL(`
venn "x"
set A "A"
set B "B"
A only : 10
B only : 8
A & B : 3
`);
    const layout = layoutVenn(ast);
    expect(layout.mode).toBe("venn");
    expect(layout.shapes).toHaveLength(2);
    expect(layout.shapes[0]?.kind).toBe("circle");
  });

  test("n=3 classic — three circles form equilateral triangle", () => {
    const ast = parseVennDSL(`
venn "x"
set A "A"
set B "B"
set C "C"
A only : 10
B only : 10
C only : 10
`);
    const layout = layoutVenn(ast);
    expect(layout.shapes).toHaveLength(3);
    const [a, b, c] = layout.shapes;
    if (a?.kind !== "circle" || b?.kind !== "circle" || c?.kind !== "circle") {
      throw new Error("expected circles");
    }
    const d1 = Math.hypot(a.cx - b.cx, a.cy - b.cy);
    const d2 = Math.hypot(a.cx - c.cx, a.cy - c.cy);
    expect(d1).toBeCloseTo(d2, 1);
  });

  test("n=4 produces four ellipses", () => {
    const ast = parseVennDSL(`
venn "x"
set A "A"
set B "B"
set C "C"
set D "D"
A only : 1
B only : 1
C only : 1
D only : 1
`);
    const layout = layoutVenn(ast);
    expect(layout.shapes).toHaveLength(4);
    expect(layout.shapes[0]?.kind).toBe("ellipse");
  });

  test("euler subset → nested circles", () => {
    const ast = parseVennDSL(`
venn "x" [diagram: euler]
set big "big"
set small "small"
small subset big
`);
    const layout = layoutVenn(ast);
    expect(layout.mode).toBe("euler");
    const big = layout.shapes.find((s) => s.id === "big");
    const small = layout.shapes.find((s) => s.id === "small");
    if (big?.kind !== "circle" || small?.kind !== "circle") {
      throw new Error("expected circles");
    }
    expect(small.r).toBeLessThan(big.r);
    // small should be inside big
    const dx = small.cx - big.cx;
    const dy = small.cy - big.cy;
    const d = Math.hypot(dx, dy);
    expect(d + small.r).toBeLessThan(big.r + 1);
  });

  test("proportional n=2 produces differently sized circles", () => {
    const ast = parseVennDSL(`
venn "x" [proportional: true]
set A "A"
set B "B"
A only : 90
B only : 10
A & B : 5
`);
    const layout = layoutVenn(ast);
    const a = layout.shapes[0];
    const b = layout.shapes[1];
    if (a?.kind !== "circle" || b?.kind !== "circle") {
      throw new Error("expected circles");
    }
    expect(a.r).toBeGreaterThan(b.r);
  });

  test("labels are emitted for regions with values", () => {
    const ast = parseVennDSL(`
venn "x"
set A "A"
set B "B"
A only : 10
B only : 8
A & B : 3
`);
    const layout = layoutVenn(ast);
    expect(layout.labels.length).toBeGreaterThan(0);
    const vals = new Set(layout.labels.map((l) => l.label));
    expect(vals.has("10")).toBe(true);
    expect(vals.has("8")).toBe(true);
    expect(vals.has("3")).toBe(true);
  });
});
