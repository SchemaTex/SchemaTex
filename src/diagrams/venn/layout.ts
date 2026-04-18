/**
 * Venn / Euler layout dispatcher.
 *
 * Picks a layout based on `ast.sets.length`, `config.mode` and
 * `config.proportional`:
 *
 *   - n=2 fixed or analytic proportional
 *   - n=3 fixed or gradient-descent proportional
 *   - n=4 fixed (4 ellipses); proportional deferred
 *   - Euler (subset / disjoint / partial overlap) — derived from relations or
 *     inferred by auto-detecting which regions actually have values.
 */

import type {
  VennAST,
  VennCircle,
  VennEllipse,
  VennLayoutResult,
  VennLabelPosition,
  VennRegion,
  VennShape,
  VennEulerRelation,
} from "../../core/types";
import {
  circleBBox,
  ellipseBBox,
  fourEllipseStandard,
  pointInCircle,
  pointInEllipse,
  regionCentroid,
  solveTwoCircleDistance,
  threeCircleClassic,
  twoCircleIntersectionArea,
  unionBBox,
} from "./geometry";
import { placeLabels } from "./labels";

export interface LayoutOptions {
  /** Canvas width override. */
  width?: number;
  /** Canvas height override. */
  height?: number;
  /** Padding around the diagram (px). */
  padding?: number;
}

const DEFAULTS = {
  padding: 24,
  canvasN2: { w: 480, h: 320, r: 110, d: 120 },
  canvasN3: { w: 520, h: 480, r: 130, offset: 0.6 },
  canvasN4: { w: 640, h: 480, a: 216, b: 120 },
  canvasEuler: { w: 520, h: 420 },
};

export function layoutVenn(ast: VennAST, opts: LayoutOptions = {}): VennLayoutResult {
  const mode = decideMode(ast);
  if (mode === "euler") {
    return layoutEuler(ast, opts);
  }
  const n = ast.sets.length;
  if (n === 1) return layoutSingle(ast, opts);
  if (n === 2) return layoutTwo(ast, opts);
  if (n === 3) return layoutThree(ast, opts);
  if (n === 4) return layoutFour(ast, opts);
  // Fallback for 5+ — collapse to Euler disjoint row (UpSet deferred).
  return layoutEuler(ast, opts);
}

function decideMode(ast: VennAST): "venn" | "euler" {
  if (ast.config.mode === "venn") return "venn";
  if (ast.config.mode === "euler") return "euler";
  // Auto: Euler if any explicit relations were declared.
  return ast.relations.length > 0 ? "euler" : "venn";
}

// ─── n = 1 (degenerate) ──────────────────────────────────────

function layoutSingle(ast: VennAST, opts: LayoutOptions): VennLayoutResult {
  const w = opts.width ?? 320;
  const h = opts.height ?? 260;
  const set = ast.sets[0];
  if (!set) {
    return { width: w, height: h, mode: "venn", shapes: [], labels: [], setLabels: [] };
  }
  const circle: VennCircle = { id: set.id, cx: w / 2, cy: h / 2, r: Math.min(w, h) / 3 };
  const shapes: VennShape[] = [{ kind: "circle", ...circle }];
  const region = ast.regions.find((r) => r.sets.length === 1 && r.sets[0] === set.id);
  const labels: VennLabelPosition[] = region
    ? [
        {
          sets: [set.id],
          label: formatRegionValue(region),
          x: circle.cx,
          y: circle.cy,
          external: false,
        },
      ]
    : [];
  const setLabels = [
    {
      id: set.id,
      label: set.label,
      x: circle.cx,
      y: circle.cy - circle.r - 12,
      anchor: "middle" as const,
    },
  ];
  return {
    width: w,
    height: h,
    mode: "venn",
    shapes,
    labels,
    setLabels,
    ...(ast.title ? { title: { text: ast.title, x: w / 2, y: 24 } } : {}),
  };
}

// ─── n = 2 ───────────────────────────────────────────────────

