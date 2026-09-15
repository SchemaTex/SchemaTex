import { describe, test, expect } from "vitest";
import { parseErd } from "../../src/diagrams/erd/parser";
import { labelPathPoints } from "../../src/core/label-placement";
import { layoutErd } from "../../src/diagrams/erd/layout";

describe("erd layout", () => {
  test("two entities yield non-overlapping boxes", () => {
    const ast = parseErd(`erd
table A { id int PK }
table B { id int PK; a_id int FK -> A.id }
ref B.a_id many-mandatory -- one-mandatory A.id`);
    const lay = layoutErd(ast);
    expect(lay.entities).toHaveLength(2);
    const [a, b] = lay.entities;
    // No overlap: either disjoint x-ranges or disjoint y-ranges.
    const xDisjoint = a!.x + a!.width <= b!.x || b!.x + b!.width <= a!.x;
    const yDisjoint = a!.y + a!.height <= b!.y || b!.y + b!.height <= a!.y;
    expect(xDisjoint || yDisjoint).toBe(true);
  });

  test("LR direction places child to the right of parent", () => {
    const ast = parseErd(`erd
table A { id int PK }
table B { id int PK; a_id int FK -> A.id }
ref B.a_id many-mandatory -- one-mandatory A.id`);
    const lay = layoutErd(ast);
    const a = lay.entities.find((e) => e.entity.id === "A")!;
    const b = lay.entities.find((e) => e.entity.id === "B")!;
    // "one" side (A) should be left of "many" side (B).
    expect(a.x).toBeLessThan(b.x);
  });

  test("routes keep clearance from unrelated tables", () => {
    const ast = parseErd(`erd
      table A { id int PK }
      table B { id int PK }
      table C { id int PK }
      ref A one-mandatory -- many-mandatory B
      ref B one-mandatory -- many-mandatory C
      ref A one-mandatory -- many-mandatory C`);
    const layout = layoutErd(ast);
    const edge = layout.edges[2]!;
    const obstacle = layout.entities.find(e => e.entity.id === "B")!;
    const points = labelPathPoints(edge.path);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!, b = points[i]!;
      expect(a.x === b.x || a.y === b.y).toBe(true);
      const hits = a.x === b.x
        ? a.x > obstacle.x - 12 && a.x < obstacle.x + obstacle.width + 12 &&
          Math.max(a.y, b.y) > obstacle.y - 12 && Math.min(a.y, b.y) < obstacle.y + obstacle.height + 12
        : a.y > obstacle.y - 12 && a.y < obstacle.y + obstacle.height + 12 &&
          Math.max(a.x, b.x) > obstacle.x - 12 && Math.min(a.x, b.x) < obstacle.x + obstacle.width + 12;
      expect(hits).toBe(false);
    }
  });

  test("relationship text sits clear of its own line", () => {
    const layout = layoutErd(parseErd(`erd
      table A { id int PK }
      table B { id int PK }
      ref A one-mandatory -- many-mandatory B : owns`));
    const edge = layout.edges[0]!;
    const points = labelPathPoints(edge.path);
    expect(edge.labelAt).toBeDefined();
    // On this straight horizontal relationship, the complete text band is above the wire.
    expect(edge.labelAt!.y + 9).toBeLessThan(points[0]!.y);
  });

  test("svg width and height are positive", () => {
    const ast = parseErd(`erd
table A { id int PK; name varchar }
table B { id int PK; a_id int FK -> A.id }
ref B.a_id many-mandatory -- one-mandatory A.id`);
    const lay = layoutErd(ast);
    expect(lay.width).toBeGreaterThan(0);
    expect(lay.height).toBeGreaterThan(0);
  });
});
