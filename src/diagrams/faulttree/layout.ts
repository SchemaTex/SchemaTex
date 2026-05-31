/**
 * Fault Tree layout — deterministic tidy top-down tree.
 * Per docs/reference/37-FAULT-TREE-STANDARD.md §5.
 *
 * Top event at the root; each gate drawn directly below the event it feeds;
 * inputs hang below the gate. A shared basic event (referenced by >1 gate) is
 * DUPLICATED per reference (NUREG-0492 convention) so layout stays a clean
 * tree — the cut-set engine still treats all instances as one Boolean variable.
 *
 * x-assignment is subtree-width packing: every subtree occupies a disjoint
 * horizontal band, and a parent is centred over its children (or its children
 * centred under it when the parent box is wider) — no overlaps, O(n), stable.
 */

import { analyseFaultTree } from "./analysis";
import type {
  FaultTreeAnalysis,
  FaultTreeAst,
  FaultTreeEvent,
  FaultTreeGate,
  FaultTreeLayoutCutSetBox,
  FaultTreeLayoutEdge,
  FaultTreeLayoutEvent,
  FaultTreeLayoutGate,
  FaultTreeLayoutResult,
  FaultTreeLayoutTransfer,
  FaultTreeNodeRole,
} from "./types";

export const FAULTTREE_CONST = {
  EVENT_MIN_W: 132,
  EVENT_MAX_W: 216,
  EVENT_PAD_X: 16,
  EVENT_H: 50,
  CHAR_W: 6.9,
  EVENT_RX: 5,
  BASIC_R: 21,
  DIAMOND_W: 44,
  HOUSE_W: 66,
  HOUSE_H: 46,
  COND_W: 78,
  COND_H: 34,
  GATE_W: 54,
  GATE_H: 38,
  GATE_GAP: 12,
  LEVEL_GAP: 62,
  SIBLING_GAP: 32,
  PIN_LEN: 12,
  /** First caption line offset below a leaf shape — clears the widest cut-set box. */
  CAP_GAP: 19,
  CAP_LINE_H: 13,
  CUTSET_PAD: 7,
  /** Overlapping cut-set boxes alternate by this step, capped at ×2 (never balloon). */
  CUTSET_OFFSET_STEP: 2,
  COND_GAP: 22,
  CANVAS_PAD: 30,
  TITLE_H: 34,
} as const;

/** Greedy-wrap an event label into ≤2 lines and size its box (with side padding). */
export function eventBox(label: string): { width: number; lines: string[] } {
  const C = FAULTTREE_CONST;
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  const soft = 20;
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > soft) {
      lines.push(cur);
      cur = w;
      if (lines.length === 2) break;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur && lines.length < 2) lines.push(cur);
  else if (cur && lines.length === 2) lines[1] = `${lines[1]} ${cur}`;
  if (lines.length === 0) lines.push(label);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const width = Math.min(C.EVENT_MAX_W, Math.max(C.EVENT_MIN_W, Math.ceil(longest * C.CHAR_W) + 2 * C.EVENT_PAD_X));
  return { width, lines };
}

interface TNode {
  instanceId: string;
  eventId: string;
  role: FaultTreeNodeRole;
  depth: number;
  width: number;
  cx: number;
  topY: number;
  shared: boolean;
  gate?: FaultTreeGate;
  children: TNode[];
}

