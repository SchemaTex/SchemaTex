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
export function weldGlyph(type: WeldType, cx: number, y: number, dir: Dir, cls: string): string[] {
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
        line({ x1: cx - 3, y1: y, x2: cx - 3, y2: yb, class: cls }),
        line({ x1: cx + 3, y1: y, x2: cx + 3, y2: yb, class: cls }),
      ];
    case "vgroove":
      // open V, apex on the line
      return [path({ d: `M ${round(x0)} ${round(yb)} L ${round(cx)} ${round(y)} L ${round(x1)} ${round(yb)}`, class: cls, fill: "none" })];
    case "bevel":
      // half-V: one vertical + one slanted stroke
      return [
        line({ x1: cx - 4, y1: y, x2: cx - 4, y2: yb, class: cls }),
        line({ x1: cx - 4, y1: y, x2: x1, y2: yb, class: cls }),
      ];
    case "ugroove":
      return [
        path({
          d: `M ${round(x0)} ${round(y)} L ${round(x0)} ${round(y + dir * H * 0.45)} Q ${round(x0)} ${round(yb)} ${round(cx)} ${round(yb)} Q ${round(x1)} ${round(yb)} ${round(x1)} ${round(y + dir * H * 0.45)} L ${round(x1)} ${round(y)}`,
          class: cls,
          fill: "none",
        }),
      ];
    case "jgroove":
      return [
        path({
          d: `M ${round(cx - 4)} ${round(y)} L ${round(cx - 4)} ${round(y + dir * H * 0.45)} Q ${round(cx - 4)} ${round(yb)} ${round(x1)} ${round(yb)}`,
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
        line({ x1: cx - 4, y1: y, x2: cx - 4, y2: yb, class: cls }),
        path({ d: `M ${round(cx - 4)} ${round(y)} Q ${round(x1)} ${round(y)} ${round(x1)} ${round(yb)}`, class: cls, fill: "none" }),
      ];
    case "plug":
    case "slot": {
      const ry = dir > 0 ? y : y - H * 0.7;
      return [rect({ x: x0, y: ry, width: W, height: H * 0.7, class: cls, fill: "none" })];
    }
    case "spot":
      // circle centred ON the reference line
      return [circle({ cx, cy: y, r: W * 0.42, class: cls, fill: "none" })];
    case "seam":
      return [
        circle({ cx, cy: y, r: W * 0.42, class: cls, fill: "none" }),
        line({ x1: cx - W * 0.42, y1: y, x2: cx + W * 0.42, y2: y, class: cls }),
      ];
    case "back":
    case "backing": {
      // semicircle, flat side on the line, dome away from it
      const rr = W * 0.45;
      const sweep = dir > 0 ? 1 : 0;
      return [path({ d: `M ${round(cx - rr)} ${round(y)} A ${round(rr)} ${round(rr)} 0 0 ${sweep} ${round(cx + rr)} ${round(y)}`, class: cls, fill: "none" })];
    }
    case "surfacing": {
      // stacked convex build-up bumps on the arrow side
      const r = W / 4;
      const yy = y + dir * 3;
      const bump = (off: number) =>
        path({ d: `M ${round(cx - W / 2)} ${round(off)} a ${round(r)} ${round(r)} 0 0 ${dir > 0 ? 1 : 0} ${round(W / 2)} 0 a ${round(r)} ${round(r)} 0 0 ${dir > 0 ? 1 : 0} ${round(W / 2)} 0`, class: cls, fill: "none" });
      return [bump(y), bump(yy)];
    }
    case "edge":
      return [
        line({ x1: cx - 3, y1: y, x2: cx - 3, y2: yb, class: cls }),
        line({ x1: cx + 3, y1: y, x2: cx + 3, y2: yb, class: cls }),
      ];
  }
}

/** Contour supplementary symbol drawn just above (outside) the weld glyph. */
export function contourGlyph(contour: WeldContour, cx: number, y: number, dir: Dir, cls: string): string {
  const yy = y + dir * (H + 5);
  const half = W / 2;
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
