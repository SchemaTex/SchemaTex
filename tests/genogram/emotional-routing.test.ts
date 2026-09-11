import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { genogram } from "../../src/diagrams/genogram";
import { estimateTextWidth } from "../../src/core/text-metrics";

interface Point { x: number; y: number }
interface Box extends Point { width: number; height: number }
interface Element { tag: string; attrs: Record<string, string>; offset: Point; ancestors: Element[]; text: string }
const numbers = (s: string) => (s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const hasClass = (e: Element, name: string) => (e.attrs.class ?? "").split(/\s+/).includes(name);

// Test-only SVG reader: resolve ancestor translations rather than asserting layout coordinates.
function elements(svg: string): Element[] {
  const result: Element[] = [], stack: Element[] = [];
  for (const m of svg.matchAll(/<(\/?)([\w:-]+)\b([^>]*?)(\/?)>/g)) {
    if (m[1]) { stack.pop(); continue; }
    const attrs = Object.fromEntries([...m[3].matchAll(/([\w:-]+)="([^"]*)"/g)].map(a => [a[1], decode(a[2])]));
    const parent = stack.at(-1)?.offset ?? { x: 0, y: 0 };
    const delta = numbers(/translate\(([^)]+)\)/.exec(attrs.transform ?? "")?.[1] ?? "0 0");
    const e: Element = { tag: m[2], attrs, offset: { x: parent.x + delta[0], y: parent.y + (delta[1] ?? 0) },
      ancestors: [...stack], text: decode(svg.slice(m.index! + m[0].length).split("<")[0]) };
    result.push(e);
    if (!m[4]) stack.push(e);
  }
  return result;
}
function points(e: Element): Point[] {
  const values = numbers(e.attrs.d ?? e.attrs.points);
  return Array.from({ length: values.length / 2 }, (_, i) => ({ x: values[i * 2] + e.offset.x, y: values[i * 2 + 1] + e.offset.y }));
}
function symbolBox(node: Element, all: Element[]): Box {
  const shape = all.find(e => e.ancestors.includes(node) && hasClass(e, "schematex-genogram-shape"))!;
  const border = all.find(e => e.ancestors.includes(node) && hasClass(e, "schematex-genogram-index-border")) ?? shape;
  if (border.tag === "rect") return { x: Number(border.attrs.x) + border.offset.x, y: Number(border.attrs.y) + border.offset.y,
    width: Number(border.attrs.width), height: Number(border.attrs.height) };
  if (border.tag === "circle") { const r = Number(border.attrs.r); return { x: border.offset.x - r, y: border.offset.y - r, width: r * 2, height: r * 2 }; }
  const p = points(border), xs = p.map(p => p.x), ys = p.map(p => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
function crosses(a: Point, b: Point, box: Box, padding: number): boolean {
  const left = box.x - padding, right = box.x + box.width + padding;
  const top = box.y - padding, bottom = box.y + box.height + padding;
  if (Math.max(a.x, b.x) <= left || Math.min(a.x, b.x) >= right || Math.max(a.y, b.y) <= top || Math.min(a.y, b.y) >= bottom) return false;
  if (a.x === b.x || a.y === b.y) return true;
  const inside = (p: Point) => p.x > left && p.x < right && p.y > top && p.y < bottom;
  if (inside(a) || inside(b)) return true;
  for (const x of [left, right]) {
    const t = (x - a.x) / (b.x - a.x), y = a.y + t * (b.y - a.y);
    if (t >= 0 && t <= 1 && y > top && y < bottom) return true;
  }
  for (const y of [top, bottom]) {
    const t = (y - a.y) / (b.y - a.y), x = a.x + t * (b.x - a.x);
    if (t >= 0 && t <= 1 && x > left && x < right) return true;
  }
  return false;
}
function verify(svg: string, checkCurrentPatterns = true) {
  const all = elements(svg);
  const css = all.find(e => e.tag === "style")!.text;
  const captions = all.filter(e => e.tag === "text" && /^schematex-genogram-(label|vitals|annotation|note|stillborn-mark)$/.test(e.attrs.class ?? ""));
  const boxes = captions.map(e => {
    const fontSize = Number(e.attrs["font-size"] ?? new RegExp(`\\.${e.attrs.class}[^}]*font-size: ([\\d.]+)px`).exec(css)?.[1] ??
      /\.schematex-genogram-note[^}]*font-size: ([\d.]+)px/.exec(css)![1]);
    const width = estimateTextWidth(e.text, fontSize);
    return { x: Number(e.attrs.x) + e.offset.x - width / 2, y: Number(e.attrs.y) + e.offset.y - fontSize,
      width, height: fontSize * 1.25, text: e.text };
  });
  const nodes = all.filter(e => hasClass(e, "schematex-genogram-node"));
  const groups = all.filter(e => hasClass(e, "schematex-genogram-emotional"));
  expect(groups.length).toBeGreaterThan(0);
  const root = all.find(e => e.tag === "svg")!, [, , width, height] = numbers(root.attrs.viewBox);
  for (const group of groups) {
    const strokes = all.filter(e => e.tag === "path" && e.ancestors.includes(group));
    expect(strokes.length).toBeGreaterThan(0);
    const type = group.attrs["data-relationship-type"];
    const lines = strokes.map(points);
    if (type === "close" || type === "fused") {
      expect(lines).toHaveLength(type === "close" ? 2 : 3);
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i]).toHaveLength(lines[0].length);
        for (let j = 0; j < lines[0].length; j++) {
          expect(Math.hypot(lines[i][j].x - lines[i - 1][j].x, lines[i][j].y - lines[i - 1][j].y)).toBeCloseTo(type === "close" ? 5 : 4, 2);
        }
      }
    } else if (type === "conflict") {
      if (checkCurrentPatterns) expect(lines).toHaveLength(3);
      for (const hash of lines.slice(1)) expect(Math.hypot(hash[1].x - hash[0].x, hash[1].y - hash[0].y)).toBeCloseTo(12, 2);
      const p = lines[0];
      // Signed turns follow the local tangent, independent of the route's orientation.
      const turns = p.slice(2).map((c, i) => (p[i + 1].x - p[i].x) * (c.y - p[i + 1].y) - (p[i + 1].y - p[i].y) * (c.x - p[i + 1].x));
      expect(turns.slice(1).filter((t, i) => t * turns[i] < 0).length).toBeGreaterThan(turns.length / 2);
    } else if (type === "cutoff") {
      expect(lines).toHaveLength(4);
      expect(Math.hypot(lines[0].at(-1)!.x - lines[1][0].x, lines[0].at(-1)!.y - lines[1][0].y)).toBeGreaterThan(5);
      for (let i = 0; i < 2; i++) {
        const [a, b] = lines[i + 2], end = i === 0 ? lines[0].at(-1)! : lines[1][0];
        const previous = i === 0 ? lines[0].at(-2)! : lines[1][1];
        const tx = end.x - previous.x, ty = end.y - previous.y;
        expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(12, 2);
        expect(Math.hypot((a.x + b.x) / 2 - end.x, (a.y + b.y) / 2 - end.y)).toBeLessThan(0.01);
        expect(Math.abs((b.x - a.x) * tx + (b.y - a.y) * ty) / (12 * Math.hypot(tx, ty))).toBeLessThan(0.2);
      }
    } else if (type === "distant") {
      expect(strokes).toHaveLength(1);
      expect(strokes[0].attrs["stroke-dasharray"]).toBe("2,5");
    }
    for (const stroke of strokes) {
      expect(stroke.attrs.d).not.toMatch(/[QC]/);
      const p = points(stroke), radius = Number(stroke.attrs["stroke-width"]) / 2;
      expect(p.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < p.length; i++) {
        // A person's name is inviolable; the padding around it is only a preference,
        // so a tie may pass close to a caption but never over the text itself.
        for (const box of boxes) expect(crosses(p[i - 1], p[i], box, radius), `${group.attrs["data-from"]}→${group.attrs["data-to"]}: ${box.text}`).toBe(false);
        for (const node of nodes) {
          if ([group.attrs["data-from"], group.attrs["data-to"]].includes(node.attrs["data-individual-id"])) {
            expect(crosses(p[i - 1], p[i], symbolBox(node, all), -0.1), "route re-enters its own symbol").toBe(false);
            continue;
          }
          expect(crosses(p[i - 1], p[i], symbolBox(node, all), radius + 4), `crosses ${node.attrs["data-individual-id"]}`).toBe(false);
        }
      }
      for (const point of p) {
        expect(point.x - radius).toBeGreaterThanOrEqual(0);
        expect(point.y - radius).toBeGreaterThanOrEqual(0);
        expect(point.x + radius).toBeLessThanOrEqual(width);
        expect(point.y + radius).toBeLessThanOrEqual(height);
      }
      if (stroke.attrs["marker-end"]) {
        const marker = all.find(e => e.attrs.id === "schematex-genogram-arrow")!;
        const end = p.at(-1)!, prev = p.at(-2)!;
        const distance = Math.hypot(end.x - prev.x, end.y - prev.y);
        const ux = (end.x - prev.x) / distance, uy = (end.y - prev.y) / distance;
        const length = Number(marker.attrs.markerWidth) * radius * 2, half = Number(marker.attrs.markerHeight) * radius;
        const back = { x: end.x - ux * length, y: end.y - uy * length };
        const triangle = [end, { x: back.x - uy * half, y: back.y + ux * half }, { x: back.x + uy * half, y: back.y - ux * half }, end];
        for (let i = 1; i < triangle.length; i++) for (const box of boxes) expect(crosses(triangle[i - 1], triangle[i], box, 4)).toBe(false);
        for (const v of triangle) { expect(v.x).toBeGreaterThanOrEqual(0); expect(v.y).toBeGreaterThanOrEqual(0); expect(v.x).toBeLessThanOrEqual(width); expect(v.y).toBeLessThanOrEqual(height); }
      }
    }
    // The average parallel endpoint lies on the declared owner's cardinal perimeter.
    const runCount = type === "cutoff" ? 2 : type === "conflict" ? 1 : strokes.length;
    const first = points(strokes[0])[0], last = points(strokes[runCount - 1]).at(-1)!;
    for (const [id, point] of [[group.attrs["data-from"], first], [group.attrs["data-to"], last]] as const) {
      const node = nodes.find(n => n.attrs["data-individual-id"] === id)!;
      const box = symbolBox(node, all), cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const distance = Math.min(Math.hypot(point.x - cx, point.y - box.y), Math.hypot(point.x - box.x, point.y - cy), Math.hypot(point.x - box.x - box.width, point.y - cy));
      expect(distance).toBeLessThanOrEqual(4.01);
    }
  }
  const labelRects = all.filter(e => e.tag === "rect" && e.ancestors.some(a => hasClass(a, "schematex-genogram-edge-labels")));
  for (const rect of labelRects) {
    const b = { x: rect.offset.x + Number(rect.attrs.x), y: rect.offset.y + Number(rect.attrs.y), width: Number(rect.attrs.width), height: Number(rect.attrs.height) };
    expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(width); expect(b.y + b.height).toBeLessThanOrEqual(height);
    for (const caption of boxes) expect(b.x >= caption.x + caption.width || b.x + b.width <= caption.x || b.y >= caption.y + caption.height || b.y + b.height <= caption.y).toBe(true);
  }
  const leaders = all.filter(e => e.tag === "line" && e.ancestors.some(a => hasClass(a, "schematex-genogram-edge-labels")));
  for (const leader of leaders) {
    const a = { x: Number(leader.attrs.x1) + leader.offset.x, y: Number(leader.attrs.y1) + leader.offset.y };
    const b = { x: Number(leader.attrs.x2) + leader.offset.x, y: Number(leader.attrs.y2) + leader.offset.y };
    for (const box of boxes) expect(crosses(a, b, box, 0.5), "caption leader crosses person text").toBe(false);
  }
  const legend = all.find(e => hasClass(e, "schematex-legend"));
  if (legend) {
    const tops = all.filter(e => e.ancestors.includes(legend)).flatMap(e => {
      if (e.tag === "text") return [Number(e.attrs.y) + e.offset.y - 12];
      if (e.tag === "path") return points(e).map(p => p.y);
      if (e.tag === "rect") return [Number(e.attrs.y) + e.offset.y];
      if (e.tag === "circle") return [Number(e.attrs.cy ?? 0) + e.offset.y - Number(e.attrs.r)];
      return [];
    });
    const chartBottom = Math.max(...boxes.map(b => b.y + b.height), ...all.filter(e => e.tag === "path" && e.ancestors.some(a => groups.includes(a))).flatMap(e => points(e).map(p => p.y + Number(e.attrs["stroke-width"]) / 2)));
    expect(chartBottom).toBeLessThan(Math.min(...tops));
  }
  return { all, boxes, groups, nodes };
}
const cases = ["substance-use-three-generations", "emotional-overlay", "cutoff-and-fusion", "care-network", "caregiver-burden-elderly"];
const source = (id: string) => readFileSync(`visual-eval/cases/genogram-${id}/source.sx`, "utf8");

