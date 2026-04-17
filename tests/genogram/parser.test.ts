import { describe, test, expect } from "vitest";
import { parseGenogram, ParseError } from "../../src/diagrams/genogram/parser";

describe("genogram parser", () => {
  // ─── Case 1: Nuclear Family ──────────────────────────────────
  test("parses nuclear family", () => {
    const ast = parseGenogram(`
genogram
  john [male, 1950]
  mary [female, 1955]
  john -- mary
    alice [female, 1980]
    bob [male, 1983]
`);
    expect(ast.type).toBe("genogram");
    expect(ast.individuals).toHaveLength(4);

    const john = ast.individuals.find((i) => i.id === "john");
    expect(john).toMatchObject({ sex: "male", birthYear: 1950 });

    const mary = ast.individuals.find((i) => i.id === "mary");
    expect(mary).toMatchObject({ sex: "female", birthYear: 1955 });

    const alice = ast.individuals.find((i) => i.id === "alice");
    expect(alice).toMatchObject({ sex: "female", birthYear: 1980 });

    const bob = ast.individuals.find((i) => i.id === "bob");
    expect(bob).toMatchObject({ sex: "male", birthYear: 1983 });

    // married relationship
    const married = ast.relationships.find((r) => r.type === "married");
    expect(married).toMatchObject({ from: "john", to: "mary" });

    // parent-child relationships
    const parentChild = ast.relationships.filter(
      (r) => r.type === "parent-child"
    );
    expect(parentChild).toHaveLength(2);
    expect(parentChild.map((r) => r.to).sort()).toEqual(["alice", "bob"]);
  });

  // ─── Case 2: Three Generations ───────────────────────────────
  test("parses three generations", () => {
    const ast = parseGenogram(`
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
    expect(ast.metadata?.title).toBe("Smith Family");
    expect(ast.individuals).toHaveLength(7);

    const grandpa = ast.individuals.find((i) => i.id === "grandpa");
    expect(grandpa).toMatchObject({ status: "deceased", birthYear: 1930 });

    // mom defined inline
    const mom = ast.individuals.find((i) => i.id === "mom");
    expect(mom).toMatchObject({ sex: "female", birthYear: 1957 });

    // two marriages
    const marriages = ast.relationships.filter((r) => r.type === "married");
    expect(marriages).toHaveLength(2);

    // four parent-child (dad, aunt from gen0; me, sister from gen1)
    const pc = ast.relationships.filter((r) => r.type === "parent-child");
    expect(pc).toHaveLength(4);
  });

  // ─── Case 3: Divorce + Remarriage ────────────────────────────
  test("parses divorce and remarriage", () => {
    const ast = parseGenogram(`
genogram
  tom [male, 1950]
  jane [female, 1952]
  tom -x- jane
    child1 [male, 1975]
  tom -- susan [female, 1960]
    child2 [female, 1985]
`);
    expect(ast.individuals).toHaveLength(5);

    const divorced = ast.relationships.find((r) => r.type === "divorced");
    expect(divorced).toMatchObject({ from: "tom", to: "jane" });

    const married = ast.relationships.find((r) => r.type === "married");
    expect(married).toMatchObject({ from: "tom", to: "susan" });

    const pc = ast.relationships.filter((r) => r.type === "parent-child");
    expect(pc).toHaveLength(2);
  });

  // ─── Case 4: Medical Conditions ──────────────────────────────
  test("parses medical conditions", () => {
    const ast = parseGenogram(`
genogram
  father [male, 1945, conditions: heart-disease(full) + diabetes(half-left)]
  mother [female, 1948]
  father -- mother
    son [male, 1970, conditions: diabetes(striped)]
`);
    const father = ast.individuals.find((i) => i.id === "father");
    expect(father?.conditions).toHaveLength(2);
    expect(father?.conditions?.[0]).toMatchObject({
      label: "heart-disease",
      fill: "full",
    });
    expect(father?.conditions?.[1]).toMatchObject({
      label: "diabetes",
      fill: "half-left",
    });

    const son = ast.individuals.find((i) => i.id === "son");
    expect(son?.conditions).toHaveLength(1);
    expect(son?.conditions?.[0]).toMatchObject({
      label: "diabetes",
      fill: "striped",
    });
  });

  // ─── Case 5: Single Individual (Edge Case) ──────────────────
  test("parses single individual", () => {
    const ast = parseGenogram(`
genogram
  solo [female, 1990]
`);
    expect(ast.individuals).toHaveLength(1);
    expect(ast.individuals[0]).toMatchObject({
      id: "solo",
      sex: "female",
      birthYear: 1990,
    });
    expect(ast.relationships).toHaveLength(0);
  });

  // ─── Case 6: Childless Couple ────────────────────────────────
  test("parses childless couple", () => {
    const ast = parseGenogram(`
genogram
  husband [male, 1960]
  wife [female, 1962]
  husband -- wife
`);
    expect(ast.individuals).toHaveLength(2);
    const married = ast.relationships.filter((r) => r.type === "married");
    expect(married).toHaveLength(1);
    const pc = ast.relationships.filter((r) => r.type === "parent-child");
    expect(pc).toHaveLength(0);
  });

  // ─── Inline partner definition ───────────────────────────────
  test("handles inline partner definition", () => {
    const ast = parseGenogram(`
genogram
  john [male, 1950]
  john -- mary [female, 1955]
`);
    expect(ast.individuals).toHaveLength(2);
    const mary = ast.individuals.find((i) => i.id === "mary");
    expect(mary).toMatchObject({ sex: "female", birthYear: 1955 });
  });

  // ─── Comments and blank lines ────────────────────────────────
  test("ignores comments and blank lines", () => {
    const ast = parseGenogram(`
genogram
  # this is a comment
  john [male, 1950]

  # another comment
  mary [female, 1955]
  john -- mary
`);
    expect(ast.individuals).toHaveLength(2);
    expect(ast.relationships).toHaveLength(1);
  });

  // ─── Whitespace tolerance ────────────────────────────────────
  test("is whitespace-tolerant", () => {
    const ast = parseGenogram(`
genogram
  john[male,1950]
  mary [female , 1955]
  john -- mary
`);
    expect(ast.individuals).toHaveLength(2);
    const john = ast.individuals.find((i) => i.id === "john");
    expect(john).toMatchObject({ sex: "male", birthYear: 1950 });
  });

  // ─── All couple operators ────────────────────────────────────
  test("parses all couple operators", () => {
    const ast = parseGenogram(`
genogram
  a [male]
  b [female]
  c [male]
  d [female]
  e [male]
  f [female]
  g [male]
  h [female]
  i [male]
  j [female]
  a -- b
  c -x- d
  e -/- f
  g ~ h
  i == j
`);
    const types = ast.relationships.map((r) => r.type);
    expect(types).toContain("married");
    expect(types).toContain("divorced");
    expect(types).toContain("separated");
    expect(types).toContain("cohabiting");
    expect(types).toContain("consanguineous");
  });

  // ─── Error handling ──────────────────────────────────────────
  test("throws on undefined ID reference", () => {
    expect(() =>
      parseGenogram(`
genogram
  john [male, 1950]
  john -- unknown_person
`)
    ).toThrow(ParseError);
  });

  test("throws with line number on syntax error", () => {
    try {
      parseGenogram(`
genogram
  john [male, 1950, badprop]
`);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).line).toBeGreaterThan(0);
    }
  });

  // ─── Parent-child from/to uses couple key ────────────────────
  test("parent-child from field references couple", () => {
    const ast = parseGenogram(`
genogram
  a [male, 1950]
  b [female, 1952]
  a -- b
    c [male, 1975]
`);
    const pc = ast.relationships.find((r) => r.type === "parent-child");
    expect(pc).toBeDefined();
    // from should encode both parents
    expect(pc!.from).toContain("a");
    expect(pc!.to).toBe("c");
  });

  // ─── Adopted / foster children ───────────────────────────────
  test("parses adopted and foster children", () => {
    const ast = parseGenogram(`
genogram
  a [male]
  b [female]
  a -- b
    c [male, adopted]
    d [female, foster]
`);
    const adopted = ast.relationships.find(
      (r) => r.type === "adopted" && r.to === "c"
    );
    expect(adopted).toBeDefined();

    const foster = ast.relationships.find(
      (r) => r.type === "foster" && r.to === "d"
    );
    expect(foster).toBeDefined();
  });

  // ─── Twin relationships ──────────────────────────────────────
  test("parses twin markers", () => {
    const ast = parseGenogram(`
genogram
  a [male]
  b [female]
  a -- b
    c [male, twin-identical]
    d [male, twin-identical]
`);
    const twins = ast.relationships.filter(
      (r) => r.type === "twin-identical"
    );
    expect(twins.length).toBeGreaterThanOrEqual(1);
  });

  // ─── ID case insensitivity ───────────────────────────────────
  test("matches IDs case-insensitively", () => {
    const ast = parseGenogram(`
genogram
  John [male, 1950]
  Mary [female, 1955]
  john -- mary
`);
    expect(ast.individuals).toHaveLength(2);
    expect(ast.relationships).toHaveLength(1);
  });
});
