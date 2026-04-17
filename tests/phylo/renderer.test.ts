import { describe, test, expect } from "vitest";
import { render } from "../../src/index";

describe("phylo renderer — SVG output", () => {
  test("renders basic phylogram SVG", () => {
    const svg = render(`phylo\n  newick: "(A:0.1,B:0.2);"`);
    expect(svg).toContain("<svg");
    expect(svg).toContain("lineage-phylo");
    expect(svg).toContain("lineage-branch");
    expect(svg).toContain("A");
    expect(svg).toContain("B");
  });

  test("renders title when provided", () => {
    const svg = render(`phylo "Vertebrates"\n  newick: "(A:0.1,B:0.2);"`);
    expect(svg).toContain("Vertebrates");
    expect(svg).toContain("lineage-title");
  });

  test("no title element when not provided", () => {
    const svg = render(`phylo\n  newick: "(A:0.1,B:0.2);"`);
    expect(svg).not.toMatch(/<text[^>]*class="lineage-title"[^>]*>/);
  });

  test("renders tip labels", () => {
    const svg = render(`phylo\n  newick: "(Human:0.1,Mouse:0.3);"`);
    expect(svg).toContain("lineage-tip-label");
    expect(svg).toContain("Human");
    expect(svg).toContain("Mouse");
  });

  test("italicizes species binomials", () => {
    const svg = render(
      `phylo\n  newick: "('Homo sapiens':0.1,'Mus musculus':0.2);"`
    );
    expect(svg).toContain("italic");
    expect(svg).toContain("Homo sapiens");
  });

  test("renders scale bar for phylogram", () => {
    const svg = render(
      `phylo\n  newick: "(A:0.1,B:0.2);"\n  scale "substitutions/site"`
    );
    expect(svg).toContain("lineage-scale-bar");
    expect(svg).toContain("substitutions/site");
  });

  test("no scale bar for cladogram", () => {
    const svg = render(
      `phylo [mode: cladogram]\n  newick: "(A:0.1,B:0.2);"`
    );
    // CSS rule exists but no actual scale bar group element
    expect(svg).not.toMatch(/<g class="lineage-scale-bar">/);
  });

  test("renders root marker for rooted tree", () => {
    const svg = render(`phylo\n  newick: "(A:0.1,B:0.2);"`);
    expect(svg).toContain("lineage-root-marker");
  });

  test("no root marker for unrooted tree", () => {
    const svg = render(
      `phylo [layout: unrooted]\n  newick: "(A:0.1,B:0.2,C:0.3);"`
    );
    // CSS rule exists but no actual circle element with that class
    expect(svg).not.toMatch(/<circle[^>]*class="lineage-root-marker"/);
  });

  test("renders support values above threshold", () => {
    const svg = render(
      `phylo\n  newick: "((A:0.02,B:0.03):0.01[&&NHX:B=98],C:0.05);"`
    );
    expect(svg).toContain("lineage-support-dot");
    expect(svg).toContain("lineage-support-label");
    expect(svg).toContain(">98<");
  });

  test("hides support values below threshold", () => {
    const svg = render(
      `phylo\n  newick: "((A:0.02,B:0.03):0.01[&&NHX:B=30],C:0.05);"`
    );
    expect(svg).not.toContain(">30<");
  });

  test("renders clade-colored branches", () => {
    const svg = render(`phylo
  newick: "((A:0.1,B:0.2):0.3,(C:0.1,D:0.2):0.3);"
  clade G1 = (A, B) [color: "#1E88E5"]`);
    expect(svg).toContain("#1E88E5");
    expect(svg).toContain("lineage-clade-G1");
  });

  test("renders clade background when highlight: background", () => {
    const svg = render(`phylo
  newick: "((A:0.1,B:0.2):0.3,(C:0.1,D:0.2):0.3);"
  clade G1 = (A, B) [color: "#1E88E5", highlight: background, label: "Group 1"]`);
    expect(svg).toContain("lineage-clade-bg");
    expect(svg).toContain("Group 1");
  });

  test("renders accessible title + desc", () => {
    const svg = render(`phylo "My Tree"\n  newick: "(A:0.1,B:0.2);"`);
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain("Phylogenetic Tree: My Tree");
    expect(svg).toContain("2 taxa");
  });

  test("renders branch paths with M and H for rectangular", () => {
    const svg = render(`phylo\n  newick: "(A:0.1,B:0.2);"`);
    expect(svg).toMatch(/d="M\s/);
    expect(svg).toContain("H ");
  });

  test("renders slanted layout with L paths", () => {
    const svg = render(
      `phylo [layout: slanted]\n  newick: "(A:0.1,B:0.2);"`
    );
    expect(svg).toContain(" L ");
  });

  test("data-taxon-id on tip labels", () => {
    const svg = render(`phylo\n  newick: "(Human:0.1,Mouse:0.2);"`);
    expect(svg).toContain('data-taxon-id="Human"');
    expect(svg).toContain('data-taxon-id="Mouse"');
  });
});

describe("phylo renderer — test cases from standard doc", () => {
  test("Case 1: Simple Vertebrates phylogram", () => {
    const svg = render(`phylo "Simple Vertebrates"
  newick: "((Human:0.1,Mouse:0.3):0.05,(Chicken:0.4,(Zebrafish:0.6,Frog:0.5):0.15):0.1);"
  scale "substitutions/site"`);
    expect(svg).toContain("Simple Vertebrates");
    expect(svg).toContain("Human");
    expect(svg).toContain("Mouse");
    expect(svg).toContain("Chicken");
    expect(svg).toContain("Zebrafish");
    expect(svg).toContain("Frog");
    expect(svg).toContain("lineage-scale-bar");
  });

  test("Case 2: Cladogram with clades", () => {
    const svg = render(`phylo "Animal Kingdom" [mode: cladogram]
  newick: "(((Cat,Dog)Carnivora,(Human,Chimp)Primates)Mammalia,(Chicken,Eagle)Aves);"
  clade Mammals = (Cat, Dog, Human, Chimp) [color: "#1E88E5", label: "Mammalia"]
  clade Birds = (Chicken, Eagle) [color: "#43A047", label: "Aves"]`);
    expect(svg).toContain("Animal Kingdom");
    expect(svg).toContain("Cat");
    expect(svg).toContain("Eagle");
    expect(svg).toContain("#1E88E5");
    expect(svg).toContain("#43A047");
  });

  test("Case 3: Bootstrap support values", () => {
    const svg = render(`phylo "Primate Phylogeny"
  newick: "((Human:0.02,Chimp:0.03):0.01[&&NHX:B=100],(Gorilla:0.05,(Orangutan:0.08,Gibbon:0.10):0.04[&&NHX:B=72]):0.03[&&NHX:B=95]);"
  scale "substitutions/site"`);
    expect(svg).toContain(">100<");
    expect(svg).toContain(">95<");
    expect(svg).toContain(">72<");
  });

  test("Case 7: Indent DSL tree", () => {
    const svg = render(`phylo "Simple Tree"

root:
  :0.15
    :0.03
      Human: 0.1
      Chimp: 0.08
    Gorilla: 0.12
  Dog: 0.35

clade Apes = (Human, Chimp, Gorilla) [color: "#1E88E5"]
scale "substitutions/site"`);
    expect(svg).toContain("Human");
    expect(svg).toContain("Dog");
    expect(svg).toContain("#1E88E5");
    expect(svg).toContain("lineage-scale-bar");
  });

  test("Case 8: Polytomy", () => {
    const svg = render(`phylo "Rapid Radiation"
  newick: "((A:0.1,B:0.1,C:0.1,D:0.1):0.5,E:0.6);"`);
    expect(svg).toContain("A");
    expect(svg).toContain("D");
    expect(svg).toContain("E");
  });

  test("Case 9: Quoted species names", () => {
    const svg = render(`phylo "Hominids"
  newick: "('Homo sapiens':0.02,'Pan troglodytes':0.03,'Gorilla gorilla':0.05,'Pongo pygmaeus':0.08);"`);
    expect(svg).toContain("Homo sapiens");
    expect(svg).toContain("Pan troglodytes");
    expect(svg).toContain("italic");
  });
});
