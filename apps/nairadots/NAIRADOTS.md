# NairaDots — NairaTag's Personal Agent Workspace

NairaDots is an isolated agent workspace that sits alongside the NairaTag Arc mini-app.
It is built on top of **[OpenDots](https://github.com/CopilotKit/OpenDots)** (CopilotKit) and
connects to NairaTag's existing agent infrastructure — it does **not** create a competing agent
registry or duplicate agent identities.

---

## Architecture

```
apps/nairadots/
├── opendots/          <- OpenDots agent runtime (TypeScript, Hono, SQLite)
│   ├── src/server/   <- Hono API + DotAgent (CopilotKit Intelligence)
│   ├── src/client/   <- React 19 UI (Chat, Workspace, Connections)
│   └── .env          <- Local config (NairaTag API URL, keys)
├── src/              <- NairaDots portal UI (forked from Arc)
├── vercel.json       <- Deployment config for nairadots.nairatag.ng
└── NAIRADOTS.md      <- You are here
```

**NairaTag agent layer** (shared, not duplicated):
- api/hub-api.js  -- NairaTag Hub routes (agents, tasks, leaderboard)
- lib/supabase.js -- Tag resolution, arc_agents table

---

## Phase 1 Goal (Proof of Life)

> Open NairaDots -> discover one existing NairaTag agent -> open a conversation
> -> receive a real response -> execute one authorized skill.

This is the **only** acceptance criterion for Phase 1.

---

## Development Entry Point

### 1. Set up OpenDots (agent backend)

```bash
cd apps/nairadots/opendots
cp .env .env.local          # fill in INTELLIGENCE_API_KEY and OPENAI_API_KEY
node --version              # must be >= 24.0.0
npm install
npm run dev                 # runs Hono server on :4310 + Vite UI on :5173
```

### 2. Set up NairaDots portal (optional, for nairadots.nairatag.ng UI)

```bash
cd apps/nairadots
npm install
npm run dev                 # Vite on :5174
```

### 3. Verify Phase 1

1. Open http://localhost:5173 (OpenDots UI)
2. Go through setup, paste your INTELLIGENCE_API_KEY
3. Type: "List all NairaTag agents"
4. Agent should respond with data from https://nairatag.ng/api/agents
5. Ask the agent to execute a skill (e.g., resolve a NairaTag handle)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| INTELLIGENCE_API_KEY | Yes | CopilotKit Cloud key |
| OPENAI_API_KEY | Yes | LLM backend |
| NAIRATAG_API_URL | Yes | NairaTag Hub API base |
| SUPABASE_URL | Optional | For direct DB access |
| SUPABASE_ANON_KEY | Optional | For direct DB access |

Full list: see opendots/.env

---

## Integration Rules (Michealoxm Brief)

- NairaDots uses NairaTag's existing agent infrastructure -- do not create a new registry
- OpenDots is forked, not rebuilt -- extend DotAgent, do not replace it
- Conversations persist via OpenDots SQLite store (data/nairadots.sqlite)
- Existing NairaTag tests still pass -- NairaDots is isolated in apps/nairadots/
- Do NOT run npm install in opendots from root -- install separately inside opendots/

---

## Deployment

NairaDots will be deployed to **nairadots.nairatag.ng** via Vercel.

NOTE: OpenDots requires Node >= 24, a persistent server, and SQLite.
The vercel.json serves the portal UI (React SPA).
OpenDots server must be deployed separately (Railway, Fly.io, or VPS) in Phase 2.

---

## Status

- [x] OpenDots cloned into opendots/ (shallow, no install)
- [x] .env pre-configured for NairaTag backend
- [x] Portal UI scaffolded (forked from Arc)
- [ ] Phase 1: Agent discovery + conversation proof
- [ ] Phase 2: NairaTag skill integration (tag resolution, rewards)
- [ ] Phase 3: Production deployment to nairadots.nairatag.ng
