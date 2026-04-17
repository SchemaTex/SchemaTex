import { describe, test, expect } from "vitest";
import { parseNewick, parsePhylo, PhyloParseError } from "../../src/diagrams/phylo/parser";

// ─── Newick Parser ──────────────────────────────────────────

describe("Newick parser", () => {
  test("minimal topology — no names, no lengths", () => {
    const root = parseNewick("(,,(,));");
    expect(root.children).toHaveLength(3);
    expect(root.children[2].children).toHaveLength(2);
  });

  test("leaf names only", () => {
    const root = parseNewick("(A,B,(C,D));");
    expect(root.children).toHaveLength(3);
    expect(root.children[0].id).toBe("A");
    expect(root.children[0].isLeaf).toBe(true);
    expect(root.children[2].children[0].id).toBe("C");
  });

  test("all nodes named", () => {
    const root = parseNewick("(A,B,(C,D)E)F;");
    expect(root.id).toBe("F");
    expect(root.children[2].id).toBe("E");
  });

  test("branch lengths", () => {
    const root = parseNewick("(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);");
    expect(root.children[0].branchLength).toBeCloseTo(0.1);
    expect(root.children[1].branchLength).toBeCloseTo(0.2);
    expect(root.children[2].branchLength).toBeCloseTo(0.5);
    expect(root.children[2].children[0].branchLength).toBeCloseTo(0.3);
  });

  test("internal node name + length", () => {
    const root = parseNewick("(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;");
    expect(root.id).toBe("F");
    expect(root.children[2].id).toBe("E");
    expect(root.children[2].branchLength).toBeCloseTo(0.5);
  });

  test("only lengths, no names", () => {
    const root = parseNewick("(:0.1,:0.2,(:0.3,:0.4):0.5);");
    expect(root.children[0].branchLength).toBeCloseTo(0.1);
    expect(root.children[2].children[1].branchLength).toBeCloseTo(0.4);
  });

  test("polytomy — 4 children", () => {
    const root = parseNewick("(A,B,C,D);");
    expect(root.children).toHaveLength(4);
  });

  test("single leaf (degenerate)", () => {
    const root = parseNewick("(A);");
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe("A");
  });

  test("quoted labels with special characters", () => {
    const root = parseNewick("('Homo sapiens':0.1,'Mus musculus':0.2);");
    expect(root.children[0].id).toBe("Homo sapiens");
    expect(root.children[0].label).toBe("Homo sapiens");
    expect(root.children[0].branchLength).toBeCloseTo(0.1);
  });

  test("NHX bootstrap support", () => {
    const root = parseNewick(
      "((A:0.02,B:0.03):0.01[&&NHX:B=100],(C:0.05,D:0.08):0.04[&&NHX:B=72]);",
    );
    expect(root.children[0].support).toBe(100);
    expect(root.children[1].support).toBe(72);
  });

  test("plain bracket bootstrap [95]", () => {
    const root = parseNewick("((A:0.1,B:0.2)[95]:0.3,C:0.4);");
    expect(root.children[0].support).toBe(95);
  });
});

// ─── Full Document Parser ───────────────────────────────────

