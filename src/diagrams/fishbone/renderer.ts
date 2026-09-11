import type { FishboneAST, RenderConfig, SceneItem } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  line as lineEl,
  text as textEl,
  title as titleEl,
  desc as descEl,
  escapeXml,
} from "../../core/svg";
import { parseFishboneDSL } from "./parser";
import { FB_CONST, layoutFishbone, type FishboneLayoutResult } from "./layout";
import { resolveFishboneTheme } from "../../core/theme";
import { resolveSceneTitle } from "../../core/title-scene";

const CSS = `
.sx-fb { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-fb-title { font: 700 16px sans-serif; fill: #111; }
.sx-fb-spine { stroke-width: 4; stroke-linecap: butt; fill: none; }
.sx-fb-tail, .sx-fb-head { stroke-width: 2.5; stroke-linejoin: round; }
.sx-fb-head-text { font: 600 15.5px sans-serif; text-anchor: middle; }
.sx-fb-effect-eyebrow { font: 600 10px sans-serif; text-anchor: middle; letter-spacing: 1.8px; }
.sx-fb-rib { stroke-width: 1.5; fill: none; }
.sx-fb-header-text { font: 700 14px sans-serif; text-anchor: middle; dominant-baseline: central; }
.sx-fb-branch { stroke-width: 1; fill: none; }
.sx-fb-cause-label { font: 400 12px sans-serif; fill: #3d3d3a; dominant-baseline: central; }
.sx-fb-sub-tick { stroke-width: 0.8; fill: none; }
.sx-fb-sub-label { font: 400 11px sans-serif; fill: #555; dominant-baseline: central; }
`.trim();

