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
  children: string[];
}

interface LayoutGraph {
  individuals: Map<string, Individual>;
  familyUnits: FamilyUnit[];
  generations: Map<string, number>;
  childOf: Map<string, string>;
}

// ─── Constants ─────────────────────────────────────────────

const LABEL_HEIGHT = 20;
const LABEL_GAP = 6;
const GEN_LABEL_MARGIN = 50;

// ─── Public API ─────────────────────────────────────────────

export function layoutPedigree(
  ast: DiagramAST,
  config: LayoutConfig
): LayoutResult {
  const graph = buildGraph(ast);
  assignGenerations(graph);
  const ordered = orderNodesInGenerations(graph);
  const positions = assignPositions(ordered, graph, config);
  const edges = computeEdges(graph, positions, config);
  return packageResult(positions, edges, graph, config);
}

// ─── Step 1: Build graph ────────────────────────────────────

function buildGraph(ast: DiagramAST): LayoutGraph {
  const individuals = new Map<string, Individual>();
  for (const ind of ast.individuals) individuals.set(ind.id, ind);

  const familyUnits: FamilyUnit[] = [];
  const childOf = new Map<string, string>();

  const coupleRels = ast.relationships.filter(
    (r) => r.type === "married" || r.type === "separated" ||
           r.type === "consanguineous" || r.type === "cohabiting"
  );

  for (const rel of coupleRels) {
    const fuId = `${rel.from}+${rel.to}`;
    const indA = individuals.get(rel.from);
    const indB = individuals.get(rel.to);

    let partners: [string, string];
    if (indA && indB) {
      if (indA.sex === "male" && indB.sex === "female") {
        partners = [rel.from, rel.to];
      } else if (indA.sex === "female" && indB.sex === "male") {
        partners = [rel.to, rel.from];
      } else {
        partners = [rel.from, rel.to];
      }
    } else {
      partners = [rel.from, rel.to];
    }

    const children: string[] = [];
    for (const r of ast.relationships) {
      if (r.type === "parent-child" && r.from === fuId) {
        children.push(r.to);
        childOf.set(r.to, fuId);
      }
    }

    children.sort((a, b) => {
      const ia = individuals.get(a);
      const ib = individuals.get(b);
      return (ia?.birthYear ?? 9999) - (ib?.birthYear ?? 9999);
    });

    familyUnits.push({ id: fuId, partners, relationship: rel.type, children });
  }

  return { individuals, familyUnits, generations: new Map(), childOf };
}

// ─── Step 2: Assign generations ─────────────────────────────

