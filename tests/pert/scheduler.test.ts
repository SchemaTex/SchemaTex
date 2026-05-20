import { describe, expect, it } from "vitest";
import { parsePert } from "../../src/diagrams/pert/parser";
import { schedulePert, PertScheduleError } from "../../src/diagrams/pert/scheduler";

function sched(dsl: string) {
  return schedulePert(parsePert(dsl));
}

describe("pert scheduler — forward / backward pass", () => {
  it("solves a five-task linear chain (§10.1)", () => {
    const r = sched(`pert
unit: days
task A "A" duration: 3
task B "B" duration: 5 after: A
task C "C" duration: 2 after: B
task D "D" duration: 4 after: C
task E "E" duration: 1 after: D`);
    expect(r.projectDuration).toBe(15);
    const es = (id: string) => r.computed.get(id)!.es;
    expect([es("A"), es("B"), es("C"), es("D"), es("E")]).toEqual([0, 3, 8, 10, 14]);
    // every task critical, zero slack
    for (const id of ["A", "B", "C", "D", "E"]) {
      expect(r.computed.get(id)!.slack).toBe(0);
      expect(r.computed.get(id)!.critical).toBe(true);
    }
    expect(r.criticalPath).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("solves the diamond network (§10.2 / §12)", () => {
    const r = sched(`pert
task A "Start" duration: 2
task B "Upper" duration: 6 after: A
task C "Lower" duration: 3 after: A
task D "Finish" duration: 4 after: B, C`);
    expect(r.projectDuration).toBe(12);
    const c = (id: string) => r.computed.get(id)!;
    expect(c("A")).toMatchObject({ es: 0, ef: 2, ls: 0, lf: 2, slack: 0, critical: true });
    expect(c("B")).toMatchObject({ es: 2, ef: 8, ls: 2, lf: 8, slack: 0, critical: true });
    expect(c("C")).toMatchObject({ es: 2, ef: 5, ls: 5, lf: 8, slack: 3, critical: false });
    expect(c("D")).toMatchObject({ es: 8, ef: 12, ls: 8, lf: 12, slack: 0, critical: true });
    expect(r.criticalPath).toEqual(["A", "B", "D"]);
  });

  it("solves the Kerzner nine-task network (§10.3)", () => {
    const r = sched(`pert
unit: weeks
task A "A" duration: 2
task B "B" duration: 3 after: A
task C "C" duration: 4 after: A
task D "D" duration: 6 after: B
task E "E" duration: 2 after: B, C
task F "F" duration: 3 after: D, E
task G "G" duration: 5 after: C
task H "H" duration: 1 after: F, G
task I "I" duration: 2 after: H`);
    expect(r.projectDuration).toBe(17);
    expect(r.criticalPath).toEqual(["A", "B", "D", "F", "H", "I"]);
    // off-critical slacks (computed values for this exact network)
    expect(r.computed.get("C")!.slack).toBe(3);
    expect(r.computed.get("E")!.slack).toBe(3);
    expect(r.computed.get("G")!.slack).toBe(3);
  });

  it("handles three-point estimation + project variance (§10.4)", () => {
    const r = sched(`pert
unit: days
critical-tolerance: 0.01
task A "Spec"   duration: 2/3/5
task B "Build"  duration: 5/8/14 after: A
task C "Test"   duration: 3/4/6  after: B
task D "Deploy" duration: 1/2/3  after: C`);
    expect(r.projectDuration).toBeCloseTo(17.833, 2);
    expect(r.projectVariance).toBeCloseTo(2.861, 2);
    expect(r.projectStdDev).toBeCloseTo(1.691, 2);
    for (const id of ["A", "B", "C", "D"]) {
      expect(r.computed.get(id)!.critical).toBe(true);
    }
  });
});

describe("pert scheduler — PDM dependency types", () => {
  it("start-to-start with lag advances the successor by the lag only", () => {
    const r = sched(`pert
task A "A" duration: 5
task B "B" duration: 6 after: A SS+1`);
    expect(r.computed.get("B")!.es).toBe(1); // ES(A)+1
    expect(r.computed.get("B")!.ef).toBe(7);
  });

  it("finish-to-finish ties the successor's finish to the predecessor's", () => {
    const r = sched(`pert
task A "A" duration: 10
task B "B" duration: 3 after: A FF`);
    // EF(B) constrained to EF(A)=10 → ES(B)=7
    expect(r.computed.get("B")!.ef).toBe(10);
    expect(r.computed.get("B")!.es).toBe(7);
  });

  it("finish-to-start lag postpones the successor", () => {
    const r = sched(`pert
task A "A" duration: 5
task B "B" duration: 4 after: A+3`);
    expect(r.computed.get("B")!.es).toBe(8); // EF(A)=5 + lag 3
  });
});

describe("pert scheduler — validation", () => {
  it("detects dependency cycles", () => {
    const ast = parsePert(`pert
task A "A" duration: 2 after: C
task B "B" duration: 2 after: A
task C "C" duration: 2 after: B`);
    expect(() => schedulePert(ast)).toThrow(PertScheduleError);
  });

  it("uses max EF over terminal tasks for project duration", () => {
    // Two independent terminal chains of different length.
    const r = sched(`pert
task A "A" duration: 4
task B "B" duration: 9`);
    expect(r.projectDuration).toBe(9);
  });
});
