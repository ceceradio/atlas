// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits, Message } from 'discord.js'
import { AtlasAPI, ChatCompletionRequestMessageWithTime } from '.'

const atlasApi = new AtlasAPI()

const CHANNEL_ID = '1071516705806893187'

// Create a new client instance
export const getClient = () => {
  return attach(
    new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    }),
  )
}

function attach(client: Client) {
  // When the client is ready, run this code (only once)
  // We use 'c' for the event parameter to keep it separate from the already defined 'client'
  client.once(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`)
  })

  client.on(Events.MessageCreate, async (message) => {
    if (isAtlas(message)) return
    if (message.channelId !== CHANNEL_ID) return
    const atlasMessages: ChatCompletionRequestMessageWithTime[] = []

    const tryYourHandAtResponding = async (limit: number) => {
      // get last few messages in channelId
      const messages = await message.channel.messages.fetch({
        limit,
        before: message.id,
      })
      // define reusable local function for message functionality
      const pushMessage = async (
        message: Message<boolean>,
        atlasMessage?: string,
      ) => {
        if (!message) return false
        if (!atlasMessage) return false
        await sendSplitMessage(message, atlasMessage)
        atlasMessages.push({
          name: 'Atlas',
          role: 'assistant',
          createdAt: new Date(),
          content: `${atlasMessage}`,
        })
        return true
      }

      // add messages to another array in openai format, reveresed
      messages.forEach((message) => {
        atlasMessages.unshift({
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

      // if there is high likelyhood of response, start typing
      const shouldRespondMessage = await atlasApi.getShouldRespondToMessages(
        atlasMessages,
        'discord',
      )
      const { function_call } = shouldRespondMessage
      if (!function_call) return false
      if (atlasApi.isYes(function_call) && function_call.arguments)
        message.channel.sendTyping()

      let atlasMessage
      if (atlasApi.lastShouldRespondMessage) {
        atlasMessage = atlasApi.lastShouldRespondMessage.content
        if (atlasApi.lastShouldRespondMessage.function_call) {
          const args = atlasApi.getArgs(
            atlasApi.lastShouldRespondMessage.function_call,
          )
          console.log(args.reason)
        }
      } else
        atlasMessage = (await atlasApi.respondToMessages(atlasMessages)).content
      if (!pushMessage(message, atlasMessage)) return true

      // if we should respond again, respond softly until we shouldnt
      while (await atlasApi.shouldRespondToMessages(atlasMessages, 'discord')) {
        let atlasMessage
        if (atlasApi.lastShouldRespondMessage) {
          atlasMessage = atlasApi.lastShouldRespondMessage.content
          if (atlasApi.lastShouldRespondMessage.function_call) {
            const args = atlasApi.getArgs(
              atlasApi.lastShouldRespondMessage.function_call,
            )
            console.log(args.reason)
          }
        } else atlasMessage = ''
        if (!atlasMessage) return
        if (!pushMessage(message, atlasMessage)) return true
      }
      return true
    }

    await tryYourHandAtResponding(7)
  })
  return client
}

function isAtlas(message: Message<boolean>) {
  return message.author.username === 'Atlas'
}

async function sendSplitMessage(message: Message<boolean>, chat: string) {
  const chatMessages = chat.split('\n\n')
  for (const i in chatMessages) {
    const snippet = chatMessages[i]
    if (snippet.length > 0) await message.channel.send(snippet)
  }
}
