/**
 * Agent-facing MCP SERVER.
 *
 * The gateway presents itself as a standard MCP server toward the agent. Step 1
 * supports STDIO transport only (HTTP transport comes later). This module owns
 * construction of the low-level Server and its stdio transport; the actual
 * request handling (the proxy) is wired up separately in proxy.ts so that later
 * steps can insert policy/auth/audit between the two sides.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

/** Build the agent-facing MCP server advertising the given capabilities. */
export function createGatewayServer(capabilities: ServerCapabilities): Server {
  return new Server(
    { name: 'mcp-access-gateway', version: '0.0.0' },
    { capabilities },
  );
}

/** Connect the server to STDIO so an agent can speak MCP to it over stdin/stdout. */
export async function startStdioServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
