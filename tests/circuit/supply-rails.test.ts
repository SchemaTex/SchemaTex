import { describe, expect, it } from "vitest";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { schematicNetlistLayout } from "../../src/diagrams/circuit/schematic-layout";

function layoutSupplies(sources: string[], nets: string[], ground = "") {
  const loads = nets.flatMap((net, index) => [
    `R${index}a ${net} signal${index} 1k`,
    `R${index}b signal${index} 0 2k`,
    `C${index} ${net} 0 100n`,
  ]);
  return schematicNetlistLayout(parseNetlist([...sources, ...loads, ground].join("\n")))!;
}

function railY(layout: ReturnType<typeof layoutSupplies>, net: string): number {
  const rail = layout.routes.find((route) => route.netId === net && route.points.length === 2 &&
    route.points[0].y === route.points[1].y && route.points[0].x !== route.points[1].x);
  expect(rail, `horizontal rail for ${net}`).toBeDefined();
  return rail!.points[0].y;
}

describe("supply rail drafting order", () => {
  it.each([false, true])("orders signed voltages independent of declaration order (reverse=%s)", (reverse) => {
    const sources = [
      'V1 copper 0 value="-12 V"',
      'V2 0 amber value="5 V"',
      'V3 violet 0 value="+12 V"',
      'V4 silver 0 value="5000 mV"',
    ];
    const layout = layoutSupplies(reverse ? sources.reverse() : sources, ["copper", "amber", "violet", "silver"]);
    const heights = ["violet", "silver", "amber", "copper", "GND"].map((net) => railY(layout, net));
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    expect(new Set(heights).size).toBe(heights.length);
  });

  it("uses terminal polarity when source voltages are unspecified", () => {
    const layout = layoutSupplies(["V1 0 left", "V2 right 0"], ["left", "right"]);
    expect(railY(layout, "right")).toBeLessThan(railY(layout, "left"));
    expect(railY(layout, "left")).toBeLessThan(railY(layout, "GND"));
  });

  it("computes rail potentials through series supplies", () => {
    const layout = layoutSupplies(["V1 upper middle 5V", "V2 middle 0 12V"], ["middle", "upper"]);
    expect(railY(layout, "upper")).toBeLessThan(railY(layout, "middle"));
  });

  it.each(["", "G1 0 type=ground"])("attaches synthesized and explicit ground terminals directly to the return (%s)", (ground) => {
    const layout = layoutSupplies(["V1 rail 0 9V"], ["rail"], ground);
    const y = railY(layout, "GND");
    const grounds = layout.items.filter((item) => item.component.componentType === "ground");
    expect(grounds).toHaveLength(1);
    const anchor = grounds[0].anchors.start;
    expect(anchor.y).toBe(y);
    const rail = layout.routes.find((route) => route.netId === "GND" && route.points[0].y === y)!;
    expect(anchor.x).toBeGreaterThanOrEqual(rail.points[0].x);
    expect(anchor.x).toBeLessThanOrEqual(rail.points.at(-1)!.x);
    expect(rail.junctions).toContainEqual(anchor);
  });
});
