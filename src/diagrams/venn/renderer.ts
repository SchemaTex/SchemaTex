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

import type { RenderConfig, SourceRange, VennAST, VennLayoutResult, VennShape } from "../../core/types";
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
import { createSourceLocator } from "../../core/source-range";

interface GeometryRange {
  range: SourceRange;
  prefix?: string;
  suffix?: string;
}

interface SetGeometryRanges {
  center: GeometryRange;
  radius: GeometryRange;
}

function ellipseEl(attrs: Record<string, string | number | undefined>): string {
  return el("ellipse", attrs);
}

function idSlug(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, "_");
}

function buildCss(tokens: ReturnType<typeof resolveVennTheme>): string {
  return `
.schematex-venn { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.schematex-venn-title { font: 600 16px sans-serif; fill: ${tokens.text}; }
.schematex-venn-set { stroke: ${tokens.vennSetStroke}; stroke-width: 1.25; }
.schematex-venn-blend-multiply { mix-blend-mode: multiply; }
.schematex-venn-blend-screen { mix-blend-mode: screen; }
.schematex-venn-setlabel { font: 600 13px sans-serif; fill: ${tokens.text}; }
.schematex-venn-label { font: 500 12px sans-serif; fill: ${tokens.vennLabelColor}; dominant-baseline: central; text-anchor: middle; }
.schematex-venn-label-external { font: 500 11px sans-serif; fill: ${tokens.vennLabelColor}; dominant-baseline: central; }
.schematex-venn-leader { stroke: ${tokens.vennLeaderColor}; stroke-width: 0.7; fill: none; opacity: 0.8; }
.schematex-venn-leader-dot { fill: ${tokens.vennLeaderColor}; }
.schematex-venn-handle { fill: #fff; stroke: #2563eb; stroke-width: 2; vector-effect: non-scaling-stroke; }
`.trim();
}

function geometryRanges(source: string | undefined): Map<string, SetGeometryRanges> {
  const result = new Map<string, SetGeometryRanges>();
  if (!source) return result;
  const locator = createSourceLocator(source);
  const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
  let offset = 0;
  for (const rawLine of source.split(/\n/)) {
    const line = rawLine.replace(/\r$/, "");
    const declaration = /^\s*set\s+([A-Za-z][\w-]*)\b/i.exec(line);
    if (!declaration) {
      offset += rawLine.length + 1;
      continue;
    }
    const id = declaration[1]!;
    const at = new RegExp(`\\bat\\s*:\\s*\\(\\s*(${number})\\s*,\\s*(${number})\\s*\\)`, "i").exec(line);
    const radius = new RegExp(`\\bradius\\s*:\\s*(${number})`, "i").exec(line);
    const closeBracket = line.lastIndexOf("]");
    const openBracket = closeBracket >= 0 ? line.lastIndexOf("[", closeBracket) : -1;
    const insertAt = closeBracket >= 0 ? closeBracket : line.length;
    const hasProps = openBracket >= 0 && line.slice(openBracket + 1, closeBracket).trim().length > 0;
    const center = at
      ? (() => {
          const first = offset + at.index + at[0].indexOf(at[1]!);
          const second = offset + at.index + at[0].lastIndexOf(at[2]!);
          return { range: locator.range(first, second + at[2]!.length) };
        })()
      : {
          range: locator.range(offset + insertAt, offset + insertAt),
          prefix: closeBracket >= 0 ? `${hasProps ? ", " : ""}at: (` : " [at: (",
          suffix: closeBracket >= 0 ? ")" : ")]",
        };
    const radiusRange = radius
      ? (() => {
          const value = offset + radius.index + radius[0].lastIndexOf(radius[1]!);
          return { range: locator.range(value, value + radius[1]!.length) };
        })()
      : {
          range: locator.range(offset + insertAt, offset + insertAt),
          prefix: closeBracket >= 0 ? `${hasProps ? ", " : ""}radius: ` : " [radius: ",
          suffix: closeBracket >= 0 ? "" : "]",
        };
    result.set(id, { center, radius: radiusRange });
    offset += rawLine.length + 1;
  }
  return result;
}

