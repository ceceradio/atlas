# Chore Definitions Feature

AI-assisted chore difficulty ratings are currently driven by a hardcoded list in
`api/src/plugins/chores/rateChoreDifficultySequential.ts`.  This feature replaces
that list with a database-backed `ChoreDefinition` table and adds tooling to
discover and crowd-source new definitions through Discord.

---

## Part 1 — ChoreDefinition entity, CRUD API, page, and AI integration

### 1a. Database entity

**New file:** `api/src/entity/ChoreDefinition.ts`

```
ChoreDefinition
  id          uuid PK
  name        text  UNIQUE NOT NULL   -- e.g. "cleaned the stovetop"
  size        text  NULLABLE          -- 'not a chore' | 'small' | 'medium' | 'large' | 'extra large'
  createdAt   timestamp
  updatedAt   timestamp
```

TypeORM `synchronize: true` will create the table automatically in dev.

**Seed data:** Seed the existing hardcoded list from
`rateChoreDifficultySequential.ts` into the table on first run (or via a one-off
CLI script).  Add a seed guard (e.g. only insert if `count == 0`) so it doesn't
re-seed on every restart.

> Tip: put seeding in `api/src/data-source.ts` after `initialize()` or in a
> dedicated `api/src/cli/seed-chore-definitions.ts` script.

### 1b. API endpoints

Add to `api/src/app/chores.ts` (under `authorize` middleware):

| Method | Path | Description |
|---|---|---|
| `GET` | `/chore-definitions` | List all definitions; query params: `sized=true\|false` to filter by whether size is set |
| `POST` | `/chore-definitions` | Create a new definition (`{ name, size? }`) |
| `PATCH` | `/chore-definitions/:id` | Update `name` and/or `size` |
| `DELETE` | `/chore-definitions/:id` | Delete a definition |

Response shape for a definition:
```ts
{
  id: string
  name: string
  size: 'not a chore' | 'small' | 'medium' | 'large' | 'extra large' | null
  createdAt: string
}
```

### 1c. AI system message — dynamic generation

Modify `rateChoreDifficultySequential.ts`:

1. Load all `ChoreDefinition` rows where `size IS NOT NULL` from the database.
2. Group them by size in the canonical order: `not a chore → small → medium → large → extra large`.
3. Build the `# Examples` section dynamically in the same bullet-point format as
   the current hardcoded block.
4. Keep the intro paragraphs ("You are a helpful assistant…", the square-bracket
   note, and the "Tool call examples" section) hardcoded — only the examples list
   is database-driven.

The function signature stays the same; just add a `dataSource` param (or import
the `postgres` singleton) to fetch definitions before building the prompt.

### 1d. Frontend page

**New file:** `vite/src/app/pages/ChoreDefinitions.tsx`

- Route: `/chore-definitions`
- Two sections:
  1. **Sized definitions** — grouped under `Not a Chore / Small / Medium / Large / Extra Large` headings.  Each entry shows the name and a size badge.
  2. *(Placeholder for Part 2)* **Pending definitions** — hidden / empty until Part 2 is implemented.
- Add CRUD controls: inline edit of name/size, delete button.
- Add the page to the side-panel nav alongside the existing Chores pages.

Add RTK Query endpoints to `vite/src/store/atlasApi.ts`:
- `getChoreDefinitions`
- `createChoreDefinition`
- `updateChoreDefinition`
- `deleteChoreDefinition`

Also add a shared interface in `api/src/interface/` (e.g. `IChoreDefinition.ts`)
so the frontend can import the type via `@atlas/api`.

---

## Part 2 — Detect unknown chores and create unsized definitions

### 2a. Detection step in processChoreMessage

After `choreSplitter` returns the list of individual chore strings and **before**
`rateChoreDifficultySequential`, add a new step:

```
identifyNewChoreDefinitions(chores: string[], dataSource) → Promise<void>
```

Logic:
1. Load all existing `ChoreDefinition.name` values.
2. For each extracted chore string, run a lightweight AI call (or simple
   case-insensitive substring check as a first pass) to decide if it matches any
   existing definition.
3. For chores with no match → upsert a `ChoreDefinition` with `size = null`
   (skip if one with the same name already exists).

This step is fire-and-forget (do not await inside the hot path if latency is a
concern; enqueue via Bull instead).

