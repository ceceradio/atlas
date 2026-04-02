import { IAtlasMessage } from '@/atlas/IAtlas'
import { IConversation } from '@/interface/Conversation'
import { IUser } from '@/interface/User'

export type IMessage = {
  uuid: string
  author: IUser | null
  authorType: IAtlasMessage['role']
  conversation: IConversation
  content: string
  created: Date
  toAtlasMessage(): IAtlasMessage
}
