import { describe, expect, it } from "vitest";
import { parseEventTree } from "../../src/diagrams/eventtree/parser";
import { layoutEventTree } from "../../src/diagrams/eventtree/layout";

const LOCA = `eventtree "LOCA"
  initiating LOCA "Large LOCA" freq: 1e-4
  function A "ECCS injects"          p: 0.001
  function B "Containment spray"     p: 0.01
  function C "Containment integrity" p: 0.005
  outcome s s s -> "OK"
  outcome s s f -> "Late release"
  outcome s f * -> "Early release"
  outcome f * * -> "Core damage"`;

describe("eventtree layout", () => {
  it("emits one header per kind: IE, each function, Outcome, Frequency", () => {
    const l = layoutEventTree(parseEventTree(LOCA));
    const kinds = l.headers.map((h) => h.kind);
    expect(kinds.filter((k) => k === "function")).toHaveLength(3);
    expect(kinds).toContain("initiating");
    expect(kinds).toContain("outcome");
    expect(kinds).toContain("frequency");
  });

  it("places one leaf per outcome", () => {
    const l = layoutEventTree(parseEventTree(LOCA));
    expect(l.leaves).toHaveLength(4);
  });

  it("orders leaves top→bottom in declaration (success-up) order", () => {
    const l = layoutEventTree(parseEventTree(LOCA));
    const ys = l.leaves.map((leaf) => leaf.y);
    // Declaration order is all-success first (top) → first-failure last (bottom).
    for (let i = 1; i < ys.length; i++) expect(ys[i]!).toBeGreaterThan(ys[i - 1]!);
    expect(l.leaves[0]!.sequence.outcome).toBe("OK");
  });

  it("draws success legs above and failure legs below their parent (success-up)", () => {
    // A two-leaf single-fork tree: the success leaf must sit above the failure leaf.
    const l = layoutEventTree(parseEventTree(`eventtree
  initiating IE freq: 1
  function A p: 0.3
  outcome s -> "ok"
  outcome f -> "bad"`));
    const ok = l.leaves.find((x) => x.sequence.outcome === "ok")!;
    const bad = l.leaves.find((x) => x.sequence.outcome === "bad")!;
    expect(ok.y).toBeLessThan(bad.y); // success above failure
  });

  it("emits a dashed gridline per function column, aligned with the fork x", () => {
    const l = layoutEventTree(parseEventTree(LOCA));
    expect(l.gridLines).toHaveLength(3);
    // Each function header gridX must coincide with a gridline x.
    const gridXs = new Set(l.gridLines.map((g) => g.x));
    for (const h of l.headers) {
      if (h.kind === "function") expect(gridXs.has(h.gridX!)).toBe(true);
    }
  });

  it("prunes — a fully-failed early path has fewer drawn forks than a balanced tree", () => {
    const l = layoutEventTree(parseEventTree(LOCA));
    // Real fork edges (exclude the flat leaf run-outs).
    const realForks = l.forks.filter((f) => f.functionId !== "__leaf__");
    // A balanced 3-level binary tree would have 2+4+8 = 14 forks. The pruned
    // LOCA tree has far fewer (shared prefixes + early termination).
    expect(realForks.length).toBeLessThan(14);
    // Core-damage leaf (f * *) terminates after column A → its designator is "1f".
    const cd = l.leaves.find((x) => x.sequence.outcome === "Core damage")!;
    expect(cd.sequence.legs).toEqual(["f"]);
  });

  it("is deterministic — identical input yields identical geometry", () => {
    const a = layoutEventTree(parseEventTree(LOCA));
    const b = layoutEventTree(parseEventTree(LOCA));
    expect(JSON.stringify(a.leaves)).toEqual(JSON.stringify(b.leaves));
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
  });

  it("produces a positive canvas covering all content", () => {
    const l = layoutEventTree(parseEventTree(LOCA));
    expect(l.width).toBeGreaterThan(0);
    expect(l.height).toBeGreaterThan(0);
    for (const leaf of l.leaves) expect(leaf.x).toBeLessThan(l.width);
  });
});
