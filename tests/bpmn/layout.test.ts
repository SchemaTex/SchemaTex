import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseBpmn } from "../../src/diagrams/bpmn/parser";
import { layoutBpmn } from "../../src/diagrams/bpmn/layout";

const fixture = (name: string): string =>
  readFileSync(resolve(__dirname, "../fixtures/bpmn", name), "utf-8");

describe("bpmn layout", () => {
  it("places loan-approval objects inside their lane bands", () => {
    const ast = parseBpmn(fixture("loan-approval.bpmn"));
    const layout = layoutBpmn(ast);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.objects.length).toBe(8);

    // Every object's center sits inside its lane band y-range.
    for (const ol of layout.objects) {
      const lane = layout.lanes.find((l) => l.lane.id === ol.obj.laneId)!;
      const cy = ol.y + ol.height / 2;
      expect(cy).toBeGreaterThanOrEqual(lane.y);
      expect(cy).toBeLessThanOrEqual(lane.y + lane.height);
    }
  });

  it("layers objects by sequence flow (A < B < G1 < C)", () => {
    const ast = parseBpmn(fixture("loan-approval.bpmn"));
    const layout = layoutBpmn(ast);
    const xOf = (id: string): number => {
      const ol = layout.objects.find((o) => o.obj.id === id)!;
      return ol.x + ol.width / 2;
    };
    expect(xOf("A")).toBeLessThan(xOf("B"));
    expect(xOf("B")).toBeLessThan(xOf("G1"));
    expect(xOf("G1")).toBeLessThan(xOf("C"));
    expect(xOf("C")).toBeLessThan(xOf("D"));
  });

  it("renders parallel branches at distinct columns (and-gateway fan-out)", () => {
    const ast = parseBpmn(fixture("simple-service.bpmn"));
    const layout = layoutBpmn(ast);
    const xOf = (id: string) => {
      const ol = layout.objects.find((o) => o.obj.id === id)!;
      return ol.x;
    };
    // D and E both follow G; layout assigns them the same column.
    expect(Math.round(xOf("D"))).toBe(Math.round(xOf("E")));
  });

  it("stacks pools vertically (Customer above Pizzeria in pizza-order)", () => {
    const ast = parseBpmn(fixture("pizza-order.bpmn"));
    const layout = layoutBpmn(ast);
    const customer = layout.pools.find((p) => p.pool.label === "Customer")!;
    const pizzeria = layout.pools.find((p) => p.pool.label === "Pizzeria")!;
    expect(customer.y).toBeLessThan(pizzeria.y);
  });

  it("produces flow paths for every flow", () => {
    const ast = parseBpmn(fixture("loan-approval.bpmn"));
    const layout = layoutBpmn(ast);
    expect(layout.flows.length).toBe(ast.flows.length);
    for (const fl of layout.flows) {
      expect(fl.path.startsWith("M ")).toBe(true);
    }
  });
});
