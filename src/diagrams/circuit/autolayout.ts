/**
 * Auto-layout engine for netlist-mode circuits.
 *
 * Strategy (lightweight Sugiyama-ish, no external deps):
 *
 *   1. Classify components by role:
 *        - POWER_TOP: voltage/current sources, battery (supply rails → top)
 *        - GROUND:    ground symbols (→ bottom)
 *        - MIDDLE:    everything else
 *
 *   2. Build adjacency between non-rail components via shared nets (power/
 *      ground nets ignored for this purpose — they'd make everything adjacent).
 *
 *   3. Rank (vertical Y layer) via BFS from power sources:
 *        rank 0 = power, rank K = ground, middle at 1..K-1 by topo distance.
 *
 *   4. Within each rank, order components by declaration order (stable).
 *      Orientation per component is chosen based on which pins connect up vs
 *      down vs sideways — defaults to horizontal.
 *
 *   5. Orthogonal routing: each net is drawn as a polyline via HVH (horizontal
 *      → vertical → horizontal) from each member pin to a common spine.
 *        - 2-pin nets: direct HVH between the two pin coords.
 *        - 3+ pin nets: find median Y, draw horizontal spine, each pin drops
 *          V to spine, then H to spine center. Junctions get dots.
 *
 *   6. Power rail and ground rail: drawn as full-width horizontal lines at the
 *      top/bottom edges of the component region.
 *
 * This is deliberately simple. Output is readable but not publication-grade.
 * Quality can improve by adding rank constraints, barycenter ordering, and a
 * proper grid A* router — but that's future work.
 */
import type {
  CircuitAST,
  CircuitComponent,
} from "../../core/types";
import { effectiveSymbolDef, type PinAnchor } from "./symbols";
import type {
  LaidOutComponent,
  CircuitLayoutResult,
} from "./layout";
import { estimateTextWidth } from "../../core/text-metrics";

const COL_W = 96; // horizontal spacing per component
const ROW_H = 80; // vertical spacing per band (spine / shunt / ground)
const LEFT_MARGIN = 70;
const TOP_MARGIN = 56;
const SHUNT_OFFSET = 28; // x nudge when two shunts share a node
const AC_LEFT_MARGIN = 96;
const AC_LIVE_Y = 56;
const AC_RETURN_Y = 150;
const AC_SERIES_GAP = 58;
const AC_TRAVELER_SPAN = 128;

export interface RoutedWire {
  netId: string;
  /** Polyline points in world coords. */
  points: PinAnchor[];
  /** Junction dot positions (3+ pin nets have these). */
  junctions?: PinAnchor[];
}

export interface AutoLayoutResult extends CircuitLayoutResult {
  routes: RoutedWire[];
}

function isPowerSource(c: CircuitComponent): boolean {
  return (
    c.componentType === "voltage_source" ||
    c.componentType === "current_source" ||
    c.componentType === "ac_source" ||
    c.componentType === "battery" ||
    c.componentType === "solar_cell" ||
    c.componentType === "vcc"
  );
}

