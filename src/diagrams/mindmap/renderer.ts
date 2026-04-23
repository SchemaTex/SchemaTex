import type { InlineToken, MindmapAST, MindmapLayoutNode, MindmapLabelLine } from "../../core/types";
import { resolveMindmapTheme, type MindmapTokens } from "../../core/theme";
import type { ResolvedTheme } from "../../core/theme";
import {
  svgRoot,
  group,
  rect,
  path as svgPath,
  title as svgTitle,
  desc as svgDesc,
  el,
  escapeXml,
} from "../../core/svg";
import { parseMindmap } from "./parser";
import { layoutMindmap, lineHeightOf, UNDERLINE_GAP, underlineWidthFor } from "./layout";
import { tokensToPlainText } from "./inline";

type Theme = ResolvedTheme<MindmapTokens>;

// Monochrome theme halves all stroke widths so a pure-black line doesn't
// overpower the text. Applied uniformly via this scale factor.
function strokeScale(theme: Theme): number {
  return theme.branchPalette.length <= 1 ? 0.7 : 1;
}

function paletteColor(theme: Theme, branchIndex: number): string {
  if (branchIndex < 0) return theme.centralFill;
  return theme.branchPalette[branchIndex % theme.branchPalette.length];
}

// ─── Inline-token rendering ──────────────────────────────────────────────
//
// Each `MindmapLabelLine` becomes one `<text>` element positioned at its
// baseline y. The line's tokens are emitted as `<tspan>`s, each with its
// own font-weight/style/fill and a measured x offset. Code tokens additionally
// get a background `<rect>` drawn BEFORE the text element (rect list returned
// separately so it renders under the tspans). Link tokens wrap in `<a>`.

interface LineRenderResult {
  textElement: string;
  decorations: string[]; // rects/lines drawn under text (code bg, checkbox)
}

function renderLine(
  line: MindmapLabelLine,
  cx: number,
  cy: number,   // vertical center of the line
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  theme: Theme
): LineRenderResult {
  // Left edge of the line (center-anchored at cx).
  const leftX = cx - line.width / 2;
  const baselineY = cy + fontSize * 0.35;

  // Build tspans AND decorations in sequence, tracking cursor.
  const tspans: string[] = [];
  const decorations: string[] = [];
  let cursor = leftX;

  const emit = (tok: InlineToken, inheritedHref?: string) => {
    switch (tok.kind) {
      case "text": {
        const w = measureToken(tok, fontSize);
        tspans.push(
          tspan({
            x: cursor,
            y: baselineY,
            fill: inheritedHref ? theme.linkColor : theme.text,
            "font-weight": tok.bold ? 700 : fontWeight,
            "font-style": tok.italic ? "italic" : undefined,
            "text-decoration": inheritedHref ? "underline" : undefined,
          }, tok.value)
        );
        cursor += w;
        break;
      }
      case "code": {
        const w = measureToken(tok, fontSize);
        // Background pill — sits under text
        decorations.push(rect({
          x: cursor,
          y: cy - fontSize * 0.6,
          width: w,
          height: fontSize * 1.2,
          rx: 3,
          ry: 3,
          fill: theme.codeBg,
        }));
        tspans.push(
          tspan({
            x: cursor + 2,
            y: baselineY,
            fill: theme.codeFg,
            "font-family": "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            "font-size": fontSize * 0.92,
          }, tok.value)
        );
        cursor += w;
        break;
      }
      case "link": {
        // Render inner tokens as if link-styled; wrap in <a>
        const aStart = `<a href="${escapeXml(tok.href)}" target="_blank" rel="noopener">`;
        const innerStart = tspans.length;
        for (const inner of tok.value) emit(inner, tok.href);
        // Wrap the inner tspans in <a>
        const innerTspans = tspans.splice(innerStart).join("");
        tspans.push(aStart + innerTspans + "</a>");
        break;
      }
      case "checkbox": {
        const size = fontSize * 0.85;
        const boxX = cursor;
        const boxY = cy - size / 2;
        decorations.push(rect({
          x: boxX,
          y: boxY,
          width: size,
          height: size,
          rx: 2,
          ry: 2,
          fill: tok.checked ? theme.checkboxFill : "none",
          stroke: tok.checked ? theme.checkboxFill : theme.checkboxStroke,
          "stroke-width": 1.5,
        }));
        if (tok.checked) {
          // Check mark
          const p = `M ${(boxX + size * 0.2).toFixed(1)} ${(boxY + size * 0.5).toFixed(1)} L ${(boxX + size * 0.42).toFixed(1)} ${(boxY + size * 0.72).toFixed(1)} L ${(boxX + size * 0.82).toFixed(1)} ${(boxY + size * 0.28).toFixed(1)}`;
          decorations.push(svgPath({
            d: p,
            fill: "none",
            stroke: "#ffffff",
            "stroke-width": 2,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
          }));
        }
        cursor += size + fontSize * 0.25;
        break;
      }
    }
  };

  for (const tok of line.tokens) emit(tok);

  const textElement = el("text", {
    "font-family": fontFamily,
    "font-size": fontSize,
    "font-weight": fontWeight,
  }, tspans.join(""));
  return { textElement, decorations };
}

