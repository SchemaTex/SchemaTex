/**
 * Venn / Euler SVG renderer.
 *
 * Produces a semantic SVG:
 *   - `<title>` + `<desc>` for accessibility
 *   - CSS class hierarchy `.schematex-venn-*`
 *   - One `<circle>` or `<ellipse>` per set, grouped under a layer that
 *     can apply `mix-blend-mode: multiply` for natural overlap blending.
 *   - `<text>` per region label, optional `<path>` leader for externalised
 *     labels.
 */

import type { VennAST, VennLayoutResult, VennShape } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  circle as circleEl,
  text as textEl,
  title as titleEl,
  desc as descEl,
  path as pathEl,
} from "../../core/svg";
import { resolveVennTheme } from "../../core/theme";
import { parseVennDSL } from "./parser";
import { layoutVenn } from "./layout";

function ellipseEl(attrs: Record<string, string | number | undefined>): string {
  return el("ellipse", attrs);
}

function idSlug(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, "_");
}

function buildCss(tokens: ReturnType<typeof resolveVennTheme>): string {
  return `
.schematex-venn { background: ${tokens.bg}; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.schematex-venn-title { font: 600 16px sans-serif; fill: ${tokens.text}; }
.schematex-venn-set { stroke: ${tokens.vennSetStroke}; stroke-width: 1.25; }
.schematex-venn-blend-multiply { mix-blend-mode: multiply; }
.schematex-venn-blend-screen { mix-blend-mode: screen; }
.schematex-venn-setlabel { font: 600 13px sans-serif; fill: ${tokens.text}; }
.schematex-venn-label { font: 500 12px sans-serif; fill: ${tokens.vennLabelColor}; dominant-baseline: central; text-anchor: middle; }
.schematex-venn-label-external { font: 500 11px sans-serif; fill: ${tokens.vennLabelColor}; dominant-baseline: central; }
.schematex-venn-leader { stroke: ${tokens.vennLeaderColor}; stroke-width: 0.7; fill: none; opacity: 0.8; }
.schematex-venn-leader-dot { fill: ${tokens.vennLeaderColor}; }
`.trim();
}

function renderShape(
  shape: VennShape,
  index: number,
  color: string,
  opacity: number,
  setLabel: string
): string {
  const classes = `schematex-venn-set schematex-venn-set-${index}`;
  const hoverTitle = titleEl(`Set ${setLabel}`);
  if (shape.kind === "circle") {
    return el(
      "g",
      { class: `schematex-venn-set-group schematex-venn-set-group-${index}` },
      [
        circleEl({
          cx: shape.cx,
          cy: shape.cy,
          r: shape.r,
          class: classes,
          fill: color,
          "fill-opacity": opacity,
          "data-set-id": idSlug(shape.id),
        }),
        hoverTitle,
      ]
    );
  }
  return el(
    "g",
    { class: `schematex-venn-set-group schematex-venn-set-group-${index}` },
    [
      ellipseEl({
        cx: shape.cx,
        cy: shape.cy,
        rx: shape.rx,
        ry: shape.ry,
        transform: `rotate(${shape.rotation} ${shape.cx} ${shape.cy})`,
        class: classes,
        fill: color,
        "fill-opacity": opacity,
        "data-set-id": idSlug(shape.id),
      }),
      hoverTitle,
    ]
  );
}

export function renderVennAST(
  ast: VennAST,
  options: { theme?: string } = {}
): string {
  const layout = layoutVenn(ast);
  return renderVennLayout(ast, layout, options);
}

export function renderVennLayout(
  ast: VennAST,
  layout: VennLayoutResult,
  options: { theme?: string } = {}
): string {
  const tokens = resolveVennTheme(options.theme ?? "default");
  const effectiveBlend =
    ast.config.blendMode === "none" ? "none" : ast.config.blendMode || tokens.vennBlendMode;
  const css = buildCss(tokens);

  // Shape rendering.
  const colors = tokens.vennSetColors;
  const shapeEls = layout.shapes.map((shape, i) => {
    const color = ast.sets[i]?.color ?? colors[i % colors.length] ?? "#4E79A7";
    return renderShape(shape, i, color, tokens.vennSetOpacity, ast.sets[i]?.label ?? shape.id);
  });

  const shapesGroup = group(
    {
      class: `schematex-venn-shapes ${effectiveBlend !== "none" ? `schematex-venn-blend-${effectiveBlend}` : ""}`.trim(),
      ...(effectiveBlend !== "none" ? { style: `mix-blend-mode: ${effectiveBlend}` } : {}),
    },
    shapeEls
  );

  // Set titles.
  const setLabelEls = layout.setLabels.map((s) =>
    textEl(
      {
        x: s.x,
        y: s.y,
        class: "schematex-venn-setlabel",
        "text-anchor": s.anchor,
      },
      s.label
    )
  );

  // Region labels and optional leader lines.
  const labelEls: string[] = [];
  const leaderEls: string[] = [];
  for (const label of layout.labels) {
    const cls = label.external
      ? "schematex-venn-label schematex-venn-label-external"
      : "schematex-venn-label";
    labelEls.push(
      textEl(
        {
          x: label.x,
          y: label.y,
          class: cls,
          "text-anchor": label.anchor ?? "middle",
          "data-region": label.sets.join("-"),
        },
        label.label
      )
    );
    if (label.external && label.leader) {
      leaderEls.push(
        pathEl({
          d: `M ${label.leader.x1} ${label.leader.y1} L ${label.leader.x2} ${label.leader.y2}`,
          class: "schematex-venn-leader",
          "aria-hidden": "true",
        })
      );
      leaderEls.push(
        circleEl({
          cx: label.leader.x1,
          cy: label.leader.y1,
          r: 1.5,
          class: "schematex-venn-leader-dot",
          "aria-hidden": "true",
        })
      );
    }
  }

  // Title block.
  const titleBlock = layout.title
    ? textEl(
        {
          x: layout.title.x,
          y: layout.title.y,
          class: "schematex-venn-title",
          "text-anchor": "middle",
        },
        layout.title.text
      )
    : "";

  const nonEmptyRegions = ast.regions.length;
  const description =
    `Venn/Euler diagram${ast.title ? ` "${ast.title}"` : ""}: ${ast.sets.length} sets, ${nonEmptyRegions} regions.`;

  const body = [
    titleEl(ast.title ?? "Venn diagram"),
    descEl(description),
    el("style", {}, css),
    titleBlock,
    shapesGroup,
    group({ class: "schematex-venn-leaders" }, leaderEls),
    group({ class: "schematex-venn-setlabels" }, setLabelEls),
    group({ class: "schematex-venn-labels" }, labelEls),
  ];

  return svgRoot(
    {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      width: layout.width,
      height: layout.height,
      class: "schematex-venn",
      role: "img",
    },
    body
  );
}

export function renderVenn(text: string, options: { theme?: string } = {}): string {
  const ast = parseVennDSL(text);
  return renderVennAST(ast, options);
}
