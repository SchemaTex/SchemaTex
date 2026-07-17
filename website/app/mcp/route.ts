/** Hosted, stateless MCP Streamable HTTP endpoint. */
import { createHash } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { put } from "@vercel/blob";
import { NextRequest } from "next/server";
import {
  SCHEMATEX_TOOL_DEFINITIONS,
  applyDiagramEdits,
  getDiagramCapabilities,
  getExamples,
  getSyntax,
  inspectDiagram,
  listDiagrams,
  renderDsl,
  validateDsl,
  type DiagramEdit,
  type RenderDslResult,
  type SchematexToolName,
} from "schematex/ai";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type McpContentBlock = Record<string, unknown>;
interface McpToolResult {
  content: McpContentBlock[];
  isError?: boolean;
}

function extractTitle(dsl: string, type: string): string {
  const match = dsl.match(/^\s*title\s+"([^"]+)"/m);
  const raw = match?.[1] ?? type;
  return raw
    .toLowerCase()
    .replace(/[\s/\\]+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || type;
}

async function renderDslToMcp(args: Record<string, unknown>): Promise<McpToolResult> {
  const dsl = String(args.dsl);
  const result: RenderDslResult = renderDsl(args.type as string | undefined, dsl, {
    theme: args.theme as string | undefined,
    padding: args.padding as number | undefined,
  });
  if (!result.ok) {
    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  const typeLabel = result.type ?? "diagram";
  let blobUrl: string | null = null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const title = extractTitle(dsl, typeLabel);
      const hash = createHash("sha256").update(dsl).digest("hex").slice(0, 8);
      const prefix = `renders/${date}/${title}-${hash}`;
      const [svgBlob] = await Promise.all([
        put(`${prefix}.svg`, result.svg, {
          access: "public",
          addRandomSuffix: false,
          contentType: "image/svg+xml",
        }),
        put(`${prefix}.dsl`, dsl, {
          access: "public",
          addRandomSuffix: false,
          contentType: "text/plain",
        }),
      ]);
      blobUrl = svgBlob.url;
    } catch {
      // Rendering still succeeds when persistent artifact storage is unavailable.
    }
  }

  return {
    content: [
      {
        type: "resource",
        resource: {
          uri: blobUrl ?? `schematex://render/${typeLabel}.svg`,
          mimeType: "image/svg+xml",
          text: result.svg,
        },
      },
      {
        type: "text",
        text: blobUrl
          ? `Rendered ${typeLabel}. Permanent SVG URL: ${blobUrl}`
          : `Rendered ${typeLabel}. The SVG is attached as an embedded resource.`,
      },
    ],
  };
}

const PLAUSIBLE_URL = "https://plausible.ideamarketfit.com/api/event";
const PLAUSIBLE_DOMAIN = "schematex.js.org";

function trackMcpEvent(toolName: string, req: NextRequest, diagramType?: string): void {
  fetch(PLAUSIBLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": req.headers.get("user-agent") ?? "mcp-client",
      "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "127.0.0.1",
    },
    body: JSON.stringify({
      name: "mcp_tool_call",
      url: `https://${PLAUSIBLE_DOMAIN}/mcp`,
      domain: PLAUSIBLE_DOMAIN,
      props: { tool: toolName, ...(diagramType ? { diagramType } : {}) },
    }),
  }).catch(() => {});
}

function jsonContent(value: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

async function executeTool(
  name: SchematexToolName,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  switch (name) {
    case "listDiagrams":
      return jsonContent(listDiagrams());
    case "getSyntax":
      return jsonContent(getSyntax(String(args.type), {
        detail: args.detail as "canonical" | "reference" | undefined,
      }));
    case "getExamples":
      return jsonContent(getExamples(String(args.type), {
        limit: args.limit as number | undefined,
        preferFeatured: args.preferFeatured as boolean | undefined,
        maxComplexity: args.maxComplexity as number | undefined,
      }));
    case "validateDsl":
      return jsonContent(validateDsl(args.type as string | undefined, String(args.dsl)));
    case "renderDsl":
      return renderDslToMcp(args);
    case "getDiagramCapabilities":
      return jsonContent(getDiagramCapabilities(String(args.type)));
    case "inspectDiagram":
      return jsonContent(inspectDiagram(args.type as string | undefined, String(args.dsl)));
    case "applyDiagramEdits":
      return jsonContent(applyDiagramEdits(
        args.type as string | undefined,
        String(args.dsl),
        Number(args.revision),
        args.edits as DiagramEdit[],
      ));
  }
}

function createServer(req: NextRequest): McpServer {
  // We wire the shared JSON-Schema manifest through the SDK's low-level
  // handlers, so declare the capability before registering those handlers.
  const server = new McpServer(
    { name: "schematex", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(SCHEMATEX_TOOL_DEFINITIONS).map((definition) => ({
      name: definition.name,
      title: definition.title,
      description: definition.description,
      inputSchema: definition.inputSchema,
    })),
  }));

  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name as SchematexToolName;
    const definition = SCHEMATEX_TOOL_DEFINITIONS[name];
    if (!definition) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      };
    }
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    trackMcpEvent(name, req, typeof args.type === "string" ? args.type : undefined);
    try {
      return await executeTool(name, args) as never;
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
      };
    }
  });

  return server;
}

function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    const configured = (process.env.MCP_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return [
      "https://schematex.js.org",
      "https://www.schematex.js.org",
      "https://chatgpt.com",
      "https://claude.ai",
      ...configured,
    ].includes(url.origin);
  } catch {
    return false;
  }
}

async function handleMcp(req: NextRequest): Promise<Response> {
  if (!originAllowed(req)) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "Origin not allowed" }, id: null },
      { status: 403 },
    );
  }
  const server = createServer(req);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;
