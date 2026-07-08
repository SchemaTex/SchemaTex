import { describe, expect, it } from "vitest";
import { parseUsecase, UsecaseParseError } from "../../src/diagrams/usecase/parser";

const ATM = `
usecase
title: "ATM"
system: "ATM System"

actor: Customer
actor: Bank (external)

usecase: "Withdraw Cash"   as Withdraw
usecase: "Deposit Funds"   as Deposit
usecase: "Check Balance"   as Check
usecase: "Transfer Funds"  as Transfer

Customer -- Withdraw
Customer -- Deposit
Customer -- Check
Customer -- Transfer

Withdraw -- Bank
Deposit  -- Bank
Check    -- Bank
Transfer -- Bank
`;

const BOOKSTORE = `
usecase
title: "Online Bookstore — Checkout"
system: "Bookstore System"

actor: Customer
actor: "Payment Gateway" as PG (external)
actor: "Warehouse Staff" as WH

usecase: "Browse Catalog" as Browse
usecase: "Add to Cart"    as AddCart
usecase: "Checkout"       as Checkout {
  extension point: payment failed
  extension point: stock depleted
}
usecase: "Pay"            as Pay
usecase: "Validate Card"  as ValidateCard
usecase: "Cancel Order"   as Cancel

Customer -- Browse
Customer -- AddCart
Customer -- Checkout
Checkout ..> Pay          : «include»
Pay      ..> ValidateCard : «include»
Pay      -- PG
Cancel   <.. Checkout     : «extend» [payment failed] (extension point: payment failed)
`;

describe("usecase parser", () => {
  it("parses the ATM canonical example", () => {
    const ast = parseUsecase(ATM);
    expect(ast.type).toBe("usecase");
    expect(ast.title).toBe("ATM");
    expect(ast.system).toBe("ATM System");
    expect(ast.direction).toBe("LR");
    expect(ast.actors).toHaveLength(2);
    expect(ast.actors[0]).toMatchObject({ id: "Customer", kind: "human" });
    expect(ast.actors[1]).toMatchObject({ id: "Bank", kind: "external" });
    expect(ast.usecases).toHaveLength(4);
    expect(ast.relations).toHaveLength(8);
    expect(ast.relations.every((r) => r.kind === "association")).toBe(true);
    expect(ast.warnings).toEqual([]);
  });

  it("parses include / extend / extension points", () => {
    const ast = parseUsecase(BOOKSTORE);
    const checkout = ast.usecases.find((u) => u.id === "Checkout")!;
    expect(checkout.extensionPoints).toEqual(["payment failed", "stock depleted"]);

    const include = ast.relations.filter((r) => r.kind === "include");
    expect(include).toHaveLength(2);
    // Checkout includes Pay → source=Checkout, target=Pay
    expect(include[0]).toMatchObject({ source: "Checkout", target: "Pay" });

    const extend = ast.relations.find((r) => r.kind === "extend")!;
    // `Cancel <.. Checkout` ⇒ Cancel extends Checkout: source=extension(Cancel), target=base(Checkout)
    expect(extend.source).toBe("Cancel");
    expect(extend.target).toBe("Checkout");
    expect(extend.condition).toBe("payment failed");
    expect(extend.extensionPointRef).toBe("payment failed");
  });

  it("supports the PlantUML-aligned inline form", () => {
    const ast = parseUsecase(`
usecase
:Customer: as C
(Browse Catalog) as Browse
(Add to Cart) as AddCart

C -- Browse
C -- AddCart
Browse ..> AddCart : «include»
`);
    expect(ast.actors).toHaveLength(1);
    expect(ast.actors[0].id).toBe("C");
    expect(ast.usecases.map((u) => u.id)).toEqual(["Browse", "AddCart"]);
    expect(ast.relations.find((r) => r.kind === "include")).toBeTruthy();
  });

  it("parses multiplicities on both endpoints", () => {
    const ast = parseUsecase(`
usecase
system: "POS"
actor: Cashier
usecase: "Open Register" as Reg
Cashier "1..*" -- "1" Reg
`);
    const rel = ast.relations[0];
    expect(rel.sourceMultiplicity).toBe("1..*");
    expect(rel.targetMultiplicity).toBe("1");
  });

  it("parses actor and use-case generalization", () => {
    const ast = parseUsecase(`
usecase
actor: User as U
actor: "Premium User" as PU
PU --|> U

usecase: "Pay by Card" as PayCard
usecase: "Pay" as Pay
PayCard --|> Pay
`);
    const gens = ast.relations.filter((r) => r.kind === "generalization");
    expect(gens).toHaveLength(2);
    expect(gens[0]).toMatchObject({ source: "PU", target: "U" });
    expect(gens[1]).toMatchObject({ source: "PayCard", target: "Pay" });
  });

  it("accepts <<ascii>> stereotypes and normalises to AST strings", () => {
    const ast = parseUsecase(`
usecase
actor: "Audit Service" as Audit (external) <<system>>
usecase: "Log Event" as Log
Audit -- Log
`);
    expect(ast.actors[0].stereotype).toBe("system");
  });

  describe("validation (§7.10)", () => {
    it("rejects association between two actors", () => {
      expect(() =>
        parseUsecase(`usecase\nactor: A\nactor: B\nA -- B\n`),
      ).toThrow(/association must connect/i);
    });

    it("rejects association between two use cases", () => {
      expect(() =>
        parseUsecase(`usecase\nusecase: "X" as X\nusecase: "Y" as Y\nX -- Y\n`),
      ).toThrow(/include.*extend/i);
    });

    it("rejects include where an endpoint is an actor", () => {
      expect(() =>
        parseUsecase(`usecase\nactor: A\nusecase: "X" as X\nX ..> A : «include»\n`),
      ).toThrow(/include.*use cases/i);
    });

    it("rejects generalization across metaclasses", () => {
      expect(() =>
        parseUsecase(`usecase\nactor: A\nusecase: "X" as X\nA --|> X\n`),
      ).toThrow(/generalization must connect/i);
    });

    it("rejects duplicate identifiers", () => {
      expect(() =>
        parseUsecase(`usecase\nactor: Foo as X\nusecase: "Bar" as X\n`),
      ).toThrow(/already declared/i);
    });

    it("rejects extension-point refs not declared on the base", () => {
      expect(() =>
        parseUsecase(
          `usecase\nusecase: "Base" as B\nusecase: "Ext" as E\nE <.. B : «extend» (extension point: nope)\n`,
        ),
      ).toThrow(/not declared on use case/i);
    });

    it("rejects unknown identifiers in relations", () => {
      expect(() =>
        parseUsecase(`usecase\nactor: A\nA -- Nope\n`),
      ).toThrow(/unknown identifier/i);
    });

    it("rejects documents that don't start with usecase", () => {
      expect(() => parseUsecase(`flowchart\nA --> B\n`)).toThrow(UsecaseParseError);
    });
  });

  it("warns when system: omitted but ≥3 use cases declared", () => {
    const ast = parseUsecase(`
usecase
actor: A
usecase: "U1" as U1
usecase: "U2" as U2
usecase: "U3" as U3
A -- U1
A -- U2
A -- U3
`);
    expect(ast.warnings.some((w) => /system.*omitted/i.test(w))).toBe(true);
  });

  it("gives non-ASCII actor names distinct ids (no `__` collision)", () => {
    // Korean actors used to sanitize to `__` and collide with
    // "identifier '__' already declared".
    const ast = parseUsecase(`usecase\nactor: 순원\nactor: 순장`);
    expect(ast.actors.map((a) => a.id)).toEqual(["순원", "순장"]);
  });
});
