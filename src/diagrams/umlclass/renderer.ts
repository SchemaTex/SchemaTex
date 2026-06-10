/**
 * UML Class Diagram renderer — LayoutResult → semantic SVG string.
 * Per docs/reference/36-UMLCLASS-STANDARD.md §8 Output Contract.
 *
 * v0.2 changes (Mermaid-audit informed):
 *  - Consumes pre-computed `displayText` per row (truncation done at layout).
 *  - Renders tree-merged inheritance fans (`UmlClassLayoutResult.trees`).
 *  - Stronger header band + 1.5px box border (matches ERD/sequence visual scale).
 *  - Member rows in font-weight 500 to contrast with bold name + muted glyph.
 *  - Larger triangle / diamond adornments.
 *
 * Hard rules (CONTRIBUTING):
 *  - no inline `style=`; all visuals via CSS classes resolved from tokens
 *  - <title>/<desc> for a11y
 *  - data-* attributes for interactivity / theming hooks
 *  - all SVG built via core/svg.ts builder (no raw string concat)
 */

import type { RenderConfig } from "../../core/types";
import {
  group,
  line as svgLine,
  path as svgPath,
  polygon,
  rect,
  svgRoot,
  text as svgText,
  title as svgTitle,
  desc as svgDesc,
  el,
} from "../../core/svg";
import {
  DEFAULT_FONT_FAMILY,
  FONT_SIZE,
  resolveUmlClassTheme,
} from "../../core/theme";
import { parseUmlClass } from "./parser";
import { layoutUmlClass, UMLCLASS_CONST } from "./layout";
import type {
  UmlClassAst,
  UmlClassLayoutBox,
  UmlClassLayoutEdge,
  UmlClassLayoutEdgeEnd,
  UmlClassLayoutPackage,
  UmlClassLayoutResult,
  UmlClassLayoutTree,
  UmlClassMember,
} from "./types";

const VIS_GLYPH: Record<string, string> = {
  public: "+",
  private: "-",
  protected: "#",
  package: "~",
};

// Local visual constants (renderer-only — not in UMLCLASS_CONST because they
// live in the renderer's CSS output).
const BOX_STROKE_W = 1.5;
const DIVIDER_STROKE_W = 1;
const REL_STROKE_W = 1.4;

export function renderUmlClass(text: string, config?: RenderConfig): string {
  const ast = parseUmlClass(text);
  const layout = layoutUmlClass(ast);
  return renderUmlClassLayout(layout, config);
}

