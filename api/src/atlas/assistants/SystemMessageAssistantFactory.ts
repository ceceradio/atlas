import { IAssistant, ITool } from '../IAtlas'

export const SystemMessageAssistantFactory = <A, R>(
  systemMessage: string,
  tools?: ITool<A, R>[],
  temperature?: number,
): IAssistant => ({
  name: 'SystemMessageAssistant',
  temperature,
  onSystemMessage: async () => ({
    role: 'system',
    content: systemMessage,
    time: Date.now(),
  }),
  getTools: () => tools || [],
})
