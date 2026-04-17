import { describe, test, expect } from "vitest";
import { parseEcomap } from "../../src/diagrams/ecomap/parser";
import { layoutEcomap } from "../../src/diagrams/ecomap/layout";

const defaultConfig = {
  nodeSpacingX: 80,
  nodeSpacingY: 100,
  nodeWidth: 40,
  nodeHeight: 40,
};

describe("ecomap layout", () => {
  test("places center node at canvas center", () => {
    const ast = parseEcomap(`
ecomap
  center: maria [female]
  work [label: "Job"]
  maria --- work
`);
    const layout = layoutEcomap(ast, defaultConfig);
    const center = layout.nodes.find((n) => n.id === "maria");
    expect(center).toBeDefined();

    const cx = center!.x + center!.width / 2;
    const cy = center!.y + center!.height / 2;
    expect(cx).toBeCloseTo(layout.width / 2, 0);
    expect(cy).toBeCloseTo(layout.height / 2, 0);
  });

  test("center node is larger than system nodes", () => {
    const ast = parseEcomap(`
ecomap
  center: maria [female]
  work [label: "Job"]
  maria --- work
`);
    const layout = layoutEcomap(ast, defaultConfig);
    const center = layout.nodes.find((n) => n.id === "maria");
    const sys = layout.nodes.find((n) => n.id === "work");
    expect(center!.width).toBeGreaterThan(sys!.width);
  });

  test("systems are placed on a ring around center", () => {
    const ast = parseEcomap(`
ecomap
  center: c [female]
  s1 [label: "A"]
  s2 [label: "B"]
  s3 [label: "C"]
  c --- s1
  c --- s2
  c --- s3
`);
    const layout = layoutEcomap(ast, defaultConfig);
    const center = layout.nodes.find((n) => n.id === "c")!;
    const ccx = center.x + center.width / 2;
    const ccy = center.y + center.height / 2;

    const systems = layout.nodes.filter((n) => n.id !== "c");
    expect(systems).toHaveLength(3);

    const distances = systems.map((s) => {
      const sx = s.x + s.width / 2;
      const sy = s.y + s.height / 2;
      return Math.sqrt((sx - ccx) ** 2 + (sy - ccy) ** 2);
    });

    // All systems equidistant from center (same ring)
    expect(distances[0]).toBeCloseTo(distances[1], 0);
    expect(distances[1]).toBeCloseTo(distances[2], 0);
  });

  test("generates edges from center to each system", () => {
    const ast = parseEcomap(`
ecomap
  center: c [female]
  s1 [label: "A"]
  s2 [label: "B"]
  c === s1
  c --- s2
`);
    const layout = layoutEcomap(ast, defaultConfig);
    expect(layout.edges).toHaveLength(2);

    for (const edge of layout.edges) {
      expect(edge.path).toMatch(/^M\s+[\d.-]+\s+[\d.-]+\s+L\s+[\d.-]+\s+[\d.-]+$/);
    }
  });

  test("edge paths are edge-to-edge (not center-to-center)", () => {
    const ast = parseEcomap(`
ecomap
  center: c [female]
  s1 [label: "A"]
  c --- s1
`);
    const layout = layoutEcomap(ast, defaultConfig);
    const center = layout.nodes.find((n) => n.id === "c")!;
    const sys = layout.nodes.find((n) => n.id === "s1")!;
    const edge = layout.edges[0];

    const ccx = center.x + center.width / 2;
    const ccy = center.y + center.height / 2;
    const scx = sys.x + sys.width / 2;
    const scy = sys.y + sys.height / 2;

    const m = edge.path.match(
      /M\s+([\d.-]+)\s+([\d.-]+)\s+L\s+([\d.-]+)\s+([\d.-]+)/
    )!;
    const [x1, y1, x2, y2] = [+m[1], +m[2], +m[3], +m[4]];

    // Edge start should be outside center circle
    const distFromCenter = Math.sqrt((x1 - ccx) ** 2 + (y1 - ccy) ** 2);
    expect(distFromCenter).toBeCloseTo(center.width / 2, 0);

    // Edge end should be outside system circle
    const distFromSys = Math.sqrt((x2 - scx) ** 2 + (y2 - scy) ** 2);
    expect(distFromSys).toBeCloseTo(sys.width / 2, 0);
  });

  test("handles center-only (no systems)", () => {
    const ast = parseEcomap(`ecomap\n  center: solo [female]`);
    const layout = layoutEcomap(ast, defaultConfig);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.edges).toHaveLength(0);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });

  test("strong connections place systems on inner ring", () => {
    const ast = parseEcomap(`
ecomap
  center: c [female]
  s1 [label: "Strong"]
  s2 [label: "Strong2"]
  s3 [label: "Strong3"]
  s4 [label: "Weak"]
  s5 [label: "Normal"]
  s6 [label: "Normal2"]
  s7 [label: "Normal3"]
  c === s1
  c === s2
  c === s3
  c - - s4
  c --- s5
  c --- s6
  c --- s7
`);
    const layout = layoutEcomap(ast, defaultConfig);
    const center = layout.nodes.find((n) => n.id === "c")!;
    const ccx = center.x + center.width / 2;
    const ccy = center.y + center.height / 2;

    const s1 = layout.nodes.find((n) => n.id === "s1")!;
    const s4 = layout.nodes.find((n) => n.id === "s4")!;

    const d1 = Math.sqrt(
      (s1.x + s1.width / 2 - ccx) ** 2 +
        (s1.y + s1.height / 2 - ccy) ** 2
    );
    const d4 = Math.sqrt(
      (s4.x + s4.width / 2 - ccx) ** 2 +
        (s4.y + s4.height / 2 - ccy) ** 2
    );

    // Strong systems should be closer than weak
    expect(d1).toBeLessThan(d4);
  });

  test("importance:major gives larger system node", () => {
    const ast = parseEcomap(`
ecomap
  center: c [female]
  big [label: "Big", importance: major]
  normal [label: "Normal"]
  c --- big
  c --- normal
`);
    const layout = layoutEcomap(ast, defaultConfig);
    const bigNode = layout.nodes.find((n) => n.id === "big")!;
    const normalNode = layout.nodes.find((n) => n.id === "normal")!;
    expect(bigNode.width).toBeGreaterThan(normalNode.width);
  });
});
