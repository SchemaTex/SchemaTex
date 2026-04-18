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
/** For n ≥ 4 we require a more generous interior area to suppress mid-canvas stacking. */
const MIN_AREA_DENSE = 900;
/** Approximate label bbox padding for collision tests. */
const LABEL_H = 14;
const CHAR_W = 6.2;
/** Minimum gap (px) between any two interior label bboxes. */
const LABEL_GAP = 4;

function labelWidth(text: string): number {
  return text.length * CHAR_W + 8;
}

function bboxesOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return (
    ax < bx + bw + LABEL_GAP &&
    ax + aw + LABEL_GAP > bx &&
    ay < by + bh + LABEL_GAP &&
    ay + ah + LABEL_GAP > by
  );
}

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

interface Candidate {
  region: VennRegion;
  text: string;
  cx: number;
  cy: number;
  area: number;
  interior: readonly { x: number; y: number }[];
  width: number;
}

export function placeLabels(ast: VennAST, shapes: VennShape[]): VennLabelPosition[] {
  const entries = shapes.map(makeShapeEntry);
  const byId = new Map<string, ShapeEntry>();
  for (const e of entries) byId.set(e.id, e);

  const canvasBounds = unionBBox(entries.map((e) => e.bbox));
  const canvasCx = canvasBounds.x + canvasBounds.w / 2;
  const canvasCy = canvasBounds.y + canvasBounds.h / 2;
  // Dense: n ≥ 4 sets → central regions get too crowded; raise internal gate.
  const dense = shapes.length >= 4;
  const minArea = dense ? MIN_AREA_DENSE : MIN_AREA;

  // ── Pass 1: compute centroid + area for every region ──────────
  const candidates: Candidate[] = [];
  ast.regions.forEach((region, regionIdx) => {
    const included = region.sets.map((id) => byId.get(id)).filter(isDefined);
    if (included.length === 0) return;
    const excluded = region.only
      ? entries.filter((e) => !region.sets.includes(e.id))
      : [];
    const bounds = unionBBox(included.map((e) => e.bbox));
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
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || area === 0) return;
    candidates.push({
      region,
      text,
      cx,
      cy,
      area,
      interior,
      width: labelWidth(text),
    });
  });

  // ── Pass 2: decide internal vs external (area + collision) ────
  // Sort by area desc so bigger regions claim interior slots first.
  const byAreaDesc = [...candidates].sort((a, b) => b.area - a.area);
  const placedInternal: { c: Candidate; x: number; y: number }[] = [];
  const externalQueue: Candidate[] = [];

  for (const c of byAreaDesc) {
    if (c.area < minArea) {
      externalQueue.push(c);
      continue;
    }
    // Check collision against already-placed internal labels.
    const x = c.cx - c.width / 2;
    const y = c.cy - LABEL_H / 2;
    const collides = placedInternal.some(({ c: p, x: px, y: py }) =>
      bboxesOverlap(x, y, c.width, LABEL_H, px, py, p.width, LABEL_H)
    );
    if (collides) {
      externalQueue.push(c);
    } else {
      placedInternal.push({ c, x, y });
    }
  }

  // ── Pass 3: distribute external labels around canvas by angle ─
  // Each external keeps leader line from its interior sample point.
  const externalPlacements = layoutExternal(
    externalQueue,
    canvasCx,
    canvasCy,
    canvasBounds
  );

  // ── Assemble final list, preserving original region order ─────
  const placedMap = new Map<VennRegion, VennLabelPosition>();
  for (const { c } of placedInternal) {
    placedMap.set(c.region, {
      sets: c.region.sets,
      label: c.text,
      x: c.cx,
      y: c.cy,
      external: false,
    });
  }
  for (const p of externalPlacements) {
    placedMap.set(p.region, p.label);
  }

  const out: VennLabelPosition[] = [];
  for (const region of ast.regions) {
    const p = placedMap.get(region);
    if (p) out.push(p);
  }
  return out;
}

interface ExternalPlacement {
  region: VennRegion;
  label: VennLabelPosition;
}

/**
 * Distribute external labels evenly around the canvas by centroid angle,
 * preventing the "all leaders point to the same cluster" problem on n=4.
 */
function layoutExternal(
  queue: Candidate[],
  cx: number,
  cy: number,
  canvas: Box
): ExternalPlacement[] {
  if (queue.length === 0) return [];

  // Sort by angle around canvas center.
  const withAngle = queue.map((c) => {
    const dx = c.cx - cx;
    const dy = c.cy - cy;
    let theta = Math.atan2(dy, dx);
    if (!Number.isFinite(theta)) theta = 0;
    return { c, theta };
  });
  withAngle.sort((a, b) => a.theta - b.theta);

  // Target radius: distance from center to a point just outside canvas bbox.
  const radiusX = canvas.w / 2 + 40;
  const radiusY = canvas.h / 2 + 28;

  // Enforce a minimum angular spacing so adjacent externals don't overlap.
  const minGap = Math.min((2 * Math.PI) / Math.max(6, withAngle.length), 0.45);
  const adjusted = redistributeAngles(
    withAngle.map((w) => w.theta),
    minGap
  );

  const out: ExternalPlacement[] = [];
  for (let i = 0; i < withAngle.length; i++) {
    const { c } = withAngle[i]!;
    const theta = adjusted[i]!;
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    const ex = cx + ux * radiusX;
    const ey = cy + uy * radiusY;
    const anchor: "start" | "end" | "middle" =
      ux > 0.25 ? "start" : ux < -0.25 ? "end" : "middle";
    const picked = c.interior[Math.floor(c.interior.length / 2)];
    const start = picked ?? { x: c.cx, y: c.cy };
    out.push({
      region: c.region,
      label: {
        sets: c.region.sets,
        label: c.text,
        x: ex,
        y: ey,
        external: true,
        leader: { x1: start.x, y1: start.y, x2: ex, y2: ey },
        anchor,
      },
    });
  }
  return out;
}

/**
 * Adjust angle sequence (already sorted) so adjacent values differ by at least
 * `minGap`. Uses a simple forward-sweep then backward clamp — good enough for
 * Venn label fan-out.
 */
function redistributeAngles(thetas: number[], minGap: number): number[] {
  const out = thetas.slice();
  for (let i = 1; i < out.length; i++) {
    const need = out[i - 1]! + minGap;
    if (out[i]! < need) out[i] = need;
  }
  // Wrap-around: if last exceeds first + 2π − minGap, push everything back.
  const wrapLimit = out[0]! + Math.PI * 2 - minGap;
  if (out.length > 1 && out[out.length - 1]! > wrapLimit) {
    const shift = out[out.length - 1]! - wrapLimit;
    for (let i = 0; i < out.length; i++) out[i] = out[i]! - shift;
  }
  return out;
}

function regionLabelText(region: VennRegion): string {
  return formatRegionValue(region);
}

function isDefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}
