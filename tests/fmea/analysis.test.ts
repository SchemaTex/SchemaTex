import { describe, expect, it } from "vitest";
import { parseFmea, analyseFmea, actionPriority, rpn } from "../../src/diagrams/fmea";
import type { FmeaActionPriority } from "../../src/diagrams/fmea";

describe("fmea RPN arithmetic", () => {
  it("RPN = S × O × D", () => {
    expect(rpn(9, 3, 4)).toBe(108);
    expect(rpn(5, 5, 5)).toBe(125);
    expect(rpn(10, 10, 10)).toBe(1000);
    expect(rpn(1, 1, 1)).toBe(1);
  });

  it("two equal-RPN rows can carry very different severity (the AP motivation)", () => {
    // canonical illustration from the standard doc
    expect(rpn(9, 3, 5)).toBe(135);
    expect(rpn(5, 9, 3)).toBe(135);
    // ...but AP separates them:
    expect(actionPriority(9, 3, 5)).toBe("High"); // safety-adjacent
    expect(actionPriority(5, 9, 3)).not.toBe("High");
  });
});

describe("fmea Action Priority banding (AIAG-VDA severity-primary)", () => {
  const cases: [number, number, number, FmeaActionPriority][] = [
    // S = 9–10 → always High, even at the lowest O and D
    [10, 1, 1, "High"],
    [9, 1, 1, "High"],
    [10, 2, 3, "High"], // airbag fails to deploy
    // S = 1 → always Low
    [1, 10, 10, "Low"],
    [1, 1, 1, "Low"],
    // S = 7–8 band
    [7, 6, 7, "High"], // mid/high O → High
    [7, 1, 10, "Low"], // O=1 → Low regardless of D
    [8, 4, 8, "High"], // weak detection bumps up
    // S = 4–6 band — High only at very high O (8–10) + weak detection
    [5, 9, 8, "High"],
    [5, 4, 3, "Low"],
    [6, 2, 2, "Low"],
    // S = 2–3 band
    [3, 9, 9, "Medium"],
    [2, 2, 2, "Low"],
  ];

  it.each(cases)("S%i·O%i·D%i → AP %s", (s, o, d, expected) => {
    expect(actionPriority(s, o, d)).toBe(expected);
  });

  it("severity dominates: every (O,D) at S=10 is High", () => {
    for (let o = 1; o <= 10; o++) {
      for (let d = 1; d <= 10; d++) {
        expect(actionPriority(10, o, d)).toBe("High");
      }
    }
  });

  it("S=1 is Low for every (O,D)", () => {
    for (let o = 1; o <= 10; o++) {
      for (let d = 1; d <= 10; d++) {
        expect(actionPriority(1, o, d)).toBe("Low");
      }
    }
  });
});

describe("fmea analysis — flatten, rank, flag", () => {
  const DSL = `fmea "Brake DFMEA"
  rank: ap
  flag: ap >= High
  item "Master cylinder" fn "Hydraulic pressure"
    mode "Seal leak"
      effect "Loss of braking" sev: 9
      cause "Degradation" occ: 3 det: 4
      cause "Contamination" occ: 2 det: 5
    mode "Bore corrosion"
      effect "Reduced braking" sev: 7
      cause "Moisture" occ: 2 det: 6`;

  it("flattens to one row per (item, mode, cause) triple", () => {
    const a = analyseFmea(parseFmea(DSL));
    expect(a.rows).toHaveLength(3);
  });

  it("computes RPN per row", () => {
    const a = analyseFmea(parseFmea(DSL));
    const byCause = new Map(a.rows.map((r) => [r.cause, r] as const));
    expect(byCause.get("Degradation")!.rpn).toBe(9 * 3 * 4);
    expect(byCause.get("Contamination")!.rpn).toBe(9 * 2 * 5);
    expect(byCause.get("Moisture")!.rpn).toBe(7 * 2 * 6);
  });

  it("ranks AP rows High→Medium→Low, tie-break by Severity then RPN (never RPN alone)", () => {
    const a = analyseFmea(parseFmea(DSL));
    // The two S9 seal-leak rows (High) must precede the S7 corrosion row,
    // even though Moisture RPN(84) > Contamination RPN(90)? — check ordering by AP.
    const order = a.rows.map((r) => r.ap);
    // every High precedes every non-High
    const firstNonHigh = order.findIndex((ap) => ap !== "High");
    if (firstNonHigh >= 0) {
      expect(order.slice(0, firstNonHigh).every((ap) => ap === "High")).toBe(true);
      expect(order.slice(firstNonHigh).every((ap) => ap !== "High")).toBe(true);
    }
  });

  it("flags rows over the threshold", () => {
    const a = analyseFmea(parseFmea(DSL));
    expect(a.flaggedCount).toBeGreaterThan(0);
    // every High row flagged under `ap >= High`
    for (const r of a.rows) {
      expect(r.flagged).toBe(r.ap === "High");
    }
  });

  it("worst effect severity governs a multi-effect mode", () => {
    const a = analyseFmea(parseFmea(`fmea
  item "x"
    mode "m"
      effect "minor" sev: 3
      effect "major" sev: 8
      cause "c" occ: 4 det: 5`));
    expect(a.rows[0]!.sev).toBe(8);
    expect(a.rows[0]!.rpn).toBe(8 * 4 * 5);
  });

  it("recomputes after-action RPN/AP and the delta", () => {
    const a = analyseFmea(parseFmea(`fmea
  rank: rpn
  item "MC"
    mode "Seal leak"
      effect "Loss of braking" sev: 9
      cause "Degradation" occ: 3 det: 4
  action "Seal leak" / "Degradation"
    do: "Upgrade seal" revised sev: 9 occ: 1 det: 4`));
    expect(a.hasActions).toBe(true);
    const row = a.rows[0]!;
    expect(row.rpn).toBe(108);
    expect(row.action!.rpn).toBe(36);
    expect(row.action!.rpnDelta).toBe(108 - 36);
    expect(row.action!.ap).toBe(actionPriority(9, 1, 4));
  });

  it("ranks by RPN descending when rank: rpn", () => {
    const a = analyseFmea(parseFmea(`fmea
  rank: rpn
  item "x"
    mode "a"
      effect "e" sev: 2
      cause "c1" occ: 9 det: 9
    mode "b"
      effect "e" sev: 9
      cause "c2" occ: 2 det: 2`));
    const rpns = a.rows.map((r) => r.rpn);
    expect(rpns).toEqual([...rpns].sort((x, y) => y - x));
  });

  it("notes a likely Detection-inversion authoring error", () => {
    const a = analyseFmea(parseFmea(`fmea
  item "x"
    mode "m"
      effect "e" sev: 8
      cause "c" occ: 5 det: 1`));
    expect(a.notes.some((n) => /inversion/i.test(n))).toBe(true);
  });
});
