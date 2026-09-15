/**
 * Threat Model layout — deterministic node placement + trust-boundary
 * containment boxes.
 *
 * Layering (left→right, DFD convention §7 of 31-DFD-STANDARD):
 *  - Build a longest-path layer index over the flow DAG (cycles broken by
 *    declaration order). Source-only externals drift left, sink-only externals
 *    right, processes/stores in the middle.
 *  - Within a layer, order by declaration to stay deterministic.
 *  - Data stores are nudged into a band slightly below their layer row so they
 *    read as "beneath the process they serve".
 *
 * Trust boundaries reuse the network engine's C4-style approach (read, not
 * shared): each boundary box is the union of its members' geometry inflated by
 * a fixed padding, with a header strip for the label (§5.5/§7.8 of 31).
 *
 * Fully deterministic — no randomness, stable given identical input.
 */

import type {
  LaidOutBoundary,
  LaidOutFlow,
  LaidOutNode,
  NodeStride,
  ThreatModelAst,
  ThreatModelLayout,
} from "./types";
import { estimateTextWidth, wrapTextToWidth } from "../../core/text-metrics";
import { placeLabel, edgeLabelObstacles, labelOverlap } from "../../core/label-placement";
import { analyseThreatModel } from "./analysis";

export const TM_CONST = {
  PAD: 24,
  /** Column (layer) pitch, left→right. */
  COL_GAP: 200,
  /** Row pitch within a column. */
  ROW_GAP: 110,
  EXTERNAL_W: 120,
  EXTERNAL_H: 60,
  PROCESS_R: 40,
  STORE_W: 150,
  STORE_H: 44,
  /** Extra downward nudge for data stores (the "store band" feel). */
  STORE_DROP: 36,
  /** Trust-boundary inflation around member geometry. */
  BOUNDARY_PAD: 18,
  /** Header strip height above a boundary box for its name tab. */
  BOUNDARY_HEADER: 22,
  /** Reserve at top for the title. */
  TITLE_H: 34,
  /** Clear gap between the title band and the top of the highest trust boundary. */
  TITLE_GAP: 10,
} as const;

interface Sized {
  w: number;
  h: number;
}

function sizeOf(kind: LaidOutNode["kind"]): Sized {
  switch (kind) {
    case "external":
      return { w: TM_CONST.EXTERNAL_W, h: TM_CONST.EXTERNAL_H };
    case "process":
      return { w: TM_CONST.PROCESS_R * 2, h: TM_CONST.PROCESS_R * 2 };
    case "store":
      return { w: TM_CONST.STORE_W, h: TM_CONST.STORE_H };
  }
}

