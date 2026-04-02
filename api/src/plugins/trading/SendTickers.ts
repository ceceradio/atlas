import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { AtlasDiscord } from '@/plugins/discord'
import { MessageFlags, User } from 'discord.js'
import { lookUpTicker } from './lookUpTicker'
import { TradingTickerResponse } from './TradingTickerResponse'
import { GetTickerSymbols } from './TradingTickerTool'

export async function SendTickers(
  report: string,
  tracer: ITracer,
  plugin?: AtlasDiscord | undefined,
  user?: User | undefined,
) {
  const symbols = await GetTickerSymbols(report, tracer)
  const tickers = (
    await Promise.all(
      symbols.slice(0, 5).map(async (symbol) => {
        try {
          return await lookUpTicker(symbol)
        } catch (e) {
          console.error(e)
          return null
        }
      }),
    )
  ).filter((ticker): ticker is TradingTickerResponse => !!ticker)

  const tickersMessage = tickers
    .map((ticker) => {
      const spread = ((ticker.high! - ticker.low!) / ticker.price!) * 100

      return `Ticker: [${ticker.symbol}](https://robinhood.com/stocks/${
        ticker.symbol
      }), Price: ${ticker.price}, Open: ${ticker.open}, High: ${
        ticker.high
      }, Low: ${ticker.low} Spread: ${spread.toFixed(2)}%\n\n`
    })
    .join('')
  if (tickersMessage) {
    if (user)
      await plugin?.sendSplitUserMessage(user, tickersMessage, {
        flags: MessageFlags.SuppressEmbeds,
      })
  }
  return tickers
}