function isGround(c: CircuitComponent): boolean {
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
 * Choose default direction per role so pin anchors aim the right way.
 *
 * Convention:
 *   - Power source gets direction "up" so its `end` (= plus) rotates to land
 *     ABOVE origin — naturally connects to a supply rail at the top.
 *     Its `start` (= minus) stays at origin, close to the GND rail.
 *     i.e. rotation 270° takes (40,0)→(0,−40) — plus sits 40px above origin.
 *   - Ground keeps direction "up" (the stem points down from the origin which
 *     sits on the rail).
 *   - Middle components stay horizontal.
 */
function defaultDirection(c: CircuitComponent): "right" | "left" | "up" | "down" {
  if (isPowerSource(c)) return "up";
  // Ground symbol is drawn with stem pointing rightward in its native
  // orientation; rotating by "down" (90°) makes the stem point down and rake
  // lines appear below — the conventional ground-hanging-below layout.
  if (isGround(c)) return "down";
  return "right";
}

/**
 * Compute bounding box for a laid-out component including its rotated anchors
 * and a margin for the symbol body.
 */
function extendBBox(
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  pt: PinAnchor
): void {
  if (pt.x < bbox.minX) bbox.minX = pt.x;
  if (pt.y < bbox.minY) bbox.minY = pt.y;
  if (pt.x > bbox.maxX) bbox.maxX = pt.x;
  if (pt.y > bbox.maxY) bbox.maxY = pt.y;
}

function placeComponent(
  comp: CircuitComponent,
  x: number,
  y: number,
  fallbackDir?: "right" | "left" | "up" | "down"
): LaidOutComponent {
  // Honor an explicit L2 hint (`dir=`); else the caller's band default; else role.
  const direction =
    comp.attrs?.dirExplicit === "true"
      ? comp.direction
      : fallbackDir ?? defaultDirection(comp);
  comp.direction = direction;
  const rot = rotationOf(direction);
  const sym = effectiveSymbolDef(comp.componentType, comp.attrs);
  const worldAnchors: Record<string, PinAnchor> = {};
  for (const [name, pt] of Object.entries(sym.anchors)) {
    const rp = rotatePt(pt, rot);
    worldAnchors[name] = { x: x + rp.x, y: y + rp.y };
  }
  return {
    component: comp,
    x,
    y,
    rotation: rot,
    length: sym.length,
    anchors: worldAnchors,
  };
}

function placeMirroredComponent(comp: CircuitComponent, x: number, y: number): LaidOutComponent {
  const sym = effectiveSymbolDef(comp.componentType, comp.attrs);
  const length = sym.length;
  const worldAnchors: Record<string, PinAnchor> = {};
  comp.direction = "left";
  for (const [name, pt] of Object.entries(sym.anchors)) {
    worldAnchors[name] = { x: x + length - pt.x, y: y + pt.y };
  }
  return {
    component: comp,
    x,
    y,
    rotation: 0,
    mirrorX: true,
    length,
    anchors: worldAnchors,
  };
}

function pinEntries(
  pinMap: Record<string, Record<string, string>>,
  comp: CircuitComponent
): Array<[string, string]> {
  return Object.entries(pinMap[comp.id] ?? {});
}

function anchorForNet(
  pinMap: Record<string, Record<string, string>>,
  laid: LaidOutComponent,
  netId: string
): PinAnchor | undefined {
  const pin = Object.entries(pinMap[laid.component.id] ?? {}).find(
    ([, net]) => net === netId
  )?.[0];
  return pin ? laid.anchors[pin] : undefined;
}

function compactPoints(points: PinAnchor[]): PinAnchor[] {
  const out: PinAnchor[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (!prev || Math.abs(prev.x - p.x) > 0.5 || Math.abs(prev.y - p.y) > 0.5) {
      out.push(p);
    }
  }
  return out;
}

function routeViaY(netId: string, a: PinAnchor, b: PinAnchor, y: number): RoutedWire {
  if (Math.abs(a.y - b.y) < 0.5) return { netId, points: [a, b] };
  return {
    netId,
    points: compactPoints([a, { x: a.x, y }, { x: b.x, y }, b]),
  };
}

function routeViaX(netId: string, a: PinAnchor, b: PinAnchor, x: number): RoutedWire {
  if (Math.abs(a.x - b.x) < 0.5) return { netId, points: [a, b] };
  return {
    netId,
    points: compactPoints([a, { x, y: a.y }, { x, y: b.y }, b]),
  };
}

function isAutoGround(c: CircuitComponent): boolean {
  return isGround(c) && c.attrs?.auto === "true";
}

function isTwoTerminal(
  pinMap: Record<string, Record<string, string>>,
  comp: CircuitComponent
): boolean {
  return pinEntries(pinMap, comp).length === 2;
}

function isLightingLoad(c: CircuitComponent): boolean {
  return (
    c.componentType === "lamp" ||
    c.componentType === "pilot_light" ||
    c.componentType === "motor" ||
    c.componentType === "fan" ||
    c.componentType === "buzzer" ||
    c.componentType === "speaker"
  );
}

type TraceStep = {
  comp: CircuitComponent;
  inNet: string;
  outNet: string;
};

function traceTwoTerminalChain(
  pinMap: Record<string, Record<string, string>>,
  candidates: CircuitComponent[],
  startNet: string,
  endNet: string
): { steps: TraceStep[]; used: Set<string> } | null {
  const remaining = new Set(candidates.map((c) => c.id));
  const steps: TraceStep[] = [];
  const seenNets = new Set<string>([startNet]);
  let current = startNet;

  for (let guard = 0; guard <= candidates.length; guard++) {
    if (current === endNet) return { steps, used: new Set(steps.map((s) => s.comp.id)) };

    const hits = candidates.filter((c) => {
      if (!remaining.has(c.id) || !isTwoTerminal(pinMap, c)) return false;
      return pinEntries(pinMap, c).some(([, net]) => net === current);
    });
    if (hits.length !== 1) return null;

    const comp = hits[0];
    const nets = pinEntries(pinMap, comp).map(([, net]) => net);
    const next = nets[0] === current ? nets[1] : nets[0];
    if (!next || (seenNets.has(next) && next !== endNet)) return null;

    steps.push({ comp, inNet: current, outNet: next });
    remaining.delete(comp.id);
    seenNets.add(next);
    current = next;
  }

  return null;
}

function finalizeAutoLayout(items: LaidOutComponent[], routes: RoutedWire[]): AutoLayoutResult {
  const bbox = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  for (const it of items) {
    for (const a of Object.values(it.anchors)) extendBBox(bbox, a);
    const label = [it.component.label, it.component.value]
      .filter(Boolean)
      .join(" ");
    if (label) {
      const labelWidth = estimateTextWidth(label, 11, { fontWeight: 600 });
      const symbol = effectiveSymbolDef(it.component.componentType, it.component.attrs);
      const angle = (it.rotation * Math.PI) / 180;
      const midpointX = it.x + (it.length * Math.cos(angle)) / 2;
      const midpointY = it.y + (it.length * Math.sin(angle)) / 2;
      const vertical = Math.abs(Math.sin(angle)) > 0.5;
      const labelX =
        midpointX +
        (vertical ? 34 : 0) +
        (symbol.labelOffset?.dx ?? 0);
      const labelY =
        midpointY -
        (vertical ? 2 : 18) +
        (symbol.labelOffset?.dy ?? 0);
      extendBBox(bbox, { x: labelX - labelWidth / 2, y: labelY - 13 });
      extendBBox(bbox, { x: labelX + labelWidth / 2, y: labelY + 14 });
    }
  }
  for (const r of routes) {
    for (const p of r.points) extendBBox(bbox, p);
  }
  if (!isFinite(bbox.minX)) {
    bbox.minX = 0;
    bbox.minY = 0;
    bbox.maxX = 200;
    bbox.maxY = 200;
  }
  const pad = 52;
  const minX = bbox.minX - pad;
  const minY = bbox.minY - pad;
  const maxX = bbox.maxX + pad;
  const maxY = bbox.maxY + pad;
  return {
    width: maxX - minX,
    height: maxY - minY,
    offsetX: -minX,
    offsetY: -minY,
    items,
    routes,
  };
}

function pinsForComponent(
  pinMap: Record<string, Record<string, string>>,
  component: CircuitComponent
): Array<[string, string]> {
  return Object.entries(pinMap[component.id] ?? {});
}

function shortestComponentPath(
  ast: CircuitAST,
  startNet: string,
  targetNet: string,
  excluded: Set<string>
): CircuitComponent[] | null {
  const pinMap = ast.pinMap ?? {};
  const byNet = new Map<string, CircuitComponent[]>();
  for (const component of ast.components) {
    if (excluded.has(component.id) || isGround(component)) continue;
    for (const [, net] of pinsForComponent(pinMap, component)) {
      const entries = byNet.get(net) ?? [];
      entries.push(component);
      byNet.set(net, entries);
    }
  }

  const queue: Array<{ net: string; path: CircuitComponent[] }> = [
    { net: startNet, path: [] },
  ];
  const visited = new Set<string>([startNet]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.net === targetNet) return current.path;
    for (const component of byNet.get(current.net) ?? []) {
      for (const [, nextNet] of pinsForComponent(pinMap, component)) {
        if (nextNet === current.net || nextNet === "GND" || visited.has(nextNet)) {
          continue;
        }
        visited.add(nextNet);
        queue.push({ net: nextNet, path: [...current.path, component] });
      }
    }
  }
  return null;
}

