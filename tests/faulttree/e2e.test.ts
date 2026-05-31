import { describe, expect, it } from "vitest";
import { render, parse } from "../../src/core/api";
import { analyseFaultTree } from "../../src/diagrams/faulttree";
import type { FaultTreeAst } from "../../src/diagrams/faulttree/types";

const cutSetKeys = (ast: FaultTreeAst) =>
  analyseFaultTree(ast).cutSets.map((c) => c.events.join(",")).sort();

describe("faulttree e2e — via public api", () => {
  it("auto-detects the faulttree diagram type", () => {
    const svg = render(`faulttree "Both pumps fail"
  top T "Both redundant pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01`);
    expect(svg).toContain('data-diagram-type="faulttree"');
    expect(svg).toContain("PA");
  });

  it("accepts the fta alias header", () => {
    const svg = render(`fta
  top T = AND(A, B)
  basic A
  basic B`);
    expect(svg).toContain('data-diagram-type="faulttree"');
  });

  // ── TC-1 — minimal AND-only tree ──
  it("TC-1: AND tree has a single order-2 cut set, no SPOF", () => {
    const ast = parse(`faulttree "Both pumps fail"
  analysis: cutsets, probability
  top T "Both redundant pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01`) as FaultTreeAst;
    const a = analyseFaultTree(ast);
    expect(a.cutSets).toHaveLength(1);
    expect(a.cutSets[0]!.events).toEqual(["PA", "PB"]);
    expect(a.cutSets[0]!.order).toBe(2);
    expect(a.cutSets.some((c) => c.isSpof)).toBe(false);
    expect(a.topProb).toBeCloseTo(1e-4, 12);
  });

  // ── TC-2 — OR tree: three SPOFs ──
  it("TC-2: OR tree yields three order-1 cut sets (SPOFs)", () => {
    const ast = parse(`faulttree "Engine stops"
  analysis: cutsets, probability
  top T "Engine stops" = OR(FUEL, IGN, SEIZE)
  basic FUEL  "Fuel starvation"   p: 0.002
  basic IGN   "Ignition failure"  p: 0.003
  basic SEIZE "Mechanical seizure" p: 0.0005`) as FaultTreeAst;
    const a = analyseFaultTree(ast);
    expect(cutSetKeys(ast)).toEqual(["FUEL", "IGN", "SEIZE"]);
    expect(a.cutSets.every((c) => c.isSpof)).toBe(true);
    expect(a.topProb).toBeCloseTo(0.0055, 9); // rare-event
  });

  it("TC-2: MCUB is slightly below the rare-event sum", () => {
    const ast = parse(`faulttree "Engine stops"
  analysis: cutsets, probability
  prob: mcub
  top T "Engine stops" = OR(FUEL, IGN, SEIZE)
  basic FUEL  p: 0.002
  basic IGN   p: 0.003
  basic SEIZE p: 0.0005`) as FaultTreeAst;
    const a = analyseFaultTree(ast);
    expect(a.topProb).toBeCloseTo(1 - 0.998 * 0.997 * 0.9995, 9);
    expect(a.topProb!).toBeLessThan(0.0055);
  });

  // ── TC-3 — shared/repeated basic event + absorption ──
  it("TC-3: absorption removes supersets of a repeated event", () => {
    const ast = parse(`faulttree "Product not removed"
  analysis: cutsets, probability
  top T  "Failure to remove product" = OR(G1, G2)
  gate G1 "Arm jams or collides"     = AND(MSF, G3)
  gate G2 "Wrong slot commanded"     = OR(CDM, MSF)
  gate G3 "Loss of position feedback"= OR(ESF, RCF)
  basic MSF "Manipulator system failure" p: 0.0035
  basic CDM "Controller command error"   p: 0.0009
  basic ESF "Encoder sensor failure"     p: 0.0021
  basic RCF "Resolver cable fault"       p: 0.0012`) as FaultTreeAst;
    // {MSF,ESF} and {MSF,RCF} are absorbed by {MSF}; only {MSF},{CDM} survive.
    expect(cutSetKeys(ast)).toEqual(["CDM", "MSF"]);
    const a = analyseFaultTree(ast);
    expect(a.cutSets.every((c) => c.isSpof)).toBe(true);
    expect(a.topProb).toBeCloseTo(0.0044, 9);
  });

  // ── TC-4 — voting + inhibit + house + undeveloped ──
  it("TC-4: house=1 absorbs the condition; voting 2/2 = AND", () => {
    const ast = parse(`faulttree "Vessel ruptures"
  analysis: cutsets, probability
  prob: mcub
  top TOP "Pressure vessel ruptures" = AND(OVP, RELIEF)
  gate OVP    "Sustained over-pressure" = INHIBIT(PUMP) if HEATER
  gate RELIEF "Both reliefs fail"        = VOTING(2/2; PRV_A, PRV_B)
  basic PUMP  "Pump runaway"   p: 0.004
  basic PRV_A "Relief A stuck" p: 0.02
  basic PRV_B "Relief B stuck" p: 0.02
  house HEATER "Heater energised" state: 1
  undeveloped EXT "External fire (not modelled)"`) as FaultTreeAst;
    expect(cutSetKeys(ast)).toEqual(["PRV_A,PRV_B,PUMP"]);
    const a = analyseFaultTree(ast);
    expect(a.cutSets[0]!.order).toBe(3);
    // EXT is declared but unconnected → noted.
    expect(a.notes.some((n) => /EXT/.test(n))).toBe(true);
  });

  it("TC-4 negative: house=0 makes the top unsatisfiable", () => {
    const ast = parse(`faulttree "Vessel ruptures"
  top TOP "Ruptures" = AND(OVP, RELIEF)
  gate OVP    = INHIBIT(PUMP) if HEATER
  gate RELIEF = VOTING(2/2; PRV_A, PRV_B)
  basic PUMP  p: 0.004
  basic PRV_A p: 0.02
  basic PRV_B p: 0.02
  house HEATER state: 0`) as FaultTreeAst;
    const a = analyseFaultTree(ast);
    expect(a.unsatisfiable).toBe(true);
    expect(a.cutSets).toHaveLength(0);
  });

  // ── TC-5 — exact vs rare with a shared event ──
  it("TC-5: exact inclusion-exclusion handles the shared event", () => {
    const dsl = `faulttree "Safety function fails on demand"
  analysis: cutsets, probability
  prob: exact
  top T "Safety function fails" = OR(C1, C2)
  gate C1 "Channel 1 path" = AND(S1, L1)
  gate C2 "Channel 2 path" = AND(S2, L1)
  basic S1 "Sensor 1 fails" p: 0.05
  basic S2 "Sensor 2 fails" p: 0.05
  basic L1 "Shared logic solver fails" p: 0.05`;
    const ast = parse(dsl) as FaultTreeAst;
    expect(cutSetKeys(ast)).toEqual(["L1,S1", "L1,S2"]);
    const a = analyseFaultTree(ast);
    // exact = 0.005 − P(S1)P(S2)P(L1) = 0.005 − 0.000125 = 0.004875
    expect(a.topProb).toBeCloseTo(0.004875, 9);

    // rare-event over-counts the shared L1 → 0.005
    const rareAst = parse(dsl.replace("prob: exact", "prob: rare")) as FaultTreeAst;
    expect(analyseFaultTree(rareAst).topProb).toBeCloseTo(0.005, 9);
  });

  // ── validation ──
  it("rejects zero / multiple top events", () => {
    expect(() => parse(`faulttree
  gate G = AND(A, B)
  basic A
  basic B`)).toThrow(/exactly one 'top'/i);
    expect(() => parse(`faulttree
  top T1 = AND(A, B)
  top T2 = OR(A, B)
  basic A
  basic B`)).toThrow(/exactly one/i);
  });

  it("rejects an undefined reference with a readable error", () => {
    expect(() => parse(`faulttree
  top T = OR(A, XSF)
  basic A p: 0.1`)).toThrow(/references undefined event 'XSF'/);
  });

  it("rejects a cycle", () => {
    expect(() => parse(`faulttree
  top T = OR(G1)
  gate G1 = AND(G2, A)
  gate G2 = OR(G1, B)
  basic A
  basic B`)).toThrow(/cycle detected/i);
  });

  it("rejects out-of-range probability and bad voting bounds", () => {
    expect(() => parse(`faulttree
  top T = OR(A)
  basic A p: 1.5`)).toThrow(/outside \[0, 1\]/);
    expect(() => parse(`faulttree
  top T = VOTING(3/2; A, B)
  basic A
  basic B`)).toThrow(/1 ≤ k ≤ n/);
    expect(() => parse(`faulttree
  top T = VOTING(2/3; A, B)
  basic A
  basic B`)).toThrow(/must equal the number of inputs/);
  });

  it("is deterministic — same input → same output", () => {
    const dsl = `faulttree "X"
  top T = AND(A, B)
  basic A p: 0.1
  basic B p: 0.2`;
    expect(render(dsl)).toBe(render(dsl));
  });
});
