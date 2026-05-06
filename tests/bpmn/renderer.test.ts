import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderBpmn } from "../../src/diagrams/bpmn/renderer";

const fixture = (name: string): string =>
  readFileSync(resolve(__dirname, "../fixtures/bpmn", name), "utf-8");

describe("bpmn renderer", () => {
  it("renders SVG for loan-approval", () => {
    const svg = renderBpmn(fixture("loan-approval.bpmn"));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
    // Pool label
    expect(svg).toContain("Bank");
    // Sequence flow marker is referenced
    expect(svg).toContain("bpmn-arrow-seq");
    // X glyph for xor gateway present
    expect(svg).toContain("schematex-bpmn-gateway kind-xor");
  });

  it("renders message flow markers in pizza-order", () => {
    const svg = renderBpmn(fixture("pizza-order.bpmn"));
    expect(svg).toContain("bpmn-arrow-msg");
    expect(svg).toContain("bpmn-msg-start");
    expect(svg).toContain("kind-message");
    expect(svg).toContain("blackbox");
  });

  it("renders end events with thick stroke", () => {
    const svg = renderBpmn(fixture("loan-approval.bpmn"));
    expect(svg).toContain("kind-end");
  });

  it("renders parallel-and gateway with + glyph", () => {
    const svg = renderBpmn(fixture("simple-service.bpmn"));
    expect(svg).toContain("kind-and");
  });
});
