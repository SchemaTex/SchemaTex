import { GEOMETRY } from "./symbols";
import type {
  PidAST,
  PidEquipment,
  PidLayoutEquipment,
  PidLayoutInstrument,
  PidLayoutLine,
  PidLayoutResult,
  PidLine,
} from "./types";
import { applyPins } from "../../core/editing";

const PADDING = 30;
const TITLE_AREA = 26;
const EQUIP_GAP_MAIN = 76;
const EQUIP_GAP_LANE = 54;
const INST_RADIUS = 14;
const INST_OFFSET = 38; // distance from equipment edge to instrument
const FIELD_INSTRUMENT_CLEARANCE = 62; // clears the equipment tag below the symbol
const BACK_EDGE_GAP = 28;

const PROCESS_LINE_TYPES = new Set(["process", "process_minor"]);

interface AnchorPoint {
  x: number;
  y: number;
  /** Outward direction relative to the equipment edge (used for routing offsets). */
  side: "left" | "right" | "top" | "bottom";
}

interface EquipmentTopology {
  rankById: Map<string, number>;
  byRank: Map<number, PidEquipment[]>;
}

/**
 * Assign process equipment to graph ranks instead of declaration slots.
 *
 * A P&ID commonly contains return and recycle lines, so the process graph is
 * not necessarily acyclic. A depth-first pass identifies only edges that close
 * a cycle; the remaining DAG is ranked by longest path. That distinction keeps
 * unequal parallel trains honest: a merge always follows the longer train
 * instead of sharing its column because a shorter path reached it first.
 * Declaration order remains the stable tie breaker inside a rank.
 */
function rankEquipment(ast: PidAST): EquipmentTopology {
  const equipmentIds = new Set(ast.equipment.map((equip) => equip.id));
  const outgoing = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();
  for (const equip of ast.equipment) {
    outgoing.set(equip.id, []);
    incomingCount.set(equip.id, 0);
  }

  let processEdgeCount = 0;
  for (const line of ast.lines) {
    if (!PROCESS_LINE_TYPES.has(line.lineType)) continue;
    if (!equipmentIds.has(line.from.id) || !equipmentIds.has(line.to.id)) continue;
    outgoing.get(line.from.id)!.push(line.to.id);
    incomingCount.set(line.to.id, (incomingCount.get(line.to.id) ?? 0) + 1);
    processEdgeCount++;
  }

  // Catalogs and symbol sheets intentionally have no topology. Preserve their
  // historical declaration-order row instead of stacking unrelated symbols.
  if (processEdgeCount === 0) {
    const rankById = new Map<string, number>();
    const byRank = new Map<number, PidEquipment[]>();
    ast.equipment.forEach((equip, index) => {
      rankById.set(equip.id, index);
      byRank.set(index, [equip]);
    });
    return { rankById, byRank };
  }

  const roots = ast.equipment.filter(
    (equip) => (incomingCount.get(equip.id) ?? 0) === 0
  );
  if (roots.length === 0 && ast.equipment.length > 0) {
    // A closed loop has no formal root. Start at its strongest split point;
    // declaration order breaks ties. This uses connectivity only—assuming a
    // particular equipment family is the feed would make the layout depend on
    // the examples in the gallery.
    const split = [...ast.equipment].sort(
      (a, b) =>
        (outgoing.get(b.id)?.length ?? 0) -
        (outgoing.get(a.id)?.length ?? 0)
    )[0]!;
    roots.push(split);
  }

  const visitState = new Map<string, "active" | "done">();
  const backEdges = new Set<string>();
  const edgeKey = (from: string, to: string) => `${from}\u0000${to}`;
  const visit = (id: string): void => {
    visitState.set(id, "active");
    for (const child of outgoing.get(id) ?? []) {
      const state = visitState.get(child);
      if (state === "active") {
        backEdges.add(edgeKey(id, child));
      } else if (state !== "done") {
        visit(child);
      }
    }
    visitState.set(id, "done");
  };
  for (const root of roots) {
    if (!visitState.has(root.id)) visit(root.id);
  }
  for (const equip of ast.equipment) {
    if (!visitState.has(equip.id)) visit(equip.id);
  }

  const forwardIndegree = new Map(ast.equipment.map((equip) => [equip.id, 0]));
  for (const [from, children] of outgoing) {
    for (const child of children) {
      if (backEdges.has(edgeKey(from, child))) continue;
      forwardIndegree.set(child, (forwardIndegree.get(child) ?? 0) + 1);
    }
  }

  const rankById = new Map<string, number>();
  const queue = ast.equipment
    .filter((equip) => (forwardIndegree.get(equip.id) ?? 0) === 0)
    .map((equip) => equip.id);
  for (const id of queue) rankById.set(id, 0);
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const child of outgoing.get(id) ?? []) {
      if (backEdges.has(edgeKey(id, child))) continue;
      rankById.set(
        child,
        Math.max(rankById.get(child) ?? 0, (rankById.get(id) ?? 0) + 1)
      );
      const remaining = (forwardIndegree.get(child) ?? 0) - 1;
      forwardIndegree.set(child, remaining);
      if (remaining === 0) queue.push(child);
    }
  }

  const byRank = new Map<number, PidEquipment[]>();
  for (const equip of ast.equipment) {
    const rank = rankById.get(equip.id) ?? 0;
    const group = byRank.get(rank) ?? [];
    group.push(equip);
    byRank.set(rank, group);
  }
  return { rankById, byRank };
}

