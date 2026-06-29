import { describe, test, expect } from "vitest";
import { parseSLDDSL } from "../../src/diagrams/sld/parser";
import { renderSLD } from "../../src/diagrams/sld/renderer";
import { lintSLD } from "../../src/diagrams/sld/lint";

// ─── B-2: standard symbol switching (ANSI ↔ IEC ↔ ABNT ↔ AS-NZS) ──

const topo = (std?: string) =>
  `sld "Feeder"${std ? ` [standard: ${std}]` : ""}
UTIL = utility
ATS = ats
BUS = bus
CB = breaker
TX = transformer_dy
F1 = fuse
LOAD = load
UTIL -> ATS
ATS -> BUS
BUS -> CB
CB -> TX
TX -> F1
F1 -> LOAD`;

function render(std?: string): string {
  return renderSLD(parseSLDDSL(topo(std)));
}

describe("header parsing", () => {
  test("standard defaults to undefined (ANSI behaviour)", () => {
    expect(parseSLDDSL(topo()).standard).toBeUndefined();
  });
  test("[standard: iec] is parsed", () => {
    expect(parseSLDDSL(topo("iec")).standard).toBe("iec");
  });
  test("invalid standard throws", () => {
    expect(() => parseSLDDSL(topo("bogus"))).toThrow(/Unknown standard/);
  });
});

describe("breaker glyph differs by standard", () => {
  test("ANSI breaker draws the contact-arc (Q quarter-circle)", () => {
    const svg = render("ansi");
    expect(svg).toMatch(/Q\s*14\s*-12/);
  });
  test("IEC breaker drops the arc and adds the × breaking mark", () => {
    const svg = render("iec");
    expect(svg).not.toMatch(/Q\s*14\s*-12/);
    // the × is two crossing short strokes at the fixed contact
    expect(svg).toMatch(/y1="-13"/);
  });
});

describe("transformer glyph differs by standard", () => {
  test("ANSI transformer uses coil humps (arc A 4 4)", () => {
    expect(render("ansi")).toContain("A 4 4");
  });
  test("IEC transformer uses two interlinked circles (r=11)", () => {
    const svg = render("iec");
    const circles = svg.match(/<circle[^>]*r="11"/g) ?? [];
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });
});

describe("fuse glyph differs by standard", () => {
  test("IEC fuse adds the conductor line through the body", () => {
    const ansi = render("ansi");
    const iec = render("iec");
    // crude proxy: IEC fuse body is 22px tall (rect height 22), ANSI is 20
    expect(iec).toContain('height="22"');
    expect(ansi).not.toContain('height="22"');
  });
});

describe("jurisdiction badge", () => {
  test("ANSI shows no badge (unchanged output)", () => {
    // the CSS rule for the class is always emitted; the <text> badge is not
    expect(render("ansi")).not.toMatch(/<text[^>]*lt-sld-standard-badge/);
    expect(render()).not.toMatch(/<text[^>]*lt-sld-standard-badge/);
  });
  test("IEC badge reads IEC 60617", () => {
    expect(render("iec")).toContain("IEC 60617");
  });
  test("ABNT badge is localised to Portuguese", () => {
    expect(render("abnt")).toContain("Norma: ABNT NBR 5410");
  });
  test("AS-NZS badge reads AS/NZS 3000", () => {
    expect(render("as-nzs")).toContain("AS/NZS 3000");
  });
});

describe("ABNT/AS-NZS reuse IEC glyphs", () => {
  test("ABNT transformer uses IEC circles, not ANSI coils", () => {
    const svg = render("abnt");
    expect(svg).not.toContain("A 4 4");
    expect((svg.match(/<circle[^>]*r="11"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe("symbol-availability lint", () => {
  test("an ANSI-only device under IEC is flagged", () => {
    const diags = lintSLD(
      `sld "T" [standard: iec]\nR = recloser\nB = bus\nR -> B`
    );
    const warn = diags.find((d) => d.code === "SLD_SYMBOL_NOT_IN_STANDARD");
    expect(warn).toBeDefined();
    expect(warn!.message).toContain("recloser");
  });
  test("no warning under ANSI (default)", () => {
    expect(lintSLD(`sld "T"\nR = recloser\nB = bus\nR -> B`)).toHaveLength(0);
  });
  test("common devices (breaker/transformer) are not flagged under IEC", () => {
    expect(lintSLD(topo("iec"))).toHaveLength(0);
  });
});

describe("residential distribution aliases", () => {
  test("consumer_unit and RCD aliases parse as first-class device types", () => {
    const ast = parseSLDDSL(`sld "Flat DB" [standard: iec]
GRID = utility
DB = consumer_unit [label: "CU-1", rating: "63A"]
RCD1 = rccb [label: "RCD-1", rcd_type: A, sensitivity: "30mA"]
MCB1 = mcb [label: "Lighting", curve: B, icn: "6kA"]
GRID -> DB [cable_csa: "16 mm2", cable_length_m: 12, cable_insulation: "H07V-K"]
DB -> RCD1
RCD1 -> MCB1`);
    expect(ast.nodes.find((n) => n.id === "DB")?.nodeType).toBe("consumer_unit");
    expect(ast.nodes.find((n) => n.id === "RCD1")?.nodeType).toBe("rcd");
    expect(ast.nodes.find((n) => n.id === "MCB1")?.nodeType).toBe("breaker");
    expect(ast.connections[0]!.cableCsa).toBe("16 mm2");

    const svg = renderSLD(ast);
    expect(svg).toContain("RCD");
    expect(svg).toContain("16 mm2");
    expect(svg).toContain("H07V-K");
    expect(svg).toContain("curve: B");
  });
});