export function layoutFaultTree(ast: FaultTreeAst): FaultTreeLayoutResult {
  const C = FAULTTREE_CONST;
  const analysis = analyseFaultTree(ast);
  const byId = new Map(ast.events.map((e) => [e.id, e] as const));

  // Reference counts (a leaf referenced by >1 gate is "shared"/repeated).
  const refCount = new Map<string, number>();
  for (const e of ast.events) {
    if (!e.gate) continue;
    for (const c of e.gate.inputs) refCount.set(c, (refCount.get(c) ?? 0) + 1);
  }

  // ── Build the render tree (duplicating shared leaves) ──
  let counter = 0;
  const roleOf = (ev: FaultTreeEvent): FaultTreeNodeRole =>
    ev.kind === "top" ? "top"
    : ev.kind === "intermediate" ? "intermediate"
    : (ev.kind as FaultTreeNodeRole);

  const nodeWidth = (role: FaultTreeNodeRole, label: string): number => {
    switch (role) {
      case "top":
      case "intermediate": return eventBox(label).width;
      case "basic": return 2 * C.BASIC_R;
      case "undeveloped": return C.DIAMOND_W;
      case "house": return C.HOUSE_W;
      case "condition": return C.COND_W;
    }
  };

  const build = (eventId: string, depth: number, onPath: Set<string>): TNode | null => {
    const ev = byId.get(eventId);
    if (!ev) return null;
    if (onPath.has(eventId)) return null; // cycle guard (already validated acyclic)
    const role = roleOf(ev);
    const node: TNode = {
      instanceId: `${eventId}#${counter++}`,
      eventId,
      role,
      depth,
      width: nodeWidth(role, ev.label ?? ev.id),
      cx: 0,
      topY: 0,
      shared: (refCount.get(eventId) ?? 0) > 1,
      children: [],
      ...(ev.gate ? { gate: ev.gate } : {}),
    };
    if (ev.gate) {
      const nextPath = new Set(onPath).add(eventId);
      for (const childId of ev.gate.inputs) {
        const child = build(childId, depth + 1, nextPath);
        if (child) node.children.push(child);
      }
    }
    return node;
  };

  const root = ast.topId ? build(ast.topId, 0, new Set()) : null;

  const events: FaultTreeLayoutEvent[] = [];
  const gates: FaultTreeLayoutGate[] = [];
  const edges: FaultTreeLayoutEdge[] = [];

  if (!root) {
    return { ast, analysis, events, gates, edges, cutSetBoxes: [], transfers: [], width: 240, height: 120 };
  }

  // ── x assignment (subtree-width packing) ──
  const shiftTree = (n: TNode, dx: number): void => {
    n.cx += dx;
    for (const c of n.children) shiftTree(c, dx);
  };
  const place = (n: TNode, originX: number): number => {
    if (n.children.length === 0) {
      n.cx = originX + n.width / 2;
      return n.width;
    }
    let x = originX;
    for (const c of n.children) {
      x += place(c, x) + C.SIBLING_GAP;
    }
    const childrenWidth = x - originX - C.SIBLING_GAP;
    if (n.width <= childrenWidth) {
      n.cx = (n.children[0]!.cx + n.children[n.children.length - 1]!.cx) / 2;
      return childrenWidth;
    }
    const shift = (n.width - childrenWidth) / 2;
    for (const c of n.children) shiftTree(c, shift);
    n.cx = originX + n.width / 2;
    return n.width;
  };
  // Reserve a header band: the title (top-left) and the P(top) annotation
  // (centred just above the top box) both live above the tree.
  const baseY = C.CANVAS_PAD + (ast.title ? C.TITLE_H : 0) + (ast.analysis.probability ? 18 : 0);
  place(root, C.CANVAS_PAD);

  // ── y assignment (uniform row pitch) + emit nodes/gates/edges ──
  const ROW_PITCH = C.EVENT_H + C.GATE_GAP + C.GATE_H + C.LEVEL_GAP;
  const rowY = (depth: number): number => baseY + depth * ROW_PITCH;

  const centerY = (n: TNode): number => n.topY + C.EVENT_H / 2;
  const halfH = (role: FaultTreeNodeRole): number => {
    switch (role) {
      case "top":
      case "intermediate": return C.EVENT_H / 2;
      case "basic": return C.BASIC_R;
      case "undeveloped": return C.DIAMOND_W / 2;
      case "house": return C.HOUSE_H / 2;
      case "condition": return C.COND_H / 2;
    }
  };
  /** The point an incoming edge attaches to (top-centre of the visual shape). */
  const topAnchorY = (n: TNode): number =>
    n.role === "top" || n.role === "intermediate" ? n.topY : centerY(n) - halfH(n.role);

  const instancesByEvent = new Map<string, FaultTreeLayoutEvent[]>();

  const emit = (n: TNode): void => {
    n.topY = rowY(n.depth);
    const lay: FaultTreeLayoutEvent = {
      event: byId.get(n.eventId)!,
      instanceId: n.instanceId,
      role: n.role,
      cx: n.cx,
      topY: n.topY,
      width: n.width,
      height: n.role === "top" || n.role === "intermediate" ? C.EVENT_H : 2 * halfH(n.role),
      depth: n.depth,
      shared: n.shared,
    };
    events.push(lay);
    (instancesByEvent.get(n.eventId) ?? instancesByEvent.set(n.eventId, []).get(n.eventId)!).push(lay);

    if (n.gate && n.children.length > 0) {
      const gx = n.cx;
      const gy = n.topY + C.EVENT_H + C.GATE_GAP + C.GATE_H / 2;
      const glay: FaultTreeLayoutGate = {
        gate: n.gate,
        ownerInstanceId: n.instanceId,
        cx: gx,
        cy: gy,
        width: C.GATE_W,
        height: C.GATE_H,
      };
      if ((n.gate.kind === "inhibit" || n.gate.kind === "pand") && (n.gate.condition || n.gate.order)) {
        const condEv = n.gate.condition ? byId.get(n.gate.condition) : undefined;
        const text = n.gate.order
          ? n.gate.order.join(" ≺ ")
          : condEv?.label ?? n.gate.condition ?? "";
        glay.cond = {
          x: gx + C.GATE_W / 2 + C.COND_GAP + C.COND_W / 2,
          y: gy,
          w: C.COND_W,
          h: C.COND_H,
          text,
        };
      }
      gates.push(glay);

      const gateBaseY = gy + C.GATE_H / 2;
      for (const c of n.children) {
        c.topY = rowY(c.depth);
        const childTop = topAnchorY(c);
        const midY = (gateBaseY + childTop) / 2;
        edges.push({
          fromGateOwner: n.instanceId,
          to: c.instanceId,
          path: `M ${r(gx)} ${r(gateBaseY)} L ${r(gx)} ${r(midY)} L ${r(c.cx)} ${r(midY)} L ${r(c.cx)} ${r(childTop)}`,
        });
      }
    }
    for (const c of n.children) emit(c);
  };
  emit(root);

  // ── Cut-set highlight boxes ──
  const cutSetBoxes: FaultTreeLayoutCutSetBox[] = [];
  let boxIndex = 0;
  const visualBounds = (e: FaultTreeLayoutEvent) => {
    const cy = e.topY + C.EVENT_H / 2;
    const hw = e.width / 2;
    const hh = halfH(e.role);
    return { minX: e.cx - hw, maxX: e.cx + hw, minY: cy - hh, maxY: cy + hh };
  };
  const boxFor = (insts: FaultTreeLayoutEvent[], cs: FaultTreeAnalysis["cutSets"][number], idx: number): FaultTreeLayoutCutSetBox => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of insts) {
      const b = visualBounds(e);
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
    }
    // Alternate the inset for adjacent boxes so overlapping cut sets stay
    // distinguishable, but cap it (×2) so a box never balloons over captions.
    const pad = C.CUTSET_PAD + (idx % 3) * C.CUTSET_OFFSET_STEP;
    return {
      cutSet: cs,
      index: idx,
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + 2 * pad,
      height: maxY - minY + 2 * pad,
    };
  };
  if (ast.analysis.cutsets) {
    for (const cs of analysis.cutSets) {
      if (cs.order === 0) continue;
      if (cs.order === 1) {
        for (const inst of instancesByEvent.get(cs.events[0]!) ?? []) {
          cutSetBoxes.push(boxFor([inst], cs, boxIndex++));
        }
      } else {
        const reps = cs.events
          .map((id) => (instancesByEvent.get(id) ?? [])[0])
          .filter((x): x is FaultTreeLayoutEvent => !!x);
        if (reps.length > 0) cutSetBoxes.push(boxFor(reps, cs, boxIndex++));
      }
    }
  }

  // ── Transfer-out triangles ──
  const transfers: FaultTreeLayoutTransfer[] = [];
  for (const tr of ast.transfers) {
    const inst = (instancesByEvent.get(tr.id) ?? [])[0];
    if (!inst) continue;
    transfers.push({
      ownerInstanceId: inst.instanceId,
      name: tr.name,
      x: inst.cx,
      y: inst.topY + C.EVENT_H + C.GATE_GAP,
    });
  }

  // ── Canvas size (cover every drawn element) ──
  let maxX = 0, maxY = 0;
  const bump = (x: number, y: number) => { maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  for (const e of events) {
    const b = visualBounds(e);
    bump(b.maxX, b.maxY);
    // Leaf caption (label + probability) hangs below the shape.
    if (e.role === "basic" || e.role === "undeveloped" || e.role === "house") {
      const hasLabel = !!e.event.label && e.event.label !== e.event.id;
      const hasProb = ast.analysis.probability && e.event.prob !== undefined;
      if (hasLabel || hasProb) bump(b.maxX, b.maxY + (hasLabel && hasProb ? C.CAP_GAP + C.CAP_LINE_H + 8 : C.CAP_GAP + 6));
    }
  }
  for (const g of gates) {
    bump(g.cx + g.width / 2, g.cy + g.height / 2);
    if (g.cond) bump(g.cond.x + g.cond.w / 2, g.cond.y + g.cond.h / 2);
  }
  for (const box of cutSetBoxes) bump(box.x + box.width, box.y + box.height);
  for (const t of transfers) bump(t.x + 22, t.y + 30);
  // Title (top-left) and the P(top) annotation (centred above the top box) must fit.
  if (ast.title) bump(C.CANVAS_PAD + ast.title.length * 8.5, 0);
  if (ast.analysis.probability) {
    const top = events.find((e) => e.role === "top");
    if (top) bump(top.cx + 95, 0); // ~ half the "P(top) = …" annotation width
  }

  return {
    ast,
    analysis,
    events,
    gates,
    edges,
    cutSetBoxes,
    transfers,
    width: Math.ceil(maxX + C.CANVAS_PAD),
    height: Math.ceil(maxY + C.CANVAS_PAD),
  };
}

function r(n: number): number {
  return Math.round(n * 10) / 10;
}