**Suggested Bull queue:** `api/src/queue/choreDefinitionDiscovery.ts` — takes a
list of chore strings and an organization ID, runs the detection, inserts new
definitions.

### 2b. Frontend — Pending definitions section

On the `/chore-definitions` page, surface the second section:

- Header: **Unrated Definitions**
- Each row shows the name, a "no size yet" label, and an inline size picker
  (dropdown) so an admin can manually assign a size without waiting for Discord.
- Optionally show a "Send to Discord for voting" button that triggers Part 3
  manually.

---

## Part 3 — Discord voting channel

### 3a. ChoreDefinition — vote tracking column

Add to `ChoreDefinition`:

```
discordVoteMessageId   text  NULLABLE   -- ID of the bot's voting message
```

When `discordVoteMessageId` is set the definition is "in voting".  When `size`
gets assigned the definition is "resolved".

### 3b. New plugin: ChoreDefinitionVoteMonitor

**New file:** `api/src/plugins/chores/ChoreDefinitionVoteMonitor.ts`

Responsibilities:
1. **Send voting message** — called when a new unsized definition is found (from
   Part 2's queue worker or from the manual "Send to Discord" button).  Posts to
   a configurable `votingChannelId`:

   ```
   📋 New chore found: "cleaned the stovetop"
   What size is this?
   0️⃣ Not a chore  1️⃣ Small  2️⃣ Medium  3️⃣ Large  4️⃣ Extra large
   ```

   Saves the Discord message ID back to `ChoreDefinition.discordVoteMessageId`.

2. **Listen for reactions** — registers a `MessageReactionAdd` listener on the
   Discord client.
   - Filters to the voting channel only.
   - Ignores reactions from Atlas itself.
   - On first valid emoji reaction (`0️⃣` / `1️⃣` / `2️⃣` / `3️⃣` / `4️⃣`):
     - Map emoji → size: `0→'not a chore'`, `1→'small'`, `2→'medium'`, `3→'large'`, `4→'extra large'`
     - Update `ChoreDefinition.size` and clear `discordVoteMessageId`.
     - Reply/edit the voting message with: ✅ Assigned as **[size]**.

### 3c. Discord intents

The `AtlasDiscord` client needs two additional intents/partials to receive
reactions on messages it didn't load at startup:

```ts
GatewayIntentBits.GuildMessageReactions,
Partials.Message,
Partials.Reaction,
Partials.Channel,   // already present
```

### 3d. Wiring into AtlasPlugins

Add to `AtlasPlugins`:
```ts
choreDefinitionVoteMonitor?: ChoreDefinitionVoteMonitor
```

Add `initChoreDefinitionVoteMonitor(dataSource, votingChannelId)` analogous to
`initChoreMonitor`.

Expose `votingChannelId` via env var `DISCORD_CHORE_VOTE_CHANNEL_ID`.

---

## Implementation order

```
Part 1a  Entity + seed data
Part 1b  API endpoints
Part 1c  Dynamic AI system message
Part 1d  Frontend page (sized section only)
---
Part 2a  Detection queue worker
Part 2b  Frontend pending section + manual size picker
---
Part 3a  discordVoteMessageId column
Part 3b  ChoreDefinitionVoteMonitor (send message + reaction listener)
Part 3c  Discord intents update
Part 3d  Wire into AtlasPlugins + env var
```

---

## Open questions / decisions before each part

**Part 1**
- Should the seed script run automatically on startup or be a one-off CLI command?
  (Recommendation: CLI script `api/src/cli/seed-chore-definitions.ts` to keep
  startup clean.)
- Hardcoded entries use bracket syntax like `[any room]` — keep as-is in the name
  field or normalize?  Recommendation: keep as-is; the AI already understands them.

**Part 2**
- Fuzzy vs. exact matching for "already known" check: start with exact
  case-insensitive, add AI-assisted fuzzy match only if false-positive rate is
  noticeable.
- Where to run detection: in-process (fast, simpler) vs. Bull queue (slower,
  more resilient).  Recommendation: Bull queue so it doesn't block chore
  processing.

**Part 3**
- What channel gets the voting messages?  Set via `DISCORD_CHORE_VOTE_CHANNEL_ID`
  in `.env.api`.
- Should multiple reactions be allowed (majority vote) or strictly first-wins?
  Current spec: first valid reaction wins.  Can revisit.
- Should the voting message be ephemeral or permanent?  Permanent (edited with
  result) is easier and gives a searchable history.
