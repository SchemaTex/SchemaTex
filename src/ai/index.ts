/**
 * Schematex AI tool layer — the five tools LLMs use to work with Schematex.
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
  type DiagramListItem,
  type GetSyntaxResult,
  type GetExamplesResult,
  type ValidateDslResult,
  type RenderDslResult,
} from "./tools";

export type {
  DiagramMeta,
  DiagramCluster,
} from "./registry";
export { DIAGRAM_REGISTRY, getDiagramMeta, getAllDiagramTypes } from "./registry";

export type { Example, GetExamplesOptions } from "./examples";
export type { SyntaxDoc } from "./syntax";
export type { SchematexValidationError } from "./errors";