describe("parsePhylo", () => {
  test("minimal phylo with newick", () => {
    const ast = parsePhylo(`phylo\n  newick: "(A:0.1,B:0.2);"`);
    expect(ast.type).toBe("phylo");
    expect(ast.root.children).toHaveLength(2);
    expect(ast.mode).toBe("phylogram");
    expect(ast.layout).toBe("rectangular");
  });

  test("title extraction", () => {
    const ast = parsePhylo(`phylo "Tree of Life"\n  newick: "(A,B);"`);
    expect(ast.title).toBe("Tree of Life");
  });

  test("header props — mode + layout", () => {
    const ast = parsePhylo(
      `phylo "Test" [mode: cladogram, layout: slanted]\n  newick: "(A,B);"`
    );
    expect(ast.mode).toBe("cladogram");
    expect(ast.layout).toBe("slanted");
  });

  test("unrooted flag", () => {
    const ast = parsePhylo(`phylo [layout: unrooted]\n  newick: "(A,B,C);"`);
    expect(ast.unrooted).toBe(true);
  });

  test("scale line", () => {
    const ast = parsePhylo(
      `phylo\n  newick: "(A:0.1,B:0.2);"\n  scale "substitutions/site"`
    );
    expect(ast.scaleLabel).toBe("substitutions/site");
  });

  test("outgroup", () => {
    const ast = parsePhylo(`phylo\n  newick: "(A,B,C);"\n  outgroup: C`);
    expect(ast.outgroup).toBe("C");
  });

  test("clade definitions", () => {
    const ast = parsePhylo(`phylo
  newick: "((A,B),(C,D));"
  clade Primates = (A, B) [color: "#1E88E5", label: "Primates"]
  clade Rodents = (C, D) [color: "#E53935"]`);
    expect(ast.clades).toHaveLength(2);
    expect(ast.clades[0].id).toBe("Primates");
    expect(ast.clades[0].members).toEqual(["A", "B"]);
    expect(ast.clades[0].color).toBe("#1E88E5");
    expect(ast.clades[0].label).toBe("Primates");
    expect(ast.clades[1].id).toBe("Rodents");
  });

  test("clade with highlight mode", () => {
    const ast = parsePhylo(`phylo
  newick: "((A,B),(C,D));"
  clade X = (A, B) [color: "#1E88E5", highlight: background]`);
    expect(ast.clades[0].highlight).toBe("background");
  });

  test("style line overrides header", () => {
    const ast = parsePhylo(`phylo
  newick: "(A,B);"
  style [layout: slanted, mode: cladogram]`);
    expect(ast.layout).toBe("slanted");
    expect(ast.mode).toBe("cladogram");
  });

  test("throws on missing tree definition", () => {
    expect(() => parsePhylo(`phylo "Empty"`)).toThrow(PhyloParseError);
  });

  test("chronogram with mrsd", () => {
    const ast = parsePhylo(
      `phylo [mode: chronogram, mrsd: "0"]\n  newick: "((A:6.4,B:6.4):1.1,C:7.5);"`
    );
    expect(ast.mode).toBe("chronogram");
    expect(ast.mrsd).toBe("0");
  });

  test("comments are ignored", () => {
    const ast = parsePhylo(`phylo
  # This is a comment
  newick: "(A,B);"
  # Another comment`);
    expect(ast.root.children).toHaveLength(2);
  });
});

// ─── Indent DSL Parser ──────────────────────────────────────

describe("indent tree DSL", () => {
  test("simple indent tree", () => {
    const ast = parsePhylo(`phylo "Simple"

root:
  :0.15
    Human: 0.1
    Chimp: 0.08
  Dog: 0.35`);
    expect(ast.root.children).toHaveLength(2);
    const internal = ast.root.children[0];
    expect(internal.branchLength).toBeCloseTo(0.15);
    expect(internal.children).toHaveLength(2);
    expect(internal.children[0].id).toBe("Human");
    expect(internal.children[0].branchLength).toBeCloseTo(0.1);
    expect(ast.root.children[1].id).toBe("Dog");
  });

  test("indent tree with clade annotations", () => {
    const ast = parsePhylo(`phylo "Test"

root:
  :0.15
    :0.03
      Human: 0.1
      Chimp: 0.08
    Gorilla: 0.12
  Dog: 0.35

clade Apes = (Human, Chimp, Gorilla) [color: "#1E88E5"]
scale "substitutions/site"`);
    expect(ast.clades).toHaveLength(1);
    expect(ast.clades[0].members).toEqual(["Human", "Chimp", "Gorilla"]);
    expect(ast.scaleLabel).toBe("substitutions/site");
  });
});
