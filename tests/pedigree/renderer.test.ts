import { describe, test, expect } from "vitest";
import { parsePedigree } from "../../src/diagrams/pedigree/parser";
import { layoutPedigree } from "../../src/diagrams/pedigree/layout";
import { renderPedigree } from "../../src/diagrams/pedigree/renderer";

const layoutConfig = { nodeSpacingX: 80, nodeSpacingY: 100, nodeWidth: 40, nodeHeight: 40 };
const renderConfig = { fontFamily: "system-ui", fontSize: 12, theme: "default", padding: 20 };

function renderFromDSL(dsl: string): string {
  const ast = parsePedigree(dsl);
  const layout = layoutPedigree(ast, layoutConfig);
  return renderPedigree(layout, renderConfig, ast);
}

describe("pedigree renderer", () => {
  test("produces valid SVG root", () => {
    const svg = renderFromDSL(`pedigree\n  I-1 [male]\n  I-2 [female]\n  I-1 -- I-2`);
    expect(svg).toContain("<svg");
    expect(svg).toContain("lineage-pedigree");
    expect(svg).toContain("</svg>");
  });

  test("includes title and desc", () => {
    const svg = renderFromDSL(`pedigree "Test"\n  I-1 [male]`);
    expect(svg).toContain("<title>Test</title>");
    expect(svg).toContain("<desc>");
  });

  test("renders generation labels (Roman numerals)", () => {
    const svg = renderFromDSL(`pedigree
  I-1 [male]
  I-2 [female]
  I-1 -- I-2
    II-1 [male]`);
    expect(svg).toContain("lineage-pedigree-gen-label");
    expect(svg).toContain(">I<");
    expect(svg).toContain(">II<");
  });

  test("renders affected fill (full black)", () => {
    const svg = renderFromDSL(`pedigree\n  a [male, affected]\n  b [female]\n  a -- b`);
    expect(svg).toContain("lineage-pedigree-affected-fill");
  });

  test("renders carrier fill (half-filled)", () => {
    const svg = renderFromDSL(`pedigree\n  a [female, carrier]\n  b [male]\n  a -- b`);
    expect(svg).toContain("lineage-pedigree-carrier-fill");
    expect(svg).toContain("lineage-pedigree-clip-carrier");
  });

  test("renders carrier-x dot", () => {
    const svg = renderFromDSL(`pedigree\n  a [female, carrier-x]\n  b [male]\n  a -- b`);
    expect(svg).toContain("lineage-pedigree-carrier-x-dot");
  });

  test("renders presymptomatic line", () => {
    const svg = renderFromDSL(`pedigree\n  a [male, presymptomatic]\n  b [female]\n  a -- b`);
    expect(svg).toContain("lineage-pedigree-presymptomatic-mark");
  });

  test("renders deceased slash", () => {
    const svg = renderFromDSL(`pedigree\n  a [male, deceased]\n  b [female]\n  a -- b`);
    expect(svg).toContain("lineage-pedigree-deceased-mark");
    expect(svg).toContain("lineage-pedigree-deceased");
  });

  test("renders proband arrow with P label", () => {
    const svg = renderFromDSL(`pedigree\n  a [male, affected, proband]\n  b [female]\n  a -- b`);
    expect(svg).toContain("lineage-pedigree-proband-arrow-line");
    expect(svg).toContain(">P<");
  });

  test("renders consultand arrow with C label", () => {
    const svg = renderFromDSL(`pedigree\n  a [female, consultand]\n  b [male]\n  a -- b`);
    expect(svg).toContain("lineage-pedigree-proband-arrow-line");
    expect(svg).toContain(">C<");
  });

  test("renders evaluated marker", () => {
    const svg = renderFromDSL(`pedigree\n  a [female, evaluated]\n  b [male]\n  a -- b`);
    expect(svg).toContain(">E<");
  });

  test("renders consanguinity double line", () => {
    const svg = renderFromDSL(`pedigree\n  a [male]\n  b [female]\n  a == b`);
    const edgePaths = svg.match(/lineage-pedigree-edge-consanguineous/g);
    expect(edgePaths).not.toBeNull();
    expect(edgePaths!.length).toBeGreaterThanOrEqual(2);
  });

  test("renders legend when present", () => {
    const svg = renderFromDSL(`pedigree "Cancer"
  legend: breast = "Breast cancer" (fill: quad-tl)
  I-1 [male]
  I-2 [female]
  I-1 -- I-2`);
    expect(svg).toContain("lineage-pedigree-legend");
    expect(svg).toContain("Breast cancer");
  });

  test("renders individual labels with pedigree numbering", () => {
    const svg = renderFromDSL(`pedigree
  I-1 [male]
  I-2 [female]
  I-1 -- I-2
    II-1 [male]`);
    expect(svg).toContain("lineage-pedigree-label");
  });
});
