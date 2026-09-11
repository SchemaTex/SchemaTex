/**
 * Schematic-convention layout for netlist-mode circuits.
 *
 * The previous auto-layout was a graph drawing: components were placed in
 * declaration order along a single row (`x = i * COL_W`) across three fixed
 * vertical bands, and power/ground were drawn as full-width rails that every
 * pin dropped onto. That is a legitimate way to draw a graph, but a schematic
 * is not a graph drawing — it is a document with conventions that dominate
 * aesthetics, and ignoring them produces the "clothesline": canvas height
 * stayed constant while width grew 96px per component, so a 20-component
 * circuit came out at 6.7:1 and nothing about the picture said what the
 * circuit does.
 *
 * Three conventions drive this module:
 *
 *   1. POWER AND GROUND ARE NOT SIGNAL ADJACENCY. Shared top and bottom
 *      buses expose supply connections without making every powered component
 *      a neighbour in the signal graph. Buses do not require the old single-row
 *      placement: the signal-flow layers still determine component positions.
 *
 *   2. SIGNAL FLOWS LEFT TO RIGHT. X comes from topological depth along the
 *      signal path, not from the order the author happened to type components.
 *      Feedback nets are edges that point backwards; they are excluded from
 *      the layering pass and routed around afterwards instead of being allowed
 *      to distort placement.
 *
 *   3. PINS HAVE FIXED POSITIONS, SO THEY CONSTRAIN PLACEMENT. A two-terminal
 *      part bridging two layers lies horizontally; one that hangs off a node
 *      down to ground stands vertically. The engine already knew every pin
 *      coordinate — it simply had not been using them to decide anything.
 *
 * Crossing reduction is the standard barycenter sweep. Label placement is a
 * separate pass over candidate offsets, because label collisions are a
 * different problem from component placement and solving them together solves
 * neither well.
 */
import { placeLabel, labelOverlap, type LabelBox } from "../../core/label-placement";
import type { CircuitAST, CircuitComponent } from "../../core/types";
import { effectiveSymbolDef, type PinAnchor } from "./symbols";
import { componentCaption, type LaidOutComponent } from "./layout";
import type {
  AutoLayoutResult,
  RoutedWire,
  SupplyFlagMark,
} from "./autolayout";
import { RAIL_LABEL } from "./autolayout";
import { measureRouting, isBetterRouting } from "./layout-quality";
import { estimateTextWidth } from "../../core/text-metrics";
import { compactRoute, intersectsBox, orthogonalRoute } from "../logic/orthogonal-router";

/** Horizontal distance between adjacent signal-flow layers. */
const LAYER_W = 104;
/** Vertical distance between adjacent slots inside one layer. */
const SLOT_H = 88;
const LEFT_MARGIN = 78;
const TOP_MARGIN = 64;
/** Barycenter sweeps. Three is where the standard heuristic stops improving. */
const SWEEPS = 4;
const TERMINAL_LEAD = 18;
const BODY_CLEARANCE = 8;
const LABEL_GUTTER = 6;
const BRANCH_GAP = 24;
const BUS_CLEARANCE = 32;
const MAX_ASPECT = 2;

const GROUND_NET_NAMES = new Set(["gnd", "0", "ground", "agnd", "dgnd", "vss"]);

export interface SchematicLayoutOptions {
  /** Emitted for callers that want to explain the drawing (docs, tests). */
  collectStats?: boolean;
}

export interface SchematicLayoutStats {
  layers: number;
  maxSlots: number;
  implicitFlags: number;
  routedNets: number;
  labelsMoved: number;
  optimization?: { candidates: number; before: ReturnType<typeof measureRouting>; after: ReturnType<typeof measureRouting> };
}

interface PinRef {
  compId: string;
  pinName: string;
  net: string;
}

function isSource(c: CircuitComponent): boolean {
  return (
    c.componentType === "voltage_source" ||
    c.componentType === "current_source" ||
    c.componentType === "ac_source" ||
    c.componentType === "battery" ||
    c.componentType === "solar_cell" ||
    c.componentType === "vcc"
  );
}

