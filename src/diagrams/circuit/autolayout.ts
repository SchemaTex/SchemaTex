/** Netlist layout uses one schematic placement and routing pipeline. */
import type { CircuitAST, CircuitComponent } from "../../core/types";
import type { PinAnchor } from "./symbols";
import type { LaidOutComponent, CircuitLayoutResult } from "./layout";
import { schematicNetlistLayout } from "./schematic-layout";

export interface RoutedWire {
  netId: string;
  /** Polyline points in world coords. */
  points: PinAnchor[];
  /** Junction dot positions (3+ pin nets have these). */
  junctions?: PinAnchor[];
}

/**
 * A local supply flag — the Vcc bar or ground rake drawn beside a pin instead
 * of routing that pin to a shared rail. It is a mark on the drawing, not a
 * part: it carries no component identity, so it never appears in `items`,
 * never reaches the scene graph as something selectable, and never shows up
 * in an export that enumerates components.
 */
/** Painted rail annotation geometry, shared with layout measurements. */
export const RAIL_LABEL = { x: 22, y: -10, fontSize: 11 };

export interface SupplyFlagMark {
  purpose?: "group";
  kind: "ground" | "vcc" | "label";
  /** Where the glyph's connection point sits, in world coordinates. */
  at: PinAnchor;
  /** Author-given rail name. A label-only mark has no supply glyph. */
  label?: string;
}

export interface AutoLayoutResult extends CircuitLayoutResult {
  routes: RoutedWire[];
  /** Local supply marks; absent for layouts that draw rails instead. */
  flags?: SupplyFlagMark[];
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

export function layoutCircuitNetlist(ast: CircuitAST): AutoLayoutResult {
  const layout = schematicNetlistLayout(ast);
  if (!layout) throw new Error("Netlist layout requires component pin connections");
  return layout;
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
