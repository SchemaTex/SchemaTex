/**
 * FBD layout — layered DAG with named ports.
 *
 * Per network:
 *   1. Build dependency graph from wires (block → block edges).
 *   2. Longest-path layering (sources at layer 0).
 *   3. Compute each block's bbox from port count.
 *   4. Within-layer y-packing.
 *   5. Place input variable terminals on the left of layer 0; output variable
 *      terminals on the right of the last layer.
 *   6. Manhattan-route each wire from src port to sink port.
 *
 * Networks stack vertically with NETWORK_GAP_Y.
 */

import type {
  FbdAst,
  FbdBlock,
  FbdLayoutBlock,
  FbdLayoutNetwork,
  FbdLayoutPort,
  FbdLayoutResult,
  FbdLayoutVarTerm,
  FbdLayoutWire,
  FbdNetwork,
  FbdPort,
  FbdWire,
} from "../../core/types";
import { getBlockSpec, isStdBlock } from "./blocks";
import { applyPins } from "../../core/editing";

export const FBD_CONST = {
  block_min_width: 64,
  block_min_height: 40,
  port_pitch: 18,
  port_stub_length: 12,
  block_padding_x: 8,
  block_padding_y: 6,
  block_header_h: 18,
  network_gap_y: 36,
  network_padding_x: 16,
  network_padding_y: 24,
  layer_spacing: 80,
  inter_block_gap: 20,
  wire_grid: 10,
  negation_bubble_r: 4,
  var_term_w: 90,
  var_term_h: 22,
  var_term_gap: 60,
  network_label_h: 18,
};

const FONT_W_HEAD = 7.5; // monospace bold approx 12px
const FONT_W_PORT = 6.2; // monospace 10px

function computeBlockSize(block: FbdBlock): { w: number; h: number } {
  const inputs = block.ports.filter((p) => p.side === "in");
  const outputs = block.ports.filter((p) => p.side === "out");
  const maxPorts = Math.max(inputs.length, outputs.length, 1);

  const headerText = block.blockType;
  const innerSym = isStdBlock(block.blockType) ? getBlockSpec(block.blockType).innerSymbol : undefined;
  const symW = innerSym ? Math.max(20, innerSym.length * 8) : 0;

  const leftLabelW = inputs.reduce((m, p) => Math.max(m, p.name.length * FONT_W_PORT), 0);
  const rightLabelW = outputs.reduce((m, p) => Math.max(m, p.name.length * FONT_W_PORT), 0);
  const headerW = headerText.length * FONT_W_HEAD;

  const width = Math.max(
    FBD_CONST.block_min_width,
    leftLabelW + rightLabelW + symW + 24,
    headerW + 16
  );
  const height = Math.max(
    FBD_CONST.block_min_height,
    FBD_CONST.block_header_h + maxPorts * FBD_CONST.port_pitch + FBD_CONST.block_padding_y
  );
  return { w: width, h: height };
}

function buildPorts(block: FbdBlock, x: number, y: number, w: number): FbdLayoutPort[] {
  const inputs = block.ports.filter((p) => p.side === "in");
  const outputs = block.ports.filter((p) => p.side === "out");
  const portsOut: FbdLayoutPort[] = [];
  inputs.forEach((p, i) => {
    const py = y + FBD_CONST.block_header_h + (i + 0.5) * FBD_CONST.port_pitch;
    portsOut.push(makePort(p, "left", x, x - FBD_CONST.port_stub_length, py));
  });
  outputs.forEach((p, i) => {
    const py = y + FBD_CONST.block_header_h + (i + 0.5) * FBD_CONST.port_pitch;
    const ex = x + w;
    portsOut.push(makePort(p, "right", ex, ex + FBD_CONST.port_stub_length, py));
  });
  return portsOut;
}

function makePort(p: FbdPort, side: "left" | "right", edgeX: number, x: number, y: number): FbdLayoutPort {
  const port: FbdLayoutPort = {
    name: p.name,
    side: side === "left" ? "in" : "out",
    x,
    y,
    edgeX,
    dataType: p.dataType,
  };
  if (p.constant !== undefined) port.constant = p.constant;
  if (p.negated) port.negated = true;
  return port;
}

