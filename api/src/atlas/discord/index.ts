import { WithTime } from '@/interface'
import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
} from 'discord.js'
import { ChatCompletionRequestMessage, OpenAIApi } from 'openai'
import { AtlasResponder } from '../responder'
import { AtlasDiscordResponder } from './responder'

const CHANNEL_ID = '1071516705806893187' // @todo

export class AtlasDiscord extends AtlasResponder {
  responder: AtlasDiscordResponder
  client: Client

  constructor(openai: OpenAIApi) {
    super(openai)
    // Create a new client instance
    this.client = new Client({
      partials: [Partials.Channel],
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.DirectMessages,
      ],
    })
    this.attachEventsToClient()
    this.responder = new AtlasDiscordResponder(this.openai)
  }

  public async login() {
    if (!process.env.DISCORD_TOKEN)
      throw new Error('Did you forget `DISCORD_TOKEN`?')
    return this.client.login(process.env.DISCORD_TOKEN)
  }

  public async respond(
    messages: WithTime<ChatCompletionRequestMessage>[],
    continuation?: boolean,
  ): Promise<string> {
    const message = await this.getShouldRespondToMessages(
      messages,
      'discord',
      continuation,
    )

    if (!message || !message.function_call) return ''
    const args = this.getArgs(message.function_call)
    if (!this.isYes(message.function_call)) {
      try {
        if (continuation) return ''
        if (!args.reason) return ''
        if (args.message) return args.message
        return await this.getResponseReasonMessage(
          messages,
          args.reason,
          'discord',
        )
      } catch (e) {
        /* */
      }
    }
    if (!args.message) {
      // last chance to respond, buddy. lol
      const { content } = await this.respondToMessages(messages)
      return content || ''
    }
    return args.message
  }

  private attachEventsToClient() {
    // When the client is ready, run this code (only once)
    // We use 'c' for the event parameter to keep it separate from the already defined 'client'
    this.client.once(Events.ClientReady, (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`)
    })

    this.client.on(Events.MessageCreate, async (message) => {
      if (this.isAtlas(message)) return
      if (!this.isAllowedToRespond(message)) return

      await this.responder.tryResponding(message, 6)
    })
  }

  isAtlas(message: Message<boolean>) {
    return message.author.username === 'Atlas'
  }
  isAllowedToRespond(message: Message<boolean>) {
    if (message.channelId === CHANNEL_ID) return true
    if (!message.inGuild()) return true
    return false
  }
}