function renderShape(
  shape: VennShape,
  index: number,
  color: string,
  opacity: number,
  setLabel: string,
  sceneKey?: string,
): string {
  const classes = `schematex-venn-set schematex-venn-set-${index}`;
  const hoverTitle = titleEl(`Set ${setLabel}`);
  if (shape.kind === "circle") {
    return el(
      "g",
      {
        class: `schematex-venn-set-group schematex-venn-set-group-${index}`,
        ...(sceneKey ? { "data-sx-key": sceneKey } : {}),
      },
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
    {
      class: `schematex-venn-set-group schematex-venn-set-group-${index}`,
      ...(sceneKey ? { "data-sx-key": sceneKey } : {}),
    },
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
  options: RenderConfig | { theme?: string } = {}
): string {
  const layout = layoutVenn(ast);
  return renderVennLayout(ast, layout, options);
}

export function renderVennLayout(
  ast: VennAST,
  layout: VennLayoutResult,
  options: RenderConfig | { theme?: string } = {}
): string {
  const tokens = resolveVennTheme(options.theme ?? "default");
  const effectiveBlend =
    ast.config.blendMode === "none" ? "none" : ast.config.blendMode || tokens.vennBlendMode;
  const css = buildCss(tokens);

  // Shape rendering.
  const colors = tokens.vennSetColors;
  const config = options as RenderConfig;
  const authoredGeometry = geometryRanges(config.__source);
  const handleEls: string[] = [];
  const shapeEls = layout.shapes.map((shape, i) => {
    const color = ast.sets[i]?.color ?? colors[i % colors.length] ?? "#4E79A7";
    const ranges = authoredGeometry.get(shape.id);
    const sceneKey = ranges && config.__scene ? `venn:set:${shape.id}` : undefined;
    if (sceneKey && ranges && config.__scene) {
      const halfWidth = shape.kind === "circle" ? shape.r : shape.rx;
      const halfHeight = shape.kind === "circle" ? shape.r : shape.ry;
      config.__scene.push({
        key: sceneKey,
        kind: "node",
        semanticId: shape.id,
        label: ast.sets[i]?.label ?? shape.id,
        bbox: {
          x: shape.cx - halfWidth,
          y: shape.cy - halfHeight,
          width: halfWidth * 2,
          height: halfHeight * 2,
        },
        positionSource: {
          kind: "point",
          range: ranges.center.range,
          x: shape.cx / layout.width,
          y: shape.cy / layout.height,
          unitsPerSvgX: 1 / layout.width,
          unitsPerSvgY: 1 / layout.height,
          prefix: ranges.center.prefix,
          suffix: ranges.center.suffix,
        },
        editable: { label: false, position: "free" },
      });
      const radius = shape.kind === "circle" ? shape.r : shape.rx;
      const handleKey = `venn:set:${shape.id}:radius`;
      config.__scene.push({
        key: handleKey,
        kind: "handle",
        semanticId: `${shape.id}:radius`,
        bbox: { x: shape.cx + radius - 6, y: shape.cy - 6, width: 12, height: 12 },
        positionSource: {
          kind: "scalar",
          range: ranges.radius.range,
          value: radius / Math.min(layout.width, layout.height),
          unitsPerSvgX: 1 / Math.min(layout.width, layout.height),
          min: 0.04,
          max: 0.8,
          prefix: ranges.radius.prefix,
          suffix: ranges.radius.suffix,
        },
        editable: { label: false, position: "move-x" },
      });
      handleEls.push(circleEl({
        cx: shape.cx + radius,
        cy: shape.cy,
        r: 5,
        class: "schematex-venn-handle",
        "data-sx-key": handleKey,
        "aria-label": `Resize set ${shape.id}`,
      }));
    }
    return renderShape(shape, i, color, tokens.vennSetOpacity, ast.sets[i]?.label ?? shape.id, sceneKey);
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
    group({ class: "schematex-venn-handles" }, handleEls),
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

export function renderVenn(text: string, options: RenderConfig | { theme?: string } = {}): string {
  const ast = parseVennDSL(text);
  return renderVennAST(ast, options);
}
