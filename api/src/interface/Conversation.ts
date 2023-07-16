import type {
  ChatCompletionRequestMessageWithUuid,
  IMessage,
} from '@/interface/Message'
import type { IOrganization } from '@/interface/Organization'
import type { IUser } from '@/interface/User'

export type IConversation = {
  uuid: string
  title: string
  creator: IUser
  organization: IOrganization
  messages: IMessage[]
  created: Date
}
export type IAPIConversation = Omit<IConversation, 'messages'> & {
  messages: ChatCompletionRequestMessageWithUuid[]
}
