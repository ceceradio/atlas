# AGENTS.md

## Quick Start
`npm run docker-setup` first to generate SSL cert, then `npm run docker` to start full dev stack.

## Repo Layout
- `api/` - Express 5 REST + WebSocket backend (port 3001/3002)
- `vite/` - Vite + React 18 frontend (port 3004)
- `nginx/` - Reverse proxy (HTTPS 8443)
- Monorepo: both api + vite in single Dockerfile

## TypeORM
- `synchronize: true` - Schema auto-syncs; no migrations needed in dev
- Generate migrations: `npm run make-migration`
- Migrations live in `api/src/migration/`

## API - Frontend Communication
- Shared interfaces: `api/src/interface/`
- Import via path alias: `@atlas/api` (defined in `vite/package.json` as `"@atlas/api": "file:../api"`)

## Path Aliases
- `@/` → `vite/src/`
- `@atlas/api` → `../api`

## Frontend State
- Redux Toolkit + RTK Query for all API calls (`vite/src/store/atlasApi.ts`)
- Store slices: `authSlice`, `stringsSlice`, `jobsSlice`
- Pages under `vite/src/app/pages/`; routing via `react-router-dom` v6

## Dates and Timezones
- All timestamps stored as UTC in the database
- Frontend renders dates in `America/New_York` (Eastern) using `{ timeZone: 'America/New_York' }` in `toLocaleDateString`/`toLocaleString`

## AI Integration
- Main handler: `api/src/atlas/Atlas.ts`
- Use `Atlas.processRequest()` for full conversation responses
- Switch local AI: set `LOCAL=true` in `.env.api` (overrides OpenAI)
- Observability via Langfuse (`ITracer`)

## Environment Files
- `.env.api` - API secrets (DB, Auth0, OpenAI key, Discord token)
- `.env.vite` - Frontend Auth0 config (`VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENTID`, `VITE_AUTH0_REDIRECT_URI`, `VITE_AUTH0_AUDIENCE`)

## WebSocket
- Custom `AtlasWebsocketServer` in `api/src/ws/`
- NGINX routes `/ws/*` → API port 3002
- Messages use `Antennae` pattern per organization

## Frontend Auth
- `@auth0/auth0-react` wrapped in `vite/src/helpers/Providers.tsx`

## Testing
- Jest with `ts-jest`
- Tests: `*.spec.ts`
- Run: `npm run test`

## Common Commands
Root:
- `npm run docker` / `npm run docker-reset` / `npm run start-node`
- `npm run make-migration`

API (`cd api`):
- `npm start` / `npm test` / `npm run repl`

Frontend (`cd vite`):
- `npm run dev` / `npm run build`

## NGINX Routing
`/api/*` → atlas:3001
`/ws/*` → atlas:3002
`/` → atlas:3004

Server name: `chocolate.local` (resolves via mDNS)

## Entities
- Users: `User` + `AuthProfile`
- Conversations: `Conversation` + `Message`
- Organizations: `Organization`, `Depository`, `Servicer`

## Coding Style
- TypeScript strict mode + experimental decorators enabled
- ESLint + Prettier
- 2-space indent, no-trailing-spaces, line-width 120

## Recommended Folder Structure
- `src/types/` - TypeScript/Type definitions
- `src/dtos/` - DTOs/Request/Response objects
- `src/routes/` - REST/Controller/Wire routes
- `src/services/` - Business logic/Services
- `src/presentation/` - HTTP Controllers
- `src/database/` - DB models/entities
- `src/__tests__/` - Tests
- `src/atlas/` - AI integration (Atlas.ts + assistants + tools)

## Debug/Troubleshooting
- DockerInspect: `docker inspect <container_name_or_id>`
- Node debug: `npm run repl` (interactive REPL with env + TypeORM)
- Check logs: `docker compose logs <service_name>`

## Other Notes
- Redis for Bull job queue (async message processing)
- Auth0 JWT via `express-oauth2-jwt-bearer`
- Discord bot: `api/src/plugins/AtlasPlugins`
- No migrations in dev (synchronize: true)
- Langfuse included in docker-compose for AI observability (port 3010)
