import { describe, test, expect } from "vitest";
import { parseGenogram, ParseError } from "../../src/diagrams/genogram/parser";
import { layoutGenogram } from "../../src/diagrams/genogram/layout";
import { render } from "../../src/index";
import type { LayoutConfig } from "../../src/core/types";

const DEFAULT_CONFIG: LayoutConfig = {
  nodeSpacingX: 60,
  nodeSpacingY: 120,
  nodeWidth: 40,
  nodeHeight: 40,
};

// ─── Gap 2: Same-id redeclaration must merge, not overwrite ───────

describe("same-id merge (gap 2)", () => {
  test("redeclaration preserves sex, birth year, label", () => {
    const ast = parseGenogram(`
genogram
  isaias [male, 2020, label: "Isaías"]
  pablo [male]
  priscila [female]
  pablo -- priscila
    isaias [foster]
`);
    const isaias = ast.individuals.find((i) => i.id === "isaias");
    expect(isaias?.sex).toBe("male");
    expect(isaias?.birthYear).toBe(2020);
    expect(isaias?.label).toBe("Isaías");
  });

  test("redeclaration preserves index marker", () => {
    const ast = parseGenogram(`
genogram
  child [male, 2018, index]
  fp1 [male]
  fp2 [female]
  fp1 -- fp2
    child [foster]
`);
    const child = ast.individuals.find((i) => i.id === "child");
    expect(child?.markers).toContain("index-person");
    expect(child?.sex).toBe("male");
  });

  test("conflicting non-default sex throws", () => {
    expect(() =>
      parseGenogram(`
genogram
  x [male, 2010]
  y [female]
  z [male]
  z -- y
    x [female]
`)
    ).toThrow(ParseError);
  });

  test("inline-on-couple-right merges with prior declaration", () => {
    const ast = parseGenogram(`
genogram
  mary [female, 1955]
  john [male, 1950]
  john -- mary [female, 1955]
`);
    expect(ast.individuals).toHaveLength(2);
    const mary = ast.individuals.find((i) => i.id === "mary");
    expect(mary?.sex).toBe("female");
    expect(mary?.birthYear).toBe(1955);
  });
});

// ─── Gap 4: cohabiting-ended + cohabiting/separated aliases ───────

describe("cohabiting-ended operator (gap 4)", () => {
  test("~/~ parses to cohabiting-ended", () => {
    const ast = parseGenogram(`
genogram
  v [male, 1985]
  m [female, 1987]
  v ~/~ m
`);
    const r = ast.relationships.find((r) => r.type === "cohabiting-ended");
    expect(r).toBeDefined();
    expect(r?.from).toBe("v");
    expect(r?.to).toBe("m");
  });

  test("-// is alias for separated", () => {
    const ast = parseGenogram(`
genogram
  a [male]
  b [female]
  a -// b
`);
    expect(ast.relationships.find((r) => r.type === "separated")).toBeDefined();
  });

  test("cohabiting-ended couple still produces children rels", () => {
    const ast = parseGenogram(`
genogram
  v [male, 1985]
  m [female, 1987]
  v ~/~ m
    kid [male, 2018]
`);
    const pc = ast.relationships.find(
      (r) => r.type === "parent-child" && r.to === "kid"
    );
    expect(pc).toBeDefined();
    expect(pc?.from).toContain("v");
  });
});

// ─── Gap 5: ? placeholder + [unknown-siblings] marker ─────────────

describe("unknown-siblings placeholder (gap 5)", () => {
  test("? as child id auto-generates synthetic placeholder", () => {
    const ast = parseGenogram(`
genogram
  dad [male]
  mom [female]
  dad -- mom
    ?
    real_kid [male, 2010]
`);
    const placeholder = ast.individuals.find((i) =>
      i.markers?.includes("unknown-siblings")
    );
    expect(placeholder).toBeDefined();
    expect(placeholder?.sex).toBe("unknown");
    // Should have a parent-child rel pointing to it
    const pc = ast.relationships.find(
      (r) => r.type === "parent-child" && r.to === placeholder?.id
    );
    expect(pc).toBeDefined();
  });

  test("multiple ? placeholders get unique ids", () => {
    const ast = parseGenogram(`
genogram
  dad [male]
  mom [female]
  dad -- mom
    ?
    ?
`);
    const placeholders = ast.individuals.filter((i) =>
      i.markers?.includes("unknown-siblings")
    );
    expect(placeholders).toHaveLength(2);
    expect(placeholders[0].id).not.toBe(placeholders[1].id);
  });

  test("explicit [unknown-siblings] marker on regular id works", () => {
    const ast = parseGenogram(`
genogram
  dad [male]
  mom [female]
  dad -- mom
    sibs [unknown-siblings]
`);
    const sibs = ast.individuals.find((i) => i.id === "sibs");
    expect(sibs?.markers).toContain("unknown-siblings");
  });

  test("renders ? glyph inside the placeholder shape", () => {
    const svg = render(`genogram
  dad [male]
  mom [female]
  dad -- mom
    ?`);
    expect(svg).toContain("schematex-genogram-unknown-siblings");
  });
});

