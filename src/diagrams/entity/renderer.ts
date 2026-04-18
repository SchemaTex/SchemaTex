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
.lt-entity { background: ${t.bg}; font-family: system-ui, -apple-system, sans-serif; }
.lt-entity-title { font: bold 16px sans-serif; fill: ${t.text}; }
.lt-entity-name { font: 600 12px sans-serif; fill: ${t.text}; text-anchor: middle; }
.lt-entity-type { font: 500 10px sans-serif; fill: ${t.textMuted}; text-anchor: middle; }
.lt-entity-role { font: italic 10px sans-serif; fill: ${t.textMuted}; text-anchor: middle; }
.lt-entity-note { font: 10px sans-serif; fill: ${t.textMuted}; text-anchor: middle; }
.lt-entity-badge-bg { fill: ${t.bg}; stroke: ${t.strokeMuted}; stroke-width: 1; }
.lt-entity-badge-text { font: 600 9px sans-serif; fill: ${t.text}; text-anchor: middle; letter-spacing: 0.5px; }
.lt-entity-edge { stroke: ${t.stroke}; stroke-width: 1.5; fill: none; }
.lt-entity-edge-voting { stroke: ${t.stroke}; stroke-width: 1.2; fill: none; }
.lt-entity-edge-pool { stroke: ${t.strokeMuted}; stroke-width: 1.5; fill: none; stroke-dasharray: 5,4; }
.lt-entity-edge-license { stroke: ${t.palette[3]}; stroke-width: 1.5; fill: none; stroke-dasharray: 5,4; }
.lt-entity-edge-distribution { stroke: ${t.positive}; stroke-width: 1.5; fill: none; stroke-dasharray: 5,4; }
.lt-entity-edge-voting-pref { stroke: ${t.accent}; stroke-width: 1.8; fill: none; }
.lt-entity-label-bg { fill: ${t.bg}; stroke: ${t.strokeMuted}; stroke-width: 1; }
.lt-entity-label { font: 600 10px sans-serif; fill: ${t.text}; text-anchor: middle; }
.lt-entity-label-sub { font: 500 9px sans-serif; fill: ${t.textMuted}; text-anchor: middle; }
.lt-entity-cluster { fill: none; stroke-dasharray: 6,4; stroke-width: 1.2; }
.lt-entity-cluster-label-bg { fill: ${t.bg}; }
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
  lp: "#fef9c3",
  trust: "#ede9fe",
  individual: "#fed7aa",
  foundation: "#fef9c3",
  disregarded: "#f5f5f5",
  pool: "#f1f5f9",
  placeholder: "#f9fafb",
};

const TYPE_LABEL: Record<string, string> = {
  corp: "Corporation",
  llc: "LLC",
  lp: "LP / Fund",
  trust: "Trust",
  individual: "Individual",
  foundation: "Foundation",
  disregarded: "Disregarded Entity",
  pool: "Reserved Pool",
  placeholder: "To Be Formed",
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
  const fill = FILL[n.entityType] ?? t.bg;
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
    n.entityType === "disregarded" ||
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
      // Notched top corners polygon
      const w = ln.width;
      const h = ln.height;
      const notch = 12;
      const pts = [
        [x + notch, y],
        [x + w - notch, y],
        [x + w, y + notch],
        [x + w, y + h],
        [x, y + h],
        [x, y + notch],
      ]
        .map((p) => p.join(","))
        .join(" ");
      return polygon({ points: pts, ...commonAttrs });
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
        r: Math.min(ln.width, ln.height) / 2 - 4,
        ...commonAttrs,
      });
    case "foundation": {
      const w = ln.width;
      const h = ln.height;
      const tip = 14;
      const pts = [
        [x + w / 2, y - tip],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x, y],
      ]
        .map((p) => p.join(","))
        .join(" ");
      return polygon({ points: pts, ...commonAttrs });
    }
    case "disregarded":
      return rect({
        x,
        y,
        width: ln.width,
        height: ln.height,
        ...commonAttrs,
        ...dashAttr,
      });
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

