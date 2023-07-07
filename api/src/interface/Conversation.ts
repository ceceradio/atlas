import type { IMessage } from '@/interface/Message'
import type { IOrganization } from '@/interface/Organization'
import type { IUser } from '@/interface/User'
import type { ChatCompletionRequestMessage } from 'openai'

export type IConversation = {
  uuid: string
  title: string
  creator: IUser
  organization: IOrganization
  messages: IMessage[]
  created: Date
}
export type IAPIConversation = Omit<IConversation, 'messages'> & {
  messages: ChatCompletionRequestMessage[]
}
