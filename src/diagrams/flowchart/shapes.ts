/**
 * SVG shape primitives for flowchart nodes (M1: 5 shapes).
 *
 * Each builder returns an SVG element string (without the `<g>` wrapper or the
 * text; renderer composes those).
 *
 * All shapes are rendered in the bounding box (0, 0, w, h) — the renderer
 * applies a `translate(x, y)` on the group.
 */

import type { FlowchartShape } from "../../core/types";
import { rect, polygon } from "../../core/svg";

export function shapeSVG(shape: FlowchartShape, w: number, h: number): string {
  switch (shape) {
    case "rect":
      return rect({ x: 0, y: 0, width: w, height: h, rx: 14, ry: 14, class: "sx-fc-node" });
    case "round":
      return rect({ x: 0, y: 0, width: w, height: h, rx: 20, ry: 20, class: "sx-fc-node sx-fc-node-round" });
    case "stadium": {
      const r = Math.min(h / 2, 24);
      return rect({ x: 0, y: 0, width: w, height: h, rx: r, ry: r, class: "sx-fc-node sx-fc-node-stadium" });
    }
    case "diamond": {
      const points = `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
      return polygon({ points, class: "sx-fc-node sx-fc-node-diamond" });
    }
    case "parallelogram": {
      const slant = 20;
      const points = `${slant},0 ${w},0 ${w - slant},${h} 0,${h}`;
      return polygon({ points, class: "sx-fc-node" });
    }
    case "parallelogram-alt": {
      const slant = 20;
      const points = `0,0 ${w - slant},0 ${w},${h} ${slant},${h}`;
      return polygon({ points, class: "sx-fc-node" });
    }
    default:
      return rect({ x: 0, y: 0, width: w, height: h, rx: 6, ry: 6, class: "sx-fc-node" });
  }
}
