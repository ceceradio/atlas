import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { Chore } from '@/entity/Chore'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { ChoreReaction } from '@/entity/ChoreReaction'
import { Client, Events, Message, MessageReaction, PartialMessage, PartialMessageReaction, PartialUser, ReactionManager, User } from 'discord.js'
import { DataSource } from 'typeorm'
import { AtlasPlugin } from '../AtlasPlugin'
import { DatedRatedChores } from './ChoreTypes'
import { setChoreChunkEmbedding } from './choreChunkEmbeddings'
import { matchChoreToDefinition, saveChoreDefinitionMatch } from './matchChoreToDefinition'
import { extractCustomReactionMetadata, filterReactions } from './reactionFilter'
import { processChoreMessage } from './processChoreMessage'
import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'

export class ChoreChannelMonitor implements AtlasPlugin {
  private client: Client
  private dataSource: DataSource
  private channelId: string
  private organizationId: string

  private onMessageCreate = async (message: Message<boolean>) => {
    if (message.channelId !== this.channelId) return
    await this.handleCreate(message)
  }

  private onMessageUpdate = async (
    _old: Message<boolean> | PartialMessage,
    newMessage: Message<boolean> | PartialMessage,
  ) => {
    if (newMessage.channelId !== this.channelId) return
    if (newMessage.partial) {
      try {
        newMessage = await newMessage.fetch()
      } catch (e) {
        console.error('ChoreChannelMonitor: failed to fetch updated message', e)
        return
      }
    }
    await this.handleUpdate(newMessage as Message<boolean>)
  }

  private onMessageDelete = async (message: Message<boolean> | PartialMessage) => {
    if (message.channelId !== this.channelId) return
    const choreMessageRepo = this.dataSource.getRepository(ChoreMessage)
    const existing = await choreMessageRepo.findOne({ where: { discordMessageId: message.id } })
    if (!existing) return
    await choreMessageRepo.remove(existing)
    console.log(`ChoreChannelMonitor: deleted ChoreMessage for discord message ${message.id}`)
  }

  private onReactionAdd = async (reaction: MessageReaction | PartialMessageReaction, _user: User | PartialUser) => {
    if (reaction.message.channelId !== this.channelId) return
    await this.handleReactionChange(reaction)
  }

  private onReactionRemove = async (reaction: MessageReaction | PartialMessageReaction, _user: User | PartialUser) => {
    if (reaction.message.channelId !== this.channelId) return
    await this.handleReactionChange(reaction)
  }

  constructor(client: Client, dataSource: DataSource, channelId: string, organizationId: string) {
    this.client = client
    this.dataSource = dataSource
    this.channelId = channelId
    this.organizationId = organizationId
    this.client.on(Events.MessageCreate, this.onMessageCreate)
    this.client.on(Events.MessageUpdate, this.onMessageUpdate)
    this.client.on(Events.MessageDelete, this.onMessageDelete)
    this.client.on(Events.MessageReactionAdd, this.onReactionAdd)
    this.client.on(Events.MessageReactionRemove, this.onReactionRemove)
  }

  async close() {
    this.client.off(Events.MessageCreate, this.onMessageCreate)
    this.client.off(Events.MessageUpdate, this.onMessageUpdate)
    this.client.off(Events.MessageDelete, this.onMessageDelete)
    this.client.off(Events.MessageReactionAdd, this.onReactionAdd)
    this.client.off(Events.MessageReactionRemove, this.onReactionRemove)
  }

  private async handleCreate(message: Message<boolean>) {
    const tracer = new LangfuseTracer('choreMessage', message.author.id, message.id, { tags: ['chores'] })
    const result = await processChoreMessage(message.content, message.createdAt.toISOString(), this.organizationId, tracer)
    if (!result) return
    await this.saveChoreMessage(message, result, null)
    await this.saveReactionMetadata(message.reactions)
  }