function defaultPort(
  direction: "in" | "out",
  equip: PidEquipment,
  layoutDirection: PidAST["direction"] = "LR"
): string {
  // Sensible defaults per equipment family.
  if (equip.equipType === "tank_atm" || equip.equipType === "tank_cone_roof") {
    return direction === "out" ? "bottom" : "top";
  }
  if (equip.equipType === "vessel_v" || equip.equipType === "column_tray" || equip.equipType === "column_packed") {
    return direction === "out" ? "bottom" : "top";
  }
  const geometry = GEOMETRY[equip.equipType];
  if (layoutDirection === "TB" && geometry?.ports.top && geometry.ports.bottom) {
    return direction === "out" ? "bottom" : "top";
  }
  return direction === "out" ? "out" : "in";
}

function resolveSide(port: string): "left" | "right" | "top" | "bottom" {
  if (port === "top" || port === "vapor_out" || port === "reflux") return "top";
  if (port === "bottom" || port === "liquid_out" || port === "bottom_return") return "bottom";
  if (port === "left" || port === "in" || port === "feed" || port === "tube_in" || port === "shell_in") return "left";
  return "right";
}

function getAnchor(
  layoutEq: PidLayoutEquipment,
  port: string | undefined,
  fallback: "in" | "out",
  layoutDirection: PidAST["direction"] = "LR"
): AnchorPoint {
  const ports = layoutEq.ports;
  let key = port;
  if (!key || !(key in ports)) {
    key = defaultPort(fallback, layoutEq.equip, layoutDirection);
  }
  const p = ports[key] ?? ports.right ?? ports.out ?? ports.left ?? ports.in;
  if (!p) return { x: layoutEq.cx, y: layoutEq.cy, side: "right" };
  return { x: p.x, y: p.y, side: resolveSide(key ?? "right") };
}

function manhattanPath(
  fromX: number,
  fromY: number,
  fromSide: AnchorPoint["side"],
  toX: number,
  toY: number,
  toSide: AnchorPoint["side"]
): { d: string; midX: number; midY: number } {
  // Choose elbow strategy based on the originating side.
  // For horizontal exits (left/right) we route H → V → H.
  // For vertical exits (top/bottom) we route V → H → V.
  const isHFrom = fromSide === "left" || fromSide === "right";
  const isHTo = toSide === "left" || toSide === "right";

  if (isHFrom && isHTo) {
    const midX = (fromX + toX) / 2;
    return {
      d: `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`,
      midX,
      midY: (fromY + toY) / 2,
    };
  }
  if (!isHFrom && !isHTo) {
    const midY = (fromY + toY) / 2;
    return {
      d: `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`,
      midX: (fromX + toX) / 2,
      midY,
    };
  }
  // Mixed: simple L-shape.
  if (isHFrom) {
    return {
      d: `M ${fromX} ${fromY} L ${toX} ${fromY} L ${toX} ${toY}`,
      midX: toX,
      midY: (fromY + toY) / 2,
    };
  }
  return {
    d: `M ${fromX} ${fromY} L ${fromX} ${toY} L ${toX} ${toY}`,
    midX: (fromX + toX) / 2,
    midY: toY,
  };
}

