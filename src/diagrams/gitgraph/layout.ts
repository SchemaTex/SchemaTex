/**
 * Git commit-graph layout — the deliverable.
 * Per docs/reference/43-GIT-GRAPH-STANDARD.md §"Engine computation".
 *
 * Pipeline:
 *   1. Replay the operation stream into a commit DAG (parents wired by branch tip).
 *   2. Lane assignment — one swimlane per branch, allocated by first appearance;
 *      main is lane `mainBranchOrder` (0). `order:` overrides participate in a
 *      stable sort. Lanes are *never reused* once opened (simplest, deterministic,
 *      stable branch identity) — lane reuse is deferred.
 *   3. Chronological ordering — commits step monotonically along the time axis in
 *      source order (a topological order consistent with parent links).
 *   4. Merge-edge routing — branch divergence = elbow from parent lane to child
 *      lane at the fork; merge = curve from the merged tip into the merge node.
 *
 * Orientation: layout is computed in a normalised "time→across" frame and mapped
 * to LR / TB / BT at the end. Deterministic; no randomness.
 *
 * Zero deps, strict TS.
 */

import { estimateTextWidth } from "../../core/text-metrics";
import { GitGraphParseError } from "./parser";
import type {
  GitBranchInfo,
  GitCommitNode,
  GitGraphAst,
  GitGraphLayout,
  GitGraphReplay,
  GitLaidBranch,
  GitLaidCommit,
  GitLaidEdge,
} from "./types";

// ─── Layout constants ─────────────────────────────────────────

export const GITGRAPH_CONST = {
  /** Step between successive commits along the time axis. */
  TIME_STEP: 56,
  /** Distance between adjacent swimlanes on the cross axis. */
  LANE_GAP: 56,
  /** Commit dot radius. */
  DOT_R: 9,
  /** HIGHLIGHT open-square half-side. */
  SQUARE_R: 11,
  /** Outer padding of the canvas. */
  PAD: 24,
  /** Reserved cross-axis space for the branch-name pill column (LR). */
  PILL_GUTTER: 92,
  /** Reserved time-axis lead-in before the first commit. */
  LEAD_IN: 28,
  /** Space below the dots reserved for rotated commit-id labels (LR). */
  LABEL_BAND: 56,
  /** Space above a dot reserved for a tag pill. */
  TAG_BAND: 22,
} as const;

const PALETTE_SIZE = 8;

// ─── 1. Replay ────────────────────────────────────────────────

interface ReplayState {
  /** branch name → tip commit id (or null when the branch has no commit yet). */
  tips: Map<string, string | null>;
  /** branch name → info (lane allocated later). */
  branches: Map<string, GitBranchInfo>;
  /** declaration order of branches (for first-appearance lane allocation). */
  order: string[];
  current: string;
  commits: GitCommitNode[];
  byId: Map<string, GitCommitNode>;
  seq: number;
  autoIndex: number;
}

