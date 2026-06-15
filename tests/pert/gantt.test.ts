import { describe, expect, it } from "vitest";
import { render, parse } from "../../src/core/api";
import { parsePert } from "../../src/diagrams/pert/parser";
import { schedulePert } from "../../src/diagrams/pert/scheduler";
import type { PertAst } from "../../src/diagrams/pert/types";

const GANTT = `gantt "Website Relaunch"
  start: 2026-07-01
  calendar: 5day
  task A "Discovery" duration: 5 lane: "Plan"
  task B "Wireframes" duration: 8 after: A lane: "Design"
  task C "Visual design" duration: 6 after: B lane: "Design" progress: 40%
  task D "Frontend build" duration: 12 after: C lane: "Build"
  task E "Backend API" duration: 10 after: A lane: "Build"
  task F "Integration" duration: 5 after: D, E lane: "Build"
  task LAUNCH "Go live" milestone after: F lane: "Build"
  today: 2026-07-20`;

describe("gantt (pert layout: gantt)", () => {
  it("the `gantt` header auto-detects as the pert engine in gantt layout", () => {
    const svg = render(`gantt\n  task A duration: 3\n  task B duration: 4 after: A`);
    expect(svg).toContain('data-diagram-type="pert"');
    expect(svg).toContain('data-layout="gantt"');
  });

  it("`pert` + `layout: gantt` produces the same gantt rendering", () => {
    const svg = render(`pert "P"\n  layout: gantt\n  task A duration: 3`);
    expect(svg).toContain('data-layout="gantt"');
  });

  it("`gantt` header sets gantt layout in the AST", () => {
    const ast = parse(GANTT) as PertAst;
    expect(ast.layout).toBe("gantt");
    expect(ast.start).toBe("2026-07-01");
    expect(ast.calendar).toBe("5day");
    expect(ast.today).toBe("2026-07-20");
  });

  it("places bars from the COMPUTED schedule (es/ef), not from typed dates", () => {
    const ast = parsePert(GANTT);
    const s = schedulePert(ast);
    // A starts at 0; B (after A, FS) starts at 5; the critical path runs A→B→C→D→F→LAUNCH.
    expect(s.computed.get("A")!.es).toBe(0);
    expect(s.computed.get("B")!.es).toBe(5);
    expect(s.criticalPath).toEqual(["A", "B", "C", "D", "F", "LAUNCH"]);
    const svg = render(GANTT);
    // Backend API (E) is off the critical path → has slack, drawn non-critical.
    expect(svg).toMatch(/data-id="E"[^>]*data-critical="false"/);
    expect(svg).toMatch(/data-id="D"[^>]*data-critical="true"/);
  });

  it("renders a milestone task as a diamond", () => {
    const svg = render(GANTT);
    expect(svg).toContain("sx-gantt-ms");
    expect(svg).toMatch(/data-id="LAUNCH"/);
  });

  it("labels the axis with calendar dates when start is given (weekday-only for 5day)", () => {
    const svg = render(GANTT);
    expect(svg).toMatch(/Jul \d/);
    // No start → numeric offset axis.
    const numeric = render(`gantt\n  task A duration: 4\n  task B duration: 4 after: A`);
    expect(numeric).not.toMatch(/Jul \d/);
    expect(numeric).toContain("sx-gantt-axis-text");
  });

  it("draws a progress overlay and a today marker", () => {
    const svg = render(GANTT);
    expect(svg).toContain("sx-gantt-done");
    expect(svg).toMatch(/data-progress="40"/);
    expect(svg).toContain("sx-gantt-today");
  });

  it("groups tasks into sections by lane", () => {
    const svg = render(GANTT);
    expect(svg).toContain("sx-gantt-section");
    expect(svg).toContain("Design");
    expect(svg).toContain("Build");
  });

  it("continuous calendar spans weekends (dates advance by calendar days)", () => {
    const ast = parse(`gantt\n  start: 2026-09-01\n  calendar: continuous\n  task A duration: 10`) as PertAst;
    expect(ast.calendar).toBe("continuous");
    const svg = render(`gantt\n  start: 2026-09-01\n  calendar: continuous\n  task A "X" duration: 10`);
    expect(svg).toContain('data-layout="gantt"');
    expect(svg).toMatch(/Sep \d/);
  });

  it("rejects a malformed start date", () => {
    expect(() => parsePert(`gantt\n  start: July 1\n  task A duration: 3`)).toThrow(/start must be a date/i);
  });

  it("is deterministic", () => {
    expect(render(GANTT)).toBe(render(GANTT));
  });

  it("no NaN in output", () => {
    expect(render(GANTT)).not.toContain("NaN");
  });
});
