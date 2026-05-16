import { ChoreDefinition } from '@/entity/ChoreDefinition'
import {
  Client,
  Events,
  Message,
  PartialMessage,
  TextChannel,
} from 'discord.js'
import { DataSource } from 'typeorm'
import { AtlasPlugin } from '../AtlasPlugin'

function voteMessage(name: string): string {
  return `📋 New chore found: "${name}"\nVote on its size — the most votes wins after 24 hours. Ties go to the smaller category.\n0️⃣ Not a chore  1️⃣ Small  2️⃣ Medium  3️⃣ Large  4️⃣ Extra large`
}

export class ChoreDefinitionVoteMonitor implements AtlasPlugin {
  private client: Client
  private dataSource: DataSource
  private channelId: string

  private onMessageDelete = async (message: Message | PartialMessage) => {
    if (message.channelId !== this.channelId) return
    const repo = this.dataSource.getRepository(ChoreDefinition)
    const def = await repo.findOne({
      where: { discordVoteMessageId: message.id },
    })
    if (!def || def.size !== null || def.aliasOfId) return
    console.log(
      `ChoreDefinitionVoteMonitor: vote message deleted for unrated chore "${def.name}", removing definition`,
    )
    await repo.remove(def)
  }

  constructor(client: Client, dataSource: DataSource, channelId: string) {
    this.client = client
    this.dataSource = dataSource
    this.channelId = channelId
    this.client.on(Events.MessageDelete, this.onMessageDelete)
  }

  async close() {
    this.client.off(Events.MessageDelete, this.onMessageDelete)
  }

  async updateVoteMessage(
    def: ChoreDefinition,
    oldName: string,
  ): Promise<void> {
    if (!def.discordVoteMessageId) return
    const channel = await this.client.channels
      .fetch(this.channelId)
      .catch(() => null)
    if (!channel?.isTextBased()) return

    try {
      const msg = await (channel as TextChannel).messages.fetch(
        def.discordVoteMessageId,
      )
      if (!msg.content.includes(`"${oldName}"`)) return
      await msg.edit(msg.content.replace(`"${oldName}"`, `"${def.name}"`))
      if (msg.thread) {
        await msg.thread.setName(def.name).catch((e) => {
          console.error(
            `ChoreDefinitionVoteMonitor: failed to rename thread for "${def.name}"`,
            e,
          )
        })
      }
    } catch (e) {
      console.error(
        `ChoreDefinitionVoteMonitor: failed to update vote message for "${def.name}"`,
        e,
      )
    }
  }

  async aliasVoteMessage(def: ChoreDefinition, targetName: string): Promise<void> {
    if (!def.discordVoteMessageId) return
    const channel = await this.client.channels
      .fetch(this.channelId)
      .catch(() => null)
    if (!channel?.isTextBased()) return

    try {
      const msg = await (channel as TextChannel).messages.fetch(
        def.discordVoteMessageId,
      )
      await msg.edit(`🔗 "${def.name}" is an alias for "${targetName}" — vote cancelled`)
      if (msg.thread) {
        await msg.thread.setArchived(true).catch((e) => {
          console.error(
            `ChoreDefinitionVoteMonitor: failed to archive thread for "${def.name}"`,
            e,
          )
        })
      }
    } catch (e) {
      console.error(
        `ChoreDefinitionVoteMonitor: failed to update vote message after aliasing "${def.name}"`,
        e,
      )
    }
  }

  async cancelVoteMessage(def: ChoreDefinition): Promise<void> {
    if (!def.discordVoteMessageId) return
    const channel = await this.client.channels
      .fetch(this.channelId)
      .catch(() => null)
    if (!channel?.isTextBased()) return

    try {
      const msg = await (channel as TextChannel).messages.fetch(
        def.discordVoteMessageId,
      )
      await msg.edit(`🗑️ "${def.name}" was deleted — vote cancelled`)
      if (msg.thread) {
        await msg.thread.setArchived(true).catch((e) => {
          console.error(
            `ChoreDefinitionVoteMonitor: failed to archive thread for "${def.name}"`,
            e,
          )
        })
      }
    } catch (e) {
      console.error(
        `ChoreDefinitionVoteMonitor: failed to cancel vote message for "${def.name}"`,
        e,
      )
    }
  }

  async sendVoteMessages(definitions: ChoreDefinition[]): Promise<void> {
    const channel = await this.client.channels
      .fetch(this.channelId)
      .catch(() => null)
    if (!channel?.isTextBased()) {
      console.error(
        'ChoreDefinitionVoteMonitor: channel not found or not text-based',
        this.channelId,
      )
      return
    }

    const repo = this.dataSource.getRepository(ChoreDefinition)

    for (const def of definitions) {
      if (def.discordVoteMessageId || def.size !== null || def.aliasOfId)
        continue

      try {
        const sent = await (channel as TextChannel).send(voteMessage(def.name))
        def.discordVoteMessageId = sent.id
        def.votePostedAt = new Date()
        await repo.save(def)
        await sent
          .startThread({ name: def.name, autoArchiveDuration: 4320 })
          .catch((e) => {
            console.error(
              `ChoreDefinitionVoteMonitor: failed to create thread for "${def.name}"`,
              e,
            )
          })
      } catch (e) {
        console.error(
          `ChoreDefinitionVoteMonitor: failed to send vote message for "${def.name}"`,
          e,
        )
      }
    }
  }
}
