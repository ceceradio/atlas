import { IAuthProfile } from './AuthProfile'
import { IConversation } from './Conversation'
import { IMessage } from './Message'
import { IOrganization } from './Organization'
type Relation<T> = T

export type IUser = {
  uuid: string
  name: string
  organization: IOrganization
  createdConversations: Promise<Relation<IConversation>[]>
  authoredMessages: Promise<Relation<IMessage>[]>
  authProfiles: Relation<IAuthProfile>[]
  inviteCode: string
  created: Date
}

export type IAPIUser = {
  uuid: string
  name: string
  color?: string
  discordUsername?: string | null
  created: Date
}
