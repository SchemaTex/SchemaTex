import { describe, test, expect } from "vitest";
import { renderGenogram } from "../../src/diagrams/genogram/renderer";
import { layoutGenogram } from "../../src/diagrams/genogram/layout";
import { parseGenogram } from "../../src/diagrams/genogram/parser";
import type { LayoutConfig, LayoutResult, RenderConfig } from "../../src/core/types";

const LAYOUT_CONFIG: LayoutConfig = {
  nodeSpacingX: 60,
  nodeSpacingY: 120,
  nodeWidth: 40,
  nodeHeight: 40,
};

const RENDER_CONFIG: RenderConfig = {
  fontFamily: "system-ui",
  fontSize: 12,
  theme: "default",
  padding: 20,
};

function renderFromText(text: string): string {
  const ast = parseGenogram(text);
  const layout = layoutGenogram(ast, LAYOUT_CONFIG);
  return renderGenogram(layout, RENDER_CONFIG);
}

function layoutFromText(text: string): LayoutResult {
  const ast = parseGenogram(text);
  return layoutGenogram(ast, LAYOUT_CONFIG);
}

describe("genogram renderer", () => {
  test("output is valid SVG", () => {
    const svg = renderFromText(`
genogram
  john [male, 1950]
  mary [female, 1955]
  john -- mary
`);
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("</svg>");
  });

  test("includes accessibility title and desc", () => {
    const svg = renderFromText(`
genogram
  john [male, 1950]
`);
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
  });

  test("includes CSS class names on nodes", () => {
    const svg = renderFromText(`
genogram
  john [male, 1950]
  mary [female, 1955]
  john -- mary
`);
    expect(svg).toContain("lineage-male");
    expect(svg).toContain("lineage-female");
    expect(svg).toContain("lineage-node");
  });

  test("includes data attributes for interaction", () => {
    const svg = renderFromText(`
genogram
  john [male, 1950]
`);
    expect(svg).toContain('data-individual-id="john"');
  });

  test("includes embedded style block", () => {
    const svg = renderFromText(`
genogram
  john [male, 1950]
`);
    expect(svg).toContain("<style>");
    expect(svg).toContain(".lineage-shape");
  });

  test("renders labels below symbols", () => {
    const svg = renderFromText(`
genogram
  john [male, 1950]
`);
    expect(svg).toContain("lineage-label");
    expect(svg).toContain("John");
  });

  test("uses diagram class on root svg", () => {
    const svg = renderFromText(`
genogram
  john [male, 1950]
`);
    expect(svg).toContain("lineage-diagram");
    expect(svg).toContain("lineage-genogram");
  });

  test("renders couple edge lines", () => {
    const svg = renderFromText(`
genogram
  a [male]
  b [female]
  a -- b
`);
    expect(svg).toContain("lineage-edge");
    expect(svg).toContain("lineage-edge-married");
  });

  test("renders parent-child connections", () => {
    const svg = renderFromText(`
genogram
  a [male, 1950]
  b [female, 1952]
  a -- b
    c [male, 1975]
`);
    expect(svg).toContain("lineage-edge-parent-child");
  });

  test("renders deceased with X overlay", () => {
    const svg = renderFromText(`
genogram
  john [male, 1930, deceased]
`);
    expect(svg).toContain("lineage-deceased");
  });

  test("all 6 standard cases render without error", () => {
    const cases = [
      `genogram\n  john [male, 1950]\n  mary [female, 1955]\n  john -- mary\n    alice [female, 1980]\n    bob [male, 1983]`,
      `genogram "Smith Family"\n  grandpa [male, 1930, deceased]\n  grandma [female, 1932]\n  grandpa -- grandma\n    dad [male, 1955]\n    aunt [female, 1958]\n  dad -- mom [female, 1957]\n    me [male, 1985]\n    sister [female, 1988]`,
      `genogram\n  tom [male, 1950]\n  jane [female, 1952]\n  tom -x- jane\n    child1 [male, 1975]\n  tom -- susan [female, 1960]\n    child2 [female, 1985]`,
      `genogram\n  father [male, 1945, conditions: heart-disease(full) + diabetes(half-left)]\n  mother [female, 1948]\n  father -- mother\n    son [male, 1970, conditions: diabetes(striped)]`,
      `genogram\n  solo [female, 1990]`,
      `genogram\n  husband [male, 1960]\n  wife [female, 1962]\n  husband -- wife`,
    ];
    for (const c of cases) {
      expect(() => renderFromText(c)).not.toThrow();
      const svg = renderFromText(c);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    }
  });

  test("renderGenogram accepts layout result directly", () => {
    const layout = layoutFromText(`
genogram
  a [male]
  b [female]
  a -- b
`);
    const svg = renderGenogram(layout, RENDER_CONFIG);
    expect(svg).toContain("<svg");
  });
});
