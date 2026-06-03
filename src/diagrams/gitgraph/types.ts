/**
 * Git commit-graph (gitgraph) AST + layout types.
 * Per docs/reference/43-GIT-GRAPH-STANDARD.md.
 *
 * The diagram is a *layout + Mermaid-`gitGraph`-compatibility* play, not an
 * analysis play: the engine replays an ordered operation stream into a commit
 * DAG, assigns one swimlane per branch, orders commits chronologically along a
 * time axis, and routes branch-divergence elbows + merge curves between lanes.
 *
 * Folder-isolated: this type is `"gitgraph"`, which is not (yet) a member of the
 * shared `DiagramType` union in `src/core/types.ts`. The plugin casts at the
 * boundary (`"gitgraph" as DiagramPlugin["type"]`) so no shared file is touched.
 */

// ─── Orientation ──────────────────────────────────────────────

/**
 * Layout orientation (Mermaid parity):
 *   - "LR" (default) — time flows left→right, lanes stacked top→bottom.
 *   - "TB"           — time flows top→bottom, lanes side-by-side left→right.
 *   - "BT"           — time flows bottom→top, lanes side-by-side.
 */
export type GitGraphOrientation = "LR" | "TB" | "BT";

// ─── Commit node kinds ────────────────────────────────────────

/**
 * Visual style of a commit node (Mermaid `type:`):
 *   - NORMAL    — solid filled circle in the lane colour.
 *   - REVERSE   — filled circle with an inner cross.
 *   - HIGHLIGHT — larger open square outline.
 * A *merge* commit is a separate `isMerge` flag (drawn as a hollow ring),
 * orthogonal to `type`.
 */
export type GitCommitType = "NORMAL" | "REVERSE" | "HIGHLIGHT";

// ─── Operations (the ordered AST) ─────────────────────────────

export type GitOperation =
  | { kind: "commit"; id?: string; tag?: string; commitType: GitCommitType; line: number }
  | { kind: "branch"; name: string; order?: number; line: number }
  | { kind: "checkout"; name: string; line: number }
  | { kind: "merge"; name: string; id?: string; tag?: string; commitType: GitCommitType; line: number }
  | { kind: "cherry-pick"; id: string; tag?: string; parent?: string; line: number };

// ─── Parsed AST ───────────────────────────────────────────────

export interface GitGraphAst {
  type: "gitgraph";
  orientation: GitGraphOrientation;
  /** Name of the initial / trunk branch (Mermaid `mainBranchName`, default "main"). */
  mainBranchName: string;
  /** Lane order override for the main branch (Mermaid `mainBranchOrder`, default 0). */
  mainBranchOrder: number;
  /** Draw lane lines + branch pills (Mermaid `showBranches`, default true). */
  showBranches: boolean;
  /** Draw commit ids below dots (Mermaid `showCommitLabel`, default true). */
  showCommitLabel: boolean;
  /** Rotate commit-id labels ~45° (Mermaid `rotateCommitLabel`, default true). */
  rotateCommitLabel: boolean;
  title?: string;
  operations: GitOperation[];
}

// ─── Replayed DAG (intermediate, produced by layout) ──────────

/** A commit node after replaying the operation stream. */
export interface GitCommitNode {
  /** Resolved id (explicit `id:` or the auto `n-<hash>` form). */
  id: string;
  /** Branch this commit lives on. */
  branch: string;
  /** Monotonic position along the time axis (0-based, in source order). */
  seq: number;
  commitType: GitCommitType;
  tag?: string;
  /** True for merge commits (hollow ring node). */
  isMerge: boolean;
  /** True for cherry-pick commits. */
  isCherryPick: boolean;
  /** Parent commit ids (1 normal, 2 merge, 1 cherry-pick + source ref). */
  parents: string[];
  /** For a merge: the id of the merged-in branch tip (second parent). */
  mergedFrom?: string;
  /** For a cherry-pick: the source commit id it copies. */
  cherryFrom?: string;
  /** Source line (for diagnostics). */
  line: number;
}

/** A branch (swimlane) after replay. */
export interface GitBranchInfo {
  name: string;
  /** Lane index (0 = main, allocated by appearance unless `order:` overrides). */
  lane: number;
  /** Explicit `order:` override, if any. */
  order?: number;
  /** Colour index into the git0–git7 palette (lane % 8). */
  colorIndex: number;
}

export interface GitGraphReplay {
  commits: GitCommitNode[];
  branches: GitBranchInfo[];
}

// ─── Layout result (absolute geometry) ────────────────────────

export interface GitLaidCommit {
  node: GitCommitNode;
  /** Centre of the commit node. */
  x: number;
  y: number;
  lane: number;
  colorIndex: number;
}

export interface GitLaidBranch {
  info: GitBranchInfo;
  /** Lane centre line on the cross-axis (y in LR, x in TB/BT). */
  cross: number;
  /** Time-axis extent of the lane line. */
  start: number;
  end: number;
  /** Pill anchor (the lane head). */
  pillX: number;
  pillY: number;
}

/** A connector between two commits (parent → child), classified for styling. */
export interface GitLaidEdge {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Colour index of the connector (child lane for elbow, merged lane for merge). */
  colorIndex: number;
  /** "straight" within a lane, "elbow" at a fork, "merge" curve into a merge node. */
  kind: "straight" | "elbow" | "merge";
}

export interface GitGraphLayout {
  ast: GitGraphAst;
  replay: GitGraphReplay;
  commits: GitLaidCommit[];
  branches: GitLaidBranch[];
  edges: GitLaidEdge[];
  width: number;
  height: number;
}
