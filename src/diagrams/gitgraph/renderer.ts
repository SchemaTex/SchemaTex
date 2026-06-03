/**
 * Git commit-graph renderer — layout → semantic SVG.
 * Per docs/reference/43-GIT-GRAPH-STANDARD.md §"Visual conventions".
 *
 * Visual vocabulary:
 *   - one coloured swimlane per branch, with a colour-matched rounded
 *     branch-name pill at the lane head;
 *   - commits = solid filled circles in the lane colour;
 *   - merge commits = hollow ring circles (white centre, coloured ring);
 *   - HIGHLIGHT commits = larger open square outline;
 *   - REVERSE commits = filled circle with an inner cross;
 *   - branch divergence = colour-matched elbow, merge = colour-matched curve;
 *   - tag pills above the commit, commit ids below the dot rotated ~45°.
 *
 * Hard rules: NO inline styles (classes only, driven by a single <style> block
 * built from the local palette), <title>/<desc>, data-* hooks, svg.ts builder.
 *
 * Self-contained git0–git7 palette (the shared theme.ts is off-limits to this
 * folder-isolated feature; network/ sets the precedent of an own palette).
 */

import type { RenderConfig } from "../../core/types";
import {
  circle,
  desc as svgDesc,
  el,
  group,
  line as svgLine,
  path as svgPath,
  rect,
  svgRoot,
  text as svgText,
  title as svgTitle,
} from "../../core/svg";
import { DEFAULT_FONT_FAMILY, FONT_SIZE, STROKE_WIDTH } from "../../core/theme";
import { parseGitGraph } from "./parser";
import { GITGRAPH_CONST as C, layoutGitGraph } from "./layout";
import type { GitGraphLayout, GitLaidCommit, GitLaidEdge } from "./types";

// ─── Local lane palette (git0–git7, Mermaid-default-aligned hues) ────

interface GitPalette {
  bg: string;
  lanes: string[]; // 8 lane colours
  laneInk: string[]; // pill text colour per lane (high-contrast)
  mergeCenter: string; // hollow ring centre fill
  labelInk: string;
  tagFill: string;
  tagStroke: string;
  tagInk: string;
}

const LIGHT_PALETTE: GitPalette = {
  bg: "#ffffff",
  lanes: [
    "#3a6ea5", // git0 main — blue
    "#6aa84f", // git1 — green
    "#c98a2b", // git2 — amber
    "#a64d79", // git3 — magenta
    "#45818e", // git4 — teal
    "#8e7cc3", // git5 — violet
    "#cc4125", // git6 — red-orange
    "#666666", // git7 — grey
  ],
  laneInk: ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"],
  mergeCenter: "#ffffff",
  labelInk: "#333333",
  tagFill: "#fff4cc",
  tagStroke: "#caa83a",
  tagInk: "#7a5b00",
};

const DARK_PALETTE: GitPalette = {
  bg: "#1e1e2e",
  lanes: [
    "#89b4fa", "#a6e3a1", "#f9e2af", "#f5c2e7",
    "#94e2d5", "#cba6f7", "#fab387", "#9399b2",
  ],
  laneInk: ["#1e1e2e", "#1e1e2e", "#1e1e2e", "#1e1e2e", "#1e1e2e", "#1e1e2e", "#1e1e2e", "#1e1e2e"],
  mergeCenter: "#1e1e2e",
  labelInk: "#cdd6f4",
  tagFill: "#45475a",
  tagStroke: "#f9e2af",
  tagInk: "#f9e2af",
};

function resolvePalette(theme: string | undefined): GitPalette {
  return theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
}

// ─── Public entry ─────────────────────────────────────────────

export function renderGitGraph(text: string, config?: RenderConfig): string {
  const ast = parseGitGraph(text);
  const layout = layoutGitGraph(ast);
  return renderGitGraphLayout(layout, config);
}

export function renderGitGraphLayout(layout: GitGraphLayout, config?: RenderConfig): string {
  const pal = resolvePalette(config?.theme);
  const fontFamily = config?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const pad = config?.padding ?? 0;
  const { ast } = layout;

  const width = layout.width + pad * 2;
  const height = layout.height + pad * 2;
  const a11y = ast.title ?? "Git commit graph";

  const styleBlock = buildStyle(pal, ast.showBranches);

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    rect({ x: 0, y: 0, width, height, class: "sx-gg-bg" }),
  ];

  const inner: string[] = [];

  // 1. Swimlanes (behind everything).
  if (ast.showBranches) {
    for (const b of layout.branches) {
      inner.push(renderLane(layout, b, fontFamily));
    }
  }

  // 2. Edges (connectors) under the dots.
  for (const e of layout.edges) {
    inner.push(renderEdge(e));
  }

  // 3. Commit nodes + annotations.
  for (const lc of layout.commits) {
    inner.push(renderCommit(lc, ast, pal, fontFamily));
  }

  children.push(
    group(
      {
        class: "sx-gg-root",
        transform: `translate(${pad}, ${pad})`,
        "data-diagram-type": "gitgraph",
        "font-family": fontFamily,
      },
      inner
    )
  );

  return svgRoot(
    {
      width: String(width),
      height: String(height),
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": a11y,
    },
    children
  );
}