export function replayGitGraph(ast: GitGraphAst): GitGraphReplay {
  const main = ast.mainBranchName;
  const state: ReplayState = {
    tips: new Map([[main, null]]),
    branches: new Map([[main, { name: main, lane: 0, order: ast.mainBranchOrder, colorIndex: 0 }]]),
    order: [main],
    current: main,
    commits: [],
    byId: new Map(),
    seq: 0,
    autoIndex: 0,
  };

  for (const op of ast.operations) {
    switch (op.kind) {
      case "commit": {
        const id = resolveCommitId(op.id, state, op.line);
        const parentTip = state.tips.get(state.current) ?? null;
        const node: GitCommitNode = {
          id,
          branch: state.current,
          seq: state.seq++,
          commitType: op.commitType,
          tag: op.tag,
          isMerge: false,
          isCherryPick: false,
          parents: parentTip ? [parentTip] : [],
          line: op.line,
        };
        addCommit(state, node);
        break;
      }
      case "branch": {
        if (state.branches.has(op.name)) {
          throw new GitGraphParseError(`branch '${op.name}' already exists`, op.line);
        }
        const tip = state.tips.get(state.current) ?? null;
        state.branches.set(op.name, { name: op.name, lane: 0, order: op.order, colorIndex: 0 });
        state.order.push(op.name);
        // New branch starts at the current tip and HEAD switches to it.
        state.tips.set(op.name, tip);
        state.current = op.name;
        break;
      }
      case "checkout": {
        if (!state.branches.has(op.name)) {
          throw new GitGraphParseError(
            `checkout of undeclared branch '${op.name}' (declare it with 'branch ${op.name}' first)`,
            op.line
          );
        }
        state.current = op.name;
        break;
      }
      case "merge": {
        if (!state.branches.has(op.name)) {
          throw new GitGraphParseError(
            `merge of undeclared branch '${op.name}'`,
            op.line
          );
        }
        if (op.name === state.current) {
          throw new GitGraphParseError(`cannot merge branch '${op.name}' into itself`, op.line);
        }
        const mergedTip = state.tips.get(op.name) ?? null;
        if (!mergedTip) {
          throw new GitGraphParseError(
            `cannot merge '${op.name}' — it has no commits yet`,
            op.line
          );
        }
        const targetTip = state.tips.get(state.current) ?? null;
        const id = resolveCommitId(op.id, state, op.line);
        const parents = targetTip ? [targetTip, mergedTip] : [mergedTip];
        const node: GitCommitNode = {
          id,
          branch: state.current,
          seq: state.seq++,
          commitType: op.commitType,
          tag: op.tag,
          isMerge: true,
          isCherryPick: false,
          parents,
          mergedFrom: mergedTip,
          line: op.line,
        };
        addCommit(state, node);
        break;
      }
      case "cherry-pick": {
        const source = state.byId.get(op.id);
        if (!source) {
          throw new GitGraphParseError(
            `cherry-pick of unknown commit id '${op.id}'`,
            op.line
          );
        }
        if (source.isMerge && !op.parent) {
          throw new GitGraphParseError(
            `cherry-pick of merge commit '${op.id}' requires parent: "<id>"`,
            op.line
          );
        }
        if (source.branch === state.current) {
          throw new GitGraphParseError(
            `cherry-pick source '${op.id}' is already on the current branch '${state.current}'`,
            op.line
          );
        }
        const parentTip = state.tips.get(state.current) ?? null;
        const id = resolveCommitId(undefined, state, op.line);
        const node: GitCommitNode = {
          id,
          branch: state.current,
          seq: state.seq++,
          commitType: "NORMAL",
          tag: op.tag,
          isMerge: false,
          isCherryPick: true,
          parents: parentTip ? [parentTip] : [],
          cherryFrom: op.id,
          line: op.line,
        };
        addCommit(state, node);
        break;
      }
    }
  }

  const branches = assignLanes(ast, state);
  return { commits: state.commits, branches };
}

function addCommit(state: ReplayState, node: GitCommitNode): void {
  state.commits.push(node);
  state.byId.set(node.id, node);
  state.tips.set(node.branch, node.id);
}

function resolveCommitId(explicit: string | undefined, state: ReplayState, line: number): string {
  if (explicit !== undefined) {
    if (state.byId.has(explicit)) {
      throw new GitGraphParseError(`duplicate commit id '${explicit}'`, line);
    }
    return explicit;
  }
  // Mermaid auto-id shape: `n-<hash>`, n = sequential commit index (1-based).
  state.autoIndex += 1;
  const hash = pseudoHash(state.autoIndex, state.current);
  return `${state.autoIndex}-${hash}`;
}

/** Deterministic 7-char hex, mimicking the look of git's abbreviated SHA. */
function pseudoHash(n: number, branch: string): string {
  let h = 0x811c9dc5;
  const seed = `${n}:${branch}`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return hex.slice(0, 7);
}

// ─── 2. Lane assignment ───────────────────────────────────────

/**
 * Lanes are allocated so that:
 *   - main keeps `mainBranchOrder` (default 0);
 *   - branches with an explicit `order:` are placed by that order;
 *   - the rest fill remaining lanes by first-appearance.
 * The final lane numbers are a stable, gap-free 0..n-1 sequence on the cross
 * axis. Lanes retain their identity; crossings can still occur between lanes.
 */
