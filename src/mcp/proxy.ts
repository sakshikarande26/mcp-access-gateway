/**
 * Proxy/router connecting the agent-facing server to the downstream client.
 *
 * This is the seam where Step 1 is intentionally a TRANSPARENT pass-through:
 * each agent request is relayed to the downstream server and its result relayed
 * back, UNCHANGED. Later steps (auth, policy, audit) hook in exactly here —
 * between receiving the agent's request and forwarding it downstream — without
 * touching either the server or client modules.
 */
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type ServerCapabilities,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { DownstreamClient } from './client.js';

/**
 * Mirror the downstream server's capabilities so the gateway advertises to the
 * agent exactly what the downstream actually supports (transparent surface).
 */
export function mirrorCapabilities(
  downstream: ServerCapabilities | undefined,
): ServerCapabilities {
  const capabilities: ServerCapabilities = {};
  if (downstream?.tools) {
    capabilities.tools = {};
  }
  if (downstream?.resources) {
    capabilities.resources = {};
  }
  return capabilities;
}

/**
 * Register request handlers that transparently relay agent requests to the
 * downstream client. Only handlers for capabilities the downstream supports are
 * registered.
 */
export function registerProxyHandlers(
  server: Server,
  downstream: DownstreamClient,
): void {
  const caps = downstream.capabilities();

  if (caps?.tools) {
    // tools/list: ask downstream, relay the tool list back to the agent.
    server.setRequestHandler(ListToolsRequestSchema, (request) =>
      downstream.listTools(request.params),
    );
    // tools/call: forward name + arguments unmodified, relay the result back.
    server.setRequestHandler(CallToolRequestSchema, (request) =>
      downstream.callTool(request.params),
    );
  }

  if (caps?.resources) {
    server.setRequestHandler(ListResourcesRequestSchema, (request) =>
      downstream.listResources(request.params),
    );
    server.setRequestHandler(ReadResourceRequestSchema, (request) =>
      downstream.readResource(request.params),
    );
  }
}
