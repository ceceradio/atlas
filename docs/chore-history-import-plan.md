# Plan: Historical Chore Channel Import Cron

## Approach

Use the oldest `discordMessageId` already in the `ChoreMessage` table as the pagination cursor. Each cron run fetches a batch of Discord messages _before_ that ID, queues them via `choreMessageQueue`, and stops. The next run the cursor has naturally moved further back. No separate tracking table needed.

If the table is empty, start from now and work backwards.

---

## Snowflake math

Discord snowflakes encode timestamps, so we can cheaply convert dates to message IDs without fetching anything:

```ts
const DISCORD_EPOCH = 1420070400000n;
function dateToSnowflake(date: Date): string {
  return String((BigInt(date.getTime()) - DISCORD_EPOCH) << 22n);
}
```

This lets us set an earliest cutoff date so the cron doesn't try to walk back to the beginning of time:

```ts
const IMPORT_CUTOFF = new Date("2025-01-01T00:00:00.000Z");
const IMPORT_CUTOFF_SNOWFLAKE = dateToSnowflake(IMPORT_CUTOFF);
```

If the `before` cursor is at or before `IMPORT_CUTOFF_SNOWFLAKE`, the job stops and no-ops on future runs.

---

## Cron scheduling

Uses the `cron` npm package (`CronJob.from()`). Instantiated at startup in `plugins/index.ts` and runs nightly at 2 AM Eastern. Only starts if `HISTORIC_IMPORT_CRON_ENABLED` is set in the environment:

```ts
import { CronJob } from "cron";

if (process.env.HISTORIC_IMPORT_CRON_ENABLED) {
  CronJob.from({
    cronTime: "0 2 * * *",
    timeZone: "America/New_York",
    start: true,
    onTick: async () => {
      /* import logic */
    },
  });
}
```

No Redis required — just a lightweight in-process scheduler.

---

## Job logic

For each organization that has `settings.discord.choresChannelId` set:

1. Query `ChoreMessage` for the oldest `discordMessageId` for that channel → use as `before` cursor (cast to `BIGINT` for correct ordering)
2. Fetch up to 100 messages from the chores channel `before` that cursor
3. For each message, call `choreMessageQueue.add({ discordMessageId, discordChannelId, organizationId })` — existing processor handles dedup via unique index
4. Stop. Next run repeats from the new oldest message.

If no messages are fetched (or the cursor has passed `IMPORT_CUTOFF_SNOWFLAKE`), the backfill for that org is complete — the job no-ops on future runs.

---

## What gets reused

- `choreMessageQueue` and its processor (unchanged)
- Dedup via `discordMessageId` unique index on `ChoreMessage` (safe to re-queue)
- Discord client from `getAtlasPlugins().discord`
- `choresChannelId` from organization settings

---

## File changes

```
api/src/queue/choreHistoryCron.ts    (new — CronJob instantiation + import logic)
api/src/plugins/index.ts             (wire up on startup)
```

Optionally a `POST /chore-import/run` endpoint to trigger a batch manually.

Add `HISTORIC_IMPORT_CRON_ENABLED=` to `.env.api.template` so it's documented.
