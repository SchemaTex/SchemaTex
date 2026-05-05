import { describe, test, expect } from "vitest";
import { parseErd, ErdParseError } from "../../src/diagrams/erd/parser";

describe("erd parser", () => {
  test("parses minimal table + ref", () => {
    const ast = parseErd(`erd
table A {
  id int PK
}
table B {
  id int PK
  a_id int FK -> A.id
}
ref B.a_id many-mandatory -- one-mandatory A.id`);
    expect(ast.entities).toHaveLength(2);
    expect(ast.entities[0]!.id).toBe("A");
    expect(ast.entities[0]!.attributes[0]!.pk).toBe(true);
    expect(ast.refs).toHaveLength(1);
    expect(ast.refs[0]!.fromCard).toBe("many-mandatory");
    expect(ast.refs[0]!.toCard).toBe("one-mandatory");
    expect(ast.refs[0]!.identifying).toBe(true);
  });

  test("parses Mermaid glyph alias", () => {
    const ast = parseErd(`erd
table A { id int PK }
table B { id int PK }
ref A }o--|| B`);
    expect(ast.refs[0]!.fromCard).toBe("many-optional");
    expect(ast.refs[0]!.toCard).toBe("one-mandatory");
    expect(ast.refs[0]!.identifying).toBe(true);
  });

  test("non-identifying ref via dotted line", () => {
    const ast = parseErd(`erd
table A { id int PK }
table B { id int PK }
ref A one-optional .. many-optional B`);
    expect(ast.refs[0]!.identifying).toBe(false);
  });

  test("parses inline FK target", () => {
    const ast = parseErd(`erd
table Parent { id int PK }
table Child {
  id int PK
  parent_id int FK -> Parent.id
}`);
    expect(ast.entities[1]!.attributes[1]!.fkTarget).toBe("Parent.id");
    expect(ast.entities[1]!.attributes[1]!.fk).toBe(true);
  });

  test("rejects FK to unknown table", () => {
    expect(() =>
      parseErd(`erd
table Child {
  id int PK
  parent_id int FK -> Parent.id
}`)
    ).toThrow(ErdParseError);
  });

  test("UK and NN markers", () => {
    const ast = parseErd(`erd
table U {
  id int PK
  email varchar UK
  age int NN
}`);
    const [, email, age] = ast.entities[0]!.attributes;
    expect(email!.uk).toBe(true);
    expect(age!.notNull).toBe(true);
  });

  test("title and direction headers", () => {
    const ast = parseErd(`erd
title: "Schema"
direction: TB
table A { id int PK }`);
    expect(ast.title).toBe("Schema");
    expect(ast.direction).toBe("TB");
  });

  test("ref with label", () => {
    const ast = parseErd(`erd
table Customer { id int PK }
table Order { id int PK; customer_id int FK -> Customer.id }
ref Order.customer_id many-mandatory -- one-mandatory Customer.id : "places"`);
    expect(ast.refs[0]!.label).toBe("places");
  });

  test("rejects non-erd header", () => {
    expect(() => parseErd("flowchart\nA --> B")).toThrow(ErdParseError);
  });

  test("rejects unknown notation", () => {
    expect(() =>
      parseErd(`erd
notation: chen
table A { id int PK }`)
    ).toThrow(/not yet implemented/);
  });
});
