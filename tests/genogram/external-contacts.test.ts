import { expect, test } from "vitest";
import { genogram, parseGenogram, layoutGenogram } from "../../src/diagrams/genogram";

const family = `genogram
  a [male]
  b [female]
  a -- b
    c [female, index]`;
const config = { nodeWidth: 40, nodeHeight: 40, nodeSpacingX: 80, nodeSpacingY: 100 };

test("external contacts retain their semantic flag through redeclarations", () => {
  const ast = parseGenogram(`${family}\n  helper [other]\n  helper [external: true]\n  c -close- helper`);
  expect(ast.individuals.find(n => n.id === "helper")?.external).toBe(true);
  expect(() => parseGenogram("genogram\n helper [external: maybe]")).toThrow(/external/);
});

test("contacts sit beside the person they support without displacing family members", () => {
  const input = `${family}
  helper [other, label: "School counsellor", external: true]
  neighbour [female, label: "Neighbour", external: true]
  helper -close- c
  c -friendship- neighbour`;
  const layout = layoutGenogram(parseGenogram(input), config);
  const child = layout.nodes.find(n => n.id === "c")!;
  for (const id of ["helper", "neighbour"]) {
    const contact = layout.nodes.find(n => n.id === id)!;
    expect(contact.y).toBe(child.y);
    expect(Math.abs(contact.x - child.x)).toBeLessThan(250);
  }
  const baseline = layoutGenogram(parseGenogram(family), config);
  for (const a of baseline.nodes) for (const b of baseline.nodes) {
    const nextA = layout.nodes.find(n => n.id === a.id)!;
    const nextB = layout.nodes.find(n => n.id === b.id)!;
    expect(nextA.x - nextB.x).toBeCloseTo(a.x - b.x);
    expect(nextA.y - nextB.y).toBeCloseTo(a.y - b.y);
  }
  const svg = genogram.render(input);
  expect(svg.match(/class="[^"]*schematex-genogram-external/g)).toHaveLength(2);
  for (const id of ["helper", "neighbour"]) {
    expect(svg).toMatch(new RegExp(`data-individual-id="${id}"[^>]*>[\\s\\S]*?stroke-dasharray="4,3"`));
  }
});

test.each([false, true])("contact-to-contact ties do not change the supported generation (reversed: %s)", reverse => {
  const declarations = ["helper [other, external: true]", "therapist [other, external: true]"];
  if (reverse) declarations.reverse();
  const input = `${family}\n  ${declarations.join("\n  ")}
  helper -close- c
  therapist -close- a
  helper -friendship- therapist`;
  const { nodes } = layoutGenogram(parseGenogram(input), config);
  const byId = (id: string) => nodes.find(n => n.id === id)!;
  expect(byId("helper").y).toBe(byId("c").y);
  expect(byId("therapist").y).toBe(byId("a").y);
});

test("multiple emotional descriptions of one tie do not reweight placement", () => {
  const input = `${family}
  helper [other, external: true]
  helper -close- a
  helper -close- c`;
  const baseline = layoutGenogram(parseGenogram(input), config);
  const additional = layoutGenogram(parseGenogram(`${input}\n  helper -conflict- a`), config);
  const relative = (nodes: typeof baseline.nodes) => {
    const helper = nodes.find(n => n.id === "helper")!;
    const child = nodes.find(n => n.id === "c")!;
    return { x: helper.x - child.x, y: helper.y - child.y };
  };
  expect(relative(additional.nodes)).toEqual(relative(baseline.nodes));
});
