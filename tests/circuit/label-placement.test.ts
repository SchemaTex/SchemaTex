import { expect, it } from "vitest";
import { getSymbol } from "../../src/diagrams/circuit/symbols";
import { estimateTextWidth } from "../../src/core/text-metrics";
import { edgeLabelObstacles, labelOverlap, type LabelBox } from "../../src/core/label-placement";

it("places a selector's embedded position marking clear of its contacts and strokes", () => {
  const svg = getSymbol("switch_spdt_center_off")!.svg();
  const occupied: LabelBox[] = [];
  for (const tag of svg.matchAll(/<(line|circle)\b([^>]*)>/g)) {
    const attrs = Object.fromEntries([...tag[2].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    const n = (key: string) => Number(attrs[key]);
    if (tag[1] === "circle") occupied.push({ x: n("cx") - n("r"), y: n("cy") - n("r"), width: 2 * n("r"), height: 2 * n("r") });
    else occupied.push(...edgeLabelObstacles([{ x: n("x1"), y: n("y1") }, { x: n("x2"), y: n("y2") }]));
  }
  const text = /<text x="([^"]*)" y="([^"]*)"[^>]*>([^<]*)<\/text>/.exec(svg)!;
  expect(text).not.toBeNull();
  const box = { x: Number(text[1]), y: Number(text[2]) - 11, width: estimateTextWidth(text[3], 9), height: 13 };
  expect(occupied.every((other) => labelOverlap(box, other) === 0)).toBe(true);
});

it("finds space for a long caption outside congested local wire channels", async () => {
  const { placeLabels, labelBox } = await import('../../src/diagrams/circuit/schematic-layout');
  const items = [{ component: { id: 'R42', stableId: true, componentType: 'resistor' as const,
    direction: 'right' as const, label: 'Measured feedback network', value: '47 kilohm precision resistor' },
    x: 0, y: 0, rotation: 0, length: 40, anchors: {start: {x:0,y:0}, end:{x:40,y:0}},
    labelPos: undefined as {x:number;y:number}|undefined }];
  const routes = [-60,-20,60,100].map(x => ({netId:`net${x}`,points:[{x,y:-100},{x,y:100}]}));
  placeLabels(items, routes);
  const b=labelBox(items[0].component, items[0].labelPos!);
  for (const r of routes) {
    const x=r.points[0].x;
    expect(x < b.minX || x > b.maxX || b.maxY < -100 || b.minY > 100).toBe(true);
  }
});

it("keeps a clear caption closer to its own symbol than a neighbouring symbol", async () => {
  const { placeLabels, labelBox, boxOf } = await import('../../src/diagrams/circuit/schematic-layout');
  const items = [0, 80].map((y, index) => ({
    component: { id: `resistor${index}`, stableId: true, componentType: 'resistor' as const,
      direction: 'down' as const, value: '10k' },
    x: 0, y, rotation: 90, length: 40,
    anchors: { start: { x: 0, y }, end: { x: 0, y: y + 40 } },
    labelPos: index === 1 ? { x: 100, y: 20 } : undefined,
  }));
  placeLabels(items, []);
  const caption = labelBox(items[1].component, items[1].labelPos!);
  const center = { x: (caption.minX + caption.maxX) / 2, y: (caption.minY + caption.maxY) / 2 };
  const distance = (index: number) => {
    const box = boxOf(items[index], 0);
    return Math.hypot(center.x - Math.max(box.minX, Math.min(box.maxX, center.x)),
      center.y - Math.max(box.minY, Math.min(box.maxY, center.y)));
  };
  expect(distance(1)).toBeLessThan(distance(0));
});
