import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { pedigree } from "../../src/diagrams/pedigree";
import { render } from "../../src/core/api";
import { parsePedigree, layoutPedigree, renderPedigree } from "../../src/diagrams/pedigree";

function required<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) throw new Error("Expected SVG element or attribute");
  return value;
}

// Read only the emitted SVG vocabulary, including ancestor translations. No
// layout/AST/inventory objects are used as evidence for these assertions.
interface Element {
  tag: string;
  attrs: Record<string, string>;
  text: string;
  children: Element[];
  parent?: Element;
}
function svgElements(svg: string): Element[] {
  const elements: Element[] = [];
  const stack: Element[] = [];
  for (const token of svg.match(/<[^>]+>|[^<]+/g) ?? []) {
    if (token.startsWith("</")) { stack.pop(); continue; }
    if (!token.startsWith("<")) {
      if (stack.length) stack[stack.length - 1].text += token.trim();
      continue;
    }
    const tag = required(/^<([\w:-]+)/.exec(token))[1];
    const attrs = Object.fromEntries([...token.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    const parent = stack[stack.length - 1];
    const element: Element = { tag, attrs, text: "", children: [], parent };
    parent?.children.push(element);
    elements.push(element);
    if (!token.endsWith("/>")) stack.push(element);
  }
  return elements;
}
const hasClass = (e: Element, name: string) => (e.attrs.class ?? "").split(/\s+/).includes(name);
const nodes = (es: Element[]) => es.filter((e) => e.tag === "g" && hasClass(e, "schematex-pedigree-node"));
const rows = (es: Element[]) => es.filter((e) => e.attrs["data-legend-key"]);
const keys = (es: Element[]) => rows(es).map((e) => e.attrs["data-legend-key"]);
function paint(es: Element[], e: Element, property: string): string | undefined {
  let value = e.attrs[property];
  for (const style of es.filter((item) => item.tag === "style")) {
    for (const rule of style.text.matchAll(/\.([\w-]+)\s*\{([^}]+)\}/g)) {
      if (!hasClass(e, rule[1])) continue;
      const declaration = new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`).exec(rule[2]);
      if (declaration) value = declaration[1].trim();
    }
  }
  return value ?? (e.parent ? paint(es, e.parent, property) : undefined);
}
function point(e: Element): number[] {
  let x = Number(e.attrs.x ?? 0), y = Number(e.attrs.y ?? 0);
  for (let ancestor: Element | undefined = e; ancestor; ancestor = ancestor.parent) {
    const translate = /translate\(([-\d.]+)[, ]+([-\d.]+)\)/.exec(ancestor.attrs.transform ?? "");
    if (translate) { x += Number(translate[1]); y += Number(translate[2]); }
  }
  return [x, y];
}
function upwardTriangle(e: Element): void {
  expect(e.tag).toBe("polygon");
  const vertices = e.attrs.points.trim().split(/\s+/).map((pair) => pair.split(",").map(Number));
  expect(vertices).toHaveLength(3);
  const [apex, left, right] = [...vertices].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  expect(apex[1]).toBeLessThan(left[1]);
  expect(left[1]).toBe(right[1]);
  expect(left[0]).toBeLessThan(apex[0]);
  expect(right[0]).toBeGreaterThan(apex[0]);
  expect(apex[0]).toBe((left[0] + right[0]) / 2);
}

// Automatic legend completeness is about nontrivial encodings, not every XML
// primitive. The standard excludes plain sex squares/circles, empty fill and
// ordinary mating/descent lines. A loss triangle plus its caption/slash is one
// composite glyph. Explicit user-added/hidden rows are tested separately.
function expectLegendMatchesChart(es: Element[]): void {
  const drawn = new Set<string>();
  for (const node of nodes(es)) {
    for (const glyph of node.children) {
      const c = glyph.attrs.class ?? "";
      if (glyph.tag === "polygon" && hasClass(glyph, "schematex-pedigree-shape")) drawn.add("sex.unknown");
      if (glyph.tag === "polygon" && hasClass(glyph, "schematex-pedigree-loss-shape")) {
        const status = required(/schematex-pedigree-(sab|tab|ectopic)-shape/.exec(c))[1];
        // Every theme tested below also has an ordinary empty symbol to compare.
        const empty = nodes(es).flatMap((n) => n.children).find((e) => hasClass(e, "schematex-pedigree-shape"));
        const affected = empty ? paint(es, glyph, "fill") !== paint(es, empty, "fill") : glyph.attrs.fill !== "#ffffff";
        drawn.add(`status.${status}${affected ? ".affected" : ""}`);
      }
      if (hasClass(glyph, "schematex-pedigree-affected-fill")) drawn.add("status.affected");
      if (hasClass(glyph, "schematex-pedigree-carrier-fill")) {
        drawn.add(hasClass(node, "schematex-pedigree-obligate-carrier") ? "status.obligate-carrier"
          : hasClass(node, "schematex-pedigree-carrier-x") ? "status.carrier-x" : "status.carrier");
      }
      if (glyph.tag === "line" && hasClass(glyph, "schematex-pedigree-presymptomatic-mark")) drawn.add("status.presymptomatic");
      if (glyph.tag === "line" && hasClass(glyph, "schematex-pedigree-deceased-mark") && !hasClass(node, "schematex-pedigree-stillborn")) drawn.add("status.deceased");
      if (glyph.tag === "text" && glyph.text === "SB") drawn.add("status.stillborn");
      if (glyph.tag === "text" && hasClass(glyph, "schematex-pedigree-proband-label")) {
        if (glyph.text === "E") drawn.add("marker.evaluated");
        if (glyph.text === "P" || glyph.text === "C") {
          expect(node.children.some((e) => e.tag === "line" && hasClass(e, "schematex-pedigree-proband-arrow-line"))).toBe(true);
          drawn.add(glyph.text === "P" ? "marker.proband" : "marker.consultand");
        }
      }
    }
  }
  const doubles = es.filter((e) => e.tag === "g" && hasClass(e, "schematex-pedigree-edge-consanguineous"));
  if (doubles.length) {
    expect(doubles.filter((e) => e.children.some((child) => child.tag === "path")).length).toBeGreaterThanOrEqual(2);
    drawn.add("relationship.consanguineous");
  }
  if (es.some((e) => hasClass(e, "schematex-pedigree-edge-separated") && e.children.some((child) => child.tag === "line"))) {
    drawn.add("relationship.separated");
  }
  expect([...keys(es)].sort()).toEqual([...drawn].sort());
  expect(new Set(keys(es)).size).toBe(keys(es).length);
  for (const row of rows(es)) {
    if (/^status\.(sab|tab|ectopic)(\.|$)/.test(row.attrs["data-legend-key"])) {
      const swatch = required(row.children.find((e) => e.tag === "polygon"));
      upwardTriangle(swatch);
      const status = row.attrs["data-legend-key"].split(".")[1];
      const chartFills = nodes(es).flatMap((e) => e.children)
        .filter((e) => hasClass(e, `schematex-pedigree-${status}-shape`)).map((e) => paint(es, e, "fill"));
      expect(chartFills).toContain(paint(es, swatch, "fill"));
    }
  }
}
const caseSource = (name: string) => readFileSync(new URL(`../../visual-eval/cases/pedigree-${name}/source.sx`, import.meta.url), "utf8");

const caseKeys: [string, string[]][] = [
  ["autosomal-dominant", ["status.affected", "marker.proband"]],
  ["autosomal-recessive-carrier-couple", ["status.affected", "status.carrier", "marker.proband"]],
  ["consanguineous-recessive", ["status.affected", "status.carrier", "status.deceased", "status.sab", "relationship.consanguineous", "marker.proband"]],
  ["incomplete-penetrance-with-obligate-carriers", ["status.affected", "status.obligate-carrier", "marker.proband"]],
  ["mitochondrial", ["status.affected", "marker.proband"]],
  ["twins-art", ["sex.unknown", "status.deceased", "marker.proband"]],
  ["x-linked-carriers", ["status.affected", "status.carrier-x", "marker.proband"]],
  ["y-linked-inheritance", ["status.affected", "marker.proband"]],
];

describe("rendered pedigree status symbols and automatic legend", () => {
  test.each(["sab", "tab", "ectopic"])("%s orientation and fill survive declared sex and themes", (status) => {
    for (const theme of ["default", "monochrome", "dark"]) {
      for (const sex of ["unknown", "male", "female"]) {
        const svg = pedigree.render(`pedigree\n  empty [male]\n  loss [${sex}, ${status}]\n  affected [${sex}, ${status}, affected]\n  reference [female, affected]`, { theme, fontSize: 12, fontFamily: "system-ui", padding: 20 });
        const es = svgElements(svg);
        const empty = required(required(nodes(es).find((e) => e.attrs["data-individual-id"] === "empty")).children.find((e) => e.tag === "rect"));
        const full = required(required(nodes(es).find((e) => e.attrs["data-individual-id"] === "reference")).children.find((e) => hasClass(e, "schematex-pedigree-affected-fill")));
        for (const id of ["loss", "affected"]) {
          const node = required(nodes(es).find((e) => e.attrs["data-individual-id"] === id));
          const glyph = required(node.children.find((e) => e.tag === "polygon"));
          upwardTriangle(glyph);
          expect(glyph.attrs.points).toBe("0,-12 12,12 -12,12");
          expect(paint(es, glyph, "fill")).toBe(paint(es, id === "loss" ? empty : full, "fill"));
          expect(node.children.some((e) => hasClass(e, "schematex-pedigree-shape"))).toBe(false);
        }
        expectLegendMatchesChart(es);
        expect(keys(es)).not.toContain("sex.unknown");
      }
    }
  });

  test.each(["", ", unaffected", ", affected"])("loss-only chart has exactly its emitted glyph row: %s", (state) => {
    const es = svgElements(pedigree.render(`pedigree\n  loss [unknown, sab${state}]`));
    expectLegendMatchesChart(es);
    expect(keys(es)).toEqual([`status.sab${state === ", affected" ? ".affected" : ""}`]);
  });

  test("suppressed declarations cannot advertise sex, genetic fills or markers", () => {
    const es = svgElements(pedigree.render(`pedigree
  a [unknown, sab, carrier, proband]
  b [unknown, tab, carrier-x, consultand]
  c [unknown, ectopic, presymptomatic, evaluated]
  d [unknown, sab, obligate-carrier]`));
    expectLegendMatchesChart(es);
    expect(keys(es)).toEqual(["status.sab", "status.tab", "status.ectopic"]);
  });

  test("a real diamond coexists with a loss; repeated encodings deduplicate", () => {
    const es = svgElements(pedigree.render(`pedigree\n  a [unknown]\n  b [unknown, sab]\n  c [unknown, sab]`));
    expectLegendMatchesChart(es);
    expect(keys(es)).toEqual(["sex.unknown", "status.sab"]);
    const diamond = required(nodes(es)[0].children.find((e) => e.tag === "polygon"));
    const swatch = required(rows(es)[0].children.find((e) => e.tag === "polygon"));
    expect(swatch.attrs.points.split(" ")).toHaveLength(4);
    expect(paint(es, diamond, "fill")).toBe(paint(es, swatch, "fill"));
  });

  test("other emitted markers and a separated union have rows", () => {
    const es = svgElements(pedigree.render(`pedigree\n  a [male, stillborn, evaluated]\n  b [female, presymptomatic, consultand]\n  a -/- b`));
    expectLegendMatchesChart(es);
    expect(keys(es)).toEqual(["status.presymptomatic", "status.stillborn", "relationship.separated", "marker.consultand", "marker.evaluated"]);
  });

  test.each(caseKeys)("%s: bidirectional legend coverage and repeatable SVG", (name, expectedKeys) => {
    const source = caseSource(name);
    const svg = pedigree.render(source);
    const es = svgElements(svg);
    expectLegendMatchesChart(es);
    expect(keys(es)).toEqual(expectedKeys);
    expect(pedigree.render(source)).toBe(svg);
  });

  test("SAB caption stays below its identifier and above the legend", () => {
    for (const fontSize of [12, 72]) {
      const es = svgElements(pedigree.render(caseSource("consanguineous-recessive"), { fontSize, fontFamily: "system-ui", theme: "default", padding: 20 }));
      const node = required(nodes(es).find((e) => e.attrs["data-individual-id"] === "iv-3"));
      const caption = required(node.children.find((e) => e.tag === "text" && e.text === "SAB"));
      const identifier = required(es.find((e) => e.tag === "text" && e.attrs["data-individual-id"] === "iv-3"));
      expect(point(caption)[0]).toBe(point(identifier)[0]);
      expect(point(caption)[1] - point(identifier)[1]).toBe(15);
      expect(paint(es, caption, "text-anchor")).toBe("middle");
      const firstLegendLabel = required(rows(es)[0].children.find((e) => e.tag === "text"));
      expect(point(firstLegendLabel)[1]).toBeGreaterThan(point(caption)[1] + 10);
      expect(Number(es[0].attrs.height)).toBeGreaterThan(point(caption)[1]);
    }
  });

  test("public SVG keeps proband and sibling identifiers centred at identical offsets", () => {
    const es = svgElements(render(caseSource("autosomal-dominant")));
    const offsets = ["iv-1", "iv-2"].map((id) => {
      const node = required(nodes(es).find((e) => e.attrs["data-individual-id"] === id));
      const label = required(es.find((e) => e.tag === "text" && e.attrs["data-individual-id"] === id));
      expect(paint(es, label, "text-anchor")).toBe("middle");
      return point(label).map((v, i) => v - point(node)[i]);
    });
    expect(offsets).toEqual([[0, 38], [0, 38]]);
  });

  test("equivalent property order leaves SVG unchanged", () => {
    expect(pedigree.render("pedigree\n  a [unknown, sab, affected]")).toBe(pedigree.render("pedigree\n  a [affected, sab, unknown]"));
    const a = svgElements(pedigree.render("pedigree\n  a [unknown, sab]\n  b [female, affected]\n  c [unknown]"));
    const b = svgElements(pedigree.render("pedigree\n  c [unknown]\n  b [female, affected]\n  a [unknown, sab]"));
    expect(keys(a)).toEqual(keys(b));
  });

  test("explicit legend controls remain intentional exceptions to automatic coverage", () => {
    const source = (directives: string) => `pedigree\n  ${directives}\n  loss [unknown, sab]`;
    const off = svgElements(pedigree.render(source("legend: off")));
    expect(keys(off)).toEqual([]);
    expect(nodes(off)[0].children.some((e) => e.tag === "polygon")).toBe(true);
    expect(keys(svgElements(pedigree.render(source("legend.hide: status.sab"))))).toEqual([]);
    const renamed = svgElements(pedigree.render(source('legend.label status.sab: "Pregnancy loss"')));
    expect(required(rows(renamed)[0].children.find((e) => e.tag === "text")).text).toBe("Pregnancy loss");
    const added = svgElements(pedigree.render(source('legend.item note: "Custom" (kind: marker, marker: E)')));
    expect(keys(added)).toEqual(["status.sab", "note"]);
    const traits = svgElements(pedigree.render(source('legend: cf = "Cystic fibrosis" (fill: quad-tl)')));
    expect(keys(traits)).toEqual(["cf", "status.sab"]);
  });
});

describe("accepted NSGC symbol forms inside frozen footprints", () => {
  const config = { fontFamily: "Inter", fontSize: 12, theme: "default", padding: 20 };
  const drawing = (sex: string, status: string, size = 40, theme = "default") => {
    const ast = parsePedigree(`pedigree\n  subject [${sex}, ${status}]`);
    const layout = layoutPedigree(ast, { nodeWidth: size, nodeHeight: size, nodeSpacingX: 80, nodeSpacingY: 100 });
    const before = structuredClone(layout);
    const svg = renderPedigree(layout, { ...config, theme }, ast);
    expect(layout).toEqual(before);
    expect(svg).not.toMatch(/(?:transform|patternTransform)="[^"]*scale\(/);
    return svgElements(svg);
  };

  test.each(["male", "female", "unknown"].flatMap(sex => [24, 40, 64].map(size => ({ sex, size }))))(
    "$sex presymptomatic reaches both edges at size $size without shading", ({ sex, size }) => {
      const es = drawing(sex, "presymptomatic", size);
      const node = nodes(es)[0];
      const mark = required(node.children.find(e => hasClass(e, "schematex-pedigree-presymptomatic-mark")));
      expect([mark.attrs.x1, mark.attrs.y1, mark.attrs.x2, mark.attrs.y2].map(Number)).toEqual([0, -size / 2, 0, size / 2]);
      expect(node.children.some(e => /-(affected|carrier)-fill/.test(e.attrs.class ?? ""))).toBe(false);
    }
  );

  test.each(["male", "female", "unknown"])("%s carrier hatches the entire outline and its legend in every theme", sex => {
    for (const theme of ["default", "monochrome", "dark"]) {
      const es = drawing(sex, "carrier", 40, theme);
      const node = nodes(es)[0];
      const fill = required(node.children.find(e => hasClass(e, "schematex-pedigree-carrier-fill")));
      const shape = required(node.children.find(e => hasClass(e, "schematex-pedigree-shape")));
      expect(fill.tag).toBe(shape.tag);
      for (const key of ["x", "y", "width", "height", "cx", "cy", "r", "points"]) expect(fill.attrs[key]).toBe(shape.attrs[key]);
      expect(fill.attrs["clip-path"]).toBeUndefined();
      expect(node.children.some(e => hasClass(e, "schematex-pedigree-carrier-x-dot"))).toBe(false);
      const pattern = required(es.find(e => e.tag === "pattern" && e.attrs.id === "schematex-pedigree-carrier-pattern"));
      expect(pattern).toBeDefined();
      expect(paint(es, fill, "fill")).toBe(`url(#${pattern.attrs.id})`);
      expect(pattern.attrs.patternUnits).toBe("userSpaceOnUse");
      const hatch = required(pattern.children.find(e => e.tag === "path" || e.tag === "line"));
      expect(hatch).toBeDefined();
      expect(pattern.attrs.patternTransform === "rotate(45)" || hatch.attrs.d?.includes("L")).toBe(true);
      const affected = drawing(sex, "affected", 40, theme);
      expect(paint(es, hatch, "stroke")).toBe(paint(affected, required(nodes(affected)[0].children.find(e => hasClass(e, "schematex-pedigree-affected-fill"))), "fill"));
      const row = required(rows(es).find(e => e.attrs["data-legend-key"] === "status.carrier"));
      expect(row.children.some(e => paint(es, e, "fill") === `url(#${pattern.attrs.id})`)).toBe(true);
    }
  });

  // Bennett et al. 2022 §4.5 retired the centre dot for every carrier, not only the plain one.
  test.each(["carrier-x", "obligate-carrier"])("%s uses the 2022 carrier hatch, not the retired centre dot", status => {
    const es = drawing("female", status);
    const node = nodes(es)[0];
    expect(node.children.some(e => hasClass(e, "schematex-pedigree-carrier-fill"))).toBe(true);
    expect(node.children.some(e => e.tag === "circle" && hasClass(e, "schematex-pedigree-carrier-x-dot"))).toBe(false);
    expect(es.some(e => e.tag === "pattern" && e.attrs.id === "schematex-pedigree-carrier-pattern")).toBe(true);
  });

  test("ended relationship keeps its continuous path and adds two parallel rising slashes", () => {
    const ast = parsePedigree("pedigree\n  first [male]\n  second [female]\n  first -/- second\n    child [female]");
    const layout = layoutPedigree(ast, { nodeWidth: 40, nodeHeight: 40, nodeSpacingX: 80, nodeSpacingY: 100 });
    const es = svgElements(renderPedigree(layout, config, ast));
    const edge = required(es.find(e => hasClass(e, "schematex-pedigree-edge-separated")));
    expect(required(edge.children.find(e => e.tag === "path")).attrs.d).toBe(required(layout.edges.find(e => e.relationship.type === "separated")).path);
    const slashes = edge.children.filter(e => e.tag === "line");
    expect(slashes).toHaveLength(2);
    for (const slash of slashes) {
      expect(+slash.attrs.x2).toBeGreaterThan(+slash.attrs.x1);
      expect(+slash.attrs.y2).toBeLessThan(+slash.attrs.y1);
    }
    expect(+slashes[0].attrs.y1).toBe(+slashes[1].attrs.y1);
    expect(+slashes[0].attrs.y2).toBe(+slashes[1].attrs.y2);
    expect(+slashes[0].attrs.x2 - +slashes[0].attrs.x1).toBe(+slashes[1].attrs.x2 - +slashes[1].attrs.x1);
  });

  test.each(["ectopic", "ectopic, affected"])("%s retains the loss triangle and adds termination slash and ECT", status => {
    const node = nodes(drawing("unknown", status))[0];
    const triangle = required(node.children.find(e => hasClass(e, "schematex-pedigree-loss-shape")));
    upwardTriangle(triangle);
    const slash = required(node.children.find(e => hasClass(e, "schematex-pedigree-tab-slash")));
    expect(slash).toBeDefined();
    expect(+slash.attrs.x1).toBeLessThan(-12);
    expect(+slash.attrs.y2).toBeLessThan(-12);
    expect(node.children.some(e => e.tag === "text" && e.text === "ECT")).toBe(true);
  });

  test.each(["male", "female", "unknown"])("%s stillborn keeps SB and deceased slash in either property order", sex => {
    for (const status of ["stillborn", "stillborn, deceased", "deceased, stillborn"]) {
      const node = nodes(drawing(sex, status))[0];
      expect(node.children.filter(e => hasClass(e, "schematex-pedigree-deceased-mark"))).toHaveLength(1);
      expect(node.children.filter(e => e.tag === "text" && e.text === "SB")).toHaveLength(1);
    }
  });

  test.each(["male", "female", "unknown"])("%s pregnancy places P inside the existing symbol", sex => {
    const es = drawing(sex, "pregnancy");
    const node = nodes(es)[0];
    const mark = required(node.children.find(e => hasClass(e, "schematex-pedigree-pregnancy-mark")));
    expect(mark).toBeDefined();
    expect(mark.text).toBe("P");
    expect(+mark.attrs.x).toBe(0);
    expect(Math.abs(+mark.attrs.y)).toBeLessThan(10);
    expect(paint(es, mark, "text-anchor")).toBe("middle");
  });

  test.each(["stillborn", "ectopic"])("%s qualifier clears the unchanged individual number", status => {
    const es = drawing("unknown", status);
    const qualifier = required(nodes(es)[0].children.find(e => e.tag === "text"));
    const identifier = required(es.find(e => hasClass(e, "schematex-pedigree-label")));
    expect(point(qualifier)[1] - point(identifier)[1]).toBe(15);
  });

  test("repeated stillborn/deceased declarations retain the more specific status in either order", () => {
    for (const statuses of [["stillborn", "deceased"], ["deceased", "stillborn"]]) {
      const es = svgElements(pedigree.render(`pedigree\n  subject [female, ${statuses[0]}]\n  subject [${statuses[1]}]`));
      expect(nodes(es)[0].children.filter(e => hasClass(e, "schematex-pedigree-deceased-mark"))).toHaveLength(1);
      expect(nodes(es)[0].children.some(e => e.tag === "text" && e.text === "SB")).toBe(true);
    }
  });
});
