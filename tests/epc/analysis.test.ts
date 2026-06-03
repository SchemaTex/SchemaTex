import { describe, expect, it } from "vitest";
import { parseEpc } from "../../src/diagrams/epc/parser";
import { analyseEpc } from "../../src/diagrams/epc/analysis";
import type { EpcViolationKind } from "../../src/diagrams/epc/types";

function kinds(dsl: string): EpcViolationKind[] {
  return analyseEpc(parseEpc(dsl)).violations.map((v) => v.kind);
}

describe("epc validation — the differentiator", () => {
  it("accepts a well-formed alternating chain", () => {
    const a = analyseEpc(parseEpc(`epc
  event E1 "Order received"
  function F1 "Check credit"
  event E2 "Credit checked"
  E1 -> F1 -> E2`));
    expect(a.wellFormed).toBe(true);
    expect(a.violations).toHaveLength(0);
    expect(a.startIds).toEqual(["E1"]);
    expect(a.endIds).toEqual(["E2"]);
  });

  // ── SIGNATURE RULE: an event cannot be the source of an OR/XOR split ──
  it("rejects an event as the source of an XOR split", () => {
    const a = analyseEpc(parseEpc(`epc
  event E1 "Order received"
  xor X1
  event E2 "Path A"
  event E3 "Path B"
  E1 -> X1
  X1 -> E2
  X1 -> E3`));
    expect(a.wellFormed).toBe(false);
    const v = a.violations.find((x) => x.kind === "event-or-xor-split");
    expect(v).toBeDefined();
    expect(v!.severity).toBe("error");
    expect(v!.message).toMatch(/events cannot decide/i);
    expect(v!.nodes).toContain("E1");
  });

  it("rejects an event as the source of an OR split", () => {
    expect(kinds(`epc
  event E1
  or O1
  event E2
  event E3
  E1 -> O1
  O1 -> E2
  O1 -> E3`)).toContain("event-or-xor-split");
  });

  it("ALLOWS an AND split after an event (concurrency needs no decision)", () => {
    const a = analyseEpc(parseEpc(`epc
  event E1 "Started"
  and A1
  function F1 "Task A"
  function F2 "Task B"
  event E2 "A done"
  event E3 "B done"
  E1 -> A1
  A1 -> F1 -> E2
  A1 -> F2 -> E3`));
    expect(a.violations.some((v) => v.kind === "event-or-xor-split")).toBe(false);
  });

  it("ALLOWS an XOR split after a FUNCTION (legal decision)", () => {
    const a = analyseEpc(parseEpc(`epc
  event E1 "Order received"
  function F1 "Check credit"
  xor X1
  event E2 "Credit OK"
  event E3 "Credit rejected"
  E1 -> F1 -> X1
  X1 -> E2
  X1 -> E3`));
    expect(a.violations.some((v) => v.kind === "event-or-xor-split")).toBe(false);
    expect(a.wellFormed).toBe(true);
  });

  // ── Alternation ──
  it("rejects a function directly following a function", () => {
    expect(kinds(`epc
  event E1
  function F1
  function F2
  event E2
  E1 -> F1 -> F2 -> E2`)).toContain("alternation");
  });

  it("rejects an event directly following an event (through a connector run too)", () => {
    expect(kinds(`epc
  event E1
  and A1
  event E2
  E1 -> A1 -> E2`)).toContain("alternation");
  });

  // ── Start / end must be events ──
  it("rejects a function as a start node", () => {
    expect(kinds(`epc
  function F1
  event E1
  F1 -> E1`)).toContain("start-end");
  });

  it("rejects a function as an end node", () => {
    expect(kinds(`epc
  event E1
  function F1
  E1 -> F1`)).toContain("start-end");
  });

  // ── Single-in / single-out ──
  it("rejects an event with two outgoing arcs (split must be on a connector)", () => {
    expect(kinds(`epc
  event E1
  function F1
  function F2
  event E2
  event E3
  E1 -> F1
  E1 -> F2
  F1 -> E2
  F2 -> E3`)).toContain("node-fan-out");
  });

  // ── Undefined ref ──
  it("flags an undeclared edge endpoint", () => {
    expect(kinds(`epc
  event E1
  E1 -> GHOST`)).toContain("undefined-ref");
  });

  // ── Split/join balance is a warning, not an error ──
  it("warns (not errors) on a mismatched split/join", () => {
    const a = analyseEpc(parseEpc(`epc
  event E0 "Start"
  function F0 "Decide"
  xor X1
  function FA "A"
  function FB "B"
  and J1
  function FM "Merge"
  event E9 "Done"
  E0 -> F0 -> X1
  X1 -> FA
  X1 -> FB
  FA -> J1
  FB -> J1
  J1 -> FM -> E9`));
    const v = a.violations.find((x) => x.kind === "split-join-balance");
    expect(v?.severity).toBe("warning");
  });

  it("reports empty / event-less input", () => {
    expect(kinds(`epc
  function F1`)).toContain("empty");
  });
});
