import axios from 'axios'
import { TradingTickerResponse } from './TradingTickerResponse'

export async function lookUpTicker(
  symbol: string,
): Promise<TradingTickerResponse | null> {
  const response = await axios({
    url: `http://api.marketstack.com/v2/tickers/${symbol}/intraday/latest?access_key=${process
      .env.MARKETSTACK_API_KEY!} `,
  })
  if (response.status !== 200) {
    console.error(
      `Error fetching ticker data for ${symbol}: ${response.statusText}`,
    )
    return null
  }
  const ticker = response.data as ApiResponse

  if (!ticker) {
    return null
  }

  const { open, high, low, marketstack_last: price, volume } = ticker

  const tickerResponse: TradingTickerResponse = {
    symbol,
    open,
    high,
    low,
    price,
    volume,
  }
  return tickerResponse
}

type ApiResponse = {
  date: string
  symbol: string
  exchange: string
  open: number
  high: number
  low: number
  close: number
  last: number
  volume: number
  mid?: number
  marketstack_last?: number
}