interface NetworkGraph {
  /** block id → set of block ids this block depends on (incoming). */
  incoming: Map<string, Set<string>>;
  outgoing: Map<string, Set<string>>;
  /** variable references the block needs as input (left terminals). */
  inputVars: Map<string, Set<string>>;  // blockId -> var names
  /** variables the block emits to (right terminals). */
  outputVars: Map<string, Set<string>>; // blockId -> var names
}

function buildGraph(network: FbdNetwork): NetworkGraph {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  const inputVars = new Map<string, Set<string>>();
  const outputVars = new Map<string, Set<string>>();
  for (const b of network.blocks) {
    incoming.set(b.id, new Set());
    outgoing.set(b.id, new Set());
    inputVars.set(b.id, new Set());
    outputVars.set(b.id, new Set());
  }
  for (const w of network.wires) {
    if (w.from.kind === "port" && w.to.kind === "port") {
      incoming.get(w.to.blockId)?.add(w.from.blockId);
      outgoing.get(w.from.blockId)?.add(w.to.blockId);
    } else if (w.from.kind === "var" && w.to.kind === "port") {
      inputVars.get(w.to.blockId)?.add(w.from.name);
    } else if (w.from.kind === "port" && w.to.kind === "var") {
      outputVars.get(w.from.blockId)?.add(w.to.name);
    }
  }
  return { incoming, outgoing, inputVars, outputVars };
}

/** Longest-path layering. Returns blockId -> layer. */
function assignLayers(network: FbdNetwork, graph: NetworkGraph): Map<string, number> {
  const layer = new Map<string, number>();
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (id: string): number => {
    if (layer.has(id)) return layer.get(id)!;
    if (visiting.has(id)) {
      // cycle — break by treating as layer 0
      return 0;
    }
    visiting.add(id);
    let max = 0;
    for (const dep of graph.incoming.get(id) ?? []) {
      max = Math.max(max, visit(dep) + 1);
    }
    visiting.delete(id);
    layer.set(id, max);
    return max;
  };

  for (const b of network.blocks) visit(b.id);
  void visited;
  return layer;
}

