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

const PADDING = 30;
const TITLE_AREA = 26;
const EQUIP_GAP_X = 70;
const INST_RADIUS = 14;
const INST_OFFSET = 38; // distance from equipment edge to instrument

interface AnchorPoint {
  x: number;
  y: number;
  /** Outward direction relative to the equipment edge (used for routing offsets). */
  side: "left" | "right" | "top" | "bottom";
}

function defaultPort(direction: "in" | "out", equip: PidEquipment): string {
  // Sensible defaults per equipment family.
  if (equip.equipType === "tank_atm" || equip.equipType === "tank_cone_roof") {
    return direction === "out" ? "bottom" : "top";
  }
  if (equip.equipType === "vessel_v" || equip.equipType === "column_tray" || equip.equipType === "column_packed") {
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
  fallback: "in" | "out"
): AnchorPoint {
  const ports = layoutEq.ports;
  let key = port;
  if (!key || !(key in ports)) {
    key = defaultPort(fallback, layoutEq.equip);
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

export function layoutPid(ast: PidAST): PidLayoutResult {
  // 1. Place equipment in declaration order along the primary direction.
  const equipment: PidLayoutEquipment[] = [];
  const equipById = new Map<string, PidLayoutEquipment>();

  // Determine row Y based on max equipment height for alignment.
  const heights = ast.equipment.map((e) => GEOMETRY[e.equipType]?.height ?? 60);
  const maxH = Math.max(...heights, 0);
  const rowY = PADDING + TITLE_AREA + maxH / 2 + 30; // give room for top labels

  let cursorX = PADDING + 40;

  for (const equip of ast.equipment) {
    const geo = GEOMETRY[equip.equipType] ?? { width: 60, height: 40, ports: {} };
    const cx = cursorX + geo.width / 2;
    const cy = rowY;
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
    cursorX += geo.width + EQUIP_GAP_X;
  }

  // 2. Place instruments.
  // Field instruments → near their measured equipment (below it).
  // Control-room instruments → above the equipment row (in a virtual control-room band).
  const instruments: PidLayoutInstrument[] = [];
  const instById = new Map<string, PidLayoutInstrument>();

  const crBandY = PADDING + TITLE_AREA + 40;
  // Stagger CR instrument x positions to avoid overlap.
  let crSlot = 0;
  for (const inst of ast.instruments) {
    let cx = 0;
    let cy = 0;
    if (inst.category.startsWith("cr_")) {
      // place in CR band; x aligns roughly to the controlled valve or the measured equipment.
      const tgt = inst.controls ?? inst.measures ?? "";
      const tgtEq = equipById.get(tgt);
      cx = tgtEq ? tgtEq.cx : PADDING + 80 + crSlot * (INST_RADIUS * 2 + 28);
      cy = crBandY;
      crSlot += 1;
    } else if (inst.category.startsWith("local_")) {
      cy = rowY + maxH / 2 + INST_OFFSET + INST_RADIUS;
      const tgt = inst.measures ?? inst.controls ?? "";
      const tgtEq = equipById.get(tgt);
      cx = tgtEq ? tgtEq.cx : PADDING + 80;
    } else {
      // field — directly below the related equipment
      cy = rowY + maxH / 2 + INST_OFFSET;
      const tgt = inst.measures ?? inst.controls ?? "";
      const tgtEq = equipById.get(tgt);
      cx = tgtEq ? tgtEq.cx : PADDING + 80;
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

  // Avoid overlapping field/local instruments by nudging their x where needed.
  const sameRow = (a: PidLayoutInstrument, b: PidLayoutInstrument) =>
    Math.abs(a.cy - b.cy) < INST_RADIUS && Math.abs(a.cx - b.cx) < INST_RADIUS * 2 + 8;
  const sortedByX = [...instruments].sort((a, b) => a.cx - b.cx);
  for (let i = 1; i < sortedByX.length; i++) {
    const prev = sortedByX[i - 1]!;
    const cur = sortedByX[i]!;
    if (sameRow(prev, cur)) {
      cur.cx = prev.cx + INST_RADIUS * 2 + 14;
    }
  }

  // 3. Route lines.
  const lines: PidLayoutLine[] = [];
  for (const ln of ast.lines) {
    const path = routeLine(ln, equipById, instById);
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
  };
}

function routeLine(
  ln: PidLine,
  equipById: Map<string, PidLayoutEquipment>,
  instById: Map<string, PidLayoutInstrument>
): PidLayoutLine | undefined {
  const fromAnchor = resolveAnchor(ln.from.id, ln.from.port, "out", equipById, instById);
  const toAnchor = resolveAnchor(ln.to.id, ln.to.port, "in", equipById, instById);
  if (!fromAnchor || !toAnchor) return undefined;

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

function resolveAnchor(
  id: string,
  port: string | undefined,
  fallback: "in" | "out",
  equipById: Map<string, PidLayoutEquipment>,
  instById: Map<string, PidLayoutInstrument>
): AnchorPoint | undefined {
  const eq = equipById.get(id);
  if (eq) return getAnchor(eq, port, fallback);

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
