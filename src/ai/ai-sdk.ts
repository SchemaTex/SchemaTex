/**
 * Vercel AI SDK adapter — ready-to-use `tools` object for `generateText` /
 * `streamText`.
 *
 * @example
 * ```ts
 * import { streamText } from 'ai';
 * import { schematexTools } from 'schematex/ai/sdk';
 *
 * const result = streamText({
 *   model: 'anthropic/claude-opus-4-7',
 *   tools: schematexTools,
 *   maxSteps: 5,
 *   system: `You write Schematex DSL. Discover types with listDiagrams,
 * then fetch getSyntax + getExamples before writing. Call validateDsl
 * before returning DSL to the user.`,
 *   prompt: userMessage,
 * });
 * ```
 *
 * Peer-deps `ai` and `zod` are optional — this module only loads if both
 * are installed.
 */
import { tool } from "ai";
import { z } from "zod";

import {
  listDiagrams as listDiagramsImpl,
  getSyntax as getSyntaxImpl,
  getExamples as getExamplesImpl,
  validateDsl as validateDslImpl,
  renderDsl as renderDslImpl,
} from "./tools";

export const schematexTools = {
  listDiagrams: tool({
    description:
      "List every Schematex diagram type with a tagline, 'use when' hint, domain cluster, and authoritative standard. Call this first to discover what's available.",
    inputSchema: z.object({}),
    execute: async () => listDiagramsImpl(),
  }),

  getSyntax: tool({
    description:
      "Return a compact syntax reference for one diagram type — rules, grammar (EBNF), and inline examples. Trimmed for LLM consumption (~2,000–4,000 tokens). Call after listDiagrams once you've chosen a type.",
    inputSchema: z.object({
      type: z
        .string()
        .describe(
          "Diagram type id from listDiagrams (e.g. 'genogram', 'sld', 'fishbone')."
        ),
    }),
    execute: async ({ type }: { type: string }) => getSyntaxImpl(type),
  }),

  getExamples: tool({
    description:
      "Return curated real-world DSL examples for a diagram type, each with scenario notes and tags. Use as few-shot context before generating DSL.",
    inputSchema: z.object({
      type: z.string().describe("Diagram type id."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("Max examples to return (default 5)."),
      preferFeatured: z
        .boolean()
        .optional()
        .describe("Rank featured examples first."),
      maxComplexity: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe("Only return examples with complexity <= this value (1=simplest)."),
    }),
    execute: async (args: {
      type: string;
      limit?: number;
      preferFeatured?: boolean;
      maxComplexity?: number;
    }) =>
      getExamplesImpl(args.type, {
        limit: args.limit,
        preferFeatured: args.preferFeatured,
        maxComplexity: args.maxComplexity,
      }),
  }),

  validateDsl: tool({
    description:
      "Validate Schematex DSL. Returns { ok: true } or { ok: false, errors: [{line, column, message, source}] }. Call before returning DSL to the user and self-correct on errors.",
    inputSchema: z.object({
      type: z
        .string()
        .optional()
        .describe(
          "Diagram type. Optional — Schematex auto-detects from the first line if omitted."
        ),
      dsl: z.string().describe("The DSL source text to validate."),
    }),
    execute: async ({ type, dsl }: { type?: string; dsl: string }) =>
      validateDslImpl(type, dsl),
  }),

  renderDsl: tool({
    description:
      "Render Schematex DSL to an SVG string. Returns { ok: true, svg } or { ok: false, errors }. Use when the caller needs the actual diagram output, not just validation.",
    inputSchema: z.object({
      type: z.string().optional().describe("Diagram type (auto-detected if omitted)."),
      dsl: z.string().describe("The DSL source text to render."),
      theme: z.string().optional().describe("Theme name, e.g. 'default' or 'dark'."),
      padding: z.number().optional().describe("Outer padding in pixels."),
    }),
    execute: async ({
      type,
      dsl,
      theme,
      padding,
    }: {
      type?: string;
      dsl: string;
      theme?: string;
      padding?: number;
    }) => renderDslImpl(type, dsl, { theme, padding }),
  }),
} as const;

export type SchematexTools = typeof schematexTools;