export function layoutPid(ast: PidAST, pins?: Map<string, { x: number; y: number }>): PidLayoutResult {
  // 1. Place equipment by process topology. Parallel equipment shares a graph
  // rank and receives stable lanes; recycle lines are routed separately below.
  const equipment: PidLayoutEquipment[] = [];
  const equipById = new Map<string, PidLayoutEquipment>();
  const topology = rankEquipment(ast);
  const sortedRanks = [...topology.byRank.keys()].sort((a, b) => a - b);
  const isLR = ast.direction !== "TB";
  const maxAcross = Math.max(
    1,
    ...sortedRanks.map((rank) => topology.byRank.get(rank)?.length ?? 0)
  );
  const maxWidth = Math.max(
    60,
    ...ast.equipment.map((equip) => GEOMETRY[equip.equipType]?.width ?? 60)
  );
  const maxHeight = Math.max(
    60,
    ...ast.equipment.map((equip) => GEOMETRY[equip.equipType]?.height ?? 60)
  );
  const laneStep =
    (isLR ? maxHeight : maxWidth) + EQUIP_GAP_LANE;
  const acrossCenter =
    PADDING +
    TITLE_AREA +
    INST_RADIUS * 2 +
    (maxAcross - 1) * laneStep / 2 +
    (isLR ? maxHeight : maxWidth) / 2;

  // Rank centers account for the widest/tallest symbol in each graph column.
  const rankMain = new Map<number, number>();
  let mainCursor = PADDING + 40;
  for (const rank of sortedRanks) {
    const group = topology.byRank.get(rank) ?? [];
    const mainSpan = Math.max(
      40,
      ...group.map((equip) => {
        const geo = GEOMETRY[equip.equipType] ?? { width: 60, height: 40, ports: {} };
        return isLR ? geo.width : geo.height;
      })
    );
    rankMain.set(rank, mainCursor + mainSpan / 2);
    mainCursor += mainSpan + EQUIP_GAP_MAIN;
  }

  for (const rank of sortedRanks) {
    const group = topology.byRank.get(rank) ?? [];
    group.forEach((equip, laneIndex) => {
      const geo = GEOMETRY[equip.equipType] ?? { width: 60, height: 40, ports: {} };
      const laneOffset = (laneIndex - (group.length - 1) / 2) * laneStep;
      const main = rankMain.get(rank) ?? PADDING + 40;
      const cx = isLR ? main : acrossCenter + laneOffset;
      const cy = isLR ? acrossCenter + laneOffset : main;
      const x = cx - geo.width / 2;
      const y = cy - geo.height / 2;

      const ports: Record<string, { x: number; y: number }> = {};
      for (const [name, p] of Object.entries(geo.ports)) {
        ports[name] = { x: cx + p.x, y: cy + p.y };
      }

      const layoutEq: PidLayoutEquipment = {
        equip,
        x,
        y,
        width: geo.width,
        height: geo.height,
        cx,
        cy,
        ports,
      };
      equipment.push(layoutEq);
      equipById.set(equip.id, layoutEq);
    });
  }

  const rowY = acrossCenter;
  const maxH = maxHeight;

  const equipBeforePins = new Map(equipment.map((item) => [item.equip.id, { x: item.x, y: item.y }]));
  applyPins(equipment, pins, {
    id: (item) => item.equip.id,
    position: () => "free",
  });
  for (const item of equipment) {
    const before = equipBeforePins.get(item.equip.id)!;
    const dx = item.x - before.x;
    const dy = item.y - before.y;
    item.cx += dx;
    item.cy += dy;
    for (const port of Object.values(item.ports)) {
      port.x += dx;
      port.y += dy;
    }
  }

  // 1b. Pre-compute pipe midpoints (equipment→equipment lines only) so that a
  // line-mounted instrument can anchor to the pipe it measures, not a fixed
  // offset. Signal lines (instrument→instrument) are excluded — they have no
  // anchor until instruments are placed.
  const lineMidById = new Map<string, { x: number; y: number }>();
  for (const ln of ast.lines) {
    const from = equipById.get(ln.from.id);
    const to = equipById.get(ln.to.id);
    if (!from || !to) continue;
    const fa = getAnchor(from, ln.from.port, "out", ast.direction);
    const ta = getAnchor(to, ln.to.port, "in", ast.direction);
    lineMidById.set(ln.id, { x: (fa.x + ta.x) / 2, y: (fa.y + ta.y) / 2 });
  }
  // Resolve a target id (equipment or pipe) to an anchor, else a fallback.
  const targetPoint = (
    tgt: string,
    fallback: { x: number; y: number }
  ): { x: number; y: number } => {
    const eq = equipById.get(tgt);
    if (eq) return { x: eq.cx, y: eq.cy };
    const lm = lineMidById.get(tgt);
    if (lm) return lm;
    return fallback;
  };

  // 2. Place instruments.
  // Field instruments → near their measured equipment (below it).
  // Control-room instruments → above the equipment row (in a virtual control-room band).
  const instruments: PidLayoutInstrument[] = [];
  const instById = new Map<string, PidLayoutInstrument>();

  const equipmentTop = Math.min(...equipment.map((item) => item.y), rowY - maxH / 2);
  const equipmentBottom = Math.max(...equipment.map((item) => item.y + item.height), rowY + maxH / 2);
  const equipmentRight = Math.max(...equipment.map((item) => item.x + item.width), PADDING + 80);
  const crBandY = Math.max(PADDING + TITLE_AREA + INST_RADIUS, equipmentTop - INST_OFFSET);
  // Stagger CR instrument x positions to avoid overlap.
  let crSlot = 0;
  for (const inst of ast.instruments) {
    let cx = 0;
    let cy = 0;
    if (inst.category.startsWith("cr_")) {
      // place in CR band; x aligns roughly to the controlled valve or the measured equipment.
      const tgt = inst.controls ?? inst.measures ?? "";
      const point = targetPoint(tgt, {
        x: PADDING + 80 + crSlot * (INST_RADIUS * 2 + 28),
        y: crBandY,
      });
      if (isLR) {
        cx = point.x;
        cy = crBandY;
      } else {
        cx = equipmentRight + INST_OFFSET;
        cy = point.y;
      }
      crSlot += 1;
    } else if (inst.category.startsWith("local_")) {
      const tgt = inst.measures ?? inst.controls ?? "";
      const point = targetPoint(tgt, { x: PADDING + 80, y: rowY });
      if (isLR) {
        cx = point.x;
        cy = equipmentBottom + INST_OFFSET + INST_RADIUS;
      } else {
        cx = equipmentRight + INST_OFFSET + INST_RADIUS;
        cy = point.y;
      }
    } else {
      // field — below the equipment or pipe it monitors
      const tgt = inst.measures ?? inst.controls ?? "";
      const point = targetPoint(tgt, { x: PADDING + 80, y: rowY });
      const targetEquip = equipById.get(tgt);
      if (isLR) {
        cx = point.x;
        cy =
          (targetEquip ? targetEquip.y + targetEquip.height : point.y) +
          FIELD_INSTRUMENT_CLEARANCE;
      } else {
        cx = (targetEquip ? targetEquip.x + targetEquip.width : point.x) + INST_OFFSET;
        cy = point.y;
      }
    }

    const lay: PidLayoutInstrument = {
      inst,
      cx,
      cy,
      r: INST_RADIUS,
    };
    instruments.push(lay);
    instById.set(inst.tag, lay);
  }

  // Fan out instruments that share a row (e.g. several instruments on the same
  // equipment all anchor to its center). Sweep left→right and push each one to
  // at least INST_FANOUT past the previous on the same row. Comparing against
  // the *running* position (not the original) is what lets 3+ collapsed
  // instruments all spread, instead of only the second one moving.
  const INST_FANOUT = INST_RADIUS * 2 + 12; // 40px ≥ the 38px min separation
  const sameYRow = (a: PidLayoutInstrument, b: PidLayoutInstrument) =>
    Math.abs(a.cy - b.cy) < INST_RADIUS;
  const sortedByX = [...instruments].sort((a, b) => a.cx - b.cx);
  for (let i = 1; i < sortedByX.length; i++) {
    const prev = sortedByX[i - 1]!;
    const cur = sortedByX[i]!;
    if (sameYRow(prev, cur) && cur.cx < prev.cx + INST_FANOUT) {
      cur.cx = prev.cx + INST_FANOUT;
    }
  }

  const instrumentRects = instruments.map((item) => ({
    item,
    x: item.cx - item.r,
    y: item.cy - item.r,
  }));
  applyPins(instrumentRects, pins, {
    id: (entry) => entry.item.inst.tag,
    position: () => "free",
  });
  for (const entry of instrumentRects) {
    entry.item.cx = entry.x + entry.item.r;
    entry.item.cy = entry.y + entry.item.r;
  }

  // 3. Route lines.
  const lines: PidLayoutLine[] = [];
  const lowerContentY = Math.max(
    equipmentBottom,
    ...instruments.map((item) => item.cy + item.r + 16)
  );
  let backEdgeSlot = 0;
  for (const ln of ast.lines) {
    const fromRank = topology.rankById.get(ln.from.id);
    const toRank = topology.rankById.get(ln.to.id);
    const isBackwardProcess =
      isLR &&
      PROCESS_LINE_TYPES.has(ln.lineType) &&
      fromRank !== undefined &&
      toRank !== undefined &&
      toRank <= fromRank;
    const backChannelY = isBackwardProcess
      ? lowerContentY + 34 + backEdgeSlot++ * BACK_EDGE_GAP
      : undefined;
    const path = routeLine(ln, equipById, instById, ast.direction, backChannelY);
    if (path) lines.push(path);
  }

  // 4. Compute total bounds.
  const allX: number[] = [];
  const allY: number[] = [];
  for (const e of equipment) {
    // Pad horizontally so equipment tags (which can extend beyond the symbol's
    // bounding box) aren't clipped at the SVG edge.
    const tagPad = Math.max(0, ((e.equip.tag ?? e.equip.id).length * 6.6 - e.width) / 2 + 4);
    allX.push(e.x - tagPad, e.x + e.width + tagPad);
    allY.push(e.y, e.y + e.height + 30);
  }
  for (const i of instruments) {
    allX.push(i.cx - i.r, i.cx + i.r);
    allY.push(i.cy - i.r, i.cy + i.r + 14);
  }
  for (const line of lines) {
    const coords = [...line.path.matchAll(/[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)/g)];
    for (const coord of coords) {
      allX.push(Number(coord[1]));
      allY.push(Number(coord[2]));
    }
  }
  if (allX.length === 0) { allX.push(0, 400); allY.push(0, 200); }
  const maxX = Math.max(...allX);
  const maxY = Math.max(...allY);

  return {
    width: Math.max(maxX + PADDING, 400),
    height: Math.max(maxY + PADDING, 200),
    equipment,
    instruments,
    lines,
    title: ast.title,
    titleSourceRange: ast.titleSourceRange,
  };
}

