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
 *   1. POWER AND GROUND ARE NOT WIRES. A real schematic almost never runs a
 *      supply bus across the page; each pin that sits on a supply net gets a
 *      local flag (a Vcc bar, a ground rake) right next to it. That removes
 *      the majority of the wires from the drawing — and, more importantly, it
 *      frees placement, because components no longer have to line up along a
 *      rail to reach power.
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
import type { CircuitAST, CircuitComponent } from "../../core/types";
import { effectiveSymbolDef, type PinAnchor } from "./symbols";
import type { LaidOutComponent } from "./layout";
import type {
  AutoLayoutResult,
  RoutedWire,
  SupplyFlagMark,
} from "./autolayout";
import { estimateTextWidth } from "../../core/text-metrics";

/** Horizontal distance between adjacent signal-flow layers. */
const LAYER_W = 104;
/** Vertical distance between adjacent slots inside one layer. */
const SLOT_H = 88;
const LEFT_MARGIN = 78;
const TOP_MARGIN = 64;
/** How far a local supply flag sits from the pin it serves. */
const FLAG_REACH = 26;
/** Barycenter sweeps. Three is where the standard heuristic stops improving. */
const SWEEPS = 4;

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
}

interface PinRef {
  compId: string;
  pinName: string;
  net: string;
}

function isPowerSourceType(c: CircuitComponent): boolean {
  return (
    c.componentType === "voltage_source" ||
    c.componentType === "current_source" ||
    c.componentType === "ac_source" ||
    c.componentType === "battery" ||
    c.componentType === "solar_cell" ||
    c.componentType === "vcc"
  );
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
  const c = Math.cos(r);
  const s = Math.sin(r);
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
  // An orientation the author wrote down outranks anything layout infers.
  const direction =
    comp.attrs?.dirExplicit === "true" ? comp.direction : dir;
  comp.direction = direction;
  const rot = rotationOf(direction);
  const anchors: Record<string, PinAnchor> = {};
  if (mirror && direction === "right") {
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

function compactPoints(points: PinAnchor[]): PinAnchor[] {
  const out: PinAnchor[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.x - p.x) < 0.5 && Math.abs(prev.y - p.y) < 0.5) {
      continue;
    }
    out.push(p);
  }
  return out;
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boxOf(it: LaidOutComponent, pad = 10): Box {
  const xs = Object.values(it.anchors).map((a) => a.x);
  const ys = Object.values(it.anchors).map((a) => a.y);
  xs.push(it.x);
  ys.push(it.y);
  return {
    minX: Math.min(...xs) - pad,
    minY: Math.min(...ys) - pad,
    maxX: Math.max(...xs) + pad,
    maxY: Math.max(...ys) + pad,
  };
}

function boxesOverlap(a: Box, b: Box): boolean {
  return !(
    a.maxX <= b.minX ||
    b.maxX <= a.minX ||
    a.maxY <= b.minY ||
    b.maxY <= a.minY
  );
}

/**
 * Pick a horizontal channel for an HVH route that does not cut through any
 * component. Real routers run A* over a grid; a channel search is the cheap
 * approximation that removes the offence people actually notice — a wire
 * crossing a symbol — without the machinery.
 */
function freeChannelY(
  from: PinAnchor,
  to: PinAnchor,
  obstacles: Box[]
): number {
  const candidates = [
    (from.y + to.y) / 2,
    Math.min(from.y, to.y) - SLOT_H / 2,
    Math.max(from.y, to.y) + SLOT_H / 2,
    Math.min(from.y, to.y) - SLOT_H,
    Math.max(from.y, to.y) + SLOT_H,
  ];
  const loX = Math.min(from.x, to.x);
  const hiX = Math.max(from.x, to.x);
  for (const y of candidates) {
    const seg: Box = { minX: loX, minY: y - 3, maxX: hiX, maxY: y + 3 };
    if (!obstacles.some((o) => boxesOverlap(seg, o))) return y;
  }
  return (from.y + to.y) / 2;
}

/**
 * Label placement. Candidates are ordered by how conventional they look
 * (above a horizontal part, right of a vertical one, then the mirrors); the
 * first that collides with nothing already placed wins. Greedy is enough
 * here because the candidate set is small and the placement order is stable.
 */
function placeLabels(
  items: LaidOutComponent[],
  routes: RoutedWire[]
): number {
  const taken: Box[] = [];
  for (const it of items) taken.push(boxOf(it, 2));
  for (const r of routes) {
    for (let i = 0; i + 1 < r.points.length; i++) {
      const a = r.points[i]!;
      const b = r.points[i + 1]!;
      taken.push({
        minX: Math.min(a.x, b.x) - 2,
        minY: Math.min(a.y, b.y) - 2,
        maxX: Math.max(a.x, b.x) + 2,
        maxY: Math.max(a.y, b.y) + 2,
      });
    }
  }

  let moved = 0;
  for (const it of items) {
    const comp = it.component;
    if (!comp.label && !comp.value) continue;
    const widest = Math.max(
      estimateTextWidth(comp.label ?? "", 11),
      estimateTextWidth(comp.value ?? "", 10)
    );
    const h = (comp.label ? 13 : 0) + (comp.value ? 12 : 0);
    const vertical = it.rotation === 90 || it.rotation === 270;
    const cx = it.x + (vertical ? 0 : it.length / 2);
    const cy = it.y + (vertical ? it.length / 2 : 0);

    // Candidates run from the most conventional position outwards. Dense
    // boards exhaust the polite options, so the fallback is the least-bad
    // placement by overlap area rather than the first one in the list — that
    // is the difference between a label sitting slightly off and a label
    // printed straight through a neighbouring symbol.
    const near = 30;
    const far = 52;
    const candidates: Array<{ x: number; y: number }> = vertical
      ? [
          { x: cx + near, y: cy - 4 },
          { x: cx - near, y: cy - 4 },
          { x: cx + near, y: cy - 24 },
          { x: cx - near, y: cy - 24 },
          { x: cx + far, y: cy - 4 },
          { x: cx - far, y: cy - 4 },
          { x: cx, y: cy - 40 },
          { x: cx, y: cy + 46 },
          { x: cx + far, y: cy + 24 },
          { x: cx - far, y: cy + 24 },
        ]
      : [
          { x: cx, y: cy - 20 },
          { x: cx, y: cy + 32 },
          { x: cx, y: cy - 38 },
          { x: cx, y: cy + 50 },
          { x: cx + it.length * 0.75, y: cy - 20 },
          { x: cx - it.length * 0.75, y: cy - 20 },
          { x: cx + it.length * 0.75, y: cy + 32 },
          { x: cx - it.length * 0.75, y: cy + 32 },
          { x: cx, y: cy - 56 },
          { x: cx, y: cy + 68 },
        ];

    const boxFor = (c: { x: number; y: number }): Box => ({
      minX: c.x - widest / 2 - 2,
      minY: c.y - 11,
      maxX: c.x + widest / 2 + 2,
      maxY: c.y + h - 9,
    });
    const overlapArea = (a: Box, b: Box): number => {
      const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
      const hh = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
      return w > 0 && hh > 0 ? w * hh : 0;
    };

    let chosen = candidates[0]!;
    let bestCost = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i]!;
      const box = boxFor(c);
      let cost = 0;
      for (const t of taken) cost += overlapArea(box, t);
      // Break ties toward the conventional positions at the front of the list.
      cost += i * 0.5;
      if (cost < bestCost) {
        bestCost = cost;
        chosen = c;
        if (cost <= i * 0.5 + 0.001) break; // clean slot, stop looking
      }
    }
    if (bestCost > 0.5) moved++;
    it.labelPos = chosen;
    taken.push({
      minX: chosen.x - widest / 2 - 2,
      minY: chosen.y - 11,
      maxX: chosen.x + widest / 2 + 2,
      maxY: chosen.y + h - 9,
    });
  }
  return moved;
}

