import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseLogic } from "../../src/diagrams/logic/parser";
import { layoutLogic } from "../../src/diagrams/logic/layout";
import { intersectsBox, orthogonalRoute } from "../../src/diagrams/logic/orthogonal-router";

const source = (id: string) =>
  readFileSync(
    new URL(`../fixtures/regression/engineering-${id}.sx`, import.meta.url),
    "utf8",
  );
it("keeps every adder connection and aligns output labels with their drivers", () => {
  const ast = parseLogic(source("logic")),
    layout = layoutLogic(ast);
  expect(layout.wires).toHaveLength(12);
  for (const output of ast.outputs) {
    const driver = layout.nodes.find((n) => n.id === output.from)!;
    const wire = layout.wires.find((w) => w.toNode === `$out$${output.id}`)!;
    expect(wire.toY).toBe(driver.y + driver.geometry!.outputPins[0]!.y);
  }
  // Exhaust the truth table from the parsed original gates, without changing
  // the semantic input to make the picture easier to draw.
  for (let value = 0; value < 8; value++) {
    const state: Record<string, number> = {
      A: value & 1,
      B: (value >> 1) & 1,
      Cin: (value >> 2) & 1,
    };
    for (const gate of ast.gates) {
      const [a, b] = gate.inputs.map((id) => state[id]!);
      state[gate.id] =
        gate.gateType === "XOR"
          ? a! ^ b!
          : gate.gateType === "AND"
            ? a! & b!
            : a! | b!;
    }
    expect(state.Sum! + 2 * state.Cout!).toBe(state.A! + state.B! + state.Cin!);
  }
});

it("routes around barriers without losing the endpoints or introducing diagonal segments", () => {
  const boxes = [
    { left: 20, right: 80, top: -10, bottom: 30 },
    { left: 90, right: 120, top: 20, bottom: 80 },
  ];
  const path = orthogonalRoute({ x: 0, y: 0 }, { x: 140, y: 60 }, boxes);
  expect(path[0]).toEqual({ x: 0, y: 0 });
  expect(path.at(-1)).toEqual({ x: 140, y: 60 });
  for (let i = 1; i < path.length; i++) {
    expect(path[i - 1]!.x === path[i]!.x || path[i - 1]!.y === path[i]!.y).toBe(true);
    for (const box of boxes)
      expect(intersectsBox(path[i - 1]!, path[i]!, box)).toBe(false);
  }
});