function routeLine(
  ln: PidLine,
  equipById: Map<string, PidLayoutEquipment>,
  instById: Map<string, PidLayoutInstrument>,
  layoutDirection: PidAST["direction"],
  backChannelY?: number
): PidLayoutLine | undefined {
  const fromAnchor = resolveAnchor(ln.from.id, ln.from.port, "out", equipById, instById, layoutDirection);
  const toAnchor = resolveAnchor(ln.to.id, ln.to.port, "in", equipById, instById, layoutDirection);
  if (!fromAnchor || !toAnchor) return undefined;

  const fromEquip = equipById.get(ln.from.id);
  const toEquip = equipById.get(ln.to.id);
  if (backChannelY !== undefined && fromEquip && toEquip) {
    return routeBackwardLine(
      ln,
      fromAnchor,
      toAnchor,
      fromEquip,
      toEquip,
      backChannelY
    );
  }

  const { d, midX, midY } = manhattanPath(
    fromAnchor.x,
    fromAnchor.y,
    fromAnchor.side,
    toAnchor.x,
    toAnchor.y,
    toAnchor.side
  );

  return {
    line: ln,
    path: d,
    midX,
    midY,
  };
}

function compactPathPoints(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (const point of points) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.x - point.x) < 0.5 && Math.abs(prev.y - point.y) < 0.5) {
      continue;
    }
    out.push(point);
  }
  return out;
}

