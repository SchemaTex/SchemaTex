/**
 * Git commit-graph renderer — layout → semantic SVG.
 * Per docs/reference/43-GIT-GRAPH-STANDARD.md §"Visual conventions".
 *
 * Visual vocabulary:
 *   - one coloured swimlane per branch, with a colour-matched rounded
 *     branch-name pill at the lane head;
 *   - commits = solid filled circles in the lane colour;
 *   - merge commits = hollow ring circles (white centre, coloured ring);
 *   - HIGHLIGHT commits = filled square;
 *   - REVERSE commits = filled circle with an inner cross;
 *   - branch divergence = colour-matched elbow, merge = colour-matched curve;
 *   - horizontal commit labels outside lane traffic; tag pills in a separate band.
 *
 * Hard rules: NO inline styles (classes only, driven by a single <style> block
 * built from the local palette), <title>/<desc>, data-* hooks, svg.ts builder.
 *
 * Self-contained git0–git7 palette (the shared theme.ts is off-limits to this
 * folder-isolated feature; network/ sets the precedent of an own palette).
 */

import { TITLE } from "../../core/theme";
import { resolveSceneTitle } from "../../core/title-scene";

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

// ─── Local lane palette (git0–git7) ────

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
    "#2563eb", // git0 main — blue
    "#059669", // git1 — green
    "#b45309", // git2 — amber
    "#7c3aed", // git3 — magenta
    "#0891b2", // git4 — teal
    "#db2777", // git5 — violet
    "#dc2626", // git6 — red-orange
    "#475569", // git7 — grey
  ],
  laneInk: ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"],
  mergeCenter: "#ffffff",
  labelInk: "#0f172a",
  tagFill: "#ffffff",
  tagStroke: "#334155",
  tagInk: "#334155",
};

