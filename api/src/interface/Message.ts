import { IConversation } from '@/interface/Conversation'
import { IUser } from '@/interface/User'
import type { ChatCompletionRequestMessage } from 'openai'

export type IMessage = {
  uuid: string
  author: IUser | null
  authorType: AuthorTypes
  conversation: IConversation
  content: string
  created: Date
  toOpenAI(): ChatCompletionRequestMessageWithUuid
}
export type AuthorTypes = 'user' | 'assistant' | 'system'

export type ChatCompletionRequestMessageWithUuid =
  ChatCompletionRequestMessage & { uuid: string }
