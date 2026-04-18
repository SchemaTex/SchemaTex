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
import { getSymbol, type PinAnchor } from "./symbols";
import type {
  LaidOutComponent,
  CircuitLayoutResult,
} from "./layout";

const COL_W = 120; // horizontal spacing per component
const ROW_H = 100; // vertical spacing per rank
const RAIL_PAD = 60; // distance from top/bottom rail to component row
const LEFT_MARGIN = 80;
const TOP_MARGIN = 60;

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

export function layoutCircuitNetlist(ast: CircuitAST): AutoLayoutResult {
  const pinMap = ast.pinMap ?? {};

  // ── Step 1: classify ───────────────────────────────────────
  // MVP ranking: power sources + regular components share the MIDDLE rank
  // (sources on the left, others to their right). Grounds live on a dedicated
  // bottom rank so a full-width GND rail can be drawn underneath. This mimics
  // the standard textbook convention where a vertical source on the left
  // feeds a horizontal chain of components into a ground at the bottom.
  const powerComps: CircuitComponent[] = [];
  const groundComps: CircuitComponent[] = [];
  const middleComps: CircuitComponent[] = [];

  for (const c of ast.components) {
    if (isPowerSource(c)) powerComps.push(c);
    else if (isGround(c)) groundComps.push(c);
    else middleComps.push(c);
  }

  const ranks: CircuitComponent[][] = [];
  const mainRank = [...powerComps, ...middleComps];
  if (mainRank.length) ranks.push(mainRank);
  if (groundComps.length) ranks.push(groundComps);

  // If classification produced nothing, fall through with one row
  if (ranks.length === 0) ranks.push(ast.components);

  // ── Step 4: place components on grid ───────────────────────
  const placed = new Map<string, LaidOutComponent>();
  const items: LaidOutComponent[] = [];

  let maxCols = 0;
  for (const rank of ranks) maxCols = Math.max(maxCols, rank.length);

  for (let r = 0; r < ranks.length; r++) {
    const rank = ranks[r];
    const rowY = TOP_MARGIN + r * (ROW_H + RAIL_PAD);
    // Center this rank under the widest rank
    const startX = LEFT_MARGIN + ((maxCols - rank.length) * COL_W) / 2;

    for (let i = 0; i < rank.length; i++) {
      const comp = rank[i];
      // For netlist mode, override direction based on role: power sources
      // face down (plus at bottom, connecting to the middle rank), ground
      // symbols face up (stem pointing down).
      const direction = defaultDirection(comp);
      comp.direction = direction;
      const rot = rotationOf(direction);

      const sym = getSymbol(comp.componentType);
      const x = startX + i * COL_W;
      const y = rowY;

      const worldAnchors: Record<string, PinAnchor> = {};
      if (sym) {
        for (const [name, pt] of Object.entries(sym.anchors)) {
          const rp = rotatePt(pt, rot);
          worldAnchors[name] = { x: x + rp.x, y: y + rp.y };
        }
      } else {
        worldAnchors.start = { x, y };
        worldAnchors.end = { x: x + 30, y };
      }

      const laid: LaidOutComponent = {
        component: comp,
        x,
        y,
        rotation: rot,
        length: sym?.length ?? 30,
        anchors: worldAnchors,
      };
      items.push(laid);
      placed.set(comp.id, laid);
    }
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