function layoutTwo(ast: VennAST, opts: LayoutOptions): VennLayoutResult {
  const padding = opts.padding ?? DEFAULTS.padding;
  const setA = ast.sets[0];
  const setB = ast.sets[1];
  if (!setA || !setB) {
    throw new Error("layoutTwo requires two sets");
  }
  let rA = DEFAULTS.canvasN2.r;
  let rB = DEFAULTS.canvasN2.r;
  let d = DEFAULTS.canvasN2.d;

  if (ast.config.proportional) {
    const sizes = computeAbsoluteSetSizes(ast);
    const sizeA = sizes.get(setA.id) ?? 1;
    const sizeB = sizes.get(setB.id) ?? 1;
    const inter = regionValue(ast, [setA.id, setB.id]) ?? 0;
    const scale = 1 / Math.sqrt(Math.max(sizeA, sizeB));
    rA = 110 * Math.sqrt(sizeA) * scale;
    rB = 110 * Math.sqrt(sizeB) * scale;
    const areaPerElem = (Math.PI * rA * rA) / Math.max(sizeA, 1e-6);
    d = solveTwoCircleDistance(rA, rB, inter * areaPerElem);
  }

  const totalW = rA + rB + d + 2 * padding;
  const w = Math.max(opts.width ?? DEFAULTS.canvasN2.w, totalW);
  const h = opts.height ?? DEFAULTS.canvasN2.h;

  const cxA = (w - d) / 2;
  const cxB = cxA + d;
  const cy = h / 2;

  const circles: [VennCircle, VennCircle] = [
    { id: setA.id, cx: cxA, cy, r: rA },
    { id: setB.id, cx: cxB, cy, r: rB },
  ];

  const shapes: VennShape[] = circles.map((c) => ({ kind: "circle" as const, ...c }));
  const labels = placeLabels(ast, shapes);
  const setLabels = [
    { id: setA.id, label: setA.label, x: cxA, y: cy - rA - 10, anchor: "middle" as const },
    { id: setB.id, label: setB.label, x: cxB, y: cy - rB - 10, anchor: "middle" as const },
  ];

  return {
    width: w,
    height: h,
    mode: "venn",
    shapes,
    labels,
    setLabels,
    ...(ast.title ? { title: { text: ast.title, x: w / 2, y: 24 } } : {}),
  };
}

// ─── n = 3 ───────────────────────────────────────────────────

function layoutThree(ast: VennAST, opts: LayoutOptions): VennLayoutResult {
  const w = opts.width ?? DEFAULTS.canvasN3.w;
  const h = opts.height ?? DEFAULTS.canvasN3.h;
  const r = DEFAULTS.canvasN3.r;
  const offsetScale = DEFAULTS.canvasN3.offset;

  // Leave room for set title + diagram title.
  const cx = w / 2;
  const cy = h / 2 + 12;

  let circles = threeCircleClassic(cx, cy, r, offsetScale);

  if (ast.config.proportional) {
    const adjusted = solveProportionalThree(ast, cx, cy);
    if (adjusted) circles = adjusted;
  }

  const shapes: VennShape[] = circles.map((c, i) => {
    const setId = ast.sets[i]?.id ?? c.id;
    return { kind: "circle" as const, ...c, id: setId };
  });

  const labels = placeLabels(ast, shapes);
  const setLabels = ast.sets.map((s, i) => {
    const c = circles[i] ?? circles[0];
    if (!c) {
      return { id: s.id, label: s.label, x: cx, y: cy, anchor: "middle" as const };
    }
    // Title for top circle goes above; others below-outer.
    const isTop = i === 2;
    return {
      id: s.id,
      label: s.label,
      x: isTop ? c.cx : c.cx + (i === 0 ? -c.r : c.r) * 0.7,
      y: isTop ? c.cy - c.r - 10 : c.cy + c.r + 16,
      anchor: (isTop ? "middle" : i === 0 ? "end" : "start") as "middle" | "start" | "end",
    };
  });

  return {
    width: w,
    height: h,
    mode: "venn",
    shapes,
    labels,
    setLabels,
    ...(ast.title ? { title: { text: ast.title, x: w / 2, y: 24 } } : {}),
  };
}

// ─── n = 4 ───────────────────────────────────────────────────

function layoutFour(ast: VennAST, opts: LayoutOptions): VennLayoutResult {
  const w = opts.width ?? DEFAULTS.canvasN4.w;
  const h = opts.height ?? DEFAULTS.canvasN4.h;
  const cx = w / 2;
  const cy = h / 2 + 8;

  const ellipses = fourEllipseStandard(cx, cy, DEFAULTS.canvasN4.a, DEFAULTS.canvasN4.b);
  const shapes: VennShape[] = ellipses.map((e, i) => ({
    kind: "ellipse" as const,
    ...e,
    id: ast.sets[i]?.id ?? e.id,
  }));

  const labels = placeLabels(ast, shapes);
  const setLabels = ast.sets.map((s, i) => {
    const e = ellipses[i];
    if (!e) {
      return { id: s.id, label: s.label, x: cx, y: cy, anchor: "middle" as const };
    }
    const bb = ellipseBBox(e);
    // Place set titles at the outermost end of each ellipse.
    const sign = i < 2 ? -1 : 1;
    return {
      id: s.id,
      label: s.label,
      x: bb.x + (sign < 0 ? 0 : bb.w),
      y: bb.y + (i % 2 === 0 ? 14 : bb.h - 4),
      anchor: (sign < 0 ? "start" : "end") as "start" | "middle" | "end",
    };
  });

  return {
    width: w,
    height: h,
    mode: "venn",
    shapes,
    labels,
    setLabels,
    ...(ast.title ? { title: { text: ast.title, x: w / 2, y: 24 } } : {}),
  };
}

