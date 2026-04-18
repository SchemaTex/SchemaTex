import type { SLDAST, SLDConnection, SLDNode, SLDNodeType } from "../../core/types";
import { geometryFor } from "./symbols";

/**
 * Top-down hierarchical layout:
 *   level 0 = sources (top)
 *   each edge forces child.level >= parent.level + 1
 * Bus nodes expand horizontally to span their children.
 * Other nodes are positioned in a tidy tree-like layout.
 */

export interface SLDLayoutNode {
  node: SLDNode;
  nodeType: SLDNodeType;
  /** center x */
  x: number;
  /** center y */
  y: number;
  /** Terminal y (top and bottom) after symbol geometry */
  topY: number;
  bottomY: number;
  level: number;
  /** Half width for spacing */
  halfWidth: number;
  /** For bus nodes: left and right extent (x min/max) */
  busLeft?: number;
  busRight?: number;
}

export interface SLDLayoutEdge {
  from: string;
  to: string;
  path: string;
  cable?: string;
  label?: string;
  midX: number;
  midY: number;
}

export interface SLDLayoutBand {
  level: number;
  voltage?: string;
  y: number;
  height: number;
}

export interface SLDLayoutResult {
  width: number;
  height: number;
  nodes: SLDLayoutNode[];
  edges: SLDLayoutEdge[];
  bands: SLDLayoutBand[];
  nodeById: Map<string, SLDLayoutNode>;
}

const LEVEL_SPACING = 100;
const H_SPACING = 90;
const LEFT_PADDING = 80;
const TOP_PADDING = 40;
const BUS_OVERHANG = 20;

