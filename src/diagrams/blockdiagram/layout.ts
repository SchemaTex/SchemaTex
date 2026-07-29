import type {
  BlockAST,
  BlockEdge,
  BlockNode,
} from "../../core/types";
import {
  estimateMaxLineWidth,
  wrapTextToWidth,
} from "../../core/text-metrics";

export interface LaidBlock {
  kind: "block";
  id: string;
  label: string;
  labelLines: string[];
  role: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasBranch?: boolean;
}

export interface LaidSum {
  kind: "sum";
  id: string;
  cx: number;
  cy: number;
  r: number;
  hasBranch?: boolean;
}

export interface LaidPort {
  kind: "port";
  id: string;
  label: string;
  x: number;
  y: number;
  isInput: boolean;
  hasBranch?: boolean;
}

export type LaidNode = LaidBlock | LaidSum | LaidPort;

export interface LaidEdgePolarity {
  sign: "+" | "-";
  pin: "left" | "top" | "right" | "bottom";
  x: number;
  y: number;
}

export interface LaidEdge {
  from: string;
  to: string;
  label?: string;
  labelLines?: string[];
  labelWidth?: number;
  labelHeight?: number;
  discrete: boolean;
  path: string;
  midX: number;
  midY: number;
  isFeedback: boolean;
  polarity?: LaidEdgePolarity;
}

export interface BlockDiagramLayout {
  width: number;
  height: number;
  nodes: LaidNode[];
  edges: LaidEdge[];
  title?: string;
  topOffset: number;
}

export interface BlockDiagramCollisions {
  nodeNode: string[];
  labelLabel: string[];
  labelNode: string[];
}

const SUM_R = 12;
const MIN_BLOCK_W = 126;
const MAX_BLOCK_W = 230;
const MIN_BLOCK_H = 54;
const BLOCK_FONT = 14;
const BLOCK_LINE_H = 16;
const BLOCK_TEXT_MAX = 190;
const EDGE_FONT = 12;
const EDGE_LINE_H = 14;
const EDGE_TEXT_MAX = 165;
const COL_GAP = 210;
const ROW_GAP = 42;
const TOP_PAD = 32;
const BOTTOM_PAD = 34;
const SIDE_PAD = 34;
const FEEDBACK_LANE_GAP = 28;

interface NodeMeasure {
  width: number;
  height: number;
  label: string;
  lines: string[];
}

function measureBlock(block: BlockNode): NodeMeasure {
  const lines = wrapTextToWidth(
    block.label,
    BLOCK_FONT,
    BLOCK_TEXT_MAX,
    { fontWeight: 600 }
  );
  const label = lines.join("\n");
  const width = Math.max(
    MIN_BLOCK_W,
    Math.min(
      MAX_BLOCK_W,
      Math.ceil(estimateMaxLineWidth(label, BLOCK_FONT, { fontWeight: 600 })) +
        28
    )
  );
  const height = Math.max(
    MIN_BLOCK_H,
    lines.length * BLOCK_LINE_H + 22
  );
  return { width, height, label, lines };
}

function measureEdgeLabel(label: string | undefined): {
  label?: string;
  lines?: string[];
  width?: number;
  height?: number;
} {
  if (!label) return {};
  const lines = wrapTextToWidth(label, EDGE_FONT, EDGE_TEXT_MAX);
  const normalized = lines.join("\n");
  return {
    label: normalized,
    lines,
    // The renderer intentionally uses italic serif for signal notation; leave
    // a conservative optical allowance beyond system-ui measurement.
    width: Math.ceil(estimateMaxLineWidth(normalized, EDGE_FONT) * 1.16) + 14,
    height: lines.length * EDGE_LINE_H + 4,
  };
}

function centeredRows(
  ids: string[],
  heightOf: (id: string) => number,
  contentHeight: number
): Map<string, number> {
  const total =
    ids.reduce((sum, id) => sum + heightOf(id), 0) +
    Math.max(0, ids.length - 1) * ROW_GAP;
  let cursor = TOP_PAD + (contentHeight - total) / 2;
  const centers = new Map<string, number>();
  for (const id of ids) {
    const height = heightOf(id);
    centers.set(id, cursor + height / 2);
    cursor += height + ROW_GAP;
  }
  return centers;
}

