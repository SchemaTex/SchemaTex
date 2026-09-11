import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderResult } from "../../src/core/api";
import { estimateTextWidth } from "../../src/core/text-metrics";
import { parseFishboneDSL } from "../../src/diagrams/fishbone/parser";
import { renderFishboneAST } from "../../src/diagrams/fishbone/renderer";

type Point = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };
const attrs = (text: string): Record<string, string> => Object.fromEntries(
  [...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const elements = (svg: string, tag: string) => [...svg.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "g"))].map(match => attrs(match[1]));
const shape = (svg: string, name: string) => elements(svg, "path").find(path => path.class === name)!;
const decode = (text: string) => text.replace(/&(amp|lt|gt|quot|apos);/g,
  (_, name: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[name]!);

// Read the emitted M/L/C/Z subset. Each cubic chord is within 0.05px of
// its control polygon; collision boxes below include this approximation error.
function points(d: string): Point[] {
  const result: Point[] = [];
  const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const curve = (a: Point, b: Point, c: Point, end: Point) => {
    const distance = (p: Point) => Math.abs((end.x - a.x) * (a.y - p.y) - (a.x - p.x) * (end.y - a.y)) / Math.hypot(end.x - a.x, end.y - a.y);
    if (Math.max(distance(b), distance(c)) <= 0.05) { result.push(end); return; }
    const ab = midpoint(a, b), bc = midpoint(b, c), cd = midpoint(c, end);
    const abc = midpoint(ab, bc), bcd = midpoint(bc, cd), middle = midpoint(abc, bcd);
    curve(a, ab, abc, middle); curve(middle, bcd, cd, end);
  };
  for (const match of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const n = (match[2].match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
    if (match[1] === "Z") result.push(result[0]);
    else if (match[1] === "C") curve(result.at(-1)!, { x: n[0], y: n[1] }, { x: n[2], y: n[3] }, { x: n[4], y: n[5] });
    else result.push({ x: n[0], y: n[1] });
  }
  expect(result.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  return result;
}
function bounds(path: Point[]): Box {
  const xs = path.map(p => p.x), ys = path.map(p => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
function inside(p: Point, polygon: Point[]): boolean {
  let contained = false;
  for (let i = 1; i < polygon.length; i++) {
    const a = polygon[i - 1], b = polygon[i];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) contained = !contained;
  }
  return contained;
}
function hitsBox(a: Point, b: Point, box: Box): boolean {
  let lo = 0, hi = 1;
  for (const axis of ["x", "y"] as const) {
    const delta = b[axis] - a[axis], min = box[axis], max = min + (axis === "x" ? box.width : box.height);
    if (delta === 0) { if (a[axis] < min || a[axis] > max) return false; }
    else { const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
      lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); }
  }
  return lo <= hi;
}
const padded = (box: Box, gap: number): Box => ({ x: box.x - gap, y: box.y - gap, width: box.width + gap * 2, height: box.height + gap * 2 });
function clearOf(box: Box, path: Point[], gap: number) {
  for (let i = 1; i < path.length; i++) expect(hitsBox(path[i - 1], path[i], padded(box, gap))).toBe(false);
}
function textBoxes(svg: string) {
  return [...svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)].flatMap(match => {
    const a = attrs(match[1]);
    const css = svg.match(new RegExp(`\\.${a.class}\\s*\\{([^}]*)\\}`))![1];
    const font = css.match(/font:\s*(\d+)\s+([\d.]+)px/)!;
    const fontSize = Number(font[2]), fontWeight = Number(font[1]);
    const anchor = a["text-anchor"] ?? css.match(/text-anchor:\s*(\w+)/)?.[1] ?? "start";
    const spans = [...match[2].matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)];
    const lines = spans.length ? spans.map(span => ({ ...a, ...attrs(span[1]), text: decode(span[2]) })) : [{ ...a, text: decode(match[2]) }];
    return lines.map(line => {
      const spacing = Number(css.match(/letter-spacing:\s*([\d.]+)px/)?.[1] ?? 0);
      const width = estimateTextWidth(line.text, fontSize, { fontWeight }) + Math.max(0, line.text.length - 1) * spacing;
      const central = css.includes("dominant-baseline: central");
      return { class: a.class, text: line.text, box: padded({
        x: Number(line.x) - (anchor === "middle" ? width / 2 : anchor === "end" ? width : 0),
        y: Number(line.y) - fontSize * (central ? 0.5 : 1), width, height: fontSize * (central ? 1 : 1.25),
      }, 2) };
    });
  });
}
const cases = readdirSync("visual-eval/cases").filter(name => name.startsWith("fishbone-")).sort()
  .map(name => [name, readFileSync(`visual-eval/cases/${name}/source.sx`, "utf8")] as const);
const small = (effect: string, config = "", cause = "") => `fishbone "Review"\neffect "${effect}"\n${config}\ncategory a "A"\ncategory b "B"\n${cause}`;

describe("Fishbone Stage 1 silhouette from emitted SVG", () => {
  it.each([...cases, ["exemplar", readFileSync("visual-eval/exemplars/fishbone/source.sx", "utf8")],
    ["empty categories", small("Outcome")], ["one cause", small("Outcome", "", 'a: "One cause"')],
    ["long effect", small("Very long outcome statement with repeated details ".repeat(8))],
    ["CJK and XML", small("鱼骨原因与效果测量过程".repeat(8) + " & < >")]])(
    "%s has a closed fish, visible entered arrow and clear labels", (_, source) => {
      const result = renderResult(source, { type: "fishbone" });
      expect(result.status).not.toBe("error");
      const svg = result.svg;
      expect(elements(svg, "rect").some(rect => rect.class === "sx-fb-head")).toBe(false);
      for (const name of ["sx-fb-head", "sx-fb-tail"]) {
        const paths = elements(svg, "path").filter(path => path.class === name);
        expect(paths).toHaveLength(1);
        expect(paths[0].d).toMatch(/^M .* C .* Z$/);
        expect(paths[0]).toMatchObject({ fill: "#f8fafc", stroke: "#1e293b", "stroke-width": "2.5" });
      }
      expect(svg).toContain(".sx-fb-tail, .sx-fb-head { stroke-width: 2.5; stroke-linejoin: round; }");
      const head = points(shape(svg, "sx-fb-head").d), tail = points(shape(svg, "sx-fb-tail").d);
      const gill = points(shape(svg, "sx-fb-gill").d), arrow = points(shape(svg, "sx-fb-spine-arrow").d);
      const spine = elements(svg, "line").find(line => line.class === "sx-fb-spine")!;
      const hb = bounds(head), tb = bounds(tail), cy = Number(spine.y1);
      expect(spine.y1).toBe(spine.y2);
      expect(spine).toMatchObject({ stroke: "#1e293b", "stroke-width": "4" });
      expect(svg).toContain(".sx-fb-spine { stroke-width: 4;");
      expect(hb.width).toBeCloseTo(274);
      expect(hb.height).toBeGreaterThanOrEqual(232);
      expect(Number(spine.x2)).toBeCloseTo(hb.x - 2);
      expect(inside(arrow[0], head)).toBe(false);
      expect(inside(arrow[1], head)).toBe(true);
      expect(arrow[1]).toEqual({ x: hb.x + 36, y: cy });
      expect(arrow[0].x).toBeLessThan(Number(spine.x2)); // No gap between line and triangle.
      expect(shape(svg, "sx-fb-spine-arrow").fill).toBe("#1e293b");
      expect(svg.indexOf('class="sx-fb-head"')).toBeLessThan(svg.indexOf('class="sx-fb-spine"'));
      expect(svg.indexOf('class="sx-fb-gill"')).toBeLessThan(svg.indexOf('class="sx-fb-spine-arrow"'));
      expect(svg.indexOf('class="sx-fb-spine"')).toBeLessThan(svg.indexOf('class="sx-fb-spine-arrow"'));
      expect(elements(svg, "path").filter(path => path.class === "sx-fb-spine-arrow")).toHaveLength(1);
      expect(elements(svg, "path").filter(path => path.class === "sx-fb-gill")).toHaveLength(1);
      expect(svg).not.toMatch(/<marker\b|marker-end=|url\(#/);
      expect(elements(svg, "line").filter(line => line.class === "sx-fb-tail")).toHaveLength(0);
      expect(inside({ x: Number(spine.x1), y: cy }, tail)).toBe(true);
      expect(inside({ x: tb.x + 15, y: cy }, tail)).toBe(false); // A fork, not a solid triangle.
      expect(tail.some(p => p.x === tb.x && p.y === cy - 58)).toBe(true);
      expect(tail.some(p => p.x === tb.x && p.y === cy + 58)).toBe(true);
      const [,, width, height] = svg.match(/viewBox="([^"]+)"/)![1].split(" ").map(Number);
      for (const path of [head, tail, arrow]) for (const p of path) {
        expect(p.x).toBeGreaterThan(2); expect(p.y).toBeGreaterThan(2);
        expect(p.x).toBeLessThan(width - 2); expect(p.y).toBeLessThan(height - 2);
      }
      const labels = textBoxes(svg);
      expect(labels.filter(label => label.class === "sx-fb-effect-eyebrow").map(label => label.text)).toEqual(["EFFECT"]);
      const effect = labels.filter(label => label.class === "sx-fb-head-text");
      expect(effect.map(label => label.text).join("").replace(/\s/g, "")).toBe(parseFishboneDSL(source).effect.replace(/\s/g, ""));
      expect(svg).toContain('class="sx-fb-head-text" fill="#0f172a"');
      for (const label of labels) {
        const b = label.box;
        expect(b.x).toBeGreaterThan(0); expect(b.y).toBeGreaterThan(0);
        expect(b.x + b.width).toBeLessThan(width); expect(b.y + b.height).toBeLessThan(height);
        clearOf(b, tail, 1.3);
        if (["sx-fb-head-text", "sx-fb-effect-eyebrow"].includes(label.class)) {
          for (const p of [{ x: b.x, y: b.y }, { x: b.x + b.width, y: b.y }, { x: b.x, y: b.y + b.height }, { x: b.x + b.width, y: b.y + b.height }]) expect(inside(p, head)).toBe(true);
          clearOf(b, head, 1.3); clearOf(b, gill, 0.85); clearOf(b, arrow, 0.05);
        } else {
          expect(b.x + b.width <= hb.x || b.y + b.height < hb.y || b.y > hb.y + hb.height).toBe(true);
        }
      }
      // The larger fin must not cut an existing bone, cause rule or sub-cause.
      for (const line of elements(svg, "line").filter(line => line.class !== "sx-fb-spine")) {
        expect(hitsBox({ x: Number(line.x1), y: Number(line.y1) }, { x: Number(line.x2), y: Number(line.y2) }, padded(tb, 2))).toBe(false);
      }
    });

  it("renders byte-identically without randomness, including public output and reversed direction", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("Renderer used randomness"); });
    try {
      for (const [, source] of [...cases, ["left", small("Outcome", "config direction = left")]]) {
        const ast = parseFishboneDSL(source), original = JSON.stringify(ast);
        const direct = renderFishboneAST(ast), publicSVG = renderResult(source, { type: "fishbone" }).svg;
        renderFishboneAST(parseFishboneDSL(small("An unrelated outcome")));
        expect(renderFishboneAST(ast)).toBe(direct);
        expect(renderResult(source, { type: "fishbone" }).svg).toBe(publicSVG);
        expect(renderFishboneAST({ ...ast, majors: ast.majors.map(node => { const { label, children, ...rest } = node; return { children, label, ...rest }; }) })).toBe(direct);
        expect(JSON.stringify(ast)).toBe(original);
      }
    } finally { random.mockRestore(); }
  });

  it("mirrors the same head, fin and entered arrow for direction=left", () => {
    const svg = renderResult(small("Outcome", "config direction = left"), { type: "fishbone" }).svg;
    const width = Number(svg.match(/viewBox="0 0 ([\d.]+)/)![1]);
    expect(svg).toContain(`transform="translate(${width} 0) scale(-1 1)"`);
    const head = bounds(points(shape(svg, "sx-fb-head").d));
    const arrow = points(shape(svg, "sx-fb-spine-arrow").d);
    expect(width - arrow[1].x).toBeLessThan(width - head.x);
    expect(svg.indexOf('class="sx-fb-head"')).toBeLessThan(svg.indexOf('class="sx-fb-spine-arrow"'));
  });
});