// ─── Lane (swimlane line + branch pill) ───────────────────────

function renderLane(
  layout: GitGraphLayout,
  b: GitGraphLayout["branches"][number],
  fontFamily: string
): string {
  const isVertical = layout.ast.orientation !== "LR";
  const ci = b.info.colorIndex;

  const laneLine = isVertical
    ? svgLine({
        x1: b.cross, y1: b.start, x2: b.cross, y2: b.end,
        class: `sx-gg-lane sx-gg-c${ci}`,
        "data-branch": b.info.name,
      })
    : svgLine({
        x1: b.start, y1: b.cross, x2: b.end, y2: b.cross,
        class: `sx-gg-lane sx-gg-c${ci}`,
        "data-branch": b.info.name,
      });

  // Pill: rounded rect sized to the name, with the name centred.
  const name = b.info.name;
  const pillW = Math.max(34, name.length * 7 + 16);
  const pillH = 20;
  const px = b.pillX - pillW / 2;
  const py = b.pillY - pillH / 2;

  const pill = group({ class: "sx-gg-pill-group", "data-branch": name }, [
    rect({
      x: px, y: py, width: pillW, height: pillH, rx: pillH / 2,
      class: `sx-gg-pill sx-gg-fill-c${ci}`,
    }),
    svgText(
      {
        x: b.pillX, y: b.pillY,
        class: `sx-gg-pill-text sx-gg-ink-c${ci}`,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-family": fontFamily,
      },
      name
    ),
  ]);

  return group({ class: "sx-gg-lane-group" }, [laneLine, pill]);
}

// ─── Edge (connector) ─────────────────────────────────────────

function renderEdge(e: GitLaidEdge): string {
  const cls = `sx-gg-edge sx-gg-edge-${e.kind} sx-gg-stroke-c${e.colorIndex}`;
  if (e.kind === "straight") {
    return svgLine({
      x1: e.fromX, y1: e.fromY, x2: e.toX, y2: e.toY,
      class: cls,
    });
  }
  // Elbow + merge both use a smooth cubic bend from parent → child.
  const d = bendPath(e);
  return svgPath({ d, class: cls, fill: "none" });
}

/**
 * Smooth cubic from (from) to (to). Horizontal-major (LR) bends control points
 * along x; vertical-major (TB/BT) along y. The same routine serves both the
 * fork elbow and the merge curve — direction is implied by the endpoints.
 */
function bendPath(e: GitLaidEdge): string {
  const dx = e.toX - e.fromX;
  const dy = e.toY - e.fromY;
  const horizontalMajor = Math.abs(dx) >= Math.abs(dy);
  if (horizontalMajor) {
    const mx = e.fromX + dx * 0.5;
    return `M ${num(e.fromX)} ${num(e.fromY)} C ${num(mx)} ${num(e.fromY)}, ${num(mx)} ${num(e.toY)}, ${num(e.toX)} ${num(e.toY)}`;
  }
  const my = e.fromY + dy * 0.5;
  return `M ${num(e.fromX)} ${num(e.fromY)} C ${num(e.fromX)} ${num(my)}, ${num(e.toX)} ${num(my)}, ${num(e.toX)} ${num(e.toY)}`;
}

// ─── Commit node + annotations ────────────────────────────────

function renderCommit(
  lc: GitLaidCommit,
  ast: GitGraphLayout["ast"],
  pal: GitPalette,
  fontFamily: string
): string {
  const { node, x, y, colorIndex: ci } = lc;
  const parts: string[] = [];

  const dataAttrs: Record<string, string> = {
    "data-commit-id": node.id,
    "data-branch": node.branch,
    "data-seq": String(node.seq),
  };
  if (node.isMerge) dataAttrs["data-merge"] = "true";
  if (node.isCherryPick) dataAttrs["data-cherry-pick"] = node.cherryFrom ?? "";
  if (node.commitType !== "NORMAL") dataAttrs["data-type"] = node.commitType;
  if (node.tag) dataAttrs["data-tag"] = node.tag;

  // Node shape.
  if (node.commitType === "HIGHLIGHT") {
    const r = C.SQUARE_R;
    parts.push(
      rect({
        x: x - r, y: y - r, width: r * 2, height: r * 2,
        rx: 2,
        class: `sx-gg-node sx-gg-highlight sx-gg-stroke-c${ci}`,
      })
    );
  } else if (node.isMerge) {
    parts.push(
      circle({
        cx: x, cy: y, r: C.DOT_R,
        class: `sx-gg-node sx-gg-merge sx-gg-stroke-c${ci}`,
      })
    );
  } else {
    parts.push(
      circle({
        cx: x, cy: y, r: C.DOT_R,
        class: `sx-gg-node sx-gg-dot sx-gg-fill-c${ci}`,
      })
    );
    if (node.commitType === "REVERSE") {
      const k = C.DOT_R * 0.6;
      parts.push(
        svgLine({ x1: x - k, y1: y - k, x2: x + k, y2: y + k, class: "sx-gg-reverse-mark" }),
        svgLine({ x1: x - k, y1: y + k, x2: x + k, y2: y - k, class: "sx-gg-reverse-mark" })
      );
    }
  }

  // Cherry-pick marker (a small ring "cherry" above-right of the dot).
  if (node.isCherryPick) {
    parts.push(
      circle({
        cx: x + C.DOT_R, cy: y - C.DOT_R, r: 3,
        class: `sx-gg-cherry sx-gg-stroke-c${ci}`,
      })
    );
  }

  // Tag pill (above the dot).
  if (node.tag) {
    parts.push(renderTag(node.tag, x, y, fontFamily));
  }

  // Commit id label (below the dot, rotated ~45° when enabled).
  if (ast.showCommitLabel) {
    parts.push(renderCommitLabel(node.id, x, y, ast.rotateCommitLabel, fontFamily));
  }

  void pal;
  return group({ class: "sx-gg-commit", ...dataAttrs }, parts);
}

