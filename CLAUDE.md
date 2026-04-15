# Atlas Communesoft

AI-powered multi-user conversational platform. Monorepo with an Express/TypeScript backend (`api/`), a Vite/React frontend (`vite/`), NGINX reverse proxy, PostgreSQL, Redis, and Langfuse — all orchestrated via Docker Compose.

---

## Repository Layout

```
atlas-communesoft/
├── api/          # Express REST + WebSocket server (port 3001/3002)
├── vite/         # Vite + React frontend (port 3004)
├── nginx/        # NGINX reverse proxy (HTTPS 8443)
├── Dockerfile    # Single image, runs both api + vite
└── docker-compose.yml
```

Shared TypeScript interfaces live in `api/src/interface/` and are imported by the frontend via the `@atlas/api` path alias (defined in `vite/package.json` as `"@atlas/api": "file:../api"`).

---

## Common Commands

Run from the **project root** unless noted.

| Command | Purpose |
|---|---|
| `npm run docker` | Start full dev stack (all containers) |
| `npm run docker-reset` | Tear down containers + volumes |
| `npm run docker-setup` | Generate SSL cert |
| `npm run start-node` | Run api + vite locally without Docker |
| `npm run test` | Run all tests |
| `npm run make-migration` | Generate TypeORM migration from entity changes |
| `npm run run-migrations` | Run pending TypeORM migrations against local DB |
| `npm run repl` | Start interactive REPL with API context loaded |

**API only** (`cd api`):

```bash
npm start          # nodemon, watches src/
npm test           # Jest (*.spec.ts)
npm run repl       # ts-node REPL with env + TypeORM
npm run cli <command> [--flags]  # run a CLI script (connects to local DB/Redis/VLLM)
```

**CLI commands** (`cd api && npm run cli <command>`):

The `cli` script sets `PGHOST=localhost`, `REDIS_HOST=localhost`, and `VLLM_HOST=localhost` automatically, so it works against a locally exposed stack (e.g. Docker with forwarded ports or `npm run start-node`).

| Command | Args | Purpose |
|---|---|---|
| `listUsers` | — | List all registered users |
| `registerUser` | `--uuid <uuid> --name <name>` | Register a new user |
| `registerOrganization` | `--name <name>` | Create an organization |
| `retitleConversation` | `--uuid <uuid>` | Re-run title generation for a conversation |
| `responseEvaluation` | `--uuid <uuid>` | Evaluate AI response for a conversation |
| `respond` | `--uuid <uuid>` | Trigger an AI response for a conversation |
| `seedChoreDefinitions` | — | Seed the chore definitions table |
| `backfillChoreEmbeddings` | — | Backfill embeddings for existing chore definitions |
| `testChoreMatching` | — | Run labeled accuracy test for chore definition matching |

Example:

```bash
cd api
npm run cli testChoreMatching
npm run cli registerUser -- --uuid abc-123 --name "Alice"
```

**Vite only** (`cd vite`):

```bash
npm run dev        # hot reload dev server (port 3004)
npm run build      # production build
```

---

## Environment Files

- `.env.api` — API secrets (DB credentials, Auth0, OpenAI key, Discord token)
- `.env.vite` — Frontend Auth0 config (`VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENTID`, `VITE_AUTH0_REDIRECT_URI`, `VITE_AUTH0_AUDIENCE`)
- Templates: `.env.api.template`, `.env.next.template`

Set `LOCAL=true` in `.env.api` to switch the AI backend from OpenAI to a local-compatible endpoint.

---

## Architecture

### Backend (`api/`)

- **Framework**: Express 5 (beta)
- **ORM**: TypeORM with `synchronize: true` — schema auto-syncs from entity changes (no migration needed in dev)
- **Entities**: `User`, `Conversation`, `Message`, `Organization`, `Depository`, `Servicer`, `AuthProfile`, etc.
- **Auth**: Auth0 JWT via `express-oauth2-jwt-bearer`; user injected via middleware in `api/src/app/authorize.ts`
- **WebSocket**: Custom `AtlasWebsocketServer` in `api/src/ws/`; messages use an `Antennae` pattern per organization
- **Job Queue**: Bull + Redis (`api/src/queue/`) for async message processing
- **Plugins**: Discord bot + trading data via `api/src/plugins/AtlasPlugins`
- **Path alias**: `@/` → `api/src/`

### AI Core (`api/src/atlas/`)

`Atlas.ts` is the central AI handler. There are three ways to invoke it, depending on what you need:

---

#### 1. `Atlas.processRequest(request, tracer?)` — Full conversation response loop

The standard entry point for conversational responses. Builds an `IAtlasResponse`, calls `getAIResponse` internally, and returns all accumulated messages.

```ts
const response = await Atlas.processRequest({
  messages,           // IAtlasMessage[] — full chat history
  currentUser,        // { id, name }
  assistant,          // IAssistant — provides system prompt + tool list
  transceiver?,       // optional: streams events to a WebSocket
}, tracer?)
// → IAtlasResponse { messages: IAtlasMessage[] }
```