// ─── Gap 3: sibling-of declaration ────────────────────────────────

describe("sibling-of declaration (gap 3)", () => {
  test("sibling-of populates Individual.siblingOf field", () => {
    const ast = parseGenogram(`
genogram
  monica [female, 1990]
  uncle [male, sibling-of: monica]
`);
    const uncle = ast.individuals.find((i) => i.id === "uncle");
    expect(uncle?.siblingOf).toBe("monica");
  });

  test("siblingOf shares generation with referenced sibling", () => {
    const ast = parseGenogram(`
genogram
  gp1 [male]
  gp2 [female]
  gp1 -- gp2
    monica [female, 1990]
  uncle [male, sibling-of: monica]
`);
    const layout = layoutGenogram(ast, DEFAULT_CONFIG);
    const monica = layout.nodes.find((n) => n.id === "monica");
    const uncle = layout.nodes.find((n) => n.id === "uncle");
    expect(monica?.generation).toBe(uncle?.generation);
  });

  test("renderer emits sibling-of dashed bracket", () => {
    const svg = render(`genogram
  monica [female, 1990]
  uncle [male, sibling-of: monica]`);
    expect(svg).toContain("schematex-genogram-sibling-of");
  });
});

// ─── Gap 1: dual-parent rendering ─────────────────────────────────

describe("dual-parent (foster + biological) (gap 1)", () => {
  test("redeclared child under second couple emits secondary rel", () => {
    const ast = parseGenogram(`
genogram
  bp1 [male]
  bp2 [female]
  bp1 -- bp2
    child [male, 2018]
  fp1 [male]
  fp2 [female]
  fp1 -- fp2
    child [foster]
`);
    const allChildRels = ast.relationships.filter(
      (r) =>
        (r.type === "parent-child" || r.type === "foster" || r.type === "adopted") &&
        r.to === "child"
    );
    expect(allChildRels).toHaveLength(2);
    const primary = allChildRels.filter((r) => !r.secondary);
    const secondary = allChildRels.filter((r) => r.secondary === true);
    expect(primary).toHaveLength(1);
    expect(secondary).toHaveLength(1);
    expect(primary[0].from).toBe("bp1+bp2");
    expect(secondary[0].from).toBe("fp1+fp2");
    expect(secondary[0].type).toBe("foster");
  });

  test("layout positions child under bio couple, not foster couple", () => {
    const ast = parseGenogram(`
genogram
  bp1 [male, 1985]
  bp2 [female, 1987]
  bp1 -- bp2
    child [male, 2018]
  fp1 [male, 1970]
  fp2 [female, 1972]
  fp1 -- fp2
    fk1 [male, 2005]
    child [foster]
`);
    const layout = layoutGenogram(ast, DEFAULT_CONFIG);
    const bp1 = layout.nodes.find((n) => n.id === "bp1")!;
    const bp2 = layout.nodes.find((n) => n.id === "bp2")!;
    const fp1 = layout.nodes.find((n) => n.id === "fp1")!;
    const fp2 = layout.nodes.find((n) => n.id === "fp2")!;
    const child = layout.nodes.find((n) => n.id === "child")!;
    const fk1 = layout.nodes.find((n) => n.id === "fk1")!;

    const bioMid = (bp1.x + bp2.x) / 2;
    const fosterMid = (fp1.x + fp2.x) / 2;

    expect(Math.abs(child.x + child.width / 2 - bioMid)).toBeLessThan(40);
    expect(Math.abs(child.x + child.width / 2 - fosterMid)).toBeGreaterThan(40);
    // foster couple's only structural child is fk1
    expect(Math.abs(fk1.x + fk1.width / 2 - fosterMid)).toBeLessThan(40);
  });

  test("declaration order is irrelevant — bio always wins as primary", () => {
    // Reversed: foster declared FIRST, bio declared SECOND. Engine must
    // still treat bio as primary and demote foster to secondary.
    const ast = parseGenogram(`
genogram
  fp1 [male]
  fp2 [female]
  fp1 -- fp2
    child [male, foster]
  bp1 [male]
  bp2 [female]
  bp1 -- bp2
    child
`);
    const allChildRels = ast.relationships.filter(
      (r) =>
        (r.type === "parent-child" || r.type === "foster") && r.to === "child"
    );
    expect(allChildRels).toHaveLength(2);
    const primary = allChildRels.find((r) => !r.secondary);
    const secondary = allChildRels.find((r) => r.secondary === true);
    expect(primary?.type).toBe("parent-child");
    expect(primary?.from).toBe("bp1+bp2");
    expect(secondary?.type).toBe("foster");
    expect(secondary?.from).toBe("fp1+fp2");
  });

  test("renderer emits secondary parent-child edge as dotted line", () => {
    const svg = render(`genogram
  bp1 [male]
  bp2 [female]
  bp1 -- bp2
    child [male, 2018]
  fp1 [male]
  fp2 [female]
  fp1 -- fp2
    child [foster]`);
    expect(svg).toContain("schematex-genogram-edge-secondary");
  });
});

