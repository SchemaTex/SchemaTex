import { describe, test, expect } from "vitest";
import { renderVenn } from "../../src/diagrams/venn/renderer";

describe("Venn renderer — smoke tests", () => {
  test("emits an SVG with title + desc", () => {
    const svg = renderVenn(`
venn "Simple"
set A "A"
set B "B"
A only : 2
B only : 3
A & B : 1
`);
    expect(svg).toContain("<svg");
    expect(svg).toContain("<title>Simple</title>");
    expect(svg).toMatch(/<desc>[^<]+<\/desc>/);
    // should contain circles
    expect(svg.match(/<circle /g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    // region label texts
    expect(svg).toContain(">2<");
    expect(svg).toContain(">3<");
  });

  test("n=3 renders 3 circles and multiple region labels", () => {
    const svg = renderVenn(`
venn "P"
set A "A"
set B "B"
set C "C"
A only : 10
B only : 20
C only : 30
A & B : 5
A & C : 6
B & C : 7
A & B & C : 1
`);
    // 3 set-circles (plus potentially leader dots)
    expect(svg.match(/class="schematex-venn-set /g)?.length ?? 0).toBe(3);
    expect(svg).toContain("schematex-venn-label");
  });

  test("Euler subset renders nested circles", () => {
    const svg = renderVenn(`
venn "bio" [diagram: euler]
set animals "Animals"
set mammals "Mammals"
mammals subset animals
`);
    expect(svg).toMatch(/<circle /g);
    expect(svg).toContain("Animals");
    expect(svg).toContain("Mammals");
  });

  test("n=4 renders 4 ellipses", () => {
    const svg = renderVenn(`
venn "apps"
set a "a"
set b "b"
set c "c"
set d "d"
a only : 1
b only : 1
c only : 1
d only : 1
`);
    expect(svg.match(/<ellipse /g)?.length ?? 0).toBe(4);
  });

  test("blend mode is applied", () => {
    const svg = renderVenn(`
venn "x"
set A "A"
set B "B"
A only : 1
B only : 1
`);
    expect(svg).toContain("mix-blend-mode: multiply");
  });
});
