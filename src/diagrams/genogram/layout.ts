import type {
  DiagramAST,
  Individual,
  Relationship,
  RelationshipType,
  LayoutConfig,
  LayoutResult,
  LayoutNode,
  LayoutEdge,
} from "../../core/types";

// ─── Internal types ─────────────────────────────────────────

interface FamilyUnit {
  id: string;
  partners: [string, string];
  relationship: RelationshipType;
  label?: string;
  children: string[];
}

interface LayoutGraph {
  individuals: Map<string, Individual>;
  familyUnits: FamilyUnit[];
  generations: Map<string, number>;
  childOf: Map<string, string>; // childId → familyUnitId
}

// ─── Public API ─────────────────────────────────────────────

export function layoutGenogram(
  ast: DiagramAST,
  config: LayoutConfig
): LayoutResult {
  const graph = buildGraph(ast);
  assignGenerations(graph);
  const ordered = orderNodesInGenerations(graph, config);
  const positions = assignPositions(ordered, graph, config);
  const edges = computeEdges(graph, positions, config);
  const emotionalEdges = computeEmotionalEdges(ast.relationships, positions, config);
  return packageResult(positions, [...edges, ...emotionalEdges], graph, config);
}

// ─── Step 1: Build graph ────────────────────────────────────

function buildGraph(ast: DiagramAST): LayoutGraph {
  const individuals = new Map<string, Individual>();
  for (const ind of ast.individuals) {
    individuals.set(ind.id, ind);
  }

  const familyUnits: FamilyUnit[] = [];
  const childOf = new Map<string, string>();

  // Collect couple relationships and their children
  const coupleRels = ast.relationships.filter(
    (r) =>
      r.type === "married" ||
      r.type === "divorced" ||
      r.type === "separated" ||
      r.type === "engaged" ||
      r.type === "cohabiting" ||
      r.type === "consanguineous"
  );

  for (const rel of coupleRels) {
    const fuId = `${rel.from}+${rel.to}`;

    // Order partners: male left, female right
    const indA = individuals.get(rel.from);
    const indB = individuals.get(rel.to);
    let partners: [string, string];

    if (indA && indB) {
      if (indA.sex === "male" && indB.sex === "female") {
        partners = [rel.from, rel.to];
      } else if (indA.sex === "female" && indB.sex === "male") {
        partners = [rel.to, rel.from];
      } else {
        // Same sex or unknown: older left
        const yearA = indA.birthYear ?? 9999;
        const yearB = indB.birthYear ?? 9999;
        partners = yearA <= yearB ? [rel.from, rel.to] : [rel.to, rel.from];
      }
    } else {
      partners = [rel.from, rel.to];
    }

    // Find children for this family unit
    const children: string[] = [];
    for (const r of ast.relationships) {
      if (
        (r.type === "parent-child" ||
          r.type === "adopted" ||
          r.type === "foster") &&
        r.from === fuId
      ) {
        children.push(r.to);
        childOf.set(r.to, fuId);
      }
    }

    // Sort children by birth year
    children.sort((a, b) => {
      const indChildA = individuals.get(a);
      const indChildB = individuals.get(b);
      return (indChildA?.birthYear ?? 9999) - (indChildB?.birthYear ?? 9999);
    });

    familyUnits.push({
      id: fuId,
      partners,
      relationship: rel.type,
      label: rel.label,
      children,
    });
  }

  return { individuals, familyUnits, generations: new Map(), childOf };
}

// ─── Step 2: Assign generations ─────────────────────────────

