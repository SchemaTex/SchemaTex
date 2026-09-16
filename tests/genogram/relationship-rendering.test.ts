import { describe, expect, it } from "vitest";
import { genogram } from "../../src/diagrams/genogram";
import { estimateTextWidth } from "../../src/core/text-metrics";
import { labelOverlap } from "../../src/core/label-placement";

const people = `genogram
  a [male, label: "Alex"]
  b [female, label: "Lara Hughes"]`;

function paths(svg: string): number[][] {
  return [...svg.matchAll(/<path d="([^"]+)"/g)].map(match => [...match[1].matchAll(/-?\d+(?:\.\d+)?/g)].map(n => Number(n[0])));
}

function emotional(svg: string, type: string): string {
  return new RegExp(`<g[^>]*class="schematex-genogram-emotional schematex-genogram-emotional-${type}"[^>]*>([\\s\\S]*?)<\\/g>`).exec(svg)![1];
}

function legend(svg: string, type: string): string {
  return new RegExp(`<g[^>]*data-legend-key="${type}"[^>]*>([\\s\\S]*?)<\\/g>`).exec(svg)![1];
}

describe("relationship labels preserve people", () => {
  it.each(["--", "-cutoff-", "-abuse->"])("renders %s labels beside the edge", op => {
    const svg = genogram.render(`${people}\n  a ${op} b [label: "Estranged"]`);
    expect(svg.match(/class="schematex-genogram-node /g)).toHaveLength(2);
    expect(svg).toMatch(/class="schematex-genogram-label"[^>]*>Alex<\/text>/);
    expect(svg).toMatch(/class="schematex-genogram-label"[^>]*>Lara Hughes<\/text>/);
    expect(svg).toMatch(/class="schematex-genogram-edge-label"[^>]*>Estranged<\/text>/);
    expect(svg).toContain('data-from="a" data-to="b"');
    expect(svg).not.toContain('data-legend-key="sex.unknown"');
  });

  it("keeps labelled couple children attached", () => {
    const svg = genogram.render(`${people}\n  a -- b [label: "Ended 2018"]\n    c [male, label: "Child"]`);
    expect(svg.match(/class="schematex-genogram-node /g)).toHaveLength(3);
    expect(svg).toMatch(/data-from="a\+b" data-to="c"[^>]*>[\s\S]*?<path d="[^"]+"/);
    expect(svg).toContain(">Lara Hughes</text>");
  });

  it.each(["--", "-cutoff-", "-abuse->"])("rejects malformed %s labels with the offending line", op => {
    for (const suffix of ['[label: Estranged]', '[label "Estranged"]', '[label: "Estranged"', '[label: "Estranged"] junk', '[label: "One", label: "Two"]']) {
      const line = `  a ${op} b ${suffix}`;
      expect(() => genogram.render(`${people}\n${line}`)).toThrow("Line 4");
      expect(() => genogram.render(`${people}\n${line}`)).toThrow(line);
    }
  });

  it("places couple and emotional labels clear of captions and each other", () => {
    const svg = genogram.render(`${people}
  a -- b [label: "Ended 2018"]
  a -cutoff- b [label: "Estranged"]
  a -close- b [label: "Support"]`);
    const boxes = [...svg.matchAll(/<text x="([^"]+)" y="([^"]+)" class="schematex-genogram-(label|edge-label)"[^>]*>([^<]+)<\/text>/g)].map(m => {
      const fontSize = m[3] === "label" ? 12 : 10;
      const width = estimateTextWidth(m[4], fontSize);
      return { x: Number(m[1]) - width / 2, y: Number(m[2]) - fontSize, width, height: fontSize + 2 };
    });
    expect(boxes).toHaveLength(5);
    for (let i = 0; i < boxes.length; i++) {
      for (const other of boxes.slice(i + 1)) expect(labelOverlap(boxes[i], other)).toBe(0);
    }
    expect(svg.match(/<rect[^>]*fill="white" fill-opacity="0.9"/g)).toHaveLength(3);
  });
});

describe("clinical emotional forms in edges and legend", () => {
  it.each(["fused", "close", "conflict", "cutoff", "distant"])("renders %s with geometry, independent of colour", type => {
    const svg = genogram.render(`${people}\n  a -${type}- b`);
    for (const markup of [emotional(svg, type), legend(svg, type)]) {
      const lines = paths(markup);
      expect(markup).not.toContain("display:");
      expect(markup).not.toContain("8,3,2,3");
      if (type === "fused" || type === "close") {
        expect(lines).toHaveLength(type === "fused" ? 3 : 2);
        expect(new Set(lines.map(line => line.join(","))).size).toBe(lines.length);
        expect(markup).not.toContain("stroke-dasharray");
      } else if (type === "cutoff") {
        expect(lines).toHaveLength(4);
        expect(Math.hypot(lines[0].at(-2)! - lines[1][0], lines[0].at(-1)! - lines[1][1])).toBeGreaterThan(5);
        for (const cap of lines.slice(2)) expect(Math.hypot(cap[2] - cap[0], cap[3] - cap[1])).toBeCloseTo(12);
        expect(markup).not.toContain("stroke-dasharray");
      } else if (type === "conflict") {
        expect(lines).toHaveLength(1);
        const ys = lines[0].filter((_, i) => i % 2 === 1);
        const turns = ys.slice(2).map((y, i) => (y - ys[i + 1]) * (ys[i + 1] - ys[i]));
        expect(turns.filter(turn => turn < 0).length).toBeGreaterThan(1);
        expect(markup).not.toContain("stroke-dasharray");
      } else {
        expect(lines).toHaveLength(1);
        expect(markup).toContain('stroke-width="1.25"');
        expect(markup).toContain('stroke-dasharray="4,4"');
      }
    }
  });

  it("paints a white halo below a deceased cross and retains explicit age", () => {
    const svg = genogram.render('genogram\n  a [male, deceased, age: 70, conditions: heart(full, #e53935)]');
    const node = /<g class="schematex-genogram-node [\s\S]*?<\/g>/.exec(svg)![0];
    expect(node).toMatch(/<text\b[^>]*class="schematex-genogram-age"[^>]*>70<\/text>/);
    expect(node.match(/class="schematex-genogram-deceased-halo"/g)).toHaveLength(2);
    expect(node.lastIndexOf('class="schematex-genogram-deceased-halo"')).toBeLessThan(node.indexOf('class="schematex-genogram-deceased-mark"'));
    expect(svg).toMatch(/\.schematex-genogram-deceased-mark \{ stroke: #[0-9a-f]+; stroke-width: 2;/);
  });
});
