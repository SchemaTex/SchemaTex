import { describe, expect, it } from "vitest";
import { renderEpc } from "../../src/diagrams/epc/renderer";
import { epc } from "../../src/diagrams/epc";

const ORDER = `epc "Order fulfilment"
  event E1 "Order received"
  function F1 "Check credit"
  xor X1
  event E2 "Credit OK"
  event E3 "Credit rejected"
  function F2 "Ship goods"
  function F3 "Notify customer"
  event E4 "Order shipped"
  event E5 "Order cancelled"
  E1 -> F1 -> X1
  X1 -> E2
  X1 -> E3
  E2 -> F2 -> E4
  E3 -> F3 -> E5`;

describe("epc renderer", () => {
  it("emits a semantic svg root with type + a11y", () => {
    const svg = renderEpc(ORDER);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('data-diagram-type="epc"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
  });

  it("renders events as polygons (hexagons), functions as rounded rects, connectors as circles", () => {
    const svg = renderEpc(ORDER);
    expect(svg).toContain('data-kind="event"');
    expect(svg).toContain('data-kind="function"');
    expect(svg).toContain('data-kind="connector"');
    expect(svg).toContain('data-operator="xor"');
    expect(svg).toContain("<polygon"); // hexagon events + arrowheads
    expect(svg).toContain("<circle"); // connectors
    expect(svg).toContain("rx"); // rounded function rects
  });

  it("uses the XOR glyph × on the connector", () => {
    expect(renderEpc(ORDER)).toContain("×");
  });

  it("has no inline style attributes", () => {
    const svg = renderEpc(ORDER);
    expect(svg).not.toMatch(/\sstyle=/);
  });

  it("draws control-flow edges with an arrowhead marker", () => {
    const svg = renderEpc(ORDER);
    expect(svg).toContain("sx-epc-arrowhead");
    expect(svg).toContain("marker-end");
  });

  it("flags a rule-violating node (event-sourced XOR split)", () => {
    const svg = renderEpc(`epc
  event E1 "Order received"
  xor X1
  event E2
  event E3
  E1 -> X1
  X1 -> E2
  X1 -> E3`);
    expect(svg).toContain('data-flagged="true"');
    expect(svg).toContain("events cannot decide");
  });

  it("plugin detect + render wire up", () => {
    expect(epc.detect("epc \"x\"")).toBe(true);
    expect(epc.detect("  EPC")).toBe(true);
    expect(epc.detect("bpmn")).toBe(false);
    expect(epc.render(ORDER)).toContain('data-diagram-type="epc"');
  });

  it("respects monochrome theme (shape-only, no salmon fill)", () => {
    const svg = renderEpc(ORDER, { theme: "monochrome" } as never);
    expect(svg).toContain("#ffffff");
    expect(svg).not.toContain("#f6a5b8");
  });
});
