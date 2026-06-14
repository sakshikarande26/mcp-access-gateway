# mcp-access-gateway

A self-hosted access gateway that sits between your AI agents and the MCP tool
servers they call. Give every agent its own scoped identity, keep real
credentials out of agent hands, and get an audit trail of every tool call.

## Why

Teams are wiring AI agents into real systems — Stripe, Gmail, internal APIs —
and today that usually means copying one shared API key into every agent's
environment. Any compromised, buggy, or prompt-injected agent then has the full
blast radius of that key, and there's no record of which agent did what.

mcp-access-gateway adds the missing layer: per-agent identity, least-privilege
policy, credential vaulting, and audit logging — without changing the agents or
the downstream tools. The gateway speaks MCP on both sides, so it drops in
transparently.

## Who it's for

Small teams running agents in production who are too early for an enterprise
identity platform but too exposed to keep sharing static keys.

## Status

Early development. Working toward the first usable release.

- [x] Transparent MCP proxy (stdio)
- [ ] Agent identity
- [ ] Audit logging
- [ ] Policy engine (allow / deny)
- [ ] Credential vault
- [ ] Live revocation
- [ ] Config + validation

## Roadmap

| Step | Component | Status |
|------|-----------|--------|
| 0 | Chassis (Docker Compose: gateway, Postgres, Redis, health check) | Planned |
| 1 | Transparent MCP proxy (no policy) | Planned |
| 2 | Agent identity | Planned |
| 3 | Audit logging | Planned |
| 4 | Policy engine (allow / deny) | Planned |
| 5 | Credential vault | Planned |
| 6 | Live revocation | Planned |
| 7 | Config + validation polish | Planned |

## Running locally

Prerequisites: Docker + Docker Compose (for the full stack), or Node.js 20 (for
local gateway iteration). Node 20 matches the `node:20-alpine` image used in
Docker and is pinned in `.nvmrc` — run `nvm use` to select it.

```sh
# 1. Configure environment
cp .env.example .env        # then edit .env; it is gitignored

# 2a. Full stack (gateway + Postgres + Redis)
docker-compose up --build

# 2b. Or just the gateway, locally with hot reload
npm install
npm run dev
```

Verify:

```sh
curl localhost:8080/health                                  # -> {"status":"ok"}
docker-compose exec postgres pg_isready -U gateway -d gateway  # -> accepting connections
docker-compose exec redis redis-cli ping                    # -> PONG
```

> Step 0 stands up Postgres and Redis but the gateway does not use them yet;
> later steps add the MCP proxy, policy, vault, and audit log.

## License

Apache 2.0
