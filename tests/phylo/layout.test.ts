import { describe, test, expect } from "vitest";
import { parsePhylo } from "../../src/diagrams/phylo/parser";
import { layoutPhylo } from "../../src/diagrams/phylo/layout";

describe("phylo layout — rectangular phylogram", () => {
  test("basic tree produces correct number of nodes", () => {
    const ast = parsePhylo(`phylo\n  newick: "((A:0.1,B:0.2):0.3,C:0.5);"`);
    const layout = layoutPhylo(ast);
    expect(layout.nodes.length).toBeGreaterThanOrEqual(4); // root + internal + 3 leaves
  });

  test("leaves have increasing Y values", () => {
    const ast = parsePhylo(`phylo\n  newick: "(A:0.1,B:0.2,C:0.3);"`);
    const layout = layoutPhylo(ast);
    const leaves = layout.nodes.filter((n) => n.node.isLeaf);
    for (let i = 1; i < leaves.length; i++) {
      expect(leaves[i].y).toBeGreaterThan(leaves[i - 1].y);
    }
  });

  test("branch length proportional — longer branch has greater X distance", () => {
    const ast = parsePhylo(`phylo\n  newick: "(A:0.1,B:0.3);"`);
    const layout = layoutPhylo(ast);
    const a = layout.nodes.find((n) => n.node.id === "A")!;
    const b = layout.nodes.find((n) => n.node.id === "B")!;
    const root = layout.nodes.find((n) => n.node === ast.root)!;
    const distA = a.x - root.x;
    const distB = b.x - root.x;
    expect(distB / distA).toBeCloseTo(3, 0);
  });

  test("branches are generated", () => {
    const ast = parsePhylo(`phylo\n  newick: "((A:0.1,B:0.2):0.3,C:0.5);"`);
    const layout = layoutPhylo(ast);
    expect(layout.branches.length).toBeGreaterThan(0);
    const horizontals = layout.branches.filter((b) => !b.isConnector);
    expect(horizontals.length).toBeGreaterThanOrEqual(3);
  });

  test("connector (vertical) branches exist", () => {
    const ast = parsePhylo(`phylo\n  newick: "((A:0.1,B:0.2):0.3,C:0.5);"`);
    const layout = layoutPhylo(ast);
    const connectors = layout.branches.filter((b) => b.isConnector);
    expect(connectors.length).toBeGreaterThan(0);
  });

  test("internal node Y is between children", () => {
    const ast = parsePhylo(`phylo\n  newick: "((A:0.1,B:0.2):0.3,C:0.5);"`);
    const layout = layoutPhylo(ast);
    const a = layout.nodes.find((n) => n.node.id === "A")!;
    const b = layout.nodes.find((n) => n.node.id === "B")!;
    const internal = layout.nodes.find(
      (n) => !n.node.isLeaf && n.node !== ast.root
    )!;
    expect(internal.y).toBeCloseTo((a.y + b.y) / 2);
  });

  test("polytomy layout — 4 children from one node", () => {
    const ast = parsePhylo(`phylo\n  newick: "(A:0.1,B:0.1,C:0.1,D:0.1);"`);
    const layout = layoutPhylo(ast);
    const leaves = layout.nodes.filter((n) => n.node.isLeaf);
    expect(leaves).toHaveLength(4);
  });

  test("width and height are positive", () => {
    const ast = parsePhylo(`phylo\n  newick: "(A:0.1,B:0.2);"`);
    const layout = layoutPhylo(ast);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });
});

describe("phylo layout — cladogram mode", () => {
  test("all leaves have same X in cladogram", () => {
    const ast = parsePhylo(
      `phylo [mode: cladogram]\n  newick: "((A:0.1,B:0.2):0.3,C:0.5);"`
    );
    const layout = layoutPhylo(ast);
    const leaves = layout.nodes.filter((n) => n.node.isLeaf);
    const xs = leaves.map((l) => l.x);
    expect(xs[0]).toBeCloseTo(xs[1], 0);
    expect(xs[1]).toBeCloseTo(xs[2], 0);
  });

  test("internal nodes are left of leaves in cladogram", () => {
    const ast = parsePhylo(
      `phylo [mode: cladogram]\n  newick: "((A,B),C);"`
    );
    const layout = layoutPhylo(ast);
    const leaves = layout.nodes.filter((n) => n.node.isLeaf);
    const internals = layout.nodes.filter(
      (n) => !n.node.isLeaf && n.node !== ast.root
    );
    const leafX = leaves[0].x;
    for (const internal of internals) {
      expect(internal.x).toBeLessThan(leafX);
    }
  });
});

describe("phylo layout — slanted", () => {
  test("slanted branches use L paths (diagonal lines)", () => {
    const ast = parsePhylo(
      `phylo [layout: slanted]\n  newick: "(A:0.1,B:0.2);"`
    );
    const layout = layoutPhylo(ast);
    const branchPaths = layout.branches.filter((b) => !b.isConnector);
    for (const b of branchPaths) {
      expect(b.path).toContain("L");
    }
  });

  test("slanted layout has no vertical connectors", () => {
    const ast = parsePhylo(
      `phylo [layout: slanted]\n  newick: "(A:0.1,B:0.2);"`
    );
    const layout = layoutPhylo(ast);
    const connectors = layout.branches.filter((b) => b.isConnector);
    expect(connectors).toHaveLength(0);
  });
});

describe("phylo layout — clade membership", () => {
  test("clade branches are tagged with cladeId", () => {
    const ast = parsePhylo(`phylo
  newick: "((A:0.1,B:0.2):0.3,(C:0.1,D:0.2):0.3);"
  clade G1 = (A, B) [color: "#1E88E5"]`);
    const layout = layoutPhylo(ast);
    const cladeBranches = layout.branches.filter(
      (b) => b.cladeId === "G1"
    );
    expect(cladeBranches.length).toBeGreaterThan(0);
  });
});