export function layoutThreatModel(ast: ThreatModelAst): ThreatModelLayout {
  const analysis = analyseThreatModel(ast);
  const strideById = new Map<string, NodeStride>(
    analysis.nodes.map((n) => [n.id, n] as const)
  );

  const ids = ast.nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const indexOf = new Map(ids.map((id, idx) => [id, idx] as const));

  // ── Longest-path layer assignment over the flow DAG ──
  const outAdj = new Map<string, string[]>();
  for (const id of ids) outAdj.set(id, []);
  for (const f of ast.flows) {
    if (idSet.has(f.source) && idSet.has(f.target) && f.source !== f.target) {
      outAdj.get(f.source)!.push(f.target);
    }
  }

  const layer = new Map<string, number>();
  // Cycle-safe longest path via memoised DFS with an on-stack guard.
  const onStack = new Set<string>();
  const computeLayer = (id: string): number => {
    const cached = layer.get(id);
    if (cached !== undefined) return cached;
    if (onStack.has(id)) return 0; // back-edge: treat as layer 0 contribution
    onStack.add(id);
    // Layer = longest predecessor chain. We compute via successors → invert by
    // walking predecessors; simpler: layer(n) = 1 + max(layer(pred)).
    let best = 0;
    for (const f of ast.flows) {
      if (f.target === id && f.source !== id && idSet.has(f.source)) {
        best = Math.max(best, computeLayer(f.source) + 1);
      }
    }
    onStack.delete(id);
    layer.set(id, best);
    return best;
  };
  for (const id of ids) computeLayer(id);

  // Pin pure-source externals to layer 0, pure-sink externals to the last layer.
  let maxLayer = 0;
  for (const v of layer.values()) maxLayer = Math.max(maxLayer, v);
  for (const n of ast.nodes) {
    if (n.kind !== "external") continue;
    const hasIn = ast.flows.some((f) => f.target === n.id);
    const hasOut = ast.flows.some((f) => f.source === n.id);
    if (hasOut && !hasIn) layer.set(n.id, 0);
    else if (hasIn && !hasOut) layer.set(n.id, maxLayer);
  }
  maxLayer = 0;
  for (const v of layer.values()) maxLayer = Math.max(maxLayer, v);

  // ── Group ids by layer, stable order ──
  const byLayer = new Map<number, string[]>();
  for (let l = 0; l <= maxLayer; l++) byLayer.set(l, []);
  const sortedIds = [...ids].sort(
    (a, b) => (indexOf.get(a)! - indexOf.get(b)!)
  );
  for (const id of sortedIds) {
    const l = layer.get(id) ?? 0;
    byLayer.get(l)!.push(id);
  }

  // A declared trust zone is a spatial container, not an overlay painted across
  // unrelated nodes. Order zones by the flow-derived layer, keeping their members
  // together. Without boundaries, retain the flow layers.
  const columns: string[][] = ast.boundaries.length > 0
    ? [...ast.boundaries.map(b => [...new Set(b.members)].filter(id => idSet.has(id))),
      ...ids.filter(id => !ast.boundaries.some(b => b.members.includes(id))).map(id => [id])]
      .filter(column => column.length > 0)
      .sort((a, b) => Math.min(...a.map(id => layer.get(id)!)) - Math.min(...b.map(id => layer.get(id)!)))
    : [...byLayer.values()];
  const nodes: LaidOutNode[] = [];
  const nodeMap = new Map<string, LaidOutNode>();
  const x0 = TM_CONST.PAD + TM_CONST.BOUNDARY_PAD;
  const y0 = TM_CONST.PAD + TM_CONST.TITLE_H + TM_CONST.BOUNDARY_HEADER + TM_CONST.BOUNDARY_PAD + 24;
  let columnX = x0;
  for (const column of columns) {
    const measured = column.map(id => {
      const src = ast.nodes.find(n => n.id === id)!;
      const labelLines = wrapTextToWidth(src.label, 12, src.kind === "process" ? 100 : 140, {fontWeight: 600});
      const labelWidth = Math.max(...labelLines.map(line => estimateTextWidth(line, 12, {fontWeight: 600})));
      const base = sizeOf(src.kind);
      const diameter = Math.max(base.w, Math.hypot(labelWidth, labelLines.length * 15) + 24);
      return {src, labelLines, w: src.kind === "process" ? diameter : Math.max(base.w, labelWidth + 28),
        h: src.kind === "process" ? diameter : Math.max(base.h, labelLines.length * 15 + 24)};
    });
    const boundary = ast.boundaries.find(b => column.some(id => b.members.includes(id)));
    const headerWidth = boundary ? estimateTextWidth(boundary.name, 10, {fontWeight: 700}) + 16 : 0;
    const columnWidth = Math.max(headerWidth, ...measured.map(n => n.w));
    let cursorY = y0;
    for (const {src, labelLines, w, h} of measured) {
      const node: LaidOutNode = {...src, labelLines, x: columnX + (columnWidth - w) / 2,
        y: cursorY, w, h, cx: columnX + columnWidth / 2, cy: cursorY + h / 2,
        stride: strideById.get(src.id)!};
      nodes.push(node); nodeMap.set(src.id, node);
      cursorY += h + 74; // badge, annotation and connection channel
    }
    const maxFlowLabel = Math.max(0, ...analysis.flows.filter(f => column.includes(f.source))
      .map(f => estimateTextWidth(f.label, 10)));
    columnX += columnWidth + Math.max(100, Math.min(190, maxFlowLabel + 24));
  }

  // ── Flow routing (straight center-to-center polyline with a slight elbow) ──
  const flows: LaidOutFlow[] = [];
  for (const f of analysis.flows) {
    const s = nodeMap.get(f.source);
    const tg = nodeMap.get(f.target);
    if (!s || !tg) continue;
    const points = routeFlow(s, tg, nodes, flows.length);
    const longest = points.slice(1).map((end, i) => ({start: points[i], end}))
      .sort((a, b) => Math.hypot(b.end.x-b.start.x,b.end.y-b.start.y)-Math.hypot(a.end.x-a.start.x,a.end.y-a.start.y))[0];
    const {start, end} = longest;
    flows.push({
      ...f,
      points,
      labelX: (start.x + end.x) / 2,
      labelY: (start.y + end.y) / 2 - 6,
    });
  }

  // ── Trust boundaries: union of member geometry + padding (C4-style) ──
  const boundaries: LaidOutBoundary[] = [];
  for (const b of ast.boundaries) {
    let l = Infinity,
      t = Infinity,
      r = -Infinity,
      bm = -Infinity;
    for (const m of b.members) {
      const mn = nodeMap.get(m);
      if (!mn) continue;
      l = Math.min(l, mn.x);
      t = Math.min(t, mn.y - 19);
      r = Math.max(r, mn.x + mn.w);
      bm = Math.max(bm, mn.y + mn.h);
    }
    for (const flow of flows) {
      if (!b.members.includes(flow.source) || !b.members.includes(flow.target)) continue;
      for (const point of flow.points) {
        l=Math.min(l,point.x); t=Math.min(t,point.y); r=Math.max(r,point.x); bm=Math.max(bm,point.y);
      }
    }
    if (!Number.isFinite(l)) continue;
    const p = TM_CONST.BOUNDARY_PAD;
    const boundaryWidth = Math.max(r-l+p*2, estimateTextWidth(b.name,10,{fontWeight:700})+16);
    boundaries.push({
      name: b.name,
      x: (l+r-boundaryWidth)/2,
      y: t - p - TM_CONST.BOUNDARY_HEADER,
      w: boundaryWidth,
      h: bm - t + p * 2 + TM_CONST.BOUNDARY_HEADER,
    });
  }

  // Labels avoid full node/badge bounds, boundary headers, and other labels.
  const occupied = nodes.map(n => ({x:n.x, y:n.y-19, width:n.w, height:n.h+19}));
  occupied.push(...boundaries.map(b => ({x:b.x, y:b.y, width:b.w, height:TM_CONST.BOUNDARY_HEADER})));
  for (const flow of flows) {
    const otherEdges = flows.filter(f => f !== flow).flatMap(f => edgeLabelObstacles(f.points));
    const box = placeLabel({x:flow.labelX,y:flow.labelY},
      {width:estimateTextWidth(flow.label,10)+8,height:16}, [...occupied,...otherEdges], {x:1,y:0});
    flow.labelX=box.x+box.width/2; flow.labelY=box.y+box.height/2;
    occupied.push(box);
  }

  // ── Canvas extent ──
  let maxX = 0,
    maxY = 0;
  for (const n of nodes) {
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  for (const b of boundaries) {
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  for (const f of flows) {
    maxX = Math.max(maxX, f.labelX + estimateTextWidth(f.label, 10)/2 + 4);
    maxY = Math.max(maxY, f.labelY + 10);
    for (const p of f.points) {
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  return {
    ast,
    analysis,
    nodes,
    flows,
    boundaries,
    width: maxX + TM_CONST.PAD,
    height: maxY + TM_CONST.PAD,
  };
}

/** Where a line from a node's center toward (tx,ty) exits the node's box/circle. */
function edgePoint(
  n: LaidOutNode,
  tx: number,
  ty: number
): { x: number; y: number } {
  const dx = tx - n.cx;
  const dy = ty - n.cy;
  if (dx === 0 && dy === 0) return { x: n.cx, y: n.cy };
  if (n.kind === "process") {
    const r = n.w / 2;
    const len = Math.hypot(dx, dy);
    return { x: n.cx + (dx / len) * r, y: n.cy + (dy / len) * r };
  }
  // Rectangle (external / store): clip to the box border.
  const hw = n.w / 2;
  const hh = n.h / 2;
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: n.cx + dx * scale, y: n.cy + dy * scale };
}

export { sizeOf };

/** Prefer a direct connection; detour only when another node/badge blocks it. */
function routeFlow(a: LaidOutNode, b: LaidOutNode, nodes: LaidOutNode[], index: number): Array<{x:number;y:number}> {
  const obstacles=nodes.filter(n=>n!==a && n!==b).map(n=>({x:n.x-8,y:n.y-27,width:n.w+16,height:n.h+35}));
  const candidates = [[edgePoint(a,b.cx,b.cy),edgePoint(b,a.cx,a.cy)]];
  const channelYs = [...new Set(nodes.flatMap(n=>[n.y-34,n.y+n.h+30]))];
  for(const y of channelYs) {
    // Both vertical terminal legs must leave their symbols before turning.
    // A channel from a shorter neighbor can otherwise lie inside an endpoint.
    if ([a, b].some(n => y >= n.y - 8 && y <= n.y + n.h + 8)) continue;
    const p={x:a.cx,y}, q={x:b.cx,y};
    candidates.push([edgePoint(a,p.x,p.y),p,q,edgePoint(b,q.x,q.y)]);
  }
  if(Math.abs(a.cx-b.cx)<1) {
    for(const sign of [-1,1]) {
      const x=a.cx+sign*(Math.max(a.w,b.w)/2+30+index*4);
      candidates.push([edgePoint(a,x,a.cy),{x,y:a.cy},{x,y:b.cy},edgePoint(b,x,b.cy)]);
    }
  }
  const score=(points:Array<{x:number;y:number}>) => {
    const overlap=edgeLabelObstacles(points).reduce((sum,s)=>sum+obstacles.reduce((n,o)=>n+labelOverlap(s,o),0),0);
    const length=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);
    return overlap*10000+length+points.length*20;
  };
  return candidates.sort((a,b)=>score(a)-score(b))[0];
}
