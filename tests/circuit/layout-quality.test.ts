import { expect, test } from "vitest";
import { isBetterRouting, measureRouting } from "../../src/diagrams/circuit/layout-quality";
const route = (netId: string, points: number[][]) => ({ netId, points: points.map(([x, y]) => ({ x: x!, y: y! })) });

test("shared same-net ink is counted once, regardless of segment splitting", () => {
  const quality = measureRouting([route("a", [[0, 0], [100, 0]]), route("a.branch", [[20, 0], [50, 0], [80, 0]])], ["a"]);
  expect(quality.length).toBe(100);
  expect(quality.overlap).toBe(0);
  expect(quality.crossings).toBe(0);
});

test("foreign overlap and crossings are distinguished", () => {
  const q = measureRouting([route("a", [[0, 0], [100, 0]]), route("b", [[20, 0], [80, 0]]), route("c", [[50, -20], [50, 20]])], ["a", "b", "c"]);
  expect(q.overlap).toBe(60);
  expect(q.crossings).toBe(2);
});

test("a junction on a foreign wire is a separate correctness violation", () => {
  const q = measureRouting([{ ...route("a", [[0, 0], [100, 0]]), junctions: [{ x: 50, y: 0 }] }, route("b", [[50, -20], [50, 20]])], ["a", "b"]);
  expect(q.junctionConflicts).toBe(1);
});

test("bends exclude redundant collinear vertices and net prefixes stay distinct", () => {
  const q = measureRouting([route("a.b", [[0, 0], [20, 0], [40, 0], [40, 20]])], ["a", "a.b"]);
  expect(q.bends).toBe(1);
  expect(q.length).toBe(60);
});

test("body and caption collisions cannot substitute for each other", () => {
  const box = { left: 20, right: 40, top: -10, bottom: 10 };
  const q = measureRouting([route("a", [[0, 0], [100, 0]])], ["a"], { obstacles: [box], captions: [box] });
  expect(q.bodyHits).toBe(1);
  expect(q.captionHits).toBe(1);
});

test("terminal entry must extend outward along the pin axis", () => {
  const leads = [{ net: "a", points: [{ x: 0, y: 0 }, { x: -18, y: 0 }] }];
  expect(measureRouting([route("a", [[0, 0], [0, 100]])], ["a"], { terminals: leads }).terminalTurns).toBe(1);
  expect(measureRouting([route("a", [[0, 0], [100, 0]])], ["a"], { terminals: leads }).terminalTurns).toBe(1);
  expect(measureRouting([route("a", [[-100, 0], [0, 0]])], ["a"], { terminals: leads }).terminalTurns).toBe(0);
});

test('removing a body collision takes priority over shorter wiring', () => {
  const obstacle={left:4,right:6,top:-1,bottom:1};
  const blocked=measureRouting([{netId:'n',points:[{x:0,y:0},{x:10,y:0}]}],['n'],{obstacles:[obstacle]});
  const clear=measureRouting([{netId:'n',points:[{x:0,y:0},{x:0,y:3},{x:10,y:3},{x:10,y:0}]}],['n'],{obstacles:[obstacle]});
  expect(clear.cost).toBeGreaterThan(blocked.cost);
  expect(isBetterRouting(clear,blocked)).toBe(true);
  expect(isBetterRouting(blocked,clear)).toBe(false);
});
