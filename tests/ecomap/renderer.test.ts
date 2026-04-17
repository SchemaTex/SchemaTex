import { describe, test, expect } from "vitest";
import { parseEcomap } from "../../src/diagrams/ecomap/parser";
import { layoutEcomap } from "../../src/diagrams/ecomap/layout";
import { renderEcomap } from "../../src/diagrams/ecomap/renderer";

const defaultLayoutConfig = {
  nodeSpacingX: 80,
  nodeSpacingY: 100,
  nodeWidth: 40,
  nodeHeight: 40,
};

const defaultRenderConfig = {
  fontFamily: "system-ui",
  fontSize: 12,
  theme: "default",
  padding: 20,
};

function renderFromDSL(dsl: string): string {
  const ast = parseEcomap(dsl);
  const layout = layoutEcomap(ast, defaultLayoutConfig);
  return renderEcomap(layout, defaultRenderConfig);
}

describe("ecomap renderer", () => {
  test("produces valid SVG root", () => {
    const svg = renderFromDSL(`
ecomap
  center: maria [female]
  work [label: "Job"]
  maria --- work
`);
    expect(svg).toContain("<svg");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("class=\"lineage-diagram lineage-ecomap\"");
    expect(svg).toContain("</svg>");
  });

  test("includes title and desc for accessibility", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  w [label: "Work"]
  m --- w
`);
    expect(svg).toContain("<title>Ecomap</title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain("1 external systems");
  });

  test("renders center circle", () => {
    const svg = renderFromDSL(`
ecomap
  center: maria [female]
  w [label: "Work"]
  maria --- w
`);
    expect(svg).toContain('class="lineage-ecomap-center-shape"');
    expect(svg).toContain('class="lineage-ecomap-center-label"');
    expect(svg).toContain("Maria");
  });

  test("renders center with custom label", () => {
    const svg = renderFromDSL(`
ecomap
  center: client [male, label: "James"]
  w [label: "Work"]
  client --- w
`);
    expect(svg).toContain("James");
  });

  test("renders system circles with labels", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  work [label: "Tech Corp", category: work]
  m --- work
`);
    expect(svg).toContain('class="lineage-ecomap-system-shape"');
    expect(svg).toContain("Tech Corp");
    expect(svg).toContain("lineage-ecomap-system-work");
  });

  test("renders category-specific CSS class", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  church [label: "Church", category: religion]
  m --- church
`);
    expect(svg).toContain("lineage-ecomap-system-religion");
  });

  test("renders category color styles", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  w [label: "W"]
  m --- w
`);
    expect(svg).toContain(".lineage-ecomap-system-work");
    expect(svg).toContain(".lineage-ecomap-system-health");
  });

  test("renders strong connection as parallel lines", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  mother [label: "Mom"]
  m === mother
`);
    expect(svg).toContain("lineage-ecomap-connection-strong");
    expect(svg).toContain("lineage-ecomap-eco-line-parallel");
  });

  test("renders weak connection as dashed line", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  doc [label: "Doc"]
  m - - doc
`);
    expect(svg).toContain("lineage-ecomap-connection-weak");
  });

  test("renders stressful connection as wavy path", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  ex [label: "Ex"]
  m ~~~ ex
`);
    expect(svg).toContain("lineage-ecomap-connection-stressful");
    expect(svg).toContain("lineage-ecomap-eco-line-stressful");
    // Wavy path uses Q (quadratic bezier)
    expect(svg).toMatch(/Q\s+[\d.-]+\s+[\d.-]+/);
  });

  test("renders broken connection", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  old [label: "Old"]
  m -/- old
`);
    expect(svg).toContain("lineage-ecomap-connection-broken");
  });

  test("renders arrow markers for energy flow", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  w [label: "Work"]
  m --> w
`);
    expect(svg).toContain("lineage-ecomap-eco-arrow");
    expect(svg).toContain("marker-end");
  });

  test("renders mutual flow with both markers", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  church [label: "Church"]
  m <-> church
`);
    expect(svg).toContain("marker-start");
    expect(svg).toContain("marker-end");
  });

  test("renders connection labels", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  w [label: "Work"]
  m --- w [label: "part-time"]
`);
    expect(svg).toContain("part-time");
    expect(svg).toContain("lineage-ecomap-eco-conn-label");
  });

  test("renders defs with arrow marker", () => {
    const svg = renderFromDSL(`
ecomap
  center: m [female]
  w [label: "W"]
  m --> w
`);
    expect(svg).toContain("<defs>");
    expect(svg).toContain("<marker");
    expect(svg).toContain('id="lineage-ecomap-eco-arrow"');
  });
});