/**
 * Recognize a selector output as independent series branches ending at GND.
 *
 * A load-bank branch may contain one component (for example a lamp) or a
 * simple series chain (for example LED + resistor). Internal nets must connect
 * exactly the previous and next component; branching or reconvergence means
 * this specialized layout is not a truthful representation of the topology.
 *
 * Every component is visited at most once, so this stays linear instead of
 * enumerating the exponentially many simple paths in a dense graph.
 */
function seriesBranchesToGround(
  ast: CircuitAST,
  rootNet: string,
  excluded: Set<string>
): CircuitComponent[][] | null {
  const pinMap = ast.pinMap ?? {};
  const byNet = new Map<string, CircuitComponent[]>();
  for (const component of ast.components) {
    if (excluded.has(component.id) || isGround(component)) continue;
    for (const [, net] of pinsForComponent(pinMap, component)) {
      const entries = byNet.get(net) ?? [];
      entries.push(component);
      byNet.set(net, entries);
    }
  }

  const starters = [...new Map(
    (byNet.get(rootNet) ?? []).map((component) => [component.id, component])
  ).values()];
  const used = new Set<string>();
  const branches: CircuitComponent[][] = [];

  for (const starter of starters) {
    if (used.has(starter.id)) return null;
    const branch: CircuitComponent[] = [];
    const seenNets = new Set<string>([rootNet]);
    let currentNet = rootNet;
    let current = starter;

    while (true) {
      if (used.has(current.id)) return null;
      used.add(current.id);
      branch.push(current);

      const nextNets = [...new Set(
        pinsForComponent(pinMap, current)
          .map(([, net]) => net)
          .filter((net) => net !== currentNet)
      )];
      if (nextNets.length !== 1) return null;
      const nextNet = nextNets[0]!;
      if (nextNet === "GND") {
        branches.push(branch);
        break;
      }
      if (seenNets.has(nextNet)) return null;
      seenNets.add(nextNet);

      const nextComponents = [...new Map(
        (byNet.get(nextNet) ?? [])
          .filter((component) => component.id !== current.id)
          .map((component) => [component.id, component])
      ).values()];
      if (nextComponents.length !== 1) return null;
      currentNet = nextNet;
      current = nextComponents[0]!;
    }
  }
  return branches;
}

function routePlacedNetlist(
  ast: CircuitAST,
  items: LaidOutComponent[]
): RoutedWire[] {
  const pinMap = ast.pinMap ?? {};
  const placed = new Map(items.map((item) => [item.component.id, item] as const));
  const netPins = new Map<string, Array<{ compId: string; pt: PinAnchor }>>();
  for (const component of ast.components) {
    const item = placed.get(component.id);
    if (!item) continue;
    for (const [pinName, netId] of pinsForComponent(pinMap, component)) {
      const point = item.anchors[pinName];
      if (!point) continue;
      const pins = netPins.get(netId) ?? [];
      pins.push({ compId: component.id, pt: point });
      netPins.set(netId, pins);
    }
  }

  const routes: RoutedWire[] = [];
  for (const [netId, pins] of netPins) {
    if (pins.length < 2) continue;
    if (netId === "GND") {
      const railY = Math.max(...pins.map((pin) => pin.pt.y));
      const minX = Math.min(...pins.map((pin) => pin.pt.x));
      const maxX = Math.max(...pins.map((pin) => pin.pt.x));
      routes.push({
        netId,
        points: [{ x: minX, y: railY }, { x: maxX, y: railY }],
      });
      for (const pin of pins) {
        if (Math.abs(pin.pt.y - railY) < 0.5) continue;
        routes.push({
          netId: `${netId}.${pin.compId}`,
          points: [pin.pt, { x: pin.pt.x, y: railY }],
        });
      }
      continue;
    }

    if (pins.length === 2) {
      const [first, second] = pins;
      routes.push({
        netId,
        points:
          Math.abs(first.pt.x - second.pt.x) < 0.5 ||
          Math.abs(first.pt.y - second.pt.y) < 0.5
            ? [first.pt, second.pt]
            : [
                first.pt,
                { x: second.pt.x, y: first.pt.y },
                second.pt,
              ],
      });
      continue;
    }

    const ys = pins.map((pin) => pin.pt.y).sort((a, b) => a - b);
    const spineY = ys[Math.floor(ys.length / 2)]!;
    const minX = Math.min(...pins.map((pin) => pin.pt.x));
    const maxX = Math.max(...pins.map((pin) => pin.pt.x));
    const spine: RoutedWire = {
      netId,
      points: [{ x: minX, y: spineY }, { x: maxX, y: spineY }],
      junctions: [],
    };
    routes.push(spine);
    for (const pin of pins) {
      if (Math.abs(pin.pt.y - spineY) >= 0.5) {
        routes.push({
          netId: `${netId}.${pin.compId}`,
          points: [pin.pt, { x: pin.pt.x, y: spineY }],
        });
      }
      if (pin.pt.x > minX && pin.pt.x < maxX) {
        spine.junctions!.push({ x: pin.pt.x, y: spineY });
      }
    }
    if (spine.junctions?.length === 0) delete spine.junctions;
  }
  return routes;
}

/**
 * Plan a source → series spine → multi-output selector → parallel load bank.
 *
 * This is topology-driven: no label/language checks and no case coordinates.
 * Repeated branches receive independent lanes; their return pins share one
 * continuous ground rail.
 */
