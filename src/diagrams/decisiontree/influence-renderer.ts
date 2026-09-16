import type { RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  rect,
  polygon,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { layoutInfluence } from "./influence-layout";
import type { InfluenceAST, InfluenceLayoutArc, InfluenceLayoutNode } from "./types";

// ─── Influence-diagram renderer (Howard & Matheson) ──────────
//
//   decision node = rectangle  (.lt-dtree-decision)
//   chance node   = oval       (.lt-dtree-chance)
//   value node    = octagon   (.lt-dtree-value)
//   arcs          = open-arrow connectors; informational arcs (into a
//                   decision) are dashed (.lt-dtree-arc-information).
//
// Reuses the existing dtree CSS class names where the meaning matches so themes
// stay consistent across modes.

function buildCss(t: BaseTheme): string {
  return `
.lt-dtree { font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; }
.lt-dtree-title { font-size: 20px; font-weight: 500; fill: ${t.text}; }
.lt-dtree-decision { fill: ${t.fillMuted}; stroke: ${t.stroke}; stroke-width: 1.6; }
.lt-dtree-chance { fill: ${t.bg}; stroke: ${t.stroke}; stroke-width: 1.6; }
.lt-dtree-value { fill: ${t.stroke}; stroke: ${t.stroke}; stroke-width: 1.6; }
.lt-dtree-node-label { font-size: 12px; font-weight: 500; fill: ${t.text}; text-anchor: middle; dominant-baseline: middle; }
.lt-dtree-value-label { fill: ${t.bg}; }
.lt-dtree-value-util { font-size: 10px; font-weight: 600; fill: ${t.textMuted}; text-anchor: middle; }
.lt-dtree-arc { fill: none; stroke: ${t.stroke}; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.lt-dtree-arc-information { fill: none; stroke: ${t.stroke}; stroke-width: 1.6; stroke-dasharray: 5 4; stroke-linecap: round; }
.lt-dtree-arc-head { fill: ${t.stroke}; stroke: none; }
.lt-dtree-arc-label { font-size: 10px; font-weight: 500; fill: ${t.textMuted}; text-anchor: middle; dominant-baseline: middle; }
.lt-dtree-arc-label-bg { fill: ${t.bg}; stroke: none; }
`.trim();
}

function renderNode(ln: InfluenceLayoutNode): string {
  const n = ln.node;
  const parts: string[] = [];
  const hw = ln.width / 2;
  const hh = ln.height / 2;

  if (n.kind === "decision") {
    parts.push(rect({
      x: ln.x - hw, y: ln.y - hh, width: ln.width, height: ln.height,
      rx: 3, ry: 3, class: "lt-dtree-decision",
    }));
  } else if (n.kind === "chance") {
    parts.push(el("ellipse", {
      cx: ln.x, cy: ln.y, rx: hw, ry: hh, class: "lt-dtree-chance",
    }));
    if (n.deterministic) parts.push(el("ellipse", {cx:ln.x,cy:ln.y,rx:hw-4,ry:hh-4,class:"lt-dtree-chance"}));
  } else {
    // value node — octagon (Howard & Matheson convention: cut-corner box)
    const ix = Math.min(14, ln.width * 0.2);
    const iy = Math.min(10, hh * 0.55);
    const pts = [
      `${ln.x - hw + ix},${ln.y - hh}`,
      `${ln.x + hw - ix},${ln.y - hh}`,
      `${ln.x + hw},${ln.y - hh + iy}`,
      `${ln.x + hw},${ln.y + hh - iy}`,
      `${ln.x + hw - ix},${ln.y + hh}`,
      `${ln.x - hw + ix},${ln.y + hh}`,
      `${ln.x - hw},${ln.y + hh - iy}`,
      `${ln.x - hw},${ln.y - hh + iy}`,
    ].join(" ");
    parts.push(polygon({ points: pts, class: "lt-dtree-value" }));
  }

  const hasUtil = n.kind === "value" && n.utility !== undefined;
  const labelY = hasUtil ? ln.y - 6 : ln.y;
  parts.push(textEl({ x: ln.x, y: labelY, class: n.kind === "value" ? "lt-dtree-node-label lt-dtree-value-label" : "lt-dtree-node-label" }, n.label));
  if (hasUtil) {
    parts.push(textEl({ x: ln.x, y: ln.y + 11, class: "lt-dtree-value-util lt-dtree-value-label" }, `U=${formatNum(n.utility!)}`));
  }

  return group({
    "data-node-id": n.id,
    "data-node-kind": n.kind,
    "data-layer": String(ln.layer),
  }, parts);
}

function arrowHead(arc: InfluenceLayoutArc): string {
  const size = 9;
  const rad = (arc.tip.angle * Math.PI) / 180;
  const tx = arc.tip.x;
  const ty = arc.tip.y;
  // Two base corners, splayed ±25° behind the tip.
  const spread = (25 * Math.PI) / 180;
  const bx1 = tx - size * Math.cos(rad - spread);
  const by1 = ty - size * Math.sin(rad - spread);
  const bx2 = tx - size * Math.cos(rad + spread);
  const by2 = ty - size * Math.sin(rad + spread);
  const pts = `${round(tx)},${round(ty)} ${round(bx1)},${round(by1)} ${round(bx2)},${round(by2)}`;
  return polygon({ points: pts, class: "lt-dtree-arc-head" });
}

function renderArc(arc: InfluenceLayoutArc): string {
  const parts: string[] = [];
  const cls = arc.kind === "information" ? "lt-dtree-arc-information" : "lt-dtree-arc";
  parts.push(pathEl({ d: arc.path, class: cls, "data-arc": `${arc.from}->${arc.to}`, "data-arc-kind": arc.kind }));
  parts.push(arrowHead(arc));
  if (arc.label && arc.labelAt) {
    const w = Math.max(arc.label.length * 5.6 + 8, 16);
    parts.push(rect({
      x: arc.labelAt.x - w / 2, y: arc.labelAt.y - 7, width: w, height: 14,
      rx: 3, ry: 3, class: "lt-dtree-arc-label-bg",
    }));
    parts.push(textEl({ x: arc.labelAt.x, y: arc.labelAt.y, class: "lt-dtree-arc-label" }, arc.label));
  }
  return group({}, parts);
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 10000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function renderInfluence(ast: InfluenceAST, config?: RenderConfig): string {
  const base = resolveBaseTheme(config?.theme ?? "default");
  const t = !config?.theme || config.theme === "default" ? {...base,text:"#1F2933",stroke:"#3E4C59",textMuted:"#52606D",fillMuted:"#DDE5ED"} : base;
  const layout = layoutInfluence(ast);

  const titleOffset = ast.title ? 52 : 10;
  const width = Math.ceil(layout.width);
  const height = Math.ceil(layout.height + titleOffset);

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Influence Diagram"));
  children.push(desc(
    `Influence diagram with ${layout.nodes.length} nodes and ${layout.arcs.length} arcs`,
  ));
  children.push(el("style", {}, buildCss(t)));

  if (ast.title) {
    children.push(textEl({ x: 36, y: 32, class: "lt-dtree-title" }, ast.title));
  }

  const inner: string[] = [];
  for (const arc of layout.arcs) inner.push(renderArc(arc));
  for (const ln of layout.nodes) inner.push(renderNode(ln));

  children.push(group({ transform: `translate(0, ${titleOffset})`, "data-mode": "influence" }, inner));

  return svgRoot({
    class: "lt-dtree",
    role: "img",
    "aria-label": escapeXml(ast.title ?? "Influence diagram"),
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
  }, children);
}
