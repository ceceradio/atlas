import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { Client, TextChannel } from 'discord.js'
import { DataSource } from 'typeorm'
import { AtlasPlugin } from '../AtlasPlugin'

function voteMessage(name: string): string {
  return `📋 New chore found: "${name}"\nVote on its size — the most votes wins after 24 hours. Ties go to the smaller category.\n0️⃣ Not a chore  1️⃣ Small  2️⃣ Medium  3️⃣ Large  4️⃣ Extra large`
}

export class ChoreDefinitionVoteMonitor implements AtlasPlugin {
  private client: Client
  private dataSource: DataSource
  private channelId: string

  constructor(client: Client, dataSource: DataSource, channelId: string) {
    this.client = client
    this.dataSource = dataSource
    this.channelId = channelId
  }

  async close() {}

  async sendVoteMessages(definitions: ChoreDefinition[]): Promise<void> {
    const channel = await this.client.channels.fetch(this.channelId).catch(() => null)
    if (!channel?.isTextBased()) {
      console.error(
        'ChoreDefinitionVoteMonitor: channel not found or not text-based',
        this.channelId,
      )
      return
    }

    const repo = this.dataSource.getRepository(ChoreDefinition)

    for (const def of definitions) {
      if (def.discordVoteMessageId || def.size !== null) continue

      try {
        const sent = await (channel as TextChannel).send(voteMessage(def.name))
        def.discordVoteMessageId = sent.id
        def.votePostedAt = new Date()
        await repo.save(def)
      } catch (e) {
        console.error(
          `ChoreDefinitionVoteMonitor: failed to send vote message for "${def.name}"`,
          e,
        )
      }
    }
  }
}
