import { describe, test, expect } from "vitest";
import { validateDsl } from "../../src/ai";

// When the diagram type is known (forced via config.type — always the case in an
// AI artifact whose `engine="…"` tag names the type), the header line is
// redundant. Bodies that omit it should still parse; genuinely malformed bodies
// must still fail (recovery must never mask a real error).
describe("optional header when the type is known", () => {
  test("erd — headerless Mermaid body recovers (prepends erDiagram, not native erd)", () => {
    const body = `Customer ||--o{ Rental : places
Rental ||--|{ Movie : includes
Customer {
  int id PK
}`;
    expect(validateDsl("erd", body).ok).toBe(true);
  });

  test("a headered body is unaffected", () => {
    expect(validateDsl("erd", `erDiagram\nA ||--o{ B : x`).ok).toBe(true);
    expect(validateDsl("genogram", `genogram\nalice [female]`).ok).toBe(true);
  });

  test("recovery never masks a genuine syntax error", () => {
    // orgchart body is missing the header AND uses bare labels instead of the
    // `id : "Name"` form — prepending `orgchart` does not make it parse, so it
    // must still report invalid rather than being silently "recovered".
    expect(validateDsl("orgchart", `CEO\n  VP Sales\n    Director`).ok).toBe(false);
    // erd headerless with an invalid cardinality glyph — recovery prepends
    // `erDiagram`, but the bad glyph still fails, so it is not masked.
    expect(validateDsl("erd", `A ||XX{ B : rel`).ok).toBe(false);
  });
});
