import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { getDataSource } from '@/data-source'
import { Chore } from '@/entity/Chore'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { ChoreReaction } from '@/entity/ChoreReaction'
import { waitForAtlasPlugins } from '@/plugins'
import { DatedRatedChores } from '@/plugins/chores/ChoreTypes'
import { setChoreChunkEmbedding } from '@/plugins/chores/choreChunkEmbeddings'
import {
  matchChoreToDefinition,
  saveChoreDefinitionMatch,
} from '@/plugins/chores/matchChoreToDefinition'
import { processChoreMessage } from '@/plugins/chores/processChoreMessage'
import {
  extractCustomReactionMetadata,
  filterReactions,
} from '@/plugins/chores/reactionFilter'
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
  const {
    discordMessageId,
    discordChannelId,
    organizationId = '',
    skipDiscovery = false,
  } = job.data

  const plugins = await waitForAtlasPlugins()
  const client = plugins.discord.client
  const channel = await client.channels.fetch(discordChannelId)
  if (!channel?.isTextBased())
    throw new Error(`Channel ${discordChannelId} is not text-based`)

  let discordMessage
  try {
    discordMessage = await (channel as TextChannel).messages.fetch(
      discordMessageId,
    )
  } catch {
    const db = await getDataSource()
    const choreMessageRepo = db.getRepository(ChoreMessage)
    const existing = await choreMessageRepo.findOne({
      where: { discordMessageId },
    })
    if (existing) await choreMessageRepo.remove(existing)
    return
  }
  const { content, author, createdAt, editedAt } = discordMessage

  const tracer = new LangfuseTracer(
    'choreMessage',
    author.id,
    discordMessageId,
    {
      tags: ['chores'],
    },
  )

  const result = await processChoreMessage(
    content,
    createdAt.toISOString(),
    organizationId,
    tracer,
    0,
    skipDiscovery,
  )
  const reactions = filterReactions(discordMessage.reactions)
  const reactionMetadata = extractCustomReactionMetadata(
    discordMessage.reactions,
  )

  const db = await getDataSource()
  let savedChores: Chore[] = []
  await db.transaction(async (manager) => {
    const choreMessageRepo = manager.getRepository(ChoreMessage)
    const choreRepo = manager.getRepository(Chore)

    const existing = await choreMessageRepo.findOne({
      where: { discordMessageId },
    })

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
      savedChores = await saveChores(choreRepo, existing, result)
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
      savedChores = await saveChores(choreRepo, saved, result)
    }
  })

  for (const chore of savedChores) {
    try {
      const embedding = await embedQwen(chore.description)
      await setChoreChunkEmbedding(chore.id, embedding)
    } catch (err) {
      console.error(`choreMessage queue: failed to embed chore ${chore.id}`, err)
    }
    try {
      const defId = await matchChoreToDefinition(chore.description)
      if (defId) await saveChoreDefinitionMatch(chore.id, defId)
    } catch (err) {
      console.error(`choreMessage queue: failed to match chore ${chore.id}`, err)
    }
  }

  if (reactionMetadata.length > 0) {
    await db
      .getRepository(ChoreReaction)
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
): Promise<Chore[]> {
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
  return choreRepo.save(chores)
}
