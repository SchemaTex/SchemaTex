import type { EntityAST, EntityNode, EntityEdge, EntityType } from "../../core/types";

/**
 * Tier-based top-down layout for entity structure diagrams.
 *
 * - Tier assigned via longest-path from sources (relaxation)
 * - Within-tier x placed by DFS declaration order
 * - Non-bus parents re-centered over children bottom-up
 * - Edges routed orthogonally (down → across → down)
 */

import { wrapTextToWidth, estimateMaxLineWidth } from "../../core/text-metrics";

import { orthogonalRoute, compactRoute, intersectsBox, type RoutePoint, type RoutedNet } from "../logic/orthogonal-router";
import { labelPathPoints, labelOverlap, edgeLabelObstacles } from "../../core/label-placement";

export interface EntityLayoutNode {
  nameLines: string[];
  detailLines: string[];
  node: EntityNode;
  x: number;         // center x
  y: number;         // center y
  tier: number;
  width: number;
  height: number;
  /** Top-center anchor for edge end */
  topY: number;
  bottomY: number;
}

export interface EntityLayoutEdge {
  edge: EntityEdge;
  path: string;
  /** Label anchor (horizontal mid of the branch segment) */
  labelX: number;
  labelY: number;
  labelLines: string[];
  labelWidth: number;
  labelHeight: number;
}