export function renderUmlClassLayout(layout: UmlClassLayoutResult, config?: RenderConfig): string {
  const theme = resolveUmlClassTheme(config?.theme ?? "default");
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;

  const a11yLabel = layout.ast.title ?? "UML class diagram";
  const summary = summariseDiagram(layout.ast, layout.trees.length);

  const styleBlock = el(
    "style",
    {},
    `
.sx-umlclass-bg { fill: ${theme.bg}; }
.sx-umlclass-box-fill { fill: ${theme.classifierFill}; }
.sx-umlclass-box-stroke { stroke: ${theme.classifierStroke}; stroke-width: ${BOX_STROKE_W}; fill: none; }
.sx-umlclass-header-fill { fill: ${theme.headerFill}; }
.sx-umlclass-divider { stroke: ${theme.classifierStroke}; stroke-width: ${DIVIDER_STROKE_W}; }
.sx-umlclass-classname { fill: ${theme.nameText}; font-size: ${FONT_SIZE.label + 1}px; font-weight: 700; letter-spacing: -0.01em; }
.sx-umlclass-classname[data-abstract="true"] { font-style: italic; }
.sx-umlclass-stereotype { fill: ${theme.stereotypeText}; font-size: ${FONT_SIZE.small + 1}px; font-style: italic; }
.sx-umlclass-member { fill: ${theme.memberText}; font-size: ${FONT_SIZE.label}px; font-weight: 500; }
.sx-umlclass-member[data-static] { text-decoration: underline; }
.sx-umlclass-member[data-abstract] { font-style: italic; }
.sx-umlclass-visibility { fill: ${theme.visibilityText}; font-size: ${FONT_SIZE.label}px; font-weight: 500; }
.sx-umlclass-rel-line { stroke: ${theme.relationStroke}; stroke-width: ${REL_STROKE_W}; fill: none; }
.sx-umlclass-rel-line[data-dashed="true"] { stroke-dasharray: 5 4; }
.sx-umlclass-triangle { fill: ${theme.adornmentHollowFill}; stroke: ${theme.relationStroke}; stroke-width: ${REL_STROKE_W}; stroke-linejoin: miter; }
.sx-umlclass-diamond-hollow { fill: ${theme.adornmentHollowFill}; stroke: ${theme.relationStroke}; stroke-width: ${REL_STROKE_W}; stroke-linejoin: miter; }
.sx-umlclass-diamond-filled { fill: ${theme.adornmentFill}; stroke: ${theme.relationStroke}; stroke-width: ${REL_STROKE_W}; stroke-linejoin: miter; }
.sx-umlclass-arrowhead { fill: none; stroke: ${theme.relationStroke}; stroke-width: ${REL_STROKE_W}; stroke-linejoin: miter; }
.sx-umlclass-edge-label { fill: ${theme.edgeLabel}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 500; }
.sx-umlclass-edge-name { fill: ${theme.edgeLabel}; font-size: ${FONT_SIZE.label}px; font-style: italic; }
.sx-umlclass-edge-name-halo { fill: ${theme.bg}; stroke: ${theme.bg}; stroke-width: ${UMLCLASS_CONST.EDGE_LABEL_HALO}; stroke-linejoin: round; }
.sx-umlclass-title { fill: ${theme.nameText}; font-size: ${FONT_SIZE.title}px; font-weight: 700; }
.sx-umlclass-package { fill: ${theme.packageFill}; stroke: ${theme.packageStroke}; stroke-width: 1; }
.sx-umlclass-package-label { fill: ${theme.packageLabel}; font-size: ${FONT_SIZE.label}px; font-weight: 600; }
`.trim()
  );

  const children: string[] = [
    svgTitle(a11yLabel),
    svgDesc(summary),
    styleBlock,
    rect({ x: 0, y: 0, width, height, class: "sx-umlclass-bg" }),
  ];

  if (layout.ast.title) {
    children.push(
      svgText(
        {
          x: pad + UMLCLASS_CONST.CANVAS_PAD,
          y: pad + 20,
          class: "sx-umlclass-title",
          "font-family": fontFamily,
        },
        layout.ast.title
      )
    );
  }

  // Package frames render UNDER the boxes (outermost first — already sorted).
  if (layout.packages.length > 0) {
    const pkgGroup = group(
      {
        transform: pad ? `translate(${pad}, ${pad})` : undefined,
        "font-family": fontFamily,
      },
      layout.packages.map(renderPackage)
    );
    children.push(pkgGroup);
  }

  const boxesGroup = group(
    {
      transform: pad ? `translate(${pad}, ${pad})` : undefined,
      "font-family": fontFamily,
    },
    layout.boxes.map(renderBox)
  );
  children.push(boxesGroup);

  // Edges layer (non-merged).
  const edgesGroup = group(
    {
      transform: pad ? `translate(${pad}, ${pad})` : undefined,
      "font-family": fontFamily,
    },
    layout.edges.map((e) => renderEdge(e))
  );
  children.push(edgesGroup);

  // Trees layer (merged inheritance/realization fans). Renders ABOVE the
  // edges so the shared triangle reads as one unit per parent.
  if (layout.trees.length > 0) {
    const treesGroup = group(
      {
        transform: pad ? `translate(${pad}, ${pad})` : undefined,
        "font-family": fontFamily,
      },
      layout.trees.map((t) => renderTree(t))
    );
    children.push(treesGroup);
  }

  return svgRoot(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": a11yLabel,
      "data-diagram-type": "umlclass",
    },
    children
  );
}

// ─── Package frame rendering ─────────────────────────────────

function renderPackage(p: UmlClassLayoutPackage): string {
  return group(
    {
      class: "sx-umlclass-package-group",
      "data-package-id": p.pkg.id,
      "data-depth": String(p.depth),
    },
    [
      rect({
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        rx: 4,
        class: "sx-umlclass-package",
      }),
      svgText(
        {
          x: p.labelX,
          y: p.labelY,
          class: "sx-umlclass-package-label",
          "text-anchor": "middle",
        },
        p.pkg.name
      ),
    ]
  );
}