  private async handleUpdate(message: Message<boolean>) {
    const choreMessageRepo = this.dataSource.getRepository(ChoreMessage)
    const existing = await choreMessageRepo.findOne({ where: { discordMessageId: message.id } })

    const tracer = new LangfuseTracer('choreMessage', message.author.id, message.id, { tags: ['chores', 'edit'] })
    const result = await processChoreMessage(message.content, message.createdAt.toISOString(), this.organizationId, tracer)

    if (!result) {
      if (existing) await choreMessageRepo.remove(existing)
      return
    }

    if (existing) {
      await this.dataSource.getRepository(Chore).delete({ choreMessage: { id: existing.id } })
      existing.content = message.content
      existing.editedAt = message.editedAt
      existing.reactions = filterReactions(message.reactions)
      await choreMessageRepo.save(existing)
      await this.saveChores(existing, result)
    } else {
      await this.saveChoreMessage(message, result, message.editedAt)
    }
    await this.saveReactionMetadata(message.reactions)
  }

  private async handleReactionChange(reaction: MessageReaction | PartialMessageReaction) {
    const choreMessageRepo = this.dataSource.getRepository(ChoreMessage)
    const existing = await choreMessageRepo.findOne({ where: { discordMessageId: reaction.message.id } })
    if (!existing) return

    let fullReaction = reaction
    if (fullReaction.partial) {
      try {
        fullReaction = await fullReaction.fetch()
      } catch (e) {
        console.error('ChoreChannelMonitor: failed to fetch reaction', e)
        return
      }
    }

    existing.reactions = filterReactions(fullReaction.message.reactions)
    await choreMessageRepo.save(existing)
    await this.saveReactionMetadata(fullReaction.message.reactions)
  }

  private async saveReactionMetadata(reactions: ReactionManager) {
    const metadata = extractCustomReactionMetadata(reactions)
    if (metadata.length === 0) return
    await this.dataSource.getRepository(ChoreReaction)
      .createQueryBuilder()
      .insert()
      .into(ChoreReaction)
      .values(metadata)
      .orIgnore()
      .execute()
  }

  private async saveChoreMessage(message: Message<boolean>, result: DatedRatedChores[], editedAt: Date | null) {
    const choreMessageRepo = this.dataSource.getRepository(ChoreMessage)
    await choreMessageRepo.upsert(
      {
        discordMessageId: message.id,
        discordChannelId: message.channelId,
        discordAuthorId: message.author.id,
        discordAuthorName: message.author.username,
        content: message.content,
        postedAt: message.createdAt,
        editedAt,
        reactions: filterReactions(message.reactions),
      },
      { conflictPaths: ['discordMessageId'], skipUpdateIfNoValuesChanged: true },
    )
    const saved = await choreMessageRepo.findOneOrFail({ where: { discordMessageId: message.id } })
    await this.saveChores(saved, result)
  }

  private async saveChores(choreMessage: ChoreMessage, result: DatedRatedChores[]) {
    const choreRepo = this.dataSource.getRepository(Chore)
    const saved = await choreRepo.save(
      result.flatMap((dated) =>
        dated.chores.map((rated) =>
          choreRepo.create({
            choreMessage,
            description: rated.chore,
            doneAt: new Date(dated.date),
            difficulty: rated.difficulty,
            aiOriginal: { description: rated.chore, doneAt: dated.date, difficulty: rated.difficulty },
          }),
        ),
      ),
    )
    for (const chore of saved) {
      embedQwen(chore.description)
        .then((embedding) => setChoreChunkEmbedding(chore.id, embedding))
        .catch((err) => console.error(`ChoreChannelMonitor: failed to embed chore ${chore.id}`, err))
      matchChoreToDefinition(chore.description)
        .then((defId) => defId ? saveChoreDefinitionMatch(chore.id, defId) : null)
        .catch((err) => console.error(`ChoreChannelMonitor: failed to match chore ${chore.id}`, err))
    }
  }
}
