import { readFileSync } from "node:fs";
import { parseBlockDiagram } from "../../src/diagrams/blockdiagram/parser";
import { layoutBlockDiagram } from "../../src/diagrams/blockdiagram/layout";
import { describe, expect, test } from "vitest";
import { render } from "../../src";

describe("blockdiagram renderer", () => {
  test("renders dangling signal output ports without excessive canvas height", () => {
    const svg = render(`blockdiagram "PID"
C = block("PID C(s)") [role: controller]
G = block("Plant G(s)") [role: plant]
err = sum(+r, -y)
r = signal("r (setpoint)")
y = signal("y (output)")
in -> r
r -> err
err -> C
C -> G
G -> y
G -> err`);

    expect(svg).toContain("y (output)");
    const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(viewBox).not.toBeNull();
    expect(Number(viewBox?.[2])).toBeLessThan(260);
  });
});

test.each(["title System Architecture", 'title: "System Architecture"'])("renders %s with the shared title placement", (title) => {
  const svg = render(`blockdiagram\n${title}\nA = block("Plant")`);
  expect(svg).toBe(render('blockdiagram "System Architecture"\nA = block("Plant")'));
  expect(svg).toMatch(/<text[^>]*y="24"[^>]*class="schematex-bd-title"[^>]*>System Architecture<\/text>/);
  expect(svg).toContain('transform="translate(0, 40)"');
});

test("assigns a sign to every incoming edge by declaration order, including feedback", () => {
  const dsl = readFileSync(new URL("../fixtures/regression/block-signed-feedback.sx", import.meta.url), "utf8");
  const layout = layoutBlockDiagram(parseBlockDiagram(dsl));
  expect(layout.edges.filter((e) => e.to === "e").map((e) => [e.from, e.polarity?.sign]))
    .toEqual([["in", "+"], ["H", "-"]]);
  const reference = layout.edges.find((e) => e.from === "in" && e.to === "e")!;
  const endY = Number(reference.path.trim().split(/\s+/).at(-1));
  expect(reference.polarity!.y).toBeLessThanOrEqual(endY - 8);
  const signs = [...render(dsl).matchAll(/class="schematex-bd-sum-sign"[^>]*>([^<]+)<\/text>/g)];
  expect(signs.map((s) => s[1])).toEqual(["+", "−"]);
});

test("term names do not override incoming order, and extra inputs are positive", () => {
  const ast = parseBlockDiagram(`blockdiagram
A = block("A")
B = block("B")
C = block("C")
s = sum(-B, +A)
A -> s
B -> s
C -> s`);
  expect(layoutBlockDiagram(ast).edges.map((e) => e.polarity?.sign)).toEqual(["-", "+", "+"]);
});

test("signal inlining preserves incoming declaration order for sum signs", () => {
  const ast = parseBlockDiagram(`blockdiagram
s = sum(+r, -h)
H = block("H")
h = signal("feedback")
r = signal("reference")
in -> r
r -> s
H -> h
h -> s`);
  expect(layoutBlockDiagram(ast).edges.filter((e) => e.to === "s").map((e) => [e.from, e.polarity?.sign]))
    .toEqual([["in", "+"], ["H", "-"]]);
});
