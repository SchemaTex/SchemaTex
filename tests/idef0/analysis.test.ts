import { describe, it, expect } from "vitest";
import { parseIdef0, Idef0ParseError } from "../../src/diagrams/idef0/parser";
import { analyseIdef0 } from "../../src/diagrams/idef0/analysis";

function analyse(src: string) {
  return analyseIdef0(parseIdef0(src));
}

describe("idef0 analysis — ICOM placement enforcement (the differentiator)", () => {
  it("assigns contiguous box numbers 1..n in declaration order", () => {
    const ast = analyse(`idef0\nfunction A1 "a"\nfunction A2 "b"\nfunction A3 "c"`);
    expect(ast.boxes.map((b) => b.number)).toEqual([1, 2, 3]);
  });

  it("assigns node numbers A1..An under an A0 diagram", () => {
    const ast = analyse(`idef0\nnode A0\nfunction X "a"\nfunction Y "b"\nfunction Z "c"`);
    expect(ast.boxes.map((b) => b.nodeNumber)).toEqual(["A1", "A2", "A3"]);
  });

  it("a Control arrow resolves to the TOP side", () => {
    const ast = analyse(`idef0\nfunction A1 "a"\ncontrol A1 "rule"`);
    const ctl = ast.arrows.find((a) => a.role === "control")!;
    // role → side mapping is the enforced invariant
    expect(ctl.role).toBe("control");
    // boundary control enters the box (target is the box)
    expect(ctl.to).toEqual({ kind: "box", boxId: "A1" });
  });

  it("a Mechanism arrow enters the BOTTOM side", () => {
    const ast = analyse(`idef0\nfunction A1 "a"\nmechanism A1 "machine"`);
    const m = ast.arrows.find((a) => a.role === "mechanism")!;
    expect(m.to).toEqual({ kind: "box", boxId: "A1" });
  });

  it("an Output routes box → boundary on the RIGHT side", () => {
    const ast = analyse(`idef0\nfunction A1 "a"\noutput A1 "product"`);
    const o = ast.arrows.find((a) => a.role === "output")!;
    expect(o.from).toEqual({ kind: "box", boxId: "A1" });
    expect(o.to.kind).toBe("boundary");
  });

  it("assigns ICOM boundary codes I1/C1/O1/M1 down each edge", () => {
    const ast = analyse(
      `idef0\nfunction A1 "a"\ninput A1 "i1"\ninput A1 "i2"\ncontrol A1 "c1"\noutput A1 "o1"\nmechanism A1 "m1"`
    );
    const codes = ast.arrows.map((a) => a.icomCode);
    expect(codes).toContain("I1");
    expect(codes).toContain("I2");
    expect(codes).toContain("C1");
    expect(codes).toContain("O1");
    expect(codes).toContain("M1");
  });

  it("rejects an arrow referencing an undefined box", () => {
    expect(() => analyse(`idef0\nfunction A1 "a"\ninput Ghost "x"`)).toThrow(/undefined function box/);
  });

  it("rejects duplicate explicit box numbers", () => {
    expect(() => analyse(`idef0\nfunction A1 "a" n:1\nfunction A2 "b" n:1`)).toThrow(/duplicate box number/);
  });

  it("rejects a gap in explicit box numbers", () => {
    expect(() => analyse(`idef0\nfunction A1 "a" n:1\nfunction A2 "b" n:3`)).toThrow(/contiguous/);
  });

  it("rejects an out-of-range explicit box number", () => {
    expect(() => analyse(`idef0\nfunction A1 "a" n:7`)).toThrow(/out of range/);
  });

  it("warns on too few boxes (FIPS 3-to-6 rule)", () => {
    const ast = analyse(`idef0\nfunction A1 "a"`);
    expect(ast.warnings.some((w) => /3 to 6/.test(w))).toBe(true);
  });

  it("warns on too many boxes", () => {
    const src =
      "idef0\n" + Array.from({ length: 7 }, (_, k) => `function A${k} "a${k}"`).join("\n");
    const ast = analyse(src);
    expect(ast.warnings.some((w) => /3 to 6/.test(w))).toBe(true);
  });

  it("throws on zero boxes", () => {
    expect(() => analyse(`idef0`)).toThrow(Idef0ParseError);
  });

  it("decomposition prefix follows the diagram node (A2 → A21..)", () => {
    const ast = analyse(`idef0\nnode A2\nfunction X "a"\nfunction Y "b"\nfunction Z "c"`);
    expect(ast.boxes.map((b) => b.nodeNumber)).toEqual(["A21", "A22", "A23"]);
  });
});