/** Signed rail potentials relative to the return; unknown values use terminal polarity. */
function supplyLevels(
  sources: CircuitComponent[],
  pinMap: NonNullable<CircuitAST["pinMap"]>,
  groundNets: Set<string>
): Map<string, number> {
  // SI voltage prefixes, expressed in volts.
  const voltageScale: Record<string, number> = { "": 1, m: 1e-3, u: 1e-6, "µ": 1e-6, k: 1e3, M: 1e6 };
  const levels = new Map(Array.from(groundNets, (net) => [net, 0]));
  const polarity = new Map<string, number>();
  const supplies = sources.filter((source) =>
    ["voltage_source", "battery", "solar_cell"].includes(source.componentType)
  ).map((source) => {
    const { plus, minus } = pinMap[source.id] ?? {};
    polarity.set(plus, 1);
    polarity.set(minus, -1);
    const match = /^(?:[dD][cC]\s+)?([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([muµkM]?)[Vv]?$/.exec(source.value?.trim() ?? "");
    return { plus, minus, voltage: match ? Number(match[1]) * voltageScale[match[2]]! : undefined };
  });
  // Propagate through series supplies as well as supplies connected directly to return.
  for (let pass = 0; pass < supplies.length; pass++) {
    for (const { plus, minus, voltage } of supplies) {
      if (voltage === undefined) continue;
      if (levels.has(minus) && !levels.has(plus)) levels.set(plus, levels.get(minus)! + voltage);
      if (levels.has(plus) && !levels.has(minus)) levels.set(minus, levels.get(plus)! - voltage);
    }
  }
  return new Map([...polarity, ...levels]);
}

function isGroundType(c: CircuitComponent): boolean {
  return (
    c.componentType === "ground" ||
    c.componentType === "gnd_signal" ||
    c.componentType === "gnd_chassis" ||
    c.componentType === "gnd_digital"
  );
}

function rotatePt(p: PinAnchor, angleDeg: number): PinAnchor {
  const r = (angleDeg * Math.PI) / 180;
  const c = Math.round(Math.cos(r));
  const s = Math.round(Math.sin(r));
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function rotationOf(dir: "right" | "left" | "up" | "down"): number {
  return dir === "right" ? 0 : dir === "down" ? 90 : dir === "left" ? 180 : 270;
}

/**
 * Place one component and resolve every anchor into world coordinates.
 *
 * `mirror` flips the glyph horizontally about its own cell rather than
 * rotating it. That distinction matters for polarised parts: a diode whose
 * upstream pin sits on the right must have its anode drawn on the right, and
 * mirroring moves the glyph's geometry to match while leaving the part
 * occupying the same slot. Flipping a polarised part merely to make the
 * drawing look tidier would change what the drawing claims, so the caller
 * only ever mirrors when the netlist itself puts the upstream pin on the
 * right — the flip preserves the circuit, it does not restyle it.
 */
function placeAt(
  comp: CircuitComponent,
  x: number,
  y: number,
  dir: "right" | "left" | "up" | "down",
  mirror = false
): LaidOutComponent {
  const sym = effectiveSymbolDef(comp.componentType, comp.attrs);
  // Named boxes keep their text upright; other symbols honor authored orientation.
  const direction =
    sym.keepUpright ? "right" : comp.attrs?.dirExplicit === "true" ? comp.direction : dir;
  comp.direction = direction;
  const rot = rotationOf(direction);
  const anchors: Record<string, PinAnchor> = {};
  if (mirror && !sym.keepUpright && direction === "right") {
    for (const [name, pt] of Object.entries(sym.anchors)) {
      anchors[name] = { x: x + sym.length - pt.x, y: y + pt.y };
    }
    return {
      component: comp,
      x,
      y,
      rotation: 0,
      mirrorX: true,
      length: sym.length,
      anchors,
    };
  }
  for (const [name, pt] of Object.entries(sym.anchors)) {
    const rp = rotatePt(pt, rot);
    anchors[name] = { x: x + rp.x, y: y + rp.y };
  }
  return { component: comp, x, y, rotation: rot, length: sym.length, anchors };
}

function pinEntriesOf(
  ast: CircuitAST,
  comp: CircuitComponent
): Array<[string, string]> {
  const pins = ast.pinMap?.[comp.id];
  if (!pins) return [];
  return Object.entries(pins);
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Bounds of the primitives used by the symbol library, before its transform.
 * Curves use their control hull; circular arcs reserve their endpoint envelopes.
 * This deliberately includes polarity marks and text painted inside ICs.
 */
function symbolBox(comp: CircuitComponent): Box {
  const sym = effectiveSymbolDef(comp.componentType, comp.attrs);
  const points: PinAnchor[] = [];
  const add = (x: number, y: number) => points.push({ x, y });
  const svg = sym.svg(comp.label, comp.value, comp.attrs);
  for (const tag of svg.matchAll(/<(line|rect|circle|polygon|polyline|path|text)\b([^>]*)(?:>([^<]*)<\/text>)?/g)) {
    const attrs = Object.fromEntries([...tag[2]!.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    const n = (key: string) => Number(attrs[key] ?? 0);
    if (tag[1] === "line") {
      add(n("x1"), n("y1")); add(n("x2"), n("y2"));
    } else if (tag[1] === "rect") {
      add(n("x"), n("y")); add(n("x") + n("width"), n("y") + n("height"));
    } else if (tag[1] === "circle") {
      add(n("cx") - n("r"), n("cy") - n("r"));
      add(n("cx") + n("r"), n("cy") + n("r"));
    } else if (tag[1] === "text") {
      const cls = attrs.class ?? "";
      const size = cls.endsWith("meter") ? 12 : cls.endsWith("panel-label") ? 11 : 9;
      const width = estimateTextWidth(tag[3] ?? "", size, { fontWeight: size === 9 ? 400 : 700 });
      const x = n("x") - (attrs["text-anchor"] === "middle" ? width / 2 : attrs["text-anchor"] === "end" ? width : 0);
      add(x, n("y") - size); add(x + width, n("y") + size * 0.25);
    } else if (tag[1] === "path") {
      let x = 0, y = 0;
      for (const command of (attrs.d ?? "").matchAll(/([MLQCAZ])([^MLQCAZ]*)/g)) {
        const values = (command[2]!.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
        if (command[1] === "A") {
          for (let i = 0; i + 6 < values.length; i += 7) {
            const rx = values[i]!, ry = values[i + 1]!;
            const nx = values[i + 5]!, ny = values[i + 6]!;
            add(Math.min(x, nx) - rx, Math.min(y, ny) - ry);
            add(Math.max(x, nx) + rx, Math.max(y, ny) + ry);
            x = nx; y = ny;
          }
        } else {
          for (let i = 0; i + 1 < values.length; i += 2) {
            x = values[i]!; y = values[i + 1]!; add(x, y);
          }
        }
      }
    } else {
      const values = (attrs.points ?? "").trim().split(/[ ,]+/).map(Number);
      for (let i = 0; i + 1 < values.length; i += 2) add(values[i]!, values[i + 1]!);
    }
  }
  if (!points.length) points.push(...Object.values(sym.anchors));
  return {
    minX: Math.min(...points.map((p) => p.x)) - 1,
    minY: Math.min(...points.map((p) => p.y)) - 1,
    maxX: Math.max(...points.map((p) => p.x)) + 1,
    maxY: Math.max(...points.map((p) => p.y)) + 1,
  };
}

export function boxOf(it: LaidOutComponent, pad = 10): Box {
  const b = symbolBox(it.component);
  const corners = [
    { x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY },
    { x: b.minX, y: b.maxY }, { x: b.maxX, y: b.maxY },
  ].map((p) => it.mirrorX ? { x: it.length - p.x, y: p.y } : rotatePt(p, it.rotation));
  return {
    minX: it.x + Math.min(...corners.map((p) => p.x)) - pad,
    minY: it.y + Math.min(...corners.map((p) => p.y)) - pad,
    maxX: it.x + Math.max(...corners.map((p) => p.x)) + pad,
    maxY: it.y + Math.max(...corners.map((p) => p.y)) + pad,
  };
}

export function labelBox(comp: CircuitComponent, at: PinAnchor): Box {
  const width = Math.max(
    estimateTextWidth(componentCaption(comp) ?? "", 11, { fontWeight: 600 }),
    estimateTextWidth(comp.value ?? "", 10)
  );
  // renderItem always puts the value baseline at labelY + 12, even without a ref.
  return {
    minX: at.x - width / 2 - 2, maxX: at.x + width / 2 + 2,
    minY: at.y + (componentCaption(comp) ? -11 : 2),
    maxY: at.y + (comp.value ? 15 : 3),
  };
}

export function flagBoxes(flags: SupplyFlagMark[], topOff: number): Box[] {
  return flags.flatMap((flag) => {
    const component = { componentType: flag.kind } as CircuitComponent;
    const at = { x: flag.at.x, y: flag.at.y + topOff };
    const glyph = flag.kind === "label" ? [] : [boxOf(placeAt(component, at.x, at.y, flag.kind === "ground" ? "down" : "up"), 2)];
    return flag.label ? [...glyph, {
      minX: at.x + RAIL_LABEL.x - 2, minY: at.y + RAIL_LABEL.y - RAIL_LABEL.fontSize,
      maxX: at.x + RAIL_LABEL.x + 2 + estimateTextWidth(flag.label, RAIL_LABEL.fontSize, { fontWeight: 600 }),
      maxY: at.y + RAIL_LABEL.y + 3,
    }] : glyph;
  });
}

function boxesOverlap(a: Box, b: Box): boolean {
  return !(
    a.maxX <= b.minX ||
    b.maxX <= a.minX ||
    a.maxY <= b.minY ||
    b.maxY <= a.minY
  );
}

/** Branch IDs append component/pin suffixes; a net itself may contain dots. */
export function routeNet(id: string, nets: Iterable<string>): string {
  return [...nets].filter(net => id === net || id.startsWith(`${net}.`))
    .sort((a, b) => b.length - a.length)[0] ?? id;
}

function terminalLeads(items: LaidOutComponent[], pinMap: NonNullable<CircuitAST["pinMap"]>) {
  const bounds = new Map(items.map(item => [item, boxOf(item, BODY_CLEARANCE)]));
  return items.flatMap(item => {
    const b = boxOf(item, 0);
    return Object.entries(pinMap[item.component.id] ?? {}).filter(([pin]) => item.anchors[pin]).map(([pin, net]) => {
      const at = item.anchors[pin]!;
      const end = [
        { x: b.minX - TERMINAL_LEAD, y: at.y }, { x: b.maxX + TERMINAL_LEAD, y: at.y },
        { x: at.x, y: b.minY - TERMINAL_LEAD }, { x: at.x, y: b.maxY + TERMINAL_LEAD },
      ].sort((a, b) => Math.abs(a.x - at.x) + Math.abs(a.y - at.y) -
        Math.abs(b.x - at.x) - Math.abs(b.y - at.y))[0]!;
      // Escape only as far as the available channel permits. A fixed lead
      // can overshoot a narrow but valid gap and end inside a neighbour.
      const vertical = at.x === end.x;
      const sign = Math.sign(vertical ? end.y - at.y : end.x - at.x);
      for (const [other, obstacle] of bounds) {
        if (other === item || !(vertical
          ? at.x > obstacle.minX && at.x < obstacle.maxX
          : at.y > obstacle.minY && at.y < obstacle.maxY)) continue;
        const edge = vertical ? (sign > 0 ? obstacle.minY : obstacle.maxY)
          : (sign > 0 ? obstacle.minX : obstacle.maxX);
        const distance = sign * (edge - (vertical ? at.y : at.x));
        if (distance <= 0) continue;
        if (vertical && sign * (end.y - at.y) >= distance) end.y = edge - sign;
        if (!vertical && sign * (end.x - at.x) >= distance) end.x = edge - sign;
      }
      return { net, points: [at, end] };
    });
  });
}

/** Reserve terminal leads as well as bodies, so an earlier net cannot fence in a pin. */
function routerFor(items: LaidOutComponent[], pinMap: NonNullable<CircuitAST["pinMap"]>) {
  const bodies = items.map((item) => ({ item, box: boxOf(item, 0) }));
  const boxes = bodies.filter(({ item }) => item.component.componentType !== "wire").map(({ box: b }) =>
    ({ left: b.minX - BODY_CLEARANCE, right: b.maxX + BODY_CLEARANCE,
      top: b.minY - BODY_CLEARANCE, bottom: b.maxY + BODY_CLEARANCE }));
  const leads = terminalLeads(items, pinMap);
  const nets = new Set(Object.values(pinMap).flatMap(pins => Object.values(pins)));
  const escape = (point: PinAnchor, net: string) => leads.find((lead) => lead.net === net && lead.points[0]!.x === point.x && lead.points[0]!.y === point.y)?.points[1] ?? point;
  return (from: PinAnchor, to: PinAnchor, routes: RoutedWire[], net: string): PinAnchor[] => {
    const junctionBoxes = routes.filter(r => routeNet(r.netId, nets) !== net)
      .flatMap(r => (r.junctions ?? []).map(dot => ({
        left: dot.x - LABEL_GUTTER, right: dot.x + LABEL_GUTTER,
        top: dot.y - LABEL_GUTTER, bottom: dot.y + LABEL_GUTTER,
      })));
    const routingBoxes = [...boxes, ...junctionBoxes];
    const safeEscape = (point: PinAnchor) => {
      const end = escape(point, net);
      return junctionBoxes.some(box => intersectsBox(point, end, box)) ? point : end;
    };
    const occupied = [...routes.map((r) => ({ net: routeNet(r.netId, nets), points: r.points })), ...leads];
    const segments = occupied.filter((r) => r.net !== net).flatMap((r) => r.points.slice(1).map((b, i) => {
      const a = r.points[i]!;
      return { a, b, minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x),
        minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y) };
    }));
    // Check crossings separately from shared runs. A clean crossing need not
    // trigger a visibility search, especially when a chain folds to another row.
    const clearsWires = (from: PinAnchor, to: PinAnchor) => !segments.some(({ a, b, minX, maxX, minY, maxY }) => from.x === to.x
        ? a.x === b.x && Math.abs(a.x - from.x) < LABEL_GUTTER && Math.min(Math.max(from.y, to.y), maxY) > Math.max(Math.min(from.y, to.y), minY)
        : a.y === b.y && Math.abs(a.y - from.y) < LABEL_GUTTER && Math.min(Math.max(from.x, to.x), maxX) > Math.max(Math.min(from.x, to.x), minX));
    const clear = (a: PinAnchor, b: PinAnchor) =>
      !routingBoxes.some(box => intersectsBox(a, b, box)) && clearsWires(a, b);
    const candidates: PinAnchor[][] = [];
    // A straight connection may leave its own terminal without an artificial
    // dogleg. Only its endpoint bodies get this exception, and the wire must
    // still stay outside the actual symbol on both ends.
    const hasEndpoint = (item: LaidOutComponent) => Object.entries(pinMap[item.component.id] ?? {})
      .some(([pin, owner]) => owner === net && [from, to].some(p =>
        item.anchors[pin]?.x === p.x && item.anchors[pin]?.y === p.y));
    if ((from.x === to.x || from.y === to.y) && clearsWires(from, to) &&
      !junctionBoxes.some(box => intersectsBox(from, to, box)) &&
      bodies.every(({item, box: b}) => {
        const pad = hasEndpoint(item) ? -1 : BODY_CLEARANCE;
        return !intersectsBox(from, to, {left: b.minX - pad, right: b.maxX + pad,
          top: b.minY - pad, bottom: b.maxY + pad});
      })) candidates.push([from, to]);
    const start = safeEscape(from), end = safeEscape(to), x = (start.x + end.x) / 2, y = (start.y + end.y) / 2;
    // Only terminal leads may enter a body's clearance envelope. Route the
    // space between their outward ends; never grant a whole net/body exemption.
    const accept = (points: PinAnchor[]) => {
      if (points.slice(1).every((point, i) => clear(points[i]!, point))) {
        candidates.push(compactRoute([from, ...points, to]));
      }
    };
    if (start.x === end.x || start.y === end.y) accept([start, end]);
    for (const points of [
      [start, { x: start.x, y: end.y }, end],
      [start, { x: end.x, y: start.y }, end],
      [start, { x, y: start.y }, { x, y: end.y }, end],
      [start, { x: start.x, y }, { x: end.x, y }, end],
    ]) accept(points);
    // Adjacent folded branches need separate escape columns. Try one lead's
    // clearance on either side of each port before building a visibility grid.
    for (const dx of [TERMINAL_LEAD, -TERMINAL_LEAD]) {
      for (const ex of [-TERMINAL_LEAD, TERMINAL_LEAD]) {
        const points = [start, { x: start.x + dx, y: start.y },
          { x: start.x + dx, y }, { x: end.x + ex, y },
          { x: end.x + ex, y: end.y }, end];
        accept(points);
      }
    }
    if (candidates.length) {
      // Use the same unique-ink/bend/crossing objective as whole-layout search,
      // rather than accepting the first unobstructed template.
      return candidates.map(points => ({ points, score: measureRouting(
        [...routes, { netId: net, points }], [...nets]).cost,
      })).sort((a, b) => a.score - b.score)[0]!.points;
    }
    return compactRoute([from, ...orthogonalRoute(start, end, routingBoxes, occupied, net), to]);
  };
}

/**
 * Label placement. Candidates are ordered by how conventional they look
 * (above a horizontal part, right of a vertical one, then the mirrors); the
 * shared local search reserves the first free measured box. If nearby positions
 * collide, search obstacle-defined free rectangles, preferring captions closer
 * to their own component than its neighbours.
 */
export function placeLabels(
  items: LaidOutComponent[],
  routes: RoutedWire[],
  flags: SupplyFlagMark[] = [],
  topOff = 0
): { moved: number } {
  const taken = [...items.map((it) => boxOf(it, 2)), ...flagBoxes(flags.filter((flag) => flag.kind !== "label"), topOff)];
  // Standalone net captions stay at their terminals, but still occupy their full text box.
  for (const item of items.filter((item) => item.component.componentType === "label")) {
    const dir = item.component.direction;
    const width = estimateTextWidth(item.component.label ?? "", 11, { fontWeight: 600 });
    const x = item.x + (dir === "right" ? 6 : dir === "left" ? -6 - width : -width / 2);
    const y = item.y + (dir === "down" ? 14 : dir === "up" ? -6 : 4);
    taken.push({ minX: x, minY: y - 11, maxX: x + width, maxY: y + 3 });
  }
  for (const r of routes) {
    for (let i = 0; i + 1 < r.points.length; i++) {
      const a = r.points[i]!, b = r.points[i + 1]!;
      taken.push({
        minX: Math.min(a.x, b.x) - 2, minY: Math.min(a.y, b.y) - 2,
        maxX: Math.max(a.x, b.x) + 2, maxY: Math.max(a.y, b.y) + 2,
      });
    }
    for (const dot of r.junctions ?? []) {
      taken.push({ minX: dot.x - 3.5, minY: dot.y - 3.5, maxX: dot.x + 3.5, maxY: dot.y + 3.5 });
    }
  }
  for (const flag of flags.filter((flag) => flag.kind === "label")) {
    const boxes = flagBoxes([flag], topOff);
    const initial = boxes[0]!;
    if (taken.some(box => boxesOverlap(initial, box))) {
      // Search nearby free space in every direction. An upward-only scan can
      // carry a caption along an entire vertical conductor to the page header.
      const offsets = taken.flatMap(box => {
        const xs = [0, box.minX - initial.maxX - LABEL_GUTTER, box.maxX - initial.minX + LABEL_GUTTER];
        const ys = [0, box.minY - initial.maxY - LABEL_GUTTER, box.maxY - initial.minY + LABEL_GUTTER];
        return xs.flatMap(x => ys.map(y => ({ x, y })));
      }).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
      // The extreme top edge always provides a candidate even in dense wiring.
      const offset = offsets.find(({ x, y }) => !taken.some(box => boxesOverlap({
        minX: initial.minX + x, maxX: initial.maxX + x,
        minY: initial.minY + y, maxY: initial.maxY + y,
      }, box)))!;
      flag.at.x += offset.x; flag.at.y += offset.y;
      for (const box of boxes) {
        box.minX += offset.x; box.maxX += offset.x;
        box.minY += offset.y; box.maxY += offset.y;
      }
    }
    taken.push(...boxes);
  }
  let moved = 0;
  const symbolBounds = new Map(items.map(item => [item, boxOf(item, 0)]));
  // Short symbols have fewer nearby label positions; reserve those before wider captions.
  const labels = items.map((item) => ({ item, text: labelBox(item.component, { x: 0, y: 0 }) }));
  for (const { item: it, text } of labels.sort((a, b) => a.item.length - b.item.length || b.text.maxX - a.text.maxX)) {
    const comp = it.component;
    if ((!componentCaption(comp) && !comp.value) || ["wire", "dot", "label"].includes(comp.componentType)) continue;
    const body = boxOf(it, 2);
    const angle = it.rotation * Math.PI / 180;
    const cx = it.x + it.length * Math.cos(angle) / 2;
    const cy = it.y + it.length * Math.sin(angle) / 2;
    const vertical = Math.abs(Math.sin(angle)) > 0.5;
    const offset = effectiveSymbolDef(comp.componentType, comp.attrs).labelOffset;
    const preferred = it.labelPos ?? (vertical
      ? { x: body.maxX + LABEL_GUTTER - text.minX + (offset?.dx ?? 0), y: cy - 4 + (offset?.dy ?? 0) }
      : { x: cx + (offset?.dx ?? 0), y: body.minY - LABEL_GUTTER - text.maxY + (offset?.dy ?? 0) });
    const occupied: LabelBox[] = taken.map((box) => ({ x: box.minX, y: box.minY,
      width: box.maxX - box.minX, height: box.maxY - box.minY }));
    let placed = placeLabel({ x: preferred.x + (text.minX + text.maxX) / 2,
      y: preferred.y + (text.minY + text.maxY) / 2 },
    { width: text.maxX - text.minX, height: text.maxY - text.minY }, occupied,
    { x: Math.cos(angle), y: Math.sin(angle) });
    const neighbours = items.filter(other => other !== it).map(other => symbolBounds.get(other)!);
    const ownerBounds = symbolBounds.get(it)!;
    const distanceTo = (candidate: LabelBox, b: Box) => {
      const x = candidate.x + candidate.width / 2, y = candidate.y + candidate.height / 2;
      return Math.hypot(x - Math.max(b.minX, Math.min(b.maxX, x)),
        y - Math.max(b.minY, Math.min(b.maxY, y)));
    };
    const belongsToOwner = (candidate: LabelBox) => neighbours.every(other =>
      distanceTo(candidate, other) >= distanceTo(candidate, ownerBounds));
    if (occupied.some(box => labelOverlap(placed, box) > 0) || !belongsToOwner(placed)) {
      // Local positions can all be blocked by long parallel wires. Search the
      // free rectangles defined by those obstacles instead of accepting overlap.
      const origin = { x: preferred.x + text.minX, y: preferred.y + text.minY };
      const xs = [...new Set([origin.x, ...occupied.flatMap(b =>
        [b.x - placed.width - LABEL_GUTTER, b.x + b.width + LABEL_GUTTER])])];
      const ys = [...new Set([origin.y, ...occupied.flatMap(b =>
        [b.y - placed.height - LABEL_GUTTER, b.y + b.height + LABEL_GUTTER])])];
      xs.sort((a, b) => Math.abs(a - origin.x) - Math.abs(b - origin.x));
      ys.sort((a, b) => Math.abs(a - origin.y) - Math.abs(b - origin.y));
      let best = placed, distance = Infinity, bestOwned = false;
      for (const x of xs) {
        if (bestOwned && Math.abs(x - origin.x) >= distance) break;
        const blockers = occupied.filter(box => x < box.x + box.width && x + placed.width > box.x);
        for (const y of ys) {
          const d = Math.hypot(x - origin.x, y - origin.y);
          if (bestOwned && d >= distance) break;
          const candidate = { ...placed, x, y };
          if (blockers.every(box => y >= box.y + box.height || y + placed.height <= box.y)) {
            const owned = belongsToOwner(candidate);
            if ((owned && !bestOwned) || (owned === bestOwned && d < distance)) {
              best = candidate; distance = d; bestOwned = owned;
            }
          }
        }
      }
      placed = best;
    }
    const chosen = { x: placed.x - text.minX, y: placed.y - text.minY };
    if (chosen.x !== preferred.x || chosen.y !== preferred.y) moved++;
    it.labelPos = chosen;
    taken.push(labelBox(comp, chosen));
  }
  return { moved };
}

function finalize(
  items: LaidOutComponent[],
  routes: RoutedWire[],
  flags: SupplyFlagMark[],
  topOff = 0
): AutoLayoutResult {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const eat = (p: { x: number; y: number }) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  };
  const eatBox = (box: Box) => {
    eat({ x: box.minX, y: box.minY });
    eat({ x: box.maxX, y: box.maxY });
  };
  for (const it of items) {
    eatBox(boxOf(it, 0));
    for (const a of Object.values(it.anchors)) eat(a);
    if (it.labelPos) eatBox(labelBox(it.component, it.labelPos));
  }
  for (const r of routes) {
    for (const p of r.points) eat(p);
    for (const p of r.junctions ?? []) eatBox({ minX: p.x - 3.5, maxX: p.x + 3.5, minY: p.y - 3.5, maxY: p.y + 3.5 });
  }
  for (const box of flagBoxes(flags, topOff)) eatBox(box);
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 200;
    maxY = 200;
  }
  const pad = 44;
  minX -= pad;
  minY -= pad + 8;
  maxX += pad;
  maxY += pad;
  return {
    width: maxX - minX,
    height: maxY - minY,
    offsetX: -minX,
    offsetY: -minY,
    items,
    routes,
    flags,
  };
}

/**
 * Lay a netlist out along schematic conventions. Returns null when the netlist
 * carries no pin map, which is the one case where there is nothing to reason
 * about; the public entry reports missing connectivity.
 */
function layoutCandidate(
  ast: CircuitAST,
  opts?: SchematicLayoutOptions,
  columns?: number,
  traversal: "breadth" | "depth" = "breadth"
): (AutoLayoutResult & { stats?: SchematicLayoutStats }) | null {
  const pinMap = ast.pinMap ?? {};
  if (!ast.components.length) return finalize([], [], [], ast.title ? 24 : 0);
  if (Object.keys(pinMap).length === 0) return null;

  // ── 1. Classify nets ──────────────────────────────────────────
  // Source glyphs identify drivers; connectivity decides which drivers are
  // supplies. A separate source entering a two-pin input branch is excitation,
  // even when its glyph is a DC source. AC mains can still supply a whole circuit.
  const groundNets = new Set<string>();
  const powerNets = new Set<string>();
  const allPins: PinRef[] = [];
  for (const comp of ast.components) {
    for (const [pinName, net] of pinEntriesOf(ast, comp)) {
      allPins.push({ compId: comp.id, pinName, net });
      if (GROUND_NET_NAMES.has(net.toLowerCase()) || isGroundType(comp)) groundNets.add(net);
    }
  }
  const drivers = ast.components.filter(isSource);
  // DC sources linked through a two-terminal transfer path share one network.
  // Cutting each source tap into a supply bus destroys that path. Walk only
  // two-terminal links away from the common return: ICs do not conduct from
  // every pin to every other pin, so they must not join unrelated supplies.
  const transferAdjacency = new Map<string, Set<string>>();
  for (const comp of ast.components.filter(c => !isSource(c) && !["capacitor", "electrolytic_cap", "variable_cap", "varactor", "crystal"].includes(c.componentType))) {
    const nets = pinEntriesOf(ast, comp).map(([, net]) => net);
    if (nets.length !== 2 || nets.some(net => groundNets.has(net))) continue;
    for (const [a, b] of [[nets[0]!, nets[1]!], [nets[1]!, nets[0]!]]) {
      if (!transferAdjacency.has(a!)) transferAdjacency.set(a!, new Set());
      transferAdjacency.get(a!)!.add(b!);
    }
  }
  const transferSources = new Set<CircuitComponent>();
  const transferRoots = new Set<CircuitComponent>();
  const groundedDrivers = drivers.filter(driver => driver.componentType !== "ac_source" &&
    pinEntriesOf(ast, driver).length === 2 &&
    pinEntriesOf(ast, driver).some(([, net]) => groundNets.has(net)));
  for (const source of groundedDrivers) {
    if (transferSources.has(source)) continue;
    const visited = new Set(pinEntriesOf(ast, source).map(([, net]) => net)
      .filter(net => !groundNets.has(net)));
    for (const net of visited) for (const next of transferAdjacency.get(net) ?? []) visited.add(next);
    const connected = groundedDrivers.filter(driver => pinEntriesOf(ast, driver)
      .some(([, net]) => visited.has(net)));
    const sourceNets = new Set(connected.flatMap(driver => pinEntriesOf(ast, driver)
      .map(([, net]) => net).filter(net => !groundNets.has(net))));
    if (connected.length < 2 || sourceNets.size < 2) continue;
    connected.forEach(driver => transferSources.add(driver));
    transferRoots.add(source);
  }
  const supplySources = drivers.filter((comp) => !transferSources.has(comp) && (
    (drivers.length === 1 && (comp.componentType !== "ac_source" ||
      pinEntriesOf(ast, comp).every(([, net]) => !groundNets.has(net)))) ||
    pinEntriesOf(ast, comp).some(([, net]) => !groundNets.has(net) &&
      new Set(allPins.filter((p) => p.net === net && p.compId !== comp.id).map((p) => p.compId)).size > 1)));
  const excitations = drivers.filter((comp) => transferRoots.has(comp) ||
    (!transferSources.has(comp) && !supplySources.includes(comp)));
  const excitationNets = new Set(excitations.flatMap((comp) =>
    pinEntriesOf(ast, comp).map(([, net]) => net).filter((net) => !groundNets.has(net))));
  for (const comp of supplySources) {
    for (const [, net] of pinEntriesOf(ast, comp)) {
      if (!groundNets.has(net)) powerNets.add(net);
    }
  }

  const terminalBlocks = ast.components.filter((c) => c.componentType === "terminal_block");
  for (const source of supplySources) {
    const minus = pinMap[source.id]?.minus;
    if (minus && source.componentType !== "ac_source" && !groundNets.size) groundNets.add(minus);
  }
  // Protection and named wires carry a shared supply onward to its consumers.
  for (let changed = true; changed;) {
    changed = false;
    for (const comp of ast.components.filter((c) => ["fuse", "fuse_slow", "wire"].includes(c.componentType))) {
      const nets = pinEntriesOf(ast, comp).map(([, net]) => net);
      if (!nets.some((net) => powerNets.has(net))) continue;
      for (const net of nets) if (!groundNets.has(net) && !powerNets.has(net) &&
        allPins.filter((pin) => pin.net === net).length > 2) {
        powerNets.add(net); changed = true;
      }
    }
  }
  for (const net of groundNets) powerNets.delete(net);

  const isSupplyNet = (net: string) => groundNets.has(net) || powerNets.has(net);

  // Supply classification keeps rails out of signal adjacency. Drawing a bus
  // is a separate fan-out decision: a source-to-load pair needs only a wire.
  const busNets = new Set([...powerNets, ...groundNets].filter((net) =>
    groundNets.has(net) || new Set(allPins.filter((p) => p.net === net &&
      !terminalBlocks.some(block => block.id === p.compId)).map((p) => p.compId)).size > 2));

  const levels = supplyLevels(supplySources, pinMap, groundNets);
  const powerBuses = [...busNets].filter((net) => !groundNets.has(net))
    .sort((a, b) => (levels.get(b) ?? 0) - (levels.get(a) ?? 0));
  const explicitGrounds = ast.components.filter(isGroundType);
  const placeable = ast.components.filter((c) => !isGroundType(c) && !terminalBlocks.includes(c));
  const railOnly = placeable.filter((comp) => {
    const pins = pinEntriesOf(ast, comp);
    return pins.length > 0 && pins.every(([, net]) => isSupplyNet(net));
  });
  const nonSource = placeable.filter((c) => !railOnly.includes(c) && !excitations.includes(c));

  // A two-terminal part with exactly one leg on a supply is a shunt. It does
  // not belong in the signal-flow graph at all: it has no downstream, and
  // letting it claim its own layer both lengthens the drawing and — worse —
  // stacks parallel shunts into a column that reads as a series chain. The
  // textbook idiom is to hang it off the node it taps, which is what step 5b
  // does once the nodes have coordinates.
  const netPinCount = new Map<string, number>();
  for (const p of allPins) {
    netPinCount.set(p.net, (netPinCount.get(p.net) ?? 0) + 1);
  }

  /**
   * Does this two-terminal part hang off a node, or is it a link in a chain?
   *
   * "One leg on a supply" is not the answer on its own. The first resistor of
   * a ten-resistor ladder has one leg on the supply and is unmistakably a link
   * — drawing it upright while its nine identical siblings lie flat tells the
   * reader it is a different kind of element. The pull-up in an astable also
   * has one leg on the supply and is unmistakably hanging.
   *
   * What separates them is the node on the other end. A net with exactly two
   * pins is a junction between two parts: the chain continues through it. A
   * net with three or more is a real node with several consumers, and a part
   * feeding it from a rail is pulling that node up. Ground returns always
   * hang, because that is the direction the drawing reserves for them.
   */
  const isShuntComp = (c: CircuitComponent): boolean => {
    const pins = pinEntriesOf(ast, c);
    if (pins.length !== 2) return false;
    const supply = pins.filter(([, n]) => isSupplyNet(n));
    if (supply.length !== 1) return false;
    if (groundNets.has(supply[0]![1])) return true;
    const signal = pins.find(([, n]) => !isSupplyNet(n));
    return signal ? (netPinCount.get(signal[1]) ?? 0) >= 3 : false;
  };
  // A part fed from a supply rail is carrying signal forward; a part returning
  // to ground is hanging off a node. Only the second reads as a shunt leg, and
  // keeping that distinction is what stops a divider from being drawn as two
  // unrelated parts side by side.
  const isGroundShunt = (c: CircuitComponent): boolean => {
    const pins = pinEntriesOf(ast, c);
    if (pins.length !== 2) return false;
    return pins.filter(([, n]) => groundNets.has(n)).length === 1;
  };

  let shuntComps = nonSource.filter(isShuntComp);
  let signalComps = nonSource.filter((c) => !isShuntComp(c));
  // An RC network or a divider is *all* shunt by the broad definition — there
  // is no separate signal path to hang them off, because they are the signal
  // path. Promote the supply-fed ones to carry the chain and let the ones
  // returning to ground keep hanging, which is how both are always drawn.
  if (signalComps.length === 0) {
    signalComps = nonSource.filter((c) => !isGroundShunt(c));
    shuntComps = nonSource.filter(isGroundShunt);
    if (signalComps.length === 0) {
      signalComps = nonSource;
      shuntComps = [];
    }
  }

  // ── 2. Signal graph ───────────────────────────────────────────
  const netToComps = new Map<string, string[]>();
  for (const p of allPins) {
    if (isSupplyNet(p.net)) continue;
    const list = netToComps.get(p.net) ?? [];
    if (!list.includes(p.compId)) list.push(p.compId);
    netToComps.set(p.net, list);
  }
  const byId = new Map(ast.components.map((c) => [c.id, c]));
  const neighbours = new Map<string, Set<string>>();
  for (const c of signalComps) neighbours.set(c.id, new Set());
  for (const comps of netToComps.values()) {
    const inGraph = comps.filter((id) => neighbours.has(id));
    for (const a of inGraph) {
      for (const b of inGraph) if (a !== b) neighbours.get(a)!.add(b);
    }
  }

  // ── 3. Layer assignment (signal flow, left to right) ──────────
  // Excitations seed their input branches; supply-fed chains seed circuits
  // that have no separate excitation.
  // BFS gives depth without needing the graph to be acyclic — a feedback net
  // simply does not deepen the layer of a component already reached, which is
  // exactly the treatment a feedback path deserves.
  const layer = new Map<string, number>();
  const seeds = signalComps
    .filter((c) => pinEntriesOf(ast, c).some(([, n]) =>
      excitationNets.size ? excitationNets.has(n) : powerNets.has(n)))
    .map((c) => c.id);
  const startIds = seeds.length
    ? seeds
    : signalComps.length
      ? [
          [...signalComps]
            .sort(
              (a, b) =>
                (neighbours.get(a.id)?.size ?? 0) -
                (neighbours.get(b.id)?.size ?? 0)
            )[0]!.id,
        ]
      : [];

  if (traversal === "depth") {
    // A depth-first spanning tree preserves a continuous path around cycles;
    // breadth-first placement may put both ends beside the source. Neither is
    // assumed better: the complete routed drawings are compared below.
    const stack = startIds.map(id => ({ id, depth: 0 })).reverse();
    while (stack.length) {
      const { id, depth } = stack.pop()!;
      if (layer.has(id)) continue;
      layer.set(id, depth);
      for (const nb of [...(neighbours.get(id) ?? [])].reverse()) {
        if (!layer.has(nb) && !startIds.includes(nb)) stack.push({ id: nb, depth: depth + 1 });
      }
    }
  } else {
    const queue = [...startIds];
    for (const id of startIds) layer.set(id, 0);
    while (queue.length) {
      const id = queue.shift()!;
      const d = layer.get(id)!;
      for (const nb of neighbours.get(id) ?? []) {
        if (!layer.has(nb)) {
          layer.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }
  }
  // Disconnected islands still need a home.
  let spare = Math.max(0, ...[...layer.values()]) + 1;
  for (const c of signalComps) {
    if (!layer.has(c.id)) layer.set(c.id, spare++);
  }

  // Independent terminal channels with the same parts share a row template.
  // Terminal numbers order the rows; neither references nor net names identify a pattern.
  const channelBanks: CircuitComponent[][][] = [];
  const channelOf = new Map<string, { bank: number; row: number }>();
  if (terminalBlocks.length === 1) {
    const remaining = new Set(nonSource);
    const groups: CircuitComponent[][] = [];
    while (remaining.size) {
      const group = [remaining.values().next().value!]; remaining.delete(group[0]!);
      for (let i = 0; i < group.length; i++) {
        const nets = new Set(pinEntriesOf(ast, group[i]!).map(([, net]) => net).filter((net) => !isSupplyNet(net)));
        for (const comp of remaining) if (pinEntriesOf(ast, comp).some(([, net]) => nets.has(net))) {
          group.push(comp); remaining.delete(comp);
        }
      }
      groups.push(group);
    }
    const patterns = new Map<string, CircuitComponent[][]>();
    for (const group of groups) {
      const signature = group.map((c) => `${c.componentType}:${pinEntriesOf(ast, c).length}`).sort().join(",");
      const matches = patterns.get(signature) ?? []; matches.push(group); patterns.set(signature, matches);
    }
    const terminalNets = pinEntriesOf(ast, terminalBlocks[0]!).map(([, net]) => net);
    if (patterns.size <= 2 && terminalNets.length === groups.length &&
      groups.every((group) => new Set(group.flatMap((c) => pinEntriesOf(ast, c).map(([, net]) => net)
        .filter((net) => terminalNets.includes(net)))).size === 1) &&
      [...patterns.values()].every((groups) => groups.length > 1)) {
      const order = (group: CircuitComponent[]) => Math.min(...group.flatMap((c) => pinEntriesOf(ast, c)
        .map(([, net]) => terminalNets.indexOf(net)).filter((index) => index >= 0)));
      channelBanks.push(...[...patterns.values()].map((groups) => groups.sort((a, b) => order(a) - order(b)))
        .sort((a, b) => order(a[0]!) - order(b[0]!)));
      signalComps = channelBanks.flatMap((groups) => groups.map((group) => group.find((comp) =>
        pinEntriesOf(ast, comp).some(([, net]) => powerNets.has(net))) ?? group[0]!));
      shuntComps = nonSource.filter((comp) => !signalComps.includes(comp));
      layer.clear();
      channelBanks.forEach((groups, bank) => groups.forEach((group, row) => group.forEach((comp) => {
        channelOf.set(comp.id, { bank, row });
        if (signalComps.includes(comp)) layer.set(comp.id, bank * 2);
      })));
    }
  }

  // ── 4. Barycenter ordering inside each layer ──────────────────
  const layers: string[][] = [];
  for (const [id, d] of layer) {
    (layers[d] ??= []).push(id);
  }
  for (let i = 0; i < layers.length; i++) layers[i] ??= [];
  const slot = new Map<string, number>();
  for (const col of layers) col.forEach((id, i) => slot.set(id, i));

  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    const forward = sweep % 2 === 0;
    const order = forward
      ? layers.map((_, i) => i)
      : layers.map((_, i) => layers.length - 1 - i);
    for (const li of order) {
      const col = layers[li]!;
      if (col.length < 2) continue;
      const ref = forward ? layers[li - 1] : layers[li + 1];
      if (!ref || ref.length === 0) continue;
      const bary = new Map<string, number>();
      for (const id of col) {
        const nbs = [...(neighbours.get(id) ?? [])].filter((n) =>
          ref.includes(n)
        );
        bary.set(
          id,
          nbs.length
            ? nbs.reduce((s, n) => s + (slot.get(n) ?? 0), 0) / nbs.length
            : (slot.get(id) ?? 0)
        );
      }
      col.sort((a, b) => (bary.get(a) ?? 0) - (bary.get(b) ?? 0));
      col.forEach((id, i) => slot.set(id, i));
    }
  }

  if (channelBanks.length) for (const col of layers) col.sort((a, b) => channelOf.get(a)!.row - channelOf.get(b)!.row);

  // ── 4b. Fold long chains into bands ───────────────────────────
  // A series chain is topologically a straight line, so layering alone still
  // yields one very long row — correct, and unreadable. Paper schematics wrap
  // for exactly this reason.
  //
  // The fold reads left-to-right on every row, like text. Boustrophedon
  // (alternating direction) gives a shorter carry wire and was tried first,
  // but it misleads: R6…R9 laid out right-to-left appear on the page as
  // "R9 R8 R7 R6", which a reader takes for a numbering mistake rather than a
  // direction change, and a symmetric part like a resistor gives no clue that
  // the row reversed. An always-forward fold costs one visible carry wire per
  // fold and leaves no room for that misreading.
  const cols = columns ?? Math.max(4, Math.ceil(Math.sqrt(layers.length * 1.6)));
  const rowOf = (li: number) => Math.floor(li / cols);
  const colOf = (li: number) => li % cols;
  const rowHeights: number[] = [];
  layers.forEach((col, li) => {
    const r = rowOf(li);
    rowHeights[r] = Math.max(rowHeights[r] ?? 1, col.length);
  });

  // Columns are as wide as their widest occupant, not a fixed pitch. An IC is
  // several times the width of a resistor, so a constant 104px column let two
  // chips in adjacent layers overlap — the reader sees two boxes sitting on
  // top of each other, which no amount of good routing recovers from. Same
  // reasoning vertically: a tall part must not be handed a short slot.
  {
    const clearance = BRANCH_GAP;
    // One footprint rule reserves the painted body, measured label and terminal leads.
    const spacing = (comp: CircuitComponent, dir: "right" | "down" = "down") => {
      const body = boxOf(placeAt({ ...comp }, 0, 0, dir), 0), label = labelBox(comp, { x: 0, y: 0 });
      return { width: Math.ceil(body.maxX - body.minX + label.maxX - label.minX + clearance + TERMINAL_LEAD),
        height: Math.ceil(body.maxY - body.minY + label.maxY - label.minY + clearance + TERMINAL_LEAD) };
    };
    const colWidth: number[] = [];
    const slotHeight: number[] = [];
    for (let li = 0; li < layers.length; li++) {
      const c = colOf(li);
      for (const id of layers[li] ?? []) {
        const comp = byId.get(id);
        if (!comp) continue;
        const space = spacing(comp, "right");
        colWidth[c] = Math.max(colWidth[c] ?? LAYER_W, space.width);
        slotHeight[rowOf(li)] = Math.max(slotHeight[rowOf(li)] ?? SLOT_H, space.height);
      }
    }
    const channelHeight = channelBanks.length ? Math.max(...nonSource.map((c) => spacing(c).height)) + clearance + TERMINAL_LEAD : 0;
    if (channelBanks.length) {
      slotHeight[0] = channelHeight;
      channelBanks.forEach((groups, bank) => {
        colWidth[bank * 2] = Math.max(...groups.map((group) => group.reduce((width, c) => width + spacing(c).width, 0)));
      });
      colWidth[1] = spacing(terminalBlocks[0]!, "right").width;
    }
    const colLeft: number[] = [];
    let accX = LEFT_MARGIN;
    for (let c = 0; c < cols; c++) {
      colLeft[c] = accX;
      accX += colWidth[c] ?? LAYER_W;
    }
    // Recompute row tops now that slot heights may be taller than the default.
    const rowTop: number[] = [];
    let acc = TOP_MARGIN;
    for (let r = 0; r < rowHeights.length; r++) {
      rowTop[r] = acc;
      acc += (rowHeights[r] ?? 1) * (slotHeight[r] ?? SLOT_H) + SLOT_H * 0.5;
    }

    // Depth of each signal net: the earliest layer that touches it. This is what
    // "upstream" means once layering has run, and it is what decides whether a
    // part's own pin order agrees with the direction the drawing flows.
    const netLayer = new Map<string, number>();
    for (const p of allPins) {
      if (isSupplyNet(p.net)) continue;
      const d = layer.get(p.compId);
      if (d === undefined) continue;
      const cur = netLayer.get(p.net);
      if (cur === undefined || d < cur) netLayer.set(p.net, d);
    }

    // ── 5. Place ──────────────────────────────────────────────────
    const items: LaidOutComponent[] = [];
    const placed = new Map<string, LaidOutComponent>();

    for (let li = 0; li < layers.length; li++) {
      const col = layers[li]!;
      col.forEach((id, si) => {
        const comp = byId.get(id);
        if (!comp) return;
        const pins = pinEntriesOf(ast, comp);
        const signalPins = pins.filter(([, n]) => !isSupplyNet(n));
        const x = colLeft[colOf(li)] ?? LEFT_MARGIN;
        const y =
          (rowTop[rowOf(li)] ?? TOP_MARGIN) +
          si * (slotHeight[rowOf(li)] ?? SLOT_H);
        // If the netlist puts this part's first pin on the downstream node, its
        // natural left-to-right geometry runs against the flow: the wires would
        // cross over the body, and on a polarised part the terminal that belongs
        // downstream would be drawn upstream. Mirroring resolves both.
        const flowReversed =
          signalPins.length === 2 &&
          (netLayer.get(signalPins[0]![1]) ?? 0) >
            (netLayer.get(signalPins[1]![1]) ?? 0);
        const laid = placeAt(comp, x, y, "right", flowReversed);
        items.push(laid);
        placed.set(comp.id, laid);
      });
    }

    // Place by the actual terminal net, never by declaration order. This keeps
    // reversed sources and polarised shunts connected to their authored pins.
    const upright = (comp: CircuitComponent, topPin: string, x: number, y: number) => {
      const sym = effectiveSymbolDef(comp.componentType, comp.attrs);
      const top = sym.anchors[topPin]!;
      const other = pinEntriesOf(ast, comp).find(([pin]) => pin !== topPin);
      const bottom = other ? sym.anchors[other[0]] : undefined;
      const dir = bottom && top.x > bottom.x ? "up" : "down";
      const laid = placeAt(comp, x, y, dir);
      const shift = { x: x - laid.anchors[topPin]!.x, y: y - laid.anchors[topPin]!.y };
      laid.x += shift.x; laid.y += shift.y;
      for (const anchor of Object.values(laid.anchors)) { anchor.x += shift.x; anchor.y += shift.y; }
      return laid;
    };
    const reserve = (laid: LaidOutComponent, direction = 1) => {
      const gap = spacing(laid.component).width;
      while (items.some((it) => boxesOverlap(boxOf(laid, clearance / 2), boxOf(it, clearance / 2)))) {
        laid.x += gap * direction;
        for (const anchor of Object.values(laid.anchors)) anchor.x += gap * direction;
      }
      items.push(laid); placed.set(laid.component.id, laid);
    };
    let sourceX = LEFT_MARGIN - excitations.reduce((width, comp) => width + spacing(comp).width, 0);
    for (const comp of railOnly.filter((comp) => isSource(comp) ||
      pinEntriesOf(ast, comp).some(([, net]) => !busNets.has(net)))) {
      const pins = pinEntriesOf(ast, comp);
      const top = pins.find(([, net]) => powerNets.has(net)) ?? pins[0]!;
      const supply = supplySources.includes(comp);
      if (supply) sourceX -= spacing(comp).width;
      reserve(upright(comp, top[0], supply ? sourceX : LEFT_MARGIN, TOP_MARGIN - channelHeight), supply ? -1 : 1);
    }
    for (const comp of excitations) {
      const pins = pinEntriesOf(ast, comp);
      const output = pins.find(([, net]) => !groundNets.has(net)) ?? pins[0]!;
      const connection = allPins.find((p) => p.net === output[1] && placed.has(p.compId));
      const host = connection ? placed.get(connection.compId)! : undefined;
      const anchor = connection ? host?.anchors[connection.pinName] : undefined;
      reserve(upright(comp, output[0], (anchor?.x ?? LEFT_MARGIN) - spacing(comp).width, anchor?.y ?? TOP_MARGIN), -1);
    }

    // ── 5b. Hang shunts off the node they tap ─────────────────────
    // Vertical, directly above the node for a pull-up and below it for a pull-
    // down, so the drawing says which way the part pulls. Several shunts on one
    // node fan out sideways rather than overprinting each other.
    const shuntsPerNode = new Map<string, number>();
    for (const comp of shuntComps) {
      const pins = pinEntriesOf(ast, comp);
      const signalPin = pins.find(([, n]) => !isSupplyNet(n));
      const supplyPin = pins.find(([, n]) => isSupplyNet(n));
      if (!signalPin || !supplyPin) continue;
      const toGround = groundNets.has(supplyPin[1]);

      // Anchor on whichever placed component shares this node — and insist on
      // the pin that actually carries the net. Falling back to `end` on the
      // first host that happened to match sent two pull-ups on *different* nets
      // to the same coordinate, so they stacked into a column and read as a
      // series pair rather than as two independent pull-ups.
      let anchor: PinAnchor | undefined;
      for (const p of allPins) {
        if (p.net !== signalPin[1] || p.compId === comp.id) continue;
        const host = placed.get(p.compId);
        if (!host) continue;
        const exact = host.anchors[p.pinName];
        if (exact) {
          anchor = exact;
          break;
        }
      }
      // Fan out by the column the anchor actually lands in, not by net name: two
      // pull-ups on different nets still collide when those nets arrive on the
      // same edge of the same chip, which is where an IC puts all of one side's
      // pins.
      const key = `${Math.round((anchor?.x ?? 0) / LABEL_GUTTER)},${Math.round((anchor?.y ?? 0) / LABEL_GUTTER)}`;
      const nth = shuntsPerNode.get(key) ?? 0;
      shuntsPerNode.set(key, nth + 1);

      const base = anchor ?? {
        x: LEFT_MARGIN + layers.length * LAYER_W,
        y: TOP_MARGIN,
      };
      const x = base.x + nth * spacing(comp).width;
      const sym = effectiveSymbolDef(comp.componentType, comp.attrs);
      const y = toGround ? base.y + clearance + TERMINAL_LEAD : base.y - clearance - TERMINAL_LEAD - sym.length;
      reserve(upright(comp, toGround ? signalPin[0] : supplyPin[0], x, y));
    }

    // Terminal strips bound the wiring area. Opposite banks use opposite faces,
    // without mirroring their numbers or printing the caption inside the symbol.
    const inner = items.map((it) => boxOf(it, 0));
    terminalBlocks.forEach((comp, index) => {
      const left = terminalBlocks.length > 1 && index === 0;
      comp.attrs = { ...comp.attrs, _terminal_side: left ? "right" : "left",
        _terminal_pitch: String(channelHeight || BRANCH_GAP + TERMINAL_LEAD) };
      if (channelBanks.length === 2) comp.attrs._terminal_split = String(channelBanks[0]!.length);
      const sym = effectiveSymbolDef(comp.componentType, comp.attrs);
      const first = sym.anchors[pinEntriesOf(ast, comp)[0]![0]]!;
      const x = channelBanks.length ? colLeft[1]! : left
        ? Math.min(...inner.map((b) => b.minX)) - spacing(comp, "right").width - TERMINAL_LEAD
        : Math.max(...inner.map((b) => b.maxX)) + clearance + TERMINAL_LEAD + (index ? (index - 1) * spacing(comp, "right").width : 0);
      const item = placeAt(comp, x, TOP_MARGIN - first.y, "right");
      items.push(item); placed.set(comp.id, item);
    });

    // Wider label and branch footprints also buy vertical separation. Moving
    // the rows (not stretching glyphs or adding blank canvas) balances the sheet.
    const bounds = items.map((it) => boxOf(it, 0));
    const originSpan = Math.max(...items.map((it) => it.y)) - Math.min(...items.map((it) => it.y));
    const targetHeight = (Math.max(...bounds.map((b) => b.maxX)) - Math.min(...bounds.map((b) => b.minX))) / MAX_ASPECT;
    const scaleY = originSpan ? Math.max(1, (targetHeight - Math.max(...bounds.map((b) => b.maxY - b.minY)) - 2 * (clearance + BUS_CLEARANCE)) / originSpan) : 1;
    if (!channelBanks.length && scaleY > 1) for (const item of items) {
      const rowY = item.y - (item.rotation === 270 ? item.length : 0);
      const dy = (rowY - TOP_MARGIN) * (scaleY - 1);
      item.y += dy;
      for (const anchor of Object.values(item.anchors)) anchor.y += dy;
    }

    // ── 6. Route ordinary nets ──────────────────────────────────────
    const routes: RoutedWire[] = [];
    // Pins on a symbol boundary may run along that boundary; inflating it
    // sent collector routes down through the emitter on the same symbol edge.
    const routingItems = items.filter((it) => !railOnly.includes(it.component) ||
      pinEntriesOf(ast, it.component).some(([, net]) => !busNets.has(net)));
    const routeSignal = routerFor(routingItems, pinMap);
    const obstacles = routingItems.map((it) => boxOf(it, -1));

    const netPins = new Map<string, Array<{ pt: PinAnchor; compId: string }>>();
    for (const p of allPins) {
      if (busNets.has(p.net)) continue;
      const host = placed.get(p.compId);
      if (!host) continue;
      const a = host.anchors[p.pinName];
      if (!a) continue;
      const list = netPins.get(p.net) ?? [];
      list.push({ pt: a, compId: p.compId });
      netPins.set(p.net, list);
    }

    let routedNets = 0;
    for (const [net, pins] of netPins) {
      if (pins.length < 2) continue;
      routedNets++;
      const sorted = [...pins].sort((a, b) => a.pt.x - b.pt.x);
      const throughCandidates = sorted.filter((pin) => {
        const host = placed.get(pin.compId)!;
        return signalComps.includes(host.component) && host.rotation % 180 === 0 &&
          [host.anchors.start, host.anchors.end].some((anchor) => anchor &&
            Math.abs(anchor.x - pin.pt.x) < 0.5 && Math.abs(anchor.y - pin.pt.y) < 0.5);
      });
      const through = throughCandidates.map((pin) => throughCandidates.filter((other) =>
        Math.abs(other.pt.y - pin.pt.y) < 0.5)).sort((a, b) => b.length - a.length)[0] ?? [];
      // The run follows the terminals of its series parts. Hanging branches
      // must not pull that run below a resistor or a regulator's in/out pins.
      const run = through.length ? {
        minX: through[0]!.pt.x, maxX: through[through.length - 1]!.pt.x,
        minY: through[0]!.pt.y, maxY: through[0]!.pt.y,
      } : undefined;
      // A pin on the far side of an IC cannot be approached through its body.
      if (run && !obstacles.some((box) => boxesOverlap(run, box))) {
        const y = through[0]!.pt.y;
        const lo = Math.min(...through.map((pin) => pin.pt.x));
        const hi = Math.max(...through.map((pin) => pin.pt.x));
        const junctions: PinAnchor[] = [];
        const attachments: RoutedWire[] = [];
        for (const pin of sorted.filter((pin) => !through.includes(pin))) {
          const x = through.length === 1 ? through[0]!.pt.x : Math.max(lo, Math.min(hi, pin.pt.x));
          const join = [{ x, y }, ...attachments.flatMap((r) => r.points)].sort((a, b) =>
            Math.abs(a.x - pin.pt.x) + Math.abs(a.y - pin.pt.y) - Math.abs(b.x - pin.pt.x) - Math.abs(b.y - pin.pt.y))[0]!;
          junctions.push(join);
          attachments.push({ netId: `${net}.${pin.compId}`, points: routeSignal(pin.pt, join, [...routes, ...attachments], net) });
        }
        routes.push({ netId: net, points: [{ x: lo, y }, { x: hi, y }],
          junctions: sorted.length > 2 ? junctions : undefined });
        // Keep two-terminal nets as a single route, including the complete
        // source/input path which callers identify by its net name.
        if (through.length === 1 && sorted.length === 2) {
          routes.pop();
          routes.push({ netId: net, points: attachments[0]!.points });
        } else {
          routes.push(...attachments);
        }
        continue;
      }
      if (sorted.length === 2) {
        routes.push({ netId: net, points: routeSignal(sorted[0]!.pt, sorted[1]!.pt, routes, net) });
        continue;
      }
      // Grow a connected tree from the closest pair. A compulsory horizontal
      // spine can land beyond a shunt's opposite terminal and obscure which
      // side is connected. Attach each remaining pin to the routed tree itself.
      const distance = (a: PinAnchor, b: PinAnchor) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      const foreignPins = allPins.filter(pin => pin.net !== net)
        .flatMap(pin => placed.get(pin.compId)?.anchors[pin.pinName] ?? []);
      const foreignSegments = routes.filter(route => routeNet(route.netId, ast.nets.map(n => n.id)) !== net)
        .flatMap(route => route.points.slice(1).map((b, i) => ({a: route.points[i]!, b})));
      const clearJunction = (join: PinAnchor) => foreignPins.every(p =>
        Math.hypot(p.x - join.x, p.y - join.y) > LABEL_GUTTER) && foreignSegments.every(({a, b}) =>
        Math.hypot(join.x - Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), join.x)),
          join.y - Math.max(Math.min(a.y, b.y), Math.min(Math.max(a.y, b.y), join.y))) > LABEL_GUTTER);
      let tree: RoutedWire[] = [];
      try {
        const pair = sorted.flatMap((pin, i) => sorted.slice(i + 1).map(other => ({pin, other})))
          .sort((a, b) => distance(a.pin.pt, a.other.pt) - distance(b.pin.pt, b.other.pt))[0]!;
        tree = [{netId: net, points: routeSignal(pair.pin.pt, pair.other.pt, routes, net)}];
        const remaining = sorted.filter(pin => pin !== pair.pin && pin !== pair.other);
        while (remaining.length) {
          const choices = remaining.flatMap(pin => tree.flatMap(route => route.points.slice(1).flatMap((b, i) => {
            const a = route.points[i]!;
            const projection = {x: Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), pin.pt.x)),
              y: Math.max(Math.min(a.y, b.y), Math.min(Math.max(a.y, b.y), pin.pt.y))};
            return [projection, a, b].filter(join => routingItems.every(item => {
              if (Object.entries(pinMap[item.component.id] ?? {}).some(([name, owner]) => owner === net &&
                item.anchors[name]?.x === join.x && item.anchors[name]?.y === join.y)) return true;
              const box = boxOf(item, BODY_CLEARANCE);
              return join.x <= box.minX || join.x >= box.maxX || join.y <= box.minY || join.y >= box.maxY;
            })).filter(clearJunction).map(join => ({pin, join}));
          }))).sort((a, b) => distance(a.pin.pt, a.join) - distance(b.pin.pt, b.join));
          const unique = choices.filter((c, i) => choices.findIndex(other => other.pin === c.pin &&
            other.join.x === c.join.x && other.join.y === c.join.y) === i).slice(0, 4);
          const best = unique.flatMap(c => {
            try { return [{...c, points: routeSignal(c.pin.pt, c.join, [...routes, ...tree], net)}]; }
            catch (error) {
              if (!(error instanceof Error) || !error.message.startsWith("No obstacle-free orthogonal route")) throw error;
              return [];
            }
          })
            .map(c => ({...c, cost: measureRouting([...tree, {netId: net, points: c.points}], [net]).cost}))
            .sort((a, b) => a.cost - b.cost)[0];
          if (!best) throw new Error("No clear branch junction");
          tree.push({netId: `${net}.${best.pin.compId}`, points: best.points, junctions: [best.join]});
          remaining.splice(remaining.indexOf(best.pin), 1);
        }
      } catch (error) {
        if (!(error instanceof Error) || !/^(No obstacle-free orthogonal route|No clear branch junction)/.test(error.message)) throw error;
        tree = [];
      }
      // Compare the local tree with a shared straight run. Greedy pairwise
      // attachment alone makes parallel branches descend in a staircase.
      // Derive channels from terminals and their clear lead ends, never names.
      let bestTree = tree;
      let bestCost = tree.length ? measureRouting([...routes, ...tree], ast.nets.map(n => n.id)).cost : Infinity;
      const ends = terminalLeads(routingItems, pinMap).filter(lead => lead.net === net)
        .flatMap(lead => lead.points);
      for (const axis of ["x", "y"] as const) {
        const other = axis === "x" ? "y" : "x";
        const channels = [...new Set(ends.map(p => p[axis]))].sort((a, b) =>
          sorted.reduce((sum, pin) => sum + Math.abs(pin.pt[axis] - a) - Math.abs(pin.pt[axis] - b), 0)).slice(0, 4);
        for (const channel of channels) {
          const taps = sorted.map(pin => ({...pin.pt, [axis]: channel}));
          const extremities = [...taps].sort((a, b) => a[other] - b[other]);
          if (!taps.every(clearJunction)) continue;
          try {
            const trunk = routeSignal(extremities[0]!, extremities[extremities.length - 1]!, routes, net);
            // Every projected junction must actually lie on the trunk.
            if (trunk.some(p => p[axis] !== channel)) continue;
            const option: RoutedWire[] = [{netId: net, points: trunk, junctions: taps}];
            for (const [i, pin] of sorted.entries()) {
              option.push({netId: `${net}.${pin.compId}`,
                points: routeSignal(pin.pt, taps[i]!, [...routes, ...option], net)});
            }
            const cost = measureRouting([...routes, ...option], ast.nets.map(n => n.id)).cost;
            if (cost < bestCost) { bestTree = option; bestCost = cost; }
          } catch (error) {
            if (!(error instanceof Error) || !error.message.startsWith("No obstacle-free orthogonal route")) throw error;
          }
        }
      }
      if (!bestTree.length) throw new Error("No clear branch junction");
      routes.push(...bestTree);
    }

    // A bus-to-bus part owns a clear column at the block edge. Place it after
    // routing signals so both rail legs stay outside the signal wiring, rather
    // than sending its return through the collector and emitter branches.
    let edgeX = Math.max(LEFT_MARGIN, ...items.filter((it) => !railOnly.includes(it.component)).map((it) => boxOf(it, 0).maxX),
      ...routes.flatMap((route) => route.points.map((point) => point.x)));
    for (const comp of railOnly.filter((comp) => !isSource(comp) &&
      pinEntriesOf(ast, comp).every(([, net]) => busNets.has(net)))) {
      const pins = pinEntriesOf(ast, comp);
      const top = pins.find(([, net]) => powerNets.has(net)) ?? pins[0]!;
      const item = upright(comp, top[0], edgeX + clearance + TERMINAL_LEAD, TOP_MARGIN);
      items.push(item); placed.set(comp.id, item);
      edgeX = item.x + spacing(comp).width;
    }

    // ── 7. Shared supply buses ───────────────────────────────────
    const flags: SupplyFlagMark[] = [];
    const bodies = items.map((it) => boxOf(it, 0));
    const railLeft = Math.min(LEFT_MARGIN, ...bodies.map((b) => b.minX)) - TERMINAL_LEAD;
    const railRight = Math.max(LEFT_MARGIN, ...bodies.map((b) => b.maxX)) + TERMINAL_LEAD;
    const topY = Math.min(TOP_MARGIN, ...bodies.map((b) => b.minY)) - clearance - BUS_CLEARANCE;
    const bottomY = Math.max(TOP_MARGIN, ...bodies.map((b) => b.maxY)) + clearance + BUS_CLEARANCE;
    for (const [index, net] of [...powerBuses, ...groundNets].entries()) {
      const ground = groundNets.has(net);
      const railY = ground ? bottomY + [...groundNets].indexOf(net) * (BUS_CLEARANCE + clearance) : topY - (powerBuses.length - 1 - index) * (BUS_CLEARANCE + clearance);
      const grounds = explicitGrounds.filter((g) => pinEntriesOf(ast, g).some(([, n]) => n === net));
      grounds.forEach((g, i) => {
        const laid = placeAt(g, railLeft + TERMINAL_LEAD + i * BRANCH_GAP, railY, "down");
        items.push(laid); placed.set(g.id, laid);
      });
      // renderCircuit adds its title offset inside flag transforms as well as
      // outside the whole drawing. Compensate here so the glyph meets the bus.
      if (!ground || !grounds.length) flags.push({
        kind: ground ? "ground" : "vcc", at: { x: railLeft + (ground ? TERMINAL_LEAD : 0), y: railY - (ast.title ? 24 : 0) },
        label: ground && net === "GND" ? undefined : net,
      });
      const junctions: PinAnchor[] = [];
      if (ground && !grounds.length) {
        const at = { x: railLeft + TERMINAL_LEAD, y: railY };
        junctions.push(at);
      }
      const bankX = channelBanks.map((_, bank) => ground
        ? colLeft[bank * 2]! + colWidth[bank * 2]! - clearance
        : colLeft[bank * 2]! - BUS_CLEARANCE);
      for (const [bank, x] of bankX.entries()) {
        if (!channelBanks[bank]!.flat().some((c) => pinEntriesOf(ast, c).some(([, n]) => n === net))) continue;
        const endY = ground ? TOP_MARGIN : TOP_MARGIN + Math.max(...channelBanks.map((bank) => bank.length)) * channelHeight - clearance;
        routes.push({ netId: `${net}.bank`, points: [{ x, y: railY }, { x, y: endY }] });
        junctions.push({ x, y: railY });
      }
      const routeSupply = routerFor(items, pinMap);
      for (const pin of allPins.filter((p) => p.net === net)) {
        const host = placed.get(pin.compId);
        const anchor = host?.anchors[pin.pinName];
        if (!host || !anchor) continue;
        const channel = channelOf.get(pin.compId);
        const target = channel ? { x: bankX[channel.bank]!, y: anchor.y } : { x: anchor.x, y: railY };
        if (!channel) {
          const foreign = routes.filter(r => routeNet(r.netId, ast.nets.map(n => n.id)) !== net)
            .flatMap(r => r.points.slice(1).map((b, i) => ({ a: r.points[i]!, b })));
          const candidates = [...new Set([anchor.x, ...foreign.flatMap(({ a, b }) =>
            [a.x - TERMINAL_LEAD, a.x + TERMINAL_LEAD, b.x - TERMINAL_LEAD, b.x + TERMINAL_LEAD])])]
            .sort((a, b) => Math.abs(a - anchor.x) - Math.abs(b - anchor.x) || a - b);
          // A new rail tap must not put a junction on an existing foreign wire.
          target.x = candidates.find(x => foreign.every(({ a, b }) =>
            x < Math.min(a.x, b.x) - LABEL_GUTTER || x > Math.max(a.x, b.x) + LABEL_GUTTER ||
            railY < Math.min(a.y, b.y) - LABEL_GUTTER || railY > Math.max(a.y, b.y) + LABEL_GUTTER)) ?? anchor.x;
        }
        // Enter a horizontal rail vertically: the junction dot must mark the
        // visible T connection, rather than sit beyond a run along the rail.
        const approach = channel ? target : { x: target.x,
          y: railY + Math.sign(anchor.y - railY) * TERMINAL_LEAD };
        const points = compactRoute([...routeSupply(anchor, approach, routes, net), target]);
        const end = points[points.length - 1]!;
        if (!channel) junctions.push(end);
        routes.push({ netId: `${net}.${pin.compId}.${pin.pinName}`, points, junctions: channel ? [end] : undefined });
      }
      routes.push({ netId: net, points: [
        { x: Math.min(railLeft, ...junctions.map((p) => p.x)), y: railY },
        { x: Math.max(railRight, ...junctions.map((p) => p.x)), y: railY },
      ], junctions });
    }

    // Regulator outputs retain their terminal-led runs and carry their authored
    // supply names, just as the full-width source buses do.
    const outputNets = new Set(ast.components.filter((c) => c.componentType === "voltage_regulator")
      .map((c) => pinMap[c.id]?.out).filter((net): net is string => !!net));
    for (const net of outputNets) {
      if (busNets.has(net)) continue;
      const segments = routes.filter((r) => r.netId === net || r.netId.startsWith(`${net}.`))
        .flatMap((r) => r.points.slice(1).map((b, i) => ({ a: r.points[i]!, b })))
        .filter(({ a, b }) => a.y === b.y)
        .sort((a, b) => Math.abs(b.a.x - b.b.x) - Math.abs(a.a.x - a.b.x));
      const segment = segments[0];
      if (segment) flags.push({ kind: "label", label: net,
        at: { x: Math.min(segment.a.x, segment.b.x), y: segment.a.y - (ast.title ? 24 : 0) } });
    }

    // ── 8. Labels ─────────────────────────────────────────────────
    const labels = placeLabels(items, routes, flags, ast.title ? 24 : 0);

    const result = finalize(items, routes, flags, ast.title ? 24 : 0) as AutoLayoutResult & {
      stats?: SchematicLayoutStats;
    };
    if (opts?.collectStats) {
      result.stats = {
        layers: layers.length,
        maxSlots: Math.max(1, ...layers.map((l) => l.length)),
        implicitFlags: flags.length,
        routedNets,
        labelsMoved: labels.moved,
      };
    }
    return result;
  }
}

