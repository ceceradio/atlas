import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { Chore } from '@/entity/Chore'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { Client, Events, Message, PartialMessage } from 'discord.js'
import { DataSource } from 'typeorm'
import { AtlasPlugin } from '../AtlasPlugin'
import { DatedRatedChores } from './ChoreTypes'
import { processChoreMessage } from './processChoreMessage'

export class ChoreChannelMonitor implements AtlasPlugin {
  private client: Client
  private dataSource: DataSource
  private channelId: string

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

  constructor(client: Client, dataSource: DataSource, channelId: string) {
    this.client = client
    this.dataSource = dataSource
    this.channelId = channelId
    this.client.on(Events.MessageCreate, this.onMessageCreate)
    this.client.on(Events.MessageUpdate, this.onMessageUpdate)
  }

  async close() {
    this.client.off(Events.MessageCreate, this.onMessageCreate)
    this.client.off(Events.MessageUpdate, this.onMessageUpdate)
  }

  private async handleCreate(message: Message<boolean>) {
    const tracer = new LangfuseTracer('choreMessage', message.author.id, message.id, { tags: ['chores'] })
    const result = await processChoreMessage(message.content, message.createdAt.toISOString(), tracer)
    if (!result) return
    await this.saveChoreMessage(message, result, null)
  }

  private async handleUpdate(message: Message<boolean>) {
    const choreMessageRepo = this.dataSource.getRepository(ChoreMessage)
    const existing = await choreMessageRepo.findOne({ where: { discordMessageId: message.id } })

    const tracer = new LangfuseTracer('choreMessage', message.author.id, message.id, { tags: ['chores', 'edit'] })
    const result = await processChoreMessage(message.content, message.createdAt.toISOString(), tracer)

    if (!result) {
      if (existing) await choreMessageRepo.remove(existing)
      return
    }

    if (existing) {
      await this.dataSource.getRepository(Chore).delete({ choreMessage: { id: existing.id } })
      existing.editedAt = message.editedAt
      await choreMessageRepo.save(existing)
      await this.saveChores(existing, result)
    } else {
      await this.saveChoreMessage(message, result, message.editedAt)
    }
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
      },
      { conflictPaths: ['discordMessageId'], skipUpdateIfNoValuesChanged: true },
    )
    const saved = await choreMessageRepo.findOneOrFail({ where: { discordMessageId: message.id } })
    await this.saveChores(saved, result)
  }

  private async saveChores(choreMessage: ChoreMessage, result: DatedRatedChores[]) {
    const choreRepo = this.dataSource.getRepository(Chore)
    await choreRepo.save(
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
  }
}