// ─── Box rendering ────────────────────────────────────────────

function renderBox(b: UmlClassLayoutBox): string {
  const c = b.classifier;
  const stereoText = c.stereotype
    ? `«${c.stereotype}»`
    : c.kind === "interface" ? "«interface»"
    : c.kind === "enum" ? "«enumeration»"
    : c.kind === "datatype" ? "«datatype»"
    : c.kind === "primitive" ? "«primitive»"
    : undefined;

  const children: string[] = [];

  // 1. Header-band fill (tinted to set off the name).
  children.push(
    rect({
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.attrsTopY,
      class: "sx-umlclass-header-fill",
    })
  );
  // 2. Body fill.
  children.push(
    rect({
      x: b.x,
      y: b.y + b.attrsTopY,
      width: b.width,
      height: b.height - b.attrsTopY,
      class: "sx-umlclass-box-fill",
    })
  );
  // 3. Outer border + dividers.
  children.push(
    rect({
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      class: "sx-umlclass-box-stroke",
    })
  );
  children.push(
    svgLine({
      x1: b.x,
      y1: b.y + b.attrsTopY,
      x2: b.x + b.width,
      y2: b.y + b.attrsTopY,
      class: "sx-umlclass-divider",
    })
  );
  children.push(
    svgLine({
      x1: b.x,
      y1: b.y + b.opsTopY,
      x2: b.x + b.width,
      y2: b.y + b.opsTopY,
      class: "sx-umlclass-divider",
    })
  );

  // 4. Stereotype line (centred, italic, muted).
  if (stereoText && b.stereotypeBaselineY !== undefined) {
    children.push(
      svgText(
        {
          x: b.x + b.width / 2,
          y: b.y + b.stereotypeBaselineY,
          class: "sx-umlclass-stereotype",
          "text-anchor": "middle",
        },
        stereoText
      )
    );
  }

  // 5. Class name (centred, bold; italic via [data-abstract]).
  children.push(
    svgText(
      {
        x: b.x + b.width / 2,
        y: b.y + b.nameBaselineY,
        class: "sx-umlclass-classname",
        "text-anchor": "middle",
        "data-abstract": c.isAbstract ? "true" : undefined,
      },
      c.name
    )
  );

  // 6. Attribute rows.
  for (const row of b.attrRows) {
    children.push(renderMemberRow(row.member, row.displayText, b.x + UMLCLASS_CONST.BOX_PAD_X, b.y + row.baselineY));
  }
  // 7. Operation rows.
  for (const row of b.opRows) {
    children.push(renderMemberRow(row.member, row.displayText, b.x + UMLCLASS_CONST.BOX_PAD_X, b.y + row.baselineY));
  }

  return group(
    {
      class: "sx-umlclass-classifier",
      "data-id": c.id,
      "data-kind": c.isAbstract && c.kind === "class" ? "abstract" : c.kind,
      "data-stereotype": c.stereotype,
    },
    children
  );
}

function renderMemberRow(m: UmlClassMember, displayText: string, x: number, y: number): string {
  if (m.kind === "literal") {
    return svgText(
      { x, y, class: "sx-umlclass-member", "data-visibility": "public" },
      displayText
    );
  }

  // Split visibility glyph (if any) from the rest, so we can colour it muted.
  const glyph = m.visibility ? VIS_GLYPH[m.visibility] : "";
  let body = displayText;
  if (glyph && body.startsWith(`${glyph} `)) {
    body = body.slice(glyph.length + 1);
  }
  const visTspan = glyph
    ? el("tspan", { class: "sx-umlclass-visibility" }, `${glyph} `)
    : "";
  return el(
    "text",
    {
      x,
      y,
      class: "sx-umlclass-member",
      "data-visibility": m.visibility ?? "public",
      ...(m.isStatic ? { "data-static": "true" } : {}),
      ...(m.isAbstract ? { "data-abstract": "true" } : {}),
      ...(m.isDerived ? { "data-derived": "true" } : {}),
    },
    `${visTspan}${escapeXmlText(body)}`
  );
}

function escapeXmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Edge rendering (non-merged edges) ───────────────────────

