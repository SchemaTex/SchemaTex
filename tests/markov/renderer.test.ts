import { describe, expect, it } from "vitest";
import { renderMarkov } from "../../src/diagrams/markov/renderer";

describe("markov renderer — semantic SVG", () => {
  const weather = `markov "Weather"
  Sunny -> Sunny : 0.9
  Sunny -> Rainy : 0.1
  Rainy -> Sunny : 0.5
  Rainy -> Rainy : 0.5`;

  it("emits an svg with title, desc and no inline style attributes", () => {
    const svg = renderMarkov(weather);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
    // No inline style= attributes (semantic-SVG rule).
    expect(svg).not.toMatch(/\sstyle="/);
    expect(svg).toContain('data-diagram-type="markov"');
  });

  it("renders state circles and probability labels", () => {
    const svg = renderMarkov(weather);
    expect(svg).toContain("sx-markov-state");
    expect(svg).toContain("sx-markov-prob");
    expect(svg).toContain("0.9");
    expect(svg).toContain("0.1");
  });

  it("carries the computed stationary π in <desc> and as data-pi", () => {
    const svg = renderMarkov(weather);
    expect(svg).toMatch(/Stationary π/);
    expect(svg).toContain('data-pi="0.833"');
  });

  it("draws a double-ring for absorbing states", () => {
    const svg = renderMarkov(`markov
  state Stop absorbing
  state Go
  Stop -> Stop : 1
  Go -> Stop : 1`);
    expect(svg).toContain("sx-markov-absorb-ring");
    expect(svg).toContain('data-class="absorbing"');
    expect(svg).toMatch(/Absorbing: Stop/);
  });

  it("includes an arrowhead marker for directed arcs", () => {
    const svg = renderMarkov(weather);
    expect(svg).toContain("sx-markov-head");
    expect(svg).toContain("marker-end");
  });

  it("summarises absorbing-chain B and t in <desc>", () => {
    const svg = renderMarkov(`markov
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
    expect(svg).toMatch(/Expected steps to absorption/);
    expect(svg).toMatch(/Absorption probabilities/);
  });
});
