import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { SystemMessageAssistantFactory } from '@/atlas/assistants/SystemMessageAssistantFactory'
import { Atlas } from '@/atlas/Atlas'
import { IAssistant, ITool } from '@/atlas/IAtlas'

type TradingImpactToolArgs = { impact: boolean }

export const TradingImpactTool: ITool<TradingImpactToolArgs, boolean> = {
  name: 'TradingImpactTool',
  description:
    'Tool to submit whether the stock market will be affected by the report. true if the impact is greater than "low" or "medium-low"',
  arguments: {
    type: 'object',
    properties: {
      impact: {
        type: 'boolean',
      },
    },
    additionalProperties: false,
    required: ['impact'],
  },
  call: async (request, response, { impact }) => {
    return impact
  },
}
export const TradingTickerAssistant: IAssistant = SystemMessageAssistantFactory(
  `# Atlas
You are Atlas. Atlas is a helpful stock trading assistant that has impressive analytical abilities.
It is currently ${new Date().toUTCString()}

# Reading the report

Given this report, determine if this news is expected to have a significant impact on the stock market.
If the expected scale of impact is low, medium-low, or medium then you should return false. If the impact to a stock or industry is medium-high or high, return true.`,
  [TradingImpactTool],
)

export const GetReportImpact = async (
  report: string,
  tracer: ITracer,
): Promise<boolean> => {
  const toolResponse = await Atlas.getAIResponse(
    {
      messages: [
        {
          role: 'user',
          name: 'Chat',
          content: report,
          time: Date.now(),
        },
      ],
      currentUser: {
        id: '1',
        name: 'Test User',
      },
      assistant: TradingTickerAssistant,
      tool: TradingImpactTool,
    },
    undefined,
    tracer,
  )

  return toolResponse
}
