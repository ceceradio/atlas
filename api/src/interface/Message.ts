import { IAtlasMessage } from '@/atlas/IAtlas'
import { IConversation } from './Conversation'
import { IUser } from './User'

export type IMessage = {
  uuid: string
  author: IUser | null
  authorType: IAtlasMessage['role']
  conversation: IConversation
  content: string
  created: Date
  toAtlasMessage(): IAtlasMessage
}
