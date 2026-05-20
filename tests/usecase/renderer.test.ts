import { describe, expect, it } from "vitest";
import { renderUsecase } from "../../src/diagrams/usecase/renderer";
import { render } from "../../src/core/api";

const BOOKSTORE = `
usecase
title: "Online Bookstore"
system: "Bookstore System"
actor: Customer
actor: "Payment Gateway" as PG (external)
usecase: "Checkout" as Checkout {
  extension point: payment failed
}
usecase: "Pay" as Pay
usecase: "Cancel Order" as Cancel
Customer -- Checkout
Checkout ..> Pay : «include»
Pay -- PG
Cancel <.. Checkout : «extend» [payment failed] (extension point: payment failed)
`;

describe("usecase renderer", () => {
  it("emits a well-formed SVG with the usecase data attribute", () => {
    const svg = renderUsecase(BOOKSTORE);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('data-diagram-type="usecase"');
    expect(svg).toContain("</svg>");
  });

  it("renders guillemets, never raw ASCII brackets, in the output", () => {
    const svg = renderUsecase(BOOKSTORE);
    expect(svg).toContain("«include»");
    expect(svg).toContain("«extend»");
    expect(svg).not.toContain("&lt;&lt;include&gt;&gt;");
  });

  it("renders the external-system actor with an «actor» stereotype rectangle", () => {
    const svg = renderUsecase(BOOKSTORE);
    expect(svg).toContain("sx-uc-actor-system");
    expect(svg).toContain("«actor»");
  });

  it("renders extension points inside the base ellipse", () => {
    const svg = renderUsecase(BOOKSTORE);
    expect(svg).toContain("extension points");
    expect(svg).toContain("payment failed");
  });

  it("uses the open-arrow marker for include and hollow marker for generalization", () => {
    const svg = renderUsecase(`
usecase
usecase: "A" as A
usecase: "B" as B
usecase: "C" as C
A ..> B : «include»
C --|> A
`);
    expect(svg).toContain("url(#sx-uc-open-arrow)");
    expect(svg).toContain("url(#sx-uc-gen-arrow)");
  });

  it("is reachable through the top-level render() with auto-detection", () => {
    const svg = render(BOOKSTORE);
    expect(svg).toContain('data-diagram-type="usecase"');
  });

  it("renders a 20+ use-case stress diagram without throwing", () => {
    const lines = ["usecase", 'system: "Library"', "actor: Member", "actor: Librarian as Lib"];
    for (let i = 0; i < 22; i++) lines.push(`usecase: "UC ${i}" as U${i}`);
    for (let i = 0; i < 22; i++) lines.push(`Member -- U${i}`);
    for (let i = 0; i < 14; i++) lines.push(`U${i} ..> U${i + 1} : «include»`);
    const svg = renderUsecase(lines.join("\n"));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
});
