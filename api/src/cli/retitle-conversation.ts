import { TitleConversation } from '@/atlas/assistants/TitleConversation/TitleConversation'
import { Conversation } from '@/entity/Conversation'
import { DataSource } from 'typeorm'

export default async function retitleConversation(
  dataSource: DataSource,
  uuid: string,
): Promise<string> {
  const conversation = await Conversation.get(dataSource, uuid, {
    organization: true,
    messages: true,
  })
  if (!conversation) throw new Error('no conversation found')
  const chatString = Conversation.toChatString(conversation.messages.map(m => m.toAtlasMessage()))
  const title = await TitleConversation(chatString)
  await dataSource.getRepository(Conversation).save({
    uuid: conversation.uuid,
    title,
  })
  return title
}
