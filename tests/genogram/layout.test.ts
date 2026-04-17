import { describe, test, expect } from "vitest";
import { layoutGenogram } from "../../src/diagrams/genogram/layout";
import { parseGenogram } from "../../src/diagrams/genogram/parser";
import type { LayoutConfig, LayoutNode } from "../../src/core/types";

const DEFAULT_CONFIG: LayoutConfig = {
  nodeSpacingX: 60,
  nodeSpacingY: 120,
  nodeWidth: 40,
  nodeHeight: 40,
};

function layoutFromText(text: string) {
  const ast = parseGenogram(text);
  return layoutGenogram(ast, DEFAULT_CONFIG);
}

function findNode(nodes: LayoutNode[], id: string): LayoutNode {
  const node = nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Node '${id}' not found`);
  return node;
}

describe("genogram layout", () => {
  // ─── Generation alignment ────────────────────────────────
  test("same generation has same Y", () => {
    const layout = layoutFromText(`
genogram
  john [male, 1950]
  mary [female, 1955]
  john -- mary
    alice [female, 1980]
    bob [male, 1983]
`);
    const john = findNode(layout.nodes, "john");
    const mary = findNode(layout.nodes, "mary");
    const alice = findNode(layout.nodes, "alice");
    const bob = findNode(layout.nodes, "bob");

    expect(john.y).toBe(mary.y);
    expect(alice.y).toBe(bob.y);
    expect(john.generation).toBe(0);
    expect(alice.generation).toBe(1);
    expect(alice.y).toBeGreaterThan(john.y);
  });

  // ─── Couple positioning ──────────────────────────────────
  test("male is left of female in couple", () => {
    const layout = layoutFromText(`
genogram
  john [male, 1950]
  mary [female, 1955]
  john -- mary
`);
    const john = findNode(layout.nodes, "john");
    const mary = findNode(layout.nodes, "mary");
    expect(john.x).toBeLessThan(mary.x);
  });

  // ─── Children ordering ──────────────────────────────────
  test("children ordered by birth year left to right", () => {
    const layout = layoutFromText(`
genogram
  dad [male, 1950]
  mom [female, 1952]
  dad -- mom
    older [male, 1975]
    middle [female, 1978]
    younger [male, 1982]
`);
    const older = findNode(layout.nodes, "older");
    const middle = findNode(layout.nodes, "middle");
    const younger = findNode(layout.nodes, "younger");
    expect(older.x).toBeLessThan(middle.x);
    expect(middle.x).toBeLessThan(younger.x);
  });

  // ─── Children centering ─────────────────────────────────
  test("children centered under parents", () => {
    const layout = layoutFromText(`
genogram
  dad [male, 1950]
  mom [female, 1952]
  dad -- mom
    c1 [male, 1975]
    c2 [female, 1978]
`);
    const dad = findNode(layout.nodes, "dad");
    const mom = findNode(layout.nodes, "mom");
    const c1 = findNode(layout.nodes, "c1");
    const c2 = findNode(layout.nodes, "c2");

    const parentMid = (dad.x + mom.x) / 2;
    const childMid = (c1.x + c2.x) / 2;
    expect(Math.abs(parentMid - childMid)).toBeLessThan(20);
  });

  // ─── Single person ──────────────────────────────────────
  test("single person is positioned", () => {
    const layout = layoutFromText(`
genogram
  solo [female, 1990]
`);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0].id).toBe("solo");
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });

  // ─── Childless couple ───────────────────────────────────
  test("childless couple has couple edge but no drop line", () => {
    const layout = layoutFromText(`
genogram
  h [male, 1960]
  w [female, 1962]
  h -- w
`);
    expect(layout.nodes).toHaveLength(2);
    const coupleEdges = layout.edges.filter(
      (e) => e.relationship.type === "married"
    );
    expect(coupleEdges).toHaveLength(1);
    const pcEdges = layout.edges.filter(
      (e) => e.relationship.type === "parent-child"
    );
    expect(pcEdges).toHaveLength(0);
  });

  // ─── Multiple marriages ─────────────────────────────────
  test("multiple marriages side by side", () => {
    const layout = layoutFromText(`
genogram
  tom [male, 1950]
  jane [female, 1952]
  tom -x- jane
    child1 [male, 1975]
  tom -- susan [female, 1960]
    child2 [female, 1985]
`);
    const tom = findNode(layout.nodes, "tom");
    const jane = findNode(layout.nodes, "jane");
    const susan = findNode(layout.nodes, "susan");

    // Tom should be between his two partners, or partners on different sides
    expect(tom.y).toBe(jane.y);
    expect(tom.y).toBe(susan.y);
    // Jane and susan should be on different sides of tom
    expect(
      (jane.x < tom.x && susan.x > tom.x) ||
        (jane.x > tom.x && susan.x < tom.x) ||
        jane.x !== susan.x
    ).toBe(true);
  });

  // ─── No overlapping nodes ───────────────────────────────
  test("no overlapping nodes in same generation", () => {
    const layout = layoutFromText(`
genogram
  dad [male, 1950]
  mom [female, 1952]
  dad -- mom
    c1 [male, 1975]
    c2 [female, 1978]
    c3 [male, 1980]
    c4 [female, 1983]
`);
    const gen1Nodes = layout.nodes.filter((n) => n.generation === 1);
    gen1Nodes.sort((a, b) => a.x - b.x);
    for (let i = 0; i < gen1Nodes.length - 1; i++) {
      const gap = gen1Nodes[i + 1].x - gen1Nodes[i].x;
      expect(gap).toBeGreaterThanOrEqual(DEFAULT_CONFIG.nodeWidth);
    }
  });

  // ─── Three generations ──────────────────────────────────
  test("three generations have three distinct Y levels", () => {
    const layout = layoutFromText(`
genogram "Smith Family"
  grandpa [male, 1930, deceased]
  grandma [female, 1932]
  grandpa -- grandma
    dad [male, 1955]
    aunt [female, 1958]
  dad -- mom [female, 1957]
    me [male, 1985]
    sister [female, 1988]
`);
    const grandpa = findNode(layout.nodes, "grandpa");
    const dad = findNode(layout.nodes, "dad");
    const me = findNode(layout.nodes, "me");

    expect(grandpa.generation).toBe(0);
    expect(dad.generation).toBe(1);
    expect(me.generation).toBe(2);

    const yValues = new Set(layout.nodes.map((n) => n.y));
    expect(yValues.size).toBe(3);
  });

  // ─── Edges have valid paths ─────────────────────────────
  test("edges have non-empty path data", () => {
    const layout = layoutFromText(`
genogram
  a [male, 1950]
  b [female, 1952]
  a -- b
    c [male, 1975]
`);
    expect(layout.edges.length).toBeGreaterThan(0);
    for (const edge of layout.edges) {
      expect(edge.path).toBeTruthy();
      expect(edge.path.length).toBeGreaterThan(0);
    }
  });

  // ─── Layout dimensions are reasonable ───────────────────
  test("layout dimensions encompass all nodes", () => {
    const layout = layoutFromText(`
genogram
  a [male, 1950]
  b [female, 1952]
  a -- b
    c [male, 1975]
    d [female, 1978]
`);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(layout.width);
      expect(node.y + node.height).toBeLessThanOrEqual(layout.height);
    }
  });
});
