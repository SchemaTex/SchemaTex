/**
 * Transport-agnostic Schematex MCP server factory.
 *
 * Produces a fully-wired `McpServer` instance with all five Schematex tools
 * registered. The stdio bin (bin.ts) and the hosted HTTP route (in the
 * website repo) both call this same factory to avoid drift.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listDiagrams,
  getSyntax,
  getExamples,
  validateDsl,
  renderDsl,
} from "schematex/ai";
import { buildRenderDslContent } from "./render-content.js";

const NAME = "schematex";
const VERSION = "0.1.0";

export function createSchematexMcpServer(): McpServer {
  const server = new McpServer({
    name: NAME,
    version: VERSION,
  });

  server.registerTool(
    "listDiagrams",
    {
      title: "List Schematex diagrams",
      description:
        "List every Schematex diagram type with a tagline, 'use when' hint, domain cluster, and authoritative standard. Call this first to discover what's available.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(listDiagrams(), null, 2) }],
    })
  );

  server.registerTool(
    "getSyntax",
    {
      title: "Get diagram syntax reference",
      description:
        "Return syntax for one diagram type. Default `detail: canonical` is the compact first-shot generation path: canonical header, preferred forms, rules, and repair checks. Request `detail: reference` only for advanced forms or imported adapters after choosing a type.",
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
      title: "Get curated DSL examples",
      description:
        "Return curated real-world DSL examples for a diagram type, each with scenario notes and tags. Use as few-shot context before generating DSL.",
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
      title: "Validate Schematex DSL",
      description:
        "Validate Schematex DSL. Pass the selected diagram `type` whenever you know it. Returns { ok: true } or { ok: false, errors: [{line, column, message, source, hint}] }. Call before returning DSL and self-correct on errors.",
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
      title: "Render DSL to SVG",
      description:
        "Render Schematex DSL to a diagram. Returns a PNG image (the final artifact — display as-is, do not redraw) plus the original SVG as an embedded resource for editing. On error, returns { ok: false, errors } as text.",
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

  return server;
}
