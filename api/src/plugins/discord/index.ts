import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  MessageCreateOptions,
  Partials,
  User,
} from 'discord.js'

import { Atlas } from '@/atlas/Atlas'
import { IAssistant, IAtlasMessage, IAtlasRequest } from '@/atlas/IAtlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { AtlasAssistant } from '@/atlas/assistants/Atlas/AtlasAssistant'
import { AtlasThinkingAssistant } from '@/atlas/assistants/Atlas/AtlasThinkingAssistant'
import { ShouldAtlasRespond } from '@/atlas/assistants/ShouldRespond/ShouldAtlasRespond'
import { Conversation } from '@/entity/Conversation'
import { AtlasPlugin } from '../AtlasPlugin'
import { convertDiscordMessagesToAtlas } from './convertDiscordMessagesToAtlas'

const CHANNEL_ID = '1071516705806893187' // @todo

export class AtlasDiscord implements AtlasPlugin {
  client: Client
  listeners: ((message: Message<boolean>) => Promise<void>)[]
  constructor() {
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
    this.listeners = []
  }

  public registerListener(
    listener: (message: Message<boolean>) => Promise<void>,
  ) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  async close() {
    const cece = await this.client.users.fetch('254824216682037260')
    cece.send('Atlas is shutting down')
    this.client.destroy()
  }

  public async login() {
    if (!process.env.DISCORD_TOKEN)
      throw new Error('Did you forget `DISCORD_TOKEN`?')

    const returnVal = this.client.login(process.env.DISCORD_TOKEN)
    console.info(
      `You may register the Discord Bot here: ${process.env.DISCORD_URL}`,
    )
    return returnVal
  }

  public async respond(
    messages: IAtlasMessage[],
    assistant: IAssistant = AtlasAssistant,
    tracer?: ITracer,
  ): Promise<string> {
    // last chance to respond, buddy. lol
    const request: IAtlasRequest = {
      messages,
      currentUser: {
        id: '1',
        name: 'Test User',
      },
      assistant,
    }
    const response = await Atlas.processRequest(request, tracer)
    const content = response.messages
      .map((message) => ('content' in message ? message.content : undefined))
      .join('\n\n')
    return content || ''
  }

  private attachEventsToClient() {
    // When the client is ready, run this code (only once)
    // We use 'c' for the event parameter to keep it separate from the already defined 'client'
    this.login()
    this.client.once(Events.ClientReady, (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`)
    })

    this.client.on(
      Events.MessageCreate,
      async (message) => await this.processMessage(message),
    )
    setInterval(() => {
      ;(async () => {
        const cece = await this.client.users.fetch('254824216682037260')
        const response = await cece.dmChannel?.messages.fetch()
        if (!response) {
          return console.log('no response')
        }

        const lastMessage = response.first()
        if (lastMessage) {
          await this.processMessage(lastMessage, AtlasThinkingAssistant)
        }
      })().then(() => console.log('done'))
    }, 1000 * 60 * 5)
  }

  async processMessage(message: Message<boolean>, assistant?: IAssistant) {
    console.log('message received')
    if (this.isAtlas(message)) return
    if (!this.isAllowedToRespond(message)) return

    try {
      const messages = await message.channel.messages.fetch({
        limit: 40,
        //before: message.id,
      })
      const latestMessage = messages.first()

      if (latestMessage?.content.startsWith('!')) {
        await this.sendSplitMessage(message, 'Atlas is reporting for duty!')
        try {
          await Promise.all(
            this.listeners.map(async (listener) => await listener(message)),
          )
        } catch (e) {
          console.error(e)
          await this.sendSplitMessage(
            message,
            'Error: ' + (<Error>e).toString(),
          )
        }
        return
      }
      const tracer = new LangfuseTracer('discord', message.author.username, '')

      const shouldRespond = await this.shouldRespond(message, 6, tracer)
      if (!shouldRespond) {
        console.log('should not respond')
        return
      }

      await message.channel.sendTyping()

      const atlasMessages = convertDiscordMessagesToAtlas(message, messages)
      const response = await this.respond(atlasMessages, assistant, tracer)
      await this.sendSplitMessage(message, response)
    } catch (e) {
      console.error(e)
      this.sendSplitMessage(message, 'Error: ' + (<Error>e).toString())
    }
  }
  isAtlas(message: Message<boolean>) {
    return message.author.username === 'Atlas'
  }
  isAllowedToRespond(message: Message<boolean>) {
    if (message.channelId === CHANNEL_ID) return true
    if (!message.inGuild()) return true
    return false
  }
  async shouldRespond(
    message: Message<boolean>,
    depth: number,
    tracer: ITracer,
  ): Promise<boolean> {
    // get last few messages in channelId
    const messages = await message.channel.messages.fetch({
      limit: depth,
      //before: message.id,
    })
    const atlasMessages = convertDiscordMessagesToAtlas(message, messages)
    const chatString = Conversation.toChatString(atlasMessages)
    console.log(chatString)

    return await ShouldAtlasRespond(chatString, tracer)
  }

  // split message into 2000 character chunks... currently very naive
  async sendSplitMessage(message: Message<boolean>, atlasMessage: string) {
    const chatMessages = atlasMessage.split('\n\n')
    for (const i in chatMessages) {
      const snippet = chatMessages[i]
      try {
        if (snippet.length > 0) await message.channel.send(snippet)
      } catch (e) {
        console.error(e)
      }
    }
  }
  async sendSplitUserMessage(
    user: User,
    atlasMessage: string,
    options?: Partial<MessageCreateOptions>,
  ) {
    const chatMessages = atlasMessage.split('\n\n')
    for (const i in chatMessages) {
      const snippet = chatMessages[i]
      try {
        if (snippet.length > 0) {
          await user.send({
            content: snippet,
            ...options,
          })
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
}
