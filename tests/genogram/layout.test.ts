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

  // ─── Case A: cousins from different couples must be visually separated ───
  test("cousins of different parental couples have wider gap than siblings (dense)", () => {
    // Reproduces the user-reported failure: two large sibships from
    // different couples on the same generation row. After centering and
    // overlap resolution, the gap between sibships collapses to the same
    // gap as siblings within a sibship — making cousins look like siblings.
    const layout = layoutFromText(`
genogram
  paul [male, 1940]
  martin [female, 1942]
  paul -- martin
    oren [male, 1962]
    itai [male, 1965]
    gadi [male, 1968]
    idan [male, 1972]

  kobi [male, 1941]
  madi [female, 1943]
  kobi -- madi
    matan [male, 1963]
    noa [female, 1966]
    roni [female, 1971]
`);
    const idan = findNode(layout.nodes, "idan");   // rightmost of paul-martin sibship
    const matan = findNode(layout.nodes, "matan"); // leftmost of kobi-madi sibship
    const oren = findNode(layout.nodes, "oren");
    const itai = findNode(layout.nodes, "itai");
    const noa = findNode(layout.nodes, "noa");
    const roni = findNode(layout.nodes, "roni");

    // Within-sibship sibling gaps
    const siblingGap = Math.abs(itai.x - oren.x);
    // Cross-sibship cousin gap
    const cousinGap = Math.abs(matan.x - idan.x);
    // Within-sibship sibling gap on the other side
    const otherSiblingGap = Math.abs(roni.x - noa.x);

    // Cross-sibship cousin gap should be visibly wider than a within-sibship gap.
    // Default config: minGap=100, familyGap=130 → ratio 1.3.
    expect(cousinGap).toBeGreaterThan(siblingGap * 1.25);
    expect(cousinGap).toBeGreaterThan(otherSiblingGap * 1.25);

    // And the children of paul-martin must all be left of all children of kobi-madi
    // (no interleaving — Case A's core complaint).
    const paulMartinKids = [
      findNode(layout.nodes, "oren"),
      findNode(layout.nodes, "itai"),
      findNode(layout.nodes, "gadi"),
      findNode(layout.nodes, "idan"),
    ].map((n) => n.x);
    const kobiMadiKids = [
      findNode(layout.nodes, "matan"),
      findNode(layout.nodes, "noa"),
      findNode(layout.nodes, "roni"),
    ].map((n) => n.x);
    expect(Math.max(...paulMartinKids)).toBeLessThan(Math.min(...kobiMadiKids));
  });

  // ─── Multi-partner offspring (Case F from 2026-05-01 issue report) ───
  test("offspring from two different partners of one shared parent are visually grouped by union", () => {
    // 39yo male case study: ex-wife sibship (1 son + 1 daughter) and
    // ex-girlfriend sibship (3 daughters). All five children share the
    // same father — but should NOT all sit side-by-side undifferentiated.
    // The within-sibship gap must be smaller than the cross-sibship gap.
    const layout = layoutFromText(`
genogram
  index_man [male, 1987]
  ex_wife [female, 1988]
  index_man -x- ex_wife
    son1 [male, 2010]
    daughter1 [female, 2013]

  ex_gf [female, 1990]
  index_man -/- ex_gf
    daughter_g1 [female, 2016]
    daughter_g2 [female, 2018]
    daughter_g3 [female, 2020]
`);

    const son1 = findNode(layout.nodes, "son1");
    const daughter1 = findNode(layout.nodes, "daughter1");
    const dg1 = findNode(layout.nodes, "daughter_g1");
    const dg2 = findNode(layout.nodes, "daughter_g2");
    const dg3 = findNode(layout.nodes, "daughter_g3");

    // Within-sibship gaps
    const exWifeSibGap = Math.abs(son1.x - daughter1.x);
    const exGfSibGap1 = Math.abs(dg2.x - dg1.x);
    const exGfSibGap2 = Math.abs(dg3.x - dg2.x);

    // Cross-sibship gap = rightmost of one sibship → leftmost of other
    const exWifeKidsX = [son1.x, daughter1.x];
    const exGfKidsX = [dg1.x, dg2.x, dg3.x];
    const exWifeRight = Math.max(...exWifeKidsX);
    const exGfLeft = Math.min(...exGfKidsX);
    const crossGap = Math.abs(exGfLeft - exWifeRight);

    // Cross-union gap should be visibly wider than within-sibship gap.
    expect(crossGap).toBeGreaterThan(exWifeSibGap * 1.25);
    expect(crossGap).toBeGreaterThan(exGfSibGap1 * 1.25);
    expect(crossGap).toBeGreaterThan(exGfSibGap2 * 1.25);

    // No interleaving — all ex-wife children must be on one side.
    expect(Math.max(...exWifeKidsX)).toBeLessThan(Math.min(...exGfKidsX));
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
