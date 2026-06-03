import { describe, expect, it } from "vitest";
import { parseCausalLoop } from "../../src/diagrams/causalloop/parser";
import { analyseCausalLoop } from "../../src/diagrams/causalloop/analysis";

function analyse(dsl: string) {
  return analyseCausalLoop(parseCausalLoop(dsl));
}

describe("causalloop analysis — R/B classification (the differentiator)", () => {
  it("classifies a 0-negative loop as Reinforcing (R)", () => {
    // Bank balance: textbook minimal reinforcing loop (0 negatives).
    const a = analyse(`cld "Bank balance"
"Bank balance" -> "Interest earned" : +
"Interest earned" -> "Bank balance" : +`);
    expect(a.loops).toHaveLength(1);
    const loop = a.loops[0]!;
    expect(loop.kind).toBe("R");
    expect(loop.id).toBe("R1");
    expect(loop.negativeCount).toBe(0);
    expect(a.reinforcing).toBe(1);
    expect(a.balancing).toBe(0);
  });

  it("classifies a 1-negative loop as Balancing (B)", () => {
    // Thermostat-style: one negative link → balancing.
    const a = analyse(`cld
"Room temperature" -> "Heating" : -
"Heating" -> "Room temperature" : +`);
    expect(a.loops).toHaveLength(1);
    const loop = a.loops[0]!;
    expect(loop.kind).toBe("B");
    expect(loop.id).toBe("B1");
    expect(loop.negativeCount).toBe(1);
    expect(a.reinforcing).toBe(0);
    expect(a.balancing).toBe(1);
  });

  it("classifies a 2-negative loop as Reinforcing (even number of negatives)", () => {
    const a = analyse(`cld
A -> B : -
B -> A : -`);
    expect(a.loops[0]!.kind).toBe("R");
    expect(a.loops[0]!.negativeCount).toBe(2);
  });

  it("detects both loops in the canonical Adoption model (R1 + B1)", () => {
    const a = analyse(`cld "Adoption model"
"Adoption rate" -> Adopters : +
Adopters -> "Adoption rate" : +
"Adoption rate" -> "Potential adopters" : -
"Potential adopters" -> "Adoption rate" : +`);
    expect(a.loops).toHaveLength(2);
    const byKind = a.loops.map((l) => l.kind).sort();
    expect(byKind).toEqual(["B", "R"]);
    const r = a.loops.find((l) => l.kind === "R")!;
    const b = a.loops.find((l) => l.kind === "B")!;
    expect(r.negativeCount).toBe(0); // Word of mouth
    expect(b.negativeCount).toBe(1); // Market saturation
    expect(r.variables).toContain("Adopters");
    expect(b.variables).toContain("Potential adopters");
    expect(a.reinforcing).toBe(1);
    expect(a.balancing).toBe(1);
  });

  it("classifies a population model: births R, deaths B", () => {
    const a = analyse(`cld "Population"
Population -> Births : +
Births -> Population : +
Population -> Deaths : +
Deaths -> Population : -`);
    const r = a.loops.find((l) => l.variables.includes("Births"))!;
    const d = a.loops.find((l) => l.variables.includes("Deaths"))!;
    expect(r.kind).toBe("R");
    expect(d.kind).toBe("B");
  });

  it("classifies a 3-link loop with odd negatives as Balancing", () => {
    const a = analyse(`cld
A -> B : +
B -> C : -
C -> A : +`);
    expect(a.loops).toHaveLength(1);
    expect(a.loops[0]!.negativeCount).toBe(1);
    expect(a.loops[0]!.kind).toBe("B");
  });

  it("numbers loops R1/B1/R2 in detection order by kind", () => {
    const a = analyse(`cld
A -> B : +
B -> A : +
C -> D : -
D -> C : +
E -> F : +
F -> E : +`);
    const ids = a.loops.map((l) => l.id).sort();
    expect(ids).toEqual(["B1", "R1", "R2"]);
  });

  it("reports variables and links that participate in no loop", () => {
    const a = analyse(`cld
A -> B : +
B -> A : +
B -> C : +`);
    expect(a.variablesInNoLoop).toEqual(["C"]);
    expect(a.linksInNoLoop).toEqual([2]); // the B -> C link
  });

  it("flags self-links and excludes them from loop detection", () => {
    const a = analyse(`cld
A -> A : +
A -> B : +
B -> A : +`);
    expect(a.selfLinks).toEqual([0]);
    expect(a.loops).toHaveLength(1);
    expect(a.notes.join(" ")).toMatch(/self-link/i);
  });

  it("handles a graph with no feedback loops", () => {
    const a = analyse(`cld
A -> B : +
B -> C : +`);
    expect(a.loops).toHaveLength(0);
    expect(a.reinforcing).toBe(0);
    expect(a.balancing).toBe(0);
  });
});