function assignGenerations(graph: LayoutGraph): void {
  const { individuals, familyUnits, childOf, generations } = graph;

  // Find roots: individuals not a child of any family unit
  const allIds = Array.from(individuals.keys());
  const roots = allIds.filter((id) => !childOf.has(id));

  if (roots.length === 0 && allIds.length > 0) {
    // Fallback: everyone is generation 0
    for (const id of allIds) generations.set(id, 0);
    return;
  }

  // BFS from roots
  for (const root of roots) {
    if (!generations.has(root)) {
      generations.set(root, 0);
    }
  }

  // Propagate through family units
  let changed = true;
  while (changed) {
    changed = false;
    for (const fu of familyUnits) {
      // Ensure partners are same generation
      const gen0 = generations.get(fu.partners[0]);
      const gen1 = generations.get(fu.partners[1]);

      let partnerGen: number;
      if (gen0 !== undefined && gen1 !== undefined) {
        partnerGen = Math.max(gen0, gen1);
        if (gen0 !== partnerGen) {
          generations.set(fu.partners[0], partnerGen);
          changed = true;
        }
        if (gen1 !== partnerGen) {
          generations.set(fu.partners[1], partnerGen);
          changed = true;
        }
      } else if (gen0 !== undefined) {
        partnerGen = gen0;
        generations.set(fu.partners[1], partnerGen);
        changed = true;
      } else if (gen1 !== undefined) {
        partnerGen = gen1;
        generations.set(fu.partners[0], partnerGen);
        changed = true;
      } else {
        continue;
      }

      // Children are one generation below
      for (const childId of fu.children) {
        const childGen = partnerGen + 1;
        const existing = generations.get(childId);
        if (existing === undefined || existing < childGen) {
          generations.set(childId, childGen);
          changed = true;
        }
      }
    }
  }

  // Assign any remaining unvisited individuals to generation 0
  for (const id of allIds) {
    if (!generations.has(id)) {
      generations.set(id, 0);
    }
  }
}

// ─── Step 3: Order nodes within generations ─────────────────

interface OrderedGeneration {
  index: number;
  nodeIds: string[];
}

function orderNodesInGenerations(
  graph: LayoutGraph,
  _config: LayoutConfig
): OrderedGeneration[] {
  const { generations, familyUnits } = graph;

  // Group by generation
  const genGroups = new Map<number, string[]>();
  for (const [id, gen] of generations) {
    const group = genGroups.get(gen) ?? [];
    group.push(id);
    genGroups.set(gen, group);
  }

  const genIndices = Array.from(genGroups.keys()).sort((a, b) => a - b);
  const result: OrderedGeneration[] = [];

  for (const genIdx of genIndices) {
    const nodeIds = genGroups.get(genIdx) ?? [];

    // Build ordering based on family unit structure
    const ordered = orderGeneration(nodeIds, genIdx, graph, familyUnits);
    result.push({ index: genIdx, nodeIds: ordered });
  }

  return result;
}

function orderGeneration(
  nodeIds: string[],
  _genIdx: number,
  graph: LayoutGraph,
  familyUnits: FamilyUnit[]
): string[] {
  if (nodeIds.length <= 1) return [...nodeIds];

  const nodeSet = new Set(nodeIds);
  const placed = new Set<string>();
  const ordered: string[] = [];

  const fuInGen = familyUnits.filter(
    (fu) => nodeSet.has(fu.partners[0]) || nodeSet.has(fu.partners[1])
  );

  // Build adjacency: which family units does each person belong to?
  const personToFUs = new Map<string, FamilyUnit[]>();
  for (const fu of fuInGen) {
    for (const p of fu.partners) {
      if (nodeSet.has(p)) {
        const arr = personToFUs.get(p) ?? [];
        arr.push(fu);
        personToFUs.set(p, arr);
      }
    }
  }

  // Place a person and recursively expand their family units
  function placePersonAndExpand(id: string): void {
    if (placed.has(id)) return;
    ordered.push(id);
    placed.add(id);

    // Expand all family units this person is in
    const fus = personToFUs.get(id) ?? [];
    // Sort: divorced/separated first (left side), current marriage last (right)
    const sortedFUs = [...fus].sort((a, b) => {
      const scoreA = a.relationship === "divorced" || a.relationship === "separated" ? 0 : 1;
      const scoreB = b.relationship === "divorced" || b.relationship === "separated" ? 0 : 1;
      return scoreA - scoreB;
    });

    for (const fu of sortedFUs) {
      const partner = fu.partners[0] === id ? fu.partners[1] : fu.partners[0];
      if (!placed.has(partner) && nodeSet.has(partner)) {
        ordered.push(partner);
        placed.add(partner);
        // Recursively expand partner's other relationships
        const partnerFUs = personToFUs.get(partner) ?? [];
        for (const pfu of partnerFUs) {
          if (pfu.id !== fu.id) {
            const otherPartner = pfu.partners[0] === partner ? pfu.partners[1] : pfu.partners[0];
            placePersonAndExpand(otherPartner);
          }
        }
      }
    }
  }

  // Start by processing family units — expand connected clusters
  for (const fu of fuInGen) {
    if (!placed.has(fu.partners[0]) && nodeSet.has(fu.partners[0])) {
      placePersonAndExpand(fu.partners[0]);
    }
    if (!placed.has(fu.partners[1]) && nodeSet.has(fu.partners[1])) {
      placePersonAndExpand(fu.partners[1]);
    }
  }

  // Place remaining unpartnered individuals (sorted by birth year)
  const remaining = nodeIds.filter((id) => !placed.has(id));
  remaining.sort((a, b) => {
    const indA = graph.individuals.get(a);
    const indB = graph.individuals.get(b);
    return (indA?.birthYear ?? 9999) - (indB?.birthYear ?? 9999);
  });
  for (const id of remaining) {
    ordered.push(id);
    placed.add(id);
  }

  return ordered;
}

