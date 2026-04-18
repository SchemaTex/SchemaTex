import { describe, test, expect } from "vitest";
import { renderFlowchart } from "../../src/diagrams/flowchart/renderer";
import { flowchart } from "../../src/diagrams/flowchart";
import { render } from "../../src/core/api";

describe("flowchart renderer", () => {
  test("detect() recognizes 'flowchart' and 'graph'", () => {
    expect(flowchart.detect("flowchart TD\nA --> B")).toBe(true);
    expect(flowchart.detect("graph LR\nA --> B")).toBe(true);
    expect(flowchart.detect("genogram\nalice")).toBe(false);
  });

  test("produces an <svg> with data-diagram-type='flowchart'", () => {
    const svg = renderFlowchart("flowchart TD\nA --> B --> C");
    expect(svg).toContain("<svg");
    expect(svg).toContain('data-diagram-type="flowchart"');
    expect(svg).toContain('data-direction="TB"');
  });

  test("renders nodes with data-node-id attributes", () => {
    const svg = renderFlowchart("flowchart TD\nA[Alpha] --> B[Bravo]");
    expect(svg).toContain('data-node-id="A"');
    expect(svg).toContain('data-node-id="B"');
    expect(svg).toContain("Alpha");
    expect(svg).toContain("Bravo");
  });

  test("renders edges with data-edge-id and marker-end", () => {
    const svg = renderFlowchart("flowchart TD\nA --> B");
    expect(svg).toContain('data-from="A"');
    expect(svg).toContain('data-to="B"');
    expect(svg).toContain("sx-fc-arrow");
  });

  test("renders all 5 M1 shapes via data-shape attributes", () => {
    const svg = renderFlowchart(`flowchart LR
S([Start]) --> P[Process] --> D{Decision}
D --> I[/Input/] --> R(Round)`);
    expect(svg).toContain('data-shape="stadium"');
    expect(svg).toContain('data-shape="rect"');
    expect(svg).toContain('data-shape="diamond"');
    expect(svg).toContain('data-shape="parallelogram"');
    expect(svg).toContain('data-shape="round"');
  });

  test("escapes XML in labels", () => {
    const svg = renderFlowchart("flowchart TD\nA[X & Y] --> B");
    expect(svg).toContain("X &amp; Y");
    expect(svg).not.toContain("X & Y");
  });

  test("renders edge label with background pill", () => {
    const svg = renderFlowchart("flowchart TD\nA -->|yes| B");
    expect(svg).toContain("sx-fc-edge-label-bg");
    expect(svg).toContain(">yes<");
  });

  test("integrates with top-level render() dispatcher", () => {
    const svg = render("flowchart TD\nA --> B");
    expect(svg).toContain('data-diagram-type="flowchart"');
  });

  test("LR direction produces data-direction='LR'", () => {
    const svg = renderFlowchart("flowchart LR\nA --> B");
    expect(svg).toContain('data-direction="LR"');
  });

  test("titles are wrapped and XML-escaped in <title>", () => {
    const svg = renderFlowchart('flowchart TD "Workflow <v2>"\nA --> B');
    // <title> element exists at top of SVG
    expect(svg).toContain("<title>");
    expect(svg).toContain("Workflow &lt;v2&gt;");
  });
});
