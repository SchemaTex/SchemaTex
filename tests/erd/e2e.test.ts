import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "../../src/core/api";

function fixture(name: string): string {
  return readFileSync(resolve(__dirname, "../fixtures/erd", name), "utf-8");
}

describe("erd e2e", () => {
  test("renders university fixture", () => {
    const svg = render(fixture("university.erd"));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("Student");
    expect(svg).toContain("Enrollment");
    expect(svg).toContain("majors in");
  });

  test("renders e-commerce fixture", () => {
    const svg = render(fixture("ecommerce.erd"));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("Customer");
    expect(svg).toContain("OrderLine");
    expect(svg).toContain("places");
  });

  test("auto-detects erd by header keyword", () => {
    const svg = render(`erd
table A { id int PK }`);
    expect(svg).toContain("lt-erd-entity");
  });
});
