import { describe, test, expect } from "vitest";
import { parsePhylo } from "../../src/diagrams/phylo/parser";
import { layoutPhylo } from "../../src/diagrams/phylo/layout";
import { renderPhylo } from "../../src/diagrams/phylo/renderer";

// A small hierarchical-clustering tree. Internal merge heights (cophenetic):
//   (A,B) join at 1, then ((A,B),C) joins at 3.
//   (D,E) join at 2, then ((A,B),C),(D,E)) at the root joins at 5.
// Encoded as Newick where each branchLength is the *additional* distance from
// a node up to its parent, so subtree heights come out to {AB:1, ABC:3, DE:2,
// root:5}.
const TREE = `phylo [mode: dendrogram]
  newick: "(((A:1,B:1):2,C:3):2,(D:2,E:2):3);"`;

describe("phylo dendrogram — parsing", () => {
  test("dendrogram mode is flagged in metadata", () => {
    const ast = parsePhylo(TREE);
    expect(ast.metadata?.dendrogram).toBe("true");
  });

  test("cut directive is captured in metadata", () => {
    const ast = parsePhylo(`${TREE}\n  cut 2.5`);
    expect(ast.metadata?.cut).toBe("2.5");
  });

  test("colon form of cut directive is captured", () => {
    const ast = parsePhylo(`${TREE}\n  cut: 4`);
    expect(ast.metadata?.cut).toBe("4");
  });
});

describe("phylo dendrogram — layout", () => {
  test("all leaves align at the same baseline X", () => {
    const ast = parsePhylo(TREE);
    const layout = layoutPhylo(ast);
    const leaves = layout.nodes.filter((n) => n.node.isLeaf);
    expect(leaves.length).toBe(5);
    const baseX = leaves[0].x;
    for (const leaf of leaves) {
      expect(leaf.x).toBeCloseTo(baseX, 5);
    }
    // Baseline equals the recorded dendrogram baseline.
    expect(layout.dendrogram?.baselineX).toBeCloseTo(baseX, 5);
  });

  test("internal nodes are positioned by merge height (higher merge → further left)", () => {
    const ast = parsePhylo(TREE);
    const layout = layoutPhylo(ast);

    const ab = layout.nodes.find(
      (n) => !n.node.isLeaf && n.node.children.some((c) => c.id === "A")
    )!;
    const abc = layout.nodes.find(
      (n) => !n.node.isLeaf && n.node.children.some((c) => c.id === "C")
    )!;
    const root = layout.nodes.find((n) => n.node === ast.root)!;

    // Heights: AB=1, ABC=3, root=5 → deeper merge sits further left (smaller X).
    expect(ab.x).toBeGreaterThan(abc.x);
    expect(abc.x).toBeGreaterThan(root.x);

    // Verify the computed heights themselves.
    const heights = layout.dendrogram!.heights;
    expect(heights.get(ab.node.id)).toBeCloseTo(1, 5);
    expect(heights.get(abc.node.id)).toBeCloseTo(3, 5);
    expect(heights.get(ast.root.id)).toBeCloseTo(5, 5);
  });

  test("internal node X is proportional to merge height", () => {
    const ast = parsePhylo(TREE);
    const layout = layoutPhylo(ast);
    const d = layout.dendrogram!;

    const ab = layout.nodes.find(
      (n) => !n.node.isLeaf && n.node.children.some((c) => c.id === "A")
    )!;
    // x = baselineX - height * scale
    expect(ab.x).toBeCloseTo(d.baselineX - 1 * d.scale, 4);
  });

  test("connectors are rectangular elbows (vertical bar + horizontal arms)", () => {
    const ast = parsePhylo(TREE);
    const layout = layoutPhylo(ast);
    const connectors = layout.branches.filter((b) => b.isConnector);
    const arms = layout.branches.filter((b) => !b.isConnector);
    // Vertical connectors use "V", horizontal arms use "H" — no diagonals.
    for (const c of connectors) expect(c.path).toContain("V");
    for (const a of arms) {
      expect(a.path).toContain("H");
      expect(a.path).not.toContain("L");
    }
    expect(connectors.length).toBeGreaterThan(0);
    expect(arms.length).toBeGreaterThan(0);
  });

  test("internal node Y is the midpoint of its children", () => {
    const ast = parsePhylo(TREE);
    const layout = layoutPhylo(ast);
    const a = layout.nodes.find((n) => n.node.id === "A")!;
    const b = layout.nodes.find((n) => n.node.id === "B")!;
    const ab = layout.nodes.find(
      (n) => !n.node.isLeaf && n.node.children.some((c) => c.id === "A")
    )!;
    expect(ab.y).toBeCloseTo((a.y + b.y) / 2, 5);
  });
});

