import { Atlas } from '@/atlas/Atlas'
import { IAtlasResponse } from '@/atlas/IAtlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { IsChoreMessageAssistant } from './IsChoreMessageAssistant'
import { IsChoreMessageTool } from './IsChoreMessageTool'

export const isChoreMessage = async (
  message: string,
  tracer?: ITracer,
): Promise<boolean> => {
  const response: IAtlasResponse = { messages: [] }
  return await Atlas.getAIResponse(
    {
      messages: [
        {
          role: 'user',
          name: 'Message',
          content: message,
          time: Date.now(),
        },
      ],
      currentUser: {
        id: 'system',
        name: 'System',
      },
      assistant: IsChoreMessageAssistant,
      tool: IsChoreMessageTool,
    },
    response,
    tracer,
  )
}
