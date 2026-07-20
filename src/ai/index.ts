/**
 * Schematex AI tool layer — generation, validation, rendering, and safe editing.
 *
 * Exposes `listDiagrams`, `getSyntax`, `getExamples`, `validateDsl`, `renderDsl`
 * as framework-agnostic pure functions. For Vercel AI SDK integration see
 * `schematex/ai/sdk`. For MCP integration see `@schematex/mcp` (published
 * separately) or the hosted endpoint at `https://schematex.js.org/mcp`.
 */
export {
  listDiagrams,
  getSyntax,
  getExamples,
  validateDsl,
  renderDsl,
  getDiagramCapabilities,
  inspectDiagram,
  applyDiagramEdits,
  type DiagramListItem,
  type GetSyntaxOptions,
  type GetSyntaxResult,
  type GetExamplesResult,
  type ValidateDslResult,
  type RenderDslResult,
  type EditableDiagramItem,
  type InspectDiagramResult,
  type DiagramEdit,
  type ApplyDiagramEditsResult,
} from "./tools";

export {
  SCHEMATEX_TOOL_DEFINITIONS,
  type SchematexToolDefinition,
  type SchematexToolName,
} from "./tool-manifest";

export type {
  DiagramMeta,
  DiagramCluster,
} from "./registry";
export {
  DIAGRAM_REGISTRY,
  DIAGRAM_SINCE,
  getDiagramMeta,
  getAllDiagramTypes,
  getDiagramSince,
} from "./registry";
export { resolveDiagramType } from "./registry";

// Re-export the canonical DiagramType so website / consumers import it from the
// package instead of redeclaring a drifting copy.
export type { DiagramType } from "../core/types";

export {
  buildPromptContext,
  type BuildPromptContextOptions,
  type PromptContext,
} from "./prompt-context";

export type { Example, GetExamplesOptions } from "./examples";
export { getExampleBySlug } from "./examples";
export type { GenerationProfile } from "./profiles";
export type { SyntaxDetail, SyntaxDoc } from "./syntax";
export type { SchematexValidationError } from "./errors";
