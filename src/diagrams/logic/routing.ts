import type { LogicLayoutNode, LogicLayoutWire } from "./layout";
import {
  compactRoute,
  orthogonalRoute,
  type RoutedNet,
} from "../../core/orthogonal-router";

/** Route a signal's destinations together and reuse its existing fan-out trunk. */
export function routeLogicWires(
  nodes: LogicLayoutNode[],
  wires: LogicLayoutWire[],
): void {
  const gateBoxes = nodes
    .filter((n) => n.geometry)
    .map((n) => ({
      left: n.x - 6,
      right: n.x + n.geometry!.width + 6,
      top: n.y - 6,
      bottom: n.y + n.geometry!.height + 24,
    }));
  const routed: RoutedNet[] = [];
  const entries = wires.map((wire) => {
    const target = nodes.find((n) => n.id === wire.toNode)!;
    const bottom =
      target.geometry && wire.toY >= target.y + target.geometry.height;
    return {
      wire,
      x: bottom ? wire.toX : target.x - 18,
      y: bottom ? wire.toY + 32 : wire.toY,
    };
  });
  const ordered = [...wires].sort(
    (a, b) =>
      a.fromX - b.fromX || a.fromY - b.fromY || a.toX - b.toX || a.toY - b.toY,
  );
  for (const wire of ordered) {
    const boxes = [
      ...gateBoxes,
      ...entries
        .filter((e) => e.wire.fromNode !== wire.fromNode)
        .map((e) => ({
          left: e.x - 4,
          right: e.x + 4,
          top: e.y - 4,
          bottom: e.y + 4,
        })),
    ];
    const end = entries.find((e) => e.wire === wire)!;
    let route;
    try {
      route = orthogonalRoute(
        { x: wire.fromX + 18, y: wire.fromY },
        end,
        boxes,
        routed,
        wire.fromNode,
      );
    } catch (error) {
      throw new Error(
        `Logic ${wire.fromNode} -> ${wire.toNode}: ${(error as Error).message}`,
      );
    }
    const points = compactRoute([
      { x: wire.fromX, y: wire.fromY },
      ...route,
      { x: wire.toX, y: wire.toY },
    ]);
    wire.path = points
      .map((p, i) => `${i ? "L" : "M"} ${p.x},${p.y}`)
      .join(" ");
    routed.push({ net: wire.fromNode, points });
  }
}
