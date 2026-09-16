import { describe, it, expect } from "vitest";
import { parseIdef0 } from "../../src/diagrams/idef0/parser";
import { layoutIdef0 } from "../../src/diagrams/idef0/layout";
import { renderIdef0, renderIdef0Layout } from "../../src/diagrams/idef0/renderer";
import { idef0 } from "../../src/diagrams/idef0";

const SRC = `
idef0 "Manufacture product"
node A0
function A1 "Plan production"
function A2 "Make parts"
function A3 "Assemble product"
input     A1 "Sales orders"
control   A1 "Production schedule"
A1 -> A2 "Work plan"
input     A2 "Raw material"
mechanism A2 "CNC machines"
A2 -> A3.control "Spec"
A2 -> A3 "Finished parts"
output    A3 "Product"
mechanism A3 "Assembly line"
`.trim();

describe("idef0 renderer", () => {
  it("produces a semantic SVG with title/desc and no inline style", () => {
    const svg = renderIdef0(SRC);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain('data-diagram-type="idef0"');
    // No inline style attributes (style lives in a <style> block).
    expect(/\sstyle="/.test(svg)).toBe(false);
  });

  it("renders each box with its lower-right number", () => {
    const svg = renderIdef0(SRC);
    expect(svg).toContain('class="sx-idef0-box-num"');
    expect(svg).toContain('data-number="1"');
    expect(svg).toContain('data-number="3"');
  });

  it("tags arrows with their ICOM role + side", () => {
    const svg = renderIdef0(SRC);
    expect(svg).toContain('data-role="control"');
    expect(svg).toContain('data-side="top"');
    expect(svg).toContain('data-role="mechanism"');
    expect(svg).toContain('data-side="bottom"');
    expect(svg).toContain('data-role="input"');
    expect(svg).toContain('data-side="left"');
    expect(svg).toContain('data-role="output"');
    expect(svg).toContain('data-side="right"');
  });

  it("emits ICOM boundary codes", () => {
    const svg = renderIdef0(SRC);
    expect(svg).toContain('data-icom="I1"');
    expect(svg).toContain('data-icom="O1"');
  });

  it("draws the title block with the node number", () => {
    const svg = renderIdef0(SRC);
    expect(svg).toContain('class="sx-idef0-titleblock"');
    expect(svg).toContain(">A0<");
    expect(svg).toContain(">NODE<");
  });

  it("includes arrow labels at the open ends", () => {
    const svg = renderIdef0(SRC);
    expect(svg).toContain("Sales orders");
    expect(svg).toContain("CNC machines");
    expect(svg).toContain("Product");
  });

  it("plugin detect matches an idef0 header", () => {
    expect(idef0.detect("idef0 \"x\"")).toBe(true);
    expect(idef0.detect("  IDEF0\nfoo")).toBe(true);
    expect(idef0.detect("flowchart")).toBe(false);
  });

  it("e2e: full text → SVG is stable & escapes XML", () => {
    const svg = renderIdef0(`idef0 "A & B"\nfunction A1 "x < y"\nfunction A2 "p"\nfunction A3 "q"`);
    expect(svg).toContain("A &amp; B");
    expect(svg).toContain("x &lt; y");
  });
});

it("keeps incoming arrowhead triangles outside the receiving box", () => {
  const source = `idef0 "Entry directions"
function X "Review"
control X "Policy"
input X "Request"
mechanism X "Reviewer"`;
  const layout = layoutIdef0(parseIdef0(source));
  const svg = renderIdef0Layout(layout);
  const triangles = [...svg.matchAll(/<polygon[^>]*points="([^"]+)"[^>]*class="sx-idef0-head"/g)]
    .map(match => (match[1] ?? "").split(" ").map(pair => pair.split(",").map(Number)));
  const box = layout.boxes[0];
  expect(box).toBeDefined();
  expect(triangles).toHaveLength(3);
  expect(triangles[0]?.every(point => (point[1] ?? Infinity) <= (box?.y ?? 0))).toBe(true);
  expect(triangles[1]?.every(point => (point[0] ?? Infinity) <= (box?.x ?? 0))).toBe(true);
  expect(triangles[2]?.every(point => (point[1] ?? -Infinity) >= (box?.y ?? 0) + (box?.height ?? 0))).toBe(true);
});