// ─── Step 4 & 5: Assign X/Y positions ──────────────────────

interface NodePosition {
  id: string;
  x: number;
  y: number;
  generation: number;
}

const LABEL_HEIGHT = 20;
const LABEL_GAP = 6;

function assignPositions(
  orderedGens: OrderedGeneration[],
  graph: LayoutGraph,
  config: LayoutConfig
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const { nodeWidth, nodeSpacingX } = config;
  const half = nodeWidth / 2;
  // Couple gap = space between two partner centers (node edge to edge + line)
  const coupleGap = nodeWidth + nodeSpacingX * 0.6;
  // Family gap = space between separate family units
  const familyGap = nodeWidth + nodeSpacingX * 1.5;
  // Generation Y spacing = node height + label space + vertical gap
  const genStepY = config.nodeHeight + LABEL_HEIGHT + LABEL_GAP + config.nodeSpacingY;

  // Pass 1: Initial placement based on generation ordering
  for (const gen of orderedGens) {
    const y = gen.index * genStepY + half;
    const segments = buildSegments(gen.nodeIds, gen.index, graph);

    let xCursor = half;
    for (let s = 0; s < segments.length; s++) {
      const seg = segments[s];
      if (s > 0) xCursor += familyGap;

      if (seg.type === "couple") {
        positions.set(seg.ids[0], { id: seg.ids[0], x: xCursor, y, generation: gen.index });
        xCursor += coupleGap;
        positions.set(seg.ids[1], { id: seg.ids[1], x: xCursor, y, generation: gen.index });
      } else {
        positions.set(seg.ids[0], { id: seg.ids[0], x: xCursor, y, generation: gen.index });
      }
    }
  }

  // Pass 2: Resolve overlaps (before centering, so centering uses final positions)
  resolveOverlaps(positions, orderedGens, config);

  // Pass 3: Center children under parents (and drag partners)
  centerChildrenUnderParents(positions, graph, config);

  // Pass 4: Resolve any new overlaps introduced by centering
  resolveOverlaps(positions, orderedGens, config);

  return positions;
}

interface Segment {
  type: "couple" | "single";
  ids: string[];
  fuId?: string;
}

