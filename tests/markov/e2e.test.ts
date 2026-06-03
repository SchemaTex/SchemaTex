import { describe, expect, it } from "vitest";
import { markov } from "../../src/diagrams/markov";

describe("markov plugin — end to end", () => {
  it("detects both header keywords", () => {
    expect(markov.detect("markov \"x\"\nA -> B : 1")).toBe(true);
    expect(markov.detect("  markovchain\nA -> B : 1")).toBe(true);
    expect(markov.detect("petri\nplace P1")).toBe(false);
  });

  it("exposes type id markov", () => {
    expect(markov.type).toBe("markov");
  });

  it("renders the canonical weather chain to a stable SVG string", () => {
    const svg = markov.render(`markov "Weather"
  Sunny -> Sunny : 0.9
  Sunny -> Rainy : 0.1
  Rainy -> Sunny : 0.5
  Rainy -> Rainy : 0.5`);
    // Stability: byte-for-byte identical across runs.
    const again = markov.render(`markov "Weather"
  Sunny -> Sunny : 0.9
  Sunny -> Rainy : 0.1
  Rainy -> Sunny : 0.5
  Rainy -> Rainy : 0.5`);
    expect(svg).toBe(again);
    expect(svg).toContain("</svg>");
  });

  it("parse() returns the AST for programmatic access", () => {
    const ast = markov.parse!(`markov\n  A -> B : 1\n  B -> A : 1`) as {
      states: Array<{ id: string }>;
    };
    expect(ast.states.map((s) => s.id)).toEqual(["A", "B"]);
  });

  it("renders an absorbing chain end-to-end without throwing", () => {
    const svg = markov.render(`markov "Gambler's ruin"
  analysis: classify, absorbing
  state Broke absorbing
  state One
  state Two
  state Rich absorbing
  Broke -> Broke : 1
  One -> Broke : 0.5
  One -> Two : 0.5
  Two -> One : 0.5
  Two -> Rich : 0.5
  Rich -> Rich : 1`);
    expect(svg).toContain("sx-markov-absorb-ring");
  });
});
