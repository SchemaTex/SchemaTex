import type { EntityAST, EntityNode, EntityEdge } from "../../core/types";
import type { RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  defs,
  rect,
  circle,
  polygon,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import {
  layoutEntity,
  type EntityLayoutNode,
  type EntityLayoutEdge,
} from "./layout";

function buildCss(t: BaseTheme): string {
  return `
.lt-entity { font-family: "Inter", "Helvetica Neue", Helvetica, sans-serif; }
.lt-entity-title { font-size: 20px; font-weight: 600; fill: ${t.text}; }
.lt-entity-name { font-size: 13px; font-weight: 600; fill: ${t.text}; text-anchor: middle; }
.lt-entity-type { font-size: 11px; font-weight: 400; fill: ${t.textMuted}; text-anchor: middle; }
.lt-entity-role { font: italic 10px sans-serif; fill: ${t.textMuted}; text-anchor: middle; }
.lt-entity-note { font: 10px sans-serif; fill: ${t.textMuted}; text-anchor: middle; }
.lt-entity-edge { stroke: ${t.stroke}; stroke-width: 1.5; fill: none; }
.lt-entity-edge-pool { stroke: ${t.neutral}; stroke-width: 1.5; fill: none; stroke-dasharray: 5,4; }
.lt-entity-edge-license { stroke: ${t.textMuted}; stroke-width: 1.5; fill: none; stroke-dasharray: 5,4; }
.lt-entity-edge-distribution { stroke: ${t === resolveBaseTheme("default") ? "#b45309" : t.warn}; stroke-width: 1.5; fill: none; stroke-dasharray: 2,4; }
.lt-entity-edge-voting-pref { stroke: ${t.accent}; stroke-width: 1.5; fill: none; stroke-dasharray: 7,4; }
.lt-entity-label { font-size: 11px; font-weight: 600; fill: ${t.text}; text-anchor: middle; }
.lt-entity-cluster { fill: none; stroke-dasharray: 6,4; stroke-width: 1.2; }
.lt-entity-cluster-label { font: 600 11px sans-serif; letter-spacing: 0.5px; }
.lt-entity-status-new { stroke: ${t.positive}; stroke-width: 2.2; }
.lt-entity-status-eliminated { stroke: ${t.negative}; stroke-width: 2.2; }
.lt-entity-status-modified { stroke: ${t.warn}; stroke-width: 2.2; }
.lt-entity-status-tag { font: 700 8px sans-serif; text-anchor: middle; letter-spacing: 0.5px; }
`.trim();
}

const FILL: Record<string, string> = {
  corp: "#dbeafe",
  llc: "#dcfce7",
  lp: "#fef3c7",
  trust: "#ede9fe",
  individual: "#fed7aa",
  foundation: "#dbeafe",
  disregarded: "#dcfce7",
  pool: "#f1f5f9",
  placeholder: "#f9fafb",
};

function statusClass(node: EntityNode): string | undefined {
  switch (node.status) {
    case "new":
      return "lt-entity-status-new";
    case "eliminated":
      return "lt-entity-status-eliminated";
    case "modified":
      return "lt-entity-status-modified";
    default:
      return undefined;
  }
}

function renderShape(ln: EntityLayoutNode, t: BaseTheme): string {
  const n = ln.node;
  const fill = t === resolveBaseTheme("default") ? FILL[n.entityType] ?? t.bg : t.bg;
  const sc = statusClass(n);
  const commonAttrs: Record<string, string | number> = {
    fill,
    stroke: t.stroke,
    "stroke-width": 1.4,
  };
  if (sc) {
    commonAttrs.class = sc;
  }
  // Dashed stroke for disregarded / placeholder / pool
  const dashed =
    n.entityType === "placeholder" ||
    n.entityType === "pool";

  const dashAttr = dashed ? { "stroke-dasharray": "5,3" } : {};
  const opacity = n.entityType === "placeholder" ? { opacity: 0.75 } : {};

  const x = -ln.width / 2;
  const y = -ln.height / 2;

  switch (n.entityType) {
    case "corp":
      return rect({
        x,
        y,
        width: ln.width,
        height: ln.height,
        rx: 0,
        ...commonAttrs,
        ...dashAttr,
      });
    case "llc":
      return rect({
        x,
        y,
        width: ln.width,
        height: ln.height,
        rx: 10,
        ry: 10,
        ...commonAttrs,
      });
    case "lp": {
      return polygon({ points: `0,${y} ${-x},${-y} ${x},${-y}`, ...commonAttrs });
    }
    case "trust":
      return el("ellipse", {
        cx: 0,
        cy: 0,
        rx: ln.width / 2,
        ry: ln.height / 2,
        ...commonAttrs,
      });
    case "individual":
      return circle({
        cx: 0,
        cy: 0,
        r: Math.min(ln.width, ln.height) / 2,
        ...commonAttrs,
      });
    case "foundation":
      return rect({ x, y, width: ln.width, height: ln.height, ...commonAttrs });
    case "disregarded":
      return group({}, [
        rect({ x, y, width: ln.width, height: ln.height, rx: 8, ...commonAttrs }),
        el("ellipse", { cx: 0, cy: 0, rx: ln.width / 2 - 10, ry: ln.height / 2 - 10, ...commonAttrs, fill: t === resolveBaseTheme("default") ? "#f4fdf7" : t.bg }),
      ]);
    case "pool":
      return rect({
        x,
        y,
        width: ln.width,
        height: ln.height,
        rx: 8,
        ry: 8,
        ...commonAttrs,
        ...dashAttr,
      });
    case "placeholder":
      return rect({
        x,
        y,
        width: ln.width,
        height: ln.height,
        rx: 4,
        ry: 4,
        ...commonAttrs,
        ...dashAttr,
        ...opacity,
      });
  }
}

function renderStatusTag(ln: EntityLayoutNode, t: BaseTheme): string | undefined {
  const n = ln.node;
  if (!n.status || n.status === "normal") return undefined;
  const map: Record<string, { label: string; color: string }> = {
    new: { label: "NEW", color: t.positive },
    eliminated: { label: "ELIMINATED", color: t.negative },
    modified: { label: "MODIFIED", color: t.warn },
  };
  const info = map[n.status];
  if (!info) return undefined;
  const w = info.label.length * 6 + 8;
  const h = 12;
  const x = -ln.width / 2 - 2;
  const y = -ln.height / 2 - h - 2;
  return group({}, [
    rect({ x, y, width: w, height: h, rx: 2, fill: info.color, stroke: "none" }),
    textEl(
      { x: x + w / 2, y: y + h - 3, class: "lt-entity-status-tag", fill: t.bg },
      info.label
    ),
  ]);
}

function renderNodeLabels(ln: EntityLayoutNode): string[] {
  const n = ln.node;
  const pieces: string[] = [];
  const isCircle = n.entityType === "individual";

  if (isCircle) {
    // Name and role rendered BELOW the circle
    let y = ln.height / 2 + 14;
    pieces.push(textEl({ x: 0, y, class: "lt-entity-name" }, n.name));
    y += 13;
    if (n.role) {
      pieces.push(textEl({ x: 0, y, class: "lt-entity-role" }, n.role));
      y += 12;
    }
    if (n.note) {
      pieces.push(textEl({ x: 0, y, class: "lt-entity-note" }, n.note));
    }
    return pieces;
  }

  const rows = ln.nameLines.length + ln.detailLines.length;
  // The triangle's lower half has enough horizontal room for the measured text.
  let y = n.entityType === "lp" ? ln.height / 2 - rows * 15 + 3 : -(rows - 1) * 8 + 4;
  for (const name of ln.nameLines) {
    pieces.push(textEl({ x: 0, y, class: "lt-entity-name" }, name));
    y += 16;
  }
  for (const detail of ln.detailLines) {
    pieces.push(textEl({ x: 0, y, class: "lt-entity-type" }, detail));
    y += 15;
  }
  return pieces;
}

function edgeClass(edge: EntityEdge): string {
  switch (edge.op) {
    case "pool":
      return "lt-entity-edge-pool";
    case "license":
      return "lt-entity-edge-license";
    case "distribution":
      return "lt-entity-edge-distribution";
    case "voting":
      return "lt-entity-edge-voting-pref";
    case "ownership":
    default:
      // Highlight preferred / Series share class
      if (edge.shareClass && /pref|series/i.test(edge.shareClass)) {
        return "lt-entity-edge-voting-pref";
      }
      return "lt-entity-edge";
  }
}

function renderEdgeLabel(le: EntityLayoutEdge): string | undefined {
  if (!le.labelLines.length) return undefined;
  return group({}, le.labelLines.map((label,i)=>textEl({ x:le.labelX, y:le.labelY-(le.labelLines.length-1)*7+4+i*14, class:"lt-entity-label" },label)));
}

export function renderEntity(ast: EntityAST, config?: RenderConfig): string {
  const layout = layoutEntity(ast);
  const t = resolveBaseTheme(config?.theme ?? "default");
  const titleOffset = ast.title ? 54 : 12;
  const width = Math.ceil(layout.width);
  const height = Math.ceil(layout.height + titleOffset);

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Entity Structure Diagram"));
  children.push(
    desc(
      `Entity structure diagram with ${ast.entities.length} entities and ${ast.edges.length} relationships`
    )
  );
  children.push(el("style", {}, buildCss(t)));

  // Arrow markers (per semantic role)
  children.push(
    defs([
      arrowMarker("lt-entity-arrow", t.stroke),
      arrowMarker("lt-entity-arrow-contract", t.textMuted),
      arrowMarker("lt-entity-arrow-green", t === resolveBaseTheme("default") ? "#b45309" : t.warn),
      arrowMarker("lt-entity-arrow-grey", t.neutral),
      arrowMarker("lt-entity-arrow-blue", t.accent),
    ])
  );

  if (ast.title) {
    children.push(textEl({ x: 40, y: 30, class: "lt-entity-title", "text-anchor": "start" }, ast.title));
  }

  const inner: string[] = [];

  // Clusters (behind nodes) — label sits INSIDE the cluster top row
  for (const c of layout.clusters) {
    const color = c.color ?? t.neutral;
    inner.push(
      rect({
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
        rx: 8,
        stroke: color,
        class: "lt-entity-cluster",
      })
    );
    inner.push(
      textEl(
        { x: c.x + 12, y: c.y + 16, class: "lt-entity-cluster-label", fill: color },
        c.label
      )
    );
  }

  // Edges (before nodes so nodes sit on top)
  for (const le of layout.edges) {
    const cls = edgeClass(le.edge);
    const markerId = pickMarker(le.edge, cls);
    inner.push(
      pathEl({
        d: le.path,
        class: cls,
        ...(le.edge.op === "ownership" ? {} : { "marker-end": `url(#${markerId})` }),
      })
    );
  }
  // Labels are positioned beside clear segments by the layout.
  for (const le of layout.edges) {
    const piece = renderEdgeLabel(le);
    if (piece) inner.push(piece);
  }

  // Nodes
  for (const ln of layout.nodes) {
    const parts: string[] = [];
    parts.push(renderShape(ln, t));
    const status = renderStatusTag(ln, t);
    if (status) parts.push(status);
    for (const p of renderNodeLabels(ln)) parts.push(p);
    inner.push(
      group(
        {
          transform: `translate(${ln.x}, ${ln.y})`,
          "data-entity-id": ln.node.id,
          "data-entity-type": ln.node.entityType,
          "data-jurisdiction": ln.node.jurisdiction ?? "",
        },
        parts
      )
    );
  }

  const wrap = group({ transform: `translate(0, ${titleOffset})` }, inner);
  children.push(wrap);

  return svgRoot(
    {
      class: "lt-entity",
      role: "img",
      "aria-label": escapeXml(ast.title ?? "Entity structure diagram"),
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    children
  );
}

function arrowMarker(id: string, color: string): string {
  return el(
    "marker",
    {
      id,
      markerWidth: 9,
      markerHeight: 9,
      refX: 7,
      refY: 3,
      orient: "auto",
      markerUnits: "strokeWidth",
    },
    [el("path", { d: "M 0 0 L 7 3 L 0 6 z", fill: color })]
  );
}

function pickMarker(_edge: EntityEdge, cls: string): string {
  if (cls === "lt-entity-edge-license") return "lt-entity-arrow-contract";
  if (cls === "lt-entity-edge-distribution") return "lt-entity-arrow-green";
  if (cls === "lt-entity-edge-pool") return "lt-entity-arrow-grey";
  if (cls === "lt-entity-edge-voting-pref") return "lt-entity-arrow-blue";
  return "lt-entity-arrow";
}
