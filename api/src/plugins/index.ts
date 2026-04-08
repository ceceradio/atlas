import { DataSource } from 'typeorm'
import { ChoreChannelMonitor } from './chores/ChoreChannelMonitor'
import { AtlasDiscord } from './discord'
import { AtlasTrading } from './trading'

export class AtlasPlugins {
  discord: AtlasDiscord
  trading: AtlasTrading
  choreMonitor?: ChoreChannelMonitor

  constructor() {
    this.discord = new AtlasDiscord()
    /*
    this.trading = new AtlasTrading()
    this.discord.client.users
      .fetch('254824216682037260')
      .then((user) => this.trading.registerDiscord(this.discord, user))
      */
  }

  initChoreMonitor(dataSource: DataSource, channelId: string) {
    this.choreMonitor?.close()
    this.choreMonitor = new ChoreChannelMonitor(
      this.discord.client,
      dataSource,
      channelId,
    )
  }

  async close() {
    await this.choreMonitor?.close()
    await this.trading?.close()
    await this.discord.close()
  }
}

let instance: AtlasPlugins

export function getAtlasPlugins(): AtlasPlugins {
  return instance
}

export function initAtlasPlugins(): AtlasPlugins {
  instance = new AtlasPlugins()
  return instance
}