function tryLayoutParallelLoadBank(ast: CircuitAST): AutoLayoutResult | null {
  const pinMap = ast.pinMap ?? {};
  const sources = ast.components.filter(isPowerSource);
  if (sources.length !== 1) return null;
  const source = sources[0]!;
  const sourcePins = pinMap[source.id] ?? {};
  const liveNet =
    sourcePins.plus ??
    sourcePins.end ??
    Object.values(sourcePins).find((net) => net !== "GND");
  if (!liveNet || liveNet === "GND") return null;

  const selectors = ast.components.filter(
    (component) =>
      component.componentType === "switch_spdt" ||
      component.componentType === "switch_spdt_center_off"
  );
  for (const selector of selectors) {
    const pins = pinMap[selector.id] ?? {};
    const commonNet = pins.common;
    const outputNets =
      componentSelectorOutputs(selector, pins);
    if (!commonNet || outputNets.length !== 2) continue;

    const spinePath = shortestComponentPath(
      ast,
      liveNet,
      commonNet,
      new Set([source.id, selector.id])
    );
    if (!spinePath) continue;
    const excluded = new Set([
      source.id,
      selector.id,
      ...spinePath.map((component) => component.id),
    ]);
    const completeBranchGroups: CircuitComponent[][][] = [];
    for (const net of outputNets) {
      const branches = seriesBranchesToGround(ast, net, excluded);
      if (!branches || branches.length < 2) break;
      completeBranchGroups.push(branches);
    }
    if (completeBranchGroups.length !== outputNets.length) continue;
    const expectedBranchIds = ast.components
      .filter((component) => !isGround(component) && !excluded.has(component.id))
      .map((component) => component.id);
    const branchIds = completeBranchGroups
      .flat()
      .flat()
      .map((component) => component.id);
    const uniqueBranchIds = new Set(branchIds);
    if (
      uniqueBranchIds.size !== branchIds.length ||
      expectedBranchIds.length !== uniqueBranchIds.size ||
      expectedBranchIds.some((id) => !uniqueBranchIds.has(id))
    ) {
      continue;
    }

    const items: LaidOutComponent[] = [];
    const put = (
      component: CircuitComponent,
      x: number,
      y: number,
      direction: "right" | "left" | "up" | "down"
    ): LaidOutComponent => {
      const item = placeComponent(component, x, y, direction);
      items.push(item);
      return item;
    };

    const mainY = 82;
    const sourceItem = put(source, 58, mainY + 58, "up");
    let cursorX = 138;
    let previousLabelRight = sourceItem.x + 64;
    const putSpineComponent = (
      component: CircuitComponent
    ): LaidOutComponent => {
      const symbolLength = effectiveSymbolDef(component.componentType, component.attrs).length;
      const labelWidth = estimateTextWidth(component.label ?? component.id, 11, {
        fontWeight: 600,
      });
      // Reserve the painted label, not only the symbol body. This keeps long
      // multilingual labels on adjacent series components from colliding.
      cursorX = Math.max(
        cursorX,
        previousLabelRight + 18 - symbolLength / 2 + labelWidth / 2
      );
      const item = put(component, cursorX, mainY, "right");
      previousLabelRight =
        item.x + item.length / 2 + labelWidth / 2;
      cursorX = item.x + item.length + 28;
      return item;
    };
    for (const component of spinePath) {
      putSpineComponent(component);
    }
    const selectorItem = putSpineComponent(selector);

    const branches = completeBranchGroups.flat();
    const widestBranchLabel = Math.max(
      0,
      ...branches
        .flat()
        .map((component) =>
          estimateTextWidth(component.label ?? component.id, 11, {
            fontWeight: 600,
          })
        )
    );
    const laneGap = Math.max(142, Math.min(210, widestBranchLabel + 48));
    const selectorOutputX = Math.max(
      selectorItem.anchors.left?.x ?? -Infinity,
      selectorItem.anchors.right?.x ?? -Infinity,
      selectorItem.anchors.nc?.x ?? -Infinity,
      selectorItem.anchors.no?.x ?? -Infinity
    );
    const branchStartY = 214;
    const firstLaneX =
      selectorOutputX - ((branches.length - 1) * laneGap) / 2;
    let maxBranchY = branchStartY;
    let laneIndex = 0;
    for (const group of completeBranchGroups) {
      for (const branch of group) {
        const laneX = firstLaneX + laneIndex * laneGap;
        let y = branchStartY;
        for (const component of branch) {
          const item = put(component, laneX, y, "down");
          y += item.length + 58;
          maxBranchY = Math.max(maxBranchY, y);
        }
        laneIndex++;
      }
    }

    const grounds = ast.components.filter(isGround);
    grounds.forEach((ground, index) =>
      put(
        ground,
        selectorOutputX + (index - (grounds.length - 1) / 2) * 72,
        maxBranchY + 20,
        "down"
      )
    );

    const outputNetSet = new Set(outputNets);
    const routes = routePlacedNetlist(ast, items).filter((route) => {
      for (const outputNet of outputNetSet) {
        if (
          route.netId === outputNet ||
          route.netId.startsWith(`${outputNet}.`)
        ) {
          return false;
        }
      }
      return true;
    });

    // A selector owns two electrically distinct output rails. The generic
    // median-spine router can place both on the same y and make a short visual
    // overlap near the selector. Give each group its own bounded rail and feed
    // trunk instead.
    completeBranchGroups.forEach((group, groupIndex) => {
      const outputNet = outputNets[groupIndex]!;
      const selectorAnchor = anchorForNet(
        pinMap,
        selectorItem,
        outputNet
      );
      const loadAnchors = group
        .map((branch) => {
          const first = branch[0];
          const item = first
            ? items.find((candidate) => candidate.component.id === first.id)
            : undefined;
          return item
            ? anchorForNet(pinMap, item, outputNet)
            : undefined;
        })
        .filter((anchor): anchor is { x: number; y: number } => !!anchor);
      if (!selectorAnchor || loadAnchors.length === 0) return;

      const railY =
        loadAnchors.reduce((sum, anchor) => sum + anchor.y, 0) /
        loadAnchors.length;
      const minLoadX = Math.min(...loadAnchors.map((anchor) => anchor.x));
      const maxLoadX = Math.max(...loadAnchors.map((anchor) => anchor.x));
      const feedX =
        groupIndex === 0
          ? maxLoadX + Math.min(46, laneGap / 3)
          : minLoadX - Math.min(46, laneGap / 3);
      const groupBoundaryX = groupIndex === 0 ? maxLoadX : minLoadX;
      const rail: RoutedWire = {
        netId: outputNet,
        points: [
          { x: minLoadX, y: railY },
          { x: maxLoadX, y: railY },
        ],
        junctions: loadAnchors.map((anchor) => ({
          x: anchor.x,
          y: railY,
        })),
      };
      routes.push(rail);
      routes.push({
        netId: `${outputNet}.${selector.id}`,
        points: compactPoints([
          selectorAnchor,
          { x: feedX, y: selectorAnchor.y },
          { x: feedX, y: railY },
          { x: groupBoundaryX, y: railY },
        ]),
      });
      for (const anchor of loadAnchors) {
        if (Math.abs(anchor.y - railY) < 0.5) continue;
        routes.push({
          netId: `${outputNet}.branch`,
          points: [anchor, { x: anchor.x, y: railY }],
        });
      }
    });

    return finalizeAutoLayout(items, routes);
  }
  return null;
}

