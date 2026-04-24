#!/usr/bin/env node
/**
 * Schematex MCP server — stdio transport.
 *
 * Invoked via `npx @schematex/mcp`. Pipes to the connected MCP client
 * (Claude Desktop, Cursor, Windsurf, any stdio-speaking MCP host).
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSchematexMcpServer } from "./server.js";

async function main() {
  const server = createSchematexMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP server runs for the lifetime of the stdio connection.
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[schematex-mcp] fatal:", err);
  process.exit(1);
});