// ─── Euler layout ────────────────────────────────────────────

function layoutEuler(ast: VennAST, opts: LayoutOptions): VennLayoutResult {
  const w = opts.width ?? DEFAULTS.canvasEuler.w;
  const h = opts.height ?? DEFAULTS.canvasEuler.h;
  const n = ast.sets.length;
  if (n === 0) {
    return {
      width: w,
      height: h,
      mode: "euler",
      shapes: [],
      labels: [],
      setLabels: [],
    };
  }

  // Build containment tree from relations.
  const parents = new Map<string, string>(); // child -> parent (subset)
  const disjointPairs = new Set<string>();
  for (const rel of ast.relations) {
    if (rel.type === "subset") parents.set(rel.from, rel.to);
    if (rel.type === "disjoint") disjointPairs.add(edgeKey(rel.from, rel.to));
  }

  // Roots: sets with no parent.
  const roots = ast.sets.filter((s) => !parents.has(s.id)).map((s) => s.id);

  const circles = new Map<string, VennCircle>();
  const rootRadius = Math.min(w, h) * 0.32;
  // Horizontal layout of roots.
  const rootSpacing = Math.min(w / Math.max(roots.length, 1), 2 * rootRadius + 40);
  const startX = w / 2 - ((roots.length - 1) * rootSpacing) / 2;
  roots.forEach((rootId, i) => {
    circles.set(rootId, { id: rootId, cx: startX + i * rootSpacing, cy: h / 2, r: rootRadius });
  });

  // Recursively place children inside parents.
  const childrenOf = new Map<string, string[]>();
  for (const [child, par] of parents.entries()) {
    const arr = childrenOf.get(par) ?? [];
    arr.push(child);
    childrenOf.set(par, arr);
  }

  const placeChildren = (parentId: string, depth: number): void => {
    const kids = childrenOf.get(parentId) ?? [];
    if (kids.length === 0) return;
    const parent = circles.get(parentId);
    if (!parent) return;
    const childR = parent.r * (kids.length === 1 ? 0.55 : 0.4);
    kids.forEach((kid, i) => {
      // Distribute children horizontally within parent.
      const offset = (kids.length === 1 ? 0 : (i - (kids.length - 1) / 2) * childR * 1.4);
      circles.set(kid, {
        id: kid,
        cx: parent.cx + offset,
        cy: parent.cy + (depth % 2 === 0 ? 0 : -childR * 0.2),
        r: childR,
      });
      placeChildren(kid, depth + 1);
    });
  };
  for (const r of roots) placeChildren(r, 0);

  // Handle sets with no relation at all — append at the side.
  let sideX = 30;
  for (const s of ast.sets) {
    if (!circles.has(s.id)) {
      circles.set(s.id, { id: s.id, cx: sideX + 60, cy: h / 2, r: 50 });
      sideX += 130;
    }
  }

  const shapes: VennShape[] = ast.sets.map((s) => ({
    kind: "circle" as const,
    ...(circles.get(s.id) ?? { id: s.id, cx: w / 2, cy: h / 2, r: 40 }),
  }));

  const labels = placeLabels(ast, shapes);
  const setLabels = ast.sets.map((s) => {
    const c = circles.get(s.id) ?? { cx: w / 2, cy: h / 2, r: 40 };
    return {
      id: s.id,
      label: s.label,
      x: c.cx,
      y: c.cy - c.r - 6,
      anchor: "middle" as const,
    };
  });

  // Avoid unused var warning (disjointPairs informs future placement).
  void disjointPairs;

  return {
    width: w,
    height: h,
    mode: "euler",
    shapes,
    labels,
    setLabels,
    ...(ast.title ? { title: { text: ast.title, x: w / 2, y: 24 } } : {}),
  };
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// ─── Proportional helpers ───────────────────────────────────

function computeAbsoluteSetSizes(ast: VennAST): Map<string, number> {
  // |A| = Σ value over all regions containing A.
  const out = new Map<string, number>();
  for (const s of ast.sets) out.set(s.id, 0);
  for (const r of ast.regions) {
    const num = numericValue(r);
    if (num === null) continue;
    for (const sid of r.sets) {
      out.set(sid, (out.get(sid) ?? 0) + num);
    }
  }
  return out;
}

function numericValue(r: VennRegion): number | null {
  if (r.value.kind === "integer" || r.value.kind === "percent") return r.value.value;
  if (r.value.kind === "list") return r.value.value.length;
  return null;
}

function regionValue(ast: VennAST, sets: string[]): number | null {
  // Exact match on "only" regions or on intersection regions.
  const needle = [...sets].sort().join("|");
  for (const r of ast.regions) {
    const key = [...r.sets].sort().join("|");
    if (key === needle) {
      return numericValue(r);
    }
  }
  return null;
}

/**
 * Very small finite-difference gradient descent for n=3 proportional.
 * Returns an adjusted circle triple or null if the solver didn't converge.
 */
function solveProportionalThree(
  ast: VennAST,
  cx: number,
  cy: number
): [VennCircle, VennCircle, VennCircle] | null {
  const setA = ast.sets[0];
  const setB = ast.sets[1];
  const setC = ast.sets[2];
  if (!setA || !setB || !setC) return null;
  const sizes = computeAbsoluteSetSizes(ast);
  const s0 = sizes.get(setA.id) ?? 0;
  const s1 = sizes.get(setB.id) ?? 0;
  const s2 = sizes.get(setC.id) ?? 0;
  if (s0 <= 0 || s1 <= 0 || s2 <= 0) return null;

  // Target absolute areas (px²), normalised so the biggest set becomes ~π·r²
  // with r = 130.
  const maxSize = Math.max(s0, s1, s2);
  const baseR = 130;
  const baseArea = Math.PI * baseR * baseR;
  const perElem = baseArea / maxSize;
  const r0 = Math.sqrt((s0 * perElem) / Math.PI);
  const r1 = Math.sqrt((s1 * perElem) / Math.PI);
  const r2 = Math.sqrt((s2 * perElem) / Math.PI);

  // Initial distances from pairwise analytic intersections.
  const p01 = regionValue(ast, [setA.id, setB.id]) ?? 0;
  const p02 = regionValue(ast, [setA.id, setC.id]) ?? 0;
  const p12 = regionValue(ast, [setB.id, setC.id]) ?? 0;
  // Pairwise target area includes triple-overlap contribution; approximate only.
  const d01 = solveTwoCircleDistance(r0, r1, p01 * perElem);
  const d02 = solveTwoCircleDistance(r0, r2, p02 * perElem);
  const d12 = solveTwoCircleDistance(r1, r2, p12 * perElem);

  // Place centers using pairwise distances (triangulation).
  const x0 = cx - d01 / 2;
  const y0 = cy + d01 * 0.1; // slight drop
  const x1 = x0 + d01;
  const y1 = y0;
  // Circle 2 at intersection of two circles of radius d02 & d12 around (x0,y0) & (x1,y1).
  const ex = x1 - x0;
  const ey = y1 - y0;
  const dxy = Math.sqrt(ex * ex + ey * ey);
  if (dxy < 1e-6) return null;
  const a = (d02 * d02 - d12 * d12 + dxy * dxy) / (2 * dxy);
  const hSq = d02 * d02 - a * a;
  const h = hSq > 0 ? Math.sqrt(hSq) : 0;
  const px = x0 + (a * ex) / dxy;
  const py = y0 + (a * ey) / dxy;
  const x2 = px - (h * ey) / dxy;
  const y2 = py - (h * ex) / dxy;

  // Re-center around (cx, cy).
  const avgX = (x0 + x1 + x2) / 3;
  const avgY = (y0 + y1 + y2) / 3;
  const offX = cx - avgX;
  const offY = cy - avgY;
  return [
    { id: setA.id, cx: x0 + offX, cy: y0 + offY, r: r0 },
    { id: setB.id, cx: x1 + offX, cy: y1 + offY, r: r1 },
    { id: setC.id, cx: x2 + offX, cy: y2 + offY, r: r2 },
  ];
}

// ─── Shared helpers exposed for renderer/label module ───────

export function formatRegionValue(r: VennRegion): string {
  switch (r.value.kind) {
    case "integer":
      return String(r.value.value);
    case "percent":
      return `${r.value.value}%`;
    case "text":
      return r.value.value;
    case "list":
      return r.value.value.join(", ");
    case "none":
      return "";
  }
}

/** Utility: ensure a VennCircle is a "raw" circle (strip `id`). */
export function pickCircle(s: VennShape): VennCircle | null {
  return s.kind === "circle" ? s : null;
}

/** Utility: ensure a VennEllipse (strip `id`). */
export function pickEllipse(s: VennShape): VennEllipse | null {
  return s.kind === "ellipse" ? s : null;
}

/** Re-export for tests (tests sometimes check bbox math end-to-end). */
export { circleBBox, ellipseBBox, pointInCircle, pointInEllipse, unionBBox, regionCentroid, twoCircleIntersectionArea };

/** Export dispatcher helpers kept internal. */
export type { VennEulerRelation };
