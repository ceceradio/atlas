import { AtlasAPI } from '@/atlas'
import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { DataSource } from 'typeorm'

export default async function respond(
  dataSource: DataSource,
  uuid: string,
): Promise<string> {
  const atlasApi = new AtlasAPI()
  const conversation = await Conversation.get(dataSource, uuid, {
    organization: true,
    messages: true,
  })
  if (!conversation) throw new Error('no conversation found')
  const { content } = await atlasApi.respondToConversation(conversation)
  if (!content) throw new Error('no content found')
  await Message.create(dataSource, conversation, null, 'assistant', content)

  return content
}
