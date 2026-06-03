import { describe, expect, it } from "vitest";
import { parseDecisionTree, DTreeParseError } from "../../src/diagrams/decisiontree/parser";
import { renderDecisionTree } from "../../src/diagrams/decisiontree/renderer";
import { layoutInfluence } from "../../src/diagrams/decisiontree/influence-layout";
import type { InfluenceAST } from "../../src/diagrams/decisiontree/types";

// Classic "oil wildcatter" influence diagram (Howard & Matheson).
const WILDCATTER = `decisiontree:influence "Oil Wildcatter"
  decision Drill "Drill?"
  chance Oil "Oil present"
  chance Seismic "Seismic test"
  value Profit "Net profit" utility=42
  Seismic -> Oil
  Seismic -> Drill
  Oil -> Profit
  Drill -> Profit`;

function asInfluence(src: string): InfluenceAST {
  const ast = parseDecisionTree(src);
  if (ast.mode !== "influence") throw new Error(`expected influence mode, got ${ast.mode}`);
  return ast;
}

describe("influence mode — parsing nodes + arcs", () => {
  it("dispatches to influence mode via the :influence header suffix", () => {
    const ast = asInfluence(WILDCATTER);
    expect(ast.type).toBe("decisiontree");
    expect(ast.mode).toBe("influence");
    expect(ast.title).toBe("Oil Wildcatter");
  });

  it("dispatches to influence mode via a `mode: influence` directive", () => {
    const ast = asInfluence(`decisiontree "Market Entry"
  mode: influence
  decision Enter "Enter market?"
  value V "Payoff"
  Enter -> V`);
    expect(ast.mode).toBe("influence");
    expect(ast.nodes.map((n) => n.id).sort()).toEqual(["Enter", "V"]);
  });

  it("also accepts a `layout: influence` directive", () => {
    const ast = asInfluence(`decisiontree
  layout: influence
  chance C "State"
  value V "Utility"
  C -> V`);
    expect(ast.mode).toBe("influence");
  });

  it("parses all node kinds and the arcs between them", () => {
    const ast = asInfluence(WILDCATTER);
    expect(ast.nodes).toHaveLength(4);
    const kinds = Object.fromEntries(ast.nodes.map((n) => [n.id, n.kind]));
    expect(kinds).toEqual({
      Drill: "decision",
      Oil: "chance",
      Seismic: "chance",
      Profit: "value",
    });
    expect(ast.arcs).toHaveLength(4);
  });

  it("captures the utility annotation on a value node", () => {
    const ast = asInfluence(WILDCATTER);
    const profit = ast.nodes.find((n) => n.id === "Profit");
    expect(profit?.utility).toBe(42);
  });

  it("derives influence semantics from the destination node kind", () => {
    const ast = asInfluence(WILDCATTER);
    const byKey = (from: string, to: string) =>
      ast.arcs.find((a) => a.from === from && a.to === to);
    // arc into a decision = informational (dashed)
    expect(byKey("Seismic", "Drill")?.kind).toBe("information");
    // arc into a chance node = relevance/conditioning
    expect(byKey("Seismic", "Oil")?.kind).toBe("relevance");
    // arc into the value node = functional dependence
    expect(byKey("Oil", "Profit")?.kind).toBe("functional");
    expect(byKey("Drill", "Profit")?.kind).toBe("functional");
  });

  it("parses arc labels", () => {
    const ast = asInfluence(`decisiontree:influence
  decision D "Decide"
  value V "Value"
  D -> V "leads to"`);
    expect(ast.arcs[0]?.label).toBe("leads to");
  });
});

