/**
 * Label placement for Venn / Euler diagrams.
 *
 * Pipeline per region:
 *   1. Compute axis-aligned union bbox of included shapes.
 *   2. Monte-Carlo sample to estimate centroid + area of the region
 *      (region = (∀ inShape in included) AND (∀ notIn in excluded)).
 *   3. If area < MIN_AREA → externalise the label with a leader line
 *      that starts at the centroid and ends just outside the union bbox.
 */

import type {
  VennAST,
  VennCircle,
  VennEllipse,
  VennLabelPosition,
  VennRegion,
  VennShape,
} from "../../core/types";
import {
  circleBBox,
  ellipseBBox,
  pointInCircle,
  pointInEllipse,
  regionCentroid,
  unionBBox,
  type Box,
} from "./geometry";
import { formatRegionValue } from "./layout";

/** Minimum interior area (sq px) for an inside label. */
const MIN_AREA = 400;

interface ShapeEntry {
  id: string;
  shape: VennShape;
  bbox: Box;
  inside: (x: number, y: number) => boolean;
}

function makeShapeEntry(shape: VennShape): ShapeEntry {
  if (shape.kind === "circle") {
    const c: VennCircle = shape;
    return {
      id: shape.id,
      shape,
      bbox: circleBBox(c),
      inside: (x, y) => pointInCircle(c, x, y),
    };
  }
  const e: VennEllipse = shape;
  return {
    id: shape.id,
    shape,
    bbox: ellipseBBox(e),
    inside: (x, y) => pointInEllipse(e, x, y),
  };
}

export function placeLabels(ast: VennAST, shapes: VennShape[]): VennLabelPosition[] {
  const entries = shapes.map(makeShapeEntry);
  const byId = new Map<string, ShapeEntry>();
  for (const e of entries) byId.set(e.id, e);

  const labels: VennLabelPosition[] = [];
  const canvasBounds = unionBBox(entries.map((e) => e.bbox));

  ast.regions.forEach((region, regionIdx) => {
    const included = region.sets.map((id) => byId.get(id)).filter(isDefined);
    if (included.length === 0) return;

    // Excluded shapes: for "only" regions, every other set is excluded.
    let excluded: ShapeEntry[] = [];
    if (region.only) {
      excluded = entries.filter((e) => !region.sets.includes(e.id));
    }

    const bounds = unionBBox(included.map((e) => e.bbox));
    // Deterministic seed per region so repeated renders are stable.
    const seed = 0x1337 + regionIdx * 0x9e3779b9;
    const { cx, cy, area, interior } = regionCentroid(
      bounds,
      included,
      excluded,
      1500,
      seed
    );

    const text = regionLabelText(region);
    if (!text) return;

    if (!Number.isFinite(cx) || !Number.isFinite(cy) || area === 0) {
      return;
    }

    if (area >= MIN_AREA) {
      labels.push({
        sets: region.sets,
        label: text,
        x: cx,
        y: cy,
        external: false,
      });
      return;
    }

    // Externalise: find a direction from the region centroid toward the nearest
    // canvas edge and place the label just outside the included shapes' bbox.
    const dirX = cx - canvasBounds.x - canvasBounds.w / 2;
    const dirY = cy - canvasBounds.y - canvasBounds.h / 2;
    const mag = Math.max(1e-6, Math.sqrt(dirX * dirX + dirY * dirY));
    const ux = dirX / mag;
    const uy = dirY / mag;
    const leaderLen = 28;
    const ex = cx + ux * leaderLen;
    const ey = cy + uy * leaderLen;
    const anchor: "start" | "end" | "middle" = ux > 0.25 ? "start" : ux < -0.25 ? "end" : "middle";

    // Prefer a sample point that is actually interior for the leader start.
    const picked = interior[Math.floor(interior.length / 2)];
    const start = picked ?? { x: cx, y: cy };
    labels.push({
      sets: region.sets,
      label: text,
      x: ex,
      y: ey,
      external: true,
      leader: { x1: start.x, y1: start.y, x2: ex, y2: ey },
      anchor,
    });
  });

  return labels;
}

function regionLabelText(region: VennRegion): string {
  return formatRegionValue(region);
}

function isDefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}
