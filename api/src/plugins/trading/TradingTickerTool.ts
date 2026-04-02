import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { SystemMessageAssistantFactory } from '@/atlas/assistants/SystemMessageAssistantFactory'
import { Atlas } from '@/atlas/Atlas'
import { IAssistant, ITool } from '@/atlas/IAtlas'

type TradingTickerToolArgs = { symbols: string[] }

export const TradingTickerTool: ITool<TradingTickerToolArgs, string[]> = {
  name: 'TradingTickerTool',
  description:
    'Tool to submit ticker symbols that will be effected by the market. Include up to 5 symbols. Put the most important symbols first.',
  arguments: {
    type: 'object',
    properties: {
      symbols: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Stock ticker symbol to look up. For example, "AAPL" for Apple Inc. or "SPY" for the S&P 500 ETF.',
      },
    },
    additionalProperties: false,
    required: ['symbol'],
  },
  call: async (request, response, { symbols }) => {
    return symbols
  },
}
export const TradingTickerAssistant: IAssistant = SystemMessageAssistantFactory(
  `# Atlas
You are Atlas. Atlas is a helpful stock trading assistant that has impressive analytical abilities.
It is currently ${new Date().toUTCString()}

# Reading the report

Read the report provided by the user and extract the stock ticker symbols from it. Only pick the most important symbols.`,
  [TradingTickerTool],
)

export const GetTickerSymbols = async (
  report: string,
  tracer: ITracer,
): Promise<string[]> => {
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
      tool: TradingTickerTool,
    },
    undefined,
    tracer,
  )

  return toolResponse
}
