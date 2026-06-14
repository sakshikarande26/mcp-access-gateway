/**
 * Fastify instance construction and route registration.
 *
 * Step 0 registers only the health endpoint. Later steps register the MCP
 * proxy routes, auth hooks, etc. here.
 */
import Fastify, { type FastifyInstance } from 'fastify';

import type { Config } from '../config/index.js';

export function buildServer(_config: Config): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  // GET /health — trivial liveness probe.
  // TODO(step-later): extend this to verify Postgres and Redis reachability
  // (e.g. a readiness check) once those connections exist. For now it only
  // reports that the HTTP server itself is up.
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}
