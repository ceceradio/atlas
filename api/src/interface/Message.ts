import { IConversation } from '@/interface/Conversation'
import { IUser } from '@/interface/User'
import type {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
} from 'openai'

export type IMessage = {
  uuid: string
  author: IUser | null
  authorType: AuthorTypes
  conversation: IConversation
  content: string
  created: Date
  toOpenAI(): ChatCompletionRequestMessageWithUuid
}
export type AuthorTypes = ChatCompletionRequestMessageRoleEnum

export type ChatCompletionRequestMessageWithUuid =
  ChatCompletionRequestMessage & { uuid: string }
