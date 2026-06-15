import { describe, expect, it } from "vitest";
import { render, parse } from "../../src/core/api";
import { analyseRbd } from "../../src/diagrams/rbd";
import type { RbdAst } from "../../src/diagrams/rbd/types";

const parseAst = (src: string) => parse(src) as RbdAst;

describe("rbd e2e — via public api", () => {
  it("auto-detects the rbd diagram type", () => {
    const svg = render(`rbd "Two pumps"
  parallel {
    block A "Pump A" R=0.9
    block B "Pump B" R=0.9
  }`);
    expect(svg).toContain('data-diagram-type="rbd"');
    expect(svg).toContain("Pump A");
  });

  it("accepts the reliability alias header", () => {
    const svg = render(`reliability
  block A R=0.9`);
    expect(svg).toContain('data-diagram-type="rbd"');
  });

  // ── Computation: series ──
  it("series reliability is the product of block reliabilities", () => {
    const a = analyseRbd(parseAst(`rbd
  series {
    block A R=0.9
    block B R=0.8
  }`));
    expect(a.systemReliability).toBeCloseTo(0.72, 10);
  });

  it("a bare top-level block list is treated as a series chain", () => {
    const a = analyseRbd(parseAst(`rbd
  block A R=0.9
  block B R=0.8`));
    expect(a.systemReliability).toBeCloseTo(0.72, 10);
  });

  // ── Computation: parallel ──
  it("parallel reliability is 1 - ∏(1-Rᵢ)", () => {
    const a = analyseRbd(parseAst(`rbd
  parallel {
    block A R=0.9
    block B R=0.9
  }`));
    expect(a.systemReliability).toBeCloseTo(0.99, 10); // 1 - 0.1*0.1
  });

  // ── Computation: k-of-n ──
  it("2-of-3 of identical 0.97 blocks computes the exact voting reliability", () => {
    const a = analyseRbd(parseAst(`rbd
  kofn 2/3 {
    block D1 R=0.97
    block D2 R=0.97
    block D3 R=0.97
  }`));
    // 3·0.97²·0.03 + 0.97³
    expect(a.systemReliability).toBeCloseTo(0.997354, 6);
  });

  it("nested series→parallel→kofn composes correctly", () => {
    const a = analyseRbd(parseAst(`rbd "Server"
  series {
    block PSU R=0.99
    parallel { block F1 R=0.95
               block F2 R=0.95 }
    kofn 2/3 { block D1 R=0.97
               block D2 R=0.97
               block D3 R=0.97 }
  }`));
    expect(a.systemReliability).toBeCloseTo(0.99 * 0.9975 * 0.997354, 6);
  });

  // ── SPOF + importance ──
  it("a series block with no redundancy is a single point of failure", () => {
    const a = analyseRbd(parseAst(`rbd
  series {
    block PSU R=0.99
    parallel { block F1 R=0.95
               block F2 R=0.95 }
  }`));
    const psu = a.blocks.find((b) => b.id === "PSU")!;
    const f1 = a.blocks.find((b) => b.id === "F1")!;
    expect(psu.isSpof).toBe(true);
    expect(f1.isSpof).toBe(false);
    // PSU dominates Birnbaum importance → it's the improvement target.
    expect(a.criticalBlock).toBe("PSU");
  });

  it("renders the SPOF marker in the SVG", () => {
    const svg = render(`rbd
  series {
    block PSU R=0.99
    block CPU R=0.98
  }`);
    expect(svg).toContain('data-spof="true"');
  });

  // ── Failure-probability input ──
  it("accepts p= failure probability and % reliability", () => {
    const a = analyseRbd(parseAst(`rbd
  series {
    block A p=0.1
    block B R=80%
  }`));
    expect(a.systemReliability).toBeCloseTo(0.9 * 0.8, 10); // A: 1-0.1=0.9, B: 0.8
  });

  // ── Missing reliability ──
  it("system reliability is n/a when a block lacks R", () => {
    const a = analyseRbd(parseAst(`rbd
  series {
    block A R=0.9
    block B
  }`));
    expect(a.systemReliability).toBeUndefined();
    expect(a.missing).toContain("B");
    const svg = render(`rbd
  series {
    block A R=0.9
    block B
  }`);
    expect(svg).toContain("n/a");
  });

  // ── Validation warnings ──
  it("clamps a k-of-n threshold greater than n and warns", () => {
    const ast = parseAst(`rbd
  kofn 5/3 {
    block A R=0.9
    block B R=0.9
    block C R=0.9
  }`);
    expect(ast.warnings.some((w) => /clamped/i.test(w))).toBe(true);
  });

  it("clamps out-of-range reliabilities", () => {
    const a = analyseRbd(parseAst(`rbd
  block A R=1.5`));
    expect(a.systemReliability).toBe(1);
  });

  // ── Theming / CJK ──
  it("honors a CJK-quoted title and monochrome theme", () => {
    const svg = render(`rbd "冗余系统"
  parallel {
    block A R=0.9
    block B R=0.9
  }`, { theme: "monochrome" });
    expect(svg).toContain("冗余系统");
    expect(svg).toContain('data-diagram-type="rbd"');
  });

  // ── High-reliability formatting (the nines must survive) ──
  it("does not round a sub-1 system reliability up to '1'", () => {
    const svg = render(`rbd "Triple redundant"
  series {
    kofn 2/3 { block A R=0.9995
               block B R=0.9995
               block C R=0.9995 }
    parallel { block D R=0.999
               block E R=0.999 }
  }`);
    // Reliability is ~0.99999975 — must show its nines, never collapse to "= 1".
    expect(svg).toMatch(/R = 0\.9999/);
    expect(svg).not.toMatch(/reliability\s+R = 1\b/);
  });

  // ── Determinism ──
  it("is deterministic across renders", () => {
    const src = `rbd
  series { block A R=0.9
           parallel { block B R=0.8
                      block C R=0.8 } }`;
    expect(render(src)).toBe(render(src));
  });
});
