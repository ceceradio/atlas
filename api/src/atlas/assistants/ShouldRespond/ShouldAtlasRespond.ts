import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { Atlas } from '@/atlas/Atlas'
import { IAtlasResponse } from '@/atlas/IAtlas'
import { ShouldRespondAssistant } from './ShouldRespondAssistant'
import { ShouldRespondTool } from './ShouldRespondTool'

export const ShouldAtlasRespond = async (
  chatString: string,
  tracer?: ITracer,
): Promise<boolean> => {
  const response: IAtlasResponse = { messages: [] }
  const toolResponse = await Atlas.getAIResponse(
    {
      messages: [
        {
          role: 'user',
          name: 'Chat',
          content: chatString,
          time: Date.now(),
        },
      ],
      currentUser: {
        id: '1',
        name: 'Test User',
      },
      assistant: ShouldRespondAssistant,
      tool: ShouldRespondTool,
    },
    response,
    tracer,
  )

  return toolResponse
}