function assignGenerations(graph: LayoutGraph): void {
  const { individuals, familyUnits, childOf, generations } = graph;
  const allIds = Array.from(individuals.keys());
  const roots = allIds.filter((id) => !childOf.has(id));

  if (roots.length === 0 && allIds.length > 0) {
    for (const id of allIds) generations.set(id, 0);
    return;
  }

  for (const root of roots) {
    if (!generations.has(root)) generations.set(root, 0);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const fu of familyUnits) {
      const gen0 = generations.get(fu.partners[0]);
      const gen1 = generations.get(fu.partners[1]);

      let partnerGen: number;
      if (gen0 !== undefined && gen1 !== undefined) {
        partnerGen = Math.max(gen0, gen1);
        if (gen0 !== partnerGen) { generations.set(fu.partners[0], partnerGen); changed = true; }
        if (gen1 !== partnerGen) { generations.set(fu.partners[1], partnerGen); changed = true; }
      } else if (gen0 !== undefined) {
        partnerGen = gen0;
        generations.set(fu.partners[1], partnerGen); changed = true;
      } else if (gen1 !== undefined) {
        partnerGen = gen1;
        generations.set(fu.partners[0], partnerGen); changed = true;
      } else {
        continue;
      }

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

  for (const id of allIds) {
    if (!generations.has(id)) generations.set(id, 0);
  }
}

// ─── Step 3: Order nodes ───────────────────────────────────

interface OrderedGeneration {
  index: number;
  nodeIds: string[];
}

function orderNodesInGenerations(graph: LayoutGraph): OrderedGeneration[] {
  const genGroups = new Map<number, string[]>();
  for (const [id, gen] of graph.generations) {
    const grp = genGroups.get(gen) ?? [];
    grp.push(id);
    genGroups.set(gen, grp);
  }

  const genIndices = Array.from(genGroups.keys()).sort((a, b) => a - b);
  const result: OrderedGeneration[] = [];

  for (const genIdx of genIndices) {
    const nodeIds = genGroups.get(genIdx) ?? [];
    result.push({ index: genIdx, nodeIds: orderGeneration(nodeIds, graph) });
  }

  return result;
}

function orderGeneration(nodeIds: string[], graph: LayoutGraph): string[] {
  if (nodeIds.length <= 1) return [...nodeIds];

  const nodeSet = new Set(nodeIds);
  const placed = new Set<string>();
  const ordered: string[] = [];

  const fuInGen = graph.familyUnits.filter(
    (fu) => nodeSet.has(fu.partners[0]) || nodeSet.has(fu.partners[1])
  );

  for (const fu of fuInGen) {
    for (const p of fu.partners) {
      if (nodeSet.has(p) && !placed.has(p)) {
        ordered.push(p);
        placed.add(p);
      }
    }
  }

  for (const id of nodeIds) {
    if (!placed.has(id)) {
      ordered.push(id);
      placed.add(id);
    }
  }

  return ordered;
}

// ─── Step 4: Assign positions ──────────────────────────────

interface NodePosition {
  id: string;
  x: number;
  y: number;
  generation: number;
}

function assignPositions(
  orderedGens: OrderedGeneration[],
  graph: LayoutGraph,
  config: LayoutConfig
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const { nodeWidth, nodeSpacingX } = config;
  const half = nodeWidth / 2;
  const coupleGap = nodeWidth + nodeSpacingX * 0.6;
  const familyGap = nodeWidth + nodeSpacingX * 1.5;
  const genStepY = config.nodeHeight + LABEL_HEIGHT + LABEL_GAP + config.nodeSpacingY;

  for (const gen of orderedGens) {
    const y = gen.index * genStepY + half;
    const segments = buildSegments(gen.nodeIds, graph);

    let xCursor = GEN_LABEL_MARGIN + half;
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

  resolveOverlaps(positions, orderedGens, config);
  centerChildrenUnderParents(positions, graph, config);
  resolveOverlaps(positions, orderedGens, config);
  enforceCoupleAdjacency(positions, orderedGens, graph, config);

  return positions;
}

interface Segment {
  type: "couple" | "single";
  ids: string[];
}

function buildSegments(nodeIds: string[], graph: LayoutGraph): Segment[] {
  const nodeSet = new Set(nodeIds);
  const segments: Segment[] = [];
  const placed = new Set<string>();

  for (const id of nodeIds) {
    if (placed.has(id)) continue;

    const fu = graph.familyUnits.find(
      (f) =>
        (f.partners[0] === id || f.partners[1] === id) &&
        !placed.has(f.partners[0]) &&
        !placed.has(f.partners[1]) &&
        nodeSet.has(f.partners[0]) &&
        nodeSet.has(f.partners[1])
    );

    if (fu) {
      segments.push({ type: "couple", ids: [fu.partners[0], fu.partners[1]] });
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

  const personToFUs = new Map<string, FamilyUnit[]>();
  for (const fu of graph.familyUnits) {
    for (const p of fu.partners) {
      const arr = personToFUs.get(p) ?? [];
      arr.push(fu);
      personToFUs.set(p, arr);
    }
  }

  for (let pass = 0; pass < 3; pass++) {
    for (const fu of graph.familyUnits) {
      if (fu.children.length === 0) continue;

      const posA = positions.get(fu.partners[0]);
      const posB = positions.get(fu.partners[1]);
      if (!posA || !posB) continue;

      const parentMidX = (posA.x + posB.x) / 2;
      const childSpacing = config.nodeSpacingX + config.nodeWidth;

      const sortedChildren = [...fu.children].sort((a, b) => {
        const ia = graph.individuals.get(a);
        const ib = graph.individuals.get(b);
        return (ia?.birthYear ?? 9999) - (ib?.birthYear ?? 9999);
      });

      if (sortedChildren.length > 1) {
        // Calculate per-gap spacing: add room for married-in spouses
        const gaps: number[] = [];
        for (let j = 0; j < sortedChildren.length - 1; j++) {
          let gap = childSpacing;

          // If the RIGHT child has a spouse placed to their LEFT
          const nextChild = sortedChildren[j + 1];
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
          const currChild = sortedChildren[j];
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
        for (let j = 0; j < sortedChildren.length; j++) {
          const pos = positions.get(sortedChildren[j]);
          if (pos) pos.x = cx;
          if (j < gaps.length) cx += gaps[j];
        }
      } else {
        const pos = positions.get(sortedChildren[0]);
        if (pos) pos.x = parentMidX;
      }

      for (const childId of fu.children) {
        const childPos = positions.get(childId);
        if (!childPos) continue;
        const childFUs = personToFUs.get(childId) ?? [];
        for (const childFU of childFUs) {
          const partnerId = childFU.partners[0] === childId ? childFU.partners[1] : childFU.partners[0];
          const partnerPos = positions.get(partnerId);
          if (!partnerPos) continue;
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

    for (let j = 1; j < genNodes.length; j++) {
      const gap = genNodes[j].x - genNodes[j - 1].x;
      if (gap < minGap) {
        const shift = minGap - gap;
        for (let k = j; k < genNodes.length; k++) genNodes[k].x += shift;
      }
    }
  }

  let minX = Infinity;
  for (const pos of positions.values()) {
    if (pos.x < minX) minX = pos.x;
  }
  const minAllowed = GEN_LABEL_MARGIN + config.nodeWidth / 2;
  if (minX < minAllowed) {
    const shift = minAllowed - minX;
    for (const pos of positions.values()) pos.x += shift;
  }
}

/**
 * Couple adjacency is a semantic hard constraint in a pedigree. Child
 * centering may move siblings and their spouses independently, so finish the
 * generation layout by packing each couple as one segment again.
 */
function enforceCoupleAdjacency(
  positions: Map<string, NodePosition>,
  orderedGens: OrderedGeneration[],
  graph: LayoutGraph,
  config: LayoutConfig
): void {
  const coupleGap = config.nodeWidth + config.nodeSpacingX * 0.6;
  const familyGap = config.nodeWidth + config.nodeSpacingX * 1.5;

  for (const generation of orderedGens) {
    const idsByX = generation.nodeIds
      .filter((id) => positions.has(id))
      .sort((a, b) => positions.get(a)!.x - positions.get(b)!.x);
    const segments = buildSegments(idsByX, graph);
    if (segments.length === 0) continue;
    const familyById = new Map(
      graph.familyUnits.map((family) => [family.id, family])
    );
    const lineageTarget = (segment: Segment): number => {
      const targets = segment.ids.flatMap((id) => {
        const birthFamilyId = graph.childOf.get(id);
        const birthFamily = birthFamilyId
          ? familyById.get(birthFamilyId)
          : undefined;
        if (!birthFamily) return [];
        const parentA = positions.get(birthFamily.partners[0]);
        const parentB = positions.get(birthFamily.partners[1]);
        return parentA && parentB ? [(parentA.x + parentB.x) / 2] : [];
      });
      if (targets.length > 0) {
        return targets.reduce((sum, target) => sum + target, 0) / targets.length;
      }
      const current = segment.ids
        .map((id) => positions.get(id)?.x)
        .filter((x): x is number => x !== undefined);
      return current.reduce((sum, x) => sum + x, 0) / current.length;
    };
    segments.sort((a, b) => {
      const lineageDelta = lineageTarget(a) - lineageTarget(b);
      if (Math.abs(lineageDelta) > 0.01) return lineageDelta;
      const aX = positions.get(a.ids[0])?.x ?? 0;
      const bX = positions.get(b.ids[0])?.x ?? 0;
      return aX - bX;
    });

    const originalMin = Math.min(...idsByX.map((id) => positions.get(id)!.x));
    const originalMax = Math.max(...idsByX.map((id) => positions.get(id)!.x));
    const originalCenter = (originalMin + originalMax) / 2;
    let cursor = originalMin;
    segments.forEach((segment, index) => {
      if (index > 0) cursor += familyGap;
      const first = positions.get(segment.ids[0]);
      if (first) first.x = cursor;
      if (segment.type === "couple") {
        cursor += coupleGap;
        const second = positions.get(segment.ids[1]);
        if (second) second.x = cursor;
      }
    });

    const packedMin = Math.min(...idsByX.map((id) => positions.get(id)!.x));
    const packedMax = Math.max(...idsByX.map((id) => positions.get(id)!.x));
    const centerShift = originalCenter - (packedMin + packedMax) / 2;
    for (const id of idsByX) positions.get(id)!.x += centerShift;
  }
}

// ─── Step 5: Compute edges ─────────────────────────────────

function computeEdges(
  graph: LayoutGraph,
  positions: Map<string, NodePosition>,
  config: LayoutConfig
): LayoutEdge[] {
  const edges: LayoutEdge[] = [];
  const half = config.nodeWidth / 2;
  const dropY_offset = config.nodeHeight / 2 + LABEL_HEIGHT + LABEL_GAP + config.nodeSpacingY * 0.35;
  const childTrackOffsets = computeChildTrackOffsets(graph, positions);
  let routedCoupleCount = 0;

  for (const fu of graph.familyUnits) {
    const posA = positions.get(fu.partners[0]);
    const posB = positions.get(fu.partners[1]);
    if (!posA || !posB) continue;

    const leftPos = posA.x < posB.x ? posA : posB;
    const rightPos = posA.x < posB.x ? posB : posA;
    const leftId = posA.x < posB.x ? fu.partners[0] : fu.partners[1];
    const rightId = posA.x < posB.x ? fu.partners[1] : fu.partners[0];

    const coupleRel: Relationship = { type: fu.relationship, from: leftId, to: rightId };
    const startX = leftPos.x + half;
    const endX = rightPos.x - half;
    const hasInterveningIndividual = [...positions.values()].some(
      (position) =>
        position.id !== leftId &&
        position.id !== rightId &&
        position.generation === leftPos.generation &&
        position.x > leftPos.x &&
        position.x < rightPos.x
    );
    const couplePath = hasInterveningIndividual
      ? (() => {
          const routeY =
            leftPos.y -
            config.nodeHeight / 2 -
            18 -
            routedCoupleCount++ * 12;
          return `M ${startX} ${leftPos.y} L ${startX} ${routeY} L ${endX} ${routeY} L ${endX} ${rightPos.y}`;
        })()
      : `M ${startX} ${leftPos.y} L ${endX} ${rightPos.y}`;
    edges.push({ from: leftId, to: rightId, relationship: coupleRel, path: couplePath });

    // Consanguinity: add second parallel line
    if (fu.relationship === "consanguineous") {
      const offset = 3;
      const consPath = shiftPath(couplePath, 0, offset);
      edges.push({
        from: leftId, to: rightId,
        relationship: { type: "consanguineous", from: leftId, to: rightId, label: "_double" },
        path: consPath,
      });
    }

    if (fu.children.length > 0) {
      const midX = (posA.x + posB.x) / 2;
      const coupleY = posA.y;
      const dropY =
        coupleY + dropY_offset + (childTrackOffsets.get(fu.id) ?? 0);

      const childPositions = fu.children
        .map((cid) => ({ id: cid, pos: positions.get(cid) }))
        .filter((c): c is { id: string; pos: NodePosition } => c.pos !== undefined);

      if (childPositions.length === 0) continue;
      childPositions.sort((a, b) => a.pos.x - b.pos.x);

      const leftX = childPositions[0].pos.x;
      const rightX = childPositions[childPositions.length - 1].pos.x;

      edges.push({
        from: fu.partners[0], to: fu.partners[1],
        relationship: { type: "parent-child", from: fu.id, to: "_drop" },
        path: `M ${midX} ${coupleY} L ${midX} ${dropY}`,
      });

      if (childPositions.length > 1) {
        // The descent line must physically meet the sibship rail even when
        // inter-family marriages force the parents outside their children span.
        const railLeft = Math.min(leftX, midX);
        const railRight = Math.max(rightX, midX);
        edges.push({
          from: fu.partners[0], to: fu.partners[1],
          relationship: { type: "parent-child", from: fu.id, to: "_sibship" },
          path: `M ${railLeft} ${dropY} L ${railRight} ${dropY}`,
        });
      }

      for (const child of childPositions) {
        const childTop = child.pos.y - config.nodeHeight / 2;
        const childPath = childPositions.length === 1
          ? `M ${midX} ${dropY} L ${child.pos.x} ${dropY} L ${child.pos.x} ${childTop}`
          : `M ${child.pos.x} ${dropY} L ${child.pos.x} ${childTop}`;

        edges.push({
          from: fu.id, to: child.id,
          relationship: { type: "parent-child", from: fu.id, to: child.id },
          path: childPath,
        });
      }
    }
  }

  return edges;
}

/**
 * Different families in the same generation need distinct descent tracks.
 * Otherwise overlapping horizontal sibship rails visually merge two unrelated
 * families into one, even when every individual branch endpoint is correct.
 */
function computeChildTrackOffsets(
  graph: LayoutGraph,
  positions: Map<string, NodePosition>
): Map<string, number> {
  const byGeneration = new Map<number, FamilyUnit[]>();
  for (const family of graph.familyUnits) {
    if (family.children.length === 0) continue;
    const generation = positions.get(family.partners[0])?.generation;
    if (generation === undefined) continue;
    const families = byGeneration.get(generation) ?? [];
    families.push(family);
    byGeneration.set(generation, families);
  }

  const offsets = new Map<string, number>();
  const trackGap = 12;
  for (const families of byGeneration.values()) {
    families.sort((a, b) => {
      const a0 = positions.get(a.partners[0])?.x ?? 0;
      const a1 = positions.get(a.partners[1])?.x ?? 0;
      const b0 = positions.get(b.partners[0])?.x ?? 0;
      const b1 = positions.get(b.partners[1])?.x ?? 0;
      return (a0 + a1) / 2 - (b0 + b1) / 2;
    });
    const center = (families.length - 1) / 2;
    families.forEach((family, index) => {
      // Left-hand families take the lower track. That prevents a right-hand
      // parents' descent line from cutting through a left family's long rail.
      offsets.set(family.id, (center - index) * trackGap);
    });
  }
  return offsets;
}

// ─── Step 6: Package result ─────────────────────────────────

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

  const shiftedEdges = edges.map((e) => ({
    ...e,
    path: shiftPath(e.path, padding, padding),
  }));

  let maxX = 0;
  let maxY = 0;
  let minX = Infinity;
  for (const node of nodes) {
    const cx = node.x + node.width / 2;
    const labelText = node.individual.label || node.individual.id;
    const labelHalfWidth = labelText.length * 3.8;
    const right = Math.max(node.x + node.width, cx + labelHalfWidth);
    const left = Math.min(node.x, cx - labelHalfWidth);
    const bottom = node.y + node.height;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
    if (left < minX) minX = left;
  }

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

function shiftPath(pathData: string, dx: number, dy: number): string {
  return pathData.replace(
    /([ML])\s*([\d.-]+)\s+([\d.-]+)/g,
    (_match, cmd: string, xStr: string, yStr: string) => {
      const x = parseFloat(xStr) + dx;
      const y = parseFloat(yStr) + dy;
      return `${cmd} ${x} ${y}`;
    }
  );
}

export interface PedigreeCoupleCollision {
  edge: LayoutEdge;
  node: LayoutNode;
}

export interface PedigreeTopologyIssue {
  code:
    | "PEDIGREE_PARENT_CHILD_DISCONNECTED"
    | "PEDIGREE_SIBSHIP_LINES_MERGED"
    | "PEDIGREE_DESCENT_LINES_CROSS";
  message: string;
  familyId: string;
  childId?: string;
}

/** Post-layout semantic invariant used by lint and regression tests. */
export function findPedigreeCoupleCollisions(
  layout: LayoutResult
): PedigreeCoupleCollision[] {
  const collisions: PedigreeCoupleCollision[] = [];
  const coupleTypes = new Set<RelationshipType>([
    "married",
    "separated",
    "consanguineous",
    "cohabiting",
  ]);

  for (const edge of layout.edges) {
    if (!coupleTypes.has(edge.relationship.type)) continue;
    if (edge.relationship.label === "_double") continue;
    const points = [...edge.path.matchAll(/[ML]\s*([\d.-]+)\s+([\d.-]+)/g)]
      .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
    if (points.length < 2) continue;

    for (const node of layout.nodes) {
      if (node.id === edge.from || node.id === edge.to) continue;
      const pad = 2;
      const left = node.x - pad;
      const right = node.x + node.width + pad;
      const top = node.y - pad;
      const bottom = node.y + node.height + pad;
      const intersects = points.slice(1).some((point, index) => {
        const previous = points[index]!;
        if (Math.abs(previous.y - point.y) < 0.01) {
          return (
            point.y >= top &&
            point.y <= bottom &&
            Math.max(Math.min(previous.x, point.x), left) <=
              Math.min(Math.max(previous.x, point.x), right)
          );
        }
        if (Math.abs(previous.x - point.x) < 0.01) {
          return (
            point.x >= left &&
            point.x <= right &&
            Math.max(Math.min(previous.y, point.y), top) <=
              Math.min(Math.max(previous.y, point.y), bottom)
          );
        }
        return false;
      });
      if (intersects) collisions.push({ edge, node });
    }
  }
  return collisions;
}

interface PathPoint {
  x: number;
  y: number;
}

interface PathSegment {
  from: PathPoint;
  to: PathPoint;
}

function pathPoints(pathData: string): PathPoint[] {
  return [...pathData.matchAll(/[ML]\s*([\d.-]+)\s+([\d.-]+)/g)].map(
    (match) => ({ x: Number(match[1]), y: Number(match[2]) })
  );
}

function pathSegments(pathData: string): PathSegment[] {
  const points = pathPoints(pathData);
  return points.slice(1).map((point, index) => ({
    from: points[index]!,
    to: point,
  }));
}

function samePoint(a: PathPoint, b: PathPoint): boolean {
  return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;
}

function pointOnSegment(point: PathPoint, segment: PathSegment): boolean {
  const minX = Math.min(segment.from.x, segment.to.x) - 0.01;
  const maxX = Math.max(segment.from.x, segment.to.x) + 0.01;
  const minY = Math.min(segment.from.y, segment.to.y) - 0.01;
  const maxY = Math.max(segment.from.y, segment.to.y) + 0.01;
  if (Math.abs(segment.from.y - segment.to.y) < 0.01) {
    return (
      Math.abs(point.y - segment.from.y) < 0.01 &&
      point.x >= minX &&
      point.x <= maxX
    );
  }
  if (Math.abs(segment.from.x - segment.to.x) < 0.01) {
    return (
      Math.abs(point.x - segment.from.x) < 0.01 &&
      point.y >= minY &&
      point.y <= maxY
    );
  }
  return false;
}

function segmentsTouch(a: PathSegment, b: PathSegment): boolean {
  const aHorizontal = Math.abs(a.from.y - a.to.y) < 0.01;
  const bHorizontal = Math.abs(b.from.y - b.to.y) < 0.01;
  if (aHorizontal && bHorizontal) {
    if (Math.abs(a.from.y - b.from.y) >= 0.01) return false;
    return (
      Math.max(Math.min(a.from.x, a.to.x), Math.min(b.from.x, b.to.x)) <=
      Math.min(Math.max(a.from.x, a.to.x), Math.max(b.from.x, b.to.x)) + 0.01
    );
  }
  if (!aHorizontal && !bHorizontal) {
    if (Math.abs(a.from.x - b.from.x) >= 0.01) return false;
    return (
      Math.max(Math.min(a.from.y, a.to.y), Math.min(b.from.y, b.to.y)) <=
      Math.min(Math.max(a.from.y, a.to.y), Math.max(b.from.y, b.to.y)) + 0.01
    );
  }
  const horizontal = aHorizontal ? a : b;
  const vertical = aHorizontal ? b : a;
  return pointOnSegment(
    { x: vertical.from.x, y: horizontal.from.y },
    horizontal
  ) && pointOnSegment(
    { x: vertical.from.x, y: horizontal.from.y },
    vertical
  );
}

/** Validate that rendered parent-child geometry still encodes the parsed kinship. */
export function findPedigreeTopologyIssues(
  layout: LayoutResult
): PedigreeTopologyIssue[] {
  const issues: PedigreeTopologyIssue[] = [];
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));
  const familyEdges = new Map<string, LayoutEdge[]>();
  const childEdges: LayoutEdge[] = [];

  for (const edge of layout.edges) {
    if (edge.relationship.type !== "parent-child") continue;
    const familyId = edge.relationship.from;
    const group = familyEdges.get(familyId) ?? [];
    group.push(edge);
    familyEdges.set(familyId, group);
    if (nodes.has(edge.relationship.to)) childEdges.push(edge);
  }

  const reportedChildren = new Set<string>();
  for (const edge of childEdges) {
    const childId = edge.relationship.to;
    const node = nodes.get(childId)!;
    const expected = { x: node.x + node.width / 2, y: node.y };
    const points = pathPoints(edge.path);
    const actual = points.at(-1);
    if (!actual || !samePoint(actual, expected)) {
      const key = `${edge.relationship.from}:${childId}`;
      reportedChildren.add(key);
      issues.push({
        code: "PEDIGREE_PARENT_CHILD_DISCONNECTED",
        familyId: edge.relationship.from,
        childId,
        message: `Parent-child connector for ${childId} does not terminate at that child's top anchor.`,
      });
    }
  }

  for (const [familyId, edges] of familyEdges) {
    const drop = edges.find((edge) => edge.relationship.to === "_drop");
    const start = drop ? pathPoints(drop.path)[0] : undefined;
    const segments = edges.flatMap((edge) => pathSegments(edge.path));
    if (!start || segments.length === 0) continue;

    const reachable = new Set<number>();
    segments.forEach((segment, index) => {
      if (pointOnSegment(start, segment)) reachable.add(index);
    });
    let changed = true;
    while (changed) {
      changed = false;
      segments.forEach((segment, index) => {
        if (reachable.has(index)) return;
        if (
          [...reachable].some((reachableIndex) =>
            segmentsTouch(segment, segments[reachableIndex]!)
          )
        ) {
          reachable.add(index);
          changed = true;
        }
      });
    }

    for (const edge of edges) {
      const childId = edge.relationship.to;
      const node = nodes.get(childId);
      if (!node) continue;
      const key = `${familyId}:${childId}`;
      if (reportedChildren.has(key)) continue;
      const target = { x: node.x + node.width / 2, y: node.y };
      const connected = [...reachable].some((index) =>
        pointOnSegment(target, segments[index]!)
      );
      if (!connected) {
        reportedChildren.add(key);
        issues.push({
          code: "PEDIGREE_PARENT_CHILD_DISCONNECTED",
          familyId,
          childId,
          message: `Parent-child connector for ${childId} is disconnected from family ${familyId}.`,
        });
      }
    }
  }

  const rails = layout.edges.filter(
    (edge) =>
      edge.relationship.type === "parent-child" &&
      edge.relationship.to === "_sibship"
  );
  for (let i = 0; i < rails.length; i++) {
    const a = pathSegments(rails[i]!.path)[0];
    if (!a || Math.abs(a.from.y - a.to.y) >= 0.01) continue;
    for (let j = i + 1; j < rails.length; j++) {
      if (rails[i]!.relationship.from === rails[j]!.relationship.from) continue;
      const b = pathSegments(rails[j]!.path)[0];
      if (!b || Math.abs(b.from.y - b.to.y) >= 0.01) continue;
      if (Math.abs(a.from.y - b.from.y) >= 0.01) continue;
      const overlap =
        Math.min(Math.max(a.from.x, a.to.x), Math.max(b.from.x, b.to.x)) -
        Math.max(Math.min(a.from.x, a.to.x), Math.min(b.from.x, b.to.x));
      if (overlap > 0.01) {
        issues.push({
          code: "PEDIGREE_SIBSHIP_LINES_MERGED",
          familyId: rails[i]!.relationship.from,
          message: `Sibship rails for ${rails[i]!.relationship.from} and ${rails[j]!.relationship.from} overlap and visually merge unrelated families.`,
        });
      }
    }
  }

  const familyGeometry = [...familyEdges].map(([familyId, edges]) => ({
    familyId,
    segments: edges.flatMap((edge) => pathSegments(edge.path)),
  }));
  for (let i = 0; i < familyGeometry.length; i++) {
    for (let j = i + 1; j < familyGeometry.length; j++) {
      const a = familyGeometry[i]!;
      const b = familyGeometry[j]!;
      const aMembers = new Set(a.familyId.split("+"));
      if (b.familyId.split("+").some((member) => aMembers.has(member))) {
        continue;
      }
      if (
        a.segments.some((segmentA) =>
          b.segments.some((segmentB) => segmentsTouch(segmentA, segmentB))
        )
      ) {
        issues.push({
          code: "PEDIGREE_DESCENT_LINES_CROSS",
          familyId: a.familyId,
          message: `Descent geometry for ${a.familyId} intersects ${b.familyId} and creates a false kinship junction.`,
        });
      }
    }
  }

  return issues;
}