function measureToken(tok: InlineToken, fs: number): number {
  switch (tok.kind) {
    case "text":
      return tok.value.length * fs * (tok.bold ? 0.62 : 0.58);
    case "code":
      return tok.value.length * fs * 0.62 + 4;
    case "link": {
      let w = 0;
      for (const t of tok.value) w += measureToken(t, fs);
      return w;
    }
    case "checkbox":
      return fs * 0.85 + fs * 0.25;
  }
}

// Manual tspan builder — svg.ts doesn't have one.
function tspan(attrs: Record<string, string | number | undefined>, content: string): string {
  const pairs: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined) continue;
    pairs.push(`${k}="${typeof v === "number" ? String(v) : escapeXml(String(v))}"`);
  }
  return `<tspan ${pairs.join(" ")}>${escapeXml(content)}</tspan>`;
}

// ─── Unified node renderer (markmap-style underline) ────────────────────
//
// All nodes — root included — use the same visual model: text sits above a
// horizontal underline that spans the label width. The incoming edge bezier
// terminates at one end of the underline and flows seamlessly into it; the
// outgoing bezier departs from the other end. No box, no pill, no border.
//
// Root uses `centralFill` (neutral) for its underline to distinguish it as
// the trunk; branch nodes inherit their branch's palette color. Underline
// stroke width tapers with depth — root & main branches are thickest,
// deeper leaves thinner — keeping the visual hierarchy legible.

function renderNode(
  n: MindmapLayoutNode,
  color: string,
  theme: Theme,
  fontFamily: string
): string {
  const isRoot = n.node.depth === 0;
  const isMain = n.node.depth === 1;
  const fs = n.fontSize;
  const lh = lineHeightOf(fs);
  const lineCount = n.lines.length;

  // Label block: text block sits at TOP of labelHeight, underline at BOTTOM.
  // Text top is at (n.y - labelHeight/2); lines center at top + (i+0.5)*lh.
  const topY = n.y - n.labelHeight / 2;
  const underlineY = n.y + n.labelHeight / 2 - UNDERLINE_GAP / 2;

  const children: string[] = [];
  const decorations: string[] = [];
  const weight = isRoot ? 700 : isMain ? 600 : 400;

  for (let i = 0; i < lineCount; i++) {
    const line = n.lines[i];
    const cy = topY + (i + 0.5) * lh;
    const r = renderLine(line, n.x, cy, fs, fontFamily, weight, theme);
    decorations.push(...r.decorations);
    children.push(r.textElement);
  }

  // Underline — matches the incoming bezier's terminus Y, so edge+line
  // read as one continuous stroke.
  const ux1 = n.x - n.labelWidth / 2;
  const ux2 = n.x + n.labelWidth / 2;
  const sw = underlineWidthFor(n.node.depth) * strokeScale(theme);
  children.push(
    el("line", {
      x1: ux1,
      y1: underlineY,
      x2: ux2,
      y2: underlineY,
      stroke: color,
      "stroke-width": sw,
      "stroke-linecap": "round",
    })
  );

  const cls = isRoot
    ? "schematex-mindmap-central"
    : isMain
      ? "schematex-mindmap-main"
      : "schematex-mindmap-leaf";

  return group(
    {
      class: cls,
      "data-node-id": n.node.id,
      "data-depth": n.node.depth,
      "data-branch-idx": n.branchIndex,
    },
    [...decorations, ...children]
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
    const color = n.node.depth === 0 ? theme.centralFill : paletteColor(theme, n.branchIndex);
    nodeSvgs.push(renderNode(n, color, theme, fontFamily));
  }

  const title = ast.title ?? tokensToPlainText(ast.root.tokens);

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
