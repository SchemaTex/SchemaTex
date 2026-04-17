import type {
  SociogramAST,
  SociogramNode,
  SociogramEdge,
  NodeRole,
} from "./parser";

export interface SociogramLayoutNode {
  node: SociogramNode;
  x: number;
  y: number;
  radius: number;
  computedRole?: NodeRole;
}

export interface SociogramLayoutEdge {
  edge: SociogramEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SociogramLayoutResult {
  width: number;
  height: number;
  nodes: SociogramLayoutNode[];
  edges: SociogramLayoutEdge[];
  ast: SociogramAST;
}

// ─── Metrics ────────────────────────────────────────────────

function computeInDegree(nodeId: string, edges: SociogramEdge[]): number {
  let count = 0;
  for (const e of edges) {
    if (e.to === nodeId) count++;
    if (e.direction === "mutual" && e.from === nodeId) count++;
    if (e.direction === "undirected" && e.from === nodeId) count++;
  }
  return count;
}

function computeOutDegree(nodeId: string, edges: SociogramEdge[]): number {
  let count = 0;
  for (const e of edges) {
    if (e.from === nodeId) count++;
    if (e.direction === "mutual" && e.to === nodeId) count++;
    if (e.direction === "undirected" && e.to === nodeId) count++;
  }
  return count;
}

function autoDetectRole(
  node: SociogramNode,
  inDeg: number,
  outDeg: number,
  meanIn: number,
  sdIn: number,
  rejectionCount: number
): NodeRole | undefined {
  if (node.role) return node.role;
  if (inDeg === 0 && outDeg === 0) return "isolate";
  if (inDeg === 0 && outDeg > 0) return "neglectee";
  if (rejectionCount >= 2) return "rejected";
  if (sdIn > 0 && inDeg >= meanIn + 1.5 * sdIn) return "star";
  return undefined;
}

// ─── Node Radius ────────────────────────────────────────────

const BASE_RADIUS = 20;

function computeNodeRadius(
  node: SociogramNode,
  inDeg: number,
  sizing: string
): number {
  if (node.size === "small") return 14;
  if (node.size === "large") return 30;
  if (sizing === "in-degree") {
    return Math.min(40, Math.max(14, 14 + inDeg * 4));
  }
  return BASE_RADIUS;
}

// ─── Circular Layout ────────────────────────────────────────

function layoutCircular(ast: SociogramAST): SociogramLayoutResult {
  const n = ast.nodes.length;
  const radius = Math.max(120, n * 22);
  const canvasSize = radius * 2 + 160;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;

  // Compute metrics
  const inDegrees = new Map<string, number>();
  const outDegrees = new Map<string, number>();
  const rejections = new Map<string, number>();

  for (const node of ast.nodes) {
    inDegrees.set(node.id, computeInDegree(node.id, ast.edges));
    outDegrees.set(node.id, computeOutDegree(node.id, ast.edges));
    rejections.set(node.id, 0);
  }

  for (const e of ast.edges) {
    if (e.valence === "negative") {
      rejections.set(e.to, (rejections.get(e.to) ?? 0) + 1);
    }
  }

  const inVals = Array.from(inDegrees.values());
  const meanIn = inVals.reduce((a, b) => a + b, 0) / (inVals.length || 1);
  const sdIn = Math.sqrt(
    inVals.reduce((sum, v) => sum + (v - meanIn) ** 2, 0) / (inVals.length || 1)
  );

  // Sort nodes: group members adjacent, then by id
  const sortedNodes = [...ast.nodes];
  if (ast.groups.length > 0) {
    const groupOrder = new Map<string, number>();
    ast.groups.forEach((g, i) => {
      for (const m of g.members) groupOrder.set(m, i);
    });
    sortedNodes.sort((a, b) => {
      const ga = groupOrder.get(a.id) ?? 999;
      const gb = groupOrder.get(b.id) ?? 999;
      if (ga !== gb) return ga - gb;
      return a.id.localeCompare(b.id);
    });
  }

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const layoutNodes: SociogramLayoutNode[] = sortedNodes.map((node, i) => {
    const angle = startAngle + i * angleStep;
    const inDeg = inDegrees.get(node.id) ?? 0;
    const outDeg = outDegrees.get(node.id) ?? 0;
    const rej = rejections.get(node.id) ?? 0;
    const nodeRadius = computeNodeRadius(node, inDeg, ast.config.sizing);
    const computedRole = autoDetectRole(node, inDeg, outDeg, meanIn, sdIn, rej);

    return {
      node,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      radius: nodeRadius,
      computedRole,
    };
  });

  const layoutEdges = computeEdgePositions(layoutNodes, ast.edges);

  return {
    width: canvasSize,
    height: canvasSize,
    nodes: layoutNodes,
    edges: layoutEdges,
    ast,
  };
}

// ─── Force-Directed Layout ─────────────────────────────────

function layoutForceDirected(ast: SociogramAST): SociogramLayoutResult {
  const n = ast.nodes.length;
  const canvasSize = n <= 8 ? 400 : n <= 20 ? 600 : n <= 40 ? 800 : 1000;
  const padding = 60;

  // Compute metrics
  const inDegrees = new Map<string, number>();
  const outDegrees = new Map<string, number>();
  const rejections = new Map<string, number>();

  for (const node of ast.nodes) {
    inDegrees.set(node.id, computeInDegree(node.id, ast.edges));
    outDegrees.set(node.id, computeOutDegree(node.id, ast.edges));
    rejections.set(node.id, 0);
  }

  for (const e of ast.edges) {
    if (e.valence === "negative") {
      rejections.set(e.to, (rejections.get(e.to) ?? 0) + 1);
    }
  }

  const inVals = Array.from(inDegrees.values());
  const meanIn = inVals.reduce((a, b) => a + b, 0) / (inVals.length || 1);
  const sdIn = Math.sqrt(
    inVals.reduce((sum, v) => sum + (v - meanIn) ** 2, 0) / (inVals.length || 1)
  );

  // Initialize positions in a circle
  const initRadius = canvasSize * 0.3;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;

  const positions: { x: number; y: number }[] = ast.nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      x: cx + initRadius * Math.cos(angle),
      y: cy + initRadius * Math.sin(angle),
    };
  });

  // Build adjacency for edges
  const nodeIdx = new Map<string, number>();
  ast.nodes.forEach((node, i) => nodeIdx.set(node.id, i));

  // Fruchterman-Reingold
  const area = (canvasSize - 2 * padding) ** 2;
  const k = Math.sqrt(area / Math.max(n, 1));
  const maxIterations = 200;
  let temperature = canvasSize / 8;
  const coolingRate = 0.95;
  const minDist = 60;

  for (let iter = 0; iter < maxIterations; iter++) {
    const disp: { dx: number; dy: number }[] = positions.map(() => ({ dx: 0, dy: 0 }));

    // Repulsive forces between all pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[i].dx += fx;
        disp[i].dy += fy;
        disp[j].dx -= fx;
        disp[j].dy -= fy;
      }
    }

    // Attractive forces along edges
    for (const edge of ast.edges) {
      const i = nodeIdx.get(edge.from);
      const j = nodeIdx.get(edge.to);
      if (i === undefined || j === undefined) continue;
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      disp[i].dx -= fx;
      disp[i].dy -= fy;
      disp[j].dx += fx;
      disp[j].dy += fy;
    }

    // Apply displacements, clamp to temperature
    for (let i = 0; i < n; i++) {
      const mag = Math.sqrt(disp[i].dx ** 2 + disp[i].dy ** 2);
      if (mag > 0) {
        const scale = Math.min(mag, temperature) / mag;
        positions[i].x += disp[i].dx * scale;
        positions[i].y += disp[i].dy * scale;
      }
      // Keep within bounds
      positions[i].x = Math.max(padding, Math.min(canvasSize - padding, positions[i].x));
      positions[i].y = Math.max(padding, Math.min(canvasSize - padding, positions[i].y));
    }

    // Enforce minimum distance
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist > 0) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          positions[i].x += nx * push;
          positions[i].y += ny * push;
          positions[j].x -= nx * push;
          positions[j].y -= ny * push;
        }
      }
    }

    temperature *= coolingRate;
  }

  const layoutNodes: SociogramLayoutNode[] = ast.nodes.map((node, i) => {
    const inDeg = inDegrees.get(node.id) ?? 0;
    const outDeg = outDegrees.get(node.id) ?? 0;
    const rej = rejections.get(node.id) ?? 0;
    const nodeRadius = computeNodeRadius(node, inDeg, ast.config.sizing);
    const computedRole = autoDetectRole(node, inDeg, outDeg, meanIn, sdIn, rej);
    return {
      node,
      x: positions[i].x,
      y: positions[i].y,
      radius: nodeRadius,
      computedRole,
    };
  });

  const layoutEdges = computeEdgePositions(layoutNodes, ast.edges);

  return {
    width: canvasSize,
    height: canvasSize,
    nodes: layoutNodes,
    edges: layoutEdges,
    ast,
  };
}

