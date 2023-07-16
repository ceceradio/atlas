import { AtlasAPI } from '@/atlas'
import { Conversation } from '@/entity/Conversation'
import { DataSource } from 'typeorm'

export default async function retitleConversation(
  dataSource: DataSource,
  uuid: string,
): Promise<string> {
  return dataSource.transaction(async (manager) => {
    const atlasApi = new AtlasAPI()
    const conversation = await Conversation.get(manager, uuid, {
      organization: true,
      messages: true,
    })
    if (!conversation) throw new Error('no conversation found')
    const title = await atlasApi.titleConversation(conversation)
    await manager.save({
      ...conversation,
      title,
    })
    return conversation.title
  })
}