function buildSegments(
  nodeIds: string[],
  _genIdx: number,
  graph: LayoutGraph
): Segment[] {
  const nodeSet = new Set(nodeIds);

  // Find multi-married individuals first
  const personFUs = new Map<string, FamilyUnit[]>();
  for (const fu of graph.familyUnits) {
    if (nodeSet.has(fu.partners[0]) && nodeSet.has(fu.partners[1])) {
      for (const p of fu.partners) {
        const arr = personFUs.get(p) ?? [];
        arr.push(fu);
        personFUs.set(p, arr);
      }
    }
  }

  const multiMarried = new Set<string>();
  for (const [id, fus] of personFUs) {
    if (fus.length > 1) multiMarried.add(id);
  }

  const segments: Segment[] = [];
  const placed = new Set<string>();

  for (const id of nodeIds) {
    if (placed.has(id)) continue;

    // Multi-married: place as couple chain (ex-partner, SHARED, current-partner)
    if (multiMarried.has(id)) {
      const fus = personFUs.get(id) ?? [];
      const sorted = [...fus].sort((a, b) => {
        const sa = a.relationship === "divorced" || a.relationship === "separated" ? 0 : 1;
        const sb = b.relationship === "divorced" || b.relationship === "separated" ? 0 : 1;
        return sa - sb;
      });

      for (const fu of sorted) {
        const partner = fu.partners[0] === id ? fu.partners[1] : fu.partners[0];
        if (!placed.has(partner)) {
          // For first (ex) partner: place partner first, then shared person
          // For subsequent partners: shared already placed, place partner after
          if (!placed.has(id)) {
            segments.push({ type: "couple", ids: [partner, id], fuId: fu.id });
            placed.add(partner);
            placed.add(id);
          } else {
            segments.push({ type: "couple", ids: [id, partner], fuId: fu.id });
            placed.add(partner);
          }
        }
      }
      if (!placed.has(id)) {
        segments.push({ type: "single", ids: [id] });
        placed.add(id);
      }
      continue;
    }

    // Regular: check if part of a couple
    const fu = graph.familyUnits.find(
      (f) =>
        (f.partners[0] === id || f.partners[1] === id) &&
        !placed.has(f.partners[0]) &&
        !placed.has(f.partners[1]) &&
        nodeSet.has(f.partners[0]) &&
        nodeSet.has(f.partners[1])
    );

    if (fu) {
      segments.push({
        type: "couple",
        ids: [fu.partners[0], fu.partners[1]],
        fuId: fu.id,
      });
      placed.add(fu.partners[0]);
      placed.add(fu.partners[1]);
    } else {
      segments.push({ type: "single", ids: [id] });
      placed.add(id);
    }
  }

  return segments;
}

