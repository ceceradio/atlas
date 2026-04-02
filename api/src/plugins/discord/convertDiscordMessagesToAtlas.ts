import { IAtlasMessage } from '@/atlas/IAtlas'
import { Collection, Message } from 'discord.js'

// collate discord message objects into an array of atlas messages
export function convertDiscordMessagesToAtlas(
  message: Message<boolean>,
  messages: Collection<string, Message<boolean>>,
): IAtlasMessage[] {
  const atlasMessages: IAtlasMessage[] = []
  // add messages to another array in atlas format, reversed
  messages.forEach((message) => {
    atlasMessages.unshift({
      // reverse order
      name: message.author.username,
      role: message.author.username === 'Atlas' ? 'assistant' : 'user',
      time: message.createdAt.getTime(),
      content: `${message.content}`,
    })
  })
  // current message
  atlasMessages.push({
    name: message.author.username,
    role: message.author.username === 'Atlas' ? 'assistant' : 'user',
    time: message.createdAt.getTime(),
    content: `${message.content}`,
  })
  return atlasMessages
}
