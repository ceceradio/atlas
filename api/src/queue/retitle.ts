import retitleConversation from '@/cli/retitle-conversation'
import { getDataSource } from '@/data-source'
import { Conversation } from '@/entity/Conversation'
import { AtlasSocketMessage, Update } from '@/ws'
import Queue from 'bull'
import { messageOrganizationQueue } from './messageOrganization'
export const retitleQueue = new Queue<RetitleJobData>('retitle')

type RetitleJobData = {
  uuid: string
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
retitleQueue.process(async (job) => {
  const db = await getDataSource()
  const title = await retitleConversation(db, job.data.uuid)
  const conversation = await Conversation.get(db, job.data.uuid)
  if (!conversation) throw new Error()
  messageOrganizationQueue.add({
    uuid: conversation.organization.uuid,
    message: {
      type: 'update',
      entity: 'conversation',
      uuid: conversation.uuid,
    } as AtlasSocketMessage<Update>,
  })
  return title
})