function portOffset(index: number, count: number, height: number): number {
  if (count <= 1) return 0;
  const available = Math.max(0, height - 24);
  const step = Math.min(18, available / Math.max(1, count - 1));
  return (index - (count - 1) / 2) * step;
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function findBlockDiagramCollisions(
  layout: BlockDiagramLayout
): BlockDiagramCollisions {
  const nodeRects = layout.nodes.flatMap((node) => {
    if (node.kind === "block") {
      return [{ id: node.id, x: node.x, y: node.y, width: node.width, height: node.height }];
    }
    if (node.kind === "sum") {
      return [{
        id: node.id,
        x: node.cx - node.r,
        y: node.cy - node.r,
        width: node.r * 2,
        height: node.r * 2,
      }];
    }
    return [];
  });
  const labelRects = layout.edges.flatMap((edge, index) =>
    edge.label && edge.labelWidth && edge.labelHeight
      ? [{
          id: `${edge.from}->${edge.to}:${index}`,
          x: edge.midX - edge.labelWidth / 2,
          y: edge.midY - edge.labelHeight / 2,
          width: edge.labelWidth,
          height: edge.labelHeight,
        }]
      : []
  );

  const collisions = (
    entries: Array<{ id: string; x: number; y: number; width: number; height: number }>
  ): string[] => {
    const result: string[] = [];
    for (let left = 0; left < entries.length; left++) {
      for (let right = left + 1; right < entries.length; right++) {
        if (rectsOverlap(entries[left]!, entries[right]!)) {
          result.push(`${entries[left]!.id}|${entries[right]!.id}`);
        }
      }
    }
    return result;
  };

  return {
    nodeNode: collisions(nodeRects),
    labelLabel: collisions(labelRects),
    labelNode: labelRects.flatMap((label) =>
      nodeRects
        .filter((node) => rectsOverlap(label, node))
        .map((node) => `${label.id}|${node.id}`)
    ),
  };
}

export function layoutBlockDiagram(ast: BlockAST): BlockDiagramLayout {
  const blockById = new Map(ast.blocks.map((block) => [block.id, block] as const));
  const sumById = new Map(ast.sums.map((sum) => [sum.id, sum] as const));
  const explicitIds = new Set([...blockById.keys(), ...sumById.keys()]);
  const nodeIds = new Set<string>(explicitIds);
  for (const edge of ast.connections) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);
  }

  const outgoing = new Map<string, BlockEdge[]>();
  const incoming = new Map<string, BlockEdge[]>();
  for (const id of nodeIds) {
    outgoing.set(id, []);
    incoming.set(id, []);
  }
  for (const edge of ast.connections) {
    outgoing.get(edge.from)?.push(edge);
    incoming.get(edge.to)?.push(edge);
  }

  const entries = [...nodeIds].filter(
    (id) => (incoming.get(id)?.length ?? 0) === 0
  );
  if (entries.length === 0 && nodeIds.size > 0) entries.push([...nodeIds][0]!);
  entries.sort((a, b) => {
    if (a === "in") return -1;
    if (b === "in") return 1;
    return 0;
  });

  // First-visit layering deliberately leaves later edges that point to an
  // earlier layer as feedback. It is stable under declaration-order changes
  // and, unlike the old fixed-row policy, never collapses peers together.
  const layer = new Map<string, number>();
  const queue = [...entries];
  for (const entry of entries) layer.set(entry, 0);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const nextLayer = (layer.get(current) ?? 0) + 1;
    for (const edge of outgoing.get(current) ?? []) {
      if (layer.has(edge.to)) continue;
      layer.set(edge.to, nextLayer);
      queue.push(edge.to);
    }
  }
  for (const id of nodeIds) {
    if (!layer.has(id)) layer.set(id, 0);
  }

  const measures = new Map<string, NodeMeasure>();
  for (const block of ast.blocks) measures.set(block.id, measureBlock(block));
  for (const sum of ast.sums) {
    measures.set(sum.id, {
      width: SUM_R * 2,
      height: SUM_R * 2,
      label: "",
      lines: [],
    });
  }
  for (const id of nodeIds) {
    if (!measures.has(id)) {
      measures.set(id, { width: 20, height: 20, label: id, lines: [id] });
    }
  }

  const maxLayer = Math.max(0, ...layer.values());
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const id of nodeIds) layers[layer.get(id) ?? 0]!.push(id);

  // Barycentric ordering keeps peers near the average row of their parents.
  for (let rank = 1; rank < layers.length; rank++) {
    const previousOrder = new Map(
      layers[rank - 1]!.map((id, index) => [id, index] as const)
    );
    layers[rank]!.sort((left, right) => {
      const score = (id: string): number => {
        const parents = (incoming.get(id) ?? [])
          .map((edge) => previousOrder.get(edge.from))
          .filter((value): value is number => value !== undefined);
        return parents.length
          ? parents.reduce((sum, value) => sum + value, 0) / parents.length
          : Number.MAX_SAFE_INTEGER;
      };
      return score(left) - score(right);
    });
  }

  const stackHeights = layers.map((ids) =>
    ids.reduce((sum, id) => sum + measures.get(id)!.height, 0) +
    Math.max(0, ids.length - 1) * ROW_GAP
  );
  const contentHeight = Math.max(MIN_BLOCK_H, ...stackHeights);
  const feedbackEdges = ast.connections.filter(
    (edge) => (layer.get(edge.to) ?? 0) <= (layer.get(edge.from) ?? 0)
  );

  const columnWidths = layers.map((ids) =>
    Math.max(MIN_BLOCK_W, ...ids.map((id) => measures.get(id)!.width))
  );
  const columnCenters: number[] = [];
  let xCursor = SIDE_PAD;
  for (const width of columnWidths) {
    columnCenters.push(xCursor + width / 2);
    xCursor += width + COL_GAP;
  }
  const width = Math.max(360, xCursor - COL_GAP + SIDE_PAD);

  const centers = new Map<string, { x: number; y: number }>();
  layers.forEach((ids, rank) => {
    const rowCenters = centeredRows(
      ids,
      (id) => measures.get(id)!.height,
      contentHeight
    );
    for (const id of ids) {
      centers.set(id, {
        x: columnCenters[rank]!,
        y: rowCenters.get(id)!,
      });
    }
  });

  const nodes: LaidNode[] = [];
  const branchCount = new Map<string, number>();
  for (const edge of ast.connections) {
    branchCount.set(edge.from, (branchCount.get(edge.from) ?? 0) + 1);
  }
  for (const id of nodeIds) {
    const center = centers.get(id)!;
    const measure = measures.get(id)!;
    const block = blockById.get(id);
    const sum = sumById.get(id);
    if (block) {
      nodes.push({
        kind: "block",
        id,
        label: measure.label,
        labelLines: measure.lines,
        role: block.role ?? "generic",
        x: center.x - measure.width / 2,
        y: center.y - measure.height / 2,
        width: measure.width,
        height: measure.height,
        hasBranch: (branchCount.get(id) ?? 0) > 1,
      });
    } else if (sum) {
      nodes.push({
        kind: "sum",
        id,
        cx: center.x,
        cy: center.y,
        r: SUM_R,
        hasBranch: (branchCount.get(id) ?? 0) > 1,
      });
    } else {
      nodes.push({
        kind: "port",
        id,
        label: id === "in" || id === "out" ? id : "",
        x: center.x,
        y: center.y,
        isInput: (incoming.get(id)?.length ?? 0) === 0,
        hasBranch: (branchCount.get(id) ?? 0) > 1,
      });
    }
  }

  const nodeHeight = (id: string): number => measures.get(id)?.height ?? 20;
  const outgoingOrder = new Map<BlockEdge, number>();
  const incomingOrder = new Map<BlockEdge, number>();
  for (const edges of outgoing.values()) {
    [...edges]
      .sort((a, b) => (centers.get(a.to)?.y ?? 0) - (centers.get(b.to)?.y ?? 0))
      .forEach((edge, index) => outgoingOrder.set(edge, index));
  }
  for (const edges of incoming.values()) {
    [...edges]
      .sort((a, b) => (centers.get(a.from)?.y ?? 0) - (centers.get(b.from)?.y ?? 0))
      .forEach((edge, index) => incomingOrder.set(edge, index));
  }

  const sourceRanksByPair = new Map<string, Map<string, number>>();
  const sourceCountsByPair = new Map<string, number>();
  for (const edge of ast.connections) {
    const fromLayer = layer.get(edge.from) ?? 0;
    const toLayer = layer.get(edge.to) ?? 0;
    if (toLayer <= fromLayer) continue;
    const key = `${fromLayer}:${toLayer}`;
    const ids = [
      ...new Set(
        ast.connections
          .filter(
            (candidate) =>
              (layer.get(candidate.from) ?? 0) === fromLayer &&
              (layer.get(candidate.to) ?? 0) === toLayer
          )
          .map((candidate) => candidate.from)
      ),
    ].sort((a, b) => (centers.get(a)?.y ?? 0) - (centers.get(b)?.y ?? 0));
    sourceRanksByPair.set(
      key,
      new Map(ids.map((id, index) => [id, index] as const))
    );
    sourceCountsByPair.set(key, ids.length);
  }

  const sumPolarity = new Map<string, Map<string, "+" | "-">>();
  for (const sum of ast.sums) {
    const values = new Map<string, "+" | "-">();
    for (const token of sum.inputs) {
      values.set(
        token.replace(/^[+-]/, ""),
        token.startsWith("-") ? "-" : "+"
      );
    }
    sumPolarity.set(sum.id, values);
  }

  const edges: LaidEdge[] = [];
  let feedbackIndex = 0;
  for (const edge of ast.connections) {
    const source = centers.get(edge.from);
    const target = centers.get(edge.to);
    if (!source || !target) continue;
    const fromLayer = layer.get(edge.from) ?? 0;
    const toLayer = layer.get(edge.to) ?? 0;
    const outgoingEdges = outgoing.get(edge.from) ?? [];
    const incomingEdges = incoming.get(edge.to) ?? [];
    const sourceY =
      source.y +
      portOffset(
        outgoingOrder.get(edge) ?? 0,
        outgoingEdges.length,
        nodeHeight(edge.from)
      );
    const targetY =
      target.y +
      portOffset(
        incomingOrder.get(edge) ?? 0,
        incomingEdges.length,
        nodeHeight(edge.to)
      );
    const sourceX = source.x + measures.get(edge.from)!.width / 2;
    const targetX = target.x - measures.get(edge.to)!.width / 2;
    const measuredLabel = measureEdgeLabel(edge.label);

    let path: string;
    let midX: number;
    let midY: number;
    let isFeedback = false;

    if (toLayer > fromLayer) {
      const pairKey = `${fromLayer}:${toLayer}`;
      const sourceRank =
        sourceRanksByPair.get(pairKey)?.get(edge.from) ?? 0;
      const sourceCount = sourceCountsByPair.get(pairKey) ?? 1;
      const fraction = (sourceRank + 1) / (sourceCount + 1);
      const channelX = sourceX + (targetX - sourceX) * fraction;
      path = Math.abs(sourceY - targetY) < 0.5
        ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
        : `M ${sourceX} ${sourceY} L ${channelX} ${sourceY} L ${channelX} ${targetY} L ${targetX} ${targetY}`;
      midX = Math.abs(sourceY - targetY) < 0.5
        ? (sourceX + targetX) / 2
        : (channelX + targetX) / 2;
      midY = targetY - 7;
    } else {
      isFeedback = true;
      const laneY =
        TOP_PAD +
        contentHeight +
        BOTTOM_PAD +
        feedbackIndex * FEEDBACK_LANE_GAP;
      feedbackIndex++;
      const sourceBottom = source.y + nodeHeight(edge.from) / 2;
      const targetBottom = target.y + nodeHeight(edge.to) / 2;
      path = `M ${source.x} ${sourceBottom} L ${source.x} ${laneY} L ${target.x} ${laneY} L ${target.x} ${targetBottom}`;
      midX = (source.x + target.x) / 2;
      midY = laneY - 7;
    }

    let polarity: LaidEdgePolarity | undefined;
    if (sumById.has(edge.to)) {
      const sign = sumPolarity.get(edge.to)?.get(edge.from) ?? "+";
      const pin = isFeedback ? "bottom" : "left";
      polarity = {
        sign,
        pin,
        x: isFeedback ? target.x - 8 : targetX - 8,
        y: isFeedback ? target.y + SUM_R + 10 : targetY + 5,
      };
    }

    edges.push({
      from: edge.from,
      to: edge.to,
      ...measuredLabel,
      discrete: !!edge.discrete,
      path,
      midX,
      midY,
      isFeedback,
      polarity,
    });
  }

  const height =
    TOP_PAD +
    contentHeight +
    BOTTOM_PAD +
    feedbackEdges.length * FEEDBACK_LANE_GAP;

  return {
    width,
    height,
    nodes,
    edges,
    title: ast.title,
    topOffset: TOP_PAD,
  };
}