function componentSelectorOutputs(
  component: CircuitComponent,
  pins: Record<string, string>
): string[] {
  if (component.componentType === "switch_spdt_center_off") {
    return [pins.left, pins.right].filter(
      (net): net is string => typeof net === "string"
    );
  }
  return [pins.nc, pins.no].filter(
    (net): net is string => typeof net === "string"
  );
}

function appendReturnRail(
  routes: RoutedWire[],
  pinMap: Record<string, Record<string, string>>,
  sourceLaid: LaidOutComponent,
  loadLaid: LaidOutComponent,
  returnNet: string
): boolean {
  const sourceReturn = anchorForNet(pinMap, sourceLaid, returnNet);
  const loadReturn = anchorForNet(pinMap, loadLaid, returnNet);
  if (!sourceReturn || !loadReturn) return false;
  routes.push({
    netId: returnNet,
    points: [
      { x: sourceReturn.x, y: AC_RETURN_Y },
      { x: loadReturn.x, y: AC_RETURN_Y },
    ],
  });
  routes.push({
    netId: `${returnNet}.${sourceLaid.component.id}`,
    points: compactPoints([sourceReturn, { x: sourceReturn.x, y: AC_RETURN_Y }]),
  });
  routes.push({
    netId: `${returnNet}.${loadLaid.component.id}`,
    points: compactPoints([loadReturn, { x: loadReturn.x, y: AC_RETURN_Y }]),
  });
  return true;
}

function sourceLiveReturnNets(
  pinMap: Record<string, Record<string, string>>,
  source: CircuitComponent
): { liveNet: string; returnNet: string } | null {
  const pins = pinMap[source.id];
  if (!pins) return null;
  const liveNet = pins.plus ?? pins.end ?? Object.values(pins)[0];
  const returnNet = pins.minus ?? pins.start ?? Object.values(pins)[1];
  if (!liveNet || !returnNet || liveNet === returnNet) return null;
  return { liveNet, returnNet };
}

function layoutTwoWireSeriesLoop(
  ast: CircuitAST,
  source: CircuitComponent,
  chain: TraceStep[],
  load: CircuitComponent,
  liveNet: string,
  returnNet: string,
  loadLiveNet: string
): AutoLayoutResult | null {
  const pinMap = ast.pinMap ?? {};
  const items: LaidOutComponent[] = [];
  const routes: RoutedWire[] = [];

  const put = (
    comp: CircuitComponent,
    x: number,
    y: number,
    fallbackDir?: "right" | "left" | "up" | "down"
  ): LaidOutComponent => {
    const laid = placeComponent(comp, x, y, fallbackDir);
    items.push(laid);
    return laid;
  };

  const sourceLaid = put(source, AC_LEFT_MARGIN, AC_LIVE_Y + 62, "up");
  let cursorX = AC_LEFT_MARGIN + 86;
  let prevPt = anchorForNet(pinMap, sourceLaid, liveNet);
  if (!prevPt) return null;

  for (const step of chain) {
    const laid = put(step.comp, cursorX, AC_LIVE_Y, "right");
    const inPt = anchorForNet(pinMap, laid, step.inNet);
    const outPt = anchorForNet(pinMap, laid, step.outNet);
    if (!inPt || !outPt) return null;
    routes.push(routeViaY(step.inNet, prevPt, inPt, AC_LIVE_Y));
    prevPt = outPt;
    cursorX += laid.length + AC_SERIES_GAP;
  }

  const loadLaid = put(load, cursorX, AC_LIVE_Y, "right");
  const loadLive = anchorForNet(pinMap, loadLaid, loadLiveNet);
  if (!loadLive) return null;
  routes.push(routeViaY(loadLiveNet, prevPt, loadLive, AC_LIVE_Y));
  if (!appendReturnRail(routes, pinMap, sourceLaid, loadLaid, returnNet)) return null;

  return finalizeAutoLayout(items, routes);
}

function layoutTwoWayLightingLoop(
  ast: CircuitAST,
  source: CircuitComponent,
  preChain: TraceStep[],
  leftSwitch: CircuitComponent,
  rightSwitch: CircuitComponent,
  postChain: TraceStep[],
  load: CircuitComponent,
  liveNet: string,
  returnNet: string,
  loadLiveNet: string
): AutoLayoutResult | null {
  const pinMap = ast.pinMap ?? {};
  const leftPins = pinMap[leftSwitch.id] ?? {};
  const rightPins = pinMap[rightSwitch.id] ?? {};
  const travelerNets = [leftPins.nc, leftPins.no].filter(Boolean);
  if (
    travelerNets.length !== 2 ||
    !travelerNets.every((n) => n === rightPins.nc || n === rightPins.no)
  ) {
    return null;
  }

  const items: LaidOutComponent[] = [];
  const routes: RoutedWire[] = [];
  const put = (
    comp: CircuitComponent,
    x: number,
    y: number,
    fallbackDir?: "right" | "left" | "up" | "down"
  ): LaidOutComponent => {
    const laid = placeComponent(comp, x, y, fallbackDir);
    items.push(laid);
    return laid;
  };

  const sourceLaid = put(source, AC_LEFT_MARGIN, AC_LIVE_Y + 62, "up");
  let cursorX = AC_LEFT_MARGIN + 86;
  let prevPt = anchorForNet(pinMap, sourceLaid, liveNet);
  if (!prevPt) return null;

  for (const step of preChain) {
    const laid = put(step.comp, cursorX, AC_LIVE_Y, "right");
    const inPt = anchorForNet(pinMap, laid, step.inNet);
    const outPt = anchorForNet(pinMap, laid, step.outNet);
    if (!inPt || !outPt) return null;
    routes.push(routeViaY(step.inNet, prevPt, inPt, AC_LIVE_Y));
    prevPt = outPt;
    cursorX += laid.length + AC_SERIES_GAP;
  }

  const leftLaid = put(leftSwitch, cursorX, AC_LIVE_Y, "right");
  const leftCommon = leftLaid.anchors.common;
  if (!leftCommon) return null;
  routes.push(routeViaY(leftPins.common ?? liveNet, prevPt, leftCommon, AC_LIVE_Y));

  const rightCommonX = leftLaid.x + leftLaid.length + AC_TRAVELER_SPAN + leftLaid.length;
  const sameTravelerOrder = leftPins.nc === rightPins.nc && leftPins.no === rightPins.no;
  const rightLength = effectiveSymbolDef(
    rightSwitch.componentType,
    rightSwitch.attrs
  ).length;
  const rightLaid = sameTravelerOrder
    ? placeMirroredComponent(rightSwitch, rightCommonX - rightLength, AC_LIVE_Y)
    : placeComponent(rightSwitch, rightCommonX, AC_LIVE_Y, "left");
  items.push(rightLaid);
  for (const net of travelerNets) {
    const a = anchorForNet(pinMap, leftLaid, net);
    const b = anchorForNet(pinMap, rightLaid, net);
    if (!a || !b) return null;
    routes.push(routeViaX(net, a, b, (a.x + b.x) / 2));
  }

  prevPt = rightLaid.anchors.common;
  if (!prevPt) return null;
  cursorX = rightCommonX + AC_SERIES_GAP;
  for (const step of postChain) {
    const laid = put(step.comp, cursorX, AC_LIVE_Y, "right");
    const inPt = anchorForNet(pinMap, laid, step.inNet);
    const outPt = anchorForNet(pinMap, laid, step.outNet);
    if (!inPt || !outPt) return null;
    routes.push(routeViaY(step.inNet, prevPt, inPt, AC_LIVE_Y));
    prevPt = outPt;
    cursorX += laid.length + AC_SERIES_GAP;
  }

  const loadLaid = put(load, cursorX, AC_LIVE_Y, "right");
  const loadLive = anchorForNet(pinMap, loadLaid, loadLiveNet);
  if (!loadLive) return null;
  routes.push(routeViaY(loadLiveNet, prevPt, loadLive, AC_LIVE_Y));
  if (!appendReturnRail(routes, pinMap, sourceLaid, loadLaid, returnNet)) return null;

  return finalizeAutoLayout(items, routes);
}

