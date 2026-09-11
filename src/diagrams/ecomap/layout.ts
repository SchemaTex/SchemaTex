import type {
  DiagramAST,
  Individual,
  Relationship,
  LayoutConfig,
  LayoutResult,
  LayoutNode,
  LayoutEdge,
} from "../../core/types";
import { systemCaption } from "./labels";
import { estimateTextWidth } from "../../core/text-metrics";

// ─── Constants ─────────────────────────────────────────────

const CENTER_R = 50;
/** Renderer paints the center label at fontSize+2 (= 14px), weight 600. */
const CENTER_LABEL_FONT = 14;

/** Center circle must fit its single-line label — grow beyond CENTER_R when needed. */
function getCenterRadius(center: Individual): number {
  const label =
    center.label !== center.id
      ? center.label
      : center.id.charAt(0).toUpperCase() + center.id.slice(1);
  const w = estimateTextWidth(label, CENTER_LABEL_FONT, { fontWeight: 600 });
  return Math.max(CENTER_R, Math.ceil(w / 2) + 10);
}
const PADDING = 28;
const LABEL_CLEARANCE = 0;

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

  const centerR = getCenterRadius(center);

  if (n === 0) {
    const size = (centerR + PADDING + LABEL_CLEARANCE) * 2;
    return {
      width: size,
      height: size,
      nodes: [
        {
          id: center.id,
          x: size / 2 - centerR,
          y: size / 2 - centerR,
          width: centerR * 2,
          height: centerR * 2,
          generation: 0,
          individual: center,
        },
      ],
      edges: [],
    };
  }

  const systemR = Math.max(...systems.map(getSystemRadius));
  const radialMinimum = Math.max(centerR + systemR + 80, (systemR + 16) / Math.sin(Math.PI / Math.max(n, 3)));
  const ringRadii = getRingRadii(n).map((r, _i, all) => radialMinimum + r - all[0]);
  const ringAssignment = assignToRings(
    center.id,
    systems,
    ast.relationships,
    ringRadii.length
  );
  const systemPositions = placeOnRings(systems, ringAssignment, ringRadii);

  const maxRing = ringRadii[ringRadii.length - 1] ?? 180;
  const canvasSize = (maxRing + systemR + LABEL_CLEARANCE + PADDING) * 2;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;

  const nodes: LayoutNode[] = [];

  nodes.push({
    id: center.id,
    x: cx - centerR,
    y: cy - centerR,
    width: centerR * 2,
    height: centerR * 2,
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
    if (r.from === _centerId) relBySys.set(r.to, r);
    else if (r.to === _centerId) relBySys.set(r.from, r);
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
  const positions = new Map<string, SysPos>();
  // One angular slot per system across all rings: outer ties cannot pass
  // through inner-ring nodes just because both rings start at twelve o'clock.
  systems.forEach((system, index) => {
    const ring = ringAssignment.get(system.id) ?? 0;
    const radius = ringRadii[ring];
    const angle = -Math.PI / 2 + 2 * Math.PI * index / systems.length;
    positions.set(system.id, { x: radius * Math.cos(angle), y: radius * Math.sin(angle), ring });
  });

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
  return systemCaption(ind).radius;
}
