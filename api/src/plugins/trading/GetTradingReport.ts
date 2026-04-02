import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { Atlas } from '@/atlas/Atlas'
import { IAtlasAssistantRequest } from '@/atlas/IAtlas'
import { AtlasTradingAssistant } from './AtlasTradingAssistant'

export async function GetTradingReport(content: string, tracer: ITracer) {
  const reportRequest: IAtlasAssistantRequest = {
    assistant: AtlasTradingAssistant,
    currentUser: {
      name: 'cece',
      id: 'cece',
    },
    messages: [
      {
        name: 'cece',
        content,
        time: Date.now(),
        role: 'user',
      },
    ],
  }
  const response = await Atlas.processRequest(reportRequest, tracer)
  const report = response.messages
    .map((message) => ('content' in message ? message.content : undefined))
    .join('\n\n')
  return report
}
