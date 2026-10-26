import { expect, it } from "vitest";
import { obstacleFreeRoute, orthogonalRoute, segmentEntersBox } from "../../src/diagrams/logic/orthogonal-router";

it("exhausts isolated electrical routes before allowing best-effort overlaps", () => {
  const start = { x: 0, y: 0 }, end = { x: 100, y: 0 };
  const boxes = [
    { left: -5, right: 20, top: -20, bottom: -5 },
    { left: -5, right: 20, top: 5, bottom: 20 },
    { left: -5, right: -1, top: -20, bottom: 20 },
  ];
  const previous = [{ net: "existing", points: [start, { x: 30, y: 0 }] }];
  expect(() => obstacleFreeRoute(start, end, boxes, previous, "new")).toThrow("No obstacle-free");
  const fallback = orthogonalRoute(start, end, boxes, previous, "new");
  expect(fallback[0]).toEqual(start);
  expect(fallback.at(-1)).toEqual(end);
  const points = orthogonalRoute(start, end, boxes, previous, "new", 4);
  expect(points[0]).toEqual(start);
  expect(points.at(-1)).toEqual(end);
  for (const box of boxes) expect(points.slice(1).some((p, i) => segmentEntersBox(points[i]!, p, box))).toBe(false);
});
