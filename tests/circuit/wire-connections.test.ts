import { describe, expect, test } from "vitest";
import { parseCircuit } from "../../src/diagrams/circuit/parser";
import { renderCircuit } from "../../src/diagrams/circuit/renderer";

describe("netlist conductors", () => {
  test.each(["W1", "LINK type=wire"])("%s joins nets without occupying a component slot", (declaration) => {
    const [id, attr = ""] = declaration.split(" ");
    const ast = parseCircuit(`circuit netlist
R1 A B 1k
R2 C D 2k
${id} B C ${attr} label="Field cable" value="2.5 mm²"`);
    expect(ast.components.some(c => c.componentType === "wire")).toBe(false);
    expect(ast.pinMap!.R1!.end).toBe(ast.pinMap!.R2!.start);
    const svg = renderCircuit(ast);
    expect(svg).toContain("Field cable");
    expect(svg).toContain("2.5 mm²");
  });

  test("transitive and redundant connections preserve their annotations", () => {
    const ast = parseCircuit(`circuit netlist
R1 A B 1k
R2 D GND 2k
W1 B C label="First cable"
W2 C D label="Second cable"
W3 GND EARTH label="Bond"`);
    expect(ast.pinMap!.R1!.end).toBe(ast.pinMap!.R2!.start);
    expect(ast.components.filter(c => c.componentType === "wire")).toHaveLength(0);
    expect(renderCircuit(ast)).toContain("Bond");
  });

  test("pin-reference conductors retain labels too", () => {
    const ast = parseCircuit(`circuit netlist
R1 A B 1k
R2 C D 2k
W1 R1.end R2.start label="Jumper"`);
    expect(renderCircuit(ast)).toContain("Jumper");
  });
});

test("joining a terminal does not bridge the other terminals in its block", () => {
  const ast = parseCircuit(`circuit netlist
TB1 A B C type=terminal_block pins="L,N,PE"
R1 D E 1k
W1 TB1.L R1.start`);
  expect(ast.pinMap!.TB1!.l).toBe(ast.pinMap!.R1!.start);
  expect(new Set(Object.values(ast.pinMap!.TB1!)).size).toBe(3);
});

test("a conductor-only netlist preserves its annotation with finite SVG bounds", () => {
  const svg = renderCircuit(parseCircuit('circuit netlist\nW1 A B label="Cable"'));
  expect(svg).toContain("Cable");
  expect(svg).not.toMatch(/NaN|Infinity/);
});
