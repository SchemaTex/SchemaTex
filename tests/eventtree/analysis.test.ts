import { describe, expect, it } from "vitest";
import { parseEventTree } from "../../src/diagrams/eventtree/parser";
import { analyseEventTree } from "../../src/diagrams/eventtree/analysis";

/**
 * The path-frequency arithmetic is THE differentiator. These tests pin the
 * exact products: frequency = f₀ · ∏ branch probabilities, success = 1 − p.
 */
describe("eventtree analysis — path frequency arithmetic", () => {
  // ── TC-1: the canonical four-leaf pruned LOCA tree ──
  const LOCA = `eventtree "LOCA"
  initiating LOCA "Large LOCA" freq: 1e-4
  function A "ECCS injects"          p: 0.001
  function B "Containment spray"     p: 0.01
  function C "Containment integrity" p: 0.005
  outcome s s s -> "OK"
  outcome s s f -> "Late release"
  outcome s f * -> "Early release"
  outcome f * * -> "Core damage"`;

  it("computes each leaf as f₀ · ∏ branch probabilities (success = 1−p)", () => {
    const a = analyseEventTree(parseEventTree(LOCA));
    const f0 = 1e-4;
    const sA = 1 - 0.001, sB = 1 - 0.01, sC = 1 - 0.005;

    // OK = f₀·(1−pA)·(1−pB)·(1−pC)
    expect(a.sequences[0]!.frequency).toBeCloseTo(f0 * sA * sB * sC, 18);
    // Late release = f₀·(1−pA)·(1−pB)·pC
    expect(a.sequences[1]!.frequency).toBeCloseTo(f0 * sA * sB * 0.005, 18);
    // Early release = f₀·(1−pA)·pB   (C pruned → ×1)
    expect(a.sequences[2]!.frequency).toBeCloseTo(f0 * sA * 0.01, 18);
    // Core damage = f₀·pA            (B,C pruned → short-circuit)
    expect(a.sequences[3]!.frequency).toBeCloseTo(f0 * 0.001, 18);
  });

  it("records the legs/probs actually applied (pruned columns omitted)", () => {
    const a = analyseEventTree(parseEventTree(LOCA));
    expect(a.sequences[3]!.legs).toEqual(["f"]);          // only A queried
    expect(a.sequences[3]!.branchProbs).toEqual([0.001]);
    expect(a.sequences[3]!.designator).toBe("1f");
    expect(a.sequences[2]!.designator).toBe("1s 2f");
  });

  it("flags the dominant (largest-frequency) sequence", () => {
    const a = analyseEventTree(parseEventTree(LOCA));
    // Core damage f₀·0.001 = 1e-7 vs late release 1e-4·0.99·0.99·0.005 ≈ 4.9e-7.
    // The all-success OK leaf dominates at ≈ 9.85e-5.
    const dom = a.sequences.filter((s) => s.dominant);
    expect(dom).toHaveLength(1);
    expect(dom[0]!.outcome).toBe("OK");
    expect(a.dominantFrequency).toBeCloseTo(1e-4 * 0.999 * 0.99 * 0.995, 18);
  });

  // ── TC-2: outcome aggregation across multiple paths ──
  it("aggregates frequencies across paths sharing an outcome", () => {
    const ast = parseEventTree(`eventtree
  initiating IE freq: 1
  function A p: 0.5
  function B p: 0.5
  outcome s s -> "Safe"
  outcome s f -> "Damage"
  outcome f s -> "Damage"
  outcome f f -> "Damage"`);
    const a = analyseEventTree(ast);
    // Safe = 0.5·0.5 = 0.25. Damage = 0.25 + 0.25 + 0.25 = 0.75.
    const totals = Object.fromEntries(a.outcomeTotals.map((t) => [t.outcome, t.total]));
    expect(totals["Safe"]).toBeCloseTo(0.25, 12);
    expect(totals["Damage"]).toBeCloseTo(0.75, 12);
    const damage = a.outcomeTotals.find((t) => t.outcome === "Damage")!;
    expect(damage.count).toBe(3);
    // Roll-up sorted descending → Damage first.
    expect(a.outcomeTotals[0]!.outcome).toBe("Damage");
  });

  it("leaf frequencies of a complete partition sum to f₀", () => {
    const a = analyseEventTree(parseEventTree(`eventtree
  initiating IE freq: 2e-3
  function A p: 0.2
  outcome s -> "ok"
  outcome f -> "bad"`));
    expect(a.totalFrequency).toBeCloseTo(2e-3, 15);
    expect(a.notes).toHaveLength(0); // complete partition → no warning
  });

  it("notes when declared outcomes do not partition the tree", () => {
    // Only the success branch is labelled → Σ leaf freq = 0.8·f₀ ≠ f₀.
    const a = analyseEventTree(parseEventTree(`eventtree
  initiating IE freq: 1
  function A p: 0.2
  outcome s -> "ok"`));
    expect(a.totalFrequency).toBeCloseTo(0.8, 12);
    expect(a.notes.some((n) => /don't fully partition/.test(n))).toBe(true);
  });

  it("carries a per-demand f₀ of 1 through unchanged (pure probabilities)", () => {
    const a = analyseEventTree(parseEventTree(`eventtree
  initiating IE freq: 1
  function A p: 0.1
  function B p: 0.2
  outcome s s -> "ok"
  outcome s f -> "minor"
  outcome f * -> "major"`));
    expect(a.sequences[0]!.frequency).toBeCloseTo(0.9 * 0.8, 12);
    expect(a.sequences[1]!.frequency).toBeCloseTo(0.9 * 0.2, 12);
    expect(a.sequences[2]!.frequency).toBeCloseTo(0.1, 12);
  });
});
