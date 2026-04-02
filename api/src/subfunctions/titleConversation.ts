import { TitleConversation } from '../atlas/assistants/TitleConversation/TitleConversation'
import { Conversation } from '../entity/Conversation'

export async function titleConversation(
  conversation: Conversation,
): Promise<string> {
  if (!conversation.messages || conversation.messages.length <= 0)
    throw new Error('empty')
  if (!conversation) throw new Error('Conversation not found')
  const content = conversation.toChatString()
  return await TitleConversation(content)
}