function layoutNetwork(
  network: FbdNetwork,
  originX: number,
  originY: number,
  pins?: Map<string, { x: number; y: number }>
): FbdLayoutNetwork {
  const graph = buildGraph(network);

  // Compute sizes
  const sizes = new Map<string, { w: number; h: number }>();
  for (const b of network.blocks) sizes.set(b.id, computeBlockSize(b));

  // Layering
  const layerOf = assignLayers(network, graph);
  const maxLayer = Math.max(0, ...Array.from(layerOf.values()));

  // Group blocks per layer in declaration order
  const byLayer: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const b of network.blocks) byLayer[layerOf.get(b.id)!].push(b.id);

  // Identify input + output variable terminals that need columns
  const inputVarsAll = new Set<string>();
  const outputVarsAll = new Set<string>();
  for (const b of network.blocks) {
    for (const v of graph.inputVars.get(b.id) ?? []) inputVarsAll.add(v);
    for (const v of graph.outputVars.get(b.id) ?? []) outputVarsAll.add(v);
  }

  const inputVars = Array.from(inputVarsAll);
  const outputVars = Array.from(outputVarsAll);

  // X positions: pre-layer var-term column, then per-layer columns, then output-var column.
  const layerX: number[] = [];
  let cursorX = originX + FBD_CONST.network_padding_x;
  if (inputVars.length > 0) {
    cursorX += FBD_CONST.var_term_w + FBD_CONST.var_term_gap;
  } else {
    cursorX += FBD_CONST.var_term_gap;
  }
  // Compute max block width per layer
  const layerWidths: number[] = byLayer.map((ids) =>
    ids.reduce((m, id) => Math.max(m, sizes.get(id)!.w), FBD_CONST.block_min_width)
  );
  for (let l = 0; l <= maxLayer; l++) {
    layerX.push(cursorX);
    cursorX += layerWidths[l] + FBD_CONST.layer_spacing;
  }

  // Y positions: per-layer pack from top
  const blockBboxes = new Map<string, { x: number; y: number; w: number; h: number }>();
  let yMax = 0;
  for (let l = 0; l <= maxLayer; l++) {
    let y = originY + FBD_CONST.network_padding_y + FBD_CONST.network_label_h;
    for (const id of byLayer[l]) {
      const sz = sizes.get(id)!;
      const x = layerX[l];
      blockBboxes.set(id, { x, y, w: sz.w, h: sz.h });
      y += sz.h + FBD_CONST.inter_block_gap;
    }
    yMax = Math.max(yMax, y);
  }

  // Build layout blocks + ports
  const layoutBlocks: FbdLayoutBlock[] = [];
  for (const b of network.blocks) {
    const bb = blockBboxes.get(b.id)!;
    layoutBlocks.push({
      block: b,
      x: bb.x,
      y: bb.y,
      width: bb.w,
      height: bb.h,
      ports: buildPorts(b, bb.x, bb.y, bb.w),
    });
  }
  applyPins(layoutBlocks, pins, {
    id: (block) => block.block.instance ? block.block.id : `@synthetic:${block.block.id}`,
    position: (block) => block.block.instance ? "move-y" : "none",
  });
  for (const block of layoutBlocks) {
    block.ports = buildPorts(block.block, block.x, block.y, block.width);
  }

  // Place variable terminals
  const varTerms: FbdLayoutVarTerm[] = [];
  if (inputVars.length > 0) {
    const xCol = originX + FBD_CONST.network_padding_x;
    const startY = originY + FBD_CONST.network_padding_y + FBD_CONST.network_label_h + 4;
    inputVars.forEach((v, idx) => {
      varTerms.push({
        name: v,
        x: xCol,
        y: startY + idx * (FBD_CONST.var_term_h + 6),
        width: FBD_CONST.var_term_w,
        height: FBD_CONST.var_term_h,
        side: "left",
        dataType: "bool",
      });
    });
  }
  if (outputVars.length > 0) {
    const xCol = layerX[maxLayer] + layerWidths[maxLayer] + FBD_CONST.var_term_gap;
    const startY = originY + FBD_CONST.network_padding_y + FBD_CONST.network_label_h + 4;
    outputVars.forEach((v, idx) => {
      varTerms.push({
        name: v,
        x: xCol,
        y: startY + idx * (FBD_CONST.var_term_h + 6),
        width: FBD_CONST.var_term_w,
        height: FBD_CONST.var_term_h,
        side: "right",
        dataType: "bool",
      });
    });
    cursorX = xCol + FBD_CONST.var_term_w + FBD_CONST.network_padding_x;
  } else {
    cursorX = layerX[maxLayer] + layerWidths[maxLayer] + FBD_CONST.network_padding_x;
  }

  // Wires
  const wires: FbdLayoutWire[] = [];
  const junctions: { x: number; y: number }[] = [];
  // Track fan-out points to render junction circles
  const fanOutCounts = new Map<string, number>();
  for (const w of network.wires) {
    if (w.from.kind === "port") {
      const key = `${w.from.blockId}.${w.from.portName}`;
      fanOutCounts.set(key, (fanOutCounts.get(key) ?? 0) + 1);
    } else if (w.from.kind === "var") {
      const key = `var:${w.from.name}`;
      fanOutCounts.set(key, (fanOutCounts.get(key) ?? 0) + 1);
    }
  }

  const portByKey = new Map<string, FbdLayoutPort>();
  for (const lb of layoutBlocks) {
    for (const p of lb.ports) {
      portByKey.set(`${lb.block.id}.${p.name}`, p);
    }
  }
  const varTermByName = new Map<string, FbdLayoutVarTerm>();
  for (const t of varTerms) varTermByName.set(t.name, t);

  // Track per-layer column-x cursors so parallel wires don't overlap
  const colCursor: Map<number, number> = new Map();

  for (const w of network.wires) {
    const path = routeWire(w, portByKey, varTermByName, colCursor, layerX, layerWidths);
    if (path) {
      wires.push({ wire: w, path });
    }
  }

  // Junctions at fan-out source points
  for (const [key, count] of fanOutCounts) {
    if (count < 2) continue;
    if (key.startsWith("var:")) {
      const name = key.slice(4);
      const t = varTermByName.get(name);
      if (t && t.side === "left") {
        junctions.push({ x: t.x + t.width, y: t.y + t.height / 2 });
      }
    } else {
      const p = portByKey.get(key);
      if (p) junctions.push({ x: p.x, y: p.y });
    }
  }

  const pinnedYMax = Math.max(yMax, ...layoutBlocks.map((block) => block.y + block.height));
  const width = Math.max(
    cursorX - originX,
    ...layoutBlocks.map((block) => block.x + block.width + FBD_CONST.network_padding_x - originX),
  );
  const height = Math.max(
    pinnedYMax - originY + FBD_CONST.network_padding_y,
    FBD_CONST.block_min_height + FBD_CONST.network_label_h + FBD_CONST.network_padding_y * 2
  );

  return {
    network,
    x: originX,
    y: originY,
    width,
    height,
    blocks: layoutBlocks,
    wires,
    varTerms,
    junctions,
  };
}

