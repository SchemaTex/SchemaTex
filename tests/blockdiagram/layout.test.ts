import { expect, test } from "vitest";
import { parseBlockDiagram } from "../../src/diagrams/blockdiagram/parser";
import { layoutBlockDiagram, findBlockDiagramCollisions } from "../../src/diagrams/blockdiagram/layout";

test("an auxiliary shortcut does not collapse successive processing stages", () => {
  const layout = layoutBlockDiagram(parseBlockDiagram(`blockdiagram
source = block("Source")
first = block("First stage")
second = block("Second stage")
source -> first ["first input"]
source -> second ["auxiliary control"]
first -> second ["processed result"]`));
  expect(layout.edges.every(e => (e.labelWidth ?? 0) > 0 && (e.labelHeight ?? 0) > 0)).toBe(true);
  expect(findBlockDiagramCollisions(layout).labelNode).toEqual([]);
  const byId = new Map(layout.nodes.map(n => [n.id, n]));
  expect(byId.get("second")!.kind).toBe("block");
  const first = byId.get("first")!, second = byId.get("second")!;
  if (first.kind === "block" && second.kind === "block") expect(second.x).toBeGreaterThan(first.x + first.width);
  expect(layout.edges.every(e => !e.isFeedback)).toBe(true);
});

test.each(["below", "above"])("feedback takeoff shares the forward wire and returns through the sensor (%s)", side => {
  const layout = layoutBlockDiagram(parseBlockDiagram(`blockdiagram
ref = block("Reference")
plant = block("Plant")
result = block("Result")
sensor = block("Sensor") [role: sensor, route: ${side}]
error = sum(+r, -f)
ref -> error
error -> plant
plant -> result
plant -> sensor
sensor -> error`));
  const plant = layout.nodes.find(n => n.id === "plant")!;
  const sensor = layout.nodes.find(n => n.id === "sensor")!;
  if (plant.kind !== "block" || sensor.kind !== "block") throw new Error("Expected blocks");
  const pickup = plant.branchPoint!;
  expect(pickup.x).toBeGreaterThan(plant.x + plant.width);
  expect(pickup.y).toBe(plant.y + plant.height / 2);
  const forward = layout.edges.find(e => e.from === "plant" && e.to === "result")!;
  const branch = layout.edges.find(e => e.to === "sensor")!;
  const back = layout.edges.find(e => e.from === "sensor")!;
  expect(forward.path).toContain(`M ${plant.x + plant.width} ${pickup.y}`);
  expect(branch.path).toContain(`M ${pickup.x} ${pickup.y} L ${pickup.x} ${sensor.y + sensor.height / 2}`);
  expect(branch.path).toContain(`L ${sensor.x + sensor.width} ${sensor.y + sensor.height / 2}`);
  expect(back.path).toContain(`M ${sensor.x} ${sensor.y + sensor.height / 2}`);
  expect(back.polarity).toMatchObject({ sign: "-", pin: side === "above" ? "top" : "bottom" });
  expect(findBlockDiagramCollisions(layout)).toEqual({ nodeNode: [], labelLabel: [], labelNode: [] });
});
