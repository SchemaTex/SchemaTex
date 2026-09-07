/** Geometry only. Callers own electrical semantics and port escape directions. */
export interface RoutePoint {
  x: number;
  y: number;
}
export interface RouteBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export interface RoutedNet {
  net: string;
  points: RoutePoint[];
}
export function intersectsBox(
  a: RoutePoint,
  b: RoutePoint,
  box: RouteBox,
): boolean {
  return a.x === b.x
    ? a.x > box.left &&
        a.x < box.right &&
        Math.max(a.y, b.y) > box.top &&
        Math.min(a.y, b.y) < box.bottom
    : a.y > box.top &&
        a.y < box.bottom &&
        Math.max(a.x, b.x) > box.left &&
        Math.min(a.x, b.x) < box.right;
}
export function compactRoute(points: RoutePoint[]): RoutePoint[] {
  const unique = points.filter(
    (p, i) => !i || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y,
  );
  return unique.filter((p, i) => {
    const a = unique[i - 1],
      b = unique[i + 1];
    return (
      !a ||
      !b ||
      !((a.x === p.x && p.x === b.x) || (a.y === p.y && p.y === b.y))
    );
  });
}
export function orthogonalRoute(
  start: RoutePoint,
  end: RoutePoint,
  boxes: RouteBox[],
  routes: RoutedNet[] = [],
  net = "",
): RoutePoint[] {
  const sameNet = routes.filter((r) => r.net === net);
  // Most adjacent pins have a clear straight or one-elbow connection. Check
  // those exactly before constructing the visibility grid (same invariants).
  const occupied = [
    ...boxes,
    ...routes
      .filter((r) => r.net !== net)
      .flatMap((r) =>
        r.points.slice(1).map((b, i) => {
          const a = r.points[i]!;
          return {
            left: Math.min(a.x, b.x) - 8,
            right: Math.max(a.x, b.x) + 8,
            top: Math.min(a.y, b.y) - 8,
            bottom: Math.max(a.y, b.y) + 8,
          };
        }),
      ),
  ];
  const direct = [
    [start, { x: end.x, y: start.y }, end],
    [start, { x: start.x, y: end.y }, end],
    ...[
      (start.x + end.x) / 2,
      Math.min(start.x, end.x) - 18,
      Math.max(start.x, end.x) + 18,
    ].map((x) => [start, { x, y: start.y }, { x, y: end.y }, end]),
    ...[
      (start.y + end.y) / 2,
      Math.min(start.y, end.y) - 18,
      Math.max(start.y, end.y) + 18,
    ].map((y) => [start, { x: start.x, y }, { x: end.x, y }, end]),
    ...sameNet.flatMap((r) =>
      r.points.map((p) => [
        start,
        { x: p.x, y: start.y },
        { x: p.x, y: end.y },
        end,
      ]),
    ),
  ].map(compactRoute);
  const routeCost = (path: RoutePoint[]) => {
    let cost = Math.max(0, path.length - 2) * 28;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!,
        b = path[i]!,
        vertical = a.x === b.x;
      const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      let reuse = 0;
      for (const route of sameNet)
        for (let j = 1; j < route.points.length; j++) {
          const c = route.points[j - 1]!,
            d = route.points[j]!;
          if (
            vertical ? c.x !== a.x || d.x !== a.x : c.y !== a.y || d.y !== a.y
          )
            continue;
          reuse = Math.max(
            reuse,
            vertical
              ? Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
                  Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
              : Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
                  Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)),
          );
        }
      cost += length - Math.max(0, reuse) * 0.65;
    }
    return cost;
  };
  const ranked = direct
    .map((path) => ({ path, cost: routeCost(path) }))
    .sort((a, b) => a.cost - b.cost);
  for (const { path } of ranked) {
    if (
      path
        .slice(1)
        .every(
          (p, i) => !occupied.some((box) => intersectsBox(path[i]!, p, box)),
        )
    )
      return path;
  }
  const xs = new Set([start.x, end.x]),
    ys = new Set([start.y, end.y]);
  for (const p of [start, end]) {
    xs.add(p.x - 16);
    xs.add(p.x + 16);
    ys.add(p.y - 16);
    ys.add(p.y + 16);
  }
  for (const b of boxes) {
    xs.add(b.left - 8);
    xs.add(b.right + 8);
    ys.add(b.top - 8);
    ys.add(b.bottom + 8);
  }
  for (const r of routes)
    for (const p of r.points) {
      xs.add(p.x);
      ys.add(p.y);
      xs.add(p.x - 8);
      xs.add(p.x + 8);
      ys.add(p.y - 8);
      ys.add(p.y + 8);
    }
  const xx = [...xs].sort((a, b) => a - b),
    yy = [...ys].sort((a, b) => a - b),
    width = xx.length;
  const point = (id: number): RoutePoint => ({
    x: xx[id % width]!,
    y: yy[Math.floor(id / width)]!,
  });
  const index = (p: RoutePoint) => yy.indexOf(p.y) * width + xx.indexOf(p.x);
  const source = index(start),
    destination = index(end);
  const minStepCost = sameNet.length ? 0.35 : 1;
  const heuristic = (state: number) => {
    const p = point(Math.floor(state / 3));
    return (Math.abs(p.x - end.x) + Math.abs(p.y - end.y)) * minStepCost;
  };
  const distances = new Map<number, number>([[source * 3, 0]]),
    previous = new Map<number, number>();
  type Entry = { state: number; cost: number; priority: number };
  const queue: Entry[] = [];
  const push = (entry: Entry) => {
    let i = queue.length;
    queue.push(entry);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (queue[parent]!.priority <= entry.priority) break;
      queue[i] = queue[parent]!;
      i = parent;
    }
    queue[i] = entry;
  };
  const pop = (): Entry => {
    const first = queue[0]!,
      last = queue.pop()!;
    if (queue.length) {
      let i = 0;
      while (i * 2 + 1 < queue.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < queue.length &&
          queue[child + 1]!.priority < queue[child]!.priority
        )
          child++;
        if (queue[child]!.priority >= last.priority) break;
        queue[i] = queue[child]!;
        i = child;
      }
      queue[i] = last;
    }
    return first;
  };
  push({ state: source * 3, cost: 0, priority: heuristic(source * 3) });
  // Geometry cost is independent of the direction from which A* entered a
  // vertex. Cache it once per undirected edge rather than scanning every
  // conductor again for all three direction states.
  const edgeCosts = new Map<number, number>();
  const segments = routes.flatMap((route) =>
    route.points
      .slice(1)
      .map((d, i) => ({
        c: route.points[i]!,
        d,
        vertical: route.points[i]!.x === d.x,
        net: route.net,
      })),
  );
  const byX = new Map<number, typeof segments>(),
    byY = new Map<number, typeof segments>();
  const nearSegments = (axis: number, p: RoutePoint) => {
    const map = axis === 2 ? byX : byY,
      key = axis === 2 ? p.x : p.y;
    let nearby = map.get(key);
    if (!nearby) {
      nearby = segments.filter((s) =>
        axis === 2
          ? s.vertical
            ? Math.abs(s.c.x - key) < 8
            : key >= Math.min(s.c.x, s.d.x) && key <= Math.max(s.c.x, s.d.x)
          : s.vertical
            ? key >= Math.min(s.c.y, s.d.y) && key <= Math.max(s.c.y, s.d.y)
            : Math.abs(s.c.y - key) < 8,
      );
      map.set(key, nearby);
    }
    return nearby;
  };
  let finish: number | undefined;
  while (queue.length) {
    const current = pop();
    if (current.cost !== distances.get(current.state)) continue;
    const id = Math.floor(current.state / 3),
      direction = current.state % 3;
    if (id === destination) {
      finish = current.state;
      break;
    }
    const a = point(id),
      col = id % width,
      row = Math.floor(id / width);
    for (const next of [
      col ? id - 1 : -1,
      col + 1 < width ? id + 1 : -1,
      row ? id - width : -1,
      row + 1 < yy.length ? id + width : -1,
    ]) {
      if (next < 0) continue;
      const b = point(next),
        axis = a.x === b.x ? 2 : 1;
      const edgeKey = Math.min(id, next) * 2 + (axis === 2 ? 1 : 0);
      let edgeCost = edgeCosts.get(edgeKey);
      if (edgeCost === undefined) {
        if (boxes.some((box) => intersectsBox(a, b, box))) {
          edgeCosts.set(edgeKey, Infinity);
          continue;
        }
        let penalty = 0,
          reuse = false;
        for (const { c, d, vertical, net: segmentNet } of nearSegments(
          axis,
          a,
        )) {
          if (vertical === (axis === 2)) {
            const separation = vertical
              ? Math.abs(a.x - c.x)
              : Math.abs(a.y - c.y);
            const overlap = vertical
              ? Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
                Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
              : Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
                Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
            if (overlap > 0 && separation < 8) {
              if (segmentNet !== net) penalty = Infinity;
              else if (separation === 0) reuse = true;
            }
          } else if (segmentNet !== net) {
            const v1 = vertical ? c : a,
              v2 = vertical ? d : b,
              h1 = vertical ? a : c,
              h2 = vertical ? b : d;
            if (
              v1.x >= Math.min(h1.x, h2.x) &&
              v1.x <= Math.max(h1.x, h2.x) &&
              h1.y >= Math.min(v1.y, v2.y) &&
              h1.y <= Math.max(v1.y, v2.y)
            )
              penalty += 40;
          }
        }
        edgeCost =
          (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) * (reuse ? 0.35 : 1) +
          penalty;
        edgeCosts.set(edgeKey, edgeCost);
      }
      const cost =
        current.cost + edgeCost + (direction && direction !== axis ? 28 : 0);
      const state = next * 3 + axis;
      if (cost >= (distances.get(state) ?? Infinity)) continue;
      distances.set(state, cost);
      previous.set(state, current.state);
      push({ state, cost, priority: cost + heuristic(state) });
    }
  }
  if (finish === undefined)
    throw new Error(
      `No obstacle-free orthogonal route from (${start.x}, ${start.y}) to (${end.x}, ${end.y}); blocked ports: ${JSON.stringify(boxes.filter((b) => [start, end].some((p) => p.x > b.left && p.x < b.right && p.y > b.top && p.y < b.bottom)))}`,
    );
  const points: RoutePoint[] = [];
  for (
    let state: number | undefined = finish;
    state !== undefined;
    state = previous.get(state)
  )
    points.unshift(point(Math.floor(state / 3)));
  return compactRoute(points);
}