function finalize(
  items: LaidOutComponent[],
  routes: RoutedWire[],
  flags: SupplyFlagMark[]
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
  for (const it of items) {
    for (const a of Object.values(it.anchors)) eat(a);
    eat({ x: it.x, y: it.y });
    if (it.labelPos) eat(it.labelPos);
  }
  for (const r of routes) for (const p of r.points) eat(p);
  // Flags sit outside their pin, so they set the bound as often as parts do.
  for (const f of flags) {
    eat(f.at);
    eat({ x: f.at.x, y: f.at.y + (f.kind === "ground" ? 20 : -20) });
  }
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
 * about and the caller should keep its previous behaviour.
 */
export function schematicNetlistLayout(
  ast: CircuitAST,
  opts?: SchematicLayoutOptions
): (AutoLayoutResult & { stats?: SchematicLayoutStats }) | null {
  const pinMap = ast.pinMap ?? {};
  if (Object.keys(pinMap).length === 0) return null;

  // ── 1. Classify nets ──────────────────────────────────────────
  // Ground is recognised by name. A supply net is one a power source drives:
  // that is what makes it a rail rather than an ordinary node, and it is the
  // distinction that decides whether the net gets drawn as wires at all.
  const groundNets = new Set<string>();
  const powerNets = new Set<string>();
  const allPins: PinRef[] = [];

  for (const comp of ast.components) {
    for (const [pinName, net] of pinEntriesOf(ast, comp)) {
      allPins.push({ compId: comp.id, pinName, net });
      if (GROUND_NET_NAMES.has(net.toLowerCase())) groundNets.add(net);
    }
  }
  for (const comp of ast.components) {
    if (!isPowerSourceType(comp)) continue;
    for (const [, net] of pinEntriesOf(ast, comp)) {
      if (!groundNets.has(net)) powerNets.add(net);
    }
  }

  const isSupplyNet = (net: string) => groundNets.has(net) || powerNets.has(net);

  // Ground symbols the author declared are not discarded — every declared
  // component must appear in the layout. They are re-used as the local flag
  // for a pin on their net, so the drawing gains the flag idiom without
  // drawing the same rake twice or losing a part the author wrote.
  const explicitGrounds = ast.components.filter(isGroundType);
  const groundPool = new Map<string, CircuitComponent[]>();
  for (const g of explicitGrounds) {
    for (const [, net] of pinEntriesOf(ast, g)) {
      const pool = groundPool.get(net) ?? [];
      pool.push(g);
      groundPool.set(net, pool);
    }
  }
  const placeable = ast.components.filter((c) => !isGroundType(c));
  const nonSource = placeable.filter((c) => !isPowerSourceType(c));
  if (nonSource.length === 0) return null;

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
  // Seeds are the parts a supply actually feeds; they are where signal enters.
  // BFS gives depth without needing the graph to be acyclic — a feedback net
  // simply does not deepen the layer of a component already reached, which is
  // exactly the treatment a feedback path deserves.
  const layer = new Map<string, number>();
  const seeds = signalComps
    .filter((c) => pinEntriesOf(ast, c).some(([, n]) => powerNets.has(n)))
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
  // Disconnected islands still need a home.
  let spare = Math.max(0, ...[...layer.values()]) + 1;
  for (const c of signalComps) {
    if (!layer.has(c.id)) layer.set(c.id, spare++);
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
  const cols = Math.max(4, Math.ceil(Math.sqrt(layers.length * 1.6)));
  const rowOf = (li: number) => Math.floor(li / cols);
  const colOf = (li: number) => li % cols;
  const rowHeights: number[] = [];
  layers.forEach((col, li) => {
    const r = rowOf(li);
    rowHeights[r] = Math.max(rowHeights[r] ?? 1, col.length);
  });
  const rowTop: number[] = [];
  let acc = TOP_MARGIN;
  for (let r = 0; r < rowHeights.length; r++) {
    rowTop[r] = acc;
    acc += (rowHeights[r] ?? 1) * SLOT_H + SLOT_H * 0.5;
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

  // Power sources own the left column, standing upright the way a supply is
  // conventionally drawn, with their own flags top and bottom.
  const sources = placeable.filter(isPowerSourceType);
  sources.forEach((src, i) => {
    const laid = placeAt(src, LEFT_MARGIN - LAYER_W, TOP_MARGIN + i * SLOT_H * 2, "up");
    items.push(laid);
    placed.set(src.id, laid);
  });

  for (let li = 0; li < layers.length; li++) {
    const col = layers[li]!;
    col.forEach((id, si) => {
      const comp = byId.get(id);
      if (!comp) return;
      const pins = pinEntriesOf(ast, comp);
      const supplyPins = pins.filter(([, n]) => isSupplyNet(n));
      const signalPins = pins.filter(([, n]) => !isSupplyNet(n));
      // A two-terminal part with exactly one leg on a supply is a shunt: it
      // stands vertically under its node, which is how it is always drawn.
      const x = LEFT_MARGIN + colOf(li) * LAYER_W;
      const y = (rowTop[rowOf(li)] ?? TOP_MARGIN) + si * SLOT_H;
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
      void supplyPins;
      void signalPins;
    });
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

    // Anchor on whichever placed component shares this node.
    let anchor: PinAnchor | undefined;
    for (const p of allPins) {
      if (p.net !== signalPin[1] || p.compId === comp.id) continue;
      const host = placed.get(p.compId);
      if (!host) continue;
      anchor = host.anchors[p.pinName] ?? host.anchors.end;
      if (anchor) break;
    }
    const key = signalPin[1];
    const nth = shuntsPerNode.get(key) ?? 0;
    shuntsPerNode.set(key, nth + 1);

    const base = anchor ?? {
      x: LEFT_MARGIN + layers.length * LAYER_W,
      y: TOP_MARGIN,
    };
    const x = base.x + nth * 46;
    const y = toGround ? base.y + SLOT_H * 0.55 : base.y - SLOT_H * 1.15;
    const laid = placeAt(comp, x, y, "down");
    items.push(laid);
    placed.set(comp.id, laid);
  }

  // ── 6. Implicit supply flags ──────────────────────────────────
  const flags: SupplyFlagMark[] = [];
  const supplyStubs: RoutedWire[] = [];
  let flagCount = 0;
  for (const p of allPins) {
    if (!isSupplyNet(p.net)) continue;
    const host = placed.get(p.compId);
    if (!host) continue;
    const anchor = host.anchors[p.pinName] ?? host.anchors.end;
    if (!anchor) continue;
    const ground = groundNets.has(p.net);
    const at = { x: anchor.x, y: anchor.y + (ground ? FLAG_REACH : -FLAG_REACH) };
    // Naming the rail is only informative when there is more than one to tell
    // apart. On a single-supply circuit the name repeated at every pin is
    // noise, and the bar glyph already says "this goes to the supply".
    const nameRails = powerNets.size > 1;
    // Spend an author-declared ground symbol here before synthesising one, so
    // the part they wrote is the part that gets drawn.
    const claimed = ground ? groundPool.get(p.net)?.shift() : undefined;
    const stubTo = at;
    if (claimed) {
      // An author-declared ground is a real part: it stays in `items`.
      const laid = placeAt(claimed, at.x, at.y, "down");
      items.push(laid);
      placed.set(claimed.id, laid);
    } else {
      flags.push({
        kind: ground ? "ground" : "vcc",
        at,
        label: ground || !nameRails ? undefined : p.net,
      });
    }
    flagCount++;
    // Stub from the pin to its flag — the only wire a supply connection needs.
    supplyStubs.push({
      netId: `${p.net}.${p.compId}`,
      points: [anchor, stubTo],
    });
  }

  // Any declared ground left unclaimed (its net has no other pin to sit under)
  // still has to be drawn — dropping it would silently lose a part.
  for (const g of explicitGrounds) {
    if (placed.has(g.id)) continue;
    const anchorNet = pinEntriesOf(ast, g)[0]?.[1];
    let at: PinAnchor = { x: LEFT_MARGIN, y: TOP_MARGIN + layers.length * SLOT_H };
    if (anchorNet) {
      for (const p of allPins) {
        if (p.net !== anchorNet || p.compId === g.id) continue;
        const host = placed.get(p.compId);
        const a = host?.anchors[p.pinName];
        if (a) {
          at = { x: a.x, y: a.y + FLAG_REACH };
          break;
        }
      }
    }
    const laid = placeAt(g, at.x, at.y, "down");
    items.push(laid);
    placed.set(g.id, laid);
  }

  // ── 7. Route signal nets ──────────────────────────────────────
  const routes: RoutedWire[] = [...supplyStubs];
  const obstacles = items.map((it) => boxOf(it, 6));

  const netPins = new Map<string, Array<{ pt: PinAnchor; compId: string }>>();
  for (const p of allPins) {
    if (isSupplyNet(p.net)) continue;
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
    if (sorted.length === 2) {
      const [a, b] = [sorted[0]!.pt, sorted[1]!.pt];
      if (Math.abs(a.y - b.y) < 0.5) {
        routes.push({ netId: net, points: compactPoints([a, b]) });
      } else {
        const my = freeChannelY(a, b, obstacles);
        routes.push({
          netId: net,
          points: compactPoints([
            a,
            { x: a.x, y: my },
            { x: b.x, y: my },
            b,
          ]),
        });
      }
      continue;
    }
    // 3+ pins: one horizontal spine in a free channel, each pin drops to it.
    const spineY = freeChannelY(
      sorted[0]!.pt,
      sorted[sorted.length - 1]!.pt,
      obstacles
    );
    const minX = Math.min(...sorted.map((p) => p.pt.x));
    const maxX = Math.max(...sorted.map((p) => p.pt.x));
    routes.push({
      netId: net,
      points: [
        { x: minX, y: spineY },
        { x: maxX, y: spineY },
      ],
      junctions: sorted
        .filter((p) => Math.abs(p.pt.y - spineY) > 0.5)
        .map((p) => ({ x: p.pt.x, y: spineY })),
    });
    for (const p of sorted) {
      if (Math.abs(p.pt.y - spineY) < 0.5) continue;
      routes.push({
        netId: `${net}.${p.compId}`,
        points: [p.pt, { x: p.pt.x, y: spineY }],
      });
    }
  }

  // ── 8. Labels ─────────────────────────────────────────────────
  const labelsMoved = placeLabels(items, routes);

  const result = finalize(items, routes, flags) as AutoLayoutResult & {
    stats?: SchematicLayoutStats;
  };
  if (opts?.collectStats) {
    result.stats = {
      layers: layers.length,
      maxSlots: Math.max(1, ...layers.map((l) => l.length)),
      implicitFlags: flagCount,
      routedNets,
      labelsMoved,
    };
  }
  return result;
}
