import { describe, expect, it } from "vitest";
import { parseMarkov } from "../../src/diagrams/markov/parser";
import { layoutMarkov } from "../../src/diagrams/markov/layout";

describe("markov layout", () => {
  it("places a two-state chain side by side, deterministically", () => {
    const ast = parseMarkov(`markov
  Sunny -> Sunny : 0.9
  Sunny -> Rainy : 0.1
  Rainy -> Sunny : 0.5
  Rainy -> Rainy : 0.5`);
    const lo = layoutMarkov(ast);
    expect(lo.states).toHaveLength(2);
    const [s, r] = lo.states;
    // Same y, Rainy to the right of Sunny.
    expect(s!.cy).toBe(r!.cy);
    expect(r!.cx).toBeGreaterThan(s!.cx);
    expect(lo.width).toBeGreaterThan(0);
    expect(lo.height).toBeGreaterThan(0);
  });

  it("is deterministic — identical AST yields identical geometry", () => {
    const src = `markov
  A -> B : 0.5
  A -> C : 0.5
  B -> C : 1
  C -> A : 1`;
    const a = layoutMarkov(parseMarkov(src));
    const b = layoutMarkov(parseMarkov(src));
    expect(a.states.map((s) => [s.cx, s.cy])).toEqual(b.states.map((s) => [s.cx, s.cy]));
    expect(a.arcs.map((g) => g.points)).toEqual(b.arcs.map((g) => g.points));
  });

  it("bows bidirectional pairs apart (opposite signs)", () => {
    const ast = parseMarkov(`markov
  A -> B : 0.4
  B -> A : 0.6
  A -> A : 0.6
  B -> B : 0.4`);
    const lo = layoutMarkov(ast);
    const ab = lo.arcs.find((g) => g.transition.from === "A" && g.transition.to === "B" && !g.self)!;
    const ba = lo.arcs.find((g) => g.transition.from === "B" && g.transition.to === "A" && !g.self)!;
    // The two arc midpoints (labelX/labelY) must differ — they bow to opposite sides.
    const sameMidpoint =
      Math.abs(ab.labelX - ba.labelX) < 1e-6 && Math.abs(ab.labelY - ba.labelY) < 1e-6;
    expect(sameMidpoint).toBe(false);
  });

  it("marks self-loops as self with a 4-point loop path", () => {
    const ast = parseMarkov(`markov
  A -> A : 1`);
    const lo = layoutMarkov(ast);
    const self = lo.arcs.find((g) => g.self)!;
    expect(self).toBeDefined();
    expect(self.points).toHaveLength(4);
  });

  it("flags absorbing states for double-ring rendering", () => {
    const ast = parseMarkov(`markov
  state Stop absorbing
  state Go
  Stop -> Stop : 1
  Go -> Stop : 1`);
    const lo = layoutMarkov(ast);
    expect(lo.states.find((s) => s.state.id === "Stop")!.isAbsorbing).toBe(true);
    expect(lo.states.find((s) => s.state.id === "Go")!.isAbsorbing).toBe(false);
  });
});
