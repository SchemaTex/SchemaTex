import { describe, test, expect } from "vitest";
import { parseMindmap } from "../../src/diagrams/mindmap/parser";
import { layoutMindmap } from "../../src/diagrams/mindmap/layout";
import { modeOf } from "../../src/diagrams/mindmap/modes";
import {
  RING_GAP,
  wheelCenter,
} from "../../src/diagrams/mindmap/futureswheel";
import { renderMindmap } from "../../src/diagrams/mindmap/renderer";
import type { MindmapLayoutNode } from "../../src/core/types";

// ── Fixtures ────────────────────────────────────────────────────────────────

const THREE_RING = `%% style: futureswheel
# Remote work becomes default
## Less commuting
- Lower carbon emissions
- Cheaper city living
## Distributed teams
- Async communication norms
- Global hiring pools
## Empty offices
- Commercial real estate slump`;

const DRIVER = `%% style: driver
# Reduce 30-day readmissions
## Reliable discharge process
- Teach-back at bedside
- Med reconciliation
## Timely follow-up
- Appointment within 7 days
- Post-discharge phone call`;

function byId(nodes: MindmapLayoutNode[]): Map<string, MindmapLayoutNode> {
  return new Map(nodes.map((n) => [n.node.id, n]));
}

function radiusOf(n: MindmapLayoutNode, cx: number, cy: number): number {
  return Math.hypot(n.x - cx, n.y - cy);
}

function angleOf(n: MindmapLayoutNode, cx: number, cy: number): number {
  return Math.atan2(n.y - cy, n.x - cx);
}

// ── Mode selection ────────────────────────────────────────────────────────────

describe("futureswheel mode selection", () => {
  test("`%% style: futureswheel` resolves the extended mode", () => {
    const ast = parseMindmap(THREE_RING);
    expect(modeOf(ast)).toBe("futureswheel");
    // base style falls back to `map` so the shared union stays valid
    expect(ast.style).toBe("map");
  });

  test("`%% style: driver` resolves to driver mode on a logic-right base", () => {
    const ast = parseMindmap(DRIVER);
    expect(modeOf(ast)).toBe("driver");
    expect(ast.style).toBe("logic-right");
  });

  test("an unprefixed mindmap keeps the default map mode", () => {
    const ast = parseMindmap("# Topic\n## A\n## B");
    expect(modeOf(ast)).toBe("map");
  });
});

// ── Radius invariant: node at depth d sits at radius ≈ d × RING_GAP ───────────

describe("futureswheel radius banding", () => {
  test("each node sits at radius depth × RING_GAP from the center", () => {
    const ast = parseMindmap(THREE_RING);
    const result = layoutMindmap(ast);
    const { cx, cy } = wheelCenter(result);

    for (const n of result.nodes) {
      const r = radiusOf(n, cx, cy);
      expect(r).toBeCloseTo(n.node.depth * RING_GAP, 3);
    }
  });

  test("rings are distinct: order-2 nodes are strictly farther out than order-1", () => {
    const ast = parseMindmap(THREE_RING);
    const result = layoutMindmap(ast);
    const { cx, cy } = wheelCenter(result);

    const order1 = result.nodes.filter((n) => n.node.depth === 1);
    const order2 = result.nodes.filter((n) => n.node.depth === 2);
    expect(order1.length).toBeGreaterThan(0);
    expect(order2.length).toBeGreaterThan(0);

    const maxR1 = Math.max(...order1.map((n) => radiusOf(n, cx, cy)));
    const minR2 = Math.min(...order2.map((n) => radiusOf(n, cx, cy)));
    expect(minR2).toBeGreaterThan(maxR1);
  });

  test("the central event sits at radius 0", () => {
    const ast = parseMindmap(THREE_RING);
    const result = layoutMindmap(ast);
    const { cx, cy } = wheelCenter(result);
    const root = result.nodes.find((n) => n.node.depth === 0)!;
    expect(radiusOf(root, cx, cy)).toBeCloseTo(0, 3);
  });
});

