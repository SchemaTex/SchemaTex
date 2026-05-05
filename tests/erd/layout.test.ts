import { describe, test, expect } from "vitest";
import { parseErd } from "../../src/diagrams/erd/parser";
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

  test("edge has 4-point orthogonal path", () => {
    const ast = parseErd(`erd
table A { id int PK }
table B { id int PK; a_id int FK -> A.id }
ref B.a_id many-mandatory -- one-mandatory A.id`);
    const lay = layoutErd(ast);
    expect(lay.edges).toHaveLength(1);
    const path = lay.edges[0]!.path;
    // Manhattan: M ... L ... L ... L ...
    expect(path.split(" L ").length).toBe(4);
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
