import { expect, it } from "vitest";
import { render } from "../../src/core/api";
import { layoutNetwork } from "../../src/diagrams/network/layout";
import { parseNetwork } from "../../src/diagrams/network/parser";
import { renderNetworkLayout } from "../../src/diagrams/network/renderer";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { schematicNetlistLayout } from "../../src/diagrams/circuit/schematic-layout";
import { obstacleFreeRoute, orthogonalRoute } from "../../src/diagrams/logic/orthogonal-router";

it("renders logic whose fan-out exhausts obstacle-free routes", () => {
  const gates = Array.from({ length: 12 }, (_, i) => `G${i}`);
  const svg = render(`logic\ninput A,B,C\noutput Z\n${gates.map(id => `${id} = AND(A,B,C)`).join("\n")}\nZ = OR(${gates.join(",")})`);
  expect(svg).toContain("<svg");
  expect(svg).toContain('data-to="Z"');
});

it("renders an ERD after relationships occupy every terminal escape", () => {
  const svg = render(`erd\ntable A { id int PK }\ntable B { id int PK }\n${Array.from({ length: 30 }, () => "ref A one-mandatory -- many-mandatory B").join("\n")}`);
  expect(svg).toContain("<svg");
  expect(svg.match(/class="lt-erd-edge"/g)).toHaveLength(30);
});

it("renders a network with every source terminal blocked by devices", () => {
  const ast = parseNetwork("network\nswitch a\nswitch b\nswitch c\nswitch d\nswitch e\nswitch f\na -- b");
  const pins = new Map(Object.entries({ a: { x: 100, y: 100 }, b: { x: 300, y: 100 },
    c: { x: 100, y: 90 }, d: { x: 100, y: 110 }, e: { x: 90, y: 100 }, f: { x: 110, y: 100 } }));
  const layout = layoutNetwork(ast, pins);
  expect(layout.links).toHaveLength(1);
  expect(renderNetworkLayout(layout)).toContain("<svg");
});

it("returns an orthogonal path even with a port inside an obstacle", () => {
  const start = { x: 0, y: 0 }, end = { x: 100, y: 100 };
  const boxes = [{ left: -10, right: 10, top: -10, bottom: 10 }];
  expect(() => obstacleFreeRoute(start, end, boxes)).toThrow("blocked ports");
  const points = orthogonalRoute(start, end, boxes);
  expect(points[0]).toEqual(start);
  expect(points.at(-1)).toEqual(end);
  for (let i = 1; i < points.length; i++) {
    expect(points[i - 1]!.x === points[i]!.x || points[i - 1]!.y === points[i]!.y).toBe(true);
  }
});

it("renders physical bus trunks whose clean routes must detour", () => {
  const dsl = `circuit netlist\n${[1, 2, 3, 4].map(i =>
    `U${i} A B C D type=ic pins="A:bidirectional,B:bidirectional,C:bidirectional,D:bidirectional"`).join("\n")}\nbus A,B: U1 -> U2\nbus C,D: U3 -> U4`;
  expect(render(dsl)).toContain("<svg");
  const layout = schematicNetlistLayout(parseNetlist(dsl))!;
  for (const net of ["A", "B", "C", "D"]) {
    const trunk = layout.routes.find(route => route.netId === net)!;
    expect(trunk.points.every(point => point.y === trunk.points[0]!.y)).toBe(true);
    for (const join of trunk.junctions ?? []) {
      expect(join.y).toBe(trunk.points[0]!.y);
      expect(join.x).toBeGreaterThanOrEqual(Math.min(...trunk.points.map(point => point.x)));
      expect(join.x).toBeLessThanOrEqual(Math.max(...trunk.points.map(point => point.x)));
    }
  }
});
