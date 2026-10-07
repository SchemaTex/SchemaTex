import type {
  SLDAST,
  SLDConnection,
  SLDNode,
  SLDNodeType,
} from "../../core/types";
import { estimateTextWidth, wrapTextToWidth } from "../../core/text-metrics";
import { geometryFor } from "./symbols";
import { annotation, equipmentText, type SLDAnnotation } from "./annotations";
import {
  compactRoute,
  orthogonalRoute,
  type RouteBox,
  type RoutePoint,
  type RoutedNet,
} from "../logic/orthogonal-router";

export interface SLDLayoutNode {
  node: SLDNode;
  nodeType: SLDNodeType;
  x: number;
  y: number;
  topY: number;
  bottomY: number;
  level: number;
  halfWidth: number;
  busLeft?: number;
  busRight?: number;
  labelSide?: "right";
  labels: SLDAnnotation[];
}
export interface SLDLayoutEdge {
  from: string;
  to: string;
  path: string;
  cable?: string;
  cableCsa?: string;
  cableLengthM?: string;
  cableInsulation?: string;
  label?: string;
  midX: number;
  midY: number;
  control?: boolean;
  net: string;
  labels: SLDAnnotation[];
}
export interface SLDLayoutResult {
  width: number;
  height: number;
  nodes: SLDLayoutNode[];
  edges: SLDLayoutEdge[];
  nodeById: Map<string, SLDLayoutNode>;
}

const GAP = 44;
const PAD = 32;
const labelBox = (l: SLDAnnotation): RouteBox => ({
  left: l.x - 4,
  right: l.x + l.width + 4,
  top: l.y - l.fontSize - 3,
  bottom: l.y + 5,
});

function computeLevels(ast: SLDAST): Map<string, number> {
  // A tie imposes equality, while a feeder imposes a downstream rank.
  // Solve equality groups first so every descendant participates in the same
  // ordering pass, regardless of declaration/connection order.
  const group = new Map(ast.nodes.map(n => [n.id, n.id]));
  const root = (id: string): string => {
    const parent = group.get(id)!;
    if (parent === id) return id;
    const result = root(parent);
    group.set(id, result);
    return result;
  };
  const types = new Map(ast.nodes.map(n => [n.id, n.nodeType]));
  for (const edge of ast.connections) {
    if (types.get(edge.from) === "bus_tie" || types.get(edge.to) === "bus_tie")
      group.set(root(edge.to), root(edge.from));
  }
  const ranks = new Map(ast.nodes.map(n => [root(n.id), 0]));
  const edges = ast.connections.filter(e => root(e.from) !== root(e.to));
  for (let pass = 0; pass < ranks.size; pass++) {
    let changed = false;
    for (const edge of edges) {
      const from = root(edge.from), to = root(edge.to);
      const rank = ranks.get(from)! + 1;
      if (rank > ranks.get(to)!) { ranks.set(to, rank); changed = true; }
    }
    if (!changed) return new Map(ast.nodes.map(n => [n.id, ranks.get(root(n.id))!]));
  }
  throw new Error("SLD layout failed: cyclic feeder constraints between bus-tie groups");
}

