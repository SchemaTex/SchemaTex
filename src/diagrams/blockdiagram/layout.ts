import { orthogonalRoute, compactRoute, intersectsBox, type RoutedNet } from "../logic/orthogonal-router";
import { labelPathPoints, edgeLabelObstacles, labelOverlap } from "../../core/label-placement";
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
const MIN_COL_GAP = 64;
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
    // Signal names use italic text; leave
    // a conservative optical allowance beyond system-ui measurement.
    width: Math.ceil(estimateMaxLineWidth(normalized, EDGE_FONT) * 1.16) + 14,
    height: lines.length * EDGE_LINE_H + 4,
  };
}

function centeredRows(
  ids: string[],
  heightOf: (id: string) => number,
  contentHeight: number,
  top: number = TOP_PAD
): Map<string, number> {
  const total =
    ids.reduce((sum, id) => sum + heightOf(id), 0) +
    Math.max(0, ids.length - 1) * ROW_GAP;
  let cursor = top + (contentHeight - total) / 2;
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

  // Separate actual cycle-closing edges, then rank the remaining DAG by
  // longest path. A shortcut (power/control feeding multiple stages) must not
  // collapse those successive stages into the same column.
  const visited = new Set<string>(), active = new Set<string>();
  const reverseOrder: string[] = [];
  const feedback = new Set<BlockEdge>();
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    visited.add(id); active.add(id);
    for (const edge of outgoing.get(id) ?? []) {
      if (active.has(edge.to)) feedback.add(edge);
      else visit(edge.to);
    }
    active.delete(id); reverseOrder.push(id);
  };
  for (const id of [...entries, ...nodeIds]) visit(id);
  const layer = new Map([...nodeIds].map(id => [id, 0]));
  for (const id of reverseOrder.reverse()) {
    for (const edge of outgoing.get(id) ?? []) {
      if (!feedback.has(edge)) layer.set(edge.to, Math.max(layer.get(edge.to)!, layer.get(id)! + 1));
    }
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

  // A return-path block (for example a feedback sensor) is not another stage
  // in the forward pipeline. Detect it from topology and place it in a
  // dedicated side band. This keeps the main path aligned without relying on
  // role names or diagram-specific IDs.
  const feedbackNodeSide = new Map<string, "above" | "below">();
  for (const id of nodeIds) {
    const ins = incoming.get(id) ?? [];
    const outs = outgoing.get(id) ?? [];
    if (
      explicitIds.has(id) &&
      ins.length > 0 &&
      outs.length > 0 &&
      outs.every(
        (edge) => (layer.get(edge.to) ?? 0) < (layer.get(id) ?? 0)
      )
    ) {
      feedbackNodeSide.set(
        id,
        blockById.get(id)?.route === "above" ? "above" : "below"
      );
    }
  }

  const normalLayers = layers.map((ids) =>
    ids.filter((id) => !feedbackNodeSide.has(id))
  );
  const stackHeights = normalLayers.map((ids) =>
    ids.reduce((sum, id) => sum + measures.get(id)!.height, 0) +
    Math.max(0, ids.length - 1) * ROW_GAP
  );
  const contentHeight = Math.max(MIN_BLOCK_H, ...stackHeights);
  const feedbackEdges = ast.connections.filter(
    (edge) => (layer.get(edge.to) ?? 0) <= (layer.get(edge.from) ?? 0)
  );
  const feedbackEdgeSide = (edge: BlockEdge): "above" | "below" =>
    feedbackNodeSide.get(edge.from) === "above" ? "above" : "below";
  const aboveFeedbackCount = feedbackEdges.filter(
    (edge) => feedbackEdgeSide(edge) === "above"
  ).length;
  const belowFeedbackCount = feedbackEdges.length - aboveFeedbackCount;
  const feedbackNodes = [...feedbackNodeSide].sort(
    ([left], [right]) =>
      (layer.get(left) ?? 0) - (layer.get(right) ?? 0) ||
      layers[layer.get(left) ?? 0]!.indexOf(left) -
        layers[layer.get(right) ?? 0]!.indexOf(right)
  );
  const aboveFeedbackNodes = feedbackNodes
    .filter(([, side]) => side === "above")
    .map(([id]) => id);
  const belowFeedbackNodes = feedbackNodes
    .filter(([, side]) => side === "below")
    .map(([id]) => id);
  const stackHeight = (ids: string[]): number =>
    ids.reduce((sum, id) => sum + measures.get(id)!.height, 0) +
    Math.max(0, ids.length - 1) * ROW_GAP;
  const aboveStackHeight = stackHeight(aboveFeedbackNodes);
  const belowStackHeight = stackHeight(belowFeedbackNodes);
  const aboveLaneBand = aboveFeedbackCount * FEEDBACK_LANE_GAP;
  const normalTop =
    TOP_PAD +
    aboveLaneBand +
    aboveStackHeight +
    (aboveFeedbackNodes.length > 0 ? ROW_GAP : 0);

  const columnWidths = layers.map((ids) =>
    Math.max(MIN_BLOCK_W, ...ids.map((id) => measures.get(id)!.width))
  );
  // Horizontal whitespace is a measured property of the edges between two
  // columns. Short labels should not force poster-wide diagrams, while the
  // last of several fan-out channels still gets enough room for its label.
  const pairSources = new Map<string, string[]>();
  for (const edge of ast.connections) {
    const fromLayer = layer.get(edge.from) ?? 0;
    const toLayer = layer.get(edge.to) ?? 0;
    if (toLayer <= fromLayer) continue;
    const key = `${fromLayer}:${toLayer}`;
    const ids = pairSources.get(key) ?? [];
    if (!ids.includes(edge.from)) ids.push(edge.from);
    pairSources.set(key, ids);
  }
  for (const [key, ids] of pairSources) {
    const fromLayer = Number(key.split(":")[0]);
    ids.sort(
      (left, right) =>
        layers[fromLayer]!.indexOf(left) - layers[fromLayer]!.indexOf(right)
    );
  }
  const columnGaps = Array.from(
    { length: Math.max(0, layers.length - 1) },
    () => MIN_COL_GAP
  );
  for (const edge of ast.connections) {
    const fromLayer = layer.get(edge.from) ?? 0;
    const toLayer = layer.get(edge.to) ?? 0;
    if (toLayer !== fromLayer + 1) continue;
    const sources = pairSources.get(`${fromLayer}:${toLayer}`) ?? [edge.from];
    const sourceRank = Math.max(0, sources.indexOf(edge.from));
    const remainingFraction = 1 - (sourceRank + 1) / (sources.length + 1);
    const labelWidth = measureEdgeLabel(edge.label).width ?? 0;
    const required = labelWidth > 0
      ? Math.ceil((labelWidth + 12) / Math.max(0.2, remainingFraction))
      : MIN_COL_GAP;
    columnGaps[fromLayer] = Math.max(
      columnGaps[fromLayer] ?? MIN_COL_GAP,
      required
    );
  }
  const columnCenters: number[] = [];
  let xCursor = SIDE_PAD;
  for (let rank = 0; rank < columnWidths.length; rank++) {
    const width = columnWidths[rank]!;
    columnCenters.push(xCursor + width / 2);
    xCursor += width + (columnGaps[rank] ?? 0);
  }
  let width = Math.max(360, xCursor + SIDE_PAD);

  const centers = new Map<string, { x: number; y: number }>();
  normalLayers.forEach((ids, rank) => {
    const rowCenters = centeredRows(
      ids,
      (id) => measures.get(id)!.height,
      contentHeight,
      normalTop
    );
    for (const id of ids) {
      centers.set(id, {
        x: columnCenters[rank]!,
        y: rowCenters.get(id)!,
      });
    }
  });
  let aboveCursor = TOP_PAD + aboveLaneBand;
  for (const id of aboveFeedbackNodes) {
    const measure = measures.get(id)!;
    centers.set(id, {
      x: columnCenters[layer.get(id) ?? 0]!,
      y: aboveCursor + measure.height / 2,
    });
    aboveCursor += measure.height + ROW_GAP;
  }
  let belowCursor =
    normalTop +
    contentHeight +
    (belowFeedbackNodes.length > 0 ? ROW_GAP : 0);
  for (const id of belowFeedbackNodes) {
    const measure = measures.get(id)!;
    centers.set(id, {
      x: columnCenters[layer.get(id) ?? 0]!,
      y: belowCursor + measure.height / 2,
    });
    belowCursor += measure.height + ROW_GAP;
  }

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
  for (const [key, pairIds] of pairSources) {
    const ids = [...pairIds].sort(
      (left, right) =>
        (centers.get(left)?.y ?? 0) - (centers.get(right)?.y ?? 0)
    );
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
  let aboveFeedbackIndex = 0;
  let belowFeedbackIndex = 0;
  const belowStackEnd =
    normalTop +
    contentHeight +
    (belowFeedbackNodes.length > 0 ? ROW_GAP + belowStackHeight : 0);
  const belowLaneStart = belowStackEnd + BOTTOM_PAD;
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
      const side = feedbackEdgeSide(edge);
      const laneY = side === "above"
        ? TOP_PAD + aboveFeedbackIndex++ * FEEDBACK_LANE_GAP
        : belowLaneStart + belowFeedbackIndex++ * FEEDBACK_LANE_GAP;
      const sourceEdgeY = side === "above"
        ? source.y - nodeHeight(edge.from) / 2
        : source.y + nodeHeight(edge.from) / 2;
      const targetEdgeY = side === "above"
        ? target.y - nodeHeight(edge.to) / 2
        : target.y + nodeHeight(edge.to) / 2;
      path = `M ${source.x} ${sourceEdgeY} L ${source.x} ${laneY} L ${target.x} ${laneY} L ${target.x} ${targetEdgeY}`;
      midX = (source.x + target.x) / 2;
      midY = laneY + (side === "above" ? 7 : -7);
    }

    let polarity: LaidEdgePolarity | undefined;
    if (sumById.has(edge.to)) {
      const sign = sumPolarity.get(edge.to)?.get(edge.from) ?? "+";
      const side = feedbackEdgeSide(edge);
      const pin = isFeedback ? side === "above" ? "top" : "bottom" : "left";
      polarity = {
        sign,
        pin,
        x: isFeedback ? target.x - 8 : targetX - 8,
        y: isFeedback
          ? target.y + (side === "above" ? -SUM_R - 4 : SUM_R + 10)
          : targetY + 5,
      };
    }

    edges.push({
      from: edge.from,
      to: edge.to,
      label: measuredLabel.label,
      labelLines: measuredLabel.lines,
      labelWidth: measuredLabel.width,
      labelHeight: measuredLabel.height,
      discrete: !!edge.discrete,
      path,
      midX,
      midY,
      isFeedback,
      polarity,
    });
  }

  const routeBoxes = nodes.map(n => n.kind === "block"
    ? {id:n.id,left:n.x-16,right:n.x+n.width+16,top:n.y-16,bottom:n.y+n.height+16}
    : n.kind === "sum" ? {id:n.id,left:n.cx-n.r-16,right:n.cx+n.r+16,top:n.cy-n.r-16,bottom:n.cy+n.r+16} : undefined).filter(n => n !== undefined);
  const routed: RoutedNet[] = [];
  for (const edge of edges) {
    let points = labelPathPoints(edge.path);
    const blocked = points.slice(1).some((p,i) => routeBoxes.some(box => box.id !== edge.from && box.id !== edge.to && intersectsBox(points[i]!,p,box)));
    if (blocked && !edge.isFeedback) {
      const start = points[0]!, end = points[points.length-1]!;
      points = compactRoute([start, ...orthogonalRoute({x:start.x+24,y:start.y},{x:end.x-24,y:end.y},routeBoxes,routed,String(routed.length)),end]);
      edge.path = points.map((p,i)=>`${i?"L":"M"} ${p.x} ${p.y}`).join(" ");
    }
    routed.push({net:String(routed.length),points});
  }

  // Labels belong to a clear horizontal run, not necessarily its final run.
  // Keep the nearest collision-free position on their own edge.
  const occupied = nodes.flatMap(node => node.kind === "block"
    ? [{ x: node.x - 5, y: node.y - 5, width: node.width + 10, height: node.height + 10 }]
    : node.kind === "sum" ? [{ x: node.cx - node.r - 5, y: node.cy - node.r - 5, width: node.r * 2 + 10, height: node.r * 2 + 10 }] : []);
  const wireObstacles = edges.flatMap(edge => edgeLabelObstacles(labelPathPoints(edge.path)));
  for (const edge of edges) {
    if (!edge.labelWidth || !edge.labelHeight) continue;
    const width = edge.labelWidth, height = edge.labelHeight;
    const points = labelPathPoints(edge.path);
    const candidates: {x:number;y:number}[] = [];
    for (let i = points.length-1; i > 0; i--) {
      const a=points[i-1]!,b=points[i]!;
      if (a.y===b.y && Math.abs(a.x-b.x)>16) {
        for (const fraction of [0.5,0.25,0.75]) for (const sign of [-1,1]) candidates.push({x:a.x+(b.x-a.x)*fraction,y:a.y+sign*(height/2+7)});
      } else if (a.x===b.x && Math.abs(a.y-b.y)>height+8) {
        for (const fraction of [0.5,0.25,0.75]) for (const sign of [1,-1]) candidates.push({x:a.x+sign*(width/2+7),y:a.y+(b.y-a.y)*fraction});
      }
    }
    let best={x:edge.midX,y:edge.midY},score=Infinity,wireScore=Infinity;
    for (const p of candidates) {
      const rect={x:p.x-width/2,y:p.y-height/2,width,height};
      // Never trade text over a block for fewer wire intersections in a
      // dense fanout: preserve nodes and other labels before scoring wires.
      const overlap=occupied.reduce((sum,o)=>sum+labelOverlap(rect,o),0);
      const wireOverlap=wireObstacles.reduce((sum,o)=>sum+labelOverlap(rect,o),0);
      if (overlap<score || (overlap===score && wireOverlap<wireScore)) {best=p;score=overlap;wireScore=wireOverlap;}
      if (!score && !wireScore) break;
    }
    edge.midX=best.x;edge.midY=best.y;
    occupied.push({x:best.x-width/2-3,y:best.y-height/2-3,width:width+6,height:height+6});
  }

  let height =
    belowLaneStart +
    Math.max(BOTTOM_PAD, belowFeedbackCount * FEEDBACK_LANE_GAP);

  for (const edge of edges) {
    for (const p of labelPathPoints(edge.path)) {width=Math.max(width,p.x+SIDE_PAD);height=Math.max(height,p.y+BOTTOM_PAD);}
    width=Math.max(width,edge.midX+(edge.labelWidth??0)/2+SIDE_PAD);
    height=Math.max(height,edge.midY+(edge.labelHeight??0)/2+BOTTOM_PAD);
  }

  return {
    width,
    height,
    nodes,
    edges,
    title: ast.title,
    topOffset: TOP_PAD,
  };
}
