import { describe, expect, it } from "vitest";
import { parseMarkov, MarkovParseError } from "../../src/diagrams/markov/parser";

describe("markov parser — declarations", () => {
  it("parses a titled chain with explicit states + transitions", () => {
    const ast = parseMarkov(`markov "Weather"
  state Sunny
  state Rainy
  Sunny -> Sunny : 0.9
  Sunny -> Rainy : 0.1
  Rainy -> Rainy : 0.5
  Rainy -> Sunny : 0.5`);
    expect(ast.title).toBe("Weather");
    expect(ast.states.map((s) => s.id)).toEqual(["Sunny", "Rainy"]);
    expect(ast.transitions).toHaveLength(4);
    const self = ast.transitions.find((t) => t.from === "Sunny" && t.to === "Sunny")!;
    expect(self.self).toBe(true);
    expect(self.probability).toBeCloseTo(0.9);
  });

  it("accepts the markovchain alias", () => {
    const ast = parseMarkov(`markovchain
  A -> B : 1`);
    expect(ast.type).toBe("markov");
    expect(ast.states.map((s) => s.id)).toEqual(["A", "B"]);
  });

  it("auto-creates states from first arc mention", () => {
    const ast = parseMarkov(`markov
  A -> B : 0.5
  A -> C : 0.5
  B -> A : 1
  C -> C : 1`);
    expect(ast.states.map((s) => s.id).sort()).toEqual(["A", "B", "C"]);
  });

  it("parses labels and the absorbing assertion on state decls", () => {
    const ast = parseMarkov(`markov
  state Broke "no money" absorbing
  state One
  One -> Broke : 1`);
    const broke = ast.states.find((s) => s.id === "Broke")!;
    expect(broke.label).toBe("no money");
    expect(broke.declaredAbsorbing).toBe(true);
  });

  it("parses directives: layout, normalize, analysis", () => {
    const ast = parseMarkov(`markov
  layout: layered
  normalize: true
  analysis: classify, absorbing
  A -> A : 1`);
    expect(ast.layout).toBe("layered");
    expect(ast.normalize).toBe(true);
    expect(ast.analysis.classify).toBe(true);
    expect(ast.analysis.absorbing).toBe(true);
    expect(ast.analysis.stationary).toBe(false);
  });

  it("rejects a probability outside [0,1]", () => {
    expect(() => parseMarkov(`markov\n  A -> B : 1.5`)).toThrow(MarkovParseError);
  });

  it("rejects a transition without a probability", () => {
    expect(() => parseMarkov(`markov\n  A -> B`)).toThrow(MarkovParseError);
  });

  it("rejects an empty chain", () => {
    expect(() => parseMarkov(`markov`)).toThrow(MarkovParseError);
  });
});
