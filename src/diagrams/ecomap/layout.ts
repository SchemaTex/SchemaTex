import type {
  DiagramAST,
  Individual,
  Relationship,
  LayoutConfig,
  LayoutResult,
  LayoutNode,
  LayoutEdge,
} from "../../core/types";

// ─── Constants ─────────────────────────────────────────────

const CENTER_R = 50;
const SYS_R = 30;
const SYS_R_LARGE = 40;
const SYS_R_SMALL = 20;
const PADDING = 40;
const LABEL_CLEARANCE = 60;

// ─── Public API ────────────────────────────────────────────

export function layoutEcomap(
  ast: DiagramAST,
  _config: LayoutConfig
): LayoutResult {
  const center = ast.individuals.find(
    (ind) => ind.properties?.center === "true"
  );
  if (!center) throw new Error("Ecomap requires a center element");

  const systems = ast.individuals.filter(
    (ind) => ind.properties?.center !== "true"
  );
  const n = systems.length;

  if (n === 0) {
    const size = (CENTER_R + PADDING + LABEL_CLEARANCE) * 2;
    return {
      width: size,
      height: size,
      nodes: [
        {
          id: center.id,
          x: size / 2 - CENTER_R,
          y: size / 2 - CENTER_R,
          width: CENTER_R * 2,
          height: CENTER_R * 2,
          generation: 0,
          individual: center,
        },
      ],
      edges: [],
    };
  }

  const ringRadii = getRingRadii(n);
  const ringAssignment = assignToRings(
    center.id,
    systems,
    ast.relationships,
    ringRadii.length
  );
  const systemPositions = placeOnRings(systems, ringAssignment, ringRadii);

  const maxRing = ringRadii[ringRadii.length - 1] ?? 180;
  const canvasSize = (maxRing + SYS_R_LARGE + LABEL_CLEARANCE + PADDING) * 2;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;

  const nodes: LayoutNode[] = [];

  nodes.push({
    id: center.id,
    x: cx - CENTER_R,
    y: cy - CENTER_R,
    width: CENTER_R * 2,
    height: CENTER_R * 2,
    generation: 0,
    individual: center,
  });

  for (const sys of systems) {
    const pos = systemPositions.get(sys.id);
    if (!pos) continue;
    const r = getSystemRadius(sys);
    nodes.push({
      id: sys.id,
      x: cx + pos.x - r,
      y: cy + pos.y - r,
      width: r * 2,
      height: r * 2,
      generation: pos.ring + 1,
      individual: sys,
    });
  }

  const edges = computeEdges(nodes, ast.relationships);

  return { width: canvasSize, height: canvasSize, nodes, edges };
}

// ─── Ring configuration ────────────────────────────────────

function getRingRadii(n: number): number[] {
  if (n === 0) return [];
  if (n <= 6) return [180];
  if (n <= 12) return [150, 270];
  return [140, 230, 320];
}

function assignToRings(
  _centerId: string,
  systems: Individual[],
  rels: Relationship[],
  ringCount: number
): Map<string, number> {
  const relBySys = new Map<string, Relationship>();
  for (const r of rels) {
    const sysId =
      r.from === _centerId ? r.to : r.from === _centerId ? r.to : r.to;
    if (!relBySys.has(sysId)) relBySys.set(sysId, r);
    const otherId = r.from === _centerId ? r.to : r.from;
    if (!relBySys.has(otherId)) relBySys.set(otherId, r);
  }

  const result = new Map<string, number>();

  if (ringCount <= 1) {
    for (const s of systems) result.set(s.id, 0);
    return result;
  }

  for (const s of systems) {
    const rel = relBySys.get(s.id);
    if (!rel) {
      result.set(s.id, ringCount - 1);
      continue;
    }

    if (rel.type === "strong" || rel.type === "stressful-strong") {
      result.set(s.id, 0);
    } else if (rel.type === "weak" || rel.type === "broken") {
      result.set(s.id, ringCount - 1);
    } else {
      result.set(s.id, Math.min(1, ringCount - 1));
    }
  }

  return result;
}

// ─── Placement ─────────────────────────────────────────────

interface SysPos {
  x: number;
  y: number;
  ring: number;
}

function placeOnRings(
  systems: Individual[],
  ringAssignment: Map<string, number>,
  ringRadii: number[]
): Map<string, SysPos> {
  const ringGroups = new Map<number, Individual[]>();
  for (const s of systems) {
    const ring = ringAssignment.get(s.id) ?? 0;
    const grp = ringGroups.get(ring) ?? [];
    grp.push(s);
    ringGroups.set(ring, grp);
  }

  const positions = new Map<string, SysPos>();

  for (const [ring, grp] of ringGroups) {
    const radius = ringRadii[ring] ?? ringRadii[ringRadii.length - 1] ?? 180;
    const n = grp.length;
    const startAngle = -Math.PI / 2;

    for (let idx = 0; idx < n; idx++) {
      const angle = startAngle + (2 * Math.PI * idx) / n;
      positions.set(grp[idx].id, {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        ring,
      });
    }
  }

  return positions;
}

// ─── Edges ─────────────────────────────────────────────────

function computeEdges(
  nodes: LayoutNode[],
  rels: Relationship[]
): LayoutEdge[] {
  const nodeMap = new Map<string, LayoutNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const edges: LayoutEdge[] = [];

  for (const rel of rels) {
    const fromNode = nodeMap.get(rel.from);
    const toNode = nodeMap.get(rel.to);
    if (!fromNode || !toNode) continue;

    const fcx = fromNode.x + fromNode.width / 2;
    const fcy = fromNode.y + fromNode.height / 2;
    const tcx = toNode.x + toNode.width / 2;
    const tcy = toNode.y + toNode.height / 2;

    const dx = tcx - fcx;
    const dy = tcy - fcy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue;

    const ux = dx / dist;
    const uy = dy / dist;
    const fromR = fromNode.width / 2;
    const toR = toNode.width / 2;

    const x1 = fcx + ux * fromR;
    const y1 = fcy + uy * fromR;
    const x2 = tcx - ux * toR;
    const y2 = tcy - uy * toR;

    edges.push({
      from: rel.from,
      to: rel.to,
      relationship: rel,
      path: `M ${x1} ${y1} L ${x2} ${y2}`,
    });
  }

  return edges;
}

// ─── Helpers ───────────────────────────────────────────────

function getSystemRadius(ind: Individual): number {
  const imp = ind.properties?.importance ?? ind.properties?.size;
  switch (imp) {
    case "major":
    case "large":
      return SYS_R_LARGE;
    case "minor":
    case "small":
      return SYS_R_SMALL;
    default:
      return SYS_R;
  }
}
