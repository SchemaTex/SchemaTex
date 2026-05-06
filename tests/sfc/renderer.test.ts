import { describe, it, expect } from "vitest";
import { renderSfc } from "../../src/diagrams/sfc";

describe("SFC renderer", () => {
  it("renders linear chart with initial double border", () => {
    const svg = renderSfc(
      `sfc\nstep S0 [initial]\nstep S1\nstep S2\ntransition from: S0 to: S1: A\ntransition from: S1 to: S2: B`
    );
    expect(svg).toContain("<svg");
    expect(svg).toContain("data-diagram-type=\"sfc\"");
    expect(svg).toContain("data-step-kind=\"initial\"");
    expect(svg).toContain("lt-sfc-step-inner");  // initial step inner border
    expect(svg).toContain("lt-sfc-transition-bar");
  });

  it("renders actions with qualifiers", () => {
    const svg = renderSfc(
      `sfc\nstep S0 [initial]\nstep S1\n  N FillValve\n  D Mixer T#10s\ntransition from: S0 to: S1: Start`
    );
    expect(svg).toContain("FillValve");
    expect(svg).toContain("Mixer");
    expect(svg).toContain("T#10s");
    expect(svg).toContain("data-qualifier=\"N\"");
    expect(svg).toContain("data-qualifier=\"D\"");
  });

  it("renders alt branches with bars", () => {
    const svg = renderSfc(`sfc
step S0 [initial]
step S1
alt from: S1:
  branch:
    transition: A
    step Sa
    transition: TRUE
  branch:
    transition: B
    step Sb
    transition: TRUE
merge_to: S2
step S2
transition from: S0 to: S1: TRUE`);
    expect(svg).toContain("lt-sfc-branch-bar");
    expect(svg).toContain("data-step-id=\"Sa\"");
    expect(svg).toContain("data-step-id=\"Sb\"");
  });

  it("renders sim branches with double bars", () => {
    const svg = renderSfc(`sfc
step S0 [initial]
step S1
sim from: S1: TRUE
  branch:
    step Sa
  branch:
    step Sb
merge_to: S2: AllDone
step S2
transition from: S0 to: S1: Go`);
    expect(svg).toContain("data-step-id=\"Sa\"");
    expect(svg).toContain("data-step-id=\"Sb\"");
    // Two parallel bars at div + two at conv = at least 4 branch-bar lines
    const matches = svg.match(/lt-sfc-branch-bar/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(4);
  });
});
