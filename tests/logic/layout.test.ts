import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { layoutLogic } from "../../src/diagrams/logic/layout";
import { parseLogic } from "../../src/diagrams/logic/parser";

it("encloses module captions and pins, crops unused top space and routes select from below", () => {
  const layout = layoutLogic(parseLogic(readFileSync(new URL("../fixtures/regression/logic-registered-mux.sx", import.meta.url), "utf8")));
  const module = layout.modules[0];
  for (const id of ["m1", "Q"]) {
    const n = layout.nodes.find(n => n.id === id)!;
    expect(module.x).toBeLessThan(n.x - 12);
    expect(module.y).toBeLessThan(n.y - 18);
    expect(module.y + module.height).toBeGreaterThan(n.y + n.geometry!.height + 20);
  }
  expect(module.y).toBe(24);
  const mux = layout.nodes.find(n => n.id === "m1")!;
  const wire = layout.wires.find(w => w.fromNode === "SEL" && w.toNode === "m1")!;
  expect(wire.toY).toBe(mux.y + mux.geometry!.height);
  const points = [...wire.path.matchAll(/[ML] ([\d.-]+),([\d.-]+)/g)].map(m => ({ x: +m[1], y: +m[2] }));
  expect(points.at(-2)!.x).toBe(wire.toX);
  expect(points.at(-2)!.y).toBeGreaterThan(wire.toY);
});
