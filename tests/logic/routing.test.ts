import { expect, it } from "vitest";
import { parseLogic } from "../../src/diagrams/logic/parser";
import { layoutLogic } from "../../src/diagrams/logic/layout";
import { renderLogic } from "../../src/diagrams/logic/renderer";

it.each(["ansi", "iec"])("routes the complete adder around unrelated gate bodies (%s)", style => {
  const ast = parseLogic(`logic\nstyle: ${style}\ninput A, B, Cin\noutput Sum, Cout\ns1 = XOR(A, B)\nSum = XOR(s1, Cin)\nc1 = AND(A, B)\nc2 = AND(s1, Cin)\nCout = OR(c1, c2)`);
  const layout = layoutLogic(ast);
  expect(layout.wires).toHaveLength(12);
  for (const wire of layout.wires) {
    const points = [...wire.path.matchAll(/[ML] ([\d.-]+)[, ]([\d.-]+)/g)].map(m => ({ x: +m[1]!, y: +m[2]! }));
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!, b = points[i]!;
      expect(a.x === b.x || a.y === b.y).toBe(true);
      for (const node of layout.nodes.filter(n => n.geometry && n.id !== wire.fromNode && n.id !== wire.toNode)) {
        const g = node.geometry!;
        const crosses = a.x === b.x
          ? a.x > node.x && a.x < node.x + g.width && Math.max(a.y, b.y) > node.y && Math.min(a.y, b.y) < node.y + g.height
          : a.y > node.y && a.y < node.y + g.height && Math.max(a.x, b.x) > node.x && Math.min(a.x, b.x) < node.x + g.width;
        expect(crosses, `${wire.fromNode}→${wire.toNode} crosses ${node.id}`).toBe(false);
      }
    }
  }
});

it("retains renamed, reordered nets, active-low pins and long terminal labels", () => {
  const ast = parseLogic(`logic\ninput long_input_signal_name, B, Cin\noutput Result\nResult = OR(branch_two, branch_one)\nbranch_two = AND(~long_input_signal_name, Cin)\nbranch_one = XOR(long_input_signal_name, B)`);
  const layout = layoutLogic(ast);
  expect(layout.wires).toHaveLength(7);
  expect(layout.wires.filter(w => w.isActiveLow)).toHaveLength(1);
  const input = layout.nodes.find(n => n.id === "long_input_signal_name")!;
  expect(input.portWidth).toBeGreaterThan(140);
  for (const theme of ["default", "monochrome", "dark"] as const) {
    const svg = renderLogic(ast, { theme });
    expect(svg).toContain('data-from="long_input_signal_name"');
    expect(svg).toContain('data-to="branch_two"');
    expect(svg).toContain('class="schematex-logic-junction"');
    expect(svg).not.toContain("gate-body { fill: none");
  }
});

it.each([3, 8, 16])("expands crowded %i-input gates instead of rejecting their routes", count => {
  const names = Array.from({ length: count }, (_, i) => `I${i}`).join(",");
  const layout = layoutLogic(parseLogic(`logic\ninput ${names}\noutput G\nG = AND(${names})`));
  expect(layout.wires).toHaveLength(count + 1);
  const pins = layout.nodes.find(n => n.id === "G")!.geometry!.inputPins;
  for (let i = 1; i < pins.length; i++) expect(pins[i]!.y - pins[i - 1]!.y).toBeGreaterThanOrEqual(14 - 1e-9);
});
