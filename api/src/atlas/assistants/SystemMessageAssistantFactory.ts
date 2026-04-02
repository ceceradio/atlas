import { IAssistant, ITool } from '../IAtlas'

export const SystemMessageAssistantFactory = <A, R>(
  systemMessage: string,
  tools?: ITool<A, R>[],
): IAssistant => ({
  name: 'SystemMessageAssistant',
  onSystemMessage: async () => ({
    role: 'system',
    content: systemMessage,
    time: Date.now(),
  }),
  getTools: () => tools || [],
})
