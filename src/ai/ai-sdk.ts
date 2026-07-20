/** Ready-to-use Vercel AI SDK tools derived from the shared Schematex manifest. */
import { jsonSchema, tool } from "ai";
import { SCHEMATEX_TOOL_DEFINITIONS as definitions } from "./tool-manifest";
import {
  applyDiagramEdits as applyDiagramEditsImpl,
  getDiagramCapabilities as getDiagramCapabilitiesImpl,
  getExamples as getExamplesImpl,
  getSyntax as getSyntaxImpl,
  inspectDiagram as inspectDiagramImpl,
  listDiagrams as listDiagramsImpl,
  renderDsl as renderDslImpl,
  validateDsl as validateDslImpl,
  type DiagramEdit,
} from "./tools";

function inputSchema<T>(definition: { inputSchema: Record<string, unknown> }) {
  return jsonSchema<T>(definition.inputSchema as never);
}

export const schematexTools = {
  listDiagrams: tool({
    description: definitions.listDiagrams.description,
    inputSchema: inputSchema<Record<string, never>>(definitions.listDiagrams),
    execute: async () => listDiagramsImpl(),
  }),
  getSyntax: tool({
    description: definitions.getSyntax.description,
    inputSchema: inputSchema<{ type: string; detail?: "canonical" | "reference" }>(definitions.getSyntax),
    execute: async ({ type, detail }) => getSyntaxImpl(type, { detail }),
  }),
  getExamples: tool({
    description: definitions.getExamples.description,
    inputSchema: inputSchema<{
      type: string;
      limit?: number;
      preferFeatured?: boolean;
      maxComplexity?: number;
    }>(definitions.getExamples),
    execute: async ({ type, limit, preferFeatured, maxComplexity }) =>
      getExamplesImpl(type, { limit, preferFeatured, maxComplexity }),
  }),
  validateDsl: tool({
    description: definitions.validateDsl.description,
    inputSchema: inputSchema<{ type?: string; dsl: string }>(definitions.validateDsl),
    execute: async ({ type, dsl }) => validateDslImpl(type, dsl),
  }),
  renderDsl: tool({
    description: definitions.renderDsl.description,
    inputSchema: inputSchema<{ type?: string; dsl: string; theme?: string; padding?: number }>(definitions.renderDsl),
    execute: async ({ type, dsl, theme, padding }) =>
      renderDslImpl(type, dsl, { theme, padding }),
  }),
  getDiagramCapabilities: tool({
    description: definitions.getDiagramCapabilities.description,
    inputSchema: inputSchema<{ type: string }>(definitions.getDiagramCapabilities),
    execute: async ({ type }) => getDiagramCapabilitiesImpl(type),
  }),
  inspectDiagram: tool({
    description: definitions.inspectDiagram.description,
    inputSchema: inputSchema<{ type?: string; dsl: string }>(definitions.inspectDiagram),
    execute: async ({ type, dsl }) => inspectDiagramImpl(type, dsl),
  }),
  applyDiagramEdits: tool({
    description: definitions.applyDiagramEdits.description,
    inputSchema: inputSchema<{
      type?: string;
      dsl: string;
      revision: number;
      edits: DiagramEdit[];
    }>(definitions.applyDiagramEdits),
    execute: async ({ type, dsl, revision, edits }) =>
      applyDiagramEditsImpl(type, dsl, revision, edits),
  }),
} as const;

export type SchematexTools = typeof schematexTools;
