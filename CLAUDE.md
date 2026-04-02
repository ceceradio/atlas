# Atlas Communesoft

AI-powered multi-user conversational platform. Monorepo with an Express/TypeScript backend (`api/`), a Next.js 13 frontend (`next/`), NGINX reverse proxy, PostgreSQL, and Redis — all orchestrated via Docker Compose.

---

## Repository Layout

```
atlas-communesoft/
├── api/          # Express REST + WebSocket server (port 3001/3002)
├── next/         # Next.js 13 App Router frontend (port 3000)
├── nginx/        # NGINX reverse proxy (HTTP 880 → HTTPS 8443)
├── Dockerfile    # Single image, runs both api + next
└── docker-compose.yml
```

Shared TypeScript interfaces live in `api/src/interface/` and are imported by the frontend via the `@atlas/api` path alias defined in `next/tsconfig.json`.

---

## Common Commands

Run from the **project root** unless noted.

| Command | Purpose |
|---|---|
| `npm run docker` | Start full dev stack (all containers) |
| `npm run docker-reset` | Tear down containers + volumes |
| `npm run docker-setup` | Generate SSL cert + update `/etc/hosts` |
| `npm run start-node` | Run api + next locally without Docker |
| `npm run test` | Run all tests |
| `npm run make-migration` | Generate TypeORM migration from entity changes |
| `npm run repl` | Start interactive REPL with API context loaded |

**API only** (`cd api`):

```bash
npm start          # nodemon, watches src/
npm test           # Jest (*.spec.ts)
npm run repl       # ts-node REPL with env + TypeORM
```

**Next.js only** (`cd next`):

```bash
npm run dev        # hot reload dev server
npm run build      # production build
npm run lint       # ESLint
```

---

## Environment Files

- `.env.api` — API secrets (DB credentials, Auth0, OpenAI key, Discord token)
- `.env.next` — Frontend Auth0 config (public, safe to commit template)
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

### Frontend (`next/`)

- **Framework**: Next.js 13 App Router
- **UI**: Chakra UI + Framer Motion
- **Auth**: `@auth0/auth0-react` wrapped in `next/src/helpers/Providers.tsx`
- **Real-time**: `react-use-websocket` connects to the API WebSocket
- **Path aliases**: `@/` → `next/src/`, `@atlas/api` → `../api/src`
- Pages are under `next/src/app/`; conversation detail is at `zone/conversation/[uuid]/page.tsx`

### NGINX Routing

| Path | Upstream |
|---|---|
| `/ws/*` | API WebSocket (`localhost:3002`) |
| `/api/*` | API REST (`localhost:3001`) |
| `/` | Next.js (`localhost:3000`) |

---

## Conventions

- **TypeScript strict mode** throughout; experimental decorators enabled for TypeORM
- **Tests**: Jest with `ts-jest`, files named `*.spec.ts`
- **Linting**: ESLint + Prettier (configs at root and per-package)
- **Async**: Prefer async/await; AI recursion in `Atlas.ts` uses recursive async methods
- **Error handling**: Global Express error middleware in `api/src/app/errors.ts` — must be registered last
- **Migrations**: Generate with `npm run make-migration` from root; migration files go in `api/src/migration/`
- **CLI scripts**: `api/src/cli/` — invoked via `npx ts-node ./src/cli <command>`

---

## Local Dev Access

After `npm run docker-setup` + `npm run docker`:

- <https://local.atlasai.zone:8443>
- <http://local.atlasai.zone:880> (redirects to HTTPS)