describe("painted emotional routing", () => {
  it("keeps the Carter fusion near its two endpoints across generations", () => {
    const { all, groups, nodes } = verify(genogram.render(source("emotional-overlay")));
    const group = groups.find(g => g.attrs["data-relationship-type"] === "fused")!;
    const a = nodes.find(n => n.attrs["data-individual-id"] === group.attrs["data-from"])!;
    const b = nodes.find(n => n.attrs["data-individual-id"] === group.attrs["data-to"])!;
    const distance = Math.hypot(a.offset.x - b.offset.x, a.offset.y - b.offset.y);
    for (const stroke of all.filter(e => e.tag === "path" && e.ancestors.includes(group))) {
      const p = points(stroke);
      const length = p.slice(1).reduce((sum, b, i) => sum + Math.hypot(b.x - p[i].x, b.y - p[i].y), 0);
      expect(length / distance).toBeLessThan(2);
    }
  });
  it.each(["close", "fused"])("keeps a %s parent–child tie local instead of circling the family", type => {
    const svg = genogram.render(`genogram
  a [male, label: "Parent A"]
  b [female, label: "Parent B"]
  a -- b
    c [male, label: "Child"]
  b -${type}- c`);
    const { all, groups, nodes } = verify(svg);
    const a = nodes.find(n => n.attrs["data-individual-id"] === "b")!;
    const b = nodes.find(n => n.attrs["data-individual-id"] === "c")!;
    const distance = Math.hypot(a.offset.x - b.offset.x, a.offset.y - b.offset.y);
    for (const stroke of all.filter(e => e.tag === "path" && e.ancestors.includes(groups[0]))) {
      const p = points(stroke);
      const length = p.slice(1).reduce((sum, b, i) => sum + Math.hypot(b.x - p[i].x, b.y - p[i].y), 0);
      expect(length / distance).toBeLessThan(1.8);
    }
  });
  it.each([1, 3, 5])("routes new family structures with %s children without depending on IDs", count => {
    const children = Array.from({ length: count }, (_, i) =>
      `    child${i} [female, label: "Child ${i}"]`).join("\n");
    const input = `genogram
  parenta [male, label: "Parent A"]
  parentb [female, label: "Parent B"]
  parenta -- parentb
${children}
  parenta -close- child0
  parentb -cutoff- child${count - 1}`;
    const original = verify(genogram.render(input));
    const renamed = verify(genogram.render(input.replace(/\b(parenta|parentb|child\d+)\b/g, "renamed_$1")));
    const paths = (result: typeof original) => result.all
      .filter(e => e.tag === "path" && e.ancestors.some(a => result.groups.includes(a)))
      .map(points);
    expect(paths(renamed)).toEqual(paths(original));
  });
  it("placing an emotional label does not change later routes when relationships are reordered", () => {
    const family = `genogram
  a [male]
  b [female]
  a -- b
    c [female]
    d [male]`;
    const ties = ['a -close- c [label: "Support"]', 'b -cutoff- d'];
    const geometry = (lines: string[]) => {
      const result = verify(genogram.render(`${family}\n${lines.join("\n")}`));
      return result.groups.map(group => ({
        type: group.attrs["data-relationship-type"],
        paths: result.all.filter(e => e.tag === "path" && e.ancestors.includes(group)).map(points),
      })).sort((a, b) => a.type.localeCompare(b.type));
    };
    expect(geometry([...ties].reverse())).toEqual(geometry(ties));
  });
  it.each(cases)("clears every caption and unrelated symbol: %s", id => {
    const svg = genogram.render(source(id));
    const { all, groups, nodes } = verify(svg);
    const expectedPairs = [...source(id).matchAll(/^\s*(\w+)\s+-(close|friendship|cutoff|fused|conflict|distant)-\s+(\w+)/gm)].map(m => [m[1], m[3], m[2]]);
    expect(groups.map(g => [g.attrs["data-from"], g.attrs["data-to"], g.attrs["data-relationship-type"]])).toEqual(expectedPairs);
    const structural = all.filter(e => e.tag === "path" && e.ancestors.some(a => hasClass(a, "schematex-genogram-edge")));
    const emotional = all.filter(e => e.tag === "path" && e.ancestors.some(a => groups.includes(a)));
    const joints = structural.flatMap(points).filter(p => !nodes.some(node => {
      const b = symbolBox(node, all);
      return p.x >= b.x - 0.01 && p.x <= b.x + b.width + 0.01 && p.y >= b.y - 0.01 && p.y <= b.y + b.height + 0.01;
    }));
    for (const path of emotional) {
      const p = points(path);
      for (let i = 1; i < p.length; i++) for (const joint of joints) {
        expect(crosses(p[i - 1], p[i], { x: joint.x - 2, y: joint.y - 2, width: 4, height: 4 }, 4 + Number(path.attrs["stroke-width"]) / 2), "emotional stroke crosses a family attachment").toBe(false);
      }
      for (let i = 1; i < p.length; i++) for (const edge of structural) {
        const q = points(edge), a = p[i - 1], b = p[i];
        for (let j = 1; j < q.length; j++) {
          const c = q[j - 1], d = q[j];
          const cross = (v: Point) => (b.x - a.x) * (v.y - a.y) - (b.y - a.y) * (v.x - a.x);
          if (Math.abs(cross(c)) > 1e-5 || Math.abs(cross(d)) > 1e-5) continue;
          const axis = Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? "x" : "y";
          const overlap = Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) - Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
          expect(overlap, "emotional stroke shares a structural run").toBeLessThanOrEqual(0.01);
        }
      }
    }
    const expected: Record<string, string[]> = {
      "substance-use-three-generations": ["No contact since 2023"],
      "emotional-overlay": [], "cutoff-and-fusion": ["Estranged", "Over-involved"],
      "care-network": ["學校支持", "個案支持", "鄰里照顧"],
      "caregiver-burden-elderly": ["Daily care and support", "Weekly transport", "Unequal care workload"],
    };
    expect(all.filter(e => hasClass(e, "schematex-genogram-edge-label")).map(e => e.text).sort()).toEqual(expected[id].sort());
    expect(genogram.render(source(id))).toBe(svg);
  });
  it("rejects the original Morris label strike", () => {
    const before = readFileSync("tests/genogram/fixtures/morris-before-emotional-routing.svg", "utf8");
    const conflictOnly = before.replace(/<g class="schematex-genogram-emotional schematex-genogram-emotional-(cutoff|close)"[^>]*>[\s\S]*?<\/g>/g, "");
    // The historical fixture predates conflict hash marks; this assertion isolates
    // the original caption strike rather than failing on the newer notation.
    expect(() => verify(conflictOnly, false)).toThrow(/Peter Morris|Susan Morris/);
  });
  it("bounds the painted Nguyen cutoff and other detours relative to their endpoint distance", () => {
    const all = elements(genogram.render(source("cutoff-and-fusion")));
    const nodes = all.filter(e => hasClass(e, "schematex-genogram-node"));
    const groups = all.filter(e => hasClass(e, "schematex-genogram-emotional"));
    expect(groups).toHaveLength(5);
    const length = (p: Point[]) => p.slice(1).reduce((sum, b, i) => sum + Math.hypot(b.x - p[i].x, b.y - p[i].y), 0);
    for (const group of groups) {
      const a = nodes.find(n => n.attrs["data-individual-id"] === group.attrs["data-from"])!;
      const b = nodes.find(n => n.attrs["data-individual-id"] === group.attrs["data-to"])!;
      const distance = Math.hypot(a.offset.x - b.offset.x, a.offset.y - b.offset.y);
      const strokes = all.filter(e => e.tag === "path" && e.ancestors.includes(group)).map(points);
      const type = group.attrs["data-relationship-type"];
      // Count the cutoff's gap, but not its transverse caps; parallel strokes are
      // separate paths, so use the longest rather than summing their ink lengths.
      const paintedLength = type === "cutoff"
        ? length(strokes[0]) + length(strokes[1]) + Math.hypot(strokes[0].at(-1)!.x - strokes[1][0].x, strokes[0].at(-1)!.y - strokes[1][0].y)
        : Math.max(...strokes.map(length));
      const multiple = type === "conflict" ? 4 : type === "close" ? 3.5 : 2;
      expect(paintedLength, `${group.attrs["data-from"]}→${group.attrs["data-to"]}: painted length / D = ${paintedLength / distance}`).toBeLessThan(multiple * distance);
    }
  });
  it.each([8, 12, 24])("handles long captions, status text, arrows and CJK at %s px", fontSize => {
    const input = `genogram "Routing pressure"
  a [male, label: "Maximilian Montgomery-Williamson"]
    @care: "Daily personal assistance & support"
    @burden: "Needs regular respite"
  b [female, label: "山田美智子山田美智子"]
  a -- b
    c [female, index, dob: "1990-01-01", note: "Continued observation"]
  a -cutoff- c [label: "No contact"]
  b -fused- c
  a -conflict- b
  c -abuse-> b [label: "Reported"]`;
    const options = { fontSize, fontFamily: "system-ui", theme: "default" as const, padding: 20 };
    const svg = genogram.render(input, options);
    verify(svg);
    const reordered = input.replace('    @care: "Daily personal assistance & support"\n    @burden: "Needs regular respite"', '    @burden: "Needs regular respite"\n    @care: "Daily personal assistance & support"');
    expect(genogram.render(reordered, options)).toBe(svg);
    genogram.render(source("care-network"));
    expect(genogram.render(input, options)).toBe(svg);
  });
  it("completes deterministically around twin branches, sibling brackets and status captions", () => {
    const input = `genogram
  a [male]
  b [female]
  a -- b
    c [female, 2010, twin-identical]
    d [female, 2010, twin-identical]
    loss [male, stillborn, 2020]
    baby [pregnancy]
  aunt [female, sibling-of: b]
  aunt -close- c
  b -cutoff- loss [label: "Reported distance"]
  baby -conflict-> a`;
    const svg = genogram.render(input);
    // Assert legibility and semantics, without requiring a particular detour or collision.
    const { all, groups } = verify(svg);
    expect(groups.map(g => [g.attrs["data-from"], g.attrs["data-to"], g.attrs["data-relationship-type"]])).toEqual([
      ["aunt", "c", "close"], ["b", "loss", "cutoff"], ["baby", "a", "conflict"],
    ]);
    const conflict = groups[2];
    const strokes = all.filter(e => e.tag === "path" && e.ancestors.includes(conflict));
    expect(strokes).toHaveLength(3);
    expect(strokes[0].attrs["marker-end"]).toBe("url(#schematex-genogram-arrow)");
    genogram.render(source("care-network"));
    expect(genogram.render(input)).toBe(svg);
  });
  it("keeps multiple ties on one pair distinct, including decorated directional markers", () => {
    const svg = genogram.render(`genogram
  a [male]
  b [female]
  a -- b
  a -close-> b [label: "Support"]
  a -conflict-> b [label: "Dispute"]
  a -cutoff-> b [label: "Estrangement"]`);
    const { all, groups } = verify(svg);
    expect(groups).toHaveLength(3);
    const strokes = all.filter(e => e.tag === "path" && e.ancestors.some(a => groups.includes(a)));
    expect(new Set(strokes.map(e => e.attrs.d)).size).toBe(strokes.length);
    expect(strokes.filter(e => e.attrs["marker-end"])).toHaveLength(3);
  });
  it("keeps a titleless chart within a legend-widened viewBox, including scene and pins", () => {
    const input = 'genogram\n a [male]\n b [female]\n a -conflict- b [label: "Disagreement"]';
    verify(genogram.render(input));
    const options = { __scene: [], __pins: new Map([["a", { x: 30, y: 0 }], ["b", { x: 190, y: 0 }]]) };
    const svg = genogram.render(input, options);
    verify(svg);
    expect(svg).toContain('data-sx-live-mode="sampled"');
    expect(svg).toContain('data-sx-live-start="a" data-sx-live-end="b"');
    expect(svg).not.toContain('data-sx-live-mode="quadratic"');
    expect(genogram.render(input, { ...options, __scene: [] })).toBe(svg);
  });
});