function renderTag(tag: string, x: number, y: number, fontFamily: string): string {
  const w = Math.max(22, tag.length * 6.5 + 12);
  const h = 16;
  const ty = y - C.DOT_R - 6 - h;
  const tx = x - w / 2;
  return group({ class: "sx-gg-tag-group" }, [
    rect({ x: tx, y: ty, width: w, height: h, rx: 3, class: "sx-gg-tag" }),
    svgText(
      {
        x, y: ty + h / 2,
        class: "sx-gg-tag-text",
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-family": fontFamily,
      },
      tag
    ),
  ]);
}

function renderCommitLabel(
  id: string,
  x: number,
  y: number,
  rotate: boolean,
  fontFamily: string
): string {
  const ly = y + C.DOT_R + 8;
  const transform = rotate ? `rotate(45 ${num(x)} ${num(ly)})` : undefined;
  return svgText(
    {
      x, y: ly,
      class: "sx-gg-id",
      "text-anchor": rotate ? "start" : "middle",
      "font-family": fontFamily,
      ...(transform ? { transform } : {}),
    },
    id
  );
}

// ─── Style block (palette → CSS classes; no inline styles) ────

function buildStyle(pal: GitPalette, showBranches: boolean): string {
  const laneStyle = showBranches
    ? `
.sx-gg-lane { stroke-width: ${STROKE_WIDTH.thick}; stroke-linecap: round; opacity: 0.9; }
.sx-gg-pill { stroke: none; }
.sx-gg-pill-text { font-size: ${FONT_SIZE.label}px; font-weight: 700; }`
    : "";

  const laneRules = pal.lanes
    .map((col, i) => {
      const ink = pal.laneInk[i] ?? "#ffffff";
      return [
        `.sx-gg-c${i} { stroke: ${col}; }`,
        `.sx-gg-stroke-c${i} { stroke: ${col}; }`,
        `.sx-gg-fill-c${i} { fill: ${col}; }`,
        `.sx-gg-ink-c${i} { fill: ${ink}; }`,
      ].join("\n");
    })
    .join("\n");

  return el(
    "style",
    {},
    `
.sx-gg-bg { fill: ${pal.bg}; }${laneStyle}
.sx-gg-edge { fill: none; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-gg-edge-merge { stroke-dasharray: none; }
.sx-gg-node { stroke-width: ${STROKE_WIDTH.normal}; }
.sx-gg-dot { stroke: none; }
.sx-gg-merge { fill: ${pal.mergeCenter}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-gg-highlight { fill: none; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-gg-reverse-mark { stroke: ${pal.mergeCenter}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linecap: round; }
.sx-gg-cherry { fill: none; stroke-width: ${STROKE_WIDTH.normal}; }
.sx-gg-id { fill: ${pal.labelInk}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 600; }
.sx-gg-tag { fill: ${pal.tagFill}; stroke: ${pal.tagStroke}; stroke-width: ${STROKE_WIDTH.thin}; }
.sx-gg-tag-text { fill: ${pal.tagInk}; font-size: ${FONT_SIZE.small}px; font-weight: 700; }
${laneRules}
`.trim()
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function summarise(layout: GitGraphLayout): string {
  const c = layout.replay.commits.length;
  const b = layout.replay.branches.length;
  const merges = layout.replay.commits.filter((n) => n.isMerge).length;
  return `Git commit graph: ${c} commit${c === 1 ? "" : "s"} across ${b} branch${b === 1 ? "" : "es"}` +
    (merges ? `, ${merges} merge${merges === 1 ? "" : "s"}` : "") +
    `, orientation ${layout.ast.orientation}.`;
}
