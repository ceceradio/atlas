import { Atlas } from '@/atlas/Atlas'
import { IAtlasResponse } from '@/atlas/IAtlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { SystemMessageAssistantFactory } from '@/atlas/assistants/SystemMessageAssistantFactory'

export async function getStringResponse(
  systemPrompt: string,
  input?: string,
  tracer?: ITracer,
): Promise<string> {
  const response: IAtlasResponse = { messages: [] }
  await Atlas.getAIResponse(
    {
      messages: [{ role: 'user', name: 'Input', content: input ?? 'Go ahead.', time: Date.now() }],
      currentUser: { id: 'system', name: 'System' },
      assistant: SystemMessageAssistantFactory(systemPrompt),
    },
    response,
    tracer,
  )
  const first = response.messages[0]
  if (!first || !('content' in first) || typeof first.content !== 'string')
    throw new Error('No string response from model')
  return first.content
}
