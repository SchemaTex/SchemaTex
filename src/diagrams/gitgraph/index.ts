/**
 * Git commit-graph (gitgraph) plugin entry.
 * Per docs/reference/43-GIT-GRAPH-STANDARD.md.
 *
 * Mermaid-`gitGraph`-compatible: `detect` matches the Mermaid headers `gitGraph`
 * and `gitGraph:` (case-insensitive) as well as `gitgraph`, so LLM-generated
 * gitGraph blocks route here unchanged.
 *
 * The `"gitgraph"` type is not (yet) a member of the shared `DiagramType` union;
 * this folder-isolated plugin casts at the boundary so no shared file is edited.
 */

import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseGitGraph } from "./parser";
import { renderGitGraph } from "./renderer";

export const gitgraph: DiagramPlugin = {
  type: "gitgraph" as DiagramPlugin["type"],
  detect: (t) => /^\s*gitgraph\b/i.test(t),
  parse: parseGitGraph,
  render: (text: string, config?: RenderConfig) => renderGitGraph(text, config),
};

export { parseGitGraph, GitGraphParseError } from "./parser";
export { replayGitGraph, layoutGitGraph, GITGRAPH_CONST } from "./layout";
export { renderGitGraph, renderGitGraphLayout } from "./renderer";
export type * from "./types";