function centerChildrenUnderParents(
  positions: Map<string, NodePosition>,
  graph: LayoutGraph,
  config: LayoutConfig
): void {
  const coupleGap = config.nodeSpacingX + config.nodeWidth;

  // Build a lookup: personId → family units they're a partner in
  const personToFUs = new Map<string, FamilyUnit[]>();
  for (const fu of graph.familyUnits) {
    for (const p of fu.partners) {
      const arr = personToFUs.get(p) ?? [];
      arr.push(fu);
      personToFUs.set(p, arr);
    }
  }

  // Multiple passes to propagate constraints
  for (let pass = 0; pass < 3; pass++) {
    for (const fu of graph.familyUnits) {
      if (fu.children.length === 0) continue;

      const posA = positions.get(fu.partners[0]);
      const posB = positions.get(fu.partners[1]);
      if (!posA || !posB) continue;

      const parentMidX = (posA.x + posB.x) / 2;

      // Re-space children evenly under parent midpoint
      const sortedChildren = [...fu.children].sort((a, b) => {
        const indA = graph.individuals.get(a);
        const indB = graph.individuals.get(b);
        return (indA?.birthYear ?? 9999) - (indB?.birthYear ?? 9999);
      });

      const childSpacing = config.nodeSpacingX + config.nodeWidth;
      if (sortedChildren.length > 1) {
        // Calculate per-gap spacing: add room for married-in spouses
        const gaps: number[] = [];
        for (let gi = 0; gi < sortedChildren.length - 1; gi++) {
          let gap = childSpacing;

          // If the RIGHT child has a spouse placed to their LEFT
          const nextChild = sortedChildren[gi + 1];
          const nextFUs = personToFUs.get(nextChild) ?? [];
          for (const cfu of nextFUs) {
            const pid = cfu.partners[0] === nextChild ? cfu.partners[1] : cfu.partners[0];
            const cInd = graph.individuals.get(nextChild);
            const pInd = graph.individuals.get(pid);
            if (!(cInd?.sex === "male" || (cInd?.sex !== "female" && pInd?.sex === "female"))) {
              gap += coupleGap;
            }
          }

          // If the LEFT child has a spouse placed to their RIGHT
          const currChild = sortedChildren[gi];
          const currFUs = personToFUs.get(currChild) ?? [];
          for (const cfu of currFUs) {
            const pid = cfu.partners[0] === currChild ? cfu.partners[1] : cfu.partners[0];
            const cInd = graph.individuals.get(currChild);
            const pInd = graph.individuals.get(pid);
            if (cInd?.sex === "male" || (cInd?.sex !== "female" && pInd?.sex === "female")) {
              gap += coupleGap;
            }
          }

          gaps.push(gap);
        }

        const totalWidth = gaps.reduce((s, g) => s + g, 0);
        const startX = parentMidX - totalWidth / 2;
        let cx = startX;
        for (let i = 0; i < sortedChildren.length; i++) {
          const pos = positions.get(sortedChildren[i]);
          if (pos) pos.x = cx;
          if (i < gaps.length) cx += gaps[i];
        }
      } else {
        const pos = positions.get(sortedChildren[0]);
        if (pos) pos.x = parentMidX;
      }

      // After placing children, if any child is also a partner in another
      // couple, drag that partner along to maintain couple gap
      for (const childId of fu.children) {
        const childPos = positions.get(childId);
        if (!childPos) continue;
        const childFUs = personToFUs.get(childId) ?? [];
        for (const childFU of childFUs) {
          const partnerId =
            childFU.partners[0] === childId
              ? childFU.partners[1]
              : childFU.partners[0];
          const partnerPos = positions.get(partnerId);
          if (!partnerPos) continue;
          // Keep partner at couple gap distance, on the correct side
          const childInd = graph.individuals.get(childId);
          const partnerInd = graph.individuals.get(partnerId);
          if (childInd?.sex === "male" || (childInd?.sex !== "female" && partnerInd?.sex === "female")) {
            partnerPos.x = childPos.x + coupleGap;
          } else {
            partnerPos.x = childPos.x - coupleGap;
          }
        }
      }
    }
  }
}

function resolveOverlaps(
  positions: Map<string, NodePosition>,
  orderedGens: OrderedGeneration[],
  config: LayoutConfig
): void {
  const minGap = config.nodeWidth + config.nodeSpacingX;

  for (const gen of orderedGens) {
    const genNodes = gen.nodeIds
      .map((id) => positions.get(id))
      .filter((p): p is NodePosition => p !== undefined);

    genNodes.sort((a, b) => a.x - b.x);

    for (let i = 1; i < genNodes.length; i++) {
      const gap = genNodes[i].x - genNodes[i - 1].x;
      if (gap < minGap) {
        const shift = minGap - gap;
        // Push this and all subsequent nodes right
        for (let j = i; j < genNodes.length; j++) {
          genNodes[j].x += shift;
        }
      }
    }
  }

  // Ensure no negative x positions
  let minX = Infinity;
  for (const pos of positions.values()) {
    if (pos.x < minX) minX = pos.x;
  }
  if (minX < config.nodeWidth / 2) {
    const shift = config.nodeWidth / 2 - minX;
    for (const pos of positions.values()) {
      pos.x += shift;
    }
  }
}

// ─── Step 6: Compute edge paths ─────────────────────────────

