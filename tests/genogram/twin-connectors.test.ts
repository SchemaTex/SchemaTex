import { expect, it } from "vitest";
import { genogram } from "../../src/diagrams/genogram";

function segments(markup: string): number[][] {
  return [...markup.matchAll(/M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)/g)].map(m => m.slice(1).map(Number));
}

it.each(["twin-identical", "twin-fraternal"])("draws %s branches and a truthful legend", type => {
  const svg = genogram.render(`genogram
  a [male, 1980]
  b [female, 1982]
  a -- b
    c [female, 2010, ${type}]
    d [female, 2010, ${type}]
    e [male, 2013]`);
  const edge = new RegExp(`<g[^>]*class="schematex-genogram-edge schematex-genogram-edge-${type}"[^>]*>([\\s\\S]*?)<\\/g>`).exec(svg)![1];
  const swatch = new RegExp(`<g[^>]*data-legend-key="${type}"[^>]*>([\\s\\S]*?)<\\/g>`).exec(svg)![1];
  for (const markup of [edge, swatch]) {
    const lines = segments(markup);
    expect(lines).toHaveLength(type === "twin-identical" ? 3 : 2);
    const [left, right] = lines;
    expect(left.slice(0, 2)).toEqual(right.slice(0, 2));
    expect(left[2]).toBeLessThan(left[0]);
    expect(right[2]).toBeGreaterThan(right[0]);
    expect(left[3]).toBe(right[3]);
    if (type === "twin-identical") {
      const bar = lines[2];
      expect(bar[1]).toBe(bar[3]);
      const fraction = (bar[1] - left[1]) / (left[3] - left[1]);
      expect(fraction).toBeGreaterThan(0);
      expect(fraction).toBeLessThan(1);
      expect(bar[0]).toBeCloseTo(left[0] + (left[2] - left[0]) * fraction);
      expect(bar[2]).toBeCloseTo(right[0] + (right[2] - right[0]) * fraction);
    }
  }
  expect(svg).not.toMatch(/class="schematex-genogram-edge schematex-genogram-edge-parent-child" data-from="a\+b" data-to="[cd]"/);
  const branches = segments(edge);
  for (const [i, id] of ["c", "d"].entries()) {
    const node = new RegExp(`data-individual-id="${id}" data-status="alive" transform="translate\\(([-\\d.]+), ([-\\d.]+)\\)"`).exec(svg)!;
    expect(branches[i][2]).toBe(Number(node[1]));
    expect(branches[i][3]).toBe(Number(node[2]) - 20);
  }
  expect(svg).not.toMatch(/\.schematex-genogram-edge[^}]*\{[^}]*(?:display:\s*none|opacity:\s*0[; ])/);
});

it("keeps different multiple births in separate convergences", () => {
  const svg = genogram.render(`genogram
  a [male]
  b [female]
  a -- b
    c [male, 2010, twin-identical]
    d [male, 2010, twin-identical]
    e [female, 2013, twin-identical]
    f [female, 2013, twin-identical]`);
  const groups = [...svg.matchAll(/class="schematex-genogram-edge schematex-genogram-edge-twin-identical"[^>]*>([\s\S]*?)<\/g>/g)];
  expect(groups).toHaveLength(2);
  expect(segments(groups[0][1])[0][0]).toBeLessThan(segments(groups[1][1])[0][0]);
});