function assignLanes(ast: GitGraphAst, state: ReplayState): GitBranchInfo[] {
  const infos = state.order.map((name) => state.branches.get(name)!);

  // Sort key: explicit order (main uses mainBranchOrder) first, then appearance.
  const withKey = infos.map((info, appearance) => {
    const explicit = info.name === ast.mainBranchName ? ast.mainBranchOrder : info.order;
    return { info, appearance, explicit };
  });

  withKey.sort((a, b) => {
    const ax = a.explicit;
    const bx = b.explicit;
    if (ax !== undefined && bx !== undefined) {
      if (ax !== bx) return ax - bx;
      return a.appearance - b.appearance;
    }
    if (ax !== undefined) return -1;
    if (bx !== undefined) return 1;
    return a.appearance - b.appearance;
  });

  withKey.forEach((w, lane) => {
    w.info.lane = lane;
    w.info.colorIndex = lane % PALETTE_SIZE;
  });

  // Return in lane order for stable downstream iteration.
  return withKey.map((w) => w.info);
}

// ─── 3 + 4. Geometry + edges ──────────────────────────────────

export function layoutGitGraph(ast: GitGraphAst): GitGraphLayout {
  const replay = replayGitGraph(ast);
  const C = GITGRAPH_CONST;
  const branchByName = new Map(replay.branches.map((b) => [b.name, b]));
  const laneCount = replay.branches.length;
  const commitCount = replay.commits.length;

  // Normalised frame: `t` = time-axis position index (seq), `c` = lane index.
  // We map (t, c) → (x, y) per orientation at the end.

  const commitById = new Map(replay.commits.map(n => [n.id, n]));
  const channelCounts = new Map<number, number>();
  for (const node of replay.commits) {
    for (const [index, id] of node.parents.entries()) {
      const parent = commitById.get(id)!;
      if (parent.branch === node.branch || index !== 0) continue;
      const slot = parent.seq;
      channelCounts.set(slot, (channelCounts.get(slot) ?? 0) + 1);
    }
  }
  const usedChannels = new Map<number, number>();
  const vertical = ast.orientation !== "LR";
  const labelWidths = replay.commits.map(n => ast.showCommitLabel ? estimateTextWidth(n.id, 10) : 0);
  const longestLabel = Math.max(0, ...labelWidths);
  const labelHeight = ast.rotateCommitLabel ? longestLabel / Math.SQRT2 + 12 : 14;
  const branchWidth = Math.max(0, ...replay.branches.map(b => estimateTextWidth(b.name, 12, {fontWeight:700}) + 24));
  const tagWidth = Math.max(0, ...replay.commits.map(n => n.tag ? Math.max(22, n.tag.length * 6.5 + 12) : 0));
  const rowLabels = vertical && !ast.rotateCommitLabel;
  const laneGap = rowLabels ? C.LANE_GAP : Math.max(C.LANE_GAP, vertical ? Math.max(longestLabel + tagWidth + 48, branchWidth + 16) : labelHeight + C.TAG_BAND + 30);
  // Labels stay in screen coordinates for all orientations. Include their
  // rotated footprint, not just the lane spacing, in the outer frame.
  const labelLeft = ast.showCommitLabel ? (ast.rotateCommitLabel ? 3 / Math.SQRT2 : longestLabel / 2) : 0;
  const labelRight = ast.showCommitLabel ? (ast.rotateCommitLabel ? (longestLabel + 10) / Math.SQRT2 : longestLabel / 2) : 0;
  const labelBottom = ast.showCommitLabel ? C.DOT_R + 8 + (ast.rotateCommitLabel ? (longestLabel + 3) / Math.SQRT2 : 3) : 0;
  const headBand = rowLabels ? C.PAD : Math.max(
    ast.showBranches ? Math.max(C.PILL_GUTTER, branchWidth + C.PAD) : C.LEAD_IN,
    (ast.orientation === "BT" ? labelBottom : vertical ? 0 : Math.max(labelLeft, tagWidth / 2)) + C.PAD - C.LEAD_IN,
  );
  const annotationSpan = !vertical
    ? Math.max(tagWidth, ast.showCommitLabel ? (ast.rotateCommitLabel ? labelRight * 2 : longestLabel) : 0)
    : labelBottom;
  // Channel spacing is additional to the text footprint, not an alternative to it.
  const timeStep = rowLabels ? C.TIME_STEP : Math.max(C.TIME_STEP, annotationSpan + 32 + Math.max(0, ...channelCounts.values()) * 16);
  // time-axis coordinate of commit at seq s
  const timeAt = (s: number): number => headBand + C.LEAD_IN + s * timeStep;
  // cross-axis coordinate of lane l
  const crossAt = (l: number): number => (rowLabels ? C.PAD + C.DOT_R : Math.max(C.PAD + C.TAG_BAND + C.LANE_GAP / 2, vertical ? Math.max(labelLeft + C.PAD, branchWidth / 2 + C.PAD, Math.max(tagWidth, longestLabel) + C.DOT_R + 8 + C.PAD) : 0)) + l * laneGap;

  const timeSpan = commitCount > 0 ? timeAt(commitCount - 1) : timeAt(0);
  const crossSpan = crossAt(Math.max(0, laneCount - 1));

  const isVertical = ast.orientation === "TB" || ast.orientation === "BT";

  // Logical canvas extent (before orientation map).
  const timeMax = Math.max(
    timeSpan + C.TIME_STEP / 2 + (ast.showCommitLabel ? C.LABEL_BAND : C.PAD),
    timeSpan + (ast.orientation === "TB" ? labelBottom : vertical ? 0 : Math.max(labelRight, tagWidth / 2)) + C.PAD,
  );
  const crossMax = crossSpan + Math.max(C.LANE_GAP / 2, vertical ? longestLabel + 20 : labelHeight + 20,
    vertical ? labelRight : labelBottom) + C.PAD;

  const messageX = rowLabels ? crossSpan + C.DOT_R + 24 : undefined;
  const width = messageX !== undefined ? messageX + longestLabel + branchWidth + tagWidth + 64 : isVertical ? crossMax : timeMax;
  const height = isVertical ? timeMax : crossMax;

  // Map normalised (time, cross) → (x, y).
  const place = (t: number, c: number): { x: number; y: number } => {
    if (ast.orientation === "LR") return { x: t, y: c };
    if (ast.orientation === "TB") return { x: c, y: t };
    // BT: time grows upward → invert.
    return { x: c, y: height - t };
  };

  const laneOf = (branch: string): number => branchByName.get(branch)?.lane ?? 0;
  const colorOf = (branch: string): number => branchByName.get(branch)?.colorIndex ?? 0;

  // Commits.
  const commits: GitLaidCommit[] = replay.commits.map((node) => {
    const t = timeAt(node.seq);
    const c = crossAt(laneOf(node.branch));
    const { x, y } = place(t, c);
    const lane = laneOf(node.branch);
    const incomingFromAfter = node.isMerge && node.parents.some(id => laneOf(commitById.get(id)!.branch) > lane);
    const labelSide = (!vertical && lane === 0) || incomingFromAfter ? -1 : 1;
    return { node, x, y, lane, colorIndex: colorOf(node.branch), labelSide };
  });
  const laidById = new Map(commits.map((lc) => [lc.node.id, lc] as const));

  // Branch labels identify lanes; only actual parent edges form the backbone.
  const branches: GitLaidBranch[] = replay.branches.map(info => {
    const pill = place(headBand - C.LEAD_IN / 2, crossAt(info.lane));
    const tip = commits.filter(c => c.node.branch === info.name).at(-1);
    return messageX !== undefined && tip
      ? { info, pillX: messageX + longestLabel + 16 + branchWidth / 2, pillY: tip.y }
      : { info, pillX: pill.x, pillY: pill.y };
  });

  // Edges: for each commit, draw connectors to its parents.
  const edges: GitLaidEdge[] = [];
  for (const node of replay.commits) {
    const child = laidById.get(node.id)!;
    const relations = node.parents.map((pid, idx) => ({ pid, isCopy: false, isMerge: node.isMerge && idx === 1 }));
    if (node.cherryFrom) relations.push({ pid: node.cherryFrom, isCopy: true, isMerge: false });
    relations.forEach(({ pid, isCopy, isMerge }) => {
      const parent = laidById.get(pid);
      if (!parent) return;
      const sameLane = parent.lane === child.lane;
      const isMergeSecondParent = isMerge;

      let kind: GitLaidEdge["kind"];
      let colorIndex: number;
      if (isCopy) {
        kind = "cherry-pick";
        colorIndex = parent.colorIndex;
      } else if (isMergeSecondParent) {
        kind = "merge";
        // Merge curve takes the merged-in (source) branch colour.
        colorIndex = parent.colorIndex;
      } else if (!sameLane) {
        // Cross-lane single parent = branch divergence elbow.
        kind = "elbow";
        colorIndex = child.colorIndex;
      } else {
        kind = "straight";
        colorIndex = child.colorIndex;
      }

      const slot = kind === "elbow" ? parent.node.seq : node.seq - 1;
      const used = usedChannels.get(slot) ?? 0;
      if (kind === "elbow") usedChannels.set(slot, used + 1);
      const turn = timeAt(slot) + timeStep / 2 + (used - ((channelCounts.get(slot) ?? 1) - 1) / 2) * 16;
      edges.push({
        fromX: parent.x,
        fromY: parent.y,
        toX: child.x,
        toY: child.y,
        colorIndex,
        kind,
        path: isCopy
          ? copyReference(timeAt(parent.node.seq), crossAt(parent.lane), timeAt(node.seq), crossAt(child.lane), place)
          : sameLane
          ? `M ${parent.x} ${parent.y} L ${child.x} ${child.y}`
          : laneTransition(timeAt(parent.node.seq), crossAt(parent.lane), timeAt(node.seq), crossAt(child.lane),
              turn, place, kind === "merge"),
      });
    });
  }

  // Sort edges for deterministic output (by child seq, then parent seq).
  edges.sort((a, b) => {
    const ay = a.toX + a.toY;
    const by = b.toX + b.toY;
    if (ay !== by) return ay - by;
    return (a.fromX + a.fromY) - (b.fromX + b.fromY);
  });


  return {
    ast,
    replay,
    commits,
    branches,
    edges,
    width,
    height,
    messageX,
    tagX: messageX !== undefined ? messageX + longestLabel + branchWidth + 32 : undefined,
  };
}