function computeEdges(
  graph: LayoutGraph,
  positions: Map<string, NodePosition>,
  config: LayoutConfig
): LayoutEdge[] {
  const edges: LayoutEdge[] = [];
  const half = config.nodeWidth / 2;
  const dropY_offset = config.nodeHeight / 2 + LABEL_HEIGHT + LABEL_GAP + config.nodeSpacingY * 0.35;

  for (const fu of graph.familyUnits) {
    const posA = positions.get(fu.partners[0]);
    const posB = positions.get(fu.partners[1]);
    if (!posA || !posB) continue;

    const leftPos = posA.x < posB.x ? posA : posB;
    const rightPos = posA.x < posB.x ? posB : posA;
    const leftId = posA.x < posB.x ? fu.partners[0] : fu.partners[1];
    const rightId = posA.x < posB.x ? fu.partners[1] : fu.partners[0];

    // Couple line: edge-to-edge
    const coupleRel: Relationship = {
      type: fu.relationship,
      from: leftId,
      to: rightId,
      label: fu.label,
    };
    const couplePath = `M ${leftPos.x + half} ${leftPos.y} L ${rightPos.x - half} ${rightPos.y}`;
    edges.push({
      from: leftId,
      to: rightId,
      relationship: coupleRel,
      path: couplePath,
    });

    // Parent-child connections
    if (fu.children.length > 0) {
      const midX = (posA.x + posB.x) / 2;
      const coupleY = posA.y;
      const dropY = coupleY + dropY_offset;

      const childPositions = fu.children
        .map((cid) => ({
          id: cid,
          pos: positions.get(cid),
        }))
        .filter(
          (c): c is { id: string; pos: NodePosition } => c.pos !== undefined
        );

      if (childPositions.length === 0) continue;

      childPositions.sort((a, b) => a.pos.x - b.pos.x);

      const leftX = childPositions[0].pos.x;
      const rightX = childPositions[childPositions.length - 1].pos.x;

      // Drop line from couple midpoint
      const dropPath = `M ${midX} ${coupleY} L ${midX} ${dropY}`;
      edges.push({
        from: fu.partners[0],
        to: fu.partners[1],
        relationship: { type: "parent-child", from: fu.id, to: "_drop" },
        path: dropPath,
      });

      // Sibship line (horizontal). Extend to include midX so the parent
      // drop line always lands on the bar — needed when a child is also a
      // partner in another union and gets pulled outside the [leftX, rightX]
      // range of their siblings.
      if (childPositions.length > 1) {
        const sibLeft = Math.min(leftX, midX);
        const sibRight = Math.max(rightX, midX);
        const sibPath = `M ${sibLeft} ${dropY} L ${sibRight} ${dropY}`;
        edges.push({
          from: fu.partners[0],
          to: fu.partners[1],
          relationship: { type: "parent-child", from: fu.id, to: "_sibship" },
          path: sibPath,
        });
      }

      // Vertical lines from sibship to each child
      for (const child of childPositions) {
        const childTop = child.pos.y - config.nodeHeight / 2;
        let childPath: string;
        if (childPositions.length === 1) {
          if (Math.abs(child.pos.x - midX) < 1) {
            childPath = `M ${midX} ${coupleY} L ${midX} ${childTop}`;
          } else {
            childPath = `M ${midX} ${dropY} L ${child.pos.x} ${dropY} L ${child.pos.x} ${childTop}`;
          }
        } else {
          childPath = `M ${child.pos.x} ${dropY} L ${child.pos.x} ${childTop}`;
        }

        const pcRel = findParentChildRel(graph, fu.id, child.id);
        edges.push({
          from: fu.id,
          to: child.id,
          relationship: pcRel ?? {
            type: "parent-child",
            from: fu.id,
            to: child.id,
          },
          path: childPath,
        });
      }
    }
  }

  return edges;
}

function findParentChildRel(
  graph: LayoutGraph,
  _fuId: string,
  childId: string
): Relationship | undefined {
  // Find from original family unit mapping
  const fuId = graph.childOf.get(childId);
  if (!fuId) return undefined;
  return {
    type: "parent-child",
    from: fuId,
    to: childId,
  };
}

// ─── Step 7: Package result ─────────────────────────────────

