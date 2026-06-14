# mcp-access-gateway — project context for Claude Code

## What this is
A transparent MCP proxy that enforces per-agent access policy and logs every
tool call. It sits between AI agents (MCP clients) and downstream MCP tool
servers. The gateway acts as an MCP server toward agents and an MCP client
toward downstream servers, so it drops in without changing agents or tools.

## Rules for working in this repo (read every session)
- Before creating ANY file, check whether it already exists. NEVER create a
  duplicate, a "v2", a "-new", or a "-copy" variant. Edit the existing file.
- Read a file's current contents before editing it. Do not regenerate from
  memory.
- Follow the structure in this file. Do not invent new top-level folders without
  asking.
- One logical change at a time. Do not refactor or touch unrelated code.
- If unsure whether something exists, search the repo first — don't assume.
- Do not commit automatically. Show changes; the human commits.
- Keep changes minimal and scoped to the current step.

## Stack (confirm against package.json before assuming)
- Language: TypeScript / Node.js (strict mode)
- Gateway HTTP server: Fastify
- MCP: @modelcontextprotocol/sdk (added in Step 1 — server + client, stdio transport)
- Data: Postgres (policy, audit log, credential vault), Redis (cache
  invalidation via pub/sub) — stood up in Step 0, used in later steps
- Package manager: npm
- Deploy: Docker + docker-compose (services: gateway, postgres, redis)

## Architecture (MVP scope)
- Two planes: self-hosted gateway (this repo, OSS data plane) + hosted control
  plane (later). MVP is the gateway running standalone.
- Hot-path request flow: agent call -> authenticate (token -> agent_id) ->
  resolve policy (in-memory cache) -> if allowed, inject downstream credential
  from vault and forward -> stream response back -> write audit log async.
- Policy model: org -> team -> agent hierarchy, most-specific-rule-wins, with
  org-level deny as a hard ceiling. MVP scope: tool-name allow/deny only;
  argument-level constraints come later (design the format to allow this).
- Fail-closed: if the policy store is unreachable, deny rather than allow.

## NFR guardrails
- Policy checks stay off the network on the hot path (in-memory cache,
  target sub-10ms per call).
- Audit-log writes are async and never block the response.
- Revocation propagates within ~1s via Redis pub/sub cache invalidation.
- Gateway holds no durable local state so it can scale horizontally.

## Build order (do steps in sequence; finish and verify each before the next)
0. Chassis — compose stack + health check
1. Transparent MCP proxy (no policy) — riskiest piece, derisk first
2. Agent identity
3. Audit logging (first shippable/useful slice)
4. Policy engine (allow/deny, tool-name only)
5. Credential vault
6. Live revocation (Redis pub/sub)
7. Config + validation polish

## Current repo state (UPDATE this list as files are created)
- README.md — project overview + roadmap + "Running locally" (EXISTS)
- CLAUDE.md — this file (EXISTS)
- .gitignore — Node template + project extras; covers .env, dist, node_modules (EXISTS)
- LICENSE — Apache 2.0 (EXISTS)
- package.json — npm manifest; runtime deps fastify + @modelcontextprotocol/sdk + @modelcontextprotocol/server-filesystem; dev/build/start + mcp:stdio scripts (EXISTS)
- package-lock.json — pinned dependency tree (EXISTS)
- tsconfig.json — strict TypeScript, ES2022 / NodeNext, emits to dist/ (EXISTS)
- .env.example — documented placeholders for every env var incl. downstream MCP server; real .env is gitignored (EXISTS)
- Dockerfile — multi-stage (build TS, run compiled output on node:20-alpine, non-root) (EXISTS)
- docker-compose.yml — gateway + postgres + redis; named volume postgres_data; env-driven, no hardcoded secrets (EXISTS)
- src/index.ts — HTTP chassis entrypoint: load config, build Fastify server, listen, graceful shutdown (EXISTS)
- src/config/index.ts — typed env/config loading (port/host/postgres/redis/downstream); values held, only downstream used so far (EXISTS)
- src/server/index.ts — Fastify instance + route registration; GET /health -> { status: "ok" } (EXISTS)
- src/mcp/client.ts — downstream-facing MCP client; spawns one downstream server (stdio), pass-through listTools/callTool/list+readResource (EXISTS)
- src/mcp/server.ts — agent-facing MCP server construction + stdio transport (EXISTS)
- src/mcp/proxy.ts — router: mirrors downstream capabilities, registers handlers that transparently relay requests (auth/policy/audit seam) (EXISTS)
- src/mcp/stdio.ts — stdio MCP proxy entrypoint the agent/Inspector spawns; separate process from the HTTP chassis (EXISTS)
- db/migrations/.gitkeep — placeholder; raw SQL migrations land here in later steps (EXISTS)

## Commands
- `npm install` — install dependencies.
- `npm run dev` — run the HTTP chassis locally with hot reload (tsx watch).
- `npm run build` — type-check and compile TypeScript to dist/.
- `npm start` — run the compiled HTTP chassis (node dist/index.js).
- `npm run mcp:stdio:dev` — run the stdio MCP proxy from source (tsx).
- `npm run mcp:stdio` — run the compiled stdio MCP proxy (node dist/mcp/stdio.js).
- Inspect the proxy: `npx @modelcontextprotocol/inspector npx tsx src/mcp/stdio.ts`
  (lists/calls the downstream filesystem server's tools THROUGH the gateway).
- `docker-compose up --build` — bring up gateway + postgres + redis.
- Health check: `curl localhost:8080/health` -> 200 `{ "status": "ok" }`.
- Postgres reachable: `docker-compose exec postgres pg_isready -U gateway -d gateway`.
- Redis reachable: `docker-compose exec redis redis-cli ping` -> `PONG`.