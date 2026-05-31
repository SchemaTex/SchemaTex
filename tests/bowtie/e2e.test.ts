/**
 * Bowtie engine e2e — parser + layout + render, per the canonical test cases
 * in docs/reference/38-BOWTIE-STANDARD.md §9.
 */
import { describe, it, expect } from "vitest";
import { parseBowtie, BowtieParseError } from "../../src/diagrams/bowtie/parser";
import { layoutBowtie, BOWTIE_CONST } from "../../src/diagrams/bowtie/layout";
import { renderBowtie } from "../../src/diagrams/bowtie/renderer";

function layout(dsl: string) {
  return layoutBowtie(parseBowtie(dsl));
}

describe("TC-1 — minimal: one threat, one consequence, one barrier each", () => {
  const dsl = `bowtie
topevent "Loss of containment"
threat "Corrosion"
  prevent "Inspection programme"
consequence "Release to atmosphere"
  mitigate "Gas detection + ESD"`;

  it("parses one threat + one consequence with one barrier each", () => {
    const ast = parseBowtie(dsl);
    expect(ast.topEvent).toBe("Loss of containment");
    expect(ast.threats).toHaveLength(1);
    expect(ast.consequences).toHaveLength(1);
    expect(ast.threats[0]!.barriers).toHaveLength(1);
    expect(ast.threats[0]!.barriers[0]!.side).toBe("prevent");
    expect(ast.consequences[0]!.barriers[0]!.side).toBe("mitigate");
  });

  it("centres the knot vertically and places one band per wing on cy", () => {
    const r = layout(dsl);
    const threat = r.boxes.find((b) => b.role === "threat")!;
    const conseq = r.boxes.find((b) => b.role === "consequence")!;
    // single band each → both lines sit on the knot centre-line.
    expect(threat.cy).toBeCloseTo(r.topEvent.cy, 1);
    expect(conseq.cy).toBeCloseTo(r.topEvent.cy, 1);
    // threat on the left, consequence on the right of the knot.
    expect(threat.cx).toBeLessThan(r.topEvent.cx);
    expect(conseq.cx).toBeGreaterThan(r.topEvent.cx);
  });

  it("desc reports 1 threat, 1 consequence, 2 barriers", () => {
    const svg = renderBowtie(dsl);
    expect(svg).toContain('data-diagram-type="bowtie"');
    expect(svg).toMatch(/1 threat, 1 consequence, 2 barriers/);
  });
});

describe("TC-2 — multi-threat, multi-consequence (the symmetric fan)", () => {
  const dsl = `bowtie "LPG — loss of containment"
hazard "LPG stored under pressure"
topevent "Loss of containment"
threat "Corrosion"
  prevent "UT inspection"
threat "Overpressure"
  prevent "High-pressure trip"
threat "Vehicle impact"
  prevent "Bollards"
consequence "Jet fire"
  mitigate "Deluge"
consequence "Vapour cloud explosion"
  mitigate "Ignition-source control"`;

  it("stacks 3 threat bands and 2 consequence bands, each centred on cy", () => {
    const r = layout(dsl);
    const threats = r.boxes.filter((b) => b.role === "threat");
    const conseqs = r.boxes.filter((b) => b.role === "consequence");
    expect(threats).toHaveLength(3);
    expect(conseqs).toHaveLength(2);
    // each wing's band centre-lines average to the knot centre (centred about cy).
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(threats.map((b) => b.cy))).toBeCloseTo(r.topEvent.cy, 0);
    expect(avg(conseqs.map((b) => b.cy))).toBeCloseTo(r.topEvent.cy, 0);
  });

  it("renders the hazard header above the knot with a tie-line", () => {
    const r = layout(dsl);
    const hazard = r.boxes.find((b) => b.role === "hazard")!;
    expect(hazard.cy).toBeLessThan(r.topEvent.cy - r.topEvent.r);
    expect(r.hazardTie).toBeDefined();
  });
});

describe("TC-3 — barrier chain ≥ 2 (defence in depth)", () => {
  const dsl = `bowtie
topevent "Person falls from height"
threat "Guardrail removed for access"
  prevent "Permit-to-work system"
  prevent "Temporary edge protection"
  prevent "Spotter / banksman"
consequence "Fatality"
  mitigate "Fall-arrest harness"
  mitigate "Rescue plan + first aid"`;

  it("orders preventative barriers outer→inner with data-order 0/1/2", () => {
    const ast = parseBowtie(dsl);
    const b = ast.threats[0]!.barriers;
    expect(b.map((x) => x.label)).toEqual([
      "Permit-to-work system",
      "Temporary edge protection",
      "Spotter / banksman",
    ]);
  });

  it("steps barriers left of the knot by WING_X_STEP; innermost nearest the knot", () => {
    const r = layout(dsl);
    const bars = r.boxes
      .filter((b) => b.role === "barrier" && b.side === "prevent")
      .sort((a, b) => a.order! - b.order!);
    // order 0 (outermost) is furthest left; order 2 (innermost) closest to knot.
    expect(bars[0]!.cx).toBeLessThan(bars[1]!.cx);
    expect(bars[1]!.cx).toBeLessThan(bars[2]!.cx);
    expect(bars[2]!.cx).toBeLessThan(r.topEvent.cx);
    // consistent x-pitch.
    expect(bars[1]!.cx - bars[0]!.cx).toBeCloseTo(BOWTIE_CONST.WING_X_STEP, 1);
  });
});

