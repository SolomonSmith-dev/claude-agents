# claude-agents — System Specification

## What This Is

A local multi-agent orchestration backend. Claude agents receive tasks via an HTTP API,
process them using the Anthropic SDK with multi-turn reasoning, and queue async jobs
via BullMQ + Redis. State is persisted to SQLite. Designed to run as a home server daemon.

## Tech Stack

| Layer | Tech | Purpose |
|---|---|---|
| LLM | `@anthropic-ai/sdk` | Claude API calls, streaming, tool use |
| Queue | `bullmq` + `ioredis` | Async job processing, retry, priority |
| State | `better-sqlite3` | Persistent agent state, task history |
| Server | `express` | HTTP API to trigger/query agents |
| Logging | `pino` + `pino-pretty` | Structured JSON logs |
| Runtime | Node >= 20, ESM | Top-level await, module imports |

## Architecture

```
HTTP Request
     │
     ▼
Express API (port 3100)
     ├── POST /agents/:id/run    → enqueue job
     ├── GET  /agents/:id/status → query state
     └── GET  /agents/list       → list all agents
     │
     ▼
BullMQ Queue (Redis)
     │
     ▼
Worker (src/queue/worker.js)
     ├── Loads agent config from SQLite
     ├── Runs Claude SDK multi-turn loop (MAX_TURNS=30)
     ├── Executes tool calls (bash, file, fetch)
     └── Writes results + state back to SQLite
     │
     ▼
SQLite DB (state/agents.db)
  Tables: agents, runs, turns, tool_calls
```

## File Structure to Build

```
src/
  index.js             — Express server entry
  agents/
    loader.js          — Load agent configs from DB or YAML
    runner.js          — Core multi-turn Claude loop
  queue/
    queue.js           — BullMQ queue definitions
    worker.js          — Job consumer
  tools/
    registry.js        — Map tool names → handlers
    bash.js            — Shell execution (sandboxed)
    file.js            — Read/write local files
    fetch.js           — HTTP requests
  db/
    schema.js          — SQLite init + migrations
    queries.js         — Typed query helpers
  api/
    routes.js          — Express route handlers
config/
  agents.yaml          — Agent definitions
```

## SQLite Schema (build first)

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT,
  model TEXT,
  system_prompt TEXT,
  tools TEXT,         -- JSON array
  max_turns INTEGER,
  created_at INTEGER
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  status TEXT,        -- queued | running | done | failed
  input TEXT,
  output TEXT,
  started_at INTEGER,
  finished_at INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  turn_number INTEGER,
  role TEXT,          -- user | assistant
  content TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE TABLE tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  turn_id INTEGER,
  tool_name TEXT,
  input TEXT,         -- JSON
  output TEXT,        -- JSON
  duration_ms INTEGER
);
```

## Agent Config (config/agents.yaml)

```yaml
agents:
  - id: sauron
    name: "Sauron"
    model: claude-opus-4-6
    system_prompt: |
      You are Sauron, Solomon's personal AI assistant...
    tools: [bash, file, fetch]
    max_turns: 30
    priority: 1

  - id: researcher
    name: "Researcher"
    model: claude-sonnet-4-6
    system_prompt: |
      You are a research agent. Given a topic, produce a structured report.
    tools: [fetch]
    max_turns: 10
    priority: 2
```

## Build Order

1. `src/db/schema.js` — SQLite init + migrate()
2. `src/db/queries.js` — insertRun, updateRunStatus, appendTurn, logToolCall
3. `src/tools/registry.js` + bash.js, file.js, fetch.js
4. `src/agents/runner.js` — multi-turn Claude loop
5. `src/queue/queue.js` + `worker.js`
6. `src/api/routes.js` + `src/index.js`
7. `config/agents.yaml` + `src/agents/loader.js`
8. End-to-end test: POST /agents/sauron/run

## Kickoff Prompt for Claude Code

Paste this to start:

---
I'm building a local multi-agent orchestration system called claude-agents.
Stack: Node 20 ESM, Anthropic SDK, BullMQ + Redis, better-sqlite3, Express, pino.
Read SPEC.md first. Start with step 1: build src/db/schema.js — SQLite init
and a migrate() function that creates all 4 tables if they don't exist.
Use better-sqlite3. Then build src/db/queries.js with typed helpers for all
CRUD operations on those tables. Full error handling required.
---
