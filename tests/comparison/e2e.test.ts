import { describe, expect, it } from "vitest";
import { render, parse } from "../../src/core/api";
import { parseComparison, ComparisonParseError } from "../../src/diagrams/comparison/parser";
import { computeDecision } from "../../src/diagrams/comparison/compute";
import { layoutComparison } from "../../src/diagrams/comparison/layout";
import type { ComparisonAst } from "../../src/diagrams/comparison/types";

const ast = (src: string) => parseComparison(src);

// ─── Detection & routing ──────────────────────────────────────

describe("comparison — detection", () => {
  it("auto-detects via the comparison header", () => {
    const svg = render(`comparison "X"
mode: tchart
column "A"
- one`);
    expect(svg).toContain('data-diagram-type="comparison"');
    expect(svg).toContain('data-mode="tchart"');
  });

  it("accepts the tchart and pugh alias headers (mode set from header)", () => {
    expect(ast(`tchart "X"\ncolumn "A"\n- one`).mode).toBe("tchart");
    expect(ast(`pugh "X"\noption "A"\ncriterion "c" weight: 1\n  A: 3`).mode).toBe("decision");
  });

  it("exposes the parsed AST through the public parse()", () => {
    const a = parse(`comparison "X"\nmode: matrix\noption "A"\ncriterion "c"\n  A: yes`) as ComparisonAst;
    expect(a.type).toBe("comparison");
    expect(a.options).toHaveLength(1);
  });
});

// ─── Mode inference ───────────────────────────────────────────

describe("comparison — mode inference", () => {
  it("infers pros-cons from pro/con lines", () => {
    expect(ast(`comparison "X"\npro "a"\ncon "b"`).mode).toBe("pros-cons");
  });
  it("infers double-bubble from left/right", () => {
    expect(ast(`comparison "X"\nleft "A"\nright "B"\nshared "s"`).mode).toBe("double-bubble");
  });
  it("infers matrix from options+criteria with no scores", () => {
    expect(ast(`comparison "X"\noption "A"\ncriterion "c"\n  A: yes`).mode).toBe("matrix");
  });
  it("infers decision when a weight or numeric score is present", () => {
    expect(ast(`comparison "X"\noption "A"\ncriterion "c" weight: 2\n  A: 3`).mode).toBe("decision");
    expect(ast(`comparison "X"\noption "A"\ncriterion "c"\n  A: 4`).mode).toBe("decision");
  });
});

// ─── Decision computation (the moat) ──────────────────────────

describe("comparison — decision matrix computation", () => {
  const src = `comparison "DB"
mode: decision
baseline: "PostgreSQL"
option "PostgreSQL"
option "MongoDB"
option "DynamoDB"
criterion "Query flexibility" weight: 5
  PostgreSQL: 5
  MongoDB: 3
  DynamoDB: 2
criterion "Horizontal scaling" weight: 4
  PostgreSQL: 3
  MongoDB: 4
  DynamoDB: 5
criterion "Operational cost" weight: 3
  PostgreSQL: 4
  MongoDB: 3
  DynamoDB: 3`;

  it("computes weighted totals Σ(weight × score)", () => {
    const a = ast(src);
    const d = computeDecision(a);
    // PG: 5*5 + 4*3 + 3*4 = 25+12+12 = 49
    // Mongo: 5*3 + 4*4 + 3*3 = 15+16+9 = 40
    // Dynamo: 5*2 + 4*5 + 3*3 = 10+20+9 = 39
    const id = (label: string) => a.options.find((o) => o.label === label)!.id;
    expect(d.totals[id("PostgreSQL")]).toBe(49);
    expect(d.totals[id("MongoDB")]).toBe(40);
    expect(d.totals[id("DynamoDB")]).toBe(39);
  });

  it("ranks options and names the winner", () => {
    const a = ast(src);
    const d = computeDecision(a);
    expect(a.options.find((o) => o.id === d.winnerId)!.label).toBe("PostgreSQL");
    expect(d.maxTotal).toBe(49);
    const id = (label: string) => a.options.find((o) => o.label === label)!.id;
    expect(d.ranks[id("PostgreSQL")]).toBe(1);
    expect(d.ranks[id("MongoDB")]).toBe(2);
    expect(d.ranks[id("DynamoDB")]).toBe(3);
  });

  it("computes deltas versus the declared Pugh baseline", () => {
    const a = ast(src);
    const d = computeDecision(a);
    const id = (label: string) => a.options.find((o) => o.label === label)!.id;
    expect(d.deltas![id("PostgreSQL")]).toBe(0); // datum
    expect(d.deltas![id("MongoDB")]).toBe(-9);
    expect(d.deltas![id("DynamoDB")]).toBe(-10);
  });

  it("uses standard competition ranking on a tie (1,1,3)", () => {
    const a = ast(`comparison "T"
mode: decision
option "A"
option "B"
option "C"
criterion "c" weight: 1
  A: 5
  B: 5
  C: 2`);
    const d = computeDecision(a);
    const id = (l: string) => a.options.find((o) => o.label === l)!.id;
    expect(d.ranks[id("A")]).toBe(1);
    expect(d.ranks[id("B")]).toBe(1);
    expect(d.ranks[id("C")]).toBe(3);
  });

  it("renders the computed winner into the SVG <desc> and a caption", () => {
    const svg = render(src);
    expect(svg).toContain("Winner:");
    expect(svg).toContain("PostgreSQL");
    expect(svg).toContain('data-variant="winner"');
  });

  it("defaults a missing weight to 1", () => {
    const a = ast(`comparison "X"
mode: decision
option "A"
criterion "c"
  A: 4`);
    const d = computeDecision(a);
    expect(d.totals[a.options[0]!.id]).toBe(4);
    expect(d.totalWeight).toBe(1);
  });
});

