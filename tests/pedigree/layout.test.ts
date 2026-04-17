import { describe, test, expect } from "vitest";
import { parsePedigree } from "../../src/diagrams/pedigree/parser";
import { layoutPedigree } from "../../src/diagrams/pedigree/layout";

const config = { nodeSpacingX: 80, nodeSpacingY: 100, nodeWidth: 40, nodeHeight: 40 };

describe("pedigree layout", () => {
  test("places single individual", () => {
    const ast = parsePedigree(`pedigree\n  I-1 [male]`);
    const layout = layoutPedigree(ast, config);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0].generation).toBe(0);
  });

  test("places couple on same generation", () => {
    const ast = parsePedigree(`pedigree
  I-1 [male]
  I-2 [female]
  I-1 -- I-2`);
    const layout = layoutPedigree(ast, config);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.nodes[0].generation).toBe(layout.nodes[1].generation);
  });

  test("children are one generation below parents", () => {
    const ast = parsePedigree(`pedigree
  I-1 [male]
  I-2 [female]
  I-1 -- I-2
    II-1 [male]`);
    const layout = layoutPedigree(ast, config);
    const parent = layout.nodes.find(n => n.id === "i-1")!;
    const child = layout.nodes.find(n => n.id === "ii-1")!;
    expect(child.generation).toBe(parent.generation + 1);
    expect(child.y).toBeGreaterThan(parent.y);
  });

  test("children centered under parents", () => {
    const ast = parsePedigree(`pedigree
  I-1 [male]
  I-2 [female]
  I-1 -- I-2
    II-1 [male]`);
    const layout = layoutPedigree(ast, config);
    const p1 = layout.nodes.find(n => n.id === "i-1")!;
    const p2 = layout.nodes.find(n => n.id === "i-2")!;
    const child = layout.nodes.find(n => n.id === "ii-1")!;
    const parentMidX = (p1.x + p1.width / 2 + p2.x + p2.width / 2) / 2;
    const childCenterX = child.x + child.width / 2;
    expect(Math.abs(parentMidX - childCenterX)).toBeLessThan(2);
  });

  test("generates couple edges", () => {
    const ast = parsePedigree(`pedigree
  I-1 [male]
  I-2 [female]
  I-1 -- I-2`);
    const layout = layoutPedigree(ast, config);
    const coupleEdge = layout.edges.find(e => e.relationship.type === "married");
    expect(coupleEdge).toBeDefined();
    expect(coupleEdge!.path).toContain("M");
    expect(coupleEdge!.path).toContain("L");
  });

  test("generates parent-child edges", () => {
    const ast = parsePedigree(`pedigree
  I-1 [male]
  I-2 [female]
  I-1 -- I-2
    II-1 [male]`);
    const layout = layoutPedigree(ast, config);
    const pcEdges = layout.edges.filter(e => e.relationship.type === "parent-child");
    expect(pcEdges.length).toBeGreaterThanOrEqual(1);
  });

  test("consanguinity generates double edge", () => {
    const ast = parsePedigree(`pedigree
  a [male]
  b [female]
  a == b`);
    const layout = layoutPedigree(ast, config);
    const consEdges = layout.edges.filter(e => e.relationship.type === "consanguineous");
    expect(consEdges).toHaveLength(2);
  });

  test("left margin for generation labels", () => {
    const ast = parsePedigree(`pedigree
  I-1 [male]
  I-2 [female]
  I-1 -- I-2`);
    const layout = layoutPedigree(ast, config);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(50);
    }
  });
});
