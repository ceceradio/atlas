import { getDataSource } from '@/data-source'
import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { Organization } from '@/entity/Organization'
import { ChoreDifficulty } from '@/plugins/chores/ChoreTypes'
import { getAtlasPlugins } from '@/plugins'
import Queue from 'bull'
import { TextChannel } from 'discord.js'
import { redisConfig } from './redis'

const VOTE_WINDOW_MS = 24 * 60 * 60 * 1000

const EMOJI_TO_SIZE: Record<string, ChoreDifficulty> = {
  '0️⃣': 'not a chore',
  '1️⃣': 'small',
  '2️⃣': 'medium',
  '3️⃣': 'large',
  '4️⃣': 'extra large',
}

// Ordered smallest → largest for tie-breaking
const SIZE_ORDER: ChoreDifficulty[] = ['not a chore', 'small', 'medium', 'large', 'extra large']

export const choreDefinitionVoteTallyQueue = new Queue(
  'choreDefinitionVoteTally',
  { redis: redisConfig },
)

choreDefinitionVoteTallyQueue.process(async () => {
  await tallyExpiredVotes()
})

async function tallyExpiredVotes(): Promise<void> {
  const db = await getDataSource()
  const cutoff = new Date(Date.now() - VOTE_WINDOW_MS)

  const pending = await db
    .getRepository(ChoreDefinition)
    .createQueryBuilder('def')
    .where('def.discordVoteMessageId IS NOT NULL')
    .andWhere('def.size IS NULL')
    .andWhere('def.votePostedAt IS NOT NULL')
    .andWhere('def.votePostedAt <= :cutoff', { cutoff })
    .getMany()

  if (pending.length === 0) return

  // Look up the vote channel from org settings
  const orgs = await Organization.list(db)
  const channelId = orgs
    .map((o) => o.settings?.discord?.choreDefinitionsChannelId)
    .find(Boolean)

  if (!channelId) {
    console.warn('choreDefinitionVoteTally: no choreDefinitionsChannelId configured')
    return
  }

  const client = getAtlasPlugins()?.discord?.client
  if (!client) {
    console.warn('choreDefinitionVoteTally: Discord client not available')
    return
  }

  const channel = await client.channels.fetch(channelId).catch(() => null)
  if (!channel?.isTextBased()) {
    console.warn('choreDefinitionVoteTally: channel not found or not text-based', channelId)
    return
  }

  const repo = db.getRepository(ChoreDefinition)

  for (const def of pending) {
    try {
      const message = await (channel as TextChannel).messages.fetch(def.discordVoteMessageId!)

      // Count reactions, subtracting the bot's own if present
      const voteCounts = new Map<ChoreDifficulty, number>()
      for (const [emoji, size] of Object.entries(EMOJI_TO_SIZE)) {
        const reaction = message.reactions.cache.get(emoji)
        if (!reaction) continue
        const botReacted = reaction.users.cache.has(client.user!.id)
        const count = reaction.count - (botReacted ? 1 : 0)
        if (count > 0) voteCounts.set(size, count)
      }

      def.discordVoteMessageId = null
      def.votePostedAt = null

      if (voteCounts.size === 0) {
        await repo.save(def)
        await message.edit(`⏰ "${def.name}" — no votes after 24 hours, left unassigned`).catch(() => {})
        continue
      }

      // Most votes wins; ties broken by picking the smaller size
      const winner = [...voteCounts.entries()].reduce<[ChoreDifficulty, number]>(
        (best, [size, count]) => {
          if (count > best[1]) return [size, count]
          if (count === best[1] && SIZE_ORDER.indexOf(size) < SIZE_ORDER.indexOf(best[0])) return [size, count]
          return best
        },
        ['extra large', -1],
      )

      def.size = winner[0]
      await repo.save(def)

      const voteTotal = [...voteCounts.values()].reduce((s, n) => s + n, 0)
      await message
        .edit(`✅ "${def.name}" assigned as **${winner[0]}** (${winner[1]} of ${voteTotal} vote${voteTotal !== 1 ? 's' : ''})`)
        .catch(() => {})
    } catch (e) {
      console.error(`choreDefinitionVoteTally: error tallying votes for "${def.name}"`, e)
    }
  }
}

/**
 * Call once at startup. Registers the hourly repeat job in Redis (idempotent —
 * Bull deduplicates by queue name + cron pattern) and also queues an immediate
 * one-shot run to catch any votes that expired while the server was down.
 */
export async function ensureVoteTallyScheduled(): Promise<void> {
  // Durable hourly repeat, survives restarts
  await choreDefinitionVoteTallyQueue.add({}, { repeat: { cron: '0 * * * *' } })
  // Immediate catch-up run for anything that expired while we were offline
  await choreDefinitionVoteTallyQueue.add({})
}
