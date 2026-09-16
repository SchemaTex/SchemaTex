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

import { estimateTextWidth } from "../../core/text-metrics";
import { individualCaptions } from "./captions";
import { individualPerimeter } from "./symbols";
import { twinPaths } from "./line-forms";
import { EMOTIONAL_REL_TYPES, routeEmotionalEdges } from "./routing";

interface GenogramLayoutConfig extends LayoutConfig {
  fontSize?: number;
}

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
  config: GenogramLayoutConfig,
  pins?: Map<string, { x: number; y: number }>
): LayoutResult {
  const graph = buildGraph(ast);
  // Contacts connected only by emotional ties have no ancestral generation.
  // Keep actual family relationships authoritative even if marked external.
  const contacts = ast.individuals.filter(ind => ind.external && !ind.siblingOf &&
    !ast.individuals.some(other => other.siblingOf === ind.id) &&
    !ast.relationships.some(r => (r.from === ind.id || r.to === ind.id) && !EMOTIONAL_REL_TYPES.has(r.type)) &&
    ast.relationships.some(r => (r.from === ind.id || r.to === ind.id) &&
      ast.individuals.some(other => other.id === (r.from === ind.id ? r.to : r.from) && !other.external)));
  for (const contact of contacts) graph.individuals.delete(contact.id);
  assignGenerations(graph);
  const ordered = orderNodesInGenerations(graph, config);
  const positions = assignPositions(ordered, graph, config);
  for (const contact of contacts) {
    // Only family members determine the supported generation. Other contacts
    // may already be placed, but must not change this semantic anchor.
    const peerIds = new Set(ast.relationships.filter(r => r.from === contact.id || r.to === contact.id)
      .map(r => r.from === contact.id ? r.to : r.from));
    const peers = [...peerIds].filter(id => !graph.individuals.get(id)?.external)
      .map(id => positions.get(id))
      .filter((p): p is NodePosition => p !== undefined);
    const anchor = [...peers].sort((a, b) => a.y - b.y || a.x - b.x)[Math.floor(peers.length / 2)];
    const row = [...positions.values()].filter(p => p.generation === anchor.generation);
    const half = Math.max(config.nodeWidth, captionWidth(contact, config)) / 2;
    const extent = (p: NodePosition) => Math.max(config.nodeWidth, captionWidth(graph.individuals.get(p.id)!, config)) / 2;
    const left = Math.min(...row.map(p => p.x - extent(p))) - config.nodeSpacingX - half;
    const right = Math.max(...row.map(p => p.x + extent(p))) + config.nodeSpacingX + half;
    const cost = (x: number) => peers.reduce((sum, p) => sum + Math.abs(x - p.x), 0);
    positions.set(contact.id, { id: contact.id, x: cost(left) < cost(right) ? left : right,
      y: anchor.y, generation: anchor.generation });
    graph.individuals.set(contact.id, contact);
  }
  if (pins?.size) {
    const padding = 40;
    for (const position of positions.values()) {
      const pin = pins.get(position.id);
      if (pin) position.x = pin.x + config.nodeWidth / 2 - padding;
    }
  }
  const secondaryEdges = computeSecondaryParentEdges(
    ast.relationships,
    graph,
    positions,
    config
  );
  const edges = computeEdges(graph, positions, config, ast.relationships);
  const result = packageResult(
    positions,
    [...edges, ...secondaryEdges],
    graph,
    config
  );
  routeEmotionalEdges(result, ast.relationships, config.fontSize ?? DEFAULT_FONT_SIZE);
  return result;
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
      r.type === "cohabiting-ended" ||
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

    // Find children for this family unit. Skip *secondary* parent-child rels
    // (foster/adopted "current caregiver" links): they are data-true but must
    // not dominate layout — the bio couple keeps the child structurally.
    const children: string[] = [];
    for (const r of ast.relationships) {
      if (
        (r.type === "parent-child" ||
          r.type === "adopted" ||
          r.type === "foster" || r.type === "step") &&
        r.from === fuId &&
        !r.secondary
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

  // Find roots: individuals not a child of any family unit AND not anchored
  // via siblingOf to another individual (those will be placed in step 2).
  const allIds = Array.from(individuals.keys());
  const roots = allIds.filter((id) => {
    if (childOf.has(id)) return false;
    const ind = individuals.get(id);
    if (ind?.siblingOf) return false;
    return true;
  });

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

  // Resolve siblingOf anchors — copy generation from the referenced sibling.
  // Iterate to fixed point in case of chains (siblingOf → siblingOf).
  let siblingChanged = true;
  let safety = 0;
  while (siblingChanged && safety++ < allIds.length + 1) {
    siblingChanged = false;
    for (const id of allIds) {
      if (generations.has(id)) continue;
      const ind = individuals.get(id);
      if (!ind?.siblingOf) continue;
      const refGen = generations.get(ind.siblingOf);
      if (refGen !== undefined) {
        generations.set(id, refGen);
        siblingChanged = true;
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
  _config: GenogramLayoutConfig
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

  // Place remaining unpartnered individuals. Sibling-of anchors get inserted
  // immediately adjacent to their referenced sibling so the dashed bracket
  // stays short. Everyone else falls back to birth-year sort.
  const remaining = nodeIds.filter((id) => !placed.has(id));
  const siblingOfRemaining = remaining.filter((id) => {
    const ind = graph.individuals.get(id);
    return ind?.siblingOf && placed.has(ind.siblingOf);
  });
  const otherRemaining = remaining.filter(
    (id) => !siblingOfRemaining.includes(id)
  );
  otherRemaining.sort((a, b) => {
    const indA = graph.individuals.get(a);
    const indB = graph.individuals.get(b);
    return (indA?.birthYear ?? 9999) - (indB?.birthYear ?? 9999);
  });
  for (const id of otherRemaining) {
    ordered.push(id);
    placed.add(id);
  }
  // Insert each sibling-of node right after its referenced sibling.
  for (const id of siblingOfRemaining) {
    const ind = graph.individuals.get(id);
    if (!ind?.siblingOf) continue;
    const refIdx = ordered.indexOf(ind.siblingOf);
    if (refIdx === -1) {
      ordered.push(id);
    } else {
      ordered.splice(refIdx + 1, 0, id);
    }
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
const DEFAULT_FONT_SIZE = 12;

/** Reserve every caption line below the name for generation and canvas bounds. */
function captionExtra(graph: LayoutGraph, config: GenogramLayoutConfig): number {
  const maxLines = Math.max(0, ...Array.from(graph.individuals.values(),
    (ind) => individualCaptions(ind).length - 1));
  return maxLines * (Math.max(9, config.fontSize ?? DEFAULT_FONT_SIZE) + 1);
}

function captionWidth(ind: Individual, config: GenogramLayoutConfig): number {
  return Math.max(config.nodeWidth, ...individualCaptions(ind).map((caption) =>
    estimateTextWidth(caption.text, Math.max(9, config.fontSize ?? DEFAULT_FONT_SIZE))));
}

function assignPositions(
  orderedGens: OrderedGeneration[],
  graph: LayoutGraph,
  config: GenogramLayoutConfig
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const { nodeWidth, nodeSpacingX } = config;
  const half = nodeWidth / 2;
  // Couple gap = space between two partner centers (node edge to edge + line)
  const coupleGap = nodeWidth + nodeSpacingX * 0.6;
  // Family gap = space between separate family units
  const familyGap = nodeWidth + nodeSpacingX * 1.5;
  // Generation Y spacing = node height + label space + vertical gap
  const genStepY = config.nodeHeight + Math.max(LABEL_HEIGHT, config.fontSize ?? DEFAULT_FONT_SIZE) + LABEL_GAP + config.nodeSpacingY + captionExtra(graph, config);

  // Pass 1: Initial placement based on generation ordering
  for (const gen of orderedGens) {
    const y = gen.index * genStepY + half;
    const segments = buildSegments(gen.nodeIds, gen.index, graph);

    let xCursor = half;
    for (let s = 0; s < segments.length; s++) {
      const seg = segments[s];
      if (s > 0) xCursor += familyGap;

      for (const [index, id] of seg.ids.entries()) {
        if (index > 0) xCursor += coupleGap;
        positions.set(id, { id, x: xCursor, y, generation: gen.index });
      }
    }
  }

  // Pass 2: Resolve overlaps (before centering, so centering uses final positions)
  resolveOverlaps(positions, orderedGens, config, graph);

  // Pass 3: Center children under parents (and drag partners)
  centerChildrenUnderParents(positions, graph, config);

  // Pass 3b: Unscramble interleaved sibships (Case A — cousins from different couples).
  unscrambleSibships(positions, graph, config);

  // Pass 4: Resolve any new overlaps introduced by centering
  resolveOverlaps(positions, orderedGens, config, graph);

  alignUnionBlocks(positions, graph, config);
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

  const chains = partnershipChains(graph).filter(chain => chain.length > 2);
  const segments: Segment[] = [];
  const placed = new Set<string>();

  for (const id of nodeIds) {
    if (placed.has(id)) continue;
    const chain = chains.find(chain => chain.includes(id));
    if (chain) {
      const ids = chain.filter(member => nodeSet.has(member));
      segments.push({ type: "couple", ids });
      ids.forEach(member => placed.add(member));
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

/** Connected partnerships in source order, starting at the earliest union's end. */
function partnershipChains(graph: LayoutGraph): string[][] {
  const ended = (fu: FamilyUnit) => ["divorced", "separated", "cohabiting-ended"].includes(fu.relationship) ? 0 : 1;
  const units = graph.familyUnits.map((fu, index) => ({ fu, index }))
    .sort((a, b) => ended(a.fu) - ended(b.fu) || a.index - b.index).map(entry => entry.fu);
  const adjacent = new Map<string, string[]>();
  for (const fu of units) for (const [a, b] of [fu.partners, [...fu.partners].reverse()]) {
    const neighbours = adjacent.get(a) ?? [];
    if (!neighbours.includes(b)) neighbours.push(b);
    adjacent.set(a, neighbours);
  }
  const visited = new Set<string>();
  const chains: string[][] = [];
  for (const fu of units) {
    if (visited.has(fu.partners[0])) continue;
    const component: string[] = [];
    const collect = (id: string) => {
      if (component.includes(id)) return;
      component.push(id);
      for (const other of adjacent.get(id) ?? []) collect(other);
    };
    collect(fu.partners[0]);
    const start = component.find(id => adjacent.get(id)!.length === 1) ?? component[0];
    const chain: string[] = [];
    const walk = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id); chain.push(id);
      for (const other of adjacent.get(id) ?? []) walk(other);
    };
    walk(start); chains.push(chain);
  }
  return chains;
}

/** Reserve each connected union's child footprint inside its partnership interval. */
function alignUnionBlocks(positions: Map<string, NodePosition>, graph: LayoutGraph, config: GenogramLayoutConfig): void {
  const chains = partnershipChains(graph).filter(chain => chain.length > 2);
  for (const chain of chains) {
    const children = graph.familyUnits.filter(fu => fu.partners.every(id => chain.includes(id))).flatMap(fu => fu.children);
    const blockGap = Math.max(config.nodeWidth + config.nodeSpacingX,
      ...children.map(id => captionWidth(graph.individuals.get(id)!, config) + LABEL_GAP)) *
      (config.nodeWidth + config.nodeSpacingX * 1.5) / (config.nodeWidth + config.nodeSpacingX);
    const anchor = chain.find(id => graph.childOf.has(id)) ?? chain[0];
    const anchorX = positions.get(anchor)!.x;
    const offsets = new Map<string, number>([[chain[0], 0]]);
    const blocks: Array<{ fu: FamilyUnit; offsets: number[]; width: number }> = [];
    let x = 0;
    for (let i = 1; i < chain.length; i++) {
      const fu = graph.familyUnits.find(fu => fu.partners.includes(chain[i - 1]) && fu.partners.includes(chain[i]));
      const children = fu?.children ?? [];
      const childOffsets = [0];
      for (let j = 1; j < children.length; j++) {
        const a = graph.individuals.get(children[j - 1])!, b = graph.individuals.get(children[j])!;
        childOffsets.push(childOffsets[j - 1] + Math.max(config.nodeWidth + config.nodeSpacingX,
          (captionWidth(a, config) + captionWidth(b, config)) / 2 + LABEL_GAP));
      }
      const width = children.length ? childOffsets.at(-1)! : 0;
      const margin = blockGap;
      x += Math.max(config.nodeWidth + config.nodeSpacingX, width + margin,
        (captionWidth(graph.individuals.get(chain[i - 1])!, config) + captionWidth(graph.individuals.get(chain[i])!, config)) / 2 + LABEL_GAP);
      offsets.set(chain[i], x);
      if (fu) blocks.push({ fu, offsets: childOffsets, width });
    }
    const origin = anchorX - offsets.get(anchor)!;
    for (const id of chain) positions.get(id)!.x = origin + offsets.get(id)!;
    for (const block of blocks) {
      const [a, b] = block.fu.partners.map(id => positions.get(id)!);
      const left = (a.x + b.x) / 2 - block.width / 2;
      block.fu.children.forEach((id, i) => { positions.get(id)!.x = left + block.offsets[i]; });
    }
  }
}

function centerChildrenUnderParents(
  positions: Map<string, NodePosition>,
  graph: LayoutGraph,
  config: GenogramLayoutConfig
): void {
  const coupleGap = config.nodeSpacingX + config.nodeWidth;
  const chains = partnershipChains(graph).filter(chain => chain.length > 2);

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
      const oldChildX = new Map(fu.children.map(id => [id, positions.get(id)?.x ?? 0]));

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
        const chain = chains.find(chain => chain.includes(childId));
        if (chain) {
          const delta = childPos.x - oldChildX.get(childId)!;
          for (const id of chain) {
            const partner = positions.get(id);
            if (partner && id !== childId) partner.x += delta;
          }
          continue;
        }
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

/** Re-lay each sibship as a contiguous block with `familyGap` between, so cousins don't interleave (Case A). */
function unscrambleSibships(
  positions: Map<string, NodePosition>,
  graph: LayoutGraph,
  config: GenogramLayoutConfig
): void {
  const familyGap = config.nodeWidth + config.nodeSpacingX * 1.5;
  const childSpacing = config.nodeWidth + config.nodeSpacingX;

  const byGen = new Map<number, string[]>();
  for (const [id, pos] of positions) {
    const arr = byGen.get(pos.generation) ?? [];
    arr.push(id);
    byGen.set(pos.generation, arr);
  }

  for (const [, ids] of byGen) {
    const sibshipMap = new Map<string, string[]>();
    for (const id of ids) {
      const fu = graph.childOf.get(id);
      if (!fu) continue;
      const arr = sibshipMap.get(fu) ?? [];
      arr.push(id);
      sibshipMap.set(fu, arr);
    }
    if (sibshipMap.size <= 1) continue;

    const sibships = [...sibshipMap.entries()]
      .map(([fuId, children]) => {
        const fu = graph.familyUnits.find((f) => f.id === fuId);
        if (!fu) return null;
        const pa = positions.get(fu.partners[0]);
        const pb = positions.get(fu.partners[1]);
        if (!pa || !pb) return null;
        return { fuId, children, midX: (pa.x + pb.x) / 2 };
      })
      .filter((x): x is { fuId: string; children: string[]; midX: number } => x !== null)
      .sort((a, b) => a.midX - b.midX);

    let cursor: number | null = null;
    for (const ss of sibships) {
      const sortedKids = [...ss.children].sort((a, b) => {
        const ya = graph.individuals.get(a)?.birthYear ?? 9999;
        const yb = graph.individuals.get(b)?.birthYear ?? 9999;
        return ya - yb;
      });

      const totalWidth = Math.max(0, (sortedKids.length - 1) * childSpacing);
      let startX = ss.midX - totalWidth / 2;
      if (cursor !== null && startX < cursor) startX = cursor;

      for (let i = 0; i < sortedKids.length; i++) {
        const pos = positions.get(sortedKids[i]);
        if (pos) pos.x = startX + i * childSpacing;
      }
      cursor = startX + totalWidth + familyGap;
    }
  }
}

function resolveOverlaps(
  positions: Map<string, NodePosition>,
  orderedGens: OrderedGeneration[],
  config: GenogramLayoutConfig,
  graph: LayoutGraph
): void {
  const minGap = config.nodeWidth + config.nodeSpacingX;

  // Cluster = childOf family unit; spouses inherit from their partner.
  const cluster = new Map<string, string>();
  for (const [id] of positions) {
    const fu = graph.childOf.get(id);
    if (fu) cluster.set(id, fu);
  }
  for (const fu of graph.familyUnits) {
    for (const p of fu.partners) {
      if (cluster.has(p)) continue;
      const other = fu.partners[0] === p ? fu.partners[1] : fu.partners[0];
      const otherCluster = cluster.get(other);
      if (otherCluster) cluster.set(p, otherCluster);
    }
  }

  for (const gen of orderedGens) {
    const genNodes = gen.nodeIds
      .map((id) => positions.get(id))
      .filter((p): p is NodePosition => p !== undefined);

    genNodes.sort((a, b) => a.x - b.x);
    // Keep family groups distinct even when captions widen the sibling gaps.
    const familyGap = Math.max(minGap, ...genNodes.map((node) =>
      captionWidth(graph.individuals.get(node.id)!, config) + LABEL_GAP)) *
      (config.nodeWidth + config.nodeSpacingX * 1.5) / minGap;

    for (let i = 1; i < genNodes.length; i++) {
      const prev = genNodes[i - 1];
      const cur = genNodes[i];
      const cPrev = cluster.get(prev.id);
      const cCur = cluster.get(cur.id);
      const required = Math.max(
        cPrev && cCur && cPrev !== cCur ? familyGap : minGap,
        (captionWidth(graph.individuals.get(prev.id)!, config) +
          captionWidth(graph.individuals.get(cur.id)!, config)) / 2 + LABEL_GAP
      );
      const gap = cur.x - prev.x;
      if (gap < required) {
        const shift = required - gap;
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
  config: GenogramLayoutConfig,
  relationships: Relationship[]
): LayoutEdge[] {
  const edges: LayoutEdge[] = [];
  const dropY_offset = config.nodeHeight / 2 + Math.max(LABEL_HEIGHT, config.fontSize ?? DEFAULT_FONT_SIZE) + LABEL_GAP + config.nodeSpacingY * 0.35 + captionExtra(graph, config);

  for (const fu of graph.familyUnits) {
    const posA = positions.get(fu.partners[0]);
    const posB = positions.get(fu.partners[1]);
    if (!posA || !posB) continue;

    const attachmentHalf = (id: string) => individualPerimeter(graph.individuals.get(id)!, config.nodeWidth).half;
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
    const couplePath = `M ${leftPos.x + attachmentHalf(leftId)} ${leftPos.y} L ${rightPos.x - attachmentHalf(rightId)} ${rightPos.y}`;
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

      const twins = new Map<string, { type: RelationshipType; ids: Set<string> }>();
      for (const rel of relationships) {
        if ((rel.type !== "twin-identical" && rel.type !== "twin-fraternal") ||
          !fu.children.includes(rel.from) || !fu.children.includes(rel.to)) continue;
        const key = `${rel.type}:${graph.individuals.get(rel.from)?.birthYear ?? ""}`;
        const group = twins.get(key) ?? { type: rel.type, ids: new Set<string>() };
        group.ids.add(rel.from);
        group.ids.add(rel.to);
        twins.set(key, group);
      }
      const twinIds = new Set([...twins.values()].flatMap(group => [...group.ids]));
      const attachments = childPositions.filter(child => !twinIds.has(child.id)).map(child => child.pos.x);
      for (const twin of twins.values()) {
        const members = childPositions.filter(child => twin.ids.has(child.id));
        const apex = { x: (members[0].pos.x + members[members.length - 1].pos.x) / 2, y: dropY };
        attachments.push(apex.x);
        const path = twinPaths(apex, members.map(child => ({ x: child.pos.x, y: child.pos.y - attachmentHalf(child.id) })), twin.type === "twin-identical").join(" ");
        edges.push({ from: members[0].id, to: members[members.length - 1].id,
          relationship: { type: twin.type, from: members[0].id, to: members[members.length - 1].id }, path });
      }
      const leftX = Math.min(...attachments);
      const rightX = Math.max(...attachments);

      // Drop line from couple midpoint
      const trunkX = Math.max(leftX, Math.min(rightX, midX));
      const dropPath = trunkX === midX
        ? `M ${midX} ${coupleY} L ${midX} ${dropY}`
        : `M ${midX} ${coupleY} L ${midX} ${dropY - 12} L ${trunkX} ${dropY - 12} L ${trunkX} ${dropY}`;
      edges.push({
        from: fu.partners[0],
        to: fu.partners[1],
        relationship: { type: "parent-child", from: fu.id, to: "_drop" },
        path: dropPath,
      });

      // End the sibship at actual child attachments (a twin apex counts once).
      if (leftX < rightX) {
        edges.push({
          from: childPositions[0].id,
          to: childPositions[childPositions.length - 1].id,
          relationship: { type: "parent-child", from: fu.id, to: "_sibship" },
          path: `M ${leftX} ${dropY} L ${rightX} ${dropY}`,
        });
      }

      // Vertical lines from sibship to each child
      for (const child of childPositions) {
        if (twinIds.has(child.id)) continue;
        const childTop = child.pos.y - attachmentHalf(child.id);
        const childPath = `M ${child.pos.x} ${dropY} L ${child.pos.x} ${childTop}`;

        const pcRel = relationships.find((rel) =>
          rel.from === fu.id && rel.to === child.id && !rel.secondary
        );
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

// ─── Step 7: Package result ─────────────────────────────────

function packageResult(
  positions: Map<string, NodePosition>,
  edges: LayoutEdge[],
  graph: LayoutGraph,
  config: GenogramLayoutConfig
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
    const labelHalfWidth = captionWidth(node.individual, config) / 2;
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
    height: maxY + padding + LABEL_GAP + Math.max(LABEL_HEIGHT, config.fontSize ?? DEFAULT_FONT_SIZE) + 10 + captionExtra(graph, config),
    nodes,
    edges: shiftedEdges,
  };
}

// ─── Secondary parent-child edges (foster/adopted "current caregiver") ──

function computeSecondaryParentEdges(
  relationships: Relationship[],
  graph: LayoutGraph,
  positions: Map<string, NodePosition>,
  config: GenogramLayoutConfig
): LayoutEdge[] {
  const links = relationships.filter(rel => rel.secondary &&
    ["parent-child", "foster", "adopted", "step"].includes(rel.type));
  const tracks: Array<{ y: number; left: number; right: number }> = [];
  const routes: Array<{ rel: Relationship; start: NodePosition; child: NodePosition; x: number; dx: number; y: number; dy: number }> = [];
  for (const rel of links) {
    const fu = graph.familyUnits.find(fu => fu.id === rel.from);
    if (!fu) continue;
    const a = positions.get(fu.partners[0]), b = positions.get(fu.partners[1]), child = positions.get(rel.to);
    if (!a || !b || !child) continue;
    const mid = (a.x + b.x) / 2;
    const side = child.x < mid ? -1 : 1;
    const x = mid + side * Math.min(12, Math.max(0, Math.abs(a.x - b.x) / 2 - config.nodeWidth / 2) / 2);
    const portIndex = links.filter(other => other.to === rel.to).indexOf(rel);
    const perimeter = individualPerimeter(graph.individuals.get(rel.to)!, config.nodeWidth);
    const dx = side * (portIndex % 2 ? -1 : 1) * perimeter.half * (0.4 + 0.4 / (1 + Math.floor(portIndex / 2)));
    const dy = perimeter.shape === "circle" ? -Math.sqrt(perimeter.half ** 2 - dx ** 2)
      : perimeter.shape === "diamond" ? -perimeter.half + Math.abs(dx)
      : perimeter.shape === "triangle" ? -perimeter.half + 2 * Math.abs(dx) : -perimeter.half;
    const left = Math.min(x, child.x + dx), right = Math.max(x, child.x + dx);
    let y = a.y + config.nodeHeight / 2 + Math.max(LABEL_HEIGHT, config.fontSize ?? DEFAULT_FONT_SIZE) + LABEL_GAP +
      config.nodeSpacingY * 0.35 + captionExtra(graph, config) + 12;
    while (tracks.some(track => Math.abs(track.y - y) < 12 && track.left < right + 4 && left < track.right + 4)) y += 12;
    tracks.push({ y, left, right });
    routes.push({ rel, start: a, child, x, dx, y, dy });
  }
  // Grow only bands that cannot fit their allocated placement tracks.
  for (const generation of [...new Set(routes.map(route => route.child.generation))].sort((a, b) => a - b)) {
    const group = routes.filter(route => route.child.generation === generation && route.start.generation < generation);
    const extra = Math.max(0, ...group.map(route => route.y + 12 - (route.child.y + route.dy)));
    if (!extra) continue;
    for (const position of positions.values()) if (position.generation >= generation) position.y += extra;
    for (const route of routes) if (route.start.generation >= generation) route.y += extra;
  }
  const edges: LayoutEdge[] = routes.map(({ rel, start, child, x, dx, y, dy }) => ({
    from: rel.from, to: rel.to, relationship: rel,
    path: `M ${x} ${start.y} L ${x} ${y} L ${child.x + dx} ${y} L ${child.x + dx} ${child.y + dy}`,
  }));
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