function computeLevels(ast: SLDAST): Map<string, number> {
  const levels = new Map<string, number>();
  const inEdges = new Map<string, SLDConnection[]>();
  const outEdges = new Map<string, SLDConnection[]>();
  for (const n of ast.nodes) {
    inEdges.set(n.id, []);
    outEdges.set(n.id, []);
  }
  for (const c of ast.connections) {
    inEdges.get(c.to)?.push(c);
    outEdges.get(c.from)?.push(c);
  }

  // Sources: no incoming edges
  const roots = ast.nodes.filter((n) => (inEdges.get(n.id) ?? []).length === 0);
  for (const r of roots) levels.set(r.id, 0);

  // Identify bus_tie nodes — they are lateral at the same level as their source.
  const typeById = new Map<string, SLDNodeType>();
  for (const n of ast.nodes) typeById.set(n.id, n.nodeType);
  const isTieEdge = (c: SLDConnection): boolean =>
    typeById.get(c.from) === "bus_tie" || typeById.get(c.to) === "bus_tie";

  // Relaxation: level(to) = max(level(from)+1); iterate until stable.
  // Skip edges touching bus_tie (those are lateral).
  const maxIter = ast.nodes.length + 2;
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const c of ast.connections) {
      if (isTieEdge(c)) continue;
      const fromLvl = levels.get(c.from);
      if (fromLvl === undefined) continue;
      const want = fromLvl + 1;
      const curr = levels.get(c.to);
      if (curr === undefined || want > curr) {
        levels.set(c.to, want);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Tie edges: force both endpoints and the tie node itself to share level
  // with any already-leveled participant.
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const c of ast.connections) {
      if (!isTieEdge(c)) continue;
      const fromLvl = levels.get(c.from);
      const toLvl = levels.get(c.to);
      const shared = fromLvl ?? toLvl;
      if (shared === undefined) continue;
      if (fromLvl === undefined || fromLvl !== shared) {
        levels.set(c.from, shared);
        changed = true;
      }
      if (toLvl === undefined || toLvl !== shared) {
        levels.set(c.to, shared);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Any orphaned nodes: put at level 0
  for (const n of ast.nodes) {
    if (!levels.has(n.id)) levels.set(n.id, 0);
  }
  return levels;
}

function orderWithinLevel(
  ast: SLDAST,
  levels: Map<string, number>
): Map<number, string[]> {
  const byLevel = new Map<number, string[]>();
  for (const n of ast.nodes) {
    const lvl = levels.get(n.id) ?? 0;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(n.id);
  }

  // Order: DFS from sources preserving declaration order.
  const visited = new Set<string>();
  const order = new Map<string, number>();
  let idx = 0;

  const adj = new Map<string, string[]>();
  for (const n of ast.nodes) adj.set(n.id, []);
  for (const c of ast.connections) adj.get(c.from)?.push(c.to);

  function dfs(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    order.set(id, idx++);
    for (const child of adj.get(id) ?? []) dfs(child);
  }

  // Start from sources in declaration order
  const inEdgeCount = new Map<string, number>();
  for (const n of ast.nodes) inEdgeCount.set(n.id, 0);
  for (const c of ast.connections) {
    inEdgeCount.set(c.to, (inEdgeCount.get(c.to) ?? 0) + 1);
  }
  for (const n of ast.nodes) {
    if ((inEdgeCount.get(n.id) ?? 0) === 0) dfs(n.id);
  }
  // Fallback for any remaining nodes
  for (const n of ast.nodes) dfs(n.id);

  // Sort each level by the DFS order
  for (const [lvl, ids] of byLevel.entries()) {
    ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    byLevel.set(lvl, ids);
  }
  return byLevel;
}

export function layoutSLD(ast: SLDAST): SLDLayoutResult {
  const levels = computeLevels(ast);
  const byLevel = orderWithinLevel(ast, levels);
  const nodeMap = new Map<string, SLDNode>();
  for (const n of ast.nodes) nodeMap.set(n.id, n);

  // First pass: x position for all non-bus nodes.
  // Buses get x later after their children are placed.
  const layoutNodes: SLDLayoutNode[] = [];
  const byIdLayout = new Map<string, SLDLayoutNode>();

  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const n of ast.nodes) {
    parents.set(n.id, []);
    children.set(n.id, []);
  }
  for (const c of ast.connections) {
    parents.get(c.to)?.push(c.from);
    children.get(c.from)?.push(c.to);
  }

  const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b);
  const maxLevel = sortedLevels.length ? sortedLevels[sortedLevels.length - 1] : 0;

  // Assign sequential X for non-bus leaf-like nodes within each level.
  // Then propagate bus positions by averaging their children.
  let nextX = LEFT_PADDING;
  // x assignment helper: if children already placed, center above them; else nextX
  function placeNode(id: string): SLDLayoutNode {
    const existing = byIdLayout.get(id);
    if (existing) return existing;
    const node = nodeMap.get(id)!;
    const lvl = levels.get(id) ?? 0;
    const geom = geometryFor(node.nodeType);
    const y = TOP_PADDING + lvl * LEVEL_SPACING;
    const ln: SLDLayoutNode = {
      node,
      nodeType: node.nodeType,
      x: 0,
      y,
      topY: y + geom.topY,
      bottomY: y + geom.bottomY,
      level: lvl,
      halfWidth: geom.halfWidth,
    };
    byIdLayout.set(id, ln);
    layoutNodes.push(ln);
    return ln;
  }

  // Walk levels top-to-bottom placing non-bus nodes sequentially; buses get centered on children
  // We do this in two passes: first place everything sequentially, then re-center buses.
  for (const lvl of sortedLevels) {
    for (const id of byLevel.get(lvl)!) {
      const ln = placeNode(id);
      if (ln.nodeType === "bus") {
        // defer
        ln.x = nextX; // placeholder
      } else {
        ln.x = nextX;
        nextX += H_SPACING;
      }
    }
  }

  // Center buses over their children (or parents if no children)
  // Iterate multiple times to stabilize.
  for (let iter = 0; iter < 4; iter++) {
    for (const lvl of sortedLevels) {
      for (const id of byLevel.get(lvl)!) {
        const ln = byIdLayout.get(id)!;
        if (ln.nodeType !== "bus") continue;
        const childrenIds = children.get(id) ?? [];
        const parentIds = parents.get(id) ?? [];
        const relatedXs: number[] = [];
        for (const cid of childrenIds) {
          const c = byIdLayout.get(cid);
          if (c && c.nodeType !== "bus_tie") relatedXs.push(c.x);
        }
        if (relatedXs.length === 0) {
          for (const pid of parentIds) {
            const p = byIdLayout.get(pid);
            if (p && p.nodeType !== "bus_tie") relatedXs.push(p.x);
          }
        }
        if (relatedXs.length > 0) {
          const minX = Math.min(...relatedXs);
          const maxX = Math.max(...relatedXs);
          ln.x = (minX + maxX) / 2;
          ln.busLeft = minX - BUS_OVERHANG;
          ln.busRight = maxX + BUS_OVERHANG;
        } else {
          ln.busLeft = ln.x - 40;
          ln.busRight = ln.x + 40;
        }
      }
    }
  }

  // Center non-bus nodes over their child(ren), bottom-up.
  // For convergence (child has multiple parents at same level), spread
  // parents horizontally around the child instead of collapsing them to one x.
  const CONVERGENCE_SPREAD = Math.max(H_SPACING, 110);
  for (let iter = 0; iter < 4; iter++) {
    for (const lvl of [...sortedLevels].reverse()) {
      for (const id of byLevel.get(lvl)!) {
        const ln = byIdLayout.get(id)!;
        if (ln.nodeType === "bus" || ln.nodeType === "bus_tie") continue;
        const childIds = children.get(id) ?? [];
        if (childIds.length === 1) {
          const child = byIdLayout.get(childIds[0]);
          if (!child) continue;
          // Only the convergence child's parents are spread
          const siblingParents = (parents.get(child.node.id) ?? [])
            .map((pid) => byIdLayout.get(pid))
            .filter((p): p is SLDLayoutNode => !!p && p.level === lvl && p.nodeType !== "bus");
          if (siblingParents.length > 1) {
            // Sort by original sequential x to preserve declared order
            siblingParents.sort((a, b) => a.x - b.x);
            const n = siblingParents.length;
            const spread = Math.max(
              CONVERGENCE_SPREAD,
              (child.halfWidth * 2 + 40) / Math.max(1, n - 1)
            );
            const idx = siblingParents.indexOf(ln);
            ln.x = child.x + (idx - (n - 1) / 2) * spread;
          } else {
            ln.x = child.x;
          }
        } else if (childIds.length > 1) {
          const xs = childIds
            .map((c) => byIdLayout.get(c)?.x)
            .filter((v): v is number => v !== undefined);
          if (xs.length > 0) {
            ln.x = (Math.min(...xs) + Math.max(...xs)) / 2;
          }
        }
      }
    }
  }

  // Bus-tie lateral placement: place tie and its "second bus" to the right
  // of the "first bus" at the same level. Shift the entire busB cluster
  // (all nodes reachable from busB excluding busA/tie) so the whole
  // right-side subtree moves together.
  for (const ln of layoutNodes) {
    if (ln.nodeType !== "bus_tie") continue;
    const inIds = parents.get(ln.node.id) ?? [];
    const outIds = children.get(ln.node.id) ?? [];
    const busA = inIds.map((id) => byIdLayout.get(id)).find((n) => n?.nodeType === "bus");
    const busB = outIds.map((id) => byIdLayout.get(id)).find((n) => n?.nodeType === "bus");
    if (!busA || !busB) continue;

    const busAChildren = (children.get(busA.node.id) ?? [])
      .map((id) => byIdLayout.get(id))
      .filter((c): c is SLDLayoutNode => !!c && c.nodeType !== "bus_tie");
    const busAMaxX = busAChildren.length
      ? Math.max(...busAChildren.map((c) => c.x))
      : busA.x;
    ln.y = busA.y;
    ln.x = busAMaxX + 60;

    // Cluster of busB: BFS in both directions excluding busA and tie itself
    const cluster = new Set<string>([busB.node.id]);
    const queue = [busB.node.id];
    const excluded = new Set<string>([busA.node.id, ln.node.id]);
    while (queue.length) {
      const cur = queue.shift()!;
      const neighbors = [...(children.get(cur) ?? []), ...(parents.get(cur) ?? [])];
      for (const nb of neighbors) {
        if (cluster.has(nb) || excluded.has(nb)) continue;
        cluster.add(nb);
        queue.push(nb);
      }
    }

    // Shift whole cluster so its leftmost member sits just right of the tie
    let minClusterX = Infinity;
    for (const id of cluster) {
      const n = byIdLayout.get(id);
      if (!n) continue;
      const left = n.nodeType === "bus" ? (n.busLeft ?? n.x) : n.x - n.halfWidth;
      if (left < minClusterX) minClusterX = left;
    }
    const desiredLeft = ln.x + 30;
    const shift = desiredLeft - minClusterX;
    if (shift > 0) {
      for (const id of cluster) {
        const n = byIdLayout.get(id);
        if (!n) continue;
        n.x += shift;
        if (n.busLeft !== undefined) n.busLeft += shift;
        if (n.busRight !== undefined) n.busRight += shift;
      }
    }
  }

  // Label-aware collision resolution within each level.
  // For each non-bus node, estimate displayed label width so sibling
  // placement respects text, not just symbol geometry.
  const labelHalfWidth = (ln: SLDLayoutNode): number => {
    if (ln.nodeType === "bus" || ln.nodeType === "bus_tie") return 0;
    const node = ln.node;
    const txtParts: string[] = [node.label ?? node.id];
    if (node.rating) txtParts.push(node.rating);
    const longest = txtParts.reduce((m, s) => Math.max(m, s.length), 0);
    // Bold 11px sans-serif id is ~6.2px per char at widest; pad a bit.
    return (longest * 6.2) / 2 + 4;
  };

  for (const lvl of sortedLevels) {
    const ids = byLevel.get(lvl)!;
    const sorted = ids.map((id) => byIdLayout.get(id)!).sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (prev.nodeType === "bus" && cur.nodeType !== "bus") continue;
      if (cur.nodeType === "bus" && prev.nodeType !== "bus") continue;
      const symGap =
        (prev.nodeType === "bus" ? 0 : prev.halfWidth) +
        (cur.nodeType === "bus" ? 0 : cur.halfWidth) +
        16;
      const labelGap = labelHalfWidth(prev) + labelHalfWidth(cur) + 8;
      const minGap = Math.max(symGap, labelGap);
      if (cur.x - prev.x < minGap) {
        cur.x = prev.x + minGap;
      }
    }
  }

  // Bus nodes: re-update extent after collision resolution
  for (const ln of layoutNodes) {
    if (ln.nodeType !== "bus") continue;
    const childrenIds = children.get(ln.node.id) ?? [];
    const parentIds = parents.get(ln.node.id) ?? [];
    const xs: number[] = [];
    for (const cid of [...childrenIds, ...parentIds]) {
      const rel = byIdLayout.get(cid);
      if (rel && rel.nodeType !== "bus_tie") xs.push(rel.x);
    }
    // Include tie x so bus stretches up to the tie (but doesn't center on it)
    const tieXs: number[] = [];
    for (const cid of [...childrenIds, ...parentIds]) {
      const rel = byIdLayout.get(cid);
      if (rel && rel.nodeType === "bus_tie") tieXs.push(rel.x);
    }
    if (xs.length > 0) {
      let left = Math.min(...xs) - BUS_OVERHANG;
      let right = Math.max(...xs) + BUS_OVERHANG;
      for (const tx of tieXs) {
        if (tx < left) left = tx;
        if (tx > right) right = tx;
      }
      ln.busLeft = left;
      ln.busRight = right;
      ln.x = (Math.min(...xs) + Math.max(...xs)) / 2;
    }
  }

  // Update terminal Ys
  for (const ln of layoutNodes) {
    const geom = geometryFor(ln.nodeType);
    ln.topY = ln.y + geom.topY;
    ln.bottomY = ln.y + geom.bottomY;
  }

  // Build edges
  const edges: SLDLayoutEdge[] = [];
  for (const c of ast.connections) {
    const from = byIdLayout.get(c.from);
    const to = byIdLayout.get(c.to);
    if (!from || !to) continue;

    const fx = from.x;
    const tx = to.x;
    const lateralTie =
      from.nodeType === "bus_tie" ||
      to.nodeType === "bus_tie" ||
      (from.level === to.level && (from.nodeType === "bus" || to.nodeType === "bus"));

    let startY: number;
    let endY: number;
    if (lateralTie) {
      startY = from.y;
      endY = to.y;
    } else {
      startY = from.nodeType === "bus" ? from.y : from.bottomY;
      endY = to.nodeType === "bus" ? to.y : to.topY;
    }

    let pathD: string;
    if (lateralTie) {
      // Horizontal segment at common y; small stubs if tie sits on bus y
      pathD = `M ${fx} ${startY} L ${tx} ${endY}`;
    } else if (Math.abs(fx - tx) < 0.5) {
      pathD = `M ${fx} ${startY} L ${tx} ${endY}`;
    } else {
      // L-path: go down halfway, then horizontal, then vertical
      const midY = (startY + endY) / 2;
      pathD = `M ${fx} ${startY} L ${fx} ${midY} L ${tx} ${midY} L ${tx} ${endY}`;
    }

    edges.push({
      from: c.from,
      to: c.to,
      path: pathD,
      cable: c.cable,
      label: c.label,
      midX: (fx + tx) / 2,
      midY: (startY + endY) / 2,
    });
  }

  // Compute bands (voltage regions)
  const bands: SLDLayoutBand[] = [];
  for (const lvl of sortedLevels) {
    // Find a representative voltage label for this band
    let voltage: string | undefined;
    for (const id of byLevel.get(lvl)!) {
      const n = nodeMap.get(id)!;
      if (n.voltage) {
        voltage = n.voltage;
        break;
      }
    }
    bands.push({
      level: lvl,
      voltage,
      y: TOP_PADDING + lvl * LEVEL_SPACING - LEVEL_SPACING / 2 + 10,
      height: LEVEL_SPACING,
    });
  }

  // Normalize X so the leftmost content sits at LEFT_PADDING (no empty left gutter).
  let contentMinX = Infinity;
  for (const ln of layoutNodes) {
    const left = ln.nodeType === "bus"
      ? (ln.busLeft ?? ln.x)
      : ln.x - ln.halfWidth;
    if (left < contentMinX) contentMinX = left;
  }
  if (!Number.isFinite(contentMinX)) contentMinX = 0;
  const xShift = LEFT_PADDING - contentMinX;
  if (Math.abs(xShift) > 0.5) {
    for (const ln of layoutNodes) {
      ln.x += xShift;
      if (ln.busLeft !== undefined) ln.busLeft += xShift;
      if (ln.busRight !== undefined) ln.busRight += xShift;
    }
    for (const e of edges) {
      e.midX += xShift;
      // Shift every "x" coord in the path string (M / L tokens are "x y" pairs).
      e.path = e.path.replace(
        /([ML])\s+(-?[\d.]+)\s+(-?[\d.]+)/g,
        (_m, cmd, x, y) => `${cmd} ${Number(x) + xShift} ${y}`
      );
    }
  }

  // Compute canvas size
  let maxX = 0;
  for (const ln of layoutNodes) {
    const right = (ln.busRight ?? (ln.x + ln.halfWidth)) + 60;
    if (right > maxX) maxX = right;
  }
  const width = Math.max(400, maxX + 40);
  const height = TOP_PADDING + maxLevel * LEVEL_SPACING + 120;

  return {
    width,
    height,
    nodes: layoutNodes,
    edges,
    bands,
    nodeById: byIdLayout,
  };
}
