import { describe, expect, test } from "vitest";
import type { Individual, IndividualStatus, LayoutConfig } from "../../src/core/types";
import { genogram, layoutGenogram, parseGenogram, renderIndividualSymbol } from "../../src/diagrams/genogram";
import { buildGenogramLegend } from "../../src/diagrams/genogram/legend";

const statuses = ["deceased", "stillborn", "miscarriage", "pregnancy"] satisfies IndividualStatus[];
const config: LayoutConfig = { nodeSpacingX: 60, nodeSpacingY: 120, nodeWidth: 40, nodeHeight: 40 };

function symbol(status: IndividualStatus, sex: Individual["sex"] = "male"): string {
  return renderIndividualSymbol({ id: "person", label: "Person", sex, status }, 0, 0, 40);
}

function base(svg: string): string {
  const match = svg.match(/<(?:rect|circle|polygon)\b[^>]*class="schematex-genogram-shape"[^>]*\/>/);
  expect(match).not.toBeNull();
  return match![0];
}

describe("genogram status symbols", () => {
  test.each([["miscarriage", 6], ["stillborn", 10], ["pregnancy", 10]] as const)("descent reaches the painted %s symbol", (status, half) => {
    const svg = genogram.render(`genogram\n  a [male]\n  b [female]\n  a -- b\n    outcome [${status}]`);
    const node = /<g\b[^>]*data-individual-id="outcome"[^>]*transform="translate\(([^)]+)\)"/.exec(svg);
    expect(node).not.toBeNull();
    const [, cy] = node![1].split(/[ ,]+/).map(Number);
    const edge = /<g\b[^>]*data-to="outcome"[^>]*>\s*<path\b[^>]*d="([^"]+)"/.exec(svg);
    expect(edge).not.toBeNull();
    const values = edge![1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(values.at(-1)).toBeCloseTo(cy - half);
  });
  test.each(statuses)("%s parses in standalone, child, inline-partner, and redeclaration positions", (status) => {
    const sources = [
      `genogram\n  person [${status}, male]`,
      `genogram\n  a [male]\n  b [female]\n  a -- b\n    person [male, ${status}]`,
      `genogram\n  a [female]\n  a -- person [male, ${status}]`,
      `genogram\n  person [male]\n  person [${status}]`,
    ];
    for (const source of sources) {
      const ast = parseGenogram(source);
      expect(ast.individuals.filter((person) => person.id === "person")).toEqual([
        expect.objectContaining({ id: "person", status, sex: "male" }),
      ]);
    }
  });

  test("deceased retains its full-size symbol and exactly two diagonal cross strokes", () => {
    const svg = symbol("deceased");
    expect(base(svg)).toContain('width="40" height="40"');
    expect(svg.match(/<line\b[^>]*class="schematex-genogram-deceased-mark"[^>]*\/>/g)).toHaveLength(2);
    expect(svg).toContain('x1="-20" y1="-20" x2="20" y2="20"');
    expect(svg).toContain('x1="20" y1="-20" x2="-20" y2="20"');
    expect(svg).not.toContain("<polygon");
    expect(svg).not.toContain(">SB<");
    expect(svg).not.toContain("stroke-dasharray");
    const femaleCross = symbol("deceased", "female").match(/<line x1="([^"]+)"/);
    expect(Number(femaleCross![1])).toBeCloseTo(-20 * 0.707);
  });

  test.each(["male", "female", "unknown"] satisfies Individual["sex"][])("stillborn uses a small square and X for %s", (sex) => {
    const svg = symbol("stillborn", sex);
    expect(base(svg)).toContain('<rect x="-10" y="-10" width="20" height="20"');
    expect(svg.match(/data-mark="stillbirth-cross"/g)).toHaveLength(2);
    expect(svg).not.toContain(">SB<");
  });

  test("miscarriage is a hollow circle filling its 12 by 12 box", () => {
    const svg = symbol("miscarriage");
    expect(base(svg)).toContain('<circle cx="0" cy="0" r="6"');
    expect(svg).not.toMatch(/<(rect|polygon|line)\b/);
    expect(svg).not.toContain("stroke-dasharray");
  });

  test("pregnancy is a 20 by 20 triangle with a continuous outline", () => {
    const svg = symbol("pregnancy", "female");
    expect(base(svg)).toContain('<polygon points="0,-10 10,10 -10,10"');
    expect(base(svg)).not.toContain("stroke-dasharray");
    expect(svg).not.toMatch(/<(rect|circle|line)\b/);
  });

  test("all four statuses and alive have different visible symbol treatments", () => {
    const visibleSymbols = ["alive", ...statuses].map((status) => {
      const ast = parseGenogram(`genogram\n  person [male${status === "alive" ? "" : `, ${status}`}]`);
      const svg = renderIndividualSymbol(ast.individuals[0], 0, 0, 40);
      // Compare only drawn geometry/text, excluding identity and status metadata.
      return svg.replace(/<\/?g\b[^>]*>/g, "").replace(/<title>.*?<\/title>/g, "");
    });
    expect(new Set(visibleSymbols).size).toBe(5);
  });

  test.each(statuses)("%s survives rendering alongside a living person", (status) => {
    const svg = genogram.render(`genogram\n  alive [male]\n  affected [male, ${status}]`);
    expect(svg).toContain(`data-individual-id="affected" data-status="${status}"`);
    expect(svg).toContain('data-individual-id="alive" data-status="alive"');
    expect(svg.match(/class="schematex-genogram-shape"/g)).toHaveLength(2);
    expect(svg).toContain(base(symbol(status)));
    expect(svg).toContain(base(symbol("alive")));
  });

  test.each(statuses)("%s alone contributes exactly one status legend row", (status) => {
    const source = `genogram\n  first [male, ${status}]\n  second [female, ${status}]`;
    const items = buildGenogramLegend(parseGenogram(source)).items.filter((item) => item.key.startsWith("status."));
    expect(items.map((item) => item.key)).toEqual([`status.${status}`]);
    const svg = genogram.render(source);
    expect(svg).toContain(`>${items[0].label}</text>`);
    const absent = buildGenogramLegend(parseGenogram("genogram\n  first [male]\n  second [female]"));
    expect(absent.items.filter((item) => item.key.startsWith("status."))).toEqual([]);
  });

  test("legend swatches distinguish stillbirth, deceased, miscarriage and pregnancy", () => {
    const ast = parseGenogram(`genogram\n${statuses.map((status) => `  ${status} [male, ${status}]`).join("\n")}`);
    const items = buildGenogramLegend(ast).items;
    expect(items.find((item) => item.key === "status.deceased")).toMatchObject({ marker: "X" });
    expect(items.find((item) => item.key === "status.stillborn")).toMatchObject({ shape: "square", marker: "X" });
    expect(items.find((item) => item.key === "status.miscarriage")).toMatchObject({ kind: "shape", shape: "circle" });
    expect(items.find((item) => item.key === "status.pregnancy")).toMatchObject({ kind: "shape", shape: "triangle", fill: "none" });
  });

  test.each(statuses)("%s leaves generations and sibling ordering unchanged", (status) => {
    const source = `genogram\n  a [male]\n  b [female]\n  a -- b\n    younger [female, 2020]\n    person [male, 2015]\n    older [male, 2010]`;
    const positions = (text: string) => layoutGenogram(parseGenogram(text), config).nodes.map(({ id, x, y, generation }) => ({ id, x, y, generation }));
    expect(positions(source.replace("male, 2015", `male, 2015, ${status}`))).toEqual(positions(source));
  });

  test("status-selected shapes also govern condition fills and index borders", () => {
    const svg = renderIndividualSymbol({ id: "p", label: "P", sex: "female", status: "pregnancy", markers: ["index-person"], conditions: [{ label: "condition", fill: "full", color: "#123456" }] }, 0, 0, 40);
    expect(svg).not.toContain("<circle");
    expect(svg.match(/<polygon\b/g)).toHaveLength(4);
    expect(svg).toMatch(/<polygon points="0,-10 10,10 -10,10"[^>]*class="schematex-genogram-condition-fill/);
  });
});
