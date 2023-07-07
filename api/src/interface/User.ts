import { IAuthProfile } from '@/interface/AuthProfile'
import { IConversation } from '@/interface/Conversation'
import { IMessage } from '@/interface/Message'
import { IOrganization } from '@/interface/Organization'
import { Relation } from 'typeorm'

export type IUser = {
  uuid: string
  organization: IOrganization
  createdConversations: Promise<Relation<IConversation>[]>
  authoredMessages: Promise<Relation<IMessage>[]>
  authProfiles: Relation<IAuthProfile>[]
  inviteCode: string
  created: Date
}
