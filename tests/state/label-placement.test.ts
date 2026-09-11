import { expect, it } from "vitest";
import { layoutStateDiagram } from "../../src/diagrams/state/layout";
import { parseStateDiagram } from "../../src/diagrams/state/parser";
import { estimateMaxLineWidth } from "../../src/core/text-metrics";
import { labelOverlap, type LabelBox } from "../../src/core/label-placement";

it("reserves transition labels against states and each other, and includes them in bounds", () => {
  const layout = layoutStateDiagram(parseStateDiagram(`stateDiagram-v2
state north: First phase
state south: Second phase
north --> south: request accepted
south --> north: request retried`));
  const occupied: LabelBox[] = [...layout.nodes];
  for (const edge of layout.edges) {
    const width = Math.max(20, Math.ceil(estimateMaxLineWidth(edge.label!, 11)) + 8);
    const height = edge.label!.split("\n").length * 14 + 2;
    const shift = edge.labelAnchor === "start" ? 0 : edge.labelAnchor === "end" ? width : width / 2;
    const box = { x: edge.labelX - shift, y: edge.labelY - height / 2, width, height };
    expect(occupied.every((other) => labelOverlap(box, other) === 0)).toBe(true);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + width).toBeLessThanOrEqual(layout.width);
    expect(box.y + height).toBeLessThanOrEqual(layout.height);
    occupied.push(box);
  }
});
