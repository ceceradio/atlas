import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { AtlasPlugins } from '@/plugins'
import { DataSource } from 'typeorm'

export default async function retitleConversation(
  dataSource: DataSource,
  uuid: string,
): Promise<string> {
  const atlasApi = new AtlasPlugins()
  const conversation = await Conversation.get(dataSource, uuid, {
    organization: true,
    messages: true,
  })
  if (!conversation) throw new Error('no conversation found')
  const title = await atlasApi.titleConversation(conversation)
  await Message.create(
    dataSource,
    conversation,
    null,
    'system',
    `Topic was changed to: ${title}`,
  )
  await dataSource.getRepository(Conversation).save({
    uuid: conversation.uuid,
    title,
  })
  return conversation.title
}