// ─── Edge Position Calculation ──────────────────────────────

function computeEdgePositions(
  nodes: SociogramLayoutNode[],
  edges: SociogramEdge[]
): SociogramLayoutEdge[] {
  const nodeMap = new Map<string, SociogramLayoutNode>();
  for (const n of nodes) nodeMap.set(n.node.id, n);

  return edges.map((edge) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) {
      return { edge, x1: 0, y1: 0, x2: 0, y2: 0 };
    }

    // Compute edge-to-edge (subtract radius from endpoints)
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { edge, x1: fromNode.x, y1: fromNode.y, x2: toNode.x, y2: toNode.y };

    const nx = dx / dist;
    const ny = dy / dist;
    const markerGap = 10;

    return {
      edge,
      x1: fromNode.x + nx * (fromNode.radius + 2),
      y1: fromNode.y + ny * (fromNode.radius + 2),
      x2: toNode.x - nx * (toNode.radius + markerGap),
      y2: toNode.y - ny * (toNode.radius + markerGap),
    };
  });
}

// ─── Main Layout ────────────────────────────────────────────

export function layoutSociogram(ast: SociogramAST): SociogramLayoutResult {
  switch (ast.config.layout) {
    case "force-directed":
      return layoutForceDirected(ast);
    case "circular":
    default:
      return layoutCircular(ast);
  }
}
