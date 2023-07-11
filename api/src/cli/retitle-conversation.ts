import AtlasAPI from '@/atlas'
import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { messageOrganizationQueue } from '@/queue/messageOrganization'
import { AtlasSocketMessage, Update } from '@/ws'
import { DataSource } from 'typeorm'

export default async function retitleConversation(
  dataSource: DataSource,
  uuid: string,
): Promise<string> {
  const conversation = await Conversation.get(dataSource, uuid, {
    organization: true,
  })
  if (!conversation) throw new Error('Conversation not found')
  const title = await AtlasAPI.askToRespond([
    {
      role: 'system',
      content:
        'Read the following exchange and respond only with a summarized title for the most recent topic(s) of conversation. Limit the title to 2 to 5 words. Do not respond with more than 5 words. The title should favor more recent messages, but encompass as much of the history of messages as possible.',
    },
    {
      role: 'user',
      content: conversation.messages
        // remove system messages
        .filter((message) => message.authorType !== 'system')
        // go to open AI format
        .map((message) => {
          return { ...message.toOpenAI(), message }
        })
        // create text strings for each message
        .map(({ role, content, name, message }) => {
          return `${name} (${role}) (${message.created}): ${content}`
        })
        // join all messages by new line
        .join('\n'),
    },
  ])
  await dataSource.getRepository(Conversation).save({
    uuid,
    title,
  })
  await Message.create(
    dataSource,
    conversation,
    null,
    'system',
    `Topic was changed to: ${title}`,
  )
  await messageOrganizationQueue.add({
    uuid: conversation.organization.uuid,
    message: {
      type: 'update',
      entity: 'conversation',
      uuid: conversation.uuid,
    } as AtlasSocketMessage<Update>,
  })
  return title
}