function routeWire(
  w: FbdWire,
  portByKey: Map<string, FbdLayoutPort>,
  varTermByName: Map<string, FbdLayoutVarTerm>,
  colCursor: Map<number, number>,
  layerX: number[],
  layerWidths: number[]
): string | undefined {
  let sx = 0, sy = 0, ex = 0, ey = 0;

  if (w.from.kind === "port") {
    const p = portByKey.get(`${w.from.blockId}.${w.from.portName}`);
    if (!p) return undefined;
    sx = p.x;
    sy = p.y;
  } else {
    const t = varTermByName.get(w.from.name);
    if (!t) return undefined;
    sx = t.x + t.width;
    sy = t.y + t.height / 2;
  }

  if (w.to.kind === "port") {
    const p = portByKey.get(`${w.to.blockId}.${w.to.portName}`);
    if (!p) return undefined;
    ex = p.x;
    ey = p.y;
  } else {
    const t = varTermByName.get(w.to.name);
    if (!t) return undefined;
    ex = t.x;
    ey = t.y + t.height / 2;
  }

  // Manhattan with one mid column
  const midX = sx + (ex - sx) / 2;
  // Find layer index between source and sink for column offset
  let layerIdx = -1;
  for (let i = 0; i < layerX.length - 1; i++) {
    const between = layerX[i] + layerWidths[i];
    const next = layerX[i + 1];
    if (sx >= between - 1 && ex <= next + 1) {
      layerIdx = i;
      break;
    }
  }
  let column = midX;
  if (layerIdx >= 0) {
    const offset = colCursor.get(layerIdx) ?? 0;
    column = layerX[layerIdx] + layerWidths[layerIdx] + 16 + offset;
    colCursor.set(layerIdx, offset + FBD_CONST.wire_grid);
  }

  if (Math.abs(sy - ey) < 0.5) {
    return `M ${sx} ${sy} L ${ex} ${ey}`;
  }
  return `M ${sx} ${sy} L ${column} ${sy} L ${column} ${ey} L ${ex} ${ey}`;
}

export function layoutFbd(ast: FbdAst, pins?: Map<string, { x: number; y: number }>): FbdLayoutResult {
  const networks: FbdLayoutNetwork[] = [];
  let cursorY = 0;
  let maxWidth = 0;
  for (const net of ast.networks) {
    const ln = layoutNetwork(net, 0, cursorY, pins);
    networks.push(ln);
    cursorY = ln.y + ln.height + FBD_CONST.network_gap_y;
    maxWidth = Math.max(maxWidth, ln.width);
  }
  // Normalize all networks to share the max width (so frames line up)
  for (const n of networks) n.width = maxWidth;
  return {
    ast,
    networks,
    width: maxWidth,
    height: cursorY,
  };
}
