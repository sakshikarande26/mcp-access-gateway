/**
 * Downstream-facing MCP CLIENT.
 *
 * The gateway acts as an MCP client toward ONE downstream MCP server, launched
 * as a stdio subprocess. This module owns that connection and exposes the MCP
 * methods we proxy. Params and results pass through UNCHANGED — this layer does
 * not inspect, validate, or transform payloads (policy/auth/audit arrive in
 * later steps, inserted in the proxy/router, not here).
 *
 * Kept deliberately separate from the agent-facing server (see server.ts).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  CallToolRequest,
  ListResourcesRequest,
  ListResourcesResult,
  ListToolsRequest,
  ListToolsResult,
  ReadResourceRequest,
  ReadResourceResult,
  ServerCapabilities,
} from '@modelcontextprotocol/sdk/types.js';

import type { DownstreamServerConfig } from '../config/index.js';

export class DownstreamClient {
  private constructor(private readonly client: Client) {}

  /** Spawn the downstream server and complete the MCP handshake. */
  static async connect(cfg: DownstreamServerConfig): Promise<DownstreamClient> {
    const transport = new StdioClientTransport({
      command: cfg.command,
      args: cfg.args,
    });
    const client = new Client(
      { name: 'mcp-access-gateway/downstream-client', version: '0.0.0' },
      { capabilities: {} },
    );
    await client.connect(transport);
    return new DownstreamClient(client);
  }

  /** Capabilities reported by the downstream server during the handshake. */
  capabilities(): ServerCapabilities | undefined {
    return this.client.getServerCapabilities();
  }

  // --- Proxied MCP methods (transparent pass-through) ---

  listTools(params?: ListToolsRequest['params']): Promise<ListToolsResult> {
    return this.client.listTools(params);
  }

  // Return type is inferred from the SDK (a CallToolResult, possibly widened to
  // a legacy compatibility shape). We relay it unchanged rather than re-narrow.
  callTool(params: CallToolRequest['params']) {
    return this.client.callTool(params);
  }

  listResources(params?: ListResourcesRequest['params']): Promise<ListResourcesResult> {
    return this.client.listResources(params);
  }

  readResource(params: ReadResourceRequest['params']): Promise<ReadResourceResult> {
    return this.client.readResource(params);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
