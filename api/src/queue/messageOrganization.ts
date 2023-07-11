import { AtlasSocketMessage } from '@/ws'
import Queue from 'bull'
export const messageOrganizationQueue = new Queue<MessageOrganizationJobData>(
  'messageOrganization',
)

export type MessageOrganizationJobData = {
  uuid: string
  message: AtlasSocketMessage<unknown>
}
