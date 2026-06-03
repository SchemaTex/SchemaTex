import { describe, expect, it } from "vitest";
import { parseFmea, layoutFmea, wrapText } from "../../src/diagrams/fmea";

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

describe("fmea layout", () => {
  it("produces deterministic geometry (identical twice)", () => {
    const a = layoutFmea(parseFmea(DSL));
    const b = layoutFmea(parseFmea(DSL));
    expect(JSON.stringify(a.cells)).toBe(JSON.stringify(b.cells));
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
  });

  it("has the classic column set with a narrow numeric S/O/D/RPN/AP block", () => {
    const lay = layoutFmea(parseFmea(DSL));
    const keys = lay.columns.map((c) => c.key);
    expect(keys).toEqual(["no", "item", "mode", "effect", "sev", "cause", "occ", "controls", "det", "rpn", "ap"]);
    const sev = lay.columns.find((c) => c.key === "sev")!;
    const effect = lay.columns.find((c) => c.key === "effect")!;
    expect(sev.numeric).toBe(true);
    expect(sev.width).toBeLessThan(effect.width); // numeric columns are tight
  });

  it("columns are laid out left-to-right with no gaps or overlaps", () => {
    const lay = layoutFmea(parseFmea(DSL));
    for (let i = 1; i < lay.columns.length; i++) {
      const prev = lay.columns[i - 1]!;
      const cur = lay.columns[i]!;
      expect(cur.x).toBe(prev.x + prev.width);
    }
  });

  it("merges the item left cell across its contiguous rows", () => {
    const lay = layoutFmea(parseFmea(DSL));
    const itemCells = lay.cells.filter((c) => c.colKey === "item");
    // single item spanning all 3 rows → one rendered item cell with rowSpan 3
    expect(itemCells).toHaveLength(1);
    expect(itemCells[0]!.rowSpan).toBe(3);
  });

  it("colour-fills the RPN and AP cells with a risk class", () => {
    const lay = layoutFmea(parseFmea(DSL));
    const rpnCells = lay.cells.filter((c) => c.colKey === "rpn");
    const apCells = lay.cells.filter((c) => c.colKey === "ap");
    expect(rpnCells.every((c) => c.riskClass !== undefined)).toBe(true);
    expect(apCells.every((c) => c.riskClass !== undefined)).toBe(true);
    expect(rpnCells.some((c) => c.riskClass === "rpn-high")).toBe(true);
  });

  it("adds BEFORE/AFTER spanning bands only when actions exist", () => {
    const noActions = layoutFmea(parseFmea(DSL));
    expect(noActions.bands).toHaveLength(0);

    const withActions = layoutFmea(parseFmea(`${DSL}
  action "Seal leak" / "Degradation"
    do: "Upgrade seal" revised sev: 9 occ: 1 det: 4`));
    const labels = withActions.bands.map((b) => b.label);
    expect(labels).toContain("BEFORE ACTION");
    expect(labels).toContain("AFTER ACTION");
  });
});

describe("fmea wrapText", () => {
  it("respects explicit newlines", () => {
    expect(wrapText("a\nb", 200)).toEqual(["a", "b"]);
  });
  it("wraps long prose to multiple lines", () => {
    const lines = wrapText("the quick brown fox jumps over the lazy dog again", 60);
    expect(lines.length).toBeGreaterThan(1);
  });
  it("hard-breaks an over-long single token", () => {
    const lines = wrapText("supercalifragilisticexpialidocious", 40);
    expect(lines.length).toBeGreaterThan(1);
  });
});
