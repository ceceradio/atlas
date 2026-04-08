import { IAtlasMessage } from '@/atlas/IAtlas'
import { Collection, Message } from 'discord.js'

// collate discord message objects into an array of atlas messages
export function convertDiscordMessagesToAtlas(
  message: Message<boolean>,
  messages: Collection<string, Message<boolean>>,
): IAtlasMessage[] {
  const atlasMessages: IAtlasMessage[] = []
  // add messages to another array in atlas format, reversed
  messages.forEach((msg) => {
    atlasMessages.unshift({
      name: msg.author.username,
      role: msg.author.username === 'Atlas' ? 'assistant' : 'user',
      time: msg.createdAt.getTime(),
      content: `${msg.content}`,
    })
  })
  return atlasMessages
}
