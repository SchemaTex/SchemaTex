import { describe, expect, it } from "vitest";
import { parsePert, PertParseError } from "../../src/diagrams/pert/parser";

describe("pert parser — header", () => {
  it("parses header keys and inline title", () => {
    const ast = parsePert(`pert
title: "Q3 Launch"
unit: weeks
direction: TB
layout: timescaled
critical-tolerance: 0.001
show-sentinels: true
task A "A" duration: 1`);
    expect(ast.title).toBe("Q3 Launch");
    expect(ast.unit).toBe("weeks");
    expect(ast.direction).toBe("TB");
    expect(ast.layout).toBe("timescaled");
    expect(ast.criticalTolerance).toBe(0.001);
    expect(ast.showSentinels).toBe(true);
  });

  it("defaults unit=days, direction=LR, layout=network", () => {
    const ast = parsePert(`pert\ntask A "A" duration: 1`);
    expect(ast.unit).toBe("days");
    expect(ast.direction).toBe("LR");
    expect(ast.layout).toBe("network");
  });

  it("rejects a non-pert first line", () => {
    expect(() => parsePert(`flowchart\nA --> B`)).toThrow(PertParseError);
  });
});

describe("pert parser — task lines", () => {
  it("parses a deterministic task with predecessors", () => {
    const ast = parsePert(`pert
task A "Market research" duration: 5
task B "Design" duration: 8 after: A`);
    const a = ast.tasks[0];
    expect(a.id).toBe("A");
    expect(a.label).toBe("Market research");
    expect(a.duration).toBe(5);
    expect(a.milestone).toBe(false);
    const b = ast.tasks[1];
    expect(b.deps).toEqual([{ pred: "A", type: "FS", lag: 0 }]);
  });

  it("parses three-point durations into te + variance", () => {
    const ast = parsePert(`pert\ntask H "Beta" duration: 4/6/10`);
    const h = ast.tasks[0];
    expect(h.duration).toBeCloseTo(6.333, 2);
    expect(h.threePoint).toEqual({ o: 4, m: 6, p: 10 });
    expect(h.variance).toBeCloseTo(1.0, 5);
  });

  it("parses all PDM dependency forms", () => {
    const ast = parsePert(`pert
task A "A" duration: 5
task B "B" duration: 5
task C "C" duration: 3 after: A+3, B SS-1`);
    expect(ast.tasks[2].deps).toEqual([
      { pred: "A", type: "FS", lag: 3 },
      { pred: "B", type: "SS", lag: -1 },
    ]);
  });

  it("treats duration:0 and the milestone flag as milestones", () => {
    const ast = parsePert(`pert
task A "A" duration: 5
task M0 "Kickoff" milestone
task M1 "Go-live" duration: 0 after: A`);
    expect(ast.tasks[1].milestone).toBe(true);
    expect(ast.tasks[1].duration).toBe(0);
    expect(ast.tasks[2].milestone).toBe(true);
  });

  it("parses tags, class, and lane", () => {
    const ast = parsePert(`pert
task X "Vendor" duration: 10 tags: vendor, external class: secondary lane: "Procurement"`);
    expect(ast.tasks[0].tags).toEqual(["vendor", "external"]);
    expect(ast.tasks[0].className).toBe("secondary");
    expect(ast.tasks[0].lane).toBe("Procurement");
  });

  it("allows forward references", () => {
    const ast = parsePert(`pert
task B "B" duration: 2 after: A
task A "A" duration: 3`);
    expect(ast.tasks[0].deps[0].pred).toBe("A");
  });
});

describe("pert parser — validation", () => {
  it("rejects duplicate task ids", () => {
    expect(() => parsePert(`pert\ntask A "A" duration: 1\ntask A "B" duration: 2`)).toThrow(/duplicate/);
  });

  it("rejects undeclared predecessors", () => {
    expect(() => parsePert(`pert\ntask A "A" duration: 1 after: Z`)).toThrow(/undeclared/);
  });

  it("rejects self-loops", () => {
    expect(() => parsePert(`pert\ntask A "A" duration: 1 after: A`)).toThrow(/itself/);
  });

  it("rejects out-of-order three-point estimates", () => {
    expect(() => parsePert(`pert\ntask A "A" duration: 5/3/8`)).toThrow(/O ≤ M ≤ P/);
  });

  it("requires a duration for non-milestone tasks", () => {
    expect(() => parsePert(`pert\ntask A "A"`)).toThrow(/missing 'duration:'/);
  });

  it("rejects a lag unit that mismatches the diagram unit", () => {
    expect(() => parsePert(`pert\nunit: days\ntask A "A" duration: 5\ntask B "B" duration: 2 after: A FS+1w`)).toThrow(/does not match/);
  });

  it("rejects a duplicate unit declaration", () => {
    expect(() => parsePert(`pert\nunit: days\nunit: weeks\ntask A "A" duration: 1`)).toThrow(/more than once/);
  });
});
