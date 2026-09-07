import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { renderResult } from "../../src/index";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { parseLogic } from "../../src/diagrams/logic/parser";
import { layoutLogic } from "../../src/diagrams/logic/layout";
import { parsePid } from "../../src/diagrams/pid/parser";
import { layoutPid } from "../../src/diagrams/pid/layout";
import { parseBreadboard } from "../../src/diagrams/breadboard/parser";
import { layoutBreadboard } from "../../src/diagrams/breadboard/layout";
import {
  intersectsBox,
  orthogonalRoute,
} from "../../src/core/orthogonal-router";

const source = (id: string) =>
  readFileSync(
    new URL(`../../preview/engineering-review/${id}.sx`, import.meta.url),
    "utf8",
  );
const points = (path: string) =>
  [...path.matchAll(/[ML] ([\d.-]+)[, ]([\d.-]+)/g)].map((m) => ({
    x: +m[1]!,
    y: +m[2]!,
  }));

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

it.each([false, true])(
  "keeps auxiliary P&ID routes out of unrelated equipment (renamed=%s)",
  (renamed) => {
    const dsl = renamed
      ? source("pid")
          .replace(/P-201/g, "AUXILIARY_DEVICE")
          .replace(/TK-301/g, "OTHER_SOURCE")
      : source("pid");
    const layout = layoutPid(parsePid(dsl));
    for (const wire of layout.lines) {
      const path = points(wire.path);
      for (const e of layout.equipment) {
        if (e.equip.id === wire.line.from.id || e.equip.id === wire.line.to.id)
          continue;
        for (let i = 1; i < path.length; i++)
          expect(
            intersectsBox(path[i - 1]!, path[i]!, {
              left: e.x,
              right: e.x + e.width,
              top: e.y,
              bottom: e.y + e.height,
            }),
            `${wire.line.id} crosses ${e.equip.id}`,
          ).toBe(false);
      }
    }
  },
);

it("binds op-amp signal and supply nets only through explicitly named anchors", () => {
  const ast = parseNetlist(
    'U9 vin feedback out vp vn type=opamp pins="plus,minus,out,supply+,supply-"',
  );
  expect(ast.pinMap!.U9).toEqual({
    plus: "vin",
    minus: "feedback",
    out: "out",
    "supply+": "vp",
    "supply-": "vn",
  });
  for (const pins of ["plus,plus,out", "plus,unknown,out"])
    expect(() => parseNetlist(`U9 a b c type=opamp pins="${pins}"`)).toThrow(
      /Invalid pins/,
    );
  const original = renderResult(source("user-opamp"), { type: "circuit" });
  expect(original.status).toBe("partial");
  expect(
    original.diagnostics.some((d) => d.code === "CIRCUIT_PIN_OVERSPECIFIED"),
  ).toBe(true);
  expect(
    original.diagnostics.some((d) => d.code === "CIRCUIT_FLOATING_NET"),
  ).toBe(true);
  expect(original.svg).not.toContain("VEE output");
  expect(
    renderResult(source("opamp-corrected"), { type: "circuit" }).status,
  ).toBe("valid");
});

it("keeps automatic breadboard jumper endpoints exact after title and side-board translation", () => {
  const layout = layoutBreadboard(parseBreadboard(source("arduino")));
  for (const wire of layout.wires) {
    const path = points(wire.path);
    expect(path[0]).toEqual(wire.fromXY);
    expect(path.at(-1)).toEqual(wire.toXY);
    const side = layout.parts.find((p) => p.part.id === "uno")!;
    for (let i = 2; i < path.length - 1; i++)
      expect(
        intersectsBox(path[i - 1]!, path[i]!, {
          left: side.x,
          right: side.x + side.width,
          top: side.y,
          bottom: side.y + side.height,
        }),
      ).toBe(false);
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
  for (let i = 1; i < path.length; i++)
    for (const box of boxes)
      expect(intersectsBox(path[i - 1]!, path[i]!, box)).toBe(false);
});
