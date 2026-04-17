import { describe, test, expect } from "vitest";
import { render, parse } from "../../src/index";

describe("ecomap e2e", () => {
  test("render() auto-detects ecomap and produces SVG", () => {
    const svg = render(`
ecomap "Test"
  center: maria [female, age: 34]
  work [label: "Tech Company", category: work]
  maria === work
`);
    expect(svg).toContain("<svg");
    expect(svg).toContain("lineage-ecomap");
    expect(svg).toContain("</svg>");
  });

  test("parse() returns ecomap AST", () => {
    const ast = parse(`
ecomap
  center: x [male]
  y [label: "Y"]
  x --- y
`);
    expect(ast.type).toBe("ecomap");
    expect(ast.individuals).toHaveLength(2);
    expect(ast.relationships).toHaveLength(1);
  });

  test("render() with config.type=ecomap", () => {
    const svg = render(
      `ecomap\n  center: x [female]\n  y [label: "Y"]\n  x --- y`,
      { type: "ecomap" }
    );
    expect(svg).toContain("lineage-ecomap");
  });

  test("Case 1: basic individual ecomap", () => {
    const svg = render(`
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
    expect(svg).toContain("Maria");
    expect(svg).toContain("Tech Company");
    expect(svg).toContain("Mom");
    expect(svg).toContain("Lisa");
    expect(svg).toContain("lineage-system-work");
    expect(svg).toContain("lineage-system-religion");
    expect(svg).toContain("lineage-system-family");
    expect(svg).toContain("lineage-system-friends");
  });

  test("Case 2: energy flow + stress", () => {
    const svg = render(`
ecomap "The Johnsons"
  center: family [label: "The Johnsons"]
  school [label: "Oak Elementary", category: education]
  therapist [label: "Dr. Smith", category: mental-health]
  ex [label: "Ex-spouse", category: family]
  church [label: "Community Church", category: religion]
  legal [label: "Family Court", category: legal]
  family === school
  therapist --> family
  family ~~~ ex
  family <-> church
  family ~~~ legal
`);
    expect(svg).toContain("The Johnsons");
    expect(svg).toContain("lineage-connection-strong");
    expect(svg).toContain("lineage-connection-stressful");
    // directional arrows
    expect(svg).toContain("marker-");
  });

  test("Case 4: complex clinical ecomap", () => {
    const svg = render(`
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
    expect(svg).toContain("James");
    expect(svg).toContain("AA Group");
    expect(svg).toContain("lineage-connection-strong");
    expect(svg).toContain("lineage-connection-weak");
    expect(svg).toContain("lineage-connection-broken");
    expect(svg).toContain("lineage-connection-stressful");
    expect(svg).toContain("custody conflict");
    expect(svg).toContain("supervised visits");
  });

  test("Case 5: large system count (15 systems)", () => {
    const svg = render(`
ecomap "Comprehensive Assessment"
  center: patient [female, age: 45]
  s1 [label: "Husband"]
  s2 [label: "Son (12)"]
  s3 [label: "Daughter (15)"]
  s4 [label: "Mother-in-law"]
  s5 [label: "Sister"]
  s6 [label: "Best Friend"]
  s7 [label: "Book Club"]
  s8 [label: "Employer"]
  s9 [label: "Coworkers"]
  s10 [label: "GP Doctor"]
  s11 [label: "Oncologist"]
  s12 [label: "Church"]
  s13 [label: "Yoga Class"]
  s14 [label: "School (PTA)"]
  s15 [label: "Neighbor"]
  patient === s1
  patient === s2
  patient === s3
  patient ~~~ s4
  patient == s5
  patient == s6
  patient --- s7
  patient --- s8
  patient - - s9
  patient == s10
  patient === s11
  patient --- s12
  patient --- s13
  patient - - s14
  patient - - s15
`);
    expect(svg).toContain("<svg");
    // Should have all 15 system groups
    const sysGroupMatches = svg.match(/data-system-id="/g);
    expect(sysGroupMatches).toHaveLength(15);
  });
});
