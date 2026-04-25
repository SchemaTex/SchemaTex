import { describe, test, expect } from "vitest";
import { parseGenogram } from "../../src/diagrams/genogram/parser";
import { buildGenogramLegend } from "../../src/diagrams/genogram/legend";
import { genogram } from "../../src/diagrams/genogram";

// ─── buildGenogramLegend ────────────────────────────────────

describe("buildGenogramLegend (auto-derive)", () => {
  test("Male/Female sex shapes are NOT auto-listed (universal McGoldrick convention)", () => {
    const ast = parseGenogram(`
genogram
  john [male]
  mary [female]
  john -- mary
`);
    const spec = buildGenogramLegend(ast);
    const keys = spec.items.map((i) => i.key);
    expect(keys).not.toContain("sex.male");
    expect(keys).not.toContain("sex.female");
  });

  test("non-obvious sex variants (unknown/nonbinary/etc) DO appear", () => {
    const ast = parseGenogram(`
genogram
  a [unknown]
  b [female]
  a -- b
`);
    const spec = buildGenogramLegend(ast);
    const keys = spec.items.map((i) => i.key);
    expect(keys).toContain("sex.unknown");
    expect(keys).not.toContain("sex.female");
  });

  test("`married` and `parent-child` are excluded by default (universal McGoldrick conventions)", () => {
    const ast = parseGenogram(`
genogram
  a [male]
  b [female]
  a -- b
    c [male]
`);
    const spec = buildGenogramLegend(ast);
    const keys = spec.items.map((i) => i.key);
    expect(keys).not.toContain("married");
    expect(keys).not.toContain("parent-child");
  });

  test("non-obvious structural relationships still appear (e.g. divorced)", () => {
    const ast = parseGenogram(`
genogram
  a [male]
  b [female]
  a -x- b
`);
    const spec = buildGenogramLegend(ast);
    const structural = spec.items.filter((i) => i.section === "structural");
    expect(structural.map((i) => i.key)).toContain("divorced");
  });

  test("emits Relationships section for emotional edges actually used", () => {
    const ast = parseGenogram(`
genogram
  a [male]
  b [female]
  a -- b
    c [male]
    d [female]
  c -close- d
  a -conflict- b
`);
    const spec = buildGenogramLegend(ast);
    const rels = spec.items.filter((i) => i.section === "relationships");
    expect(rels.map((i) => i.key)).toContain("close");
    expect(rels.map((i) => i.key)).toContain("conflict");
    expect(rels.map((i) => i.key)).not.toContain("hostile");
  });

  test("emits Conditions section dedup by label", () => {
    const ast = parseGenogram(`
genogram
  a [male, conditions: diabetes(full)]
  b [female, conditions: diabetes(full)]
  a -- b
`);
    const spec = buildGenogramLegend(ast);
    const cond = spec.items.filter((i) => i.section === "conditions");
    expect(cond).toHaveLength(1);
    expect(cond[0].label.toLowerCase()).toContain("diabetes");
  });

  test("does not emit unused encoding rows", () => {
    const ast = parseGenogram(`
genogram
  a [male]
  b [male]
`);
    const spec = buildGenogramLegend(ast);
    expect(spec.items.find((i) => i.key === "sex.female")).toBeUndefined();
    expect(spec.items.find((i) => i.section === "structural")).toBeUndefined();
    expect(spec.items.find((i) => i.section === "relationships")).toBeUndefined();
  });

  test("auto spec defaults: bottom-inline, mode auto, title=Legend", () => {
    const ast = parseGenogram(`
genogram
  a [male]
`);
    const spec = buildGenogramLegend(ast);
    expect(spec.position).toBe("bottom-inline");
    expect(spec.mode).toBe("auto");
    expect(spec.title).toBe("Legend");
  });
});

// ─── DSL overrides through parser ──────────────────────────

