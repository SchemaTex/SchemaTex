import { describe, test, expect } from "vitest";
import { parseErd } from "../../src/diagrams/erd/parser";
import { erd } from "../../src/diagrams/erd";

describe("erd — Mermaid erDiagram compatibility", () => {
  test("detect() accepts the Mermaid header", () => {
    expect(erd.detect("erDiagram\nA ||--o{ B : has")).toBe(true);
    expect(erd.detect("erd\ntable A { id int PK }")).toBe(true);
  });

  test("bare relationships auto-create entities with correct cardinality", () => {
    const ast = parseErd(`erDiagram
CUSTOMER ||--o{ ORDER : places`);
    expect(ast.entities.map((e) => e.id).sort()).toEqual(["CUSTOMER", "ORDER"]);
    const r = ast.refs[0]!;
    expect([r.fromCard, r.toCard]).toEqual(["one-mandatory", "many-optional"]);
    expect(r.label).toBe("places");
  });

  test("entity blocks are type-first with PK/FK/UK markers", () => {
    const ast = parseErd(`erDiagram
ORDER {
  int id PK
  string customerId FK
}`);
    const order = ast.entities.find((e) => e.id === "ORDER")!;
    const id = order.attributes.find((a) => a.name === "id")!;
    expect(id.type).toBe("int");
    expect(id.pk).toBe(true);
    expect(order.attributes.find((a) => a.name === "customerId")!.fk).toBe(true);
  });

  test("native `erd` header still parses (no regression)", () => {
    const ast = parseErd(`erd
table User { id int PK; email varchar }`);
    expect(ast.entities[0]!.id).toBe("User");
    // native is name-first: `id int PK` → name=id, type=int
    expect(ast.entities[0]!.attributes[0]!.name).toBe("id");
    expect(ast.entities[0]!.attributes[0]!.type).toBe("int");
  });
});
