/**
 * Weld-symbol glyph catalog (AWS A2.4 / ISO 2553) drawn as original line-art.
 *
 * Every glyph is drawn in a local cell whose baseline sits ON the reference
 * line at `y`, centred at `x = cx`. `dir = +1` draws the glyph *below* the line
 * (downward), `dir = -1` *above* (upward) — so the same routine renders a weld
 * on either side. Returns SVG element strings (no positioning state).
 */
import { line, path, polygon, circle, rect } from "../../core/svg";
import type { WeldType, WeldContour } from "./types";

const W = 18; // glyph cell width
const H = 15; // glyph cell height

type Dir = 1 | -1;

function pl(points: [number, number][], cls: string): string {
  return polygon({ points: points.map((p) => `${round(p[0])},${round(p[1])}`).join(" "), class: cls, fill: "none" });
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Render the weld glyph for `type`, centred at (cx, y), on side `dir`. */
export function weldGlyph(type: WeldType, cx: number, y: number, dir: Dir, cls: string, width = W, height = H): string[] {
  const W = width;
  const H = height;
  const x0 = cx - W / 2;
  const x1 = cx + W / 2;
  const yb = y + dir * H; // far edge of the cell
  switch (type) {
    case "fillet":
      // right triangle: vertical leg on the left, hypotenuse to the right
      return [pl([[x0, y], [x0, yb], [x1, y]], cls)];
    case "square":
      // two parallel verticals straddling the line
      return [
        line({ x1: cx - W / 4, y1: y, x2: cx - W / 4, y2: yb, class: cls }),
        line({ x1: cx + W / 4, y1: y, x2: cx + W / 4, y2: yb, class: cls }),
      ];
    case "vgroove":
      // open V, apex on the line
      return [path({ d: `M ${round(x0)} ${round(yb)} L ${round(cx)} ${round(y)} L ${round(x1)} ${round(yb)}`, class: cls, fill: "none" })];
    case "bevel":
      // half-V: one vertical + one slanted stroke
      return [
        line({ x1: x0, y1: y, x2: x0, y2: yb, class: cls }),
        line({ x1: x0, y1: y, x2: x1, y2: yb, class: cls }),
      ];
    case "ugroove":
      return [
        line({ x1: cx, y1: y, x2: cx, y2: y + dir * H * 0.35, class: cls }),
        path({
          d: `M ${round(x0)} ${round(yb)} Q ${round(x0)} ${round(y + dir * H * 0.35)} ${round(cx)} ${round(y + dir * H * 0.35)} Q ${round(x1)} ${round(y + dir * H * 0.35)} ${round(x1)} ${round(yb)}`,
          class: cls,
          fill: "none",
        }),
      ];
    case "jgroove":
      return [
        line({ x1: x0, y1: y, x2: x0, y2: yb, class: cls }),
        path({
          d: `M ${round(x0)} ${round(y + dir * H * 0.35)} Q ${round(x1)} ${round(y + dir * H * 0.35)} ${round(x1)} ${round(yb)}`,
          class: cls,
          fill: "none",
        }),
      ];
    case "flarev":
      // two outward-curving arcs meeting at the apex on the line
      return [
        path({ d: `M ${round(x0)} ${round(yb)} Q ${round(cx - 2)} ${round(yb)} ${round(cx)} ${round(y)}`, class: cls, fill: "none" }),
        path({ d: `M ${round(x1)} ${round(yb)} Q ${round(cx + 2)} ${round(yb)} ${round(cx)} ${round(y)}`, class: cls, fill: "none" }),
      ];
    case "flarebevel":
      return [
        line({ x1: x0, y1: y, x2: x0, y2: yb, class: cls }),
        path({ d: `M ${round(x0)} ${round(y)} Q ${round(x1)} ${round(y)} ${round(x1)} ${round(yb)}`, class: cls, fill: "none" }),
      ];
    case "plug":
    case "slot": {
      const ry = dir > 0 ? y : y - H * 0.7;
      return [rect({ x: x0, y: ry, width: W, height: H * 0.7, class: cls, fill: "none" })];
    }
    case "spot":
      return [circle({ cx, cy: y + dir * W * 0.42, r: W * 0.42, class: cls, fill: "none" })];
    case "seam":
      return [
        circle({ cx, cy: y + dir * W * 0.42, r: W * 0.42, class: cls, fill: "none" }),
        ...[0.24, 0.60].map(d => line({ x1: x0, y1: y + dir * W * d, x2: x1, y2: y + dir * W * d, class: cls })),
      ];
    case "back":
    case "backing": {
      // semicircle, flat side on the line, dome away from it
      const rr = W * 0.45;
      const sweep = dir > 0 ? 0 : 1;
      return [path({ d: `M ${round(cx - rr)} ${round(y)} A ${round(rr)} ${round(rr)} 0 0 ${sweep} ${round(cx + rr)} ${round(y)}`, class: cls, fill: "none" })];
    }
    case "surfacing": {
      // Adjacent build-up arcs on the specified side of the reference line.
      const r = W / 4;
      return [path({ d: `M ${round(x0)} ${round(y)} a ${round(r)} ${round(r)} 0 0 ${dir > 0 ? 0 : 1} ${round(W / 2)} 0 a ${round(r)} ${round(r)} 0 0 ${dir > 0 ? 0 : 1} ${round(W / 2)} 0`, class: cls, fill: "none" })];
    }
    case "edge":
      return [
        pl([[cx - W / 4, y], [cx - W / 4, yb], [cx + W / 4, yb], [cx + W / 4, y]], cls),
        line({ x1: cx, y1: y, x2: cx, y2: yb, class: cls }),
      ];
  }
}

/** Contour supplementary symbol drawn just above (outside) the weld glyph. */
export function contourGlyph(contour: WeldContour, cx: number, y: number, dir: Dir, cls: string, width = W, offset = H + 5, type?: WeldType, height = H): string {
  if (type === "fillet") {
    // The exposed face is the triangle's hypotenuse, not a horizontal edge.
    const length = Math.hypot(width, height);
    const nx = height / length, ny = dir * width / length;
    const ax = cx - width / 2 + nx * 6, ay = y + dir * height + ny * 6;
    const bx = cx + width / 2 + nx * 6, by = y + ny * 6;
    if (contour === "flush") return line({ x1: ax, y1: ay, x2: bx, y2: by, class: cls });
    const bulge = contour === "convex" ? 7 : -7;
    return path({ d: `M ${round(ax)} ${round(ay)} Q ${round((ax + bx) / 2 + nx * bulge)} ${round((ay + by) / 2 + ny * bulge)} ${round(bx)} ${round(by)}`, class: cls, fill: "none" });
  }
  const yy = y + dir * offset;
  const half = width / 2;
  if (contour === "flush") {
    return line({ x1: cx - half, y1: yy, x2: cx + half, y2: yy, class: cls });
  }
  // convex bulges away from the line, concave dishes toward it
  const bulge = contour === "convex" ? dir : -dir;
  return path({
    d: `M ${round(cx - half)} ${round(yy)} Q ${round(cx)} ${round(yy + bulge * 5)} ${round(cx + half)} ${round(yy)}`,
    class: cls,
    fill: "none",
  });
}

export const WELD_GLYPH_W = W;
export const WELD_GLYPH_H = H;
