/**
 * Typed environment/config loading for the gateway.
 *
 * Step 0 only needs the HTTP listen address, but we also load the Postgres and
 * Redis connection details here so later steps (proxy, policy, vault, audit)
 * have a single typed source of truth. NOTHING in this step actually connects
 * to Postgres or Redis — these values are parsed and held, not used yet.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

/**
 * Resolve the entry script of the locally-installed filesystem reference server
 * (node_modules/@modelcontextprotocol/server-filesystem). Used as the default
 * downstream so the gateway runs the pinned local copy directly — no npx, no
 * network, no dependence on cwd or PATH.
 */
function resolveLocalFilesystemServer(): string {
  const pkgJson = require.resolve('@modelcontextprotocol/server-filesystem/package.json');
  return join(dirname(pkgJson), 'dist', 'index.js');
}

export interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface RedisConfig {
  url: string;
}

/**
 * The single downstream MCP server the gateway proxies to (Step 1).
 * Launched as a stdio subprocess: `command` plus `args`. Later steps add a
 * pool of multiple downstream servers; for now it is exactly one.
 */
export interface DownstreamServerConfig {
  command: string;
  args: string[];
}

export interface Config {
  /** HTTP port the gateway listens on. */
  port: number;
  /** Bind address. 0.0.0.0 so the container is reachable from the host. */
  host: string;
  postgres: PostgresConfig;
  redis: RedisConfig;
  /** Downstream MCP server to proxy to (Step 1, stdio transport). */
  downstream: DownstreamServerConfig;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got "${raw}"`);
  }
  return parsed;
}

function envString(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

/**
 * Parse a space-separated argument string into an array; empty -> fallback.
 * The fallback is lazy so it is only computed (and any module resolution it does
 * only runs) when no override is supplied.
 */
function envArgs(name: string, fallback: () => string[]): string[] {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback();
  }
  return raw.trim().split(/\s+/);
}

export function loadConfig(): Config {
  return {
    port: envInt('GATEWAY_PORT', 8080),
    host: envString('GATEWAY_HOST', '0.0.0.0'),
    postgres: {
      host: envString('POSTGRES_HOST', 'postgres'),
      port: envInt('POSTGRES_PORT', 5432),
      user: envString('POSTGRES_USER', 'gateway'),
      password: envString('POSTGRES_PASSWORD', ''),
      database: envString('POSTGRES_DB', 'gateway'),
    },
    redis: {
      url: envString('REDIS_URL', 'redis://redis:6379'),
    },
    downstream: {
      // Default: run the locally-installed filesystem reference server directly
      // with the current Node binary, serving the gateway's working directory
      // (which always exists, so the demo just works).
      command: envString('MCP_DOWNSTREAM_COMMAND', process.execPath),
      args: envArgs('MCP_DOWNSTREAM_ARGS', () => [
        resolveLocalFilesystemServer(),
        process.cwd(),
      ]),
    },
  };
}