function renderBadge(ln: EntityLayoutNode): string | undefined {
  const j = ln.node.jurisdiction;
  if (!j) return undefined;
  const bw = j.length >= 3 ? 26 : 20;
  const bh = 13;
  // Top-right corner
  const bx = ln.width / 2 - bw - 4;
  const by = -ln.height / 2 + 4;
  return group({}, [
    rect({ x: bx, y: by, width: bw, height: bh, rx: 2, class: "lt-entity-badge-bg" }),
    textEl(
      { x: bx + bw / 2, y: by + bh - 3, class: "lt-entity-badge-text" },
      j
    ),
  ]);
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

  // Inside-shape rendering
  // Name centered, type underneath
  const topY = -6;
  pieces.push(textEl({ x: 0, y: topY, class: "lt-entity-name" }, n.name));
  pieces.push(textEl({ x: 0, y: topY + 14, class: "lt-entity-type" }, TYPE_LABEL[n.entityType] ?? n.entityType));

  // Below-node: role, note, formation date
  let belowY = ln.height / 2 + 14;
  if (n.role) {
    pieces.push(textEl({ x: 0, y: belowY, class: "lt-entity-role" }, n.role));
    belowY += 12;
  }
  if (n.note) {
    pieces.push(textEl({ x: 0, y: belowY, class: "lt-entity-note" }, n.note));
    belowY += 12;
  }
  if (n.formationDate) {
    pieces.push(
      textEl({ x: 0, y: belowY, class: "lt-entity-note" }, `est. ${n.formationDate}`)
    );
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
  const e = le.edge;
  const lines: string[] = [];
  if (e.percentage) lines.push(e.percentage);
  if (e.label) lines.push(e.label);
  const hasClass = !!e.shareClass;
  if (!lines.length && !hasClass) return undefined;

  const main = lines[0];
  const sub = lines[1];
  const classLabel = hasClass ? e.shareClass : undefined;

  // Approximate width
  const maxText = Math.max(
    main ? main.length : 0,
    sub ? sub.length : 0,
    classLabel ? classLabel.length : 0
  );
  const w = Math.max(30, maxText * 6 + 10);
  const rows = (main ? 1 : 0) + (sub ? 1 : 0) + (classLabel ? 1 : 0);
  const h = 4 + rows * 12;
  const x = le.labelX - w / 2;
  const y = le.labelY - h / 2;
  const pieces: string[] = [];
  pieces.push(rect({ x, y, width: w, height: h, rx: 3, class: "lt-entity-label-bg" }));
  let ty = y + 12;
  if (main) {
    pieces.push(textEl({ x: le.labelX, y: ty, class: "lt-entity-label" }, main));
    ty += 12;
  }
  if (sub) {
    pieces.push(textEl({ x: le.labelX, y: ty, class: "lt-entity-label-sub" }, sub));
    ty += 12;
  }
  if (classLabel) {
    pieces.push(textEl({ x: le.labelX, y: ty, class: "lt-entity-label-sub" }, classLabel));
  }
  return group({}, pieces);
}

export function renderEntity(ast: EntityAST, config?: RenderConfig): string {
  const layout = layoutEntity(ast);
  const t = resolveBaseTheme(config?.theme ?? "default");
  const titleOffset = ast.title ? 34 : 12;
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
      arrowMarker("lt-entity-arrow-purple", t.palette[3] ?? t.stroke),
      arrowMarker("lt-entity-arrow-green", t.positive),
      arrowMarker("lt-entity-arrow-grey", t.strokeMuted),
      arrowMarker("lt-entity-arrow-blue", t.accent),
    ])
  );

  if (ast.title) {
    children.push(textEl({ x: 20, y: 22, class: "lt-entity-title" }, ast.title));
  }

  const inner: string[] = [];

  // Clusters (behind nodes) — label sits INSIDE the cluster top row
  for (const c of layout.clusters) {
    const color = c.color ?? t.strokeMuted;
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
        "marker-end": `url(#${markerId})`,
      })
    );
  }
  // Edge labels AFTER paths so they cover lines
  for (const le of layout.edges) {
    const piece = renderEdgeLabel(le);
    if (piece) inner.push(piece);
  }

  // Nodes
  for (const ln of layout.nodes) {
    const parts: string[] = [];
    parts.push(renderShape(ln, t));
    const badge = renderBadge(ln);
    if (badge) parts.push(badge);
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
  if (cls === "lt-entity-edge-license") return "lt-entity-arrow-purple";
  if (cls === "lt-entity-edge-distribution") return "lt-entity-arrow-green";
  if (cls === "lt-entity-edge-pool") return "lt-entity-arrow-grey";
  if (cls === "lt-entity-edge-voting-pref") return "lt-entity-arrow-blue";
  return "lt-entity-arrow";
}
