import { expect, it } from "vitest";
import { parseDecisionTree } from "../../src/diagrams/decisiontree/parser";
import { layoutDecisionTree } from "../../src/diagrams/decisiontree/layout";
import { renderDecisionTree } from "../../src/diagrams/decisiontree/renderer";

it("preserves complete question text and separates mixed-depth outcomes in both directions", () => {
  const label = "Does the service have enough independent capacity to complete all remaining requests safely?";
  for (const direction of ["top-down", "left-right"]) {
    const ast = parseDecisionTree(`decisiontree "Capacity"\ndirection: ${direction}\nq "${label}"\n  yes: a "Proceed"\n  no: q "Can capacity be added?"\n    yes: a "Expand"\n    no: a "Wait"`);
    if ("arcs" in ast) throw new Error("Expected tree");
    const svg = renderDecisionTree(ast);
    const words = [...svg.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)].map(m => m[1]).join(" ");
    expect(words).toContain(label);
    const layout = layoutDecisionTree(ast);
    const ends = layout.nodes.filter(n => n.node.kind === "answer");
    expect(new Set(ends.map(n => direction === "top-down" ? n.y : n.x)).size).toBe(1);
    for (const a of layout.nodes) for (const b of layout.nodes) {
      if (a === b) continue;
      expect(Math.abs(a.x - b.x) >= (a.width + b.width) / 2 || Math.abs(a.y - b.y) >= (a.height + b.height) / 2).toBe(true);
    }
  }
});

it("preserves authored outcome classes without inferring urgency from words", () => {
  const ast = parseDecisionTree('decisiontree\nclasses: urgent, routine\nq "Ready?"\n  yes: a "Continue" class=routine\n  no: a "Emergency shutdown"');
  if ("arcs" in ast) throw new Error("Expected tree");
  expect(ast.root.children.map(n => n.className)).toEqual(["routine", undefined]);
});

it("uses quoted ML operators for relation labels and preserves declared predictions", () => {
  const ast = parseDecisionTree('decisiontree:ml\nbranchLabels: relation\nclasses: accepted, declined\nsplit "Capacity limit" feature=capacity op="<=" threshold=20 samples=10 value=[7,3]\n  true leaf "Proceed" class=accepted value=[5,1]\n  false leaf "Wait" class=declined value=[2,2]');
  if ("arcs" in ast) throw new Error("Expected tree");
  expect(ast.root.op).toBe("<=");
  expect(layoutDecisionTree(ast).edges.map(e => e.label)).toEqual(["≤ 20", "> 20"]);
  expect(ast.root.children[1]?.className).toBe("declined");
});

it("keeps regression metric names instead of presenting MSE as Gini", () => {
  const svg = renderDecisionTree(parseDecisionTree('decisiontree:ml\nleaf "Prediction" samples=10 value=2.5 mse=0.3'));
  expect(svg).toContain('mse 0.30');
  expect(svg).not.toContain('gini');
});
