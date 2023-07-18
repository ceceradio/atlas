// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits, Message } from 'discord.js'
import { AtlasAPI, ChatCompletionRequestMessageWithTime } from '.'

const atlasApi = new AtlasAPI()

// Create a new client instance
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
})

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`)
})

client.on(Events.MessageCreate, async (message) => {
  if (isAtlas(message)) return
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
    if (await atlasApi.shouldAtlasRespondToMessages(atlasMessages))
      message.channel.sendTyping()

    // respond softly
    const atlasMessage = await atlasApi.softResponse(atlasMessages)
    if (!pushMessage(message, atlasMessage)) return false

    // if we should respond again, respond softly until we shouldnt
    while (await atlasApi.shouldAtlasRespondToMessages(atlasMessages)) {
      const atlasMessage = await atlasApi.softResponse(atlasMessages, true)
      if (!pushMessage(message, atlasMessage)) return true
    }
    return true
  }
  if (await tryYourHandAtResponding(7)) console.info('Responded at 7 deep')
  else if (await tryYourHandAtResponding(5)) console.info('Responded at 5 deep')
  else if (await tryYourHandAtResponding(3)) console.info('Responded at 3 deep')
  else if (await tryYourHandAtResponding(2)) console.info('Responded at 2 deep')
})

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