describe("influence mode — validation", () => {
  it("rejects a graph with a cycle", () => {
    const src = `decisiontree:influence "Cyclic"
  chance A "A"
  chance B "B"
  value V "V"
  A -> B
  B -> A
  B -> V`;
    expect(() => parseDecisionTree(src)).toThrow(DTreeParseError);
    expect(() => parseDecisionTree(src)).toThrow(/acyclic|cycle/i);
  });

  it("rejects a self-loop", () => {
    const src = `decisiontree:influence
  chance A "A"
  value V "V"
  A -> A
  A -> V`;
    expect(() => parseDecisionTree(src)).toThrow(/self-loop/i);
  });

  it("requires at least one value node", () => {
    const src = `decisiontree:influence "No value"
  decision D "Decide"
  chance C "Uncertain"
  C -> D`;
    expect(() => parseDecisionTree(src)).toThrow(DTreeParseError);
    expect(() => parseDecisionTree(src)).toThrow(/value node/i);
  });

  it("rejects arcs referencing an undefined node", () => {
    const src = `decisiontree:influence
  decision D "Decide"
  value V "V"
  D -> Ghost`;
    expect(() => parseDecisionTree(src)).toThrow(/undefined node/i);
  });

  it("rejects duplicate node ids", () => {
    const src = `decisiontree:influence
  decision D "First"
  chance D "Second"
  value V "V"`;
    expect(() => parseDecisionTree(src)).toThrow(/duplicate/i);
  });
});

describe("influence mode — layout (DAG layering)", () => {
  it("lays nodes out left-to-right by longest path, value node rightmost", () => {
    const ast = asInfluence(WILDCATTER);
    const layout = layoutInfluence(ast);
    const layer = Object.fromEntries(layout.nodes.map((n) => [n.node.id, n.layer]));
    // Seismic feeds Oil and Drill, both of which feed Profit.
    expect(layer.Seismic).toBeLessThan(layer.Oil);
    expect(layer.Seismic).toBeLessThan(layer.Drill);
    const maxLayer = Math.max(...Object.values(layer));
    expect(layer.Profit).toBe(maxLayer);
  });

  it("produces one routed arc per declared arc", () => {
    const ast = asInfluence(WILDCATTER);
    const layout = layoutInfluence(ast);
    expect(layout.arcs).toHaveLength(ast.arcs.length);
    for (const a of layout.arcs) expect(a.path).toMatch(/^M /);
  });

  it("emits positive canvas dimensions", () => {
    const layout = layoutInfluence(asInfluence(WILDCATTER));
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });
});

describe("influence mode — rendering (semantic SVG)", () => {
  const svg = renderDecisionTree(asInfluence(WILDCATTER));

  it("renders a decision node as a rectangle with the decision class", () => {
    expect(svg).toContain('class="lt-dtree-decision"');
    expect(svg).toMatch(/<rect[^>]*class="lt-dtree-decision"/);
  });

  it("renders a chance node as an ellipse with the chance class", () => {
    expect(svg).toContain('class="lt-dtree-chance"');
    expect(svg).toMatch(/<ellipse[^>]*class="lt-dtree-chance"/);
  });

  it("renders a value node as an octagon polygon (8 points) with the value class", () => {
    expect(svg).toContain('class="lt-dtree-value"');
    const m = svg.match(/<polygon[^>]*class="lt-dtree-value"[^>]*points="([^"]+)"/) ??
      svg.match(/<polygon[^>]*points="([^"]+)"[^>]*class="lt-dtree-value"/);
    expect(m).not.toBeNull();
    const points = m ? m[1] : "";
    // Octagon = 8 vertices (Howard & Matheson cut-corner value node)
    expect(points.trim().split(/\s+/).length).toBe(8);
  });

  it("draws informational arcs into decisions as dashed", () => {
    expect(svg).toContain('class="lt-dtree-arc-information"');
    expect(svg).toContain('data-arc-kind="information"');
  });

  it("includes accessibility title + desc and no inline style attribute", () => {
    expect(svg).toContain("<title>Oil Wildcatter</title>");
    expect(svg).toContain("<desc>");
    expect(svg).not.toMatch(/\sstyle="/);
  });

  it("exposes node kind via data attributes", () => {
    expect(svg).toContain('data-node-kind="decision"');
    expect(svg).toContain('data-node-kind="chance"');
    expect(svg).toContain('data-node-kind="value"');
  });
});