describe("phylo dendrogram — cut clusters", () => {
  test("cut between the two top merges yields 2 clusters", () => {
    // root merges at 5, the (ABC) side merges at 3, the (DE) side at 2.
    // A cut at 4 severs only the root edge → 2 clusters: {A,B,C} and {D,E}.
    const ast = parsePhylo(`${TREE}\n  cut 4`);
    const layout = layoutPhylo(ast);
    expect(layout.dendrogram?.clusterCount).toBe(2);

    const clusterOfA = layout.dendrogram!.leafCluster.get("A");
    const clusterOfC = layout.dendrogram!.leafCluster.get("C");
    const clusterOfD = layout.dendrogram!.leafCluster.get("D");
    expect(clusterOfA).toBe(clusterOfC); // A and C in the same cluster
    expect(clusterOfA).not.toBe(clusterOfD); // D in a different cluster
  });

  test("lower cut produces more clusters", () => {
    // A cut at 1.5 severs the root (5), the ABC merge (3), and the DE merge (2),
    // leaving (A,B)=1 intact, and singletons C, D, E → 4 clusters.
    const ast = parsePhylo(`${TREE}\n  cut 1.5`);
    const layout = layoutPhylo(ast);
    expect(layout.dendrogram?.clusterCount).toBe(4);

    const clusterOfA = layout.dendrogram!.leafCluster.get("A");
    const clusterOfB = layout.dendrogram!.leafCluster.get("B");
    expect(clusterOfA).toBe(clusterOfB); // (A,B) still together at height 1
    expect(layout.dendrogram!.leafCluster.get("C")).not.toBe(clusterOfA);
  });

  test("cut above the root yields a single cluster", () => {
    const ast = parsePhylo(`${TREE}\n  cut 100`);
    const layout = layoutPhylo(ast);
    expect(layout.dendrogram?.clusterCount).toBe(1);
  });

  test("no cut directive → no clusters", () => {
    const ast = parsePhylo(TREE);
    const layout = layoutPhylo(ast);
    expect(layout.dendrogram?.cut).toBeUndefined();
    expect(layout.dendrogram?.clusterCount).toBe(0);
  });
});

describe("phylo dendrogram — rendering", () => {
  test("renders a height axis and no error", () => {
    const ast = parsePhylo(TREE);
    const svg = renderPhylo(layoutPhylo(ast));
    expect(svg).toContain("schematex-phylo-dendro-axis");
    expect(svg).toContain("<svg");
  });

  test("cut renders a dashed cut line and cluster colour classes", () => {
    const ast = parsePhylo(`${TREE}\n  cut 4`);
    const svg = renderPhylo(layoutPhylo(ast));
    expect(svg).toContain("schematex-phylo-dendro-cut");
    expect(svg).toContain("schematex-phylo-clade-cut0");
    expect(svg).toContain("cut = 4");
  });

  test("dendrogram desc mentions dendrogram, not the cladogram base", () => {
    const ast = parsePhylo(TREE);
    const svg = renderPhylo(layoutPhylo(ast));
    expect(svg).toContain("dendrogram mode");
  });
});

describe("phylo dendrogram — indent-tree input", () => {
  test("indent tree with branch lengths produces merge-height layout", () => {
    const ast = parsePhylo(`phylo [mode: dendrogram]
root:
  cluster1:
    A: 1
    B: 1
  C: 3`);
    const layout = layoutPhylo(ast);
    const leaves = layout.nodes.filter((n) => n.node.isLeaf);
    expect(leaves.length).toBe(3);
    const baseX = leaves[0].x;
    for (const leaf of leaves) expect(leaf.x).toBeCloseTo(baseX, 5);
  });
});
