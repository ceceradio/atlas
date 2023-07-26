import { IConversation } from '@/interface/Conversation'
import { IUser } from '@/interface/User'
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
} from 'openai'

export type IMessage = {
  uuid: string
  author: IUser | null
  authorType: ChatCompletionRequestMessageRoleEnum
  conversation: IConversation
  content: string
  created: Date
  toOpenAI(): ChatCompletionRequestMessageWithUuid
}

export type ChatCompletionRequestMessageWithUuid =
  ChatCompletionRequestMessage & { uuid: string }
export type WithTime<T extends ChatCompletionRequestMessage> = T & {
  createdAt: Date
}
