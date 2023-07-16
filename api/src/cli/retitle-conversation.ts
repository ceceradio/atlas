import titleConversation from '@/atlas/abilities/titleConversation'
import { DataSource } from 'typeorm'

export default async function retitleConversation(
  dataSource: DataSource,
  uuid: string,
): Promise<string> {
  const conversation = await titleConversation(dataSource, uuid)
  if (!conversation) throw new Error('Conversation not found or something')
  return conversation.title
}
