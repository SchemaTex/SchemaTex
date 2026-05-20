import { describe, expect, it } from "vitest";
import { parseUsecase } from "../../src/diagrams/usecase/parser";
import { layoutUsecase } from "../../src/diagrams/usecase/layout";

const ATM = `
usecase
system: "ATM System"
actor: Customer
actor: Bank (external)
usecase: "Withdraw Cash" as Withdraw
usecase: "Deposit Funds" as Deposit
usecase: "Check Balance" as Check
Customer -- Withdraw
Customer -- Deposit
Customer -- Check
Withdraw -- Bank
Deposit  -- Bank
Check    -- Bank
`;

const INCLUDE_CHAIN = `
usecase
system: "Shop"
actor: Customer
actor: "Payment Gateway" as PG (external)
usecase: "Checkout" as Checkout
usecase: "Pay" as Pay
usecase: "Validate Card" as ValidateCard
Customer -- Checkout
Checkout ..> Pay : «include»
Pay ..> ValidateCard : «include»
Pay -- PG
`;

describe("usecase layout", () => {
  it("places the primary actor on the left and external system on the right", () => {
    const layout = layoutUsecase(parseUsecase(ATM));
    const customer = layout.actors.find((a) => a.actor.id === "Customer")!;
    const bank = layout.actors.find((a) => a.actor.id === "Bank")!;
    expect(customer.side).toBe("left");
    expect(bank.side).toBe("right");
    expect(customer.x).toBeLessThan(bank.x);
  });

  it("draws a subject rectangle that contains all ellipses", () => {
    const layout = layoutUsecase(parseUsecase(ATM));
    expect(layout.subject).toBeTruthy();
    const s = layout.subject!;
    for (const e of layout.usecases) {
      expect(e.cx - e.rx).toBeGreaterThanOrEqual(s.x - 1);
      expect(e.cx + e.rx).toBeLessThanOrEqual(s.x + s.width + 1);
      expect(e.cy - e.ry).toBeGreaterThanOrEqual(s.y - 1);
      expect(e.cy + e.ry).toBeLessThanOrEqual(s.y + s.height + 1);
    }
  });

  it("assigns deeper columns to included use cases", () => {
    const layout = layoutUsecase(parseUsecase(INCLUDE_CHAIN));
    const checkout = layout.usecases.find((u) => u.usecase.id === "Checkout")!;
    const pay = layout.usecases.find((u) => u.usecase.id === "Pay")!;
    const validate = layout.usecases.find((u) => u.usecase.id === "ValidateCard")!;
    // include chain flows left-to-right: Checkout < Pay < ValidateCard
    expect(checkout.cx).toBeLessThan(pay.cx);
    expect(pay.cx).toBeLessThan(validate.cx);
  });

  it("produces an include edge with a dashed style and a «include» label", () => {
    const layout = layoutUsecase(parseUsecase(INCLUDE_CHAIN));
    const inc = layout.edges.find((e) => e.relation.kind === "include")!;
    expect(inc.dashed).toBe(true);
    expect(inc.arrowKind).toBe("open");
    expect(inc.label?.rows[0]).toBe("«include»");
  });

  it("does not produce a subject when system: omitted", () => {
    const layout = layoutUsecase(
      parseUsecase(`usecase\nactor: A\nusecase: "U" as U\nA -- U\n`),
    );
    expect(layout.subject).toBeUndefined();
  });

  it("merges ≥3 sibling generalizations into one shared head (tree mode)", () => {
    const layout = layoutUsecase(
      parseUsecase(`
usecase
actor: Customer as C
actor: "Premium" as P
actor: "Corporate" as Corp
actor: "Guest" as G
P --|> C
Corp --|> C
G --|> C
`),
    );
    expect(layout.trees).toHaveLength(1);
    expect(layout.trees[0].parentId).toBe("C");
    expect(layout.trees[0].childIds).toHaveLength(3);
    // actors share a single trunk; legPaths = vertical bus + one leg per child
    expect(layout.trees[0].legPaths).toHaveLength(4);
    expect(layout.trees[0].trunkD).toMatch(/^M /);
  });

  it("is deterministic — identical DSL yields identical layout", () => {
    const a = JSON.stringify(layoutUsecase(parseUsecase(INCLUDE_CHAIN)).usecases.map((u) => [u.cx, u.cy]));
    const b = JSON.stringify(layoutUsecase(parseUsecase(INCLUDE_CHAIN)).usecases.map((u) => [u.cx, u.cy]));
    expect(a).toBe(b);
  });
});