function renderEdge(e: UmlClassLayoutEdge): string {
  const r = e.rel;
  const dashed = r.kind === "realization" || r.kind === "dependency";

  const parts: string[] = [];

  parts.push(
    svgPath({
      d: e.path,
      class: "sx-umlclass-rel-line",
      "data-dashed": dashed ? "true" : undefined,
    })
  );

  parts.push(renderTargetAdornment(r.kind, e.targetEnd));

  if (r.kind === "composition" || r.kind === "aggregation") {
    parts.push(renderSourceDiamond(r.kind, e.sourceEnd));
  }

  if (r.sourceMult) parts.push(renderEndLabel(e.sourceEnd, r.sourceMult, false));
  if (r.targetMult) parts.push(renderEndLabel(e.targetEnd, r.targetMult, false));
  if (r.sourceRole) parts.push(renderEndLabel(e.sourceEnd, r.sourceRole, true));
  if (r.targetRole) parts.push(renderEndLabel(e.targetEnd, r.targetRole, true));

  if (r.label && e.labelAnchor) {
    // Halo behind, then text on top — guarantees readability over the line.
    parts.push(
      svgText(
        {
          x: e.labelAnchor.x,
          y: e.labelAnchor.y - 5,
          class: "sx-umlclass-edge-name sx-umlclass-edge-name-halo",
          "text-anchor": "middle",
        },
        r.label
      )
    );
    parts.push(
      svgText(
        {
          x: e.labelAnchor.x,
          y: e.labelAnchor.y - 5,
          class: "sx-umlclass-edge-name",
          "text-anchor": "middle",
        },
        r.label
      )
    );
  }

  return group(
    {
      class: "sx-umlclass-rel",
      "data-from": r.from,
      "data-to": r.to,
      "data-kind": r.kind,
      "data-source-mult": r.sourceMult,
      "data-target-mult": r.targetMult,
      "data-name": r.label,
    },
    parts
  );
}

// ─── Tree rendering (merged inheritance fans) ────────────────

function renderTree(t: UmlClassLayoutTree): string {
  const dashed = t.kind === "realization";

  const parts: string[] = [];

  // Per-child legs (no adornment).
  for (const d of t.legPaths) {
    parts.push(
      svgPath({
        d,
        class: "sx-umlclass-rel-line",
        "data-dashed": dashed ? "true" : undefined,
      })
    );
  }

  // Single trunk + ONE shared triangle at the parent end.
  parts.push(
    svgPath({
      d: t.trunkD,
      class: "sx-umlclass-rel-line",
      "data-dashed": dashed ? "true" : undefined,
    })
  );
  parts.push(renderTargetAdornment(t.kind, t.parentEnd));

  return group(
    {
      class: "sx-umlclass-rel sx-umlclass-rel-tree",
      "data-kind": t.kind,
      "data-parent": t.parentId,
      "data-children": t.childIds.join(","),
    },
    parts
  );
}

// ─── Adornment renderers (shared between edges and trees) ────

function renderTargetAdornment(
  kind: "generalization" | "realization" | "directed" | "dependency" | "association" | "aggregation" | "composition",
  t: UmlClassLayoutEdgeEnd
): string {
  switch (kind) {
    case "generalization":
    case "realization":
      return renderTriangle(t);
    case "directed":
    case "dependency":
      return renderArrowhead(t);
    case "association":
    case "aggregation":
    case "composition":
      return "";
  }
}

// Adornment convention: `t`/`s` is the TIP on the box boundary; the shape
// points INTO the box and extends OUTWARD (away from the box) by its length.

function renderTriangle(t: UmlClassLayoutEdgeEnd): string {
  const w = UMLCLASS_CONST.TRIANGLE_W / 2;
  const h = UMLCLASS_CONST.TRIANGLE_H;
  const { x, y, side } = t;
  let points = "";
  switch (side) {
    case "bottom": // tip on box bottom edge, points up into box, base below
      points = `${x},${y} ${x - w},${y + h} ${x + w},${y + h}`;
      break;
    case "top":
      points = `${x},${y} ${x - w},${y - h} ${x + w},${y - h}`;
      break;
    case "right":
      points = `${x},${y} ${x + h},${y - w} ${x + h},${y + w}`;
      break;
    case "left":
      points = `${x},${y} ${x - h},${y - w} ${x - h},${y + w}`;
      break;
  }
  return polygon({ points, class: "sx-umlclass-triangle" });
}