describe("genogram parser captures legend overrides", () => {
  test("legend: off propagates", () => {
    const ast = parseGenogram(`
genogram
  legend: off
  a [male]
`);
    expect(ast.legendOverrides?.mode).toBe("off");
  });

  test("legend.title and legend.position", () => {
    const ast = parseGenogram(`
genogram
  legend.title: "Family Symbols"
  legend.position: bottom-right
  a [male]
`);
    expect(ast.legendOverrides?.title).toBe("Family Symbols");
    expect(ast.legendOverrides?.position).toBe("bottom-right");
  });

  test("legend.label override", () => {
    const ast = parseGenogram(`
genogram
  legend.label close: "Best friends forever"
  a [male]
  b [female]
  a -close- b
`);
    expect(ast.legendOverrides?.labels?.close).toBe("Best friends forever");
  });

  test("legend.hide list", () => {
    const ast = parseGenogram(`
genogram
  legend.hide: distant, normal
  a [male]
`);
    expect(ast.legendOverrides?.hide).toEqual(["distant", "normal"]);
  });
});

// ─── End-to-end render ─────────────────────────────────────

describe("genogram renderer composes legend", () => {
  function render(dsl: string): string {
    return genogram.render(dsl);
  }

  test("default-on: legend group present (with non-obvious encoding to display)", () => {
    const svg = render(`
genogram
  a [male]
  b [female, conditions: diabetes(full)]
  a -- b
`);
    expect(svg).toContain('class="schematex-legend"');
    // Conditions are non-obvious so they show up
    expect(svg).toContain('data-legend-key="diabetes"');
  });

  test("default-on: married, parent-child, male, female are NOT auto-listed (universal conventions)", () => {
    // Add a deceased status so SOME legend appears — proves the universal
    // conventions are excluded while non-obvious encodings are included.
    const svg = render(`
genogram
  a [male, deceased]
  b [female]
  a -- b
    c [male]
`);
    expect(svg).toContain('class="schematex-legend"');
    expect(svg).not.toContain('data-legend-key="married"');
    expect(svg).not.toContain('data-legend-key="parent-child"');
    expect(svg).not.toContain('data-legend-key="sex.male"');
    expect(svg).not.toContain('data-legend-key="sex.female"');
    expect(svg).toContain('data-legend-key="status.deceased"');
  });

  test("legend is suppressed entirely when there's nothing non-obvious to show", () => {
    const svg = render(`
genogram
  a [male]
  b [female]
  a -- b
    c [male]
`);
    // Just universal conventions — no legend rendered at all.
    expect(svg).not.toContain('class="schematex-legend"');
  });

  test("legend: off suppresses legend", () => {
    const svg = render(`
genogram
  legend: off
  a [male]
  b [female]
  a -- b
`);
    expect(svg).not.toContain('class="schematex-legend"');
  });

  test("legend.label override changes rendered text", () => {
    const svg = render(`
genogram
  legend.label close: "Best friends forever"
  a [male]
  b [female]
  a -- b
    c [male]
    d [female]
  c -close- d
`);
    expect(svg).toContain("Best friends forever");
  });

  test("legend.hide removes a row", () => {
    const svg = render(`
genogram
  legend.hide: divorced
  a [male]
  b [female]
  a -x- b
`);
    expect(svg).not.toContain('data-legend-key="divorced"');
  });

  test("bottom-inline grows the viewBox height (not width)", () => {
    // Use a chart with non-obvious encoding so the legend actually renders.
    const withLegend = render(`
genogram
  a [male, deceased]
  b [female]
  a -- b
`);
    const without = render(`
genogram
  legend: off
  a [male, deceased]
  b [female]
  a -- b
`);
    const m1 = withLegend.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    const m2 = without.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    expect(m1).toBeTruthy();
    expect(m2).toBeTruthy();
    expect(Number.parseFloat(m1![2])).toBeGreaterThan(Number.parseFloat(m2![2]));
  });
});
