import { describe, expect, it } from "vitest";
import { parseEventTree, EventTreeParseError } from "../../src/diagrams/eventtree/parser";

const LOCA = `eventtree "Loss of coolant accident"
  initiating LOCA "Large LOCA" freq: 1e-4
  function A "ECCS injects"          p: 0.001
  function B "Containment spray"     p: 0.01
  function C "Containment integrity" p: 0.005
  outcome s s s -> "OK"
  outcome s s f -> "Late release"
  outcome s f * -> "Early release"
  outcome f * * -> "Core damage"`;

describe("eventtree parser", () => {
  it("parses the initiating event with frequency", () => {
    const ast = parseEventTree(LOCA);
    expect(ast.type).toBe("eventtree");
    expect(ast.title).toBe("Loss of coolant accident");
    expect(ast.initiating.id).toBe("LOCA");
    expect(ast.initiating.label).toBe("Large LOCA");
    expect(ast.initiating.freq).toBe(1e-4);
  });

  it("parses functions in column order with failure probabilities", () => {
    const ast = parseEventTree(LOCA);
    expect(ast.functions.map((f) => f.id)).toEqual(["A", "B", "C"]);
    expect(ast.functions.map((f) => f.p)).toEqual([0.001, 0.01, 0.005]);
  });

  it("parses outcome patterns and labels (s/f/* grammar)", () => {
    const ast = parseEventTree(LOCA);
    expect(ast.outcomes).toHaveLength(4);
    expect(ast.outcomes[0]!.pattern).toEqual(["s", "s", "s"]);
    expect(ast.outcomes[0]!.label).toBe("OK");
    expect(ast.outcomes[2]!.pattern).toEqual(["s", "f", "*"]);
    expect(ast.outcomes[3]!.pattern).toEqual(["f", "*", "*"]);
  });

  it("accepts the eta alias header", () => {
    const ast = parseEventTree(`eta
  initiating IE freq: 1
  function A p: 0.1
  outcome s -> "ok"
  outcome f -> "bad"`);
    expect(ast.type).toBe("eventtree");
  });

  it("accepts CJK quotes", () => {
    const ast = parseEventTree(`eventtree 「冷却剂丧失」
  initiating IE 「大破口」 freq: 1e-4
  function A 「应急堆芯冷却」 p: 0.01
  outcome s -> 「安全」
  outcome f -> 「堆芯损坏」`);
    expect(ast.title).toBe("冷却剂丧失");
    expect(ast.initiating.label).toBe("大破口");
    expect(ast.outcomes[1]!.label).toBe("堆芯损坏");
  });

  // ── Errors ──
  it("throws without the eventtree/eta header", () => {
    expect(() => parseEventTree(`initiating IE freq: 1`)).toThrow(EventTreeParseError);
  });

  it("throws when the initiating event lacks a frequency", () => {
    expect(() => parseEventTree(`eventtree
  initiating IE "x"
  function A p: 0.1
  outcome s -> "ok"`)).toThrow(/needs a frequency/);
  });

  it("throws when a function lacks a probability", () => {
    expect(() => parseEventTree(`eventtree
  initiating IE freq: 1
  function A "x"
  outcome s -> "ok"`)).toThrow(/needs a failure probability/);
  });

  it("throws on a probability outside [0,1]", () => {
    expect(() => parseEventTree(`eventtree
  initiating IE freq: 1
  function A p: 1.5
  outcome s -> "ok"`)).toThrow(/outside \[0, 1\]/);
  });

  it("throws when an outcome pattern is longer than the column count", () => {
    expect(() => parseEventTree(`eventtree
  initiating IE freq: 1
  function A p: 0.1
  outcome s s -> "ok"`)).toThrow(/only 1 function column/);
  });

  it("throws when a path resumes querying after being pruned", () => {
    expect(() => parseEventTree(`eventtree
  initiating IE freq: 1
  function A p: 0.1
  function B p: 0.1
  outcome s * -> "ok"
  outcome * s -> "bad"`)).toThrow(/once a path is pruned it must stay pruned/);
  });

  it("throws on a duplicate id", () => {
    expect(() => parseEventTree(`eventtree
  initiating A freq: 1
  function A p: 0.1
  outcome s -> "ok"`)).toThrow(/duplicate id/);
  });

  it("throws with no functions", () => {
    expect(() => parseEventTree(`eventtree
  initiating IE freq: 1
  outcome s -> "ok"`)).toThrow(/at least one 'function'/);
  });

  it("throws with no outcomes", () => {
    expect(() => parseEventTree(`eventtree
  initiating IE freq: 1
  function A p: 0.1`)).toThrow(/at least one 'outcome'/);
  });

  it("throws on an invalid outcome token", () => {
    expect(() => parseEventTree(`eventtree
  initiating IE freq: 1
  function A p: 0.1
  outcome x -> "ok"`)).toThrow(/invalid outcome token/);
  });

  it("warns (not throws) on an unsupported layout directive", () => {
    const ast = parseEventTree(`eventtree
  layout: tb
  initiating IE freq: 1
  function A p: 0.1
  outcome s -> "ok"`);
    expect(ast.warnings.some((w) => /not supported/.test(w))).toBe(true);
  });
});