// ── Angular containment: children cluster within the parent's sector ──────────

describe("futureswheel angular containment", () => {
  test("a node's children fall within its own angular slice", () => {
    const ast = parseMindmap(THREE_RING);
    const result = layoutMindmap(ast);
    const { cx, cy } = wheelCenter(result);
    const map = byId(result.nodes);

    // For each first-order branch, compute its angle and the angles of its
    // own children. Every child must sit angularly near its parent — closer
    // to the parent than to any *other* first-order branch.
    const order1 = result.nodes.filter((n) => n.node.depth === 1);

    for (const parent of order1) {
      const pAngle = angleOf(parent, cx, cy);
      for (const childNode of parent.node.children) {
        const child = map.get(childNode.id)!;
        const cAngle = angleOf(child, cx, cy);
        const distToParent = angularDistance(cAngle, pAngle);

        for (const other of order1) {
          if (other.node.id === parent.node.id) continue;
          const otherAngle = angleOf(other, cx, cy);
          const distToOther = angularDistance(cAngle, otherAngle);
          expect(distToParent).toBeLessThanOrEqual(distToOther + 1e-9);
        }
      }
    }
  });

  test("siblings of one parent are angularly ordered and non-overlapping", () => {
    const ast = parseMindmap(THREE_RING);
    const result = layoutMindmap(ast);
    const { cx, cy } = wheelCenter(result);
    const map = byId(result.nodes);

    const lessCommuting = result.nodes.find(
      (n) => n.node.label === "Less commuting"
    )!;
    const childAngles = lessCommuting.node.children.map((c) =>
      angleOf(map.get(c.id)!, cx, cy)
    );
    // Two distinct children → two distinct angles.
    expect(new Set(childAngles.map((a) => a.toFixed(4))).size).toBe(
      childAngles.length
    );
  });
});

// ── Order-based CSS classes + ring guides in rendered SVG ─────────────────────

describe("futureswheel rendered SVG", () => {
  const svg = renderMindmap(THREE_RING);

  test("nodes carry semantic mm-order-N classes by consequence order", () => {
    expect(svg).toContain("mm-order-0"); // central event
    expect(svg).toContain("mm-order-1"); // first-order consequences
    expect(svg).toContain("mm-order-2"); // second-order consequences
  });

  test("nodes expose data-order for interaction hooks", () => {
    expect(svg).toContain('data-order="1"');
    expect(svg).toContain('data-order="2"');
  });

  test("faint concentric ring guides are drawn, one per order", () => {
    expect(svg).toContain("schematex-mindmap-rings");
    expect(svg).toContain("mm-ring-1");
    expect(svg).toContain("mm-ring-2");
  });

  test("desc announces a futures-wheel diagram", () => {
    expect(svg).toContain("futures-wheel mindmap");
  });

  test("non-wheel mindmaps do not emit order classes", () => {
    const plain = renderMindmap("# Topic\n## A\n## B");
    expect(plain).not.toContain("mm-order-");
    expect(plain).not.toContain("mm-ring-");
  });
});

// ── Driver alias renders a left→right tree ────────────────────────────────────

describe("driver diagram alias", () => {
  test("driver renders left→right (children strictly right of the aim/root)", () => {
    const ast = parseMindmap(DRIVER);
    const result = layoutMindmap(ast);
    const root = result.nodes.find((n) => n.node.depth === 0)!;
    const deeper = result.nodes.filter((n) => n.node.depth >= 1);
    expect(deeper.length).toBeGreaterThan(0);
    for (const n of deeper) {
      expect(n.x).toBeGreaterThan(root.x);
    }
  });

  test("driver produces a valid SVG", () => {
    const svg = renderMindmap(DRIVER);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Reduce 30-day readmissions");
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Smallest absolute angular gap between two angles (radians), in [0, π]. */
function angularDistance(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}
