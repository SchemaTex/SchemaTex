import type {
  ErdAttribute,
  ErdCardinality,
  ErdLayoutEdge,
  ErdLayoutEntity,
  ErdLayoutResult,
  RenderConfig,
} from "../../core/types";
import {
  svgRoot,
  group,
  rect,
  path as pathEl,
  line as lineEl,
  circle as circleEl,
  text as textEl,
  title as titleEl,
  desc as descEl,
  el,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { layoutErd, ERD_CONST } from "./layout";
import { parseErd } from "./parser";

// ─── CSS ──────────────────────────────────────────────────────

function buildCss(t: BaseTheme): string {
  return `
.lt-erd { font-family: system-ui, -apple-system, sans-serif; }
.lt-erd-title { font: bold 16px sans-serif; fill: ${t.text}; }
.lt-erd-entity-bg { fill: ${t.bg}; stroke: ${t.stroke}; stroke-width: 1.5; }
.lt-erd-entity-header-bg { fill: ${t.fill}; stroke: ${t.stroke}; stroke-width: 1.5; }
.lt-erd-entity-header { font: 600 13px sans-serif; fill: ${t.text}; text-anchor: middle; dominant-baseline: middle; }
.lt-erd-attr-name { font: 500 12px sans-serif; fill: ${t.text}; dominant-baseline: middle; }
.lt-erd-attr-name-pk { font: 600 12px sans-serif; fill: ${t.text}; text-decoration: underline; dominant-baseline: middle; }
.lt-erd-attr-type { font: 11px monospace; fill: ${t.textMuted}; dominant-baseline: middle; }
.lt-erd-attr-marker { font: 700 10px sans-serif; fill: ${t.bg}; text-anchor: middle; dominant-baseline: middle; letter-spacing: 0.3px; }
.lt-erd-attr-marker-bg-pk { fill: ${t.accent}; stroke: none; }
.lt-erd-attr-marker-bg-fk { fill: ${t.warn}; stroke: none; }
.lt-erd-attr-marker-bg-uk { fill: ${t.positive}; stroke: none; }
.lt-erd-attr-marker-bg-nn { fill: ${t.neutral}; stroke: none; }
.lt-erd-row-divider { stroke: ${t.fillMuted}; stroke-width: 1; }
.lt-erd-edge { fill: none; stroke: ${t.stroke}; stroke-width: 1.5; }
.lt-erd-edge-non-identifying { stroke-dasharray: 5,4; }
.lt-erd-glyph { stroke: ${t.stroke}; stroke-width: 1.5; fill: none; }
.lt-erd-glyph-circle { stroke: ${t.stroke}; stroke-width: 1.5; fill: ${t.bg}; }
.lt-erd-edge-label-bg { fill: ${t.bg}; stroke: ${t.fillMuted}; stroke-width: 1; }
.lt-erd-edge-label { font: 500 10px sans-serif; fill: ${t.textMuted}; text-anchor: middle; dominant-baseline: middle; }
`.trim();
}

// ─── Marker rendering helpers ─────────────────────────────────

function attrMarkers(a: ErdAttribute): { label: string; cls: string }[] {
  const out: { label: string; cls: string }[] = [];
  if (a.pk) out.push({ label: "PK", cls: "lt-erd-attr-marker-bg-pk" });
  if (a.fk) out.push({ label: "FK", cls: "lt-erd-attr-marker-bg-fk" });
  if (a.uk) out.push({ label: "UK", cls: "lt-erd-attr-marker-bg-uk" });
  if (a.notNull && !a.pk) out.push({ label: "*", cls: "lt-erd-attr-marker-bg-nn" });
  return out;
}

function renderEntity(e: ErdLayoutEntity): string {
  const C = ERD_CONST;
  const body: string[] = [];

  // Outer frame.
  body.push(
    rect({
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      rx: 4,
      class: "lt-erd-entity-bg",
    })
  );

  // Header background (top portion only) — drawn as a separate filled rect.
  body.push(
    pathEl({
      d:
        `M ${e.x} ${e.y + 4} ` +
        `Q ${e.x} ${e.y} ${e.x + 4} ${e.y} ` +
        `L ${e.x + e.width - 4} ${e.y} ` +
        `Q ${e.x + e.width} ${e.y} ${e.x + e.width} ${e.y + 4} ` +
        `L ${e.x + e.width} ${e.y + e.headerHeight} ` +
        `L ${e.x} ${e.y + e.headerHeight} Z`,
      class: "lt-erd-entity-header-bg",
    })
  );

  // Header label.
  body.push(
    textEl(
      {
        x: e.x + e.width / 2,
        y: e.y + e.headerHeight / 2,
        class: "lt-erd-entity-header",
      },
      e.entity.name
    )
  );

  // Attribute rows.
  for (let i = 0; i < e.rows.length; i++) {
    const row = e.rows[i]!;
    const a = row.attribute;
    const cy = e.y + row.yCenter;

    // Row divider above (skip first).
    if (i > 0) {
      body.push(
        lineEl({
          x1: e.x,
          y1: e.y + e.headerHeight + i * C.ROW_HEIGHT,
          x2: e.x + e.width,
          y2: e.y + e.headerHeight + i * C.ROW_HEIGHT,
          class: "lt-erd-row-divider",
        })
      );
    }

    // Name (PK gets underline).
    body.push(
      textEl(
        {
          x: e.x + C.ENTITY_PADDING_X,
          y: cy,
          class: a.pk ? "lt-erd-attr-name-pk" : "lt-erd-attr-name",
        },
        a.name
      )
    );

    // Type (right-aligned-ish: drawn at center-ish, before markers).
    const markers = attrMarkers(a);
    const markerW = 26;
    const markerGap = 4;
    const markersBlockW = markers.length * markerW + (markers.length - 1) * markerGap;
    const markersStartX = e.x + e.width - C.ENTITY_PADDING_X - markersBlockW;

    if (a.type) {
      body.push(
        textEl(
          {
            x: markersStartX - 8,
            y: cy,
            class: "lt-erd-attr-type",
            "text-anchor": "end",
          },
          a.type
        )
      );
    }

    // Marker pills.
    for (let j = 0; j < markers.length; j++) {
      const m = markers[j]!;
      const px = markersStartX + j * (markerW + markerGap);
      body.push(
        rect({
          x: px,
          y: cy - 8,
          width: markerW,
          height: 16,
          rx: 3,
          class: m.cls,
        })
      );
      body.push(
        textEl(
          {
            x: px + markerW / 2,
            y: cy + 1,
            class: "lt-erd-attr-marker",
          },
          m.label
        )
      );
    }
  }

  return group(
    {
      class: "lt-erd-entity",
      "data-id": e.entity.id,
    },
    body
  );
}

// ─── Crow's-foot endpoint glyph ───────────────────────────────

/**
 * Produce a small SVG fragment representing the cardinality glyph.
 * Anchor (ax, ay) is the tip of the line on the entity edge; the glyph extends
 * INWARD along the line (toward the bend). `dirX`/`dirY` is the unit vector
 * pointing from the entity along the line (i.e. away from the entity).
 */
function renderGlyph(
  ax: number,
  ay: number,
  dirX: number,
  dirY: number,
  card: ErdCardinality
): string {
  const C = ERD_CONST;
  // Perpendicular vector (rotate dir by 90°).
  const px = -dirY;
  const py = dirX;

  // The bar / circle sits at `barDist` along the line, the crow's-foot fan span.
  const barDist = C.GLYPH_OFFSET; // distance from edge to bar/circle
  const barX = ax + dirX * barDist;
  const barY = ay + dirY * barDist;

  // The "many" foot fans out at the entity edge (inside `barDist`).
  const footTipX = ax;
  const footTipY = ay;
  const footBaseX = ax + dirX * C.GLYPH_FOOT_LEN;
  const footBaseY = ay + dirY * C.GLYPH_FOOT_LEN;

  const parts: string[] = [];

  switch (card) {
    case "one-mandatory": {
      // Single perpendicular bar at barDist.
      parts.push(
        lineEl({
          x1: barX + px * C.GLYPH_BAR_HALF,
          y1: barY + py * C.GLYPH_BAR_HALF,
          x2: barX - px * C.GLYPH_BAR_HALF,
          y2: barY - py * C.GLYPH_BAR_HALF,
          class: "lt-erd-glyph",
        })
      );
      break;
    }
    case "one-optional": {
      // Open circle at barDist.
      parts.push(
        circleEl({
          cx: barX,
          cy: barY,
          r: C.GLYPH_CIRCLE_R,
          class: "lt-erd-glyph-circle",
        })
      );
      break;
    }
    case "many-mandatory": {
      // Bar at barDist + crow's foot fanning to entity edge.
      parts.push(
        lineEl({
          x1: barX + px * C.GLYPH_BAR_HALF,
          y1: barY + py * C.GLYPH_BAR_HALF,
          x2: barX - px * C.GLYPH_BAR_HALF,
          y2: barY - py * C.GLYPH_BAR_HALF,
          class: "lt-erd-glyph",
        })
      );
      // Three legs from footBase to spread points at the entity edge.
      parts.push(
        lineEl({ x1: footBaseX, y1: footBaseY, x2: footTipX, y2: footTipY, class: "lt-erd-glyph" })
      );
      parts.push(
        lineEl({
          x1: footBaseX,
          y1: footBaseY,
          x2: footTipX + px * C.GLYPH_BAR_HALF,
          y2: footTipY + py * C.GLYPH_BAR_HALF,
          class: "lt-erd-glyph",
        })
      );
      parts.push(
        lineEl({
          x1: footBaseX,
          y1: footBaseY,
          x2: footTipX - px * C.GLYPH_BAR_HALF,
          y2: footTipY - py * C.GLYPH_BAR_HALF,
          class: "lt-erd-glyph",
        })
      );
      break;
    }
    case "many-optional": {
      // Open circle at barDist + crow's foot.
      parts.push(
        circleEl({
          cx: barX,
          cy: barY,
          r: C.GLYPH_CIRCLE_R,
          class: "lt-erd-glyph-circle",
        })
      );
      parts.push(
        lineEl({ x1: footBaseX, y1: footBaseY, x2: footTipX, y2: footTipY, class: "lt-erd-glyph" })
      );
      parts.push(
        lineEl({
          x1: footBaseX,
          y1: footBaseY,
          x2: footTipX + px * C.GLYPH_BAR_HALF,
          y2: footTipY + py * C.GLYPH_BAR_HALF,
          class: "lt-erd-glyph",
        })
      );
      parts.push(
        lineEl({
          x1: footBaseX,
          y1: footBaseY,
          x2: footTipX - px * C.GLYPH_BAR_HALF,
          y2: footTipY - py * C.GLYPH_BAR_HALF,
          class: "lt-erd-glyph",
        })
      );
      break;
    }
  }

  return parts.join("");
}

function sideToOutwardDir(side: "left" | "right" | "top" | "bottom"): { x: number; y: number } {
  switch (side) {
    case "right":
      return { x: 1, y: 0 };
    case "left":
      return { x: -1, y: 0 };
    case "bottom":
      return { x: 0, y: 1 };
    case "top":
      return { x: 0, y: -1 };
  }
}

// ─── Edge rendering ───────────────────────────────────────────

function renderEdge(edge: ErdLayoutEdge): string {
  const parts: string[] = [];
  parts.push(
    pathEl({
      d: edge.path,
      class: edge.ref.identifying ? "lt-erd-edge" : "lt-erd-edge lt-erd-edge-non-identifying",
    })
  );

  const fromDir = sideToOutwardDir(edge.fromAnchor.side);
  const toDir = sideToOutwardDir(edge.toAnchor.side);

  parts.push(
    renderGlyph(
      edge.fromAnchor.x,
      edge.fromAnchor.y,
      fromDir.x,
      fromDir.y,
      edge.ref.fromCard
    )
  );
  parts.push(
    renderGlyph(
      edge.toAnchor.x,
      edge.toAnchor.y,
      toDir.x,
      toDir.y,
      edge.ref.toCard
    )
  );

  if (edge.ref.label && edge.labelAt) {
    const label = edge.ref.label;
    const w = label.length * 6 + 14;
    parts.push(
      rect({
        x: edge.labelAt.x - w / 2,
        y: edge.labelAt.y - 9,
        width: w,
        height: 16,
        rx: 3,
        class: "lt-erd-edge-label-bg",
      })
    );
    parts.push(
      textEl(
        {
          x: edge.labelAt.x,
          y: edge.labelAt.y,
          class: "lt-erd-edge-label",
        },
        label
      )
    );
  }

  return group({ class: "lt-erd-edge-group" }, parts);
}

// ─── Top-level render ─────────────────────────────────────────

export function renderErdAst(
  result: ErdLayoutResult,
  themeName: "default" | "monochrome" | "dark" = "default"
): string {
  const theme = resolveBaseTheme(themeName);
  const { entities, edges, width, height, ast } = result;

  const cssBlock = el("style", {}, buildCss(theme));
  const titleNode = titleEl(ast.title ?? "Schematex ERD");
  const descNode = descEl(
    `Entity-Relationship Diagram with ${entities.length} entities and ${edges.length} relationships.`
  );

  const titleSvgBlock = ast.title
    ? textEl(
        {
          x: 12,
          y: 18,
          class: "lt-erd-title",
        },
        ast.title
      )
    : "";

  const offset = ast.title ? 28 : 0;

  const entitiesG = group(
    { class: "lt-erd-entities", transform: `translate(0, ${offset})` },
    entities.map(renderEntity)
  );
  const edgesG = group(
    { class: "lt-erd-edges", transform: `translate(0, ${offset})` },
    edges.map(renderEdge)
  );

  return svgRoot(
    {
      width,
      height: height + offset,
      viewBox: `0 0 ${width} ${height + offset}`,
      class: "lt-erd",
    },
    [titleNode, descNode, cssBlock, titleSvgBlock, edgesG, entitiesG]
  );
}

export function renderErd(
  text: string,
  config?: RenderConfig
): string {
  const ast = parseErd(text);
  const layout = layoutErd(ast);
  const themeName = ((config?.theme as "default" | "monochrome" | "dark") ?? "default");
  return renderErdAst(layout, themeName);
}

// Suppress unused-import warning for escapeXml; kept for future label escaping.
void escapeXml;
