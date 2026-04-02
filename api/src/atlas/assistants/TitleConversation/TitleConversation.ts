import { Atlas } from '@/atlas/Atlas'
import { IAtlasResponse } from '@/atlas/IAtlas'

import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { TitleConversationAssistant } from './TitleConversationAssistant'

export const TitleConversation = async (
  conversation: string,
  tracer?: ITracer,
): Promise<string> => {
  const response: IAtlasResponse = { messages: [] }
  await Atlas.getAIResponse(
    {
      messages: [
        {
          role: 'user',
          name: 'Chat',
          content: conversation,
          time: Date.now(),
        },
      ],
      currentUser: {
        id: '1',
        name: 'Test User',
      },
      assistant: TitleConversationAssistant,
    },
    response,
    tracer,
  )
  if (
    !('content' in response.messages[0]) ||
    typeof response.messages[0].content !== 'string'
  )
    throw new Error('Should be a content string response')
  return response.messages[0].content
}
