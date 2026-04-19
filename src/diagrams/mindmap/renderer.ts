import type { MindmapAST, MindmapLayoutNode } from "../../core/types";
import { resolveMindmapTheme, type MindmapTokens } from "../../core/theme";
import type { ResolvedTheme } from "../../core/theme";
import {
  svgRoot,
  group,
  rect,
  text as svgText,
  path as svgPath,
  title as svgTitle,
  desc as svgDesc,
  el,
  escapeXml,
} from "../../core/svg";
import { parseMindmap } from "./parser";
import { layoutMindmap, fontSizeOf } from "./layout";

type Theme = ResolvedTheme<MindmapTokens>;

// Main-branch underline weight. Thinner in monochrome so pure-black lines
// don't overpower the text.
const UNDERLINE_MAIN = 2.2;
const UNDERLINE_MAIN_MONO = 1.5;

function paletteColor(theme: Theme, branchIndex: number): string {
  if (branchIndex < 0) return theme.centralFill;
  return theme.branchPalette[branchIndex % theme.branchPalette.length];
}

function underlineMain(theme: Theme): number {
  return theme.branchPalette.length <= 1 ? UNDERLINE_MAIN_MONO : UNDERLINE_MAIN;
}

// ─── Central topic (rounded capsule) ─────────────────────────────────────

function renderCentral(n: MindmapLayoutNode, theme: Theme, fontFamily: string): string {
  const fs = fontSizeOf(0);
  const pillW = n.labelWidth;
  const pillH = n.labelHeight;
  return group(
    { class: "schematex-mindmap-central", "data-node-id": n.node.id },
    [
      rect({
        x: n.x - pillW / 2,
        y: n.y - pillH / 2,
        width: pillW,
        height: pillH,
        rx: pillH / 2,
        ry: pillH / 2,
        fill: "none",
        stroke: theme.textMuted,
        "stroke-width": underlineMain(theme),
      }),
      svgText(
        {
          x: n.x,
          y: n.y + fs * 0.35,
          "text-anchor": "middle",
          "font-family": fontFamily,
          "font-size": fs,
          "font-weight": 700,
          fill: theme.text,
        },
        n.node.label
      ),
    ]
  );
}

// ─── Branch / leaf node ──────────────────────────────────────────────────
//
// Visual convention (matches layout.ts):
//   • n.x is the label's horizontal CENTER; text renders anchor-middle.
//   • For main branches (depth=1), a colored underline sits at y = n.y
//     beneath the label, spanning ±labelWidth/2. Incoming bezier terminates
//     at the underline's inner edge, reading as one continuous colored stroke.
//   • Sub-level labels (depth ≥ 2) have no underline — the curve anchors
//     directly into the label-edge.

function renderBranchNode(
  n: MindmapLayoutNode,
  color: string,
  theme: Theme,
  fontFamily: string
): string {
  const isMain = n.node.depth === 1;
  const fs = fontSizeOf(n.node.depth);

  const tx = n.x;
  const ty = isMain ? n.y - 3 : n.y + fs * 0.35;
  const ux1 = n.x - n.labelWidth / 2;
  const ux2 = n.x + n.labelWidth / 2;
  const uy = n.y;

  const children: string[] = [
    svgText(
      {
        x: tx,
        y: ty,
        "text-anchor": "middle",
        "font-family": fontFamily,
        "font-size": fs,
        "font-weight": isMain ? 600 : 400,
        fill: theme.text,
      },
      n.node.label
    ),
  ];
  // Only MAIN branches (depth=1) get a colored underline — reduces visual
  // noise at deeper levels where the incoming curve already anchors the text.
  if (isMain) {
    children.push(
      el("line", {
        x1: ux1,
        y1: uy,
        x2: ux2,
        y2: uy,
        stroke: color,
        "stroke-width": underlineMain(theme),
        "stroke-linecap": "round",
      })
    );
  }
  return group(
    {
      class: isMain ? "schematex-mindmap-main" : "schematex-mindmap-leaf",
      "data-node-id": n.node.id,
      "data-depth": n.node.depth,
      "data-branch-idx": n.branchIndex,
    },
    children
  );
}

// ─── Top-level render ────────────────────────────────────────────────────

export function renderMindmapAST(
  ast: MindmapAST,
  themeName = "default",
  fontFamily = "system-ui, -apple-system, sans-serif"
): string {
  const theme = resolveMindmapTheme(ast.themeOverride ?? themeName);
  const layout = layoutMindmap(ast);
  const byId = new Map(layout.nodes.map((n) => [n.node.id, n]));

  const edgeSvgs: string[] = [];
  for (const e of layout.edges) {
    const target = byId.get(e.to);
    if (!target) continue;
    const color = paletteColor(theme, target.branchIndex);
    edgeSvgs.push(
      svgPath({
        d: e.path,
        fill: "none",
        stroke: color,
        "stroke-width": e.width,
        "stroke-linecap": "round",
      })
    );
  }

  const nodeSvgs: string[] = [];
  for (const n of layout.nodes) {
    if (n.node.depth === 0) {
      nodeSvgs.push(renderCentral(n, theme, fontFamily));
    } else {
      nodeSvgs.push(
        renderBranchNode(n, paletteColor(theme, n.branchIndex), theme, fontFamily)
      );
    }
  }

  const title = ast.title ?? ast.root.label;

  return svgRoot(
    {
      viewBox: `0 0 ${layout.width.toFixed(1)} ${layout.height.toFixed(1)}`,
      width: layout.width.toFixed(1),
      height: layout.height.toFixed(1),
      role: "graphics-document",
      "aria-label": `Mindmap: ${escapeXml(title)}`,
    },
    [
      svgTitle(title),
      svgDesc(`${layout.style} mindmap with ${layout.nodes.length} nodes`),
      rect({ x: 0, y: 0, width: layout.width, height: layout.height, fill: theme.bg }),
      group({ class: "schematex-mindmap-edges", "aria-hidden": "true" }, edgeSvgs),
      group({ class: "schematex-mindmap-nodes" }, nodeSvgs),
    ]
  );
}

export function renderMindmap(text: string, opts?: { theme?: string; fontFamily?: string }): string {
  const ast = parseMindmap(text);
  return renderMindmapAST(ast, opts?.theme, opts?.fontFamily);
}
