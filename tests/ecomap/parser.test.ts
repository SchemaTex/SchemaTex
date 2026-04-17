import { describe, test, expect } from "vitest";
import {
  parseEcomap,
  EcomapParseError,
} from "../../src/diagrams/ecomap/parser";

describe("ecomap parser", () => {
  test("parses minimal ecomap", () => {
    const ast = parseEcomap(`ecomap\n  center: maria [female]`);
    expect(ast.type).toBe("ecomap");
    expect(ast.individuals).toHaveLength(1);
    expect(ast.individuals[0]).toMatchObject({
      id: "maria",
      sex: "female",
      properties: { center: "true" },
    });
  });

  test("parses header with title", () => {
    const ast = parseEcomap(`ecomap "Support Network"\n  center: x [male]`);
    expect(ast.metadata?.title).toBe("Support Network");
  });

  test("parses center with label and age", () => {
    const ast = parseEcomap(
      `ecomap\n  center: client [male, age: 28, label: "James"]`
    );
    const c = ast.individuals[0];
    expect(c).toMatchObject({
      id: "client",
      label: "James",
      sex: "male",
      age: 28,
      properties: { center: "true" },
    });
  });

  test("parses external systems with properties", () => {
    const ast = parseEcomap(`
ecomap
  center: maria [female]
  work [label: "Tech Corp", category: work]
  church [label: "St. Mary's", category: religion]
`);
    expect(ast.individuals).toHaveLength(3);
    const work = ast.individuals.find((i) => i.id === "work");
    expect(work).toMatchObject({
      label: "Tech Corp",
      properties: { category: "work" },
    });
    const church = ast.individuals.find((i) => i.id === "church");
    expect(church).toMatchObject({
      label: "St. Mary's",
      properties: { category: "religion" },
    });
  });

  test("parses system with importance", () => {
    const ast = parseEcomap(`
ecomap
  center: x [female]
  grandma [label: "Abuela", category: family, importance: major]
`);
    const g = ast.individuals.find((i) => i.id === "grandma");
    expect(g?.properties?.importance).toBe("major");
  });

  // ─── Connection operators ──────────────────────────────────

  test("parses strong connection (===)", () => {
    const ast = parseEcomap(`
ecomap
  center: maria [female]
  mother [label: "Mom"]
  maria === mother
`);
    expect(ast.relationships).toHaveLength(1);
    expect(ast.relationships[0]).toMatchObject({
      type: "strong",
      from: "maria",
      to: "mother",
    });
    expect(ast.relationships[0].energyFlow).toBeUndefined();
  });

  test("parses moderate connection (==)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  f [label: "Friend"]
  m == f
`);
    expect(ast.relationships[0].type).toBe("moderate");
  });

  test("parses normal connection (---)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  work [label: "Job"]
  m --- work
`);
    expect(ast.relationships[0].type).toBe("normal");
  });

  test("parses weak connection (- -)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  doc [label: "Doctor"]
  m - - doc
`);
    expect(ast.relationships[0].type).toBe("weak");
  });

  test("parses stressful connection (~~~)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  ex [label: "Ex"]
  m ~~~ ex
`);
    expect(ast.relationships[0].type).toBe("stressful");
  });

  test("parses conflictual connection (~x~)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  ex [label: "Ex"]
  m ~x~ ex
`);
    expect(ast.relationships[0].type).toBe("conflictual");
  });

  test("parses broken connection (-/-)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  old [label: "Old Friend"]
  m -/- old
`);
    expect(ast.relationships[0].type).toBe("broken");
  });

  test("parses stressful-strong connection (~=~)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  boss [label: "Boss"]
  m ~=~ boss
`);
    expect(ast.relationships[0].type).toBe("stressful-strong");
  });

  // ─── Energy flow arrows ────────────────────────────────────

  test("parses energy flow from center (-->)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  work [label: "Job"]
  m --> work
`);
    expect(ast.relationships[0]).toMatchObject({
      type: "normal",
      from: "m",
      to: "work",
      energyFlow: "from",
    });
  });

  test("parses energy flow to center (<--)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  therapist [label: "Dr. S"]
  m <-- therapist
`);
    expect(ast.relationships[0]).toMatchObject({
      type: "normal",
      from: "m",
      to: "therapist",
      energyFlow: "to",
    });
  });

  test("parses mutual flow (<->)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  church [label: "Church"]
  m <-> church
`);
    expect(ast.relationships[0]).toMatchObject({
      type: "normal",
      energyFlow: "mutual",
    });
  });

  test("parses strong directional (===>)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  work [label: "Job"]
  m ===> work
`);
    expect(ast.relationships[0]).toMatchObject({
      type: "strong",
      energyFlow: "from",
    });
  });

  test("parses nourishing flow (<==)", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  mentor [label: "Mentor"]
  m <== mentor
`);
    expect(ast.relationships[0]).toMatchObject({
      type: "moderate",
      energyFlow: "to",
    });
  });

  // ─── Normalization ─────────────────────────────────────────

  test("normalizes connection so center is always 'from'", () => {
    const ast = parseEcomap(`
ecomap
  center: family [label: "Fam"]
  therapist [label: "Dr. S"]
  therapist --> family
`);
    expect(ast.relationships[0]).toMatchObject({
      from: "family",
      to: "therapist",
      energyFlow: "to",
    });
  });

  // ─── Connection labels ─────────────────────────────────────

  test("parses connection label", () => {
    const ast = parseEcomap(`
ecomap
  center: m [female]
  work [label: "Job"]
  m --- work [label: "part-time"]
`);
    expect(ast.relationships[0].label).toBe("part-time");
  });

  // ─── Full test cases from standard ─────────────────────────

  test("parses Case 1: basic individual ecomap", () => {
    const ast = parseEcomap(`
ecomap "Maria's Support Network"
  center: maria [female, age: 34]
  work [label: "Tech Company", category: work]
  church [label: "St. Mary's", category: religion]
  mother [label: "Mom", category: family]
  bestfriend [label: "Lisa", category: friends]
  maria === mother
  maria --- church
  maria === work
  maria == bestfriend
`);
    expect(ast.individuals).toHaveLength(5);
    expect(ast.relationships).toHaveLength(4);
    expect(ast.metadata?.title).toBe("Maria's Support Network");
  });

  test("parses Case 4: complex clinical ecomap", () => {
    const ast = parseEcomap(`
ecomap "Substance Abuse Recovery"
  center: client [male, age: 28, label: "James"]
  aa [label: "AA Group", category: substance, importance: major]
  sponsor [label: "Bill (Sponsor)", category: substance]
  employer [label: "Warehouse Job", category: work]
  mother [label: "Mom", category: family]
  exwife [label: "Ex-wife", category: family]
  kids [label: "Children (2)", category: family]
  dealer [label: "Old Friends", category: substance]
  probation [label: "P.O. Johnson", category: legal]
  therapist [label: "CBT Therapist", category: mental-health]
  client === aa
  sponsor --> client
  client --- employer [label: "new, probationary"]
  client == mother [label: "supportive"]
  client ~~~ exwife [label: "custody conflict"]
  client - - kids [label: "supervised visits"]
  client -/- dealer [label: "trying to cut off"]
  probation --> client
  therapist <-> client [label: "weekly"]
`);
    expect(ast.individuals).toHaveLength(10);
    expect(ast.relationships).toHaveLength(9);

    const aaRel = ast.relationships.find((r) => r.to === "aa");
    expect(aaRel?.type).toBe("strong");

    const dealerRel = ast.relationships.find((r) => r.to === "dealer");
    expect(dealerRel?.type).toBe("broken");
    expect(dealerRel?.label).toBe("trying to cut off");

    const kidsRel = ast.relationships.find((r) => r.to === "kids");
    expect(kidsRel?.type).toBe("weak");

    const exRel = ast.relationships.find((r) => r.to === "exwife");
    expect(exRel?.type).toBe("stressful");
  });

  // ─── Errors ────────────────────────────────────────────────

  test("throws on missing header", () => {
    expect(() => parseEcomap("center: x [male]")).toThrow(EcomapParseError);
  });

  test("throws on empty input", () => {
    expect(() => parseEcomap("")).toThrow(EcomapParseError);
  });
});
