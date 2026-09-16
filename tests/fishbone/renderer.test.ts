import { describe, expect, it } from "vitest";
import { renderFishboneAST } from "../../src/diagrams/fishbone/renderer";
import { parseFishboneDSL } from "../../src/diagrams/fishbone/parser";
import { edgeLabelObstacles, labelOverlap } from "../../src/core/label-placement";
import { estimateTextWidth } from "../../src/core/text-metrics";

function diagram(categories: number, causes: number, subs = 0, config = "") {
  const body = Array.from({ length: categories }, (_, category) => [
    `category c${category} "Custom category ${category} ${"界W".repeat(category)}"`,
    ...Array.from({ length: causes }, (_, cause) => [
      `c${category} : "Cause ${category}.${cause} ${"wide text ".repeat(cause % 3)}"`,
      ...Array.from({ length: subs }, (_, sub) => `  - "Detail ${sub} ${"界W".repeat(sub)}"`),
    ].join("\n")),
  ].join("\n")).join("\n");
  return renderFishboneAST(parseFishboneDSL(`fishbone "Analysis"\neffect "Observed outcome"\n${config}\n${body}`));
}

function attributes(source: string): Record<string, string> {
  return Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)]
    .map(attribute => [attribute[1], attribute[2]]));
}

function elements(svg: string, className: string) {
  return [...svg.matchAll(/<(line|rect|text|path)\b([^>]*)>/g)]
    .map(match => attributes(match[2])).filter(attrs => attrs.class === className);
}

const point = (element: Record<string, string>, end: 1 | 2) =>
  ({ x: Number(element[`x${end}`]), y: Number(element[`y${end}`]) });

function expectOnSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  expect((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)).toBeCloseTo(0, 6);
  expect(p.x).toBeGreaterThanOrEqual(Math.min(a.x, b.x) - 1e-6);
  expect(p.x).toBeLessThanOrEqual(Math.max(a.x, b.x) + 1e-6);
  expect(p.y).toBeGreaterThanOrEqual(Math.min(a.y, b.y) - 1e-6);
  expect(p.y).toBeLessThanOrEqual(Math.max(a.y, b.y) + 1e-6);
}