/** Evaluate complete drawings, not just distances between un-routed nodes. */
export function schematicNetlistLayout(ast: CircuitAST, opts?: SchematicLayoutOptions) {
  let evaluated = 0;
  let routingError: Error | undefined;
  const tried = new Map<string, ReturnType<typeof layoutCandidate>>();
  const candidate = (columns?: number, traversal: "breadth" | "depth" = "breadth") => {
    const key = `${traversal}:${columns ?? "auto"}`;
    if (tried.has(key)) return tried.get(key)!;
    if (evaluated >= 8) return null;
    evaluated++;
    try {
      const layout = layoutCandidate({ ...ast, components: ast.components.map(comp => ({ ...comp,
        attrs: comp.attrs ? { ...comp.attrs } : undefined })),
      }, { collectStats: true }, columns, traversal);
      tried.set(key, layout);
      return layout;
    } catch (error) {
      if (!(error instanceof Error) || !/^(No obstacle-free orthogonal route|No clear branch junction)/.test(error.message)) throw error;
      routingError = error;
      tried.set(key, null);
      return null;
    }
  };
  let best = candidate();
  // Blocked terminal channels invalidate placement, not electrical constraints.
  // Try another fold instead of painting an unchecked wire through a symbol.
  if (!best && routingError) for (const traversal of ["breadth", "depth"] as const) {
    for (const columns of [2, 3, 4]) {
      best = candidate(columns, traversal);
      if (best) break;
    }
    if (best) break;
  }
  if (!best) {
    if (routingError) throw routingError;
    return null;
  }
  const quality = (layout: AutoLayoutResult) => {
    const bodies = layout.items.map(item => boxOf(item, -1));
    const captions = layout.items.filter(item => item.labelPos && (componentCaption(item.component) || item.component.value))
      .map(item => labelBox(item.component, item.labelPos!));
    const asObstacle = (box: Box) => ({ left: box.minX, right: box.maxX, top: box.minY, bottom: box.maxY });
    const connected = new Set(ast.nets.filter(net => net.anchors.length > 1).map(net => net.id));
    const leads = terminalLeads(layout.items.filter(item => !isGroundType(item.component)), ast.pinMap ?? {})
      .filter(lead => connected.has(lead.net));
    const q = measureRouting(layout.routes, ast.nets.map(net => net.id), bodies.map(asObstacle), captions.map(asObstacle), leads);
    const aspect = Math.max(layout.width / layout.height, layout.height / layout.width);
    return { ...q, cost: q.cost + q.length * Math.max(0, aspect - MAX_ASPECT) ** 2 };
  };
  let bestQuality = quality(best);
  const before = bestQuality;
  const consider = (next: ReturnType<typeof candidate>) => {
    if (!next) return;
    const q = quality(next);
    // A perpendicular terminal exit is a drawing preference, not an electrical
    // violation. Bends already contribute to cost; treating exit direction as
    // a hard gate can lock the search into an unreadably tall placement.
    if (!isBetterRouting(q, bestQuality)) return;
    best = next; bestQuality = q;
  };
  if ((best.stats?.layers ?? 0) > 1) for (const traversal of ["breadth", "depth"] as const) {
    const initial = traversal === "breadth" ? best : candidate(undefined, traversal);
    const depth = initial?.stats?.layers ?? 0;
    const standard = Math.max(4, Math.ceil(Math.sqrt(depth * 1.6)));
    // At most eight complete drawings: two spanning trees and four folds.
    if (traversal === "depth") consider(initial);
    const columns = [...new Set([Math.max(2, standard - 1), standard + 1, depth])]
      .filter(value => value !== standard && value > 0 && value <= depth);
    for (const cols of columns) consider(candidate(cols, traversal));
  }
  if (opts?.collectStats && best.stats) best.stats.optimization = { candidates: evaluated, before, after: bestQuality };
  if (!opts?.collectStats) delete best.stats;
  return best;
}
