import { describe, test, expect } from "vitest";
import { parseGenogram } from "../../src/diagrams/genogram/parser";
import { render } from "../../src/index";

// ─── Feature 1: Chart Title ────────────────────────────────

describe("chart title", () => {
  test("parser extracts title from header", () => {
    const ast = parseGenogram(`genogram "Smith Family"\n  john [male, 1950]`);
    expect(ast.metadata?.title).toBe("Smith Family");
  });

  test("renderer displays title text in SVG", () => {
    const svg = render(`genogram "The Smiths"\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary`);
    expect(svg).toContain("The Smiths");
    expect(svg).toContain("lineage-title");
  });

  test("no title text element when header has no quoted string", () => {
    const svg = render(`genogram\n  john [male, 1950]`);
    // No <text> element with lineage-title class wrapping content
    expect(svg).not.toMatch(/<text[^>]*class="lineage-title"[^>]*>/);
  });
});

// ─── Feature 2: Index Person (gold border) ─────────────────

describe("index person", () => {
  test("parser recognizes index property", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950, index]`);
    const john = ast.individuals.find(i => i.id === "john");
    expect(john?.markers).toContain("index-person");
  });

  test("renderer adds gold border for index person", () => {
    const svg = render(`genogram\n  john [male, 1950, index]\n  mary [female, 1952]\n  john -- mary`);
    expect(svg).toContain("lineage-index-border");
    expect(svg).toContain("#d4a017");
    expect(svg).toContain("lineage-index-person");
  });

  test("non-index persons do not have gold border element", () => {
    const svg = render(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary`);
    // No actual gold border shapes rendered (CSS rule exists but no element uses it)
    expect(svg).not.toContain("lineage-index-person");
  });
});

// ─── Feature 3: Age Display Inside Nodes ───────────────────

describe("age display", () => {
  test("parser accepts age property", () => {
    const ast = parseGenogram(`genogram\n  john [male, age: 46]`);
    const john = ast.individuals.find(i => i.id === "john");
    expect(john?.age).toBe(46);
  });

  test("renderer shows age text inside node", () => {
    const svg = render(`genogram\n  john [male, age: 46]\n  mary [female, age: 44]\n  john -- mary`);
    expect(svg).toContain("lineage-age");
    expect(svg).toContain(">46<");
    expect(svg).toContain(">44<");
  });

  test("auto-calculates age from birth and death years", () => {
    const svg = render(`genogram\n  john [male, 1950, 1996, deceased]\n  mary [female, 1952]\n  john -- mary`);
    expect(svg).toContain(">46<");
  });
});

// ─── Feature 4: Death Year Range ───────────────────────────

describe("death year", () => {
  test("parser accepts second year as death year", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950, 1996, deceased]`);
    const john = ast.individuals.find(i => i.id === "john");
    expect(john?.birthYear).toBe(1950);
    expect(john?.deathYear).toBe(1996);
  });

  test("parser accepts death: YYYY syntax", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950, deceased, death: 1996]`);
    const john = ast.individuals.find(i => i.id === "john");
    expect(john?.deathYear).toBe(1996);
  });

  test("renderer shows year range in label", () => {
    const svg = render(`genogram\n  john [male, 1950, 1996, deceased]\n  mary [female, 1952]\n  john -- mary`);
    expect(svg).toContain("1950–1996");
  });

  test("renderer shows birth year only with b. prefix", () => {
    const svg = render(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary`);
    expect(svg).toContain("b. 1950");
  });
});

// ─── Feature 5: Relationship Labels ────────────────────────

describe("relationship labels", () => {
  test("parser extracts label from couple line", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary "m. 1979"`);
    const coupleRel = ast.relationships.find(r => r.type === "married");
    expect(coupleRel?.label).toBe("m. 1979");
  });

  test("renderer displays relationship label on edge", () => {
    const svg = render(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary "m. 1979"`);
    expect(svg).toContain("m. 1979");
    expect(svg).toContain("lineage-edge-label");
  });
});

// ─── Feature 6: Multi-color Condition Fills ────────────────

describe("multi-color conditions", () => {
  test("parser accepts color in condition syntax", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950, conditions: heart(full, #e74c3c) + diabetes(half-left, #2196f3)]`);
    const john = ast.individuals.find(i => i.id === "john");
    expect(john?.conditions).toHaveLength(2);
    expect(john?.conditions?.[0]).toEqual({ label: "heart", fill: "full", color: "#e74c3c" });
    expect(john?.conditions?.[1]).toEqual({ label: "diabetes", fill: "half-left", color: "#2196f3" });
  });

  test("conditions without color still work", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950, conditions: heart(full)]`);
    const john = ast.individuals.find(i => i.id === "john");
    expect(john?.conditions?.[0]).toEqual({ label: "heart", fill: "full" });
    expect(john?.conditions?.[0].color).toBeUndefined();
  });

  test("renderer uses per-condition colors", () => {
    const svg = render(`genogram\n  john [male, 1950, conditions: heart(full, #e74c3c) + diabetes(half-left, #2196f3)]\n  mary [female, 1952]\n  john -- mary`);
    expect(svg).toContain("#e74c3c");
    expect(svg).toContain("#2196f3");
  });
});

