// Require the necessary discord.js classes
import { WithTime } from '@/interface'
import { Collection, Message } from 'discord.js'
import { ChatCompletionRequestMessage, OpenAIApi } from 'openai'
import { AtlasResponder } from '../responder'

export class AtlasDiscordResponder extends AtlasResponder {
  constructor(openai: OpenAIApi) {
    super(openai)
  }
  async tryResponding(
    message: Message<boolean>,
    depth: number,
  ): Promise<boolean> {
    // get last few messages in channelId
    const messages = await message.channel.messages.fetch({
      limit: depth,
      before: message.id,
    })
    const atlasMessages = this.toOpenAI(message, messages)

    // if there is high likelyhood of response, start typing
    const { function_call } = await this.getShouldRespondToMessages(
      atlasMessages,
      'discord',
    )
    if (!function_call) return false
    if (this.isYes(function_call) && function_call.arguments) {
      message.channel.sendTyping()
    }

    // extract what we need from the last message, or get a new message
    const { content: atlasMessage } =
      this.lastShouldRespondMessage ||
      (await this.respondToMessages(atlasMessages))

    // send a message if we can
    if (!atlasMessage) return false
    if (!this.pushMessage(message, atlasMessage, atlasMessages)) return false

    // if we should respond again, respond softly until we shouldnt
    while (await this.shouldRespondToMessages(atlasMessages, 'discord')) {
      if (!this.lastShouldRespondMessage) break
      const { content: atlasMessage } = this.lastShouldRespondMessage
      if (!atlasMessage) break
      if (!this.pushMessage(message, atlasMessage, atlasMessages)) break
    }
    return true
  }

  // define reusable local function for message functionality
  async pushMessage(
    message: Message<boolean>,
    atlasMessage: string,
    atlasMessages: WithTime<ChatCompletionRequestMessage>[],
  ) {
    if (!message) return false
    if (!atlasMessage) return false
    await this.sendSplitMessage(message, atlasMessage)
    atlasMessages.push({
      name: 'Atlas',
      role: 'assistant',
      createdAt: new Date(),
      content: `${atlasMessage}`,
    })
    return true
  }

  // split message into 2000 character chunks... currently very naive
  async sendSplitMessage(message: Message<boolean>, chat: string) {
    const chatMessages = chat.split('\n\n')
    for (const i in chatMessages) {
      const snippet = chatMessages[i]
      if (snippet.length > 0) await message.channel.send(snippet)
    }
  }

  // collate discord message objects into an array of openai messages
  toOpenAI(
    message: Message<boolean>,
    messages: Collection<string, Message<boolean>>,
  ): WithTime<ChatCompletionRequestMessage>[] {
    const atlasMessages: WithTime<ChatCompletionRequestMessage>[] = []
    // add messages to another array in openai format, reversed
    messages.forEach((message) => {
      atlasMessages.unshift({
        // reverse order
        name: message.author.username,
        role: message.author.username === 'Atlas' ? 'assistant' : 'user',
        createdAt: message.createdAt,
        content: `${message.content}`,
      })
    })
    // current message
    atlasMessages.push({
      name: message.author.username,
      role: message.author.username === 'Atlas' ? 'assistant' : 'user',
      createdAt: message.createdAt,
      content: `${message.content}`,
    })
    return atlasMessages
  }
}