function tryLayoutTwoWireLighting(ast: CircuitAST): AutoLayoutResult | null {
  const pinMap = ast.pinMap ?? {};
  const sources = ast.components.filter(isPowerSource);
  if (sources.length !== 1) return null;
  const source = sources[0];
  const nets = sourceLiveReturnNets(pinMap, source);
  if (!nets || nets.liveNet === "GND" || nets.returnNet === "GND") return null;
  const { liveNet, returnNet } = nets;

  const loads = ast.components.filter((c) => {
    if (!isLightingLoad(c)) return false;
    const pins = pinEntries(pinMap, c);
    return pins.length === 2 && pins.some(([, net]) => net === returnNet);
  });
  if (loads.length !== 1) return null;

  const load = loads[0];
  const loadLiveNet = pinEntries(pinMap, load).find(([, net]) => net !== returnNet)?.[1];
  if (!loadLiveNet) return null;

  const excluded = new Set([source.id, load.id]);
  const middle = ast.components.filter((c) => !excluded.has(c.id) && !isAutoGround(c));
  const spdts = middle.filter((c) => c.componentType === "switch_spdt");

  if (spdts.length === 0) {
    if (!middle.every((c) => isTwoTerminal(pinMap, c))) return null;
    const traced = traceTwoTerminalChain(pinMap, middle, liveNet, loadLiveNet);
    if (!traced || traced.used.size !== middle.length) return null;
    return layoutTwoWireSeriesLoop(ast, source, traced.steps, load, liveNet, returnNet, loadLiveNet);
  }

  if (spdts.length === 2) {
    const twoTerminal = middle.filter((c) => c.componentType !== "switch_spdt");
    if (!twoTerminal.every((c) => isTwoTerminal(pinMap, c))) return null;
    for (const [leftSwitch, rightSwitch] of [
      [spdts[0], spdts[1]],
      [spdts[1], spdts[0]],
    ] as const) {
      const leftCommon = pinMap[leftSwitch.id]?.common;
      const rightCommon = pinMap[rightSwitch.id]?.common;
      if (!leftCommon || !rightCommon) continue;
      const pre = traceTwoTerminalChain(pinMap, twoTerminal, liveNet, leftCommon);
      if (!pre) continue;
      const postCandidates = twoTerminal.filter((c) => !pre.used.has(c.id));
      const post = traceTwoTerminalChain(pinMap, postCandidates, rightCommon, loadLiveNet);
      if (!post) continue;
      if (pre.used.size + post.used.size !== twoTerminal.length) continue;
      const rendered = layoutTwoWayLightingLoop(
        ast,
        source,
        pre.steps,
        leftSwitch,
        rightSwitch,
        post.steps,
        load,
        liveNet,
        returnNet,
        loadLiveNet
      );
      if (rendered) return rendered;
    }
  }

  return null;
}

