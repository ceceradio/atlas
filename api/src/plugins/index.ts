import { DataSource } from 'typeorm'
import { ChoreChannelMonitor } from './chores/ChoreChannelMonitor'
import { ChoreDefinitionVoteMonitor } from './chores/ChoreDefinitionVoteMonitor'
import { AtlasDiscord } from './discord'
import { AtlasTrading } from './trading'

export class AtlasPlugins {
  discord: AtlasDiscord
  trading: AtlasTrading
  choreMonitor?: ChoreChannelMonitor
  choreDefinitionVoteMonitor?: ChoreDefinitionVoteMonitor

  constructor() {
    this.discord = new AtlasDiscord()
    /*
    this.trading = new AtlasTrading()
    this.discord.client.users
      .fetch('254824216682037260')
      .then((user) => this.trading.registerDiscord(this.discord, user))
      */
  }

  initChoreMonitor(
    dataSource: DataSource,
    channelId: string,
    organizationId: string,
  ) {
    this.choreMonitor?.close()
    this.choreMonitor = new ChoreChannelMonitor(
      this.discord.client,
      dataSource,
      channelId,
      organizationId,
    )
  }

  initChoreDefinitionVoteMonitor(dataSource: DataSource, channelId: string) {
    this.choreDefinitionVoteMonitor?.close()
    this.choreDefinitionVoteMonitor = new ChoreDefinitionVoteMonitor(
      this.discord.client,
      dataSource,
      channelId,
    )
  }

  async close() {
    await this.choreMonitor?.close()
    await this.choreDefinitionVoteMonitor?.close()
    await this.trading?.close()
    await this.discord.close()
  }
}

let instance: AtlasPlugins

export function getAtlasPlugins(): AtlasPlugins {
  initAtlasPlugins()
  return instance
}

export async function waitForAtlasPlugins(): Promise<AtlasPlugins> {
  await instance.discord.ready
  return instance
}

export function initAtlasPlugins(): AtlasPlugins {
  if (instance) return instance
  instance = new AtlasPlugins()
  return instance
}
