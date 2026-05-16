import { getDataSource } from '@/data-source'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { Organization } from '@/entity/Organization'
import { waitForAtlasPlugins } from '@/plugins'
import Queue from 'bull'
import { TextChannel } from 'discord.js'
import { redisConfig } from './redis'
import { choreMessageQueue } from './choreMessage'

const BATCH_SIZE = 30
const DISCORD_EPOCH = 1420070400000n
const IMPORT_CUTOFF = new Date('2025-01-01T00:00:00.000Z')
const IMPORT_CUTOFF_SNOWFLAKE = String((BigInt(IMPORT_CUTOFF.getTime()) - DISCORD_EPOCH) << 22n)

export const choreHistoryQueue = new Queue('choreHistoryCron', { redis: redisConfig })

choreHistoryQueue.process(async () => {
  const db = await getDataSource()
  const plugins = await waitForAtlasPlugins()
  const orgs = await Organization.list(db)

  for (const org of orgs) {
    const channelId = org.settings?.discord?.choresChannelId
    if (!channelId) continue

    const oldest = await db
      .getRepository(ChoreMessage)
      .createQueryBuilder('cm')
      .select('cm.discordMessageId', 'discordMessageId')
      .where('cm.discordChannelId = :channelId', { channelId })
      .orderBy('CAST(cm.discordMessageId AS BIGINT)', 'ASC')
      .limit(1)
      .getRawOne<{ discordMessageId: string }>()

    const before = oldest?.discordMessageId ?? undefined

    if (before && BigInt(before) <= BigInt(IMPORT_CUTOFF_SNOWFLAKE)) {
      console.log(`choreHistoryCron: org ${org.uuid} backfill complete (reached cutoff)`)
      continue
    }

    const channel = await plugins.discord.client.channels.fetch(channelId).catch(() => null)
    if (!channel?.isTextBased()) {
      console.error(`choreHistoryCron: channel ${channelId} not found or not text-based`)
      continue
    }

    const messages = await (channel as TextChannel).messages.fetch({ limit: BATCH_SIZE, before })
    if (messages.size === 0) {
      console.log(`choreHistoryCron: org ${org.uuid} backfill complete (no more messages)`)
      continue
    }

    for (const [id] of messages) {
      await choreMessageQueue
        .add({ discordMessageId: id, discordChannelId: channelId, organizationId: org.uuid, skipDiscovery: true })
        .catch((err) => console.error('choreHistoryCron: failed to queue message', id, err))
    }

    console.log(`choreHistoryCron: queued ${messages.size} messages for org ${org.uuid} (before ${before ?? 'now'})`)
  }
})

export async function ensureChoreHistoryScheduled(): Promise<void> {
  await choreHistoryQueue.add({}, { repeat: { cron: '0 2 * * *' } })
}
