import { expect, test } from "vitest";
import { flagBoxes, placeLabels } from "../../src/diagrams/circuit/schematic-layout";
import type { SupplyFlagMark } from "../../src/diagrams/circuit/autolayout";

test("a net caption beside a long vertical run stays near its connection", () => {
  const flags: SupplyFlagMark[] = [{ kind: "label", label: "Protective conductor", at: { x: 100, y: 800 } }];
  const routes = [{ netId: "return", points: [{ x: 150, y: 0 }, { x: 150, y: 800 }, { x: 0, y: 800 }] }];
  placeLabels([], routes, flags);
  expect(Math.abs(flags[0]!.at.y - 800)).toBeLessThan(80);
  const box = flagBoxes(flags, 0)[0]!;
  expect(box.minY > 802 || box.maxX < 148 || box.minX > 152).toBe(true);
});
