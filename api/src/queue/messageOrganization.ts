import { AtlasSocketMessage } from '@/ws'
import Queue from 'bull'
import { redisConfig } from './redis'
export const messageOrganizationQueue = new Queue<MessageOrganizationJobData>(
  'messageOrganization',
  { redis: redisConfig },
)

export type MessageOrganizationJobData = {
  uuid: string
  message: AtlasSocketMessage<unknown>
  organizationId?: string
}
