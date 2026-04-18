import type { EntityAST, EntityNode, EntityEdge, EntityType } from "../../core/types";

/**
 * Tier-based top-down layout for entity structure diagrams.
 *
 * - Tier assigned via longest-path from sources (relaxation)
 * - Within-tier x placed by DFS declaration order
 * - Non-bus parents re-centered over children bottom-up
 * - Edges routed orthogonally (down → across → down)
 */

export interface EntityLayoutNode {
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

const TIER_GAP = 170;
const H_GAP = 70;
const PADDING = 40;
const CLUSTER_PADDING = 26;
const CLUSTER_V_GAP = 16;

export function geometryFor(type: EntityType): { width: number; height: number } {
  switch (type) {
    case "trust":
      return { width: 200, height: 80 }; // ellipse bbox
    case "individual":
      return { width: 80, height: 80 }; // circle bbox; label rendered below
    case "foundation":
      return { width: 150, height: 80 };
    case "pool":
    case "disregarded":
    case "placeholder":
    case "corp":
    case "llc":
    case "lp":
    default:
      return { width: 170, height: 62 };
  }
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
    const t = tiers.get(n.id) ?? 0;
    const ln: EntityLayoutNode = {
      node: n,
      x: 0,
      y: PADDING + t * TIER_GAP + g.height / 2,
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

  // Assign sequential X per tier (declaration order)
  for (let t = 0; t <= maxTier; t++) {
    const nodes = byTier.get(t) ?? [];
    let cx = PADDING;
    for (const n of nodes) {
      const ln = byId.get(n.id)!;
      cx += ln.width / 2;
      ln.x = cx;
      cx += ln.width / 2 + H_GAP;
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
              H_GAP + (effectiveHalfWidth(ln) + effectiveHalfWidth(siblingParents[0])) / 1,
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
        const gap = effectiveHalfWidth(prev) + effectiveHalfWidth(cur) + H_GAP;
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

  // Build edges with orthogonal routing.
  //
  // Label placement strategy for hierarchical (down) edges:
  //   - fan-in (child has >1 parents, e.g. cap-table): label on child-side
  //     vertical stub, just above child.topY. Owner-share reads naturally
  //     as "X% of [child]".
  //   - fan-out (parent has >1 children, e.g. holdco → subs): label on
  //     parent-side vertical stub, just below parent.bottomY.
  //   - 1:1 straight drop: label offset to the side of the vertical line.
  //   - otherwise (branching both sides): label at midpoint of parent stub.
  // This avoids stacking multiple labels on the shared horizontal bar.
  const edges: EntityLayoutEdge[] = [];
  for (const e of ast.edges) {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) continue;

    const sameTier = from.tier === to.tier;
    let path: string;
    let labelX: number;
    let labelY: number;

    if (sameTier) {
      const leftFirst = from.x < to.x;
      const sx = leftFirst ? from.x + from.width / 2 : from.x - from.width / 2;
      const ex = leftFirst ? to.x - to.width / 2 : to.x + to.width / 2;
      path = `M ${sx} ${from.y} L ${ex} ${to.y}`;
      labelX = (sx + ex) / 2;
      labelY = from.y - 6;
    } else {
      const sx = from.x;
      const sy = from.bottomY;
      const ex = to.x;
      const ey = to.topY;
      const straight = Math.abs(sx - ex) < 0.5;

      if (straight) {
        // No corners → midpoint of the vertical line.
        path = `M ${sx} ${sy} L ${ex} ${ey}`;
        labelX = sx;
        labelY = (sy + ey) / 2;
      } else {
        // L-path has two corners: (sx, midY) top and (ex, midY) bottom.
        // Each edge owns its corners uniquely, so placing the label at a
        // corner avoids stacking on the shared horizontal branch.
        const midY = (sy + ey) / 2;
        path = `M ${sx} ${sy} L ${sx} ${midY} L ${ex} ${midY} L ${ex} ${ey}`;

        const isHier =
          e.op === "ownership" || e.op === "voting" || e.op === "pool";
        const parentCount = isHier ? (parents.get(e.to) ?? []).length : 0;
        const fanIn = parentCount > 1;

        // fan-in (many parents → one child): top corner (parent side) is
        //   unique per parent.
        // fan-out (one parent → many children): bottom corner (child side)
        //   is unique per child.
        // 1:1 offset: bottom corner — reads naturally as "X% of [child]".
        if (fanIn) {
          labelX = sx;
          labelY = midY;
        } else {
          labelX = ex;
          labelY = midY;
        }
      }
    }

    edges.push({ edge: e, path, labelX, labelY });
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
