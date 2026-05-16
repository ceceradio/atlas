import { Chore } from '@/entity/Chore'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { ChoreReaction } from '@/entity/ChoreReaction'
import { getDataSource } from '@/data-source'
import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { DatedRatedChores } from '@/plugins/chores/ChoreTypes'
import { processChoreMessage } from '@/plugins/chores/processChoreMessage'
import { filterReactions, extractCustomReactionMetadata } from '@/plugins/chores/reactionFilter'
import { waitForAtlasPlugins } from '@/plugins'
import Queue from 'bull'
import { TextChannel } from 'discord.js'
import { Repository } from 'typeorm'
import { redisConfig } from './redis'

export type ChoreMessageJobData = {
  discordMessageId: string
  discordChannelId: string
  organizationId?: string
  skipDiscovery?: boolean
}

export const choreMessageQueue = new Queue<ChoreMessageJobData>(
  'choreMessage',
  { redis: redisConfig },
)

choreMessageQueue.process(1, async (job) => {
  const { discordMessageId, discordChannelId, organizationId = '', skipDiscovery = false } = job.data

  const plugins = await waitForAtlasPlugins()
  const client = plugins.discord.client
  const channel = await client.channels.fetch(discordChannelId)
  if (!channel?.isTextBased()) throw new Error(`Channel ${discordChannelId} is not text-based`)

  let discordMessage
  try {
    discordMessage = await (channel as TextChannel).messages.fetch(discordMessageId)
  } catch {
    const db = await getDataSource()
    const choreMessageRepo = db.getRepository(ChoreMessage)
    const existing = await choreMessageRepo.findOne({ where: { discordMessageId } })
    if (existing) await choreMessageRepo.remove(existing)
    return
  }
  const { content, author, createdAt, editedAt } = discordMessage

  const tracer = new LangfuseTracer('choreMessage', author.id, discordMessageId, {
    tags: ['chores'],
  })

  const result = await processChoreMessage(content, createdAt.toISOString(), organizationId, tracer, 0, skipDiscovery)
  const reactions = filterReactions(discordMessage.reactions)
  const reactionMetadata = extractCustomReactionMetadata(discordMessage.reactions)

  const db = await getDataSource()
  await db.transaction(async (manager) => {
    const choreMessageRepo = manager.getRepository(ChoreMessage)
    const choreRepo = manager.getRepository(Chore)

    const existing = await choreMessageRepo.findOne({ where: { discordMessageId } })

    if (!result) {
      if (existing) await choreMessageRepo.remove(existing)
      return
    }

    if (existing) {
      await choreRepo.delete({ choreMessage: { id: existing.id } })
      existing.content = content
      existing.discordAuthorId = author.id
      existing.discordAuthorName = author.username
      existing.postedAt = createdAt
      existing.editedAt = editedAt
      existing.reactions = reactions
      await choreMessageRepo.save(existing)
      await saveChores(choreRepo, existing, result)
    } else {
      const choreMessage = choreMessageRepo.create({
        discordMessageId,
        discordChannelId,
        discordAuthorId: author.id,
        discordAuthorName: author.username,
        content,
        postedAt: createdAt,
        editedAt,
        reactions,
      })
      const saved = await choreMessageRepo.save(choreMessage)
      await saveChores(choreRepo, saved, result)
    }
  })

  if (reactionMetadata.length > 0) {
    await db.getRepository(ChoreReaction)
      .createQueryBuilder()
      .insert()
      .into(ChoreReaction)
      .values(reactionMetadata)
      .orIgnore()
      .execute()
  }

  return {
    author: { id: author.id, username: author.username },
    chores: result,
  }
})

async function saveChores(
  choreRepo: Repository<Chore>,
  choreMessage: ChoreMessage,
  result: DatedRatedChores[],
) {
  const chores = result.flatMap((dated) =>
    dated.chores.map((rated) =>
      choreRepo.create({
        choreMessage,
        description: rated.chore,
        doneAt: new Date(dated.date),
        difficulty: rated.difficulty,
        aiOriginal: {
          description: rated.chore,
          doneAt: dated.date,
          difficulty: rated.difficulty,
        },
      }),
    ),
  )
  await choreRepo.save(chores)
}