const DARK_PALETTE: GitPalette = {
  bg: "#0f172a",
  lanes: [
    "#6d8fff", "#34d399", "#fbbf24", "#f472b6",
    "#22d3ee", "#a78bfa", "#f87171", "#94a3b8",
  ],
  laneInk: ["#0f172a", "#0f172a", "#0f172a", "#0f172a", "#0f172a", "#0f172a", "#0f172a", "#0f172a"],
  mergeCenter: "#0f172a",
  labelInk: "#f8fafc",
  tagFill: "#202b3d",
  tagStroke: "#fbbf24",
  tagInk: "#fbbf24",
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
  const titleHeight = ast.title ? TITLE.bandH : 0;
  const height = layout.height + pad * 2 + titleHeight;
  const a11y = ast.title ?? "Git commit graph";

  const styleBlock = buildStyle(pal, ast.showBranches);

  const children: string[] = [
    svgTitle(a11y),
    svgDesc(summarise(layout)),
    styleBlock,
    rect({ x: 0, y: 0, width, height, class: "sx-gg-bg" }),
  ];

  const inner: string[] = [];
  // Quiet bands associate annotations with their lane (LR) or commit row (TB/BT).
  const bandFill = config?.theme === "dark" ? "#162237" : "#f8fafc";
  if (layout.messageX !== undefined) {
    for (const [i, commit] of layout.commits.entries()) if (i % 2 === 0) {
      inner.push(rect({ x: C.PAD / 2, y: commit.y - C.TIME_STEP / 2,
        width: layout.width - C.PAD, height: C.TIME_STEP, fill: bandFill }));
    }
  } else if (ast.orientation === "LR") {
    const [first, second] = layout.branches;
    const gap = first && second ? second.pillY - first.pillY : C.LANE_GAP;
    for (const [i, branch] of layout.branches.entries()) if (i % 2 === 0) {
      inner.push(rect({ x: C.PAD / 2, y: branch.pillY - gap / 2,
        width: layout.width - C.PAD, height: gap, fill: bandFill }));
    }
  }

  // 1. Branch labels. Ancestry edges below provide the actual lane tracks.
  if (ast.showBranches) {
    for (const b of layout.branches) {
      inner.push(renderLane(b, fontFamily));
    }
  }

  // 2. Edges (connectors) under the dots.
  // Straight parent edges own the lane colour where fork/merge runs share it.
  for (const e of [...layout.edges].sort((a, b) => Number(a.kind === "straight") - Number(b.kind === "straight"))) {
    inner.push(renderEdge(e));
  }

  // 3. Commit nodes + annotations.
  for (const lc of layout.commits) {
    inner.push(renderCommit(lc, ast, pal, fontFamily, layout.messageX, layout.tagX));
  }

  children.push(
    group(
      {
        class: "sx-gg-root",
        transform: `translate(${pad}, ${pad + titleHeight})`,
        "data-diagram-type": "gitgraph",
        "font-family": fontFamily,
      },
      inner
    )
  );

  if (ast.title) {
    const resolved = resolveSceneTitle(ast.title, undefined, width / 2, pad + TITLE.y, config);
    children.push(svgText({ x: resolved.x, y: resolved.y, ...resolved.attrs,
      "text-anchor": "middle", "font-family": fontFamily,
      "font-size": TITLE.size, "font-weight": TITLE.weight, fill: pal.labelInk }, ast.title));
  }

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

// ─── Lane label (branch pill) ───────────────────────

function renderLane(
  b: GitGraphLayout["branches"][number],
  fontFamily: string
): string {
  const ci = b.info.colorIndex;

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

  return group({ class: "sx-gg-lane-group" }, [pill]);
}

// ─── Edge (connector) ─────────────────────────────────────────

function renderEdge(e: GitLaidEdge): string {
  const cls = `sx-gg-edge sx-gg-edge-${e.kind} sx-gg-stroke-c${e.colorIndex}`;
  return svgPath({ d: e.path, class: cls, fill: "none" });
}

// ─── Commit node + annotations ────────────────────────────────

function renderCommit(
  lc: GitLaidCommit,
  ast: GitGraphLayout["ast"],
  pal: GitPalette,
  fontFamily: string,
  messageX?: number,
  tagX?: number,
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
        class: `sx-gg-node sx-gg-highlight sx-gg-fill-c${ci} sx-gg-stroke-c${ci}`,
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

  // Tag pill (above the dot).
  if (node.tag) {
    parts.push(renderTag(node.tag, x, y, fontFamily, ast.orientation !== "LR",
      !ast.rotateCommitLabel && ast.showCommitLabel && lc.labelSide === -1 ? 20 : 0, tagX));
  }

  // Labels stay outside the time-axis track; explicit rotation is preserved.
  if (ast.showCommitLabel) {
    const vertical = ast.orientation !== "LR";
    const labelX = messageX ?? (!ast.rotateCommitLabel && vertical ? x + lc.labelSide * (C.DOT_R + 8) : x);
    const labelY = !ast.rotateCommitLabel && vertical ? y + 3
      : !ast.rotateCommitLabel && lc.labelSide === -1 ? y - C.DOT_R - 7 : y + C.DOT_R + 8;
    parts.push(renderCommitLabel(node.id, labelX, labelY, ast.rotateCommitLabel, fontFamily, vertical, messageX !== undefined ? 1 : lc.labelSide));
  }

  void pal;
  return group({ class: "sx-gg-commit", ...dataAttrs }, parts);
}

function renderTag(tag: string, x: number, y: number, fontFamily: string, vertical: boolean, labelBand: number, tagX?: number): string {
  const w = Math.max(22, tag.length * 6.5 + 12);
  const h = 16;
  const ty = tagX !== undefined ? y - h / 2 : vertical ? y - h / 2 - labelBand : y - C.DOT_R - 6 - h - labelBand;
  const tx = tagX ?? (vertical ? x - C.DOT_R - 8 - w : x - w / 2);
  return group({ class: "sx-gg-tag-group" }, [
    rect({ x: tx, y: ty, width: w, height: h, rx: h / 2, class: "sx-gg-tag" }),
    svgText(
      {
        x: tx + w / 2, y: ty + h / 2,
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
  fontFamily: string,
  vertical: boolean,
  labelSide: -1 | 1,
): string {
  const ly = y;
  const transform = rotate ? `rotate(45 ${num(x)} ${num(ly)})` : undefined;
  return svgText(
    {
      x, y: ly,
      class: "sx-gg-id",
      "text-anchor": rotate ? "start" : vertical ? (labelSide < 0 ? "end" : "start") : "middle",
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
.sx-gg-edge-cherry-pick { stroke-dasharray: 4 4; opacity: 0.7; }
.sx-gg-node { stroke-width: ${STROKE_WIDTH.normal}; }
.sx-gg-dot { stroke: none; }
.sx-gg-merge { fill: ${pal.mergeCenter}; stroke-width: ${STROKE_WIDTH.thick}; }
.sx-gg-highlight { stroke-width: ${STROKE_WIDTH.thick}; }
.sx-gg-reverse-mark { stroke: ${pal.mergeCenter}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linecap: round; }
.sx-gg-id { fill: ${pal.labelInk}; font-size: ${FONT_SIZE.small + 1}px; font-weight: 400; }
.sx-gg-commit[data-merge] .sx-gg-id { opacity: 0.72; }
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
