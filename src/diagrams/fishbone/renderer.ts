import type { FishboneAST } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  line as lineEl,
  rect,
  text as textEl,
  polygon,
  title as titleEl,
  desc as descEl,
  defs,
} from "../../core/svg";
import { parseFishboneDSL } from "./parser";
import { layoutFishbone, type FishboneLayoutResult, type FishboneBBox } from "./layout";
import { resolveFishboneTheme } from "../../core/theme";

const CSS = `
.sx-fb { background: var(--schematex-fb-bg, #ffffff); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.sx-fb-title { font: 600 16px sans-serif; fill: #111; }
.sx-fb-spine { stroke: var(--schematex-fb-spine, #141413); stroke-width: 2; stroke-linecap: butt; fill: none; }
.sx-fb-tail { stroke: var(--schematex-fb-spine, #141413); stroke-width: 2; stroke-linecap: round; fill: none; }
.sx-fb-head { stroke-width: 0.5; }
.sx-fb-head-text { font: 500 14px sans-serif; text-anchor: middle; dominant-baseline: central; }
.sx-fb-rib { stroke-width: 1.5; fill: none; }
.sx-fb-header-pill { stroke-width: 0.6; }
.sx-fb-header-text { font: 500 14px sans-serif; text-anchor: middle; dominant-baseline: central; }
.sx-fb-branch { stroke-width: 0.8; opacity: 0.6; fill: none; }
.sx-fb-cause-label { font: 400 12px sans-serif; fill: #3d3d3a; dominant-baseline: central; }
.sx-fb-sub-tick { stroke-width: 0.7; opacity: 0.5; fill: none; }
.sx-fb-sub-label { font: 400 11px sans-serif; fill: #555; dominant-baseline: central; }
`.trim();

