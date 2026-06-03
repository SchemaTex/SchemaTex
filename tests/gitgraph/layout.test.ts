import { describe, expect, it } from "vitest";
import { parseGitGraph } from "../../src/diagrams/gitgraph/parser";
import { replayGitGraph, layoutGitGraph, GITGRAPH_CONST } from "../../src/diagrams/gitgraph/layout";

const layoutOf = (dsl: string) => layoutGitGraph(parseGitGraph(dsl));
const replayOf = (dsl: string) => replayGitGraph(parseGitGraph(dsl));

describe("gitgraph replay (DAG construction)", () => {
  it("wires commit parents along the current branch tip", () => {
    const r = replayOf(`gitGraph
  commit id: "a"
  commit id: "b"
  commit id: "c"`);
    expect(r.commits.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(r.commits[0].parents).toEqual([]);
    expect(r.commits[1].parents).toEqual(["a"]);
    expect(r.commits[2].parents).toEqual(["b"]);
  });

  it("auto-generates n-<hash> ids when id: is omitted", () => {
    const r = replayOf(`gitGraph
  commit
  commit`);
    expect(r.commits[0].id).toMatch(/^1-[0-9a-f]{7}$/);
    expect(r.commits[1].id).toMatch(/^2-[0-9a-f]{7}$/);
  });

  it("branch + checkout puts commits on the right branch", () => {
    const r = replayOf(`gitGraph
  commit id: "m1"
  branch dev
  commit id: "d1"
  checkout main
  commit id: "m2"`);
    const byId = new Map(r.commits.map((c) => [c.id, c]));
    expect(byId.get("m1")!.branch).toBe("main");
    expect(byId.get("d1")!.branch).toBe("dev");
    expect(byId.get("m2")!.branch).toBe("main");
    // dev forks from m1; d1's parent is the tip at branch time.
    expect(byId.get("d1")!.parents).toEqual(["m1"]);
    // m2 continues main from m1 (not from the dev commit).
    expect(byId.get("m2")!.parents).toEqual(["m1"]);
  });

  it("a merge commit has two parents and records the merged tip", () => {
    const r = replayOf(`gitGraph
  commit id: "m1"
  branch dev
  commit id: "d1"
  checkout main
  merge dev id: "mc"`);
    const byId = new Map(r.commits.map((c) => [c.id, c]));
    const mc = byId.get("mc")!;
    expect(mc.isMerge).toBe(true);
    expect(mc.branch).toBe("main");
    expect(mc.parents).toEqual(["m1", "d1"]);
    expect(mc.mergedFrom).toBe("d1");
  });
});

describe("gitgraph lane assignment", () => {
  it("main is lane 0, branches fill lanes by first appearance", () => {
    const r = replayOf(`gitGraph
  commit
  branch dev
  commit
  checkout main
  branch feat
  commit`);
    const lanes = new Map(r.branches.map((b) => [b.name, b.lane]));
    expect(lanes.get("main")).toBe(0);
    expect(lanes.get("dev")).toBe(1);
    expect(lanes.get("feat")).toBe(2);
  });

  it("honours order: overrides ahead of appearance", () => {
    const r = replayOf(`gitGraph
  commit
  branch a order: 5
  commit
  checkout main
  branch b order: 2
  commit`);
    const lanes = new Map(r.branches.map((b) => [b.name, b.lane]));
    // main(order 0) < b(order 2) < a(order 5)
    expect(lanes.get("main")).toBe(0);
    expect(lanes.get("b")).toBe(1);
    expect(lanes.get("a")).toBe(2);
  });
});

describe("gitgraph geometry", () => {
  it("places each commit on its branch lane (cross axis distinct per lane)", () => {
    const layout = layoutOf(`gitGraph
  commit id: "m1"
  branch dev
  commit id: "d1"`);
    const m1 = layout.commits.find((c) => c.node.id === "m1")!;
    const d1 = layout.commits.find((c) => c.node.id === "d1")!;
    // LR: lanes differ in y.
    expect(m1.y).not.toBe(d1.y);
    expect(d1.y - m1.y).toBeCloseTo(GITGRAPH_CONST.LANE_GAP, 5);
    // time advances in x.
    expect(d1.x).toBeGreaterThan(m1.x);
  });

  it("steps commits monotonically along the time axis (LR → x)", () => {
    const layout = layoutOf(`gitGraph
  commit
  commit
  commit`);
    const xs = layout.commits.map((c) => c.x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]!);
  });

  it("emits a merge-kind edge joining the two lanes", () => {
    const layout = layoutOf(`gitGraph
  commit id: "m1"
  branch dev
  commit id: "d1"
  checkout main
  merge dev id: "mc"`);
    const mergeEdges = layout.edges.filter((e) => e.kind === "merge");
    expect(mergeEdges).toHaveLength(1);
    const me = mergeEdges[0]!;
    // merge edge connects the dev tip (d1) into the merge commit (mc).
    const d1 = layout.commits.find((c) => c.node.id === "d1")!;
    const mc = layout.commits.find((c) => c.node.id === "mc")!;
    expect(me.fromX).toBeCloseTo(d1.x, 5);
    expect(me.fromY).toBeCloseTo(d1.y, 5);
    expect(me.toX).toBeCloseTo(mc.x, 5);
    expect(me.toY).toBeCloseTo(mc.y, 5);
    // merge curve takes the merged (dev) lane colour.
    expect(me.colorIndex).toBe(d1.colorIndex);
  });

  it("emits an elbow edge at branch divergence", () => {
    const layout = layoutOf(`gitGraph
  commit id: "m1"
  branch dev
  commit id: "d1"`);
    const elbows = layout.edges.filter((e) => e.kind === "elbow");
    expect(elbows).toHaveLength(1);
  });

  it("rotates the whole composition for TB (time → y)", () => {
    const layout = layoutOf(`gitGraph TB:
  commit id: "a"
  commit id: "b"`);
    const a = layout.commits.find((c) => c.node.id === "a")!;
    const b = layout.commits.find((c) => c.node.id === "b")!;
    expect(b.y).toBeGreaterThan(a.y); // time advances downward
    expect(a.x).toBeCloseTo(b.x, 5); // same lane → same x
  });
});

describe("gitgraph validation", () => {
  it("rejects checkout of an undeclared branch", () => {
    expect(() => replayOf("gitGraph\n checkout ghost")).toThrow(/undeclared branch 'ghost'/);
  });

  it("rejects merge of an undeclared branch", () => {
    expect(() => replayOf("gitGraph\n commit\n merge ghost")).toThrow(/undeclared branch 'ghost'/);
  });

  it("rejects a duplicate commit id", () => {
    expect(() => replayOf('gitGraph\n commit id: "x"\n commit id: "x"')).toThrow(/duplicate commit id 'x'/);
  });

  it("rejects merging a branch into itself", () => {
    expect(() => replayOf("gitGraph\n commit\n merge main")).toThrow(/into itself/);
  });

  it("rejects cherry-pick of an unknown id", () => {
    expect(() => replayOf('gitGraph\n commit\n cherry-pick id: "nope"')).toThrow(/unknown commit id 'nope'/);
  });

  it("requires parent: when cherry-picking a merge commit", () => {
    expect(() =>
      replayOf(`gitGraph
  commit id: "m1"
  branch dev
  commit id: "d1"
  checkout main
  merge dev id: "mc"
  branch other
  cherry-pick id: "mc"`)
    ).toThrow(/requires parent/);
  });
});
