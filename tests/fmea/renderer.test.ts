import { describe, expect, it } from "vitest";
import { fmea, renderFmea } from "../../src/diagrams/fmea";

const DSL = `fmea "Brake system DFMEA"
  type: design
  rank: ap
  flag: ap >= High
  number: FMEA-2026-014
  item "Master cylinder" fn "Generate hydraulic pressure"
    mode "Internal seal leak"
      effect "Loss of braking" sev: 9
      cause "Seal degradation" occ: 3
        controls prevention: "Material spec", detection: "Bench pressure test" det: 4
      cause "Contamination" occ: 2
        controls detection: "Fluid analysis" det: 5
    mode "Bore corrosion"
      effect "Reduced braking" sev: 7
      cause "Moisture ingress" occ: 2
        controls detection: "Visual inspection" det: 6`;

describe("fmea renderer", () => {
  it("emits a semantic SVG with title, desc and data-diagram-type", () => {
    const svg = renderFmea(DSL);
    expect(svg).toContain("<svg");
    expect(svg).toContain('data-diagram-type="fmea"');
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain('role="img"');
  });

  it("has NO inline style attributes (semantic-SVG rule)", () => {
    const svg = renderFmea(DSL);
    expect(svg).not.toMatch(/\sstyle="/);
  });

  it("ships a single <style> block with theme classes", () => {
    const svg = renderFmea(DSL);
    expect(svg).toContain("<style>");
    expect(svg).toContain(".sx-fmea-rpn-high");
    expect(svg).toContain(".sx-fmea-ap-high");
  });

  it("colour-fills the risk cells via class + data-risk", () => {
    const svg = renderFmea(DSL);
    expect(svg).toContain('data-risk="rpn-high"');
    expect(svg).toContain('data-risk="ap-high"');
  });

  it("renders the failure-mode text and computed RPN in the table", () => {
    const svg = renderFmea(DSL);
    expect(svg).toContain("Internal seal leak");
    // RPN 9·3·4 = 108 appears as a cell value
    expect(svg).toContain(">108<");
  });

  it("marks flagged rows", () => {
    const svg = renderFmea(DSL);
    expect(svg).toContain('data-flagged="true"');
  });

  it("plugin detect + render round-trip", () => {
    expect(fmea.detect(DSL)).toBe(true);
    expect(fmea.detect("genogram\n  ...")).toBe(false);
    const svg = fmea.render(DSL);
    expect(svg).toContain('data-diagram-type="fmea"');
  });

  it("renders an after-action block when actions present", () => {
    const svg = renderFmea(`${DSL}
  action "Internal seal leak" / "Seal degradation"
    do: "Upgrade seal to EPDM" owner: "J. Lee" target: 2026-Q3
    revised sev: 9 occ: 1 det: 4`);
    expect(svg).toContain("AFTER ACTION");
    expect(svg).toContain("BEFORE ACTION");
    expect(svg).toContain("Upgrade seal to EPDM");
  });

  it("escapes XML in labels", () => {
    const svg = renderFmea(`fmea "A & B <test>"
  item "x"
    mode "m"
      effect "e" sev: 5
      cause "c" occ: 2 det: 3`);
    expect(svg).toContain("A &amp; B &lt;test&gt;");
  });
});
