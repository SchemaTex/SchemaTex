import type { LogicGateAST } from "../../core/types";
import { getGateGeometry, type GateGeometry } from "./symbols";

export interface LogicLayoutNode {
  id: string;
  kind: "input" | "gate" | "output";
  x: number;
  y: number;
  layer: number;
  geometry?: GateGeometry;
  gateType?: string;
  label: string;
  isActiveLow?: boolean;
}

export interface LogicLayoutWire {
  fromNode: string;
  fromX: number;
  fromY: number;
  toNode: string;
  toX: number;
  toY: number;
  isActiveLow?: boolean;
  path: string;
}

export interface LogicLayoutModule {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LogicLayoutResult {
  width: number;
  height: number;
  nodes: LogicLayoutNode[];
  wires: LogicLayoutWire[];
  modules: LogicLayoutModule[];
}

const LAYER_GAP = 80; // extra horizontal gap between layers
const ROW_GAP = 40;   // vertical gap between rows in same layer
const PORT_SIZE = 40; // input/output port pseudo-box width
const PORT_H = 30;

export function layoutLogic(ast: LogicGateAST): LogicLayoutResult {
  // Determine layer per signal id using longest-path layering
  const layerOf = new Map<string, number>();
  for (const inp of ast.inputs) layerOf.set(inp.id, 0);

  // Build dependency map for gates
  const pending = new Set(ast.gates.map((g) => g.id));
  let safety = 0;
  while (pending.size > 0 && safety++ < 1000) {
    for (const g of ast.gates) {
      if (!pending.has(g.id)) continue;
      let maxDep = -1;
      let ready = true;
      for (const inp of g.inputs) {
        const clean = inp.startsWith("~") ? inp.slice(1) : inp;
        const l = layerOf.get(clean);
        if (l === undefined) {
          ready = false;
          break;
        }
        if (l > maxDep) maxDep = l;
      }
      if (ready) {
        layerOf.set(g.id, maxDep + 1);
        pending.delete(g.id);
      }
    }
  }
  if (pending.size > 0) {
    // cycle or unresolved: force layer 1
    for (const id of pending) layerOf.set(id, 1);
  }

  const outputLayer =
    Math.max(0, ...Array.from(layerOf.values())) + 1;
  // All outputs get a terminal label node. Use synthetic id to avoid colliding
  // with a gate that shares the output's name (e.g. `output Y; Y = AND(A,B)`).
  const outTermId = (o: { id: string }) => `$out$${o.id}`;
  const portOutputs = ast.outputs.map((o) => ({
    ...o,
    termId: outTermId(o),
    source: o.from,
  }));
  for (const o of portOutputs) layerOf.set(o.termId, outputLayer);

  // Group ids by layer
  const layers = new Map<number, string[]>();
  const addToLayer = (id: string, layer: number) => {
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(id);
  };
  for (const i of ast.inputs) addToLayer(i.id, 0);
  for (const g of ast.gates) addToLayer(g.id, layerOf.get(g.id)!);
  for (const o of portOutputs) addToLayer(o.termId, outputLayer);

  // Compute sizes per node (precompute geometries for gates)
  const gateGeoms = new Map<string, GateGeometry>();
  for (const g of ast.gates) {
    gateGeoms.set(g.id, getGateGeometry(g.gateType, g.inputs.length));
  }

  // Assign coordinates
  const nodes: LogicLayoutNode[] = [];
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

  // compute each layer's widest node
  const layerWidth = new Map<number, number>();
  for (const [layerIdx, ids] of layers) {
    let maxW = 60;
    for (const id of ids) {
      const g = gateGeoms.get(id);
      if (g && g.width > maxW) maxW = g.width;
      if (!g && layerIdx === 0) maxW = Math.max(maxW, PORT_SIZE);
      if (!g && layerIdx === outputLayer) maxW = Math.max(maxW, PORT_SIZE);
    }
    layerWidth.set(layerIdx, maxW);
  }

  let cursorX = 20;
  const layerStartMap = new Map<number, number>();
  for (const layerIdx of sortedLayers) {
    layerStartMap.set(layerIdx, cursorX);
    cursorX += (layerWidth.get(layerIdx) ?? 60) + LAYER_GAP;
  }
  const totalW = cursorX;

  // Compute vertical placement per layer
  const heightOf = (id: string): number => {
    const g = gateGeoms.get(id);
    if (g) return g.height;
    return PORT_H;
  };

  // find max column height
  let maxColH = 0;
  for (const ids of layers.values()) {
    const total = ids.reduce((s, id) => s + heightOf(id), 0) + (ids.length - 1) * ROW_GAP;
    if (total > maxColH) maxColH = total;
  }
  const totalH = maxColH + 80;

  const nodeInfo = new Map<string, LogicLayoutNode>();
  for (const [layerIdx, ids] of layers) {
    const xStart = layerStartMap.get(layerIdx)!;
    const total = ids.reduce((s, id) => s + heightOf(id), 0) + (ids.length - 1) * ROW_GAP;
    let y = 40 + (maxColH - total) / 2;
    for (const id of ids) {
      const h = heightOf(id);
      const g = gateGeoms.get(id);
      let node: LogicLayoutNode;
      if (layerIdx === 0) {
        const inp = ast.inputs.find((i) => i.id === id)!;
        node = {
          id,
          kind: "input",
          x: xStart,
          y,
          layer: 0,
          label: inp.label,
          isActiveLow: inp.isActiveLow,
        };
      } else if (layerIdx === outputLayer && !g && id.startsWith("$out$")) {
        const out = portOutputs.find((o) => o.termId === id)!;
        node = {
          id,
          kind: "output",
          x: xStart,
          y,
          layer: outputLayer,
          label: out.label,
          isActiveLow: out.isActiveLow,
        };
      } else {
        node = {
          id,
          kind: "gate",
          x: xStart,
          y,
          layer: layerIdx,
          geometry: g,
          gateType: ast.gates.find((gg) => gg.id === id)!.gateType,
          label: id,
        };
      }
      nodes.push(node);
      nodeInfo.set(id, node);
      y += h + ROW_GAP;
    }
  }

  // Wires
  const wires: LogicLayoutWire[] = [];
  const getSourcePoint = (id: string) => {
    const n = nodeInfo.get(id);
    if (!n) return null;
    if (n.kind === "input") return { x: n.x + PORT_SIZE, y: n.y + PORT_H / 2 };
    if (n.kind === "gate" && n.geometry) {
      const out = n.geometry.outputPins[0];
      return { x: n.x + out.x, y: n.y + out.y };
    }
    return null;
  };

  for (const g of ast.gates) {
    const target = nodeInfo.get(g.id);
    if (!target || !target.geometry) continue;
    g.inputs.forEach((rawInp, idx) => {
      const isLow = rawInp.startsWith("~");
      const srcId = isLow ? rawInp.slice(1) : rawInp;
      const src = getSourcePoint(srcId);
      if (!src) return;
      const pin = target.geometry!.inputPins[idx];
      if (!pin) return;
      const toX = target.x + pin.x;
      const toY = target.y + pin.y;
      const midX = (src.x + toX) / 2;
      const path = `M ${src.x},${src.y} L ${midX},${src.y} L ${midX},${toY} L ${toX},${toY}`;
      wires.push({
        fromNode: srcId,
        fromX: src.x,
        fromY: src.y,
        toNode: g.id,
        toX,
        toY,
        isActiveLow: isLow,
        path,
      });
    });
  }

  // Output port wires
  for (const o of portOutputs) {
    const src = getSourcePoint(o.source);
    const target = nodeInfo.get(o.termId);
    if (!src || !target || target.kind !== "output") continue;
    const toX = target.x;
    const toY = target.y + PORT_H / 2;
    let path: string;
    if (Math.abs(src.y - toY) < 0.5) {
      path = `M ${src.x},${src.y} L ${toX},${toY}`;
    } else {
      const midX = (src.x + toX) / 2;
      path = `M ${src.x},${src.y} L ${midX},${src.y} L ${midX},${toY} L ${toX},${toY}`;
    }
    wires.push({
      fromNode: o.source,
      fromX: src.x,
      fromY: src.y,
      toNode: o.termId,
      toX,
      toY,
      path,
    });
  }

  // Module bounding boxes (dashed enclosure for sub-circuits)
  const modules: LogicLayoutModule[] = [];
  if (ast.modules && ast.modules.length > 0) {
    const PAD = 14;
    for (const mod of ast.modules) {
      const memberIds = new Set(
        ast.gates.filter((g) => g.moduleId === mod.id).map((g) => g.id)
      );
      if (memberIds.size === 0) continue;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of nodes) {
        if (!memberIds.has(n.id)) continue;
        const w = n.geometry?.width ?? 60;
        const h = n.geometry?.height ?? 60;
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + w > maxX) maxX = n.x + w;
        if (n.y + h > maxY) maxY = n.y + h;
      }
      if (!isFinite(minX)) continue;
      modules.push({
        id: mod.id,
        label: mod.label,
        x: minX - PAD,
        y: minY - PAD - 4,
        width: maxX - minX + PAD * 2,
        height: maxY - minY + PAD * 2 + 4,
      });
    }
  }

  return { width: totalW, height: totalH, nodes, wires, modules };
}
