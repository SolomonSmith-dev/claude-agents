# claude-agents

A local multi-agent orchestration backend for running autonomous Claude agents on self-hosted hardware. Agents receive tasks via HTTP API, process them using the Anthropic SDK with multi-turn reasoning, and queue async jobs via BullMQ + Redis. State is persisted to SQLite.

Built to run as a home server daemon on a Mac Mini (Debian 12) as part of a larger agent network including a conversational interface (Earendil via OpenClaw) and an orchestration layer (Morgoth).

## Architecture

```
HTTP Request
     │
     ▼
Express API (port 3100)
     ├── POST /agents/:id/run     → enqueue job
     ├── GET  /agents/:id/status  → query state
     └── GET  /agents/list        → list all agents
     │
     ▼
BullMQ Queue (Redis)
     │
     ▼
Worker (src/queue/worker.js)
     ├── Loads agent config from SQLite
     ├── Runs Claude SDK multi-turn loop
     ├── Executes tool calls (bash, file, fetch)
     └── Writes results + state back to SQLite
     │
     ▼
SQLite DB (state/agents.db)
  Tables: agents, runs, turns, tool_calls
```

## Stack

| Layer | Technology |
|-------|-----------|
| LLM | `@anthropic-ai/sdk`: Claude API, streaming, tool use |
| Queue | `bullmq` + `ioredis`: async job processing, retry, priority |
| State | `better-sqlite3`: persistent agent state and task history |
| API | `express`: HTTP interface to trigger and query agents |
| Logging | `pino`: structured JSON logs |
| Runtime | Node.js >= 20, ESM |

## Security

- Shell execution sandboxed via command allowlist (`command-guard.js`): 50+ permitted commands, 30+ blocked patterns
- Protected path enforcement: blocks writes to `/etc/`, `/usr/`, `/bin/`, system directories
- Full audit log at `logs/command-guard.log`
- Redis password authentication on all BullMQ connections
- API bound to `127.0.0.1` only, not externally reachable

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set ANTHROPIC_API_KEY, REDIS_URL, REDIS_PASSWORD in .env

# Start the API server
npm start

# Start a worker (separate process)
npm run worker
```

Designed to run under PM2 for process management and systemd for boot persistence:

```bash
pm2 start src/index.js --name claude-agent-api
pm2 start src/queue/worker.js --name claude-agent-worker
pm2 save
```

## Part of a Larger System

This repo is the task execution layer in a three-agent network:

- **Earendil**: conversational interface + memory layer (OpenClaw, Telegram)
- **Morgoth**: regex-based job router and orchestrator (BullMQ dispatcher)
- **claude-agents (Sauron)**: this repo. Task execution engine.

Named after Sauron, Morgoth's lieutenant in Tolkien's Silmarillion. The executor who carries out what the orchestrator commands.

## License

MIT
