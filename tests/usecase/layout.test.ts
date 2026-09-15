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

it('keeps long include and extend annotations readable without covering ellipses',()=>{
 const l=layoutUsecase(parseUsecase(`usecase
system: "Review service"
actor: Requester
usecase: "Submit" as Submit
usecase: "Review" as Review
usecase: "Escalate" as Escalate
Requester -- Submit
Submit ..> Review : <<include>>
Escalate ..> Submit : <<extend>> [when additional independent review is required]
`));
 for(const e of l.edges.filter(e=>e.label))for(const n of l.usecases){
  const label=e.label!;
  expect(Math.abs(label.cx-n.cx)>n.rx || Math.abs(label.cy-n.cy)>n.ry).toBe(true);
 }
});

it('routes an association past intervening use cases instead of through them',()=>{
 const l=layoutUsecase(parseUsecase(`usecase
actor: Reader
usecase: "First" as First
usecase: "Middle" as Middle
usecase: "Final" as Final
Reader -- First
Reader -- Final
First ..> Middle : <<include>>
Middle ..> Final : <<include>>`));
 const edge=l.edges.find(e=>e.relation.source==='Reader'&&e.relation.target==='Final')!;
 const points=[...edge.d.matchAll(/[ML] ([\d.-]+) ([\d.-]+)/g)].map(m=>({x:Number(m[1]),y:Number(m[2])}));
 for(const ellipse of l.usecases.filter(n=>n.usecase.id!=='Final')){
  for(let i=1;i<points.length;i++)for(let step=0;step<=20;step++){
   const t=step/20,x=points[i-1].x+(points[i].x-points[i-1].x)*t,y=points[i-1].y+(points[i].y-points[i-1].y)*t;
   expect(((x-ellipse.cx)/ellipse.rx)**2+((y-ellipse.cy)/ellipse.ry)**2).toBeGreaterThanOrEqual(1);
  }
 }
});
