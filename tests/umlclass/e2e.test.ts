import { describe, expect, it } from "vitest";
import { render, parse } from "../../src/core/api";
import type { UmlClassAst } from "../../src/diagrams/umlclass/types";

describe("umlclass e2e — via public api", () => {
  it("auto-detects the umlclass diagram type", () => {
    const svg = render(`umlclass
class Animal {
  + name : String
}`);
    expect(svg).toContain('data-diagram-type="umlclass"');
    expect(svg).toContain("Animal");
    expect(svg).toContain("name");
  });

  it("also accepts the Mermaid classDiagram header", () => {
    const svg = render(`classDiagram
class A
class B
A <|-- B`);
    expect(svg).toContain('data-diagram-type="umlclass"');
  });

  it("TC-1: renders all member kinds (visibility, static, derived, default, properties)", () => {
    const ast = parse(`umlclass
class Account {
  + id : String
  - balance : Money = 0
  + owner : Customer
  / available : Money
  + count : int {static}
  + deposit(amount : Money) : void
  + transfer(to : Account, amount : Money) : boolean {query}
}`) as UmlClassAst;
    expect(ast.classifiers).toHaveLength(1);
    const c = ast.classifiers[0]!;
    expect(c.name).toBe("Account");
    expect(c.members.map((m) => m.kind)).toEqual([
      "attribute", "attribute", "attribute", "attribute", "attribute",
      "operation", "operation",
    ]);
    const count = c.members.find((m) => m.name === "count");
    expect(count?.isStatic).toBe(true);
    const available = c.members.find((m) => m.name === "available");
    expect(available?.isDerived).toBe(true);
    const balance = c.members.find((m) => m.name === "balance");
    expect(balance?.defaultValue).toBe("0");
    const transfer = c.members.find((m) => m.name === "transfer");
    expect(transfer?.properties).toContain("query");
  });

  it("TC-2: generalization-driven layering puts the interface on top", () => {
    const svg = render(`umlclass
«interface» Shape { + area() : double }
abstract class AbstractShape { # name : String + area() : double {abstract} }
class Circle { + radius : double + area() : double }
class Square { + side : double + area() : double }
Shape         <|.. AbstractShape
AbstractShape <|-- Circle
AbstractShape <|-- Square`);
    // Both relationship kinds are present.
    expect(svg).toContain('data-kind="generalization"');
    expect(svg).toContain('data-kind="realization"');
    // The realization line is dashed.
    expect(svg).toMatch(/data-kind="realization"[\s\S]*?data-dashed="true"/);
    // Triangle adornments rendered.
    expect(svg).toContain("sx-umlclass-triangle");
    // Interface stereotype rendered.
    expect(svg).toContain("«interface»");
    // Abstract class name carries data-abstract.
    expect(svg).toMatch(/sx-umlclass-classname"[^>]*data-abstract="true"[^>]*>AbstractShape</);
  });

  it("TC-3: composition vs aggregation vs plain association", () => {
    const svg = render(`umlclass
class Library { + name : String }
class Book    { + title : String }
class Member  { + name : String }
class Loan    { + due : Date }
Library "1" *-- "0..*" Book   : catalogues
Library "1" o-- "0..*" Member : members
Member  "1" -- "*" Loan       : holds`);
    expect(svg).toContain('data-kind="composition"');
    expect(svg).toContain('data-kind="aggregation"');
    expect(svg).toContain('data-kind="association"');
    expect(svg).toContain("sx-umlclass-diamond-filled");
    expect(svg).toContain("sx-umlclass-diamond-hollow");
    // Multiplicity labels survive parsing.
    expect(svg).toContain("0..*");
    // Association names ride on the line midpoint.
    expect(svg).toContain("catalogues");
    expect(svg).toContain("members");
  });

  it("TC-4: Mermaid alias `--|>` normalises to generalization", () => {
    const ast = parse(`classDiagram
class Vehicle
class Car
Car --|> Vehicle`) as UmlClassAst;
    expect(ast.relationships).toHaveLength(1);
    const r = ast.relationships[0]!;
    expect(r.kind).toBe("generalization");
    // The reversed `Car --|> Vehicle` normalises so child=Car → parent=Vehicle.
    expect(r.from).toBe("Car");
    expect(r.to).toBe("Vehicle");
  });

  it("TC-5: enum literals + custom stereotype + CJK", () => {
    const ast = parse(`umlclass
title: "「订单状态」"
«enumeration» OrderStatus {
  PENDING
  PAID
  SHIPPED
  CANCELLED
}
«entity» Order {
  + status : OrderStatus
  + total : 金额
}
Order --> "1" OrderStatus : has`) as UmlClassAst;
    expect(ast.title).toBe("「订单状态」");
    const status = ast.classifiers.find((c) => c.id === "OrderStatus")!;
    expect(status.kind).toBe("enum");
    const literals = status.members.filter((m) => m.kind === "literal").map((m) => m.name);
    expect(literals).toEqual(["PENDING", "PAID", "SHIPPED", "CANCELLED"]);
    const order = ast.classifiers.find((c) => c.id === "Order")!;
    expect(order.stereotype).toBe("entity");
    expect(order.members.find((m) => m.name === "total")?.type).toBe("金额");
    const rel = ast.relationships[0]!;
    expect(rel.kind).toBe("directed");
    expect(rel.targetMult).toBe("1");
  });

  it("rejects generalization cycles with a readable error", () => {
    expect(() => parse(`umlclass
class A
class B
A <|-- B
B <|-- A`)).toThrow(/cycle/i);
  });

  it("is deterministic — same input → same output", () => {
    const dsl = `umlclass
class A { + x : int }
class B { + y : int }
A --> B : refs`;
    expect(render(dsl)).toBe(render(dsl));
  });

  // ── Namespaces / packages ──────────────────────────────────

  it("parses namespace blocks and assigns classifiers to packages", () => {
    const ast = parse(`classDiagram
namespace Auth {
  class UserService { + login() }
}
class Standalone { + ping() }`) as UmlClassAst;
    expect(ast.packages.map((p) => p.id)).toEqual(["Auth"]);
    const auth = ast.packages.find((p) => p.id === "Auth")!;
    expect(auth.classifierIds).toEqual(["UserService"]);
    expect(ast.classifiers.find((c) => c.id === "UserService")?.packageId).toBe("Auth");
    expect(ast.classifiers.find((c) => c.id === "Standalone")?.packageId).toBeUndefined();
  });

  it("dot-notation namespaces auto-create parent packages", () => {
    const ast = parse(`classDiagram
namespace A.B.C {
  class Leaf { + go() }
}`) as UmlClassAst;
    expect(ast.packages.map((p) => p.id)).toEqual(["A", "A.B", "A.B.C"]);
    expect(ast.packages.find((p) => p.id === "A.B")?.parentId).toBe("A");
    expect(ast.packages.find((p) => p.id === "A.B.C")?.parentId).toBe("A.B");
    expect(ast.packages.find((p) => p.id === "A.B.C")?.classifierIds).toEqual(["Leaf"]);
  });

  it("renders nested package frames that enclose their members", () => {
    const svg = render(`classDiagram
namespace Outer {
  namespace Inner {
    class Widget { + draw() }
  }
}`);
    expect(svg).toContain('data-package-id="Outer"');
    expect(svg).toContain('data-package-id="Outer.Inner"');
    expect(svg).toContain("sx-umlclass-package");
  });

  it("accepts an explicit namespace label", () => {
    const ast = parse(`classDiagram
namespace plat["Platform Layer"] {
  class Gateway { + route() }
}`) as UmlClassAst;
    const pkg = ast.packages.find((p) => p.id === "plat")!;
    expect(pkg.name).toBe("Platform Layer");
  });

  // ── Mermaid-compat member features (档2) ────────────────────

  it("single-line member syntax appends to the class", () => {
    const ast = parse(`classDiagram
class Animal
Animal : +int age
Animal : +mate()`) as UmlClassAst;
    const c = ast.classifiers.find((x) => x.id === "Animal")!;
    expect(c.members.map((m) => m.name).sort()).toEqual(["age", "mate"]);
    expect(c.members.find((m) => m.name === "mate")?.kind).toBe("operation");
  });

  it("single-line annotation sets the stereotype/kind", () => {
    const ast = parse(`classDiagram
class Shape
Shape : <<interface>>`) as UmlClassAst;
    expect(ast.classifiers.find((c) => c.id === "Shape")?.kind).toBe("interface");
  });

  it("converts tilde-generics to angle brackets, including nested", () => {
    const ast = parse(`classDiagram
class Repo~T~ {
  + items : List~T~
  + cache : Map~String,List~int~~
  + find(id : ID) Optional~T~
}`) as UmlClassAst;
    const c = ast.classifiers[0]!;
    expect(c.name).toBe("Repo<T>");
    expect(c.members.find((m) => m.name === "items")?.type).toBe("List<T>");
    expect(c.members.find((m) => m.name === "cache")?.type).toBe("Map<String,List<int>>");
    expect(c.members.find((m) => m.name === "find")?.type).toBe("Optional<T>");
  });

  it("member-level classifiers: trailing * = abstract, $ = static", () => {
    const ast = parse(`classDiagram
class C {
  + compute()*
  + shared$
  + value : int$
}`) as UmlClassAst;
    expect(ast.classifiers[0]!.members.find((m) => m.name === "compute")?.isAbstract).toBe(true);
    expect(ast.classifiers[0]!.members.find((m) => m.name === "shared")?.isStatic).toBe(true);
    const value = ast.classifiers[0]!.members.find((m) => m.name === "value");
    expect(value?.isStatic).toBe(true);
    expect(value?.type).toBe("int");
  });

  it("parses an inline single-line class body", () => {
    const ast = parse(`classDiagram
class Account { + id : String + balance : Money = 0 + deposit(a : Money) : void }`) as UmlClassAst;
    const c = ast.classifiers[0]!;
    expect(c.members.map((m) => m.name)).toEqual(["id", "balance", "deposit"]);
    expect(c.members.find((m) => m.name === "balance")?.defaultValue).toBe("0");
    expect(c.members.find((m) => m.name === "deposit")?.kind).toBe("operation");
  });

  it("inline enum body splits bare literals on whitespace", () => {
    const ast = parse(`classDiagram
«enumeration» Tier { BRONZE SILVER GOLD PLATINUM }`) as UmlClassAst;
    const c = ast.classifiers[0]!;
    expect(c.kind).toBe("enum");
    expect(c.members.map((m) => m.name)).toEqual(["BRONZE", "SILVER", "GOLD", "PLATINUM"]);
  });

  it("inline body does not split on a minus inside a default value", () => {
    const ast = parse(`classDiagram
class C { + temp : int = -1 + scale : double = 2 }`) as UmlClassAst;
    const c = ast.classifiers[0]!;
    expect(c.members.map((m) => m.name)).toEqual(["temp", "scale"]);
    expect(c.members.find((m) => m.name === "temp")?.defaultValue).toBe("-1");
  });

  it("a lone ~ visibility glyph is not mistaken for a generic", () => {
    const ast = parse(`classDiagram
class C {
  ~ internal : String
}`) as UmlClassAst;
    const m = ast.classifiers[0]!.members[0]!;
    expect(m.visibility).toBe("package");
    expect(m.type).toBe("String");
  });
});