function renderArrowhead(t: UmlClassLayoutEdgeEnd): string {
  const len = UMLCLASS_CONST.ARROW_LEN;
  const spread = 5.5;
  const { x, y, side } = t;
  let d = "";
  switch (side) {
    case "bottom": // tip at box edge, arms splay outward (below)
      d = `M ${x - spread} ${y + len} L ${x} ${y} L ${x + spread} ${y + len}`;
      break;
    case "top":
      d = `M ${x - spread} ${y - len} L ${x} ${y} L ${x + spread} ${y - len}`;
      break;
    case "right":
      d = `M ${x + len} ${y - spread} L ${x} ${y} L ${x + len} ${y + spread}`;
      break;
    case "left":
      d = `M ${x - len} ${y - spread} L ${x} ${y} L ${x - len} ${y + spread}`;
      break;
  }
  return svgPath({ d, class: "sx-umlclass-arrowhead" });
}

function renderSourceDiamond(
  kind: "composition" | "aggregation",
  s: UmlClassLayoutEdgeEnd
): string {
  const dw = UMLCLASS_CONST.DIAMOND_W;
  const dh = UMLCLASS_CONST.DIAMOND_H;
  const filled = kind === "composition";
  const cls = filled ? "sx-umlclass-diamond-filled" : "sx-umlclass-diamond-hollow";
  const { x, y, side } = s;
  let points = "";
  switch (side) {
    case "bottom": // near tip on box edge, diamond hangs below
      points = `${x},${y} ${x + dh / 2},${y + dw / 2} ${x},${y + dw} ${x - dh / 2},${y + dw / 2}`;
      break;
    case "top":
      points = `${x},${y} ${x + dh / 2},${y - dw / 2} ${x},${y - dw} ${x - dh / 2},${y - dw / 2}`;
      break;
    case "right":
      points = `${x},${y} ${x + dw / 2},${y - dh / 2} ${x + dw},${y} ${x + dw / 2},${y + dh / 2}`;
      break;
    case "left":
      points = `${x},${y} ${x - dw / 2},${y - dh / 2} ${x - dw},${y} ${x - dw / 2},${y + dh / 2}`;
      break;
  }
  return polygon({ points, class: cls });
}

function renderEndLabel(
  end: UmlClassLayoutEdgeEnd,
  text: string,
  isRole: boolean
): string {
  const gap = UMLCLASS_CONST.END_LABEL_GAP;
  const roleOffset = isRole ? 14 : 0;
  let x = end.x, y = end.y, anchor = "middle";
  switch (end.side) {
    case "bottom":
      y = end.y + gap + 10 + roleOffset; anchor = "middle"; break;
    case "top":
      y = end.y - gap - 2 - roleOffset; anchor = "middle"; break;
    case "right":
      x = end.x + gap + roleOffset; y = end.y - 3; anchor = "start"; break;
    case "left":
      x = end.x - gap - roleOffset; y = end.y - 3; anchor = "end"; break;
  }
  return svgText(
    {
      x,
      y,
      class: "sx-umlclass-edge-label",
      "text-anchor": anchor,
    },
    text
  );
}

// ─── Summary for <desc> ──────────────────────────────────────

function summariseDiagram(ast: UmlClassAst, treeCount: number): string {
  const byKind: Record<string, number> = {};
  for (const c of ast.classifiers) {
    const k = c.isAbstract && c.kind === "class" ? "abstract" : c.kind;
    byKind[k] = (byKind[k] ?? 0) + 1;
  }
  const relsByKind: Record<string, number> = {};
  for (const r of ast.relationships) {
    relsByKind[r.kind] = (relsByKind[r.kind] ?? 0) + 1;
  }
  const classifierStr = Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(", ");
  const relStr = Object.entries(relsByKind).map(([k, n]) => `${n} ${k}`).join(", ");
  const treeStr = treeCount > 0 ? `; ${treeCount} merged inheritance tree${treeCount > 1 ? "s" : ""}` : "";
  const w = ast.warnings.length > 0 ? ` (${ast.warnings.length} warning${ast.warnings.length > 1 ? "s" : ""})` : "";
  return `UML class diagram: ${classifierStr || "no classifiers"}${relStr ? "; " + relStr : ""}${treeStr}${w}.`;
}
