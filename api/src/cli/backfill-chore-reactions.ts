import { ChoreMessage } from '@/entity/ChoreMessage'
import { ChoreReaction } from '@/entity/ChoreReaction'
import { AtlasPlugins } from '@/plugins'
import { extractCustomReactionMetadata, filterReactions } from '@/plugins/chores/reactionFilter'
import { DataSource, MoreThanOrEqual } from 'typeorm'
import { TextChannel } from 'discord.js'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export default async function backfillChoreReactions(dataSource: DataSource): Promise<string> {
  const plugins = new AtlasPlugins()
  await plugins.discord.ready

  const since = new Date(Date.now() - THIRTY_DAYS_MS)
  const messages = await dataSource.getRepository(ChoreMessage).find({
    where: { postedAt: MoreThanOrEqual(since) },
    order: { postedAt: 'ASC' },
  })

  if (messages.length === 0) return 'No chore messages found in the past 30 days.'

  console.info(`Backfilling reactions for ${messages.length} chore message(s)...`)

  let succeeded = 0
  let failed = 0
  let inserted = 0

  for (const choreMessage of messages) {
    try {
      const channel = await plugins.discord.client.channels.fetch(choreMessage.discordChannelId)
      if (!channel?.isTextBased()) throw new Error(`Channel ${choreMessage.discordChannelId} is not text-based`)

      const discordMessage = await (channel as TextChannel).messages.fetch(choreMessage.discordMessageId)
      const metadata = extractCustomReactionMetadata(discordMessage.reactions)
      const reactions = filterReactions(discordMessage.reactions)

      choreMessage.reactions = reactions
      await dataSource.getRepository(ChoreMessage).save(choreMessage)

      if (metadata.length > 0) {
        const result = await dataSource.getRepository(ChoreReaction)
          .createQueryBuilder()
          .insert()
          .into(ChoreReaction)
          .values(metadata)
          .orIgnore()
          .execute()
        inserted += result.identifiers.length
        console.info(`  ✓ ${choreMessage.discordMessageId} — ${metadata.length} reaction(s)`)
      } else {
        console.info(`  - ${choreMessage.discordMessageId} — no custom reactions`)
      }

      succeeded++
    } catch (err) {
      console.error(`  ✗ ${choreMessage.discordMessageId}:`, err)
      failed++
    }
  }

  await plugins.close()
  return `Done. ${succeeded} succeeded, ${failed} failed. ${inserted} new reaction(s) inserted.`
}
