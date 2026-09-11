import { expect, it } from "vitest";
import { parseSLDDSL } from "../../src/diagrams/sld/parser";
import { renderSLD } from "../../src/diagrams/sld/renderer";
import { layoutSLD } from "../../src/diagrams/sld/layout";

const points = (path: string) =>
  [...path.matchAll(/[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => ({
    x: +m[1],
    y: +m[2],
  }));
it("connects each bus feeder directly at its own tap", () => {
  const layout = layoutSLD(
    parseSLDDSL(
      `sld\ns = utility\nb = bus\na = breaker\nz = breaker\ns -> b\nb -> a\nb -> z`,
    ),
  );
  for (const edge of layout.edges.filter((e) => e.from === "b")) {
    const path = points(edge.path),
      child = layout.nodeById.get(edge.to)!;
    expect(path[0].x).toBe(child.x);
    expect(path.every((p) => p.x === child.x)).toBe(true);
  }
});
it("keeps ATS supply connections on separate input terminals", () => {
  const layout = layoutSLD(
    parseSLDDSL(
      `sld\na = utility\nb = generator\nt = ats\nl = load\na -> t\nb -> t\nt -> l`,
    ),
  );
  const inputs = layout.edges
    .filter((e) => e.to === "t")
    .map((e) => points(e.path).at(-1)!);
  expect(Math.abs(inputs[0].x - inputs[1].x)).toBeGreaterThan(20);
});
it("keeps sibling terminal busbars and their labels separate", () => {
  const layout = layoutSLD(
    parseSLDDSL(
      `sld\ns = utility\na = bus [label: "One distribution system"]\nb = bus [label: "Other distribution system"]\ns -> a\ns -> b`,
    ),
  );
  const a = layout.nodeById.get("a")!,
    b = layout.nodeById.get("b")!;
  expect(Math.abs(a.x - b.x)).toBeGreaterThan(100);
  expect(a.busRight! < b.busLeft! || b.busRight! < a.busLeft!).toBe(true);
});
it("does not paint a voltage band across unrelated source voltages", () => {
  const layout = layoutSLD(
    parseSLDDSL(
      `sld\na = utility [voltage: "11kV"]\nb = generator [voltage: "400V"]\nt = ats\na -> t\nb -> t`,
    ),
  );
  expect(layout.nodes.flatMap((n) => n.labels).map((l) => l.text)).toEqual(
    expect.arrayContaining(["11kV", "400V"]),
  );
  expect(
    renderSLD(
      parseSLDDSL(
        `sld\na = utility [voltage: "11kV"]\nb = generator [voltage: "400V"]\nt = ats\na -> t\nb -> t`,
      ),
    ),
  ).not.toContain("lt-sld-band");
});
it("treats a relay-to-breaker control link as lateral, without ranking the relay as a power source", () => {
  const layout = layoutSLD(
    parseSLDDSL(
      `sld\ns = utility\nb = breaker\nr = relay\nl = load\ns -> b\nb -> l\nr -> b`,
    ),
  );
  expect(layout.nodeById.get("r")!.level).toBe(layout.nodeById.get("b")!.level);
  expect(layout.nodeById.get("s")!.x).toBe(layout.nodeById.get("b")!.x);
});
it("does not externally join independent supplies at a generic multi-input load", () => {
  const l = layoutSLD(
    parseSLDDSL(
      `sld\na = utility\nb = load\nc = load\nx = load\na -> x\nb -> x\nc -> x`,
    ),
  );
  const ends = l.edges.map((e) => points(e.path).at(-1)!);
  expect(new Set(ends.map((p) => p.x)).size).toBe(3);
});
it("keeps every device of independent power systems in a separate horizontal region", () => {
  const l = layoutSLD(
    parseSLDDSL(
      `sld\na = generator\nb = bus\nc = load\nx = generator\ny = breaker\nz = bus\nw = load\na -> b\nb -> c\nx -> y\ny -> z\nz -> w`,
    ),
  );
  const left = l.nodes.filter((n) => ["a", "b", "c"].includes(n.node.id)),
    right = l.nodes.filter((n) => !["a", "b", "c"].includes(n.node.id));
  expect(
    Math.max(...left.map((n) => n.busRight ?? n.x + n.halfWidth)),
  ).toBeLessThan(Math.min(...right.map((n) => n.busLeft ?? n.x - n.halfWidth)));
});
it("keeps a series feeder in one column with unseen caption lengths", () => {
  const l = layoutSLD(
    parseSLDDSL(
      `sld\nb = bus\na = breaker [label: "Large processing equipment feeder"]\nc = switch\nd = relay\ne = motor [label: "Pumping station"]\nx = breaker\ny = motor\nb -> a\na -> c\nc -> d\nd -> e\nb -> x\nx -> y`,
    ),
  );
  expect(
    new Set(["a", "c", "d", "e"].map((id) => l.nodeById.get(id)!.x)).size,
  ).toBe(1);
});

it("keeps terminal net identities separate across disconnected systems", () => {
  const l = layoutSLD(
    parseSLDDSL(`sld
a = utility
b = load
x = generator
y = load
a -> b
x -> y`),
  );
  expect(l.edges[0].net).not.toBe(l.edges[1].net);
});
it("attaches a bus tie laterally without hiding feeder taps", () => {
  const l = layoutSLD(
    parseSLDDSL(`sld
s = utility
g = generator
a = bus
b = bus
t = bus_tie
x = load
y = load
s -> a
g -> b
a -> t
t -> b
a -> x
b -> y`),
  );
  const a = l.nodeById.get("a")!,
    b = l.nodeById.get("b")!,
    t = l.nodeById.get("t")!;
  expect(a.y).toBe(b.y);
  expect(t.y).toBe(a.y);
  for (const edge of l.edges.filter((e) => e.from === "t" || e.to === "t")) {
    expect(points(edge.path).every((p) => p.y === t.y)).toBe(true);
  }
  for (const [bus, child] of [
    [a, "x"],
    [b, "y"],
  ] as const) {
    const x = l.nodeById.get(child)!.x;
    expect(x).toBeGreaterThanOrEqual(bus.busLeft!);
    expect(x).toBeLessThanOrEqual(bus.busRight!);
  }
});

it("keeps geometry unchanged when opaque device IDs are renamed", () => {
  const ast = parseSLDDSL(`sld
s = utility [label: "Incoming service"]
b = bus [label: "Distribution"]
a = breaker [label: "Feeder"]
z = motor [label: "Pump"]
s -> b
b -> a
a -> z`);
  const renamed = new Map(ast.nodes.map((n, i) => [n.id, `opaque_${i}`]));
  const changed = {
    ...ast,
    nodes: ast.nodes.map((n) => ({ ...n, id: renamed.get(n.id)! })),
    connections: ast.connections.map((e) => ({
      ...e,
      from: renamed.get(e.from)!,
      to: renamed.get(e.to)!,
    })),
  };
  const a = layoutSLD(ast),
    b = layoutSLD(changed);
  expect(b.nodes.map((n) => [n.x, n.y])).toEqual(
    a.nodes.map((n) => [n.x, n.y]),
  );
  expect(b.edges.map((e) => e.path)).toEqual(a.edges.map((e) => e.path));
});
