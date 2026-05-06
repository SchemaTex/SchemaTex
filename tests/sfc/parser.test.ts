import { describe, it, expect } from "vitest";
import { parseSfc } from "../../src/diagrams/sfc";

describe("SFC parser", () => {
  it("parses linear sequence", () => {
    const ast = parseSfc(
      `sfc\nstep S0 [initial]\nstep S1\nstep S2\ntransition from: S0 to: S1: A\ntransition from: S1 to: S2: B`
    );
    expect(ast.type).toBe("sfc");
    expect(ast.steps.size).toBe(3);
    expect(ast.steps.get("S0")?.kind).toBe("initial");
    expect(ast.transitions.length).toBe(2);
  });

  it("auto-promotes first step to initial when none marked", () => {
    const ast = parseSfc(`sfc\nstep S0\nstep S1\ntransition from: S0 to: S1: TRUE`);
    expect(ast.steps.get("S0")?.kind).toBe("initial");
  });

  it("rejects multiple initials", () => {
    expect(() => parseSfc(
      `sfc\nstep S0 [initial]\nstep S1 [initial]\ntransition from: S0 to: S1: A`
    )).toThrow(/Multiple/);
  });

  it("parses actions with qualifiers", () => {
    const ast = parseSfc(
      `sfc\nstep S0 [initial]\nstep S1\n  N FillValve\n  D Mixer T#10s\n  P Chime\ntransition from: S0 to: S1: A`
    );
    const s1 = ast.steps.get("S1")!;
    expect(s1.actions.length).toBe(3);
    expect(s1.actions[0].qualifier).toBe("N");
    expect(s1.actions[1].qualifier).toBe("D");
    expect(s1.actions[1].time).toBe("T#10s");
  });

  it("parses alt branch block", () => {
    const ast = parseSfc(`sfc
step S0 [initial]
step S1
alt from: S1:
  branch:
    transition: P
    step Sa
    transition: TRUE
  branch:
    transition: Q
    step Sb
    transition: TRUE
merge_to: S2
step S2
transition from: S0 to: S1: TRUE`);
    expect(ast.body.length).toBeGreaterThan(0);
    const altNode = ast.body.find((n) => n.kind === "alt");
    expect(altNode).toBeDefined();
    if (altNode && altNode.kind === "alt") {
      expect(altNode.branches.length).toBe(2);
      expect(altNode.mergeTo).toBe("S2");
    }
  });

  it("parses sim branch block", () => {
    const ast = parseSfc(`sfc
step S0 [initial]
step S1
sim from: S1: TRUE
  branch:
    step Sa
  branch:
    step Sb
merge_to: S2: A_done AND B_done
step S2
transition from: S0 to: S1: Trigger`);
    const simNode = ast.body.find((n) => n.kind === "sim");
    expect(simNode).toBeDefined();
    if (simNode && simNode.kind === "sim") {
      expect(simNode.branches.length).toBe(2);
      expect(simNode.condition).toBe("TRUE");
      expect(simNode.mergeCondition).toBe("A_done AND B_done");
    }
  });
});
