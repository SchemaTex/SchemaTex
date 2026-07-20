/**
 * Transport-agnostic Schematex MCP server factory.
 *
 * Produces a fully-wired `McpServer` instance from the same model-visible
 * manifest used by the AI SDK and hosted HTTP transport.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listDiagrams,
  getSyntax,
  getExamples,
  validateDsl,
  renderDsl,
  getDiagramCapabilities,
  inspectDiagram,
  applyDiagramEdits,
  SCHEMATEX_TOOL_DEFINITIONS as definitions,
  type DiagramEdit,
} from "schematex/ai";
import { buildRenderDslContent } from "./render-content.js";

const NAME = "schematex";
const VERSION = "1.0.0";

export function createSchematexMcpServer(): McpServer {
  const server = new McpServer({
    name: NAME,
    version: VERSION,
  });

  server.registerTool(
    "listDiagrams",
    {
      title: definitions.listDiagrams.title,
      description: definitions.listDiagrams.description,
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(listDiagrams(), null, 2) }],
    })
  );

  server.registerTool(
    "getSyntax",
    {
      title: definitions.getSyntax.title,
      description: definitions.getSyntax.description,
      inputSchema: {
        type: z
          .string()
          .describe(
            "Diagram type id from listDiagrams (e.g. 'genogram', 'sld', 'fishbone')."
          ),
        detail: z
          .enum(["canonical", "reference"])
          .optional()
          .describe(
            "Default `canonical` is best for generation. Use `reference` for the fuller grammar/tutorial."
          ),
      },
    },
    async ({ type, detail }) => ({
      content: [{ type: "text", text: JSON.stringify(getSyntax(type, { detail }), null, 2) }],
    })
  );

  server.registerTool(
    "getExamples",
    {
      title: definitions.getExamples.title,
      description: definitions.getExamples.description,
      inputSchema: {
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
          .describe("Only return examples with complexity <= this value."),
      },
    },
    async ({ type, limit, preferFeatured, maxComplexity }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            getExamples(type, { limit, preferFeatured, maxComplexity }),
            null,
            2
          ),
        },
      ],
    })
  );

  server.registerTool(
    "validateDsl",
    {
      title: definitions.validateDsl.title,
      description: definitions.validateDsl.description,
      inputSchema: {
        type: z
          .string()
          .optional()
          .describe(
            "Selected diagram type. Optional for adapters/autodetect, but explicit canonical types are more robust."
          ),
        dsl: z.string().describe("The DSL source text to validate."),
      },
    },
    async ({ type, dsl }) => ({
      content: [{ type: "text", text: JSON.stringify(validateDsl(type, dsl), null, 2) }],
    })
  );

  server.registerTool(
    "renderDsl",
    {
      title: definitions.renderDsl.title,
      description: definitions.renderDsl.description,
      inputSchema: {
        type: z
          .string()
          .optional()
          .describe("Selected diagram type. Prefer passing it once chosen."),
        dsl: z.string().describe("The DSL source text to render."),
        theme: z.string().optional().describe("Theme name, e.g. 'default'."),
        padding: z.number().optional().describe("Outer padding in pixels."),
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK's CallToolResult content is a strict discriminated union; our helper returns the same shape but typed loosely so it can be shared with the HTTP route. Trust at the boundary.
    async ({ type, dsl, theme, padding }) =>
      buildRenderDslContent(renderDsl(type, dsl, { theme, padding })) as any
  );

  server.registerTool(
    "getDiagramCapabilities",
    {
      title: definitions.getDiagramCapabilities.title,
      description: definitions.getDiagramCapabilities.description,
      inputSchema: { type: z.string().describe("Diagram type id.") },
    },
    async ({ type }) => ({
      content: [{ type: "text", text: JSON.stringify(getDiagramCapabilities(type), null, 2) }],
    })
  );

  server.registerTool(
    "inspectDiagram",
    {
      title: definitions.inspectDiagram.title,
      description: definitions.inspectDiagram.description,
      inputSchema: {
        type: z.string().optional(),
        dsl: z.string().describe("Existing Schematex DSL source."),
      },
    },
    async ({ type, dsl }) => ({
      content: [{ type: "text", text: JSON.stringify(inspectDiagram(type, dsl), null, 2) }],
    })
  );

  server.registerTool(
    "applyDiagramEdits",
    {
      title: definitions.applyDiagramEdits.title,
      description: definitions.applyDiagramEdits.description,
      inputSchema: {
        type: z.string().optional(),
        dsl: z.string(),
        revision: z.number().int().nonnegative(),
        edits: z.array(z.discriminatedUnion("op", [
          z.object({ target: z.string(), op: z.literal("setLabel"), value: z.string() }),
          z.object({ target: z.string(), op: z.literal("setPosition"), x: z.number(), y: z.number() }),
        ])).min(1).max(50),
      },
    },
    async ({ type, dsl, revision, edits }) => ({
      content: [{
        type: "text",
        text: JSON.stringify(applyDiagramEdits(type, dsl, revision, edits as DiagramEdit[]), null, 2),
      }],
    })
  );

  return server;
}