function lighten(hex: string, amount: number): string {
  // amount in [0, 1]; shifts toward white
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const rr = Math.round(r + (255 - r) * amount);
  const gg = Math.round(g + (255 - g) * amount);
  const bb = Math.round(b + (255 - b) * amount);
  return `#${[rr, gg, bb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

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

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function buildMask(id: string, w: number, h: number, bboxes: FishboneBBox[]): string {
  const base = rect({ x: 0, y: 0, width: w, height: h, fill: "white" });
  const holes = bboxes
    .map((b) =>
      rect({
        x: b.x,
        y: b.y,
        width: b.w,
        height: b.h,
        fill: "black",
        rx: 2,
      })
    )
    .join("\n");
  return el("mask", { id, maskUnits: "userSpaceOnUse" }, [base, holes]);
}

function renderHead(layout: FishboneLayoutResult, ltr: boolean): string {
  const h = layout.head;
  const tipX = ltr ? h.tipX : h.x - (h.tipX - h.x);
  const leftX = ltr ? h.x : h.x;
  const rightX = ltr ? h.tipX : tipX;
  // Polygon pointing toward head direction
  const points = ltr
    ? `${leftX},${h.y - h.h / 2} ${leftX},${h.y + h.h / 2} ${rightX},${h.y}`
    : `${rightX},${h.y - h.h / 2} ${rightX},${h.y + h.h / 2} ${tipX},${h.y}`;
  const fill = "#faece7";
  const stroke = "#993c1d";
  // Bias text toward the wide base (35% from base, 65% from tip) so it reads
  // balanced inside the tapering triangle rather than shifted toward the tip.
  const textX = ltr ? leftX + h.w * 0.38 : rightX - h.w * 0.38;
  return group({ class: "sx-fb-head-g" }, [
    polygon({
      points,
      class: "sx-fb-head",
      fill,
      stroke,
    }),
    textEl(
      {
        x: textX,
        y: h.y,
        class: "sx-fb-head-text",
        fill: darken(stroke, 0.3),
      },
      h.label
    ),
  ]);
}

function renderRibs(layout: FishboneLayoutResult, maskUrl: string): string {
  const parts: string[] = [];
  for (const rib of layout.ribs) {
    const pillFill = lighten(rib.color, 0.82);
    const pillStroke = rib.color;
    const headerTextFill = darken(rib.color, 0.3);

    // Rib line (with mask to punch out text overlaps)
    parts.push(
      lineEl({
        x1: rib.spineX,
        y1: rib.spineY,
        x2: rib.endX,
        y2: rib.endY,
        class: "sx-fb-rib",
        stroke: rib.color,
        mask: maskUrl,
      })
    );

    // Extend the rib line to the pill center along the same slope.
    parts.push(
      lineEl({
        x1: rib.endX,
        y1: rib.endY,
        x2: rib.headerX + rib.headerW / 2,
        y2: rib.headerY + rib.headerH / 2,
        class: "sx-fb-rib",
        stroke: rib.color,
      })
    );

    // Header pill
    parts.push(
      rect({
        x: rib.headerX,
        y: rib.headerY,
        width: rib.headerW,
        height: rib.headerH,
        rx: 8,
        class: "sx-fb-header-pill",
        fill: pillFill,
        stroke: pillStroke,
      })
    );
    parts.push(
      textEl(
        {
          x: rib.headerX + rib.headerW / 2,
          y: rib.headerY + rib.headerH / 2,
          class: "sx-fb-header-text",
          fill: headerTextFill,
        },
        rib.label
      )
    );

    // Branches + labels
    for (const cause of rib.causes) {
      parts.push(
        lineEl({
          x1: cause.ribX,
          y1: cause.ribY,
          x2: cause.branchX,
          y2: cause.branchY,
          class: "sx-fb-branch",
          stroke: rib.color,
          mask: maskUrl,
        })
      );
      parts.push(
        textEl(
          {
            x: cause.labelX,
            y: cause.labelY,
            class: "sx-fb-cause-label",
            "text-anchor": cause.labelAnchor,
          },
          cause.label
        )
      );

      // Sub-causes (Level 2)
      for (const sub of cause.subCauses) {
        parts.push(
          lineEl({
            x1: sub.tickX1,
            y1: sub.tickY,
            x2: sub.tickX2,
            y2: sub.tickY,
            class: "sx-fb-sub-tick",
            stroke: rib.color,
          })
        );
        parts.push(
          textEl(
            {
              x: sub.x,
              y: sub.y,
              class: "sx-fb-sub-label",
              "text-anchor": sub.anchor,
            },
            sub.label
          )
        );
      }
    }
  }
  return group({ class: "sx-fb-ribs" }, parts);
}

export function renderFishboneAST(ast: FishboneAST, options: { theme?: string } = {}): string {
  const themeName = options.theme ?? ast.metadata?.["theme"] ?? "default";
  const tokens = resolveFishboneTheme(themeName);
  const layout = layoutFishbone(ast, { palette: tokens.palette });
  const ltr = layout.orientation !== "rtl";
  const maskId = `sx-fb-mask-${randomId()}`;
  const maskUrl = `url(#${maskId})`;

  const mask = buildMask(maskId, layout.width, layout.height, layout.textBBoxes);

  const spine = lineEl({
    x1: layout.spineStartX,
    y1: layout.spineY,
    x2: layout.spineEndX,
    y2: layout.spineY,
    class: "sx-fb-spine",
  });

  const tailTop = lineEl({
    x1: layout.spineStartX,
    y1: layout.spineY,
    x2: layout.tailForkTipTop.x,
    y2: layout.tailForkTipTop.y,
    class: "sx-fb-tail",
  });
  const tailBot = lineEl({
    x1: layout.spineStartX,
    y1: layout.spineY,
    x2: layout.tailForkTipBot.x,
    y2: layout.tailForkTipBot.y,
    class: "sx-fb-tail",
  });

  const titleBlock = layout.title
    ? textEl(
        {
          x: layout.width / 2,
          y: 28,
          class: "sx-fb-title",
          "text-anchor": "middle",
        },
        layout.title
      )
    : "";

  const head = renderHead(layout, ltr);
  const ribs = renderRibs(layout, maskUrl);

  const inner = [
    titleEl(layout.title ? `${layout.title} — Fishbone diagram` : "Fishbone diagram"),
    descEl(
      `Ishikawa cause-and-effect diagram. Effect: ${ast.effect}. ${ast.majors.length} categories.`
    ),
    el("style", {}, CSS),
    defs([mask]),
    titleBlock,
    tailTop,
    tailBot,
    spine,
    head,
    ribs,
  ];

  // For RTL (head on left), mirror horizontally via transform.
  if (!ltr) {
    const mirrored = group(
      {
        transform: `translate(${layout.width} 0) scale(-1 1)`,
      },
      [tailTop, tailBot, spine, head, ribs]
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
        defs([mask]),
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

export function renderFishbone(text: string, options: { theme?: string } = {}): string {
  const ast = parseFishboneDSL(text);
  return renderFishboneAST(ast, options);
}
