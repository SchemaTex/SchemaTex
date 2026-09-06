import type { LogicLayoutNode, LogicLayoutWire } from "./layout";

interface Point { x: number; y: number }
interface Box { left: number; right: number; top: number; bottom: number }
const GAP = 12;

function blocked(a: Point, b: Point, box: Box): boolean {
  return a.x === b.x
    ? a.x > box.left && a.x < box.right && Math.max(a.y, b.y) > box.top && Math.min(a.y, b.y) < box.bottom
    : a.y > box.top && a.y < box.bottom && Math.max(a.x, b.x) > box.left && Math.min(a.x, b.x) < box.right;
}

/** Rectilinear visibility grid. Obstacles include gate captions; no circuit-name rules. */
export function routeLogicWires(nodes: LogicLayoutNode[], wires: LogicLayoutWire[]): void {
  const gateBoxes = nodes.filter(n => n.geometry).map(n => ({
    left: n.x - 6, right: n.x + n.geometry!.width + 6,
    top: n.y - 6, bottom: n.y + n.geometry!.height + 20,
  }));
  const routed: { net: string; points: Point[] }[] = [];
  const entries = wires.map(wire => {
    const target = nodes.find(n => n.id === wire.toNode)!;
    const bottom = target.geometry && wire.toY >= target.y + target.geometry.height;
    return { wire, x: bottom ? wire.toX : target.x - GAP, y: bottom ? wire.toY + 24 : wire.toY };
  });
  for (const wire of wires) {
    // Reserve every destination before routing the first net: an earlier route
    // must not consume a later net's entry and create a false T-junction.
    const boxes = [...gateBoxes, ...entries.filter(entry => entry.wire.fromNode !== wire.fromNode).map(entry => ({
      left: entry.x - 4, right: entry.x + 4, top: entry.y - 4, bottom: entry.y + 4,
    }))];
    const target = nodes.find(n => n.id === wire.toNode)!;
    const bottomPin = target.geometry && wire.toY >= target.y + target.geometry.height;
    const start = { x: wire.fromX + GAP, y: wire.fromY };
    const end = bottomPin ? { x: wire.toX, y: wire.toY + 24 } : { x: target.x - GAP, y: wire.toY };
    const xs = new Set([start.x, end.x]);
    const ys = new Set([start.y, end.y]);
    for (const p of [start, end]) {
      xs.add(p.x - GAP); xs.add(p.x + GAP);
      ys.add(p.y - GAP); ys.add(p.y + GAP);
    }
    for (const box of boxes) {
      xs.add(box.left - 6); xs.add(box.right + 6);
      ys.add(box.top - 6); ys.add(box.bottom + 6);
    }
    // Separate collinear conductors from different nets; perpendicular crossings
    // remain legal and receive a cost, not an electrical junction.
    for (const route of routed) for (const p of route.points) {
      xs.add(p.x - 6); xs.add(p.x + 6);
      ys.add(p.y - 6); ys.add(p.y + 6);
    }
    const xx = [...xs].sort((a, b) => a - b), yy = [...ys].sort((a, b) => a - b);
    const width = xx.length;
    const point = (id: number): Point => ({ x: xx[id % width]!, y: yy[Math.floor(id / width)]! });
    const index = (p: Point) => yy.indexOf(p.y) * width + xx.indexOf(p.x);
    const source = index(start), destination = index(end);
    const heuristic = (state: number) => {
      const p = point(Math.floor(state / 3));
      return Math.abs(p.x - end.x) + Math.abs(p.y - end.y);
    };
    const distances = new Map<number, number>([[source * 3, 0]]);
    const previous = new Map<number, number>();
    const queue: { state: number; cost: number }[] = [{ state: source * 3, cost: 0 }];
    let finish: number | undefined;
    while (queue.length) {
      queue.sort((a, b) => (b.cost + heuristic(b.state)) - (a.cost + heuristic(a.state)));
      const current = queue.pop()!;
      if (current.cost !== distances.get(current.state)) continue;
      const id = Math.floor(current.state / 3), direction = current.state % 3;
      if (id === destination) { finish = current.state; break; }
      const a = point(id), col = id % width, row = Math.floor(id / width);
      const neighbors = [col > 0 ? id - 1 : -1, col + 1 < width ? id + 1 : -1,
        row > 0 ? id - width : -1, row + 1 < yy.length ? id + width : -1];
      for (const next of neighbors) {
        if (next < 0) continue;
        const b = point(next);
        if (boxes.some(box => blocked(a, b, box))) continue;
        const axis = a.x === b.x ? 2 : 1;
        let penalty = 0;
        for (const route of routed) {
          if (route.net === wire.fromNode) continue;
          for (let i = 1; i < route.points.length; i++) {
            const c = route.points[i - 1]!, d = route.points[i]!;
            const vertical = c.x === d.x;
            if (vertical === (axis === 2)) {
              const collinear = vertical ? Math.abs(a.x - c.x) < 6 : Math.abs(a.y - c.y) < 6;
              const overlap = vertical
                ? Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y)) - Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))
                : Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x)) - Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x));
              if (collinear && overlap > 0) penalty = Infinity;
            } else {
              const v1 = vertical ? c : a, v2 = vertical ? d : b;
              const h1 = vertical ? a : c, h2 = vertical ? b : d;
              if (v1.x >= Math.min(h1.x,h2.x) && v1.x <= Math.max(h1.x,h2.x) && h1.y >= Math.min(v1.y,v2.y) && h1.y <= Math.max(v1.y,v2.y)) penalty += 24;
            }
          }
        }
        const cost = current.cost + Math.abs(a.x-b.x) + Math.abs(a.y-b.y) + (direction && direction !== axis ? 16 : 0) + penalty;
        const state = next * 3 + axis;
        if (cost >= (distances.get(state) ?? Infinity)) continue;
        distances.set(state, cost); previous.set(state, current.state); queue.push({ state, cost });
      }
    }
    if (finish === undefined) throw new Error(`Cannot route logic connection ${wire.fromNode} -> ${wire.toNode} without crossing a gate`);
    const points: Point[] = [];
    for (let state: number | undefined = finish; state !== undefined; state = previous.get(state)) points.unshift(point(Math.floor(state / 3)));
    points.unshift({ x: wire.fromX, y: wire.fromY });
    points.push({ x: wire.toX, y: wire.toY });
    const compact = points.filter((p, i) => {
      const a = points[i - 1], b = points[i + 1];
      return !a || !b || !(a.x === p.x && p.x === b.x || a.y === p.y && p.y === b.y);
    });
    wire.path = compact.map((p,i) => `${i ? "L" : "M"} ${p.x},${p.y}`).join(" ");
    routed.push({ net: wire.fromNode, points: compact });
  }
}
