/**
 * Hosted Schematex MCP endpoint — JSON-RPC over HTTP.
 *
 * Implements the subset of MCP (Model Context Protocol) needed for a
 * stateless tool-only server: `initialize`, `tools/list`, `tools/call`.
 * This bypasses the SDK's Streamable HTTP transport (which expects a
 * Node req/res pair) so it runs natively on Next.js App Router + Vercel
 * Fluid Compute with no bridging.
 *
 * Users connect by pointing any MCP HTTP client at:
 *
 *     https://schematex.js.org/mcp
 *
 * The same five tools are also available via the `@schematex/mcp` npm
 * package for stdio hosts (Claude Desktop etc.).
 */
import { NextRequest } from "next/server";
import {
  listDiagrams,
  getSyntax,
  getExamples,
  validateDsl,
  renderDsl,
} from "schematex/ai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SERVER_INFO = {
  name: "schematex",
  version: "0.1.0",
};

const PROTOCOL_VERSION = "2024-11-05";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

type ToolHandler = (args: Record<string, unknown>) => unknown;

const TOOLS: Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: ToolHandler;
}> = [
  {
    name: "listDiagrams",
    description:
      "List every Schematex diagram type with a tagline, 'use when' hint, domain cluster, and authoritative standard. Call this first to discover what's available.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: () => listDiagrams(),
  },
  {
    name: "getSyntax",
    description:
      "Return a compact syntax reference for one diagram type — rules, grammar (EBNF), and inline examples. Trimmed for LLM consumption (~2,000–4,000 tokens). Call after listDiagrams once you've chosen a type.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Diagram type id." },
      },
      required: ["type"],
    },
    handler: (args) => getSyntax(String(args.type)),
  },
  {
    name: "getExamples",
    description:
      "Return curated real-world DSL examples for a diagram type, each with scenario notes and tags. Use as few-shot context before generating DSL.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Diagram type id." },
        limit: { type: "integer", minimum: 1, maximum: 10 },
        preferFeatured: { type: "boolean" },
        maxComplexity: { type: "integer", minimum: 1, maximum: 5 },
      },
      required: ["type"],
    },
    handler: (args) =>
      getExamples(String(args.type), {
        limit: args.limit as number | undefined,
        preferFeatured: args.preferFeatured as boolean | undefined,
        maxComplexity: args.maxComplexity as number | undefined,
      }),
  },
  {
    name: "validateDsl",
    description:
      "Validate Schematex DSL. Returns { ok: true } or { ok: false, errors }. Call before returning DSL to the user and self-correct on errors.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        dsl: { type: "string" },
      },
      required: ["dsl"],
    },
    handler: (args) => validateDsl(args.type as string | undefined, String(args.dsl)),
  },
  {
    name: "renderDsl",
    description:
      "Render Schematex DSL to an SVG string. Returns { ok: true, svg } or { ok: false, errors }.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        dsl: { type: "string" },
        theme: { type: "string" },
        padding: { type: "number" },
      },
      required: ["dsl"],
    },
    handler: (args) =>
      renderDsl(args.type as string | undefined, String(args.dsl), {
        theme: args.theme as string | undefined,
        padding: args.padding as number | undefined,
      }),
  },
];

function rpcResult(id: string | number | null | undefined, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function rpcError(
  id: string | number | null | undefined,
  code: number,
  message: string,
  data?: unknown
) {
  return Response.json(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code, message, ...(data !== undefined ? { data } : {}) },
    },
    { status: code === -32600 || code === -32601 ? 400 : 200 }
  );
}

async function handleRpc(req: JsonRpcRequest): Promise<Response> {
  switch (req.method) {
    case "initialize":
      return rpcResult(req.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
      // Notifications have no response — per JSON-RPC, return 202.
      return new Response(null, { status: 202 });

    case "ping":
      return rpcResult(req.id, {});

    case "tools/list":
      return rpcResult(req.id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });

    case "tools/call": {
      const params = req.params ?? {};
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) {
        return rpcError(req.id, -32602, `Unknown tool: ${name}`);
      }
      try {
        const result = tool.handler(args);
        return rpcResult(req.id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      } catch (err) {
        return rpcResult(req.id, {
          isError: true,
          content: [
            {
              type: "text",
              text: err instanceof Error ? err.message : String(err),
            },
          ],
        });
      }
    }

    default:
      return rpcError(req.id, -32601, `Method not found: ${req.method}`);
  }
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  // Batch requests — handle each, return array.
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map(async (r) => {
        const resp = await handleRpc(r);
        if (resp.status === 202) return null;
        return await resp.json();
      })
    );
    const nonNull = responses.filter((r) => r !== null);
    return Response.json(nonNull);
  }

  return handleRpc(body);
}

export async function GET() {
  // Some clients GET the endpoint first to probe capabilities.
  return Response.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocolVersion: PROTOCOL_VERSION,
    transport: "http",
    docs: "https://schematex.js.org/docs/ai-integration",
    usage: "POST JSON-RPC 2.0 requests to this endpoint.",
  });
}
