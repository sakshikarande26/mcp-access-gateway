/**
 * Typed environment/config loading for the gateway.
 *
 * Step 0 only needs the HTTP listen address, but we also load the Postgres and
 * Redis connection details here so later steps (proxy, policy, vault, audit)
 * have a single typed source of truth. NOTHING in this step actually connects
 * to Postgres or Redis — these values are parsed and held, not used yet.
 */

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

export interface Config {
  /** HTTP port the gateway listens on. */
  port: number;
  /** Bind address. 0.0.0.0 so the container is reachable from the host. */
  host: string;
  postgres: PostgresConfig;
  redis: RedisConfig;
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
  };
}
