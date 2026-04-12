import { Atlas } from '@/atlas/Atlas'
import { IAtlasResponse } from '@/atlas/IAtlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { magi } from '@/lib/magi'
import { IsChoreMessageAssistant } from './IsChoreMessageAssistant'
import { IsChoreMessageTool } from './IsChoreMessageTool'

const TRIALS = 3
const REQUIRED_AGREEMENTS = 2

export const isChoreMessage = async (
  message: string,
  tracer?: ITracer,
): Promise<boolean> => {
  return magi(
    async () => {
      const response: IAtlasResponse = { messages: [] }
      return Atlas.getAIResponse(
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
    },
    REQUIRED_AGREEMENTS,
    TRIALS,
  )
}
