import type { MatrixAST, MatrixPoint } from "./types";

export interface PlotBox {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

export interface PointLayout {
  point: MatrixPoint;
  /** Center px */
  px: number;
  py: number;
  /** Bubble radius px */
  r: number;
  /** Estimated label bbox */
  label: LabelLayout;
}

export interface LabelLayout {
  text: string;
  /** anchor pos (where the leader line starts if external) */
  ax: number;
  ay: number;
  /** label center pos */
  lx: number;
  ly: number;
  width: number;
  height: number;
  external: boolean;
  textAnchor: "start" | "middle" | "end";
}

export interface MatrixLayoutResult {
  canvasWidth: number;
  canvasHeight: number;
  plot: PlotBox;
  points: PointLayout[];
  categories: string[];
}

const CANVAS_W = 720;
const CANVAS_H = 560;
const PADDING_X = 110;
const PADDING_Y = 90;
const CHAR_W = 6.2;
const LABEL_H = 14;

function estimateWidth(text: string): number {
  // crude monospace-ish estimate — wider for CJK handled trivially
  const cjk = (text.match(/[\u3000-\u9fff]/g) ?? []).length;
  return (text.length - cjk) * CHAR_W + cjk * 12 + 8;
}

function clamp01(v: number): number {
  return Math.max(0.02, Math.min(0.98, v));
}

function placePoint(p: MatrixPoint, plot: PlotBox): { px: number; py: number } {
  const nx = clamp01(p.x);
  const ny = clamp01(p.y);
  const px = plot.x0 + nx * plot.w;
  const py = plot.y0 + (1 - ny) * plot.h;
  return { px, py };
}

function computeRadius(p: MatrixPoint, maxSize: number, plot: PlotBox, scale: "area" | "radius"): number {
  if (p.size === undefined) return 6;
  const maxRadius = Math.max(14, plot.h * 0.08);
  const minRadius = 4;
  if (maxSize <= 0) return 6;
  const ratio = p.size / maxSize;
  if (scale === "radius") {
    return Math.max(minRadius, ratio * maxRadius);
  }
  // area-proportional (Tufte)
  const maxArea = Math.PI * maxRadius * maxRadius;
  const area = ratio * maxArea;
  const r = Math.sqrt(area / Math.PI);
  return Math.max(minRadius, r);
}

/**
 * Force-based label collision avoidance.
 * Starts each label offset NE of its point; iterates pushing overlapping
 * bboxes apart. If a label ends up far from its point, switches it to
 * external + leader line.
 */
function resolveLabelCollisions(
  points: PointLayout[],
  plot: PlotBox,
  mode: "auto" | "offset-only" | "leader-only" | "off"
): void {
  if (mode === "off") {
    for (const p of points) {
      p.label.lx = p.px + p.r + 4 + p.label.width / 2;
      p.label.ly = p.py - p.r - 4;
    }
    return;
  }

  // init anchor
  for (const p of points) {
    p.label.ax = p.px;
    p.label.ay = p.py;
    p.label.lx = p.px + p.r + 4 + p.label.width / 2;
    p.label.ly = p.py - p.r - 4;
    p.label.external = false;
    p.label.textAnchor = "middle";
  }

  if (mode === "leader-only") {
    // force all to leader mode immediately
    for (const p of points) {
      p.label.external = true;
      p.label.lx = p.px + p.r + 12 + p.label.width / 2;
      p.label.ly = p.py;
      p.label.textAnchor = "middle";
    }
    return;
  }

  const PAD = 3;
  for (let iter = 0; iter < 30; iter++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]!.label;
        const b = points[j]!.label;
        const ax0 = a.lx - a.width / 2 - PAD;
        const ax1 = a.lx + a.width / 2 + PAD;
        const ay0 = a.ly - a.height / 2 - PAD;
        const ay1 = a.ly + a.height / 2 + PAD;
        const bx0 = b.lx - b.width / 2 - PAD;
        const bx1 = b.lx + b.width / 2 + PAD;
        const by0 = b.ly - b.height / 2 - PAD;
        const by1 = b.ly + b.height / 2 + PAD;
        const overlapX = Math.min(ax1, bx1) - Math.max(ax0, bx0);
        const overlapY = Math.min(ay1, by1) - Math.max(ay0, by0);
        if (overlapX > 0 && overlapY > 0) {
          // push along y (smaller dimension usually), then x
          const dx = (a.lx - b.lx) || 0.1;
          const dy = (a.ly - b.ly) || 0.1;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const step = Math.min(3, Math.min(overlapX, overlapY) / 2 + 0.5);
          a.lx += ux * step;
          a.ly += uy * step;
          b.lx -= ux * step;
          b.ly -= uy * step;
          moved = true;
        }
      }
      // keep label within plot bounds
      const lb = points[i]!.label;
      if (lb.lx - lb.width / 2 < plot.x0 + 2) lb.lx = plot.x0 + 2 + lb.width / 2;
      if (lb.lx + lb.width / 2 > plot.x0 + plot.w - 2) lb.lx = plot.x0 + plot.w - 2 - lb.width / 2;
      if (lb.ly - lb.height / 2 < plot.y0 + 2) lb.ly = plot.y0 + 2 + lb.height / 2;
      if (lb.ly + lb.height / 2 > plot.y0 + plot.h - 2) lb.ly = plot.y0 + plot.h - 2 - lb.height / 2;
    }
    if (!moved) break;
  }

  // Upgrade to leader line if drift is too large
  if (mode === "auto") {
    for (const p of points) {
      const dx = p.label.lx - p.px;
      const dy = p.label.ly - p.py;
      if (Math.hypot(dx, dy) > 40) {
        p.label.external = true;
      }
    }
  }
}

export function layoutMatrix(ast: MatrixAST): MatrixLayoutResult {
  const canvasWidth = CANVAS_W;
  const canvasHeight = CANVAS_H;
  const plot: PlotBox = {
    x0: PADDING_X,
    y0: PADDING_Y - 30,
    w: canvasWidth - PADDING_X * 2,
    h: canvasHeight - PADDING_Y * 2,
  };

  const points: PointLayout[] = [];
  const categoriesSet = new Set<string>();

  if (ast.mode === "quadrant") {
    // Determine max size for bubble scaling
    let maxSize = 0;
    for (const p of ast.points) {
      if (p.size !== undefined && p.size > maxSize) maxSize = p.size;
    }

    for (const p of ast.points) {
      const { px, py } = placePoint(p, plot);
      const r = computeRadius(p, maxSize, plot, ast.config.bubbleScale);
      const width = estimateWidth(p.label);
      const label: LabelLayout = {
        text: p.label,
        ax: px,
        ay: py,
        lx: px + r + 4 + width / 2,
        ly: py - r - 4,
        width,
        height: LABEL_H,
        external: false,
        textAnchor: "middle",
      };
      points.push({ point: p, px, py, r, label });
      if (p.category) categoriesSet.add(p.category);
    }

    resolveLabelCollisions(points, plot, ast.config.labelCollision);
  }

  return {
    canvasWidth,
    canvasHeight,
    plot,
    points,
    categories: [...categoriesSet],
  };
}
