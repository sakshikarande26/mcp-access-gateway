/**
 * Entrypoint for the agent-facing MCP server over STDIO.
 *
 * An agent (or the MCP Inspector, acting as the agent) spawns THIS process and
 * speaks MCP to it over stdin/stdout. On startup the gateway connects to the
 * configured downstream server, mirrors its capabilities, and proxies requests
 * through transparently.
 *
 * This is a SEPARATE entrypoint from the Step 0 HTTP chassis (src/index.ts) on
 * purpose: stdio transport owns stdout as its JSON-RPC channel, so it cannot
 * share a process with Fastify's stdout logging. The chassis is left untouched.
 *
 * NOTE: never write to stdout here — it would corrupt the MCP stream. All
 * diagnostics go to stderr (visible in the Inspector's stderr pane).
 */
import { loadConfig } from '../config/index.js';
import { DownstreamClient } from './client.js';
import { mirrorCapabilities, registerProxyHandlers } from './proxy.js';
import { createGatewayServer, startStdioServer } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();

  console.error(
    `[gateway] launching downstream: ${config.downstream.command} ${config.downstream.args.join(' ')}`,
  );
  const downstream = await DownstreamClient.connect(config.downstream);

  const capabilities = mirrorCapabilities(downstream.capabilities());
  const server = createGatewayServer(capabilities);
  registerProxyHandlers(server, downstream);

  await startStdioServer(server);
  console.error('[gateway] MCP stdio server ready; proxying to downstream');

  const shutdown = (signal: NodeJS.Signals): void => {
    console.error(`[gateway] received ${signal}, shutting down`);
    void (async () => {
      await server.close();
      await downstream.close();
      process.exit(0);
    })();
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, shutdown);
  }
}

main().catch((err: unknown) => {
  console.error('[gateway] fatal:', err);
  process.exit(1);
});
