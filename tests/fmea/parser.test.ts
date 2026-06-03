import { describe, expect, it } from "vitest";
import { parseFmea, FmeaParseError } from "../../src/diagrams/fmea";

const SAMPLE = `fmea "Brake system DFMEA"
  type: design
  rank: ap
  flag: ap >= High
  number: FMEA-2026-014
  author: J. Lee

  item "Master cylinder" fn "Generate hydraulic pressure"
    mode "Internal seal leak"
      effect "Loss of braking" sev: 9
      cause "Seal material degradation" occ: 3
        controls prevention: "Material spec", detection: "Bench pressure test" det: 4
      cause "Contamination" occ: 2
        controls detection: "Fluid analysis" det: 5
    mode "Bore corrosion"
      effect "Reduced braking" sev: 7
      cause "Moisture ingress" occ: 2
        controls detection: "Visual inspection" det: 6
`;

describe("fmea parser", () => {
  it("parses title, type, rank, flag and metadata", () => {
    const ast = parseFmea(SAMPLE);
    expect(ast.type).toBe("fmea");
    expect(ast.title).toBe("Brake system DFMEA");
    expect(ast.fmeaType).toBe("design");
    expect(ast.rank).toBe("ap");
    expect(ast.flag).toEqual({ key: "ap", op: ">=", value: "High", text: "ap >= High" });
    expect(ast.metadata.number).toBe("FMEA-2026-014");
    expect(ast.metadata.author).toBe("J. Lee");
  });

  it("builds the nested item → mode → effect/cause tree", () => {
    const ast = parseFmea(SAMPLE);
    expect(ast.items).toHaveLength(1);
    const item = ast.items[0]!;
    expect(item.item).toBe("Master cylinder");
    expect(item.fn).toBe("Generate hydraulic pressure");
    expect(item.modes).toHaveLength(2);

    const seal = item.modes[0]!;
    expect(seal.text).toBe("Internal seal leak");
    expect(seal.effects[0]).toEqual({ text: "Loss of braking", sev: 9 });
    expect(seal.causes).toHaveLength(2);
    expect(seal.causes[0]!.occ).toBe(3);
    expect(seal.causes[0]!.det).toBe(4);
    expect(seal.causes[0]!.controls).toEqual({
      prevention: "Material spec",
      detection: "Bench pressure test",
    });
  });

  it("defaults Detection to 10 when no control rates it", () => {
    const ast = parseFmea(`fmea
  item "Pump"
    mode "No flow"
      effect "Stops" sev: 8
      cause "Impeller wear" occ: 4`);
    expect(ast.items[0]!.modes[0]!.causes[0]!.det).toBe(10);
  });

  it("accepts CJK quotes", () => {
    const ast = parseFmea(`fmea 「制动系统」
  item 「主缸」 fn 「产生液压」
    mode 「密封泄漏」
      effect 「制动失效」 sev: 9
      cause 「密封老化」 occ: 3 det: 4`);
    expect(ast.title).toBe("制动系统");
    expect(ast.items[0]!.modes[0]!.text).toBe("密封泄漏");
  });

  it("parses an after-action block with revised scores", () => {
    const ast = parseFmea(`fmea
  item "MC"
    mode "Seal leak"
      effect "Loss of braking" sev: 9
      cause "Degradation" occ: 3 det: 4
  action "Seal leak" / "Degradation"
    do: "Upgrade seal to EPDM" owner: "J. Lee" target: 2026-Q3
    revised sev: 9 occ: 1 det: 4`);
    expect(ast.actions).toHaveLength(1);
    const a = ast.actions[0]!;
    expect(a.mode).toBe("Seal leak");
    expect(a.cause).toBe("Degradation");
    expect(a.recommendation).toBe("Upgrade seal to EPDM");
    expect(a.owner).toBe("J. Lee");
    expect(a.target).toBe("2026-Q3");
    expect(a.revisedSev).toBe(9);
    expect(a.revisedOcc).toBe(1);
    expect(a.revisedDet).toBe(4);
  });

  it("rejects out-of-range ratings", () => {
    expect(() => parseFmea(`fmea
  item "x"
    mode "m"
      effect "e" sev: 11
      cause "c" occ: 3 det: 4`)).toThrow(FmeaParseError);
  });

  it("rejects bad header", () => {
    expect(() => parseFmea(`notfmea\n  item "x"`)).toThrow(FmeaParseError);
  });

  it("rejects structural ordering errors", () => {
    expect(() => parseFmea(`fmea
  mode "orphan"`)).toThrow(/mode.*before any.*item/i);
    expect(() => parseFmea(`fmea
  item "x"
    effect "e" sev: 3`)).toThrow(/effect.*before any.*mode/i);
  });

  it("honours # and // comments", () => {
    const ast = parseFmea(`fmea  # title omitted
  item "x"   // the item
    mode "m"
      effect "e" sev: 5
      cause "c" occ: 2 det: 3`);
    expect(ast.items[0]!.item).toBe("x");
  });
});
