import type {
  CircuitAST,
  CircuitComponent,
  CircuitDirection,
} from "../../core/types";
import { getSymbol, type PinAnchor } from "./symbols";

export interface LaidOutComponent {
  component: CircuitComponent;
  /** World (SVG) coordinates of the component's origin (before rotation). */
  x: number;
  y: number;
  /** Rotation applied to the symbol, in degrees. */
  rotation: number;
  /** Length along direction — 0 for zero-length items (dots, labels). */
  length: number;
  /** Resolved anchors in world coordinates. */
  anchors: Record<string, PinAnchor>;
}

export interface CircuitLayoutResult {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  items: LaidOutComponent[];
}

function rotationDeg(d: CircuitDirection): number {
  return d === "right" ? 0 : d === "down" ? 90 : d === "left" ? 180 : 270;
}

function rotatePoint(p: PinAnchor, angleDeg: number): PinAnchor {
  const r = (angleDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function resolveAnchorRef(
  ref: string,
  byId: Map<string, LaidOutComponent>,
  nets: Map<string, PinAnchor>
): PinAnchor | undefined {
  if (ref === "origin") return { x: 0, y: 0 };
  if (nets.has(ref)) return nets.get(ref);
  const dot = ref.indexOf(".");
  if (dot < 0) {
    // bare id — treat as .end
    const c = byId.get(ref);
    if (c) return c.anchors.end ?? c.anchors.center ?? { x: c.x, y: c.y };
    return undefined;
  }
  const id = ref.slice(0, dot);
  const pin = ref.slice(dot + 1);
  const c = byId.get(id);
  if (!c) return undefined;
  return c.anchors[pin];
}

export function layoutCircuit(ast: CircuitAST): CircuitLayoutResult {
  const items: LaidOutComponent[] = [];
  const byId = new Map<string, LaidOutComponent>();
  const nets = new Map<string, PinAnchor>();
  let cursor: PinAnchor = { x: 0, y: 0 };

  for (const comp of ast.components) {
    // Determine starting point
    let startPt: PinAnchor = cursor;
    if (comp.at) {
      const resolved = resolveAnchorRef(comp.at, byId, nets);
      if (resolved) startPt = resolved;
    }

    const sym = getSymbol(comp.componentType);
    const rot = rotationDeg(comp.direction);

    if (comp.componentType === "wire") {
      const len = parseInt(comp.attrs?.length ?? "20", 10);
      const endOffset = rotatePoint({ x: len, y: 0 }, rot);
      const end = { x: startPt.x + endOffset.x, y: startPt.y + endOffset.y };
      const laid: LaidOutComponent = {
        component: comp,
        x: startPt.x,
        y: startPt.y,
        rotation: rot,
        length: len,
        anchors: { start: startPt, end },
      };
      items.push(laid);
      byId.set(comp.id, laid);
      cursor = end;
      continue;
    }

    if (comp.componentType === "dot") {
      const laid: LaidOutComponent = {
        component: comp,
        x: startPt.x,
        y: startPt.y,
        rotation: 0,
        length: 0,
        anchors: { start: startPt, end: startPt, center: startPt },
      };
      items.push(laid);
      byId.set(comp.id, laid);
      if (comp.attrs?.net) nets.set(comp.attrs.net, startPt);
      cursor = startPt;
      continue;
    }

    if (comp.componentType === "label") {
      const laid: LaidOutComponent = {
        component: comp,
        x: startPt.x,
        y: startPt.y,
        rotation: rot,
        length: 0,
        anchors: { start: startPt, end: startPt },
      };
      items.push(laid);
      byId.set(comp.id, laid);
      // don't advance cursor
      continue;
    }

    if (!sym) {
      // Unknown symbol — render as placeholder square, advance 30
      const endOffset = rotatePoint({ x: 30, y: 0 }, rot);
      const end = { x: startPt.x + endOffset.x, y: startPt.y + endOffset.y };
      const laid: LaidOutComponent = {
        component: comp,
        x: startPt.x,
        y: startPt.y,
        rotation: rot,
        length: 30,
        anchors: { start: startPt, end },
      };
      items.push(laid);
      byId.set(comp.id, laid);
      cursor = end;
      continue;
    }

    // Resolve all anchors to world coords by rotating + translating
    const worldAnchors: Record<string, PinAnchor> = {};
    for (const [name, pt] of Object.entries(sym.anchors)) {
      const rp = rotatePoint(pt, rot);
      worldAnchors[name] = { x: startPt.x + rp.x, y: startPt.y + rp.y };
    }

    const laid: LaidOutComponent = {
      component: comp,
      x: startPt.x,
      y: startPt.y,
      rotation: rot,
      length: sym.length,
      anchors: worldAnchors,
    };
    items.push(laid);
    byId.set(comp.id, laid);
    cursor = worldAnchors.end ?? startPt;
  }

  // Compute bounding box with margin for labels/text
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const it of items) {
    for (const a of Object.values(it.anchors)) {
      if (a.x < minX) minX = a.x;
      if (a.y < minY) minY = a.y;
      if (a.x > maxX) maxX = a.x;
      if (a.y > maxY) maxY = a.y;
    }
  }
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }
  // Pad for symbol radii + text overflow
  const pad = 40;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    width,
    height,
    offsetX: -minX,
    offsetY: -minY,
    items,
  };
}
