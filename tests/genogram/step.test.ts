import { describe, expect, test } from "vitest";
import type { LayoutConfig, SceneItem } from "../../src/core/types";
import { genogram, layoutGenogram, parseGenogram } from "../../src/diagrams/genogram";
import { buildGenogramLegend } from "../../src/diagrams/genogram/legend";

const config: LayoutConfig = { nodeSpacingX: 60, nodeSpacingY: 120, nodeWidth: 40, nodeHeight: 40 };
const parents = `genogram
  bio_dad [male, 1980]
  bio_mum [female, 1982]
  step_dad [male, 1981]
  step_mum [female, 1983]`;
const biological = `  bio_dad -- bio_mum
    younger [female, 2018]
    child [male, 2015, label: "Child", index]
    older [male, 2010]`;
const step = `  step_dad -- step_mum
    own [female, 2012]
    child [step]`;
const source = `${parents}\n${biological}\n${step}`;

function coordinates(text: string) {
  return layoutGenogram(parseGenogram(text), config).nodes.map(({ id, x, y, generation }) => ({ id, x, y, generation }));
}

describe("step-child secondary links", () => {
  test.each([
    "genogram\n  child [step, male]",
    "genogram\n  a [female]\n  a -- child [male, step]",
    "genogram\n  a [male]\n  b [female]\n  a -- b\n    child [step, male]",
    "genogram\n  child [male]\n  child [step]",
  ])("accepts step in the existing child-property positions: %s", (text) => {
    expect(parseGenogram(text).individuals.filter((person) => person.id === "child")).toEqual([
      expect.objectContaining({ id: "child", sex: "male", status: "alive" }),
    ]);
  });

  test.each([
    `${parents}\n${biological}\n${step}`,
    `${parents}\n${step}\n${biological}`,
  ])("biological parentage wins in either declaration order", (text) => {
    const ast = parseGenogram(text);
    expect(ast.individuals.filter((person) => person.id === "child")).toEqual([
      expect.objectContaining({ id: "child", label: "Child", sex: "male", birthYear: 2015, markers: ["index-person"] }),
    ]);
    const links = ast.relationships.filter((relationship) => relationship.to === "child");
    expect(links).toHaveLength(2);
    expect(links.filter((relationship) => !relationship.secondary)).toEqual([
      { type: "parent-child", from: "bio_dad+bio_mum", to: "child" },
    ]);
    expect(links.filter((relationship) => relationship.secondary)).toEqual([
      { type: "step", from: "step_dad+step_mum", to: "child", secondary: true },
    ]);
    const layout = layoutGenogram(ast, config);
    expect(layout.nodes.filter((node) => node.id === "child")).toHaveLength(1);
    expect(layout.edges.filter((edge) => edge.to === "child")).toHaveLength(2);
  });

  test("uses the shared secondary route with exactly two right angles in the SVG", () => {
    const svg = genogram.render(source);
    const match = svg.match(/<g\b[^>]*class="[^"]*schematex-genogram-edge-secondary-step"[^>]*>\s*<path\b[^>]*d="([^"]+)"/);
    expect(match).not.toBeNull();
    const path = match![1];
    expect(path.match(/[ML]/g)).toEqual(["M", "L", "L", "L"]);
    const values = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const [x1, y1, x2, y2, x3, y3, x4, y4] = values;
    expect(x1).toBe(x2);
    expect(y1).not.toBe(y2);
    expect(y2).toBe(y3);
    expect(x2).not.toBe(x3);
    expect(x3).toBe(x4);
    expect(y3).not.toBe(y4);
    expect(svg).toContain(".schematex-genogram-edge-secondary-step path { stroke-dasharray: none; }");
    expect(svg.match(/data-individual-id="child" data-status=/g)).toHaveLength(1);
  });

  test("a step link declared without biological parents retains its type and visible elbows", () => {
    const text = "genogram\n  a [male]\n  b [female]\n  a -- b\n    child [male, step]";
    const layout = layoutGenogram(parseGenogram(text), config);
    expect(layout.edges.find((edge) => edge.to === "child")?.relationship).toMatchObject({ type: "step" });
    const scene: SceneItem[] = [];
    const svg = genogram.render(text, { __scene: scene });
    const match = svg.match(/<g\b[^>]*class="schematex-genogram-edge schematex-genogram-edge-step"[^>]*>\s*<path\b[^>]*d="([^"]+)"/);
    expect(match).not.toBeNull();
    const [x1, y1, x2, y2, x3, y3, x4, y4] = match![1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(y1).toBe(y2);
    expect(x1).not.toBe(x2);
    expect(x2).toBe(x3);
    expect(y2).not.toBe(y3);
    expect(y3).toBe(y4);
    expect(x3).not.toBe(x4);
    expect(scene.some((item) => item.path === match![1])).toBe(true);
  });

  test.each(["foster", "adopted", "guardian"])("shares %s generation assignment and sibling ordering", (type) => {
    expect(coordinates(source)).toEqual(coordinates(source.replace("[step]", `[${type}]`)));
    expect(coordinates(source)).toEqual(coordinates(source.replace("    child [step]", "")));
  });

  test.each(["foster", "adopted"])("shares %s placement even with no biological declaration", (type) => {
    const text = `${parents}\n  step_dad -- step_mum\n    younger [female, 2018]\n    child [male, 2015, step]\n    older [male, 2010]`;
    expect(coordinates(text)).toEqual(coordinates(text.replace("2015, step", `2015, ${type}`)));
  });

  test("Step-child is derived once from relationships, like Foster and Adopted", () => {
    const ast = parseGenogram(`${source}\n  step_dad -- step_mum\n    older [step]\n    younger [foster]\n    child [adopted]`);
    const items = buildGenogramLegend(ast).items;
    expect(items.filter((item) => item.key === "step")).toEqual([
      expect.objectContaining({ key: "step", label: "Step-child", kind: "line", section: "structural", pattern: "step" }),
    ]);
    expect(items.filter((item) => ["foster", "adopted"].includes(item.key))).toHaveLength(2);
    expect(genogram.render(source)).toContain(">Step-child</text>");
    const unused = source.replace("[step]", "[foster]");
    expect(buildGenogramLegend(parseGenogram(unused)).items.map((item) => item.key)).not.toContain("step");
    expect(genogram.render(unused)).not.toContain(">Step-child</text>");
    // A standalone child property does not invent a structural relationship.
    expect(buildGenogramLegend(parseGenogram("genogram\n  child [male, step]")).items).toEqual([]);
  });
});
