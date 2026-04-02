import { AtlasDiscord } from './discord'
import { AtlasTrading } from './trading'

export class AtlasPlugins {
  discord: AtlasDiscord
  trading: AtlasTrading
  constructor() {
    this.discord = new AtlasDiscord()
    /*
    this.trading = new AtlasTrading()
    this.discord.client.users
      .fetch('254824216682037260')
      .then((user) => this.trading.registerDiscord(this.discord, user))
      */
  }

  async close() {
    await this.trading.close()
    await this.discord.close()
  }
}