function textBoxes(svg: string, className: string) {
  const css = svg.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`))![1];
  const font = Number(css.match(/font:\s*\d+\s+(\d+)px/)![1]);
  return [...svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)]
    .filter(match => attributes(match[1]).class === className)
    .map(match => {
      const attrs = attributes(match[1]);
      const spans = [...match[2].matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)];
      const widths = spans.map(span => estimateTextWidth(span[2], font));
      const ys = spans.map(span => Number(attributes(span[1]).y));
      return { x: Number(attrs.x), y: Math.min(...ys) - font / 2,
        width: Math.max(...widths), height: Math.max(...ys) - Math.min(...ys) + font };
    });
}

function expectVisible(svg: string, className: string) {
  const css = svg.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  expect(css).not.toMatch(/(?:display:\s*none|visibility:\s*hidden|(?:stroke|fill):\s*(?:none|transparent)|opacity:\s*0(?:;|\s*})|stroke-width:\s*0(?:;|\s*}))/);
}

describe("Fishbone rendered Ishikawa geometry", () => {
  it.each([2, 3, 4, 5, 6, 8, 12])("pairs V-junctions and attaches cause ribs for %i categories", categories => {
    const svg = diagram(categories, 6, 2);
    const spine = elements(svg, "sx-fb-spine")[0];
    const bones = elements(svg, "sx-fb-rib");
    const headers = elements(svg, "sx-fb-header-text");
    expect(bones).toHaveLength(categories);
    expect(headers).toHaveLength(categories);
    expect(elements(svg, "sx-fb-header-pill")).toHaveLength(0);
    expect([...svg.matchAll(/<rect\b/g)]).toHaveLength(0); // The effect is a closed outline.
    expect(svg).toMatch(/\.sx-fb-header-text\s*\{\s*font:\s*700\s+14px/);
    const junctions = [...new Set(bones.map(bone => Number(bone.x1)))];
    expect(junctions).toHaveLength(Math.ceil(categories / 2));
    for (let i = 2; i < junctions.length; i++) {
      expect(junctions[i] - junctions[i - 1]).toBeCloseTo(junctions[1] - junctions[0]);
    }
    expect(Number(spine.x2) - junctions.at(-1)!).toBeLessThanOrEqual(48.001);
    bones.forEach((bone, index) => {
      expectOnSegment(point(bone, 1), point(spine, 1), point(spine, 2));
      const end = point(bone, 2);
      expect(end.y < Number(spine.y1)).toBe(index % 2 === 0);
      expect(end.x).toBeCloseTo(Number(headers[index].x));
      expect(Number(headers[index].y) < end.y).toBe(index % 2 === 0);
      const angle = Math.atan2(Math.abs(end.y - Number(bone.y1)), Math.abs(end.x - Number(bone.x1))) * 180 / Math.PI;
      expect(angle).toBeCloseTo(45);
      if (index % 2 === 1) expect(point(bone, 1)).toEqual(point(bones[index - 1], 1));
    });
    const branches = elements(svg, "sx-fb-branch");
    const labels = elements(svg, "sx-fb-cause-label");
    const boxes = textBoxes(svg, "sx-fb-cause-label");
    expect(branches).toHaveLength(categories * 6);
    branches.forEach((branch, index) => {
      const bone = bones[Number(branch["data-category-index"])];
      const t = (Number(branch.y1) - Number(bone.y1)) / (Number(bone.y2) - Number(bone.y1));
      const intersection = { x: Number(bone.x1) + t * (Number(bone.x2) - Number(bone.x1)), y: Number(branch.y1) };
      expect(branch.y1).toBe(branch.y2);
      expectOnSegment(intersection, point(branch, 1), point(branch, 2));
      expectOnSegment(intersection, point(bone, 1), point(bone, 2));
      expect(labels[index]["text-anchor"]).toBe("start");
      expect(Number(labels[index].x)).toBeCloseTo(Number(branch.x1));
      expect(boxes[index].y + boxes[index].height).toBeLessThan(Number(branch.y1));
    });
    const stems = elements(svg, "sx-fb-sub-stem");
    const ticks = elements(svg, "sx-fb-sub-tick");
    const subBoxes = textBoxes(svg, "sx-fb-sub-label");
    expect(stems).toHaveLength(branches.length);
    expect(ticks).toHaveLength(branches.length * 2);
    ticks.forEach((tick, index) => {
      const matches = (element: Record<string, string>) => element["data-category-index"] === tick["data-category-index"] &&
        element["data-cause-index"] === tick["data-cause-index"];
      const parent = branches.find(matches)!;
      const stem = stems.find(matches)!;
      expectOnSegment(point(stem, 1), point(parent, 1), point(parent, 2));
      expectOnSegment(point(tick, 1), point(stem, 1), point(stem, 2));
      expect(tick.y1).toBe(tick.y2);
      expect(Number(tick.x1)).toBeGreaterThan(Number(parent.x1));
      expect(Number(tick.y1)).toBeGreaterThan(Number(parent.y1));
      expect(Number(tick.x2) - Number(tick.x1)).toBeLessThan(Number(parent.x2) - Number(parent.x1));
      expect(subBoxes[index].x).toBeGreaterThan(Number(tick.x1));
      expect(subBoxes[index].x + subBoxes[index].width).toBeLessThanOrEqual(Number(tick.x2) + 1e-6);
      expect(subBoxes[index].y + subBoxes[index].height).toBeLessThan(Number(tick.y1));
    });
    for (const className of ["sx-fb-header-text", "sx-fb-cause-label", "sx-fb-sub-label"]) expectVisible(svg, className);
    for (const className of ["sx-fb-rib", "sx-fb-branch", "sx-fb-sub-tick"]) {
      expect(elements(svg, className).every(element => element.stroke && element.stroke !== "none")).toBe(true);
      expect(svg.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`))![1]).not.toMatch(/(?:^|;)\s*stroke\s*:|display:\s*none|visibility:\s*hidden|opacity:\s*0;/);
    }
  });

  it.each(["", "config density = compact", "config causeSide = head", "config causeSide = both", "config causeSide = tail", "config ribSlope = 2.9"])(
    "keeps emitted dense text clear of other text, bones and spine (%s)", config => {
      const svg = diagram(6, 6, 3, config);
      const boxes = [...textBoxes(svg, "sx-fb-cause-label"), ...textBoxes(svg, "sx-fb-sub-label")];
      const [,, width, height] = svg.match(/viewBox="([^"]*)"/)![1].split(" ").map(Number);
      const obstacles = ["sx-fb-spine", "sx-fb-rib", "sx-fb-branch", "sx-fb-sub-stem", "sx-fb-sub-tick"]
        .flatMap(name => elements(svg, name)).flatMap(line => edgeLabelObstacles([point(line, 1), point(line, 2)]));
      boxes.forEach((box, index) => {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y + box.height).toBeLessThanOrEqual(height);
        expect(obstacles.every(obstacle => labelOverlap(box, obstacle) === 0)).toBe(true);
        expect(boxes.slice(index + 1).every(other => labelOverlap(box, other) === 0)).toBe(true);
      });
    });

  it.each([[2, 1, 0], [12, 6, 0], [6, 1, 1]])("keeps sparse and wide diagrams attached (%i categories, %i causes, %i details)", (categories, causes, subs) => {
    const svg = diagram(categories, causes, subs);
    const labels = textBoxes(svg, "sx-fb-cause-label");
    const branches = elements(svg, "sx-fb-branch");
    const obstacles = ["sx-fb-spine", "sx-fb-rib"].flatMap(name => elements(svg, name))
      .flatMap(line => edgeLabelObstacles([point(line, 1), point(line, 2)]));
    labels.forEach((box, index) => {
      expect(box.x).toBeCloseTo(Number(branches[index].x1));
      expect(box.y + box.height).toBeLessThan(Number(branches[index].y1));
      expect(obstacles.every(obstacle => labelOverlap(box, obstacle) === 0)).toBe(true);
      expect(labels.slice(index + 1).every(other => labelOverlap(box, other) === 0)).toBe(true);
    });
  });

  it("sizes height from causes and spreads junctions across a requested width", () => {
    const size = (svg: string) => svg.match(/viewBox="([^"]*)"/)![1].split(" ").map(Number).slice(2);
    const small = size(diagram(2, 1));
    const wide = size(diagram(12, 1));
    const dense = size(diagram(12, 6));
    expect(wide[0]).toBeGreaterThan(small[0]);
    expect(dense[1]).toBeGreaterThan(wide[1]);
    expect(size(diagram(2, 0))[1]).toBeLessThan(small[1]);
    const svg = diagram(6, 1, 1, "config width = 2400");
    expect(size(svg)[0]).toBe(2400);
  });

  it("reserves separate rows for a one-cause category and a six-cause category", () => {
    const ast = parseFishboneDSL('fishbone "Mixed"\neffect "Outcome"\ncategory a "A"\ncategory b "B"\na: "One cause"\n' +
      Array.from({ length: 6 }, (_, index) => `b: "Cause ${index}"`).join("\n"));
    const svg = renderFishboneAST(ast);
    const bones = elements(svg, "sx-fb-rib");
    expect(point(bones[0], 1)).toEqual(point(bones[1], 1));
    expect(elements(svg, "sx-fb-branch")).toHaveLength(7);
    const boxes = textBoxes(svg, "sx-fb-cause-label");
    boxes.forEach((box, index) => expect(boxes.slice(index + 1).every(other => labelOverlap(box, other) === 0)).toBe(true));
  });
});
