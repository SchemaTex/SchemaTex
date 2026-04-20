/**
 * SVG shape primitives for flowchart nodes.
 *
 * Each builder returns one or more SVG element strings (no wrapper <g> or
 * text — the renderer composes those). All shapes render into (0, 0, w, h).
 */

import type { FlowchartShape } from "../../core/types";
import { rect, polygon, circle as svgCircle, line as svgLine, path as svgPath } from "../../core/svg";

export function shapeSVG(shape: FlowchartShape, w: number, h: number): string {
  switch (shape) {
    // ── M1 core shapes ─────────────────────────────────────────
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

    // ── M2 additional shapes ────────────────────────────────────
    case "parallelogram-alt": {
      const slant = 20;
      const points = `0,0 ${w - slant},0 ${w},${h} ${slant},${h}`;
      return polygon({ points, class: "sx-fc-node" });
    }

    case "trapezoid": {
      // Wider at top, narrowing at bottom — manual operation (ISO 5807)
      const slant = 16;
      const points = `0,0 ${w},0 ${w - slant},${h} ${slant},${h}`;
      return polygon({ points, class: "sx-fc-node" });
    }

    case "trapezoid-alt": {
      // Wider at bottom (manual input)
      const slant = 16;
      const points = `${slant},0 ${w - slant},0 ${w},${h} 0,${h}`;
      return polygon({ points, class: "sx-fc-node" });
    }

    case "subroutine": {
      // Rect body + two inner vertical bars (predefined process)
      const barX = 10;
      const body = rect({ x: 0, y: 0, width: w, height: h, rx: 2, class: "sx-fc-node" });
      const left = svgLine({ x1: barX, y1: 0, x2: barX, y2: h, class: "sx-fc-node-subline" });
      const right = svgLine({ x1: w - barX, y1: 0, x2: w - barX, y2: h, class: "sx-fc-node-subline" });
      return body + left + right;
    }

    case "cylinder": {
      // Database / storage — single silhouette path with curved top & bottom.
      // Silhouette: top upper-arc + right side + bottom lower-arc + left side.
      const ry = Math.min(8, h / 4);
      const silhouette = svgPath({
        d: `M0,${ry} A${w / 2},${ry} 0 0,1 ${w},${ry} L${w},${h - ry} A${w / 2},${ry} 0 0,1 0,${h - ry} Z`,
        class: "sx-fc-node",
      });
      // Back half of top ellipse (inside body) — 3-D rim indicator.
      const topRim = svgPath({
        d: `M0,${ry} A${w / 2},${ry} 0 0,0 ${w},${ry}`,
        class: "sx-fc-node-arc",
      });
      return silhouette + topRim;
    }

    case "circle": {
      const r = Math.min(w, h) / 2 - 1;
      return svgCircle({ cx: w / 2, cy: h / 2, r, class: "sx-fc-node sx-fc-node-circle" });
    }

    case "double-circle": {
      // Outer filled circle + inner ring (no fill) — terminator / sink
      const r1 = Math.min(w, h) / 2 - 1;
      const r2 = r1 - 5;
      const outer = svgCircle({ cx: w / 2, cy: h / 2, r: r1, class: "sx-fc-node" });
      const inner = svgCircle({ cx: w / 2, cy: h / 2, r: r2, class: "sx-fc-node-ring" });
      return outer + inner;
    }

    case "hexagon": {
      // Preparation / setup step — horizontal hex
      const cut = Math.min(20, w / 4);
      const points = `${cut},0 ${w - cut},0 ${w},${h / 2} ${w - cut},${h} ${cut},${h} 0,${h / 2}`;
      return polygon({ points, class: "sx-fc-node sx-fc-node-hexagon" });
    }

    case "asymmetric": {
      // ISO 5807 alt process — right-pointing flag / ribbon
      const pts = `0,0 ${w - 15},0 ${w},${h / 2} ${w - 15},${h} 0,${h}`;
      return polygon({ points: pts, class: "sx-fc-node" });
    }

    default:
      return rect({ x: 0, y: 0, width: w, height: h, rx: 14, ry: 14, class: "sx-fc-node" });
  }
}