// ─── Cell parsing ─────────────────────────────────────────────

describe("comparison — cell parsing", () => {
  it("normalises yes/no/partial marks and free text", () => {
    const a = ast(`comparison "X"
mode: matrix
option "A"
criterion "yes"
  A: yes
criterion "no"
  A: no
criterion "part"
  A: partial
criterion "text"
  A: "12 months"`);
    const cell = (ci: number) => a.criteria[ci]!.cells[a.options[0]!.id];
    expect(cell(0)!.glyph).toBe("yes");
    expect(cell(1)!.glyph).toBe("no");
    expect(cell(2)!.glyph).toBe("partial");
    expect(cell(3)!.text).toBe("12 months");
  });

  it("supports the pipe form positional to option order", () => {
    const a = ast(`comparison "X"
mode: matrix
option "A"
option "B"
criterion "c" | yes | no`);
    expect(a.criteria[0]!.cells[a.options[0]!.id]!.glyph).toBe("yes");
    expect(a.criteria[0]!.cells[a.options[1]!.id]!.glyph).toBe("no");
  });

  it("warns (not throws) on a cell referencing an undeclared option", () => {
    const a = ast(`comparison "X"
mode: matrix
option "A"
criterion "c"
  Typo: yes`);
    expect(a.warnings.some((w) => /not a declared option/.test(w))).toBe(true);
  });
});

// ─── Validation ───────────────────────────────────────────────

describe("comparison — validation", () => {
  it("rejects a tchart with no columns", () => {
    expect(() => ast(`comparison "X"\nmode: tchart`)).toThrow(ComparisonParseError);
  });
  it("rejects a matrix with no options", () => {
    expect(() => ast(`comparison "X"\nmode: matrix\ncriterion "c"`)).toThrow(/at least one .*option/);
  });
  it("rejects a double-bubble missing a side", () => {
    expect(() => ast(`comparison "X"\nmode: double-bubble\nleft "A"`)).toThrow(/left.*and.*right/);
  });
  it("drops an out-of-set baseline with a warning", () => {
    const a = ast(`comparison "X"
mode: decision
baseline: "Nope"
option "A"
criterion "c" weight: 1
  A: 3`);
    expect(a.baseline).toBeUndefined();
    expect(a.warnings.some((w) => /baseline/.test(w))).toBe(true);
  });
});

// ─── Layout sanity ────────────────────────────────────────────

describe("comparison — layout", () => {
  it("produces a non-degenerate canvas for every mode", () => {
    const modes = [
      `comparison "X"\nmode: tchart\ncolumn "A"\n- one\ncolumn "B"\n- two`,
      `comparison "X"\nmode: pros-cons\npro "a"\ncon "b"`,
      `comparison "X"\nmode: matrix\noption "A"\noption "B"\ncriterion "c"\n  A: yes\n  B: no`,
      `comparison "X"\nmode: decision\noption "A"\noption "B"\ncriterion "c" weight: 2\n  A: 3\n  B: 5`,
      `comparison "X"\nmode: double-bubble\nleft "A"\nright "B"\nshared "s"\nleft-only "l"\nright-only "r"`,
    ];
    for (const src of modes) {
      const l = layoutComparison(ast(src));
      expect(l.width).toBeGreaterThan(120);
      expect(l.height).toBeGreaterThan(60);
    }
  });

  it("appends totals (and a winner) only in decision mode", () => {
    const dec = layoutComparison(ast(`comparison "X"\nmode: decision\noption "A"\ncriterion "c" weight: 1\n  A: 4`));
    expect(dec.cells.some((c) => c.variant === "winner")).toBe(true);
    const mat = layoutComparison(ast(`comparison "X"\nmode: matrix\noption "A"\ncriterion "c"\n  A: yes`));
    expect(mat.cells.some((c) => c.variant === "winner")).toBe(false);
  });

  it("draws two shared connectors per shared bubble (one to each centre)", () => {
    const l = layoutComparison(ast(`comparison "X"\nmode: double-bubble\nleft "A"\nright "B"\nshared "s1"\nshared "s2"`));
    // 2 shared × 2 centres = 4 connectors.
    expect(l.connectors).toHaveLength(4);
    expect(l.ellipses).toHaveLength(4); // 2 centres + 2 shared
  });
});