function routeBackwardLine(
  line: PidLine,
  from: AnchorPoint,
  to: AnchorPoint,
  fromEquip: PidLayoutEquipment,
  toEquip: PidLayoutEquipment,
  channelY: number
): PidLayoutLine {
  const clearance = 18;
  const fromPoints: Array<{ x: number; y: number }> = [{ x: from.x, y: from.y }];
  if (from.side === "bottom") {
    fromPoints.push({ x: from.x, y: channelY });
  } else if (from.side === "top") {
    const topY = fromEquip.y - clearance;
    const sideX = fromEquip.x + fromEquip.width + clearance;
    fromPoints.push({ x: from.x, y: topY }, { x: sideX, y: topY }, { x: sideX, y: channelY });
  } else {
    const sideX = from.side === "left"
      ? fromEquip.x - clearance
      : fromEquip.x + fromEquip.width + clearance;
    fromPoints.push({ x: sideX, y: from.y }, { x: sideX, y: channelY });
  }

  const toPoints: Array<{ x: number; y: number }> = [];
  if (to.side === "bottom") {
    toPoints.push({ x: to.x, y: channelY }, { x: to.x, y: to.y });
  } else if (to.side === "top") {
    const topY = toEquip.y - clearance;
    const sideX = toEquip.x - clearance;
    toPoints.push(
      { x: sideX, y: channelY },
      { x: sideX, y: topY },
      { x: to.x, y: topY },
      { x: to.x, y: to.y }
    );
  } else {
    const sideX = to.side === "left"
      ? toEquip.x - clearance
      : toEquip.x + toEquip.width + clearance;
    toPoints.push({ x: sideX, y: channelY }, { x: sideX, y: to.y }, { x: to.x, y: to.y });
  }

  const fromEnd = fromPoints[fromPoints.length - 1]!;
  const toStart = toPoints[0]!;
  const points = compactPathPoints([
    ...fromPoints,
    { x: toStart.x, y: fromEnd.y },
    ...toPoints,
  ]);
  return {
    line,
    path: points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "),
    midX: (fromEnd.x + toStart.x) / 2,
    midY: channelY,
  };
}

function resolveAnchor(
  id: string,
  port: string | undefined,
  fallback: "in" | "out",
  equipById: Map<string, PidLayoutEquipment>,
  instById: Map<string, PidLayoutInstrument>,
  layoutDirection: PidAST["direction"]
): AnchorPoint | undefined {
  const eq = equipById.get(id);
  if (eq) return getAnchor(eq, port, fallback, layoutDirection);

  const inst = instById.get(id);
  if (inst) {
    return {
      x: inst.cx,
      y: inst.cy,
      side: fallback === "out" ? "right" : "left",
    };
  }
  // If the line references the id of another line (e.g. `measures L2`), no anchor is generated.
  return undefined;
}