// ─── Integration: full Isaías foster-care case ────────────────────

describe("Isaías full foster-care case (integration)", () => {
  const ISAIAS_DSL = `genogram "Familia Isaías"
  victor [male, label: "Víctor Seguel"]
  monica [female, label: "Mónica Barrientos"]
  victor ~/~ monica
    ?
    isaias [male, 2020, age: 6, label: "Isaías", index]
  pablo_sr [male, label: "Don Pablo"]
  priscila [female, label: "Doña Priscila"]
  pablo_sr -- priscila
    pablo_jr [male]
    alanis [female]
    isaias [foster]
  tio_materno [male, label: "Tío materno", sibling-of: monica]
  victor -physical-abuse-> isaias
  monica -physical-abuse-> isaias
  tio_materno -nevermet- isaias`;

  test("AST satisfies the 6 success criteria", () => {
    const ast = parseGenogram(ISAIAS_DSL);

    // 1. Isaías is bio son of Víctor + Mónica
    const bio = ast.relationships.find(
      (r) => r.to === "isaias" && r.from === "victor+monica" && !r.secondary
    );
    expect(bio).toBeDefined();
    expect(bio?.type).toBe("parent-child");

    // 2. Currently fostered with Don Pablo + Doña Priscila
    const foster = ast.relationships.find(
      (r) => r.to === "isaias" && r.from === "pablo_sr+priscila" && r.secondary
    );
    expect(foster).toBeDefined();
    expect(foster?.type).toBe("foster");

    // 3. Removed from bio parents due to physical abuse from both
    const abuses = ast.relationships.filter((r) => r.type === "physical-abuse" && r.to === "isaias");
    expect(abuses).toHaveLength(2);
    expect(abuses.map((a) => a.from).sort()).toEqual(["monica", "victor"]);

    // 4. Tío materno is Mónica's brother
    const tio = ast.individuals.find((i) => i.id === "tio_materno");
    expect(tio?.siblingOf).toBe("monica");
    const nevermet = ast.relationships.find((r) => r.type === "nevermet");
    expect(nevermet).toBeDefined();

    // 5. Unknown-count siblings still with bio parents
    const unknownSib = ast.individuals.find((i) =>
      i.markers?.includes("unknown-siblings")
    );
    expect(unknownSib).toBeDefined();
    const sibPC = ast.relationships.find(
      (r) => r.to === unknownSib?.id && r.from === "victor+monica"
    );
    expect(sibPC).toBeDefined();

    // 6. Isaías is the index person
    const isaias = ast.individuals.find((i) => i.id === "isaias");
    expect(isaias?.markers).toContain("index-person");
    expect(isaias?.sex).toBe("male");
    expect(isaias?.birthYear).toBe(2020);
    expect(isaias?.label).toBe("Isaías");

    // bio couple is cohabiting-ended (the LATAM "quiebre")
    const bioCouple = ast.relationships.find(
      (r) => r.from === "victor" && r.to === "monica"
    );
    expect(bioCouple?.type).toBe("cohabiting-ended");
  });

  test("renders without error and produces an SVG with expected markers", () => {
    const svg = render(ISAIAS_DSL);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain("Familia Isaías");
    expect(svg).toContain("schematex-genogram-edge-secondary");
    expect(svg).toContain("schematex-genogram-sibling-of");
    expect(svg).toContain("schematex-genogram-unknown-siblings");
    expect(svg).toContain("schematex-genogram-index-person");
  });
});