/** A lane change occupies a gap between commit columns, never a long diagonal. */
function laneTransition(
  fromT: number, fromC: number, toT: number, toC: number, turnT: number,
  place: (t: number, c: number) => { x: number; y: number },
  merge: boolean,
): string {
  const radius = Math.min((toT - fromT) / 3, Math.abs(toC - fromC) / 2, merge ? toT - turnT : turnT - fromT);
  const sign = Math.sign(toC - fromC);
  const p = (t: number, c: number) => { const point = place(t, c); return `${point.x} ${point.y}`; };
  // Enter the merge node across the lane, rather than joining its backbone early.
  if (merge) return `M ${p(fromT, fromC)} L ${p(toT - radius, fromC)} ` +
    `C ${p(toT, fromC)} ${p(toT, fromC)} ${p(toT, fromC + sign * radius)} L ${p(toT, toC)}`;
  return `M ${p(fromT, fromC)} L ${p(turnT - radius, fromC)} ` +
    `C ${p(turnT, fromC)} ${p(turnT, fromC)} ${p(turnT, fromC + sign * radius)} ` +
    `L ${p(turnT, toC - sign * radius)} ` +
    `C ${p(turnT, toC)} ${p(turnT, toC)} ${p(turnT + radius, toC)} L ${p(toT, toC)}`;
}

/** Copy provenance is an annotation across the lane gap, not a branch backbone. */
function copyReference(fromT: number, fromC: number, toT: number, toC: number,
  place: (t: number, c: number) => { x: number; y: number }): string {
  const p = (t: number, c: number) => { const point = place(t, c); return `${point.x} ${point.y}`; };
  const span = (toT - fromT) / 3;
  return `M ${p(fromT, fromC)} C ${p(fromT + span, fromC)} ${p(toT - span, toC)} ${p(toT, toC)}`;
}