describe("TC-4 — escalation factor with its own barrier", () => {
  const dsl = `bowtie
topevent "Loss of containment"
threat "Corrosion"
  prevent "UT thickness inspection"
    escalation "Inspection interval too long"
      barrier "Risk-based inspection scheme"
consequence "Release"
  mitigate "Gas detection"`;

  it("attaches the escalation to its barrier and an ef-barrier below it", () => {
    const ast = parseBowtie(dsl);
    const bar = ast.threats[0]!.barriers[0]!;
    expect(bar.escalations).toHaveLength(1);
    expect(bar.escalations[0]!.label).toBe("Inspection interval too long");
    expect(bar.escalations[0]!.barriers[0]!.label).toBe("Risk-based inspection scheme");
  });

  it("drops the escalation below the barrier with a degrades-connector", () => {
    const r = layout(dsl);
    const bar = r.boxes.find((b) => b.role === "barrier" && b.side === "prevent")!;
    const esc = r.boxes.find((b) => b.role === "escalation")!;
    const ef = r.boxes.find((b) => b.role === "ef-barrier")!;
    expect(esc.cy).toBeGreaterThan(bar.cy);
    expect(ef.cy).toBeGreaterThan(esc.cy);
    expect(esc.barrierId).toBe(bar.id);
    expect(r.escalationLines.length).toBeGreaterThanOrEqual(2);
    // escalation sits directly below its barrier (same x).
    expect(esc.cx).toBeCloseTo(bar.cx, 1);
  });
});

describe("TC-5 — validation failures (the barrier rule set)", () => {
  it("rejects a threat with no preventative barrier", () => {
    const dsl = `bowtie
topevent "Loss of containment"
threat "Corrosion"
consequence "Release"
  mitigate "Gas detection"`;
    expect(() => parseBowtie(dsl)).toThrow(BowtieParseError);
    expect(() => parseBowtie(dsl)).toThrow(/Corrosion.*no preventative barrier/);
  });

  it("rejects a consequence with no mitigative barrier", () => {
    const dsl = `bowtie
topevent "T"
threat "X"
  prevent "B"
consequence "Release"`;
    expect(() => parseBowtie(dsl)).toThrow(/Release.*no mitigative barrier/);
  });

  it("rejects an escalation not attached to a barrier", () => {
    const dsl = `bowtie
topevent "T"
escalation "floating"
threat "X"
  prevent "B"
consequence "C"
  mitigate "M"`;
    expect(() => parseBowtie(dsl)).toThrow(/not attached to a barrier/);
  });

  it("rejects zero / multiple top events and one-wing diagrams", () => {
    expect(() => parseBowtie(`bowtie\nthreat "X"\n  prevent "B"\nconsequence "C"\n  mitigate "M"`))
      .toThrow(/exactly one top event/);
    expect(() => parseBowtie(`bowtie\ntopevent "A"\ntopevent "B"\nthreat "X"\n  prevent "B"\nconsequence "C"\n  mitigate "M"`))
      .toThrow(/exactly one top event/);
    expect(() => parseBowtie(`bowtie\ntopevent "T"\nconsequence "C"\n  mitigate "M"`))
      .toThrow(/at least one threat/);
    expect(() => parseBowtie(`bowtie\ntopevent "T"\nthreat "X"\n  prevent "B"`))
      .toThrow(/at least one consequence/);
  });
});

describe("determinism + CJK quotes", () => {
  it("produces byte-identical SVG across runs", () => {
    const dsl = `bowtie "X"\ntopevent "T"\nthreat "A"\n  prevent "B"\nconsequence "C"\n  mitigate "M"`;
    expect(renderBowtie(dsl)).toBe(renderBowtie(dsl));
  });

  it("accepts CJK corner quotes", () => {
    const ast = parseBowtie(`bowtie\ntopevent 「失control」\nthreat 「腐蚀」\n  prevent 「检查」\nconsequence 「泄漏」\n  mitigate 「探测」`);
    expect(ast.topEvent).toBe("失control");
    expect(ast.threats[0]!.label).toBe("腐蚀");
  });
});
