import { IAtlasMessage } from '@/atlas/IAtlas'
import type { IMessage } from './Message'
import type { IOrganization } from './Organization'
import type { IUser } from './User'

export type IConversation = {
  uuid: string
  title: string
  creator: IUser
  organization: IOrganization
  messages: IMessage[]
  created: Date
}
export type IAPIConversation = Omit<IConversation, 'messages'> & {
  messages: IAtlasMessage[]
  lastMessageAt?: Date | null
}