function darken(hex: string, amount: number): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const rr = Math.round(r * (1 - amount));
  const gg = Math.round(g * (1 - amount));
  const bb = Math.round(b * (1 - amount));
  return `#${[rr, gg, bb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function multilineText(attrs: Record<string, string | number | undefined>, lines: string[], lineHeight: number): string {
  return el("text", attrs, lines.map((line, index) =>
    el("tspan", { x: attrs.x, y: Number(attrs.y) + index * lineHeight }, escapeXml(line))));
}

function renderHead(layout: FishboneLayoutResult, ast: FishboneAST, scene?: SceneItem[]): string {
  const h = layout.head;
  // Coordinates relative to the accepted 274 × 232 outline.
  const x = (offset: number) => h.x + offset;
  const y = (offset: number) => h.y + offset * h.h / 232;
  const textX = x(144);
  const textY = h.y + 10 - (h.lines.length - 1) * FB_CONST.EFFECT_LINE_HEIGHT / 2;
  const key = "label:effect";
  scene?.push({
    key, kind: "label", label: h.label, sourceRange: ast.effectSourceRange,
    bbox: { x: h.x, y: h.y - h.h / 2, width: h.w, height: h.h },
    editable: { label: ast.effectSourceRange !== undefined, position: "none" },
  });
  return group({ class: "sx-fb-head-g" }, [
    el("path", {
      d: `M ${x(274)} ${y(0)} C ${x(274)} ${y(-38)}, ${x(192)} ${y(-116)}, ${x(68)} ${y(-116)} ` +
        `C ${x(16)} ${y(-116)}, ${x(0)} ${y(-80)}, ${x(0)} ${y(0)} ` +
        `C ${x(0)} ${y(80)}, ${x(16)} ${y(116)}, ${x(68)} ${y(116)} ` +
        `C ${x(192)} ${y(116)}, ${x(274)} ${y(38)}, ${x(274)} ${y(0)} Z`,
      class: "sx-fb-head", fill: "#f8fafc", stroke: "#1e293b", "stroke-width": 2.5,
    }),
    el("path", {
      d: `M ${x(26)} ${y(-102)} C ${x(68)} ${y(-46)}, ${x(68)} ${y(46)}, ${x(26)} ${y(102)}`,
      class: "sx-fb-gill", fill: "none", stroke: "#cbd5e1", "stroke-width": 1.6, "stroke-linecap": "round",
    }),
    textEl({ x: textX, y: textY - 30, class: "sx-fb-effect-eyebrow", fill: "#64748b" }, "EFFECT"),
    multilineText(
      {
        x: textX,
        y: textY,
        class: "sx-fb-head-text",
        fill: "#0f172a",
        "data-sx-key": scene && ast.effectSourceRange ? key : undefined,
        "data-sx-role": scene && ast.effectSourceRange ? "label" : undefined,
      },
      h.lines, FB_CONST.EFFECT_LINE_HEIGHT
    ),
  ]);
}

function renderRibs(layout: FishboneLayoutResult, scene?: SceneItem[]): string {
  const parts: string[] = [];
  for (const rib of layout.ribs) {
    const ribKey = `rib:${rib.index}:label`;
    scene?.push({
      key: ribKey, kind: "label", label: rib.label, sourceRange: rib.sourceRange,
      bbox: { x: rib.headerX, y: rib.headerY, width: rib.headerW, height: rib.headerH },
      editable: { label: rib.sourceRange !== undefined, position: "none" },
    });
    const headerTextFill = darken(rib.color, 0.3);

    // One category bone runs directly from the spine to its outer tip.
    parts.push(
      lineEl({
        x1: rib.spineX,
        y1: rib.spineY,
        x2: rib.endX,
        y2: rib.endY,
        class: "sx-fb-rib",
        "data-category-index": rib.index,
        stroke: rib.color,
      })
    );

    parts.push(
      textEl(
        {
          x: rib.headerX + rib.headerW / 2,
          y: rib.headerY + rib.headerH / 2,
          class: "sx-fb-header-text",
          fill: headerTextFill,
          "data-sx-key": scene && rib.sourceRange ? ribKey : undefined,
          "data-sx-role": scene && rib.sourceRange ? "label" : undefined,
        },
        rib.label
      )
    );

    // Branches + labels
    for (const cause of rib.causes) {
      const causeKey = `rib:${rib.index}:cause:${cause.slotIndex}`;
      scene?.push({
        key: causeKey, kind: "label", label: cause.label, sourceRange: cause.sourceRange,
        editable: { label: cause.sourceRange !== undefined, position: "none" },
      });
      parts.push(
        lineEl({
          x1: cause.ribX,
          y1: cause.ribY,
          x2: cause.branchX,
          y2: cause.branchY,
          class: "sx-fb-branch",
          "data-category-index": rib.index,
          "data-cause-index": cause.slotIndex,
          stroke: rib.color,
        })
      );
      parts.push(
        multilineText(
          {
            x: cause.labelX,
            y: cause.labelY,
            class: "sx-fb-cause-label",
            "text-anchor": cause.labelAnchor,
            "data-sx-key": scene && cause.sourceRange ? causeKey : undefined,
            "data-sx-role": scene && cause.sourceRange ? "label" : undefined,
          },
          cause.labelLines, FB_CONST.LINE_HEIGHT
        )
      );

      // A shared stem connects every shorter sub-cause rib to its parent branch.
      const lastSub = cause.subCauses.at(-1);
      if (lastSub) {
        parts.push(lineEl({ x1: lastSub.tickX1, y1: cause.branchY,
          x2: lastSub.tickX1, y2: lastSub.tickY, class: "sx-fb-sub-stem", stroke: rib.color,
          "data-category-index": rib.index, "data-cause-index": cause.slotIndex }));
      }
      // Sub-causes (Level 2)
      for (let subIndex = 0; subIndex < cause.subCauses.length; subIndex++) {
        const sub = cause.subCauses[subIndex]!;
        const subKey = `${causeKey}:sub:${subIndex}`;
        scene?.push({
          key: subKey, kind: "label", label: sub.label, sourceRange: sub.sourceRange,
          editable: { label: sub.sourceRange !== undefined, position: "none" },
        });
        parts.push(
          lineEl({
            x1: sub.tickX1,
            y1: sub.tickY,
            x2: sub.tickX2,
            y2: sub.tickY,
            class: "sx-fb-sub-tick",
            "data-category-index": rib.index,
            "data-cause-index": cause.slotIndex,
            stroke: rib.color,
        })
        );
        parts.push(
          multilineText(
            {
              x: sub.x,
              y: sub.y,
              class: "sx-fb-sub-label",
              "text-anchor": sub.anchor,
              "data-sx-key": scene && sub.sourceRange ? subKey : undefined,
              "data-sx-role": scene && sub.sourceRange ? "label" : undefined,
            },
            sub.lines, FB_CONST.SUB_LINE_HEIGHT
          )
        );
      }
    }
  }
  return group({ class: "sx-fb-ribs" }, parts);
}

export function renderFishboneAST(ast: FishboneAST, options?: RenderConfig): string {
  const themeName = options?.theme ?? ast.metadata?.["theme"] ?? "default";
  const tokens = resolveFishboneTheme(themeName);
  const layout = layoutFishbone(ast, { palette: tokens.palette });
  const ltr = layout.orientation !== "rtl";
  const headX = layout.head.x;
  const spineY = layout.spineY;
  const arrow = el("path", {
    d: `M ${headX - 6} ${spineY - 12} L ${headX + 36} ${spineY} L ${headX - 6} ${spineY + 12} Z`,
    class: "sx-fb-spine-arrow", fill: "#1e293b",
  });

  const spine = lineEl({
    x1: layout.spineStartX,
    y1: layout.spineY,
    x2: layout.spineEndX,
    y2: layout.spineY,
    class: "sx-fb-spine",
    stroke: "#1e293b",
    "stroke-width": 4,
  });

  const tailX = layout.spineStartX;
  const tail = el("path", {
    d: `M ${tailX - 2} ${spineY - 13} C ${tailX - 42} ${spineY - 32}, ${tailX - 86} ${spineY - 49}, ${tailX - 120} ${spineY - 58} ` +
      `C ${tailX - 112} ${spineY - 40}, ${tailX - 100} ${spineY - 18}, ${tailX - 86} ${spineY} ` +
      `C ${tailX - 100} ${spineY + 18}, ${tailX - 112} ${spineY + 40}, ${tailX - 120} ${spineY + 58} ` +
      `C ${tailX - 86} ${spineY + 49}, ${tailX - 42} ${spineY + 32}, ${tailX - 2} ${spineY + 13} ` +
      `C ${tailX + 5} ${spineY + 7}, ${tailX + 5} ${spineY - 7}, ${tailX - 2} ${spineY - 13} Z`,
    class: "sx-fb-tail", fill: "#f8fafc", stroke: "#1e293b", "stroke-width": 2.5,
  });

  const titleBlock = layout.title
    ? (() => {
        const title = resolveSceneTitle(layout.title!, ast.titleSourceRange, layout.width / 2, FB_CONST.TITLE_BASELINE, options);
        return textEl({ x: title.x, y: title.y, class: "sx-fb-title", "text-anchor": "middle", ...title.attrs }, layout.title!);
      })()
    : "";

  const head = renderHead(layout, ast, options?.__scene);
  const ribs = renderRibs(layout, options?.__scene);

  const inner = [
    titleEl(layout.title ? `${layout.title} — Fishbone diagram` : "Fishbone diagram"),
    descEl(
      `Ishikawa cause-and-effect diagram. Effect: ${ast.effect}. ${ast.majors.length} categories.`
    ),
    el("style", {}, CSS),
    titleBlock,
    tail,
    head,
    spine,
    arrow,
    ribs,
  ];

  // For RTL (head on left), mirror horizontally via transform.
  if (!ltr) {
    const mirrored = group(
      {
        transform: `translate(${layout.width} 0) scale(-1 1)`,
      },
      [tail, head, spine, arrow, ribs]
    );
    return svgRoot(
      {
        viewBox: `0 0 ${layout.width} ${layout.height}`,
        width: layout.width,
        height: layout.height,
        class: "sx-fb",
        role: "img",
      },
      [
        titleEl(layout.title ?? "Fishbone"),
        descEl(`Ishikawa diagram (head-left). Effect: ${ast.effect}.`),
        el("style", {}, CSS),
        titleBlock,
        mirrored,
      ]
    );
  }

  return svgRoot(
    {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      width: layout.width,
      height: layout.height,
      class: "sx-fb",
      role: "img",
    },
    inner
  );
}

export function renderFishbone(text: string, options?: RenderConfig): string {
  const ast = parseFishboneDSL(text);
  return renderFishboneAST(ast, options);
}
