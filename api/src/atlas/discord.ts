// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits, Message } from 'discord.js'
import { ChatCompletionRequestMessage } from 'openai'
import { AtlasAPI } from '.'

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

function isAtlas(message: Message<boolean>) {
  return message.author.username === 'Atlas'
}

client.on(Events.MessageCreate, async (message) => {
  if (isAtlas(message)) return
  // get last few messages in channelId
  const messages = await message.channel.messages.fetch({
    limit: 10,
    before: message.id,
  })

  const atlasMessages: ChatCompletionRequestMessage[] = []
  messages.forEach((message) => {
    atlasMessages.unshift({
      name: message.author.username,
      role: message.author.username === 'Atlas' ? 'assistant' : 'user',
      content: `${message.content}`,
    })
  })
  atlasMessages.push({
    name: message.author.username,
    role: message.author.username === 'Atlas' ? 'assistant' : 'user',
    content: `${message.content}`,
  })
  /*
  // ask atlas if we should respond
  const shouldRespond = await atlasApi.shouldAtlasRespondToMessages(
    atlasMessages,
  )
  if (shouldRespond)
    message.channel.send(await atlasApi.respondToMessages(atlasMessages))
  */
  const atlasMessage = await atlasApi.softResponse(atlasMessages)
  if (!atlasMessage) return
  await sendSplitMessage(message, atlasMessage)
  atlasMessages.push({
    name: 'Atlas',
    role: 'assistant',
    content: atlasMessage,
  })
  let count = 3
  while (count > 0) {
    console.log('generating another message')
    const atlasMessage = await atlasApi.softResponse(atlasMessages, true)
    if (!atlasMessage) return
    await sendSplitMessage(message, atlasMessage)
    atlasMessages.push({
      name: 'Atlas',
      role: 'assistant',
      content: atlasMessage,
    })
    count -= 1
  }
})

async function sendSplitMessage(message: Message<boolean>, chat: string) {
  const chatMessages = chat.split('\n\n')
  for (const i in chatMessages) {
    const snippet = chatMessages[i]
    await message.channel.send(snippet)
  }
}
