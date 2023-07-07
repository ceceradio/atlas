import AtlasAPI from '@/atlas'
import { Conversation } from '@/entity/Conversation'
import { DataSource } from 'typeorm'

export default async function retitleConversation(
  dataSource: DataSource,
  uuid: string,
): Promise<string> {
  const conversation = await Conversation.get(dataSource, uuid)
  if (!conversation) throw new Error('Conversation not found')
  const title = await AtlasAPI.askToRespond([
    {
      role: 'system',
      content:
        'Evaluate the following messages and respond only with a summarized title for the conversation. Limit the summary to 2 to 4 words.',
    },
    ...conversation.messages.map((message) => message.toOpenAI()),
  ])
  await dataSource.getRepository(Conversation).save({
    uuid,
    title,
  })
  return title
}