export function layoutCircuitNetlist(ast: CircuitAST): AutoLayoutResult {
  const pinMap = ast.pinMap ?? {};
  const parallelLoadBank = tryLayoutParallelLoadBank(ast);
  if (parallelLoadBank) return parallelLoadBank;
  const twoWireLighting = tryLayoutTwoWireLighting(ast);
  if (twoWireLighting) return twoWireLighting;

  // ── Step 1: classify ───────────────────────────────────────
  // Three bands, top→bottom: the SPINE row (sources on the left feeding a
  // horizontal chain of series/multi-pin components), a SHUNT band (two-pin
  // components with exactly one pin on ground drop vertically under the node
  // they tap, the textbook "shunt leg"), and the GROUND symbols underneath.
  // This reconstructs the conventional schematic idiom from the netlist instead
  // of dumping everything into one wide row.
  const isShunt = (c: CircuitComponent): boolean => {
    if (isPowerSource(c) || isGround(c)) return false;
    const pins = pinMap[c.id];
    if (!pins) return false;
    const nets = Object.values(pins);
    return nets.length === 2 && nets.filter((n) => n === "GND").length === 1;
  };

  const powerComps: CircuitComponent[] = [];
  const groundComps: CircuitComponent[] = [];
  const shuntComps: CircuitComponent[] = [];
  const middleComps: CircuitComponent[] = [];
  for (const c of ast.components) {
    if (isPowerSource(c)) powerComps.push(c);
    else if (isGround(c)) groundComps.push(c);
    else if (isShunt(c)) shuntComps.push(c);
    else middleComps.push(c);
  }
  const spine = [...powerComps, ...middleComps];

  // ── Step 4: place components ───────────────────────────────
  const placed = new Map<string, LaidOutComponent>();
  const items: LaidOutComponent[] = [];

  const place = (
    comp: CircuitComponent,
    x: number,
    y: number,
    fallbackDir?: "right" | "left" | "up" | "down"
  ): LaidOutComponent => {
    const laid = placeComponent(comp, x, y, fallbackDir);
    items.push(laid);
    placed.set(comp.id, laid);
    return laid;
  };

  if (spine.length === 0 && shuntComps.length === 0) {
    // Degenerate (e.g. only grounds): keep a single row.
    ast.components.forEach((comp, i) =>
      place(comp, LEFT_MARGIN + i * COL_W, TOP_MARGIN)
    );
  } else {
    // Spine row.
    const spineY = TOP_MARGIN;
    spine.forEach((comp, i) => place(comp, LEFT_MARGIN + i * COL_W, spineY));

    // Map each signal net to the x of a spine pin on it, so shunts can drop
    // directly beneath the node they tap.
    const spinePinX = new Map<string, number>();
    for (const comp of spine) {
      const pins = pinMap[comp.id];
      const laid = placed.get(comp.id);
      if (!pins || !laid) continue;
      for (const [pinName, net] of Object.entries(pins)) {
        if (net === "GND") continue;
        const a = laid.anchors[pinName];
        if (a && !spinePinX.has(net)) spinePinX.set(net, a.x);
      }
    }

    // Shunt band: each shunt vertical, beneath its tapped node.
    const shuntY = spineY + ROW_H;
    const sharedNode = new Map<number, number>();
    shuntComps.forEach((comp, idx) => {
      const pins = pinMap[comp.id]!;
      const sigNet = Object.values(pins).find((n) => n !== "GND");
      let x =
        (sigNet !== undefined ? spinePinX.get(sigNet) : undefined) ??
        LEFT_MARGIN + (spine.length + idx) * COL_W;
      const used = sharedNode.get(x) ?? 0;
      sharedNode.set(x, used + 1);
      x += used * SHUNT_OFFSET;
      place(comp, x, shuntY, "down");
    });

    // Ground symbols centered beneath everything.
    const baseY = shuntComps.length ? shuntY : spineY;
    const groundY = baseY + ROW_H;
    const xs = items.map((it) => it.x);
    const gx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : LEFT_MARGIN;
    groundComps.forEach((comp, i) => place(comp, gx + i * COL_W, groundY, "down"));
  }

  // ── Step 5: build net → world pin coords ───────────────────
  type NetPin = { compId: string; pinName: string; pt: PinAnchor };
  const netPins = new Map<string, NetPin[]>();

  for (const comp of ast.components) {
    const pins = pinMap[comp.id];
    if (!pins) continue;
    const laid = placed.get(comp.id);
    if (!laid) continue;
    for (const [pinName, netId] of Object.entries(pins)) {
      const pt = laid.anchors[pinName];
      if (!pt) continue;
      if (!netPins.has(netId)) netPins.set(netId, []);
      netPins.get(netId)!.push({ compId: comp.id, pinName, pt });
    }
  }

  // ── Step 6: route each net orthogonally ───────────────────
  const routes: RoutedWire[] = [];
  const bbox = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  for (const it of items) {
    for (const a of Object.values(it.anchors)) extendBBox(bbox, a);
  }
  // default if no components
  if (!isFinite(bbox.minX)) {
    bbox.minX = 0;
    bbox.minY = 0;
    bbox.maxX = 200;
    bbox.maxY = 200;
  }

  for (const [netId, pins] of netPins) {
    if (pins.length < 2) continue; // dangling pin, nothing to route

    if (netId === "GND") {
      // Ground rail: horizontal line near bottom. All pins connect via V-line.
      const railY = bbox.maxY + 30;
      const minX = Math.min(...pins.map((p) => p.pt.x));
      const maxX = Math.max(...pins.map((p) => p.pt.x));
      // the rail itself
      if (pins.length > 1) {
        routes.push({
          netId,
          points: [
            { x: minX, y: railY },
            { x: maxX, y: railY },
          ],
        });
      }
      // each pin drops to rail
      for (const p of pins) {
        routes.push({
          netId: `${netId}.${p.compId}`,
          points: [
            p.pt,
            { x: p.pt.x, y: railY },
          ],
        });
      }
      bbox.maxY = Math.max(bbox.maxY, railY);
      continue;
    }

    // Power-like nets: only route as a top rail when at least one pin belongs
    // to a power source (V/I/B/AC). Otherwise the net is a regular signal net
    // between middle-rank components and should use HVH routing below.
    const touchesPowerSource = pins.some((p) => {
      const comp = ast.components.find((c) => c.id === p.compId);
      return !!comp && isPowerSource(comp);
    });
    if (touchesPowerSource && pins.length > 1) {
      const railY = bbox.minY - 30;
      const minX = Math.min(...pins.map((p) => p.pt.x));
      const maxX = Math.max(...pins.map((p) => p.pt.x));
      routes.push({
        netId,
        points: [
          { x: minX, y: railY },
          { x: maxX, y: railY },
        ],
      });
      for (const p of pins) {
        routes.push({
          netId: `${netId}.${p.compId}`,
          points: [p.pt, { x: p.pt.x, y: railY }],
        });
      }
      bbox.minY = Math.min(bbox.minY, railY);
      continue;
    }

    if (pins.length === 2) {
      // Single-L route: exit source vertically, then horizontally to target.
      // This avoids the midpoint of HVH landing on an intermediate component's
      // pin x-coordinate (visible as a false T-junction).
      const [a, b] = pins;
      const points: PinAnchor[] =
        Math.abs(a.pt.y - b.pt.y) < 0.5
          ? [a.pt, b.pt] // already horizontal
          : Math.abs(a.pt.x - b.pt.x) < 0.5
            ? [a.pt, b.pt] // already vertical
            : [a.pt, { x: a.pt.x, y: b.pt.y }, b.pt];
      routes.push({ netId, points });
    } else {
      // 3+ pin net — spine at median Y
      const ys = pins.map((p) => p.pt.y).sort((x, y) => x - y);
      const spineY = ys[Math.floor(ys.length / 2)];
      const xs = pins.map((p) => p.pt.x).sort((x, y) => x - y);
      const spineLeft = xs[0];
      const spineRight = xs[xs.length - 1];
      // spine
      routes.push({
        netId,
        points: [
          { x: spineLeft, y: spineY },
          { x: spineRight, y: spineY },
        ],
      });
      const junctions: PinAnchor[] = [];
      for (const p of pins) {
        if (Math.abs(p.pt.y - spineY) < 0.5) {
          // already on spine
          if (p.pt.x > spineLeft && p.pt.x < spineRight) {
            junctions.push(p.pt);
          }
          continue;
        }
        routes.push({
          netId: `${netId}.${p.compId}`,
          points: [p.pt, { x: p.pt.x, y: spineY }],
        });
        if (p.pt.x > spineLeft && p.pt.x < spineRight) {
          junctions.push({ x: p.pt.x, y: spineY });
        }
      }
      if (junctions.length > 0) {
        // Attach junctions to the last spine route (share same netId entry).
        routes[routes.length - 1 - pins.filter((p) =>
          Math.abs(p.pt.y - spineY) >= 0.5
        ).length].junctions = junctions;
      }
    }
  }

  // ── Compute final bbox including routes ───────────────────
  for (const r of routes) {
    for (const p of r.points) extendBBox(bbox, p);
  }
  const pad = 40;
  const minX = bbox.minX - pad;
  const minY = bbox.minY - pad;
  const maxX = bbox.maxX + pad;
  const maxY = bbox.maxY + pad;

  return {
    width: maxX - minX,
    height: maxY - minY,
    offsetX: -minX,
    offsetY: -minY,
    items,
    routes,
  };
}