/** Power ranks, measured feeder columns and explicit terminal attachments. */
export function layoutSLD(ast: SLDAST): SLDLayoutResult {
  const remaining = new Set(ast.nodes.map((n) => n.id)),
    components: string[][] = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    if (first === undefined) break;
    const component = [first];
    remaining.delete(first);
    for (let i = 0; i < component.length; i++)
      for (const e of ast.connections) {
        const other =
          e.from === component[i]
            ? e.to
            : e.to === component[i]
              ? e.from
              : undefined;
        if (other && remaining.delete(other)) component.push(other);
      }
    components.push(component);
  }
  if (components.length > 1) {
    const layouts = components.map((ids) =>
      layoutSLD({
        ...ast,
        nodes: ast.nodes.filter((n) => ids.includes(n.id)),
        connections: ast.connections.filter(
          (e) => ids.includes(e.from) && ids.includes(e.to),
        ),
      }),
    );
    let offset = 0;
    for (const [componentIndex, layout] of layouts.entries()) {
      for (const n of layout.nodes) {
        n.x += offset;
        if (n.busLeft !== undefined) n.busLeft += offset;
        if (n.busRight !== undefined) n.busRight += offset;
        for (const l of n.labels) l.x += offset;
      }
      for (const e of layout.edges) {
        e.net = `${componentIndex}:${e.net}`;
        e.midX += offset;
        for (const l of e.labels) l.x += offset;
        e.path = e.path.replace(
          /([ML])\s+(-?[\d.]+)\s+(-?[\d.]+)/g,
          (_m, cmd, x, y) => `${cmd} ${Number(x) + offset} ${y}`,
        );
      }
      offset += layout.width + GAP;
    }
    const nodes = layouts.flatMap((l) => l.nodes);
    return {
      width: offset - GAP,
      height: Math.max(...layouts.map((l) => l.height)),
      nodes,
      edges: layouts.flatMap((l) => l.edges),
      nodeById: new Map(nodes.map((n) => [n.node.id, n])),
    };
  }
  const model = new Map(ast.nodes.map((n) => [n.id, n]));
  // An inline overload relay remains in its feeder. A relay terminating at a
  // switching device is a control connection, not a second source of power.
  const isControl = (e: SLDConnection) =>
    model.get(e.from)?.nodeType === "relay" &&
    !ast.connections.some((c) => c.to === e.from) &&
    [
      "breaker",
      "breaker_vacuum",
      "switch",
      "switch_load",
      "contactor",
    ].includes(model.get(e.to)?.nodeType ?? "");
  const power = ast.connections.filter((e) => !isControl(e));
  const levels = computeLevels({ ...ast, connections: power });
  const upstreamDepth = new Map(levels);
  const parents = (id: string) =>
    power.filter((e) => e.to === id).map((e) => e.from);
  const children = (id: string) =>
    power.filter((e) => e.from === id).map((e) => e.to);
  for (const n of ast.nodes) {
    const outgoing = children(n.id);
    // A short independent source need not occupy every unused upstream rank.
    if (!parents(n.id).length && outgoing.length) {
      levels.set(
        n.id,
        Math.max(0, Math.min(...outgoing.map((id) => levels.get(id) ?? 0)) - 1),
      );
    }
  }
  for (const e of ast.connections.filter(isControl))
    levels.set(e.from, levels.get(e.to) ?? 0);

  const nodes: SLDLayoutNode[] = ast.nodes.map((node) => {
    const geom = geometryFor(node.nodeType);
    return {
      node,
      nodeType: node.nodeType,
      x: 0,
      y: 0,
      topY: 0,
      bottomY: 0,
      level: levels.get(node.id) ?? 0,
      halfWidth: geom.halfWidth,
      labels: [],
      labelSide:
        children(node.id).length && !["bus", "bus_tie"].includes(node.nodeType)
          ? "right"
          : undefined,
    };
  });
  const byId = new Map(nodes.map((n) => [n.node.id, n]));
  const textWidth = (n: SLDLayoutNode) => {
    const t = equipmentText(n.node);
    return Math.max(
      0,
      ...t.title.map((s) => estimateTextWidth(s, 11, { fontWeight: 700 })),
      ...t.details.map((s) => estimateTextWidth(s, 9)),
    );
  };
  const rawLeft = (n: SLDLayoutNode) =>
    n.nodeType === "bus"
      ? 60 + textWidth(n)
      : n.labelSide
        ? n.halfWidth
        : Math.max(n.halfWidth, textWidth(n) / 2);
  const rawRight = (n: SLDLayoutNode) =>
    n.nodeType === "bus"
      ? 50
      : n.labelSide
        ? n.halfWidth + 14 + textWidth(n)
        : Math.max(n.halfWidth, textWidth(n) / 2);
  const chain = new Map(nodes.map((n) => [n.node.id, n.node.id]));
  const chainRoot = (id: string): string =>
    chain.get(id) === id ? id : chainRoot(chain.get(id)!);
  const isSeriesDevice = (id: string) => {
    const type = model.get(id)!.nodeType;
    return type !== "bus_tie" &&
      (type !== "bus" || (parents(id).length === 1 && children(id).length === 1));
  };
  for (const e of power)
    if (
      children(e.from).length === 1 &&
      parents(e.to).length === 1 &&
      isSeriesDevice(e.from) &&
      isSeriesDevice(e.to)
    )
      chain.set(chainRoot(e.to), chainRoot(e.from));
  const chainMembers = (n: SLDLayoutNode) =>
    nodes.filter((other) => chainRoot(other.node.id) === chainRoot(n.node.id));
  const leftExtent = (n: SLDLayoutNode) =>
    Math.max(...chainMembers(n).map(rawLeft));
  const rightExtent = (n: SLDLayoutNode) =>
    Math.max(...chainMembers(n).map(rawRight));
  const rankValues = [...new Set(nodes.map((n) => n.level))].sort(
    (a, b) => a - b,
  );
  // Start every row locally. A single global cursor used to leave enormous
  // empty bus spans as a feeder acquired more series protection devices.
  for (const rank of rankValues) {
    let cursor = 0;
    for (const n of nodes.filter((n) => n.level === rank)) {
      n.x = cursor + leftExtent(n);
      cursor = n.x + rightExtent(n) + GAP;
    }
  }
  // Bottom-up column alignment. Fixed leaf order comes from declarations;
  // intermediate devices follow their descendants, with caption-aware packing.
  for (const rank of [...rankValues].reverse()) {
    const row = nodes.filter((n) => n.level === rank);
    const targets = new Map<string, number>();
    for (const n of row) {
      const lower = children(n.node.id)
        .map((id) => byId.get(id))
        .filter((c): c is SLDLayoutNode => !!c && c.level > rank);
      targets.set(
        n.node.id,
        lower.length
          ? (Math.min(...lower.map((c) => c.x)) +
              Math.max(...lower.map((c) => c.x))) /
              2
          : n.x,
      );
    }
    // Equal-depth peers feeding one junction form a source bank centered on it.
    for (const child of nodes) {
      const peers = row.filter(
        (n) =>
          children(n.node.id).length === 1 &&
          children(n.node.id)[0] === child.node.id,
      );
      if (
        peers.length < 2 ||
        new Set(peers.map((n) => upstreamDepth.get(n.node.id))).size !== 1
      )
        continue;
      const centers: number[] = [0];
      for (let i = 1; i < peers.length; i++) centers.push(centers[i-1] + rightExtent(peers[i-1]) + GAP + leftExtent(peers[i]));
      const shift = child.x - (centers[0] + centers[centers.length-1]) / 2;
      for (const [i, n] of peers.entries()) targets.set(n.node.id, centers[i] + shift);
    }
    row.sort(
      (a, b) =>
        targets.get(a.node.id)! - targets.get(b.node.id)! ||
        (upstreamDepth.get(b.node.id) ?? 0) -
          (upstreamDepth.get(a.node.id) ?? 0),
    );
    let right = -Infinity;
    for (const n of row) {
      n.x = Math.max(targets.get(n.node.id)!, right + leftExtent(n));
      right = n.x + rightExtent(n) + GAP;
    }
  }
  // Propagate the column as a unit, so different caption widths never add
  // arbitrary elbows inside a series feeder.
  for (const n of nodes) {
    const members = chainMembers(n);
    const lowest = members.reduce((a, b) => (a.level > b.level ? a : b));
    n.x = lowest.x;
  }
  // Packing sibling buses may move a bar away from its feeder bank. Move
  // exclusively owned descendants with it; shared downstream equipment keeps
  // its independent slot. Lateral ties are not part of a feeder bank.
  for (const bus of nodes.filter((n) => n.nodeType === "bus")) {
    const feeders = children(bus.node.id)
      .map((id) => byId.get(id)!)
      .filter((n) => n.nodeType !== "bus_tie");
    if (!feeders.length) continue;
    const center =
      (Math.min(...feeders.map((n) => n.x)) +
        Math.max(...feeders.map((n) => n.x))) /
      2;
    const owned = new Set([bus.node.id]);
    for (let pass = 0; pass < nodes.length; pass++) {
      let added = false;
      for (const n of nodes) {
        const incoming = parents(n.node.id);
        if (
          !owned.has(n.node.id) &&
          n.nodeType !== "bus_tie" &&
          incoming.length &&
          incoming.every((id) => owned.has(id))
        ) {
          owned.add(n.node.id);
          added = true;
        }
      }
      if (!added) break;
    }
    for (const n of nodes)
      if (n !== bus && owned.has(n.node.id)) n.x += bus.x - center;
  }
  // Column alignment can bring upstream captions together. Pack complete
  // series columns against every occupied row, preserving conductor continuity.
  const columns = [...new Set(nodes.map((n) => chainRoot(n.node.id)))]
    .map((id) => nodes.filter((n) => chainRoot(n.node.id) === id))
    .sort((a, b) => a[0].x - b[0].x);
  const packed: SLDLayoutNode[] = [];
  for (const column of columns) {
    let shift = 0;
    for (const n of column)
      for (const previous of packed)
        if (previous.level === n.level)
          shift = Math.max(shift, previous.x + rawRight(previous) + GAP + rawLeft(n) - n.x);
    for (const n of column) n.x += shift;
    packed.push(...column);
  }
  // Control devices occupy a separate lateral annotation column.
  for (const e of ast.connections.filter(isControl)) {
    const relay = byId.get(e.from)!,
      target = byId.get(e.to)!;
    relay.labelSide = undefined;
    relay.x =
      Math.min(
        ...nodes
          .filter((n) => n !== relay && n.level === target.level)
          .map((n) => n.x - leftExtent(n)),
      ) -
      textWidth(relay) / 2 -
      GAP;
  }

  let y = PAD;
  for (const rank of rankValues) {
    const row = nodes.filter((n) => n.level === rank);
    const above = Math.max(
      24,
      ...row.map((n) => -geometryFor(n.nodeType).topY),
    );
    y += above;
    for (const n of row) {
      n.y = y;
      const g = geometryFor(n.nodeType);
      n.topY = y + g.topY;
      n.bottomY = y + g.bottomY;
    }
    const below = Math.max(
      ...row.map((n) => {
        const t = equipmentText(n.node),
          lines = t.title.length + t.details.length;
        return n.labelSide
          ? Math.max(geometryFor(n.nodeType).bottomY, lines * 12)
          : geometryFor(n.nodeType).bottomY + 16 + lines * 12;
      }),
    );
    y += below + 44;
  }
  const busBounds = (n: SLDLayoutNode) => {
    // The bar spans outgoing taps. Incoming feeders route to the bar; their
    // distant columns must not stretch it across unrelated equipment.
    const taps = children(n.node.id)
      .map(id => byId.get(id))
      .filter((p): p is SLDLayoutNode => !!p && p.nodeType !== "bus_tie");
    const xs = children(n.node.id).length ? taps.map(p => p.x) : [n.x];
    return { busLeft: Math.min(...xs, n.x) - 48, busRight: Math.max(...xs, n.x) + 48 };
  };
  // Moving a feeder column can widen another bus. Settle both constraints
  // together rather than deriving bars from an intermediate placement.
  for (let pass = 0; pass <= nodes.length; pass++) {
    let moved = false;
    const settled: SLDLayoutNode[] = [];
    for (const column of [...columns].sort((a, b) => a[0].x - b[0].x)) {
      let shift = 0;
      for (const n of column) for (const other of settled) {
        if (n.level === other.level)
          shift = Math.max(shift, other.x + rawRight(other) + GAP + rawLeft(n) - n.x);
      }
      if (shift > 0.001) { for (const n of column) n.x += shift; moved = true; }
      settled.push(...column);
    }
    for (const bus of nodes.filter(n => n.nodeType === "bus")) {
      for (const other of nodes.filter(n => n !== bus && n.level === bus.level &&
        n.nodeType !== "bus" && n.nodeType !== "bus_tie")) {
        const bounds = busBounds(bus);
        if (other.x - rawLeft(other) < bounds.busRight + GAP &&
          other.x + rawRight(other) > bounds.busLeft - textWidth(bus) - GAP) {
          const shift = bounds.busRight + GAP + rawLeft(other) - other.x;
          if (Math.abs(shift) > 0.001) { for (const member of chainMembers(other)) member.x += shift; moved = true; }
        }
      }
    }
    if (!moved) break;
    if (pass === nodes.length) throw new Error("SLD layout failed: could not separate bus and feeder columns");
  }
  // All x positions are final before bars and terminal geometry are derived.
  for (const bus of nodes.filter(n => n.nodeType === "bus")) Object.assign(bus, busBounds(bus));
  // Bus ties occupy the gap, and the bus artwork stops at their terminals.
  for (const n of nodes.filter((n) => n.nodeType === "bus_tie")) {
    const a = parents(n.node.id)
      .map((id) => byId.get(id))
      .find((p) => p?.nodeType === "bus");
    const b = children(n.node.id)
      .map((id) => byId.get(id))
      .find((p) => p?.nodeType === "bus");
    if (a && b) {
      n.x = (a.x + b.x) / 2;
      n.y = a.y;
      n.topY = n.y + geometryFor("bus_tie").topY;
      n.bottomY = n.y + geometryFor("bus_tie").bottomY;
      if (a.x < b.x) {
        a.busRight = n.x - 24;
        b.busLeft = n.x + 24;
      } else {
        a.busLeft = n.x + 24;
        b.busRight = n.x - 24;
      }
    }
  }
  for (const n of nodes) {
    const t = equipmentText(n.node);
    if (n.nodeType === "bus") {
      // An above-bar caption has its own reserved rank space.
      const lines = [...t.title, ...t.details];
      const w = Math.max(
        ...lines.map((text) =>
          estimateTextWidth(text, 11, { fontWeight: 700 }),
        ),
      );
      const tied = [...parents(n.node.id), ...children(n.node.id)].some(
        (id) => model.get(id)?.nodeType === "bus_tie",
      );
      n.labels = lines.map((text, i) =>
        annotation(
          text,
          tied ? n.x + 14 : n.busLeft! - w - 12,
          tied
            ? n.y - 18 - (lines.length - 1 - i) * 14
            : n.y + 4 - (lines.length - 1) * 7 + i * 14,
          true,
        ),
      );
      continue;
    }
    const title = n.nodeType === "hub" ? [] : t.title;
    const lines = [
      ...title.map((s) => ({ s, title: true })),
      ...t.details.map((s) => ({ s, title: false })),
    ];
    let baseline = n.labelSide ? n.y - 3 : n.bottomY + 16;
    n.labels = lines.map((l) => {
      const width = estimateTextWidth(l.s, l.title ? 11 : 9, {
        fontWeight: l.title ? 700 : 400,
      });
      const x = n.labelSide ? n.x + n.halfWidth + 14 : n.x - width / 2;
      const result = annotation(l.s, x, baseline, l.title);
      baseline += l.title ? 14 : 12;
      return result;
    });
  }
  const obstacles: RouteBox[] = nodes.flatMap((n) => [
    {
      left: n.nodeType === "bus" ? n.busLeft! : n.x - n.halfWidth,
      right: n.nodeType === "bus" ? n.busRight! : n.x + n.halfWidth,
      top: n.nodeType === "bus" ? n.y - 3 : n.topY,
      bottom: n.nodeType === "bus" ? n.y + 3 : n.bottomY,
    },
    ...n.labels.map(labelBox),
  ]);
  // Wire identity belongs to terminals, not to device bodies. Inputs to an
  // ordinary junction may merge; the two ATS inputs must remain independent.
  const nets = ast.connections.map((_, i) => i);
  const root = (i: number): number =>
    nets[i] === i ? i : (nets[i] = root(nets[i]));
  ast.connections.forEach((a, i) =>
    ast.connections.forEach((b, j) => {
      if (
        a.from === b.from ||
        (a.to === b.to &&
          !["ats", "load"].includes(model.get(a.to)?.nodeType ?? "")) ||
        (a.to === b.from && model.get(a.to)?.nodeType === "bus") ||
        (a.from === b.to && model.get(a.from)?.nodeType === "bus")
      )
        nets[root(j)] = root(i);
    }),
  );
  const routes: RoutedNet[] = [];
  const edges: SLDLayoutEdge[] = [];
  for (const e of ast.connections) {
    const from = byId.get(e.from),
      to = byId.get(e.to);
    if (!from || !to) continue;
    const control = isControl(e),
      tie = from.nodeType === "bus_tie" || to.nodeType === "bus_tie";
    let fx = from.x,
      tx = to.x;
    if (to.nodeType === "ats") {
      const ins = parents(e.to)
        .map((id) => byId.get(id)!)
        .sort((a, b) => a.x - b.x);
      const ports = geometryFor(to.nodeType).inputXs!;
      tx = to.x + ports[Math.min(ins.indexOf(from), ports.length - 1)];
    }
    if (to.nodeType === "load" && parents(e.to).length > 1) {
      const ins = parents(e.to)
        .map((id) => byId.get(id)!)
        .sort((a, b) => a.x - b.x);
      tx = to.x - 12 + (24 * ins.indexOf(from)) / (ins.length - 1);
    }
    if (from.nodeType === "bus" && !tie)
      fx = Math.max(from.busLeft!, Math.min(from.busRight!, tx));
    if (to.nodeType === "bus" && !tie)
      tx = children(to.node.id).length ? Math.max(to.busLeft!, Math.min(to.busRight!, fx)) : to.x;
    let start: RoutePoint = {
      x: fx,
      y: from.nodeType === "bus" ? from.y : from.bottomY,
    };
    let end: RoutePoint = { x: tx, y: to.nodeType === "bus" ? to.y : to.topY };
    if (control) {
      start = { x: from.x + from.halfWidth, y: from.y };
      end = { x: to.x - to.halfWidth, y: to.y };
    }
    if (tie) {
      const direction = to.x > from.x ? 1 : -1;
      start = {
        x:
          from.nodeType === "bus"
            ? direction > 0
              ? from.busRight!
              : from.busLeft!
            : from.x + direction * from.halfWidth,
        y: from.y,
      };
      end = {
        x:
          to.nodeType === "bus"
            ? direction > 0
              ? to.busLeft!
              : to.busRight!
            : to.x - direction * to.halfWidth,
        y: to.y,
      };
    }
    const hasCable = !!(
      e.cable ||
      e.cableCsa ||
      e.cableInsulation ||
      e.cableLengthM ||
      e.label
    );
    const escape = control || tie ? Math.min(10, Math.abs(end.x - start.x) / 2) : hasCable ? 40 : 12;
    const a =
      control || tie
        ? { x: start.x + Math.sign(end.x - start.x) * escape, y: start.y }
        : { x: start.x, y: start.y + escape };
    const b =
      control || tie
        ? { x: end.x - Math.sign(end.x - start.x) * escape, y: end.y }
        : { x: end.x, y: end.y - 12 };
    // Owned symbol boxes do not obstruct the terminal leads; captions do.
    const blocked = obstacles.filter(
      (o) =>
        !(
          o.left <= start.x &&
          o.right >= start.x &&
          o.top <= start.y &&
          o.bottom >= start.y
        ) &&
        !(
          o.left <= end.x &&
          o.right >= end.x &&
          o.top <= end.y &&
          o.bottom >= end.y
        ),
    );
    const net = String(root(ast.connections.indexOf(e)));
    const points = compactRoute([
      start,
      ...orthogonalRoute(a, b, blocked, routes, net),
      end,
    ]);
    routes.push({ net, points });
    const cable = [
      e.cable,
      e.cableCsa,
      e.cableInsulation,
      e.cableLengthM ? `${e.cableLengthM} m` : undefined,
      e.label,
    ].filter((s): s is string => !!s);
    const lines = cable.flatMap((s) => wrapTextToWidth(s, 9, 130));
    let mid = points[Math.floor(points.length / 2)];
    let labels: SLDAnnotation[] = [];
    if (lines.length) {
      const candidates = points
        .slice(1)
        .map((p, i) => ({ a: points[i], b: p }))
        .filter((s) => s.a.x === s.b.x)
        .sort(
          (a, b) =>
            Number(b.a.x === from.x) - Number(a.a.x === from.x) ||
            Math.abs(b.b.y - b.a.y) - Math.abs(a.b.y - a.a.y),
        );
      for (const segment of candidates) {
        for (const fraction of [0.5, 0.3, 0.7])
          for (const side of [1, -1]) {
            const cy = segment.a.y + (segment.b.y - segment.a.y) * fraction;
            const ls = lines.map((s, i) =>
              annotation(
                s,
                segment.a.x + (side === 1 ? 7 : -estimateTextWidth(s, 9) - 7),
                cy + i * 12,
              ),
            );
            if (
              ls.every(
                (l) =>
                  !blocked.some((o) => {
                    const box = labelBox(l);
                    return (
                      box.left < o.right &&
                      box.right > o.left &&
                      box.top < o.bottom &&
                      box.bottom > o.top
                    );
                  }),
              )
            ) {
              labels = ls;
              mid = { x: segment.a.x, y: cy };
              break;
            }
          }
        if (labels.length) break;
      }
      if (!labels.length)
        labels = lines.map((s, i) => annotation(s, mid.x + 7, mid.y + i * 12));
      obstacles.push(...labels.map(labelBox));
    }
    edges.push({
      ...e,
      path: points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" "),
      midX: mid.x,
      midY: mid.y,
      control,
      net,
      labels,
    });
  }
  const allBoxes = [
    ...obstacles,
    ...routes.flatMap((r) =>
      r.points.map((p) => ({ left: p.x, right: p.x, top: p.y, bottom: p.y })),
    ),
  ];
  const minX = Math.min(0, ...allBoxes.map((b) => b.left)),
    maxX = Math.max(0, ...allBoxes.map((b) => b.right));
  const shift = PAD - minX;
  for (const n of nodes) {
    n.x += shift;
    if (n.busLeft !== undefined) n.busLeft += shift;
    if (n.busRight !== undefined) n.busRight += shift;
    for (const l of n.labels) l.x += shift;
  }
  for (const e of edges) {
    e.midX += shift;
    for (const l of e.labels) l.x += shift;
    e.path = e.path.replace(
      /([ML])\s+(-?[\d.]+)\s+(-?[\d.]+)/g,
      (_m, cmd, x, y) => `${cmd} ${Number(x) + shift} ${y}`,
    );
  }
  return {
    width: Math.max(320, maxX - minX + PAD * 2),
    height: Math.max(120, ...allBoxes.map((b) => b.bottom)) + PAD,
    nodes,
    edges,
    nodeById: byId,
  };
}
