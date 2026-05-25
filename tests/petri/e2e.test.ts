import { describe, expect, it } from "vitest";
import { render, parse } from "../../src/core/api";

describe("petri e2e — via the public API", () => {
  it("auto-detects the petri header and renders an SVG", () => {
    const svg = render(`petri
  place P1 *1
  transition T1
  place P2
  P1 -> T1
  T1 -> P2`);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('data-diagram-type="petri"');
  });

  it("exposes a stable AST through parse()", () => {
    const ast = parse(`petri "p"
  place P1 *1
  transition T1
  P1 -> T1`) as { type: string; places: unknown[]; transitions: unknown[] };
    expect(ast.type).toBe("petri");
    expect(ast.places).toHaveLength(1);
    expect(ast.transitions).toHaveLength(1);
  });

  it("preview mode keeps an invalid net visible instead of throwing", () => {
    const svg = render(`petri\n  place P\n  place Q\n  P -> Q`, {
      mode: "preview",
    } as never);
    expect(typeof svg).toBe("string");
    expect(svg.length).toBeGreaterThan(0);
  });
});