/**
 * Rebuild netlist routes after interactive pins move component anchors.
 *
 * The initial auto-layout owns component placement, but once a user pins a
 * component the old route geometry is no longer authoritative. Reusing it and
 * nudging only its endpoint produced diagonal segments. This pass keeps the
 * existing rail/spine lanes where possible and derives a fresh rectilinear
 * route from the moved anchors.
 */
export function rerouteCircuitNetlist(
  ast: CircuitAST,
  items: LaidOutComponent[],
  previousRoutes: RoutedWire[]
): RoutedWire[] {
  type NetPin = { compId: string; pt: PinAnchor };
  const placed = new Map(items.map((item) => [item.component.id, item]));
  const componentById = new Map(ast.components.map((component) => [component.id, component]));
  const netPins = new Map<string, NetPin[]>();

  for (const [componentId, pins] of Object.entries(ast.pinMap ?? {})) {
    const item = placed.get(componentId);
    if (!item) continue;
    for (const [pinName, netId] of Object.entries(pins)) {
      const pt = item.anchors[pinName];
      if (!pt) continue;
      const entries = netPins.get(netId) ?? [];
      entries.push({ compId: componentId, pt });
      netPins.set(netId, entries);
    }
  }

  const priorHorizontal = (netId: string): RoutedWire | undefined =>
    previousRoutes.find((route) => route.netId === netId
      && route.points.length >= 2
      && route.points.every((point) => Math.abs(point.y - route.points[0]!.y) < 0.1));
  const priorPrimary = (netId: string): RoutedWire | undefined =>
    previousRoutes.find((route) => route.netId === netId && route.points.length >= 2);
  const result: RoutedWire[] = [];

  for (const [netId, pins] of netPins) {
    if (pins.length < 2) continue;
    const points = pins.map((pin) => pin.pt);
    const touchesPowerSource = pins.some((pin) => {
      const component = componentById.get(pin.compId);
      return component ? isPowerSource(component) : false;
    });

    if (netId === "GND" || touchesPowerSource) {
      const oldRail = priorHorizontal(netId);
      const fallbackY = netId === "GND"
        ? Math.max(...points.map((point) => point.y)) + 30
        : Math.min(...points.map((point) => point.y)) - 30;
      const railY = oldRail?.points[0]?.y ?? fallbackY;
      const minX = Math.min(...points.map((point) => point.x));
      const maxX = Math.max(...points.map((point) => point.x));
      if (maxX - minX >= 0.1) {
        result.push({ netId, points: [{ x: minX, y: railY }, { x: maxX, y: railY }] });
      }
      for (const pin of pins) {
        result.push({
          netId: `${netId}.${pin.compId}`,
          points: compactPoints([pin.pt, { x: pin.pt.x, y: railY }]),
        });
      }
      continue;
    }

    if (pins.length === 2) {
      const [a, b] = points as [PinAnchor, PinAnchor];
      if (Math.abs(a.x - b.x) < 0.1 || Math.abs(a.y - b.y) < 0.1) {
        result.push({ netId, points: [a, b] });
        continue;
      }
      const old = priorPrimary(netId)?.points;
      const horizontalFirst = old && old.length >= 2
        ? Math.abs(old[0]!.y - old[1]!.y) < 0.1
        : Math.abs(a.x - b.x) >= Math.abs(a.y - b.y);
      result.push({
        netId,
        points: compactPoints(horizontalFirst
          ? [a, { x: b.x, y: a.y }, b]
          : [a, { x: a.x, y: b.y }, b]),
      });
      continue;
    }

    const oldSpine = priorHorizontal(netId);
    const sortedY = points.map((point) => point.y).sort((a, b) => a - b);
    const spineY = oldSpine?.points[0]?.y ?? sortedY[Math.floor(sortedY.length / 2)]!;
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const spine: RoutedWire = {
      netId,
      points: [{ x: minX, y: spineY }, { x: maxX, y: spineY }],
      junctions: [],
    };
    result.push(spine);
    for (const pin of pins) {
      if (Math.abs(pin.pt.y - spineY) >= 0.1) {
        result.push({
          netId: `${netId}.${pin.compId}`,
          points: [pin.pt, { x: pin.pt.x, y: spineY }],
        });
      }
      if (pin.pt.x > minX && pin.pt.x < maxX) {
        spine.junctions!.push({ x: pin.pt.x, y: spineY });
      }
    }
    if (spine.junctions?.length === 0) delete spine.junctions;
  }

  return result;
}
