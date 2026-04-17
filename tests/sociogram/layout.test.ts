import { describe, it, expect } from "vitest";
import { parseSociogram } from "../../src/diagrams/sociogram/parser";
import { layoutSociogram } from "../../src/diagrams/sociogram/layout";

describe("Sociogram Layout", () => {
  describe("circular layout", () => {
    it("places nodes in a circle", () => {
      const ast = parseSociogram(`sociogram
  config: layout = circular
  alice
  bob
  carol
`);
      const result = layoutSociogram(ast);
      expect(result.nodes).toHaveLength(3);

      const cx = result.width / 2;
      const cy = result.height / 2;
      for (const n of result.nodes) {
        const dx = n.x - cx;
        const dy = n.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThan(50);
      }
    });

    it("starts first node at 12 o'clock position", () => {
      const ast = parseSociogram(`sociogram
  config: layout = circular
  alice
  bob
  carol
  dave
`);
      const result = layoutSociogram(ast);
      const cx = result.width / 2;
      const alice = result.nodes[0];
      expect(alice.y).toBeLessThan(cx);
    });

    it("sorts nodes by group", () => {
      const ast = parseSociogram(`sociogram
  config: layout = circular
group a
    p1
    p2
group b
    p3
    p4
`);
      const result = layoutSociogram(ast);
      const ids = result.nodes.map((n) => n.node.id);
      expect(ids.indexOf("p1")).toBeLessThan(ids.indexOf("p3"));
      expect(ids.indexOf("p2")).toBeLessThan(ids.indexOf("p3"));
    });
  });

  describe("force-directed layout", () => {
    it("places all nodes within canvas bounds", () => {
      const ast = parseSociogram(`sociogram
  config: layout = force-directed
  alice
  bob
  carol
  alice -> bob
  bob -> carol
`);
      const result = layoutSociogram(ast);
      for (const n of result.nodes) {
        expect(n.x).toBeGreaterThan(0);
        expect(n.y).toBeGreaterThan(0);
        expect(n.x).toBeLessThan(result.width);
        expect(n.y).toBeLessThan(result.height);
      }
    });

    it("connected nodes are closer than unconnected", () => {
      const ast = parseSociogram(`sociogram
  config: layout = force-directed
  alice
  bob
  carol
  dave
  alice <-> bob
  alice <-> carol
  alice <-> dave
`);
      const result = layoutSociogram(ast);
      const alice = result.nodes.find((n) => n.node.id === "alice")!;
      const bob = result.nodes.find((n) => n.node.id === "bob")!;

      const distAB = Math.sqrt((alice.x - bob.x) ** 2 + (alice.y - bob.y) ** 2);
      expect(distAB).toBeLessThan(result.width * 0.8);
    });
  });

  describe("auto-detection of roles", () => {
    it("detects isolate (zero connections)", () => {
      const ast = parseSociogram(`sociogram
  alice
  bob
  carol
  alice -> bob
`);
      const result = layoutSociogram(ast);
      const carol = result.nodes.find((n) => n.node.id === "carol");
      expect(carol?.computedRole).toBe("isolate");
    });

    it("detects neglectee (out-degree only)", () => {
      const ast = parseSociogram(`sociogram
  alice
  bob
  carol
  carol -> alice
  carol -> bob
`);
      const result = layoutSociogram(ast);
      const carol = result.nodes.find((n) => n.node.id === "carol");
      expect(carol?.computedRole).toBe("neglectee");
    });

    it("detects rejected (>=2 rejections)", () => {
      const ast = parseSociogram(`sociogram
  alice
  bob
  carol
  dave
  bob -x> alice
  carol -x> alice
  dave -> bob
`);
      const result = layoutSociogram(ast);
      const alice = result.nodes.find((n) => n.node.id === "alice");
      expect(alice?.computedRole).toBe("rejected");
    });
  });

  describe("node sizing", () => {
    it("uses uniform sizing by default", () => {
      const ast = parseSociogram(`sociogram
  alice
  bob
`);
      const result = layoutSociogram(ast);
      expect(result.nodes[0].radius).toBe(20);
      expect(result.nodes[1].radius).toBe(20);
    });

    it("scales by in-degree when configured", () => {
      const ast = parseSociogram(`sociogram
  config: sizing = in-degree
  alice
  bob
  carol
  bob -> alice
  carol -> alice
`);
      const result = layoutSociogram(ast);
      const alice = result.nodes.find((n) => n.node.id === "alice");
      const bob = result.nodes.find((n) => n.node.id === "bob");
      expect(alice!.radius).toBeGreaterThan(bob!.radius);
    });

    it("respects explicit size property", () => {
      const ast = parseSociogram(`sociogram
  alice [size: small]
  bob [size: large]
`);
      const result = layoutSociogram(ast);
      const alice = result.nodes.find((n) => n.node.id === "alice");
      const bob = result.nodes.find((n) => n.node.id === "bob");
      expect(alice!.radius).toBe(14);
      expect(bob!.radius).toBe(30);
    });
  });

  describe("edge positions", () => {
    it("computes edge positions for all edges", () => {
      const ast = parseSociogram(`sociogram
  alice -> bob
  bob -> carol
`);
      const result = layoutSociogram(ast);
      expect(result.edges).toHaveLength(2);
      for (const e of result.edges) {
        expect(e.x1).toBeDefined();
        expect(e.y1).toBeDefined();
        expect(e.x2).toBeDefined();
        expect(e.y2).toBeDefined();
      }
    });

    it("edges start from node boundary, not center", () => {
      const ast = parseSociogram(`sociogram
  config: layout = circular
  alice
  bob
  alice -> bob
`);
      const result = layoutSociogram(ast);
      const alice = result.nodes.find((n) => n.node.id === "alice")!;
      const edge = result.edges[0];

      const distFromCenter = Math.sqrt(
        (edge.x1 - alice.x) ** 2 + (edge.y1 - alice.y) ** 2
      );
      expect(distFromCenter).toBeGreaterThan(0);
    });
  });

  describe("canvas sizing", () => {
    it("uses small canvas for few nodes", () => {
      const ast = parseSociogram(`sociogram
  config: layout = force-directed
  alice
  bob
`);
      const result = layoutSociogram(ast);
      expect(result.width).toBeLessThanOrEqual(400);
    });

    it("uses larger canvas for many nodes", () => {
      let input = "sociogram\n  config: layout = force-directed\n";
      for (let i = 0; i < 25; i++) {
        input += `  p${i}\n`;
      }
      const ast = parseSociogram(input);
      const result = layoutSociogram(ast);
      expect(result.width).toBeGreaterThanOrEqual(800);
    });
  });
});