export interface EntityLayoutCluster {
  id: string;
  label: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EntityLayoutResult {
  width: number;
  height: number;
  nodes: EntityLayoutNode[];
  nodeById: Map<string, EntityLayoutNode>;
  edges: EntityLayoutEdge[];
  clusters: EntityLayoutCluster[];
}

const H_GAP = 70;
const PADDING = 40;
const CLUSTER_PADDING = 26;
const CLUSTER_V_GAP = 16;

function geometryFor(type: EntityType): { width: number; height: number } {
  if (type === "individual") return { width: 80, height: 80 };
  if (type === "lp") return { width: 360, height: 110 };
  if (type === "trust") return { width: 290, height: 84 };
  return { width: 248, height: 84 };
}

function computeTiers(ast: EntityAST): Map<string, number> {
  const inEdges = new Map<string, EntityEdge[]>();
  const outEdges = new Map<string, EntityEdge[]>();
  for (const n of ast.entities) {
    inEdges.set(n.id, []);
    outEdges.set(n.id, []);
  }
  for (const e of ast.edges) {
    inEdges.get(e.to)?.push(e);
    outEdges.get(e.from)?.push(e);
  }

  // Only ownership-style edges define hierarchy. Lateral relationships
  // (license, distribution, management) should NOT force descendants.
  const isHierarchy = (e: EntityEdge): boolean =>
    e.op === "ownership" || e.op === "voting" || e.op === "pool";

  const tiers = new Map<string, number>();
  // Seed: entities with no hierarchical in-edges → tier 0
  for (const n of ast.entities) {
    const hierIn = (inEdges.get(n.id) ?? []).filter(isHierarchy);
    if (hierIn.length === 0) tiers.set(n.id, 0);
  }

  const maxIter = ast.entities.length + 4;
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const e of ast.edges) {
      if (!isHierarchy(e)) continue;
      const fromT = tiers.get(e.from);
      if (fromT === undefined) continue;
      const want = fromT + 1;
      const cur = tiers.get(e.to);
      if (cur === undefined || want > cur) {
        tiers.set(e.to, want);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Non-hierarchical targets: place at same tier as source if not already set
  for (const e of ast.edges) {
    if (isHierarchy(e)) continue;
    if (!tiers.has(e.to)) {
      const src = tiers.get(e.from);
      if (src !== undefined) tiers.set(e.to, src);
    }
    if (!tiers.has(e.from)) {
      const dst = tiers.get(e.to);
      if (dst !== undefined) tiers.set(e.from, dst);
    }
  }
  // Any orphans → tier 0
  for (const n of ast.entities) {
    if (!tiers.has(n.id)) tiers.set(n.id, 0);
  }
  return tiers;
}

export function layoutEntity(ast: EntityAST): EntityLayoutResult {
  const tiers = computeTiers(ast);
  const maxTier = Math.max(0, ...Array.from(tiers.values()));

  // Group by tier, order by declaration
  const byTier = new Map<number, EntityNode[]>();
  for (const n of ast.entities) {
    const t = tiers.get(n.id) ?? 0;
    if (!byTier.has(t)) byTier.set(t, []);
    byTier.get(t)!.push(n);
  }

  // Build layout nodes
  const layoutNodes: EntityLayoutNode[] = [];
  const byId = new Map<string, EntityLayoutNode>();
  for (const n of ast.entities) {
    const g = geometryFor(n.entityType);
    const textWidth = n.entityType === "individual" ? 150 : 200;
    const nameLines = wrapTextToWidth(n.name, 13, textWidth, { fontWeight: 600 });
    const detailLines = [
      [n.entityType === "lp" ? "Partnership" : n.entityType === "disregarded" ? "Disregarded entity" : n.entityType === "corp" ? "Corporation" : n.entityType === "llc" ? "LLC" : n.entityType === "pool" ? "Reserved pool" : n.entityType === "placeholder" ? "To be formed" : n.entityType.charAt(0).toUpperCase() + n.entityType.slice(1), n.jurisdiction].filter(Boolean).join(" · "),
      n.role, n.note, n.formationDate ? `est. ${n.formationDate}` : undefined,
    ].filter((v): v is string => !!v).flatMap(v => wrapTextToWidth(v, 11, textWidth));
    if (n.entityType !== "individual") {
      const rows = nameLines.length + detailLines.length;
      g.height = n.entityType === "lp" ? Math.max(110, rows * 30 + 20) : Math.max(84, rows * 16 + 30);
      if (n.entityType === "trust" || n.entityType === "disregarded") {
        // Circumscribe the text rectangle with the ellipse, including the
        // inset on disregarded entities. This protects multiline corner text.
        const textWidth = Math.max(estimateMaxLineWidth(nameLines.join("\n"), 13, {fontWeight:600}), estimateMaxLineWidth(detailLines.join("\n"), 11));
        g.width = Math.max(g.width, Math.ceil((textWidth + 8) * Math.SQRT2 + 20));
        g.height = Math.max(g.height, Math.ceil((rows * 16 + 8) * Math.SQRT2 + 20));
      }
    }
    const t = tiers.get(n.id) ?? 0;
    const ln: EntityLayoutNode = {
      node: n,
      nameLines,
      detailLines,
      x: 0,
      y: PADDING + g.height / 2,
      tier: t,
      width: g.width,
      height: g.height,
      topY: 0,
      bottomY: 0,
    };
    ln.topY = ln.y - g.height / 2;
    ln.bottomY = ln.y + g.height / 2;
    layoutNodes.push(ln);
    byId.set(n.id, ln);
  }

  let tierTop = PADDING;
  for (let tier = 0; tier <= maxTier; tier++) {
    const row = layoutNodes.filter(n => n.tier === tier);
    for (const n of row) {
      n.topY = tierTop;
      n.y = tierTop + n.height / 2;
      n.bottomY = tierTop + n.height;
    }
    tierTop += Math.max(0, ...row.map(n => n.height)) + 110;
  }

  const horizontalGap = Math.max(H_GAP, ...ast.edges.filter(e => tiers.get(e.from) === tiers.get(e.to)).map(e =>
    Math.min(150, estimateMaxLineWidth([e.percentage, e.label, e.shareClass].filter(Boolean).join(" "), 11)) + 56));

  // Assign sequential X per tier (declaration order)
  for (let t = 0; t <= maxTier; t++) {
    const nodes = byTier.get(t) ?? [];
    let cx = PADDING;
    for (const n of nodes) {
      const ln = byId.get(n.id)!;
      cx += ln.width / 2;
      ln.x = cx;
      cx += ln.width / 2 + horizontalGap;
    }
  }

  // Parent/child maps for hierarchy only
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const n of ast.entities) {
    children.set(n.id, []);
    parents.set(n.id, []);
  }
  for (const e of ast.edges) {
    if (e.op === "ownership" || e.op === "voting" || e.op === "pool") {
      children.get(e.from)?.push(e.to);
      parents.get(e.to)?.push(e.from);
    }
  }

  // Center parents over their children bottom-up
  for (let iter = 0; iter < 4; iter++) {
    for (let t = maxTier - 1; t >= 0; t--) {
      const tierNodes = byTier.get(t) ?? [];
      for (const n of tierNodes) {
        const ln = byId.get(n.id)!;
        const childIds = children.get(n.id) ?? [];
        if (childIds.length === 0) continue;
        if (childIds.length === 1) {
          // Cap-table convergence: if the only child has multiple same-tier parents,
          // spread parents around the child's x rather than collapsing them.
          const child = byId.get(childIds[0]);
          if (!child) continue;
          const siblingParents = (parents.get(child.node.id) ?? [])
            .map((pid) => byId.get(pid))
            .filter((p): p is EntityLayoutNode => !!p && p.tier === t);
          if (siblingParents.length > 1) {
            siblingParents.sort(
              (a, b) =>
                (byTier.get(t) ?? []).indexOf(a.node) -
                (byTier.get(t) ?? []).indexOf(b.node)
            );
            const totalWidth = siblingParents.reduce(
              (sum, p) => sum + effectiveHalfWidth(p) * 2,
              0
            );
            const spread = Math.max(
              horizontalGap + (effectiveHalfWidth(ln) + effectiveHalfWidth(siblingParents[0])) / 1,
              totalWidth / Math.max(1, siblingParents.length - 1)
            );
            const idx = siblingParents.indexOf(ln);
            const n2 = siblingParents.length;
            ln.x = child.x + (idx - (n2 - 1) / 2) * spread;
          } else {
            ln.x = child.x;
          }
          continue;
        }
        const xs = childIds
          .map((c) => byId.get(c)?.x)
          .filter((v): v is number => v !== undefined);
        if (xs.length > 0) {
          ln.x = (Math.min(...xs) + Math.max(...xs)) / 2;
        }
      }
    }

    // Center child over multiple parents (cap table convergence)
    for (let t = 1; t <= maxTier; t++) {
      const tierNodes = byTier.get(t) ?? [];
      for (const n of tierNodes) {
        const ln = byId.get(n.id)!;
        const parentIds = parents.get(n.id) ?? [];
        if (parentIds.length < 2) continue;
        const xs = parentIds
          .map((p) => byId.get(p)?.x)
          .filter((v): v is number => v !== undefined);
        if (xs.length > 0) {
          ln.x = (Math.min(...xs) + Math.max(...xs)) / 2;
        }
      }
    }

    // Resolve within-tier overlaps (preserve declaration order, label-aware)
    for (let t = 0; t <= maxTier; t++) {
      const tierNodes = (byTier.get(t) ?? [])
        .map((n) => byId.get(n.id)!)
        .sort((a, b) => a.x - b.x);
      for (let i = 1; i < tierNodes.length; i++) {
        const prev = tierNodes[i - 1];
        const cur = tierNodes[i];
        const gap = effectiveHalfWidth(prev) + effectiveHalfWidth(cur) + horizontalGap;
        if (cur.x - prev.x < gap) cur.x = prev.x + gap;
      }
    }
  }

  // Shift so leftmost content sits at PADDING
  let minLeft = Infinity;
  for (const ln of layoutNodes) {
    const left = ln.x - ln.width / 2;
    if (left < minLeft) minLeft = left;
  }
  const shift = PADDING - minLeft;
  if (Math.abs(shift) > 0.5) {
    for (const ln of layoutNodes) ln.x += shift;
  }

  // Ownership fans may share the same owner's trunk. Other relationships
  // receive independent ports and routes so their strokes cannot imply ownership.
  const edges: EntityLayoutEdge[] = [];
  const routes: RoutedNet[] = [];
  const boxes = layoutNodes.map(n => ({ left: n.x - n.width / 2 - 16, right: n.x + n.width / 2 + 16, top: n.topY - 16, bottom: n.bottomY + 16 }));
  for (const e of ast.edges) {
    const from = byId.get(e.from), to = byId.get(e.to);
    if (!from || !to) continue;
    const ownership = e.op === "ownership";
    const siblings = ast.edges.filter(other => other.to === e.to && other.op === "ownership");
    const index = siblings.indexOf(e);
    const verticalOwner = [...siblings].sort((a,b) => Math.abs(byId.get(a.from)!.x-to.x)-Math.abs(byId.get(b.from)!.x-to.x))[0];
    let start: RoutePoint, end: RoutePoint, escapeStart: RoutePoint, escapeEnd: RoutePoint;
    if (ownership && from.tier < to.tier) {
      start = { x: from.x, y: from.bottomY };
      escapeStart = { x: start.x, y: start.y + 24 };
      const offset = to.node.entityType === "lp" ? 0 : (index - (siblings.length - 1) / 2) * 28;
      end = { x: to.x + offset, y: to.topY };
      if (to.node.entityType === "lp" && siblings.length > 1 && e !== verticalOwner) {
        escapeEnd = { x: to.x + (from.x < to.x ? -1 : 1) * (to.width / 2 + 24), y: to.topY };
      } else escapeEnd = { x: end.x, y: end.y - 24 };
    } else {
      const side = from.x <= to.x ? 1 : -1;
      const parallel = ast.edges.filter(other => other.from === e.from && other.to === e.to && other.op !== "ownership");
      const offset = (parallel.indexOf(e) - (parallel.length - 1) / 2) * 18;
      start = { x: from.x + side * from.width / 2, y: from.y + offset };
      end = { x: to.x - side * to.width / 2, y: to.y + offset };
      // Triangles narrow towards their apex: meet the actual sloping edge.
      if (from.node.entityType === "lp") start.x = from.x + side * from.width / 2 * ((start.y - from.topY) / from.height);
      if (to.node.entityType === "lp") end.x = to.x - side * to.width / 2 * ((end.y - to.topY) / to.height);
      escapeStart = { x: from.x + side * (from.width / 2 + 24), y: start.y };
      escapeEnd = { x: to.x - side * (to.width / 2 + 24), y: end.y };
    }
    const net = ownership ? `ownership:${e.from}` : `relationship:${edges.length}`;
    const midY = (from.bottomY + to.topY) / 2;
    const fan = compactRoute([start, {x:start.x,y:midY}, {x:end.x,y:midY}, end]);
    const hasClearOwnershipFan = ownership && siblings.length === 1 && from.tier < to.tier &&
      fan.slice(1).every((p,i) => boxes.every((box,j) => layoutNodes[j] === from || layoutNodes[j] === to || !intersectsBox(fan[i]!,p,box)));
    const points = hasClearOwnershipFan ? fan : compactRoute([start, ...orthogonalRoute(escapeStart, escapeEnd, boxes, routes, net), end]);
    routes.push({ net, points });
    const labelLines = [e.percentage, e.label, e.shareClass].filter((v): v is string => !!v).flatMap(v => wrapTextToWidth(v, 11, 150));
    const labelWidth = labelLines.length ? estimateMaxLineWidth(labelLines.join("\n"), 11, { fontWeight: 600 }) + 4 : 0;
    const labelHeight = labelLines.length * 14;
    edges.push({ edge: e, path: points.map((p,i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" "), labelX: end.x, labelY: end.y - 32, labelLines, labelWidth, labelHeight });
  }
  const occupied = layoutNodes.map(n => ({ x: n.x - n.width/2 - 4, y: n.topY - 4, width:n.width+8, height:n.height+8 }));
  const wires = edges.flatMap(e => edgeLabelObstacles(labelPathPoints(e.path)));
  for (const edge of edges) {
    if (!edge.labelLines.length) continue;
    const points = labelPathPoints(edge.path), w = edge.labelWidth, h = edge.labelHeight;
    const candidates: {x:number;y:number}[] = [];
    const fanIn = edge.edge.op === "ownership" && ast.edges.filter(e => e.op === "ownership" && e.to === edge.edge.to).length > 1 && ast.edges.filter(e => e.op === "ownership" && e.from === edge.edge.from).length === 1;
    for (let step = 1; step < points.length; step++) {
      const i = fanIn ? step : points.length-step;
      const a=points[i-1]!, b=points[i]!;
      if (a.x===b.x) {
        if (Math.abs(b.y-a.y)<h+6) continue;
        for (const fraction of [0.7, 0.5, 0.3]) for (const sign of [1,-1]) candidates.push({x:a.x+sign*(w/2+8), y:a.y+(b.y-a.y)*fraction});
      } else if (Math.abs(b.x-a.x)>=16) {
        for (const sign of [-1,1]) candidates.push({x:(a.x+b.x)/2,y:a.y+sign*(h/2+7)});
      }
    }
    let best = {x:edge.labelX,y:edge.labelY}, score=Infinity;
    for (const p of candidates) {
      const rect={x:p.x-w/2,y:p.y-h/2,width:w,height:h};
      const overlap=[...occupied,...wires].reduce((sum,o)=>sum+labelOverlap(rect,o),0);
      if (overlap<score) {best=p;score=overlap;}
      if (!score) break;
    }
    edge.labelX=best.x;edge.labelY=best.y;
    occupied.push({x:best.x-w/2-3,y:best.y-h/2-3,width:w+6,height:h+6});
  }

  // Build cluster rectangles (explicit members only, or auto by jurisdiction)
  const layoutClusters: EntityLayoutCluster[] = [];
  const usedIds = new Set<string>();

  const LABEL_ROW = 22;

  for (const c of ast.clusters) {
    const members = c.members
      .map((id) => byId.get(id))
      .filter((n): n is EntityLayoutNode => !!n);
    if (members.length === 0) continue;
    const bounds = boundingBox(members);
    layoutClusters.push({
      id: c.id,
      label: c.label,
      color: c.color,
      x: bounds.minX - CLUSTER_PADDING,
      y: bounds.minY - CLUSTER_PADDING - LABEL_ROW,
      width: bounds.maxX - bounds.minX + CLUSTER_PADDING * 2,
      height: bounds.maxY - bounds.minY + CLUSTER_PADDING * 2 + LABEL_ROW,
    });
    for (const m of members) usedIds.add(m.node.id);
  }

  // Auto-cluster by declared jurisdiction (only those not already in explicit cluster)
  for (const j of ast.jurisdictions) {
    const members = layoutNodes.filter(
      (n) => n.node.jurisdiction === j.code && !usedIds.has(n.node.id)
    );
    if (members.length === 0) continue;
    const bounds = boundingBox(members);
    layoutClusters.push({
      id: `jur-${j.code}`,
      label: j.name,
      color: j.color,
      x: bounds.minX - CLUSTER_PADDING,
      y: bounds.minY - CLUSTER_PADDING - LABEL_ROW,
      width: bounds.maxX - bounds.minX + CLUSTER_PADDING * 2,
      height: bounds.maxY - bounds.minY + CLUSTER_PADDING * 2 + LABEL_ROW,
    });
    for (const m of members) usedIds.add(m.node.id);
  }

  // Resolve cluster vertical overlaps on the same band — if two clusters at
  // different tiers overlap vertically, shrink the top one's bottom and push
  // the bottom one's top so their borders don't cross.
  for (let i = 0; i < layoutClusters.length; i++) {
    for (let k = i + 1; k < layoutClusters.length; k++) {
      const a = layoutClusters[i];
      const b = layoutClusters[k];
      const hOverlap = !(a.x + a.width < b.x || b.x + b.width < a.x);
      const vOverlap = !(a.y + a.height < b.y || b.y + b.height < a.y);
      if (!hOverlap || !vOverlap) continue;
      // Determine which is above
      const [top, bot] = a.y < b.y ? [a, b] : [b, a];
      const want = bot.y - CLUSTER_V_GAP;
      if (top.y + top.height > want) top.height = Math.max(20, want - top.y);
    }
  }

  // Compute canvas
  let maxX = 0;
  let maxY = 0;
  for (const ln of layoutNodes) {
    const right = ln.x + ln.width / 2;
    const bottom = ln.bottomY + 40; // space for role/note label
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }
  for (const c of layoutClusters) {
    if (c.x + c.width > maxX) maxX = c.x + c.width;
    if (c.y + c.height > maxY) maxY = c.y + c.height;
  }
  let minX = 0, minY = 0;
  for (const e of edges) {
    for (const p of labelPathPoints(e.path)) { minX=Math.min(minX,p.x-PADDING);minY=Math.min(minY,p.y-PADDING);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y); }
    minX=Math.min(minX,e.labelX-e.labelWidth/2-PADDING);minY=Math.min(minY,e.labelY-e.labelHeight/2-PADDING);
    maxX=Math.max(maxX,e.labelX+e.labelWidth/2);maxY=Math.max(maxY,e.labelY+e.labelHeight/2);
  }
  for (const n of layoutNodes) { n.x-=minX;n.y-=minY;n.topY-=minY;n.bottomY-=minY; }
  for (const c of layoutClusters) {c.x-=minX;c.y-=minY;}
  for (const e of edges) {e.path=labelPathPoints(e.path).map((p,i)=>`${i?"L":"M"} ${p.x-minX} ${p.y-minY}`).join(" ");e.labelX-=minX;e.labelY-=minY;}
  maxX-=minX;maxY-=minY;
  const width = Math.max(400, maxX + PADDING);
  const height = Math.max(200, maxY + PADDING);

  return {
    width,
    height,
    nodes: layoutNodes,
    nodeById: byId,
    edges,
    clusters: layoutClusters,
  };
}

/**
 * Effective half-width for collision resolution — includes the label text that
 * extends beyond the shape (especially individuals where name/role are rendered
 * BELOW the circle, wider than the circle itself).
 */
function effectiveHalfWidth(ln: EntityLayoutNode): number {
  const n = ln.node;
  const shapeHalf = ln.width / 2;
  const textLen = (s?: string): number => (s ? s.length : 0);
  if (n.entityType === "individual") {
    const longest = Math.max(
      textLen(n.name),
      textLen(n.role),
      textLen(n.note)
    );
    const textHalf = (longest * 6.2) / 2 + 4;
    return Math.max(shapeHalf, textHalf);
  }
  // For non-individual, below-node note can also overflow the shape
  const longestBelow = Math.max(textLen(n.note), textLen(n.role));
  const textHalf = (longestBelow * 6) / 2 + 4;
  return Math.max(shapeHalf, textHalf);
}

function boundingBox(nodes: EntityLayoutNode[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.width / 2);
    maxX = Math.max(maxX, n.x + n.width / 2);
    minY = Math.min(minY, n.topY);
    maxY = Math.max(maxY, n.bottomY + 26); // include space for below-node labels
  }
  return { minX, maxX, minY, maxY };
}