// ─── Feature 7: Emotional Relationship Lines ───────────────

describe("emotional relationships", () => {
  test("parser detects non-directional emotional relationship", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary\n  john -hostile- mary`);
    const hostile = ast.relationships.find(r => r.type === "hostile");
    expect(hostile).toBeDefined();
    expect(hostile?.from).toBe("john");
    expect(hostile?.to).toBe("mary");
    expect(hostile?.directional).toBeFalsy();
  });

  test("parser detects directional emotional relationship", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary\n  john -abuse-> mary`);
    const abuse = ast.relationships.find(r => r.type === "abuse");
    expect(abuse).toBeDefined();
    expect(abuse?.directional).toBe(true);
  });

  test("parser handles emotional relationship with label", () => {
    const ast = parseGenogram(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary\n  john -hostile- mary "since 2010"`);
    const hostile = ast.relationships.find(r => r.type === "hostile");
    expect(hostile?.label).toBe("since 2010");
  });

  test("renderer draws emotional edges with color", () => {
    const svg = render(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary\n  john -hostile- mary`);
    expect(svg).toContain("lineage-emotional");
    expect(svg).toContain("lineage-emotional-hostile");
    expect(svg).toContain("#e53935"); // hostile = red
  });

  test("renderer draws positive emotional edges in green", () => {
    const svg = render(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary\n  john -harmony- mary`);
    expect(svg).toContain("#4caf50"); // positive = green
  });

  test("directional emotional edge has arrow marker", () => {
    const svg = render(`genogram\n  john [male, 1950]\n  mary [female, 1952]\n  john -- mary\n  john -abuse-> mary`);
    expect(svg).toContain("lineage-arrow");
    expect(svg).toContain("marker-end");
  });

  test("all emotional type categories render with correct colors", () => {
    const svg = render(`genogram
  a [male, 1950]
  b [female, 1952]
  c [male, 1948]
  d [female, 1950]
  a -- b
  c -- d
  a -close- b
  a -distant- c
  a -fused- d`);
    expect(svg).toContain("#4caf50"); // close = green
    expect(svg).toContain("#9e9e9e"); // distant = gray
    expect(svg).toContain("#9c27b0"); // fused = purple... wait, fused is ambivalent
  });
});

// ─── Feature 8: Cross-generation Emotional Relationships ───

describe("cross-generation emotional relationships", () => {
  test("parser handles cross-generation emotional line", () => {
    const ast = parseGenogram(`genogram
  grandpa [male, 1930]
  grandma [female, 1932]
  grandpa -- grandma
    dad [male, 1955]
  dad -close- grandma`);
    const close = ast.relationships.find(r => r.type === "close");
    expect(close).toBeDefined();
    expect(close?.from).toBe("dad");
    expect(close?.to).toBe("grandma");
  });

  test("renderer draws cross-gen emotional edge", () => {
    const svg = render(`genogram
  grandpa [male, 1930]
  grandma [female, 1932]
  grandpa -- grandma
    dad [male, 1955]
  dad -close- grandma`);
    expect(svg).toContain("lineage-emotional-close");
    expect(svg).toContain("Q"); // quadratic curve for cross-gen
  });
});

// ─── New fill types ────────────────────────────────────────

describe("extended fill types", () => {
  test("parser accepts quad fills", () => {
    const ast = parseGenogram(`genogram\n  john [male, conditions: cancer(quad-tl, #e74c3c) + heart(quad-tr, #2196f3)]`);
    expect(ast.individuals[0].conditions?.[0].fill).toBe("quad-tl");
    expect(ast.individuals[0].conditions?.[1].fill).toBe("quad-tr");
  });

  test("parser accepts half-top fill", () => {
    const ast = parseGenogram(`genogram\n  john [male, conditions: migraine(half-top)]`);
    expect(ast.individuals[0].conditions?.[0].fill).toBe("half-top");
  });
});