function packageResult(
  positions: Map<string, NodePosition>,
  edges: LayoutEdge[],
  graph: LayoutGraph,
  config: LayoutConfig
): LayoutResult {
  const padding = 40;
  const nodes: LayoutNode[] = [];

  for (const [id, pos] of positions) {
    const ind = graph.individuals.get(id);
    if (!ind) continue;

    nodes.push({
      id,
      x: pos.x - config.nodeWidth / 2 + padding,
      y: pos.y - config.nodeHeight / 2 + padding,
      width: config.nodeWidth,
      height: config.nodeHeight,
      generation: pos.generation,
      individual: ind,
    });
  }

  // Shift edges by padding
  const shiftedEdges = edges.map((e) => ({
    ...e,
    path: shiftPath(e.path, padding, padding),
  }));

  let maxX = 0;
  let maxY = 0;
  let minX = Infinity;
  for (const node of nodes) {
    const cx = node.x + node.width / 2;
    const labelText = estimateLabelText(node.individual);
    const labelHalfWidth = labelText.length * 3.8;
    const right = Math.max(node.x + node.width, cx + labelHalfWidth);
    const left = Math.min(node.x, cx - labelHalfWidth);
    const bottom = node.y + node.height;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
    if (left < minX) minX = left;
  }

  // If labels extend beyond left edge, shift everything right
  if (minX < 0) {
    const shift = -minX;
    for (const node of nodes) {
      node.x += shift;
    }
    for (const edge of shiftedEdges) {
      edge.path = shiftPath(edge.path, shift, 0);
    }
    maxX += shift;
  }

  return {
    width: maxX + padding,
    height: maxY + padding + LABEL_GAP + LABEL_HEIGHT + 10,
    nodes,
    edges: shiftedEdges,
  };
}

function estimateLabelText(ind: Individual): string {
  const name = ind.label || ind.id;
  if (ind.birthYear && ind.deathYear) return `${name} (${ind.birthYear}–${ind.deathYear})`;
  if (ind.birthYear) return `${name} (b. ${ind.birthYear})`;
  return name;
}

// ─── Emotional relationship edges ───────────────────────────

const EMOTIONAL_REL_TYPES = new Set([
  "harmony", "close", "bestfriends", "love", "inlove", "friendship",
  "hostile", "conflict", "enmity", "distant-hostile", "cutoff",
  "close-hostile", "fused", "fused-hostile",
  "distant", "normal", "nevermet",
  "abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect",
  "manipulative", "controlling", "jealous",
  "focused", "focused-neg", "distrust", "admirer", "limerence",
]);

function computeEmotionalEdges(
  relationships: Relationship[],
  positions: Map<string, NodePosition>,
  config: LayoutConfig
): LayoutEdge[] {
  const edges: LayoutEdge[] = [];
  const half = config.nodeWidth / 2;

  const emotionalRels = relationships.filter(r => EMOTIONAL_REL_TYPES.has(r.type));

  for (const rel of emotionalRels) {
    const posA = positions.get(rel.from);
    const posB = positions.get(rel.to);
    if (!posA || !posB) continue;

    // Use raw positions (no padding) — packageResult will shift
    const ax = posA.x;
    const ay = posA.y;
    const bx = posB.x;
    const by = posB.y;

    let pathData: string;

    if (posA.generation === posB.generation) {
      // Same generation: curved path below nodes
      const midX = (ax + bx) / 2;
      const curveY = ay + half + 30;
      pathData = `M ${ax} ${ay + half} Q ${midX} ${curveY} ${bx} ${by + half}`;
    } else {
      // Cross-generation: curved path to the side
      const midY = (ay + by) / 2;
      const maxX = Math.max(ax, bx);
      const curveX = maxX + half + 30;
      pathData = `M ${ax} ${ay} Q ${curveX} ${midY} ${bx} ${by}`;
    }

    edges.push({
      from: rel.from,
      to: rel.to,
      relationship: rel,
      path: pathData,
    });
  }

  return edges;
}

function shiftPath(pathData: string, dx: number, dy: number): string {
  // Shift all coordinate pairs in the path
  return pathData.replace(
    /([\d.-]+)\s+([\d.-]+)/g,
    (_match, xStr: string, yStr: string) => {
      const x = parseFloat(xStr) + dx;
      const y = parseFloat(yStr) + dy;
      return `${x} ${y}`;
    }
  );
}