The AI runs **recursively** — if it calls tools, their responses are appended to messages and the loop continues until the AI produces a plain text reply with no more tool calls.

Used by: the main WebSocket message handling pipeline.

---

#### 2. `Atlas.processToolRequest(tool, systemMessage, messages, userName?, tracer?)` — Force a specific tool call, return typed result

Convenience wrapper for when you want to extract structured data. The AI is given exactly one tool and must call it. Returns the tool's typed `ReturnType` directly (not a message array).

```ts
const result = await Atlas.processToolRequest(
  myTool,           // ITool<Args, ReturnType>
  systemMessage,    // string
  messages,         // string[] — converted to user messages internally
  userName?,        // optional display name
  tracer?,
)
// → ReturnType (whatever the tool returns)
```

Used by: nothing directly at the moment, but it's the clean public API for one-shot structured extraction.

---

#### 3. `Atlas.getAIResponse(request, response?, tracer?)` — Low-level recursive core

The actual implementation both methods above delegate to. Can be called directly when you need fine-grained control. The request type determines the mode:

- **`IAtlasAssistantRequest`** (no `tool` field) → normal loop; AI picks freely from the assistant's tool list and recurses until done. Collected messages accumulate in `response`.
- **`IAtlasCallToolRequest`** (has a `tool` field) → forced single-tool mode; returns `Promise<ReturnType>` of that tool the moment the AI calls it.

```ts
// Forced tool call — typed return value
const value = await Atlas.getAIResponse(
  { messages, currentUser, assistant, tool: myTool },
  response,
  tracer,
) // → ReturnType

// Free response loop — side-effects into response.messages
await Atlas.getAIResponse(
  { messages, currentUser, assistant },
  response,
  tracer,
)
```

Used directly by: `ShouldAtlasRespond` (forced tool → `boolean`) and `TitleConversation` (free loop → reads first assistant message from `response`).

---

#### Building an assistant or tool

- **`IAssistant`** — implement `onSystemMessage()` (returns the system `IAtlasMessage`) and `getTools()`.  
  Use `SystemMessageAssistantFactory(systemPrompt, tools?)` to create one from a plain string.
- **`ITool<Args, ReturnType>`** — implement `name`, `description`, `arguments` (JSON Schema), and `call(request, response, args)`.

Built-in assistants live in `api/src/atlas/assistants/`:
- `AtlasAssistant` — main conversational assistant
- `ShouldRespondAssistant` + `ShouldRespondTool` → `ShouldAtlasRespond(chatString)` → `boolean`
- `TitleConversationAssistant` → `TitleConversation(conversation)` → `string`

AI backend is swappable: `OpenAICompatibility` (default) vs `LocalCompatibility` (set `LOCAL=true`). Observability via Langfuse (`ITracer`).

### Frontend (`vite/`)

- **Framework**: Vite + React 18 (replaced Next.js 13)
- **Routing**: `react-router-dom` v6; pages under `vite/src/app/pages/`; conversation detail at `/zone/conversation/:uuid`
- **UI**: Chakra UI + Framer Motion
- **Auth**: `@auth0/auth0-react` wrapped in `vite/src/helpers/Providers.tsx`; env vars prefixed `VITE_AUTH0_*`
- **State**: Redux Toolkit + RTK Query (`vite/src/store/atlasApi.ts`) for all API calls
- **Real-time**: `react-use-websocket` connects to the API WebSocket
- **Path alias**: `@/` → `vite/src/`, `@atlas/api` → `../api`
- **Dates**: All timestamps stored as UTC; rendered in `America/New_York` (Eastern) using `toLocaleDateString`/`toLocaleString` with `{ timeZone: 'America/New_York' }`

### NGINX Routing

| Path | Upstream |
|---|---|
| `/ws/*` | API WebSocket (`atlas:3002`) |
| `/api/*` | API REST (`atlas:3001`) |
| `/` | Vite (`atlas:3004`) |

Server name: `chocolate.local` (resolves via mDNS, no hosts entry needed).

---

## Conventions

- **TypeScript strict mode** throughout; experimental decorators enabled for TypeORM
- **Tests**: Jest with `ts-jest`, files named `*.spec.ts`
- **Linting**: ESLint + Prettier (configs at root and per-package)
- **Async**: Prefer async/await; AI recursion in `Atlas.ts` uses recursive async methods
- **Error handling**: Global Express error middleware in `api/src/app/errors.ts` — must be registered last
- **Migrations**: Generate with `npm run make-migration` from root; migration files go in `api/src/migration/`
- **CLI scripts**: `api/src/cli/` — invoked via `npm run cli <command>` from the `api/` directory

---

## Local Dev Access

After `npm run docker-setup` + `npm run docker`:

- <https://chocolate.local:8443>
